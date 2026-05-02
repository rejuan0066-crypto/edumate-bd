import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RateLimitConfigRow = {
  action: string;
  max_requests: number;
  window_seconds: number;
  enabled: boolean;
  label_bn: string | null;
  label_en: string | null;
  category: string;
  scope: string;
  description: string | null;
};

/**
 * Reads a single rate-limit config row by action key.
 * Used by client-side flows (e.g. Test Email button) to drive
 * "remaining attempts in this session" UX from the database
 * instead of a hardcoded constant.
 *
 * Falls back to sensible defaults if the row is missing or RLS denies read.
 */
export function useRateLimitConfig(
  action: string,
  fallback: { max: number; windowSeconds: number } = { max: 5, windowSeconds: 3600 },
) {
  const [config, setConfig] = useState<RateLimitConfigRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("rate_limit_config")
        .select("action, max_requests, window_seconds, enabled, label_bn, label_en, category, scope, description")
        .eq("action", action)
        .maybeSingle();
      if (cancelled) return;
      setConfig(data as any);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [action]);

  return {
    loading,
    config,
    max: config?.max_requests ?? fallback.max,
    windowSeconds: config?.window_seconds ?? fallback.windowSeconds,
    enabled: config?.enabled ?? true,
    labelBn: config?.label_bn ?? null,
    labelEn: config?.label_en ?? null,
  };
}
