import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, ArrowRight, Calendar, FileText, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  notices: any[];
  language: string;
  t: (key: string) => string;
}

const HomeNoticesSection = ({ notices, language, t }: Props) => {
  const bn = language === 'bn';

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden h-full flex flex-col">
      {/* Official Desk Header */}
      <div className="bg-slate-100 dark:bg-slate-900 border-b-2 border-primary px-4 py-3 sm:py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            <Bell className="w-4 h-4" />
          </div>
          <span className="text-sm sm:text-base font-bold text-primary font-display tracking-tight">
            {bn ? 'দাপ্তরিক নোটিশ ও সার্কুলার ডেস্ক' : 'Official Notice & Circular Desk'}
          </span>
        </div>
        <Link
          to="/notices"
          className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
        >
          {t('viewAll')} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Marquee ticker strip */}
      <div className="bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 border-b border-amber-200/60 dark:border-amber-900/40 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap text-xs text-amber-900 dark:text-amber-200 font-medium">
          {bn
            ? '📢 বিশেষ বিজ্ঞপ্তি: নতুন শিক্ষাবর্ষে নূরানী, নাজেরা ও হিফজ শাখায় সীমিত আসনে ভর্তি কার্যক্রম চলমান।'
            : '📢 Circular: Admission is open for Noorani, Nazera & Hifz departments with limited seats.'}
        </div>
      </div>

      {/* Tabular Notice List */}
      <ScrollArea className="flex-1 min-h-[300px] max-h-[390px]">
        <div className="divide-y divide-border">
          {notices.length > 0 ? (
            notices.map((n) => {
              const dateStr = n.published_at
                ? format(new Date(n.published_at), 'dd/MM/yyyy')
                : '';
              const title = bn ? n.title_bn || n.title : n.title;

              return (
                <Link
                  key={n.id}
                  to="/notices"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group"
                >
                  {/* Date Column */}
                  <div className="shrink-0 text-center font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                    {dateStr}
                  </div>

                  {/* Title */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {title}
                    </p>
                  </div>

                  {/* Icon */}
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">{bn ? 'কোনো নোটিশ পাওয়া যায়নি' : 'No notices available'}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Action */}
      <div className="p-3 bg-muted/20 border-t border-border">
        <Link
          to="/notices"
          className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-primary text-primary-foreground rounded-lg text-center text-xs sm:text-sm font-bold hover:bg-primary/90 transition shadow-sm"
        >
          <FileText className="w-4 h-4" />
          {bn ? 'দাপ্তরিক নোটিশ আর্কাইভ দেখুন' : 'View Notice Archive'}
        </Link>
      </div>
    </div>
  );
};

export default HomeNoticesSection;
