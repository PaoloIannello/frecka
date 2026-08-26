# LICENSE-004: Trial-, Lizenz- und Entitlement-Vertrag V1

**Status:** Verbindlicher Fach- und Protokollvertrag, noch nicht implementiert

**Vertragsstand:** LICENSE-004

**API-Version:** `v1`

**Serverformat:** Version 1

**Zukünftiges Clientformat:** `settings.license` Version 2 und `licenseRuntime` Version 1

**Grundlage:** ADR-0004 und angenommene ADR-0005

## 1. Normative Begriffe und Grenzen

In diesem Dokument bedeuten „MUSS“, „DARF NICHT“, „SOLL“ und „KANN“ verbindliche Vertragsstufen. Es wird noch kein Lizenzserver, Payment-Adapter, Client-Guard oder öffentlicher Endpunkt implementiert.

Der Lizenzdienst ist alleinige Autorität für Trialzeit, Kaufstatus, aktive Gerätebindung und Entitlements. Die PWA bleibt Autorität für ihre ausschließlich lokalen Geschäftsdaten. Der Lizenzdienst erhält niemals Belege, Kunden, Gutscheine, Umsätze, Kataloge, Dokumente oder Backups.

Die Zeitangaben des Protokolls sind UTC-Zeitpunkte. JWS-Zeitclaims verwenden NumericDate in ganzen Sekunden. JSON-Dokumente außerhalb der JWS verwenden RFC-3339-Zeitpunkte mit `Z` und ohne lokale Zeitzone.

## 2. Verbindliches Produktmodell

### 2.1 Trial

- Der Trial umfasst 14 Tage vollständigen FRECKA-Core-V1-Umfang.
- Er beginnt erst mit erfolgreicher serverseitiger Aktivierung.
- Ziel der Revalidierung sind 24 Stunden.
- Die harte Offline-Grenze beträgt 72 Stunden nach der letzten erfolgreichen Serverprüfung und niemals länger als bis `trialEndsAt`.
- Nach `trialEndsAt` sind keine produktiven Schreibvorgänge zulässig.
- Ablauf löscht oder verändert keine lokalen Daten.

### 2.2 Gekaufte Lizenz

- `frecka.core.v1` kostet einmalig 59 Euro.
- Es gibt keine monatlichen Kernproduktkosten.
- Updates und Fehlerkorrekturen innerhalb der Hauptversion V1 sind enthalten.
- Ziel der Revalidierung sind 30 Tage.
- Die harte Offline-Grenze beträgt 180 Tage nach der letzten erfolgreichen Serverprüfung.
- Nach der harten Grenze gilt Read-only; Daten bleiben erhalten.
- Eine V1-Lizenz enthält keine automatische Berechtigung für V2.

### 2.3 Identität, Gerät und ZusatzTools

- Eine verifizierte E-Mail ist Recovery- und Trial-Missbrauchsanker, aber kein Geschäftsdatum und kein Tokenclaim.
- Eine Lizenz gehört zu genau einem pseudonymen Mandanten und zu genau einem aktiven Gerät.
- Regulärer Gerätewechsel und Notfallübernahme sind vorgesehen.
- Das begrenzte Parallelrisiko eines absichtlich offline gehaltenen Altgeräts wird bis zum Ablauf seiner letzten signierten Bescheinigung akzeptiert.
- Geschäftsdaten wechseln nur über das verschlüsselte Nutzer-Backup und Restore.
- ZusatzTools werden pro Tool-Hauptversion dauerhaft berechtigt. Entzug ist nur bei Rückabwicklung, Betrug/Sicherheitsfall oder dokumentierter administrativer Korrektur zulässig und löscht keine Moduldaten.

## 3. Zustands- und Clientmodusmodell

### 3.1 Persistierter Lizenzstatus

| Status | Bedeutung | Zulässige Übergänge |
|---|---|---|
| `trial` | Trial serverseitig gestartet, noch nicht gekauft | `active`, `revoked` |
| `active` | FRECKA Core V1 gekauft und nicht entzogen | `revoked` |
| `revoked` | Berechtigung wirksam entzogen | nur dokumentierte administrative Korrektur zu `active` |

`trial_expired` wird aus `status == trial` und `serverTime >= trialEndsAt` abgeleitet. `device_transfer_pending` ist Zustand eines Transferdatensatzes, kein Lizenzstatus. Jeder Statuswechsel ist atomar, serverseitig zeitgestempelt und auditiert.

### 3.2 Clientmodi

| Modus | Bedingung | Produktive Geschäftsvorgänge |
|---|---|---|
| `productive` | gültige Bescheinigung, passender Mandant, Gerät, Schlüssel, Bindungsversion, Produkt und Zeitraum | erlaubt |
| `read_only` | bekannte Lizenz, aber Trial abgelaufen, Offline-Grenze überschritten oder Lizenz/Entitlement entzogen | verboten |
| `activation_required` | keine verwertbare Runtime-Bindung, unbekannter Schlüssel, fremde Bindung oder notwendige Online-Recovery | verboten |

Ein Serverhinweis auf den Modus ist informativ. Der Client MUSS `productive` selbst aus der gültigen JWS, Gerätebindung und vertrauenswürdigen Zeitbetrachtung ableiten. Unklare Fälle fallen geschlossen auf `read_only` beziehungsweise bei fehlender Bindung auf `activation_required` zurück.

### 3.3 Aktionsmatrix

| Aktion | `productive` | `read_only` | `activation_required` |
|---|:---:|:---:|:---:|
| App öffnen und lokale Historie lesen | ja | ja | ja |
| vorhandene Belege, Gutscheine, Kunden und Kataloge ansehen | ja | ja | ja |
| vorhandene PDF-/QR-Dokumente erzeugen, speichern oder teilen | ja | ja | ja |
| Backup erstellen | ja | ja | ja |
| Export erstellen | ja | ja | ja |
| Restore zur Datenrettung | ja | ja; bleibt Read-only | ja; bleibt aktivierungspflichtig |
| neue Belege/Gutscheine/Kunden/Katalogeinträge | ja | nein | nein |
| Storno, Gutschrift oder Gutscheineinlösung neu erzeugen | ja | nein | nein |
| Unternehmens-, Benutzer-, Steuer-, Zahlungs- oder Geschäftsbereichsdaten ändern | ja | nein | nein |
| Lizenz validieren, kaufen oder aktivieren | ja | ja | ja |
| regulären Gerätewechsel starten | ja | ja, sofern alter Geräteschlüssel vorhanden | nein |
| Transfer auf Neugerät abschließen | nein | nein | ja |
| Notfall-Recovery | ja | ja | ja |
| App-Update prüfen/aktivieren | ja | ja | ja |
| Diagnose ohne Datenänderung | ja | ja | ja |

