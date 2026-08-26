# Verschlüsselte Sicherung und Wiederherstellung

**Stand:** BACKUP-006 auf Basis BACKUP-005, BRANDING-002, BACKUP-004, TSE-002, SETTINGS-002, SETTINGS-001, USER-001, BACKUP-002, BACKUP-001 und PERSISTENCE-007
**Datenbankschema:** 6
**Backupformat:** 1
**Geltungsbereich:** Vollständiger lokaler Datenstand eines Mandanten

## Zweck und Grenzen

FRECKA erstellt eine manuell ausgelöste, verschlüsselte Gesamtsicherung aller dauerhaft gespeicherten Geschäftsdaten. Verschlüsselung und Entschlüsselung erfolgen ausschließlich im Browser auf dem Endgerät. Die Datei wird weder an FRECKA noch an einen Server übertragen; Ziel und weitere Aufbewahrung bestimmt allein der Nutzer.

BACKUP-001 enthält keine Cloudanbindung, Synchronisation, Automatik, Zeitplanung oder inkrementelle Sicherung. Die Anwendung speichert weder Sicherungsdatei noch Passphrase oder abgeleiteten Schlüssel. Das vollständige BRANDING-002-Register `settings.logoAssets` einschließlich aller aktuellen und historischen PNG-/JPEG-Versionen sowie die aktiven Logo-Referenzen sind Bestandteil von Sicherung und Restore. Erzeugte PDF-, QR-Bild-, Mail-, Kamera- und Druckdaten sind weiterhin kein Bestandteil des Backups.

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
- `appDataSchemaVersion: 6`; historische Schema-5-Snapshots bleiben lesbar und werden bei erfolgreicher Prüfung auf die aktuelle Snapshotprojektion angehoben;
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

LICENSE-005 führt `stores.settings.license` als portable, nicht autoritative Referenz der Formatversion 2 fort. Nur diese Referenz wird verschlüsselt mitgesichert und atomar wiederhergestellt. Der getrennte Store `licenseRuntime`, Geräte-ID, private und öffentliche CryptoKeys, Thumbprint, Lizenz-Token, Validierungs- und Zeitanker sowie gecachte Entitlements gehören ausdrücklich nicht zum Tenant-Snapshot und können durch Restore weder importiert noch ersetzt werden.

TSE-002 liegt als `tseSettings` ebenfalls innerhalb von `stores.settings`. Anbieter sowie deaktivierter Einrichtungs- und Verbindungsstatus werden dadurch verschlüsselt mitgesichert und atomar wiederhergestellt. Zugangsdaten, Tokens, Schlüssel und TSE-Transaktionen existieren in diesem Modell nicht.

SETTINGS-002 verwendet ausschließlich die bereits enthaltenen `taxSettings`, `receiptSettings`, `paymentChoices` und `businessAreas`. Betriebliche Vorgaben, geschützter Nummernstand und Standard-Geschäftsbereich werden deshalb ohne neue Sammelroutine, Schemaerhöhung oder Backupformatänderung vollständig verschlüsselt gesichert und wiederhergestellt.

BRANDING-002 liegt ebenfalls vollständig innerhalb von `stores.settings`. Der Restore erhält mehrere Asset-Versionen verlustfrei und macht historische Beleg-/Gutscheinreferenzen danach wieder über denselben zentralen Resolver für Ansicht und PDF auflösbar. Er führt keine Bildmigration in Geschäftsvorgängen durch und bereinigt keine unreferenzierten Assets automatisch.

BACKUP-005 schließt die Kompatibilitätslücke für bereits persistierte BRANDING-001-Settings: Fehlt darin das spätere `logoAssets`-Register noch oder liegt ein Unternehmens-/Geschäftsbereichslogo noch inline vor, projiziert die zentrale Snapshotprüfung diese Daten verlustfrei in genau das bestehende BRANDING-002-Register und ersetzt die aktive Zuordnung durch ihre stabile Asset-Referenz. Derselbe sichere Normalisierungsschritt wird beim App-Start dauerhaft in den vorhandenen Settingssatz geschrieben. Es entsteht weder ein neuer Store noch eine zweite Logo- oder Backupstruktur. Historische Settings ohne Logo erhalten ausschließlich ein leeres Register.

BACKUP-006 schließt die danach im realen 0.11.3-iPhone-Bestand nachgewiesene Settingslücke. Der Settings-Write ergänzte das mit BACKUP-004 eingeführte Feld `backupReminder.interval` inhaltlich korrekt, konnte es durch den erhaltenden Objekt-Merge aber an einer anderen Eigenschaftsposition ablegen. Der frühere `JSON.stringify`-Vergleich deutete diese bedeutungslose Reihenfolge als `BACKUP_REMINDER_REPAIRED` und sperrte deshalb den vollständigen Snapshot. Der Vergleich verwendet nun den bereits vorhandenen kanonischen, schlüsselsortierten Wertvergleich.

