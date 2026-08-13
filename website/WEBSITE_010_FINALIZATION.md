# WEBSITE-010 – Beta, Pricing, Legal & Website-Finalisierung

## 1. Abschlussbewertung

**GO – für die Website selbst.**

Seitenstruktur, Inhalte, Markenassets, echte Produktscreens, Beta-Darstellung, Einzellizenz, Preisplatzhalter, vorbereitetes Anfrageformular, Legal-Seiten, SEO, Accessibility-Grundlagen und Performance-Vertrag sind vollständig umgesetzt.

Eine tatsächliche öffentliche Aktivierung bleibt an die unter **A** genannten externen beziehungsweise technischen Freigaben gebunden. Keine davon erfordert einen strukturellen Neubau der Website.

## 2. Finaler Seitenaufbau

1. Sticky Header mit Produktnavigation und `Beta testen`;
2. Hero mit echtem App-Screen und Hinweis auf die geplante 14-Tage-Testphase;
3. Zielgruppen-Zeile;
4. Arbeitsalltag;
5. Drei-Schritte-Ablauf mit echten App-Screens;
6. Produktvorteile;
7. Datenkontrolle;
8. Zielgruppen;
9. eine FRECKA-Lizenz mit Testphase und geplantem Übergang;
10. dreizehnteilige FAQ mit allen geforderten Themen;
11. vorbereitete Beta-Anfrage;
12. reduzierter Footer mit Marke, Claim, Beta, Impressum und Datenschutz.

Es wurden keine zusätzlichen Produktfunktionen, Tarifstufen oder Marketingelemente erfunden.

## 3. Beta-Darstellung

Die Website kommuniziert verbindlich:

- geplante kostenlose Testphase von 14 Tagen;
- zeitlich begrenzte Nutzung statt dauerhaft kostenloser Vollversion;
- anschließende bewusste Entscheidung über die reguläre Nutzung;
- mögliche Änderungen einzelner Funktionen während der Beta;
- keine automatische Freischaltung, Umstellung oder Zahlungsabwicklung durch die aktuelle Website.

Der zentrale CTA lautet durchgehend `Beta testen` und führt zum Beta-Bereich.

## 4. Vorbereitetes Beta-Formular

Das semantische Formular enthält:

- Vorname oder Name;
- E-Mail-Adresse;
- Branche;
- optional Betriebsname;
- Kenntnisnahme der Datenschutzerklärung;
- vorbereitete, ausgeblendete Fehlermeldungen mit `role="alert"`;
- Statusausgabe mit `role="status"` und `aria-live="polite"`.

Das gesamte `fieldset` und die Absendeaktion sind deaktiviert. Es gibt kein `action`-Ziel, keine JavaScript-Übertragung, kein LocalStorage, keine Fake-Erfolgsmeldung und keine dauerhafte Speicherung. Die spätere Anbindung benötigt nur Endpoint-, Zustands- und Validierungslogik; Felder und Semantik bleiben bestehen.

## 5. Pricing- und Lizenzkonzept

Die Seite zeigt genau eine FRECKA-Lizenz:

- ein Betrieb beziehungsweise eine Filiale;
- ein aktives Gerät;
- kein versprochener Mehrgerätebetrieb;
- 14 Tage kostenlos testen;
- anschließend weiter nutzen oder beenden.

Auf der sichtbaren Website steht bis zur Preisfreigabe:

> Preis zur Markteinführung wird noch bekannt gegeben.

Der Betrag ist als einzelner Inhalt in `.c-pricing-card__price` zentral austauschbar. Es existieren keine Basic-/Pro-/Premium-Tarife und keine Zahlungsanbieter-Logos.

### Interner Arbeitswert

Der ausschließlich für die Gestaltung dokumentierte Arbeitswert lautet **12,90 € / Monat**. Er wird nirgends sichtbar als Verkaufspreis ausgegeben.

**PRICE_TODO: finalen Verkaufspreis vor Veröffentlichung freigeben.**

Danach sind sichtbarer Preistext, Abrechnungszeitraum, Steuerhinweis und gegebenenfalls Kündigungs-/Vertragsangaben fachlich und rechtlich konsistent einzusetzen.

