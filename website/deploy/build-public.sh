#!/bin/sh

set -eu

umask 022

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd -P)
RUNTIME_LIST="$SCRIPT_DIR/runtime-files.txt"
BUILD_ROOT="$PROJECT_DIR/.build"
PUBLIC_DIR="$BUILD_ROOT/public"
STAGING_DIR="$BUILD_ROOT/public.tmp.$$"
BUILD_FILE_LIST="$BUILD_ROOT/runtime-files.txt"
BUILD_CHECKSUMS="$BUILD_ROOT/SHA256SUMS"

fail() {
  printf 'Build abgebrochen: %s\n' "$*" >&2
  exit 1
}

cleanup() {
  case "$STAGING_DIR" in
    "$PROJECT_DIR"/.build/public.tmp.*)
      if [ -e "$STAGING_DIR" ] || [ -L "$STAGING_DIR" ]; then
        rm -rf -- "$STAGING_DIR"
      fi
      ;;
  esac
}

trap cleanup EXIT HUP INT TERM

case "$PUBLIC_DIR" in
  "$PROJECT_DIR/.build/public") ;;
  *) fail "Unerwarteter Build-Pfad: $PUBLIC_DIR" ;;
esac

[ -f "$RUNTIME_LIST" ] || fail "Runtime-Allowlist fehlt: $RUNTIME_LIST"
[ -s "$RUNTIME_LIST" ] || fail "Runtime-Allowlist ist leer."
[ ! -L "$RUNTIME_LIST" ] || fail "Runtime-Allowlist darf kein Symlink sein."

for command_name in basename cmp cp diff dirname find grep mkdir mv rm sed shasum sort; do
  command -v "$command_name" >/dev/null 2>&1 || fail "Erforderliches Kommando fehlt: $command_name"
done

mkdir -p -- "$BUILD_ROOT"

[ ! -L "$PUBLIC_DIR" ] || fail "Build-Ziel darf kein Symlink sein: $PUBLIC_DIR"

cleanup
mkdir -p -- "$STAGING_DIR"

