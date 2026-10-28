// -----------------------------------------------------------------------------
// What one Gladys user receives: the calendars and their full-day events, as
// the SDK publishes them. Pure functions, no request: src/service.js sends.
//
// Every id is user-scoped (ext:<integration>:<user>:…, the rule of the
// calendar type) and forever: Gladys keys the calendars, their sync and share
// toggles and the scenes reading them on these ids.
//
// The events cover the current year and the next one, in the time zone of
// Gladys. The window sent with them replaces the window's content: a holiday
// removed from the configuration disappears from Gladys at the next push.
// Earlier years are never sent again and stay in Gladys as history.
// -----------------------------------------------------------------------------

import { SCHOOL_ZONES } from './config.js';
import { addDays, zonedMidnight } from './dates.js';
import { resolveSubdivision, subdivisionsOf } from './holidays.js';
import { CALENDAR_TEXT, SCHOOL_EVENT_TEXT, TYPE_TEXT, countryName } from './i18n.js';

// The keys of the calendar ids: never renamed.
export const CALENDARS = { HOLIDAYS: 'holidays', SCHOOL: 'school' };

export const COLORS = { holidays: '#d63939', school: '#2fb344' };

/** The external_id of one of the user's calendars. */
export function calendarExternalId(gladys, user, key) {
  return gladys.externalId(`${user}:${key}`);
}

/** The days the events cover: 1 January of this year to 31 December of the next. */
export function horizon(today) {
  const year = Number(today.slice(0, 4));
  return { first: `${year}-01-01`, last: `${year + 1}-12-31` };
}

/** The window of a horizon, from the midnight of its first day to the end of its last. */
export function windowOf(range, timeZone) {
  return {
    from: zonedMidnight(range.first, timeZone),
    to: zonedMidnight(addDays(range.last, 1), timeZone),
  };
}

/** "France" or "Germany, Bavaria": the place in the name of the holidays calendar. */
function placeName(config, language) {
  const country = countryName(config.country, language);
  const { state, valid } = resolveSubdivision(config.country, config.subdivision);
  if (!valid || !state) {
    return country;
  }
  return `${country}, ${subdivisionsOf(config.country)[state] ?? state}`;
}

/** The zone as written in the names: "Zone C", "Corse". */
export function zoneName(config) {
  return SCHOOL_ZONES[config.school_zone] ?? null;
}

/**
 * The calendars of a user: the holidays, and the school holidays when a zone
 * is followed.
 * @returns {{ key: string, external_id: string, name: string, description: string, color: string }[]}
 */
export function buildCalendars(gladys, user, language, config) {
  const text = CALENDAR_TEXT[language];
  const calendars = [
    {
      key: CALENDARS.HOLIDAYS,
      external_id: calendarExternalId(gladys, user, CALENDARS.HOLIDAYS),
      // Gladys caps a calendar name at 100 characters.
      name: text.holidays(placeName(config, language)).slice(0, 100),
      description: text.holidaysDescription,
      color: COLORS.holidays,
    },
  ];
  const zone = zoneName(config);
  if (zone) {
    calendars.push({
      key: CALENDARS.SCHOOL,
      external_id: calendarExternalId(gladys, user, CALENDARS.SCHOOL),
      name: text.school(zone),
      description: text.schoolDescription,
      color: COLORS.school,
    });
  }
  return calendars;
}

/**
 * The holidays of the horizon, one full-day event per holiday and day (two
 * holidays on the same day are two events).
 */
export function holidayEvents(gladys, user, language, calendar, range) {
  const events = [];
  for (const { date, holidays } of calendar.between(
    range.first,
    range.last,
    language,
    CALENDAR_TEXT[language].dayOff,
  )) {
    holidays.forEach((holiday, index) => {
      events.push({
        external_id: gladys.externalId(`${user}:holiday:${date}:${index}`),
        // Gladys caps an event name at 200 characters.
        name: holiday.name.slice(0, 200),
        start: date,
        end: addDays(date, 1),
        full_day: true,
        description: TYPE_TEXT[language][holiday.type] ?? TYPE_TEXT[language].public,
      });
    });
  }
  return events;
}

/**
 * The school holidays overlapping the horizon, one full-day event per period,
 * its end the day classes resume (exclusive, the iCalendar convention).
 */
export function schoolEvents(gladys, user, language, school, zone, range) {
  return school.periodsBetween(range.first, range.last).map((period) => ({
    external_id: gladys.externalId(`${user}:school:${period.first}:${period.last}`),
    name: period.name.slice(0, 200),
    start: period.first,
    end: addDays(period.last, 1),
    full_day: true,
    description: SCHOOL_EVENT_TEXT[language](zone),
  }));
}
