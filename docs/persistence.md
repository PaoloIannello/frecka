# Lokale Settings-, Katalog- und Kundenpersistenz

**Stand:** PERSIST-003
**Geltungsbereich:** Vollständige FRECKA-Einstellungen, Katalog sowie Kundenstammdaten
**Nicht enthalten:** Belege, offene Zahlungen, Gutscheine, Historien, Entwürfe, Stornos und Gutschriften

## Ausgangsfluss vor PERSIST-001a

Die einzige fachliche Laufzeitquelle ist `window.PROTOTYPE_DATA` aus `js/data.js`. `js/app.js` verwendet dafür den Alias `data`. Das Top-Level-Objekt ist nur flach eingefroren; die enthaltenen Einstellungsobjekte und Arrays werden direkt und gemeinsam mutiert.

Zentrale Einstellungsbereiche:

- `data.company`: Unternehmensdaten, Unternehmensanschrift und `useAsServiceLocation`;
- `data.serviceLocations`: Liste aller Leistungsorte einschließlich n:m-Zuordnungen über `businessAreaIds`;
- `data.businessAreas`: Geschäftsbereiche einschließlich Aktivstatus, Standardbereich und `defaultServiceLocationId`;
- `data.taxSettings`: Steuerstatus, Steuersätze und Standardsteuersatz;
- `data.receiptSettings`: Nummernkreis, Belegtexte, Währung und Sprache;
- `data.paymentChoices`: Zahlungsarten, Aktivstatus und Reihenfolge;
- UI-State des Einrichtungsassistenten: bisher nicht dauerhaft gespeichert.

Die Mutationen erfolgen insbesondere über `applyCompanyForm`, `applyServiceLocationForm`, `applyBusinessAreaForm`, `saveSetupStep`, den Steuerformular-Handler sowie die Zahlungsarten-Toggle- und Sortieraktionen. Leser sind die Einstellungsansichten, der Header, der Beleg- und Gutscheinabschluss, die Dokument-Snapshot-Erzeugung sowie der Einrichtungsassistent.

Vor PERSIST-001a werden Demo-/Standardwerte aus `js/data.js` synchron geladen. Belegzähler und aktiver Geschäftsbereich werden daraus bereits vor dem ersten Rendern abgeleitet. Alle Erfolgsmeldungen erscheinen unmittelbar nach der In-Memory-Mutation; ein Reload verwirft Änderungen.

## Katalogfluss vor PERSIST-002

Die fachliche Katalogquelle besteht aus `data.categories`, den nach Geschäftsbereich gruppierten Arrays in `data.catalog` sowie `data.templateImportStatus`. `migratePrototypeCommerceModel` überführt die älteren Demo-Einträge beim Start in das zentrale UX-023/UX-024-Modell.

Kategorien und Einträge werden durch `applyCatalogCategoryForm` und `applyCatalogItemForm` angelegt oder bearbeitet. Die Katalogverwaltung aktiviert, deaktiviert und sortiert dieselben Objekte direkt. Favoriten, `needsReview`, Preis- und Steuersatzbestätigungen sind Eigenschaften der Katalogeinträge. `importBusinessTemplate` erzeugt aus Geschäftsbereich und Vorlagenschlüssel deterministische IDs und überspringt bereits vorhandene IDs; manuelle Änderungen werden dadurch nicht überschrieben. Vor PERSIST-002 gehen alle diese Änderungen bei einem Reload verloren.

## Kundenfluss vor PERSIST-003

Die einzige Kundenlaufzeitquelle ist `data.customers`. Neuanlage und Bearbeitung mutieren dieses Array beziehungsweise den darin enthaltenen Kunden direkt. Kunden werden im normalen Beleg und im Gutscheinverkauf über ihre stabile ID ausgewählt. Beim Abschluss werden Name, E-Mail und Adresse in ein neues Kunden-Snapshotobjekt kopiert; spätere Stammdatenänderungen verändern dieses Dokumentobjekt nicht.

