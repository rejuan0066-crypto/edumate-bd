// Supabase Edge Function: send-whatsapp
// Sends WhatsApp messages via Meta WhatsApp Cloud API
// Requires secret: WHATSAPP_ACCESS_TOKEN

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendRequest {
  recipients: string[]; // E.164 format phone numbers
  message: string;
  template_name?: string; // For approved templates
  language_code?: string; // e.g. 'bn', 'en_US'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse and validate body
    const body: SendRequest = await req.json();
    if (!body.recipients?.length || !body.message?.trim()) {
      return new Response(JSON.stringify({ error: 'recipients and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Load WhatsApp config
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: config } = await adminClient
      .from('whatsapp_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!config?.cloud_api_enabled || !config.phone_number_id) {
      return new Response(JSON.stringify({
        error: 'WhatsApp Cloud API is not configured. Please configure it in Admin Settings.',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    if (!accessToken) {
      return new Response(JSON.stringify({
        error: 'WHATSAPP_ACCESS_TOKEN secret is not set in backend.',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Send messages
    const apiUrl = `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`;
    const results: Array<{ to: string; success: boolean; error?: string; messageId?: string }> = [];

    for (const rawTo of body.recipients) {
      const to = rawTo.replace(/\D/g, '');
      if (!to) {
        results.push({ to: rawTo, success: false, error: 'Invalid phone number' });
        continue;
      }

      const payload = body.template_name
        ? {
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
              name: body.template_name,
              language: { code: body.language_code || config.default_language || 'bn' },
            },
          }
        : {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: body.message },
          };

      try {
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await resp.json();
        if (!resp.ok) {
          results.push({
            to,
            success: false,
            error: data?.error?.message || `HTTP ${resp.status}`,
          });
        } else {
          results.push({
            to,
            success: true,
            messageId: data?.messages?.[0]?.id,
          });
        }
      } catch (err: any) {
        results.push({ to, success: false, error: err.message });
      }
    }

    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.length - sentCount;

    return new Response(JSON.stringify({
      success: true,
      sent: sentCount,
      failed: failedCount,
      total: results.length,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('send-whatsapp error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
