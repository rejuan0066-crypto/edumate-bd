// Signs Cloudinary uploads server-side so the API secret never reaches the browser.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha1Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
  const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
  const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');
  if (!cloudName || !apiKey || !apiSecret) return json({ error: 'Upload service not configured' }, 500);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const sub = typeof body?.folder === 'string' ? body.folder : 'general';
  if (!/^[a-zA-Z0-9_-]{1,40}(\/[a-zA-Z0-9_-]{1,40}){0,2}$/.test(sub)) return json({ error: 'Invalid folder' }, 400);

  const folder = `edumate-bd/${sub}`;
  const timestamp = Math.round(Date.now() / 1000);
  const signature = await sha1Hex(`folder=${folder}&timestamp=${timestamp}${apiSecret}`);
  return json({ signature, timestamp, folder, api_key: apiKey, cloud_name: cloudName });
});
