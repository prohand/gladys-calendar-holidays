// -----------------------------------------------------------------------------
// French school holidays, from the Education ministry's open data
// (data.education.gouv.fr, dataset fr-en-calendrier-scolaire, Licence Ouverte
// 2.0). Free, no key: read at most once a day, kept in /data, and the
// integration keeps working offline with what it already has.
//
// What the rows say, checked on the whole dataset (2009 to 2029):
// - one row per académie: the same period repeats, the request groups them;
// - dates are midnights of Paris (22:00 or 23:00 UTC), whatever the zone;
// - `end_date` is the day classes resume, not the last day off (Toussaint 2025:
//   18 October → 3 November, a Monday), except for a one-day period whose
//   start and end are equal (Pont de l'Ascension 2027: 7 May → 7 May);
// - the summer holidays come twice, for teachers ("Enseignants", who resume
//   earlier) and pupils ("Élèves"): only the pupils' rows, and the rows for
//   everyone ("-"), are kept. Rows for a part of a zone (Saint-Martin in the
//   Guadeloupe zone) are left out too;
// - the last published summer can be a one-day "Début des Vacances d'Été"
//   (beginning of the summer holidays) whose end is not known yet: the data
//   speaks until its eve, the days after are unknown, never guessed.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { addDays, localSlot } from './dates.js';
import { SCHOOL_ZONES, foldName } from './config.js';
import { createFailureLog } from './failures.js';

const logger = createLogger({ name: 'school-holidays' });

export const API_URL =
  'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records';

const DAY_MS = 24 * 60 * 60 * 1000;
// One read a day at most; after a failure, a new try six hours later.
export const REFRESH_MS = DAY_MS;
export const RETRY_MS = 6 * 60 * 60 * 1000;
const KEPT_POPULATIONS = new Set(['', '-', 'eleves']);

/** The calendar date of an instant in Paris, the time zone of the dataset. */
function parisDate(value) {
  const instant = Date.parse(value);
  return Number.isNaN(instant) ? null : localSlot(instant, 'Europe/Paris').date;
}

/**
 * The request for a zone: the periods ending from `since` on, one row per
 * period (grouped), oldest first.
 */
export function requestUrl(zone, since) {
  const url = new URL(API_URL);
  const fields = 'description,population,start_date,end_date,zones';
  url.searchParams.set('select', fields);
  url.searchParams.set('group_by', fields);
  url.searchParams.set('where', `zones="${zone}" and end_date >= "${since}"`);
  url.searchParams.set('order_by', 'start_date');
  url.searchParams.set('limit', '100');
  return url.toString();
}

/**
 * The periods off for pupils, from the API rows.
 * @param {object[]} rows `results` of the API
 * @returns {{ periods: { name: string, first: string, last: string }[], coveredUntil: string|null }}
 *   `first`/`last` are the first and last days off; `coveredUntil` is the
 *   last day the data speaks for (the eve of the last resumption).
 */
export function parseRecords(rows, zone) {
  const periods = new Map();
  const markers = [];
  let coveredUntil = null;
  for (const row of rows ?? []) {
    if (row?.zones !== zone || !KEPT_POPULATIONS.has(foldName(row.population ?? ''))) {
      continue;
    }
    const start = parisDate(row.start_date);
    const end = parisDate(row.end_date);
    const name = typeof row.description === 'string' ? row.description.trim() : '';
    if (!start || !end || !name || end < start) {
      continue;
    }
    if (foldName(name).startsWith('debut des')) {
      markers.push(start);
      continue;
    }
    const last = end > start ? addDays(end, -1) : start;
    periods.set(`${start}|${last}|${name}`, { name, first: start, last });
    if (!coveredUntil || last > coveredUntil) {
      coveredUntil = last;
    }
  }
  // School days run until a marker's eve: the data covers them.
  for (const start of markers) {
    const eve = addDays(start, -1);
    if (!coveredUntil || eve > coveredUntil) {
      coveredUntil = eve;
    }
  }
  const sorted = [...periods.values()].sort(
    (a, b) => a.first.localeCompare(b.first) || a.last.localeCompare(b.last),
  );
  return { periods: sorted, coveredUntil };
}

