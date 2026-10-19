// Centralized signed-URL issuer with role-based authorization + audit logging.
// All access to private buckets (receipts, photos, staff-letters, committee-attachments)
// should flow through this function. Returns 401/403 on failure and records
// every denial in public.security_logs with IP and user-agent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_BUCKETS = new Set([
  "receipts",
  "photos",
  "staff-letters",
  "committee-attachments",
  "chat-attachments",
]);

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ip = clientIp(req);
  const ua = req.headers.get("user-agent") || "unknown";

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Service-role client for logging + signed-url issuance (bypasses RLS).
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const logDenial = async (
    userId: string | null,
    email: string | null,
    bucket: string | null,
    path: string | null,
    status: number,
    reason: string,
  ) => {
    try {
      await admin.from("security_logs").insert({
        user_id: userId,
        user_email: email,
        event_type: status === 401 ? "unauthenticated_download" : "unauthorized_download",
        resource: bucket && path ? `${bucket}/${path}` : null,
        bucket_id: bucket,
        object_path: path,
        ip_address: ip,
        user_agent: ua,
        http_status: status,
        reason,
      });
    } catch (_) { /* best-effort */ }
  };

  // 1) Auth: require valid JWT
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    await logDenial(null, null, null, null, 401, "Missing bearer token");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user?.id) {
    await logDenial(null, null, null, null, 401, userErr?.message || "Invalid JWT");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = user.id;
  const email = user.email || null;

  // 2) Validate body
  let body: { bucket?: string; path?: string; expiresIn?: number; download?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const bucket = String(body.bucket || "").trim();
  const path = String(body.path || "").trim();
  const expiresIn = Math.min(Math.max(Number(body.expiresIn) || 3600, 60), 3600);
  const download = body.download === true;

  if (!bucket || !path || path.includes("..")) {
    await logDenial(userId, email, bucket || null, path || null, 400, "Invalid params");
    return new Response(JSON.stringify({ error: "Invalid params" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!ALLOWED_BUCKETS.has(bucket)) {
    await logDenial(userId, email, bucket, path, 400, "Bucket not allowed");
    return new Response(JSON.stringify({ error: "Bucket not allowed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 3) Authorization via central RPC (single source of truth)
  const { data: allowed, error: rpcErr } = await admin.rpc(
    "can_access_storage_object",
    { _user_id: userId, _bucket: bucket, _object_path: path },
  );
  if (rpcErr) {
    await logDenial(userId, email, bucket, path, 500, `RPC error: ${rpcErr.message}`);
    return new Response(JSON.stringify({ error: "Authorization check failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (allowed !== true) {
    await logDenial(userId, email, bucket, path, 403, "Not authorized for object");
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 4) Issue signed URL via service role (bypasses storage RLS — we already authorized)
  const { data: signed, error: signErr } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn, download ? { download: true } : undefined);

  if (signErr || !signed?.signedUrl) {
    await logDenial(userId, email, bucket, path, 404, signErr?.message || "Sign failed");
    return new Response(JSON.stringify({ error: "File not found or sign failed" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ url: signed.signedUrl, expiresIn }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
