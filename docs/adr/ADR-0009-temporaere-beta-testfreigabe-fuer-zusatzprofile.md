# ADR-0009: Temporäre Beta-Testfreigabe für Zusatzprofile

## Status

Angenommen am 21. September 2026.

## Kontext

MULTI-COMPANY-004 verwaltet in Schema 9 mehrere Unternehmensprofile, lässt aber bis zu einer echten Multi-Binding-Lizenzruntime ausschließlich Profil 1 produktiv schreiben. Das ist die richtige Produktgrenze: Eine Lizenz gehört genau zu einem rechtlich oder steuerlich eigenständigen Profil. Für die reale Beta-Abnahme der bereits implementierten Profilgrenzen, Nummernkreise und produktiven Fachpfade muss ein ausgewähltes Zusatzprofil vorübergehend testbar sein, ohne eine Lizenz zu kopieren oder vorzutäuschen.

## Entscheidung

Ein Zusatzprofil kann in ausdrücklich freigegebenen Beta-Builds einen getrennten lokalen Zustand `betaProductiveTest` erhalten. Dieser Zustand besitzt eine eigene Formatversion, ein boolesches Freigabefeld und einen Änderungszeitpunkt. Er liegt am Profil im bestehenden Settings-Store; Schema 9 und alle Storestrukturen bleiben unverändert.

Die produktive Berechtigung wird weiterhin zentral ermittelt:

```text
regularProductive
ODER
(betaProductiveTest.enabled UND aktueller Build ausdrücklich freigegeben)
```

Der aktuelle Vertrag erlaubt die Testfreigabe ausschließlich für die explizit genannten kanonischen Buildkennungen `BETA-PREVIEW-002` und `BETA-PREVIEW-003`. Die zweite Kennung erweitert die kontrollierte Geräteabnahme auf Version 0.11.12; es gibt weder Präfix- noch Wildcard-Freigaben. Hostname, URL und Installationsmodus sind keine Berechtigungsquelle. Jeder andere Build ignoriert ein gespeichertes Flag immer. Profil 1 verwendet unverändert den regulären Pfad und kann keine Beta-Testfreigabe erhalten.

Das Zusatzprofil bleibt fachlich und lizenzrechtlich `activation_required`. Die UI bezeichnet den wirksamen Zustand ausschließlich als Beta-Testmodus und weist darauf hin, dass keine reguläre Lizenz besteht. Aktivieren und Deaktivieren verändern weder `license`, `licenseRuntime`, Serveridentität, Geräteschlüssel noch Nummernkreise.

Die Freigabe ist installationslokaler Testzustand. Die zentrale portable Tenant-Snapshot-Projektion entfernt sie vor Backup, Restore und Export. Ein Restore deaktiviert die Testfreigabe daher sicher, statt sie auf ein anderes Gerät zu übertragen. Dokumentmodelle, PDFs, Public-QR, Public Viewer und Fachexporte erhalten den Zustand nicht.

Nach erfolgreicher zentraler Guard-Prüfung laufen Belege, Korrekturen, Gutscheine, Rezepte und Behandlungsdokumentation unverändert durch ihre vorhandenen atomaren und profilgebundenen Pfade. Es gibt keine fachlichen Einzel-Bypässe.

## Folgen

- Die reale Beta kann produktive Pfade eines gezielt freigegebenen Zusatzprofils prüfen.
- Der echte Status `activation_required` und die spätere Multi-Binding-Architektur bleiben unverändert.
- Ein gespeichertes Flag ist ohne ausdrücklich erlaubte Buildkennung wirkungslos.
- Deaktivierung sperrt neue produktive Mutationen, löscht aber keine Testbelege und setzt keine Sequenz zurück.
- Eine Sicherung enthält Profile und Geschäftsdaten, aber keine portable Beta-Berechtigung.
- Die Ausnahme ist durch eine zentrale Build-Allowlist, ein eigenes Profilfeld und einen einzigen Write-Guard gezielt entfernbar.

## Alternativen

### Lizenz oder Runtime von Profil 1 kopieren

Verworfen. Das würde Lizenzsharing vortäuschen, die spätere Serverautorität unterlaufen und zwei fachlich verschiedene Zustände vermischen.

### Freigabe anhand von `beta.frecka.app`

Verworfen. Installierte PWAs, Release-Unterpfade und Offline-Starts machen den Hostnamen zu einer fragilen und nicht kanonischen Build-Erkennung.

### Einzelne Fachpfade separat freischalten

Verworfen. Verstreute Bypässe würden Korrektur-, Gutschein- oder Podologiepfade unterschiedlich behandeln und die zentrale Sicherheitsgrenze schwächen.

### Testfreigabe im Backup portieren

Verworfen. Ein Backup darf auf einem anderen Gerät keine lokale Testberechtigung rekonstruieren.

## Migrations- oder Rückweg

Es gibt keine Schema- oder Datenmigration. Profile ohne `betaProductiveTest` behalten exakt das bisherige Verhalten. Wird der erlaubte Beta-Build aus der Allowlist entfernt oder der Testzustand deaktiviert, fällt jedes Zusatzprofil sofort auf den unveränderten zentralen Status `activation_required` zurück. Historische Geschäftsdaten und Nummernkreise bleiben erhalten. Nach Einführung echter profilbezogener Bindings wird diese temporäre Ausnahme in einem eigenen, getesteten Block vollständig entfernt.
