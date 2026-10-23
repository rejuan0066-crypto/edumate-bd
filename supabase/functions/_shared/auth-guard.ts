// Shared auth/role guard for Lovable edge functions.
// Uses Supabase signing-keys (getClaims) to verify JWT and check has_role().

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export type GuardResult =
  | { ok: true; userId: string; email?: string; claims: any }
  | { ok: false; status: number; error: string };

/**
 * Validate a Bearer JWT and (optionally) require one of the given app_roles.
 * Returns 401 if the token is missing/invalid, 403 if the role check fails.
 */
export async function requireAuth(
  req: Request,
  opts: { roles?: Array<'super_admin' | 'admin' | 'staff' | 'teacher' | 'accounts'> } = {}
): Promise<GuardResult> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return { ok: false, status: 401, error: 'Unauthorized: missing bearer token' };
  }
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401, error: 'Unauthorized: empty token' };

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  let claims: any = null;
  // getClaims is missing in older supabase-js builds; fall back to getUser.
  try {
    const authAny = supabase.auth as any;
    if (typeof authAny.getClaims === 'function') {
      const { data, error } = await authAny.getClaims(token);
      if (!error && data?.claims) claims = data.claims;
    }
  } catch {
    // ignore, try getUser below
  }
  if (!claims) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) {
        return { ok: false, status: 401, error: 'Unauthorized: invalid token' };
      }
      claims = { sub: data.user.id, email: data.user.email, role: data.user.role };
    } catch {
      return { ok: false, status: 401, error: 'Unauthorized: token verification failed' };
    }
  }

  const userId = claims.sub as string;
  if (!userId) return { ok: false, status: 401, error: 'Unauthorized: no sub claim' };

  if (opts.roles && opts.roles.length > 0) {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    let hasRole = false;
    for (const role of opts.roles) {
      const { data, error } = await admin.rpc('has_role', { _user_id: userId, _role: role });
      if (!error && data === true) {
        hasRole = true;
        break;
      }
    }
    // super_admin always allowed
    if (!hasRole) {
      const { data } = await admin.rpc('has_role', { _user_id: userId, _role: 'super_admin' });
      if (data === true) hasRole = true;
    }
    if (!hasRole) {
      return { ok: false, status: 403, error: 'Forbidden: insufficient role' };
    }
  }

  return { ok: true, userId, email: claims.email, claims };
}

export function unauthorized(status: number, error: string, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
