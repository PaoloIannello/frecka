# PODOLOGY-003/004/005 – Behandlungsdokumentation und Kundenausgabe

Stand: 01.09.2026. PODOLOGY-003 ergänzt auf Basis von v0.11.6 die beleggebundene Behandlungsdokumentation. PODOLOGY-004 projiziert daraus genau den Kundenpflegehinweis und aus dem unveränderlichen Rezeptzuordnungs-Snapshot genau das Rezeptdatum in lokale Kundendokumente. Version 0.11.8 / PODOLOGY-005 poliert ausschließlich Vorlagenauswahl, Hilfetexte und Vorlagenkarten; Datenmodell und Ausgabevertrag bleiben unverändert.

## Geltungsbereich

Die vorhandene Capability `settings.businessAreas[].features.prescriptionDocumentation` schaltet weiterhin gemeinsam Rezept- und Behandlungsdokumentation je Geschäftsbereich frei. Es gibt keine automatische Aktivierung anhand von Branche oder Vorlage. Bei aktiver Capability, aktivem Kunden und aktivem Geschäftsbereich kann ein normaler Beleg optional enthalten:

- interne Behandlungsdokumentation, höchstens 4000 Zeichen;
- Kundenpflegehinweis, höchstens 300 Zeichen.

Beide Felder werden getrimmt und niemals still gekürzt. Bleiben beide leer, entsteht kein Behandlungsdatensatz. Die interne Behandlungsdokumentation bleibt immer intern. Der Kundenpflegehinweis darf seit PODOLOGY-004 ausschließlich im lokalen HTML-/PDF-Kundendokument des exakt referenzierten normalen Ursprungsbelegs erscheinen.

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
| `customerCareAdvice` | getrimmter Pflegehinweis für das lokale Kundendokument, höchstens 300 Zeichen |
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

Im Checkout stehen aktive Vorlagen des aktuellen Geschäftsbereichs in zwei getrennten nativen Auswahlfeldern für interne Dokumentation und Kundenpflegehinweis bereit. Ein Platzhalter bleibt auch bei genau einer Vorlage vorausgewählt; ohne passende aktive Vorlage entfällt das Auswahlfeld vollständig. Die Auswahl kopiert den Text in das frei bearbeitbare Feld. Eine unveränderte Vorlagenkopie darf durch eine andere Vorlage ersetzt werden. Wurde der Text manuell bearbeitet, verhindert die Oberfläche ein stilles Überschreiben und verlangt vor einem bewussten Wechsel das Leeren des Feldes. Die Vorlage bleibt unverändert; der gespeicherte Datensatz enthält nur den tatsächlich bestätigten Text.

Die Vorlagenverwaltung zeigt bei aktiver Capability keinen zusätzlichen Sperrhinweis. Bei deaktivierter Capability oder deaktiviertem Geschäftsbereich bleibt genau ein gemeinsamer Hinweis sichtbar: vorhandene Vorlagen bleiben erhalten, neue Vorlagen und deren Verwendung setzen die erneute Aktivierung voraus. Historische Inhalte bleiben lesbar.

## Kundenverlauf

Das Kundenprofil zeigt einen getrennten, read-only Bereich „Behandlungsverlauf (intern)“. Er wird chronologisch aus `treatmentRecords` gelesen und zeigt Zeitpunkt, Geschäftsbereich, Belegreferenz, beide Texte sowie optionale Rezept- und Benutzerreferenz. Historische Datensätze bleiben auch bei deaktiviertem Kunden, deaktiviertem Geschäftsbereich oder später ausgeschalteter Capability lesbar. Die Belegaktion öffnet ausschließlich den referenzierten gespeicherten Beleg.

## Migration, Backup und Restore

7→8 legt in derselben Versionchange-Transaktion leere Behandlungsaggregate für die aktuelle Instanz und vorhandene Settings-Mandanten an. Bestehende Settings-, Katalog-, Kunden-, Beleg-, Gutschein-, Rezept- und Lizenzruntime-Datensätze bleiben bytegleich. Neue Mandanten erhalten den leeren Behandlungsbestand atomar beim ersten Settingsschreiben. Kein medizinischer Inhalt wird hergeleitet oder migriert.

