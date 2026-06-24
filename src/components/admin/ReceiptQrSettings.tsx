import { useEffect, useState } from 'react';
import { QrCode, Save, Loader2, RotateCcw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

const DEFAULT_TTL = 365;

const ReceiptQrSettings = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [ttlDays, setTtlDays] = useState<number>(DEFAULT_TTL);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [savedTtl, setSavedTtl] = useState<number>(DEFAULT_TTL);
  const [savedRotate, setSavedRotate] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('key,value')
        .in('key', ['receipt_qr_ttl_days', 'receipt_qr_auto_rotate']);
      const map = new Map((data || []).map((r: any) => [r.key, r.value]));
      const ttlRaw = map.get('receipt_qr_ttl_days');
      const rotRaw = map.get('receipt_qr_auto_rotate');
      const ttl = typeof ttlRaw === 'number' ? ttlRaw : Number(ttlRaw) || DEFAULT_TTL;
      const rot = typeof rotRaw === 'boolean' ? rotRaw : rotRaw !== false;
      setTtlDays(ttl);
      setAutoRotate(rot);
      setSavedTtl(ttl);
      setSavedRotate(rot);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const isDirty = ttlDays !== savedTtl || autoRotate !== savedRotate;
  const ttlValid = Number.isFinite(ttlDays) && ttlDays >= 1 && ttlDays <= 3650;

  const handleSave = async () => {
    if (!ttlValid) {
      toast.error(bn ? 'TTL ১ থেকে ৩৬৫০ দিনের মধ্যে হতে হবে' : 'TTL must be between 1 and 3650 days');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('app_settings').upsert(
        [
          {
            key: 'receipt_qr_ttl_days',
            value: ttlDays as any,
            description: 'Receipt QR validity in days. Tokens older than this are auto-rotated on next request.',
          },
          {
            key: 'receipt_qr_auto_rotate',
            value: autoRotate as any,
            description: 'When true, expired/aged-out QR tokens are automatically replaced on next request.',
          },
        ],
        { onConflict: 'key' },
      );
      if (error) throw error;
      setSavedTtl(ttlDays);
      setSavedRotate(autoRotate);
      toast.success(bn ? 'রিসিট QR সেটিংস সংরক্ষিত' : 'Receipt QR settings saved');
    } catch (e: any) {
      toast.error(e?.message || (bn ? 'সংরক্ষণে ত্রুটি' : 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTtlDays(DEFAULT_TTL);
    setAutoRotate(true);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="card-elevated p-5">
        <h3 className="font-display font-bold text-foreground mb-1 flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          {bn ? 'রিসিট QR টোকেন এক্সপায়ারি ও রোটেশন' : 'Receipt QR Token Expiry & Rotation'}
        </h3>
        <p className="text-xs text-muted-foreground mb-5">
          {bn
            ? 'প্রতিটি রিসিটের QR টোকেন কত দিন বৈধ থাকবে এবং মেয়াদোত্তীর্ণ টোকেন স্বয়ংক্রিয়ভাবে নতুন টোকেন দিয়ে প্রতিস্থাপন হবে কিনা তা নির্ধারণ করুন।'
            : 'Control how long each receipt’s QR token stays valid, and whether expired tokens are automatically replaced on next request.'}
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {bn ? 'লোড হচ্ছে…' : 'Loading…'}
          </div>
        ) : (
          <div className="space-y-5">
            {/* TTL */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                {bn ? 'টোকেন বৈধতা (দিন)' : 'Token Validity (days)'}
              </label>
              <Input
                type="number"
                min={1}
                max={3650}
                value={Number.isFinite(ttlDays) ? ttlDays : '' || ''}
                onChange={(e) => setTtlDays(parseInt(e.target.value, 10))}
                className={!ttlValid ? 'border-destructive max-w-[180px]' : 'max-w-[180px]'}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {bn
                  ? 'এই দিনের পর QR কোড স্ক্যান করলে EXPIRED দেখাবে। সাধারণ মান: ৩৬৫ দিন।'
                  : 'After this many days, scanning the QR returns EXPIRED. Typical: 365 days.'}
              </p>
            </div>

            {/* Auto rotate */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-border bg-secondary/40">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-primary" />
                  {bn ? 'অটো-রোটেশন' : 'Auto-rotation'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {bn
                    ? 'চালু থাকলে: মেয়াদোত্তীর্ণ টোকেন রিকোয়েস্ট হলে পুরোনোটি বাতিল হয়ে নতুন QR ইস্যু হবে। বন্ধ থাকলে: পুরোনো টোকেনই থাকবে এবং স্ক্যান EXPIRED দেখাবে।'
                    : 'When ON: an aged-out token is revoked and a fresh QR is issued on next request. When OFF: the stale token remains and scans return EXPIRED.'}
                </p>
              </div>
              <Switch checked={autoRotate} onCheckedChange={setAutoRotate} />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                onClick={handleSave}
                disabled={saving || !isDirty || !ttlValid}
                className="btn-primary-gradient"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {bn ? 'সংরক্ষণ করুন' : 'Save Settings'}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={saving}>
                {bn ? 'ডিফল্টে রিসেট (৩৬৫ দিন, অটো-রোটেট)' : 'Reset to Default (365 days, auto-rotate)'}
              </Button>
              {!isDirty && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {bn ? 'সংরক্ষিত' : 'Saved'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptQrSettings;
