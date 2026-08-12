#!/bin/sh

# Orchestriert nach einem bereits geprüften und gepushten Release-Commit:
# Preflight -> Tests -> annotierter Tag -> Tag-Push -> Artefakt -> Beta-Upload.
# Web Station, Produktion und reale Geräteabnahme bleiben manuell.

set -eu

PROGRAM_NAME=${0##*/}
SCRIPT_DIR=$(CDPATH= cd -P "$(dirname "$0")" && pwd)
REPOSITORY_ROOT=$(CDPATH= cd -P "$SCRIPT_DIR/.." && pwd)
DEPLOY_SCRIPT="$SCRIPT_DIR/deploy-beta.sh"
BUILD_SCRIPT="$SCRIPT_DIR/build-release.sh"
VERIFY_SCRIPT="$SCRIPT_DIR/verify-release.sh"
ALLOWLIST_FILE="$SCRIPT_DIR/release-files.txt"

TAG_CREATED=0
TAG_PUSHED=0
ARTIFACT_CREATED=0
RELEASE_TAG=''
RELEASE_ID=''
FINAL_RELEASE=''

usage() {
  cat <<EOF
Aufruf:
  $PROGRAM_NAME

Der Befehl leitet Version und Build aus dem vollständig geprüften HEAD auf main ab.
EOF
}

fail() {
  printf 'NO-GO: %s\n' "$1" >&2
  exit 1
}

report_failed_state() {
  status=$1
  [ "$status" -ne 0 ] || return
  if [ "$TAG_PUSHED" -eq 1 ]; then
    printf '\nSICHERER ABBRUCH: Der unveränderliche Tag %s ist bereits auf origin veröffentlicht.\n' "$RELEASE_TAG" >&2
    printf 'Er wird nicht verschoben oder gelöscht. Ursache prüfen und nötigenfalls eine neue Patchversion vorbereiten.\n' >&2
  elif [ "$TAG_CREATED" -eq 1 ]; then
    printf '\nSICHERER ABBRUCH: Der lokale annotierte Tag %s wurde erzeugt; ein erfolgreicher Push ist nicht bestätigt.\n' "$RELEASE_TAG" >&2
    printf 'Tagzustand manuell prüfen. Das Skript löscht oder verschiebt den Tag nicht und darf nicht blind erneut gestartet werden.\n' >&2
  fi
  if [ "$ARTIFACT_CREATED" -eq 1 ]; then
    printf 'Das lokale geprüfte Artefakt bleibt unverändert erhalten: %s/\n' "$FINAL_RELEASE" >&2
  fi
}

trap 'release_status=$?; report_failed_state "$release_status"; exit "$release_status"' 0
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

if [ "$#" -ne 0 ]; then
  usage >&2
  exit 2
fi

cd "$REPOSITORY_ROOT"

for required_file in "$DEPLOY_SCRIPT" "$BUILD_SCRIPT" "$VERIFY_SCRIPT" "$ALLOWLIST_FILE"; do
  [ -f "$required_file" ] || fail "Erforderliche Release-Datei fehlt: $required_file"
done

for required_command in git awk sed sort grep find uniq mktemp rm head; do
  command -v "$required_command" >/dev/null 2>&1 || fail "Benötigtes Programm fehlt: $required_command"
done

document_field() {
  key=$1
  awk -v key="$key" '
    index($0, key ":") == 1 {
      value = substr($0, length(key) + 2)
      sub(/^[[:space:]]+/, "", value)
      sub(/[[:space:]]+$/, "", value)
      print value
      exit
    }
  ' "$RELEASE_DOCUMENT"
}

remote_main_commit() {
  remote_line=$(git ls-remote --heads origin refs/heads/main) ||
    fail 'origin/main konnte nicht verlässlich gelesen werden.'
  remote_commit=$(printf '%s\n' "$remote_line" | awk '$2 == "refs/heads/main" { print $1 }')
  case "$remote_commit" in
    [0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]) ;;
    *) fail 'origin/main liefert keinen eindeutigen Commit.' ;;
  esac
  printf '%s\n' "$remote_commit"
}

