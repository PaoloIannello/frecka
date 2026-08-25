# FRECKA – 0.11.2 / ONBOARDING-001

Browserbasierte FRECKA-PWA 0.11.2 mit lokaler IndexedDB-Persistenz, verschlüsselter Gesamtsicherung, snapshotbasiertem Steuerberater-ZIP sowie zentraler Dokument-, QR-, Public-Viewer-, Share-, PWA-Update- und Beta-Release-Infrastruktur. Der vorbereitete Release-Kandidat basiert vollständig auf dem veröffentlichten und real abgenommenen Beta-Release `0.11.1-3a4ff57` und ergänzt ausschließlich BACKUP-004, ONBOARDING-001 sowie die notwendigen Versions-, Cache-, Test- und Releaseanpassungen.

Der reale iPhone-Backup-Test von 0.11.2 ist NO-GO: Ein noch im BRANDING-001-Format persistierter Settingssatz wurde beim Start zwar im Arbeitsspeicher in das BRANDING-002-Asset-Register projiziert, aber nicht dauerhaft übernommen. BACKUP-005 ergänzt genau diese fehlende Startmigration sowie die kompatible Snapshotprojektion und testet den vollständigen Mehrlogo-Backup-/Restorepfad. Produktversion und Build bleiben bis zu einer gesonderten Patchvorbereitung unverändert.

Ein vollständig neuer Mandant startet ohne Kunden, Katalogpositionen, Belege, offene Zahlungen, Korrekturen, Gutscheine, Umsätze oder Logoassets. Neutrale technische Defaults, optionale Vorlagen und die ausschließlich für PERSISTENCE-010 erlaubte historische Vierer-Reparaturquelle sind strikt getrennt. Die verbindliche Erststartinventur und die 15-Punkte-Übergabecheckliste stehen in [`docs/beta-handoff.md`](docs/beta-handoff.md).

UX-011 / UPDATE-002 / BACKUP-003/004 ergänzt darauf eine reale Seite **Einstellungen → Update**, bereinigt veraltete „Geplant“-Kennzeichnungen und erinnert nach einem wählbaren Intervall ohne bestätigte Sicherungsdatei nicht blockierend an ein neues lokales Backup. Zur Auswahl stehen 48 Stunden, 5 Tage und wöchentlich; wöchentlich ist der abwärtskompatible Standard. Die manuelle Suche verwendet den vorhandenen Updatecontroller; Restore übernimmt die Intervallwahl, gilt aber niemals als neue Sicherung und bewahrt lokale Frist- und Snooze-Zeitpunkte.

ONBOARDING-001 ergänzt unter **Einstellungen → Hilfe & Lernen** eine jederzeit aufrufbare Installationshilfe für iPhone/iPad und Android. Sie priorisiert die passende Anleitung ausschließlich anhand lokaler Browsermerkmale, zeigt im Standalone-Modus den bereits installierten Zustand und bleibt vollständig offline verfügbar. Beide Plattformen können immer manuell gewählt werden. Der kompakte Ablauf und die abweichenden Android-Bezeichnungen sind in [`docs/installation.md`](docs/installation.md) dokumentiert.

## Neu in 0.11.2

- wählbare Sicherungsintervalle **Alle 48 Stunden**, **Alle 5 Tage** und **Wöchentlich**; wöchentlich bleibt der Standard für neue und historische Einstellungen
- unveränderter 24-Stunden-Snooze; ausschließlich eine erfolgreich an Share oder Download übergebene Sicherung startet das Intervall neu
- lokale Speicherhilfe für Dateien auf iPhone/iPad und Android sowie persönliche Ordner in iCloud Drive, Google Drive oder OneDrive, ohne Cloudanbindung durch FRECKA
- jederzeit erreichbare, vollständig lokal und offline verfügbare Installationshilfe für iPhone/iPad und Android mit lokaler Plattformpriorisierung und Standalone-Erkennung
- keine neue Abhängigkeit sowie keine Änderung an TSE, Lizenz, Zahlungen, Nummernkreisen, Geschäftsdatenformaten oder Service-Worker-Architektur

