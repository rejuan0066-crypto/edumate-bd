// Shared email template loader & renderer
// Loads template from email_templates table and substitutes {{variables}}

export interface RenderedEmail {
  subject: string;
  html: string;
  template_key: string;
  used_db_template: boolean;
}

function substitute(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

export async function renderEmailTemplate(
  supabase: any,
  templateKey: string,
  variables: Record<string, string | number>,
  fallback?: { subject: string; html: string }
): Promise<RenderedEmail> {
  const defaults = {
    year: new Date().getFullYear(),
    institution_name: variables.institution_name || "Subhani Madrasah",
    brand_color: variables.brand_color || "#10b981",
    ...variables,
  };

  try {
    const { data, error } = await supabase
      .from("email_templates")
      .select("subject, html_body, is_enabled")
      .eq("template_key", templateKey)
      .maybeSingle();

    if (!error && data && data.is_enabled !== false) {
      return {
        subject: substitute(data.subject, defaults),
        html: substitute(data.html_body, defaults),
        template_key: templateKey,
        used_db_template: true,
      };
    }
  } catch (e) {
    console.error(`Template load failed for ${templateKey}:`, e);
  }

  if (fallback) {
    return {
      subject: substitute(fallback.subject, defaults),
      html: substitute(fallback.html, defaults),
      template_key: templateKey,
      used_db_template: false,
    };
  }

  throw new Error(`No template available for key: ${templateKey}`);
}
