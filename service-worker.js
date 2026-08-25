"use strict";

const APP_SHELL_CACHE_PREFIX = "frecka-app-shell-";
const APP_SHELL_CACHE = `${APP_SHELL_CACHE_PREFIX}0.11.2-onboarding001-1`;
const APP_ENTRY_URL = new URL("./index.html", self.location.href).href;
const APP_SHELL_PATHS = Object.freeze([
  "./index.html",
  "./styles.css?v=onboarding001-1",
  "./manifest.webmanifest?v=onboarding001-1",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./vendor/qrcodegen-v1.8.0-es6.js?v=onboarding001-1",
  "./vendor/pdf-lib-v1.17.1.min.js?v=onboarding001-1",
  "./vendor/jszip-v3.10.1.min.js?v=onboarding001-1",
  "./js/config.js?v=onboarding001-1",
  "./js/qr.js?v=onboarding001-1",
  "./js/documents.js?v=onboarding001-1",
  "./js/public-documents.js?v=onboarding001-1",
  "./js/sharing.js?v=onboarding001-1",
  "./js/document-view.js?v=onboarding001-1",
  "./js/public-viewer.js?v=onboarding001-1",
  "./js/data.js?v=onboarding001-1",
  "./js/persistence.js?v=onboarding001-1",
  "./js/backup.js?v=onboarding001-1",
  "./js/export.js?v=onboarding001-1",
  "./js/export-package.js?v=onboarding001-1",
  "./js/pwa-update.js?v=onboarding001-1",
  "./js/app.js?v=onboarding001-1"
]);
const APP_SHELL_URLS = APP_SHELL_PATHS.map(path => new URL(path, self.location.href).href);

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(cache => cache.addAll(APP_SHELL_URLS))
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
