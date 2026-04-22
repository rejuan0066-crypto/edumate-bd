// Design Studio AI command router.
// Accepts a natural-language prompt + optional canvas context (selection,
// dimensions, scope, available templates) and returns a list of structured
// canvas operations the frontend executes against Fabric.js.

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
          rx: { type: "number", description: "Corner radius for rect" },
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
        "Modify the current targeted object (selected layer, or the layer matched by the user's scope filter).",
      parameters: {
        type: "object",
        properties: {
          left: { type: "number" }, top: { type: "number" },
          width: { type: "number" }, height: { type: "number" },
          scaleX: { type: "number" }, scaleY: { type: "number" },
          angle: { type: "number" }, opacity: { type: "number" },
          fill: { type: "string" }, stroke: { type: "string" }, strokeWidth: { type: "number" },
          text: { type: "string" }, fontSize: { type: "number" }, fontWeight: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_object",
      description: "Delete the targeted object from the canvas.",
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
      description: "Generate a brand-new image from a text description.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          width: { type: "number" }, height: { type: "number" },
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
      description: "Modify the currently selected image (recolor, restyle, add elements).",
      parameters: {
        type: "object",
        properties: { instruction: { type: "string" } },
        required: ["instruction"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_background",
      description: "Remove the background of the selected image.",
      parameters: {
        type: "object",
        properties: { mode: { type: "string", enum: ["auto", "person", "object", "design"] } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_section",
      description:
        "Generate a complete reusable UI section (header, hero, form, table, dashboard, card, footer, sidebar) " +
        "as a group of shapes + text laid out on the canvas. Use when the user asks to create a section/block.",
      parameters: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["header", "hero", "form", "table", "dashboard", "card", "footer", "sidebar", "stats", "chart"],
          },
          title: { type: "string", description: "Optional title or label." },
          rows: { type: "number", description: "Rows for table/dashboard layouts." },
          cols: { type: "number", description: "Columns for table/dashboard layouts." },
          accent: { type: "string", description: "Accent hex color." },
          left: { type: "number" }, top: { type: "number" },
          width: { type: "number" }, height: { type: "number" },
          name: { type: "string" },
        },
        required: ["kind"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "use_template",
      description:
        "Insert one of the user's saved templates (matched by id or fuzzy name) onto the canvas.",
      parameters: {
        type: "object",
        properties: {
          templateId: { type: "string" },
          templateName: { type: "string" },
          left: { type: "number" }, top: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
];

const SYSTEM_PROMPT = `You are an AI design copilot inside a Fabric.js graphic design studio.
You receive a user instruction, canvas context (size, background), the user's current SCOPE
(which kind of layer they want to target: any/section/card/table/chart/text/image), the
currently selected layer, and a list of available saved templates.

Decide which tools to call. Prefer multiple tool calls when the user asks for a multi-part
section. For "create a header / form / table / dashboard / card" → use generate_section.
For "use my <template name> template" → use use_template. For modifications to an existing
layer when SCOPE is set → use update_object (the client will resolve the right target).

Coordinates use top-left origin. If position not given, place near top-center. Pick modern
hex colors (slate / indigo / emerald families) — avoid pure red/green/blue. Default font:
Inter. Headings 48-96px, body 14-22px.

Return ONLY tool calls — no prose.`;

// ---------- Image helpers ----------
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
  if (!r.ok) throw new Error(`Image generation failed: ${r.status}`);
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
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      }],
      modalities: ["image", "text"],
    }),
  });
  if (!r.ok) throw new Error(`Image edit failed: ${r.status}`);
  const data = await r.json();
  const url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("No edited image returned");
  return url;
}

const REMOVE_BG_PROMPTS: Record<string, string> = {
  person: `Remove the background from this photo of a person. Make the background fully transparent (alpha=0). Return a clean PNG.`,
  object: `Remove the background from this product image. Make the background fully transparent (alpha=0). Return a clean PNG.`,
  design: `Remove ONLY the solid outer background color from this design and make it transparent. Preserve all decorative elements. Return a clean PNG.`,
  auto: `Perform intelligent background removal. Identify the main subject, make removed areas fully transparent (alpha=0). Return a clean PNG.`,
};

