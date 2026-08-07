# FRECKA: Deployment- und Infrastrukturkonzept für Synology Web Station

Stand: 8. August 2026

Geltungsbereich: bestehender Stand `0.9.0`, Build `COMM-001 / QR-002`

## 1. Zweck und Grenzen

Dieses Dokument leitet eine minimale spätere Bereitstellungsstruktur aus dem vorhandenen FRECKA-Projekt ab. Es verändert weder produktive Logik noch PWA-, Persistenz-, Backup-, Export-, Dokument-, QR- oder Share-Verhalten.

Für diesen Architekturblock wurden bewusst nicht angelegt:

- keine Landingpage;
- keine Beta-Kopie;
- keine Download- oder Update-Platzhalter;
- kein Service Worker;
- keine Serverkonfiguration;
- kein Build-Framework und keine externe Abhängigkeit.

Solche Artefakte sollen erst entstehen, wenn sie echten Inhalt beziehungsweise eine implementierte Funktion besitzen. Der Repository-Root bleibt Quell- und Entwicklungsverzeichnis und darf später nicht als Web-Station-Document-Root veröffentlicht werden.

## 2. Ist-Zustand

### 2.1 Projektstruktur

FRECKA ist eine statische Browseranwendung mit folgender Quellstruktur:

```text
FRECKA/
├── index.html
├── styles.css
├── manifest.webmanifest
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
  export.js
  persistence.js
  public-documents.js
  public-viewer.js
  qr.js
  sharing.js
vendor/
  qrcodegen-v1.8.0-es6.js
  qrcodegen-v1.8.0.LICENSE.txt
  pdf-lib-v1.17.1.min.js
  pdf-lib-v1.17.1.LICENSE.md
```

Die Laufzeitmenge einschließlich Lizenztexte umfasst im aktuellen Stand rund 1,46 MB. Die beiden lokal ausgelieferten Bibliotheken stimmen mit den in `vendor/README.md` dokumentierten SHA-256-Werten überein. Es gibt keine CDN-Abhängigkeit und keine vom Anwendungscode ausgelösten Server-/API-Aufrufe.

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
→ Backup und Export
→ App-Start
```

Ein Deployment darf Skripte weder automatisch umsortieren noch einzeln minifizieren, umbenennen oder bündeln. Eine solche Änderung wäre ein eigener Entwicklungsblock und kein Infrastrukturvorgang.

Alle produktiven Pfade sind relativ. Der bestehende Browsertest unter einem Unterverzeichnis hat bestätigt, dass Manifest, Stylesheet und alle 14 Skripte unter einem gemeinsamen Pfad korrekt aufgelöst werden. Das Hash-Routing benötigt keine serverseitige Rewrite-Regel.

### 2.4 PWA-Status

Vorhanden sind:

- ein Web App Manifest mit relativem `start_url` und relativem `scope`;
- Icons in 192 × 192 und 512 × 512 Pixel;
- Standalone-Darstellung und Apple-Metadaten;
- lokale IndexedDB-Persistenz;
- ausschließlich lokale statische Laufzeitabhängigkeiten.

Noch nicht vorhanden beziehungsweise nicht produktionsreif sind:

- kein Service Worker und keine App-Shell-Datei;
- keine Offline-Auslieferung des Programmcodes nach einem Kaltstart;
- keine implementierte Updateprüfung oder Updateaktivierung;
- kein Release-/Update-Manifest;
- keine reproduzierbare automatische Release-Pipeline;
- kein eigener PWA-Installationsidentifikator im Manifest;
- keine Maskable-Icons;
- veraltete Manifesttexte wie „UX-Prototyp ohne echte Datenhaltung“;
- ein fest codierter Asset-Abfragewert `comm001-1`, der vor jedem echten Code-Release geändert werden müsste.

`js/app.js` meldet vorhandene Service Worker ab und leert Cache Storage beim Start. Der aktuelle Stand ist daher eine manifestfähige statische Web-App, aber noch keine offline startfähige PWA-App-Shell im Sinne von ADR-0001. Diese Lücke darf durch Deploymentdokumentation nicht als gelöst dargestellt werden.

Die alten Netlify-/ZIP-Hinweise im hinteren Teil der `README.md` dokumentieren historische Prototypstände. Sie bilden keinen reproduzierbaren aktuellen Releaseprozess und dürfen nicht als Synology-Anweisung verwendet werden.

### 2.5 Daten- und Origin-Grenze

Die produktive IndexedDB heißt `frecka`; der Standardmandant heißt `local-default`. IndexedDB, Cache Storage und spätere Service Worker sind an die Browser-Origin gebunden, nicht an einen URL-Pfad.

Daraus folgt eine verbindliche Sicherheitsregel:

> Produktive App und Beta-App müssen auf verschiedenen Origins betrieben werden.

`https://example.test/app/` und `https://example.test/beta/` wären nicht getrennt. Beide Anwendungen würden dieselbe IndexedDB sehen und könnten dieselben Geschäftsdaten sowie dasselbe Datenbankschema verändern. Geeignet sind getrennte HTTPS-Hostnamen, beispielsweise `app.<domain>` und `beta.<domain>`. Getrennte Ports wären technisch ebenfalls getrennte Origins, sind für die spätere öffentliche Bereitstellung jedoch weniger verständlich und werden nicht empfohlen.

