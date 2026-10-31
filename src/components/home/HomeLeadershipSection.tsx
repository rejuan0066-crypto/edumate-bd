import React from 'react';
import { Link } from 'react-router-dom';
import { Quote, ArrowRight, UserCheck, Award } from 'lucide-react';
import { usePrincipalOfficer } from '@/hooks/usePrincipalOfficer';

interface HomeLeadershipSectionProps {
  settings: any;
  language: string;
}

export const HomeLeadershipSection: React.FC<HomeLeadershipSectionProps> = ({
  settings: rawSettings,
  language,
}) => {
  const bn = language === 'bn';
  const { data: principal } = usePrincipalOfficer();

  const principalName = principal?.principal_name || rawSettings?.principal_name || (bn ? 'মাওলানা মোহাম্মদ আবুল বশর' : 'Mawlana Mohammad Abul Bashar');
  const principalTitle = principal?.principal_title_bn || rawSettings?.principal_title_bn || (bn ? 'মুহতামিম ও প্রিন্সিপাল' : 'Principal & Muhtamim');
  const principalPhoto = principal?.principal_photo_url || rawSettings?.principal_photo_url;
  const principalMessage = rawSettings?.principal_message_bn || (bn
    ? '“যোগ্য শিক্ষক মণ্ডলীর সার্বক্ষণিক তদারকি, নিয়মিত ছবক প্রদান ও আবাসিক শিক্ষার্থীদের চারিত্রিক ও আত্মিক গঠনের জন্য আমরা বদ্ধপরিকর। আমাদের লক্ষ্য প্রতিটি ছাত্রকে আদর্শ হাফেজ ও আলেম হিসেবে গড়ে তোলা।”'
    : '“We are dedicated to holistic Islamic education, regular supervision, and building moral character in each student.”');

  const adminName = rawSettings?.admin_name || (bn ? 'আলহাজ্ব আব্দুছ ছোবহান' : 'Alhaj Abdus Sobhan');
  const adminTitle = rawSettings?.admin_title_bn || (bn ? 'প্রতিষ্ঠাতা ও সভাপতি, ম্যানেজিং কমিটি' : 'Founder & President, Managing Committee');
  const adminPhoto = rawSettings?.admin_photo_url;
  const adminMessage = rawSettings?.admin_message_bn || (bn
    ? '“অত্র অঞ্চলের ভবিষ্যৎ প্রজন্মকে সহীহ সুন্নাহ ও কুরআনের শিক্ষায় আলোকিত করার লক্ষ্যে এই প্রতিষ্ঠান যাত্রা শুরু করেছিল। আল্লাহর অশেষ রহমতে ও দ্বীনদরদী মানুষের সহযোগিতায় আজ এটি একটি সুপ্রতিষ্ঠিত দ্বীনি কেন্দ্রে রূপ নিয়েছে।”'
    : '“This institution was founded to illuminate the next generation with the Quran and authentic Sunnah. By the grace of Allah, it has flourished into a beacon of knowledge.”');

  return (
    <section className="py-6 sm:py-8">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1 pb-3 mb-6 border-b-2 border-emerald-800/20">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold font-display text-emerald-950 dark:text-emerald-300">
              {bn ? 'প্রতিষ্ঠান পরিচালনা ও প্রশাসনিক দিকনির্দেশনা' : 'Executive Leadership & Direction'}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {bn ? 'মাদরাসার লক্ষ্য ও অনুপ্রেরণা' : 'Vision, Mission & Inspiration'}
            </p>
          </div>
          <Link
            to="/about"
            className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            {bn ? 'কমিটি ও প্রশাসন বিস্তারিত' : 'View Committee & Administration'} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* President Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-5 items-start">
            <div className="shrink-0 mx-auto sm:mx-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-amber-500/30 bg-slate-100 shadow-inner flex items-center justify-center">
                {adminPhoto ? (
                  <img
                    src={adminPhoto}
                    alt={adminName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50 text-amber-800 font-bold text-3xl">
                    <UserCheck className="w-10 h-10 text-amber-700/60" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-between h-full space-y-2 text-center sm:text-left">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 mb-1">
                  {bn ? 'প্রতিষ্ঠাতা ও সভাপতি' : 'Founder & President'}
                </span>
                <h4 className="text-lg font-bold font-display text-foreground leading-snug">
                  {adminName}
                </h4>
                <p className="text-xs text-muted-foreground font-medium">
                  {adminTitle}
                </p>
              </div>

              <div className="relative text-xs sm:text-sm text-foreground/80 leading-relaxed italic line-clamp-3 my-1">
                {adminMessage}
              </div>

              <div className="pt-2">
                <Link
                  to="/about#admin-message"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-400 hover:underline"
                >
                  {bn ? 'সম্পূর্ণ বাণী পড়ুন' : 'Read Full Message'} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Principal Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-5 items-start">
            <div className="shrink-0 mx-auto sm:mx-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-emerald-500/30 bg-slate-100 shadow-inner flex items-center justify-center">
                {principalPhoto ? (
                  <img
                    src={principalPhoto}
                    alt={principalName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50 text-emerald-800 font-bold text-3xl">
                    <Award className="w-10 h-10 text-emerald-700/60" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-between h-full space-y-2 text-center sm:text-left">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 mb-1">
                  {bn ? 'মুহতামিম ও প্রিন্সিপাল' : 'Principal & Muhtamim'}
                </span>
                <h4 className="text-lg font-bold font-display text-foreground leading-snug">
                  {principalName}
                </h4>
                <p className="text-xs text-muted-foreground font-medium">
                  {principalTitle}
                </p>
              </div>

              <div className="relative text-xs sm:text-sm text-foreground/80 leading-relaxed italic line-clamp-3 my-1">
                {principalMessage}
              </div>

              <div className="pt-2">
                <Link
                  to="/about#principal-message"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  {bn ? 'সম্পূর্ণ বাণী পড়ুন' : 'Read Full Message'} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeLeadershipSection;
