import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calculator, Coins, Wheat, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface FitraOption {
  name_bn: string;
  name_en: string;
  amount_kg: number;
  price_per_kg: number;
}

interface ZakatSettings {
  id: string;
  year: number;
  nisab_gold_grams: number;
  nisab_silver_grams: number;
  gold_price_per_gram: number;
  silver_price_per_gram: number;
  zakat_rate: number;
  fitra_options: FitraOption[];
  notes_bn: string;
  notes_en: string;
}

const fmt = (n: number, bn: boolean) => {
  const s = (Math.round(n * 100) / 100).toLocaleString(bn ? 'bn-BD' : 'en-US', { maximumFractionDigits: 2 });
  return s;
};

const ZakatFitraPage = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const { data: settings, isLoading } = useQuery({
    queryKey: ['zakat-fitra-settings-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zakat_fitra_settings')
        .select('*')
        .eq('is_active', true)
        .order('year', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ZakatSettings | null;
    },
  });

  // Zakat inputs
  const [cash, setCash] = useState('');
  const [bank, setBank] = useState('');
  const [goldGrams, setGoldGrams] = useState('');
  const [silverGrams, setSilverGrams] = useState('');
  const [business, setBusiness] = useState('');
  const [investments, setInvestments] = useState('');
  const [loansOwed, setLoansOwed] = useState('');
  const [debts, setDebts] = useState('');
  const [nisabBasis, setNisabBasis] = useState<'silver' | 'gold'>('silver');

  // Fitra inputs
  const [fitraType, setFitraType] = useState<string>('0');
  const [persons, setPersons] = useState('1');

  // Save / audit log
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [savingZakat, setSavingZakat] = useState(false);
  const [savingFitra, setSavingFitra] = useState(false);

  const saveLog = async (type: 'zakat' | 'fitra') => {
    if (!settings) return;
    const setSaving = type === 'zakat' ? setSavingZakat : setSavingFitra;
    setSaving(true);
    const inputs = type === 'zakat'
      ? { cash: num(cash), bank: num(bank), gold_grams: num(goldGrams), silver_grams: num(silverGrams), business: num(business), investments: num(investments), loans_owed: num(loansOwed), debts: num(debts), nisab_basis: nisabBasis }
      : { fitra_type_index: Number(fitraType), fitra_food: settings.fitra_options[Number(fitraType)]?.name_en, persons: num(persons) };
    const results = type === 'zakat' ? calc : fitra;
    const cleanName = contactName.trim().slice(0, 100);
    const cleanPhone = contactPhone.trim().slice(0, 30);
    const { error } = await supabase.from('zakat_calculation_logs').insert({
      settings_year: settings.year,
      calc_type: type,
      inputs: inputs as never,
      results: (results || {}) as never,
      contact_name: cleanName || null,
      contact_phone: cleanPhone || null,
      user_agent: navigator.userAgent.slice(0, 300),
    } as never);
    setSaving(false);
    if (error) return toast.error(bn ? 'সংরক্ষণ ব্যর্থ' : 'Save failed', { description: error.message });
    toast.success(bn ? 'হিসাব সংরক্ষিত হয়েছে' : 'Calculation saved');
  };

  useEffect(() => {
    document.title = bn ? 'যাকাত ও ফিতরা ক্যালকুলেটর' : 'Zakat & Fitra Calculator';
  }, [bn]);

  const num = (s: string) => {
    const v = parseFloat(s.replace(/,/g, ''));
    return isNaN(v) ? 0 : v;
  };

  const calc = useMemo(() => {
    if (!settings) return null;
    const goldVal = num(goldGrams) * settings.gold_price_per_gram;
    const silverVal = num(silverGrams) * settings.silver_price_per_gram;
    const totalAssets =
      num(cash) + num(bank) + goldVal + silverVal + num(business) + num(investments) + num(loansOwed);
    const liabilities = num(debts);
    const zakatable = Math.max(0, totalAssets - liabilities);
    const nisabValue =
      nisabBasis === 'silver'
        ? settings.nisab_silver_grams * settings.silver_price_per_gram
        : settings.nisab_gold_grams * settings.gold_price_per_gram;
    const meetsNisab = zakatable >= nisabValue;
    const zakatDue = meetsNisab ? (zakatable * settings.zakat_rate) / 100 : 0;
    return { totalAssets, liabilities, zakatable, nisabValue, meetsNisab, zakatDue };
  }, [settings, cash, bank, goldGrams, silverGrams, business, investments, loansOwed, debts, nisabBasis]);

  const fitra = useMemo(() => {
    if (!settings) return null;
    const opt = settings.fitra_options[Number(fitraType)] || settings.fitra_options[0];
    if (!opt) return null;
    const perPerson = opt.amount_kg * opt.price_per_kg;
    const total = perPerson * Math.max(1, num(persons));
    return { perPerson, total, opt };
  }, [settings, fitraType, persons]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium">
            <Calculator className="w-4 h-4" />
            {bn ? `${settings?.year || ''} সালের রেট` : `Rates for ${settings?.year || ''}`}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">{bn ? 'যাকাত ও ফিতরা ক্যালকুলেটর' : 'Zakat & Fitra Calculator'}</h1>
          <p className="text-muted-foreground">
            {bn
              ? 'প্রতি বছরের আপডেটেড নিসাব ও ফিতরা রেট অনুযায়ী হিসাব করুন।'
              : 'Calculate based on the latest yearly nisab and fitra rates.'}
          </p>
        </div>

        {isLoading || !settings ? (
          <Card className="p-10 text-center text-muted-foreground rounded-[32px]">
            {bn ? 'লোড হচ্ছে...' : 'Loading...'}
          </Card>
        ) : (
          <>
            {/* Rates info */}
            <Card className="p-6 rounded-[32px] bg-card/80 backdrop-blur-xl border border-border/60">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{bn ? 'স্বর্ণের নিসাব' : 'Gold Nisab'}</p>
                  <p className="font-semibold">{fmt(settings.nisab_gold_grams, bn)} {bn ? 'গ্রাম' : 'g'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{bn ? 'রূপার নিসাব' : 'Silver Nisab'}</p>
                  <p className="font-semibold">{fmt(settings.nisab_silver_grams, bn)} {bn ? 'গ্রাম' : 'g'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{bn ? 'স্বর্ণ/গ্রাম' : 'Gold/g'}</p>
                  <p className="font-semibold">৳ {fmt(settings.gold_price_per_gram, bn)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{bn ? 'রূপা/গ্রাম' : 'Silver/g'}</p>
                  <p className="font-semibold">৳ {fmt(settings.silver_price_per_gram, bn)}</p>
                </div>
              </div>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Zakat */}
              <Card className="p-6 rounded-[32px] bg-card/80 backdrop-blur-xl border border-border/60 space-y-4">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">{bn ? 'যাকাত হিসাব' : 'Zakat Calculation'}</h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    [bn ? 'নগদ অর্থ (৳)' : 'Cash (৳)', cash, setCash],
                    [bn ? 'ব্যাংক ব্যালেন্স (৳)' : 'Bank balance (৳)', bank, setBank],
                    [bn ? 'স্বর্ণ (গ্রাম)' : 'Gold (g)', goldGrams, setGoldGrams],
                    [bn ? 'রূপা (গ্রাম)' : 'Silver (g)', silverGrams, setSilverGrams],
                    [bn ? 'ব্যবসায়িক সম্পদ (৳)' : 'Business assets (৳)', business, setBusiness],
                    [bn ? 'বিনিয়োগ (৳)' : 'Investments (৳)', investments, setInvestments],
                    [bn ? 'পাওনা টাকা (৳)' : 'Money owed to you (৳)', loansOwed, setLoansOwed],
                    [bn ? 'ঋণ/দেনা (৳)' : 'Debts (৳)', debts, setDebts],
                  ].map(([label, val, setter]) => (
                    <div key={label as string}>
                      <Label className="text-xs">{label as string}</Label>
                      <Input
                        type="number"
                        value={val as string}
                        onChange={(e) => (setter as (s: string) => void)(e.target.value)}
                        className="rounded-xl"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <Label className="text-xs">{bn ? 'নিসাবের ভিত্তি' : 'Nisab basis'}</Label>
                  <Select value={nisabBasis} onValueChange={(v: 'silver' | 'gold') => setNisabBasis(v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="silver">{bn ? 'রূপা (সাধারণ মত)' : 'Silver (common view)'}</SelectItem>
                      <SelectItem value="gold">{bn ? 'স্বর্ণ' : 'Gold'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {calc && (
                  <div className="space-y-2 pt-3 border-t">
                    <Row label={bn ? 'মোট সম্পদ' : 'Total assets'} value={`৳ ${fmt(calc.totalAssets, bn)}`} />
                    <Row label={bn ? 'মোট দায়' : 'Total liabilities'} value={`৳ ${fmt(calc.liabilities, bn)}`} />
                    <Row label={bn ? 'যাকাতযোগ্য সম্পদ' : 'Zakatable wealth'} value={`৳ ${fmt(calc.zakatable, bn)}`} />
                    <Row label={bn ? 'নিসাব মূল্য' : 'Nisab value'} value={`৳ ${fmt(calc.nisabValue, bn)}`} />
                    <div className={`rounded-2xl p-4 mt-2 ${calc.meetsNisab ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <p className="text-sm">{calc.meetsNisab ? (bn ? 'প্রদেয় যাকাত (২.৫%)' : 'Zakat due (2.5%)') : (bn ? 'নিসাব পূর্ণ হয়নি' : 'Nisab not met')}</p>
                      <p className="text-2xl font-bold">৳ {fmt(calc.zakatDue, bn)}</p>
                    </div>
                  </div>
                )}
              </Card>

              {/* Fitra */}
              <Card className="p-6 rounded-[32px] bg-card/80 backdrop-blur-xl border border-border/60 space-y-4">
                <div className="flex items-center gap-2">
                  <Wheat className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">{bn ? 'ফিতরা হিসাব' : 'Fitra Calculation'}</h2>
                </div>

                <div>
                  <Label className="text-xs">{bn ? 'খাদ্য নির্বাচন' : 'Food type'}</Label>
                  <Select value={fitraType} onValueChange={setFitraType}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {settings.fitra_options.map((o, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {bn ? o.name_bn : o.name_en} — {fmt(o.amount_kg, bn)}{bn ? ' কেজি' : ' kg'} × ৳{fmt(o.price_per_kg, bn)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">{bn ? 'ব্যক্তি সংখ্যা' : 'Number of persons'}</Label>
                  <Input type="number" min={1} value={persons} onChange={(e) => setPersons(e.target.value)} className="rounded-xl" />
                </div>

                {fitra && (
                  <div className="space-y-2 pt-3 border-t">
                    <Row label={bn ? 'প্রতি জন' : 'Per person'} value={`৳ ${fmt(fitra.perPerson, bn)}`} />
                    <div className="rounded-2xl p-4 mt-2 bg-primary/10 text-primary">
                      <p className="text-sm">{bn ? 'মোট ফিতরা' : 'Total fitra'}</p>
                      <p className="text-2xl font-bold">৳ {fmt(fitra.total, bn)}</p>
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground space-y-1 pt-2">
                  <p>{bn ? 'রেট তালিকা:' : 'Rate list:'}</p>
                  {settings.fitra_options.map((o, i) => (
                    <p key={i}>• {bn ? o.name_bn : o.name_en}: ৳ {fmt(o.amount_kg * o.price_per_kg, bn)}</p>
                  ))}
                </div>
              </Card>
            </div>

            {(settings.notes_bn || settings.notes_en) && (
              <Card className="p-6 rounded-[32px] bg-muted/30">
                <p className="text-sm whitespace-pre-line">{bn ? settings.notes_bn : settings.notes_en}</p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

export default ZakatFitraPage;
