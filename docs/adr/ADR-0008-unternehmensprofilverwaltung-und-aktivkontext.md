# ADR-0008: Unternehmensprofilverwaltung und aktiver Arbeitskontext

## Status

Angenommen am 20. September 2026.

## Kontext

ADR-0006 und ADR-0007 haben in Schema 9 die kanonische Profilgrenze, direkte `companyId`-Referenzen und getrennte Nummernkreise vorbereitet. Die Produktoberfläche konnte bisher aber nur Profil 1 verwenden. Für mehrere rechtlich oder steuerlich getrennte Unternehmen auf derselben Installation werden eine kontrollierte Profilanlage, ein sichtbarer Arbeitskontext und eine sichere Abgrenzung aller produktiven Mutationen benötigt.

Die vorhandene LICENSE-005-Runtime besitzt genau eine installations- und gerätebezogene Bindung. Sie kann ein zusätzliches Unternehmensprofil noch nicht autorisieren. Gleichzeitig dürfen offene Beleg-, Gutschein- oder Podologieentwürfe bei einem Profilwechsel weder einem anderen Unternehmen zugeordnet noch still verworfen werden.

## Entscheidung

`settings.companies[]` bleibt die einzige persistierte Profilquelle; `activeCompanyId` bezeichnet genau ein vorhandenes Profil und ist der zentrale Arbeitskontext der Produktoberfläche. Ein Profilwechsel speichert nur diese Referenz und lädt anschließend Unternehmensdaten, Geschäftsbereiche, Leistungsorte, Betriebs- und Belegeinstellungen des gewählten Profils. Fremde Profile werden bei einem Speichervorgang nicht neu aufgebaut oder überschrieben.

MULTI-COMPANY-004C macht diesen vorhandenen Arbeitskontext im App-Header direkt erreichbar. Bei mehreren Profilen öffnet ein kompakter Kontextschalter eine mobile Auswahl mit den getrennten Ebenen Unternehmen und Geschäftsbereich. Der Unternehmenswechsel verwendet unverändert denselben kanonischen Wechselpfad wie die Unternehmenseinstellungen; der Bereichskontext wird danach ausschließlich aus aktiven Bereichen mit `businessArea.companyId === activeCompanyId` aufgelöst. Die geöffnete Auswahl ist reiner UI-Zustand und wird nicht persistiert. Bei genau einem Profil bleibt die bisherige direkte Geschäftsbereichsauswahl erhalten, ohne einen zusätzlichen Unternehmensschritt einzuführen.

Neue Profile erhalten:

- opake, nicht aus Stammdaten abgeleitete Profil-, Geschäftsbereichs- und Leistungsort-IDs;
- eine eigene portable, nicht autoritative Lizenzreferenz;
- genau einen initialen Geschäftsbereich und Leistungsort;
- eigene Nummernkreisdefaults ab `000001` für Normalbeleg, Storno und Gutschrift;
- ein ausdrücklich eingegebenes, installationsweit eindeutiges Belegkürzel aus 2 bis 8 Großbuchstaben oder Ziffern, beginnend mit einem Buchstaben;
- Setupstatus `not-started`.

Profil 1 behält seinen historischen Legacy-Nummernmodus. Eine bewusste spätere Kürzelwahl wirkt ausschließlich auf künftige Belege und setzt keine Sequenz zurück. Historische Nummern und Snapshots werden nie neu formatiert.

Geschäftsbereiche und Leistungsorte werden in der UI ausschließlich für das aktive Profil angezeigt und mutiert. Neue Bereiche erhalten `companyId = activeCompanyId`; Orte dürfen nur Bereiche desselben Profils referenzieren. Kunden und der lokale Benutzer bleiben installationsweit gemeinsam. Belege, Gutscheine, Rezepte und Behandlungsdatensätze bleiben profilgebunden.

Ein Profilwechsel ist gesperrt, solange ein nichtleerer Belegwarenkorb, ein laufender Belegabschluss, ein Gutscheinentwurf oder ein Rezeptentwurf existiert. FRECKA migriert und verwirft solche Entwürfe nicht automatisch.