remote_tag_lines() {
  git ls-remote --tags origin "refs/tags/$RELEASE_TAG" "refs/tags/$RELEASE_TAG^{}" ||
    fail "Der Tagzustand auf origin konnte nicht geprüft werden: $RELEASE_TAG"
}

validate_allowlist() {
  temp_allowlist=$(mktemp "${TMPDIR:-/tmp}/frecka-allowlist.XXXXXX") ||
    fail 'Temporäre Allowlist-Prüfung konnte nicht vorbereitet werden.'
  raw_allowlist="$temp_allowlist.raw"
  if ! awk '
    /^[[:space:]]*$/ { next }
    /^[[:space:]]*#/ { next }
    {
      path = $0
      sub(/^[[:space:]]+/, "", path)
      sub(/[[:space:]]+$/, "", path)
      if (path == "" || path ~ /^\// || path ~ /(^|\/)\.\.(\/|$)/ || path ~ /\\/) exit 1
      if (path !~ /^(index\.html|styles\.css|manifest\.webmanifest|service-worker\.js|icons\/[A-Za-z0-9._-]+\.png|js\/[A-Za-z0-9._-]+\.js|vendor\/[A-Za-z0-9._-]+\.(js|txt|md|markdown))$/) exit 1
      print path
    }
  ' "$ALLOWLIST_FILE" > "$raw_allowlist"; then
    rm -f "$temp_allowlist" "$raw_allowlist"
    fail 'Die Laufzeit-Allowlist enthält einen ungültigen oder unsicheren Pfad.'
  fi
  LC_ALL=C sort "$raw_allowlist" > "$temp_allowlist"
  rm -f "$raw_allowlist"
  [ -s "$temp_allowlist" ] || {
    rm -f "$temp_allowlist"
    fail 'Die Laufzeit-Allowlist ist leer.'
  }
  [ -z "$(uniq -d "$temp_allowlist")" ] || {
    rm -f "$temp_allowlist"
    fail 'Die Laufzeit-Allowlist enthält doppelte Pfade.'
  }
  while IFS= read -r release_path; do
    [ -f "$release_path" ] || {
      rm -f "$temp_allowlist"
      fail "Allowlist-Datei fehlt: $release_path"
    }
    [ ! -L "$release_path" ] || {
      rm -f "$temp_allowlist"
      fail "Symlinks sind in der Laufzeit-Allowlist unzulässig: $release_path"
    }
    git cat-file -e "HEAD:$release_path" 2>/dev/null || {
      rm -f "$temp_allowlist"
      fail "Allowlist-Datei ist nicht im Release-Commit enthalten: $release_path"
    }
  done < "$temp_allowlist"
  rm -f "$temp_allowlist"
}

validate_source_metadata() {
  product_version_values=$(sed -n 's/^[[:space:]]*version:[[:space:]]*"\([^"]*\)".*/\1/p' js/data.js)
  build_name_values=$(sed -n 's/^[[:space:]]*build:[[:space:]]*"\([^"]*\)".*/\1/p' js/data.js)
  [ "$(printf '%s\n' "$product_version_values" | sed '/^$/d' | wc -l | tr -d ' ')" = '1' ] ||
    fail 'Die Produktversion ist in js/data.js nicht eindeutig.'
  [ "$(printf '%s\n' "$build_name_values" | sed '/^$/d' | wc -l | tr -d ' ')" = '1' ] ||
    fail 'Die Buildkennung ist in js/data.js nicht eindeutig.'
  PRODUCT_VERSION=$product_version_values
  BUILD_NAME=$build_name_values
  printf '%s\n' "$PRODUCT_VERSION" | LC_ALL=C grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z]+(\.[0-9A-Za-z]+)*)?$' ||
    fail "Produktversion ist nicht gültig: $PRODUCT_VERSION"
  printf '%s\n' "$BUILD_NAME" | LC_ALL=C grep -Eq '^[A-Za-z0-9]+([._-][A-Za-z0-9]+)*$' ||
    fail "Buildkennung ist nicht gültig: $BUILD_NAME"

  RELEASE_TAG="v$PRODUCT_VERSION"
  RELEASE_DOCUMENT="docs/releases/$PRODUCT_VERSION.md"
  [ -f "$RELEASE_DOCUMENT" ] || fail "Release-Dokumentation fehlt: $RELEASE_DOCUMENT"
  git cat-file -e "HEAD:$RELEASE_DOCUMENT" 2>/dev/null ||
    fail "Release-Dokumentation ist nicht im Release-Commit enthalten: $RELEASE_DOCUMENT"
  grep -Fq "# FRECKA $PRODUCT_VERSION" "$RELEASE_DOCUMENT" ||
    fail 'Release-Dokumentation nennt nicht die Produktversion aus js/data.js.'
  grep -Fq "$BUILD_NAME" "$RELEASE_DOCUMENT" ||
    fail 'Release-Dokumentation nennt nicht die Buildkennung aus js/data.js.'

  RELEASE_STATUS=$(document_field 'Status')
  case "$RELEASE_STATUS" in
    'Für automatisierten Beta-Release freigegeben'*) ;;
    *) fail 'Release-Dokumentation widerspricht der Freigabe: Status ist nicht für den automatisierten Beta-Release freigegeben.' ;;
  esac
  [ "$(document_field 'Beta-Release-Freigabe')" = 'FREIGEGEBEN' ] ||
    fail 'Release-Dokumentation widerspricht der Freigabe: Beta-Release-Freigabe fehlt.'
  [ "$(document_field 'Lokale Release-Prüfung')" = 'BESTANDEN' ] ||
    fail 'Release-Dokumentation widerspricht der Freigabe: lokaler Prüfnachweis ist nicht bestanden.'
  [ -n "$(document_field 'Release-Verantwortung')" ] || fail 'Release-Verantwortung fehlt.'
  [ -n "$(document_field 'Unmittelbare Vorgängerversion')" ] || fail 'Unmittelbare Vorgängerversion fehlt.'
  case "$(document_field 'Datenbankschema-Migration erforderlich')" in ja|nein) ;; *) fail 'Angabe zur Datenbankschema-Migration fehlt.' ;; esac
  case "$(document_field 'Bestandsprüfung vor In-place-Beta-Test')" in ja|nein) ;; *) fail 'Angabe zur In-place-Bestandsprüfung fehlt.' ;; esac
  awk '
    /^## Bekannte Einschränkungen[[:space:]]*$/ { section = 1; next }
    section && /^## / { exit }
    section && /^- / { found = 1 }
    END { exit found ? 0 : 1 }
  ' "$RELEASE_DOCUMENT" || fail 'Strukturierte bekannte Einschränkungen fehlen in der Release-Dokumentation.'

  grep -Fqx "  <title>FRECKA – $BUILD_NAME</title>" index.html ||
    fail 'HTML-Titel und Buildkennung stimmen nicht überein.'
  ASSET_KEYS=$(sed -n 's/.*[?]v=\([^"&]*\).*/\1/p' index.html | LC_ALL=C sort -u)
  [ "$(printf '%s\n' "$ASSET_KEYS" | sed '/^$/d' | wc -l | tr -d ' ')" = '1' ] ||
    fail 'index.html verwendet keine eindeutige Asset-Kennung.'
  ASSET_KEY=$(printf '%s\n' "$ASSET_KEYS" | sed -n '1p')
  APP_SHELL_CACHE=$(sed -n 's/^const APP_SHELL_CACHE = `${APP_SHELL_CACHE_PREFIX}\([^`]*\)`;.*/frecka-app-shell-\1/p' service-worker.js | head -n 1)
  [ "$APP_SHELL_CACHE" = "frecka-app-shell-$PRODUCT_VERSION-$ASSET_KEY" ] ||
    fail 'Produktversion, Asset-Kennung und App-Shell-Cache stimmen nicht überein.'
  if grep -Eq 'LEGACY_AUTO_ACTIVATION_FOR_SERVICEWORKER_002[[:space:]]*=[[:space:]]*true' service-worker.js; then
    fail 'Die reale Altclient-Übergangsabnahme ist bestätigt; die SERVICEWORKER-002-Legacy-Brücke muss vor dem nächsten Release entfernt werden.'
  fi
}

