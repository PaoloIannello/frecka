# WEBSITE-009 – Content & Launch Readiness

> Historischer Stand: Die in WEBSITE-009 noch offenen Punkte zu Betreiberangaben, 14-Tage-Modell, Pricing und vorbereitetem Formular werden durch `WEBSITE_010_FINALIZATION.md` fortgeschrieben.

## 1. Ergebnis

Die FRECKA-Landingpage ist inhaltlich auf einen ersten öffentlichen Beta-Stand vorbereitet. Seitenstruktur, Navigation, Komponenten und Funktionen bleiben bestehen. Überarbeitet wurden ausschließlich Texte, CTA-Ziele, Metadaten, die erforderlichen FAQ-Antworten und rechtliche Grundseiten.

Der Stand ist nahezu veröffentlichungsreif, aber noch nicht freigabefähig: Betreiberangaben, Hostingdetails und der reale Beta-Anmeldeweg fehlen weiterhin und sind ausdrückliche Launch-Blocker.

## 2. Überarbeitete Texte

### Hero und Einstieg

- Die Hauptaussage lautet jetzt „Digitale Belege. Schritt für Schritt.“
- Der Nutzen beschreibt konkret den Weg von der Leistung bis zum fertigen Beleg.
- Die Beta wird bereits im ersten Viewport sichtbar benannt.
- Die Bildunterschrift bezeichnet den integrierten echten Screen als aktuelle Beta statt als Platzhalter.

### Arbeitsalltag und Ablauf

- Wiederholungen und abstrakte Werbeformulierungen wurden gekürzt.
- „Zahlung erfassen“ wurde auf „Zahlungsart festhalten“ eingegrenzt.
- Es wird ausdrücklich klargestellt, dass FRECKA keine Zahlung abwickelt.
- Der Belegabschluss beschreibt nur lokale Speicherung und bewusste Weitergabe.

### Vorteile und Datenkontrolle

- Offline-Nutzung ist an eine erfolgreiche Einrichtung gebunden und auf App-Kern sowie lokale Kernabläufe begrenzt.
- Sicherung, Export und Teilen werden als bewusst ausgelöste Vorgänge beschrieben.
- Automatische Cloud- und Mehrgeräte-Synchronisation werden ausdrücklich ausgeschlossen.
- Die lokale Speicherung wird sachlich auf Kunden-, Beleg- und Katalogdaten bezogen.

## 3. CTA-Logik

| Stelle | Aktion | Ziel |
| --- | --- | --- |
| Header | `Beta testen` | `#beta` |
| Mobile Navigation | `Beta testen` | `#beta` |
| Hero primär | `Beta testen` | `#beta` |
| Hero sekundär | `So funktioniert’s` | `#so-funktionierts` |
| Beta-Abschnitt | `So funktioniert’s` | `#so-funktionierts` |

Es existiert noch kein reales Beta-Formular und kein freigegebenes externes Ziel. Deshalb verweist „Beta testen“ auf den klar beschrifteten internen Abschnitt `#beta`. Dort wird transparent erklärt, dass der Anmeldeweg noch folgt. Es wird keine Dummy-URL verwendet und es werden keine Daten übermittelt.

## 4. Beta-Positionierung

Kommuniziert wird:

- FRECKA befindet sich in der Beta;
- die Beta dient dem Praxistest und dem Feedback der Testenden;
- Funktionen, Texte und Abläufe können sich ändern;
- Testplätze können aus tatsächlichen organisatorischen Gründen begrenzt sein;
- aus der Teilnahme entsteht kein Anspruch auf dauerhaft kostenlose Nutzung;
- die reguläre Version kann später kostenpflichtig sein;
- Preis und Lizenzmodell sind noch nicht final festgelegt.

Es werden weder Preise noch Laufzeiten oder eine künstliche Verknappung genannt.

## 5. FAQ-Anpassungen

Die FAQ beantwortet jetzt alle neun geforderten Themen:

1. geeignete Betriebe;
2. technische Vorkenntnisse;
3. Smartphone-Nutzung;
4. Offline-Nutzung mit klaren Grenzen;
5. lokale Datenspeicherung;
6. verschlüsselte Sicherung und bewusster Export;
7. aktueller Beta-Reifegrad;
8. Bedeutung der Beta;
9. noch offener Preis und Lizenzrahmen.

