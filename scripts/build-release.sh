#!/bin/sh

# Erzeugt genau ein unveränderliches FRECKA-Artefakt aus einem annotierten Tag.
# Das Skript taggt, pusht und deployt nicht; der normale Einstieg ist release-beta.sh.

set -eu

PROGRAM_NAME=${0##*/}

usage() {
  cat <<EOF
Aufruf:
  $PROGRAM_NAME <annotierter-tag>

Beispiel:
  $PROGRAM_NAME v0.10.10
EOF
}

fail() {
  printf 'FEHLER: %s\n' "$1" >&2
  exit 1
}

[ "$#" -eq 1 ] || {
  usage >&2
  exit 2
}

RELEASE_TAG=$1
if ! printf '%s\n' "$RELEASE_TAG" | LC_ALL=C grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z]+(\.[0-9A-Za-z]+)*)?$'; then
  fail "Unplausibler Release-Tag: $RELEASE_TAG"
fi

SCRIPT_DIR=$(CDPATH= cd -P "$(dirname "$0")" && pwd)
REPOSITORY_ROOT=$(CDPATH= cd -P "$SCRIPT_DIR/.." && pwd)
ALLOWLIST_PATH='scripts/release-files.txt'

cd "$REPOSITORY_ROOT"

for required_command in git tar awk sed sort cmp find chmod mv mktemp grep uniq date mkdir rmdir rm head cat stat wc tr; do
  command -v "$required_command" >/dev/null 2>&1 ||
    fail "Benötigtes Programm fehlt: $required_command"
done

if [ "$(git cat-file -t "refs/tags/$RELEASE_TAG" 2>/dev/null || true)" != 'tag' ]; then
  fail "Der Release-Tag fehlt oder ist nicht annotiert: $RELEASE_TAG"
fi

RELEASE_COMMIT=$(git rev-parse --verify "$RELEASE_TAG^{commit}") ||
  fail "Der Tag lässt sich nicht auf einen Commit auflösen: $RELEASE_TAG"
case "$RELEASE_COMMIT" in
  [0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]) ;;
  *) fail 'Der getaggte Commit besitzt keinen vollständigen SHA-1-Bezeichner.' ;;
esac