preflight() {
  printf '\nPreflight\n'
  [ -z "$(git status --porcelain --untracked-files=all)" ] || fail 'Der Git-Arbeitsbaum ist nicht sauber.'
  [ "$(git branch --show-current)" = 'main' ] || fail 'Der Release darf ausschließlich auf main gestartet werden.'

  HEAD_COMMIT=$(git rev-parse --verify 'HEAD^{commit}') || fail 'HEAD ist kein eindeutiger Commit.'
  case "$HEAD_COMMIT" in
    [0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]) ;;
    *) fail 'HEAD besitzt keinen vollständigen SHA-1-Bezeichner.' ;;
  esac
  SHORT_COMMIT=$(printf '%.7s' "$HEAD_COMMIT")
  [ "$(git rev-parse --verify "$SHORT_COMMIT^{commit}" 2>/dev/null || true)" = "$HEAD_COMMIT" ] ||
    fail "Der 7-stellige Commit-Kurzhash ist nicht eindeutig: $SHORT_COMMIT"

  ORIGIN_MAIN=$(remote_main_commit)
  [ "$ORIGIN_MAIN" = "$HEAD_COMMIT" ] ||
    fail "main und origin/main sind nicht identisch (lokal $HEAD_COMMIT, remote $ORIGIN_MAIN)."

  validate_source_metadata
  RELEASE_ID="$PRODUCT_VERSION-$SHORT_COMMIT"
  FINAL_RELEASE="$REPOSITORY_ROOT/tmp/releases/$RELEASE_ID"
  [ ! -e "$FINAL_RELEASE" ] || fail "Das lokale Release-Artefakt existiert bereits: $FINAL_RELEASE"
  [ ! -e "$REPOSITORY_ROOT/tmp/releases/.publish-$RELEASE_ID.lock" ] ||
    fail 'Eine lokale Veröffentlichungssperre derselben Release-ID muss zuerst manuell geprüft werden.'
  for incomplete_staging in "$REPOSITORY_ROOT/tmp/releases/.build-$RELEASE_ID."*; do
    [ ! -e "$incomplete_staging" ] ||
      fail 'Ein unvollständiges lokales Release-Staging derselben Release-ID muss zuerst manuell geprüft werden.'
  done
  if git show-ref --verify --quiet "refs/tags/$RELEASE_TAG"; then
    fail "Der Release-Tag existiert bereits lokal und wird nicht verändert: $RELEASE_TAG"
  fi
  [ -z "$(remote_tag_lines)" ] || fail "Der Release-Tag existiert bereits auf origin und wird nicht verändert: $RELEASE_TAG"

  validate_allowlist
  git diff --check || fail 'git diff --check ist fehlgeschlagen.'
  "$DEPLOY_SCRIPT" --check-target "$RELEASE_ID" ||
    fail 'Die Release-ID oder eine zugehörige Staging-/Sperrstruktur ist auf der Synology nicht frei.'
  printf 'Preflight bestanden: %s / %s / %s\n' "$PRODUCT_VERSION" "$BUILD_NAME" "$HEAD_COMMIT"
}

