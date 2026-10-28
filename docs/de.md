# Holidays Calendar (Feiertage und Schulferien)

Feiertage und Schulferien erscheinen direkt im **Kalender von Gladys**, neben deinen anderen Kalendern.
Deine Szenen nutzen sie dann über die Kalenderbausteine von Gladys: Wecker, Heizung und Rollläden
verhalten sich an einem Feiertag oder in den Ferien anders.

- **Feiertage aus etwa 200 Ländern** und ihren Regionen (Elsass-Mosel, deutsche Bundesländer, Schweizer
  Kantone, kanadische Provinzen, US-Bundesstaaten…), **offline** auf deinem Gladys berechnet: ohne Konto,
  ohne Netzwerk.
- **Französische Schulferien** deiner Zone (optional), aus den offenen Daten des Bildungsministeriums, in
  einem zweiten Kalender.
- Deine **Brückentage und Betriebsferien** im Feiertagskalender ergänzt, und Feiertage, die du nicht
  sehen willst, weggelassen.

> Mit der automatischen Testsuite getestet, noch nicht auf vielen echten Gladys-Installationen:
> Rückmeldungen sind im Gladys-Forum oder in den GitHub-Issues willkommen.

## Was du brauchst

- Gladys Assistant **5.2.0** oder neuer (Kalender-Integrationen gibt es ab dieser Version).
- Sonst nichts: kein Konto, kein API-Schlüssel, keine Hardware. Nur die französischen Schulferien
  brauchen einmal am Tag Internet.

## Konfiguration

Installiere die Integration (**Integrationen → Von GitHub installieren**, Adresse
`https://github.com/prohand/gladys-calendar-holidays`), öffne den Tab **Konfiguration**, fülle die Felder
unten aus und speichere. Diese Einstellungen gelten für den ganzen Haushalt.

### Land und Region

- **Land**: die Feiertage, denen gefolgt wird. Französischsprachige Länder stehen vorne, dann die anderen
  alphabetisch (auf Englisch).
- **Region**: optional, für eine Region mit eigenen Feiertagen. Beispiele: `BY` für Bayern, `BW` für
  Baden-Württemberg, `67` für das Elsass, `QC` für Québec. Manche Regionen haben Unterregionen: `BY-KATH`
  für die katholischen Gemeinden Bayerns (15. August). Die Schaltfläche **Konfiguration prüfen** zeigt
  die Codes des Landes.
- **Tage im Kalender**: standardmäßig nur gesetzliche Feiertage. Du kannst Bankfeiertage, lokale
  schulfreie Tage, optionale Tage und Gedenktage (Muttertag, Pfingstsonntag…) hinzufügen.

### Zusätzliche freie Tage und weggelassene Feiertage

- **Zusätzliche freie Tage**: Brückentage oder Betriebsferien, im Feiertagskalender ergänzt, durch Kommas
  getrennt: `2026-05-15` für ein Datum, `12-24` für jedes Jahr, mit optionalem Namen nach `=`:
  `2026-05-15=Brückentag, 12-24=Heiligabend`. Ohne Namen heißt der Termin „Freier Tag“.
- **Weggelassene Feiertage**: Feiertage, die nicht in den Kalender kommen, durch Kommas getrennt. Ein Name
  in beliebiger Sprache (`Pfingstmontag`), ein Datum (`2027-05-17`) oder ein Tag jedes Jahres (`12-26`).

### Französische Schulferien

Für Frankreich und seine Überseegebiete. Wähle deine **Zone**: A, B, C, Korsika, Guadeloupe,
Französisch-Guayana, Martinique, Mayotte, Réunion oder Saint-Pierre und Miquelon. Die Ferien der
Schülerinnen und Schüler werden einmal am Tag von data.education.gouv.fr gelesen und aufbewahrt: Ein
Internetausfall ändert nichts an den schon bekannten Tagen. Lass **Keine** stehen, damit die Integration
ganz offline bleibt.

## Kalender aktivieren („Meine Kalender“)

In Gladys gehört ein Kalender einer Person. Jede Person, die die Kalender möchte, öffnet die Seite der
Integration und klickt im Block **Meine Kalender** auf **Für mich aktivieren**. Diese Person bekommt dann:

- **Feiertage (Frankreich)** (rot): ein ganztägiger Termin pro Feiertag, von Januar dieses Jahres bis
  Dezember des nächsten Jahres;
