# Lizenzarchitektur V1.0

**Aktueller Implementierungsstand:** LICENSE-001/002, ausschließlich lokale Vorbereitung und Anzeige

**Verbindliches Zielmodell:** LICENSE-003/004, noch nicht implementiert

**Grundsatzentscheidungen:** ADR-0004 und angenommene ADR-0005

**Normativer Vertrag:** [LICENSE-004: Trial-, Lizenz- und Entitlement-Vertrag](licensing-contract.md)

## 1. Dokumentgrenze

Dieses Dokument beschreibt Produkt- und Architekturmodell. Feldschemas, Constraints, JWS-Claims, Zeitberechnung, API-Routen, Aufbewahrung und Folgeblöcke stehen ausschließlich im normativen LICENSE-004-Vertrag. Es gibt keine zweite Lizenzstruktur.

LICENSE-004 verändert keinen Produktcode, keine Persistenz, kein Backup, keinen Export und keine Nutzungsentscheidung der aktuellen App. Lizenzdienst, Aktivierung, Payment und Entitlements folgen in getrennten Blöcken.

## 2. Heutiger Stand LICENSE-001/002

Heute existiert genau ein lokales Objekt im mandantenbezogenen Settings-Datensatz:

```text
license
├── formatVersion
├── licenseId
├── tenantId
├── deviceId
├── activatedAt
└── lastValidation
```

`licenseId` und `deviceId` werden lokal zufällig und ohne personenbezogene oder geräteabgeleitete Merkmale erzeugt. `activatedAt` bezeichnet nur die Anlage des Platzhalters, `lastValidation` nur dessen lokale Strukturprüfung. Sie sind weder Zahlungsnachweis noch Serveraktivierung.

Das Objekt wird mit dem Settings-Store persistiert, über die zentrale Tenant-Snapshot-API gesichert und atomar wiederhergestellt. „Eigene Daten“ enthält es, der Steuerberaterexport nicht. `Einstellungen → Lizenz & Gerät` zeigt es ausschließlich lesbar an.

Dieser Stand ist keine Lizenzautorität und löst keinen Schreibschutz aus. Er kann Trial, Kauf, Geräteberechtigung oder Entitlements nicht beweisen.

## 3. Verbindliches Produktmodell

- Eine Lizenz gehört zu einem Mandanten beziehungsweise einer Filiale und erlaubt genau ein aktives Gerät.
- Der vollständige Trial dauert 14 Tage ab erfolgreicher Serveraktivierung.
- Trial-Revalidierung erfolgt regulär nach 24 Stunden; die harte Offline-Grenze beträgt 72 Stunden und endet spätestens mit dem Trial.
- `frecka.core.v1` kostet einmalig 59 Euro. V1-Updates und Fehlerkorrekturen sind enthalten; monatliche Kernproduktkosten gibt es nicht.
- Gekaufte Lizenzen revalidieren regulär nach 30 Tagen und bleiben nach der letzten erfolgreichen Prüfung höchstens 180 Tage produktiv offline.
- Ablauf führt zu Read-only und niemals zu Datenlöschung.
- Eine verifizierte E-Mail ist verbindlicher Trial-, Kauf- und Recovery-Anker, aber kein Geschäftsdatum und kein Tokenclaim.
- Das begrenzte Parallelrisiko eines absichtlich offline gehaltenen Altgeräts wird bis zum Ablauf seines alten Tokens akzeptiert.
- V1 berechtigt nicht automatisch zu V2.
- ZusatzTools gelten dauerhaft für ihre gekaufte Hauptversion. Entzug ist nur bei Rückabwicklung, Betrug/Sicherheitsfall oder dokumentierter administrativer Korrektur zulässig und löscht keine Daten.

## 4. Architektur

```text
Payment-Anbieter
      │ signierter, idempotenter Webhook
      ▼
Lizenzdienst ── signierte Gerätebescheinigung ──► FRECKA-PWA
      │                                            │
      │ nur Lizenzmetadaten                        │ Geschäftsdaten
      ▼                                            ▼
Lizenzdatenbank                          lokale IndexedDB
```

