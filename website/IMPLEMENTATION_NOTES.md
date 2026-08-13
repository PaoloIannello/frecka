# FRECKA Landingpage Beta – Implementation Notes

## 1. Stand

Die Landingpage ist als vollständige statische Beta-Seite umgesetzt. Sie funktioniert ohne Framework, Build-Prozess, Tracking und externe Laufzeitabhängigkeiten. Markenassets, zentrale Produktscreens, Einzellizenz, geplante 14-Tage-Testphase und ein deaktiviertes Beta-Anfrageformular sind eingebunden; für noch fehlende Medien bleiben dimensionsstabile HTML/CSS-Flächen sichtbar.

WEBSITE-010 schließt Inhalt, Struktur und Gestaltung der statischen Website ab. Die Website selbst ist mit `GO` bewertet; vor einer öffentlichen Aktivierung bleiben ausschließlich die in Abschnitt 10 benannten externen, technischen und rechtlichen Freigaben.

## 2. Dateistruktur

```text
website/
├── index.html
├── IMPLEMENTATION_NOTES.md
├── FINAL_ASSET_MAP.md
├── accessibility.md
├── components.md
├── responsive.md
├── styles/
│   ├── design-tokens.css
│   ├── animation.css
│   ├── main.css
│   └── brand-assets.css
├── scripts/
│   └── main.js
├── components/          # für spätere modularisierte Teilimplementierungen
└── assets/
    ├── logo/
    ├── app-icon/
    ├── screenshots/
    ├── photos/
    └── social/
```

Die bestehenden Konzept- und Richtungsdokumente bleiben als fachliche Grundlage im Wurzelverzeichnis von `website/` erhalten.

## 3. Verantwortlichkeiten der Dateien

### `index.html`

- vollständige semantische Seitenstruktur;
- final redigierte Beta-Inhalte;
- Header, Hero, Arbeitsalltag, Prozess, Vorteile, Datenkontrolle, Zielgruppen, Lizenz, FAQ, Beta-Anfrage und Footer;
- vollständige SEO-Metadaten für `https://frecka.app`;
- OpenGraph- und X/Twitter-Textmetadaten;
- vorbereitete Schema.org-Auszeichnung als `SoftwareApplication`;
- austauschbare Medien-Slots mit festen Produktionspfaden.

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

### `styles/brand-assets.css`

- dimensionsstabile Darstellung für Logo, Screenshots und Foto;
- transparente Austauschschicht über den vorhandenen RC2-Fallbacks;
- keine Layoutänderung beim späteren Dateiaustausch;
- Forced-Colors-Fallback auf Text und CSS-Grundflächen.

### `scripts/main.js`

- Öffnen und Schließen der mobilen Navigation;
- Escape- und Fokus-Rückgabe beim Schließen;
- Schließen bei Navigation, Außenklick und Desktopwechsel;
- progressives Scroll Reveal per `IntersectionObserver`;
- Ausblenden noch nicht gelieferter Dateien bei Ladefehler, sodass der vorhandene CSS-Fallback sichtbar bleibt;
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
- einzelne Pricing-/Lizenzkarte ohne Tarifstaffel;
- FAQ auf Basis von `details`/`summary`;
- vorbereitete, bis zur Backend-Freigabe deaktivierte Beta-Anfrage;
- Footer mit Produkt- und Rechtsbereichen.

Die API-Namen und Zustände folgen `components.md`. Wiederkehrende Gestaltung verwendet Tokens statt lokaler Zufallswerte.

## 5. Asset- und Austauschpunkte

Bereits produktiv eingebunden sind:

- FRECKA-Logo in Header, Footer und Legal-Seiten;
- D-TILE-Icon, Wortmarken-Master und Favicon in der dokumentierten Asset-Struktur;
- Hero-Screen mit CSS/HTML-Device-Rahmen;
- drei Workflow-Screens;
- Social Preview mit 1200 × 630 px.

Die Produktionsdateien können unter ihren bestehenden Pfaden ausgetauscht werden, ohne die HTML-/CSS-Struktur anzupassen. Das optionale Arbeitsfoto `assets/photos/optimized/working-day.webp` fehlt weiterhin; die aktuelle CSS-Fläche ist vollständig, dimensionsstabil und fordert keinen nicht vorhandenen Pfad an.

## 6. Beta- und Lizenzzustand

