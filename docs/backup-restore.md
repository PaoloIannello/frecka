# Verschlüsselte Sicherung und Wiederherstellung

**Stand:** TSE-002 auf Basis SETTINGS-002, SETTINGS-001, USER-001, BACKUP-002, BACKUP-001 und PERSISTENCE-007
**Datenbankschema:** 5
**Backupformat:** 1
**Geltungsbereich:** Vollständiger lokaler Datenstand eines Mandanten

## Zweck und Grenzen

FRECKA erstellt eine manuell ausgelöste, verschlüsselte Gesamtsicherung aller dauerhaft gespeicherten Geschäftsdaten. Verschlüsselung und Entschlüsselung erfolgen ausschließlich im Browser auf dem Endgerät. Die Datei wird weder an FRECKA noch an einen Server übertragen; Ziel und weitere Aufbewahrung bestimmt allein der Nutzer.

BACKUP-001 enthält keine Cloudanbindung, Synchronisation, Automatik, Zeitplanung oder inkrementelle Sicherung. Die Anwendung speichert weder Sicherungsdatei noch Passphrase oder abgeleiteten Schlüssel. Validierte Unternehmens- und Geschäftsbereichslogos aus dem zentralen Settings-Datensatz sind Bestandteil von Sicherung und Restore. Erzeugte PDF-, QR-Bild-, Mail-, Kamera- und Druckdaten sind weiterhin kein Bestandteil des Backups.

## Zentrale APIs

`js/persistence.js` stellt die wiederverwendbaren mandantenbezogenen Datenoperationen bereit:

- `exportTenantSnapshot(options)` liest `settings`, `catalog`, `customers`, `receipts` und `vouchers` in einer gemeinsamen Readonly-Transaktion. Fehlt beim Erststart noch ein Store-Datensatz, darf ausschließlich die Projektion der bestehenden zentralen Laufzeitquelle als Fallback verwendet werden.
- `validateTenantSnapshot(snapshot)` prüft das komplette entschlüsselte Datenpaket, ohne IndexedDB zu verändern.
- `restoreTenantSnapshot(snapshot)` validiert erneut und ersetzt danach alle fünf Store-Datensätze in genau einer Readwrite-Transaktion.

Die UI besitzt keinen direkten IndexedDB-Zugriff. Das spätere Exportmodul kann `exportTenantSnapshot` wiederverwenden, ohne eine zweite Datenquelle oder Parallelarchitektur einzuführen.

`js/backup.js` kapselt zusätzlich Vorbereitung und Ausgabe der Sicherung, ohne beide Phasen zu vermischen:

- `createBackup(options)` liest und validiert den Snapshot und verschlüsselt ihn. Die Funktion erzeugt weder `Blob` noch `File` oder Objekt-URL und startet keine Ausgabe. Als Ergebnis liefert sie ausschließlich den verschlüsselten serialisierten Inhalt und den Dateinamen.
- Die UI hält dieses vorbereitete Ergebnis nur für die aktuelle Sicherungsseite im Arbeitsspeicher. Navigation, neue Eingabe, neuer Versuch oder Fehler verwerfen es über eine Vorgangskennung; ein verspätet fertiggestelltes Promise darf danach keinen ausgabefähigen Zustand mehr setzen.
- `deliverBackup(serializedBackup, filename, options)` wird ausschließlich durch die nachgelagerte, ausdrückliche Aktion „Sicherung speichern oder teilen“ aufgerufen. Erst dann entsteht die Datei. Unterstützt das Gerät echtes File-Sharing, öffnet `sharePreparedBackup(file)` den nativen Dialog genau einmal; andernfalls startet dieselbe ausdrückliche Aktion den lokalen Download.
- Vor jedem Share- oder Downloadversuch wird der vorbereitete UI-Zustand verbraucht. Ein abgebrochener Share löst weder Download noch einen zweiten oder zeitversetzten Share-Aufruf aus.

Beide Funktionen sammeln keine Daten selbst und lockern keine Snapshot- oder Gutschein-/Beleg-Invariante.

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

