# FRECKA Responsive System

## 1. Grundmodell

FRECKA wird mobile-first entwickelt. Mobile ist der vollständige Ausgangszustand, keine reduzierte Desktopfassung. Größere Breiten schaffen mehr Ruhe, bessere Beziehungen zwischen Text und Produkt und kürzere Wege – nicht automatisch mehr Inhalt.

Breakpoints sind in `styles/design-tokens.css` dokumentiert. Da CSS Custom Properties nicht in Media-Query-Bedingungen verwendet werden können, werden die folgenden festen Werte in späteren Stylesheets eingesetzt.

| Modus | Bereich | Media Query | Hauptaufgabe |
| --- | --- | --- | --- |
| Mobile | 0–699 px | Standard, keine Query | linearer, vollständiger Lesefluss |
| Tablet | 700–1023 px | `min-width: 43.75rem` | ausgewählte Zweispaltenbeziehungen |
| Desktop | 1024–1439 px | `min-width: 64rem` | Produkt und Erklärung nebeneinander |
| Große Monitore | ab 1440 px | `min-width: 90rem` | mehr Weißraum bei begrenzten Inhalten |

320 px ist die kleinste verbindlich zu prüfende Layoutbreite. Komponenten dürfen einen eigenen Wechsel später als der globale Breakpoint vornehmen, wenn ihr Inhalt dies erfordert. Sie dürfen nicht anhand von User-Agent oder Gerätetyp umschalten.

## 2. Globale Regeln

- Kein horizontaler Seitenüberlauf bei 320 CSS-Pixeln.
- Dokument- und Fokusreihenfolge bleiben über alle Modi identisch.
- Kein Inhalt wird nur wegen geringer Breite entfernt; er darf verdichtet oder neu gruppiert werden.
- Textvergrößerung und 200-%-Zoom dürfen keinen Funktionsverlust erzeugen.
- Container wachsen bis zu ihrem Maximum und bleiben zentriert.
- Zeilenlängen bleiben begrenzt, auch auf großen Monitoren.
- Touchziele bleiben mindestens 44 × 44 px in allen Modi.
- Hover ist Ergänzung, nie Voraussetzung.
- Bilder besitzen intrinsische Maße und skalieren proportional.
- Fixierte Elemente berücksichtigen Safe Areas und verdecken keinen Fokus.

## 3. Mobile – 0 bis 699 px

### Layout

- Seitenrand 16–20 px über `--space-page-inline`.
- Einspaltiger Hauptfluss.
- Abschnittsabstand fluid, standardmäßig ab 64 px.
- Text- und Mediencontainer nutzen die verfügbare Breite.
- Kartenraster werden zu Listen.
- Text steht vor dem zugehörigen Produktbeleg.

### Komponentenverhalten

| Komponente | Mobile-Verhalten |
| --- | --- |
| PageShell/Container | volle Breite minus Gutter; keine feste Mindestbreite |
| Section | einspaltig; Standard- oder kompakter Blockabstand |
| HeadingGroup | linksbündig; zentriert nur bei nachgewiesenem Anlass; H1 höchstens ca. 10–12 Wörter |
| Button | mindestens 44 px, Standard 52 px; CTA darf volle Breite nutzen |
| CTAGroup | vertikal; Primary zuerst; Abstand mindestens 12 px |
| BetaBanner | ein- bis zweizeilig, nicht sticky, kein Ticker |
| Header | Brand links, Menu Button rechts; Zielhöhe etwa 64–72 px |
| Navigation | geschlossenes mobiles Panel oder wenige direkt sichtbare Ziele; keine Desktoplinks zusammendrücken |
| Hero | Text → CTA → Product Stage; keine überlagerten Screens |
| DeviceMockup | rahmenlos oder sehr schmaler Frame; nahezu volle Inhaltsbreite |
| ScreenshotFrame | Bild lesbar; Annotationen darunter; kein horizontaler Slider |
| StepList | drei Schritte vertikal in Listenreihenfolge |
| FeatureCard/IconCard | einspaltig; nicht jede Information muss eine umrandete Karte sein |
| BenefitList | einspaltig |
| DataFlow | vertikal mit beschrifteten Schritten |
| AudienceList | natürliche Zeilenumbrüche; keine horizontale Laufleiste |
| FAQ | volle Breite; Summary mindestens 52 px hoch; Antwort darunter |
| CTASection | einspaltig; breiter Primary Button |
| Footer | Linkgruppen untereinander; großzügige vertikale Ziele |

