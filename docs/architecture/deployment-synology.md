# FRECKA: Deployment- und Infrastrukturkonzept für Synology Web Station

Stand: 11. August 2026

Geltungsbereich: vorbereiteter Stand `0.10.8`, Build `UPDATE-001`; noch kein freigabefähiger Release-Tag oder Artefakt für 0.10.8

Der verbindliche Infrastrukturrahmen steht in `docs/architecture/FRECKA_Infrastructure_Blueprint_V1.0.md`. Dieses Dokument konkretisiert ausschließlich die statische Laufzeitmenge und ihre spätere Zuordnung zu Synology Web Station.

## 1. Zweck und Grenzen

Dieses Dokument leitet eine minimale spätere Bereitstellungsstruktur aus dem vorhandenen FRECKA-Projekt ab. Es verändert weder produktive Logik noch PWA-, Persistenz-, Backup-, Export-, Dokument-, QR- oder Share-Verhalten.

Weiterhin bewusst nicht angelegt sind:

- keine Landingpage;
- keine Beta-Kopie;
- keine Download- oder Update-Platzhalter;
- keine Serverkonfiguration;
- kein Build-Framework und keine extern nachgeladene Laufzeitabhängigkeit; freigegebene Vendor-Dateien werden fest versioniert lokal ausgeliefert.

Solche Artefakte sollen erst entstehen, wenn sie echten Inhalt beziehungsweise eine implementierte Funktion besitzen. Der Repository-Root bleibt Quell- und Entwicklungsverzeichnis und darf später nicht als Web-Station-Document-Root veröffentlicht werden.

## 2. Ist-Zustand

### 2.1 Projektstruktur

FRECKA ist eine statische Browseranwendung mit folgender Quellstruktur:

```text
FRECKA/
├── index.html
├── styles.css
├── manifest.webmanifest
├── service-worker.js
├── icons/
├── js/
├── vendor/
├── tests/
├── docs/
├── PROJECT.md
└── README.md
```

Die Anwendung besitzt kein `package.json`, keine Lockdatei, keinen Bundler, keinen Compiler, keinen Container, kein Makefile und keine CI-/Deploymentkonfiguration. Der Browser lädt klassische Skripte in der in `index.html` festgelegten Reihenfolge. `index.html` ist damit die verbindliche Laufzeit-Einstiegskante.

### 2.2 Produktive Laufzeitmenge

Für eine unveränderte statische Auslieferung werden nur folgende Dateien benötigt:

```text
index.html
styles.css
manifest.webmanifest
service-worker.js
icons/
  icon-192.png
  icon-512.png
js/
  app.js
  backup.js
  config.js
  data.js
  document-view.js
  documents.js
  export-package.js
  export.js
  persistence.js
  public-documents.js
  public-viewer.js
  pwa-update.js
  qr.js
  sharing.js
vendor/
  qrcodegen-v1.8.0-es6.js
  qrcodegen-v1.8.0.LICENSE.txt
  pdf-lib-v1.17.1.min.js
  pdf-lib-v1.17.1.LICENSE.md
  jszip-v3.10.1.min.js
  jszip-v3.10.1.LICENSE.markdown
```

Die Laufzeitmenge einschließlich Lizenztexte umfasst im aktuellen Stand rund 1,64 MB. Die drei lokal ausgelieferten Bibliotheken stimmen mit den in `vendor/README.md` dokumentierten SHA-256-Werten überein. Es gibt keine CDN-Abhängigkeit und keine vom Anwendungscode ausgelösten Server-/API-Aufrufe.

Nicht in ein produktives App-Document-Root gehören:

- `.git/`, `.gitignore` und lokale Metadaten;
- `tests/` und Test-Fixtures;
- `tmp/` und erzeugte Prüfartefakte;
- `docs/`, `PROJECT.md` und die Entwicklungs-README;
- Sicherungen, Exporte oder sonstige Geschäftsdaten.

Die Lizenzdateien der tatsächlich verteilten Vendor-Dateien bleiben dagegen Bestandteil des Release-Artefakts.

### 2.3 Modul- und Ladeverhalten

Die Anwendung wird ohne Build-Schritt direkt ausgeliefert. Die Reihenfolge in `index.html` verbindet die globalen APIs:

```text
lokale Vendor-Dateien
→ Konfiguration
→ QR- und Dokumentenservices
→ Public-Payload, Share und Public Viewer
→ zentrale Laufzeitdaten und IndexedDB-Persistenz
→ Backup, Exportprojektion und ZIP-Paketadapter
→ PWA-Update-Erkennung
→ App-Start
```

