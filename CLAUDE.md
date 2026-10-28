# CLAUDE.md

Project rules for coding assistants (Claude Code reads this file) and for human
contributors.

## What this is

A Gladys Assistant **external integration of type `calendar`** (Gladys 5.2.0+):
a Node.js service (Node 22+, ESM, no build step) that runs in its own sandboxed
Docker container and pushes calendars and events into the calendar of Gladys
through
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js).
Its other runtime dependency is
[`date-holidays`](https://github.com/commenthol/date-holidays), which computes
the holidays offline. The holiday and school-calendar code comes from
[gladys-holidays](https://github.com/guim31/gladys-holidays) (device version).

## Commands

```bash
npm install
npm test                                  # node --test, the built-in runner
node --test test/service.test.js          # one file
node --test --test-name-pattern "window"  # tests whose name matches
npm run lint                              # ESLint
npm run format:check                      # Prettier, as the CI runs it
npm run format                            # Prettier, fix in place
npx -y github:GladysAssistant/integration-store --skip-image-check .   # store admission checks
node scripts/countries.mjs                # country options of the manifest, from date-holidays
```

The CI (`.github/workflows/ci.yml`) runs `format:check`, `lint` and `test` on
Node 22 and 24, builds the Docker image and runs the store checks: run the
three commands before pushing.

## Architecture

```
index.js                          SDK wiring only: src/app.js registers the handlers before connect()
src/app.js                        every SDK handler -> the service; "Check the configuration" report
src/service.js                    accounts, pushes, the 15-minute clock, status
src/calendars.js                  the calendars and events of one user (pure functions)
src/holidays.js                   date-holidays -> calendar days; extra days, holidays left out
src/school.js                     French school holidays: API request, parsing, daily cache in /data
src/i18n.js                       every text of the code, en/fr/de/es
src/dates.js                      'YYYY-MM-DD' arithmetic, local date and midnight in a time zone
src/config.js                     DEFAULT_CONFIG (mirrors the manifest defaults) + normalization
src/store.js                      JSON files in /data (HOLIDAYS_DATA_DIR locally)
src/failures.js                   repeated failures logged once (warn), their end once (info)
scripts/countries.mjs             prints the country options of the manifest
gladys-assistant-integration.json manifest: name, config_schema, actions, image...
docs/{en,fr,de,es}.md             user documentation, re-hosted by Gladys (en and fr mandatory)
test/                             node --test, against the SDK's fake Gladys (integration-sdk/testing)
test/fixtures/education/          answers of data.education.gouv.fr recorded on 2026-10-12
.github/scripts/release.mjs       release helpers (manifest bump, changelog), tested in test/
```

## Rules

- **External ids are forever.** Calendar and event ids are user-scoped:
  `gladys.externalId(`${userSelector}:…`)`. Gladys keys the calendars, their
  `sync`/`shared` toggles and the scenes reading them on these ids: changing
  one creates a new calendar and orphans the old one. The same goes for every
  key users store: manifest `config_schema` and `actions` keys.
- **The container rootfs is read-only.** Write only under `/data`, the one
  writable volume. Never log tokens, passwords or API keys.
- **Versions belong to the Release workflow** (Actions → Release). Never edit
  `version` in `package.json` or in the manifest, nor the `docker_image` tag,
  by hand. `test/manifest.test.js` checks they agree.
- **Changelog.** Every user-visible change adds a line under `## [Unreleased]`
  in `CHANGELOG.md` (`### Added`, `Changed`, `Fixed`, `Removed`, `Security`).
  Never write a version heading: the Release workflow moves the section.
- **Manifest.** Texts are multi-language objects `{ "en": ..., "fr": ... }`.
  The catalog `description` holds 10 to 100 characters per language.
  `type: "calendar"` needs `gladys_version` `>=5.2.0`. `test/manifest.test.js`
  ties the manifest to the code: change both sides together.
- **User-facing text** exists in English, French, German and Spanish:
  calendar names and descriptions, event descriptions, action messages,
  manifest texts, and the four `docs/*.md` with the same sections.
  `test/i18n.test.js` checks it. German says "du", Spanish "usted".
- **Style.** Prettier formats, ESLint catches mistakes. Comments explain why,
  in English. Tests never touch the network.

## Notes (vérifiées dans Gladys v5.2.0 et le SDK 0.16)

- Une session de code n'a **ni instance Gladys ni utilisateur réel**. La suite de tests, le lint et le
  validateur du store sont les seules vérifications possibles : le dire, plutôt que de conclure que
  « ça marche ».
- **Type `calendar`** (`docs/specs/external-integrations/capabilities/calendar-type.md` du cœur) : pas
  d'appareil ni de découverte. Chaque utilisateur active l'intégration dans « Mes calendriers » ; un
  calendrier poussé naît **privé** (`shared: false`) et les scènes (`calendar.event-is-coming`,
  `calendar.is-event-running`, `calendar.get-events`) ne voient **que les calendriers partagés**.
- Un événement « journée entière » se lit **par date** (`'2026-08-15'`), `end` **exclu** ; le cœur le
  range aux minuits du fuseau de l'instance. La fenêtre (`window`) se compare en instants : la calculer
  depuis le minuit local (`zonedMidnight`), sinon un férié du 31 décembre déborde sur la fenêtre de
  l'année suivante et se fait élaguer.
- **Une fenêtre, une requête** : une requête avec `window` remplace tout le contenu de la fenêtre.
  Plus de 500 événements imposerait de découper la **fenêtre** (jamais la liste). Deux ans de fériés
  restent loin en dessous.
- `sync: false` : le cœur vide le calendrier et répond 403 à tout envoi : le sauter. Le rallumage
  arrive par `onCalendarAccountUpdated`, qui renvoie tout pour cet utilisateur.
- **30 écritures de calendrier par minute** (POST/DELETE) par intégration, 429 au-delà : n'envoyer que
  ce qui a changé (signature par utilisateur dans `src/service.js`).
- `account-updated` est perdu pendant une déconnexion : relire `getCalendarAccounts()` à chaque
  connexion.
- La langue d'un utilisateur vient de `getCalendarAccounts()` (`user.language`) : les noms sont
  localisés par utilisateur, pas par un champ de configuration.

**date-holidays**

- Une **subdivision inconnue est ignorée en silence** (`init('FR', 'XX')` rend les fériés nationaux) :
  la valider par `getStates()` / `getRegions()` avant.
- Les entrées ont un `type` (`public`, `bank`, `school`, `optional`, `observance`). Les fêtes lunaires
  durent parfois plusieurs jours et commencent la veille au soir : prendre la partie date de `date`, puis
  la durée arrondie en jours.

**API du calendrier scolaire (`fr-en-calendrier-scolaire`)**

- Une ligne par académie : grouper. Les dates sont des **minuits de Paris** en UTC. `end_date` est le
  **jour de reprise**, sauf pour une période d'un jour. Ne garder que les populations « - » et
  « Élèves ». Un dernier été « Début des Vacances d'Été » marque la fin de ce que les données couvrent.

**Store**

- Le manifeste est plafonné à 100 Ko ; `test/manifest.test.js` vérifie < 80 Ko.
- Image de base `public.ecr.aws/docker/library/node:…` (pas Docker Hub, qui refuse en 429 les pulls
  anonymes des runners GitHub).