Technische Schreibausnahmen sind ausschließlich:

- Lizenz-Runtime, Aktivierung, Recovery und portable Lizenzreferenz;
- kontrollierter Restore;
- Service-Worker-/Updatezustand ohne Geschäftsdaten;
- gerätelokale Backup-Erinnerung einschließlich Intervall und Snooze;
- rein lokale UI-/Barrierefreiheitspräferenzen ohne fachliche Wirkung;
- minimale Diagnoselaufzeitdaten ohne Geschäftsinhalt.

Der spätere zentrale Schreibguard verwendet eine positive Kommandowhitelist für diese Ausnahmen. Direkte Store-Schreibrechte oder seitenbezogene Sonderregeln sind unzulässig.

## 4. Serverseitiges Datenmodell Version 1

### 4.1 `identities`

| Feld | Vertrag |
|---|---|
| `formatVersion` | exakt `1` |
| `identityId` | opake Primärkennung |
| `emailCiphertext` | normalisierte, zugriffsgeschützt gespeicherte E-Mail |
| `emailLookup` | serverseitig geheimnisgebundene Suchableitung |
| `emailVerifiedAt` | Serverzeit der letzten gültigen Verifikation |
| `recoveryStatus` | `enabled`, `cooldown`, `blocked`, `deletion_pending` |
| `createdAt`, `updatedAt` | Serverzeit |
| `deletionRequestedAt` | optional |

Constraints:

- Primärschlüssel `identityId`;
- `emailLookup` ist eindeutig;
- Klartext-E-Mail, Verifikationscode und Suchgeheimnis dürfen nicht in Logs oder Auditpayloads erscheinen;
- E-Mail ist keine Kunden- oder Unternehmens-E-Mail der lokalen Geschäftsdaten.

### 4.2 `licenses`

| Feld | Vertrag |
|---|---|
| `formatVersion` | exakt `1` |
| `licenseId` | opake Primärkennung und JWS-Subject |
| `identityId` | Fremdschlüssel zur Recovery-Identität |
| `tenantId` | stabile, pseudonyme serverseitige Mandantenkennung |
| `productId` | für Core V1 exakt `frecka.core` |
| `majorVersion` | für Core V1 exakt `1` |
| `status` | `trial`, `active`, `revoked` |
| `trialStartedAt`, `trialEndsAt` | bei Trial gesetzt; Differenz exakt 14 Tage |
| `activatedAt` | Kaufaktivierung; bei Trial `null` |
| `revokedAt` | nur bei `revoked` gesetzt |
| `revocationReason` | optionale Erlaubnislistenklasse, kein Freitext |
| `activeDeviceId` | genau eine aktuelle Gerätekennung oder während initialer Anlage kurzzeitig `null` |
| `bindingVersion` | positive, bei jeder Ablösung strikt steigende Ganzzahl |
| `createdAt`, `updatedAt` | Serverzeit |

Constraints:

- Primärschlüssel `licenseId`;
- `tenantId` ist eindeutig und gehört genau einer Lizenz;
- eine Identity darf mehrere gekaufte Filiallizenzen besitzen; die Einmaligkeit des Trials wird ausschließlich in `trialGrants` erzwungen;
- `activeDeviceId` verweist auf genau eine nicht deaktivierte Bindung derselben Lizenz;
- Status, Trial-, Aktivierungs- und Revocation-Zeitpunkte werden per Check-Constraint konsistent gehalten;
- Kauf aktiviert dieselbe `licenseId`; es wird keine zweite Lizenz neben dem Trial erzeugt.

### 4.3 `deviceBindings`

| Feld | Vertrag |
|---|---|
| `formatVersion` | exakt `1` |
| `bindingId` | opake Primärkennung |
| `licenseId`, `deviceId` | Fremd- beziehungsweise Gerätekennung |
| `publicKeyJwk` | öffentlicher ECDSA-P-256-Schlüssel |
| `publicKeyThumbprint` | kanonischer JWK-Fingerabdruck |
| `bindingVersion` | Kopie der zum Binden gültigen Lizenzversion |
| `boundAt`, `lastValidatedAt` | Serverzeit |
| `deactivatedAt` | optional |
| `deactivationReason` | Erlaubnislistenklasse |

Constraints:

- Primärschlüssel `bindingId`;
- `deviceId` ist opak und serverseitig erzeugt;
- `licenseId + bindingVersion` ist eindeutig;
- höchstens eine Zeile je Lizenz ist nicht deaktiviert;
- derselbe Schlüssel darf grundsätzlich mehrere gekaufte Filiallizenzen binden; nur ein zweiter Trial derselben Hauptversion wird über `trialGrants` verhindert;
- Public Key und Thumbprint sind öffentliches Schlüsselmaterial, aber weiterhin sicherheitsrelevante pseudonyme Geräteinformationen.

### 4.4 `entitlements`

| Feld | Vertrag |
|---|---|
| `formatVersion` | exakt `1` |
| `entitlementId` | opake Primärkennung |
| `licenseId` | Fremdschlüssel |
| `entitlementKey` | zum Beispiel `frecka.core.v1`, `frecka.crm.v1` |
| `moduleId` | `frecka.core`, `frecka.crm`, `frecka.calendar` |
| `majorVersion` | positive Ganzzahl |
| `status` | `active`, `revoked` |
| `source` | `trial`, `purchase`, `refund`, `chargeback`, `security`, `admin_correction` |
| `sourceReference` | opake Kauf-/Korrekturreferenz, keine Zahlungsdaten |
| `grantedAt`, `revokedAt` | Serverzeit |
| `revocationReason` | optionale Erlaubnislistenklasse |

`licenseId + entitlementKey` ist eindeutig. Ein erneuter Grant derselben Tool-Hauptversion aktualisiert keinen neuen Datensatz, sondern liefert idempotent die vorhandene Berechtigung. Ein Core-Trial verwendet `frecka.core.v1`; seine Nutzbarkeit wird zusätzlich durch Trialzeit und Lizenzstatus begrenzt.

