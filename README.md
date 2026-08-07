# FRECKA – COMM-001 / QR-002

Browserbasierter FRECKA-Prototyp 0.9.0 mit lokaler IndexedDB-Persistenz, verschlüsselter Gesamtsicherung, snapshotbasiertem CSV-Export sowie zentraler Dokument-, QR-, Public-Viewer- und Share-Infrastruktur. Geschäftsdaten bleiben lokal; für den geräteübergreifenden Kundenbeleg gibt es weder einen zentralen Belegserver noch einen ungefragten Import in die IndexedDB des zweiten Geräts.

## Start

Über `localhost` oder ein HTTPS-Testdeployment öffnen. Der native Teilen-Dialog steht nur bereit, wenn der Browser den Kontext als sicher einstuft; auf einem unsicheren HTTP-Deployment bleibt der lokale Speichern-Fallback. Ein direkter `file://`-Start ist für verlässliche IndexedDB-Tests nicht vorgesehen.

## Kernablauf

Start → Neuer Beleg → Positionen direkt antippen → Beleg bei Bedarf aufklappen und bearbeiten → Weiter → Kunde optional und Zahlungsart simulieren → Demo abschließen.

## Neu in COMM-001 / QR-002

- ein einziger zentraler Share-Service für echte `File`-Objekte, öffentliche Links und den lokalen Speichern-Fallback
- Feature Detection über sicheren Kontext, `navigator.share()` und die exakte Prüfung der tatsächlichen Dateien mit `navigator.canShare({ files })`
- Ausgabeaktionen **PDF anzeigen**, **QR-Code anzeigen** und **Teilen** für normale Belege, Gutscheine und Gutschein-Verkaufsbelege
- Wiederverwendung der bestehenden Dokumentenengine: PDF-Anzeige und Teilen verwenden dasselbe echte, vollständig lokal erzeugte PDF
- Fallbackfolge für Dokumente: PDF-Datei → öffentlicher Kundenlink → lokales Speichern
- Exportauswahl vor dem Teilen; `Kunden.csv` erscheint nur, wenn sie im Export enthalten ist, und bleibt bis zur ausdrücklichen Auswahl abgewählt
- Exportdateien werden nur dann gemeinsam geteilt, wenn der Browser exakt die gewählte Dateimenge bestätigt; andernfalls bleibt das bestehende einzelne Speichern auf dem Gerät
- ein öffentlicher Read-only-Viewer für Belege und Gutscheine, der seine datensparsame, versionierte Darstellung ausschließlich aus dem URL-Fragment liest
- geräteübergreifender QR-Kundenbeleg ohne serverseitige Belegablage und ohne Zugriff auf lokale Unternehmerdaten des Kundengeräts
- öffentliche Darstellung ohne interne Historien, Notizen, Kunden-Telefonnummern, Kunden-E-Mail-Adressen oder rohe FRECKA-Stores

Der native Teilen-Dialog kann je nach Gerät unterschiedliche installierte Ziele anbieten. FRECKA ermittelt diese Ziele nicht, versendet nichts automatisch und bestätigt keine Zustellung. Ein öffentlicher Link ist außerdem kein kryptografisch verifizierter Originalbeleg.

Die Architekturverträge stehen in `docs/sharing.md` und `docs/public-receipt-qr.md`.

## Neu in DOCUMENT-001

- reine, eingefrorene Dokumentmodelle für Belege und Gutscheine ohne DOM- oder IndexedDB-Abhängigkeit
- dieselbe Projektion für Bildschirmvorschau und PDF; spätere Versandwege müssen sie wiederverwenden
- echte, vollständig lokale PDFs mit durchsuchbarem Text und vektoriellem QR-Code
- schmale digitale Belege ohne Leistungserbringungsort und Gutscheine mit gespeichertem Einlöseort
- unveränderte Snapshot-, Cent-, Beleg- und Gutscheinwerte ohne zweite Geschäftslogik
- sichere Dateinamen ohne Kundendaten
- lokal vendortes `pdf-lib` 1.17.1 unter MIT-Lizenz; kein CDN und kein Server
- 125 bestandene native Browser-Smoke-Tests sowie automatisiertes PDF-Rendering mit Text- und Sichtprüfung

Der vollständige Dokumentvertrag steht in `docs/documents-pdf.md`.

