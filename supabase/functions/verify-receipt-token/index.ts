// Public backend endpoint that validates a signed QR receipt token
// and returns the current receipt status. Rate-limited per IP, with
// optional admin-detail mode when the caller presents a valid JWT.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  });

// Token format guard — base64url-ish, 16-128 chars. Cheap pre-validation
// avoids hitting the DB for obviously-bogus tokens.
const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/;

const getIp = (req: Request) => {
  const fwd = req.headers.get('x-forwarded-for') || '';
  return fwd.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'unknown';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Pull token from query (GET) or body (POST)
    let token = '';
    let mode: 'public' | 'admin' = 'public';

    if (req.method === 'GET') {
      const u = new URL(req.url);
      token = (u.searchParams.get('token') || '').trim();
      mode = u.searchParams.get('mode') === 'admin' ? 'admin' : 'public';
    } else if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      token = String(body?.token || '').trim();
      mode = body?.mode === 'admin' ? 'admin' : 'public';
    } else {
      return json({ valid: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }

    if (!token || !TOKEN_RE.test(token)) {
      return json({ valid: false, error: 'INVALID_TOKEN_FORMAT' }, 400);
    }

    // Per-IP rate limit (10 verifications / minute) using existing infra
    const ip = getIp(req);
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: rl } = await admin.rpc('check_rate_limit', {
      _action: 'verify_receipt_token',
      _identifier: ip,
      _max_attempts: 10,
      _window_minutes: 1,
    });
    if (rl && (rl as any).allowed === false) {
      const retryAfter = Number((rl as any).retry_after_seconds || 60);
      return json(
        { valid: false, error: 'RATE_LIMITED', retry_after_seconds: retryAfter },
        429,
        { 'Retry-After': String(retryAfter) },
      );
    }

    // For admin mode, run the RPC as the caller so RLS / role checks apply.
    if (mode === 'admin') {
      const authHeader = req.headers.get('Authorization') || '';
      if (!authHeader) return json({ valid: false, error: 'UNAUTHENTICATED' }, 401);

      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await userClient.rpc('verify_receipt_admin', { _token: token });
      if (error) return json({ valid: false, error: error.message }, 400);
      return json(data ?? { valid: false, error: 'EMPTY' });
    }

    // Public verification — service role bypasses RLS, RPC returns minimal fields.
    const { data, error } = await admin.rpc('verify_receipt_public', { _token: token });
    if (error) return json({ valid: false, error: error.message }, 400);
    return json(data ?? { valid: false, error: 'EMPTY' });
  } catch (e) {
    console.error('verify-receipt-token error', e);
    return json({ valid: false, error: 'INTERNAL_ERROR' }, 500);
  }
});
