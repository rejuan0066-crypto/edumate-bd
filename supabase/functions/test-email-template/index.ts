// Sends a test email using the resolved SMTP profile (purpose: 'all' fallback).
// Used by the Admin Email Templates page preview.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { sendViaSMTP } from "../_shared/smtp.ts";
import { resolveSmtpProfile } from "../_shared/smtp-resolver.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { to, subject, html, template_key } = await req.json();
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "to, subject, html required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Try template-specific purpose first, then 'all'
    const purposeMap: Record<string, string> = {
      otp: "otp", password_reset: "otp",
      welcome: "welcome", notice: "notice",
    };
    const purpose = purposeMap[template_key] || "all";
    const smtp = await resolveSmtpProfile(supabase, purpose);

    if (!smtp) {
      return new Response(JSON.stringify({ error: "কোনো সক্রিয় SMTP প্রোফাইল পাওয়া যায়নি" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sendViaSMTP(smtp as any, to, `[TEST] ${subject}`, html);

    return new Response(JSON.stringify({
      success: true,
      smtp_profile: { name: (smtp as any).name, purpose: (smtp as any).purpose, resolved_via: (smtp as any).resolved_via },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
