"use strict";

const APP_SHELL_CACHE_PREFIX = "frecka-app-shell-";
const APP_SHELL_CACHE = `${APP_SHELL_CACHE_PREFIX}0.10.2-serviceworker002-2`;
// Einmalige Brücke für bereits ausgelieferte 0.10.0/0.10.1-Clients ohne Update-UI.
// Diese Konstante und der automatische Aufruf müssen im nächsten Worker entfernt werden.
const LEGACY_AUTO_ACTIVATION_FOR_SERVICEWORKER_002 = true;
const APP_ENTRY_URL = new URL("./index.html", self.location.href).href;
const APP_SHELL_PATHS = Object.freeze([
  "./index.html",
  "./styles.css?v=serviceworker002-2",
  "./manifest.webmanifest?v=serviceworker002-2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./vendor/qrcodegen-v1.8.0-es6.js?v=serviceworker002-2",
  "./vendor/pdf-lib-v1.17.1.min.js?v=serviceworker002-2",
  "./vendor/jszip-v3.10.1.min.js?v=serviceworker002-2",
  "./js/config.js?v=serviceworker002-2",
  "./js/qr.js?v=serviceworker002-2",
  "./js/documents.js?v=serviceworker002-2",
  "./js/public-documents.js?v=serviceworker002-2",
  "./js/sharing.js?v=serviceworker002-2",
  "./js/document-view.js?v=serviceworker002-2",
  "./js/public-viewer.js?v=serviceworker002-2",
  "./js/data.js?v=serviceworker002-2",
  "./js/persistence.js?v=serviceworker002-2",
  "./js/backup.js?v=serviceworker002-2",
  "./js/export.js?v=serviceworker002-2",
  "./js/export-package.js?v=serviceworker002-2",
  "./js/pwa-update.js?v=serviceworker002-2",
  "./js/app.js?v=serviceworker002-2"
]);
const APP_SHELL_URLS = APP_SHELL_PATHS.map(path => new URL(path, self.location.href).href);

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(cache => cache.addAll(APP_SHELL_URLS))
      .then(() => LEGACY_AUTO_ACTIVATION_FOR_SERVICEWORKER_002 ? self.skipWaiting() : undefined)
  );
});

self.addEventListener("message", event => {
  if (event.data?.type !== "SKIP_WAITING") return;
  event.waitUntil(Promise.resolve(self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames
        .filter(cacheName => (
          cacheName.startsWith(APP_SHELL_CACHE_PREFIX)
          && cacheName !== APP_SHELL_CACHE
        ))
        .map(cacheName => caches.delete(cacheName))
    ))
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      caches.open(APP_SHELL_CACHE)
        .then(cache => cache.match(APP_ENTRY_URL))
        .then(cachedEntry => cachedEntry || fetch(request))
    );
    return;
  }

  event.respondWith(
    caches.open(APP_SHELL_CACHE)
      .then(cache => cache.match(request))
      .then(cachedResponse => cachedResponse || fetch(request))
  );
});
