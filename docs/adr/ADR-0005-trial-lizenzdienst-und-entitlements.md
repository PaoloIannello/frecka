# ADR-0005: Trial-, Lizenzdienst- und Entitlement-Architektur

## Status

Angenommen am 26. August 2026. LICENSE-004 hat Trial, Kaufmodell, E-Mail-Recovery, Offline-Grenzen, Altgeräte-Risiko, Hauptversionsgrenze und Entitlement-Lebensdauer verbindlich entschieden. Der normative Feld-, Token-, Zeit- und API-Vertrag steht in `docs/licensing-contract.md`.

## Kontext

ADR-0004 legt für FRECKA V1.0 genau eine Lizenz pro Mandant beziehungsweise Filiale und genau ein gleichzeitig aktives Gerät fest. LICENSE-001 und LICENSE-002 stellen dazu bislang ausschließlich ein lokales, nicht autoritatives Platzhaltermodell und dessen Anzeige bereit. Es gibt weder Onlineaktivierung noch serverseitige Lizenzprüfung oder Nutzungssperre.

FRECKA soll eine 14-tägige vollständige Testphase und anschließend eine einmalig gekaufte Berechtigung für die aktuelle Hauptversion erhalten. Geschäftsdaten bleiben lokal. Der Lizenzdienst darf weder Belege noch Kunden-, Umsatz-, Katalog- oder Sicherungsdaten erhalten. Die PWA muss nach einer erfolgreichen Prüfung zeitlich begrenzt offline arbeiten können, ohne eine rein lokale und durch Neuinstallation oder Uhrmanipulation beliebig verlängerbare Testphase zu schaffen.

Eine Web-PWA kann lokal veränderten Anwendungscode, ein kompromittiertes Browserprofil oder die kontrollierte Kopie eines gesamten Profils nicht absolut verhindern. Das Ziel ist deshalb ein verhältnismäßiger Missbrauchsschutz und keine unrealistische Manipulationssicherheit.

## Entscheidung

### 1. Autorität und Zuständigkeiten

- Der getrennte Lizenzdienst ist alleinige Autorität für Trialbeginn, Lizenzstatus, aktive Gerätebindung, Hauptversionsberechtigung und Zusatz-Entitlements.
- Der Client speichert nur eine kryptografisch prüfbare, zeitlich begrenzte Lizenzbescheinigung und einen lokalen Statuscache. Weder IndexedDB noch lokale Uhr oder vorhandene LICENSE-001-Felder sind Autorität.
- Signaturschlüssel und administrative Geheimnisse bleiben ausschließlich im Lizenzdienst. Die PWA enthält nur öffentliche Prüfschlüssel mit Schlüsselkennung und überlappender Rotation.
- Der Lizenzdienst erhält keine FRECKA-Geschäftsdaten. Payment, Lizenzdienst und PWA bleiben getrennte Vertrauensbereiche.
- Die lokale Datenlesbarkeit sowie Backup und Export bleiben auch ohne produktive Lizenz erhalten. Eine fehlende Berechtigung löscht oder verändert keine Geschäftsdaten.

### 2. Kleinstes Statusmodell

Der serverseitige Lizenzstatus besitzt nur:

- `trial`: aktivierte, noch nicht gekaufte Testlizenz;
- `active`: gekaufte Lizenz für die berechtigte Hauptversion;
- `revoked`: administrativ oder sicherheitsbedingt entzogen.

`trial_expired` ist kein gespeicherter Status, sondern wird aus `trial` und dem signierten `trialEndsAt` abgeleitet. `device_transfer_pending` gehört zu einem zeitlich begrenzten Übertragungsvorgang und nicht zum Lizenzstatus. Damit werden dauerhafter Lizenzzustand und kurzlebiger Workflow nicht vermischt.

Der Client leitet daraus einen separaten Zugriffsmodus ab:

- `productive`: produktive Schreibvorgänge sind erlaubt;
- `read_only`: vorhandene Geschäftsdaten dürfen gelesen, gesichert und exportiert, aber nicht produktiv verändert werden;
- `activation_required`: der Lizenzdienst muss zur Aktivierung, Revalidierung oder Geräteübernahme erreicht werden.

