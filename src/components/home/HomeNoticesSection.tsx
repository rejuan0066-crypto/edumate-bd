import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, ArrowRight, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  notices: any[];
  language: string;
  t: (key: string) => string;
}

const HomeNoticesSection = ({ notices, language, t }: Props) => {
  const bn = language === 'bn';

  return (
    <div className="card-elevated overflow-hidden h-full flex flex-col">
      <div className="bg-primary px-4 py-3 sm:py-3.5 flex items-center justify-between">
        <span className="text-base sm:text-lg font-bold text-primary-foreground font-display flex items-center gap-2 tracking-wide">
          <MapPin className="w-5 h-5" />
          {bn ? 'নোটিশ বোর্ড' : 'Notice Board'}
        </span>
        <Link to="/notices" className="text-xs sm:text-sm text-primary-foreground/90 hover:text-white font-medium flex items-center gap-1">
          {t('viewAll')} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Marquee announcement */}
      <div className="bg-accent/20 px-4 py-2.5 border-b overflow-hidden">
        <div className="animate-marquee whitespace-nowrap text-sm text-foreground font-semibold">
          {bn ? 'দিন নির্ধারিত হয়েছে | আগামী মাদ্রাসা বন্ধ | ' : 'Date confirmed | Upcoming holiday | '}
          {bn ? 'শিক্ষা সফরের দিন নির্ধারিত হয়েছে' : 'Tour date has been set'}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-[280px] max-h-[380px]">
        <div className="divide-y divide-border">
          {notices.length > 0 ? notices.map((n, idx) => (
            <Link
              key={n.id}
              to="/notices"
              className="flex items-start gap-3.5 px-4 py-3.5 hover:bg-primary/5 transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                  {bn ? (n.title_bn || n.title) : n.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  {n.published_at ? format(new Date(n.published_at), 'dd/MM/yyyy') : ''}
                </div>
              </div>
            </Link>
          )) : (
            <div className="text-center py-14 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-base font-medium">{bn ? 'কোনো নোটিশ নেই' : 'No notices'}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* See all notice button */}
      <div className="p-3.5 border-t">
        <Link
          to="/notices"
          className="block w-full py-3 bg-primary text-primary-foreground rounded-xl text-center text-base font-bold hover:bg-primary/90 transition-colors shadow-sm"
        >
          📋 {bn ? 'সকল নোটিশ দেখুন' : 'See all notice'}
        </Link>
      </div>
    </div>
  );
};

export default HomeNoticesSection;
