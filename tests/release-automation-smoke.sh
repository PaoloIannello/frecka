#!/bin/sh

# Isolierter Regressionstest für RELEASE-AUTOMATION-001. Alle Repositories,
# Tags, Origins und Deployment-Aufrufe liegen in einem temporären Testbaum.
# Es gibt weder einen Netzwerkzugriff noch einen Synology-Transfer.

set -eu

SOURCE_ROOT=$(CDPATH= cd -P "$(dirname "$0")/.." && pwd)
TEST_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/frecka-release-automation.XXXXXX")

cleanup() {
  chmod -R u+w "$TEST_ROOT" 2>/dev/null || true
  rm -rf "$TEST_ROOT"
}

trap cleanup 0
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

fail() {
  printf 'FEHLER: %s\n' "$1" >&2
  exit 1
}

file_mode() {
  if stat -f '%Lp' "$1" >/dev/null 2>&1; then
    stat -f '%Lp' "$1"
  else
    stat -c '%a' "$1"
  fi
}

create_fixture() {
  fixture_name=$1
  FIXTURE_BASE="$TEST_ROOT/$fixture_name"
  FIXTURE_REPO="$FIXTURE_BASE/repository"
  FIXTURE_ORIGIN="$FIXTURE_BASE/origin.git"
  FIXTURE_LOG="$FIXTURE_BASE/release.log"

  mkdir -p "$FIXTURE_REPO/scripts" "$FIXTURE_REPO/docs/releases" "$FIXTURE_REPO/js"
  cp "$SOURCE_ROOT/scripts/release-beta.sh" "$FIXTURE_REPO/scripts/release-beta.sh"
  cp "$SOURCE_ROOT/scripts/build-release.sh" "$FIXTURE_REPO/scripts/build-release.sh"

  printf '%s\n' \
    '#!/bin/sh' \
    'set -eu' \
    'printf "%s\n" "VERIFY" >> "$FRECKA_RELEASE_TEST_LOG"' \
    'if [ "${FRECKA_RELEASE_TEST_VERIFY_FAIL:-0}" = "1" ]; then exit 1; fi' \
    'printf "%s\n" "RELEASE-PRÜFUNG BESTANDEN"' > "$FIXTURE_REPO/scripts/verify-release.sh"

  printf '%s\n' \
    '#!/bin/sh' \
    'set -eu' \
    'mode=${1:-}' \
    'case "$mode" in' \
    '  --check-target)' \
    '    printf "%s\n" "CHECK_TARGET:$2" >> "$FRECKA_RELEASE_TEST_LOG"' \
    '    [ "${FRECKA_RELEASE_TEST_DEPLOY_FAIL:-}" != "target" ] || exit 1' \
    '    printf "%s\n" "ZIELPRÜFUNG BESTANDEN"' \
    '    ;;' \
    '  --dry-run)' \
    '    printf "%s\n" "DRY_RUN:$2" >> "$FRECKA_RELEASE_TEST_LOG"' \
    '    [ "${FRECKA_RELEASE_TEST_DEPLOY_FAIL:-}" != "dry-run" ] || exit 1' \
    '    printf "%s\n" "DRY-RUN BESTANDEN"' \
    '    ;;' \
    '  *)' \
    '    printf "%s\n" "UPLOAD:$mode" >> "$FRECKA_RELEASE_TEST_LOG"' \
    '    [ "${FRECKA_RELEASE_TEST_DEPLOY_FAIL:-}" != "upload" ] || exit 1' \
    '    printf "%s\n" "BETA-UPLOAD BESTANDEN"' \
    '    ;;' \
    'esac' > "$FIXTURE_REPO/scripts/deploy-beta.sh"

  chmod 0755 "$FIXTURE_REPO/scripts/"*.sh

  printf '%s\n' \
    'index.html' \
    'js/backup.js' \
    'js/data.js' \
    'js/documents.js' \
    'js/export.js' \
    'js/persistence.js' \
    'js/public-documents.js' \
    'js/qr.js' \
    'js/sharing.js' \
    'manifest.webmanifest' \
    'service-worker.js' > "$FIXTURE_REPO/scripts/release-files.txt"

  printf '%s\n' \
    '<!doctype html>' \
    '<html><head>' \
    '  <title>FRECKA – RELEASE-001</title>' \
    '  <link rel="manifest" href="manifest.webmanifest?v=release001-1">' \
    '</head><body><script src="js/data.js?v=release001-1"></script></body></html>' > "$FIXTURE_REPO/index.html"
  printf '%s\n' '{"name":"FRECKA","start_url":"./index.html#/home","scope":"./"}' > "$FIXTURE_REPO/manifest.webmanifest"
  printf '%s\n' \
    '"use strict";' \
    'const APP_SHELL_CACHE_PREFIX = "frecka-app-shell-";' \
    'const APP_SHELL_CACHE = `${APP_SHELL_CACHE_PREFIX}1.2.3-release001-1`;' \
    'const LEGACY_AUTO_ACTIVATION_FOR_SERVICEWORKER_002 = false;' > "$FIXTURE_REPO/service-worker.js"
  printf '%s\n' 'const FRECKA_APP_META = {' '  version: "1.2.3",' '  build: "RELEASE-001"' '};' > "$FIXTURE_REPO/js/data.js"
  printf '%s\n' 'const constants = Object.freeze({' '  databaseVersion: 5,' '  formatVersion: 1' '});' > "$FIXTURE_REPO/js/persistence.js"
  printf '%s\n' 'const constants = Object.freeze({' '  backupFormat: "FRECKA_ENCRYPTED_BACKUP",' '  backupFormatVersion: 1' '});' > "$FIXTURE_REPO/js/backup.js"
  printf '%s\n' 'const constants = Object.freeze({' '  exportFormat: "FRECKA_EXPORT",' '  exportFormatVersion: 1' '});' > "$FIXTURE_REPO/js/export.js"
  printf '%s\n' 'const DOCUMENT_VERSION = "DOCUMENT-001";' > "$FIXTURE_REPO/js/documents.js"
  printf '%s\n' 'const QR_VERSION = "QR-001";' > "$FIXTURE_REPO/js/qr.js"
  printf '%s\n' \
    'const PUBLIC_DOCUMENT_VERSION = "QR-002";' \
    'const FORMAT_MARKER = "FPD";' \
    'const FORMAT_VERSION = 1;' > "$FIXTURE_REPO/js/public-documents.js"
  printf '%s\n' 'const SHARE_VERSION = "COMM-001";' > "$FIXTURE_REPO/js/sharing.js"

  printf '%s\n' \
    '# FRECKA 1.2.3 – RELEASE-001' \
    '' \
    'Status: Für automatisierten Beta-Release freigegeben; Geräteabnahme ausstehend' \
    'Beta-Release-Freigabe: FREIGEGEBEN' \
    'Lokale Release-Prüfung: BESTANDEN' \
    'Release-Verantwortung: Test-Release-Verantwortung' \
    'Unmittelbare Vorgängerversion: 1.2.2' \
    'Datenbankschema-Migration erforderlich: nein' \
    'Bestandsprüfung vor In-place-Beta-Test: ja' \
    '' \
    '## Bekannte Einschränkungen' \
    '' \
    '- Reale Geräteabnahme steht noch aus.' > "$FIXTURE_REPO/docs/releases/1.2.3.md"

  printf '%s\n' '/tmp/' > "$FIXTURE_REPO/.gitignore"

  git init -q --bare "$FIXTURE_ORIGIN"
  (
    cd "$FIXTURE_REPO"
    git init -q
    git branch -M main
    git config user.name 'FRECKA Release Test'
    git config user.email 'release-test@invalid.example'
    git add .
    git commit -q -m 'Prepare release candidate'
    git remote add origin "$FIXTURE_ORIGIN"
    git push -q -u origin main
  )
}

