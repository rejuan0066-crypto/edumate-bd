// Shared password policy enforcement + security event logger
// Used by edge functions: manage-users, reset-password, change-password, verify-otp

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

export interface PasswordPolicy {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_number: boolean;
  require_special: boolean;
  block_leaked_passwords: boolean;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  min_length: 8,
  require_uppercase: true,
  require_lowercase: true,
  require_number: true,
  require_special: true,
  block_leaked_passwords: true,
};

const RULE_MESSAGES: Record<string, { bn: string; en: string }> = {
  min_length: { bn: 'কমপক্ষে নির্দিষ্ট সংখ্যক অক্ষর', en: 'minimum length' },
  uppercase: { bn: 'একটি বড় হাতের অক্ষর (A-Z)', en: 'one uppercase letter (A-Z)' },
  lowercase: { bn: 'একটি ছোট হাতের অক্ষর (a-z)', en: 'one lowercase letter (a-z)' },
  number: { bn: 'একটি সংখ্যা (0-9)', en: 'one number (0-9)' },
  special: { bn: 'একটি বিশেষ চিহ্ন (!@#$...)', en: 'one special character (!@#$...)' },
  english_only: { bn: 'শুধুমাত্র ইংরেজি অক্ষর', en: 'English characters only' },
};

export async function loadPasswordPolicy(supabaseAdmin: any): Promise<PasswordPolicy> {
  try {
    const { data } = await supabaseAdmin
      .from('password_policy')
      .select('min_length, require_uppercase, require_lowercase, require_number, require_special, block_leaked_passwords')
      .eq('id', 1)
      .maybeSingle();
    if (!data) return DEFAULT_PASSWORD_POLICY;
    return {
      min_length: data.min_length ?? DEFAULT_PASSWORD_POLICY.min_length,
      require_uppercase: data.require_uppercase ?? DEFAULT_PASSWORD_POLICY.require_uppercase,
      require_lowercase: data.require_lowercase ?? DEFAULT_PASSWORD_POLICY.require_lowercase,
      require_number: data.require_number ?? DEFAULT_PASSWORD_POLICY.require_number,
      require_special: data.require_special ?? DEFAULT_PASSWORD_POLICY.require_special,
      block_leaked_passwords: data.block_leaked_passwords ?? DEFAULT_PASSWORD_POLICY.block_leaked_passwords,
    };
  } catch {
    return DEFAULT_PASSWORD_POLICY;
  }
}

export function evaluatePasswordAgainstPolicy(password: string, policy: PasswordPolicy): string[] {
  const failed: string[] = [];
  if (!password || password.length < policy.min_length) failed.push('min_length');
  if (policy.require_uppercase && !/[A-Z]/.test(password)) failed.push('uppercase');
  if (policy.require_lowercase && !/[a-z]/.test(password)) failed.push('lowercase');
  if (policy.require_number && !/[0-9]/.test(password)) failed.push('number');
  if (policy.require_special && !/[^A-Za-z0-9]/.test(password)) failed.push('special');
  if (!/^[\x21-\x7E]*$/.test(password)) failed.push('english_only');
  return failed;
}

export function buildPasswordError(failed: string[], policy: PasswordPolicy): { error: string; message: string; message_bn: string; failed_rules: string[]; policy: PasswordPolicy } {
  const enParts = failed.map(f => f === 'min_length' ? `at least ${policy.min_length} characters` : RULE_MESSAGES[f]?.en || f);
  const bnParts = failed.map(f => f === 'min_length' ? `কমপক্ষে ${policy.min_length} অক্ষর` : RULE_MESSAGES[f]?.bn || f);
  return {
    error: `Password must include: ${enParts.join(', ')}`,
    message: `Password must include: ${enParts.join(', ')}`,
    message_bn: `পাসওয়ার্ডে থাকতে হবে: ${bnParts.join(', ')}`,
    failed_rules: failed,
    policy,
  };
}

/**
 * Validates a password and returns null if OK, or a { status, body } error response payload.
 * Caller wraps it into a Response.
 */
export async function enforcePasswordPolicy(
  supabaseAdmin: any,
  password: string,
): Promise<{ ok: true; policy: PasswordPolicy } | { ok: false; status: number; body: any }> {
  const policy = await loadPasswordPolicy(supabaseAdmin);
  const failed = evaluatePasswordAgainstPolicy(password, policy);
  if (failed.length > 0) {
    return { ok: false, status: 400, body: { ok: false, code: 'WEAK_PASSWORD', ...buildPasswordError(failed, policy) } };
  }
  return { ok: true, policy };
}

export interface SecurityEventInput {
  event_type: string;
  severity?: 'info' | 'warning' | 'critical';
  user_id?: string | null;
  target_user_id?: string | null;
  email?: string | null;
  reason?: string | null;
  details?: Record<string, unknown> | null;
  req?: Request;
}

export async function logSecurityEvent(supabaseAdmin: any, e: SecurityEventInput): Promise<void> {
  try {
    const ip =
      e.req?.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      e.req?.headers.get('cf-connecting-ip') ||
      e.req?.headers.get('x-real-ip') ||
      null;
    const ua = e.req?.headers.get('user-agent') || null;
    await supabaseAdmin.from('security_events').insert({
      event_type: e.event_type,
      severity: e.severity || 'info',
      user_id: e.user_id || null,
      target_user_id: e.target_user_id || null,
      email: e.email || null,
      reason: e.reason || null,
      details: e.details || null,
      ip_address: ip,
      user_agent: ua,
    });
  } catch (err) {
    console.error('logSecurityEvent failed:', err);
  }
}

export function makeAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, serviceRoleKey);
}
