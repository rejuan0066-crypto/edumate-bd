import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const email = "rejuanh@admin.com";
    const password = "bd@001122";

    // Check if admin already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some(u => u.email === email);

    if (adminExists) {
      return new Response(JSON.stringify({ message: "Admin already exists" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create admin user
    const { data: user, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Rejuan H (Admin)" },
    });

    if (error) throw error;

    // Assign admin role
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: user.user.id,
      role: "admin",
    });

    if (roleError) throw roleError;

    return new Response(JSON.stringify({ message: "Admin created successfully" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
