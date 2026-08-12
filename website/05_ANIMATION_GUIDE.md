# 05 – Animation Guide

## 1. Bewegungsprinzip

FRECKA bewegt sich nur, wenn Bewegung Orientierung, Rückmeldung oder Zusammenhang verbessert.

Die gewünschte Qualität ist:

- unmittelbar;
- weich;
- präzise;
- unaufdringlich;
- physisch plausibel;
- vollständig entbehrlich für das Verständnis.

„Apple-ähnliche Qualität“ bedeutet präzises Timing und hohe Ruhe. Es bedeutet keine kopierten Scrollinszenierungen, keine langen Produktfilme und keine Bewegung um ihrer selbst willen.

## 2. Verbindliche Regeln

1. Kein Element bewegt sich dauerhaft.
2. Keine Animation blockiert Navigation, Lesen oder Aktion.
3. Kein Kerninhalt erscheint ausschließlich durch Scrollanimation.
4. Bewegung startet nicht mit Ton.
5. Große Flächen zoomen oder rotieren nicht.
6. Animationen verändern bevorzugt `opacity` und `transform`, nicht laufend Layoutgrößen.
7. Wege bleiben klein; die meisten Bewegungen liegen zwischen 1 und 8 px.
8. Interaktion reagiert innerhalb von 100 ms sichtbar.
9. `prefers-reduced-motion` wird als funktionale Anforderung behandelt.
10. Die Seite wirkt im statischen Screenshot bereits vollständig und hochwertig.

## 3. Zeitklassen

| Klasse | Dauer | Verwendung |
| --- | ---: | --- |
| Sofort | 0–100 ms | direkte Druck- oder Auswahlrückmeldung |
| Schnell | 120–160 ms | Hover, Fokusbegleitung, Iconzustand |
| Standard | 180–220 ms | Buttonfarbe, Menü, FAQ, kleine Einblendung |
| Ruhig | 240–320 ms | größerer Panel- oder Abschnittsübergang |
| Nicht zulässig | über 400 ms | reguläre UI-Reaktion auf der Landingpage |

Längere Medienübergänge benötigen einen konkreten, separat freigegebenen Grund.

## 4. Easing

### Empfohlene Charaktere

- **Standard ein/aus:** weiches Ease-out, schnelle Reaktion und ruhiges Ankommen.
- **Farbwechsel:** gleichmäßiges Standard-Easing ohne sichtbare Verzögerung.
- **Panel schließen:** leicht schneller als öffnen.
- **Press:** unmittelbar, ohne Nachschwingen.

### Nicht verwenden

- Bounce;
- Elastic;
- starke Federkurven;
- Overshoot;
- lineare lange Bewegung;
- unterschiedliche Kurven ohne funktionalen Grund.

Konkrete CSS-Kurven werden erst in der Implementierung festgelegt und anschließend visuell auf realen Geräten geprüft.

## 5. Bewegungsmatrix

