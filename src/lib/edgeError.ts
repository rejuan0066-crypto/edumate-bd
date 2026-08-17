// Extracts a human-readable message from a Supabase Edge Function error.
// supabase.functions.invoke() wraps non-2xx responses in FunctionsHttpError and
// leaves `data` null, so the UI would otherwise only see
// "Edge Function returned a non-2xx status code".

export async function parseEdgeError(
  error: any,
  data: any,
  bn = true,
): Promise<string> {
  // 1) Some functions return 200 with { success:false, error }
  if (data && typeof data === 'object') {
    const msg = bn ? (data.message_bn || data.error_bn) : null;
    if (msg) return String(msg);
    if (data.error) return String(data.error);
    if (data.message) return String(data.message);
  }

  // 2) Non-2xx: body lives on error.context (a Response)
  const ctx = error?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.clone().json();
      if (body) {
        const bnMsg = bn ? (body.message_bn || body.error_bn) : null;
        if (bnMsg) return String(bnMsg);
        if (body.error) return String(body.error);
        if (body.message) return String(body.message);
      }
    } catch {
      try {
        const text = await ctx.clone().text();
        if (text) return text.slice(0, 300);
      } catch { /* ignore */ }
    }
  }

  if (ctx?.status === 401 || ctx?.status === 403) {
    return bn ? 'অনুমতি নেই — আবার লগইন করে চেষ্টা করুন' : 'Not authorized — please sign in again';
  }
  if (ctx?.status === 429) {
    return bn ? 'অনেক বেশি অনুরোধ। কিছুক্ষণ পর আবার চেষ্টা করুন।' : 'Too many requests. Try again later.';
  }

  if (error?.message && !/non-2xx/i.test(error.message)) return String(error.message);
  return bn ? 'অনুরোধ ব্যর্থ হয়েছে' : 'Request failed';
}
