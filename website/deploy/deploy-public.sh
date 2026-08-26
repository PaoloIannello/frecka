#!/bin/sh

set -eu

umask 022

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd -P)
BUILD_SCRIPT="$SCRIPT_DIR/build-public.sh"
BUILD_ROOT="$PROJECT_DIR/.build"
PUBLIC_DIR="$BUILD_ROOT/public"
LOCAL_FILE_LIST="$BUILD_ROOT/runtime-files.txt"
LOCAL_CHECKSUMS="$BUILD_ROOT/SHA256SUMS"
REMOTE_FILE_LIST="$BUILD_ROOT/remote-runtime-files.txt"
REMOTE_CHECKSUMS="$BUILD_ROOT/remote-SHA256SUMS"
REMOTE_STATE_BEFORE="$BUILD_ROOT/dry-run-remote-before.txt"
REMOTE_STATE_AFTER="$BUILD_ROOT/dry-run-remote-after.txt"
PREVIOUS_PUBLIC_FILE_LIST="$BUILD_ROOT/previous-public-files.txt"
PREVIOUS_PUBLIC_CHECKSUMS="$BUILD_ROOT/previous-public-SHA256SUMS"
SCP_PROBE_DIR="$BUILD_ROOT/scp-read-probe.$$"
SCP_PROBE_CONTENT="$SCP_PROBE_DIR/public"
SCP_PROBE_FILE_LIST="$BUILD_ROOT/scp-read-probe-files.txt"
SCP_PROBE_CHECKSUMS="$BUILD_ROOT/scp-read-probe-SHA256SUMS"

REMOTE_HOST='frecka-synology'
REMOTE_ROOT='/volume1/web/FRECKA'
REMOTE_TARGET='/volume1/web/FRECKA/public'
REMOTE_STAGING='/volume1/web/FRECKA/.website-upload'
REMOTE_BACKUP='/volume1/web/FRECKA/.website-previous'
CONTROL_PATH='.build/ssh-control.sock'
SSH_OPTIONS='-o BatchMode=yes -o ClearAllForwardings=yes -o RequestTTY=no -o StrictHostKeyChecking=yes'
SSH_COMMAND="ssh $SSH_OPTIONS -S $CONTROL_PATH"

remote_staging_created=0

fail() {
  printf 'Deployment abgebrochen: %s\n' "$*" >&2
  exit 1
}

usage() {
  printf '%s\n' \
    'Verwendung:' \
    '  deploy-public.sh --dry-run   Build und read-only Remote-Vorschau' \
    '  deploy-public.sh --deploy    Staging, Verifikation, Austausch und Rollback-Sicherung'
}

case "${1:-}" in
  --dry-run|--deploy) mode=$1 ;;
  --help|-h) usage; exit 0 ;;
  *) usage >&2; exit 2 ;;
esac

[ "$#" -eq 1 ] || fail "Unerwartete zusätzliche Argumente."
[ "$REMOTE_HOST" = 'frecka-synology' ] || fail "Unerwarteter SSH-Alias."
[ "$REMOTE_ROOT" = '/volume1/web/FRECKA' ] || fail "Unerwarteter Remote-Root."
[ "$REMOTE_TARGET" = '/volume1/web/FRECKA/public' ] || fail "Unerwartetes Remote-Ziel."
[ "$REMOTE_STAGING" = '/volume1/web/FRECKA/.website-upload' ] || fail "Unerwartetes Remote-Staging."
[ "$REMOTE_BACKUP" = '/volume1/web/FRECKA/.website-previous' ] || fail "Unerwarteter Remote-Backup-Pfad."

case "$REMOTE_TARGET:$REMOTE_STAGING:$REMOTE_BACKUP" in
  /volume1/web/FRECKA/public:/volume1/web/FRECKA/.website-upload:/volume1/web/FRECKA/.website-previous) ;;
  *) fail "Remote-Pfade liegen außerhalb der festen Website-Ziele." ;;
esac

