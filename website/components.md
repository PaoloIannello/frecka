# FRECKA Komponenten-API

## 1. Status und Zweck

Dieses Dokument definiert die öffentliche API, Semantik und das Verhalten der späteren Website-Komponenten. Es enthält keine Komponentenimplementierung und kein Seiten-Markup.

Verbindliche Markenmetadaten:

- Marke: **FRECKA**
- Claim: **Einfach. Erledigt. Weiter.**
- Logo-Konzept: **D TILE**

Das Logo-Konzept wird hier nur als späterer Asset-Slot berücksichtigt. Es wird nicht gestaltet.

## 2. Namens- und API-Konventionen

### CSS

- Komponentenpräfix: `.c-`, zum Beispiel `.c-button`.
- Layoutpräfix: `.l-`, zum Beispiel `.l-container`.
- Utilitypräfix: `.u-`, nur für kleine eindeutige Hilfen.
- Zustände: `[data-state="…"]`, `[aria-expanded]`, `[aria-current]`, `[aria-busy]` oder native Attribute.
- Varianten: `[data-variant="…"]` statt kombinierter Präsentationsklassen.
- Größen: `[data-size="sm|md|lg"]`.
- JavaScript-Hooks: `[data-js="…"]`; CSS darf nicht von JS-Klassennamen abhängen.

### JavaScript

- Nur progressive Verbesserung.
- Komponenten werden über `data-js` initialisiert.
- Öffentliche Zustände bleiben über native oder ARIA-Attribute inspizierbar.
- Inhalte und Navigation funktionieren ohne JavaScript.
- Keine globalen Eventhandler ohne klaren Owner und Cleanup.

### Inhalt

- Kein interaktives Element ohne sichtbare oder zugängliche Bezeichnung.
- Eine Komponente besitzt genau eine Hauptverantwortung.
- Varianten verändern Darstellung, nicht Bedeutung.
- Komponenten dürfen keine Marketingtexte fest einbauen.

## 3. Layout-Primitives

### `PageShell`

**Selektor:** `.l-page`

**Semantik:** äußerer visueller Wrapper innerhalb von `body`; keine eigene Landmarke.

**API:** keine Varianten.

**Verhalten:** trägt Seitenfarbe und verhindert horizontalen Überlauf nicht durch Abschneiden von Fokus oder Inhalt. Mindesthöhe orientiert sich am dynamischen Viewport.

### `Container`

**Selektor:** `.l-container`

**Varianten:** `data-width="text|content|wide|max"`.

**Verhalten:** zentriert Inhalt, verwendet `--container-gutter` und die passende Containerbreite. Keine feste Gerätebreite.

### `Section`

**Selektor:** `.c-section`

**Semantik:** bevorzugt `section` mit zugänglicher Überschrift; sonst neutraler Wrapper.

**Varianten:** `data-tone="default|subtle|accent|inverse"`, `data-spacing="compact|default"`.

**Slots:** `header`, `body`, optional `actions`.

**Verhalten:** organisiert vertikalen Rhythmus. Farbvarianten müssen alle enthaltenen Komponenten kontrastgerecht behandeln.

### `Stack`

**Selektor:** `.l-stack`

**API:** `data-gap="xs|sm|md|lg|xl"`.

**Verhalten:** vertikale Gruppierung ohne inhaltliche Semantik.

### `Cluster`

**Selektor:** `.l-cluster`

**API:** `data-gap`, `data-align="start|center|end"`, `data-justify="start|between|center"`.

**Verhalten:** horizontale Gruppe mit natürlichem Umbruch.

### `Grid`

**Selektor:** `.l-grid`

**API:** `data-layout="steps|features|media"`, `data-gap`.

**Verhalten:** mobile einspaltig; Spaltenwechsel gemäß `responsive.md`. DOM-Reihenfolge bleibt Lesereihenfolge.

## 4. Typografische Primitives

### `HeadingGroup`

**Selektor:** `.c-heading-group`

**Slots:** optional `eyebrow`, erforderlich `heading`, optional `lead`.

**Varianten:** `data-align="start|center"`, `data-width="compact|reading"`.

**Semantik:** Überschriftenebene wird vom Seitenkontext bestimmt und nie in der Komponente festgelegt.

### `Eyebrow`

**Selektor:** `.c-eyebrow`

**Semantik:** Text, kein Heading und standardmäßig kein Badge.

**Verhalten:** kurze Kontexteinordnung; maximal eine Zeile soweit sprachlich möglich.

