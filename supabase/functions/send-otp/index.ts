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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, purpose } = await req.json();

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

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

    // Store new OTP
    const { error: insertError } = await supabase
      .from("otp_codes")
      .insert({ email, code, purpose, expires_at: expiresAt });

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to create OTP" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If SMTP is enabled, send directly via SMTP
    if (useSmtp) {
      try {
        const subject = purpose === "password_reset" ? "Password Reset Code" : "Email Verification Code";
        const html = generateOtpEmailHtml(code, expiryMinutes, purpose, smtpConfig!.from_name);
        await sendViaSMTP(smtpConfig, email, subject, html);

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
        // Fall back to EmailJS if available
        if (useEmailjs) {
          return new Response(
            JSON.stringify({
              success: true,
              method: "emailjs",
              otp_code: code,
              emailjs: {
                service_id: emailjsConfig.service_id,
                template_id: emailjsConfig.template_id,
                public_key: emailjsConfig.public_key,
              },
              expiry_minutes: emailjsConfig.otp_expiry_minutes || 10,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(JSON.stringify({ error: "Failed to send email via SMTP" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // EmailJS path - return config for client-side sending
    return new Response(
      JSON.stringify({
        success: true,
        method: "emailjs",
        otp_code: code,
        emailjs: {
          service_id: emailjsConfig.service_id,
          template_id: emailjsConfig.template_id,
          public_key: emailjsConfig.public_key,
        },
        expiry_minutes: expiryMinutes,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send OTP error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