### 4.5 Transfer, Recovery und Trialhistorie

`deviceTransfers` speichert `transferId`, Lizenz, alte Gerätebindung, Status (`pending`, `completed`, `expired`, `cancelled`), Ablaufzeit, einmalig gehashten Transfernachweis und Abschlussbindung. `licenseId + pending` ist höchstens einmal vorhanden.

`recoveryChallenges` speichert nur Challenge-ID, Identity-/Lizenzreferenz, Zweck, neue Schlüsselbindung, Ablauf, Fehlversuche, Cooldown und Verbrauchszeit. Codes und Recovery-Geheimnisse werden nur gehasht gespeichert.

`trialGrants` bindet genau einen Trial an `identityId`, `tenantId`, `licenseId` und den ursprünglichen Schlüssel-Fingerabdruck. Eindeutig sind mindestens `identityId + productId + majorVersion`, `tenantId + productId + majorVersion` sowie der historische Fingerabdruck für einen Trial derselben Hauptversion.

### 4.6 Kauf-, Idempotenz- und Auditreferenzen

`purchaseReferences` enthält `purchaseReference`, Providerklasse, Provider-Ereignis-ID, Lizenz, Produkt, Hauptversion, serverseitige `priceId`, `currency: EUR`, `amountMinor: 5900`, Status (`pending`, `paid`, `refunded`, `charged_back`, `cancelled`) und Serverzeitpunkte. Kartendaten, Bankdaten und vollständige Providerpayloads sind ausgeschlossen.

`idempotencyRecords` verwendet den eindeutigen Schlüssel `actorScope + route + idempotencyKey`, speichert einen Request-Hash, Ergebnisreferenz und Ablauf. Gleicher Schlüssel mit gleichem Request liefert dasselbe semantische Ergebnis; gleicher Schlüssel mit anderem Request ergibt `IDEMPOTENCY_CONFLICT`.

`securityEvents` ist append-only und enthält nur Event-ID, Zeitpunkt, Ereignisklasse, Ergebnis, pseudonyme Lizenz-/Identity-/Device-Referenz, Request-ID und grobe Ablehnungsklasse. Erlaubte Ereignisse sind Trial-/Lizenzaktivierung, Bindung/Deaktivierung, Transfer/Recovery, Revocation, Entitlement Grant/Revoke sowie relevante Replay-/Proof-/Rate-Limit-Ablehnungen. Nutzungsanalyse und Geschäftsinhalte sind verboten.

Alle mehrteiligen Zustandswechsel verwenden eine einzige Datenbanktransaktion. Lizenzstatus, aktive Bindung, Bindungsversion, Entitlements, Idempotenz und Audit dürfen keinen fachlichen Teilzustand hinterlassen.

## 5. Clientmodell und geplante Migration

### 5.1 Portable Referenz `settings.license` Version 2

```text
settings.license
├── formatVersion: 2
├── localTenantId
├── licenseId
├── serverTenantId
├── productId
├── majorVersion
└── linkedAt
```

Die Referenz ist backup- und restorefähig, aber nicht autoritativ. Sie enthält keine E-Mail, keine Geräte-ID, keinen Schlüssel, kein Token, keine Offline-Grenze und keine wirksame Status- oder Entitlemententscheidung. `localTenantId` übernimmt beim Upgrade den bisherigen lokalen `tenantId`; `serverTenantId` ist die pseudonyme Serverkennung.

### 5.2 `licenseRuntime` Version 1

Der Runtime-Datensatz wird mit `localTenantId` als Schlüssel in einem eigenen IndexedDB-Store geführt:

```text
licenseRuntime
├── formatVersion: 1
├── localTenantId
├── licenseId / serverTenantId
├── deviceId
├── devicePrivateKey: nicht exportierbarer CryptoKey
├── devicePublicKeyThumbprint
├── signedLicenseToken
├── tokenVersion / keyId
├── lastServerValidationAt
├── trustedServerTimeAnchor
├── maxObservedLocalTime
├── nextValidationAt
├── offlineValidUntil
├── bindingVersion
├── cachedEntitlements
└── lastValidationOutcome
```

`nextValidationAt`, `offlineValidUntil`, Status und `cachedEntitlements` sind nur gecachte Projektionen aus der zuletzt erfolgreich geprüften JWS. Bei Widerspruch gilt ausschließlich die JWS. Der private Schlüssel wird als nicht exportierbarer `CryptoKey` mittels Structured Clone gespeichert.

Ein eigener Store ist zwingend, weil der heutige Settings-Store vollständig in Tenant-Snapshot, Backup, Restore und Eigene-Daten-Export einfließt. Die geplante IndexedDB-Schemaerhöhung ist deshalb Version 5 auf Version 6. Der Runtime-Store wird in keiner Snapshot-Allowlist ergänzt.

### 5.3 Backup, Restore und Neuinstallation

- Backup enthält nur `settings.license` Version 2.
- Restore importiert keinen Runtime-Datensatz, privaten Schlüssel, Token, Nonce, Zeitanker oder Gerätecache.
- Auf demselben Gerät bleibt eine vorhandene Runtime-Bindung außerhalb der Restore-Transaktion erhalten und muss danach zur restaurierten Referenz passen.
- Bei abweichender Lizenzreferenz wird die Runtime nicht überschrieben; der Client wechselt zu `activation_required`.
- Auf einem neuen Gerät führt eine portable Referenz ohne Runtime immer zu `activation_required` und in Transfer/Recovery.
- Eine vollständig neue Installation ohne portable Referenz bietet Trialstart oder Recovery an.
- Historische `settings.license`-Version 1 wird verlustfrei als lokale Migrationsquelle gelesen. Lokale LICENSE-001-IDs erzeugen niemals selbst Autorität und starten nicht automatisch einen Trial.
- Alte Backupformat-Version 1 bleibt lesbar. Ob die äußere Backupformatnummer erhöht wird, entscheidet LICENSE-005 anhand der finalen Implementierung; der Runtime-Ausschluss ist unabhängig davon verbindlich.

## 6. JWS-Lizenzbescheinigung Version 1

### 6.1 JOSE-Header

```json
{
  "alg": "ES256",
  "typ": "frecka-license+jwt",
  "kid": "<öffentliche Schlüsselkennung>"
}
```

Nur `ES256` mit ECDSA P-256/SHA-256 ist in Tokenversion 1 zulässig. `none`, Algorithmuswechsel aus dem Token, symmetrische Algorithmen und nicht unterstützte kritische Header werden abgewiesen.

