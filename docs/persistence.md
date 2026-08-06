# Lokale Einstellungspersistenz

**Stand:** PERSIST-001a
**Geltungsbereich:** Ausschließlich vollständige FRECKA-Einstellungen
**Nicht enthalten:** Kataloge, Kunden, Belege, Gutscheine, Historien, Entwürfe, Stornos und Gutschriften

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

## Datenfluss ab PERSIST-001a

1. Die statische App-Shell zeigt einen kompakten Ladezustand.
2. `js/persistence.js` öffnet IndexedDB und liest den Settings-Datensatz.
3. Fehlt der Datensatz, bleiben die sicheren Demo-/Standardwerte aktiv.
4. Vorhandene Einstellungen werden versioniert normalisiert und in-place in die bestehenden zentralen Laufzeitobjekte übernommen.
5. Erst danach werden Belegzähler, aktiver Geschäftsbereich und UI-State abgeleitet und die Oberfläche gerendert.
6. Alle Einstellungsspeicherungen erzeugen eine enge Settings-Projektion der bestehenden Laufzeitquelle, normalisieren sie gegen die sicheren Startwerte und verwenden dieselbe serialisierte Schreibfunktion.
7. Eine Erfolgsmeldung erscheint erst nach erfolgreichem Transaktionsabschluss.

UI- und Renderfunktionen greifen niemals direkt auf `indexedDB` zu. Nur `js/persistence.js` kennt die Browser-Datenbank-API.

## Datenbankvertrag

- Datenbankname: `frecka`
- Datenbankschema-Version: `1`
- Object Store: `settings`
- Key Path: `tenantId`
- Standardschlüssel/Instanz: `local-default`
- Einstellungsformat-Version: `1`

Die Datenbankschema-Version und die Formatversion des Datensatzes werden unabhängig versioniert. Weitere Mandanten können später über zusätzliche stabile `tenantId`-Schlüssel ergänzt werden, ohne das Store-Modell umzubauen.

Der Datensatz enthält ausschließlich:

- `formatVersion`, `tenantId`, `updatedAt`;
- `company` einschließlich Anschrift und `useAsServiceLocation`;
- `serviceLocations` als Liste;
- `businessAreas` einschließlich Aktivstatus, Standardbereich und Standard-Leistungsort;
- `taxSettings`;
- `receiptSettings` einschließlich Nummernkreis und Belegtexten;
- `paymentChoices` in ihrer fachlichen Reihenfolge;
- `setup.status` mit `not-started`, `started` oder `completed`.

Simulierte Logoobjekte beziehungsweise Bilddaten werden nicht gespeichert. `logoMode` und die sichtbare Geschäftsbezeichnung bleiben normale Geschäftsbereichseinstellungen.

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
- Konsolenmeldungen enthalten nur Operation und Fehlercode, niemals Einstellungs- oder Geschäftsdaten.
- Unbekannte harmlose Felder bestehender Datensätze werden beim erneuten Schreiben soweit möglich erhalten.

## Automatisierter Browser-Smoke-Test

`tests/persistence-smoke.html` führt ohne zusätzliche Bibliothek native IndexedDB-Prüfungen aus. Die Seite muss über HTTP oder HTTPS geöffnet werden und startet automatisch. Jeder Lauf verwendet einen zufälligen Datenbanknamen mit dem Präfix `frecka-persist-smoke-`, zeigt jeden Fall als PASS oder FAIL und löscht anschließend ausschließlich diese Testdatenbank. Ein Guard schützt die Produktionsdatenbank `frecka`.

Geprüft werden Erststart, Roundtrip und Reload-äquivalentes Neulesen, Leistungsorte und n:m-Zuordnungen, Standardorte, Normalisierung defekter Referenzen und fehlender Felder, Forward-Kompatibilität unbekannter Felder, Ausschluss der Geschäftsdaten und Logo-Simulationen, Setupstatus, Schreibserialisierung und Wiederanlauf nach Fehler, nicht serialisierbare Werte, fehlendes IndexedDB sowie der tenantisolierte Reset.

## Reset

„Gespeicherte Einstellungen zurücksetzen“ löscht ausschließlich den Settings-Datensatz der aktuellen `tenantId`. Kunden, Belege, Gutscheine, Kataloge und deren Snapshots werden weder aus IndexedDB noch aus dem aktuellen Arbeitsspeicher gelöscht. Anschließend werden die unveränderten sicheren Start-Einstellungen in die zentrale Laufzeitquelle übernommen.

## ADR-Bedarf

Ein eigenes ADR für die verbindliche Wahl von IndexedDB ist fachlich erforderlich, da ADR-0001 diese konkrete Speicherentscheidung ausdrücklich ausklammert. Gemäß PERSIST-001a wird dieses ADR noch nicht ungefragt angelegt und bleibt ein offener Dokumentationspunkt.

## Manueller Safari-/iPhone-Smoke-Test

Der Test erfolgt über ein HTTPS-Testdeployment oder einen lokalen HTTP-Server, nicht über `file://`.

1. Persistierte Einstellungen zurücksetzen und Standardwerte prüfen.
2. Unternehmensnamen ändern und speichern.
3. Zwei Leistungsorte mit Mehrfachzuordnung anlegen.
4. Je Geschäftsbereich einen gültigen Standard-Leistungsort wählen.
5. Steuer-, Beleg- und Zahlungsarteneinstellungen ändern.
6. Einrichtungsassistent abschließen.
7. Seite neu laden, Safari vollständig schließen und erneut öffnen.
8. Alle Einstellungen, Zuordnungen und den abgeschlossenen Assistentenstatus prüfen.
9. Bei bereits geladener App das Netz deaktivieren und erneut Einstellungen speichern.
10. Reset zunächst abbrechen, dann bestätigen; Kunden, Belege, Gutscheine und Snapshots müssen im aktuellen Lauf unverändert bleiben.
11. Optional im privaten Modus prüfen, ob Speicherung funktioniert oder der Fallbackhinweis verständlich erscheint.

Ein kalter Offline-Neustart der App-Shell ist nicht Gegenstand von PERSIST-001a, weil der bestehende Prototyp ältere Service Worker und Caches weiterhin entfernt und ein Service-Worker-Großumbau ausdrücklich ausgeschlossen ist.
