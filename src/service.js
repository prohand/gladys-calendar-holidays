// -----------------------------------------------------------------------------
// The heart of the integration: the holidays of the configured country and the
// French school holidays when followed, pushed as calendars into Gladys for
// every user who enabled the integration ("My calendars").
//
// When something is sent:
// - at start, on every reconnection and on a configuration change, everything
//   (Gladys may have lost what was sent while it was away);
// - when a user enables the integration or toggles a calendar back on, that
//   user's calendars;
// - otherwise, a clock checks every 15 minutes what changed: the school
//   calendar read again (once a day), a new year (the window moves on 1
//   January). What did not change is not sent again: the core caps the
//   calendar writes at 30 a minute.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import {
  buildCalendars,
  CALENDARS,
  holidayEvents,
  horizon,
  schoolEvents,
  windowOf,
  zoneName,
} from './calendars.js';
import { localSlot, processTimeZone } from './dates.js';
import { createFailureLog } from './failures.js';
import { HolidayCalendar } from './holidays.js';
import { PROBLEM_TEXT, inEveryLanguage, languageOf } from './i18n.js';
import { SchoolHolidays } from './school.js';

const logger = createLogger({ name: 'calendar-holidays' });

export const TICK_MS = 15 * 60 * 1000;

export class CalendarService {
  /**
   * @param {object} options
   * @param {object} options.gladys the SDK client
   * @param {object} options.store JSON files in /data (src/store.js)
   * @param {Function} [options.fetch] for the school calendar (tests)
   * @param {Function} [options.now] the clock (tests)
   * @param {string} [options.timeZone] Gladys' time zone (default: TZ)
   * @param {boolean} [options.timers] false in the tests: they call tick()
   */
  constructor({ gladys, store, fetch, now = Date.now, timeZone, timers = true }) {
    this.gladys = gladys;
    this.now = now;
    this.timeZone = timeZone ?? processTimeZone();
    this.timers = timers;
    this.school = new SchoolHolidays({ store, fetch, now });
    this.config = null;
    this.calendar = null;
    // The users who enabled the integration: [{ user, config }].
    this.accounts = [];
    // user selector → what was last sent to them, to send only what changed.
    this.sent = new Map();
    this.syncError = null;
    this.timer = null;
    this.queue = Promise.resolve();
    this.failures = createFailureLog(logger);
  }

  // One operation at a time: a tick never interleaves with a reconfiguration.
  serial(fn) {
    const run = this.queue.then(fn);
    this.queue = run.catch(() => {});
    return run;
  }

  /** Today in Gladys' time zone. */
  today() {
    return localSlot(this.now(), this.timeZone).date;
  }

  start(config) {
    return this.serial(async () => {
      this.applyConfig(config);
      await this.school.refresh();
      await this.readAccounts();
      await this.syncAll({ force: true });
      await this.updateStatus();
      this.schedule();
    });
  }

  /** The configuration changed: every calendar is sent again. */
  reconfigure(config) {
    return this.serial(async () => {
      this.applyConfig(config);
      await this.school.refresh();
      await this.syncAll({ force: true });
      await this.updateStatus();
    });
  }

  /**
   * Gladys came back (restart): the users may have changed while it was away
   * (the account-updated messages are lost), and it may have lost what was sent.
   */
  resync(config) {
    return this.serial(async () => {
      this.applyConfig(config);
      await this.readAccounts();
      await this.syncAll({ force: true });
      await this.updateStatus();
    });
  }

  /**
   * A user enabled or disabled the integration, or toggled one of their
   * calendars: their calendars are sent again (a calendar switched back on is
   * empty), or forgotten (Gladys already deleted them).
   */
  accountUpdated(userSelector) {
    return this.serial(async () => {
      await this.readAccounts();
      this.sent.delete(userSelector);
      const account = this.accounts.find((candidate) => candidate.user.selector === userSelector);
      if (account) {
        await this.syncUser(account, { force: true });
        await this.updateStatus();
      }
    });
  }

  applyConfig(config) {
    this.config = config;
    this.calendar = new HolidayCalendar(config);
    this.school.setZone(config.school_zone);
  }

  stop() {
    clearTimeout(this.timer);
    this.timer = null;
    this.timers = false;
    return this.queue;
  }

