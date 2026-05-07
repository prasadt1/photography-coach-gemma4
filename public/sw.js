/**
 * sw.js — Service Worker for iOS PWA offline support
 * Cache-first strategy for static assets; network-first for Ollama API.
 *
 * Sources: docs/specs/10-platform-shells-spec.md §5.2
 */

const CACHE_NAME = 'photography-coach-v2.0.0';
const ASSETS_TO_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ─── Install: precache static shell ───────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_PRECACHE))
  );
  self.skipWaiting();
});

// ─── Activate: clean old caches ───────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch: cache-first for assets, network-first for Ollama ─────────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always network-first for Ollama API (localhost:11434)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for everything else (JS/CSS/fonts)
  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached || fetch(event.request).then((response) => {
        // Only cache successful GET responses for same-origin assets
        if (
          event.request.method === 'GET' &&
          response.status === 200 &&
          url.origin === self.location.origin
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
    )
  );
});
