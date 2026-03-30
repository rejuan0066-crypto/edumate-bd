import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrayerCalendarSettings } from '@/hooks/usePrayerCalendarSettings';
import { Calendar, Clock, Star, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

const toBanglaNum = (str: string) => String(str).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);
const toArabicNum = (str: string) => String(str).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);

const BANGLA_MONTHS_CAL = ['বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন', 'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'];
const BANGLA_DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const SHORT_DAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const SHORT_DAYS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];

const HIJRI_MONTHS_AR = ['مُحَرَّم', 'صَفَر', 'رَبِيع ٱلْأَوَّل', 'رَبِيع ٱلثَّانِي', 'جُمَادَىٰ ٱلْأُولَىٰ', 'جُمَادَىٰ ٱلثَّانِيَة', 'رَجَب', 'شَعْبَان', 'رَمَضَان', 'شَوَّال', 'ذُو ٱلْقَعْدَة', 'ذُو ٱلْحِجَّة'];
const HIJRI_MONTHS_BN = ['মুহাররম', 'সফর', 'রবিউল আউয়াল', 'রবিউস সানি', 'জুমাদাল উলা', 'জুমাদাল সানিয়া', 'রজব', 'শাবান', 'রমজান', 'শাওয়াল', 'জিলকদ', 'জিলহজ'];
const HIJRI_MONTHS_EN = ['Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani", 'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', 'Dhul Qi\'dah', 'Dhul Hijjah'];

function getHijriDate(date: Date, offset: number) {
  try {
    const adjusted = new Date(date);
    adjusted.setDate(adjusted.getDate() + offset);
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'numeric', year: 'numeric'
    });
    const parts = formatter.formatToParts(adjusted);
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '1447');
    return { day, month, year };
  } catch {
    return { day: 1, month: 0, year: 1447 };
  }
}

function getBanglaDate(date: Date) {
  const banglaYearOffset = date.getMonth() < 3 || (date.getMonth() === 3 && date.getDate() < 14) ? -594 : -593;
  const banglaYear = date.getFullYear() + banglaYearOffset;
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const banglaStart = 104;
  let banglaDayOfYear = dayOfYear - banglaStart;
  if (banglaDayOfYear < 0) banglaDayOfYear += 365;
  const monthDays = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30];
  let monthIdx = 0;
  let remaining = banglaDayOfYear;
  for (let i = 0; i < 12; i++) {
    if (remaining < monthDays[i]) { monthIdx = i; break; }
    remaining -= monthDays[i];
  }
  return { day: remaining + 1, month: BANGLA_MONTHS_CAL[monthIdx], monthIdx, year: banglaYear };
}

interface Holiday {
  date: string;
  nameBn: string;
  nameEn: string;
  type: string;
  approximate?: boolean;
}

const TYPE_COLORS: Record<string, { dot: string; label: string; labelBn: string }> = {
  islamic: { dot: 'bg-emerald-500', label: 'Islamic', labelBn: 'ইসলামিক' },
  government: { dot: 'bg-blue-500', label: 'Government', labelBn: 'সরকারি' },
  festival: { dot: 'bg-amber-500', label: 'Festival', labelBn: 'উৎসব' },
  other: { dot: 'bg-purple-500', label: 'Other', labelBn: 'অন্যান্য' },
};

function getHolidayMap(holidays: Holiday[]): Map<string, Holiday[]> {
  const map = new Map<string, Holiday[]>();
  holidays.forEach(h => {
    if (!map.has(h.date)) map.set(h.date, []);
    map.get(h.date)!.push(h);
  });
  return map;
}

