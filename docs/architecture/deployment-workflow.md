# FRECKA: Vollständiger Deployment- und Release-Workflow

Stand: 25. August 2026

Geltungsbereich: Entwicklung im einzigen Master-Repository, lokaler automatisierter Beta-Release und weiterhin manuelle Web-Station-/Produktivfreigabe

## 1. Ziel und Verbindlichkeit

Dieser Workflow beschreibt den vollständigen Weg einer FRECKA-Änderung von der lokalen Entwicklung bis zur archivierten Produktivversion. Er konkretisiert den Blueprint in `docs/architecture/FRECKA_Infrastructure_Blueprint_V1.0.md`, die Synology-Zuordnung in `docs/architecture/deployment-synology.md` und die Entwicklungs- und Releaseprinzipien aus `PROJECT.md`.

Verbindliche Systemgrenzen:

- Das Git-Repository im iCloud Drive ist die einzige Entwicklungs- und Master-Version.
- Jede ausgelieferte Datei muss aus einem eindeutig benannten Git-Commit dieses Repositorys stammen.
- Auf der Synology wird weder entwickelt noch korrigiert.
- Die Synology enthält ausschließlich veröffentlichte statische Artefakte, Infrastrukturkonfiguration und künftig klar getrennte Serverdienste.
- Produktive Geschäftsdaten bleiben im Browser des Kunden und werden nicht auf die Synology übertragen.
- Ein Release wird genau einmal erzeugt und danach nicht mehr verändert.
- Beta und Produktion verwenden getrennte HTTPS-Origins.
- Ein Produktiv-Deployment verwendet exakt das auf Beta freigegebene Artefakt. Es wird nicht erneut gebaut.
- RELEASE-AUTOMATION-001 automatisiert ausschließlich die lokalen mechanischen Beta-Release-Schritte mit vorhandenen Projekt- und Betriebssystemmitteln. Es führt weder Build-System, CI noch externe Laufzeitabhängigkeit ein.

## 2. Vertrauens- und Verantwortungsmodell

Die Rollen sind logisch getrennt. In einer kleinen Organisation darf dieselbe Person mehrere Rollen übernehmen, muss die jeweiligen Prüfschritte aber weiterhin nachvollziehbar ausführen.

| Rolle | Verantwortung |
|---|---|
| Entwicklung | Änderung im Repository, lokale Tests, kleine Commits |
| Review | fachliche und technische Prüfung, Daten- und Migrationsfolgen |
| Release-Verantwortung | Version, Tag, Release-Artefakt und Prüfnachweis |
| Beta-Abnahme | Browser-, Geräte- und Migrationsprüfung auf der Beta-Origin |
| Produktivfreigabe | ausdrückliche Freigabe des bereits geprüften Artefakts |
| Infrastruktur | Übertragung, Web-Station-Portalwechsel, Zertifikate und Rechte |

Kein Synology-Administrator darf eine Datei im veröffentlichten `site/` „schnell reparieren“. Ein Fehler führt immer zurück in das Repository, zu einem neuen Commit, einer neuen Version und einem neuen Release-Verzeichnis.

## 3. Gesamtfluss

```text
Anforderung
→ kurzer Arbeitsbranch
→ lokale Prüfungen
→ Review
→ Merge nach main
→ Release-Vorbereitung und Push des freigegebenen main-Commits
→ ./scripts/release-beta.sh
   (Preflight → Tests → unveränderlicher Git-Tag → Artefakt → Beta-Deployment)
→ Beta-Abnahme
→ Produktivfreigabe
→ Portalwechsel auf dasselbe Artefakt
→ Produktiv-Smoke-Test
→ Archivierung
```

Bei einem Fehler gilt:

```text
Beta-Fehler → neuer Fix-Commit → neue Beta-Version → neues Artefakt
Produktiv-Fehler → Portal zurück auf Vorgänger oder neuer Patch-Release
```

Ein bestehendes Release-Verzeichnis, ein veröffentlichter Tag und eine bereits vergebene Versionsnummer werden niemals wiederverwendet.

## 4. Entwicklung

### 4.1 Arbeitsbeginn

Vor jeder Änderung:

1. iCloud-Synchronisation vollständig abwarten;
2. sicherstellen, dass das Repository nicht gleichzeitig auf einem zweiten Gerät beschrieben wird;
3. `git status` prüfen;
4. aktuellen `main`-Stand und letzten Commit dokumentieren;
5. Ziel, Akzeptanzkriterien, Datenfolgen, Offlineverhalten und Tests klären;
6. kurzen Arbeitsbranch vom aktuellen `main` anlegen.

Empfohlene Branchnamen entsprechend `PROJECT.md`:

- `feature/<thema>`;
- `fix/<thema>`;
- `docs/<thema>`;
- `chore/<thema>`.

iCloud synchronisiert Dateien, ersetzt aber keine Git-Konfliktkontrolle. Insbesondere `.git/` darf nicht gleichzeitig durch mehrere laufende Git-Prozesse oder Geräte verändert werden. Eine iCloud-Konfliktkopie ist kein gültiger Merge und darf nicht auf die Synology gelangen.

### 4.2 Umsetzung

- Änderungen bleiben klein und thematisch geschlossen.
- Produktlogik, Refactoring und Infrastrukturänderung werden getrennt.
- Geschäftsdaten-, Backup-, Export-, Public- und Updateformate werden nur versioniert verändert.
- Datenbankschemaänderungen benötigen einen vorwärtsgerichteten, getesteten Migrationsweg.
- Neue Abhängigkeiten sind außerhalb dieses Workflows und benötigen eine eigene Freigabe.
- Testdaten sind fiktiv; echte Kunden- und Lizenzdaten gehören nicht in das Repository.
- Geheimnisse, Synology-Zugänge, Mailzugänge, Signaturschlüssel und Zertifikatsschlüssel werden nie eingecheckt.

### 4.3 Commits

Ein Commit soll:

- genau einen nachvollziehbaren Zweck besitzen;
- lauffähig und prüfbar sein;
- keine generierten Release-Artefakte enthalten;
- keine lokalen Konfigurationen oder temporären Dateien enthalten;
- eine kurze, wirkungsbezogene Nachricht im Imperativ tragen.

Vor jedem Commit werden mindestens die für die Änderung relevanten lokalen Tests ausgeführt. Vor dem Merge nach `main` gilt die vollständige Änderungsprüfung aus Abschnitt 5.

### 4.4 Merge nach main

`main` bleibt jederzeit grundsätzlich releasefähig. Ein Merge ist nur zulässig, wenn:

