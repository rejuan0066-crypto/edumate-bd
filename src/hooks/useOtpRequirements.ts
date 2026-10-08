import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OtpFlowScope = "login" | "password_reset" | "email_change" | "password_change";
export type OtpRoleScope = "admin" | "parent" | "staff" | "student";

export interface OtpRequirements {
  is_enabled: boolean;
  require_for_login: boolean;
  require_for_password_reset: boolean;
  require_for_email_change: boolean;
  require_for_password_change: boolean;
  /** Per-role overrides. Shape:
   *  { admin: { login: bool, password_reset: bool, ... }, parent: {...}, ... }
   *  Any missing role/flow falls back to the global `require_for_*` flag. */
  role_overrides: Partial<Record<OtpRoleScope, Partial<Record<OtpFlowScope, boolean>>>>;
}

const DEFAULTS: OtpRequirements = {
  is_enabled: false,
  require_for_login: false,
  require_for_password_reset: true,
  require_for_email_change: true,
  require_for_password_change: true,
  role_overrides: {},
};

const OTP_CACHE_KEY = 'edumate_otp_requirements_cache';
const TTL_MS = 5 * 60 * 1000; // 5 minutes

function getPersistedCache(): OtpRequirements | null {
  try {
    const raw = localStorage.getItem(OTP_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.data === 'object' && Date.now() - (parsed.time || 0) < TTL_MS) {
        return parsed.data;
      }
    }
  } catch {}
  return null;
}

let cache: OtpRequirements | null = getPersistedCache();
let cacheAt = cache ? Date.now() : 0;

export function clearOtpRequirementsCache() {
  cache = null;
  cacheAt = 0;
  try { localStorage.removeItem(OTP_CACHE_KEY); } catch {}
}

export async function fetchOtpRequirements(force = false): Promise<OtpRequirements> {
  if (!force && cache && Date.now() - cacheAt < TTL_MS) return cache;
  
  try {
    // Add 3.5s timeout so network stalls never freeze the application
    const rpcPromise = (supabase as any).rpc("get_otp_requirements");
    const timeoutPromise = new Promise<{ data: null }>((_, reject) =>
      setTimeout(() => reject(new Error('OTP requirements fetch timeout')), 3500)
    );

    const { data } = await Promise.race([rpcPromise, timeoutPromise]) as any;
    const d = (Array.isArray(data) ? data[0] : data) as any;
    if (d) {
      cache = {
        is_enabled: d?.is_enabled ?? DEFAULTS.is_enabled,
        require_for_login: d?.require_for_login ?? DEFAULTS.require_for_login,
        require_for_password_reset: d?.require_for_password_reset ?? DEFAULTS.require_for_password_reset,
        require_for_email_change: d?.require_for_email_change ?? DEFAULTS.require_for_email_change,
        require_for_password_change: d?.require_for_password_change ?? DEFAULTS.require_for_password_change,
        role_overrides: (d?.role_overrides && typeof d.role_overrides === "object") ? d.role_overrides : {},
      };
      cacheAt = Date.now();
      try {
        localStorage.setItem(OTP_CACHE_KEY, JSON.stringify({ data: cache, time: cacheAt }));
      } catch {}
    }
  } catch (err) {
    // Fall back to existing cache or defaults on network failure/timeout
    console.warn('fetchOtpRequirements non-blocking error/timeout, using fallback cache');
  }

  return cache || DEFAULTS;
}

const FLOW_TO_GLOBAL_KEY: Record<OtpFlowScope, keyof OtpRequirements> = {
  login: "require_for_login",
  password_reset: "require_for_password_reset",
  email_change: "require_for_email_change",
  password_change: "require_for_password_change",
};

export function isOtpRequiredFor(
  reqs: OtpRequirements | null,
  scope: OtpFlowScope,
  role?: OtpRoleScope
): boolean {
  if (!reqs) return true; // safer default while loading
  if (!reqs.is_enabled) return false;

  // Per-role override wins when provided
  if (role) {
    const roleCfg = reqs.role_overrides?.[role];
    const v = roleCfg?.[scope];
    if (typeof v === "boolean") return v;
  }

  // Fallback to global per-flow flag
  return Boolean(reqs[FLOW_TO_GLOBAL_KEY[scope]]);
}

export function useOtpRequirements() {
  const [reqs, setReqs] = useState<OtpRequirements | null>(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let alive = true;
    fetchOtpRequirements().then((r) => {
      if (alive) {
        setReqs(r);
        setLoading(false);
      }
    });
    return () => { alive = false; };
  }, []);

  return { reqs, loading };
}
