import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tables in dependency order (referenced tables first)
const RESTORE_ORDER = [
  'institutions', 'website_settings', 'divisions', 'classes', 'subjects',
  'expense_projects', 'expense_categories', 'students', 'staff',
  'fee_types', 'fee_payments', 'expenses', 'deposits', 'expense_monthly_summary',
  'donors', 'exams', 'results', 'notices', 'attendance_records', 'attendance_rules',
  'custom_forms', 'custom_form_fields', 'formulas', 'validation_rules',
  'system_modules', 'role_permissions', 'notifications',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin via claims
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Session expired. Please login again.' }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { backup, mode = 'merge' } = body;
    // mode: 'merge' = upsert (keep existing + add/update), 'replace' = delete then insert

    if (!backup || typeof backup !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid backup data' }), { status: 400, headers: corsHeaders });
    }

    const results: Record<string, { success: boolean; inserted: number; error?: string }> = {};

    for (const table of RESTORE_ORDER) {
      const tableData = backup[table];
      if (!tableData || !tableData.data || !Array.isArray(tableData.data) || tableData.data.length === 0) {
        continue;
      }

      try {
        if (mode === 'replace') {
          // Delete all existing data first
          const { error: delError } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (delError) {
            results[table] = { success: false, inserted: 0, error: `Delete failed: ${delError.message}` };
            continue;
          }
        }

        // Insert in batches of 100
        const rows = tableData.data;
        let inserted = 0;
        const batchSize = 100;

        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          
          // Remove auto-generated timestamps for clean insert
          const cleanBatch = batch.map((row: any) => {
            const { created_at, updated_at, ...rest } = row;
            return rest;
          });

          if (mode === 'merge') {
            const { error } = await supabase.from(table).upsert(cleanBatch, { onConflict: 'id', ignoreDuplicates: false });
            if (error) {
              results[table] = { success: false, inserted, error: error.message };
              continue;
            }
          } else {
            const { error } = await supabase.from(table).insert(cleanBatch);
            if (error) {
              results[table] = { success: false, inserted, error: error.message };
              continue;
            }
          }
          inserted += batch.length;
        }

        results[table] = { success: true, inserted };
      } catch (e) {
        results[table] = { success: false, inserted: 0, error: e.message };
      }
    }

    return new Response(JSON.stringify({
      success: true,
      restored_at: new Date().toISOString(),
      restored_by: (claimsData.claims.email as string) || userId,
      mode,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
