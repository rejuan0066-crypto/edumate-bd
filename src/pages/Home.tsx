import { useLanguage } from '@/contexts/LanguageContext';
import PublicLayout from '@/components/PublicLayout';
import { motion } from 'framer-motion';
import { BookOpen, Users, Award, ArrowRight, FileText, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import HomePostsSection from '@/components/home/HomePostsSection';
import HomeNoticesSection from '@/components/home/HomeNoticesSection';
import HomePrincipalCard from '@/components/home/HomePrincipalCard';
import HomeMoreNews from '@/components/home/HomeMoreNews';

const Home = () => {
  const { t, language } = useLanguage();
  const bn = language === 'bn';
  const { settings } = useWebsiteSettings();

  const { data: notices = [] } = useQuery({
    queryKey: ['home-notices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notices')
        .select('id, title, title_bn, published_at, category')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['home-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  const stats = [
    { value: settings.stat_students, labelBn: 'মোট ছাত্র', labelEn: 'Total Students', icon: Users },
    { value: settings.stat_teachers, labelBn: 'শিক্ষক', labelEn: 'Teachers', icon: BookOpen },
    { value: settings.stat_years, labelBn: 'বছরের অভিজ্ঞতা', labelEn: 'Years Experience', icon: Award },
  ];

  return (
    <PublicLayout>
      {/* Hero Banner */}
      {settings.sections.banner && (
        <section
          className="relative overflow-hidden hero-section"
          style={{
            background: settings.hero_bg_image_url
              ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url(${settings.hero_bg_image_url}) center/cover no-repeat`
              : undefined,
          }}
        >
          <div className="hero-pattern absolute inset-0" />
          <div className="container mx-auto px-4 py-16 sm:py-24 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-center max-w-3xl mx-auto"
            >
              {/* Decorative element */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-0.5 bg-accent rounded-full" />
              </div>
              <h1 className="text-3xl sm:text-5xl font-display font-bold text-white mb-4 leading-tight drop-shadow-lg">
                {bn ? settings.hero_title_bn : settings.hero_title_en}
              </h1>
              <p className="text-white/85 text-sm sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
                {bn ? settings.hero_subtitle_bn : settings.hero_subtitle_en}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link to="/admission" className="btn-gold-gradient inline-flex items-center gap-2 !py-3 !px-7 !text-sm rounded-full shadow-xl">
                  {t('applyNow')} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/about" className="px-7 py-3 rounded-full border-2 border-white/40 text-white text-sm font-semibold hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
                  {t('readMore')}
                </Link>
              </div>
            </motion.div>
          </div>
          {/* Bottom wave */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 60L1440 60L1440 20C1440 20 1200 0 720 0C240 0 0 20 0 20L0 60Z" fill="hsl(var(--background))" />
            </svg>
          </div>
        </section>
      )}

      {/* Main 3-Column Layout */}
      <section className="py-8 sm:py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left - Principal Card */}
            {settings.sections.principalMessage && (
              <aside className="lg:col-span-3 lg:overflow-hidden">
                <HomePrincipalCard settings={settings} language={language} t={t} />
              </aside>
            )}

            {/* Center - Posts */}
            <div className={`${settings.sections.principalMessage ? 'lg:col-span-5' : 'lg:col-span-8'} lg:overflow-hidden`}>
              <HomePostsSection posts={posts} language={language} />
            </div>

            {/* Right - Notices */}
            <aside className="lg:col-span-4 lg:overflow-hidden">
              <HomeNoticesSection notices={notices} language={language} t={t} />
            </aside>
          </div>
        </div>
      </section>

      {/* More News Grid */}
      {posts.length > 2 && (
        <HomeMoreNews posts={posts} language={language} />
      )}

      {/* Stats */}
      {settings.sections.stats && (
        <section className="py-12 stats-section islamic-pattern">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {stats.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.12, duration: 0.4 }}
                  viewport={{ once: true }}
                  className="text-center p-6"
                >
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                    <s.icon className="w-7 h-7 text-accent" />
                  </div>
                  <div className="text-4xl font-bold font-display text-white">{s.value}</div>
                  <div className="text-sm text-white/75 mt-1">{bn ? s.labelBn : s.labelEn}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {settings.sections.gallery && settings.gallery_items?.filter(g => g.image_url).length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground">
                {bn ? 'গ্যালারি' : 'Gallery'}
              </h2>
              <Link to="/gallery" className="text-xs text-primary hover:underline flex items-center gap-1">
                {t('viewAll')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {settings.gallery_items.filter(g => g.image_url).slice(0, 8).map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  viewport={{ once: true }}
                  className="aspect-square rounded-lg overflow-hidden group"
                >
                  <img src={item.image_url} alt={bn ? item.title_bn : item.title_en} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Admission */}
      {settings.sections.admissionButtons && settings.divisions.length > 0 && (
        <section className="py-12 bg-secondary/30">
          <div className="container mx-auto px-4">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-center text-foreground mb-8">
              {t('onlineAdmission')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {settings.divisions.map((div, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  viewport={{ once: true }}
                >
                  <Link to="/admission" className="card-elevated p-5 text-center block hover:border-primary transition-all duration-300 group">
                    <div className="text-3xl mb-2">{div.icon}</div>
                    <h3 className="font-display font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                      {bn ? div.name : div.nameEn}
                    </h3>
                    <p className="text-xs text-primary mt-2 flex items-center justify-center gap-1 font-medium">
                      {t('applyNow')} <ArrowRight className="w-3 h-3" />
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
    </PublicLayout>
  );
};

export default Home;
