# 03 – UX-Wireframe der Landingpage

## 1. Zweck

Dieser Wireframe definiert Inhalt, Reihenfolge und Verhalten der Startseite. Er enthält bewusst keine Bildgestaltung, finalen Texte oder visuelle Ausarbeitung.

Der Lesefluss ist linear und mobile-first. Besucher müssen nicht zwischen mehreren Erzählwegen wählen.

## 2. Gesamtstruktur

```text
[Skip-Link]
[Optionaler Produktstatus / Beta-Hinweis]
[Header: Marke | Navigation | primäre Aktion]

[01 Hero]
[02 Zielgruppen-Zeile]
[03 Alltagssituation]
[04 Kernablauf in drei Schritten]
[05 Produktbeleg / App-Einblick]
[06 Vier priorisierte Nutzen]
[07 Daten & Kontrolle]
[08 Passend für kleine Betriebe]
[09 Ruhiger Vertrauensbeleg]
[10 FAQ]
[11 Abschluss-CTA]

[Footer]
```

Der optionale Vertrauensbeleg entfällt vollständig, solange keine belastbare Kundenstimme, Pilotinformation oder andere nachprüfbare Quelle vorliegt.

## 3. Globales Verhalten

- Ein primäres CTA-Ziel wird in Header, Hero und Abschluss identisch benannt.
- Die Hauptnavigation führt zu höchstens drei inhaltlichen Ankern oder späteren Kernseiten.
- Jeder Abschnitt beantwortet eine Besucherfrage und führt natürlich zum nächsten.
- Inhalte sind in Dokumentreihenfolge vollständig verständlich.
- Keine Pflichtinteraktion, um Kerninformationen zu lesen.
- Kein Popup, Chatfenster, Countdown oder automatisches Modal.
- Eine mögliche Beta-Mitteilung bleibt sachlich und kann nicht mit dem Hero konkurrieren.

## 4. Bereich 00 – Skip-Link

**Ziel:** Tastaturnutzern den direkten Sprung zum Hauptinhalt ermöglichen.

**Inhalt:** Ein Link „Zum Inhalt“, der beim Fokus sichtbar wird.

**Reihenfolge:** Erstes fokussierbares Element der Seite.

**CTA:** keiner.

**Mobile-Verhalten:** identisch; erscheint nur bei Tastaturfokus und verdeckt keine Navigation.

## 5. Bereich 01 – Optionaler Produktstatus / Beta-Hinweis

**Ziel:** Verfügbarkeit ehrlich einordnen, falls FRECKA noch nicht allgemein erhältlich ist.

**Inhalt:** Ein kurzer Statussatz und optional ein Textlink mit weiteren Informationen.

**Reihenfolge:** Vor dem Header oder als dessen erste Zeile. Nur verwenden, wenn inhaltlich nötig.

**CTA:** optionaler leiser Textlink, nicht die primäre Seitenaktion.

**Mobile-Verhalten:** ein- bis zweizeilig; keine laufende Schrift, kein horizontales Scrollen, nicht sticky.

## 6. Bereich 02 – Header und Navigation

**Ziel:** Marke, Orientierung und nächsten Schritt ohne Ablenkung bereitstellen.

**Inhalt:**

1. Markenname bzw. später freigegebenes Logo;
2. maximal drei Navigationsziele, beispielsweise „So funktioniert’s“, „Funktionen“, „Daten“;
3. primäre Aktion;
4. mobile Menüaktion, falls die Ziele nicht direkt passen.

**Reihenfolge:** Marke → Navigation → primäre Aktion.

**CTA:** derselbe primäre CTA wie im Hero.

**Mobile-Verhalten:** Marke links, eindeutige Menüschaltfläche rechts. Der CTA kann im geöffneten Menü erscheinen; kein dauerhaft überfüllter Header. Falls nur zwei kurze Ziele bestehen, können sie ohne Menü auskommen. Sticky-Verhalten erst nach Nutzertest; standardmäßig bleibt der Header statisch.

## 7. Bereich 03 – Hero

**Ziel:** Innerhalb weniger Sekunden Zielgruppe, Hauptnutzen und Einfachheit verständlich machen.

**Inhalt:**

1. kurze Einordnung, etwa „Für kleine Dienstleistungsbetriebe“;
2. eine konkrete H1;
3. ein erklärender Satz;
4. ein primärer CTA;
5. optional ein leiser Textlink zu „So funktioniert’s“;
6. ein späterer, echter App-Screenshot als Produktbeweis;
7. optional eine sachliche Kurznotiz unter dem CTA, falls Verfügbarkeit erklärt werden muss.

**Reihenfolge:** Einordnung → H1 → Erklärung → Aktionen → Produktbeleg.

**CTA:** ein primärer nächster Schritt. Kein gleich lautes CTA-Paar.

**Mobile-Verhalten:** vollständig einspaltig. Text steht vor dem Screenshot. Der CTA ist breit und leicht erreichbar. Der erste Screen darf knapp unterhalb des ersten Viewports beginnen; die Botschaft muss ohne Scrollen weitgehend erfassbar sein. Keine schwebenden Neben-Screens.

