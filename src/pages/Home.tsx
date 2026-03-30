import { useLanguage } from '@/contexts/LanguageContext';
import PublicLayout from '@/components/PublicLayout';
import { motion } from 'framer-motion';
import { Users, BookOpen, Award } from 'lucide-react';
import { useWebsiteSettings, HomeSectionKey } from '@/hooks/useWebsiteSettings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import HomePrincipalCard from '@/components/home/HomePrincipalCard';
import HomeHeroBanner from '@/components/home/HomeHeroBanner';
import HomeAdminCard from '@/components/home/HomeAdminCard';
import HomeInfoLinks from '@/components/home/HomeInfoLinks';
import HomeNoticesSection from '@/components/home/HomeNoticesSection';
import HomeAdmissionButtons from '@/components/home/HomeAdmissionButtons';
import HomeGallery from '@/components/home/HomeGallery';
import HomePostsSection from '@/components/home/HomePostsSection';
import PrayerTimesWidget from '@/components/home/PrayerTimesWidget';
import IslamicCalendarWidget from '@/components/home/IslamicCalendarWidget';

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
        .select('id, title, title_bn, content, content_bn, category, published_at, attachments')
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

  // Get ordered visible sections
  const sectionOrder = settings.section_order || [];
  const visibleSections = sectionOrder.filter(s => s.visible);

  // Group row1: principalMessage, banner, adminMessage
  const row1Keys: HomeSectionKey[] = ['principalMessage', 'banner', 'adminMessage'];
  // Group row2: infoLinks, latestNotice, admissionButtons
  const row2Keys: HomeSectionKey[] = ['infoLinks', 'latestNotice', 'admissionButtons'];
  // Standalone sections
  const standaloneKeys: HomeSectionKey[] = ['latestPosts', 'gallery', 'prayerCalendar', 'stats', 'donation', 'feePayment', 'classInfo', 'teachersList', 'studentInfo'];

  const isVisible = (key: HomeSectionKey) => {
    const found = visibleSections.find(s => s.key === key);
    return !!found;
  };

  // Find first standalone sections in order
  const orderedStandalone = visibleSections.filter(s => standaloneKeys.includes(s.key));

  const renderSection = (key: HomeSectionKey) => {
    switch (key) {
      case 'latestPosts':
        return (
          <section key={key} className="pb-6 sm:pb-8">
            <div className="container mx-auto px-4">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
                <HomePostsSection posts={posts} language={language} />
              </motion.div>
            </div>
          </section>
        );
      case 'gallery':
        return <HomeGallery key={key} galleryItems={settings.gallery_items} language={language} />;
      case 'prayerCalendar':
        return (
          <section key={key} className="py-8 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <PrayerTimesWidget />
                <IslamicCalendarWidget />
              </div>
            </div>
          </section>
        );
      case 'stats':
        return (
          <section key={key} className="py-12 stats-section islamic-pattern">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                {stats.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.12, duration: 0.4 }} viewport={{ once: true }} className="text-center p-6">
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
        );
      default:
        return null;
    }
  };

  const hasRow1 = row1Keys.some(isVisible);
  const hasRow2 = row2Keys.some(isVisible);

  return (
    <PublicLayout>
      {/* ===== Row 1: Principal | Banner | Admin ===== */}
      {hasRow1 && (
        <section className="py-6 sm:py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
              {isVisible('principalMessage') && (
                <div className="lg:col-span-3">
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="h-full">
                    <HomePrincipalCard settings={settings} language={language} t={t} />
                  </motion.div>
                </div>
              )}
              {isVisible('banner') && (
                <div className={`${isVisible('principalMessage') ? 'lg:col-span-6' : 'lg:col-span-8'}`}>
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="h-full">
                    <HomeHeroBanner settings={settings} language={language} t={t} />
                  </motion.div>
                </div>
              )}
              {isVisible('adminMessage') && (
                <div className="lg:col-span-3">
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="h-full">
                    <HomeAdminCard settings={settings} language={language} t={t} />
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===== Row 2: Info Links | Notice Board | Admission ===== */}
      {hasRow2 && (
        <section className="pb-6 sm:pb-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
              {isVisible('infoLinks') && (
                <div className="lg:col-span-3">
                  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="h-full">
                    <HomeInfoLinks language={language} />
                  </motion.div>
                </div>
              )}
              {isVisible('latestNotice') && (
                <div className="lg:col-span-6">
                  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }} className="h-full">
                    <HomeNoticesSection notices={notices} language={language} t={t} />
                  </motion.div>
                </div>
              )}
              {isVisible('admissionButtons') && settings.divisions.length > 0 && (
                <div className="lg:col-span-3">
                  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.2 }} className="h-full">
                    <HomeAdmissionButtons divisions={settings.divisions} language={language} t={t} />
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===== Dynamic Standalone Sections ===== */}
      {orderedStandalone.map(s => renderSection(s.key))}
    </PublicLayout>
  );
};

export default Home;
