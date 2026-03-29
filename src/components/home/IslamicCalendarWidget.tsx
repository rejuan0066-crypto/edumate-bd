import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calendar, Clock, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const toBanglaNum = (str: string) => String(str).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const BANGLA_MONTHS_CAL = ['বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন', 'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'];
const BANGLA_DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

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
  return { day: remaining + 1, month: BANGLA_MONTHS_CAL[monthIdx], year: banglaYear };
}

interface Holiday {
  date: string; // MM-DD
  nameBn: string;
  nameEn: string;
  type: 'islamic' | 'government' | 'festival' | 'other';
  approximate?: boolean;
}

const HOLIDAYS_2026: Holiday[] = [
  { date: '01-27', nameBn: 'শবে মেরাজ', nameEn: 'Shab-e-Meraj', type: 'islamic', approximate: true },
  { date: '02-13', nameBn: 'শবে বরাত', nameEn: 'Shab-e-Barat', type: 'islamic', approximate: true },
  { date: '02-21', nameBn: 'শহীদ দিবস ও আন্তর্জাতিক মাতৃভাষা দিবস', nameEn: 'Shaheed Day & Intl Mother Language Day', type: 'government' },
  { date: '03-01', nameBn: 'রমজান শুরু', nameEn: 'Ramadan Starts', type: 'islamic', approximate: true },
  { date: '03-17', nameBn: 'জাতির পিতার জন্মদিন', nameEn: "Father of the Nation's Birthday", type: 'government' },
  { date: '03-26', nameBn: 'স্বাধীনতা ও জাতীয় দিবস', nameEn: 'Independence & National Day', type: 'government' },
  { date: '03-27', nameBn: 'শবে কদর', nameEn: 'Laylat al-Qadr', type: 'islamic', approximate: true },
  { date: '03-30', nameBn: 'ঈদুল ফিতর', nameEn: 'Eid ul-Fitr', type: 'islamic', approximate: true },
  { date: '03-31', nameBn: 'ঈদুল ফিতর (২য় দিন)', nameEn: 'Eid ul-Fitr (2nd Day)', type: 'islamic', approximate: true },
  { date: '04-14', nameBn: 'পহেলা বৈশাখ', nameEn: 'Pohela Boishakh', type: 'festival' },
  { date: '05-01', nameBn: 'মে দিবস', nameEn: 'May Day', type: 'government' },
  { date: '06-06', nameBn: 'ঈদুল আযহা', nameEn: 'Eid ul-Adha', type: 'islamic', approximate: true },
  { date: '06-07', nameBn: 'ঈদুল আযহা (২য় দিন)', nameEn: 'Eid ul-Adha (2nd Day)', type: 'islamic', approximate: true },
  { date: '07-06', nameBn: 'আশুরা', nameEn: 'Ashura', type: 'islamic', approximate: true },
  { date: '08-15', nameBn: 'জাতীয় শোক দিবস', nameEn: 'National Mourning Day', type: 'government' },
  { date: '09-05', nameBn: 'ঈদে মিলাদুন্নবী', nameEn: 'Eid-e-Milad-un-Nabi', type: 'islamic', approximate: true },
  { date: '10-02', nameBn: 'দুর্গাপূজা', nameEn: 'Durga Puja', type: 'festival', approximate: true },
  { date: '11-01', nameBn: 'বিপ্লব ও সংহতি দিবস', nameEn: 'Revolution & Solidarity Day', type: 'government' },
  { date: '12-16', nameBn: 'বিজয় দিবস', nameEn: 'Victory Day', type: 'government' },
  { date: '12-25', nameBn: 'বড়দিন', nameEn: 'Christmas', type: 'festival' },
];

const TYPE_STYLES: Record<string, { bg: string; text: string; dot: string; label: string; labelBn: string }> = {
  islamic: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Islamic', labelBn: 'ইসলামিক' },
  government: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500', label: 'Government', labelBn: 'সরকারি' },
  festival: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', label: 'Festival', labelBn: 'উৎসব' },
  other: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500', label: 'Other', labelBn: 'অন্যান্য' },
};

// Group holidays by month index (0-11)
function groupByMonth(holidays: Holiday[]): Map<number, Holiday[]> {
  const map = new Map<number, Holiday[]>();
  holidays.forEach(h => {
    const monthIdx = parseInt(h.date.split('-')[0]) - 1;
    if (!map.has(monthIdx)) map.set(monthIdx, []);
    map.get(monthIdx)!.push(h);
  });
  return map;
}

