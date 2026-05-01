// Gateway webhook receiver: marks payments.status and triggers reconciliation via DB triggers.
// Endpoint: POST /functions/v1/payment-webhook
// Body shape (provider-agnostic, normalized by client/proxy):
//   { transaction_id: string, status: 'success'|'failed'|'pending', provider?, raw?: any }
// Or query params (?tran_id=...&status=...) for SSLCommerz-style redirects.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeStatus(s: string | null | undefined): "success" | "failed" | "pending" {
  if (!s) return "pending";
  const v = s.toLowerCase();
  if (["success", "valid", "completed", "paid", "captured", "approved"].includes(v)) return "success";
  if (["fail", "failed", "cancel", "cancelled", "void", "declined"].includes(v)) return "failed";
  return "pending";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let payload: Record<string, any> = {};

    if (req.method === "POST") {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        payload = await req.json().catch(() => ({}));
      } else {
        const text = await req.text();
        try { payload = Object.fromEntries(new URLSearchParams(text)); }
        catch { payload = {}; }
      }
    }
    // Merge query params (gateways often redirect with ?tran_id=&status=)
    url.searchParams.forEach((v, k) => { if (!(k in payload)) payload[k] = v; });

    const transaction_id =
      payload.transaction_id || payload.tran_id || payload.merchantInvoiceNumber || payload.paymentID || payload.order_id;
    const rawStatus = payload.status || payload.payment_status || payload.transactionStatus;
    const status = normalizeStatus(rawStatus);

    if (!transaction_id) {
      return jsonResp({ error: "transaction_id is required", received: Object.keys(payload) }, 400);
    }

    // Look up payment row
    const { data: payment, error: lookupErr } = await supabase
      .from("payments")
      .select("id, status")
      .eq("transaction_id", transaction_id)
      .maybeSingle();

    if (lookupErr) return jsonResp({ error: lookupErr.message }, 500);
    if (!payment) return jsonResp({ error: "Unknown transaction_id" }, 404);

    // Idempotent: if already in target state, no-op
    if (payment.status === status) {
      return jsonResp({ ok: true, idempotent: true, status });
    }

    const { error: updErr } = await supabase
      .from("payments")
      .update({ status, notes: payload.bank_tran_id || payload.payerReference || null })
      .eq("id", payment.id);

    if (updErr) return jsonResp({ error: updErr.message }, 500);

    return jsonResp({
      ok: true,
      transaction_id,
      previous_status: payment.status,
      new_status: status,
      message:
        status === "success"
          ? "Payment marked success — fee_payments reconciled via trigger."
          : status === "failed"
            ? "Payment marked failed — any prior allocations reversed."
            : "Status updated.",
    });
  } catch (e) {
    return jsonResp({ error: (e as Error).message }, 500);
  }
});