Ein Deployment darf Skripte weder automatisch umsortieren noch einzeln minifizieren, umbenennen oder bündeln. Eine solche Änderung wäre ein eigener Entwicklungsblock und kein Infrastrukturvorgang.

Alle produktiven Pfade sind relativ. Manifest, Stylesheet, alle 17 Skriptdateien und die Service-Worker-Registrierung werden daher sowohl am Origin-Root als auch unter einem gemeinsamen Release-Unterpfad korrekt aufgelöst. Das Hash-Routing benötigt keine serverseitige Rewrite-Regel.

### 2.4 PWA-Status

Vorhanden sind:

- ein Web App Manifest mit relativem `start_url` und relativem `scope`;
- Icons in 192 × 192 und 512 × 512 Pixel;
- Standalone-Darstellung und Apple-Metadaten;
- ein produktiver Service Worker mit versionsgebundenem App-Shell-Cache;
- atomare Vorabablage aller zum Kaltstart benötigten statischen Dateien;
- Navigation-Fallback auf die gecachte `index.html`;
- Erkennung eines bereits wartenden oder neu installierten Workers;
- eine gezielte Updateprüfung bei einem Online-Start ohne Hintergrund-Polling;
- eine nichtblockierende Updateanzeige mit bewusster Aktivierungsaktion und genau einem kontrollierten Reload;
- lokale IndexedDB-Persistenz;
- ausschließlich lokale statische Laufzeitabhängigkeiten.

Noch nicht vorhanden beziehungsweise nicht produktionsreif sind:

- kein Release-/Update-Manifest;
- keine reproduzierbare automatische Release-Pipeline;
- kein eigener PWA-Installationsidentifikator im Manifest;
- keine Maskable-Icons;
- veraltete Manifesttexte wie „UX-Prototyp ohne echte Datenhaltung“;
- ein pro Code-Release bewusst zu aktualisierender Asset-Abfragewert.

`js/pwa-update.js` registriert im Auftrag von `js/app.js` den `service-worker.js` relativ zur ausgelieferten App-Adresse mit Scope `./`. Der Service Worker lädt die statische Laufzeit-Allowlist während der Installation vollständig in einen versionsgebundenen Cache. Schlägt dies fehl, wird die neue Version nicht installiert. Bei Aktivierung werden ausschließlich ältere Caches mit dem Präfix `frecka-app-shell-` gelöscht; fremde Cache-Storage-Inhalte und IndexedDB bleiben unverändert. Navigationen innerhalb des Scopes verwenden ausschließlich den aktuellen benannten App-Shell-Cache und dessen `index.html`, sodass die installierte App-Shell nach mindestens einem erfolgreichen Online-Start kalt offline starten kann.

SERVICEWORKER-002 berücksichtigt `registration.waiting` beim Start, beobachtet `updatefound` und `statechange` und ruft bei bestehender Online-Verbindung einmal `registration.update()` auf. Ein wartender Worker wird angezeigt, aber erst durch „Jetzt aktualisieren“ mit `{ type: "SKIP_WAITING" }` aktiviert. UPDATE-001 behandelt zusätzlich den einmaligen Legacy-Rennfall, in dem der neue Worker vor dieser Nutzeraktion bereits `activated` ist und der zugehörige `controllerchange` schon stattgefunden hat: Die bewusste Aktion löst dann direkt genau einen Reload aus. Im normalen Pfad lösen `activated` und `controllerchange` über dieselbe Sperre ebenfalls höchstens einen Reload aus. Bleibt Aktivierung oder Navigation aus, endet die Warteanzeige in einem wiederholbaren Fehlerzustand. „Später erinnern“ blendet den Hinweis in der laufenden Sitzung für 15 Minuten aus; es aktiviert keinen Worker und wird nicht dauerhaft gespeichert. Ohne Nutzeraktion gibt es weiterhin keinen Reload; offene Belegentwürfe und laufende lokale Schreibvorgänge blockieren die Aktion.

