# 04 – Component Map

## 1. Zweck

Diese Komponentenlandkarte beschreibt die später benötigten Bausteine und ihre Verantwortung. Sie ist keine technische Implementierung und keine Verpflichtung, jede Komponente auf der ersten Version einzusetzen.

Grundregel:

> Eine Komponente entsteht nur, wenn sie eine wiederkehrende inhaltliche oder interaktive Aufgabe löst.

## 2. Komponentenprinzipien

- Inhalt und Semantik bestimmen die Komponente, nicht ein visuelles Kartenraster.
- Varianten bleiben begrenzt und benannt.
- Jede Interaktion funktioniert per Tastatur und besitzt einen sichtbaren Fokus.
- Inhalte sind ohne JavaScript zugänglich; JavaScript verbessert nur Verhalten.
- Mobile ist der Ausgangszustand.
- App und Website dürfen dieselben Tokens nutzen, teilen aber keinen unkontrollierten Code.
- Zustände werden durch Text oder Symbol zusätzlich zur Farbe erkennbar.

## 3. Globale Strukturkomponenten

### 3.1 Skip Link

**Aufgabe:** direkter Sprung zum Hauptinhalt.

**Varianten:** keine.

**Zustände:** verborgen, fokussiert.

**Hinweise:** erstes fokussierbares Element; hoher Kontrast; nicht von Header überdeckt.

### 3.2 Page Shell

**Aufgabe:** Seitenhintergrund, maximale Inhaltsbreiten und globale Abstände koordinieren.

**Varianten:** Standardseite, schmale Textseite.

**Zustände:** keine.

**Hinweise:** kein rein visueller Wrapper ohne Zweck in der Semantik.

### 3.3 Section

**Aufgabe:** einen Hauptgedanken mit konsistentem vertikalem Rhythmus gruppieren.

**Varianten:** Standard, sanft hinterlegt, Produktbühne, kompakt.

**Zustände:** keine.

**Hinweise:** Abschnitte benötigen Überschrift oder zugängliche Benennung.

### 3.4 Content Container

**Aufgabe:** Text- und Medienbreiten begrenzen.

**Varianten:** Text, Standard, weit.

**Zustände:** keine.

**Hinweise:** breite Desktopflächen führen nicht zu überlangen Textzeilen.

### 3.5 Stack / Cluster / Grid

**Aufgabe:** wiederkehrende vertikale, umbrochene oder rasterartige Anordnung.

**Varianten:** eng, normal, weit; ein-, zwei- oder höchstens dreispaltig.

**Zustände:** keine.

**Hinweise:** visuelle Reihenfolge darf die Dokumentreihenfolge nicht widersprechen.

## 4. Navigation

### 4.1 Product Status Bar / Beta Banner

**Aufgabe:** tatsächlichen Beta- oder Verfügbarkeitsstatus transparent anzeigen.

**Varianten:** Information, geplante Verfügbarkeit.

**Zustände:** Standard; optional geschlossen nur, wenn die Information nicht wesentlich ist.

**Hinweise:** kein Werbeticker; nicht automatisch animiert; niemals Dringlichkeit vortäuschen.

### 4.2 Site Header

**Aufgabe:** Marke, Hauptnavigation und primäre Aktion verbinden.

**Varianten:** mobil kompakt, Desktop vollständig.

**Zustände:** Standard, optional sticky nach Scrollposition.

**Hinweise:** Transparenz oder Blur nur bei gesichertem Kontrast; Höhe bleibt stabil.

### 4.3 Brand Link

**Aufgabe:** Marke kennzeichnen und zur Startseite führen.

**Varianten:** vorerst Text; später freigegebenes Logo.

**Zustände:** Standard, Hover, Fokus, Active.

**Hinweise:** kein Logo wird in dieser Phase erstellt.

### 4.4 Desktop Navigation

**Aufgabe:** höchstens drei zentrale Ziele zugänglich machen.

**Varianten:** Ankerlinks, Seitenlinks.

