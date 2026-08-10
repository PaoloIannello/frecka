# Teilen in FRECKA (COMM-001)

## Zweck und Geltungsbereich

COMM-001 stellt einen einzigen zentralen Adapter für das Teilen und lokale Speichern bereits erzeugter FRECKA-Ausgaben bereit. Der Adapter verbindet die bestehende Dokumentenengine, den öffentlichen Dokumentlink und den Exportkern mit den Fähigkeiten des jeweiligen Browsers. Er führt keine eigene Beleg-, Gutschein-, Kunden- oder Exportlogik ein.

Der Share-Service

- nimmt fertige Dateien oder einen fertigen öffentlichen Link entgegen;
- entscheidet ausschließlich über verfügbare Browser-Ausgabewege;
- öffnet, soweit unterstützt, den nativen Teilen-Dialog des Betriebssystems;
- kennt weder IndexedDB noch FRECKA-Snapshots oder fachliche Laufzeitobjekte;
- speichert keine Dateien, Links, Metadaten oder Freigabeergebnisse dauerhaft;
- ermittelt keine installierten Apps und bevorzugt kein bestimmtes Versandziel.

PDFs werden weiterhin ausschließlich von `FRECKA_DOCUMENTS` erzeugt. Exportdateien stammen weiterhin ausschließlich aus dem bestehenden Exportergebnis. Öffentliche Kundenlinks stammen ausschließlich aus `FRECKA_PUBLIC_DOCUMENTS`. Der Share-Service sammelt oder projiziert keine Geschäftsdaten ein zweites Mal.

## Zentrale API

`js/sharing.js` veröffentlicht den versionierten Dienst als `globalThis.FRECKA_SHARING`. Die öffentliche API für COMM-001 umfasst:

```text
createShareService(environment)
createFile(content, { name, type, lastModified })

canUseWebShare()
canShareFiles(files)
canShareUrl(url)

shareFiles(files, { title, text })
shareUrl(url, { title, text })
sharePreferred({ files, url, metadata, downloadFile })

downloadFallback(file)
```

`createShareService(environment)` ermöglicht deterministische Tests mit injiziertem Navigator, Dokument, URL-API, `File`-Konstruktor und Secure-Context-Zustand. Die produktive Instanz verwendet ausschließlich die entsprechenden Browserobjekte.

Die Methoden liefern ein kleines technisches Ergebnis, zum Beispiel:

```js
{ status: "shared", mode: "files" }
{ status: "cancelled", mode: "url" }
{ status: "unsupported", mode: "files" }
{ status: "downloaded", mode: "download" }
```

`shared` bedeutet nur, dass der Browser die Freigabe an das Betriebssystem oder ein gewähltes Ziel übergeben hat. Der Status bestätigt weder einen E-Mail-Versand noch die Zustellung einer Nachricht oder Datei.

## Feature Detection statt Plattformannahmen

Web Share ist nur in einem sicheren Kontext verfügbar. Produktive Deployments müssen deshalb über HTTPS ausgeliefert werden. Ein Browser darf `localhost` selbst als vertrauenswürdigen Entwicklungskontext behandeln; maßgeblich bleibt der tatsächliche Wert von `globalThis.isSecureContext`.

Für Dateifreigaben gelten alle folgenden Bedingungen:

1. Der Kontext ist sicher.
2. `navigator.share` ist eine Funktion.
3. `navigator.canShare` ist eine Funktion.
4. Die Auswahl ist nicht leer und besteht vollständig aus echten `File`-Objekten.
5. `navigator.canShare({ files })` bestätigt exakt diese Dateien.

An `canShare()` wird dabei ausschließlich `{ files }` übergeben. Titel oder Beschreibung dürfen die Prüfung der tatsächlichen Dateimenge nicht verfälschen. Eine positive Prüfung einer einzelnen Testdatei ist kein Nachweis dafür, dass ein konkretes PDF oder mehrere konkrete Exportdateien gemeinsam geteilt werden können.

Für einen öffentlichen Link wird eine gültige HTTP- oder HTTPS-URL verlangt. Wenn `navigator.canShare` existiert, wird der tatsächliche Link mit `{ url }` geprüft. Ältere Implementierungen mit `navigator.share`, aber ohne `navigator.canShare`, dürfen einen gültigen Link weiterhin anbieten. Dateifreigaben werden ohne `canShare` dagegen niemals angenommen.

