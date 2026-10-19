// Device-Track Edge Function
// Auto-called by the frontend on login/page load. Resolves the caller's IP
// to a precise location (Country → City → Upazila/Village) using ip-api.com
// (free, no key) and persists it to user_devices via update_device_location RPC.
// Triggers a `suspicious_location` security alert if the device is now
// "out of area" compared to its TOFU home baseline.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { deviceCorsHeaders } from "../_shared/device-verify.ts";

const corsHeaders = deviceCorsHeaders;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getClientIp = (req: Request): string | null => {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ?? null;
};

// Parse "Mozilla/5.0 (iPhone; ...) ..." → { device_model, os, browser }
function parseUA(ua: string | null) {
  if (!ua) return { device_model: null, os: null, browser: null };
  const m = (re: RegExp) => ua.match(re)?.[0] ?? null;
  let device_model: string | null = null;
  if (/iPhone/i.test(ua)) device_model = "iPhone";
  else if (/iPad/i.test(ua)) device_model = "iPad";
  else if (/Android/i.test(ua)) {
    device_model = ua.match(/Android[^;)]*;\s*([^;)]+?)(?:\sBuild|\))/)?.[1]?.trim() ?? "Android";
  } else if (/Macintosh|Mac OS X/i.test(ua)) device_model = "Mac";
  else if (/Windows/i.test(ua)) device_model = "Windows PC";
  else if (/Linux/i.test(ua)) device_model = "Linux PC";
  const os = m(/(iOS|iPadOS|Android|Mac OS X|Windows NT [\d.]+|Linux)/i);
  const browser = m(/(Edg|Chrome|Safari|Firefox|OPR|Opera)\/[\d.]+/i);
  return { device_model, os, browser };
}

async function geoLookup(ip: string) {
  // Free, no-key ip-api.com — supports village/district under regionName/city
  // Returns { country, regionName, city, district, lat, lon, isp }
  try {
    const r = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,district,lat,lon,isp`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!r.ok) return null;
    const j = await r.json();
    if (j?.status !== "success") return null;
    return {
      country: j.country ?? null,
      region: j.regionName ?? null,
      city: j.city ?? null,
      // ip-api `district` ≈ upazila / sub-district in BD context
      upazila: j.district || null,
      village: null as string | null, // IP geo cannot resolve village, kept for manual override
      latitude: typeof j.lat === "number" ? j.lat : null,
      longitude: typeof j.lon === "number" ? j.lon : null,
      isp: j.isp ?? null,
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    // Tracking is best-effort: never return 401 (it surfaces as a runtime error in the app).
    if (!auth.startsWith("Bearer ")) return json(200, { ok: false, skipped: "no_session" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const token = auth.replace("Bearer ", "");
    let userId: string | undefined;
    try {
      const { data: claims } = await supabase.auth.getClaims(token);
      userId = claims?.claims?.sub as string | undefined;
    } catch { /* fall through */ }
    if (!userId) {
      const { data: u } = await supabase.auth.getUser(token);
      userId = u?.user?.id;
    }
    if (!userId) return json(200, { ok: false, skipped: "invalid_session" });

    const deviceId = req.headers.get("x-device-id") ?? "";
    if (!deviceId) return json(400, { error: "missing_device_id" });

    const ip = getClientIp(req) ?? "0.0.0.0";
    const ua = req.headers.get("user-agent");
    const { device_model, os, browser } = parseUA(ua);
    const geo = await geoLookup(ip);

    // Ensure device is registered (TOFU)
    await supabase.rpc("register_user_device", {
      _device_id: deviceId,
      _label: device_model ?? "web",
      _user_agent: ua,
      _ip: ip,
    });

    const { data, error } = await supabase.rpc("update_device_location", {
      _user_id: userId,
      _device_id: deviceId,
      _ip: ip,
      _country: geo?.country ?? null,
      _region: geo?.region ?? null,
      _city: geo?.city ?? null,
      _upazila: geo?.upazila ?? null,
      _village: geo?.village ?? null,
      _latitude: geo?.latitude ?? null,
      _longitude: geo?.longitude ?? null,
      _isp: geo?.isp ?? null,
      _device_model: device_model,
      _os: os,
      _browser: browser,
    });

    if (error) return json(400, { error: error.message });

    return json(200, {
      ok: true,
      ip,
      device: { device_model, os, browser },
      location: geo,
      anomaly: (data as { anomaly?: string } | null)?.anomaly ?? null,
    });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
