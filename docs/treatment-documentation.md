# PODOLOGY-003 – Interne Behandlungsdokumentation

Stand: 01.09.2026. PODOLOGY-003 ergänzt auf Basis von v0.11.6 ausschließlich die interne, beleggebundene Behandlungsdokumentation. Dieser Entwicklungsblock ist noch kein Release.

## Geltungsbereich

Die vorhandene Capability `settings.businessAreas[].features.prescriptionDocumentation` schaltet weiterhin gemeinsam Rezept- und Behandlungsdokumentation je Geschäftsbereich frei. Es gibt keine automatische Aktivierung anhand von Branche oder Vorlage. Bei aktiver Capability, aktivem Kunden und aktivem Geschäftsbereich kann ein normaler Beleg optional enthalten:

- interne Behandlungsdokumentation, höchstens 4000 Zeichen;
- Kundenpflegehinweis, höchstens 300 Zeichen.

Beide Felder werden getrimmt und niemals still gekürzt. Bleiben beide leer, entsteht kein Behandlungsdatensatz. Der Kundenpflegehinweis wird in diesem Block ausschließlich intern gespeichert; eine Ausgabe auf Beleg, PDF oder anderem Kundendokument folgt frühestens in PODOLOGY-004.

## Datenmodell und Referenzen

IndexedDB-Schema 8 ergänzt genau einen mandantenbezogenen Store `treatmentRecords` mit Key Path `tenantId`. Der Aggregatdatensatz besitzt `formatVersion: 1`, `tenantId`, `updatedAt` und ein `treatmentRecords`-Array. Es gibt keine Kopie im Kunden-, Beleg- oder Rezeptobjekt.

Jeder unveränderliche Behandlungsdatensatz enthält:

| Feld | Vertrag |
| --- | --- |
| `formatVersion` | `1` |
| `id`, `tenantId` | stabile interne ID und genau ein Mandant |
| `customerId`, `businessAreaId` | stabile Referenzen auf Kunde und Geschäftsbereich |
| `receiptId`, `receiptNumber` | genau ein erfolgreich abgeschlossener normaler Ursprungsbeleg |
| `prescriptionId` | optionale Referenz auf das beim Abschluss zugeordnete Rezept |
| `userId` | der beim Abschluss aktive Benutzer |
| `performedAt`, `createdAt`, `updatedAt` | gültige ISO-Zeitpunkte; im read-only V1-Datensatz identisch und unveränderlich |
| `internalDocumentation` | getrimmter interner Text, höchstens 4000 Zeichen |
| `customerCareAdvice` | getrimmter interner Pflegehinweis, höchstens 300 Zeichen |
| `customerSnapshot` | unveränderliche Kundenanzeige zum Abschlusszeitpunkt |
| `businessAreaSnapshot` | unveränderliche Bereichsanzeige zum Abschlusszeitpunkt |
| `userSnapshot` | unveränderliche Benutzeranzeige zum Abschlusszeitpunkt |
| `prescriptionSnapshot` | optionaler unveränderlicher Rezeptbezug ohne interne Rezeptnotiz |

Pro Beleg ist höchstens ein Datensatz zulässig. Referenz-, Format-, Längen- und Eindeutigkeitsfehler werden abgewiesen; unbekannte Inhalte werden weder entfernt noch repariert.

## Atomarer Abschluss

Der vorhandene Receipt-Writer liest Settings, Kunden, Rezepte, Belege und Behandlungsdokumentation innerhalb derselben Readwrite-Transaktion. Nummernstand, normaler Beleg, optionale Rezeptzuordnung und optionaler Behandlungsdatensatz werden gemeinsam bestätigt oder vollständig verworfen. Dasselbe gilt für einen normalen Beleg mit Gutscheinzahlung. Ein Gutscheinverkaufsbeleg, Storno oder eine Gutschrift erzeugt keinen eigenen Behandlungsdatensatz.

Fehler behalten den Texteingabezustand im Checkout. Erst ein erfolgreich bestätigter Beleg leert beide Felder. Kundenwechsel, Geschäftsbereichswechsel, Belegkopie, verworfener Entwurf oder neuer Beleg setzen die Eingaben bewusst zurück. Wiederholung desselben Abschlusses erzeugt weder einen zweiten Beleg noch einen zweiten Behandlungsdatensatz.

## Vorlagen

Vorlagen liegen ausschließlich in `settings.treatmentTemplates`. Sie besitzen stabile ID, Mandant, Geschäftsbereich, Zweck (`internal-documentation` oder `customer-care`), Titel, Text, Aktivstatus und Zeitpunkte. Anlegen, Bearbeiten, Archivieren und Reaktivieren verwenden den bestehenden zentralen Settingswriter. Es gibt kein Harddelete und kein separates Vorlagenmodell.

