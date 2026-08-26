# WEBSITE-017 – Direktstart als sekundäre Option

**Stand:** 26. August 2026

**Ergebnis:** GO

## 1. Umfang

Dieser Block ergänzt ausschließlich einen vorbereiteten, bewusst sekundären Direktstart im bestehenden Lizenzbereich. Der Hauptweg „14 Tage kostenlos testen“ bleibt unverändert. Es wurden kein Checkout, keine Zahlungsabwicklung, keine Trial-, Lizenz- oder Backendlogik und keine neue externe Abhängigkeit ergänzt.

## 2. Geänderte Dateien

| Datei | Änderung |
| --- | --- |
| `index.html` | Sekundäre Direktstart-Option unmittelbar unter dem primären Trial-CTA im Lizenzbereich ergänzt. |
| `styles/main.css` | Ruhige, mobile-first Darstellung und Desktop-Ausrichtung der neuen Sekundäroption ergänzt. |
| `WEBSITE_017_DIRECT_START.md` | Dieser Abschlussbericht. |

## 3. Finale Formulierung

Die sichtbare Direktstart-Option lautet:

> Ohne Testphase direkt starten – 59 € einmalig

Der unmittelbar zugehörige Statushinweis lautet:

> Direktkauf und Freischaltung sind hier noch nicht online möglich.

Damit sind das Überspringen der Testphase und der einmalige Preis sofort verständlich, ohne einen bereits verfügbaren Checkout oder eine sofortige Lizenzfreischaltung zu behaupten.

## 4. Position und Hierarchie

Die Option steht genau einmal im Lizenzbereich, direkt unter „14 Tage kostenlos testen“ und nach Preis, Lizenzfakten sowie Kostenvergleich. Diese Position ist der sinnvollste Entscheidungskontext: Preis und Lizenzumfang sind bereits erklärt, bevor die Alternative sichtbar wird.

Hero, Header, mobile Navigation und Abschluss-CTA wurden bewusst nicht ergänzt. Dort bleibt der kostenlose 14-Tage-Test als eindeutiger Hauptweg erhalten. Eine wiederholte Direktstart-Option hätte die ruhige Blickführung geschwächt und mit dem primären Trial-CTA konkurriert.

Die visuelle Abstufung verwendet ausschließlich vorhandene Design-Tokens:

- primärer Trial-CTA: gefüllte FRECKA-Grünfläche, 16 px Text, bestehender Schatten und bestehende große Buttonhöhe;
- Direktstart: transparente Fläche, 14 px Text, einfache Unterstreichung, kein Schatten und kein zusätzlicher Farbton;
- Statushinweis: vorhandene gedämpfte Textfarbe und kleinste bestehende Textstufe.

## 5. Aktuelles technisches Verhalten

Der Direktstart ist als nativer deaktivierter Button umgesetzt. Er besitzt kein Ziel, löst keine Navigation aus und übermittelt keine Daten. Die erläuternde Statuszeile bleibt als normaler Inhalt für alle Nutzer sichtbar.

Unverändert gelten:

- kein Kauf oder Checkout;
- keine Zahlungsseite oder Zahlungsanbieter-Verknüpfung;
- keine Formular-, E-Mail- oder Anfrageautomatisierung;
- keine Trial-Erzeugung oder Lizenzfreischaltung;
- kein Redirect zu einer App;
- das vorhandene Testzugangsformular und sein Submit-Button bleiben deaktiviert.

## 6. Spätere Aktivierung

Vor einer Aktivierung müssen mindestens Kauf- und Zahlungsworkflow, Lizenzanlage und -freischaltung, Fehler- und Abbruchfälle, Bestätigungskommunikation sowie die dafür erforderliche rechtliche und datenschutzrechtliche Dokumentation produktiv freigegeben sein.

Erst dann darf der deaktivierte Direktstart durch eine echte, zugängliche Aktion mit Ziel, Focus-State und belastbarer Statuskommunikation ersetzt werden. Eine Bezeichnung wie „Jetzt kaufen“ oder „Sofort freischalten“ ist erst zulässig, wenn der jeweilige Ablauf diese Aussage tatsächlich erfüllt.

## 7. Prüfungen

Geprüft wurden `320`, `375`, `390`, `430`, `768`, `1024`, `1280`, `1440` und `1600` px.

Ergebnis:

- kein horizontaler Seitenüberlauf an einem geprüften Viewport;
- kein abgeschnittener Direktstart- oder Statustext;
- klare mobile Hierarchie mit vollständig breitem grünen Trial-CTA und kleinerer transparenter Sekundäroption;
- klare Desktop-Hierarchie mit kompakter, links ausgerichteter Aktionsgruppe;
- Direktstart genau einmal vorhanden und nativ deaktiviert;
- alle fünf bestehenden Trial-Links unverändert vorhanden;
- Testformular und Submit-Button weiterhin deaktiviert;
- keine doppelten IDs oder fehlenden internen Ankerziele;
- alle vier Stylesheets und alle sechs verwendeten Bilder erfolgreich geladen;
- keine Browserfehler oder Warnungen im sauberen Testlauf;
- keine externen Laufzeitressourcen oder neuen Requests;
- strukturierte Daten weiterhin ohne `Offer`- oder Checkout-Markup;
- lokaler Produktionsbuild erfolgreich mit unverändert 17 Runtime-Dateien;
- `git diff --check -- website` ohne Befund.

## 8. Bewusst nicht geändert

- Trial-, Preis- und FAQ-Inhalte;
- Rechenlogik und Kostenvergleich;
- Header, Navigation, Hero und Abschluss-CTA;
- Kontakt-, Datenschutz- und Impressumsinhalte;
- JavaScript, Formulare und vorhandene Interaktionen;
- App, Backend, Lizenzen, Zahlungen und Deployment.

## 9. Abschluss

**GO.** Der Direktstart ist verständlich vorbereitet, sichtbar sekundär, technisch ehrlich deaktiviert und beeinträchtigt den primären 14-Tage-Testweg nicht.