Die bisherige Suche berücksichtigt Name, Telefon und E-Mail. PERSIST-003 ergänzt Firma und Mobilnummer sowie eine Trennzeichen-unabhängige Telefonnummernsuche, ohne einen Suchindex anzulegen. Der Kundenbelegverlauf wird weiterhin aus `data.receipts` über die Kunden-ID abgeleitet. Demo-Kennzahlen und die alten eingebetteten Demo-History-Arrays sind keine Kundenstammdaten und werden nicht persistiert.

## Datenfluss ab PERSIST-003

1. Die statische App-Shell zeigt einen kompakten Ladezustand.
2. `js/persistence.js` öffnet IndexedDB und liest den Settings-Datensatz.
3. Vorhandene Einstellungen werden versioniert normalisiert und in-place in die bestehenden zentralen Laufzeitobjekte übernommen; dadurch stehen die Geschäftsbereiche für die Katalogvalidierung bereit.
4. Die Demo-/Standardkatalogdaten werden einmal in das aktuelle Laufzeitformat überführt und als sichere Fallbackbasis erfasst.
5. Der mandantenbezogene Katalogdatensatz wird gelesen, normalisiert und in-place in `data.categories`, `data.catalog` und `data.templateImportStatus` übernommen.
6. Danach wird der Kundendatensatz gelesen, normalisiert und in-place in `data.customers` übernommen.
7. Fehlt ein Datensatz, bleiben für den jeweiligen Bereich die sicheren Demo-/Standardwerte aktiv. Branchenvorlagen werden nicht automatisch importiert.
8. Erst danach werden Belegzähler, aktiver Geschäftsbereich und UI-State abgeleitet und die Oberfläche gerendert.
9. Settings-, Katalog- und Kundenaktionen erzeugen jeweils eine enge Projektion ihrer bestehenden Laufzeitquelle und verwenden getrennte Stores über dieselbe serialisierte Persistenzschicht.
10. Eine Erfolgsmeldung erscheint erst nach erfolgreichem Transaktionsabschluss.

UI- und Renderfunktionen greifen niemals direkt auf `indexedDB` zu. Nur `js/persistence.js` kennt die Browser-Datenbank-API.

## Datenbankvertrag

- Datenbankname: `frecka`
- Datenbankschema-Version: `3`
- Object Stores: `settings`, `catalog` und `customers`
- Key Path: `tenantId`
- Standardschlüssel/Instanz: `local-default`
- Einstellungsformat-Version: `1`
- Katalogformat-Version: `1`
- Kundenformat-Version: `1`

Das Upgrade von Schema-Version 2 auf 3 legt ausschließlich den neuen `customers`-Store an; vorhandene Settings- und Katalogdatensätze bleiben unverändert. Der Upgradepfad von Version 1 auf 3 ergänzt beide fehlenden Stores. Es werden dabei keine Demo-Kunden ungefragt als persistierter Datensatz geschrieben. Datenbankschema- und Datenformatversionen werden unabhängig versioniert.

Der Settings-Datensatz enthält ausschließlich:

- `formatVersion`, `tenantId`, `updatedAt`;
- `company` einschließlich Anschrift und `useAsServiceLocation`;
- `serviceLocations` als Liste;
- `businessAreas` einschließlich Aktivstatus, Standardbereich und Standard-Leistungsort;
- `taxSettings`;
- `receiptSettings` einschließlich Nummernkreis und Belegtexten;
- `paymentChoices` in ihrer fachlichen Reihenfolge;
- `setup.status` mit `not-started`, `started` oder `completed`.

Simulierte Logoobjekte beziehungsweise Bilddaten werden nicht gespeichert. `logoMode` und die sichtbare Geschäftsbezeichnung bleiben normale Geschäftsbereichseinstellungen.

Der Datensatz im Store `catalog` enthält ausschließlich:

- `formatVersion`, `tenantId`, `updatedAt`;
- `categories` mit Geschäftsbereich, Typ, Aktivstatus, Sortierung und Zeitstempeln;
- `items` für Leistungen und Produkte mit Kategorie, Centbetrag, Steuersatz, Aktivstatus, Favorit, Sortierung, Quelle und Prüfstatus;
- bei Produkten zusätzlich Artikelnummer und Einheit;
- `templateImports` mit Vorlage, Geschäftsbereich, Importzeitpunkt, Version und den nachvollziehbaren stabilen IDs.

Gutscheinkacheln, Geschäftsvorgänge, Bilder, Logos und Vorlagendefinitionen werden nicht im Katalogstore gespeichert.

Der Datensatz im Store `customers` enthält ausschließlich:

- `formatVersion`, `tenantId`, `updatedAt`;
- `customers` mit stabiler ID, Vorname, Nachname, optionaler Firma, Anschrift, Telefon, Mobilnummer, E-Mail und Notiz;
- Aktivstatus sowie Erstellungs- und Änderungszeitpunkt.

Telefonnummern bleiben Text. E-Mail-Adressen werden an den Rändern bereinigt, ihre eingegebene Groß-/Kleinschreibung wird aber nicht unnötig verändert. Belege, Gutscheine, Historien, Umsatz- und Besuchskennzahlen sowie Versandstatus werden nicht im Kundenstore gespeichert.

## Kundenmodell, Suche und Referenzen

`data.customers` bleibt die einzige fachliche Kundenquelle. Das gespeicherte Format verwendet `postalCode` und `notes`; beim Übernehmen in das bestehende Laufzeitmodell werden zusätzlich die vorhandenen Aliasfelder `zip` und `note` gesetzt. Dies ist eine Formatabbildung innerhalb desselben Kundenobjekts, kein paralleles Modell.

Fehlende optionale Felder werden als leere Strings ergänzt. Doppelte IDs werden beim Laden deterministisch auf einen Eintrag reduziert. Kundenidentität wird niemals aus Name, Telefon oder E-Mail abgeleitet. Ein `active`-Feld wird versioniert erhalten; der aktuelle UX-Prototyp besitzt weiterhin keine eigenständige Archivierungsoberfläche.

Die Suche arbeitet direkt auf den geladenen Kundenobjekten und umfasst Vorname, Nachname, Firma, Telefon, Mobilnummer und E-Mail. Für Telefonnummern werden bei der Suche Leerzeichen, Schrägstriche, Bindestriche und Klammern ignoriert. Es gibt keine zusätzliche Suchdatenbank und keinen separaten Index.

Neue Belege und Gutscheine referenzieren weiterhin die stabile Kunden-ID und erzeugen beim Abschluss ein separates Kundensnapshot. Kundenänderungen mutieren weder bestehende Beleg- noch Gutscheinsnapshots. Der Verlauf bleibt aus den noch flüchtigen Beleg- und Gutscheindaten ableitbar und wird nicht in den Kundenstore kopiert.

## Katalogmodell und Normalisierung

Kategorien und Katalogeinträge behalten ihre bestehenden stabilen IDs. `priceCents` wird ausschließlich als nicht negative Ganzzahl gespeichert; `taxRate` bleibt eine Zahl. Jeder Eintrag gehört zu genau einem Geschäftsbereich und höchstens einer Kategorie. Fehlende, bereichsfremde oder typfremde Kategoriereferenzen werden beim Laden auf `null` gesetzt.

Kategorien und Einträge, deren Geschäftsbereich nicht mehr vorhanden ist, werden nicht automatisch gelöscht. Sie bleiben im zentralen Katalog erhalten, werden sicher deaktiviert und sind dadurch in den aktiven Ansichten ausgeblendet. So führt ein vorübergehend fehlender oder zurückgesetzter Geschäftsbereich nicht stillschweigend zum Verlust des Katalogbestands.

Vorlagen verwenden deterministische IDs aus Geschäftsbereich, Typ und Vorlagenschlüssel. Ein erneuter Import überspringt vorhandene Kategorien und Einträge. Persistierter Importstatus verhindert dadurch zusammen mit der ID-Deduplizierung Duplikate nach Reload; vorhandene manuelle Änderungen werden nicht überschrieben. Neue Vorlagenversionen werden nicht automatisch eingespielt.

