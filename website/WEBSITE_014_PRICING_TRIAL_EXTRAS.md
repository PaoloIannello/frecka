# WEBSITE-014 – Pricing-Klarheit, Testphase und ZusatzTools

Status: **GO**  
Stand: 25. August 2026

## Ziel und Umfang

Dieser Korrekturblock schärft ausschließlich die bestehende Kundensprache und Preisvermittlung. Seitenstruktur, visuelle Grundrichtung, Produktumfang, Navigation, App-Screens, Assets und technische Architektur wurden nicht erweitert oder neu gestaltet.

## Geändertes Rechenbeispiel

Der Kostenvergleich zeigt den Einmalpreis nicht länger in jedem Jahr erneut. Die Tabelle unterscheidet nun zwischen jährlichem Aufwand und kumulierter Gesamtsumme:

| Zeitraum | Rechenbeispiel 12,90 € monatlich | FRECKA |
|---|---:|---:|
| 1. Jahr | 154,80 € | 59 € einmalig |
| 2. Jahr | weitere 154,80 € | 0 € |
| 3. Jahr | weitere 154,80 € | 0 € |
| Gesamt nach 3 Jahren | 464,40 € | 59 € |

Der bestehende Hinweis bleibt erhalten: 12,90 € ist ein rein mathematisches Rechenbeispiel und beschreibt keinen bestimmten Anbieter. Einsparungsprozente und Wettbewerbernamen wurden bewusst nicht ergänzt.

## Umstellung auf die 14-Tage-Testphase

Die öffentliche Hauptsprache verwendet jetzt konsequent „14 Tage kostenlos testen“. Betroffen sind Header, mobile Navigation, Hero, Pricing-CTA, Testphasen-Bereich, Footer, SEO-Metadaten und strukturierte Daten.

Die frühere Beta-Sprache wurde aus Haupt-CTAs, Anfrageformular und sichtbarer Produktbezeichnung entfernt. Der aktuelle Vorabstatus bleibt nur als sachlicher Hinweis erhalten: Funktionen, Texte und Abläufe können sich noch ändern.

## Formularsprache

Das weiterhin deaktivierte Formular ist nun als „Testzugang anfragen“ bezeichnet. Der deaktivierte Button lautet „Testzugang bald möglich“. Ein begleitender Hinweis erklärt, dass der Testzugang technisch noch vorbereitet wird.

Unverändert gilt:

- keine Datenübermittlung
- keine Datenspeicherung
- keine Erfolgs-Simulation
- keine LocalStorage-Simulation
- kein aktiver Empfänger oder Mailversand

## Öffentliche Produktbezeichnung

„FRECKA V1“ wurde aus der aktuellen Kundensprache sowie aus Title, Meta- und Social-Texten entfernt. Sichtbar wird das Produkt als „FRECKA“ bezeichnet. Wo die Versionsgrenze für Updates oder Lizenzen relevant ist, wird natürlich von der „aktuellen FRECKA-Hauptversion“ gesprochen.

Die verbindliche Update-Aussage lautet:

> Verbesserungen, Fehlerkorrekturen und Updates innerhalb der aktuellen FRECKA-Hauptversion sind im Kaufpreis enthalten.

Kostenlose spätere Hauptversionen, lebenslange Updates oder unbegrenzter Support werden nicht versprochen.

## Vorbereitung optionaler ZusatzTools

Im bestehenden Positionierungsbereich wurde eine kleine, ruhige Mikro-Komponente ergänzt. Sie stellt klar:

- FRECKA bleibt bewusst schlank.
- Das Kernprodukt bleibt vollständig.
- Optionale ZusatzTools können später bei echtem Bedarf ergänzt werden.

Es werden weder konkrete ZusatzTools noch Funktionen, Preise, Termine oder Freischaltungsmodelle genannt. Es gibt weiterhin keine Basic-, Pro- oder Premium-Tarife.

## FAQ-Anpassungen

Die relevanten Antworten wurden auf die neue Terminologie abgestimmt. Abgedeckt sind nun insbesondere:

- Wie lange kann ich FRECKA testen?
- Was passiert nach der Testphase?
- Was kostet FRECKA?
- Gibt es monatliche Kosten?
- Bleiben meine Daten erhalten?
- Was ist im Kaufpreis enthalten?
- Gibt es später zusätzliche Funktionen?
- Ist FRECKA ein vollständiges Kassensystem?
- Hat FRECKA eine integrierte TSE?

Die Kassensystem- und TSE-Abgrenzung wurde inhaltlich nicht verschärft. FRECKA wird weiterhin weder als vollständiges Kassensystem noch als TSE-Kassensystem eingeordnet; die Hinweise zur individuellen betrieblichen Situation und zur fehlenden Rechtsberatung bleiben erhalten.

## SEO und strukturierte Daten

Title, Description, OpenGraph-, Twitter- und JSON-LD-Texte verwenden jetzt einheitlich:

- FRECKA
- 14 Tage kostenlos testen
- 59 € einmalig
- keine monatlichen Softwarekosten
- optionale ZusatzTools später möglich

Es wurden keine `Offer`-Daten, Verfügbarkeitsbehauptungen oder automatisierten Kauf-/Testversprechen ergänzt.

## Legal und Datenschutz

Die Datenschutzseite beschreibt das deaktivierte Formular nun als Testzugangsanfrage. Es wurden keine neuen Verarbeitungen, Zahlungsanbieter, Trackingdienste, Cookies oder Empfänger erfunden. Impressum und Datenschutz verweisen konsistent auf den Testphasen-Hinweis.

## Bewusst nicht umgesetzt

- keine Trial- oder Ablauf-Logik
- keine Lizenzserver- oder Geräteaktivierung
- keine ZusatzTool-Architektur oder Freischaltung
- keine Zahlungsintegration
- kein Backend
- kein Mailversand
- kein Deployment

## Verbleibende Launch-Blocker

Vor einer aktiven öffentlichen Freischaltung bleiben erforderlich:

1. ein fachlich und datenschutzrechtlich freigegebener Testzugangsprozess,
2. eine belastbare technische Trial- und Lizenzlogik,
3. eine Zahlungsabwicklung mit angepassten Rechtstexten,
4. die Prüfung der tatsächlichen Hostingprotokollierung,
5. die abschließende fachliche und rechtliche Freigabe der Produktkommunikation.

## Prüfergebnis

Die statische Struktur, responsive Darstellung, lokale Assetpfade, JavaScript-Syntax und Konsistenzprüfungen wurden nach der Umsetzung erneut geprüft.

- HTML-Struktur, eindeutige IDs, interne Links und lokale Assetpfade: bestanden
- JavaScript-Syntax und CSS-Klammerstruktur: bestanden
- JSON-LD syntaktisch gültig und ohne `Offer`: bestanden
- Preisrechnung: 154,80 € pro Jahr sowie 464,40 € nach drei Jahren bestätigt
- Pflicht-FAQ und deaktivierter, zugänglicher Formularzustand: bestanden
- Browserkonsole: keine Fehler oder Warnungen
- Laufzeitressourcen: ausschließlich lokal, keine Asset-404 und keine neuen externen Requests
- Viewports 320, 375, 390, 430, 768, 1024, 1280, 1440 und 1600 Pixel: kein horizontaler Überlauf oder Zuschnitt der geprüften Bereiche
- `git diff --check`: bestanden

Es wurden kein Commit, kein Push und kein Deployment ausgeführt.

Ergebnis: **GO**
