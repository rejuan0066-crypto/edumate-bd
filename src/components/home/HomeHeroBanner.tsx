import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';

interface Props {
  settings: any;
  language: string;
  t: (key: string) => string;
}

const HomeHeroBanner = ({ settings, language, t }: Props) => {
  const bn = language === 'bn';

  return (
    <div className="card-elevated overflow-hidden h-full flex flex-col">
      <div className="relative flex-1 min-h-[220px] sm:min-h-[280px] bg-primary/5 overflow-hidden">
        {settings.hero_bg_image_url ? (
          <img
            src={settings.hero_bg_image_url}
            alt={bn ? 'মাদরাসার ছবি' : 'Madrasah Image'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
            <div className="text-center p-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🕌</span>
              </div>
              <h3 className="text-lg font-display font-bold text-foreground">
                {bn ? settings.hero_title_bn : settings.hero_title_en}
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                {bn ? settings.hero_subtitle_bn : settings.hero_subtitle_en}
              </p>
            </div>
          </div>
        )}
        {settings.hero_bg_image_url && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        )}
        {settings.hero_bg_image_url && (
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h3 className="text-lg font-display font-bold drop-shadow-lg">
              {bn ? settings.hero_title_bn : settings.hero_title_en}
            </h3>
            <p className="text-xs text-white/80 mt-1 line-clamp-2">
              {bn ? settings.hero_subtitle_bn : settings.hero_subtitle_en}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeHeroBanner;
