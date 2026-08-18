import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const APPROVAL_SETTING_KEY = 'approval_workflow';

export interface ApprovalWorkflowSettings {
  /** Master on/off switch for the global approval requirement */
  enabled: boolean;
  /** Which actions require admin approval when enabled */
  actions: { add: boolean; edit: boolean; delete: boolean; reject: boolean };
  /** Roles that are exempt (in addition to admin / super_admin, which are always exempt) */
  exempt_roles: string[];
}

export const DEFAULT_APPROVAL_SETTINGS: ApprovalWorkflowSettings = {
  enabled: false,
  actions: { add: true, edit: true, delete: true, reject: true },
  exempt_roles: [],
};

export function normalizeApprovalSettings(raw: unknown): ApprovalWorkflowSettings {
  const v = (raw ?? {}) as Partial<ApprovalWorkflowSettings> & { actions?: Partial<ApprovalWorkflowSettings['actions']> };
  return {
    enabled: !!v.enabled,
    actions: {
      add: v.actions?.add ?? true,
      edit: v.actions?.edit ?? true,
      delete: v.actions?.delete ?? true,
      reject: v.actions?.reject ?? true,
    },
    exempt_roles: Array.isArray(v.exempt_roles) ? v.exempt_roles.map(String) : [],
  };
}

let cached: ApprovalWorkflowSettings | null = null;
const listeners = new Set<(s: ApprovalWorkflowSettings) => void>();
let realtimeStarted = false;

async function fetchSettings(): Promise<ApprovalWorkflowSettings> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', APPROVAL_SETTING_KEY)
      .maybeSingle();
    if (error) throw error;
    return normalizeApprovalSettings(data?.value);
  } catch {
    return DEFAULT_APPROVAL_SETTINGS;
  }
}

function setCached(next: ApprovalWorkflowSettings) {
  cached = next;
  listeners.forEach((fn) => fn(next));
}

function ensureRealtime() {
  if (realtimeStarted) return;
  realtimeStarted = true;
  supabase
    .channel('app-settings-approval')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_settings', filter: `key=eq.${APPROVAL_SETTING_KEY}` },
      (payload) => {
        setCached(normalizeApprovalSettings((payload.new as { value?: unknown } | null)?.value));
      },
    )
    .subscribe();
}

/** Push a freshly-saved value into the shared cache (used by the settings screen). */
export function primeApprovalSettings(next: ApprovalWorkflowSettings) {
  setCached(normalizeApprovalSettings(next));
}

export function useApprovalSettings(): { settings: ApprovalWorkflowSettings; isLoading: boolean } {
  const [settings, setSettings] = useState<ApprovalWorkflowSettings>(cached ?? DEFAULT_APPROVAL_SETTINGS);
  const [isLoading, setIsLoading] = useState(cached === null);

  useEffect(() => {
    listeners.add(setSettings);
    ensureRealtime();
    if (cached === null) {
      fetchSettings().then((s) => {
        setCached(s);
        setIsLoading(false);
      });
    } else {
      setSettings(cached);
      setIsLoading(false);
    }
    return () => {
      listeners.delete(setSettings);
    };
  }, []);

  return { settings, isLoading };
}
