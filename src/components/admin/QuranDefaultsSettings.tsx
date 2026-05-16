import { useEffect, useState } from 'react';
import { Languages, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

type TrState = 'off' | 'bn' | 'en' | 'both';
const SETTING_KEY = 'quran_default_translation';

const QuranDefaultsSettings = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [value, setValue] = useState<TrState>('both');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle();
      const v = data?.value as TrState | undefined;
      if (v && ['off', 'bn', 'en', 'both'].includes(v)) setValue(v);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key: SETTING_KEY, value: value as unknown as object, description: 'Default translation state for Quran page: off | bn | en | both' },
        { onConflict: 'key' },
      );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(bn ? 'সেভ হয়েছে' : 'Saved');
  };

  const options: { id: TrState; label_bn: string; label_en: string; hint_bn: string; hint_en: string }[] = [
    { id: 'off',  label_bn: 'বন্ধ',           label_en: 'Off',                hint_bn: 'কোনো অনুবাদ দেখাবে না',          hint_en: 'No translation shown' },
    { id: 'bn',   label_bn: 'শুধু বাংলা',     label_en: 'Bengali only',       hint_bn: 'শুধু বাংলা অনুবাদ',             hint_en: 'Only Bengali translation' },
    { id: 'en',   label_bn: 'শুধু ইংরেজি',    label_en: 'English only',       hint_bn: 'শুধু ইংরেজি অনুবাদ',             hint_en: 'Only English translation' },
    { id: 'both', label_bn: 'উভয়',            label_en: 'Both',               hint_bn: 'বাংলা + ইংরেজি দুটিই',           hint_en: 'Both Bengali and English' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="card-elevated p-5">
        <h3 className="font-display font-bold text-foreground mb-2 flex items-center gap-2">
          <Languages className="w-5 h-5 text-primary" />
          {bn ? 'কুরআন পেজ — ডিফল্ট অনুবাদ' : 'Quran Page — Default Translation'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {bn
            ? 'নতুন পাঠকদের জন্য প্রাথমিকভাবে কোন অনুবাদটি দেখাবে তা নির্বাচন করুন। ব্যবহারকারী চাইলে নিজে টগল করে পরিবর্তন করতে পারবেন।'
            : 'Choose which translation is shown by default to new readers. Users can still toggle it themselves.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {options.map((o) => {
            const active = value === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setValue(o.id)}
                className={`text-left rounded-2xl border p-4 transition-all ${
                  active
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                    : 'border-border/60 hover:border-primary/40 hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{bn ? o.label_bn : o.label_en}</span>
                  {active && <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">{bn ? 'নির্বাচিত' : 'Selected'}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{bn ? o.hint_bn : o.hint_en}</p>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end mt-5">
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {bn ? 'সংরক্ষণ করুন' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuranDefaultsSettings;