Der SERVICEWORKER-002-Worker besitzt zusätzlich eine **einmalige Legacy-Brücke**, weil bereits ausgelieferte 0.10.0-/0.10.1-Clients die neue Update-UI noch nicht enthalten und deshalb keine Aktivierungsnachricht senden können. Erst nachdem seine vollständige App-Shell erfolgreich gecacht ist, darf diese Brücke automatisch `skipWaiting()` ausführen. Sie verwendet ausdrücklich kein `clients.claim()` und löst keinen Reload aus; die laufende alte Sitzung wechselt damit nicht mitten im Betrieb auf neuen Anwendungscode. Da der reale Übergang der bereits ausgelieferten Altclients noch nicht dokumentiert bestätigt ist, bleibt die Brücke im 0.10.8-Worker fachlich unverändert erhalten. Sobald dieser Übergang real bestätigt wurde, müssen Legacy-Konstante und automatischer Installationsaufruf im unmittelbar folgenden Worker/Release entfernt werden. Die Nachrichtenbehandlung für bewusst ausgelöste spätere Updates bleibt bestehen.

Signierte Kanalmetadaten, ein Release-/Update-Manifest und ein serverseitiger Updatekanal bleiben spätere, getrennt freizugebende Bausteine.

Die alten Netlify-/ZIP-Hinweise im hinteren Teil der `README.md` dokumentieren historische Prototypstände. Sie bilden keinen reproduzierbaren aktuellen Releaseprozess und dürfen nicht als Synology-Anweisung verwendet werden.

### 2.5 Daten- und Origin-Grenze

Die produktive IndexedDB heißt `frecka`; der Standardmandant heißt `local-default`. IndexedDB, Cache Storage und spätere Service Worker sind an die Browser-Origin gebunden, nicht an einen URL-Pfad.

Daraus folgt eine verbindliche Sicherheitsregel:

> Produktive App und Beta-App müssen auf verschiedenen Origins betrieben werden.

`https://example.test/app/` und `https://example.test/beta/` wären nicht getrennt. Beide Anwendungen würden dieselbe IndexedDB sehen und könnten dieselben Geschäftsdaten sowie dasselbe Datenbankschema verändern. Geeignet sind getrennte HTTPS-Hostnamen, beispielsweise `app.<domain>` und `beta.<domain>`. Getrennte Ports wären technisch ebenfalls getrennte Origins, sind für die spätere öffentliche Bereitstellung jedoch weniger verständlich und werden nicht empfohlen.

Die leere `publicViewerBaseUrl` in `js/config.js` ist mit dieser Trennung kompatibel: Public-Links verwenden jeweils die aktuelle Deployment-Adresse. Ein Beta-Beleg verweist damit standardmäßig auf den Beta-Viewer. Ob Beta künftig öffentliche Kundenlinks der Produktiv-App verwenden darf, ist eine fachliche Entscheidung und wird hier nicht angenommen.

### 2.6 Release-Zustand und vorbereiteter Kandidat

Der annotierte Release-Tag `v0.9.1` zeigt auf Commit `26dc63fbea434d9fb33a7e88a6af0419cb8cddae`. Das unveränderliche Artefakt trägt die Release-ID `0.9.1-26dc63f` und bleibt die dokumentierte stabile Beta-Basis. Der Tag `v0.10.0` zeigt auf Commit `dc55cf06fdb00548307beb8efc6e6eaac6369840`.

Der annotierte Tag `v0.10.1` zeigt auf Commit `c195a099ef57af79177496f48d217247f2144175`; das daraus erzeugte unveränderliche Artefakt trägt die Release-ID `0.10.1-c195a09`. Der annotierte Tag `v0.10.2` zeigt auf Commit `18f41b5a47b93fee0efc086674e8d7e7007d14d8`; das daraus erzeugte und auf Beta bereitgestellte Artefakt trägt die Release-ID `0.10.2-18f41b5`. Der annotierte Tag `v0.10.3` zeigt auf Commit `3591b0b9f16534ce489b2a246d1c26c105c49477`; das daraus erzeugte und auf Beta bereitgestellte Artefakt trägt die Release-ID `0.10.3-3591b0b`. Der annotierte Tag `v0.10.4` zeigt auf Commit `2d5d3c4a6ae1ab3438bf9940dcc1928c204021fa`; das daraus erzeugte und auf Beta bereitgestellte Artefakt trägt die Release-ID `0.10.4-2d5d3c4`. Der annotierte Tag `v0.10.5` zeigt auf Commit `4a9bd007f6ede1696b41a6b7d29088f2ffab85aa`; das daraus erzeugte unveränderliche Artefakt trägt die Release-ID `0.10.5-4a9bd00`. Der annotierte Tag `v0.10.6` zeigt auf Commit `986a830bc4448e953cccbc46fc4a690f40e87436`; das daraus erzeugte unveränderliche Artefakt trägt die Release-ID `0.10.6-986a830`. Der annotierte Tag `v0.10.7` zeigt auf Commit `7d170cbf987afd11c279e4d29ca9eba7c33ab9e4`; das daraus erzeugte unveränderliche Artefakt trägt die Release-ID `0.10.7-7d170cb`.