### `Lead`

**Selektor:** `.c-lead`

**Varianten:** `data-size="default|hero"`.

**Verhalten:** begrenzte Zeilenlänge; ersetzt keinen normalen Fließtextblock.

## 5. Aktionen

### `Button`

**Selektor:** `.c-button`

**Element:** `button` für Aktionen, `a` für Navigation. Kein `div` als Schaltfläche.

**Varianten:** `data-variant="primary|secondary|ghost|danger"`.

**Größen:** `data-size="sm|md|lg"`; Standard `md`.

**Optionale Slots:** `leading-icon`, `label`, `trailing-icon`.

**Zustände:** native `disabled`, `aria-disabled`, `aria-busy="true"`, Hover, Active, Focus Visible.

**Verhalten:**

- Mindestziel 44 × 44 px, Standardhöhe 52 px, große CTA 64 px.
- Primary nutzt eine grüne Vollfläche; pro Abschnitt höchstens eine dominante Aktion.
- Busy behält Breite, zeigt verständlichen Statustext und blockiert Doppelaktivierung.
- `aria-disabled` verhindert nicht automatisch die Aktivierung; die Logik muss dies übernehmen.
- Icon-only ist nur für etablierte Hilfsaktionen zulässig und benötigt einen zugänglichen Namen.

### `PrimaryButton`

**API:** `Button` mit `data-variant="primary"`.

**Verwendung:** einziger primärer nächster Schritt einer Sektion.

### `SecondaryButton`

**API:** `Button` mit `data-variant="secondary"`.

**Verwendung:** echte Alternative, nicht bloß ein zweiter primärer CTA.

### `TextLink`

**Selektor:** `.c-text-link`

**Varianten:** `data-direction="none|forward|external"`.

**Verhalten:** als Link erkennbar, verständlicher Linktext, externe Ziele bei Bedarf bezeichnet. Keine Bewegung über 3 px.

### `CTAGroup`

**Selektor:** `.c-cta-group`

**Slots:** ein Primary Button, optional ein Text Link oder Secondary Button.

**Verhalten:** mobil vertikal, später horizontal; Primary bleibt zuerst in DOM- und Fokusreihenfolge.

## 6. Status und Kennzeichnung

### `Badge`

**Selektor:** `.c-badge`

**Varianten:** `data-tone="neutral|accent|info|warning"`.

**Semantik:** statischer Kurztext. Bei echtem Status kann ein semantisch passender Container verwendet werden.

**Verhalten:** niemals klickbar, wenn keine Aktion existiert; Farbe ist nicht alleiniger Bedeutungsträger.

### `BetaBanner`

**Selektor:** `.c-beta-banner`

**Semantik:** `aside` oder benannte Region; `role="status"` nur bei dynamischer Statusänderung, nicht pauschal beim Seitenstart.

**Slots:** Statuslabel, kurzer Text, optionaler Link, optional Close Button.

**Zustände:** sichtbar, geschlossen.

**Verhalten:** statisch, nicht laufend, nicht automatisch rotierend. Schließen nur, wenn die Information entbehrlich ist. Persistenz einer Schließung ist optional und datensparsam.

### `Notice`

**Selektor:** `.c-notice`

**Varianten:** `data-tone="info|success|warning|error"`.

**Slots:** Symbol, Titel, Nachricht, optionale Aktion.

**Verhalten:** sichtbares Statuswort plus Symbol; dynamische Meldungen nutzen eine der Dringlichkeit entsprechende Live-Region.

## 7. Navigation

### `SkipLink`

**Selektor:** `.c-skip-link`

**Element:** Link auf die ID des Hauptinhalts.

**Verhalten:** erstes fokussierbares Element; außerhalb des Fokus visuell zurückgenommen, bei Fokus vollständig sichtbar über allen Ebenen.

### `Header`

**Selektor:** `.c-header`

**Semantik:** `header`; enthält eine benannte `nav`.

**Slots:** Brand, Primary Navigation, Header CTA, Menu Button.

**Zustände:** `data-state="default|scrolled"`, optional sticky.

**Verhalten:** Höhenwechsel vermeidet Layoutsprünge. Sticky wird nur eingesetzt, wenn Tests einen Nutzen zeigen.

### `Brand`

**Selektor:** `.c-brand`

**Slots:** später D-TILE-Markenzeichen, Wortmarke FRECKA, optional Claim außerhalb kompakter Navigation.

