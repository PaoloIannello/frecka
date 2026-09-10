# FRECKA V1.0 – Betriebsmodell und TSE-Abgrenzung

**Stand:** 8. September 2026  
**Block:** COMPLIANCE-002  
**Status:** Verbindliche Produktentscheidung für das nachfolgend beschriebene V1.0-Betriebsmodell

## Entscheidungsgrundlage und Reichweite

Der vorgesehene Einsatz von FRECKA V1.0 wurde vom Nutzer mit seinem Steuerberater besprochen. Nach der mitgeteilten individuellen Einordnung benötigt FRECKA für genau diesen Einsatz keine TSE und wird darin nicht als Kasse eingeordnet. Als Begründung wurde insbesondere genannt, dass FRECKA keine Eingangsbelege als Teil einer Kassenführung ablegt und im vorgesehenen Modell lediglich der digitalen Dokumentation des Zahlungsverkehrs dient.

Diese Einordnung ist die fachliche Grundlage der V1.0-Produktentscheidung. Sie ist keine allgemeine Rechtsaussage und wird nicht auf andere Anwender, Betriebe oder Nutzungsweisen übertragen. FRECKA ersetzt keine individuelle steuerliche Prüfung. Bei einer abweichenden Nutzung, einer Funktionsänderung oder einer anderen betrieblichen Organisation ist die steuerliche Einordnung erneut mit Steuerberatung beziehungsweise Finanzverwaltung zu klären.

