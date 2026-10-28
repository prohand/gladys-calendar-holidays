# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.0.1] - 2026-10-28

### Added

- A calendar integration (Gladys 5.2.0 or later): every user who enables it in "My calendars" gets a
  _Public holidays_ calendar, and a _School holidays_ calendar when a French zone is chosen, in their
  language, from 1 January of this year to 31 December of the next. Shared with the household, they
  work with the calendar trigger and actions of the scenes.
- Public holidays of about 200 countries and their subdivisions, computed offline with date-holidays;
  public holidays only by default, bank holidays, local school days off, optional days and observances
  on demand.
- Extra days off added to the holidays calendar, and holidays left out, by date, day of the year or name
  in any language.
- French school holidays of zones A, B, C, Corsica, Guadeloupe, French Guiana, Martinique, Mayotte,
  Réunion and Saint Pierre and Miquelon, read once a day from data.education.gouv.fr and kept for
  offline use.
- Only what changed is sent again; a calendar the user switched off is skipped; a refused push is
  retried and shown in the status.
- A "Check the configuration" button, and the documentation in English, French, German and Spanish.

[Unreleased]: https://github.com/prohand/gladys-calendar-holidays/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/prohand/gladys-calendar-holidays/releases/tag/v1.0.1
