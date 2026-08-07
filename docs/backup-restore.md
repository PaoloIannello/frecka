# Verschlüsselte Sicherung und Wiederherstellung

**Stand:** HARDEN-001 auf Basis BACKUP-001
**Datenbankschema:** 5
**Backupformat:** 1
**Geltungsbereich:** Vollständiger lokaler Datenstand eines Mandanten

## Zweck und Grenzen

FRECKA erstellt eine manuell ausgelöste, verschlüsselte Gesamtsicherung aller dauerhaft gespeicherten Geschäftsdaten. Verschlüsselung und Entschlüsselung erfolgen ausschließlich im Browser auf dem Endgerät. Die Datei wird weder an FRECKA noch an einen Server übertragen; Ziel und weitere Aufbewahrung bestimmt allein der Nutzer.

BACKUP-001 enthält keine Cloudanbindung, Synchronisation, Automatik, Zeitplanung oder inkrementelle Sicherung. Die Anwendung speichert weder Sicherungsdatei noch Passphrase oder abgeleiteten Schlüssel. PDF-, QR-Bild-, Mail-, Kamera- und Druckdaten sind weiterhin kein Bestandteil des Backups.

## Zentrale APIs

`js/persistence.js` stellt die wiederverwendbaren mandantenbezogenen Datenoperationen bereit:

- `exportTenantSnapshot(options)` liest `settings`, `catalog`, `customers`, `receipts` und `vouchers` in einer gemeinsamen Readonly-Transaktion. Fehlt beim Erststart noch ein Store-Datensatz, darf ausschließlich die Projektion der bestehenden zentralen Laufzeitquelle als Fallback verwendet werden.
- `validateTenantSnapshot(snapshot)` prüft das komplette entschlüsselte Datenpaket, ohne IndexedDB zu verändern.
- `restoreTenantSnapshot(snapshot)` validiert erneut und ersetzt danach alle fünf Store-Datensätze in genau einer Readwrite-Transaktion.

Die UI besitzt keinen direkten IndexedDB-Zugriff. Das spätere Exportmodul kann `exportTenantSnapshot` wiederverwenden, ohne eine zweite Datenquelle oder Parallelarchitektur einzuführen.

## Inneres Snapshotformat

Der verschlüsselte Payload ist ein JSON-Objekt mit:

- `backupFormat: "FRECKA_TENANT_SNAPSHOT"`;
- `backupFormatVersion: 1`;
- `appDataSchemaVersion: 5`;
- `tenantId`;
- `createdAt` als ISO-Zeitstempel;
- `app.version` und `app.build`;
- `stores.settings`;
- `stores.catalog`;
- `stores.customers`;
- `stores.receipts`;
- `stores.vouchers`.

Jeder Store enthält seinen bestehenden versionierten Datensatz einschließlich `tenantId`. Das Snapshotformat erfindet keine zusätzlichen Geschäftsmodelle. Beleg- und Gutscheinsnapshots, Historien, QR-Referenzen, Nummernstand und fachliche Referenzen bleiben Teil ihrer bisherigen Store-Objekte.

## Äußeres Dateiformat

Dateiendung: `.frecka-backup`

Der sichtbare Dateiname folgt `FRECKA-Backup-YYYY-MM-DD-HHMM.frecka-backup`. Er enthält keine Leer- oder Sonderzeichen und bleibt bei alphabetischer Sortierung chronologisch. Der Download verwendet bewusst den neutralen Typ `application/octet-stream`, weil das webbasierte FRECKA-Format keine auf iOS registrierte native Uniform-Type-Kennung besitzt.

Der sichtbare JSON-Dateikopf enthält ausschließlich Format- und Kryptoparameter:

```json
{
  "backupFormat": "FRECKA_ENCRYPTED_BACKUP",
  "backupFormatVersion": 1,
  "crypto": {
    "kdf": {
      "name": "PBKDF2",
      "hash": "SHA-256",
      "iterations": 600000,
      "salt": "Base64"
    },
    "cipher": {
      "name": "AES-GCM",
      "keyLength": 256,
      "iv": "Base64",
      "tagLength": 128
    }
  },
  "payload": "Base64"
}
```