// ---------- Section blueprint generator (deterministic, fast, free) ----------
type Action = Record<string, any>;

function blueprintSection(args: any, canvasW: number, canvasH: number): Action[] {
  const kind = args.kind as string;
  const accent = args.accent || "#6366f1";
  const muted = "#e2e8f0";
  const ink = "#0f172a";
  const sub = "#64748b";
  const surface = "#ffffff";
  const left = args.left ?? 60;
  const top = args.top ?? 60;
  const width = Math.min(args.width ?? canvasW - 120, canvasW - 40);
  const title = args.title || defaultTitle(kind);
  const groupName = args.name || `${kind}-${Date.now().toString(36).slice(-4)}`;

  const out: Action[] = [];

  const tag = (a: Action): Action => ({ ...a, sectionTag: groupName });

  switch (kind) {
    case "header": {
      const h = args.height ?? 96;
      out.push(tag({ type: "add_shape", shape: "rect", left, top, width, height: h, fill: surface, stroke: muted, strokeWidth: 1, rx: 16, name: `${groupName}/bg` }));
      out.push(tag({ type: "add_shape", shape: "ellipse", left: left + 22, top: top + h / 2 - 16, width: 32, height: 32, fill: accent, name: `${groupName}/logo` }));
      out.push(tag({ type: "add_text", text: title, left: left + 70, top: top + h / 2 - 14, fontSize: 22, fontWeight: "700", fill: ink, name: `${groupName}/title` }));
      ["Home", "Pricing", "Docs", "Login"].forEach((label, i) => {
        out.push(tag({ type: "add_text", text: label, left: left + width - 360 + i * 90, top: top + h / 2 - 8, fontSize: 14, fill: sub, name: `${groupName}/nav-${i}` }));
      });
      break;
    }
    case "hero": {
      const h = args.height ?? 360;
      out.push(tag({ type: "add_shape", shape: "rect", left, top, width, height: h, fill: "#0f172a", rx: 24, name: `${groupName}/bg` }));
      out.push(tag({ type: "add_text", text: title, left: left + 48, top: top + 80, fontSize: 64, fontWeight: "800", fill: "#ffffff", name: `${groupName}/headline` }));
      out.push(tag({ type: "add_text", text: "Subheadline that explains the value in one short sentence.", left: left + 48, top: top + 170, fontSize: 18, fill: "#94a3b8", name: `${groupName}/subhead` }));
      out.push(tag({ type: "add_shape", shape: "rect", left: left + 48, top: top + 230, width: 160, height: 48, fill: accent, rx: 24, name: `${groupName}/cta` }));
      out.push(tag({ type: "add_text", text: "Get started", left: left + 90, top: top + 244, fontSize: 16, fontWeight: "600", fill: "#ffffff", name: `${groupName}/cta-text` }));
      break;
    }
    case "form": {
      const fields = ["Full name", "Email address", "Password", "Confirm password"];
      const h = args.height ?? 80 + fields.length * 80 + 90;
      out.push(tag({ type: "add_shape", shape: "rect", left, top, width, height: h, fill: surface, stroke: muted, strokeWidth: 1, rx: 20, name: `${groupName}/bg` }));
      out.push(tag({ type: "add_text", text: title, left: left + 32, top: top + 28, fontSize: 24, fontWeight: "700", fill: ink, name: `${groupName}/title` }));
      fields.forEach((label, i) => {
        const fy = top + 80 + i * 80;
        out.push(tag({ type: "add_text", text: label, left: left + 32, top: fy, fontSize: 12, fontWeight: "600", fill: sub, name: `${groupName}/label-${i}` }));
        out.push(tag({ type: "add_shape", shape: "rect", left: left + 32, top: fy + 22, width: width - 64, height: 44, fill: "#f8fafc", stroke: muted, strokeWidth: 1, rx: 10, name: `${groupName}/input-${i}` }));
      });
      const by = top + 80 + fields.length * 80 + 8;
      out.push(tag({ type: "add_shape", shape: "rect", left: left + 32, top: by, width: width - 64, height: 48, fill: accent, rx: 12, name: `${groupName}/submit` }));
      out.push(tag({ type: "add_text", text: "Submit", left: left + width / 2 - 30, top: by + 14, fontSize: 16, fontWeight: "600", fill: "#ffffff", name: `${groupName}/submit-text` }));
      break;
    }
    case "table": {
      const cols = Math.max(2, Math.min(args.cols ?? 4, 8));
      const rows = Math.max(2, Math.min(args.rows ?? 5, 12));
      const colW = Math.floor((width - 32) / cols);
      const rowH = 44;
      const h = args.height ?? 60 + rowH * (rows + 1) + 20;
      out.push(tag({ type: "add_shape", shape: "rect", left, top, width, height: h, fill: surface, stroke: muted, strokeWidth: 1, rx: 20, name: `${groupName}/bg` }));
      out.push(tag({ type: "add_text", text: title, left: left + 24, top: top + 22, fontSize: 18, fontWeight: "700", fill: ink, name: `${groupName}/title` }));
      // Header row
      out.push(tag({ type: "add_shape", shape: "rect", left: left + 16, top: top + 60, width: width - 32, height: rowH, fill: "#f1f5f9", rx: 10, name: `${groupName}/hrow` }));
      for (let c = 0; c < cols; c++) {
        out.push(tag({ type: "add_text", text: `Column ${c + 1}`, left: left + 28 + c * colW, top: top + 72, fontSize: 12, fontWeight: "700", fill: ink, name: `${groupName}/h-${c}` }));
      }
      // Data rows
      for (let r = 0; r < rows; r++) {
        const ry = top + 60 + (r + 1) * rowH;
        if (r % 2 === 1) {
          out.push(tag({ type: "add_shape", shape: "rect", left: left + 16, top: ry, width: width - 32, height: rowH, fill: "#fafbfc", rx: 8, name: `${groupName}/row-${r}` }));
        }
        for (let c = 0; c < cols; c++) {
          out.push(tag({ type: "add_text", text: `Cell ${r + 1}.${c + 1}`, left: left + 28 + c * colW, top: ry + 14, fontSize: 12, fill: sub, name: `${groupName}/c-${r}-${c}` }));
        }
      }
      break;
    }
    case "dashboard": {
      const h = args.height ?? 380;
      out.push(tag({ type: "add_shape", shape: "rect", left, top, width, height: h, fill: "#f8fafc", rx: 20, name: `${groupName}/bg` }));
      out.push(tag({ type: "add_text", text: title, left: left + 24, top: top + 22, fontSize: 22, fontWeight: "700", fill: ink, name: `${groupName}/title` }));
      const cards = 4;
      const cardW = (width - 24 * (cards + 1)) / cards;
      for (let i = 0; i < cards; i++) {
        const cx = left + 24 + i * (cardW + 24);
        const cy = top + 70;
        out.push(tag({ type: "add_shape", shape: "rect", left: cx, top: cy, width: cardW, height: 110, fill: surface, stroke: muted, strokeWidth: 1, rx: 16, name: `${groupName}/stat-${i}` }));
        out.push(tag({ type: "add_text", text: ["Revenue", "Users", "Orders", "Growth"][i], left: cx + 16, top: cy + 16, fontSize: 12, fontWeight: "600", fill: sub, name: `${groupName}/stat-label-${i}` }));
        out.push(tag({ type: "add_text", text: ["৳1.2M", "8,420", "1,290", "+24%"][i], left: cx + 16, top: cy + 40, fontSize: 28, fontWeight: "800", fill: ink, name: `${groupName}/stat-value-${i}` }));
        out.push(tag({ type: "add_shape", shape: "rect", left: cx + 16, top: cy + 84, width: 40, height: 8, fill: accent, rx: 4, name: `${groupName}/stat-bar-${i}` }));
      }
      // Chart placeholder
      out.push(tag({ type: "add_shape", shape: "rect", left: left + 24, top: top + 200, width: width - 48, height: 160, fill: surface, stroke: muted, strokeWidth: 1, rx: 16, name: `${groupName}/chart` }));
      out.push(tag({ type: "add_text", text: "Performance trend", left: left + 40, top: top + 216, fontSize: 13, fontWeight: "600", fill: sub, name: `${groupName}/chart-title` }));
      // Bars
      const bars = 12;
      const barW = (width - 80) / bars - 6;
      for (let i = 0; i < bars; i++) {
        const bh = 20 + Math.round(80 * Math.abs(Math.sin(i * 0.7)));
        out.push(tag({ type: "add_shape", shape: "rect", left: left + 40 + i * (barW + 6), top: top + 340 - bh, width: barW, height: bh, fill: accent, rx: 4, name: `${groupName}/bar-${i}` }));
      }
      break;
    }
    case "stats": {
      const h = 130;
      const cards = Math.max(2, Math.min(args.cols ?? 4, 6));
      const cardW = (width - 16 * (cards - 1)) / cards;
      for (let i = 0; i < cards; i++) {
        const cx = left + i * (cardW + 16);
        out.push(tag({ type: "add_shape", shape: "rect", left: cx, top, width: cardW, height: h, fill: surface, stroke: muted, strokeWidth: 1, rx: 16, name: `${groupName}/stat-${i}` }));
        out.push(tag({ type: "add_text", text: `Metric ${i + 1}`, left: cx + 16, top: top + 18, fontSize: 12, fontWeight: "600", fill: sub, name: `${groupName}/label-${i}` }));
        out.push(tag({ type: "add_text", text: `${(i + 1) * 1234}`, left: cx + 16, top: top + 44, fontSize: 32, fontWeight: "800", fill: ink, name: `${groupName}/value-${i}` }));
        out.push(tag({ type: "add_shape", shape: "rect", left: cx + 16, top: top + 92, width: 60, height: 6, fill: accent, rx: 3, name: `${groupName}/bar-${i}` }));
      }
      break;
    }
    case "chart": {
      const h = args.height ?? 260;
      out.push(tag({ type: "add_shape", shape: "rect", left, top, width, height: h, fill: surface, stroke: muted, strokeWidth: 1, rx: 16, name: `${groupName}/bg` }));
      out.push(tag({ type: "add_text", text: title, left: left + 20, top: top + 18, fontSize: 16, fontWeight: "700", fill: ink, name: `${groupName}/title` }));
      const bars = 10;
      const barW = (width - 60) / bars - 8;
      for (let i = 0; i < bars; i++) {
        const bh = 30 + Math.round((h - 100) * Math.abs(Math.sin(i * 0.9 + 1)));
        out.push(tag({ type: "add_shape", shape: "rect", left: left + 30 + i * (barW + 8), top: top + h - 30 - bh, width: barW, height: bh, fill: accent, rx: 4, name: `${groupName}/bar-${i}` }));
      }
      break;
    }
    case "card": {
      const h = args.height ?? 220;
      out.push(tag({ type: "add_shape", shape: "rect", left, top, width: Math.min(width, 360), height: h, fill: surface, stroke: muted, strokeWidth: 1, rx: 20, name: `${groupName}/bg` }));
      out.push(tag({ type: "add_shape", shape: "rect", left: left + 20, top: top + 20, width: 56, height: 56, fill: accent, rx: 14, name: `${groupName}/icon` }));
      out.push(tag({ type: "add_text", text: title, left: left + 20, top: top + 96, fontSize: 20, fontWeight: "700", fill: ink, name: `${groupName}/title` }));
      out.push(tag({ type: "add_text", text: "Short supporting description goes right here.", left: left + 20, top: top + 130, fontSize: 14, fill: sub, name: `${groupName}/desc` }));
      out.push(tag({ type: "add_text", text: "Learn more →", left: left + 20, top: top + 174, fontSize: 13, fontWeight: "600", fill: accent, name: `${groupName}/cta` }));
      break;
    }
    case "footer": {
      const h = args.height ?? 140;
      out.push(tag({ type: "add_shape", shape: "rect", left, top, width, height: h, fill: "#0f172a", rx: 16, name: `${groupName}/bg` }));
      out.push(tag({ type: "add_text", text: title, left: left + 24, top: top + 24, fontSize: 16, fontWeight: "700", fill: "#ffffff", name: `${groupName}/title` }));
      out.push(tag({ type: "add_text", text: "© 2026 Your Company. All rights reserved.", left: left + 24, top: top + 56, fontSize: 12, fill: "#94a3b8", name: `${groupName}/copy` }));
      ["Privacy", "Terms", "Contact"].forEach((label, i) => {
        out.push(tag({ type: "add_text", text: label, left: left + width - 240 + i * 80, top: top + h / 2 - 6, fontSize: 12, fill: "#cbd5e1", name: `${groupName}/link-${i}` }));
      });
      break;
    }
    case "sidebar": {
      const w = Math.min(width, 260);
      const h = args.height ?? 480;
      out.push(tag({ type: "add_shape", shape: "rect", left, top, width: w, height: h, fill: surface, stroke: muted, strokeWidth: 1, rx: 20, name: `${groupName}/bg` }));
      out.push(tag({ type: "add_text", text: title, left: left + 20, top: top + 24, fontSize: 18, fontWeight: "700", fill: ink, name: `${groupName}/title` }));
      ["Dashboard", "Projects", "Tasks", "Team", "Reports", "Settings"].forEach((item, i) => {
        const iy = top + 70 + i * 50;
        if (i === 0) out.push(tag({ type: "add_shape", shape: "rect", left: left + 12, top: iy - 6, width: w - 24, height: 36, fill: accent + "22", rx: 10, name: `${groupName}/active` }));
        out.push(tag({ type: "add_shape", shape: "rect", left: left + 24, top: iy + 4, width: 16, height: 16, fill: i === 0 ? accent : sub, rx: 4, name: `${groupName}/icon-${i}` }));
        out.push(tag({ type: "add_text", text: item, left: left + 52, top: iy + 4, fontSize: 14, fontWeight: i === 0 ? "600" : "400", fill: i === 0 ? ink : sub, name: `${groupName}/item-${i}` }));
      });
      break;
    }
    default:
      out.push(tag({ type: "add_text", text: title, left, top, fontSize: 32, fontWeight: "700", fill: ink, name: groupName }));
  }
  return out;
}