assert_no_release_write() {
  fixture_repo=$1
  fixture_log=$2
  if git -C "$fixture_repo" show-ref --verify --quiet refs/tags/v1.2.3; then
    fail "Unerwarteter lokaler Release-Tag in $fixture_repo"
  fi
  if [ -e "$fixture_repo/tmp/releases" ]; then
    find "$fixture_repo/tmp/releases" -mindepth 1 -print | grep -q . &&
      fail "Unerwartetes Release-Artefakt in $fixture_repo"
  fi
  if [ -f "$fixture_log" ] && grep -Eq 'DRY_RUN:|UPLOAD:' "$fixture_log"; then
    fail "Unerwarteter Deployment-Aufruf in $fixture_log"
  fi
}

run_expect_failure() {
  output_file=$1
  shift
  if "$@" > "$output_file" 2>&1; then
    fail "Erwarteter Abbruch ist ausgeblieben: $*"
  fi
}

# Vollständiger Erfolgsweg in einem rein lokalen Test-Repository.
create_fixture success
SUCCESS_OUTPUT="$FIXTURE_BASE/success-output.log"
if ! (
  cd "$FIXTURE_REPO"
  FRECKA_RELEASE_TEST_LOG="$FIXTURE_LOG" ./scripts/release-beta.sh
) > "$SUCCESS_OUTPUT" 2>&1; then
  sed -n '1,240p' "$SUCCESS_OUTPUT" >&2
  fail 'Der isolierte Erfolgsweg ist fehlgeschlagen.'
