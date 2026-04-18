import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const lookaheadMinutes = 60; // Send reminders for classes starting within 60 mins
    const lookaheadTime = new Date(now.getTime() + lookaheadMinutes * 60 * 1000);

    // Find published, upcoming classes with reminders enabled
    const { data: upcomingClasses, error: classErr } = await supabase
      .from("live_classes")
      .select("id, title, title_bn, scheduled_start, access_mode, class_id, reminder_minutes, classes(name_bn,name)")
      .eq("is_published", true)
      .eq("status", "scheduled")
      .eq("enable_reminders", true)
      .is("deleted_at", null)
      .gte("scheduled_start", now.toISOString())
      .lte("scheduled_start", lookaheadTime.toISOString());

    if (classErr) throw classErr;

    const results: Array<Record<string, unknown>> = [];

    for (const lc of upcomingClasses || []) {
      const startTime = new Date(lc.scheduled_start as string);
      const minutesUntil = Math.round((startTime.getTime() - now.getTime()) / 60000);
      const reminderWindow = (lc.reminder_minutes as number) || 15;

      // Only send if within reminder window (e.g., 15 mins before)
      if (minutesUntil > reminderWindow + 5) continue;

      // Check if reminder already sent for this class
      const { data: existingReminder } = await supabase
        .from("live_class_reminders")
        .select("id")
        .eq("live_class_id", lc.id)
        .eq("reminder_type", "auto_pre_class")
        .maybeSingle();

      if (existingReminder) continue;

      const className = (lc.classes as { name_bn?: string; name?: string } | null)?.name_bn || "";
      const titleBn = `🔴 লাইভ ক্লাস শীঘ্রই শুরু হবে: ${lc.title_bn || lc.title}`;
      const titleEn = `🔴 Live Class Starting Soon: ${lc.title}`;
      const messageBn = `${className ? className + ' - ' : ''}${minutesUntil} মিনিটে শুরু হবে। এখনই প্রস্তুত হোন।`;
      const messageEn = `${className ? className + ' - ' : ''}Starts in ${minutesUntil} minutes. Get ready now.`;

      // Create in-app notification
      await supabase.from("notifications").insert({
        title: titleEn,
        title_bn: titleBn,
        message: messageEn,
        message_bn: messageBn,
        type: "info",
        category: "live_class",
        link: `/live-class/${lc.id}`,
      });

      // Log the reminder
      await supabase.from("live_class_reminders").insert({
        live_class_id: lc.id,
        reminder_type: "auto_pre_class",
        channel: "in_app",
        sent_at: now.toISOString(),
        status: "sent",
        recipients_count: 1,
      });

      results.push({ id: lc.id, title: lc.title, minutesUntil, sent: true });
    }

    // Auto-end overdue classes
    const { data: ended } = await supabase
      .from("live_classes")
      .update({ status: "ended" })
      .eq("status", "live")
      .lt("scheduled_end", now.toISOString())
      .is("deleted_at", null)
      .select("id");

    return new Response(
      JSON.stringify({
        success: true,
        remindersChecked: upcomingClasses?.length || 0,
        remindersSent: results.length,
        autoEnded: ended?.length || 0,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Live class reminder error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
