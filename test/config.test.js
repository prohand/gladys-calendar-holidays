// -----------------------------------------------------------------------------
// The configuration as Gladys sends it: fields never saved are absent, and a
// wrong entry is dropped and reported, never thrown.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, normalizeConfig, parseExtraDays, foldName } from '../src/config.js';
import { COUNTRY_CODES } from '../src/holidays.js';
import { account, createWorld } from './helpers/world.js';

test('an empty configuration gives the defaults', () => {
  const config = normalizeConfig({}, COUNTRY_CODES);
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    assert.deepEqual(config[key], value, key);
  }
  assert.deepEqual(config.problems, []);
});

test('codes are normalized, unknown values replaced and reported', () => {
  const config = normalizeConfig(
    {
      country: 'zz',
      subdivision: ' by ',
      school_zone: 'zone_z',
      holiday_types: ['public', 'nope'],
    },
    COUNTRY_CODES,
  );
  assert.equal(config.country, 'FR');
  assert.deepEqual(config.problems, [{ key: 'unknownCountry', value: 'ZZ' }]);
  assert.equal(config.subdivision, 'BY');
  assert.equal(config.school_zone, 'none');
  assert.deepEqual(config.holiday_types, ['public']);
});

test('school holidays only for France and its overseas territories', () => {
  const germany = normalizeConfig({ country: 'DE', school_zone: 'zone_a' }, COUNTRY_CODES);
  assert.equal(germany.school_zone, 'none');
  assert.deepEqual(germany.problems, [{ key: 'schoolOutsideFrance', value: 'DE' }]);
  assert.equal(normalizeConfig({ country: 'RE', school_zone: 'reunion' }).school_zone, 'reunion');
});

test('added days: dates, days of every year, names, and the entries refused', () => {
  assert.deepEqual(parseExtraDays('2026-05-15=Pont; 12-24\n02-29 , 2026-02-30, 13-01, demain'), {
    days: [
      { date: '2026-05-15', name: 'Pont' },
      { monthDay: '12-24', name: null },
      { monthDay: '02-29', name: null },
    ],
    invalid: ['2026-02-30', '13-01', 'demain'],
  });
});

test('names are compared without case, accents nor punctuation', () => {
  assert.equal(foldName('Lundi de Pentecôte'), foldName('LUNDI  de pentecote'));
  assert.equal(foldName('Saint-Étienne'), 'saint etienne');
});

test('"Check the configuration" reports the holidays, the school calendar, the users and the codes', async (t) => {
  const world = await createWorld({
    config: { country: 'FR', subdivision: 'XX', school_zone: 'zone_b' },
    accounts: [account('tony', 'fr', 'Tony'), account('pepper', 'en', 'Pepper')],
    at: '2026-10-12T10:00:00Z',
  });
  t.after(() => world.app.stop());
  const ack = await world.gladys.fake.action('check_configuration', {});
  assert.equal(ack.success, true);
  const { message } = ack.data;
  assert.deepEqual(Object.keys(message), ['en', 'fr', 'de', 'es']);
  assert.match(message.fr, /^Jours fériés : France\.$/m);
  assert.match(
    message.fr,
    /Prochain férié : Toussaint, dimanche 1 novembre 2026 \(dans 20 jours\)\./,
  );
  assert.match(
    message.fr,
    /Vacances scolaires \(Zone B\) : connues jusqu'au lundi 3 juillet 2028\./,
  );
  assert.match(message.fr, /Calendriers envoyés à : Tony, Pepper\./);
  assert.match(message.fr, /partagez-le dans « Mes calendriers »/);
  assert.match(message.fr, /Subdivision inconnue « XX »/);
  assert.match(
    message.fr,
    /Codes de subdivision \(France\) : 57 Département Moselle, 67 Département Bas-Rhin/,
  );
  assert.match(message.de, /Regionscodes \(Frankreich\)/);

  const fine = await createWorld({ config: { country: 'DE', subdivision: 'BY' }, accounts: [] });
  t.after(() => fine.app.stop());
  const report = (await fine.gladys.fake.action('check_configuration', {})).data.message.en;
  assert.match(report, /^Holidays of Germany, BY \(Bayern\)\.$/m);
  assert.match(report, /School holidays: not followed\./);
  assert.match(report, /No user has enabled the integration yet/);
  assert.match(report, /Everything is fine\./);
  assert.doesNotMatch(report, /Subdivision codes/);
});

test('the time zone of Gladys comes from TZ, checked', async () => {
  const { processTimeZone } = await import('../src/dates.js');
  assert.equal(processTimeZone('America/New_York'), 'America/New_York');
  assert.equal(
    processTimeZone(':/etc/localtime'),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
});
