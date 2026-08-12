# FRECKA Landingpage – Design Review RC2

## 1. Review-Auftrag

RC2 ist kein Redesign. Struktur, Inhalte, Bereiche und Produktumfang von RC1 bleiben erhalten. Der Review behandelt die Seite als Produktoberfläche: Jede visuelle Entscheidung soll Orientierung, Lesbarkeit oder Vertrauen verbessern.

Die Leitfrage für jede Änderung war:

> Wird FRECKA dadurch schneller verständlich – oder nur sichtbarer?

Nur Änderungen mit einem klaren Beitrag zu Verständnis, Ruhe oder Bedienqualität wurden übernommen.

## 2. Review-Ergebnis

RC1 besaß bereits die richtige Informationsarchitektur und eine passende Markenbasis. Die größten Qualitätsreserven lagen nicht in fehlenden Elementen, sondern in vier systemischen Punkten:

1. Die Desktopcontainer nutzten trotz `wide`-Kennzeichnung technisch weiterhin nur die Standardbreite.
2. Mehrere Oberflächen hatten ähnlich starke Karten- und Schattenwirkung.
3. Der Hero enthielt eine dekorative Farbfläche, die mit dem Produktbeleg konkurrierte.
4. Navigation und FAQ unterschieden Zustände funktional, aber noch nicht mit der gewünschten Präzision.

RC2 korrigiert diese Punkte und macht die Ebenen eindeutiger: Marke und Aussage zuerst, Produkt als Beweis, Details erst danach.

## 3. Typografie

### Tatsächliche Schriftschnitte

Die Tokenwerte `650`, `750` und `850` wurden auf `600`, `700` und `800` normalisiert. Diese Schnitte werden von der eingebundenen Inter-Konfiguration tatsächlich geladen. Das verhindert unvorhersehbares Font-Matching und erzeugt klarere, konsistente Gewichtsstufen.

### Überschriften

- Die H1 skaliert nun etwas stärker und erreicht auf großen Ansichten eine kontrollierte Obergrenze von 4,875 rem.
- Die maximale H1-Zeilenlänge wurde von 11 auf 10,5 Zeichenbreiten reduziert. Das stärkt den Satzcharakter und verhindert einen zu breiten Desktopblock.
- H2-Zeilen wurden auf 16 Zeichenbreiten begrenzt. Abschnitte wirken dadurch wie klare Gedanken statt wie breite Bannertexte.
- Die responsive H2-Skala wurde leicht angehoben, ohne auf Mobilgeräten übergroß zu werden.
- Die Body-Zeilenhöhe wurde auf 1,625 erweitert. Vor allem FAQ, Nutzen und Datenhinweise erhalten mehr Ruhe.
- Der Claim im Header verwendet nun die dokumentierte Mindestgröße für Metatext und bleibt auch auf kleinen Displays lesbar.

### Begründung

Premiumwirkung entsteht hier nicht durch maximal große Schrift, sondern durch kontrollierte Zeilen, echte Gewichtsstufen und erkennbare Pausen zwischen Behauptung und Erklärung.

## 4. Weißraum und vertikaler Rhythmus

- Der mobile Abschnittsrhythmus beginnt nun bei 72 statt 64 px.
- Große Abschnitte wachsen fluid bis 144 px, kompakte Abschnitte bis 104 px.
- Heading Groups erhalten einen responsiven Abschlussabstand statt eines festen Werts.
- Hero, Arbeitsalltag, Datenbereich, FAQ und Footer verwenden jeweils inhaltlich passende, fluide Abstände.
- Die Abschlussmetazeile des Footers wurde weiter vom Hauptfooter getrennt.

### Begründung

Nicht jeder Abschnitt benötigt dieselbe Höhe. Der Hero braucht Konzentration, erklärende Abschnitte brauchen Atem und der Footer einen deutlichen Abschluss. RC2 nutzt ein gemeinsames Spacing-System, aber keinen mechanisch identischen Rhythmus.

## 5. Container und horizontale Ausrichtung

### Behobener RC1-Punkt

Die Varianten `text`, `wide` und `max` setzten zuvor nur `max-width`, während die geerbte tatsächliche Breite weiterhin auf `--container-content` begrenzt blieb. Dadurch erreichten Wide-Layouts nie ihre geplante Breite.

