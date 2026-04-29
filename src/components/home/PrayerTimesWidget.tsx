import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrayerCalendarSettings } from '@/hooks/usePrayerCalendarSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin } from 'lucide-react';

const COUNTRIES = [
  { en: 'Bangladesh', bn: 'বাংলাদেশ', code: 'BD' },
  { en: 'Saudi Arabia', bn: 'সৌদি আরব', code: 'SA' },
  { en: 'India', bn: 'ভারত', code: 'IN' },
  { en: 'Pakistan', bn: 'পাকিস্তান', code: 'PK' },
  { en: 'UAE', bn: 'সংযুক্ত আরব আমিরাত', code: 'AE' },
  { en: 'Malaysia', bn: 'মালয়েশিয়া', code: 'MY' },
  { en: 'Indonesia', bn: 'ইন্দোনেশিয়া', code: 'ID' },
  { en: 'Turkey', bn: 'তুরস্ক', code: 'TR' },
  { en: 'Egypt', bn: 'মিশর', code: 'EG' },
  { en: 'Qatar', bn: 'কাতার', code: 'QA' },
  { en: 'Kuwait', bn: 'কুয়েত', code: 'KW' },
  { en: 'Oman', bn: 'ওমান', code: 'OM' },
  { en: 'Bahrain', bn: 'বাহরাইন', code: 'BH' },
  { en: 'UK', bn: 'যুক্তরাজ্য', code: 'GB' },
  { en: 'USA', bn: 'যুক্তরাষ্ট্র', code: 'US' },
];

const BD_DIVISIONS: Record<string, { en: string; bn: string; cities: { en: string; bn: string }[] }> = {
  dhaka: { en: 'Dhaka', bn: 'ঢাকা', cities: [{ en: 'Dhaka', bn: 'ঢাকা' }, { en: 'Gazipur', bn: 'গাজীপুর' }, { en: 'Narayanganj', bn: 'নারায়ণগঞ্জ' }, { en: 'Tangail', bn: 'টাঙ্গাইল' }, { en: 'Manikganj', bn: 'মানিকগঞ্জ' }, { en: 'Munshiganj', bn: 'মুন্সীগঞ্জ' }, { en: 'Narsingdi', bn: 'নরসিংদী' }, { en: 'Faridpur', bn: 'ফরিদপুর' }] },
  chittagong: { en: 'Chittagong', bn: 'চট্টগ্রাম', cities: [{ en: 'Chittagong', bn: 'চট্টগ্রাম' }, { en: 'Comilla', bn: 'কুমিল্লা' }, { en: "Cox's Bazar", bn: 'কক্সবাজার' }, { en: 'Brahmanbaria', bn: 'ব্রাহ্মণবাড়িয়া' }, { en: 'Noakhali', bn: 'নোয়াখালী' }, { en: 'Feni', bn: 'ফেনী' }] },
  sylhet: { en: 'Sylhet', bn: 'সিলেট', cities: [{ en: 'Sylhet', bn: 'সিলেট' }, { en: 'Moulvibazar', bn: 'মৌলভীবাজার' }, { en: 'Habiganj', bn: 'হবিগঞ্জ' }, { en: 'Sunamganj', bn: 'সুনামগঞ্জ' }] },
  rajshahi: { en: 'Rajshahi', bn: 'রাজশাহী', cities: [{ en: 'Rajshahi', bn: 'রাজশাহী' }, { en: 'Bogra', bn: 'বগুড়া' }, { en: 'Pabna', bn: 'পাবনা' }, { en: 'Natore', bn: 'নাটোর' }, { en: 'Naogaon', bn: 'নওগাঁ' }] },
  khulna: { en: 'Khulna', bn: 'খুলনা', cities: [{ en: 'Khulna', bn: 'খুলনা' }, { en: 'Jessore', bn: 'যশোর' }, { en: 'Satkhira', bn: 'সাতক্ষীরা' }, { en: 'Kushtia', bn: 'কুষ্টিয়া' }] },
  barishal: { en: 'Barishal', bn: 'বরিশাল', cities: [{ en: 'Barishal', bn: 'বরিশাল' }, { en: 'Patuakhali', bn: 'পটুয়াখালী' }, { en: 'Bhola', bn: 'ভোলা' }] },
  rangpur: { en: 'Rangpur', bn: 'রংপুর', cities: [{ en: 'Rangpur', bn: 'রংপুর' }, { en: 'Dinajpur', bn: 'দিনাজপুর' }, { en: 'Kurigram', bn: 'কুড়িগ্রাম' }, { en: 'Thakurgaon', bn: 'ঠাকুরগাঁও' }] },
  mymensingh: { en: 'Mymensingh', bn: 'ময়মনসিংহ', cities: [{ en: 'Mymensingh', bn: 'ময়মনসিংহ' }, { en: 'Jamalpur', bn: 'জামালপুর' }, { en: 'Netrokona', bn: 'নেত্রকোণা' }, { en: 'Sherpur', bn: 'শেরপুর' }] },
};

