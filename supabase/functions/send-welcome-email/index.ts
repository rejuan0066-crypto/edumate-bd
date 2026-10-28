// Sends a branded welcome / confirmation email via the configured SMTP provider
// (Mailtrap, etc.) using credentials stored in the `smtp_config` table.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { sendViaSMTP, welcomeEmailHtml } from "../_shared/smtp.ts";
import { resolveSmtpProfile } from "../_shared/smtp-resolver.ts";
import { renderEmailTemplate } from "../_shared/email-template.ts";

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
    let { role, password, student_id, login_url } = body || {};

    // Determine caller trust level:
    // - Trusted: valid Supabase JWT belonging to an admin/staff/super_admin (e.g. manage-users invocation)
    //   OR a request carrying the WELCOME_EMAIL_INTERNAL_SECRET shared secret header.
    // - Untrusted: public callers (admission form). They MUST NOT be able to inject `password`
    //   or `role` into the rendered email — those fields are stripped server-side.
    const internalSecret = Deno.env.get('WELCOME_EMAIL_INTERNAL_SECRET');
    const providedSecret = req.headers.get('x-internal-secret') || '';
    let trusted = !!(internalSecret && providedSecret && providedSecret === internalSecret);

    if (!trusted) {
      const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
      if (authHeader?.toLowerCase().startsWith('bearer ')) {
        try {
          const token = authHeader.replace(/^Bearer\s+/i, '').trim();
          const { data: claimsData } = await supabase.auth.getClaims(token);
          const sub = claimsData?.claims?.sub as string | undefined;
          if (sub) {
            for (const r of ['admin', 'super_admin', 'staff'] as const) {
              const { data: ok } = await supabase.rpc('has_role', { _user_id: sub, _role: r });
              if (ok === true) { trusted = true; break; }
            }
          }
        } catch { /* ignore */ }
      }
    }

    if (!trusted) {
      // Untrusted callers are only permitted for genuine recent admissions
      if (kind !== 'student' || !student_id) {
        await logDelivery('failed', 'Unauthorized email dispatch attempt from untrusted caller', { code: 'FORBIDDEN' });
        return new Response(JSON.stringify({ error: "Unauthorized email dispatch" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify matching student was recently submitted
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: stuRecord } = await supabase
        .from('students')
        .select('id, email, student_id')
        .eq('student_id', student_id)
        .gte('created_at', fifteenMinAgo)
        .maybeSingle();

      if (!stuRecord || !stuRecord.email || !email || String(stuRecord.email).trim().toLowerCase() !== String(email).trim().toLowerCase()) {
        await logDelivery('failed', 'No matching recent admission record for student email', { code: 'FORBIDDEN' });
        return new Response(JSON.stringify({ error: "No matching admission record" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Strip privileged fields
      password = undefined;
      role = undefined;
    }

    if (!email || !body?.kind) {
      await logDelivery('failed', 'email and kind are required');
      return new Response(JSON.stringify({ error: "email and kind are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const smtpConfig = await resolveSmtpProfile(supabase, "welcome");

    if (!smtpConfig) {
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

    const fallbackHtml = welcomeEmailHtml({
      fullName: full_name, role, email, password,
      loginUrl: login_url, brandName,
      kind: kind as 'user' | 'student', studentId: student_id,
    });
    const fallbackSubject = kind === 'student'
      ? `Welcome to ${brandName || 'our institution'} — Admission Confirmed`
      : `Welcome to ${brandName || 'our system'} — Your Account is Ready`;

    const rendered = await renderEmailTemplate(supabase, "welcome", {
      user_name: full_name || email.split("@")[0],
      institution_name: brandName || "Subhani Madrasah",
      login_url: login_url || "#",
      support_email: email,
    }, { subject: fallbackSubject, html: fallbackHtml });

    subject = rendered.subject;
    await sendViaSMTP(smtpConfig as any, email, rendered.subject, rendered.html);
    await logDelivery('sent', undefined, { role, has_password: !!password, student_id, used_db_template: rendered.used_db_template });

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