Produktive Nutzung ist nur zulässig, wenn Signatur, Aussteller, Empfänger, Produkt, Hauptversion, Mandant, Gerätebindung, Entitlements und zeitliche Grenzen der letzten Bescheinigung gültig sind.

### 3. Lizenzbescheinigung und Gerätebindung

Der Lizenzdienst stellt eine kompakte, signierte JWS-Bescheinigung mit fest vorgegebenem Algorithmus aus. Für die erste Umsetzung wird ECDSA P-256 (`ES256`) vorgesehen. Die geprüfte Claim-Whitelist umfasst mindestens:

- expliziten Typ, Aussteller, Empfänger, Produkt und Hauptversion;
- Lizenzbescheinigungs- beziehungsweise Protokollversion;
- `licenseId` und pseudonyme serverseitige `tenantId`;
- `deviceId`, Schlüssel-Fingerabdruck und `bindingVersion`;
- Lizenzstatus sowie Trialbeginn und Trialende, soweit zutreffend;
- aktive Entitlement-IDs;
- Ausstellungszeit, Zeitpunkt der nächsten Revalidierung, äußerste Offline-Grenze und eindeutige Bescheinigungs-ID.

Unbekannte kritische Felder, unerwartete Algorithmen, falscher Aussteller oder Empfänger und eine unpassende Geräte- oder Mandantenbindung führen nicht zu produktiver Freigabe.

Das Gerät erzeugt mit Web Crypto ein nicht exportierbares ECDSA-P-256-Schlüsselpaar. Der private Schlüssel liegt als `CryptoKey` in einem eigenen lokalen Runtime-Speicher und ist weder Teil von Backup noch Restore oder Export. Der Dienst speichert nur öffentlichen Schlüssel beziehungsweise Fingerabdruck. Aktivierung, Revalidierung und Übertragung verwenden jeweils eine kurzlebige, einmalige Server-Nonce und einen signierten Gerätebeweis, der Nonce, Anfrageziel, HTTP-Methode, Bescheinigungsbezug und Bindungsversion umfasst. Nonces und Bescheinigungs-IDs werden serverseitig gegen Replay geprüft.

Diese Bindung ist ein verhältnismäßiger Besitznachweis, keine Hardwareattestierung. Ein vollständig kompromittierter Client bleibt außerhalb der Schutzgarantie.

### 4. Trial, Ablauf und Kauf

- Die 14 Tage beginnen ausschließlich nach einer ausdrücklich angeforderten, erfolgreichen Erstaktivierung und mit Serverzeit. Installation, Download oder bloßes Öffnen einer statischen Seite starten den Trial nicht.
- Während eines gültigen Trials ist der vollständige Kernumfang der berechtigten Hauptversion verfügbar.
- Nach `trialEndsAt` wechselt der Client in `read_only`. Kauf/Aktivierung, sinnvolle Einsicht, Backup, Export, Dokumentausgabe und Update bleiben erreichbar. Produktive Neuerfassung und Bearbeitung werden zentral gesperrt.
- Restore bleibt als Datenrettungsweg zulässig, schaltet aber keine produktive Nutzung frei. Restore darf weder privaten Geräteschlüssel noch Bescheinigung oder Gerätebindung aus einer Sicherung übernehmen.
- Der Kauf für 59 Euro aktiviert dieselbe `licenseId` und dieselbe Installation für das Kernprodukt der aktuellen Hauptversion. Trial-Daten bleiben unverändert erhalten.
- Fehlerkorrekturen und Updates innerhalb dieser Hauptversion sind enthalten. Die Behandlung späterer Hauptversionen ist eine eigene Produktentscheidung.

### 5. Offline- und Revalidierungsmodell

Die Bescheinigung enthält sowohl einen gewünschten Revalidierungszeitpunkt als auch eine harte, signierte Offline-Grenze. LICENSE-004 legt verbindlich fest:

