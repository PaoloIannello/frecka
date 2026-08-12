# Lokale Benutzerarchitektur V1.0

**Stand:** USER-002
**Datenbankschema:** unverändert Version 5  
**Ablage:** mandantenbezogener Settings-Datensatz

## Umfang V1.0

FRECKA V1.0 besitzt genau einen aktiven lokalen Benutzer. Es gibt keinen Login, keine PIN, keine Rollen, keine Rechteprüfung und keinen Mehrbenutzerbetrieb. Der Benutzer gehört immer exakt zum Mandanten des Settings-Datensatzes.

Das Modell lautet:

```text
users[]
└── formatVersion
    id
    tenantId
    displayName
    active
    createdAt
    updatedAt

activeUserId
```

`users` ist bereits als Liste modelliert und `activeUserId` ist im persistierten Settings-Datensatz eine stabile Referenz. Die zentrale Laufzeitquelle hält dieselbe Referenz mutierbar unter `userSettings.activeUserId`, weil ihr äußerer Datencontainer absichtlich eingefroren ist. Damit können spätere Versionen zusätzliche Benutzer und Rollen ergänzen, ohne den heutigen Benutzer durch eine zweite Parallelstruktur zu ersetzen. V1.0 akzeptiert und erzeugt trotzdem ausschließlich genau einen aktiven Eintrag. Mehrere Einträge oder eine neuere Benutzerformatversion werden von dieser Version nicht stillschweigend reduziert oder überschrieben.

Authentifizierungsdaten sind ausdrücklich kein Bestandteil des Modells. Insbesondere werden keine Kennwörter, PINs, Rollen, Rechte, Sitzungen oder Tokens gespeichert.

## Persistenz und Kompatibilität

USER-001 ergänzt das Modell im bestehenden `settings`-Store. Es entsteht kein sechster Store, keine neue Datenbankversion und keine zweite Persistenz- oder Snapshotarchitektur. `tenantId` bleibt Key Path des Store-Datensatzes und wird zusätzlich am Benutzer geprüft.

Ein historischer Settings-Datensatz ohne USER-001 wird beim App-Start deterministisch um `user-primary` ergänzt. Der Anzeigename stammt aus der verpflichtenden Angabe `Unternehmer/in`; die Benutzer-`tenantId` stammt ausschließlich aus dem aktuellen Mandanten. Der normalisierte Datensatz wird über denselben Settings-Writer gespeichert. Vorhandene künftige Mehrbenutzerdaten werden nicht auf V1.0 zurückgestuft.

## Backup und Restore

Der Benutzer liegt in `stores.settings` und durchläuft deshalb unverändert die zentrale Tenant-Snapshot-API, Verschlüsselung und atomare Wiederherstellung. Backup- oder Restore-Code sammelt keine zweite Benutzerliste.

Historische gültige Backups ohne USER-001 bleiben wiederherstellbar. Noch vor der allgemeinen Snapshotvalidierung wird ausschließlich das vollständig fehlende Benutzerpaar `users`/`activeUserId` deterministisch ergänzt. Teilweise vorhandene, widersprüchliche, mandantenfremde oder neuere Benutzerdaten werden nicht erraten.

## Export

Die reine Exportprojektion erhält den aktiven Benutzer aus `stores.settings`. Der Exporttyp `Eigene Daten` enthält ihn als strukturierten Projektionskontext und nennt seinen Anzeigenamen in `Export-Info.txt`. Der Steuerberaterexport erhält `activeUser: null` und gibt keine Benutzerstammdaten aus. CSV-Dateisatz, ZIP-Struktur und Steuerberaterdaten bleiben unverändert.

## Einstellungsseite

USER-002 macht den vorhandenen aktiven Benutzer unter `Einstellungen → Benutzer` sichtbar. Die Seite zeigt Anzeigename, Benutzer-ID, Mandant, Aktivstatus sowie Erstellungs- und Änderungszeitpunkt. Ausschließlich der Anzeigename ist bearbeitbar; er wird getrimmt, darf nicht leer sein und ist auf 80 Zeichen begrenzt.

Eine erfolgreiche Änderung aktualisiert nur `displayName` und `updatedAt` des bestehenden Benutzerobjekts und wird unmittelbar über den zentralen Settings-Writer persistiert. Benutzer-ID, Mandant, Aktivstatus und `createdAt` bleiben unverändert. Bei einem Schreibfehler wird auch die Laufzeitänderung zurückgenommen. Es gibt keinen zweiten Benutzerzustand, keinen eigenen Store und keine neue Navigationsebene.

Da Backup, Restore und der Export `Eigene Daten` dieselbe zentrale Settings-Projektion verwenden, wird der gespeicherte Anzeigename ohne zusätzliche Sammel- oder Transformationslogik in diese Abläufe übernommen.

## Zukunftsgrenzen

Mehrere Benutzer, Rollen, Rechte, Login, PIN und Gerätezuordnung erfordern jeweils eine eigene fachliche Freigabe. Eine spätere Version muss dafür Format- und Migrationsregeln definieren; USER-001 führt keine vorweggenommene Rollen- oder Sicherheitslogik ein.