preflight

printf '\nVollständige lokale Prüfungen\n'
"$VERIFY_SCRIPT" || fail 'Die vollständige lokale Release-Prüfung ist fehlgeschlagen.'

# Tests dürfen den Kandidaten nicht verändern. Alle flüchtigen Gates werden
# unmittelbar vor der ersten dauerhaften Release-Aktion erneut geprüft.
preflight

TAG_MESSAGE="FRECKA $PRODUCT_VERSION - $BUILD_NAME"
printf '\nAnnotierten Release-Tag erzeugen\n'
git tag -a "$RELEASE_TAG" -m "$TAG_MESSAGE" "$HEAD_COMMIT" ||
  fail "Der lokale Release-Tag konnte nicht erzeugt werden: $RELEASE_TAG"
TAG_CREATED=1

[ "$(git cat-file -t "refs/tags/$RELEASE_TAG")" = 'tag' ] || fail 'Der erzeugte Release-Tag ist nicht annotiert.'
[ "$(git rev-parse "$RELEASE_TAG^{commit}")" = "$HEAD_COMMIT" ] || fail 'Der erzeugte Release-Tag zeigt nicht exakt auf HEAD.'
[ "$(git for-each-ref --format='%(contents:subject)' "refs/tags/$RELEASE_TAG")" = "$TAG_MESSAGE" ] ||
  fail 'Die Tagmeldung stimmt nicht mit Version und Build überein.'