const IslamicCalendarWidget = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { config } = usePrayerCalendarSettings();
  const [now, setNow] = useState(new Date());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [lastDate, setLastDate] = useState(new Date().getDate());

  useEffect(() => {
    const timer = setInterval(() => {
      const n = new Date();
      setNow(n);
      // Auto-navigate calendar when date changes (midnight)
      setLastDate(prev => {
        if (prev !== n.getDate()) {
          setViewMonth(n.getMonth());
          setViewYear(n.getFullYear());
          return n.getDate();
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch holidays from DB
  const { data: dbHolidays } = useQuery({
    queryKey: ['holidays-public', viewYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .eq('year', viewYear)
        .eq('is_active', true)
        .order('date');
      if (error) throw error;
      return (data || []).map(h => ({
        date: h.date,
        nameBn: h.name_bn,
        nameEn: h.name_en,
        type: h.type,
        approximate: h.approximate,
      })) as Holiday[];
    },
  });

  // Also fetch current year holidays for today check
  const { data: todayYearHolidays } = useQuery({
    queryKey: ['holidays-public', now.getFullYear()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .eq('year', now.getFullYear())
        .eq('is_active', true)
        .order('date');
      if (error) throw error;
      return (data || []).map(h => ({
        date: h.date,
        nameBn: h.name_bn,
        nameEn: h.name_en,
        type: h.type,
        approximate: h.approximate,
      })) as Holiday[];
    },
    enabled: viewYear !== now.getFullYear(),
  });

  const yearHolidays = dbHolidays || [];
  const currentYearHolidays = viewYear === now.getFullYear() ? yearHolidays : (todayYearHolidays || []);

  const hijriOffset = config.hijri_offset;
  const banglaDate = getBanglaDate(now);
  const hijriToday = getHijriDate(now, hijriOffset);
  const todayStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const holidayMap = useMemo(() => getHolidayMap(yearHolidays), [yearHolidays]);
  const todayHoliday = currentYearHolidays.find(h => h.date === todayStr);

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dayName = bn ? BANGLA_DAYS[now.getDay()] : EN_DAYS[now.getDay()];

  const viewStartDate = new Date(viewYear, viewMonth, 1);
  const viewEndDate = new Date(viewYear, viewMonth + 1, 0);
  const viewBanglaStart = getBanglaDate(viewStartDate);
  const viewBanglaEnd = getBanglaDate(viewEndDate);
  const viewHijriStart = getHijriDate(viewStartDate, hijriOffset);
  const viewHijriEnd = getHijriDate(viewEndDate, hijriOffset);

  const banglaMonthLabel = viewBanglaStart.month === viewBanglaEnd.month
    ? viewBanglaStart.month
    : `${viewBanglaStart.month} - ${viewBanglaEnd.month}`;

  const getHijriMonthName = (idx: number) => bn ? HIJRI_MONTHS_BN[idx] : HIJRI_MONTHS_EN[idx];
  const hijriMonthLabel = viewHijriStart.month === viewHijriEnd.month
    ? getHijriMonthName(viewHijriStart.month)
    : `${getHijriMonthName(viewHijriStart.month)} - ${getHijriMonthName(viewHijriEnd.month)}`;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const prevYear = () => setViewYear(y => y - 1);
  const nextYear = () => setViewYear(y => y + 1);
  const goToday = () => { setViewMonth(now.getMonth()); setViewYear(now.getFullYear()); };

  const monthHolidays = yearHolidays.filter(h => {
    const m = parseInt(h.date.split('-')[0]) - 1;
    return m === viewMonth;
  });

  if (!config.show_calendar) return null;

  return (
    <div className="card-elevated rounded-xl overflow-hidden">
      {/* Live Clock */}
      <div className="bg-gradient-to-r from-primary to-primary/80 p-3 text-primary-foreground text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider opacity-80">{dayName}</span>
        </div>
        <div className="text-2xl font-mono font-bold tracking-wider">
          {bn ? toBanglaNum(timeStr) : timeStr}
        </div>
      </div>

      {/* Combined Dates */}
      <div className="p-2.5 border-b border-border">
        <div className={`grid gap-1.5 ${config.show_bangla_date && config.show_hijri_date ? 'grid-cols-3' : config.show_bangla_date || config.show_hijri_date ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {/* Gregorian */}
          <div className="text-center p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <p className="text-[8px] text-muted-foreground mb-0.5">{bn ? 'ইংরেজি' : 'Gregorian'}</p>
            <p className="text-sm font-bold text-foreground">{bn ? toBanglaNum(String(now.getDate())) : now.getDate()}</p>
            <p className="text-[9px] text-muted-foreground">{bn ? BN_MONTHS[now.getMonth()] : EN_MONTHS[now.getMonth()]}</p>
            <p className="text-[8px] text-muted-foreground">{bn ? toBanglaNum(String(now.getFullYear())) : now.getFullYear()}</p>
          </div>
          {/* Bangla */}
          {config.show_bangla_date && (
            <div className="text-center p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/30">
              <p className="text-[8px] text-muted-foreground mb-0.5">{bn ? 'বাংলা' : 'Bengali'}</p>
              <p className="text-sm font-bold text-foreground">{bn ? toBanglaNum(String(banglaDate.day)) : banglaDate.day}</p>
              <p className="text-[9px] text-muted-foreground">{banglaDate.month}</p>
              <p className="text-[8px] text-muted-foreground">{bn ? toBanglaNum(String(banglaDate.year)) : banglaDate.year}</p>
            </div>
          )}
          {/* Hijri */}
          {config.show_hijri_date && (
            <div className="text-center p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <p className="text-[8px] text-muted-foreground mb-0.5" dir="ltr">{bn ? 'হিজরি' : 'Hijri'}</p>
              <p className="text-sm font-bold text-foreground">{bn ? toBanglaNum(String(hijriToday.day)) : hijriToday.day}</p>
              <p className="text-[9px] text-muted-foreground">{bn ? HIJRI_MONTHS_BN[hijriToday.month] : HIJRI_MONTHS_EN[hijriToday.month]}</p>
              <p className="text-[8px] text-muted-foreground">{bn ? toBanglaNum(String(hijriToday.year)) : hijriToday.year}</p>
            </div>
          )}
        </div>
      </div>

      {/* Today's Holiday */}
      {todayHoliday && (
        <div className="mx-3 mt-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-1.5">
            <Star className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-bold text-primary">
              {bn ? 'আজকের বিশেষ দিন' : "Today's Special"}
            </span>
          </div>
          <p className="text-xs font-semibold mt-0.5 text-primary">
            {bn ? todayHoliday.nameBn : todayHoliday.nameEn}
          </p>
        </div>
      )}

      {/* Full Calendar */}
      <div className="p-3">
        {/* Year Navigation */}
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <button onClick={prevYear} className="p-0.5 rounded hover:bg-muted/50 transition-colors">
            <ChevronsLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-xs font-bold text-foreground min-w-[40px] text-center">
            {bn ? toBanglaNum(String(viewYear)) : viewYear}
          </span>
          <button onClick={nextYear} className="p-0.5 rounded hover:bg-muted/50 transition-colors">
            <ChevronsRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-1">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-muted/50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={goToday} className="text-center leading-tight">
            <span className="text-xs font-bold text-foreground block">
              {bn ? BN_MONTHS[viewMonth] : EN_MONTHS[viewMonth]}
            </span>
            <span className="text-[8px] text-muted-foreground">
              {banglaMonthLabel} • {hijriMonthLabel}
            </span>
          </button>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-muted/50 transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {(bn ? SHORT_DAYS_BN : SHORT_DAYS_EN).map((d, i) => (
            <div key={i} className={`text-center text-[9px] font-semibold py-0.5 ${i === 5 ? 'text-primary' : 'text-muted-foreground'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const dateKey = `${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayHolidays = holidayMap.get(dateKey) || [];
            const isToday = day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
            const isFriday = new Date(viewYear, viewMonth, day).getDay() === 5;

            return (
              <div
                key={day}
                className={`relative flex flex-col items-center justify-center p-0.5 rounded-md min-h-[28px] transition-colors ${
                  isToday
                    ? 'bg-primary text-primary-foreground font-bold'
                    : dayHolidays.length > 0
                      ? 'bg-muted/60'
                      : ''
                } ${isFriday && !isToday ? 'text-primary' : ''}`}
                title={dayHolidays.map(h => bn ? h.nameBn : h.nameEn).join(', ')}
              >
                <span className={`text-[11px] leading-none ${isToday ? '' : 'text-foreground'}`}>
                  {bn ? toBanglaNum(String(day)) : day}
                </span>
                {dayHolidays.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayHolidays.map((h, idx) => (
                      <span
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-primary-foreground' : TYPE_COLORS[h.type]?.dot || 'bg-gray-400'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-2 mb-1">
          {['islamic', 'government', 'festival'].map(type => (
            <div key={type} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${TYPE_COLORS[type].dot}`} />
              <span className="text-[9px] text-muted-foreground">{bn ? TYPE_COLORS[type].labelBn : TYPE_COLORS[type].label}</span>
            </div>
          ))}
        </div>

        {/* No holidays warning */}
        {yearHolidays.length === 0 && (
          <div className="text-center py-2">
            <p className="text-[10px] text-muted-foreground">
              {bn ? `${toBanglaNum(String(viewYear))} সালের ছুটির তথ্য নেই` : `No holiday data for ${viewYear}`}
            </p>
          </div>
        )}

        {/* Month's Holiday List */}
        {monthHolidays.length > 0 && (
          <ScrollArea className="h-[100px] mt-1">
            <div className="space-y-0.5 pr-2">
              {monthHolidays.map((h, i) => {
                const day = parseInt(h.date.split('-')[1]);
                const style = TYPE_COLORS[h.type] || TYPE_COLORS.other;
                return (
                  <div key={i} className="flex items-center gap-1.5 p-1 rounded-md bg-muted/40">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
                    <span className="text-[10px] font-mono text-muted-foreground w-5 flex-shrink-0">
                      {bn ? toBanglaNum(String(day)) : day}
                    </span>
                    <span className="text-[10px] text-foreground truncate flex-1">
                      {bn ? h.nameBn : h.nameEn}
                    </span>
                    {h.approximate && (
                      <span className="text-[8px] text-muted-foreground flex-shrink-0">
                        {bn ? 'সম্ভাব্য' : '~approx'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default IslamicCalendarWidget;
