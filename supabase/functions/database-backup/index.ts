import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      .in('role', ['admin', 'super_admin'])
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: corsHeaders });
    }

    // Dynamically fetch all public tables from DB
    const { data: tableRows, error: tableError } = await supabase.rpc('get_public_tables');
    if (tableError || !tableRows || tableRows.length === 0) {
      return new Response(JSON.stringify({ error: 'Could not fetch table list: ' + (tableError?.message || 'empty') }), { status: 500, headers: corsHeaders });
    }
    const TABLES: string[] = (tableRows as any[]).map((r: any) => r.table_name);

    const url = new URL(req.url);

    // If just listing tables, return immediately
    if (url.searchParams.get('list_tables') === 'true') {
      return new Response(JSON.stringify({ tables: TABLES }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tableParam = url.searchParams.get('table');
    const format = url.searchParams.get('format') || 'json';

    if (tableParam && !TABLES.includes(tableParam)) {
      return new Response(JSON.stringify({ error: 'Table not allowed' }), { status: 400, headers: corsHeaders });
    }
    const tablesToExport = tableParam ? [tableParam] : TABLES;
    const backup: Record<string, any> = {
      metadata: {
        exported_at: new Date().toISOString(),
        exported_by: (claimsData.claims.email as string) || userId,
        tables: tablesToExport,
        total_tables: tablesToExport.length,
        format,
      },
    };

    // Strip credential/session fields from backup exports so downloaded files
    // never contain bcrypt hashes or live session tokens.
    const REDACT_FIELDS: Record<string, string[]> = {
      parent_accounts: ['password_hash', 'session_token', 'session_expires_at'],
      student_accounts: ['password_hash'],
    };

    for (const table of tablesToExport) {
      const rows: any[] = [];
      let from = 0;
      const PAGE = 1000;
      let hasError = false;
      let errorMsg = '';

      while (true) {
        const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE - 1);
        if (error) {
          hasError = true;
          errorMsg = error.message;
          break;
        }
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }

      if (hasError && rows.length === 0) {
        backup[table] = { error: errorMsg, count: 0 };
      } else {
        const redact = REDACT_FIELDS[table];
        const cleanedRows = (redact && rows.length > 0)
          ? rows.map((row: any) => {
              const r = { ...row };
              redact.forEach((f) => { delete r[f]; });
              return r;
            })
          : rows;
        backup[table] = { data: cleanedRows, count: cleanedRows.length };
      }
    }

    if (format === 'csv' && tableParam) {
      const tableData = backup[tableParam]?.data || [];
      if (tableData.length === 0) {
        return new Response('No data', { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } });
      }
      const headers = Object.keys(tableData[0]);
      const csvRows = [
        headers.join(','),
        ...tableData.map((row: any) =>
          headers.map(h => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"` : str;
          }).join(',')
        ),
      ];
      const csv = '\uFEFF' + csvRows.join('\n');
      return new Response(csv, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${tableParam}_backup.csv"`,
        },
      });
    }

    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
