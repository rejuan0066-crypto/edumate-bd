// Service Worker — PWA install + Web Push + production-safe caching
//
// Strategy (production-safe, no forced cache clears, no reload loops):
//  - Navigations (HTML): NETWORK-FIRST. Always fetch fresh HTML so a new deploy
//    immediately serves the new shell referencing the new hashed chunks. The
//    cached "/" is only used as an OFFLINE fallback. This prevents the classic
//    "stale shell points at deleted chunks" white-screen / reload loop.
//  - Hashed build assets (/assets/*-[hash].js|css): cache-first, immutable.
//  - Images/fonts: stale-while-revalidate.
//  - Supabase / cross-origin API: never touched.
//
// Stale caches are cleaned ONLY by version bump on activate (targeted), never by
// blanket clears on every load. Bump CACHE_VERSION whenever you change SW logic.

const CACHE_VERSION = 'v82';
const OFFLINE_URL = '/offline.html';
const SHELL_CACHE = `subhania-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `subhania-assets-${CACHE_VERSION}`;
const IMAGE_CACHE = `subhania-images-${CACHE_VERSION}`;
// Branded manifest + icons written by the app (survives version bumps)
const BRANDING_CACHE = 'subhania-branding';


// Files we want available offline / instantly on first PWA launch
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/loader-logo.png',
  '/branded-icon-192.png',
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
      const valid = new Set([SHELL_CACHE, ASSET_CACHE, IMAGE_CACHE, BRANDING_CACHE]);
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
      const ct = res && res.headers ? (res.headers.get('content-type') || '') : '';
    if (res && res.ok && !ct.includes('text/html')) cache.put(req, res.clone()).catch(() => {});
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
    const ct = res && res.headers ? (res.headers.get('content-type') || '') : '';
    if (res && res.ok && !ct.includes('text/html')) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (e) {
    if (cached) return cached;
    throw e;
  }
}

// Navigation handler: NETWORK-FIRST.
// Always try the network so a fresh deploy serves the new HTML shell (and its new
// hashed chunks) immediately. The cached "/" is used ONLY as an offline fallback.
// This is what prevents reload loops / white screens after deploy.
async function handleNavigation(event) {
  const cache = await caches.open(SHELL_CACHE);
  const reqUrl = new URL(event.request.url);
  const isRootNav = reqUrl.pathname === '/' || reqUrl.pathname === '';

  try {
    const preload = event.preloadResponse ? await event.preloadResponse : null;
    const res = preload || (await fetch(event.request));

    // Keep an up-to-date copy of the root shell for offline use ONLY when the
    // response is a clean 200 for "/" (never redirects / auth-gated pages).
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
    // Network failed → offline fallback path
    const cachedShell = await cache.match('/');
    if (cachedShell && isRootNav) return cachedShell;
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
    if (cachedShell) return cachedShell;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
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

  // Branded manifest / icons written by the app take priority (same-origin URLs,
  // which Android Chrome requires for install — a data: manifest is NOT installable)
  if (
    url.pathname === '/manifest.json' ||
    url.pathname === '/branded-icon-192.png' ||
    url.pathname === '/branded-icon-512.png'
  ) {
    event.respondWith(
      (async () => {
        const branded = await caches.open(BRANDING_CACHE);
        const hit = await branded.match(url.pathname);
        if (hit) return hit;
        if (url.pathname.startsWith('/branded-icon-')) {
          const fallback = url.pathname.includes('192') ? '/app-icon-192.png' : '/app-icon.png';
          return fetch(fallback);
        }
        return staleWhileRevalidate(request, SHELL_CACHE);
      })()
    );
    return;
  }
  if (url.pathname.endsWith('.webmanifest')) {
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
