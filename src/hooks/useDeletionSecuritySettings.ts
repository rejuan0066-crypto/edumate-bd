import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DeletionProtectionLevel = 'confirm' | 'type' | 'otp';
export type DeletionOtpTargetType = 'site_email' | 'custom' | 'actor';

export interface DeletionSecuritySettings {
  student: DeletionProtectionLevel;
  staff: DeletionProtectionLevel;
  committee: DeletionProtectionLevel;
  fee_payment: DeletionProtectionLevel;
  expense: DeletionProtectionLevel;
  academic_session: DeletionProtectionLevel;
  exam: DeletionProtectionLevel;
  certificate: DeletionProtectionLevel;
  inventory: DeletionProtectionLevel;
  hostel: DeletionProtectionLevel;
  library: DeletionProtectionLevel;
  notice_routine: DeletionProtectionLevel;
  user_account: DeletionProtectionLevel;
  general: DeletionProtectionLevel;

  otp_target_type: DeletionOtpTargetType;
  otp_custom_email: string;
}

export const DELETION_SETTINGS_KEY = 'deletion_security_settings';

export const DEFAULT_DELETION_SECURITY_SETTINGS: DeletionSecuritySettings = {
  student: 'type',
  staff: 'type',
  committee: 'type',
  fee_payment: 'otp',
  expense: 'type',
  academic_session: 'otp',
  exam: 'type',
  certificate: 'type',
  inventory: 'type',
  hostel: 'type',
  library: 'confirm',
  notice_routine: 'confirm',
  user_account: 'otp',
  general: 'confirm',

  otp_target_type: 'custom',
  otp_custom_email: '',
};

const normalizeSettings = (raw: any): DeletionSecuritySettings => {
  if (!raw || typeof raw !== 'object') return DEFAULT_DELETION_SECURITY_SETTINGS;
  const validLevel = (lvl: any, def: DeletionProtectionLevel): DeletionProtectionLevel =>
    ['confirm', 'type', 'otp'].includes(lvl) ? lvl : def;

  return {
    student: validLevel(raw.student, DEFAULT_DELETION_SECURITY_SETTINGS.student),
    staff: validLevel(raw.staff, DEFAULT_DELETION_SECURITY_SETTINGS.staff),
    committee: validLevel(raw.committee, DEFAULT_DELETION_SECURITY_SETTINGS.committee),
    fee_payment: validLevel(raw.fee_payment, DEFAULT_DELETION_SECURITY_SETTINGS.fee_payment),
    expense: validLevel(raw.expense, DEFAULT_DELETION_SECURITY_SETTINGS.expense),
    academic_session: validLevel(raw.academic_session, DEFAULT_DELETION_SECURITY_SETTINGS.academic_session),
    exam: validLevel(raw.exam, DEFAULT_DELETION_SECURITY_SETTINGS.exam),
    certificate: validLevel(raw.certificate, DEFAULT_DELETION_SECURITY_SETTINGS.certificate),
    inventory: validLevel(raw.inventory, DEFAULT_DELETION_SECURITY_SETTINGS.inventory),
    hostel: validLevel(raw.hostel, DEFAULT_DELETION_SECURITY_SETTINGS.hostel),
    library: validLevel(raw.library, DEFAULT_DELETION_SECURITY_SETTINGS.library),
    notice_routine: validLevel(raw.notice_routine, DEFAULT_DELETION_SECURITY_SETTINGS.notice_routine),
    user_account: validLevel(raw.user_account, DEFAULT_DELETION_SECURITY_SETTINGS.user_account),
    general: validLevel(raw.general, DEFAULT_DELETION_SECURITY_SETTINGS.general),

    otp_target_type: ['site_email', 'custom', 'actor'].includes(raw.otp_target_type)
      ? raw.otp_target_type
      : DEFAULT_DELETION_SECURITY_SETTINGS.otp_target_type,
    otp_custom_email: typeof raw.otp_custom_email === 'string' ? raw.otp_custom_email : '',
  };
};

let cachedSettings: DeletionSecuritySettings = (() => {
  try {
    const local = localStorage.getItem(DELETION_SETTINGS_KEY);
    if (local) return normalizeSettings(JSON.parse(local));
  } catch {
    // fallback
  }
  return DEFAULT_DELETION_SECURITY_SETTINGS;
})();

const listeners = new Set<(s: DeletionSecuritySettings) => void>();

export function getCachedDeletionSettings(): DeletionSecuritySettings {
  return cachedSettings;
}

export function useDeletionSecuritySettings() {
  const [settings, setSettings] = useState<DeletionSecuritySettings>(cachedSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    listeners.add(setSettings);
    return () => {
      listeners.delete(setSettings);
    };
  }, []);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', DELETION_SETTINGS_KEY)
        .maybeSingle();

      if (!error && data?.value) {
        const parsed = normalizeSettings(data.value);
        cachedSettings = parsed;
        try {
          localStorage.setItem(DELETION_SETTINGS_KEY, JSON.stringify(parsed));
        } catch {
          // ignore
        }
        listeners.forEach((fn) => fn(parsed));
      }
    } catch (e) {
      console.warn('Failed to load deletion settings:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (nextSettings: DeletionSecuritySettings) => {
    setIsSaving(true);
    try {
      const normalized = normalizeSettings(nextSettings);
      cachedSettings = normalized;
      try {
        localStorage.setItem(DELETION_SETTINGS_KEY, JSON.stringify(normalized));
      } catch {
        // ignore
      }
      listeners.forEach((fn) => fn(normalized));

      const { error } = await supabase.from('app_settings').upsert(
        {
          key: DELETION_SETTINGS_KEY,
          value: normalized as any,
          description: 'Security rules for deleting records (OTP, Type-to-confirm, or Simple confirm)',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

      if (error) throw error;
      toast.success('ডিলিট নিরাপত্তা সেটিংস সফলভাবে সংরক্ষিত হয়েছে');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    updateSettings,
    isLoading,
    isSaving,
    refetch: fetchSettings,
  };
}
