# PODOLOGY-001/002 – Rezeptverwaltung und Belegzuordnung

Stand: 01.09.2026. PODOLOGY-002 ergänzt auf Schema 7 die optionale Rezeptzuordnung und ausschließlich aus Belegen abgeleitete Verbrauchslogik. Dieser Entwicklungsblock ist noch kein Release.

## Umfang und Capability

`settings.businessAreas[].features.prescriptionDocumentation` ist ein optionales Boolean, standardmäßig `false`. Bestehende Settingsnormalisierung ergänzt das fehlende Feld verlustfrei und idempotent. Neue Geschäftsbereiche starten ausgeschaltet. Weder Branchenname noch Vorlagenimport aktivieren die Funktion. Die bestehende Geschäftsbereichsseite enthält genau eine Checkbox „Rezept- & Behandlungsdokumentation verwenden“. In diesem Block wird nur die Rezeptverwaltung freigeschaltet.

## Modell und Persistenz

IndexedDB-Schema 7 ergänzt genau einen Fachstore `prescriptions`, Key Path `tenantId`. Der Datensatz besitzt `formatVersion: 1`, `tenantId`, `updatedAt` und ein `prescriptions`-Array. Die vorhandene Architektur mandantenbezogener Aggregate bleibt erhalten; `PROTOTYPE_DATA.prescriptions` ist die einzige fachliche Laufzeitquelle.

Ein Rezept enthält:

| Feld | Vertrag |
| --- | --- |
| `id`, `tenantId` | Stabile interne ID und genau ein Mandant |
| `customerId`, `businessAreaId` | Kunde und Geschäftsbereich müssen existieren |
| `prescribedOn` | Echtes Kalenderdatum `YYYY-MM-DD`, keine Zeitzone |
| `treatmentText` | Pflicht-Freitext, UI trimmt, höchstens 200 Zeichen |
| `catalogItemId` | Optionale Referenz auf eine Leistung desselben Bereichs |
| `prescribedUnits` | Ganze positive sichere Zahl, mindestens 1 |
| `internalNote` | Optional, höchstens 2000 Zeichen, ausschließlich interne Rezeptnotiz |
| `active` | Archivierung mit `false`, kein Harddelete |
| `createdAt`, `updatedAt` | ISO-Zeitpunkte; Erstellung bleibt bei Bearbeitung unverändert |
| `formatVersion` | `1` |

Es gibt keine Rezeptkopie im Kundenobjekt, keine persistierte Verbrauchszahl und kein Nutzungsjournal. Auswahl aus dem Katalog übernimmt einen separat gespeicherten Text. Spätere Katalogänderung, Deaktivierung oder fehlende historische Leistung verändern diesen Text nicht. Neue Referenzen müssen auf eine aktive Leistung zeigen; Produkte sind ausgeschlossen.

`savePrescription` prüft Bestand, Mandant, Referenzen, Capability und vorhandene Belegzuordnungen in einer Readwrite-Transaktion gemeinsam mit Settings/Kunden/Katalog/Belegen, schreibt aber ausschließlich den Rezeptstore. Die UI übernimmt erst nach `oncomplete` das Ergebnis. ID-Duplikate und veraltete Bearbeitungen werden mit `expectedUpdatedAt` abgewiesen; Fehler behalten den Entwurf. Sobald ein Rezept historisch mindestens einmal verwendet wurde, sind Kunden-/Bereichszuordnung, Rezeptdatum, Behandlung, Katalogreferenz, verordnete Anzahl und interne Notiz unveränderlich. Archivieren und Reaktivieren bleiben möglich. Kein automatischer Reparatur-, Lösch- oder Deduplizierungspfad.

## Zuordnung und abgeleiteter Verbrauch

Ein normaler Beleg kann beim Abschluss optional genau einem aktiven Rezept des ausgewählten aktiven Kunden und des aktiven Geschäftsbereichs zugeordnet werden. Die Capability muss dort eingeschaltet sein. Es gibt keine automatische Vorauswahl. Gutscheinverkaufsbelege, Stornos und Gutschriften können keine eigene Rezeptnutzung erzeugen; ein normaler Beleg mit Gutscheinzahlung verwendet denselben Abschlusswriter wie andere Zahlungsarten.

