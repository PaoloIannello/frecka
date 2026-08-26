# WEBSITE-016 – Kontakt & Legal Finalisierung

**Stand:** 25. August 2026  
**Ergebnis:** GO

## 1. Umfang

Dieser Block aktualisiert ausschließlich die Kontakt- und Rechtsinformationen der statischen FRECKA-Website. Es wurden kein Backend, keine Trial- oder Lizenzlogik, keine Zahlungsabwicklung, kein Tracking und keine neue externe Abhängigkeit ergänzt. Die bestehende App und alle Dateien außerhalb von `website/` blieben unangetastet.

## 2. Geänderte Dateien

| Datei | Änderung |
| --- | --- |
| `index.html` | Öffentliche FRECKA-Adresse im Testzugangsbereich und Footer ergänzt; deaktivierten Formularzustand kürzer und verständlicher beschrieben. |
| `legal/impressum.html` | Kontaktadresse ersetzt; nicht erforderlichen Zusatz zur rechtlichen Einordnung des Produktnamens entfernt. |
| `legal/datenschutz.html` | Kontaktadresse, realen Hostingstand, E-Mail-Kontakt und deaktivierten Formularzustand aktualisiert. |
| `styles/main.css` | Maximale Breite der Legal-Inhalte moderat von `--measure-reading` auf `--measure-reading + --space-16` erweitert. |
| `WEBSITE_010_FINALIZATION.md` | Historischen Implementierungsbericht auf die seit WEBSITE-016 gültige Kontaktadresse und den entfernten Impressumszusatz berichtigt. |
| `README.md` | Projektstatus und Dokumentenindex um die aktuelle Kontakt-/Legal-Finalisierung ergänzt. |
| `WEBSITE_016_CONTACT_LEGAL_FINALIZATION.md` | Dieser Abschlussbericht. |

## 3. Kontaktangaben

Die verbindliche öffentliche FRECKA-Kontaktadresse lautet jetzt überall im aktuellen Website-Stand:

`hallo@frecka.app`

Sie wird an folgenden sinnvollen Stellen verwendet:

- als direkte Kontaktmöglichkeit im vorbereiteten Testzugangsbereich;
- in der Footer-Navigation;
- im Impressum;
- bei der verantwortlichen Stelle und im Abschnitt zur E-Mail-Kommunikation der Datenschutzhinweise.

Die zuvor verwendete private Kontaktadresse kommt innerhalb von `website/` nicht mehr vor. Es wurde keine unnötige zusätzliche Nennung in FAQ, Navigation oder strukturierten Daten ergänzt.

## 4. Impressum

Unverändert übernommen wurden die vorhandenen und bereits dokumentierten Betreiberangaben:

- Paolo Iannello;
- Zur Schönen Gelegenheit 12, 93047 Regensburg, Deutschland;
- +49 172 7671787;
- Umsatzsteuer-Identifikationsnummer DE329298228;
- Hinweis zur Verbraucherstreitbeilegung.

Die E-Mail-Adresse wurde auf `hallo@frecka.app` umgestellt. Der ergänzende Abschnitt „Hinweis zu FRECKA“ wurde entfernt: Für die sachliche Anbieterkennzeichnung war er nicht erforderlich und enthielt eine über die Betreiberangaben hinausgehende rechtliche Einordnung.

## 5. Datenschutz

Die Datenschutzhinweise bilden den vorhandenen technischen Stand ab:

- statische Bereitstellung unter `frecka.app` über die dokumentierte eigene Synology-/Web-Station-Infrastruktur;
- technisch erforderliche Verbindungsdaten beim Seitenaufruf;
- keine Analyse- oder Trackingdienste;
- keine Marketing-Cookies oder Social-Media-Einbettungen;
- Systemschriften und lokal ausgelieferte Laufzeitressourcen;
- mögliche Kontaktaufnahme per E-Mail an `hallo@frecka.app`;
- kein automatischer Testzugang und kein Vertrag durch eine E-Mail;
- deaktiviertes Formular ohne Übermittlung oder Speicherung von Formulardaten.