## 6. Impressumsstand

`legal/impressum.html` verwendet die am 13. August 2026 auf der angegebenen öffentlichen Betreiberseite eindeutig lesbaren Angaben:

- Paolo Iannello;
- Zur Schönen Gelegenheit 12, 93047 Regensburg, Deutschland;
- +49 172 7671787;
- kontakt@paoloiannello.de;
- Umsatzsteuer-Identifikationsnummer DE329298228.

Die öffentlich erklärte Nichtteilnahme an Verbraucherstreitbeilegungsverfahren wurde ebenfalls übernommen. Die Anbieterkennzeichnung nennt § 5 DDG. Die Beschreibung „Training und Coaching“ wurde nicht übernommen, weil sie für FRECKA nicht erforderlich ist. Die ebenfalls sichtbare Steuernummer wurde bewusst nicht übernommen; sie wird nicht mit der Umsatzsteuer-Identifikationsnummer vermischt. FRECKA wird klar als Produktname und nicht als eigene Gesellschaft beschrieben.

## 7. Datenschutzstand

`legal/datenschutz.html` ist FRECKA-spezifisch und beschreibt nur den aktuellen Website-Stand:

- statische Landingpage;
- geplante Domain `https://frecka.app`;
- vorgesehene eigene Synology-/Web-Station-Infrastruktur;
- lokale Markenassets, Screens, Styles und Skripte;
- Systemschriften statt Google Fonts;
- keine Analytics oder Tracker;
- keine Marketing-Cookies;
- keine eingebetteten Videos, Karten oder Terminplaner;
- keine Zahlungsanbieter;
- deaktiviertes Beta-Formular ohne Datenübertragung oder Speicherung.

Die später vorgesehenen Formularfelder und ihr Zweck werden transparent benannt. Rechtsgrundlage, Speicherdauer, Empfänger, Auftragsverarbeiter und Löschprozess werden erst nach Wahl der echten Backend-Lösung freigegeben. Diese Punkte stehen intern als `BETA_PRIVACY_TODO` im HTML-Kommentar und erscheinen nicht als sichtbare Platzhalter.

## 8. Hosting-TODOs

**HOSTING_PRIVACY_TODO:** Vor der öffentlichen Bereitstellung auf der Synology/Web Station prüfen und dokumentieren:

- tatsächlich protokollierte Datenfelder;
- Aktivierung und Umfang von Access-/Error-Logs;
- Zugriffskreis;
- Zweck und Rechtsgrundlage;
- Speicher- und Löschfrist;
- TLS-, Reverse-Proxy- oder DNS-Dienste, sofern sie tatsächlich beteiligt sind;
- Anpassungsbedarf der Datenschutzerklärung.

Die Website behauptet keine unbestätigte Logkonfiguration oder IP-Speicherdauer.

## 9. SEO-Status

Final vorbereitet:

- Seitentitel und Meta Description;
- Canonical `https://frecka.app/`;
- OpenGraph-URL, Titel, Beschreibung und absolutes Social Preview;
- X/Twitter-Metadaten;
- `SoftwareApplication`-JSON-LD mit Produkt-URL und Zielgruppe;
- genau eine H1 pro Seite und logische Folgeüberschriften;
- lokale Social-Preview-Datei mit 1200 × 630 px.

Vor dem echten Launch ist nur zu bestätigen, dass Domain und Pfade exakt der Produktionsauslieferung entsprechen.

## 10. Asset-Status

Vorhanden und eingebunden:

- finales FRECKA-Logo;
- Wortmarken-Master;
- D-TILE-Icon;
- Favicon;
- Hero-Screen;
- drei Workflow-Screens;
- OpenGraph-/Social-Preview.

Brand-Master und Originalscreens wurden in WEBSITE-010 nicht verändert. Es wurden keine KI-Bilder erzeugt.

Noch optional aus der Asset-Roadmap: authentisches Arbeitsfoto und weitere Produkt-Screens für spätere Seiten. Sie blockieren diese Landingpage nicht.

## 11. Accessibility

