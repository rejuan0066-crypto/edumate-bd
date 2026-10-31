import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrayerCalendarSettings } from '@/hooks/usePrayerCalendarSettings';
import { Calendar, Clock, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const toBanglaNum = (str: string) => String(str).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const BANGLA_MONTHS_CAL = [
  'বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন',
  'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'
];
const BANGLA_DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const SHORT_DAYS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];

const HIJRI_MONTHS_BN = [
  'মুহাররম', 'সফর', 'রবিউল আউয়াল', 'রবিউস সানি', 'জুমাদাল উলা',
  'জুমাদাল সানিয়া', 'রজব', 'শাবান', 'রমজান', 'শাওয়াল', 'জিলকদ', 'জিলহজ'
];

function getHijriDate(date: Date, offset: number) {
  try {
    const adjusted = new Date(date);
    adjusted.setDate(adjusted.getDate() + offset);
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const parts = formatter.formatToParts(adjusted);
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '1448');
    return { day, month, year };
  } catch {
    return { day: 1, month: 0, year: 1448 };
  }
}

function getBanglaDate(date: Date) {
  const banglaYearOffset =
    date.getMonth() < 3 || (date.getMonth() === 3 && date.getDate() < 14) ? -594 : -593;
  const banglaYear = date.getFullYear() + banglaYearOffset;
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const banglaStart = 104;
  let banglaDayOfYear = dayOfYear - banglaStart;
  if (banglaDayOfYear < 0) banglaDayOfYear += 365;
  const monthDays = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30];
  let monthIdx = 0;
  let remaining = banglaDayOfYear;
  for (let i = 0; i < 12; i++) {
    if (remaining < monthDays[i]) {
      monthIdx = i;
      break;
    }
    remaining -= monthDays[i];
  }
  return { day: remaining + 1, month: BANGLA_MONTHS_CAL[monthIdx], monthIdx, year: banglaYear };
}

interface Holiday {
  id: string;
  nameBn: string;
  nameEn: string;
  date: string;
  type: string;
}

