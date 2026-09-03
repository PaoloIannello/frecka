import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const read = path => readFile(new URL(path, import.meta.url), "utf8");
const app = await read("../js/app.js");
const persistenceSource = await read("../js/persistence.js");
const context = vm.createContext({ console, URL, File, Blob, DOMException, TextEncoder, TextDecoder, crypto, atob, btoa, setTimeout });
vm.runInContext("var window = globalThis;", context);
for (const path of ["../js/data.js", "../js/persistence.js", "../js/sharing.js", "../js/backup.js"]) {
  vm.runInContext(await read(path), context, { filename: path });
}
const backup = context.FRECKA_BACKUP;
const sharing = context.FRECKA_SHARING;
const api = context.FRECKA_PERSISTENCE;
const browserTests = await read("persistence-smoke.js");
// Reuse the existing real snapshot fixture without running the browser harness.
vm.runInContext("const api = FRECKA_PERSISTENCE;\n" + browserTests.slice(
  browserTests.indexOf("  const hasOwn ="),
  browserTests.indexOf("  function historicallyInconsistentSnapshotFixture")
), context);
vm.runInContext(browserTests.slice(browserTests.indexOf("  function voucherSaleReceiptFixture"), browserTests.indexOf("  function exportVoucherSaleReceiptFixture")), context);
const tenant = "test-android004";
const snapshot = api.validateTenantSnapshot(context.completeTenantSnapshotFixture(tenant), tenant).snapshot;
assert.equal(api.constants.databaseVersion, 8);
assert(!api.tenantSnapshotConstants.storeKeys.includes("licenseRuntime"));
const contaminated = structuredClone(snapshot);
contaminated.stores.licenseRuntime = { privateKey: await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]) };
const sanitized = api.validateTenantSnapshot(contaminated, tenant).snapshot;
assert(!Object.hasOwn(sanitized.stores, "licenseRuntime"), "Snapshot retained a device CryptoKey/runtime.");
const reader = persistenceSource.slice(persistenceSource.indexOf("async function readTenantSnapshotCandidate"), persistenceSource.indexOf("function exportTenantSnapshot"));
assert(!reader.includes("licenseRuntimeStoreName"), "Backup reader includes device runtime.");

const password = "ANDROID-004 Testkennwort 2030";
const prepared = await backup.createBackup({ passphrase: password, createSnapshot: async () => sanitized });
assert.equal(typeof prepared.serializedBackup, "string");
assert.match(prepared.filename, /^FRECKA-Backup-2030-02-01-\d{4}\.frecka-backup$/);
const envelope = JSON.parse(prepared.serializedBackup);
assert.equal(envelope.backupFormat, "FRECKA_ENCRYPTED_BACKUP");
assert.equal(envelope.backupFormatVersion, 1);
assert.equal(envelope.crypto.cipher.name, "AES-GCM");
assert.equal(envelope.crypto.kdf.name, "PBKDF2");
assert.equal(envelope.crypto.kdf.iterations, 600000);
assert(!prepared.serializedBackup.includes("Backup Teststudio"), "Plaintext leaked into the encrypted file.");
const file = new File([prepared.serializedBackup], prepared.filename, { type: backup.constants.downloadMimeType });
assert.equal(file.type, "application/octet-stream");
assert(file.size > 0);
const decrypted = await backup.decryptTenantSnapshot(file, password);
assert.equal(JSON.stringify(decrypted), JSON.stringify(sanitized));
assert.equal(JSON.stringify(api.validateTenantSnapshot(decrypted, tenant).snapshot), JSON.stringify(sanitized));
await assert.rejects(() => backup.decryptTenantSnapshot(file, "Falsches Kennwort 2030"), { code: "BACKUP_DECRYPT_FAILED" });

function section(start, end) {
  const first = app.indexOf(start);
  const last = app.indexOf(end, first);
  assert(first >= 0 && last > first, `Missing app section: ${start}`);
  return app.slice(first, last);
}
const handler = section('    if (action === "backup-output-ready" || action === "backup-output-save") {', '    if (action === "backup-restore-cancel") {');
const lifecycle = section("  function discardPendingBackupOutput", "  function setBackupCreateFormBusy");
const actions = section("  function removeBackupOutputActions", "  function backupIntervalSettingsMarkup");
const errorMapping = section("  function backupOutputErrorMessage", "  async function recordSuccessfulBackup");

