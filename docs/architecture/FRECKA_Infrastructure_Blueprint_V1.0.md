# FRECKA Infrastructure Blueprint V1.0

**Status:** Angenommene technische Grundlage für FRECKA V1.0

**Entschieden:** 8. August 2026

**Inventarstand:** 8. August 2026

## 1. Zweck und Dokumentgrenzen

Dieser Blueprint beschreibt die verbindliche Infrastrukturarchitektur von FRECKA V1.0. Er legt Systemgrenzen, Hosts, Datenhoheit und die Rollen der Synology fest, ohne die operativen Details doppelt zu pflegen.

Ergänzende Dokumente:

- `docs/architecture/deployment-synology.md`: Laufzeitmenge, Verzeichnis- und Web-Station-Zuordnung;
- `docs/architecture/deployment-workflow.md`: Entwicklung, Versionierung, Beta, Produktion, Rollback und Archivierung;
- `docs/adr/ADR-0003-synology-als-infrastrukturplattform.md`: Erweiterung der Synology-Rolle;
- `docs/adr/ADR-0004-lizenzmodell-v1.md`: verbindliches Lizenz- und Gerätemodell.

Bei einer Abweichung hat das thematisch zuständige angenommene ADR Vorrang. Der datierte Betriebs-/Inventarabschnitt dieses Dokuments beschreibt beobachteten Zustand und ist keine dauerhafte Architekturentscheidung.

## 2. Zielbild

FRECKA ist eine lokale Offline-First-PWA. Belege, Kunden-, Katalog- und Stammdaten bleiben grundsätzlich auf dem Endgerät des jeweiligen Mandanten. Die lokale Belegerstellung darf nicht von einer zentralen Infrastruktur abhängen.

Die Synology ist Deployment- und Infrastrukturplattform für:

- statische Landingpage und öffentliche Inhalte;
- produktive und Beta-PWA;
- unveränderliche Release-Artefakte;
- spätere statische Updatekanäle;
- Mailrelay als getrennten dynamischen Dienst;
- Lizenzdienst als getrennten dynamischen Dienst.

Sie ist keine zentrale Beleg-, Kunden- oder Mandantengeschäftsdatenbank. Die Erweiterung gegenüber ADR-0001 ist in ADR-0003 dokumentiert.

## 3. Verbindliche Grundprinzipien

- Das lokale Git-Repository im iCloud Drive ist die einzige Entwicklungs- und Master-Version.
- Auf der Synology wird nicht entwickelt und kein Release direkt verändert.
- Jedes Deployment entsteht ausschließlich aus einem eindeutigen Git-Stand.
- Statische PWA und dynamische Dienste bleiben logisch, technisch und betrieblich getrennt.
- Geschäftsdaten bleiben lokal; die Synology erhält keine zentrale Kopie.
- Ein Ausfall von Update-, Mail- oder Lizenzinfrastruktur darf gespeicherte Geschäftsdaten nicht gefährden.
- Ein veröffentlichtes Release ist unveränderlich.
- Beta und Produktion verwenden getrennte HTTPS-Origins.
- Produktion verwendet exakt das auf Beta geprüfte Release-Artefakt.
- Mailrelay-Ausfall führt zum bestehenden Fallback „Teilen“ und blockiert die Belegerstellung nicht.
- Eine Lizenz gehört in V1.0 genau einem Mandanten beziehungsweise einer Filiale und erlaubt genau ein gleichzeitig aktives Gerät.
- Gerätewechsel erfolgt kontrolliert durch Deaktivierung beziehungsweise Übertragung und lokales Backup/Restore.
- Mehrgerätebetrieb und Synchronisation sind frühestens für eine spätere 2.x-Version vorgesehen.

## 4. Komponenten und Vertrauensgrenzen

### 4.1 Entwicklung

Das Repository im iCloud Drive enthält:

- Quellcode und Dokumentation;
- Git-Historie und annotierte Release-Tags;
- lokale Tests und Release-Vorbereitung.

Commits werden bewusst durch den Nutzer ausgeführt. Produktive Artefakte müssen Tag, Commit und Prüfsummen eindeutig zugeordnet werden können.

### 4.2 Statische Auslieferung

Web Station/Nginx liefert ausschließlich veröffentlichte Dateien aus:

- Landingpage;
- App und Beta-App;
- Nutzerdokumentation und Downloads;
- spätere Update-Metadaten und Programmdateien.

Die statische Schicht benötigt weder PHP noch Container noch serverseitige Schreibrechte.

### 4.3 Dynamische Dienste

Mailrelay und Lizenzdienst erhalten jeweils:

- eigene Origin;
- eigene Laufzeit und Konfiguration;
- eigene Zugänge und Geheimnisse;
- eigenen Deployment- und Updatezyklus;
- eigene, zweckgebundene serverseitige Datenhaltung außerhalb statischer Webroots.

