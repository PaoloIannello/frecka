# FRECKA – PERSISTENCE-007

Browserbasierte FRECKA-PWA 0.10.3 mit lokaler IndexedDB-Persistenz, verschlüsselter Gesamtsicherung, snapshotbasiertem Steuerberater-ZIP sowie zentraler Dokument-, QR-, Public-Viewer-, Share- und PWA-Update-Infrastruktur. PERSISTENCE-007 erlaubt neue, lokal konsistente Beleg- und Gutscheintransaktionen auch dann, wenn eine unabhängige historische Gutschein-/Belegabweichung im Altbestand sichtbar bleibt. Backup, Export und inkonsistente Restore-Kandidaten bleiben in diesem Fall weiterhin gesperrt. Geschäftsdaten bleiben lokal; für den geräteübergreifenden Kundenbeleg gibt es weder einen zentralen Belegserver noch einen ungefragten Import in die IndexedDB des zweiten Geräts.

## Start

Über `localhost` oder ein HTTPS-Testdeployment öffnen. Der native Teilen-Dialog steht nur bereit, wenn der Browser den Kontext als sicher einstuft; auf einem unsicheren HTTP-Deployment bleibt der lokale Speichern-Fallback. Ein direkter `file://`-Start ist für verlässliche IndexedDB-Tests nicht vorgesehen.

## Kernablauf

Start → Neuer Beleg → Positionen direkt antippen → Beleg bei Bedarf aufklappen und bearbeiten → Weiter → Kunde optional und Zahlungsart simulieren → Demo abschließen.

## Neu in PERSISTENCE-007

- globale historische Gutschein-/Belegabweichungen bleiben sichtbar, setzen aber sicher geladene Receipt- und Voucher-Stores nicht mehr pauschal auf schreibgesperrt
- unabhängige neue Belege sowie lokal vollständig gegengeprüfte Gutscheintransaktionen bleiben atomar speicherbar
- neue fehlerhafte Gegenreferenzen, ID-/Nummernkollisionen und unvollständige Einlösungsverknüpfungen werden weiterhin vor Bestätigung abgewiesen
- globale Tenant-Snapshots, Backup, Steuerberaterexport und inkonsistente Restore-Kandidaten bleiben bei verletzter Bestandsinvariante gesperrt
- keine automatische Reparatur, Migration oder Löschung historischer Daten
- 144 bestandene native Browser-Smoke-Tests einschließlich Altbestand, deterministischem Backup-Fehlerpfad, Reload, Kollisionsschutz und unveränderter globaler Sperrgrenzen

## Grundlage aus SERVICEWORKER-002

- zentrale, zustandslose Update-Komponente für `registration.waiting`, `updatefound` und genau eine gezielte Prüfung beim Online-Start
- nichtblockierender Hinweis „Neue FRECKA-Version verfügbar.“ mit bewusster Aktion „Jetzt aktualisieren“
- Aktivierung eines wartenden Workers ausschließlich über `{ type: "SKIP_WAITING" }` nach Nutzeraktion
- genau ein kontrollierter Reload nach `controllerchange`; kein Reload ohne vorherige Nutzeraktion und keine Reload-Schleife
- Schutz offener Belegentwürfe und laufender lokaler Schreibvorgänge vor einem Updatewechsel
- Offline-Start ohne falsche Updatefehlermeldung sowie unveränderte App-Shell-, Public-Viewer- und IndexedDB-Isolation
- einmalige, ausdrücklich freigegebene Legacy-Brücke für bereits ausgelieferte 0.10.0-/0.10.1-Clients ohne Update-UI: automatische Worker-Aktivierung, aber kein `clients.claim()` und kein automatischer Reload
- eigene automatisierte Lifecycle-Tests zusätzlich zum 144-Fälle-Fach- und Persistenzlauf

