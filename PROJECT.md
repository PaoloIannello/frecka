# FRECKA – Architektur- und Entwicklungsrichtlinie

**Status:** Verbindliche Leitlinie  
**Geltungsbereich:** Alle zukünftigen Produkt-, Architektur- und Entwicklungsarbeiten an FRECKA  
**Letzte Aktualisierung:** 7. August 2026

Dieses Dokument beschreibt die verbindliche Zielrichtung von FRECKA. Der aktuelle Stand ist ein browserbasierter Prototyp mit lokaler IndexedDB-Persistenz für Einstellungen, Katalog, Kunden, Belege und Gutscheine sowie manueller verschlüsselter Gesamtsicherung und atomarer Wiederherstellung. Aussagen zu noch offenen Teilen der Zielarchitektur kennzeichnen nicht automatisch bereits implementierte Funktionen. Abweichungen von diesen Leitlinien benötigen eine dokumentierte Architekturentscheidung (ADR) mit Begründung, Folgen und Migrationsweg.

## 1. Projektvision

FRECKA ist ein verlässliches, mobiles Belegwerkzeug für kleine Unternehmen und Selbstständige. Es soll Belege im direkten Kundenkontakt schnell, verständlich und auch ohne Internetverbindung erfassbar machen. Die Anwendung gehört funktional dem Betrieb: Geschäftsdaten verbleiben unter seiner Kontrolle, der laufende Betrieb hängt nicht von einem zentralen FRECKA-Dienst ab.

Der Produkterfolg wird an einem einfachen, robusten Arbeitsablauf gemessen – nicht an der Anzahl verfügbarer Funktionen.

## 2. Zielgruppe

FRECKA richtet sich primär an kleine, lokal arbeitende Dienstleistungsbetriebe und Selbstständige, beispielsweise Friseur-, Kosmetik-, Podologie- oder vergleichbare Betriebe.

Typische Rahmenbedingungen:

- überwiegend mobile Nutzung auf Smartphone oder Tablet;
- wenig Zeit für Einarbeitung und Administration;
- häufige Nutzung während des Kundentermins;
- zeitweise instabile oder fehlende Internetverbindung;
- hoher Bedarf an Datenschutz, Datensouveränität und nachvollziehbaren Abläufen;
- keine eigene IT-Abteilung.

## 3. Produktphilosophie

1. **Einfachheit vor Funktionsvielfalt.** Jede Funktion muss einen klaren, häufigen Anwendungsfall lösen.
2. **Offline ist der Normalfall.** Kernabläufe dürfen keine Netzwerkverbindung voraussetzen.
3. **Lokale Datenhoheit.** Geschäftsdaten gehören dem Kunden und bleiben auf seinen Geräten beziehungsweise in seinem selbst gewählten Cloudspeicher.
4. **Verlässlichkeit vor Neuheit.** Vorhersehbares Verhalten ist wichtiger als technische oder visuelle Trends.
5. **Wartbarkeit vor Entwicklungsgeschwindigkeit.** Verständlicher, testbarer Code hat Vorrang vor kurzfristig schnellen Lösungen.
6. **Schrittweise Weiterentwicklung.** Kleine, rückwärtskompatible Änderungen reduzieren Betriebs- und Datenrisiken.

## Nichtziele / Out of Scope

FRECKA ist ausdrücklich kein ERP-System, keine Warenwirtschaft, kein vollständiges CRM, keine Buchhaltungssoftware, keine klassische Kassensoftware und kein komplexes Termin- oder Buchungssystem. FRECKA wird weder ein zentrales SaaS noch eine Plattform mit zentraler Speicherung von Geschäfts- oder Kundendaten. Es wird auch kein Funktionssammelsurium für seltene Sonderfälle.

Neue Funktionen werden nur aufgenommen, wenn sie den einfachen Kernablauf für die Zielgruppe nachweislich verbessern und die Bedienung nicht unnötig verkomplizieren.

## 4. Architekturprinzipien