Sie dürfen keine PWA-Dateien in-place verändern und keine zentrale Sammlung von Belegen, Gutscheinen, Kunden oder Katalogen aufbauen.

## 5. Lizenzmodell V1.0

Das verbindliche Modell steht vollständig in ADR-0004. Zusammenfassend gilt:

- eine Lizenz gehört genau zu einem Mandanten beziehungsweise einer Filiale;
- genau ein Gerät darf gleichzeitig aktiv sein;
- ein Gerätewechsel muss durch Deaktivierung oder administrative Übertragung möglich sein;
- Backup und Restore übertragen Geschäftsdaten weiterhin ausschließlich kontrolliert durch den Nutzer;
- die genaue Offline-Kulanz und Aktivierungsprotokolle bleiben eine Folgeentscheidung;
- Mehrgerätebetrieb ist nicht Teil von V1.0.

Der Lizenzdienst ist für V1.0 vorgesehen, aber keine Voraussetzung für die erste statische Auslieferung von Landingpage, Beta und App.

## 6. Domain- und Hoststruktur

Registrar und DNS-Provider ist INWX. Die Hauptdomain ist `frecka.app`.

### 6.1 Verbindlicher statischer Kern

| URL | Zweck |
|---|---|
| `https://frecka.app/` | Landingpage |
| `https://frecka.app/docs/` | spätere Nutzerdokumentation |
| `https://frecka.app/downloads/` | spätere Downloads |
| `https://frecka.app/updates/` | spätere Updatekanäle und Release-Metadaten |
| `https://app.frecka.app/` | produktive FRECKA-PWA |
| `https://beta.frecka.app/` | Beta- und Abnahme-PWA |

Dokumentation, Downloads und Updates bleiben zunächst Pfade unter `frecka.app`. Eigene Subdomains werden nur bei einer später nachgewiesenen technischen oder betrieblichen Trennungsanforderung eingeführt.

### 6.2 Dynamische Dienste

| Host | Zweck | Status |
|---|---|---|
| `mail.frecka.app` | Mailrelay | für V1.0 vorgesehen, noch nicht umgesetzt |
| `license.frecka.app` | Lizenzdienst | für V1.0 vorgesehen, noch nicht umgesetzt |

Die Hosts werden erst zusammen mit dem jeweiligen geprüften Dienst, Zertifikat und Schutzkonzept produktiv eingerichtet.

### 6.3 Origin-Trennung

`app.frecka.app` und `beta.frecka.app` müssen getrennte Origins bleiben. Pfadbasierte Varianten unter derselben Origin sind unzulässig, weil IndexedDB, Cache Storage und Service Worker originweit gelten.

Mail- und Lizenzdienst dürfen nicht unter der Origin oder dem Service-Worker-Scope der PWA betrieben werden.

## 7. Synology-Verzeichnisstruktur

Die portable Variable `<web-share>` bezeichnet den von Web Station verwendeten Web-Ordner. Der reale, in der aktuellen Synology-Konfiguration verwendete Zielpfad lautet:

```text
/web/FRECKA/
```

Zielstruktur:

```text
<web-share>/FRECKA/
├── public/
│   ├── index.html
│   ├── docs/                 # erst bei echten Inhalten
│   ├── downloads/            # erst bei echten Inhalten
│   └── updates/              # erst mit implementiertem Updateprotokoll
└── releases/
    └── <version>-<short-commit>/
        ├── site/
        ├── RELEASE.txt
        └── SHA256SUMS
```

Leere Platzhalterordner werden nicht erzeugt. Serverseitige Schreibdaten, Logs, Queues, Lizenzdaten und Geheimnisse dynamischer Dienste liegen außerhalb von `public/` und `releases/`.

## 8. Deployment- und Release-Modell

Der verbindliche Ablauf ist:

```text
Arbeitsbranch
→ lokale Prüfungen
→ Review und Merge nach main
→ Release-Vorbereitung
→ annotierter Git-Tag
→ unveränderliches Release-Artefakt
→ Beta-Deployment
→ Beta-Abnahme
→ Produktiv-Promotion desselben Artefakts
→ Smoke-Test
→ Archivierung
```

Release-IDs verwenden Produktversion und kurzen Git-Commit, beispielsweise:

```text
1.0.0-beta.1-a1b2c3d
1.0.0-a1b2c3d
```

`beta.frecka.app` zeigt auf den Kandidaten. Nach erfolgreicher Abnahme wird kein neuer Build erzeugt; `app.frecka.app` wird auf exakt denselben vollständigen Release-Ordner umgestellt. Rollback erfolgt ausschließlich durch Rückstellen des Document Roots auf ein kompatibles vorheriges Release.

Alle Einzelheiten stehen in `docs/architecture/deployment-workflow.md`.

