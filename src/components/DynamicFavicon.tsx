import { useEffect } from 'react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';

const DynamicFavicon = () => {
  const { settings } = useWebsiteSettings();

  useEffect(() => {
    if (settings.logo_url) {
      const link = document.getElementById('dynamic-favicon') as HTMLLinkElement | null;
      if (link) {
        link.href = settings.logo_url;
        link.type = 'image/png';
      }
    }
  }, [settings.logo_url]);

  return null;
};

export default DynamicFavicon;