fi

grep -Fq 'BETA-RELEASE BESTANDEN' "$SUCCESS_OUTPUT"
SUCCESS_COMMIT=$(git -C "$FIXTURE_REPO" rev-parse HEAD)
SUCCESS_SHORT=$(printf '%.7s' "$SUCCESS_COMMIT")
SUCCESS_ID="1.2.3-$SUCCESS_SHORT"
SUCCESS_ARTIFACT="$FIXTURE_REPO/tmp/releases/$SUCCESS_ID"
[ "$(git -C "$FIXTURE_REPO" cat-file -t refs/tags/v1.2.3)" = 'tag' ]
[ "$(git -C "$FIXTURE_REPO" rev-parse 'v1.2.3^{commit}')" = "$SUCCESS_COMMIT" ]
[ "$(git -C "$FIXTURE_REPO" for-each-ref --format='%(contents:subject)' refs/tags/v1.2.3)" = 'FRECKA 1.2.3 - RELEASE-001' ]
[ "$(git --git-dir="$FIXTURE_ORIGIN" rev-parse 'v1.2.3^{commit}')" = "$SUCCESS_COMMIT" ]
[ -d "$SUCCESS_ARTIFACT/site" ]
[ ! -e "$SUCCESS_ARTIFACT/site/docs" ]
[ ! -e "$SUCCESS_ARTIFACT/site/tests" ]
[ "$(file_mode "$SUCCESS_ARTIFACT")" = '555' ]
[ "$(file_mode "$SUCCESS_ARTIFACT/RELEASE.txt")" = '444' ]
(
  cd "$SUCCESS_ARTIFACT"
  shasum -a 256 -c SHA256SUMS >/dev/null
)
[ "$(grep -Fxc "CHECK_TARGET:$SUCCESS_ID" "$FIXTURE_LOG")" -eq 2 ]
[ "$(grep -Fxc 'VERIFY' "$FIXTURE_LOG")" -eq 1 ]
[ "$(grep -Fxc "DRY_RUN:$SUCCESS_ID" "$FIXTURE_LOG")" -eq 1 ]
[ "$(grep -Fxc "UPLOAD:$SUCCESS_ID" "$FIXTURE_LOG")" -eq 1 ]

