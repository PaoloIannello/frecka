# Lizenzarchitektur V1.0

**Aktueller Implementierungsstand:** LICENSE-001/002, ausschließlich lokale Vorbereitung und Anzeige

**Zielmodell:** LICENSE-003, noch nicht implementiert

**Grundsatzentscheidungen:** ADR-0004 und vorgeschlagene ADR-0005

## 1. Dokumentgrenze

Dieses Dokument trennt bewusst den heute ausgelieferten Stand vom Zielmodell. LICENSE-003 ändert keinen Produktcode, keine Persistenz, kein Backup, keinen Export und keine Nutzungsmöglichkeit. Trial, Lizenzdienst, Geräteübertragung, Payment und Entitlements werden erst in eigenen freigegebenen Folgeblöcken umgesetzt.

## 2. Heutiger Stand: LICENSE-001/002

FRECKA besitzt derzeit genau ein lokales Objekt im mandantenbezogenen Settings-Datensatz:

```text
license
├── formatVersion
├── licenseId
├── tenantId
├── deviceId
├── activatedAt
└── lastValidation
```

`licenseId` und `deviceId` werden lokal zufällig und ohne personenbezogene oder geräteabgeleitete Merkmale erzeugt. `activatedAt` bezeichnet nur die Anlage dieses Platzhalters; `lastValidation` nur dessen lokale Strukturprüfung. Beide Werte sind weder Zahlungsnachweis noch Serveraktivierung.

Das Objekt wird heute mit dem Settings-Store persistiert, über die zentrale Tenant-Snapshot-API gesichert und atomar wiederhergestellt. Der Export „Eigene Daten“ enthält es; der Steuerberaterexport enthält keine Lizenzinformationen. Unter `Einstellungen → Lizenz & Gerät` wird es ausschließlich lesbar angezeigt.

Dieser Stand ist keine Lizenzautorität und löst keinen Schreibschutz aus. Das lokale Objekt kann Trial, Kauf, Geräteberechtigung oder Entitlements nicht beweisen. Eine neuere unbekannte Formatversion wird schon heute nicht stillschweigend reduziert.

## 3. Ziel und Geschäftsmodell

- Eine Lizenz gehört zu genau einem Mandanten beziehungsweise einer Filiale und erlaubt in V1.0 genau ein gleichzeitig aktives Gerät.
- Die vollständige Testphase dauert 14 Tage und beginnt erst mit tatsächlicher, erfolgreicher Serveraktivierung.
- Während des Trials ist das Kernprodukt vollständig nutzbar.
- Nach Ablauf bleiben Daten erhalten und lesbar; produktive Schreibvorgänge benötigen einen Kauf.
- Der Kaufpreis beträgt 59 Euro einmalig für das Kernprodukt der aktuellen Hauptversion. Fehlerkorrekturen und Updates innerhalb derselben Hauptversion sind enthalten.
- Der Kauf aktiviert dieselbe Installation und dieselbe Lizenz; Trial-Daten bleiben unverändert.
- V1.0 hat keine Basic-, Pro- oder Premium-Tarife. Spätere klar getrennte ZusatzTools dürfen eigene Entitlements erhalten.
- Die Regelung für spätere Hauptversionen bleibt eine eigene Produktentscheidung.

## 4. Architekturentscheidung

Der getrennte Lizenzdienst ist serverseitige Autorität. Er speichert ausschließlich die für Trial, Kauf, Gerätebindung und Entitlements notwendigen Metadaten und stellt eine kryptografisch prüfbare, zeitlich begrenzte Lizenzbescheinigung aus. Die PWA prüft diese Bescheinigung lokal und kann damit innerhalb einer begrenzten Frist offline arbeiten.

Die Architektur besteht aus vier getrennten Grenzen:

```text
Payment-Anbieter
      │ signierter, idempotenter Webhook
      ▼
Lizenzdienst ── signierte Lizenzbescheinigung ──► FRECKA-PWA
      │                                           │
      │ nur Lizenzmetadaten                       │ Geschäftsdaten
      ▼                                           ▼
Lizenzdatenbank                         lokale IndexedDB
```

Der Lizenzdienst erhält keine Belege, Kunden, Umsätze, Gutscheine, Kataloge, Backups oder Dokumente. Ein Ausfall verändert keine lokalen Geschäftsdaten.

Die vollständige Entscheidung einschließlich Grenzen und Alternativen steht in [ADR-0005](adr/ADR-0005-trial-lizenzdienst-und-entitlements.md).