USER-001 liegt innerhalb von `stores.settings` als `users` und `activeUserId`. Dadurch wird der lokale Benutzer ohne zusätzliche Sammlung oder Änderung des äußeren Backupformats vollständig mitgesichert.

LICENSE-001 liegt innerhalb desselben `stores.settings`-Datensatzes als `license`. Lizenz- und Gerätekennung werden deshalb ohne zweite Sammlung, neuen Store oder neues Backupformat verschlüsselt mitgesichert und atomar wiederhergestellt.

TSE-002 liegt als `tseSettings` ebenfalls innerhalb von `stores.settings`. Anbieter sowie deaktivierter Einrichtungs- und Verbindungsstatus werden dadurch verschlüsselt mitgesichert und atomar wiederhergestellt. Zugangsdaten, Tokens, Schlüssel und TSE-Transaktionen existieren in diesem Modell nicht.

SETTINGS-002 verwendet ausschließlich die bereits enthaltenen `taxSettings`, `receiptSettings`, `paymentChoices` und `businessAreas`. Betriebliche Vorgaben, geschützter Nummernstand und Standard-Geschäftsbereich werden deshalb ohne neue Sammelroutine, Schemaerhöhung oder Backupformatänderung vollständig verschlüsselt gesichert und wiederhergestellt.

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
- genau ein aktiver Settings-Benutzer mit derselben `tenantId` und passender `activeUserId`;
- genau eine vollständige lokale Lizenz mit derselben `tenantId`, gültigen opaken Kennungen und Zeitpunkten;
- ausschließlich die erlaubte TSE-002-Vorbereitung mit Anbieter `fiskaly SIGN DE`, deaktivierter Nutzung sowie nicht eingerichtetem und nicht verbundenem Status;
- gültige Store-Formatversionen und Datenstrukturen;
- eindeutige Kunden-, Beleg- und Gutschein-IDs;
- eindeutige Belegnummern, Gutscheinreferenzen und sichtbare Gutscheincodes;
- gültige Katalog-, Geschäftsbereichs- und Leistungsortzuordnungen;
- Gutscheinwerte ohne negative Restwerte und ohne Restwerte über dem Ursprungswert;
- unverfälschte, chronologische Gutscheinhistorien;
- gültige Referenztypen und widerspruchsfreie Gegenreferenzen;
- für jeden referenzierten Gutscheinverkauf einen vorhandenen Beleg mit exakt passender ID, Nummer, Belegart `voucher-sale` und Gegenreferenz sowie keine verwaisten Gutscheinverkaufsbelege;
- ein Belegnummernstand oberhalb der höchsten vorhandenen Nummer des aktuellen Präfixes.

Historische Referenzen auf Einlösungs- oder Korrekturbelege dürfen nach einem getrennten Entwickler-Reset weiterhin ohne Gegenobjekt erhalten bleiben. Für den ursprünglichen Gutscheinverkaufsbeleg gilt diese Ausnahme ausdrücklich nicht: Gutschein und Verkaufsbeleg bilden eine bidirektional vollständig prüfbare Einheit. Ein durch Entwickler-Reset inkonsistent gewordener Datenstand ist kein gültiger Restore-Snapshot.

PERSISTENCE-010 lockert diese Regel nicht. Eine ausdrücklich bestätigte lokale Reparatur darf ausschließlich die vier fest freigegebenen historischen Demo-Gutscheinverkaufsbelege aus dem kanonischen Seed ergänzen. Vor dem einzigen atomaren Receipt-Store-Schreibvorgang muss der daraus gebildete vollständige Tenant-Kandidat alle Snapshotregeln erfüllen; anschließend wird der gespeicherte Tenant erneut vollständig validiert. Erst dann können Backup und Export wieder verwendet werden. Beliebige fehlende Belege, reale Geschäftsdaten, Kollisionen oder mehrdeutige Referenzen werden niemals rekonstruiert.