for command_name in cat cmp comm diff dirname find mkdir rm scp sed shasum ssh tr wc; do
  command -v "$command_name" >/dev/null 2>&1 || fail "Erforderliches Kommando fehlt: $command_name"
done

[ -x "$BUILD_SCRIPT" ] || fail "Build-Skript fehlt oder ist nicht ausführbar: $BUILD_SCRIPT"

"$BUILD_SCRIPT"

cd -- "$PROJECT_DIR"

[ -d "$PUBLIC_DIR" ] || fail "Lokaler Build fehlt: $PUBLIC_DIR"
[ ! -L "$PUBLIC_DIR" ] || fail "Lokaler Build darf kein Symlink sein."
[ -s "$PUBLIC_DIR/index.html" ] || fail "index.html fehlt im lokalen Build."
[ -s "$PUBLIC_DIR/legal/impressum.html" ] || fail "Impressum fehlt im lokalen Build."
[ -s "$PUBLIC_DIR/legal/datenschutz.html" ] || fail "Datenschutz fehlt im lokalen Build."
[ -s "$LOCAL_FILE_LIST" ] || fail "Lokale Dateiliste fehlt."
[ -s "$LOCAL_CHECKSUMS" ] || fail "Lokale Prüfsummen fehlen."

local_count=$(wc -l < "$LOCAL_FILE_LIST" | tr -d '[:space:]')
[ "$local_count" -eq 17 ] || fail "Erwartet werden exakt 17 Runtime-Dateien, gefunden: $local_count"

while IFS= read -r relative_path; do
  case "$relative_path" in
    ''|*[!A-Za-z0-9._/-]*) fail "Für SCP ungeeigneter Runtime-Pfad: $relative_path" ;;
  esac
done < "$LOCAL_FILE_LIST"

cleanup_remote_staging() {
  $SSH_COMMAND "$REMOTE_HOST" '
    set -eu
    root=/volume1/web/FRECKA
    staging=/volume1/web/FRECKA/.website-upload
    [ "$root" = /volume1/web/FRECKA ]
    [ "$staging" = /volume1/web/FRECKA/.website-upload ]
    [ -d "$root" ]
    [ ! -L "$root" ]
    if [ -e "$staging" ] || [ -L "$staging" ]; then
      [ -d "$staging" ]
      [ ! -L "$staging" ]
      rm -rf "$staging"
    fi
  '
}

cleanup_all() {
  exit_status=$?
  trap - EXIT HUP INT TERM

  if [ "$remote_staging_created" -eq 1 ] && [ -S "$CONTROL_PATH" ]; then
    cleanup_remote_staging >/dev/null 2>&1 || true
  fi

  case "$CONTROL_PATH" in
    .build/ssh-control.sock)
      if [ -S "$CONTROL_PATH" ]; then
        ssh $SSH_OPTIONS -S "$CONTROL_PATH" -O exit "$REMOTE_HOST" >/dev/null 2>&1 || true
      fi
      rm -f -- "$CONTROL_PATH"
      ;;
    *) ;;
  esac

  case "$SCP_PROBE_DIR" in
    "$PROJECT_DIR"/.build/scp-read-probe.*)
      if [ -e "$SCP_PROBE_DIR" ] || [ -L "$SCP_PROBE_DIR" ]; then
        rm -rf -- "$SCP_PROBE_DIR"
      fi
      ;;
    *) ;;
  esac

  exit "$exit_status"
}

trap cleanup_all EXIT HUP INT TERM

case "$CONTROL_PATH" in
  .build/ssh-control.sock) rm -f -- "$CONTROL_PATH" ;;
  *) fail "Unerwarteter SSH-Control-Pfad." ;;
esac

ssh $SSH_OPTIONS -M -S "$CONTROL_PATH" -o ControlMaster=yes -o ControlPersist=no -fnNT "$REMOTE_HOST"
[ -S "$CONTROL_PATH" ] || fail "SSH-Control-Verbindung konnte nicht aufgebaut werden."

