import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.100.1/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, purpose } = await req.json();

    if (!email || !purpose) {
      return new Response(JSON.stringify({ error: "Email and purpose are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validPurposes = ["email_verification", "password_reset"];
    if (!validPurposes.includes(purpose)) {
      return new Response(JSON.stringify({ error: "Invalid purpose" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Get EmailJS config
    const { data: config } = await supabase
      .from("emailjs_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!config || !config.is_enabled) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expiryMinutes = config.otp_expiry_minutes || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    // Invalidate old unused OTPs for this email+purpose
    await supabase
      .from("otp_codes")
      .update({ is_used: true })
      .eq("email", email)
      .eq("purpose", purpose)
      .eq("is_used", false);

    // Store new OTP
    const { error: insertError } = await supabase
      .from("otp_codes")
      .insert({ email, code, purpose, expires_at: expiresAt });

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to create OTP" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return config for client-side EmailJS call (public key is safe to expose)
    return new Response(
      JSON.stringify({
        success: true,
        otp_code: code,
        emailjs: {
          service_id: config.service_id,
          template_id: config.template_id,
          public_key: config.public_key,
        },
        expiry_minutes: expiryMinutes,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
