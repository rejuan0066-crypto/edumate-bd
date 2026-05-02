// Shared guard for cron-only edge functions.
// Authorizes if either: (a) x-cron-secret header matches stored secret,
// or (b) caller bearer JWT belongs to a super_admin / admin user.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export type CronGuardResult =
  | { ok: true; via: 'cron' | 'admin'; userId?: string }
  | { ok: false; status: number; error: string };

export async function requireCronOrAdmin(
  req: Request,
  opts: { secretKey?: string; roles?: Array<'super_admin' | 'admin'> } = {}
): Promise<CronGuardResult> {
  const secretKey = opts.secretKey || 'backup_cron_secret';
  const roles = opts.roles || ['super_admin', 'admin'];

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  // 1) cron secret check
  const cronHeader = req.headers.get('x-cron-secret') || '';
  if (cronHeader) {
    try {
      const { data } = await admin
        .from('app_settings')
        .select('value')
        .eq('key', secretKey)
        .maybeSingle();
      const stored = data?.value ? String(data.value).replace(/^"|"$/g, '') : '';
      if (stored && cronHeader === stored) {
        return { ok: true, via: 'cron' };
      }
    } catch { /* ignore */ }
  }

  // 2) admin JWT check
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    try {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: claimsData, error } = await userClient.auth.getClaims(token);
      if (!error && claimsData?.claims?.sub) {
        const uid = claimsData.claims.sub as string;
        for (const role of roles) {
          const { data: ok } = await admin.rpc('has_role', { _user_id: uid, _role: role });
          if (ok === true) return { ok: true, via: 'admin', userId: uid };
        }
      }
    } catch { /* ignore */ }
  }

  return { ok: false, status: 401, error: 'Unauthorized' };
}

// Validates parent_accounts session_token for parent portal edge functions.
export async function requireParentSession(
  account_id: string,
  session_token: string
): Promise<boolean> {
  if (!account_id || !session_token) return false;
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
  try {
    const { data, error } = await admin.rpc('validate_parent_session', {
      p_account_id: account_id,
      p_session_token: session_token,
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}
