# 06 – Asset List

## 1. Zweck

Dieses Dokument plant alle voraussichtlich benötigten visuellen und technischen Assets. In WEBSITE-002 werden keine Assets erstellt, generiert, kopiert oder bearbeitet.

## 2. Asset-Grundsätze

- Nur Assets mit klarer Aufgabe werden aufgenommen.
- Herkunft, Urheberrecht, Lizenz und Freigabe werden dokumentiert.
- Keine echten Kunden- oder Geschäftsdaten.
- Lokale Auslieferung wird bevorzugt; keine unnötigen Drittanbieter-CDNs.
- Jedes Bild erhält definierte Abmessungen, Dateigröße und zugänglichen Textzweck.
- Originaldatei und ausgelieferte Ableitungen werden nachvollziehbar getrennt.
- Produktdarstellungen müssen einem freigegebenen App-Stand entsprechen.
- Logos und Bilder entstehen erst in einer ausdrücklich beauftragten späteren Phase.

## 3. Markenassets

| Asset | Zweck | Formate später | Priorität | Status/Entscheidung |
| --- | --- | --- | --- | --- |
| FRECKA Hauptlogo | Header, Footer, rechtliche/soziale Verwendung | SVG, optional PNG-Fallback | P0 | nicht vorhanden bzw. nicht freigegeben; nicht in dieser Phase erstellen |
| FRECKA Wortmarke | kompakte Headerdarstellung | SVG | P0 | Markenentscheidung offen |
| FRECKA Bildmarke | Favicon, App-/Social-Kontext | SVG-Quelle | P0 | Markenentscheidung offen |
| Logo monochrom | helle/dunkle Sonderflächen | SVG | P1 | erst nach Hauptlogo ableiten |
| Logo-Schutzraum-Spezifikation | konsistente Anwendung | Dokumentation | P1 | mit Logoentwicklung definieren |

Vor Logoerstellung müssen Name, Schreibweise, Bildmarkenbedarf, Mindestgröße und Verwendung zwischen App und Website geklärt sein.

## 4. Browser- und Plattformassets

| Asset | Zweck | Formate später | Priorität | Hinweise |
| --- | --- | --- | --- | --- |
| Favicon | Browser-Tab und Lesezeichen | SVG und ICO/PNG-Fallback | P0 | aus freigegebener Bildmarke |
| Apple Touch Icon | iOS-Lesezeichen | PNG 180 × 180 | P1 | keine transparente Randfalle |
| Web App Icons | nur falls Website installierbar werden soll | PNG in nötigen Größen | P2 | nicht mit App-PWA vermischen |
| Mask Icon | Safari-Pinned-Tab, falls unterstützt/benötigt | SVG monochrom | P2 | tatsächlichen Support prüfen |
| Theme Color Definition | Browserchrome | Metadatenwert, kein Bild | P1 | aus finaler Palette ableiten |

## 5. App-Screenshots

### P0 – empfohlener Mindestumfang

| Screenshot | Beweist | Priorität | Freigabebedingung |
| --- | --- | --- | --- |
| Start-/Kassenansicht | direkter Einstieg und klare Orientierung | P0 | stabiler Release, fiktiver Betrieb |
| Leistungsauswahl | schneller Kernschritt | P0 | lesbare Preise und fiktive Leistungen |
| Auswahl/Warenkorb | unmittelbare Rückmeldung und Überblick | P0 | Summen fachlich konsistent |
| Zahlungs-/Abschlussansicht | geführter Abschluss | P0 | nur freigegebene Zahlungsarten |
| fertiger Beleg | sichtbares Ergebnis | P0 | vollständig fiktive Person-/Betriebsdaten |

### P1 – vertiefende Ansichten

| Screenshot | Beweist | Priorität | Freigabebedingung |
| --- | --- | --- | --- |
| Kundenübersicht | optionale Kundenverwaltung | P1 | keine echten Kontakte |
| Gutscheinansicht | zusammenhängender Produktumfang | P1 | fachlich freigegebener Ablauf |
| Exportansicht | bewusste Weitergabe | P1 | keine Rechts-/DATEV-Behauptung ableiten |
| Backupansicht | kontrollierte Sicherung | P1 | Passphrase und Dateiname fiktiv |
| Daten-/Lizenzinformation | Transparenz | P1 | technische Erklärung freigegeben |