## Neu in 0.11.1

- produktiver Erststart ohne Katalogpositionen, Kunden, Belege, offene Zahlungen, Korrekturen, Gutscheine, Umsätze oder Logoassets; neutrale technische Defaults bleiben erhalten
- unveränderter Bestandsvorrang: vorhandene Mandanten- und Beta-Daten werden beim Update weder automatisch gelöscht, repariert noch auf Erststartwerte zurückgesetzt
- lokale PNG-/JPEG-Logos bis 1 MB für Unternehmen und Geschäftsbereiche mit der Priorität Bereichslogo, Unternehmenslogo, Textfallback
- versioniertes, unveränderliches Logo-Asset-Register; historische interne Ansichten und PDFs lösen weiterhin exakt die beim Geschäftsvorgang referenzierte Bildversion auf
- Public Viewer und QR-Payload bleiben frei von Bildrohdaten; TSE bleibt optional vorbereitet und ohne Aktivierung, Anbieterkommunikation oder Fiskalisierung
- verbindliches Erststartinventar und manuelle Beta-Übergabecheckliste in [`docs/beta-handoff.md`](docs/beta-handoff.md)

## Neu in TSE-002

- eine reale, rein lesende Seite **Einstellungen → TSE-Vorbereitung** mit dem verbindlichen Anbieter `fiskaly SIGN DE`
- optionale Nutzung; standardmäßig weder eingerichtet noch aktiviert oder verbunden
- ausschließlich lokale Konfigurationsmetadaten im bestehenden Settings-Datensatz sowie in Backup, Restore und dem Exporttyp **Eigene Daten**
- keine Zugangsdaten, Anbieterkommunikation, TSE-Transaktionen, Belegfelder, Signaturen oder simulierte Fiskalisierung
- unveränderter Steuerberaterexport; TSE-003 und Folgeblöcke bleiben für Aktivierung, Verbindung und echte Fiskaldaten zuständig

## Neu in SETTINGS-002

- eine kompakte Seite **Einstellungen → Betrieb** für die vorhandenen Zahlungsarten, Steuerstatus und Standard-MwSt., den Standard-Geschäftsbereich sowie Belegtexte
- Währung EUR und Sprache Deutsch eindeutig nur lesbar; keine Mehrwährungs- oder neue Beleglogik
- bestehende Beleg-, Storno- und Gutschriftnummernkreise nur lesbar, auch beim erneuten Durchlauf der Ersteinrichtung
- Standard-MwSt. ausschließlich als Vorauswahl für neue Katalogeinträge; keine Änderung vorhandener Positions- oder Belegsteuern
- automatische Aufnahme in Settings-Persistenz, verschlüsseltes Backup und Restore sowie betriebliche Metadaten ausschließlich im Exporttyp **Eigene Daten**
- unveränderter Steuerberaterexport und keine neuen Zahlungsarten, Rechtstexte, Stores oder Schema-Versionen

## Neu in SETTINGS-001

- eine zentrale Seite **Einstellungen → Unternehmen** für optionale Geschäftsbezeichnung, verpflichtende rechtliche Person, optionalen Ansprechpartner, getrennte Anschrift, Kontaktwege, Website und optionale Steuerkennungen
- verlustfreie Kompatibilität für bestehende kombinierte Straßenwerte ohne automatische oder mutmaßliche Zerlegung
- ein eigener Unternehmens-Änderungszeitpunkt, der nur bei tatsächlichen Änderungen fortgeschrieben wird
- ausschließlich lokal gespeicherte, inhaltlich geprüfte PNG-/JPEG-Logos bis 1 MB in einem versionierten, unveränderlichen Asset-Register des vorhandenen Settings-Datensatzes sowie in verschlüsseltem Backup und Restore
- klare Branding-Priorität: Geschäftsbereichslogo, sonst Unternehmenslogo, sonst textbasierter Fallback; historische Belege und Gutscheine lösen ihre gespeicherte Asset-ID weiterhin zur damaligen Bildversion auf
- zusätzliche Unternehmensangaben nur im Exporttyp **Eigene Daten**; unveränderter Steuerberaterexport und unveränderte Public-Viewer-Whitelist
- proportionale Logo-Bildausgabe in interner Ansicht sowie Beleg-, Gutschein-, Storno-, Gutschrift- und Steuerberater-PDF; Public Viewer und öffentliche QR-Payloads bleiben frei von Bildrohdaten