const PRAYER_ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Sunset', 'Isha'] as const;

const PRAYER_NAMES: Record<string, { en: string; bn: string; icon: string }> = {
  Fajr: { en: 'Fajr', bn: 'ফজর', icon: '🌅' },
  Sunrise: { en: 'Sunrise', bn: 'সূর্যোদয়', icon: '☀️' },
  Dhuhr: { en: 'Dhuhr', bn: 'যোহর', icon: '🌤️' },
  Asr: { en: 'Asr', bn: 'আসর', icon: '🌥️' },
  Maghrib: { en: 'Maghrib', bn: 'মাগরিব', icon: '🌇' },
  Sunset: { en: 'Sunset', bn: 'সূর্যাস্ত', icon: '🌆' },
  Isha: { en: 'Isha', bn: 'ইশা', icon: '🌙' },
};

// Minutes after sunrise when nafl prayer (Ishraq) becomes permissible
const ISHRAQ_OFFSET_MIN = 15;
// Minutes before Dhuhr when prayer is forbidden (zawal)
const ZAWAL_BEFORE_DHUHR_MIN = 5;

const addMinutesToTime = (timeStr: string, mins: number): string => {
  const clean = timeStr.replace(/\s*\(.*\)/, '');
  const [h, m] = clean.split(':').map(Number);
  const total = (h * 60 + m + mins + 24 * 60) % (24 * 60);
  const hh = Math.floor(total / 60).toString().padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

const toBanglaNum = (str: string) => str.replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

// Convert "HH:MM" string to total minutes since midnight (timezone-agnostic)
const timeToMinutes = (timeStr: string): number => {
  const clean = timeStr.replace(/\s*\(.*\)/, '');
  const [h, m] = clean.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Get current time in the target timezone as minutes since midnight
const nowMinutesInTz = (now: Date, tz: string): number => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value || 0);
  return get('hour') * 60 + get('minute') + get('second') / 60;
};

const formatCountdown = (ms: number, isBn: boolean): string => {
  if (ms <= 0) return isBn ? '০০h ০০m ০০s' : '00h 00m 00s';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  const str = `${h}:${m}:${s}`;
  return isBn ? toBanglaNum(str) : str;
};

const formatDisplayTime = (timeStr: string, isBn: boolean, timeFormat: '24h' | '12h'): string => {
  if (!timeStr) return '';
  const clean = timeStr.replace(/\s*\(.*\)/, '');
  if (timeFormat === '24h') {
    return isBn ? toBanglaNum(clean) : clean;
  }
  const [rawHour, rawMinute] = clean.split(':').map(Number);
  const period = rawHour >= 12 ? 'PM' : 'AM';
  const hour12 = rawHour % 12 || 12;
  const formatted = `${hour12.toString().padStart(2, '0')}:${rawMinute.toString().padStart(2, '0')} ${period}`;
  return isBn ? `${toBanglaNum(formatted.slice(0, 5))} ${period}` : formatted;
};

