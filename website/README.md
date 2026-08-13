# FRECKA Website

Statische offizielle FRECKA-Landingpage und ihre konzeptionelle Grundlage.

## Status

RC2 der Landingpage ist als statische HTML5-/CSS-/Vanilla-JavaScript-Seite umgesetzt und durch einen vollständigen Design Review verfeinert. Alle vereinbarten Produktionspfade sind eingebunden; fehlende finale Dateien können ohne HTML- oder CSS-Änderung eingesetzt werden.

## Dokumente

- [PROJECT.md](PROJECT.md) definiert Ziel, Zielgruppen, UX-Ziele und Informationsarchitektur.
- [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) übersetzt die bestehende App-Sprache in Leitlinien für die Website.
- [CONTENT-PLAN.md](CONTENT-PLAN.md) beschreibt Botschaften, Inhaltsreihenfolge und redaktionelle Regeln.
- [ROADMAP.md](ROADMAP.md) legt Phasen, Freigaben und Qualitätskriterien fest.
- [01_CREATIVE_DIRECTION.md](01_CREATIVE_DIRECTION.md) definiert Markenwirkung und kreative Haltung.
- [02_VISUAL_LANGUAGE.md](02_VISUAL_LANGUAGE.md) legt die visuelle Sprache für spätere Entwürfe fest.
- [03_WIREFRAME.md](03_WIREFRAME.md) beschreibt den vollständigen mobile-first Seitenaufbau.
- [04_COMPONENT_MAP.md](04_COMPONENT_MAP.md) erfasst alle später benötigten Komponenten und Zustände.
- [05_ANIMATION_GUIDE.md](05_ANIMATION_GUIDE.md) definiert ruhige, funktionale Bewegung.
- [06_ASSET_LIST.md](06_ASSET_LIST.md) plant benötigte Marken-, Produkt- und Medienassets.
- [components.md](components.md) definiert API, Semantik, Varianten und Zustände der späteren Komponenten.
- [responsive.md](responsive.md) legt die vier verbindlichen Responsive-Modi und das Komponentenverhalten fest.
- [accessibility.md](accessibility.md) beschreibt den WCAG-2.2-AA-Standard und die Abnahme.
- [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md) dokumentiert RC2, Austauschpunkte, offene Assets und Veröffentlichungsgates.
- [RC2_REVIEW.md](RC2_REVIEW.md) dokumentiert Designentscheidungen, Verbesserungen und offene Punkte des Reviews.
- [BRAND_GUIDELINES.md](BRAND_GUIDELINES.md) definiert die verbindliche Anwendung von D TILE, Wortmarke, Claim, Farben und Typografie.
- [ASSET_CHECKLIST.md](ASSET_CHECKLIST.md) führt alle erforderlichen Marken-, Plattform-, Screenshot-, Foto- und Social-Assets.
- [BRAND_INTEGRATION.md](BRAND_INTEGRATION.md) dokumentiert feste Dateinamen, Größen, Einsatzstellen und Austauschlogik.
- [FINAL_ASSET_MAP.md](FINAL_ASSET_MAP.md) ist die abschließende Zuordnung aller Produktionsdateien samt Export- und Retina-Vorgaben.

## Technisches Fundament

- `styles/design-tokens.css`: globale Farben, Typografie, Abstände, Radien, Schatten, Container, Ebenen und Motion-Tokens.
- `styles/animation.css`: ausschließlich globale, optionale Bewegungsprimitiven mit Reduced-Motion-Fallback.
- `styles/brand-assets.css`: dimensionsstabile Darstellungs- und Austauschschicht für Logos, Screenshots und Fotos.
- `components/`: reserviert für spätere, einzeln beauftragte Komponentenimplementierungen.
- `scripts/`: reserviert für spätere progressive Verbesserungen in Vanilla JavaScript.
- `assets/`: reserviert für später freigegebene Marken- und Medienassets.

## Vorgesehene Struktur

```text
website/
├── README.md
├── PROJECT.md
├── DESIGN-SYSTEM.md
├── CONTENT-PLAN.md
├── ROADMAP.md
├── components.md
├── responsive.md
├── accessibility.md
├── assets/
│   ├── logo/        # SVG, PNG und Favicons
│   ├── app-icon/    # iOS-, Android- und Adaptive-Exports
│   ├── screenshots/ # Hero, Workflow und Produktbereiche
│   ├── photos/      # Originale und optimierte Webfassungen
│   └── social/      # OpenGraph und Social Preview
├── content/         # redaktionelle Quelldokumente und Textvarianten
├── components/      # spätere Komponentenimplementierungen
├── scripts/         # kleines, optionales Vanilla JavaScript
└── styles/
    ├── design-tokens.css
    ├── animation.css
    ├── main.css
    └── brand-assets.css
```

Die Medien-, Inhalts-, Komponenten- und Skriptordner sind als spätere Zielstruktur vorgemerkt und werden erst in einer ausdrücklich beauftragten Umsetzungsphase befüllt. HTML-Seiten sollen später direkt unter `website/` liegen, damit die statische Veröffentlichung ohne Build-Schritt funktioniert.

## Verbindliche Grenzen

- Änderungen für die Website bleiben vollständig in `website/`.
- Die bestehende App ist ausschließlich Referenz und wird nicht verändert.
- Die Website bleibt statisch: HTML, CSS und bei Bedarf Vanilla JavaScript.
- Keine Frameworks, Build-Tools, Paketmanager-Runtime oder zusätzlichen Abhängigkeiten.
- Keine unbestätigten Produkt-, Preis-, Rechts- oder Sicherheitsversprechen veröffentlichen.
- App und Website teilen eine Designsprache, aber nicht zwingend dieselben Komponenten oder Dateien.

## Referenzstand

Die Analyse basiert auf dem am 12. August 2026 vorhandenen App-Stand. Die Verzeichnisse `app/` und `assets/` waren zu diesem Zeitpunkt leer; die bestehende statische App im Repository-Stamm wurde deshalb ausschließlich lesend als Referenz herangezogen. Maßgeblich waren insbesondere die vorhandenen Farb- und Formtokens, responsiven Komponenten, UX-Grundsätze sowie die Architektur- und Produktdokumentation.