  schedule() {
    if (!this.timers) {
      return;
    }
    clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      await this.tick().catch((err) => logger.error('Tick failed', err));
      this.schedule();
    }, TICK_MS);
    // The clock alone never keeps the process alive.
    this.timer.unref?.();
  }

  /** The clock: reads the school calendar when due, sends what changed. */
  tick() {
    return this.serial(async () => {
      const failing = this.syncError !== null;
      const read = await this.school.refresh();
      await this.syncAll();
      // The status changes with a new school calendar or a failure, starting or over.
      if (read || failing || this.syncError !== null) {
        await this.updateStatus();
      }
    });
  }

  async readAccounts() {
    try {
      const accounts = await this.gladys.getCalendarAccounts();
      this.accounts = Array.isArray(accounts) ? accounts.filter((a) => a?.user?.selector) : [];
      // A user who disabled the integration is sent everything if they come back.
      for (const user of this.sent.keys()) {
        if (!this.accounts.some((account) => account.user.selector === user)) {
          this.sent.delete(user);
        }
      }
      this.failures.succeeded('accounts', 'Calendar accounts read again');
    } catch (err) {
      this.failures.failed('accounts', `Could not read the calendar accounts: ${err.message}`);
    }
  }

  async syncAll({ force = false } = {}) {
    this.syncError = null;
    for (const account of this.accounts) {
      await this.syncUser(account, { force });
    }
  }

  /** What a user should have in Gladys: their calendars and the events of each. */
  plan(account) {
    const user = account.user.selector;
    const language = languageOf(account.user);
    const range = horizon(this.today());
    const window = windowOf(range, this.timeZone);
    const calendars = buildCalendars(this.gladys, user, language, this.config).map(
      ({ key, ...calendar }) => ({
        calendar,
        events:
          key === CALENDARS.SCHOOL
            ? schoolEvents(this.gladys, user, language, this.school, zoneName(this.config), range)
            : holidayEvents(this.gladys, user, language, this.calendar, range),
      }),
    );
    return { user, window, calendars };
  }

  /**
   * Sends a user's calendars and their events, when they changed since the
   * last success (or always, `force`). A failure is logged and the next tick
   * tries again.
   */
  async syncUser(account, { force = false } = {}) {
    const { user, window, calendars } = this.plan(account);
    const signature = JSON.stringify({ window, calendars });
    if (!force && this.sent.get(user) === signature) {
      return;
    }
    try {
      await this.gladys.publishCalendars(
        user,
        calendars.map(({ calendar }) => calendar),
      );
      const existing = await this.gladys.getCalendars(user);
      // A calendar no longer wanted (school holidays no longer followed).
      for (const calendar of existing) {
        if (!calendars.some((wanted) => wanted.calendar.external_id === calendar.external_id)) {
          await this.gladys.deleteCalendar(calendar.external_id);
        }
      }
      for (const { calendar, events } of calendars) {
        const state = existing.find((candidate) => candidate.external_id === calendar.external_id);
        if (state?.sync === false) {
          // The user switched it off: Gladys refuses its events (403).
          continue;
        }
        await this.gladys.publishCalendarEvents(calendar.external_id, events, window);
      }
      this.sent.set(user, signature);
      this.failures.succeeded(`sync:${user}`, `Calendars of ${user} sent again`);
      logger.debug(`Calendars of ${user} sent`);
    } catch (err) {
      this.sent.delete(user);
      this.syncError = err.message;
      this.failures.failed(
        `sync:${user}`,
        `Could not send the calendars of ${user}: ${err.message}`,
      );
    }
  }

  /** The problems shown in the status and in "Check the configuration". */
  problems() {
    const problems = [...this.config.problems];
    if (!this.calendar.subdivisionValid) {
      problems.push({ key: 'invalidSubdivision', value: this.config.subdivision });
    }
    if (this.school.enabled && !this.school.data && this.school.lastError) {
      problems.push({ key: 'schoolUnavailable', value: this.school.lastError });
    }
    if (this.syncError) {
      problems.push({ key: 'syncFailed', value: this.syncError });
    }
    return problems;
  }

  async updateStatus() {
    const problems = this.problems();
    const message =
      problems.length === 0
        ? undefined
        : inEveryLanguage(PROBLEM_TEXT, (text) =>
            problems.map(({ key, value }) => text[key](value)).join(' '),
          );
    try {
      await this.gladys.setConnectionStatus(problems.length === 0, message);
      this.failures.succeeded('status', 'Status reported again');
    } catch (err) {
      this.failures.failed('status', `Could not report the status: ${err.message}`);
    }
  }
}
