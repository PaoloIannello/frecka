# TSE-Vorbereitung

**Stand:** TSE-002  
**Anbieterentscheidung:** fiskaly SIGN DE  
**Nutzung in V1.0:** optional

## Zweck und aktueller Status

TSE-002 bereitet ausschließlich die lokale Konfiguration und die Produktoberfläche vor. FRECKA bleibt ohne TSE vollständig nutzbar. Die TSE-Anbindung ist standardmäßig nicht eingerichtet, nicht aktiviert und nicht verbunden.

FRECKA kauft oder verkauft keine TSE. Die Entscheidung für eine spätere Aktivierung trifft der Nutzer. In diesem Stand gibt es keine Anbieterkommunikation, keine Onlineaktivierung, keine TSE-Transaktionen, keine Signaturen und keine Fiskalisierung.

## Lokales Datenmodell

`tseSettings` liegt ausschließlich im vorhandenen mandantenbezogenen Settings-Datensatz:

```json
{
  "formatVersion": 1,
  "provider": "fiskaly SIGN DE",
  "enabled": false,
  "setupStatus": "not-configured",
  "connectionStatus": "not-connected"
}
```

Eine feste Erlaubnisliste entfernt jedes andere Feld. Insbesondere werden keine API-Schlüssel, Secrets, Tokens, Zugangsdaten oder privaten Schlüssel gespeichert. Historische Settings und Backups ohne `tseSettings` erhalten genau dieses sichere Standardobjekt. Ein teilweise vorhandenes, widersprüchliches oder neueres Modell wird beim Restore nicht stillschweigend umgedeutet.

## Backup, Restore und Export

Weil `tseSettings` Teil von `stores.settings` ist, verwenden Backup und Restore unverändert den zentralen Tenant-Snapshot. Es gibt keinen neuen Store und keine zweite Sammelroutine.

Der Exporttyp **Eigene Daten** darf die fünf Konfigurationswerte und lesbare Statusbezeichnungen ausgeben. Der Steuerberaterexport enthält keine TSE-Konfiguration, keine TSE-Spalten, keine Belegplatzhalter und keine fingierten Transaktionsdaten.

## UI

**Einstellungen → TSE-Vorbereitung** zeigt ausschließlich:

- TSE-Anbindung: Nicht eingerichtet
- Anbieter: fiskaly SIGN DE
- Nutzung: Optional
- Status: Nicht verbunden

Die Seite ist rein lesend. Sie bietet weder Verbindung, Aktivierung noch Eingabe von Zugangsdaten an.

## Unveränderte Grenzen

Der vorhandene Persistenzschutz entfernt weiterhin `tse` und `fiscalization` aus Belegen. TSE-002 ergänzt deshalb bewusst keine Felder in Belegen, Gutscheinen, Dokumentmodellen, PDFs, QR-Payloads oder Public Viewer. Offline-Start, bestehende Geschäftsvorgänge und Nummernkreise bleiben unverändert.

## TSE-003 und Folgeblöcke

Erst ein ausdrücklich freigegebener Folgeblock darf Aktivierung, sichere Zugangsdatenhaltung, Anbieterkommunikation, Transaktionsablauf, Fehler- und Offlineverhalten sowie echte TSE-Daten in Beleg, Dokument und Export festlegen. Dabei muss der heutige Belegschutz bewusst ersetzt und versioniert werden; TSE-002 nimmt diese Fachentscheidung nicht vorweg.
