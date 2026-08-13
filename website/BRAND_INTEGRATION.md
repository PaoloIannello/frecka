# FRECKA Brand Integration

## 1. Verbindlicher Assetvertrag

WEBSITE-007 definiert die endgültigen Produktionspfade. Sichtbare Assets werden als echte HTML-Bilder eingebunden, damit Browser Ladepriorität, Lazy Loading, Decoding sowie intrinsische Breite und Höhe korrekt behandeln können.

Das Prinzip:

- Dateiname und Ordner bleiben dauerhaft stabil.
- Finale Dateien werden nur an den dokumentierten Pfad kopiert bzw. dort ersetzt.
- HTML, CSS und JavaScript müssen beim Austausch nicht geändert werden.
- Der vorhandene Device-Rahmen und alle Media-Boxen behalten ihre Maße.
- Fehlt eine zukünftige Datei, blendet `scripts/main.js` das fehlerhafte Bild aus und der vorhandene RC2-Fallback bleibt sichtbar.
- Es werden keine provisorischen Grafikdateien ausgeliefert.

## 2. Logo

### Sichtbare Verwendung

| Stelle | Produktionsdatei | HTML-Maße | CSS-Darstellung | Ladeverhalten |
| --- | --- | ---: | --- | --- |
| Header | `assets/logo/svg/frecka-logo.svg` | 304 × 56 | 120 × 20 px, `contain` | sofort |
| Footer | `assets/logo/svg/frecka-logo.svg` | 304 × 56 | 152 × 28 px, `contain` | lazy |

Die Datei enthält das vollständige horizontale D-TILE-/FRECKA-Lockup, aber nicht den Claim. Der Claim bleibt Live-Text. Bei fehlender Datei bleibt „FRECKA“ als Text-Wordmark sichtbar.

### Vorbereitete Markenmaster

| Datei | Zweck | Aktuell geladen |
| --- | --- | --- |
| `assets/logo/svg/frecka-wordmark.svg` | alleinstehende FRECKA-Wortmarke | nein |
| `assets/logo/svg/frecka-icon.svg` | D-TILE-Bildmarke für kompakte Anwendungen | nein |
| `assets/logo/favicon/favicon.svg` | Browsericon | ja |

Wortmarke und Icon sind bewusst nicht zusätzlich in die Landingpage eingesetzt, weil dies sichtbare Struktur oder Design ändern würde. Ihre finalen Pfade sind dennoch festgelegt.

## 3. Hero-App-Screen

| Eigenschaft | Festlegung |
| --- | --- |
| Datei | `assets/screenshots/hero/home.png` |
| Stelle | `.c-device__screen` im Hero |
| HTML-Maße | 1240 × 2200 |
| Darstellung | füllt ausschließlich den bestehenden neutralen Device-Screen |
| Ladeverhalten | nicht lazy, `fetchpriority="high"`, asynchrones Decoding |
| Fallback | vorhandene CSS-App-Vorschau |

Der Screenshot enthält keinen Geräteframe und keine Browserleiste. Der Device-Rahmen bleibt vollständig in CSS. Dadurch genügt künftig der Austausch von `home.png`.

## 4. Workflow-Screens

| Schritt | Datei | HTML-Maße | Ladeverhalten |
| --- | --- | ---: | --- |
| Leistung auswählen | `assets/screenshots/workflow/step-1.png` | 960 × 540 | lazy, async |
| Zahlung erfassen | `assets/screenshots/workflow/step-2.png` | 960 × 540 | lazy, async |
| Beleg abschließen | `assets/screenshots/workflow/step-3.png` | 960 × 540 | lazy, async |

Alle drei Bilder liegen als absolute Bildebene innerhalb der bestehenden `.c-mini-screen`-Box. Titel, Nummerierung, Beschreibung und Fallbackvisualisierung bleiben unverändert.

## 5. Arbeitsfoto

| Eigenschaft | Festlegung |
| --- | --- |
| Datei | `assets/photos/optimized/working-day.webp` |
| Stelle | `.c-photo-slot__surface` im Abschnitt Arbeitsalltag |
| HTML-Maße | 1600 × 1200 |
| Darstellung | `cover`, zentriert |
| Ladeverhalten | lazy, asynchrones Decoding |
| Fallback | vorhandene ruhige CSS-Fotofläche |

Das finale Motiv muss zur vorhandenen zugänglichen Beschreibung passen: eine ruhige Arbeitssituation in einem kleinen Dienstleistungsbetrieb. So ist beim Assetaustausch keine Textänderung erforderlich.

## 6. Weitere Produktscreens

Diese Dateien sind Bestandteil des finalen Assetvertrags, werden von der aktuellen Landingpage aber nicht geladen. Dadurch entstehen keine unnötigen Downloads oder neue Seitenbereiche.

| Bereich | Datei | Empfohlene Größe |
| --- | --- | ---: |
| Kunden | `assets/screenshots/customers/customers.png` | 1240 × 2200 px |
| Gutscheine | `assets/screenshots/vouchers/vouchers.png` | 1240 × 2200 px |
| Beleg | `assets/screenshots/receipts/receipt.png` | 1240 × 2200 px |
| Einstellungen | `assets/screenshots/settings/settings.png` | 1240 × 2200 px |

Sie können später in bereits geplanten Produktseiten verwendet werden, ohne ihren Produktionspfad zu ändern.

## 7. Performance- und CLS-Vertrag

- `width` und `height` stehen auf jedem Rasterbild.
- CSS erhält die bestehenden stabilen Media-Boxen und Seitenverhältnisse.
- Der Hero-Screen lädt priorisiert, weil er Teil des ersten Viewports ist.
- Workflow-Screens, Arbeitsfoto und Footerlogo laden lazy.
- `decoding="async"` verhindert unnötiges Blockieren beim Decoding.
- Logos verwenden `object-fit: contain`; Screens und Foto verwenden die dokumentierten Objektanpassungen.
- Fehlende Bilder werden nach einem Ladefehler verborgen; sie verdrängen keinen Fallback.
- Keine zusätzliche JavaScript-Bibliothek, Bildkomponente oder Build-Pipeline ist nötig.

## 8. Austauschablauf

1. Finale Datei mit exakt gleichem Namen und Format exportieren.
2. Datei in den dokumentierten Ordner legen bzw. vorhandene Datei ersetzen.
3. Cache des Deployments invalidieren.
4. Zuschnitt, Schärfe, Kontrast und Fallback prüfen.
5. Mobile, Tablet und Desktop abnehmen.
6. `ASSET_CHECKLIST.md` nach erfolgreicher Prüfung aktualisieren.

## 9. Aktuell fehlende Dateien

Zum Abschluss von WEBSITE-007 wurden keine Grafiken erzeugt. Sämtliche in `FINAL_ASSET_MAP.md` aufgeführten Produktionsdateien fehlen daher, sofern sie nicht separat vom Auftraggeber bereitgestellt wurden.

