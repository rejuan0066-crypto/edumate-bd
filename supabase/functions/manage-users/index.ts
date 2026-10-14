import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { enforcePasswordPolicy, logSecurityEvent } from "../_shared/password.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---- Rate limiting helpers ----
function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'unknown';
}

async function checkRateLimit(
  admin: any,
  action: string,
  scope: 'admin' | 'ip' | 'email' | 'phone',
  key: string,
): Promise<{ ok: boolean; retry_after?: number; message_bn?: string; limit?: number }> {
  if (!key) return { ok: true };
  try {
    const { data, error } = await admin.rpc('check_rate_limit', {
      _key: key, _scope: scope, _action: action,
    });
    if (error) {
      console.error('rate_limit rpc error', action, scope, error.message);
      return { ok: true }; // fail-open to avoid blocking legitimate users on infra errors
    }
    if (data?.ok === false) {
      return {
        ok: false,
        retry_after: Number(data.retry_after) || 30,
        message_bn: data.message_bn || 'অনেক বেশি অনুরোধ। কিছুক্ষণ পর আবার চেষ্টা করুন।',
        limit: data.limit,
      };
    }
    return { ok: true };
  } catch (e) {
    console.error('rate_limit exception', e);
    return { ok: true };
  }
}

function rateLimitedResponse(res: { retry_after?: number; message_bn?: string; limit?: number }, scope: string) {
  return new Response(
    JSON.stringify({
      error: res.message_bn || 'Rate limit exceeded',
      code: 'RATE_LIMITED',
      scope,
      retry_after: res.retry_after,
      limit: res.limit,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(res.retry_after || 30),
      },
    },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller using getClaims (works in edge function context)
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const url = new URL(req.url);
    let action = url.searchParams.get("action");

    // Parse body early for POST to check action
    let body: any = {};
    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
      body = await req.json();
      if (!action && body.action) {
        action = body.action;
      }
    }

    // ENSURE STAFF — allowed for any authenticated user (no admin check)
    if (action === "ensure_staff") {
      // Try finding by user_id first
      const { data: existingStaff } = await supabaseAdmin
        .from("staff")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingStaff) {
        return new Response(JSON.stringify({ success: true, staff_id: existingStaff.id, already_exists: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Try matching by email and auto-link
      const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId);
      const userEmail = authUser?.email;

      if (userEmail) {
        const { data: staffByEmail } = await supabaseAdmin
          .from("staff")
          .select("id")
          .eq("email", userEmail)
          .is("user_id", null)
          .maybeSingle();

        if (staffByEmail) {
          await supabaseAdmin.from("staff").update({ user_id: userId }).eq("id", staffByEmail.id);
          return new Response(JSON.stringify({ success: true, staff_id: staffByEmail.id, linked_by_email: true }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Auto-create new staff record
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, phone")
        .eq("id", userId)
        .maybeSingle();

      const { data: userRoleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      const userRole = userRoleData?.role || 'staff';

      const { data: newStaff, error: staffError } = await supabaseAdmin.from("staff").insert({
        user_id: userId,
        name_bn: profile?.full_name || userEmail?.split('@')[0] || 'Unknown',
        name_en: profile?.full_name || '',
        email: userEmail || '',
        phone: profile?.phone || '',
        department: userRole === 'teacher' ? 'teaching' : 'general',
        status: 'active',
      }).select('id').single();

      if (staffError) {
        return new Response(JSON.stringify({ error: "Failed to create staff profile: " + staffError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, staff_id: newStaff.id, created: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerIsSuperAdmin = roleData.role === 'super_admin';

    // ---- Per-action rate limiting (super_admin bypass) ----
    const clientIp = getClientIp(req);
    const SENSITIVE_ACTIONS = new Set([
      'update_role','delete','update_status','ban_user','unban_user',
      'update_email','update_password','update_name','upsert_staff_identity',
    ]);
    if (!callerIsSuperAdmin && action) {
      let adminAction: string | null = null;
      let ipAction: string | null = null;
      if (action === 'create') {
        adminAction = 'user_create_admin';
        ipAction = 'user_create_ip';
      } else if (SENSITIVE_ACTIONS.has(action)) {
        adminAction = 'user_sensitive_admin';
        ipAction = 'user_sensitive_ip';
      }
      if (adminAction) {
        // Check minute + hourly tiers for both admin and IP scopes
        const checks: Array<{ action: string; scope: 'admin' | 'ip'; key: string }> = [
          { action: adminAction,                scope: 'admin', key: userId },
          { action: `${adminAction}_hourly`,    scope: 'admin', key: userId },
          { action: ipAction!,                  scope: 'ip',    key: clientIp },
          { action: `${ipAction!}_hourly`,      scope: 'ip',    key: clientIp },
        ];
        for (const c of checks) {
          const res = await checkRateLimit(supabaseAdmin, c.action, c.scope, c.key);
          if (!res.ok) {
            await logSecurityEvent(supabaseAdmin, {
              event_type: 'rate_limited',
              severity: 'warning',
              reason: c.action,
              details: { action, scope: c.scope, key: c.key, retry_after: res.retry_after, tier: c.action.endsWith('_hourly') ? 'hour' : 'minute' },
              user_id: userId,
              req,
            }).catch(() => {});
            return rateLimitedResponse(res, c.scope);
          }
        }
      }
    }



    // CHECK EMAIL CONFIRMED STATUS (fast polling helper)
    if (action === "check_email_confirmed") {
      const email = (body.email || url.searchParams.get("email") || "").toLowerCase().trim();
      const user_id = body.user_id || url.searchParams.get("user_id");
      let confirmed = false;
      try {
        if (user_id) {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(user_id);
          confirmed = !!u?.user?.email_confirmed_at;
        } else if (email) {
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
          const match = list?.users?.find((u: any) => (u.email || '').toLowerCase() === email);
          confirmed = !!match?.email_confirmed_at;
        }
      } catch (checkErr) {
        console.error("check_email_confirmed error:", checkErr);
      }
      return new Response(JSON.stringify({ ok: true, confirmed }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // VERIFY OTP (Admin-side verification without session takeover)
    if (action === "verify_otp") {
      const email = (body.email || "").toLowerCase().trim();
      const token = String(body.token || "").trim();
      const user_id = body.user_id;

      if (!email || !token) {
        return new Response(JSON.stringify({ success: false, error: "ইমেইল ও ওটিপি কোড প্রয়োজন" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        // 1. Check in custom otp_codes table
        const { data: otpMatch } = await supabaseAdmin
          .from("otp_codes")
          .select("id, code, expires_at, is_used")
          .eq("email", email)
          .eq("purpose", "email_verification")
          .eq("is_used", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let isOtpValid = false;
        if (otpMatch && otpMatch.code === token) {
          if (new Date(otpMatch.expires_at) > new Date()) {
            isOtpValid = true;
            await supabaseAdmin.from("otp_codes").update({ is_used: true }).eq("id", otpMatch.id);
          }
        }

        // If matched via custom otp_codes table
        if (isOtpValid) {
          let targetId = user_id;
          if (!targetId) {
            const { data: uList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 });
            targetId = uList?.users?.find((u: any) => (u.email || '').toLowerCase() === email)?.id;
          }
          if (targetId) {
            await supabaseAdmin.auth.admin.updateUserById(targetId, { email_confirm: true });
            await supabaseAdmin.from('profiles').update({ status: 'approved' }).eq('id', targetId);
          }
          return new Response(JSON.stringify({ success: true, confirmed: true }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 2. Fallback to Supabase native Auth verifyOtp
        const anonClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          { auth: { persistSession: false, autoRefreshToken: false } }
        );

        let verifyRes = await anonClient.auth.verifyOtp({
          email,
          token,
          type: 'signup',
        });

        if (verifyRes.error) {
          verifyRes = await anonClient.auth.verifyOtp({
            email,
            token,
            type: 'email',
          });
        }

        if (verifyRes.error) {
          return new Response(JSON.stringify({
            success: false,
            error: verifyRes.error.message || 'ভেরিফিকেশন কোড সঠিক নয় বা মেয়াদোত্তীর্ণ',
          }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const targetId = user_id || verifyRes.data?.user?.id;
        if (targetId) {
          await supabaseAdmin.from('profiles').update({ status: 'approved' }).eq('id', targetId);
          await supabaseAdmin.auth.admin.updateUserById(targetId, { email_confirm: true });
        }

        return new Response(JSON.stringify({ success: true, confirmed: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err?.message || 'যাচাই ব্যর্থ হয়েছে' }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // RESEND VERIFICATION (OTP or Link)
    if (action === "resend_verification") {
      const email = (body.email || "").toLowerCase().trim();
      const method = body.method || "otp";

      if (!email) {
        return new Response(JSON.stringify({ success: false, error: "ইমেইল প্রয়োজন" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (method === "otp") {
        try {
          const { data: sendOtpData, error: sendOtpErr } = await supabaseAdmin.functions.invoke("send-otp", {
            body: { email, purpose: "email_verification" },
          });

          if (sendOtpErr) {
            let errorMsg = "ওটিপি কোড পাঠাতে সমস্যা হয়েছে।";
            if ((sendOtpErr as any).context) {
              try {
                const errJson = await (sendOtpErr as any).context.json();
                if (errJson?.code === "EMAIL_SERVICE_UNCONFIGURED") {
                  errorMsg = "কোনো ইমেইল সার্ভিস (SMTP/EmailJS) কনফিগার করা নেই। অনুগ্রহ করে অ্যাডমিন সেটিংস থেকে SMTP সেটআপ করুন।";
                } else if (errJson?.code === "COOLDOWN_ACTIVE") {
                  errorMsg = errJson.message || "অনুগ্রহ করে কিছুক্ষণ পর আবার ওটিপি কোড পাঠান।";
                } else if (errJson?.error || errJson?.message) {
                  errorMsg = errJson.error || errJson.message;
                }
              } catch (_) {}
            }
            return new Response(JSON.stringify({ success: false, error: errorMsg }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          if (sendOtpData && !sendOtpData.success && sendOtpData.error) {
            return new Response(JSON.stringify({ success: false, error: sendOtpData.error }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify({ success: true, method: "otp" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (otpErr: any) {
          return new Response(JSON.stringify({ success: false, error: otpErr?.message || 'ওটিপি পাঠাতে সমস্যা হয়েছে' }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        // Link method
        try {
          const { error: resendErr } = await supabaseAdmin.auth.resend({
            type: 'signup',
            email,
          });
          if (resendErr) {
            let msg = resendErr.message;
            if (msg.toLowerCase().includes('rate limit')) {
              msg = "অনুগ্রহ করে কিছুক্ষণ পর আবার ভেরিফিকেশন লিংক পাঠানোর চেষ্টা করুন।";
            }
            return new Response(JSON.stringify({ success: false, error: msg }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ success: true, method: "link" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ success: false, error: err?.message || 'পুনরায় লিংক পাঠাতে সমস্যা হয়েছে' }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // MANUAL CONFIRM EMAIL (Admin bypass if user is confirmed directly)
    if (action === "manual_confirm_email") {
      const user_id = body.user_id;
      if (!user_id) {
        return new Response(JSON.stringify({ success: false, error: "user_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      try {
        await supabaseAdmin.auth.admin.updateUserById(user_id, { email_confirm: true });
        await supabaseAdmin.from('profiles').update({ status: 'approved' }).eq('id', user_id);
        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err?.message || 'হালনাগাদ ব্যর্থ' }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // LIST users
    if (req.method === "GET" && !action) {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        return new Response(JSON.stringify({ error: listError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get all roles
      const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id, full_name, status");
      const userIds = users.map((u: any) => u.id).filter(Boolean);
      const userEmails = users.map((u: any) => u.email).filter(Boolean);
      const [staffByIdResult, staffByEmailResult] = await Promise.all([
        userIds.length
          ? supabaseAdmin.from("staff").select("id, user_id, name_bn, name_en, email, designation, staff_category, photo_url").in("user_id", userIds).is("deleted_at", null)
          : Promise.resolve({ data: [] } as any),
        userEmails.length
          ? supabaseAdmin.from("staff").select("id, user_id, name_bn, name_en, email, designation, staff_category, photo_url").in("email", userEmails).is("deleted_at", null)
          : Promise.resolve({ data: [] } as any),
      ]);
      const staffRows = [...(staffByIdResult.data || []), ...(staffByEmailResult.data || [])];

      const roleMap: Record<string, string> = {};
      (roles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });
      const profileMap: Record<string, { name: string; status: string }> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.id] = { name: p.full_name || '', status: p.status || 'pending' }; });
      const staffMap: Record<string, any> = {};
      const staffEmailMap: Record<string, any> = {};
      (staffRows || []).forEach((s: any) => { if (s.user_id) staffMap[s.user_id] = s; });
      (staffRows || []).forEach((s: any) => { if (s.email) staffEmailMap[String(s.email).toLowerCase()] = s; });

      const userList = users.map((u: any) => {
        const staff = staffMap[u.id] || staffEmailMap[String(u.email || '').toLowerCase()];
        const fullName = staff?.name_bn || staff?.name_en || profileMap[u.id]?.name || u.user_metadata?.full_name || '';
        return {
          id: u.id,
          email: u.email,
          role: roleMap[u.id] || 'none',
          full_name: fullName,
          profile_full_name: profileMap[u.id]?.name || '',
          staff,
          status: profileMap[u.id]?.status || 'pending',
          created_at: u.created_at,
        };
      });

      return new Response(JSON.stringify({ users: userList }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // body already parsed above

    // CREATE user
    if (action === "create") {
      const { email, password, role, full_name, name_bn, designation, staff_category, phone } = body;

      const trimmedEmail = email ? String(email).trim().toLowerCase() : '';
      const trimmedPhone = phone ? String(phone).trim() : '';
      const trimmedName = full_name ? String(full_name).trim() : '';
      const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
      const conflict = (payload: any) => new Response(JSON.stringify(payload), { status: 409, headers: jsonHeaders });

      // Identifiers attached to every audit/security log for this attempt
      const ident = {
        email: trimmedEmail || null,
        phone: trimmedPhone || null,
        full_name: trimmedName || null,
        requested_role: role || null,
        staff_id: body.staff_id || null,
      };
      // Helper: log a structured create-flow failure
      const logFail = async (
        reason_code: string,
        severity: 'info' | 'warning' | 'critical',
        extra: Record<string, unknown> = {},
        rollback_status: 'not_applicable' | 'success' | 'partial' | 'failed' = 'not_applicable',
      ) => {
        await logSecurityEvent(supabaseAdmin, {
          event_type: 'user_create_failed',
          severity,
          user_id: userId,
          email: trimmedEmail || null,
          reason: reason_code,
          details: { reason_code, rollback_status, identifiers: ident, ...extra },
          req,
        }).catch(() => {});
      };

      if (!email || !password) {
        await logFail('MISSING_REQUIRED_FIELDS', 'info', {
          missing: { email: !email, password: !password },
        });
        return new Response(JSON.stringify({ error: "email and password are required" }), {
          status: 400, headers: jsonHeaders,
        });
      }

      const pwCheck = await enforcePasswordPolicy(supabaseAdmin, password);
      if (!pwCheck.ok) {
        await logSecurityEvent(supabaseAdmin, {
          event_type: 'weak_password_rejected', severity: 'warning',
          user_id: userId, email: trimmedEmail, reason: 'WEAK_PASSWORD',
          details: { reason_code: 'WEAK_PASSWORD', rollback_status: 'not_applicable', identifiers: ident, policy_response: pwCheck.body },
          req,
        });
        return new Response(JSON.stringify(pwCheck.body), { status: pwCheck.status, headers: jsonHeaders });
      }

      // ── STEP 1: Acquire advisory locks with retry-backoff (serialize concurrent creates) ──
      // Per-attempt DB timeout 2s; up to 3 attempts with exponential backoff (200ms, 400ms).
      const LOCK_ATTEMPTS = 3;
      const LOCK_TIMEOUT_MS = 2000;
      let lockAcquired = false;
      let lockResource: string | null = null;
      let lockTotalWaitedMs = 0;
      let lockLastError: string | null = null;
      for (let attempt = 1; attempt <= LOCK_ATTEMPTS; attempt++) {
        try {
          const { data: lockRes, error: lockRpcErr } = await supabaseAdmin.rpc('acquire_user_create_lock', {
            _email: trimmedEmail, _phone: trimmedPhone, _timeout_ms: LOCK_TIMEOUT_MS,
          });
          if (lockRpcErr) {
            lockLastError = lockRpcErr.message;
          } else if (lockRes && (lockRes as any).ok === true) {
            lockAcquired = true;
            lockTotalWaitedMs += Number((lockRes as any).waited_ms || 0);
            break;
          } else if (lockRes && (lockRes as any).ok === false) {
            lockResource = (lockRes as any).resource || null;
            lockTotalWaitedMs += Number((lockRes as any).waited_ms || 0);
            lockLastError = `LOCK_TIMEOUT on ${lockResource}`;
          }
        } catch (e) {
          lockLastError = String((e as any)?.message || e);
        }
        if (attempt < LOCK_ATTEMPTS) {
          await new Promise(r => setTimeout(r, 200 * attempt)); // 200ms, 400ms backoff
        }
      }

      if (!lockAcquired) {
        await logFail('LOCK_CONTENTION', 'warning', {
          lock_resource: lockResource,
          attempts: LOCK_ATTEMPTS,
          total_waited_ms: lockTotalWaitedMs,
          last_error: lockLastError,
        });
        return new Response(JSON.stringify({
          error: 'LOCK_CONTENTION',
          reason_code: 'LOCK_CONTENTION',
          message: 'Another request is currently creating a user with the same email or phone. Please try again in a moment.',
          message_bn: lockResource === 'phone'
            ? 'এই ফোন নম্বর দিয়ে এই মুহূর্তে আরেকটি ইউজার তৈরি হচ্ছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।'
            : lockResource === 'email'
              ? 'এই ইমেইল দিয়ে এই মুহূর্তে আরেকটি ইউজার তৈরি হচ্ছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।'
              : 'সিস্টেম এই মুহূর্তে ব্যস্ত। কিছুক্ষণ পরে আবার চেষ্টা করুন।',
          retry_after_seconds: 2,
        }), {
          status: 429,
          headers: { ...jsonHeaders, 'Retry-After': '2' },
        });
      }

      // ── STEP 2: Atomic duplicate check across profiles + staff + administrative_officers ──
      // When linking to an existing staff/officer record, skip name-based dup check
      // (the existing person legitimately shares the name).
      const isLinkingExisting = !!(body.staff_id || body.officer_id);
      const { data: dupCheck, error: dupErr } = await supabaseAdmin.rpc('check_user_duplicates', {
        _email: trimmedEmail, _phone: trimmedPhone, _full_name: isLinkingExisting ? '' : trimmedName,
      });
      if (dupErr) {
        await logFail('DUPLICATE_CHECK_FAILED', 'critical', { db_error: dupErr.message });
        return new Response(JSON.stringify({ error: 'duplicate_check_failed', message: dupErr.message }), {
          status: 500, headers: jsonHeaders,
        });
      }
      if (dupCheck && (dupCheck as any).ok === false) {
        const d = dupCheck as any;
        await logFail(d.code || 'DUPLICATE_FOUND', 'warning', { duplicate_source: d.code });
        return conflict({ error: d.code, message: d.message_bn, message_bn: d.message_bn });
      }

      // ── STEP 3: Email duplicate in auth.users ──
      try {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const emailHit = existingUsers?.users?.find((u: any) => (u.email || '').toLowerCase() === trimmedEmail);
        if (emailHit) {
          await logFail('DUPLICATE_EMAIL_AUTH', 'warning', { existing_user_id: emailHit.id });
          return conflict({
            error: 'DUPLICATE_EMAIL',
            message: `এই ইমেইল (${trimmedEmail}) দিয়ে ইতিমধ্যে একজন ইউজার রেজিস্টার্ড আছেন।`,
            message_bn: `এই ইমেইল (${trimmedEmail}) দিয়ে ইতিমধ্যে একজন ইউজার রেজিস্টার্ড আছেন।`,
          });
        }
      } catch (listErr) {
        await logSecurityEvent(supabaseAdmin, {
          event_type: 'user_create_warn', severity: 'info',
          user_id: userId, email: trimmedEmail, reason: 'AUTH_LIST_FAILED',
          details: { reason_code: 'AUTH_LIST_FAILED', rollback_status: 'not_applicable', identifiers: ident, error: String((listErr as any)?.message || listErr) },
          req,
        }).catch(() => {});
      }

      // ── STEP 4: Create auth user ──
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: trimmedEmail,
        password,
        email_confirm: false, // Require email verification
        user_metadata: { full_name: trimmedName || '', phone: trimmedPhone || undefined },
      });

      if (createError || !newUser?.user?.id) {
        const msg = createError?.message || 'create_failed';
        const isDup = /already.*registered|already.*exists|duplicate|email.*exists/i.test(msg);
        const code = isDup ? 'DUPLICATE_EMAIL_AUTH_RACE' : 'AUTH_CREATE_FAILED';
        await logFail(code, isDup ? 'warning' : 'critical', { auth_error: msg });
        return new Response(JSON.stringify(
          isDup
            ? { error: 'DUPLICATE_EMAIL', message_bn: `এই ইমেইল (${trimmedEmail}) দিয়ে ইতিমধ্যে একজন ইউজার রেজিস্টার্ড আছেন।` }
            : { error: msg }
        ), { status: isDup ? 409 : 400, headers: jsonHeaders });
      }

      const newUserId = newUser.user.id;

      // ── Atomic rollback helper: undoes everything done after auth user creation ──
      const rollback = async (reason_code: string, extra: Record<string, unknown> = {}) => {
        const steps: Record<string, 'ok' | 'failed' | 'skipped'> = {
          user_roles: 'skipped', profiles: 'skipped', auth_user: 'skipped',
        };
        try { const { error } = await supabaseAdmin.from('user_roles').delete().eq('user_id', newUserId); steps.user_roles = error ? 'failed' : 'ok'; } catch { steps.user_roles = 'failed'; }
        try { const { error } = await supabaseAdmin.from('profiles').delete().eq('id', newUserId); steps.profiles = error ? 'failed' : 'ok'; } catch { steps.profiles = 'failed'; }
        try { const { error } = await supabaseAdmin.auth.admin.deleteUser(newUserId); steps.auth_user = error ? 'failed' : 'ok'; } catch { steps.auth_user = 'failed'; }
        const allOk = Object.values(steps).every(s => s === 'ok' || s === 'skipped');
        const status: 'success' | 'partial' | 'failed' =
          steps.auth_user === 'failed' ? 'failed' : (allOk ? 'success' : 'partial');
        await logSecurityEvent(supabaseAdmin, {
          event_type: 'user_create_rolled_back',
          severity: status === 'success' ? 'warning' : 'critical',
          user_id: userId, target_user_id: newUserId, email: trimmedEmail,
          reason: reason_code,
          details: { reason_code, rollback_status: status, rollback_steps: steps, identifiers: ident, created_user_id: newUserId, ...extra },
          req,
        }).catch(() => {});
        return status;
      };

      // ── STEP 5: Assign role (rollback on failure) ──
      if (role) {
        const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
          user_id: newUserId, role,
        });
        if (roleError) {
          const rbStatus = await rollback('ROLE_ASSIGN_FAILED', { db_error: roleError.message, attempted_role: role });
          return new Response(JSON.stringify({
            error: "Failed to assign role: " + roleError.message,
            reason_code: 'ROLE_ASSIGN_FAILED',
            rollback_status: rbStatus,
          }), { status: 500, headers: jsonHeaders });
        }
      }

      // ── STEP 6: Update profile (rollback on duplicate-trigger failure) ──
      if (trimmedName || trimmedPhone) {
        const { error: profUpsertErr } = await supabaseAdmin.from("profiles").upsert({
          id: newUserId,
          ...(trimmedName ? { full_name: trimmedName } : {}),
          ...(trimmedPhone ? { phone: trimmedPhone } : {}),
        });
        if (profUpsertErr) {
          const m = profUpsertErr.message || '';
          const isDupPhone = /DUPLICATE_PHONE/i.test(m);
          const code = isDupPhone ? 'DUPLICATE_PHONE_RACE' : 'PROFILE_UPSERT_FAILED';
          const rbStatus = await rollback(code, { db_error: m });
          if (isDupPhone) {
            return conflict({
              error: 'DUPLICATE_PHONE',
              message_bn: `এই ফোন নম্বর (${trimmedPhone}) দিয়ে ইতিমধ্যে একজন ইউজার রেজিস্টার্ড আছেন।`,
              reason_code: code,
              rollback_status: rbStatus,
            });
          }
          return new Response(JSON.stringify({
            error: 'profile_update_failed', message: m,
            reason_code: code, rollback_status: rbStatus,
          }), { status: 500, headers: jsonHeaders });
        }
      }

      // Link to existing staff record if staff_id explicitly provided.
      if (body.staff_id) {
        const { error: linkErr } = await supabaseAdmin.from("staff").update({ user_id: newUserId }).eq("id", body.staff_id);
        if (linkErr) {
          const rbStatus = await rollback('STAFF_LINK_FAILED', { db_error: linkErr.message, staff_id: body.staff_id });
          return new Response(JSON.stringify({
            error: 'staff_link_failed', message: linkErr.message,
            reason_code: 'STAFF_LINK_FAILED', rollback_status: rbStatus,
          }), { status: 500, headers: jsonHeaders });
        }
      }

      // Link to existing administrative_officers record if officer_id explicitly provided.
      if (body.officer_id) {
        const { error: linkErr } = await supabaseAdmin
          .from("administrative_officers")
          .update({ user_id: newUserId })
          .eq("id", body.officer_id);
        if (linkErr) {
          const rbStatus = await rollback('OFFICER_LINK_FAILED', { db_error: linkErr.message, officer_id: body.officer_id });
          return new Response(JSON.stringify({
            error: 'officer_link_failed', message: linkErr.message,
            reason_code: 'OFFICER_LINK_FAILED', rollback_status: rbStatus,
          }), { status: 500, headers: jsonHeaders });
        }
      }

      // Best-effort: send welcome email via SMTP (Mailtrap, etc.)
      let welcome_email_status: 'sent' | 'failed' | 'skipped' = 'skipped';
      try {
        const origin = req.headers.get("origin") || req.headers.get("referer") || "";
        const loginUrl = origin ? `${new URL(origin).origin}/login` : undefined;
        const internalSecret = Deno.env.get("WELCOME_EMAIL_INTERNAL_SECRET") || "";
        const { error: mailErr } = await supabaseAdmin.functions.invoke("send-welcome-email", {
          body: {
            email: trimmedEmail,
            full_name: trimmedName || undefined,
            role: role || undefined,
            password,
            kind: "user",
            login_url: loginUrl,
          },
          headers: internalSecret ? { 'x-internal-secret': internalSecret } : undefined,
        });
        welcome_email_status = mailErr ? 'failed' : 'sent';
        if (mailErr) {
          await logSecurityEvent(supabaseAdmin, {
            event_type: 'user_create_warn', severity: 'info',
            user_id: userId, target_user_id: newUserId, email: trimmedEmail,
            reason: 'WELCOME_EMAIL_FAILED',
            details: { reason_code: 'WELCOME_EMAIL_FAILED', rollback_status: 'not_applicable', identifiers: ident, error: String(mailErr.message || mailErr) },
            req,
          }).catch(() => {});
        }
      } catch (mailErr) {
        welcome_email_status = 'failed';
        console.error("send-welcome-email failed (non-fatal):", mailErr);
      }

      // Trigger Supabase Auth verification email (link) only if link method requested
      if (body.verification_method === 'link') {
        try {
          await supabaseAdmin.auth.resend({
            type: 'signup',
            email: trimmedEmail,
          });
        } catch (authResendErr) {
          console.error("Supabase auth resend error (non-fatal):", authResendErr);
        }
      }

      // ── SUCCESS audit log ──
      await logSecurityEvent(supabaseAdmin, {
        event_type: 'user_created', severity: 'info',
        user_id: userId, target_user_id: newUserId, email: trimmedEmail,
        reason: 'CREATE_SUCCESS',
        details: { reason_code: 'CREATE_SUCCESS', rollback_status: 'not_applicable', identifiers: ident, welcome_email_status, created_user_id: newUserId },
        req,
      }).catch(() => {});

      return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
        status: 200, headers: jsonHeaders,
      });
    }

    // UPDATE ROLE
    if (action === "update_role") {
      const { user_id: targetUserId, role: newRole, base_role, remove_role } = body;
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "user_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent changing own role
      if (targetUserId === userId) {
        return new Response(JSON.stringify({ error: "Cannot change your own role" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Protect super_admin from role changes by non-super_admin
      const { data: targetRole } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", targetUserId).maybeSingle();
      if (targetRole?.role === 'super_admin' && !callerIsSuperAdmin) {
        return new Response(JSON.stringify({ error: "Cannot modify super admin role" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Remove role entirely
      if (remove_role) {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", targetUserId);
        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!newRole) {
        return new Response(JSON.stringify({ error: "role is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // The actual role in user_roles must be one of the enum values (admin, staff, teacher)
      const actualRole = base_role || (['admin', 'teacher', 'staff', 'administrative', 'support', 'general'].includes(newRole) ? newRole : 'staff');

      // Upsert role (insert if not exists, update if exists)
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (existingRole) {
        const { error: updateError } = await supabaseAdmin
          .from("user_roles")
          .update({ role: actualRole })
          .eq("user_id", targetUserId);

        if (updateError) {
          return new Response(JSON.stringify({ error: "Failed to update role: " + updateError.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        const { error: insertError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: targetUserId, role: actualRole });

        if (insertError) {
          return new Response(JSON.stringify({ error: "Failed to assign role: " + insertError.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE user
    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent self-deletion
      if (user_id === userId) {
        return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Protect super_admin from deletion by non-super_admin
      const { data: targetRole2 } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", user_id).maybeSingle();
      if (targetRole2?.role === 'super_admin' && !callerIsSuperAdmin) {
        return new Response(JSON.stringify({ error: "Cannot delete super admin" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Detach the deleted auth user from any linked staff / administrative officer rows
      // so admins can create a fresh account for the same person again.
      try {
        await supabaseAdmin.from('staff').update({ user_id: null }).eq('user_id', user_id);
        await supabaseAdmin.from('administrative_officers').update({ user_id: null }).eq('user_id', user_id);
      } catch (cleanupErr) {
        console.error('post-delete cleanup error', cleanupErr);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // APPROVE / REJECT user status
    if (action === "update_status") {
      const { user_id: targetUserId, status } = body;
      if (!targetUserId || !status) {
        return new Response(JSON.stringify({ error: "user_id and status are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!['pending', 'approved'].includes(status)) {
        return new Response(JSON.stringify({ error: "status must be 'pending' or 'approved'" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: statusError } = await supabaseAdmin
        .from("profiles")
        .update({ status })
        .eq("id", targetUserId);
      if (statusError) {
        return new Response(JSON.stringify({ error: statusError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // NOTE: Approving a user no longer auto-creates a staff record.
      // Use the explicit "Add to Staff" / "Add to Administrative" actions in
      // /admin/user-management profile dialog instead.

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // BAN user (disable account)
    if (action === "ban_user") {
      const { user_id: targetUserId } = body;
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "user_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        ban_duration: '876600h', // ~100 years
      });
      if (banError) {
        return new Response(JSON.stringify({ error: banError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UNBAN user (re-enable account)
    if (action === "unban_user") {
      const { user_id: targetUserId } = body;
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "user_id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        ban_duration: 'none',
      });
      if (unbanError) {
        return new Response(JSON.stringify({ error: unbanError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE EMAIL (admin changes another user's email)
    if (action === "update_email") {
      const { user_id: targetUserId, new_email } = body;
      if (!targetUserId || !new_email) {
        return new Response(JSON.stringify({ error: "user_id and new_email are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        email: new_email,
        email_confirm: true,
      });
      if (emailError) {
        const isDup = /already.*registered|already.*exists|duplicate|email.*exists/i.test(emailError.message);
        const payload = isDup
          ? { error: 'DUPLICATE_EMAIL', message: 'A user with this email already exists', message_bn: 'এই ইমেইলে একজন ইউজার ইতিমধ্যে আছেন' }
          : { error: emailError.message };
        return new Response(JSON.stringify(payload), {
          status: isDup ? 409 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE PASSWORD (admin resets another user's password)
    if (action === "update_password") {
      const { user_id: targetUserId, new_password } = body;
      if (!targetUserId || !new_password) {
        return new Response(JSON.stringify({ error: "user_id and new_password are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const pwCheck2 = await enforcePasswordPolicy(supabaseAdmin, new_password);
      if (!pwCheck2.ok) {
        await logSecurityEvent(supabaseAdmin, { event_type: 'weak_password_rejected', severity: 'warning', user_id: userId, target_user_id: targetUserId, reason: 'admin_password_reset', details: pwCheck2.body, req });
        return new Response(JSON.stringify(pwCheck2.body), { status: pwCheck2.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        password: new_password,
      });
      if (pwError) {
        await logSecurityEvent(supabaseAdmin, { event_type: 'password_change_failed', severity: 'warning', user_id: userId, target_user_id: targetUserId, reason: pwError.message, req });
        return new Response(JSON.stringify({ error: pwError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await logSecurityEvent(supabaseAdmin, { event_type: 'password_change_success', severity: 'info', user_id: userId, target_user_id: targetUserId, reason: 'admin_reset', req });
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE NAME (admin changes another user's display name)
    if (action === "update_name") {
      const { user_id: targetUserId, full_name } = body;
      if (!targetUserId || full_name === undefined) {
        return new Response(JSON.stringify({ error: "user_id and full_name are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const trimmedName = (full_name || '').trim();
      if (trimmedName) {
        const { data: dupName } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .ilike('full_name', trimmedName)
          .neq('id', targetUserId)
          .limit(1)
          .maybeSingle();
        if (dupName) {
          return new Response(JSON.stringify({ error: 'DUPLICATE_NAME', message: 'A user with this name already exists', message_bn: 'এই নামে একজন ইউজার ইতিমধ্যে আছেন' }), {
            status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      const { error: nameError } = await supabaseAdmin.from("profiles").update({ full_name: trimmedName || null }).eq("id", targetUserId);
      if (nameError) {
        const isDup = /duplicate|unique/i.test(nameError.message);
        const payload = isDup
          ? { error: 'DUPLICATE_NAME', message: 'A user with this name already exists', message_bn: 'এই নামে একজন ইউজার ইতিমধ্যে আছেন' }
          : { error: nameError.message };
        return new Response(JSON.stringify(payload), {
          status: isDup ? 409 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Also update auth user metadata
      await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        user_metadata: { full_name },
      });
      await supabaseAdmin
        .from("staff")
        .update({ name_bn: trimmedName || null, name_en: trimmedName || null })
        .eq("user_id", targetUserId)
        .is("deleted_at", null);
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPSERT STAFF IDENTITY (admin assigns Bangla name, designation and category to a user)
    if (action === "upsert_staff_identity") {
      const { user_id: targetUserId, name_bn, name_en, designation, staff_category } = body;
      if (!targetUserId || !name_bn) {
        return new Response(JSON.stringify({ error: "user_id and name_bn are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const trimmedName = String(name_bn).trim();
      const trimmedNameEn = name_en ? String(name_en).trim() : trimmedName;
      const trimmedDesignation = designation ? String(designation).trim() : null;
      const category = staff_category ? String(staff_category).trim() : '';
      const { data: { user: targetAuthUser } } = await supabaseAdmin.auth.admin.getUserById(targetUserId);

      // Check target user's role — admin/super_admin/moderator should NOT have a staff record
      const { data: targetRoleRow } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", targetUserId)
        .maybeSingle();
      const targetRole = (targetRoleRow?.role || '').toString();
      const isAdminRole = ['admin', 'super_admin', 'moderator'].includes(targetRole);

      // Always update profile name + auth metadata
      const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
        id: targetUserId,
        full_name: trimmedName,
      });
      if (profileError) {
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        user_metadata: { full_name: trimmedName },
      });

      // For admin roles: stop here, do NOT create/update staff record
      if (isAdminRole) {
        // If a staff record exists for this admin user (legacy), unlink it
        await supabaseAdmin
          .from("staff")
          .update({ user_id: null, updated_at: new Date().toISOString() })
          .eq("user_id", targetUserId)
          .is("deleted_at", null);
        return new Response(JSON.stringify({ success: true, staff: null, admin_role: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Non-admin roles require staff_category
      if (!category) {
        return new Response(JSON.stringify({ error: "staff_category is required for staff users" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const staffPayload = {
        user_id: targetUserId,
        name_bn: trimmedName,
        name_en: trimmedNameEn,
        email: targetAuthUser?.email || null,
        designation: trimmedDesignation,
        staff_category: category,
        department: category === 'teacher' ? 'teaching' : 'general',
        status: 'active',
      };

      let { data: existingStaff } = await supabaseAdmin
        .from("staff")
        .select("id")
        .eq("user_id", targetUserId)
        .is("deleted_at", null)
        .maybeSingle();

      if (!existingStaff?.id && targetAuthUser?.email) {
        const { data: staffByEmail } = await supabaseAdmin
          .from("staff")
          .select("id")
          .eq("email", targetAuthUser.email)
          .is("deleted_at", null)
          .maybeSingle();
        existingStaff = staffByEmail;
      }

      // Update-only: if no staff record exists yet, do NOT auto-create one.
      // The explicit "Add to Staff" action in /admin/user-management profile dialog
      // is the only path that should insert a new staff row.
      if (!existingStaff?.id) {
        return new Response(JSON.stringify({ success: true, staff: null, skipped: true, reason: 'no_staff_record' }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const staffResult = await supabaseAdmin
        .from("staff")
        .update(staffPayload)
        .eq("id", existingStaff.id)
        .select("id, name_bn, name_en, designation, staff_category, photo_url")
        .single();

      if (staffResult.error) {
        return new Response(JSON.stringify({ error: staffResult.error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, staff: staffResult.data }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ensure_staff is handled above (before admin check)

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Manage users error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
