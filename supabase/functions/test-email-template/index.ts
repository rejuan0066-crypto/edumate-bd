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

// In-memory per-admin rate limit. Edge function instances are short-lived but
// this still meaningfully limits a single sustained admin session.
const RATE_LIMIT_MAX = 10;             // sends per window
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;  // 1 hour
const sendLog = new Map<string, number[]>();

function recordAndCheckLimit(userId: string): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const prev = (sendLog.get(userId) || []).filter((t) => t > windowStart);
  if (prev.length >= RATE_LIMIT_MAX) {
    const earliest = prev[0];
    const resetInSec = Math.ceil((earliest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    sendLog.set(userId, prev);
    return { allowed: false, remaining: 0, resetInSec: Math.max(resetInSec, 1) };
  }
  prev.push(now);
  sendLog.set(userId, prev);
  return { allowed: true, remaining: RATE_LIMIT_MAX - prev.length, resetInSec: 0 };
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
    if (!hasAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden — admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { to, subject, html, template_key, audit_only } = body;

    if (audit_only) {
      // Probe — don't actually send; just return current usage
      const log = (sendLog.get(userId) || []).filter((t) => t > Date.now() - RATE_LIMIT_WINDOW_MS);
      return new Response(JSON.stringify({
        success: true,
        used: log.length,
        limit: RATE_LIMIT_MAX,
        remaining: Math.max(0, RATE_LIMIT_MAX - log.length),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "to, subject, html required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Per-admin rate limit ----
    const rl = recordAndCheckLimit(userId);
    if (!rl.allowed) {
      return new Response(JSON.stringify({
        error: "RATE_LIMIT_EXCEEDED",
        message: `Test-send limit reached (${RATE_LIMIT_MAX}/hour). Try again in ${rl.resetInSec}s.`,
        retry_after_seconds: rl.resetInSec,
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
      limit: RATE_LIMIT_MAX,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