Der Kontextschalter ruft genau diesen zentralen Draft-Schutz auf. Er zeigt den bereits zentral ermittelten Produktiv-, Aktivierungs- oder Beta-Teststatus nur lesend an und kann weder Lizenz- noch Beta-Testzustände verändern. Ein erfolgreicher Wechsel aktualisiert die sichtbare App unmittelbar; ein Reload ist nicht erforderlich.

Bis zu einem eigenen Lizenz-Multi-Binding-Block ist ausschließlich Profil 1 produktiv. Jedes weitere Profil ist auswählbar und konfigurierbar, bleibt aber lokal `activation_required`; Belegabschluss und weitere produktive Mutationen werden in der Persistenzschicht abgewiesen. Die Lizenzreferenz oder Runtime von Profil 1 wird nicht kopiert. Diese konservative Zwischenregel ist keine Lizenzautorisation.

Unternehmensprofile werden in V1 nicht physisch gelöscht. Dadurch entstehen weder Kaskaden noch verwaiste historische Daten. Bis MULTI-COMPANY-005 werden bestehende Beleglisten und Exporte sicher auf das aktive Profil begrenzt; eine profilübergreifende Übersicht oder Steuerberaterauswertung ist nicht Teil dieser Entscheidung.

## Folgen

- Mehrere Profile können in derselben Installation vorbereitet, gesichert und wiederhergestellt werden, ohne Schemaerhöhung oder zweiten Settingsbestand.
- Der aktive Unternehmenskontext ist sichtbar und nach Reload stabil.
- Unternehmen und Geschäftsbereich bleiben im schnellen Headerwechsel als getrennte Kontexte erkennbar; es entsteht keine zweite Zustandsquelle.
- Offene Entwürfe und profilfremde Referenzen können keine Cross-Company-Geschäftsvorfälle erzeugen.
- Vollbackup und Restore enthalten alle Profile gemeinsam; `licenseRuntime` bleibt ausgeschlossen und Restore hebt die Produktsperre eines Zusatzprofils nicht auf.
- Profilbearbeitung wirkt nur auf künftige Vorgänge. Dokumente, Public Viewer, QR, PDFs und historische Exporte bleiben snapshotbasiert.
- Die vollständige Aktivierung weiterer Profile benötigt einen getrennten Lizenz-Multi-Binding-Block. Profilübergreifende Listen und Exporte benötigen MULTI-COMPANY-005.

## Alternativen

### Geschäftsbereiche als Unternehmen verwenden

Verworfen. Geschäftsbereiche besitzen keine eigenständigen Unternehmens-, Steuer-, Lizenz- und Nummernkreisdaten und dürfen eine rechtlich getrennte Einheit nicht simulieren.

### Zusatzprofile sofort über Profil 1 lizenzieren

Verworfen. Die aktuelle Runtime kann keine getrennte Unternehmensberechtigung beweisen; eine Freigabe wäre unzulässiges Lizenzsharing.

### Entwurf beim Wechsel automatisch übertragen oder verwerfen

Verworfen. Übertragung würde Cross-Company-Positionen erzeugen; stilles Verwerfen würde Nutzereingaben verlieren.

### Profile physisch löschen

Verworfen für V1. Eine sichere Löschung müsste alle historischen und abhängigen Daten beweisbar ausschließen und bringt für die erste Profilverwaltung keinen notwendigen Nutzen.

## Migrations- oder Rückweg

Es gibt keine neue Migration: Schema 9 und das Settingsformat bleiben unverändert. Eine bestehende Ein-Profil-Installation verwendet weiterhin Profil 1 und ihren bisherigen Nummernstand. Neue Profile sind additive Settingsdaten. Bei ungültigem aktivem Profil, doppeltem Kürzel, profilfremder Bereichs-/Ortsreferenz oder unzulässiger Produktivmutation wird geschlossen abgebrochen.

Ein Client vor MULTI-COMPANY-004 kann den aktiven Mehrprofilkontext nicht sicher bedienen und ist nach Anlage weiterer Profile kein unterstützter Schreib-Rückweg. Der fachliche Rückweg erfolgt nur über eine zuvor erzeugte, mit einer kompatiblen Version validierte Vollsicherung.
