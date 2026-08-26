# DOCUMENT-001 – Zentrale Dokumentenengine und PDF

**Status:** implementiert<br>
**App-Version:** 0.9.0<br>
**Build:** COMM-001 / QR-002<br>
**Stand:** 7. August 2026

## Zweck

FRECKA erzeugt Beleg- und Gutscheindokumente vollständig lokal. `DOCUMENT-001` bleibt auch mit COMM-001 und QR-002 die einzige zentrale Modell- und PDF-Engine. Bildschirmvorschau, PDF-Anzeige, lokales Speichern, natives Teilen und der zustandslose Public Viewer greifen auf dieselbe formatneutrale Dokumentprojektion zu. Die Engine sammelt keine Daten aus UI-Listen und liest weder IndexedDB noch Backupdaten selbst. Ihr einziger fachlicher Eingang ist das bereits persistierte Beleg- beziehungsweise Gutscheinobjekt mit seinen Snapshots.

Damit bleibt die Verantwortungsfolge eindeutig:

`persistierter Geschäftsvorgang → reines Dokumentmodell → Bildschirm, PDF oder Teilen`

Die datensparsame Public-Projektion aus QR-002 ist eine Transport-Whitelist des fertigen Dokumentmodells und keine zweite fachliche Beleg- oder Gutscheinquelle. Spätere Ausgabekanäle wie E-Mail oder Synology müssen ebenfalls dasselbe Dokumentmodell verwenden.

## Öffentliche API

`js/documents.js` veröffentlicht genau eine globale Schnittstelle unter `FRECKA_DOCUMENTS`:

- `createReceiptDocumentModel(receipt, options)` projiziert einen Beleg synchron und ohne Seiteneffekte.
- `createVoucherDocumentModel(voucher, options)` projiziert einen Gutschein synchron und ohne Seiteneffekte.
- `createPdfBytes(model, options)` erzeugt ein echtes PDF als `Uint8Array`.
- `createPdfBlob(model, options)` erzeugt den zentral wiederverwendeten Blob mit `application/pdf` für Anzeige, lokales Speichern und Teilen.
- `DOCUMENT_VERSION` kennzeichnet den Modellvertrag als `DOCUMENT-001`.

Die beiden Projektionsfunktionen verändern ihre Eingabe nicht. Ihr Ergebnis und alle verschachtelten Modellteile sind eingefroren. Erforderliche Abhängigkeiten werden injiziert oder über die zentrale Laufzeit-API bezogen:

- `qrService`: bestehendes `FRECKA_QR`;
- `companyIdentity`: bestehende zentrale Unternehmensdarstellung aus der Persistenzschicht;
- `baseUrl`: nur für kontrollierte Tests oder eine ausdrücklich gesetzte App-Basis des internen Verwaltungslinks;
- `linkedVoucher`: optionales bereits aufgelöstes Gutscheinobjekt für den sichtbaren Code eines Gutscheinverkaufsbelegs.
- `resolveLogoAsset`: zentraler, lokaler BRANDING-002-Resolver für die im Snapshot gespeicherte Asset-ID.

BRANDING-002 löst Bilddaten ausschließlich für das flüchtige Dokumentmodell auf. Der Geschäftsvorgang enthält nur die historische `assetId` samt neutralen Metadaten. Der Resolver liest das validierte, unveränderliche PNG-/JPEG-Asset aus `settings.logoAssets`; die Data-URL wird weder in Beleg noch Gutschein zurückgeschrieben. Fehlt das Asset oder ist es beschädigt, bleibt die historische Dokumentidentität erhalten und die Ausgabe verwendet den textbasierten Logo-Fallback.

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

Das PDF verwendet eine schmale 80-mm-Belegbreite. Lange Positionen werden umgebrochen; lange Belege erhalten Folgeseiten. Am Ende des letzten Blatts steht im Regelfall ein großer, zentrierter Vektor-QR-Code. Er nutzt die volle verfügbare Belegbreite von ungefähr 68,7 mm; darunter steht ausschließlich „Digitaler Beleg“.

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

