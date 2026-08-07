# FRECKA-Exportkern Version 1

**Stand:** EXPORT-001  
**Datenbankschema:** unverändert Version 5  
**Exportformat:** `FRECKA_EXPORT`, Version 1

## Zweck und Abgrenzung

Der Exportkern erzeugt fachlich nachvollziehbare Dateien für Steuerberatung und die eigene Weiterverarbeitung. Er ist keine bestätigte DATEV-Importschnittstelle und ersetzt weder das verschlüsselte FRECKA-Backup noch eine steuerliche Prüfung.

Nicht Bestandteil dieses Blocks sind ZIP, PDF, Mailversand, Synology-Ablage, QR-Grafiken, TSE oder Fiskalisierung. Der Export schreibt keine Geschäftsdaten und führt keine neue Persistenz ein.

## Verbindliche Architektur

`js/app.js` fordert genau einmal über `currentTenantSnapshot()` den vorhandenen zentralen Tenant-Snapshot an. Diese Funktion verwendet ausschließlich `exportTenantSnapshot()` aus `js/persistence.js`; damit gelten dieselbe Store-Sammlung, Mandantengrenze und Validierung wie beim Backup.

`js/export.js` ist eine reine Projektion:

1. Es erhält den bereits geprüften Tenant-Snapshot.
2. Es wendet Zeitraum und Geschäftsbereich auf Belege, Gutscheine und Historieneinträge an.
3. Es erzeugt eine gemeinsame, unveränderliche Exportprojektion.
4. CSV, Textdatei und spätere Ausgabeadapter verwenden ausschließlich diese Projektion.

Das Modul liest weder IndexedDB noch Laufzeitlisten der Oberfläche. Es kennt keine Dialoge, Routen oder gerenderten Elemente. Eine zweite Datensammlung und parallele Fachlogik entstehen dadurch nicht.

Die öffentlichen Kernfunktionen sind:

- `createExportProjection(snapshot, options)` für die formatneutrale Projektion;
- `createExportFiles(snapshotOrProjection, options)` für die Dateien der Version 1;
- `resolvePeriod(period, referenceDate)` für reproduzierbare Monatsgrenzen.

PDF, Mail und eine spätere kundeneigene Ablage müssen dieselbe Projektion verwenden. Sie dürfen keine eigenen Sammelroutinen über IndexedDB oder UI-Zustände einführen.

## Filtersemantik

Unterstützte Zeiträume:

- aktueller Monat;
- letzter Monat;
- eigener, beidseitig eingeschlossener Zeitraum.

Für Belege zählt das gespeicherte lokale Belegdatum, für Gutscheine das Ausstellungsdatum und für die Gutscheinhistorie der Zeitpunkt des einzelnen Ereignisses. Deshalb erscheint eine Einlösung im gewählten Zeitraum auch dann in `Gutschein-Historie.csv`, wenn der Gutschein früher verkauft wurde. `Gutscheine.csv` enthält dagegen die im Zeitraum ausgestellten Gutscheine.

Der Geschäftsbereich wird über die stabile ID gefiltert. Ausgegeben wird vorrangig die unveränderliche Geschäftsbereichsbezeichnung des jeweiligen Snapshots. Änderungen an heutigen Einstellungen schreiben alte Exporteinträge dadurch nicht um.

## Exporttypen und Datenschutz

`Steuerberatung` erzeugt keine Kundenstammdatendatei. Namen, die bereits unveränderlicher Bestandteil eines Beleg- oder Gutscheinsnapshots sind, bleiben in den fachlichen Zeilen enthalten.

`Eigene Daten` bietet `Kunden.csv` als ausdrückliche, standardmäßig nicht aktivierte Option an. Enthalten sind ausschließlich Kunden, die in den gefilterten Belegen, Gutscheinen oder relevanten Gutscheinhistorien referenziert werden. Nicht zugeordnete Kunden werden nicht vorsorglich mit exportiert.

Alle Dateien entstehen im Arbeitsspeicher des Endgeräts. Die Anwendung überträgt weder Snapshot noch Exportdateien an FRECKA oder einen anderen Server. Ein Download ist eine bewusste Nutzeraktion; ab diesem Zeitpunkt ist der Nutzer für den gewählten Speicherort verantwortlich.

## Dateien der Version 1

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

## ZIP-Entscheidung

Version 1 bietet jede Datei als einzelnen Download an. Die browsernative `CompressionStream`-Schnittstelle definiert komprimierte Streams wie Brotli, Deflate und Gzip, aber keinen ZIP-Container. FRECKA baut deshalb keinen eigenen ZIP-Writer und führt für diesen Block keine Bibliothek ein.

Die Einzelbuttons vermeiden außerdem browserabhängig blockierte Mehrfachdownloads. Eine spätere ZIP-Ausgabe darf als reiner Ausgabeadapter über demselben Dateisatz ergänzt werden, sobald dafür eine geprüfte, wartbare Abhängigkeit ausdrücklich freigegeben ist.

## Fehlerverhalten

- Fehlender oder unvollständiger Snapshot: Export wird abgelehnt.
- Ungültiger oder umgekehrter Zeitraum: Export wird abgelehnt.
- Unbekannter Geschäftsbereich: Export wird abgelehnt.
- Es gibt keine stillen Fehler und keine teilweise veränderten Geschäftsdaten, weil der Export ausschließlich liest.
- Auch leere Ergebnisse erzeugen die dokumentierten Dateien mit Kopfzeilen und `Export-Info.txt`.

## Prüfungen

`tests/persistence-smoke.html` umfasst aktuell 79 native Browserfälle. EXPORT-001 ergänzt Prüfungen für:

- aktuelle, letzte und eigene Zeiträume;
- Geschäftsbereichsfilter;
- offene Zahlung, Storno und Gutschrift;
- Gutscheinverkauf und periodengerechte Historie;
- getrennte Dateien und chronologische Einzelzeilen;
- UTF-8-BOM, Semikolon, Umlaute, Anführungszeichen und Centwerte;
- CSV-Injection-Schutz;
- datensparsame Kundendatei;
- Export-Info und DATEV-Abgrenzung;
- unveränderten Eingangssnapshot und unverändertes Datenbankschema.

Die Produktoberfläche wurde zusätzlich bei 320 px und 390 px ohne horizontalen Überlauf sowie ohne Konsolenfehler geprüft.
