#!/bin/sh

# Lokaler Regressionstest für DEPLOY-006. SSH und SCP werden vollständig
# abgefangen; der Test baut keine Netzwerkverbindung auf und überträgt nichts.

set -eu

TEST_DIRECTORY=$(mktemp -d "${TMPDIR:-/tmp}/frecka-deploy-test.XXXXXX")

cleanup() {
  # Der Rechte-Lifecycle wird mit schreibgeschützten Testverzeichnissen
  # nachgestellt. Nur das eigens erzeugte temporäre Testziel wird entsperrt.
  chmod -R u+w "$TEST_DIRECTORY" 2>/dev/null || true
  rm -rf "$TEST_DIRECTORY"
}

trap cleanup 0
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

TEST_REPOSITORY="$TEST_DIRECTORY/repository"
TEST_BIN="$TEST_DIRECTORY/bin"
TEST_RELEASE_ID='1.2.3-abcdef0'
TEST_RELEASE="$TEST_REPOSITORY/tmp/releases/$TEST_RELEASE_ID"
REMOTE_BASE='/volume1/web/FRECKA/releases'
REMOTE_STAGING="$REMOTE_BASE/.upload-$TEST_RELEASE_ID"
REMOTE_FINAL="$REMOTE_BASE/$TEST_RELEASE_ID"

mkdir -p "$TEST_REPOSITORY/scripts" "$TEST_RELEASE/site" "$TEST_BIN"
cp "$(CDPATH= cd -P "$(dirname "$0")/.." && pwd)/scripts/deploy-beta.sh" "$TEST_REPOSITORY/scripts/deploy-beta.sh"
printf '%s\n' 'Testinhalt' > "$TEST_RELEASE/site/index.html"
printf '%s\n' "Release-ID: $TEST_RELEASE_ID" > "$TEST_RELEASE/RELEASE.txt"
(
  cd "$TEST_RELEASE"
  shasum -a 256 RELEASE.txt site/index.html > SHA256SUMS
)
RESOLVED_TEST_RELEASE=$(CDPATH= cd -P "$TEST_RELEASE" && pwd)

printf '%s\n' \
  '#!/bin/sh' \
  'printf "SSH\n" >> "$FRECKA_DEPLOY_TEST_LOG"' \
  'last_argument=' \
  'for argument do printf "<%s>\n" "$argument" >> "$FRECKA_DEPLOY_TEST_LOG"; last_argument=$argument; done' \
  'if [ "$last_argument" = "sh -s" ]; then' \
  '  remote_input=$(cat)' \
  '  printf "REMOTE_STDIN\n%s\n" "$remote_input" >> "$FRECKA_DEPLOY_TEST_LOG"' \
  '  if ! sh -n -c "$remote_input"; then printf "%s\n" "$remote_input" >&2; exit 89; fi' \
  'else' \
  '  sh -n -c "$last_argument" || exit 89' \
  'fi' \
  'case "${FRECKA_DEPLOY_TEST_SSH_MODE:-success}" in' \
  '  auth-fail) exit 255 ;;' \
  '  final-exists) printf "%s\n" "FEHLER: Das Ziel-Release existiert bereits und wird nicht überschrieben." >&2; exit 24 ;;' \
  'esac' \
  'exit 0' > "$TEST_BIN/ssh"

printf '%s\n' \
  '#!/bin/sh' \
  'if [ "$#" -eq 1 ] && [ "$1" = "-O" ]; then' \
  '  printf "SCP_PROBE\n" >> "$FRECKA_DEPLOY_TEST_LOG"' \
  '  printf "%s\n" "usage: scp [-O] source target" >&2' \
  '  exit 1' \
  'fi' \
  'printf "SCP_TRANSFER\n" >> "$FRECKA_DEPLOY_TEST_LOG"' \
  'for argument do printf "<%s>\n" "$argument" >> "$FRECKA_DEPLOY_TEST_LOG"; done' \
  'if [ "${FRECKA_DEPLOY_TEST_SCP_FAIL:-0}" = "1" ]; then exit 1; fi' \
  'exit 0' > "$TEST_BIN/scp"

chmod 700 "$TEST_BIN/ssh" "$TEST_BIN/scp"

assert_log_count() {
  LOG_FILE=$1
  EXPECTED_COUNT=$2
  LOG_LINE=$3
  ACTUAL_COUNT=$(grep -Fxc "$LOG_LINE" "$LOG_FILE" || true)
  if [ "$ACTUAL_COUNT" -ne "$EXPECTED_COUNT" ]; then
    printf 'FEHLER: Erwartete %s Vorkommen von %s, gefunden: %s\n' \
      "$EXPECTED_COUNT" "$LOG_LINE" "$ACTUAL_COUNT" >&2
    exit 1
  fi
}

assert_no_transfer() {
  if grep -Fq 'SCP_TRANSFER' "$1"; then
    printf '%s\n' 'FEHLER: Unerwarteter SCP-Transferaufruf.' >&2
    exit 1
  fi
}

