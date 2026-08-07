# DOCUMENT-001 – Zentrale Dokumentenengine und PDF

**Status:** implementiert  
**App-Version:** 0.9.0  
**Build:** DOCUMENT-001  
**Stand:** 7. August 2026

## Zweck

FRECKA erzeugt Beleg- und Gutscheindokumente vollständig lokal. Bildschirmvorschau und PDF greifen auf dieselbe formatneutrale Dokumentprojektion zu. Die Engine sammelt keine Daten aus UI-Listen und liest weder IndexedDB noch Backupdaten selbst. Ihr einziger fachlicher Eingang ist das bereits persistierte Beleg- beziehungsweise Gutscheinobjekt mit seinen Snapshots.

Damit bleibt die Verantwortungsfolge eindeutig:

`persistierter Geschäftsvorgang → reines Dokumentmodell → Bildschirm oder PDF`

Spätere Ausgabekanäle wie E-Mail oder Synology müssen dasselbe Dokumentmodell verwenden. Sie dürfen keine zweite Beleg- oder Gutscheinprojektion einführen.

## Öffentliche API

`js/documents.js` veröffentlicht genau eine globale Schnittstelle unter `FRECKA_DOCUMENTS`:

- `createReceiptDocumentModel(receipt, options)` projiziert einen Beleg synchron und ohne Seiteneffekte.
- `createVoucherDocumentModel(voucher, options)` projiziert einen Gutschein synchron und ohne Seiteneffekte.
- `createPdfBytes(model, options)` erzeugt ein echtes PDF als `Uint8Array`.
- `createPdfBlob(model, options)` erzeugt einen Blob mit `application/pdf`.
- `DOCUMENT_VERSION` kennzeichnet den Modellvertrag als `DOCUMENT-001`.

Die beiden Projektionsfunktionen verändern ihre Eingabe nicht. Ihr Ergebnis und alle verschachtelten Modellteile sind eingefroren. Erforderliche Abhängigkeiten werden injiziert oder über die zentrale Laufzeit-API bezogen:

- `qrService`: bestehendes `FRECKA_QR`;
- `companyIdentity`: bestehende zentrale Unternehmensdarstellung aus der Persistenzschicht;
- `baseUrl`: nur für kontrollierte Tests oder eine ausdrücklich gesetzte App-Basis;
- `linkedVoucher`: optionales bereits aufgelöstes Gutscheinobjekt für den sichtbaren Code eines Gutscheinverkaufsbelegs.

## Belegmodell

Das Belegmodell übernimmt ausschließlich gespeicherte Geschäftswerte und Snapshots:

- stabile ID, Belegnummer und Belegart;
- deutsches Datum und Uhrzeit ohne sichtbaren ISO-Zeitstempel;
- Unternehmens- und Branding-Snapshot;
- optionalen Kundensnapshot;
- gespeicherte Positionen, Rabatte, Steuergruppen und Summen in Cent;
- Zahlungsstatus, Zahlungsart, Gutschein- und Restzahlung;
- Korrekturbezug bei Storno und Gutschrift;
- gespeicherte Belegtexte;
- QR-Link, QR-Matrix und SVG aus dem zentralen QR-Service.

Ein normaler Beleg enthält bewusst keinen Leistungserbringungsort. Die Engine führt keine Steuer-, Rabatt- oder Gutscheinberechnung durch. Sie normalisiert nur bereits vorhandene Cent- beziehungsweise Dezimalfelder in das Ausgabeformat.

Das PDF verwendet eine schmale 80-mm-Belegbreite. Lange Positionen werden umgebrochen; lange Belege erhalten Folgeseiten. Am Ende des letzten Blatts steht ein großer, zentrierter Vektor-QR-Code und darunter ausschließlich „Digitaler Beleg“.

## Gutscheinmodell

Das Gutscheinmodell übernimmt:

- stabile Gutscheinreferenz und sichtbaren Code;
- Status, Ursprungswert und aktuellen Restwert;
- Ausstellungszeitpunkt;
- Unternehmens-, Branding-, Geschäftsbereichs-, Leistungsort- und Kundensnapshot;
- optionalen Namen auf dem Gutschein;
- Verkaufsbelegreferenz;
- QR-Link, QR-Matrix und SVG aus dem zentralen QR-Service.