const IslamicCalendarWidget = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [now, setNow] = useState(new Date());
  const [selectedYear] = useState(2026);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-expand current month
  useEffect(() => {
    setExpandedMonth(now.getMonth());
  }, []);

  const banglaDate = getBanglaDate(now);
  const todayStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayHoliday = HOLIDAYS_2026.find(h => h.date === todayStr);
  const grouped = groupByMonth(HOLIDAYS_2026);

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dayName = bn ? BANGLA_DAYS[now.getDay()] : EN_DAYS[now.getDay()];
  const gregorianDate = bn
    ? `${toBanglaNum(String(now.getDate()))} ${EN_MONTHS[now.getMonth()]} ${toBanglaNum(String(now.getFullYear()))}`
    : `${now.getDate()} ${EN_MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  const toggleMonth = (idx: number) => {
    setExpandedMonth(prev => prev === idx ? null : idx);
  };

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

      {/* Dates */}
      <div className="p-3 space-y-2 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">{bn ? 'ইংরেজি' : 'Gregorian'}</p>
            <p className="text-xs font-semibold text-foreground">{gregorianDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <span className="text-sm">🇧🇩</span>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">{bn ? 'বাংলা' : 'Bengali'}</p>
            <p className="text-xs font-semibold text-foreground">
              {bn ? `${toBanglaNum(String(banglaDate.day))} ${banglaDate.month} ${toBanglaNum(String(banglaDate.year))}` : `${banglaDate.day} ${banglaDate.month} ${banglaDate.year}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <span className="text-sm">☪️</span>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">{bn ? 'আরবি (হিজরি)' : 'Hijri'}</p>
            <p className="text-xs font-semibold text-foreground" id="hijri-date">
              {bn ? 'নামাজের সময় থেকে লোড হবে' : 'Loaded from prayer times'}
            </p>
          </div>
        </div>
      </div>

      {/* Today's Holiday */}
      {todayHoliday && (
        <div className={`mx-3 mt-2 p-2 rounded-lg ${TYPE_STYLES[todayHoliday.type].bg} border border-current/10`}>
          <div className="flex items-center gap-1.5">
            <Star className={`w-3 h-3 ${TYPE_STYLES[todayHoliday.type].text}`} />
            <span className={`text-[10px] font-bold ${TYPE_STYLES[todayHoliday.type].text}`}>
              {bn ? 'আজকের বিশেষ দিন' : "Today's Special"}
            </span>
          </div>
          <p className={`text-xs font-semibold mt-0.5 ${TYPE_STYLES[todayHoliday.type].text}`}>
            {bn ? todayHoliday.nameBn : todayHoliday.nameEn}
          </p>
        </div>
      )}

      {/* Year & Month Calendar */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {bn ? 'ছুটির ক্যালেন্ডার' : 'Holiday Calendar'}
            </h4>
          </div>
          <span className="text-xs font-bold text-primary">
            {bn ? toBanglaNum(String(selectedYear)) : selectedYear}
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-2">
          {['islamic', 'government', 'festival'].map(type => (
            <div key={type} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${TYPE_STYLES[type].dot}`} />
              <span className="text-[9px] text-muted-foreground">{bn ? TYPE_STYLES[type].labelBn : TYPE_STYLES[type].label}</span>
            </div>
          ))}
        </div>

        <ScrollArea className="h-[220px]">
          <div className="space-y-1 pr-2">
            {Array.from({ length: 12 }, (_, monthIdx) => {
              const holidays = grouped.get(monthIdx) || [];
              const isCurrentMonth = now.getMonth() === monthIdx && now.getFullYear() === selectedYear;
              const isExpanded = expandedMonth === monthIdx;
              const monthName = bn ? BN_MONTHS[monthIdx] : EN_MONTHS[monthIdx];

              return (
                <div key={monthIdx}>
                  {/* Month Header */}
                  <button
                    onClick={() => toggleMonth(monthIdx)}
                    className={`w-full flex items-center justify-between p-1.5 rounded-md text-left transition-colors ${
                      isCurrentMonth
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {isExpanded
                        ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      }
                      <span className={`text-[11px] font-semibold ${isCurrentMonth ? 'text-primary' : 'text-foreground'}`}>
                        {monthName}
                      </span>
                      {isCurrentMonth && (
                        <span className="text-[8px] bg-primary text-primary-foreground px-1 py-0.5 rounded-full leading-none">
                          {bn ? 'চলমান' : 'Now'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {holidays.length > 0 && (
                        <span className="text-[9px] text-muted-foreground">
                          {bn ? toBanglaNum(String(holidays.length)) : holidays.length}
                        </span>
                      )}
                      {/* Show type dots */}
                      {[...new Set(holidays.map(h => h.type))].map(type => (
                        <span key={type} className={`w-1.5 h-1.5 rounded-full ${TYPE_STYLES[type].dot}`} />
                      ))}
                    </div>
                  </button>

                  {/* Expanded holidays */}
                  {isExpanded && (
                    <div className="ml-4 mt-1 mb-1 space-y-0.5">
                      {holidays.length > 0 ? (
                        // Group by type within month
                        (['islamic', 'government', 'festival', 'other'] as const).map(type => {
                          const typeHolidays = holidays.filter(h => h.type === type);
                          if (typeHolidays.length === 0) return null;
                          const style = TYPE_STYLES[type];
                          return (
                            <div key={type} className="space-y-0.5">
                              <p className={`text-[9px] font-bold ${style.text} uppercase tracking-wider mt-1`}>
                                {bn ? style.labelBn : style.label}
                              </p>
                              {typeHolidays.map((h, i) => {
                                const day = parseInt(h.date.split('-')[1]);
                                const hDate = new Date(selectedYear, monthIdx, day);
                                const isPast = hDate.getTime() < now.getTime();
                                const isToday = h.date === todayStr;
                                return (
                                  <div
                                    key={i}
                                    className={`flex items-center justify-between p-1.5 rounded-md ${
                                      isToday ? `${style.bg} ring-1 ring-current/20` : isPast ? 'opacity-50' : style.bg
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
                                      <span className={`text-[11px] font-medium ${style.text} truncate`}>
                                        {bn ? h.nameBn : h.nameEn}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                                      <span className={`text-[10px] font-mono ${style.text}`}>
                                        {bn ? toBanglaNum(String(day)) : day}
                                        {h.approximate && (
                                          <span className="text-[8px] opacity-60 ml-0.5">
                                            {bn ? '~' : '~'}
                                          </span>
                                        )}
                                      </span>
                                      {isToday && (
                                        <span className="text-[8px] bg-primary text-primary-foreground px-1 py-0.5 rounded-full leading-none">
                                          {bn ? 'আজ' : 'Today'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[10px] text-muted-foreground py-1 italic">
                          {bn ? 'এই মাসে কোনো ছুটি নেই' : 'No holidays this month'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default IslamicCalendarWidget;