**Zustände:** Standard, Hover, Fokus, aktueller Bereich/aktuelle Seite.

**Hinweise:** klare Begriffe; kein Mega-Menü.

### 4.5 Mobile Menu Button

**Aufgabe:** mobile Navigation öffnen und schließen.

**Varianten:** keine.

**Zustände:** geschlossen, geöffnet, Hover, Fokus.

**Hinweise:** sichtbare Bezeichnung oder eindeutiger zugänglicher Name; Zustand über `aria-expanded` vermittelbar.

### 4.6 Mobile Navigation Panel

**Aufgabe:** Navigation und gegebenenfalls CTA auf kleinem Raum anzeigen.

**Varianten:** eingeblendet unter dem Header oder ruhiges Dialog-Panel.

**Zustände:** geschlossen, geöffnet.

**Hinweise:** Fokuslogik, Escape-Schließen und Scrollverhalten definieren; kein Vollbildmenü als Showeffekt.

## 5. Aktionen

### 5.1 Button

**Aufgabe:** eine konkrete Handlung auslösen.

**Varianten:** primär, sekundär, dezent/ghost, destruktiv nur falls fachlich nötig.

**Größen:** Standard, mobil breit.

**Zustände:** Standard, Hover, Fokus, Active, Disabled, Busy.

**Hinweise:** mindestens 44 × 44 px; bevorzugt 52 px Höhe; Text benennt die Handlung.

### 5.2 Text Link

**Aufgabe:** zu vertiefenden Inhalten führen.

**Varianten:** inline, eigenständig mit Richtungssymbol.

**Zustände:** Standard, Hover, Fokus, besucht sofern sinnvoll.

**Hinweise:** nicht nur durch Farbe erkennbar.

### 5.3 CTA Group

**Aufgabe:** primäre Aktion und höchstens eine leise Alternative gruppieren.

**Varianten:** vertikal mobil, horizontal ab ausreichender Breite.

**Zustände:** erbt Aktionszustände.

**Hinweise:** keine zwei visuell gleich lauten Primäraktionen.

### 5.4 Inline Action Notice

**Aufgabe:** erklären, was nach einer CTA-Aktion geschieht.

**Varianten:** kurze Meta-Zeile, Statushinweis.

**Zustände:** Standard.

**Hinweise:** ersetzt unklare CTA-Texte nicht, sondern ergänzt nötigen Kontext.

## 6. Inhaltsgrundelemente

### 6.1 Eyebrow / Context Label

**Aufgabe:** Abschnitt oder Zielgruppe kurz einordnen.

**Varianten:** Text, Text mit kleinem Icon.

**Zustände:** keine.

**Hinweise:** sparsam; keine dekorative Badge-Kette.

### 6.2 Heading Group

**Aufgabe:** Eyebrow, Überschrift und Einleitung konsistent verbinden.

**Varianten:** linksbündig, selten zentriert; schmal oder standard.

**Zustände:** keine.

**Hinweise:** semantische Überschriftenebene wird vom Dokument bestimmt.

### 6.3 Lead Text

**Aufgabe:** eine Überschrift in einem verständlichen Satz einordnen.

**Varianten:** Hero, Abschnitt.

**Zustände:** keine.

### 6.4 Badge / Pill

**Aufgabe:** kurzen Kontext oder echten Status markieren.

**Varianten:** neutral, primär-sanft, Status.

**Zustände:** Standard.

**Hinweise:** nicht interaktiv, sofern es nur Text auszeichnet; kein ungeprüftes Siegel.

### 6.5 Icon Label

**Aufgabe:** Icon und kurze Bedeutung verbinden.

**Varianten:** horizontal, kompakt vertikal.

**Zustände:** keine.

**Hinweise:** Text trägt die Bedeutung; Icon ist ergänzend.

## 7. Seitenspezifische Hauptkomponenten

### 7.1 Hero

**Aufgabe:** Zielgruppe, Nutzen, Aktion und Produktbeweis bündeln.

**Bestandteile:** Heading Group, CTA Group, Statusnotiz, Product Stage.

