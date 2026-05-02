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

const FORBIDDEN_PAYLOAD_DEFAULT = {
  error: "Unauthorized Device",
  message:
    "আপনি এই ডিভাইস থেকে এক্সেস করার অনুমতিপ্রাপ্ত নন। অনুগ্রহ করে অনুমোদিত ডিভাইস ব্যবহার করুন।",
  message_en:
    "You are not allowed to access from this device. Please use an approved device.",
};

const FORBIDDEN_PAYLOAD_AUDIT = {
  error: "Unauthorized Device",
  message:
    "আপনার এই ডিভাইসটি অডিট রিপোর্ট দেখার জন্য অনুমোদিত নয়। দয়া করে আপনার নিবন্ধিত অ্যাডমিন ডিভাইস ব্যবহার করুন অথবা সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।",
  message_en:
    "This device is not authorized to view audit reports. Please use your registered admin device or contact a super admin.",
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
  opts: {
    endpoint?: string;
    cors?: Record<string, string>;
    /** When true, also enforces the audit-route allowlist via verify_audit_device RPC. */
    audit?: boolean;
  } = {},
): Promise<DeviceGuardResult> {
  const cors = opts.cors ?? deviceCorsHeaders;
  const deviceId = req.headers.get("x-device-id") ?? "";
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent");
  const rpcName = opts.audit ? "verify_audit_device" : "verify_user_device";
  const denyPayload = opts.audit
    ? FORBIDDEN_PAYLOAD_AUDIT
    : FORBIDDEN_PAYLOAD_DEFAULT;

  const { data, error } = await supabase.rpc(rpcName, {
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
          ...denyPayload,
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
          ...denyPayload,
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