### Mobile Sonderfälle

- Bei 320–359 px reduzieren sich Gutter und dekorative Innenabstände, niemals Touchziele oder Lesetext.
- Lange deutsche Wörter dürfen sinnvoll umbrechen; `overflow-wrap` wird vorgesehen.
- Landscape-Smartphones folgen weiterhin der Mobilelogik, wenn die inhaltliche Breite keine Zweispalte erlaubt.
- Safe-Area-Inset wird nur für tatsächlich randnahe oder fixierte Elemente addiert.

## 4. Tablet – 700 bis 1023 px

### Layout

- Seitenrand wächst bis etwa 32 px.
- Container bleiben zentriert.
- Zwei Spalten sind für klar gekoppelte Inhalte möglich.
- Lesetext bleibt auf `--container-text` bzw. `--measure-reading` begrenzt.
- Abschnittsabstände wachsen moderat; keine Desktopleere auf schmalen Tablets.

### Komponentenverhalten

| Komponente | Tablet-Verhalten |
| --- | --- |
| Section | Text/Medium darf zweispaltig werden, wenn beide Seiten ausreichend breit bleiben |
| HeadingGroup | maximale Textbreite bleibt begrenzt; Zentrierung nur für kurze Abschnittsintros |
| CTAGroup | horizontal, wenn Labels ohne Kürzung passen; sonst vertikal |
| Header | Navigation darf sichtbar werden, wenn Brand, Ziele und CTA zusammen passen; sonst Mobilmenü behalten |
| Hero | bevorzugt noch gestapelt bei Portrait; Split nur bei stabilen Spalten von mindestens ca. 300 px |
| DeviceMockup | mittlere feste Maximalbreite; nicht künstlich auf Spaltenhöhe strecken |
| StepList | zwei plus eins wird vermieden; entweder vertikal oder erst bei ausreichender Breite drei Spalten |
| FeatureCard | zweispaltiges Raster möglich |
| BenefitList | zwei Spalten |
| DataFlow | vertikal oder kompakt horizontal, abhängig von Textlängen |
| ScreenshotFrame | Medium und Caption können nicht getrennt werden; Annotationen bleiben unter oder neben dem Bild |
| FAQ | Textbreite begrenzen; weiterhin eine Spalte |
| Footer | zwei bis drei logische Gruppen; Rechtliches bleibt gut lesbar |

### Tablet-Prinzip

Der Wechsel auf zwei Spalten ist eine inhaltliche Entscheidung. Portrait-Tablets dürfen bewusst wie großzügige Mobilelayouts aussehen.

## 5. Desktop – 1024 bis 1439 px

### Layout

- Standardcontainer maximal 70 rem, weiter Produktcontainer maximal 80 rem.
- Seitenrand mindestens 32 px.
- Text/Produkt-Kompositionen dürfen asymmetrisch sein.
- Drei Spalten sind nur für drei kurze gleichartige Schritte zulässig.
- Mehr Breite erzeugt mehr Abstand, nicht längere Textzeilen.

### Komponentenverhalten

| Komponente | Desktop-Verhalten |
| --- | --- |
| Header | Brand, bis zu drei Navigationsziele und CTA in einer stabilen Zeile |
| Navigation | vollständig sichtbar; Menu Button verborgen; aktueller Zustand eindeutig |
| Hero | Split-Layout mit Text links und Product Stage rechts; Verhältnis etwa 5:7 oder 1:1 je Inhalt |
| CTAGroup | horizontal; Primary bleibt optisch dominant |
| DeviceMockup | feste sinnvolle Maximalbreite; keine perspektivische Vergrößerung |
| ScreenshotFrame | große lesbare Darstellung; Caption direkt zugeordnet |
| StepList | drei gleichwertige Spalten; DOM-Reihenfolge links nach rechts |
| FeatureCard | maximal zwei Spalten für ausführliche Inhalte, drei nur bei sehr kurzen Items |
| BenefitList | zwei Spalten; vier Items bilden ein ruhiges 2×2-Raster |
| DataFlow | horizontaler Drei-Schritte-Weg; Text bleibt die primäre Bedeutung |
| AudienceList | umbrochener Cluster oder Klartextzeile; keine Marquee-Bewegung |
| Quote | schmale, eigenständige Lesespalte; kein Slider |
| FAQ | weiterhin eine Lesespalte, optional daneben eine statische Abschnittseinleitung |
| CTASection | Text und Aktion dürfen nebeneinander stehen, wenn Lesereihenfolge klar bleibt |
| Footer | Brandblock plus klar getrennte Linkgruppen; kein dichtes Sitemap-Raster |

