import { useEffect, useState } from 'react';
import { ShieldCheck, Save, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  APPROVAL_SETTING_KEY,
  DEFAULT_APPROVAL_SETTINGS,
  normalizeApprovalSettings,
  primeApprovalSettings,
  type ApprovalWorkflowSettings as Settings,
} from '@/hooks/useApprovalSettings';

const NON_ADMIN_ROLES = ['staff', 'teacher', 'administrative', 'support', 'general'] as const;

const ROLE_LABELS: Record<string, { bn: string; en: string }> = {
  staff: { bn: 'স্টাফ', en: 'Staff' },
  teacher: { bn: 'শিক্ষক', en: 'Teacher' },
  administrative: { bn: 'প্রশাসনিক', en: 'Administrative' },
  support: { bn: 'সাপোর্ট', en: 'Support' },
  general: { bn: 'সাধারণ', en: 'General' },
};

const ACTION_LABELS: { id: 'add' | 'edit' | 'delete' | 'reject'; bn: string; en: string }[] = [
  { id: 'add', bn: 'নতুন সংযোজন', en: 'Create / Add' },
  { id: 'edit', bn: 'সম্পাদনা', en: 'Edit / Update' },
  { id: 'delete', bn: 'মুছে ফেলা', en: 'Delete' },
  { id: 'reject', bn: 'প্রত্যাখ্যান', en: 'Reject' },
];

const ApprovalWorkflowSettings = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [settings, setSettings] = useState<Settings>(DEFAULT_APPROVAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', APPROVAL_SETTING_KEY)
        .maybeSingle();
      setSettings(normalizeApprovalSettings(data?.value));
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('app_settings').upsert(
      [
        {
          key: APPROVAL_SETTING_KEY,
          value: settings as any,
          description: 'Global approval workflow: non-admin actions go to /admin/approvals before taking effect',
        },
      ],
      { onConflict: 'key' },
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    primeApprovalSettings(settings);
    toast.success(bn ? 'সেভ হয়েছে' : 'Saved');
  };

  const toggleRole = (r: string) => {
    setSettings((s) => ({
      ...s,
      exempt_roles: s.exempt_roles.includes(r) ? s.exempt_roles.filter((x) => x !== r) : [...s.exempt_roles, r],
    }));
  };

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
          <ShieldCheck className="w-5 h-5 text-primary" />
          {bn ? 'অনুমোদন ওয়ার্কফ্লো (এডমিন অনুমোদন)' : 'Approval Workflow (Admin Approval)'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {bn
            ? 'চালু থাকলে এডমিন/সুপার এডমিন ছাড়া অন্য সব ব্যবহারকারীর সংযোজন, সম্পাদনা ও মুছে ফেলার কাজ সরাসরি কার্যকর না হয়ে “অনুমোদন” পেজে (/admin/approvals) জমা হবে। এডমিন অনুমোদন বা প্রত্যাখ্যান করার পরই তা কার্যকর হবে।'
            : 'When on, add/edit/delete actions by any non-admin user are held for review on /admin/approvals instead of applying instantly. They take effect only after an admin approves.'}
        </p>

        <div className="flex items-center justify-between rounded-2xl border border-border/60 p-4">
          <div>
            <p className="font-semibold text-foreground">{bn ? 'অনুমোদন বাধ্যতামূলক করুন' : 'Require approval'}</p>
            <p className="text-xs text-muted-foreground">
              {bn ? 'মাস্টার অন/অফ সুইচ — সব নন-এডমিন ব্যবহারকারীর জন্য প্রযোজ্য' : 'Master on/off switch — applies to all non-admin users'}
            </p>
          </div>
          <Switch checked={settings.enabled} onCheckedChange={(v) => setSettings((s) => ({ ...s, enabled: v }))} />
        </div>

        <div className={`mt-4 space-y-3 ${settings.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
          <p className="text-sm font-semibold text-foreground">{bn ? 'কোন কাজগুলোতে অনুমোদন লাগবে' : 'Actions that need approval'}</p>
          {ACTION_LABELS.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-border/50 px-4 py-3">
              <span className="text-sm">{bn ? a.bn : a.en}</span>
              <Switch
                checked={settings.actions[a.id]}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, actions: { ...s.actions, [a.id]: v } }))}
              />
            </div>
          ))}

          <p className="text-sm font-semibold text-foreground pt-2">
            {bn ? 'অব্যাহতিপ্রাপ্ত রোল (অনুমোদন ছাড়াই কাজ করতে পারবে)' : 'Exempt roles (can act without approval)'}
          </p>
          <div className="flex flex-wrap gap-2">
            {NON_ADMIN_ROLES.map((r) => {
              const active = settings.exempt_roles.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    active ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {bn ? ROLE_LABELS[r].bn : ROLE_LABELS[r].en}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {bn
              ? 'নির্দিষ্ট ব্যবহারকারীর জন্য আলাদা নিয়ম দরকার হলে /admin/user-management → অনুমতি ট্যাব থেকে প্রতি মেনুতে অনুমোদন টগল করা যাবে। জমা হওয়া অনুরোধগুলো /admin/approvals পেজে দেখা যাবে।'
              : 'For per-user rules, use /admin/user-management → Permissions to toggle approval per menu. Submitted requests appear on /admin/approvals.'}
          </span>
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

export default ApprovalWorkflowSettings;
