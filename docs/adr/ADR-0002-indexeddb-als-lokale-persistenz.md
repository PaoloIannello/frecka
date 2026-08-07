# ADR-0002: IndexedDB als lokale Persistenztechnologie

## Status

Akzeptiert

Die Entscheidung wurde mit PERSIST-001a bereits für die Einstellungspersistenz umgesetzt und wird mit diesem ADR nachträglich verbindlich dokumentiert.

## Kontext

FRECKA ist eine Offline-First Progressive Web App. Strukturierte Geschäfts- und Einstellungsdaten müssen auf dem Endgerät verfügbar bleiben, ohne dass der lokale Kernbetrieb von einer Internetverbindung oder einer zentralen FRECKA-Cloud-Datenbank abhängt.

Mit Katalogen, Kunden, Belegen, Gutscheinen, Historien und Einstellungen wachsen Umfang und Beziehungen der lokalen Daten schrittweise. Die Persistenz muss deshalb größere strukturierte Datenmengen, stabile IDs, fachliche Referenzen, transaktionale Schreibvorgänge sowie nachvollziehbare Schema- und Datenformatmigrationen unterstützen. Zugriffe dürfen die mobile Oberfläche nicht synchron blockieren.

Die Lösung muss in den unterstützten Browsern einschließlich Safari auf iOS einsetzbar sein. Browserbasierter Speicher bleibt dabei an das Speicher- und Bereinigungsverhalten des jeweiligen Geräts und Browsers gebunden. FRECKA darf daher nicht den Eindruck erwecken, lokale Browserdaten seien ohne Backup gegen Geräteverlust oder Löschung geschützt.

ADR-0001 legt die Offline-First-Architektur und die ausschließlich lokale Geschäftsdatenhaltung fest, lässt die konkrete Speichertechnologie jedoch bewusst offen. PERSIST-001a hat inzwischen eine zentrale, versionierte Persistenzschicht eingeführt und speichert zunächst die vollständigen Einstellungen.

## Entscheidung

IndexedDB ist die verbindliche lokale Persistenztechnologie für strukturierte Geschäfts- und Einstellungsdaten in FRECKA.

- IndexedDB-Zugriffe erfolgen ausschließlich über eine zentrale Persistenzschicht. UI-, Render- und DOM-Funktionen greifen niemals direkt auf IndexedDB zu.
- Die fachlichen Laufzeitobjekte bleiben von der konkreten Browser-Datenbank-API getrennt. Persistenzdatensätze sind Projektionen beziehungsweise gespeicherte Domänenzustände, keine parallelen UI-Modelle.
- Datenbankschema-Versionen und Versionen der gespeicherten Datenformate werden getrennt und nachvollziehbar verwaltet.
- Daten werden mit stabilen Schlüsseln mandanten- beziehungsweise instanzbezogen gespeichert. Der aktuelle Prototyp verwendet dafür die Instanz `local-default`.
- Geschäftsdaten werden weder in `localStorage` noch in `sessionStorage` gespeichert. Diese APIs sind nicht für den fachlichen Datenbestand vorgesehen.
- Object Stores werden schrittweise nach fachlichen Verantwortungsbereichen ergänzt. Neue Stores und Migrationen benötigen einen dokumentierten, testbaren Upgrade-Pfad.
- Schreibvorgänge werden asynchron und, wo mehrere Datensätze fachlich gemeinsam geändert werden, in geeigneten IndexedDB-Transaktionen ausgeführt. Die UI meldet Erfolg erst nach erfolgreichem Transaktionsabschluss.
- Abgeschlossene Belege, Gutscheine und andere Dokumente verwenden unveränderliche fachliche Snapshots. Spätere Änderungen an Stammdaten oder Einstellungen dürfen abgeschlossene Dokumente nicht rückwirkend verändern.
- Eine zentrale Serverdatenbank ist nicht Bestandteil des lokalen Kernbetriebs. Netzwerk- und Updatefunktionen dürfen keine Voraussetzung für den Zugriff auf lokale Geschäftsdaten sein.

Der erste umgesetzte Datenbankvertrag lautet:

- Datenbank: `frecka`
- Datenbankschema-Version: `5`
- Object Stores: `settings`, `catalog`, `customers`, `receipts` und `vouchers`
- Key Path: `tenantId`
- Standardschlüssel: `local-default`
- Einstellungsformat-Version: `1`
- Katalogformat-Version: `1`
- Kundenformat-Version: `1`
- Belegformat-Version: `1`
- Gutscheinformat-Version: `1`

Dieser konkrete Vertrag beschreibt den aktuellen Stand. Künftige Stores und Versionen erweitern ihn nur über ausdrücklich definierte Migrationen.

## Begründung

