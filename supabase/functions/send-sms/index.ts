import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.100.1/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { phone, message, action } = body;

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "phone and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load SMS gateway config
    const { data: config, error: cfgErr } = await supabase
      .from("sms_gateway_config")
      .select("*")
      .eq("is_enabled", true)
      .limit(1)
      .maybeSingle();

    if (cfgErr || !config) {
      return new Response(
        JSON.stringify({ error: "SMS gateway not configured or disabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: Record<string, unknown> = {};
    let success = false;

    switch (config.provider) {
      case "bulksmsbd": {
        // BulkSMSBD API
        const url = new URL(config.api_url || "https://bulksmsbd.net/api/smsapi");
        url.searchParams.set("api_key", config.api_key);
        url.searchParams.set("type", "text");
        url.searchParams.set("number", phone);
        url.searchParams.set("senderid", config.sender_id);
        url.searchParams.set("message", message);

        const res = await fetch(url.toString());
        result = await res.json();
        success = res.ok;
        break;
      }

      case "smsnoc": {
        // SMSNoc API
        const url = new URL(config.api_url || "https://api.smsnoc.com/sms/send");
        const res = await fetch(url.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.api_key}`,
          },
          body: JSON.stringify({
            sender_id: config.sender_id,
            to: phone,
            message: message,
          }),
        });
        result = await res.json();
        success = res.ok;
        break;
      }

      case "grameenphone": {
        // Grameenphone SMS API
        const res = await fetch(config.api_url || "https://gpcmp.grameenphone.com/ecmapigw/webresources/ecmapigw.v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            username: config.api_key,
            password: config.api_secret,
          },
          body: JSON.stringify({
            msisdn: phone,
            message: message,
            sender: config.sender_id,
          }),
        });
        result = await res.json();
        success = res.ok;
        break;
      }

      case "twilio": {
        // Twilio SMS API
        const accountSid = config.api_key;
        const authToken = config.api_secret;
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: phone,
              From: config.sender_id,
              Body: message,
            }),
          }
        );
        result = await res.json();
        success = res.ok;
        break;
      }

      default: {
        // Generic provider
        if (!config.api_url) {
          return new Response(
            JSON.stringify({ error: "API URL not configured for generic provider" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const res = await fetch(config.api_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.api_key}`,
            ...(config.api_secret ? { "X-Api-Secret": config.api_secret } : {}),
          },
          body: JSON.stringify({
            to: phone,
            message: message,
            sender_id: config.sender_id,
          }),
        });
        result = await res.json();
        success = res.ok;
        break;
      }
    }

    return new Response(
      JSON.stringify({ success, provider: config.provider, data: result }),
      { status: success ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("SMS error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
