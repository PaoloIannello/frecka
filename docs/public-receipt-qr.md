# Öffentliche Beleg- und Gutscheinlinks

**Stand:** COMM-001 / QR-002
**Public-Format:** `FPD`, Version `1`
**Persistenz:** keine; der Viewer liest ausschließlich das URL-Fragment

## Ziel und Systemgrenze

QR-002 ergänzt die lokalen Verwaltungs-Deep-Links um einen geräteübergreifenden Kundenlink. Ein zweites Gerät kann damit einen Beleg oder Gutschein anzeigen, ohne den Datensatz in seiner IndexedDB zu besitzen. FRECKA betreibt dafür weder eine zentrale Belegdatenbank noch eine serverseitige Auflösung.

Die für die Darstellung erforderlichen Daten liegen komprimiert im URL-Fragment. Ein Fragment wird beim Laden der statischen Anwendung nicht als Bestandteil des HTTP-Requests an den Webserver gesendet. Es ist dennoch kein Geheimnis: Wer QR-Code oder Link besitzt, kann den darin enthaltenen Beleg beziehungsweise Gutschein lesen und weitergeben.

Interne und öffentliche Links bleiben getrennt:

```text
#/receipt/<interne-stabile-id>
#/voucher/<interne-stabile-referenz>

#/p/r/1/d/<payload>.<prüfsumme>
#/p/v/1/d/<payload>.<prüfsumme>
```

`r` bezeichnet einen Beleg, `v` einen Gutschein, `1` die Public-Formatversion und `d` den Deflate-Codec. Die internen Links lösen weiterhin ausschließlich lokale Datensätze auf. Kunden-QRs und die daraus erzeugten Kunden-PDFs verwenden den öffentlichen Link.

## Komponenten und Datenfluss

- `js/documents.js` erzeugt weiterhin das zentrale fachliche Dokumentmodell.
- `js/public-documents.js` projiziert daraus eine datensparsame Public-Payload, kodiert und validiert sie und erzeugt den öffentlichen Link.
- `js/qr.js` kodiert diesen fertigen Link mit derselben zentralen QR-Engine wie alle anderen QR-Ausgaben.
- `js/document-view.js` stellt dasselbe Dokumentmodell in Unternehmeransicht und Public Viewer dar.
- `js/public-viewer.js` dekodiert den Link und bietet die lokale PDF-Erzeugung sowie Teilen an.
- `js/config.js` enthält mit `publicViewerBaseUrl` die einzige konfigurierbare öffentliche Basisadresse.

Der Ablauf lautet:

```text
gespeicherter Snapshot
→ zentrales DOCUMENT-001-Modell
→ Public-Whitelist-Projektion
→ JSON / UTF-8 / Deflate / Base64URL
→ Fragmentlink
→ FRECKA_QR.encodeAppLink(...)
→ QR-Matrix und SVG zur Laufzeit
```

Der QR selbst ist nicht Teil der Payload. Dadurch entsteht keine rekursive Einbettung. Nach dem Dekodieren erzeugt der Viewer den QR erneut aus dem vollständigen Public-Link.

## Basis-URL

`FRECKA_CONFIG.publicViewerBaseUrl` ist absichtlich unabhängig vom Dokumentformat. Ein leerer Wert verwendet Ursprung und Pfad der aktuell geladenen HTTPS-Anwendung. Query und vorhandenes Fragment werden entfernt, bevor die Public-Route gesetzt wird.

Für den aktuellen Teststand kann beispielsweise die GitHub-Pages-Adresse verwendet werden. Ein späterer Wechsel auf `https://app.frecka.eu` erfordert nur eine Konfigurationsänderung und keine Migration von Beleg-, Gutschein- oder Payloadmodellen.

## Public-Format FPD/v1

Das äußere Format ist ein kompaktes JSON-Array:

```text
["FPD", 1, "r" | "v", dokumentfelder]
```

Die Positionen sind durch die Version fest definiert. Das vermeidet wiederholte Objektschlüssel im QR, ohne ein zweites fachliches Dokumentmodell einzuführen.

### Belegfelder

Die Belegprojektion enthält in dieser Reihenfolge:

