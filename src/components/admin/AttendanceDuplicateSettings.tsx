import { useEffect, useState } from 'react';
import { CalendarClock, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ATTENDANCE_DUPLICATE_RULE_KEY,
  AttendanceDuplicateRule,
  DEFAULT_ATTENDANCE_DUPLICATE_RULE,
  safeDuplicateRule,
} from '@/lib/attendanceDedup';

const AttendanceDuplicateSettings = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [value, setValue] = useState<AttendanceDuplicateRule>(DEFAULT_ATTENDANCE_DUPLICATE_RULE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', ATTENDANCE_DUPLICATE_RULE_KEY)
        .maybeSingle();
      const v = data?.value as any;
      setValue(safeDuplicateRule(typeof v === 'string' ? v : v?.rule));
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        [{
          key: ATTENDANCE_DUPLICATE_RULE_KEY,
          value: value as string,
          description: 'Which attendance entry counts when a day has duplicates: latest | earliest',
        }],
        { onConflict: 'key' },
      );
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(bn ? 'সেভ হয়েছে' : 'Saved');
  };

  const options: { id: AttendanceDuplicateRule; label_bn: string; label_en: string; hint_bn: string; hint_en: string }[] = [
    { id: 'latest', label_bn: 'সবচেয়ে নতুন এন্ট্রি', label_en: 'Latest entry', hint_bn: 'একই দিনে একাধিক এন্ট্রি হলে শেষবার সংরক্ষিত এন্ট্রিটি গণনা হবে', hint_en: 'The most recently saved entry of that day is used' },
    { id: 'earliest', label_bn: 'সবচেয়ে পুরোনো এন্ট্রি', label_en: 'Earliest entry', hint_bn: 'একই দিনে একাধিক এন্ট্রি হলে প্রথম এন্ট্রিটি গণনা হবে', hint_en: 'The first saved entry of that day is used' },
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
          <CalendarClock className="w-5 h-5 text-primary" />
          {bn ? 'হাজিরা — একই দিনের একাধিক এন্ট্রি' : 'Attendance — Duplicate Entries'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {bn
            ? 'একই কর্মীর একই দিনে একাধিক হাজিরা এন্ট্রি থাকলে কোনটি গণনা হবে তা এখান থেকে ঠিক করুন। নিয়মটি হাজিরা তালিকা, মাসিক হাজিরা ও বেতন হিসাব — সব জায়গায় স্বয়ংক্রিয়ভাবে প্রযোজ্য হবে।'
            : 'Choose which entry counts when the same person has more than one attendance entry on a day. The rule applies automatically across attendance lists, monthly view and salary calculation.'}
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

export default AttendanceDuplicateSettings;
