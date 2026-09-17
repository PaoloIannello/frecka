# ADR-0006: Schema-9-Unternehmensprofilgrenze

## Status

Angenommen am 17. September 2026.

## Kontext

Bis IndexedDB-Schema 8 besitzt FRECKA fachlich genau ein Unternehmen. Unternehmensidentität, Steuer-, Beleg-, Zahlungs-, TSE-, Lizenz- und Einrichtungseinstellungen liegen als einzelne Root-Felder im mandantenbezogenen Settings-Datensatz. Geschäftsbereiche, Leistungsorte, Belege, Gutscheine, Rezepte und Behandlungsdatensätze haben keine direkte Unternehmensreferenz.

Künftige Unternehmensprofile dürfen weder historische Dokumente aus aktuellen Stammdaten neu bilden noch durch implizite Defaultauflösung vermischt werden. Gleichzeitig darf die Vorbereitung noch keine Mehr-Unternehmens-Bedienung, zweite Lizenzruntime oder geänderte Nummernlogik einführen.

## Entscheidung

IndexedDB-Schema 9 führt `settings.companies[]` als kanonische Unternehmensstruktur ein. In der Ein-Profil-Kompatibilitätsphase gilt strikt:

- exakt ein Profil mit Formatversion 1 und stabiler opaker `companyId`;
- `activeCompanyId` verweist exakt auf dieses Profil;
- Unternehmensidentität/Anschrift/Kontakt/Brandingreferenz, `taxSettings`, `receiptSettings`, `paymentChoices`, `tseSettings`, portable `license`-Referenz und `setup` liegen im Profil;
- `businessAreas`, `serviceLocations`, `receipts`, `vouchers`, `prescriptions` und `treatmentRecords` tragen eine direkte `companyId`;
- Kunden, V1-Benutzer, Logo-Asset-Register, Backup-Erinnerung, Behandlungsvorlagen, Katalogobjekte, eingebettete Positionen und Gutscheinhistorien bleiben installationsweit gemeinsam beziehungsweise über den Geschäftsbereich ableitbar;
- `licenseRuntime` bleibt ein getrennter gerätelokaler Store und wird weder dem Profil einverleibt noch vervielfacht.

Zentrale Resolver bestimmen Profil nach ID sowie Profil eines Geschäftsbereichs oder Leistungsorts. Nach erfolgreicher Migration existiert kein stiller Profil-1-Fallback. Fehlende, unbekannte oder profilfremde Referenzen werden vor dem Schreiben abgewiesen.

## Migration und Transaktionsgrenze

Der vorhandene Schema-8-Bestand ist eindeutig Profil 1 zuordenbar. Seine Profil-ID wird deterministisch aus dem lokalen Tenant-Namespace abgeleitet, damit ein Wiederanlauf nach Browserabbruch dieselbe ID erzeugt. Die Migration verschiebt die bisherigen Root-Einstellungen in `companies[0]`, ergänzt direkte IDs an allen profilgebundenen Entitäten und validiert das vollständige Referenznetz.

IndexedDB kann die strukturelle Versionsänderung und eine später gestartete Fachtransaktion nicht zu einer gemeinsamen Transaktion verbinden. Deshalb ist „Datenbankversion 9 mit Settingsformat 1“ ein zulässiger, rein technischer Zwischenstand. Jeder Start führt die Fachmigration erneut aus. Sie liest alle sieben Tenant-Stores und schreibt Settings sowie die vier direkt gebundenen Fachaggregate in genau einer Readwrite-Transaktion. Ein Abbruch rollt diese Transaktion vollständig zurück; der nächste Start wiederholt sie. Katalog, Kunden und `licenseRuntime` bleiben unverändert.

Unterstützte Schema-8-Backups durchlaufen dieselbe Projektion vor der atomaren Restore-Transaktion. Das äußere Backupformat bleibt Version 1.

## Folgen

- Bestehende Nutzer sehen weiterhin genau ihr bisheriges Unternehmen; es gibt weder Liste noch Umschalter oder zweite Setupoption.
- Belegnummern, Zeitpunkte, Steuerwerte und alle Unternehmens-, Branding-, Bereichs-, Leistungsort- und Kundensnapshots bleiben unverändert.
- Neue Belege und Gutscheine lösen das Profil aus Geschäftsbereich und Leistungsort auf. Storno und Gutschrift übernehmen Profil und Snapshots des Ursprungsbelegs.
- Public QR erhält weder `companyId` noch Lizenzdaten. Steuerberaterexport und Dokumentengine verwenden weiterhin historische Snapshots; der Eigene-Daten-Export darf die portable Profilreferenz ausgeben.
- Ein Downgrade auf einen Client vor Schema 9 ist nach der Migration kein unterstützter Rückweg.
- MULTI-COMPANY-003/004 dürfen auf der Profilgrenze aufbauen, müssen Aktivprofilwahl, profilbezogene Nummern und UI bewusst entscheiden. Eine künftige Mehrprofil-Lizenzierung benötigt ein separates Lizenz-ADR und darf `licenseRuntime` nicht beiläufig umdeuten.

## Alternativen

### Nur indirekte Zuordnung über Geschäftsbereiche

Verworfen. Historische Entitäten könnten nach dem Entfernen oder Verschieben eines Bereichs nicht mehr eindeutig einem Profil zugeordnet werden.

### Globales Unternehmen beibehalten und Profile zusätzlich speichern

Verworfen. Zwei persistierte Wahrheiten würden auseinanderlaufen und Migration, Backup sowie Writer unprüfbar machen.

### Sofort mehrere Profile und mehrere Lizenzbindings aktivieren

Verworfen. Das würde Produkt-UX, Nummernkreise, Lizenzvertrag und Betriebsgrenzen gleichzeitig erweitern und gehört nicht zu MULTI-COMPANY-002.

## Migrations- oder Rückweg

Vor der ersten Beta-Aktualisierung ist eine verschlüsselte Sicherung des Schema-8-Bestands erforderlich. Die automatisierte Migration besitzt keinen destruktiven Down-Migrator. Bei einem Fehler bleibt der Altbestand innerhalb der Schema-9-Datenbank fachlich unverändert und der Start stoppt; es erfolgt weder Best-Effort-Reparatur noch Snapshot-Neuberechnung. Ein fachlicher Rückweg erfolgt ausschließlich über eine vorab erzeugte, mit einer kompatiblen Version kontrolliert wiederhergestellte Sicherung.