Die frühere Beschreibung geplanter Formularfelder wurde entfernt, weil nur die tatsächlich vorhandene Verarbeitung beschrieben werden soll. Unbekannte Anbieter, Auftragsverarbeiter, Zahlungsdienste, CRM-, Newsletter-, Tracking- oder Lizenzsysteme wurden nicht ergänzt.

## 6. Testzugangsbereich

Die öffentliche Botschaft „14 Tage kostenlos testen“ bleibt bestehen. Das Formular bleibt technisch und semantisch deaktiviert. Die neue Einleitung erklärt knapp, dass das Anfrageformular noch nicht aktiv ist, und bietet die allgemeine FRECKA-E-Mail-Adresse für Fragen an. Sie verspricht weder eine automatisierte Kontoerstellung noch eine Lizenzfreischaltung.

## 7. Bewusst unveränderte Bereiche

- Produktpositionierung, Hero, Screenshots und Funktionsbeschreibung;
- Preis, Kostenvergleich, Einzellizenz, Updates und ZusatzTools;
- FAQ, Header-Navigation und Sticky-Verhalten;
- TSE-/Kassensystem- und Rechtsberatungsabgrenzung;
- SEO-Metadaten und vorhandene `SoftwareApplication`-Strukturdaten;
- Formfelder, Formularstatus, JavaScript und Accessibility-Grundlagen;
- Markenassets, Logo-Skalierung und App.

Die strukturierten Daten enthalten weiterhin weder `Offer` noch `Product`, Checkout, Zahlungsanbieter oder eine automatisierte Trial-/Lizenzfunktion.

## 8. Weiterhin offene Punkte

Diese Punkte gehören ausdrücklich nicht zu WEBSITE-016 und bleiben vor ihrer jeweiligen Aktivierung als Freigabegates bestehen:

- Endpoint, geschützter Empfänger und Versandlogik des Testzugangsformulars;
- finale Datenschutzinformation für ein aktiviertes Formular, einschließlich Datenfeldern, Zweck, Rechtsgrundlage, Speicherdauer, Empfängern, Löschprozess und gegebenenfalls Auftragsverarbeitung;
- technische Trial-Erzeugung, Ablauf der 14 Tage und Lizenzfreischaltung;
- Gerätebindung und Übernahme vorhandener Testdaten in eine Lizenz;
- Kauf, Checkout, Zahlung und automatische E-Mail-Strecken;
- tatsächliche Felder, Zugriffe, Rechtsgrundlage und Löschfrist der Web-Station-Protokollierung;
- organisatorische Prüfung der Aufbewahrungs- und Löschpraxis für eingehende E-Mail-Anfragen.

## 9. Qualitätsprüfung

Geprüft wurden Landingpage, Impressum und Datenschutz bei:

`320`, `375`, `390`, `430`, `768`, `1024`, `1280`, `1440` und `1600` px.

Ergebnis:

- kein horizontaler Overflow an einem geprüften Viewport;
- keine Kollisionen oder abgeschnittenen Inhalte im Kontakt-, Footer- oder Legal-Bereich;
- Legal-Inhaltsbreite auf Desktop 704 px beziehungsweise 44 rem, auf Mobile fließend innerhalb des Seitenabstands;
- keine doppelten IDs und keine fehlenden internen Ankerziele;
- Impressum und Datenschutz erreichbar und vollständig geparst;
- Formular-`fieldset` und Submit-Button bleiben deaktiviert;
- Mobile-Menü öffnet und schließt korrekt; `aria-expanded` und `hidden` bleiben synchron;
- alle vier Stylesheets wurden vom Browser ohne verworfene Stylesheet-Datei geparst;
- keine Browserfehler oder Warnungen;
- keine externen Laufzeitressourcen oder neuen Requests;
- alle verwendeten lokalen HTML-, CSS-, JavaScript-, Logo-, Favicon- und Screenshotpfade wurden mit HTTP 200 geladen;
- `git diff --check -- website` ohne Befund.

## 10. Abschluss

**GO.** Die Kontakt- und Legal-Inhalte sind innerhalb des bekannten Projektstands konsistent. Offene Infrastruktur-, Trial-, Lizenz- und Aufbewahrungsdetails bleiben transparent dokumentiert und wurden nicht erfunden.
