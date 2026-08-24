# FRECKA – Produktiver Erststart und Beta-Übergabe

Stand: 15. August 2026  
Block: BETA-HANDOFF-001  
Geltungsbereich: zukünftige, vollständig neue Mandanten; vorhandene Beta-/iPhone-Daten bleiben unverändert

## Ergebnis des Erststart-Audits

Der frühere Laufzeit-Ausgangsbestand enthielt fachlich wirkende Demo-Daten: zwei Geschäftsbereiche, einen umfangreichen Katalog, vier Kunden, Belege einschließlich offener Zahlung und Korrekturen, vier Gutscheine sowie einen bereits fortgeschrittenen Belegnummernstand. Bei leerer IndexedDB waren diese Objekte in der App aktiv und hätten beim ersten produktiven Schreibvorgang zusammen mit echten Daten persistiert werden können. Das war für einen neuen produktiven Mandanten nicht zulässig.

Der aktive Erststartbestand ist deshalb neutral. Die vier für PERSISTENCE-010 zwingend benötigten historischen Gutscheinverkaufsbelege und Gutscheine bleiben als ausdrücklich benannte, inaktive Reparaturquelle erhalten. Sie werden ausschließlich nach bewusster Integritätsdiagnose, exakter Vierer-Allowlist und separater Bestätigung verwendet. Sie gehören nicht zu `receipts`, `vouchers`, Backup-, Export- oder normalen Erststartprojektionen.

Es findet keine automatische Löschung, Migration, Reparatur oder Rücksetzung vorhandener Mandanten statt. Persistierte Settings-, Katalog-, Kunden-, Beleg- und Gutscheinstores haben beim Laden weiterhin Vorrang vor den Erststartdefaults.

## Exaktes Inventar eines frischen Mandanten

| Bereich | Klassifikation | Ausgangsbestand |
| --- | --- | --- |
| Mandant | technischer Default | `local-default` |
| Benutzer | technischer Default | genau ein aktiver lokaler Benutzer `user-primary`, Anzeigename `Benutzer/in`; später bearbeitbar |
| Lizenz/Gerät | technischer Default | genau ein lokales, datenschutzfreundlich erzeugtes Lizenz-/Gerätemodell im Settings-Datensatz; keine Onlineaktivierung |
| Unternehmen | produktiv leer | keine Geschäftsbezeichnung, Unternehmerangabe, Kontakt-, Adress-, Steuer- oder Logodaten; Land `Deutschland` |
| Geschäftsbereiche | technischer Default | genau ein neutraler Bereich `general` mit Bezeichnung `Geschäftsbereich` |
| Leistungsorte | technischer Default | genau ein neutraler, dem Bereich zugeordneter Ort `location-default`; Adresse wird erst über die Unternehmensdaten befüllt |
| Kategorien | produktiv leer | 0 |
| Leistungen/Produkte | produktiv leer | 0 |
| Branchenvorlagen | Onboarding-Beispiele | vorhanden, aber nur nach ausdrücklicher Auswahl importierbar; keine automatische Preis- oder Steuerbestätigung |
| Kunden | produktiv leer | 0 |
| Belege/offene Zahlungen | produktiv leer | 0 |
| Stornos/Gutschriften | produktiv leer | 0 |
| Belegaktivitäten/Testumsatz | produktiv leer | 0 |
| Gutscheine/Verkäufe/Einlösungen/Historie | produktiv leer | 0 |
| Zahlungsarten | technische Produktauswahl | aktiv: Bar, EC, Gutschein; deaktiviert: Visa, Mastercard, PayPal, Überweisung; vor Nutzung im Assistenten prüfbar |
| Kundenzuordnung | reine UI-Auswahl | ohne Kunde, bestehenden Kunden wählen oder neuen Kunden anlegen; keine Kundendatensätze |
| Steuer | entscheidungsoffen | Status `Noch nicht sicher`; 19 % als technische Vorauswahl, 7 % verfügbar, aber keine fachliche Steuerentscheidung |
| Sprache/Währung | technische V1.0-Vorgabe | Deutsch und EUR |
| Belegtexte | Produktdefault | leerer Fußtext; neutraler Dankestext `Vielen Dank für Ihren Besuch.`; im Assistenten änderbar |
| Belegnummer | produktiver Start | aktuelles Kalenderjahr, nächster Stand `000001` |
| Storno/Gutschrift | produktiver Start | je Dokumentart erste automatisch abgeleitete Nummer `000101`; kein Eingriff in vorhandene Nummernfolgen |
| Gutscheinreferenz/-code | produktiver Start | wird erst beim Verkauf stabil und zufällig erzeugt; kein Seed verbraucht eine Referenz |
| TSE | technischer Default | optional vorbereitet, deaktiviert, nicht eingerichtet, nicht verbunden; keine TSE und keine Fiskalisierung |
| Logos/Logoassets | produktiv leer | keine Zuordnung, 0 Assets; Textfallback aktiv |
| Sicherungserinnerung | technischer Default | lokale Schonfrist wird beim ersten Settings-Snapshot initialisiert; keine Sicherung wird automatisch erzeugt |
| Testbeleg im Assistenten | Onboarding-Beispiel | reine Vorschau; nicht persistiert, keine produktive Nummer, kein Umsatz |
| Historische PERSISTENCE-010-Quelle | eng begrenzte Reparaturdaten | vier Beleg-/Gutscheinpaare, inaktiv und vom produktiven Erststart getrennt |