# Derselbe Tag erzeugt in einem zweiten Klon exakt dieselben Inhalte.
REPRODUCE_REPO="$FIXTURE_BASE/reproduce"
git clone -q -b main "$FIXTURE_ORIGIN" "$REPRODUCE_REPO"
(
  cd "$REPRODUCE_REPO"
  ./scripts/build-release.sh v1.2.3 >/dev/null
)
REPRODUCED_ARTIFACT="$REPRODUCE_REPO/tmp/releases/$SUCCESS_ID"
cmp -s "$SUCCESS_ARTIFACT/RELEASE.txt" "$REPRODUCED_ARTIFACT/RELEASE.txt"
cmp -s "$SUCCESS_ARTIFACT/SHA256SUMS" "$REPRODUCED_ARTIFACT/SHA256SUMS"
diff -rq "$SUCCESS_ARTIFACT/site" "$REPRODUCED_ARTIFACT/site" >/dev/null

# Dirty Working Tree.
create_fixture dirty
printf '%s\n' 'dirty' > "$FIXTURE_REPO/untracked.txt"
run_expect_failure "$FIXTURE_BASE/output.log" sh -c "cd '$FIXTURE_REPO' && FRECKA_RELEASE_TEST_LOG='$FIXTURE_LOG' ./scripts/release-beta.sh"
grep -Fq 'Git-Arbeitsbaum ist nicht sauber' "$FIXTURE_BASE/output.log"
assert_no_release_write "$FIXTURE_REPO" "$FIXTURE_LOG"

# Falscher Branch.
create_fixture branch
git -C "$FIXTURE_REPO" checkout -q -b feature/test
run_expect_failure "$FIXTURE_BASE/output.log" sh -c "cd '$FIXTURE_REPO' && FRECKA_RELEASE_TEST_LOG='$FIXTURE_LOG' ./scripts/release-beta.sh"
grep -Fq 'ausschließlich auf main' "$FIXTURE_BASE/output.log"
assert_no_release_write "$FIXTURE_REPO" "$FIXTURE_LOG"

# main ist lokal ahead.
create_fixture ahead
(
  cd "$FIXTURE_REPO"
  printf '%s\n' 'ahead' > ahead.txt
  git add ahead.txt
  git commit -q -m 'Local ahead commit'
)
run_expect_failure "$FIXTURE_BASE/output.log" sh -c "cd '$FIXTURE_REPO' && FRECKA_RELEASE_TEST_LOG='$FIXTURE_LOG' ./scripts/release-beta.sh"
grep -Fq 'main und origin/main sind nicht identisch' "$FIXTURE_BASE/output.log"
assert_no_release_write "$FIXTURE_REPO" "$FIXTURE_LOG"

# main ist gegenüber origin behind.
create_fixture behind
ADVANCE_REPO="$FIXTURE_BASE/advance"
git clone -q "$FIXTURE_ORIGIN" "$ADVANCE_REPO"
(
  cd "$ADVANCE_REPO"
  git config user.name 'FRECKA Release Test'
  git config user.email 'release-test@invalid.example'
  printf '%s\n' 'remote ahead' > remote.txt
  git add remote.txt
  git commit -q -m 'Remote ahead commit'
  git push -q origin main
)
run_expect_failure "$FIXTURE_BASE/output.log" sh -c "cd '$FIXTURE_REPO' && FRECKA_RELEASE_TEST_LOG='$FIXTURE_LOG' ./scripts/release-beta.sh"
grep -Fq 'main und origin/main sind nicht identisch' "$FIXTURE_BASE/output.log"
assert_no_release_write "$FIXTURE_REPO" "$FIXTURE_LOG"

# Fehlende Release-Dokumentation.
create_fixture missing_document
(
  cd "$FIXTURE_REPO"
  git rm -q docs/releases/1.2.3.md
  git commit -q -m 'Remove release document'
  git push -q origin main
)
run_expect_failure "$FIXTURE_BASE/output.log" sh -c "cd '$FIXTURE_REPO' && FRECKA_RELEASE_TEST_LOG='$FIXTURE_LOG' ./scripts/release-beta.sh"
grep -Fq 'Release-Dokumentation fehlt' "$FIXTURE_BASE/output.log"
assert_no_release_write "$FIXTURE_REPO" "$FIXTURE_LOG"