UPDATE-001 ist im Fach-Commit `ba9fc32512ebbc63fe96c0717dece4b89931b84c` enthalten. Der vorbereitete Patchstand `0.10.8` verwendet den HTML-Titel `UPDATE-001`, den Asset-Abfragewert `update001-1` und den App-Shell-Cache `frecka-app-shell-0.10.8-update001-1`. Der bereits vorhandene annotierte Tag `v0.10.8` zeigt jedoch auf den Fach-Commit `ba9fc32` und wurde damit vor dem noch ausstehenden Versionsvorbereitungscommit angelegt. Er enthält die Versionssignale und `docs/releases/0.10.8.md` nicht. Entsprechend dem verbindlichen Tag-basierten Workflow ist dieser Tag in seinem aktuellen Stand keine zulässige Quelle für ein 0.10.8-Artefakt. Der Tag wird in diesem Vorbereitungsschritt weder verändert noch gelöscht; die weitere Behandlung ist vor Artefakterzeugung oder Deployment separat freizugeben.

Ein Updateformat für signierte Kanäle und ein Signaturverfahren sind ausdrücklich noch nicht implementiert. SERVICEWORKER-002 erkennt ausschließlich Änderungen des Service Workers innerhalb derselben bereits aufgerufenen Deployment-Origin.

### 2.7 Beta-Betriebsnachweis 0.9.1

Der reale Beta-Smoke-Test auf einem iPhone als installierte Home-Screen-PWA ist bestanden. Online-Start, Offline-Kaltstart im Flugmodus, Zugriff auf bestehende lokale Daten, Erstellung eines neuen Offline-Belegs und dessen Fortbestand nach vollständigem Beenden, erneuter Netzaktivierung und Neustart wurden bestätigt. PDF-, QR- und Belegansicht funktionierten; Backup und Wiederherstellung waren bereits im vorherigen realen Smoke-Test erfolgreich.

Bewertung: `0.9.1-26dc63f` ist für den Beta-Betrieb freigegeben und gilt als stabile Beta-Basis. Daraus folgt noch keine Produktivfreigabe für `https://app.frecka.app/`. Der vollständige Nachweis steht in `docs/releases/0.9.1.md`; die daraus konsolidierten offenen Produkt-/UX-Punkte stehen zentral in `PROJECT.md`.

## 3. Abgeleitete Deployment-Prinzipien

1. **Statisch:** Web Station liefert ausschließlich Dateien aus; PHP, Container und Serverdatenbank sind für FRECKA nicht erforderlich.
2. **Allowlist statt Repository-Kopie:** Ein Release enthält nur die in Abschnitt 2.2 benannte Laufzeitmenge.
3. **Unveränderliche Releases:** Ein freigegebenes Release-Verzeichnis wird nie in-place überschrieben.
4. **Promotion statt Neubau:** Beta und Produktion zeigen nach Freigabe auf exakt dasselbe bereits geprüfte Release-Artefakt.
5. **Origin-Trennung:** Produktiv und Beta erhalten getrennte HTTPS-Hostnamen.
6. **Read-only-Auslieferung:** Die Web-Station-Gruppe `http` benötigt nur Leserechte. Die Anwendung lädt keine Dateien auf die Synology hoch.
7. **Kein Kundendatenverzeichnis:** IndexedDB, Backups und Exporte verbleiben auf dem Endgerät beziehungsweise werden nur durch eine ausdrückliche Nutzeraktion an ein vom Nutzer gewähltes Ziel gegeben.
8. **Rollback durch Portalwechsel:** Ein Rückweg zeigt den Web-Station-Dienst wieder auf ein vollständig vorhandenes früheres Release. Es werden keine einzelnen Dateien zurückkopiert.
9. **Keine Kanalbehauptung:** `updates/` wird erst befüllt, wenn Format, Integrität und Authentizität eines eigenständigen Updatekanals umgesetzt sind. Die lokale Service-Worker-Erkennung allein ist kein signierter Updatekanal.

## 4. Empfohlene minimale Zielstruktur