Die normative Grundlage ist die [W3C Web Share Recommendation](https://www.w3.org/TR/web-share/). Praktische Browserregeln und Fehlerzustände sind bei [MDN zu `navigator.share()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) und [MDN zu `navigator.canShare()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare) beschrieben.

Die Anwendung wird als First-Party-Seite betrieben. Bei einer späteren Einbettung in einen fremden `iframe` müsste zusätzlich die Permissions Policy für `web-share` ausdrücklich freigegeben werden. FRECKA verwendet dafür keine User-Agent-Ausnahmen.

## Entscheidungsfolge für Beleg und Gutschein

Für normale Belege, Gutschein-Verkaufsbelege und Gutscheine gilt dieselbe Reihenfolge:

1. Die Dokumentenengine erzeugt das echte lokale PDF.
2. Der Share-Service erstellt daraus ein `File` mit dem bestehenden sicheren Dateinamen und `application/pdf`.
3. Bestätigt `canShareFiles([file])` dieses konkrete File, wird genau ein nativer File-Share gestartet.
4. Ist File-Sharing nicht verfügbar, wird nach Möglichkeit der echte öffentliche Kundenlink geteilt.
5. Ist auch URL-Sharing nicht verfügbar, wird genau dieses PDF lokal zum Speichern angeboten.

Kurzform:

```text
PDF-File
   ├─ exakt teilbar → nativer Teilen-Dialog mit PDF
   └─ nicht teilbar
        ├─ öffentliche URL teilbar → nativer Teilen-Dialog mit Link
        └─ nicht teilbar → lokaler PDF-Download
```

Der Link-Fallback muss ein öffentlicher, geräteübergreifender Kundenlink sein. Der interne Verwaltungslink `#/receipt/<id>` beziehungsweise `#/voucher/<referenz>` ist kein zulässiger Ersatz, weil er die lokalen IndexedDB-Daten eines anderen Geräts nicht auflösen kann.

Ein Gutschein-Verkaufsbeleg bleibt in diesem Ablauf ein Beleg. Er verwendet dieselbe Belegprojektion, PDF-Erzeugung und Share-Entscheidung wie andere abgeschlossene Belege. Gutschein und Verkaufsbeleg bleiben dennoch zwei getrennte Dokumente mit jeweils eigenem File und öffentlichem Link.

## Transient Activation und Vorbereitung

`navigator.share()` darf nur aus einer echten, noch gültigen Nutzeraktion heraus aufgerufen werden. Eine lang laufende PDF- oder Payload-Erzeugung zwischen Antippen und Share-Aufruf kann diese sogenannte Transient Activation verbrauchen oder ablaufen lassen.

FRECKA bereitet deshalb öffentliche Dokumentausgabe und PDF nach Möglichkeit bereits im Arbeitsspeicher vor:

- Die Unternehmeransicht startet die Vorbereitung für das aktuell dargestellte Dokument.
- Der öffentliche Viewer erzeugt sein PDF, bevor die Aktion „Teilen“ freigeschaltet wird.
- Der Cache enthält nur laufzeitbasierte Promises beziehungsweise Dateien und wird nicht persistiert.
- Ein fehlgeschlagener Vorbereitungslauf darf den Cache nicht dauerhaft blockieren.

Die eigentliche Freigabe bleibt immer an den erneuten oder aktuellen echten Nutzerklick gebunden. FRECKA löst keinen Teilen-Dialog automatisch beim Öffnen einer Seite aus.

## Abbruch, Fehler und genau ein Share-Aufruf

Ein Share-Vorgang darf pro Nutzeraktion höchstens einmal `navigator.share()` ausführen. Der Browser verbraucht die Nutzeraktivierung bereits beim Aufruf; ein anschließender zweiter Share-Versuch wäre unzuverlässig und könnte einen weiteren, unerwarteten Dialog erzeugen.

Die Konsequenzen sind verbindlich:

- Die Entscheidung zwischen File, URL und Download fällt vor dem Share-Aufruf durch Feature Detection.
- Schlägt ein bereits gestarteter File-Share technisch fehl, startet FRECKA nicht automatisch einen URL-Share.
- `AbortError` bedeutet, dass der Nutzer abgebrochen hat oder kein Ziel gewählt wurde. Das ist kein Produktfehler.
- Nach `AbortError` erfolgt weder ein Download noch ein zweiter Share-Aufruf.
- `NotAllowedError`, `InvalidStateError`, `TypeError` und `DataError` werden in kurze verständliche Fehlermeldungen übersetzt.
- Eine positive `canShare()`-Prüfung ist keine Zustellgarantie.
- Die Oberfläche formuliert deshalb höchstens, dass der Teilen-Dialog an das Betriebssystem übergeben wurde. Sie behauptet niemals „E-Mail versendet“, „WhatsApp gesendet“ oder eine bestätigte Zustellung.

Mehrfaches schnelles Antippen wird zusätzlich auf UI-Ebene gegen parallele Ausgaben desselben Dokuments abgesichert.

## Export und Steuerberatung

Der Steuerberaterexport verwendet ein bereits vollständig im Arbeitsspeicher erzeugtes ZIP-Gesamtpaket aus `FRECKA_EXPORT_PACKAGE`. Der Share-Service liest dafür keine Stores, erzeugt keine PDFs und baut keinen zweiten Exportdatensatz auf. Er prüft und teilt genau eine fertige `application/zip`-Datei. Ist File-Sharing nicht verfügbar, wird genau dieses ZIP lokal gespeichert; für Exporte gibt es weiterhin keinen öffentlichen URL-Fallback.

Der rückwärtskompatible Exporttyp `Eigene Daten` bleibt ein Satz einzelner Dateien. Vor seinem Teilen wählt der Nutzer die Dateien ausdrücklich aus. Die sinnvolle Vorauswahl umfasst:

- `Belege.csv`
- `Belegpositionen.csv`
- `Gutscheine.csv`
- `Gutschein-Historie.csv`
- `Export-Info.txt`

`Kunden.csv` erscheint nur, wenn die Datei im zuvor bewusst konfigurierten Export enthalten ist. Sie bleibt im Teilen-Dialog zunächst abgewählt und wird ausschließlich nach einer weiteren ausdrücklichen Auswahl geteilt.

Die ausgewählten Inhalte werden als echte Files vorbereitet. CSV-Dateien verwenden `text/csv`, die Exportinformation `text/plain`; ihr bestehender Inhalt einschließlich UTF-8-BOM bleibt unverändert. Danach wird ausschließlich die komplette tatsächliche Auswahl geprüft:

```js
navigator.canShare({ files: selectedFiles })
```

Nur bei einem positiven Ergebnis werden alle ausgewählten Dateien in genau einem `navigator.share()`-Aufruf übergeben. FRECKA teilt eine abgelehnte Mehrfachauswahl nicht still in mehrere Share-Vorgänge auf und behauptet keinen Erfolg. Stattdessen erklärt die Oberfläche die Browsergrenze und führt zum bestehenden lokalen Bereich „Auf Gerät speichern“, in dem die Dateien einzeln gespeichert werden können.

`Kunden.csv` ist nie Bestandteil des Steuerberater-ZIPs. „An Steuerberatung senden“ bedeutet weder beim ZIP noch bei `Eigene Daten` eine automatische E-Mail oder gespeicherte Versandautomatik. Das tatsächliche Ziel wählt der Nutzer ausschließlich im nativen Teilen-Dialog.

## Plattform- und Fallbackmatrix

Die Matrix beschreibt keine fest zugesicherten Browserfähigkeiten. Jede Entscheidung erfolgt zur Laufzeit anhand der tatsächlichen Dateien und Browserfunktionen.

| Umgebung | Bevorzugter Weg | Zweiter Weg | Letzter Fallback |
| --- | --- | --- | --- |
| iPhone/iPad, Safari oder installierte PWA | PDF-File, wenn exakt bestätigt | öffentlicher Kundenlink | PDF lokal speichern |
| Android, Chrome oder installierte PWA | PDF-File, wenn exakt bestätigt | öffentlicher Kundenlink | PDF lokal speichern |
| Desktop-Browser mit File-Share | PDF-File, wenn exakt bestätigt | öffentlicher Kundenlink | Download |
| Desktop-Browser nur mit URL-Share | öffentlicher Kundenlink | – | Download |
| Browser ohne Web Share API | – | – | Download |
| Unsicherer HTTP-Kontext | – | – | Download |
| Steuerberater-ZIP mit bestätigtem File-Share | genau ein ZIP in einem Share | – | lokales Speichern desselben ZIP |
| `Eigene Daten` mit bestätigter exakter Dateimenge | alle ausgewählten Files in einem Share | – | – |
| `Eigene Daten` ohne bestätigtes Multiple-File-Sharing | – | – | bestehendes einzelnes lokales Speichern |

FRECKA kann und darf nicht feststellen, ob Mail, Nachrichten, AirDrop, Quick Share, WhatsApp oder ein anderes Ziel installiert ist. Welche Ziele angeboten werden, entscheidet ausschließlich Betriebssystem und Browser.

## Datenschutz und Offline-First

Der Share-Service erhält nur die Ausgabe, die der Nutzer bewusst teilen oder speichern möchte. Er

- lädt keine Datei zu FRECKA oder einem anderen Server hoch;
- sendet keine Geschäftsdaten an eine API;
- schreibt keine Share-Daten in IndexedDB, `localStorage` oder `sessionStorage`;
- protokolliert weder Dateiinhalt noch öffentlichen Link;
- ergänzt keine Kundenkontakte zu Titel oder Beschreibung;
- verwendet für den URL-Fallback nur die separat datensparsam erzeugte öffentliche Projektion.

Mit dem nativen Teilen-Dialog verlässt die ausgewählte Ausgabe auf ausdrückliche Nutzeraktion hin die FRECKA-Oberfläche. Ab diesem Zeitpunkt gelten Verhalten und Datenschutz des gewählten Zielsystems. FRECKA kann den weiteren Transport oder eine Zustellung nicht kontrollieren oder bestätigen.

## Prüfungen und Release-Gate

Automatisierte Browser-Smoke-Tests prüfen mindestens:

- sichere und unsichere Kontexte;
- tatsächliche PDF-Files und korrekte MIME-Typen;
- `canShare` mit exakt einer sowie mehreren konkreten Dateien;
- File-, URL- und Downloadentscheidung;
- Abbruch ohne Fehler oder Fallback;
- genau einen Share-Aufruf je Nutzeraktion;
- Multiple-File-Fallback beim Export;
- bewusst abgewählte `Kunden.csv`;
- unveränderte Dokumentmodelle und Exportdateien;
- keine neue Persistenz.

Automatisierung kann den Betriebssystemdialog und installierte Ziele nicht verlässlich bedienen. Deshalb ist die reale Zielgeräteprüfung ein Release-Gate für COMM-001:

- aktuelles iPhone/iPad in Safari und als installierte PWA;
- aktuelles Android-Gerät in Chrome und als installierte PWA;
- mindestens ein Desktop-Browser mit und einer ohne verfügbare File-Freigabe;
- Teilen eines Beleg-PDFs, Gutschein-PDFs und Gutschein-Verkaufsbelegs;
- Abbruch des Teilen-Dialogs;
- Teilen einer bestätigten Export-Mehrfachauswahl;
- lokaler Speichern-Fallback;
- HTTPS-Testdeployment sowie Localhost-Entwicklung.

Eine COMM-001-Freigabe darf nicht allein aus einer positiven `canShare()`-Prüfung oder automatisierten Browser-Mocks abgeleitet werden.

## Bekannte Grenzen

- Browser und Betriebssystem entscheiden, welche Share-Ziele verfügbar sind und welche Metadaten sie übernehmen.
- Einzelne Share-Ziele können trotz positiver Browserprüfung bestimmte Dateien ablehnen.
- Das Share-Promise liefert keine verlässliche Zustell- oder Lesebestätigung.
- Unsichere Deployments besitzen bewusst nur den lokalen Speichern-Fallback.
- Das Steuerberater-ZIP kann je nach Anzahl und Umfang der Belege mehr Arbeitsspeicher benötigen; eine reale Abnahme mit repräsentativen großen Zeiträumen bleibt erforderlich.
- COMM-001 implementiert weder automatische E-Mail noch SMTP/API-Versand, Versandhistorie oder zentrale Belegablage.
