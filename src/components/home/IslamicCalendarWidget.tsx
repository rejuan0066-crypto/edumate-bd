import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calendar, Clock, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const toBanglaNum = (str: string) => String(str).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const BANGLA_MONTHS_CAL = ['বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন', 'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'];
const BANGLA_DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const SHORT_DAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const SHORT_DAYS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];

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
  date: string;
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

const TYPE_COLORS: Record<string, { dot: string; ring: string; label: string; labelBn: string }> = {
  islamic: { dot: 'bg-emerald-500', ring: 'ring-emerald-400', label: 'Islamic', labelBn: 'ইসলামিক' },
  government: { dot: 'bg-blue-500', ring: 'ring-blue-400', label: 'Government', labelBn: 'সরকারি' },
  festival: { dot: 'bg-amber-500', ring: 'ring-amber-400', label: 'Festival', labelBn: 'উৎসব' },
  other: { dot: 'bg-purple-500', ring: 'ring-purple-400', label: 'Other', labelBn: 'অন্যান্য' },
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
  const [now, setNow] = useState(new Date());
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const banglaDate = getBanglaDate(now);
  const todayStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayHoliday = HOLIDAYS_2026.find(h => h.date === todayStr);
  const holidayMap = useMemo(() => getHolidayMap(HOLIDAYS_2026), []);

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dayName = bn ? BANGLA_DAYS[now.getDay()] : EN_DAYS[now.getDay()];
  const gregorianDate = bn
    ? `${toBanglaNum(String(now.getDate()))} ${EN_MONTHS[now.getMonth()]} ${toBanglaNum(String(now.getFullYear()))}`
    : `${now.getDate()} ${EN_MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  // Calendar grid
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
  const goToday = () => { setViewMonth(now.getMonth()); setViewYear(now.getFullYear()); };

  // Holidays in current view month
  const monthHolidays = HOLIDAYS_2026.filter(h => {
    const m = parseInt(h.date.split('-')[0]) - 1;
    return m === viewMonth;
  });

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
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-muted/50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={goToday} className="text-center">
            <span className="text-xs font-bold text-foreground">
              {bn ? BN_MONTHS[viewMonth] : EN_MONTHS[viewMonth]}
            </span>
            <span className="text-[10px] text-muted-foreground ml-1">
              {bn ? toBanglaNum(String(viewYear)) : viewYear}
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
                {/* Holiday dots */}
                {dayHolidays.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayHolidays.map((h, idx) => (
                      <span
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-primary-foreground' : TYPE_COLORS[h.type].dot}`}
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

        {/* Month's Holiday List */}
        {monthHolidays.length > 0 && (
          <ScrollArea className="h-[100px] mt-1">
            <div className="space-y-0.5 pr-2">
              {monthHolidays.map((h, i) => {
                const day = parseInt(h.date.split('-')[1]);
                const style = TYPE_COLORS[h.type];
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
