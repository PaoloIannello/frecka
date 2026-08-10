#!/bin/sh

# Überträgt genau ein bereits erzeugtes FRECKA-Release per SSH/SCP auf die interne Synology.
# Das Skript aktiviert keinen Web-Station-Host und besitzt keinen Produktivmodus.

set -eu

PROGRAM_NAME=${0##*/}
DEPLOY_SSH_ALIAS='frecka-synology'
REMOTE_RELEASE_BASE='/volume1/web/FRECKA/releases'

usage() {
  cat <<EOF
Aufruf:
  $PROGRAM_NAME --dry-run <release-id>
  $PROGRAM_NAME <release-id>

Beispiel:
  $PROGRAM_NAME --dry-run 0.9.1-26dc63f
EOF
}

fail() {
  printf 'FEHLER: %s\n' "$1" >&2
  exit 1
}

DRY_RUN=0

if [ "${1:-}" = '--dry-run' ]; then
  DRY_RUN=1
  shift
fi

if [ "$#" -ne 1 ]; then
  usage >&2
  exit 2
fi

RELEASE_ID=$1

# Zulässig sind SemVer-Versionen, eine optionale Vorabkennung und ein
# abschließender kurzer beziehungsweise vollständiger Git-Commit in Kleinhex.
if ! printf '%s\n' "$RELEASE_ID" | LC_ALL=C grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z]+(\.[0-9A-Za-z]+)*)?-[0-9a-f]{7,40}$'; then
  fail "Unplausible Release-ID: $RELEASE_ID"
fi

SCRIPT_DIR=$(CDPATH= cd -P "$(dirname "$0")" && pwd)
REPOSITORY_ROOT=$(CDPATH= cd -P "$SCRIPT_DIR/.." && pwd)
LOCAL_RELEASE="$REPOSITORY_ROOT/tmp/releases/$RELEASE_ID"
REMOTE_RELEASE="$REMOTE_RELEASE_BASE/$RELEASE_ID"
REMOTE_STAGING="$REMOTE_RELEASE_BASE/.upload-$RELEASE_ID"
REMOTE_PUBLISH_LOCK="$REMOTE_RELEASE_BASE/.publish-$RELEASE_ID.lock"
REMOTE_DESTINATION="$DEPLOY_SSH_ALIAS:$REMOTE_STAGING/"

command -v ssh >/dev/null 2>&1 || fail 'ssh ist auf diesem Mac nicht verfügbar.'
command -v scp >/dev/null 2>&1 || fail 'scp ist auf diesem Mac nicht verfügbar.'
if scp -O 2>&1 | grep -Eqi 'illegal option|unknown option|unrecognized option'; then
  fail 'Das lokale scp unterstützt den für die Synology benötigten Legacy-Modus -O nicht.'
fi

[ -d "$LOCAL_RELEASE" ] || fail "Lokales Release-Verzeichnis fehlt: $LOCAL_RELEASE"
[ -f "$LOCAL_RELEASE/RELEASE.txt" ] || fail 'RELEASE.txt fehlt.'
[ -f "$LOCAL_RELEASE/SHA256SUMS" ] || fail 'SHA256SUMS fehlt.'
[ -d "$LOCAL_RELEASE/site" ] || fail 'site/ fehlt.'

grep -Fqx "Release-ID: $RELEASE_ID" "$LOCAL_RELEASE/RELEASE.txt" ||
  fail 'Release-ID in RELEASE.txt stimmt nicht mit dem Argument überein.'

# Symlinks und andere Spezialdateien könnten unbemerkt auf Inhalte außerhalb
# des unveränderlichen Artefakts zeigen und werden daher nicht übertragen.
if find "$LOCAL_RELEASE" ! -type f ! -type d -print | grep -q .; then
  fail 'Das Release enthält Symlinks oder andere unzulässige Spezialdateien.'
fi

TEMP_DIRECTORY=$(mktemp -d "${TMPDIR:-/tmp}/frecka-deploy.XXXXXX") ||
  fail 'Temporäres Prüfverzeichnis konnte nicht angelegt werden.'

cleanup() {
  rm -rf "$TEMP_DIRECTORY"
}

trap cleanup 0
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

LISTED_FILES="$TEMP_DIRECTORY/listed-files"
ACTUAL_FILES="$TEMP_DIRECTORY/actual-files"