1. Belegnummer;
2. Belegart als Code: normaler Beleg, Gutscheinverkauf, Gutschrift oder Storno;
3. Zahlungsstatus als Code;
4. Zahlungsart als bekannter Code oder validierter Anzeigetext;
5. lokales Belegdatum und Uhrzeit im kompakten deutschen Dokumentformat;
6. Aussteller;
7. sichtbares Branding und Logo-Modus;
8. sichtbarer Kunde oder `null`;
9. Positionen;
10. Zwischensumme, Rabatt, Netto, Steuer und Brutto als Centwerte;
11. sichtbare Steuergruppen;
12. optionale Gutscheinzahlung mit maskiertem Gutscheincode;
13. optionale Restzahlung;
14. optionaler maskierter verknüpfter Gutscheincode;
15. optionaler Korrekturbezug;
16. Dankes- und Fußtext.

Eine Position enthält Bezeichnung, Menge, ursprünglichen Einzelpreis und Positionssumme. Bei einem sichtbaren Rabatt kommen Rabattbetrag und Rabattbezeichnung hinzu. Geldbeträge werden als ganzzahlige Centwerte transportiert; es findet keine erneute Steuer- oder Preisberechnung statt.

Normale Belege enthalten ausdrücklich keinen Leistungsort.

### Gutscheinfelder

Die Gutscheinprojektion enthält:

1. sichtbaren Gutscheincode;
2. Statuscode;
3. Ursprungswert und Restwert als Centwerte;
4. Ausstellungsdatum und Uhrzeit;
5. Aussteller;
6. sichtbares Branding und Logo-Modus;
7. optionalen Namen auf dem Gutschein;
8. Einlöseort, Anschrift und sichtbaren Einlösehinweis.

Der vollständige Gutscheincode ist Teil des sichtbaren Gutscheins und damit absichtlich Teil seiner Public-Payload. Kundenstamm, Verkaufsbelegreferenz und Gutscheinhistorie werden nicht transportiert.

## Datenschutz-Whitelist

Die Public-Projektion wird Feld für Feld aufgebaut. Das vollständige DOCUMENT-001-Modell, IndexedDB-Datensätze und Rohsnapshots dürfen niemals direkt serialisiert werden.

Nicht transportiert werden insbesondere:

- interne Beleg-, Kunden-, Gutschein-, QR- oder Geschäftsbereichs-IDs;
- Telefonnummern und E-Mail-Adressen von Unternehmen oder Kunden;
- Websites und echte Unternehmenslogo-Bilddaten;
- interne Notizen, Aktivitäten und Historien;
- Kundenstammdaten außerhalb der tatsächlich sichtbaren Beleganschrift;
- Verkaufsbeleg- und Einlösungsreferenzen des Gutscheins;
- Steuernummer, USt-IdNr. und weitere Steuerdaten;
- Leistungsorte normaler Belege;
- Rohsnapshots, IndexedDB-Inhalte, Logs oder Entwicklerdaten;
- QR-Grafiken, PDF-Dateien und Bilddaten.

Gutscheincodes auf Belegen werden vor der Projektion maskiert. Der Viewer escaped sämtliche transportierten Texte vor der HTML-Ausgabe.

## Kompression und Kodierung

Die feste Transportfolge ist:

1. validierte `FPD/v1`-Projektion mit `JSON.stringify()`;
2. UTF-8 mit `TextEncoder`;
3. browsernatives `CompressionStream("deflate")`, wenn verfügbar und kleiner als die Rohdaten;
4. Base64URL ohne Padding;
5. vollständige SHA-256-Prüfsumme der unkomprimierten UTF-8-Bytes, ebenfalls als Base64URL.

Der reguläre Codec ist `d`. Für kleine Dokumente unterstützt die Implementierung zusätzlich `n` als unkomprimierten Fallback, wenn `CompressionStream` nicht verfügbar ist und alle Größengrenzen dennoch eingehalten werden. Zum Lesen eines `d`-Links muss der Browser `DecompressionStream("deflate")` unterstützen. Es wird keine Kompressionsbibliothek nachgeladen.

## Integrität, nicht Authentizität

