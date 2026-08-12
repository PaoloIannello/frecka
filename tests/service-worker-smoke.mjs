import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
const appSource = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
const baseUrl = "https://beta.frecka.app/releases/0.10.10-test/site/";
const listeners = new Map();
const addedUrls = [];
const deletedCaches = [];
const networkRequests = [];
const responses = new Map();
let skipWaitingCalls = 0;
const cacheNames = new Set([
  "frecka-app-shell-0.9.0-old",
  "unrelated-application-cache"
]);

const cacheStorage = {
  async open(name) {
    cacheNames.add(name);
    return {
      async addAll(urls) {
        addedUrls.push(...urls);
      },
      async match(request) {
        const key = typeof request === "string" ? request : request.url;
        return responses.get(key) || null;
      }
    };
  },
  async keys() {
    return [...cacheNames];
  },
  async delete(name) {
    deletedCaches.push(name);
    return cacheNames.delete(name);
  },
  async match(request) {
    const key = typeof request === "string" ? request : request.url;
    return responses.get(key) || null;
  }
};

let networkOnline = true;
const context = vm.createContext({
  URL,
  Promise,
  Object,
  caches: cacheStorage,
  fetch: async request => {
    const url = typeof request === "string" ? request : request.url;
    networkRequests.push(url);
    if (!networkOnline) {
      throw new Error("offline");
    }
    return { source: "network", url };
  },
  self: {
    location: new URL(`${baseUrl}service-worker.js`),
    async skipWaiting() {
      skipWaitingCalls += 1;
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    }
  }
});

vm.runInContext(source, context, { filename: "service-worker.js" });

assert.deepEqual([...listeners.keys()].sort(), ["activate", "fetch", "install", "message"]);

let installPromise;
listeners.get("install")({
  waitUntil(promise) {
    installPromise = promise;
  }
});
await installPromise;

assert.equal(skipWaitingCalls, 0, "Die Installation darf den Worker nicht mehr automatisch aktivieren.");
assert.equal(addedUrls.length, 22, "Der vollständige App-Shell muss vorab gecacht werden.");
assert.equal(new Set(addedUrls).size, addedUrls.length, "App-Shell-URLs dürfen nicht doppelt sein.");
assert.ok(addedUrls.includes(`${baseUrl}index.html`));
assert.ok(addedUrls.includes(`${baseUrl}styles.css?v=serviceworker003-1`));
assert.ok(addedUrls.includes(`${baseUrl}vendor/jszip-v3.10.1.min.js?v=serviceworker003-1`));
assert.ok(addedUrls.includes(`${baseUrl}js/export-package.js?v=serviceworker003-1`));
assert.ok(addedUrls.includes(`${baseUrl}js/pwa-update.js?v=serviceworker003-1`));
assert.ok(addedUrls.includes(`${baseUrl}js/app.js?v=serviceworker003-1`));
assert.ok(addedUrls.every(url => url.startsWith(baseUrl)), "Alle URLs müssen relativ zum Release-Unterpfad bleiben.");