`<web-share>` bezeichnet portabel den von Web Station verwendeten Web-Ordner. In Web Station entspricht die sichtbare Zielbasis `/web`; FRECKA verwendet darin bewusst die vorhandene Großschreibung `/web/FRECKA/`. Derselbe Ordner ist bei einem SSH-Deployment im DSM-Dateisystem unter `/volume1/web/FRECKA/` erreichbar. DEPLOY-002 schreibt deshalb ausschließlich nach `/volume1/web/FRECKA/releases/<release-id>/`.

```text
<web-share>/FRECKA/
├── public/
│   ├── index.html                 # spätere Landingpage
│   ├── docs/                      # nur veröffentlichte Nutzerdokumentation
│   ├── downloads/                 # nur tatsächlich angebotene Downloads
│   └── updates/                   # erst mit implementiertem Updateprotokoll
└── releases/
    ├── <release-id>/
    │   ├── site/                  # exakte Laufzeitmenge aus Abschnitt 2.2
    │   ├── RELEASE.txt            # Quellstand, Version und Prüfergebnis
    │   └── SHA256SUMS             # Prüfliste des vollständigen Artefakts
    └── <weiteres-release-id>/
        ├── site/
        ├── RELEASE.txt
        └── SHA256SUMS
```

Diese Baumdarstellung ist ein Zielbild, keine Aufforderung, leere Ordner anzulegen:

- Solange keine Landingpage existiert, wird `public/` nicht produktiv geschaltet.
- `docs/`, `downloads/` und `updates/` entstehen nur zusammen mit echten freigegebenen Inhalten.
- Für Produktiv und Beta werden keine doppelten Verzeichnisbäume benötigt. Beide Webportale zeigen jeweils auf das vollständige `site/` eines Release-Verzeichnisses.
- Ein Release darf von beiden Portalen verwendet werden, ohne kopiert zu werden.

Ein Release-Identifier muss eindeutig und dateisystemfreundlich sein. Verbindlich ist das Schema `<version>-<kurzer-git-commit>`, beispielsweise `0.10.8-1a2b3c4`. Die konkrete ID des vorbereiteten Kandidaten darf erst nach einem freigabefähigen Release-Tag gebildet werden.

## 5. Zuordnung zu Synology Web Station

Der reale Server ist eine DS218+ mit DSM 6.2.4. Diese Version verwendet in Web Station die Virtual-Host-Terminologie. Der bereits eingerichtete Landing-Host zeigt auf `web/FRECKA/public`. Nach einem späteren DSM-Upgrade müssen Bezeichnungen, Web-Station-Profile und Zuordnungen anhand der dann installierten Version erneut geprüft werden.

Für Website-Ordner benötigt die Gruppe `http` ausschließlich Leserechte. Ein DSM-Upgrade ist kein Bestandteil dieses Dokuments und darf wegen der vorhandenen Coaching- und Event-Systeme nur nach der im Blueprint festgelegten Kompatibilitätsprüfung erfolgen.

### 5.1 Dienste und Portale

| Zweck | Empfohlene Origin | Web-Station-Document-Root |
|---|---|---|
| Landingpage | `https://frecka.app/` | `/web/FRECKA/public/` |
| Produktive App | `https://app.frecka.app/` | `/web/FRECKA/releases/<freigegeben>/site/` |
| Beta-App | `https://beta.frecka.app/` | `/web/FRECKA/releases/<kandidat>/site/` |
| Dokumentation | `https://frecka.app/docs/` | Unterordner `public/docs/` |
| Downloads | `https://frecka.app/downloads/` | Unterordner `public/downloads/` |
| Updates | `https://frecka.app/updates/` | Unterordner `public/updates/` |

Landingpage, Dokumentation, Downloads und Updates teilen sich absichtlich einen statischen öffentlichen Document Root. Eigene Subdomains werden nur bei einem später nachgewiesenen technischen Bedarf eingeführt.

Produktiv und Beta werden dagegen als zwei namensbasierte HTTPS-Portale eingerichtet, auch wenn beide zeitweise dasselbe Release-Artefakt verwenden. Das trennt ihre Browserdaten zuverlässig.

### 5.2 Berechtigungen

- Der Deployment-Operator darf neue Release-Verzeichnisse schreiben.
- Die Web-Station-Gruppe `http` erhält rekursiv nur Leserechte auf veröffentlichte Document Roots.
- Schreibrechte für `http` sind für FRECKA nicht erforderlich.
- Repository, Backups, Exporte, private Dokumentation und Schlüsselmaterial liegen nie in einem Web-Document-Root.
- Das versteckte Upload-Staging gehört dem Deployment-Konto und besitzt während der Übertragung Modus `0700`.
- Nach bestandener serverseitiger Dateibestands- und SHA-256-Prüfung werden Release-Dateien auf `0444` und Release-Verzeichnisse auf `0555` gesetzt. Erst dieser bereits schreibgeschützte Stand erhält atomar seinen finalen Release-Namen.
- Das Deployment-Skript ändert weder Rechte des Elternverzeichnisses `/volume1/web/FRECKA/releases/` noch ACLs.

