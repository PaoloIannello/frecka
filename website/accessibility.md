# FRECKA Accessibility Standard

## 1. Zielniveau

Die Website orientiert sich verbindlich an **WCAG 2.2, Konformitätsstufe AA**. Barrierefreiheit ist Bestandteil von Design, Inhalt, Komponenten-API, Implementierung und Abnahme.

Das Ziel ist nicht nur formale Konformität. FRECKA soll auch für Menschen mit wenig Softwareerfahrung, eingeschränkter Sehfähigkeit, motorischen Einschränkungen, kognitiver Belastung oder assistiver Technik verständlich und ruhig bedienbar sein.

## 2. Grundprinzipien

### Wahrnehmbar

- Text und Funktionen sind nicht nur über Farbe verständlich.
- Medien besitzen passende Textalternativen.
- Inhalte bleiben bei Zoom und Textvergrößerung vollständig.
- Kontraste werden gemessen, nicht geschätzt.

### Bedienbar

- Alle Funktionen sind per Tastatur erreichbar.
- Fokus ist sichtbar und logisch geführt.
- Touchziele sind ausreichend groß.
- Es gibt keine zeitkritischen oder automatisch wechselnden Pflichtinhalte.

### Verständlich

- Navigation und Benennung bleiben konsistent.
- Sprache ist konkret und jargonarm.
- Zustände, Fehler und nächste Schritte sind eindeutig.
- Interaktionen verhalten sich erwartbar.

### Robust

- Semantisches HTML ist die Basis.
- ARIA ergänzt nur fehlende native Semantik.
- Inhalte funktionieren ohne JavaScript.
- Komponenten werden mit mehreren Browser-/Assistenztechnik-Kombinationen geprüft.

## 3. Semantische Seitenstruktur

- Genau ein sinnvoller `main`-Bereich.
- Ein Skip-Link ist das erste fokussierbare Element.
- `header`, benannte `nav`, `main` und `footer` bilden die Landmarken.
- Pro Seite genau eine H1.
- Überschriften folgen inhaltlicher Hierarchie; Größen werden nicht über falsche Ebenen erzeugt.
- Listen, Schritte, Zitate, Adressen und Tabellen verwenden passende native Elemente.
- `section` besitzt eine zugängliche Überschrift oder wird durch einen neutralen Wrapper ersetzt.
- Kein ARIA-Rollenattribut dupliziert oder verschlechtert native Semantik.

## 4. Farbkontraste

### Mindestanforderungen

- normaler Text: mindestens 4,5:1;
- großer Text: mindestens 3:1 (ab 24 CSS px regulär oder 18,66 CSS px fett);
- Icons, Fokus, Formbegrenzungen und andere bedeutungstragende UI-Grafiken: mindestens 3:1 zum angrenzenden Hintergrund;
- Zustände müssen zusätzlich durch Text, Form oder Symbol kenntlich sein.

### Tokenregeln

- `--color-text` ist Standard für Hauptinhalt.
- `--color-text-soft` und `--color-text-muted` werden vor jeder kleinen oder wesentlichen Verwendung auf dem tatsächlichen Hintergrund geprüft.
- Weiß auf `--color-primary` ist für große, kräftige Buttontexte vorgesehen und vor Freigabe rechnerisch zu bestätigen.
- `--color-primary-soft` trägt bevorzugt dunklen Text, nicht Primärgrün ungeprüft in Kleinschrift.
- Gefahr- und Warnfarben erhalten sichtbare Begriffe oder Symbole.
- Transparenz, Fotografie und Blur dürfen den berechneten Kontrast nicht unvorhersehbar machen.

Kontrasttests werden für Default, Hover, Active, Disabled, Focus und High-Contrast-Präferenzen durchgeführt.

## 5. Fokuszustände

- Alle interaktiven Elemente erhalten einen sichtbaren `:focus-visible`-Zustand.
- Globaler Ausgangspunkt: 3 px Fokus-Halo mit 3 px Offset aus `styles/animation.css`.
- Fokus wird niemals mit `outline: none` entfernt, ohne einen mindestens gleichwertigen Ersatz.
- Fokus muss auf hellen, sanften, grünen und inversen Flächen sichtbar bleiben; bei Bedarf bekommt die Komponente einen zweifarbigen Ring.
- Fokus darf nicht von Sticky Header, Overlays oder `overflow: hidden` abgeschnitten werden.
- Der aktuelle Navigationsort und der Tastaturfokus sind getrennte Zustände.
- Fokusanimationen sind sofort oder sehr kurz; keine pulsierenden Ringe.

## 6. Tastaturbedienung

### Global

- `Tab` bewegt sich in DOM-Reihenfolge durch alle interaktiven Elemente.
- `Shift+Tab` funktioniert vollständig rückwärts.
- Enter aktiviert Links und Buttons entsprechend nativer Semantik.
- Space aktiviert Buttons und native Summary-Elemente entsprechend Browserstandard.
- Keine positive `tabindex`-Reihenfolge.
- Kein Fokus auf rein dekorativen Elementen.
- Keine Keyboard-Falle außerhalb eines echten modalen Dialogs.