Darüber hinaus verwendet Start, Backup und Restore genau eine historische Settingsvorbereitung. Sie darf ausschließlich vollständig fehlende, in früheren Versionen noch nicht vorhandene Modelle und bekannte Felder ergänzen, die frühere Ein-Feld-Unternehmensidentität verlustfrei konsolidieren sowie das exakt erkannte alte Reminderformat um den wöchentlichen Standard erweitern. Vor dem Schreiben muss der resultierende Datensatz ohne weiteren Reparaturcode erneut exakt normalisierbar und sanitisiert sein. Doppelte oder ungültige Bereiche, ungültige Zeitpunkte, kollidierende Referenzen und jede andere mehrdeutige Abweichung bleiben unverändert gesperrt. Der Start schreibt die freigegebene Normalisierung atomar nur in den bestehenden Settings-Store; Belege, Kunden, Gutscheine, Beträge, Nummern, Historien und Referenzen werden dabei weder gelesen noch verändert.

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
- genau eine vollständige portable Lizenzreferenz Version 2 mit derselben `localTenantId`, gültiger opaker Lizenz-ID, festem Produkt `frecka.core`/Hauptversion 1 und konsistenter optionaler Serververknüpfung;
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

Unvollständige, beschädigte, manipulierte, mandantenfremde oder inkompatible Daten werden vollständig abgelehnt. Additive Kompatibilitätsregeln bestehen ausschließlich für vollständig fehlende, historisch noch nicht vorhandene Modelle: USER-001 ergänzt den Primärbenutzer aus `Unternehmer/in` und der Snapshot-`tenantId`; fehlende historische LICENSE-001-Daten erhalten eine stabile portable Referenz, und ein vollständiges LICENSE-001-Objekt wird unter Erhalt seiner Lizenz-ID zu V2 projiziert; TSE-002 ergänzt ausschließlich die sichere deaktivierte Standardvorbereitung. Die alte Geräte-ID wird bei einem Backup-Restore nie zur Runtime oder Autorisierung. Teilweise vorhandene, fremde, zukünftige oder widersprüchliche Benutzer-, Lizenz- oder TSE-Daten werden nicht repariert. Die Validierung schreibt selbst nichts in IndexedDB; erst der bestätigte Restore persistiert den vollständig geprüften Snapshot.

## Atomare Wiederherstellung

Nach positiver Vollvalidierung öffnet die Persistenzschicht eine gemeinsame Readwrite-Transaktion über die fünf Snapshot-Stores. Jeder fachliche Store erhält genau den geprüften Datensatz des aktuellen Mandanten; `licenseRuntime` ist nicht Teil dieser Transaktion. Eine bestehende Runtime auf demselben Gerät bleibt unverändert und muss nachfolgend zur restaurierten portablen Referenz passen, eine neue Installation bleibt ohne Runtime. Beim BACKUP-004-Vertrag wird die gesicherte Intervallwahl als Einstellung übernommen; der gerätelokale Fristbeginn, der Zeitpunkt der letzten erfolgreichen Ausgabe und ein laufender Snooze bleiben aus dem bisherigen Settings-Datensatz erhalten. Eine alte Sicherungsdatei kann damit weder die lokale Erinnerungsfrist zurücksetzen noch einen Snooze umgehen. Erst `transaction.oncomplete` bestätigt den Erfolg.

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

### Wählbare Sicherungserinnerung

- Maßgeblich ist die letzte tatsächlich an Share oder Download übergebene Sicherungsdatei. Reine Vorbereitung, Verschlüsselungs-/Dateifehler und Share-Abbruch verändern den Zeitpunkt nicht.
- Genau eine der Optionen **Alle 48 Stunden**, **Alle 5 Tage** oder **Wöchentlich** ist aktiv; ein Ausschalten ist nicht vorgesehen. Neue und historische Daten ohne Auswahl verwenden **Wöchentlich**.
- Ohne erfolgreiche Sicherung erscheint nach Ablauf des gewählten Intervalls ab der lokalen Initialisierung eine nicht blockierende Karte auf der Startseite.
- Ein Intervallwechsel verändert weder Fristbeginn noch letzten Sicherungszeitpunkt. Ist die neue Frist bereits abgelaufen, erscheint die Erinnerung beim nächsten regulären Check.
- „Jetzt sichern“ öffnet ausschließlich den vorhandenen Sicherungsbereich. „Später erinnern“ speichert einen lokalen Snooze von 24 Stunden im bestehenden Settings-Datensatz.
- Ein laufender Snooze bleibt auch nach einem Intervallwechsel wirksam.
- Historische Settings ohne Reminder-Metadaten erhalten bei der ersten kompatiblen Initialisierung eine neue wöchentliche Frist; es gibt keine sofortige aggressive Altbestandsmeldung.
- Restore übernimmt die gesicherte Intervallwahl, bewahrt aber die aktuellen lokalen Zeitpunkte atomar. Restore selbst gilt nicht als neu erstellte Sicherung.