## 6. Fachlich bewusst eingeschränkte Aussagen

- keine Zahlungsabwicklung durch FRECKA;
- keine automatische Cloud-Synchronisation;
- keine Mehrgeräte-Synchronisation;
- keine unbegrenzte Offline-Aussage;
- keine Aussage zu einer vorhandenen TSE-Fiskalisierung;
- keine Steuerberatung oder Steuerautomatik;
- keine DATEV-Integration;
- keine Preise, Laufzeiten oder Verfügbarkeitsgarantien.

Die Aussagen zu lokaler Speicherung, verschlüsselter Sicherung, Export und Offline-Kern basieren auf dem dokumentierten, real geprüften Projektstand.

## 7. Angelegte Legal-Seiten

- `legal/impressum.html`
- `legal/datenschutz.html`

Beide Seiten verwenden dieselben lokalen Styles und Markenassets wie die Landingpage. Sie laden keine externen Schriften, Tracker oder eingebetteten Drittinhalte.

Das Impressum stellt klar, dass FRECKA ein Produktname und keine separat gegründete Firma ist. Nicht belegte Betreiber-, Kontakt-, Register- oder Steuerangaben wurden nicht erfunden.

Die Datenschutzhinweise beschreiben ausschließlich den ableitbaren Stand der statischen Landingpage: kein Tracking, keine Analytics, keine Marketing-Cookies, keine externen Fonts und noch kein Beta-Formular.

## 8. Offene rechtliche TODOs

Vor Veröffentlichung verbindlich zu klären:

- vollständiger Name beziehungsweise bestehende Unternehmensbezeichnung des Betreibers;
- ladungsfähige Anschrift;
- E-Mail-Adresse und erforderlicher unmittelbarer Kontaktweg;
- tatsächlich einschlägige Register-, Steuer-, Aufsichts- oder Berufsangaben;
- verantwortliche Stelle in den Datenschutzhinweisen;
- finaler Hostinganbieter, Serverstandort und tatsächliche Serverprotokolle;
- Zwecke, Rechtsgrundlagen, Empfänger und Speicherdauer der Hostingverarbeitung;
- zuständige Datenschutzaufsichtsbehörde;
- rechtliche Schlussprüfung beider Seiten.

Die Legal-Seiten tragen bis zur Ergänzung `noindex,follow` und enthalten sichtbare interne Launch-Hinweise. Diese Hinweise dürfen nicht in einem öffentlichen Release verbleiben.

## 9. SEO-Grundlagen

Überarbeitet wurden:

- Seitentitel und Meta Description;
- OpenGraph- und X/Twitter-Titel sowie Beschreibungen;
- `SoftwareApplication`-Schema mit Zielgruppe und sachlicher Produktbeschreibung;
- Suchfokus auf digitale Belege, kleine Dienstleistungsbetriebe, Friseur, Kosmetik, Nagelstudio, Fußpflege, Podologie und Einzelunternehmer.

Canonical URL, `og:url` und absolute Social-Bild-URL bleiben offen, bis die Produktionsdomain feststeht.

## 10. Datenschutz- und Abhängigkeitsstatus

Die Google-Fonts-Einbindung wurde entfernt. Die Seite verwendet jetzt einen Systemschrift-Stack. Es wurden keine neuen externen Abhängigkeiten, Tracker, Analytics-Dienste, Cookies, Zahlungsanbieter oder Formulardienste integriert.

## 11. Noch fehlende Launch-Voraussetzungen

### Blockierend

- Betreiberangaben und rechtliche Freigabe;
- finaler Hosting- und Serverlog-Vertrag;
- realer Beta-Anmeldeweg oder ausdrücke Entscheidung für einen anderen Kontaktweg;
- Datenschutzergänzung vor Aktivierung dieses Kontaktwegs;
- Produktionsdomain und absolute SEO-/Social-URLs;
- Entfernen aller sichtbaren Legal-TODOs und des `noindex` nach Freigabe.

### Qualitätssicherung vor Launch

- finale manuelle Rechtsprüfung;
- Browser- und Geräte-Smoke-Test auf der Produktionsdomain;
- Kontrolle der tatsächlichen Hostingantworten und Fehlerseiten;
- OpenGraph-Vorschau auf den vorgesehenen Plattformen;
- abschließende Accessibility-Prüfung mit Screenreader und Tastatur.
