import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import emailjs from '@emailjs/browser';
import { toast } from 'sonner';

export interface SendOtpResult {
  success: boolean;
  expiryMinutes?: number;
  /** Seconds the client must wait before the next request (from 429 or app-level cooldown). */
  retryAfterSeconds?: number;
  /** Machine-readable error code from the API. */
  errorCode?: string;
  /** Human-readable message safe to show in UI. */
  message?: string;
}

export interface VerifyOtpResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
  retryAfterSeconds?: number;
  attemptsRemaining?: number;
}

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

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

export const useOtpService = () => {
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const sendOtp = async (
    email: string,
    purpose: 'email_verification' | 'password_reset',
    recipientName?: string,
    scope?: 'login' | 'password_reset' | 'email_change' | 'password_change'
  ): Promise<SendOtpResult> => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { email, purpose, scope },
      });

      // Handle non-2xx (rate limit, validation, etc.) — read structured envelope
      if (error) {
        const body = await readErrorBody(error);
        const retry = Number(body?.retry_after_seconds) || undefined;
        const message = body?.message || body?.error || 'Failed to send code';
        const code = body?.code as string | undefined;
        if (code !== 'COOLDOWN_ACTIVE') {
          toast.error(message);
        }
        return { success: false, errorCode: code, message, retryAfterSeconds: retry };
      }

      if (!data?.success) {
        const message = data?.message || data?.error || 'Failed to generate OTP';
        toast.error(message);
        return { success: false, message, errorCode: data?.code };
      }

      // SMTP path: server already sent the email
      if (data.method === 'smtp') {
        return { success: true, expiryMinutes: data.expiry_minutes };
      }

      // EmailJS path - send from client side
      const { otp_code, emailjs: config, expiry_minutes } = data;
      await emailjs.send(
        config.service_id,
        config.template_id,
        {
          to_email: email,
          to_name: recipientName || email,
          otp_code: otp_code,
          expiry_minutes: expiry_minutes,
          purpose: purpose === 'password_reset' ? 'Password Reset' : 'Email Verification',
        },
        config.public_key
      );

      return { success: true, expiryMinutes: expiry_minutes };
    } catch (err: any) {
      console.error('OTP send error:', err);
      const body = await readErrorBody(err);
      if (body) {
        const retry = Number(body.retry_after_seconds) || undefined;
        return {
          success: false,
          errorCode: body.code,
          message: body.message || body.error,
          retryAfterSeconds: retry,
        };
      }
      toast.error('Failed to send verification email');
      return { success: false };
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async (
    email: string,
    code: string,
    purpose: 'email_verification' | 'password_reset'
  ): Promise<VerifyOtpResult> => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { email, code, purpose },
      });

      if (error) {
        const body = await readErrorBody(error);
        return {
          valid: false,
          error: body?.message || body?.error || 'Verification failed',
          errorCode: body?.code,
          retryAfterSeconds: Number(body?.retry_after_seconds) || undefined,
          attemptsRemaining: typeof body?.attempts_remaining === 'number'
            ? body.attempts_remaining : undefined,
        };
      }

      return {
        valid: !!data?.valid,
        error: data?.error || data?.message,
        errorCode: data?.code,
      };
    } catch (err: any) {
      const body = await readErrorBody(err);
      return {
        valid: false,
        error: body?.message || body?.error || 'Verification failed',
        errorCode: body?.code,
        retryAfterSeconds: Number(body?.retry_after_seconds) || undefined,
      };
    } finally {
      setVerifying(false);
    }
  };

  return { sendOtp, verifyOtp, sending, verifying };
};

// Suppress unused warning for kept-for-future helper.
void extractErrorBody;