- Review und relevante Tests abgeschlossen sind;
- Dokumentation und Datenmigrationen zum Code passen;
- keine unbeabsichtigten Dateien im Diff stehen;
- das Arbeitsverzeichnis sauber ist;
- offene bekannte Risiken dokumentiert sind.

Veröffentlichte Historie wird nicht umgeschrieben. Kein Force-Push auf `main`, Release-Tags oder gemeinsam verwendete Branches.

## 5. Lokale Tests

### 5.1 Prüfung pro Änderung

Mindestens:

1. JavaScript-Syntax der betroffenen Dateien;
2. JSON-Syntax geänderter JSON-/Manifestdateien;
3. `git diff --check`;
4. Suche nach unbeabsichtigten Debugdaten, Geheimnissen und neuen Netzaufrufen;
5. betroffener Ablauf im lokalen Browser;
6. Browserkonsole ohne neue Fehler;
7. relevante Regressionstests.

Die lokale App wird über einen lokalen HTTP-Server gestartet, nicht über `file://`. Es wird nichts in einem öffentlich erreichbaren Testsystem abgelegt.

### 5.2 Vollständige Prüfung eines Release-Kandidaten

Der Kandidat muss mindestens bestehen:

- vollständiger vorhandener Browser-Smoke-Test;
- Persistenz, Schema-Upgrade und Reload;
- Backup, Restore und falsches Sicherungskennwort;
- Exportprojektion, Steuerberater-ZIP, Beleg-PDFs, CSV-Schutz und Paketfilter;
- Belege, offene Zahlungen, Storno und Gutschrift;
- Gutscheinverkauf, Teil-/Volleinlösung und Historie;
- Dokumentmodelle und PDF-Erzeugung;
- interne und öffentliche QR-Pfade;
- Public Viewer ohne Zugriff auf Unternehmer-IndexedDB;
- Share-Feature-Detection und Fallbacks;
- 320 px und 390 px ohne horizontalen Überlauf;
- Start am Root und in einem Unterverzeichnis;
- Manifest- und Asset-Auflösung;
- keine Konsolenfehler;
- keine ungeplanten externen Laufzeitabhängigkeiten;
- unveränderte Vendor-Prüfsummen.

Mit der in OFFLINE-001 eingeführten App-Shell kommen zwingend hinzu:

- Erstinstallation online;
- Kaltstart offline;
- echter iOS-Home-Screen-Test: online starten, vollständig schließen, Flugmodus aktivieren und mit vorhandenen lokalen Daten erneut starten;
- Update von jeder unterstützten Vorgängerversion;
- Update bei offenem Arbeitsablauf;
- vollständiger Download vor Aktivierung;
- Ausfall oder beschädigtes Updatepaket;
- Service-Worker-Wechsel und Cachebereinigung;
- `registration.waiting` beim Start und `updatefound` während der Sitzung;
- kein Aktivierungsaufruf und kein Reload ohne Nutzeraktion;
- genau eine `SKIP_WAITING`-Nachricht und genau ein Reload nach `controllerchange`;
- bereits aktivierter Ersatzworker, auch wenn dessen `controllerchange` vor der Nutzeraktion lag;
- bereits erfolgte oder kurz nach der Nutzeraktion sichtbare Worker-Übernahme bei veraltetem Workerzustand, auch wenn kein weiteres `statechange` oder `controllerchange` eintritt;
- „Später erinnern“, erneutes Angebot in derselben Sitzung, Aktivierungszeitüberschreitung und erneuter Versuch;
- verständlicher Fehlerzustand statt dauerhaftem „Wird aktualisiert …“ bei ausbleibender Aktivierung oder Navigation;
- unveränderter IndexedDB-Snapshot vor und nach dem Codewechsel.

Reale iOS-/iPadOS- und Android-Prüfungen bleiben für Installation, Backup-Dateiauswahl, Share, Download, PDF und QR-Kamera-Scan ein Produktiv-Gate. Ein Desktop-Smoke-Test ersetzt diese Freigabe nicht.

### 5.3 Prüfnachweis

Für einen Release-Kandidaten werden festgehalten:

- Git-Commit und vorgesehene Version;
- Datum und prüfende Person;
- getestete Browser und Geräte;
- automatisierte Testergebnisse;
- geprüfte Upgradepfade;
- bekannte Grenzen;
- Ergebnis `bestanden` oder `abgelehnt`.

Ein abgelehnter Kandidat wird nicht repariert oder überschrieben. Die Korrektur erhält einen neuen Commit und eine neue Vorabversion.

## 6. Versionierung

### 6.1 Produktversion

FRECKA verwendet Semantic Versioning:

```text
MAJOR.MINOR.PATCH
```

- `MAJOR`: absichtlich inkompatible Produkt-, Daten- oder Schnittstellenänderung;
- `MINOR`: rückwärtskompatible Funktionserweiterung;
- `PATCH`: rückwärtskompatible Fehlerkorrektur oder Härtung.

Vorabversionen verwenden:

```text
MAJOR.MINOR.PATCH-beta.N
```

Beispiele:

- `1.0.0-beta.1` – erster Beta-Kandidat für 1.0.0;
- `1.0.0-beta.2` – korrigierter, neuer Kandidat;
- `1.0.0` – final vorgesehener Produktivstand;
- `1.0.1` – produktive Fehlerkorrektur.

Datenbankschema, Backupformat, Public-Dokumentformat, Exportformat und spätere API-Versionen bleiben unabhängig versioniert. Sie werden niemals allein wegen einer neuen App-Version hochgezählt.

### 6.2 Finaler Kandidat

Vorabversionen dienen der laufenden Beta-Prüfung. Vor dem Produktiv-Deployment wird die finale Version, beispielsweise `1.0.0`, vollständig vorbereitet und als eigenes unveränderliches Artefakt auf Beta abgenommen. Erst dieses finale Artefakt wird unverändert in Produktion geschaltet.

Dadurch muss ein als `beta` beschriftetes Artefakt nicht nachträglich umbenannt oder neu gebaut werden. Ein Neubau zwischen finaler Beta-Abnahme und Produktion ist verboten.

### 6.3 Versionsquellen

Vor Erstellung eines Tags müssen mindestens übereinstimmen:

- Produktversion und Buildanzeige in `js/data.js`;
- Titel und releasebezogener Asset-Abfragewert in `index.html`;
- PWA-Name, Beschreibung, Start-URL und Scope im Manifest;
- Release-Notiz und Git-Tag;
- erwartete Datenbank- und Formatversionen.

