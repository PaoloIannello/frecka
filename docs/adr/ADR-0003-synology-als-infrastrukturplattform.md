# ADR-0003: Synology als getrennte Infrastrukturplattform

## Status

Angenommen

## Kontext

ADR-0001 legte FRECKA als Offline-First-PWA mit ausschließlich lokaler Geschäftsdatenhaltung fest und beschrieb die Synology zunächst ausschließlich als Update-Server für statische Programmdateien. Die Infrastrukturplanung für V1.0 benötigt zusätzlich eine statische Landingpage, Beta- und Produktivbereitstellung sowie künftig einen Mailrelay- und Lizenzdienst.

Die physische Nutzung derselben Synology für mehrere Aufgaben darf weder die lokale Datenhoheit aufweichen noch die statische PWA mit dynamischen Diensten vermischen. Insbesondere dürfen Belege, Gutscheine, Kunden, Kataloge und lokale Snapshots nicht zu einer zentralen Synology-Datenbasis werden.

## Entscheidung

Die Synology darf neben statischer Veröffentlichung und Updates künftig auch Mailrelay und Lizenzdienst hosten.

Dabei gelten getrennte Vertrauens- und Betriebsgrenzen:

1. **Statische PWA:** Landingpage, App, Beta, Dokumentation, Downloads, Update-Metadaten und unveränderliche Release-Artefakte werden read-only über Web Station/Nginx ausgeliefert.
2. **Mailrelay:** eigener Dienst, eigene Origin, eigene Laufzeit, serverseitige Zugangsdaten und ausschließlich zweckgebundene kurzfristige Versandverarbeitung.
3. **Lizenzdienst:** eigener Dienst, eigene Origin, eigene Laufzeit und ausschließlich lizenzbezogene Daten nach ADR-0004.
4. **Keine zentrale Geschäftsdatenbank:** Kein dynamischer Dienst speichert Belege, Gutscheine, Kataloge, Kundendaten oder vollständige lokale FRECKA-Snapshots als zentralen Bestand.
5. **Technische Trennung:** Dynamische Dienste liegen außerhalb der statischen Document Roots und Service-Worker-Scopes, verwenden getrennte Konten, Konfigurationen, Geheimnisse, Logs und Deploymentzyklen.
6. **Fehlertoleranz:** Ausfall oder Nichterreichbarkeit dynamischer Dienste gefährdet weder lokale Geschäftsdaten noch die lokale Belegerstellung.

Diese Entscheidung erweitert ausschließlich die Infrastrukturrolle der Synology. Alle Datenhoheits-, Offline- und Updateprinzipien aus ADR-0001 bleiben bestehen.

## Folgen

### Positive Folgen

- Eine bereits vorhandene Infrastruktur kann kontrolliert für V1.0-Dienste genutzt werden.
- Statische Auslieferung, Mail und Lizenzierung bleiben klar getrennt wartbar.
- Die PWA benötigt keine eingebetteten Mail- oder Lizenzgeheimnisse.
- Geschäftsdaten bleiben trotz zusätzlicher Dienste lokal.

### Negative und verpflichtende Folgen

- Die Synology wird sicherheits- und verfügbarkeitskritischer.
- Dynamische Dienste benötigen eigenes Hardening, Monitoring, Backup, Datenschutz- und Löschkonzept.
- Firewall, DSM, Reverse Proxy, Zertifikate und bestehende Live-Systeme müssen vor jeder öffentlichen Erweiterung geprüft werden.
- Der reale DSM-6.2.4-Stand benötigt vor neuen dynamischen öffentlichen Diensten eine dokumentierte Upgrade- und Kompatibilitätsprüfung.
- Ein physischer NAS-Ausfall kann mehrere Zusatzdienste gleichzeitig betreffen; der lokale Kernbetrieb muss trotzdem weiterarbeiten.

## Alternativen

### 1. Synology ausschließlich als statischer Update-Server

Diese frühere Grenze wäre einfacher und würde die Angriffsfläche reduzieren. Sie wurde erweitert, weil Mailrelay und Lizenzdienst für V1.0 auf der vorhandenen Infrastruktur vorgesehen sind.

### 2. Externe Managed Services

Externe Dienste könnten Betriebs- und Zustellaufgaben übernehmen, würden aber neue Anbieterabhängigkeiten, Kosten und Datenschutzprüfungen erzeugen. Sie bleiben eine spätere Alternative.

### 3. Dynamische Dienste innerhalb der PWA-Origin

Diese Variante wird verworfen. Sie vermischt Service-Worker-Scope, statische Auslieferung, Geheimnisse, Cookies und Sicherheitsheader und erhöht das Risiko unerwünschter Kopplung.

## Migrations- oder Rückweg

Mailrelay und Lizenzdienst können später auf getrennte Server oder Managed Services verschoben werden, solange Origins, API-Versionen, Schlüssel und Datenmigration kontrolliert werden. Die statische PWA bleibt davon unabhängig.

Ein Rückbau dynamischer Dienste darf keine Änderung oder Löschung lokaler Geschäftsdaten auslösen. Der Share-Fallback bleibt bei Mailausfall verfügbar; Lizenz-Ausfall- und Kulanzregeln werden in ADR-0004 beziehungsweise dessen Folgeentscheidungen festgelegt.
