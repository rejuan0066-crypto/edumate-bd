// Parent fee payment: gateway proxy + manual TrxID fallback
// Actions:
//   - initiate_gateway: { account_id, student_uuid, amount, fee_assignment_ids[], return_url }
//   - submit_manual:    { account_id, student_uuid, amount, fee_assignment_ids[], method, trx_id, sender_phone, note }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function jsonResp(d: unknown, status = 200) {
  return new Response(JSON.stringify(d), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function verifyParentForStudent(account_id: string, student_uuid: string) {
  const { data: acc } = await supabase
    .from('parent_accounts')
    .select('id, status, linked_student_uuids, linked_student_uuid')
    .eq('id', account_id)
    .maybeSingle();
  if (!acc || acc.status !== 'approved') return null;
  const allowed: string[] = (acc.linked_student_uuids as string[]) ||
    (acc.linked_student_uuid ? [acc.linked_student_uuid] : []);
  if (!allowed.includes(student_uuid)) return null;
  return acc;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { action, account_id, student_uuid, amount, fee_assignment_ids } = body;

    if (!action || !account_id || !student_uuid) {
      return jsonResp({ error: 'Missing required params' }, 400);
    }

    const acc = await verifyParentForStudent(account_id, student_uuid);
    if (!acc) return jsonResp({ error: 'Unauthorized' }, 403);

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return jsonResp({ error: 'Invalid amount' }, 400);
    }

    if (action === 'submit_manual') {
      const { method, trx_id, sender_phone, note } = body;
      if (!method || !trx_id) {
        return jsonResp({ error: 'Method ও TrxID প্রয়োজন' }, 400);
      }
      const { data, error } = await supabase
        .from('parent_payment_requests')
        .insert({
          parent_account_id: account_id,
          student_uuid,
          fee_assignment_ids: fee_assignment_ids || [],
          amount: amt,
          method: String(method).trim(),
          trx_id: String(trx_id).trim(),
          sender_phone: sender_phone ? String(sender_phone).trim() : null,
          note: note ? String(note).trim() : null,
          status: 'pending',
        })
        .select('id, status, created_at')
        .single();
      if (error) return jsonResp({ error: error.message }, 500);
      return jsonResp({ success: true, request: data });
    }

    if (action === 'initiate_gateway') {
      // Check if a gateway is configured
      const { data: cfg } = await supabase
        .from('payment_gateway_config')
        .select('id, provider, is_enabled')
        .eq('is_enabled', true)
        .limit(1)
        .maybeSingle();
      if (!cfg) {
        return jsonResp({
          error: 'অনলাইন পেমেন্ট গেটওয়ে কনফিগার করা নেই। ম্যানুয়াল পদ্ধতি ব্যবহার করুন।',
          code: 'NO_GATEWAY',
        }, 400);
      }
      // Proxy to process-payment
      const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-payment`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          action: 'initiate',
          amount: amt,
          student_id: student_uuid,
          fee_assignment_ids: fee_assignment_ids || [],
          return_url: body.return_url,
          source: 'parent_portal',
          parent_account_id: account_id,
        }),
      });
      const result = await resp.json();
      return jsonResp(result, resp.status);
    }

    return jsonResp({ error: 'Unknown action' }, 400);
  } catch (e) {
    return jsonResp({ error: (e as Error).message }, 500);
  }
});
