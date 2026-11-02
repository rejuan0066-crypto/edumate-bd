import PublicLayout from '@/components/PublicLayout';
import { Seo } from '@/components/Seo';
import { useWebsiteSettings, DEFAULT_MADRASA_BUILDING_URL } from '@/hooks/useWebsiteSettings';
import { Link } from 'react-router-dom';
import {
  Building,
  Calendar,
  Award,
  Users,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import BackButton from '@/components/BackButton';

const HistoryPage = () => {
  const { settings } = useWebsiteSettings();

  const instName = settings.institution_name || 'আল আরাবিয়া ছোবহানিয়া মাদ্রাসা ও এতিমখানা';
  const address = settings.address || 'খাজাঞ্চি রোড, এমএইচ সেন্টার, বিশ্বনাথ, সিলেট';
  const estYear = settings.established_year || '২০০৮';
  const regNumber = settings.registration_number || '১২৪/সিলেট';

  const aboutContent =
    settings.about_content_bn ||
    'আল আরাবিয়া ছোবহানিয়া মাদ্রাসা ও এতিমখানা সিলেটের বিশ্বনাথে অবস্থিত একটি অন্যতম শীর্ষস্থানীয় দ্বীনি শিক্ষাপ্রতিষ্ঠান। পবিত্র কুরআনের সহীহ তিলাওয়াত, হিফজ এবং ইসলামিক মূল্যবোধের পাশাপাশি আধুনিক প্রাথমিক শিক্ষার সমন্বয়ে ভবিষ্যৎ প্রজন্মকে একটি পূর্ণাঙ্গ ইসলামী আদর্শে গড়ে তুলতে এ প্রতিষ্ঠান অবিরাম কাজ করে যাচ্ছে।';

  return (
    <PublicLayout>
      <Seo
        title={`মাদরাসার সংক্ষিপ্ত ইতিহাস — ${instName}`}
        description={`${instName} এর প্রতিষ্ঠা পটভূমি, ঐতিহ্য, ঐতিহাসিক মাইলফলক ও সমৃদ্ধ যাত্রা।`}
        path="/history"
      />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        <BackButton position="top" />

        {/* Page Title Header */}
        <div className="border-b border-slate-200 pb-5">
          <div className="inline-flex items-center gap-2 text-emerald-800 font-bold text-xs sm:text-sm tracking-wide bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-2">
            <Building className="w-4 h-4 text-emerald-700" />
            <span>প্রতিষ্ঠান পরিচিতি শাখা</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
            মাদরাসার সংক্ষিপ্ত ইতিহাস ও পটভূমি
          </h1>
          <p className="text-slate-600 text-sm sm:text-base mt-1.5 max-w-3xl">
            সহীহ কুরআন ও দ্বীনি শিক্ষার আলো ছড়িয়ে দিয়ে একনিষ্ঠ খেদমতের গৌরবময় ঐতিহ্যের পথচলা।
          </p>

          {/* Sub Navigation Pills */}
          <div className="flex flex-wrap gap-2 pt-4">
            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-800 text-white shadow-2xs">
              ১. মাদরাসার সংক্ষিপ্ত ইতিহাস
            </span>
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
            <Link
              to="/features"
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 transition-colors"
            >
              ৪. একাডেমিক বৈশিষ্ট্য ও সুবিধা
            </Link>
          </div>
        </div>

        {/* Main Content & Building Photo */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 text-amber-800 font-semibold text-xs bg-amber-50 px-3 py-1 rounded-md border border-amber-200">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>প্রতিষ্ঠাকাল: {estYear} খ্রিষ্টাব্দ • রেজি: {regNumber}</span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 leading-snug">
                দ্বীনি শিক্ষা ও চারিত্রিক নৈতিকতার এক শীর্ষ বিদ্যাপীঠ
              </h2>
              <div className="text-slate-600 leading-relaxed text-sm sm:text-base space-y-3 whitespace-pre-line text-justify">
                <p>{aboutContent}</p>
                <p>
                  অত্র অঞ্চলের ভবিষ্যৎ প্রজন্মকে সহীহ সুন্নাহ ও কুরআনের শিক্ষায় আলোকিত করার লক্ষ্যে এই প্রতিষ্ঠান যাত্রা শুরু করেছিল। আল্লাহর অশেষ রহমতে ও দ্বীনদরদী মানুষের সহযোগিতায় আজ এটি একটি সুপ্রতিষ্ঠিত দ্বীনি কেন্দ্রে রূপ নিয়েছে।
                </p>
                <p>
                  প্রতিষ্ঠার সূচনালগ্ন থেকেই অভিজ্ঞ ও নিষ্ঠাবান শিক্ষক মণ্ডলীর তত্ত্বাবধানে শিক্ষার্থীদের তাজবীদভিত্তিক সহীহ কুরআন হিফজের পাশাপাশি আধুনিক প্রাথমিক শিক্ষার মৌলিক জ্ঞান প্রদান করা হয়।
                </p>
              </div>

              {/* Quick Key Badges */}
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
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative group">
                <img
                  src={settings.about_image_url || DEFAULT_MADRASA_BUILDING_URL}
                  alt={instName}
                  className="w-full h-80 sm:h-96 object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = 'true';
                      img.src = DEFAULT_MADRASA_BUILDING_URL;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 via-transparent to-transparent flex flex-col justify-end p-5">
                  <div className="text-white font-bold text-base sm:text-lg">
                    {instName}
                  </div>
                  <div className="text-emerald-200 text-xs sm:text-sm flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{address}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline & Milestones */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 sm:p-8">
          <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-700" />
            <span>ঐতিহাসিক মাইলফলক ও অগ্রযাত্রার ধাপসমূহ</span>
          </h3>

          <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 sm:before:left-4 before:w-0.5 before:bg-emerald-200">
            <div className="relative flex items-start gap-4">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 z-10 shadow-xs font-bold text-xs">
                ১
              </div>
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex-1">
                <div className="font-bold text-slate-800 text-base">প্রতিষ্ঠা ও শুভ সূচনা ({estYear})</div>
                <p className="text-slate-600 text-sm mt-1">
                  সিলেটের বিশ্বনাথের ধর্মপ্রাণ ব্যক্তিবর্গ ও প্রতিষ্ঠাতা মহোদয়ের ঐকান্তিক প্রচেষ্টায় মাদ্রাসাটির আনুষ্ঠানিক ভিত্তিপ্রস্তর স্থাপন হয়।
                </p>
              </div>
            </div>

            <div className="relative flex items-start gap-4">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 z-10 shadow-xs font-bold text-xs">
                ২
              </div>
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex-1">
                <div className="font-bold text-slate-800 text-base">বেফাক রেজিস্ট্রেশন ও বোর্ড অন্তর্ভুক্তি</div>
                <p className="text-slate-600 text-sm mt-1">
                  বাংলাদেশ কওমি মাদ্রাসা শিক্ষা বোর্ড (বেফাকুল মাদারিসিল আরাবিয়া বাংলাদেশ) এর স্বীকৃতি ও কেন্দ্রীয় সিলেবাস অনুযায়ী পাঠদান চালুকরণ।
                </p>
              </div>
            </div>

            <div className="relative flex items-start gap-4">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 z-10 shadow-xs font-bold text-xs">
                ৩
              </div>
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex-1">
                <div className="font-bold text-slate-800 text-base">এতিমখানা লিল্লাহ ফান্ড ও আবাসিক হোস্টেল সম্প্রসারণ</div>
                <p className="text-slate-600 text-sm mt-1">
                  অসহায় ও এতিম শিক্ষার্থীদের জন্য সম্পূর্ণ বিনামূল্যে থাকা, খাওয়া ও উন্নত স্বাস্থ্যসেবার আধুনিক আবাসিক ব্যবস্থা নিশ্চিতকরণ।
                </p>
              </div>
            </div>

            <div className="relative flex items-start gap-4">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 z-10 shadow-xs font-bold text-xs">
                ৪
              </div>
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex-1">
                <div className="font-bold text-slate-800 text-base">স্মার্ট ক্যাম্পাস ও আধুনিক প্রযুক্তিনির্ভর ব্যবস্থাপনা</div>
                <p className="text-slate-600 text-sm mt-1">
                  অভিভাবক পোর্টাল, এসএমএস নোটিফিকেশন, ডিজিটাল ফলাফল প্রকাশ এবং লাইভ শ্রেণি কার্যক্রম সংযুক্ত করে এক নতুন দিগন্তের উন্মোচন।
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Footer Section */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-850 to-teal-950 text-white rounded-2xl p-7 sm:p-9 text-center space-y-4 shadow-md border-b-4 border-amber-500">
          <h3 className="text-xl sm:text-2xl font-bold text-amber-200">
            {instName}-এর দ্বীনি কাফেলায় আপনার সন্তানকে যুক্ত করুন
          </h3>
          <p className="text-emerald-100 text-xs sm:text-sm max-w-xl mx-auto">
            সহীহ কুরআন শিক্ষা ও উন্নত নৈতিক চরিত্র গঠনের এক অনন্য নির্ভরযোগ্য পরিবেশ।
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              to="/admission"
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>অনলাইন ভর্তি আবেদন করুন</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/contact"
              className="bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-2.5 rounded-xl text-sm border border-white/20 transition-all"
            >
              যোগাযোগ ও দপ্তর ঠিকানা
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default HistoryPage;
