// Service Worker — PWA install + Web Push + smart pre-cache
//
// Strategy:
//  - Pre-cache app shell ("/", manifest, icons) on install so the very first
//    PWA launch paints instantly from cache.
//  - Navigations: stale-while-revalidate. We serve the cached "/" immediately
//    (instant Home), then refresh it in the background. New deploys land on
//    the next launch — old hashed chunks are cleaned via cache versioning.
//  - Hashed build assets (/assets/*-[hash].js|css): cache-first, immutable.
//  - Images/fonts: stale-while-revalidate.
//  - Supabase / cross-origin API: never touched.
//
// Bump CACHE_VERSION whenever you change the SW logic.

const CACHE_VERSION = 'v7';
const OFFLINE_URL = '/offline.html';
const SHELL_CACHE = `subhania-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `subhania-assets-${CACHE_VERSION}`;
const IMAGE_CACHE = `subhania-images-${CACHE_VERSION}`;

// Files we want available offline / instantly on first PWA launch
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/app-icon.png',
  '/app-icon-192.png',
  '/app-icon.svg',
  '/placeholder.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // addAll fails if any single request fails — use Promise.allSettled equivalent
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'reload' });
            if (res && res.ok) await cache.put(url, res.clone());
          } catch (_) {
            /* skip — non-fatal */
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const valid = new Set([SHELL_CACHE, ASSET_CACHE, IMAGE_CACHE]);
      await Promise.all(keys.filter((k) => !valid.has(k)).map((k) => caches.delete(k)));
      // Speed up navigation revalidations on supported browsers
      if (self.registration.navigationPreload) {
        try { await self.registration.navigationPreload.enable(); } catch (_) {}
      }
      await self.clients.claim();
    })()
  );
});

// Allow the page to force activation / clear caches on demand.
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => {
          if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true });
        })
    );
  }
  if (data.type === 'REFRESH_SHELL') {
    event.waitUntil(refreshShellAndAssets());
  }
});

// ───────── Background refresh of shell + warm assets ─────────
//
// Re-fetches "/" and the precache list, plus revalidates any hashed assets
// already present in the asset cache. Runs on:
//  - Background Sync (one-shot, when connectivity returns)
//  - Periodic Background Sync (~ every few hours, Chrome/Android only)
//  - Manual REFRESH_SHELL message from the page
async function refreshShellAndAssets() {
  try {
    const shell = await caches.open(SHELL_CACHE);
    await Promise.all(
      PRECACHE_URLS.map(async (url) => {
        try {
          const res = await fetch(url, { cache: 'reload' });
          if (res && res.ok) await shell.put(url, res.clone());
        } catch (_) {}
      })
    );

    // Revalidate hashed assets we already have (keeps icons/fonts/css fresh).
    const assetCache = await caches.open(ASSET_CACHE);
    const reqs = await assetCache.keys();
    await Promise.all(
      reqs.slice(0, 40).map(async (req) => {
        try {
          const res = await fetch(req, { cache: 'no-cache' });
          if (res && res.ok) await assetCache.put(req, res.clone());
        } catch (_) {}
      })
    );
  } catch (_) {}
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'refresh-shell') {
    event.waitUntil(refreshShellAndAssets());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-shell') {
    event.waitUntil(refreshShellAndAssets());
  }
});


// ───────── Helpers ─────────

const isHashedAsset = (url) => /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(?:js|css|woff2?|ttf|otf)(?:\?|$)/.test(url.pathname);

const isImage = (req, url) =>
  req.destination === 'image' ||
  /\.(?:png|jpe?g|gif|svg|webp|ico|avif)$/i.test(url.pathname);

// stale-while-revalidate: return cache instantly, refresh in background
async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

// cache-first for immutable hashed assets
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (e) {
    if (cached) return cached;
    throw e;
  }
}

// Navigation handler: try preload/network fast, fall back to cached "/"
async function handleNavigation(event) {
  const cache = await caches.open(SHELL_CACHE);
  const cachedShell = await cache.match('/');
  const reqUrl = new URL(event.request.url);
  const isRootNav = reqUrl.pathname === '/' || reqUrl.pathname === '';

  const networkPromise = (async () => {
    try {
      const preload = event.preloadResponse ? await event.preloadResponse : null;
      const res = preload || (await fetch(event.request));
      // ONLY update "/" shell when the request itself was for "/" AND response
      // was a clean 200 (not a redirect, not an auth-gated page). This prevents
      // poisoning the shell cache with login redirects or deep-page HTML.
      if (
        res &&
        res.ok &&
        res.status === 200 &&
        res.type !== 'opaqueredirect' &&
        !res.redirected &&
        isRootNav &&
        event.request.mode === 'navigate'
      ) {
        try { await cache.put('/', res.clone()); } catch (_) {}
      }
      return res;
    } catch (_) {
      return null;
    }
  })();

  if (!cachedShell) {
    const res = await networkPromise;
    if (res) return res;
    const offline = await cache.match(OFFLINE_URL);
    return offline || new Response('Offline', { status: 503, statusText: 'Offline' });
  }

  // For non-root navigations, always prefer network — never serve cached "/" for /admin/x etc.
  if (!isRootNav) {
    const res = await networkPromise;
    if (res) return res;
    if (!self.navigator.onLine) {
      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;
    }
    return cachedShell;
  }

  // Root nav: give network a brief head start, else serve cached shell
  const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1200));
  const winner = await Promise.race([networkPromise, timeoutPromise]);
  if (winner) return winner;
  if (!self.navigator.onLine) {
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
  }
  return cachedShell;
}

// ───────── Fetch ─────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  // Never touch Supabase / cross-origin APIs
  if (url.origin !== self.location.origin) return;
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) return;

  // Navigation requests → cached shell with background refresh
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }

  // Hashed build assets are immutable → cache-first
  if (isHashedAsset(url)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // Images / fonts (icons, logos, placeholders) → stale-while-revalidate
  if (isImage(request, url) || request.destination === 'font') {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // Manifest → stale-while-revalidate so install card is instant
  if (url.pathname === '/manifest.json' || url.pathname.endsWith('.webmanifest')) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    return;
  }

  // Everything else (e.g. CSS without hash, scripts not in /assets) → SWR
  if (request.destination === 'style' || request.destination === 'script') {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
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
