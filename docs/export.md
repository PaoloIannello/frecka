# FRECKA-Exportkern Version 1

**Stand:** USER-001 auf Basis EXPORT-003
**Datenbankschema:** unverändert Version 5  
**Exportformat:** `FRECKA_EXPORT`, Version 1

## Zweck und Abgrenzung

Der Exportkern erzeugt fachlich nachvollziehbare Dateien für Steuerberatung und die eigene Weiterverarbeitung. Er ist keine bestätigte DATEV-Importschnittstelle und ersetzt weder das verschlüsselte FRECKA-Backup noch eine steuerliche Prüfung.

Der Steuerberaterexport wird als ein einziges lokales ZIP-Gesamtpaket mit CSV-Dateien und Beleg-PDFs erzeugt. Mailversand, Synology-Ablage, neue Gutscheinsteuerlogik, TSE und Fiskalisierung sind nicht Bestandteil dieses Blocks. Der Export schreibt keine Geschäftsdaten und führt keine neue Persistenz ein.

## Verbindliche Architektur

`js/app.js` fordert genau einmal über `currentTenantSnapshot()` den vorhandenen zentralen Tenant-Snapshot an. Diese Funktion verwendet ausschließlich `exportTenantSnapshot()` aus `js/persistence.js`; damit gelten dieselbe Store-Sammlung, Mandantengrenze und Validierung wie beim Backup.

`js/export.js` ist eine reine Projektion:

1. Es erhält den bereits geprüften Tenant-Snapshot.
2. Es wendet Zeitraum und Geschäftsbereich auf Belege, Gutscheine und Historieneinträge an.
3. Es erzeugt eine gemeinsame, unveränderliche Exportprojektion.
4. CSV, Übersicht, Beleg-PDFs und ZIP-Adapter verwenden ausschließlich diese Projektion.

Das Modul liest weder IndexedDB noch Laufzeitlisten der Oberfläche. Es kennt keine Dialoge, Routen oder gerenderten Elemente. Eine zweite Datensammlung und parallele Fachlogik entstehen dadurch nicht.

Vor jeder Projektion wird die zentrale Persistenz-Invariante für Gutschein und Verkaufsbeleg erneut auf dem tatsächlich übergebenen Snapshot ausgeführt. Der Export akzeptiert einen Gutscheinverkauf nur, wenn stabile Receipt-ID, Belegnummer, Belegart `voucher-sale` und `voucherReference` in beiden Richtungen exakt zusammenpassen. Fehlende oder widersprüchliche Gegenobjekte stoppen den gesamten Export mit einer verständlichen Meldung. Der Export ergänzt, errät oder rekonstruiert keinen Verkaufsbeleg.

Die öffentlichen Kernfunktionen sind:

- `createExportProjection(snapshot, options)` für die formatneutrale Projektion;
- `createExportFiles(snapshotOrProjection, options)` für den bisherigen Einzeldateisatz;
- `createSummaryFile(snapshotOrProjection, options)` für `Übersicht.csv`;
- `FRECKA_EXPORT_PACKAGE.createTaxAdvisorPackage(snapshotOrProjection, options)` für den reinen ZIP-Ausgabeadapter;
- `resolvePeriod(period, referenceDate)` für reproduzierbare Monatsgrenzen.

Der Paketadapter in `js/export-package.js` filtert nicht erneut. Er erhält von derselben Projektion die bereits ausgewählten Belegdatensätze und reicht sie nacheinander an die zentrale Dokumentenengine weiter. Mail und eine spätere kundeneigene Ablage müssen dasselbe fertige Paket verwenden; sie dürfen keine eigenen Sammelroutinen über IndexedDB oder UI-Zustände einführen.

## Filtersemantik

Unterstützte Zeiträume:

- aktueller Monat;
- letzter Monat;
- eigener, beidseitig eingeschlossener Zeitraum.