- FRECKA ist eine **Offline-First Progressive Web App (PWA)**.
- Die Anwendung wird als statische Webanwendung ausgeliefert. Für den Kernbetrieb ist kein FRECKA-Backend erforderlich.
- UI, Geschäftslogik, Persistenz und Infrastrukturzugriffe werden klar voneinander getrennt.
- Domänenregeln dürfen nicht von DOM, Netzwerk oder einem konkreten Speicheradapter abhängen.
- IndexedDB-Zugriffe erfolgen ausschließlich über eine definierte Persistenzschicht; direkte Datenbankzugriffe aus UI-Komponenten sind unzulässig.
- Netzwerkzugriffe sind explizit, minimal und für den Nutzer nachvollziehbar. Ein Netzwerkausfall darf keine lokalen Geschäftsdaten beschädigen.
- Datenformate und Datenbankschemata werden versioniert. Migrationen sind vorwärtsgerichtet, atomar soweit technisch möglich und wiederholbar testbar.
- Neue Abhängigkeiten und Frameworks benötigen einen belegbaren Nutzen, eine Wartbarkeitsprüfung und eine dokumentierte Entscheidung.
- Progressive Enhancement gilt als Grundsatz: Kernabläufe müssen auf unterstützten mobilen Browsern robust funktionieren.
- Rechtlich oder fachlich relevante Regeln werden nicht stillschweigend in der Darstellung versteckt, sondern als testbare Geschäftslogik umgesetzt.

## 5. Technologiestack

### Aktueller Prototyp

- semantisches HTML5;
- CSS ohne Build-Schritt;
- modernes, browsernatives JavaScript;
- Web App Manifest;
- statische Auslieferung.

Seit PERSIST-001a speichert der Prototyp die vollständigen Einstellungen über eine zentrale, versionierte IndexedDB-Schicht. PERSIST-002 ergänzt den Katalog, PERSIST-003 die Kundenstammdaten, PERSIST-004 normale Belege, offene Zahlungen, Stornos sowie Gutschriften und PERSIST-005 Gutscheine samt Historie. Verkauf und Einlösung bestätigen Nummernstand, Beleg, Gutschein und Historie atomar. BACKUP-001 ergänzt einen vollständigen Tenant-Snapshot, eine lokal verschlüsselte `.frecka-backup`-Datei und einen atomaren Restore aller fünf Stores. HARDEN-001 macht Kunden deaktivierbar statt löschbar und härtet Sicherungskennwort, Dateiname und iOS-Dateiauswahl UX-seitig. Belegentwürfe bleiben bis zu ihrem Persistenzblock ausschließlich im Arbeitsspeicher. Dieser Zwischenstand darf nicht mit der vollständigen Zielarchitektur verwechselt werden.

### Verbindliche Zielbasis

- HTML5, CSS und modernes JavaScript als Webplattform;
- PWA mit Web App Manifest und Service Worker;
- IndexedDB als Hauptdatenbank für Geschäftsdaten;
- Web Crypto API für kryptografische Funktionen;
- statische, versionierte Programmdateien auf der Synology als Update-Quelle;
- standardisierte Browser-APIs bevorzugt vor zusätzlichen Laufzeitabhängigkeiten.

Ein Build-System, Framework, eine UI-Bibliothek oder zusätzliche Backend-Komponente wird erst eingeführt, wenn der Nutzen die zusätzliche Komplexität, Updatefläche und langfristige Wartung rechtfertigt. Die Entscheidung ist in einem ADR festzuhalten.

## 6. Offline-First-Konzept

- Nach erfolgreicher Erstinstallation müssen alle Kernabläufe ohne Internet funktionieren: App starten, Beleg erfassen und bearbeiten, lokale Stammdaten verwenden, vorhandene Belege anzeigen sowie eine verschlüsselte Gesamtsicherung erstellen und wiederherstellen.
- Der Service Worker hält eine versionierte, in sich konsistente App-Shell aus HTML, CSS, JavaScript, Manifest und notwendigen statischen Assets vor.
- Geschäftsdaten werden nicht im Service-Worker-Cache gespeichert. Dafür ist ausschließlich die Persistenzschicht auf Basis von IndexedDB zuständig.
- Schreibvorgänge werden zuerst lokal und transaktional abgeschlossen. Die UI bestätigt einen Vorgang erst nach erfolgreicher lokaler Speicherung.
- Netzwerkfunktionen sind Zusatzfunktionen. Sie müssen einen eindeutigen Offline-, Fehler- und Wiederholungszustand besitzen.
- Ein Update darf einen aktiven Arbeitsablauf nicht unterbrechen. Eine neue Version wird im Hintergrund vorbereitet und erst nach Nutzerhinweis zu einem sicheren Zeitpunkt aktiviert.
- Cache-Namen, App-Version, Datenbankschema und Backupformat werden unabhängig, aber nachvollziehbar versioniert.

