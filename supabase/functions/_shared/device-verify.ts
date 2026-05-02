// Shared device-binding verification for Lovable Cloud edge functions.
// Usage:
//   const guard = await verifyDevice(req, supabase, { endpoint: "/resync-module-roles" });
//   if (!guard.ok) return guard.response;
//
// Behaviour:
//   - Reads `x-device-id` header from the incoming request.
//   - Calls the SECURITY DEFINER RPC `verify_user_device` which checks the
//     value against the caller's registered devices (from `user_devices`)
//     and logs any mismatch / unknown device into `security_alerts` with IP + UA.
//   - Returns a 403 JSON response on mismatch, or `{ ok: true }` on success.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

export const deviceCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const FORBIDDEN_PAYLOAD = {
  error: "Unauthorized Device",
  message:
    "আপনি এই ডিভাইস থেকে এক্সেস করার অনুমতিপ্রাপ্ত নন। অনুগ্রহ করে অনুমোদিত ডিভাইস ব্যবহার করুন।",
  message_en:
    "You are not allowed to access from this device. Please use an approved device.",
};

const getClientIp = (req: Request): string | null => {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    null
  );
};

export type DeviceGuardOk = { ok: true; deviceId: string; reason: string };
export type DeviceGuardFail = { ok: false; response: Response };
export type DeviceGuardResult = DeviceGuardOk | DeviceGuardFail;

export async function verifyDevice(
  req: Request,
  supabase: SupabaseClient,
  opts: { endpoint?: string; cors?: Record<string, string> } = {},
): Promise<DeviceGuardResult> {
  const cors = opts.cors ?? deviceCorsHeaders;
  const deviceId = req.headers.get("x-device-id") ?? "";
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent");

  const { data, error } = await supabase.rpc("verify_user_device", {
    _device_id: deviceId,
    _ip: ip,
    _user_agent: ua,
    _endpoint: opts.endpoint ?? null,
  });

  if (error) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          ...FORBIDDEN_PAYLOAD,
          error: "Device verification failed",
          detail: error.message,
        }),
        {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      ),
    };
  }

  const result = (data ?? {}) as { ok?: boolean; reason?: string };
  if (!result.ok) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          ...FORBIDDEN_PAYLOAD,
          reason: result.reason ?? "device_mismatch",
        }),
        {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      ),
    };
  }

  return { ok: true, deviceId, reason: result.reason ?? "matched" };
}