Der Ursprungsbeleg speichert genau einen unveränderlichen `prescriptionAssignment`-Snapshot mit Formatversion 1, Rezept-ID, `units: 1`, Rezeptdatum, Behandlungstext, verordneter Anzahl, Kunden- und Geschäftsbereichs-ID, optionaler Katalogleistungs-ID sowie der Information, ob eine Überziehung bestätigt wurde. Interne Notiz, laufender Verbrauch, Restwert und UI-Bestätigungen gehören nicht in den Snapshot.

Verbrauch wird bei jedem Lesen ausschließlich aus vollständig abgeschlossenen Ursprungsbelegen mit gültiger Zuordnung abgeleitet. Jeder stabile Ursprungsbeleg zählt höchstens einmal. Ein eindeutig referenzierter vollständiger Storno über den gesamten Ursprungsbetrag neutralisiert genau diese eine Nutzung. Teil- und Gesamtgutschriften verändern den Verbrauch nicht. Die Anzeige unterscheidet `Offen`, `Ausgeschöpft`, `Überzogen` und `Archiviert`; der reale Verbrauch wird bei einer bestätigten Überziehung nicht auf die verordnete Anzahl gekappt, die sichtbare Verfügbarkeit jedoch nie negativ dargestellt.

Vor dem Abschluss prüft ein Readonly-Preflight den aktuellen Stand. Die UI zeigt Plausibilitätswarnungen, wenn weder die stabile Katalogleistung noch der Behandlungstext zu einer positiven Leistungsposition passt. Das ist bewusst nur eine Warnung. Bei ausgeschöpften Rezepten ist ebenfalls eine ausdrückliche Bestätigung nötig. Der eigentliche Receipt-Writer liest Settings, Kunden, Rezepte und Belege danach innerhalb derselben Readwrite-Transaktion erneut. Hat sich der relevante Stand verändert, wird ohne Beleg, Nummernfortschreibung oder Rezeptverbrauch abgebrochen und eine neue Bestätigung verlangt. Dialoge und Nutzerinteraktion finden niemals innerhalb der IndexedDB-Transaktion statt.

## Migration und Integrität

6→7 legt in einer Versionchange-Transaktion leere Rezeptdatensätze für vorhandene Settings-Mandanten und die aktuelle Instanz an. Bisherige Store-Datensätze einschließlich Lizenzruntime bleiben unverändert. Neue Mandanten in einer bereits geöffneten Schema-7-Datenbank erhalten den leeren Rezeptbestand atomar beim ersten Settingsschreiben. Bestehende Settings-Kompatibilität ergänzt die fehlende Capability anschließend mit `false`.

Validiert werden Struktur/Format, Mandant, eindeutige IDs, Pflichttexte, Kalenderdatum, Einheiten, Zeitpunkte, Kunden-/Bereichsreferenzen und alle vorhandenen Belegzuordnungen. Alte Belege ohne `prescriptionAssignment` bleiben unverändert gültig; Datenbankschema und bestehende Storeformate steigen nicht. Deaktivierte Referenzen bleiben historisch gültig; sie erlauben keine neuen Eingaben. Unbekannte zukünftige Rezept- oder Zuordnungsfelder/Formate werden abgewiesen, nicht entfernt. Fehlende/beschädigte Rezeptbestände oder widersprüchliche Zuordnungen bleiben sichtbar fehlerhaft und sperren Vollbackup/Restore; sie werden nicht durch einen leeren UI-Fallback ersetzt.

## Kundenoberfläche

Vorhandenes Kundenprofil → Rezepte → Anlegen/Detail/Bearbeiten/Archivieren. Keine neue Hauptnavigation. Sichtbar bei mindestens einer aktivierten Capability oder vorhandenen Rezepten, auch nach späterer Deaktivierung. Aktive Kunden können in aktivierten Bereichen mehrere Rezepte anlegen. Deaktivierte Kunden/Bereiche und ausgeschaltete Capabilities lassen vorhandene Rezepte nur lesbar. Archivierte Rezepte bleiben sichtbar und können bei aktivierter Funktion reaktiviert werden.