## Nummernkreise

Normale Belege und Gutscheinverkaufsbelege teilen den geschützten Nummernkreis `<Jahr>-<sechs Stellen>` und starten bei einem neuen Mandanten mit `000001`. Erst ein erfolgreich atomar gespeicherter Abschluss erhöht den Stand. Stornos verwenden `ST-<Jahr>-<sechs Stellen>`, Gutschriften `GS-<Jahr>-<sechs Stellen>`; beide starten je Art bei `000101` und werden aus dem vorhandenen Belegbestand kollisionsfrei fortgeführt.

Die Assistentenvorschau verbraucht keine Nummer. Persistierte Mandanten behalten ihren geladenen `nextNumber`-Stand. Resets des Entwicklerbereichs senken den Nummernstand nicht. Historische Reparaturdaten verändern weder Settings noch Nummernfolge.

## Einrichtungsassistent und ergänzende Einstellungen

Der Assistent führt durch Unternehmen, Leistungsort, Steuerstatus, nur lesbaren Nummernstand, Zahlungsarten, Geschäftsbereich mit Katalogzugang, Belegtexte, optionalen TSE-Hinweis, Zusammenfassung und eine nicht persistierte Testbelegvorschau. Die Einrichtung kann unterbrochen und später fortgesetzt werden.

Folgende Punkte bleiben bewusst außerhalb des Assistenten und sind vor dem produktiven Start über **Einstellungen** zu erledigen:

- Anzeigename unter **Benutzer**;
- Unternehmenslogo unter **Unternehmen** und optionale Bereichslogos unter **Geschäftsbereiche**;
- erste verschlüsselte Sicherung unter **Sicherung & Wiederherstellung**.

Der Assistent darf bei `Noch nicht sicher` und beim optionalen, nicht eingerichteten TSE-Status fortfahren. Das ist keine fachliche Freigabe: Steuerstatus und eine gegebenenfalls erforderliche TSE-Nutzung müssen vor dem ersten echten Geschäftsvorfall extern geklärt sein.

## Branding-Bewertung

BRANDING-001/002 bleibt unverändert: Unternehmen und Geschäftsbereiche akzeptieren lokal ausschließlich PNG oder JPEG bis 1 MB. Die Priorität lautet Bereichslogo, Unternehmenslogo, Textfallback. Das versionierte Asset-Register hält jede tatsächlich referenzierte Bildversion einmal; neue Beleg- und Gutscheinsnapshots speichern die wirksame Asset-ID. Interne Ansicht, Dokumentvorschau, Beleg-/Gutschein-/Korrektur-PDF und Steuerberater-PDF verwenden den zentralen Resolver. Backup und Restore transportieren das Register vollständig. Historische Dokumente behalten ihre frühere Asset-Referenz; Public Viewer, QR-Payload und Steuerberater-CSV enthalten keine Bildrohdaten.

