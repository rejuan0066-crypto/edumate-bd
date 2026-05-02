// Admin-only Edge Function: resync canonical roles for a single menu_path.
// Access: super_admin OR admin (validated server-side via has_role + RLS).
// Headers: Authorization (Bearer JWT, required), x-device-id (REQUIRED — bound to user).
// Body or query: { menu_path: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { deviceCorsHeaders, verifyDevice } from "../_shared/device-verify.ts";

const corsHeaders = deviceCorsHeaders;

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isValidPath = (p: string) =>
  typeof p === "string" &&
  p.length > 0 &&
  p.length <= 200 &&
  /^\/[a-zA-Z0-9/_-]+$/.test(p);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const timestamp = new Date().toISOString();

  try {
    // 1) Auth: Bearer token required
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json(401, {
        status: "error",
        error: "Unauthorized: missing bearer token",
        timestamp,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth
      .getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return json(401, {
        status: "error",
        error: "Unauthorized: invalid session",
        timestamp,
      });
    }
    const userId = claimsData.claims.sub as string;
    const deviceId = req.headers.get("x-device-id") ?? null;

    // 2) Role check: must be admin OR super_admin
    const { data: roleRows, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roleErr) {
      return json(500, {
        status: "error",
        error: `Role lookup failed: ${roleErr.message}`,
        timestamp,
      });
    }
    const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
    const allowed = roles.includes("super_admin") || roles.includes("admin");
    if (!allowed) {
      return json(403, {
        status: "error",
        error: "Forbidden: admin or super_admin required",
        user_id: userId,
        device_id: deviceId,
        timestamp,
      });
    }

    // 3) Parse menu_path from body (POST) or query (GET)
    let menuPath: string | undefined;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        menuPath = body?.menu_path;
      } catch {
        // ignore — fall through to query
      }
    }
    if (!menuPath) {
      const url = new URL(req.url);
      menuPath = url.searchParams.get("menu_path") ?? undefined;
    }

    if (!menuPath || !isValidPath(menuPath)) {
      return json(400, {
        status: "error",
        error:
          "Invalid or missing 'menu_path'. Must look like '/admin/donors'.",
        timestamp,
      });
    }

    // 4) Run the resync via SECURITY DEFINER RPC (re-checks role server-side too)
    const { data, error } = await supabase.rpc(
      "resync_canonical_module_roles_for_path",
      { _menu_path: menuPath },
    );

    if (error) {
      return json(400, {
        status: "error",
        error: error.message,
        path_processed: menuPath,
        device_id: deviceId,
        timestamp,
      });
    }

    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    const oldRoles: string[] = row?.old_roles ?? [];
    const newRoles: string[] = row?.new_roles ?? [];
    const added: string[] = row?.added_roles ?? [];
    const removed: string[] = row?.removed_roles ?? [];
    const changed: boolean = !!row?.changed;

    const changesMade = [
      ...added.map((r) => `Added role: ${r}`),
      ...removed.map((r) => `Removed role: ${r}`),
    ];
    if (!changed) changesMade.push("No changes — already in sync");

    return json(200, {
      status: "success",
      path_processed: menuPath,
      changes_made: changesMade,
      old_roles: oldRoles,
      new_roles: newRoles,
      changed,
      device_id: deviceId,
      performed_by: userId,
      timestamp,
    });
  } catch (e) {
    return json(500, {
      status: "error",
      error: e instanceof Error ? e.message : String(e),
      timestamp,
    });
  }
});