remote_preflight() {
  $SSH_COMMAND "$REMOTE_HOST" '
    set -eu
    root=/volume1/web/FRECKA
    target=/volume1/web/FRECKA/public
    staging=/volume1/web/FRECKA/.website-upload
    backup=/volume1/web/FRECKA/.website-previous

    [ "$root" = /volume1/web/FRECKA ]
    [ "$target" = /volume1/web/FRECKA/public ]
    [ "$staging" = /volume1/web/FRECKA/.website-upload ]
    [ "$backup" = /volume1/web/FRECKA/.website-previous ]

    [ -d "$root" ]
    [ ! -L "$root" ]
    [ -r "$root" ]
    [ -w "$root" ]
    [ -x "$root" ]

    [ -d "$target" ]
    [ ! -L "$target" ]
    [ -r "$target" ]
    [ -w "$target" ]
    [ -x "$target" ]
    [ -z "$(find "$target" -type l -print | sed -n "1p")" ]

    [ ! -e "$staging" ]
    [ ! -L "$staging" ]

    if [ -e "$backup" ] || [ -L "$backup" ]; then
      [ -d "$backup" ]
      [ ! -L "$backup" ]
    fi

    command -v chmod >/dev/null 2>&1
    command -v find >/dev/null 2>&1
    command -v mkdir >/dev/null 2>&1
    command -v mv >/dev/null 2>&1
    command -v rm >/dev/null 2>&1
    command -v scp >/dev/null 2>&1
    command -v sed >/dev/null 2>&1
    command -v sha256sum >/dev/null 2>&1
    command -v sort >/dev/null 2>&1

    printf "Remote-Pfade und SCP read-only geprüft.\n"
  '
}

probe_scp_read() {
  case "$SCP_PROBE_DIR" in
    "$PROJECT_DIR"/.build/scp-read-probe.*) ;;
    *) fail "Unerwarteter lokaler SCP-Prüfpfad." ;;
  esac

  [ ! -e "$SCP_PROBE_DIR" ] || fail "Lokaler SCP-Prüfpfad ist bereits vorhanden."
  mkdir -- "$SCP_PROBE_DIR"

  if ! scp $SSH_OPTIONS -O -o ControlPath="$CONTROL_PATH" -r "$REMOTE_HOST:$REMOTE_TARGET" "$SCP_PROBE_DIR/"; then
    fail "Read-only SCP-Leseprobe aus dem festen public/-Ziel ist fehlgeschlagen."
  fi

  [ -d "$SCP_PROBE_CONTENT" ] || fail "SCP-Leseprobe enthält kein public/-Verzeichnis."
  [ ! -L "$SCP_PROBE_CONTENT" ] || fail "SCP-Leseprobe darf kein Symlink sein."

  find "$SCP_PROBE_CONTENT" -type f -print |
    sed "s#^$SCP_PROBE_CONTENT/##" |
    LC_ALL=C sort > "$SCP_PROBE_FILE_LIST"
  capture_public_file_list > "$REMOTE_FILE_LIST"

  if ! cmp -s "$REMOTE_FILE_LIST" "$SCP_PROBE_FILE_LIST"; then
    diff -u "$REMOTE_FILE_LIST" "$SCP_PROBE_FILE_LIST" >&2 || true
    fail "SCP-Leseprobe enthält nicht dieselbe Dateiliste wie public/."
  fi

  : > "$SCP_PROBE_CHECKSUMS"
  while IFS= read -r relative_path; do
    (
      cd -- "$SCP_PROBE_CONTENT"
      shasum -a 256 -- "$relative_path"
    ) >> "$SCP_PROBE_CHECKSUMS"
  done < "$SCP_PROBE_FILE_LIST"
  capture_public_checksums > "$REMOTE_CHECKSUMS"

  if ! cmp -s "$REMOTE_CHECKSUMS" "$SCP_PROBE_CHECKSUMS"; then
    diff -u "$REMOTE_CHECKSUMS" "$SCP_PROBE_CHECKSUMS" >&2 || true
    fail "SCP-Leseprobe stimmt nicht mit den public/-Prüfsummen überein."
  fi

  printf 'SCP read-only geprüft: Dateiliste und SHA-256 der lokalen Leseprobe stimmen.\n'
}

