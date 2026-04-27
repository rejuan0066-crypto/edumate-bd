// Resolve the best SMTP profile for a given purpose.
// Lookup order:
//   1) An enabled profile whose purpose matches the requested purpose, highest priority first.
//   2) An enabled profile with purpose = 'all' (default/fallback), highest priority first.
//   3) null if nothing is enabled.
//
// Returns the full smtp_config row plus a `resolved_via` field for diagnostics.

// deno-lint-ignore-file no-explicit-any

export type SmtpPurpose =
  | "all"
  | "otp"
  | "welcome"
  | "notice"
  | "bulk"
  | "transactional"
  | "auth";

export interface SmtpProfile {
  id: string;
  name: string;
  purpose: SmtpPurpose | string;
  priority: number;
  is_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  resolved_via: "purpose_match" | "fallback_all";
}

export async function resolveSmtpProfile(
  supabase: any,
  purpose: SmtpPurpose | string,
): Promise<SmtpProfile | null> {
  // 1) Exact purpose match
  if (purpose && purpose !== "all") {
    const { data: matched } = await supabase
      .from("smtp_config")
      .select("*")
      .eq("is_enabled", true)
      .eq("purpose", purpose)
      .order("priority", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (matched) {
      return { ...matched, resolved_via: "purpose_match" };
    }
  }

  // 2) Fallback to 'all' default
  const { data: fallback } = await supabase
    .from("smtp_config")
    .select("*")
    .eq("is_enabled", true)
    .eq("purpose", "all")
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallback) {
    return { ...fallback, resolved_via: "fallback_all" };
  }

  // 3) Last-resort: any enabled profile (preserves backward compat with old single-row setup)
  const { data: any } = await supabase
    .from("smtp_config")
    .select("*")
    .eq("is_enabled", true)
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (any) {
    return { ...any, resolved_via: "fallback_all" };
  }

  return null;
}
