# Holidays Calendar for Gladys Assistant

An external integration for [Gladys Assistant](https://gladysassistant.com) that puts **public
holidays** and **French school holidays** straight into the **Gladys calendar**: they show up in the
Calendar view next to your other calendars, and your scenes use them through the calendar trigger and
actions of Gladys.

It is the calendar version of [gladys-holidays](https://github.com/guim31/gladys-holidays), which
publishes the same information as a device. The holiday computation and the school calendar reading
come from it.

> Tested with its automated test suite (calendars of several countries and years, time zones, recorded
> answers of the school-holiday API, the SDK's fake Gladys), not yet on many real Gladys instances:
> feedback welcome in the issues or on the Gladys forum.

## Features

- **Public holidays of about 200 countries** and their subdivisions (Alsace-Moselle, German states,
  Swiss cantons, Canadian provinces, US states…), computed **offline** with
  [date-holidays](https://github.com/commenthol/date-holidays): no account, no API key, no network.
- **Extra days off** (bridges, company closures) added to the holidays calendar, and **holidays left
  out** (the French _journée de solidarité_) by date, day of the year or name.
- **French school holidays** (optional): zones A, B, C, Corsica and five overseas zones, read once a
  day from the open data of the Education ministry, cached in `/data`, offline afterwards.
- **Two calendars per user**, in the user's language (English, French, German or Spanish):
  _Public holidays_ (one full-day event per holiday) and _School holidays_ (one event per period), from
  1 January of this year to 31 December of the next.
- **Scenes**: once the user shares a calendar with the household, the built-in calendar blocks of
  Gladys work on it: trigger _Calendar event is coming_, actions _Condition on calendar events_ and _Get
  calendar events_.
- A **Check the configuration** button: holidays in use, next holiday, school holidays read, users
  served, what to fix, subdivision codes.

## Requirements

- Gladys Assistant **5.2.0** or later (calendar integrations).
- Internet access only for the French school holidays (once a day, `data.education.gouv.fr`).

## Installation

1. In Gladys, open **Integrations → Install from GitHub** and enter
   `https://github.com/prohand/gladys-calendar-holidays`.
2. In the **Configuration** tab, choose the country (and a subdivision if your region has holidays of
   its own), the days to put in the calendar, and a school-holiday zone if you want them. Save.
3. On the same page, each user clicks **Enable for me** in **My calendars**. To use a calendar in
   scenes, turn on **Share with the household** under it.

The full user documentation is in [English](docs/en.md), [French](docs/fr.md), [German](docs/de.md)
and [Spanish](docs/es.md).

## How it works

- The manifest declares `type: "calendar"`: no device, no discovery. Gladys lists the users who enabled
  the integration (`getCalendarAccounts`), the integration pushes their calendars (`publishCalendars`)
  and the events of each one (`publishCalendarEvents`) with a window covering this year and the next,
  from the midnight of the time zone of Gladys (`TZ`). The window replaces its content: a holiday removed
  from the configuration disappears at the next push; past years stay as history; events created by hand
  are never touched.
- Every id is user-scoped (`ext:<integration>:<user>:holidays`, `…:school`, `…:holiday:<date>:<n>`,
  `…:school:<first>:<last>`) and never changes.
- Everything is sent at start, on every reconnection and on a configuration change; a user's calendars
  when they enable the integration or toggle a calendar (`onCalendarAccountUpdated`). A clock checks every
  15 minutes what changed (school calendar read again, new year) and sends only that: the core caps
  calendar writes at 30 a minute. A calendar the user switched off (`sync: false`) is skipped; a failed
  push is retried at the next tick and shown in the status.
- School holidays come from the dataset
  [`fr-en-calendrier-scolaire`](https://data.education.gouv.fr/explore/dataset/fr-en-calendrier-scolaire/):
  one request per day at most (six hours between two tries after a failure), from 1 January on, grouped
  by period, pupils' rows only. The event ends on the day classes resume (exclusive end, the iCalendar
  convention).

## Limitations

- One country per installation, shared by the whole household; each user gets their own copy of the
  calendars (a calendar belongs to a user in Gladys).
- Scenes only see **shared** calendars: a user must share them.
- Holidays decided late by a government reach the integration with a date-holidays update; the **Extra
  days off** field covers the meantime. Lunar holidays can differ by a day from the official
  announcement.
- No workday notion: a calendar holds events, not "workday / day off" states. For that, use
  [gladys-holidays](https://github.com/guim31/gladys-holidays).
- French school holidays: pupils only; Nouvelle-Calédonie, Polynésie française and Wallis-et-Futuna are
  not offered.

## Development

Node.js 22+, ESM, no build step. Runtime dependencies:
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js) and
[`date-holidays`](https://github.com/commenthol/date-holidays).

```bash
npm install
npm test              # node --test, against the SDK's fake Gladys; no network
npm run lint
npm run format:check
npx -y github:GladysAssistant/integration-store --skip-image-check .   # store validator
node scripts/countries.mjs   # regenerates the country options of the manifest
```

```
index.js              SDK wiring (src/app.js registers the handlers)
src/app.js            every SDK handler -> the service, "Check the configuration"
src/service.js        who gets what, when: accounts, pushes, the 15-minute clock, status
src/calendars.js      the calendars and events of one user (pure)
src/holidays.js       date-holidays -> calendar days, extra days, holidays left out
src/school.js         French school holidays: request, parsing, daily cache
src/i18n.js           every text of the code, in four languages
src/dates.js          calendar dates as strings, time zones
src/config.js         DEFAULT_CONFIG (mirrors the manifest) + normalization
src/store.js          JSON files in /data
test/fixtures/        recorded answers of data.education.gouv.fr
```

To run it outside Gladys:

```bash
GLADYS_HOST_API_URL="http://localhost:1443" \
GLADYS_INTEGRATION_TOKEN="<token>" \
GLADYS_INTEGRATION_SELECTOR="calendar-holidays" \
HOLIDAYS_DATA_DIR=./data \
TZ=Europe/Paris \
npm start
```

Releases are made by the **Release** workflow (Actions → Release); never edit the versions by hand. See
[`CLAUDE.md`](CLAUDE.md) for the project rules.

## Credits

- [gladys-holidays](https://github.com/guim31/gladys-holidays) by guim31 (Apache-2.0): the holiday
  computation, the school calendar reading, the project layout and its workflows.
- [date-holidays](https://github.com/commenthol/date-holidays) by commenthol and contributors (code ISC,
  holiday data CC BY 3.0): every holiday of every country.
- [Calendrier scolaire](https://data.education.gouv.fr/explore/dataset/fr-en-calendrier-scolaire/),
  French Education ministry (Licence Ouverte 2.0): the school holidays; the test fixtures in
  `test/fixtures/education/` are answers of its API recorded on 2026-10-12.

## Disclaimer

This project is not affiliated with, endorsed or sponsored by the French Education ministry or the
date-holidays project.

## License

Apache-2.0