## Grundlage aus QR-001 und QR-002

- eine einzige öffentliche QR-API in `js/qr.js` für beliebige FRECKA-App-Links
- klar getrennte interne Verwaltungslinks im Format `#/receipt/<referenz>` beziehungsweise `#/voucher/<referenz>` und transportable öffentliche Kundenlinks
- echte, zur Laufzeit erzeugte QR-Codes als skalierbares SVG; keine dauerhaft gespeicherten QR-Bilder
- große, zentrierte Beleg-QR-Codes und Gutschein-QR-Codes über dieselbe Komponente
- fokussierte, bildschirmfüllende PWA-Ansicht ohne Navigation, Menüs oder Werkzeugleisten
- lokale Deep-Link-Auflösung nach Reload sowie verständliche Fehlerzustände für ungültige oder auf dem Gerät nicht vorhandene Referenzen
- Public Viewer ohne Unternehmernavigation, Einstellungen oder ungefragte lokale Speicherung
- Public-Viewer-Boot-Test ohne `IndexedDB.open`, reproduzierbare QR-Dichtemessung und Einbindung in den 125-Fälle-Gesamtlauf

Der grundlegende QR-Vertrag steht in `docs/qr.md`; öffentlicher Payload, Fragmenttransport, Datenschutz und Größenlimits stehen in `docs/public-receipt-qr.md`.

## Grundlage aus EXPORT-001

- eine gemeinsame, formatneutrale Exportprojektion auf Basis der vorhandenen Tenant-Snapshot-API
- Zeitraumfilter für aktuellen Monat, letzten Monat und ein eigenes Datum
- Geschäftsbereichsfilter über stabile IDs und historische Snapshots
- `Belege.csv`, `Belegpositionen.csv`, `Gutscheine.csv`, `Gutschein-Historie.csv` und `Export-Info.txt`
- optionale, datensparsame `Kunden.csv` ausschließlich beim Exporttyp „Eigene Daten“
- UTF-8-BOM, Semikolon, deutsche Dezimalwerte, sauberes Escaping und CSV-Injection-Schutz
- 79 native Browser-Smoke-Tests im Stand EXPORT-001

Der vollständige Exportvertrag steht in `docs/export.md`.

## Grundlage aus HARDEN-001

- verständliche Sicherungskennwort-Texte in der gesamten Produktoberfläche
- iOS-robuste Auswahl von `.frecka-backup`-Dateien ohne unzuverlässigen Dateityp-Vorfilter
- chronologisch sortierbare Dateinamen im Format `FRECKA-Backup-YYYY-MM-DD-HHMM.frecka-backup`
- Kundenstatus Aktiv/Deaktiviert mit Filter und reversibler Deaktivierung
- deaktivierte Kunden bleiben in Belegen, Gutscheinen und Historien erhalten, sind für neue Vorgänge aber nicht auswählbar

## Grundlage aus BACKUP-001

- eine zentrale Tenant-Snapshot-API für Einstellungen, Katalog, Kunden, Belege und Gutscheine
- verschlüsselte `.frecka-backup`-Dateien mit PBKDF2-HMAC-SHA-256 und AES-GCM-256 über Web Crypto
- vollständige Prüfung von Format, Mandant, Stores, IDs, Referenzen, Werten und Nummernstand vor jedem Restore
- Vorschau des Sicherungsinhalts vor dem Überschreiben
- angebotenes verschlüsseltes Sicherheitsbackup des aktuellen Stands
- atomarer Restore aller fünf IndexedDB-Stores ohne Teilzustände
- keine Passphrase, Schlüssel, Geschäftsdaten oder Sicherungsdatei in zentraler Speicherung
- zentrale und validierte Tenant-Snapshot-API für Backup, Restore und Export

## Nicht umgesetzt

Noch keine Persistenz für Belegentwürfe. Keine Cloudablage, Synchronisation, automatische Backups, ZIP-Erzeugung, Zahlungsanbieteranbindung, automatische E-Mail oder Versandbestätigung, Synology-Export, Kamera-QR-Scanner, TSE, Fiskalisierung oder eigener Druckworkflow. COMM-001 führt weder eine neue PDF-Architektur noch einen Belegserver ein.