## 8. Bereich 04 – Zielgruppen-Zeile

**Ziel:** Besuchern schnell bestätigen, dass ihr Betriebstyp gemeint ist.

**Inhalt:** Eine kurze Einführung plus Begriffe wie Friseur, Kosmetik, Nagelstudio, Podologie, Fußpflege und kleine Dienstleistungsbetriebe.

**Reihenfolge:** direkt nach dem Hero als Bestätigung, nicht als separate Branchenwelt.

**CTA:** keiner.

**Mobile-Verhalten:** umbrochene, statische Begriffe oder kurze Textzeile. Kein horizontaler Auto-Marquee und keine Filterfunktion vortäuschen.

## 9. Bereich 05 – Alltagssituation

**Ziel:** zeigen, dass FRECKA den realen Moment nach einer Dienstleistung versteht.

**Inhalt:**

1. kurze Abschnittsüberschrift;
2. ein konkreter Tagesablauf in wenigen Sätzen;
3. eine reduzierte Abfolge: Termin fertig → Leistung wählen → Zahlung erfassen → Beleg fertig;
4. optional später ein ruhiges Arbeitsfoto oder eine rein typografische Darstellung.

**Reihenfolge:** Situation → heutige Reibung ohne Dramatisierung → einfache Auflösung.

**CTA:** keiner. Der Abschnitt soll verstanden, nicht verkauft werden.

**Mobile-Verhalten:** einspaltig; Abfolge vertikal. Keine Timeline, die horizontales Wischen voraussetzt.

## 10. Bereich 06 – Kernablauf in drei Schritten

**Ziel:** Einfachheit konkret beweisen.

**Inhalt:**

1. Abschnittstitel und ein Satz Kontext;
2. Schritt 1: Leistung oder Produkt auswählen;
3. Schritt 2: Zahlung und optional Kunde erfassen;
4. Schritt 3: Beleg abschließen und passend weitergeben;
5. je Schritt später ein App-Ausschnitt oder ein schlichtes Funktionsicon;
6. ein kurzer Ergebnissatz nach dem dritten Schritt.

**Reihenfolge:** streng 1 → 2 → 3.

**CTA:** optional ein leiser Textlink zum ausführlichen Funktionsbereich. Kein CTA in jeder Schrittkarte.

**Mobile-Verhalten:** Schritte untereinander, nummeriert und ohne versteckten Slider. Der nächste Schritt beginnt erst nach dem vorherigen. Desktop darf drei Spalten verwenden, die semantische Reihenfolge bleibt gleich.

## 11. Bereich 07 – Produktbeleg / App-Einblick

**Ziel:** die tatsächliche Bedienqualität sichtbar machen.

**Inhalt:**

1. eine klare Behauptung über Verständlichkeit;
2. ein großer, später freigegebener App-Screenshot;
3. höchstens drei kurze Bildhinweise, die reale UI-Elemente erklären;
4. eine Bildunterschrift mit Produktstand oder Kontext;
5. optional ein zweiter Screen für den Folgezustand.

**Reihenfolge:** Aussage → sichtbarer Beleg → kurze Erklärung.

**CTA:** optional „Funktionen ansehen“, wenn eine entsprechende Seite existiert.

**Mobile-Verhalten:** Screenshot in lesbarer Breite, kein verkleinerter Desktop-Frame. Hinweise stehen unter dem Bild statt als überlagerte Hotspots. Kein Karussell. Ein zweiter Screen folgt vertikal.

## 12. Bereich 08 – Vier priorisierte Nutzen

**Ziel:** den Produktwert über konkrete Alltagsergebnisse verdichten.

**Inhalt:** maximal vier Nutzenfelder, vorläufig:

1. mobil und direkt bedienbar;
2. klare, geführte Abläufe;
3. Daten unter eigener Kontrolle;
4. Sicherung, Dokumente und Export bewusst auslösen.

Jedes Feld enthält Überschrift, zwei kurze Sätze und optional ein Icon. Nur bestätigte Funktionen werden benannt.

**Reihenfolge:** unmittelbarer Bediennutzen → Arbeitsfluss → Vertrauen → Weiterverwendung.

**CTA:** keiner innerhalb der Felder.

**Mobile-Verhalten:** einspaltige Liste, nicht zwingend vier separate Karten. Auf größeren Breiten maximal zwei Spalten; keine ungleich langen Drei-Spalten-Kacheln.

## 13. Bereich 09 – Daten & Kontrolle

**Ziel:** Vertrauen aus verständlichen Datenwegen aufbauen.

**Inhalt:**

1. ruhige, konkrete Überschrift;
2. kurze Erklärung der lokalen Datenhaltung;
3. einfache Abfolge: im Gerät arbeiten → bewusst sichern/exportieren/teilen → Ziel selbst wählen;
4. drei belegbare Aussagen mit kurzen Erläuterungen;
5. Link zur späteren Detailseite „Datenschutz & Daten“;
6. ehrliche Voraussetzung oder Grenze, falls relevant.

**Reihenfolge:** Grundprinzip → Datenweg → vertiefende Information.