Unvollständige, beschädigte, manipulierte, mandantenfremde oder inkompatible Daten werden vollständig abgelehnt. Additive Kompatibilitätsregeln bestehen ausschließlich für vollständig fehlende, historisch noch nicht vorhandene Modelle: USER-001 ergänzt den Primärbenutzer aus `Unternehmer/in` und der Snapshot-`tenantId`; LICENSE-001 erzeugt eine neue zufällige lokale Lizenz- und Gerätebindung für denselben Mandanten; TSE-002 ergänzt ausschließlich die sichere deaktivierte Standardvorbereitung. Teilweise vorhandene oder widersprüchliche Benutzer-, Lizenz- oder TSE-Daten werden nicht repariert. Die Validierung schreibt selbst nichts in IndexedDB; erst der bestätigte Restore persistiert den vollständig geprüften Snapshot.

## Atomare Wiederherstellung

Nach positiver Vollvalidierung öffnet die Persistenzschicht eine gemeinsame Readwrite-Transaktion über alle fünf Stores. Jeder fachliche Store erhält genau den geprüften Datensatz des aktuellen Mandanten. Ausschließlich der gerätelokale BACKUP-003-Erinnerungsstatus wird aus dem bisherigen Settings-Datensatz erhalten, damit eine alte Sicherungsdatei die lokale Erinnerungsfrist weder zurücksetzt noch künstlich verlängert. Erst `transaction.oncomplete` bestätigt den Erfolg.

Schlägt irgendein Put-Vorgang fehl oder wird die Transaktion abgebrochen, rollt IndexedDB alle Änderungen zurück. Es gibt keinen Teil-Restore. Die App übernimmt die neuen Laufzeitdaten erst nach erfolgreichem Transaktionsabschluss, verwirft offene UI-Auswahlen und leitet Zähler sowie Standards neu ab.

## UX-Ablauf

### Sicherung erstellen

1. Nutzer öffnet `Einstellungen → Sicherung & Wiederherstellung`.
2. Sicherungskennwort und Bestätigung werden eingegeben.
3. FRECKA liest und validiert den vollständigen Tenant-Snapshot.
4. Der Browser verschlüsselt den Snapshot.
5. FRECKA meldet die abgeschlossene Vorbereitung. Erst das ausdrückliche Antippen von „Sicherung speichern oder teilen“ erzeugt die Datei und öffnet je nach Browser genau einen nativen Teilen-Dialog oder startet genau einen lokalen Download.
6. Erst nach erfolgreicher Übergabe beziehungsweise erfolgreichem Download werden die beiden Kennwortfelder geleert.
7. Sicherungskennwort und Klartextpayload werden nicht in App-State, IndexedDB oder Logs übernommen.

### Wöchentliche Sicherungserinnerung

- Maßgeblich ist die letzte tatsächlich an Share oder Download übergebene Sicherungsdatei. Reine Vorbereitung, Verschlüsselungs-/Dateifehler und Share-Abbruch verändern den Zeitpunkt nicht.
- Ohne erfolgreiche Sicherung erscheint frühestens sieben Tage nach der lokalen Initialisierung eine nicht blockierende Karte auf der Startseite.
- „Jetzt sichern“ öffnet ausschließlich den vorhandenen Sicherungsbereich. „Später erinnern“ speichert einen lokalen Snooze von 24 Stunden im bestehenden Settings-Datensatz.
- Historische Settings ohne Reminder-Metadaten erhalten bei der ersten kompatiblen Initialisierung eine neue Sieben-Tage-Frist; es gibt keine sofortige aggressive Altbestandsmeldung.
- Restore übernimmt die fachlichen Daten der Sicherung, bewahrt aber den aktuellen lokalen Reminder-Status atomar. Restore selbst gilt nicht als neu erstellte Sicherung.

Die für einen ausdrücklichen lokalen Download angelegte Objekt-URL bleibt für fünf Minuten gültig, damit ein verzögert arbeitender iOS-Dateidialog die Datei noch lesen kann. Der anschließende Timeout widerruft nur die URL und kann selbst keinen Dialog öffnen.

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
- Historisch inkonsistenter Gutschein-/Belegbestand bei der Sicherung: keine Datei, keine Verschlüsselung und ein verständlicher Hinweis ohne Codes, Gutscheinreferenzen oder Belegnummern. Unabhängige neue Belege bleiben weiterhin möglich.
- Verschlüsselungs-, Datei- oder Share-Fehler bei der Sicherung: keine Erfolgsmeldung und keine zweite Ausgabe; die Kennwortfelder bleiben für Korrektur oder Wiederholung erhalten.
- Abbruch des nativen Teilen-Dialogs: kein automatischer Download und kein zweiter Share-Aufruf. Die Oberfläche meldet den Abbruch, ohne ihn als erfolgreiche Sicherung zu behandeln.
- Navigation, neue Eingabe oder ein neuer Sicherungsversuch entwerten jede noch laufende beziehungsweise fertig vorbereitete Ausgabe. Deren verspäteter Abschluss darf weder einen Dialog öffnen noch einen neuen Ausgabezustand herstellen.