PRODUCT_VERSION=${RELEASE_TAG#v}
SHORT_COMMIT=$(printf '%.7s' "$RELEASE_COMMIT")
if [ "$(git rev-parse --verify "$SHORT_COMMIT^{commit}" 2>/dev/null || true)" != "$RELEASE_COMMIT" ]; then
  fail "Der 7-stellige Commit-Kurzhash ist nicht eindeutig: $SHORT_COMMIT"
fi

RELEASE_ID="$PRODUCT_VERSION-$SHORT_COMMIT"
RELEASE_PARENT="$REPOSITORY_ROOT/tmp/releases"
FINAL_RELEASE="$RELEASE_PARENT/$RELEASE_ID"
RELEASE_DOCUMENT="docs/releases/$PRODUCT_VERSION.md"
PUBLISH_LOCK="$RELEASE_PARENT/.publish-$RELEASE_ID.lock"

[ ! -e "$FINAL_RELEASE" ] || fail "Das lokale Release-Artefakt existiert bereits: $FINAL_RELEASE"
git cat-file -e "$RELEASE_TAG:$ALLOWLIST_PATH" 2>/dev/null ||
  fail "Die getaggte Release-Allowlist fehlt: $ALLOWLIST_PATH"
git cat-file -e "$RELEASE_TAG:$RELEASE_DOCUMENT" 2>/dev/null ||
  fail "Die getaggte Release-Dokumentation fehlt: $RELEASE_DOCUMENT"

mkdir -p "$RELEASE_PARENT"
TEMP_DIRECTORY=$(mktemp -d "${TMPDIR:-/tmp}/frecka-release.XXXXXX") ||
  fail 'Temporäres Arbeitsverzeichnis konnte nicht angelegt werden.'
STAGING_RELEASE=''

cleanup() {
  rm -rf "$TEMP_DIRECTORY"
  if [ -n "$STAGING_RELEASE" ] && [ -d "$STAGING_RELEASE" ]; then
    chmod -R u+w "$STAGING_RELEASE" 2>/dev/null || true
    rm -rf "$STAGING_RELEASE"
  fi
  if [ -d "$PUBLISH_LOCK" ]; then
    rmdir "$PUBLISH_LOCK" 2>/dev/null || true
  fi
}

trap cleanup 0
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

mkdir "$PUBLISH_LOCK" 2>/dev/null ||
  fail "Eine lokale Veröffentlichung derselben Release-ID läuft bereits oder blieb unvollständig: $PUBLISH_LOCK"
STAGING_RELEASE=$(mktemp -d "$RELEASE_PARENT/.build-$RELEASE_ID.XXXXXX") ||
  fail 'Lokales Release-Staging konnte nicht angelegt werden.'

git show "$RELEASE_TAG:$ALLOWLIST_PATH" > "$TEMP_DIRECTORY/tag-release-files.txt" ||
  fail 'Die getaggte Release-Allowlist konnte nicht gelesen werden.'

NORMALIZED_ALLOWLIST="$TEMP_DIRECTORY/release-files"
RAW_ALLOWLIST="$TEMP_DIRECTORY/release-files.raw"
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
' "$TEMP_DIRECTORY/tag-release-files.txt" > "$RAW_ALLOWLIST"; then
  fail 'Die Release-Allowlist enthält einen ungültigen oder unsicheren Pfad.'
fi
LC_ALL=C sort "$RAW_ALLOWLIST" > "$NORMALIZED_ALLOWLIST"

[ -s "$NORMALIZED_ALLOWLIST" ] || fail 'Die Release-Allowlist ist leer.'
[ -z "$(uniq -d "$NORMALIZED_ALLOWLIST")" ] || fail 'Die Release-Allowlist enthält doppelte Pfade.'

while IFS= read -r release_path; do
  TREE_ENTRY=$(git ls-tree "$RELEASE_TAG" -- "$release_path")
  [ -n "$TREE_ENTRY" ] || fail "Allowlist-Datei fehlt im Tag: $release_path"
  TREE_MODE=$(printf '%s\n' "$TREE_ENTRY" | awk '{ print $1 }')
  TREE_TYPE=$(printf '%s\n' "$TREE_ENTRY" | awk '{ print $2 }')
  [ "$TREE_TYPE" = 'blob' ] || fail "Allowlist-Pfad ist keine Datei: $release_path"
  [ "$TREE_MODE" != '120000' ] || fail "Symlinks sind im Release unzulässig: $release_path"
done < "$NORMALIZED_ALLOWLIST"

set --
while IFS= read -r release_path; do
  set -- "$@" "$release_path"
done < "$NORMALIZED_ALLOWLIST"

TAG_ARCHIVE="$TEMP_DIRECTORY/site.tar"
git archive --format=tar --prefix=site/ --output="$TAG_ARCHIVE" "$RELEASE_TAG" -- "$@" ||
  fail 'Die Laufzeitdateien konnten nicht ausschließlich aus dem Tag archiviert werden.'
tar -xf "$TAG_ARCHIVE" -C "$STAGING_RELEASE" ||
  fail 'Die Laufzeitdateien konnten nicht aus dem geprüften Tag-Archiv extrahiert werden.'

git show "$RELEASE_TAG:$RELEASE_DOCUMENT" > "$TEMP_DIRECTORY/release-document.md" ||
  fail 'Die getaggte Release-Dokumentation konnte nicht gelesen werden.'

document_field() {
  awk -v key="$1" '
    index($0, key ":") == 1 {
      value = substr($0, length(key) + 2)
      sub(/^[[:space:]]+/, "", value)
      sub(/[[:space:]]+$/, "", value)
      print value
      exit
    }
  ' "$TEMP_DIRECTORY/release-document.md"
}

SOURCE_VERSION_VALUES=$(sed -n 's/^[[:space:]]*version:[[:space:]]*"\([^"]*\)".*/\1/p' "$STAGING_RELEASE/site/js/data.js")
BUILD_NAME_VALUES=$(sed -n 's/^[[:space:]]*build:[[:space:]]*"\([^"]*\)".*/\1/p' "$STAGING_RELEASE/site/js/data.js")
[ "$(printf '%s\n' "$SOURCE_VERSION_VALUES" | sed '/^$/d' | wc -l | tr -d ' ')" = '1' ] ||
  fail 'Die Produktversion ist im getaggten js/data.js nicht eindeutig.'
[ "$(printf '%s\n' "$BUILD_NAME_VALUES" | sed '/^$/d' | wc -l | tr -d ' ')" = '1' ] ||
  fail 'Die Buildkennung ist im getaggten js/data.js nicht eindeutig.'
SOURCE_VERSION=$SOURCE_VERSION_VALUES
BUILD_NAME=$BUILD_NAME_VALUES
[ "$SOURCE_VERSION" = "$PRODUCT_VERSION" ] ||
  fail "Produktversion im Tag ($SOURCE_VERSION) stimmt nicht mit $RELEASE_TAG überein."
[ -n "$BUILD_NAME" ] || fail 'Buildkennung fehlt im getaggten js/data.js.'

EXPECTED_TAG_SUBJECT="FRECKA $PRODUCT_VERSION - $BUILD_NAME"
TAG_SUBJECT=$(git for-each-ref --format='%(contents:subject)' "refs/tags/$RELEASE_TAG")
[ "$TAG_SUBJECT" = "$EXPECTED_TAG_SUBJECT" ] ||
  fail "Tagmeldung ist nicht deterministisch: erwartet '$EXPECTED_TAG_SUBJECT'."
grep -Fq "# FRECKA $PRODUCT_VERSION" "$TEMP_DIRECTORY/release-document.md" ||
  fail 'Die getaggte Release-Dokumentation nennt nicht die getaggte Produktversion.'
grep -Fq "$BUILD_NAME" "$TEMP_DIRECTORY/release-document.md" ||
  fail 'Die getaggte Release-Dokumentation nennt nicht die Buildkennung.'

RELEASE_STATUS=$(document_field 'Status')
RELEASE_APPROVAL=$(document_field 'Beta-Release-Freigabe')
LOCAL_CHECK=$(document_field 'Lokale Release-Prüfung')
RELEASE_OWNER=$(document_field 'Release-Verantwortung')
PREVIOUS_VERSION=$(document_field 'Unmittelbare Vorgängerversion')
SCHEMA_MIGRATION=$(document_field 'Datenbankschema-Migration erforderlich')
IN_PLACE_CHECK=$(document_field 'Bestandsprüfung vor In-place-Beta-Test')

case "$RELEASE_STATUS" in
  'Für automatisierten Beta-Release freigegeben'*) ;;
  *) fail 'Die getaggte Release-Dokumentation besitzt keinen freigegebenen Status.' ;;