capture_remote_state() {
  $SSH_COMMAND "$REMOTE_HOST" '
    set -eu
    root=/volume1/web/FRECKA
    target=/volume1/web/FRECKA/public
    staging=/volume1/web/FRECKA/.website-upload
    backup=/volume1/web/FRECKA/.website-previous

    [ "$root" = /volume1/web/FRECKA ]
    [ "$target" = /volume1/web/FRECKA/public ]
    [ "$staging" = /volume1/web/FRECKA/.website-upload ]
    [ "$backup" = /volume1/web/FRECKA/.website-previous ]
    [ -d "$target" ]
    [ ! -L "$target" ]

    printf "PUBLIC\n"
    cd "$target"
    find . -type f -print | sed "s#^./##" | LC_ALL=C sort |
      while IFS= read -r file; do
        sha256sum "$file"
      done

    if [ -e "$staging" ] || [ -L "$staging" ]; then
      printf "STAGING_PRESENT\n"
    else
      printf "STAGING_ABSENT\n"
    fi

    if [ -e "$backup" ] || [ -L "$backup" ]; then
      [ -d "$backup" ]
      [ ! -L "$backup" ]
      printf "BACKUP\n"
      cd "$backup"
      find . -type f -print | sed "s#^./##" | LC_ALL=C sort |
        while IFS= read -r file; do
          sha256sum "$file"
        done
    else
      printf "BACKUP_ABSENT\n"
    fi
  '
}

show_dry_run_plan() {
  printf 'Zu übertragende Runtime-Dateien (%s):\n' "$local_count"
  cat "$LOCAL_FILE_LIST"

  capture_public_file_list > "$REMOTE_FILE_LIST"

  printf 'Aktuelle public-Dateien, die ersetzt würden:\n'
  replaced_files=$(LC_ALL=C comm -12 "$LOCAL_FILE_LIST" "$REMOTE_FILE_LIST")
  if [ -n "$replaced_files" ]; then
    printf '%s\n' "$replaced_files"
  else
    printf '(keine)\n'
  fi

  printf 'Aktuelle public-Dateien, die entfernt würden:\n'
  removed_files=$(LC_ALL=C comm -13 "$LOCAL_FILE_LIST" "$REMOTE_FILE_LIST")
  if [ -n "$removed_files" ]; then
    printf '%s\n' "$removed_files"
  else
    printf '(keine)\n'
  fi

  printf 'Realer Ablauf: SCP -> %s, SHA-256-Verifikation, gesicherter Austausch -> %s\n' "$REMOTE_STAGING" "$REMOTE_TARGET"
}

capture_public_file_list() {
  $SSH_COMMAND "$REMOTE_HOST" '
    set -eu
    target=/volume1/web/FRECKA/public
    [ "$target" = /volume1/web/FRECKA/public ]
    [ -d "$target" ]
    [ ! -L "$target" ]
    cd "$target"
    find . -type f -print | sed "s#^./##" | LC_ALL=C sort
  '
}

capture_public_checksums() {
  $SSH_COMMAND "$REMOTE_HOST" '
    set -eu
    target=/volume1/web/FRECKA/public
    [ "$target" = /volume1/web/FRECKA/public ]
    [ -d "$target" ]
    [ ! -L "$target" ]
    cd "$target"
    find . -type f -print | sed "s#^./##" | LC_ALL=C sort |
      while IFS= read -r file; do
        sha256sum "$file"
      done
  '
}

capture_staging_file_list() {
  $SSH_COMMAND "$REMOTE_HOST" '
    set -eu
    staging=/volume1/web/FRECKA/.website-upload
    [ "$staging" = /volume1/web/FRECKA/.website-upload ]
    [ -d "$staging" ]
    [ ! -L "$staging" ]
    cd "$staging"
    find . -type f -print | sed "s#^./##" | LC_ALL=C sort
  '
}