Fehlerlogs enthalten nur Vorgang und Fehlercode. Passphrase, Schlüsselmaterial, Dateipayload und Geschäftsdaten werden nicht protokolliert.

## Tests

`tests/persistence-smoke.html` prüft ohne zusätzliches Testframework die gesamte bisherige Persistenz sowie BACKUP-001/002/003, HARDEN-001, EXPORT-001/003, PERSISTENCE-007/008/010, SETTINGS-001/002, TSE-002 und QR-001. Die BACKUP-003-Fälle decken Sieben-Tage-Frist, 24-Stunden-Snooze, bestätigte Ausgabe, Fehler/Abbruch ohne Rücksetzung, Erststart/Altbestand sowie den atomar erhaltenen lokalen Reminder-Status beim Restore ab. Die bisherigen Backup-Ergänzungen prüfen weiterhin die reine Vorbereitung ohne vorzeitige Ausgabe, den Stopp eines historisch inkonsistenten Bestands vor Verschlüsselung und Ausgabe, verspätete Promise-Abschlüsse nach Navigation, Verschlüsselungs- und Dateifehler ohne vorbereiteten Zustand, Share-Abbruch ohne Fallback oder zweite Ausgabe, erhaltene Kennwortfelder und gefilterte UI-Meldungen. SETTINGS-002 bestätigt zusätzlich den unveränderten zentralen Settings-Roundtrip für Steuer-, Zahlungs-, Standardbereichs-, Nummern- und Belegtextwerte. TSE-002 prüft sichere Standardwerte, historische Settings und Backups, verschlüsselten Restore, Eigene-Daten-Export, ausgeschlossene Steuerberaterdaten sowie die Ablehnung unerlaubter Zugangsdaten. PERSISTENCE-010 ergänzt den erfolgreichen Backup- und Steuerberaterexport nach atomarer Reparatur sowie Stop- und Rollbackfälle ohne Store-Veränderung. Unverändert geprüft werden Format- und Mandantenprüfung, Vollständigkeit, Referenzen einschließlich der bidirektionalen Gutscheinverkaufsbeleg-Invariante, Nummernstand, Verschlüsselungs-Roundtrip, zufällige Ciphertexte, Klartextausschluss, falsches Kennwort, Payload- und Headermanipulation, abgeschnittene und unbekannte Formate, Export mit und ohne persistierte Stores, Restore in einen leeren Mandanten, vollständiges Überschreiben, atomarer Rollback, erneute Sicherung nach Restore, reversibler Kundenstatus sowie iOS-robuster Dateiname und Downloadtyp. Die fachlichen Export- und ZIP-Fälle sind in `docs/export.md`, die QR-Fälle in `docs/qr.md` beschrieben.

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
8. Mit absichtlich inkonsistentem Altbestand die Sicherung ablehnen lassen, mehrere Sekunden warten und danach die Seite wechseln; weder vor noch nach der Navigation darf ein Systemdialog erscheinen.
9. Einen nativen Teilen-Dialog abbrechen und anschließend navigieren; es darf weder ein Download-Fallback noch ein zweiter oder verspäteter Dialog folgen.

## Offene Architekturentscheidung

Dateiformat, Kryptoparameter, Versionsstrategie und atomare Restore-Semantik sind langfristige Kompatibilitätsentscheidungen. Sie sollten in einem eigenen ADR bestätigt werden. BACKUP-001 legt dieses ADR entsprechend der Aufgabenbegrenzung noch nicht an.