esac
[ "$RELEASE_APPROVAL" = 'FREIGEGEBEN' ] || fail 'Die getaggte Beta-Release-Freigabe fehlt.'
[ "$LOCAL_CHECK" = 'BESTANDEN' ] || fail 'Der getaggte lokale Prüfnachweis ist nicht bestanden.'
[ -n "$RELEASE_OWNER" ] || fail 'Die Release-Verantwortung fehlt im getaggten Freigabenachweis.'
[ -n "$PREVIOUS_VERSION" ] || fail 'Die unmittelbare Vorgängerversion fehlt im getaggten Freigabenachweis.'
case "$SCHEMA_MIGRATION" in ja|nein) ;; *) fail 'Die Angabe zur Datenbankschema-Migration fehlt oder ist ungültig.' ;; esac
case "$IN_PLACE_CHECK" in ja|nein) ;; *) fail 'Die Angabe zur In-place-Bestandsprüfung fehlt oder ist ungültig.' ;; esac

awk '
  /^## Bekannte Einschränkungen[[:space:]]*$/ { section = 1; next }
  section && /^## / { exit }
  section && /^- / { print }
' "$TEMP_DIRECTORY/release-document.md" > "$TEMP_DIRECTORY/known-limitations"
[ -s "$TEMP_DIRECTORY/known-limitations" ] ||
  fail 'Die getaggte Release-Dokumentation enthält keine strukturierte Liste bekannter Einschränkungen.'

