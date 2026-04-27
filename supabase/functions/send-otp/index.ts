import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { rateLimitResponse, otpErrorResponse } from "../_shared/validate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendViaSMTP(smtpConfig: any, to: string, subject: string, htmlBody: string) {
  const { smtp_host, smtp_port, smtp_username, smtp_password, from_email, from_name, use_tls } = smtpConfig;

  const conn = await Deno.connect({
    hostname: smtp_host,
    port: smtp_port || 587,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const buf = new Uint8Array(4096);

  async function readResponse(): Promise<string> {
    const n = await conn.read(buf);
    return decoder.decode(buf.subarray(0, n || 0));
  }

  async function sendCommand(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + "\r\n"));
    return await readResponse();
  }

  // Read greeting
  await readResponse();

  // EHLO
  await sendCommand("EHLO localhost");

  if (use_tls) {
    const starttlsResp = await sendCommand("STARTTLS");
    if (starttlsResp.startsWith("220")) {
      const tlsConn = await Deno.startTls(conn, { hostname: smtp_host });

      async function readTls(): Promise<string> {
        const b = new Uint8Array(4096);
        const n = await tlsConn.read(b);
        return decoder.decode(b.subarray(0, n || 0));
      }

      async function sendTls(cmd: string): Promise<string> {
        await tlsConn.write(encoder.encode(cmd + "\r\n"));
        return await readTls();
      }

      await sendTls("EHLO localhost");

      // AUTH LOGIN
      await sendTls("AUTH LOGIN");
      await sendTls(btoa(smtp_username));
      const authResp = await sendTls(btoa(smtp_password));

      if (!authResp.startsWith("235")) {
        tlsConn.close();
        throw new Error("SMTP authentication failed");
      }

      const fromHeader = from_name ? `"${from_name}" <${from_email}>` : from_email;
      await sendTls(`MAIL FROM:<${from_email}>`);
      await sendTls(`RCPT TO:<${to}>`);
      await sendTls("DATA");

      const message = [
        `From: ${fromHeader}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        ``,
        htmlBody,
        `.`,
      ].join("\r\n");

      const dataResp = await sendTls(message);
      await sendTls("QUIT");
      tlsConn.close();

      if (!dataResp.startsWith("250")) {
        throw new Error("Failed to send email: " + dataResp);
      }

      return true;
    }
  }

  // Non-TLS fallback (AUTH LOGIN)
  await sendCommand("AUTH LOGIN");
  await sendCommand(btoa(smtp_username));
  const authResp = await sendCommand(btoa(smtp_password));

  if (!authResp.startsWith("235")) {
    conn.close();
    throw new Error("SMTP authentication failed");
  }

  const fromHeader = from_name ? `"${from_name}" <${from_email}>` : from_email;
  await sendCommand(`MAIL FROM:<${from_email}>`);
  await sendCommand(`RCPT TO:<${to}>`);
  await sendCommand("DATA");

  const message = [
    `From: ${fromHeader}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    htmlBody,
    `.`,
  ].join("\r\n");

  const dataResp = await sendCommand(message);
  await sendCommand("QUIT");
  conn.close();

  if (!dataResp.startsWith("250")) {
    throw new Error("Failed to send email: " + dataResp);
  }

  return true;
}

function generateOtpEmailHtml(code: string, expiryMinutes: number, purpose: string, fromName: string) {
  const purposeText = purpose === "password_reset" ? "Password Reset" : "Email Verification";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1a7f64,#2da882);padding:32px 24px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;">${fromName || 'Verification'}</h1>
      <p style="color:#d4f5e9;margin:8px 0 0;font-size:13px;">${purposeText}</p>
    </div>
    <div style="padding:32px 24px;text-align:center;">
      <p style="color:#333;font-size:15px;margin:0 0 24px;">Your verification code is:</p>
      <div style="background:#f0faf6;border:2px dashed #1a7f64;border-radius:12px;padding:20px;margin:0 auto;max-width:240px;">
        <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1a7f64;">${code}</span>
      </div>
      <p style="color:#666;font-size:13px;margin:24px 0 0;">This code will expire in <strong>${expiryMinutes} minutes</strong>.</p>
      <p style="color:#999;font-size:12px;margin:16px 0 0;">If you didn't request this, please ignore this email.</p>
    </div>
    <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #eee;">
      <p style="color:#aaa;font-size:11px;margin:0;">Sent securely • Do not share this code</p>
    </div>
  </div>
</body>
</html>`;
}

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

    // ---- Rate limiting & cooldown ----
    // Tunables
    const COOLDOWN_SECONDS = 60;   // min gap between two OTP requests for the same email+purpose
    const HOURLY_LIMIT = 5;        // max OTP requests per email+purpose in last 60 minutes
    const DAILY_LIMIT = 15;        // max OTP requests per email+purpose in last 24 hours

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

    // Check SMTP config first
    const { data: smtpConfig } = await supabase
      .from("smtp_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    // Check EmailJS config
    const { data: emailjsConfig } = await supabase
      .from("emailjs_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    const useSmtp = smtpConfig?.is_enabled;
    const useEmailjs = emailjsConfig?.is_enabled;

    if (!useSmtp && !useEmailjs) {
      return otpErrorResponse({
        status: 400,
        code: "EMAIL_SERVICE_UNCONFIGURED",
        message: "No email service is configured. Please contact an administrator.",
      });
    }

    const expiryMinutes = useSmtp ? 10 : (emailjsConfig?.otp_expiry_minutes || 10);
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
        const html = generateOtpEmailHtml(code, expiryMinutes, purpose, smtpConfig.from_name);
        await sendViaSMTP(smtpConfig, email, subject, html);

        return new Response(
          JSON.stringify({ success: true, method: "smtp", expiry_minutes: expiryMinutes }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (smtpError) {
        console.error("SMTP send failed:", smtpError);
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
