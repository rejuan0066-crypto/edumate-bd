import { useEffect, useState, useRef } from 'react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';

const CACHE_KEY = 'cached_favicon_url';
const MANIFEST_CACHE_KEY = 'cached_manifest_url';
const ICON_192_CACHE = 'cached_icon_192';
const ICON_512_CACHE = 'cached_icon_512';

const DynamicFavicon = () => {
  const { settings, isLoading } = useWebsiteSettings();
  const [applied, setApplied] = useState(false);
  const lastProcessedPwaKey = useRef<string>('');

  // Apply cached favicon immediately on mount (before DB loads).
  // NOTE: the manifest link is intentionally left pointing at the static,
  // same-origin /manifest.json — replacing it with a data:/blob: URL makes the
  // app un-installable on Android Chrome.
  useEffect(() => {
    ['cached_favicon_url', 'cached_loader_logo', 'cached_icon_192', 'cached_icon_512'].forEach(k => {
      const v = localStorage.getItem(k);
      if (v && (v.includes('wwhunyzobtuibhvkipwk') || v.includes('cloudinary.com'))) localStorage.removeItem(k);
    });

    const cached = localStorage.getItem(CACHE_KEY);
    const initial = (cached && !cached.includes('wwhunyzobtuibhvkipwk') && !cached.includes('cloudinary.com'))
      ? cached
      : '/loader-logo.png';
    if (!applied) {
      applyFavicon(initial);
      applyAppleTouchIcon(initial);
    }
    localStorage.removeItem(MANIFEST_CACHE_KEY);
  }, []);

  const rawFavicon = settings.favicon_url || settings.logo_url;
  const faviconSrc = (rawFavicon && !rawFavicon.includes('wwhunyzobtuibhvkipwk')) ? rawFavicon : '/loader-logo.png';
  const rawAppIcon = settings.logo_url || settings.favicon_url;
  const appIconSrc = (rawAppIcon && !rawAppIcon.includes('wwhunyzobtuibhvkipwk')) ? rawAppIcon : '/loader-logo.png';
  const rawName = settings.institution_name_en || settings.institution_name || 'Madrasah';
  const appName = trimWordAware(rawName, 30);
  const shortName = trimWordAware(rawName, 12);
  const themeColor = (settings as any).theme_color || '#0f766e';

  // Update when settings load from DB
  useEffect(() => {
    if (!isLoading && faviconSrc) {
      applyFavicon(faviconSrc);
      localStorage.setItem(CACHE_KEY, faviconSrc);
      setApplied(true);
    }
    if (!isLoading && appIconSrc) {
      applyAppleTouchIcon(appIconSrc);
      const pwaKey = `${appIconSrc}:${appName}:${shortName}:${themeColor}`;
      if (lastProcessedPwaKey.current === pwaKey) return;
      lastProcessedPwaKey.current = pwaKey;
      // Generate proper-sized PNG icons for PWA install
      (async () => {
        try {
          // v2 cache key — invalidates old square/white-bg icons
          const ck192 = ICON_192_CACHE + ':v2:' + appIconSrc;
          const ck512 = ICON_512_CACHE + ':v2:' + appIconSrc;
          const cached192 = localStorage.getItem(ck192);
          const cached512 = localStorage.getItem(ck512);
          let icon192 = cached192;
          let icon512 = cached512;
          if (!icon192 || !icon512) {
            [icon192, icon512] = await Promise.all([
              rasterizeToPng(appIconSrc, 192, themeColor),
              rasterizeToPng(appIconSrc, 512, themeColor),
            ]);
            try {
              localStorage.setItem(ck192, icon192);
              localStorage.setItem(ck512, icon512);
            } catch {}
          }
          await publishManifest({
            name: appName,
            short_name: shortName,
            icon192: icon192!,
            icon512: icon512!,
            theme_color: themeColor,
          });
          applyAppleWebAppTitle(shortName);
          // Use the high-quality 192 PNG for apple-touch-icon too
          applyAppleTouchIcon(icon192!);
        } catch (e) {
          // Keep the static /manifest.json — still installable
          applyAppleWebAppTitle(shortName);
        }

      })();
    }
  }, [isLoading, faviconSrc, appIconSrc, appName, shortName, themeColor]);

  return null;
};

let lastAppliedFaviconSrc = '';

