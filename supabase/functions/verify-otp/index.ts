import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { corsHeaders, validateBody, otpErrorResponse, z } from "../_shared/validate.ts";

const VerifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Must be a valid email address").max(255),
  code: z.string().trim().regex(/^\d{6}$/, "Code must be exactly 6 digits"),
  purpose: z.enum(["email_verification", "password_reset"], {
    errorMap: () => ({ message: "Purpose must be 'email_verification' or 'password_reset'" }),
  }),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const parsed = await validateBody(req, VerifyOtpSchema);
    if (!parsed.ok) return parsed.response;
    const { email, code, purpose } = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find the latest unused OTP for this email+purpose
    const { data: otpRecord, error } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email)
      .eq("purpose", purpose)
      .eq("is_used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !otpRecord) {
      return otpErrorResponse({
        status: 400,
        code: "OTP_NOT_FOUND",
        message: "No valid OTP found. Please request a new code.",
        extras: { valid: false },
      });
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase.from("otp_codes").update({ is_used: true }).eq("id", otpRecord.id);
      return otpErrorResponse({
        status: 400,
        code: "OTP_EXPIRED",
        message: "This OTP has expired. Please request a new code.",
        extras: { valid: false },
      });
    }

    // Check max attempts
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      await supabase.from("otp_codes").update({ is_used: true }).eq("id", otpRecord.id);
      return otpErrorResponse({
        status: 400,
        code: "OTP_MAX_ATTEMPTS",
        message: "Maximum attempts exceeded. Please request a new code.",
        extras: { valid: false, attempts_remaining: 0 },
      });
    }

    // Increment attempts
    await supabase
      .from("otp_codes")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);

    // Check code
    if (otpRecord.code !== code) {
      const remaining = otpRecord.max_attempts - otpRecord.attempts - 1;
      return otpErrorResponse({
        status: 400,
        code: "OTP_INVALID",
        message: `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        extras: { valid: false, attempts_remaining: Math.max(0, remaining) },
      });
    }

    // Mark as used
    await supabase.from("otp_codes").update({ is_used: true }).eq("id", otpRecord.id);

    return new Response(
      JSON.stringify({ ok: true, valid: true, message: "OTP verified successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (_error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        message: "Something went wrong while verifying the code.",
        retry_after_seconds: null,
        valid: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