# Widersprüchlicher Freigabestatus.
create_fixture contradictory_document
(
  cd "$FIXTURE_REPO"
  sed 's/Status: Für automatisierten Beta-Release freigegeben; Geräteabnahme ausstehend/Status: Release-Vorbereitung; NO-GO/' docs/releases/1.2.3.md > docs/releases/1.2.3.md.new
  mv docs/releases/1.2.3.md.new docs/releases/1.2.3.md
  git add docs/releases/1.2.3.md
  git commit -q -m 'Reject release candidate'
  git push -q origin main
)
run_expect_failure "$FIXTURE_BASE/output.log" sh -c "cd '$FIXTURE_REPO' && FRECKA_RELEASE_TEST_LOG='$FIXTURE_LOG' ./scripts/release-beta.sh"
grep -Fq 'Release-Dokumentation widerspricht' "$FIXTURE_BASE/output.log"
assert_no_release_write "$FIXTURE_REPO" "$FIXTURE_LOG"

# Bereits vorhandener lokaler Tag.
create_fixture local_tag
git -C "$FIXTURE_REPO" tag -a v1.2.3 -m 'Existing local tag'
run_expect_failure "$FIXTURE_BASE/output.log" sh -c "cd '$FIXTURE_REPO' && FRECKA_RELEASE_TEST_LOG='$FIXTURE_LOG' ./scripts/release-beta.sh"
grep -Fq 'existiert bereits lokal' "$FIXTURE_BASE/output.log"

# Bereits vorhandener Remote-Tag, lokal bewusst nicht vorhanden.
create_fixture remote_tag
git -C "$FIXTURE_REPO" tag -a v1.2.3 -m 'Existing remote tag'
git -C "$FIXTURE_REPO" push -q origin refs/tags/v1.2.3:refs/tags/v1.2.3
git -C "$FIXTURE_REPO" tag -d v1.2.3 >/dev/null
run_expect_failure "$FIXTURE_BASE/output.log" sh -c "cd '$FIXTURE_REPO' && FRECKA_RELEASE_TEST_LOG='$FIXTURE_LOG' ./scripts/release-beta.sh"
grep -Fq 'existiert bereits auf origin' "$FIXTURE_BASE/output.log"
assert_no_release_write "$FIXTURE_REPO" "$FIXTURE_LOG"

# Vorhandenes lokales Artefakt.
create_fixture local_artifact
LOCAL_ARTIFACT_SHORT=$(printf '%.7s' "$(git -C "$FIXTURE_REPO" rev-parse HEAD)")
mkdir -p "$FIXTURE_REPO/tmp/releases/1.2.3-$LOCAL_ARTIFACT_SHORT"
run_expect_failure "$FIXTURE_BASE/output.log" sh -c "cd '$FIXTURE_REPO' && FRECKA_RELEASE_TEST_LOG='$FIXTURE_LOG' ./scripts/release-beta.sh"
grep -Fq 'lokale Release-Artefakt existiert bereits' "$FIXTURE_BASE/output.log"

# Ungültige Allowlist.
create_fixture bad_allowlist
(
  cd "$FIXTURE_REPO"
  printf '%s\n' '../secret' >> scripts/release-files.txt
  git add scripts/release-files.txt
  git commit -q -m 'Break release allowlist'
  git push -q origin main
)
run_expect_failure "$FIXTURE_BASE/output.log" sh -c "cd '$FIXTURE_REPO' && FRECKA_RELEASE_TEST_LOG='$FIXTURE_LOG' ./scripts/release-beta.sh"
grep -Fq 'Allowlist enthält einen ungültigen' "$FIXTURE_BASE/output.log"
assert_no_release_write "$FIXTURE_REPO" "$FIXTURE_LOG"