Snapshot, Integritätsdiagnose, verschlüsseltes Vollbackup und Restore umfassen ab Schema 8 dieselben sieben Fachstores. Unterstützte Schema-5/6/7-Backups ohne `treatmentRecords` erhalten nach vollständiger Prüfung einen leeren Bestand; in einem Schema-8-Backup ist der Store Pflicht. Restore ersetzt alle sieben Fachstores atomar, ohne Merge. Ein Fehler lässt den vorherigen Bestand vollständig unverändert.

## Datenschutz- und Ausgabegrenze

Behandlungsdatensätze, interne Dokumentation, Kundenpflegehinweise und Vorlagen werden ausschließlich in lokaler IndexedDB und im verschlüsselten Vollbackup dauerhaft gespeichert. PODOLOGY-004 erlaubt nur eine eng begrenzte Laufzeitprojektion: Das lokale Kundendokument eines normalen Belegs erhält den Pflegehinweis aus dem exakt über `receiptId` und `receiptNumber` zugeordneten historischen Behandlungsdatensatz. Die interne Dokumentation wird niemals projiziert. Storno, Gutschrift und Gutscheinverkaufsbeleg erhalten auch lokal weder Rezeptdatum noch Pflegehinweis.

Nicht ausgegeben werden medizinische Inhalte weiterhin in:

- „Eigene Daten“ und Kunden-CSV;
- Steuerberater-CSV, ZIP und Steuerberater-Beleg-PDFs;
- QR, Public-Payload und zustandslosem Public Viewer;
- Integritätsdiagnosen, technischen Logs und Fehlermeldungen.

Die zentrale Dokumentenengine erzwingt dafür die Modi `customer`, `tax-advisor` und `restricted`. Ohne ausdrücklichen Kundenmodus bleibt die Projektion restriktiv. Das Rezeptdatum stammt ausschließlich aus dem unveränderlichen `prescriptionAssignment`-Snapshot des Belegs; aktuelle Rezeptstammdaten oder heutige Vorlagen werden für historische Dokumente nicht erneut gelesen.

Es gibt keinen Serverupload und keine zusätzliche lokale Verschlüsselung der IndexedDB. Der vorhandene Geräteschutz bleibt die Schutzgrenze. PODOLOGY-003 führt keine Diagnose-, Therapie-, Abrechnungs- oder Medizinexportlogik ein.

## Prüfungen und offene Grenze

Automatisierte Browserfälle decken Schema 7→8, unveränderte Altstores, atomaren Abschluss mit und ohne Rezept, Gutscheinzahlung, Fehler/Rollback, Idempotenz, Vorlagen, Kundenverlauf, Backup/Restore und die Ausgabeisolation ab. Die PODOLOGY-005-Matrix umfasst keinen, einen und mehrere Treffer, getrennte Zwecke, archivierte und bereichsfremde Vorlagen sowie den nicht destruktiven Wechsel nach manueller Bearbeitung. Die echte App-Oberfläche wird in isolierten Testdatenbanken bei 320, 360, 390 und 411 Pixeln sowie in einer größeren Ansicht geprüft; die produktive Datenbank und reale Geschäftsdaten werden nicht verwendet.

Lokales Ergebnis am 01.09.2026: **251/251 Browserprüfungen bestanden**, Testdatenbank-Cleanup bestanden und keine Konsolen-, Ressourcen- oder Laufzeitfehler. Die eingebettete echte App-Oberfläche und die Kundendokumente blieben bei 320, 360, 390 und 411 Pixeln sowie in der 768-Pixel-Prüfung ohne horizontalen Überlauf. Zusätzlich geprüft sind die echten HTML-/PDF-Ausgaben mit und ohne Rezept/Pflegehinweis, exakt 300 Zeichen, lange Einzelwörter und URLs, mehrseitige 80-mm-PDFs, Korrekturbelege, Public-Viewer-Whitelist, Steuerberater-ZIP, Backup/Restore und unveränderliche historische Snapshots.

Vor einer Beta-Veröffentlichung bleiben Versions-/Cachevorbereitung sowie ein realer iPhone-/Android-In-place-Test mit vorheriger verschlüsselter Sicherung erforderlich. Auf beiden Geräteklassen müssen Belegansicht, PDF, Teilen/Speichern, lange Pflegehinweise und die fortbestehende Public-/Steuerberater-Isolation real bestätigt werden.
