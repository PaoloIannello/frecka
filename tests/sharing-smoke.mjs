import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../js/sharing.js", import.meta.url), "utf8");
const context = vm.createContext({
  console,
  URL,
  File,
  Blob,
  DOMException,
  setTimeout,
  location: { href: "https://app.example.invalid/frecka/" },
  isSecureContext: false
});
vm.runInContext(source, context, { filename: "sharing.js" });
const api = context.FRECKA_SHARING;

const makeService = (navigator, extras = {}) => api.createShareService({
  navigator,
  isSecureContext: true,
  File,
  Blob,
  baseUrl: "https://app.example.invalid/frecka/",
  ...extras
});
const makeFile = (service, name = "FRECKA-Beleg.pdf", type = "application/pdf") => service.createFile("Dateiinhalt", { name, type });
const failureNavigator = name => ({
  canShare: data => Array.isArray(data.files),
  share: async () => { throw new DOMException("Simulierter Share-Fehler", name); }
});

assert.equal(api.SHARE_VERSION, "ANDROID-002", "Share-Service ist nicht als ANDROID-002 versioniert.");

{
  const service = makeService({});
  const result = await service.shareFiles([makeFile(service)]);
  assert.deepEqual({ status: result.status, reason: result.reason }, { status: "unsupported", reason: "share-unavailable" });
}

{
  const service = makeService({ share: async () => {} });
  const result = await service.shareFiles([makeFile(service)]);
  assert.deepEqual({ status: result.status, reason: result.reason }, { status: "unsupported", reason: "can-share-unavailable" });
}

{
  const service = makeService({ canShare: () => false, share: async () => { throw new Error("darf nicht laufen"); } });
  const result = await service.shareFiles([makeFile(service)]);
  assert.deepEqual({ status: result.status, reason: result.reason }, { status: "unsupported", reason: "files-unsupported" });
}

{
  const calls = [];
  const service = makeService({ canShare: () => true, share: async data => { calls.push(data); } });
  const file = makeFile(service);
  const result = await service.shareFiles([file], { title: "Beleg", text: "Digitaler FRECKA-Beleg" });
  assert.equal(result.status, "shared");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].files[0], file);
  assert.equal(calls[0].title, "Beleg");
  assert.equal(calls[0].text, "Digitaler FRECKA-Beleg");
}

for (const [name, code, reason] of [
  ["NotAllowedError", "SHARE_NOT_ALLOWED", "not-allowed"],
  ["DataError", "SHARE_DATA_INVALID", "data-error"],
  ["TypeError", "SHARE_TYPE_INVALID", "type-error"]
]) {
  const service = makeService(failureNavigator(name));
  const result = await service.shareFiles([makeFile(service)]);
  assert.equal(result.status, "fallback-required", `${name} fordert keinen expliziten Fallback an.`);
  assert.equal(result.code, code, `${name} wurde falsch klassifiziert.`);
  assert.equal(result.reason, reason, `${name} erhielt einen falschen Grund.`);
  assert(!result.userMessage.includes("Browser nicht erlaubt"), `${name} behauptet eine unbewiesene Browserberechtigung.`);
}

{
  const service = makeService(failureNavigator("AbortError"));
  const result = await service.shareFiles([makeFile(service)]);
  assert.deepEqual({ status: result.status, reason: result.reason }, { status: "cancelled", reason: "user-cancelled" });
}

{
  const service = makeService({ canShare: () => true, share: async () => { throw new Error("technisch"); } });
  const result = await service.shareFiles([makeFile(service)]);
  assert.equal(result.status, "fallback-required");
  assert.equal(result.code, "SHARE_FAILED");
  assert.equal(result.reason, "technical-error");
}

{
  const service = makeService({
    canShare: data => data.files?.[0]?.type === "application/zip",
    share: async () => { throw new DOMException("Permission denied", "NotAllowedError"); }
  });
  const zip = makeFile(service, "FRECKA-Steuerberaterpaket.zip", "application/zip");
  assert.equal(zip.type, "application/zip");
  const result = await service.shareFiles([zip]);
  assert.equal(result.status, "fallback-required", "ZIP-NotAllowedError bietet keinen expliziten Speichern-Fallback.");
  assert.equal(result.code, "SHARE_NOT_ALLOWED");
}

{
  let shares = 0;
  let downloads = 0;
  const service = makeService({
    canShare: () => true,
    share: async () => { shares += 1; throw new DOMException("Permission denied", "NotAllowedError"); }
  }, {
    document: { createElement() { downloads += 1; }, body: { append() {} } },
    urlApi: { createObjectURL: () => "blob:test", revokeObjectURL() {} }
  });
  const file = makeFile(service);
  const result = await service.sharePreferred({ files: [file], url: "https://app.example.invalid/frecka/#/p/r/1/d/x", downloadFile: file });
  assert.equal(result.status, "fallback-required");
  assert.equal(shares, 1, "Ein fehlgeschlagener Datei-Share startete einen zweiten Share-Versuch.");
  assert.equal(downloads, 0, "Ein fehlgeschlagener Datei-Share startete automatisch einen Download.");
}

{
  let downloads = 0;
  const service = makeService(failureNavigator("AbortError"), {
    document: { createElement() { downloads += 1; }, body: { append() {} } },
    urlApi: { createObjectURL: () => "blob:test", revokeObjectURL() {} }
  });
  const file = makeFile(service);
  assert.equal((await service.sharePreferred({ files: [file], downloadFile: file })).status, "cancelled");
  assert.equal(downloads, 0, "Benutzerabbruch startete einen Download.");
}

{
  let clicks = 0;
  let revokes = 0;
  const service = makeService(failureNavigator("NotAllowedError"), {
    document: { createElement() { return { click() { clicks += 1; }, remove() {} }; }, body: { append() {} } },
    urlApi: { createObjectURL: () => "blob:test", revokeObjectURL() { revokes += 1; } },
    setTimeout(callback) { callback(); }
  });
  const file = makeFile(service);
  const failedShare = await service.shareFiles([file]);
  assert.equal(failedShare.status, "fallback-required");
  assert.equal(clicks, 0, "Der Fallback wurde ohne explizite Aktion gestartet.");
  const download = service.downloadFallback(file);
  assert.equal(download.status, "downloaded");
  assert.equal(clicks, 1, "Die explizite Speichern-Aktion klickte nicht genau einmal.");
  assert.equal(revokes, 1, "Die Objekt-URL des erfolgreichen Downloads wurde nicht widerrufen.");
}

{
  let calls = 0;
  const service = makeService({ canShare: () => true, share: async () => { calls += 1; } });
  const iosPdf = makeFile(service, "FRECKA-iPhone.pdf", "application/pdf");
  assert.equal((await service.shareFiles([iosPdf])).status, "shared", "Der erfolgreiche iOS-Datei-Share-Pfad änderte sich logisch.");
  assert.equal(calls, 1);
}

{
  let payload = null;
  const service = makeService({ canShare: data => Boolean(data.url), share: async data => { payload = data; } });
  const result = await service.shareUrl("https://app.example.invalid/frecka/#/p/r/1/d/text", { title: "Beleg", text: "Text teilen" });
  assert.equal(result.status, "shared", "Text-/Link-Share ist nicht mehr möglich.");
  assert.equal(payload.text, "Text teilen");
  assert.equal(payload.files, undefined);
}

console.log("SHARING-SMOKE BESTANDEN (17 Fälle)");
