// -----------------------------------------------------------------------------
// A running integration against the SDK's fake Gladys, with a clock the test
// moves, the school calendar served from recorded answers of the ministry's
// API (test/fixtures/education) and /data kept in memory. No network.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { registerHandlers } from '../../src/app.js';

const ZONE_FILES = {
  'Zone A': 'zone-a',
  'Zone B': 'zone-b',
  'Zone C': 'zone-c',
  Corse: 'corse',
  Réunion: 'reunion',
  Guadeloupe: 'guadeloupe',
};

/** The recorded answer of the API for a zone (recorded on 2026-10-12). */
export function educationFixture(zone) {
  return JSON.parse(
    readFileSync(
      new URL(`../fixtures/education/${ZONE_FILES[zone]}.json`, import.meta.url),
      'utf8',
    ),
  );
}

/** A fetch serving the recorded answers, counting the calls. */
export function fakeEducationApi({ fail = false } = {}) {
  const api = {
    calls: [],
    fail,
    fetch: async (url) => {
      api.calls.push(url);
      if (api.fail) {
        throw new Error('getaddrinfo ENOTFOUND data.education.gouv.fr');
      }
      const zone = /zones="([^"]+)"/.exec(new URL(url).searchParams.get('where'))[1];
      return { ok: true, status: 200, json: async () => educationFixture(zone) };
    },
  };
  return api;
}

export function createMemoryStore(files = {}) {
  const content = new Map(Object.entries(files));
  return {
    files: content,
    load: (name) => (content.has(name) ? structuredClone(content.get(name)) : null),
    save: (name, value) => content.set(name, structuredClone(value)),
  };
}

/** A clock the test sets and moves. */
export function createClock(iso) {
  const clock = {
    ms: Date.parse(iso),
    now: () => clock.ms,
    set: (value) => {
      clock.ms = Date.parse(value);
    },
    advance: (ms) => {
      clock.ms += ms;
    },
  };
  return clock;
}

/** A Gladys user who enabled the integration in "My calendars". */
export function account(selector, language = 'fr', firstName = selector) {
  return { user: { selector, first_name: firstName, language }, config: {} };
}

/**
 * @param {object} [options]
 * @param {object} [options.config] the configuration saved in Gladys
 * @param {object[]} [options.accounts] the users who enabled the integration
 * @param {string} [options.at] the instant of the start (ISO)
 * @param {string} [options.timeZone] Gladys' time zone
 * @param {object} [options.api] fakeEducationApi()
 * @param {object} [options.store] createMemoryStore()
 * @param {boolean} [options.connect] false: handlers registered, not started
 * @param {boolean} [options.timers] true: the real clock of the service runs,
 *   on Date.now and setTimeout (to mock with t.mock.timers)
 */
export async function createWorld({
  config = {},
  accounts = [account('tony')],
  at = '2026-10-12T10:00:00Z',
  timeZone = 'Europe/Paris',
  api = fakeEducationApi(),
  store = createMemoryStore(),
  connect = true,
  timers = false,
} = {}) {
  const clock = createClock(at);
  const gladys = createFakeGladys({ config, calendarAccounts: accounts });
  const app = registerHandlers(gladys, {
    store,
    fetch: api.fetch,
    now: timers ? () => Date.now() : clock.now,
    timeZone,
    timers,
  });
  if (connect) {
    await gladys.connect();
  }
  const { service } = app;
  return {
    gladys,
    app,
    service,
    clock,
    api,
    store,
    /** The calendars Gladys holds for a user. */
    calendars(user = 'tony') {
      return gladys.fake.calendars.filter((calendar) => calendar.user === user);
    },
    /** The events Gladys holds in one of a user's calendars ('holidays' or 'school'). */
    events(key, user = 'tony') {
      const id = gladys.externalId(`${user}:${key}`);
      return gladys.fake.calendarEvents.filter((event) => event.calendar_external_id === id);
    },
    /** The event of a calendar starting on a date. */
    eventOn(key, date, user = 'tony') {
      return this.events(key, user).filter((event) => event.start.slice(0, 10) === date);
    },
    /** The calendar writes Gladys received (each one counts in its 30/minute). */
    writes() {
      return gladys.fake.requests.filter(
        (request) => request.path.startsWith('/calendar') && request.method !== 'GET',
      );
    },
  };
}
