import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Timer } from 'lucide-react';

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

const PRAYER_ORDER = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

const PRAYER_NAMES: Record<string, { en: string; bn: string; icon: string }> = {
  Fajr: { en: 'Fajr', bn: 'ফজর', icon: '🌅' },
  Sunrise: { en: 'Sunrise', bn: 'সূর্যোদয়', icon: '☀️' },
  Dhuhr: { en: 'Dhuhr', bn: 'যোহর', icon: '🌤️' },
  Asr: { en: 'Asr', bn: 'আসর', icon: '🌥️' },
  Maghrib: { en: 'Maghrib', bn: 'মাগরিব', icon: '🌇' },
  Isha: { en: 'Isha', bn: 'ইশা', icon: '🌙' },
};

const toBanglaNum = (str: string) => str.replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const parseTime = (timeStr: string): Date => {
  const clean = timeStr.replace(/\s*\(.*\)/, '');
  const [h, m] = clean.split(':').map(Number);
  const now = new Date();
  now.setHours(h, m, 0, 0);
  return now;
};

const formatCountdown = (ms: number, isBn: boolean): string => {
  if (ms <= 0) return isBn ? '০h ০m ০s' : '0h 0m 0s';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const str = `${h}h ${m}m ${s}s`;
  return isBn ? toBanglaNum(str) : str;
};

const PrayerTimesWidget = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [country, setCountry] = useState('BD');
  const [division, setDivision] = useState('sylhet');
  const [city, setCity] = useState('Sylhet');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const selectedCity = country === 'BD' ? city : COUNTRIES.find(c => c.code === country)?.en || 'Dhaka';
  const selectedCountry = COUNTRIES.find(c => c.code === country)?.en || 'Bangladesh';

  const { data: prayerData, isLoading } = useQuery({
    queryKey: ['prayer-times', selectedCity, selectedCountry],
    queryFn: async () => {
      const today = new Date();
      const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;
      const res = await fetch(
        `https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${encodeURIComponent(selectedCity)}&country=${encodeURIComponent(selectedCountry)}&method=1`
      );
      if (!res.ok) throw new Error('Failed to fetch prayer times');
      const json = await res.json();
      return json.data;
    },
    staleTime: 1000 * 60 * 30,
    refetchInterval: 1000 * 60 * 60,
  });

  const timings = prayerData?.timings;
  const hijriDate = prayerData?.date?.hijri;

  // Calculate current/next prayer and remaining time
  const getActiveInfo = () => {
    if (!timings) return { activeIndex: -1, nextIndex: -1, activeRemainingMs: 0 };
    const times = PRAYER_ORDER.map(k => {
      const raw = timings[k] || '00:00';
      return parseTime(raw);
    });
    
    const nowMs = now.getTime();
    
    for (let i = PRAYER_ORDER.length - 1; i >= 0; i--) {
      if (nowMs >= times[i].getTime()) {
        const nextIdx = i + 1;
        if (nextIdx < PRAYER_ORDER.length) {
          const remaining = times[nextIdx].getTime() - nowMs;
          return { activeIndex: i, nextIndex: nextIdx, activeRemainingMs: remaining > 0 ? remaining : 0 };
        }
        // After Isha - countdown to next Fajr (add 24h to Fajr time)
        const nextFajr = times[0].getTime() + 24 * 60 * 60 * 1000;
        const remaining = nextFajr - nowMs;
        return { activeIndex: i, nextIndex: 0, activeRemainingMs: remaining > 0 ? remaining : 0 };
      }
    }
    // Before Fajr - countdown to Fajr
    const remaining = times[0].getTime() - nowMs;
    return { activeIndex: -1, nextIndex: 0, activeRemainingMs: remaining > 0 ? remaining : 0 };
  };

  const { activeIndex, nextIndex, activeRemainingMs } = getActiveInfo();

  return (
    <div className="card-elevated rounded-xl overflow-hidden">
      {/* Header */}
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


      {/* Location Selector */}
      <div className="p-3 space-y-2 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
          <MapPin className="w-3 h-3" />
          <span>{bn ? 'অবস্থান নির্বাচন' : 'Select Location'}</span>
        </div>
        <Select value={country} onValueChange={(v) => { setCountry(v); if (v !== 'BD') { setDivision(''); setCity(''); } else { setDivision('sylhet'); setCity('Sylhet'); } }}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map(c => (
              <SelectItem key={c.code} value={c.code} className="text-xs">{bn ? c.bn : c.en}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {country === 'BD' && (
          <div className="grid grid-cols-2 gap-2">
            <Select value={division} onValueChange={(v) => { setDivision(v); setCity(BD_DIVISIONS[v].cities[0].en); }}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={bn ? 'বিভাগ' : 'Division'} /></SelectTrigger>
              <SelectContent>
                {Object.entries(BD_DIVISIONS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{bn ? v.bn : v.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={bn ? 'জেলা' : 'District'} /></SelectTrigger>
              <SelectContent>
                {division && BD_DIVISIONS[division]?.cities.map(c => (
                  <SelectItem key={c.en} value={c.en} className="text-xs">{bn ? c.bn : c.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Prayer Times Table */}
      <div className="p-2">
        {isLoading ? (
          <div className="text-center py-6 text-xs text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</div>
        ) : timings ? (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-1 px-2 pb-1 mb-1 border-b border-border text-[10px] text-muted-foreground font-medium">
              <span>{bn ? 'ওয়াক্ত' : 'Prayer'}</span>
              <span className="text-center w-14">{bn ? 'শুরু' : 'Start'}</span>
              <span className="text-center w-14">{bn ? 'শেষ' : 'End'}</span>
            </div>
            <div className="space-y-0.5">
              {PRAYER_ORDER.map((key, idx) => {
                const startTime = timings[key]?.replace(/\s*\(.*\)/, '') || '';
                // End time = start of next prayer
                const nextKey = PRAYER_ORDER[idx + 1];
                const endTime = nextKey ? (timings[nextKey]?.replace(/\s*\(.*\)/, '') || '') : '';
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{val.icon}</span>
                      <span className={`text-xs font-medium ${isActive ? 'text-primary font-bold' : 'text-foreground'}`}>
                        {bn ? val.bn : val.en}
                        {isActive && activeRemainingMs > 0 && (
                          <span className="ml-2 text-[10px] font-medium text-primary">
                            {bn ? 'শেষ হবে' : 'ends in'} {formatCountdown(activeRemainingMs, bn)}
                          </span>
                        )}
                      </span>
                    </div>
                    <span className={`text-xs font-mono text-center w-14 ${isActive ? 'font-bold text-primary' : 'text-foreground'}`}>
                      {bn ? toBanglaNum(startTime) : startTime}
                    </span>
                    <span className="text-xs font-mono text-center w-14 text-muted-foreground">
                      {endTime ? (bn ? toBanglaNum(endTime) : endTime) : '—'}
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