## 6. Große Monitore – ab 1440 px

### Layout

- Inhaltsbreiten wachsen nicht über `--container-max` von 90 rem.
- Lesetext bleibt unverändert begrenzt.
- Außenraum wird bewusst größer.
- Schriftgrößen haben durch `clamp()` ihre Obergrenze erreicht.
- App-Screenshots werden nicht über ihre sinnvolle bzw. native Detailgröße skaliert.

### Komponentenverhalten

| Komponente | Große-Monitore-Verhalten |
| --- | --- |
| Header | Inhalte bleiben im Max-Container; keine zusätzlichen Navigationsziele |
| Hero | mehr Außen- und Spaltenraum; Produkt bleibt in realistischer Größe |
| Section | Blockabstand erreicht sein Maximum; keine leeren Zwischenbühnen ohne Inhalt |
| Grid | Spaltenanzahl bleibt gegenüber Desktop stabil; Karten werden nicht vervielfacht |
| ScreenshotFrame | Bild bleibt scharf und begrenzt; umgebender Weißraum darf wachsen |
| FAQ/Fließtext | keine Breitenvergrößerung; bleibt in komfortabler Lesespalte |
| Footer | maximaler Container; Linkgruppen behalten überschaubare Abstände |

### Verbotene Reaktion auf große Breiten

- keine vierte oder fünfte Spalte nur zur Flächennutzung;
- keine vergrößerten Dekorationen hinter dem Inhalt;
- keine überdimensionierten H1-Werte jenseits der Tokenobergrenze;
- kein Vollbreiten-Screenshot mit unscharfer Hochskalierung.

## 7. Komponenteninterne Breakpoints

Komponenten dürfen Container Queries später nutzen, wenn Browser-Support und Fallback geklärt sind. Bis dahin gilt:

- globale Breakpoints sind die Basis;
- ein Komponentenwechsel erfolgt nur, wenn Mindestbreiten für Inhalt und Bedienung erfüllt sind;
- Breitenabhängigkeit wird im Komponentenstylesheet dokumentiert;
- keine einzelne Komponente führt einen zufälligen Breakpoint ohne Begründung ein.

## 8. Responsive Medien

- Hero-Medium lädt priorisiert und nicht lazy.
- Medien außerhalb des ersten Viewports dürfen lazy geladen werden.
- `srcset`/`sizes` liefern passende Pixelgrößen.
- Breite und Höhe oder `aspect-ratio` reservieren Platz.
- Mobile Zuschnitte dürfen anders sein, aber keine andere Aussage erzeugen.
- Alternativtexte beschreiben Zweck, nicht sichtbare Pixelpositionen.
- Device Frames dürfen auf Mobile entfallen.

## 9. Responsive Typografie

- Fluidwerte kommen aus den Typografie-Tokens.
- Body bleibt grundsätzlich 1 rem; keine Verkleinerung zur Platzrettung.
- Meta-Text unterschreitet 0,75 rem nicht und trägt keine zentrale Information bei unzureichendem Kontrast.
- H1 skaliert fluid, bleibt aber in Zeilenlänge und Wortzahl redaktionell begrenzt.
- Überschriften dürfen umbrechen, ohne einzelne verwaiste Wörter durch starre `<br>` zu erzwingen.

## 10. Responsive QA-Matrix

Mindestens prüfen:

- 320 × 568 px;
- 390 × 844 px;
- mobiles Querformat;
- 768 × 1024 px;
- 1024 × 768 px;
- 1280 × 800 px;
- 1440 × 900 px;
- 1920 × 1080 px mit begrenztem Inhaltscontainer;
- 200 % Browserzoom bei 1280 px;
- Textvergrößerung und lange deutsche Beispieltexte.

Bestanden ist ein Modus nur ohne Überlauf, abgeschnittenen Fokus, verdeckten Inhalt, unlesbare Screenshots oder abweichende Fokus-/Lesereihenfolge.

