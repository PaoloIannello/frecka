# WEBSITE-008 – Asset Integration

## 1. Ergebnis

Die freigegebenen FRECKA-Markenassets und vier echte App-Screens sind in die unveränderte RC2-Seitenstruktur integriert. Die Brand-Master wurden ausschließlich gelesen. Alle Marken- und Social-Dateien sind byte-identische Kopien; SVG-Geometrie, Farben und Textobjekte wurden nicht verändert.

## 2. Kopierte Brand Assets

| Quelle im Brand Package | Produktionsdatei | Einsatz | Exportgröße | Dateigröße |
| --- | --- | --- | --- | ---: |
| `logo/frecka-logo-no-claim.svg` | `assets/logo/svg/frecka-logo.svg` | Header und Footer; Claim bleibt Live-Text | ViewBox 1100 × 180 | 1.201 B |
| `wordmark/frecka-wordmark.svg` | `assets/logo/svg/frecka-wordmark.svg` | freigegebener Produktionsmaster, aktuell nicht separat sichtbar | ViewBox 650 × 110 | 540 B |
| `icon/frecka-icon.svg` | `assets/logo/svg/frecka-icon.svg` | freigegebener D-TILE-Master, aktuell nicht separat sichtbar | ViewBox 512 × 512 | 602 B |
| `favicon/favicon.svg` | `assets/logo/favicon/favicon.svg` | Browsericon | ViewBox 512 × 512 | 602 B |
| `social/opengraph-1200x630.png` | `assets/social/opengraph-1200x630.png` | OpenGraph- und X/Twitter-Vorschau | 1200 × 630 px | 19.671 B |

Die SHA-256-Prüfsummen jeder Quelle und ihrer Kopie stimmen überein. Das Brand-Paket unter `assets/brand/FRECKA Brand Package/` blieb unangetastet.

## 3. Auswahl der Originalscreens

| Verwendungsstelle | Original | Begründung | Produktionsdatei |
| --- | --- | --- | --- |
| Hero | `assets/screenshots/originals/IMG_3758 2.PNG` | klare Startansicht und direkter Einstieg „Neuer Beleg“ | `assets/screenshots/hero/home.png` |
| Workflow Schritt 1 | `assets/screenshots/originals/IMG_3759 2.PNG` | zeigt die Auswahl von Leistungen und Produkten | `assets/screenshots/workflow/step-1.png` |
| Workflow Schritt 2 | `assets/screenshots/originals/IMG_3761 2.PNG` | zeigt die gewählte Zahlungsart klarer als die längere Übersichtsansicht | `assets/screenshots/workflow/step-2.png` |
| Workflow Schritt 3 | `assets/screenshots/originals/IMG_3762 2.PNG` | zeigt den erfolgreichen Belegabschluss als eindeutiges Ergebnis | `assets/screenshots/workflow/step-3.png` |

`IMG_3760 2.PNG` wurde geprüft, aber nicht exportiert. Der Screen zeigt die breitere Abschlussansicht; für die kleine Workflow-Fläche kommuniziert `IMG_3761 2.PNG` die Zahlungsart unmittelbarer.

## 4. Export und Optimierung

| Produktionsdatei | Export | Bearbeitung | Dateigröße |
| --- | ---: | --- | ---: |
| `assets/screenshots/hero/home.png` | 1206 × 2622 px | unveränderte Originalpixel; technisch entbehrliche Farbmanagement-Metadaten entfernt | 242.942 B |
| `assets/screenshots/workflow/step-1.png` | 960 × 540 px | inhaltstreuer 16:9-Ausschnitt aus der Positionsauswahl; verlustarme Skalierung; Metadatenbereinigung | 99.446 B |
| `assets/screenshots/workflow/step-2.png` | 960 × 540 px | inhaltstreuer 16:9-Ausschnitt um die Zahlungsarten; verlustarme Skalierung; Metadatenbereinigung | 53.575 B |
| `assets/screenshots/workflow/step-3.png` | 960 × 540 px | inhaltstreuer 16:9-Ausschnitt um Erfolgssymbol und Abschlussmeldung; verlustarme Skalierung; Metadatenbereinigung | 127.239 B |

Die Originale unter `assets/screenshots/originals/` wurden weder überschrieben noch verändert. Es wurden keine Inhalte retuschiert, Texte ersetzt, Beträge verändert, Statusleisten manipuliert oder Device-Rahmen eingebettet.

## 5. Darstellung und Ladeverhalten

- Das Hero-Bild lädt ohne Lazy Loading mit `fetchpriority="high"` und festen Maßen 1206 × 2622.
- Workflow-Screens laden nativ per `loading="lazy"` und besitzen feste Maße 960 × 540.
- Hero und Workflow-Screens verwenden `object-fit: contain`; dadurch werden sie weder abgeschnitten noch gestaucht oder verzerrt.
- Device-Rahmen, Karten und Fallbacks bleiben HTML/CSS und sind nicht Bestandteil der Bilddateien.
- Logo-Bilder besitzen leere Alternativtexte, weil die umgebenden Links bereits eindeutig mit „FRECKA Startseite“ beschriftet sind.
- App-Screens liegen in bereits beschrifteten, für assistive Technik ausgeblendeten Produktvisualisierungen. Leere Alternativtexte vermeiden redundante Wiederholung; sichtbare Titel und Captions vermitteln den Zweck.

## 6. Responsive-Prüfung

Geprüft wurden 320, 390, 430, 768, 1280 und 1600 px Breite. Auf allen Größen bleibt die Dokumentbreite innerhalb des Viewports; der bei Desktop-Browsern reservierte Scrollbarraum erzeugt keinen horizontalen Seitenüberlauf. Die Screens bleiben durch `contain` vollständig sichtbar und unverzerrt.

## 7. Noch fehlende Assets

- `assets/photos/optimized/working-day.webp`
- `assets/screenshots/customers/customers.png`
- `assets/screenshots/vouchers/vouchers.png`
- `assets/screenshots/receipts/receipt.png`
- `assets/screenshots/settings/settings.png`

Diese Dateien werden von der aktuellen Seitenstruktur nicht benötigt oder besitzen weiterhin den vorhandenen CSS-Fallback. Nicht vorhandene Dateien werden nicht angefordert; dadurch entstehen für die verwendeten lokalen Assetpfade keine 404-Antworten. Es wurden keine Ersatzgrafiken erzeugt.

## 8. Bewusst nicht vorgenommen

- keine Änderung am Brand-Master;
- keine Neugestaltung oder Veränderung der SVG-Geometrie;
- keine neuen Inhalte, Bereiche, Funktionen oder Navigationseinträge;
- keine KI-Bildbearbeitung;
- keine in Screenshots eingebetteten Device-Rahmen;
- keine Nutzung zusätzlicher App-Screens außerhalb der vier beauftragten Stellen;
- keine Änderung von App-Inhalten, Beträgen, Texten oder Statusleisten.