## Übergabe-Checkliste für Angèle

1. **Unternehmensdaten:** Unternehmer/in, optionale Geschäftsbezeichnung, vollständige Anschrift und gewünschte Kontaktdaten eintragen; Anzeigevorschau prüfen.
2. **Geschäftsbereiche:** neutrale Bezeichnung ersetzen, benötigte Bereiche anlegen, Standardbereich und jeweilige Leistungsorte eindeutig zuordnen.
3. **Leistungen/Produkte:** nur tatsächlich angebotene Positionen mit Kategorie, Preis und Status anlegen; Vorlagen nur bewusst verwenden und jede importierte Angabe prüfen.
4. **Steuern:** Steuerstatus, Standard-MwSt. und jeden Positionssteuersatz vor dem ersten echten Beleg fachlich mit der Steuerberatung klären und bestätigen.
5. **Zahlungsarten:** nur tatsächlich akzeptierte Arten aktivieren; Bar, EC und Gutschein sind beim Erststart lediglich die sichtbare Produktauswahl.
6. **Benutzer:** unter Einstellungen den Anzeigenamen der tatsächlich arbeitenden Person setzen; V1.0 bleibt bei genau einem lokalen Benutzer.
7. **Logos:** optional Unternehmenslogo und abweichende Geschäftsbereichslogos als PNG/JPEG bis 1 MB hochladen; Fallback und Dokumentvorschau prüfen.
8. **Nummernkreis:** vor dem ersten echten Abschluss prüfen, dass Jahr und nächste Nummer `000001` zum Betrieb passen; danach nicht zurücksetzen.
9. **TSE-Status:** `nicht eingerichtet`, `deaktiviert` und `nicht verbunden` bewusst zur Kenntnis nehmen und vor produktiver Nutzung klären, ob beziehungsweise wann eine echte TSE erforderlich ist.
10. **Erste Sicherung:** nach vollständiger Einrichtung eine verschlüsselte Sicherung erzeugen, Sicherungskennwort getrennt sicher verwahren und die Datei außerhalb des Geräts ablegen.
11. **Testbeleg:** zuerst die Assistentenvorschau prüfen; einen echten Beleg nur dann erzeugen, wenn Nummern-, Steuer- und TSE-Fragen geklärt sind. Ein echter Testbeleg ist steuerlich nicht automatisch folgenlos.
12. **PDF/QR:** Text, Unternehmerdarstellung, Logo/Fallback, Positionen, Beträge und QR eines geeigneten Belegs sowie eines Gutscheins auf dem Zielgerät prüfen.
13. **Steuerberaterexport:** lokalen Steuerberater-ZIP für einen begrenzten Prüfzeitraum erzeugen, Geschäftsbereichs-/Steuersummen und Beleg-PDFs kontrollieren; keine Kundenstammdaten erwarten.
14. **Offline-Test:** Home-Screen-PWA einmal online vollständig laden, schließen, im Flugmodus kalt starten, lokale Daten öffnen und erst in einem ausdrücklich freigegebenen Test einen Offline-Beleg erzeugen.
15. **Produktiver Start:** erst nach bestandener Checkliste, gesicherter Konfiguration und geklärten Steuer-/TSE-Fragen den ersten echten Geschäftsvorfall abschließen; anschließend Beleg und Sicherungsstatus kontrollieren.

## Freigabegrenze

Die Codebasis ist nach bestandener Regression für einen neuen, bewusst eingerichteten Beta-Mandanten vorbereitet. Der reale Übergang bleibt ein manuelles Gate: neuer iPhone-/Home-Screen-Erststart, vollständige Checkliste, verschlüsselte Erstsicherung und Zielgerätetest. Daraus folgt weder eine automatische Produktivfreigabe noch eine TSE-/Steuerfreigabe.