## 5. Status- und Zugriffsmodell

### Serverstatus

Das kleinste robuste Modell verwendet nur:

- `trial`;
- `active`;
- `revoked`.

Ein abgelaufener Trial ist `trial` mit erreichtem signierten `trialEndsAt` und kein zusätzlicher gespeicherter Zustand. Eine anstehende Geräteübertragung ist ein kurzlebiger Workflow und kein Lizenzstatus.

### Lokaler Zugriffsmodus

Aus der gültigen Bescheinigung wird separat abgeleitet:

- `productive`: produktive Schreibvorgänge erlaubt;
- `read_only`: bestehende Daten lesen, sichern, exportieren und als Dokument ausgeben;
- `activation_required`: Onlineaktivierung, Revalidierung oder Geräteübertragung erforderlich.

Der Client muss vor einem produktiven Schreibvorgang eindeutig beantworten können:

1. Ist die Bescheinigung kryptografisch gültig und für FRECKA bestimmt?
2. Stimmen Mandant, Produkt, Hauptversion, Gerät und Schlüsselbindung?
3. Ist der Trial noch nicht abgelaufen oder die Lizenz gekauft?
4. Liegt der Zeitpunkt innerhalb der signierten Offline-Grenze?
5. Sind benötigte Entitlements aktiv?

Eine einzelne zentrale Nutzungsentscheidung muss später alle produktiven Schreibpfade schützen. Einzelne Seiten dürfen keine eigenen, voneinander abweichenden Lizenzregeln implementieren.

## 6. Trial, Ablauf und Kauf

### Aktivierung

Download oder Installation startet die Testphase nicht. Der Client erzeugt einen lokalen Geräteschlüssel und fordert die Trialaktivierung ausdrücklich beim Lizenzdienst an. Erst die erfolgreiche serverseitige Aktivierung setzt `trialStartedAt` und `trialEndsAt` anhand der Serverzeit.

### Ablaufmodus

Nach Ablauf oder harter Offline-Grenze entstehen keine weiteren produktiven Geschäftsvorfälle. Erlaubt bleiben:

- Lizenz kaufen, aktivieren oder revalidieren;
- vorhandene Belege, Gutscheine, Kunden, Kataloge und Historien sinnvoll lesen;
- Backup und Export;
- vorhandene Dokumente als PDF oder QR-Ansicht ausgeben;
- App-Updates und Hilfen;
- Restore als ausdrücklich kontrollierter Datenrettungsweg.

Restore ersetzt Geschäftsdaten nach den bestehenden Sicherheitsprüfungen, importiert aber nie Geräteschlüssel, Bescheinigung oder aktive Gerätefreigabe. Er verlängert keinen Trial und hebt den Read-only-Modus nicht auf. Diese Ausnahme schützt Datenhoheit, ohne Restore zum Lizenzumgehungsweg zu machen.

### Kauf

Ein validiertes Zahlungsereignis ändert dieselbe Lizenz idempotent von `trial` zu `active`. Der Client erhält die Freigabe erst durch eine neue, korrekt signierte Bescheinigung. Payment schreibt niemals direkt in die PWA oder deren Geschäftsdaten.

## 7. Kryptografischer lokaler Nachweis

Die Zielbescheinigung ist eine JWS mit festem `ES256`-Algorithmus, explizitem Typ und einer strikt geprüften Claim-Whitelist. Sie bindet mindestens:

- Aussteller, Empfänger, Produkt und Hauptversion;
- Bescheinigungs-/Protokollversion;
- `licenseId` und pseudonyme `tenantRef`;
- `deviceId`, öffentlichen Schlüssel-Fingerabdruck und `bindingVersion`;
- Status, Trialzeiten und aktive Entitlements;
- Ausstellungszeit, nächste Revalidierung, harte Offline-Grenze und eindeutige ID.

Der Browser erzeugt über Web Crypto ein nicht exportierbares ECDSA-P-256-Schlüsselpaar. Der private `CryptoKey` liegt ausschließlich in einem neuen mandantenbezogenen Lizenz-Runtime-Speicher. Er wird nicht gesichert, wiederhergestellt oder exportiert. Der Lizenzdienst kennt nur öffentlichen Schlüssel beziehungsweise Fingerabdruck.

Aktivierung, Revalidierung und Übertragung verwenden eine einmalige, kurzlebige Server-Nonce und einen Gerätebeweis, der Anfrageziel, Methode, Bescheinigungsbezug und Bindungsversion umfasst. Damit sind kopierte IDs allein wertlos und Replay-Versuche serverseitig erkennbar.