const PrayerTimesWidget = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { config } = usePrayerCalendarSettings();

  // Use backend defaults, allow user override
  const [country, setCountry] = useState<string | null>(null);
  const [division, setDivision] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [timeFormat, setTimeFormat] = useState<'24h' | '12h' | null>(null);
  const [methodOverride, setMethodOverride] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());

  // Effective values: user override > backend config
  const effectiveCountry = country ?? config.default_country;
  const effectiveDivision = division ?? config.default_division;
  const effectiveCity = city ?? config.default_city;
  const effectiveTimeFormat = timeFormat ?? config.time_format;
  const effectiveMethod = methodOverride ?? config.calculation_method;

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const selectedCity = effectiveCountry === 'BD' ? effectiveCity : COUNTRIES.find(c => c.code === effectiveCountry)?.en || 'Dhaka';
  const selectedCountry = COUNTRIES.find(c => c.code === effectiveCountry)?.en || 'Bangladesh';

  // Map each country to its IANA timezone so Aladhan returns correct local times
  const COUNTRY_TZ: Record<string, string> = {
    BD: 'Asia/Dhaka', SA: 'Asia/Riyadh', IN: 'Asia/Kolkata', PK: 'Asia/Karachi',
    AE: 'Asia/Dubai', MY: 'Asia/Kuala_Lumpur', ID: 'Asia/Jakarta', TR: 'Europe/Istanbul',
    EG: 'Africa/Cairo', QA: 'Asia/Qatar', KW: 'Asia/Kuwait', OM: 'Asia/Muscat',
    BH: 'Asia/Bahrain', GB: 'Europe/London', US: 'America/New_York',
  };
  const tz = COUNTRY_TZ[effectiveCountry] || 'Asia/Dhaka';

  // Compute today's date in the target timezone (not the user's device TZ)
  const todayInTz = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now); // YYYY-MM-DD
  const [tyY, tyM, tyD] = todayInTz.split('-');
  const todayKey = todayInTz;
  const apiDateStr = `${tyD}-${tyM}-${tyY}`; // DD-MM-YYYY for Aladhan

  const { data: prayerData, isLoading } = useQuery({
    queryKey: ['prayer-times', selectedCity, selectedCountry, effectiveMethod, todayKey],
    queryFn: async () => {
      const url = `https://api.aladhan.com/v1/timingsByCity/${apiDateStr}?city=${encodeURIComponent(selectedCity)}&country=${encodeURIComponent(selectedCountry)}&method=${effectiveMethod}&timezonestring=${encodeURIComponent(tz)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch prayer times');
      const json = await res.json();
      return json.data;
    },
    staleTime: 1000 * 60 * 15,
    refetchInterval: 1000 * 60 * 30,
    refetchOnWindowFocus: true,
  });

  const timings = prayerData?.timings;
  const hijriDate = prayerData?.date?.hijri;

  const getActiveInfo = () => {
    if (!timings) return { activeIndex: -1, nextIndex: -1, activeRemainingMs: 0 };
    // All prayer times are in target city's TZ (e.g. Asia/Dhaka). Compare in that TZ too.
    const minutesList = PRAYER_ORDER.map(k => timeToMinutes(timings[k] || '00:00'));
    const nowMin = nowMinutesInTz(now, tz);
    const MIN_PER_DAY = 24 * 60;
    for (let i = PRAYER_ORDER.length - 1; i >= 0; i--) {
      if (nowMin >= minutesList[i]) {
        const nextIdx = i + 1;
        if (nextIdx < PRAYER_ORDER.length) {
          const remaining = (minutesList[nextIdx] - nowMin) * 60 * 1000;
          return { activeIndex: i, nextIndex: nextIdx, activeRemainingMs: Math.max(0, remaining) };
        }
        // Past Isha — countdown to tomorrow's Fajr
        const remaining = (MIN_PER_DAY - nowMin + minutesList[0]) * 60 * 1000;
        return { activeIndex: i, nextIndex: 0, activeRemainingMs: Math.max(0, remaining) };
      }
    }
    // Before Fajr — previous Isha is still "active"
    const remaining = (minutesList[0] - nowMin) * 60 * 1000;
    return { activeIndex: PRAYER_ORDER.length - 1, nextIndex: 0, activeRemainingMs: Math.max(0, remaining) };
  };

  const { activeIndex, activeRemainingMs } = getActiveInfo();

  if (!config.show_prayer_times) return null;

  return (
    <div className="card-elevated rounded-xl overflow-hidden">
      <div className="bg-primary p-3 text-primary-foreground">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🕌</span>
          <h3 className="font-display font-bold text-sm">
            {bn ? 'নামাজের সময়সূচী' : 'Prayer Times'}
          </h3>
        </div>
        {hijriDate && (
          <p className="text-[10px] opacity-80">
            {hijriDate.day} {hijriDate.month.en} {hijriDate.year} {bn ? 'হিজরী' : 'Hijri'}
          </p>
        )}
      </div>

      <div className="p-3 space-y-2 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
          <MapPin className="w-3 h-3" />
          <span>{bn ? 'অবস্থান নির্বাচন' : 'Select Location'}</span>
        </div>
        <Select value={effectiveCountry} onValueChange={(v) => { setCountry(v); if (v !== 'BD') { setDivision(''); setCity(''); } else { setDivision(config.default_division); setCity(config.default_city); } }}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map(c => (
              <SelectItem key={c.code} value={c.code} className="text-xs">{bn ? c.bn : c.en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {effectiveCountry === 'BD' && (
          <div className="grid grid-cols-2 gap-2">
            <Select value={effectiveDivision} onValueChange={(v) => { setDivision(v); setCity(BD_DIVISIONS[v].cities[0].en); }}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={bn ? 'বিভাগ' : 'Division'} /></SelectTrigger>
              <SelectContent>
                {Object.entries(BD_DIVISIONS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{bn ? v.bn : v.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={effectiveCity} onValueChange={v => setCity(v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={bn ? 'জেলা' : 'District'} /></SelectTrigger>
              <SelectContent>
                {effectiveDivision && BD_DIVISIONS[effectiveDivision]?.cities.map(c => (
                  <SelectItem key={c.en} value={c.en} className="text-xs">{bn ? c.bn : c.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Select value={effectiveTimeFormat} onValueChange={(value: '24h' | '12h') => setTimeFormat(value)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder={bn ? 'টাইম ফরমেট' : 'Time format'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h" className="text-xs">24 Hour</SelectItem>
              <SelectItem value="12h" className="text-xs">12 Hour (AM/PM)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(effectiveMethod)} onValueChange={(v) => setMethodOverride(Number(v))}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder={bn ? 'হিসাব পদ্ধতি' : 'Method'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1" className="text-xs">{bn ? 'করাচী (হানাফী)' : 'Karachi (Hanafi)'}</SelectItem>
              <SelectItem value="2" className="text-xs">{bn ? 'ISNA (উত্তর আমেরিকা)' : 'ISNA (N. America)'}</SelectItem>
              <SelectItem value="3" className="text-xs">{bn ? 'বিশ্ব মুসলিম লীগ' : 'Muslim World League'}</SelectItem>
              <SelectItem value="4" className="text-xs">{bn ? 'উম্মুল কুরা মক্কা' : 'Umm al-Qura, Makkah'}</SelectItem>
              <SelectItem value="5" className="text-xs">{bn ? 'মিশর' : 'Egyptian'}</SelectItem>
              <SelectItem value="8" className="text-xs">{bn ? 'গালফ অঞ্চল' : 'Gulf Region'}</SelectItem>
              <SelectItem value="13" className="text-xs">{bn ? 'তুরস্ক (Diyanet)' : 'Diyanet (Turkey)'}</SelectItem>
              <SelectItem value="15" className="text-xs">{bn ? 'মুনলাইটিং সাইটিং কাউন্সিল' : 'Moonsighting Committee'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-2">
        {isLoading ? (
          <div className="text-center py-6 text-xs text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</div>
        ) : timings ? (
          <>
            {/* Ishraq / forbidden-time info banner */}
            {timings.Sunrise && timings.Dhuhr && timings.Sunset && (
              <div className="mb-2 px-2 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] leading-relaxed">
                <div className="flex justify-between gap-2">
                  <span className="text-foreground">
                    {bn ? `সূর্যোদয়ের ${toBanglaNum(String(ISHRAQ_OFFSET_MIN))} মিনিট পর ইশরাকের নামাজ পড়া যাবে:` : `Ishraq prayer permitted ${ISHRAQ_OFFSET_MIN} min after sunrise:`}
                  </span>
                  <span className="font-mono font-bold text-primary">
                    {formatDisplayTime(addMinutesToTime(timings.Sunrise, ISHRAQ_OFFSET_MIN), bn, effectiveTimeFormat)}
                  </span>
                </div>
                <div className="flex justify-between gap-2 mt-0.5">
                  <span className="text-muted-foreground">
                    {bn ? 'সূর্যাস্ত:' : 'Sunset:'}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {formatDisplayTime(timings.Sunset.replace(/\s*\(.*\)/, ''), bn, effectiveTimeFormat)}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-[1fr_auto_auto] gap-1 px-2 pb-1 mb-1 border-b border-border text-[10px] text-muted-foreground font-medium">
              <span>{bn ? 'ওয়াক্ত' : 'Prayer'}</span>
              <span className="text-center w-20">{bn ? 'শুরু' : 'Start'}</span>
              <span className="text-center w-20">{bn ? 'শেষ' : 'End'}</span>
            </div>
            <div className="space-y-0.5">
              {PRAYER_ORDER.map((key, idx) => {
                const startTime = timings[key]?.replace(/\s*\(.*\)/, '') || '';
                const nextKey = PRAYER_ORDER[idx + 1];
                const endTime = nextKey
                  ? (timings[nextKey]?.replace(/\s*\(.*\)/, '') || '')
                  : (timings[PRAYER_ORDER[0]]?.replace(/\s*\(.*\)/, '') || '');
                const isActive = idx === activeIndex;
                const val = PRAYER_NAMES[key];

                return (
                  <div
                    key={key}
                    className={`grid grid-cols-[1fr_auto_auto] gap-1 items-center px-2 py-1.5 rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary/10 ring-1 ring-primary/30'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm shrink-0">{val.icon}</span>
                      <span className={`text-xs font-medium ${isActive ? 'text-primary font-bold' : 'text-foreground'}`}>
                        {bn ? val.bn : val.en}
                        {isActive && activeRemainingMs > 0 && (
                          <span className="ml-2 text-[10px] font-medium text-primary">
                            {bn ? 'ends in' : 'ends in'} {formatCountdown(activeRemainingMs, bn)}
                          </span>
                        )}
                      </span>
                    </div>
                    <span className={`text-[11px] font-mono text-center w-20 ${isActive ? 'font-bold text-primary' : 'text-foreground'}`}>
                      {formatDisplayTime(startTime, bn, effectiveTimeFormat)}
                    </span>
                    <span className="text-[11px] font-mono text-center w-20 text-muted-foreground">
                      {endTime ? formatDisplayTime(endTime, bn, effectiveTimeFormat) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-xs text-muted-foreground">{bn ? 'তথ্য পাওয়া যায়নি' : 'No data available'}</div>
        )}
      </div>
    </div>
  );
};

export default PrayerTimesWidget;
