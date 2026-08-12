# ADR-0004: Lizenz- und Gerätemodell für Version 1.0

## Status

Angenommen

## Kontext

FRECKA speichert Geschäftsdaten lokal und besitzt in V1.0 keine Mehrgeräte-Synchronisation. Ein unkontrollierter gleichzeitiger Betrieb derselben Lizenz auf mehreren Geräten würde getrennte lokale Datenstände erzeugen, ohne Konfliktauflösung oder zentrale Wahrheit.

Für Produkt, Support und den späteren Lizenzdienst wird deshalb eine eindeutige V1.0-Grenze benötigt. Gleichzeitig müssen Gerätewechsel, Defekt und Verlust behandelbar bleiben, ohne lokale Geschäftsdaten zentral bei FRECKA zu speichern.

Die Begriffe Mandant und Filiale bezeichnen in diesem ADR die lizenzierte organisatorische Einheit. Geschäftsbereiche und Leistungsorte innerhalb des lokalen FRECKA-Datenmodells sind dadurch nicht automatisch eigene Lizenzen. Eine spätere feinere kaufmännische Zuordnung benötigt eine Folgeentscheidung.

## Entscheidung

Für FRECKA V1.0 gilt:

1. Eine Lizenz gehört genau zu einem Mandanten beziehungsweise einer Filiale.
2. Pro Lizenz darf gleichzeitig genau ein Gerät aktiv sein.
3. Mehrgerätebetrieb und Mehrgeräte-Synchronisation sind nicht Bestandteil von V1.0 und frühestens für eine spätere 2.x-Version vorgesehen.
4. Ein Gerätewechsel muss über kontrollierte Deaktivierung oder administrative Lizenzübertragung möglich sein.
5. Bei Defekt oder Verlust muss eine administrative Rücksetzung der Gerätebindung möglich sein.
6. Geschäftsdaten werden nicht durch den Lizenzdienst übertragen. Der Nutzer überträgt sie getrennt über verschlüsseltes Backup und Restore.
7. Der Lizenzdienst speichert ausschließlich die für Lizenzzuordnung, Aktivierungsstatus, Gerätebindung und Sicherheitsnachweis notwendigen Daten.
8. Ausfall oder fehlende Verbindung zum Lizenzdienst darf vorhandene lokale Geschäftsdaten nicht verändern oder löschen.
9. Die lokale V1.0-Vorbereitung verwendet eine zufällig erzeugte, opake `deviceId`. Sie wird lokal persistiert und nicht aus Hardware-, Browser- oder Personendaten abgeleitet.
10. Das lokale Lizenzobjekt ist noch kein Aktivierungsnachweis und bewirkt ohne einen später ausdrücklich freigegebenen Aktivierungsdienst keine Nutzungssperre.

Noch offen und vor Implementierung verbindlich zu entscheiden sind:

- Dauer und Semantik einer Offline-Kulanz;
- Zuordnung und Nachweis der lokal vorbereiteten opaken Gerätekennung im späteren Lizenzdienst;
- Aktivierungs-, Deaktivierungs- und Übertragungsprotokoll;
- Datenschutzinformationen und Löschfristen;
- Missbrauchs-, Support- und Wiederherstellungsprozess;
- Verhalten bei abgelaufener oder gesperrter Lizenz, ohne Datenzugriff oder Backup zu gefährden.

## Folgen

### Positive Folgen

- V1.0 benötigt keine Synchronisations- oder Konfliktarchitektur.
- Lizenz- und Supportfälle besitzen eine klare Gerätezuordnung.
- Gerätewechsel bleibt möglich, ohne Geschäftsdaten zentral zu speichern.
- Das Modell schützt vor versehentlich auseinanderlaufenden aktiven Datenständen derselben Lizenz.

### Negative und verpflichtende Folgen

- Gleichzeitige Nutzung auf mehreren Geräten ist in V1.0 ausgeschlossen.
- Geräteverlust benötigt einen sicheren administrativen Rücksetzprozess.
- Offline-First und Lizenzdurchsetzung müssen sorgfältig austariert werden.
- Der Lizenzdienst wird für Aktivierung und Übertragung sicherheitskritisch und benötigt eigene Authentisierung, Rate Limits, Protokollierung und Wiederherstellung.
- Die UI muss Lizenzstatus und notwendige Schritte verständlich erklären, ohne lokale Daten zu sperren oder zu löschen.

## Alternativen

### 1. Unbegrenzte Geräte pro Lizenz

Diese Variante wird für V1.0 verworfen, weil lokale Datenstände ohne Synchronisation unbemerkt auseinanderlaufen könnten.

### 2. Mehrgerätebetrieb mit zentraler Synchronisation

Diese Variante wird für V1.0 verworfen. Identität, Ende-zu-Ende-Verschlüsselung, Konfliktauflösung, Offlinewarteschlangen und Wiederherstellung würden den Umfang erheblich erweitern.

### 3. Dauerhafte Bindung ohne Gerätewechsel

Diese Variante wird verworfen, weil Defekt, Verlust und regulärer Hardwarewechsel praktisch lösbar bleiben müssen.

## Migrations- oder Rückweg

Eine spätere 2.x-Mehrgerätearchitektur benötigt ein eigenes ADR und einen geprüften Migrationsweg für Lizenz, Geräte, lokale Datenbestände, Konflikte und Verschlüsselung. Die V1.0-Gerätebindung darf nicht stillschweigend in eine Synchronisationszusage umgedeutet werden.

Wird der Lizenzdienst ersetzt, müssen aktive Zuordnungen und Übertragungsrechte kontrolliert migriert werden. Lokale Geschäftsdaten bleiben davon unberührt.
