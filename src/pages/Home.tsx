import { useLanguage } from '@/contexts/LanguageContext';
import { Seo } from '@/components/Seo';
import PublicLayout from '@/components/PublicLayout';
import { motion } from 'framer-motion';
import { UserPlus, BookOpenText, Calculator, ArrowRight } from 'lucide-react';
import { useWebsiteSettings, HomeSectionKey } from '@/hooks/useWebsiteSettings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import HomeHeroBanner from '@/components/home/HomeHeroBanner';
import HomeNoticesSection from '@/components/home/HomeNoticesSection';
import HomeLeadershipSection from '@/components/home/HomeLeadershipSection';
import HomeAcademicDepartments from '@/components/home/HomeAcademicDepartments';
import HomeCampusFacilities from '@/components/home/HomeCampusFacilities';
import HomePortalsAndStats from '@/components/home/HomePortalsAndStats';
import HomeLillahOrphanage from '@/components/home/HomeLillahOrphanage';
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
      const { data } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'staff_form_public')
        .maybeSingle();
      return data?.value === true || data?.value === 'true';
    },
    staleTime: 10 * 60 * 1000,
  });

  // Get ordered visible standalone sections
  const sectionOrder = settings.section_order || [];
  const visibleSections = sectionOrder.filter((s) => s.visible);
  const standaloneKeys: HomeSectionKey[] = [
    'prayerCalendar',
    'quran',
    'zakatFitra',
    'gallery',
    'latestPosts',
  ];

  const orderedStandalone = visibleSections.filter((s) => standaloneKeys.includes(s.key));

  const renderSection = (key: HomeSectionKey) => {
    switch (key) {
      case 'latestPosts':
        return (
          <section key={key} className="py-6 sm:py-8">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
              >
                <HomePostsSection posts={posts} language={language} />
              </motion.div>
            </div>
          </section>
        );
      case 'gallery':
        return <HomeGallery key={key} galleryItems={settings.gallery_items} language={language} />;
      case 'prayerCalendar':
        return (
          <section key={key} className="py-6 sm:py-8 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <PrayerTimesWidget />
                <IslamicCalendarWidget />
              </div>
            </div>
          </section>
        );
      case 'quran':
        return (
          <section key={key} className="py-6 sm:py-8">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-white shadow-xl"
                style={{ background: 'linear-gradient(135deg, hsl(160 84% 25%), hsl(160 84% 18%))' }}
              >
                <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                <div className="absolute -left-10 -bottom-10 w-56 h-56 rounded-full bg-white/5 blur-3xl pointer-events-none" />
                <div className="relative grid md:grid-cols-[auto_1fr_auto] items-center gap-6">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0">
                    <BookOpenText className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-3xl font-bold font-display mb-1 sm:mb-2">
                      {bn ? 'পবিত্র কুরআন তিলাওয়াত' : 'Holy Quran Reading'}
                    </h2>
                    <p className="text-white/85 text-xs sm:text-base max-w-xl">
                      {bn
                        ? 'উসমানি ও ইন্দো-পাক স্ক্রিপ্ট, বাংলা-ইংরেজি অনুবাদ, একাধিক ক্বারীর তিলাওয়াত, বুকমার্ক ও সর্বশেষ পঠিত আয়াত স্বয়ংক্রিয় সংরক্ষণ।'
                        : 'Uthmani & Indo-Pak scripts, Bangla-English translation, multiple Qaris, bookmarks and last-read auto-save.'}
                    </p>
                  </div>
                  <Link
                    to="/quran"
                    className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-white text-emerald-800 font-semibold text-sm sm:text-base hover:bg-white/90 transition shadow-lg shrink-0 self-start md:self-auto"
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
          <section key={key} className="py-6 sm:py-8">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-white shadow-xl"
                style={{ background: 'linear-gradient(135deg, hsl(38 92% 45%), hsl(24 92% 38%))' }}
              >
                <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
                <div className="absolute -left-10 -bottom-10 w-56 h-56 rounded-full bg-white/5 blur-3xl pointer-events-none" />
                <div className="relative grid md:grid-cols-[auto_1fr_auto] items-center gap-6">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0">
                    <Calculator className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-3xl font-bold font-display mb-1 sm:mb-2">
                      {bn ? 'যাকাত ও ফিতরা ক্যালকুলেটর' : 'Zakat & Fitra Calculator'}
                    </h2>
                    <p className="text-white/90 text-xs sm:text-base max-w-xl">
                      {bn
                        ? 'নিসাব অনুযায়ী যাকাতের পরিমাণ ও ফিতরা হিসাব করুন—বর্তমান বছরের সরকারি/স্থানীয় হার অনুযায়ী।'
                        : 'Calculate Zakat amount based on Nisab and Fitra rates—per current official/local rates.'}
                    </p>
                  </div>
                  <Link
                    to="/zakat-fitra"
                    className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-white text-amber-700 font-semibold text-sm sm:text-base hover:bg-white/90 transition shadow-lg shrink-0 self-start md:self-auto"
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

  if (isSettingsLoading && !settings?.institution_name) {
    return <PageLoader />;
  }

  return (
    <PublicLayout>
      <Seo
        title={bn ? 'আল আরাবিয়া ছোবহানিয়া মাদরাসা — হোম' : 'Al-Arabia Subhania Hafizia Madrasah — Home'}
        description="Official website of Al-Arabia Subhania Hafizia Madrasah: admissions, notices, results, departments, and Islamic education services."
        path="/"
      />
      <h1 className="sr-only">
        {bn
          ? 'আল আরাবিয়া ছোবহানিয়া মাদরাসা — শিক্ষা বিভাগ, ভর্তি, নোটিশ ও ফলাফল'
          : 'Al-Arabia Subhania Hafizia Madrasah — Academic Departments, Admissions, Notices, and Results'}
      </h1>

      {/* ===== 1. Grand Hero & Notice Desk Row (67% Spotlight + 33% Official Circulars) ===== */}
      <section className="pt-4 pb-6 sm:pt-6 sm:pb-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left 8 Cols: Grand Campus Spotlight */}
            <div className="lg:col-span-8 flex flex-col">
              <HomeHeroBanner settings={settings} language={language} t={t} />
            </div>

            {/* Right 4 Cols: Official Circular & Notice Desk */}
            <div className="lg:col-span-4 flex flex-col">
              <HomeNoticesSection notices={notices} language={language} t={t} />
            </div>
          </div>
        </div>
      </section>

      {/* ===== 2. Executive Leadership Statements (Founder/President & Principal/Muhtamim) ===== */}
      <HomeLeadershipSection settings={settings} language={language} />

      {/* ===== 3. Academic Departments Directory (Clickable with Full Syllabus & Outcome Modal) ===== */}
      <HomeAcademicDepartments bn={bn} />

      {/* ===== 4. Campus Infrastructure & Facilities ===== */}
      <HomeCampusFacilities bn={bn} />

      {/* ===== 5. Online Self-Service Portals & Institutional Statistics ===== */}
      <HomePortalsAndStats settings={settings} bn={bn} />

      {/* ===== 6. Orphanage & Lillah Boarding Sponsorship Card ===== */}
      <HomeLillahOrphanage bn={bn} />

      {/* ===== 7. Staff/Teacher Online Application Banner ===== */}
      {staffFormPublic && (
        <section className="py-4">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <Link
                to="/staff-application"
                className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-primary text-primary-foreground rounded-xl text-base sm:text-lg font-bold font-display hover:opacity-95 transition shadow-md hover:shadow-lg"
              >
                <UserPlus className="w-5 h-5" />
                {bn ? 'স্টাফ/শিক্ষক পদে অনলাইনে আবেদন করুন' : 'Apply Online for Staff/Teacher Position'}
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== 8. Dynamic Standalone Sections (Quran, Zakat, Prayer Times, Gallery, Posts) ===== */}
      {orderedStandalone.map((s) => renderSection(s.key))}

      {/* ===== 9. Floating Social Media Quick Connect ===== */}
      <FloatingSocialIcons />
    </PublicLayout>
  );
};

export default Home;