function harness({ capability = true, errorName = null, shareGate = null, downloadFails = false } = {}) {
  const observed = { shares: [], downloads: [], notices: [], codes: [], reminders: 0, renders: 0, delays: [], revokes: 0 };
  let failDownload = downloadFails;
  const navigator = {};
  if (capability !== "no-share") navigator.share = async payload => {
    observed.shares.push(payload);
    if (shareGate) await shareGate;
    if (errorName) throw errorName === "Error" ? new Error("technical fixture") : new DOMException("fixture", errorName);
  };
  if (capability !== "no-canShare") navigator.canShare = () => capability !== false;
  let blob;
  const service = sharing.createShareService({
    navigator, File, isSecureContext: true,
    document: { body: { append() {} }, createElement() { return {
      click() { if (failDownload) throw new Error("download fixture"); observed.downloads.push({ blob, name: this.download }); }, remove() {}
    }; } },
    urlApi: { createObjectURL(value) { blob = value; return "blob:backup-test"; }, revokeObjectURL() { observed.revokes++; } },
    setTimeout(callback, delay) { observed.delays.push(delay); callback(); }
  });
  const form = {
    isConnected: true, buttons: [], listeners: {},
    querySelectorAll() { return this.buttons.slice(); },
    append(button) { this.buttons.push(button); button.isConnected = true; },
    addEventListener(type, callback) { this.listeners[type] = callback; }
  };
  const dom = {
    getElementById: () => form,
    createElement() { return { dataset: {}, disabled: false, isConnected: false, remove() {
      form.buttons = form.buttons.filter(button => button !== this); this.isConnected = false;
    } }; }
  };
  const ui = vm.createContext({
    pendingBackupOutput: prepared, backupCreationEpoch: 0, state: { route: "settings-backup" }, document: dom,
    backup: {
      deliverBackup: (text, name) => backup.deliverBackup(text, name, { shareService: service }),
      downloadBackup: (text, name) => backup.downloadBackup(text, name, { shareService: service })
    },
    showBackupCreateNotice(_form, message, isError) { observed.notices.push({ message, isError }); },
    recordBackupFailure(_stage, error) { observed.codes.push(error.code || error.reason || error.name); },
    async recordSuccessfulBackup() { observed.reminders++; return true; },
    renderSettingsBackup() { observed.renders++; form.isConnected = false; }
  });
  vm.runInContext(errorMapping + lifecycle + actions + "\nasync function exercise(action) {" + handler + "\n}", ui);
  ui.showBackupShareAction(form);
  ui.attachBackupCreateBehavior();
  return {
    ui, form, observed,
    allowDownload() { failDownload = false; },
    click(action) {
      const button = form.buttons.find(item => item.dataset.action === action);
      ui.event = { target: { closest: () => button } };
      return ui.exercise(action);
    }
  };
}

for (const [errorName, code] of [
  ["NotAllowedError", "SHARE_NOT_ALLOWED"], ["DataError", "SHARE_DATA_INVALID"],
  ["TypeError", "SHARE_TYPE_INVALID"], ["InvalidStateError", "SHARE_INVALID_STATE"], ["Error", "SHARE_FAILED"]
]) {
  const h = harness({ errorName });
  await h.click("backup-output-ready");
  assert.equal(h.observed.shares.length, 1);
  assert.equal(h.observed.downloads.length, 0, `${errorName}: automatic download`);
  assert.equal(h.observed.codes[0], code);
  assert.equal(h.observed.reminders, 0);
  assert.equal(h.ui.pendingBackupOutput, prepared, `${errorName}: encrypted output lost`);
  assert.deepEqual(h.form.buttons.map(button => button.dataset.action), ["backup-output-save"]);
  assert.equal(h.observed.notices.at(-1).isError, false);
  await h.click("backup-output-save");
  assert.equal(h.observed.shares.length, 1, "Explicit save retried native share");
  assert.equal(h.observed.downloads.length, 1);
  const download = h.observed.downloads[0];
  assert.equal(download.name, prepared.filename);
  assert.equal(download.blob.type, "application/octet-stream");
  assert.equal(await download.blob.text(), prepared.serializedBackup);
  assert.equal(h.ui.pendingBackupOutput, null);
  assert.equal(h.ui.state.backupNoticeIsError, false);
  assert.equal(h.observed.reminders, 1);
  assert.equal(h.observed.renders, 1);
  assert.equal(h.observed.delays[0], 1000, "Download no longer uses the PDF download helper");
  assert.equal(h.observed.revokes, 1);
}

