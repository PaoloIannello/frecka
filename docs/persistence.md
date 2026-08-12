# Lokale Settings-, Katalog-, Kunden-, Beleg- und Gutscheinpersistenz

**Stand:** SETTINGS-002 auf Basis SETTINGS-001, LICENSE-001, USER-002, PERSISTENCE-007, PERSIST-005, BACKUP-001 und EXPORT-003
**Geltungsbereich:** Vollständige FRECKA-Einstellungen einschließlich Unternehmen, lokalem Benutzer und lokaler Gerätebindung, Katalog, Kundenstammdaten, abgeschlossene Belege, offene Zahlungen, Stornos, Gutschriften, Gutscheine und Gutschein-Historien
**Nicht enthalten:** Entwürfe, QR-Grafiken, E-Mail-, Kamera- und Druckstatus, PDF-Dateien sowie eine dauerhafte Ablage von Backup-Dateien

## Ausgangsfluss vor PERSIST-001a

Die einzige fachliche Laufzeitquelle ist `window.PROTOTYPE_DATA` aus `js/data.js`. `js/app.js` verwendet dafür den Alias `data`. Das Top-Level-Objekt ist nur flach eingefroren; die enthaltenen Einstellungsobjekte und Arrays werden direkt und gemeinsam mutiert.

Zentrale Einstellungsbereiche:

- `data.company`: optionale Geschäftsbezeichnung, verpflichtende rechtliche Person, optionaler Ansprechpartner, Unternehmensanschrift, Kontakt- und Steuerangaben, Website, Unternehmenslogo, eigener Änderungszeitpunkt und `useAsServiceLocation`;
- `data.serviceLocations`: Liste aller Leistungsorte einschließlich n:m-Zuordnungen über `businessAreaIds`;
- `data.businessAreas`: Geschäftsbereiche einschließlich Aktivstatus, Standardbereich und `defaultServiceLocationId`;
- `data.taxSettings`: Steuerstatus, Steuersätze und Standardsteuersatz;
- `data.receiptSettings`: Nummernkreis, Belegtexte, Währung und Sprache;
- `data.paymentChoices`: Zahlungsarten, Aktivstatus und Reihenfolge;
- `data.users` und `data.userSettings.activeUserId`: genau ein aktiver mandantenbezogener Benutzer in V1.0;
- `data.license`: genau eine lokale, mandantenbezogene Lizenz- und Gerätebindung in V1.0;
- UI-State des Einrichtungsassistenten: bisher nicht dauerhaft gespeichert.

Die Mutationen erfolgen insbesondere über `applyCompanyForm`, `applyServiceLocationForm`, `applyBusinessAreaForm`, `saveSetupStep`, den Steuerformular-Handler sowie die Zahlungsarten-Toggle- und Sortieraktionen. Leser sind die Einstellungsansichten, der Header, der Beleg- und Gutscheinabschluss, die Dokument-Snapshot-Erzeugung sowie der Einrichtungsassistent.

Vor PERSIST-001a werden Demo-/Standardwerte aus `js/data.js` synchron geladen. Belegzähler und aktiver Geschäftsbereich werden daraus bereits vor dem ersten Rendern abgeleitet. Alle Erfolgsmeldungen erscheinen unmittelbar nach der In-Memory-Mutation; ein Reload verwirft Änderungen.

## Katalogfluss vor PERSIST-002

Die fachliche Katalogquelle besteht aus `data.categories`, den nach Geschäftsbereich gruppierten Arrays in `data.catalog` sowie `data.templateImportStatus`. `migratePrototypeCommerceModel` überführt die älteren Demo-Einträge beim Start in das zentrale UX-023/UX-024-Modell.

Kategorien und Einträge werden durch `applyCatalogCategoryForm` und `applyCatalogItemForm` angelegt oder bearbeitet. Die Katalogverwaltung aktiviert, deaktiviert und sortiert dieselben Objekte direkt. Favoriten, `needsReview`, Preis- und Steuersatzbestätigungen sind Eigenschaften der Katalogeinträge. `importBusinessTemplate` erzeugt aus Geschäftsbereich und Vorlagenschlüssel deterministische IDs und überspringt bereits vorhandene IDs; manuelle Änderungen werden dadurch nicht überschrieben. Vor PERSIST-002 gehen alle diese Änderungen bei einem Reload verloren.

## Kundenfluss vor PERSIST-003

Die einzige Kundenlaufzeitquelle ist `data.customers`. Neuanlage und Bearbeitung mutieren dieses Array beziehungsweise den darin enthaltenen Kunden direkt. Kunden werden im normalen Beleg und im Gutscheinverkauf über ihre stabile ID ausgewählt. Beim Abschluss werden Name, E-Mail und Adresse in ein neues Kunden-Snapshotobjekt kopiert; spätere Stammdatenänderungen verändern dieses Dokumentobjekt nicht.

Die bisherige Suche berücksichtigt Name, Telefon und E-Mail. PERSIST-003 ergänzt Firma und Mobilnummer sowie eine Trennzeichen-unabhängige Telefonnummernsuche, ohne einen Suchindex anzulegen. Der Kundenbelegverlauf wird weiterhin aus `data.receipts` über die Kunden-ID abgeleitet. Demo-Kennzahlen und die alten eingebetteten Demo-History-Arrays sind keine Kundenstammdaten und werden nicht persistiert.

## Belegfluss vor PERSIST-004

