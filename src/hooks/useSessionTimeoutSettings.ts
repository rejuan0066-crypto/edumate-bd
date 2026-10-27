import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SessionTimeoutSettings {
  enabled: boolean;
  admin_background_minutes: number; // 0 = disabled / never
  staff_background_minutes: number; // 0 = disabled / never
  admin_idle_minutes: number;       // 0 = disabled / never
  staff_idle_minutes: number;       // 0 = disabled / never
  show_warning_dialog: boolean;
  warning_countdown_seconds: number;
}

export const SESSION_TIMEOUT_SETTINGS_KEY = 'session_timeout_settings';

export const DEFAULT_SESSION_TIMEOUT_SETTINGS: SessionTimeoutSettings = {
  enabled: true,
  admin_background_minutes: 15,
  staff_background_minutes: 30,
  admin_idle_minutes: 20,
  staff_idle_minutes: 40,
  show_warning_dialog: true,
  warning_countdown_seconds: 30,
};

export const normalizeSessionTimeoutSettings = (raw: any): SessionTimeoutSettings => {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SESSION_TIMEOUT_SETTINGS };
  }

  const parseNumber = (val: any, fallback: number, min = 0, max = 1440) => {
    if (val === null || val === undefined || val === '' || typeof val === 'boolean') {
      return fallback;
    }
    const num = Number(val);
    if (!Number.isFinite(num) || num < min) return fallback;
    return Math.min(num, max);
  };

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_SESSION_TIMEOUT_SETTINGS.enabled,
    admin_background_minutes: parseNumber(raw.admin_background_minutes, DEFAULT_SESSION_TIMEOUT_SETTINGS.admin_background_minutes),
    staff_background_minutes: parseNumber(raw.staff_background_minutes, DEFAULT_SESSION_TIMEOUT_SETTINGS.staff_background_minutes),
    admin_idle_minutes: parseNumber(raw.admin_idle_minutes, DEFAULT_SESSION_TIMEOUT_SETTINGS.admin_idle_minutes),
    staff_idle_minutes: parseNumber(raw.staff_idle_minutes, DEFAULT_SESSION_TIMEOUT_SETTINGS.staff_idle_minutes),
    show_warning_dialog: typeof raw.show_warning_dialog === 'boolean' ? raw.show_warning_dialog : DEFAULT_SESSION_TIMEOUT_SETTINGS.show_warning_dialog,
    warning_countdown_seconds: parseNumber(raw.warning_countdown_seconds, DEFAULT_SESSION_TIMEOUT_SETTINGS.warning_countdown_seconds, 10, 300),
  };
};

let cachedSettings: SessionTimeoutSettings = (() => {
  try {
    const local = localStorage.getItem(SESSION_TIMEOUT_SETTINGS_KEY);
    if (local) return normalizeSessionTimeoutSettings(JSON.parse(local));
  } catch {
    // fallback
  }
  return { ...DEFAULT_SESSION_TIMEOUT_SETTINGS };
})();

const listeners = new Set<(s: SessionTimeoutSettings) => void>();

export function getCachedSessionTimeoutSettings(): SessionTimeoutSettings {
  return cachedSettings;
}

export function useSessionTimeoutSettings() {
  const [settings, setSettings] = useState<SessionTimeoutSettings>(cachedSettings);
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
        .eq('key', SESSION_TIMEOUT_SETTINGS_KEY)
        .maybeSingle();

      if (!error && data?.value) {
        const parsed = normalizeSessionTimeoutSettings(data.value);
        cachedSettings = parsed;
        try {
          localStorage.setItem(SESSION_TIMEOUT_SETTINGS_KEY, JSON.stringify(parsed));
        } catch {
          // ignore
        }
        listeners.forEach((fn) => fn(parsed));
      }
    } catch (e) {
      console.warn('Failed to load session timeout settings:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Subscribe to realtime changes in app_settings
    const channelName = `session-timeout-settings-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
          filter: `key=eq.${SESSION_TIMEOUT_SETTINGS_KEY}`,
        },
        (payload: any) => {
          if (payload.new && payload.new.value) {
            const parsed = normalizeSessionTimeoutSettings(payload.new.value);
            cachedSettings = parsed;
            try {
              localStorage.setItem(SESSION_TIMEOUT_SETTINGS_KEY, JSON.stringify(parsed));
            } catch {
              // ignore
            }
            listeners.forEach((fn) => fn(parsed));
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [fetchSettings]);

  const updateSettings = async (nextSettings: SessionTimeoutSettings) => {
    setIsSaving(true);
    try {
      const normalized = normalizeSessionTimeoutSettings(nextSettings);
      cachedSettings = normalized;
      try {
        localStorage.setItem(SESSION_TIMEOUT_SETTINGS_KEY, JSON.stringify(normalized));
      } catch {
        // ignore
      }
      listeners.forEach((fn) => fn(normalized));

      const { error } = await supabase.from('app_settings').upsert(
        {
          key: SESSION_TIMEOUT_SETTINGS_KEY,
          value: normalized as any,
          description: 'Auto-logout and background session timeout rules for staff and admin',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

      if (error) throw error;
      toast.success('সেশন টাইমআউট সেটিংস সফলভাবে সংরক্ষিত হয়েছে');
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
