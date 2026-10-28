// -----------------------------------------------------------------------------
// The holidays, computed offline, checked against the official lists of
// holidays (legal texts and government pages) for several countries and
// years: France with Easter, Whit Monday and Alsace-Moselle, Bavaria and
// Berlin, the United States with observed days, Quebec, Belgium, Switzerland.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../src/config.js';
import { HolidayCalendar, resolveSubdivision } from '../src/holidays.js';
import { addDays } from '../src/dates.js';

const calendar = (config) => new HolidayCalendar(normalizeConfig(config));
const isHoliday = (cal, date) => cal.holidaysOn(date).length > 0;

/** Every holiday date of a year, as 'MM-DD'. */
function holidayDates(cal, year) {
  const dates = [];
  for (let date = `${year}-01-01`; date.startsWith(String(year)); date = addDays(date, 1)) {
    if (isHoliday(cal, date)) {
      dates.push(date.slice(5));
    }
  }
  return dates;
}

const FRANCE_2026 = [
  '01-01',
  '04-06',
  '05-01',
  '05-08',
  '05-14',
  '05-25',
  '07-14',
  '08-15',
  '11-01',
  '11-11',
  '12-25',
];

test('France 2026: the eleven public holidays, Easter Monday and Whit Monday moving with Easter', () => {
  assert.deepEqual(holidayDates(calendar({ country: 'FR' }), 2026), FRANCE_2026);
});

test('France 2027: Easter on 28 March moves Easter Monday, Ascension and Whit Monday', () => {
  assert.deepEqual(holidayDates(calendar({ country: 'FR' }), 2027), [
    '01-01',
    '03-29',
    '05-01',
    '05-06',
    '05-08',
    '05-17',
    '07-14',
    '08-15',
    '11-01',
    '11-11',
    '12-25',
  ]);
});

test('Alsace-Moselle adds Good Friday and Saint Stephen in the three départements', () => {
  for (const subdivision of ['57', '67', '68']) {
    const cal = calendar({ country: 'FR', subdivision });
    assert.ok(isHoliday(cal, '2026-04-03'), `${subdivision}: Good Friday 2026`);
    assert.ok(isHoliday(cal, '2027-03-26'), `${subdivision}: Good Friday 2027`);
    assert.ok(isHoliday(cal, '2026-12-26'), `${subdivision}: Saint Stephen`);
    assert.equal(cal.holidaysOn('2026-12-26', 'fr')[0].name, 'Lendemain de Noël');
  }
  const paris = calendar({ country: 'FR' });
  assert.ok(!isHoliday(paris, '2026-04-03') && !isHoliday(paris, '2026-12-26'));
});

test('Bavaria: Epiphany and Corpus Christi; the Assumption only in Catholic municipalities', () => {
  const bavaria = calendar({ country: 'DE', subdivision: 'BY' });
  assert.deepEqual(holidayDates(bavaria, 2026), [
    '01-01',
    '01-06',
    '04-03',
    '04-06',
    '05-01',
    '05-14',
    '05-25',
    '06-04',
    '10-03',
    '11-01',
    '12-25',
    '12-26',
  ]);
  assert.ok(!isHoliday(bavaria, '2026-08-15'));
  assert.ok(isHoliday(calendar({ country: 'DE', subdivision: 'BY-KATH' }), '2026-08-15'));
  // Berlin has Women's Day, and neither Epiphany nor Corpus Christi.
  const berlin = calendar({ country: 'DE', subdivision: 'BE' });
  assert.ok(isHoliday(berlin, '2026-03-08'));
  assert.ok(!isHoliday(berlin, '2026-01-06') && !isHoliday(berlin, '2026-06-04'));
  // Christmas Eve is a bank holiday from 14:00: only when bank holidays count.
  assert.ok(!isHoliday(bavaria, '2026-12-24'));
  assert.ok(
    isHoliday(
      calendar({ country: 'DE', subdivision: 'BY', holiday_types: ['public', 'bank'] }),
      '2026-12-24',
    ),
  );
});

test('United States: a holiday on a weekend is observed on the closest weekday', () => {
  const us = calendar({ country: 'US' });
  // 4 July 2026 is a Saturday: observed on Friday 3 July.
  assert.equal(us.holidaysOn('2026-07-03', 'en')[0].name, 'Independence Day (substitute day)');
  // 4 July 2027 is a Sunday: observed on Monday 5 July.
  assert.ok(isHoliday(us, '2027-07-05'));
  // Thanksgiving, fourth Thursday of November.
  assert.ok(isHoliday(us, '2026-11-26') && isHoliday(us, '2027-11-25'));
  // New Year's Day 2028 is a Saturday: observed on Friday 31 December 2027.
  assert.ok(isHoliday(us, '2027-12-31'));
});

test('Quebec: Fête nationale and Journée nationale des patriotes, Good Friday, no Easter Monday', () => {
  const quebec = calendar({ country: 'CA', subdivision: 'QC' });
  assert.equal(quebec.holidaysOn('2026-06-24', 'fr')[0].name, 'Fête nationale du Québec');
  assert.equal(quebec.holidaysOn('2026-05-18', 'fr')[0].name, 'Journée nationale des patriotes');
  assert.ok(isHoliday(quebec, '2026-04-03'));
  assert.ok(!isHoliday(quebec, '2026-04-06'));
  assert.ok(isHoliday(quebec, '2026-07-01'));
});

