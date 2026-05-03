// Service Worker — PWA + Web Push
// Strategy: never cache the app shell/assets, so installed PWAs always boot the
// newest deployment; keep this worker only for installability + Web Push.
const CACHE_NAME = 'subhania-v3';
const STATIC_CACHE = 'subhania-static-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // delete old caches
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE).map((k) => caches.delete(k)))
      ),
      self.clients.claim(),
    ])
  );
});

// Allow the page to force an immediate activation of a waiting worker.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: network-first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip non-http(s) and Supabase API (always live)
  if (!url.protocol.startsWith('http')) return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('supabase.in')) return;

  // For navigation requests → network only. Cached HTML keeps installed PWAs
  // stuck on old builds, especially on iOS Safari.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request));
    return;
  }

  // Static build assets → network only. If a deploy changes asset hashes, a
  // cached old chunk can make the reload look successful while still running old code.
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(fetch(request));
  }
});

// ===== Web Push =====
self.addEventListener('push', (event) => {
  let payload = { title: 'Subhania', body: 'New notification', link: '/', icon: '/app-icon.svg' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_) {
    if (event.data) payload.body = event.data.text();
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/app-icon.svg',
    badge: payload.icon || '/app-icon.svg',
    data: { link: payload.link || '/', category: payload.category || 'general' },
    tag: payload.tag || 'subhania-notif',
    renotify: true,
    vibrate: [120, 60, 120],
  };
  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(link).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    })
  );
});
