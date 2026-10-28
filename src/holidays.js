// -----------------------------------------------------------------------------
// Public holidays, computed offline with date-holidays (ISC, data CC BY 3.0):
// no network, no quota. A holiday is a calendar day: the entries of the
// library are turned into 'YYYY-MM-DD' days once, per year and language, then
// the user's additions and exceptions are applied on top.
// -----------------------------------------------------------------------------

import Holidays from 'date-holidays';
import { addDays } from './dates.js';
import { LANGUAGES, foldName } from './config.js';

const catalog = new Holidays();

/** Country codes known to date-holidays. */
export const COUNTRY_CODES = Object.keys(catalog.getCountries('en'));

/** The subdivisions of a country: { code: name }, empty when it has none. */
export function subdivisionsOf(country) {
  return catalog.getStates(country, 'en') ?? {};
}

/** The regions of a subdivision (Bavaria: Augsburg…): { code: name }. */
export function regionsOf(country, state) {
  return catalog.getRegions(country, state, 'en') ?? {};
}

/**
 * Splits 'BY' or 'BY-A' / 'BY.A' into a checked subdivision and region.
 * date-holidays silently ignores an unknown subdivision (the national holidays
 * stay), so a typo would go unnoticed: it is refused here instead.
 * @returns {{ state: string|null, region: string|null, valid: boolean }}
 */
export function resolveSubdivision(country, subdivision) {
  if (!subdivision) {
    return { state: null, region: null, valid: true };
  }
  const [state, region = null, ...rest] = subdivision.toUpperCase().split(/[-.\s]+/);
  const states = subdivisionsOf(country);
  if (rest.length > 0 || !Object.hasOwn(states, state)) {
    return { state: null, region: null, valid: false };
  }
  if (region && !Object.hasOwn(regionsOf(country, state), region)) {
    return { state: null, region: null, valid: false };
  }
  return { state, region, valid: true };
}

export class HolidayCalendar {
  /**
   * @param {object} config a normalized configuration (src/config.js)
   */
  constructor(config) {
    this.config = config;
    const { state, region, valid } = resolveSubdivision(config.country, config.subdivision);
    this.state = state;
    this.region = region;
    this.subdivisionValid = valid;
    this.engine = new Holidays();
    if (region) {
      this.engine.init(config.country, state, region);
    } else if (state) {
      this.engine.init(config.country, state);
    } else {
      this.engine.init(config.country);
    }
    this.types = new Set(config.holiday_types);
    // year:language → Map(date → [{ id, name, type }])
    this.years = new Map();
  }

  // The library's entries of one year, as days. A multi-day entry (Eid in
  // several countries lasts three days) covers its following days too; an
  // entry starting at 14:00 (Christmas Eve in Germany) covers its date.
  yearDays(year, language) {
    const key = `${year}:${language}`;
    let days = this.years.get(key);
    if (days) {
      return days;
    }
    days = new Map();
    for (const entry of this.engine.getHolidays(year, language) ?? []) {
      if (!this.types.has(entry.type)) {
        continue;
      }
      const first = entry.date.slice(0, 10);
      const hours = (entry.end - entry.start) / 3_600_000;
      const length = Math.max(1, Math.round(hours / 24));
      for (let offset = 0; offset < length; offset += 1) {
        const date = addDays(first, offset);
        const list = days.get(date) ?? [];
        // The rule identifies an entry across languages; the date keeps two
        // entries of the same rule apart (none today, but cheap).
        list.push({ id: `${first}|${entry.rule}`, name: entry.name, type: entry.type });
        days.set(date, list);
      }
    }
    this.years.set(key, days);
    return days;
  }

  // The library's holidays of a day, before the user's changes.
  libraryHolidays(date, language) {
    const year = Number(date.slice(0, 4));
    // A multi-day entry of the previous year can spill over 1 January.
    return [
      ...(this.yearDays(year - 1, language).get(date) ?? []),
      ...(this.yearDays(year, language).get(date) ?? []),
    ];
  }

  ignoredByName(date, id) {
    const { names } = this.config.ignored;
    if (names.size === 0) {
      return false;
    }
    return [undefined, ...LANGUAGES].some((language) =>
      this.libraryHolidays(date, language).some(
        (holiday) => holiday.id === id && names.has(foldName(holiday.name)),
      ),
    );
  }

  /**
   * The holidays of a day, with the user's exceptions and additions applied.
   * @param {string} date 'YYYY-MM-DD'
   * @param {string} [language] names in this language when the library has it
   * @param {string} [extraName] the name of a day the user added without one
   * @returns {{ name: string, type: string, extra?: boolean }[]}
   */
  holidaysOn(date, language, extraName = null) {
    const { ignored, extraDays } = this.config;
    const monthDay = date.slice(5);
    const holidays = [];
    if (!ignored.dates.has(date) && !ignored.monthDays.has(monthDay)) {
      for (const holiday of this.libraryHolidays(date, language)) {
        if (!this.ignoredByName(date, holiday.id)) {
          holidays.push({ name: holiday.name, type: holiday.type });
        }
      }
    }
    for (const day of extraDays) {
      if (day.date === date || day.monthDay === monthDay) {
        holidays.push({ name: day.name ?? extraName ?? 'Day off', type: 'extra', extra: true });
      }
    }
    return holidays;
  }

  /**
   * The holidays from `from` to `to` (both included), one entry per day.
   * @returns {{ date: string, holidays: object[] }[]}
   */
  between(from, to, language, extraName) {
    const found = [];
    for (let date = from; date <= to; date = addDays(date, 1)) {
      const holidays = this.holidaysOn(date, language, extraName);
      if (holidays.length > 0) {
        found.push({ date, holidays });
      }
    }
    return found;
  }

  /** The first holiday on or after a date, within a year and a bit. */
  next(from, language, extraName) {
    return this.between(from, addDays(from, 400), language, extraName)[0] ?? null;
  }
}