Normale Belege, offene Zahlungen, Stornos und Gutschriften liegen gemeinsam in `data.receipts`. Die Liste ist zugleich Laufzeitquelle für Belegübersicht, Detail, Kassenzettel, Filter, offene Zahlungen und den aus der Kunden-ID abgeleiteten Kundenverlauf. Aktivitäten liegen am jeweiligen Beleg; offene Zahlungen ergänzen `paymentEvents`. Es gibt keine Historienkopie im Kundenstore.

Vor PERSIST-004 erhöht `nextReceiptNumber` den Laufzeitzähler und `data.receiptSettings.nextNumber`, bevor ein Beleg dauerhaft gesichert ist. Normale Abschlüsse und Gutschein-Verkaufsbelege werden anschließend direkt in `data.receipts` eingefügt. Nachträgliche Zahlung und interne Notiz mutieren den Ursprungsbeleg. Storno und Gutschrift erzeugen Nummern aus der aktuellen Listenlänge, fügen ein Folgedokument hinzu und ändern Status sowie Aktivität des Ursprungs. Sämtliche Änderungen gehen bei Reload verloren; ein Schreibfehler besitzt keine fachliche Transaktionsgrenze.

Neue Belege bilden bereits `contextSnapshot` aus Unternehmen, Geschäftsbereich, Leistungsort und Branding sowie ein Kundensnapshot. Positionen enthalten Preis-, Rabatt- und Steuerinformationen. Gutscheinzahlungen referenzieren einen Gutschein über `voucherPayment.reference`; Gutscheinverkaufsbelege verwenden `voucherReference`. Vollständige Gutscheinobjekte gehören nicht zum Belegmodell.

## Gutscheinfluss vor PERSIST-005

Gutscheine und ihre Historien liegen in `data.vouchers`. Verkauf, Teil- und Voll-Einlösung, Restwert, Status, Belegreferenzen, QR-Grundlage und Dokument-Snapshots sind fachlich bereits Bestandteil dieser Laufzeitobjekte. Vor PERSIST-005 wird zwar der Verkaufs- beziehungsweise Einlösungsbeleg gespeichert, Gutschein und Historie werden danach jedoch getrennt nur im Arbeitsspeicher verändert. Ein Reload verliert den Gutscheinvorgang; ein Fehler zwischen Beleg- und Gutscheinmutation könnte einen halben fachlichen Zustand erzeugen.

## Datenfluss ab PERSIST-005

1. Die statische App-Shell zeigt einen kompakten Ladezustand.
2. `js/persistence.js` öffnet IndexedDB und liest den Settings-Datensatz.
3. Vorhandene Einstellungen werden versioniert normalisiert und in-place in die bestehenden zentralen Laufzeitobjekte übernommen; dadurch stehen die Geschäftsbereiche für die Katalogvalidierung bereit.
4. Die Demo-/Standardkatalogdaten werden einmal in das aktuelle Laufzeitformat überführt und als sichere Fallbackbasis erfasst.
5. Der mandantenbezogene Katalogdatensatz wird gelesen, normalisiert und in-place in `data.categories`, `data.catalog` und `data.templateImportStatus` übernommen.
6. Danach wird der Kundendatensatz gelesen, normalisiert und in-place in `data.customers` übernommen.
7. Nach Bildung der sicheren Dokumentkontexte wird der Belegdatensatz gelesen, normalisiert und in-place in dasselbe `data.receipts` übernommen.
8. Danach wird der Gutscheindatensatz gelesen, normalisiert und in-place in dasselbe `data.vouchers` übernommen.
9. Fehlt ein Datensatz, bleiben für den jeweiligen Bereich die sicheren Demo-/Standardwerte aktiv. Demo-Belege verbrauchen dabei keine neue produktive Nummer.
10. Erst danach werden Belegzähler, aktiver Geschäftsbereich und UI-State abgeleitet und die Oberfläche gerendert.
11. Settings-, Katalog-, Kunden-, Beleg- und Gutscheinaktionen erzeugen jeweils eine enge Projektion ihrer bestehenden Laufzeitquelle und verwenden getrennte Stores über dieselbe serialisierte Persistenzschicht.
12. Eine Erfolgsmeldung erscheint erst nach erfolgreichem Transaktionsabschluss. Kann der Receipt- oder Voucher-Store beim Start nicht sicher gelesen werden, bleiben die betroffenen Gutscheinabschlüsse gesperrt.

UI- und Renderfunktionen greifen niemals direkt auf `indexedDB` zu. Nur `js/persistence.js` kennt die Browser-Datenbank-API.

## Datenbankvertrag

- Datenbankname: `frecka`
- Datenbankschema-Version: `5`
- Object Stores: `settings`, `catalog`, `customers`, `receipts` und `vouchers`
- Key Path: `tenantId`
- Standardschlüssel/Instanz: `local-default`
- Einstellungsformat-Version: `1`
- Katalogformat-Version: `1`
- Kundenformat-Version: `1`
- Belegformat-Version: `1`
- Gutscheinformat-Version: `1`

Das Upgrade von Schema-Version 4 auf 5 legt ausschließlich den neuen `vouchers`-Store an; alle bisherigen Stores und Datensätze bleiben unverändert. Die älteren Upgradepfade ergänzen weiterhin alle später hinzugekommenen Stores. Es werden dabei keine Demo-Geschäftsdaten ungefragt geschrieben. Datenbankschema- und Datenformatversionen werden unabhängig versioniert.

BACKUP-001 verändert das Datenbankschema nicht. Die zentrale Persistenzschicht ergänzt `exportTenantSnapshot`, `validateTenantSnapshot` und `restoreTenantSnapshot`. Export liest alle fünf Stores konsistent; Restore ersetzt sie nach einer vollständigen Vorabprüfung in einer einzigen Readwrite-Transaktion. Das verschlüsselte Dateiformat und der genaue Ablauf sind in `docs/backup-restore.md` beschrieben.

