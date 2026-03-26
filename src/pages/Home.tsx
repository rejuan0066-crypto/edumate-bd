import { useLanguage } from '@/contexts/LanguageContext';
import PublicLayout from '@/components/PublicLayout';
import { motion } from 'framer-motion';
import { BookOpen, Users, Award, ArrowRight, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

const divisions = [
  { name: 'হিফয বিভাগ', nameEn: 'Hifz Division', icon: '📖' },
  { name: 'নূরানী বিভাগ', nameEn: 'Nurani Division', icon: '🌟' },
  { name: 'এবতেদায়ী বিভাগ', nameEn: 'Ebtedayee Division', icon: '📚' },
  { name: 'মুতাওয়াসসিতাহ বিভাগ', nameEn: 'Mutawassitah Division', icon: '🎓' },
];

const stats = [
  { value: '500+', labelBn: 'মোট ছাত্র', labelEn: 'Total Students', icon: Users },
  { value: '50+', labelBn: 'শিক্ষক', labelEn: 'Teachers', icon: BookOpen },
  { value: '15+', labelBn: 'বছরের অভিজ্ঞতা', labelEn: 'Years Experience', icon: Award },
];

const notices = [
  { title: 'বার্ষিক পরীক্ষার সময়সূচী প্রকাশিত হয়েছে', date: '২০২৬-০৩-২০' },
  { title: 'রমজান মাসের বিশেষ ক্লাসের সময়সূচী', date: '২০২৬-০৩-১৫' },
  { title: 'নতুন শিক্ষাবর্ষের ভর্তি চলছে', date: '২০২৬-০৩-১০' },
];

const Home = () => {
  const { t, language } = useLanguage();

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
        <div className="islamic-pattern absolute inset-0" />
        <div className="container mx-auto px-4 py-16 sm:py-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-3xl sm:text-5xl font-display font-bold text-primary-foreground mb-4 leading-tight">
              {language === 'bn' ? 'ইসলামিক শিক্ষার আলোকবর্তিকা' : 'Beacon of Islamic Education'}
            </h1>
            <p className="text-primary-foreground/80 text-lg sm:text-xl mb-8 font-body">
              {language === 'bn'
                ? 'কুরআন ও সুন্নাহর আলোকে আদর্শ মানুষ গড়ার প্রত্যয়ে প্রতিষ্ঠিত'
                : 'Established with the commitment to build ideal humans in the light of Quran and Sunnah'}
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

      {/* Stats */}
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

      {/* Principal Message + Notices */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Principal */}
            <div className="lg:col-span-2 card-elevated p-6 sm:p-8">
              <h2 className="text-2xl font-display font-bold text-foreground mb-4">{t('principalMessage')}</h2>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="w-32 h-32 rounded-xl bg-secondary shrink-0 flex items-center justify-center text-4xl">
                  👤
                </div>
                <div>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {language === 'bn'
                      ? 'আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ। আমাদের মাদরাসায় আপনাকে স্বাগতম। আমরা বিশ্বাস করি যে, ইসলামিক শিক্ষা ও আধুনিক জ্ঞানের সমন্বয়ে একটি আদর্শ প্রজন্ম গড়ে তোলা সম্ভব। আমাদের অভিজ্ঞ শিক্ষকমণ্ডলী প্রতিটি ছাত্রের সর্বাঙ্গীণ বিকাশে নিরলসভাবে কাজ করে যাচ্ছেন।'
                      : 'Assalamu Alaikum Wa Rahmatullah. Welcome to our Madrasa. We believe in building an ideal generation through the combination of Islamic education and modern knowledge.'}
                  </p>
                  <p className="mt-4 font-semibold text-foreground">মুফতি আব্দুল্লাহ</p>
                  <p className="text-xs text-muted-foreground">{language === 'bn' ? 'অধ্যক্ষ' : 'Principal'}</p>
                </div>
              </div>
            </div>

            {/* Notices */}
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                  <Bell className="w-5 h-5 text-accent" /> {t('latestNotice')}
                </h3>
                <Link to="/notices" className="text-xs text-primary hover:underline">{t('viewAll')}</Link>
              </div>
              <div className="space-y-3">
                {notices.map((n, i) => (
                  <div key={i} className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Admission Divisions */}
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
            {divisions.map((div, i) => (
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
    </PublicLayout>
  );
};

export default Home;
