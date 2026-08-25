# WEBSITE-015 – Pricing Result Polish

Status: **GO**  
Stand: 25. August 2026

## Optische Anpassungen

Ausschließlich die bestehende Ergebniszeile „Gesamt nach 3 Jahren“ im Kostenvergleich wurde hervorgehoben:

- stärkere Trennlinie unmittelbar oberhalb der Ergebniszeile
- sehr dezenter hellgrüner Hintergrund über die gesamte Zeile
- Ergebnisbezeichnung in fetter Schrift
- Betrag „464,40 €“ größer und extrafett
- FRECKA-Ergebnis „59 €“ größer, extrafett und in FRECKA-Grün

Werte, Tabellenstruktur, Rechenlogik und alle übrigen Zeilen blieben unverändert.

## Verwendete Design-Tokens

- `--border-width-strong`
- `--color-primary-border`
- `--color-surface-accent`
- `--color-text`
- `--color-primary`
- `--font-weight-bold`
- `--font-weight-extrabold`
- `--font-size-200`
- `--font-size-300`
- `--font-size-400`
- `--letter-spacing-display`
- `--space-0`
- `--space-2`
- `--space-4`

## Responsive-Prüfung

Die Ergebniszeile wurde bei 320, 375, 390, 430, 768, 1024, 1280, 1440 und 1600 Pixel geprüft. Beträge und Ergebnisbezeichnung bleiben innerhalb der Tabellenbreite; es entstehen weder horizontaler Überlauf noch Zuschnitt oder Kollisionen.

## Accessibility-Prüfung

Die bestehende semantische Tabellenstruktur mit `tfoot`, Zeilenkopf und Spaltenköpfen bleibt unverändert erhalten. Die Ergebniszeile wird nicht nur farblich, sondern zusätzlich durch Trennlinie, Schriftgewicht und Schriftgröße hervorgehoben. Text- und Primärfarben verwenden weiterhin die freigegebenen Kontrast-Tokens.

## Prüfergebnis

- HTML- und CSS-Struktur: bestanden
- Browserkonsole: keine Fehler oder Warnungen
- lokale Laufzeitressourcen: keine 404 und keine neuen externen Requests
- `git diff --check`: bestanden

Es wurden kein Commit, kein Push und kein Deployment ausgeführt.

Ergebnis: **GO**