Für Belege zählt das gespeicherte lokale Belegdatum, für Gutscheine das Ausstellungsdatum und für die Gutscheinhistorie der Zeitpunkt des einzelnen Ereignisses. Deshalb erscheint eine Einlösung im gewählten Zeitraum auch dann in `Gutschein-Historie.csv`, wenn der Gutschein früher verkauft wurde. `Gutscheine.csv` enthält dagegen die im Zeitraum ausgestellten Gutscheine.

Der Geschäftsbereich wird über die stabile ID gefiltert. Standard für Steuerberatung sind alle Geschäftsbereiche gemeinsam. Wird ein einzelner Bereich gewählt, gilt dieselbe Auswahl ausnahmslos für CSV-Zeilen, Übersicht und Beleg-PDFs. Ausgegeben wird vorrangig die unveränderliche Geschäftsbereichsbezeichnung des jeweiligen Snapshots. Änderungen an heutigen Einstellungen schreiben alte Exporteinträge dadurch nicht um.

## Exporttypen und Datenschutz

`Steuerberatung` erzeugt keine Kundenstammdatendatei. Insbesondere enthält das ZIP niemals `Kunden.csv`. Namen und Anschriften, die bereits unveränderlicher Bestandteil eines Belegs, Gutscheins oder Beleg-PDFs sind, bleiben als fachlicher Dokumentinhalt erhalten.

`Eigene Daten` bietet `Kunden.csv` als ausdrückliche, standardmäßig nicht aktivierte Option an. Enthalten sind ausschließlich Kunden, die in den gefilterten Belegen, Gutscheinen oder relevanten Gutscheinhistorien referenziert werden. Nicht zugeordnete Kunden werden nicht vorsorglich mit exportiert.

USER-001 ergänzt ausschließlich den strukturierten Projektionskontext `activeUser` für den Exporttyp `Eigene Daten`; `Export-Info.txt` nennt dort den Anzeigenamen des aktiven Benutzers. Im Steuerberaterexport ist `activeUser` ausdrücklich `null`. Es entsteht keine Benutzer-CSV und der bestehende Steuerberater-Dateisatz bleibt unverändert.

LICENSE-001 ergänzt entsprechend `license` nur für `Eigene Daten`. `Export-Info.txt` nennt dort Lizenz-ID, Geräte-ID, lokalen Aktivierungszeitpunkt und letzte lokale Prüfung. Im Steuerberaterexport ist `license` ausdrücklich `null`; CSV-Dateien, ZIP-Struktur und Beleg-PDFs enthalten keine Lizenz- oder Gerätedaten.

Alle Dateien entstehen im Arbeitsspeicher des Endgeräts. Die Anwendung überträgt weder Snapshot noch Exportdateien an FRECKA oder einen anderen Server. Ein Download ist eine bewusste Nutzeraktion; ab diesem Zeitpunkt ist der Nutzer für den gewählten Speicherort verantwortlich.

## Steuerberaterpaket

Ein vollständiger Monatszeitraum erzeugt beispielsweise:

```text
FRECKA-Steuerberatung-2030-01.zip
└── FRECKA-Steuerberatung-2030-01/
    ├── Übersicht.csv
    ├── Belege.csv
    ├── Belegpositionen.csv
    ├── Gutscheine.csv
    ├── Gutschein-Historie.csv
    ├── Export-Info.txt
    └── Belege/
        ├── 2030-000132.pdf
        ├── GS-2030-000101.pdf
        └── ST-2030-000101.pdf
```

Eigene oder bereichsübergreifende Zeiträume verwenden `YYYY-MM-DD_bis_YYYY-MM-DD`; ein einzelner Geschäftsbereich wird zusätzlich als sicherer Dateinamensbestandteil ausgewiesen. Jedes Beleg-PDF wird aus der unveränderten gespeicherten Belegnummer benannt. Doppelte resultierende Dateinamen führen zu einem klaren Fehler, nicht zu einem Überschreiben.

Normale Belege, offene Belege, Stornos, Gutschriften und Gutscheinverkaufsbelege werden durch `FRECKA_DOCUMENTS` als echte PDFs erzeugt. Sie verwenden denselben gespeicherten Snapshot und dieselbe PDF-Engine wie die Belegansicht. PDF-Dateien werden weder in IndexedDB noch dauerhaft im Exportmodul gespeichert.

