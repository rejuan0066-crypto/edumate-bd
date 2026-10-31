import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Award, CreditCard, HeartHandshake, Medal, Users, GraduationCap, CalendarDays } from 'lucide-react';

interface HomePortalsAndStatsProps {
  settings: any;
  bn?: boolean;
}

export const HomePortalsAndStats: React.FC<HomePortalsAndStatsProps> = ({ settings, bn = true }) => {
  const studentCount = settings?.stat_students || (bn ? '৩৫০+' : '350+');
  const teacherCount = settings?.stat_teachers || (bn ? '২৫ জন' : '25');
  const yearsCount = settings?.stat_years || (bn ? '১৮ বছর' : '18 Years');
  const hafezCount = bn ? '১০০+' : '100+';

  const portals = [
    {
      title: bn ? 'অনলাইন ভর্তি ফরম' : 'Online Admission',
      desc: bn ? 'সরাসরি আবেদন করুন' : 'Apply Online',
      to: '/admission',
      icon: FileText,
      color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    {
      title: bn ? 'ফলাফল অনুসন্ধান' : 'Find Exam Results',
      desc: bn ? 'রোল ও সেশন ভিত্তিক' : 'By Roll & Session',
      to: '/results',
      icon: Award,
      color: 'text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    },
    {
      title: bn ? 'অনলাইন বেতন ফি' : 'Pay Fees Online',
      desc: bn ? 'নিরাপদ ডিজিটাল পেমেন্ট' : 'Secure Digital Pay',
      to: '/fees',
      icon: CreditCard,
      color: 'text-purple-700 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    },
    {
      title: bn ? 'দান ও লিল্লাহ ফান্ড' : 'Donation & Lillah',
      desc: bn ? 'সদকা ও যাকাত প্রদান' : 'Sadaqah & Zakat',
      to: '/donation',
      icon: HeartHandshake,
      color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
  ];

  return (
    <section className="py-6 sm:py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Online Portals Box */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
                <h4 className="text-base sm:text-lg font-bold font-display text-emerald-950 dark:text-emerald-300">
                  {bn ? 'অনলাইন প্রাতিষ্ঠানিক সেবা ও স্বয়ংক্রিয় পোর্টাল' : 'Online Institutional Self-Service Portals'}
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {portals.map((p, idx) => {
                  const Icon = p.icon;
                  return (
                    <Link
                      key={idx}
                      to={p.to}
                      className="group flex flex-col items-center justify-center p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-card hover:border-primary/50 hover:shadow-md transition text-center"
                    >
                      <div className={`w-11 h-11 rounded-lg flex items-center justify-center mb-2.5 border ${p.color} transition-transform group-hover:scale-105`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {p.title}
                      </span>
                      <span className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block">
                        {p.desc}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Institutional Stats Box */}
          <div className="lg:col-span-5 rounded-xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white p-5 sm:p-6 shadow-md flex flex-col justify-between">
            <div className="flex items-center gap-2 pb-3 border-b border-white/20">
              <Medal className="w-5 h-5 text-amber-300" />
              <h4 className="text-base sm:text-lg font-bold font-display text-white">
                {bn ? 'প্রাতিষ্ঠানিক পরিসংখ্যান ও ঐতিহ্য' : 'Institutional Statistics & Heritage'}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-4 my-auto py-3">
              {/* Stat 1 */}
              <div className="border-l-2 border-amber-400 pl-3">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-200">
                  {studentCount}
                </div>
                <div className="text-xs text-emerald-100 flex items-center gap-1 mt-0.5">
                  <Users className="w-3.5 h-3.5" />
                  {bn ? 'বর্তমান শিক্ষার্থী' : 'Current Students'}
                </div>
              </div>

              {/* Stat 2 */}
              <div className="border-l-2 border-amber-400 pl-3">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-200">
                  {teacherCount}
                </div>
                <div className="text-xs text-emerald-100 flex items-center gap-1 mt-0.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {bn ? 'অনুমোদিত শিক্ষক' : 'Certified Teachers'}
                </div>
              </div>

              {/* Stat 3 */}
              <div className="border-l-2 border-amber-400 pl-3">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-200">
                  {hafezCount}
                </div>
                <div className="text-xs text-emerald-100 flex items-center gap-1 mt-0.5">
                  <Award className="w-3.5 h-3.5" />
                  {bn ? 'হিফজ সমাপনী হাফেজ' : 'Completed Hafez'}
                </div>
              </div>

              {/* Stat 4 */}
              <div className="border-l-2 border-amber-400 pl-3">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-200">
                  {yearsCount}
                </div>
                <div className="text-xs text-emerald-100 flex items-center gap-1 mt-0.5">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {bn ? 'ধারাবাহিক ঐতিহ্য' : 'Years of Heritage'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomePortalsAndStats;
