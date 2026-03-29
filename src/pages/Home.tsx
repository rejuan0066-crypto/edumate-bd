import { useLanguage } from '@/contexts/LanguageContext';
import PublicLayout from '@/components/PublicLayout';
import { motion } from 'framer-motion';
import { BookOpen, Users, Award, ArrowRight, Bell, FileText, Image as ImageIcon, ThumbsUp, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const Home = () => {
  const { t, language } = useLanguage();
  const { settings, isLoading } = useWebsiteSettings();

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
        .limit(10);
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
      {/* Hero */}
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
          <div className="container mx-auto px-4 py-16 sm:py-24 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-center max-w-3xl mx-auto"
            >
              <h1 className="text-3xl sm:text-5xl font-display font-bold text-primary-foreground mb-4 leading-tight">
                {language === 'bn' ? settings.hero_title_bn : settings.hero_title_en}
              </h1>
              <p className="text-primary-foreground/80 text-lg sm:text-xl mb-8 font-body">
                {language === 'bn' ? settings.hero_subtitle_bn : settings.hero_subtitle_en}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link to="/admission" className="btn-gold-gradient inline-flex items-center gap-2">
                  {t('applyNow')} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/about" className="px-6 py-3 rounded-lg border border-primary-foreground/30 text-primary-foreground font-medium hover:bg-primary-foreground/10 transition-colors">
                  {t('readMore')}
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Stats */}
      {settings.sections.stats && (
        <section className="py-12 bg-secondary/50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {stats.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  viewport={{ once: true }}
                  className="stat-card text-center"
                >
                  <s.icon className="w-10 h-10 text-primary mx-auto mb-3" />
                  <div className="text-3xl font-bold text-foreground font-display">{s.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {language === 'bn' ? s.labelBn : s.labelEn}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Principal Message */}
      {settings.sections.principalMessage && (
        <section className="py-10">
          <div className="container mx-auto px-4">
            <div className="card-elevated p-6 sm:p-8">
              <h2 className="text-2xl font-display font-bold text-foreground mb-4">{t('principalMessage')}</h2>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="w-32 h-32 rounded-xl bg-secondary shrink-0 flex items-center justify-center text-4xl overflow-hidden">
                  {settings.principal_photo_url ? (
                    <img src={settings.principal_photo_url} alt="Principal" className="w-full h-full object-cover" />
                  ) : '👤'}
                </div>
                <div>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {language === 'bn' ? settings.principal_message_bn : settings.principal_message_en}
                  </p>
                  <p className="mt-4 font-semibold text-foreground">{settings.principal_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' ? settings.principal_title_bn : settings.principal_title_en}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Newspaper-style Posts + Notices */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Posts Section - Left/Main */}
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {language === 'bn' ? 'সর্বশেষ পোস্ট' : 'Latest Posts'}
                </h2>
                <Link to="/posts" className="text-xs text-primary hover:underline flex items-center gap-1">
                  {language === 'bn' ? 'সব দেখুন' : 'View All'} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="card-elevated">
                <ScrollArea className="h-[500px]">
                  <div className="divide-y divide-border">
                    {posts.length > 0 ? posts.map((post: any, idx: number) => {
                      const attachments = (post.attachments as any[]) || [];
                      const firstImage = attachments.find((a: any) => a.type?.startsWith('image/'));

                      return (
                        <Link key={post.id} to="/posts" className="flex gap-4 p-4 hover:bg-secondary/50 transition-colors group">
                          {/* Thumbnail */}
                          {firstImage ? (
                            <div className="w-24 h-20 sm:w-32 sm:h-24 rounded-lg overflow-hidden shrink-0 bg-secondary">
                              <img src={firstImage.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            </div>
                          ) : (
                            <div className="w-24 h-20 sm:w-32 sm:h-24 rounded-lg shrink-0 bg-secondary/80 flex items-center justify-center">
                              <FileText className="w-8 h-8 text-muted-foreground/40" />
                            </div>
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <Badge variant="outline" className="text-[9px] mb-1.5 capitalize">{post.category}</Badge>
                            <h3 className="text-sm sm:text-base font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                              {language === 'bn' ? (post.title_bn || post.title) : post.title}
                            </h3>
                            {(language === 'bn' ? post.content_bn : post.content) && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {language === 'bn' ? post.content_bn : post.content}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                              {post.published_at ? format(new Date(post.published_at), 'dd/MM/yyyy') : ''}
                            </p>
                          </div>
                        </Link>
                      );
                    }) : (
                      <div className="text-center py-16 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">{language === 'bn' ? 'কোনো পোস্ট নেই' : 'No posts yet'}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Notices Section - Right Sidebar */}
            <div className="lg:col-span-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                  <Bell className="w-5 h-5 text-accent" />
                  {t('latestNotice')}
                </h2>
                <Link to="/notices" className="text-xs text-primary hover:underline flex items-center gap-1">
                  {t('viewAll')} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="card-elevated">
                <ScrollArea className="h-[500px]">
                  <div className="divide-y divide-border">
                    {notices.length > 0 ? notices.map((n) => (
                      <Link
                        key={n.id}
                        to="/notices"
                        className="block p-4 hover:bg-secondary/50 transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Bell className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                              {language === 'bn' ? (n.title_bn || n.title) : n.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1.5">
                              {n.published_at ? format(new Date(n.published_at), 'dd/MM/yyyy') : ''}
                            </p>
                          </div>
                        </div>
                      </Link>
                    )) : (
                      <div className="text-center py-16 text-muted-foreground">
                        <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">{language === 'bn' ? 'কোনো নোটিশ নেই' : 'No notices'}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section on Home */}
      {settings.sections.gallery && settings.gallery_items?.filter(g => g.image_url).length > 0 && (
        <section className="py-16 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                {language === 'bn' ? 'গ্যালারি' : 'Gallery'}
              </h2>
              <Link to="/gallery" className="text-sm text-primary hover:underline flex items-center gap-1">
                {t('viewAll')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {settings.gallery_items.filter(g => g.image_url).slice(0, 8).map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  viewport={{ once: true }}
                  className="aspect-square rounded-xl overflow-hidden group"
                >
                  <img src={item.image_url} alt={language === 'bn' ? item.title_bn : item.title_en} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Admission Divisions */}
      {settings.sections.admissionButtons && settings.divisions.length > 0 && (
        <section className="py-16 bg-secondary/30">
          <div className="container mx-auto px-4">
            <motion.h2
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-2xl sm:text-3xl font-display font-bold text-center text-foreground mb-10"
            >
              {t('onlineAdmission')}
            </motion.h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {settings.divisions.map((div, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Link
                    to="/admission"
                    className="card-elevated p-6 text-center block hover:border-primary transition-all duration-300 group"
                  >
                    <div className="text-4xl mb-3">{div.icon}</div>
                    <h3 className="font-display font-bold text-foreground group-hover:text-primary transition-colors">
                      {language === 'bn' ? div.name : div.nameEn}
                    </h3>
                    <p className="text-sm text-primary mt-3 flex items-center justify-center gap-1 font-medium">
                      {t('applyNow')} <ArrowRight className="w-4 h-4" />
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
