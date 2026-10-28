// -----------------------------------------------------------------------------
// French school holidays, from answers of data.education.gouv.fr recorded on
// 2026-10-12 (test/fixtures/education). Checks the conventions of the
// dataset (resumption date as end, one-day periods, teachers' rows, open
// summers) against the official calendars, and the reading rules: once a
// day at most, kept in /data, offline afterwards.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRecords, requestUrl, SchoolHolidays, RETRY_MS } from '../src/school.js';
import {
  createClock,
  createMemoryStore,
  educationFixture,
  fakeEducationApi,
} from './helpers/world.js';

const periods = (zone) => parseRecords(educationFixture(zone).results, zone);

function periodOf(zone, date) {
  return (
    periods(zone).periods.find((period) => period.first <= date && date <= period.last) ?? null
  );
}

test('the end date of a period is the day classes resume', () => {
  // Toussaint 2025: from Saturday 18 October, classes resume Monday 3 November.
  assert.deepEqual(periodOf('Zone B', '2025-10-18'), {
    name: 'Vacances de la Toussaint',
    first: '2025-10-18',
    last: '2025-11-02',
  });
  assert.equal(periodOf('Zone B', '2025-11-03'), null);
  // Christmas 2026: 19 December to Sunday 3 January, back on Monday 4 January.
  const christmas = periodOf('Zone A', '2026-12-25');
  assert.equal(christmas.first, '2026-12-19');
  assert.equal(christmas.last, '2027-01-03');
});

test('winter and spring holidays differ by zone', () => {
  assert.equal(periodOf('Zone A', '2026-02-07').name, "Vacances d'Hiver");
  assert.equal(periodOf('Zone B', '2026-02-07'), null);
  assert.equal(periodOf('Zone B', '2026-02-14').name, "Vacances d'Hiver");
  assert.equal(periodOf('Zone C', '2026-02-21').name, "Vacances d'Hiver");
  assert.equal(periodOf('Zone C', '2026-03-08').last, '2026-03-08');
  assert.equal(periodOf('Zone C', '2026-03-09'), null);
});

test('a one-day period has the same start and end: that day is off', () => {
  // Pont de l'Ascension 2027: Friday 7 May only (the Thursday is a public holiday).
  assert.deepEqual(periodOf('Zone A', '2027-05-07'), {
    name: "Pont de l'Ascension",
    first: '2027-05-07',
    last: '2027-05-07',
  });
  assert.equal(periodOf('Zone A', '2027-05-08'), null);
  // In 2026 the bridge runs Thursday 14 to Sunday 17 May.
  assert.equal(periodOf('Zone A', '2026-05-14').last, '2026-05-17');
});

test("the pupils' summer holidays, not the teachers'", () => {
  // Summer 2026: pupils are back on Tuesday 1 September, teachers on Monday 31 August.
  const summer = periodOf('Zone A', '2026-08-31');
  assert.equal(summer.name, "Vacances d'Été");
  assert.equal(summer.last, '2026-08-31');
  assert.equal(periodOf('Zone A', '2026-09-01'), null);
  // Corsica resumes later: the rows of the zone are kept apart.
  assert.equal(periodOf('Corse', '2026-09-01').last, '2026-09-02');
});

test('rows for a part of a zone are left out (Saint-Martin, Saint-Barthélemy)', () => {
  const { periods: guadeloupe } = periods('Guadeloupe');
  assert.ok(guadeloupe.every((period) => !/esclavage|Mi-carême|Semaine en mai/.test(period.name)));
  assert.equal(periodOf('Guadeloupe', '2026-02-10').name, 'Vacances de Carnaval');
});

test('an open summer marks the end of what the data says', () => {
  // The last row of zone A is "Début des Vacances d'Été" on 4 July 2028.
  const { coveredUntil } = periods('Zone A');
  assert.equal(coveredUntil, '2028-07-03');
  assert.ok(periods('Zone A').periods.every((period) => !period.name.startsWith('Début')));
  // La Réunion: the austral winter of 2027 is open too.
  assert.equal(periods('Réunion').coveredUntil, '2027-07-02');
});

test('the request groups the académies of one zone, from a date on', () => {
  const url = new URL(requestUrl('Zone B', '2026-10-05'));
  assert.equal(url.hostname, 'data.education.gouv.fr');
  assert.equal(url.searchParams.get('where'), 'zones="Zone B" and end_date >= "2026-10-05"');
  assert.equal(url.searchParams.get('group_by'), url.searchParams.get('select'));
});

