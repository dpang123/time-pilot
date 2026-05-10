// Minimal offline-first service worker.
// - HTML navigations: network-first so users always get the latest deploy
//   (avoids stale index.html pointing at deleted hashed JS bundles).
// - Hashed assets, icons, manifest: cache-first.
// - /api/*: never intercept (always go to network for live leaderboard).

const VERSION = 'tp-v2';
const SHELL = ['/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept API calls.
  if (url.pathname.startsWith('/api/')) return;

  // Network-first for HTML page navigations: ensures new deploys load.
  const isHtml =
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHtml) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Cache-first for hashed assets, icons, manifest, etc.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});
