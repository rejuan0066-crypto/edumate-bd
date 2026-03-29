import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, ArrowRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  notices: any[];
  language: string;
  t: (key: string) => string;
}

const HomeNoticesSection = ({ notices, language, t }: Props) => {
  const bn = language === 'bn';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-display font-bold text-foreground flex items-center gap-2">
          <span className="w-1 h-5 bg-accent rounded-full" />
          {t('latestNotice')}
        </h2>
        <Link to="/notices" className="text-xs text-primary hover:underline flex items-center gap-1">
          {t('viewAll')} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Scrollable Notice List */}
      <div className="card-elevated overflow-hidden">
        <div className="bg-primary/5 border-b px-4 py-2.5 flex items-center gap-2">
          <Bell className="w-4 h-4 text-accent animate-pulse" />
          <span className="text-xs font-semibold text-foreground">
            {bn ? 'নোটিশ বোর্ড' : 'Notice Board'}
          </span>
        </div>
        <ScrollArea className="h-[520px]">
          <div className="divide-y divide-border">
            {notices.length > 0 ? notices.map((n, idx) => (
              <Link
                key={n.id}
                to="/notices"
                className="flex items-start gap-3 p-3.5 hover:bg-secondary/50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-primary">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {bn ? (n.title_bn || n.title) : n.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-muted-foreground/70">
                    <Calendar className="w-3 h-3" />
                    {n.published_at ? format(new Date(n.published_at), 'dd/MM/yyyy') : ''}
                  </div>
                </div>
              </Link>
            )) : (
              <div className="text-center py-16 text-muted-foreground">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{bn ? 'কোনো নোটিশ নেই' : 'No notices'}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default HomeNoticesSection;
