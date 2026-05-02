// Returns student profile(s) for parent portal (service role bypass)
// Supports two modes:
//   - { account_id, student_uuid } -> returns single student detail
//   - { account_id, list: true }   -> returns list of all linked students (lite info)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireParentSession } from '../_shared/cron-guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { account_id, student_uuid, list, session_token } = await req.json();
    if (!account_id) return jsonResp({ error: 'Missing account_id' }, 400);

    // AUTHZ: validate parent session token
    const sessionOk = await requireParentSession(account_id, session_token);
    if (!sessionOk) return jsonResp({ error: 'Unauthorized: invalid session' }, 401);

    // Verify the parent account is approved
    const { data: acc } = await supabase
      .from('parent_accounts')
      .select('id, status, linked_student_uuid, linked_student_uuids, nid, phone')
      .eq('id', account_id)
      .maybeSingle();

    if (!acc || acc.status !== 'approved') {
      return jsonResp({ error: 'Unauthorized' }, 403);
    }

    // Live refresh links so newly admitted students appear immediately
    let allowed: string[] = [];
    try {
      const { data: refreshed } = await supabase.rpc('refresh_parent_student_links', {
        p_account_id: account_id,
      });
      allowed = (refreshed as string[]) || [];
    } catch {
      allowed = (acc.linked_student_uuids as string[]) || (acc.linked_student_uuid ? [acc.linked_student_uuid] : []);
    }
    if (allowed.length === 0 && acc.linked_student_uuid) allowed = [acc.linked_student_uuid];

    if (list) {
      if (allowed.length === 0) return jsonResp({ students: [] });
      const { data: students, error } = await supabase
        .from('students')
        .select('id, student_id, name_bn, name_en, photo_url, classes(name, name_bn), academic_sessions(name, name_bn)')
        .in('id', allowed)
        .is('deleted_at', null);
      if (error) return jsonResp({ error: error.message }, 500);
      return jsonResp({ students: students || [] });
    }

    if (!student_uuid) return jsonResp({ error: 'Missing student_uuid' }, 400);
    if (!allowed.includes(student_uuid)) {
      return jsonResp({ error: 'Unauthorized for this student' }, 403);
    }

    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('*, classes(name, name_bn), academic_sessions(name, name_bn)')
      .eq('id', student_uuid)
      .maybeSingle();

    if (sErr) return jsonResp({ error: sErr.message }, 500);
    return jsonResp({ student, linked_count: allowed.length });
  } catch (err) {
    return jsonResp({ error: (err as Error).message }, 500);
  }
});