Der aufklappbare Hinweis **Wo soll ich meine Sicherung speichern?** erklärt die Auswahl über „Dateien“ auf iPhone/iPad und über die verfügbaren Speicherorte auf Android. Ein persönlicher Cloud-Ordner wie iCloud Drive, Google Drive oder OneDrive wird als Schutz bei Verlust, Defekt oder Gerätewechsel empfohlen. Das ist ausschließlich eine Bedienhilfe: Es gibt keine Cloudintegration, keine Anmeldung und keinen Zugriff von FRECKA auf den gewählten Speicherort.

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
- Historischer BRANDING-001-Settingssatz ohne Asset-Register: verlustfreie Übernahme in das vorhandene BRANDING-002-Modell vor der strengen Snapshotprüfung; aktuelle und historische Logos bleiben vollständig enthalten.
- Historischer BACKUP-004-Reminder mit identischen Werten in anderer Eigenschaftsreihenfolge: semantisch gleichwertig und kein Validierungsfehler.
- Eindeutig additive historische Settings: einmalige atomare Startpersistierung und anschließend idempotente Vollvalidierung; mehrdeutige Reparaturen bleiben `fail closed`.
- Verschlüsselungs-, Datei- oder Share-Fehler bei der Sicherung: keine Erfolgsmeldung und keine zweite Ausgabe; die Kennwortfelder bleiben für Korrektur oder Wiederholung erhalten.
- Abbruch des nativen Teilen-Dialogs: kein automatischer Download und kein zweiter Share-Aufruf. Die Oberfläche meldet den Abbruch, ohne ihn als erfolgreiche Sicherung zu behandeln.
- Navigation, neue Eingabe oder ein neuer Sicherungsversuch entwerten jede noch laufende beziehungsweise fertig vorbereitete Ausgabe. Deren verspäteter Abschluss darf weder einen Dialog öffnen noch einen neuen Ausgabezustand herstellen.

Die sichtbare Fehlerbehandlung trennt Snapshot-/Vorbereitungsfehler von Fehlern der nachgelagerten Datei-/Share-Ausgabe. Die teilbare lokale Integritätsdiagnose verwendet Formatversion 2 und enthält ausschließlich sichere Fehlercodes, Kategorien sowie gegebenenfalls Store und Datentyp. Namen, Beträge, IDs, Beleg- oder Gutscheinnummern, Steuerdaten, Bilddaten und Zugangsdaten sind ausgeschlossen. Die interne Backupklassifikation enthält ausschließlich Phase und sicheren Fehlercode. Passphrase, Schlüsselmaterial und Dateipayload werden nicht protokolliert oder übertragen.

## Tests

BACKUP-004 ergänzt alle drei Intervalle, den wöchentlichen Standard, Reload, Wechsel vor und nach Fälligkeit, den erhaltenen 24-Stunden-Snooze, die ausschließliche Rücksetzung nach bestätigter Ausgabe, die reine lokale Speicherhilfe sowie den getrennten Restore-Vertrag für Intervallwahl und operative Zeitpunkte.

`tests/persistence-smoke.html` prüft ohne zusätzliches Testframework die gesamte bisherige Persistenz sowie BACKUP-001/002/003/004/005/006, HARDEN-001, EXPORT-001/003, PERSISTENCE-007/008/010, SETTINGS-001/002, TSE-002, LICENSE-005 und QR-001. BACKUP-006 ergänzt historische Profile für 0.9.x/0.10.x sowie Zustände vor USER-001, LICENSE-001, SETTINGS-001/002, BRANDING-001/002, BACKUP-004 und TSE-002 einschließlich Kombination und PERSISTENCE-010. LICENSE-005 ergänzt Schema 5→6, portable V2-Migration, CryptoKey-Reload und den Nachweis, dass Runtime, Schlüssel und Token weder verschlüsselt gesichert noch restauriert werden. Jeder freigegebene Profilpfad durchläuft Startnormalisierung, Settingspersistenz, Snapshotvalidierung, AES-GCM, Restore, erneute Vollvalidierung und Idempotenz. Ein eigener Negativfall beweist `fail closed` und unveränderte Eingabedaten. Die Diagnoseprüfungen suchen gezielt nach Namen, Beträgen, IDs, Nummern und Referenzen und dürfen ausschließlich sichere Kategorien ausgeben.

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
