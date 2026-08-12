# Lokale Lizenz- und Gerätebindung V1.0

**Stand:** LICENSE-001
**Datenbankschema:** unverändert Version 5
**Ablage:** mandantenbezogener Settings-Datensatz

## Umfang

FRECKA V1.0 bereitet genau eine lokale Lizenz für genau einen Mandanten und genau ein aktives Gerät vor. LICENSE-001 aktiviert oder prüft keine kaufmännische Berechtigung. Es gibt keine Eingabemaske, keine Cloud, keine Onlineaktivierung und keine Kommunikation mit einem Lizenzserver.

Das lokale Modell lautet:

```text
license
├── formatVersion
├── licenseId
├── tenantId
├── deviceId
├── activatedAt
└── lastValidation
```

`license` ist ein einzelnes Objekt und keine Liste. Damit kann V1.0 weder mehrere Lizenzen noch mehrere aktive Geräte darstellen. `tenantId` muss dem Schlüssel des Settings-Datensatzes entsprechen. Eine neuere Lizenzformatversion wird nicht stillschweigend reduziert oder überschrieben.

## Lokale Kennungen

`licenseId` und `deviceId` werden bei der ersten lokalen Initialisierung zufällig und opak erzeugt. Die Erzeugung verwendet keine Namen, Kontaktdaten, Hardware-Seriennummern, Browsermerkmale oder sonstiges Fingerprinting. Beide Kennungen sind unabhängig voneinander und werden nach der ersten erfolgreichen Speicherung nicht aus dem Gerät neu abgeleitet.

Die Stabilität entsteht ausschließlich durch den vorhandenen lokalen Settings-Store. Wird ein historischer Datenstand ohne LICENSE-001 geladen oder wiederhergestellt, erzeugt FRECKA einmalig eine neue lokale Bindung und persistiert sie. Ein vorhandener gültiger Wert wird unverändert übernommen.

`activatedAt` bezeichnet in LICENSE-001 nur den Zeitpunkt, zu dem die vorbereitende lokale Bindung angelegt wurde. `lastValidation` bezeichnet die dazugehörige letzte lokale Strukturprüfung. Beide Angaben sind weder Zahlungsnachweis noch Bestätigung eines Lizenzservers.

## Persistenz, Backup und Restore

LICENSE-001 ergänzt `license` im bestehenden Store `settings`. Es gibt keinen neuen Object Store, keine neue Datenbankversion und keine zweite Snapshotarchitektur. Die Lizenz wird deshalb automatisch durch die zentrale Tenant-Snapshot-API verschlüsselt gesichert und atomar wiederhergestellt.

Vollständig oder teilweise widersprüchliche Lizenzobjekte, fremde Mandanten, ungültige Zeitpunkte und neuere Formatversionen werden abgewiesen. Ausschließlich das vollständige Fehlen von LICENSE-001 in einem historischen ansonsten gültigen Settings-Datensatz darf durch eine neue lokale Bindung ergänzt werden.

## Export und Datenschutz

Der Exporttyp `Eigene Daten` enthält das vollständige lokale Lizenzobjekt in seiner zentralen Projektion. `Export-Info.txt` weist Lizenz-ID, Geräte-ID sowie die beiden Zeitpunkte aus. Der Steuerberaterexport erhält `license: null`; weder seine CSV-Dateien noch das ZIP-Paket enthalten Lizenz- oder Geräteinformationen.

## Zukunftsgrenze

Eine spätere Onlineaktivierung darf auf `licenseId`, `deviceId`, `tenantId` und `formatVersion` aufbauen. Aktivierung, Deaktivierung, Geräteübertragung, Offline-Kulanz, Serverstatus, Signaturen und Fehlerbehandlung benötigen eigene versionierte Protokolle und eine ausdrückliche fachliche Freigabe. LICENSE-001 implementiert keinen dieser Abläufe und leitet aus dem lokalen Objekt keine Nutzungssperre ab.