runtime_count=0
while IFS= read -r relative_path || [ -n "$relative_path" ]; do
  [ -n "$relative_path" ] || fail "Leere Zeile in runtime-files.txt ist nicht erlaubt."

  case "$relative_path" in
    /*|..|../*|*/..|*/../*) fail "Unsicherer Runtime-Pfad: $relative_path" ;;
    *.[mM][dD]|*/.DS_Store|.DS_Store|*/.gitkeep|.gitkeep|.git|.git/*|*/.git/*|assets/screenshots/originals/*)
      fail "Nicht veröffentlichbare Datei in Allowlist: $relative_path"
      ;;
  esac

  source_file="$PROJECT_DIR/$relative_path"
  destination_file="$STAGING_DIR/$relative_path"

  [ -f "$source_file" ] || fail "Runtime-Datei fehlt: $relative_path"
  [ ! -L "$source_file" ] || fail "Runtime-Datei darf kein Symlink sein: $relative_path"

  mkdir -p -- "$(dirname -- "$destination_file")"
  cp -p -- "$source_file" "$destination_file"
  runtime_count=$((runtime_count + 1))
done < "$RUNTIME_LIST"

[ "$runtime_count" -gt 0 ] || fail "Keine Runtime-Dateien kopiert."

validate_html() {
  html_path=$1
  html_file="$STAGING_DIR/$html_path"

  [ -s "$html_file" ] || fail "HTML-Datei fehlt oder ist leer: $html_path"
  grep -Eiq '<!doctype[[:space:]]+html>' "$html_file" || fail "DOCTYPE fehlt: $html_path"
  grep -Eq '<html[^>]+lang="de"' "$html_file" || fail "Deutsche Sprachangabe fehlt: $html_path"
  grep -Eq '<main([[:space:]>])' "$html_file" || fail "Main-Landmark fehlt: $html_path"
  grep -Eq '</html>[[:space:]]*$' "$html_file" || fail "HTML-Abschluss fehlt: $html_path"
}

validate_html "index.html"
validate_html "legal/impressum.html"
validate_html "legal/datenschutz.html"

check_html_references() {
  html_path=$1
  html_source="$PROJECT_DIR/$html_path"
  html_base=$(dirname -- "$html_path")

  grep -Eo '(src|href|data)="[^"]+"' "$html_source" |
    sed -E 's/^[^=]+="([^"]+)"$/\1/' |
    while IFS= read -r reference; do
      case "$reference" in
        \#*|mailto:*|tel:*|https://*|http://*|data:*) continue ;;
      esac

      reference=${reference%%\#*}
      reference=${reference%%\?*}
      [ -n "$reference" ] || continue

      reference_dir="$PROJECT_DIR/$html_base/$(dirname -- "$reference")"
      [ -d "$reference_dir" ] || fail "Referenzordner fehlt in $html_path: $reference"
      absolute_dir=$(CDPATH= cd -- "$reference_dir" && pwd -P)
      absolute_reference="$absolute_dir/$(basename -- "$reference")"

      case "$absolute_reference" in
        "$PROJECT_DIR"/*) ;;
        *) fail "Referenz verlässt website/: $html_path -> $reference" ;;
      esac

      relative_reference=${absolute_reference#"$PROJECT_DIR"/}
      [ -f "$STAGING_DIR/$relative_reference" ] || fail "Lokale HTML-Referenz fehlt im Build: $html_path -> $relative_reference"
    done
}

check_html_references "index.html"
check_html_references "legal/impressum.html"
check_html_references "legal/datenschutz.html"

for css_path in styles/animation.css styles/brand-assets.css styles/design-tokens.css styles/main.css; do
  if grep -Eq 'url[[:space:]]*\(' "$PROJECT_DIR/$css_path"; then
    fail "CSS enthält eine nicht explizit validierte url()-Referenz: $css_path"
  fi
done

if grep -Eq 'fetch[[:space:]]*\(|import[[:space:]]*\(|new[[:space:]]+Worker|serviceWorker' "$PROJECT_DIR/scripts/main.js"; then
  fail "JavaScript enthält eine nicht explizit validierte Runtime-Nachladung."
fi

grep -Fq 'https://frecka.app/assets/social/opengraph-1200x630.png' "$STAGING_DIR/index.html" ||
  fail "OpenGraph-Produktionspfad fehlt in index.html."
[ -s "$STAGING_DIR/assets/social/opengraph-1200x630.png" ] || fail "OpenGraph-Datei fehlt im Build."

for required_path in \
  index.html \
  legal/impressum.html \
  legal/datenschutz.html \
  scripts/main.js \
  styles/animation.css \
  styles/brand-assets.css \
  styles/design-tokens.css \
  styles/main.css \
  assets/logo/favicon/favicon.svg \
  assets/logo/svg/frecka-icon.svg \
  assets/logo/svg/frecka-logo.svg \
  assets/logo/svg/frecka-wordmark.svg \
  assets/screenshots/hero/home.png \
  assets/screenshots/workflow/step-1.png \
  assets/screenshots/workflow/step-2.png \
  assets/screenshots/workflow/step-3.png \
  assets/social/opengraph-1200x630.png
do
  [ -s "$STAGING_DIR/$required_path" ] || fail "Pflichtdatei fehlt oder ist leer: $required_path"
done

forbidden_files=$(find "$STAGING_DIR" -type f \( \
  -iname '*.md' -o \
  -name '.DS_Store' -o \
  -name '.gitkeep' \
\) -print)
[ -z "$forbidden_files" ] || fail "Verbotene Dateien im Build:\n$forbidden_files"
[ ! -d "$STAGING_DIR/assets/screenshots/originals" ] || fail "Originalscreenshots sind im Build enthalten."
[ ! -d "$STAGING_DIR/.git" ] || fail "Git-Metadaten sind im Build enthalten."

LC_ALL=C sort "$RUNTIME_LIST" > "$BUILD_ROOT/runtime-files.expected.tmp"
find "$STAGING_DIR" -type f -print |
  sed "s#^$STAGING_DIR/##" |
  LC_ALL=C sort > "$BUILD_ROOT/runtime-files.actual.tmp"

if ! cmp -s "$BUILD_ROOT/runtime-files.expected.tmp" "$BUILD_ROOT/runtime-files.actual.tmp"; then
  diff -u "$BUILD_ROOT/runtime-files.expected.tmp" "$BUILD_ROOT/runtime-files.actual.tmp" >&2 || true
  fail "Build-Inhalt weicht von runtime-files.txt ab."
fi

cp -- "$BUILD_ROOT/runtime-files.actual.tmp" "$BUILD_FILE_LIST"

: > "$BUILD_CHECKSUMS"
while IFS= read -r relative_path; do
  (
    cd -- "$STAGING_DIR"
    shasum -a 256 -- "$relative_path"
  ) >> "$BUILD_CHECKSUMS"
done < "$BUILD_FILE_LIST"

[ -s "$BUILD_CHECKSUMS" ] || fail "SHA-256-Prüfsummen wurden nicht erzeugt."

rm -f -- "$BUILD_ROOT/runtime-files.expected.tmp" "$BUILD_ROOT/runtime-files.actual.tmp"

if [ -e "$PUBLIC_DIR" ]; then
  rm -rf -- "$PUBLIC_DIR"
fi
mv -- "$STAGING_DIR" "$PUBLIC_DIR"

printf 'Build erfolgreich: %s Runtime-Dateien\n' "$runtime_count"
printf 'Staging: %s\n' "$PUBLIC_DIR"
printf 'Dateiliste: %s\n' "$BUILD_FILE_LIST"
printf 'SHA-256: %s\n' "$BUILD_CHECKSUMS"
