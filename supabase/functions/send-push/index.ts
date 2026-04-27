// Edge Function: send-push
// Sends Web Push notifications using VAPID. Reads private/public keys from Supabase secrets.
// Body: { title, body, link?, category?, target?: 'all' | 'user', user_id?, icon? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// @ts-ignore — Deno-compatible web-push via esm.sh
import webpush from "https://esm.sh/web-push@3.6.7?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "";

    // ---- VAPID validation ----
    const vapidErrors: { field: string; message: string }[] = [];

    // base64url byte-length checker
    const b64urlByteLen = (s: string): number => {
      if (!/^[A-Za-z0-9_-]+$/.test(s)) return -1;
      // base64url decoded byte length = floor(len * 3 / 4) accounting for padding stripping
      const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
      try {
        const bin = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
        return bin.length;
      } catch {
        return -1;
      }
    };

    if (!VAPID_PUBLIC) {
      vapidErrors.push({ field: "VAPID_PUBLIC_KEY", message: "Missing. Set the VAPID_PUBLIC_KEY secret." });
    } else {
      const len = b64urlByteLen(VAPID_PUBLIC);
      if (len !== 65) {
        vapidErrors.push({
          field: "VAPID_PUBLIC_KEY",
          message: `Invalid format. Expected base64url-encoded uncompressed P-256 public key (65 bytes); got ${len < 0 ? "non-base64url string" : `${len} bytes`}.`,
        });
      }
    }

    if (!VAPID_PRIVATE) {
      vapidErrors.push({ field: "VAPID_PRIVATE_KEY", message: "Missing. Set the VAPID_PRIVATE_KEY secret." });
    } else {
      const len = b64urlByteLen(VAPID_PRIVATE);
      if (len !== 32) {
        vapidErrors.push({
          field: "VAPID_PRIVATE_KEY",
          message: `Invalid format. Expected base64url-encoded P-256 private scalar (32 bytes); got ${len < 0 ? "non-base64url string" : `${len} bytes`}.`,
        });
      }
    }

    if (!VAPID_SUBJECT) {
      vapidErrors.push({
        field: "VAPID_SUBJECT",
        message: "Missing. Set VAPID_SUBJECT to a 'mailto:you@domain.com' or 'https://your-site.com' URI (RFC 8292).",
      });
    } else if (!/^(mailto:[^\s@]+@[^\s@]+\.[^\s@]+|https?:\/\/[^\s]+)$/i.test(VAPID_SUBJECT)) {
      vapidErrors.push({
        field: "VAPID_SUBJECT",
        message: `Invalid format: "${VAPID_SUBJECT}". Must be a 'mailto:' email URI or an 'https://' URL.`,
      });
    }

    if (vapidErrors.length) {
      return new Response(
        JSON.stringify({
          error: "VAPID configuration invalid",
          details: vapidErrors,
          hint: "Generate a fresh key pair via the 'generate-vapid' edge function and store the values as project secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { title, body: msgBody, link = "/", category = "general", target = "all", user_id, icon, tag } = body;

    if (!title) {
      return new Response(JSON.stringify({ error: "title required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch active subscriptions
    let q = supabase.from("push_subscriptions").select("*").eq("is_active", true);
    if (target === "user" && user_id) q = q.eq("user_id", user_id);

    const { data: subs, error } = await q;
    if (error) throw error;

    const payload = JSON.stringify({ title, body: msgBody, link, category, icon, tag });

    let sent = 0;
    let failed = 0;
    const deadEndpoints: string[] = [];

    await Promise.all(
      (subs ?? []).map(async (s: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
          sent++;
        } catch (err: any) {
          failed++;
          // 404/410 → subscription expired, mark inactive
          if (err.statusCode === 404 || err.statusCode === 410) deadEndpoints.push(s.endpoint);
        }
      })
    );

    if (deadEndpoints.length) {
      await supabase.from("push_subscriptions").update({ is_active: false }).in("endpoint", deadEndpoints);
    }

    // Log
    await supabase.from("push_notification_log").insert({
      title, body: msgBody, link, category,
      sent_count: sent, failed_count: failed,
    });

    return new Response(JSON.stringify({ success: true, sent, failed, total: subs?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-push error:", e);
    return new Response(JSON.stringify({ error: e.message ?? "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