**Varianten:** einspaltig mobil, Text/Produkt zweispaltig auf breiten Ansichten.

**Hinweise:** kein Video-Hintergrund, keine rotierenden Claims, keine Badge-Sammlung.

### 7.2 Audience Line

**Aufgabe:** Zielgruppenpassung knapp bestätigen.

**Bestandteile:** Einleitung, statische Audience Pills oder Klartextliste.

**Varianten:** umbrochene Liste, ruhige Textzeile.

**Hinweise:** nicht anklickbar, wenn keine Filterfunktion existiert.

### 7.3 Work Moment

**Aufgabe:** Alltagssituation und einfache Auflösung erzählen.

**Bestandteile:** Heading Group, kurze Ablaufzeile, optional später Foto.

**Varianten:** nur Text, Text mit Medium.

### 7.4 Process Steps

**Aufgabe:** Kernablauf in drei linearen Schritten zeigen.

**Bestandteile:** drei Step Items, Ergebniszeile.

**Varianten:** vertikale Liste, dreispaltig bei ausreichender Breite.

**Hinweise:** kein Slider; Nummerierung bleibt sichtbar.

### 7.5 Step Item

**Aufgabe:** Handlung und Ergebnis eines Schritts erklären.

**Bestandteile:** Step Number, Titel, Kurztext, optional Screenshot/Icon.

**Zustände:** statisch; keine Auswahlfunktion vortäuschen.

### 7.6 Product Stage

**Aufgabe:** einen dominanten App-Screen hochwertig und lesbar präsentieren.

**Bestandteile:** Device Frame oder Screenshot Frame, Caption, optional Statuslabel.

**Varianten:** Hero, groß, Detailausschnitt.

**Hinweise:** Produkt bleibt Hauptinhalt; Dekoration darf UI nicht verdecken.

### 7.7 Device Mockup

**Aufgabe:** mobilen Nutzungskontext zurückhaltend vermitteln.

**Varianten:** neutraler Rahmen, rahmenloser Screenshot.

**Zustände:** statisch.

**Hinweise:** kein Fremdbranding; Screenshot bleibt zugänglich beschrieben.

### 7.8 App Screenshot

**Aufgabe:** eine reale Produktfunktion belegen.

**Bestandteile:** Bild, Alt-Text, sichtbare Caption, optional Release-Kontext.

**Varianten:** vollständig, fokussierter Ausschnitt.

**Zustände:** Standard; optional vergrößerbar nach bewusster Aktion.

**Hinweise:** nur fiktive Daten und freigegebener Stand.

### 7.9 Screenshot Annotation

**Aufgabe:** ein konkretes Element im Screenshot erklären.

**Varianten:** nummerierte Legende, Text unter dem Bild.

**Zustände:** statisch oder bewusst geöffnet.

**Hinweise:** auf Mobilgeräten keine winzigen Hotspots als einziger Zugang.

### 7.10 Benefit List

**Aufgabe:** maximal vier priorisierte Nutzen zusammenfassen.

**Bestandteile:** Benefit Items.

**Varianten:** lineare Liste, zweispaltiges Raster.

### 7.11 Benefit Item

**Aufgabe:** einen konkreten Alltagsnutzen erklären.

**Bestandteile:** optional Icon, Titel, Kurztext.

**Zustände:** statisch.

**Hinweise:** nicht jedes Item benötigt eine eigene Karte.

### 7.12 Data Flow

**Aufgabe:** lokale Verarbeitung und bewusste Datenwege verständlich zeigen.

**Bestandteile:** drei Flow Steps, Verbinder, kurze Einschränkung.

**Varianten:** vertikal mobil, horizontal breit.

**Hinweise:** beschriftet, keine rein dekorative Netzwerkdarstellung.

### 7.13 Audience Fit

**Aufgabe:** gemeinsame Passung kleiner Betriebe beschreiben.

**Bestandteile:** Text, Branchenliste, optional Photo Group.

**Varianten:** Text pur, Text mit Fotos.

