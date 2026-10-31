import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Award, Clock, UserCheck, Users, GraduationCap, X, CheckCircle2, ArrowRight, ShieldCheck, HeartHandshake } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeptData {
  key: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  title: string;
  sub: string;
  summary: string;
  duration: string;
  age: string;
  seats: string;
  head: string;
  syllabus: string[];
  outcome: string;
}

const DEPARTMENTS: Record<string, DeptData> = {
  noorani: {
    key: 'noorani',
    badge: 'শিশু ও প্রাথমিক',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    badgeColor: '#047857',
    title: '১. নূরানী ও কিন্ডারগার্টেন বিভাগ',
    sub: 'শিশু ও বুনিয়াদি দ্বীনি শিক্ষা কাঠামো',
    summary: 'সহীহ মাখরাজ ও তাজবীদের সাথে কুরআন শিক্ষা, প্রয়োজনীয় মাসনুন দোয়া, বাংলা, ইংরেজি, গণিত ও ক্যালিগ্রাফি প্রশিক্ষণ।',
    duration: '৩ বছর মেয়াদি (প্লে, নার্সারি ও প্রথম শ্রেণি)',
    age: '৪ থেকে ৭ বছর বয়সী শিশু',
    seats: '৬০ জন (আবাসিক ও অনাবাসিক)',
    head: 'মাওলানা মোহাম্মদ আবুল বশর (বিভাগীয় প্রধান)',
    syllabus: [
      'বিশুদ্ধ মাখরাজ ও তাজবীদের সাথে আরবি হরফ ও কুরআন তিলাওয়াত।',
      'আমপারা হিফজ ও দৈনন্দিন মাসনুন দোয়া ও জরুরি মাসআলা শিক্ষা।',
      'বাংলা ও ইংরেজি ব্যাকরণ, রিডিং ও সুন্দর ক্যালিগ্রাফি হস্তলিপি প্রশিক্ষণ।',
      'প্রাথমিক গণিত, ড্রয়িং ও আদব-আখলাক শিষ্টাচার শিক্ষা।'
    ],
    outcome: 'নূরানী সমাপনী পরীক্ষা শেষে কেন্দ্রীয় সনদ প্রদান করা হয় এবং শিক্ষার্থী সরাসরি নাজেরা ও হিফজ শাখায় ভর্তির পূর্ণ যোগ্যতা অর্জন করে।'
  },
  nazera: {
    key: 'nazera',
    badge: 'হিফজ প্রস্তুতিমূলক',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    badgeColor: '#b45309',
    title: '২. নাজেরা কুরআনুল কারীম বিভাগ',
    sub: 'হিফজুল কুরআনের পূর্বপ্রস্তুতি পর্ব',
    summary: 'দ্রুত ও নির্ভুল দেখে পড়ার যোগ্যতা অর্জন, সুমধুর কণ্ঠে মাশক এবং আন্তর্জাতিক মানের হিফজের নিবিড় প্রস্তুতি পর্ব।',
    duration: '১ বছর মেয়াদি',
    age: 'নূরানী কোর্স সমাপ্তকারী অথবা দেখে পড়তে সক্ষম শিক্ষার্থী',
    seats: '৪০ জন (শতভাগ আবাসিক)',
    head: 'হাফেজ ক্বারী ফয়জুল ইসলাম',
    syllabus: [
      'সম্পূর্ণ ৩০ পারা কুরআন দ্রুত, নির্ভুল ও স্পষ্টভাবে দেখে পড়ার নিরবচ্ছিন্ন মাশক।',
      'তাজবীদের সূক্ষ্ম নিয়মাবলি (ইখফা, ইদগাম, কলকলা, মদ) প্রয়োগসহ তিলাওয়াত।',
      'নামাজের শেষ ১০টি সূরা ও গুরুত্বপূর্ণ মাসনুন দোয়া মুখস্থকরণ।',
      'হিফজ শুরু করার মানসিক ও শারীরিক প্রস্তুতি গঠন।'
    ],
    outcome: 'নাজেরা সমাপ্তির পর মূল্যায়ন পরীক্ষা নিয়ে মেধার ভিত্তিতে মূল হিফজ বিভাগে উত্তীর্ণ করা হয়।'
  },
  hifz: {
    key: 'hifz',
    badge: 'বিশেষায়িত ও আবাসিক',
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    badgeColor: '#1d4ed8',
    title: '৩. হিফজুল কুরআনুল কারীম বিভাগ',
    sub: 'আন্তর্জাতিক মানের হিফজ ও তাজবীদ প্রশিক্ষণ',
    summary: 'অভিজ্ঞ হাফেজগণের নিবিড় তত্ত্বাবধানে ৩ বছরে সম্পূর্ণ কুরআন হিফজ ও নিয়মিত কেন্দ্রীয় দৌর (আমোক্তা)।',
    duration: '২ থেকে ৩ বছর (মেধা অনুযায়ী)',
    age: 'নাজেরা পরীক্ষায় উত্তীর্ণ এবং ন্যূনতম ৮ বছর বয়স',
    seats: '৮০ জন (সম্পূর্ণ আবাসিক নিবিড় তদারকি)',
    head: 'হাফেজ ক্বারী আরিফুল ইসলাম (হিফজ প্রধান)',
    syllabus: [
      'প্রতিদিন নতুন ছবক মুখস্থ প্রদান (১ থেকে ২ পৃষ্ঠা)।',
      'সাত ছবক (চলতি পারার পেছনের পড়া নিয়মিত দোর)।',
      'আমোক্তা (পূর্ববর্তী হিফজকৃত সম্পূর্ণ পারাসমূহের সার্বক্ষণিক পুনরাবৃত্তি)।',
      'হুসনে সওত (মধুর সুরে তিলাওয়াত) ও আন্তর্জাতিক প্রতিযোগিতার বিশেষ প্রস্তুতি।'
    ],
    outcome: 'সম্পূর্ণ ৩০ পারা হিফজ সমাপ্তে ঐতিহ্যবাহী সমাপনী দস্তরবন্দী পাগড়ি ও আনুষ্ঠানিক সনদ প্রদান করা হয়।'
  },
  kitab: {
    key: 'kitab',
    badge: 'উচ্চতর শরিয়াহ',
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
    badgeColor: '#7e22ce',
    title: '৪. কিতাব ও আরবি ভাষা বিভাগ',
    sub: 'উচ্চতর ইসলামিক শরিয়াহ স্টাডিজ',
    summary: 'আরবি ব্যাকরণ (নাহু-ছরফ), তরজমায়ে কুরআন, হাদিস শরিফ ও ফিকহের মৌলিক কিতাবাদি অধ্যয়নের সুশৃঙ্খল পাঠদান।',
    duration: 'পর্যায়ক্রমিক ক্লাস ভিত্তিক',
    age: 'হিফজ সমাপ্তকারী অথবা নূরানী-নাজেরা পাস ছাত্র',
    seats: '৫০ জন (আবাসিক ও অনাবাসিক)',
    head: 'মাওলানা সাইদুর রহমান (সিনিয়র মুহাদ্দিস)',
    syllabus: [
      'আরবি ব্যাকরণ: মিযান, মুনশাইব, নাহবেমীর ও ছরফ শাস্ত্রের মূল গ্রন্থসমূহ।',
      'তরজমা ও তাফসীর: নির্বাচিত অংশের বিশুদ্ধ তরজমা ও শব্দার্থ।',
      'ফিকহ ও আকাইদ: দৈনন্দিন জীবনের হালাল-হারাম ও শরিয়াহ বিধানাবলী।',
      'আরবি কথোপকথন ও রচনা লেখার মৌলিক প্রশিক্ষণ।'
    ],
    outcome: 'উচ্চতর জামাত ও কওমি মাদরাসা শিক্ষাবোর্ড (বেফাক)-এর কেন্দ্রীয় সমাপনী পরীক্ষায় অংশগ্রহণের সুযোগ।'
  }
};

