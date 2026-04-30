// Validate file upload — magic byte check + MIME + size enforcement
// Call from frontend BEFORE uploading to Supabase Storage.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

// Magic bytes (file signature) for common allowed types
const SIGNATURES: Record<string, { mimes: string[]; bytes: number[][] }> = {
  jpeg: { mimes: ["image/jpeg", "image/jpg"], bytes: [[0xFF, 0xD8, 0xFF]] },
  png:  { mimes: ["image/png"],  bytes: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]] },
  gif:  { mimes: ["image/gif"],  bytes: [[0x47, 0x49, 0x46, 0x38]] },
  webp: { mimes: ["image/webp"], bytes: [[0x52, 0x49, 0x46, 0x46]] }, // RIFF (webp specific check at offset 8)
  pdf:  { mimes: ["application/pdf"], bytes: [[0x25, 0x50, 0x44, 0x46]] },
  zip:  { mimes: ["application/zip","application/x-zip-compressed","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.presentationml.presentation"], bytes: [[0x50, 0x4B, 0x03, 0x04],[0x50, 0x4B, 0x05, 0x06]] },
};

function matchesSignature(buf: Uint8Array, declaredMime: string): { ok: boolean; detected?: string } {
  for (const [name, def] of Object.entries(SIGNATURES)) {
    if (!def.mimes.includes(declaredMime.toLowerCase())) continue;
    for (const sig of def.bytes) {
      let match = true;
      for (let i = 0; i < sig.length; i++) if (buf[i] !== sig[i]) { match = false; break; }
      if (match) {
        // extra webp check
        if (name === "webp") {
          const tail = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]);
          if (tail !== "WEBP") continue;
        }
        return { ok: true, detected: name };
      }
    }
  }
  return { ok: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ ok: false, code: "NO_FILE", message: "ফাইল পাওয়া যায়নি" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ ok: false, code: "TOO_LARGE", message: `ফাইল সাইজ ${MAX_SIZE / 1024 / 1024}MB-এর বেশি হতে পারবে না` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ALLOWED = Object.values(SIGNATURES).flatMap((s) => s.mimes);
    if (!ALLOWED.includes(file.type.toLowerCase())) {
      return new Response(JSON.stringify({ ok: false, code: "INVALID_MIME", message: `অনুমোদিত ফাইল টাইপ নয়: ${file.type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Read first 16 bytes for magic byte check
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const result = matchesSignature(head, file.type);
    if (!result.ok) {
      return new Response(JSON.stringify({
        ok: false, code: "MAGIC_BYTE_MISMATCH",
        message: "ফাইলের প্রকৃত কন্টেন্ট ও MIME টাইপ মিলছে না — সম্ভাব্য ক্ষতিকর ফাইল",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      ok: true, detected: result.detected, mime: file.type, size: file.size,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, code: "ERROR", message: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
