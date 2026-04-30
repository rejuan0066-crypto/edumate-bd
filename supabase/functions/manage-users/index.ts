import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { enforcePasswordPolicy, logSecurityEvent } from "../_shared/password.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

      if (!email || !password) {
        return new Response(JSON.stringify({ error: "email and password are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pwCheck = await enforcePasswordPolicy(supabaseAdmin, password);
      if (!pwCheck.ok) {
        await logSecurityEvent(supabaseAdmin, { event_type: 'weak_password_rejected', severity: 'warning', user_id: userId, email, reason: 'create_user', details: pwCheck.body, req });
        return new Response(JSON.stringify(pwCheck.body), { status: pwCheck.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const trimmedEmail = String(email).trim().toLowerCase();
      const trimmedPhone = phone ? String(phone).trim() : '';
      const trimmedName = full_name ? String(full_name).trim() : '';
      const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
      const conflict = (payload: any) => new Response(JSON.stringify(payload), { status: 409, headers: jsonHeaders });

      // ── STEP 1: Acquire transaction-scoped advisory locks (serialize concurrent creates) ──
      // Note: pg_advisory_xact_lock is auto-released at end of statement when called via RPC,
      // so we instead rely on RPC-level serialization plus immediate duplicate re-check.
      try {
        await supabaseAdmin.rpc('acquire_user_create_lock', { _email: trimmedEmail, _phone: trimmedPhone });
      } catch (_e) { /* non-fatal: locks are best-effort */ }

      // ── STEP 2: Atomic duplicate check across profiles + staff + administrative_officers ──
      const { data: dupCheck, error: dupErr } = await supabaseAdmin.rpc('check_user_duplicates', {
        _email: trimmedEmail, _phone: trimmedPhone, _full_name: trimmedName,
      });
      if (dupErr) {
        return new Response(JSON.stringify({ error: 'duplicate_check_failed', message: dupErr.message }), {
          status: 500, headers: jsonHeaders,
        });
      }
      if (dupCheck && (dupCheck as any).ok === false) {
        const d = dupCheck as any;
        return conflict({ error: d.code, message: d.message_bn, message_bn: d.message_bn });
      }

      // ── STEP 3: Email duplicate in auth.users ──
      try {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const emailHit = existingUsers?.users?.find((u: any) => (u.email || '').toLowerCase() === trimmedEmail);
        if (emailHit) {
          return conflict({
            error: 'DUPLICATE_EMAIL',
            message: `এই ইমেইল (${trimmedEmail}) দিয়ে ইতিমধ্যে একজন ইউজার রেজিস্টার্ড আছেন।`,
            message_bn: `এই ইমেইল (${trimmedEmail}) দিয়ে ইতিমধ্যে একজন ইউজার রেজিস্টার্ড আছেন।`,
          });
        }
      } catch (_e) { /* fall through */ }

      // ── STEP 4: Create auth user ──
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: trimmedEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: trimmedName || '', phone: trimmedPhone || undefined },
      });

      if (createError || !newUser?.user?.id) {
        const msg = createError?.message || 'create_failed';
        const isDup = /already.*registered|already.*exists|duplicate|email.*exists/i.test(msg);
        return new Response(JSON.stringify(
          isDup
            ? { error: 'DUPLICATE_EMAIL', message_bn: `এই ইমেইল (${trimmedEmail}) দিয়ে ইতিমধ্যে একজন ইউজার রেজিস্টার্ড আছেন।` }
            : { error: msg }
        ), { status: isDup ? 409 : 400, headers: jsonHeaders });
      }

      const newUserId = newUser.user.id;

      // ── Atomic rollback helper: undoes everything done after auth user creation ──
      const rollback = async (reason: string) => {
        try { await supabaseAdmin.from('user_roles').delete().eq('user_id', newUserId); } catch {}
        try { await supabaseAdmin.from('profiles').delete().eq('id', newUserId); } catch {}
        try { await supabaseAdmin.auth.admin.deleteUser(newUserId); } catch {}
        await logSecurityEvent(supabaseAdmin, {
          event_type: 'user_create_rolled_back', severity: 'warning',
          user_id: userId, email: trimmedEmail, reason, req,
        }).catch(() => {});
      };

      // ── STEP 5: Assign role (rollback on failure) ──
      if (role) {
        const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
          user_id: newUserId, role,
        });
        if (roleError) {
          await rollback('role_assignment_failed: ' + roleError.message);
          return new Response(JSON.stringify({ error: "Failed to assign role: " + roleError.message }), {
            status: 500, headers: jsonHeaders,
          });
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
          await rollback('profile_upsert_failed: ' + m);
          if (/DUPLICATE_PHONE/i.test(m)) {
            return conflict({
              error: 'DUPLICATE_PHONE',
              message_bn: `এই ফোন নম্বর (${trimmedPhone}) দিয়ে ইতিমধ্যে একজন ইউজার রেজিস্টার্ড আছেন।`,
            });
          }
          return new Response(JSON.stringify({ error: 'profile_update_failed', message: m }), {
            status: 500, headers: jsonHeaders,
          });
        }
      }

      // Link to existing staff record if staff_id explicitly provided.
      // NOTE: We intentionally do NOT auto-create a staff/administrative record from role.
      // Adding a user to staff or administrative_officers must be done manually from the
      // User Management profile dialog ("Add to Staff" / "Add to Administrative" buttons).
      if (body.staff_id) {
        const { error: linkErr } = await supabaseAdmin.from("staff").update({ user_id: newUserId }).eq("id", body.staff_id);
        if (linkErr) {
          await rollback('staff_link_failed: ' + linkErr.message);
          return new Response(JSON.stringify({ error: 'staff_link_failed', message: linkErr.message }), {
            status: 500, headers: jsonHeaders,
          });
        }
      }

      // Best-effort: send welcome email via SMTP (Mailtrap, etc.)
      try {
        const origin = req.headers.get("origin") || req.headers.get("referer") || "";
        const loginUrl = origin ? `${new URL(origin).origin}/login` : undefined;
        await supabaseAdmin.functions.invoke("send-welcome-email", {
          body: {
            email: trimmedEmail,
            full_name: trimmedName || undefined,
            role: role || undefined,
            password,
            kind: "user",
            login_url: loginUrl,
          },
        });
      } catch (mailErr) {
        console.error("send-welcome-email failed (non-fatal):", mailErr);
      }

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
