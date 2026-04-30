import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface RateLimitRow {
  id: string;
  action: string;
  max_requests: number;
  window_seconds: number;
  enabled: boolean;
  description: string | null;
}

const ACTION_LABELS_BN: Record<string, string> = {
  user_create_admin: 'ইউজার তৈরি (প্রতি অ্যাডমিন)',
  user_create_ip: 'ইউজার তৈরি (প্রতি IP)',
  user_sensitive_admin: 'সংবেদনশীল কাজ (প্রতি অ্যাডমিন)',
  user_sensitive_ip: 'সংবেদনশীল কাজ (প্রতি IP)',
  otp_send_email: 'OTP পাঠানো (প্রতি ইমেইল)',
  otp_send_ip: 'OTP পাঠানো (প্রতি IP)',
  otp_send_phone: 'OTP পাঠানো (প্রতি মোবাইল/মিনিট)',
  otp_send_phone_hourly: 'OTP পাঠানো (প্রতি মোবাইল/ঘণ্টা)',
  otp_send_user: 'OTP পাঠানো (প্রতি ইউজার/মিনিট)',
  otp_send_user_hourly: 'OTP পাঠানো (প্রতি ইউজার/ঘণ্টা)',
  otp_verify_email: 'OTP যাচাই (প্রতি ইমেইল)',
  otp_verify_ip: 'OTP যাচাই (প্রতি IP)',
  otp_verify_phone: 'OTP যাচাই (প্রতি মোবাইল/মিনিট)',
  otp_verify_phone_hourly: 'OTP যাচাই (প্রতি মোবাইল/ঘণ্টা)',
  otp_verify_user: 'OTP যাচাই (প্রতি ইউজার/মিনিট)',
  otp_verify_user_hourly: 'OTP যাচাই (প্রতি ইউজার/ঘণ্টা)',
  duplicate_check: 'ডুপ্লিকেট চেক (প্রতি অ্যাডমিন)',
};

export default function RateLimitSettings() {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [rows, setRows] = useState<RateLimitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rate_limit_config')
      .select('*')
      .order('action');
    if (error) toast.error(bn ? 'লোড করতে ব্যর্থ' : 'Failed to load');
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<RateLimitRow>) => {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };

  const save = async (row: RateLimitRow) => {
    if (row.max_requests < 1 || row.window_seconds < 1) {
      toast.error(bn ? 'সঠিক মান দিন' : 'Invalid values');
      return;
    }
    setSaving(row.id);
    const { error } = await supabase
      .from('rate_limit_config')
      .update({
        max_requests: row.max_requests,
        window_seconds: row.window_seconds,
        enabled: row.enabled,
      })
      .eq('id', row.id);
    setSaving(null);
    if (error) toast.error(error.message);
    else toast.success(bn ? '✅ সংরক্ষিত' : '✅ Saved');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <Card className="rounded-[28px] p-6 bg-white/70 backdrop-blur-xl border-emerald-100/60">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-emerald-600" />
        <h3 className="text-lg font-semibold">
          {bn ? 'রেট লিমিট কনফিগারেশন' : 'Rate Limit Configuration'}
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        {bn
          ? 'ব্রুট-ফোর্স ও স্প্যাম প্রতিরোধে প্রতিটি action-এর জন্য নির্দিষ্ট সময়ে সর্বোচ্চ অনুরোধ সংখ্যা নির্ধারণ করুন। (super_admin বাইপাস করতে পারেন)'
          : 'Limit max requests per window for each action to prevent brute-force and spam. (super_admin bypasses)'}
      </p>
      <div className="space-y-3">
        {rows.map(row => (
          <div
            key={row.id}
            className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 rounded-[20px] bg-white/60 border border-emerald-100/50 hover:-translate-y-[2px] transition-transform"
          >
            <div className="md:col-span-4">
              <div className="text-sm font-medium">
                {bn ? ACTION_LABELS_BN[row.action] || row.action : row.action}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{row.description}</div>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">{bn ? 'সর্বোচ্চ অনুরোধ' : 'Max Requests'}</Label>
              <Input
                type="number"
                min={1}
                value={row.max_requests}
                onChange={e => update(row.id, { max_requests: parseInt(e.target.value) || 1 })}
                className="h-9"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">{bn ? 'উইন্ডো (সেকেন্ড)' : 'Window (sec)'}</Label>
              <Input
                type="number"
                min={1}
                value={row.window_seconds}
                onChange={e => update(row.id, { window_seconds: parseInt(e.target.value) || 1 })}
                className="h-9"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2 pb-1">
              <Switch
                checked={row.enabled}
                onCheckedChange={v => update(row.id, { enabled: v })}
              />
              <span className="text-xs">{row.enabled ? (bn ? 'সক্রিয়' : 'Enabled') : (bn ? 'নিষ্ক্রিয়' : 'Disabled')}</span>
            </div>
            <div className="md:col-span-2">
              <Button
                size="sm"
                onClick={() => save(row)}
                disabled={saving === row.id}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />{bn ? 'সংরক্ষণ' : 'Save'}</>}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
