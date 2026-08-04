# Architecture Decision Records (ADR)

Ein Architecture Decision Record dokumentiert eine wesentliche Architekturentscheidung einschließlich ihres Kontexts und ihrer Folgen. Damit bleiben Entscheidungen für spätere Entwicklung, Review und Wartung nachvollziehbar.

Für FRECKA ist ein ADR erforderlich, wenn eine Entscheidung die grundlegende Architektur, Datenhaltung, Sicherheit, Offline-Fähigkeit, Update-Strategie, öffentliche Schnittstellen oder langfristige Wartbarkeit wesentlich beeinflusst. Kleine Umsetzungsdetails benötigen kein ADR.

## Dateinamensschema

ADRs werden fortlaufend nummeriert und nach folgendem Schema benannt:

`ADR-0001-kurzer-titel.md`

## Mindeststruktur

```markdown
# ADR-XXXX: Titel

## Status
Vorgeschlagen / Angenommen / Ersetzt / Verworfen

## Kontext

## Entscheidung

## Folgen

## Alternativen

## Migrations- oder Rückweg
```

Bereits getroffene Grundsatzentscheidungen können nachträglich als eigene ADRs dokumentiert werden. Dabei ist kenntlich zu machen, dass die Entscheidung schon vor Erstellung des ADR bestand.