RC2 gibt jeder Variante eine eigene berechnete Breite:

- Text: 40 rem;
- Content: 70 rem;
- Wide: 82 rem;
- Max: 92 rem.

Auf großen Monitoren dürfen Hero, Arbeitsalltag und Datenbereich bis zur Max-Breite wachsen. Textmaße bleiben davon unberührt.

### Begründung

Desktop wird nicht durch größere Schrift oder mehr Spalten eigenständig, sondern durch bessere Beziehungen zwischen Text, Produkt und freier Fläche.

## 6. Schatten, Flächen und Radien

- Globale Schatten wurden als dezente, zweistufige Schatten neu definiert.
- Kleine Ebenen besitzen jetzt eine klare Nahschattenkante und eine sehr leichte Tiefenkomponente.
- Der Produktbeleg bleibt die tiefste helle Fläche, ohne wie eine schwebende Werbekarte zu wirken.
- Nicht interaktive Nutzeninhalte erhalten keine künstlichen Hover- oder Lift-Effekte.
- Die bestehende Radiusfamilie 14/20/28 px bleibt unverändert.

### Begründung

Schatten erklären Ebenen. Sie werden nicht als Qualitätsdekoration verwendet. Die unveränderte Radiusfamilie erhält die Nähe zur App.

## 7. Hero

### Verbesserungen

- Die dekorative grüne Hero-Blase wurde vollständig entfernt.
- Die H1 ist stärker, aber enger geführt.
- Lead, Aktionen und Meta-Hinweis besitzen klarere Abstände.
- Der primäre Button hat einen leichteren Schatten und wirkt weniger werblich.
- Der sekundäre Textlink ordnet sich mobil bewusst unter.
- Die Product Stage wurde breiter, gleichzeitig flacher und transparenter gestaltet.
- Device-Schatten bestehen nun aus Nah- und Tiefenebene; das Gerät wirkt präziser statt dramatischer.
- Auf Desktop verschiebt sich das Spaltenverhältnis zugunsten des Produktbelegs, ohne den Text zu schwächen.
- Auf großen Monitoren steht das Device bewusst am rechten Rand der Produktbühne.

### Begründung

Der Hero soll keine Stimmung illustrieren. Er soll eine klare Aussage machen und unmittelbar zeigen, dass ein verständliches Produkt dahintersteht.

## 8. Navigation

### Verbesserungen

- Die Navigation ist nun auf allen Größen sticky.
- Im Ausgangszustand bleibt der Header leicht und nahezu flächenlos.
- Nach 12 px Scrollweg erhält er eine dichtere Oberfläche, feine Trennkante und minimalen Schatten.
- Der Scrollzustand wird über einen passiven Listener und `requestAnimationFrame` gesetzt.
- Die Headerhöhe wurde kompakter abgestimmt.
- Desktoplinks verwenden eine kurze, ruhige Unterstreichung statt eines flächigen Hover-Pills.
- Das mobile Menü behält seine große Bedienfläche, wirkt aber weniger kartenhaft.

### Begründung

Die Navigation soll verfügbar bleiben, ohne permanent Aufmerksamkeit zu beanspruchen. Der Zustandswechsel erklärt die neue Ebene erst, wenn Inhalt unter ihr scrollt.

## 9. Drei-Schritte-Bereich

### Verbesserungen

- Kartenabstände wurden vergrößert.
- Jede Karte besitzt eine kurze primärgrüne Oberkante als visuellen Startpunkt.
- Nummern sind größer, leichter und durch einen feinen Rahmen präziser gefasst.
- Mini-Screens erhalten eine eigene subtile Innenkante.
- Auf Desktop besitzen alle Karten einen stabilen vertikalen Aufbau und eine gemeinsame Mindesthöhe.
- Visualisierungen richten sich am Kartenende aus; Überschrift und Erklärung bleiben dadurch horizontal vergleichbar.

### Begründung

Die drei Schritte sind kein Featuregrid, sondern ein linearer Vorgang. Nummer, Titel und visualisierter Zustand müssen daher schneller als zusammengehörige Sequenz gelesen werden.

## 10. Produktvorteile

### Verbesserungen