Liste und Detailansicht zeigen abgeleitet genutzte und verfügbare Einheiten sowie den fachlichen Status. Verwendete Rezepte besitzen keine Bearbeitungsaktion mehr; die Archivaktion bleibt getrennt erreichbar. Im Checkout erscheint die optionale Auswahl nur bei aktivierter Capability und aktivem Kunden. Kunden-, Bereichs-, Capability- oder Archivänderungen entfernen eine nicht mehr zulässige Auswahl. Duplizierte Belege übernehmen niemals die historische Rezeptzuordnung.

## Snapshot, Backup, Restore und Datenschutz

Seit PODOLOGY-003 lesen alle zentralen Geschäftssnapshot-Pfade dieselben sieben Fachstores einschließlich `treatmentRecords`: Backup-/Export-Snapshot, Diagnose, Restore und Kandidat der historischen Vierer-Reparatur. Letztere schreibt weiterhin nur freigegebene historische Receipts. `licenseRuntime` bleibt ausgeschlossen.

Das verschlüsselte Vollbackup enthält Rezepte einschließlich Archiv und interner Notiz sowie die Rezeptzuordnungs-Snapshots innerhalb der ohnehin enthaltenen Belege. Es gibt keine zweite Sammlung. Die Kryptographie und der bestehende Ausgabeablauf bleiben unverändert. Unterstützte ältere Schema-5/6-Backups ohne Rezeptstore erhalten einen leeren Bestand; bei Schema 7 und 8 ist der Rezeptstore Pflicht. Restore ersetzt ab Schema 8 atomar alle sieben Fachstores, kein Merge. Vorhandene Rezepte gehen bei einem bewussten Vollrestore eines älteren Backups entsprechend dem gesicherten damaligen Stand nicht mit über.

Regulärer Kunden-/Eigene-Daten-Export, Steuerberater-CSV/ZIP, Beleg/PDF, QR und Public Viewer erhalten weder Rezeptstammdaten noch den Zuordnungs-Snapshot. Diagnose, Logs und technische Fehlermeldungen enthalten keine Behandlungstexte, Rezeptnotizen oder medizinischen Zuordnungen. Die lokale IndexedDB ist kein zusätzlich verschlüsseltes medizinisches Archiv; die bestehende Geräteschutzgrenze bleibt bestehen. Es gibt keinen Upload und keinen medizinischen Export.

## Entwicklerresets

Kunden- und Settingsreset prüfen den Rezeptstore in derselben Transaktion und brechen ab, sobald irgendein Rezept existiert – auch archiviert. Keine kaskadierende Löschung, keine verwaisten Rezepte. Katalogreset darf historische optionale Referenzen fehlen lassen; der gespeicherte Text bleibt erhalten. Andere fachliche Resetverträge bleiben unverändert.

## Prüfungen und nächste Gates

Automatisierte Browserfälle stehen in `tests/persistence-smoke.js`; die echte App-UI wird über `tests/app-frame.html` in einer isolierten Testdatenbank geladen, ohne produktive Datenbank oder Service Worker. Zusätzlich abgedeckt sind Auswahl, passender und abweichender Behandlungstext, Ausschöpfung/Überziehung, Bestätigung, idempotente Wiederholung, Vollstorno, Gutschrift, Schreibabbruch, konkurrierende Clients, Schreibschutz verwendeter Rezepte, Backup-/Restore-Rundlauf, Datenschutz und Checkout bei 320, 390 und 411 px. Die vorhandenen Kundendaten-, Beleg-, Gutschein-, Lizenz-, Backup-, Export-, PDF-/QR- und Androidregressionen laufen mit.

Der PODOLOGY-002-Vertrag bleibt durch PODOLOGY-003 unverändert. Die aktuelle Regression ist in [Behandlungsdokumentation](treatment-documentation.md) festgehalten.

Vor Beta-Veröffentlichung: gesonderte Versions-/Cachevorbereitung und echter iPhone-/Android-In-place-Test mit vorheriger verschlüsselter Sicherung. Ein Downgrade auf einen Schema-7-Client ist nach dem Öffnen von Schema 8 kein unterstützter Rückweg. Noch keine Geräte- oder Produktivfreigabe aus den lokalen Tests ableiten.

PODOLOGY-003 ergänzt `treatmentRecords`, Kundenpflegehinweise und Vorlagen, ohne den Rezeptverbrauch zu verändern. Medizinische Exporte sowie Rezept- oder Behandlungsdaten in PDF, Bon, QR oder Public Viewer bleiben ausgeschlossen.
