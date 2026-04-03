import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';

const CACHE_KEY = 'cached_loader_logo';
const CACHE_SHAPE_KEY = 'cached_loader_logo_shape';

const PageLoader = () => {
  const { settings, isLoading } = useWebsiteSettings();
  
  // Use cached logo immediately to avoid flash of default
  const [cachedLogo] = useState(() => localStorage.getItem(CACHE_KEY) || '');
  const [cachedShape] = useState(() => localStorage.getItem(CACHE_SHAPE_KEY) || 'square');

  const loaderLogo = settings.loader_logo_url || settings.favicon_url || settings.logo_url;
  const loaderShape = settings.loader_logo_shape || 'square';

  // Update cache when settings load
  useEffect(() => {
    if (!isLoading && loaderLogo) {
      localStorage.setItem(CACHE_KEY, loaderLogo);
      localStorage.setItem(CACHE_SHAPE_KEY, loaderShape);
    }
  }, [isLoading, loaderLogo, loaderShape]);

  const displayLogo = loaderLogo || cachedLogo;
  const displayShape = loaderLogo ? loaderShape : cachedShape;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        {displayLogo ? (
          <img
            src={displayLogo}
            alt="Logo"
            className={`w-20 h-20 md:w-28 md:h-28 ${displayShape === 'circle' ? 'rounded-full' : displayShape === 'rounded' ? 'rounded-xl' : 'rounded-none'} object-cover animate-pulse`}
          />
        ) : (
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <BookOpen className="w-10 h-10 md:w-14 md:h-14 text-primary" />
          </div>
        )}
        <p className="text-sm text-muted-foreground font-bengali tracking-wide animate-pulse">
          লোড হচ্ছে...
        </p>
      </div>
    </div>
  );
};

export default PageLoader;