Die leere `publicViewerBaseUrl` in `js/config.js` ist mit dieser Trennung kompatibel: Public-Links verwenden jeweils die aktuelle Deployment-Adresse. Ein Beta-Beleg verweist damit standardmäßig auf den Beta-Viewer. Ob Beta künftig öffentliche Kundenlinks der Produktiv-App verwenden darf, ist eine fachliche Entscheidung und wird hier nicht angenommen.

### 2.6 Release-Zustand

Zu Beginn der Analyse war der Quellstand auf `main` beim Commit `aa947a9` sauber. Durch diesen Architekturblock kommt ausschließlich die neue Dokumentationsdatei hinzu. Es existieren keine Git-Tags und kein formaler Releasekatalog. Versionssignale sind derzeit verteilt:

- `js/data.js`: Produktversion `0.9.0`, Build `COMM-001 / QR-002`;
- `index.html`: Titel und Asset-Abfragewert;
- `manifest.webmanifest`: Name, Beschreibung, Start-URL und Scope;
- Git-Commit als einzig eindeutig reproduzierbare Quellrevision.

Ein Updateformat, ein Signaturverfahren und ein Updateclient sind ausdrücklich noch nicht implementiert.

## 3. Abgeleitete Deployment-Prinzipien

1. **Statisch:** Web Station liefert ausschließlich Dateien aus; PHP, Container und Serverdatenbank sind für FRECKA nicht erforderlich.
2. **Allowlist statt Repository-Kopie:** Ein Release enthält nur die in Abschnitt 2.2 benannte Laufzeitmenge.
3. **Unveränderliche Releases:** Ein freigegebenes Release-Verzeichnis wird nie in-place überschrieben.
4. **Promotion statt Neubau:** Beta und Produktion zeigen nach Freigabe auf exakt dasselbe bereits geprüfte Release-Artefakt.
5. **Origin-Trennung:** Produktiv und Beta erhalten getrennte HTTPS-Hostnamen.
6. **Read-only-Auslieferung:** Die Web-Station-Gruppe `http` benötigt nur Leserechte. Die Anwendung lädt keine Dateien auf die Synology hoch.
7. **Kein Kundendatenverzeichnis:** IndexedDB, Backups und Exporte verbleiben auf dem Endgerät beziehungsweise werden nur durch eine ausdrückliche Nutzeraktion an ein vom Nutzer gewähltes Ziel gegeben.
8. **Rollback durch Portalwechsel:** Ein Rückweg zeigt den Web-Station-Dienst wieder auf ein vollständig vorhandenes früheres Release. Es werden keine einzelnen Dateien zurückkopiert.
9. **Keine Updatebehauptung:** `updates/` wird erst befüllt, wenn Format, Integrität, Authentizität und Aktivierungslogik als eigener Entwicklungsblock umgesetzt sind.

## 4. Empfohlene minimale Zielstruktur

`<web-share>` bezeichnet den tatsächlichen gemeinsamen Web-Ordner des NAS. Bei einer Standardinstallation ist dies häufig `/volume1/web`; Volume und Pfad müssen auf dem Zielgerät geprüft und dürfen nicht hart codiert werden.