capture_staging_checksums() {
  $SSH_COMMAND "$REMOTE_HOST" '
    set -eu
    staging=/volume1/web/FRECKA/.website-upload
    [ "$staging" = /volume1/web/FRECKA/.website-upload ]
    [ -d "$staging" ]
    [ ! -L "$staging" ]
    cd "$staging"
    find . -type f -print | sed "s#^./##" | LC_ALL=C sort |
      while IFS= read -r file; do
        sha256sum "$file"
      done
  '
}

create_remote_staging() {
  $SSH_COMMAND "$REMOTE_HOST" '
    set -eu
    root=/volume1/web/FRECKA
    staging=/volume1/web/FRECKA/.website-upload
    [ "$root" = /volume1/web/FRECKA ]
    [ "$staging" = /volume1/web/FRECKA/.website-upload ]
    [ -d "$root" ]
    [ ! -L "$root" ]
    [ ! -e "$staging" ]
    [ ! -L "$staging" ]
    umask 077
    mkdir "$staging"
    chmod 700 "$staging"
  '
}

prepare_remote_staging_directories() {
  $SSH_COMMAND "$REMOTE_HOST" '
    set -eu
    staging=/volume1/web/FRECKA/.website-upload
    [ "$staging" = /volume1/web/FRECKA/.website-upload ]
    [ -d "$staging" ]
    [ ! -L "$staging" ]
    umask 077
    mkdir -p \
      "$staging/assets/logo/favicon" \
      "$staging/assets/logo/svg" \
      "$staging/assets/screenshots/hero" \
      "$staging/assets/screenshots/workflow" \
      "$staging/assets/social" \
      "$staging/legal" \
      "$staging/scripts" \
      "$staging/styles"
  '
}

publish_staging() {
  $SSH_COMMAND "$REMOTE_HOST" '
    set -eu
    root=/volume1/web/FRECKA
    target=/volume1/web/FRECKA/public
    staging=/volume1/web/FRECKA/.website-upload
    backup=/volume1/web/FRECKA/.website-previous

    [ "$root" = /volume1/web/FRECKA ]
    [ "$target" = /volume1/web/FRECKA/public ]
    [ "$staging" = /volume1/web/FRECKA/.website-upload ]
    [ "$backup" = /volume1/web/FRECKA/.website-previous ]
    [ -d "$root" ]
    [ ! -L "$root" ]
    [ -d "$target" ]
    [ ! -L "$target" ]
    [ -d "$staging" ]
    [ ! -L "$staging" ]
    [ -s "$staging/index.html" ]
    [ -s "$staging/legal/impressum.html" ]
    [ -s "$staging/legal/datenschutz.html" ]

    find "$staging" -type d -exec chmod 755 {} \;
    find "$staging" -type f -exec chmod 644 {} \;

    if [ -e "$backup" ] || [ -L "$backup" ]; then
      [ -d "$backup" ]
      [ ! -L "$backup" ]
      rm -rf "$backup"
    fi

    mv "$target" "$backup"
    if ! mv "$staging" "$target"; then
      mv "$backup" "$target"
      exit 1
    fi
  '
}

rollback_public() {
  $SSH_COMMAND "$REMOTE_HOST" '
    set -eu
    root=/volume1/web/FRECKA
    target=/volume1/web/FRECKA/public
    backup=/volume1/web/FRECKA/.website-previous
    [ "$root" = /volume1/web/FRECKA ]
    [ "$target" = /volume1/web/FRECKA/public ]
    [ "$backup" = /volume1/web/FRECKA/.website-previous ]
    [ -d "$root" ]
    [ ! -L "$root" ]
    [ -d "$target" ]
    [ ! -L "$target" ]
    [ -d "$backup" ]
    [ ! -L "$backup" ]
    rm -rf "$target"
    mv "$backup" "$target"
  '
}

remote_preflight
capture_remote_state > "$REMOTE_STATE_BEFORE"
probe_scp_read
show_dry_run_plan

