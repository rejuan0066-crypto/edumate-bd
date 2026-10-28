// Shared email template loader & renderer
// Loads template from email_templates table and substitutes {{variables}}
// Auto-injects institution/branding info from website_settings

export interface RenderedEmail {
  subject: string;
  html: string;
  template_key: string;
  used_db_template: boolean;
}

function escapeHtmlValue(v: string): string {
  return v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function substitute(template: string, vars: Record<string, string | number>, html = false): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const v = vars[key];
    if (v === undefined || v === null) return "";
    const s = String(v);
    return html ? escapeHtmlValue(s) : s;
  });
}

// Cache institution info per invocation to avoid repeated DB calls
let _institutionCache: Record<string, string> | null = null;

export async function loadInstitutionInfo(supabase: any): Promise<Record<string, string>> {
  if (_institutionCache) return _institutionCache;

  const keys = [
    "institution_name", "institution_name_en",
    "madrasah_name", "madrasah_name_bn", "madrasah_address",
    "madrasah_phone", "madrasah_email",
    "address", "phone", "email",
    "logo_url", "loader_logo_url",
    "principal_name", "principal_name_en",
    "website_url", "facebook_url",
  ];

  const out: Record<string, string> = {};
  try {
    const [{ data }, { data: instRow }] = await Promise.all([
      supabase.from("website_settings").select("key, value").in("key", keys),
      supabase.from("institutions")
        .select("principal_name, accountant_name, verifier_name, name, name_en, address, phone, email, logo_url")
        .eq("is_default", true).maybeSingle(),
    ]);

    if (data) {
      for (const row of data) {
        const v = row.value;
        out[row.key] = typeof v === "string" ? v : (v == null ? "" : String(v));
      }
    }

    // institutions table overrides website_settings when populated
    if (instRow) {
      const ov = (k: string, v: any) => { const s = v != null ? String(v).trim() : ""; if (s) out[k] = s; };
      ov("principal_name", (instRow as any).principal_name);
      ov("accountant_name", (instRow as any).accountant_name);
      ov("verifier_name", (instRow as any).verifier_name);
    }
  } catch (e) {
    console.error("loadInstitutionInfo failed:", e);
  }

  // Build canonical aliases used in templates
  const nameBn = out.institution_name || out.madrasah_name_bn || out.madrasah_name || "মাদরাসা";
  const nameEn = out.institution_name_en || out.madrasah_name || "Madrasah";
  const address = out.madrasah_address || out.address || "";
  const phone = out.madrasah_phone || out.phone || "";
  const email = out.madrasah_email || out.email || "";
  const logoUrl = out.logo_url || out.loader_logo_url || "";

  _institutionCache = {
    ...out,
    institutionName: nameBn,
    institutionNameEn: nameEn,
    institutionNameBn: nameBn,
    institutionAddress: address,
    institutionPhone: phone,
    institutionEmail: email,
    institutionLogo: logoUrl,
    institutionWebsite: out.website_url || "",
    principalName: out.principal_name || "",
    appName: nameBn,
    // snake_case aliases too
    institution_name: nameBn,
    institution_name_en: nameEn,
    institution_address: address,
    institution_phone: phone,
    institution_email: email,
    institution_logo: logoUrl,
    institution_website: out.website_url || "",
    principal_name: out.principal_name || "",
    app_name: nameBn,
  };

  return _institutionCache;
}

export async function renderEmailTemplate(
  supabase: any,
  templateKey: string,
  variables: Record<string, string | number>,
  fallback?: { subject: string; html: string }
): Promise<RenderedEmail> {
  // Auto-load institution info and merge — caller variables win
  const institution = await loadInstitutionInfo(supabase);

  const defaults: Record<string, string | number> = {
    year: new Date().getFullYear(),
    brand_color: "#10b981",
    brandColor: "#10b981",
    ...institution,
    ...variables,
  };

  // Ensure brand_color/brandColor are mirrored
  if (variables.brand_color && !variables.brandColor) defaults.brandColor = variables.brand_color;
  if (variables.brandColor && !variables.brand_color) defaults.brand_color = variables.brandColor;

  try {
    const { data, error } = await supabase
      .from("email_templates")
      .select("subject, html_body, is_enabled")
      .eq("template_key", templateKey)
      .maybeSingle();

    if (!error && data && data.is_enabled !== false) {
      return {
        subject: substitute(data.subject, defaults),
        html: substitute(data.html_body, defaults, true),
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
      html: substitute(fallback.html, defaults, true),
      template_key: templateKey,
      used_db_template: false,
    };
  }

  throw new Error(`No template available for key: ${templateKey}`);
}
