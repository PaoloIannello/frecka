# Zentrale QR-Infrastruktur

**Stand:** QR-001  
**Datenbankschema:** unverändert Version 5  
**Persistenz:** ausschließlich stabile Referenzen und bestehende App-Links; keine QR-Bilder

## Ziel und Abgrenzung

QR-001 führt genau eine QR-Infrastruktur für FRECKA ein. Belege und Gutscheine verwenden dieselbe öffentliche Service-API. Spätere Ausgaben wie PDF, Mail, Download oder eine kundeneigene Synology dürfen ebenfalls nur diese API verwenden.

Nicht Bestandteil sind Kamera-Scan, Cloudauflösung, Server, TSE, PDF-Erzeugung, Mailversand oder Synology-Kommunikation. Ein QR-Code enthält niemals den Beleg oder Gutschein selbst, sondern nur einen stabilen FRECKA-App-Link.

## Komponenten

- `vendor/qrcodegen-v1.8.0-es6.js` ist der lokal ausgelieferte, fest versionierte QR-Kern von Project Nayuki.
- `js/qr.js` ist die einzige öffentliche FRECKA-QR-Komponente und stellt `globalThis.FRECKA_QR` bereit.
- `js/app.js` verwendet ausschließlich diesen Service für Beleg, Gutschein, Vollbild und Deep-Link-Auflösung.

Die QR-Bibliothek wird nicht über CDN oder Netzwerk nachgeladen. Sie besitzt keine Laufzeitabhängigkeiten. Lizenz und Copyright liegen in `vendor/qrcodegen-v1.8.0.LICENSE.txt` und im Kopf der kompilierten Quelldatei.

Die kleine Bibliothek ist notwendig, weil die Webplattform QR-Codes darstellen und erkennen, aber nicht standardisiert erzeugen kann. FRECKA implementiert die QR-Mathematik deshalb nicht selbst. Die fachliche API bleibt vom Encoder getrennt, damit der Kern später geprüft ausgetauscht werden kann, ohne Beleg- oder Gutscheinlogik umzubauen.

## Öffentliche Service-API

`FRECKA_QR` stellt bereit:

- `buildAppLink(kind, reference, baseUrl)` erzeugt den kanonischen App-Link;
- `create(kind, reference, options)` verbindet Referenz, App-Link, QR-Matrix und SVG;
- `encodeAppLink(appLink, options)` kodiert einen beliebigen gültigen HTTP(S)-App-Link für spätere Verbraucher;
- `parseAppLink(value, baseUrl)` löst Beleg- und Gutscheinlinks wieder in Typ und Referenz auf.

Das Ergebnis wird ausschließlich im Arbeitsspeicher erzeugt und enthält Link, unveränderliche Modulmatrix und skalierbares SVG. Es enthält kein PNG, Blob, Data-URL oder dauerhaftes Bildobjekt.

## App-Link-Struktur

Kanonische Links verwenden den aktuellen FRECKA-App-Ursprung und -Pfad:

```text
https://<frecka-app>/<pfad>/#/receipt/<stabile-beleg-id>
https://<frecka-app>/<pfad>/#/voucher/<stabile-qr-referenz>
```

Query-Parameter werden nicht übernommen. Referenzen werden als einzelnes URL-Segment sicher kodiert. Zulässig sind ausschließlich nicht leere, begrenzte Referenzen ohne Steuerzeichen sowie HTTP(S)-Links.

Die Auflösung erfolgt nach dem Laden der vorhandenen IndexedDB-Daten. Ein Reload eines gültigen Links öffnet den lokalen Beleg beziehungsweise Gutschein erneut. Fehlt der Datensatz auf dem aktuellen Gerät oder ist die Referenz ungültig, zeigt FRECKA einen klaren Fehlerzustand. Es gibt keine zentrale oder geräteübergreifende Datenauflösung.

## Darstellung

Der Service erzeugt ein SVG mit schwarzer Matrix, weißem Hintergrund, scharfen Modulgrenzen und einer Ruhezone von vier Modulen. Das SVG skaliert verlustfrei und eignet sich damit auch als gemeinsame Grundlage für spätere Dokumentausgaben.

Der QR-Code steht am unteren Ende jedes Belegpapiers, zentriert und nahezu über die gesamte verfügbare Breite. Darunter steht ausschließlich „Digitaler Beleg“. Gutscheinverkauf, Gutscheindetail und Gutscheinvorlage verwenden denselben QR-Renderer.

Antippen eines QR-Codes oder der Aktion „QR-Code anzeigen“ öffnet eine bildschirmfüllende Ebene innerhalb der PWA. In ihr sind nur QR-Code und der kleine Button „Fertig“ sichtbar; Anwendungsnavigation, Menüs und Werkzeugleisten werden vollständig überdeckt. Die Implementierung erzwingt keinen browsernativen Vollbildmodus und löst deshalb keine Berechtigungs- oder Kompatibilitätsprobleme aus. Fokus, Escape-Taste, Scrollsperre und Rückkehrfokus werden kontrolliert behandelt.

Eine Änderung der Gerätehelligkeit ist nicht implementiert. Die Webplattform bietet dafür keine hinreichend unterstützte Standard-API; FRECKA baut keine Umgehung.

## Datenschutz und Persistenz

- QR-Inhalte bestehen nur aus App-Ursprung, Route und opaker stabiler Referenz.
- Geschäftsdaten bleiben in IndexedDB auf dem Endgerät.
- QR-Matrix und SVG werden immer neu im Arbeitsspeicher erzeugt.
- Backup und Export enthalten weiterhin keine QR-Grafiken.
- Der QR-Service liest und schreibt weder IndexedDB noch andere Browser-Speicher.
- Es gibt keinen Netzwerkaufruf, keine Telemetrie und keine externe QR-API.

## Fehlerverhalten

Leere, zu lange oder Steuerzeichen enthaltende Referenzen, unbekannte Dokumenttypen, unsichere Linkprotokolle und fehlerhafte QR-Matrizen werden abgewiesen. Die UI zeigt in diesen Fällen eine verständliche Meldung und niemals einen leeren QR-Platzhalter.

## Prüfungen

`tests/persistence-smoke.html` lädt denselben produktiven QR-Kern und prüft zusätzlich zu den bisherigen 79 Fällen acht QR-Fälle:

- öffentliche, versionierte Service-API;
- kanonische Beleg- und Gutscheinlinks;
- Deep-Link-Roundtrip;
- quadratische QR-Matrix, Vier-Modul-Ruhezone und SVG;
- drei normgerechte Suchmuster;
- allgemeine App-Link-Kodierung für spätere Verbraucher;
- getrennte Inhalte für Beleg und Gutschein;
- klare Ablehnung ungültiger Referenzen, Typen und Protokolle.

Der Gesamtlauf umfasst damit 87 isolierte Browserfälle. Zusätzlich werden Beleg, Gutschein, Reload, Historiennavigation, Vollbild, 320 px, 390 px, horizontaler Überlauf und Browserkonsole manuell geprüft.
