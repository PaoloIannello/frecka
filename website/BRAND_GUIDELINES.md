# FRECKA Brand Guidelines

## 1. Verbindliche Markenbasis

- **Name:** FRECKA
- **Claim:** Einfach. Erledigt. Weiter.
- **Logo-Konzept:** D TILE
- **Markenwirkung:** ruhig, hochwertig, klar, modern, freundlich, intuitiv und vertrauenswürdig

Dieses Dokument legt die spätere Anwendung fest. Es gestaltet weder das D-TILE-Zeichen noch Wortmarke oder App Icon.

## 2. Logo-System

Das finale System benötigt drei getrennt einsetzbare Bausteine:

1. **D-TILE-Bildmarke:** quadratisches Primärzeichen für App Icon, Favicon und kompakte Anwendungen.
2. **FRECKA-Wortmarke:** typografisch finalisierte Markenschreibweise.
3. **Horizontale Logo-Kombination:** D TILE und Wortmarke als verbindliches Lockup.

Der Claim ist kein fester Bestandteil der Logozeichnung. Er bleibt in der Landingpage Live-Text, damit er lesbar, übersetzbar und barrierefrei bleibt.

Die Bestandteile eines Lockups dürfen nicht frei verschoben, neu gesetzt, gestaucht, gedreht oder in ihren Proportionen verändert werden. Ausschließlich die freigegebenen Masterdateien werden verwendet.

## 3. Logo-Schutzzone

Die Schutzzone wird relativ definiert, damit sie für alle Größen gilt:

- Bezugsmaß **x** ist ein Viertel der sichtbaren Höhe des D-TILE-Zeichens.
- Um Bildmarke, Wortmarke und horizontales Lockup bleibt auf jeder Seite mindestens **1x** frei.
- Für besonders ruhige Anwendungen wie Hero, Social Preview oder Präsentation werden **2x** empfohlen.
- Der Claim steht mindestens **1x** unterhalb des horizontalen Lockups.
- Rahmen, Text, Fotos, Icons und Seitenkanten dürfen nicht in diese Zone ragen.
- Die interne Distanz zwischen D TILE und Wortmarke ist Bestandteil des finalen Lockups und darf nicht verändert werden.

Hintergrundfläche zählt nicht zur Schutzzone. Ein Device-Rahmen oder eine Kartenbegrenzung darf erst außerhalb der Zone beginnen.

## 4. Mindestgrößen

Die Mindestgrößen gelten für eine sauber angelegte SVG-Quelle. Nach Fertigstellung des Logos müssen sie auf realen Displays und im Druck visuell bestätigt werden.

| Anwendung | Digitale Mindestgröße | Druck-Mindestgröße |
| --- | ---: | ---: |
| D-TILE-Bildmarke | 24 × 24 px | 7 × 7 mm |
| FRECKA-Wortmarke | 72 px breit | 22 mm breit |
| horizontales Lockup | 104 px breit | 30 mm breit |
| horizontales Lockup mit sichtbarem Claim daneben/darunter | 144 px breit | 42 mm breit |

Unterhalb dieser Größen wird ausschließlich die D-TILE-Bildmarke verwendet. Der Claim entfällt zuerst. Details des D TILE müssen bei 16 px als Favicon noch eindeutig bleiben; hierfür ist eine optisch angepasste Favicon-Fassung zulässig.

## 5. Light Mode

### Standard

Auf hellen Flächen wird die **positive** Logofassung eingesetzt:

- primäres D-TILE-Zeichen in FRECKA-Grün;
- Wortmarke in FRECKA-Ink;
- Claim als Live-Text in `--color-text-muted`;
- Hintergrund bevorzugt `--color-page`, `--color-surface` oder `--color-surface-subtle`.

### Anforderungen

- Wortmarke und Bildmarke benötigen ausreichend Kontrast zum Hintergrund.
- Auf `--color-primary-soft` ist die positive Fassung zulässig, sofern die finale Messung die Kontur eindeutig bestätigt.
- Keine zusätzliche weiße Logo-Plakette auf ohnehin ruhigen hellen Flächen.

## 6. Dark Mode

Die Landingpage besitzt derzeit kein globales Dark Theme. Die negative Logofassung ist dennoch für dunkle Markenflächen, Social Assets und spätere Anwendungen vorzubereiten.

Auf `--color-ink-950` oder `--color-surface-inverse` gilt:

- **negative** Logofassung verwenden;
- Wortmarke in Weiß;
- D TILE in Weiß oder der ausdrücklich freigegebenen hellen Markenfassung;
- Claim als Live-Text mit mindestens 4,5:1 Kontrast;
- keine automatische CSS-Invertierung der positiven Datei.

Ein späteres Dark Theme benötigt eine vollständige Komponentenprüfung. Das Vorhandensein einer Negativdatei begründet noch keinen Dark-Mode-Support.

## 7. Positiv

Die positive Fassung ist die Standarddatei für helle Hintergründe:

- `frecka-logo.svg`
- `frecka-wordmark.svg`
- `frecka-icon.svg`

Sie verwendet ausschließlich die verbindlichen Markenfarben und keine eingebetteten Rasterbilder, Filter oder Schlagschatten.

## 8. Negativ

Die negative Fassung ist für dunkle Hintergründe bestimmt. Sie wird innerhalb der finalen Marken-Masterdaten gepflegt; WEBSITE-007 definiert dafür keine zusätzliche Produktionsdatei. Die drei verbindlichen Website-SVGs werden nicht per CSS-Filter, Mischmodus oder Opacity automatisch invertiert.

## 9. Monochrom

Monochrome Fassungen dienen technisch eingeschränkten Anwendungen, Prägung, Stempel, Lasergravur und einfarbigem Druck. Sie werden innerhalb der Marken-Masterdaten gepflegt; WEBSITE-007 definiert dafür keine zusätzliche Website-Datei. Zulässige Farben sind 100 % FRECKA-Ink, 100 % Schwarz oder 100 % Weiß – abhängig vom Medium. Keine Grauverläufe, Konturlösungen oder halbtransparenten Bestandteile.

## 10. Einsatz auf Bildern

- Logo nur auf ruhigen Bildzonen mit ausreichend gleichmäßigem Kontrast platzieren.
- Schutzzone von mindestens 2x verwenden.
- Positive Fassung auf hellen, negative Fassung auf dunklen Bildbereichen einsetzen.
- Wenn das Motiv keinen sicheren Kontrastbereich bietet, eine ruhige, einfarbige Markenfläche außerhalb des Fotos verwenden.
- Keine Schatten, Glows, Outlines oder halbtransparenten Plaketten zur nachträglichen Rettung schlechten Kontrasts.
- Logo niemals über Gesichtern, Händen, wichtigen Arbeitsdetails oder App-Inhalten platzieren.
- Bild nicht künstlich abdunkeln oder einfärben, nur um das Logo sichtbar zu machen.

## 11. Claim-Regeln

Verbindliche Schreibweise:

> Einfach. Erledigt. Weiter.

- Großschreibung und drei Punkte bleiben unverändert.
- Keine Zeilenumbrüche innerhalb einzelner Wörter.
- Bevorzugt eine Zeile; auf schmalen Anwendungen sind zwei Zeilen zulässig.
- Kein Ausrufezeichen, Gedankenstrich oder zusätzlicher Untertitel.
- Der Claim bleibt Live-Text, außer in statischen Social- oder Druckassets, deren Text final geprüft wurde.
- Mindestabstand zum Logo: 1x.
- Claim ist immer leiser als die Wortmarke und wird nicht fetter als `700` gesetzt.
- Claim nicht ohne FRECKA-Absender als alleinstehende Kampagnenzeile verwenden.
- Der Claim darf nicht in Fließtext abgewandelt werden.

## 12. Icon-Regeln

### D-TILE-App- und Browsericons

- Ausgangspunkt ist ausschließlich die finale D-TILE-Bildmarke.
- Das Zeichen wird optisch, nicht mathematisch, im Quadrat zentriert.
- Sichere Innenzone für App Icons: zentrale 66 % der Fläche.
- Wichtige Details bleiben innerhalb der zentralen 60 %, damit adaptive Android-Masken sie nicht beschneiden.
- iOS-Dateien besitzen keine transparente Außenkante, wenn die Plattform eine vollflächige Grafik erwartet.
- Adaptive Android Assets werden in Vordergrund und Hintergrund getrennt geliefert.
- Keine abgerundeten Ecken in der Masterdatei erzwingen; Betriebssystemmasken erzeugen die Geräteform.
- Keine Beschriftung „FRECKA“ im App Icon.
- Keine Schlagschatten, fotografischen Texturen oder 3D-Effekte.

### UI-Icons