Die Legacy-Brücke aus SERVICEWORKER-002 bleibt in 0.10.3 ausnahmsweise unverändert erhalten, solange der reale Übergang bereits ausgelieferter Altclients noch nicht bestätigt ist. Sobald dieser Übergang real nachgewiesen wurde, ist ihre Entfernung ein zwingendes Gate für den unmittelbar folgenden Worker/Release. Die dauerhafte Reihenfolge bleibt: Hinweis → Nutzeraktion → `SKIP_WAITING` → genau ein Reload.

## Neu in EXPORT-003

- zentrale bidirektionale Invariante zwischen Gutschein und Gutscheinverkaufsbeleg
- eindeutige Prüfung von Receipt-ID, Belegnummer, Belegart und Gutschein-Gegenreferenz
- vollständiger Abbruch von Laufzeitschreibvorgängen, Backup/Restore und Export bei inkonsistentem Datenstand
- vier konsistent vervollständigte Demo-Gutscheinverkaufsbelege ohne neue Gutscheinsteuerlogik
- End-to-End- und Negativtests für Persistenz, Reload, Snapshot, Exportpaket und PDF

## Neu in OFFLINE-001

- produktiver, lokal registrierter Service Worker ohne externe Abhängigkeit
- vollständiger, atomar vorab geladener App-Shell-Cache für HTML, CSS, JavaScript, Manifest, Icons und lokale Vendor-Dateien
- Navigation-Fallback auf die gecachte `index.html`, auch bei einer Bereitstellung unter einem Release-Unterpfad
- versionsgebundene Cachebereinigung ausschließlich für ältere FRECKA-App-Shell-Caches
- keine Speicherung von Geschäftsdaten im Cache und keine Änderung an IndexedDB
- kein erzwungener Service-Worker-Wechsel während einer laufenden App-Sitzung

## Neu in COMM-001 / QR-002

- ein einziger zentraler Share-Service für echte `File`-Objekte, öffentliche Links und den lokalen Speichern-Fallback
- Feature Detection über sicheren Kontext, `navigator.share()` und die exakte Prüfung der tatsächlichen Dateien mit `navigator.canShare({ files })`
- Ausgabeaktionen **PDF anzeigen**, **QR-Code anzeigen** und **Teilen** für normale Belege, Gutscheine und Gutschein-Verkaufsbelege
- Wiederverwendung der bestehenden Dokumentenengine: PDF-Anzeige und Teilen verwenden dasselbe echte, vollständig lokal erzeugte PDF
- Fallbackfolge für Dokumente: PDF-Datei → öffentlicher Kundenlink → lokales Speichern
- Steuerberater-ZIP als eine fertige Datei im nativen Teilen-Dialog oder als lokaler Speichern-Fallback
- Dateiauswahl beim rückwärtskompatiblen Exporttyp `Eigene Daten`; `Kunden.csv` bleibt bis zur ausdrücklichen Auswahl abgewählt
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
- 144 bestandene native Browser-Smoke-Tests sowie automatisiertes PDF-Rendering mit Text- und Sichtprüfung

Der vollständige Dokumentvertrag steht in `docs/documents-pdf.md`.

## Grundlage aus QR-001 und QR-002

- eine einzige öffentliche QR-API in `js/qr.js` für beliebige FRECKA-App-Links
- klar getrennte interne Verwaltungslinks im Format `#/receipt/<referenz>` beziehungsweise `#/voucher/<referenz>` und transportable öffentliche Kundenlinks
- echte, zur Laufzeit erzeugte QR-Codes als skalierbares SVG; keine dauerhaft gespeicherten QR-Bilder
- große, zentrierte Beleg-QR-Codes und Gutschein-QR-Codes über dieselbe Komponente
- fokussierte, bildschirmfüllende PWA-Ansicht ohne Navigation, Menüs oder Werkzeugleisten
- lokale Deep-Link-Auflösung nach Reload sowie verständliche Fehlerzustände für ungültige oder auf dem Gerät nicht vorhandene Referenzen
- Public Viewer ohne Unternehmernavigation, Einstellungen oder ungefragte lokale Speicherung
- Public-Viewer-Boot-Test ohne `IndexedDB.open`, reproduzierbare QR-Dichtemessung und Einbindung in den 144-Fälle-Gesamtlauf