Die PWA erhält nur öffentliche Prüfschlüssel. Private Lizenz- oder Signaturschlüssel dürfen weder in JavaScript noch in statischen Releases oder öffentlichen Webroots liegen.

## 8. Konkretes Offline-Modell

Die folgenden Werte sind belastbare Startvorschläge, aber vor Implementierung ausdrücklich freizugeben:

| Berechtigung | gewünschte Revalidierung | produktive Nutzung ohne neue Serverprüfung |
|---|---:|---:|
| Trial | spätestens alle 24 Stunden | höchstens 72 Stunden und niemals über `trialEndsAt` hinaus |
| Gekaufte Hauptversion | spätestens alle 30 Tage | höchstens 60 Tage nach letzter erfolgreicher Prüfung |

Verhalten:

- Netzwerkfehler oder vorübergehender Serverausfall: letzte gültige Bescheinigung gilt bis `offlineUntil` weiter.
- Ablauf von `offlineUntil`: Wechsel zu `read_only`, keine Datenlöschung.
- Signiertes `revoked`, fremdes Gerät oder höhere `bindingVersion`: nach erfolgreicher Serverprüfung sofort `read_only`.
- Ungültige Serverantwort: nicht als neuen Status speichern; letzte gültige Bescheinigung gilt nur bis zu ihrer vorhandenen Grenze.
- Lokale Uhr zurückgestellt oder Zeitanker widersprüchlich: vor weiteren produktiven Schreibvorgängen Onlineprüfung verlangen.
- Lokale Uhr stark vorgestellt: möglicherweise vorzeitiger Read-only-Modus; erfolgreiche Serverprüfung korrigiert ihn.
- Lizenzcache gelöscht: keine lokale Freigabe rekonstruieren, sondern Onlineprüfung verlangen.

Die PWA führt signierte Serverzeit, höchsten beobachteten Zeitpunkt und innerhalb einer Sitzung monotone Zeit zusammen. Lokale Zeit bleibt ein Manipulationssignal, niemals die Trial-Autorität.

## 9. Serverdaten und Datenschutz

### Erforderliche Datensätze

| Bereich | Minimale Felder |
|---|---|
| Lizenz | `licenseId`, pseudonyme `tenantRef`, Produkt, Hauptversion, Status, Trialzeiten, `createdAt`, `updatedAt`, gegebenenfalls `revokedAt` |
| Identität, falls freigegeben | opake `identityRef`, verifizierte normalisierte E-Mail, Verifikations-/Recovery-Zeitpunkte; Zugriff und Suchableitung serverseitig geschützt |
| Gerät | `deviceId`, öffentliche Schlüsselbindung, `bindingVersion`, Aktivierungs-, Validierungs- und Deaktivierungszeitpunkt, Grund |
| Übertragung | Lizenz, alte/neue Gerätebindung, Status, Ablaufzeit, serverseitige Zeitpunkte |
| Entitlement | stabile ID, Lizenzbezug, Produkt-/Kompatibilitätsversion, Status, Erwerbszeit, optionale Gültigkeitsgrenze |
| Payment-Referenz | Provider, Provider-Ereignis-ID, Idempotenzschlüssel, Produkt/Betrag/Währung, Verarbeitungsergebnis |
| Sicherheit | kurzlebige Nonces, Rate-Limit-Zähler und minimale Ereignisse für Aktivierung, Ablehnung, Revalidierung und Transfer |

### Ausgeschlossen

Geschäftsdaten, Backups, Dokumente, allgemeine Nutzungstelemetrie und dauerhaftes Browser-Fingerprinting sind ausgeschlossen. IP-Informationen dürfen allenfalls kurzlebig für Missbrauchs- und Rate-Limit-Schutz verarbeitet und nicht zu einem geräteübergreifenden Profil verdichtet werden.

### E-Mail-Bewertung

Ohne eine stabile, vom Nutzer kontrollierte Identität lässt sich nach Speicherlöschung oder Neuinstallation weder ein bereits verbrauchter Trial noch eine legitime Wiederherstellung verhältnismäßig unterscheiden. Eine verifizierte E-Mail-Adresse wird deshalb für Trialaktivierung, Kaufzuordnung und Wiederherstellung empfohlen. Sie ist personenbezogen, nicht Teil der Geschäftsdaten und nicht Bestandteil der lokalen Bescheinigung. Der Dienst verwendet intern eine opake `identityRef`; die normalisierte Adresse wird zugriffsgeschützt gespeichert, eine Suchableitung nur mit einem serverseitigen Geheimnis gebildet.