export const IslamicCalendarWidget = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { config } = usePrayerCalendarSettings();

  const [now, setNow] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hijriOffset = config.hijri_offset ?? -1;
  const hijriToday = getHijriDate(now, hijriOffset);
  const banglaDate = getBanglaDate(now);

  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ['holidays-public', viewYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .eq('is_active', true)
        .order('date');
      if (error) return [];
      return (data || []).map((h: any) => ({
        id: h.id,
        nameBn: h.name_bn || h.name || '',
        nameEn: h.name_en || h.name || '',
        date: h.date || '',
        type: h.type || 'islamic',
      }));
    },
    staleTime: 60 * 60 * 1000,
  });

  const timeStr = now.toLocaleTimeString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Dhaka',
  });

  const dayName = bn ? BANGLA_DAYS[now.getDay()] : EN_DAYS[now.getDay()];

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const getHolidaysForDay = (day: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dStr = `${pad(viewMonth + 1)}-${pad(day)}`;
    return holidays.filter(h => h.date && h.date.endsWith(dStr));
  };

  // Month hijri range estimation
  const viewHijriStart = getHijriDate(new Date(viewYear, viewMonth, 1), hijriOffset);
  const viewHijriEnd = getHijriDate(new Date(viewYear, viewMonth, daysInMonth), hijriOffset);
  const viewHijriMonthName =
    viewHijriStart.month === viewHijriEnd.month
      ? `${HIJRI_MONTHS_BN[viewHijriStart.month]}`
      : `${HIJRI_MONTHS_BN[viewHijriStart.month]} - ${HIJRI_MONTHS_BN[viewHijriEnd.month]}`;

  if (!config.show_calendar) return null;

  return (
    <div className="rounded-2xl border border-emerald-900/10 bg-white shadow-sm overflow-hidden flex flex-col h-full">
      {/* Modern Forest Emerald Header with Live Clock */}
      <div
        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', color: '#ffffff' }}
        className="p-4 sm:p-5 relative"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800/90 border border-emerald-500/30 flex items-center justify-center text-xl shadow-xs">
              📅
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white font-display tracking-wide">
                {bn ? 'মাসিক ইসলামিক ক্যালেন্ডার' : 'Islamic Calendar'}
              </h3>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                {bn ? 'ইংরেজি, হিজরি ও বাংলা সন-তারিখ' : 'Gregorian, Hijri & Bengali Dates'}
              </p>
            </div>
          </div>

          {/* Digital Clock */}
          <div className="text-right px-3 py-1.5 rounded-lg bg-emerald-800/80 border border-emerald-500/40 shadow-xs">
            <div className="flex items-center justify-end gap-1.5 text-[11px] text-emerald-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{dayName}</span>
            </div>
            <div className="text-sm sm:text-base font-mono font-bold text-white tracking-wider">
              {bn ? toBanglaNum(timeStr) : timeStr}
            </div>
          </div>
        </div>
      </div>

      {/* Triple-Date Summary Cards (আজকের সমন্বিত দিনপঞ্জি) */}
      <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="grid grid-cols-3 gap-2">
          {/* Gregorian */}
          <div className="text-center p-2.5 rounded-xl bg-sky-50/90 border border-sky-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block mb-0.5">
              {bn ? 'ইংরেজি' : 'English'}
            </span>
            <div className="text-xl sm:text-2xl font-bold text-sky-950 font-display">
              {bn ? toBanglaNum(String(now.getDate())) : now.getDate()}
            </div>
            <div className="text-xs font-semibold text-sky-900 mt-0.5">
              {bn ? BN_MONTHS[now.getMonth()] : EN_MONTHS[now.getMonth()]}
            </div>
            <div className="text-[10px] text-sky-700 font-mono">
              {bn ? toBanglaNum(String(now.getFullYear())) : now.getFullYear()}
            </div>
          </div>

          {/* Bangla */}
          <div className="text-center p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">
              {bn ? 'বাংলা সন' : 'Bengali'}
            </span>
            <div className="text-xl sm:text-2xl font-bold text-amber-950 font-display">
              {bn ? toBanglaNum(String(banglaDate.day)) : banglaDate.day}
            </div>
            <div className="text-xs font-semibold text-amber-900 mt-0.5">
              {banglaDate.month}
            </div>
            <div className="text-[10px] text-amber-700 font-mono">
              {bn ? toBanglaNum(String(banglaDate.year)) : banglaDate.year} বঙ্গাব্দ
            </div>
          </div>

          {/* Hijri */}
          <div className="text-center p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200/80 shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
              {bn ? 'হিজরি সন' : 'Hijri'}
            </span>
            <div className="text-xl sm:text-2xl font-bold text-emerald-950 font-display">
              {bn ? toBanglaNum(String(hijriToday.day)) : hijriToday.day}
            </div>
            <div className="text-xs font-semibold text-emerald-900 mt-0.5">
              {HIJRI_MONTHS_BN[hijriToday.month]}
            </div>
            <div className="text-[10px] text-emerald-700 font-mono">
              {bn ? toBanglaNum(String(hijriToday.year)) : hijriToday.year} হিজরি
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid Area */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Month Switcher Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={prevMonth}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>পূর্ববর্তী</span>
            </button>

            <div className="text-center">
              <div className="text-sm sm:text-base font-bold text-slate-900 font-display">
                {bn ? `${BN_MONTHS[viewMonth]} ${toBanglaNum(String(viewYear))}` : `${EN_MONTHS[viewMonth]} ${viewYear}`}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                {viewHijriMonthName} হিজরি
              </div>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <span>পরবর্তী</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels (Friday highlighted) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {SHORT_DAYS_BN.map((d, i) => (
              <div
                key={d}
                className={`py-1.5 text-xs font-bold rounded-md ${
                  i === 5
                    ? 'bg-emerald-100/90 text-emerald-900 border border-emerald-300/80 font-bold'
                    : 'text-slate-600 bg-slate-50'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((d, i) => {
              if (d === null) return <div key={`empty-${i}`} className="h-10 sm:h-11" />;
              const isToday =
                d === now.getDate() &&
                viewMonth === now.getMonth() &&
                viewYear === now.getFullYear();
              const dayDate = new Date(viewYear, viewMonth, d);
              const dayHijri = getHijriDate(dayDate, hijriOffset);
              const isFriday = dayDate.getDay() === 5;
              const holidaysOnDay = getHolidaysForDay(d);

              return (
                <div
                  key={`day-${d}`}
                  onClick={() => setSelectedDay(d)}
                  className={`h-10 sm:h-11 rounded-lg p-1 flex flex-col items-center justify-between cursor-pointer transition border ${
                    isToday
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm font-bold'
                      : isFriday
                      ? 'bg-emerald-50/40 hover:bg-emerald-100/50 border-emerald-100/70 text-slate-900'
                      : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-800'
                  }`}
                >
                  <span
                    className={`text-xs ${
                      isToday ? 'text-white font-bold' : isFriday ? 'text-emerald-950 font-bold' : 'text-slate-800 font-semibold'
                    }`}
                  >
                    {bn ? toBanglaNum(String(d)) : d}
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[8.5px] font-mono leading-none ${
                        isToday ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      {toBanglaNum(String(dayHijri.day))}
                    </span>
                    {holidaysOnDay.length > 0 && (
                      <span
                        className={`w-1 h-1 rounded-full ${
                          isToday ? 'bg-amber-300' : 'bg-emerald-600'
                        }`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Islamic & Special Days footer */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>ইসলামিক ও প্রাতিষ্ঠানিক দিবস</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-medium">
              পবিত্র জুমাতুল মুবারক (প্রতি শুক্রবার)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium">
              আইয়ামে বীজ (প্রতি মাসের ১৩, ১৪ ও ১৫ হিজরি নফল রোজা)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IslamicCalendarWidget;
