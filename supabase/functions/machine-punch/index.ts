// Fingerprint / attendance-machine punch ingest endpoint (push webhook).
// The device (or a small pusher script next to it) POSTs punches here.
// Auth: shared key from app_settings.machine_punch_api_key
//       sent as `x-api-key` header, `?key=` query param, or body.key
//
// Accepted body shapes:
//   { device_serial?, punches: [{ user_id, time, direction? }] }
//   { device_serial?, user_id, time, direction? }
// `time` = ISO string or "YYYY-MM-DD HH:MM:SS" (device local time, app timezone)
// Simple GET is also supported: ?key=..&sn=..&pin=..&time=..
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const pad = (n: number) => String(n).padStart(2, "0");

/** Parse a device timestamp into { date: YYYY-MM-DD, time: HH:MM:SS, iso } in the given tz. */
function parsePunch(raw: string, tz: string) {
  let d: Date | null = null;
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(raw.trim());
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(raw.trim());
  if (m && !hasZone) {
    // Device sends local wall-clock time — take it as-is.
    return {
      date: `${m[1]}-${m[2]}-${m[3]}`,
      time: `${m[4]}:${m[5]}:${m[6] ?? "00"}`,
      iso: new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? "00"}`).toISOString(),
    };
  }
  d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${g("year")}-${g("month")}-${g("day")}`,
    time: `${g("hour")}:${g("minute")}:${g("second")}`,
    iso: d.toISOString(),
  };
}