**CTA:** sekundärer Textlink zur Datenseite.

**Mobile-Verhalten:** vertikaler, beschrifteter Ablauf. Keine komplexe Netzwerkdiagrammatik. Der Abschnitt darf eine sanft abgesetzte Fläche nutzen, bleibt aber hell.

## 14. Bereich 10 – Passend für kleine Betriebe

**Ziel:** die gemeinsame Alltagstauglichkeit über mehrere Gewerke erklären, ohne stereotype Branchenseiten zu imitieren.

**Inhalt:**

1. gemeinsame Herausforderung kleiner Betriebe;
2. Branchenbeispiele;
3. ein Satz zur Anpassbarkeit über Leistungen, Produkte und Geschäftsbereiche – nur falls öffentlich freigegeben;
4. optional später zwei oder drei authentische Arbeitsdetails als Fotos.

**Reihenfolge:** gemeinsamer Bedarf → Beispiele → Produktbezug.

**CTA:** optional „Ist FRECKA passend für mich?“ als Kontakt- oder FAQ-Link, nur wenn dieser Prozess existiert.

**Mobile-Verhalten:** Text zuerst; Branchenbegriffe umbrechen natürlich. Fotos, falls vorhanden, untereinander und ohne horizontale Galerie.

## 15. Bereich 11 – Ruhiger Vertrauensbeleg (optional)

**Ziel:** eine reale Außenperspektive geben.

**Inhalt:** genau eine belastbare Kundenstimme, Pilotinformation oder sachliche Referenz mit Name/Rolle/Betrieb und dokumentierter Freigabe.

**Reihenfolge:** nach Zielgruppenpassung, weil der Besucher das Produkt bereits verstanden hat.

**CTA:** keiner.

**Mobile-Verhalten:** eine statische Aussage. Kein Testimonial-Slider, keine Sterne, keine automatisch wechselnden Zitate.

**Fallback:** Fehlt ein belastbarer Beleg, wird der gesamte Abschnitt entfernt. Er wird nicht durch erfundene Zahlen oder anonyme Aussagen ersetzt.

## 16. Bereich 12 – FAQ

**Ziel:** reale Hürden vor dem nächsten Schritt sachlich auflösen.

**Inhalt:** fünf bis acht freigegebene Fragen zu Zielgruppe, Voraussetzung, Offline-Nutzung, Datenspeicherung, Sicherung/Export, Preis, Verfügbarkeit und Hilfe.

**Reihenfolge:** Eignung → Nutzung → Daten → Angebot → Hilfe.

**CTA:** optionaler Kontaktlink nach der letzten Antwort, falls Fragen offenbleiben.

**Mobile-Verhalten:** vertikale Akkordeonliste mit großen Schaltflächen. Nur ein Zustand muss nicht erzwungen werden; mehrere Antworten dürfen geöffnet bleiben. Antworten sind auch ohne JavaScript zugänglich.

## 17. Bereich 13 – Abschluss-CTA

**Ziel:** nach vollständigem Verständnis einen klaren, druckfreien nächsten Schritt anbieten.

**Inhalt:**

1. kurze Abschlussüberschrift;
2. ein Satz, der den Hauptnutzen zusammenfasst;
3. derselbe primäre CTA wie im Hero;
4. sachliche Folgeinformation, was nach dem Klick passiert.

**Reihenfolge:** Zusammenfassung → Aktion → Erwartungsmanagement.

**CTA:** einziger dominanter CTA des Abschnitts.

**Mobile-Verhalten:** großzügige, aber nicht überdimensionierte Fläche; breiter Button; kein Hintergrundvideo oder animierter Farbverlauf.

## 18. Bereich 14 – Footer

**Ziel:** verlässlichen Abschluss, Kontakt und rechtliche Orientierung bieten.

**Inhalt:**

1. Markenname und ein ruhiger Einordnungssatz;
2. Kernnavigation;
3. Kontakt oder Hilfe;
4. Impressum und Datenschutzerklärung;
5. optional Produktstatus/Version;
6. Copyright-Angabe.

**Reihenfolge:** Marke → hilfreiche Links → Rechtliches → Metadaten.

**CTA:** keine neue Primäraktion. Ein Kontaktlink bleibt sekundär.

**Mobile-Verhalten:** einspaltige Linkgruppen mit klaren Überschriften und ausreichend großen Zielen. Keine komprimierte Linkmatrix.

## 19. Mobile Gesamtabnahme

Der Wireframe gilt mobil als bestanden, wenn:

- Zielgruppe und Nutzen im ersten Bildschirm erkennbar sind;
- die gesamte Seite ohne horizontales Wischen funktioniert;
- keine Sektion ein Karussell oder Hover voraussetzt;
- CTA-Bezeichnung und Folgehandlung konsistent bleiben;
- Screenshots lesbar statt nur dekorativ sind;
- der Lesefluss auch ohne Bilder vollständig verständlich bleibt;
- fixierte Elemente keinen Inhalt oder Fokus verdecken;
- die Seite trotz vollständiger Information ruhig und nicht endlos repetitiv wirkt.

