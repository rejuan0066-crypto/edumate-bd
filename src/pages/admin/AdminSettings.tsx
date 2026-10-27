import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';
import { usePersistentTab } from '@/hooks/usePersistentTab';
import { Save, Shield, Bell, Palette, Mail, Loader2, Eye, EyeOff, Globe, ArrowRight, CheckCircle2, AlertCircle, Send, CreditCard, MessageSquare, Wallet, Clock, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { otpService } from '@/hooks/useOtpService';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import { ShieldAlert } from 'lucide-react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import PaymentGatewaySettings from '@/components/admin/PaymentGatewaySettings';
import SmsGatewaySettings from '@/components/admin/SmsGatewaySettings';
import WhatsAppSettings from '@/components/admin/WhatsAppSettings';
import WhatsAppTemplatesManager from '@/components/admin/WhatsAppTemplatesManager';
import SalaryWorkflowSettings from '@/components/admin/SalaryWorkflowSettings';
import TimezoneSettings from '@/components/admin/TimezoneSettings';
import ReceiptQrSettings from '@/components/admin/ReceiptQrSettings';
import QuranDefaultsSettings from '@/components/admin/QuranDefaultsSettings';
import AttendanceDuplicateSettings from '@/components/admin/AttendanceDuplicateSettings';
import RateLimitSettings from '@/components/admin/RateLimitSettings';
import ApprovalWorkflowSettings from '@/components/admin/ApprovalWorkflowSettings';
import { SecurityBackupPanel } from '@/components/admin/SecurityBackupPanel';
import BackgroundSettings from '@/components/admin/BackgroundSettings';
import DeletionSecurityPanel from '@/components/settings/DeletionSecurityPanel';
import { useConfirm } from "@/contexts/ConfirmContext";

const VALID_SETTINGS_TABS = [
  'email', 'payment', 'sms', 'whatsapp', 'security', 'general',
  'salary_workflow', 'timezone', 'receipt_qr', 'approvals', 'quran',
  'attendance_dup'
] as const;
type SettingsTab = typeof VALID_SETTINGS_TABS[number];

const AdminSettings = () => {
  const confirm = useConfirm();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { role } = useAuth();
  const isAdmin = isAdminRole(role);
  const { canViewPage, canEditItem } = usePagePermissions('/admin/settings');
  const { settings: websiteSettings, updateSetting } = useWebsiteSettings();
  const [settingsTab, setSettingsTab] = usePersistentTab<SettingsTab>('email', {
    paramName: 'tab',
    validTabs: VALID_SETTINGS_TABS,
    storageKey: 'edumate_settings_tab',
  });
  const [emailProvider, setEmailProvider] = useState<'emailjs' | 'custom_domain'>('emailjs');
  const [settings, setSettings] = useState({
    twoFactorAuth: true,
    otpExpiry: '5',
    maxOtpAttempts: '3',
    emailNotifications: true,
    smsNotifications: false,
    autoApproveAdmission: false,
    maintenanceMode: false,
  });

  // EmailJS config
  const [emailjs, setEmailjs] = useState({
    service_id: '',
    template_id: '',
    public_key: '',
    is_enabled: false,
    otp_expiry_minutes: 10,
  });
  const [emailjsLoading, setEmailjsLoading] = useState(true);
  const [emailjsSaving, setEmailjsSaving] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [emailjsTesting, setEmailjsTesting] = useState(false);
  const [testEmailDialog, setTestEmailDialog] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  // SMTP profiles (multi)
  type SmtpProfile = {
    id?: string;
    name: string;
    purpose: 'all' | 'otp' | 'welcome' | 'notice' | 'bulk' | 'transactional' | 'auth';
    priority: number;
    smtp_host: string;
    smtp_port: number;
    smtp_username: string;
    smtp_password: string;
    from_email: string;
    from_name: string;
    is_enabled: boolean;
    use_tls: boolean;
    notes?: string | null;
    _new?: boolean;
    _dirty?: boolean;
  };
  const newSmtpProfile = (overrides: Partial<SmtpProfile> = {}): SmtpProfile => ({
    name: 'New SMTP Profile',
    purpose: 'all',
    priority: 0,
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
    is_enabled: false,
    use_tls: true,
    notes: '',
    _new: true,
    _dirty: true,
    ...overrides,
  });
  const [smtpProfiles, setSmtpProfiles] = useState<SmtpProfile[]>([]);
  const [smtpLoading, setSmtpLoading] = useState(true);
  const [savingProfileIdx, setSavingProfileIdx] = useState<number | null>(null);
  const [showSmtpPasswordIdx, setShowSmtpPasswordIdx] = useState<number | null>(null);
  const [smtpTestDialog, setSmtpTestDialog] = useState(false);
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestProfileIdx, setSmtpTestProfileIdx] = useState<number | null>(null);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string; hint?: string; profile?: string } | null>(null);

  // OTP test (live end-to-end via send-otp)
  const [otpTestDialog, setOtpTestDialog] = useState(false);
  const [otpTestEmail, setOtpTestEmail] = useState('');
  const [otpTesting, setOtpTesting] = useState(false);
  const [otpTestResult, setOtpTestResult] = useState<{ success: boolean; method?: string; message: string } | null>(null);

  const runOtpTest = async () => {
    if (!otpTestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(otpTestEmail)) {
      toast.error(bn ? 'সঠিক ইমেইল দিন' : 'Enter a valid email');
      return;
    }
    setOtpTesting(true);
    setOtpTestResult(null);
    try {
      // Use the SHARED OTP service — never call the edge function directly.
      // This guarantees identical cooldown / rate-limit / EmailJS handling
      // as every other OTP flow in the app.
      const result = await otpService.testSendOtp(otpTestEmail);

      if (!result.success) {
        const msg = result.message || (bn ? 'OTP পাঠানো ব্যর্থ' : 'Failed to send OTP');
        setOtpTestResult({ success: false, message: msg });
        if (result.errorCode === 'COOLDOWN_ACTIVE' && result.retryAfterSeconds) {
          toast.error(bn
            ? `কুলডাউন সক্রিয় — ${result.retryAfterSeconds} সেকেন্ড অপেক্ষা করুন`
            : `Cooldown active — wait ${result.retryAfterSeconds}s`);
        } else {
          toast.error(bn ? 'OTP টেস্ট ব্যর্থ' : 'OTP test failed');
        }
        return;
      }

      const method = result.method || 'unknown';
      setOtpTestResult({
        success: true,
        method,
        message: bn
          ? `OTP পাঠানো হয়েছে — পথ: ${method.toUpperCase()}। ইনবক্স/স্প্যাম দেখুন।`
          : `OTP sent — path: ${method.toUpperCase()}. Check inbox/spam.`,
      });
      toast.success(bn ? `✅ OTP পাঠানো হয়েছে (${method})` : `✅ OTP sent via ${method}`);
    } catch (e: any) {
      setOtpTestResult({
        success: false,
        message: e?.message || (bn ? 'OTP পাঠানো ব্যর্থ' : 'Failed to send OTP'),
      });
      toast.error(bn ? 'OTP টেস্ট ব্যর্থ' : 'OTP test failed');
    } finally {
      setOtpTesting(false);
    }
  };

  // OTP global config
  const [otpCfg, setOtpCfg] = useState({
    is_enabled: true,
    expiry_minutes: 10,
    max_attempts: 3,
    cooldown_seconds: 60,
    hourly_limit: 5,
    daily_limit: 15,
    require_for_login: true,
    require_for_password_reset: true,
    require_for_email_change: true,
    require_for_password_change: true,
    // Per-role overrides: { admin: { login, password_reset, email_change, password_change }, ... }
    // null/undefined value at any leaf = inherit global require_for_* flag.
    role_overrides: {} as Record<
      'admin' | 'parent' | 'staff' | 'student',
      Partial<Record<'login' | 'password_reset' | 'email_change' | 'password_change', boolean>>
    >,
  });
  const [otpCfgLoading, setOtpCfgLoading] = useState(true);
  const [otpCfgSaving, setOtpCfgSaving] = useState(false);

  const loadOtpConfig = async () => {
    const { data } = await supabase.from('otp_config').select('*').eq('id', 1).maybeSingle();
    if (data) {
      const d = data as any;
      setOtpCfg({
        is_enabled: d.is_enabled,
        expiry_minutes: d.expiry_minutes,
        max_attempts: d.max_attempts,
        cooldown_seconds: d.cooldown_seconds,
        hourly_limit: d.hourly_limit,
        daily_limit: d.daily_limit,
        require_for_login: d.require_for_login ?? true,
        require_for_password_reset: d.require_for_password_reset ?? true,
        require_for_email_change: d.require_for_email_change ?? true,
        require_for_password_change: d.require_for_password_change ?? true,
        role_overrides: (d.role_overrides && typeof d.role_overrides === 'object') ? d.role_overrides : {},
      });
    }
    setOtpCfgLoading(false);
  };

  // Validation: clamp numeric ranges + enforce safe state
  const validateAndNormalizeOtpCfg = () => {
    const clamp = (n: number, min: number, max: number, fb: number) =>
      Math.min(max, Math.max(min, Number.isFinite(n) ? n : fb));
    const next = {
      ...otpCfg,
      expiry_minutes: clamp(otpCfg.expiry_minutes, 1, 60, 10),
      max_attempts: clamp(otpCfg.max_attempts, 1, 10, 3),
      cooldown_seconds: clamp(otpCfg.cooldown_seconds, 10, 600, 60),
      hourly_limit: clamp(otpCfg.hourly_limit, 1, 50, 5),
      daily_limit: clamp(otpCfg.daily_limit, 1, 200, 15),
    };
    // hourly cannot exceed daily
    if (next.hourly_limit > next.daily_limit) next.hourly_limit = next.daily_limit;

    // If master is OFF → all per-flow toggles forced OFF (prevent stale "required" state)
    // and per-role overrides are cleared (they would have no effect anyway).
    if (!next.is_enabled) {
      next.require_for_login = false;
      next.require_for_password_reset = false;
      next.require_for_email_change = false;
      next.require_for_password_change = false;
      next.role_overrides = {} as typeof next.role_overrides;
      return next;
    }

    // ---- Normalize role_overrides matrix ----
    // Rules:
    //  1) Drop any role/flow whose value matches the global flag (no-op override → keep "Inherit").
    //  2) Drop any non-boolean value.
    //  3) Drop empty role buckets so payload stays clean.
    //  4) Restrict to known roles & flows.
    const VALID_ROLES = ['admin', 'parent', 'staff', 'student'] as const;
    const FLOW_TO_GLOBAL: Record<string, keyof typeof next> = {
      login: 'require_for_login',
      password_reset: 'require_for_password_reset',
      email_change: 'require_for_email_change',
      password_change: 'require_for_password_change',
    };
    const cleaned: Record<string, Record<string, boolean>> = {};
    const src = (next.role_overrides || {}) as Record<string, Record<string, unknown>>;
    for (const role of VALID_ROLES) {
      const bucket = src[role];
      if (!bucket || typeof bucket !== 'object') continue;
      const out: Record<string, boolean> = {};
      for (const [flow, globalKey] of Object.entries(FLOW_TO_GLOBAL)) {
        const v = bucket[flow];
        if (typeof v !== 'boolean') continue;
        // Drop overrides that match the global value (no-op)
        if (v === Boolean((next as any)[globalKey])) continue;
        out[flow] = v;
      }
      if (Object.keys(out).length > 0) cleaned[role] = out;
    }
    next.role_overrides = cleaned as typeof next.role_overrides;

    return next;
  };

  const saveOtpConfig = async () => {
    const normalized = validateAndNormalizeOtpCfg();

    // Conflict guard: master ON but every flow OFF — that's a useless config
    if (
      normalized.is_enabled &&
      !normalized.require_for_login &&
      !normalized.require_for_password_reset &&
      !normalized.require_for_email_change &&
      !normalized.require_for_password_change
    ) {
      toast.error(
        bn
          ? 'OTP চালু আছে কিন্তু কোনো ফ্লোতে প্রয়োগ হবে না। কমপক্ষে একটি ফ্লো চালু করুন অথবা মূল সুইচ বন্ধ করুন।'
          : 'OTP is enabled but no flow will use it. Enable at least one flow or turn the master switch off.'
      );
      return;
    }

    // Warning: login OTP off while password reset on can let attackers reset without 2FA
    if (
      normalized.is_enabled &&
      !normalized.require_for_login &&
      normalized.require_for_password_reset
    ) {
      const ok = window.confirm(
        bn
          ? 'সতর্কতা: লগইনে OTP বন্ধ কিন্তু পাসওয়ার্ড রিসেটে চালু — এটি 2FA এর কার্যকারিতা কমাতে পারে। চালিয়ে যাবেন?'
          : 'Warning: Login OTP is OFF but Password Reset OTP is ON — this weakens 2FA. Continue anyway?'
      );
      if (!ok) return;
    }

    // Per-role conflict: if a role disables BOTH login and password_reset OTP, warn.
    const ROLES = ['admin', 'parent', 'staff', 'student'] as const;
    const roleEffective = (role: string, flow: 'login' | 'password_reset' | 'email_change' | 'password_change') => {
      const ov = (normalized.role_overrides as any)?.[role]?.[flow];
      if (typeof ov === 'boolean') return ov;
      const map: Record<string, boolean> = {
        login: normalized.require_for_login,
        password_reset: normalized.require_for_password_reset,
        email_change: normalized.require_for_email_change,
        password_change: normalized.require_for_password_change,
      };
      return map[flow];
    };
    const weakRoles = ROLES.filter(
      (r) => !roleEffective(r, 'login') && roleEffective(r, 'password_reset')
    );
    if (weakRoles.length > 0) {
      const ok = window.confirm(
        bn
          ? `সতর্কতা: ${weakRoles.join(', ')} রোলে লগইন OTP বন্ধ কিন্তু পাসওয়ার্ড রিসেট OTP চালু — 2FA দুর্বল হবে। চালিয়ে যাবেন?`
          : `Warning: For role(s) ${weakRoles.join(', ')}, Login OTP is OFF but Password Reset OTP is ON — this weakens 2FA. Continue anyway?`
      );
      if (!ok) return;
    }

    setOtpCfg(normalized);
    setOtpCfgSaving(true);
    const { error } = await supabase
      .from('otp_config')
      .update({ ...normalized, updated_at: new Date().toISOString() })
      .eq('id', 1);
    setOtpCfgSaving(false);
    if (error) toast.error(bn ? 'OTP সেটিংস সংরক্ষণ ব্যর্থ' : 'Failed to save OTP settings');
    else toast.success(bn ? 'OTP সেটিংস সংরক্ষিত' : 'OTP settings saved');
  };

  useEffect(() => {
    loadEmailjsConfig();
    loadSmtpConfig();
    loadOtpConfig();
  }, []);

  const loadEmailjsConfig = async () => {
    const { data } = await supabase
      .from('emailjs_config')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) {
      setEmailjs({
        service_id: data.service_id,
        template_id: data.template_id,
        public_key: data.public_key,
        is_enabled: data.is_enabled,
        otp_expiry_minutes: data.otp_expiry_minutes,
      });
    }
    setEmailjsLoading(false);
  };

  const saveEmailjsConfig = async () => {
    setEmailjsSaving(true);
    // Check if config exists
    const { data: existing } = await supabase
      .from('emailjs_config')
      .select('id')
      .limit(1)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from('emailjs_config')
        .update({ ...emailjs, updated_at: new Date().toISOString() })
        .eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('emailjs_config').insert(emailjs));
    }

    setEmailjsSaving(false);
    if (error) {
      toast.error(bn ? 'সংরক্ষণ ব্যর্থ' : 'Failed to save');
    } else {
      toast.success(bn ? 'ইমেইল সেটিংস সংরক্ষিত' : 'Email settings saved');
    }
  };

  const loadSmtpConfig = async () => {
    const { data } = await supabase
      .from('smtp_config')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });
    if (data && data.length > 0) {
      setSmtpProfiles(
        data.map((d: any) => ({
          id: d.id,
          name: d.name || 'Default',
          purpose: (d.purpose || 'all') as SmtpProfile['purpose'],
          priority: d.priority ?? 0,
          smtp_host: d.smtp_host,
          smtp_port: d.smtp_port,
          smtp_username: d.smtp_username,
          smtp_password: d.smtp_password,
          from_email: d.from_email,
          from_name: d.from_name,
          is_enabled: d.is_enabled,
          use_tls: d.use_tls,
          notes: d.notes,
          _new: false,
          _dirty: false,
        }))
      );
      if (data.some((d: any) => d.is_enabled)) setEmailProvider('custom_domain');
    } else {
      setSmtpProfiles([]);
    }
    setSmtpLoading(false);
  };

  const updateSmtpProfile = (idx: number, patch: Partial<SmtpProfile>) => {
    setSmtpProfiles((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...patch, _dirty: true } : p))
    );
  };

  const addSmtpProfile = () => {
    setSmtpProfiles((prev) => [...prev, newSmtpProfile({ name: `SMTP Profile ${prev.length + 1}` })]);
  };

  const removeSmtpProfile = async (idx: number) => {
    const target = smtpProfiles[idx];
    if (!(await confirm({ description: bn ? 'এই SMTP প্রোফাইলটি মুছবেন?' : 'Delete this SMTP profile?', variant: 'destructive' }))) return;
    if (target.id && !target._new) {
      const { error } = await supabase.from('smtp_config').delete().eq('id', target.id);
      if (error) {
        toast.error(bn ? 'মুছতে ব্যর্থ' : 'Failed to delete');
        return;
      }
    }
    setSmtpProfiles((prev) => prev.filter((_, i) => i !== idx));
    toast.success(bn ? 'প্রোফাইল মুছে ফেলা হয়েছে' : 'Profile deleted');
  };

  const saveSmtpProfile = async (idx: number) => {
    const profile = smtpProfiles[idx];
    if (!profile.name?.trim()) {
      toast.error(bn ? 'প্রোফাইলের নাম দিন' : 'Enter profile name');
      return;
    }
    setSavingProfileIdx(idx);
    const payload: any = {
      name: profile.name,
      purpose: profile.purpose,
      priority: profile.priority,
      smtp_host: profile.smtp_host,
      smtp_port: profile.smtp_port,
      smtp_username: profile.smtp_username,
      smtp_password: profile.smtp_password,
      from_email: profile.from_email,
      from_name: profile.from_name,
      is_enabled: profile.is_enabled,
      use_tls: profile.use_tls,
      notes: profile.notes ?? '',
      updated_at: new Date().toISOString(),
    };
    let error;
    let savedId = profile.id;
    if (profile.id && !profile._new) {
      ({ error } = await supabase.from('smtp_config').update(payload).eq('id', profile.id));
    } else {
      const { data, error: insErr } = await supabase
        .from('smtp_config')
        .insert(payload)
        .select('id')
        .single();
      error = insErr;
      savedId = data?.id;
    }
    setSavingProfileIdx(null);
    if (error) {
      toast.error(bn ? 'সংরক্ষণ ব্যর্থ' : 'Failed to save');
    } else {
      setSmtpProfiles((prev) =>
        prev.map((p, i) =>
          i === idx ? { ...p, id: savedId || p.id, _new: false, _dirty: false } : p
        )
      );
      toast.success(bn ? `✅ "${profile.name}" সংরক্ষিত` : `✅ "${profile.name}" saved`);
    }
  };

  const toggleSmtpEnabled = async (idx: number, value: boolean) => {
    const profile = smtpProfiles[idx];
    updateSmtpProfile(idx, { is_enabled: value });
    if (profile.id && !profile._new) {
      const { error } = await supabase
        .from('smtp_config')
        .update({ is_enabled: value, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      if (error) {
        toast.error(bn ? 'টগল ব্যর্থ' : 'Toggle failed');
        updateSmtpProfile(idx, { is_enabled: !value });
      } else {
        setSmtpProfiles((prev) =>
          prev.map((p, i) => (i === idx ? { ...p, _dirty: false } : p))
        );
        toast.success(value
          ? (bn ? '✅ সক্রিয় করা হয়েছে' : '✅ Enabled')
          : (bn ? '⏸ নিষ্ক্রিয় করা হয়েছে' : '⏸ Disabled'));
      }
    }
  };

  const openSmtpTest = (idx: number) => {
    const profile = smtpProfiles[idx];
    if (!profile.smtp_host || !profile.smtp_username || !profile.smtp_password || !profile.from_email) {
      toast.error(bn ? 'প্রথমে এই প্রোফাইলের সব তথ্য পূরণ ও সংরক্ষণ করুন' : 'Fill and save profile fields first');
      return;
    }
    setSmtpTestProfileIdx(idx);
    setSmtpTestResult(null);
    setSmtpTestDialog(true);
  };

  const runSmtpTest = async () => {
    if (smtpTestProfileIdx === null) return;
    if (!smtpTestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtpTestEmail)) {
      toast.error(bn ? 'বৈধ টেস্ট ইমেইল দিন' : 'Enter a valid test email');
      return;
    }
    const profile = smtpProfiles[smtpTestProfileIdx];
    setSmtpTesting(true);
    setSmtpTestResult(null);
    try {
      const { data: refreshed } = await supabase.auth.refreshSession();
      const accessToken = refreshed?.session?.access_token
        ?? (await supabase.auth.getSession()).data.session?.access_token;

      let testData: any = null;
      let testErrorMsg: string | null = null;
      let testHint: string | undefined = undefined;

      // 1. Try test-smtp edge function first
      try {
        const { data, error } = await supabase.functions.invoke('test-smtp', {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          body: {
            smtp_host: profile.smtp_host,
            smtp_port: profile.smtp_port,
            smtp_username: profile.smtp_username,
            smtp_password: profile.smtp_password,
            from_email: profile.from_email,
            from_name: profile.from_name,
            use_tls: profile.use_tls,
            test_email: smtpTestEmail,
          },
        });
        if (!error && data?.success) {
          testData = data;
        } else {
          try {
            if (error && 'context' in (error as any) && (error as any).context) {
              const body = await (error as any).context.json();
              if (body?.error) testErrorMsg = body.error;
              if (body?.hint) testHint = body.hint;
            }
          } catch (_) {}
          if (!testErrorMsg) testErrorMsg = data?.error || error?.message;
        }
      } catch (err: any) {
        testErrorMsg = err?.message;
      }

      // 2. If test-smtp gave an auth/token error or failed, run test through the live SMTP sender
      if (!testData?.success && (!testErrorMsg || testErrorMsg.toLowerCase().includes('unauthorized') || testErrorMsg.toLowerCase().includes('token'))) {
        try {
          const welcomeRes = await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: smtpTestEmail,
              kind: 'other',
              full_name: 'Admin Test',
            },
          });
          if (!welcomeRes.error && welcomeRes.data?.success) {
            testData = welcomeRes.data;
            testErrorMsg = null;
          } else {
            let msg = welcomeRes.data?.error;
            try {
              if (welcomeRes.error && 'context' in (welcomeRes.error as any)) {
                const b = await (welcomeRes.error as any).context.json();
                if (b?.error) msg = b.error;
              }
            } catch (_) {}
            testErrorMsg = msg || welcomeRes.error?.message || testErrorMsg;
          }
        } catch (_) {}
      }

      if (testData?.success) {
        setSmtpTestResult({
          success: true,
          message: testData.message || (bn ? `✅ "${profile.name}" মারফত ${smtpTestEmail} ঠিকানায় টেস্ট ইমেইল সফলভাবে পাঠানো হয়েছে!` : `✅ Test email successfully sent to ${smtpTestEmail}!`),
          profile: profile.name,
        });
        toast.success(bn ? `✅ "${profile.name}" → ${smtpTestEmail}` : `✅ "${profile.name}" → ${smtpTestEmail}`);
      } else {
        const rawErr = testErrorMsg || (bn ? 'ইমেইল পাঠাতে ব্যর্থ হয়েছে' : 'Failed to send email');
        let hint = testHint;

        // Smart diagnosis for Brevo & Gmail errors
        if (rawErr.includes('525') || rawErr.toLowerCase().includes('unauthorized ip address')) {
          hint = bn
            ? '⚠️ Brevo সিকিউরিটি নোটিশ: Brevo সার্ভারলেস ক্লাউড IP ব্লক করেছে। সমাধান: Brevo ড্যাশবোর্ডে লগইন করুন → Settings → Security → Authorized IPs ট্যাবে যান → "Blocking unauthorized IP addresses" অপশনটি Deactivate করুন (অথবা Brevo থেকে আপনার ইমেইলে পাঠানো "Validate your IP address" লিঙ্কে ক্লিক করুন)।'
            : '⚠️ Brevo blocked dynamic cloud IP: Go to Brevo Dashboard → Settings → Security → Authorized IPs and Deactivate "Blocking unauthorized IP addresses".';
        } else if (rawErr.toLowerCase().includes('auth') || rawErr.includes('535')) {
          hint = bn
            ? '⚠️ অথেনটিকেশন ব্যর্থ: আপনার SMTP ইউজারনেম ও পাসওয়ার্ড চেক করুন। Brevo-র ক্ষেত্রে অবশ্যই SMTP Master Key ব্যবহার করুন (সাধারণ লগইন পাসওয়ার্ড নয়)। Gmail-এর ক্ষেত্রে 16-অক্ষরের App Password ব্যবহার করুন।'
            : '⚠️ Authentication failed: Check your SMTP username and password. For Brevo, use your SMTP Master Key.';
        } else if (rawErr.toLowerCase().includes('tls') || rawErr.includes('connect')) {
          hint = bn
            ? '⚠️ কানেকশন সমস্যা: পোর্ট নম্বর (587 STARTTLS অথবা 465 SSL) এবং TLS টগল সঠিক কিনা পরীক্ষা করুন।'
            : '⚠️ Connection issue: Check port (587 / 465) and TLS setting.';
        }

        setSmtpTestResult({
          success: false,
          message: rawErr,
          hint,
          profile: profile.name,
        });
      }

      setSmtpTesting(false);
      return;
    } catch (e: any) {
      setSmtpTestResult({ success: false, message: e?.message || 'Network error', profile: profile.name });
      setSmtpTesting(false);
      return;
    }
  };

  const testEmailjs = async () => {
    if (!testEmail) {
      toast.error(bn ? 'টেস্ট ইমেইল দিন' : 'Enter test email');
      return;
    }
    if (!emailjs.service_id || !emailjs.template_id || !emailjs.public_key) {
      toast.error(bn ? 'প্রথমে EmailJS কনফিগারেশন সম্পূর্ণ করুন' : 'Complete EmailJS configuration first');
      return;
    }
    setEmailjsTesting(true);
    try {
      const { default: emailjsLib } = await import('@emailjs/browser');
      emailjsLib.init(emailjs.public_key);
      await emailjsLib.send(
        emailjs.service_id,
        emailjs.template_id,
        {
          to_email: testEmail,
          email: testEmail,
          reply_to: testEmail,
          to_name: 'Test User',
          otp_code: '123456',
          expiry_minutes: emailjs.otp_expiry_minutes,
          purpose: 'Test Email',
        }
      );
      toast.success(bn ? `✅ টেস্ট ইমেইল পাঠানো হয়েছে: ${testEmail}` : `✅ Test email sent to: ${testEmail}`);
      setTestEmailDialog(false);
    } catch (err: any) {
      console.error('EmailJS test error:', err);
      toast.error(bn ? `❌ ইমেইল পাঠানো ব্যর্থ: ${err?.text || err?.message || 'Unknown error'}` : `❌ Failed to send: ${err?.text || err?.message || 'Unknown error'}`);
    }
    setEmailjsTesting(false);
  };


  if (!isAdmin && !canViewPage) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
          <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-xl font-bold">{bn ? 'অনুমতি নেই' : 'Access Denied'}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {bn ? 'সেটিংস পেজটি দেখার জন্য আপনার পর্যাপ্ত অনুমতি নেই।' : 'You do not have permission to access Settings.'}
          </p>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin && !canViewPage) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
          <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-xl font-bold">{bn ? 'অনুমতি নেই' : 'Access Denied'}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {bn ? 'সেটিংস পেজটি দেখার জন্য আপনার পর্যাপ্ত অনুমতি নেই।' : 'You do not have permission to access Settings.'}
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ── Standard Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {bn ? 'সিস্টেম সেটিংস' : 'System Settings'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {bn ? 'মাদ্রাসার ইমেইল, এসএমএস, পেমেন্ট গেটওয়ে, নিরাপত্তা ও সাধারণ কনফিগারেশন' : 'Manage mailers, SMS gateways, payment channels, security policies and workflows'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-9 rounded-xl font-medium gap-2">
              <a href="/admin/email-templates">
                <Mail className="w-4 h-4" />
                <span className="truncate">{bn ? 'ইমেইল টেমপ্লেট' : 'Email Templates'}</span>
              </a>
            </Button>
          </div>
        </div>

        <Tabs value={settingsTab} onValueChange={(v) => setSettingsTab(v as SettingsTab)} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto p-1 bg-muted/60 border border-border/70 rounded-xl h-auto gap-1">
            <TabsTrigger value="email" className="gap-1.5 text-xs py-1.5 px-3 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
              <Mail className="w-4 h-4" /> {bn ? 'ইমেইল' : 'Email'}
            </TabsTrigger>
            <TabsTrigger value="payment" className="gap-1.5">
              <CreditCard className="w-4 h-4" /> {bn ? 'পেমেন্ট' : 'Payment'}
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1.5">
              <MessageSquare className="w-4 h-4" /> {bn ? 'SMS' : 'SMS'}
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-1.5">
              <MessageSquare className="w-4 h-4" /> WhatsApp
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5">
              <Shield className="w-4 h-4" /> {bn ? 'নিরাপত্তা' : 'Security'}
            </TabsTrigger>
            <TabsTrigger value="general" className="gap-1.5">
              <Palette className="w-4 h-4" /> {bn ? 'সাধারণ' : 'General'}
            </TabsTrigger>
            <TabsTrigger value="salary_workflow" className="gap-1.5">
              <Wallet className="w-4 h-4" /> {bn ? 'বেতন ওয়ার্কফ্লো' : 'Salary Workflow'}
            </TabsTrigger>
            <TabsTrigger value="timezone" className="gap-1.5">
              <Clock className="w-4 h-4" /> {bn ? 'টাইমজোন' : 'Timezone'}
            </TabsTrigger>
            <TabsTrigger value="receipt_qr" className="gap-1.5">
              <Clock className="w-4 h-4" /> {bn ? 'রিসিট QR' : 'Receipt QR'}
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-1.5">
              <Shield className="w-4 h-4" /> {bn ? 'অনুমোদন' : 'Approvals'}
            </TabsTrigger>
            <TabsTrigger value="quran" className="gap-1.5">
              <Mail className="w-4 h-4" /> {bn ? 'কুরআন' : 'Quran'}
            </TabsTrigger>
            <TabsTrigger value="attendance_dup" className="gap-1.5">
              <Clock className="w-4 h-4" /> {bn ? 'হাজিরা ডুপ্লিকেট' : 'Attendance Duplicates'}
            </TabsTrigger>
            <TabsTrigger value="id_format" className="gap-1.5" asChild>
              <a href="/admin/settings/id-format">
                <Hash className="w-4 h-4" /> {bn ? 'আইডি ফরম্যাট' : 'ID Format'}
              </a>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-6">
            <div className="space-y-6 max-w-3xl">

        {/* Email Provider Selection */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" /> {bn ? 'ইমেইল প্রোভাইডার' : 'Email Provider'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => setEmailProvider('emailjs')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                emailProvider === 'emailjs'
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-foreground">EmailJS (Gmail)</span>
                {emailProvider === 'emailjs' && <CheckCircle2 className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground">{bn ? 'ফ্রি — Gmail দিয়ে OTP পাঠান' : 'Free — Send OTP via Gmail'}</p>
              <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">
                {bn ? 'বর্তমান' : 'Current'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setEmailProvider('custom_domain')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                emailProvider === 'custom_domain'
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-foreground">{bn ? 'কাস্টম SMTP ডোমেইন' : 'Custom SMTP Domain'}</span>
                {emailProvider === 'custom_domain' && <CheckCircle2 className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground">{bn ? 'নিজের ডোমেইন থেকে ইমেইল পাঠান' : 'Send emails from your own domain'}</p>
              <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {bn ? 'প্রো' : 'Pro'}
              </span>
            </button>
          </div>
        </div>

        {/* Custom SMTP Configuration — Multi-profile */}
        {emailProvider === 'custom_domain' && (
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
              <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" /> {bn ? 'SMTP কনফিগারেশন (একাধিক প্রোফাইল)' : 'SMTP Configuration (Multi-profile)'}
              </h3>
              <Button onClick={addSmtpProfile} size="sm" className="btn-primary-gradient">
                + {bn ? 'নতুন SMTP যোগ করুন' : 'Add SMTP Profile'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {bn
                ? 'প্রতিটি প্রোফাইলের জন্য আলাদা “উদ্দেশ্য” (যেমন OTP, Welcome, Notice) সেট করতে পারেন। সিস্টেম প্রথমে সেই উদ্দেশ্যের সক্রিয় প্রোফাইল খুঁজবে; না পেলে “সব ধরন (all)” এর প্রোফাইলে fallback করবে।'
                : 'Set a “purpose” per profile (OTP, Welcome, Notice, …). The system first looks for an enabled profile matching that purpose, then falls back to a profile with purpose = “all”.'}
            </p>

            {smtpLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : smtpProfiles.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-xl border-border/60">
                <p className="text-sm text-muted-foreground mb-3">
                  {bn ? 'কোনো SMTP প্রোফাইল নেই। নতুন একটি যোগ করুন।' : 'No SMTP profiles yet. Add one to get started.'}
                </p>
                <Button onClick={addSmtpProfile} className="btn-primary-gradient">
                  + {bn ? 'প্রথম SMTP যোগ করুন' : 'Add first SMTP profile'}
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {smtpProfiles.map((p, idx) => (
                  <div
                    key={p.id || `new-${idx}`}
                    className={`rounded-2xl border p-4 space-y-4 transition-colors ${
                      p.is_enabled ? 'border-primary/40 bg-primary/[0.03]' : 'border-border/60 bg-muted/20'
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                        <Switch
                          checked={p.is_enabled}
                          onCheckedChange={(v) => toggleSmtpEnabled(idx, v)}
                        />
                        <div className="flex-1">
                          <Input
                            value={p.name}
                            onChange={(e) => updateSmtpProfile(idx, { name: e.target.value })}
                            placeholder={bn ? 'প্রোফাইলের নাম' : 'Profile name'}
                            className="font-medium bg-background"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                          p.is_enabled ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {p.is_enabled ? (bn ? 'সক্রিয়' : 'ENABLED') : (bn ? 'নিষ্ক্রিয়' : 'DISABLED')}
                        </span>
                        {p._dirty && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium">
                            {bn ? 'অসংরক্ষিত' : 'UNSAVED'}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSmtpProfile(idx)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {bn ? 'মুছুন' : 'Delete'}
                        </Button>
                      </div>
                    </div>

                    {/* Purpose + priority */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label>{bn ? 'উদ্দেশ্য (Purpose)' : 'Purpose'}</Label>
                        <select
                          className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                          value={p.purpose}
                          onChange={(e) => updateSmtpProfile(idx, { purpose: e.target.value as SmtpProfile['purpose'] })}
                        >
                          <option value="all">{bn ? 'সব ধরন (Default fallback)' : 'All (default fallback)'}</option>
                          <option value="otp">OTP</option>
                          <option value="welcome">{bn ? 'স্বাগত (Welcome)' : 'Welcome'}</option>
                          <option value="notice">{bn ? 'নোটিশ' : 'Notice'}</option>
                          <option value="bulk">{bn ? 'বাল্ক/মাস ইমেইল' : 'Bulk'}</option>
                          <option value="transactional">{bn ? 'ট্রানজেকশনাল' : 'Transactional'}</option>
                          <option value="auth">{bn ? 'অথ/সিস্টেম' : 'Auth/System'}</option>
                        </select>
                      </div>
                      <div>
                        <Label>{bn ? 'প্রাধান্য' : 'Priority'}</Label>
                        <Input
                          type="number"
                          className="mt-1 bg-background"
                          value={p.priority || ''}
                          onChange={(e) => updateSmtpProfile(idx, { priority: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-md bg-secondary/40">
                        <div>
                          <p className="text-xs font-medium">{bn ? 'TLS/SSL' : 'TLS/SSL'}</p>
                          <p className="text-[10px] text-muted-foreground">{bn ? 'নিরাপদ সংযোগ' : 'Secure connection'}</p>
                        </div>
                        <Switch
                          checked={p.use_tls}
                          onCheckedChange={(v) => updateSmtpProfile(idx, { use_tls: v })}
                        />
                      </div>
                    </div>

                    {/* Host / port */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>{bn ? 'SMTP হোস্ট' : 'SMTP Host'} <span className="text-destructive">*</span></Label>
                        <Input
                          className="mt-1 bg-background"
                          value={p.smtp_host}
                          onChange={(e) => updateSmtpProfile(idx, { smtp_host: e.target.value })}
                          placeholder="smtp.gmail.com"
                        />
                      </div>
                      <div>
                        <Label>{bn ? 'SMTP পোর্ট' : 'SMTP Port'} <span className="text-destructive">*</span></Label>
                        <Input
                          type="number"
                          className="mt-1 bg-background"
                          value={p.smtp_port || ''}
                          onChange={(e) => updateSmtpProfile(idx, { smtp_port: parseInt(e.target.value) || 587 })}
                          placeholder="587"
                        />
                      </div>
                    </div>

                    {/* Username / password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>{bn ? 'SMTP ইউজারনেম' : 'SMTP Username'} <span className="text-destructive">*</span></Label>
                        <Input
                          className="mt-1 bg-background"
                          value={p.smtp_username}
                          onChange={(e) => updateSmtpProfile(idx, { smtp_username: e.target.value })}
                          placeholder="your@email.com"
                        />
                      </div>
                      <div>
                        <Label>{bn ? 'SMTP পাসওয়ার্ড' : 'SMTP Password'} <span className="text-destructive">*</span></Label>
                        <div className="relative mt-1">
                          <Input
                            className="bg-background pr-10"
                            type={showSmtpPasswordIdx === idx ? 'text' : 'password'}
                            value={p.smtp_password}
                            onChange={(e) => updateSmtpProfile(idx, { smtp_password: e.target.value })}
                            placeholder={bn ? 'অ্যাপ পাসওয়ার্ড ব্যবহার করুন' : 'Use app password'}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSmtpPasswordIdx(showSmtpPasswordIdx === idx ? null : idx)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showSmtpPasswordIdx === idx ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* From email/name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>{bn ? 'প্রেরকের ইমেইল' : 'From Email'} <span className="text-destructive">*</span></Label>
                        <Input
                          className="mt-1 bg-background"
                          value={p.from_email}
                          onChange={(e) => updateSmtpProfile(idx, { from_email: e.target.value })}
                          placeholder="noreply@yourdomain.com"
                        />
                      </div>
                      <div>
                        <Label>{bn ? 'প্রেরকের নাম' : 'From Name'}</Label>
                        <Input
                          className="mt-1 bg-background"
                          value={p.from_name}
                          onChange={(e) => updateSmtpProfile(idx, { from_name: e.target.value })}
                          placeholder={bn ? 'আপনার প্রতিষ্ঠানের নাম' : 'Your Institution Name'}
                        />
                      </div>
                    </div>

                    {/* Action buttons per profile */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        onClick={() => saveSmtpProfile(idx)}
                        disabled={savingProfileIdx === idx}
                        className="btn-primary-gradient"
                        size="sm"
                      >
                        {savingProfileIdx === idx ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {bn ? 'সংরক্ষণ' : 'Save'}
                      </Button>
                      <Button onClick={() => openSmtpTest(idx)} variant="outline" size="sm">
                        <Mail className="w-4 h-4 mr-2" />
                        {bn ? 'এই প্রোফাইল টেস্ট' : 'Test this profile'}
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex gap-2 pt-2 border-t border-border/40">
                  <Button onClick={() => { setOtpTestResult(null); setOtpTestDialog(true); }} variant="outline">
                    <Send className="w-4 h-4 mr-2" />
                    {bn ? 'লাইভ OTP ফ্লো টেস্ট' : 'Test live OTP flow'}
                  </Button>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-2">
                  <p className="font-medium text-foreground">{bn ? 'সাধারণ SMTP সেটিংস:' : 'Common SMTP Settings:'}</p>
                  <div className="space-y-1">
                    <p><span className="font-medium">Gmail:</span> smtp.gmail.com : 587 (TLS) — {bn ? 'অ্যাপ পাসওয়ার্ড প্রয়োজন' : 'App password required'}</p>
                    <p><span className="font-medium">Zoho:</span> smtp.zoho.com : 587 (TLS)</p>
                    <p><span className="font-medium">Outlook:</span> smtp.office365.com : 587 (TLS)</p>
                    <p><span className="font-medium">Mailtrap:</span> sandbox.smtp.mailtrap.io : 2525</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* OTP Configuration */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-1 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> {bn ? 'OTP কনফিগারেশন' : 'OTP Configuration'}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {bn
              ? 'অ্যাডমিন ২-ধাপ লগইন, পাসওয়ার্ড রিসেট ও ইমেইল ভেরিফিকেশনের জন্য OTP সিস্টেম নিয়ন্ত্রণ করুন।'
              : 'Control OTP system for admin 2-step login, password reset, and email verification.'}
          </p>
          {otpCfgLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
                <div>
                  <p className="text-sm font-medium text-foreground">{bn ? 'OTP সক্রিয়' : 'OTP Enabled'}</p>
                  <p className="text-xs text-muted-foreground">
                    {bn
                      ? 'বন্ধ থাকলে কোনো OTP ইমেইল পাঠানো হবে না (অ্যাডমিন ২-ধাপ ভেরিফিকেশনও নিষ্ক্রিয়)।'
                      : 'When off, no OTP emails will be sent (admin 2-step verification disabled too).'}
                  </p>
                </div>
                <Switch
                  checked={otpCfg.is_enabled}
                  onCheckedChange={(v) => {
                    if (!v) {
                      // Master OFF → cascade all per-flow toggles OFF
                      setOtpCfg({
                        ...otpCfg,
                        is_enabled: false,
                        require_for_login: false,
                        require_for_password_reset: false,
                        require_for_email_change: false,
                        require_for_password_change: false,
                      });
                    } else {
                      // Master ON → restore safe defaults if everything was off
                      const allOff =
                        !otpCfg.require_for_login &&
                        !otpCfg.require_for_password_reset &&
                        !otpCfg.require_for_email_change &&
                        !otpCfg.require_for_password_change;
                      setOtpCfg({
                        ...otpCfg,
                        is_enabled: true,
                        ...(allOff
                          ? {
                              require_for_login: true,
                              require_for_password_reset: true,
                              require_for_email_change: true,
                              require_for_password_change: true,
                            }
                          : {}),
                      });
                    }
                  }}
                />
              </div>

              {/* Per-flow OTP requirement toggles */}
              <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  {bn ? 'কোন কাজে OTP লাগবে?' : 'Where to require OTP?'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {bn
                    ? 'নিচের প্রতিটি ফ্লোতে আলাদাভাবে OTP চালু/বন্ধ করুন। OTP মূল সুইচ বন্ধ থাকলে এগুলোর কোনোটিই কাজ করবে না।'
                    : 'Toggle OTP independently per flow. If the master OTP switch is OFF, none of these apply.'}
                </p>

                {[
                  { key: 'require_for_login', bn: 'অ্যাডমিন লগইনে (২-ধাপ ভেরিফিকেশন)', en: 'Admin Login (2-step verification)' },
                  { key: 'require_for_password_reset', bn: 'পাসওয়ার্ড ফরগেট-এ', en: 'Forgot Password' },
                  { key: 'require_for_email_change', bn: 'ইমেইল পরিবর্তনে', en: 'Email Change' },
                  { key: 'require_for_password_change', bn: 'পাসওয়ার্ড পরিবর্তনে', en: 'Password Change' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm text-foreground">{bn ? item.bn : item.en}</p>
                    <Switch
                      checked={(otpCfg as any)[item.key]}
                      disabled={!otpCfg.is_enabled}
                      onCheckedChange={(v) => setOtpCfg({ ...otpCfg, [item.key]: v } as any)}
                    />
                  </div>
                ))}

                {/* Inline conflict warning */}
                {otpCfg.is_enabled &&
                  !otpCfg.require_for_login &&
                  !otpCfg.require_for_password_reset &&
                  !otpCfg.require_for_email_change &&
                  !otpCfg.require_for_password_change && (
                    <div className="mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                      {bn
                        ? '⚠️ OTP চালু আছে কিন্তু কোনো ফ্লোতে প্রয়োগ হবে না। সংরক্ষণ ব্লক হবে।'
                        : '⚠️ OTP is ON but no flow uses it. Save will be blocked.'}
                    </div>
                  )}
                {otpCfg.is_enabled &&
                  !otpCfg.require_for_login &&
                  otpCfg.require_for_password_reset && (
                    <div className="mt-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-700 dark:text-yellow-400">
                      {bn
                        ? '⚠️ লগইন OTP বন্ধ কিন্তু পাসওয়ার্ড রিসেট OTP চালু — 2FA দুর্বল হতে পারে।'
                        : '⚠️ Login OTP OFF but Password Reset OTP ON — weakens 2FA.'}
                    </div>
                  )}
              </div>

              {/* Per-role × per-flow OTP override matrix */}
              <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-3 mb-4">
                <div>
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    {bn ? 'রোল-ভিত্তিক OTP ম্যাট্রিক্স' : 'Per-Role OTP Matrix'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {bn
                      ? 'প্রতিটি রোলের জন্য আলাদাভাবে OTP চালু/বন্ধ করুন। "—" মানে উপরের গ্লোবাল সেটিংস অনুসরণ করবে।'
                      : 'Override OTP per role × flow. "—" means the global per-flow setting above is used.'}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-separate" style={{ borderSpacing: '0 6px' }}>
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left font-medium px-2 py-1">{bn ? 'রোল' : 'Role'}</th>
                        {([
                          { k: 'login', bn: 'লগইন', en: 'Login' },
                          { k: 'password_reset', bn: 'পাস. রিসেট', en: 'Pwd Reset' },
                          { k: 'email_change', bn: 'ইমেইল পরিবর্তন', en: 'Email Chg' },
                          { k: 'password_change', bn: 'পাস. পরিবর্তন', en: 'Pwd Chg' },
                        ] as const).map((f) => (
                          <th key={f.k} className="text-center font-medium px-2 py-1">{bn ? f.bn : f.en}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {([
                        { role: 'admin', bn: 'অ্যাডমিন', en: 'Admin' },
                        { role: 'parent', bn: 'অভিভাবক', en: 'Parent' },
                        { role: 'staff', bn: 'স্টাফ', en: 'Staff' },
                        { role: 'student', bn: 'ছাত্র', en: 'Student' },
                      ] as const).map((r) => (
                        <tr key={r.role} className="bg-muted/30 hover:bg-muted/50 transition-colors">
                          <td className="px-2 py-2 rounded-l-lg text-foreground font-medium">{bn ? r.bn : r.en}</td>
                          {(['login', 'password_reset', 'email_change', 'password_change'] as const).map((flow, idx, arr) => {
                            const current = (otpCfg.role_overrides as any)?.[r.role]?.[flow];
                            const tri: 'inherit' | 'on' | 'off' =
                              typeof current === 'boolean' ? (current ? 'on' : 'off') : 'inherit';
                            const cycle = () => {
                              const next: 'inherit' | 'on' | 'off' =
                                tri === 'inherit' ? 'on' : tri === 'on' ? 'off' : 'inherit';
                              setOtpCfg((prev) => {
                                const ro: any = { ...(prev.role_overrides || {}) };
                                const roleCfg: any = { ...(ro[r.role] || {}) };
                                if (next === 'inherit') {
                                  delete roleCfg[flow];
                                } else {
                                  roleCfg[flow] = next === 'on';
                                }
                                if (Object.keys(roleCfg).length === 0) {
                                  delete ro[r.role];
                                } else {
                                  ro[r.role] = roleCfg;
                                }
                                return { ...prev, role_overrides: ro };
                              });
                            };
                            const isLast = idx === arr.length - 1;
                            const cls =
                              tri === 'on'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40'
                                : tri === 'off'
                                ? 'bg-destructive/15 text-destructive border-destructive/40'
                                : 'bg-muted/40 text-muted-foreground border-border/60';
                            const label =
                              tri === 'on' ? (bn ? 'চালু' : 'ON') : tri === 'off' ? (bn ? 'বন্ধ' : 'OFF') : '—';
                            return (
                              <td key={flow} className={`px-2 py-2 text-center ${isLast ? 'rounded-r-lg' : ''}`}>
                                <button
                                  type="button"
                                  onClick={cycle}
                                  disabled={!otpCfg.is_enabled}
                                  className={`inline-flex items-center justify-center min-w-[56px] px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all ${cls} ${!otpCfg.is_enabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105'}`}
                                  title={bn ? 'ক্লিক করে পরিবর্তন: চালু → বন্ধ → ইনহেরিট' : 'Click to cycle: ON → OFF → Inherit'}
                                >
                                  {label}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {bn
                    ? 'টিপ: সেলে ক্লিক করলে পরিবর্তন হবে — চালু (সবুজ) → বন্ধ (লাল) → ইনহেরিট (—)। ইনহেরিট মানে গ্লোবাল সেটিংস কার্যকর।'
                    : 'Tip: click a cell to cycle — ON (green) → OFF (red) → Inherit (—). Inherit defers to the global per-flow toggle.'}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">{bn ? 'মেয়াদ (মিনিট)' : 'Expiry (min)'}</Label>
                  <Input
                    type="number" min={1} max={60}
                    value={otpCfg.expiry_minutes || ''}
                    onChange={(e) => setOtpCfg({ ...otpCfg, expiry_minutes: parseInt(e.target.value) || 10 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'সর্বোচ্চ চেষ্টা' : 'Max attempts'}</Label>
                  <Input
                    type="number" min={1} max={10}
                    value={otpCfg.max_attempts || ''}
                    onChange={(e) => setOtpCfg({ ...otpCfg, max_attempts: parseInt(e.target.value) || 3 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'কুলডাউন (সেকেন্ড)' : 'Cooldown (sec)'}</Label>
                  <Input
                    type="number" min={10} max={600}
                    value={otpCfg.cooldown_seconds || ''}
                    onChange={(e) => setOtpCfg({ ...otpCfg, cooldown_seconds: parseInt(e.target.value) || 60 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'ঘণ্টায় সর্বোচ্চ' : 'Hourly limit'}</Label>
                  <Input
                    type="number" min={1} max={50}
                    value={otpCfg.hourly_limit || ''}
                    onChange={(e) => setOtpCfg({ ...otpCfg, hourly_limit: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'দৈনিক সর্বোচ্চ' : 'Daily limit'}</Label>
                  <Input
                    type="number" min={1} max={200}
                    value={otpCfg.daily_limit || ''}
                    onChange={(e) => setOtpCfg({ ...otpCfg, daily_limit: parseInt(e.target.value) || 15 })}
                  />
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button onClick={saveOtpConfig} disabled={otpCfgSaving} className="btn-primary-gradient flex-1 min-w-[180px]">
                  {otpCfgSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {bn ? 'OTP সেটিংস সংরক্ষণ' : 'Save OTP Settings'}
                </Button>
                <Button onClick={() => { setOtpTestResult(null); setOtpTestDialog(true); }} variant="outline">
                  <Send className="w-4 h-4 mr-2" />
                  {bn ? 'OTP টেস্ট ইমেইল' : 'Test OTP Email'}
                </Button>
                <Button asChild variant="outline">
                  <a href="/admin/otp-recovery">
                    <Shield className="w-4 h-4 mr-2" />
                    {bn ? 'OTP রিকভারি' : 'OTP Recovery'}
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* EmailJS Configuration */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" /> {bn ? 'ইমেইল সার্ভিস (EmailJS)' : 'Email Service (EmailJS)'}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {bn
              ? "মাদরাসার অটোমেটিক ইমেইল এবং OTP পাঠানোর জন্য EmailJS কনফিগার করুন।"
              : "Configure EmailJS to send automatic emails and OTPs for the institution."}
          </p>

          {emailjsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-sm font-medium text-foreground">{bn ? 'ইমেইল সার্ভিস সক্রিয়' : 'Email Service Enabled'}</p>
                  <p className="text-xs text-muted-foreground">{bn ? 'OTP ইমেইল পাঠানো চালু/বন্ধ' : 'Enable/disable OTP emails'}</p>
                </div>
                <Switch
                  checked={emailjs.is_enabled}
                  onCheckedChange={(v) => setEmailjs({ ...emailjs, is_enabled: v })}
                />
              </div>

              <div>
                <Label>{bn ? 'সার্ভিস আইডি' : 'Service ID'}</Label>
                <Input
                  className="mt-1 bg-background"
                  value={emailjs.service_id}
                  onChange={(e) => setEmailjs({ ...emailjs, service_id: e.target.value })}
                  placeholder="service_xxxxxxx"
                />
              </div>

              <div>
                <Label>{bn ? 'টেমপ্লেট আইডি' : 'Template ID'}</Label>
                <Input
                  className="mt-1 bg-background"
                  value={emailjs.template_id}
                  onChange={(e) => setEmailjs({ ...emailjs, template_id: e.target.value })}
                  placeholder="template_xxxxxxx"
                />
              </div>

              <div>
                <Label>{bn ? 'পাবলিক কী' : 'Public Key'}</Label>
                <div className="relative mt-1">
                  <Input
                    className="bg-background pr-10"
                    type={showPublicKey ? 'text' : 'password'}
                    value={emailjs.public_key}
                    onChange={(e) => setEmailjs({ ...emailjs, public_key: e.target.value })}
                    placeholder="xxxxxxxxxxxxxxx"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPublicKey(!showPublicKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPublicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label>{bn ? 'OTP মেয়াদ (মিনিট)' : 'OTP Expiry (minutes)'}</Label>
                <Input
                  type="number"
                  className="mt-1 bg-background"
                  value={emailjs.otp_expiry_minutes || ''}
                  onChange={(e) => setEmailjs({ ...emailjs, otp_expiry_minutes: parseInt(e.target.value) || 10 })}
                  min={2}
                  max={30}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={saveEmailjsConfig} disabled={emailjsSaving} className="btn-primary-gradient flex-1">
                  {emailjsSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {bn ? 'ইমেইল সেটিংস সংরক্ষণ' : 'Save Email Settings'}
                </Button>
                <Button onClick={() => setTestEmailDialog(true)} variant="outline">
                  <Send className="w-4 h-4 mr-2" />
                  {bn ? 'টেস্ট ইমেইল' : 'Test Email'}
                </Button>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">{bn ? 'EmailJS টেমপ্লেটে এই ভেরিয়েবল ব্যবহার করুন:' : 'Use these variables in your EmailJS template:'}</p>
                <code className="block">{'{{to_email}}'} — {bn ? 'প্রাপকের ইমেইল' : 'Recipient email'}</code>
                <code className="block">{'{{to_name}}'} — {bn ? 'প্রাপকের নাম' : 'Recipient name'}</code>
                <code className="block">{'{{otp_code}}'} — {bn ? 'ভেরিফিকেশন কোড' : 'Verification code'}</code>
                <code className="block">{'{{expiry_minutes}}'} — {bn ? 'মেয়াদ (মিনিট)' : 'Expiry time'}</code>
                <code className="block">{'{{purpose}}'} — {bn ? 'উদ্দেশ্য' : 'Purpose'}</code>
              </div>
            </div>
          )}
        </div>
            </div>

          </TabsContent>

          <TabsContent value="payment" className="mt-6">
            <PaymentGatewaySettings />
          </TabsContent>

          <TabsContent value="sms" className="mt-6">
            <SmsGatewaySettings />
          </TabsContent>

          <TabsContent value="whatsapp" className="mt-6 space-y-6">
            <WhatsAppSettings />
            <WhatsAppTemplatesManager />
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <div className="space-y-6 max-w-3xl">
              <div className="card-elevated p-5">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> {bn ? 'নিরাপত্তা' : 'Security'}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">{bn ? 'টু-ফ্যাক্টর OTP যাচাই' : '2FA OTP Verification'}</p>
                      <p className="text-xs text-muted-foreground">{bn ? 'লগইনের পর মোবাইলে OTP পাঠানো হবে' : 'Send OTP to mobile after login'}</p>
                    </div>
                    <Switch checked={settings.twoFactorAuth} onCheckedChange={(v) => setSettings({...settings, twoFactorAuth: v})} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>{bn ? 'OTP মেয়াদ (মিনিট)' : 'OTP Expiry (minutes)'}</Label>
                      <Input type="number" className="bg-background mt-1" value={settings.otpExpiry || ''} onChange={(e) => setSettings({...settings, otpExpiry: e.target.value})} min={2} max={10} />
                    </div>
                    <div>
                      <Label>{bn ? 'সর্বোচ্চ OTP চেষ্টা' : 'Max OTP Attempts'}</Label>
                      <Input type="number" className="bg-background mt-1" value={settings.maxOtpAttempts || ''} onChange={(e) => setSettings({...settings, maxOtpAttempts: e.target.value})} min={3} max={5} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-elevated p-5">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> {bn ? 'নোটিফিকেশন' : 'Notifications'}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm font-medium text-foreground">{bn ? 'ইমেইল নোটিফিকেশন' : 'Email Notifications'}</span>
                    <Switch checked={settings.emailNotifications} onCheckedChange={(v) => setSettings({...settings, emailNotifications: v})} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm font-medium text-foreground">{bn ? 'SMS নোটিফিকেশন' : 'SMS Notifications'}</span>
                    <Switch checked={settings.smsNotifications} onCheckedChange={(v) => setSettings({...settings, smsNotifications: v})} />
                  </div>
                </div>
              </div>
              <div className="max-w-none">
                <RateLimitSettings />
              </div>
              <div className="max-w-none">
                <DeletionSecurityPanel bn={bn} />
              </div>
              <div className="max-w-none">
                <SecurityBackupPanel bn={bn} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="general" className="mt-6">
            <div className="space-y-6 max-w-3xl">

              <div className="card-elevated p-5">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2"><Palette className="w-5 h-5 text-primary" /> {bn ? 'ব্যাকগ্রাউন্ড স্টাইল' : 'Background Style'}</h3>
                 <BackgroundSettings
                   value={websiteSettings.background_style}
                   onChange={(value) => updateSetting.mutate({ key: 'background_style', value: value as unknown as import('@/integrations/supabase/types').Json })}
                   disabled={!canEditItem}
                 />
              </div>

              <div className="card-elevated p-5">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2"><Palette className="w-5 h-5 text-primary" /> {bn ? 'সাধারণ' : 'General'}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">{bn ? 'ভর্তি স্বয়ংক্রিয় অনুমোদন' : 'Auto Approve Admission'}</p>
                      <p className="text-xs text-muted-foreground">{bn ? 'বন্ধ থাকলে অ্যাডমিন ম্যানুয়ালি অনুমোদন দিবেন' : 'If off, admin approves manually'}</p>
                    </div>
                    <Switch checked={settings.autoApproveAdmission} onCheckedChange={(v) => setSettings({...settings, autoApproveAdmission: v})} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">{bn ? 'মেইনটেন্যান্স মোড' : 'Maintenance Mode'}</p>
                      <p className="text-xs text-muted-foreground">{bn ? 'চালু থাকলে ওয়েবসাইট বন্ধ থাকবে' : 'If on, website will be offline'}</p>
                    </div>
                    <Switch checked={settings.maintenanceMode} onCheckedChange={(v) => setSettings({...settings, maintenanceMode: v})} />
                  </div>
                </div>
              </div>
              <Button className="btn-primary-gradient w-full" onClick={() => toast.success(bn ? 'সেটিংস সংরক্ষিত' : 'Settings saved')}>
                <Save className="w-4 h-4 mr-2" /> {bn ? 'সকল সেটিংস সংরক্ষণ করুন' : 'Save All Settings'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="salary_workflow" className="mt-6">
            <SalaryWorkflowSettings />
          </TabsContent>

          <TabsContent value="timezone" className="mt-6">
            <TimezoneSettings />
          </TabsContent>

          <TabsContent value="receipt_qr" className="mt-6">
            <ReceiptQrSettings />
          </TabsContent>

          <TabsContent value="approvals" className="mt-6">
            <ApprovalWorkflowSettings />
          </TabsContent>

          <TabsContent value="quran" className="mt-6">
            <QuranDefaultsSettings />
          </TabsContent>

          <TabsContent value="attendance_dup" className="mt-6">
            <AttendanceDuplicateSettings />
          </TabsContent>
        </Tabs>
      </div>

      {/* Test Email Dialog */}
      <Dialog open={testEmailDialog} onOpenChange={setTestEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              {bn ? 'EmailJS টেস্ট ইমেইল পাঠান' : 'Send EmailJS Test Email'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {bn 
                ? 'একটি টেস্ট OTP ইমেইল (কোড: 123456) পাঠানো হবে। ইমেইল আসলে EmailJS সঠিকভাবে কাজ করছে।'
                : 'A test OTP email (code: 123456) will be sent. If received, EmailJS is working correctly.'}
            </p>
            <div>
              <Label>{bn ? 'প্রাপকের ইমেইল' : 'Recipient Email'}</Label>
              <Input
                className="mt-1"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder={bn ? 'আপনার ইমেইল দিন' : 'Enter your email'}
              />
            </div>
            <Button onClick={testEmailjs} disabled={emailjsTesting} className="w-full btn-primary-gradient">
              {emailjsTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {bn ? 'টেস্ট ইমেইল পাঠান' : 'Send Test Email'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SMTP Test Dialog */}
      <Dialog open={smtpTestDialog} onOpenChange={(o) => { setSmtpTestDialog(o); if (!o) setSmtpTestResult(null); }}>
        <DialogContent className="sm:max-w-md rounded-[38px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              {bn ? 'SMTP টেস্ট ইমেইল পাঠান' : 'Send SMTP Test Email'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {smtpTestProfileIdx !== null && smtpProfiles[smtpTestProfileIdx] && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs">
                <p className="font-medium text-foreground">
                  {bn ? 'প্রোফাইল:' : 'Profile:'} {smtpProfiles[smtpTestProfileIdx].name}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {smtpProfiles[smtpTestProfileIdx].smtp_host}:{smtpProfiles[smtpTestProfileIdx].smtp_port} · purpose: <span className="font-medium">{smtpProfiles[smtpTestProfileIdx].purpose}</span>
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {bn
                ? 'এই প্রোফাইলের কনফিগ দিয়ে একটি প্রকৃত টেস্ট ইমেইল পাঠানো হবে। এটি লগইন ও ডেলিভারি উভয়ই যাচাই করবে।'
                : 'A real test email will be sent using THIS profile’s config. This verifies both authentication and delivery.'}
            </p>
            <div>
              <Label>{bn ? 'প্রাপকের ইমেইল' : 'Recipient Email'}</Label>
              <Input
                className="mt-1"
                type="email"
                value={smtpTestEmail}
                onChange={(e) => setSmtpTestEmail(e.target.value)}
                placeholder={bn ? 'আপনার ইমেইল দিন' : 'Enter your email'}
                disabled={smtpTesting}
              />
            </div>

            {smtpTestResult && (
              <div className={`p-3 rounded-xl text-sm ${smtpTestResult.success ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30' : 'bg-destructive/10 text-destructive border border-destructive/30'}`}>
                <div className="flex items-start gap-2">
                  {smtpTestResult.success
                    ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                  <div className="space-y-1">
                    <p className="font-medium">{smtpTestResult.success ? (bn ? 'সফল' : 'Success') : (bn ? 'ব্যর্থ' : 'Failed')}</p>
                    <p className="text-xs break-words">{smtpTestResult.message}</p>
                    {smtpTestResult.hint && (
                      <p className="text-xs italic opacity-80">💡 {smtpTestResult.hint}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button onClick={runSmtpTest} disabled={smtpTesting} className="w-full btn-primary-gradient">
              {smtpTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {bn ? 'টেস্ট ইমেইল পাঠান' : 'Send Test Email'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* OTP End-to-End Test Dialog */}
      <Dialog open={otpTestDialog} onOpenChange={(o) => { setOtpTestDialog(o); if (!o) setOtpTestResult(null); }}>
        <DialogContent className="rounded-[38px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              {bn ? 'OTP ইমেইল টেস্ট' : 'Test OTP Email'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-xs text-muted-foreground">
              {bn
                ? 'এটি প্রকৃত send-otp ফাংশন কল করবে এবং দেখাবে কোন পথ (SMTP / EmailJS) ব্যবহৃত হয়েছে।'
                : 'This invokes the real send-otp function and shows which path (SMTP / EmailJS) was used.'}
            </p>
            <div>
              <Label>{bn ? 'প্রাপকের ইমেইল' : 'Recipient Email'}</Label>
              <Input
                type="email"
                value={otpTestEmail}
                onChange={(e) => setOtpTestEmail(e.target.value)}
                placeholder="recipient@example.com"
                disabled={otpTesting}
              />
            </div>
            {otpTestResult && (
              <div className={`p-3 rounded-xl text-sm ${otpTestResult.success ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30' : 'bg-destructive/10 text-destructive border border-destructive/30'}`}>
                <div className="flex items-start gap-2">
                  {otpTestResult.success
                    ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  <div className="space-y-1">
                    <p className="font-medium">
                      {otpTestResult.success ? (bn ? 'সফল' : 'Success') : (bn ? 'ব্যর্থ' : 'Failed')}
                      {otpTestResult.method && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide bg-emerald-600 text-white">
                          {otpTestResult.method}
                        </span>
                      )}
                    </p>
                    <p className="text-xs break-words">{otpTestResult.message}</p>
                  </div>
                </div>
              </div>
            )}
            <Button onClick={runOtpTest} disabled={otpTesting} className="w-full btn-primary-gradient">
              {otpTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {bn ? 'OTP পাঠান' : 'Send OTP'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSettings;
