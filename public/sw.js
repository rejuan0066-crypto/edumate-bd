// Minimal service worker — required for PWA installability on Android Chrome
// Does NOT cache anything (avoids stale content issues)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first, no caching — just pass through
  // This satisfies PWA install criteria without breaking updates
  return;
});