Der Lizenzdienst ist Autorität für Trialbeginn, Status, aktive Gerätebindung, Hauptversion und Entitlements. Die PWA prüft einen zeitlich begrenzten JWS-Nachweis lokal. Signatur- und administrative Schlüssel bleiben serverseitig. Der Dienst erhält keine Belege, Kunden, Umsätze, Gutscheine, Kataloge, Backups oder Dokumente.

## 5. Status und Clientmodi

Persistierte Serverstatus sind ausschließlich:

- `trial`;
- `active`;
- `revoked`.

`trial_expired` ist aus Trialende und Serverzeit abgeleitet. `device_transfer_pending` ist ein Workflowzustand.

Clientmodi:

- `productive`: JWS, Mandant, Gerät, Schlüssel, Bindungsversion, Produkt, Entitlements und Zeit sind gültig;
- `read_only`: bekannte Lizenz, aber Trial/Offline-Grenze abgelaufen oder Berechtigung entzogen;
- `activation_required`: keine verwertbare Runtime-Bindung oder Online-Aktivierung/Recovery notwendig.

In Read-only und Activation-required bleiben Öffnen, Lesen, Backup, Export, bestehende Dokumentausgabe, Diagnose, Update, Kauf, Aktivierung und kontrollierter Restore erreichbar. Neue Belege, Gutscheine, Einlösungen, Stornos, Gutschriften sowie fachliche Änderungen an Kunden, Katalog und Unternehmensdaten sind gesperrt.

Restore ist eine Datenrettungsausnahme. Er importiert keine Gerätefreigabe, schaltet produktive Nutzung nicht frei und verändert den Clientmodus nicht selbstständig. Der spätere Schreibschutz wird als zentraler, fail-closed Kommandoguard umgesetzt und nicht pro Seite dupliziert.

## 6. Serverseitiges Minimalmodell

Der versionierte Serververtrag enthält:

- Identity mit opaker ID, geschützter verifizierter E-Mail und Recoveryzustand;
- Lizenz mit pseudonymem Tenant, Produkt/Hauptversion, Status, Trial-/Aktivierungszeiten, aktueller Gerätebindung und steigender `bindingVersion`;
- Gerätebindung mit öffentlichem P-256-Schlüssel, Fingerabdruck, Bindungs- und Deaktivierungszeitpunkten;
- Entitlements mit stabiler ID, Tool-Hauptversion, Status und opaker Kauf-/Korrekturreferenz;
- kurzlebige Transfer-, Recovery-, Nonce- und Idempotenzdatensätze;
- minimale Trial-, Kauf- und Sicherheitsauditereignisse ohne Nutzungsanalyse.

Ein Identity-Inhaber kann mehrere gekaufte Filiallizenzen besitzen. Der Trial derselben Hauptversion bleibt jedoch pro Identity, Tenant und wiedererkennbarem Schlüssel einmalig. Genau eine aktive Bindung pro Lizenz wird transaktional erzwungen.

## 7. Geplantes Clientmodell

`settings.license` wird in einem späteren Migrationsblock zur portablen, nicht autoritativen Formatversion 2:

```text
settings.license v2
├── formatVersion
├── localTenantId
├── licenseId
├── serverTenantId
├── productId / majorVersion
└── linkedAt
```

Gerätegebundene Laufzeitdaten liegen in einem eigenen `licenseRuntime`-Store:

```text
licenseRuntime v1
├── deviceId / nicht exportierbarer CryptoKey
├── signedLicenseToken / tokenVersion / keyId
├── lastServerValidationAt
├── trustedServerTimeAnchor / maxObservedLocalTime
├── nextValidationAt / offlineValidUntil
├── bindingVersion
└── cachedEntitlements
```

Der Store ist zwingend vom Tenant-Snapshot, Backup, Restore und Export ausgeschlossen. Seine Einführung erfordert geplant das IndexedDB-Schema 5→6. Der private Schlüssel wird als nicht exportierbarer Web-Crypto-`CryptoKey` gespeichert.

Alte LICENSE-001-IDs sind nur Migrationshinweise. Auf einer neuen Installation oder nach Verlust des Runtime-Stores führt eine portable Referenz immer zu `activation_required`; es wird kein Trial aus lokaler Zeit oder Settings rekonstruiert.

## 8. JWS und Offlinezeit

