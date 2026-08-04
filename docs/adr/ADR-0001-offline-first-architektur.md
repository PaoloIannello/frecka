# ADR-0001: Offline-First-Architektur

## Status

Angenommen

## Kontext

FRECKA richtet sich an kleine, mobil arbeitende Dienstleistungsbetriebe und Selbstständige. Die Anwendung muss auch bei fehlender oder instabiler Internetverbindung zuverlässig funktionieren; ihre Kernabläufe dürfen deshalb nicht von einem zentralen Server abhängig sein. Zugleich sollen Geschäftsdaten unter der Kontrolle des Kunden bleiben.

Der aktuelle Stand ist ein UX-Prototyp. Dieses ADR dokumentiert die bereits getroffene Entscheidung für die Zielarchitektur, nicht den gegenwärtigen Implementierungsstand. Eine klassische SaaS-Architektur mit zentralem Backend würde zusätzliche Abhängigkeiten von Netz und Serverbetrieb sowie höheren Betriebsaufwand und zusätzliche Datenschutzrisiken erzeugen.

## Entscheidung

FRECKA wird als Offline-First Progressive Web App umgesetzt. Nach erfolgreicher Erstinstallation müssen alle Kernfunktionen ohne Internetverbindung nutzbar sein. Programmcode und statische Assets werden lokal über die PWA-App-Shell bereitgestellt.

Geschäftsdaten werden ausschließlich lokal gespeichert. Netzwerkzugriffe sind Zusatzfunktionen und dürfen den lokalen Kernbetrieb nicht blockieren. Schreibvorgänge werden zuerst lokal abgeschlossen; eine Erfolgsbestätigung wird erst nach erfolgreicher lokaler Speicherung angezeigt.

Updates dürfen offene Arbeitsabläufe nicht unterbrechen. Die Synology dient ausschließlich als Update-Server für statische Programmdateien. Kundendaten und Belege werden weder an FRECKA noch an die Synology übertragen.

Die konkrete Wahl der lokalen Speichertechnologie, insbesondere IndexedDB, ist nicht Gegenstand dieses ADR und wird separat dokumentiert.

## Folgen

### Positive Folgen

- Der Kernbetrieb bleibt unabhängig von Internetverbindung und Serververfügbarkeit.
- Kundendaten werden nicht zentral gespeichert; die Datensouveränität des Kunden steigt.
- Für den Kernbetrieb ist weniger laufender Backend-Betrieb erforderlich.
- Lokale Zugriffe ermöglichen eine schnelle Bedienung.
- Ein Ausfall des Update-Servers blockiert die installierte Anwendung nicht.

### Negative und verpflichtende Folgen

- Backup und Wiederherstellung müssen besonders zuverlässig umgesetzt und geprüft werden.
- Geräteverlust und die Löschung von Browserdaten sind relevante Datenverlustrisiken.
- Datenmigrationen müssen lokal, fehlertolerant und wiederanlauffähig funktionieren.
- Mehrgerätebetrieb und Synchronisation sind nicht automatisch gelöst.
- Service-Worker- und Update-Lebenszyklen müssen kontrolliert werden.
- Offline-Zustände, Fehlerfälle und Wiederholungen müssen ausdrücklich getestet werden.
- Nutzer müssen verständlich über lokale Speicherung, Backup und Wiederherstellung informiert werden.

## Alternativen

### 1. Klassisches SaaS mit zentralem Backend und zentraler Datenbank

Ein klassisches SaaS würde Mehrgerätezugriff, zentrale Backups, Synchronisation und zentrale Wartung vereinfachen. Für Version 1.0 wurde es nicht gewählt, weil der Kernbetrieb dadurch von Internet, Backend und Betreiberverfügbarkeit abhängig wäre. Zudem entstünden höherer Betriebsaufwand sowie zusätzliche Datenschutz-, Sicherheits- und Ausfallrisiken durch die zentrale Speicherung.

### 2. Online-First PWA mit eingeschränktem Offline-Cache

Eine Online-First PWA könnte serverseitige Funktionen und eine zentrale Datenhaltung einfacher nutzen; ein begrenzter Cache könnte kurze Verbindungsunterbrechungen abfedern. Sie wurde nicht gewählt, weil ein Cache keinen verlässlich offline nutzbaren Kernbetrieb sicherstellt. Verbindungs- und Synchronisationsfehler würden zu einer fachlichen Abhängigkeit vom Server führen und Datenkonflikte ermöglichen.

### 3. Native App mit lokalem Speicher

Eine native App könnte tieferen Zugriff auf Gerätefunktionen, Betriebssystemintegration und plattformspezifische Speichermechanismen bieten. Für Version 1.0 wurde sie nicht gewählt, weil separate Plattformimplementierungen oder zusätzliche Distributionswege Entwicklungs-, Prüf- und Wartungsaufwand erhöhen würden. Außerdem entstünde eine stärkere Abhängigkeit von Plattformanbietern und deren Freigabe- und Updateprozessen.

### 4. Hybrides Modell mit optionaler zentraler Synchronisation

Ein hybrides Modell könnte lokalen Betrieb mit komfortablem Mehrgerätezugriff, zentralem Backup und Synchronisation verbinden. Für Version 1.0 wurde es nicht gewählt, weil Identität, Verschlüsselung, Konfliktauflösung, Datenschutz und Serverbetrieb den Produktumfang und die Fehlerfläche erheblich vergrößern würden. Eine zentrale Synchronisationskomponente würde zudem neue Betreiber-, Sicherheits- und Verfügbarkeitsabhängigkeiten schaffen.

## Migrations- oder Rückweg

Die Offline-First-Architektur ist eine grundlegende Produktentscheidung. Ein Wechsel zu zentraler Datenhaltung wäre kein kleiner technischer Umbau, sondern eine neue Architekturentscheidung. Er würde ein neues ADR, ein Datenschutz- und Sicherheitskonzept sowie einen klaren und geprüften Migrationsweg erfordern.

Eine spätere optionale Synchronisation ist grundsätzlich möglich, solange der lokale Kernbetrieb erhalten bleibt und keine zentrale Abhängigkeit entsteht. Bestehende lokale Daten dürfen bei Architekturänderungen niemals ohne geprüften Export-, Migrations- und Wiederherstellungsweg gefährdet werden.
