// -----------------------------------------------------------------------------
// Consistency checks between `gladys-assistant-integration.json` and the code.
// The manifest is validated by the store indexer, but nothing there can know
// which handlers the code actually registers — these tests keep both in sync.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CHECK_ACTION } from '../src/app.js';
import { DEFAULT_CONFIG, HOLIDAY_TYPES, SCHOOL_ZONES } from '../src/config.js';
import { COUNTRY_CODES } from '../src/holidays.js';
import { createWorld } from './helpers/world.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const allFields = [
  ...(manifest.config_schema ?? []),
  ...(manifest.actions ?? []).flatMap((item) => item.fields ?? []),
];

// The handlers the integration actually registers on the SDK.
const registered = await createWorld({ connect: false });
const handlerKeys = (prefix) =>
  Object.keys(registered.gladys.handlers)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length));

const keysOf = (list) => (list ?? []).map((entry) => entry.key);
const field = (key) => manifest.config_schema.find((entry) => entry.key === key);
const optionValues = (key) => field(key).options.map((option) => option.value);

function minGladysVersion() {
  const match = manifest.gladys_version.match(/>=\s*(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, 'gladys_version must declare a minimum version');
  return match.slice(1).map(Number);
}

function isAtLeast(version, required) {
  for (let i = 0; i < required.length; i += 1) {
    if (version[i] !== required[i]) {
      return version[i] > required[i];
    }
  }
  return true;
}

test('identity: a calendar integration, its image, cover, transports and category', () => {
  assert.equal(manifest.name, 'Holidays Calendar');
  assert.equal(manifest.type, 'calendar');
  assert.match(manifest.docker_image, /^ghcr\.io\/prohand\/gladys-calendar-holidays:/);
  assert.equal(
    manifest.cover_image,
    'https://raw.githubusercontent.com/prohand/gladys-calendar-holidays/main/cover.png',
  );
  // Holidays are computed locally; the optional French school holidays read an
  // open-data API once a day, not enough to make a cloud integration of it.
  assert.deepEqual(manifest.transports, ['local']);
  assert.deepEqual(manifest.categories, ['services']);
});

test('the calendar type requires Gladys >= 5.2.0', () => {
  assert.ok(isAtLeast(minGladysVersion(), [5, 2, 0]), manifest.gladys_version);
});

test('nothing to ask each user: no account_schema, enabling is enough', () => {
  assert.equal(manifest.account_schema, undefined);
});

test('the manifest stays well under the 100 KB the store indexer reads', async () => {
  const bytes = (await readFile(new URL('../gladys-assistant-integration.json', import.meta.url)))
    .length;
  assert.ok(bytes < 80 * 1024, `${bytes} bytes`);
});

test('every manifest action has a registered handler, and vice versa', () => {
  assert.deepEqual(keysOf(manifest.actions), [CHECK_ACTION]);
  assert.deepEqual(handlerKeys('action:'), [CHECK_ACTION]);
});

test('the calendar handler is registered, no device handler is', () => {
  assert.equal(typeof registered.gladys.handlers.calendarAccountUpdated, 'function');
  for (const name of ['poll', 'setValue', 'scanRequest', 'deviceCreated']) {
    assert.equal(registered.gladys.handlers[name], undefined, name);
  }
});

test('config_schema defaults and options stay consistent with the code', () => {
  for (const entry of manifest.config_schema) {
    if (entry.default !== undefined) {
      assert.deepEqual(DEFAULT_CONFIG[entry.key], entry.default, `DEFAULT_CONFIG.${entry.key}`);
    }
  }
  assert.deepEqual(
    Object.keys(DEFAULT_CONFIG).sort(),
    manifest.config_schema
      .filter((entry) => entry.type !== 'section')
      .map((entry) => entry.key)
      .sort(),
  );
  assert.deepEqual(optionValues('holiday_types'), HOLIDAY_TYPES);
  assert.deepEqual(optionValues('school_zone'), Object.keys(SCHOOL_ZONES));
});

test('the country list is the one of date-holidays (scripts/countries.mjs)', () => {
  const countries = optionValues('country');
  assert.deepEqual([...countries].sort(), [...COUNTRY_CODES].sort());
  assert.equal(new Set(countries).size, countries.length);
  assert.equal(countries[0], 'FR');
});

test('section fields are purely presentational', () => {
  const sections = manifest.config_schema.filter((entry) => entry.type === 'section');
  assert.ok(sections.length > 0);
  for (const section of sections) {
    assert.equal(section.required, undefined);
    assert.equal(section.default, undefined);
    assert.ok(!(section.key in DEFAULT_CONFIG));
    for (const link of section.links ?? []) {
      assert.match(link.url, /^https:\/\//);
    }
  }
});

test('no secret field anywhere: nothing here is secret', () => {
  assert.ok(allFields.every((entry) => entry.type !== 'secret'));
});

test('the manifest version is the package version, and the image is tagged with it', () => {
  assert.equal(manifest.version, pkg.version);
  assert.ok(manifest.docker_image.endsWith(`:${manifest.version}`));
});

test('the catalog description holds 10 to 100 characters per language', () => {
  for (const [lang, text] of Object.entries(manifest.description)) {
    assert.ok(text.length >= 10 && text.length <= 100, `description.${lang}: ${text.length}`);
  }
});