## 7. Datenhaltung

IndexedDB ist die verbindliche Hauptdatenbank. Einstellungen werden seit PERSIST-001a, Katalogdaten seit PERSIST-002, Kundenstammdaten seit PERSIST-003, abgeschlossene Belege einschließlich offener Zahlungen, Stornos, Gutschriften und Aktivitäten seit PERSIST-004 sowie Gutscheine einschließlich Restwerten, Referenzen, Snapshots und unveränderlich angehängter Historien seit PERSIST-005 darin gespeichert. BACKUP-001 kann diesen vollständigen mandantenbezogenen Stand verschlüsselt exportieren und nach Vollprüfung atomar wiederherstellen. Belegentwürfe folgen in einem getrennten, ausdrücklich beauftragten Persistenzblock.

Verbindliche Regeln:

- Geschäftsdaten bleiben ausschließlich lokal auf dem Endgerät, sofern der Nutzer nicht ausdrücklich einen verschlüsselten Backup-Export auslöst.
- Kundendaten werden niemals zentral bei FRECKA oder auf der Synology gespeichert.
- `localStorage` ist nicht für Geschäftsdaten zulässig. Es darf höchstens unkritische, leicht wiederherstellbare UI-Präferenzen enthalten.
- Datensätze besitzen stabile IDs, Erstellungs- und Änderungszeitpunkte sowie eine dokumentierte Schemaversion, soweit für Migration und Nachvollziehbarkeit erforderlich.
- Geldbeträge werden intern ohne Gleitkomma-Rundungsfehler gespeichert, vorzugsweise als ganzzahlige Cent-Beträge.
- Abgeschlossene Geschäftsvorgänge werden nicht unkontrolliert überschrieben. Korrekturen erfolgen über fachlich nachvollziehbare Folgeoperationen.
- Datenbankmigrationen müssen bestehende Daten erhalten, in Tests mit realistischen Altbeständen geprüft werden und bei Fehlern einen sicheren Wiederanlauf erlauben.
- Ein verschlüsseltes Backup umfasst Daten, Formatversion, Integritätsinformationen und die für einen kontrollierten Import nötigen Metadaten.
- Der optionale Cloudspeicher wird ausschließlich vom Kunden ausgewählt und kontrolliert. FRECKA besitzt dort kein zentrales Konto und keine eigene Kopie.
- Vor einem Import werden Entschlüsselung, Integrität, Formatversion und Kompatibilität geprüft. Ein Import darf den vorhandenen Bestand nicht ohne ausdrückliche Bestätigung ersetzen.

## 8. Update-Strategie

Die Synology dient ausschließlich als Update-Server. Sie stellt statische Programmdateien und notwendige Update-Metadaten bereit; sie empfängt und speichert keine Geschäfts- oder Nutzungsdaten.

- Updates ersetzen ausschließlich Programmcode und statische Assets.
- Ein Update liest Geschäftsdaten nur lokal im Rahmen einer dokumentierten Schemamigration. Es überträgt sie nicht an den Update-Server.
- Releases sind unveränderlich, eindeutig versioniert und über ein geprüftes Manifest mit Integritätsinformationen auslieferbar. Die Herkunft und Integrität eines Updates müssen vor Aktivierung verifiziert werden.
- Die neue App-Shell wird vollständig geladen und geprüft, bevor sie aktiv wird. Unvollständige Downloads dürfen die zuletzt funktionsfähige Version nicht verdrängen.
- Der Nutzer erhält eine verständliche Information, wenn ein Update bereitsteht. Die Aktivierung erfolgt nicht mitten in einem offenen Beleg.
- Datenmigration und Codeaktivierung werden so entkoppelt, dass ein fehlgeschlagenes Update keine Geschäftsdaten löscht.
- Für jedes Release existieren Versionshinweise, ein getesteter Upgrade-Pfad und – soweit mit Datenmigrationen vereinbar – ein Wiederherstellungsplan.

