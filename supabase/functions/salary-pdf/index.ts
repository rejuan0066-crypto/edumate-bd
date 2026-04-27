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
    
    // Convert English digits to Bengali digits
    const toBnDigits = (val: string | number): string => {
      const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return String(val).replace(/[0-9]/g, (d: string) => bnDigits[parseInt(d)]);
    };
    const fmtNum = (n: number) => bn ? toBnDigits(n.toLocaleString()) : n.toLocaleString();

    // Fetch institution info
    const { data: institution } = await supabase
      .from("institutions")
      .select("*")
      .eq("is_default", true)
      .single();

    const instName = institution?.name || (bn ? "প্রতিষ্ঠান" : "Institution");
    const instAddress = institution?.address || "";
    const instPhone = (institution as any)?.phone || "";
    const instEmail = (institution as any)?.email || "";
    const instLogo = (institution as any)?.logo_url || "";
    const principalName = (institution as any)?.principal_name || (bn ? "প্রিন্সিপাল" : "Principal");

    const sheetId = `SS-${monthYear || ""}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const issueDate = new Date().toLocaleDateString(bn ? "bn-BD" : "en-GB");

    // Generate HTML for PDF
    const staffRows = staff.map((s: any, i: number) => `
      <tr>
        <td class="c-num">${bn ? toBnDigits(i + 1) : i + 1}</td>
        <td class="c-name"><div class="nm">${s.name}</div>${s.staff_id ? `<div class="sid">${s.staff_id}</div>` : ""}</td>
        <td class="c-desig">${s.designation}</td>
        <td class="c-amt">৳${fmtNum(Number(s.base_salary))}</td>
        <td class="c-pal">
          <span class="pill p-p">${bn ? toBnDigits(s.present) : s.present}</span>
          <span class="pill p-a">${bn ? toBnDigits(s.absent) : s.absent}</span>
          <span class="pill p-l">${bn ? toBnDigits(s.late) : s.late}</span>
        </td>
        <td class="c-amt c-neg">${Number(s.deductions) > 0 ? `৳${fmtNum(Number(s.deductions))}` : "—"}</td>
        <td class="c-amt c-pos-soft">${Number(s.overtime || 0) > 0 ? `৳${fmtNum(Number(s.overtime))}` : "—"}</td>
        <td class="c-amt c-neg">${Number(s.advance || 0) > 0 ? `৳${fmtNum(Number(s.advance))}` : "—"}</td>
        <td class="c-amt c-net">৳${fmtNum(Number(s.net_salary))}</td>
        <td class="c-status">
          ${s.status === 'paid'
            ? `<span class="badge b-paid">${bn ? '✓ পরিশোধিত' : '✓ Paid'}</span>`
            : `<span class="badge b-pend">${bn ? '⏳ বকেয়া' : '⏳ Pending'}</span>`}
        </td>
      </tr>
    `).join("");

    const logoBlock = instLogo
      ? `<img src="${instLogo}" alt="logo" class="logo-img"/>`
      : `<div class="logo-fallback">${(instName || 'A').charAt(0)}</div>`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${bn ? "বেতন শিট" : "Salary Sheet"} — ${monthLabel} ${year}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
  *,*::before,*::after { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body {
    font-family: 'Noto Sans Bengali', 'Inter', system-ui, sans-serif;
    background: #f1f5f9;
    color: #0f172a;
    padding: 24px;
    line-height: 1.5;
    font-size: 12px;
  }
  .sheet {
    max-width: 1180px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 24px 60px -20px rgba(15, 23, 42, .18);
    position: relative;
  }

  /* ===== Header ===== */
  .hdr {
    position: relative;
    padding: 24px 32px 22px;
    background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%);
    color: #fff;
    overflow: hidden;
  }
  .hdr::after {
    content: "";
    position: absolute; right: -80px; top: -80px;
    width: 280px; height: 280px;
    background: radial-gradient(circle, rgba(255,255,255,.18) 0%, transparent 70%);
    border-radius: 50%;
  }
  .hdr::before {
    content: "";
    position: absolute; left: -60px; bottom: -60px;
    width: 220px; height: 220px;
    background: radial-gradient(circle, rgba(16,185,129,.25) 0%, transparent 70%);
    border-radius: 50%;
  }
  .hdr-row { display: flex; align-items: center; gap: 18px; position: relative; z-index: 2; }
  .logo-wrap {
    width: 68px; height: 68px;
    background: rgba(255,255,255,.16);
    border: 2px solid rgba(255,255,255,.35);
    border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; flex-shrink: 0;
  }
  .logo-img { width: 100%; height: 100%; object-fit: contain; }
  .logo-fallback { font-size: 30px; font-weight: 800; color: #fff; }
  .inst { flex: 1; }
  .inst-name { font-size: 22px; font-weight: 800; letter-spacing: .3px; margin-bottom: 3px; }
  .inst-meta { font-size: 11.5px; opacity: .92; line-height: 1.55; }
  .doc-tag {
    text-align: right; min-width: 160px;
  }
  .doc-tag .badge {
    background: rgba(255,255,255,.96);
    color: #047857;
    font-weight: 800;
    padding: 6px 16px;
    border-radius: 999px;
    font-size: 10.5px;
    letter-spacing: 2px;
    display: inline-block;
  }
  .doc-tag .id {
    color: #fff; font-size: 10.5px;
    margin-top: 6px; opacity: .9;
    font-family: 'Inter', monospace;
    letter-spacing: .5px;
  }

  /* ===== Period Bar ===== */
  .period-bar {
    background: linear-gradient(90deg, #ecfdf5 0%, #d1fae5 50%, #ecfdf5 100%);
    padding: 12px 32px;
    border-bottom: 1px solid #a7f3d0;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 12.5px; color: #065f46; font-weight: 600;
  }
  .period-bar .ttl {
    font-size: 16px; font-weight: 800; color: #064e3b;
    display: flex; align-items: center; gap: 8px;
  }
  .period-bar .ttl::before {
    content: ""; display: inline-block; width: 4px; height: 18px;
    background: linear-gradient(180deg, #10b981, #047857); border-radius: 4px;
  }

  /* ===== Body ===== */
  .body { padding: 22px 32px 8px; }

  /* ===== Summary Cards ===== */
  .summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 20px;
  }
  .s-card {
    position: relative;
    padding: 16px 18px;
    border-radius: 14px;
    overflow: hidden;
    background: #fff;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 8px -2px rgba(15,23,42,.06);
  }
  .s-card .accent {
    position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  }
  .s-card .lbl {
    font-size: 10.5px; font-weight: 700;
    letter-spacing: 1.5px; text-transform: uppercase;
    color: #64748b; margin-bottom: 6px;
  }
  .s-card .val {
    font-size: 22px; font-weight: 800;
    color: #0f172a; font-variant-numeric: tabular-nums;
    letter-spacing: -.3px;
  }
  .s-card.base .accent { background: linear-gradient(180deg, #2563eb, #1d4ed8); }
  .s-card.base .lbl { color: #1d4ed8; }
  .s-card.ded  .accent { background: linear-gradient(180deg, #ef4444, #b91c1c); }
  .s-card.ded  .lbl { color: #b91c1c; }
  .s-card.net  .accent { background: linear-gradient(180deg, #10b981, #047857); }
  .s-card.net  .lbl { color: #047857; }
  .s-card.net  .val { color: #047857; }

  /* ===== Table ===== */
  .table-wrap {
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 2px 8px -2px rgba(15,23,42,.04);
  }
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 11.5px;
  }
  thead th {
    background: linear-gradient(180deg, #0f172a, #1e293b);
    color: #fff;
    font-weight: 700;
    padding: 11px 8px;
    text-align: left;
    font-size: 11px;
    letter-spacing: .3px;
    border-bottom: 2px solid #047857;
    white-space: nowrap;
  }
  thead th.center { text-align: center; }
  thead th.right { text-align: right; }
  tbody td {
    padding: 10px 8px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  tbody tr:hover td { background: #ecfdf5; }
  tbody tr:last-child td { border-bottom: none; }

  .c-num { text-align: center; font-weight: 700; color: #64748b; width: 36px; }
  .c-name .nm { font-weight: 700; color: #0f172a; }
  .c-name .sid { font-size: 10px; color: #94a3b8; font-family: 'Inter', monospace; margin-top: 1px; }
  .c-desig { color: #475569; font-weight: 500; }
  .c-amt { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; color: #0f172a; }
  .c-neg { color: #b91c1c; }
  .c-pos-soft { color: #1d4ed8; }
  .c-net { color: #047857; font-weight: 800; font-size: 12.5px; }
  .c-pal { text-align: center; white-space: nowrap; }
  .pill {
    display: inline-block;
    min-width: 22px;
    padding: 2px 7px;
    margin: 0 2px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .p-p { background: #d1fae5; color: #065f46; }
  .p-a { background: #fee2e2; color: #991b1b; }
  .p-l { background: #fef3c7; color: #92400e; }
  .c-status { text-align: center; }
  .badge {
    display: inline-block;
    padding: 4px 11px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .3px;
    white-space: nowrap;
  }
  .b-paid { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
  .b-pend { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }

  /* ===== Totals row ===== */
  .totals td {
    background: linear-gradient(90deg, #f0fdf4 0%, #ecfdf5 100%) !important;
    font-weight: 800;
    font-size: 12px;
    color: #064e3b;
    border-top: 2px solid #047857;
    padding: 12px 8px;
  }
  .totals .c-amt { color: #064e3b; }
  .totals .c-net { color: #047857; font-size: 13.5px; }
  .totals .c-amt.c-neg { color: #b91c1c; }

  /* ===== Meta + Signatures ===== */
  .meta {
    display: flex; justify-content: space-between;
    margin: 16px 0 4px; padding: 10px 14px;
    font-size: 11px; color: #475569;
    background: #f8fafc; border-radius: 10px;
    border-left: 3px solid #047857;
  }
  .meta strong { color: #0f172a; }

  .signatures {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 32px;
    margin: 50px 8px 0;
  }
  .sig { text-align: center; font-size: 11.5px; color: #475569; }
  .sig .line {
    border-top: 1.5px solid #94a3b8;
    padding-top: 8px;
    margin-top: 32px;
  }
  .sig .role { font-weight: 700; color: #0f172a; font-size: 12px; }
  .sig .name { font-size: 10.5px; color: #64748b; margin-top: 2px; }

  /* ===== Footer ===== */
  .footer {
    margin-top: 24px;
    padding: 14px 32px;
    background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%);
    border-top: 1px solid #e2e8f0;
    text-align: center;
    font-size: 10.5px;
    color: #64748b;
  }
  .footer .gen { color: #94a3b8; font-size: 9.5px; margin-top: 3px; letter-spacing: .3px; }

  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; border-radius: 0; max-width: 100%; }
    tbody tr:hover td { background: inherit; }
    @page { size: A4 landscape; margin: 8mm; }
  }
</style>
</head><body>
<div class="sheet">
  <div class="hdr">
    <div class="hdr-row">
      <div class="logo-wrap">${logoBlock}</div>
      <div class="inst">
        <div class="inst-name">${instName}</div>
        <div class="inst-meta">
          ${instAddress ? instAddress : ""}
          ${instPhone ? ` &nbsp;•&nbsp; 📞 ${bn ? toBnDigits(instPhone) : instPhone}` : ""}
          ${instEmail ? ` &nbsp;•&nbsp; ✉ ${instEmail}` : ""}
        </div>
      </div>
      <div class="doc-tag">
        <div class="badge">${bn ? "বেতন শিট" : "SALARY SHEET"}</div>
        <div class="id">${sheetId}</div>
      </div>
    </div>
  </div>

  <div class="period-bar">
    <span class="ttl">${bn ? "বেতন শিট" : "Salary Sheet"} — ${monthLabel} ${bn ? toBnDigits(year) : year}</span>
    <span>${bn ? "ইস্যু তারিখ" : "Issue Date"}: <strong>${issueDate}</strong> &nbsp;•&nbsp; ${bn ? "মোট স্টাফ" : "Total Staff"}: <strong>${bn ? toBnDigits(staff.length) : staff.length}</strong></span>
  </div>

  <div class="body">
    <div class="summary">
      <div class="s-card base">
        <div class="accent"></div>
        <div class="lbl">${bn ? "মোট মূল বেতন" : "Total Base Salary"}</div>
        <div class="val">৳${fmtNum(Number(totals?.base || 0))}</div>
      </div>
      <div class="s-card ded">
        <div class="accent"></div>
        <div class="lbl">${bn ? "মোট কর্তন" : "Total Deductions"}</div>
        <div class="val">৳${fmtNum(Number(totals?.deductions || 0))}</div>
      </div>
      <div class="s-card net">
        <div class="accent"></div>
        <div class="lbl">${bn ? "মোট নিট বেতন (প্রদেয়)" : "Total Net Payable"}</div>
        <div class="val">৳${fmtNum(Number(totals?.net || 0))}</div>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="center" style="width:36px">#</th>
            <th>${bn ? "নাম" : "Name"}</th>
            <th>${bn ? "পদবি" : "Designation"}</th>
            <th class="right">${bn ? "মূল বেতন" : "Base"}</th>
            <th class="center">${bn ? "উপ/অনু/বি" : "P / A / L"}</th>
            <th class="right">${bn ? "কর্তন" : "Deduction"}</th>
            <th class="right">${bn ? "ওভারটাইম" : "Overtime"}</th>
            <th class="right">${bn ? "অগ্রিম" : "Advance"}</th>
            <th class="right">${bn ? "নিট বেতন" : "Net Salary"}</th>
            <th class="center">${bn ? "স্ট্যাটাস" : "Status"}</th>
          </tr>
        </thead>
        <tbody>
          ${staffRows}
          <tr class="totals">
            <td colspan="3" style="text-align:center">${bn ? "মোট" : "Total"} (${bn ? toBnDigits(staff.length) : staff.length} ${bn ? "জন" : "staff"})</td>
            <td class="c-amt">৳${fmtNum(Number(totals?.base || 0))}</td>
            <td></td>
            <td class="c-amt c-neg">৳${fmtNum(Number(totals?.deductions || 0))}</td>
            <td></td>
            <td></td>
            <td class="c-amt c-net">৳${fmtNum(Number(totals?.net || 0))}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="meta">
      <span>${bn ? "তৈরির তারিখ" : "Generated"}: <strong>${issueDate}</strong></span>
      <span>${bn ? "মাস" : "Period"}: <strong>${monthLabel} ${bn ? toBnDigits(year) : year}</strong></span>
      <span>${bn ? "শিট আইডি" : "Sheet ID"}: <strong>${sheetId}</strong></span>
    </div>

    <div class="signatures">
      <div class="sig">
        <div class="line">
          <div class="role">${bn ? "প্রাপকের স্বাক্ষর" : "Recipient Signature"}</div>
          <div class="name">${bn ? "তারিখসহ" : "with date"}</div>
        </div>
      </div>
      <div class="sig">
        <div class="line">
          <div class="role">${bn ? "হিসাবরক্ষক" : "Accountant"}</div>
          <div class="name">${bn ? "প্রস্তুতকারী" : "Prepared by"}</div>
        </div>
      </div>
      <div class="sig">
        <div class="line">
          <div class="role">${bn ? "প্রিন্সিপাল" : "Principal"}</div>
          <div class="name">${principalName}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div>${bn ? "এই বেতন শিটটি সিস্টেম দ্বারা জেনারেটকৃত — কোনো হাতের স্বাক্ষর প্রয়োজন নেই।" : "This salary sheet is system-generated — no manual signature required."}</div>
    <div class="gen">${bn ? "© " + instName + " • স্বয়ংক্রিয়ভাবে জেনারেটেড" : "© " + instName + " • Auto-generated document"}</div>
  </div>
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