[ -z "$(remote_tag_lines)" ] || fail 'Der Release-Tag wurde während des Laufs auf origin belegt.'
[ "$(remote_main_commit)" = "$HEAD_COMMIT" ] || fail 'origin/main hat sich während des Release-Laufs verändert.'

printf '\nRelease-Tag veröffentlichen\n'
if ! git push origin "refs/tags/$RELEASE_TAG:refs/tags/$RELEASE_TAG"; then
  fail "Der Tag-Push ist fehlgeschlagen: $RELEASE_TAG"
fi
TAG_PUSHED=1

REMOTE_TAG_STATE=$(remote_tag_lines)
REMOTE_PEELED_COMMIT=$(printf '%s\n' "$REMOTE_TAG_STATE" | awk -v ref="refs/tags/$RELEASE_TAG^{}" '$2 == ref { print $1 }')
[ "$REMOTE_PEELED_COMMIT" = "$HEAD_COMMIT" ] || fail 'Der veröffentlichte annotierte Tag zeigt remote nicht eindeutig auf HEAD.'

printf '\nUnveränderliches Artefakt erzeugen\n'
"$BUILD_SCRIPT" "$RELEASE_TAG" || fail 'Die reproduzierbare Artefakterzeugung ist fehlgeschlagen.'
ARTIFACT_CREATED=1
[ -d "$FINAL_RELEASE/site" ] || fail 'Das finalisierte lokale Artefakt fehlt nach der Erzeugung.'

printf '\nBeta-Dry-Run\n'
"$DEPLOY_SCRIPT" --dry-run "$RELEASE_ID" || fail 'Der Beta-Dry-Run ist fehlgeschlagen; es erfolgt kein Upload.'

printf '\nBeta-Upload\n'
"$DEPLOY_SCRIPT" "$RELEASE_ID" || fail 'Der Beta-Upload ist fehlgeschlagen; Web Station bleibt unverändert.'

trap - 0

printf '\nBETA-RELEASE BESTANDEN\n\n'
printf 'Version: %s\n' "$PRODUCT_VERSION"
printf 'Build: %s\n' "$BUILD_NAME"
printf 'Commit: %s\n' "$HEAD_COMMIT"
printf 'Tag: %s\n' "$RELEASE_TAG"
printf 'Release-ID: %s\n' "$RELEASE_ID"
printf 'Synology-Pfad: /volume1/web/FRECKA/releases/%s/site\n\n' "$RELEASE_ID"
printf 'Nächster manueller Schritt:\n'
printf 'Web Station → beta.frecka.app → Document Root auf den oben genannten Release-Pfad umstellen.\n\n'
printf 'Danach:\n'
printf 'Realer iPhone/Home-Screen-PWA-Smoke-Test.\n'
