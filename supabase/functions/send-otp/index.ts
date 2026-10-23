import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { rateLimitResponse, otpErrorResponse } from "../_shared/validate.ts";
import { sendViaSMTP } from "../_shared/smtp.ts";
import { resolveSmtpProfile } from "../_shared/smtp-resolver.ts";
import { renderEmailTemplate } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FALLBACK_OTP_HTML = `<!DOCTYPE html><html><body style="font-family:Arial;background:#f4f4f7;padding:40px;"><div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;text-align:center;"><h2 style="color:#1a7f64;">Verification Code</h2><div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1a7f64;background:#f0faf6;padding:20px;border-radius:12px;margin:20px 0;">{{otp}}</div><p>Expires in {{expiry_minutes}} minutes.</p></div></body></html>`;

/**
 * Send OTP via EmailJS REST API server-side. The OTP code is NEVER returned to
 * the client — this is the security boundary. If EmailJS rejects non-browser
 * calls, disable "Allow EmailJS API for non-browser applications" lock in
 * EmailJS dashboard → Account → Security.
 */
async function sendViaEmailJsServerSide(
  cfg: { service_id: string; template_id: string; public_key: string },
  toEmail: string,
  otpCode: string,
  expiryMinutes: number,
  purpose: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "origin": "http://localhost" },
      body: JSON.stringify({
        service_id: cfg.service_id,
        template_id: cfg.template_id,
        user_id: cfg.public_key,
        template_params: {
          to_email: toEmail,
          to_name: toEmail.split("@")[0],
          otp_code: otpCode,
          expiry_minutes: expiryMinutes,
          purpose: purpose === "password_reset" ? "Password Reset" : "Email Verification",
        },
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: `EmailJS HTTP ${res.status}: ${txt}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, purpose, scope, role } = await req.json();

    if (!email || !purpose) {
      return otpErrorResponse({
        status: 400,
        code: "INVALID_REQUEST",
        message: "Email and purpose are required",
      });
    }

    const validPurposes = ["email_verification", "password_reset"];
    if (!validPurposes.includes(purpose)) {
      return otpErrorResponse({
        status: 400,
        code: "INVALID_PURPOSE",
        message: "Invalid purpose. Must be 'email_verification' or 'password_reset'.",
      });
    }

    // Optional fine-grained scope: 'login' | 'password_reset' | 'email_change' | 'password_change'
    // Falls back to a sensible default derived from `purpose` when not supplied.
    const validScopes = ["login", "password_reset", "email_change", "password_change"];
    const effectiveScope: string =
      typeof scope === "string" && validScopes.includes(scope)
        ? scope
        : (purpose === "password_reset" ? "password_reset" : "email_change");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ---- Rate limit (per-email + per-IP) ----
    const xff = req.headers.get('x-forwarded-for');
    const clientIp = (xff ? xff.split(',')[0].trim() : null)
      || req.headers.get('x-real-ip')
      || req.headers.get('cf-connecting-ip')
      || 'unknown';
    const normalizedEmail = String(email).trim().toLowerCase();

    const callRl = async (action: string, scope: string, key: string) => {
      try {
        const { data } = await supabase.rpc('check_rate_limit', { _key: key, _scope: scope, _action: action });
        return data;
      } catch { return { ok: true }; }
    };
    const rlBlocked = (res: any, scope: string, fallbackMsg: string) =>
      new Response(JSON.stringify({
        success: false, code: 'RATE_LIMITED', scope,
        retry_after: res.retry_after,
        error: res.message_bn || fallbackMsg,
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(res.retry_after || 30) } });

    // Resolve phone + auth user_id linked to this email (best-effort, non-fatal)
    let resolvedPhone: string | null = null;
    let resolvedUserId: string | null = null;
    try {
      const { data: au } = await supabase
        .from('profiles')
        .select('id, phone')
        .ilike('id', '%') // no-op; we filter by email via auth.users below
        .limit(0);
      void au;
    } catch { /* ignore */ }
    try {
      // Look up auth user by email
      const { data: userList } = await (supabase as any).auth.admin.listUsers({
        page: 1, perPage: 1, filter: `email.eq.${normalizedEmail}`,
      });
      const u = userList?.users?.find?.((x: any) => (x.email || '').toLowerCase() === normalizedEmail);
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
          .select('phone, user_id').ilike('email', normalizedEmail)
          .is('deleted_at', null).maybeSingle();
        if (s?.phone) resolvedPhone = String(s.phone).trim();
        if (!resolvedUserId && s?.user_id) resolvedUserId = s.user_id;
      } catch { /* ignore */ }
    }
    if (!resolvedPhone) {
      try {
        const { data: a } = await supabase.from('administrative_officers')
          .select('phone, user_id').ilike('email', normalizedEmail)
          .is('deleted_at', null).maybeSingle();
        if (a?.phone) resolvedPhone = String(a.phone).trim();
        if (!resolvedUserId && a?.user_id) resolvedUserId = a.user_id;
      } catch { /* ignore */ }
    }

    // Email + IP (existing)
    const emailRl = await callRl('otp_send_email', 'email', normalizedEmail);
    if (emailRl?.ok === false) return rlBlocked(emailRl, 'email', 'Too many OTP requests for this email.');
    const ipRl = await callRl('otp_send_ip', 'ip', clientIp);
    if (ipRl?.ok === false) return rlBlocked(ipRl, 'ip', 'Too many OTP requests from this network.');

    // Per-phone (minute + hourly)
    if (resolvedPhone) {
      const phoneMin = await callRl('otp_send_phone', 'phone', resolvedPhone);
      if (phoneMin?.ok === false) return rlBlocked(phoneMin, 'phone', 'Too many OTP requests for this mobile number.');
      const phoneHr = await callRl('otp_send_phone_hourly', 'phone', resolvedPhone);
      if (phoneHr?.ok === false) return rlBlocked(phoneHr, 'phone', 'Hourly OTP limit reached for this mobile number.');
    }

    // Per-user (minute + hourly)
    if (resolvedUserId) {
      const userMin = await callRl('otp_send_user', 'user', resolvedUserId);
      if (userMin?.ok === false) return rlBlocked(userMin, 'user', 'Too many OTP requests for this account.');
      const userHr = await callRl('otp_send_user_hourly', 'user', resolvedUserId);
      if (userHr?.ok === false) return rlBlocked(userHr, 'user', 'Hourly OTP limit reached for this account.');
    }


    // ---- Load OTP config (toggle + dynamic limits) ----
    const { data: otpCfg } = await supabase
      .from("otp_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (otpCfg && otpCfg.is_enabled === false) {
      return otpErrorResponse({
        status: 403,
        code: "OTP_DISABLED",
        message: "OTP verification is currently disabled by the administrator.",
      });
    }

    // ---- Per-flow OTP requirement check (admin-controlled) ----
    // Per-role overrides take precedence over the global per-flow flag.
    const scopeFlagMap: Record<string, string> = {
      login: "require_for_login",
      password_reset: "require_for_password_reset",
      email_change: "require_for_email_change",
      password_change: "require_for_password_change",
    };
    const validRoles = ["admin", "parent", "staff", "student"];
    const effectiveRole: string | null =
      typeof role === "string" && validRoles.includes(role) ? role : null;

    let isRequired: boolean | null = null;
    if (effectiveRole && otpCfg && (otpCfg as any).role_overrides) {
      const ro = (otpCfg as any).role_overrides;
      const v = ro?.[effectiveRole]?.[effectiveScope];
      if (typeof v === "boolean") isRequired = v;
    }
    if (isRequired === null) {
      const scopeFlag = scopeFlagMap[effectiveScope];
      if (otpCfg && scopeFlag) isRequired = (otpCfg as any)[scopeFlag] !== false;
    }

    if (isRequired === false) {
      return otpErrorResponse({
        status: 403,
        code: "OTP_NOT_REQUIRED_FOR_SCOPE",
        message: `OTP is disabled for ${effectiveScope}${effectiveRole ? ` (role=${effectiveRole})` : ""} by the administrator.`,
      });
    }

    // ---- Rate limiting & cooldown (from config or defaults) ----
    const COOLDOWN_SECONDS = otpCfg?.cooldown_seconds ?? 60;
    const HOURLY_LIMIT = otpCfg?.hourly_limit ?? 5;
    const DAILY_LIMIT = otpCfg?.daily_limit ?? 15;
    const CONFIG_EXPIRY_MIN = otpCfg?.expiry_minutes ?? 10;

    const nowMs = Date.now();
    const cooldownSince = new Date(nowMs - COOLDOWN_SECONDS * 1000).toISOString();
    const hourSince = new Date(nowMs - 60 * 60 * 1000).toISOString();
    const daySince = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();

    // Most recent OTP for cooldown check
    const { data: lastOtp } = await supabase
      .from("otp_codes")
      .select("created_at")
      .eq("email", email)
      .eq("purpose", purpose)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastOtp?.created_at) {
      const lastMs = new Date(lastOtp.created_at).getTime();
      const elapsed = Math.floor((nowMs - lastMs) / 1000);
      if (elapsed < COOLDOWN_SECONDS) {
        const retryAfter = COOLDOWN_SECONDS - elapsed;
        return rateLimitResponse({
          code: "COOLDOWN_ACTIVE",
          message: `Please wait ${retryAfter} seconds before requesting another code.`,
          retryAfterSeconds: retryAfter,
          scope: `${purpose}:${email}`,
        });
      }
    }

    // Hourly + daily counts
    const { count: hourCount } = await supabase
      .from("otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("purpose", purpose)
      .gte("created_at", hourSince);

    if ((hourCount ?? 0) >= HOURLY_LIMIT) {
      return rateLimitResponse({
        code: "HOURLY_LIMIT_EXCEEDED",
        message: `Too many OTP requests. Limit is ${HOURLY_LIMIT} per hour for this address. Try again later.`,
        retryAfterSeconds: 60 * 60,
        limit: HOURLY_LIMIT,
        scope: `${purpose}:${email}`,
      });
    }

    const { count: dayCount } = await supabase
      .from("otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("purpose", purpose)
      .gte("created_at", daySince);

    if ((dayCount ?? 0) >= DAILY_LIMIT) {
      return rateLimitResponse({
        code: "DAILY_LIMIT_EXCEEDED",
        message: `Daily OTP limit (${DAILY_LIMIT}) reached for this address. Please contact support if you need help.`,
        retryAfterSeconds: 24 * 60 * 60,
        limit: DAILY_LIMIT,
        scope: `${purpose}:${email}`,
      });
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Resolve SMTP profile by purpose (otp -> fallback to 'all')
    const smtpConfig = await resolveSmtpProfile(supabase, "otp");

    // Check EmailJS config
    const { data: emailjsConfig } = await supabase
      .from("emailjs_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    const useSmtp = !!smtpConfig;
    const useEmailjs = emailjsConfig?.is_enabled;

    if (!useSmtp && !useEmailjs) {
      return otpErrorResponse({
        status: 400,
        code: "EMAIL_SERVICE_UNCONFIGURED",
        message: "No email service is configured. Please contact an administrator.",
      });
    }

    const expiryMinutes = CONFIG_EXPIRY_MIN;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    // Invalidate old unused OTPs
    await supabase
      .from("otp_codes")
      .update({ is_used: true })
      .eq("email", email)
      .eq("purpose", purpose)
      .eq("is_used", false);

    // Store new OTP — apply admin-configured max_attempts so per-OTP lockout
    // matches /admin/settings (otp_config.max_attempts).
    const CONFIG_MAX_ATTEMPTS = Math.max(1, Number(otpCfg?.max_attempts) || 5);
    const { error: insertError } = await supabase
      .from("otp_codes")
      .insert({ email, code, purpose, expires_at: expiresAt, max_attempts: CONFIG_MAX_ATTEMPTS });

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to create OTP" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If SMTP is enabled, send directly via SMTP
    if (useSmtp) {
      try {
        const tplKey = purpose === "password_reset" ? "password_reset" : "otp";
        const rendered = await renderEmailTemplate(supabase, tplKey, {
          otp: code,
          reset_code: code,
          expiry_minutes: expiryMinutes,
          user_name: email.split("@")[0],
          institution_name: smtpConfig!.from_name || "Subhani Madrasah",
        }, { subject: "Your Verification Code", html: FALLBACK_OTP_HTML });
        await sendViaSMTP(smtpConfig, email, rendered.subject, rendered.html);

        return new Response(
          JSON.stringify({
            success: true,
            method: "smtp",
            smtp_profile: { name: smtpConfig!.name, purpose: smtpConfig!.purpose, resolved_via: smtpConfig!.resolved_via },
            expiry_minutes: expiryMinutes,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (smtpError) {
        const errMsg = smtpError instanceof Error ? smtpError.message : String(smtpError);
        console.error("SMTP send failed:", errMsg);
        // Fall back to EmailJS if available — sent SERVER-SIDE so the OTP code is never returned to the client
        if (useEmailjs) {
          const ejExpiry = emailjsConfig.otp_expiry_minutes || 10;
          const sent = await sendViaEmailJsServerSide(emailjsConfig, email, code, ejExpiry, purpose);
          if (sent.ok) {
            return new Response(
              JSON.stringify({ success: true, method: "emailjs", expiry_minutes: ejExpiry }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          console.error("EmailJS server-side send failed:", sent.error);
        }
        // Delivery failure is a configuration/provider problem, not a crash:
        // return 200 with success:false so the UI shows a message instead of a blank screen.
        return new Response(JSON.stringify({
          success: false,
          code: "EMAIL_DELIVERY_FAILED",
          error: "Failed to send email",
          message: "Could not send the verification email. Please check the email (SMTP) settings or try again later.",
          detail: errMsg.substring(0, 200),
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // EmailJS path (primary) — sent SERVER-SIDE so the OTP code is never returned to the client
    {
      const ejExpiry = emailjsConfig.otp_expiry_minutes || expiryMinutes;
      const sent = await sendViaEmailJsServerSide(emailjsConfig, email, code, ejExpiry, purpose);
      if (sent.ok) {
        return new Response(
          JSON.stringify({ success: true, method: "emailjs", expiry_minutes: ejExpiry }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("EmailJS server-side send failed:", sent.error);
      return new Response(JSON.stringify({
        success: false,
        code: "EMAIL_DELIVERY_FAILED",
        error: "Failed to send verification email",
        message: "Could not send the verification email. Please check the email settings or try again later.",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Send OTP error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