export class SchoolHolidays {
  /**
   * @param {object} options
   * @param {object} options.store load/save of JSON files in /data
   * @param {Function} [options.fetch] the fetch implementation (tests)
   * @param {Function} [options.now] the clock (tests)
   */
  constructor({ store, fetch = globalThis.fetch, now = Date.now }) {
    this.store = store;
    this.fetch = fetch;
    this.now = now;
    this.zone = null;
    this.data = null; // { zone, fetched_at, periods, covered_until }
    this.lastAttempt = 0;
    this.lastError = null;
    // The first read of a zone is an info line, the daily ones are debug.
    this.announced = false;
    this.failures = createFailureLog(logger);
  }

  /** Switches to a zone key of SCHOOL_ZONES ('none' disables), loading the cache. */
  setZone(zoneKey) {
    const zone = SCHOOL_ZONES[zoneKey] ?? null;
    if (zone === this.zone && this.data !== null) {
      return;
    }
    this.zone = zone;
    this.lastAttempt = 0;
    this.lastError = null;
    this.announced = false;
    const cached = zone ? this.store.load('school-holidays.json') : null;
    this.data = cached?.zone === zone && Array.isArray(cached.periods) ? cached : null;
  }

  get enabled() {
    return this.zone !== null;
  }

  /** True when a read is due: no data for the zone, or data a day old. */
  isDue() {
    if (!this.enabled) {
      return false;
    }
    const now = this.now();
    const age = this.data ? now - Date.parse(this.data.fetched_at) : Infinity;
    return !(age < REFRESH_MS) && now - this.lastAttempt >= RETRY_MS;
  }

  /**
   * Reads the zone's calendar when due (or when `force`d by a user action
   * while no data is there). Never throws: a failure keeps the cache.
   * @returns {Promise<boolean>} true when new data was stored
   */
  async refresh({ force = false } = {}) {
    if (!this.enabled || !(this.isDue() || (force && !this.data))) {
      return false;
    }
    const now = this.now();
    this.lastAttempt = now;
    const zone = this.zone;
    // From 1 January: the calendars of Gladys show the whole current year.
    const since = `${localSlot(now, 'Europe/Paris').date.slice(0, 4)}-01-01`;
    try {
      const response = await this.fetch(requestUrl(zone, since), {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const body = await response.json();
      const { periods, coveredUntil } = parseRecords(body.results, zone);
      if (periods.length === 0) {
        throw new Error('no period for this zone in the answer');
      }
      if (zone !== this.zone) {
        return false; // the zone changed during the request
      }
      this.data = {
        zone,
        fetched_at: new Date(now).toISOString(),
        periods,
        covered_until: coveredUntil,
      };
      this.lastError = null;
      this.store.save('school-holidays.json', this.data);
      const summary = `${zone}: ${periods.length} periods, until ${coveredUntil}`;
      if (this.failures.isFailing('read')) {
        this.failures.succeeded('read', `School calendar read again (${summary})`);
      } else if (this.announced) {
        logger.debug(summary);
      } else {
        logger.info(summary);
      }
      this.announced = true;
      return true;
    } catch (err) {
      this.lastError = err.message;
      this.failures.failed('read', `Could not read the school calendar of ${zone}: ${err.message}`);
      return false;
    }
  }

  /**
   * Whether a day is off for pupils: the period, `null` when it is a school
   * day, `undefined` when the data does not speak for that day (disabled, not
   * read yet, or beyond what the ministry published).
   */
  periodOn(date) {
    if (!this.enabled || !this.data || date > this.data.covered_until) {
      return undefined;
    }
    return this.data.periods.find((period) => period.first <= date && date <= period.last) ?? null;
  }

  /** The periods not over yet on a date, oldest first. */
  upcoming(from) {
    if (!this.enabled || !this.data) {
      return [];
    }
    return this.data.periods.filter((period) => period.last >= from);
  }

  /** The periods with at least one day between two dates (both included). */
  periodsBetween(from, to) {
    return this.upcoming(from).filter((period) => period.first <= to);
  }
}
