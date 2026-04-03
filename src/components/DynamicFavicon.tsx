import { useEffect, useState } from 'react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';

const CACHE_KEY = 'cached_favicon_url';

const DynamicFavicon = () => {
  const { settings, isLoading } = useWebsiteSettings();
  const [applied, setApplied] = useState(false);

  // Apply cached favicon immediately on mount (before DB loads)
  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached && !applied) {
      applyFavicon(cached);
    }
  }, []);

  const faviconSrc = settings.favicon_url || settings.logo_url;

  // Update when settings load from DB
  useEffect(() => {
    if (!isLoading && faviconSrc) {
      applyFavicon(faviconSrc);
      localStorage.setItem(CACHE_KEY, faviconSrc);
      setApplied(true);
    }
  }, [isLoading, faviconSrc]);

  return null;
};

function applyFavicon(src: string) {
  const link = document.getElementById('dynamic-favicon') as HTMLLinkElement | null;
  if (link) {
    link.href = src;
    link.type = 'image/png';
  }
}

export default DynamicFavicon;
