import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Save, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { invalidatePasswordPolicyCache, DEFAULT_POLICY, type PasswordPolicy } from '@/hooks/usePasswordPolicy';
import { format } from 'date-fns';

const AdminPasswordPolicy = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { user } = useAuth();
  const [policy, setPolicy] = useState<PasswordPolicy>(DEFAULT_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  const loadAll = async () => {
    setLoading(true);
    const { data: p } = await supabase.from('password_policy').select('*').eq('id', 1).maybeSingle();
    if (p) setPolicy(p as any);
    const { data: ev } = await supabase
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setEvents(ev || []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const save = async () => {
    if (policy.min_length < 6 || policy.min_length > 64) {
      toast.error(bn ? 'ন্যূনতম দৈর্ঘ্য ৬-৬৪ এর মধ্যে হতে হবে' : 'Min length must be 6-64');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('password_policy').update({
      min_length: policy.min_length,
      require_uppercase: policy.require_uppercase,
      require_lowercase: policy.require_lowercase,
      require_number: policy.require_number,
      require_special: policy.require_special,
      block_leaked_passwords: policy.block_leaked_passwords,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    invalidatePasswordPolicyCache();
    toast.success(bn ? 'পলিসি সংরক্ষিত' : 'Policy saved');
    loadAll();
  };

  const eventLabel = (t: string) => {
    const map: Record<string, { bn: string; en: string; sev: 'default' | 'destructive' | 'secondary' }> = {
      weak_password_rejected: { bn: 'দুর্বল পাসওয়ার্ড প্রত্যাখ্যাত', en: 'Weak password rejected', sev: 'destructive' },
      password_change_success: { bn: 'পাসওয়ার্ড পরিবর্তন সফল', en: 'Password changed', sev: 'default' },
      password_change_failed: { bn: 'পাসওয়ার্ড পরিবর্তন ব্যর্থ', en: 'Password change failed', sev: 'destructive' },
      otp_failed: { bn: 'OTP ব্যর্থ', en: 'OTP failed', sev: 'destructive' },
      otp_success: { bn: 'OTP সফল', en: 'OTP success', sev: 'default' },
      login_failed: { bn: 'লগইন ব্যর্থ', en: 'Login failed', sev: 'destructive' },
    };
    return map[t] || { bn: t, en: t, sev: 'secondary' as const };
  };

  return (
    <AdminLayout>
      <div className="max-w-[1440px] mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{bn ? 'পাসওয়ার্ড পলিসি ও নিরাপত্তা লগ' : 'Password Policy & Security Log'}</h1>
            <p className="text-sm text-muted-foreground">{bn ? 'পাসওয়ার্ডের নিয়ম নিয়ন্ত্রণ এবং নিরাপত্তা ইভেন্ট পর্যবেক্ষণ করুন' : 'Manage password rules and audit security events'}</p>
          </div>
        </div>

        {/* Policy card */}
        <div className="bg-card/60 backdrop-blur-xl border rounded-[45px] p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-semibold">{bn ? 'পলিসি সেটিংস' : 'Policy Settings'}</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />{bn ? 'লোড হচ্ছে...' : 'Loading...'}</div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{bn ? 'ন্যূনতম দৈর্ঘ্য' : 'Minimum Length'} (6-64)</Label>
                  <Input type="number" min={6} max={64} value={policy.min_length}
                    onChange={e => setPolicy({ ...policy, min_length: parseInt(e.target.value) || 8 })} />
                </div>
                <div className="space-y-3">
                  {([
                    ['require_uppercase', bn ? 'বড় হাতের অক্ষর (A-Z) আবশ্যক' : 'Require uppercase (A-Z)'],
                    ['require_lowercase', bn ? 'ছোট হাতের অক্ষর (a-z) আবশ্যক' : 'Require lowercase (a-z)'],
                    ['require_number', bn ? 'সংখ্যা (0-9) আবশ্যক' : 'Require number (0-9)'],
                    ['require_special', bn ? 'বিশেষ চিহ্ন (!@#$) আবশ্যক' : 'Require special character'],
                    ['block_leaked_passwords', bn ? 'ফাঁস হওয়া পাসওয়ার্ড ব্লক (HIBP)' : 'Block leaked passwords (HIBP)'],
                  ] as const).map(([k, label]) => (
                    <div key={k} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                      <span className="text-sm">{label}</span>
                      <Switch checked={(policy as any)[k]} onCheckedChange={v => setPolicy({ ...policy, [k]: v } as any)} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 text-amber-700 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{bn ? 'পরিবর্তন সকল নতুন পাসওয়ার্ড সেট/পরিবর্তনে কার্যকর হবে।' : 'Changes apply to all new password set/change operations.'}</span>
              </div>
              <Button onClick={save} disabled={saving} className="btn-primary-gradient">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {bn ? 'সংরক্ষণ করুন' : 'Save Policy'}
              </Button>
            </>
          )}
        </div>

        {/* Events */}
        <div className="bg-card/60 backdrop-blur-xl border rounded-[45px] p-6 md:p-8">
          <h2 className="text-lg font-semibold mb-4">{bn ? 'সাম্প্রতিক নিরাপত্তা ইভেন্ট (১০০)' : 'Recent Security Events (100)'}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-3">{bn ? 'সময়' : 'Time'}</th>
                  <th className="py-2 pr-3">{bn ? 'ইভেন্ট' : 'Event'}</th>
                  <th className="py-2 pr-3">{bn ? 'ইমেইল' : 'Email'}</th>
                  <th className="py-2 pr-3">{bn ? 'কারণ' : 'Reason'}</th>
                  <th className="py-2 pr-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">{bn ? 'কোনো ইভেন্ট নেই' : 'No events'}</td></tr>
                )}
                {events.map(e => {
                  const lbl = eventLabel(e.event_type);
                  return (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{format(new Date(e.created_at), 'dd/MM/yyyy HH:mm')}</td>
                      <td className="py-2 pr-3"><Badge variant={lbl.sev}>{bn ? lbl.bn : lbl.en}</Badge></td>
                      <td className="py-2 pr-3">{e.email || '-'}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{e.reason || '-'}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{e.ip_address || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPasswordPolicy;
