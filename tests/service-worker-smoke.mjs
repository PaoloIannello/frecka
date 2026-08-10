import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
const appSource = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
const baseUrl = "https://beta.frecka.app/releases/0.10.0-test/site/";
const listeners = new Map();
const addedUrls = [];
const deletedCaches = [];
const networkRequests = [];
const responses = new Map();
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
    addEventListener(type, listener) {
      listeners.set(type, listener);
    }
  }
});

vm.runInContext(source, context, { filename: "service-worker.js" });

assert.deepEqual([...listeners.keys()].sort(), ["activate", "fetch", "install"]);

let installPromise;
listeners.get("install")({
  waitUntil(promise) {
    installPromise = promise;
  }
});
await installPromise;

assert.equal(addedUrls.length, 21, "Der vollständige App-Shell muss vorab gecacht werden.");
assert.equal(new Set(addedUrls).size, addedUrls.length, "App-Shell-URLs dürfen nicht doppelt sein.");
assert.ok(addedUrls.includes(`${baseUrl}index.html`));
assert.ok(addedUrls.includes(`${baseUrl}styles.css?v=export001-2`));
assert.ok(addedUrls.includes(`${baseUrl}vendor/jszip-v3.10.1.min.js?v=export001-2`));
assert.ok(addedUrls.includes(`${baseUrl}js/export-package.js?v=export001-2`));
assert.ok(addedUrls.includes(`${baseUrl}js/app.js?v=export001-2`));
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
assert.equal(new URL(manifest.start_url, baseUrl).pathname, "/releases/0.10.0-test/site/index.html");
assert.equal(new URL(manifest.scope, baseUrl).pathname, "/releases/0.10.0-test/site/");
assert.match(appSource, /serviceWorker\s*\.register\("\.\/service-worker\.js",\s*\{\s*scope:\s*"\.\/"\s*\}\)/);
assert.doesNotMatch(appSource, /\.unregister\s*\(/);
assert.doesNotMatch(appSource, /caches\.keys\s*\(/);

const currentCache = [...cacheNames].find(name => name === "frecka-app-shell-0.10.0-export001-2");
assert.ok(currentCache, "Der versionsgebundene Cache wurde nicht angelegt.");

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

const cachedAsset = { source: "cache", url: `${baseUrl}styles.css?v=export001-2` };
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

console.log("Service-Worker-Smoke-Test: PASS (App-Shell, Unterpfad, Offline-Fallback, Cache-Isolation)");