### 5.3 Manueller Beta-Upload über LAN/VPN

Der vorbereitete Transport verwendet keinen öffentlichen SSH-Port. Der Mac muss sich im lokalen Netz oder im VPN befinden. Das Skript verwendet ausschließlich den lokalen SSH-Alias `frecka-synology`; Hostname, Benutzer und IdentityFile bleiben in `~/.ssh/config`. Das Skript verwaltet weder Passwörter noch private Schlüssel und behält die normale Host-Key-Prüfung bei.

```sh
./scripts/deploy-beta.sh --dry-run <release-id>
./scripts/deploy-beta.sh <release-id>
```

Der Dry-Run prüft lokal `RELEASE.txt`, `SHA256SUMS`, `site/`, Release-ID, Dateivollständigkeit, alle SHA-256-Werte und den SCP-Client. Auf der Synology prüft er Zielbasis, Schreibrecht, SCP- und Prüfkommandos, die No-Clobber-Fähigkeit des finalen Namenswechsels sowie freie Staging-, Sperr- und Zielpfade, ohne etwas anzulegen. Der echte Lauf legt `/volume1/web/FRECKA/releases/.upload-<release-id>` exklusiv mit Modus `0700` an und überträgt `RELEASE.txt`, `SHA256SUMS` und `site/` als drei explizite SCP-Quellen. SCP übernimmt dabei nicht den schreibgeschützten Modus des lokalen Artefakt-Wurzelverzeichnisses. Nach bestandener Prüfung von Dateibestand und `SHA256SUMS` werden alle Dateien auf `0444` und alle Verzeichnisse auf `0555` gehärtet. Nur wenn kein Pfad mehr schreibbar ist, wird das bereits schreibgeschützte Staging ohne Überschreiben in `<release-id>` umbenannt. Andere Releases werden weder verändert noch gelöscht.

Ein fehlgeschlagener Upload bleibt ausschließlich unter seinem versteckten Staging-Namen und wird nie als finales Release ausgegeben. Je nach Fehlerzeitpunkt kann er unvollständig mit Modus `0700` oder bereits auf `0444`/`0555` gehärtet sein. Das Skript löscht ihn nicht automatisch und überschreibt ihn bei einem weiteren Lauf nicht. Bereinigung und Ursachenprüfung sind ein eigener bewusster Betriebsschritt. Web-Station-Portalwechsel und Produktiv-Promotion sind nicht Bestandteil des Skripts.

### 5.4 HTTPS und Browseranforderungen

Alle App-Portale benötigen gültiges HTTPS. Web Share, PWA-Installation und verschiedene Web-Crypto-/Browserfunktionen dürfen nicht auf unverschlüsseltes öffentliches HTTP angewiesen sein. HTTP wird auf HTTPS umgeleitet. HSTS wird erst aktiviert, nachdem Hostnamen, Zertifikate und HTTPS-Zugriff vollständig geprüft wurden.

Vor Freigabe sind mindestens folgende Antworten der Web Station zu kontrollieren:

- `index.html` wird als HTML ausgeliefert und nicht langfristig unveränderlich gecacht;
- `manifest.webmanifest` besitzt einen unterstützten Manifest-/JSON-MIME-Type;
- `service-worker.js` wird als JavaScript ausgeliefert, darf nicht auf einen fremden Pfad umgeleitet werden und wird nicht langfristig unveränderlich gecacht;
- JavaScript, CSS, PNG und Lizenztexte sind erreichbar;
- Hash-Routen bleiben nach Reload erhalten;
- der Public Viewer erhält die Fragment-Payload ausschließlich clientseitig;
- keine Verzeichnisauflistung ist aktiv;
- keine Quell-, Test- oder Git-Dateien sind öffentlich erreichbar.

Eine restriktive Content Security Policy und weitere Sicherheitsheader sind sinnvoll, müssen aber gegen PDF-Blob-URLs, Downloads, Share-Verhalten und die bestehende Skriptstruktur getestet werden. Sie werden nicht ungeprüft in diesem Strukturblock erfunden.

## 6. Minimaler Build- und Releaseprozess