Beim Öffnen wird SHA-256 erneut über die dekomprimierten Rohbytes berechnet und mit der Prüfsumme aus dem Link verglichen. Erst danach werden UTF-8, JSON, Formatkennzeichen, Version, Typ, Feldlängen, Wertebereiche und Dokumentgrenzen validiert. Beschädigte, unvollständige oder unbekannte Formate erhalten einen klaren Fehlerzustand.

Die Prüfsumme ist keine Signatur. Jeder, der eine Payload verändern kann, kann auch eine neue SHA-256-Prüfsumme bilden. Die Public-Ansicht darf deshalb nicht als kryptografisch verifizierter Originalbeleg bezeichnet werden. Eine echte Echtheitsprüfung benötigt eine Schlüssel- und Signaturarchitektur und gehört nicht zu QR-002. Benutzer-, Sitzungs- und lokale Anmeldekonzepte folgen ebenfalls erst in AUTH-001.

## Zustandsloser Public Viewer

Eine Route unter `#/p/` wird vor der Initialisierung der Unternehmeranwendung erkannt. `js/app.js` montiert den Public Viewer und beendet anschließend den normalen Startpfad. Der Viewer:

- liest ausschließlich den übergebenen Fragmentlink;
- initialisiert, liest und beschreibt keine FRECKA-IndexedDB;
- schreibt weder `localStorage` noch `sessionStorage`;
- importiert den fremden Beleg oder Gutschein nicht in lokale Unternehmerdaten;
- zeigt keine Navigation, Einstellungen oder Verwaltungsaktionen;
- verwendet die zentrale Dokumentansicht;
- kann mit DOCUMENT-001 lokal ein PDF erzeugen;
- kann PDF beziehungsweise Link über den zentralen Share-Service teilen;
- zeigt bei ungültiger Version, Beschädigung oder nicht unterstützter Dekompression eine verständliche Fehlermeldung.

Das Laden der statischen App-Hülle verursacht normale Asset-Requests. Der Fragmentinhalt wird von FRECKA weder an eine API gesendet noch protokolliert oder analysiert.

## Größen- und Dichtegrenzen

QR-002 setzt folgende harten Grenzen:

| Grenze | Wert |
|---|---:|
| unkomprimierte UTF-8-Payload | 16 KiB |
| Deflate- beziehungsweise Transportdaten | 900 Byte |
| vollständiger Public-Link | 1.280 Zeichen |
| Positionen je Beleg | 25 |
| QR-Version bei Fehlerkorrektur M | 30 |

Rohdaten-, Transport-, Positions- und QR-Grenzen werden beim Erzeugen und beim Lesen kontrolliert; die URL-Länge wird beim Erzeugen des Links begrenzt. Die tatsächlich vom zentralen QR-Service gemeldete Version ist maßgeblich. Wird eine Grenze überschritten oder kann der Encoder keinen QR erzeugen, behauptet FRECKA keinen funktionierenden Kunden-QR. PDF und Teilen bleiben als Fallback verfügbar; es wird weder eine Serverablage noch ein Mehrfach-QR eingeführt.

## Reproduzierbare Messwerte

`tests/measure-public-qr.mjs` verwendet den produktiven Public-Codec, den lokal vendorten QR-Encoder, Fehlerkorrektur M und die aktuelle GitHub-Pages-Basis. Die Werte bezeichnen unkomprimierte UTF-8-Bytes, Deflate-Bytes und die Länge des vollständigen Links.

| Fall | Rohdaten | Deflate | Link | QR-Version | Matrix |
|---|---:|---:|---:|---:|---:|
| klein, 1 Position | 383 B | 292 B | 483 | 17 | 85 × 85 |
| normal, 3 Positionen | 488 B | 361 B | 575 | 19 | 93 × 93 |
| Umlaute/Sonderzeichen | 752 B | 522 B | 789 | 23 | 109 × 109 |
| lang, 20 Positionen | 1.683 B | 833 B | 1.204 | 29 | 133 × 133 |
| lang, 25 Positionen | 1.956 B | 883 B | 1.271 | 30 | 137 × 137 |
| Gutschein | 415 B | 312 B | 509 | 18 | 89 × 89 |

Die 20- und 25-Positionen-Fälle enthalten bewusst lange Bezeichnungen, Umlaute, Rabatte, zwei Steuergruppen, Kundenanschrift, Gutschein-/Restzahlung und längere Belegtexte. Sie bilden damit die Dichtegrenze ab, nicht den typischen Kleinstbeleg.

