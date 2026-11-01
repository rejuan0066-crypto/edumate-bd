import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardSession } from '@/contexts/DashboardSessionContext';
import { CalendarDays } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const DashboardSessionSelector = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { sessions, selectedSessionId, setSelectedSessionId, selectedSession, isLoading } = useDashboardSession();

  if (isLoading || sessions.length === 0) return null;

  return (
    <div className="card-elevated p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center ring-1 ring-emerald-600/20 shrink-0">
          <CalendarDays className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
              {bn ? 'একাডেমিক সেশন' : 'Academic Session'}
            </span>
            {selectedSession?.is_active && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold">
                {bn ? 'সক্রিয়' : 'Active'}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {bn ? 'সেশন অনুযায়ী ড্যাশবোর্ডের পরিসংখ্যান ফিল্টার করুন' : 'Filter statistics by academic session'}
          </p>
        </div>
      </div>
      <div className="w-full sm:w-64">
        <Select value={selectedSessionId || ''} onValueChange={(v) => setSelectedSessionId(v)}>
          <SelectTrigger className="h-9 w-full rounded-xl border border-border bg-background text-xs sm:text-sm font-semibold">
            <SelectValue placeholder={bn ? 'সেশন বাছুন' : 'Select session'} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {sessions.map(s => (
              <SelectItem key={s.id} value={s.id} className="rounded-lg my-0.5">
                <span className="font-semibold">{bn ? (s.name_bn || s.name) : s.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default DashboardSessionSelector;
