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
      <div className="relative flex-1 min-h-[260px] sm:min-h-[320px] bg-primary/5 overflow-hidden">
        {settings.hero_bg_image_url ? (
          <img
            src={settings.hero_bg_image_url}
            alt={bn ? 'মাদরাসার ছবি' : 'Madrasah Image'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
            <div className="text-center p-6 sm:p-8">
              <div className="w-24 h-24 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-5 shadow-sm">
                <span className="text-5xl">🕌</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold text-foreground tracking-wide leading-tight">
                {bn ? settings.hero_title_bn : settings.hero_title_en}
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mt-3.5 max-w-xl mx-auto leading-relaxed font-medium">
                {bn ? settings.hero_subtitle_bn : settings.hero_subtitle_en}
              </p>
            </div>
          </div>
        )}
        {settings.hero_bg_image_url && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
        )}
        {settings.hero_bg_image_url && (
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold drop-shadow-lg leading-tight">
              {bn ? settings.hero_title_bn : settings.hero_title_en}
            </h2>
            <p className="text-base sm:text-lg text-white/90 mt-2.5 line-clamp-2 max-w-2xl leading-relaxed">
              {bn ? settings.hero_subtitle_bn : settings.hero_subtitle_en}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeHeroBanner;
