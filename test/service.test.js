// -----------------------------------------------------------------------------
// The integration against the SDK's fake Gladys, which behaves like the core
// for calendars: one account per user who enabled the integration, calendars
// upserted by id, events pruned by window, 403 on a calendar switched off.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GladysApiError } from '@gladysassistant/integration-sdk';
import { TICK_MS } from '../src/service.js';
import { account, createWorld, fakeEducationApi } from './helpers/world.js';

test('a user who enabled the integration gets the holidays in a private calendar', async (t) => {
  const world = await createWorld({ config: { country: 'FR' } });
  t.after(() => world.app.stop());

  const calendars = world.calendars();
  assert.deepEqual(
    calendars.map(({ external_id, name, shared, sync }) => ({ external_id, name, shared, sync })),
    [
      {
        external_id: 'ext:test-integration:tony:holidays',
        name: 'Jours fériés (France)',
        shared: false,
        sync: true,
      },
    ],
  );
  const events = world.events('holidays');
  // The eleven public holidays of 2026 and of 2027.
  assert.equal(events.length, 22);
  assert.deepEqual(world.eventOn('holidays', '2026-07-14'), [
    {
      calendar_external_id: 'ext:test-integration:tony:holidays',
      external_id: 'ext:test-integration:tony:holiday:2026-07-14:0',
      name: 'Fête Nationale de la France',
      start: '2026-07-14',
      end: '2026-07-15',
      full_day: true,
      description: 'Jour férié',
    },
  ]);
  assert.equal(world.eventOn('holidays', '2027-05-17')[0].name, 'Lundi de Pentecôte');
  assert.deepEqual(world.gladys.fake.connectionStatus, { connected: true });
  // One calendar list and one batch of events: two writes of the 30 a minute.
  assert.equal(world.writes().length, 2);
});

test('the school holidays of the zone come in a second calendar', async (t) => {
  const world = await createWorld({ config: { country: 'FR', school_zone: 'zone_c' } });
  t.after(() => world.app.stop());

  assert.deepEqual(
    world.calendars().map((calendar) => calendar.name),
    ['Jours fériés (France)', 'Vacances scolaires (Zone C)'],
  );
  const toussaint = world.eventOn('school', '2026-10-17')[0];
  assert.equal(toussaint.name, 'Vacances de la Toussaint');
  assert.equal(toussaint.end, '2026-11-02');
  assert.equal(world.eventOn('school', '2025-12-20')[0].name, 'Vacances de Noël');
});

test('each user gets their own calendars, in their language', async (t) => {
  const world = await createWorld({
    config: { country: 'DE', subdivision: 'BY' },
    accounts: [account('tony', 'de'), account('pepper', 'es'), account('happy', 'it')],
  });
  t.after(() => world.app.stop());

  assert.equal(world.calendars('tony')[0].name, 'Feiertage (Deutschland, Bayern)');
  assert.equal(world.calendars('pepper')[0].name, 'Festivos (Alemania, Bayern)');
  assert.equal(world.calendars('happy')[0].name, 'Public holidays (Germany, Bayern)');
  assert.equal(world.eventOn('holidays', '2026-12-25', 'tony')[0].name, '1. Weihnachtstag');
  assert.equal(world.eventOn('holidays', '2026-12-25', 'happy')[0].name, 'Christmas Day');
  assert.notEqual(
    world.eventOn('holidays', '2026-12-25', 'tony')[0].external_id,
    world.eventOn('holidays', '2026-12-25', 'happy')[0].external_id,
  );
});