Der Asset-Abfragewert muss pro Code-Release eindeutig sein. Alte und neue Programmdateien dürfen nicht unter derselben als unveränderlich gecachten URL erscheinen.

### 6.4 Git-Tags und Release-ID

Jedes ausgelieferte Artefakt erhält einen annotierten Git-Tag:

```text
v1.0.0-beta.1
v1.0.0
v1.0.1
```

Ein veröffentlichter Tag wird weder verschoben noch gelöscht. Eine kryptografische Tag-Signatur wird erst verbindlich, wenn Schlüsselbesitz, Rotation, Sicherung und Vertretung geregelt sind.

Der dateisystemfreundliche Release-Identifier kombiniert Version und kurzen Commit:

```text
1.0.0-beta.1-<short-commit>
1.0.0-<short-commit>
```

Der Commit verhindert Verwechslungen; die Version bleibt für Menschen lesbar.

### 6.5 Release-Vorbereitung im Repository

Es gibt keinen dauerhaft parallelen `develop`- oder `release`-Branch. Für jede Vorab- oder Finalversion wird bei Bedarf ein kurzer Branch `chore/release-<version>` vom aktuellen `main` verwendet:

1. Zielversion festlegen;
2. Produktversion, Buildkennung, Manifesttexte und Asset-Abfragewert konsistent aktualisieren;
3. Release-Notiz unter `docs/releases/<version>.md` anlegen;
4. Änderungen, Migrationen, Upgradepfad, Rückweg, bekannte Grenzen und Prüfumfang dokumentieren;
5. vollständige Release-Kandidatenprüfung ausführen;
6. Release-Vorbereitungsbranch nach Review in `main` integrieren;
7. den resultierenden sauberen `main`-Commit zu `origin/main` pushen;
8. erst danach den automatisierten Beta-Release aus Abschnitt 6.6 starten.

`docs/releases/` enthält die unveränderten historischen Release-Nachweise. Neue Release-Notizen erfüllen zusätzlich den nachfolgenden maschinenlesbaren Freigabevertrag; bestehende Nachweise werden dafür nicht rückwirkend umgeschrieben. Ändert sich nach dem Tag auch nur eine Datei, ist ein neuer Commit und eine neue Vorab- beziehungsweise Patchversion erforderlich.

### 6.6 Maschinenlesbarer Freigabenachweis

Die Automatisierung ändert keine Release-Dokumentation und errät keine Freigabe. `docs/releases/<version>.md` muss deshalb vor dem Release-Commit mindestens folgende eindeutige Zeilen enthalten:

```text
Status: Für automatisierten Beta-Release freigegeben; Geräteabnahme ausstehend
Beta-Release-Freigabe: FREIGEGEBEN
Lokale Release-Prüfung: BESTANDEN
Release-Verantwortung: <benannte Verantwortung>
Unmittelbare Vorgängerversion: <version>
Datenbankschema-Migration erforderlich: ja|nein
Bestandsprüfung vor In-place-Beta-Test: ja|nein
```

Zusätzlich ist ein Abschnitt `## Bekannte Einschränkungen` mit mindestens einem konkreten Listenpunkt erforderlich. Der Status bedeutet ausschließlich, dass der bereits fachlich und technisch geprüfte Commit getaggt, paketiert und auf die Beta-Infrastruktur übertragen werden darf. Er ist weder Geräte-GO noch Produktivfreigabe.

Ein Status wie `Release-Vorbereitung`, `NO-GO`, `abgelehnt` oder `nicht freigabefähig` darf nicht durch den Orchestrator umgedeutet werden. Die Release-Vorbereitung muss den Nachweis bewusst korrigieren, erneut prüfen, committen und zu `origin/main` pushen.

### 6.7 Normaler automatisierter Beta-Release

Nach dem freigegebenen und gepushten Release-Commit lautet der normale Nutzerbefehl:

```sh
./scripts/release-beta.sh
```

Der Befehl erhält absichtlich keine Version als Argument. Er leitet Produktversion, Build, Tag und Release-ID ausschließlich aus dem geprüften `HEAD` ab und verhindert damit manuell vertauschte Versions- oder Tagparameter.

Für die bereits vorhandenen `.mjs`-Regressionstests benötigt `scripts/verify-release.sh` eine lokale Node.js-Laufzeit. Es verwendet zuerst `FRECKA_NODE_BIN`, danach `node` aus `PATH` und schließlich – falls vorhanden – die lokale Codex-Desktop-Laufzeit. Es werden keine npm-Pakete installiert und keine neue Runtime in das Repository aufgenommen. Fehlt Node.js vollständig, stoppt der Release vor dem Tag mit einer klaren Meldung.

Vor der ersten dauerhaften Release-Aktion und nach den Tests werden mindestens erneut geprüft:

- sauberer Arbeitsbaum und Branch `main`;
- exakte Gleichheit von `HEAD` und dem tatsächlich über `git ls-remote` gelesenen `origin/main`;
- eindeutiger vollständiger Commit und eindeutiger 7-stelliger Kurzhash;
- Versions-, Build-, HTML-, Asset- und App-Shell-Konsistenz;
- getaggte Freigabedokumentation nach Abschnitt 6.6;
- lokal und auf `origin` noch nicht vorhandener Tag;
- lokal und auf der Synology noch nicht vorhandene Release-, Staging- und Sperrpfade;
- sichere, vollständige operative Allowlist `scripts/release-files.txt`;
- alle automatisierbaren Release-, PWA-, Service-Worker-, Dokument-, Deployment- und Sicherheitsprüfungen;
- `git diff --check`.

Erst dann erzeugt das Skript den annotierten Tag mit der Meldung `FRECKA <version> - <build>`, prüft Tagtyp, Zielcommit und Meldung erneut und pusht exakt diese Tagreferenz ohne Force. Bestehende Tags werden niemals verschoben, gelöscht oder überschrieben.

Nach erfolgreichem Tag-Push erzeugt `scripts/build-release.sh` das Artefakt, anschließend führt der Orchestrator zwingend `scripts/deploy-beta.sh --dry-run <release-id>` und nur bei dessen Erfolg `scripts/deploy-beta.sh <release-id>` aus. Web Station, `app.frecka.app`, Rollback und Geräteabnahme liegen außerhalb der Automatisierung.

## 7. Release-Artefakt

### 7.1 Inhalt

Das Artefakt folgt der Allowlist aus `docs/architecture/deployment-synology.md`:

```text
<release-id>/
├── site/
│   ├── index.html
│   ├── styles.css
│   ├── manifest.webmanifest
│   ├── service-worker.js
│   ├── icons/
│   ├── js/
│   └── vendor/
├── RELEASE.txt
└── SHA256SUMS
```

Tests, Repositorymetadaten, Entwicklerdokumentation, temporäre Dateien, Backups, Exporte und Geschäftsdaten werden nicht ausgeliefert.

### 7.2 RELEASE.txt

Die Datei enthält mindestens:

- Produktname;
- Produktversion;
- Buildkennung;
- Release-ID;
- Git-Commit;
- Git-Tag;
- Zeitpunkt des annotierten Tags in UTC;
- im versionierten Freigabenachweis benannte Release-Verantwortung;
- Datenbankschemaversion;
- relevante öffentliche Formatversionen;
- Ergebnis der lokalen Release-Prüfung;
- bekannte Einschränkungen;
- unmittelbar vorherige Produktivversion, soweit vorhanden.

Sie enthält keine Zugangsdaten, Schlüssel oder personenbezogenen Daten.

### 7.3 Erzeugung

Die Erzeugung erfolgt durch `scripts/build-release.sh` ausschließlich aus dem neu erzeugten annotierten Release-Tag. Der Helfer ist Teil des Ein-Befehl-Prozesses; er taggt, pusht und deployt selbst nicht:

1. Tag und Commit prüfen;
2. die im Tag enthaltene operative Laufzeit-Allowlist `scripts/release-files.txt` lesen und sicher validieren;
3. ein exklusiv gesperrtes lokales Staging-Verzeichnis anlegen und ausschließlich die Allowlist per `git archive` aus dem Tag extrahieren;
4. `RELEASE.txt` erzeugen;
5. deterministisch sortierte SHA-256-Prüfliste über `site/` und `RELEASE.txt` erzeugen;
6. Prüfliste lokal verifizieren;
7. Dateianzahl und Gesamtgröße festhalten;
8. Dateien auf `0444` und Verzeichnisse auf `0555` härten;
9. das geprüfte Staging ohne Überschreiben unter `tmp/releases/<release-id>/` finalisieren und danach nicht mehr verändern.

Es wird nicht minifiziert, kompiliert oder gebündelt. „Build“ bedeutet bei FRECKA in diesem Stand ausschließlich prüfen, selektiv kopieren und verifizieren.

`RELEASE.txt` wird ausschließlich aus dem Tag, dem getaggten Quellstand und der darin versionierten Freigabenotiz abgeleitet. Als Zeitpunkt wird der UTC-Zeitpunkt des annotierten Tags verwendet. Aktuelle Uhrzeit, lokaler Benutzername oder Rechnername dürfen seinen Inhalt nicht bei jedem erneuten Lauf verändern. Die Automation prüft in zwei isolierten Klonen, dass derselbe Tag dieselben Site-Dateien, dieselbe `RELEASE.txt` und dieselbe `SHA256SUMS` erzeugt.

Das Artefakt wird zunächst unter einem versteckten `.build-<release-id>.*`-Namen erstellt. Eine exklusive `.publish-<release-id>.lock` verhindert zwei gleichzeitige lokale Finalisierungen. Bei einem Fehler entfernt der Builder ausschließlich sein eigenes unvollständiges lokales Staging; ein finaler Release-Name entsteht erst nach vollständiger Inhalts-, Bytegleichheits-, Prüfsummen- und Rechteprüfung.

Der annotierte Tag `v0.10.8` zeigt auf den vollständigen Versionsstand `6056e64`; sein unveränderliches Artefakt bleibt wegen des abgelehnten realen Updateabschlusses unverändert. Der korrigierte Tag `v0.10.9` zeigt auf `5b180b64ec75ab6f6c2ef53842ead45c6cc32b4a` und bestand den realen Update- und Offlinepfad. Der annotierte Tag `v0.10.10` zeigt auf `b3456bf1b5f4e6fff074e97acbaea994d064daac`; das unveränderliche Artefakt `0.10.10-b3456bf` validierte anschließend SERVICEWORKER-003 und den Ein-Befehl-Releaseprozess real. Der annotierte Tag `v0.11.0` zeigt auf `99a15113cfd589258928cad7b824f857c2be24d9`; das real abgenommene Artefakt `0.11.0-99a1511` bleibt unverändert erhalten. Der annotierte Tag `v0.11.1` zeigt auf `3a4ff5768afc1aebfbc75ca700c1854d3476ccb6`; das real abgenommene Artefakt `0.11.1-3a4ff57` bleibt unverändert erhalten. Der annotierte Tag `v0.11.4` zeigt auf `e628c116682cc76b33fb6273191eef4c82875946`; das real abgenommene Artefakt `0.11.4-e628c11` ist die aktuelle stabile Beta-Basis. Historische Tags und Artefakte werden durch RELEASE-AUTOMATION-001 weder umbenannt noch neu erzeugt.

Das real abgenommene Artefakt `0.11.4-e628c11` / `BACKUP-006` ist die unmittelbare freigegebene Beta-Basis. Die bereitgestellten Releases `0.11.2-a959ec6` / `ONBOARDING-001` und `0.11.3-a8380a0` / `BACKUP-005` bleiben nach real fehlgeschlagenen iPhone-Backuptests gesperrt. Der vorbereitete Geräteprüfungsstand `0.11.5` / `LICENSE-005` ergänzt gegenüber 0.11.4 ausschließlich DOCUMENT-001, die getrennte lokale Lizenzruntime sowie notwendige Versions-, Cache-, Diagnose-, Test- und Releaseanpassungen; seine Freigabenotiz steht unter `docs/releases/0.11.5.md`. Das Datenbankschema steigt additiv von 5 auf 6, Backupformat, AES-GCM/PBKDF2, Geschäftsdaten und der SERVICEWORKER-003-Regressionsschutz bleiben unverändert.

### 7.4 Unveränderlichkeit

- Eine Release-ID darf auf der Synology nur einmal angelegt werden.
- Ein bereits vorhandenes Ziel führt zum Abbruch, niemals zum Überschreiben.
- Änderungen erzeugen eine neue Version beziehungsweise Vorabnummer.
- `http` erhält nur Leserechte.
- Prüfsummen werden nach der Übertragung erneut geprüft.
- Ein fehlgeschlagener Upload wird als unvollständig verworfen und niemals einem Portal zugeordnet.

## 8. Beta-Deployment

### 8.1 Voraussetzungen

