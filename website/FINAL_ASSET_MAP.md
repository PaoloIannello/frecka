# FRECKA – Final Asset Map

## 1. Zweck

Dieses Dokument ist der verbindliche Produktionsvertrag für WEBSITE-007. Die aufgeführten Dateien werden unter exakt diesen Pfaden abgelegt. Der Austausch einer Datei erfordert keine Änderung an HTML oder CSS.

Die Angaben unter „Darstellungsgröße“ beschreiben die vorgesehene maximale logische Größe. Die Produktionsdatei wird, wo angegeben, bereits als 2×-Retina-Export geliefert. Zusätzliche `@2x`-Dateinamen oder `srcset`-Varianten sind deshalb nicht erforderlich.

## 2. Markenassets

| Grafik | Speicherort | Verwendungsstelle | empfohlene Pixelgröße (Darstellung) | empfohlene Exportgröße | Retina-Version |
| --- | --- | --- | --- | --- | --- |
| Hauptlogo | `assets/logo/svg/frecka-logo.svg` | Header und Footer | Header 120 × 20 px; Footer 152 × 28 px | SVG mit engem ViewBox, Referenzformat 304 × 56 | nicht erforderlich; SVG skaliert verlustfrei |
| Wortmarke | `assets/logo/svg/frecka-wordmark.svg` | reserviert für eigenständige Wortmarken-Anwendungen | bis 240 × 48 px | SVG mit engem ViewBox | nicht erforderlich; SVG skaliert verlustfrei |
| D-TILE-Icon | `assets/logo/svg/frecka-icon.svg` | reserviert für kompakte Marken-Anwendungen | 32 × 32 bis 64 × 64 px | quadratisches SVG mit engem ViewBox | nicht erforderlich; SVG skaliert verlustfrei |
| Browsericon | `assets/logo/favicon/favicon.svg` | Browser-Tab und Lesezeichen | 16 × 16 bis 32 × 32 px | quadratisches SVG, optisch für kleine Größen korrigiert | nicht erforderlich; SVG skaliert verlustfrei |

Das Hauptlogo ist bereits zweimal in `index.html` referenziert. Solange die Datei fehlt, bleibt die zugängliche Text-Wordmark sichtbar. Wortmarke und D-TILE-Icon sind Teil des finalen Dateivertrags, aber in der unveränderten RC2-Seitenstruktur nicht separat sichtbar.

## 3. Produkt-Screenshots

| Grafik | Speicherort | Verwendungsstelle | empfohlene Pixelgröße (Darstellung) | empfohlene Exportgröße | Retina-Version |
| --- | --- | --- | --- | --- | --- |
| Startansicht | `assets/screenshots/hero/home.png` | Hero, im bestehenden Smartphone-Rahmen | ca. 620 × 1100 px | 1240 × 2200 px PNG | Produktionsdatei ist 2× |
| Workflow Schritt 1 | `assets/screenshots/workflow/step-1.png` | Karte „Leistung auswählen“ | bis 480 × 270 px | 960 × 540 px PNG | Produktionsdatei ist 2× |
| Workflow Schritt 2 | `assets/screenshots/workflow/step-2.png` | Karte „Zahlung erfassen“ | bis 480 × 270 px | 960 × 540 px PNG | Produktionsdatei ist 2× |
| Workflow Schritt 3 | `assets/screenshots/workflow/step-3.png` | Karte „Beleg abschließen“ | bis 480 × 270 px | 960 × 540 px PNG | Produktionsdatei ist 2× |
| Kundenansicht | `assets/screenshots/customers/customers.png` | für späteren Austausch innerhalb bestehender Produktmedien reserviert | bis 620 × 1100 px | 1240 × 2200 px PNG | Produktionsdatei ist 2× |
| Gutscheinansicht | `assets/screenshots/vouchers/vouchers.png` | für späteren Austausch innerhalb bestehender Produktmedien reserviert | bis 620 × 1100 px | 1240 × 2200 px PNG | Produktionsdatei ist 2× |
| Belegansicht | `assets/screenshots/receipts/receipt.png` | für späteren Austausch innerhalb bestehender Produktmedien reserviert | bis 620 × 1100 px | 1240 × 2200 px PNG | Produktionsdatei ist 2× |
| Einstellungen | `assets/screenshots/settings/settings.png` | für späteren Austausch innerhalb bestehender Produktmedien reserviert | bis 620 × 1100 px | 1240 × 2200 px PNG | Produktionsdatei ist 2× |

Der Hero-Screenshot wird sofort mit hoher Priorität geladen. Die drei Workflow-Screens werden nativ per Lazy Loading geladen. Alle sichtbaren Screens besitzen feste intrinsische `width`- und `height`-Werte und liegen in dimensionsstabilen Rahmen. Die Screenshot-Daten müssen vollständig fiktiv und die Dateimetadaten bereinigt sein.

## 4. Fotografie

| Grafik | Speicherort | Verwendungsstelle | empfohlene Pixelgröße (Darstellung) | empfohlene Exportgröße | Retina-Version |
| --- | --- | --- | --- | --- | --- |
| Arbeitsalltag | `assets/photos/optimized/working-day.webp` | Abschnitt „Für den Moment dazwischen“ | bis 800 × 600 px | 1600 × 1200 px WebP | Produktionsdatei ist 2× |

Das Foto wird per Lazy Loading und asynchroner Dekodierung geladen. Der vorhandene 4:3-Medienrahmen reserviert den Platz vor dem Download und verhindert Layout Shifts. Der Zuschnitt muss sein Motivzentrum bei `object-fit: cover` bewahren.

## 5. Austausch- und Exportregeln

- Dateinamen, Ordner und Endungen bleiben exakt wie dokumentiert.
- PNG-Screenshots werden verlustfrei exportiert, ohne eingebettete Profile oder unnötige Metadaten.
- Das WebP-Foto wird visuell geprüft komprimiert; Richtwert: maximal 250 KB bei 1600 × 1200 px.
- SVGs enthalten keine externen Schriften, Rasterbilder, Skripte oder fest eingebetteten Fremdressourcen.
- Alle App-Screens verwenden denselben freigegebenen App-Stand, dieselbe Pixeldichte und ausschließlich fiktive Daten.
- Die in HTML gesetzten intrinsischen Maße stimmen mit den Exportmaßen überein. Dadurch bleibt die Darstellung beim reinen Dateiaustausch CLS-stabil.
- Wenn ein Produktionsasset noch fehlt oder nicht geladen werden kann, blendet die Seite nur das fehlerhafte Bild aus; der bestehende RC2-Fallback bleibt erhalten.

## 6. Integrationsstatus

| Status | Dateien |
| --- | --- |
| direkt in der Landingpage referenziert | `frecka-logo.svg`, `favicon.svg`, `home.png`, `step-1.png`, `step-2.png`, `step-3.png`, `working-day.webp` |
| final benannt und für die unveränderte Seitenstruktur reserviert | `frecka-wordmark.svg`, `frecka-icon.svg`, `customers.png`, `vouchers.png`, `receipt.png`, `settings.png` |
| noch zu liefern | alle oben genannten Produktionsdateien; WEBSITE-007 erzeugt bewusst keine Grafik- oder Logo-Platzhalter |
