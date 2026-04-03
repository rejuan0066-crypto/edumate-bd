import { useEffect } from 'react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';

const DynamicFavicon = () => {
  const { settings } = useWebsiteSettings();

  const faviconSrc = settings.favicon_url || settings.logo_url;

  useEffect(() => {
    if (faviconSrc) {
      const link = document.getElementById('dynamic-favicon') as HTMLLinkElement | null;
      if (link) {
        link.href = faviconSrc;
        link.type = 'image/png';
      }
    }
  }, [faviconSrc]);

  return null;
};

export default DynamicFavicon;