Vor Umsetzung müssen Rechtsgrundlage, Information, Aufbewahrungsfrist, Löschung und ein Support-/Alternativweg ausdrücklich festgelegt werden. Falls E-Mail nicht verwendet werden soll, ist ein fachlich gleichwertiger Wiederherstellungs- und Trial-Schutz erforderlich; eine rein lokale Kennung genügt nicht.

Als datensparsamer Startwert werden vorgeschlagen:

- Nonces: nach Verwendung, spätestens mit ihrer kurzen technischen Gültigkeit löschen;
- Rate-Limit-Zähler: höchstens 24 Stunden;
- normale Sicherheitsauditereignisse: 90 Tage;
- abgeschlossene Geräteübertragungen: nach 90 Tagen auf das für Lizenzintegrität und Support notwendige Minimum reduzieren;
- E-Mail und Lizenzreferenz: nur für die Dauer der Lizenz-/Recovery-Beziehung und zwingender gesetzlicher Nachweise; danach löschen oder unumkehrbar entkoppeln.

Zahlungsunterlagen mit abweichenden gesetzlichen Fristen bleiben getrennt. Sie rechtfertigen keine verlängerte Speicherung von Geräte- oder Nutzungsdaten. Die Werte sind vor Umsetzung datenschutzrechtlich und betrieblich freizugeben.

## 10. Missbrauchsschutz und Gerätewechsel

Der verhältnismäßige Schutz kombiniert serverseitig verbrauchten Trial, verifizierte Identität, Geräteschlüssel, genau eine aktive Bindung, Nonces, Idempotenz und begrenzte Rate Limits. Er verwendet keine Hardware-Seriennummern und kein aggressives Browser-Fingerprinting.

### Regulärer Wechsel

1. verschlüsseltes Backup auf dem Altgerät erstellen;
2. Altgerät online deaktivieren;
3. serverseitig atomar die alte Bindung beenden und `bindingVersion` erhöhen;
4. Neugerät mit neuem Schlüssel als einzig aktives Gerät binden;
5. Nutzer stellt dort das Geschäftsdaten-Backup wieder her.

### Notfallübernahme

Bei Verlust oder Defekt prüft ein kontrollierter Recovery-/Supportablauf Identität und Lizenz, begrenzt wiederholte Übernahmen und erhöht ebenfalls die Bindungsversion. Das neue Gerät ist danach serverseitig allein aktiv.

Ein böswillig offline gehaltenes Altgerät kann technisch bis zum Ablauf seiner zuvor signierten Bescheinigung weiterarbeiten. Das ist bei einer Offline-PWA nicht vollständig vermeidbar. Die Produktentscheidung muss zwischen begrenztem Restrisiko, verzögerter Notfallübernahme oder deutlich kürzerer Offline-Frist wählen.

Geschäftsdaten wechseln niemals über den Lizenzdienst, sondern nur über verschlüsseltes Backup/Restore.

## 11. Payment-Grenze

```text
PWA ── Checkout-Anforderung ──► Lizenzdienst ──► Payment-Anbieter
PWA ◄─ neue Bescheinigung ───── Lizenzdienst ◄── signierter Webhook
```

- Checkout ist an bestehende Lizenz, Produkt, Hauptversion und Idempotenzschlüssel gebunden.
- Der Anbieter bleibt hinter einem Adapter austauschbar.
- Nur der Lizenzdienst validiert Provider-Signatur, Ereignis-ID, Produkt, Preis und Währung.
- Wiederholte Webhooks erzeugen keine zweite Lizenz und verlängern den Trial nicht.
- Payment kennt keine lokalen Geschäftsdaten; der Webhook verändert keine PWA-Daten.

## 12. Entitlements und Modulgrenze

Das Kernprodukt verwendet `frecka.core.v1` und bleibt vollständig. Optionale spätere Module verwenden stabile IDs wie `frecka.addon.crm.v1`. Das Entitlement ist an dieselbe Lizenz gebunden und folgt dem kontrollierten Gerätewechsel.

Ein releasegebundenes Feature-Manifest beschreibt pro Modul Entitlement-ID, Modulversion, kompatible Kernversion, Dateigrenze und Integrität. Nicht gekaufte Module gehören nicht zum Kern-App-Shell-Precache und sollen nicht geladen werden. Sie werden nach gültiger Berechtigungsprüfung dynamisch aus demselben versionierten Releasekontext geladen und dürfen innerhalb der Offline-Grenze weiterarbeiten.

