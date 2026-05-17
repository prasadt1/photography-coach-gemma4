/**
 * sw.js — Service Worker for iOS PWA offline support
 * Network-first for HTML/shell; cache-first for hashed assets only.
 */

const CACHE_NAME = 'photography-coach-v8-network-first-shell';
const ASSETS_TO_PRECACHE = ['/manifest.json'];

self.addEventListener('install', (event) => {
  if (self.location.hostname.includes('ngrok') || self.location.hostname.includes('trycloudflare')) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

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

  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/demo-samples/') ||
    self.location.hostname.includes('ngrok') ||
    self.location.hostname.includes('trycloudflare')
  ) {
    return;
  }

  const isNavigation =
    event.request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/index.html';

  const isHashedAsset = url.pathname.startsWith('/assets/');

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (isHashedAsset) {
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
    return;
  }

  // Default: network only (API routes, images, sw.js itself)
});
