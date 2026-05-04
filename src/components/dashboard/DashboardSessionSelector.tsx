import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardSession } from '@/contexts/DashboardSessionContext';
import { CalendarDays } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const DashboardSessionSelector = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { sessions, selectedSessionId, setSelectedSessionId, isLoading } = useDashboardSession();

  if (isLoading || sessions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl px-3 py-2"
      style={{ boxShadow: 'var(--shadow-soft)' }}>
      <CalendarDays className="w-4 h-4 text-primary shrink-0" />
      <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
        {bn ? 'সেশন:' : 'Session:'}
      </span>
      <Select value={selectedSessionId || ''} onValueChange={(v) => setSelectedSessionId(v)}>
        <SelectTrigger className="h-8 min-w-[140px] border-0 bg-transparent text-sm font-bold text-foreground focus:ring-0">
          <SelectValue placeholder={bn ? 'সেশন বাছুন' : 'Select session'} />
        </SelectTrigger>
        <SelectContent>
          {sessions.map(s => (
            <SelectItem key={s.id} value={s.id}>
              <div className="flex items-center gap-2">
                <span>{bn ? (s.name_bn || s.name) : s.name}</span>
                {s.is_active && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold">
                    {bn ? 'সক্রিয়' : 'Active'}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DashboardSessionSelector;
