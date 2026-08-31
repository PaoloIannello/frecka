# PODOLOGY-001 – Rezeptverwaltung

Stand: 31.08.2026. Ausgangspunkt `main`, `ee13b12ed7cd4763d23d6f4979b83cd5a75ebbef`, Tag `v0.11.6`, Version 0.11.6 / ANDROID-002; Arbeitsbaum vor Beginn sauber und origin/main identisch. Dieser Entwicklungsblock ist noch kein Release.

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

Es gibt keine Rezeptkopie im Kundenobjekt, keine Verbrauchszahl und keinen Belegbezug. Auswahl aus dem Katalog übernimmt einen separat gespeicherten, bearbeitbaren Text. Spätere Katalogänderung, Deaktivierung oder fehlende historische Leistung verändern diesen Text nicht. Neue Referenzen müssen auf eine aktive Leistung zeigen; Produkte sind ausgeschlossen.

`savePrescription` prüft Bestand, Mandant, Referenzen und Capability in einer Readwrite-Transaktion gemeinsam mit Settings/Kunden/Katalog, schreibt aber ausschließlich den Rezeptstore. Die UI übernimmt erst nach `oncomplete` das Ergebnis. ID-Duplikate und veraltete Bearbeitungen werden mit `expectedUpdatedAt` abgewiesen; Fehler behalten den Entwurf. Kein automatischer Reparatur-, Lösch- oder Deduplizierungspfad.

## Migration und Integrität

6→7 legt in einer Versionchange-Transaktion leere Rezeptdatensätze für vorhandene Settings-Mandanten und die aktuelle Instanz an. Bisherige Store-Datensätze einschließlich Lizenzruntime bleiben unverändert. Neue Mandanten in einer bereits geöffneten Schema-7-Datenbank erhalten den leeren Rezeptbestand atomar beim ersten Settingsschreiben. Bestehende Settings-Kompatibilität ergänzt die fehlende Capability anschließend mit `false`.

Validiert werden Struktur/Format, Mandant, eindeutige IDs, Pflichttexte, Kalenderdatum, Einheiten, Zeitpunkte und Kunden-/Bereichsreferenzen. Deaktivierte Referenzen bleiben historisch gültig; sie erlauben keine neuen Eingaben. Unbekannte zukünftige Rezeptfelder/Formate werden abgewiesen, nicht entfernt. Fehlende/beschädigte Rezeptbestände bleiben sichtbar fehlerhaft und sperren Rezeptänderungen sowie Vollbackup/Restore; sie werden nicht durch einen leeren UI-Fallback ersetzt. Normale Beleglogik wurde nicht verändert.

## Kundenoberfläche

Vorhandenes Kundenprofil → Rezepte → Anlegen/Detail/Bearbeiten/Archivieren. Keine neue Hauptnavigation. Sichtbar bei mindestens einer aktivierten Capability oder vorhandenen Rezepten, auch nach späterer Deaktivierung. Aktive Kunden können in aktivierten Bereichen mehrere Rezepte anlegen. Deaktivierte Kunden/Bereiche und ausgeschaltete Capabilities lassen vorhandene Rezepte nur lesbar. Archivierte Rezepte bleiben sichtbar und können bei aktivierter Funktion reaktiviert werden.

Die Detailansicht zeigt verordnete Anzahl, nicht verbrauchte/restliche Einheiten. Eine Bearbeitung ist heute zulässig, weil PODOLOGY-001 keine Nutzungen erzeugt. PODOLOGY-002 muss vor Einführung von Nutzungen den zentralen Schreibschutz für tatsächlich benutzte Rezepte ergänzen. Es gibt absichtlich noch keine erfundene Nutzungs- oder Versionierungsengine.

## Snapshot, Backup, Restore und Datenschutz