Web Share bleibt vollständig feature-basiert: Ein vorhandener Button ist keine Zusage, dass ein bestimmtes Betriebssystem, ein bestimmtes Share-Ziel oder Multiple-File-Sharing verfügbar ist. Die reale Abnahme auf iPhone/iPad, Android und Desktop sowie Scanversuche mit echten Gerätekameras sind vor einer Produktfreigabe weiterhin ein offenes Release-Gate.

Der Datenbankvertrag steht in `docs/persistence.md`; Dateiformat, Sicherheitsmodell, Restore-Ablauf und Prüfungen stehen in `docs/backup-restore.md`; Projektion, CSV-Vertrag und Datenschutz des Exports stehen in `docs/export.md`; QR-Service, App-Link-Struktur und Laufzeitdarstellung stehen in `docs/qr.md`; öffentliche QR-Dokumente stehen in `docs/public-receipt-qr.md`; Share-Service und Plattformfallbacks stehen in `docs/sharing.md`; Dokumentmodelle und PDF-Vertrag stehen in `docs/documents-pdf.md`.


## Ergänzung UX-004b

- Ausgewählte Kacheln werden deutlich farblich hervorgehoben und mit einem Haken markiert.
- Erneutes Antippen derselben Kachel entfernt die Position vollständig aus dem aktuellen Beleg.
- Mengen über 1 werden weiterhin ausschließlich im aufgeklappten aktuellen Beleg über Plus/Minus geändert.


Wichtig beim ersten Öffnen: Den Netlify-Link einmal mit `?v=ux004b` am Ende öffnen, damit ein alter Service-Worker-Cache sicher umgangen wird.


## Wichtig für Netlify

Für Netlify die Datei `UX-004c-NETLIFY.zip` direkt hochladen.  
Diese ZIP ist absichtlich **flach gepackt**: `index.html` liegt direkt im Hauptverzeichnis des Archivs.


## UX-005

Der aktuelle Beleg besitzt jetzt einen eigenen Bearbeitungsbildschirm. Dort können Mengen geändert und Positionen entfernt werden.

Für Netlify ausschließlich `UX-005-NETLIFY.zip` hochladen. `index.html` liegt direkt im Hauptverzeichnis des Archivs.


## UX-006

Im Bearbeitungsbildschirm unterscheiden sich Dienstleistungen und Produkte:

- Dienstleistungen: Preis ändern, Rabatt geben oder entfernen
- Produkte: zusätzlich Menge mit Plus/Minus ändern

Für Netlify ausschließlich `UX-006-NETLIFY.zip` hochladen.


## UX-007

Rabatt kann jetzt wahlweise in Prozent oder Euro vergeben werden. Der kompakte Umschalter hält den Bearbeitungsdialog schlank.

Für Netlify ausschließlich `UX-007-NETLIFY.zip` hochladen.


## UX-009

Nach dem simulierten Abschluss erscheint eine Erfolgsseite mit PDF-Vorschau, zentral erzeugtem QR-Code sowie direktem Neustart. Die damalige E-Mail-Simulation wurde mit COMM-001 durch die zentrale native Aktion „Teilen“ ersetzt; FRECKA selbst versendet keine E-Mail.

Für Netlify ausschließlich `UX-009-NETLIFY.zip` hochladen.


## UX-010

Die Positionsauswahl besitzt jetzt eine dauerhaft sichtbare Live-Belegleiste mit Anzahl, Summe, Bearbeiten und Weiter. Für Netlify ausschließlich `UX-010-NETLIFY.zip` hochladen.


## UX-010b
Strukturfix: Die Live-Belegleiste befindet sich außerhalb des animierten Scrollbereichs und berücksichtigt die dynamische Safari-Viewport-Höhe.


## UX-010e

Der Friseur-Demokatalog enthält jetzt 44 Einträge. Damit können lange Favoriten-, Leistungs- und Produktlisten realistisch getestet werden.


## UX-011

Die kompakte POS-Darstellung wurde auf die wichtigsten Arbeitsseiten übertragen. Start- und Erfolgsseite bleiben bewusst großzügiger.


## UX-012

Die Belegvorschau enthält Unternehmensdaten, Steuernummer, Netto-/MwSt.-Aufschlüsselung und sichtbare Rabatte. Ohne Kundenzuordnung wird keine Kundenzeile ausgegeben.
