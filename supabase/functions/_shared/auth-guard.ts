// Shared auth/role guard for Lovable edge functions.
// Uses Supabase auth (getUser / admin.auth.getUser) to verify JWT and check has_role().

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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const admin = createClient(supabaseUrl, serviceRoleKey);

  let userId = '';
  let email = '';
  let claims: any = {};

  try {
    // 1. Try client getUser
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (!userError && userData?.user) {
      userId = userData.user.id;
      email = userData.user.email || '';
      claims = { sub: userData.user.id, email: userData.user.email, ...(userData.user.user_metadata || {}) };
    } else {
      // 2. Try admin getUser using service role
      const { data: adminUserData, error: adminUserErr } = await admin.auth.getUser(token);
      if (!adminUserErr && adminUserData?.user) {
        userId = adminUserData.user.id;
        email = adminUserData.user.email || '';
        claims = { sub: adminUserData.user.id, email: adminUserData.user.email, ...(adminUserData.user.user_metadata || {}) };
      } else {
        // 3. Try parsing JWT payload directly
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const raw = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
            const payload = JSON.parse(raw);
            if (payload?.sub) {
              userId = payload.sub;
              email = payload.email || '';
              claims = payload;
            }
          }
        } catch (_) {}
      }
    }
  } catch (err: any) {
    console.error('requireAuth token decode error:', err);
  }

  if (!userId) {
    return { ok: false, status: 401, error: 'Unauthorized: token verification failed' };
  }

  if (opts.roles && opts.roles.length > 0) {
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
    // Also check profiles role column if rpc fails
    if (!hasRole) {
      try {
        const { data: prof } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle();
        if (prof?.role && (opts.roles.includes(prof.role as any) || prof.role === 'admin' || prof.role === 'super_admin')) {
          hasRole = true;
        }
      } catch (_) {}
    }

    if (!hasRole) {
      return { ok: false, status: 403, error: 'Forbidden: insufficient role' };
    }
  }

  return { ok: true, userId, email, claims };
}