## Leistungsortmodell

Die Unternehmensanschrift bleibt ausschließlich Bestandteil von `company`. `company.useAsServiceLocation` bestimmt, ob ein Leistungsort mit `addressMode: "company"` diese Anschrift verwenden darf.

Leistungsorte bleiben eine Liste. Jeder Ort besitzt eine stabile String-ID und enthält seine Zuordnungen zu Geschäftsbereichen als `businessAreaIds`. Damit bleibt die n:m-Beziehung erhalten. Der Standard-Leistungsort liegt nicht global, sondern je Geschäftsbereich in `businessAreas[].defaultServiceLocationId`.

Beim Laden werden verwaiste Zuordnungen entfernt. Ein Standardort ist nur gültig, wenn er existiert, aktiv, dem Geschäftsbereich zugeordnet und bei Verwendung der Unternehmensanschrift verfügbar ist. Andernfalls wird der erste geeignete zugeordnete Ort verwendet oder der Standard sicher auf `null` gesetzt. Es wird keine fachliche Zuordnung erfunden.

## Fehler- und Fallbackverhalten

- Ein fehlender Datensatz ist ein normaler Erststart und verwendet sichere Standardwerte.
- Nicht unterstützte neuere Formatversionen werden nicht überschrieben.
- Beschädigte oder ältere Formatversionen ohne definierten Migrationspfad werden nicht stillschweigend als aktuelle Version umetikettiert.
- Ladefehler führen zu sicheren In-Memory-Standardwerten und einem verständlichen Hinweis.
- Schreibfehler lassen die aktuelle Eingabe im Arbeitsspeicher bestehen, zeigen aber keine Erfolgsmeldung.
- Schreib- und Resetvorgänge werden serialisiert; ein Fehler blockiert spätere Versuche nicht.
- Settings-, Katalog- und Kundenschreibvorgänge verwenden getrennte Stores und überschreiben sich nicht gegenseitig.
- Konsolenmeldungen enthalten nur Operation und Fehlercode, niemals vollständige Datensätze, Namen, E-Mail-Adressen, Telefonnummern oder Anschriften.
- Unbekannte harmlose Felder bestehender Datensätze werden beim erneuten Schreiben soweit möglich erhalten.
- Ein Katalogschreibfehler lässt die bereits geänderten zentralen Laufzeitobjekte bestehen, zeigt keine Erfolgsmeldung und ermöglicht einen erneuten Speicherversuch.
- Ein Kundenschreibfehler lässt Formularwerte und die geänderten zentralen Kundenobjekte bestehen. Das Formular bleibt geöffnet, ein erneuter Versuch verwendet dieselbe stabile ID und erzeugt kein Duplikat.

## Automatisierter Browser-Smoke-Test

`tests/persistence-smoke.html` führt ohne zusätzliche Bibliothek native IndexedDB-Prüfungen aus. Die Seite muss über HTTP oder HTTPS geöffnet werden und startet automatisch. Jeder Lauf verwendet einen zufälligen Datenbanknamen mit dem Präfix `frecka-persist-smoke-`, zeigt jeden Fall als PASS oder FAIL und löscht anschließend ausschließlich diese Testdatenbank. Ein Guard schützt die Produktionsdatenbank `frecka`.

Geprüft werden weiterhin alle PERSIST-001a- und PERSIST-002-Fälle. Hinzu kommen Schema-Upgrades auf Version 3, Kunden-Erststart und Roundtrip, Anlage, Bearbeitung, optionale Felder, Text-Telefonnummern, E-Mail, Aktivstatus, stabile IDs, Mehrfachspeicherung, Suche nach Name, Firma, Telefon und E-Mail, ausgeschlossene Historien, unbekannte Felder, tenantisolierter Kundenreset sowie Wiederanlauf nach Kundenschreibfehlern.

