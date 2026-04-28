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
    // Fetch principal/accountant/verifier from website_settings (key-value)
    const { data: wsRows } = await supabase
      .from("website_settings")
      .select("key,value")
      .in("key", [
        "principal_name", "principal_name_en",
        "accountant_name", "accountant_name_en",
        "verifier_name", "verifier_name_en",
      ]);
    const ws: Record<string, string> = {};
    (wsRows || []).forEach((r: any) => { ws[r.key] = r.value || ""; });
    const pickName = (bnKey: string, enKey: string, fallback: string) =>
      (bn ? (ws[bnKey] || ws[enKey]) : (ws[enKey] || ws[bnKey])) ||
      (institution as any)?.[bnKey] || fallback;

    const principalName = pickName("principal_name", "principal_name_en", bn ? "প্রিন্সিপাল" : "Principal");
    const accountantName = pickName("accountant_name", "accountant_name_en", "");
    const verifierName = pickName("verifier_name", "verifier_name_en", "");

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
      </tr>
    `).join("");

    const logoBlock = instLogo
      ? `<img src="${instLogo}" alt="logo" class="logo-img"/>`
      : `<div class="logo-fallback">${(instName || 'A').charAt(0)}</div>`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${bn ? "বেতন বিবরণী" : "Salary Statement"} — ${monthLabel} ${year}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&family=Times+New+Roman&display=swap');
  *,*::before,*::after { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body {
    font-family: 'Noto Serif Bengali', 'Times New Roman', Times, serif;
    background: #ffffff;
    color: #000000;
    padding: 24px;
    line-height: 1.45;
    font-size: 12px;
  }
  .sheet {
    max-width: 1180px;
    margin: 0 auto;
    background: #ffffff;
    border: 1.5px solid #000000;
    padding: 22px 30px 18px;
    position: relative;
  }
  /* Inner double-rule frame */
  .sheet::before {
    content: "";
    position: absolute;
    top: 5px; left: 5px; right: 5px; bottom: 5px;
    border: 0.5px solid #000000;
    pointer-events: none;
  }

  /* ===== Letterhead ===== */
  .letterhead {
    text-align: center;
    padding: 4px 0 14px;
    border-bottom: 1px solid #000;
    position: relative;
  }
  .letterhead-row {
    display: flex; align-items: center; justify-content: center;
    gap: 18px; margin-bottom: 4px;
  }
  .logo-wrap {
    width: 70px; height: 70px;
    border: 1px solid #000;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; flex-shrink: 0;
    background: #fff;
  }
  .logo-img { width: 100%; height: 100%; object-fit: contain; padding: 3px; }
  .logo-fallback { font-size: 32px; font-weight: 700; color: #000; font-family: 'Noto Serif Bengali', serif; }
  .inst-block { text-align: center; }
  .inst-name {
    font-family: 'Noto Serif Bengali', 'Times New Roman', serif;
    font-size: 24px; font-weight: 700;
    color: #000; line-height: 1.2;
    letter-spacing: .3px;
    margin-bottom: 3px;
  }
  .inst-meta {
    font-size: 11px; color: #000;
    line-height: 1.45;
  }
  .inst-meta span { margin: 0 6px; }
  .estd { font-size: 10px; color: #000; margin-top: 2px; font-style: italic; }

  /* Document title — official statement caption */
  .doc-title {
    text-align: center;
    margin: 14px 0 4px;
    position: relative;
  }
  .doc-title h2 {
    display: inline-block;
    font-family: 'Noto Serif Bengali', serif;
    font-size: 16px; font-weight: 700;
    color: #000;
    padding: 4px 18px;
    border: 1px solid #000;
    letter-spacing: .5px;
    background: #fff;
  }
  .doc-meta-row {
    display: flex; justify-content: space-between;
    margin: 10px 2px 0;
    font-size: 11px; color: #000;
  }
  .doc-meta-row .left, .doc-meta-row .right {
    display: flex; gap: 16px;
  }
  .doc-meta-row strong { font-weight: 700; }

  /* ===== Body ===== */
  .body { padding: 14px 0 4px; }

  /* ===== Summary (clean inline grid) ===== */
  .summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border: 1px solid #000;
    margin-bottom: 14px;
  }
  .s-card {
    padding: 10px 14px;
    border-right: 1px solid #000;
    text-align: center;
  }
  .s-card:last-child { border-right: none; }
  .s-card .lbl {
    font-size: 11px; font-weight: 600;
    color: #000; margin-bottom: 4px;
    letter-spacing: .2px;
  }
  .s-card .val {
    font-family: 'Noto Sans Bengali', 'Times New Roman', serif;
    font-size: 18px; font-weight: 700;
    color: #000; font-variant-numeric: tabular-nums;
  }
  .s-card.net { background: #f4f4f4; }
  .s-card.net .val { font-size: 19px; }

  /* ===== Table — official ledger style ===== */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    border: 1px solid #000;
  }
  thead th {
    background: #e8e8e8;
    color: #000;
    font-weight: 700;
    padding: 8px 6px;
    text-align: left;
    font-size: 11px;
    border: 1px solid #000;
    font-family: 'Noto Serif Bengali', serif;
  }
  thead th.center { text-align: center; }
  thead th.right { text-align: right; }
  tbody td {
    padding: 7px 6px;
    border: 1px solid #000;
    vertical-align: middle;
    color: #000;
  }
  .c-num { text-align: center; width: 32px; font-variant-numeric: tabular-nums; }
  .c-name .nm { font-weight: 700; color: #000; }
  .c-name .sid {
    font-size: 9.5px; color: #333;
    margin-top: 1px; font-family: 'Times New Roman', serif;
    letter-spacing: .2px;
  }
  .c-desig { color: #000; }
  .c-amt {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #000;
  }
  .c-net { font-weight: 700; }
  .c-pal { text-align: center; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .c-status { text-align: center; font-size: 10.5px; }

  /* Totals row */
  .totals td {
    background: #d8d8d8;
    font-weight: 700;
    font-size: 12px;
    padding: 9px 6px;
    border: 1px solid #000;
    color: #000;
  }
  .totals .c-amt { text-align: right; }
  .totals .c-net { font-size: 13px; }

  /* ===== Note + Signatures ===== */
  .note {
    margin: 12px 0 0;
    padding: 8px 12px;
    font-size: 10.5px;
    color: #000;
    border: 1px solid #000;
    background: #fafafa;
  }
  .note strong { font-weight: 700; }

  .signatures {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 30px;
    margin: 60px 4px 8px;
  }
  .sig { text-align: center; font-size: 11px; color: #000; }
  .sig .sig-name {
    font-size: 12px;
    font-weight: 700;
    color: #000;
    min-height: 18px;
    padding: 0 6px 4px;
  }
  .sig .line {
    border-top: 1px solid #000;
    padding-top: 6px;
    margin-top: 0;
  }
  .sig .role { font-weight: 700; color: #000; font-size: 12px; }

  /* ===== Footer (official seal line) ===== */
  .footer {
    margin-top: 18px;
    padding: 8px 0 4px;
    border-top: 1px solid #000;
    text-align: center;
    font-size: 10px;
    color: #000;
    font-style: italic;
  }
  .footer .ref {
    margin-top: 3px;
    font-style: normal;
    font-family: 'Times New Roman', serif;
    font-size: 9.5px;
    letter-spacing: .3px;
  }

  @media print {
    body { padding: 0; }
    .sheet { border: 1.5px solid #000; max-width: 100%; }
    @page { size: A4 landscape; margin: 10mm; }
  }
</style>
</head><body>
<div class="sheet">
  <div class="letterhead">
    <div class="letterhead-row">
      <div class="logo-wrap">${logoBlock}</div>
      <div class="inst-block">
        <div class="inst-name">${instName}</div>
        <div class="inst-meta">
          ${instAddress ? `<span>${instAddress}</span>` : ""}
        </div>
        <div class="inst-meta">
          ${instPhone ? `<span>${bn ? "ফোন" : "Phone"}: ${bn ? toBnDigits(instPhone) : instPhone}</span>` : ""}
          ${instEmail ? `<span>${bn ? "ইমেইল" : "E-mail"}: ${instEmail}</span>` : ""}
        </div>
      </div>
    </div>
  </div>

  <div class="doc-title">
    <h2>${bn ? "বেতন বিবরণী" : "SALARY STATEMENT"}</h2>
    <div class="doc-meta-row">
      <div class="left">
        <span><strong>${bn ? "মাস:" : "Period:"}</strong> ${monthLabel} ${bn ? toBnDigits(year) : year}</span>
        <span><strong>${bn ? "মোট কর্মী:" : "Total Staff:"}</strong> ${bn ? toBnDigits(staff.length) : staff.length}</span>
      </div>
      <div class="right">
        <span><strong>${bn ? "স্মারক নং:" : "Memo No.:"}</strong> ${sheetId}</span>
        <span><strong>${bn ? "ইস্যু তারিখ:" : "Issue Date:"}</strong> ${issueDate}</span>
      </div>
    </div>
  </div>

  <div class="body">
    <div class="summary">
      <div class="s-card base">
        <div class="lbl">${bn ? "মোট মূল বেতন" : "Total Base Salary"}</div>
        <div class="val">৳ ${fmtNum(Number(totals?.base || 0))}</div>
      </div>
      <div class="s-card ded">
        <div class="lbl">${bn ? "মোট কর্তন" : "Total Deductions"}</div>
        <div class="val">৳ ${fmtNum(Number(totals?.deductions || 0))}</div>
      </div>
      <div class="s-card net">
        <div class="lbl">${bn ? "মোট নিট বেতন (প্রদেয়)" : "Total Net Payable"}</div>
        <div class="val">৳ ${fmtNum(Number(totals?.net || 0))}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="center" style="width:32px">${bn ? "ক্রঃ" : "SL"}</th>
          <th>${bn ? "কর্মীর নাম ও আইডি" : "Name & ID"}</th>
          <th>${bn ? "পদবি" : "Designation"}</th>
          <th class="right">${bn ? "মূল বেতন (৳)" : "Base (BDT)"}</th>
          <th class="center">${bn ? "উপ/অনু/বি" : "P / A / L"}</th>
          <th class="right">${bn ? "কর্তন (৳)" : "Deduction"}</th>
          <th class="right">${bn ? "ওভারটাইম (৳)" : "Overtime"}</th>
          <th class="right">${bn ? "অগ্রিম (৳)" : "Advance"}</th>
          <th class="right">${bn ? "নিট প্রদেয় (৳)" : "Net Payable"}</th>
        </tr>
      </thead>
      <tbody>
        ${staffRows}
        <tr class="totals">
          <td colspan="3" style="text-align:center">${bn ? "সর্বমোট" : "Grand Total"} (${bn ? toBnDigits(staff.length) : staff.length} ${bn ? "জন" : "staff"})</td>
          <td class="c-amt">${fmtNum(Number(totals?.base || 0))}</td>
          <td></td>
          <td class="c-amt">${fmtNum(Number(totals?.deductions || 0))}</td>
          <td></td>
          <td></td>
          <td class="c-amt c-net">${fmtNum(Number(totals?.net || 0))}</td>
        </tr>
      </tbody>
    </table>

    <div class="note">
      <strong>${bn ? "নোট:" : "Note:"}</strong>
      ${bn
        ? "এই বিবরণীটি সিস্টেম দ্বারা স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত। হিসাবরক্ষক কর্তৃক যাচাইপূর্বক প্রিন্সিপাল মহোদয়ের অনুমোদন গ্রহণ করিতে হইবে।"
        : "This statement is auto-generated. Verification by the Accountant and approval by the Principal is required before disbursement."}
    </div>

    <div class="signatures">
      <div class="sig">
        <div class="sig-name">${accountantName || ""}</div>
        <div class="line">
          <div class="role">${bn ? "প্রস্তুতকারী (হিসাবরক্ষক)" : "Prepared by (Accountant)"}</div>
        </div>
      </div>
      <div class="sig">
        <div class="sig-name">${verifierName || ""}</div>
        <div class="line">
          <div class="role">${bn ? "যাচাইকারী" : "Verified by"}</div>
        </div>
      </div>
      <div class="sig">
        <div class="sig-name">${principalName || ""}</div>
        <div class="line">
          <div class="role">${bn ? "অনুমোদনকারী (প্রিন্সিপাল)" : "Approved by (Principal)"}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div>${bn ? `© ${instName} — সমস্ত অধিকার সংরক্ষিত।` : `© ${instName} — All rights reserved.`}</div>
    <div class="ref">${bn ? "স্মারক:" : "Ref:"} ${sheetId} &nbsp;•&nbsp; ${bn ? "মুদ্রণ তারিখ:" : "Printed on:"} ${issueDate}</div>
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