### 6.2 Claims

```json
{
  "iss": "https://license.frecka.app",
  "aud": "frecka-pwa",
  "sub": "<licenseId>",
  "jti": "<eindeutige Token-ID>",
  "iat": 1787688000,
  "nbf": 1787687940,
  "exp": 1803240000,
  "token_version": 1,
  "tenant_id": "<pseudonyme serverTenantId>",
  "device_id": "<deviceId>",
  "binding_version": 3,
  "license_status": "active",
  "trial_ends_at": null,
  "product_id": "frecka.core",
  "product_major": 1,
  "entitlements": ["frecka.core.v1"],
  "next_validation_at": 1790280000,
  "cnf": { "jkt": "<JWK-SHA-256-Thumbprint>" }
}
```

Regeln:

- `sub`, `tenant_id`, `device_id`, `binding_version` und `cnf.jkt` müssen zur lokalen Referenz und Gerätebindung passen.
- `license_status` im ausgestellten produktiven Token ist `trial` oder `active`. Für `revoked` wird kein produktives Token ausgestellt.
- `trial_ends_at` ist bei `trial` erforderlich und bei `active` nicht vorhanden oder `null`.
- `entitlements` ist eine sortierte, duplikatfreie Liste ausschließlich wirksamer IDs.
- `exp` ist identisch zu `offlineValidUntil` und bei Trial das Minimum aus letzter Validierung plus 72 Stunden und `trial_ends_at`.
- `next_validation_at` beträgt bei Trial höchstens 24 Stunden, bei `active` höchstens 30 Tage nach `iat`.
- `nbf` darf höchstens 60 Sekunden vor `iat` liegen. Der Client akzeptiert maximal 5 Minuten technisch begründete Uhrtoleranz, erweitert dadurch aber nie `exp` oder `trial_ends_at`.
- E-Mail, Kaufpreis, Provider, Unternehmens-, Kunden- und Geschäftsdaten sind verboten.

### 6.3 Schlüsselrotation und unbekanntes `kid`

- Der Client enthält mindestens den aktuellen und den angekündigten nächsten öffentlichen Prüfschlüssel.
- Der Lizenzdienst veröffentlicht nur öffentliche JWKs unter derselben festen HTTPS-Origin; Redirects auf fremde Origins sind unzulässig.
- Ein neuer Schlüssel wird mindestens 30 Tage vor seiner ersten Nutzung veröffentlicht.
- Öffentliche Schlüssel bleiben mindestens 210 Tage nach dem letzten mit ihnen ausgestellten Token verfügbar; private Altschlüssel werden nach Ende der Ausstellung deaktiviert.
- Bei unbekanntem `kid` darf der Client online den Keyset derselben Origin aktualisieren und anschließend vollständig neu prüfen.
- Offline wird ein Token mit unbekanntem `kid` nie akzeptiert. Ein vorher bereits vollständig verifiziertes altes Token darf unverändert nur bis zu seinem eigenen `exp` weiterlaufen.
- Eine Änderung der im App-Release verankerten Issuer-/Keyset-Vertrauensbasis benötigt einen versionierten App-Release und eine dokumentierte Incident-Freigabe.

### 6.4 Proof of Possession und Replay

Geräteauthentisierte Routen verwenden einen DPoP-inspirierten, vom nicht exportierbaren Geräteschlüssel signierten Proof. Er bindet mindestens HTTP-Methode, kanonische Ziel-URL, Server-Nonce, `iat`, eindeutiges `jti`, Hash des Lizenz-Tokens und `binding_version`.

Der Server prüft, dass der JWK-Thumbprint des Proofs `cnf.jkt` und der aktiven Gerätebindung entspricht. Nonces sind einmalig und höchstens fünf Minuten gültig. Proofs werden nur innerhalb von fünf Minuten Serverzeit akzeptiert; ihre `jti` wird mindestens zehn Minuten gegen Replay gehalten. Der erste noncepflichtige Request kann mit `NONCE_REQUIRED` und einer neuen Nonce beantwortet werden.

Ein abgelaufenes, aber korrekt signiertes Token darf ausschließlich an Validierungs-, Kauf-, Transfer- oder Recovery-Routen als Bindungshinweis verwendet werden. Es autorisiert keine produktive App-Nutzung.

## 7. Serverzeit und Offlineentscheidung

### 7.1 Bildung des Zeitankers

Nach erfolgreicher Validierung speichert der Client:

- signiertes `iat` als `serverTime`;
- lokale UTC-Wanduhr beim Empfang;
- den höchsten bisher beobachteten lokalen UTC-Zeitpunkt;
- für die laufende Sitzung einen Startwert von `performance.now()`.

Innerhalb derselben Sitzung wird die Zeit mindestens monoton aus `serverTime + performance.now()`-Differenz fortgeschrieben. Über Sitzungen wird die lokale Wanduhr nur als Fortschrittsindikator verwendet, nie als Lizenzautorität.

### 7.2 Manipulation und Ausfall

- Rücksprung der lokalen Uhr um mehr als fünf Minuten gegenüber dem höchsten gespeicherten Zeitpunkt: `activation_required` für produktive Schreibvorgänge bis zur Serverprüfung; Lesen bleibt möglich.
- Vorwärtssprung: kann zu früherem Read-only führen, verlängert aber niemals eine Berechtigung; Onlineprüfung kann korrigieren.
- Gelöschter oder widersprüchlicher Runtime-Cache: keine Rekonstruktion aus Settings, LocalStorage oder App-Installationszeit; `activation_required`.
- Server nicht erreichbar vor `nextValidationAt`: keine Wirkung.
- Server nicht erreichbar nach `nextValidationAt`, aber vor `exp`: Warnung und weiterhin `productive`.
- Server nicht erreichbar bei oder nach `exp`: `read_only`.
- Trial erreicht `trialEndsAt`: unabhängig von jeder anderen lokalen Zeitangabe `read_only`.
- Signierte/ordnungsgemäß authentisierte Antwort `revoked` oder Gerätebindung ungültig: sofort `read_only` beziehungsweise `activation_required`; das alte Token wird nicht weiter als produktiv behandelt.
- Ungültige, unvollständige oder falsch signierte Serverantwort ersetzt keinen gültigen Cache. Der vorhandene Nachweis gilt nur bis zu seinem bisherigen `exp`.

