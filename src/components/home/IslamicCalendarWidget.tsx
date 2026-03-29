import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calendar, Clock, Star, Flag } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const toBanglaNum = (str: string) => String(str).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const BANGLA_MONTHS = ['বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন', 'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'];
const BANGLA_DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Bangla calendar approximation (1 Boishakh ≈ 14 April)
function getBanglaDate(date: Date) {
  const banglaYearOffset = date.getMonth() < 3 || (date.getMonth() === 3 && date.getDate() < 14) ? -594 : -593;
  const banglaYear = date.getFullYear() + banglaYearOffset;
  // Approximate month/day
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  // Boishakh starts ~April 14 (day 104/105)
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
  return { day: remaining + 1, month: BANGLA_MONTHS[monthIdx], year: banglaYear };
}

// Holidays for Bangladesh (approximate dates for 2026)
interface Holiday {
  date: string; // MM-DD
  nameBn: string;
  nameEn: string;
  type: 'islamic' | 'government' | 'festival' | 'other';
}

const HOLIDAYS_2026: Holiday[] = [
  // Islamic holidays (approximate)
  { date: '01-27', nameBn: 'শবে মেরাজ', nameEn: 'Shab-e-Meraj', type: 'islamic' },
  { date: '02-13', nameBn: 'শবে বরাত', nameEn: 'Shab-e-Barat', type: 'islamic' },
  { date: '03-01', nameBn: 'রমজান শুরু', nameEn: 'Ramadan Starts', type: 'islamic' },
  { date: '03-27', nameBn: 'শবে কদর', nameEn: 'Laylat al-Qadr', type: 'islamic' },
  { date: '03-30', nameBn: 'ঈদুল ফিতর', nameEn: 'Eid ul-Fitr', type: 'islamic' },
  { date: '03-31', nameBn: 'ঈদুল ফিতর (২য় দিন)', nameEn: 'Eid ul-Fitr (2nd Day)', type: 'islamic' },
  { date: '06-06', nameBn: 'ঈদুল আযহা', nameEn: 'Eid ul-Adha', type: 'islamic' },
  { date: '06-07', nameBn: 'ঈদুল আযহা (২য় দিন)', nameEn: 'Eid ul-Adha (2nd Day)', type: 'islamic' },
  { date: '07-06', nameBn: 'আশুরা', nameEn: 'Ashura', type: 'islamic' },
  { date: '09-05', nameBn: 'ঈদে মিলাদুন্নবী', nameEn: 'Eid-e-Milad-un-Nabi', type: 'islamic' },
  // Government holidays
  { date: '02-21', nameBn: 'শহীদ দিবস', nameEn: 'Shaheed Day', type: 'government' },
  { date: '03-17', nameBn: 'জাতির জনকের জন্মদিন', nameEn: "Father of the Nation's Birthday", type: 'government' },
  { date: '03-26', nameBn: 'স্বাধীনতা দিবস', nameEn: 'Independence Day', type: 'government' },
  { date: '04-14', nameBn: 'পহেলা বৈশাখ', nameEn: 'Pohela Boishakh', type: 'festival' },
  { date: '05-01', nameBn: 'মে দিবস', nameEn: 'May Day', type: 'government' },
  { date: '08-15', nameBn: 'জাতীয় শোক দিবস', nameEn: 'National Mourning Day', type: 'government' },
  { date: '12-16', nameBn: 'বিজয় দিবস', nameEn: 'Victory Day', type: 'government' },
  // Festival holidays
  { date: '10-02', nameBn: 'দুর্গাপূজা', nameEn: 'Durga Puja', type: 'festival' },
  { date: '12-25', nameBn: 'বড়দিন', nameEn: 'Christmas', type: 'festival' },
  // Weekly
];

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string; labelBn: string }> = {
  islamic: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Islamic', labelBn: 'ইসলামিক' },
  government: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'Government', labelBn: 'সরকারি' },
  festival: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'Festival', labelBn: 'উৎসব' },
  other: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: 'Other', labelBn: 'অন্যান্য' },
};

const IslamicCalendarWidget = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const banglaDate = getBanglaDate(now);
  const todayStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayHoliday = HOLIDAYS_2026.find(h => h.date === todayStr);

  // Get upcoming holidays (next 30 days)
  const upcomingHolidays = HOLIDAYS_2026.filter(h => {
    const [m, d] = h.date.split('-').map(Number);
    const hDate = new Date(now.getFullYear(), m - 1, d);
    const diff = (hDate.getTime() - now.getTime()) / 86400000;
    return diff >= 0 && diff <= 60;
  }).sort((a, b) => {
    const [am, ad] = a.date.split('-').map(Number);
    const [bm, bd] = b.date.split('-').map(Number);
    return new Date(now.getFullYear(), am - 1, ad).getTime() - new Date(now.getFullYear(), bm - 1, bd).getTime();
  });

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dayName = bn ? BANGLA_DAYS[now.getDay()] : EN_DAYS[now.getDay()];
  const gregorianDate = bn
    ? `${toBanglaNum(String(now.getDate()))} ${EN_MONTHS[now.getMonth()]} ${toBanglaNum(String(now.getFullYear()))}`
    : `${now.getDate()} ${EN_MONTHS[now.getMonth()]} ${now.getFullYear()}`;

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
        {/* Gregorian */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">{bn ? 'ইংরেজি' : 'Gregorian'}</p>
            <p className="text-xs font-semibold text-foreground">{gregorianDate}</p>
          </div>
        </div>
        {/* Bangla */}
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
        {/* Arabic/Hijri - from prayer API */}
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

      {/* Upcoming Holidays */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Flag className="w-3 h-3 text-muted-foreground" />
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {bn ? 'আসন্ন ছুটি ও উৎসব' : 'Upcoming Holidays'}
          </h4>
        </div>
        <ScrollArea className="h-[180px]">
          <div className="space-y-1.5 pr-2">
            {upcomingHolidays.length > 0 ? upcomingHolidays.map((h, i) => {
              const [m, d] = h.date.split('-').map(Number);
              const hDate = new Date(now.getFullYear(), m - 1, d);
              const diff = Math.ceil((hDate.getTime() - now.getTime()) / 86400000);
              const style = TYPE_STYLES[h.type];
              return (
                <div key={i} className={`flex items-center justify-between p-1.5 rounded-md ${style.bg}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-medium ${style.text} truncate`}>
                      {bn ? h.nameBn : h.nameEn}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {bn ? `${toBanglaNum(String(d))}/${toBanglaNum(String(m))}` : `${d}/${m}`}
                      {' • '}
                      <span className={`${style.text} font-medium`}>{bn ? style.labelBn : style.label}</span>
                    </p>
                  </div>
                  {diff > 0 && (
                    <span className={`text-[9px] font-bold ${style.text} whitespace-nowrap ml-1`}>
                      {bn ? `${toBanglaNum(String(diff))} দিন` : `${diff}d`}
                    </span>
                  )}
                  {diff === 0 && (
                    <span className={`text-[9px] font-bold ${style.text} whitespace-nowrap ml-1`}>
                      {bn ? 'আজ!' : 'Today!'}
                    </span>
                  )}
                </div>
              );
            }) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                {bn ? 'কোনো আসন্ন ছুটি নেই' : 'No upcoming holidays'}
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default IslamicCalendarWidget;