ssh_deploy() {
  ssh -T \
    -o BatchMode=yes \
    -o PasswordAuthentication=no \
    -o KbdInteractiveAuthentication=no \
    -o IdentitiesOnly=yes \
    -o ConnectTimeout=10 \
    "$DEPLOY_SSH_ALIAS" "$@"
}

scp_deploy() {
  # Die drei Artefaktbestandteile werden einzeln in das bereits mit 0700
  # vorbereitete Staging kopiert. Insbesondere wird weder dessen Wurzelmodus
  # aus "$LOCAL_RELEASE/." noch per -p ein lokaler schreibgeschützter Modus
  # auf das Upload-Verzeichnis übertragen.
  scp -O -r \
    -o BatchMode=yes \
    -o PasswordAuthentication=no \
    -o KbdInteractiveAuthentication=no \
    -o IdentitiesOnly=yes \
    -o ConnectTimeout=10 \
    "$LOCAL_RELEASE/RELEASE.txt" \
    "$LOCAL_RELEASE/SHA256SUMS" \
    "$LOCAL_RELEASE/site" \
    "$REMOTE_DESTINATION"
}

# Neben Format- und Pfadprüfung wird sichergestellt, dass jede ausgelieferte
# Datei (außer SHA256SUMS selbst) genau von der Prüfliste erfasst wird.
if ! awk '
  {
    if (length($1) != 64 || $1 !~ /^[0-9a-f]+$/ || substr($0, 65, 2) != "  ") {
      exit 1
    }
    path = substr($0, 67)
    if (path == "" || path ~ /^\// || path ~ /(^|\/)\.\.(\/|$)/ || path == "SHA256SUMS") {
      exit 1
    }
    if (path != "RELEASE.txt" && path !~ /^site\//) {
      exit 1
    }
    print path
  }
  END {
    if (NR == 0) {
      exit 1
    }
  }
' "$LOCAL_RELEASE/SHA256SUMS" | LC_ALL=C sort > "$LISTED_FILES"; then
  fail 'SHA256SUMS besitzt ein ungültiges oder unsicheres Format.'
fi

if [ -n "$(uniq -d "$LISTED_FILES")" ]; then
  fail 'SHA256SUMS enthält doppelte Dateipfade.'
fi

(
  cd "$LOCAL_RELEASE"
  find . -type f ! -path './SHA256SUMS' -print |
    sed 's#^\./##' |
    LC_ALL=C sort > "$ACTUAL_FILES"
)

cmp -s "$LISTED_FILES" "$ACTUAL_FILES" ||
  fail 'Dateibestand und SHA256SUMS stimmen nicht vollständig überein.'

if command -v shasum >/dev/null 2>&1; then
  (
    cd "$LOCAL_RELEASE"
    shasum -a 256 -c SHA256SUMS
  ) || fail 'Lokale SHA-256-Prüfung ist fehlgeschlagen.'
elif command -v sha256sum >/dev/null 2>&1; then
  (
    cd "$LOCAL_RELEASE"
    sha256sum -c SHA256SUMS
  ) || fail 'Lokale SHA-256-Prüfung ist fehlgeschlagen.'
else
  fail 'Weder shasum noch sha256sum ist lokal verfügbar.'
fi

printf '\nBeta-Deployment vorbereiten\n'
printf '  Release: %s\n' "$RELEASE_ID"
printf '  Quelle:  %s/\n' "$LOCAL_RELEASE"
printf '  Staging: %s:%s/\n' "$DEPLOY_SSH_ALIAS" "$REMOTE_STAGING"
printf '  Ziel:    %s:%s/\n' "$DEPLOY_SSH_ALIAS" "$REMOTE_RELEASE"

