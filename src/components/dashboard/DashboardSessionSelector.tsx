import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboardSession } from '@/contexts/DashboardSessionContext';
import { CalendarDays, Sparkles } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const DashboardSessionSelector = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { sessions, selectedSessionId, setSelectedSessionId, selectedSession, isLoading } = useDashboardSession();

  if (isLoading || sessions.length === 0) return null;

  return (
    <div
      className="relative overflow-hidden rounded-[28px] border border-emerald-200/40 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50/80 via-white/60 to-teal-50/80 dark:from-emerald-950/40 dark:via-card/60 dark:to-teal-950/40 backdrop-blur-xl p-4 sm:p-5"
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-teal-300/20 blur-3xl" />

      <div className="relative flex items-center gap-3 sm:gap-4">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
          <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {bn ? 'একাডেমিক সেশন' : 'Academic Session'}
            </p>
            {selectedSession?.is_active && (
              <Sparkles className="w-3 h-3 text-amber-500" />
            )}
          </div>
          <Select value={selectedSessionId || ''} onValueChange={(v) => setSelectedSessionId(v)}>
            <SelectTrigger className="h-9 w-full border-0 bg-white/70 dark:bg-card/70 backdrop-blur rounded-xl px-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-emerald-500/40">
              <SelectValue placeholder={bn ? 'সেশন বাছুন' : 'Select session'} />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {sessions.map(s => (
                <SelectItem key={s.id} value={s.id} className="rounded-lg my-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{bn ? (s.name_bn || s.name) : s.name}</span>
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
      </div>
    </div>
  );
};

export default DashboardSessionSelector;
