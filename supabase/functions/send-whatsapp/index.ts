// Supabase Edge Function: send-whatsapp
// Supports both:
// 1. Free Self-Hosted WhatsApp Gateway (Evolution API, Baileys, WPPConnect, Android Gateway)
// 2. Meta WhatsApp Cloud API (Official paid)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { requireAuth, unauthorized } from '../_shared/auth-guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendRequest {
  recipients: string[]; // Phone numbers
  message: string;
  template_name?: string; // For Meta approved templates
  language_code?: string; // e.g. 'bn', 'en_US'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Restrict to admin or staff roles only
  const guard = await requireAuth(req, { roles: ['admin', 'staff'] });
  if (!guard.ok) return unauthorized(guard.status, guard.error, corsHeaders);

  try {
    // Parse and validate body
    const body: SendRequest = await req.json();
    if (!body.recipients?.length || !body.message?.trim()) {
      return new Response(JSON.stringify({ error: 'recipients and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load WhatsApp configs
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Check if free self-hosted gateway is configured in app_settings
    const { data: freeGwSetting } = await adminClient
      .from('app_settings')
      .select('value')
      .eq('key', 'whatsapp_gateway_config')
      .maybeSingle();

    const freeGw = freeGwSetting?.value as {
      is_enabled?: boolean;
      provider?: string;
      server_url?: string;
      instance_name?: string;
      api_key?: string;
    } | null;

    const useFreeGateway = !!(freeGw?.is_enabled && freeGw?.server_url?.trim());

    // 2. Check Meta Cloud API config in whatsapp_config
    const { data: config } = await adminClient
      .from('whatsapp_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!useFreeGateway && (!config?.cloud_api_enabled || !config.phone_number_id)) {
      return new Response(JSON.stringify({
        error: 'WhatsApp গেটওয়ে সক্রিয় নেই। এডমিন সেটিংস থেকে ফ্রি WhatsApp গেটওয়ে (Evolution API) অথবা Meta Cloud API চালু করুন।',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: Array<{ to: string; success: boolean; error?: string; messageId?: string }> = [];

    // Send messages via Free Gateway or Meta Cloud API
    if (useFreeGateway) {
      const serverUrl = freeGw!.server_url!.replace(/\/+$/, '');
      const instanceName = (freeGw!.instance_name || 'madrasa').trim();
      const apiKey = (freeGw!.api_key || '').trim();
      const provider = freeGw!.provider || 'evolution';

      for (const rawTo of body.recipients) {
        let to = rawTo.replace(/\D/g, '');
        if (!to) {
          results.push({ to: rawTo, success: false, error: 'Invalid phone number' });
          continue;
        }
        if (to.length === 11 && to.startsWith('01')) {
          to = '88' + to;
        }

        try {
          let targetUrl = '';
          const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
          let reqBody: any = {};

          if (provider === 'evolution') {
            targetUrl = `${serverUrl}/message/sendText/${encodeURIComponent(instanceName)}`;
            if (apiKey) reqHeaders['apikey'] = apiKey;
            reqBody = {
              number: to,
              text: body.message,
              delay: 1000,
              linkPreview: true,
            };
          } else if (provider === 'wppconnect') {
            targetUrl = `${serverUrl}/api/${encodeURIComponent(instanceName)}/send-message`;
            if (apiKey) reqHeaders['Authorization'] = `Bearer ${apiKey}`;
            reqBody = {
              phone: to,
              message: body.message,
            };
          } else {
            targetUrl = `${serverUrl}/send`;
            if (apiKey) reqHeaders['Authorization'] = `Bearer ${apiKey}`;
            reqBody = {
              number: to,
              message: body.message,
              instance: instanceName,
            };
          }

          const resp = await fetch(targetUrl, {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify(reqBody),
          });

          const resData = await resp.json().catch(() => ({}));
          if (!resp.ok) {
            results.push({
              to,
              success: false,
              error: resData?.message || resData?.error || `HTTP ${resp.status}`,
            });
          } else {
            results.push({
              to,
              success: true,
              messageId: resData?.key?.id || resData?.id || 'sent-free-gw',
            });
          }
        } catch (err: any) {
          results.push({ to, success: false, error: err.message });
        }
      }
    } else {
      // Cloud API branch
      const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
      if (!accessToken) {
        return new Response(JSON.stringify({
          error: 'WHATSAPP_ACCESS_TOKEN secret is not set in backend.',
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const apiUrl = `https://graph.facebook.com/v21.0/${config!.phone_number_id}/messages`;

      for (const rawTo of body.recipients) {
        let to = rawTo.replace(/\D/g, '');
        if (!to) {
          results.push({ to: rawTo, success: false, error: 'Invalid phone number' });
          continue;
        }
        if (to.length === 11 && to.startsWith('01')) {
          to = '88' + to;
        }

        const payload = body.template_name
          ? {
              messaging_product: 'whatsapp',
              to,
              type: 'template',
              template: {
                name: body.template_name,
                language: { code: body.language_code || config!.default_language || 'bn' },
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
    }

    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.length - sentCount;

    return new Response(JSON.stringify({
      success: true,
      sent: sentCount,
      failed: failedCount,
      total: results.length,
      method: useFreeGateway ? 'free_gateway' : 'cloud_api',
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
