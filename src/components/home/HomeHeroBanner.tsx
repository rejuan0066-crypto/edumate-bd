import { motion } from 'framer-motion';
import { Sparkles, MapPin } from 'lucide-react';

interface Props {
  settings: any;
  language: string;
  t: (key: string) => string;
}

const HomeHeroBanner = ({ settings, language, t }: Props) => {
  const bn = language === 'bn';

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden h-full flex flex-col">
      <div className="relative flex-1 min-h-[300px] sm:min-h-[380px] bg-slate-900 overflow-hidden flex flex-col justify-end">
        {settings.hero_bg_image_url ? (
          <img
            src={settings.hero_bg_image_url}
            alt={bn ? 'মাদরাসার ছবি' : 'Madrasah Campus'}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 flex items-center justify-center">
            {/* Geometric Islamic art watermark effect */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="text-center p-6 text-white/90">
              <span className="text-6xl drop-shadow">🕌</span>
            </div>
          </div>
        )}

        {/* Gradient Overlay for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/95 via-emerald-950/60 to-transparent" />

        {/* Top Campus Badge */}
        <div className="absolute top-4 left-4 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-black/40 backdrop-blur-md border border-white/20 text-white text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {bn ? 'ঐতিহ্যবাহী দ্বীনি বিদ্যাপীঠ' : 'Traditional Islamic Institution'}
          </span>
        </div>

        {/* Caption Content */}
        <div className="relative z-10 p-5 sm:p-7 text-white">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display leading-tight drop-shadow-md">
            {bn
              ? (settings.hero_title_bn || 'আল আরাবিয়া ছোবহানিয়া মাদরাসা')
              : (settings.hero_title_en || 'Al-Arabia Subhania Madrasah')}
          </h2>
          <p className="text-sm sm:text-base text-slate-200 mt-2 line-clamp-3 max-w-2xl leading-relaxed">
            {bn
              ? (settings.hero_subtitle_bn || 'সহীহ কুরআন শিক্ষা, উন্নত চারিত্রিক গঠন ও দ্বীনি আলেম গড়ার এক নির্ভরযোগ্য প্রতিষ্ঠান।')
              : (settings.hero_subtitle_en || 'A reliable center for Quranic education and Islamic scholarship.')}
          </p>
        </div>

        {/* Bottom Spotlight Strip */}
        <div className="relative z-10 bg-black/40 backdrop-blur-md border-t border-white/10 px-5 py-2.5 text-xs text-amber-300 flex items-center justify-between">
          <span className="italic font-medium">
            {bn
              ? '“তোমাদের মধ্যে সর্বোত্তম সে, যে কুরআন শেখে এবং অন্যকে শেখায়।” — সহীহ বুখারী ৫০২৭'
              : '“The best among you are those who learn the Quran and teach it.” — Bukhari'}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-slate-300">
            <MapPin className="w-3 h-3 text-emerald-400" /> বিশ্বনাথ, সিলেট
          </span>
        </div>
      </div>
    </div>
  );
};

export default HomeHeroBanner;