- sauberer Release-Tag;
- vollständiger lokaler Prüfnachweis;
- lokal verifiziertes Artefakt;
- funktionierendes Beta-HTTPS-Portal auf einer von Produktion getrennten Origin;
- geklärter Beta-Zugang;
- vorhandene Rückfallversion des Beta-Portals.

### 8.2 Übertragung

Die Übertragung startet immer aus dem lokalen Release-Staging, nie aus einem beliebigen Arbeitsverzeichnis. Bevorzugt wird ein authentisierter Dateiübertragungsweg mit einem eigenen Deployment-Konto. Der konkrete Transport kann später manuell oder automatisiert sein; entscheidend sind folgende Eigenschaften:

- verschlüsselte Verbindung;
- eindeutiges Zielverzeichnis;
- kein Überschreiben vorhandener Release-IDs;
- keine Übertragung von `.git/`, Tests oder Arbeitsdateien;
- Prüfsummenvergleich nach der Übertragung;
- Deployment-Konto getrennt von der Web-Station-Laufzeitgruppe `http`.

DEPLOY-005 konkretisiert den manuellen Beta-Transport über SSH/SCP; DEPLOY-006 legt den Rechte-Lifecycle für Staging und finales Release verbindlich fest. Der Transport erfolgt ausschließlich über LAN oder VPN mit dem lokalen SSH-Alias `frecka-synology`; ein öffentlicher SSH-Port ist weder erforderlich noch zulässig. Hostname, Deployment-Benutzer und IdentityFile bleiben in `~/.ssh/config`. Das lokale Skript `scripts/deploy-beta.sh` verwendet die feste DSM-Zielbasis `/volume1/web/FRECKA/releases/`; Zugangsdaten, Passwörter und private Schlüssel stehen niemals in Repository oder Release-Artefakt.

Der normale Ablauf für einen bereits geprüften, freigegebenen und nach `origin/main` gepushten Kandidaten ist:

```sh
./scripts/release-beta.sh
```

Der Orchestrator verwendet vor Tag-Erzeugung den rein lesenden Zieltest `scripts/deploy-beta.sh --check-target <release-id>`. Dieser prüft über denselben SSH-Alias dieselbe Zielbasis, benötigte Serverwerkzeuge sowie freie Staging-, Sperr- und Zielpfade, benötigt aber noch kein lokales Artefakt und verändert die Synology nicht.

Für die bewusste Diagnose oder Wiederaufnahme eines bereits vorhandenen, korrekt getaggten Artefakts bleibt der bestehende Transportvertrag unverändert:

```sh
./scripts/deploy-beta.sh --dry-run 0.10.0-dc55cf0
./scripts/deploy-beta.sh 0.10.0-dc55cf0
```

Der erste Aufruf prüft das lokale Artefakt, den SSH-Zugang, die serverseitigen Voraussetzungen, einen No-Clobber-Namenswechsel und freie Staging-, Sperr- und Zielpfade, verändert aber keine Datei auf der Synology. Erst der zweite, ausdrücklich gestartete Aufruf reserviert `.upload-<release-id>` mit Modus `0700`, überträgt `RELEASE.txt`, `SHA256SUMS` und `site/` per SCP und verifiziert Dateibestand sowie `SHA256SUMS` serverseitig. Danach werden Dateien auf `0444` und Verzeichnisse auf `0555` gehärtet. Nur der vollständig geprüfte und bereits schreibgeschützte Stand wird ohne Überschreiben unter dem finalen Release-Namen veröffentlicht. Das Skript verändert weder den Modus des Elternverzeichnisses noch ACLs und verwendet weder `sudo` noch pauschale `0777`-Rechte. Vorhandene Ziel- oder Staging-Pfade führen zum Abbruch; unvollständige Uploads werden weder automatisch gelöscht noch überschrieben.

Scheitert der Orchestrator vor dem Tag, entsteht weder Tag noch Artefakt noch Upload. Scheitert der Tag-Push, bleibt der lokale annotierte Tag zur manuellen Zustandsprüfung erhalten und wird nicht automatisch gelöscht. Scheitert ein späterer Schritt, bleiben ein bereits veröffentlichter Tag und ein bereits finalisiertes lokales Artefakt unverändert; die Ausgabe benennt den erreichten Zustand. Ein fehlgeschlagener Dry-Run startet niemals den echten Upload. Es gibt keine automatische Wiederholung und keinen automatischen Rollback.

Das Skript ändert weder den Beta-Virtual-Host noch Produktivkonfigurationen. Die Aktivierung bleibt ein getrennter manueller Infrastrukturschritt nach erfolgreicher Übertragung und Prüfung.

### 8.3 Aktivierung

1. neues Release vollständig neben allen bestehenden Releases ablegen;
2. serverseitige Prüfsummen prüfen;
3. sicherstellen, dass das neue Verzeichnis nicht beschreibbar ausgeliefert wird;
4. statischen Webdienst auf das neue `site/` vorbereiten;
5. nur das Beta-Portal auf diesen Dienst beziehungsweise Document Root umstellen;
6. Beta-Origin neu laden und Basisprüfung durchführen.

Da das neue Release vor dem Portalwechsel vollständig vorhanden ist, beschränkt sich die Downtime auf den kurzen Konfigurationswechsel. Bestehende Browser-Sitzungen behalten ihren bereits geladenen Code; neue Seitenaufrufe erhalten den neuen Stand.

SERVICEWORKER-002 enthält in 0.10.9 für bereits ausgelieferte 0.10.0-/0.10.1-Clients ohne Update-UI noch die einmalige, ausdrücklich freigegebene Übergangsregel. Die reale Altclient-Übergangsabnahme ist mit 0.10.9 bestätigt. SERVICEWORKER-003 entfernt deshalb in 0.10.10 sowohl `LEGACY_AUTO_ACTIVATION_FOR_SERVICEWORKER_002` als auch die davon ausgelöste Installations-Autoaktivierung. `scripts/release-beta.sh` behält die Erkennung als Regressionsschutz. Reguläre Worker warten nun ausnahmslos auf die bewusste `SKIP_WAITING`-Nachricht; die Regel ist nicht Teil des normalen Releaseablaufs.

### 8.4 Beta-Abnahme

Auf Beta werden mindestens geprüft:

- sichtbare Version und Buildkennung;
- Manifest, Icons und alle statischen Assets;
- frischer Start ohne vorhandene Browserdaten;
- Upgrade mit repräsentativen Daten einer unterstützten Vorversion;
- Backup vor Upgrade und Restore in einer getrennten Testumgebung;
- Kernabläufe, PDF, QR, Share und Public Viewer;
- Offline-Kaltstart, App-Shell-Vollständigkeit und Service-Worker-Wechsel;
- iOS/iPadOS, Android und unterstützte Desktopbrowser;
- keine Geschäftsdatenübertragung an die Synology;
- keine Konsolen- oder Serverfehler.