### Screenshot-Spezifikation später

- ein festgelegtes Referenzgerät bzw. Viewport;
- einheitliche Pixeldichte;
- verlustfreie Masterdatei;
- optimierte Webausgabe, bevorzugt AVIF/WebP mit geeignetem Fallback;
- feste Breite und Höhe zur Vermeidung von Layoutverschiebungen;
- sichtbare Caption und kontextbezogener Alternativtext;
- Metadaten vor Veröffentlichung entfernen;
- Dateinamen beschreibend und versionsneutral, Releasebezug separat dokumentieren.

## 6. Device-Mockups

| Asset | Zweck | Format später | Priorität | Entscheidung |
| --- | --- | --- | --- | --- |
| neutraler Smartphone-Frame | mobilen Produktkontext zeigen | SVG oder CSS-native Form | P0 | bevorzugt abstrahiert, ohne Herstellerbranding |
| rahmenlose Screenshot-Bühne | maximale Lesbarkeit auf Mobilgeräten | kein separates Asset oder SVG-Rahmen | P0 | bevorzugte mobile Variante |
| Tablet-Frame | nur bei echtem Tablet-Anwendungsfall | SVG | P2 | nicht vorsorglich erstellen |
| Desktop-Frame | nur bei echter Desktop-Produktdarstellung | SVG | P2 | kein dekorativer Browserframe |

Keine perspektivischen Geräteszenen, schwebenden Gerätefächer oder fotorealistischen Fremdgeräte ohne konkreten Bedarf.

## 7. Fotografie

Fotografie ist optional und darf die erste Veröffentlichung nicht blockieren, wenn Produktansichten die Botschaft ausreichend tragen.

### Mögliche Motive

| Motiv | Zweck | Priorität | Anforderungen |
| --- | --- | --- | --- |
| ruhiger Moment nach einer Dienstleistung | Alltagssituation eröffnen | P1 | echte Umgebung, natürliche Handlung |
| Hände und Arbeitswerkzeug | handwerkliche Nähe | P1 | keine Kundendaten oder fremde Marken |
| Smartphone als beiläufiges Werkzeug | mobilen Kontext zeigen | P1 | App-Inhalt separat freigegeben |
| Details verschiedener Gewerke | Zielgruppenbreite | P2 | keine stereotypen Klischees |
| Porträt eines echten Pilotbetriebs | Vertrauensbeleg | P2 | schriftliche Einwilligung und Nutzungsumfang |

### Benötigte Varianten

- Hochformat für mobile Abschnitte;
- Querformat für breite Kompositionen;
- alternative Zuschnitte mit sicherem Motivzentrum;
- 1×/2×-Ausgaben abhängig von Darstellungsgröße;
- Webformate mit dokumentiertem Original.

KI-generierte Fotos sind nicht vorgesehen. Eine spätere Nutzung benötigte eine ausdrückliche kreative, ethische und rechtliche Entscheidung.

## 8. Icons

### Kernbedarf

- Navigation, falls Text allein nicht reicht;
- drei Prozessschritte;
- bis zu vier Nutzenpunkte;
- Datenweg: Gerät, Sicherung/Export, gewähltes Ziel;
- Pfeile für Textlinks;
- Plus/Minus oder Chevron für FAQ;
- Menü öffnen/schließen;
- externe Links, falls vorhanden;
- Status: Information, Erfolg, Warnung, Fehler;
- optional Vergrößern/Schließen bei Screenshots.

### Spezifikation

- lokale SVG-Dateien oder bewusstes Inline-SVG-Konzept;
- konsistente ViewBox, Strichstärke, Linienenden und optische Größe;
- Farben über aktuelle Textfarbe steuerbar;
- dekorative Icons ohne zugängliche Dopplung;
- keine Iconfont;
- Lizenz und Quelle pro Set dokumentieren;
- keine Emojis als Produktionsicons.

## 9. Illustrationen und Informationsgrafiken

| Asset | Zweck | Priorität | Entscheidung |
| --- | --- | --- | --- |
| Drei-Schritte-Ablauf | Kernprozess erklären, falls Screenshots nicht genügen | P1 | eher aus UI-Ausschnitten als frei illustrieren |
| Datenfluss-Grafik | lokale Verarbeitung und bewusste Weitergabe erklären | P1 | reduzierte beschriftete SVG-Grafik |
| Branchenmuster | atmosphärische Ergänzung | P2 | nur bei eigener visueller Aufgabe |
| dekorative Hero-Illustration | keine | – | ausdrücklich nicht vorgesehen |