EXPORT-001 verändert das Datenbankschema ebenfalls nicht. Der fachliche Export ruft dieselbe Funktion `exportTenantSnapshot` auf und übergibt den validierten Snapshot an die reine Projektion in `js/export.js`. Das Exportmodul öffnet keine Datenbank, liest keine UI-Listen und schreibt keine Daten. Der CSV-Vertrag und die Datenschutzgrenzen sind in `docs/export.md` dokumentiert.

QR-001 verändert das Datenbankschema ebenfalls nicht. Beleg-IDs und Gutschein-QR-Referenzen werden aus den vorhandenen Laufzeitobjekten gelesen; `js/qr.js` leitet daraus ausschließlich zur Laufzeit App-Link, QR-Matrix und SVG ab. Der QR-Service öffnet keine Datenbank und schreibt weder Bilddaten noch eine zweite Referenzstruktur. Der QR-Vertrag steht in `docs/qr.md`.

Der Settings-Datensatz enthält ausschließlich:

- `formatVersion`, `tenantId`, `updatedAt`;
- `users` mit genau einem aktiven, versionierten und mandantenbezogenen Benutzer sowie `activeUserId` als stabile Referenz;
- `license` mit Lizenz-ID, opaker Geräte-ID, Mandant, Formatversion und lokalen Zeitpunkten;
- `company` einschließlich getrennter Anschrift, Kontakt- und Steuerangaben, Website, validiertem Unternehmenslogo, eigenem `updatedAt` und `useAsServiceLocation`;
- `serviceLocations` als Liste;
- `businessAreas` einschließlich Aktivstatus, Standardbereich und Standard-Leistungsort;
- `taxSettings`;
- `receiptSettings` einschließlich Nummernkreis und Belegtexten;
- `paymentChoices` in ihrer fachlichen Reihenfolge;
- `backupReminder` mit Formatversion, lokalem Fristbeginn, Zeitpunkt der letzten bestätigten Sicherung und optionalem 24-Stunden-Snooze;
- `setup.status` mit `not-started`, `started` oder `completed`.

BACKUP-003 verändert weder Datenbankschema noch Settings-Formatversion. Fehlen die Reminder-Metadaten bei Erstinstallation oder historischem Bestand, wird lokal der Zeitpunkt der ersten kompatiblen Initialisierung als Fristbeginn gespeichert; dadurch erscheint keine sofortige Erinnerung. Der Status enthält keine personenbezogenen Daten. Beim atomaren Restore werden Unternehmen und alle fachlichen Stores aus der Sicherung übernommen, `backupReminder` bleibt jedoch vom aktuellen Gerät erhalten. Eine alte Sicherungsdatei kann damit weder die Wochenfrist fälschlich zurücksetzen noch einen lokalen Snooze überschreiben.

SETTINGS-001 speichert genau ein optionales Unternehmenslogo im bestehenden Settings-Datensatz. Zulässig sind ausschließlich anhand ihrer Dateisignatur geprüfte PNG- und JPEG-Daten bis 1 MiB; Formatversion, stabiler Logo-Schlüssel, Dateiname, MIME-Type, Bytegröße, Data-URL und Änderungszeitpunkt werden strikt normalisiert. Historische simulierte Unternehmenslogos werden als `null` übernommen. Simulierte Geschäftsbereichslogos und nicht freigegebene Logo-Nebenfelder bleiben ausgeschlossen. `logoMode` und die sichtbare Geschäftsbezeichnung bleiben normale Geschäftsbereichseinstellungen.

SETTINGS-002 führt keinen neuen Store, kein neues Feld und keine Schema- oder Formatversion ein. Die Seite **Betrieb** bearbeitet direkt `taxSettings`, `receiptSettings`, `paymentChoices` und den eindeutigen Eintrag `businessAreas[].isDefault`. EUR und Deutsch bleiben feste V1.0-Werte. `receiptSettings.yearPrefix` und `receiptSettings.nextNumber` werden nur angezeigt; Storno- und Gutschriftnummern bleiben wie bisher ausschließlich aus den vorhandenen Korrekturbelegen abgeleitet. Auch ein erneut gestarteter Einrichtungsassistent darf diese Nummern nicht zurücksetzen. Bei einem fehlgeschlagenen Speichervorgang werden die in der Betriebsseite versuchten Laufzeitänderungen auf den zuletzt bestätigten Stand zurückgesetzt.

Geschäftsbezeichnung und `Unternehmer/in` bleiben getrennte Felder. Ein Ansprechpartner ist optional. Bestehende kombinierte Werte in `company.street` werden beim Laden nicht automatisch zerlegt; `houseNumber` bleibt dann leer. Neue oder bearbeitete Anschriften können beide Werte getrennt führen, während Dokument-Snapshots weiterhin eine verlustfreie kombinierte Straßenzeile erhalten. `company.updatedAt` ändert sich nur zusammen mit einer tatsächlichen Änderung dieser Unternehmensdaten oder des Logos; der allgemeine Settings-Zeitpunkt bleibt davon unabhängig.

USER-001 verändert weder Datenbankschema noch Store- oder Settings-Formatversion. Das Listenmodell bereitet spätere Mehrbenutzerfähigkeit vor, ohne sie in V1.0 freizuschalten. Historische Settings ohne Benutzer werden deterministisch aus `Unternehmer/in` und der aktuellen `tenantId` ergänzt; mehrere oder neuere Benutzerdaten werden von V1.0 nicht reduziert. Der vollständige Vertrag steht in `docs/users.md`.

