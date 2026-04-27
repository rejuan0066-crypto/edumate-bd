// Edge Function: generate-vapid
// Generates a VAPID key pair (P-256) using Web Crypto. Returns base64url publicKey/privateKey.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );

    // Public key: 65-byte uncompressed point (0x04 || X || Y) — extract from JWK
    const pubJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const x = Uint8Array.from(atob(pubJwk.x!.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const y = Uint8Array.from(atob(pubJwk.y!.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    const publicRaw = new Uint8Array(65);
    publicRaw[0] = 0x04;
    publicRaw.set(x, 1);
    publicRaw.set(y, 33);

    // Private key: 32-byte scalar 'd' from JWK
    const privJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const d = Uint8Array.from(atob(privJwk.d!.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

    return new Response(JSON.stringify({
      publicKey: toBase64Url(publicRaw),
      privateKey: toBase64Url(d),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