Eine PWA kann eine manipulierte Laufzeitumgebung oder vollständige Browserprofilkopie nicht beweisbar verhindern. Die Regeln begrenzen den normalen Client und verhältnismäßigen Missbrauch, nicht einen vollständig kontrollierten Fremdclient.

## 8. API-Vertrag `/v1`

### 8.1 Gemeinsame Regeln

- ausschließlich HTTPS und JSON;
- jede Antwort enthält `requestId` und `serverTime`;
- jeder zustandsändernde POST benötigt `Idempotency-Key` mit mindestens 128 Bit Zufall;
- derselbe Schlüssel und Request-Hash liefert dasselbe semantische Ergebnis;
- gerätegebundene Routen benötigen Lizenzbescheinigung und Geräte-Proof;
- Fehlermeldungen verwenden `application/problem+json` mit `type`, `title`, `status`, `code`, `requestId`, `serverTime` und optional `retryAfterSeconds`;
- Fehlermeldungen enthalten weder E-Mail-Bestand noch interne Schlüssel-, Datenbank- oder Providerdetails.

Gerätegebundene Requests verwenden:

```http
Authorization: DPoP <compact-license-jws>
DPoP: <compact-device-proof-jws>
Idempotency-Key: <mindestens 128 Bit zufällige Kennung>
Content-Type: application/json
```

Der DPoP-Proof enthält die vom Server zuletzt gelieferte Nonce. Eine neue Nonce wird im Response-Header `DPoP-Nonce` ausgegeben. Die Nutzung dieses Schemas ist DPoP-inspiriert und keine Behauptung, der Lizenzdienst sei ein vollständiger OAuth-Autorisierungsserver.

Ein erfolgreicher JSON-Response verwendet mindestens:

```json
{
  "requestId": "<opaque>",
  "serverTime": "2026-08-26T12:00:00Z",
  "result": {}
}
```

Ein Fehler verwendet beispielsweise:

```json
{
  "type": "https://license.frecka.app/problems/device-mismatch",
  "title": "Gerätebindung stimmt nicht überein",
  "status": 403,
  "code": "DEVICE_MISMATCH",
  "requestId": "<opaque>",
  "serverTime": "2026-08-26T12:00:00Z"
}
```

### 8.2 Minimale Routen

#### `POST /v1/identity-verifications`

Startet E-Mail-Verifikation für `trial`, `recovery` oder `purchase`. Unauthentisiert, stark rate-limitiert. Request: `{ email, purpose, productId, majorVersion, publicKeyThumbprint }`. Response ist unabhängig vom E-Mail-Bestand immer `202` mit `{ verificationId, nonce, expiresAt, retryAfterSeconds }`. Schreibt eine kurzlebige Challenge. Idempotent pro Request-Schlüssel; Replay derselben Idempotenz liefert dieselbe Challenge, solange sie gültig ist.

Fehler: `INVALID_REQUEST` 400, `RATE_LIMITED` 429, `SERVICE_UNAVAILABLE` 503.

#### `POST /v1/identity-verifications/{verificationId}/confirm`

Bestätigt den einmaligen Code und den Besitz des im Start gebundenen neuen Geräteschlüssels. Request: `{ code, publicKeyJwk, deviceProofJws }`; der Proof bindet Nonce, Ziel, Methode, Verification-ID und Public-Key-Thumbprint. Response: `{ identityGrant, purpose, publicKeyThumbprint, expiresAt }`; noch keine Lizenz. Verbraucht Challenge atomar. Der Grant ist einmalig, höchstens 15 Minuten gültig und nur mit demselben Schlüssel verwendbar.

Fehler: `VERIFICATION_INVALID` 400, `VERIFICATION_EXPIRED` 410, `PROOF_INVALID` 401, `ATTEMPTS_EXCEEDED` 429, `IDEMPOTENCY_CONFLICT` 409.

#### `POST /v1/trials`

Startet genau einmal Trial und Gerätebindung. Authentisierung: `identityGrant` für `trial` plus Proof des gebundenen Schlüssels. Request: `{ identityGrant, productId, majorVersion, publicKeyJwk }`. Transaktion: Identity zuordnen, Lizenz/Mandant anlegen, Trialhistorie schreiben, Gerät binden, `frecka.core.v1` gewähren, Audit/Idempotenz schreiben, Token ausstellen. Response: `{ licenseReference, deviceId, signedLicenseToken, nextValidationAt, offlineValidUntil, trialEndsAt, recoveryProof }`. `recoveryProof` wird genau einmal ausgeliefert und serverseitig nur gehasht gespeichert.

Fehler: `TRIAL_ALREADY_USED` 409, `DEVICE_TRIAL_ALREADY_USED` 409, `IDENTITY_GRANT_INVALID` 401, `PROOF_INVALID` 401, `PRODUCT_UNSUPPORTED` 422.

#### `POST /v1/licenses/{licenseId}/validations`

Ersetzt GET-Status und separaten Entitlement-Refresh. Authentisierung: vorhandenes Token beziehungsweise korrekt signierter abgelaufener Bindungshinweis plus Geräte-Proof. Request: `{ clientVersion, tokenVersion, bindingVersion }`; keine Nutzungsdaten. Schreibt `lastValidatedAt`, Replay-/Auditmetadaten und neue Idempotenzantwort, verändert aber keinen Kaufstatus. Response: `{ accessMode, licenseStatus, signedLicenseToken, nextValidationAt, offlineValidUntil, trialEndsAt, entitlements, bindingVersion }`. Bei Read-only ist `signedLicenseToken` `null`.

Fehler: `NONCE_REQUIRED` 401, `TOKEN_INVALID` 401, `DEVICE_MISMATCH` 403, `BINDING_SUPERSEDED` 409, `LICENSE_REVOKED` 403, `PRODUCT_UNSUPPORTED` 422, `SERVICE_UNAVAILABLE` 503. Ein abgelaufener Trial wird als erfolgreicher fachlicher Read-only-Status ohne produktiven JWS zurückgegeben, nicht als technischer Fehler.

#### `POST /v1/purchase-sessions`

