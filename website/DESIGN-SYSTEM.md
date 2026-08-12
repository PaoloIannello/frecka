# Designsystem-Grundlage

## 1. Zweck und Quellenlage

Dieses Dokument beschreibt, welche visuellen und interaktiven Prinzipien der bestehenden FRECKA-App auf die Website übertragen werden sollen. Es ist eine Spezifikation, noch keine CSS-Implementierung.

Die Bestandsanalyse unterscheidet:

- **beobachtet:** direkt in der vorhandenen App-Oberfläche und ihren Styles erkennbar;
- **für die Website abgeleitet:** notwendige Erweiterung für längere Marketing- und Informationsseiten;
- **offen:** vor Gestaltung oder Veröffentlichung zu entscheiden.

## 2. Charakter der bestehenden App

Die App wirkt ruhig, freundlich und zweckorientiert. Helle, leicht grünliche Flächen und dunkles Petrol vermitteln Nähe und Verlässlichkeit. Große Rundungen, weiche Schatten und großzügige Touch-Ziele nehmen der Oberfläche technische Härte. Kräftige Überschriften und eindeutige Hauptaktionen geben Halt; kurze Animationen bleiben funktional.

Die UX folgt wiederkehrend diesem Muster:

> Orientierung → eine klare Auswahl → unmittelbare Rückmeldung → nächster sinnvoller Schritt

Für die Website ist diese Klarheit wichtiger als eine pixelgenaue Kopie einzelner App-Screens.

## 3. Farbwelt

### Beobachtete Kernfarben

| Rolle | App-Wert | Verwendung auf der Website |
| --- | --- | --- |
| Hintergrund | `#F5F7F6` | ruhige Seitenfläche |
| Oberfläche | `#FFFFFF` | Karten, Header, hervorgehobene Inhalte |
| sanfte Oberfläche | `#EEF3F1` | sekundäre Bereiche, dezente Hinterlegung |
| Primärtext | `#17322C` | Überschriften und Fließtext mit hoher Priorität |
| Sekundärtext | `#687A75` | ergänzende Texte; Kontrast vor Einsatz prüfen |
| Primär | `#0D6B5B` | CTA, Links, aktive Zustände |
| Primär dunkel | `#075246` | Hover/Active, starke Akzente |
| Primär hell | `#DFF0EB` | Chips, Icons, markierte Flächen |
| Rahmen | `#DBE4E1` | subtile Trennung |
| Gefahr | `#B42318` | ausschließlich Fehler und destruktive Hinweise |

### Website-Regeln

- Primärgrün bleibt gezielt: Aktionen und Orientierung, nicht großflächige Dekoration.
- Weiß und Hintergrundgrau tragen den Großteil der Fläche.
- Dunkler Text statt reinem Schwarz erhält die warme Anmutung.
- Rot ist kein Marketingakzent.
- Neue Farben benötigen eine semantische Rolle und Kontrastprüfung.
- Farbstatus wird nie als einziges Unterscheidungsmerkmal verwendet.

## 4. Typografie

### Beobachtet