## Neu in RELEASE-AUTOMATION-001/002

- ein lokaler Ein-Befehl-Prozess prüft einen bereits freigegebenen und gepushten Release-Commit, erzeugt erst danach den annotierten Tag und baut das unveränderliche Artefakt ausschließlich aus diesem Tag
- eine versionierte Laufzeit-Allowlist, reproduzierbare `RELEASE.txt`/`SHA256SUMS`, exakte `0444`/`0555`-Rechte und No-Clobber-Gates sichern Artefakt und Beta-Upload
- der bestehende Synology-Transport bleibt bei rein lesender Zielprüfung, Dry-Run und anschließendem ausdrücklichem Upload; Web Station und Geräteabnahme bleiben manuell
- die kompakte Erfolgsausgabe nennt Version, Tag, Release-ID und `/volume1/web/FRECKA/releases/<release-id>/site`

## Neu in SERVICEWORKER-003

- die einmalige SERVICEWORKER-002-Legacy-Konstante und ihre Installations-Autoaktivierung sind nach bestandener 0.10.9-Übergangsabnahme entfernt
- eine App-Shell-Installation aktiviert den Worker nicht mehr selbst; `skipWaiting()` bleibt ausschließlich hinter der bewussten `SKIP_WAITING`-Nachricht
- der UPDATE-001b-Nutzeraktionspfad, genau ein Reload, Mehrfachtipp-Schutz, Timeout-/Fehlerpfad und „Später erinnern“ bleiben unverändert
- das Release-Gate bleibt als Regressionsschutz bestehen und blockiert 0.10.10 nicht mehr

## Neu in UPDATE-001b

- die bewusste Updateaktion erkennt eine bereits erfolgte Worker-Übernahme über `registration.active`, den Controllerstand seit Anzeige der Updatekarte und den Workerzustand, statt ausschließlich auf ein noch kommendes `controllerchange` zu warten
- während des ausdrücklich gestarteten Updateversuchs wird der Übernahmestand kurzzeitig und begrenzt nachgeprüft; ein verlorenes Lifecycle-Ereignis blockiert den Reload dadurch nicht
- genau eine bewusste Nutzeraktion führt weiterhin zu höchstens einer Aktivierungsnachricht und genau einem Reload; Mehrfachtippen, Zustandswechsel, Nachprüfung und `controllerchange` teilen dieselbe Reload-Sperre
- ein ausbleibender Aktivierungs- oder Navigationsabschluss wird zeitlich begrenzt und als verständlicher Fehler mit „Erneut versuchen“ und „Später“ aufgelöst
- „Später erinnern“ verschiebt den Hinweis nur in der laufenden Sitzung und bietet ihn nach 15 Minuten erneut an; beim nächsten App-Start wird ein noch vorhandenes Update ebenfalls wieder erkannt
- **Einstellungen → Update** zeigt Version, Build und den letzten manuellen Prüfstatus; „Nach Updates suchen“ verwendet dieselbe Registration, Updatekarte, Aktivierungsnachricht und Einmal-Reload-Sperre
- offene Belegentwürfe und laufende Schreibvorgänge blockieren die bewusste Aktivierung weiterhin; Offline-App-Shell, IndexedDB und sämtliche Geschäftsdaten bleiben unberührt

