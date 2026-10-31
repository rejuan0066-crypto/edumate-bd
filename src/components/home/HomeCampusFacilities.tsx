import { Shield, Utensils, BookOpen, Building2, HeartPulse, Award } from 'lucide-react';

interface Props {
  bn?: boolean;
}

export const HomeCampusFacilities = ({ bn = true }: Props) => {
  const facilities = [
    {
      icon: Shield,
      title: bn ? 'সিসিটিভি নিয়ন্ত্রিত নিরাপত্তা' : 'CCTV Controlled Security',
      desc: bn ? 'সম্পূর্ণ ক্যাম্পাস ও আবাসিক হল ২৪ ঘণ্টা সিসিটিভি ক্যামেরায় সার্বক্ষণিক পর্যবেক্ষণে থাকে।' : '24/7 CCTV surveillance across campus and residential halls.'
    },
    {
      icon: Utensils,
      title: bn ? 'স্বাস্থ্যসম্মত পুষ্টিকর খাবার' : 'Nutritious & Hygienic Meals',
      desc: bn ? 'হোস্টেল শিক্ষার্থীদের জন্য পরিষ্কার-পরিচ্ছন্ন পরিবেশে পুষ্টিসম্মত খাবার তালিকা অনুযায়ী পরিবেশন।' : 'Clean dining with balanced hygienic meals for residential students.'
    },
    {
      icon: BookOpen,
      title: bn ? 'সমৃদ্ধ কিতাবখানা (লাইব্রেরি)' : 'Enriched Islamic Library',
      desc: bn ? 'তাফসীর, হাদিস, ফিকহ ও আরবি ভাষার সহায়ক ইসলামিক কিতাবের এক বিশাল সংগ্রহশালা।' : 'Vast collection of Tafsir, Hadith, Fiqh and classical Arabic references.'
    },
    {
      icon: Building2,
      title: bn ? 'কেন্দ্রীয় জামে মসজিদ' : 'Central Jam-e Mosque',
      desc: bn ? 'প্রতিদিন পাঁচ ওয়াক্ত জামাতে নামাজ আদায় ও শিক্ষার্থীদের আমলি তরবিয়তের সুপরিসর মসজিদ।' : 'Spacious campus mosque for daily 5-times prayers and spiritual upbringing.'
    },
    {
      icon: HeartPulse,
      title: bn ? 'স্বাস্থ্যসেবা ও প্রাথমিক চিকিৎসা' : 'Medical & First Aid Care',
      desc: bn ? 'অসুস্থ শিক্ষার্থীদের জন্য সার্বক্ষণিক প্রাথমিক চিকিৎসা ও প্রয়োজনে দ্রুত বিশেষজ্ঞ ডাক্তার সেবা।' : 'Prompt medical care and doctor consultation for student wellness.'
    },
    {
      icon: Award,
      title: bn ? 'পাগড়ি প্রদান ও সমাপনী সনদ' : 'Graduation Sanad & Turban',
      desc: bn ? 'হিফজ সমাপনীতে কেন্দ্রীয় বেফাকুল মাদারিসের সনদ ও ঐতিহ্যবাহী পাগড়ি প্রদান সম্মাননা।' : 'Prestigious graduation ceremony with formal degree and honor.'
    }
  ];

  return (
    <section className="py-8 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="pb-3 mb-6 border-b border-border/60">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>{bn ? 'ক্যাম্পাস পরিবেশ' : 'Campus Infrastructure'}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight">
            {bn ? 'ক্যাম্পাস অবকাঠামো ও পরিবেশগত সুবিধাসমূহ' : 'Campus Facilities & Environment'}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {bn ? 'শিক্ষার্থীদের সার্বিক নিরাপত্তা, সুস্থতা ও আমলি তরবিয়তের আদর্শ পরিবেশ' : 'Ensuring safety, wellness and moral guidance'}
          </p>
        </div>

        {/* 6 Grid Facilities */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map((f, i) => (
            <div key={i} className="bg-card p-4 sm:p-5 rounded-xl border border-border/70 hover:border-primary/50 hover:shadow-xs transition-all flex gap-3.5 items-start">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-foreground leading-snug mb-1">
                  {f.title}
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeCampusFacilities;

