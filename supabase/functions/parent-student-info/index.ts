// Returns student profile + attendance for parent portal (service role bypass)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { account_id, student_uuid } = await req.json();
    if (!account_id || !student_uuid) {
      return new Response(JSON.stringify({ error: 'Missing params' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the parent account is approved and linked to this student
    const { data: acc } = await supabase
      .from('parent_accounts')
      .select('id, status, linked_student_uuid')
      .eq('id', account_id)
      .maybeSingle();

    if (!acc || acc.status !== 'approved' || acc.linked_student_uuid !== student_uuid) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('*, classes(name, name_bn), academic_sessions(name, name_bn)')
      .eq('id', student_uuid)
      .maybeSingle();

    if (sErr) {
      return new Response(JSON.stringify({ error: sErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ student }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
