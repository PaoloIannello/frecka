# TSE-Vorbereitung

**Stand:** COMPLIANCE-002 auf Basis TSE-002
**Anbieterentscheidung:** fiskaly SIGN DE  
**Nutzung in V1.0:** nicht aktiv; Einordnung ausschließlich für das definierte Betriebsmodell

## Zweck und aktueller Status

TSE-002 bereitet ausschließlich die lokale Konfiguration und die Produktoberfläche vor. Die TSE-Anbindung ist standardmäßig nicht eingerichtet, nicht aktiviert und nicht verbunden.

Nach der vom Nutzer mitgeteilten individuellen steuerberaterlichen Einordnung benötigt FRECKA für das in [COMPLIANCE-002](compliance-v1.md) exakt beschriebene V1.0-Betriebsmodell keine TSE und wird darin nicht als Kasse eingeordnet. Diese Entscheidung gilt nicht allgemein für FRECKA, andere Betriebe oder eine abweichende Nutzung. FRECKA ersetzt keine individuelle steuerliche Prüfung; bei einem geänderten Einsatz oder Funktionsumfang ist eine neue Einordnung erforderlich.

FRECKA kauft oder verkauft keine TSE. In diesem Stand gibt es keine Anbieterkommunikation, keine Onlineaktivierung, keine TSE-Transaktionen, keine Signaturen, keine Fiskalisierung und keine DSFinV-K-Ausgabe als Fiskalkassenschnittstelle. Eine spätere optionale TSE-/Fiskalerweiterung bleibt eine eigenständige Produktentscheidung.

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

Die Seite ist rein lesend. Sie bietet weder Verbindung, Aktivierung noch Eingabe von Zugangsdaten an. Die aus TSE-002 bestehende Anzeige „Nutzung: Optional“ beschreibt ausschließlich den technischen Vorbereitungsstand und ist weder eine allgemeine steuerliche Pflicht- noch Befreiungsaussage.

## Unveränderte Grenzen

Der vorhandene Persistenzschutz entfernt weiterhin `tse` und `fiscalization` aus Belegen. TSE-002 ergänzt deshalb bewusst keine Felder in Belegen, Gutscheinen, Dokumentmodellen, PDFs, QR-Payloads oder Public Viewer. Offline-Start, bestehende Geschäftsvorgänge und Nummernkreise bleiben unverändert.

## Spätere TSE-/Fiskalerweiterung

Erst ein ausdrücklich freigegebener eigenständiger Produkt- und Architekturblock darf Aktivierung, sichere Zugangsdatenhaltung, Anbieterkommunikation, Transaktionsablauf, Fehler- und Offlineverhalten sowie echte TSE-Daten in Beleg, Dokument und Export festlegen. Dabei muss der heutige Belegschutz bewusst ersetzt und versioniert werden; TSE-002 und COMPLIANCE-002 nehmen diese Fachentscheidung nicht vorweg. Eine vollständige TSE-/DSFinV-K-Implementierung ist für das definierte V1.0-Betriebsmodell kein automatisches Release-Gate.

Unabhängig davon bleiben Steuerstatus, steuerfreie Leistungen, Rechnungsangaben, Gutscheinsteuerlogik, Teilkorrekturen sowie GoBD-/Restore-/Aufbewahrungsgrenzen als COMPLIANCE-003 bis COMPLIANCE-006 offen.
