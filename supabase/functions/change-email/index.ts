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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { new_email, otp_code, skip_otp, current_password } = await req.json();

    if (!new_email) {
      return new Response(JSON.stringify({ error: "new_email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user has admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode: skip_otp (password-only verification)
    if (skip_otp) {
      if (!current_password) {
        return new Response(JSON.stringify({ error: "current_password is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify password by trying to sign in
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { error: signInError } = await anonClient.auth.signInWithPassword({
        email: user.email!,
        password: current_password,
      });

      if (signInError) {
        return new Response(JSON.stringify({ error: "Incorrect password" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Mode: OTP verification
      if (!otp_code) {
        return new Response(JSON.stringify({ error: "otp_code is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: otpRecord } = await supabaseAdmin
        .from("otp_codes")
        .select("*")
        .eq("email", new_email)
        .eq("purpose", "email_verification")
        .eq("is_used", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpRecord) {
        return new Response(JSON.stringify({ error: "No valid OTP found." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(otpRecord.expires_at) < new Date()) {
        await supabaseAdmin.from("otp_codes").update({ is_used: true }).eq("id", otpRecord.id);
        return new Response(JSON.stringify({ error: "OTP has expired" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (otpRecord.attempts >= otpRecord.max_attempts) {
        await supabaseAdmin.from("otp_codes").update({ is_used: true }).eq("id", otpRecord.id);
        return new Response(JSON.stringify({ error: "Maximum attempts exceeded" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin
        .from("otp_codes")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      if (otpRecord.code !== otp_code) {
        const remaining = otpRecord.max_attempts - otpRecord.attempts - 1;
        return new Response(JSON.stringify({ error: `Invalid code. ${remaining} attempts remaining.` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("otp_codes").update({ is_used: true }).eq("id", otpRecord.id);
    }

    // Update user email
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email: new_email,
      email_confirm: true,
    });

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update email: " + updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Email updated successfully" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Change email error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
