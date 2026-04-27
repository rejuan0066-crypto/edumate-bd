import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchOtpRequirements, isOtpRequiredFor } from "@/hooks/useOtpRequirements";

/**
 * Simple 2FA gate for sensitive admin actions (Undo, Approve overlap,
 * History export). Caches a successful verification for `cacheMs` so the admin
 * isn't prompted on every click.
 *
 * Honours the global "Require OTP for login / 2-step verification" toggle in
 * /admin/settings — when disabled, actions execute without prompting.
 */
export function useAdminOtpGate(cacheMs = 5 * 60 * 1000) {
  const [email, setEmail] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [verifiedUntil, setVerifiedUntil] = useState<number>(0);
  const [pending, setPending] = useState<null | (() => void | Promise<void>)>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || "");
    });
  }, []);

  const requireOtp = useCallback(
    async (action: () => void | Promise<void>) => {
      if (Date.now() < verifiedUntil) {
        // Still in trusted window — run immediately
        void action();
        return;
      }
      // Honour global admin setting — if 2-step / login OTP is disabled, skip the gate
      try {
        const reqs = await fetchOtpRequirements();
        if (!isOtpRequiredFor(reqs, "login")) {
          void action();
          return;
        }
      } catch {
        // fall through to normal OTP flow
      }
      if (!email) {
        // Fallback: cannot OTP, just run (auth missing)
        void action();
        return;
      }
      setPending(() => action);
      setOpen(true);
    },
    [verifiedUntil, email]
  );

  const onVerified = useCallback(() => {
    setVerifiedUntil(Date.now() + cacheMs);
    const fn = pending;
    setPending(null);
    setOpen(false);
    if (fn) void fn();
  }, [pending, cacheMs]);

  return { email, open, setOpen, requireOtp, onVerified, isTrusted: Date.now() < verifiedUntil };
}