- UI-Icons sind nicht Teil des Logosystems.
- Reduzierte Outline-Sprache mit einheitlicher Strichstärke und gerundeten Enden.
- Icons unterstützen Text und ersetzen zentrale Beschriftungen nicht.
- Keine Mischung aus D TILE und Funktionsicon.

## 13. Farbdefinitionen

### Primärpalette

| Rolle | HEX | RGB | Einsatz |
| --- | --- | --- | --- |
| FRECKA Grün | `#0D6B5B` | 13, 107, 91 | Bildmarke, primäre Aktionen, Orientierung |
| FRECKA Grün dunkel | `#075246` | 7, 82, 70 | Hover, aktive Zustände, dunklere Markenfassung |
| FRECKA Grün tief | `#06463C` | 6, 70, 60 | Press-Zustand, technische Sonderfälle |
| FRECKA Grün hell | `#DFF0EB` | 223, 240, 235 | sanfte Markenflächen |
| FRECKA Ink | `#17322C` | 23, 50, 44 | Wortmarke und Haupttext |
| FRECKA Ink tief | `#102722` | 16, 39, 34 | dunkle Markenfläche |
| FRECKA Off-White | `#F5F7F6` | 245, 247, 246 | primärer heller Hintergrund |
| Weiß | `#FFFFFF` | 255, 255, 255 | negative Wortmarke, Karten und helle Details |

### Anwendungsregeln

- Primärgrün bleibt Akzent und wird nicht als großflächige dekorative Farbe verwendet.
- Wortmarke steht standardmäßig in Ink, nicht in Primärgrün.
- Rot und Amber sind Statusfarben und keine Markenfarben.
- Keine neuen Logo-Farben ohne Erweiterung dieser Guideline.
- Verläufe sind im Logo nicht zulässig.
- Digitale Exportdateien verwenden sRGB.
- Druckdaten benötigen nach finaler Logoentwicklung definierte CMYK- und gegebenenfalls Pantone-Entsprechungen; diese werden nicht aus HEX-Werten ungeprüft abgeleitet.

## 14. Typografie-Regeln

- Primärschrift digital: Inter.
- Systemfallback: `ui-sans-serif`, System UI, `-apple-system`, BlinkMacSystemFont, Segoe UI, Sans-Serif.
- Wortmarke wird ausschließlich als finale Vektordatei verwendet; sie wird nicht durch normalen Inter-Text nachgebaut.
- Headlines: Inter 800–900, enge Laufweite, kurze Zeilen.
- Zwischenüberschriften: Inter 700–800.
- Fließtext: Inter 400–500.
- Labels und Buttons: Inter 700–800.
- Claim: Inter 600–700, keine Versalien.
- Text bleibt linksbündig; Zentrierung ist kurzen, bewusst ruhigen Gruppen vorbehalten.
- Keine zusätzlichen Display-, Serif- oder Handschriftschriften.
- Keine künstliche Kursivstellung oder Software-Synthese fehlender Schriftschnitte.
- Typografische Inhalte bleiben HTML-Text. Text als Bild ist nur in final abgenommenen Social- oder Druckassets zulässig.

## 15. Nicht zulässige Anwendungen

- Logo strecken, stauchen, drehen oder anschneiden;
- eigene D-TILE-Varianten erstellen;
- Wortmarke neu tippen;
- Logo mit Schatten, Glow, Kontur oder Verlauf versehen;
- Farben außerhalb der freigegebenen Fassungen;
- Claim umformulieren oder in das Logo-SVG integrieren;
- Logo in einer Karte einsperren, wenn keine Kontrastnotwendigkeit besteht;
- App Icon mit zusätzlichem Text oder Plattformbadge versehen;
- Positivdatei automatisch invertieren;
- Logo auf unruhigem Foto ohne gesicherten Kontrast verwenden.

## 16. Freigabekriterien

Vor Einsatz müssen alle Logo- und Icondateien geprüft sein auf:

- korrekte D-TILE-Geometrie;
- unveränderte Lockup-Proportionen;
- sichtbare Schutzzone;
- Lesbarkeit in Mindestgröße;
- Light-/Dark-Kontrast;
- saubere SVG-Pfade ohne eingebettete Schriften oder Rasterdaten;
- reduzierte Dateigröße ohne Geometrieverlust;
- konsistente sRGB-Farben;
- passende Transparenz;
- Rechte und Markenschutz;
- visuelle Prüfung in Header, Footer, Favicon, App Icon und Social Preview.
