// Edge Function: notify-message
// Sends a web-push notification to the other participants of a chat conversation.
// Body: { conversation_id: string, preview?: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// @ts-ignore — Deno-compatible web-push via esm.sh
import webpush from "https://esm.sh/web-push@3.6.7?target=deno";
import { requireAuth, unauthorized } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Any authenticated user may notify — participation is verified below.
  const guard = await requireAuth(req);
  if (!guard.ok) return unauthorized(guard.status, guard.error, corsHeaders);
  const senderId = guard.userId;

  try {
    const { conversation_id, preview } = await req.json();
    if (!conversation_id) return json({ error: "conversation_id required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Verify the caller is a participant of this conversation
    const { data: participants, error: pErr } = await admin
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversation_id);
    if (pErr) throw pErr;

    const ids = (participants ?? []).map((p: any) => p.user_id);
    if (!ids.includes(senderId)) return json({ error: "Forbidden" }, 403);

    const recipients = ids.filter((id: string) => id && id !== senderId);
    if (recipients.length === 0) return json({ success: true, sent: 0, failed: 0 });

    // Sender display name + conversation title
    const [{ data: senderProfile }, { data: conv }] = await Promise.all([
      admin.from("profiles").select("full_name").eq("id", senderId).maybeSingle(),
      admin.from("conversations").select("title, is_group").eq("id", conversation_id).maybeSingle(),
    ]);

    const senderName = (senderProfile as any)?.full_name || "একজন ব্যবহারকারী";
    const title = (conv as any)?.is_group && (conv as any)?.title
      ? `${(conv as any).title} — ${senderName}`
      : senderName;
    // Build the preview from the sender's latest stored message, never from request text.
    const { data: lastMsg } = await admin
      .from("chat_messages")
      .select("body, attachments, created_at")
      .eq("conversation_id", conversation_id)
      .eq("sender_id", senderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const recent = lastMsg && Date.now() - new Date((lastMsg as any).created_at).getTime() < 5 * 60 * 1000;
    if (!recent) return json({ success: true, sent: 0, failed: 0 });
    const storedBody = typeof (lastMsg as any).body === "string" ? (lastMsg as any).body.trim() : "";
    const attCount = Array.isArray((lastMsg as any).attachments) ? (lastMsg as any).attachments.length : 0;
    const bodyText = storedBody
      ? storedBody.slice(0, 140)
      : attCount ? `${attCount}টি ফাইল পাঠানো হয়েছে` : "নতুন বার্তা এসেছে";
    const link = `/admin/messages?c=${conversation_id}`;

    // In-app notifications (bell)
    await admin.from("notifications").insert(
      recipients.map((uid: string) => ({
        title: "New message",
        title_bn: title,
        message: bodyText,
        message_bn: bodyText,
        type: "info",
        category: "message",
        link,
        recipient_user_id: uid,
      })),
    );

    // Web push
    const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "";
    if (!VAPID_PUBLIC || !VAPID_PRIVATE || !VAPID_SUBJECT) {
      return json({ success: true, sent: 0, failed: 0, push: "vapid_not_configured" });
    }
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    const { data: subs, error: sErr } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("is_active", true)
      .in("user_id", recipients);
    if (sErr) throw sErr;

    const payload = JSON.stringify({
      title,
      body: bodyText,
      link,
      category: "message",
      tag: `chat-${conversation_id}`,
    });

    let sent = 0;
    let failed = 0;
    const dead: string[] = [];

    await Promise.all(
      (subs ?? []).map(async (s: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          sent++;
        } catch (err: any) {
          failed++;
          if (err?.statusCode === 404 || err?.statusCode === 410) dead.push(s.endpoint);
        }
      }),
    );

    if (dead.length) {
      await admin.from("push_subscriptions").update({ is_active: false }).in("endpoint", dead);
    }

    await admin.from("push_notification_log").insert({
      title,
      body: bodyText,
      link,
      category: "message",
      sent_count: sent,
      failed_count: failed,
    });

    return json({ success: true, sent, failed });
  } catch (e: any) {
    console.error("notify-message error:", e);
    return json({ error: e?.message ?? "unknown" }, 500);
  }
});