Vertragsroute für die spätere Payment-Integration. Authentisierung: Lizenzbindung und Geräte-Proof; auch mit abgelaufenem korrekt signiertem Bindungshinweis zulässig. Request: `{ productId, majorVersion, priceId }`; `licenseId` stammt aus dem authentisierten Token und darf nicht aus dem Body überschrieben werden. Response: `{ purchaseReference, checkoutUrl, expiresAt }`. Keine Karten- oder Bankdaten passieren FRECKA. Schreibt nur Kaufreferenz und Idempotenz. Für Core V1 referenziert `priceId` den serverseitigen Katalogpreis von `amountMinor: 5900` und `currency: EUR`; Betrag und Währung werden niemals aus dem Client übernommen.

Fehler: `LICENSE_REVOKED` 403, `PRODUCT_ALREADY_OWNED` 409, `PRICE_INVALID` 422, `PAYMENT_PROVIDER_UNAVAILABLE` 503.

Eine eigene öffentliche `POST /license/activate`-Route wird nicht eingeführt: Der validierte Provider-Webhook aktiviert die vorhandene Lizenz, der Client erhält den Zustand anschließend über `validations`.

#### `POST /v1/device-transfers`

Startet regulären Wechsel. Authentisierung: aktueller Geräteschlüssel, auch im Read-only-Modus. Request: `{}`. Response: `{ transferId, transferProof, nonce, expiresAt }`; Ablauf nach 15 Minuten. Das Altgerät bleibt bis zum Abschluss aktiv. Schreibt nur Pending-Workflow, Idempotenz und Audit. Der Transfernachweis ist einmalig und serverseitig nur gehasht gespeichert.

Fehler: `DEVICE_NOT_ACTIVE` 403, `TRANSFER_ALREADY_PENDING` 409, `TRANSFER_LIMIT_REACHED` 429.

#### `POST /v1/device-transfers/{transferId}/complete`

Schließt auf dem Neugerät ab. Authentisierung: einmaliger Transfernachweis und Proof des eingereichten neuen Public Keys. Request: `{ transferProof, publicKeyJwk, deviceProofJws }`. Response: `{ licenseReference, deviceId, signedLicenseToken, nextValidationAt, offlineValidUntil, bindingVersion }`. Atomare Transaktion: alte Bindung deaktivieren, `bindingVersion` erhöhen, neues Gerät binden, Pending-Transfer verbrauchen und neuen JWS ausstellen. Wiederholung mit derselben Idempotenz und demselben Key liefert dasselbe Ergebnis; anderer Key ergibt Konflikt.

Fehler: `TRANSFER_INVALID` 401, `TRANSFER_EXPIRED` 410, `TRANSFER_CONFLICT` 409, `PROOF_INVALID` 401.

#### `POST /v1/device-recoveries`

Führt Notfallübernahme aus. Authentisierung: bestätigter `identityGrant` für `recovery`, Proof des neuen Schlüssels und entweder gültiger Recovery-Nachweis oder freigegebener Supportnachweis. Request: `{ identityGrant, licenseId, recoveryProof, supportGrant, publicKeyJwk, deviceProofJws }`; genau einer von `recoveryProof` und `supportGrant` ist erforderlich. Response: `{ licenseReference, deviceId, signedLicenseToken, nextValidationAt, offlineValidUntil, bindingVersion }`. Transaktion entspricht Transferabschluss, markiert die alte Bindung aber als `emergency_recovery`.

Fehler: `RECOVERY_PROOF_REQUIRED` 401, `RECOVERY_COOLDOWN` 429, `RECOVERY_LIMIT_REACHED` 429, `LICENSE_NOT_RECOVERABLE` 403, `PROOF_INVALID` 401.

#### `GET /v1/keys`

Liefert ausschließlich die öffentlichen aktiven, angekündigten und noch für Alt-Tokens benötigten JWKs. Kein Zustand wird verändert. Cachezeiten dürfen die festgelegten Rotationsfristen nicht überschreiten.

### 8.3 Private Paymentroute

`POST /internal/v1/payment-events/{provider}` ist niemals eine PWA-Route. Sie authentisiert ausschließlich anhand des unveränderten Providerpayloads und dessen Signatur, dedupliziert `provider + eventId`, prüft Kaufreferenz, Produkt, Preiskennung und Währung und ändert Lizenz/Entitlement atomar.

Statusmapping:

| Providerereignis | Lizenzwirkung |
|---|---|
| erfolgreich bezahlt | bestehendes `trial` zu `active`, bestehendes Core-Entitlement bestätigen |
| Zahlung ausstehend/abgebrochen | keine Freigabe |
| Refund | betroffenes Entitlement `revoked`; Core-Lizenz gegebenenfalls `revoked` |
| Chargeback/Betrugsfall | betroffenes Entitlement beziehungsweise Lizenz `revoked`, Sicherheitsereignis |
| doppeltes Ereignis | keine zweite Wirkung |
| administrative Korrektur | nur autorisiert, begründet, auditiert und idempotent |

## 9. Gerätewechsel und Recovery

### 9.1 Regulärer Wechsel

1. Nutzer erstellt und prüft ein verschlüsseltes Backup.
2. Altgerät startet authentisiert den Transfer.
3. Transfernachweis wird außerhalb des Geschäftsdaten-Backups an das Neugerät übergeben.
4. Neugerät erzeugt einen neuen nicht exportierbaren Schlüssel und schließt den Transfer ab.
5. Server deaktiviert alt und aktiviert neu in einer Transaktion; `bindingVersion` steigt genau einmal.
6. Neugerät prüft den neuen JWS-Nachweis und stellt anschließend das Nutzer-Backup wieder her.

Pending-Transfers laufen nach 15 Minuten aus. Höchstens fünf Starts pro Lizenz und 24 Stunden sind automatisiert zulässig. Ein abgebrochener/abgelaufener Transfer verändert die aktive Bindung nicht.

### 9.2 Notfallübernahme

- E-Mail-Verifikation und Besitz des neuen Geräteschlüssels sind immer erforderlich.
- Für sofortige automatische Recovery ist zusätzlich der bei Aktivierung einmalig ausgegebene Recovery-Nachweis erforderlich; der Server speichert nur dessen Hash.
- Ohne Recovery-Nachweis gilt eine 24-stündige Sicherheitswartezeit mit Benachrichtigung an die verifizierte Adresse oder ein dokumentierter manueller Supportnachweis.
- Höchstens sechs Codeversuche pro Challenge und drei neue Challenges je 24 Stunden sind zulässig.
- Nach abgeschlossener Notfallübernahme gilt 24 Stunden Cooldown für eine weitere Notfallübernahme.
- Mehr als zwei abgeschlossene Notfallübernahmen in 30 Tagen erfordern manuelle Prüfung.
- Das Altgerät wird serverseitig sofort abgelöst; sein akzeptiertes Offline-Restrisiko endet technisch erst mit `exp` seines alten Tokens.

