# WEBSITE-012 – Logo Scaling & Final Polish

Stand: 13. August 2026  
Nachkorrektur: Logo-Präsenz nach realem iPhone-Test
Ergebnis: **GO**

## Änderungsumfang

Die Nachkorrektur verändert ausschließlich die Darstellung der bestehenden FRECKA-Marke in Header und Footer. Betroffen sind `styles/brand-assets.css` und diese Dokumentation. Logo-SVG, Brand-Master, HTML, Seitenstruktur und JavaScript bleiben unverändert.

## Ursache der zu geringen sichtbaren Größe

Die erste WEBSITE-012-Korrektur skalierte den vollständigen SVG-Viewport korrekt, nicht aber die darin deutlich kleinere sichtbare Grafikfläche.

- SVG-ViewBox: `0 0 1100 180`
- gemessene sichtbare Grafikgrenze: ungefähr `x=52–677,65` und `y=27,66–156`
- sichtbare Grafikfläche: ungefähr `625,65 × 128,34` SVG-Einheiten
- sichtbarer horizontaler Anteil an der ViewBox: nur rund 56,9 %
- transparente Restfläche rechts: rund 422 SVG-Einheiten beziehungsweise 38,4 % der gesamten ViewBox

Dadurch erzeugte die mobile Header-Breite von 140 CSS-Pixeln real nur ungefähr 79,63 sichtbare Marken-Pixel. Im Footer ergaben 178 CSS-Pixel nur ungefähr 101,24 sichtbare Marken-Pixel.

| Zwischenstand vor der Nachkorrektur | Äußerer SVG-Viewport | Tatsächlich sichtbarer Inhalt |
| --- | ---: | ---: |
| Header Mobile | 140 × 22,91 px | ca. 79,63 × 16,33 px |
| Footer Mobile | 178 × 29,13 px | ca. 101,24 × 20,77 px |

## Technische Lösung ohne Änderung des Brand-Masters

Der vollständige SVG-Inhalt bleibt unverändert. Ein CSS-Sichtfenster blendet ausschließlich transparente ViewBox-Ränder aus:

- Sichtfenster innerhalb der ViewBox: `x=32–700`, `y=16–168`
- Sichtfenstergröße und Seitenverhältnis: `668 × 152`
- Sicherheitsraum um den gemessenen Inhalt: links 20, rechts 22,35, oben 11,66 und unten 12 SVG-Einheiten
- das Original-SVG bleibt intern im Verhältnis `1100 / 180`
- das SVG-Objekt wird proportional auf `164,670659 %` der Sichtfensterbreite skaliert
- Positionierung: `left: -4,790419 %`, `top: -10,526316 %`
- `overflow: hidden` entfernt nur transparente Außenfläche; Symbol und Wortmarke bleiben vollständig sichtbar

Damit wird weder die SVG-Geometrie verändert noch die Marke gestreckt. Das Seitenverhältnis des Originals bleibt erhalten.

## Neue sichtbare Markenpräsenz

| Bereich | Sichtfenster | Internes SVG-Objekt | Sichtbarer Markeninhalt | Zuwachs zum Zwischenstand |
| --- | ---: | ---: | ---: | ---: |
| Header Mobile | 113 × 25,71 px | 186,07 × 30,45 px | 105,83 × 21,71 px | +32,9 % |
| Footer Mobile | 144 × 32,77 px | 237,13 × 38,80 px | 134,87 × 27,67 px | +33,2 % |
| Header Tablet | 112 × 25,48 px | 184,43 × 30,17 px | 104,90 × 21,52 px | +33,6 % |
| Footer Tablet | 142 × 32,30 px | 233,83 × 38,26 px | 133,00 × 27,27 px | +34,4 % |
| Header Desktop | 111 × 25,25 px | 182,78 × 29,91 px | 103,96 × 21,33 px | +34,4 % |
| Footer Desktop | 138 × 31,40 px | 227,24 × 37,18 px | 129,25 × 26,51 px | +32,1 % |

Die kleinere äußere CSS-Breite ist beabsichtigt: Sie beschreibt nun das transparente Sichtfenster und nicht mehr die vollständige, weitgehend leere SVG-ViewBox. Entscheidend ist der gemessene sichtbare Markeninhalt.

## Claim und Header-Höhe

- Mobile und Tablet: Claim von 12 auf 12,5 px angehoben (+4,2 %)
- Desktop: Claim bleibt bei 12 px
- Farbe, Gewicht und Abstand von 4,8 px bleiben unverändert
- der Claim bleibt dadurch sichtbar untergeordnet
- Header-Gesamthöhe inklusive Border bleibt bei 69 px auf Mobile und 77 px auf Desktop
- eine zusätzliche Header-Erhöhung war nach dem Realtest nicht erforderlich
- Menübutton bleibt vollständig unverändert

## Desktop-Entscheidung

Desktop wurde ebenfalls korrigiert, weil die sichtbare Header-Marke dort trotz 136 px äußerer SVG-Breite nur rund 77,35 px breit war. Die neue sichtbare Breite von rund 103,96 px bleibt zurückhaltend, ist aber als Marke klarer wahrnehmbar.

## Bewusst nicht geändert

- Logo-SVG und Brand-Master
- HTML und JavaScript
- Menübutton, Navigation und Sticky-Header-Logik
- Footer-Struktur, Beschreibung, Navigation, Copyright und Beta-Hinweis
- Hero, App-Screens und Device-Rahmen
- Drei-Schritte- und Datenbereich
- Icons
- Beta, Pricing/Lizenz und FAQ
- Impressum und Datenschutz
- Accessibility-, Performance- und SEO-Inhalte

## Testergebnisse

| Prüfung | Ergebnis |
| --- | --- |
| Header und Footer bei 320/375/390/430 px | bestanden |
| Tablet/Desktop bei 768/1024/1440/1600 px | bestanden |
| Sichtbare mobile Logo-Präsenz | Header +32,9 %, Footer +33,2 % |
| Sichtbarer Markeninhalt vollständig innerhalb des Sichtfensters | bestanden |
| Mobiler Sicherheitsraum Header | links 3,39 px, rechts 3,78 px, oben 1,98 px, unten 2,03 px |
| Mobiler Sicherheitsraum Footer | links 4,32 px, rechts 4,81 px, oben 2,52 px, unten 2,58 px |
| Original-Seitenverhältnis | bestanden, gemessen 6,1116:1 |
| Kein horizontaler Überlauf | bestanden, alle geprüften Viewports |
| Keine Header-, Claim-, Menü- oder Footer-Überlagerung | bestanden |
| Header-Höhe Mobile | 69 px |
| Claim-Abstand | konstant 4,8 px |
| Impressum und Datenschutz bei 320/430 px | kein Überlauf, keine Header-Kollision |
| Lokale Assetrequests | HTTP 200 |
| Browser-Konsole | 0 Fehler und 0 Warnungen |
| JavaScript-Syntax | bestanden |
| CSS-Struktur | bestanden |
| SVG-XML und ViewBox | valide und unverändert |
| `git diff --check` | bestanden |

## Abschluss

**GO** – Die FRECKA-Marke besitzt nun im realen mobilen Layout rund ein Drittel mehr tatsächlich sichtbare Präsenz. Es bestehen keine bekannten Restfehler oder Regressionen aus der Nachkorrektur.