Der grundlegende QR-Vertrag steht in `docs/qr.md`; öffentlicher Payload, Fragmenttransport, Datenschutz und Größenlimits stehen in `docs/public-receipt-qr.md`.

## Grundlage aus EXPORT-001

- eine gemeinsame, formatneutrale Exportprojektion auf Basis der vorhandenen Tenant-Snapshot-API
- Zeitraumfilter für aktuellen Monat, letzten Monat und ein eigenes Datum
- Geschäftsbereichsfilter über stabile IDs und historische Snapshots
- ein einziges Steuerberater-ZIP mit `Übersicht.csv`, den bestehenden CSV-/Infodateien und je einem PDF für jeden gefilterten Beleg
- Bereichs-, Steuersatz- und Gesamtsummen ausschließlich aus gespeicherten Beleg- und Steuergruppenwerten
- PDFs für normale Belege, offene Belege, Stornos, Gutschriften und Gutscheinverkaufsbelege über dieselbe Dokumentenengine
- rückwärtskompatible Einzeldatei-API mit `Belege.csv`, `Belegpositionen.csv`, `Gutscheine.csv`, `Gutschein-Historie.csv` und `Export-Info.txt`
- optionale, datensparsame `Kunden.csv` ausschließlich beim Exporttyp „Eigene Daten“
- UTF-8-BOM, Semikolon, deutsche Dezimalwerte, sauberes Escaping und CSV-Injection-Schutz
- lokal vendortes JSZip 3.10.1 unter MIT-Lizenzoption; kein CDN, keine npm-Runtime und kein Server
- 144 bestandene native Browser-Smoke-Tests im aktuellen Stand

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

Noch keine Persistenz für Belegentwürfe. Keine Cloudablage, Synchronisation, automatische Backups, Zahlungsanbieteranbindung, automatische E-Mail oder Versandbestätigung, Synology-Export, Kamera-QR-Scanner, TSE, Fiskalisierung oder eigener Druckworkflow. Der Steuerberaterexport erzeugt sein ZIP ausschließlich lokal und führt weder Serverübertragung noch neue Gutscheinsteuerlogik ein.

Web Share bleibt vollständig feature-basiert: Ein vorhandener Button ist keine Zusage, dass ein bestimmtes Betriebssystem, ein bestimmtes Share-Ziel oder Multiple-File-Sharing verfügbar ist. Die reale Abnahme auf iPhone/iPad, Android und Desktop sowie Scanversuche mit echten Gerätekameras sind vor einer Produktfreigabe weiterhin ein offenes Release-Gate.

Der Datenbankvertrag steht in `docs/persistence.md`; Dateiformat, Sicherheitsmodell, Restore-Ablauf und Prüfungen stehen in `docs/backup-restore.md`; Projektion, CSV-Vertrag und Datenschutz des Exports stehen in `docs/export.md`; QR-Service, App-Link-Struktur und Laufzeitdarstellung stehen in `docs/qr.md`; öffentliche QR-Dokumente stehen in `docs/public-receipt-qr.md`; Share-Service und Plattformfallbacks stehen in `docs/sharing.md`; Dokumentmodelle und PDF-Vertrag stehen in `docs/documents-pdf.md`.


## Ergänzung UX-004b

- Ausgewählte Kacheln werden deutlich farblich hervorgehoben und mit einem Haken markiert.
- Erneutes Antippen derselben Kachel entfernt die Position vollständig aus dem aktuellen Beleg.
- Mengen über 1 werden weiterhin ausschließlich im aufgeklappten aktuellen Beleg über Plus/Minus geändert.


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