function defaultTitle(kind: string): string {
  const map: Record<string, string> = {
    header: "Brand Name", hero: "Build something great",
    form: "Sign up", table: "Recent activity", dashboard: "Overview",
    card: "Featured", footer: "Stay in touch", sidebar: "Workspace",
    stats: "Key metrics", chart: "Performance",
  };
  return map[kind] || "Section";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { prompt, context, selectedImage, templates } = body as {
      prompt: string;
      context?: {
        canvasWidth?: number; canvasHeight?: number;
        background?: string;
        scope?: string | null;
        selectedType?: string | null;
        selectedSummary?: string | null;
        layers?: Array<{ id: string; name: string; type: string }>;
      };
      selectedImage?: string | null;
      templates?: Array<{ id: string; name: string; category: string }>;
    };

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cw = context?.canvasWidth ?? 1080;
    const ch = context?.canvasHeight ?? 1080;

    const ctxStr = [
      `Canvas: ${cw}x${ch}, background ${context?.background ?? "#ffffff"}.`,
      `Scope: ${context?.scope || "any"}.`,
      `Selected: ${context?.selectedSummary ?? "none"}.`,
      context?.layers?.length
        ? `Existing layers: ${context.layers.slice(0, 20).map((l) => `${l.name}(${l.type})`).join(", ")}.`
        : "No layers yet.",
      templates?.length
        ? `Available templates: ${templates.map((t) => `"${t.name}"(${t.category})[${t.id.slice(0, 8)}]`).join(", ")}.`
        : "No saved templates.",
    ].join("\n");

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
      console.error("planner error", planRes.status, await planRes.text());
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

    const actions: Action[] = [];
    for (const call of toolCalls) {
      const name = call.function?.name;
      let args: any = {};
      try { args = JSON.parse(call.function?.arguments || "{}"); } catch { /* ignore */ }

      if (name === "generate_image") {
        try {
          const url = await generateImage(args.prompt, apiKey);
          actions.push({ type: "add_image", imageUrl: url, width: args.width, height: args.height, name: "AI Image" });
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
      } else if (name === "generate_section") {
        const blueprint = blueprintSection(args, cw, ch);
        actions.push(...blueprint);
      } else if (name === "use_template") {
        actions.push({ type: "use_template", templateId: args.templateId, templateName: args.templateName, left: args.left, top: args.top });
      } else {
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