Im Gegensatz zum normalen Beleg zeigt der Gutschein immer seinen gespeicherten Einlöse- beziehungsweise Leistungserbringungsort. Änderungen an heutigen Stammdaten verändern ein bereits projiziertes oder neu aus seinem historischen Snapshot erzeugtes Dokument nicht.

## QR-Vertrag

Die Dokumentenengine besitzt keinen QR-Encoder. Sie ruft ausschließlich `FRECKA_QR.create(kind, reference)` auf. Deshalb verwenden Bildschirm und PDF exakt denselben App-Link und dieselbe Matrix:

- Beleg: `#/receipt/<stabile-id>`
- Gutschein: `#/voucher/<stabile-referenz>`

Im PDF wird die Matrix als Vektorrechtecke mit der vorgegebenen Ruhezone gezeichnet. Weder QR-Grafiken noch PDF-Dateien werden in IndexedDB, Backup oder Export gespeichert.

## PDF-Technik

FRECKA liefert `pdf-lib` 1.17.1 lokal unter `vendor/` aus. Die Bibliothek ist MIT-lizenziert und benötigt weder CDN noch Server. Sie wurde gewählt, weil Browser selbst keine verlässliche API zur programmgesteuerten PDF-Erzeugung bereitstellen. Die Anwendung verwendet Standard-PDF-Schriften, durchsuchbaren Text und vektorielle QR-Module; sie erzeugt keine Screenshot-PDFs.

Die Produktoberfläche öffnet die lokal erzeugte Datei in einem neuen Browserfenster. Falls der Browser dieses Fenster blockiert, wird ein lokaler Download mit dem dokumentierten Dateinamen ausgelöst:

- `FRECKA-Beleg-<Belegnummer>.pdf`
- `FRECKA-Gutschein-<Gutscheincode>.pdf`

Kundennamen sind nicht Bestandteil des Dateinamens oder der technischen PDF-Schlüsselwörter.

## Datenschutz und Offline-Verhalten

- Die gesamte Projektion und PDF-Erzeugung findet im Arbeitsspeicher des Geräts statt.
- Es gibt keinen Upload, Serveraufruf, CDN-Zugriff oder zentrale Ablage.
- Die Engine verwendet kein `localStorage`, `sessionStorage` und keine eigene Persistenz.
- Geschäftsdaten werden nur in das vom Nutzer ausdrücklich geöffnete PDF geschrieben.
- Temporäre Blob-URLs werden nach der Anzeige wieder freigegeben.

## Fehlerverhalten

Fehlende stabile Referenzen, fehlende Unternehmerangaben, ungültige Gutscheinwerte, ein nicht verfügbarer QR-Service oder eine nicht geladene PDF-Bibliothek führen zu einem typisierten `DocumentError` mit verständlicher Meldung. Ein leerer QR-Code oder ein halbes PDF wird nicht ausgegeben. Fach- und Persistenzdaten werden bei einem PDF-Fehler nicht verändert.

## Prüfungen und offene Abnahme

Automatisierte Browser-Smoke-Tests decken normale Belege, Kundenvarianten, Rabatte, mehrere Steuersätze, offene Zahlungen, Gutschein- und Restzahlung, Storno, Gutschrift, Gutscheinverkauf, Gutscheinstatus, Snapshots, QR-Gleichheit, Datumsformat, echte PDF-Bytes, Blobs und lange Belege ab.

Zusätzlich werden repräsentative Beleg- und Gutschein-PDFs mit Poppler gerendert und visuell geprüft. Die reale iPhone-/iPad-Abnahme für Öffnen, Sichern und Teilen bleibt eine Zielgeräteprüfung und kann nicht durch den Desktop-Browser ersetzt werden.

## Architekturentscheidung

Für DOCUMENT-001 ist kein eigener ADR notwendig. Die Änderung setzt die bestehenden Architekturentscheidungen „Offline First“ und „IndexedDB als lokale Persistenz“ um, ohne Persistenzschema oder Datenhoheit zu verändern. Die Abhängigkeitsentscheidung ist in diesem Vertrag und im Vendor-Verzeichnis vollständig dokumentiert. Ein ADR wird erst erforderlich, wenn das PDF-Format, die Dokumentprojektion oder die lokale Bibliothek durch eine inkompatible Architektur ersetzt werden soll.
