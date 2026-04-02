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
    const { smtp_host, smtp_port, smtp_username, smtp_password, from_email, from_name, use_tls } = await req.json();

    if (!smtp_host || !smtp_username || !smtp_password || !from_email) {
      return new Response(JSON.stringify({ success: false, error: "Missing required SMTP fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try connecting via SMTP using Deno's built-in net
    try {
      const conn = await Deno.connect({
        hostname: smtp_host,
        port: smtp_port || 587,
      });

      const buf = new Uint8Array(1024);
      await conn.read(buf);
      const greeting = new TextDecoder().decode(buf);
      
      // Send EHLO
      await conn.write(new TextEncoder().encode(`EHLO localhost\r\n`));
      await conn.read(buf);
      
      // Send QUIT
      await conn.write(new TextEncoder().encode(`QUIT\r\n`));
      conn.close();

      if (greeting.startsWith("220")) {
        return new Response(JSON.stringify({ success: true, message: "SMTP server responded successfully" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ success: false, error: "Unexpected SMTP response: " + greeting.substring(0, 100) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (connError) {
      return new Response(JSON.stringify({ success: false, error: `Cannot connect to ${smtp_host}:${smtp_port} - ${connError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