**Verhalten:** verlinkt auf die Startseite; Bild und Wortmarke ergeben gemeinsam keinen doppelten Screenreader-Text. Bis zur Logoerstellung ist ein Text-Fallback vorgesehen.

### `PrimaryNavigation`

**Selektor:** `.c-nav`

**API:** Liste von Links; aktuelles Ziel mit `aria-current="page|location"`.

**Verhalten:** maximal drei Hauptziele plus separater CTA. Kein Mega-Menü.

### `MenuButton`

**Selektor:** `.c-menu-button`

**API:** `aria-expanded`, `aria-controls`, zugängliche Bezeichnung.

**Zustände:** geschlossen/geöffnet.

**Verhalten:** öffnet mobile Navigation, Escape schließt, Fokus kehrt zum Auslöser zurück. Icon unterstützt die Bezeichnung.

### `MobileNavigation`

**Selektor:** `.c-mobile-nav`

**Zustände:** `hidden`/sichtbar und konsistentes `aria-expanded` am Auslöser.

**Verhalten:** ohne JavaScript bleiben wesentliche Ziele anderweitig erreichbar. Bei dialogartigem Verhalten gelten Fokusbegrenzung, Escape und Hintergrundbehandlung; bei Inline-Verhalten keine unnötige Fokusfalle.

## 8. Hero und Produktdarstellung

### `Hero`

**Selektor:** `.c-hero`

**Slots:** Heading Group, CTA Group, optionale Meta-Zeile, Product Stage.

**Varianten:** `data-layout="stacked|split"`; `split` wird responsiv aktiviert, nicht redaktionell erzwungen.

**Verhalten:** mobil Text vor Produkt. Eine H1. Kein Autoplay, keine rotierenden Claims, kein dekorativer Pflichtinhalt.

### `DeviceMockup`

**Selektor:** `.c-device`

**Varianten:** `data-frame="phone|none"`.

**Slots:** Screenshot.

**Semantik:** rein visueller Rahmen ist assistiv verborgen; der Screenshot behält seine eigene Bildsemantik.

**Verhalten:** kein Herstellerbranding, keine Perspektivrotation, Screenshot bleibt lesbar.

### `ScreenshotFrame`

**Selektor:** `.c-screenshot-frame`

**Slots:** Bild, Caption, optionale Annotation List.

**Varianten:** `data-size="hero|feature|detail"`, `data-frame="device|surface|none"`.

**Verhalten:** feste intrinsische Bildmaße vermeiden Layoutsprünge. Vergrößerung ist optional, stets eine bewusste Aktion und kein Kernzugang.

### `AppScreenshot`

**Selektor:** `.c-app-screenshot`

**API:** Bildquelle, responsive Quellen, Breite/Höhe, Alt-Text oder dekorativer Leertext, Release-/Datensatzfreigabe außerhalb des Markups dokumentiert.

**Verhalten:** fiktive Daten, kein Lazy Loading im Hero; spätere Screens dürfen lazy laden.

### `ScreenshotAnnotation`

**Selektor:** `.c-screenshot-annotation`

**API:** nummerierte Beziehung zwischen Marker und Erklärung.

**Verhalten:** mobil steht die Legende unter dem Bild. Hotspots sind nie der einzige Zugang zur Information.

## 9. Inhaltskomponenten

### `FeatureCard`

**Selektor:** `.c-feature-card`

**Slots:** optional Icon, Titel, Beschreibung, optional Text Link.

**Varianten:** `data-surface="plain|card|subtle"`.

**Verhalten:** gesamter Container wird nur dann klickbar, wenn er genau ein Ziel besitzt. Gleich hohe Karten sind kein Zwang.

### `IconCard`

**API:** `FeatureCard` mit Icon-Slot; kein eigener semantischer Typ.

**Verhalten:** Icon unterstützt den Titel und wird bei Redundanz assistiv verborgen.

### `StepList`

**Selektor:** `.c-step-list`

**Semantik:** geordnete Liste.

**Slots:** genau drei `StepItem` für den Hauptablauf.

**Verhalten:** mobil linear, ab Desktop optional dreispaltig. Keine Sliderlogik.

### `StepItem`

**Selektor:** `.c-step-item`

**Slots:** automatische Listennummer, Titel, Kurztext, optional Medium.

**Verhalten:** statischer Inhalt; keine Auswahlzustände vortäuschen.

### `BenefitList`

**Selektor:** `.c-benefit-list`