| Modus | Revalidierung | Harte Offline-Grenze |
|---|---:|---:|
| Trial | spätestens nach 24 Stunden | frühestens aus Trialende und 72 Stunden nach letzter erfolgreicher Serverprüfung |
| Gekauft | spätestens nach 30 Tagen | 180 Tage nach letzter erfolgreicher Serverprüfung |

Eine reine Netzwerkstörung oder ein Serverfehler nach dem Revalidierungszeitpunkt lässt produktive Nutzung bis zur signierten Offline-Grenze zu. Der Client warnt rechtzeitig. Nach der Grenze ist nur `read_only` zulässig. Eine Trial-Bescheinigung kann niemals über `trialEndsAt` hinaus gelten.

Ein signierter serverseitiger Status `revoked`, eine fremde Gerätebindung oder eine höhere `bindingVersion` beendet die produktive Freigabe nach erfolgreicher Onlineprüfung sofort. Eine ungültig signierte oder technisch fehlerhafte Serverantwort ersetzt die letzte gültige Bescheinigung nicht; diese gilt höchstens bis zu ihrer bisherigen Offline-Grenze.

Die lokale Uhr wird nicht als Autorität verwendet. Der Client merkt sich signierte Serverzeit und den höchsten beobachteten Zeitpunkt. Ein relevanter Rücksprung der Uhr, ein fehlender Lizenzcache oder widersprüchliche Zeitanker erfordern eine Onlineprüfung, bevor erneut produktiv geschrieben werden darf. Ein Vorwärtssprung kann lokal nur zu einer früheren Sperre führen und wird durch eine erfolgreiche Serverprüfung korrigiert.

### 6. Gerätewechsel

Ein regulärer Wechsel erfolgt in dieser Reihenfolge:

1. Nutzer erstellt ein verschlüsseltes Backup der Geschäftsdaten;
2. Altgerät bestätigt online die Deaktivierung;
3. der Lizenzdienst beendet die alte Bindung atomar, erhöht `bindingVersion` und aktiviert genau eine neue Gerätebindung;
4. das Neugerät erhält eine neue Bescheinigung und stellt die Geschäftsdaten aus dem Nutzer-Backup wieder her.

Bei Verlust oder Defekt ist eine kontrollierte Notfallübernahme nach erneuter Identitäts- beziehungsweise Kaufprüfung möglich. Sie erhöht ebenfalls `bindingVersion`, begrenzt Wiederholungen und protokolliert nur sicherheitsnotwendige Metadaten.

Ein absichtlich offline gehaltenes Altgerät kann seine zuvor signierte Bescheinigung technisch bis zu deren Offline-Grenze verwenden. Absolute sofortige Ein-Gerät-Gleichzeitigkeit und längere Offline-Fähigkeit sind bei einer PWA nicht gleichzeitig erzwingbar. LICENSE-004 akzeptiert dieses begrenzte Restrisiko ausdrücklich; die Notfallübernahme erhöht dennoch sofort die serverseitige Bindungsversion und stellt dem Neugerät allein neue Bescheinigungen aus.

### 7. Payment-Grenze

- Die PWA fordert beim Lizenzdienst eine Checkout-Referenz für `licenseId`, Produkt, Hauptversion und einen Idempotenzschlüssel an.
- Ein austauschbarer Payment-Adapter übersetzt ausschließlich zwischen Zahlungsanbieter und Lizenzdienst.
- Der Lizenzdienst validiert signierte Webhooks, dedupliziert Provider-Ereignisse und prüft Produkt, Betrag und Währung, bevor er `trial` atomar zu `active` ändert.
- Ein wiederholter Webhook hat denselben Effekt wie der erste und erzeugt weder eine zweite Lizenz noch einen neuen Trial.
- Der Webhook verändert niemals IndexedDB- oder Geschäftsdaten. Der Client erhält den neuen Status erst durch Revalidierung und eine neue signierte Bescheinigung.

### 8. Entitlements und optionale Module

Das Kernprodukt bleibt vollständig und verwendet das Entitlement `frecka.core.v1`. Spätere ZusatzTools erhalten stabile, kleingeschriebene IDs wie `frecka.crm.v1` oder `frecka.calendar.v1`. Ein serverseitiges Entitlement umfasst Lizenzbezug, Produkt-/Kompatibilitätsversion, Status, Quelle, Erwerbs- und gegebenenfalls Entzugszeit. In LICENSE-004 gibt es keine reguläre zeitliche Befristung eines gekauften Tool-Entitlements derselben Hauptversion.

