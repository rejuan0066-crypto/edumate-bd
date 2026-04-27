import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { corsHeaders, otpErrorResponse } from "../_shared/validate.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return otpErrorResponse({
        status: 401,
        code: "UNAUTHORIZED",
        message: "You must be signed in to change your password.",
      });
    }

    const { current_password, new_password, otp_code } = await req.json();

    if (!current_password || !new_password) {
      return otpErrorResponse({
        status: 400,
        code: "INVALID_REQUEST",
        message: "current_password and new_password are required",
      });
    }

    if (new_password.length < 6) {
      return otpErrorResponse({
        status: 400,
        code: "WEAK_PASSWORD",
        message: "Password must be at least 6 characters",
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
      return otpErrorResponse({
        status: 401,
        code: "UNAUTHORIZED",
        message: "Your session is no longer valid. Please sign in again.",
      });
    }

    // Verify admin-level role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (!roleData) {
      return otpErrorResponse({
        status: 403,
        code: "ADMIN_REQUIRED",
        message: "Admin access is required to change password.",
      });
    }

    // Verify current password
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { error: signInError } = await anonClient.auth.signInWithPassword({
      email: user.email!,
      password: current_password,
    });

    if (signInError) {
      return otpErrorResponse({
        status: 403,
        code: "INVALID_PASSWORD",
        message: "Current password is incorrect.",
      });
    }

    // If OTP provided, verify it
    if (otp_code) {
      const { data: otpRecord } = await supabaseAdmin
        .from("otp_codes")
        .select("*")
        .eq("email", user.email!)
        .eq("purpose", "password_reset")
        .eq("is_used", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpRecord) {
        return otpErrorResponse({
          status: 400,
          code: "OTP_NOT_FOUND",
          message: "No valid OTP found. Please request a new code.",
        });
      }

      if (new Date(otpRecord.expires_at) < new Date()) {
        await supabaseAdmin.from("otp_codes").update({ is_used: true }).eq("id", otpRecord.id);
        return otpErrorResponse({
          status: 400,
          code: "OTP_EXPIRED",
          message: "This OTP has expired. Please request a new code.",
        });
      }

      if (otpRecord.attempts >= otpRecord.max_attempts) {
        await supabaseAdmin.from("otp_codes").update({ is_used: true }).eq("id", otpRecord.id);
        return otpErrorResponse({
          status: 400,
          code: "OTP_MAX_ATTEMPTS",
          message: "Maximum attempts exceeded. Please request a new code.",
          extras: { attempts_remaining: 0 },
        });
      }

      await supabaseAdmin
        .from("otp_codes")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);

      if (otpRecord.code !== otp_code) {
        const remaining = otpRecord.max_attempts - otpRecord.attempts - 1;
        return otpErrorResponse({
          status: 400,
          code: "OTP_INVALID",
          message: `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
          extras: { attempts_remaining: Math.max(0, remaining) },
        });
      }

      await supabaseAdmin.from("otp_codes").update({ is_used: true }).eq("id", otpRecord.id);
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: new_password,
    });

    if (updateError) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to update password: " + updateError.message,
          code: "INTERNAL_ERROR",
          message: "We couldn't update your password. Please try again.",
          retry_after_seconds: null,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, success: true, message: "Password updated successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Change password error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        message: "Something went wrong. Please try again.",
        retry_after_seconds: null,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
