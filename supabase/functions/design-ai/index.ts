// Design Studio AI command router.
// Accepts a natural-language prompt + optional canvas context (selection,
// dimensions) and returns either:
//   1. A generated/edited image as a base64 data URL, OR
//   2. A list of structured tool calls describing canvas operations
//      (add_shape, add_text, update_object, remove_object, change_background).
//
// The frontend executes the returned operations against Fabric.js.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ---------- Tool schema (executed by the canvas on the client) ----------
const CANVAS_TOOLS = [
  {
    type: "function",
    function: {
      name: "add_shape",
      description: "Add a basic vector shape to the canvas.",
      parameters: {
        type: "object",
        properties: {
          shape: { type: "string", enum: ["rect", "ellipse", "triangle", "line"] },
          left: { type: "number" },
          top: { type: "number" },
          width: { type: "number" },
          height: { type: "number" },
          fill: { type: "string", description: "Hex color, e.g. #ef4444" },
          stroke: { type: "string" },
          strokeWidth: { type: "number" },
          name: { type: "string" },
        },
        required: ["shape"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_text",
      description: "Add a text layer to the canvas.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string" },
          left: { type: "number" },
          top: { type: "number" },
          fontSize: { type: "number" },
          fontFamily: { type: "string" },
          fontWeight: { type: "string" },
          fill: { type: "string" },
          textAlign: { type: "string", enum: ["left", "center", "right"] },
          name: { type: "string" },
        },
        required: ["text"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_object",
      description:
        "Modify the currently selected object on the canvas (move, resize, recolor, change text, opacity, rotation).",
      parameters: {
        type: "object",
        properties: {
          left: { type: "number" },
          top: { type: "number" },
          width: { type: "number" },
          height: { type: "number" },
          scaleX: { type: "number" },
          scaleY: { type: "number" },
          angle: { type: "number" },
          opacity: { type: "number" },
          fill: { type: "string" },
          stroke: { type: "string" },
          strokeWidth: { type: "number" },
          text: { type: "string" },
          fontSize: { type: "number" },
          fontWeight: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_object",
      description: "Delete the currently selected object from the canvas.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "change_background",
      description: "Change the canvas background color.",
      parameters: {
        type: "object",
        properties: { color: { type: "string", description: "Hex color" } },
        required: ["color"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_image",
      description:
        "Generate a brand-new image from a text description and place it on the canvas.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Detailed visual description" },
          width: { type: "number" },
          height: { type: "number" },
        },
        required: ["prompt"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_selected_image",
      description:
        "Modify the currently selected image (e.g. recolor, add elements, change scene). Requires an image to be selected on the canvas.",
      parameters: {
        type: "object",
        properties: {
          instruction: { type: "string", description: "What to change about the image" },
        },
        required: ["instruction"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_background",
      description:
        "Remove the background of the currently selected image, leaving the subject on transparency.",
      parameters: {
        type: "object",
        properties: {
          mode: { type: "string", enum: ["auto", "person", "object", "design"] },
        },
        additionalProperties: false,
      },
    },
  },
];

const SYSTEM_PROMPT = `You are an AI design copilot inside a Fabric.js based graphic design studio.
You receive a user instruction and optional context about the canvas (size, selected object).
Decide which canvas tools to call to fulfill the request. Prefer ONE tool call per turn unless
multiple are clearly needed (e.g. add several shapes).

Guidelines:
- For "create / draw a <shape>" → use add_shape with sensible default size if not specified.
- For "write / add text ..." → use add_text. Pick a reasonable font size (60-120 for headings, 24-40 for body).
- For "make it bigger / red / move it ..." on the selected object → use update_object.
- For "delete this / remove selected" → use remove_object.
- For "change background to ..." → use change_background.
- For "generate an image of ..." or "create a picture of ..." → use generate_image.
- For "edit / change / modify this image ..." when an image is selected → use edit_selected_image.
- For "remove background" on a selected image → use remove_background.
- Default colors: pick visually pleasing modern hex colors (not pure red/green/blue).
- Coordinates: top-left origin, (0,0) at canvas top-left. If position not given, place near center.
Return ONLY tool calls, no prose.`;

async function generateImage(prompt: string, apiKey: string): Promise<string> {
  const r = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!r.ok) throw new Error(`Image generation failed: ${r.status} ${await r.text()}`);
  const data = await r.json();
  const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("No image returned from model");
  return url;
}

async function editImage(prompt: string, imageUrl: string, apiKey: string): Promise<string> {
  const r = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      modalities: ["image", "text"],
    }),
  });
  if (!r.ok) throw new Error(`Image edit failed: ${r.status} ${await r.text()}`);
  const data = await r.json();
  const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("No edited image returned");
  return url;
}

const REMOVE_BG_PROMPTS: Record<string, string> = {
  person: `Remove the background from this photo of a person. Keep the person 100% intact with sharp edges. Make the background fully transparent (alpha=0). Return a clean PNG with transparent background.`,
  object: `Remove the background from this product/object image. Keep the entire object intact. Make the background fully transparent (alpha=0). Return a clean PNG with transparent background.`,
  design: `Remove ONLY the solid outer background color from this design image and make it transparent. Preserve all decorative elements, text, gradients, light-colored areas. Return a clean PNG with transparent background.`,
  auto: `Perform intelligent background removal on this image. Identify the main subject and remove only the true background. Make removed areas fully transparent (alpha=0). Preserve ALL foreground content including white/cream/light-colored elements. Return a clean PNG with transparent background.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { prompt, context, selectedImage } = body as {
      prompt: string;
      context?: {
        canvasWidth?: number;
        canvasHeight?: number;
        background?: string;
        selectedType?: string | null;
        selectedSummary?: string | null;
      };
      selectedImage?: string | null; // data URL of the selected image, when present
    };

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctxStr = context
      ? `Canvas: ${context.canvasWidth}x${context.canvasHeight}, background ${context.background ?? "#ffffff"}.\nSelected: ${context.selectedSummary ?? "none"}.`
      : "No canvas context.";

    // Step 1: ask the planner LLM which tool to call
    const planRes = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `${ctxStr}\n\nUser instruction: ${prompt}` },
        ],
        tools: CANVAS_TOOLS,
        tool_choice: "auto",
      }),
    });

    if (planRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (planRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to your workspace." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!planRes.ok) {
      const t = await planRes.text();
      console.error("planner error", planRes.status, t);
      return new Response(JSON.stringify({ error: "AI planner failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const planData = await planRes.json();
    const message = planData?.choices?.[0]?.message;
    const toolCalls = message?.tool_calls ?? [];
    const assistantText = message?.content ?? "";

    if (!toolCalls.length) {
      return new Response(
        JSON.stringify({ actions: [], reply: assistantText || "I couldn't translate that into a canvas action — please rephrase." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 2: resolve any tool that needs to actually produce/transform an image
    // server-side. Pure structural ops (add_shape, add_text, update_object, ...)
    // are passed straight to the client to apply.
    const actions: any[] = [];
    for (const call of toolCalls) {
      const name = call.function?.name;
      let args: any = {};
      try { args = JSON.parse(call.function?.arguments || "{}"); } catch { /* ignore */ }

      if (name === "generate_image") {
        try {
          const url = await generateImage(args.prompt, apiKey);
          actions.push({
            type: "add_image",
            imageUrl: url,
            width: args.width,
            height: args.height,
            name: "AI Image",
          });
        } catch (e: any) {
          actions.push({ type: "error", message: e.message || "Image generation failed" });
        }
      } else if (name === "edit_selected_image") {
        if (!selectedImage) {
          actions.push({ type: "error", message: "Please select an image first." });
        } else {
          try {
            const url = await editImage(args.instruction, selectedImage, apiKey);
            actions.push({ type: "replace_selected_image", imageUrl: url });
          } catch (e: any) {
            actions.push({ type: "error", message: e.message || "Image edit failed" });
          }
        }
      } else if (name === "remove_background") {
        if (!selectedImage) {
          actions.push({ type: "error", message: "Please select an image first." });
        } else {
          try {
            const mode = args.mode || "auto";
            const url = await editImage(REMOVE_BG_PROMPTS[mode] || REMOVE_BG_PROMPTS.auto, selectedImage, apiKey);
            actions.push({ type: "replace_selected_image", imageUrl: url });
          } catch (e: any) {
            actions.push({ type: "error", message: e.message || "Background removal failed" });
          }
        }
      } else {
        // Structural action — pass through with normalised payload
        actions.push({ type: name, ...args });
      }
    }

    return new Response(
      JSON.stringify({ actions, reply: assistantText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("design-ai error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