Der vollständige operative Ablauf einschließlich Entwicklung, Versionierung, Beta, Produktion, Rollback und Archivierung steht in `docs/architecture/deployment-workflow.md`.

Da FRECKA keinen Build benötigt, bedeutet „Build“ ausschließlich **prüfen, selektiv kopieren und verifizieren**.

### Phase 1: Quellstand festlegen

1. sauberer Git-Stand;
2. eindeutiger Commit;
3. übereinstimmende Produktversion, Buildkennung und Asset-Abfragewerte;
4. dokumentierte Freigabe des Kandidaten.

### Phase 2: Prüfen

Mindestens:

- JavaScript-Syntax aller Laufzeit- und Testdateien;
- JSON-Syntax des Web App Manifests;
- `git diff --check`;
- vollständige Asset-Auflösung aus `index.html` und `manifest.webmanifest`;
- vorhandener Browser-Smoke-Test;
- Start am Root und in einem Unterverzeichnis;
- Service-Worker-Registrierung, vollständiger App-Shell-Cache und Offline-Navigation-Fallback;
- Public Viewer, PDF, QR, Share-Fallback, Backup und Export;
- keine Konsolenfehler;
- keine ungeplanten externen Netzwerkabhängigkeiten.

### Phase 3: Staging

1. neues Verzeichnis `releases/<release-id>/site/` anlegen;
2. ausschließlich die Allowlist aus Abschnitt 2.2 hineinkopieren;
3. `RELEASE.txt` nach dem verbindlichen Workflow erzeugen;
4. für `site/` und `RELEASE.txt` eine deterministisch sortierte `SHA256SUMS` erzeugen;
5. Prüfsummen unmittelbar gegen die Staging-Kopie prüfen;
6. vollständiges Release-Verzeichnis danach nicht mehr verändern.

Hierfür genügen vorhandene Betriebssystemwerkzeuge. Ein Node-Paket, Bundler oder Container ist nicht erforderlich.

### Phase 4: Beta

1. statischen Webdienst auf das neue `site/` zeigen lassen;
2. ausschließlich das Beta-Portal auf diesen Dienst umstellen;
3. HTTPS-, Browser-, PWA-, 320-/390-px- und reale Zielgerätetests durchführen;
4. auf einem echten iPhone die installierte Home-Screen-PWA mindestens einmal vollständig online starten, schließen, im Flugmodus erneut öffnen und die lokal vorhandenen Kunden, Belege und Gutscheine prüfen;
5. insbesondere IndexedDB-Migration, Backup/Restore und Public-Links prüfen;
6. Kandidaten bei einem Fehler nicht verändern, sondern einen neuen Release-Identifier bauen.

### Phase 5: Produktion

1. nach dokumentierter Freigabe das Produktivportal auf exakt dasselbe geprüfte `site/` umstellen;
2. kurze Produktivprüfung durchführen;
3. vorheriges Release vollständig behalten;
4. bei einem Codeproblem das Portal auf das vorherige Release zurückstellen.

Ein Code-Rollback kann keine bereits ausgeführte IndexedDB-Migration zurückdrehen. Vor Releases mit Datenbankschemaänderungen muss deshalb nachgewiesen sein, dass der vorherige Code das migrierte Schema noch sicher lesen kann oder dass ein eigener geprüfter Rückweg existiert.

## 7. Updates

Für den Updatekanal beschränkt sich die Rolle der Synology auf die Auslieferung statischer Programmdateien und späterer Update-Metadaten. Die nach ADR-0003 getrennten dynamischen Dienste sind davon unabhängig. SERVICEWORKER-002 erkennt neue Worker innerhalb derselben Deployment-Origin, zeigt einen nichtblockierenden Hinweis und aktiviert einen regulär wartenden Worker erst nach bewusster Nutzeraktion. Diese Browserfunktion benötigt weder einen Serverdienst noch eine zweite Datenhaltung und verändert keine IndexedDB-Daten.

Die einmalige Legacy-Brücke im SERVICEWORKER-002-Worker dient ausschließlich dem Übergang bereits ausgelieferter Clients, die diese Updateoberfläche noch nicht kennen. Sie darf nicht als allgemeine Updatepolitik kopiert werden. 0.10.8 behält sie nur deshalb fachlich unverändert bei, weil der reale Altclient-Übergang noch nicht bestätigt ist. Nach dieser Bestätigung ist ihre Entfernung im unmittelbar folgenden Worker/Release ein zwingendes Release-Gate. Danach gilt ausschließlich: vollständig installieren → Hinweis anzeigen → Nutzeraktion → `SKIP_WAITING` → genau ein Reload. `clients.claim()` und automatische Reloads bleiben ausgeschlossen.