test('Belgium: national day on 21 July, Armistice, Whit Monday', () => {
  const belgium = calendar({ country: 'BE' });
  assert.deepEqual(holidayDates(belgium, 2026), [
    '01-01',
    '04-06',
    '05-01',
    '05-14',
    '05-25',
    '07-21',
    '08-15',
    '11-01',
    '11-11',
    '12-25',
  ]);
});

test('Switzerland: cantons differ (Berchtold Day and Federal Fast Monday in Vaud, Saint Stephen in Zurich)', () => {
  const vaud = calendar({ country: 'CH', subdivision: 'VD' });
  assert.ok(isHoliday(vaud, '2026-01-02'));
  assert.equal(vaud.holidaysOn('2026-09-21', 'fr')[0].name, 'Lundi du Jeûne Fédéral');
  assert.ok(isHoliday(vaud, '2026-08-01'));
  const zurich = calendar({ country: 'CH', subdivision: 'ZH' });
  assert.ok(isHoliday(zurich, '2026-12-26') && !isHoliday(zurich, '2026-09-21'));
});

test('a multi-day holiday covers each of its days', () => {
  // Eid al-Fitr lasts three days in the United Arab Emirates.
  const emirates = calendar({ country: 'AE' });
  const eid = ['2026-03-20', '2026-03-21', '2026-03-22'];
  for (const date of eid) {
    assert.ok(isHoliday(emirates, date), date);
  }
  assert.ok(!isHoliday(emirates, '2026-03-23'));
});

test('holiday names follow the language, with the official one when the library lacks it', () => {
  const germany = calendar({ country: 'DE', subdivision: 'BY' });
  assert.equal(germany.holidaysOn('2026-12-25', 'de')[0].name, '1. Weihnachtstag');
  assert.equal(calendar({ country: 'FR' }).holidaysOn('2026-12-25', 'es')[0].name, 'Navidad');
  assert.equal(
    calendar({ country: 'FR' }).holidaysOn('2026-07-14', 'fr')[0].name,
    'Fête Nationale de la France',
  );
});

test('extra days: a date, a day of every year, with or without a name', () => {
  const cal = calendar({
    country: 'FR',
    extra_days: '2026-05-15=Pont de l’Ascension; 12-24, 2027-12-31',
  });
  assert.equal(cal.holidaysOn('2026-05-15')[0].name, 'Pont de l’Ascension');
  assert.equal(cal.holidaysOn('2026-12-24', 'fr', 'Jour chômé')[0].name, 'Jour chômé');
  assert.ok(isHoliday(cal, '2030-12-24'));
  assert.ok(isHoliday(cal, '2027-12-31') && !isHoliday(cal, '2026-12-31'));
});

test('holidays left out: by name in any language, by date, or every year', () => {
  // The journée de solidarité: Whit Monday worked, whatever its date.
  for (const name of ['Lundi de Pentecôte', 'lundi de pentecote', 'Whit Monday', 'Pfingstmontag']) {
    const cal = calendar({ country: 'FR', ignored_holidays: name });
    assert.ok(!isHoliday(cal, '2026-05-25'), `${name} 2026`);
    assert.ok(!isHoliday(cal, '2027-05-17'), `${name} 2027`);
    assert.ok(isHoliday(cal, '2026-05-14'), `${name}: Ascension stays`);
  }
  const byDate = calendar({ country: 'FR', ignored_holidays: '2026-11-11, 08-15' });
  assert.ok(!isHoliday(byDate, '2026-11-11') && isHoliday(byDate, '2027-11-11'));
  assert.ok(!isHoliday(byDate, '2026-08-15') && !isHoliday(byDate, '2027-08-15'));
});

test('only public holidays count by default; other types are opt-in', () => {
  const france = calendar({ country: 'FR' });
  // Whit Sunday and Mother's Day are observances in the library.
  assert.ok(!isHoliday(france, '2026-05-24') && !isHoliday(france, '2026-05-31'));
  const all = calendar({ country: 'FR', holiday_types: ['public', 'observance'] });
  assert.ok(isHoliday(all, '2026-05-24') && isHoliday(all, '2026-05-31'));
});

test('subdivisions: codes are checked, a region may follow its state', () => {
  assert.deepEqual(resolveSubdivision('FR', '67'), { state: '67', region: null, valid: true });
  assert.deepEqual(resolveSubdivision('DE', 'by-kath'), {
    state: 'BY',
    region: 'KATH',
    valid: true,
  });
  assert.equal(resolveSubdivision('DE', 'BY.A').valid, true);
  assert.equal(resolveSubdivision('FR', 'XX').valid, false);
  assert.equal(resolveSubdivision('DE', 'BY-ZZ').valid, false);
  assert.equal(resolveSubdivision('FR', '').valid, true);
  // An unknown subdivision keeps the national holidays (and is reported).
  const typo = calendar({ country: 'FR', subdivision: '99' });
  assert.equal(typo.subdivisionValid, false);
  assert.deepEqual(holidayDates(typo, 2026), FRANCE_2026);
});

test('the holidays between two dates, and the next one', () => {
  const france = calendar({ country: 'FR', extra_days: '2026-12-24' });
  assert.deepEqual(
    france
      .between('2026-12-20', '2027-01-01', 'fr', 'Jour de congé')
      .map(({ date, holidays }) => [date, holidays.map((holiday) => holiday.name)]),
    [
      ['2026-12-24', ['Jour de congé']],
      ['2026-12-25', ['Noël']],
      ['2027-01-01', ['Nouvel An']],
    ],
  );
  assert.equal(france.next('2026-10-12', 'fr').date, '2026-11-01');
  assert.equal(france.next('2026-11-01', 'fr').holidays[0].name, 'Toussaint');
});