## 9. Sicherheitsprinzipien

- **Datensparsamkeit:** Es werden nur Daten erhoben und gespeichert, die für den konkreten Geschäftszweck erforderlich sind.
- **Keine zentrale Datensammlung:** Keine Kundendaten, Belege, Kataloge oder Nutzungsprofile werden an FRECKA, die Synology oder Dritte übertragen.
- **Verschlüsselte Backups:** Backupdaten werden vor Verlassen der Anwendung mit einer etablierten, durch die Web Crypto API bereitgestellten authentifizierten Verschlüsselung geschützt. Schlüssel oder Passphrasen werden nicht gemeinsam mit dem Backup gespeichert oder an FRECKA übertragen.
- **Sichere Voreinstellungen:** Exporte, Netzwerkzugriffe und potenziell irreversible Aktionen benötigen eine klare Nutzerhandlung.
- **Integrität:** Backup- und Updateformate werden auf Manipulation, Vollständigkeit und unterstützte Versionen geprüft.
- **Websicherheit:** Eingaben werden validiert, Ausgaben kontextgerecht kodiert und eine restriktive Content Security Policy wird angestrebt. Kein `eval`, keine dynamische Ausführung fremder Skripte und keine ungeprüften Drittinhalte.
- **Abhängigkeitssicherheit:** Externe Pakete werden sparsam eingesetzt, versioniert, geprüft und regelmäßig aktualisiert. Drittanbieter-CDNs dürfen für den Offline-Kernbetrieb nicht erforderlich sein.
- **Geheimnisse:** Zugangsdaten, Schlüssel und echte Kundendaten gehören weder in Quellcode noch in Git, Logs, Demo- oder Testdaten.
- **Löschung und Reset:** Destruktive Aktionen benennen Umfang und Folgen, verlangen Bestätigung und bieten, wo sinnvoll, vorher einen Backuphinweis.
- **Protokollierung:** Logs enthalten keine sensiblen Geschäftsdaten. Diagnosefunktionen sind lokal, begrenzt und transparent.

## 10. UX-Grundsätze

- **Mobile First:** Gestaltung und Implementierung beginnen beim Smartphone und skalieren anschließend auf größere Displays.
- Kunden werden im normalen Betrieb deaktiviert und wieder aktiviert, nicht endgültig gelöscht. Deaktivierte Kunden bleiben in historischen Belegen, Gutscheinen und Snapshots erhalten und werden für neue Vorgänge standardmäßig ausgeblendet.
- Die häufigsten Aufgaben benötigen möglichst wenige, eindeutige Schritte.
- Häufig genutzte Kernfunktionen eines Hauptmenüpunkts müssen in höchstens drei bewussten Interaktionen erreichbar sein, sofern keine fachlich oder rechtlich zwingenden Schritte entgegenstehen.
- FRECKA unterstützt bestehende Arbeitsabläufe des Betriebs, statt sie unnötig zu ersetzen.
- Primäre Aktionen sind gut erreichbar, konsistent benannt und visuell klar von sekundären oder destruktiven Aktionen getrennt.
- Die Anwendung zeigt jederzeit verständlich, ob Daten gespeichert, ein Vorgang offen, die Verbindung offline oder ein Update bereit ist.
- Kein Kernablauf darf durch fehlendes Netz blockiert oder durch einen ungeplanten Reload verloren gehen.
- Formulare vermeiden unnötige Pflichtfelder, erhalten Eingaben bei Fehlern und verwenden passende mobile Eingabetypen.
- Touch-Ziele, Kontraste, Fokusführung, Tastaturbedienung, semantische Struktur und verständliche Beschriftungen orientieren sich mindestens an WCAG 2.2 AA.
- Sprache ist kurz, konkret und frei von technischem Jargon. Fehlermeldungen erklären Problem und nächsten sinnvollen Schritt.
- Leistungsfähigkeit ist Teil der UX: schneller Start, unmittelbares Feedback und flüssige Bedienung auch auf durchschnittlichen Geräten.
- Neue Funktionen müssen den bestehenden Hauptablauf vereinfachen oder einen nachgewiesenen Bedarf erfüllen. Zusätzliche Optionen dürfen den Standardfall nicht überladen.

## 11. Entwicklungsregeln

