# FRECKA – QR-001

Browserbasierter FRECKA-Prototyp mit lokaler IndexedDB-Persistenz, verschlüsselter Gesamtsicherung, snapshotbasiertem CSV-Export und zentraler QR-Laufzeitengine.

## Start

Über einen lokalen HTTP-Server oder ein HTTPS-Testdeployment öffnen. Ein direkter `file://`-Start ist für verlässliche IndexedDB-Tests nicht vorgesehen.

## Kernablauf

Start → Neuer Beleg → Positionen direkt antippen → Beleg bei Bedarf aufklappen und bearbeiten → Weiter → Kunde optional und Zahlungsart simulieren → Demo abschließen.

## Neu in QR-001

- eine einzige öffentliche QR-API in `js/qr.js` für beliebige FRECKA-App-Links
- stabile Links im Format `#/receipt/<referenz>` und `#/voucher/<referenz>`
- echte, zur Laufzeit erzeugte QR-Codes als skalierbares SVG; keine dauerhaft gespeicherten QR-Bilder
- große, zentrierte Beleg-QR-Codes und Gutschein-QR-Codes über dieselbe Komponente
- fokussierte, bildschirmfüllende PWA-Ansicht ohne Navigation, Menüs oder Werkzeugleisten
- lokale Deep-Link-Auflösung nach Reload sowie verständliche Fehlerzustände für ungültige oder auf dem Gerät nicht vorhandene Referenzen
- 87 native Browser-Smoke-Tests ohne neues Testframework

Der vollständige QR-Vertrag steht in `docs/qr.md`.

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

Noch keine Persistenz für Belegentwürfe. Keine Cloudablage, Synchronisation, automatische Backups, ZIP-Erzeugung, Zahlungsanbieteranbindung, PDF-Erzeugung, E-Mail, Synology-Export, Kamera-QR-Scan, TSE oder Fiskalisierung.

Der Datenbankvertrag steht in `docs/persistence.md`; Dateiformat, Sicherheitsmodell, Restore-Ablauf und Prüfungen stehen in `docs/backup-restore.md`; Projektion, CSV-Vertrag und Datenschutz des Exports stehen in `docs/export.md`; QR-Service, App-Link-Struktur und Laufzeitdarstellung stehen in `docs/qr.md`.


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

Nach dem simulierten Abschluss erscheint eine Erfolgsseite mit PDF-Vorschau, E-Mail-Simulation, zentral erzeugtem QR-Code sowie direktem Neustart.

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