Ein signierter kanalbasierter Updateclient ist damit noch nicht umgesetzt. Daher werden weiterhin weder Dateinamen noch JSON-Felder eines vermeintlichen Update-Manifests festgelegt.

Vor Befüllung von `public/updates/` müssen separat entschieden und umgesetzt werden:

- Kanalmodell für Produktion und Beta;
- Semantik von Version und Build;
- kanonische Update-URL und erforderliche CORS-Regeln;
- vollständige Dateiliste und Integritätsprüfung;
- kryptografische Authentizität beziehungsweise Vertrauenskette;
- Herkunftsprüfung vor der Bereitstellung im bestehenden kontrollierten Service-Worker-Lebenszyklus;
- Kompatibilitätsentscheidung vor der bereits nutzergesteuerten Aktivierung;
- Kompatibilität zu IndexedDB-Schemata und Rückweg;
- Aufbewahrungs- und Löschregel alter Releases.

SHA-256-Dateiprüfungen sichern den Transport beziehungsweise die Staging-Konsistenz, ersetzen aber keine signierte Updateherkunft.

## 8. Noch erforderliche betriebliche Freigaben

Domain, Hostmodell, reale Pfadbasis, Lizenzmodell und grundsätzliche Synology-Rolle sind im Blueprint und in ADR-0003/ADR-0004 entschieden. Eine reale nächste Freigabestufe muss dennoch anhalten, bis die jeweils betroffenen Betriebsfragen geklärt sind:

1. Zertifikatsausstellung und konkrete Zuordnung für jeden freigegebenen Host;
2. Zugriffsschutz und Freigabekreis der Beta-Origin;
3. Deployment-Konto, Übertragungsweg und minimale Rechte;
4. öffentliche Inhalte, Impressum und Datenschutzangaben der Landingpage;
5. Updateformat sowie Signatur- und Schlüsselarchitektur;
6. Release-Aufbewahrung und verantwortliche Produktivfreigabe;
7. DSM-Upgrade- und Kompatibilitätsplan vor Mailrelay oder Lizenzdienst;
8. Provider-, Datenschutz-, Queue- und Löschregeln des Mailrelays;
9. Offline-Kulanz sowie Aktivierungs- und Übertragungsprotokoll des Lizenzdienstes.

Diese Punkte werden nicht geraten. Sie ändern nicht die beschlossene Grundstruktur aus statischem Public-Bereich, unveränderlichen Releases, getrennten App-Origins und getrennten dynamischen Diensten.

## 9. Dokumentbeziehungen

- `docs/architecture/FRECKA_Infrastructure_Blueprint_V1.0.md`: verbindlicher Infrastrukturrahmen und datiertes Inventar;
- `docs/architecture/deployment-workflow.md`: operativer Entwicklungs- und Releaseprozess;
- `docs/adr/ADR-0003-synology-als-infrastrukturplattform.md`: Rolle der Synology;
- `docs/adr/ADR-0004-lizenzmodell-v1.md`: Lizenz- und Gerätemodell.

## 10. Referenzen

- Synology Knowledge Center: [Virtual Host unter DSM 6.2](https://kb.synology.com/en-global/DSM/help/WebStation/application_webserv_virtualhost?version=6)
- Synology Knowledge Center: [Web Service – statische Website](https://kb.synology.com/en-global/DSM/help/WebStation/application_webserv_webservice?version=7)
- Synology Knowledge Center: [Web Portal – namens- und portbasierte Portale](https://kb.synology.com/en-global/DSM/help/WebStation/application_webserv_virtualhost?version=7)
- Synology Knowledge Center: [Berechtigungen für Website-Ordner](https://kb.synology.com/de-de/DSM/tutorial/What_should_I_set_permissions_to_folders_for_websites)
- `docs/architecture/FRECKA_Infrastructure_Blueprint_V1.0.md`
- `docs/architecture/deployment-workflow.md`
- `docs/adr/ADR-0003-synology-als-infrastrukturplattform.md`
- `docs/adr/ADR-0004-lizenzmodell-v1.md`
- `PROJECT.md`, insbesondere Offline-First-, Update-, Sicherheits- und Releaseprinzipien
- `docs/adr/ADR-0001-offline-first-architektur.md`
- `docs/persistence.md`
- `docs/public-receipt-qr.md`
- `docs/sharing.md`