Nur aktive Entitlements werden in die signierte Bescheinigung aufgenommen. Ein releasegebundenes Feature-Manifest ordnet Entitlement-ID, Modulversion, kompatible Kernversion und auszuliefernde Dateien zu. Optionale Bundles gehören nicht zum Kern-App-Shell-Precache und werden erst nach erfolgreicher Berechtigungsprüfung geladen. Bereits korrekt geladene Module dürfen innerhalb der gültigen Offline-Grenze arbeiten.

Die UI-Prüfung ist keine Sicherheitsgrenze für spätere serverseitige Modulfunktionen; jeder Modulserver prüft Entitlements erneut. Entzug verhindert weitere produktive Modulnutzung, löscht aber keine lokal erzeugten Moduldaten. Lesen, Exportieren und kontrolliertes Löschen der eigenen Daten bleiben möglich.

### 9. Datenschutz und minimale Serverdaten

Der Lizenzdienst speichert nur:

- Lizenz-ID, pseudonyme Mandantenreferenz, Produkt und Hauptversion;
- getrennte `identityId` und verifizierte Recovery-/Kauf-E-Mail;
- Trialbeginn, Trialende, Status und serverseitige Änderungszeitpunkte;
- genau eine aktive Geräte-ID, öffentlichen Geräteschlüssel/Fingerabdruck und Bindungsversion;
- minimal notwendige Historie von Aktivierung, Deaktivierung und Übertragung;
- Entitlements;
- Payment-Provider- und Ereignisreferenzen zur Idempotenz, nicht die Geschäftsdaten des Kaufs;
- kurzlebige Nonces, Rate-Limit-Zähler und minimale Sicherheitsauditereignisse.

Belege, Gutscheine, Kunden, Umsätze, Kataloge, Backups, Dokumente und allgemeine Nutzungstelemetrie sind ausgeschlossen. IP-Adressen oder Browsermerkmale werden nicht zu einem dauerhaften Fingerprint zusammengeführt.

Für einen wirksamen Schutz gegen wiederholte Trial-Neuanmeldungen nach Neuinstallation reicht eine rein lokale pseudonyme Kennung nicht aus. LICENSE-004 legt deshalb eine verifizierte E-Mail-Adresse für Trialaktivierung, Kaufzuordnung und Wiederherstellung fest. Sie ist personenbezogen, bleibt getrennt von Geschäftsdaten und darf nicht in der Lizenzbescheinigung stehen. Der Dienst verwendet intern eine opake `identityId`; die normalisierte Adresse wird zugriffsgeschützt gespeichert, ein suchbarer Ableitungswert nur mit serverseitigem Geheimnis gebildet. Zweck, Rechtsgrundlage, Lösch- und Aufbewahrungsfristen sowie der Supportweg müssen vor Produktivbetrieb datenschutzrechtlich geprüft werden.

Als datensparsamer Ausgangspunkt gelten: Nonces werden unmittelbar nach Verwendung oder spätestens nach kurzer technischer Gültigkeit gelöscht, Rate-Limit-Zähler spätestens nach 24 Stunden und normale Sicherheitsauditereignisse nach 90 Tagen. Wegen der verbindlichen 180-Tage-Offline-Grenze werden deaktivierte Geräte- und abgeschlossene Transferdaten höchstens 210 Tage gegen Replay und Supportfälle vorgehalten und danach auf das zwingende Minimum reduziert. E-Mail und Lizenzreferenz bestehen nur so lange fort, wie Lizenz-, Recovery- oder gesetzliche Nachweispflichten dies erfordern; bei einer berechtigten Löschung werden sie gelöscht oder unumkehrbar entkoppelt. Abweichende gesetzliche Aufbewahrungspflichten für Zahlungsunterlagen sind getrennt zu dokumentieren und rechtfertigen keine längere Speicherung von Geräte- oder Nutzungsdaten.

