# FRECKA Landingpage Deployment

## Zielarchitektur

Die statische Landingpage wird ausschließlich über den SSH-Alias `frecka-synology` für den Web-Station-Pfad von `frecka.app` vorbereitet. Alle Remote-Pfade sind im Deploymentskript fest hinterlegt:

- Projektwurzel: `/volume1/web/FRECKA`
- öffentliches Ziel: `/volume1/web/FRECKA/public`
- temporäres Upload-Staging: `/volume1/web/FRECKA/.website-upload`
- Rollback-Sicherung: `/volume1/web/FRECKA/.website-previous`

Die Routine akzeptiert weder einen frei übergebenen Host noch frei übergebene Remote-Pfade. Sie verändert keine App-, Beta-, Release- oder Web-Station-Bereiche und verwendet weder `sudo` noch IP-Adressen, Zugangsdaten oder private Schlüssel.

## Runtime-Menge

`runtime-files.txt` ist die verbindliche Allowlist. Nur die dort explizit aufgeführten Dateien gelangen in den Build und später in das Upload-Staging. Markdown-Dokumente, Originalscreenshots, `.DS_Store`, `.gitkeep`, Tests, Git-Metadaten, ungenutzte Platzhalter und Brand-Master außerhalb von `website/` werden nicht übernommen.

Die aktuelle Runtime umfasst exakt 17 Dateien:

- drei HTML-Seiten;
- vier Stylesheets;
- ein Vanilla-JavaScript;
- vier Logo-/Favicon-SVGs;
- Hero- und drei Workflow-Screenshots;
- ein Social-Preview-Bild.

## Lokaler Build

Aus `website/`:

```sh
./deploy/build-public.sh
```

Das Skript bestimmt den Projektpfad relativ zu seinem eigenen Speicherort und erzeugt einen frischen Build unter `.build/public/`. Quellen werden nur kopiert, nicht verändert, minimiert oder transformiert. Fehlende oder leere Pflichtdateien, Symlinks, Pfad-Traversal, nicht erlaubte Dateien und nicht aufgelöste lokale HTML-Referenzen brechen den Build ab.

Zusätzlich entstehen ausschließlich lokal:

- `.build/runtime-files.txt` als tatsächliche, sortierte Dateiliste;
- `.build/SHA256SUMS` mit SHA-256-Prüfsummen.

`.build/` ist über `website/.gitignore` von Git ausgeschlossen.

## Warum SCP verwendet wird

Die erste Transportvorbereitung mit Rsync-over-SSH scheiterte im nichtinteraktiven Synology-Servermodus an einem zusätzlichen Passwortdialog. Die Rsync-Autorisierung der Synology wird für diese Website nicht verändert. Stattdessen verwendet die Routine klassisches SCP über die bereits funktionierende SSH-Schlüsselverbindung. Damit bleibt die Änderung vollständig auf den Landingpage-Transport begrenzt.

Der Upload erfolgt niemals direkt nach `public/`. SCP schreibt ausschließlich in das feste, zuvor neu angelegte Staging `.website-upload`.

## Read-only Dry-Run

```sh
./deploy/deploy-public.sh --dry-run
```

Der Dry-Run:

1. baut und validiert die lokale Runtime neu;
2. verbindet sich im SSH-Batch-Modus ausschließlich über `frecka-synology`;
3. prüft Host, feste Zielpfade, Verzeichnisrechte, Symlink-Ausschluss und die benötigten SSH-/SCP-Kommandos;
4. verlangt, dass das temporäre Upload-Staging nicht vorhanden ist;
5. erfasst den öffentlichen Remote-Bestand mit sortierter Dateiliste und SHA-256-Prüfsummen;
6. liest das feste `public/`-Verzeichnis testweise per klassischem SCP in ein lokales temporäres Verzeichnis und vergleicht dessen Dateiliste und SHA-256-Prüfsummen mit dem per SSH erfassten Stand;
7. zeigt alle 17 lokalen Runtime-Dateien sowie getrennt die beim realen Austausch zu ersetzenden und zu entfernenden öffentlichen Dateien;
8. erfasst denselben Remote-Zustand erneut und vergleicht beide Aufnahmen bytegenau.

Alle Remote-Kommandos des Dry-Runs sind lesend. Es werden weder Verzeichnisse angelegt noch Dateien hochgeladen, umbenannt, verändert oder entfernt. Eine Zustandsabweichung beendet den Ablauf fail-closed.

## Vorbereiteter realer Ablauf

Ein echter Upload ist in diesem Arbeitsblock ausdrücklich nicht freigegeben. Der vorbereitete Modus lautet für einen späteren, separat autorisierten Deploymenttermin:

```sh
./deploy/deploy-public.sh --deploy
```

