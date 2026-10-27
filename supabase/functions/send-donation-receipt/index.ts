// Sends the donation_receipt email to a verified donor.
// Invoked from /admin/donors when an admin marks a donation as 'verified'
// (or via a manual "Resend Receipt" button).
//
// Security:
//  - Requires a logged-in admin (validates via SUPABASE_JWKS getClaims)
//  - Donation must be payment_status = 'verified' before sending
//  - Records receipt_sent_at to prevent silent re-sends without intent

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { sendViaSMTP } from "../_shared/smtp.ts";
import { resolveSmtpProfile } from "../_shared/smtp-resolver.ts";
import { renderEmailTemplate } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function bnDigits(s: string | number): string {
  const map = ["০","১","২","৩","৪","৫","৬","৭","৮","৯"];
  return String(s).replace(/[0-9]/g, (d) => map[+d]);
}

function formatBnDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return "";
  }
}

const FALLBACK_HTML = `<!DOCTYPE html><html><body style="font-family:Arial;background:#f4f4f7;padding:40px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;">
    <h2 style="color:#10b981;margin:0 0 8px;">দান গ্রহণের রসিদ</h2>
    <p>প্রিয় {{donorName}},</p>
    <p>আপনার ৳{{amount}} টাকার দান গ্রহণ করা হয়েছে। ধন্যবাদ।</p>
    <p>রসিদ নং: <strong>{{receiptNumber}}</strong><br/>তারিখ: {{donationDate}}</p>
  </div></body></html>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ---- Auth: must be a logged-in admin / super_admin ----
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Role check via has_role
    const { data: hasAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!hasAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden — admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { donation_id, force = false } = await req.json();
    if (!donation_id) {
      return new Response(JSON.stringify({ error: "donation_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: donation, error: dErr } = await supabase
      .from("donors")
      .select("*")
      .eq("id", donation_id)
      .maybeSingle();

    if (dErr || !donation) {
      return new Response(JSON.stringify({ error: "Donation not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (donation.payment_status !== "verified") {
      return new Response(JSON.stringify({
        error: "RECEIPT_REQUIRES_VERIFIED",
        message: "Receipt can only be sent for verified donations.",
      }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!donation.email) {
      return new Response(JSON.stringify({
        error: "NO_DONOR_EMAIL",
        message: "Donor has no email on file — cannot send receipt.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (donation.receipt_sent_at && !force) {
      return new Response(JSON.stringify({
        error: "ALREADY_SENT",
        message: "Receipt already sent. Pass force=true to resend.",
        receipt_sent_at: donation.receipt_sent_at,
      }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---- Resolve SMTP profile ----
    const smtp = await resolveSmtpProfile(supabase, "transactional");
    if (!smtp) {
      return new Response(JSON.stringify({
        error: "NO_SMTP",
        message: "No SMTP profile configured. Add one in /admin/settings.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Escape HTML in user-controllable donor fields to prevent markup injection
    const escapeHtml = (str: any) => String(str || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m] || m));

    // ---- Render donation_receipt template ----
    const amount = Number(donation.donation_amount || 0);
    const vars: Record<string, string | number> = {
      donorName: escapeHtml(donation.name_bn || donation.name_en || "দাতা"),
      donorPhone: escapeHtml(donation.phone || ""),
      donorEmail: escapeHtml(donation.email || ""),
      donorAddress: escapeHtml(donation.address || ""),
      amount: bnDigits(amount.toLocaleString("en-IN")),
      amountInWords: "", // computed client-side; left blank if not supplied
      receiptNumber: donation.receipt_number || "",
      donationPurpose: donation.purpose || "—",
      donationType: donation.donation_type || "one-time",
      donationDate: formatBnDate(donation.donation_date || donation.created_at),
      paymentMethod: (donation.notes || "").includes("TrxID") ? "Online" : "Cash",
      transactionId: (donation.notes?.match(/TrxID:\s*([^|]+)/)?.[1] || "").trim(),
      brand_color: "#10b981",
    };

    const rendered = await renderEmailTemplate(supabase, "donation_receipt", vars, {
      subject: "দান গ্রহণের রসিদ — {{receiptNumber}}",
      html: FALLBACK_HTML,
    });

    await sendViaSMTP(smtp as any, donation.email, rendered.subject, rendered.html);

    // Record send
    await supabase
      .from("donors")
      .update({ receipt_sent_at: new Date().toISOString() })
      .eq("id", donation_id);

    return new Response(JSON.stringify({
      success: true,
      sent_to: donation.email,
      receipt_number: donation.receipt_number,
      template_used: rendered.used_db_template ? "db" : "fallback",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    console.error("send-donation-receipt error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