Die Dokumentenengine besitzt keinen eigenen QR-Encoder. Das lokale Grundmodell erhält seine Matrix weiterhin aus `FRECKA_QR`. Interne Verwaltungslinks bleiben für die lokale Auflösung bestehen:

- Beleg: `#/receipt/<stabile-id>`
- Gutschein: `#/voucher/<stabile-referenz>`

Kundendokumente verwenden seit QR-002 dagegen den geräteübergreifenden Public-Link aus `FRECKA_PUBLIC_DOCUMENTS`. Der fertige Link wird mit `FRECKA_QR.encodeAppLink(...)` durch dieselbe QR-Engine kodiert. Bildschirmansicht, PDF und QR-Vollbild erhalten dasselbe vorbereitete Public-Dokumentmodell und damit dieselbe Matrix. Ein lokaler Verwaltungslink wird nicht als Kundenlink ausgegeben.

Im PDF wird die Matrix als Vektorrechtecke mit der zentral vorgegebenen Ruhezone gezeichnet. Überschreitet ein Dokument die festgelegte Public- beziehungsweise QR-Größengrenze, kann die Engine als ausdrücklichen Fallback ein PDF ohne QR ausgeben. Dieser Fallback behauptet keine geräteübergreifende Scanbarkeit; Dokumentinhalt, lokales Speichern und dateibasiertes Teilen bleiben verfügbar. Es wird weder ein Mehrfach-QR noch eine Serverablage eingeführt.

Weder QR-Grafiken noch PDF-Dateien werden in IndexedDB oder Backup gespeichert. QR-Matrix, SVG, PDF-Bytes, Blob und gegebenenfalls `File` entstehen ausschließlich zur Laufzeit. Der Steuerberaterexport kann dieselben flüchtigen PDF-Bytes auf ausdrückliche Nutzeraktion in sein lokales ZIP-Gesamtpaket aufnehmen; das ist keine neue Persistenz und keine zweite Dokumentenengine.

## PDF-Technik

FRECKA liefert `pdf-lib` 1.17.1 lokal unter `vendor/` aus. Die Bibliothek ist MIT-lizenziert und benötigt weder CDN noch Server. Sie wurde gewählt, weil Browser selbst keine verlässliche API zur programmgesteuerten PDF-Erzeugung bereitstellen. Die Anwendung verwendet Standard-PDF-Schriften, durchsuchbaren Text und vektorielle QR-Module; sie erzeugt keine Screenshot-PDFs.

PNG und JPEG werden über dieselbe vorhandene `pdf-lib`-Instanz eingebettet. Die Maße werden proportional in einen festen Headerbereich eingepasst; das Seitenverhältnis bleibt erhalten und Unternehmensdaten sowie Beleginhalt beginnen darunter. Dieselbe Routine gilt für normale Belege, Gutscheinverkaufsbelege, Storno, Gutschrift und Gutschein. Mehrseitige Belege erhalten das Logo nur im Dokumentkopf der ersten Seite. Interne HTML-Ansicht und PDF verwenden dieselbe aufgelöste historische Asset-Version.

Echte PNG-/JPEG-Logos erhalten zwischen ihrer tatsächlichen Bildunterkante und dem folgenden Branding- beziehungsweise Unternehmensblock einen kleinen festen Abstand. Die Regel gilt zentral für interne Beleg- und Gutscheinansichten sowie beide PDF-Layouts. Logoabmessungen, Textfallback und der Modus ohne Logo bleiben davon unberührt.

Die Produktoberfläche ruft für Anzeige und Teilen dieselbe Funktion `createPdfBlob()` auf. Für den nativen Teilen-Dialog wird der Blob, soweit der Browser es unterstützt, als echtes `File` mit `application/pdf` und dem dokumentierten Dateinamen bereitgestellt. Ist ein `File` nicht konstruierbar oder nicht teilbar, bleibt der PDF-Blob für Anzeige beziehungsweise lokalen Download verwendbar. Die Anwendung erzeugt deshalb kein zweites PDF für COMM-001.

