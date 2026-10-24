import { useLanguage } from '@/contexts/LanguageContext';
import { Seo } from '@/components/Seo';
import PublicLayout from '@/components/PublicLayout';
import { motion } from 'framer-motion';
import { Users, BookOpen, Award, UserPlus, BookOpenText, Calculator, ArrowRight } from 'lucide-react';
import { useWebsiteSettings, HomeSectionKey, SectionStyleConfig, DEFAULT_SECTION_STYLE } from '@/hooks/useWebsiteSettings';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
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
import PageLoader from '@/components/PageLoader';
import FloatingSocialIcons from '@/components/home/FloatingSocialIcons';

const Home = () => {
  const { t, language } = useLanguage();
  const bn = language === 'bn';
  const { settings, isLoading: isSettingsLoading } = useWebsiteSettings();
  const isMobile = useIsMobile();

  // Helper to get dynamic inline styles for a section
  const getSectionStyle = (key: HomeSectionKey): React.CSSProperties => {
    const section = (settings.section_order || []).find(s => s.key === key);
    const st = section?.styles || DEFAULT_SECTION_STYLE;
    const style: React.CSSProperties = {};
    if (st.bgColor) style.backgroundColor = st.bgColor;
    if (st.textColor) style.color = st.textColor;
    if (st.padding) style.padding = `${st.padding}px`;
    if (st.margin) style.marginTop = `${st.margin}px`;
    if (st.borderRadius) style.borderRadius = `${st.borderRadius}px`;
    if (st.fixedHeight) {
      style.height = `${st.height}px`;
      style.overflow = st.overflow;
    }
    if (st.textAlign && st.textAlign !== 'left') style.textAlign = st.textAlign;
    return style;
  };

  const getSectionGridStyle = (key: HomeSectionKey): React.CSSProperties => {
    const section = (settings.section_order || []).find(s => s.key === key);
    const st = section?.styles || DEFAULT_SECTION_STYLE;
    const cols = isMobile ? st.columnsMobile : st.columns;
    return {
      display: cols > 1 ? 'grid' : undefined,
      gridTemplateColumns: cols > 1 ? `repeat(${cols}, 1fr)` : undefined,
      gap: `${st.gap}px`,
    };
  };

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
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * (attempt + 1), 3000),
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
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * (attempt + 1), 3000),
  });

  const { data: staffFormPublic } = useQuery({
    queryKey: ['staff-form-public-home'],
    queryFn: async () => {
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'staff_form_public').maybeSingle();
      return data?.value === true || data?.value === 'true';
    },
    staleTime: 10 * 60 * 1000,
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
  const standaloneKeys: HomeSectionKey[] = ['latestPosts', 'gallery', 'prayerCalendar', 'stats', 'donation', 'feePayment', 'classInfo', 'teachersList', 'studentInfo', 'quran', 'zakatFitra'];

  const isVisible = (key: HomeSectionKey) => {
    const found = visibleSections.find(s => s.key === key);
    return !!found;
  };

  // Find standalone sections in order; render the stats section right after the zakat section
  const orderedStandalone = (() => {
    const list = visibleSections.filter(s => standaloneKeys.includes(s.key));
    const stats = list.find(s => s.key === 'stats');
    if (!stats) return list;
    const rest = list.filter(s => s.key !== 'stats');
    const zakatIdx = rest.findIndex(s => s.key === 'zakatFitra');
    if (zakatIdx === -1) return [...rest, stats];
    rest.splice(zakatIdx + 1, 0, stats);
    return rest;
  })();

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
      case 'quran':
        return (
          <section key={key} className="py-10">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-8 sm:p-10 text-white shadow-xl"
                style={{ background: 'linear-gradient(135deg, hsl(160 84% 25%), hsl(160 84% 18%))' }}
              >
                <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -left-10 -bottom-10 w-56 h-56 rounded-full bg-white/5 blur-3xl" />
                <div className="relative grid md:grid-cols-[auto_1fr_auto] items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0">
                    <BookOpenText className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold font-display mb-2">
                      {bn ? 'পবিত্র কুরআন তিলাওয়াত' : 'Holy Quran Reading'}
                    </h2>
                    <p className="text-white/85 text-sm sm:text-base max-w-xl">
                      {bn
                        ? 'উসমানি ও ইন্দো-পাক স্ক্রিপ্ট, বাংলা-ইংরেজি অনুবাদ, একাধিক ক্বারীর তিলাওয়াত, বুকমার্ক ও সর্বশেষ পঠিত আয়াত স্বয়ংক্রিয় সংরক্ষণ।'
                        : 'Uthmani & Indo-Pak scripts, Bangla-English translation, multiple Qaris, bookmarks and last-read auto-save.'}
                    </p>
                  </div>
                  <Link
                    to="/quran"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-emerald-800 font-semibold hover:bg-white/90 transition shadow-lg shrink-0"
                  >
                    {bn ? 'এখনই পড়ুন' : 'Read Now'}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>
        );
      case 'zakatFitra':
        return (
          <section key={key} className="py-10">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-8 sm:p-10 text-white shadow-xl"
                style={{ background: 'linear-gradient(135deg, hsl(38 92% 45%), hsl(24 92% 38%))' }}
              >
                <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -left-10 -bottom-10 w-56 h-56 rounded-full bg-white/5 blur-3xl" />
                <div className="relative grid md:grid-cols-[auto_1fr_auto] items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0">
                    <Calculator className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold font-display mb-2">
                      {bn ? 'যাকাত ও ফিতরা ক্যালকুলেটর' : 'Zakat & Fitra Calculator'}
                    </h2>
                    <p className="text-white/90 text-sm sm:text-base max-w-xl">
                      {bn
                        ? 'নিসাব অনুযায়ী যাকাতের পরিমাণ ও ফিতরা হিসাব করুন—বর্তমান বছরের সরকারি/স্থানীয় হার অনুযায়ী।'
                        : 'Calculate Zakat amount based on Nisab and Fitra rates—per current official/local rates.'}
                    </p>
                  </div>
                  <Link
                    to="/zakat-fitra"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-amber-700 font-semibold hover:bg-white/90 transition shadow-lg shrink-0"
                  >
                    {bn ? 'হিসাব করুন' : 'Calculate'}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  const hasRow1 = row1Keys.some(isVisible);
  const hasRow2 = row2Keys.some(isVisible);

  // Show a clean loader on first load (no cached settings yet) to avoid
  // a flash of half-rendered / empty content before settings arrive.
  if (isSettingsLoading && !settings?.institution_name) {
    return <PageLoader />;
  }

  return (
    <PublicLayout>
      <Seo
        title="Al-Arabia Subhania Hafizia Madrasah — Home"
        description="Official website of Al-Arabia Subhania Hafizia Madrasah: admissions, notices, results, gallery, and Islamic education services."
        path="/"
      />
      <h1 className="sr-only">
        Al-Arabia Subhania Hafizia Madrasah — Quality Islamic & Hifz education, admissions, notices, and results
      </h1>
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
                    <HomeInfoLinks language={language} infoLinks={settings.info_links} />
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
              {isVisible('admissionButtons') && (
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

      {/* ===== Staff Application Banner ===== */}
      {staffFormPublic && (
        <section className="py-4">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
              <Link
                to="/staff-application"
                className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-accent text-accent-foreground rounded-xl text-lg font-bold font-display hover:opacity-90 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <UserPlus className="w-5 h-5" />
                {bn ? 'স্টাফ/শিক্ষক অনলাইন আবেদন করুন' : 'Apply Online for Staff/Teacher Position'}
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== Dynamic Standalone Sections ===== */}
      {orderedStandalone.map(s => renderSection(s.key))}

      {/* ===== Floating Social Media Icons ===== */}
      <FloatingSocialIcons />
    </PublicLayout>
  );
};

export default Home;
