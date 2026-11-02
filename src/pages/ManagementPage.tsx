import PublicLayout from '@/components/PublicLayout';
import { Seo } from '@/components/Seo';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { usePrincipalOfficer } from '@/hooks/usePrincipalOfficer';
import { Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  HeartHandshake,
  CheckCircle2,
  Award,
} from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const ManagementPage = () => {
  const { settings: rawSettings } = useWebsiteSettings();
  const { data: principal } = usePrincipalOfficer();

  const settings = principal
    ? {
        ...rawSettings,
        principal_name: principal.principal_name || rawSettings.principal_name,
        principal_title_bn: principal.principal_title_bn || rawSettings.principal_title_bn,
        principal_photo_url: principal.principal_photo_url || rawSettings.principal_photo_url,
      }
    : rawSettings;

  const instName = settings.institution_name || 'আল আরাবিয়া ছোবহানিয়া মাদ্রাসা ও এতিমখানা';
  const address = settings.address || 'খাজাঞ্চি রোড, এমএইচ সেন্টার, বিশ্বনাথ, সিলেট';
  const phone = settings.phone || '01749842401';
  const email = settings.email || 'info@subhania.edu.bd';

  const principalName = settings.principal_name || 'আলহাজ্ব আব্দুছ ছোবহান';
  const principalTitle = settings.principal_title_bn || 'প্রতিষ্ঠাতা ও প্রিন্সিপাল';
  const principalPhoto = settings.principal_photo_url || null;
  const principalMessage =
    settings.principal_message_bn ||
    'আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ। আমাদের মাদরাসায় আপনাকে স্বাগতম। সহীহ কুরআন ও দ্বীনি শিক্ষার আলো ছড়িয়ে দিয়ে সৎ, যোগ্য ও আদর্শ হাফেজে কুরআন গড়ে তোলাই আমাদের নিরন্তর প্রয়াস। অভিভাবক ও শুভানুধ্যায়ীদের আন্তরিক দোয়ায় অত্র প্রতিষ্ঠান উত্তরোত্তর এগিয়ে যাচ্ছে।';

  const adminName = settings.admin_name ? settings.admin_name.trim() : '';
  const adminTitle = settings.admin_title_bn || 'সভাপতি / এডমিন';
  const adminPhoto = settings.admin_photo_url || null;
  const adminMessage = settings.admin_message_bn || '';
  const hasDistinctAdmin = Boolean(adminName && adminName !== principalName);

  // Fetch committees if available
  const { data: committees = [] } = useQuery({
    queryKey: ['public-committees'],
    queryFn: async () => {
      const { data } = await supabase
        .from('committees')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });
      return data || [];
    },
  });

  return (
    <PublicLayout>
      <Seo
        title={`পরিচালনা পরিষদ ও অধ্যক্ষের বাণী — ${instName}`}
        description={`${instName} এর প্রতিষ্ঠাতা, প্রিন্সিপাল মহোদয়ের বিশেষ বাণী এবং পরিচালনা পরিষদের তথ্যাবলী।`}
        path="/management"
      />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        <BackButton position="top" />

        {/* Page Title Header */}
        <div className="border-b border-slate-200 pb-5">
          <div className="inline-flex items-center gap-2 text-emerald-800 font-bold text-xs sm:text-sm tracking-wide bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 mb-2">
            <Users className="w-4 h-4 text-emerald-700" />
            <span>প্রতিষ্ঠান পরিচিতি শাখা</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
            পরিচালনা পরিষদ ও অধ্যক্ষের বাণী
          </h1>
          <p className="text-slate-600 text-sm sm:text-base mt-1.5 max-w-3xl">
            সুযোগ্য নেতৃত্ব, বিজ্ঞ শিক্ষকমণ্ডলী ও পরিচালনা পরিষদের দিকনির্দেশনায় পরিচালিত দ্বীনি প্রতিষ্ঠান।
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
            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-800 text-white shadow-2xs">
              ৩. পরিচালনা পরিষদ ও অধ্যক্ষের বাণী
            </span>
            <Link
              to="/features"
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 transition-colors"
            >
              ৪. একাডেমিক বৈশিষ্ট্য ও সুবিধা
            </Link>
          </div>
        </div>

        {/* Principal Message Card */}
        <div className="bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 rounded-3xl border-2 border-emerald-600/30 p-6 sm:p-9 lg:p-11 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="shrink-0 text-center">
              {principalPhoto ? (
                <img
                  src={principalPhoto}
                  alt={principalName}
                  className="w-40 h-48 sm:w-48 sm:h-56 rounded-2xl object-cover border-4 border-emerald-600/40 shadow-lg mx-auto"
                />
              ) : (
                <div className="w-40 h-48 sm:w-48 sm:h-56 rounded-2xl bg-emerald-100 border-4 border-emerald-300 flex flex-col items-center justify-center text-emerald-800 shadow-md mx-auto">
                  <GraduationCap className="w-20 h-20 text-emerald-700" />
                  <span className="text-xs font-bold mt-2 text-emerald-900">সম্মানিত প্রধান</span>
                </div>
              )}
              <div className="mt-3 inline-block bg-emerald-800 text-white text-xs px-3.5 py-1 rounded-full font-bold shadow-2xs">
                {principalTitle}
              </div>
            </div>

            <div className="space-y-4 text-center md:text-left flex-1">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                  {principalName}
                </h2>
                <div className="text-xs sm:text-sm text-slate-500 font-medium mt-1 flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <span>{instName}</span>
                  <span>•</span>
                  <span>{address}</span>
                </div>
              </div>

              <div className="text-slate-700 text-sm sm:text-base leading-relaxed bg-white/90 p-5 sm:p-6 rounded-2xl border border-emerald-100 shadow-xs relative">
                <span className="text-3xl font-serif text-emerald-600 leading-none mr-1">“</span>
                <span className="whitespace-pre-line italic text-justify leading-relaxed">
                  {principalMessage}
                </span>
                <span className="text-3xl font-serif text-emerald-600 leading-none ml-1">”</span>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-100/70 px-3 py-1 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" /> সার্বিক পরিচালনা ও পৃষ্ঠপোষকতা
                </span>
                <a href={`tel:${phone}`} className="flex items-center gap-1 hover:text-emerald-700">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> {phone}
                </a>
                <a href={`mailto:${email}`} className="flex items-center gap-1 hover:text-emerald-700">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" /> {email}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Distinct Admin Message (if configured) */}
        {hasDistinctAdmin && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {adminPhoto && (
                <img
                  src={adminPhoto}
                  alt={adminName}
                  className="w-32 h-36 rounded-2xl object-cover border-2 border-slate-200 shrink-0"
                />
              )}
              <div className="space-y-3 flex-1 text-center md:text-left">
                <div className="inline-block bg-slate-800 text-white text-xs px-3 py-1 rounded-full font-bold">
                  {adminTitle}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{adminName}</h3>
                {adminMessage && (
                  <p className="text-slate-600 text-sm sm:text-base leading-relaxed italic bg-slate-50 p-4 rounded-xl">
                    “{adminMessage}”
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Governance & Committees Section */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 sm:p-9 space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
              মাদরাসা পরিচালনা ও উপদেষ্টা পরিষদ
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm mt-1">
              দ্বীনি মুরব্বি, শিক্ষাবিদ ও সমাজসেবকদের সার্বিক পরামর্শ ও তত্ত্বাবধানে প্রতিষ্ঠান পরিচালিত হয়
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-4">
                <Award className="w-5 h-5 text-emerald-700" />
              </div>
              <h4 className="font-bold text-slate-900 text-base mb-1">উপদেষ্টা পরিষদ</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                প্রবীণ উলামায়ে কেরাম ও দ্বীনদরদী ব্যক্তিবর্গের সার্বিক পরামর্শে দ্বীনি মান সমুন্নত রাখা হয়।
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <h4 className="font-bold text-slate-900 text-base mb-1">নির্বাহী কমিটি</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                প্রশাসনিক সিদ্ধান্ত, অবকাঠামো উন্নয়ন, আর্থিক স্বচ্ছতা ও হোস্টেল ব্যবস্থাপনার তদারকি।
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-4">
                <HeartHandshake className="w-5 h-5 text-emerald-700" />
              </div>
              <h4 className="font-bold text-slate-900 text-base mb-1">শিক্ষা ও পরীক্ষা বিভাগ</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                দক্ষ মুহতামিম ও শিক্ষক মণ্ডলীর পরিচালনায় প্রতিদিনের সবক, তিলাওয়াত ও পরীক্ষার মাননিয়ন্ত্রণ।
              </p>
            </div>
          </div>

          {/* Active Committees List from DB if any */}
          {committees.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <div className="font-bold text-slate-800 text-sm mb-3">অনুমোদিত কমিটিসমূহ:</div>
              <div className="flex flex-wrap gap-2">
                {committees.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{c.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA Footer Section */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-850 to-teal-950 text-white rounded-2xl p-7 sm:p-9 text-center space-y-4 shadow-md border-b-4 border-amber-500">
          <h3 className="text-xl sm:text-2xl font-bold text-amber-200">
            পরিচালনা পরিষদ বা দপ্তরের সাথে সরাসরি যোগাযোগ করতে চান?
          </h3>
          <p className="text-emerald-100 text-xs sm:text-sm max-w-xl mx-auto">
            যেকোনো তথ্য, পরামর্শ অথবা সাক্ষাতের জন্য আমাদের দপ্তরে সরাসরি অথবা ফোনে যোগাযোগ করুন।
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              to="/contact"
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>দপ্তর যোগাযোগ ফরম</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href={`tel:${phone}`}
              className="bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-2.5 rounded-xl text-sm border border-white/20 transition-all flex items-center gap-1.5"
            >
              <Phone className="w-4 h-4 text-emerald-300" />
              <span>সরাসরি কল করুন ({phone})</span>
            </a>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default ManagementPage;
