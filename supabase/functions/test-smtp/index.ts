// Real SMTP test: connects, authenticates, and (optionally) sends a test email.
// Uses the same shared SMTP helper as send-welcome-email so issues are reproduced consistently.

import { sendViaSMTP } from "../_shared/smtp.ts";
import { requireAuth, unauthorized } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth check: strictly require admin or super_admin authentication (no anon key bypass)
  const guard = await requireAuth(req, { roles: ['admin', 'super_admin'] });
  if (!guard.ok) return unauthorized(guard.status, guard.error, corsHeaders);

  try {
    const body = await req.json();
    const {
      smtp_host,
      smtp_port,
      smtp_username,
      smtp_password,
      from_email,
      from_name,
      use_tls,
      test_email, // optional recipient — if provided, an actual email is sent
    } = body || {};

    if (!smtp_host || !smtp_username || !smtp_password || !from_email) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required SMTP fields (host, username, password, from_email)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // SSRF protection: reject private/local IP addresses
    const hostLower = smtp_host.toLowerCase().trim();
    if (
      hostLower === 'localhost' ||
      hostLower.startsWith('127.') ||
      hostLower.startsWith('10.') ||
      hostLower.startsWith('192.168.') ||
      hostLower.startsWith('169.254.') ||
      hostLower.startsWith('0.0.0.0') ||
      hostLower === '::1'
    ) {
      return new Response(JSON.stringify({ success: false, error: "Private or loopback SMTP hosts are not permitted" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Plain TCP reachability check (catches "host unreachable" / wrong port quickly)
    try {
      const conn = await Deno.connect({ hostname: smtp_host, port: smtp_port || 587 });
      const buf = new Uint8Array(1024);
      await conn.read(buf);
      const greeting = new TextDecoder().decode(buf);
      try { conn.close(); } catch (_) {}

      if (!greeting.startsWith("220")) {
        return new Response(
          JSON.stringify({
            success: false,
            stage: "connect",
            error: "Server did not greet with 220: " + greeting.substring(0, 120),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } catch (connErr) {
      return new Response(
        JSON.stringify({
          success: false,
          stage: "connect",
          error: `Cannot reach ${smtp_host}:${smtp_port || 587} — ${(connErr as Error).message}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 2: Real auth + send (only when a test recipient is provided)
    if (test_email) {
      try {
        const subject = "SMTP Test — " + (from_name || "School Management");
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:24px auto;padding:24px;background:#f0faf6;border:1px solid #cdeadd;border-radius:12px;">
            <h2 style="color:#1a7f64;margin:0 0 12px;">✅ SMTP কাজ করছে!</h2>
            <p style="color:#333;font-size:14px;line-height:1.6;margin:0 0 8px;">
              এটি একটি টেস্ট ইমেইল। আপনি যদি এটি পান, তার মানে আপনার SMTP কনফিগারেশন সঠিক ভাবে কাজ করছে।
            </p>
            <p style="color:#666;font-size:12px;margin:12px 0 0;">
              Host: ${smtp_host}:${smtp_port || 587}<br/>
              From: ${from_email}<br/>
              Time: ${new Date().toISOString()}
            </p>
          </div>`;

        await sendViaSMTP(
          {
            smtp_host,
            smtp_port: smtp_port || 587,
            smtp_username,
            smtp_password,
            from_email,
            from_name,
            use_tls: use_tls !== false,
          },
          test_email,
          subject,
          html,
        );

        return new Response(
          JSON.stringify({
            success: true,
            stage: "send",
            message: `Test email successfully sent to ${test_email}`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (sendErr) {
        const msg = (sendErr as Error).message || String(sendErr);
        console.error("[test-smtp] send failed:", msg);
        return new Response(
          JSON.stringify({
            success: false,
            stage: "send",
            error: msg,
            hint: msg.toLowerCase().includes("auth")
              ? "Authentication failed — double-check username/password. For Gmail, use an App Password, not your account password. For Brevo, use your SMTP Master Key."
              : msg.toLowerCase().includes("tls")
                ? "TLS handshake failed — try toggling Use TLS or switching port (587 STARTTLS / 465 SSL)."
                : undefined,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // No test_email provided → reachability OK
    return new Response(
      JSON.stringify({
        success: true,
        stage: "connect",
        message: "SMTP server is reachable. Provide a test_email to verify auth & sending.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
