# Roadmap

## Grundsatz

Jede Phase endet mit einer überprüfbaren Freigabe. Eine spätere Phase beginnt erst, wenn die Entscheidungen feststehen, die ihre Umsetzung wesentlich beeinflussen. Die Website bleibt unabhängig von der bestehenden App und verändert sie nicht.

## Phase 0 – Projektgrundlage

**Status:** abgeschlossen mit WEBSITE-001

**Ergebnisse:**

- Zielgruppen und Positionierung beschrieben;
- App-Design und UX-Muster analysiert;
- Informationsarchitektur und Komponentenlandkarte festgelegt;
- Content- und Freigabebedarf dokumentiert;
- technische Leitlinien und Projektgrenzen definiert;
- Umsetzungsphasen und Qualitätsgates geplant.

**Bewusster Ausschluss:** kein HTML, CSS, JavaScript, Logo oder Seitenentwurf.

## Phase 1 – Entscheidungen und Content Discovery

**Ziel:** offene Produkt- und Kommunikationsfragen schließen.

**Aufgaben:**

- primäres CTA-Ziel und tatsächlichen Folgeprozess festlegen;
- Anrede, Kernbotschaft und öffentliche Produktbezeichnung freigeben;
- veröffentlichbaren Funktionsumfang und Produktstatus bestätigen;
- Preis-/Verfügbarkeitskommunikation entscheiden;
- Datenschutz- und Sicherheitsaussagen fachlich prüfen;
- echte Besucherfragen durch kurze Gespräche mit Zielgruppenvertretern sammeln;
- rechtliche Anbieter- und Kontaktinformationen bereitstellen.

**Gate:** Eine freigegebene Message Map und eine vollständige Liste belegbarer Aussagen liegen vor.

## Phase 2 – Inhaltskonzept und Low-Fidelity-Struktur

**Ziel:** Lesefluss und Hierarchie ohne visuelle Ausgestaltung prüfen.

**Aufgaben:**

- Startseiten-Copy als erste vollständige Fassung schreiben;
- mobile Inhaltsreihenfolge und grobe Wireframes erarbeiten;
- Navigation und spätere Seitenpfade validieren;
- Screenshot-Liste und Anforderungen an fiktive Demodaten definieren;
- fünfsekündige Verständnistests mit Personen aus der Zielgruppe durchführen;
- Texte anhand der Testergebnisse kürzen und präzisieren.

**Gate:** Testpersonen erkennen Zielgruppe, Hauptnutzen und nächsten Schritt zuverlässig; alle Abschnitte besitzen eine klare Aufgabe.

## Phase 3 – Visueller Entwurf

**Ziel:** die App-Designsprache glaubwürdig in eine responsive Website übertragen.

**Aufgaben:**

- mobile Schlüsselansichten zuerst gestalten;
- Typografie, Abstände, Container und responsive Skalierung konkretisieren;
- Komponenten in relevanten Zuständen spezifizieren;
- Bildwelt und freigegebene Produktansichten auswählen;
- Kontraste, Fokus, Zoom und reduzierte Bewegung im Entwurf berücksichtigen;
- Tablet- und Desktop-Komposition ergänzen.

**Gate:** Designreview bestätigt Ruhe, Wiedererkennbarkeit, mobile Klarheit und WCAG-2.2-AA-Zielsetzung. Offene Marken- oder Assetfragen sind geklärt.

## Phase 4 – Statische Umsetzung

**Ziel:** robuste erste Website ohne Build- oder Frameworkabhängigkeit erstellen.

**Aufgaben:**

- semantisches HTML für die freigegebenen Seiten;
- mobile-first CSS mit zentralen Tokens;
- nur notwendige progressive Interaktion in Vanilla JavaScript;
- lokale, optimierte Bilder, Icons und gegebenenfalls Fonts;
- Metadaten, Social Preview, Sitemap und Fehlerseite nach tatsächlichem Veröffentlichungsumfang;
- verständliche Fallbacks ohne JavaScript.

**Gate:** kein Framework, kein Build-Schritt, keine unnötige Abhängigkeit; Kerninhalte und Navigation funktionieren ohne JavaScript.

## Phase 5 – Qualitätssicherung

**Ziel:** Inhalt, Bedienung und Auslieferung vor Veröffentlichung belastbar prüfen.

