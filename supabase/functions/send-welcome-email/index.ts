// Sends a branded welcome / confirmation email via the configured SMTP provider
// (Mailtrap, etc.) using credentials stored in the `smtp_config` table.
//
// Body: {
//   email: string;            // recipient
//   full_name?: string;
//   role?: string;            // for users
//   password?: string;        // optional plaintext to include in welcome email
//   kind: 'user' | 'student';
//   student_id?: string;      // for students
//   login_url?: string;
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { sendViaSMTP, welcomeEmailHtml } from "../_shared/smtp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      email,
      full_name,
      role,
      password,
      kind,
      student_id,
      login_url,
    } = body || {};

    if (!email || !kind) {
      return new Response(JSON.stringify({ error: "email and kind are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: smtpConfig, error: smtpErr } = await supabase
      .from("smtp_config").select("*").limit(1).maybeSingle();

    if (smtpErr || !smtpConfig || !smtpConfig.is_enabled) {
      return new Response(JSON.stringify({
        error: "SMTP not configured or disabled",
        code: "SMTP_DISABLED",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Try to read brand name from website_settings (best-effort)
    let brandName: string | undefined;
    try {
      const { data: site } = await supabase
        .from("website_settings").select("site_name, site_name_bn").limit(1).maybeSingle();
      brandName = (site as any)?.site_name || (site as any)?.site_name_bn || smtpConfig.from_name;
    } catch (_) {
      brandName = smtpConfig.from_name;
    }

    const subject = kind === 'student'
      ? `Welcome to ${brandName || 'our institution'} — Admission Confirmed`
      : `Welcome to ${brandName || 'our system'} — Your Account is Ready`;

    const html = welcomeEmailHtml({
      fullName: full_name,
      role,
      email,
      password,
      loginUrl: login_url,
      brandName,
      kind,
      studentId: student_id,
    });

    await sendViaSMTP(smtpConfig as any, email, subject, html);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-welcome-email error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Internal error",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