Das Ergebnis wird ausdrücklich als freigegeben oder abgelehnt festgehalten. Bei Ablehnung bleibt das Artefakt unverändert archiviert; ein korrigierter Stand erhält eine neue Version.

### 8.5 Aktueller Beta-Abnahmenachweis

Für `0.9.1-26dc63f` ist die reale iPhone-Abnahme einschließlich Online-Start, Offline-Kaltstart, lokaler Datennutzung, Offline-Belegerstellung, Neustart mit wieder aktiviertem Netz sowie PDF-/QR-/Belegansicht bestanden. Der releasebezogene Nachweis und die klare Abgrenzung zur noch ausstehenden Produktivfreigabe stehen in `docs/releases/0.9.1.md`.

`0.10.9-5b180b6` hat auf einem echten iPhone als installierte Home-Screen-PWA den korrigierten UPDATE-001b-Wechsel bestanden. Offline-Kaltstart, Offline-Belegerstellung sowie vorhandene und offline neu erzeugte lokale Daten blieben nach vollständigem Beenden und Rückkehr ins Netz verfügbar. Damit war die Altclient-Übergangsabnahme bestätigt. `0.10.10-b3456bf` entfernte anschließend die einmalige Legacy-Brücke und validierte SERVICEWORKER-003 sowie den lokalen Ein-Befehl-Releaseprozess real. Die nachfolgenden, real abgenommenen Releases 0.11.0 und 0.11.1 bleiben historisch erhalten; aktuelle stabile Beta-Basis ist `0.11.4-e628c11`. Eine Produktivfreigabe für `app.frecka.app` folgt daraus nicht. Offene Produkt-/UX-Beobachtungen werden zentral in `PROJECT.md` geführt und verändern die geprüften Artefakte nicht.

## 9. Produktiv-Deployment

### 9.1 Freigabegate

Produktion darf nur aktiviert werden, wenn:

- das exakte Release-Artefakt auf Beta bestanden hat;
- die finale Produktversion im Artefakt steht;
- ein aktuelles, lokal erzeugtes verschlüsseltes Backup für migrationsbetroffene Test- beziehungsweise Zielgeräte vorgesehen ist;
- Upgrade- und Rückweg dokumentiert sind;
- keine unbekannte nicht rückwärtskompatible Datenmigration besteht;
- eine benannte Person die Produktivfreigabe erteilt hat;
- das vorherige Produktiv-Release vollständig vorhanden ist.

### 9.2 Promotion

1. Release-ID und Prüfsummen mit dem freigegebenen Beta-Artefakt vergleichen;
2. keine Datei kopieren, ändern oder neu erzeugen;
3. Produktivportal auf dasselbe unveränderliche `site/` umstellen;
4. HTTPS-, Startseiten-, Manifest- und Kernfunktions-Smoke-Test durchführen;
5. sichtbare Version und Buildkennung kontrollieren;
6. vorheriges Portalziel und Zeitpunkt im Betriebsnachweis festhalten.

Die Promotion ist ein Infrastrukturwechsel, kein neuer Build. Dadurch sind Beta- und Produktionscode bytegleich.

### 9.3 Nachkontrolle

Unmittelbar nach dem Portalwechsel:

- Start der App und Public-Viewer-Route;
- Laden aller statischen Assets;
- keine 404-/MIME-/Konsolenfehler;
- keine unerwartete Update- oder Migrationsschleife;
- Bearbeitung eines ausschließlich fiktiven Testfalls;
- Erreichbarkeit der vorherigen Rollbackversion.

Produktive Kundendaten werden für einen Server-Smoke-Test weder hochgeladen noch kopiert.

## 10. Rollback

### 10.1 Code-Rollback

Ein Code-Rollback erfolgt durch Rückstellen des Produktivportals auf den zuvor dokumentierten Document Root:

1. weitere Promotionen stoppen;
2. Fehler und betroffene Version festhalten;
3. prüfen, ob der vorherige Code das bereits verwendete IndexedDB-Schema lesen kann;
4. Produktivportal auf das unveränderte Vorgänger-Release zurückstellen;
5. Smoke-Test ausführen;
6. fehlgeschlagenes Release nicht löschen oder verändern;
7. Fehler im Repository über einen Fix- beziehungsweise Hotfix-Branch korrigieren.

Der Portalwechsel minimiert die Downtime und benötigt keine Dateioperation im aktiven Release.

### 10.2 Datenmigrationen

Die Synology besitzt keine Kundendaten und kann lokale IndexedDB-Migrationen nicht zentral zurückrollen. Deshalb gilt:

- Ein Code-Rollback ist nur freigegeben, wenn die alte Version das neue lokale Schema sicher versteht.
- Destruktive oder nicht rückwärtskompatible Migrationen benötigen vor dem Release einen eigenen, getesteten Wiederherstellungsplan.
- Ein Kundenbackup wird niemals automatisiert oder zentral durch die Synology wiederhergestellt.
- Restore bleibt eine bewusste lokale Nutzeraktion.
- Ist die Schema-Kompatibilität unklar, wird nicht blind zurückgeschaltet. Stattdessen folgt ein vorwärtsgerichteter Patch-Release.

### 10.3 Hotfix

Ein Hotfix startet vom produktiven Tag:

1. `fix/<thema>` beziehungsweise Hotfix-Branch vom Produktivtag;
2. kleinstmögliche Korrektur;
3. vollständige relevante Regression;
4. neue Patchversion;
5. neuer Tag und neues Artefakt;
6. Beta-Abnahme;
7. Promotion desselben Artefakts nach Produktion.

Auch im Notfall gibt es keine Direktänderung auf der Synology.

## 11. Release-Archivierung

### 11.1 Zwei Ebenen

Jedes Release besitzt:

1. **Quellnachweis im Master-Repository:** Commit, annotierter Tag und versionierte Release-Notiz;
2. **auslieferbares Archiv auf der Synology:** unveränderliches `site/`, `RELEASE.txt` und `SHA256SUMS`.

Der Tag beweist, aus welchem Quellstand gebaut wurde. Die Prüfliste beweist, welche Bytes archiviert und ausgeliefert wurden. Sie ist ohne spätere Signatur noch kein kryptografischer Herkunftsnachweis.

### 11.2 Aufbewahrung