## Dateien der Version 1

### `Übersicht.csv`

Spalten: Zeilenart, Geschäftsbereich, Steuersatz, Anzahl Belege, Netto, Steuer und Brutto.

Je Geschäftsbereich erscheinen zuerst die gespeicherten Steuersatzgruppen, danach eine Bereichssumme. Abschließend folgt die Gesamtsumme aller gefilterten Bereiche. `Anzahl Belege` zählt innerhalb einer Zeile eindeutige Belege; ein Beleg mit mehreren gespeicherten Steuersätzen kann folglich in mehreren Steuersatzzeilen vorkommen, in der Bereichs- und Gesamtsumme aber nur einmal.

Bereichs- und Gesamtsummen verwenden ausschließlich die gespeicherten Netto-, Steuer- und Bruttowerte des Belegs. Steuersatzzeilen verwenden vorhandene gespeicherte Steuergruppen, ersatzweise die bereits gespeicherten Positionswerte. Fehlt eine fachlich ausweisbare Gruppe, lautet der Steuersatz `Nicht ausgewiesen`. Gutscheine erhalten dadurch keine neu erfundene Einzweck-/Mehrzweck- oder Steuerbehandlung.

### `Belege.csv`

Spalten: Belegnummer, Belegart, Datum, Uhrzeit, Geschäftsbereich, Kunde, Netto, Steuer, Brutto, Zahlungsstatus, Zahlungsart, Storno und Gutschrift.

Normale Belege, Gutscheinverkaufsbelege, offene Zahlungen, Stornobelege und Gutschriften bleiben über eigene skalare Kennzeichnungen unterscheidbar.

### `Belegpositionen.csv`

Spalten: Belegnummer, Position, Bezeichnung, Typ, Menge, Einzelpreis, Rabatt, Steuersatz, Netto, Steuer und Brutto.

Jede Position besitzt genau eine Zeile. Es werden keine Positionslisten in eine Zelle geschrieben.

### `Gutscheine.csv`

Spalten: Code, Status, Ausstellungsdatum, Ursprungswert, Restwert, Verkaufsbeleg, Geschäftsbereich und Kunde.

### `Gutschein-Historie.csv`

Spalten: Code, Ereignis, Datum, Uhrzeit, Betrag, Restwert danach und Belegnummer.

Jedes Ereignis besitzt eine eigene chronologisch sortierte Zeile. Unterstützte Ereignisse sind Verkauf, teilweise Einlösung, vollständige Einlösung, Storno und Gutschrift.

### `Kunden.csv`

Nur bei `Eigene Daten` und ausdrücklicher Auswahl. Spalten: Kunden-ID, Status, Vorname, Nachname, Firma, Telefon, Mobil, E-Mail, Straße, PLZ, Ort, Erstellt und Aktualisiert.

### `Export-Info.txt`

Dokumentiert FRECKA-Version, Exportdatum, Exporttyp, Zeitraum, Anzahl Belege, Anzahl Gutscheine, Geschäftsbereichsfilter, Datums-/Zeitformat und CSV-Regeln. Die Datei enthält ausdrücklich:

> Dies ist ein FRECKA-Export.  
> Keine bestätigte DATEV-Importschnittstelle.

## CSV-Vertrag

- Zeichencodierung: UTF-8 mit BOM;
- Trennzeichen: Semikolon;
- Zeilenende: CRLF;
- Datumsformat: `TT.MM.JJJJ`;
- Uhrzeitformat: `HH:mm`;
- Geldbeträge: zwei Nachkommastellen mit deutschem Dezimalkomma;
- Steuersätze: zwei Nachkommastellen mit deutschem Dezimalkomma;
- jede Zelle wird in doppelte Anführungszeichen gesetzt;
- enthaltene Anführungszeichen werden verdoppelt;
- Zeilenumbrüche und Semikolons innerhalb einer Zelle bleiben korrekt eingeschlossen;
- Freitextwerte, deren erstes relevantes Zeichen `=`, `+`, `-` oder `@` ist, erhalten vor dem CSV-Escaping ein führendes Apostroph als Schutz gegen CSV-/Formel-Injection. Von FRECKA selbst formatierte negative Dezimalzahlen bleiben als Zahlen auswertbar; nichtnumerische Minuswerte werden weiterhin geschützt.