test('enabling and disabling the integration in "My calendars"', async (t) => {
  const world = await createWorld({ config: { country: 'FR' }, accounts: [] });
  t.after(() => world.app.stop());
  assert.equal(world.writes().length, 0, 'nobody enabled it: nothing is sent');

  // Pepper enables it.
  world.gladys.fake.calendarAccounts = [account('pepper', 'en')];
  await world.gladys.fake.calendarAccountUpdated('pepper');
  assert.equal(world.calendars('pepper')[0].name, 'Public holidays (France)');
  assert.equal(world.events('holidays', 'pepper').length, 22);

  // Pepper disables it: Gladys deleted the calendars, nothing is sent again.
  world.gladys.fake.calendarAccounts = [];
  world.gladys.fake.calendars = [];
  world.gladys.fake.calendarEvents = [];
  const before = world.writes().length;
  await world.gladys.fake.calendarAccountUpdated('pepper');
  world.clock.advance(TICK_MS);
  await world.service.tick();
  assert.equal(world.writes().length, before);

  // And enables it again: everything comes back.
  world.gladys.fake.calendarAccounts = [account('pepper', 'en')];
  await world.gladys.fake.calendarAccountUpdated('pepper');
  assert.equal(world.events('holidays', 'pepper').length, 22);
});

test('a calendar switched off is skipped, and filled again when switched back on', async (t) => {
  const world = await createWorld({ config: { country: 'FR', school_zone: 'zone_a' } });
  t.after(() => world.app.stop());

  // The user switches the holidays off: Gladys empties the calendar.
  const holidays = world.calendars().find((calendar) => calendar.external_id.endsWith(':holidays'));
  holidays.sync = false;
  world.gladys.fake.calendarEvents = world.gladys.fake.calendarEvents.filter(
    (event) => event.calendar_external_id !== holidays.external_id,
  );
  await world.gladys.fake.calendarAccountUpdated('tony');
  assert.equal(world.events('holidays').length, 0);
  assert.ok(world.events('school').length > 0, 'the school calendar is still sent');
  assert.ok(
    world.gladys.fake.requests.every((request) => request.status !== 403),
    'no push to a calendar switched off',
  );
  assert.deepEqual(world.gladys.fake.connectionStatus, { connected: true });

  holidays.sync = true;
  await world.gladys.fake.calendarAccountUpdated('tony');
  assert.equal(world.events('holidays').length, 22);
});

test('nothing changed: nothing is sent again', async (t) => {
  const world = await createWorld({ config: { country: 'FR', school_zone: 'zone_b' } });
  t.after(() => world.app.stop());
  const before = world.writes().length;
  for (let tick = 0; tick < 8; tick += 1) {
    world.clock.advance(TICK_MS);
    await world.service.tick();
  }
  assert.equal(world.writes().length, before);

  // A day later the school calendar is read again; the same answer sends nothing.
  world.clock.advance(24 * 3600_000);
  await world.service.tick();
  assert.equal(world.api.calls.length, 2);
  assert.equal(world.writes().length, before);
});

test('a new school calendar is sent at the next tick', async (t) => {
  const api = fakeEducationApi();
  const world = await createWorld({ config: { country: 'FR', school_zone: 'zone_b' }, api });
  t.after(() => world.app.stop());
  assert.equal(world.eventOn('school', '2026-10-17')[0].name, 'Vacances de la Toussaint');
  const recorded = api.fetch;
  // The ministry starts the Toussaint holidays of 2026 a day earlier.
  world.service.school.fetch = async (url) => {
    const body = await (await recorded(url)).json();
    for (const row of body.results) {
      if (row.description === 'Vacances de la Toussaint' && row.start_date.startsWith('2026')) {
        row.start_date = '2026-10-15T22:00:00+00:00';
      }
    }
    return { ok: true, status: 200, json: async () => body };
  };
  world.clock.advance(24 * 3600_000);
  await world.service.tick();
  assert.equal(world.eventOn('school', '2026-10-16')[0].name, 'Vacances de la Toussaint');
  assert.equal(world.eventOn('school', '2026-10-17').length, 0, 'the old period is gone');
});