| Element | Auslöser | Bewegung | Dauer | Zweck |
| --- | --- | --- | ---: | --- |
| Primärbutton | Hover | Farbton leicht vertiefen, Schatten minimal ordnen | 160 ms | Interaktivität bestätigen |
| Primärbutton | Active/Press | maximal 1 px nach unten oder Skalierung bis 0,99 | 80 ms | Druckpunkt vermitteln |
| Sekundärbutton | Hover | Hintergrund leicht vertiefen | 160 ms | Interaktivität bestätigen |
| Link | Hover | Farbe/Unterstreichung klarer | 140 ms | Linkstatus zeigen |
| Fokus | Tastaturfokus | Outline sofort bis 120 ms sichtbar | 0–120 ms | Orientierung sichern |
| Mobile Menü | Öffnen | Opacity plus 4–8 px ruhige Verschiebung | 200–240 ms | räumlichen Zusammenhang zeigen |
| Mobile Menü | Schließen | umgekehrter kurzer Übergang | 160–200 ms | Zustand beenden |
| Menüsymbol | Zustand | zwei Zustände sauber überblenden/rotieren, kleinster Weg | 160 ms | geöffnet/geschlossen zeigen |
| FAQ | Öffnen | Inhaltsbereich ruhig freigeben, Icon ändert Zustand | 180–240 ms | Zusammenhang erhalten |
| FAQ | Schließen | leicht schneller zusammenführen | 160–200 ms | Zustand beenden |
| Beta Banner | optional schließen | Opacity, danach Platz kontrolliert freigeben | 180–220 ms | bewusste Aktion bestätigen |
| Screenshot-Vergrößerung | bewusster Klick | dezenter Übergang in Dialogansicht | 220–280 ms | Detailbetrachtung ermöglichen |
| Dialog | Öffnen | Hintergrund abdunkeln, Panel 6 px einblenden | 200–240 ms | Fokuswechsel erklären |
| Dialog | Schließen | Opacity und 4 px Rückweg | 160–200 ms | zum Ursprung zurückführen |
| Formularstatus | nach Absenden | Statusfläche einblenden | 180 ms | Ergebnis mitteilen |
| Skip Link | Fokus | sofort sichtbar | 0 ms | Zugänglichkeit |

Nicht benötigte Elemente werden nicht nur wegen dieser Matrix implementiert.

## 6. Seitenstart

Beim Laden der Seite steht der Hauptinhalt sofort zur Verfügung.

Zulässig:

- eine sehr kurze Opacity-Einblendung des Hero-Inhalts bis 180 ms, wenn sie nicht zu einem sichtbaren Aufblitzen führt;
- maximal 4 px vertikale Bewegung des Produktbelegs;
- Start erst nach vorhandener Darstellung, ohne Inhalte künstlich zurückzuhalten.

Nicht zulässig:

- Logo-Intro;
- Ladeanimation für statische Inhalte;
- gestaffeltes Einfliegen jeder Hero-Zeile;
- Schreibmaschinen-Effekt;
- sich automatisch wechselnde H1;
- animierter Hintergrund;
- erzwungener Mindest-Ladescreen.

Empfehlung: Die erste Version verzichtet vollständig auf eine Hero-Startanimation. Wahrgenommene Geschwindigkeit ist wichtiger als Inszenierung.

## 7. Scrollverhalten

### Zulässig

- natives Scrollen;
- optional sanftes Scrollen für interne Anker, sofern reduzierte Bewegung respektiert wird;
- dezente Abschnittseinblendung nur als Verbesserung, nicht als Voraussetzung;
- optionaler Header-Zustand nach einer klaren Scrollschwelle ohne Größenflackern.

### Nicht zulässig

- Scroll-Jacking;
- horizontales Scrollen als Haupterzählung;
- Parallaxen für Pflichtinhalt;
- pinning ganzer Produktabschnitte über mehrere Viewports;
- Scrollfortschrittsbalken ohne nachgewiesenen Bedarf;
- durch Scrollen gesteuerte Geräte-Rotation;
- große Zoomfahrten;
- automatische Screenshot-Karussells.

## 8. Abschnittseinblendungen

Die bevorzugte Entscheidung lautet: Inhalte stehen statisch. Falls Tests später zeigen, dass eine leichte Einblendung die Orientierung verbessert:

- nur Abschnittsgruppe, nicht jedes Kind einzeln;
- `opacity` plus maximal 6 px vertikal;
- 220–280 ms;
- einmalig beim ersten Eintritt;
- keine langen Stagger-Ketten;
- Inhalt bleibt bei nicht ausgeführtem JavaScript sichtbar;
- bei reduzierter Bewegung vollständig deaktiviert.

## 9. Buttons und Links

- Press-Feedback ist schneller als Hover.
- Text und Icon bewegen sich gemeinsam.
- Pfeilicons dürfen sich bei Hover höchstens 2–3 px in Leserichtung bewegen.
- Schatten wachsen nicht stark an.
- Kein Glanzstreifen fährt über Buttons.
- Kein Button folgt magnetisch dem Cursor.
- Busy-Zustände verändern die Beschriftung verständlich; ein Spinner allein reicht nicht.