1. Vor der Umsetzung werden Ziel, Akzeptanzkriterien, Datenfolgen sowie Offline- und Fehlerverhalten geklärt.
2. Änderungen bleiben klein, fokussiert und leicht überprüfbar. Unabhängige Refactorings werden nicht mit Funktionsänderungen vermischt.
3. Wartbarkeit hat Vorrang vor schneller Entwicklung: klare Namen, kleine Verantwortungsbereiche, explizite Schnittstellen und möglichst wenig globale Zustände.
4. Geschäftslogik wird unabhängig von der UI implementiert und automatisiert getestet.
5. Für Persistenz, Migrationen, Backup/Restore, Updatewechsel und sicherheitskritische Pfade sind automatisierte Tests verpflichtend.
6. Jeder Fehlerfix erhält nach Möglichkeit einen Regressionstest.
7. Änderungen werden mindestens in aktuellen unterstützten mobilen Browsern geprüft; Offline-, Neustart- und Updatefälle gehören zur Abnahme relevanter Funktionen.
8. Barrierefreiheit, Ladezeit und Datensicherheit sind Definition-of-Done-Kriterien, keine nachgelagerten Aufgaben.
9. Neue Abhängigkeiten erfordern eine Begründung hinsichtlich Größe, Lizenz, Sicherheit, Offline-Fähigkeit und Wartungsstatus.
10. Öffentliche Datenstrukturen, Datenbankschemata, Backupformate und relevante Architekturentscheidungen werden dokumentiert.
11. Keine produktiven Kundendaten in Entwicklung, Tests, Screenshots oder Fehlerberichten. Testdaten sind eindeutig fiktiv.
12. Bestehende Daten werden niemals ohne geprüfte Migration verworfen. Vor riskanten Datenänderungen ist ein Wiederherstellungsweg nachzuweisen.
13. Code Reviews prüfen mindestens Korrektheit, Verständlichkeit, Tests, Offline-Verhalten, Migrationen, Sicherheit und UX-Auswirkungen.
14. Fertig bedeutet: Akzeptanzkriterien erfüllt, relevante Tests bestanden, keine bekannten Datenrisiken und Dokumentation aktualisiert.

## 12. Git-Workflow

- Die Hauptbranch bleibt jederzeit lauffähig und releasefähig.
- Arbeit erfolgt in kurzen, thematisch eindeutigen Branches. Empfohlenes Schema: `feature/<thema>`, `fix/<thema>`, `docs/<thema>` oder `chore/<thema>`.
- Commits sind klein, sicher und logisch abgeschlossen. Ein Commit verfolgt genau einen nachvollziehbaren Zweck.
- Commit-Nachrichten stehen im Imperativ und beschreiben die Wirkung, beispielsweise `Add encrypted backup format validation`.
- Keine generierten Artefakte, Zugangsdaten, lokalen Konfigurationen oder echten Geschäftsdaten committen.
- Vor dem Zusammenführen müssen relevante Tests und manuelle Kernprüfungen erfolgreich sein.
- Änderungen an Persistenz, Migration, Backup, Sicherheit oder Updateprozess benötigen ein besonders sorgfältiges Review und dokumentierte Rückwärtskompatibilität.
- Refactorings und Verhaltensänderungen werden möglichst getrennt eingecheckt.
- Releases erhalten eine eindeutige semantische Version, Versionshinweise und einen reproduzierbaren Stand. Kritische Fehler werden über einen kleinen Fix-Branch behoben, nicht durch ungeprüfte Direktänderungen.
- Force-Pushes auf gemeinsam genutzte oder geschützte Branches sowie das Umschreiben veröffentlichter Historie sind unzulässig.

## 13. Roadmap Version 1.0

Die Version 1.0 liefert einen kleinen, stabilen und vollständig offline nutzbaren Kern. Reihenfolge und Umfang werden an Risiken und Nutzerwert ausgerichtet.

### Fundament

- Produktnamen, unterstützte Browser und fachlichen Mindestumfang verbindlich festlegen;
- bestehende UX-Erkenntnisse konsolidieren und Zielarchitektur in klar getrennte Module überführen;
- installierbare PWA mit robuster App-Shell und kontrolliertem Service-Worker-Lebenszyklus;
- automatisierte Tests, Qualitätsprüfungen und reproduzierbaren Releaseprozess etablieren.

