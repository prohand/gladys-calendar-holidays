// -----------------------------------------------------------------------------
// Prints the `options` of the manifest's country field: every country
// date-holidays knows, named in the four languages of Gladys by the ICU data
// of Node. French-speaking countries first (most Gladys users), then the
// others in English alphabetical order.
//
//   node scripts/countries.mjs > /tmp/countries.json
//
// Re-run after a date-holidays update: test/manifest.test.js fails when the
// manifest and the library disagree on the list of countries.
// -----------------------------------------------------------------------------

import { COUNTRY_CODES } from '../src/holidays.js';

export const FIRST = ['FR', 'BE', 'CH', 'LU', 'CA', 'MC'];

const names = Object.fromEntries(
  ['en', 'fr', 'de', 'es'].map((language) => [
    language,
    new Intl.DisplayNames([language], { type: 'region' }),
  ]),
);

const label = (code) =>
  Object.fromEntries(
    Object.entries(names).map(([language, display]) => [language, display.of(code)]),
  );

const rest = COUNTRY_CODES.filter((code) => !FIRST.includes(code)).sort((a, b) =>
  names.en.of(a).localeCompare(names.en.of(b), 'en'),
);

const options = [...FIRST, ...rest].map((code) => ({ value: code, label: label(code) }));
process.stdout.write(`${JSON.stringify(options, null, 2)}\n`);
