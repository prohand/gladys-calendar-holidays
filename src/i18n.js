// -----------------------------------------------------------------------------
// Every text the code sends to Gladys, in English, French, German and Spanish:
// calendar names and descriptions, event descriptions, the connection status
// and the report of "Check the configuration". German says "du", Spanish
// "usted" (test/i18n.test.js).
// -----------------------------------------------------------------------------

import { LANGUAGES } from './config.js';

/** The language of a Gladys user, English when it is not one of ours. */
export function languageOf(user) {
  const language = String(user?.language ?? '')
    .slice(0, 2)
    .toLowerCase();
  return LANGUAGES.includes(language) ? language : 'en';
}

/** The name of a country in a language ("Frankreich"), its code when unknown. */
export function countryName(code, language) {
  try {
    return new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export const CALENDAR_TEXT = {
  en: {
    holidays: (place) => `Public holidays (${place})`,
    holidaysDescription:
      'Public holidays computed offline by the Holidays Calendar integration. Share this calendar so your scenes can use it.',
    school: (zone) => `School holidays (${zone})`,
    schoolDescription:
      'French school holidays of your zone, from the open data of the Education ministry (data.education.gouv.fr). Share this calendar so your scenes can use it.',
    dayOff: 'Day off',
  },
  fr: {
    holidays: (place) => `Jours fériés (${place})`,
    holidaysDescription:
      "Jours fériés calculés hors ligne par l'intégration Holidays Calendar. Partagez ce calendrier pour que vos scènes puissent l'utiliser.",
    school: (zone) => `Vacances scolaires (${zone})`,
    schoolDescription:
      "Vacances scolaires de votre zone, d'après les données ouvertes de l'Éducation nationale (data.education.gouv.fr). Partagez ce calendrier pour que vos scènes puissent l'utiliser.",
    dayOff: 'Jour de congé',
  },
  de: {
    holidays: (place) => `Feiertage (${place})`,
    holidaysDescription:
      'Feiertage, offline berechnet von der Integration Holidays Calendar. Teile diesen Kalender, damit deine Szenen ihn nutzen können.',
    school: (zone) => `Schulferien (${zone})`,
    schoolDescription:
      'Französische Schulferien deiner Zone, aus den offenen Daten des Bildungsministeriums (data.education.gouv.fr). Teile diesen Kalender, damit deine Szenen ihn nutzen können.',
    dayOff: 'Freier Tag',
  },
  es: {
    holidays: (place) => `Festivos (${place})`,
    holidaysDescription:
      'Festivos calculados sin conexión por la integración Holidays Calendar. Comparta este calendario para que sus escenas puedan usarlo.',
    school: (zone) => `Vacaciones escolares (${zone})`,
    schoolDescription:
      'Vacaciones escolares francesas de su zona, según los datos abiertos del Ministerio de Educación (data.education.gouv.fr). Comparta este calendario para que sus escenas puedan usarlo.',
    dayOff: 'Día libre',
  },
};

/** The description of a holiday event, by the type of its entry. */
export const TYPE_TEXT = {
  en: {
    public: 'Public holiday',
    bank: 'Bank holiday',
    school: 'Local school day off',
    optional: 'Optional day off',
    observance: 'Observance',
    extra: 'Day off added in the configuration',
  },
  fr: {
    public: 'Jour férié',
    bank: 'Férié bancaire',
    school: 'Jour sans école local',
    optional: 'Jour facultatif',
    observance: 'Célébration',
    extra: 'Jour de congé ajouté dans la configuration',
  },
  de: {
    public: 'Gesetzlicher Feiertag',
    bank: 'Bankfeiertag',
    school: 'Lokaler schulfreier Tag',
    optional: 'Optionaler freier Tag',
    observance: 'Gedenktag',
    extra: 'In der Konfiguration hinzugefügter freier Tag',
  },
  es: {
    public: 'Festivo oficial',
    bank: 'Festivo bancario',
    school: 'Día sin clase local',
    optional: 'Día libre opcional',
    observance: 'Conmemoración',
    extra: 'Día libre añadido en la configuración',
  },
};

/** The description of a school holiday event. */
export const SCHOOL_EVENT_TEXT = {
  en: (zone) => `School holidays, ${zone}. Source: data.education.gouv.fr`,
  fr: (zone) => `Vacances scolaires, ${zone}. Source : data.education.gouv.fr`,
  de: (zone) => `Schulferien, ${zone}. Quelle: data.education.gouv.fr`,
  es: (zone) => `Vacaciones escolares, ${zone}. Fuente: data.education.gouv.fr`,
};

/** A problem of the configuration or of the school calendar, in a sentence. */
export const PROBLEM_TEXT = {
  en: {
    unknownCountry: (value) => `Unknown country "${value}": France is used instead.`,
    invalidSubdivision: (value) =>
      `Unknown subdivision "${value}": only the national holidays are used.`,
    invalidDate: (value) => `"${value}" is not a date (2026-05-15 or 12-24): it is ignored.`,
    schoolOutsideFrance: (value) =>
      `French school holidays only apply to France and its overseas territories, not to ${value}.`,
    schoolUnavailable: (value) => `The school calendar could not be read (${value}).`,
    syncFailed: (value) => `The calendars could not be sent to Gladys (${value}).`,
  },
  fr: {
    unknownCountry: (value) => `Pays inconnu « ${value} » : la France est utilisée à la place.`,
    invalidSubdivision: (value) =>
      `Subdivision inconnue « ${value} » : seuls les fériés nationaux sont utilisés.`,
    invalidDate: (value) => `« ${value} » n'est pas une date (2026-05-15 ou 12-24) : ignoré.`,
    schoolOutsideFrance: (value) =>
      `Les vacances scolaires françaises ne valent que pour la France et l'outre-mer, pas pour ${value}.`,
    schoolUnavailable: (value) => `Le calendrier scolaire n'a pas pu être lu (${value}).`,
    syncFailed: (value) => `Les calendriers n'ont pas pu être envoyés à Gladys (${value}).`,
  },
  de: {
    unknownCountry: (value) => `Unbekanntes Land „${value}“: Frankreich wird verwendet.`,
    invalidSubdivision: (value) =>
      `Unbekannte Region „${value}“: Nur die landesweiten Feiertage werden verwendet.`,
    invalidDate: (value) => `„${value}“ ist kein Datum (2026-05-15 oder 12-24): ignoriert.`,
    schoolOutsideFrance: (value) =>
      `Französische Schulferien gelten nur für Frankreich und seine Überseegebiete, nicht für ${value}.`,
    schoolUnavailable: (value) => `Der Schulkalender konnte nicht gelesen werden (${value}).`,
    syncFailed: (value) => `Die Kalender konnten nicht an Gladys gesendet werden (${value}).`,
  },
  es: {
    unknownCountry: (value) => `País desconocido «${value}»: se usa Francia en su lugar.`,
    invalidSubdivision: (value) =>
      `Subdivisión desconocida «${value}»: solo se usan los festivos nacionales.`,
    invalidDate: (value) => `«${value}» no es una fecha (2026-05-15 o 12-24): se ignora.`,
    schoolOutsideFrance: (value) =>
      `Las vacaciones escolares francesas solo valen para Francia y sus territorios de ultramar, no para ${value}.`,
    schoolUnavailable: (value) => `No se ha podido leer el calendario escolar (${value}).`,
    syncFailed: (value) => `No se han podido enviar los calendarios a Gladys (${value}).`,
  },
};

/** The report of "Check the configuration". */
export const CHECK_TEXT = {
  en: {
    country: (country, subdivision) =>
      `Holidays of ${country}${subdivision ? `, ${subdivision}` : ''}.`,
    types: (types) => `Days in the calendar: ${types}.`,
    next: (name, date, days) =>
      days === 0
        ? `Today is a holiday: ${name}.`
        : `Next holiday: ${name}, ${date} (in ${days} days).`,
    noHoliday: 'No holiday in the coming year.',
    school: (zone, until) => `School holidays (${zone}): known until ${until}.`,
    schoolWaiting: (zone) => `School holidays (${zone}): not read yet.`,
    schoolOff: 'School holidays: not followed.',
    users: (names) => `Calendars sent to: ${names}.`,
    noUser:
      'No user has enabled the integration yet: each user enables it in the "My calendars" block of this page.',
    share:
      'To use a calendar in your scenes, share it in "My calendars": a private calendar is invisible to scenes.',
    problems: 'To fix:',
    ok: 'Everything is fine.',
    codes: (country, codes) => `Subdivision codes of ${country}: ${codes}.`,
    noCodes: (country) => `${country} has no subdivision.`,
  },
  fr: {
    country: (country, subdivision) =>
      `Jours fériés : ${country}${subdivision ? `, ${subdivision}` : ''}.`,
    types: (types) => `Jours dans le calendrier : ${types}.`,
    next: (name, date, days) =>
      days === 0
        ? `Aujourd'hui est férié : ${name}.`
        : `Prochain férié : ${name}, ${date} (dans ${days} jours).`,
    noHoliday: "Aucun férié dans l'année qui vient.",
    school: (zone, until) => `Vacances scolaires (${zone}) : connues jusqu'au ${until}.`,
    schoolWaiting: (zone) => `Vacances scolaires (${zone}) : pas encore lues.`,
    schoolOff: 'Vacances scolaires : non suivies.',
    users: (names) => `Calendriers envoyés à : ${names}.`,
    noUser:
      "Aucun utilisateur n'a encore activé l'intégration : chacun l'active dans le bloc « Mes calendriers » de cette page.",
    share:
      'Pour utiliser un calendrier dans vos scènes, partagez-le dans « Mes calendriers » : un calendrier privé est invisible pour les scènes.',
    problems: 'À corriger :',
    ok: 'Tout est en ordre.',
    codes: (country, codes) => `Codes de subdivision (${country}) : ${codes}.`,
    noCodes: (country) => `${country} : aucune subdivision.`,
  },
  de: {
    country: (country, subdivision) =>
      `Feiertage: ${country}${subdivision ? `, ${subdivision}` : ''}.`,
    types: (types) => `Tage im Kalender: ${types}.`,
    next: (name, date, days) =>
      days === 0
        ? `Heute ist ein Feiertag: ${name}.`
        : `Nächster Feiertag: ${name}, ${date} (in ${days} Tagen).`,
    noHoliday: 'Kein Feiertag im kommenden Jahr.',
    school: (zone, until) => `Schulferien (${zone}): bekannt bis ${until}.`,
    schoolWaiting: (zone) => `Schulferien (${zone}): noch nicht gelesen.`,
    schoolOff: 'Schulferien: nicht verfolgt.',
    users: (names) => `Kalender gesendet an: ${names}.`,
    noUser:
      'Noch niemand hat die Integration aktiviert: Jede Person aktiviert sie im Block „Meine Kalender“ dieser Seite.',
    share:
      'Um einen Kalender in deinen Szenen zu nutzen, teile ihn unter „Meine Kalender“: Ein privater Kalender ist für Szenen unsichtbar.',
    problems: 'Zu beheben:',
    ok: 'Alles in Ordnung.',
    codes: (country, codes) => `Regionscodes (${country}): ${codes}.`,
    noCodes: (country) => `${country} hat keine Regionen.`,
  },
  es: {
    country: (country, subdivision) =>
      `Festivos de ${country}${subdivision ? `, ${subdivision}` : ''}.`,
    types: (types) => `Días en el calendario: ${types}.`,
    next: (name, date, days) =>
      days === 0
        ? `Hoy es festivo: ${name}.`
        : `Próximo festivo: ${name}, ${date} (dentro de ${days} días).`,
    noHoliday: 'Ningún festivo en el próximo año.',
    school: (zone, until) => `Vacaciones escolares (${zone}): conocidas hasta el ${until}.`,
    schoolWaiting: (zone) => `Vacaciones escolares (${zone}): aún no leídas.`,
    schoolOff: 'Vacaciones escolares: no seguidas.',
    users: (names) => `Calendarios enviados a: ${names}.`,
    noUser:
      'Ningún usuario ha activado aún la integración: cada uno la activa en el bloque «Mis calendarios» de esta página.',
    share:
      'Para usar un calendario en sus escenas, compártalo en «Mis calendarios»: un calendario privado es invisible para las escenas.',
    problems: 'Por corregir:',
    ok: 'Todo está en orden.',
    codes: (country, codes) => `Códigos de subdivisión (${country}): ${codes}.`,
    noCodes: (country) => `${country} no tiene subdivisiones.`,
  },
};

export const INIT_FAILED = {
  en: 'Initialization failed, check the integration logs.',
  fr: "L'initialisation a échoué, consultez les logs de l'intégration.",
  de: 'Initialisierung fehlgeschlagen, sieh dir die Protokolle der Integration an.',
  es: 'La inicialización ha fallado, consulte los registros de la integración.',
};

/** One text per language from a table of functions or strings. */
export function inEveryLanguage(table, pick) {
  return Object.fromEntries(
    Object.entries(table).map(([language, text]) => [language, pick(text)]),
  );
}