Im Checkout kopiert eine aktive Vorlage ihren Text in das bearbeitbare Feld. Die Vorlage bleibt unverändert; der gespeicherte Datensatz enthält nur den tatsächlich bestätigten Text. Deaktivierte Capability oder deaktivierter Geschäftsbereich verhindern neue Vorlagen und neue Datensätze, nicht aber das Lesen historischer Inhalte.

## Kundenverlauf

Das Kundenprofil zeigt einen getrennten, read-only Bereich „Behandlungsverlauf (intern)“. Er wird chronologisch aus `treatmentRecords` gelesen und zeigt Zeitpunkt, Geschäftsbereich, Belegreferenz, beide Texte sowie optionale Rezept- und Benutzerreferenz. Historische Datensätze bleiben auch bei deaktiviertem Kunden, deaktiviertem Geschäftsbereich oder später ausgeschalteter Capability lesbar. Die Belegaktion öffnet ausschließlich den referenzierten gespeicherten Beleg.

## Migration, Backup und Restore

7→8 legt in derselben Versionchange-Transaktion leere Behandlungsaggregate für die aktuelle Instanz und vorhandene Settings-Mandanten an. Bestehende Settings-, Katalog-, Kunden-, Beleg-, Gutschein-, Rezept- und Lizenzruntime-Datensätze bleiben bytegleich. Neue Mandanten erhalten den leeren Behandlungsbestand atomar beim ersten Settingsschreiben. Kein medizinischer Inhalt wird hergeleitet oder migriert.

Snapshot, Integritätsdiagnose, verschlüsseltes Vollbackup und Restore umfassen ab Schema 8 dieselben sieben Fachstores. Unterstützte Schema-5/6/7-Backups ohne `treatmentRecords` erhalten nach vollständiger Prüfung einen leeren Bestand; in einem Schema-8-Backup ist der Store Pflicht. Restore ersetzt alle sieben Fachstores atomar, ohne Merge. Ein Fehler lässt den vorherigen Bestand vollständig unverändert.

## Datenschutz- und Ausgabegrenze

Behandlungsdatensätze, interne Dokumentation, Kundenpflegehinweise und Vorlagen sind ausschließlich in lokaler IndexedDB und im verschlüsselten Vollbackup enthalten. Sie werden nicht in folgende Ausgaben projiziert:

- „Eigene Daten“ und Kunden-CSV;
- Steuerberater-CSV, ZIP und Beleg-PDFs;
- Beleg- und Gutscheindokumentmodelle;
- QR, Public Viewer und Share-Payloads;
- Integritätsdiagnosen, technische Logs und Fehlermeldungen.

Es gibt keinen Serverupload und keine zusätzliche lokale Verschlüsselung der IndexedDB. Der vorhandene Geräteschutz bleibt die Schutzgrenze. PODOLOGY-003 führt keine Diagnose-, Therapie-, Abrechnungs- oder Medizinexportlogik ein.

## Prüfungen und offene Grenze

Automatisierte Browserfälle decken Schema 7→8, unveränderte Altstores, atomaren Abschluss mit und ohne Rezept, Gutscheinzahlung, Fehler/Rollback, Idempotenz, Vorlagen, Kundenverlauf, Backup/Restore und die Ausgabeisolation ab. Die echte App-Oberfläche wird in isolierten Testdatenbanken bei 320, 390 und 411 Pixeln geprüft; die produktive Datenbank und reale Geschäftsdaten werden nicht verwendet.

Lokales Ergebnis am 01.09.2026: **244/244 Browserprüfungen bestanden**, Testdatenbank-Cleanup bestanden und keine Konsolen-, Ressourcen- oder Laufzeitfehler. Die eingebettete echte App-Oberfläche blieb bei 320, 390 und 411 Pixeln ohne horizontalen Überlauf. JavaScript- und Shell-Syntax, Manifest, Vendor-Prüfsummen, PWA-Update, Service Worker/Offline-Fallback, Sharing (17 Fälle), QR-Messung (6 Profile), Dokument/PDF, Deployment-Smoke, Release-Automation-Smoke und `git diff --check` bestanden. Deployment- und Release-Smokes verwendeten ausschließlich temporäre lokale Fixtures ohne Netzwerktransfer.

Vor einer Beta-Veröffentlichung bleiben Versions-/Cachevorbereitung sowie ein realer iPhone-/Android-In-place-Test mit vorheriger verschlüsselter Sicherung erforderlich. PODOLOGY-004 muss fachlich entscheiden und gesondert umsetzen, ob und wie ein Kundenpflegehinweis auf einem Kundendokument ausgegeben wird. PODOLOGY-003 nimmt diese Entscheidung nicht vor.
