#!/bin/sh

# Vollständig automatisierbare lokale Release-Prüfungen. Reale Geräte- und
# Web-Station-Gates bleiben bewusst außerhalb dieses Skripts.

set -eu

PROGRAM_NAME=${0##*/}
SCRIPT_DIR=$(CDPATH= cd -P "$(dirname "$0")" && pwd)
REPOSITORY_ROOT=$(CDPATH= cd -P "$SCRIPT_DIR/.." && pwd)

fail() {
  printf 'FEHLER: %s\n' "$1" >&2
  exit 1
}

find_node() {
  if [ -n "${FRECKA_NODE_BIN:-}" ]; then
    [ -x "$FRECKA_NODE_BIN" ] || fail "FRECKA_NODE_BIN ist nicht ausführbar: $FRECKA_NODE_BIN"
    printf '%s\n' "$FRECKA_NODE_BIN"
    return
  fi
  if command -v node >/dev/null 2>&1; then
    command -v node
    return
  fi
  CODEX_NODE="${HOME}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
  if [ -x "$CODEX_NODE" ]; then
    printf '%s\n' "$CODEX_NODE"
    return
  fi
  fail 'Node.js für die vorhandenen lokalen .mjs-Regressionstests wurde nicht gefunden.'
}

NODE_BIN=$(find_node)
cd "$REPOSITORY_ROOT"

printf 'Release-Prüfung\n'

for shell_file in scripts/*.sh tests/*.sh; do
  sh -n "$shell_file" || fail "Shell-Syntaxfehler: $shell_file"
done

find js tests -type f \( -name '*.js' -o -name '*.mjs' \) -print |
  LC_ALL=C sort | while IFS= read -r javascript_file; do
    "$NODE_BIN" --check "$javascript_file" >/dev/null ||
      fail "JavaScript-Syntaxfehler: $javascript_file"
  done
"$NODE_BIN" --check service-worker.js >/dev/null || fail 'JavaScript-Syntaxfehler: service-worker.js'

"$NODE_BIN" -e '
  const fs = require("fs");
  const manifest = JSON.parse(fs.readFileSync("manifest.webmanifest", "utf8"));
  if (manifest.start_url !== "./index.html#/home" || manifest.scope !== "./") process.exit(1);
' || fail 'Manifest-JSON, start_url oder scope ist ungültig.'

"$NODE_BIN" tests/pwa-update-smoke.mjs
"$NODE_BIN" tests/service-worker-smoke.mjs
"$NODE_BIN" tests/sharing-smoke.mjs
"$NODE_BIN" tests/backup-output-smoke.mjs
"$NODE_BIN" tests/measure-public-qr.mjs
"$NODE_BIN" tests/render-documents.mjs
sh tests/deploy-beta-smoke.sh
sh tests/release-automation-smoke.sh

verify_vendor() {
  expected_hash=$1
  vendor_file=$2
  if command -v shasum >/dev/null 2>&1; then
    actual_hash=$(shasum -a 256 "$vendor_file" | awk '{ print $1 }')
  elif command -v sha256sum >/dev/null 2>&1; then
    actual_hash=$(sha256sum "$vendor_file" | awk '{ print $1 }')
  else
    fail 'Weder shasum noch sha256sum ist verfügbar.'
  fi
  [ "$actual_hash" = "$expected_hash" ] || fail "Vendor-Prüfsumme stimmt nicht: $vendor_file"
}

verify_vendor '6a1116192ed1dd67fa1bf31e77f5817103d71c23bbac24c382e698b7668bdd01' 'vendor/qrcodegen-v1.8.0-es6.js'
verify_vendor '0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f' 'vendor/pdf-lib-v1.17.1.min.js'
verify_vendor 'acc7e41455a80765b5fd9c7ee1b8078a6d160bbbca455aeae854de65c947d59e' 'vendor/jszip-v3.10.1.min.js'
verify_vendor '566c953c6090b1218ca6217dd7359d45dde46581968586dc607d59a78af6a9c4' 'vendor/jszip-v3.10.1.LICENSE.markdown'

if grep -Eq 'clients[.]claim[[:space:]]*\(' service-worker.js; then
  fail 'service-worker.js darf clients.claim() nicht verwenden.'
fi
if grep -Eq 'localStorage|sessionStorage|indexedDB' service-worker.js js/pwa-update.js; then
  fail 'Service Worker oder Updatecontroller greift unerwartet auf lokale Geschäftsspeicher zu.'
fi

git diff --check || fail 'git diff --check ist fehlgeschlagen.'

printf '\nRELEASE-PRÜFUNG BESTANDEN\n'
printf 'Node: %s\n' "$NODE_BIN"
printf 'Hinweis: Der versionierte Freigabenachweis bestätigt die bereits erfolgte Browserprüfung; reale Geräteprüfungen bleiben nach dem Upload manuell.\n'
