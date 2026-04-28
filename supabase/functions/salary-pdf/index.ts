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
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;500;600;700;800&family=Noto+Sans+Bengali:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap');
  *,*::before,*::after { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body {
    font-family: 'Noto Serif Bengali', 'Inter', 'Times New Roman', serif;
    background: #f1f5f9;
    color: #0f172a;
    padding: 28px 20px;
    line-height: 1.45;
    font-size: 12px;
  }
  .sheet {
    max-width: 1200px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 30px 60px -25px rgba(15, 23, 42, .25), 0 0 0 1px rgba(15, 23, 42, .05);
    position: relative;
  }

  /* Subtle diagonal watermark */
  .sheet::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      135deg,
      transparent 0,
      transparent 80px,
      rgba(13, 148, 136, .015) 80px,
      rgba(13, 148, 136, .015) 160px
    );
    pointer-events: none;
    z-index: 0;
  }

  /* ===== Premium Letterhead ===== */
  .letterhead {
    background: linear-gradient(135deg, #064e3b 0%, #065f46 45%, #047857 100%);
    color: #ffffff;
    padding: 22px 32px 18px;
    position: relative;
    overflow: hidden;
  }
  .letterhead::before {
    content: "";
    position: absolute;
    right: -100px; top: -100px;
    width: 320px; height: 320px;
    background: radial-gradient(circle, rgba(255,255,255,.12) 0%, transparent 65%);
    border-radius: 50%;
  }
  .letterhead::after {
    content: "";
    position: absolute;
    left: -80px; bottom: -120px;
    width: 260px; height: 260px;
    background: radial-gradient(circle, rgba(16,185,129,.25) 0%, transparent 65%);
    border-radius: 50%;
  }
  .letterhead-row {
    display: flex; align-items: center; justify-content: center;
    gap: 22px;
    position: relative; z-index: 1;
  }
  .logo-wrap {
    width: 86px; height: 86px;
    background: rgba(255,255,255,.96);
    border: 3px solid rgba(255,255,255,.5);
    border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; flex-shrink: 0;
    box-shadow: 0 8px 24px -6px rgba(0,0,0,.35);
  }
  .logo-img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }
  .logo-fallback {
    font-size: 38px; font-weight: 800;
    color: #047857;
    font-family: 'Noto Serif Bengali', serif;
  }
  .inst-block { text-align: center; max-width: 720px; }
  .inst-name {
    font-family: 'Noto Serif Bengali', serif;
    font-size: 26px; font-weight: 800;
    color: #ffffff;
    line-height: 1.18;
    letter-spacing: .3px;
    margin-bottom: 5px;
    text-shadow: 0 2px 8px rgba(0,0,0,.18);
  }
  .inst-meta {
    font-size: 11.5px;
    color: rgba(255,255,255,.92);
    line-height: 1.55;
    font-weight: 500;
  }
  .inst-meta span { margin: 0 7px; }
  .inst-meta .sep { opacity: .5; }

  /* Document title bar */
  .doc-title-bar {
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    border-bottom: 2px solid #047857;
    padding: 14px 32px 12px;
    position: relative;
    z-index: 1;
  }
  .doc-title-bar::before {
    content: "";
    position: absolute;
    left: 0; right: 0; bottom: -2px;
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, #047857 30%, #047857 70%, transparent 100%);
  }
  .doc-title-inner {
    display: flex; justify-content: space-between; align-items: center;
    gap: 20px; flex-wrap: wrap;
  }
  .doc-title h2 {
    font-family: 'Noto Serif Bengali', serif;
    font-size: 18px; font-weight: 800;
    color: #064e3b;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 6px 22px;
    background: #ffffff;
    border: 2px solid #047857;
    border-radius: 999px;
    box-shadow: 0 2px 6px rgba(4,120,87,.12);
  }
  .doc-meta {
    display: flex; gap: 14px; align-items: center;
    flex-wrap: wrap;
    font-size: 11px; color: #334155;
  }
  .doc-meta .chip {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    padding: 5px 11px;
    border-radius: 8px;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
  }
  .doc-meta .chip strong {
    color: #047857;
    font-weight: 700;
    margin-right: 5px;
  }

  /* ===== Body ===== */
  .body {
    padding: 22px 32px 18px;
    position: relative;
    z-index: 1;
  }

  /* ===== Premium summary cards ===== */
  .summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 18px;
  }
  .s-card {
    padding: 14px 18px;
    border-radius: 12px;
    position: relative;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    background: #ffffff;
  }
  .s-card::before {
    content: "";
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 4px;
    background: #94a3b8;
  }
  .s-card.base::before { background: linear-gradient(180deg, #3b82f6, #1d4ed8); }
  .s-card.ded::before { background: linear-gradient(180deg, #f59e0b, #b45309); }
  .s-card.net {
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    border-color: #10b981;
  }
  .s-card.net::before { background: linear-gradient(180deg, #10b981, #047857); }
  .s-card .lbl {
    font-size: 10.5px;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: .8px;
    margin-bottom: 6px;
  }
  .s-card.net .lbl { color: #065f46; }
  .s-card .val {
    font-family: 'Noto Sans Bengali', 'Inter', serif;
    font-size: 22px; font-weight: 800;
    color: #0f172a;
    font-variant-numeric: tabular-nums;
    letter-spacing: -.3px;
  }
  .s-card.net .val { color: #064e3b; font-size: 24px; }

  /* ===== Premium table ===== */
  .table-wrap {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #cbd5e1;
    box-shadow: 0 1px 3px rgba(15,23,42,.05);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.5px;
    background: #ffffff;
  }
  thead th {
    background: linear-gradient(180deg, #064e3b 0%, #047857 100%);
    color: #ffffff;
    font-weight: 700;
    padding: 11px 8px;
    text-align: left;
    font-size: 11px;
    letter-spacing: .4px;
    border-right: 1px solid rgba(255,255,255,.12);
    font-family: 'Noto Serif Bengali', serif;
    text-transform: uppercase;
  }
  thead th:last-child { border-right: none; }
  thead th.center { text-align: center; }
  thead th.right { text-align: right; }
  tbody td {
    padding: 10px 8px;
    border-bottom: 1px solid #e2e8f0;
    border-right: 1px solid #f1f5f9;
    vertical-align: middle;
    color: #1e293b;
  }
  tbody td:last-child { border-right: none; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  tbody tr:hover td { background: #f0fdf4; }
  tbody tr:last-child td { border-bottom: none; }

  .c-num {
    text-align: center;
    width: 38px;
    font-weight: 700;
    color: #64748b;
    font-variant-numeric: tabular-nums;
  }
  .c-name .nm {
    font-weight: 700;
    color: #0f172a;
    font-size: 12px;
  }
  .c-name .sid {
    font-size: 9.5px;
    color: #64748b;
    margin-top: 2px;
    font-family: 'Inter', monospace;
    letter-spacing: .3px;
    font-weight: 500;
  }
  .c-desig { color: #334155; font-weight: 500; }
  .c-amt {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #0f172a;
    font-weight: 500;
  }
  .c-net {
    font-weight: 800;
    color: #047857;
    font-size: 12.5px;
  }
  .c-pal {
    text-align: center;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    font-family: 'Inter', sans-serif;
    color: #475569;
    font-weight: 600;
  }
  .c-pal .pal-p { color: #059669; }
  .c-pal .pal-a { color: #dc2626; }
  .c-pal .pal-l { color: #d97706; }
  .c-pal .pal-sep { color: #cbd5e1; margin: 0 3px; }

  /* Totals row */
  .totals td {
    background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%) !important;
    font-weight: 800;
    font-size: 12.5px;
    padding: 12px 8px;
    border-top: 2px solid #047857;
    color: #064e3b;
  }
  .totals .c-amt { text-align: right; }
  .totals .c-net { font-size: 14px; color: #064e3b; }
  .totals td:first-child {
    text-align: center;
    letter-spacing: .3px;
    text-transform: uppercase;
    font-family: 'Noto Serif Bengali', serif;
  }

  /* ===== Note + Signatures ===== */
  .note {
    margin: 16px 0 0;
    padding: 11px 16px;
    font-size: 11px;
    color: #1e293b;
    border-left: 4px solid #047857;
    background: linear-gradient(90deg, #ecfdf5 0%, #f8fafc 100%);
    border-radius: 6px;
    line-height: 1.55;
  }
  .note strong { font-weight: 700; color: #064e3b; }

  .signatures {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 36px;
    margin: 60px 8px 16px;
  }
  .sig {
    text-align: center;
    font-size: 11px;
    color: #475569;
  }
  .sig .sig-name {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    min-height: 20px;
    padding: 0 6px 6px;
    font-family: 'Noto Serif Bengali', serif;
  }
  .sig .line {
    border-top: 1.5px solid #0f172a;
    padding-top: 8px;
    margin-top: 0;
    position: relative;
  }
  .sig .line::before {
    content: "";
    position: absolute;
    top: -3px; left: 50%;
    transform: translateX(-50%);
    width: 6px; height: 6px;
    background: #047857;
    border-radius: 50%;
  }
  .sig .role {
    font-weight: 700;
    color: #0f172a;
    font-size: 11.5px;
    letter-spacing: .3px;
  }
  .sig .role-meta {
    font-size: 9.5px;
    color: #64748b;
    margin-top: 2px;
    font-style: italic;
    font-weight: 500;
  }

  /* ===== Footer ===== */
  .footer {
    margin-top: 22px;
    padding: 12px 32px;
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    border-top: 1px solid #e2e8f0;
    text-align: center;
    font-size: 10.5px;
    color: #475569;
    position: relative;
    z-index: 1;
  }
  .footer .copy { font-weight: 600; color: #334155; }
  .footer .ref {
    margin-top: 4px;
    font-family: 'Inter', monospace;
    font-size: 9.5px;
    letter-spacing: .3px;
    color: #64748b;
  }
  .footer .ref strong { color: #047857; }

  @media print {
    body { padding: 0; background: #fff; }
    .sheet {
      box-shadow: none;
      border-radius: 0;
      max-width: 100%;
      border: none;
    }
    tbody tr:hover td { background: inherit; }
    @page { size: A4 landscape; margin: 8mm; }
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
          ${instPhone ? `<span>${bn ? "📞" : "Phone"}: ${bn ? toBnDigits(instPhone) : instPhone}</span>` : ""}
          ${instPhone && instEmail ? `<span class="sep">|</span>` : ""}
          ${instEmail ? `<span>${bn ? "✉" : "E-mail"}: ${instEmail}</span>` : ""}
        </div>
      </div>
    </div>
  </div>

  <div class="doc-title-bar">
    <div class="doc-title-inner">
      <div class="doc-title">
        <h2>${bn ? "বেতন বিবরণী" : "Salary Statement"}</h2>
      </div>
      <div class="doc-meta">
        <span class="chip"><strong>${bn ? "মাস:" : "Period:"}</strong>${monthLabel} ${bn ? toBnDigits(year) : year}</span>
        <span class="chip"><strong>${bn ? "মোট কর্মী:" : "Staff:"}</strong>${bn ? toBnDigits(staff.length) : staff.length}</span>
        <span class="chip"><strong>${bn ? "স্মারক:" : "Memo:"}</strong>${sheetId}</span>
        <span class="chip"><strong>${bn ? "তারিখ:" : "Date:"}</strong>${issueDate}</span>
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
        <div class="lbl">${bn ? "নিট প্রদেয় বেতন" : "Total Net Payable"}</div>
        <div class="val">৳ ${fmtNum(Number(totals?.net || 0))}</div>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="center" style="width:38px">${bn ? "ক্রঃ" : "SL"}</th>
            <th>${bn ? "কর্মীর নাম ও আইডি" : "Name & ID"}</th>
            <th>${bn ? "পদবি" : "Designation"}</th>
            <th class="right">${bn ? "মূল বেতন (৳)" : "Base (BDT)"}</th>
            <th class="center">${bn ? "উপ / অনু / বি" : "P / A / L"}</th>
            <th class="right">${bn ? "কর্তন (৳)" : "Deduction"}</th>
            <th class="right">${bn ? "ওভারটাইম (৳)" : "Overtime"}</th>
            <th class="right">${bn ? "অগ্রিম (৳)" : "Advance"}</th>
            <th class="right">${bn ? "নিট প্রদেয় (৳)" : "Net Payable"}</th>
          </tr>
        </thead>
        <tbody>
          ${staff.map((s: any, i: number) => `
            <tr>
              <td class="c-num">${bn ? toBnDigits(i + 1) : i + 1}</td>
              <td class="c-name"><div class="nm">${s.name}</div>${s.staff_id && s.staff_id !== '-' ? `<div class="sid">${s.staff_id}</div>` : ""}</td>
              <td class="c-desig">${s.designation}</td>
              <td class="c-amt">${fmtNum(Number(s.base_salary))}</td>
              <td class="c-pal"><span class="pal-p">${bn ? toBnDigits(s.present) : s.present}</span><span class="pal-sep">/</span><span class="pal-a">${bn ? toBnDigits(s.absent) : s.absent}</span><span class="pal-sep">/</span><span class="pal-l">${bn ? toBnDigits(s.late) : s.late}</span></td>
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
            <td class="c-amt">${fmtNum(Number(totals?.deductions || 0))}</td>
            <td></td>
            <td></td>
            <td class="c-amt c-net">${fmtNum(Number(totals?.net || 0))}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="note">
      <strong>${bn ? "নোটঃ" : "Note:"}</strong>
      ${bn
        ? "এই বিবরণীটি সিস্টেম দ্বারা স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত। হিসাবরক্ষক কর্তৃক যাচাইপূর্বক প্রিন্সিপাল মহোদয়ের অনুমোদন গ্রহণ করিতে হইবে।"
        : "This statement is auto-generated. Verification by the Accountant and approval by the Principal is required before disbursement."}
    </div>

    <div class="signatures">
      <div class="sig">
        <div class="sig-name">${accountantName || "&nbsp;"}</div>
        <div class="line">
          <div class="role">${bn ? "প্রস্তুতকারী" : "Prepared by"}</div>
          <div class="role-meta">${bn ? "(হিসাবরক্ষক)" : "(Accountant)"}</div>
        </div>
      </div>
      <div class="sig">
        <div class="sig-name">${verifierName || "&nbsp;"}</div>
        <div class="line">
          <div class="role">${bn ? "যাচাইকারী" : "Verified by"}</div>
          <div class="role-meta">${bn ? "(নিরীক্ষক)" : "(Auditor)"}</div>
        </div>
      </div>
      <div class="sig">
        <div class="sig-name">${principalName || "&nbsp;"}</div>
        <div class="line">
          <div class="role">${bn ? "অনুমোদনকারী" : "Approved by"}</div>
          <div class="role-meta">${bn ? "(প্রিন্সিপাল)" : "(Principal)"}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="copy">${bn ? `© ${instName} — সমস্ত অধিকার সংরক্ষিত।` : `© ${instName} — All rights reserved.`}</div>
    <div class="ref">${bn ? "স্মারক নং:" : "Ref:"} <strong>${sheetId}</strong> &nbsp;•&nbsp; ${bn ? "মুদ্রণ তারিখ:" : "Printed on:"} ${issueDate}</div>
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