```text
<web-share>/frecka/
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

Ein Release-Identifier muss eindeutig, dateisystemfreundlich und aus Produktversion, Build und Git-Revision ableitbar sein. Für den analysierten Stand wäre beispielsweise `0.9.0-comm001-qr002-aa947a9` nachvollziehbar. Dies ist eine technische Benennung des Artefakts, kein nachträglich erfundener Produkt-Release.

## 5. Zuordnung zu Synology Web Station

Synology Web Station unterstützt statische Websites sowie namens- oder portbasierte Webportale mit zugeordnetem Document Root. Für Website-Ordner benötigt die Gruppe `http` mindestens Leserechte. Die verbindliche DSM-Bezeichnung muss anhand der installierten DSM-/Web-Station-Version geprüft werden; die folgende Zuordnung orientiert sich an DSM 7.2 und neuer.

### 5.1 Dienste und Portale

| Zweck | Empfohlene Origin | Web-Station-Document-Root |
|---|---|---|
| Landingpage | `https://<landing-host>/` | `<web-share>/frecka/public/` |
| Produktive App | `https://<app-host>/` | `<web-share>/frecka/releases/<freigegeben>/site/` |
| Beta-App | `https://<beta-host>/` | `<web-share>/frecka/releases/<kandidat>/site/` |
| Dokumentation | `https://<landing-host>/docs/` | Unterordner `public/docs/` |
| Downloads | `https://<landing-host>/downloads/` | Unterordner `public/downloads/` |
| Updates | `https://<landing-host>/updates/` oder später eigener Host | Unterordner `public/updates/` |

Landingpage, Dokumentation, Downloads und Updates teilen sich absichtlich einen statischen öffentlichen Document Root. Separate Web-Station-Dienste hierfür wären ohne unterschiedliche Sicherheits-, Header- oder Betreiberanforderungen unnötig.

Produktiv und Beta werden dagegen als zwei namensbasierte HTTPS-Portale eingerichtet, auch wenn beide zeitweise dasselbe Release-Artefakt verwenden. Das trennt ihre Browserdaten zuverlässig.

### 5.2 Berechtigungen

- Der Deployment-Operator darf neue Release-Verzeichnisse schreiben.
- Die Web-Station-Gruppe `http` erhält rekursiv nur Leserechte auf veröffentlichte Document Roots.
- Schreibrechte für `http` sind für FRECKA nicht erforderlich.
- Repository, Backups, Exporte, private Dokumentation und Schlüsselmaterial liegen nie in einem Web-Document-Root.
- Bereits freigegebene Release-Verzeichnisse werden nach dem Erzeugen schreibgeschützt behandelt.

### 5.3 HTTPS und Browseranforderungen

Alle App-Portale benötigen gültiges HTTPS. Web Share, PWA-Installation und verschiedene Web-Crypto-/Browserfunktionen dürfen nicht auf unverschlüsseltes öffentliches HTTP angewiesen sein. HTTP wird auf HTTPS umgeleitet. HSTS wird erst aktiviert, nachdem Hostnamen, Zertifikate und HTTPS-Zugriff vollständig geprüft wurden.

Vor Freigabe sind mindestens folgende Antworten der Web Station zu kontrollieren:

- `index.html` wird als HTML ausgeliefert und nicht langfristig unveränderlich gecacht;
- `manifest.webmanifest` besitzt einen unterstützten Manifest-/JSON-MIME-Type;
- JavaScript, CSS, PNG und Lizenztexte sind erreichbar;
- Hash-Routen bleiben nach Reload erhalten;
- der Public Viewer erhält die Fragment-Payload ausschließlich clientseitig;
- keine Verzeichnisauflistung ist aktiv;
- keine Quell-, Test- oder Git-Dateien sind öffentlich erreichbar.

Eine restriktive Content Security Policy und weitere Sicherheitsheader sind sinnvoll, müssen aber gegen PDF-Blob-URLs, Downloads, Share-Verhalten und die bestehende Skriptstruktur getestet werden. Sie werden nicht ungeprüft in diesem Strukturblock erfunden.

## 6. Minimaler Build- und Releaseprozess

Der vollständige operative Ablauf einschließlich Entwicklung, Versionierung, Beta, Produktion, Rollback und Archivierung steht in `docs/deployment-workflow.md`.

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
- Public Viewer, PDF, QR, Share-Fallback, Backup und Export;
- keine Konsolenfehler;
- keine ungeplanten externen Netzwerkabhängigkeiten.

### Phase 3: Staging

1. neues Verzeichnis `releases/<release-id>/site/` anlegen;
2. ausschließlich die Allowlist aus Abschnitt 2.2 hineinkopieren;
3. für alle enthaltenen Dateien eine deterministisch sortierte `SHA256SUMS` erzeugen;
4. Prüfsummen unmittelbar gegen die Staging-Kopie prüfen;
5. Staging-Verzeichnis danach nicht mehr verändern.

Hierfür genügen vorhandene Betriebssystemwerkzeuge. Ein Node-Paket, Bundler oder Container ist nicht erforderlich.

### Phase 4: Beta

