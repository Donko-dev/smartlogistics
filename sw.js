const CACHE_NAME = 'smart-logistics-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './favicon-192.png',
  './data.json'
];

// Cache each file individually instead of cache.addAll(), which aborts and
// caches NOTHING if even a single file 404s or is slow. This way, one missing
// file can't silently wipe out offline support for everything else.
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        APP_SHELL.map(url =>
          fetch(url, { cache: 'no-store' })
            .then(res => { if (res && res.ok) return cache.put(url, res); })
            .catch(() => {}) // one failing file no longer blocks the rest
        )
      )
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for data.json (so config updates are picked up when online),
// cache-first + runtime self-healing for everything else: any resource
// successfully fetched while online is stored for future offline use, even
// if it wasn't part of the original install-time list.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;

  if (url.includes('data.json')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