Alle zentralen Geschäftssnapshot-Pfade lesen jetzt dieselben sechs Fachstores: Backup-/Export-Snapshot, Diagnose, Restore und Kandidat der historischen Vierer-Reparatur. Letztere schreibt weiterhin nur freigegebene historische Receipts. `licenseRuntime` bleibt ausgeschlossen.

Das verschlüsselte Vollbackup enthält Rezepte einschließlich Archiv und interner Notiz. Die Kryptographie und der bestehende Ausgabeablauf bleiben unverändert. Unterstützte ältere Schema-5/6-Backups ohne Rezeptstore erhalten einen leeren Bestand; bei Schema 7 ist der Store Pflicht. Restore ersetzt atomar alle sechs Fachstores, kein Merge. Vorhandene Rezepte gehen bei einem bewussten Vollrestore eines älteren Backups entsprechend dem gesicherten damaligen Stand nicht mit über.

Regulärer Kunden-/Eigene-Daten-Export, Steuerberater-CSV/ZIP, Beleg/PDF und Public-QR erhalten keine Rezeptdaten. Diagnose und technische Fehlermeldungen enthalten keine Behandlungstexte oder Rezeptnotizen. Die lokale IndexedDB ist kein zusätzlich verschlüsseltes medizinisches Archiv; die bestehende Geräteschutzgrenze bleibt bestehen. Es gibt keinen Upload und keinen medizinischen Export.

## Entwicklerresets

Kunden- und Settingsreset prüfen den Rezeptstore in derselben Transaktion und brechen ab, sobald irgendein Rezept existiert – auch archiviert. Keine kaskadierende Löschung, keine verwaisten Rezepte. Katalogreset darf historische optionale Referenzen fehlen lassen; der gespeicherte Text bleibt erhalten. Andere fachliche Resetverträge bleiben unverändert.

## Prüfungen und nächste Gates

Automatisierte Browserfälle stehen in `tests/persistence-smoke.js`; die echte App-UI wird über `tests/app-frame.html` in einer isolierten Testdatenbank geladen, ohne produktive Datenbank oder Service Worker. Abgedeckt sind Capability, Schema-Upgrade, CRUD/Reload/Archiv, Eingabefehler, Konflikte, Referenzen, Deaktivierung, Backup/Restore/Abbruch, Datenschutz, Reset und beschädigte Bestände. Mobile Layouts: 320, 390 und 411 px. Die vorhandenen Kundendaten-, Beleg-, Gutschein-, Lizenz-, Backup-, Export-, PDF-/QR- und Androidregressionen laufen mit.

Lokales Ergebnis am 31.08.2026: **222/222 Browserprüfungen bestanden**, Testdatenbank-Cleanup bestanden, keine Konsolenfehler im abschließenden Lauf. Public-Viewer-Boot: bestanden, `IndexedDB.open = 0`, Blob-PDF bereit. Service-Worker-/Offline-Fallback, PWA-Update, Sharing (17 Fälle), QR-Messung (6 Profile), Deployment-Smoke und Release-Automation-Smoke bestanden; JavaScript-Syntax und `git diff --check` fehlerfrei. Deployment-/Release-Smokes verwenden ausschließlich temporäre Testfixtures und keinen Netzwerktransfer.

Vor Beta-Veröffentlichung: gesonderte Versions-/Cachevorbereitung und echter iPhone-/Android-In-place-Test mit vorheriger verschlüsselter Sicherung. Ein Downgrade auf einen Schema-6-Client ist kein unterstützter Rückweg nach Schema 7. Noch keine Geräte- oder Produktivfreigabe aus den lokalen Tests ableiten.

PODOLOGY-002 ist separat zu entscheiden/implementieren: Rezeptzuordnung zum Beleg, atomare Nutzung, Schutz benutzter Rezepte und Storno-Freigabe. `treatmentRecords` folgen erst in PODOLOGY-003. Nicht Bestandteil von PODOLOGY-001: Pflegehinweise, Vorlagen, medizinische Exporte sowie Rezeptausgabe in PDF/Bon/QR.