- Mobile Vorteile werden als großzügige redaktionelle Einträge statt als kompakte Karten behandelt.
- Titel und Text besitzen längere innere Abstände und eigene Maximalbreiten.
- Die Nummer steht näher am Titel und bildet eine klare kleine Hierarchie.
- Das zweispaltige Layout erhält mehr kontrollierten Zwischenraum.

### Begründung

Nutzenargumente brauchen keine zusätzliche Kartenbühne. Die redaktionelle Behandlung wirkt ruhiger und lässt den Inhalt wichtiger erscheinen als seine Verpackung.

## 11. Arbeitsalltag

### Verbesserungen

- Text und Medienslot erhalten größere, responsive Distanz.
- Der Lead wird deutlicher von Überschrift und Ergänzung getrennt.
- Der mobile Medienslot ist höher und damit weniger bannerartig.
- Der Platzhalterschatten wurde zurückgenommen.

### Begründung

Dieser Abschnitt soll wie eine ruhige Beobachtung aus dem Arbeitsalltag wirken. Die Text-/Medienbeziehung braucht deshalb mehr Raum als ein klassischer Featureblock.

## 12. Datenkontrolle

### Verbesserungen

- Die Hintergrundfarbe wurde auf das tiefere Ink-950 gesetzt.
- Der zentrale Datenhinweis ist nun eine eigenständige, aber zurückhaltende Vertrauensfläche.
- Die drei Datenwegschritte stehen als separate, klar lesbare Karten statt in einem einzigen Container mit Trennlinien.
- Symbole und Innenabstände wurden vergrößert.
- Text und Datenweg erhalten auf breiten Ansichten deutlich mehr Abstand.

### Begründung

Vertrauen entsteht durch nachvollziehbare einzelne Entscheidungen. Drei eigenständige Schritte sind schneller erfassbar als ein dekoratives Gesamtdiagramm.

## 13. Zielgruppen

- Pills besitzen mehr Innenraum und Abstand.
- Die Liste bleibt statisch, nicht interaktiv und ohne Animation.
- Die Zentrierung bleibt erhalten, weil es sich um eine kompakte Bestätigung und nicht um einen längeren Inhaltsabschnitt handelt.

## 14. FAQ

### Verbesserungen

- FAQ-Einträge sind jetzt einzelne ruhige Oberflächen mit 20-px-Radius.
- Der offene Zustand erhält eine feinere Primärrahmung und einen leichten Schatten.
- Summary-Flächen sind etwas höher und besitzen bessere horizontale Abstände.
- Antworttexte erhalten eine klare Einrückung relativ zum Statussymbol.
- Moderne Browser nutzen `::details-content` für einen kurzen Blockgrößen- und Opacity-Übergang.
- Browser ohne diese Unterstützung behalten das vollständig funktionale native Öffnen und Schließen.
- Reduced Motion setzt den Übergang weiterhin auf praktisch sofort.
- Der Fokus bleibt sichtbar; der Container schneidet die Outline nicht ab.

### Begründung

Die FAQ bleibt eine native, robuste Interaktion. Die Animation verfeinert nur den Zustandswechsel und wird nicht zur Funktionsvoraussetzung.

## 15. CTA-Hierarchie

- Der Primärbutton bleibt der einzige dominante CTA.
- Sein Schatten wurde reduziert.
- Der sekundäre Hero-Link ordnet sich mobil in der Mitte unter, statt wie ein zweiter breiter Button zu wirken.
- Die Abschluss-CTA bleibt inhaltlich und visuell unverändert priorisiert; es wurde kein weiterer Konversionsweg ergänzt.

## 16. Footer

### Verbesserungen

- Größerer oberer Weißraum und eine feine Abschnittskante schaffen einen professionellen Abschluss.
- Linkgruppen erhalten mehr Abstand zum Markenblock.
- Die Metazeile beginnt deutlich später und besitzt mehr Innenraum.
- Die bestehende responsive Gruppierung bleibt erhalten.

### Begründung

Der Footer schließt das Produkt ab, statt nur Restlinks aufzunehmen. Er bleibt hell und ruhig, weil der Datenbereich bereits den bewussten dunklen Ruhepunkt bildet.

## 17. Mobile UX

