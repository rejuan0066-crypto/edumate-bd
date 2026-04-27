// Sends a branded welcome / confirmation email via the configured SMTP provider
// (Mailtrap, etc.) using credentials stored in the `smtp_config` table.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { sendViaSMTP, welcomeEmailHtml } from "../_shared/smtp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let email = "";
  let full_name: string | undefined;
  let kind: 'user' | 'student' | 'other' = 'other';
  let subject = "";

  const logDelivery = async (status: 'sent' | 'failed', errorMessage?: string, metadata?: Record<string, unknown>) => {
    try {
      await supabase.from('email_delivery_log').insert({
        recipient_email: email || 'unknown',
        recipient_name: full_name || null,
        template_kind: kind,
        subject: subject || null,
        status,
        error_message: errorMessage || null,
        metadata: metadata || {},
      });
    } catch (e) {
      console.error('Failed to log email delivery:', e);
    }
  };

  try {
    const body = await req.json();
    email = body?.email || "";
    full_name = body?.full_name;
    kind = (body?.kind === 'user' || body?.kind === 'student') ? body.kind : 'other';
    const { role, password, student_id, login_url } = body || {};

    if (!email || !body?.kind) {
      await logDelivery('failed', 'email and kind are required');
      return new Response(JSON.stringify({ error: "email and kind are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: smtpConfig, error: smtpErr } = await supabase
      .from("smtp_config").select("*").limit(1).maybeSingle();

    if (smtpErr || !smtpConfig || !smtpConfig.is_enabled) {
      await logDelivery('failed', 'SMTP not configured or disabled', { code: 'SMTP_DISABLED' });
      return new Response(JSON.stringify({
        error: "SMTP not configured or disabled",
        code: "SMTP_DISABLED",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let brandName: string | undefined;
    try {
      const { data: site } = await supabase
        .from("website_settings").select("site_name, site_name_bn").limit(1).maybeSingle();
      brandName = (site as any)?.site_name || (site as any)?.site_name_bn || smtpConfig.from_name;
    } catch (_) {
      brandName = smtpConfig.from_name;
    }

    subject = kind === 'student'
      ? `Welcome to ${brandName || 'our institution'} — Admission Confirmed`
      : `Welcome to ${brandName || 'our system'} — Your Account is Ready`;

    const html = welcomeEmailHtml({
      fullName: full_name,
      role,
      email,
      password,
      loginUrl: login_url,
      brandName,
      kind: kind as 'user' | 'student',
      studentId: student_id,
    });

    await sendViaSMTP(smtpConfig as any, email, subject, html);
    await logDelivery('sent', undefined, { role, has_password: !!password, student_id });

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    console.error("send-welcome-email error:", e);
    await logDelivery('failed', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