- **Schulferien (Zone C)** (grün), wenn eine Zone gewählt ist: ein Termin pro Ferienzeit, vom ersten
  freien Tag bis zum Vortag des Schulbeginns.

Die Namen der Kalender und der Feiertage folgen der Sprache jeder Person (Englisch, Französisch, Deutsch
oder Spanisch). Unter jedem Kalender gibt es zwei Schalter:

- **Diesen Kalender synchronisieren**: aus, wird der Kalender geleert und nicht mehr befüllt;
- **Mit dem Haushalt teilen**: siehe unten.

**Deaktivieren und meine Kalender löschen** entfernt die Kalender dieser Person; erneutes Aktivieren
erstellt sie wieder.

## Kalender in Szenen nutzen

Gladys zeigt Szenen nur **geteilte** Kalender: Schalte **Mit dem Haushalt teilen** für den gewünschten
Kalender ein (eine Person im Haushalt genügt). Dann im Szeneneditor:

- Auslöser **Kalenderereignis steht bevor**: zum Beispiel zu Beginn eines beliebigen Termins im Kalender
  „Feiertage“ oder am Vortag um 20 Uhr;
- Aktion **Bedingung für Kalenderereignisse**: „nur fortfahren, wenn in Schulferien ein Termin läuft“,
  damit der Wecker der Kinder in den Ferien nicht klingelt;
- Aktion **Kalenderereignisse abrufen**: um den nächsten Feiertag in einer Nachricht anzusagen.

Beispiel: Eine Szene „Wecken“ um 7 Uhr an Wochentagen mit der Bedingung „kein laufender Termin in
Feiertage“ klingelt am 1. Weihnachtstag nicht.

## Was gesendet wird, und wann

- Beim Start, wenn Gladys nach einem Neustart zurückkommt, und bei jedem Speichern der Konfiguration wird
  alles neu gesendet.
- Wenn jemand die Integration aktiviert oder einen Kalender wieder einschaltet, werden die Kalender
  dieser Person neu gesendet.
- Alle 15 Minuten prüft die Integration, was sich geändert hat (Schulkalender neu gelesen, neues Jahr),
  und sendet nur das. Am 1. Januar kommt das übernächste Jahr dazu; vergangene Jahre bleiben als Verlauf
  im Kalender.
- Einen Termin, den du von Hand in diesen Kalendern anlegst, löscht die Integration nie.

## Fehlerbehebung

- **Ich sehe die Kalender nicht**: Aktiviere die Integration für dich unter **Meine Kalender** und lade
  die Kalenderansicht neu.
- **Die Szene reagiert nicht**: Der Kalender muss **mit dem Haushalt geteilt** sein.
- **Ein Feiertag meiner Region fehlt**: Trage die **Region** ein. **Konfiguration prüfen** zeigt die
  Codes und meldet einen unbekannten Code.
- **Keine Schulferien**: Prüfe die Zone und den Internetzugang von Gladys. **Konfiguration prüfen** sagt,
  bis wann die Ferien bekannt sind und was zu beheben ist.
- Der Status der Integration zeigt einen Fehler, wenn Gladys eine Übertragung ablehnt; die Integration
  versucht es eine Viertelstunde später von selbst erneut.

## Grenzen

- Ein Land pro Installation, dasselbe für den ganzen Haushalt.
- Feiertage, die eine Regierung spät beschließt, kommen mit einem Update von date-holidays; das Feld
  **Zusätzliche freie Tage** überbrückt die Zeit. Mondfeiertage können um einen Tag von der offiziellen
  Ankündigung abweichen.
- Schulferien: nur für Schülerinnen und Schüler; Neukaledonien, Französisch-Polynesien und Wallis und
  Futuna werden nicht angeboten. Über das vom Ministerium Veröffentlichte hinaus wird nichts geraten.
- Jede Person hat eine eigene Kopie der Kalender: Teilen zwei Personen sie, sehen Szenen jeden Feiertag
  doppelt.

## Danksagung

- [date-holidays](https://github.com/commenthol/date-holidays) (Code ISC, Daten CC BY 3.0): die Feiertage
  aller Länder.
- [Calendrier scolaire](https://data.education.gouv.fr/explore/dataset/fr-en-calendrier-scolaire/) des
  französischen Bildungsministeriums (Licence Ouverte 2.0).
- [gladys-holidays](https://github.com/guim31/gladys-holidays) (Apache-2.0): Die Berechnung der Feiertage
  und das Lesen des Schulkalenders stammen aus dieser Integration.