Der reale iPhone/Home-Screen-PWA-Test von `0.10.8-6056e64` am 11. August 2026 bestätigte Updateerkennung und Offline-Kaltstart, blieb nach „Jetzt aktualisieren“ jedoch bei „Wird aktualisiert …“ ohne sichtbaren Reload stehen. Das korrigierte Release `0.10.9-5b180b6` bestand anschließend den realen Updatepfad, Offline-Kaltstart, Offline-Belegerstellung und den fortbestehenden lokalen Datenbestand nach Rückkehr ins Netz. `0.10.10-b3456bf` entfernte danach die bestätigte Legacy-Brücke und validierte den Ein-Befehl-Releaseprozess real. Das nachfolgende `0.11.0-99a1511` ist die aktuelle real abgenommene Beta-Basis, jedoch noch keine Produktivfreigabe für `app.frecka.app`.

## Grundlage aus PERSISTENCE-010

- ausschließlich nach bewusster Nutzeraktion verfügbare lokale Reparatur für exakt vier bekannte historische Demo-Gutscheinverkaufsbelege;
- feste Allowlist aus Receipt-ID, Belegnummer, Gutscheinreferenz und Gutscheincode; keine allgemeine Migration und keine Rekonstruktion realer Geschäftsdaten;
- vollständige Read-only-Vorprüfung aller Gutschein-/Verkaufsbelegreferenzen sowie harter Stopp bei jeder Kollision, Abweichung, Mehrdeutigkeit oder weiteren Snapshotverletzung;
- ein einziger atomarer Receipt-Store-Schreibvorgang nach erfolgreicher Vollvalidierung; Einstellungen, Nummernstand, Katalog, Kunden, Gutscheine und bestehende Belege bleiben unverändert;
- erneute vollständige Snapshotprüfung nach dem Schreiben und idempotenter No-op beim zweiten Aufruf;
- 161 bestandene native Browser-Smoke-Tests, 320 px und 390 px ohne horizontalen Überlauf sowie keine Browser-Konsolenfehler.

## Start

Über `localhost` oder ein HTTPS-Testdeployment öffnen. Der native Teilen-Dialog steht nur bereit, wenn der Browser den Kontext als sicher einstuft; auf einem unsicheren HTTP-Deployment bleibt der lokale Speichern-Fallback. Ein direkter `file://`-Start ist für verlässliche IndexedDB-Tests nicht vorgesehen.

## Kernablauf

Start → Neuer Beleg → Positionen direkt antippen → Beleg bei Bedarf aufklappen und bearbeiten → Weiter → Kunde optional und Zahlungsart simulieren → Demo abschließen.

## Beta-Release

Nach vollständig geprüfter Versionsvorbereitung, Commit und Push auf `origin/main` ist der normale technische Releaseweg genau ein lokaler Befehl:

```sh
./scripts/release-beta.sh
```

Der Befehl leitet Version und Build aus dem sauberen `main` ab, prüft `origin/main`, den versionierten Freigabenachweis, lokale und entfernte Tag-/Release-Kollisionen, die Laufzeit-Allowlist und alle automatisierbaren Regressionen. Erst danach erzeugt und veröffentlicht er den annotierten Tag, baut das unveränderliche Artefakt ausschließlich aus diesem Tag und ruft den bestehenden Beta-Dry-Run sowie bei Erfolg den Beta-Upload auf. Er ändert weder Versionsquellen noch Fachcode, Commit, Web Station oder Produktion.

Die Release-Notiz `docs/releases/<version>.md` muss vor dem Commit mindestens die eindeutigen Felder `Status: Für automatisierten Beta-Release freigegeben`, `Beta-Release-Freigabe: FREIGEGEBEN`, `Lokale Release-Prüfung: BESTANDEN`, Release-Verantwortung, Vorgängerversion, Migrations-/Bestandsprüfung und einen Abschnitt `Bekannte Einschränkungen` enthalten. Nach erfolgreichem Upload bleiben Web-Station-Umschaltung und realer Home-Screen-PWA-Test bewusste manuelle Freigabegates.

## Neu in PERSISTENCE-008