# Serverseitige Release-ID ist bereits belegt: Stopp vor Tag und Artefakt.
create_fixture target_exists
run_expect_failure "$FIXTURE_BASE/output.log" sh -c "cd '$FIXTURE_REPO' && FRECKA_RELEASE_TEST_LOG='$FIXTURE_LOG' FRECKA_RELEASE_TEST_DEPLOY_FAIL=target ./scripts/release-beta.sh"
grep -Fq 'Synology nicht frei' "$FIXTURE_BASE/output.log"
assert_no_release_write "$FIXTURE_REPO" "$FIXTURE_LOG"

# Dry-Run-Fehler: niemals echter Upload.
create_fixture dry_run_failure
run_expect_failure "$FIXTURE_BASE/output.log" sh -c "cd '$FIXTURE_REPO' && FRECKA_RELEASE_TEST_LOG='$FIXTURE_LOG' FRECKA_RELEASE_TEST_DEPLOY_FAIL=dry-run ./scripts/release-beta.sh"
grep -Fq 'Beta-Dry-Run ist fehlgeschlagen' "$FIXTURE_BASE/output.log"
grep -Fq 'DRY_RUN:' "$FIXTURE_LOG"
if grep -Fq 'UPLOAD:' "$FIXTURE_LOG"; then
  fail 'Nach fehlgeschlagenem Dry-Run wurde ein Upload gestartet.'
fi

# Tag-Push-Fehler: lokaler Tag bleibt sichtbar, kein Artefakt und kein Deploy.
create_fixture tag_push_failure
printf '%s\n' \
  '#!/bin/sh' \
  'while read old_value new_value ref_name; do' \
  '  case "$ref_name" in refs/tags/*) exit 1 ;; esac' \
  'done' \
  'exit 0' > "$FIXTURE_ORIGIN/hooks/pre-receive"
chmod 0755 "$FIXTURE_ORIGIN/hooks/pre-receive"
run_expect_failure "$FIXTURE_BASE/output.log" sh -c "cd '$FIXTURE_REPO' && FRECKA_RELEASE_TEST_LOG='$FIXTURE_LOG' ./scripts/release-beta.sh"
grep -Fq 'Tag-Push ist fehlgeschlagen' "$FIXTURE_BASE/output.log"
grep -Fq 'lokale annotierte Tag' "$FIXTURE_BASE/output.log"
git -C "$FIXTURE_REPO" show-ref --verify --quiet refs/tags/v1.2.3
[ -z "$(git --git-dir="$FIXTURE_ORIGIN" tag --list v1.2.3)" ]
if [ -e "$FIXTURE_REPO/tmp/releases" ]; then
  find "$FIXTURE_REPO/tmp/releases" -mindepth 1 -print | grep -q . && fail 'Nach Tag-Push-Fehler blieb ein Artefakt zurück.'
fi
if [ -f "$FIXTURE_LOG" ] && grep -Eq 'DRY_RUN:|UPLOAD:' "$FIXTURE_LOG"; then
  fail 'Nach Tag-Push-Fehler wurde ein Deployment gestartet.'
fi

# Statische Sicherheitsgrenzen.
if grep -Eq -- 'git[[:space:]]+(tag|push).*--force|git[[:space:]]+tag[[:space:]]+-f' "$SOURCE_ROOT/scripts/release-beta.sh"; then
  fail 'Der Release-Orchestrator enthält einen Tag-Force-Pfad.'
fi
if grep -Eqi 'synowebapi|webstation.*(set|write|update)|app[.]frecka[.]app' "$SOURCE_ROOT/scripts/release-beta.sh"; then
  fail 'Der Release-Orchestrator enthält eine Web-Station- oder Produktionsumschaltung.'
fi

printf '%s\n' 'RELEASE-AUTOMATION-001-Smoke-Test: PASS (Preflight, Tag-No-Clobber, Artefakt, Dry-Run-Gate, Fehlerzustände, kein Netzwerk)'
