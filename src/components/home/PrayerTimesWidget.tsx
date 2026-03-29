import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, MapPin } from 'lucide-react';

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

const PRAYER_NAMES = {
  Fajr: { en: 'Fajr', bn: 'ফজর', icon: '🌅' },
  Sunrise: { en: 'Sunrise', bn: 'সূর্যোদয়', icon: '☀️' },
  Dhuhr: { en: 'Dhuhr', bn: 'যোহর', icon: '🌤️' },
  Asr: { en: 'Asr', bn: 'আসর', icon: '🌥️' },
  Maghrib: { en: 'Maghrib', bn: 'মাগরিব', icon: '🌇' },
  Isha: { en: 'Isha', bn: 'ইশা', icon: '🌙' },
};

const toBanglaNum = (str: string) => str.replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const PrayerTimesWidget = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [country, setCountry] = useState('BD');
  const [division, setDivision] = useState('sylhet');
  const [city, setCity] = useState('Sylhet');

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

  return (
    <div className="card-elevated rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-primary p-3 text-primary-foreground">
        <div className="flex items-center gap-2 mb-2">
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
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder={bn ? 'বিভাগ' : 'Division'} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BD_DIVISIONS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{bn ? v.bn : v.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder={bn ? 'জেলা' : 'District'} />
              </SelectTrigger>
              <SelectContent>
                {division && BD_DIVISIONS[division]?.cities.map(c => (
                  <SelectItem key={c.en} value={c.en} className="text-xs">{bn ? c.bn : c.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Prayer Times List */}
      <div className="p-2">
        {isLoading ? (
          <div className="text-center py-6 text-xs text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</div>
        ) : timings ? (
          <div className="space-y-0.5">
            {Object.entries(PRAYER_NAMES).map(([key, val]) => {
              const time = timings[key]?.replace(/\s*\(.*\)/, '') || '';
              return (
                <div key={key} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{val.icon}</span>
                    <span className="text-xs font-medium text-foreground">{bn ? val.bn : val.en}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-primary">
                    {bn ? toBanglaNum(time) : time}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-muted-foreground">{bn ? 'তথ্য পাওয়া যায়নি' : 'No data available'}</div>
        )}
      </div>
    </div>
  );
};

export default PrayerTimesWidget;