**Prüfbereiche:**

- Layout bei 320 px, 390 px, Tablet und gängigen Desktopbreiten;
- aktuelle Safari-, Chrome-, Firefox- und Edge-Versionen nach festgelegter Supportmatrix;
- Tastatur, Fokus, Landmarken, Überschriften und Screenreader-Grundfluss;
- Kontrast, 200-%-Zoom, Textvergrößerung und `prefers-reduced-motion`;
- Bildgrößen, Ladeverhalten, Layoutstabilität und schwache Mobilverbindung;
- Links, Navigation, CTA-Ziele, 404-Verhalten und Druckdarstellung soweit relevant;
- Rechtschreibung, Begriffskonsistenz und Übereinstimmung mit der App;
- vollständiger Ausschluss echter Kunden- und Geschäftsdaten;
- Prüfung sämtlicher Produkt-, Preis-, Datenschutz- und Rechtsaussagen;
- externe Requests, Cookies, Logs und Formular-Datenwege gegen die Datenschutzerklärung.

**Gate:** keine kritischen Barrierefreiheits-, Inhalts-, Datenschutz- oder Funktionsmängel; definierte Leistungsbudgets werden eingehalten.

## Phase 6 – Hosting und Veröffentlichung

**Ziel:** kontrollierte, datensparsame Veröffentlichung.

**Aufgaben:**

- Hosting, Domain, TLS, Redirects und Cache-Strategie festlegen;
- Sicherheitsheader einschließlich CSP passend zur realen Website konfigurieren;
- Impressum und Datenschutzerklärung final prüfen;
- Backup- und Rollbackweg für die statischen Dateien testen;
- Vorschauabnahme und anschließend bewusste Produktionsfreigabe;
- Indexierung erst nach finaler Freigabe erlauben.

**Gate:** technische, rechtliche und inhaltliche Freigabe sind dokumentiert; Rollback ist möglich.

## Phase 7 – Lernen und Weiterentwicklung

**Ziel:** echte Verständnisprobleme beheben, ohne die Seite schrittweise zu überladen.

**Aufgaben:**

- direkte Rückmeldungen und Supportfragen strukturiert auswerten;
- technische Felddaten datensparsam beobachten, sofern freigegeben;
- CTA und Verständnis qualitativ prüfen;
- Inhalte mit dem tatsächlichen Produktstand synchron halten;
- neue Seiten nur bei belegtem Besucherbedarf ergänzen;
- veraltete Aussagen und Screenshots zeitnah entfernen.

## Prioritäten-Backlog

### P0 – vor einer ersten Veröffentlichung

- CTA-Ziel und Produktstatus;
- freigegebene Kernbotschaft;
- Startseite;
- Datenschutz- und Anbieterinformationen;
- mobile, barrierearme Navigation;
- echte technische und redaktionelle Qualitätssicherung.

### P1 – für einen vollständigen Marktauftritt

- Funktionen;
- Datenschutz & Daten;
- Preise oder transparente Verfügbarkeitsinformation;
- Hilfe / FAQ;
- Kontaktweg;
- gepflegte Produkt-Screenshots.

### P2 – nur nach nachgewiesenem Bedarf

- eigenständige Branchenseiten;
- redaktioneller Ratgeber;
- Kundenstimmen und Fallstudien;
- datenschutzgerecht begründete Erfolgsmessung;
- zusätzliche interaktive Produktdemonstrationen.

## Definition of Done je Seite

Eine Seite ist erst fertig, wenn:

- Zweck, Zielgruppe und primäre Handlung eindeutig sind;
- alle Aussagen eine benannte Quelle und Freigabe besitzen;
- Sprache kurz, konsistent und ohne unnötigen Fachjargon ist;
- mobile Darstellung und Bedienung ab 320 px funktionieren;
- semantische Struktur, Tastaturbedienung und sichtbarer Fokus geprüft sind;
- Medien optimiert, freigegeben und frei von echten Kundendaten sind;
- Kerninhalt ohne JavaScript verfügbar ist;
- keine unnötigen Drittanfragen oder Abhängigkeiten entstehen;
- Metadaten, Links und rechtliche Hinweise stimmen;
- die Seite gegen den aktuellen Produktstand geprüft wurde.

