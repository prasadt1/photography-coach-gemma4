/**
 * sw.js — Service Worker for iOS PWA offline support
 * Cache-first strategy for static assets; network-first for Ollama API.
 *
 * Sources: docs/specs/10-platform-shells-spec.md §5.2
 */

const CACHE_NAME = 'photography-coach-v3.0.0-getusermedia';
const ASSETS_TO_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ─── Install: precache static shell ───────────────────────────────────────────

self.addEventListener('install', (event) => {
  // During dev, skip caching to avoid stale code issues
  if (self.location.hostname.includes('ngrok')) {
    self.skipWaiting();
    return;
  }
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

// ─── Web Share Target: POST /share-target ─────────────────────────────────────
// Android sends shared images here. We stash the blob in Cache Storage and
// redirect to /?shared=1 so the app can pick it up on mount.

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith((async () => {
      const formData = await event.request.formData();
      const file = formData.get('photo');
      if (file && file instanceof File) {
        const cache = await caches.open('shared-image');
        await cache.put('/shared-image', new Response(file, {
          headers: { 'Content-Type': file.type || 'image/jpeg' },
        }));
      }
      return Response.redirect('/?shared=1', 303);
    })());
    return;
  }
});

// ─── Fetch: cache-first for SAME-ORIGIN GET only; everything else passes through ─────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Pass-through (do NOT call respondWith) for:
  //  - Non-GET requests (POSTs to Gemini, Ollama, etc. — caching breaks them)
  //  - Cross-origin requests (Gemini API, fonts, CDN, anything off our origin)
  //  - The /share-target route (handled by the earlier listener)
  //  - Demo samples (these may change, don't cache them)
  //  - ngrok URLs during dev (always fetch fresh)
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname === '/share-target' ||
    url.pathname.startsWith('/demo-samples/') ||
    self.location.hostname.includes('ngrok')
  ) {
    return;
  }

  // Cache-first for SAME-ORIGIN GET (HTML/JS/CSS/fonts/images for the app shell)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