Tokenversion 1 verwendet kompakte JWS mit `ES256`, festem Typ, `kid` und strikter Claim-Whitelist. Gebunden werden mindestens Aussteller, Empfänger, Lizenz, pseudonymer Tenant, Gerät, Public-Key-Fingerabdruck, Bindungsversion, Status, Produkt/Hauptversion, aktive Entitlements, Trialende, Ausstellungszeit, nächste Revalidierung und harte Offline-Grenze.

Der Geräteschlüssel signiert noncegebundene Besitznachweise über Ziel, Methode, Request, Tokenhash und Bindungsversion. Kopierte IDs oder Token allein genügen nicht. E-Mail, Kaufpreis, Geschäfts- und Kundendaten sind im Token verboten.

Zeitmodell:

| Berechtigung | Revalidierungsziel | harte Offline-Grenze |
|---|---:|---:|
| Trial | 24 Stunden | 72 Stunden, niemals über `trialEndsAt` |
| Core V1 gekauft | 30 Tage | 180 Tage |

Signierte Serverzeit, höchster beobachteter lokaler Zeitpunkt und `performance.now()` innerhalb der Sitzung bilden den Zeitanker. Rückgestellte oder widersprüchliche Uhr sowie gelöschter Runtime-Cache verlangen eine Onlineprüfung. Vorwärtsstellen kann nur früher sperren. Serverausfall lässt den letzten gültigen Nachweis bis zu dessen eigener Grenze bestehen; danach gilt Read-only.

Eine PWA kann manipulierten Clientcode, XSS oder vollständige Profilkopien nicht beweisbar verhindern. FRECKA verspricht deshalb verhältnismäßigen Schutz, nicht absolute Hardwareattestierung.

## 9. API-, Payment- und Gerätewechselgrenze

Der minimale Vertrag bündelt Status und Entitlement-Refresh in einer Validierungsroute. Öffentliche Verträge umfassen Identity-Verifikation, Trialstart, Validierung, Kauf-Session, regulären Transfer, Transferabschluss, Notfall-Recovery und öffentliche Prüfschlüssel. Eine öffentliche Aktivierungsroute entfällt: Der validierte Provider-Webhook aktiviert dieselbe Trial-Lizenz, der Client revalidiert anschließend.

Alle zustandsändernden Requests sind idempotent. Gerätegebundene Requests benötigen einmalige Nonce, kurzlebigen signierten Geräte-Proof und Replayprüfung. Mehrteilige Änderungen von Status, Gerät, Entitlement und Audit sind atomar.

Regulärer Wechsel deaktiviert das Altgerät erst beim erfolgreichen Abschluss auf dem Neugerät. Notfall-Recovery verlangt verifizierte E-Mail, neuen Geräteschlüssel und Recovery- oder Supportnachweis. Bindungsversion und aktives Gerät wechseln atomar. Geschäftsdaten werden danach ausschließlich per Nutzer-Backup wiederhergestellt.

Payment verarbeitet keine Kartendaten in FRECKA. Providerereignisse werden signiert geprüft, dedupliziert und gegen Lizenz, Produkt, serverseitigen Preis und Währung validiert. Refund, Chargeback und administrative Korrektur sind begründet, auditiert und idempotent.

## 10. Trial-Missbrauchsschutz

Der Schutz kombiniert verifizierte E-Mail, serverseitige Trialhistorie, pseudonymen Tenant, Geräteschlüssel, Bindungsversion, Serverzeit, Rate Limits und Recoveryregeln. Hardware- und aggressives Browser-Fingerprinting sind ausgeschlossen.

- gleiche E-Mail oder zurückgesetztes Gerät erhält nur den vorhandenen Trial mit unverändertem Ende;
- derselbe noch vorhandene Geräteschlüssel kann keinen zweiten V1-Trial beanspruchen;
- gelöschte Browserdaten starten lokal keinen neuen Trial;
- neue E-Mail zusammen mit vollständig neuem Browser-/Schlüsselprofil ist ohne Fingerprinting nicht zuverlässig als dieselbe Person erkennbar.

Dieses letzte Restrisiko wird ausdrücklich benannt und gegenüber versteckter Geräteprofilbildung akzeptiert.

## 11. Entitlements und Module

