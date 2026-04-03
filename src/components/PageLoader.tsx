import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { BookOpen } from 'lucide-react';

const PageLoader = () => {
  const { settings } = useWebsiteSettings();
  const loaderLogo = settings.favicon_url || settings.logo_url;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        {loaderLogo ? (
          <img
            src={loaderLogo}
            alt="Logo"
            className="w-20 h-20 md:w-28 md:h-28 rounded-full object-cover animate-pulse"
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