# Dieser lesende Vorabtest prüft Basis, Rechte, benötigte Serverprogramme und
# die Unvergebenheit der Release-ID. Die normale SSH-Host-Key-Prüfung bleibt
# aktiv. Benutzer und Schlüssel kommen aus dem lokalen SSH-Alias; BatchMode
# und deaktivierte Passwortverfahren verhindern jede Passwortabfrage.
if ! ssh_deploy 'sh -s' <<EOF
  if [ ! -d '$REMOTE_RELEASE_BASE' ]; then
    echo 'FEHLER: Die Zielbasis fehlt: $REMOTE_RELEASE_BASE' >&2
    exit 20
  fi
  if [ ! -w '$REMOTE_RELEASE_BASE' ]; then
    echo 'FEHLER: Das Deployment-Konto darf nicht in die Zielbasis schreiben.' >&2
    exit 21
  fi
  for required_command in scp sha256sum find awk sed sort grep mv mkdir rmdir chmod; do
    if ! command -v "\$required_command" >/dev/null 2>&1; then
      echo "FEHLER: Serverseitiges \$required_command fehlt." >&2
      exit 22
    fi
  done
  MV_HELP=\$(mv --help 2>&1 || true)
  if ! printf '%s\n' "\$MV_HELP" | grep -Eq 'no-clobber|\[[^]]*n[^]]*\]'; then
    echo 'FEHLER: Serverseitiges mv unterstützt kein sicheres No-Clobber (-n).' >&2
    exit 23
  fi
  if ! printf '%s\n' "\$MV_HELP" | grep -Eq 'no-target-directory|\[[^]]*T[^]]*\]'; then
    echo 'FEHLER: Serverseitiges mv unterstützt kein sicheres No-Target-Directory (-T).' >&2
    exit 23
  fi
  if [ -e '$REMOTE_RELEASE' ] || [ -L '$REMOTE_RELEASE' ]; then
    echo 'FEHLER: Das Ziel-Release existiert bereits und wird nicht überschrieben.' >&2
    exit 24
  fi
  if [ -e '$REMOTE_STAGING' ] || [ -L '$REMOTE_STAGING' ]; then
    echo 'FEHLER: Das temporäre Upload-Verzeichnis existiert bereits. Manuell prüfen; keine automatische Bereinigung.' >&2
    exit 25
  fi
  if [ -e '$REMOTE_PUBLISH_LOCK' ] || [ -L '$REMOTE_PUBLISH_LOCK' ]; then
    echo 'FEHLER: Die Veröffentlichungssperre existiert bereits. Manuell prüfen; keine automatische Bereinigung.' >&2
    exit 26
  fi
EOF
then
  fail 'Synology-Vorabprüfung ist fehlgeschlagen.'
fi

if [ "$DRY_RUN" -eq 1 ]; then
  printf '\nGeplanter SCP-Ablauf (ohne Serveränderung)\n'
  printf '  1. Temporäres Verzeichnis exklusiv mit Modus 0700 anlegen: %s\n' "$REMOTE_STAGING"
  printf '  2. Vollständiges Release per SCP in dieses Verzeichnis kopieren.\n'
  printf '  3. SHA256SUMS und vollständigen Dateibestand serverseitig prüfen.\n'
  printf '  4. Geprüfte Dateien auf 0444 und Verzeichnisse auf 0555 härten.\n'
  printf '  5. Bereits schreibgeschütztes Verzeichnis in den finalen Release-Namen umbenennen.\n'
  printf '\nDRY-RUN BESTANDEN: Es wurden keine Dateien oder Verzeichnisse angelegt.\n'
  exit 0
fi

# Das versteckte Staging-Verzeichnis wird exklusiv reserviert. Vor der
# vollständigen Prüfung entsteht kein finales Release-Verzeichnis.
if ! ssh_deploy 'sh -s' <<EOF
  if ! mkdir '$REMOTE_STAGING'; then
    echo 'FEHLER: Temporäres Upload-Verzeichnis konnte nicht exklusiv angelegt werden.' >&2
    exit 27
  fi
  if ! chmod 0700 '$REMOTE_STAGING'; then
    echo 'FEHLER: Temporäres Upload-Verzeichnis konnte nicht auf Modus 0700 gesetzt werden.' >&2
    exit 28
  fi
  if [ ! -r '$REMOTE_STAGING' ] || [ ! -w '$REMOTE_STAGING' ] || [ ! -x '$REMOTE_STAGING' ]; then
    echo 'FEHLER: Temporäres Upload-Verzeichnis ist für das Deployment-Konto nicht vollständig nutzbar.' >&2
    exit 29
  fi
EOF
then
  fail 'Temporäres Upload-Verzeichnis konnte nicht sicher vorbereitet werden; es wurde nichts übertragen.'
fi

printf '\nSCP-Übertragung\n'
if ! scp_deploy; then
  printf '%s\n' \
    "FEHLER: Die Übertragung ist fehlgeschlagen. Das temporäre Verzeichnis $REMOTE_STAGING kann unvollständig sein." \
    'Es wurde kein finales Release erzeugt. Staging manuell prüfen; keine automatische Bereinigung.' >&2
  exit 1
