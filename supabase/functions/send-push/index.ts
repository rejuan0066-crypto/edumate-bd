// Edge Function: send-push
// Sends Web Push notifications using VAPID. Reads private/public keys from Supabase secrets.
// Body: { title, body, link?, category?, target?: 'all' | 'user', user_id?, icon? }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// @ts-ignore — Deno-compatible web-push fork
import webpush from "npm:web-push@3.6.7";

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
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@subhania.local";

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