1. statischen Webdienst auf das neue `site/` zeigen lassen;
2. ausschließlich das Beta-Portal auf diesen Dienst umstellen;
3. HTTPS-, Browser-, PWA-, 320-/390-px- und reale Zielgerätetests durchführen;
4. insbesondere IndexedDB-Migration, Backup/Restore und Public-Links prüfen;
5. Kandidaten bei einem Fehler nicht verändern, sondern einen neuen Release-Identifier bauen.

### Phase 5: Produktion

1. nach dokumentierter Freigabe das Produktivportal auf exakt dasselbe geprüfte `site/` umstellen;
2. kurze Produktivprüfung durchführen;
3. vorheriges Release vollständig behalten;
4. bei einem Codeproblem das Portal auf das vorherige Release zurückstellen.

Ein Code-Rollback kann keine bereits ausgeführte IndexedDB-Migration zurückdrehen. Vor Releases mit Datenbankschemaänderungen muss deshalb nachgewiesen sein, dass der vorherige Code das migrierte Schema noch sicher lesen kann oder dass ein eigener geprüfter Rückweg existiert.

## 7. Updates

Die Synology ist laut Projektarchitektur ausschließlich Quelle statischer Programmdateien und Update-Metadaten. Im aktuellen Code existiert noch kein Updateclient. Daher werden in diesem Block weder Dateinamen noch JSON-Felder eines vermeintlichen Update-Manifests festgelegt.

Vor Befüllung von `public/updates/` müssen separat entschieden und umgesetzt werden:

- Kanalmodell für Produktion und Beta;
- Semantik von Version und Build;
- kanonische Update-URL und erforderliche CORS-Regeln;
- vollständige Dateiliste und Integritätsprüfung;
- kryptografische Authentizität beziehungsweise Vertrauenskette;
- kontrollierter Service-Worker-Lebenszyklus;
- Aktivierungszeitpunkt ohne Unterbrechung offener Vorgänge;
- Kompatibilität zu IndexedDB-Schemata und Rückweg;
- Aufbewahrungs- und Löschregel alter Releases.

SHA-256-Dateiprüfungen sichern den Transport beziehungsweise die Staging-Konsistenz, ersetzen aber keine signierte Updateherkunft.

## 8. Noch erforderliche fachliche und betriebliche Entscheidungen

Die Dokumentation kann ohne diese Angaben abgeschlossen werden. Eine reale Synology-Einrichtung oder öffentliche Freigabe muss dagegen anhalten, bis folgende Entscheidungen getroffen wurden:

1. endgültige Hostnamen für Landingpage, Produktion und Beta sowie DNS-/Zertifikatsverantwortung;
2. ob und wie der Beta-Zugang beschränkt wird;
3. welche Inhalte als öffentliche Nutzerdokumentation gelten – das vorhandene Entwicklerverzeichnis `docs/` wird nicht automatisch veröffentlicht;
4. Inhalt, Impressum, Datenschutzangaben und Verantwortlichkeit der Landingpage;
5. Art der späteren Downloads;
6. Updatekanäle, Updateformat und Signatur-/Schlüsselarchitektur;
7. Freigabeverantwortung, Release-Aufbewahrung und Zeitpunkt der Bereinigung alter Releases;
8. Verhalten öffentlicher Beta-QR-Links bei einer späteren Produktivschaltung.

Diese Punkte werden nicht geraten. Sie ändern jedoch nicht die hier empfohlene Grundstruktur aus statischem Public-Bereich, unveränderlichen Releases und getrennten App-Origins.

## 9. In diesem Architekturblock geänderte Dateien

Neu angelegt wurde ausschließlich:

- `docs/deployment-synology.md`

Bestehende FRECKA-Dateien und produktive Funktionalität wurden nicht verändert.

## 10. Referenzen

- Synology Knowledge Center: [Web Service – statische Website](https://kb.synology.com/en-global/DSM/help/WebStation/application_webserv_webservice?version=7)
- Synology Knowledge Center: [Web Portal – namens- und portbasierte Portale](https://kb.synology.com/en-global/DSM/help/WebStation/application_webserv_virtualhost?version=7)
- Synology Knowledge Center: [Berechtigungen für Website-Ordner](https://kb.synology.com/de-de/DSM/tutorial/What_should_I_set_permissions_to_folders_for_websites)
- `PROJECT.md`, insbesondere Offline-First-, Update-, Sicherheits- und Releaseprinzipien
- `docs/adr/ADR-0001-offline-first-architektur.md`
- `docs/persistence.md`
- `docs/public-receipt-qr.md`
- `docs/sharing.md`