fi

printf '\nServerseitige Prüfung und Veröffentlichung\n'
if ! ssh_deploy 'sh -s' <<EOF
  cd '$REMOTE_STAGING' || exit 30
  if [ ! -f RELEASE.txt ] || [ ! -f SHA256SUMS ] || [ ! -d site ]; then
    echo 'FEHLER: Das übertragene Release ist unvollständig.' >&2
    exit 31
  fi
  if ! grep -Fqx 'Release-ID: $RELEASE_ID' RELEASE.txt; then
    echo 'FEHLER: Die serverseitige Release-ID stimmt nicht.' >&2
    exit 32
  fi
  if find . ! -type f ! -type d -print | grep -q .; then
    echo 'FEHLER: Das übertragene Release enthält unzulässige Spezialdateien.' >&2
    exit 33
  fi
  LISTED_FILES=\$(awk '{ print substr(\$0, 67) }' SHA256SUMS | sort)
  ACTUAL_FILES=\$(find . -type f ! -path './SHA256SUMS' -print | sed 's#^\./##' | sort)
  if [ "\$LISTED_FILES" != "\$ACTUAL_FILES" ]; then
    echo 'FEHLER: Serverseitiger Dateibestand und SHA256SUMS stimmen nicht vollständig überein.' >&2
    exit 34
  fi
  if ! sha256sum -c SHA256SUMS; then
    echo 'FEHLER: Die serverseitige SHA-256-Prüfung ist fehlgeschlagen.' >&2
    exit 35
  fi
  if ! find . -type f -exec chmod 0444 {} \; ||
    ! find . -type d -exec chmod 0555 {} \;
  then
    echo 'FEHLER: Das geprüfte Release konnte nicht schreibgeschützt werden.' >&2
    exit 42
  fi
  WRITABLE_PATH=\$(find . \( -type f -o -type d \) -print | while IFS= read -r path; do
    if [ -w "\$path" ]; then
      printf '%s\n' "\$path"
      break
    fi
  done)
  if [ -n "\$WRITABLE_PATH" ]; then
    echo "FEHLER: Release-Pfad bleibt trotz Härtung schreibbar: \$WRITABLE_PATH" >&2
    exit 43
  fi
  if [ -e '$REMOTE_RELEASE' ] || [ -L '$REMOTE_RELEASE' ]; then
    echo 'FEHLER: Das finale Ziel ist inzwischen vorhanden und wird nicht überschrieben.' >&2
    exit 36
  fi
  if ! mkdir '$REMOTE_PUBLISH_LOCK'; then
    echo 'FEHLER: Die Veröffentlichungssperre konnte nicht exklusiv angelegt werden.' >&2
    exit 37
  fi
  if [ -e '$REMOTE_RELEASE' ] || [ -L '$REMOTE_RELEASE' ]; then
    echo 'FEHLER: Das finale Ziel ist inzwischen vorhanden. Staging und Sperre bleiben zur manuellen Prüfung bestehen.' >&2
    exit 38
  fi
  if ! mv -nT '$REMOTE_STAGING' '$REMOTE_RELEASE'; then
    echo 'FEHLER: Das geprüfte Staging konnte nicht final veröffentlicht werden. Staging und Sperre bleiben bestehen.' >&2
    exit 39
  fi
  if [ -e '$REMOTE_STAGING' ] || [ ! -d '$REMOTE_RELEASE' ]; then
    echo 'FEHLER: Der finale Namenswechsel konnte nicht eindeutig bestätigt werden.' >&2
    exit 40
  fi
  if ! rmdir '$REMOTE_PUBLISH_LOCK'; then
    echo 'FEHLER: Release ist veröffentlicht, aber die leere Veröffentlichungssperre konnte nicht entfernt werden.' >&2
    exit 41
  fi
EOF
then
  printf '%s\n' \
    "FEHLER: Serverprüfung oder Veröffentlichung ist fehlgeschlagen. Kein unbestätigtes Release aktivieren." \
    "Das temporäre Verzeichnis $REMOTE_STAGING und eine mögliche Sperre werden nicht automatisch gelöscht." >&2
  exit 1
fi

printf '\nBETA-UPLOAD BESTANDEN\n'
printf 'Das Release wurde übertragen und geprüft, aber nicht in Web Station aktiviert.\n'