Die App nutzt den Stack `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Inter wird im Bestand nicht sichtbar extern geladen; Systemschriften sind damit ein robuster Bestandteil. Überschriften sind sehr kräftig, eng laufend und kompakt. Begleittexte sind zurückhaltender und gut lesbar.

### Website-Hierarchie

- **Display/H1:** prägnant, sehr kräftig, enge Laufweite, kurze Zeilen.
- **H2:** deutlich, aber ruhiger als der Hero; beschreibt jeweils eine Besucherfrage.
- **H3:** komponentennah und konkret.
- **Fließtext:** regulärer bis mittlerer Schnitt, komfortable Zeilenhöhe.
- **Eyebrow/Label:** klein, kräftig, optional versal und mit leichter Laufweite.
- **Buttons:** kräftig und handlungsorientiert; keine Versalienpflicht.

Für Fließtext wird eine maximale Zeilenlänge von ungefähr 65 Zeichen angestrebt. Hero-Überschriften bleiben deutlich kürzer. Eine exakte responsive Typenskala wird erst in der visuellen Entwurfsphase festgelegt; `clamp()` ist dafür zulässig.

## 5. Abstände und Layout

### Beobachtet

- mobile Seitenränder überwiegend 20 px;
- kompakte Rasterabstände häufig 8, 10, 11, 12 oder 14 px;
- Karteninnenräume typischerweise 15 bis 24 px, auf größeren Ansichten bis 34 px;
- erster größerer Layoutwechsel in der App ab 700 px;
- Inhaltsbreite der App maximal etwa 780 px.

### Für die Website abgeleitet

Die Website benötigt mehr Atem und eine breitere Lesebühne als die Arbeitsoberfläche:

- Basiseinheit: 4 px;
- bevorzugte Abstände: 4, 8, 12, 16, 20, 24, 32, 48, 64, 80 und 96 px;
- mobile Seitenränder: 20 px, bei sehr kleinen Geräten mindestens 16 px;
- Inhaltscontainer: Textspalten schmal, kombinierte Medienlayouts breiter;
- Abschnitte werden über Freiraum und Hintergrundwechsel gegliedert, nicht über viele Linien;
- Breakpoints folgen dem Inhalt, nicht bestimmten Gerätemodellen.

## 6. Karten, Flächen und Schatten

### Beobachtet

- Radien: 14 px klein, 20 px mittel, 28 px groß;
- feine grüngraue Rahmen;
- weiche, grünlich getönte Schatten;
- Karten fassen jeweils eine klar abgegrenzte Aufgabe zusammen.

### Website-Regeln

- Radienfamilie 14/20/28 px beibehalten.
- Schatten sparsam und nur zur Ebenentrennung einsetzen.
- Eine Karte braucht einen inhaltlichen Grund; nicht jeden Absatz einkarten.
- Karten gleicher Ebene erhalten konsistente Innenabstände und Ausrichtung.
- Produkt-Screenshots dürfen nicht in dekorativen Geräteattrappen verschwinden; die echte Bedienoberfläche bleibt lesbar.

Beobachtete Schattenreferenzen:

- klein: `0 8px 24px rgba(19, 50, 44, 0.08)`;
- groß: `0 22px 54px rgba(19, 50, 44, 0.12)`.

Die finalen Werte werden im Website-Kontext auf Wirkung und Rendering geprüft.

## 7. Buttons und Links

### Beobachtet

- Standardhöhe mindestens 52 px, primäre Aktion bis 64 px;
- stark gerundete Form mit 14 px Radius;
- kräftige Beschriftung;
- Primärbutton vollflächig grün, sekundär auf sanfter Oberfläche;
- sichtbarer Fokus mit grünem Outline;
- Active-Zustand durch Farbe und minimale Bewegung.

### Website-Regeln

- Mobile Touch-Ziele mindestens 44 × 44 px, bevorzugt 52 px hoch.
- Primärbutton bezeichnet überall denselben Hauptschritt.
- Sekundäraktionen konkurrieren nicht durch gleiche Farbmasse.
- Textlinks bleiben als Links erkennbar und erhalten klare Hover- und Fokuszustände.
- CTA-Texte benennen die Handlung, zum Beispiel „FRECKA kennenlernen“ statt „Mehr“.
- Disabled-Zustände werden nur verwendet, wenn ihr Grund unmittelbar verständlich ist.

## 8. Navigation

### Beobachtet

Die App nutzt eine fixierte, weich schwebende Bottom-Navigation mit fünf klar beschrifteten Zielen. Der aktive Bereich ist durch helle Primärfarbe und dunklen Text eindeutig markiert.

### Übertragung auf die Website

Die Bottom-Navigation wird nicht übernommen, weil eine Informationsseite andere Aufgaben hat. Beibehalten werden:

- wenige, verständliche Ziele;
- sichtbarer aktueller Zustand;
- große Interaktionsflächen;
- ruhige, leicht transparente Oberfläche nur dort, wo Lesbarkeit erhalten bleibt.

Auf Mobilgeräten soll die Website-Navigation kurz bleiben. Ein Menü benötigt eine eindeutige Beschriftung, Fokusführung, Schließmöglichkeit und funktionsfähigen Tastaturweg. Eine dauerhaft schwebende CTA wird nur nach Nutzertest eingesetzt, weil sie Inhalt verdecken und Unruhe erzeugen kann.

## 9. Formensprache und Bildwelt

- Runde Rechtecke, Kreise und Pills bilden die geometrische Basis.
- Icons sind einfach, funktional und stilistisch einheitlich.
- Keine austauschbaren Business-Stockfotos mit gestellten Teamsituationen.
- Bevorzugt werden reale, freigegebene Produktansichten und glaubwürdige Arbeitssituationen aus den Zielbranchen.
- Menschen werden respektvoll und vielfältig gezeigt; Arbeitsumgebungen wirken echt, nicht luxuriös inszeniert.
- Dekoration unterstützt Blickführung und darf keine Funktionen vortäuschen.
- Ein Logo ist ausdrücklich nicht Teil dieser Phase.

## 10. Bewegung

Die App verwendet kurze Einblendungen von etwa 180 ms und berücksichtigt `prefers-reduced-motion`.

Für die Website gilt:

- Animation erklärt Zustand oder Hierarchie, niemals bloß Aktivität.
- Übergänge bleiben kurz und ruhig.
- Kein automatisches Karussell, Scroll-Jacking oder parallaxer Pflichtinhalt.
- Inhalte sind ohne Animation vollständig verfügbar.
- `prefers-reduced-motion` wird respektiert.

## 11. Sprache als Bestandteil des Designs

- kurze Hauptsätze und konkrete Verben;
- Alltagsbegriffe der Zielgruppe vor interner Produktsprache;
- eine Aussage pro Textblock;
- keine Superlative ohne Nachweis;
- keine Angstkommunikation zu Steuern, Datenschutz oder Digitalisierung;
- Fehlermeldungen benennen Problem und nächsten Schritt;
- UI-Bezeichnungen stimmen mit der App überein, sobald eine Oberfläche gezeigt wird.

## 12. Zugänglichkeit

- Zielniveau WCAG 2.2 AA.
- Semantische Reihenfolge bleibt unabhängig vom visuellen Layout korrekt.
- Fokus ist stets sichtbar und wird nicht von fixierten Elementen verdeckt.
- Kontrast wird für jede Text-/Hintergrundkombination geprüft; vorhandene App-Werte sind Referenz, kein automatischer Nachweis.
- Screenshots erhalten zweckbezogene Alternativtexte; rein dekorative Medien werden korrekt ausgeblendet.
- Zoom bis 200 % und Textvergrößerung dürfen Inhalt oder Bedienung nicht verlieren.
- Formulare, falls später erforderlich, verwenden sichtbare Labels, verständliche Hilfe und fehlertolerante Eingaben.

## 13. Offene Designentscheidungen

- Ist Inter als lokal gehosteter Webfont verfügbar und lizenzrechtlich freigegeben, oder bleibt die Website bei Systemschriften?
- Welche existierenden Markenassets dürfen offiziell verwendet werden?
- Welche App-Screens sind inhaltlich stabil und mit vollständig fiktiven Daten für Marketing freigegeben?
- Welches primäre CTA-Ziel ist zum Start tatsächlich verfügbar?
- Benötigt die erste Version Fotografie, oder reichen Produktansichten und abstrakte Flächen?

