import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OtpRequirements {
  is_enabled: boolean;
  require_for_login: boolean;
  require_for_password_reset: boolean;
  require_for_email_change: boolean;
  require_for_password_change: boolean;
}

const DEFAULTS: OtpRequirements = {
  is_enabled: true,
  require_for_login: true,
  require_for_password_reset: true,
  require_for_email_change: true,
  require_for_password_change: true,
};

let cache: OtpRequirements | null = null;
let cacheAt = 0;
const TTL_MS = 60 * 1000;

export async function fetchOtpRequirements(force = false): Promise<OtpRequirements> {
  if (!force && cache && Date.now() - cacheAt < TTL_MS) return cache;
  const { data } = await supabase
    .from("otp_config")
    .select("is_enabled, require_for_login, require_for_password_reset, require_for_email_change, require_for_password_change")
    .eq("id", 1)
    .maybeSingle();
  cache = {
    is_enabled: data?.is_enabled ?? DEFAULTS.is_enabled,
    require_for_login: (data as any)?.require_for_login ?? DEFAULTS.require_for_login,
    require_for_password_reset: (data as any)?.require_for_password_reset ?? DEFAULTS.require_for_password_reset,
    require_for_email_change: (data as any)?.require_for_email_change ?? DEFAULTS.require_for_email_change,
    require_for_password_change: (data as any)?.require_for_password_change ?? DEFAULTS.require_for_password_change,
  };
  cacheAt = Date.now();
  return cache;
}

export function isOtpRequiredFor(
  reqs: OtpRequirements | null,
  scope: "login" | "password_reset" | "email_change" | "password_change"
): boolean {
  if (!reqs) return true; // safer default while loading
  if (!reqs.is_enabled) return false;
  switch (scope) {
    case "login": return reqs.require_for_login;
    case "password_reset": return reqs.require_for_password_reset;
    case "email_change": return reqs.require_for_email_change;
    case "password_change": return reqs.require_for_password_change;
  }
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
