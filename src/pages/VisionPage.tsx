import PublicLayout from '@/components/PublicLayout';
import { Seo } from '@/components/Seo';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { Link } from 'react-router-dom';
import {
  Target,
  Eye,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Heart,
  BookOpen,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import BackButton from '@/components/BackButton';
import { motion } from 'framer-motion';

const VisionPage = () => {
  const { settings } = useWebsiteSettings();

  const instName = settings.institution_name || 'আল আরাবিয়া ছোবহানিয়া মাদ্রাসা ও এতিমখানা';

  const missionText =
    settings.about_mission_bn ||
    'কুরআন ও সুন্নাহর আলোকে তাকওয়াবান, চরিত্রবান ও আদর্শ নাগরিক গড়ে তোলা এবং দ্বীনের বহুমুখী খিদমতের যোগ্য হাফেজ ও আলেম প্রস্তুত করা।';

  const visionText =
    settings.about_vision_bn ||
    'একটি সুসংহত ইসলামিক শিক্ষাকেন্দ্র হিসেবে প্রতিষ্ঠা লাভ করে প্রতিটি শিক্ষার্থীর হৃদয়ে কুরআনের নুর প্রজ্জ্বলিত করা এবং সমাজ থেকে অজ্ঞতা দূরীকরণ।';

  return (
    <PublicLayout showBackButton={false}>
      <Seo
        title={`লক্ষ্য, উদ্দেশ্য ও ভিশন — ${instName}`}
        description={`${instName} এর প্রাতিষ্ঠানিক লক্ষ্য, মূল মিশন, সুদূরপ্রসারী ভিশন এবং ইসলামী মূল্যবোধ।`}
        path="/vision"
      />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        <BackButton position="top" />

        {/* Page Title Header */}
        <div className="border-b border-slate-200 pb-5">
          <div className="inline-flex items-center gap-2 text-emerald-800 font-bold text-xs sm:text-sm tracking-wide bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-2">
            <Target className="w-4 h-4 text-emerald-700" />
            <span>প্রতিষ্ঠান পরিচিতি শাখা</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
            লক্ষ্য, উদ্দেশ্য ও ভিশন
          </h1>
          <p className="text-slate-600 text-sm sm:text-base mt-1.5 max-w-3xl">
            কুরআন ও সুন্নাহর সঠিক দিকনির্দেশনায় একনিষ্ঠ ও খোদাভীরু প্রজন্ম গড়ে তোলার সুস্পষ্ট অঙ্গীকার।
          </p>

          {/* Sub Navigation Pills */}
          <div className="flex flex-wrap gap-2 pt-4">
            <Link
              to="/history"
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 transition-colors"
            >
              ১. মাদরাসার সংক্ষিপ্ত ইতিহাস
            </Link>
            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-800 text-white shadow-2xs">
              ২. লক্ষ্য, উদ্দেশ্য ও ভিশন
            </span>
            <Link
              to="/management"
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 transition-colors"
            >
              ৩. পরিচালনা পরিষদ ও অধ্যক্ষের বাণী
            </Link>
            <Link
              to="/features"
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 transition-colors"
            >
              ৪. একাডেমিক বৈশিষ্ট্য ও সুবিধা
            </Link>
          </div>
        </div>

        {/* Mission & Vision Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-7 sm:p-9 rounded-2xl border-2 border-emerald-500/25 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-6 font-bold shadow-2xs">
                <Target className="w-7 h-7 text-emerald-700" />
              </div>
              <div className="text-xs font-bold text-emerald-800 tracking-wider uppercase mb-1">
                Mission Statement
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">আমাদের মূল মিশন</h2>
              <p className="text-slate-600 leading-relaxed text-base whitespace-pre-line text-justify">
                {missionText}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-xs sm:text-sm font-semibold text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>তাজবীদ ভিত্তিক আন্তর্জাতিক মানের সহীহ হিফজ</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>আমলমুখী জীবন ও চারিত্রিক নৈতিকতার পাঠ</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-7 sm:p-9 rounded-2xl border-2 border-amber-500/25 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full pointer-events-none" />
            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-6 font-bold shadow-2xs">
                <Eye className="w-7 h-7 text-amber-700" />
              </div>
              <div className="text-xs font-bold text-amber-800 tracking-wider uppercase mb-1">
                Vision Statement
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">আমাদের সুদূরপ্রসারী ভিশন</h2>
              <p className="text-slate-600 leading-relaxed text-base whitespace-pre-line text-justify">
                {visionText}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-xs sm:text-sm font-semibold text-amber-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>সমাজ ও জাতির কল্যাণে আদর্শ দ্বীনি নেতৃত্ব সৃষ্টি</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>অসহায় ও এতিম শিশুদের স্বাবলম্বী দ্বীনি নাগরিক বানানো</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Core Values Section */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 sm:p-9">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
              আমাদের মৌলিক প্রাতিষ্ঠানিক মূল্যবোধসমূহ
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm mt-1">
              যেসব মৌলিক স্তম্ভের উপর আমাদের প্রতিটি শিক্ষা কার্যক্রম পরিচালিত হয়
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <h4 className="font-bold text-slate-900 text-base mb-1.5">তাকওয়া ও খোদাভীতি</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                প্রতিটি কাজে আল্লাহর সন্তুষ্টি অর্জন এবং সুন্নাহভিত্তিক জীবনযাপনকে অগ্রাধিকার দেওয়া।
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5 text-emerald-700" />
              </div>
              <h4 className="font-bold text-slate-900 text-base mb-1.5">সহীহ তাজবীদ ও শুদ্ধতা</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                পবিত্র কালামুল্লাহর প্রতিটি হরফ মাখরাজ ও তাজবীদের সাথে তিলাওয়াত ও মুখস্থকরণ।
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3">
                <Heart className="w-5 h-5 text-emerald-700" />
              </div>
              <h4 className="font-bold text-slate-900 text-base mb-1.5">উন্নত চারিত্রিক সৌন্দর্য</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                বড়দের প্রতি সম্মান, ছোটদের প্রতি স্নেহ এবং নম্র ও সদাচারী ব্যক্তিত্ব গড়ে তোলা।
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3">
                <GraduationCap className="w-5 h-5 text-emerald-700" />
              </div>
              <h4 className="font-bold text-slate-900 text-base mb-1.5">আধুনিক প্রাথমিক শিক্ষা</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                বাংলা, ইংরেজি, গণিত ও প্রাথমিক তথ্যপ্রযুক্তির মৌলিক দক্ষতা সমান গুরুত্বে শিক্ষাদান।
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5 text-emerald-700" />
              </div>
              <h4 className="font-bold text-slate-900 text-base mb-1.5">মানবিক সেবা ও এতিম প্রতিপালন</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                এতিম ও অসহায় শিশুদের স্নেহ ও মমতা দিয়ে পারিবারিক ভালোবাসার আমেজে লালন-পালন।
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              </div>
              <h4 className="font-bold text-slate-900 text-base mb-1.5">শৃঙ্খলা ও নিয়মানুবর্তিতা</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                দৈনন্দিন সময়সূচী, তাহাজ্জুদ, জামাতে সালাত ও অধ্যয়নের নিবিড় নিয়মানুবর্তিতা।
              </p>
            </div>
          </div>
        </div>

        {/* CTA Footer Section */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-850 to-teal-950 text-white rounded-2xl p-7 sm:p-9 text-center space-y-4 shadow-md border-b-4 border-amber-500">
          <h3 className="text-xl sm:text-2xl font-bold text-amber-200">
            আদর্শ ও নৈতিক প্রজন্ম গঠনের এই মহান যাত্রায় আপনিও শরিক হোন
          </h3>
          <p className="text-emerald-100 text-xs sm:text-sm max-w-xl mx-auto">
            {instName}-এ নতুন শিক্ষাবর্ষের ভর্তি তথ্য ও সুযোগ-সুবিধা সম্পর্কে বিস্তারিত জানুন।
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              to="/admission"
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>অনলাইন ভর্তি আবেদন</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/history"
              className="bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-2.5 rounded-xl text-sm border border-white/20 transition-all"
            >
              মাদরাসার সংক্ষিপ্ত ইতিহাস দেখুন
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default VisionPage;