Salt und IV werden für jede Datei mit `crypto.getRandomValues` neu erzeugt. Der Schlüssel wird mit PBKDF2-HMAC-SHA-256 aus der Passphrase abgeleitet, ist nicht extrahierbar und wird nur für den laufenden Vorgang verwendet. AES-GCM verschlüsselt den Payload und prüft dessen Authentizität. Der kanonische Dateikopf wird als Additional Authenticated Data eingebunden, sodass eine Manipulation relevanter Kopfparameter die Entschlüsselung ebenfalls scheitern lässt.

Die aktuelle Mindestlänge einer Passphrase beträgt 12 Zeichen. Sie ersetzt keine Empfehlung für einen langen, einzigartigen Merksatz. FRECKA kann eine verlorene Passphrase nicht zurücksetzen.

## Vollvalidierung vor Restore

Vor jeder Schreibtransaktion werden mindestens geprüft:

- äußeres und inneres Format sowie unterstützte Versionsstände;
- vollständige Anwesenheit aller fünf Stores;
- Übereinstimmung sämtlicher `tenantId`-Werte;
- gültige Store-Formatversionen und Datenstrukturen;
- eindeutige Kunden-, Beleg- und Gutschein-IDs;
- eindeutige Belegnummern, Gutscheinreferenzen und sichtbare Gutscheincodes;
- gültige Katalog-, Geschäftsbereichs- und Leistungsortzuordnungen;
- Gutscheinwerte ohne negative Restwerte und ohne Restwerte über dem Ursprungswert;
- unverfälschte, chronologische Gutscheinhistorien;
- gültige Referenztypen und widerspruchsfreie Gegenreferenzen, wenn beide Seiten im Datenpaket vorhanden sind;
- ein Belegnummernstand oberhalb der höchsten vorhandenen Nummer des aktuellen Präfixes.

Die fünf Stores besitzen absichtlich getrennte Entwickler-Resets. Daher darf eine alte Beleg- oder Gutscheinreferenz auf einen durch einen solchen Store-Reset nicht mehr vorhandenen Gegenstand zeigen. Sie bleibt als historische Referenz erhalten. Ist das referenzierte Gegenobjekt vorhanden, muss die Zuordnung widerspruchsfrei sein.

Unvollständige, beschädigte, manipulierte, mandantenfremde oder inkompatible Daten werden vollständig abgelehnt. Die Validierung führt keine stillen Reparaturen durch und schreibt nichts in IndexedDB.

## Atomare Wiederherstellung

Nach positiver Vollvalidierung öffnet die Persistenzschicht eine gemeinsame Readwrite-Transaktion über alle fünf Stores. Jeder Store erhält genau den geprüften Datensatz des aktuellen Mandanten. Erst `transaction.oncomplete` bestätigt den Erfolg.

Schlägt irgendein Put-Vorgang fehl oder wird die Transaktion abgebrochen, rollt IndexedDB alle Änderungen zurück. Es gibt keinen Teil-Restore. Die App übernimmt die neuen Laufzeitdaten erst nach erfolgreichem Transaktionsabschluss, verwirft offene UI-Auswahlen und leitet Zähler sowie Standards neu ab.

## UX-Ablauf

### Sicherung erstellen

1. Nutzer öffnet `Einstellungen → Sicherung & Wiederherstellung`.
2. Sicherungskennwort und Bestätigung werden eingegeben.
3. FRECKA liest und validiert den vollständigen Tenant-Snapshot.
4. Der Browser verschlüsselt den Snapshot.
5. Eine Datei mit Zeitstempel und Endung `.frecka-backup` wird heruntergeladen.
6. Sicherungskennwort und Klartextpayload werden nicht in App-State, IndexedDB oder Logs übernommen.

### Sicherung wiederherstellen