file_mode() {
  if stat -f '%Lp' "$1" >/dev/null 2>&1; then
    stat -f '%Lp' "$1"
  else
    stat -c '%a' "$1"
  fi
}

assert_mode() {
  MODE_PATH=$1
  EXPECTED_MODE=$2
  ACTUAL_MODE=$(file_mode "$MODE_PATH")
  if [ "$ACTUAL_MODE" != "$EXPECTED_MODE" ]; then
    printf 'FEHLER: Erwarteter Modus %s für %s, gefunden: %s\n' \
      "$EXPECTED_MODE" "$MODE_PATH" "$ACTUAL_MODE" >&2
    exit 1
  fi
}

DRY_LOG="$TEST_DIRECTORY/dry-run.log"
DRY_OUTPUT=$(FRECKA_DEPLOY_TEST_LOG="$DRY_LOG" PATH="$TEST_BIN:$PATH" \
  "$TEST_REPOSITORY/scripts/deploy-beta.sh" --dry-run "$TEST_RELEASE_ID")

printf '%s\n' "$DRY_OUTPUT" | grep -Fq 'DRY-RUN BESTANDEN'
printf '%s\n' "$DRY_OUTPUT" | grep -Fq "$REMOTE_STAGING"
printf '%s\n' "$DRY_OUTPUT" | grep -Fq "$REMOTE_FINAL"
assert_log_count "$DRY_LOG" 1 'SSH'
assert_log_count "$DRY_LOG" 1 '<BatchMode=yes>'
assert_log_count "$DRY_LOG" 1 '<PasswordAuthentication=no>'
assert_log_count "$DRY_LOG" 1 '<KbdInteractiveAuthentication=no>'
assert_log_count "$DRY_LOG" 1 '<IdentitiesOnly=yes>'
assert_log_count "$DRY_LOG" 1 '<frecka-synology>'
assert_log_count "$DRY_LOG" 1 'SCP_PROBE'
assert_no_transfer "$DRY_LOG"
if grep -Fq "mkdir '$REMOTE_STAGING'" "$DRY_LOG" || \
  grep -Fq "mv -nT '$REMOTE_STAGING' '$REMOTE_FINAL'" "$DRY_LOG"; then
  printf '%s\n' 'FEHLER: Der Dry-Run hat einen mutierenden Remote-Befehl vorbereitet.' >&2
  exit 1
fi

TRANSFER_LOG="$TEST_DIRECTORY/transfer.log"
TRANSFER_OUTPUT=$(FRECKA_DEPLOY_TEST_LOG="$TRANSFER_LOG" PATH="$TEST_BIN:$PATH" \
  "$TEST_REPOSITORY/scripts/deploy-beta.sh" "$TEST_RELEASE_ID")

printf '%s\n' "$TRANSFER_OUTPUT" | grep -Fq 'BETA-UPLOAD BESTANDEN'
assert_log_count "$TRANSFER_LOG" 3 'SSH'
assert_log_count "$TRANSFER_LOG" 4 '<BatchMode=yes>'
assert_log_count "$TRANSFER_LOG" 4 '<PasswordAuthentication=no>'
assert_log_count "$TRANSFER_LOG" 4 '<KbdInteractiveAuthentication=no>'
assert_log_count "$TRANSFER_LOG" 4 '<IdentitiesOnly=yes>'
assert_log_count "$TRANSFER_LOG" 3 '<frecka-synology>'
assert_log_count "$TRANSFER_LOG" 1 'SCP_TRANSFER'
assert_log_count "$TRANSFER_LOG" 1 '<-O>'
assert_log_count "$TRANSFER_LOG" 0 '<-p>'
assert_log_count "$TRANSFER_LOG" 1 '<-r>'
assert_log_count "$TRANSFER_LOG" 1 "<$RESOLVED_TEST_RELEASE/RELEASE.txt>"
assert_log_count "$TRANSFER_LOG" 1 "<$RESOLVED_TEST_RELEASE/SHA256SUMS>"
assert_log_count "$TRANSFER_LOG" 1 "<$RESOLVED_TEST_RELEASE/site>"
assert_log_count "$TRANSFER_LOG" 1 "<frecka-synology:$REMOTE_STAGING/>"
grep -Fq "mkdir '$REMOTE_STAGING'" "$TRANSFER_LOG"
grep -Fq "chmod 0700 '$REMOTE_STAGING'" "$TRANSFER_LOG"
grep -Fq "sha256sum -c SHA256SUMS" "$TRANSFER_LOG"
grep -Fq 'find . -type f -exec chmod 0444' "$TRANSFER_LOG"
grep -Fq 'find . -type d -exec chmod 0555' "$TRANSFER_LOG"
grep -Fq "mv -nT '$REMOTE_STAGING' '$REMOTE_FINAL'" "$TRANSFER_LOG"

if grep -Fq "<frecka-synology:$REMOTE_FINAL/>" "$TRANSFER_LOG"; then
  printf '%s\n' 'FEHLER: SCP schreibt direkt in das finale Release-Verzeichnis.' >&2
  exit 1
fi

