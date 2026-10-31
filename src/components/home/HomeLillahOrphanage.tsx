import React from 'react';
import { HeartHandshake, Landmark, Smartphone, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';

interface HomeLillahOrphanageProps {
  bn?: boolean;
}

export const HomeLillahOrphanage: React.FC<HomeLillahOrphanageProps> = ({ bn = true }) => {
  const { settings } = useWebsiteSettings();

  const isEnabled = Boolean(
    settings?.donation_bank_enabled &&
    (settings?.bank_account_number?.trim() || settings?.bank_mobile_banking?.trim())
  );

  if (!isEnabled) {
    return null;
  }

  const instName = settings?.institution_name || 'আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানা';
  const phone = settings?.phone || '';

  return (
    <section className="py-6 sm:py-8">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/90 via-amber-100/40 to-yellow-50/80 p-6 sm:p-8 shadow-sm">
          {/* Subtle decorative background glow */}
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-amber-200/30 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-56 h-56 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Col: Motivation & Description */}
            <div className="lg:col-span-7 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-200/70 border border-amber-300 text-amber-900 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                {bn ? 'সদকায়ে জারিয়া ও লিল্লাহ ফান্ড' : 'Sadaqah Jariyah & Lillah Fund'}
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-amber-950 font-display flex items-center gap-2">
                <HeartHandshake className="w-6 h-6 text-amber-700 shrink-0" />
                {bn
                  ? (settings?.donation_title_bn || 'এতিমখানা ও লিল্লাহ বোর্ডিং ফান্ডে সহযোগিতা করুন')
                  : (settings?.donation_title_en || 'Support Orphanage & Lillah Boarding Fund')}
              </h3>

              <p className="text-amber-900/90 text-sm sm:text-base leading-relaxed">
                {bn
                  ? (settings?.donation_desc_bn || 'অত্র মাদরাসার এতিমখানায় বহু পিতৃহীন ও অতিদরিদ্র শিশু সম্পূর্ণ বিনামূল্যে বাসস্থান, পুষ্টিকর খাবার ও ইলমে ওহীর শিক্ষা গ্রহণ করছে। আপনার যাকাত, ফিতরা ও সদকা দিয়ে এই মাসুম শিশুদের ভবিষ্যৎ গড়তে শরিক হোন।')
                  : (settings?.donation_desc_en || 'Many orphaned and underprivileged children are studying Quran and Islamic knowledge free of cost with lodging and nourishment. Join in building their future through your Zakat, Fitra, and Sadaqah.')}
              </p>

              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  to="/donation"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-700 text-white font-bold text-sm shadow hover:bg-amber-800 transition"
                >
                  {bn ? 'অনলাইনে দান করুন' : 'Donate Online'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/zakat-fitra"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-amber-300 text-amber-900 font-semibold text-sm hover:bg-amber-50 transition"
                >
                  {bn ? 'যাকাত হিসাব করুন' : 'Calculate Zakat'}
                </Link>
              </div>
            </div>

            {/* Right Col: Direct Bank & Mobile Banking Card */}
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-amber-300 bg-white/95 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-amber-100">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-amber-700">
                      {bn ? 'সরাসরি মাদরাসার ব্যাংক হিসাব' : 'Official Madrasah Bank Account'}
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {settings?.bank_account_name || instName}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-xs sm:text-sm">
                  {settings?.bank_account_number && (
                    <div className="flex items-baseline justify-between">
                      <span className="text-slate-500">{bn ? 'হিসাব নম্বর:' : 'Account No:'}</span>
                      <span className="font-mono font-bold text-emerald-800 text-sm tracking-wider">
                        {settings.bank_account_number}
                      </span>
                    </div>
                  )}
                  {settings?.bank_name && (
                    <div className="flex items-baseline justify-between text-xs text-slate-600">
                      <span>{bn ? 'ব্যাংক ও শাখা:' : 'Bank & Branch:'}</span>
                      <span className="font-medium text-slate-800 text-right">
                        {settings.bank_name}{settings?.bank_branch_name ? `, ${settings.bank_branch_name}` : ''}
                      </span>
                    </div>
                  )}
                  {settings?.bank_routing_number && (
                    <div className="flex items-baseline justify-between text-xs text-slate-600">
                      <span>{bn ? 'রাউটিং নং:' : 'Routing No:'}</span>
                      <span className="font-mono text-slate-700">{settings.bank_routing_number}</span>
                    </div>
                  )}
                </div>

                {(settings?.bank_mobile_banking || phone) && (
                  <div className="pt-2 border-t border-amber-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-rose-700">
                      <Smartphone className="w-4 h-4" />
                      <span>{bn ? 'মোবাইল ব্যাংকিং:' : 'Mobile Banking:'}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {settings?.bank_mobile_banking || phone}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeLillahOrphanage;
