# Zentrale QR-Infrastruktur

**Stand:** QR-002 / COMM-001
**Datenbankschema:** unverändert Version 5
**Persistenz:** stabile interne Referenzen bleiben lokal; Public-Payload und QR-Bilder werden nicht gespeichert

## Ziel und Abgrenzung

QR-001 führte genau eine QR-Infrastruktur für FRECKA ein. QR-002 verwendet dieselbe Service-API nun sowohl für lokale Verwaltungs-Deep-Links als auch für geräteübergreifende Kundenlinks. Belege, Gutscheinverkaufsbelege und Gutscheine werden weiterhin vom selben Encoder ausgegeben. Spätere Ausgaben wie Mail oder eine kundeneigene Synology dürfen ebenfalls nur diese API verwenden.

Nicht Bestandteil sind Kamera-Scan, Cloudauflösung, serverseitige Belegablage, TSE, Mailversand oder Synology-Kommunikation. Ein interner QR enthält weiterhin nur eine stabile lokale Referenz. Ein Kunden-QR enthält einen Public-Viewer-Link mit einer datensparsamen, versionierten Dokumentprojektion im URL-Fragment. Die Abgrenzung und das Format sind in `docs/public-receipt-qr.md` verbindlich beschrieben.

## Komponenten

- `vendor/qrcodegen-v1.8.0-es6.js` ist der lokal ausgelieferte, fest versionierte QR-Kern von Project Nayuki.
- `js/qr.js` ist die einzige öffentliche FRECKA-QR-Komponente und stellt `globalThis.FRECKA_QR` bereit.
- `js/public-documents.js` erzeugt und validiert die Public-Links, ohne eine zweite QR-Implementierung einzuführen.
- `js/public-viewer.js` liest Public-Fragmente zustandslos und ohne IndexedDB-Zugriff.
- `js/config.js` hält die austauschbare `publicViewerBaseUrl`.
- `js/app.js` verwendet ausschließlich diese Services für Beleg, Gutschein, Vollbild und Link-Auflösung.

Die QR-Bibliothek wird nicht über CDN oder Netzwerk nachgeladen. Sie besitzt keine Laufzeitabhängigkeiten. Lizenz und Copyright liegen in `vendor/qrcodegen-v1.8.0.LICENSE.txt` und im Kopf der kompilierten Quelldatei.

Die kleine Bibliothek ist notwendig, weil die Webplattform QR-Codes darstellen und erkennen, aber nicht standardisiert erzeugen kann. FRECKA implementiert die QR-Mathematik deshalb nicht selbst. Die fachliche API bleibt vom Encoder getrennt, damit der Kern später geprüft ausgetauscht werden kann, ohne Beleg- oder Gutscheinlogik umzubauen.

## Öffentliche Service-API

`FRECKA_QR` stellt bereit:

- `buildAppLink(kind, reference, baseUrl)` erzeugt den kanonischen App-Link;
- `create(kind, reference, options)` verbindet Referenz, App-Link, QR-Matrix und SVG;
- `encodeAppLink(appLink, options)` kodiert einen beliebigen gültigen HTTP(S)-App-Link für spätere Verbraucher;
- `parseAppLink(value, baseUrl)` löst Beleg- und Gutscheinlinks wieder in Typ und Referenz auf.

Das Ergebnis wird ausschließlich im Arbeitsspeicher erzeugt und enthält Link, unveränderliche Modulmatrix und skalierbares SVG. Es enthält kein PNG, Blob, Data-URL oder dauerhaftes Bildobjekt.

## Interne App-Link-Struktur

Kanonische Links verwenden den aktuellen FRECKA-App-Ursprung und -Pfad:

```text
https://<frecka-app>/<pfad>/#/receipt/<stabile-beleg-id>
https://<frecka-app>/<pfad>/#/voucher/<stabile-qr-referenz>
```

Query-Parameter werden nicht übernommen. Referenzen werden als einzelnes URL-Segment sicher kodiert. Zulässig sind ausschließlich nicht leere, begrenzte Referenzen ohne Steuerzeichen sowie HTTP(S)-Links.

Die Auflösung erfolgt nach dem Laden der vorhandenen IndexedDB-Daten. Ein Reload eines gültigen Links öffnet den lokalen Beleg beziehungsweise Gutschein erneut. Fehlt der Datensatz auf dem aktuellen Gerät oder ist die Referenz ungültig, zeigt FRECKA einen klaren Fehlerzustand. Es gibt keine zentrale oder geräteübergreifende Datenauflösung.

## Öffentliche Kundenlinks

Kundenlinks verwenden eine getrennte Fragmentroute:

```text
https://<public-viewer-basis>/#/p/r/1/d/<payload>.<sha256>
https://<public-viewer-basis>/#/p/v/1/d/<payload>.<sha256>
```

Die Basis wird zentral über `FRECKA_CONFIG.publicViewerBaseUrl` konfiguriert. Ein leerer Wert verwendet die aktuelle Deployment-Adresse. `FPD/v1`, Whitelist, Deflate/Base64URL, Integritätsprüfung, Datenschutz, Größengrenzen und Messwerte stehen in `docs/public-receipt-qr.md`.

