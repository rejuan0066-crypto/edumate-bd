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

    // Fetch institution info + website_settings (full fallback for any missing field)
    const [{ data: institution }, { data: wsRows }] = await Promise.all([
      supabase.from("institutions").select("*").eq("is_default", true).maybeSingle(),
      supabase.from("website_settings").select("key,value").in("key", [
        "institution_name", "institution_name_en",
        "address", "address_en",
        "phone", "email", "logo_url",
        "established_year", "registration_number",
        "principal_name", "principal_name_en",
        "accountant_name", "accountant_name_en",
        "verifier_name", "verifier_name_en",
      ]),
    ]);
    const ws: Record<string, string> = {};
    (wsRows || []).forEach((r: any) => {
      ws[r.key] = (typeof r.value === 'string' ? r.value : (r.value ?? '')) || '';
    });
    const inst: any = institution || {};

    // Pick: institutions row (primary) → website_settings (legacy mirror) → fallback
    const pick = (instKey: string, wsKey: string, fallback = "") => {
      const a = inst[instKey];
      if (a != null && String(a).trim() !== '') return String(a).trim();
      const b = ws[wsKey];
      if (b != null && String(b).trim() !== '') return String(b).trim();
      return fallback;
    };

    const instName = pick("name", "institution_name", bn ? "প্রতিষ্ঠান" : "Institution");
    const instAddress = pick("address", "address", "");
    const instPhone = pick("phone", "phone", "");
    const instEmail = pick("email", "email", "");
    const instLogo = pick("logo_url", "logo_url", "");

    const principalName = pick("principal_name", "principal_name", bn ? "প্রিন্সিপাল" : "Principal");
    const accountantName = pick("accountant_name", "accountant_name", "");
    const verifierName = pick("verifier_name", "verifier_name", "");

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
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;500;600;700&family=Tinos:ital,wght@0,400;0,700;1,400&display=swap');
  *,*::before,*::after { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body {
    background: #ffffff;
    color: #000000;
    font-family: 'Noto Serif Bengali', 'Tinos', 'Times New Roman', serif;
    font-size: 11.5pt;
    line-height: 1.4;
  }
  body { padding: 14mm 12mm; }

  .sheet {
    max-width: 280mm;
    margin: 0 auto;
    background: #fff;
    border: 1.5pt solid #000;
    padding: 10mm 12mm 12mm;
    position: relative;
  }

  /* ===== Letterhead — single, centred, official ===== */
  .letterhead {
    text-align: center;
    border-bottom: 2pt double #000;
    padding-bottom: 8pt;
    margin-bottom: 10pt;
    position: relative;
    min-height: 78px;
  }
  .logo-wrap {
    position: absolute;
    left: 0; top: 2pt;
    width: 78px; height: 78px;
    border: 1pt solid #000;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
    background: #fff;
  }
  .logo-img { width: 100%; height: 100%; object-fit: contain; padding: 2px; }
  .logo-fallback {
    font-size: 36px; font-weight: 700;
    color: #000;
    font-family: 'Noto Serif Bengali', serif;
  }
  .inst-name {
    font-family: 'Noto Serif Bengali', 'Tinos', serif;
    font-size: 22pt;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: .2pt;
    color: #000;
    margin: 0 0 4pt;
  }
  .inst-address {
    font-size: 11pt;
    line-height: 1.35;
    color: #000;
  }
  .inst-contact {
    font-size: 10.5pt;
    color: #000;
    margin-top: 2pt;
  }
  .inst-contact .sep { margin: 0 6pt; }

  /* ===== Document title ===== */
  .doc-title {
    text-align: center;
    margin: 8pt 0 10pt;
  }
  .doc-title h2 {
    font-family: 'Noto Serif Bengali', 'Tinos', serif;
    font-size: 15pt;
    font-weight: 700;
    color: #000;
    letter-spacing: 1pt;
    text-transform: uppercase;
    display: inline-block;
    padding: 3pt 18pt;
    border: 1.25pt solid #000;
    border-radius: 2pt;
  }
  .doc-period {
    margin-top: 5pt;
    font-size: 11pt;
    color: #000;
  }
  .doc-period strong { font-weight: 700; }

  /* Memo / date row */
  .memo-row {
    display: flex; justify-content: space-between;
    font-size: 10.5pt;
    margin: 6pt 0 10pt;
    color: #000;
  }
  .memo-row span strong { font-weight: 700; }

  /* ===== Table ===== */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5pt;
    color: #000;
  }
  thead th {
    background: #f1f1f1;
    color: #000;
    font-weight: 700;
    padding: 6pt 5pt;
    text-align: left;
    border: 0.75pt solid #000;
    font-family: 'Noto Serif Bengali', 'Tinos', serif;
    vertical-align: middle;
  }
  thead th.center { text-align: center; }
  thead th.right { text-align: right; }
  tbody td {
    padding: 5pt 5pt;
    border: 0.5pt solid #000;
    vertical-align: middle;
    color: #000;
  }
  tbody tr:nth-child(even) td { background: #fafafa; }

  .c-num { text-align: center; width: 28pt; font-variant-numeric: tabular-nums; }
  .c-name .nm { font-weight: 700; }
  .c-name .sid {
    font-size: 9pt;
    color: #333;
    margin-top: 1pt;
    font-family: 'Tinos', monospace;
  }
  .c-amt {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .c-net { font-weight: 700; }
  .c-pal {
    text-align: center;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .c-pal .pal-sep { margin: 0 2pt; color: #888; }

  .totals td {
    background: #e8e8e8 !important;
    font-weight: 700;
    border: 1pt solid #000;
    padding: 7pt 5pt;
  }
  .totals td:first-child {
    text-align: center;
    text-transform: uppercase;
    letter-spacing: .4pt;
  }

  /* ===== Note ===== */
  .note {
    margin: 12pt 0 0;
    padding: 6pt 8pt;
    font-size: 10pt;
    color: #000;
    border: 0.5pt solid #000;
    background: #fafafa;
    line-height: 1.45;
  }
  .note strong { font-weight: 700; }

  /* ===== Signatures ===== */
  .signatures {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 18mm;
    margin: 26mm 4mm 4mm;
  }
  .sig {
    text-align: center;
    font-size: 10.5pt;
    color: #000;
  }
  .sig .sig-name {
    font-family: 'Noto Serif Bengali', 'Tinos', serif;
    font-size: 11pt;
    font-weight: 700;
    min-height: 14pt;
    margin-bottom: 2pt;
    color: #000;
  }
  .sig .line {
    border-top: 1pt solid #000;
    padding-top: 4pt;
  }
  .sig .role {
    font-weight: 700;
    color: #000;
    font-size: 10.5pt;
  }
  .sig .role-meta {
    font-size: 9.5pt;
    color: #333;
    margin-top: 1pt;
    font-style: italic;
  }

  /* ===== Footer ===== */
  .footer {
    margin-top: 10pt;
    padding-top: 6pt;
    border-top: 0.5pt solid #000;
    text-align: center;
    font-size: 9pt;
    color: #000;
  }
  .footer .ref {
    margin-top: 2pt;
    font-family: 'Tinos', monospace;
    font-size: 8.5pt;
    color: #333;
  }

  @media print {
    body { padding: 0; background: #fff; }
    .sheet { border: 1.25pt solid #000; max-width: 100%; }
    @page { size: A4 landscape; margin: 8mm; }
  }
</style>
</head><body>
<div class="sheet">

  <div class="letterhead">
    <div class="logo-wrap">${logoBlock}</div>
    <div class="inst-name">${instName}</div>
    ${instAddress ? `<div class="inst-address">${instAddress}</div>` : ""}
    <div class="inst-contact">
      ${instPhone ? `<span>${bn ? "ফোন" : "Phone"}: ${bn ? toBnDigits(instPhone) : instPhone}</span>` : ""}
      ${instPhone && instEmail ? `<span class="sep">|</span>` : ""}
      ${instEmail ? `<span>${bn ? "ইমেইল" : "E-mail"}: ${instEmail}</span>` : ""}
    </div>
  </div>

  <div class="doc-title">
    <h2>${bn ? "বেতন বিবরণী" : "Salary Statement"}</h2>
    <div class="doc-period"><strong>${bn ? "মাস:" : "For the month of:"}</strong> ${monthLabel} ${bn ? toBnDigits(year) : year}</div>
  </div>

  <div class="memo-row">
    <span><strong>${bn ? "স্মারক নং:" : "Memo No:"}</strong> ${sheetId}</span>
    <span><strong>${bn ? "তারিখ:" : "Date:"}</strong> ${issueDate}</span>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center" style="width:28pt">${bn ? "ক্রঃ" : "SL"}</th>
        <th>${bn ? "কর্মীর নাম ও আইডি" : "Name & ID"}</th>
        <th>${bn ? "পদবি" : "Designation"}</th>
        <th class="right">${bn ? "মূল বেতন (৳)" : "Base (BDT)"}</th>
        <th class="center" style="width:30pt">${bn ? "উপ" : "P"}</th>
        <th class="center" style="width:30pt">${bn ? "অনু" : "A"}</th>
        <th class="center" style="width:30pt">${bn ? "বি" : "L"}</th>
        <th class="right">${bn ? "কর্তন (৳)" : "Deduction"}</th>
        <th class="right">${bn ? "ওভারটাইম (৳)" : "Overtime"}</th>
        <th class="right">${bn ? "জমা (৳)" : "Deposit"}</th>
        <th class="right">${bn ? "নিট প্রদেয় (৳)" : "Net Payable"}</th>
      </tr>
    </thead>
    <tbody>
      ${staff.map((s: any, i: number) => `
        <tr>
          <td class="c-num">${bn ? toBnDigits(i + 1) : i + 1}</td>
          <td class="c-name"><div class="nm">${s.name}</div>${s.staff_id && s.staff_id !== '-' ? `<div class="sid">${s.staff_id}</div>` : ""}</td>
          <td>${s.designation}</td>
          <td class="c-amt">${fmtNum(Number(s.base_salary))}</td>
          <td class="c-num">${bn ? toBnDigits(s.present) : s.present}</td>
          <td class="c-num">${bn ? toBnDigits(s.absent) : s.absent}</td>
          <td class="c-num">${bn ? toBnDigits(s.late) : s.late}</td>
          <td class="c-amt">${Number(s.deductions) > 0 ? fmtNum(Number(s.deductions)) : "—"}</td>
          <td class="c-amt">${Number(s.overtime || 0) > 0 ? fmtNum(Number(s.overtime)) : "—"}</td>
          <td class="c-amt">${Number(s.advance || 0) > 0 ? fmtNum(Number(s.advance)) : "—"}</td>
          <td class="c-amt c-net">${fmtNum(Number(s.net_salary))}</td>
        </tr>
      `).join("")}
      <tr class="totals">
        <td colspan="3">${bn ? "সর্বমোট" : "Grand Total"} (${bn ? toBnDigits(staff.length) : staff.length} ${bn ? "জন" : "staff"})</td>
        <td class="c-amt">${fmtNum(Number(totals?.base || 0))}</td>
        <td></td>
        <td></td>
        <td></td>
        <td class="c-amt">${fmtNum(Number(totals?.deductions || 0))}</td>
        <td></td>
        <td></td>
        <td class="c-amt c-net">${fmtNum(Number(totals?.net || 0))}</td>
      </tr>
    </tbody>
  </table>

  <div class="note">
    <strong>${bn ? "নোটঃ" : "Note:"}</strong>
    ${bn
      ? "এই বিবরণীটি সিস্টেম দ্বারা স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত। হিসাবরক্ষক কর্তৃক যাচাইপূর্বক প্রিন্সিপাল মহোদয়ের অনুমোদন গ্রহণ করিতে হইবে।"
      : "This statement is auto-generated. Verification by the Accountant and approval by the Principal is required before disbursement."}
  </div>

  <div class="signatures">
    <div class="sig">
      <div class="sig-line"></div>
      <div class="sig-name">${accountantName || "&nbsp;"}</div>
      <div class="role">${bn ? "প্রস্তুতকারী" : "Prepared by"}</div>
      <div class="role-meta">${bn ? "(হিসাবরক্ষক)" : "(Accountant)"}</div>
    </div>
    <div class="sig">
      <div class="sig-line"></div>
      <div class="sig-name">${verifierName || "&nbsp;"}</div>
      <div class="role">${bn ? "যাচাইকারী" : "Verified by"}</div>
      <div class="role-meta">${bn ? "(নিরীক্ষক)" : "(Auditor)"}</div>
    </div>
    <div class="sig">
      <div class="sig-line"></div>
      <div class="sig-name">${principalName || "&nbsp;"}</div>
      <div class="role">${bn ? "অনুমোদনকারী" : "Approved by"}</div>
      <div class="role-meta">${bn ? "(প্রিন্সিপাল)" : "(Principal)"}</div>
    </div>
  </div>

  <div class="footer">
    <div>${bn ? `© ${instName}` : `© ${instName}`}</div>
    <div class="ref">${bn ? "স্মারক:" : "Ref:"} ${sheetId} &nbsp;•&nbsp; ${bn ? "মুদ্রণ:" : "Printed:"} ${issueDate}</div>
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
