import { useEffect, useMemo, useState } from 'react';
import { Globe, Save, Loader2, Search, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  COMMON_TIMEZONES,
  DEFAULT_APP_TZ,
  formatDateTimeInTz,
  getDeviceTz,
  getTzOffsetLabel,
  isValidTz,
} from '@/lib/timezone';
import { setAppTimezoneCache, useAppTimezone } from '@/hooks/useAppTimezone';

const TimezoneSettings = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { tz: currentTz, isLoading } = useAppTimezone();
  const [selected, setSelected] = useState<string>(currentTz);
  const [customTz, setCustomTz] = useState<string>('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!isLoading) setSelected(currentTz);
  }, [currentTz, isLoading]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = COMMON_TIMEZONES.filter(
      tz => !q || tz.label.toLowerCase().includes(q) || tz.value.toLowerCase().includes(q),
    );
    const map = new Map<string, typeof COMMON_TIMEZONES>();
    filtered.forEach(tz => {
      if (!map.has(tz.region)) map.set(tz.region, []);
      map.get(tz.region)!.push(tz);
    });
    return Array.from(map.entries());
  }, [search]);

  const effectiveSelection = customTz.trim() || selected;
  const selectionValid = isValidTz(effectiveSelection);
  const isDirty = effectiveSelection !== currentTz;

  const handleSave = async () => {
    if (!selectionValid) {
      toast.error(bn ? 'অবৈধ টাইমজোন' : 'Invalid timezone');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          {
            key: 'app_timezone',
            value: { timezone: effectiveSelection },
            description: 'Global IANA timezone applied to all date/time displays across the app',
          },
          { onConflict: 'key' },
        );
      if (error) throw error;
      setAppTimezoneCache(effectiveSelection);
      setCustomTz('');
      toast.success(bn ? 'টাইমজোন সংরক্ষিত' : 'Timezone saved');
    } catch (e: any) {
      toast.error(e?.message || (bn ? 'সংরক্ষণে ত্রুটি' : 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = () => {
    setCustomTz('');
    setSelected(DEFAULT_APP_TZ);
  };

  const deviceTz = getDeviceTz();
  const previewLabel = formatDateTimeInTz(now, effectiveSelection);
  const offsetLabel = getTzOffsetLabel(effectiveSelection);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header card */}
      <div className="card-elevated p-5">
        <h3 className="font-display font-bold text-foreground mb-1 flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          {bn ? 'গ্লোবাল টাইমজোন' : 'Global Timezone'}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          {bn
            ? 'এই টাইমজোন পুরো অ্যাপের সব তারিখ ও সময় প্রদর্শনে ব্যবহার হবে। সব ভিজিটর এবং অ্যাডমিন একই সময় দেখবে।'
            : 'This timezone is used for every date/time display across the entire app. All visitors and admins see the same time.'}
        </p>

        {/* Live preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/40">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              {bn ? 'বর্তমান (সংরক্ষিত)' : 'Current (Saved)'}
            </p>
            <p className="text-sm font-mono font-bold text-foreground">{currentTz}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{getTzOffsetLabel(currentTz)}</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/40">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              {bn ? 'নির্বাচিত (প্রিভিউ)' : 'Selected (Preview)'}
            </p>
            <p className="text-sm font-mono font-bold text-foreground truncate" title={effectiveSelection}>
              {effectiveSelection || '—'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{offsetLabel || (bn ? 'অবৈধ' : 'Invalid')}</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/50 border border-border">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              {bn ? 'লাইভ ঘড়ি' : 'Live Clock'}
            </p>
            <p className="text-sm font-mono font-bold text-foreground">{previewLabel}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {bn ? 'ডিভাইস' : 'Device'}: {deviceTz}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={bn ? 'টাইমজোন খুঁজুন (যেমন: Dhaka, Riyadh, UTC)' : 'Search timezone (e.g. Dhaka, Riyadh, UTC)'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Region-grouped list */}
        <div className="max-h-[360px] overflow-auto rounded-xl border border-border bg-background/40">
          {grouped.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">
              {bn ? 'কোনো ফলাফল নেই' : 'No matches'}
            </p>
          ) : (
            grouped.map(([region, tzs]) => (
              <div key={region} className="border-b border-border last:border-b-0">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 sticky top-0">
                  {region}
                </p>
                {tzs.map(tz => {
                  const active = !customTz.trim() && selected === tz.value;
                  return (
                    <button
                      key={tz.value}
                      type="button"
                      onClick={() => { setCustomTz(''); setSelected(tz.value); }}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60 ${
                        active ? 'bg-primary/10 text-primary' : 'text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {active && <CheckCircle2 className="w-4 h-4" />}
                        <span>
                          <span className="font-medium">{tz.label}</span>
                          <span className="block text-[11px] text-muted-foreground font-mono">{tz.value}</span>
                        </span>
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">{getTzOffsetLabel(tz.value)}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Custom IANA */}
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground mb-1.5">
            {bn ? 'কাস্টম IANA টাইমজোন' : 'Custom IANA Timezone'}
          </p>
          <Input
            placeholder="e.g. Africa/Nairobi"
            value={customTz}
            onChange={(e) => setCustomTz(e.target.value)}
            className={customTz && !isValidTz(customTz) ? 'border-destructive' : ''}
          />
          {customTz && !isValidTz(customTz) && (
            <p className="text-[11px] text-destructive mt-1">
              {bn ? 'অবৈধ IANA টাইমজোন স্ট্রিং' : 'Not a valid IANA timezone string'}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground mt-1">
            {bn
              ? 'উপরের তালিকায় না থাকলে যেকোনো IANA টাইমজোন এখানে লিখুন।'
              : 'Type any IANA timezone here if it is not in the list above.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 mt-5">
          <Button
            onClick={handleSave}
            disabled={saving || !isDirty || !selectionValid}
            className="btn-primary-gradient"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {bn ? 'টাইমজোন সংরক্ষণ করুন' : 'Save Timezone'}
          </Button>
          <Button
            variant="outline"
            onClick={handleResetDefault}
            disabled={saving}
          >
            {bn ? 'ডিফল্টে রিসেট (Asia/Dhaka)' : 'Reset to Default (Asia/Dhaka)'}
          </Button>
          {!isDirty && !customTz && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {bn ? 'সংরক্ষিত' : 'Saved'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimezoneSettings;