function school({
  api = fakeEducationApi(),
  store = createMemoryStore(),
  at = '2026-10-12T08:00:00Z',
} = {}) {
  const clock = createClock(at);
  const holidays = new SchoolHolidays({ store, fetch: api.fetch, now: clock.now });
  return { holidays, api, store, clock };
}

test('read at most once a day, kept in /data', async () => {
  const { holidays, api, store, clock } = school();
  holidays.setZone('zone_b');
  assert.equal(holidays.periodOn('2026-10-20'), undefined, 'unknown before the first read');
  assert.equal(await holidays.refresh(), true);
  assert.equal(api.calls.length, 1);
  assert.equal(holidays.periodOn('2026-10-20').name, 'Vacances de la Toussaint');
  assert.equal(holidays.periodOn('2026-10-12'), null);
  assert.equal(store.load('school-holidays.json').zone, 'Zone B');

  clock.advance(23 * 3600_000);
  assert.equal(holidays.isDue(), false);
  assert.equal(await holidays.refresh(), false);
  assert.equal(api.calls.length, 1);
  clock.advance(3600_000);
  assert.equal(holidays.isDue(), true);
  await holidays.refresh();
  assert.equal(api.calls.length, 2);
});

test('offline: the cached calendar keeps working, a failed read waits six hours', async () => {
  const first = school();
  first.holidays.setZone('zone_c');
  await first.holidays.refresh();

  // A restart a week later, without network.
  const api = fakeEducationApi({ fail: true });
  const later = school({ api, store: first.store, at: '2026-10-19T08:00:00Z' });
  later.holidays.setZone('zone_c');
  assert.equal(later.holidays.periodOn('2026-10-20').name, 'Vacances de la Toussaint');
  assert.equal(await later.holidays.refresh(), false);
  assert.equal(api.calls.length, 1);
  assert.match(later.holidays.lastError, /ENOTFOUND/);
  assert.equal(later.holidays.periodOn('2026-10-20').name, 'Vacances de la Toussaint');

  later.clock.advance(RETRY_MS - 60_000);
  await later.holidays.refresh();
  assert.equal(api.calls.length, 1, 'no new try before six hours');
  later.clock.advance(60_000);
  api.fail = false;
  assert.equal(await later.holidays.refresh(), true);
  assert.equal(api.calls.length, 2);
});

test('changing zone reads the new zone at once; "none" disables', async () => {
  const { holidays, api } = school();
  holidays.setZone('zone_a');
  await holidays.refresh();
  holidays.setZone('corse');
  assert.equal(holidays.periodOn('2026-10-20'), undefined, 'the cache of zone A is not reused');
  await holidays.refresh();
  assert.equal(api.calls.length, 2);
  assert.match(decodeURIComponent(api.calls[1]), /zones="Corse"/);
  holidays.setZone('none');
  assert.equal(holidays.enabled, false);
  assert.equal(holidays.periodOn('2026-10-20'), undefined);
  assert.equal(await holidays.refresh(), false);
});

test('a wrong answer keeps the cache', async () => {
  const store = createMemoryStore();
  const { holidays } = school({ store });
  holidays.setZone('zone_b');
  await holidays.refresh();
  const broken = school({
    store,
    at: '2026-10-14T08:00:00Z',
    api: {
      calls: [],
      fetch: async () => ({ ok: true, status: 200, json: async () => ({ results: [] }) }),
    },
  });
  broken.holidays.setZone('zone_b');
  assert.equal(await broken.holidays.refresh(), false);
  assert.equal(broken.holidays.periodOn('2026-10-20').name, 'Vacances de la Toussaint');
  const failing = school({
    store,
    at: '2026-10-14T08:00:00Z',
    api: { calls: [], fetch: async () => ({ ok: false, status: 503 }) },
  });
  failing.holidays.setZone('zone_b');
  assert.equal(await failing.holidays.refresh(), false);
  assert.equal(failing.holidays.lastError, 'HTTP 503');
});

test('the request starts on 1 January: the calendar of Gladys shows the whole year', async () => {
  const { holidays, api } = school({ at: '2026-10-12T08:00:00Z' });
  holidays.setZone('zone_c');
  await holidays.refresh();
  const where = new URL(api.calls[0]).searchParams.get('where');
  assert.equal(where, 'zones="Zone C" and end_date >= "2026-01-01"');
  // The periods with a day in a range, the Christmas holidays straddling 1 January included.
  assert.deepEqual(
    holidays.periodsBetween('2026-01-01', '2026-03-31').map((period) => period.name),
    ['Vacances de Noël', "Vacances d'Hiver"],
  );
});