Lokale Moduldaten bleiben Eigentum des Kunden. Ablauf oder Entzug verhindert produktive Modulnutzung, löscht die Daten aber nicht. Lesen, Export und kontrollierte Löschung bleiben möglich. Serverseitige Modulfunktionen prüfen Entitlements selbst; eine ausgeblendete Schaltfläche ist keine Sicherheitsgrenze.

## 13. Bedrohungsmodell

| Fall | Reaktion |
|---|---|
| lokale Uhr manipuliert | signierte Serverzeit und Zeitanker; bei Rücksprung Onlineprüfung vor Schreiben |
| IndexedDB/LocalStorage gelöscht | kein lokaler Trial-Neustart; Online-Recovery/Aktivierung nötig |
| Neuinstallation | bestehende serverseitige Lizenz oder bereits verbrauchten Trial wieder zuordnen |
| `deviceId`/Bescheinigung kopiert | Besitz des gebundenen nicht exportierbaren Schlüssels nachweisen |
| Replay | einmalige Nonce, `jti`, kurze Laufzeit und Anfragebindung |
| mehrfacher Trial | serverseitig verbrauchte verifizierte Identität und begrenzte Rate Limits |
| doppelter Payment-Webhook | Signaturprüfung und idempotente Ereignisverarbeitung |
| Lizenzserver offline | letzte Bescheinigung bis harter Grenze, danach Read-only |
| Client lange offline | Warnung, harte Offline-Grenze, keine Datenlöschung |
| Alt-/Neugerät parallel | atomare Bindungsversion; begrenzte Restlaufzeit des Offline-Altgeräts dokumentiert |
| Entitlement manipuliert | signierte Claims, Manifestbindung und Serverprüfung bei Onlinefunktionen |
| Lizenzcache zurückgesetzt | Onlineprüfung; kein Zurückfallen auf LICENSE-001 als Autorität |

FRECKA verspricht keine Manipulationssicherheit gegen lokal veränderten PWA-Code, XSS oder vollständige Profilkopien. Sicherheit beruht auf signierter Serverautorität, kurzen Nachweisen, klaren Grenzen und nachvollziehbarer Fehlerbehandlung.

## 14. Migration von LICENSE-001/002

Das heutige `settings.license` bleibt Formatversion 1 und lokal, bis ein eigener Migrationsblock umgesetzt wird. Im Zielmodell werden portable Referenz und gerätegebundener Runtime-Nachweis getrennt:

```text
settings.license v2                  licenseRuntime (neu)
├── formatVersion                   ├── privater CryptoKey
├── tenantId / licenseId            ├── signierte Bescheinigung
├── tenantRef                       ├── deviceId / bindingVersion
├── product / major                 ├── Serverzeitanker
└── nicht sensitive Zusammenfassung └── Revalidierungsstatus
```

- Der neue Runtime-Speicher erfordert eine versionierte IndexedDB-Migration und ist kein zweites Geschäftsdatenmodell.
- `licenseRuntime` ist von zentralem Tenant-Snapshot, Backup, Restore und Export ausgeschlossen.
- Lokale IDs aus Version 1 sind nur Migrationshinweise. Erst die serverseitige Registrierung und Schlüsselbindung autorisieren ein Gerät.
- Alte Settings und Backups bleiben lesbar. Restore darf die portable Lizenzreferenz übernehmen, niemals den privaten Schlüssel oder eine aktive Gerätefreigabe.
- Auf dem bisherigen Gerät bleibt dessen aktuelle Runtime-Bindung erhalten; ein neues Gerät benötigt Aktivierung oder Übertragung.
- „Eigene Daten“ erhält später nur eine nicht sensitive Lizenz-/Entitlement-Zusammenfassung. Der Steuerberaterexport bleibt lizenzfrei.
- LICENSE-002 wird zur einheitlichen Anzeige des serverautorisierten Zustands weiterentwickelt und erhält keine zweite Lizenzstruktur.

Ob die äußere Backup-Formatversion wegen der geänderten Restore-Semantik erhöht werden muss, wird im Migrationsblock anhand des endgültigen Schemas entschieden. Alte Backupformat-Version 1 muss in jedem Fall weiter lesbar bleiben.

## 15. Folgeblöcke