Audit speichert nur Recoveryklasse, Lizenz-/Gerätereferenz, Zeitpunkt, Ergebnis, Bindungsversion und gegebenenfalls Supportfall-ID; keine E-Mail, Codes oder Begründungsfreitexte.

## 10. Trial-Missbrauchsschutz

| Fall | Verbindliches Verhalten |
|---|---|
| gleiche E-Mail, neues Gerät | vorhandenen Trial mit unverändertem Ende wiederherstellen; keinen neuen Trial starten |
| gleiche E-Mail, Browserdaten gelöscht | Identity-Verifikation und Recovery; Trialzeit bleibt serverseitig unverändert |
| neues E-Mail-Konto, gleicher bestehender Geräteschlüssel | historischer Thumbprint verhindert zweiten V1-Trial |
| Gerät zurückgesetzt, gleiche E-Mail | vorhandene Identität/Trialhistorie wiederverwenden |
| zweite Trial-Anfrage für denselben Mandanten | `TRIAL_ALREADY_USED` |
| neue E-Mail und vollständig neuer Browser-/Geräteschlüssel | ohne Fingerprinting nicht zuverlässig als dieselbe Person/dasselbe Gerät erkennbar |

Zusätzlicher Schutz: serverseitige Trialhistorie, eindeutige Identity-/Tenant-Regeln, Key-Bindung, Rate Limits, kurzlebige Netzwerk-Ablehnungszähler und manuelle Prüfung auffälliger Recoveryfolgen. Es entstehen keine dauerhaften IP- oder Browserprofile.

FRECKA behauptet nicht, absichtlich neue E-Mail-Adressen zusammen mit vollständig gelöschten Browserdaten ohne Fingerprinting sicher zusammenführen zu können. Dieses Restrisiko wird gegenüber aggressiver Geräteerkennung akzeptiert.

## 11. Entitlement- und Modulvertrag

### 11.1 Entitlement-IDs

- Kern: `frecka.core.v1`;
- Beispiel CRM: `frecka.crm.v1`;
- Beispiel Kalender: `frecka.calendar.v1`.

IDs sind stabil, kleingeschrieben und enthalten die Tool-Hauptversion. Entitlements folgen der Lizenz und werden bei Gerätewechsel im neuen Token neu nachgewiesen.

### 11.2 Modulmanifest Version 1

```json
{
  "manifestVersion": 1,
  "moduleId": "frecka.crm",
  "moduleMajor": 1,
  "requiredEntitlement": "frecka.crm.v1",
  "compatibleCore": { "min": "1.0.0", "maxExclusive": "2.0.0" },
  "entryPoint": "modules/crm/v1/index.js",
  "assets": [{ "path": "modules/crm/v1/index.js", "sha256": "<digest>" }]
}
```

- Das Manifest ist Bestandteil des unveränderlichen Releasekontexts und seiner Integritätsprüfung.
- Optionale Moduldateien gehören nicht zum Core-App-Shell-Precache.
- Der Loader prüft Core-Kompatibilität, gültige JWS, Entitlement, Manifestpfad und Integrität vor dem Import.
- Nicht berechtigte Module werden nicht geladen.
- Erste Offlinenutzung ist erst möglich, nachdem das berechtigte Modul online vollständig geladen und in einem getrennten versionierten Modulcache geprüft wurde.
- Innerhalb der Lizenz-Offline-Grenze darf ein bereits geprüftes Modul offline arbeiten.
- Entzug verhindert neue produktive Modulaktionen, löscht aber keine lokalen Moduldaten. Lesen, Export und kontrolliertes Löschen bleiben möglich.
- Module greifen nur über versionierte Kern-APIs auf freigegebene Projektionen und Kommandos zu; direkter Zugriff auf interne Stores ist verboten.
- Serverseitige Toolfunktionen prüfen das Entitlement erneut. Clientseitiges Lazy Loading ist allein keine Sicherheitsgrenze.

## 12. Datenschutz und Aufbewahrung

Die folgenden Fristen sind Vertragsvorgaben für die technische Umsetzung; gesetzlich erforderliche Abweichungen müssen vor Produktivbetrieb dokumentiert werden.

| Daten | Zweck | Aufbewahrung | Löschung/Reduktion |
|---|---|---|---|
| verifizierte E-Mail/Identity | Trialzuordnung, Kauf, Recovery | solange Lizenz oder Recovery angeboten wird | bei berechtigter Löschung sofort sperren, technisch binnen 30 Tagen löschen; Recovery endet |
| Trialhistorie/Email-Lookup | zweiten V1-Trial begrenzen | 24 Monate nach Trialende, bei Kauf für Lizenzlaufzeit | danach Identitybezug löschen/anonymisieren; rechtliche Grundlage vor Betrieb prüfen |
| aktive Gerätebindung | Tokenprüfung und Ein-Gerät-Regel | solange aktiv | bei Ablösung deaktivieren |
| deaktivierter Public Key/Transfer | Replay, Support, 180-Tage-Alt-Token | 210 Tage nach Deaktivierung | Public Key und Detaildaten löschen; aktuelle `bindingVersion` bleibt |
| normale Auditereignisse | Support und Integrität | 90 Tage | löschen |
| Replay-/Security-Ablehnungen | Missbrauchsschutz | 180 Tage | löschen oder nicht personenbezogen aggregieren |
| Challenge/Nonce | Verifikation und Replay | bis Verbrauch, höchstens 15 Minuten; Nonce höchstens 5 Minuten | unmittelbar löschen/als verbraucht markieren |
| Idempotenzantwort | sichere Wiederholung | 24 Stunden, Payment entsprechend Provider-Replayfenster | Responsekörper löschen, Ergebnisreferenz minimal halten |
| Kauf-/Entitlementreferenz | dauerhafte Berechtigung, Refund/Chargeback | für Dauer der Berechtigung und erforderlicher Nachweisfrist | Providerpayload verwerfen; nur opake Referenz/Status behalten |
| revoked Lizenz | Entzug durchsetzen und Streitfall klären | 24 Monate nach endgültigem Fallabschluss, sofern keine Pflicht länger gilt | Identity-/Gerätedetails anonymisieren, minimale Sperrreferenz behalten, wenn rechtlich zulässig |
| Recovery-Challenge | Kontoübernahme verhindern | kurzlebig; Ergebnisereignis 210 Tage | Code/Geheimnis sofort, Metadaten nach Frist löschen |

