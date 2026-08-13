# FRECKA Asset Checklist

## Statuslegende

- `[ ]` fehlt oder ist noch nicht final freigegeben
- `[x]` final geprüft und einsatzbereit

Nur die für WEBSITE-007 verbindlichen Produktionsdateien stehen in dieser Checkliste. Eine vorhandene Datei gilt erst nach visueller, technischer und rechtlicher Prüfung als abgeschlossen.

## 1. Logo und Browsericon

- [ ] `assets/logo/svg/frecka-logo.svg`
- [ ] `assets/logo/svg/frecka-wordmark.svg`
- [ ] `assets/logo/svg/frecka-icon.svg`
- [ ] `assets/logo/favicon/favicon.svg`
- [ ] SVGs enthalten ausschließlich saubere Vektorpfade
- [ ] keine eingebetteten Rasterbilder oder Schriften
- [ ] `viewBox` und Schutzzone sind korrekt
- [ ] Mindestgrößen nach `BRAND_GUIDELINES.md` geprüft
- [ ] Farben und Transparenz freigegeben

## 2. Hero Screenshot

- [ ] `assets/screenshots/hero/home.png`
- [ ] empfohlen: 1240 × 2200 px
- [ ] stabiler, freigegebener App-Release
- [ ] vollständig fiktive Daten
- [ ] ohne Browserchrome, Geräteframe oder transparente Außenfläche
- [ ] Hauptzustand stimmt mit der Hero-Aussage überein
- [ ] Darstellung im vorhandenen Device-Rahmen geprüft

## 3. Workflow Screens

- [ ] `assets/screenshots/workflow/step-1.png`
- [ ] `assets/screenshots/workflow/step-2.png`
- [ ] `assets/screenshots/workflow/step-3.png`
- [ ] empfohlen: jeweils 960 × 540 px
- [ ] einheitlicher App-Release und fiktiver Datensatz
- [ ] Reihenfolge entspricht dem realen Ablauf
- [ ] wichtiger UI-Zustand liegt in der sicheren Bildmitte
- [ ] Lazy Loading und Zuschnitt geprüft

## 4. Weitere App-Screens

- [ ] `assets/screenshots/customers/customers.png`
- [ ] `assets/screenshots/vouchers/vouchers.png`
- [ ] `assets/screenshots/receipts/receipt.png`
- [ ] `assets/screenshots/settings/settings.png`
- [ ] empfohlen: jeweils 1240 × 2200 px
- [ ] keine echten Namen, Kontaktdaten, IDs oder Unternehmensdaten
- [ ] Werte, Status und Referenzen fachlich konsistent
- [ ] alle Screens stammen aus demselben freigegebenen Produktstand

## 5. Arbeitsfoto

- [ ] `assets/photos/optimized/working-day.webp`
- [ ] empfohlen: 1600 × 1200 px
- [ ] authentischer kleiner Dienstleistungsbetrieb
- [ ] natürliche Arbeitssituation und natürliches Licht
- [ ] schriftliche Einwilligung erkennbarer Personen und Betriebe
- [ ] keine Kundenunterlagen oder fremden Marken sichtbar
- [ ] EXIF-, Standort- und personenbezogene Metadaten entfernt
- [ ] mobiler und Desktopzuschnitt geprüft

## 6. Performance und Integration

- [ ] alle Dateien liegen exakt unter den dokumentierten Pfaden
- [ ] keine zusätzliche Suffix- oder Retina-Datei ist für die Website erforderlich
- [ ] Rasterdateien enthalten bereits die empfohlene 2×-Exportauflösung
- [ ] Hero lädt priorisiert und ohne Lazy Loading
- [ ] Workflow-Screens und Arbeitsfoto laden lazy
- [ ] alle Rasterbilder besitzen HTML-Attribute für Breite und Höhe
- [ ] Logo und Medien erscheinen ohne HTML- oder CSS-Änderung
- [ ] bei fehlenden Dateien bleiben die RC2-Fallbacks sichtbar
- [ ] keine Layout Shifts beim Laden
- [ ] Kompression und Dateigröße geprüft
- [ ] Kontrast und Lesbarkeit nach Dateiaustausch geprüft
- [ ] Browser-, Geräte- und Accessibility-Abnahme abgeschlossen

