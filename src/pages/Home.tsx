import { useLanguage } from '@/contexts/LanguageContext';
import PublicLayout from '@/components/PublicLayout';
import { motion } from 'framer-motion';
import { BookOpen, Users, Award, ArrowRight, Bell, FileText, Calendar, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import HomePostsSection from '@/components/home/HomePostsSection';
import HomeNoticesSection from '@/components/home/HomeNoticesSection';
import HomePrincipalCard from '@/components/home/HomePrincipalCard';

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
          className="relative overflow-hidden"
          style={{
            background: settings.hero_bg_image_url
              ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6)), url(${settings.hero_bg_image_url}) center/cover no-repeat`
              : 'var(--gradient-hero)',
          }}
        >
          {!settings.hero_bg_image_url && <div className="islamic-pattern absolute inset-0" />}
          <div className="container mx-auto px-4 py-12 sm:py-16 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-3xl mx-auto"
            >
              <h1 className="text-2xl sm:text-4xl font-display font-bold text-primary-foreground mb-3 leading-tight">
                {bn ? settings.hero_title_bn : settings.hero_title_en}
              </h1>
              <p className="text-primary-foreground/80 text-base sm:text-lg mb-6">
                {bn ? settings.hero_subtitle_bn : settings.hero_subtitle_en}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link to="/admission" className="btn-gold-gradient inline-flex items-center gap-2 !py-2.5 !px-5 !text-sm">
                  {t('applyNow')} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/about" className="px-5 py-2.5 rounded-lg border border-primary-foreground/30 text-primary-foreground text-sm font-medium hover:bg-primary-foreground/10 transition-colors">
                  {t('readMore')}
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Main Newspaper Layout: Principal | Posts | Notices */}
      <section className="py-6 sm:py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Sidebar - Principal + Quick Links */}
            {settings.sections.principalMessage && (
              <div className="lg:col-span-3">
                <HomePrincipalCard settings={settings} language={language} t={t} />
              </div>
            )}

            {/* Center - Main Posts */}
            <div className={`${settings.sections.principalMessage ? 'lg:col-span-5' : 'lg:col-span-8'}`}>
              <HomePostsSection posts={posts} language={language} />
            </div>

            {/* Right Sidebar - Notices */}
            <div className="lg:col-span-4">
              <HomeNoticesSection notices={notices} language={language} t={t} />
            </div>
          </div>
        </div>
      </section>

      {/* Posts Grid - Below fold */}
      {posts.length > 2 && (
        <section className="py-6 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg sm:text-xl font-display font-bold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {bn ? 'আরও সংবাদ' : 'More News'}
              </h2>
              <Link to="/posts" className="text-xs text-primary hover:underline flex items-center gap-1">
                {bn ? 'সব দেখুন' : 'View All'} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {posts.slice(2, 8).map((post: any) => {
                const attachments = (post.attachments as any[]) || [];
                const firstImage = attachments.find((a: any) => a.type?.startsWith('image/'));
                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    <Link to="/posts" className="card-elevated overflow-hidden group block">
                      {/* Image */}
                      <div className="aspect-video bg-secondary overflow-hidden">
                        {firstImage ? (
                          <img src={firstImage.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="w-10 h-10 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      {/* Text */}
                      <div className="p-4">
                        <Badge variant="outline" className="text-[9px] capitalize mb-2">{post.category}</Badge>
                        <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-1.5">
                          {bn ? (post.title_bn || post.title) : post.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {bn ? (post.content_bn || post.content) : post.content}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                          <Calendar className="w-3 h-3" />
                          {post.published_at ? format(new Date(post.published_at), 'dd/MM/yyyy') : ''}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      {settings.sections.stats && (
        <section className="py-10 bg-primary text-primary-foreground islamic-pattern">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {stats.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center p-5"
                >
                  <s.icon className="w-9 h-9 text-accent mx-auto mb-2" />
                  <div className="text-3xl font-bold font-display">{s.value}</div>
                  <div className="text-sm opacity-80 mt-1">{bn ? s.labelBn : s.labelEn}</div>
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
