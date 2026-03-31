import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { monthYear, monthLabel, year, language, staff, totals } = body;

    if (!staff || !Array.isArray(staff)) {
      return new Response(JSON.stringify({ error: "Invalid data" }), { status: 400, headers: corsHeaders });
    }

    const bn = language === "bn";

    // Fetch institution info
    const { data: institution } = await supabase
      .from("institutions")
      .select("*")
      .eq("is_default", true)
      .single();

    const instName = institution?.name || (bn ? "প্রতিষ্ঠান" : "Institution");
    const instAddress = institution?.address || "";

    // Generate HTML for PDF
    const staffRows = staff.map((s: any, i: number) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${s.name}</td>
        <td>${s.designation}</td>
        <td style="text-align:right">৳${Number(s.base_salary).toLocaleString()}</td>
        <td style="text-align:center">${s.present}/${s.absent}/${s.late}</td>
        <td style="text-align:right;color:#dc2626">৳${Number(s.deductions).toLocaleString()}</td>
        <td style="text-align:right;color:#2563eb">৳${Number(s.overtime || 0).toLocaleString()}</td>
        <td style="text-align:right;color:#dc2626">৳${Number(s.advance || 0).toLocaleString()}</td>
        <td style="text-align:right;font-weight:bold;color:#059669">৳${Number(s.net_salary).toLocaleString()}</td>
        <td style="text-align:center">${s.status === 'paid' ? (bn ? '✓ পরিশোধিত' : '✓ Paid') : (bn ? '⏳ বকেয়া' : '⏳ Pending')}</td>
      </tr>
    `).join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Sans Bengali', 'Arial', sans-serif; padding: 30px; background: white; color: #1e293b; }
  .header { text-align: center; border-bottom: 3px solid #1e293b; padding-bottom: 15px; margin-bottom: 20px; }
  .header h1 { font-size: 20px; font-weight: 700; }
  .header h2 { font-size: 16px; font-weight: 600; margin-top: 5px; color: #475569; }
  .header p { font-size: 12px; color: #64748b; margin-top: 3px; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 12px; color: #475569; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
  th { background: #f1f5f9; color: #334155; font-weight: 600; padding: 8px 6px; border: 1px solid #e2e8f0; text-align: left; }
  td { padding: 6px; border: 1px solid #e2e8f0; }
  tr:nth-child(even) { background: #f8fafc; }
  .totals-row { background: #f1f5f9 !important; font-weight: 700; }
  .footer { display: flex; justify-content: space-between; margin-top: 60px; font-size: 12px; }
  .footer div { text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px; min-width: 140px; }
  .summary { display: flex; gap: 15px; margin: 15px 0; }
  .summary-card { flex: 1; padding: 10px; border-radius: 8px; text-align: center; }
  .summary-card.base { background: #eff6ff; color: #1d4ed8; }
  .summary-card.net { background: #ecfdf5; color: #059669; }
  .summary-card.ded { background: #fef2f2; color: #dc2626; }
  .summary-card p:first-child { font-size: 10px; font-weight: 600; }
  .summary-card p:last-child { font-size: 18px; font-weight: 700; }
  @media print { body { padding: 15px; } }
</style>
</head><body>
<div class="header">
  <h1>${instName}</h1>
  ${instAddress ? `<p>${instAddress}</p>` : ""}
  <h2>${bn ? "বেতন শিট" : "Salary Sheet"} — ${monthLabel} ${year}</h2>
</div>

<div class="summary">
  <div class="summary-card base">
    <p>${bn ? "মোট মূল বেতন" : "Total Base"}</p>
    <p>৳${Number(totals?.base || 0).toLocaleString()}</p>
  </div>
  <div class="summary-card ded">
    <p>${bn ? "মোট কর্তন" : "Total Deductions"}</p>
    <p>৳${Number(totals?.deductions || 0).toLocaleString()}</p>
  </div>
  <div class="summary-card net">
    <p>${bn ? "মোট নিট বেতন" : "Total Net"}</p>
    <p>৳${Number(totals?.net || 0).toLocaleString()}</p>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="text-align:center;width:30px">#</th>
      <th>${bn ? "নাম" : "Name"}</th>
      <th>${bn ? "পদবি" : "Designation"}</th>
      <th style="text-align:right">${bn ? "মূল বেতন" : "Base"}</th>
      <th style="text-align:center">${bn ? "উপ/অনু/বি" : "P/A/L"}</th>
      <th style="text-align:right">${bn ? "কর্তন" : "Ded."}</th>
      <th style="text-align:right">${bn ? "ওভারটাইম" : "OT"}</th>
      <th style="text-align:right">${bn ? "অগ্রিম" : "Advance"}</th>
      <th style="text-align:right">${bn ? "নিট বেতন" : "Net"}</th>
      <th style="text-align:center">${bn ? "স্ট্যাটাস" : "Status"}</th>
    </tr>
  </thead>
  <tbody>
    ${staffRows}
    <tr class="totals-row">
      <td colspan="3" style="text-align:center">${bn ? "মোট" : "Total"} (${staff.length} ${bn ? "জন" : "staff"})</td>
      <td style="text-align:right">৳${Number(totals?.base || 0).toLocaleString()}</td>
      <td></td>
      <td style="text-align:right;color:#dc2626">৳${Number(totals?.deductions || 0).toLocaleString()}</td>
      <td></td>
      <td></td>
      <td style="text-align:right;color:#059669">৳${Number(totals?.net || 0).toLocaleString()}</td>
      <td></td>
    </tr>
  </tbody>
</table>

<div class="meta">
  <span>${bn ? "তৈরির তারিখ" : "Generated"}: ${new Date().toLocaleDateString(bn ? "bn-BD" : "en-US")}</span>
  <span>${bn ? "মাস" : "Period"}: ${monthLabel} ${year}</span>
</div>

<div class="footer">
  <div>${bn ? "প্রাপকের স্বাক্ষর" : "Recipient"}</div>
  <div>${bn ? "হিসাবরক্ষক" : "Accountant"}</div>
  <div>${bn ? "প্রিন্সিপাল" : "Principal"}</div>
</div>
</body></html>`;

    // Return HTML as PDF-ready content  
    // The client can use this HTML to generate/print PDF
    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="salary_${monthYear}.html"`,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