## 9. Berechtigungen und Veröffentlichung

- Die Web-Station-Gruppe `http` erhält für veröffentlichte statische Inhalte nur Leserechte.
- Ein getrenntes Deployment-Konto darf neue, noch nicht vorhandene Release-Verzeichnisse übertragen.
- Vorhandene Release-IDs werden niemals überschrieben.
- Die PWA benötigt keine Synology-Schreibrechte.
- Dynamische Dienste verwenden getrennte Dienstkonten und minimale zweckgebundene Rechte.
- Repository, `.git`, Tests, Backups, Exporte, Schlüssel und private Konfigurationen liegen nie in einem öffentlichen Document Root.

## 10. HTTPS, Firewall und öffentliche Dienste

Alle öffentlichen FRECKA-Hosts benötigen gültiges HTTPS. Zertifikate werden auf der Synology verwaltet; Ziel ist Let's Encrypt. Kostenpflichtige SSL-Produkte des Registrars sind nicht erforderlich.

Da `.app` HSTS-preloaded ist, muss HTTPS bereits beim ersten öffentlichen Zugriff funktionieren. Der zusätzliche HSTS-Schalter der Web Station wird erst nach geprüfter Zertifikats- und Hostkonfiguration bewertet.

UPnP und automatische Routerkonfiguration sind keine Standardstrategie. Änderungen an Firewall, Router, Reverse Proxy, Zertifikaten oder öffentlichen Ports erfolgen nur nach vollständiger Bestandsaufnahme und direktem Regressionstest aller bestehenden Live-Dienste.

## 11. DSM- und Upgrade-Grenze

Der reale Ist-Zustand ist DSM 6.2.4 auf einer Synology DS218+. Dieser Zustand wird nicht in diesem Dokumentationsblock verändert.

Vor produktiver Freigabe eines neuen dynamischen öffentlichen Dienstes sind verpflichtend:

1. unterstützte DSM-Zielversion und Upgradepfad prüfen;
2. Web Station, Nginx, Docker, Zertifikate und Reverse Proxy inventarisieren;
3. Coaching-, Event- und VPN-Abhängigkeiten vollständig erfassen;
4. Sicherungs- und Rückweg planen;
5. Upgrade in kontrolliertem Wartungsfenster durchführen;
6. sämtliche bestehenden Live-Dienste regressionsprüfen;
7. erst danach Mailrelay oder Lizenzdienst öffentlich freigeben.

Es erfolgt kein ungeprüftes DSM-Upgrade. Die statische Erstbereitstellung ist davon getrennt, benötigt aber ebenfalls gültiges HTTPS und eine risikogeprüfte Web-Station-Konfiguration.

## 12. Mailrelay

Das Mailrelay ist für V1.0 vorgesehen, jedoch keine Voraussetzung für die erste statische Bereitstellung.

Verbindliche Grenzen:

- eigener Dienst und eigener Host;
- SMTP-/Provider-Zugänge ausschließlich serverseitig;
- Versand nur nach ausdrücklicher Nutzeraktion;
- minimale Verarbeitung für den Versandzweck;
- keine zentrale Beleg- oder Kundendatenbank;
- definierte Queue-, Retry-, Datenschutz- und Löschregeln;
- keine falsche Zustellbestätigung;
- Relay-Ausfall blockiert die Belegerstellung nicht;
- Fallback bleibt „Teilen“.

Provider, Auftragsverarbeitung, Aufbewahrung und Zustelllogik werden vor Umsetzung separat entschieden.

## 13. Lizenzdienst

Der Lizenzdienst ist für V1.0 vorgesehen, jedoch keine Voraussetzung für die erste statische Bereitstellung.

Verbindliche Grenzen:

- eigenes Deployment und eigener Host;
- keine Schlüssel oder administrativen Geheimnisse im Browsercode;
- keine Beleg-, Gutschein-, Katalog- oder Kundendaten;
- versionierte Schnittstelle;
- kontrollierte Aktivierung, Deaktivierung und Geräteübertragung;
- lokale Geschäftsdaten bleiben bei Dienst- oder Netzausfall unverändert;
- genaue Offline-Kulanz bleibt offen und wird vor Umsetzung entschieden.

## 14. Update-Infrastruktur und Offline-Fähigkeit

Seit OFFLINE-001 besitzt die App einen produktiven Service Worker mit versioniertem App-Shell-Cache und Navigation-Fallback für den Offline-Kaltstart. Er arbeitet relativ zum jeweiligen App-Pfad, speichert keine Geschäftsdaten und übernimmt laufende Sitzungen nicht erzwungen. Ein Updateclient, signierte Update-Metadaten und eine nutzergesteuerte Aktivierung außerhalb offener Arbeitsabläufe sind noch nicht umgesetzt.

Später vorgesehen sind:

- Kanäle `stable` und `beta` unter `frecka.app/updates/`;
- eindeutige Release-Metadaten;
- SHA-256-Prüfsummen;
- signierte Update-Metadaten und dokumentierte Schlüsselverwaltung;
- vollständiger Download und Prüfung vor Aktivierung;
- Aktivierung nur außerhalb offener Arbeitsabläufe;
- Erhalt der zuletzt funktionsfähigen App-Shell.

Die Update-Infrastruktur empfängt keine Geschäfts- oder Nutzungsdaten.

## 15. Backups und Gerätewechsel

Geschäftsdaten bleiben lokal und werden ausschließlich über die verschlüsselte FRECKA-Backup-/Restore-Funktion übertragen.

Ein Gerätewechsel umfasst:

1. altes Gerät beziehungsweise Lizenzaktivierung deaktivieren;
2. Lizenz kontrolliert auf das neue Gerät übertragen;
3. verschlüsseltes Backup durch den Nutzer bereitstellen;
4. Backup auf dem neuen Gerät prüfen und wiederherstellen.

Die Synology speichert keine zentrale Kopie der Geschäftsdaten. Ihre eigene Infrastruktur-Sicherung umfasst ausschließlich Releases, statische Inhalte, Dienstkonfiguration und die jeweils erlaubten zweckgebundenen Daten dynamischer Dienste.

## 16. Nicht Bestandteil von V1.0

- Mehrgerätebetrieb und Mehrgeräte-Synchronisation;
- zentrale Cloud-Datenhaltung von Belegen oder Kunden;
- mandantenübergreifende Geschäftsdatenbank;
- vollständige SaaS-Architektur;
- dynamische automatische Mandantenbereitstellung;
- komplexe CI/CD-Plattform;
- Kubernetes oder vergleichbare Orchestrierung;
- unnötige zusätzliche Serverdienste.

## 17. Betriebsregel

Für jede Infrastrukturänderung gilt:

1. Ist-Zustand aktuell erfassen;
2. Risiko und Rückweg bewerten;
3. genau eine kontrollierte Änderung durchführen;
4. unmittelbar testen;
5. bestehende Live-Systeme regressionsprüfen;
6. erst danach den nächsten Schritt beginnen.

Keine Änderung an Router, Firewall, Zertifikaten, Reverse Proxy, DSM oder öffentlichen Diensten ohne dokumentierte Auswirkungen auf bestehende Coaching- und Event-Systeme.

## 18. Datiertes Betriebs-/Infrastrukturinventar

**Inventarstand: 8. August 2026. Vor jeder Infrastrukturänderung erneut prüfen.**

- Server: Synology DS218+;
- Betriebssystem: DSM 6.2.4;
- Webserver: Nginx über Web Station;
- Docker und PHP vorhanden, für statische FRECKA-Bereiche nicht erforderlich;
- Domain `frecka.app` registriert;
- DNS bei INWX;
- `frecka.app`, `www` und DNS-Wildcard zeigen laut Inventar auf die öffentliche IPv4 der Synology;
- DSM-Firewall laut Inventar deaktiviert;
- bestehende Coaching- und Event-Live-Systeme müssen unverändert weiterlaufen;
- `/web/FRECKA/public` angelegt;
- Virtual Host `frecka.app` angelegt;
- Document Root `web/FRECKA/public`;
- PHP für diesen Host nicht konfiguriert;
- Deployment- und Synology-Dokumentation im Repository vorhanden.

Das DNS-Wildcard bedeutet, dass auch noch nicht produktiv eingerichtete Subdomains auf DNS-Ebene auflösen können. Ein Host gilt erst als freigegeben, wenn Web-Station-Zuordnung, Zertifikat, Firewall-/Portwirkung und Smoke-Test dokumentiert sind.

## 19. Nächste kontrollierte Freigabeschritte

1. HTTPS-Zertifikat für `frecka.app` einrichten;
2. Zertifikatszuordnung prüfen;
3. minimale Landingpage beziehungsweise statische Testauslieferung;
4. End-to-End-Test `https://frecka.app`;
5. danach getrennte Hosts für `app.frecka.app` und `beta.frecka.app`;
6. statisches Beta-/Produktiv-Deployment nach dem dokumentierten Workflow;
7. DSM-Upgrade- und Kompatibilitätsprüfung vor dynamischen öffentlichen Diensten;
8. Mailrelay und Lizenzdienst jeweils in einem eigenen Umsetzungsblock.

## 20. Entscheidungsregel

Wenn eine Infrastrukturentscheidung Auswirkungen auf lokale Datenintegrität, Lizenzmodell, Datenschutz, Sicherheit oder bestehende Live-Systeme hat, wird nicht geraten. Die Entscheidung wird vor Umsetzung ausdrücklich getroffen und dokumentiert.