TAG_EPOCH=$(git for-each-ref --format='%(taggerdate:unix)' "refs/tags/$RELEASE_TAG")
case "$TAG_EPOCH" in ''|*[!0-9]*) fail 'Der annotierte Tag besitzt keinen gültigen Tagzeitpunkt.' ;; esac
if TAG_TIME_UTC=$(date -u -r "$TAG_EPOCH" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null); then
  :
elif TAG_TIME_UTC=$(date -u -d "@$TAG_EPOCH" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null); then
  :
else
  fail 'Der Tagzeitpunkt konnte nicht portabel in UTC formatiert werden.'
fi

DATABASE_VERSION=$(sed -n '/const constants = Object.freeze({/,/});/s/^[[:space:]]*databaseVersion:[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$STAGING_RELEASE/site/js/persistence.js" | head -n 1)
BACKUP_FORMAT=$(sed -n '/const constants = Object.freeze({/,/});/s/^[[:space:]]*backupFormat:[[:space:]]*"\([^"]*\)".*/\1/p' "$STAGING_RELEASE/site/js/backup.js" | head -n 1)
BACKUP_VERSION=$(sed -n '/const constants = Object.freeze({/,/});/s/^[[:space:]]*backupFormatVersion:[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$STAGING_RELEASE/site/js/backup.js" | head -n 1)
EXPORT_FORMAT=$(sed -n '/const constants = Object.freeze({/,/});/s/^[[:space:]]*exportFormat:[[:space:]]*"\([^"]*\)".*/\1/p' "$STAGING_RELEASE/site/js/export.js" | head -n 1)
EXPORT_VERSION=$(sed -n '/const constants = Object.freeze({/,/});/s/^[[:space:]]*exportFormatVersion:[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$STAGING_RELEASE/site/js/export.js" | head -n 1)
DOCUMENT_VERSION=$(sed -n 's/^[[:space:]]*const DOCUMENT_VERSION = "\([^"]*\)";.*/\1/p' "$STAGING_RELEASE/site/js/documents.js" | head -n 1)
QR_VERSION=$(sed -n 's/^[[:space:]]*const QR_VERSION = "\([^"]*\)";.*/\1/p' "$STAGING_RELEASE/site/js/qr.js" | head -n 1)
PUBLIC_DOCUMENT_VERSION=$(sed -n 's/^[[:space:]]*const PUBLIC_DOCUMENT_VERSION = "\([^"]*\)";.*/\1/p' "$STAGING_RELEASE/site/js/public-documents.js" | head -n 1)
PUBLIC_FORMAT_MARKER=$(sed -n 's/^[[:space:]]*const FORMAT_MARKER = "\([^"]*\)";.*/\1/p' "$STAGING_RELEASE/site/js/public-documents.js" | head -n 1)
PUBLIC_FORMAT_VERSION=$(sed -n 's/^[[:space:]]*const FORMAT_VERSION = \([0-9][0-9]*\);.*/\1/p' "$STAGING_RELEASE/site/js/public-documents.js" | head -n 1)
SHARE_VERSION=$(sed -n 's/^[[:space:]]*const SHARE_VERSION = "\([^"]*\)";.*/\1/p' "$STAGING_RELEASE/site/js/sharing.js" | head -n 1)
APP_SHELL_CACHE=$(sed -n 's/^const APP_SHELL_CACHE = `${APP_SHELL_CACHE_PREFIX}\([^`]*\)`;.*/frecka-app-shell-\1/p' "$STAGING_RELEASE/site/service-worker.js" | head -n 1)

for metadata_value in "$DATABASE_VERSION" "$BACKUP_FORMAT" "$BACKUP_VERSION" "$EXPORT_FORMAT" "$EXPORT_VERSION" "$DOCUMENT_VERSION" "$QR_VERSION" "$PUBLIC_DOCUMENT_VERSION" "$PUBLIC_FORMAT_MARKER" "$PUBLIC_FORMAT_VERSION" "$SHARE_VERSION" "$APP_SHELL_CACHE"; do
  [ -n "$metadata_value" ] || fail 'Eine erforderliche Format- oder Cachekennung konnte nicht aus dem Tag abgeleitet werden.'
done

{
  printf 'Produkt: FRECKA\n'
  printf 'Produktversion: %s\n' "$PRODUCT_VERSION"
  printf 'Build: %s\n' "$BUILD_NAME"
  printf 'Release-ID: %s\n' "$RELEASE_ID"
  printf 'Git-Commit: %s\n' "$RELEASE_COMMIT"
  printf 'Git-Tag: %s\n' "$RELEASE_TAG"
  printf 'Erstellzeitpunkt (UTC): %s\n' "$TAG_TIME_UTC"
  printf 'Zeitquelle: Zeitpunkt des annotierten Git-Tags\n'
  printf 'Release-Verantwortung: %s\n\n' "$RELEASE_OWNER"
  printf 'Datenbankschemaversion: %s\n' "$DATABASE_VERSION"
  printf 'Backupformat: %s v%s\n' "$BACKUP_FORMAT" "$BACKUP_VERSION"
  printf 'Exportformat: %s v%s\n' "$EXPORT_FORMAT" "$EXPORT_VERSION"
  printf 'Dokumentmodell: %s\n' "$DOCUMENT_VERSION"
  printf 'QR-Service: %s\n' "$QR_VERSION"
  printf 'Public-Dokumentformat: %s / %s v%s\n' "$PUBLIC_DOCUMENT_VERSION" "$PUBLIC_FORMAT_MARKER" "$PUBLIC_FORMAT_VERSION"
  printf 'Share-Service: %s\n' "$SHARE_VERSION"
  printf 'App-Shell-Cache: %s\n\n' "$APP_SHELL_CACHE"
  printf 'Unmittelbare Vorgängerversion: %s\n' "$PREVIOUS_VERSION"
  printf 'Datenbankschema-Migration erforderlich: %s\n' "$SCHEMA_MIGRATION"
  printf 'Bestandsprüfung vor In-place-Beta-Test: %s\n\n' "$IN_PLACE_CHECK"
  printf 'Lokale Release-Prüfung: BESTANDEN\n'
  printf 'Freigabenachweis: %s\n\n' "$RELEASE_DOCUMENT"
  printf 'Bekannte Einschränkungen:\n'
  cat "$TEMP_DIRECTORY/known-limitations"
  printf '\nQuelle: annotierter Tag %s und Release-Commit %s\n' "$RELEASE_TAG" "$RELEASE_COMMIT"
} > "$STAGING_RELEASE/RELEASE.txt"

(
  cd "$STAGING_RELEASE"
  find RELEASE.txt site -type f -print | LC_ALL=C sort | while IFS= read -r release_file; do
    if command -v shasum >/dev/null 2>&1; then
      shasum -a 256 "$release_file"
    elif command -v sha256sum >/dev/null 2>&1; then
      sha256sum "$release_file"
    else
      exit 127
    fi
  done > SHA256SUMS
) || fail 'SHA256SUMS konnte nicht erzeugt werden.'

EXPECTED_FILES="$TEMP_DIRECTORY/expected-files"
ACTUAL_FILES="$TEMP_DIRECTORY/actual-files"
{
  printf '%s\n' RELEASE.txt SHA256SUMS
  sed 's#^#site/#' "$NORMALIZED_ALLOWLIST"
} | LC_ALL=C sort > "$EXPECTED_FILES"
(
  cd "$STAGING_RELEASE"
  find . -type f -print | sed 's#^\./##' | LC_ALL=C sort > "$ACTUAL_FILES"
)
cmp -s "$EXPECTED_FILES" "$ACTUAL_FILES" || fail 'Der Artefakt-Dateibestand weicht von der Allowlist ab.'

while IFS= read -r release_path; do
  git show "$RELEASE_TAG:$release_path" | cmp -s - "$STAGING_RELEASE/site/$release_path" ||
    fail "Site-Datei ist nicht bytegleich mit dem Tag: $release_path"
done < "$NORMALIZED_ALLOWLIST"

if command -v shasum >/dev/null 2>&1; then
  (cd "$STAGING_RELEASE" && shasum -a 256 -c SHA256SUMS >/dev/null) ||
    fail 'Die lokale Artefakt-Prüfsumme ist fehlgeschlagen.'
else
  (cd "$STAGING_RELEASE" && sha256sum -c SHA256SUMS >/dev/null) ||
    fail 'Die lokale Artefakt-Prüfsumme ist fehlgeschlagen.'
fi

find "$STAGING_RELEASE" -type f -exec chmod 0444 {} +
find "$STAGING_RELEASE" -type d -exec chmod 0555 {} +

file_mode() {
  if stat -f '%Lp' "$1" >/dev/null 2>&1; then
    stat -f '%Lp' "$1"
  else
    stat -c '%a' "$1"
  fi
}

find "$STAGING_RELEASE" -type f -print > "$TEMP_DIRECTORY/hardened-files"
while IFS= read -r hardened_path; do
  [ "$(file_mode "$hardened_path")" = '444' ] ||
    fail "Release-Datei besitzt nicht exakt Modus 0444: $hardened_path"
done < "$TEMP_DIRECTORY/hardened-files"

find "$STAGING_RELEASE" -type d -print > "$TEMP_DIRECTORY/hardened-directories"
while IFS= read -r hardened_path; do
  [ "$(file_mode "$hardened_path")" = '555' ] ||
    fail "Release-Verzeichnis besitzt nicht exakt Modus 0555: $hardened_path"
done < "$TEMP_DIRECTORY/hardened-directories"

if command -v shasum >/dev/null 2>&1; then
  (cd "$STAGING_RELEASE" && shasum -a 256 -c SHA256SUMS >/dev/null) ||
    fail 'Die Prüfsummen sind nach der Härtung fehlgeschlagen.'
else
  (cd "$STAGING_RELEASE" && sha256sum -c SHA256SUMS >/dev/null) ||
    fail 'Die Prüfsummen sind nach der Härtung fehlgeschlagen.'
fi

[ ! -e "$FINAL_RELEASE" ] || fail "Das lokale Ziel wurde während der Erzeugung belegt: $FINAL_RELEASE"
mv "$STAGING_RELEASE" "$FINAL_RELEASE" || fail 'Das geprüfte Artefakt konnte nicht atomar finalisiert werden.'
rmdir "$PUBLISH_LOCK" || fail 'Die lokale Veröffentlichungssperre konnte nach der Finalisierung nicht entfernt werden.'

printf '\nRELEASE-ARTEFAKT BESTANDEN\n'
printf 'Release-ID: %s\n' "$RELEASE_ID"
printf 'Pfad: %s/\n' "$FINAL_RELEASE"
