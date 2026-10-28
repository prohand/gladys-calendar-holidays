// -----------------------------------------------------------------------------
// Registers every SDK handler on a GladysIntegration (or the SDK's fake Gladys
// in the tests) and returns the service, so index.js stays a few lines and the
// tests drive the very same wiring.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { SCHOOL_ZONES, normalizeConfig } from './config.js';
import { daysBetween, formatDate } from './dates.js';
import { COUNTRY_CODES, subdivisionsOf } from './holidays.js';
import { CHECK_TEXT, INIT_FAILED, PROBLEM_TEXT, TYPE_TEXT, countryName } from './i18n.js';
import { CalendarService } from './service.js';
import { createStore } from './store.js';

const logger = createLogger({ name: 'calendar-holidays-app' });

export const CHECK_ACTION = 'check_configuration';

/** The configuration Gladys sent, made complete and valid. */
export function readConfig(raw) {
  return normalizeConfig(raw, COUNTRY_CODES);
}

/**
 * @param {object} gladys GladysIntegration instance
 * @param {object} [options] test seams: store, fetch, now, timeZone, timers
 */
export function registerHandlers(gladys, options = {}) {
  const service = new CalendarService({
    gladys,
    store: options.store ?? createStore(),
    fetch: options.fetch,
    now: options.now,
    timeZone: options.timeZone,
    timers: options.timers ?? true,
  });

  // Resolved once the service has started; every handler waits for it.
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  let started = false;
  const whenReady =
    (fn) =>
    async (...args) => {
      await ready;
      return fn(...args);
    };

  gladys.on('connected', async () => {
    try {
      const config = readConfig(await gladys.getConfig());
      if (started) {
        await service.resync(config);
        return;
      }
      started = true;
      await service.start(config);
    } catch (err) {
      logger.error('Initialization failed', err);
      await gladys.setConnectionStatus(false, INIT_FAILED).catch(() => {});
    } finally {
      resolveReady();
    }
  });

  gladys.onConfigUpdated(whenReady((config) => service.reconfigure(readConfig(config))));

  gladys.onCalendarAccountUpdated(
    whenReady((userSelector) => service.accountUpdated(userSelector)),
  );

  gladys.onAction(
    CHECK_ACTION,
    whenReady(async () => {
      await service.school.refresh({ force: true });
      await service.updateStatus();
      return checkMessage(service);
    }),
  );

  return { service, ready, stop: () => service.stop() };
}

/** The report of "Check the configuration", one text per language. */
export function checkMessage(service) {
  return Object.fromEntries(
    Object.keys(CHECK_TEXT).map((language) => [language, checkReport(service, language)]),
  );
}

function checkReport(service, language) {
  const text = CHECK_TEXT[language];
  const { config, calendar, school } = service;
  const country = countryName(config.country, language);
  const subdivisions = subdivisionsOf(config.country);
  const lines = [];

  const subdivision =
    calendar.subdivisionValid && calendar.state
      ? `${config.subdivision} (${subdivisions[calendar.state]})`
      : '';
  lines.push(text.country(country, subdivision));
  lines.push(
    text.types(
      config.holiday_types.map((type) => TYPE_TEXT[language][type].toLowerCase()).join(', '),
    ),
  );

  const today = service.today();
  const next = calendar.next(today, language);
  lines.push(
    next
      ? text.next(
          [...new Set(next.holidays.map((holiday) => holiday.name))].join(' / '),
          formatDate(next.date, language, 'long'),
          daysBetween(today, next.date),
        )
      : text.noHoliday,
  );

  const zone = SCHOOL_ZONES[config.school_zone];
  if (!school.enabled) {
    lines.push(text.schoolOff);
  } else if (school.data) {
    lines.push(text.school(zone, formatDate(school.data.covered_until, language, 'long')));
  } else {
    lines.push(text.schoolWaiting(zone));
  }

  const names = service.accounts.map(({ user }) => user.first_name || user.selector);
  lines.push(names.length > 0 ? text.users(names.join(', ')) : text.noUser);
  lines.push(text.share);

  const problems = service.problems();
  if (problems.length > 0) {
    lines.push('', text.problems);
    for (const { key, value } of problems) {
      lines.push(`- ${PROBLEM_TEXT[language][key](value)}`);
    }
  } else {
    lines.push('', text.ok);
  }

  // The codes, when the subdivision is wrong or still empty and the country has some.
  if (!calendar.subdivisionValid || !config.subdivision) {
    const codes = Object.entries(subdivisions);
    lines.push(
      '',
      codes.length > 0
        ? text.codes(country, codes.map(([code, name]) => `${code} ${name}`).join(', '))
        : text.noCodes(country),
    );
  }
  return lines.join('\n');
}