- Das aktuell produktive Release und sein unmittelbarer Rückfallstand dürfen nicht gelöscht werden.
- Ein Release mit noch unterstütztem Datenmigrationspfad bleibt verfügbar.
- Produktiv veröffentlichte Tags werden dauerhaft erhalten.
- Beta-Artefakte dürfen erst nach einer festgelegten Aufbewahrungsfrist, fehlenden Portalreferenzen und abgeschlossener Fehleranalyse entfernt werden.
- Löschen erfolgt nie als Teil eines normalen Deployments.
- Die endgültige Aufbewahrungsdauer ist eine betriebliche Entscheidung und wird nicht in diesem Dokument erfunden.

### 11.3 Reproduzierbarkeit

Zur Reproduktion werden benötigt:

- Master-Repository mit Release-Tag;
- dokumentierte Laufzeit-Allowlist;
- Version und Commit;
- `RELEASE.txt`;
- Prüfschritte und Prüfergebnis;
- keine nicht dokumentierte Datei von einem Entwicklerrechner oder der Synology.

`scripts/build-release.sh` erzeugt die ausgelieferten Dateiinhalte reproduzierbar aus Tag, getaggter Allowlist und getaggtem Freigabenachweis. Dateisystemzeitstempel sind kein Integritätsmerkmal; maßgeblich bleiben der vollständige Dateibestand, die Bytegleichheit mit dem Tag und die archivierten SHA-256-Werte.

## 12. Updates über die Synology

SERVICEWORKER-002 implementiert den lokalen Browser-Lifecycle innerhalb einer bereits aufgerufenen Deployment-Origin: eine Online-Prüfung pro Start, Erkennung eines wartenden Workers, Nutzerhinweis, bewusste `SKIP_WAITING`-Nachricht und genau einen Reload nach erfolgreicher Übernahme. UPDATE-001 ergänzt den Rennfall eines bereits aktivierten Ersatzworkers, begrenzte Fehlerzustände und „Später erinnern“. UPDATE-001b verifiziert ausschließlich während des laufenden, ausdrücklich gestarteten Updateversuchs zusätzlich Worker-, Registration- und Controllerstand. UPDATE-002 stellt denselben Controller zusätzlich unter **Einstellungen → Update** für eine bewusste manuelle Prüfung bereit; ein gefundenes Update verwendet weiterhin ausschließlich die bestehende Updatekarte, Aktivierungsnachricht und Einmal-Reload-Sperre. Damit hängt der Abschluss nicht mehr davon ab, dass nach dem Klick zwingend noch ein `statechange` oder `controllerchange` eintritt. Alle Erfolgssignale und Mehrfachtippen teilen weiterhin dieselbe Einmal-Reload-Sperre. Offline-Start, Public Viewer und IndexedDB bleiben davon unabhängig. Dies ist noch kein signierter, kanalbasierter Updateclient; deshalb bleibt der sichtbare Versionshinweis bis zu einem freigegebenen Metadatenformat bewusst allgemein.

Die spätere signierte PWA-Updatefunktion verwendet dieselben unveränderlichen Releases und ergänzt diesen Browser-Lifecycle um einen kontrollierten Auslieferungsweg:

```text
signierte Kanalmetadaten
→ Verweis auf unveränderliches Release
→ vollständiger Download
→ Integritäts- und Herkunftsprüfung
→ Aktivierung außerhalb offener Vorgänge
→ alter funktionsfähiger App-Shell-Stand bleibt als Rückfall erhalten
```

Vorgesehene Kanäle sind technisch `beta` und `stable`. Ihre endgültige Produktsemantik, Updatefrequenz und Nutzersteuerung müssen vor Implementierung freigegeben werden.

Der spätere Kanal- und Authentizitätsblock muss mindestens festlegen:

- kanonische Update-Origin und CORS-Regeln;
- Format und Version der Kanalmetadaten;
- kryptografische Signatur und Schlüsselrotation;
- Zuordnung von App-, Datenbank- und Mindestversionen;
- vollständige Asset-Integrität;
- Service-Worker-Lebenszyklus;
- gestaffelte oder manuelle Aktivierung;
- Fehler-, Offline- und Rollbackverhalten;
- Schutz offener Belege und lokaler Geschäftsdaten.

Die Update-Origin nimmt keine Kunden-, Beleg-, Lizenz- oder Nutzungsdaten entgegen. Eine reine Abrufprotokollierung des Webservers muss datensparsam konfiguriert und betrieblich bewertet werden.

## 13. Lizenzdienst für V1.0

Der Lizenzdienst ist für V1.0 vorgesehen, aber keine Voraussetzung für die erste statische Bereitstellung von Landingpage, Beta und App. Er ist kein Bestandteil des statischen Release-Artefakts und wird als eigener Dienst mit eigener Origin, eigener Laufzeit, eigener zweckgebundener Datenhaltung und eigenem Deploymentzyklus behandelt.

Das verbindliche Grundmodell steht in `docs/adr/ADR-0004-lizenzmodell-v1.md`: Eine Lizenz gehört genau einem Mandanten beziehungsweise einer Filiale und erlaubt genau ein gleichzeitig aktives Gerät. Gerätewechsel erfolgt über kontrollierte Deaktivierung oder Übertragung; Mehrgerätebetrieb ist frühestens für eine spätere 2.x-Version vorgesehen. Die angenommene ADR-0005 und `docs/licensing-contract.md` ergänzen Trial, serverautorisierte Gerätebindung, signierte Offline-Nachweise, Payment-Grenze und Entitlements, ohne bereits einen Dienst zu implementieren.

Verbindliche Grenzen:

- nicht unter dem Document Root der Produktiv- oder Beta-PWA;
- keine Lizenz- oder Signaturschlüssel im Browsercode;
- keine Geschäfts-, Beleg-, Gutschein- oder Kundendaten im Lizenzdienst;
- versionierte API;
- TLS und getrennte Dienstzugänge;
- Ausfall des Lizenzdienstes darf lokale Daten nicht gefährden;
- verifizierte E-Mail, 24/72-Stunden-Trialgrenzen, 30/180-Tage-Kaufgrenzen und das begrenzte Altgeräte-Risiko sind durch LICENSE-004 verbindlich angenommen;
- Lizenzstatus darf nicht durch heimliche Telemetrie ersetzt werden;
- Beta und Produktion verwenden getrennte Konfigurationen beziehungsweise Mandantenbereiche.

