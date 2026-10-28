// -----------------------------------------------------------------------------
// Configuration: DEFAULT_CONFIG mirrors the manifest defaults (tied by
// test/manifest.test.js), and normalizeConfig() turns whatever Gladys sends
// (a field never saved is absent, a number may arrive as a string) into a
// complete, valid object. Nothing here throws: a wrong entry is dropped and
// reported in `problems`, shown in the connection status.
// -----------------------------------------------------------------------------

import { isDate } from './dates.js';

// The languages of every text of the integration. A user of Gladys in another
// language gets the English texts (holiday names come from date-holidays).
export const LANGUAGES = ['en', 'fr', 'de', 'es'];

// The `type` of a date-holidays entry. Only `public` counts by default: bank
// holidays (Christmas Eve afternoon in Germany), local school days off,
// optional and observance days (Mother's Day) are opt-in.
export const HOLIDAY_TYPES = ['public', 'bank', 'school', 'optional', 'observance'];

// French school holiday zones of the Education ministry's open data. Nouvelle-
// Calédonie, Wallis-et-Futuna and Polynésie are left out: their rows mix
// "start of the holidays" markers and several populations, and their end dates
// do not follow the convention of the others (see src/school.js).
export const SCHOOL_ZONES = {
  none: null,
  zone_a: 'Zone A',
  zone_b: 'Zone B',
  zone_c: 'Zone C',
  corse: 'Corse',
  guadeloupe: 'Guadeloupe',
  guyane: 'Guyane',
  martinique: 'Martinique',
  mayotte: 'Mayotte',
  reunion: 'Réunion',
  saint_pierre_et_miquelon: 'Saint Pierre et Miquelon',
};

// The countries whose schools follow the French calendar: metropolitan France
// and the overseas territories date-holidays knows as countries of their own.
export const SCHOOL_COUNTRIES = ['FR', 'GP', 'GF', 'MQ', 'RE', 'YT', 'PM', 'BL', 'MF'];

export const DEFAULT_CONFIG = {
  country: 'FR',
  subdivision: '',
  holiday_types: ['public'],
  extra_days: '',
  ignored_holidays: '',
  school_zone: 'none',
};

/**
 * @param {object} [raw] the configuration sent by Gladys
 * @param {string[]} [countries] the known country codes (date-holidays)
 * @returns {object} DEFAULT_CONFIG's keys, valid values, plus `problems`
 */
export function normalizeConfig(raw = {}, countries = null) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const problems = [];

  let country = text(source.country).toUpperCase() || DEFAULT_CONFIG.country;
  if (countries && !countries.includes(country)) {
    problems.push({ key: 'unknownCountry', value: country });
    country = DEFAULT_CONFIG.country;
  }

  const holidayTypes = Array.isArray(source.holiday_types)
    ? HOLIDAY_TYPES.filter((type) => source.holiday_types.includes(type))
    : DEFAULT_CONFIG.holiday_types;

  const extra = parseExtraDays(source.extra_days);
  for (const token of extra.invalid) {
    problems.push({ key: 'invalidDate', value: token });
  }

  const schoolZone = Object.hasOwn(SCHOOL_ZONES, source.school_zone)
    ? source.school_zone
    : DEFAULT_CONFIG.school_zone;
  if (schoolZone !== 'none' && !SCHOOL_COUNTRIES.includes(country)) {
    problems.push({ key: 'schoolOutsideFrance', value: country });
  }

  return {
    country,
    subdivision: text(source.subdivision).toUpperCase(),
    holiday_types: holidayTypes,
    extra_days: text(source.extra_days),
    ignored_holidays: text(source.ignored_holidays),
    school_zone: SCHOOL_COUNTRIES.includes(country) ? schoolZone : 'none',
    extraDays: extra.days,
    ignored: parseIgnored(source.ignored_holidays),
    problems,
  };
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Entries are separated by commas, semicolons or line breaks.
function tokens(value) {
  return text(value)
    .split(/[,;\n]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

// '2026-05-15', '12-24' (every year), with an optional name: '12-24=Christmas Eve'.
const DAY_PATTERN = /^(\d{4}-)?(\d{2})-(\d{2})$/;

/**
 * The days off the user adds: bridges, a company day off.
 * @returns {{ days: { date?: string, monthDay?: string, name: string|null }[], invalid: string[] }}
 */
export function parseExtraDays(value) {
  const days = [];
  const invalid = [];
  for (const token of tokens(value)) {
    const [day, ...nameParts] = token.split('=');
    const key = day.trim();
    const name = nameParts.join('=').trim() || null;
    const match = DAY_PATTERN.exec(key);
    if (match && match[1] && isDate(key)) {
      days.push({ date: key, name });
    } else if (match && !match[1] && isDate(`2000-${key}`)) {
      // 2000 is a leap year: 02-29 is accepted, and only matches leap years.
      days.push({ monthDay: key, name });
    } else {
      invalid.push(token);
    }
  }
  return { days, invalid };
}

/**
 * The holidays left out of the calendar: dates ('2027-05-17'), days of the
 * year ('12-26'), or names ('Lundi de Pentecôte', the journée de solidarité),
 * matched in any language, case and accents ignored.
 */
export function parseIgnored(value) {
  const dates = new Set();
  const monthDays = new Set();
  const names = new Set();
  for (const token of tokens(value)) {
    const match = DAY_PATTERN.exec(token);
    if (match && match[1] && isDate(token)) {
      dates.add(token);
    } else if (match && !match[1] && isDate(`2000-${token}`)) {
      monthDays.add(token);
    } else {
      names.add(foldName(token));
    }
  }
  return { dates, monthDays, names };
}

/** A name compared without case, accents nor punctuation. */
export function foldName(name) {
  return String(name)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