- Der mobile Header ist kompakter, Claim und Touchziele bleiben lesbar bzw. mindestens 44 px groß.
- Hero-Abstände und Schrift skalieren fluid statt über harte Sprünge.
- Der sekundäre CTA ordnet sich klar unter dem Primary ein.
- Schritt-, Nutzen-, Daten- und FAQ-Inhalte bleiben streng linear.
- Kein Horizontal-Slider, kein Hover-Zwang und keine fixierte Bottom-CTA wurden ergänzt.
- Medienflächen behalten feste Größen und erzeugen keinen Layout Shift.

## 18. Desktop und große Monitore

- Wide-Container funktionieren nun tatsächlich.
- Hero, Arbeitsalltag und Datenkontrolle besitzen eigenständige Spaltenverhältnisse.
- Drei Prozesskarten werden horizontal vergleichbar aufgebaut.
- Große Monitore nutzen bis zu 92 rem für ausgewählte Medienkompositionen.
- Textzeilen wachsen nicht mit der Bühne.
- Es wurden keine zusätzlichen Spalten, Inhalte oder Dekorationen zur Flächenfüllung ergänzt.

## 19. Mikrointeraktionen

- Buttons verwenden weiterhin nur die global definierten Hover- und Press-Primitiven.
- Schatten reagieren geringer als in RC1.
- Desktopnavigation erhält eine kurze Unterstreichung.
- Der Header wechselt seine Ebene in 200 ms.
- FAQ-Statussymbol und -inhalt verwenden die vorhandenen Motion-Tokens.
- Scroll Reveal, Reduced Motion und Fokuslogik bleiben unverändert erhalten.
- Kein Parallax, Video, Cursor-Effekt, Stagger oder automatischer Wechsel wurde ergänzt.

## 20. Bewusst nicht geändert

- keine neuen Inhalte oder Textaussagen;
- keine neue Sektion;
- keine neue Produktfunktion;
- keine neue CTA-Route;
- keine Bilder, SVGs oder Logos;
- keine Änderung an der Reihenfolge des bestehenden Leseflusses;
- keine Änderung der Farbidentität aus der App;
- keine Änderung der Radiusfamilie;
- kein Testimonial, Preismodell oder Kontaktformular;
- keine Frameworks, Pakete oder Build-Werkzeuge;
- keine Änderung an SEO- oder Schema-Inhalten;
- keine Änderung der nativen FAQ-Semantik;
- keine Entfernung der ehrlichen Asset- und Rechtsstatushinweise.

## 21. Performance und Accessibility

- Keine zusätzlichen DOM-Elemente wurden für RC2 benötigt.
- Der neue Headerzustand verwendet einen passiven Scrolllistener und maximal einen Update-Frame.
- Die FAQ-Animation ist CSS-basiert und besitzt einen nativen Fallback.
- Keine neue Datei oder externe Abhängigkeit wurde eingeführt.
- Layoutgrößen der Medien bleiben stabil.
- Fokus, Tastatur, Screenreader-Semantik, Forced Colors und Reduced Motion bleiben erhalten.
- Der Containerfix verändert nur verfügbare Layoutbreite und keine Dokumentreihenfolge.

## 22. Offene Punkte für RC3

### Visuelle Assets

- finale D-TILE-Bildmarke und Wortmarke;
- freigegebener Hero-Screenshot;
- freigegebene Screens für die drei Schritte;
- authentisches Arbeitsfoto;
- Favicon, Touch Icon und Social Preview.

### Produkt und Inhalt

- echtes primäres CTA-Ziel;
- Preis- und Verfügbarkeitsstatus;
- finale Prüfung aller Produkt- und Datenaussagen gegen den Release;
- echte Rechtsangaben und Datenschutzerklärung;
- Produktionsdomain und absolute Metadaten.

### Abnahme

- visueller Browserreview bei 320, 390, 768, 1024, 1440 und 1920 px;
- reale iOS-/Android-Geräteprüfung;
- finale Lighthouse-Messung über Produktionshosting;
- Screenreader-, Zoom-, Textabstands- und Forced-Colors-Abnahme;
- Kontrastprüfung nach Austausch der Platzhalterassets;
- Entscheidung zwischen Google Fonts und lokal ausgeliefertem Inter.

RC3 soll diese realen Austausch- und Freigabepunkte schließen. Es braucht keine weitere konzeptionelle Ausweitung der Landingpage.