IndexedDB ist für den vorgesehenen lokalen Datenbestand geeignet, weil die Browser-API:

- strukturierte Datensätze und fachliche Schlüssel unterstützt;
- wesentlich größere und wachsende Datenbestände als Web Storage aufnehmen kann;
- asynchron arbeitet und dadurch die Benutzeroberfläche nicht durch synchrone Speicherzugriffe blockieren muss;
- Transaktionen für zusammengehörige Lese- und Schreibvorgänge bereitstellt;
- versionierte Schema-Upgrades ermöglicht;
- Daten nach dem Laden der App ohne Netzwerkverbindung verfügbar macht;
- als browsernative API keine zusätzliche Laufzeitdatenbank oder Framework-Abhängigkeit erfordert.

Diese Eigenschaften passen zur Offline-First-Architektur, zur schrittweisen Entwicklung und zum Grundsatz, Wartbarkeit vor kurzfristige Entwicklungsgeschwindigkeit zu stellen.

## Folgen

### Positive Folgen

- Persistierte Daten überstehen Reloads und reguläre App- beziehungsweise Browserneustarts, solange der Browserbestand erhalten bleibt.
- Geschäftsdaten bleiben lokal unter der Kontrolle des Kunden und benötigen keine zentrale FRECKA-Datenbank.
- Weitere fachliche Bereiche können schrittweise über klar abgegrenzte Stores und Migrationen ergänzt werden.
- Transaktionen ermöglichen konsistente lokale Schreibvorgänge und eindeutige Erfolgsgrenzen für die UI.
- Eine zentrale Persistenzschicht begrenzt die technische Kopplung und erleichtert Tests, Validierung und Fehlerbehandlung.

### Negative Folgen und Risiken

- Der App-Start und alle Persistenzzugriffe sind asynchron und benötigen sichtbare Lade-, Fehler- und Wiederholungszustände.
- Speicherlimits, Freigaben, privater Modus und Bereinigungsverhalten unterscheiden sich je nach Browser und Betriebssystem und müssen auf Zielgeräten geprüft werden.
- Jede Datenbank- oder Datenformatänderung benötigt eine fehlertolerante, wiederanlauffähige und getestete Migration.
- Ausschließlich lokale Datenhaltung macht ein verlässliches, verschlüsseltes Backup- und Restore-Verfahren zwingend erforderlich.
- Safari beziehungsweise iOS kann Websitedaten unter bestimmten Bedingungen entfernen. FRECKA kann dieses Risiko nicht ausschließen und muss Nutzer verständlich darüber sowie über notwendige Backups informieren.
- IndexedDB stellt keine geräteübergreifende Synchronisation bereit. Mehrgerätebetrieb und Konfliktauflösung bleiben ungelöst, solange keine gesonderte Architekturentscheidung getroffen wird.

## Sicherheits- und Datenschutzgrenzen

Lokale Speicherung in IndexedDB ist keine Verschlüsselung. Wer Zugriff auf ein entsperrtes Gerät und dessen Browserprofil besitzt, kann abhängig von der Plattform auch Zugriff auf lokale FRECKA-Daten erlangen. Gerätesperre, Betriebssystemschutz und ein vertrauenswürdiges Browserprofil bleiben deshalb relevant.

Backups müssen vor dem Verlassen der Anwendung verschlüsselt und auf Integrität geprüft werden; Format, Schlüsselableitung und Wiederherstellungsablauf werden separat entschieden. Passwörter, Zugangsdaten, Cloud-Zugriffstoken, private Schlüssel und TSE-Schlüssel dürfen nicht ungeschützt in IndexedDB abgelegt werden. Logs dürfen keine vollständigen Geschäfts- oder Einstellungsdatensätze enthalten.

Die lokale Persistenz ändert nichts an der Datenschutzgrenze aus ADR-0001: Kundendaten werden nicht an FRECKA, die Synology oder eine zentrale FRECKA-Datenbank übertragen.

## Aktueller Umsetzungsstand

Mit PERSIST-001a ist eine zentrale, versionierte IndexedDB-Persistenzschicht umgesetzt. PERSIST-002 ergänzt einen getrennten Katalogstore, PERSIST-003 einen getrennten Kundenstore, PERSIST-004 den Receipt-Store und PERSIST-005 den Voucher-Store. Persistiert werden damit die vollständigen zentralen Einstellungen, der Katalog, die Kundenstammdaten, normale Belege, offene und nachträglich erfasste Zahlungen, Stornos, Gutschriften, Gutscheine und Gutschein-Historien.

