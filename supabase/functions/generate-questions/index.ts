import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth, unauthorized } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // AUTHZ: only admin/staff/teacher can consume AI credits
  const guard = await requireAuth(req, { roles: ['admin', 'staff', 'teacher'] });
  if (!guard.ok) return unauthorized(guard.status, guard.error, corsHeaders);

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const raw = await req.json();
    const cleanLabel = (v: unknown) => typeof v === "string"
      ? v.replace(/[\r\n\t`"{}<>\[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80)
      : "";
    const clampCount = (v: unknown, d: number) => {
      const n = Math.floor(Number(v));
      return Number.isFinite(n) ? Math.min(Math.max(n, 0), 50) : d;
    };
    const parsed = {
      syllabus: typeof raw?.syllabus === "string" ? raw.syllabus.slice(0, 20000) : raw?.syllabus,
      subject: cleanLabel(raw?.subject),
      class_name: cleanLabel(raw?.class_name),
      language: ["bn", "en", "ar"].includes(raw?.language) ? raw.language : "bn",
      question_type: ["mcq", "cq", "short", "descriptive", "mixed"].includes(raw?.question_type) ? raw.question_type : "mixed",
      mcq_count: clampCount(raw?.mcq_count ?? 5, 5),
      short_count: clampCount(raw?.short_count ?? 3, 3),
      cq_count: clampCount(raw?.cq_count ?? 2, 2),
      descriptive_count: clampCount(raw?.descriptive_count ?? 0, 0),
      difficulty: ["easy", "medium", "hard", "mixed"].includes(raw?.difficulty) ? raw.difficulty : "medium",
    };
    const {
      syllabus,
      subject,
      class_name,
      language: lang = "bn",
      question_type = "mixed", // mcq | cq | short | descriptive | mixed
      mcq_count = 5,
      short_count = 3,
      cq_count = 2,
      descriptive_count = 0,
      difficulty = "medium", // easy | medium | hard | mixed
    } = parsed;

    if (!syllabus || typeof syllabus !== "string" || syllabus.trim().length < 5) {
      return new Response(JSON.stringify({ error: "syllabus (topic/text) is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langInstruction = lang === "ar"
      ? "Generate ALL questions in Arabic (العربية)."
      : lang === "en"
        ? "Generate ALL questions in English."
        : "Generate ALL questions in Bengali (বাংলা). Use Bengali digits where appropriate.";

    const systemPrompt = `You are an expert exam paper setter for Bangladeshi madrasah and school curriculums. You generate high-quality, syllabus-aligned questions.

${langInstruction}

Difficulty: ${difficulty}.
${subject ? `Subject: ${subject}.` : ""}
${class_name ? `Class/Level: ${class_name}.` : ""}

Rules:
- For MCQ: Provide exactly 4 distinct options. Mark exactly ONE as correct.
- For CQ (Creative Question): Provide a stimulus/passage (uddipok) and 4 sub-questions labeled (ক), (খ), (গ), (ঘ) with marks 1, 2, 3, 4 respectively.
- For Short questions: Concise, single-concept questions worth 2-3 marks each.
- For Descriptive: Broader analytical questions worth 5-10 marks each.
- Marks must be sensible integers.
- Do NOT repeat questions. Cover different facets of the syllabus.
- Use the extract_questions tool to return structured data.`;

    const userPrompt = `Syllabus / Topic:
"""
${syllabus}
"""

Generate:
- ${mcq_count} MCQ questions (1 mark each)
- ${short_count} Short questions (2-3 marks each)
- ${cq_count} Creative (CQ) questions (10 marks each, with stimulus + 4 sub-parts)
- ${descriptive_count} Descriptive questions (5-10 marks each)

Total questions: ${mcq_count + short_count + cq_count + descriptive_count}.
Return strictly via the generate_questions tool.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_questions",
              description: "Return a structured set of generated exam questions",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_type: {
                          type: "string",
                          enum: ["mcq", "short", "cq", "descriptive"],
                          description: "Type of question",
                        },
                        text: {
                          type: "string",
                          description: "Full question text in target language. For CQ include stimulus + sub-parts (ক/খ/গ/ঘ).",
                        },
                        marks: {
                          type: "number",
                          description: "Marks (e.g., 1 for MCQ, 10 for CQ)",
                        },
                        options: {
                          type: "array",
                          description: "Only for MCQ. Exactly 4 options.",
                          items: {
                            type: "object",
                            properties: {
                              text: { type: "string" },
                              is_correct: { type: "boolean" },
                            },
                            required: ["text", "is_correct"],
                            additionalProperties: false,
                          },
                        },
                        answer: {
                          type: "string",
                          description: "Suggested answer or answer key (optional, brief).",
                        },
                      },
                      required: ["question_type", "text", "marks"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_questions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured data returned from AI");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ questions: parsed.questions || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