### 10. Migration von LICENSE-001/002

Das historische `settings.license` der Formatversion 1 war ausschließlich lokaler Platzhalter und darf keinen Trial oder Kauf autorisieren. LICENSE-005 migriert es unter Erhalt der lokalen IDs in die nachfolgend beschriebene Trennung.

Die Zielmigration führt zwei getrennte Ebenen ein:

- eine portable Lizenzreferenz in `settings` mit neuer Formatversion, `localTenantId`, `licenseId`, serverseitiger `serverTenantId` und Produkt/Hauptversion;
- einen mandantenbezogenen lokalen Runtime-Speicher für privaten `CryptoKey`, signierte Bescheinigung, Zeitanker, Revalidierungsstatus und Gerätebindung.

LICENSE-005 setzt den Runtime-Speicher mit der versionierten IndexedDB-Migration 5→6 um; er ist ausdrücklich kein zweites Geschäftsmodell. Er ist von Tenant-Snapshot, Backup, Restore und Export ausgeschlossen. Das bisherige lokale `licenseId` und `deviceId` dienen nur als Migrationshinweis; erst eine spätere Serveraktivierung und Schlüsselbindung erzeugen Autorität.

Alte Backups bleiben lesbar. Restore übernimmt Geschäftsdaten und portable Lizenzreferenz, aber niemals Runtime-Schlüssel, Bescheinigung oder aktive Gerätefreigabe. Auf demselben Gerät bleibt die aktuelle Runtime-Bindung erhalten; auf einem neuen Gerät ist Aktivierung oder Übertragung erforderlich. Der Export „Eigene Daten“ darf nur eine nicht sensitive Lizenz- und Entitlement-Zusammenfassung enthalten, der Steuerberaterexport weiterhin keine Lizenzdaten.

## Folgen

- FRECKA bleibt nach periodischer Prüfung offline nutzbar, ohne eine unbegrenzt lokale Trial-Autorität einzuführen.
- Lizenzdienst, Payment und Zusatzmodule können unabhängig von Geschäftsdaten und statischer PWA entwickelt und betrieben werden.
- Ablauf oder Entzug einer Lizenz führt zu einem klaren Read-only-Modus statt Datenverlust.
- Für Lizenzformat, Runtime-Speicher, Backup-/Restore-Grenze und zentralen Schreibschutz sind spätere, getestete Migrationen notwendig.
- Die Serverinfrastruktur benötigt Signaturschlüsselverwaltung, Rotation, Monitoring, Sicherung und einen dokumentierten Wiederherstellungsprozess außerhalb statischer Webroots.
- Das Offline-Modell enthält bewusst ein begrenztes Restrisiko bei einem absichtlich offline gehaltenen Altgerät.

## Alternativen

### Rein lokale Trial-Prüfung

Verworfen, weil lokale Uhr, Speicherlöschung und Neuinstallation die Testphase ohne verhältnismäßige Gegenmaßnahme neu starten könnten.

### Onlineprüfung bei jeder produktiven Aktion

Verworfen, weil sie Offline-First und den realen Einsatz bei Netzstörungen aufheben würde.

### Dauerhaft gültiger lokaler Lizenzschlüssel

Verworfen für Trial und Gerätebindung, weil Entzug, Übertragung und genau ein aktives Gerät nicht kontrolliert durchsetzbar wären.

### Aggressives Browser- oder Hardware-Fingerprinting

Verworfen wegen Datenschutz, Instabilität und fehlender Verlässlichkeit in Browsern.

### Mehrere Tarifstufen des Kernprodukts

Verworfen für V1.0. Das Kernprodukt bleibt vollständig; nur spätere klar getrennte ZusatzTools erhalten eigene Entitlements.

## Bedrohungsmodell und Grenzen