Der Nummernstand normaler Belege bleibt ausschließlich in den Settings. Normale Abschlüsse schreiben Nummernstand und Beleg gemeinsam; Gutscheinverkauf und -einlösung schreiben Nummernstand, Beleg, Gutschein und Historie in einer Transaktion über `settings`, `receipts` und `vouchers`. Storno und Gutschrift schreiben Ursprung und Folgedokument atomar im Receipt-Store. Dokument-Snapshots bleiben von späteren Stammdatenänderungen unberührt.

Belegentwürfe bleiben noch im Arbeitsspeicher. Backup und Restore sind noch nicht umgesetzt. Auch ein kalter Offline-Start mit abschließendem Service-Worker- und Update-Lebenszyklus ist noch nicht vollständig realisiert.

## Alternativen

### 1. `localStorage` oder `sessionStorage`

Web Storage ist einfach verfügbar, arbeitet jedoch synchron, bietet keine Transaktionen und eignet sich nicht für den wachsenden strukturierten Geschäftsdatenbestand. `sessionStorage` ist zusätzlich an die Sitzung gebunden. Beide Alternativen wurden für Geschäftsdaten verworfen.

### 2. Rein flüchtiger Arbeitsspeicher

Ein ausschließlich flüchtiger Zustand ist für frühe UX-Prototypen einfach, verliert Änderungen jedoch bei Reload, Neustart oder Prozessabbruch. Er erfüllt weder die Offline-First-Zuverlässigkeit noch die Anforderungen an dauerhafte Geschäftsdaten.

### 3. Zentrale Serverdatenbank

Eine zentrale Datenbank könnte Synchronisation und zentrale Backups vereinfachen. Sie würde den Kernbetrieb jedoch von Netz, Serververfügbarkeit und Betreiberinfrastruktur abhängig machen und der verbindlichen lokalen Datenhoheit widersprechen. Diese Alternative wurde bereits durch ADR-0001 für den Kernbetrieb ausgeschlossen.

### 4. SQLite über WebAssembly

SQLite/WASM könnte ein relationales Modell und SQL-Abfragen bereitstellen, erhöht zum aktuellen Entwicklungsstand aber Abhängigkeiten, Bundlegröße, Initialisierungskomplexität sowie Anforderungen an Dateisystem- und Browserintegration. Für den gegenwärtigen Umfang bietet es keinen ausreichenden Vorteil gegenüber der browsernativen IndexedDB-API.

### 5. Dateibasierte Speicherung als primäre Laufzeitdatenbank

Regelmäßige Exporte in eine Datei eignen sich für Backup und Datenaustausch, nicht als primäre Laufzeitdatenbank einer mobilen PWA. Dateizugriffe erfordern zusätzliche Nutzerinteraktionen oder Berechtigungen und bieten keinen gleichwertigen transaktionalen Anwendungszustand. Dateien bleiben deshalb ein mögliches Export- und Backupformat, aber keine primäre Laufzeitspeicherung.

## Migrations- oder Rückweg

Die Entscheidung für IndexedDB ist für die Web-PWA grundlegend, darf Daten aber nicht in einem proprietären oder nicht exportierbaren Zustand einschließen. Persistierte Formate müssen versioniert, dokumentiert und über ein geprüftes Backupformat exportierbar bleiben.

Ein späterer Wechsel zu einer anderen lokalen Speichertechnologie erfordert ein neues ADR und eine transaktional beziehungsweise kontrolliert ausgeführte Migration. Bestehende Daten werden zunächst vollständig gelesen und validiert, anschließend in das neue Format übertragen und geprüft. Der alte Bestand darf erst nach bestätigter Vollständigkeit und einem vorhandenen Wiederherstellungsweg entfernt werden.

Wenn eine Migration nicht sicher abgeschlossen werden kann, bleibt der bisherige Datenbestand unverändert. Ein fehlgeschlagenes Upgrade darf weder leere Standarddaten über einen vorhandenen Bestand schreiben noch abgeschlossene Dokument-Snapshots verändern.

## Folgeentscheidungen

Folgende Themen benötigen eigene Entscheidungen oder spezifizierte Entwicklungsblöcke:

- fachlicher Schnitt der weiteren Object Stores und ihre Transaktionsgrenzen;
- Strategie und Tests für Schema- und Datenformatmigrationen;
- versioniertes Backupformat, Verschlüsselung, Integritätsprüfung und Restore;
- Datenaufbewahrung, fachliche Löschung und vollständiger lokaler Reset;
- Service-Worker-, App-Shell- und Update-Strategie einschließlich sicherer Aktivierung;
- Nutzerinformation, Backup-Erinnerungen und Wiederherstellungswege bei möglichem Speicherverlust auf iOS;
- optionaler Mehrgerätebetrieb, ausschließlich sofern Offline-Kern und lokale Datenhoheit erhalten bleiben.