- unter **Einstellungen → Sicherung & Wiederherstellung → Lokale Datenintegrität prüfen** steht eine ausdrücklich gestartete Read-only-Diagnose bereit
- Diagnose und Backup/Export lesen denselben zentralen Tenant-Snapshot; die fachliche Entscheidung trifft weiterhin ausschließlich `validateTenantSnapshot()` einschließlich der Gutschein-/Beleg-Invariante
- die Ausgabe ist auf technischen Prüfcode, konkrete Invariante, Voucher-ID/-Referenz/-Code, Verkaufsbelegreferenzen, Receipt-ID/-Nummer/-Art/-Gegenreferenz sowie notwendige Zeit- und Historienreferenzen begrenzt
- Kunden-, Unternehmens-, Positions-, Betrags- und Kennwortdaten werden nicht in die Diagnose übernommen
- die Diagnose verändert keine IndexedDB-Daten, repariert oder migriert nichts und besitzt keinen Netzwerkpfad
- der Bericht bleibt lokal sichtbar und kann erst nach bewusster Nutzeraktion über den zentralen Share-/Speichern-Pfad als Textdatei ausgegeben werden
- weil Belege und Gutscheine keine erzeugende App-Version speichern, behauptet die Diagnose keine unbelegbare automatische Zuordnung „vor/nach 0.10.3“, sondern zeigt die betroffenen Zeitstempel
- 152 bestandene native Browser-Smoke-Tests einschließlich konsistentem Bestand, fehlendem/falsch referenziertem/verwaistem Gutscheinverkaufsbeleg, Duplikaten und nachweislich unveränderter IndexedDB

Für den realen iPhone-Test genau einmal **Diagnose erstellen** antippen, den lokal angezeigten Bericht prüfen und anschließend **Diagnose teilen oder speichern** wählen. Es findet vorher keine Datei- oder Serverausgabe statt.

## Neu in BACKUP-002

- klare Zweiphasenfolge: Snapshot und Verschlüsselung bereiten nur den verschlüsselten Inhalt vor; `File`, Share oder Download entstehen erst durch die ausdrückliche Ausgabeaktion
- verständliche Sperrmeldung bei historisch inkonsistentem Gesamtbestand ohne interne Referenzen
- Navigation, neue Eingabe, Fehler und neue Versuche entwerten laufende oder vorbereitete Ausgaben; verspätete Promises können danach keinen Dialog mehr auslösen
- ein Ausgabeversuch verbraucht den vorbereiteten Zustand vor dem ersten Systemaufruf; Share-Abbruch löst weder Download-Fallback noch zweiten Dialog aus
- Sicherungskennwörter bleiben bei Fehlern und Share-Abbruch erhalten und werden nur nach erfolgreichem Share oder Download geleert
- eine nicht blockierende Sicherungserinnerung nach 48 Stunden, 5 Tagen oder wöchentlich mit 24-Stunden-Snooze; Erstinstallationen und historische Settings ohne Auswahl verwenden wöchentlich
- ausschließlich bestätigter Share oder Download setzt den letzten erfolgreichen Sicherungszeitpunkt; Vorbereitung, Fehler und Share-Abbruch tun dies nicht
- eine aufklappbare Speicherhilfe für iPhone/iPad, Android und persönliche Cloud-Ordner ohne Cloudintegration oder Zugriff durch FRECKA
- explizite iOS-taugliche Share-/Speichern-Aktion mit ausreichend lange lesbarer Objekt-URL für einen bewusst gestarteten Download
- native Browser-Smoke-Tests einschließlich Erfolgs-, Invarianten-, Navigations-, Verschlüsselungs-, Datei-, Share-Abbruch- und Sicherungserinnerungspfad

## Grundlage aus PERSISTENCE-007

- globale historische Gutschein-/Belegabweichungen bleiben sichtbar, setzen aber sicher geladene Receipt- und Voucher-Stores nicht mehr pauschal auf schreibgesperrt
- unabhängige neue Belege sowie lokal vollständig gegengeprüfte Gutscheintransaktionen bleiben atomar speicherbar
- neue fehlerhafte Gegenreferenzen, ID-/Nummernkollisionen und unvollständige Einlösungsverknüpfungen werden weiterhin vor Bestätigung abgewiesen
- globale Tenant-Snapshots, Backup, Steuerberaterexport und inkonsistente Restore-Kandidaten bleiben bei verletzter Bestandsinvariante gesperrt
- keine automatische Reparatur, Migration oder Löschung historischer Daten
- 145 bestandene native Browser-Smoke-Tests einschließlich Altbestand, deterministischem Backup-Fehlerpfad, Reload, Kollisionsschutz und unveränderter globaler Sperrgrenzen

