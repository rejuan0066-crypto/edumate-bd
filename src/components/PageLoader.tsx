import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useLanguage } from '@/contexts/LanguageContext';
import { BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';

const CACHE_KEY = 'cached_loader_logo';
const CACHE_SHAPE_KEY = 'cached_loader_logo_shape';

const PageLoader = () => {
  const { settings, isLoading } = useWebsiteSettings();
  const { language } = useLanguage();
  
  // Use cached logo immediately to avoid flash of default.
  // Fall back to the full website-settings cache so the logo shows even if
  // the dedicated loader cache was never written (e.g. loader unmounted early).
  const [cachedLogo] = useState(() => {
    const direct = localStorage.getItem(CACHE_KEY);
    if (direct) return direct;
    try {
      const raw = localStorage.getItem('website-settings-cache');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return parsed.loader_logo_url || parsed.favicon_url || parsed.logo_url || '';
    } catch {
      return '';
    }
  });
  const [cachedShape] = useState(() => {
    const direct = localStorage.getItem(CACHE_SHAPE_KEY);
    if (direct) return direct;
    try {
      const raw = localStorage.getItem('website-settings-cache');
      if (!raw) return 'square';
      return JSON.parse(raw).loader_logo_shape || 'square';
    } catch {
      return 'square';
    }
  });
  const [imgFailed, setImgFailed] = useState(false);

  const loaderLogo = settings.loader_logo_url || settings.favicon_url || settings.logo_url;
  const loaderShape = settings.loader_logo_shape || 'square';

  // Update cache when settings load
  useEffect(() => {
    if (!isLoading && loaderLogo) {
      localStorage.setItem(CACHE_KEY, loaderLogo);
      localStorage.setItem(CACHE_SHAPE_KEY, loaderShape);
    }
  }, [isLoading, loaderLogo, loaderShape]);

  const DEFAULT_LOADER_LOGO = '/loader-logo.png';
  const displayLogo = imgFailed ? '/branded-icon-192.png' : (loaderLogo || cachedLogo || DEFAULT_LOADER_LOGO);
  const displayShape = (loaderLogo ? loaderShape : cachedShape) || 'circle';

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        {displayLogo ? (
          <img
            src={displayLogo}
            alt="Logo"
            onError={() => setImgFailed(true)}
            className={`w-20 h-20 md:w-28 md:h-28 ${displayShape === 'circle' ? 'rounded-full' : displayShape === 'rounded' ? 'rounded-xl' : 'rounded-none'} object-cover animate-pulse`}
          />
        ) : (
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <BookOpen className="w-10 h-10 md:w-14 md:h-14 text-primary" />
          </div>
        )}
        <p className="text-sm text-muted-foreground font-bengali tracking-wide animate-pulse">
          {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
        </p>
      </div>
    </div>
  );
};

export default PageLoader;