for (const capability of [false, "no-share", "no-canShare"]) {
  const h = harness({ capability });
  await h.click("backup-output-ready");
  assert.equal(h.observed.shares.length, 0);
  assert.equal(h.observed.downloads.length, 1);
  assert.equal(h.ui.state.backupNoticeIsError, false);
}

{
  const h = harness();
  await h.click("backup-output-save");
  assert.equal(h.observed.shares.length, 0, "Direct save is forced through native share");
  assert.equal(h.observed.downloads.length, 1);
}
{
  const h = harness({ errorName: "AbortError" });
  await h.click("backup-output-ready");
  assert.equal(h.observed.shares.length, 1);
  assert.equal(h.observed.downloads.length, 0);
  assert.equal(h.observed.reminders, 0);
  assert.equal(h.observed.notices.at(-1).isError, false);
  assert.equal(h.ui.pendingBackupOutput, prepared);
}
{
  const h = harness();
  await h.click("backup-output-ready");
  assert.equal(h.observed.shares.length, 1, "iOS success path changed");
  assert.equal(h.observed.downloads.length, 0);
  assert(h.observed.shares[0].files[0] instanceof File);
  assert.equal(await h.observed.shares[0].files[0].text(), prepared.serializedBackup);
  assert.equal(h.observed.shares[0].files[0].name, prepared.filename);
  assert.equal(h.observed.shares[0].files[0].type, "application/octet-stream");
  assert.equal(h.observed.reminders, 1);
}
for (const action of ["backup-output-save", "backup-output-ready"]) {
  const h = harness({ capability: false, downloadFails: true });
  await h.click(action);
  assert.equal(h.ui.pendingBackupOutput, prepared);
  assert.equal(h.observed.notices.at(-1).isError, true);
  assert.equal(h.observed.codes[0], "SHARE_DOWNLOAD_FAILED");
  assert.deepEqual(h.form.buttons.map(button => button.dataset.action), ["backup-output-save"]);
  assert.equal(h.observed.reminders, 0);
  h.allowDownload();
  await h.click("backup-output-save");
  assert.equal(h.observed.downloads.length, 1);
  assert.equal(h.ui.state.backupNoticeIsError, false);
}
for (const invalidate of ["input", "navigation", "new-preparation"]) {
  let finish;
  const shareGate = new Promise(resolve => { finish = resolve; });
  const h = harness({ shareGate, errorName: "NotAllowedError" });
  const first = h.click("backup-output-ready");
  await h.click("backup-output-ready");
  await h.click("backup-output-save");
  assert.equal(h.observed.shares.length, 1, "Double click started a second output");
  if (invalidate === "input") h.form.listeners.input();
  if (invalidate === "navigation") { h.ui.state.route = "home"; h.form.isConnected = false; }
  if (invalidate === "new-preparation") { h.ui.discardPendingBackupOutput(); h.ui.pendingBackupOutput = { filename: "new" }; }
  finish();
  await first;
  assert.equal(h.observed.downloads.length, 0);
  assert.equal(h.observed.notices.length, 0, "Late failure overwrote a newer page/input");
  assert.equal(h.form.buttons.length, 0, "Late failure resurrected an output button");
  assert.notEqual(h.ui.pendingBackupOutput, prepared, "Late failure restored invalidated ciphertext");
}

console.log("ANDROID-004 Backup-Output-Smoke: PASS (Encryption/File/Restore validation, runtime exclusion, 5 share errors, capability gaps, explicit save, abort, iOS, retry, double-click and stale-result guards)");