EXISTS_LOG="$TEST_DIRECTORY/final-exists.log"
if FRECKA_DEPLOY_TEST_LOG="$EXISTS_LOG" FRECKA_DEPLOY_TEST_SSH_MODE=final-exists \
  PATH="$TEST_BIN:$PATH" "$TEST_REPOSITORY/scripts/deploy-beta.sh" --dry-run "$TEST_RELEASE_ID" \
  > "$TEST_DIRECTORY/final-exists-output.log" 2>&1; then
  printf '%s\n' 'FEHLER: Ein bestehendes finales Release wurde nicht abgewiesen.' >&2
  exit 1
fi
assert_no_transfer "$EXISTS_LOG"

FAILED_SCP_LOG="$TEST_DIRECTORY/failed-scp.log"
if FRECKA_DEPLOY_TEST_LOG="$FAILED_SCP_LOG" FRECKA_DEPLOY_TEST_SCP_FAIL=1 \
  PATH="$TEST_BIN:$PATH" "$TEST_REPOSITORY/scripts/deploy-beta.sh" "$TEST_RELEASE_ID" \
  > "$TEST_DIRECTORY/failed-scp-output.log" 2>&1; then
  printf '%s\n' 'FEHLER: Ein fehlgeschlagener SCP-Transfer wurde nicht abgewiesen.' >&2
  exit 1
fi
assert_log_count "$FAILED_SCP_LOG" 2 'SSH'
assert_log_count "$FAILED_SCP_LOG" 1 'SCP_TRANSFER'
grep -Fq 'Es wurde kein finales Release erzeugt.' "$TEST_DIRECTORY/failed-scp-output.log"
grep -Fq 'keine automatische Bereinigung' "$TEST_DIRECTORY/failed-scp-output.log"

AUTH_LOG="$TEST_DIRECTORY/auth-fail.log"
if FRECKA_DEPLOY_TEST_LOG="$AUTH_LOG" FRECKA_DEPLOY_TEST_SSH_MODE=auth-fail \
  PATH="$TEST_BIN:$PATH" "$TEST_REPOSITORY/scripts/deploy-beta.sh" --dry-run "$TEST_RELEASE_ID" \
  > "$TEST_DIRECTORY/auth-fail-output.log" 2>&1; then
  printf '%s\n' 'FEHLER: Fehlgeschlagene SSH-Authentifizierung wurde nicht abgewiesen.' >&2
  exit 1
fi
assert_no_transfer "$AUTH_LOG"

if grep -Eq 'rsync|192\.168\.178\.46|Paolo Iannello|id_ed25519' "$TEST_REPOSITORY/scripts/deploy-beta.sh"; then
  printf '%s\n' 'FEHLER: Der produktive Pfad enthält rsync oder umgeht den SSH-Alias.' >&2
  exit 1
fi
if grep -Eq -- '(^|[[:space:]])(--delete|sudo)([[:space:]]|$)' "$TEST_REPOSITORY/scripts/deploy-beta.sh"; then
  printf '%s\n' 'FEHLER: Der produktive Pfad enthält eine verbotene Option.' >&2
  exit 1
fi
if grep -Eq 'chmod[[:space:]]+0?777' "$TEST_REPOSITORY/scripts/deploy-beta.sh"; then
  printf '%s\n' 'FEHLER: Der produktive Pfad enthält einen pauschalen Modus 777.' >&2
  exit 1
fi

# Der serverseitige Lifecycle wird lokal ohne Netzwerk nachgestellt: Das
# Staging ist beim Upload exklusiv schreibbar, der geprüfte Stand danach
# bereits vor dem atomaren Namenswechsel vollständig read-only.
PERMISSION_FIXTURE="$TEST_DIRECTORY/permission-lifecycle"
mkdir -p "$PERMISSION_FIXTURE/site"
printf '%s\n' 'Release' > "$PERMISSION_FIXTURE/RELEASE.txt"
printf '%s\n' 'App' > "$PERMISSION_FIXTURE/site/index.html"
chmod 0700 "$PERMISSION_FIXTURE"
assert_mode "$PERMISSION_FIXTURE" 700
find "$PERMISSION_FIXTURE" -type f -exec chmod 0444 {} \;
find "$PERMISSION_FIXTURE" -type d -exec chmod 0555 {} \;
assert_mode "$PERMISSION_FIXTURE" 555
assert_mode "$PERMISSION_FIXTURE/site" 555
assert_mode "$PERMISSION_FIXTURE/RELEASE.txt" 444
assert_mode "$PERMISSION_FIXTURE/site/index.html" 444
if [ -w "$PERMISSION_FIXTURE" ] || [ -w "$PERMISSION_FIXTURE/RELEASE.txt" ]; then
  printf '%s\n' 'FEHLER: Der gehärtete Teststand ist weiterhin schreibbar.' >&2
  exit 1
fi

printf '%s\n' 'DEPLOY-006-Smoke-Test: PASS (Staging 0700, SCP, SHA, Härtung 0444/0555, No-Clobber, Fehlerpfade)'
