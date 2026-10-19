// One-shot ping to /device-track right after sign-in. Refreshes IP-based
// location + device model in user_devices and surfaces "out of area" alerts.
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { deviceHeaders } from "@/hooks/useDeviceRegistration";

const STORAGE_KEY = "lovable.device_track_at";
const TTL_MS = 1000 * 60 * 30; // refresh once every 30 min

export function useDeviceTrack() {
  const { user } = useAuth();
  const fired = useRef(false);

  useEffect(() => {
    if (!user?.id || fired.current) return;
    const last = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    if (Date.now() - last < TTL_MS) return;
    fired.current = true;
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) { fired.current = false; return; }
        const { data, error } = await supabase.functions.invoke("device-track", {
          headers: { ...deviceHeaders(), Authorization: `Bearer ${session.access_token}` },
        });
        if (mounted && !error && data?.ok) {
          localStorage.setItem(STORAGE_KEY, String(Date.now()));
        }
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);
}