## 10. Navigation

- Das mobile Panel öffnet aus der räumlichen Nähe des Headers.
- Der Hintergrund wird nur dann abgedunkelt, wenn das Menü als Dialog funktioniert.
- Fokus wechselt kontrolliert zum geöffneten Bereich und nach dem Schließen zurück.
- Sticky Header, falls später verwendet, wechselt Hintergrund und Schatten einmalig und ohne Sprung.
- Aktive Anker können ihre Textfarbe oder Unterstreichung wechseln; kein wandernder Indikator erforderlich.

## 11. FAQ

- Das Statussymbol dreht oder überblendet mit maximal 160 ms.
- Antwortinhalt öffnet in 180–240 ms.
- Lange Antworten werden nicht mit einer unnatürlich gleichbleibenden Pixelgeschwindigkeit „ausgerollt“.
- Nutzer dürfen mehrere Antworten geöffnet lassen, sofern das semantische Grundelement dies ermöglicht.
- Bei reduziertem Bewegungswunsch wechselt der Zustand ohne Übergang.

## 12. Product Stage und Screenshots

- Screens sind standardmäßig statisch.
- Ein zweiter Zustand wechselt nur durch bewusste Aktion.
- Hotspots pulsieren nicht dauerhaft.
- Optionales Vergrößern startet am geklickten Medium, bleibt aber ohne komplexe Morphing-Abhängigkeit.
- Bildwechsel verwenden kurze Überblendung, keine 3D-Drehung.
- Der Device Frame bewegt sich nicht unabhängig vom Screenshot.

## 13. Mikrofeedback für Formulare

Nur relevant, falls später ein freigegebenes Formular entsteht:

- Fokuszustand sofort;
- Validierung nach sinnvoller Nutzerinteraktion, nicht bei jedem ersten Tastendruck;
- Fehlertext erscheint nahe am Feld ohne Schüttelanimation;
- Erfolg wird als klarer Status gezeigt, nicht mit Konfetti;
- während der Übermittlung bleiben Status und erwartetes Verhalten verständlich;
- nach Fehlern bleibt die Eingabe erhalten.

## 14. Reduced Motion

Bei `prefers-reduced-motion: reduce` gilt:

- Abschnittseinblendungen deaktivieren;
- sanftes Ankerscrollen deaktivieren;
- Parallaxen und große räumliche Übergänge entfallen vollständig;
- Menüs, FAQ und Dialoge wechseln sofort oder per sehr kurzer Opacity-Änderung;
- kein Inhalt startet automatisch;
- Funktion, Fokus und Zustandsverständnis bleiben vollständig erhalten.

Reduced Motion ist kein vereinfachtes Zweitdesign, sondern dieselbe klare Oberfläche ohne unnötige Bewegung.

## 15. Leistungs- und Qualitätsgrenzen

- Animation darf keine zusätzliche schwere Bibliothek begründen.
- Keine JavaScript-Animationsengine.
- Keine Videos oder Lottie-Dateien als Ersatz für verständlichen Inhalt.
- Animationen dürfen keine sichtbaren Layoutsprünge erzeugen.
- Interaktion muss auch auf durchschnittlichen mobilen Geräten flüssig bleiben.
- Animationsprüfung erfolgt mindestens auf iOS Safari und Android Chrome sowie mit Tastatur und reduzierter Bewegung.

## 16. Motion-Abnahme

Jede Animation muss fünf Fragen bestehen:

1. Welchen Zustand oder Zusammenhang erklärt sie?
2. Ist sie kürzer als nötig, aber lang genug, um verstanden zu werden?
3. Bleibt die Funktion ohne Animation vollständig?
4. Wirkt sie auf einem kleinen Smartphone ruhig?
5. Ist die Reduced-Motion-Variante definiert?

Kann Frage 1 nicht konkret beantwortet werden, entfällt die Animation.

