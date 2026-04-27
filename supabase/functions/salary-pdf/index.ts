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

    // Official govt-grade rows (no color pills)
    const staffRows = staff.map((s: any, i: number) => `
      <tr>
        <td class="c-num">${bn ? toBnDigits(i + 1) : i + 1}</td>
        <td class="c-name"><div class="nm">${s.name}</div>${s.staff_id && s.staff_id !== '-' ? `<div class="sid">${s.staff_id}</div>` : ""}</td>
        <td class="c-desig">${s.designation}</td>
        <td class="c-amt">${fmtNum(Number(s.base_salary))}</td>
        <td class="c-pal"><span>${bn ? toBnDigits(s.present) : s.present}</span> / <span>${bn ? toBnDigits(s.absent) : s.absent}</span> / <span>${bn ? toBnDigits(s.late) : s.late}</span></td>
        <td class="c-amt">${Number(s.deductions) > 0 ? fmtNum(Number(s.deductions)) : "—"}</td>
        <td class="c-amt">${Number(s.overtime || 0) > 0 ? fmtNum(Number(s.overtime)) : "—"}</td>
        <td class="c-amt">${Number(s.advance || 0) > 0 ? fmtNum(Number(s.advance)) : "—"}</td>
        <td class="c-amt c-net">${fmtNum(Number(s.net_salary))}</td>
        <td class="c-status">${s.status === 'paid' ? (bn ? 'পরিশোধিত' : 'Paid') : (bn ? 'বকেয়া' : 'Pending')}</td>
      </tr>
    `).join("");

    const logoBlock = instLogo
      ? `<img src="${instLogo}" alt="logo" class="logo-img"/>`
      : `<div class="logo-fallback">${(instName || 'A').charAt(0)}</div>`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${bn ? "বেতন শিট" : "Salary Sheet"} — ${monthLabel} ${year}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@600;700;800;900&display=swap');
  *,*::before,*::after { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body {
    font-family: 'Noto Sans Bengali', 'Inter', system-ui, sans-serif;
    background: #eef2f5;
    color: #0b1727;
    padding: 28px;
    line-height: 1.5;
    font-size: 11.5px;
  }
  .sheet {
    max-width: 1200px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 32px 80px -28px rgba(6, 78, 59, .25), 0 0 0 1px rgba(15,23,42,.06);
    position: relative;
    border-top: 6px solid #064e3b;
  }
  .sheet::before {
    content: "";
    position: absolute; left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, #c9a84c 0%, #f0d78c 50%, #c9a84c 100%);
    z-index: 5;
  }

  .watermark {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(-28deg);
    font-family: 'Playfair Display', serif;
    font-size: 140px; font-weight: 900;
    color: #064e3b;
    opacity: 0.035;
    letter-spacing: 12px;
    pointer-events: none;
    white-space: nowrap;
    z-index: 0;
  }

  /* ===== Header ===== */
  .hdr {
    position: relative;
    padding: 26px 36px 22px;
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    z-index: 2;
  }
  .hdr-row { display: flex; align-items: center; gap: 20px; position: relative; z-index: 2; }
  .logo-wrap {
    width: 78px; height: 78px;
    background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
    border: 2px solid #c9a84c;
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; flex-shrink: 0;
    position: relative;
    box-shadow: 0 8px 20px -8px rgba(6,78,59,.5);
  }
  .logo-wrap::after {
    content: ""; position: absolute; inset: 3px;
    border: 1px solid rgba(201,168,76,.4); border-radius: 10px; pointer-events: none;
  }
  .logo-img { width: 100%; height: 100%; object-fit: contain; padding: 6px; background: #fff; border-radius: 10px; }
  .logo-fallback { font-family: 'Playfair Display', serif; font-size: 38px; font-weight: 800; color: #f0d78c; }
  .inst { flex: 1; min-width: 0; }
  .inst-name {
    font-family: 'Playfair Display', 'Noto Sans Bengali', serif;
    font-size: 26px; font-weight: 800; letter-spacing: -.3px;
    color: #064e3b; margin-bottom: 4px;
    line-height: 1.15;
  }
  .inst-meta { font-size: 11px; color: #475569; line-height: 1.6; }
  .doc-tag { text-align: right; min-width: 180px; flex-shrink: 0; }
  .doc-tag .badge {
    background: #064e3b;
    color: #f0d78c;
    font-weight: 800;
    padding: 7px 18px;
    border: 1.5px solid #c9a84c;
    border-radius: 4px;
    font-size: 10.5px;
    letter-spacing: 3px;
    display: inline-block;
    font-family: 'Inter', sans-serif;
  }
  .doc-tag .id {
    color: #64748b; font-size: 10px;
    margin-top: 8px;
    font-family: 'Inter', monospace;
    letter-spacing: .5px;
  }

  /* ===== Period Bar (gold-rimmed) ===== */
  .period-bar {
    position: relative;
    padding: 14px 36px;
    background: #064e3b;
    color: #fff;
    display: flex; justify-content: space-between; align-items: center;
    z-index: 2;
  }
  .period-bar::before, .period-bar::after {
    content: ""; position: absolute; left: 0; right: 0; height: 1px; background: #c9a84c;
  }
  .period-bar::before { top: 0; }
  .period-bar::after { bottom: 0; }
  .period-bar .ttl {
    font-family: 'Playfair Display', 'Noto Sans Bengali', serif;
    font-size: 17px; font-weight: 700;
    color: #f0d78c; letter-spacing: .3px;
  }
  .period-bar .ttl span { color: #fff; font-weight: 600; }
  .period-bar .meta-r {
    font-size: 11px; opacity: .92;
    display: flex; gap: 20px; align-items: center;
  }
  .period-bar .meta-r strong { color: #f0d78c; font-weight: 700; margin-left: 4px; }

  /* ===== Body ===== */
  .body { padding: 26px 36px 14px; position: relative; z-index: 2; }

  /* ===== Summary Cards ===== */
  .summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 22px;
  }
  .s-card {
    position: relative;
    padding: 18px 20px 16px;
    border-radius: 8px;
    overflow: hidden;
    background: #fbfcfd;
    border: 1px solid #e5e7eb;
    border-left: 3px solid #94a3b8;
  }
  .s-card .lbl {
    font-size: 9.5px; font-weight: 700;
    letter-spacing: 1.8px; text-transform: uppercase;
    color: #64748b; margin-bottom: 8px;
    display: flex; align-items: center; gap: 6px;
  }
  .s-card .lbl::before {
    content: ""; display: inline-block; width: 5px; height: 5px;
    background: currentColor; border-radius: 50%; opacity: .6;
  }
  .s-card .val {
    font-family: 'Inter', 'Noto Sans Bengali', sans-serif;
    font-size: 24px; font-weight: 800;
    color: #0b1727; font-variant-numeric: tabular-nums;
    letter-spacing: -.5px;
    line-height: 1.1;
  }
  .s-card.base { border-left-color: #1e3a5f; }
  .s-card.base .lbl { color: #1e3a5f; }
  .s-card.ded  { border-left-color: #b91c1c; }
  .s-card.ded  .lbl { color: #b91c1c; }
  .s-card.ded  .val { color: #991b1b; }
  .s-card.net  {
    border-left-color: #064e3b;
    background: linear-gradient(135deg, #f0fdf4 0%, #fbfcfd 100%);
    border-color: #a7f3d0;
  }
  .s-card.net  .lbl { color: #064e3b; }
  .s-card.net  .val { color: #064e3b; font-size: 26px; }

  /* ===== Table ===== */
  .table-wrap {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
    background: #fff;
  }
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 11px;
  }
  thead th {
    background: linear-gradient(180deg, #0b1727 0%, #1e293b 100%);
    color: #f0d78c;
    font-weight: 700;
    padding: 12px 9px;
    text-align: left;
    font-size: 10px;
    letter-spacing: .8px;
    text-transform: uppercase;
    border-bottom: 2px solid #c9a84c;
    white-space: nowrap;
    font-family: 'Inter', 'Noto Sans Bengali', sans-serif;
  }
  thead th.center { text-align: center; }
  thead th.right { text-align: right; }
  tbody td {
    padding: 11px 9px;
    border-bottom: 1px solid #eef2f5;
    vertical-align: middle;
  }
  tbody tr:nth-child(even) td { background: #fafbfc; }
  tbody tr:last-child td { border-bottom: none; }

  .c-num {
    text-align: center; font-weight: 700;
    color: #94a3b8; width: 36px;
    font-family: 'Inter', monospace; font-size: 10.5px;
  }
  .c-name .nm { font-weight: 700; color: #0b1727; font-size: 11.5px; }
  .c-name .sid {
    font-size: 9.5px; color: #94a3b8;
    font-family: 'Inter', monospace;
    margin-top: 2px; letter-spacing: .3px;
  }
  .c-desig { color: #475569; font-weight: 500; font-size: 10.5px; }
  .c-amt {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 600; color: #0b1727;
    font-family: 'Inter', 'Noto Sans Bengali', sans-serif;
  }
  .c-neg { color: #b91c1c; }
  .c-pos-soft { color: #1e3a5f; }
  .c-net {
    color: #064e3b; font-weight: 800;
    font-size: 12.5px; letter-spacing: -.2px;
  }
  .c-pal { text-align: center; white-space: nowrap; }
  .pill {
    display: inline-block;
    min-width: 24px;
    padding: 2px 8px;
    margin: 0 2px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    font-family: 'Inter', monospace;
  }
  .p-p { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
  .p-a { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
  .p-l { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
  .c-status { text-align: center; }
  .badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .5px;
    white-space: nowrap;
    text-transform: uppercase;
    font-family: 'Inter', 'Noto Sans Bengali', sans-serif;
  }
  .b-paid { background: #064e3b; color: #f0d78c; border: 1px solid #c9a84c; }
  .b-pend { background: #fffbeb; color: #92400e; border: 1px solid #fcd34d; }

  /* ===== Totals row ===== */
  .totals td {
    background: #064e3b !important;
    color: #f0d78c !important;
    font-weight: 800;
    font-size: 12px;
    border-top: 2px solid #c9a84c;
    border-bottom: none !important;
    padding: 14px 9px;
    letter-spacing: .3px;
  }
  .totals .c-amt { color: #f0d78c !important; }
  .totals .c-net { color: #fff !important; font-size: 14px; font-weight: 900; }
  .totals .c-amt.c-neg { color: #fecaca !important; }

  /* ===== Meta + Signatures ===== */
  .meta {
    display: flex; justify-content: space-between;
    margin: 18px 0 4px; padding: 12px 18px;
    font-size: 10.5px; color: #475569;
    background: #f8fafc;
    border-radius: 4px;
    border: 1px solid #e5e7eb;
    border-left: 3px solid #c9a84c;
    letter-spacing: .2px;
  }
  .meta strong { color: #0b1727; font-weight: 700; }

  .signatures {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 36px;
    margin: 56px 8px 8px;
  }
  .sig { text-align: center; font-size: 11px; color: #475569; }
  .sig .line {
    border-top: 1.5px solid #0b1727;
    padding-top: 10px;
    margin-top: 36px;
    position: relative;
  }
  .sig .line::before {
    content: ""; position: absolute; left: 50%; top: -5px;
    width: 8px; height: 8px;
    background: #c9a84c;
    border: 1.5px solid #0b1727;
    transform: translateX(-50%) rotate(45deg);
  }
  .sig .role {
    font-family: 'Playfair Display', 'Noto Sans Bengali', serif;
    font-weight: 700; color: #0b1727; font-size: 12.5px;
  }
  .sig .name { font-size: 10px; color: #64748b; margin-top: 3px; font-style: italic; }

  /* ===== Footer ===== */
  .footer {
    margin-top: 26px;
    padding: 16px 36px;
    background: #0b1727;
    color: #94a3b8;
    border-top: 2px solid #c9a84c;
    text-align: center;
    font-size: 10px;
    letter-spacing: .4px;
    position: relative; z-index: 2;
  }
  .footer .gen {
    color: #c9a84c; font-size: 9.5px; margin-top: 4px;
    letter-spacing: 1px; text-transform: uppercase; font-weight: 600;
    font-family: 'Inter', sans-serif;
  }

  @media print {
    body { background: #fff; padding: 0; }
    .sheet { box-shadow: none; border-radius: 0; max-width: 100%; border-top-width: 4px; }
    @page { size: A4 landscape; margin: 8mm; }
  }
</style>
</head><body>
<div class="sheet">
  <div class="watermark">${bn ? "গোপনীয়" : "CONFIDENTIAL"}</div>
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
        <div class="id">Ref: <strong style="color:#0b1727">${sheetId}</strong></div>
      </div>
    </div>
  </div>

  <div class="period-bar">
    <span class="ttl">${bn ? "বেতন বিবরণী" : "Payroll Statement"} <span>— ${monthLabel} ${bn ? toBnDigits(year) : year}</span></span>
    <span class="meta-r">
      <span>${bn ? "ইস্যু তারিখ" : "Issue Date"}<strong>${issueDate}</strong></span>
      <span>${bn ? "মোট স্টাফ" : "Total Staff"}<strong>${bn ? toBnDigits(staff.length) : staff.length}</strong></span>
    </span>
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
