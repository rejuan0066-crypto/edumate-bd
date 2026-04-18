import { useEffect, useState } from 'react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';

const CACHE_KEY = 'cached_favicon_url';
const MANIFEST_CACHE_KEY = 'cached_manifest_url';

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
      const manifestUrl = buildManifest({
        name: appName,
        short_name: shortName,
        icon: appIconSrc,
        theme_color: themeColor,
      });
      applyManifest(manifestUrl);
      localStorage.setItem(MANIFEST_CACHE_KEY, manifestUrl);
    }
  }, [isLoading, faviconSrc, appIconSrc, appName, shortName, themeColor]);

  return null;
};

function applyFavicon(src: string) {
  const link = document.getElementById('dynamic-favicon') as HTMLLinkElement | null;
  if (link) {
    link.href = src;
    link.type = 'image/png';
  }
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

function buildManifest(opts: { name: string; short_name: string; icon: string; theme_color: string }) {
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
      { src: opts.icon, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: opts.icon, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    categories: ['education', 'productivity'],
    lang: 'bn',
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  return URL.createObjectURL(blob);
}

export default DynamicFavicon;