const htmlRuntimeReferences = [...indexSource.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(match => new URL(match[1], baseUrl).href);
for (const runtimeReference of htmlRuntimeReferences) {
  assert.ok(addedUrls.includes(runtimeReference), `Nicht im App-Shell-Cache: ${runtimeReference}`);
}
for (const icon of manifest.icons) {
  const iconUrl = new URL(icon.src, baseUrl).href;
  assert.ok(addedUrls.includes(iconUrl), `Manifest-Icon fehlt im App-Shell-Cache: ${iconUrl}`);
}

assert.equal(manifest.start_url, "./index.html#/home");
assert.equal(manifest.scope, "./");
assert.equal(new URL(manifest.start_url, baseUrl).pathname, "/releases/0.10.10-test/site/index.html");
assert.equal(new URL(manifest.scope, baseUrl).pathname, "/releases/0.10.10-test/site/");
assert.match(appSource, /pwaUpdateController\.start\(\{\s*scriptUrl:\s*"\.\/service-worker\.js",\s*scope:\s*"\.\/"\s*\}\)/);
assert.doesNotMatch(appSource, /\.unregister\s*\(/);
assert.doesNotMatch(appSource, /caches\.keys\s*\(/);
assert.doesNotMatch(source, /LEGACY_AUTO_ACTIVATION_FOR_SERVICEWORKER_002/, "Die SERVICEWORKER-002-Legacy-Konstante muss vollständig entfernt sein.");
assert.doesNotMatch(source, /clients\.claim\s*\(/, "Der Worker darf laufende Clients nicht automatisch übernehmen.");
assert.doesNotMatch(source, /indexedDB|localStorage|sessionStorage/, "Der Worker darf keine Geschäftsdaten berühren.");

const currentCache = [...cacheNames].find(name => name === "frecka-app-shell-0.10.10-serviceworker003-1");
assert.ok(currentCache, "Der versionsgebundene Cache wurde nicht angelegt.");

let unrelatedMessageWaited = false;
listeners.get("message")({
  data: { type: "OTHER" },
  waitUntil() {
    unrelatedMessageWaited = true;
  }
});
assert.equal(unrelatedMessageWaited, false, "Fremde Nachrichten dürfen den Worker nicht aktivieren.");
assert.equal(skipWaitingCalls, 0);

let messagePromise;
listeners.get("message")({
  data: { type: "SKIP_WAITING" },
  waitUntil(promise) {
    messagePromise = promise;
  }
});
await messagePromise;
assert.equal(skipWaitingCalls, 1, "Die bewusste Aktivierungsnachricht wurde nicht verarbeitet.");

let activatePromise;
listeners.get("activate")({
  waitUntil(promise) {
    activatePromise = promise;
  }
});
await activatePromise;

assert.deepEqual(deletedCaches, ["frecka-app-shell-0.9.0-old"]);
assert.ok(cacheNames.has(currentCache));
assert.ok(cacheNames.has("unrelated-application-cache"), "Fremde Caches dürfen nicht gelöscht werden.");

const cachedEntry = { source: "cache", url: `${baseUrl}index.html` };
responses.set(`${baseUrl}index.html`, cachedEntry);
networkOnline = false;

let navigationResponse;
listeners.get("fetch")({
  request: {
    method: "GET",
    mode: "navigate",
    url: `${baseUrl}receipt/demo`
  },
  respondWith(promise) {
    navigationResponse = promise;
  }
});
assert.equal(await navigationResponse, cachedEntry, "Offline-Navigation muss auf index.html zurückfallen.");
assert.equal(networkRequests.length, 0, "Für den gecachten Offline-Start darf kein Netzwerkzugriff nötig sein.");

const cachedAsset = { source: "cache", url: `${baseUrl}styles.css?v=serviceworker003-1` };
responses.set(cachedAsset.url, cachedAsset);
let assetResponse;
listeners.get("fetch")({
  request: {
    method: "GET",
    mode: "no-cors",
    url: cachedAsset.url
  },
  respondWith(promise) {
    assetResponse = promise;
  }
});
assert.equal(await assetResponse, cachedAsset);

networkOnline = true;
let networkResponse;
const uncachedUrl = `${baseUrl}optional.txt`;
listeners.get("fetch")({
  request: {
    method: "GET",
    mode: "same-origin",
    url: uncachedUrl
  },
  respondWith(promise) {
    networkResponse = promise;
  }
});
assert.deepEqual(await networkResponse, { source: "network", url: uncachedUrl });

let interceptedPost = false;
listeners.get("fetch")({
  request: {
    method: "POST",
    mode: "same-origin",
    url: `${baseUrl}submit`
  },
  respondWith() {
    interceptedPost = true;
  }
});
assert.equal(interceptedPost, false, "Nicht-GET-Anfragen dürfen nicht abgefangen werden.");

let interceptedExternal = false;
listeners.get("fetch")({
  request: {
    method: "GET",
    mode: "cors",
    url: "https://example.org/external.js"
  },
  respondWith() {
    interceptedExternal = true;
  }
});
assert.equal(interceptedExternal, false, "Fremde Origins dürfen nicht abgefangen werden.");

console.log("Service-Worker-Smoke-Test: PASS (keine Autoaktivierung, Nutzeraktionsnachricht, App-Shell, Unterpfad, Offline-Fallback, Cache-Isolation)");