Vor öffentlichem Betrieb müssen Datenschutz-/Aufbewahrung, Serverruntime, Schlüsselbetrieb, Paymentprovider, Supportprozess, DSM-Kompatibilität, Monitoring, Serverbackup und Incident Response freigegeben werden. Bis zu einem eigenen Umsetzungsblock werden weder Serverordner noch API-Platzhalter angelegt.

## 14. Mailrelay für V1.0

Das Mailrelay ist für V1.0 vorgesehen, aber keine Voraussetzung für die erste statische Bereitstellung von Landingpage, Beta und App. Es ist ein separater Serverdienst und kein Teil des statischen PWA-Releases.

Verbindliche Grenzen:

- eigene Origin und eigener Deploymentzyklus;
- SMTP-/Provider-Zugangsdaten ausschließlich serverseitig;
- keine Zugangsdaten in App, Git, Release-Artefakt oder Public Document Root;
- Versand nur nach ausdrücklicher Nutzeraktion;
- klar definierte Übergabedaten aus der bestehenden Dokumentenengine;
- Transportverschlüsselung, Größenlimits und Eingabevalidierung;
- keine falsche Zustellbestätigung;
- datensparsame Logs ohne Dokumentinhalt;
- definierte Lösch-, Retry- und Aufbewahrungsregeln;
- kein ungefragtes dauerhaftes Belegarchiv auf der Synology.

Vor Umsetzung müssen Provider, Absenderidentität, Rechtsgrundlage, Auftragsverarbeitung, Queue-/Retry-Verhalten, maximale Anhänge und Löschfristen entschieden werden. Der jetzige Deployment-Workflow reserviert dafür keine produktive Infrastruktur.

## 15. Spätere CI-Unterstützung

Eine spätere CI darf den jetzt lokal orchestrierten Workflow übernehmen, aber nicht dessen Sicherheitsregeln ändern. Ihre Stufen entsprechen exakt:

```text
validate
→ test
→ package allowlist
→ generate release metadata
→ checksum/sign
→ deploy beta
→ manual approval
→ promote exact artifact
→ smoke test
→ archive
```

Anforderungen an eine spätere CI:

- Ausführung ausschließlich für bekannte Commits und Tags;
- reproduzierbare, versionierte Laufzeitumgebung;
- keine Geschäfts- oder Testkundendaten;
- Secrets außerhalb des Repositorys;
- schreibgeschützte Artefakte;
- geschütztes Produktiv-Gate mit manueller Freigabe;
- keine Neubildung des Artefakts bei Promotion;
- vollständige Protokollierung von Commit, Prüfsummen und Ziel;
- getrennte Beta- und Produktionszugänge;
- fehlgeschlagene Stufen stoppen die Pipeline;
- Rollback bleibt ein bewusster, protokollierter Vorgang.

In diesem Block werden weder Workflowdateien noch Runner, Actions, Hooks oder Zugangsdaten eingerichtet.

## 16. Betriebschecklisten

### 16.1 Release-Kandidat

- [ ] Arbeitsverzeichnis sauber
- [ ] Version und Build konsistent
- [ ] finaler Commit auf `main`
- [ ] vollständige lokale Tests bestanden
- [ ] Migrationen und Rückweg dokumentiert
- [ ] annotierter, unveränderlicher Tag
- [ ] Artefakt ausschließlich aus Allowlist
- [ ] `RELEASE.txt` vollständig
- [ ] lokale Prüfsummen bestanden

### 16.2 Beta

- [ ] getrennte Beta-Origin
- [ ] Release-ID auf Server noch nicht vorhanden
- [ ] Upload vollständig
- [ ] serverseitige Prüfsummen bestanden
- [ ] Beta-Portal umgestellt
- [ ] Browser- und Zielgerätetests bestanden
- [ ] Upgrade und Backup/Restore geprüft
- [ ] Ergebnis ausdrücklich freigegeben

### 16.3 Produktion

- [ ] exakt dasselbe Artefakt wie Beta
- [ ] benannte Produktivfreigabe
- [ ] Vorgänger-Document-Root dokumentiert
- [ ] Schema-Rollbackfähigkeit geklärt
- [ ] Produktivportal umgestellt
- [ ] Smoke-Test bestanden
- [ ] vorheriges Release weiterhin vorhanden
- [ ] Release und Tag archiviert

### 16.4 Rollback

- [ ] Fehler und Version dokumentiert
- [ ] Schema-Kompatibilität geprüft
- [ ] Vorgänger-Release unverändert vorhanden
- [ ] Portal zurückgestellt oder Vorwärts-Patch gewählt
- [ ] Smoke-Test bestanden
- [ ] keine Serverdatei manuell repariert
- [ ] Fix im Repository begonnen

## 17. Freigaben, die reale Deploymentstufen blockieren

Domain `frecka.app`, statische Hosts, realer Zielpfad `/web/FRECKA/`, Synology-Rolle und Lizenzgrundmodell sind entschieden. Die jeweils betroffene Deploymentstufe muss dennoch anhalten, bis folgende Betriebsfragen geklärt sind:

1. HTTPS-Zertifikate und Zuordnung für den jeweiligen Host;
2. Beta-Zugangsmodell und benannte Beta-/Produktivfreigabe;
3. minimale DSM-/ACL-Rechte des eingerichteten Deployment-Kontos regelmäßig prüfen und einen späteren Wechsel von Passwort- auf Schlüsselanmeldung getrennt planen;
4. Aufbewahrungsfristen für Beta- und Produktivreleases;
5. verbindlich unterstützte Browser und Geräte;
6. Service-Worker-/Updateformat einschließlich Signatur und Schlüsselverwaltung;
7. dokumentierte DSM-Upgrade- und Kompatibilitätsprüfung vor neuen dynamischen öffentlichen Diensten;
8. Datenschutz-, Key-, Runtime-, Support- und Betriebsfreigaben aus dem LICENSE-004-Vertrag für den Lizenzdienst;
9. Mailrelay-Provider sowie Datenschutz-, Queue- und Löschregeln.

Diese Entscheidungen werden nicht geraten. Sie blockieren keine lokale Entwicklung und keine Dokumentation, wohl aber die jeweils betroffene öffentliche Infrastruktur.

## 18. Verbindliche Begleitdokumente

- `docs/architecture/FRECKA_Infrastructure_Blueprint_V1.0.md`;
- `docs/architecture/deployment-synology.md`;
- `docs/adr/ADR-0003-synology-als-infrastrukturplattform.md`;
- `docs/adr/ADR-0004-lizenzmodell-v1.md`;
- `docs/adr/ADR-0005-trial-lizenzdienst-und-entitlements.md`;
- `docs/licensing-contract.md`.