## Darstellungsgeometrie und reales Release-Gate

Die QR-Matrix erhält in der zentralen Engine eine Ruhezone von vier Modulen je Seite. Die Vollbildansicht verwendet bis zu `94vw`. Daraus ergeben sich ungefähr folgende Modulgrößen in CSS-Pixeln:

| QR-Version | 320 px Viewport | 390 px Viewport |
|---:|---:|---:|
| 17 | 3,23 px | 3,94 px |
| 19 | 2,98 px | 3,63 px |
| 23 | 2,57 px | 3,13 px |
| 29 | 2,13 px | 2,60 px |
| 30 | 2,07 px | 2,53 px |

Der Beleg-QR im PDF ist rund 68,7 mm breit und wird vektoriell gezeichnet. Bei Version 29 verbleiben ungefähr 0,487 mm, bei Version 30 ungefähr 0,474 mm je Modul einschließlich der Ruhezone in der Gesamtbreite. Der gemessene Gutschein der Version 18 erreicht im rund 44,1 mm breiten Gutschein-QR ungefähr 0,455 mm je Modul.

Diese Geometrie und ein technisch dekodierbarer Encoderlauf ersetzen keinen Kameratest. Vor einer produktiven Freigabe müssen insbesondere QR-Version 29 und 30 mit realen iPhones/iPads und Android-Geräten geprüft werden:

- Vollbild bei 320 px und 390 px;
- normale und reduzierte Bildschirmhelligkeit;
- gerader und leicht schräger Scan;
- Beleg-PDF auf Bildschirm und Ausdruck;
- Gutschein auf Bildschirm und im PDF.

Schlägt diese Zielgeräteprüfung fehl, muss die zulässige QR-Version abgesenkt werden. FRECKA darf die Grenzen nicht erhöhen und keine Scanbarkeit behaupten, nur weil der Encoder noch eine Matrix erzeugt.

## Bekannte Grenzen

- Besitzer des Links können den sichtbaren Dokumentinhalt lesen und weitergeben.
- SHA-256 erkennt Beschädigung, beweist aber weder Herausgeber noch Unverändertheit gegen einen aktiven Manipulator.
- Alte Browser ohne `DecompressionStream` können Deflate-Links nicht öffnen.
- Reale Logo-Bilddateien werden nicht in den QR eingebettet; QR-002 transportiert nur den sichtbaren Logo-Modus der aktuellen Dokumentdarstellung.
- Dokumente außerhalb der Grenzen besitzen weiterhin PDF- und Share-Ausgabe, aber keinen behaupteten geräteübergreifenden Kunden-QR.
- Es gibt keine zentrale Wiederauffindbarkeit, Sperrung oder nachträgliche Aktualisierung eines einmal ausgegebenen Fragmentlinks.
- QR-002 enthält keine Signatur-, TSE-, Benutzer-, Sitzungs-, Mail-, Cloud- oder Serverarchitektur.

## Prüfvertrag

Automatisierte Tests müssen mindestens abdecken:

- Beleg- und Gutschein-Roundtrip ohne vorhandene IndexedDB-Daten;
- Formatkennzeichen, Version, Dokumenttyp und Codec;
- identische sichtbare Beträge zum DOCUMENT-001-Modell;
- fehlenden Leistungsort beim normalen Beleg;
- Einlöseort beim Gutschein;
- Ausschluss von Telefon, E-Mail, Notizen, Historien und internen IDs;
- Umlaute und Sonderzeichen;
- Beschädigung, unbekannte Version und ungültige Payload;
- 26 Positionen sowie Transport-, Link- und QR-Übergröße;
- HTML-Escaping im Viewer;
- PDF und Teilen aus dem zustandslosen Viewer;
- keine Änderung lokaler Unternehmerdaten;
- Regression von Persistenz, Backup, Export, QR-001 und DOCUMENT-001.

Die reproduzierbare Größenmessung erfolgt separat mit `tests/measure-public-qr.mjs`. Reale iOS-/iPadOS- und Android-Kameratests bleiben bis zur Durchführung ausdrücklich offen.