function applyFavicon(src: string) {
  if (!src) return;
  lastAppliedFaviconSrc = src;

  let link = document.getElementById('dynamic-favicon') as HTMLLinkElement | null;
  const mime = guessMime(src);

  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.id = 'dynamic-favicon';
    document.head.appendChild(link);
  }

  link.type = mime;
  link.href = src;

  // Also sync any other favicon links in <head>
  const otherIcons = document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]:not(#dynamic-favicon)');
  otherIcons.forEach((el) => {
    el.href = src;
    el.type = mime;
  });
}

function guessMime(src: string): string {
  const lower = src.split('?')[0].toLowerCase();
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.ico')) return 'image/x-icon';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

let lastAppliedAppleTouchSrc = '';

function applyAppleTouchIcon(src: string) {
  if (!src || src === lastAppliedAppleTouchSrc) return;
  lastAppliedAppleTouchSrc = src;

  let link = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'apple-touch-icon';
    document.head.appendChild(link);
  }
  link.href = src;
}

function applyManifest(href: string) {
  let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }
  link.href = href;
}

async function rasterizeToPng(src: string, size: number, bgColor = '#0f766e'): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));

      // Clip to rounded square (squircle) so install prompt shows rounded corners
      const radius = size * 0.22;
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(size - radius, 0);
      ctx.quadraticCurveTo(size, 0, size, radius);
      ctx.lineTo(size, size - radius);
      ctx.quadraticCurveTo(size, size, size - radius, size);
      ctx.lineTo(radius, size);
      ctx.quadraticCurveTo(0, size, 0, size - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.clip();

      // Brand background fills inside the rounded clip
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);

      // Contain-fit the logo with padding
      const pad = size * 0.14;
      const target = size - pad * 2;
      const ratio = Math.min(target / img.width, target / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(head)?.[1] || 'image/png';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Build a BRANDED manifest and publish it at the SAME-ORIGIN url `/manifest.json`
 * through the service worker's branding cache.
 *
 * Android Chrome refuses to install a PWA whose manifest is a `data:` (or `blob:`)
 * URL — the manifest and its icons must be real, fetchable, same-origin URLs.
 * So the icons are stored at `/branded-icon-192.png` and `/branded-icon-512.png`
 * and the manifest simply points at them. If the service worker is not ready yet,
 * the static `/manifest.json` shipped with the build stays in place (still
 * installable, just with the default name/icon).
 */
async function publishManifest(opts: {
  name: string;
  short_name: string;
  icon192: string;
  icon512: string;
  theme_color: string;
}) {
  const manifest = {
    name: opts.name,
    short_name: opts.short_name,
    id: '/?source=pwa',
    description: 'Islamic Education Management System',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui', 'browser'],
    orientation: 'any',
    background_color: '#ffffff',
    theme_color: opts.theme_color,
    icons: [
      { src: '/branded-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/branded-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/branded-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/branded-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    categories: ['education', 'productivity'],
    lang: 'bn',
    prefer_related_applications: false,
  };

  if (!('caches' in window) || !('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.ready;
    const cache = await caches.open('subhania-branding');
    await cache.put(
      '/branded-icon-192.png',
      new Response(dataUrlToBlob(opts.icon192), { headers: { 'Content-Type': 'image/png' } }),
    );
    await cache.put(
      '/branded-icon-512.png',
      new Response(dataUrlToBlob(opts.icon512), { headers: { 'Content-Type': 'image/png' } }),
    );
    await cache.put(
      '/manifest.json',
      new Response(JSON.stringify(manifest), {
        headers: { 'Content-Type': 'application/manifest+json' },
      }),
    );
    // Re-point the link so Chrome re-reads the (now branded) manifest
    applyManifest('/manifest.json');
  } catch {
    /* keep the static manifest */
  }
}


function applyAppleWebAppTitle(title: string) {
  let meta = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'apple-mobile-web-app-title';
    document.head.appendChild(meta);
  }
  meta.content = title;
}

function trimWordAware(input: string, max: number): string {
  const s = (input || '').trim().replace(/\s+/g, ' ');
  if (s.length <= max) return s;
  const slice = s.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  // If we have a reasonable word boundary, cut there; else hard slice with ellipsis
  if (lastSpace >= Math.floor(max * 0.6)) return slice.slice(0, lastSpace).trim();
  return slice.trim().replace(/[\s\-_,.;:]+$/, '') + '…';
}

export default DynamicFavicon;
