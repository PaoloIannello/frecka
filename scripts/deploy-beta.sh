#!/bin/sh

# Überträgt genau ein bereits erzeugtes FRECKA-Release auf die interne Synology.
# Das Skript aktiviert keinen Web-Station-Host und besitzt keinen Produktivmodus.

set -eu

PROGRAM_NAME=${0##*/}
DEPLOY_HOST='192.168.178.46'
DEPLOY_USER='Paolo Iannello'
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
REMOTE_DESTINATION="$DEPLOY_USER@$DEPLOY_HOST:$REMOTE_RELEASE/"

command -v ssh >/dev/null 2>&1 || fail 'ssh ist auf diesem Mac nicht verfügbar.'
command -v rsync >/dev/null 2>&1 || fail 'rsync ist auf diesem Mac nicht verfügbar.'

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
printf '  Ziel:    %s\n' "$REMOTE_DESTINATION"

# Dieser lesende Vorabtest prüft Basis, Rechte, benötigte Serverprogramme und
# die Unvergebenheit der Release-ID. Die normale SSH-Host-Key-Prüfung bleibt
# aktiv; Passwörter und Schlüssel werden nicht vom Skript verwaltet.
ssh -T -o ConnectTimeout=10 -l "$DEPLOY_USER" "$DEPLOY_HOST" "
  if [ ! -d '$REMOTE_RELEASE_BASE' ]; then
    echo 'FEHLER: Die Zielbasis fehlt: $REMOTE_RELEASE_BASE' >&2
    exit 20
  fi
  if [ ! -w '$REMOTE_RELEASE_BASE' ]; then
    echo 'FEHLER: Das Deployment-Konto darf nicht in die Zielbasis schreiben.' >&2
    exit 21
  fi
  if ! command -v rsync >/dev/null 2>&1; then
    echo 'FEHLER: Serverseitiges rsync fehlt.' >&2
    exit 22
  fi
  if ! command -v sha256sum >/dev/null 2>&1; then
    echo 'FEHLER: Serverseitiges sha256sum fehlt.' >&2
    exit 23
  fi
  if [ -e '$REMOTE_RELEASE' ] || [ -L '$REMOTE_RELEASE' ]; then
    echo 'FEHLER: Das Ziel-Release existiert bereits und wird nicht überschrieben.' >&2
    exit 24
  fi
" || fail 'Synology-Vorabprüfung ist fehlgeschlagen.'

if [ "$DRY_RUN" -eq 1 ]; then
  printf '\nRsync-Dry-Run (ohne Serveränderung)\n'
  rsync -rlt --checksum --itemize-changes --human-readable --ignore-existing --dry-run \
    -e 'ssh -o ConnectTimeout=10' \
    "$LOCAL_RELEASE/" "$REMOTE_DESTINATION" ||
    fail 'Rsync-Dry-Run ist fehlgeschlagen.'
  printf '\nDRY-RUN BESTANDEN: Es wurden keine Dateien oder Verzeichnisse angelegt.\n'
  exit 0
fi

# mkdir reserviert die Release-ID atomar. Entsteht das Ziel zwischen Vorprüfung
# und diesem Schritt, bricht mkdir ab; rsync wird dann nicht gestartet.
ssh -T -o ConnectTimeout=10 -l "$DEPLOY_USER" "$DEPLOY_HOST" \
  "mkdir '$REMOTE_RELEASE'" ||
  fail 'Ziel konnte nicht exklusiv angelegt werden; es wurde nichts übertragen.'

printf '\nRsync-Übertragung\n'
if ! rsync -rlt --checksum --itemize-changes --human-readable --ignore-existing \
  -e 'ssh -o ConnectTimeout=10' \
  "$LOCAL_RELEASE/" "$REMOTE_DESTINATION"; then
  printf '%s\n' \
    "FEHLER: Die Übertragung ist fehlgeschlagen. Das reservierte Ziel $REMOTE_RELEASE kann unvollständig sein." \
    'Nicht aktivieren und nicht erneut überschreiben; zuerst auf der Synology prüfen.' >&2
  exit 1
fi

printf '\nServerseitige SHA-256-Prüfung\n'
ssh -T -o ConnectTimeout=10 -l "$DEPLOY_USER" "$DEPLOY_HOST" \
  "cd '$REMOTE_RELEASE' && sha256sum -c SHA256SUMS" || {
    printf '%s\n' \
      "FEHLER: Die serverseitige Prüfung ist fehlgeschlagen. Das Ziel $REMOTE_RELEASE bleibt gesperrt." \
      'Nicht in Web Station aktivieren.' >&2
    exit 1
  }

printf '\nBETA-UPLOAD BESTANDEN\n'
printf 'Das Release wurde übertragen und geprüft, aber nicht in Web Station aktiviert.\n'