LICENSE-001 verändert Datenbankschema, Storeanzahl und Settings-Formatversion ebenfalls nicht. Die opaken Kennungen entstehen lokal ohne Personen- oder Hardwaremerkmale und werden anschließend ausschließlich über denselben Settings-Datensatz stabil gehalten. Der vollständige Vertrag steht in `docs/licensing.md`.

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

Der Datensatz im Store `receipts` enthält:

- `formatVersion`, `tenantId`, `updatedAt` und die Liste `receipts`;
- je Dokument stabile ID, Belegnummer, Typ, Status und ISO-Zeitstempel;
- IDs und unveränderliche Snapshots für Unternehmen, Geschäftsbereich, Leistungsort, Branding und optional Kunde;
- Positionssnapshots mit optionaler Katalog-ID, Typ, Name, Menge, Preis, Rabatt, Steuersatz sowie Netto-, Steuer- und Bruttocentwerten;
- Summen und Steueraufschlüsselung als Integer-Centwerte;
- Zahlungsstatus, Zahlungsart, Zahlungszeitpunkt und `paymentEvents`;
- Aktivitäten, interne Notiz sowie Referenzen zwischen Ursprung, Storno und Gutschrift;
- optional ausschließlich eine schmale Gutscheinreferenz beziehungsweise Zahlungsreferenz, niemals das vollständige Gutscheinobjekt oder seine Historie.

Die bestehenden UI-Aliasfelder wie `number`, `type`, `items`, `total` und `activity` bleiben innerhalb desselben Belegobjekts erhalten. Das persistente Format ergänzt die kanonischen Felder `receiptNumber`, `receiptType`, `positions`, `totalCents` und `activities`; es entsteht keine zweite Belegliste.

Der Datensatz im Store `vouchers` enthält:

- `formatVersion`, `tenantId`, `updatedAt` und die Liste `vouchers`;
- stabile Gutschein-ID, opake `reference`, normalisierten sowie sichtbaren Code und Status;
- Ursprungs- und Restwert als Integer-Centwerte sowie die bestehenden UI-Aliasfelder;
- Verkaufszeitpunkt, Verkaufsbelegreferenz, Einlösungsreferenzen und Zeitstempel;
- unveränderliche Snapshots von Unternehmen, Branding, Geschäftsbereich, Leistungsort und optional Kunde;
- Kundenreferenz, QR-Referenz und App-Link, aber keine QR-Grafik;
- die chronologisch angehängte Historie mit stabiler ID, Typ, Zeitpunkt, Betrag, Restwert danach und Belegreferenz.

PDF-Dateien, QR-Bilder, Mail-, Kamera- und Druckstatus werden entfernt. `data.vouchers` bleibt die einzige fachliche Gutscheinlaufzeitquelle; Centfelder und Aliasfelder liegen im selben Objekt und bilden keine zweite Gutscheinstruktur.

## Kundenmodell, Suche und Referenzen

`data.customers` bleibt die einzige fachliche Kundenquelle. Das gespeicherte Format verwendet `postalCode` und `notes`; beim Übernehmen in das bestehende Laufzeitmodell werden zusätzlich die vorhandenen Aliasfelder `zip` und `note` gesetzt. Dies ist eine Formatabbildung innerhalb desselben Kundenobjekts, kein paralleles Modell.

Fehlende optionale Felder werden als leere Strings ergänzt. Doppelte IDs werden beim Laden deterministisch auf einen Eintrag reduziert. Kundenidentität wird niemals aus Name, Telefon oder E-Mail abgeleitet. Ein `active`-Feld wird versioniert erhalten; der aktuelle UX-Prototyp besitzt weiterhin keine eigenständige Archivierungsoberfläche.

Die eine Kundensuche arbeitet direkt auf den geladenen Kundenobjekten und umfasst Vorname, Nachname, Firma, Telefon, Mobilnummer, E-Mail, Straße, Postleitzahl und Ort. Für Telefonnummern werden bei der Suche Leerzeichen, Schrägstriche, Bindestriche und Klammern ignoriert. Es gibt keine zusätzliche Suchdatenbank, keinen separaten Index und keine weiteren Suchfelder.

Neue Belege und Gutscheine referenzieren weiterhin die stabile Kunden-ID und erzeugen beim Abschluss ein separates Kundensnapshot. Kundenänderungen mutieren weder bestehende Beleg- noch Gutscheinsnapshots. Der Kundenbelegverlauf wird aus den persistierten Belegen und der Gutscheinverlauf aus dem jeweiligen Voucher-Objekt abgeleitet. Keine Historie wird in den Kundenstore kopiert.

## Belegmodell, Nummernvergabe und Atomarität

`data.receipts` bleibt die einzige fachliche Beleglaufzeitquelle. Der Receipt-Store speichert eine versionierte Projektion genau dieser Liste. Laden und Speichern ersetzen beziehungsweise normalisieren Einträge in-place; Belegübersicht, Detail, Kassenzettel, Filter und Kundenverlauf lesen weiterhin dieselben Objekte.

Der Nummernstand normaler Belege bleibt ausschließlich in `settings.receiptSettings.nextNumber`. Im Receipt-Store wird kein paralleler `receiptSequence` geführt. `commitReceipt` öffnet eine gemeinsame Readwrite-Transaktion über `settings` und `receipts`, liest Nummernstand und vorhandene Belegnummern, vergibt die nächste kollisionsfreie Nummer, schreibt den vollständigen Beleg und erhöht anschließend den Settings-Nummernstand. Erst der erfolgreiche Abschluss dieser einen Transaktion bestätigt den Beleg. Bei Abbruch bleiben Nummernstand, Receipt-Store, Warenkorb und Erfolgsansicht unverändert; ein erneuter Versuch kann dieselbe sichere nächste Nummer verwenden. Eine stabile Beleg-ID macht die Wiederholung desselben Abschlusses idempotent.