1. **LICENSE-004 – Protokoll- und Datenschutzvertrag:** offene Produktentscheidungen freigeben; API-, Claim-, Fehler-, Retention- und Schlüsselrotationsvertrag festschreiben.
2. **LICENSE-005 – Lokale Lizenzmigration und Prüfkern:** Settings v2, `licenseRuntime`, Geräteschlüssel, JWS-Prüfung, Zeitanker und abwärtskompatible Migration implementieren; noch keine Kauf- oder Paymentfunktion.
3. **LICENSE-006 – Lizenzdienst-Grundlage:** getrennten Dienst, minimales Datenmodell, Trialaktivierung, Challenge/Nonce, Revalidierung und signierte Bescheinigungen implementieren.
4. **LICENSE-007 – Client-Aktivierung und zentraler Schreibschutz:** Trial-/Ablaufanzeige, Aktivierung, Kaufweiterleitung als klarer Platzhalter sowie einheitlichen `productive`-/`read_only`-Guard integrieren.
5. **LICENSE-008 – Backup-, Restore- und Exportgrenze:** Runtime-Geheimnisse sicher ausschließen, portable Referenz behandeln und alte Backups vollständig regressionsprüfen.
6. **LICENSE-009 – Gerätewechsel und Notfallübernahme:** Deaktivierung, Transfer, Recovery, Bindungsversion und reale Zwei-Geräte-Tests umsetzen.
7. **LICENSE-010 – Payment-Aktivierung:** austauschbaren Provider-Adapter, idempotenten Webhook und Aktivierung derselben Trial-Lizenz implementieren.
8. **LICENSE-011 – Entitlements und Modul-Ladegrenze:** Feature-Manifest, signierte Entitlements, Lazy Loading und lokale Datenhoheit optionaler Module umsetzen.
9. **LICENSE-012 – Sicherheits- und Betriebsfreigabe:** Missbrauchs-, Replay-, Offline-, Uhr-, Ausfall-, Schlüsselrotations-, Datenschutz- und Recovery-Szenarien real prüfen.

Jeder Block bleibt fachlich eng. Ein Block ist keine einzelne verkaufte Lizenz und darf die Offline-First- oder Geschäftsdatenarchitektur nicht umgehen.

## 16. Offene echte Produkt- und Betriebsentscheidungen

1. Wird eine verifizierte E-Mail für Trial, Kauf und Recovery verbindlich verwendet, oder welcher gleichwertige datensparsame Identitätsweg ersetzt sie?
2. Werden 24/72 Stunden im Trial und 30/60 Tage nach Kauf als Revalidierungs-/Offlinegrenzen angenommen?
3. Wird die begrenzte Restlaufzeit eines verlorenen Offline-Altgeräts akzeptiert, die Übernahme verzögert oder die Frist verkürzt?
4. Welche Kauf-/Upgrade-Regel gilt für spätere Hauptversionen?
5. Welche Lebensdauer, Erstattungs- und Entzugsregeln gelten für ZusatzTool-Entitlements?
6. Welche Rechtsgrundlagen sowie Lösch- und Aufbewahrungsfristen gelten für E-Mail, Payment-Referenzen, Transfer- und Sicherheitsauditdaten?
7. Wie werden Signaturschlüssel, Rotation, Serverbackup, Monitoring, Incident Response und Support betrieben?
8. Ist die vorgeschriebene DSM-Upgrade- und Kompatibilitätsprüfung für den getrennten öffentlichen Lizenzdienst abgeschlossen?

## 17. Bewertung

**GO** für die Architekturgrundlage und den nächsten Entscheidungs-/Protokollblock LICENSE-004.

**NO-GO** für Produktimplementierung, öffentlichen Lizenzdienst und Payment, solange die offenen Entscheidungen nicht ausdrücklich freigegeben und ADR-0005 nicht angenommen sind. Dieser NO-GO schränkt die heutige lokale App nicht ein: LICENSE-001/002 bleibt funktionsfähig, aber ohne Trial-, Kauf- oder Nutzungsautorität.

## 18. Technische Grundlagen

- [RFC 8725 – JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725)
- [RFC 7515 – JSON Web Signature](https://www.rfc-editor.org/rfc/rfc7515)
- [RFC 7800 – Proof-of-Possession Key Semantics for JWTs](https://www.rfc-editor.org/rfc/rfc7800)
- [RFC 9449 – Demonstrating Proof of Possession](https://www.rfc-editor.org/rfc/rfc9449)
- [W3C Web Cryptography API Level 2](https://www.w3.org/TR/webcrypto-2/)
- [DSGVO Artikel 5 – Datenminimierung und Speicherbegrenzung](https://eur-lex.europa.eu/eli/reg/2016/679/art_5/oj)