| Bedrohung | Gegenmaßnahme | Verbleibende Grenze |
|---|---|---|
| lokale Uhr zurückgestellt | signierte Serverzeit, monotone lokale Zeitanker, Onlinepflicht bei Widerspruch | manipulierte Laufzeitumgebung ist nicht beweisbar vertrauenswürdig |
| IndexedDB/LocalStorage gelöscht | kein neuer Trial ohne serverseitige Identität und Aktivierung | legitime Neuinstallation benötigt Wiederherstellung/Support |
| lokaler Lizenzcache verändert | JWS-Prüfung und Claim-Whitelist | Clientcode selbst kann lokal verändert werden |
| Bescheinigung oder `deviceId` kopiert | nicht exportierbarer Geräteschlüssel, `cnf`, Nonce und Bindungsversion | vollständige Browserprofilkopie ist nicht absolut erkennbar |
| Replay einer Aktivierung | einmalige Nonce, kurze Gültigkeit, Anfragebindung und `jti`-Deduplizierung | Server muss Replay-Zustand zuverlässig speichern |
| mehrfacher Trial | verifizierte Identität, serverseitig verbrauchter Trial, Rate Limits | kein verstecktes Cross-Site-Fingerprinting; Supportfälle bleiben nötig |
| doppelter Payment-Webhook | Provider-Signatur, Ereignis-Deduplizierung und idempotente Zustandsänderung | Provider- und Schlüsselbetrieb bleiben betriebliche Verantwortung |
| Lizenzserver ausgefallen | letzte gültige Bescheinigung bis `offlineUntil` | nach Ablauf nur Read-only bis Serverrückkehr |
| Client lange offline | klare Warnung und harte signierte Offline-Grenze | produktive Daueroffline-Nutzung ist nicht vorgesehen |
| Alt- und Neugerät parallel | atomare Bindungsversion und kurze Bescheinigungen | Offline-Altgerät kann bis zur alten Grenze weiterarbeiten |
| Entitlement manipuliert | signierte Bescheinigung und releasegebundenes Manifest | Client-Gating schützt keinen fremden, manipulierten Client |

## Verbindlich aufgelöste Produktentscheidungen

1. verifizierte E-Mail für Trial, Kauf und Recovery;
2. Revalidierung/Offline-Grenze 24/72 Stunden im Trial und 30/180 Tage nach Kauf;
3. akzeptierte Offline-Restlaufzeit des verlorenen Altgeräts bis zum alten Tokenablauf;
4. V1-Kauf enthält keine automatische V2-Berechtigung;
5. ZusatzTool-Entitlements gelten dauerhaft für die gekaufte Tool-Hauptversion und werden nur bei Rückabwicklung, Betrug/Sicherheitsfall oder administrativer Korrektur entzogen;
6. Entzug löscht keine lokalen Daten.

Vor Produktivbetrieb bleiben ausschließlich betriebliche und rechtliche Gates: Datenschutz-/Aufbewahrungsprüfung, konkrete Serverruntime, Schlüsselbetrieb, Paymentprovider, Supportprozess, DSM-Kompatibilität, Monitoring, Serverbackup und Incident Response. Sie blockieren die lokale Umsetzung von LICENSE-005 nicht.

## Migrations- oder Rückweg

Bis zur Umsetzung bleibt LICENSE-001/002 unverändert lokal und ohne Nutzungsentscheidung. Die Einführung erfolgt in getrennten, versionierten Blöcken mit abwärtskompatibler Lesbarkeit alter Settings und Backups. Schlägt die Aktivierungsmigration fehl, bleiben lokale Geschäftsdaten lesbar und die Anwendung wechselt in `activation_required`; sie darf niemals Daten löschen oder einen ungesicherten Teilzustand als aktive Lizenz behandeln.

## Technische Referenzen

- [RFC 8725 – JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725)
- [RFC 7515 – JSON Web Signature](https://www.rfc-editor.org/rfc/rfc7515)
- [RFC 7800 – Proof-of-Possession Key Semantics for JWTs](https://www.rfc-editor.org/rfc/rfc7800)
- [RFC 9449 – Demonstrating Proof of Possession](https://www.rfc-editor.org/rfc/rfc9449)
- [W3C Web Cryptography API Level 2](https://www.w3.org/TR/webcrypto-2/)
- [DSGVO Artikel 5 – Datenminimierung und Speicherbegrenzung](https://eur-lex.europa.eu/eli/reg/2016/679/art_5/oj)