Storno- und Gutschriftsnummern werden innerhalb der Receipt-Transaktion aus den bereits gespeicherten Folgedokumenten ermittelt. Stornos verwenden `ST-<Jahr>-<Sequenz>`, Gutschriften `GS-<Jahr>-<Sequenz>` entsprechend der vorhandenen Prototyplogik. Ursprungsbeleg und Folgedokument werden in einem Schreibvorgang aktualisiert. Die Dokument-Snapshots des Ursprungs bleiben unverändert; nur Lebenszyklusfelder wie Status, Korrekturreferenzen, Aktivität und `updatedAt` werden ergänzt. Ein zweiter Stornoklick erzeugt kein Duplikat.

Offene Belege werden mit `paymentStatus: "open"`, ohne Zahlungsart und ohne Zahlungszeitpunkt gespeichert. Die Aktivität „Zahlung offen gelassen“ gehört zum Beleg. Eine spätere vollständige Zahlung wird vor der UI-Bestätigung zusammen mit Zahlungsart, Zeitpunkt, Betrag, `paymentEvent` und Aktivität in den Receipt-Store geschrieben. Teilzahlungen, Mahnungen, Bankabgleich und Zahlungsanbieter sind nicht enthalten.

## Gutscheinmodell, Historie und Atomarität

`data.vouchers` bleibt die einzige fachliche Gutscheinlaufzeitquelle. Beim Laden ersetzt die normalisierte Store-Projektion die Einträge dieses Arrays in-place. Status, Restwert, Detail, Historie und Belegnavigation lesen weiterhin dasselbe Gutscheinobjekt.

`commitVoucherSale` und `commitVoucherRedemption` verwenden dieselbe interne Belegnummernvergabe wie `commitReceipt`. Beide öffnen genau eine Readwrite-Transaktion über `settings`, `receipts` und `vouchers`. Ein Verkauf bestätigt deshalb Nummernstand, Verkaufsbeleg, Gutschein und ersten Historieneintrag gemeinsam. Eine Einlösung bestätigt Nummernstand, Einlösungsbeleg, Zahlungsstatus, neuen Restwert, Status, Einlösungsreferenz und Historieneintrag gemeinsam. Schlägt ein Teil fehl, wird die gesamte Transaktion abgebrochen; es gibt weder halbe Datensätze noch eine Nummernlücke.

Gutschein-ID, opake Referenz und normalisierter sichtbarer Code sind eindeutig. Eine stabile Beleg-ID macht wiederholte identische Abschlüsse idempotent. Negative Restwerte, Restwerte über dem Ursprungswert und Einlösungsbeträge über dem verfügbaren Restwert werden abgewiesen. Bestehende Historieneinträge dürfen weder geändert noch gekürzt werden; neue Einträge werden ausschließlich chronologisch angehängt. Unterstützte Typen sind `sold`, `partial_redemption`, `full_redemption`, `cancelled` und `credit`.

Für jeden Gutschein mit Verkaufsbelegreferenz gilt zusätzlich eine zentrale, bidirektionale Invariante: `saleReceiptReference` entspricht der stabilen Receipt-ID; `saleReceipt.id` und `saleReceipt.number` müssen denselben vorhandenen Beleg bezeichnen; dieser Beleg besitzt `receiptKind: "voucher-sale"` und verweist mit `voucherReference` exakt auf die Gutscheinreferenz zurück. Eine Receipt-ID oder Belegnummer darf keinem zweiten Gutscheinverkauf gehören. Umgekehrt darf kein Gutscheinverkaufsbeleg ohne vorhandenen, eindeutig gegengezeichneten Gutschein existieren. Dieselbe reine Prüfung wird beim Laufzeitstart, bei vollständigen Tenant-Snapshots, vor Restore und im Export verwendet. Sie rekonstruiert und schreibt keine Daten. Ihr Ergebnis beschreibt die globale Export- und Sicherungsfähigkeit, nicht die technische Verfügbarkeit der getrennten Stores.

PERSISTENCE-007 trennt deshalb die globale Bestandsinvariante von den Writer-Gates. Ein sicher geladener Receipt-Store darf weiterhin unabhängige neue Belege atomar speichern, auch wenn ein historischer Gutschein auf einen fehlenden alten Verkaufsbeleg verweist. Gutscheinverkauf und -einlösung prüfen unmittelbar vor dem gemeinsamen Schreiben ausschließlich das neu erzeugte beziehungsweise konkret betroffene Beleg-/Gutscheinpaar. Fehlerhafte Gegenreferenzen, Kollisionen und unvollständige Einlösungsverknüpfungen brechen weiterhin die gesamte Transaktion ab. Die historische Abweichung bleibt unverändert sichtbar und wird weder migriert noch repariert.

### Eng begrenzte Reparatur historischer Demo-Gutscheinverkaufsbelege

PERSISTENCE-010 ergänzt keine allgemeine Migration. Es behebt ausschließlich die vor EXPORT-003 mögliche historische Demo-/Seed-Abweichung für diese vier fest freigegebenen Paare:

- `receipt_demo_2026_000118` / `2026-000118` / `vch_6d2a84f9b3c1`;
- `receipt_demo_2026_000121` / `2026-000121` / `vch_3c9f7a2e5b84`;
- `receipt_demo_2026_000124` / `2026-000124` / `vch_8f4c2a91d7e6`;
- `receipt_demo_2026_000131` / `2026-000131` / `vch_1b7e93a4c5d8`.

Die kanonischen Receipt-Daten stammen ausschließlich aus dem aktuellen konsistenten Seed-Snapshot. Vor jedem Schreibzugriff liest die Reparatur alle fünf Tenant-Stores innerhalb einer gemeinsamen Readwrite-Transaktion, sammelt sämtliche Gutschein-/Verkaufsbelegverletzungen und erzeugt zunächst einen vollständig validierten Kandidaten im Arbeitsspeicher. Geschrieben wird ausschließlich der Receipt-Store und nur dann, wenn nach dem Ergänzen aller fehlenden zulässigen Demo-Receipts der vollständige Tenant-Snapshot gültig ist. Einstellungen, Belegnummernfolge, Katalog, Kunden, Gutscheine, vorhandene Receipts und neuere Gutscheinverkäufe werden nicht verändert.

Harte Stop-Bedingungen sind insbesondere ID- oder Nummernkollisionen, abweichende Voucher-Referenzen oder Gutscheincodes, falsche Belegart beziehungsweise Gegenreferenz, vom kanonischen Demo-Receipt abweichende vorhandene Daten, doppelte Voucher-Ansprüche, fehlende oder mehrdeutige kanonische Quellen und jede weitere Snapshotverletzung, die nach der Ergänzung fortbestünde. Bei einem Stopp gibt es keinen `put`; bei einem simulierten oder realen Schreibfehler rollt IndexedDB die gesamte Transaktion zurück. Ein zweiter erfolgreicher Aufruf erkennt alle vier Paare als vollständig und bleibt ein No-op.

Die Reparatur läuft niemals beim App-Start. Sie wird unter **Einstellungen → Sicherung & Wiederherstellung → Lokale Datenintegrität prüfen** ausschließlich angeboten, wenn die Read-only-Vorprüfung nur die bekannten vollständig reparierbaren Demo-Fälle findet. Die Aktion benötigt eine eigene bewusste Bestätigung, arbeitet lokal ohne Serverübertragung und führt anschließend erneut die vollständige Tenant-Validierung aus. Erst deren Erfolg hebt die durch den Altbestand verursachte Backup- und Exportsperre auf.

Der frühere Sabine-Keller-Demoeintrag `2026-000124`, 59,00 Euro, „Strähnen“ wird nicht aus IndexedDB entfernt: Kundenhistorien sind ausdrücklich vom gespeicherten Kundenformat ausgeschlossen und werden aus Belegen abgeleitet beziehungsweise als nicht persistierte Laufzeitmetadaten behandelt. Der widersprüchliche Eintrag wurde bereits im aktuellen Seed entfernt; PERSISTENCE-010 erfindet keine Ersatznummer und verändert keinen Kunden.

Unternehmens-, Branding-, Geschäftsbereichs-, Leistungsort- und Kundensnapshot werden beim Verkauf in den Gutschein kopiert. Spätere Änderungen an Einstellungen oder Kundenstammdaten verändern diese Snapshots nicht. Persistiert werden nur QR-Referenz und App-Link; die dargestellte QR-Grafik wird jederzeit aus der Referenz erzeugt.

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
- Settings-, Katalog-, Kunden-, Beleg- und Gutscheinschreibvorgänge verwenden getrennte Stores und überschreiben sich nicht gegenseitig. Normale Belegabschlüsse umfassen `settings` und `receipts`; Gutscheinverkauf und -einlösung umfassen fachlich atomar `settings`, `receipts` und `vouchers`.
- Konsolenmeldungen enthalten nur Operation und Fehlercode, niemals vollständige Datensätze, Namen, E-Mail-Adressen, Telefonnummern oder Anschriften.
- Unbekannte harmlose Felder bestehender Datensätze werden beim erneuten Schreiben soweit möglich erhalten.
- Ein Katalogschreibfehler lässt die bereits geänderten zentralen Laufzeitobjekte bestehen, zeigt keine Erfolgsmeldung und ermöglicht einen erneuten Speicherversuch.
- Ein Kundenschreibfehler lässt Formularwerte und die geänderten zentralen Kundenobjekte bestehen. Das Formular bleibt geöffnet, ein erneuter Versuch verwendet dieselbe stabile ID und erzeugt kein Duplikat.
- Ein Belegabschlussfehler zeigt weder Erfolgsansicht noch vergebene Nummer und leert den Warenkorb nicht. Nachträgliche Zahlung, Notiz, Storno und Gutschrift melden einen Fehler, ohne einen isolierten oder halb aktualisierten Folgezustand zu speichern.
- Ein Gutscheinfehler verändert weder Restwert noch Historie, Belegbestand oder Nummernstand in der Laufzeit. Der Nutzer erhält eine verständliche Fehlermeldung; es gibt keine stille Erfolgsmeldung.
- Kann der Belegbestand beim Start nicht gelesen werden, werden keine neuen Nummern vergeben. Kann der Gutscheinbestand nicht gelesen werden, bleiben Verkauf und Einlösung gesperrt. Die übrigen sicher geladenen Bereiche bleiben bedienbar.
- Verletzt der gemeinsam geladene Beleg-/Gutscheinbestand die Verkaufsbeleg-Invariante, meldet FRECKA weiterhin die konkrete betroffene Referenz und führt keine automatische Reparatur aus. Vollständige Sicherungen und Exporte bleiben gesperrt; inkonsistente Restore-Kandidaten werden weiterhin vor jeder Schreibtransaktion abgelehnt. Unabhängige neue Belege und lokal vollständig gegengeprüfte Gutscheintransaktionen bleiben möglich, sofern beide benötigten Stores selbst sicher geladen wurden.

