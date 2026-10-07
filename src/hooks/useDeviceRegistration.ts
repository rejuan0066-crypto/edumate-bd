// Stable per-browser device ID + helpers to register it with the server
// and to attach `x-device-id` to any Supabase Edge Function or fetch call.
//
// Why a separate hook?
//   - The device ID must persist across reloads → localStorage.
//   - It must be auto-registered on first sign-in (trust-on-first-use)
//     via the SECURITY DEFINER RPC `register_user_device`.
//   - Every privileged edge function call should include it as `x-device-id`
//     so the server can verify it against `user_devices`.

import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const DEVICE_KEY = "lovable.device_id";

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return `dev-${Date.now()}`;
  }
}

/**
 * Returns headers to attach to any privileged fetch/invoke call.
 */
export function deviceHeaders(): Record<string, string> {
  return { "x-device-id": getDeviceId() };
}

/**
 * Mounts once at app shell — registers the current browser as an approved
 * device for the signed-in user (trust-on-first-use). Idempotent: subsequent
 * calls just refresh `last_seen_at`.
 */
export function useDeviceRegistration() {
  const { user } = useAuth();
  const deviceId = useMemo(getDeviceId, []);

  useEffect(() => {
    if (!user?.id) return;
    const regKey = `lovable.device_reg_at_${user.id}`;
    const lastReg = Number(localStorage.getItem(regKey) ?? 0);
    // Refresh at most once every 30 minutes
    if (Date.now() - lastReg < 1000 * 60 * 30) return;

    let cancelled = false;
    (async () => {
      try {
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
        const label =
          typeof navigator !== "undefined"
            ? `${navigator.platform || "web"} • ${(navigator.userAgent || "").slice(0, 40)}`
            : "web";
        if (cancelled) return;
        await supabase.rpc("register_user_device", {
          _device_id: deviceId,
          _label: label,
          _user_agent: ua,
          _ip: null, // server-side functions populate IP; the RPC just records UA here
        });
        localStorage.setItem(regKey, String(Date.now()));
      } catch {
        // Non-fatal — server-side `verify_user_device` will still TOFU-register on first protected call
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, deviceId]);

  return deviceId;
}
