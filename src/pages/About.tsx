import PublicLayout from '@/components/PublicLayout';
import { Seo } from '@/components/Seo';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWebsiteSettings, DEFAULT_MADRASA_BUILDING_URL } from '@/hooks/useWebsiteSettings';
import { usePrincipalOfficer } from '@/hooks/usePrincipalOfficer';
import { motion } from 'framer-motion';
import {
  Target,
  Eye,
  BookOpen,
  GraduationCap,
  Award,
  CheckCircle2,
  Users,
  ShieldCheck,
  Building,
  HeartHandshake,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';

const About = () => {
  const { language } = useLanguage();
  const { settings: rawSettings } = useWebsiteSettings();
  const { data: principal } = usePrincipalOfficer();
  const bn = language === 'bn';
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    return () => clearTimeout(t);
  }, [hash, rawSettings]);

  const settings: any = principal
    ? {
        ...rawSettings,
        principal_name: bn
          ? (principal.principal_name || rawSettings.principal_name)
          : (principal.principal_name_en || principal.principal_name || rawSettings.principal_name),
        principal_title_bn: principal.principal_title_bn || rawSettings.principal_title_bn,
        principal_title_en: principal.principal_title_en || rawSettings.principal_title_en,
        principal_photo_url: principal.principal_photo_url || rawSettings.principal_photo_url,
      }
    : rawSettings;

  const instName = settings.institution_name || 'আল আরাবিয়া ছোবহানিয়া মাদ্রাসা ও এতিমখানা';
  const address = settings.address || 'খাজাঞ্চি রোড, এমএইচ সেন্টার, বিশ্বনাথ, সিলেট';
  const phone = settings.phone || '01749842401';
  const email = settings.email || 'info@subhania.edu.bd';
  const estYear = settings.est_year || '২০১৮';
  const regNumber = settings.reg_number || '১২৪/সিলেট';

  const principalName = settings.principal_name || 'আলহাজ্ব আব্দুছ ছোবহান';
  const principalTitle = settings.principal_title_bn || 'প্রতিষ্ঠাতা ও প্রিন্সিপাল';
  const principalPhoto = settings.principal_photo_url || null;
  const principalMessage =
    settings.principal_message_bn ||
    'আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ। আমাদের মাদরাসায় আপনাকে স্বাগতম। সহীহ কুরআন ও দ্বীনি শিক্ষার আলো ছড়িয়ে দিয়ে সৎ, যোগ্য ও আদর্শ হাফেজে কুরআন গড়ে তোলাই আমাদের নিরন্তর প্রয়াস।';

  const aboutContent =
    settings.about_content_bn ||
    'আল আরাবিয়া ছোবহানিয়া মাদ্রাসা ও এতিমখানা সিলেটের বিশ্বনাথে অবস্থিত একটি অন্যতম শীর্ষস্থানীয় দ্বীনি শিক্ষাপ্রতিষ্ঠান। পবিত্র কুরআনের সহীহ তিলাওয়াত, হিফজ এবং ইসলামিক মূল্যবোধের পাশাপাশি আধুনিক প্রাথমিক শিক্ষার সমন্বয়ে ভবিষ্যৎ প্রজন্মকে একটি পূর্ণাঙ্গ ইসলামী আদর্শে গড়ে তুলতে এ প্রতিষ্ঠান অবিরাম কাজ করে যাচ্ছে।';

  const missionText =
    settings.about_mission_bn ||
    'কুরআন ও সুন্নাহর আলোকে তাকওয়াবান, চরিত্রবান ও আদর্শ নাগরিক গড়ে তোলা এবং দ্বীনের বহুমুখী খিদমতের যোগ্য হাফেজ ও আলেম প্রস্তুত করা।';

  const visionText =
    settings.about_vision_bn ||
    'একটি সুসংহত ইসলামিক শিক্ষাকেন্দ্র হিসেবে প্রতিষ্ঠা লাভ করে প্রতিটি শিক্ষার্থীর হৃদয়ে কুরআনের নুর প্রজ্জ্বলিত করা এবং সমাজ থেকে অজ্ঞতা দূরীকরণ।';

  return (
    <PublicLayout>
      <Seo
        title={`${instName} — প্রতিষ্ঠান পরিচিতি ও ইতিহাস`}
        description={`${instName} এর লক্ষ্য, উদ্দেশ্য, ইতিহাস ও পরিচালনা পরিষদ।`}
        path="/about"
      />

      {/* 1. INSTITUTIONAL HERO BANNER */}
      <section className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white py-12 px-4 border-b-4 border-amber-600">
        <div className="max-w-6xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-800/80 text-amber-300 text-xs sm:text-sm px-4 py-1 rounded-full font-medium border border-amber-500/30">
            <span>স্থাপিত: {estYear} খ্রি.</span>
            <span>•</span>
            <span>রেজিস্ট্রেশন নং: {regNumber}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-amber-200 tracking-tight font-display">
            {instName}
          </h1>
          <p className="text-emerald-100/90 text-sm sm:text-base max-w-2xl mx-auto">
            প্রতিষ্ঠান পরিচিতি, লক্ষ্য-উদ্দেশ্য, পরিচালনা পরিষদ ও ঐতিহাসিক পটভূমি
          </p>
          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-emerald-200">
            <Link to="/" className="hover:text-amber-300 underline">হোম</Link>
            <span>/</span>
            <span className="text-amber-300 font-semibold">প্রতিষ্ঠান পরিচিতি</span>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">
        {/* 2. ABOUT & HISTORY SECTION */}
        <section id="history" className="scroll-mt-24">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 text-emerald-800 font-bold text-sm tracking-wide bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
                  <Building className="w-4 h-4 text-emerald-700" />
                  <span>মাদরাসার সংক্ষিপ্ত ইতিহাস ও পটভূমি</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 leading-snug">
                  দ্বীনি শিক্ষা ও চারিত্রিক নৈতিকতার এক শীর্ষ বিদ্যাপীঠ
                </h2>
                <div className="text-slate-600 leading-relaxed text-base space-y-3 whitespace-pre-line text-justify">
                  <p>{aboutContent}</p>
                  <p>
                    অত্র অঞ্চলের ভবিষ্যৎ প্রজন্মকে সহীহ সুন্নাহ ও কুরআনের শিক্ষায় আলোকিত করার লক্ষ্যে এই প্রতিষ্ঠান যাত্রা শুরু করেছিল। আল্লাহর অশেষ রহমতে ও দ্বীনদরদী মানুষের সহযোগিতায় আজ এটি একটি সুপ্রতিষ্ঠিত দ্বীনি কেন্দ্রে রূপ নিয়েছে।
                  </p>
                </div>

                <div className="pt-4 grid grid-cols-3 gap-3 border-t border-slate-100">
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <div className="text-xl sm:text-2xl font-extrabold text-emerald-800">১৬০+</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">বর্তমান শিক্ষার্থী</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <div className="text-xl sm:text-2xl font-extrabold text-emerald-800">১৪+</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">অভিজ্ঞ উস্তাদবৃন্দ</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <div className="text-xl sm:text-2xl font-extrabold text-emerald-800">১০০%</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">হিফজ ও দ্বীনি যত্ন</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm relative group">
                  <img
                    src={settings.about_image_url || DEFAULT_MADRASA_BUILDING_URL}
                    alt={instName}
                    className="w-full h-72 sm:h-80 object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.dataset.fallback) {
                        img.dataset.fallback = 'true';
                        img.src = DEFAULT_MADRASA_BUILDING_URL;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-transparent to-transparent flex items-end p-4">
                    <div className="text-white text-xs sm:text-sm font-medium">
                      {instName} ক্যাম্পাস প্রাঙ্গণ
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. MISSION, VISION & CORE VALUES */}
        <section id="vision" className="scroll-mt-24">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-800 font-display">
              লক্ষ্য, উদ্দেশ্য ও ভিশন
            </h3>
            <p className="text-slate-500 text-sm mt-1">কুরআন ও সুন্নাহর আলোকে সমাজ বিনির্মাণে আমাদের মূল লক্ষ্য</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-5 font-bold">
                <Target className="w-6 h-6 text-emerald-700" />
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">আমাদের মূল মিশন</h4>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                {missionText}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> বিশুদ্ধ তিলাওয়াত ও আমলমুখী জীবন
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-5 font-bold">
                <Eye className="w-6 h-6 text-amber-700" />
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">আমাদের সুদূরপ্রসারী ভিশন</h4>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                {visionText}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-amber-800">
                <CheckCircle2 className="w-4 h-4 text-amber-600" /> আদর্শ সমাজ গঠনে অগ্রণী ভূমিকা
              </div>
            </motion.div>
          </div>
        </section>

        {/* 4. FOUNDER & PRINCIPAL STATEMENT (REAL DB DATA) */}
        <section id="principal-message" className="scroll-mt-24">
          <div className="bg-gradient-to-br from-white to-emerald-50/40 rounded-2xl border-2 border-emerald-600/30 p-6 sm:p-9 shadow-md relative overflow-hidden">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
              {principalPhoto ? (
                <img
                  src={principalPhoto}
                  alt={principalName}
                  className="w-32 h-36 sm:w-40 sm:h-48 rounded-xl object-cover border-2 border-emerald-700 shadow-md shrink-0"
                />
              ) : (
                <div className="w-32 h-36 sm:w-40 sm:h-48 rounded-xl bg-emerald-100 border-2 border-emerald-300 flex flex-col items-center justify-center text-emerald-800 shrink-0">
                  <GraduationCap className="w-16 h-16 text-emerald-700" />
                  <span className="text-[11px] font-bold mt-2 text-emerald-900">সম্মানিত প্রধান</span>
                </div>
              )}

              <div className="space-y-3 text-center sm:text-left flex-1">
                <div className="inline-block bg-emerald-800 text-white text-xs px-3 py-1 rounded font-bold">
                  {principalTitle}
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {principalName}
                </h3>
                <div className="text-xs sm:text-sm text-slate-500 font-medium">
                  {instName} • {address}
                </div>

                <div className="pt-2 text-slate-700 text-sm sm:text-base leading-relaxed italic bg-white/70 p-4 rounded-xl border border-emerald-100 shadow-xs">
                  “{principalMessage}”
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-medium text-emerald-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> সার্বিক পরিচালনা ও দিকনির্দেশনা
                  </span>
                  <span>•</span>
                  <span>হেল্পলাইন: {phone}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. ACADEMIC HIGHLIGHTS & FEATURES */}
        <section id="features" className="scroll-mt-24">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-800 font-display">
              মাদরাসার অনন্য বৈশিষ্ট্য ও সেবাসমূহ
            </h3>
            <p className="text-slate-500 text-sm mt-1">শিক্ষার্থীদের জন্য আন্তর্জাতিক মানের দ্বীনি পরিবেশ</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-500 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-800 text-base mb-1">সহীহ কুরআন হিফজ</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                আন্তর্জাতিক মানের ক্বারী ও অভিজ্ঞ হাফেজগণের সরাসরি তত্ত্বাবধানে ৩ বছরে সম্পূর্ণ কুরআন হিফজ।
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-500 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-800 text-base mb-1">আবাসিক ও অনাবাসিক</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                স্বাস্থ্যসম্মত সুপরিসর হোস্টেল, পুষ্টিকর খাবার এবং ২৪ ঘণ্টা শিক্ষকদের সার্বক্ষণিক উপস্থিতি।
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-500 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-800 text-base mb-1">এতিমখানা লিল্লাহ ফান্ড</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                অসহায় ও এতিম শিক্ষার্থীদের সম্পূর্ণ বিনামূল্যে থাকা, খাওয়া, পোশাক ও চিকিৎসা সহায়তা।
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-500 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <Award className="w-5 h-5" />
              </div>
              <h5 className="font-bold text-slate-800 text-base mb-1">বেফাকুল মাদারিস সনদ</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                কেন্দ্রীয় বোর্ডের অধীনে পরীক্ষা ও সনদ এবং হিফজ সমাপনীতে জমকালো পাগড়ি প্রদান সম্মাননা।
              </p>
            </div>
          </div>
        </section>

        {/* 6. CALL TO ACTION / ADMISSION HUB */}
        <section className="bg-emerald-900 text-white rounded-2xl p-7 sm:p-9 text-center space-y-4 shadow-md border-b-4 border-amber-500">
          <h3 className="text-xl sm:text-2xl font-bold text-amber-200">
            আপনার সন্তানকে দ্বীনি ও আদর্শ শিক্ষায় গড়ে তুলতে চান?
          </h3>
          <p className="text-emerald-100 text-xs sm:text-sm max-w-xl mx-auto">
            ২০২৬-২০২৭ শিক্ষাবর্ষের নূরানী, নাজেরা ও হিফজুল কুরআন শাখায় ভর্তি ফরম বিতরণ চলছে। অনলাইন অথবা সরাসরি অফিসে যোগাযোগ করুন।
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              to="/admission"
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-5 py-2.5 rounded-lg text-sm transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>অনলাইন ভর্তি আবেদন করুন</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/contact"
              className="bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-2.5 rounded-lg text-sm border border-white/20 transition-all"
            >
              যোগাযোগ ও দপ্তর ঠিকানা
            </Link>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
};

export default About;
