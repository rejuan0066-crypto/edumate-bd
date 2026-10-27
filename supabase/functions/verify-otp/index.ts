import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import {
  corsHeaders,
  validateBody,
  otpErrorResponse,
  rateLimitResponse,
  z,
} from "../_shared/validate.ts";

const VerifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Must be a valid email address").max(255),
  code: z.string().trim().regex(/^\d{6}$/, "Code must be exactly 6 digits"),
  purpose: z.enum(["email_verification", "password_reset"], {
    errorMap: () => ({ message: "Purpose must be 'email_verification' or 'password_reset'" }),
  }),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const parsed = await validateBody(req, VerifyOtpSchema);
    if (!parsed.ok) return parsed.response;
    const { email, code, purpose } = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ---- Configurable per-IP / per-email rate limit (db-driven) ----
    const xff = req.headers.get('x-forwarded-for');
    const clientIp = (xff ? xff.split(',')[0].trim() : null)
      || req.headers.get('x-real-ip')
      || req.headers.get('cf-connecting-ip')
      || 'unknown';
    const callRl = async (action: string, scope: string, key: string) => {
      try {
        const { data } = await supabase.rpc('check_rate_limit', { _key: key, _scope: scope, _action: action });
        return data;
      } catch { return { ok: true }; }
    };
    const blockedRl = (res: any, scope: string, fallbackMsg: string) =>
      rateLimitResponse({
        code: 'RATE_LIMITED',
        message: res.message_bn || fallbackMsg,
        retryAfterSeconds: res.retry_after || 60,
        limit: res.limit,
        scope,
      });

    // Resolve phone + auth user_id linked to this email (best-effort, non-fatal)
    let resolvedPhone: string | null = null;
    let resolvedUserId: string | null = null;
    try {
      const { data: userList } = await (supabase as any).auth.admin.listUsers({
        page: 1, perPage: 1, filter: `email.eq.${email}`,
      });
      const u = userList?.users?.find?.((x: any) => (x.email || '').toLowerCase() === email);
      if (u?.id) {
        resolvedUserId = u.id;
        const { data: prof } = await supabase
          .from('profiles').select('phone').eq('id', u.id).maybeSingle();
        if (prof?.phone) resolvedPhone = String(prof.phone).trim();
      }
    } catch { /* ignore */ }
    if (!resolvedPhone) {
      try {
        const { data: s } = await supabase.from('staff')
          .select('phone, user_id').ilike('email', email)
          .is('deleted_at', null).maybeSingle();
        if (s?.phone) resolvedPhone = String(s.phone).trim();
        if (!resolvedUserId && s?.user_id) resolvedUserId = s.user_id;
      } catch { /* ignore */ }
    }
    if (!resolvedPhone) {
      try {
        const { data: a } = await supabase.from('administrative_officers')
          .select('phone, user_id').ilike('email', email)
          .is('deleted_at', null).maybeSingle();
        if (a?.phone) resolvedPhone = String(a.phone).trim();
        if (!resolvedUserId && a?.user_id) resolvedUserId = a.user_id;
      } catch { /* ignore */ }
    }

    const ipRl = await callRl('otp_verify_ip', 'ip', clientIp);
    if (ipRl?.ok === false) return blockedRl(ipRl, `verify:ip:${clientIp}`, 'Too many verification attempts from this network.');
    const emailRl = await callRl('otp_verify_email', 'email', email);
    if (emailRl?.ok === false) return blockedRl(emailRl, `verify:email:${email}`, 'Too many verification attempts for this email.');

    if (resolvedPhone) {
      const phMin = await callRl('otp_verify_phone', 'phone', resolvedPhone);
      if (phMin?.ok === false) return blockedRl(phMin, `verify:phone:${resolvedPhone}`, 'Too many verification attempts for this mobile number.');
      const phHr = await callRl('otp_verify_phone_hourly', 'phone', resolvedPhone);
      if (phHr?.ok === false) return blockedRl(phHr, `verify:phone:${resolvedPhone}`, 'Hourly verification limit reached for this mobile number.');
    }

    if (resolvedUserId) {
      const usMin = await callRl('otp_verify_user', 'user', resolvedUserId);
      if (usMin?.ok === false) return blockedRl(usMin, `verify:user:${resolvedUserId}`, 'Too many verification attempts for this account.');
      const usHr = await callRl('otp_verify_user_hourly', 'user', resolvedUserId);
      if (usHr?.ok === false) return blockedRl(usHr, `verify:user:${resolvedUserId}`, 'Hourly verification limit reached for this account.');
    }


    // ---- Verification rate limiting (mirrors send-otp shape) ----
    // Caps per email+purpose across re-issued OTPs to block brute-force.
    const COOLDOWN_SECONDS = 5;     // min gap between two verify attempts
    const MINUTE_LIMIT = 10;        // max verify attempts per minute
    const HOURLY_LIMIT = 30;        // max verify attempts per hour
    const DAILY_LIMIT = 100;        // max verify attempts per day

    const nowMs = Date.now();
    
    const minuteSince = new Date(nowMs - 60 * 1000).toISOString();
    const hourSince = new Date(nowMs - 60 * 60 * 1000).toISOString();
    const daySince = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();

    // Most recent attempt for cooldown check
    const { data: lastAttempt } = await supabase
      .from("otp_verify_attempts")
      .select("created_at")
      .eq("email", email)
      .eq("purpose", purpose)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastAttempt?.created_at) {
      const elapsed = Math.floor((nowMs - new Date(lastAttempt.created_at).getTime()) / 1000);
      if (elapsed < COOLDOWN_SECONDS) {
        return rateLimitResponse({
          code: "COOLDOWN_ACTIVE",
          message: `Please wait ${COOLDOWN_SECONDS - elapsed} seconds before trying again.`,
          retryAfterSeconds: COOLDOWN_SECONDS - elapsed,
          scope: `verify:${purpose}:${email}`,
        });
      }
    }

    const { count: minuteCount } = await supabase
      .from("otp_verify_attempts")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("purpose", purpose)
      .gte("created_at", minuteSince);

    if ((minuteCount ?? 0) >= MINUTE_LIMIT) {
      return rateLimitResponse({
        code: "RATE_LIMITED",
        message: `Too many verification attempts. Please wait a minute and try again.`,
        retryAfterSeconds: 60,
        limit: MINUTE_LIMIT,
        scope: `verify:${purpose}:${email}`,
      });
    }

    const { count: hourCount } = await supabase
      .from("otp_verify_attempts")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("purpose", purpose)
      .gte("created_at", hourSince);

    if ((hourCount ?? 0) >= HOURLY_LIMIT) {
      return rateLimitResponse({
        code: "HOURLY_LIMIT_EXCEEDED",
        message: `Too many verification attempts. Limit is ${HOURLY_LIMIT} per hour. Try again later.`,
        retryAfterSeconds: 60 * 60,
        limit: HOURLY_LIMIT,
        scope: `verify:${purpose}:${email}`,
      });
    }

    const { count: dayCount } = await supabase
      .from("otp_verify_attempts")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("purpose", purpose)
      .gte("created_at", daySince);

    if ((dayCount ?? 0) >= DAILY_LIMIT) {
      return rateLimitResponse({
        code: "DAILY_LIMIT_EXCEEDED",
        message: `Daily verification limit (${DAILY_LIMIT}) reached. Please contact support if you need help.`,
        retryAfterSeconds: 24 * 60 * 60,
        limit: DAILY_LIMIT,
        scope: `verify:${purpose}:${email}`,
      });
    }

    // Helper to log this attempt (success or failure)
    const logAttempt = (success: boolean) =>
      supabase.from("otp_verify_attempts").insert({ email, purpose, success });

    // Find the latest unused OTP for this email+purpose
    const { data: otpRecord, error } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email)
      .eq("purpose", purpose)
      .eq("is_used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !otpRecord) {
      await logAttempt(false);
      return otpErrorResponse({
        status: 400,
        code: "OTP_NOT_FOUND",
        message: "No valid OTP found. Please request a new code.",
        extras: { valid: false },
      });
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase.from("otp_codes").update({ is_used: true }).eq("id", otpRecord.id);
      await logAttempt(false);
      return otpErrorResponse({
        status: 400,
        code: "OTP_EXPIRED",
        message: "This OTP has expired. Please request a new code.",
        extras: { valid: false },
      });
    }

    // Check max attempts (per-OTP)
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      await supabase.from("otp_codes").update({ is_used: true }).eq("id", otpRecord.id);
      await logAttempt(false);
      return otpErrorResponse({
        status: 400,
        code: "OTP_MAX_ATTEMPTS",
        message: "Maximum attempts exceeded. Please request a new code.",
        extras: { valid: false, attempts_remaining: 0 },
      });
    }

    // Increment per-OTP attempts
    await supabase
      .from("otp_codes")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);

    // Check code
    if (otpRecord.code !== code) {
      const remaining = otpRecord.max_attempts - otpRecord.attempts - 1;
      await logAttempt(false);
      return otpErrorResponse({
        status: 400,
        code: "OTP_INVALID",
        message: `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        extras: { valid: false, attempts_remaining: Math.max(0, remaining) },
      });
    }

    // Mark as used
    await supabase.from("otp_codes").update({ is_used: true }).eq("id", otpRecord.id);
    await logAttempt(true);

    // If this OTP was for email verification, ensure the user's email is confirmed in Supabase Auth
    if (purpose === "email_verification") {
      try {
        let authUserId = resolvedUserId;
        if (!authUserId) {
          const { data: userList } = await (supabase as any).auth.admin.listUsers({ page: 1, perPage: 200 });
          const match = userList?.users?.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase());
          if (match?.id) authUserId = match.id;
        }
        if (authUserId) {
          await (supabase as any).auth.admin.updateUserById(authUserId, { email_confirm: true });
        }
      } catch (confirmErr) {
        console.error("Failed to auto-confirm email in Supabase Auth:", confirmErr);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, valid: true, reset_token: otpRecord.id, message: "OTP verified successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (_error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        message: "Something went wrong while verifying the code.",
        retry_after_seconds: null,
        valid: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
