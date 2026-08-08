"use strict";

const APP_SHELL_CACHE_PREFIX = "frecka-app-shell-";
const APP_SHELL_CACHE = `${APP_SHELL_CACHE_PREFIX}0.9.1-offline001-1`;
const APP_ENTRY_URL = new URL("./index.html", self.location.href).href;
const APP_SHELL_PATHS = Object.freeze([
  "./index.html",
  "./styles.css?v=offline001-1",
  "./manifest.webmanifest?v=offline001-1",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./vendor/qrcodegen-v1.8.0-es6.js?v=offline001-1",
  "./vendor/pdf-lib-v1.17.1.min.js?v=offline001-1",
  "./js/config.js?v=offline001-1",
  "./js/qr.js?v=offline001-1",
  "./js/documents.js?v=offline001-1",
  "./js/public-documents.js?v=offline001-1",
  "./js/sharing.js?v=offline001-1",
  "./js/document-view.js?v=offline001-1",
  "./js/public-viewer.js?v=offline001-1",
  "./js/data.js?v=offline001-1",
  "./js/persistence.js?v=offline001-1",
  "./js/backup.js?v=offline001-1",
  "./js/export.js?v=offline001-1",
  "./js/app.js?v=offline001-1"
]);
const APP_SHELL_URLS = APP_SHELL_PATHS.map(path => new URL(path, self.location.href).href);

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(cache => cache.addAll(APP_SHELL_URLS))
  );
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
      caches.match(APP_ENTRY_URL).then(cachedEntry => cachedEntry || fetch(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cachedResponse => cachedResponse || fetch(request))
  );
});