Verbindliche IDs sind `frecka.core.v1` sowie als Architekturbeispiele `frecka.crm.v1` und `frecka.calendar.v1`. Ein releasegebundenes Modulmanifest definiert Entitlement, Tool-Hauptversion, kompatible Core-Version, Entry-Point und Assetintegrität.

Nicht erworbene Module werden nicht geladen und nicht in den Core-App-Shell-Precache aufgenommen. Erste Offlinenutzung ist erst nach einem vollständig berechtigten und integritätsgeprüften Online-Download möglich. Module verwenden versionierte Kern-APIs statt direkter Storezugriffe. Entzug sperrt neue Modulaktionen, löscht aber keine Daten.

## 12. Datenschutz, Betrieb und Migration

E-Mail, Identity-/Lizenz-/Tenant-/Gerätekennung, Key-Fingerabdruck, Kaufreferenz und zuordenbare Securitymetadaten sind personenbezogen beziehungsweise pseudonym personenbezogen. Logging darf keine E-Mail, Token, Codes, Checkout-URLs oder Requestkörper enthalten.

Der normative Vertrag legt konkrete technische Aufbewahrungswerte zwischen 5 Minuten für Nonces, 24 Stunden für Idempotenz, 90/180 Tagen für Audit und 210 Tagen für deaktivierte Gerätebindungen fest. Trialhistorie wird 24 Monate aufbewahrt; Lizenz-/Kaufreferenzen nur für Berechtigungs- und Nachweiszwecke. Rechtsgrundlagen und gesetzlich erforderliche Abweichungen sind vor Produktivbetrieb zu prüfen.

Der spätere Dienst läuft getrennt unter `license.frecka.app` mit HTTPS, eigener Datenbank, minimalen Rechten, datensparsamen Logs, Rate Limits, Key Management, verschlüsseltem Serverbackup und Monitoring. Secrets, Datenbank und Backups liegen außerhalb von Webroot und Git. Vor öffentlichem Betrieb bleibt die DSM-/Runtime-Kompatibilitätsprüfung Pflicht.

## 13. Folgeblöcke

1. LICENSE-005 – lokales Runtime-/Tokenmodell und Schema 5→6;
2. LICENSE-006 – Lizenzdienst-Grundgerüst;
3. LICENSE-007 – Identity und Trial-Aktivierung;
4. LICENSE-008 – Revalidierung und zentraler Clientmodus;
5. LICENSE-009 – Backup-/Restore-/Exportmigration;
6. LICENSE-010 – Gerätewechsel und Recovery;
7. LICENSE-011 – Kaufaktivierung und Payment-Adapter;
8. LICENSE-012 – Entitlements und Modulgrenze;
9. LICENSE-013 – Security, Datenschutz und Produktionsfreigabe.

## 14. Bewertung

**GO für LICENSE-005.** Produktparameter, Status, Daten-, Token-, Offline-, API-, Gerätewechsel-, Payment- und Entitlementgrenzen sind verbindlich.

**NO-GO für öffentliche API, Payment oder Produktivbetrieb.** Vorher fehlen weiterhin konkrete Serverruntime, Datenschutz-/Rechtsprüfung, Key-Betrieb, Paymentprovider, Supportprozess, DSM-Kompatibilität, Monitoring, Serverbackup, Incident Response und reale Zielgerätetests.

Der heutige App-Stand bleibt unverändert: LICENSE-001/002 ist lokal funktionsfähig, aber ohne Trial-, Kauf- oder Nutzungsautorität.

## 15. Technische Grundlagen

- [RFC 7515 – JSON Web Signature](https://www.rfc-editor.org/rfc/rfc7515)
- [RFC 7638 – JSON Web Key Thumbprint](https://www.rfc-editor.org/rfc/rfc7638)
- [RFC 7800 – Proof-of-Possession Key Semantics](https://www.rfc-editor.org/rfc/rfc7800)
- [RFC 8725 – JWT Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725)
- [RFC 9449 – Demonstrating Proof of Possession](https://www.rfc-editor.org/rfc/rfc9449)
- [RFC 9457 – Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [W3C Web Cryptography API Level 2](https://www.w3.org/TR/webcrypto-2/)
- [DSGVO Artikel 5 – Datenminimierung und Speicherbegrenzung](https://eur-lex.europa.eu/eli/reg/2016/679/art_5/oj)
