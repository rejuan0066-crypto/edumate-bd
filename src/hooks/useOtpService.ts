import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
// EmailJS is now invoked server-side (in the send-otp edge function) so the OTP
// code is never returned to the client. The browser SDK is no longer imported.
import { toast } from 'sonner';

/**
 * ============================================================================
 *  SINGLE SOURCE OF TRUTH FOR ALL OTP TRAFFIC
 * ----------------------------------------------------------------------------
 *  EVERY component that needs to send / verify / resend an OTP MUST go through
 *  `useOtpService()` (React) or the `otpService` module export (non-React).
 *  Direct calls to `supabase.functions.invoke('send-otp' | 'verify-otp')` or
 *  raw `fetch` to the OTP edge functions are FORBIDDEN — they bypass:
 *    1. Cooldown / rate-limit handling (causes false 429 "blank screen" errors)
 *    2. EmailJS fallback dispatch
 *    3. Telemetry / lockout tracking
 *  If you need new OTP behaviour, extend this file — do not call the edge
 *  function from elsewhere.
 * ============================================================================
 */

export interface SendOtpResult {
  success: boolean;
  expiryMinutes?: number;
  /** Seconds the client must wait before the next request (from 429 or app-level cooldown). */
  retryAfterSeconds?: number;
  /** Machine-readable error code from the API. */
  errorCode?: string;
  /** Human-readable message safe to show in UI. */
  message?: string;
  /** Which delivery path the server used (smtp | emailjs). Useful for the admin test panel. */
  method?: 'smtp' | 'emailjs' | string;
}

export interface VerifyOtpResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
  retryAfterSeconds?: number;
  attemptsRemaining?: number;
}

export type OtpPurpose = 'email_verification' | 'password_reset';
export type OtpScope = 'login' | 'password_reset' | 'email_change' | 'password_change' | 'deletion_auth';

const FUNCTIONS_BASE = `${(import.meta.env.VITE_SUPABASE_URL || '').replace(/^["']|["']$/g, '').trim()}/functions/v1`;
const ANON_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').replace(/^["']|["']$/g, '').trim();

/**
 * Direct fetch to an edge function — bypasses supabase-js's `functions.invoke`,
 * which logs every non-2xx response to console.error (caught by the runtime
 * error tracker as a "blank screen" runtime error even when handled).
 * Returns parsed JSON body and the HTTP status. Never throws on 4xx/5xx.
 */
async function callEdgeFunction(
  name: string,
  body: Record<string, unknown>,
): Promise<{ status: number; data: any | null; networkError?: unknown }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token || ANON_KEY;
    const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    let data: any = null;
    try { data = await res.json(); } catch { /* non-JSON */ }
    return { status: res.status, data };
  } catch (networkError) {
    return { status: 0, data: null, networkError };
  }
}

interface SendOptions {
  /** Toast on toast-able errors (most flows want this). The admin Test panel sets it false. */
  toastOnError?: boolean;
  /** Skip the EmailJS client dispatch (rare — used by Test panel that only checks the path). */
  skipEmailJsDispatch?: boolean;
}

/** Core send implementation — the only place that talks to `send-otp`. */
async function sendOtpCore(
  email: string,
  purpose: OtpPurpose,
  recipientName?: string,
  scope?: OtpScope,
  opts: SendOptions = {},
): Promise<SendOtpResult> {
  const toastOnError = opts.toastOnError !== false;
  const { status, data, networkError } = await callEdgeFunction('send-otp', {
    email, purpose, scope,
  });

  if (networkError) {
    if (toastOnError) toast.error('Failed to send verification email');
    return { success: false, message: 'Network error' };
  }

  if (status < 200 || status >= 300) {
    const retry = Number(data?.retry_after_seconds) || undefined;
    const message = data?.message || data?.error || 'Failed to send code';
    const code = data?.code as string | undefined;
    if (toastOnError && code !== 'COOLDOWN_ACTIVE') toast.error(message);
    return { success: false, errorCode: code, message, retryAfterSeconds: retry };
  }

  if (!data?.success) {
    const message = data?.message || data?.error || 'Failed to generate OTP';
    if (toastOnError) toast.error(message);
    return { success: false, message, errorCode: data?.code };
  }

  // Server-side delivery (SMTP or EmailJS) — the OTP code is never returned to
  // the client anymore. Treat both methods identically.
  return { success: true, expiryMinutes: data.expiry_minutes, method: data.method || 'smtp' };
}

/** Core verify implementation — the only place that talks to `verify-otp`. */
async function verifyOtpCore(
  email: string,
  code: string,
  purpose: OtpPurpose,
): Promise<VerifyOtpResult> {
  const { status, data, networkError } = await callEdgeFunction('verify-otp', {
    email, code, purpose,
  });

  if (networkError) return { valid: false, error: 'Verification failed' };

  if (status < 200 || status >= 300) {
    return {
      valid: false,
      error: data?.message || data?.error || 'Verification failed',
      errorCode: data?.code,
      retryAfterSeconds: Number(data?.retry_after_seconds) || undefined,
      attemptsRemaining: typeof data?.attempts_remaining === 'number'
        ? data.attempts_remaining : undefined,
    };
  }

  return {
    valid: !!data?.valid,
    error: data?.error || data?.message,
    errorCode: data?.code,
  };
}

/**
 * Non-React export for callers that aren't components/hooks (utils, services).
 * Same single pipeline as the hook — never reach for `functions.invoke` instead.
 */
export const otpService = {
  sendOtp: sendOtpCore,
  verifyOtp: verifyOtpCore,
  /** Live end-to-end send used by /admin/settings Test OTP button.
   *  Returns the delivery method without showing duplicate toasts. */
  testSendOtp: (email: string) =>
    sendOtpCore(email, 'email_verification', undefined, undefined, { toastOnError: false }),
};

/** React hook wrapper — adds `sending` / `verifying` busy flags. */
export const useOtpService = () => {
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const sendOtp = async (
    email: string,
    purpose: OtpPurpose,
    recipientName?: string,
    scope?: OtpScope,
  ): Promise<SendOtpResult> => {
    setSending(true);
    try {
      return await sendOtpCore(email, purpose, recipientName, scope);
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async (
    email: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<VerifyOtpResult> => {
    setVerifying(true);
    try {
      return await verifyOtpCore(email, code, purpose);
    } finally {
      setVerifying(false);
    }
  };

  return { sendOtp, verifyOtp, sending, verifying };
};