## Grundlage aus SERVICEWORKER-002

- zentrale, zustandslose Update-Komponente für `registration.waiting`, `updatefound` und genau eine gezielte Prüfung beim Online-Start
- nichtblockierender Hinweis „Neue FRECKA-Version verfügbar.“ mit bewusster Aktion „Jetzt aktualisieren“
- Aktivierung eines wartenden Workers ausschließlich über `{ type: "SKIP_WAITING" }` nach Nutzeraktion
- genau ein kontrollierter Reload nach `controllerchange`; kein Reload ohne vorherige Nutzeraktion und keine Reload-Schleife
- Schutz offener Belegentwürfe und laufender lokaler Schreibvorgänge vor einem Updatewechsel
- Offline-Start ohne falsche Updatefehlermeldung sowie unveränderte App-Shell-, Public-Viewer- und IndexedDB-Isolation
- historische, ausschließlich bis zur realen Altclient-Abnahme freigegebene Legacy-Brücke für 0.10.0-/0.10.1-Clients; in 0.10.10 durch SERVICEWORKER-003 entfernt
- eigene automatisierte Lifecycle-Tests zusätzlich zum 145-Fälle-Fach- und Persistenzlauf

Die Legacy-Brücke aus SERVICEWORKER-002 blieb in 0.10.9 ausnahmsweise erhalten. Nach der erfolgreichen realen Übergangsabnahme entfernt SERVICEWORKER-003 sie in 0.10.10 vollständig. Die dauerhafte Reihenfolge lautet: Hinweis → Nutzeraktion → `SKIP_WAITING` → genau ein Reload.

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
- 145 bestandene native Browser-Smoke-Tests sowie automatisiertes PDF-Rendering mit Text- und Sichtprüfung

Der vollständige Dokumentvertrag steht in `docs/documents-pdf.md`.

## Grundlage aus QR-001 und QR-002

- eine einzige öffentliche QR-API in `js/qr.js` für beliebige FRECKA-App-Links
- klar getrennte interne Verwaltungslinks im Format `#/receipt/<referenz>` beziehungsweise `#/voucher/<referenz>` und transportable öffentliche Kundenlinks
- echte, zur Laufzeit erzeugte QR-Codes als skalierbares SVG; keine dauerhaft gespeicherten QR-Bilder
- große, zentrierte Beleg-QR-Codes und Gutschein-QR-Codes über dieselbe Komponente
- fokussierte, bildschirmfüllende PWA-Ansicht ohne Navigation, Menüs oder Werkzeugleisten
- lokale Deep-Link-Auflösung nach Reload sowie verständliche Fehlerzustände für ungültige oder auf dem Gerät nicht vorhandene Referenzen
- Public Viewer ohne Unternehmernavigation, Einstellungen oder ungefragte lokale Speicherung
- Public-Viewer-Boot-Test ohne `IndexedDB.open`, reproduzierbare QR-Dichtemessung und Einbindung in den 145-Fälle-Gesamtlauf

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
- 145 bestandene native Browser-Smoke-Tests im aktuellen Stand

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

Noch keine Persistenz für Belegentwürfe. Keine Cloudablage, Synchronisation, automatische Backups, Zahlungsanbieteranbindung, automatische E-Mail oder Versandbestätigung, Synology-Export, Kamera-QR-Scanner, aktive TSE-Anbindung, Fiskalisierung oder eigener Druckworkflow. Der Steuerberaterexport erzeugt sein ZIP ausschließlich lokal und führt weder Serverübertragung noch neue Gutscheinsteuerlogik ein.

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