Auch der reale Modus führt zuerst Build, Remote-Preflight, Zustandsaufnahme und vollständige Vorschau aus. Danach verlangt er in einem interaktiven Terminal die exakte Eingabe `DEPLOY /volume1/web/FRECKA/public`.

Erst nach dieser Bestätigung ist folgender Ablauf vorgesehen:

1. `.website-upload` wird mit restriktivem Modus `700` neu angelegt;
2. die für die Allowlist benötigten Unterverzeichnisse werden restriktiv angelegt und alle 17 validierten Runtime-Dateien werden per SCP einzeln an ihre festen relativen Pfade übertragen;
3. der Server erzeugt dort eine sortierte Dateiliste und SHA-256-Prüfsummen;
4. Dateiliste und Prüfsummen müssen bytegenau dem lokalen Build entsprechen;
5. `index.html`, `legal/impressum.html` und `legal/datenschutz.html` müssen vorhanden und nicht leer sein;
6. erst danach werden Verzeichnisse auf `755` und Dateien auf `644` gesetzt;
7. innerhalb derselben festen Projektwurzel wird der bisherige `public/`-Stand nach `.website-previous` verschoben und das vollständig geprüfte Staging nach `public/` umbenannt;
8. der neue öffentliche Stand wird erneut per Dateiliste und SHA-256 verifiziert.

Vom Upload bis zur vollständigen Staging-Verifikation bleibt `public/` unangetastet. Unerwartete Pfade, Symlinks, ein vorhandenes Upload-Staging, fehlende Kommandos, Prüfsummenabweichungen oder fehlende Pflichtdateien brechen vor dem Austausch ab. Kann der Verzeichnistausch nicht sicher innerhalb der festen Projektwurzel abgeschlossen werden, stellt das Skript den bisherigen Zielnamen wieder her und beendet den Vorgang mit Fehlerstatus.

## Rollback

Der direkt vor dem Austausch veröffentlichte Stand wird unter `.website-previous` gesichert. Scheitert die abschließende Verifikation des neuen `public/`, entfernt die Routine ausschließlich das feste neue Ziel, verschiebt die Sicherung zurück und vergleicht anschließend Dateiliste und SHA-256-Prüfsummen mit dem zuvor erfassten Stand.

Nach einem erfolgreichen Deployment bleibt `.website-previous` als Rückfallebene erhalten. Vor einem späteren Deployment wird eine vorhandene alte Sicherung erst unmittelbar vor dem bereits vollständig verifizierten Verzeichnistausch ersetzt; der aktuell veröffentlichte Stand bleibt bis dahin unverändert. Die Routine legt bewusst keine Landingpage-Sicherung im App-Releasebereich an.

## Trennung von Website und App

Die Deploymentroutine ist ausschließlich für die statische Landingpage bestimmt. Sie berührt insbesondere nicht:

- `beta.frecka.app` oder `app.frecka.app`;
- App-Dateien, App-Releases oder App-Updateprozesse;
- Synology Web Station, Reverse Proxy, Zertifikate oder DNS;
- Benutzer-, Gruppen- oder Dienstberechtigungen auf der Synology.

## Sicherheitsgrenzen

- genau ein SSH-Alias: `frecka-synology`;
- genau ein öffentliches Ziel: `/volume1/web/FRECKA/public`;
- genau ein Upload-Staging: `/volume1/web/FRECKA/.website-upload`;
- genau eine Rollback-Sicherung: `/volume1/web/FRECKA/.website-previous`;
- kein Upload ohne vollständigen Build, Preflight und exakte interaktive Zielbestätigung;
- keine Veröffentlichung ohne serverseitige Dateilisten- und SHA-256-Verifikation;
- keine Secrets oder frei steuerbaren Remote-Argumente im Repository.

## Infrastrukturhinweis

OpenSSH meldet für die aktuelle Synology-Verbindung, dass kein Post-Quantum-Schlüsselaustausch ausgehandelt wird. Dies ist kein Blocker für den read-only Deployment-Dry-Run. Die Aktualisierung der SSH-Infrastruktur ist eine getrennte Härtungsmaßnahme und gehört nicht in den Landingpage-Transport.

## Aktueller Validierungsstand

Stand: 26. August 2026.

- Shell-Syntax: Build- und Deploymentskript erfolgreich geprüft;
- lokaler Build: erfolgreich, exakt 17 Runtime-Dateien und 17 bestätigte SHA-256-Prüfsummen;
- Transport: vollständig auf SSH/SCP umgestellt;
- SCP-Dry-Run: erfolgreich; Remote-Pfade und benötigte Kommandos geprüft, `public/` leer, Upload-Staging und Rollback-Sicherung nicht vorhanden;
- Zustandsnachweis: Remote-Dateiliste und SHA-256-Zustand vor und nach dem Dry-Run bytegleich, keine Remote-Änderung;
- realer Upload: nicht ausgeführt;
- Freigabestatus dieser Vorbereitung: **GO**.