- semantische Abschnitte und Überschriften;
- native FAQ mit `details`/`summary`;
- Skip Link und sichtbare Fokuszustände;
- Tastatursteuerung und Focus Return der mobilen Navigation;
- Formularlabels und geeignete Autocomplete-Werte;
- Pflichtfelder semantisch vorbereitet;
- Fehler- und Statusregionen für Screenreader vorbereitet;
- leere Logo-/Screenshot-Alt-Texte nur in bereits zugänglich beschriftetem Kontext;
- Touchziele und Kontraste aus dem bestehenden WCAG-2.2-AA-System;
- Reduced-Motion- und Forced-Colors-Unterstützung.

## 12. Performance

- statisches HTML, CSS und kleines Vanilla JavaScript;
- keine Frameworks, Build-Tools oder neuen Abhängigkeiten;
- keine externen Fonts, Tracker oder Analytics;
- Hero-Screen priorisiert;
- Workflow-Screens per Lazy Loading;
- feste Bildmaße und dimensionsstabile Medienrahmen gegen CLS;
- kein Script für das deaktivierte Formular;
- keine unnötigen externen Requests.

## 13. Technische Abnahme

Geprüft wurden Landingpage, Impressum und Datenschutz bei 320, 390, 430, 768, 1024, 1280 und 1600 px. Ergebnis:

- kein horizontaler Überlauf;
- korrekter Wechsel zwischen mobiler und Desktop-Navigation;
- funktionierendes Öffnen, Escape-Schließen und Focus Return des mobilen Menüs;
- Hero, Pricing, Formular, FAQ, Footer und Legal-Inhalte bleiben innerhalb des Viewports;
- Hero- und Workflow-Screens laden vollständig und werden mit `object-fit: contain` unverzerrt dargestellt;
- Formular bleibt ohne `action`, mit deaktiviertem `fieldset` und deaktiviertem Submit;
- keine sichtbaren TODO- oder Platzhaltertexte;
- keine unerwarteten externen Laufzeit-Requests und keine Browserfehler;
- HTML-Struktur, interne Links, lokale Assetpfade, Meta-Tags, JSON-LD, JavaScript-Syntax, CSS-Klammerstruktur und `git diff --check` sind fehlerfrei.

Bei der 320-px-Abnahme wurde eine alte globale Mindestbreite entfernt, die in Browsern mit sichtbarer vertikaler Scrollbar 15 px horizontalen Überlauf erzeugte.

## 14. A – Muss vor öffentlicher Veröffentlichung erledigt werden

1. **PRICE_TODO:** finalen Verkaufspreis und alle zugehörigen Vertragsangaben freigeben oder die neutrale Preisankündigung bewusst bestätigen.
2. Geschützten Beta-Endpoint und verantwortlichen Empfänger festlegen.
3. Vor Formularaktivierung Rechtsgrundlage, Speicherdauer, Empfänger/Auftragsverarbeiter, Löschprozess und Datenschutzhinweis freigeben.
4. Synology-/Web-Station-Logging real prüfen und die Datenschutzerklärung bei Bedarf konkretisieren.
5. Impressum und Datenschutz durch die verantwortliche Person oder qualifizierte Rechtsberatung final prüfen.
6. Domain, TLS und absolute SEO-/Social-Pfade in der realen Auslieferung bestätigen.
7. Beta-Zugang, Trial-Ablauf und spätere Lizenzlogik außerhalb der Website technisch bereitstellen, bevor das Formular aktiviert wird.

## 15. B – Kann nach Veröffentlichung ergänzt werden

- authentisches Arbeitsfoto;
- weitere Produkt-Screens auf späteren Unterseiten;
- optionales lokales Schriftpaket, falls die Systemschrift später ersetzt werden soll;
- weiterführende Produktseiten, sobald Inhalte und Funktionen freigegeben sind;
- aktivierte Anfragezustände und Bestätigungsansicht nach vorhandener Backend-Anbindung;
- echte Preisangabe nach fachlicher Freigabe, sofern zum ersten Launch noch die neutrale Ankündigung verwendet wird.

Diese Ergänzungen dürfen die ehrliche Beta-, Daten- und Lizenzkommunikation nicht aufweichen.
