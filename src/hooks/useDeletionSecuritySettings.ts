import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DeletionProtectionLevel = 'confirm' | 'type' | 'otp';

export interface DeletionSecuritySettings {
  student: DeletionProtectionLevel;
  staff: DeletionProtectionLevel;
  fee_payment: DeletionProtectionLevel;
  academic_session: DeletionProtectionLevel;
  exam: DeletionProtectionLevel;
  expense: DeletionProtectionLevel;
  general: DeletionProtectionLevel;
}

export const DELETION_SETTINGS_KEY = 'deletion_security_settings';

export const DEFAULT_DELETION_SECURITY_SETTINGS: DeletionSecuritySettings = {
  student: 'type',
  staff: 'type',
  fee_payment: 'otp',
  academic_session: 'otp',
  exam: 'type',
  expense: 'type',
  general: 'confirm',
};

const normalizeSettings = (raw: any): DeletionSecuritySettings => {
  if (!raw || typeof raw !== 'object') return DEFAULT_DELETION_SECURITY_SETTINGS;
  return {
    student: ['confirm', 'type', 'otp'].includes(raw.student) ? raw.student : DEFAULT_DELETION_SECURITY_SETTINGS.student,
    staff: ['confirm', 'type', 'otp'].includes(raw.staff) ? raw.staff : DEFAULT_DELETION_SECURITY_SETTINGS.staff,
    fee_payment: ['confirm', 'type', 'otp'].includes(raw.fee_payment) ? raw.fee_payment : DEFAULT_DELETION_SECURITY_SETTINGS.fee_payment,
    academic_session: ['confirm', 'type', 'otp'].includes(raw.academic_session) ? raw.academic_session : DEFAULT_DELETION_SECURITY_SETTINGS.academic_session,
    exam: ['confirm', 'type', 'otp'].includes(raw.exam) ? raw.exam : DEFAULT_DELETION_SECURITY_SETTINGS.exam,
    expense: ['confirm', 'type', 'otp'].includes(raw.expense) ? raw.expense : DEFAULT_DELETION_SECURITY_SETTINGS.expense,
    general: ['confirm', 'type', 'otp'].includes(raw.general) ? raw.general : DEFAULT_DELETION_SECURITY_SETTINGS.general,
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
