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
  // Fall back to the full website-settings cache so whatever was uploaded
  // in settings shows even before the network request returns.
  const [cachedLogo] = useState(() => {
    const direct = localStorage.getItem(CACHE_KEY);
    if (direct) return direct;
    try {
      const raw = localStorage.getItem('website-settings-cache');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return parsed.loader_logo_url || parsed.logo_url || parsed.favicon_url || '';
    } catch {
      return '';
    }
  });
  const [cachedShape] = useState(() => {
    const direct = localStorage.getItem(CACHE_SHAPE_KEY);
    if (direct) return direct;
    try {
      const raw = localStorage.getItem('website-settings-cache');
      if (!raw) return 'circle';
      return JSON.parse(raw).loader_logo_shape || JSON.parse(raw).logo_shape || 'circle';
    } catch {
      return 'circle';
    }
  });
  const [imgFailed, setImgFailed] = useState(false);

  // Dynamic priority:
  // 1. Dedicated uploaded loader logo
  // 2. Uploaded main institution logo
  // 3. Uploaded favicon
  const uploadedLogo = settings.loader_logo_url || settings.logo_url || settings.favicon_url;
  const uploadedShape = settings.loader_logo_shape || settings.logo_shape || 'circle';

  // Synchronize lightweight cache whenever settings arrive
  useEffect(() => {
    if (!isLoading && uploadedLogo) {
      localStorage.setItem(CACHE_KEY, uploadedLogo);
      localStorage.setItem(CACHE_SHAPE_KEY, uploadedShape);
    }
  }, [isLoading, uploadedLogo, uploadedShape]);

  const DEFAULT_LOADER_LOGO = '/loader-logo.png';
  const rawLogo = uploadedLogo || cachedLogo || DEFAULT_LOADER_LOGO;
  const displayLogo = (imgFailed || rawLogo.includes('wwhunyzobtuibhvkipwk')) ? DEFAULT_LOADER_LOGO : rawLogo;
  const displayShape = (uploadedLogo ? uploadedShape : cachedShape) || 'circle';

  const institutionName = language === 'bn'
    ? (settings.institution_name || 'আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানা')
    : (settings.institution_name_en || settings.institution_name || 'Al-Arabia Subhania Madrasah & Eyateem Khana');

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background select-none">
      <div className="flex flex-col items-center gap-3 animate-fade-in text-center px-4 max-w-sm">
        <div className={`relative flex items-center justify-center ${displayShape === 'circle' ? 'rounded-full' : displayShape === 'rounded' ? 'rounded-2xl' : 'rounded-none'} overflow-hidden shadow-sm`}>
          <img
            src={displayLogo}
            alt="Institution Logo"
            onError={() => {
              if (displayLogo !== DEFAULT_LOADER_LOGO) {
                setImgFailed(true);
              }
            }}
            className={`w-20 h-20 md:w-24 md:h-24 ${displayShape === 'circle' ? 'rounded-full' : displayShape === 'rounded' ? 'rounded-2xl' : 'rounded-none'} object-cover animate-pulse`}
          />
        </div>

        <div className="flex flex-col items-center gap-1">
          {institutionName && (
            <h3 className="text-sm md:text-base font-semibold text-foreground font-bengali tracking-tight line-clamp-1">
              {institutionName}
            </h3>
          )}
          <p className="text-xs text-muted-foreground font-bengali tracking-wide animate-pulse">
            {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