export const HomeAcademicDepartments = ({ bn = true }: { bn?: boolean }) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const activeDept = selectedKey ? DEPARTMENTS[selectedKey] : null;

  return (
    <section className="py-8 bg-card border-y border-border/60">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 mb-6 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
              <GraduationCap className="w-4 h-4" />
              <span>{bn ? 'একাডেমিক কাঠামো' : 'Academic Curriculum'}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight">
              {bn ? 'মাদরাসার শিক্ষা বিভাগসমূহ (ক্লিক করে বিস্তারিত দেখুন)' : 'Academic Departments (Click to View Details)'}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {bn ? 'কোর্স বিবরণ, আসন সংখ্যা ও ভর্তি যোগ্যতা' : 'Courses, seats & admission criteria'}
          </p>
        </div>

        {/* 4 Interactive Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(DEPARTMENTS).map((d) => (
            <div
              key={d.key}
              onClick={() => setSelectedKey(d.key)}
              className="bg-background rounded-xl p-5 border border-border/80 hover:border-primary/60 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-md border mb-3 ${d.badgeBg}`}>
                  {d.badge}
                </span>
                <h4 className="text-base sm:text-lg font-bold font-display text-foreground group-hover:text-primary transition-colors leading-snug mb-2">
                  {d.title}
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed mb-4">
                  {d.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs font-bold text-primary">
                <span>{bn ? 'বিস্তারিত ও সিলেবাস' : 'Details & Syllabus'}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Department Detail Dialog */}
      <Dialog open={!!activeDept} onOpenChange={(open) => !open && setSelectedKey(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
          {activeDept && (
            <div>
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 text-white p-6 rounded-t-2xl">
                <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded bg-white/20 text-white backdrop-blur-sm mb-2">
                  {activeDept.badge}
                </span>
                <DialogTitle className="text-xl sm:text-2xl font-bold font-display text-white">
                  {activeDept.title}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-emerald-100 mt-1">
                  {activeDept.sub}
                </DialogDescription>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* 4 Key Specs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 uppercase">
                      <Clock className="w-3.5 h-3.5" />
                      {bn ? 'কোর্স মেয়াদ' : 'Duration'}
                    </span>
                    <p className="font-bold text-sm text-foreground mt-1">{activeDept.duration}</p>
                  </div>
                  <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 uppercase">
                      <UserCheck className="w-3.5 h-3.5" />
                      {bn ? 'ভর্তি যোগ্যতা ও বয়স' : 'Eligibility & Age'}
                    </span>
                    <p className="font-bold text-sm text-foreground mt-1">{activeDept.age}</p>
                  </div>
                  <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 uppercase">
                      <Users className="w-3.5 h-3.5" />
                      {bn ? 'মোট আসন সংখ্যা' : 'Seats'}
                    </span>
                    <p className="font-bold text-sm text-foreground mt-1">{activeDept.seats}</p>
                  </div>
                  <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 uppercase">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {bn ? 'বিভাগীয় প্রধান' : 'Department Head'}
                    </span>
                    <p className="font-bold text-sm text-foreground mt-1">{activeDept.head}</p>
                  </div>
                </div>

                {/* Syllabus List */}
                <div className="border border-border/70 rounded-xl overflow-hidden">
                  <div className="bg-muted/60 px-4 py-2.5 text-xs font-bold text-foreground border-b border-border/70 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span>{bn ? 'প্রধান পাঠ্যসূচি ও সিলেবাস বিবরণ' : 'Key Syllabus & Curriculum'}</span>
                  </div>
                  <ul className="p-4 space-y-2 text-xs sm:text-sm text-foreground/85">
                    {activeDept.syllabus.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Outcome */}
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1">
                    <Award className="w-4 h-4" />
                    {bn ? 'সমাপনী সনদ ও পরবর্তী ধাপ' : 'Certification & Progression'}
                  </span>
                  <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
                    {activeDept.outcome}
                  </p>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="bg-muted/30 px-6 py-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-2xl">
                <span className="text-xs text-muted-foreground text-center sm:text-left">
                  {bn ? 'ভর্তি হেল্পলাইন: ০১৭৪৯-৮৪২৪০১' : 'Helpline: 01749-842401'}
                </span>
                <Link
                  to="/admission"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors shadow-xs"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>{bn ? 'এই বিভাগে অনলাইন আবেদন' : 'Apply Online'}</span>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default HomeAcademicDepartments;