### Navigation

- Skip-Link führt zuverlässig zum Hauptinhalt.
- Mobile Menüschaltfläche kommuniziert `aria-expanded` und `aria-controls`.
- Escape schließt ein geöffnetes dialogartiges Menü und gibt Fokus zurück.
- Inline-Menüs benötigen keine künstliche Fokusfalle.
- Ankerziele berücksichtigen mögliche Headerhöhe, damit Überschriften sichtbar bleiben.

### FAQ

- Native `details`/`summary` werden bevorzugt.
- Jede Frage ist vollständig fokussier- und aktivierbar.
- Mehrere Antworten dürfen offen bleiben.
- Statusicon ist nicht separat fokussierbar.

### Dialoge, falls später erforderlich

- Fokus wechselt beim Öffnen sinnvoll in den Dialog.
- Fokus bleibt im modalen Dialog.
- Escape schließt, sofern keine zwingende fachliche Entscheidung besteht.
- Schließen gibt Fokus an den Auslöser zurück.
- Hintergrundinhalt ist nicht interaktiv.

## 7. Screenreader und zugängliche Namen

- Sichtbare Beschriftungen sind bevorzugt auch zugängliche Namen.
- `aria-label` ersetzt keine gut sichtbare Beschriftung, wenn diese möglich ist.
- Icon-only Buttons benötigen einen präzisen Namen, zum Beispiel „Menü öffnen“.
- Zustandsänderungen aktualisieren Name oder ARIA-Zustand nachvollziehbar.
- Aktive Seiten-/Ankerlinks verwenden `aria-current`.
- Dekorative Icons und Device Frames werden mit `aria-hidden="true"` ausgeblendet.
- Bedeutungsvolle Screenshots besitzen zweckbezogene Alt-Texte; Captions dürfen ergänzen, aber nicht unnötig duplizieren.
- Ein Screenshot mit bereits vollständig erklärter, redundanter Bildunterschrift kann einen leeren Alt-Text erhalten, wenn kein Informationsverlust entsteht.
- Live-Regionen werden sparsam verwendet. Statische Beta-Texte erhalten nicht automatisch `role="status"`.
- Dynamische Erfolge sind höflich, dringende Fehler nur bei echter Dringlichkeit assertiv anzukündigen.

## 8. Text und kognitive Zugänglichkeit

- Kurze Sätze, konkrete Verben und bekannte Begriffe.
- Eine Bezeichnung pro Funktion; App und Website verwenden dieselben freigegebenen Wörter.
- Keine unnötigen Abkürzungen.
- Keine künstliche Dringlichkeit, Countdowns oder Angsttexte.
- Linktexte sind außerhalb ihres Absatzes verständlich; kein isoliertes „Mehr“.
- Anweisungen beziehen sich nicht ausschließlich auf Farbe, Form oder Position.
- Absätze bleiben kurz, Listen werden nur bei echter Aufzählung verwendet.
- Anspruchsvolle Daten- oder Sicherheitsthemen werden mit einer verständlichen Zusammenfassung begonnen.

## 9. Zoom, Reflow und Textabstand

- Inhalt bleibt bei 200 % Zoom vollständig nutzbar.
- Reflow funktioniert bei 320 CSS px Breite ohne horizontales Scrollen, ausgenommen echte zweidimensionale Dateninhalte.
- Text bleibt bei benutzerdefinierten Abständen gemäß WCAG 1.4.12 lesbar und vollständig.
- Keine feste Höhe für Textcontainer, Buttons mit mehrzeiligem Text oder FAQ-Antworten.
- `overflow: hidden` wird nicht zum Kaschieren von Layoutproblemen verwendet.
- Pinch-Zoom wird nicht deaktiviert.
- Schriftgröße des Bodytexts beträgt grundsätzlich mindestens 16 CSS px.

## 10. Ziele, Pointer und Gesten

- Interaktive Ziele sind mindestens 44 × 44 CSS px, auch wenn WCAG in Einzelfällen weniger zulässt.
- Zwischen benachbarten kleinen Zielen liegt ausreichender Abstand.
- Keine Funktion verlangt eine komplexe Geste.
- Drag-and-drop besitzt eine alternative Bedienung.
- Hover-Inhalte sind zusätzlich per Fokus und Touch erreichbar oder werden nicht verwendet.
- Bewegung durch Pointer wird nicht eingesetzt.

## 11. Bilder, Icons und Medien

- Keine wichtigen Texte als Bild.
- Produkt-Screenshots enthalten ausschließlich fiktive Daten.
- Alt-Texte erklären den Zweck der gezeigten Ansicht, nicht jedes sichtbare UI-Detail.
- Device Frame und dekorative Schatten bleiben assistiv verborgen.
- Icons besitzen konsistente optische Größe und mindestens 3:1 Kontrast, wenn sie Bedeutung tragen.
- Autoplay-Video ist nicht vorgesehen.
- Falls später Video eingesetzt wird, sind Untertitel, Transkript, Bedienung und Audiodeskription nach Inhalt zu klären.