if [ "$mode" = '--dry-run' ]; then
  capture_remote_state > "$REMOTE_STATE_AFTER"
  if ! cmp -s "$REMOTE_STATE_BEFORE" "$REMOTE_STATE_AFTER"; then
    diff -u "$REMOTE_STATE_BEFORE" "$REMOTE_STATE_AFTER" >&2 || true
    fail "Remote-Zustand hat sich während des Dry-Runs verändert."
  fi

  printf 'Dry-Run erfolgreich: Remote-Dateiliste und SHA-256-Zustand sind unverändert.\n'
  exit 0
fi

[ -t 0 ] || fail "Reales Deployment erfordert eine interaktive Bestätigung."
printf 'Zum Veröffentlichen exakt eingeben: DEPLOY %s\n> ' "$REMOTE_TARGET"
IFS= read -r confirmation
[ "$confirmation" = "DEPLOY $REMOTE_TARGET" ] || fail "Bestätigung stimmt nicht mit dem festen Ziel überein."

capture_public_file_list > "$PREVIOUS_PUBLIC_FILE_LIST"
capture_public_checksums > "$PREVIOUS_PUBLIC_CHECKSUMS"

create_remote_staging
remote_staging_created=1
prepare_remote_staging_directories

while IFS= read -r relative_path; do
  if ! scp $SSH_OPTIONS -O -o ControlPath="$CONTROL_PATH" \
    "$PUBLIC_DIR/$relative_path" "$REMOTE_HOST:$REMOTE_STAGING/$relative_path"; then
    fail "SCP-Upload in das feste Staging ist fehlgeschlagen: $relative_path"
  fi
done < "$LOCAL_FILE_LIST"

capture_staging_file_list > "$REMOTE_FILE_LIST"
capture_staging_checksums > "$REMOTE_CHECKSUMS"

if ! cmp -s "$LOCAL_FILE_LIST" "$REMOTE_FILE_LIST"; then
  diff -u "$LOCAL_FILE_LIST" "$REMOTE_FILE_LIST" >&2 || true
  fail "Staging-Dateiliste stimmt nicht mit dem lokalen Build überein."
fi

if ! cmp -s "$LOCAL_CHECKSUMS" "$REMOTE_CHECKSUMS"; then
  diff -u "$LOCAL_CHECKSUMS" "$REMOTE_CHECKSUMS" >&2 || true
  fail "Staging-Prüfsummen stimmen nicht mit dem lokalen Build überein."
fi

publish_staging
remote_staging_created=0

capture_public_file_list > "$REMOTE_FILE_LIST"
capture_public_checksums > "$REMOTE_CHECKSUMS"

if ! cmp -s "$LOCAL_FILE_LIST" "$REMOTE_FILE_LIST" || ! cmp -s "$LOCAL_CHECKSUMS" "$REMOTE_CHECKSUMS"; then
  printf 'Verifikation des neuen public/ fehlgeschlagen. Rollback wird ausgeführt.\n' >&2
  rollback_public || fail "Verifikation fehlgeschlagen und Rollback konnte nicht abgeschlossen werden."

  capture_public_file_list > "$REMOTE_FILE_LIST"
  capture_public_checksums > "$REMOTE_CHECKSUMS"
  cmp -s "$PREVIOUS_PUBLIC_FILE_LIST" "$REMOTE_FILE_LIST" || fail "Rollback-Dateiliste weicht vom vorherigen public/ ab."
  cmp -s "$PREVIOUS_PUBLIC_CHECKSUMS" "$REMOTE_CHECKSUMS" || fail "Rollback-Prüfsummen weichen vom vorherigen public/ ab."
  fail "Verifikation fehlgeschlagen; vorheriger public/-Stand wurde wiederhergestellt."
fi

printf 'Landingpage erfolgreich nach %s:%s veröffentlicht und verifiziert.\n' "$REMOTE_HOST" "$REMOTE_TARGET"
printf 'Vorheriger public/-Stand liegt unter %s.\n' "$REMOTE_BACKUP"
