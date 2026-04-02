import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.100.1/cors";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { card_number, form_type } = body;

    if (!card_number || typeof card_number !== "string" || card_number.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Card number is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!form_type || !["student", "staff"].includes(form_type)) {
      return new Response(JSON.stringify({ error: "Invalid form_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to read config (since it contains API key)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: config, error: configError } = await adminClient
      .from("api_verification_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: "Configuration not found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!config.is_enabled) {
      return new Response(JSON.stringify({ error: "Service is disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!config.api_url) {
      return new Response(JSON.stringify({ error: "API URL not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call external API
    const apiUrl = config.api_url.replace("{card_number}", encodeURIComponent(card_number.trim()));
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.api_key) {
      headers["Authorization"] = `Bearer ${config.api_key}`;
      headers["x-api-key"] = config.api_key;
    }

    const apiResponse = await fetch(apiUrl, { method: "GET", headers });

    if (!apiResponse.ok) {
      return new Response(
        JSON.stringify({ error: "External API error", status: apiResponse.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiData = await apiResponse.json();

    // Apply field mappings
    const mappings = (config.field_mappings as Record<string, Record<string, string>>)?.[form_type] || {};
    const mappedData: Record<string, string> = {};

    for (const [apiKey, formField] of Object.entries(mappings)) {
      // Support nested API response with dot notation
      const value = apiKey.split(".").reduce((obj: any, key: string) => obj?.[key], apiData);
      if (value !== undefined && value !== null) {
        mappedData[formField as string] = String(value);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: mappedData, raw: apiData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
