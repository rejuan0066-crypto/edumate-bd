import { supabase } from "@/integrations/supabase/client";

export interface ValidationResult {
  ok: boolean;
  code?: string;
  message?: string;
  detected?: string;
}

/**
 * Validates a file via the edge function (magic byte + MIME + size check).
 * Call BEFORE uploading to Supabase Storage.
 *
 * Allowed: JPG/PNG/GIF/WEBP/PDF/ZIP (incl. office docx/xlsx/pptx)
 * Max size: 20MB
 */
export async function validateFileUpload(file: File): Promise<ValidationResult> {
  try {
    const form = new FormData();
    form.append("file", file);

    const { data: { session } } = await supabase.auth.getSession();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-file-upload`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: form,
    });
    const json = await res.json();
    return json as ValidationResult;
  } catch (e) {
    return {
      ok: false,
      code: "NETWORK",
      message: e instanceof Error ? e.message : "ফাইল ভ্যালিডেশন ব্যর্থ",
    };
  }
}
