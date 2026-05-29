/* Shawarmer IT Operations — Service Worker */
const CACHE_NAME = 'shawarmer-it-v5.1';
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
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        // Return offline fallback for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});