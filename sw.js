const CACHE_NAME = 'smart-logistics-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './favicon-192.png',
  './data.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for data.json (so config updates are picked up when online),
// cache-first for everything else (so the app still works offline).
self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (url.includes('data.json')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).catch(() => cached))
  );
});