## Reset

„Gespeicherte Einstellungen zurücksetzen“ löscht ausschließlich den Settings-Datensatz der aktuellen `tenantId`. Kunden, Belege, Gutscheine, Kataloge und deren Snapshots werden weder aus IndexedDB noch aus dem aktuellen Arbeitsspeicher gelöscht. Anschließend werden die unveränderten sicheren Start-Einstellungen in die zentrale Laufzeitquelle übernommen.

„Gespeicherten Katalog zurücksetzen“ löscht ausschließlich den Katalogdatensatz der aktuellen `tenantId`. Settings, Kunden, Belege und Gutscheine bleiben unverändert. Anschließend werden die sicheren Demo-/Standardkategorien, -leistungen und -produkte in die bestehende zentrale Katalogquelle übernommen. Beide Aktionen sind getrennt bestätigt und führen keine versteckte Löschung aus.

„Gespeicherte Kunden zurücksetzen“ löscht ausschließlich den Kundendatensatz der aktuellen `tenantId`. Settings, Katalog, Belege und Gutscheine bleiben unverändert. Anschließend werden die sicheren Demo-Kunden in `data.customers` übernommen. Die Aktion besitzt eine eigene Bestätigung und löscht keine Datensätze anderer Mandanten.

## ADR-Status

ADR-0002 dokumentiert IndexedDB bereits als verbindliche lokale Persistenztechnologie. PERSIST-003 folgt dieser Entscheidung und benötigt für den kleinen fachlichen Storezuschnitt kein weiteres ADR.

## Manueller Safari-/iPhone-Smoke-Test

Der Test erfolgt über ein HTTPS-Testdeployment oder einen lokalen HTTP-Server, nicht über `file://`.

1. Persistierte Einstellungen zurücksetzen und Standardwerte prüfen.
2. Unternehmensnamen ändern und speichern.
3. Zwei Leistungsorte mit Mehrfachzuordnung anlegen und je Geschäftsbereich einen gültigen Standard-Leistungsort wählen.
4. Eine Kategorie, eine Leistung und ein Produkt anlegen; Favorit, Aktivstatus, Reihenfolge, Preis und Steuersatz ändern.
5. Eine Branchenvorlage importieren, einen importierten Eintrag manuell bearbeiten und offene Prüfungen bestätigen.
6. Einen eindeutig fiktiven Kunden mit Firma, Telefon, Mobilnummer, E-Mail, Anschrift und Notiz anlegen und anschließend bearbeiten.
7. Die Kundensuche nacheinander mit Name, Firma, E-Mail und einer Telefonnummer ohne die eingegebenen Trennzeichen prüfen.
8. Mit diesem Kunden einen neuen Beleg und einen Gutschein simulieren und die jeweiligen Kundensnapshots öffnen.
9. Seite neu laden, Safari vollständig schließen und erneut öffnen.
10. Einstellungen, Katalogänderungen und Kundenstammdaten prüfen; die Kundensuche muss unverändert funktionieren und der Kunde darf nur einmal vorhanden sein.
11. Kundenadresse ändern und prüfen, dass zuvor erzeugte Beleg- und Gutscheinsnapshots unverändert bleiben.
12. Bei bereits geladener App das Netz deaktivieren und erneut Settings, Katalog und Kunden speichern.
13. Settings- und Katalogreset jeweils abbrechen und bestätigen; die Kunden müssen erhalten bleiben.
14. Kundenreset abbrechen und bestätigen; Settings und Katalog müssen erhalten bleiben und sichere Demo-Kunden wieder erscheinen.
15. Optional im privaten Modus prüfen, ob Speicherung funktioniert oder der Fallbackhinweis verständlich erscheint.

Ein kalter Offline-Neustart der App-Shell ist nicht Gegenstand dieser Persistenzblöcke, weil der bestehende Prototyp ältere Service Worker und Caches weiterhin entfernt und ein Service-Worker-Großumbau ausdrücklich ausgeschlossen ist.
