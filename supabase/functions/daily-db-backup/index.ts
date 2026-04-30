// Daily DB Backup edge function — exports all public tables to JSON in db-backups bucket
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RETENTION_DAYS = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const startedAt = new Date().toISOString();
  let backupId: string | null = null;

  try {
    // Determine trigger source (manual call passes user JWT; cron passes service role)
    const authHeader = req.headers.get("authorization") || "";
    let triggeredBy: string | null = null;
    let backupType: "manual" | "daily" = "daily";

    if (authHeader && !authHeader.includes(SERVICE_KEY)) {
      try {
        const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (user) { triggeredBy = user.id; backupType = "manual"; }
      } catch { /* ignore */ }
    }

    // Create history row
    const { data: hist, error: histErr } = await admin
      .from("backup_history")
      .insert({ backup_type: backupType, status: "in_progress", triggered_by: triggeredBy, started_at: startedAt })
      .select("id").single();
    if (histErr) throw histErr;
    backupId = hist.id;

    // Fetch list of public tables (excluding sensitive/large noise tables)
    const { data: tables, error: tErr } = await admin.rpc("get_public_tables");
    if (tErr) throw tErr;

    const skip = new Set([
      "system_logs", "rate_limit_log", "encryption_keys",
      "backup_history", "otp_codes",
    ]);
    const tableList = (tables as { table_name: string }[])
      .map((t) => t.table_name)
      .filter((n) => !skip.has(n));

    const dump: Record<string, unknown[]> = {};
    let totalRows = 0;

    for (const tbl of tableList) {
      const rows: unknown[] = [];
      let from = 0;
      const PAGE = 1000;
      // paginate to bypass 1000-row limit
      while (true) {
        const { data, error } = await admin.from(tbl).select("*").range(from, from + PAGE - 1);
        if (error) { console.warn(`skip ${tbl}: ${error.message}`); break; }
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      dump[tbl] = rows;
      totalRows += rows.length;
    }

    const json = JSON.stringify({
      version: 1,
      taken_at: startedAt,
      table_count: tableList.length,
      row_count: totalRows,
      data: dump,
    });
    const blob = new Blob([json], { type: "application/json" });
    const fileSize = blob.size;

    const date = new Date();
    const path = `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/backup-${date.toISOString().replace(/[:.]/g, "-")}.json`;

    const { error: upErr } = await admin.storage.from("db-backups").upload(path, blob, {
      contentType: "application/json", upsert: false,
    });
    if (upErr) throw upErr;

    await admin.from("backup_history").update({
      status: "success",
      storage_path: path,
      file_size_bytes: fileSize,
      table_count: tableList.length,
      row_count: totalRows,
      completed_at: new Date().toISOString(),
    }).eq("id", backupId);

    // Retention cleanup — list backups older than RETENTION_DAYS, delete files & rows
    try {
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
      const { data: oldRows } = await admin
        .from("backup_history")
        .select("id, storage_path")
        .lt("created_at", cutoff)
        .eq("status", "success");
      if (oldRows && oldRows.length > 0) {
        const paths = oldRows.map((r) => r.storage_path).filter(Boolean) as string[];
        if (paths.length > 0) await admin.storage.from("db-backups").remove(paths);
        await admin.from("backup_history").delete().in("id", oldRows.map((r) => r.id));
      }
    } catch (e) { console.warn("retention cleanup failed", e); }

    return new Response(JSON.stringify({
      ok: true, backup_id: backupId, path, table_count: tableList.length, row_count: totalRows, size: fileSize,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (backupId) {
      await admin.from("backup_history").update({
        status: "failed", error_message: msg, completed_at: new Date().toISOString(),
      }).eq("id", backupId);
    }
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
