import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Bell } from 'lucide-react';

const notices = [
  { title: 'বার্ষিক পরীক্ষার সময়সূচী প্রকাশিত হয়েছে', date: '২০২৬-০৩-২০', status: 'approved' },
  { title: 'রমজান মাসের বিশেষ ক্লাসের সময়সূচী', date: '২০২৬-০৩-১৫', status: 'approved' },
  { title: 'নতুন শিক্ষাবর্ষের ভর্তি চলছে', date: '২০২৬-০৩-১০', status: 'approved' },
  { title: 'হিফয বিভাগে বিশেষ প্রোগ্রাম', date: '২০২৬-০৩-০৫', status: 'approved' },
  { title: 'বার্ষিক পুরস্কার বিতরণী অনুষ্ঠান', date: '২০২৬-০২-২৫', status: 'approved' },
];

const NoticePage = () => {
  const { language } = useLanguage();
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8 flex items-center gap-3">
          <Bell className="w-8 h-8 text-accent" />
          {language === 'bn' ? 'নোটিশ বোর্ড' : 'Notice Board'}
        </h1>
        <div className="space-y-4">
          {notices.map((n, i) => (
            <div key={i} className="card-elevated p-5 hover:border-primary transition-colors cursor-pointer">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">{n.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{n.date}</p>
                </div>
                <span className="shrink-0 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                  {language === 'bn' ? 'প্রকাশিত' : 'Published'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
};

export default NoticePage;
