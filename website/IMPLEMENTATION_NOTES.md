# FRECKA Landingpage RC2 – Implementation Notes

## 1. Stand

RC2 ist als vollständige statische Landingpage umgesetzt. Die Seite funktioniert ohne Framework, Build-Prozess und Laufzeitabhängigkeiten. Noch nicht vorhandene Marken- und Bildassets sind durch hochwertige, dimensionsstabile HTML/CSS-Flächen ersetzt.

Der Stand ist als Release Candidate für Inhalt, Struktur und Gestaltung gedacht. RC2 verfeinert Hierarchie, Raum, responsive Balance und Interaktionszustände, ohne Bereiche oder Produktfunktionen hinzuzufügen. Vor einer öffentlichen Veröffentlichung müssen die unter „Bekannte TODOs“ genannten fachlichen und rechtlichen Punkte abgeschlossen werden.

## 2. Dateistruktur

```text
website/
├── index.html
├── IMPLEMENTATION_NOTES.md
├── accessibility.md
├── components.md
├── responsive.md
├── styles/
│   ├── design-tokens.css
│   ├── animation.css
│   └── main.css
├── scripts/
│   └── main.js
├── components/          # für spätere modularisierte Teilimplementierungen
└── assets/
    ├── fonts/
    ├── icons/
    └── images/
```

Die bestehenden Konzept- und Richtungsdokumente bleiben unverändert als fachliche Grundlage im Wurzelverzeichnis von `website/` erhalten.

## 3. Verantwortlichkeiten der Dateien

### `index.html`

- vollständige semantische Seitenstruktur;
- sichtbare RC1-Inhalte;
- Header, Hero, Arbeitsalltag, Prozess, Vorteile, Datenkontrolle, Zielgruppen, FAQ, CTA und Footer;
- SEO-Basismetadaten;
- OpenGraph- und X/Twitter-Textmetadaten;
- vorbereitete Schema.org-Auszeichnung als `SoftwareApplication`;
- austauschbare Medien-Slots ohne externe Bilder.

### `styles/design-tokens.css`

- Farbprimitive und semantische Farben;
- Typografie, Abstände, Radien und Schatten;
- Container- und Controlgrößen;
- Breakpointvertrag;
- Z-Index und Motion-Tokens;
- Reduced-Motion- und erhöhte-Kontrast-Anpassung.

### `styles/animation.css`

- globale Fade-, Slide-, Reveal- und Scale-Primitiven;
- Hover-, Press- und Focus-Grundverhalten;
- progressiver Scroll-Reveal-Vertrag;
- globaler Reduced-Motion-Fallback.

### `styles/main.css`

- Reset und globale Seitengrundlage;
- RC2-Komponentenlayout und visuelle Zustände;
- mobile-first Responsive-Regeln für Tablet, Desktop und große Monitore;
- Forced-Colors-Grundlagen;
- keine eigenen Keyframes und keine verspielten Bewegungen.

### `scripts/main.js`

- Öffnen und Schließen der mobilen Navigation;
- Escape- und Fokus-Rückgabe beim Schließen;
- Schließen bei Navigation, Außenklick und Desktopwechsel;
- progressives Scroll Reveal per `IntersectionObserver`;
- vollständiger Fallback bei fehlendem JavaScript, fehlendem Observer oder Reduced Motion.

## 4. Umgesetzte Komponenten

- Skip Link;
- Header und Text-Wordmark;
- Desktop- und Mobile Navigation;
- Primary Button, CTA Group und Text Link;
- Hero und Heading Group;
- Product Stage;
- austauschbarer Device-/App-Screenshot-Slot;
- Zielgruppen-Zeile;
- Arbeitsalltag mit austauschbarem Foto-Slot;
- geordnete Drei-Schritte-Liste;
- Feature Cards und Benefit List;
- beschrifteter Data Flow;
- Audience List;
- FAQ auf Basis von `details`/`summary`;
- Final CTA;
- Footer mit Produkt- und Rechtsbereichen.

Die API-Namen und Zustände folgen `components.md`. Wiederkehrende Gestaltung verwendet Tokens statt lokaler Zufallswerte.

## 5. Spätere Austauschpunkte

### Text-Wordmark und D-TILE-Logo

**Aktuell:** `.c-brand` enthält die Text-Wordmark „FRECKA“ und den Claim.

**Später:** Wort- und Bildmarken-SVG innerhalb desselben Links einsetzen. Der zugängliche Linkname bleibt „FRECKA Startseite“. Redundante Logo-Bildtexte müssen assistiv verborgen werden.

**Betroffene Stellen:** Header und Footer.

### Hero App-Screenshot

**Aktuell:** `.c-product-stage` enthält eine CSS-basierte, nicht interaktive Produktvorschau in `.c-device`.

**Später:** Innerhalb der Product Stage ein `picture` mit freigegebenem App-Screenshot einsetzen. Breite, Höhe und `aspect-ratio` müssen vorab feststehen. Der Hero-Screenshot lädt nicht lazy.

**Erwartete Assets:** mobile AVIF-/WebP-Ausgaben plus Fallback, vollständige fiktive Daten, Alt-Text und sichtbare Caption.

### Drei Prozessansichten

**Aktuell:** `.c-mini-screen` visualisiert die drei Schritte abstrakt.

**Später:** Je Schritt kann ein fokussierter Screenshot-Ausschnitt eingesetzt werden. DOM-Reihenfolge, Titel und Beschreibung bleiben bestehen.

### Arbeitsfoto

**Aktuell:** `.c-photo-slot__surface` ist eine reine CSS-Komposition mit festem Raum und Caption.