## Automatisierter Browser-Smoke-Test

`tests/persistence-smoke.html` führt ohne zusätzliche Bibliothek native IndexedDB- und Web-Crypto-Prüfungen aus. Die Seite muss über HTTP oder HTTPS geöffnet werden und startet automatisch. Jeder Lauf verwendet einen zufälligen Datenbanknamen mit dem Präfix `frecka-persist-smoke-`, zeigt jeden Fall als PASS oder FAIL und löscht anschließend ausschließlich diese Testdatenbank. Ein Guard schützt die Produktionsdatenbank `frecka`.

Geprüft werden weiterhin alle Fälle aus PERSIST-001a bis PERSIST-004. PERSIST-005 ergänzt das Upgrade 4 → 5, Voucher-Roundtrip, Centwerte, QR- und Belegreferenzen, unveränderliche Snapshots und Historien, atomaren Verkauf, Teil- und Voll-Einlösung, idempotente Wiederholung, Duplikat- und Restwertschutz, Transaktionsfehler ohne halbe Datensätze oder Nummernverbrauch, erweiterte Kundensuche sowie den tenant- und storeisolierten Voucher-Reset. BACKUP-001 ergänzt Snapshot-, Verschlüsselungs-, Manipulations-, Export-, Restore- und Rollbackprüfungen einschließlich des Einspielens in einen leeren Mandanten. HARDEN-001 ergänzt den reversiblen Kundenstatus sowie Dateinamen- und Downloadtypprüfungen. EXPORT-001 ergänzt Zeitraum- und Geschäftsbereichsfilter, offene Zahlung, Storno, Gutschrift, Gutscheinverkaufsbeleg, Gutscheinhistorie, CSV-Regeln, Injection-Schutz, Steuerberater-ZIP, PDF-Einträge, Datenschutz und Snapshot-Unveränderlichkeit. EXPORT-003 ergänzt die positiven Demo- und End-to-End-Fälle sowie Negativfälle für fehlende Belege, falsche ID-/Nummernpaarung, falsche Belegart, falsche Gegenreferenz, verwaiste Verkaufsbelege, Restore und Export-Stopp. PERSISTENCE-007 ergänzt Schreibtests gegen einen unverändert inkonsistenten Altbestand, lokale Gegenreferenzprüfungen sowie den fortbestehenden Backup-, Export- und Restore-Stopp. PERSISTENCE-008 ergänzt die lokale Read-only-Diagnose. PERSISTENCE-010 ergänzt Vorprüfung aller vier bekannten Demo-Fälle, No-op, Teil- und Vollreparatur, ID-/Nummern-/Daten-/Referenz-/Mehrfachanspruch-Stopps, atomaren Rollback, Reload-Idempotenz, unveränderte Nummernfolge und Stores sowie erfolgreiche Snapshot-, Backup- und Steuerberaterexportpfade nach der Reparatur. SETTINGS-001 ergänzt Unternehmensfelder, Legacy-Anschrift, getrennten Änderungszeitpunkt, Logoformat und -Reload, Backup/Restore, Eigene-Daten-Export sowie die Public-QR-Datenschutzgrenze. SETTINGS-002 ergänzt die gebündelte Betriebsseite, den Nummernkreisschutz, die unveränderten Zahlungs-/Steuer-/Standardbereichsmodelle sowie die Abgrenzung des Eigene-Daten-Exports. Der aktuelle native Browserlauf umfasst 175 bestandene Fälle. QR-001 ergänzt zentrale Service-, App-Link-, Matrix-, SVG-, Suchmuster- und Fehlerfallprüfungen.

## Reset

„Gespeicherte Einstellungen zurücksetzen“ löscht ausschließlich den Settings-Datensatz der aktuellen `tenantId`. Kunden, Belege, Gutscheine, Kataloge und deren Snapshots werden weder aus IndexedDB noch aus dem aktuellen Arbeitsspeicher gelöscht. Anschließend werden die unveränderten sicheren Start-Einstellungen in die zentrale Laufzeitquelle übernommen.

„Gespeicherten Katalog zurücksetzen“ löscht ausschließlich den Katalogdatensatz der aktuellen `tenantId`. Settings, Kunden, Belege und Gutscheine bleiben unverändert. Anschließend werden die sicheren Demo-/Standardkategorien, -leistungen und -produkte in die bestehende zentrale Katalogquelle übernommen. Alle Resetaktionen sind getrennt bestätigt und führen keine versteckte Löschung aus.

„Gespeicherte Kunden zurücksetzen“ löscht ausschließlich den Kundendatensatz der aktuellen `tenantId`. Settings, Katalog, Belege und Gutscheine bleiben unverändert. Anschließend werden die sicheren Demo-Kunden in `data.customers` übernommen. Die Aktion besitzt eine eigene Bestätigung und löscht keine Datensätze anderer Mandanten.

„Gespeicherte Belege zurücksetzen“ löscht ausschließlich den Receipt-Datensatz der aktuellen `tenantId`. Settings, Katalog, Kunden und Gutscheine bleiben unverändert. Der Settings-Nummernstand wird absichtlich nicht abgesenkt, damit kein zuvor verwendeter Nummernstand erneut vergeben wird. Anschließend erscheinen die klaren Demo-Belege wieder als Startdaten.

