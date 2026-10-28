// Sends a test email using the resolved SMTP profile.
// Used by the Admin Email Templates page preview.
//
// Hardening:
//  - Requires a logged-in admin (validates JWT via auth.getClaims, then has_role)
//  - Per-admin in-memory rate limit: 10 test sends per rolling hour
//  - Optional `audit_only` flag returns the rate-limit window without sending
//  - Subject is prefixed with [TEST] so recipients don't confuse it with real mail

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { sendViaSMTP } from "../_shared/smtp.ts";
import { resolveSmtpProfile } from "../_shared/smtp-resolver.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit is now driven by rate_limit_config table (action='test_email_send').
// Admins can configure max_requests + window_seconds via /admin/settings → Security tab.
const RATE_LIMIT_ACTION = "test_email_send";

async function checkRateLimit(supabase: any, userId: string): Promise<{ allowed: boolean; remaining: number; resetInSec: number; max: number; window: number }> {
  // Fetch config (defaults if not present / disabled)
  const { data: cfg } = await supabase
    .from("rate_limit_config")
    .select("max_requests, window_seconds, enabled")
    .eq("action", RATE_LIMIT_ACTION)
    .maybeSingle();
  const max = cfg?.max_requests ?? 5;
  const window = cfg?.window_seconds ?? 3600;
  if (cfg && cfg.enabled === false) {
    return { allowed: true, remaining: max, resetInSec: 0, max, window };
  }
  const { data, error } = await supabase.rpc("check_rate_limit", {
    _key: userId,
    _scope: "admin",
    _action: RATE_LIMIT_ACTION,
  });
  if (error) {
    // Fail-open on infra errors but log
    console.error("check_rate_limit RPC error", error);
    return { allowed: true, remaining: max, resetInSec: 0, max, window };
  }
  const allowed = !!data?.allowed;
  const remaining = typeof data?.remaining === "number" ? data.remaining : (allowed ? max - 1 : 0);
  const resetInSec = typeof data?.retry_after === "number" ? data.retry_after : (allowed ? 0 : window);
  return { allowed, remaining, resetInSec, max, window };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ---- Auth: must be a logged-in admin / super_admin ----
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { data: hasAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: isSuperAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
    if (!hasAdmin && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden — admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { to, subject, html, template_key, audit_only } = body;

    // Security: test emails may only be sent to the caller's own email address.
    {
      const { data: callerUser } = await supabase.auth.admin.getUserById(userId);
      const callerEmail = callerUser?.user?.email?.toLowerCase()?.trim();
      if (to && (!callerEmail || String(to).toLowerCase().trim() !== callerEmail)) {
        return new Response(JSON.stringify({
          error: "FORBIDDEN_RECIPIENT",
          message: "Test emails can only be sent to your own administrator email address.",
        }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (audit_only) {
      // Probe — return current configured usage (no increment)
      const { data: cfg } = await supabase
        .from("rate_limit_config").select("max_requests, window_seconds, enabled")
        .eq("action", RATE_LIMIT_ACTION).maybeSingle();
      return new Response(JSON.stringify({
        success: true,
        limit: cfg?.max_requests ?? 5,
        window_seconds: cfg?.window_seconds ?? 3600,
        enabled: cfg?.enabled ?? true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "to, subject, html required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- DB-driven rate limit (super_admin bypasses inside check_rate_limit) ----
    const rl = await checkRateLimit(supabase, userId);
    if (!rl.allowed) {
      return new Response(JSON.stringify({
        error: "RATE_LIMIT_EXCEEDED",
        message: `Test-send limit reached (${rl.max} per ${Math.round(rl.window / 60)} min). Try again in ${rl.resetInSec}s.`,
        retry_after_seconds: rl.resetInSec,
        limit: rl.max,
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.resetInSec) },
      });
    }

    // Try template-specific purpose first, then 'all'
    const purposeMap: Record<string, string> = {
      otp: "otp", password_reset: "otp",
      welcome: "welcome", notice: "notice",
      donation_receipt: "transactional", payment_receipt: "transactional",
      account_created: "transactional", application_submitted: "transactional",
      admission_submitted: "transactional",
    };
    const purpose = purposeMap[template_key as string] || "all";
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
      remaining: rl.remaining,
      limit: rl.max,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
