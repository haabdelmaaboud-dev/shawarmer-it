/* Shawarmer IT Operations — Service Worker v6.2 */
const CACHE_NAME = 'shawarmer-it-v6.2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/config.js',
  '/js/api.js',
  '/js/state.js',
  '/js/ui.js',
  '/js/notifications.js',
  '/js/communication.js',
  '/js/views/dashboard.js',
  '/js/views/stores.js',
  '/js/views/critical.js',
  '/js/views/reports.js',
  '/js/views/engineers.js',
  '/js/views/alerts.js',
  '/js/views/admin.js',
  '/js/views/auditlog.js',
  '/js/views/history.js',
  '/js/views/profile.js',
  '/js/modals.js',
  '/js/app.js',
  '/assets/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map(asset => {
          return cache.add(asset).catch(err => {
            console.warn(`Service Worker failed to cache asset: ${asset}`, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('script.google.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});