Personenbezogen beziehungsweise pseudonym personenbezogen sind insbesondere E-Mail, `identityId`, zuordenbare Lizenz-/Tenant-/Device-IDs, Schlüssel-Fingerabdruck, Kaufreferenz und sicherheitsbezogene Netzwerkmetadaten. Öffentliche Schlüssel sind keine Secrets, aber zuordenbare Gerätekennzeichen. Reine Produkt-/Formatkennungen sind nicht personenbezogen.

Logging darf keine E-Mail, Token, Geräte-Proofs, Verifikations-/Recovery-Codes, Checkout-URLs, vollständigen IP-Verlauf oder Requestkörper enthalten. Datenschutzinformation, Rechtsgrundlagen, Auskunft, Löschung und Auftragsverarbeitung sind vor Produktivbetrieb separat freizugeben.

## 13. Infrastrukturvertrag

Der spätere Dienst:

- läuft getrennt unter `license.frecka.app`, nicht im App-/Beta-Service-Worker-Scope;
- verwendet ausschließlich HTTPS und eine eigene, versionierte Runtime;
- hält Datenbank, Schreibdaten, Schlüssel und Backups außerhalb statischer Webroots und Git;
- trennt Beta und Produktion mindestens durch Konfiguration, Datenbank und Schlüssel;
- verwendet minimale Dienstkonten und Rechte, Rate Limits und requestbezogenes Audit;
- verschlüsselt Serverbackups und testet Restore;
- protokolliert weder Geschäftsdaten noch Token-/Identity-Secrets;
- überwacht Verfügbarkeit, Fehlerraten, Signatur-/Webhookfehler, Schlüsselablauf, Datenbank und Backup ohne Nutzungsanalyse;
- dokumentiert Signing-Key-Erzeugung, Zugriff, Rotation, Sperrung und Notfallwechsel;
- wird erst nach der vorgeschriebenen DSM-/Runtime-Kompatibilitätsprüfung für bestehende Coaching-/Event-Dienste öffentlich bereitgestellt;
- benötigt vor Produktion Datenschutz-/Löschkonzept, Incident-Prozess und Verantwortlichkeiten.

LICENSE-004 installiert keinen Server, legt keine Ordner an und erzeugt keine Secrets.

## 14. Folgeblöcke

1. **LICENSE-005 – Lokales Runtime- und Tokenmodell:** Schema 5→6, portable Referenz v2, Runtime-Store, Web-Crypto-Key, JWS-/Zeitprüfung und historische v1-Migration; noch keine öffentliche Aktivierung.
2. **LICENSE-006 – Lizenzdienst-Grundgerüst:** getrennte Runtime, Datenbankschema, Fehlerformat, Idempotenz, Nonces, Keyset und rein lokale Servertests.
3. **LICENSE-007 – Identity und Trial-Aktivierung:** E-Mail-Verifikation, Trialstart, Recovery-Nachweis und serverseitige Trialhistorie.
4. **LICENSE-008 – Validierung und zentraler Clientmodus:** Revalidierung, 24/72- und 30/180-Zeitlogik, zentraler Schreibguard sowie Read-only-/Activation-Required-UX.
5. **LICENSE-009 – Backup-/Restore-/Exportmigration:** Runtime-Ausschluss, portable Referenz, Altbackup-Kompatibilität und Eigene-Daten-Projektion.
6. **LICENSE-010 – Gerätewechsel und Recovery:** regulärer Transfer, Notfallübernahme, Cooldowns und reale Zwei-Geräte-/Offline-Tests.
7. **LICENSE-011 – Kaufaktivierung und Payment-Adapter:** providerneutrale Checkout-Referenz, signierter idempotenter Webhook, Refund/Chargeback und administrative Korrektur.
8. **LICENSE-012 – Entitlements und Modulgrenze:** Modulmanifest, Lazy Loading, Modulcache, Kern-API-Grenzen und Datenhoheit.
9. **LICENSE-013 – Security, Datenschutz und Produktionsfreigabe:** Threat-/Replay-/Rate-Limit-Tests, Key Rotation, Retention/Löschung, Monitoring, Backup/Restore und Synology-Kompatibilitätsfreigabe.

## 15. Verbleibende Gates

Für LICENSE-005 bestehen keine fachlichen Produktblocker. Vor öffentlichem Lizenzdienst beziehungsweise Produktivbetrieb bleiben jedoch zwingend:

1. Datenschutz-/Rechtsgrundlagenprüfung der E-Mail-, Trial- und Aufbewahrungsregeln;
2. konkrete Serverruntime und Datenbanktechnologie;
3. Signing-Key-Betrieb einschließlich Issuer-/Keyset-Vertrauensbasis und Notfallrotation;
4. Paymentprovider, technische Preiskennung und Webhookvertrag;
5. Supportverantwortung für Recovery, Betrug und administrative Korrekturen;
6. DSM-/Runtime-Kompatibilitätsprüfung, Serverbackup, Monitoring und Incident Response;
7. reale Browser-/iPhone-Tests für nicht exportierbare CryptoKeys, Cacheverlust, Uhränderung und 180-Tage-Grenze.

Diese Gates blockieren keine lokale Implementierung von LICENSE-005, wohl aber öffentliche API, Payment und Produktivfreigabe.

## 16. Normative Grundlagen

- [RFC 7515 – JSON Web Signature](https://www.rfc-editor.org/rfc/rfc7515)
- [RFC 7638 – JSON Web Key Thumbprint](https://www.rfc-editor.org/rfc/rfc7638)
- [RFC 7800 – Proof-of-Possession Key Semantics](https://www.rfc-editor.org/rfc/rfc7800)
- [RFC 8725 – JWT Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725)
- [RFC 9449 – Demonstrating Proof of Possession](https://www.rfc-editor.org/rfc/rfc9449)
- [RFC 9457 – Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [W3C Web Cryptography API Level 2](https://www.w3.org/TR/webcrypto-2/)
- [DSGVO Artikel 5 – Datenminimierung und Speicherbegrenzung](https://eur-lex.europa.eu/eli/reg/2016/679/art_5/oj)
