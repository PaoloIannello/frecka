# ADR-0007: Profilbezogene Belegnummernkreise

## Status

Angenommen am 18. September 2026.

## Kontext

ADR-0006 führt Unternehmensprofile und direkte `companyId`-Referenzen ein, begrenzt die Produktoberfläche aber weiterhin auf Profil 1. Der bisherige globale Nummernstand kann mehrere Unternehmensprofile fachlich nicht sicher trennen. Ebenso müssen Normalbeleg, Storno und Gutschrift unabhängig fortlaufend sein, während historische Belegnummern, alte Backups und der noch nicht um ein Profilkürzel ergänzte Bestand von Profil 1 unverändert bleiben müssen.

Sichtbare Nummern sind für Menschen und Exporte wichtig, dürfen aber keine alleinige relationale Identität sein. Korrekturen und Gutscheinbezüge benötigen dauerhaft stabile Receipt-IDs, damit gleiche oder historisch anders formatierte sichtbare Nummern nicht zu einer falschen Verknüpfung führen.

## Entscheidung

IndexedDB-Schema 9 bleibt bestehen. Jedes Unternehmensprofil besitzt in `receiptSettings.numbering` genau einen versionierten Nummernkreisvertrag mit:

- Modus `legacy` oder `profile`;
- optionalem, eindeutigem und ausdrücklich gesetztem Profilkürzel;
- Startsequenzen für Normalbeleg, Storno und Gutschrift;
- nächsten Sequenzen je Belegtyp und fachlichem Abschlussjahr.

Neue konfigurierte Profile verwenden:

- Normalbeleg und Gutscheinverkaufsbeleg: `<KÜRZEL>-JJJJ-NNNNNN`;
- Storno: `<KÜRZEL>-ST-JJJJ-NNNNNN`;
- Gutschrift: `<KÜRZEL>-GS-JJJJ-NNNNNN`.

Die drei Typen besitzen voneinander unabhängige Sequenzen. Ein Gutscheinverkaufsbeleg teilt den normalen Belegkreis; der sichtbare Gutscheincode bleibt davon unabhängig. Standardstart ist jeweils 1, ein ausdrücklich konfigurierter späterer Start bleibt möglich. Das Jahr stammt aus `completedAt` des abgeschlossenen Dokuments, nicht aus UI- oder Systemzustand beim Anzeigen.

Profil 1 bleibt bis zur bewussten Kürzelwahl im bisherigen sichtbaren Format `JJJJ-NNNNNN`, `ST-JJJJ-NNNNNN` und `GS-JJJJ-NNNNNN`. FRECKA errät kein Kürzel aus Firmenname, Anschrift oder Steuerdaten. Weitere Profile benötigen bereits im Datenmodell ein gültiges, eindeutiges Kürzel. Die bestehende Produktoberfläche bleibt auf Profil 1 begrenzt; MULTI-COMPANY-004 muss Kürzelwahl und Profilverwaltung ausdrücklich lösen.

`yearPrefix` und `nextNumber` bleiben nur als synchronisierte Kompatibilitätsprojektion für bestehende Ein-Profil-UI und ältere Verbraucher erhalten. Kanonische Quelle ist ausschließlich `receiptSettings.numbering` im jeweiligen Profil.

## Atomarität und Referenzen

Der Abschlusswriter liest den aktuellen Settingssatz und den Receipt-Store in derselben IndexedDB-Readwrite-Transaktion. Er löst das Profil über Geschäftsbereich und Leistungsort beziehungsweise bei Storno/Gutschrift über den Ursprungsbeleg auf, vergibt daraus die nächste Nummer und schreibt Nummernstand und Beleg gemeinsam. Fehler, Kollision, zweiter Klick oder abgebrochene Transaktion dürfen keine Nummer verbrauchen und keinen halben Datensatz hinterlassen.

Storno und Gutschrift übernehmen `companyId` sowie die unveränderlichen Unternehmens-, Branding-, Geschäftsbereichs-, Leistungsort- und Kundensnapshots ihres Ursprungsbelegs. Neue Beziehungen verwenden dessen stabile Receipt-ID als primäre Referenz; die sichtbare Nummer bleibt für Anzeige, Dokument und Export erhalten. Ein historischer Nummernfallback ist nur innerhalb desselben Profils zulässig und muss bei Mehrdeutigkeit stoppen.

## Folgen

- Nummern können je Profil, Typ und Jahr unabhängig fortgesetzt und geprüft werden.
- Jahreswechsel erzeugen ohne Migration einen neuen Sequenzkontext; alte Kontexte bleiben erhalten.
- Historische Belege, Backups, PDFs, QR-/Public-Payloads und Exporte werden nicht umnummeriert.
- Backupformat 1 und Schema 9 bleiben gültig; der zusätzliche Zustand liegt im vorhandenen Settings-Profil.
- Alte Settings und Backups ohne `numbering` werden deterministisch in den Legacy-Übergang projiziert. Persistierte Belege sichern dabei gegen einen zu niedrigen Zählerstand ab.
- Die Mehr-Unternehmens-Oberfläche, Profilwahl, Lizenzmehrfachbindung und eine Änderung bestehender Nummern sind ausdrücklich nicht Bestandteil dieser Entscheidung.

## Alternativen

### Ein globaler Nummernkreis für alle Profile

Verworfen. Der Nummernstand wäre nicht eindeutig einem Unternehmen zugeordnet und könnte bei späterer Profiltrennung nicht verlustfrei fortgeführt werden.

### Profilkürzel automatisch ableiten

Verworfen. Namen sind änderbar und nicht eindeutig; eine automatische Ableitung würde eine fachliche Entscheidung erraten und könnte historische Nummern destabilisieren.

### Sichtbare Belegnummer als alleinige Referenz

Verworfen. Historische Formate und mehrere Profile können dieselbe sichtbare Nummer besitzen. Relationen müssen deshalb primär über stabile Receipt-IDs laufen.

### Neues IndexedDB-Schema oder eigener Counter-Store

Verworfen. Der Nummernstand gehört fachlich zu den bereits kanonischen Profileinstellungen und muss atomar mit demselben Receipt-Writer geschrieben werden. Ein zweiter Store oder eine Schemaerhöhung würde ohne Nutzen eine Parallelstruktur schaffen.

## Migrations- oder Rückweg

Die additive Normalisierung erhält vorhandene Nummern und bildet für Profil 1 einen Legacy-Kontext aus dem gespeicherten Nummernstand und vorhandenen Belegen. Alte Backups bleiben lesbar. Bei ungültigem Kürzel, Profilkonflikt, Zählerrücklauf oder mehrdeutiger Referenz wird geschlossen abgebrochen; FRECKA rät oder repariert keine Geschäftsdaten.

Ein Client vor MULTI-COMPANY-003 versteht die kanonischen Mehrprofilzähler nicht als Schreibquelle und ist nach deren produktiver Nutzung kein unterstützter Rückweg. Historische Dokumente bleiben dennoch durch ihre gespeicherten Nummern und Snapshots lesbar. Ein fachlicher Rückweg erfolgt ausschließlich über eine zuvor erzeugte, mit einer kompatiblen Version validierte Sicherung.