- zentrale 14-Tage-Testphase klar erklärt;
- genau eine Lizenz für einen Betrieb beziehungsweise eine Filiale und ein aktives Gerät;
- neutrale Preisankündigung auf der sichtbaren Seite;
- interner Arbeitswert 12,90 € pro Monat nur im HTML-Kommentar und in `WEBSITE_010_FINALIZATION.md`;
- Anfrageformular semantisch vollständig, aber mit deaktiviertem `fieldset`, deaktivierter Absendeaktion und ehrlichem Statushinweis;
- kein Endpoint, keine Datenübertragung, keine Speicherung und keine Fake-Erfolgsmeldung.

## 7. SEO- und Metadatenstatus

Umgesetzt:

- eindeutiger Seitentitel;
- Meta Description;
- Robots-Anweisung;
- Canonical, OpenGraph-URL und absolute Social-Bild-URL für `https://frecka.app`;
- OpenGraph- und X/Twitter-Texte samt 1200-×-630-Preview;
- `SoftwareApplication`-Schema ohne erfundene Preise oder Bewertungen;
- genau eine H1 und logische Überschriftenstruktur;
- beschreibende Anker und semantische Landmarken.

Vor dem echten Launch bleiben Domain, TLS und die identische Auslieferung der absoluten Pfade zu bestätigen. Sitemap und `robots.txt` sind optionale betriebliche Ergänzungen.

## 8. Performance-Entscheidungen

- kein Framework und kein Hydration-Aufwand;
- kein Build- oder Paketmanagercode;
- sehr kleines Vanilla-JavaScript;
- Hero-Screenshot mit hoher Ladepriorität und ohne Lazy Loading;
- Medien unterhalb des ersten Viewports mit `loading="lazy"` und asynchroner Dekodierung;
- explizite intrinsische Breiten und Höhen für alle Bildreferenzen;
- dimensionsstabile Medienflächen gegen Layout Shifts;
- Systemschrift-Fallback vor Inter;
- `defer` für das einzige Script;
- Animationen verwenden Opacity und Transform;
- keine Video-, Parallax- oder Karusselllast;
- reservierte Medienflächen und feste Seitenverhältnisse gegen Layout Shifts.

Die Website verwendet ausschließlich den lokalen Systemschrift-Stack und lädt keine Webfonts von Drittanbietern.

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

Zusätzlich auf realen Geräten beziehungsweise mit assistiver Technik prüfen:

- VoiceOver/Safari und eine weitere Screenreader-Kombination;
- vollständige Tastaturreihenfolge;
- 200-%-Zoom und benutzerdefinierte Textabstände;
- 320-px-Reflow;
- reale Kontraste nach Einsetzen der Assets;
- Fokus bei realem Hosting und Ankernavigation;
- Alt-Texte der finalen Bilder.

## 10. Externe Launch-Voraussetzungen

Die Website selbst ist vollständig. Vor der öffentlichen Aktivierung bleiben:

- finalen Preis samt Vertragsangaben freigeben oder die neutrale Preisankündigung bestätigen;
- Beta-Endpoint, Empfänger, Rechtsgrundlage, Speicherdauer, Auftragsverarbeiter und Löschprozess festlegen, bevor das Formular aktiviert wird;
- Synology-/Web-Station-Logging tatsächlich prüfen und den Datenschutzhinweis gegebenenfalls konkretisieren;
- Impressum und Datenschutz verantwortlich beziehungsweise rechtlich final abnehmen;
- Domain, TLS und absolute SEO-/Social-Pfade im Produktionsbetrieb verifizieren;
- Beta-Zugang, Trial- und spätere Lizenzlogik außerhalb der statischen Website bereitstellen.

Die vollständige Trennung in Launch-Pflichten und spätere Ergänzungen steht in `WEBSITE_010_FINALIZATION.md`.

## 11. Bewusste Ausschlüsse

- kein aktives Kontakt-, Newsletter- oder Beta-Backend;
- kein Tracking und keine Analytics;
- kein Consent-Banner ohne tatsächlichen Bedarf;
- keine Cookies oder lokale Marketingpräferenzen;
- kein Testimonial ohne belastbare Quelle;
- keine Preisangabe ohne Freigabe;
- keine Lizenzserver-, Trial-, Geräteaktivierungs-, Benutzerkonto- oder Zahlungslogik;
- kein Mailversand und kein externer Bestellprozess;
- kein Deployment.
