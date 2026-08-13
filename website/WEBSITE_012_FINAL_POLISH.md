# WEBSITE-012 – Logo Scaling & Final Polish

Stand: 13. August 2026  
Ergebnis: **GO**

## Änderungsumfang

WEBSITE-012 verändert ausschließlich die responsive Darstellung der bereits eingebundenen FRECKA-Logos in `styles/brand-assets.css`. HTML, Seitenstruktur, Texte, Navigation, Funktionen und Brand-Master bleiben unverändert.

## Alte Logo-Größen

Vor WEBSITE-012 galten über alle Breakpoints dieselben deklarierten Wrappergrößen:

| Einsatz | Breite | Höhe |
| --- | ---: | ---: |
| Header | `7.5rem` / 120 px | `1.25rem` / 20 px |
| Footer | `9.5rem` / 152 px | `1.75rem` / 28 px |

Die getrennt gesetzten Breiten und Höhen entsprachen nicht exakt dem Seitenverhältnis des Produktions-SVGs.

## Neue Logo-Größen

Die Breite wird nun responsiv gesetzt. Die Höhe ergibt sich automatisch aus dem verbindlichen SVG-Seitenverhältnis `1100 / 180`.

| Bereich | Breakpoint | Header | Änderung | Footer | Änderung |
| --- | --- | ---: | ---: | ---: | ---: |
| Mobile | unter 700 px | `8.75rem` / 140 px | +16,7 % | `11.125rem` / 178 px | +17,1 % |
| Tablet | ab 700 px | `8.625rem` / 138 px | +15,0 % | `10.875rem` / 174 px | +14,5 % |
| Desktop | ab 1024 px | `8.5rem` / 136 px | +13,3 % | `10.75rem` / 172 px | +13,2 % |

Die daraus resultierenden Logo-Höhen betragen gerundet:

- Mobile: Header 22,91 px, Footer 29,13 px
- Tablet: Header 22,58 px, Footer 28,47 px
- Desktop: Header 22,25 px, Footer 28,14 px

Die leichte Abstufung verhindert, dass das Logo auf größeren Flächen unverhältnismäßig dominant wirkt. Mobile erhält bewusst die stärkste optische Präsenz.

## Proportionen und Einbindung

- Das Produktions-SVG behält unverändert die `viewBox="0 0 1100 180"`.
- Der Logo-Wrapper verwendet `aspect-ratio: 1100 / 180` und `height: auto`.
- SVG-Objekt und Wrapper sind in jeder Messung deckungsgleich; das Objekt bleibt bei `width: 100%` und `height: 100%`.
- `max-width: 100%` schützt Wrapper und SVG-Objekt in engen Flex- und Grid-Kontexten.
- Ein zusätzliches `object-fit` ist für das eingebettete SVG nicht erforderlich. Das exakte Wrapperformat und die SVG-ViewBox sichern das Seitenverhältnis ohne Streckung oder Zuschnitt.
- Der Abstand zum Claim bleibt unverändert bei `0.3rem` beziehungsweise 4,8 px.
- Die deklarierte Header-Mindesthöhe bleibt unverändert: `4.25rem` auf Mobile/Tablet und `4.75rem` auf Desktop.
- Der Menübutton wurde weder in Größe noch Position oder Verhalten verändert.

## Mobile-Anpassung

Geprüft wurden 320, 375, 390 und 430 px Viewportbreite.

- Header-Logo: 140 × 22,91 px
- Footer-Logo: 178 × 29,13 px
- Header-Gesamthöhe inklusive Border: 69 px, unverändert durch den Eingriff in die Header-Regeln
- Claim jeweils sauber unterhalb des Logos
- keine Überlagerung mit Menübutton, Claim oder Viewportrand
- Mobile Navigation öffnet und schließt weiterhin korrekt; `Escape` schließt und gibt den Fokus an den Menübutton zurück

## Tablet- und Desktop-Anpassung

Geprüft wurden 768, 1024, 1280, 1440 und 1600 px Viewportbreite.

- 768 px: Header 138 × 22,58 px, Footer 174 × 28,47 px
- ab 1024 px: Header 136 × 22,25 px, Footer 172 × 28,14 px
- Desktop-Header-Gesamthöhe inklusive Border: 77 px
- keine Kollision zwischen Marke, Hauptnavigation und Header-CTA
- keine Kollision zwischen Footer-Marke und Footer-Navigation
- Logo bleibt auf großen Monitoren präsent, ohne die ruhige Header- oder Footer-Balance zu dominieren

## Bewusst nicht geändert

- Hero und CTA-Hierarchie
- App-Screens, Device-Rahmen und Bildabmessungen
- Drei-Schritte-Bereich und Datenbereich
- Icons
- Beta-Bereich und Formular
- Pricing/Lizenz
- FAQ
- Impressum und Datenschutz
- Navigation und Sticky-Header-Logik
- Footer-Struktur, Footer-Navigation, Beschreibung, Copyright und Beta-Hinweis
- Accessibility-, Performance- und SEO-Inhalte
- HTML und JavaScript
- Logo-SVG und Brand-Master

## Testergebnisse

| Prüfung | Ergebnis |
| --- | --- |
| Header und Footer bei 320/375/390/430 px | bestanden |
| Header und Footer bei 768/1024 px | bestanden |
| Header und Footer bei 1280/1440/1600 px | bestanden |
| Kein horizontaler Überlauf | bestanden, alle neun Viewports |
| Keine Überlagerung | bestanden |
| Keine abgeschnittenen oder verzerrten Logos | bestanden |
| Wrapper und SVG-Objekt deckungsgleich | bestanden |
| Claim-Abstand | bestanden, konstant 4,8 px |
| Sticky Header | bestanden, Mobile und Desktop |
| Mobile Menü und Escape-Fokusführung | bestanden |
| Impressum und Datenschutz | bestanden bei 320–1600 px, kein Überlauf oder Header-Konflikt |
| Lokale Assetpfade | 39 Referenzen geprüft, vollständig vorhanden |
| Laufzeit-Assetrequests | Logo, Favicon, CSS, JavaScript und Screens mit HTTP 200 |
| Browser-Konsole | 0 Fehler und 0 Warnungen |
| HTML-Struktur | je Seite genau eine H1, keine doppelten IDs |
| JSON-LD | valide parsebar |
| JavaScript-Syntax | bestanden |
| CSS-Struktur | ausgeglichene Blockklammern in allen Stylesheets |
| SVG-XML und ViewBox | valide, unverändert |
| Brand-Master/Produktions-SVG verändert | nein |
| `git diff --check` | bestanden |

## Abschluss

**GO** – Die Logo-Skalierung ist responsiv verbessert. Es bestehen keine bekannten Restfehler oder Regressionen aus WEBSITE-012.