const toMin = (t?: string | null): number | null => {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

interface Shift {
  id: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  early_exit_grace_minutes: number;
  machine_enabled: boolean;
  attendance_mode: string;
  machine_open_before_minutes: number;
  machine_close_after_minutes: number;
}

function insideWindow(shift: Shift, time: string): boolean {
  const s = toMin(shift.start_time)!;
  let e = toMin(shift.end_time)!;
  if (e <= s) e += 1440;
  const open = s - (shift.machine_open_before_minutes ?? 0);
  const close = e + (shift.machine_close_after_minutes ?? 0);
  let t = toMin(time)!;
  if (t < open) t += 1440;
  return t >= open && t <= close;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { body = {}; }
    }

    const key = req.headers.get("x-api-key") ?? url.searchParams.get("key") ??
      (body.key as string | undefined) ?? "";

    const { data: keyRow } = await admin
      .from("app_settings").select("value").eq("key", "machine_punch_api_key").maybeSingle();
    const expected = typeof keyRow?.value === "string"
      ? keyRow.value
      : (keyRow?.value as { key?: string } | null)?.key ?? "";

    if (!expected) return json(503, { error: "machine_key_not_configured" });
    if (!key || key !== expected) return json(401, { error: "unauthorized" });

    const { data: tzRow } = await admin
      .from("app_settings").select("value").eq("key", "app_timezone").maybeSingle();
    const tz = (typeof tzRow?.value === "string" ? tzRow.value : (tzRow?.value as { timezone?: string })?.timezone) || "Asia/Dhaka";

    const deviceSerial = (body.device_serial as string | undefined) ??
      url.searchParams.get("sn") ?? null;

    type Raw = { user_id?: string; pin?: string; time?: string; direction?: string };
    let punches: Raw[] = [];
    if (Array.isArray(body.punches)) punches = body.punches as Raw[];
    else if (body.user_id || body.pin) punches = [body as Raw];
    else if (url.searchParams.get("pin") || url.searchParams.get("user_id")) {
      punches = [{
        user_id: url.searchParams.get("pin") ?? url.searchParams.get("user_id") ?? "",
        time: url.searchParams.get("time") ?? new Date().toISOString(),
        direction: url.searchParams.get("direction") ?? undefined,
      }];
    }
    if (!punches.length) return json(400, { error: "no_punches" });
    if (punches.length > 500) return json(400, { error: "too_many_punches" });

    const results: unknown[] = [];

    for (const p of punches) {
      const deviceUserId = String(p.user_id ?? p.pin ?? "").trim();
      const rawTime = String(p.time ?? new Date().toISOString());
      if (!deviceUserId) { results.push({ ok: false, error: "missing_user_id" }); continue; }

      const parsed = parsePunch(rawTime, tz);
      if (!parsed) { results.push({ ok: false, device_user_id: deviceUserId, error: "bad_time" }); continue; }

      // Map device user → staff
      let mapQ = admin.from("staff_machine_users")
        .select("staff_id, device_serial")
        .eq("device_user_id", deviceUserId)
        .eq("is_active", true);
      const { data: maps } = await mapQ;
      const map = (maps ?? []).find((m) => m.device_serial === deviceSerial) ??
        (maps ?? []).find((m) => !m.device_serial) ?? null;

      const logRow: Record<string, unknown> = {
        device_serial: deviceSerial,
        device_user_id: deviceUserId,
        punch_at: parsed.iso,
        punch_date: parsed.date,
        punch_time: parsed.time,
        direction: p.direction ?? null,
        staff_id: map?.staff_id ?? null,
        raw: p as unknown as Record<string, unknown>,
      };

      if (!map) {
        await admin.from("machine_punch_log")
          .upsert({ ...logRow, processed: false, error: "unmapped_user" },
            { onConflict: "device_serial,device_user_id,punch_at", ignoreDuplicates: true });
        results.push({ ok: false, device_user_id: deviceUserId, error: "unmapped_user" });
        continue;
      }

      const staffId = map.staff_id as string;
      const hhmm = parsed.time.slice(0, 5);

      // Find a duty shift rostered for this staff/date that accepts machine punches
      const { data: roster } = await admin
        .from("duty_roster")
        .select("shift_id, duty_shifts(id,start_time,end_time,grace_minutes,early_exit_grace_minutes,machine_enabled,attendance_mode,machine_open_before_minutes,machine_close_after_minutes)")
        .eq("staff_id", staffId)
        .eq("duty_date", parsed.date);

      const shifts: Shift[] = (roster ?? [])
        .map((r) => (r as unknown as { duty_shifts: Shift }).duty_shifts)
        .filter((s) => s && s.machine_enabled && s.attendance_mode !== "manual");
      const shift = shifts.find((s) => insideWindow(s, hhmm)) ?? null;

      let resultLabel = "";
      if (shift) {
        const { data: existing } = await admin.from("duty_shift_attendance")
          .select("id, check_in_time, check_out_time")
          .eq("staff_id", staffId).eq("shift_id", shift.id).eq("duty_date", parsed.date)
          .maybeSingle();

        const lateFor = (t: string) =>
          Math.max(0, (toMin(t)! - toMin(shift.start_time)! - (shift.grace_minutes ?? 0)));
        const earlyFor = (t: string) =>
          Math.max(0, (toMin(shift.end_time)! - toMin(t)! - (shift.early_exit_grace_minutes ?? 0)));

        if (!existing) {
          await admin.from("duty_shift_attendance").insert({
            staff_id: staffId, shift_id: shift.id, duty_date: parsed.date,
            status: "present", check_in_time: parsed.time,
            late_minutes: lateFor(hhmm), early_exit_minutes: 0,
            source: "machine", device_id: deviceSerial,
          });
          resultLabel = "check_in";
        } else if (!existing.check_in_time) {
          await admin.from("duty_shift_attendance").update({
            check_in_time: parsed.time, status: "present", late_minutes: lateFor(hhmm),
            source: "machine", device_id: deviceSerial,
          }).eq("id", existing.id);
          resultLabel = "check_in";
        } else if (!existing.check_out_time || existing.check_out_time < parsed.time) {
          await admin.from("duty_shift_attendance").update({
            check_out_time: parsed.time, early_exit_minutes: earlyFor(hhmm),
            source: "machine", device_id: deviceSerial,
          }).eq("id", existing.id);
          resultLabel = "check_out";
        } else {
          resultLabel = "duplicate";
        }
      } else {
        // Fall back to the general staff attendance record (full_day)
        const { data: existing } = await admin.from("attendance_records")
          .select("id, check_in_time, check_out_time")
          .eq("attendance_date", parsed.date).eq("entity_type", "staff")
          .eq("entity_id", staffId).eq("shift", "full_day").maybeSingle();

        if (!existing) {
          await admin.from("attendance_records").insert({
            attendance_date: parsed.date, entity_type: "staff", entity_id: staffId,
            shift: "full_day", status: "present", check_in_time: hhmm,
            remarks: `machine:${deviceSerial ?? "device"}`,
          });
          resultLabel = "check_in";
        } else if (!existing.check_in_time) {
          await admin.from("attendance_records")
            .update({ check_in_time: hhmm, status: "present" }).eq("id", existing.id);
          resultLabel = "check_in";
        } else if (!existing.check_out_time || existing.check_out_time < hhmm) {
          await admin.from("attendance_records")
            .update({ check_out_time: hhmm }).eq("id", existing.id);
          resultLabel = "check_out";
        } else {
          resultLabel = "duplicate";
        }
      }

      await admin.from("machine_punch_log").upsert({
        ...logRow, shift_id: shift?.id ?? null, processed: true, result: resultLabel,
      }, { onConflict: "device_serial,device_user_id,punch_at", ignoreDuplicates: true });

      results.push({ ok: true, staff_id: staffId, date: parsed.date, time: parsed.time, result: resultLabel });
    }

    if (deviceSerial) {
      await admin.from("attendance_devices")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("serial_number", deviceSerial);
    }

    return json(200, { success: true, count: results.length, results });
  } catch (e) {
    console.error("machine-punch error", e);
    return json(500, { error: "internal_error" });
  }
});