„Gespeicherte Gutscheine zurücksetzen“ löscht ausschließlich den Voucher-Datensatz der aktuellen `tenantId`. Einstellungen, Nummernstand, Katalog, Kunden und Belege bleiben unverändert. Anschließend erscheinen die sicheren Demo-Gutscheine wieder in derselben Laufzeitquelle.

Alle fünf feingranularen Resetaktionen sind Entwicklungswerkzeuge. Sie liegen zweistufig eingeklappt im deutlich gekennzeichneten „Entwicklerbereich · nicht für den Betrieb“ und sind nicht Bestandteil einer produktiven Datenverwaltung. Eine allgemeine Funktion „Alle Daten löschen“ ist nicht umgesetzt.

Ein isolierter Receipt- oder Voucher-Reset kann absichtlich historische Gegenobjekte entfernen und damit die strenge Gutschein-Verkaufsbeleg-Invariante verletzen. Er ist deshalb kein Reparaturweg für Betriebsdaten. Ein vor EXPORT-003 erzeugter Beta-Datenbestand ist vor einem erneuten Test separat zu prüfen. Enthält er die vier alten Demo-Gutscheine ohne zugehörige Receipt-Objekte, wird eine kontrollierte, zuvor gesicherte gezielte Reparatur empfohlen; ein Reset ist nur für ausdrücklich entbehrliche Testdaten vertretbar. EXPORT-003 führt bewusst keine automatische produktive Migration auf Basis vermuteter Demo-Herkunft aus.

## ADR-Status

ADR-0002 dokumentiert IndexedDB als verbindliche lokale Persistenztechnologie. BACKUP-001 folgt dieser Entscheidung, ergänzt aber ein langfristig kompatibles Dateiformat, konkrete Kryptoparameter und die Restore-Semantik. Dafür wird ein eigenes ADR empfohlen; entsprechend der Aufgabenbegrenzung wurde es in diesem Block nicht angelegt.

## Manueller Safari-/iPhone-Smoke-Test

Der Test erfolgt über ein HTTPS-Testdeployment oder einen lokalen HTTP-Server, nicht über `file://`.

1. Persistierte Einstellungen zurücksetzen und Standardwerte prüfen.
2. Unternehmensnamen ändern und speichern.
3. Zwei Leistungsorte mit Mehrfachzuordnung anlegen und je Geschäftsbereich einen gültigen Standard-Leistungsort wählen.
4. Eine Kategorie, eine Leistung und ein Produkt anlegen; Favorit, Aktivstatus, Reihenfolge, Preis und Steuersatz ändern.
5. Eine Branchenvorlage importieren, einen importierten Eintrag manuell bearbeiten und offene Prüfungen bestätigen.
6. Einen eindeutig fiktiven Kunden mit Firma, Telefon, Mobilnummer, E-Mail, Anschrift und Notiz anlegen und anschließend bearbeiten.
7. Die eine Kundensuche nacheinander mit Name, Firma, Telefon, Mobil, E-Mail, Straße, PLZ und Ort prüfen.
8. Mit diesem Kunden einen normalen Beleg und einen Gutscheinverkauf abschließen und die jeweiligen Kundensnapshots öffnen.
9. Seite neu laden, Safari vollständig schließen und erneut öffnen.
10. Einstellungen, Katalogänderungen, Kundenstammdaten, Beleg, Gutschein, Verkaufsbeleg, QR-Referenz und Historie prüfen; die konkrete Hash-Route muss beim Reload erhalten bleiben.
11. Kundenadresse ändern und prüfen, dass zuvor erzeugte Beleg- und Gutscheinsnapshots unverändert bleiben.
12. Einen Beleg als offene Zahlung abschließen, neu laden, Zahlung vollständig erfassen und nach erneutem Reload Zahlungsart, Zeitpunkt und Aktivität prüfen.
13. Einen vollständigen Storno sowie eine Teil- und Restgutschrift an geeigneten Belegen erstellen; Ursprung, Folgedokumente und Navigation in beide Richtungen nach Reload prüfen.
14. Eine Teil-Einlösung, eine Voll-Einlösung und eine Einlösung mit Bar- beziehungsweise Kartenrestzahlung durchführen. Nach jedem Reload Restwert, Status, Historie, Belegreferenz und Zahlungsstatus prüfen.
15. Bei bereits geladener App das Netz deaktivieren und erneut Settings, Katalog, Kunden, Beleg und Gutschein speichern.
16. Den zweistufig eingeklappten Entwicklerbereich öffnen; jeden Einzelreset abbrechen und Voucher-Reset gezielt bestätigen. Nicht gewählte Stores müssen erhalten bleiben, der Nummernstand darf weder beim Receipt- noch beim Voucher-Reset sinken.
17. Grundadresse ohne Hash öffnen und „Start“ prüfen; anschließend eine konkrete gültige Hash-Route neu laden und den Routenerhalt prüfen.
18. Optional im privaten Modus prüfen, ob Speicherung funktioniert oder der Fallbackhinweis verständlich erscheint.

Der kalte Offline-Neustart der App-Shell wurde anschließend getrennt mit OFFLINE-001 umgesetzt. Der reale iPhone-Beta-Smoke-Test des Releases `0.9.1-26dc63f` bestätigt, dass die installierte Home-Screen-PWA im Flugmodus startet, bestehende IndexedDB-Daten verfügbar bleiben und ein vollständig offline erzeugter Beleg nach erneutem Online-Start weiterhin vorhanden ist. PDF-, QR- und Belegansicht waren erfolgreich; Backup und Wiederherstellung waren bereits im vorherigen realen Smoke-Test erfolgreich.
