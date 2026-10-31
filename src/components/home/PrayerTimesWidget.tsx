import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrayerCalendarSettings } from '@/hooks/usePrayerCalendarSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Settings2, ChevronDown, ChevronUp, Bell, Sparkles } from 'lucide-react';

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

type City = { en: string; bn: string; upazilas?: { en: string; bn: string }[] };
const BD_DIVISIONS: Record<string, { en: string; bn: string; cities: City[] }> = {
  sylhet: {
    en: 'Sylhet',
    bn: 'সিলেট',
    cities: [
      {
        en: 'Sylhet',
        bn: 'সিলেট',
        upazilas: [
          { en: 'Bishwanath', bn: 'বিশ্বনাথ' },
          { en: 'Balaganj', bn: 'বালাগঞ্জ' },
          { en: 'Beanibazar', bn: 'বিয়ানীবাজার' },
          { en: 'Companiganj', bn: 'কোম্পানীগঞ্জ' },
          { en: 'Dakshin Surma', bn: 'দক্ষিণ সুরমা' },
          { en: 'Fenchuganj', bn: 'ফেঞ্চুগঞ্জ' },
          { en: 'Golapganj', bn: 'গোলাপগঞ্জ' },
          { en: 'Gowainghat', bn: 'গোয়াইনঘাট' },
          { en: 'Jaintiapur', bn: 'জৈন্তাপুর' },
          { en: 'Kanaighat', bn: 'কানাইঘাট' },
          { en: 'Osmani Nagar', bn: 'ওসমানীনগর' },
          { en: 'Zakiganj', bn: 'জকিগঞ্জ' },
        ],
      },
      {
        en: 'Moulvibazar',
        bn: 'মৌলভীবাজার',
        upazilas: [
          { en: 'Barlekha', bn: 'বড়লেখা' },
          { en: 'Juri', bn: 'জুড়ী' },
          { en: 'Kamalganj', bn: 'কমলগঞ্জ' },
          { en: 'Kulaura', bn: 'কুলাউড়া' },
          { en: 'Rajnagar', bn: 'রাজনগর' },
          { en: 'Sreemangal', bn: 'শ্রীমঙ্গল' },
        ],
      },
      {
        en: 'Habiganj',
        bn: 'হবিগঞ্জ',
        upazilas: [
          { en: 'Ajmiriganj', bn: 'আজমিরীগঞ্জ' },
          { en: 'Bahubal', bn: 'বাহুবল' },
          { en: 'Baniachong', bn: 'বানিয়াচং' },
          { en: 'Chunarughat', bn: 'চুনারুঘাট' },
          { en: 'Lakhai', bn: 'লাখাই' },
          { en: 'Madhabpur', bn: 'মাধবপুর' },
          { en: 'Nabiganj', bn: 'নবীগঞ্জ' },
          { en: 'Shaistaganj', bn: 'শায়েস্তাগঞ্জ' },
        ],
      },
      {
        en: 'Sunamganj',
        bn: 'সুনামগঞ্জ',
        upazilas: [
          { en: 'Bishwambharpur', bn: 'বিশ্বম্ভরপুর' },
          { en: 'Chhatak', bn: 'ছাতক' },
          { en: 'Derai', bn: 'দিরাই' },
          { en: 'Dharmapasha', bn: 'ধর্মপাশা' },
          { en: 'Dowarabazar', bn: 'দোয়ারাবাজার' },
          { en: 'Jagannathpur', bn: 'জগন্নাথপুর' },
          { en: 'Jamalganj', bn: 'জামালগঞ্জ' },
          { en: 'Sullah', bn: 'শাল্লা' },
          { en: 'Tahirpur', bn: 'তাহিরপুর' },
        ],
      },
    ],
  },
  dhaka: {
    en: 'Dhaka',
    bn: 'ঢাকা',
    cities: [
      { en: 'Dhaka', bn: 'ঢাকা' },
      { en: 'Gazipur', bn: 'গাজীপুর' },
      { en: 'Narayanganj', bn: 'নারায়ণগঞ্জ' },
      { en: 'Tangail', bn: 'টাঙ্গাইল' },
    ],
  },
  chittagong: {
    en: 'Chittagong',
    bn: 'চট্টগ্রাম',
    cities: [
      { en: 'Chittagong', bn: 'চট্টগ্রাম' },
      { en: 'Comilla', bn: 'কুমিল্লা' },
      { en: "Cox's Bazar", bn: 'কক্সবাজার' },
    ],
  },
  rajshahi: {
    en: 'Rajshahi',
    bn: 'রাজশাহী',
    cities: [{ en: 'Rajshahi', bn: 'রাজশাহী' }, { en: 'Bogra', bn: 'বগুড়া' }],
  },
  khulna: {
    en: 'Khulna',
    bn: 'খুলনা',
    cities: [{ en: 'Khulna', bn: 'খুলনা' }, { en: 'Jessore', bn: 'যশোর' }],
  },
  barisal: {
    en: 'Barisal',
    bn: 'বরিশাল',
    cities: [{ en: 'Barisal', bn: 'বরিশাল' }],
  },
  rangpur: {
    en: 'Rangpur',
    bn: 'রংপুর',
    cities: [{ en: 'Rangpur', bn: 'রংপুর' }],
  },
  mymensingh: {
    en: 'Mymensingh',
    bn: 'ময়মনসিংহ',
    cities: [{ en: 'Mymensingh', bn: 'ময়মনসিংহ' }],
  },
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

const ISHRAQ_OFFSET_MIN = 15;

const addMinutesToTime = (timeStr: string, mins: number): string => {
  const clean = timeStr.replace(/\s*\(.*\)/, '');
  const [h, m] = clean.split(':').map(Number);
  const total = (h * 60 + m + mins + 24 * 60) % (24 * 60);
  const hh = Math.floor(total / 60).toString().padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

const toBanglaNum = (str: string) => String(str).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const timeToMinutes = (timeStr: string): number => {
  const clean = timeStr.replace(/\s*\(.*\)/, '');
  const [h, m] = clean.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const nowMinutesInTz = (now: Date, tz: string): number => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value || 0);
  return get('hour') * 60 + get('minute') + get('second') / 60;
};

const formatCountdown = (ms: number, isBn: boolean): string => {
  if (ms <= 0) return isBn ? '০০:০০:০০' : '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (isBn) {
    if (h > 0) return `${toBanglaNum(String(h))} ঘণ্টা ${toBanglaNum(String(m))} মি.`;
    return `${toBanglaNum(String(m))} মিনিট ${toBanglaNum(String(s))} সে.`;
  }
  return `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
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

  const [country, setCountry] = useState<string | null>(null);
  const [division, setDivision] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [upazila, setUpazila] = useState<string>('');
  const [timeFormat, setTimeFormat] = useState<'24h' | '12h' | null>(null);
  const [methodOverride, setMethodOverride] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);

  const effectiveCountry = country ?? config.default_country ?? 'BD';
  const effectiveDivision = division ?? config.default_division ?? 'sylhet';
  const effectiveCity = city ?? config.default_city ?? 'Sylhet';
  const effectiveTimeFormat = timeFormat ?? config.time_format ?? '12h';
  const effectiveMethod = methodOverride ?? config.calculation_method ?? 1;

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const cityObj =
    effectiveCountry === 'BD'
      ? BD_DIVISIONS[effectiveDivision]?.cities.find(c => c.en === effectiveCity)
      : null;
  const selectedCity =
    effectiveCountry === 'BD'
      ? (upazila || effectiveCity)
      : (COUNTRIES.find(c => c.code === effectiveCountry)?.en || 'Dhaka');
  const selectedCountry = COUNTRIES.find(c => c.code === effectiveCountry)?.en || 'Bangladesh';

  const tz = 'Asia/Dhaka';

  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const { data: prayerData, isLoading } = useQuery({
    queryKey: ['prayer-times', effectiveCountry, selectedCity, effectiveMethod, todayKey],
    queryFn: async () => {
      const response = await fetch(
        `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(selectedCity)}&country=${encodeURIComponent(selectedCountry)}&method=${effectiveMethod}`
      );
      if (!response.ok) throw new Error('Failed to fetch prayer times');
      const json = await response.json();
      return json.data;
    },
    staleTime: 60 * 60 * 1000,
  });

  const timings = prayerData?.timings;
  const hijriDate = prayerData?.date?.hijri;

  const getActiveInfo = () => {
    if (!timings) return { activeIndex: -1, nextIndex: -1, activeRemainingMs: 0 };
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
        const remaining = (MIN_PER_DAY - nowMin + minutesList[0]) * 60 * 1000;
        return { activeIndex: i, nextIndex: 0, activeRemainingMs: Math.max(0, remaining) };
      }
    }
    const remaining = (minutesList[0] - nowMin) * 60 * 1000;
    return { activeIndex: PRAYER_ORDER.length - 1, nextIndex: 0, activeRemainingMs: Math.max(0, remaining) };
  };

  const { activeIndex, activeRemainingMs } = getActiveInfo();

  if (!config.show_prayer_times) return null;

  return (
    <div className="rounded-2xl border border-emerald-900/10 bg-white shadow-sm overflow-hidden flex flex-col h-full">
      {/* Modern Institutional Emerald Header */}
      <div
        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', color: '#ffffff' }}
        className="p-4 sm:p-5 relative"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800/90 border border-emerald-500/30 flex items-center justify-center text-xl shadow-xs">
              🕌
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white font-display tracking-wide">
                {bn ? 'নামাজের সময়সূচী' : 'Prayer Times'}
              </h3>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                {hijriDate
                  ? `${toBanglaNum(String(hijriDate.day))} ${hijriDate.month.en} ${toBanglaNum(String(hijriDate.year))} হিজরি`
                  : 'সিলেট ও বিশ্বনাথ অঞ্চল'}
              </p>
            </div>
          </div>

          {/* Location button */}
          <button
            type="button"
            onClick={() => setShowSettings(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800/80 hover:bg-emerald-700/90 border border-emerald-500/40 text-xs text-emerald-100 font-medium transition cursor-pointer shadow-xs"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-300" />
            <span>{upazila ? (cityObj?.upazilas?.find(u => u.en === upazila)?.bn || upazila) : (cityObj ? cityObj.bn : 'সিলেট')}</span>
            {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Collapsible Location & Method Configuration */}
      {showSettings && (
        <div className="p-3 bg-slate-50 border-b border-slate-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-700 font-semibold mb-1">
            <span className="flex items-center gap-1">
              <Settings2 className="w-3.5 h-3.5 text-emerald-700" />
              অবস্থান ও হিসাব পদ্ধতি নির্ধারণ
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select
              value={effectiveDivision}
              onValueChange={v => {
                setDivision(v);
                setCity(BD_DIVISIONS[v]?.cities[0]?.en || '');
                setUpazila('');
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-white">
                <SelectValue placeholder="বিভাগ" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BD_DIVISIONS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {bn ? v.bn : v.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={effectiveCity}
              onValueChange={v => {
                setCity(v);
                setUpazila('');
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-white">
                <SelectValue placeholder="জেলা" />
              </SelectTrigger>
              <SelectContent>
                {effectiveDivision &&
                  BD_DIVISIONS[effectiveDivision]?.cities.map(c => (
                    <SelectItem key={c.en} value={c.en} className="text-xs">
                      {bn ? c.bn : c.en}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {cityObj?.upazilas && cityObj.upazilas.length > 0 && (
            <Select
              value={upazila || '__district__'}
              onValueChange={v => setUpazila(v === '__district__' ? '' : v)}
            >
              <SelectTrigger className="h-8 text-xs bg-white">
                <SelectValue placeholder="উপজেলা (যেমন: বিশ্বনাথ)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__district__" className="text-xs">
                  — জেলা সদর ({cityObj.bn}) —
                </SelectItem>
                {cityObj.upazilas.map(u => (
                  <SelectItem key={u.en} value={u.en} className="text-xs">
                    {bn ? u.bn : u.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Select
              value={effectiveTimeFormat}
              onValueChange={(val: '24h' | '12h') => setTimeFormat(val)}
            >
              <SelectTrigger className="h-8 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h" className="text-xs">১২ ঘণ্টা (AM/PM)</SelectItem>
                <SelectItem value="24h" className="text-xs">২৪ ঘণ্টা</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={String(effectiveMethod)}
              onValueChange={v => setMethodOverride(Number(v))}
            >
              <SelectTrigger className="h-8 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1" className="text-xs">করাচী (হানাফী)</SelectItem>
                <SelectItem value="3" className="text-xs">মুসলিম ওয়ার্ল্ড লীগ</SelectItem>
                <SelectItem value="4" className="text-xs">উম্মুল কুরা (মক্কা)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
        {isLoading && !timings ? (
          <div className="text-center py-12 text-sm text-slate-400">
            নামাজের সময়সূচী লোড হচ্ছে...
          </div>
        ) : timings ? (
          <div className="space-y-3">
            {/* Active Waqt Highlight Banner */}
            {activeIndex >= 0 && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 via-emerald-100/40 to-teal-50 border border-emerald-200/90 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-base shadow-xs">
                    {PRAYER_NAMES[PRAYER_ORDER[activeIndex]]?.icon || '🕋'}
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-200/80 text-emerald-900 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      চলমান ওয়াক্ত
                    </div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">
                      {PRAYER_NAMES[PRAYER_ORDER[activeIndex]]?.bn}
                    </div>
                  </div>
                </div>

                {activeRemainingMs > 0 && (
                  <div className="text-right">
                    <div className="text-[11px] text-slate-500 font-medium">ওয়াক্ত শেষ হতে বাকি</div>
                    <div className="text-sm font-bold text-emerald-800 font-mono">
                      {formatCountdown(activeRemainingMs, bn)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Prayer Table Header */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs font-bold text-slate-600">
              <span>ওয়াক্ত</span>
              <span className="text-center w-20">শুরু</span>
              <span className="text-center w-20">শেষ</span>
            </div>

            {/* Prayer Rows */}
            <div className="space-y-1">
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
                    className={`grid grid-cols-[1fr_auto_auto] gap-2 items-center px-3 py-2 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-emerald-50/90 border-emerald-400 font-semibold shadow-2xs'
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base shrink-0">{val.icon}</span>
                      <span className={`text-xs sm:text-sm ${isActive ? 'text-emerald-950 font-bold' : 'text-slate-800'}`}>
                        {bn ? val.bn : val.en}
                      </span>
                    </div>

                    <span
                      className={`text-xs sm:text-sm font-mono text-center w-20 ${
                        isActive ? 'font-bold text-emerald-800' : 'text-slate-800'
                      }`}
                    >
                      {formatDisplayTime(startTime, bn, effectiveTimeFormat)}
                    </span>

                    <span className="text-xs sm:text-sm font-mono text-center w-20 text-slate-500">
                      {endTime ? formatDisplayTime(endTime, bn, effectiveTimeFormat) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Special Sun Timings */}
            {timings.Sunrise && (
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    <strong>ইশরাক নামাজ:</strong> সূর্যোদয়ের ১৫ মিনিট পর ({formatDisplayTime(addMinutesToTime(timings.Sunrise, ISHRAQ_OFFSET_MIN), bn, effectiveTimeFormat)})
                  </span>
                </div>
                <div className="text-amber-800 font-medium">
                  সূর্যাস্ত: {formatDisplayTime(timings.Sunset?.replace(/\s*\(.*\)/, ''), bn, effectiveTimeFormat)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-400">তথ্য পাওয়া যায়নি</div>
        )}
      </div>
    </div>
  );
};

export default PrayerTimesWidget;
