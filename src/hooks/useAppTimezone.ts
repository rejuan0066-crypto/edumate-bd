import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_APP_TZ, safeTz } from '@/lib/timezone';

/**
 * Subscribes to the global `app_timezone` setting in `app_settings`.
 * Returns the active IANA timezone — defaults to Asia/Dhaka while loading or on error.
 * Updates live when an admin changes the setting (via Supabase realtime).
 */
const TZ_STORAGE_KEY = 'app_cached_tz';
let cachedTz: string = (() => {
  try {
    return localStorage.getItem(TZ_STORAGE_KEY) || DEFAULT_APP_TZ;
  } catch {
    return DEFAULT_APP_TZ;
  }
})();
const listeners = new Set<(tz: string) => void>();

async function fetchAppTz(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'app_timezone')
      .maybeSingle();
    if (error) throw error;
    const tz = (data?.value as { timezone?: string } | null)?.timezone;
    return safeTz(tz);
  } catch {
    return DEFAULT_APP_TZ;
  }
}

function setCachedTz(tz: string) {
  cachedTz = safeTz(tz);
  try {
    localStorage.setItem(TZ_STORAGE_KEY, cachedTz);
  } catch {}
  listeners.forEach(fn => fn(cachedTz));
}

let realtimeStarted = false;
function ensureRealtime() {
  if (realtimeStarted) return;
  realtimeStarted = true;
  supabase
    .channel('app-settings-tz')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.app_timezone' },
      (payload) => {
        const next = (payload.new as { value?: { timezone?: string } } | null)?.value?.timezone;
        if (next) setCachedTz(next);
      },
    )
    .subscribe();
}

export function useAppTimezone(): { tz: string; isLoading: boolean } {
  const [tz, setTz] = useState<string>(cachedTz ?? DEFAULT_APP_TZ);
  const [isLoading, setIsLoading] = useState<boolean>(cachedTz === null);

  useEffect(() => {
    listeners.add(setTz);
    ensureRealtime();
    if (cachedTz === null) {
      fetchAppTz().then(t => {
        setCachedTz(t);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
    return () => {
      listeners.delete(setTz);
    };
  }, []);

  return { tz, isLoading };
}

/** Imperative refresh (e.g. after admin saves). */
export async function refreshAppTimezone(): Promise<string> {
  const t = await fetchAppTz();
  setCachedTz(t);
  return t;
}

/** Imperative setter for optimistic updates from the admin UI. */
export function setAppTimezoneCache(tz: string) {
  setCachedTz(tz);
}