Für die PDF-Anzeige wird eine temporäre Blob-URL geöffnet. Falls der Browser das vorbereitete Fenster blockiert, wird ein lokaler Download ausgelöst:

- `FRECKA-Beleg-<Belegnummer>.pdf`
- `FRECKA-Gutschein-<Gutscheincode>.pdf`

Kundennamen sind nicht Bestandteil des Dateinamens oder der technischen PDF-Schlüsselwörter. Der Share-Service bestätigt nur die Übergabe an den Browser beziehungsweise das Betriebssystem; er behauptet keine Zustellung an ein gewähltes Ziel.

## Datenschutz und Offline-Verhalten

- Die gesamte Projektion und PDF-Erzeugung findet im Arbeitsspeicher des Geräts statt.
- Es gibt keinen Upload, Serveraufruf, CDN-Zugriff oder zentrale Ablage.
- Die Engine verwendet kein `localStorage`, `sessionStorage` und keine eigene Persistenz.
- Geschäftsdaten werden nur in das vom Nutzer ausdrücklich geöffnete PDF geschrieben.
- Temporäre Blob-URLs werden nach der Anzeige wieder freigegeben.
- PDF-Blob, `File`, Public-Link und Freigabeergebnis werden nicht dauerhaft gespeichert.

## Fehlerverhalten

Fehlende stabile Referenzen, fehlende Unternehmerangaben, ungültige Gutscheinwerte, eine nicht geladene PDF-Bibliothek oder ein nicht nutzbarer QR-Service führen zu einem typisierten Fehler mit verständlicher Meldung. Ein leerer QR-Code wird nicht als funktionierender Kunden-QR ausgegeben. Ist nur der Public-QR zu groß, darf das vollständige PDF gezielt ohne QR erzeugt werden; andere PDF-Fehler erzeugen kein halbes Dokument. Fach- und Persistenzdaten werden bei einem Ausgabe- oder Share-Fehler nicht verändert.

## Prüfungen und offene Abnahme

Automatisierte Browser-Smoke-Tests decken normale Belege, Kundenvarianten, Rabatte, mehrere Steuersätze, offene Zahlungen, Gutschein- und Restzahlung, Storno, Gutschrift, Gutscheinverkauf, Gutscheinstatus, Snapshots, öffentliche QR-Modelle, Datumsformat, echte PDF-Bytes, Blob-/File-Fallbacks und lange Belege ab.

`tests/render-documents.mjs` projiziert die Testbelege zunächst mit DOCUMENT-001, erzeugt anschließend die Public-Bundles aus QR-002 und rendert genau diese Modelle als Beleg- und Gutschein-PDF. Damit prüft die visuelle QA die tatsächlichen öffentlichen Kunden-QRs statt lokaler Verwaltungslinks.

Die erzeugten PDFs werden mit Poppler gerendert und visuell geprüft. Encoderlauf, Desktop-Rendering und rechnerische Modulgröße sind jedoch kein Nachweis praktischer Scanbarkeit. Die reale Abnahme für QR-Scan, PDF-Öffnen, Sichern und Teilen auf iPhone/iPad, Android sowie relevanten Desktop-Browsern bleibt ein offenes Release-Gate.

## Architekturentscheidung

Für DOCUMENT-001, COMM-001 und QR-002 ist derzeit kein weiterer PDF-ADR notwendig. Die Integration setzt die bestehenden Architekturentscheidungen „Offline First“ und „IndexedDB als lokale Persistenz“ um, ohne Persistenzschema oder Datenhoheit zu verändern. Public-Transport und Share-Adapter konsumieren die zentrale Engine, ersetzen sie aber nicht. Ein ADR wird erst erforderlich, wenn das PDF-Format, die Dokumentprojektion, die lokale Bibliothek oder die zustandslose Public-Ausgabe durch eine inkompatible Architektur ersetzt werden soll.
