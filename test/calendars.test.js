// -----------------------------------------------------------------------------
// What one user receives, without Gladys: the calendars in their language,
// the full-day events (end exclusive, the iCalendar convention), and the
// window of two years starting at the midnight of the time zone of Gladys.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import {
  buildCalendars,
  holidayEvents,
  horizon,
  schoolEvents,
  windowOf,
} from '../src/calendars.js';
import { normalizeConfig } from '../src/config.js';
import { zonedMidnight } from '../src/dates.js';
import { HolidayCalendar } from '../src/holidays.js';
import { languageOf } from '../src/i18n.js';
import { SchoolHolidays } from '../src/school.js';
import { createClock, createMemoryStore, fakeEducationApi } from './helpers/world.js';

const gladys = createFakeGladys();

test('the midnight that starts a date, in a time zone', () => {
  assert.equal(zonedMidnight('2026-01-01', 'Europe/Paris'), '2025-12-31T23:00:00.000Z');
  assert.equal(zonedMidnight('2026-07-14', 'Europe/Paris'), '2026-07-13T22:00:00.000Z');
  // The nights of the daylight saving time changes.
  assert.equal(zonedMidnight('2026-03-29', 'Europe/Paris'), '2026-03-28T23:00:00.000Z');
  assert.equal(zonedMidnight('2026-10-25', 'Europe/Paris'), '2026-10-24T22:00:00.000Z');
  assert.equal(zonedMidnight('2026-01-01', 'America/New_York'), '2026-01-01T05:00:00.000Z');
  assert.equal(zonedMidnight('2026-01-01', 'Asia/Tokyo'), '2025-12-31T15:00:00.000Z');
  assert.equal(zonedMidnight('2026-01-01', 'UTC'), '2026-01-01T00:00:00.000Z');
});

test('the events cover this year and the next one', () => {
  const range = horizon('2026-10-12');
  assert.deepEqual(range, { first: '2026-01-01', last: '2027-12-31' });
  assert.deepEqual(windowOf(range, 'Europe/Paris'), {
    from: '2025-12-31T23:00:00.000Z',
    to: '2027-12-31T23:00:00.000Z',
  });
});

test('the calendars are named in the language of the user', () => {
  const config = normalizeConfig({ country: 'DE', subdivision: 'BY' });
  const [holidays] = buildCalendars(gladys, 'tony', 'de', config);
  assert.deepEqual(holidays, {
    key: 'holidays',
    external_id: 'ext:test-integration:tony:holidays',
    name: 'Feiertage (Deutschland, Bayern)',
    description: holidays.description,
    color: '#d63939',
  });
  assert.match(holidays.description, /Teile diesen Kalender/);

  const france = normalizeConfig({ country: 'FR', school_zone: 'zone_c' });
  assert.deepEqual(
    buildCalendars(gladys, 'pepper', 'es', france).map(({ external_id, name }) => [
      external_id,
      name,
    ]),
    [
      ['ext:test-integration:pepper:holidays', 'Festivos (Francia)'],
      ['ext:test-integration:pepper:school', 'Vacaciones escolares (Zone C)'],
    ],
  );
  assert.equal(buildCalendars(gladys, 'tony', 'fr', normalizeConfig({})).length, 1);
});

test('a language Gladys users have but the integration does not falls back to English', () => {
  assert.equal(languageOf({ language: 'fr' }), 'fr');
  assert.equal(languageOf({ language: 'de-DE' }), 'de');
  assert.equal(languageOf({ language: 'it' }), 'en');
  assert.equal(languageOf({}), 'en');
});

test('a holiday is a full-day event ending the next day, described by its type', () => {
  const config = normalizeConfig({
    country: 'FR',
    holiday_types: ['public', 'observance'],
    extra_days: '2026-05-15=Pont, 2026-12-24',
  });
  const events = holidayEvents(gladys, 'tony', 'fr', new HolidayCalendar(config), {
    first: '2026-05-01',
    last: '2026-12-31',
  });
  assert.deepEqual(events[0], {
    external_id: 'ext:test-integration:tony:holiday:2026-05-01:0',
    name: 'Fête du travail',
    start: '2026-05-01',
    end: '2026-05-02',
    full_day: true,
    description: 'Jour férié',
  });
  const on = (date) => events.filter((event) => event.start === date);
  assert.deepEqual(
    on('2026-05-15').map(({ name, description }) => [name, description]),
    [['Pont', 'Jour de congé ajouté dans la configuration']],
  );
  assert.equal(on('2026-12-24')[0].name, 'Jour de congé');
  assert.equal(on('2026-05-31')[0].description, 'Célébration');
  // Two entries on one day are two events, with their own ids.
  const christmas = holidayEvents(
    gladys,
    'tony',
    'en',
    new HolidayCalendar(normalizeConfig({ country: 'FR', extra_days: '12-25=Family' })),
    { first: '2026-12-25', last: '2026-12-25' },
  );
  assert.deepEqual(
    christmas.map(({ external_id, name }) => [external_id, name]),
    [
      ['ext:test-integration:tony:holiday:2026-12-25:0', 'Christmas Day'],
      ['ext:test-integration:tony:holiday:2026-12-25:1', 'Family'],
    ],
  );
});

test('a school holiday period is one event, ending the day classes resume', async () => {
  const clock = createClock('2026-10-12T08:00:00Z');
  const school = new SchoolHolidays({
    store: createMemoryStore(),
    fetch: fakeEducationApi().fetch,
    now: clock.now,
  });
  school.setZone('zone_a');
  await school.refresh();
  const events = schoolEvents(gladys, 'tony', 'fr', school, 'Zone A', horizon('2026-10-12'));
  const toussaint = events.find((event) => event.name === 'Vacances de la Toussaint');
  assert.deepEqual(toussaint, {
    external_id: 'ext:test-integration:tony:school:2026-10-17:2026-11-01',
    name: 'Vacances de la Toussaint',
    start: '2026-10-17',
    end: '2026-11-02',
    full_day: true,
    description: 'Vacances scolaires, Zone A. Source : data.education.gouv.fr',
  });
  // The Christmas holidays started in 2025 belong to the window: they end in 2026.
  assert.equal(events[0].start, '2025-12-20');
  // Nothing after 2027.
  assert.ok(events.every((event) => event.start <= '2027-12-31'));
});