Der Public Viewer benötigt keine lokale Beleg- oder Gutschein-IndexedDB. Er erzeugt aus der validierten Payload dasselbe DOCUMENT-001-Modell für Bildschirm und PDF. Die Payload wird weder ungefragt importiert noch in Browser-Speicher geschrieben.

## Darstellung

Der Service erzeugt ein SVG mit schwarzer Matrix, weißem Hintergrund, scharfen Modulgrenzen und einer Ruhezone von vier Modulen. Das SVG skaliert verlustfrei und eignet sich damit auch als gemeinsame Grundlage für spätere Dokumentausgaben.

Der QR-Code steht am unteren Ende jedes Belegpapiers, zentriert und nahezu über die gesamte verfügbare Breite. Darunter steht ausschließlich „Digitaler Beleg“. Gutscheinverkauf, Gutscheindetail und Gutscheinvorlage verwenden denselben QR-Renderer. In der Kundenausgabe kodiert dieser Renderer den tatsächlich geräteübergreifend nutzbaren Public-Link, nicht den lokalen Verwaltungslink.

Antippen eines QR-Codes oder der Aktion „QR-Code anzeigen“ öffnet eine bildschirmfüllende Ebene innerhalb der PWA. In ihr sind nur QR-Code und der kleine Button „Fertig“ sichtbar; Anwendungsnavigation, Menüs und Werkzeugleisten werden vollständig überdeckt. Die Implementierung erzwingt keinen browsernativen Vollbildmodus und löst deshalb keine Berechtigungs- oder Kompatibilitätsprobleme aus. Fokus, Escape-Taste, Scrollsperre und Rückkehrfokus werden kontrolliert behandelt.

Eine Änderung der Gerätehelligkeit ist nicht implementiert. Die Webplattform bietet dafür keine hinreichend unterstützte Standard-API; FRECKA baut keine Umgehung.

## Datenschutz und Persistenz

- Interne QR-Inhalte bestehen nur aus App-Ursprung, Route und opaker stabiler Referenz.
- Public-QRs enthalten ausschließlich die sichtbare, ausdrücklich freigegebene `FPD/v1`-Dokumentprojektion. Wer QR oder Link besitzt, kann diesen Inhalt lesen.
- Telefon, E-Mail, interne IDs, Notizen, Historien, Rohsnapshots und Leistungsorte normaler Belege werden nicht in Public-Links aufgenommen.
- Geschäftsdaten bleiben in IndexedDB auf dem Unternehmergerät; der Public Viewer greift nicht darauf zu.
- QR-Matrix und SVG werden immer neu im Arbeitsspeicher erzeugt.
- Backup und Export enthalten weiterhin keine QR-Grafiken.
- Der QR-Service liest und schreibt weder IndexedDB noch andere Browser-Speicher.
- Es gibt keinen Belegdaten-API-Aufruf, keine Telemetrie und keine externe QR-API. Der statische App-Viewer wird regulär über HTTPS geladen; das URL-Fragment wird dabei nicht an den Server übertragen.

## Fehlerverhalten

Leere, zu lange oder Steuerzeichen enthaltende Referenzen, unbekannte Dokumenttypen, unsichere Linkprotokolle und fehlerhafte QR-Matrizen werden abgewiesen. Public-Links werden zusätzlich auf Format, Version, Codec, SHA-256-Integrität, UTF-8, Feldgrenzen, maximal 25 Positionen, höchstens 900 Transportbytes, 1.280 URL-Zeichen und QR-Version 30 geprüft. Die UI zeigt in diesen Fällen eine verständliche Meldung und niemals einen leeren QR-Platzhalter. Bei Übergröße bleiben PDF und Teilen als ehrlicher Fallback verfügbar.

## Prüfungen

`tests/persistence-smoke.html` lädt denselben produktiven QR-Kern und prüft weiterhin die QR-001-Verträge:

- öffentliche, versionierte Service-API;
- kanonische Beleg- und Gutscheinlinks;
- Deep-Link-Roundtrip;
- quadratische QR-Matrix, Vier-Modul-Ruhezone und SVG;
- drei normgerechte Suchmuster;
- allgemeine App-Link-Kodierung für spätere Verbraucher;
- getrennte Inhalte für Beleg und Gutschein;
- klare Ablehnung ungültiger Referenzen, Typen und Protokolle.

QR-002 ergänzt Roundtrip-, Datenschutz-, Beschädigungs-, Versions-, Übergrößen-, Public-PDF-, Share- und Stateless-Viewer-Fälle. `tests/measure-public-qr.mjs` misst reproduzierbar kleinen, normalen, Umlaut-, 20- und 25-Positionen-Beleg sowie Gutschein mit dem produktiven Codec und Encoder.

Beleg, Gutschein, Vollbild, 320 px, 390 px, horizontaler Überlauf und Browserkonsole werden zusätzlich geprüft. Reale Kamera-Scans der dichten QR-Versionen 29 und 30 auf iOS/iPadOS und Android bleiben vor einer produktiven Freigabe zwingend offen; ein erfolgreicher Encoderlauf allein beweist keine praktische Scanbarkeit.
