import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth, unauthorized } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPTS: Record<string, string> = {
  person: `Remove the background from this photo of a person. Keep the person (face, hair, body, clothing, accessories) 100% intact with sharp, clean edges. Make the background fully transparent (alpha=0). Preserve all skin tones, hair strands, and fine details. No halos, no color bleeding, no erosion of edges. Return a clean PNG with transparent background.`,
  object: `Remove the background from this product/object image. Keep the entire object intact — preserve all edges, colors, textures, shadows, reflections, and fine details exactly as they are. Make the background fully transparent (alpha=0). Do NOT remove any part of the object even if it is white, cream, or light-colored. No halos, no fringing. Return a clean PNG with transparent background.`,
  design: `Remove ONLY the solid/plain outer background color from this design/banner/graphic image and make it transparent. CRITICAL: This is a decorative design — preserve ALL elements including patterns, ornaments, borders, text, gradients, light-colored areas, and every decorative detail. Only remove the outermost uniform background color. If in doubt, keep the pixel. Return a clean PNG with transparent background.`,
  auto: `Perform intelligent background removal on this image. Identify the main subject (person, object, or design) and remove only the true background. Make removed areas fully transparent (alpha=0). CRITICAL RULES: 1) Preserve ALL foreground content including white, cream, beige, gold, and light-colored elements that are part of the subject. 2) Keep sharp, clean edges with no halos or color bleeding. 3) If ambiguous, prefer keeping pixels rather than removing them. 4) Preserve original colors, textures, shadows, and fine details. Return a clean PNG with transparent background.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // AUTHZ: any authenticated user can use bg removal
  const guard = await requireAuth(req);
  if (!guard.ok) return unauthorized(guard.status, guard.error, corsHeaders);

  try {
    const { image_base64, mode = "auto" } = await req.json();
    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = PROMPTS[mode] || PROMPTS.auto;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: image_base64 } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const resultImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!resultImage) {
      return new Response(JSON.stringify({ error: "No image returned from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ image: resultImage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("remove-bg error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