**Später:** Die innere Fläche durch ein responsives `picture` ersetzen. Figure und Caption bleiben erhalten. Das Motiv benötigt authentische Freigabe, natürlichen Zuschnitt und einen zweckbezogenen Alt-Text.

### OpenGraph-Bild

**Aktuell:** OpenGraph- und X/Twitter-Textmetadaten sind vorhanden; es wird bewusst kein generisches Bild ausgeliefert.

**Später:** Nach finaler Markenfreigabe ein eigenes Social-Preview-Bild ergänzen und `og:image`, Bildmaße, Alt-Text sowie `twitter:image` mit absoluter Produktions-URL eintragen.

### Favicon und Touch Icon

**Aktuell:** keine provisorische Bildmarke.

**Später:** aus dem freigegebenen D-TILE-Zeichen ableiten und in den Head aufnehmen.

## 6. Noch offene Assets

- finale D-TILE-Bildmarke;
- finale FRECKA-Wortmarke;
- Favicon und Apple Touch Icon;
- freigegebener Hero-Screenshot;
- drei freigegebene Prozess-Screens bzw. Ausschnitte;
- authentisches Arbeitsfoto mit Nutzungsrechten;
- OpenGraph-/Social-Preview-Bild;
- optional lokal gehostete Inter-Dateien, falls Google Fonts vor Veröffentlichung ersetzt werden soll;
- finales konsistentes SVG-Iconset, falls funktionale Icons ergänzt werden.

## 7. SEO- und Metadatenstatus

Vorbereitet:

- eindeutiger Seitentitel;
- Meta Description;
- Robots-Anweisung;
- OpenGraph- und X/Twitter-Texte;
- `SoftwareApplication`-Schema ohne erfundene Preise oder Bewertungen;
- genau eine H1 und logische Überschriftenstruktur;
- beschreibende Anker und semantische Landmarken.

Nach Domainfreigabe ergänzen:

- kanonische absolute URL;
- `og:url`;
- absolute Social-Bild-URL;
- Sitemap und gegebenenfalls `robots.txt`;
- verifizierte Anbieter-/Organisationseinträge nur mit echten Daten.

## 8. Performance-Entscheidungen

- kein Framework und kein Hydration-Aufwand;
- kein Build- oder Paketmanagercode;
- sehr kleines Vanilla-JavaScript;
- keine Bilddownloads im RC1;
- dimensionsstabile Medienflächen gegen Layout Shifts;
- Systemschrift-Fallback vor Inter;
- `defer` für das einzige Script;
- Animationen verwenden Opacity und Transform;
- keine Video-, Parallax- oder Karusselllast;
- Screens außerhalb des ersten Viewports können später lazy geladen werden;
- Hero-Medium bleibt von Lazy Loading ausgenommen.

Google Fonts ist die einzige externe Abhängigkeit. Für maximale Datenschutz-, Offline- und Ladezeitkontrolle sollte Inter vor Produktion lokal ausgeliefert oder vollständig durch den Systemschrift-Stack ersetzt werden.

## 9. Accessibility-Status

Umgesetzt:

- deutscher Dokumentkontext;
- Skip Link;
- Landmarken und eine H1;
- native Links, Buttons, Listen, Figures und FAQ-Details;
- große Touchziele;
- global sichtbare Fokuszustände;
- Tastatur- und Escape-Verhalten des mobilen Menüs;
- Focus Return zum Menu Button;
- Reduced Motion;
- Progressive Enhancement;
- verständliche Linktexte;
- keine Information ausschließlich über Farbe oder Bewegung;
- Forced-Colors-Grundlagen;
- kein horizontaler Pflichtslider.

Vor öffentlicher Freigabe manuell prüfen:

- VoiceOver/Safari und eine weitere Screenreader-Kombination;
- vollständige Tastaturreihenfolge;
- 200-%-Zoom und benutzerdefinierte Textabstände;
- 320-px-Reflow;
- reale Kontraste nach Einsetzen der Assets;
- Fokus bei realem Hosting und Ankernavigation;
- Alt-Texte der finalen Bilder.

## 10. Bekannte TODOs vor Veröffentlichung

### Kritisch

- echtes Impressum einsetzen;
- Datenschutzerklärung passend zu Hosting, Serverlogs und Google Fonts freigeben;
- Preis-, Verfügbarkeits- und Angebotsstatus fachlich entscheiden;
- verbindliches primäres CTA-Ziel mit echtem Folgeprozess festlegen;
- alle Produkt-, Offline-, Backup-, Export- und Datenaussagen gegen den dann veröffentlichten App-Stand prüfen;
- Produktionsdomain und kanonische URLs eintragen.

### Assets

- Logo, Screenshots, Foto, Favicons und Social Preview ersetzen;
- Bildrechte, Einwilligungen und Metadaten prüfen;
- intrinsische Bildmaße und responsive Quellen festlegen.

### Qualität

- visuelle Abnahme in aktuellen Zielbrowsern und auf realen Mobilgeräten;
- Lighthouse-Messung über den tatsächlichen Produktionsserver;
- Accessibility-Abnahme nach `accessibility.md`;
- Links und 404-Verhalten prüfen;
- Content-Review mit der festgelegten Markenanrede;
- Schriftstrategie Google Fonts versus lokales Hosting final entscheiden.

## 11. Bewusste Ausschlüsse in RC1

- kein Kontakt- oder Newsletterformular;
- kein Tracking und keine Analytics;
- kein Consent-Banner ohne tatsächlichen Bedarf;
- keine Cookies oder lokale Marketingpräferenzen;
- kein Testimonial ohne belastbare Quelle;
- keine Preisangabe ohne Freigabe;
- kein App-Download oder externer Bestellprozess;
- keine Bild-, Video- oder SVG-Produktion;
- kein Deployment.