### Lokale Datenbasis

- versioniertes IndexedDB-Schema und zentralen Persistenzadapter implementieren;
- Einstellungen, Geschäftsbereiche, Katalog, Kunden, Belegentwürfe und Belege dauerhaft lokal speichern;
- Transaktionen, Validierung, Datenmigrationen und Wiederanlauf nach Abbruch testen;
- sichere lokale Rücksetzung und transparente Speicherinformationen bereitstellen.

### Kernprodukt

- Belege mobil erfassen, zwischenspeichern, fortsetzen und abschließen;
- Leistungen, Produkte, Mengen, Preise, Rabatte, Steuern und Zahlungsarten nachvollziehbar behandeln;
- Kunden optional verwalten und Belegen zuordnen;
- Belegübersicht, Detailansicht und fachlich nachvollziehbare Korrekturen bereitstellen;
- Belegausgabe beziehungsweise Export im definierten v1-Umfang umsetzen;
- Gutschein-Grundfunktionen nur aufnehmen, wenn der vollständige und testbare v1-Ablauf klar definiert ist.

### Datensouveränität und Betrieb

- das mit BACKUP-001 implementierte versionierte, verschlüsselte Backupformat auf realen Zielgeräten freigeben;
- den mit BACKUP-001 implementierten kontrollierten Restore mit Integritäts- und Kompatibilitätsprüfung auf realen Zielgeräten abnehmen;
- vom Kunden kontrollierte Ablage ermöglichen, ohne zentralen FRECKA-Speicher;
- statische, integritätsgeprüfte Updates von der Synology mit sicherem Aktivierungszeitpunkt umsetzen;
- Offline-, Update-, Migrations-, Backup- und Restore-Szenarien auf realen Zielgeräten abnehmen.

### Freigabekriterien für 1.0

- Kernabläufe funktionieren nach Erstinstallation ohne Netzwerk;
- kein Kernablauf verliert Daten bei Reload, App-Wechsel oder kontrolliertem Update;
- Migrationen aus allen freigegebenen Vorversionen sind getestet;
- verschlüsseltes Backup und Restore sind erfolgreich auf Zielgeräten geprüft;
- die Synology empfängt keine Geschäftsdaten;
- Sicherheits-, Datenschutz-, Barrierefreiheits- und Performanceprüfung sind abgeschlossen;
- Nutzer- und Wiederherstellungsdokumentation ist vorhanden.

## 14. Roadmap nach Version 1.0

Erweiterungen nach 1.0 werden anhand realer Nutzung priorisiert. Sie dürfen die Offline-Fähigkeit, Datenhoheit oder Einfachheit des Kernprodukts nicht aufweichen.

Mögliche Entwicklungsfelder:

- komfortablere lokale Auswertungen und Exporte;
- erweiterte Katalog-, Gutschein- und Kundenfunktionen;
- optionale, Ende-zu-Ende verschlüsselte Synchronisation zwischen Kundengeräten, ausschließlich mit kundeneigenem Speicher und ohne zentralen FRECKA-Datenbestand;
- verbesserte Wiederherstellung, Backuprotation und vom Kunden steuerbare Automatisierung;
- zusätzliche Ausgabe-, Druck- und Integrationswege mit klarer Einwilligung und lokaler Kontrolle;
- Mehrsprachigkeit und weitergehende Barrierefreiheit;
- branchenspezifische, modular aktivierbare Funktionen;
- weitergehende Diagnose- und Supportwerkzeuge ohne Übertragung sensibler Geschäftsdaten.

Für jede Erweiterung gelten vor Aufnahme in die Roadmap folgende Fragen:

1. Löst sie ein belegtes Problem der Zielgruppe?
2. Bleibt der Standardablauf einfach?
3. Funktioniert der relevante Kern weiterhin offline?
4. Bleiben Geschäftsdaten vollständig unter Kontrolle des Kunden?
5. Sind Datenmigration, Sicherheit, Wartung und Rückweg geklärt?

Eine spätere Online- oder Integrationsfunktion ist niemals Voraussetzung für den lokalen Kernbetrieb. Ein zentraler FRECKA-Kundendatenspeicher ist auch nach Version 1.0 nicht vorgesehen.