Die fachlichen Geldwerte stammen vorrangig aus den ganzzahligen Centfeldern der Persistenz. Dezimalfelder dienen nur als Kompatibilitätsfallback.

## ZIP-Entscheidung und Vendor-Grenze

Browser stellen keinen vollständigen nativen ZIP-Writer bereit. Nach ausdrücklicher Freigabe verwendet FRECKA deshalb ausschließlich den lokal vendorten Browser-Build von JSZip `3.10.1`. Er wird vor `js/export-package.js` geladen und ist weder CDN-, npm-Runtime- noch serverabhängig. Version, Lizenz und SHA-256-Prüfsummen stehen in `vendor/README.md`; der vollständige Upstream-Lizenztext wird mit dem Laufzeitartefakt ausgeliefert.

`createExportFiles()` bleibt unverändert als rückwärtskompatible Einzeldatei-API erhalten. Der Exporttyp `Eigene Daten` nutzt ihn weiterhin direkt. Nur `Steuerberatung` ergänzt `Übersicht.csv` und die Beleg-PDFs und verpackt alles in genau ein ZIP.

## Fehlerverhalten

- Fehlender oder unvollständiger Snapshot: Export wird abgelehnt.
- Fehlender, verwaister oder widersprüchlich referenzierter Gutscheinverkaufsbeleg: Export wird vor CSV-, PDF- und ZIP-Erzeugung vollständig abgelehnt.
- Ungültiger oder umgekehrter Zeitraum: Export wird abgelehnt.
- Unbekannter Geschäftsbereich: Export wird abgelehnt.
- Fehlende oder falsche lokale JSZip-Version: Paketexport wird abgelehnt.
- Fehlgeschlagenes Beleg-PDF oder doppelter PDF-Dateiname: Das gesamte Paket wird abgelehnt; es gibt kein Teilpaket.
- Es gibt keine stillen Fehler und keine teilweise veränderten Geschäftsdaten, weil der Export ausschließlich liest.
- Auch leere Ergebnisse erzeugen die dokumentierten Dateien mit Kopfzeilen und `Export-Info.txt`.

## Prüfungen

`tests/persistence-smoke.html` prüft Exportprojektion und Paketadapter unter anderem durch folgende Fälle:

- aktuelle, letzte und eigene Zeiträume;
- Geschäftsbereichsfilter;
- offene Zahlung, Storno und Gutschrift;
- Gutscheinverkauf und periodengerechte Historie;
- getrennte Dateien und chronologische Einzelzeilen;
- UTF-8-BOM, Semikolon, Umlaute, Anführungszeichen und Centwerte;
- CSV-Injection-Schutz;
- datensparsame Kundendatei;
- Export-Info und DATEV-Abgrenzung;
- unveränderten Eingangssnapshot und unverändertes Datenbankschema;
- Bereichs-, Steuersatz- und Gesamtsummen in `Übersicht.csv`;
- ein lesbares ZIP mit CRC-Prüfung und exakt dokumentierter Struktur;
- echte PDF-Signaturen für normale Belege, Stornos, Gutschriften und Gutscheinverkaufsbelege;
- identische Zeitraum-/Geschäftsbereichsauswahl für CSV und PDFs;
- Ausschluss von `Kunden.csv` aus dem Steuerberaterpaket;
- harter Export-Stopp bei fehlendem Gutscheinverkaufsbeleg ohne Snapshot-Mutation oder Export-Rekonstruktion;
- atomarer Gutscheinverkauf über Reload, validierten Tenant-Snapshot, Exportpaket und echtes PDF.

Die Produktoberfläche wurde zusätzlich bei 320 px und 390 px ohne horizontalen Überlauf sowie ohne Konsolenfehler geprüft.
