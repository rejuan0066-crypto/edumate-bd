import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const callerId = claimsData.claims.sub as string;
    const callerEmail = (claimsData.claims.email as string) || "";

    // Verify caller is admin or super_admin
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) return json({ error: "Forbidden: admin role required" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action || new URL(req.url).searchParams.get("action");

    if (action === "list_locked") {
      // Get OTP config thresholds
      const { data: cfg } = await admin
        .from("otp_config")
        .select("max_attempts, hourly_limit, daily_limit")
        .eq("id", 1)
        .maybeSingle();
      const maxAttempts = cfg?.max_attempts ?? 3;
      const hourlyLimit = cfg?.hourly_limit ?? 5;

      const sinceHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const sinceDay = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: codes, error } = await admin
        .from("otp_codes")
        .select("email, attempts, max_attempts, is_used, expires_at, created_at, purpose")
        .gte("created_at", sinceDay)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) return json({ error: error.message }, 500);

      // Aggregate per email
      const map = new Map<string, any>();
      for (const c of codes || []) {
        const key = c.email;
        const cur = map.get(key) || {
          email: key,
          total_codes_24h: 0,
          codes_last_hour: 0,
          max_attempts_seen: 0,
          last_purpose: c.purpose,
          last_attempt_at: c.created_at,
          locked_codes: 0,
        };
        cur.total_codes_24h++;
        if (c.created_at >= sinceHour) cur.codes_last_hour++;
        cur.max_attempts_seen = Math.max(cur.max_attempts_seen, c.attempts || 0);
        if ((c.attempts || 0) >= (c.max_attempts || maxAttempts) && !c.is_used) cur.locked_codes++;
        map.set(key, cur);
      }
      const result = Array.from(map.values())
        .map((r) => ({
          ...r,
          is_locked:
            r.locked_codes > 0 ||
            r.max_attempts_seen >= maxAttempts ||
            r.codes_last_hour >= hourlyLimit,
        }))
        .filter((r) => r.is_locked || r.max_attempts_seen > 0)
        .sort((a, b) => (a.last_attempt_at < b.last_attempt_at ? 1 : -1));

      return json({ ok: true, locked: result, thresholds: { maxAttempts, hourlyLimit } });
    }

    if (action === "reset_attempts") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return json({ error: "email required" }, 400);

      // Mark all unused codes as consumed (clears the lock without deleting history)
      const { error: e1 } = await admin
        .from("otp_codes")
        .update({ is_used: true })
        .eq("email", email)
        .eq("is_used", false);
      if (e1) return json({ error: e1.message }, 500);

      await admin.from("system_logs").insert({
        user_id: callerId,
        action: "OTP_RESET_ATTEMPTS",
        table_name: "otp_codes",
        record_id: email,
        new_data: { email, performed_by_email: callerEmail, reason: body.reason || null },
      });

      return json({ ok: true, message: `Cleared OTP locks for ${email}` });
    }

    if (action === "revoke_sessions") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return json({ error: "email required" }, 400);

      // Find user by email
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (listErr) return json({ error: listErr.message }, 500);
      const user = list?.users?.find((u: any) => (u.email || "").toLowerCase() === email);
      if (!user) return json({ error: "User not found in auth" }, 404);

      // Revoke all refresh tokens / sign out user globally
      const { error: signErr } = await admin.auth.admin.signOut(user.id, "global");
      if (signErr) return json({ error: signErr.message }, 500);

      await admin.from("system_logs").insert({
        user_id: callerId,
        action: "OTP_REVOKE_SESSIONS",
        table_name: "auth.users",
        record_id: user.id,
        new_data: { email, performed_by_email: callerEmail, reason: body.reason || null },
      });

      return json({ ok: true, message: `Sessions revoked for ${email}` });
    }

    if (action === "full_recover") {
      // reset attempts + revoke sessions in one go
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return json({ error: "email required" }, 400);

      await admin.from("otp_codes").update({ is_used: true }).eq("email", email).eq("is_used", false);

      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const user = list?.users?.find((u: any) => (u.email || "").toLowerCase() === email);
      if (user) {
        await admin.auth.admin.signOut(user.id, "global");
      }

      await admin.from("system_logs").insert({
        user_id: callerId,
        action: "OTP_FULL_RECOVERY",
        table_name: "otp_codes",
        record_id: email,
        new_data: {
          email,
          performed_by_email: callerEmail,
          reason: body.reason || null,
          sessions_revoked: !!user,
        },
      });

      return json({
        ok: true,
        message: `Full recovery complete for ${email}`,
        sessions_revoked: !!user,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("admin-otp-recovery error:", err);
    return json({ error: err?.message || "Server error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