## 10. Social- und Sharing-Assets

| Asset | Zweck | Format später | Priorität | Hinweise |
| --- | --- | --- | --- | --- |
| Open-Graph-Bild | Linkvorschau | PNG/JPEG, plattformsicherer Zuschnitt | P1 | freigegebene Marke, kurze Botschaft, keine echten Daten |
| Social-Square | optionale Profile | PNG | P2 | aus derselben visuellen Sprache |
| Social-Avatar | Profilbild | PNG | P2 | aus freigegebener Bildmarke |

Die Social-Vorschau darf keine Funktion oder Verfügbarkeit suggerieren, die auf der Zielseite nicht bestätigt wird.

## 11. Schriftassets

### Empfehlung

Zunächst Systemschrift verwenden. Dadurch entfallen zusätzlicher Download, Lizenzablage und mögliche Darstellungsverzögerung.

### Falls Inter lokal freigegeben wird

Benötigt werden nur tatsächlich verwendete Schnitte, voraussichtlich:

- Regular;
- Medium oder Semibold;
- Bold oder ExtraBold für kurze Überschriften.

Anforderungen:

- WOFF2;
- dokumentierte Lizenz;
- sinnvolle Untermenge ohne Verlust deutscher Zeichen;
- definierte Fallbackmetrik zur Verringerung von Layoutverschiebungen;
- keine Abfrage externer Fontdienste.

## 12. Rechtliche und redaktionelle Begleitassets

- Nachweisdatei zu Herkunft und Lizenz jedes Fremdassets;
- Einwilligungen für erkennbare Personen, Betriebe und Zitate;
- Screenshot-Freigabeliste mit App-Version und Datensatz;
- Alt-Text-Inventar;
- Bildunterschriften und Quellen;
- Aufbewahrungs- und Widerrufsprozess für Foto-/Zitatfreigaben;
- Impressums- und Datenschutzinhalte als Text, nicht als Bild;
- keine Siegelgrafik ohne gültige Berechtigung und Nutzungsregeln.

## 13. Empfohlene spätere Ablagestruktur

```text
website/assets/
├── brand/
│   ├── source/
│   └── web/
├── icons/
├── images/
│   ├── photos/
│   ├── screenshots/
│   │   ├── source/
│   │   └── web/
│   └── social/
├── mockups/
└── fonts/
```

Quellassets mit großen Dateien müssen vor Aufnahme in Git bewusst geprüft werden. Generierte Webvarianten benötigen einen nachvollziehbaren, auch ohne Build-Tool dokumentierten Erstellungsprozess.

## 14. Asset-Produktionsreihenfolge

1. Markenentscheidung und vorhandene Rechte klären.
2. Hauptlogo/Wortmarke und Browserassets beauftragen.
3. stabilen App-Release und fiktiven Demo-Datensatz einfrieren.
4. P0-Screenshots erfassen und freigeben.
5. neutralen Device Frame festlegen.
6. minimales SVG-Iconset kuratieren.
7. entscheiden, ob Fotografie für Version 1 überhaupt nötig ist.
8. Datenfluss-Grafik nur nach fachlicher Textfreigabe erstellen.
9. Social-Preview aus finalem Seitenkonzept ableiten.
10. alle Assets technisch, rechtlich und barrierebezogen abnehmen.

## 15. Asset-Abnahmecheckliste

Ein Asset ist erst einsatzbereit, wenn:

- Zweck und Seite benannt sind;
- Quelle, Urheber und Lizenz dokumentiert sind;
- Personen- und Betriebsfreigaben vorliegen;
- keine echten Kunden- oder Geschäftsdaten sichtbar oder in Metadaten enthalten sind;
- Inhalt dem freigegebenen Produktstand entspricht;
- Zuschnitt und Lesbarkeit mobil geprüft sind;
- Abmessungen und Dateigröße zum Nutzungskontext passen;
- Alt-Text oder dekorativer Status definiert ist;
- helle und gegebenenfalls dunkle Nutzung geprüft sind;
- keine unnötige externe Anfrage entsteht;
- eine ältere Fassung eindeutig ersetzt oder archiviert werden kann.