Die aktuelle [Orientierungshilfe des Bundesfinanzministeriums](https://www.bundesfinanzministerium.de/Content/DE/FAQ/FAQ-steuergerechtigkeit-belegpflicht.html) ist nicht rechtsverbindlich und verweist für die Entscheidung im Einzelfall auf das zuständige Finanzamt. COMPLIANCE-002 behauptet daher weder eine allgemeine TSE-Befreiung noch, dass FRECKA unabhängig von Funktionsumfang und tatsächlichem Einsatz niemals ein elektronisches Aufzeichnungssystem sein könne.

## Verbindliches V1.0-Betriebsmodell

FRECKA ist in diesem Modell:

- ein lokal arbeitendes digitales Beleg- und Dokumentationstool;
- ein Werkzeug zur strukturierten Dokumentation von Einnahmen und Zahlungsarten;
- kein Kassenbuch und keine vollständige Kassenführung;
- kein Ersatz für einen erforderlichen Kassenbericht, Kassensturz oder eine Bargeldzählung;
- kein Buchhaltungsprogramm und keine Steuerberatung;
- kein TSE-System und keine Fiskalkasse.

Die vorhandene Auswahl und Dokumentation von Zahlungsarten bleibt Teil des Produkts. COMPLIANCE-002 ändert weder Checkout, Belegabschluss noch Zahlungsarten. Die vorstehende Einordnung beschreibt ausschließlich den konkret mitgeteilten V1.0-Einsatz; aus dem vorhandenen Funktionsumfang wird keine allgemeingültige steuerliche Klassifikation abgeleitet.

## Grenze zur offenen Ladenkasse

Führt ein Anwender eine offene Ladenkasse, bleiben die dafür erforderlichen betrieblichen und steuerlichen Aufzeichnungen außerhalb von FRECKA in seiner Verantwortung. FRECKA übernimmt insbesondere nicht:

- die tatsächliche Bargeldzählung;
- den Kassensturz;
- Kassenbericht oder Kassenbuch;
- Anfangs- und Endbestand einer Bargeldkasse;
- Privatentnahmen oder Privateinlagen;
- Bargeldbewegungen außerhalb der in FRECKA dokumentierten Geschäftsvorfälle.

Die in FRECKA erzeugte Beleg- und Zahlungsdokumentation ersetzt diese getrennten Abläufe nicht. Der Anwender muss seine tatsächliche Kassenführung und die organisatorische Verbindung zu FRECKA betriebsspezifisch festlegen und dokumentieren.

## TSE-Status in V1.0

Die vorhandene TSE-002-Vorbereitung bleibt unverändert. In V1.0 gilt:

- TSE ist nicht aktiv, nicht eingerichtet und nicht verbunden;
- es findet keine Fiskalisierung statt;
- FRECKA erzeugt keine TSE-Transaktionen oder TSE-Signaturen;
- der Steuerberaterexport ist keine DSFinV-K-Ausgabe als Fiskalkassenschnittstelle;
- die sichtbare technische Vorbereitung sagt weder aus, dass jeder Betrieb eine TSE benötigt, noch dass jeder Betrieb ohne TSE arbeiten darf;
- eine spätere optionale TSE-/Fiskalfunktion ist ein eigenständiger Produkt- und Architekturblock.

Die technische Detailgrenze steht in [TSE-Vorbereitung](tse.md).

## Kurzer Produkt- und Nutzerhinweis

Für produktnahe Dokumentation gilt folgende Formulierung:

> FRECKA dokumentiert Geschäftsvorfälle und Zahlungsarten. Es ersetzt keine vollständige Kassenführung oder Buchhaltung. Welche steuerlichen Anforderungen gelten, hängt vom konkreten Betrieb und Einsatz ab und muss im Zweifel mit Steuerberatung oder Finanzverwaltung abgestimmt werden.

COMPLIANCE-002 führt daraus kein Warnbanner und keine neue Produktoberfläche ein.

## Weiterhin offene Compliance-Punkte

Die individuelle TSE-Einordnung erledigt keine der folgenden V1.0-Anforderungen:

1. **Steuerstatus:** Berechnung und Belegausgabe müssen insbesondere zur Kleinunternehmerregelung nach § 19 UStG passen.
2. **Steuerfreie Leistungen:** Steuerbefreiung und Befreiungsgrund sind noch nicht vollständig modelliert.
3. **Rechnungsangaben:** Vollständige Rechnung, Kleinbetragsrechnung und sonstiger Beleg müssen fachlich eindeutig unterschieden werden.
4. **Gutscheine:** Einzweck-/Mehrzweckgutschein und die zugehörigen steuerlichen Ereignisse sind offen.
5. **Teilkorrekturen:** Steuerliche Behandlung und Bezeichnung von Teilkorrektur beziehungsweise heutiger „Teilgutschrift“ sind offen. Eine UI-Umbenennung erfolgt nicht in diesem Block.
6. **GoBD, Restore und Aufbewahrung:** Änderungsnachweis, Restoregrenzen, Langzeitaufbewahrung und Verfahrensdokumentation bleiben eigenständige Themen.

## V1.0-Scope und Folgeblöcke

Eine vollständige TSE-/DSFinV-K-Implementierung ist für das hier definierte und individuell eingeordnete Betriebsmodell kein automatisches V1.0-Gate. Sie bleibt als späterer optionaler Entwicklungsstrang erhalten. V1.0-blockierend bleiben insbesondere korrekte Steuer-, Beleg-/Rechnungs-, Gutschein- und Teilkorrekturlogik, GoBD-/Restore-/Aufbewahrungsgrenzen, Lizenzierung sowie reale Geräte- und Releasegates.

Die nächsten Compliance-Blöcke sind:

1. **COMPLIANCE-003:** Steuerstatus, Kleinunternehmer, steuerfreie Leistungen und Rechnungsfelder.
2. **COMPLIANCE-004:** Gutscheinarten und steuerliche Behandlung.
3. **COMPLIANCE-005:** Korrekturrechnung, heutige Teilgutschrift und steuerlich korrekte Teilkorrekturen.
4. **COMPLIANCE-006:** GoBD-Änderungsnachweis, Restoregrenzen, Archivierung und Verfahrensdokumentation.

Diese Reihenfolge ist eine Dokumentationsentscheidung. Keiner der Folgeblöcke wird durch COMPLIANCE-002 implementiert oder als erledigt markiert.
