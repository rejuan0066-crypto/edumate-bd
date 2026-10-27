import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { corsHeaders, otpErrorResponse } from "../_shared/validate.ts";
import { enforcePasswordPolicy, logSecurityEvent } from "../_shared/password.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, new_password, reset_token, code } = await req.json();

    if (!email || !new_password) {
      return otpErrorResponse({
        status: 400,
        code: "INVALID_REQUEST",
        message: "Email and new password are required",
      });
    }

    if (!reset_token && !code) {
      return otpErrorResponse({
        status: 400,
        code: "VERIFICATION_TOKEN_REQUIRED",
        message: "Verification code or reset token is required to reset password.",
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const pwCheck = await enforcePasswordPolicy(supabase, new_password);
    if (!pwCheck.ok) {
      await logSecurityEvent(supabase, { event_type: 'weak_password_rejected', severity: 'warning', email, reason: 'forgot_password_reset', details: pwCheck.body, req });
      return new Response(JSON.stringify(pwCheck.body), { status: pwCheck.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify that the specific OTP record exists, belongs to this email, and was verified
    let otpQuery = supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email)
      .eq("purpose", "password_reset")
      .eq("is_used", true);

    if (reset_token) {
      otpQuery = otpQuery.eq("id", reset_token);
    } else if (code) {
      otpQuery = otpQuery.eq("code", String(code).trim());
    }

    const { data: otpRecord } = await otpQuery
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRecord) {
      return otpErrorResponse({
        status: 403,
        code: "OTP_NOT_VERIFIED",
        message: "No verified OTP found. Please verify your email first.",
      });
    }

    // Check that OTP was verified within the last 15 minutes
    const verifiedAt = new Date(otpRecord.created_at);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (verifiedAt < fifteenMinutesAgo) {
      return otpErrorResponse({
        status: 403,
        code: "OTP_SESSION_EXPIRED",
        message: "OTP session expired. Please request a new code.",
      });
    }

    // Find user by email using admin API
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to look up user",
          code: "INTERNAL_ERROR",
          message: "We couldn't look up the account. Please try again.",
          retry_after_seconds: null,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const user = users.find((u: any) => u.email === email);
    if (!user) {
      return otpErrorResponse({
        status: 404,
        code: "USER_NOT_FOUND",
        message: "No account found for this email.",
      });
    }

    // Update password via admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: new_password,
    });

    if (updateError) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: updateError.message,
          code: "INTERNAL_ERROR",
          message: "We couldn't update your password. Please try again.",
          retry_after_seconds: null,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Invalidate every password_reset OTP for this email so the verified
    // window cannot be replayed to reset the password a second time.
    await supabase
      .from("otp_codes")
      .delete()
      .eq("email", email)
      .eq("purpose", "password_reset");

    await logSecurityEvent(supabase, {
      event_type: 'password_reset_completed',
      severity: 'info',
      email,
      reason: 'forgot_password_reset',
      details: { user_id: user.id },
      req,
    });

    return new Response(
      JSON.stringify({ ok: true, success: true, message: "Password reset successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (_error) {
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