## 12. Motion Reduction

- `prefers-reduced-motion: reduce` reduziert alle globalen Zeitwerte auf praktisch sofortige Übergänge.
- Scroll Reveal wird vollständig deaktiviert; Inhalt bleibt sichtbar.
- Kein automatisches Scrollen, Parallax, Zoom oder Gerätebewegung.
- Fokus- und Zustandswechsel bleiben klar, auch ohne Bewegung.
- Animation ist nie die einzige Rückmeldung.
- Die Reduced-Motion-Variante wird auf realen Systemeinstellungen geprüft.

## 13. Scroll Reveal und Progressive Enhancement

Der Vertrag in `styles/animation.css` verhindert versteckte Inhalte bei JavaScriptfehlern:

1. `[data-reveal]` ist standardmäßig sichtbar.
2. JavaScript richtet zuerst einen funktionierenden Intersection Observer ein.
3. Erst danach setzt es am Root `data-motion="ready"`.
4. Sichtbare Elemente erhalten `data-reveal-state="visible"`.
5. Bei Reduced Motion wird der Bereitschaftszustand nicht gesetzt oder sofort entfernt.
6. Ohne JavaScript bleibt der gesamte Inhalt sichtbar und lesbar.

## 14. Formulare, falls später freigegeben

- Jedes Feld besitzt ein dauerhaft sichtbares Label.
- `autocomplete`, `type` und `inputmode` passen zum Zweck.
- Pflichtfelder sind textlich und programmatisch gekennzeichnet.
- Hilfe und Fehler sind über `aria-describedby` verbunden.
- Fehler erklären Problem und Korrektur; Eingaben bleiben erhalten.
- Validierung erfolgt nicht aggressiv beim ersten Tastendruck.
- Zusammenfassung mehrerer Fehler steht am Formularanfang und verlinkt zu Feldern, wenn sinnvoll.
- Busy-Zustand verhindert Doppelübermittlung und bleibt verständlich.
- Erfolg wird sichtbar und programmatisch vermittelt.

## 15. Sprache und Dokumentmetadaten

- Dokumentensprache wird korrekt als Deutsch gesetzt.
- Sprachwechsel einzelner fremdsprachiger Passagen werden ausgezeichnet.
- Seitentitel beschreibt Seite und Marke eindeutig.
- Claim und Markenname werden nicht durch unlesbare Logo-Grafik allein vermittelt.
- Abkürzungen, Datumsangaben und Preise werden eindeutig formuliert.

## 16. High Contrast und Systemeinstellungen

- `prefers-contrast: more` verstärkt Text und Rahmen über Tokens.
- Forced Colors werden in der Implementierung gesondert geprüft; Systemfarben und native Controls bleiben nutzbar.
- `color-scheme` wird erst gesetzt, wenn alle Komponenten für das jeweilige Schema vollständig gestaltet sind.
- Die erste Version ist als hochwertiges Light Theme geplant; ein unfertiger Dark Mode wird nicht automatisch aus Systemfarben erzeugt.
- Browser- und Betriebssystem-Zoom sowie größere Standardschriften werden respektiert.

## 17. Prüfprozess

### Automatisiert

- HTML-Validierung;
- Accessibility-Scanner für offensichtliche Semantik-, Name- und Kontrastprobleme;
- Linkprüfung;
- keine Scanner-Freigabe ersetzt manuelle Tests.

### Manuell

- vollständiger Tastaturweg vorwärts und rückwärts;
- Screenreader-Grundfluss mit VoiceOver/Safari und mindestens einer weiteren Kombination;
- 200 % Zoom und 320-px-Reflow;
- Textabstandstest;
- Kontrast aller Zustände;
- Reduced Motion;
- Touchbedienung auf iOS und Android;
- Fokus bei geöffnetem/geschlossenem Menü und FAQ;
- Inhalte ohne CSS und ohne JavaScript auf sinnvolle Reihenfolge prüfen.

## 18. Definition of Done

Eine Komponente oder Seite ist barrierebezogen erst fertig, wenn:

- Name, Rolle, Wert und Zustand korrekt vermittelt werden;
- Tastaturbedienung vollständig ist;
- Fokus sichtbar und unverdeckt bleibt;
- Kontraste in allen Zuständen gemessen wurden;
- 200-%-Zoom, Reflow und Textabstände funktionieren;
- Reduced Motion funktioniert;
- Screenreader-Inhalt verständlich und nicht redundant ist;
- Fehler- und Leerzustände berücksichtigt sind;
- kein Kerninhalt von Bild, Hover, Farbe, Bewegung oder JavaScript abhängt;
- bekannte Abweichungen dokumentiert und vor Veröffentlichung behoben sind.

