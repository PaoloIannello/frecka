# FRECKA Website

Statische offizielle FRECKA-Landingpage und ihre konzeptionelle Grundlage.

## Status

Die Landingpage ist als statische HTML5-/CSS-/Vanilla-JavaScript-Seite umgesetzt und auf das geplante Beta-Angebot vorbereitet. Markenassets, Produktscreens, 14-Tage-Testphase, Einzellizenz, Pricing-Platzhalter, Beta-Anfrage und FRECKA-spezifische Legal-Seiten sind integriert. Preis, Formular-Backend und Hostingprotokollierung bleiben vor der öffentlichen Aktivierung verpflichtende Freigabepunkte.

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
- [WEBSITE_009_CONTENT_LAUNCH.md](WEBSITE_009_CONTENT_LAUNCH.md) dokumentiert Content Review, Beta-Positionierung, Legal-Seiten und verbleibende Launch-Blocker.
- [WEBSITE_010_FINALIZATION.md](WEBSITE_010_FINALIZATION.md) dokumentiert die finale Beta-, Pricing-, Formular-, Legal-, SEO- und Launch-Bewertung.
- [legal/impressum.html](legal/impressum.html) enthält die anhand der öffentlichen Betreiberquelle verifizierte Anbieterkennzeichnung nach § 5 DDG.
- [legal/datenschutz.html](legal/datenschutz.html) beschreibt den aktuellen technischen Datenschutzstand; unbekannte Hosting- und Backenddetails bleiben ausschließlich intern dokumentiert.

## Technisches Fundament

- `styles/design-tokens.css`: globale Farben, Typografie, Abstände, Radien, Schatten, Container, Ebenen und Motion-Tokens.
- `styles/animation.css`: ausschließlich globale, optionale Bewegungsprimitiven mit Reduced-Motion-Fallback.
- `styles/brand-assets.css`: dimensionsstabile Darstellungs- und Austauschschicht für Logos, Screenshots und Fotos.
- `components/`: reserviert für eine mögliche spätere Modularisierung; die statische Seite benötigt sie nicht zur Laufzeit.
- `scripts/main.js`: progressive Navigation, Scroll-Reveal und Asset-Fallbacks in Vanilla JavaScript.
- `assets/`: freigegebene Logo-, Screenshot-, Favicon- und Social-Assets sowie reservierte Produktionspfade.

## Aktuelle Struktur

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
├── components/      # für mögliche spätere Teilimplementierungen reserviert
├── legal/           # Impressum und Datenschutz
├── scripts/         # kleines, progressiv verbessertes Vanilla JavaScript
└── styles/
    ├── design-tokens.css
    ├── animation.css
    ├── main.css
    └── brand-assets.css
```

Die Landingpage liegt direkt unter `website/` und kann ohne Build-Schritt statisch ausgeliefert werden. Finale Produktionspfade sind so eingebunden, dass Logo- und Screenshotdateien ohne Änderung der HTML-/CSS-Struktur austauschbar bleiben.

## Verbindliche Grenzen

- Änderungen für die Website bleiben vollständig in `website/`.
- Die bestehende App ist ausschließlich Referenz und wird nicht verändert.
- Die Website bleibt statisch: HTML, CSS und bei Bedarf Vanilla JavaScript.
- Keine Frameworks, Build-Tools, Paketmanager-Runtime oder zusätzlichen Abhängigkeiten.
- Keine unbestätigten Produkt-, Preis-, Rechts- oder Sicherheitsversprechen veröffentlichen.
- App und Website teilen eine Designsprache, aber nicht zwingend dieselben Komponenten oder Dateien.

## Referenzstand

Die Analyse basiert auf dem am 12. August 2026 vorhandenen App-Stand. Die Verzeichnisse `app/` und `assets/` waren zu diesem Zeitpunkt leer; die bestehende statische App im Repository-Stamm wurde deshalb ausschließlich lesend als Referenz herangezogen. Maßgeblich waren insbesondere die vorhandenen Farb- und Formtokens, responsiven Komponenten, UX-Grundsätze sowie die Architektur- und Produktdokumentation.
