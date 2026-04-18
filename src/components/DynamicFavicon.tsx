import { useEffect, useState } from 'react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';

const CACHE_KEY = 'cached_favicon_url';
const MANIFEST_CACHE_KEY = 'cached_manifest_url';
const ICON_192_CACHE = 'cached_icon_192';
const ICON_512_CACHE = 'cached_icon_512';

const DynamicFavicon = () => {
  const { settings, isLoading } = useWebsiteSettings();
  const [applied, setApplied] = useState(false);

  // Apply cached favicon/manifest immediately on mount (before DB loads)
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached && !applied) {
      applyFavicon(cached);
      applyAppleTouchIcon(cached);
    }
    const cachedManifest = localStorage.getItem(MANIFEST_CACHE_KEY);
    if (cachedManifest) {
      applyManifest(cachedManifest);
    }
  }, []);

  const faviconSrc = settings.favicon_url || settings.logo_url;
  const appIconSrc = settings.logo_url || settings.favicon_url;
  const appName = settings.institution_name_en || settings.institution_name || 'Madrasah';
  const shortName = (settings.institution_name_en || settings.institution_name || 'App').slice(0, 12);
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
          const manifestUrl = buildManifest({
            name: appName,
            short_name: shortName,
            icon192: icon192!,
            icon512: icon512!,
            theme_color: themeColor,
          });
          applyManifest(manifestUrl);
          localStorage.setItem(MANIFEST_CACHE_KEY, manifestUrl);
          // Use the high-quality 192 PNG for apple-touch-icon too
          applyAppleTouchIcon(icon192!);
        } catch (e) {
          // Fallback to original src
          const manifestUrl = buildManifest({
            name: appName,
            short_name: shortName,
            icon192: appIconSrc,
            icon512: appIconSrc,
            theme_color: themeColor,
          });
          applyManifest(manifestUrl);
        }
      })();
    }
  }, [isLoading, faviconSrc, appIconSrc, appName, shortName, themeColor]);

  return null;
};

function applyFavicon(src: string) {
  const existing = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
  existing.forEach((el) => el.parentNode?.removeChild(el));

  const mime = guessMime(src);
  const link = document.createElement('link');
  link.rel = 'icon';
  link.id = 'dynamic-favicon';
  link.type = mime;
  link.href = src.includes('?') ? src : `${src}?v=${Date.now()}`;
  document.head.appendChild(link);

  const shortcut = document.createElement('link');
  shortcut.rel = 'shortcut icon';
  shortcut.type = mime;
  shortcut.href = link.href;
  document.head.appendChild(shortcut);
}

function guessMime(src: string): string {
  const lower = src.split('?')[0].toLowerCase();
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.ico')) return 'image/x-icon';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

function applyAppleTouchIcon(src: string) {
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

function buildManifest(opts: {
  name: string;
  short_name: string;
  icon192: string;
  icon512: string;
  theme_color: string;
}) {
  const manifest = {
    name: opts.name,
    short_name: opts.short_name,
    description: 'Islamic Education Management System',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: opts.theme_color,
    icons: [
      { src: opts.icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: opts.icon512, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: opts.icon192, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: opts.icon512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    categories: ['education', 'productivity'],
    lang: 'bn',
  };
  // Use data URL (not blob:) — Android Chrome requires same-origin or data: manifest for install
  const json = JSON.stringify(manifest);
  return 'data:application/manifest+json;charset=utf-8,' + encodeURIComponent(json);
}

export default DynamicFavicon;
