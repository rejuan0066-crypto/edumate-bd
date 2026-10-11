import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth, unauthorized } from "../_shared/auth-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const guard = await requireAuth(req, { roles: ['admin', 'staff', 'teacher'] });
  if (!guard.ok) return unauthorized(guard.status, guard.error, corsHeaders);

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("GEMINI_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ 
        error: "AI API Key is not configured on the server. Please paste text directly using the Text Import tab." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image_base64, text_content } = await req.json();
    if (!image_base64 && !text_content) {
      return new Response(JSON.stringify({ error: "image_base64 or text_content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert exam question OCR and parsing system specialized in extracting questions from exam/question papers in Bengali (বাংলা), Arabic (العربية), and English.

Your task:
1. Extract each question from the image or text.
2. For each question, extract:
   - question_text: The main question statement (in original script/language).
   - question_type: 'mcq' if it has multiple choice options (like (i), (ii), (iii) or (ক), (খ), (গ), (ঘ) or (A), (B), (C)), otherwise 'descriptive' or 'short'.
   - custom_label: The question serial or prefix if present (e.g. '(ক)', '(খ)', '১.', '1.', 'Q1.').
   - marks: Numeric marks (e.g. 1, 5, 10). If not visible, return 1 for MCQ or 5 for descriptive.
   - options: For MCQ questions, an array of options with 'label' (e.g. '(i)', '(ii)', '(iii)', '(ক)', '(খ)', '(A)') and 'text' (the option content).
3. Preserve the original language and script (Bengali, Arabic, English) accurately.
4. Support 2, 3, or 4 options for MCQs (e.g. (i) ১১ টি (ii) ১৩ টি (iii) ১৪ টি).
5. Return data using the extract_questions tool.`;

    const userMessageContent: any[] = [];
    if (image_base64) {
      userMessageContent.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${image_base64}` },
      });
      userMessageContent.push({
        type: "text",
        text: "Extract all questions, their numbering/labels, MCQ options, and marks from this question paper image.",
      });
    } else if (text_content) {
      userMessageContent.push({
        type: "text",
        text: `Extract all questions, labels, options, and marks from this text:\n\n${text_content}`,
      });
    }

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
          { role: "user", content: userMessageContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_questions",
              description: "Extract questions, labels, types, options, and marks from a question paper",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        custom_label: { type: "string", description: "Question serial e.g. (ক), ১., 1." },
                        question_text: { type: "string", description: "The question statement in its original language/script" },
                        question_type: { 
                          type: "string", 
                          enum: ["mcq", "descriptive", "short", "fill_blank", "true_false"],
                          description: "Type of question"
                        },
                        marks: { type: "number", description: "Marks allocated, 0 if not specified" },
                        options: {
                          type: "array",
                          description: "MCQ options if applicable",
                          items: {
                            type: "object",
                            properties: {
                              label: { type: "string", description: "Option prefix e.g. (i), (ii), (ক), A." },
                              text: { type: "string", description: "Option text" }
                            },
                            required: ["label", "text"],
                            additionalProperties: false,
                          }
                        }
                      },
                      required: ["question_text", "question_type"],
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
        tool_choice: { type: "function", function: { name: "extract_questions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "অনুরোধের সীমা অতিক্রম করেছে। কিছুক্ষণ পর আবার চেষ্টা করুন।" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI স্ক্যান ক্রেডিট শেষ হয়েছে। আপনি সরাসরি টেক্সট পেস্ট করে প্রশ্ন যোগ করতে পারেন।" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI প্রক্রিয়াকরণ সাময়িক ব্যর্থ হয়েছে। অনুগ্রহ করে টেক্সট পেস্ট ট্যাব ব্যবহার করুন।" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    console.error("scan-questions error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "অপ্রত্যাশিত ত্রুটি ঘটেছে। সরাসরি টেক্সট পেস্ট করুন।" 
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
