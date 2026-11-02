import PublicLayout from '@/components/PublicLayout';
import { Seo } from '@/components/Seo';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  Users,
  HeartHandshake,
  Award,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Utensils,
  Clock,
  Laptop,
  GraduationCap,
  Activity,
  Library,
} from 'lucide-react';
import BackButton from '@/components/BackButton';

const FeaturesPage = () => {
  const { settings } = useWebsiteSettings();

  const instName = settings.institution_name || 'আল আরাবিয়া ছোবহানিয়া মাদ্রাসা ও এতিমখানা';

  const featuresList = [
    {
      icon: BookOpen,
      title: 'সহীহ কুরআন হিফজ ও তাজবীদ',
      desc: 'আন্তর্জাতিক মানের ক্বারী ও অভিজ্ঞ হাফেজগণের সরাসরি তত্ত্বাবধানে ৩ বছরে সম্পূর্ণ কুরআন হিফজের সুব্যবস্থা। মাখরাজ ও সিফাত ভিত্তিক সহীহ উচ্চারণ শিক্ষা।',
      color: 'text-emerald-700 bg-emerald-50',
    },
    {
      icon: Users,
      title: 'সুপরিসর আবাসিক হোস্টেল',
      desc: 'স্বাস্থ্যসম্মত সুপরিসর হোস্টেল, আরামদায়ক বিছানা, আলো-বাতাসপূর্ণ পরিচ্ছন্ন কক্ষ এবং ২৪ ঘণ্টা শিক্ষকদের সার্বক্ষণিক উপস্থিতি ও নিবিড় অভিভাবকত্ব।',
      color: 'text-blue-700 bg-blue-50',
    },
    {
      icon: Utensils,
      title: 'পুষ্টিকর হালাল খাবার ও ডাইনিং',
      desc: 'প্রতিদিনের জন্য স্বাস্থ্যসম্মত, পুষ্টিকর ও সুস্বাদু খাবার পরিবেশন। নিজস্ব বাবুর্চি দ্বারা পরিষ্কার-পরিচ্ছন্ন পরিবেশে সার্বক্ষণিক খাবার তৈরি।',
      color: 'text-amber-700 bg-amber-50',
    },
    {
      icon: HeartHandshake,
      title: 'এতিমখানা লিল্লাহ ফান্ড',
      desc: 'অসহায় ও এতিম শিক্ষার্থীদের সম্পূর্ণ বিনামূল্যে থাকা, খাওয়া, পোশাক, কিতাবপত্র ও চিকিৎসার ১০০% দায়ভার গ্রহণ ও পারিবারিক ভালোবাসা প্রদান।',
      color: 'text-rose-700 bg-rose-50',
    },
    {
      icon: Award,
      title: 'বেফাকুল মাদারিস স্বীকৃতি ও সনদ',
      desc: 'বাংলাদেশ কওমি মাদ্রাসা শিক্ষা বোর্ড (বেফাক)-এর কেন্দ্রীয় সিলেবাস অনুযায়ী পাঠদান ও সরকারিভাবে সমমান প্রাপ্ত বোর্ডের অধীনে কেন্দ্রীয় পরীক্ষা।',
      color: 'text-purple-700 bg-purple-50',
    },
    {
      icon: Laptop,
      title: 'স্মার্ট ম্যানেজমেন্ট ও এসএমএস ট্র্যাকিং',
      desc: 'ডিজিটাল হাজিরা, স্বয়ংক্রিয় গার্ডিয়ান নোটিফিকেশন, অনলাইন ফি পরিশোধ, ডিজিটাল নোটিশ বোর্ড এবং শিক্ষার্থী অগ্রগতি ট্র্যাকিং সিস্টেম।',
      color: 'text-teal-700 bg-teal-50',
    },
    {
      icon: Library,
      title: 'সমৃদ্ধ ইসলামিক লাইব্রেরি',
      desc: 'তাফসির, হাদিস, ফিকহ, সীরাত ও ইসলামিক ইতিহাসের বিশাল বইয়ের সমাহার। শিক্ষার্থীদের অধ্যয়ন ও গবেষণার জন্য নিরিবিলি পাঠাগার।',
      color: 'text-indigo-700 bg-indigo-50',
    },
    {
      icon: Activity,
      title: 'জরুরি প্রাথমিক চিকিৎসা ও স্বাস্থ্যসেবা',
      desc: 'শিক্ষার্থীদের নিয়মিত স্বাস্থ্য পরীক্ষা, সার্বক্ষণিক ফার্স্ট এইড ও জরুরি প্রয়োজনে দ্রুত বিশেষজ্ঞ ডাক্তারের তত্ত্বাবধানে সুচিকিৎসার সুব্যবস্থা।',
      color: 'text-emerald-700 bg-emerald-50',
    },
  ];

  return (
    <PublicLayout>
      <Seo
        title={`একাডেমিক বৈশিষ্ট্য ও সুবিধাসমূহ — ${instName}`}
        description={`${instName} এর আধুনিক সুযোগ-সুবিধা, আবাসিক হোস্টেল, মানসম্মত হিফজ পরিবেশ ও অনন্য সেবাসমূহ।`}
        path="/features"
      />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        <BackButton position="top" />

        {/* Page Title Header */}
        <div className="border-b border-slate-200 pb-5">
          <div className="inline-flex items-center gap-2 text-emerald-800 font-bold text-xs sm:text-sm tracking-wide bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <span>প্রতিষ্ঠান পরিচিতি শাখা</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
            একাডেমিক বৈশিষ্ট্য ও সুবিধাসমূহ
          </h1>
          <p className="text-slate-600 text-sm sm:text-base mt-1.5 max-w-3xl">
            শিক্ষার্থীদের দ্বীনি শিক্ষা, আদর্শ চরিত্র ও উন্নত জীবনের জন্য আন্তর্জাতিক মানের সুব্যবস্থা।
          </p>

          {/* Sub Navigation Pills */}
          <div className="flex flex-wrap gap-2 pt-4">
            <Link
              to="/history"
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 transition-colors"
            >
              ১. মাদরাসার সংক্ষিপ্ত ইতিহাস
            </Link>
            <Link
              to="/vision"
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 transition-colors"
            >
              ২. লক্ষ্য, উদ্দেশ্য ও ভিশন
            </Link>
            <Link
              to="/management"
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 transition-colors"
            >
              ৩. পরিচালনা পরিষদ ও অধ্যক্ষের বাণী
            </Link>
            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-800 text-white shadow-2xs">
              ৪. একাডেমিক বৈশিষ্ট্য ও সুবিধা
            </span>
          </div>
        </div>

        {/* Main Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuresList.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${item.color}`}
                >
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-justify">
                  {item.desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>সার্বক্ষণিক তত্ত্বাবধান</span>
              </div>
            </div>
          ))}
        </div>

        {/* Daily Schedule / Discipline Banner */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 sm:p-9 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>দৈনন্দিন রুটিন ও শৃঙ্খলা</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
                নিয়মানুবর্তী ও বরকতময় প্রতিদিনের জীবন
              </h3>
              <p className="text-slate-600 text-xs sm:text-sm max-w-xl">
                তাহাজ্জুদের আহ্বান থেকে শুরু করে জামাতে সালাত, সবক তিলাওয়াত, বিশ্রাম ও প্রাথমিক সাধারণ শিক্ষার সুবিন্যস্ত রুটিন।
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0">
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-2xs">
                <div className="text-xs text-slate-500 font-medium">হিফজ সম্পন্ন হওয়ার হার</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">১০০%</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-2xs">
                <div className="text-xs text-slate-500 font-medium">শিক্ষক-ছাত্র অনুপাত</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">১:১২</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Footer Section */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-850 to-teal-950 text-white rounded-2xl p-7 sm:p-9 text-center space-y-4 shadow-md border-b-4 border-amber-500">
          <h3 className="text-xl sm:text-2xl font-bold text-amber-200">
            আপনার সন্তানকে আধুনিক ও দ্বীনি সুবিধার এই ক্যাম্পাসে ভর্তি করান
          </h3>
          <p className="text-emerald-100 text-xs sm:text-sm max-w-xl mx-auto">
            অনলাইনে মাত্র কয়েক মিনিটেই আবেদন ফরম পূরণ করা যাবে।
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              to="/admission"
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>অনলাইন ভর্তি আবেদন ফরম</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/fee-payment"
              className="bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-2.5 rounded-xl text-sm border border-white/20 transition-all"
            >
              ফি ও খরচ বিবরণী
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default FeaturesPage;