test('a configuration change replaces the events: holidays removed, days off added', async (t) => {
  const world = await createWorld({ config: { country: 'FR', school_zone: 'zone_c' } });
  t.after(() => world.app.stop());
  assert.equal(world.eventOn('holidays', '2026-05-25').length, 1);

  await world.gladys.fake.configUpdated({
    country: 'FR',
    ignored_holidays: 'Lundi de Pentecôte',
    extra_days: '2026-05-15=Pont',
    school_zone: 'none',
  });
  assert.equal(world.eventOn('holidays', '2026-05-25').length, 0, 'Whit Monday 2026 is gone');
  assert.equal(world.eventOn('holidays', '2027-05-17').length, 0, 'and in 2027');
  assert.equal(world.eventOn('holidays', '2026-05-15')[0].name, 'Pont');
  // The school holidays are no longer followed: their calendar is deleted.
  assert.deepEqual(
    world.calendars().map((calendar) => calendar.name),
    ['Jours fériés (France)'],
  );
  assert.equal(world.events('school').length, 0);
  assert.deepEqual(world.gladys.fake.deletedCalendars, ['ext:test-integration:tony:school']);
});

test('on 1 January the window moves: the year after next comes, the past stays', async (t) => {
  const world = await createWorld({
    config: { country: 'FR' },
    at: '2026-12-31T20:00:00Z',
  });
  t.after(() => world.app.stop());
  assert.equal(world.eventOn('holidays', '2028-01-01').length, 0);
  const before = world.writes().length;

  // 31 December, 23:30 in Paris: still 2026.
  world.clock.set('2026-12-31T22:30:00Z');
  await world.service.tick();
  assert.equal(world.writes().length, before);

  // 00:15 on 1 January in Paris.
  world.clock.set('2026-12-31T23:15:00Z');
  await world.service.tick();
  assert.equal(world.eventOn('holidays', '2028-01-01')[0].name, 'Nouvel An');
  assert.equal(world.eventOn('holidays', '2026-07-14').length, 1, '2026 stays as history');
  assert.equal(world.events('holidays').length, 33);
});

test('Gladys refuses a push: reported in the status, sent again at the next tick', async (t) => {
  const world = await createWorld({ config: { country: 'FR' }, connect: false });
  t.after(() => world.app.stop());
  const publish = world.gladys.publishCalendarEvents.bind(world.gladys);
  let refuse = true;
  t.mock.method(world.gladys, 'publishCalendarEvents', async (...args) => {
    if (refuse) {
      throw new GladysApiError(429, 'TOO_MANY_REQUESTS', 'Too many calendar writes');
    }
    return publish(...args);
  });
  await world.gladys.connect();
  assert.equal(world.gladys.fake.connectionStatus.connected, false);
  assert.match(
    world.gladys.fake.connectionStatus.message.fr,
    /Les calendriers n'ont pas pu être envoyés à Gladys \(Too many calendar writes\)\./,
  );
  assert.equal(world.events('holidays').length, 0);

  refuse = false;
  world.clock.advance(TICK_MS);
  await world.service.tick();
  assert.equal(world.events('holidays').length, 22);
  assert.deepEqual(world.gladys.fake.connectionStatus, { connected: true });
});

test('Gladys restarts: the users are read again and everything is sent again', async (t) => {
  const world = await createWorld({ config: { country: 'FR' } });
  t.after(() => world.app.stop());
  await world.gladys.disconnect();
  // Meanwhile Pepper enabled the integration and Gladys lost Tony's events.
  world.gladys.fake.calendarAccounts.push(account('pepper', 'en'));
  world.gladys.fake.calendarEvents = [];
  await world.gladys.connect();
  assert.equal(world.events('holidays', 'tony').length, 22);
  assert.equal(world.events('holidays', 'pepper').length, 22);
});

test('the window follows the time zone of Gladys', async (t) => {
  const world = await createWorld({
    config: { country: 'US' },
    accounts: [account('tony', 'en')],
    timeZone: 'America/New_York',
  });
  t.after(() => world.app.stop());
  const request = world.gladys.fake.requests.find(
    (candidate) => candidate.path === '/calendar/event',
  );
  assert.deepEqual(request.body.window, {
    from: '2026-01-01T05:00:00.000Z',
    to: '2028-01-01T05:00:00.000Z',
  });
  assert.equal(
    world.eventOn('holidays', '2026-07-03')[0].name,
    'Independence Day (substitute day)',
  );
});