1. Nutzer wählt eine `.frecka-backup`-Datei aus der Dateien-App oder einem anderen verfügbaren Speicherort.
2. Das HTML-Dateifeld besitzt absichtlich keinen `accept`-Filter. Dadurch bleiben eigene FRECKA-Dateiendungen auch auf iPhone und iPad auswählbar; `*/*` wird ebenfalls nicht verwendet.
3. Dateiname und vom Betriebssystem gemeldeter MIME-Type gelten nicht als Vertrauensanker. Erst der eingelesene, authentifizierte Dateiinhalt entscheidet über die Annahme.
4. Das Sicherungskennwort wird ausschließlich für diesen Entschlüsselungsvorgang gelesen.
5. FRECKA entschlüsselt und vollvalidiert die Datei, ohne Daten zu verändern.
6. Die Vorschau zeigt Erstellungsdatum, Unternehmen sowie Anzahl von Geschäftsbereichen, Kunden, Belegen und Gutscheinen.
7. Vor dem Überschreiben wird ein verschlüsseltes Sicherheitsbackup des aktuellen Stands angeboten.
8. Eine ausdrückliche Bestätigung ist erforderlich.
9. Alle fünf Stores werden atomar ersetzt und der zentrale App-Zustand wird neu geladen.

## Fehlerverhalten

- Falsche Passphrase oder manipuliertes verschlüsseltes Material: einheitliche Meldung, keine Information darüber, welcher Fall vorlag.
- Unlesbare oder abgeschnittene Datei: eigener Dateifehler.
- Unbekannte Datei-, Snapshot- oder Datenbankschemaversion: Restore verweigert, vorhandene Daten unverändert.
- Falscher Mandant: Restore verweigert.
- Fachlich unvollständige oder widersprüchliche Daten: Restore verweigert.
- IndexedDB-Fehler während Restore: vollständiger Transaktionsrollback und verständlicher Hinweis.
- Maximale Dateigröße für die Entschlüsselung: 64 MiB.

Fehlerlogs enthalten nur Vorgang und Fehlercode. Passphrase, Schlüsselmaterial, Dateipayload und Geschäftsdaten werden nicht protokolliert.

## Tests

`tests/persistence-smoke.html` prüft ohne zusätzliche Bibliothek die gesamte bisherige Persistenz sowie BACKUP-001, HARDEN-001 und EXPORT-001. Der aktuelle Lauf umfasst 79 Fälle. Die Backup-Ergänzungen decken insbesondere Format- und Mandantenprüfung, Vollständigkeit, Referenzen, Nummernstand, Verschlüsselungs-Roundtrip, zufällige Ciphertexte, Klartextausschluss, falsches Kennwort, Payload- und Headermanipulation, abgeschnittene und unbekannte Formate, Export mit und ohne persistierte Stores, Restore in einen leeren Mandanten, vollständiges Überschreiben, atomaren Rollback, erneute Sicherung nach Restore, reversiblen Kundenstatus sowie iOS-robusten Dateinamen und Downloadtyp ab. Die fachlichen Exportfälle sind in `docs/export.md` beschrieben.

Jeder Lauf verwendet ausschließlich eine zufällig benannte Testdatenbank mit Guard gegen `frecka` und löscht diese anschließend. Ein simulierter Restore-Abbruch ist nur für eindeutig benannte Testdatenbanken freigeschaltet.

## Manuelle Zielgeräteprüfung

Vor einer produktiven Freigabe zusätzlich auf einem realen iPhone in Safari beziehungsweise als installierte PWA prüfen:

1. Sicherung mit realistisch großem fiktivem Datenbestand erstellen und an einen vom Nutzer kontrollierten Speicherort sichern.
2. Datei nach Safari-Neustart in der Dateien-App auswählen; prüfen, dass sie nicht ausgegraut ist, und anschließend falsches sowie richtiges Sicherungskennwort testen.
3. Vorschau und Sicherheitsbackup prüfen.
4. Teil- und Vollrestore dürfen nicht auftreten: nach erfolgreichem Restore alle fünf Bereiche und nach absichtlichem Abbruch den unveränderten Altstand prüfen.
5. App vollständig schließen, erneut öffnen und Einstellungen, Katalog, Kunden, Belege, Gutscheine, Snapshots, Historien und Nummernstand prüfen.
6. Ablauf offline sowie bei wenig freiem Speicher testen.
7. 320- und 390-Pixel-Ansichten, Tastatur, Fokus, langer Dateiname und lange Unternehmensbezeichnung prüfen.

## Offene Architekturentscheidung

Dateiformat, Kryptoparameter, Versionsstrategie und atomare Restore-Semantik sind langfristige Kompatibilitätsentscheidungen. Sie sollten in einem eigenen ADR bestätigt werden. BACKUP-001 legt dieses ADR entsprechend der Aufgabenbegrenzung noch nicht an.
