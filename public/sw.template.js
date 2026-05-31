/**
 * Service Worker — Albumix
 *
 * __CACHE_VERSION__ is replaced at build time by scripts/inject-sw-version.mjs
 * with the first 8 chars of VERCEL_GIT_COMMIT_SHA (or a timestamp fallback).
 * Bumping the version on every build forces old caches to be evicted on activate.
 *
 * Caching strategies:
 *   - seed-manifest.json + /manifest.json  → network-first (changes each deploy)
 *   - /stickers/seed/* + /icons/*          → cache-first  (immutable once written)
 *   - /_next/static/*                      → cache-first  (content-hashed by Next.js)
 *   - everything else (navigation / API)   → network-first with cache fallback
 */

const CACHE_VERSION = "__CACHE_VERSION__";
const CACHE_NAME = `albumix-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/album",
  "/trade",
  "/settings",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                (key.startsWith("cromos-2026-") || key.startsWith("albumix-")) &&
                key !== CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first: seed-manifest + PWA manifest (change on every deploy)
  if (
    url.pathname === "/stickers/seed-manifest.json" ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first: immutable assets
  if (
    url.pathname.startsWith("/stickers/seed/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Network-first: navigation + everything else
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