### 7.14 Proof Quote

**Aufgabe:** genau eine belegbare Außenperspektive zeigen.

**Bestandteile:** Zitat, Name, Rolle/Betrieb, optionale Quelle.

**Varianten:** Kunde, Pilotinformation.

**Hinweise:** nur mit dokumentierter Freigabe; kein Slider; komplett entfallen, wenn keine Quelle vorliegt.

### 7.15 FAQ List

**Aufgabe:** häufige Verständnis- und Entscheidungsfragen bündeln.

**Bestandteile:** FAQ Items.

**Varianten:** statisch offen, progressive Akkordeonansicht.

### 7.16 FAQ Item

**Aufgabe:** Frage und belastbare Antwort verbinden.

**Zustände:** geschlossen, geöffnet, Hover, Fokus.

**Hinweise:** native semantische Basis bevorzugen; Icon unterstützt nur den Zustand.

### 7.17 Final CTA Panel

**Aufgabe:** Hauptnutzen und nächsten Schritt abschließen.

**Bestandteile:** kurze Überschrift, ein Satz, primärer Button, Folgehinweis.

**Varianten:** helle oder primär-sanfte Fläche.

**Hinweise:** keine neue Botschaft und kein zusätzlicher CTA.

### 7.18 Site Footer

**Aufgabe:** Navigation, Kontakt, Rechtliches und Status übersichtlich abschließen.

**Bestandteile:** Brand Summary, Footer Link Groups, Legal Line.

**Varianten:** einspaltig mobil, gruppiert auf breiten Ansichten.

## 8. Feedback- und Hilfskomponenten

Diese Komponenten werden nur benötigt, wenn die spätere Website echte Eingaben oder asynchrone Zustände enthält.

### 8.1 Notice

**Aufgabe:** sachliche Information, Erfolg, Warnung oder Fehler erklären.

**Varianten:** Information, Erfolg, Warnung, Fehler.

**Zustände:** statisch, optional schließbar.

**Hinweise:** Statuswort und Symbol zusätzlich zur Farbe.

### 8.2 Form Field

**Aufgabe:** eine einzelne, klar beschriftete Eingabe ermöglichen.

**Bestandteile:** Label, Control, Hilfe, Fehlermeldung.

**Zustände:** Standard, Fokus, ausgefüllt, Fehler, Disabled, Busy.

**Hinweise:** erst einführen, wenn Kontakt-/Anmeldeprozess und Datenschutz geklärt sind.

### 8.3 Form Status

**Aufgabe:** Versand, Erfolg oder Fehler verständlich bestätigen.

**Zustände:** Busy, Erfolg, Fehler.

**Hinweise:** Fokusmanagement und Live-Region nur passend zur Dringlichkeit.

### 8.4 Dialog

**Aufgabe:** nur eine wirklich unterbrechende Entscheidung darstellen.

**Hinweise:** auf der ersten Landingpage voraussichtlich nicht erforderlich; kein Newsletter-Popup.

## 9. Komponenten, die bewusst nicht vorgesehen sind

- Logo Wall ohne echte Referenzen;
- Statistik-Counter;
- Testimonial-Karussell;
- Feature-Karussell;
- Preis-Toggle ohne Tarifmodell;
- Vergleichstabelle als Hero-Inhalt;
- Chatbot-Blase;
- Countdown;
- Social Feed;
- schwebende „Jetzt kaufen“-Leiste;
- Cookie-Banner, sofern die reale Website keine einwilligungspflichtigen Dienste verwendet;
- Bento-Grid als allgemeines Layoutsystem.

## 10. Implementierungsreihenfolge später

1. globale Struktur und Typografie;
2. Links, Buttons und Fokuszustände;
3. Header und Navigation;
4. Hero und Product Stage;
5. Process Steps und App Screenshots;
6. Nutzen- und Datenabschnitte;
7. FAQ;
8. Final CTA und Footer;
9. optionale Status-, Proof- oder Formkomponenten nur nach inhaltlicher Freigabe.