**Semantik:** ungeordnete Liste.

**Slots:** maximal vier Benefit Items.

**Verhalten:** mobil linear, ab Tablet höchstens zweispaltig.

### `DataFlow`

**Selektor:** `.c-data-flow`

**Semantik:** geordnete Liste mit klaren Schrittbezeichnungen.

**Slots:** Start, bewusste Aktion, gewähltes Ziel; optionale Einschränkung.

**Verhalten:** mobil vertikal, Desktop optional horizontal. Verbinder sind dekorativ; Bedeutung bleibt im Text.

### `AudienceList`

**Selektor:** `.c-audience-list`

**Semantik:** Liste von Betriebstypen.

**Varianten:** Klartext, statische Pills.

**Verhalten:** natürlicher Umbruch; nicht interaktiv ohne echte Filterfunktion.

### `Quote`

**Selektor:** `.c-quote`

**Semantik:** `figure` mit `blockquote` und `figcaption`.

**Slots:** Zitat, Name, Rolle/Betrieb, optionale Quelle.

**Verhalten:** nur mit belastbarer Freigabe; kein Karussell und keine erfundene Bewertung.

## 10. FAQ

### `FAQ`

**Selektor:** `.c-faq`

**Semantik:** benannte Sektion mit Liste von FAQ Items.

**Verhalten:** Antworten bleiben ohne JavaScript zugänglich. Mehrere Einträge dürfen gleichzeitig geöffnet sein.

### `FAQItem`

**Selektor:** `.c-faq-item`

**Bevorzugte Basis:** natives `details` mit `summary`.

**Zustände:** geschlossen, `open`, Hover, Focus Visible.

**Slots:** Frage, Statusicon, Antwort.

**Verhalten:** gesamte Summary besitzt ein mindestens 44 px hohes Ziel. Icon rotiert nur unterstützend. Keine Antwort wird per `display: none` dauerhaft für assistive Technik unzugänglich gemacht.

## 11. Abschluss und Footer

### `CTASection`

**Selektor:** `.c-cta-section`

**Slots:** Heading Group, ein Primary Button, Folgehinweis.

**Varianten:** `data-tone="subtle|accent|inverse"`.

**Verhalten:** wiederholt den primären Seitenweg; keine neue Botschaft oder konkurrierende Aktion.

### `Footer`

**Selektor:** `.c-footer`

**Semantik:** `footer` mit benannten Linkgruppen.

**Slots:** Brand Summary, Navigation, Hilfe/Kontakt, Rechtliches, Metazeile.

**Verhalten:** mobil linear, später gruppiert. Kein neuer Primary Button. Claim darf hier als Markenmetadatum erscheinen, sofern die Content-Freigabe dies vorsieht.

## 12. Optionale Formkomponenten

Diese APIs werden erst implementiert, wenn ein realer Kontakt- oder Registrierungsprozess einschließlich Datenschutz freigegeben ist.

### `Field`

**Selektor:** `.c-field`

**Slots:** sichtbares Label, Control, Hilfe, Fehler.

**Zustände:** Standard, Focus, Invalid, Disabled, Readonly.

**API:** native `required`, `autocomplete`, `inputmode`, `aria-describedby`, `aria-invalid` passend verwenden.

### `FormStatus`

**Selektor:** `.c-form-status`

**Zustände:** Busy, Success, Error.

**Verhalten:** verständlicher Text; Fokus nach Übermittlung nur versetzen, wenn dies zur Orientierung nötig ist.

## 13. Nicht vorgesehene Komponenten

- Logo-Wand ohne echte Referenzen;
- Statistik-Counter;
- Testimonial- oder Feature-Karussell;
- Chatbot-Blase;
- Countdown;
- magnetischer Button;
- Bento-Karte als universelles Muster;
- Preisumschalter ohne freigegebenes Tarifmodell;
- automatisch öffnendes Marketing-Modal.

## 14. Komponentenabnahme

Eine spätere Komponente ist erst freigegeben, wenn:

- Semantik und zugänglicher Name stimmen;
- alle dokumentierten Zustände existieren;
- sie ab 320 px ohne Überlauf funktioniert;
- Tastatur, Fokus, Zoom und Screenreader geprüft sind;
- Reduced Motion definiert ist;
- sie ohne unnötiges JavaScript funktioniert;
- Token statt lokaler Zufallswerte verwendet werden;
- Inhalt weder eingebaut noch durch Präsentation verfälscht wird.

