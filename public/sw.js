/**
 * Service Worker — Cromos 2026
 * Strategy: Cache-first for static assets, network-first for pages.
 * Enables offline use after first load.
 */

const CACHE_NAME = "cromos-2026-v1";

// Assets to pre-cache on install (app shell)
const PRECACHE_URLS = [
  "/",
  "/album",
  "/trade",
  "/settings",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and cross-origin requests
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Cache-first for static assets (images, icons, fonts)
  if (
    url.pathname.startsWith("/stickers/seed/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.includes(".")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Network-first for navigation (pages)
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((c) => c || fetch(request)))
  );
});
