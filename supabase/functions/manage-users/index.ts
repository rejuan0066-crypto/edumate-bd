import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

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

      const roleMap: Record<string, string> = {};
      (roles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });
      const profileMap: Record<string, { name: string; status: string }> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.id] = { name: p.full_name || '', status: p.status || 'pending' }; });

      const userList = users.map((u: any) => ({
        id: u.id,
        email: u.email,
        role: roleMap[u.id] || 'none',
        full_name: profileMap[u.id]?.name || '',
        status: profileMap[u.id]?.status || 'pending',
        created_at: u.created_at,
      }));

      return new Response(JSON.stringify({ users: userList }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // body already parsed above

    // CREATE user
    if (action === "create") {
      const { email, password, role, full_name } = body;

      if (!email || !password) {
        return new Response(JSON.stringify({ error: "email and password are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (password.length < 6) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || '' },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Assign role only if provided
      if (role) {
        const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
          user_id: newUser.user.id,
          role,
        });

        if (roleError) {
          // Cleanup: delete the created user if role assignment fails
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          return new Response(JSON.stringify({ error: "Failed to assign role: " + roleError.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Update profile name
      if (full_name) {
        await supabaseAdmin.from("profiles").upsert({
          id: newUser.user.id,
          full_name,
        });
      }

      // Link to staff record if staff_id provided
      if (body.staff_id) {
        await supabaseAdmin.from("staff").update({ user_id: newUser.user.id }).eq("id", body.staff_id);
      } else if (role && (role === 'staff' || role === 'teacher' || role === 'admin')) {
        // Auto-create staff record if no staff_id provided
        const { data: existingStaff } = await supabaseAdmin
          .from("staff")
          .select("id")
          .eq("user_id", newUser.user.id)
          .maybeSingle();

        if (!existingStaff) {
          await supabaseAdmin.from("staff").insert({
            user_id: newUser.user.id,
            name_bn: full_name || email.split('@')[0],
            name_en: full_name || '',
            email: email,
            department: role === 'teacher' ? 'teaching' : 'general',
            status: 'active',
          });
        }
      }

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      const actualRole = base_role || (newRole === 'admin' ? 'admin' : newRole === 'teacher' ? 'teacher' : 'staff');

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

      // Auto-create staff record when approving
      if (status === 'approved') {
        const { data: existingStaff } = await supabaseAdmin
          .from("staff")
          .select("id")
          .eq("user_id", targetUserId)
          .maybeSingle();

        if (!existingStaff) {
          // Get user info
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("full_name, phone")
            .eq("id", targetUserId)
            .maybeSingle();
          
          const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
          
          const { data: roleData } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", targetUserId)
            .maybeSingle();

          const userRole = roleData?.role || 'staff';

          await supabaseAdmin.from("staff").insert({
            user_id: targetUserId,
            name_bn: profile?.full_name || authUser?.email?.split('@')[0] || 'Unknown',
            name_en: profile?.full_name || '',
            email: authUser?.email || '',
            phone: profile?.phone || '',
            department: userRole === 'teacher' ? 'teaching' : 'general',
            status: 'active',
          });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
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
