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

    // ===== Server-side authorization =====
    // Only admin / super_admin (or users with explicit view permission on
    // /admin/salary) may generate salary PDFs. We use a service-role client
    // here so the role lookup itself isn't subject to the caller's RLS.
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      console.error("salary-pdf: SUPABASE_SERVICE_ROLE_KEY not configured");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500, headers: corsHeaders });
    }
    const adminClient = createClient(supabaseUrl, serviceKey);

    const [{ data: roleRows, error: roleErr }, { data: hasPerm, error: permErr }] = await Promise.all([
      adminClient.from("user_roles").select("role").eq("user_id", user.id),
      adminClient.rpc("has_menu_permission", {
        _user_id: user.id,
        _menu_path: "/admin/salary",
        _action: "view",
      }),
    ]);

    if (roleErr) {
      console.error("salary-pdf: role lookup failed", roleErr);
      return new Response(JSON.stringify({ error: "Authorization check failed" }), { status: 500, headers: corsHeaders });
    }

    const roles = (roleRows || []).map((r: any) => r.role);
    const isAdmin = roles.includes("admin") || roles.includes("super_admin");
    const hasSalaryView = !permErr && hasPerm === true;

    if (!isAdmin && !hasSalaryView) {
      console.warn(`salary-pdf: forbidden access by user=${user.id} email=${user.email} roles=${JSON.stringify(roles)}`);
      return new Response(
        JSON.stringify({ error: "Forbidden", message: "Only administrators may generate salary PDFs." }),
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { monthYear, monthLabel, year, language, staff, totals,
      prepared_by, prepared_by_role, verified_by, verified_by_role,
      approved_by, approved_by_role, paid_by, paid_by_role } = body;

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
    const instEstablished = bn
      ? pick("established_year", "established_year", "")
      : (pick("established_year_en", "established_year_en", "") || pick("established_year", "established_year", ""));
    const instRegNo = bn
      ? pick("registration_number", "registration_number", "")
      : (pick("registration_number_en", "registration_number_en", "") || pick("registration_number", "registration_number", ""));

    const principalName = pick("principal_name", "principal_name", bn ? "প্রিন্সিপাল" : "Principal");
    const accountantName = pick("accountant_name", "accountant_name", "");
    const verifierName = pick("verifier_name", "verifier_name", "");

    const sheetId = `SS-${monthYear || ""}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const issueDate = new Date().toLocaleDateString(bn ? "bn-BD" : "en-GB");

    const escapeHtml = (val: unknown): string => String(val ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch] as string));

    const logoBlock = instLogo
      ? `<img src="${escapeHtml(instLogo)}" alt="logo" class="logo-img"/>`
      : `<div class="logo-fallback">${escapeHtml((instName || 'A').charAt(0))}</div>`;

    const colGroup = `
      <colgroup>
        <col style="width:4%"/>
        <col style="width:18%"/>
        <col style="width:14%"/>
        <col style="width:9%"/>
        <col style="width:4%"/>
        <col style="width:4%"/>
        <col style="width:4%"/>
        <col style="width:9%"/>
        <col style="width:9%"/>
        <col style="width:9%"/>
        <col style="width:16%"/>
      </colgroup>`;

    const renderPageHeader = () => `
      <tr class="page-header-row">
        <th colspan="11" class="header-cell">
          <div class="page-header">
            <div class="letterhead">
              <div class="logo-wrap">${logoBlock}</div>
              <div class="inst-name">${escapeHtml(instName)}</div>
              ${instAddress ? `<div class="inst-address">${escapeHtml(instAddress)}</div>` : ""}
              <div class="inst-contact">
                ${instPhone ? `<span>${bn ? "ফোন" : "Phone"}: ${escapeHtml(bn ? toBnDigits(instPhone) : instPhone)}</span>` : ""}
                ${instPhone && instEmail ? `<span class="sep">|</span>` : ""}
                ${instEmail ? `<span>${bn ? "ইমেইল" : "E-mail"}: ${escapeHtml(instEmail)}</span>` : ""}
              </div>
              ${(instEstablished || instRegNo) ? `
              <div class="inst-contact">
                ${instEstablished ? `<span>${bn ? "স্থাপিত" : "Established"}: ${escapeHtml(bn ? toBnDigits(instEstablished) : instEstablished)}</span>` : ""}
                ${instEstablished && instRegNo ? `<span class="sep">|</span>` : ""}
                ${instRegNo ? `<span>${bn ? "রেজিঃ নং" : "Reg. No"}: ${escapeHtml(bn ? toBnDigits(instRegNo) : instRegNo)}</span>` : ""}
              </div>` : ""}
            </div>

            <div class="doc-title">
              <h2>${bn ? "বেতন বিবরণী" : "Salary Statement"}</h2>
              <div class="doc-period"><strong>${bn ? "মাস:" : "For the month of:"}</strong> ${escapeHtml(monthLabel)} ${escapeHtml(bn ? toBnDigits(year) : year)}</div>
            </div>

            <div class="memo-row">
              <span><strong>${bn ? "স্মারক নং:" : "Memo No:"}</strong> ${escapeHtml(sheetId)}</span>
              <span><strong>${bn ? "তারিখ:" : "Date:"}</strong> ${escapeHtml(issueDate)}</span>
            </div>
          </div>
        </th>
      </tr>`;

    const renderColumnHeaders = () => `
      <tr class="column-header-row">
        <th class="center">${bn ? "ক্রঃ" : "SL"}</th>
        <th>${bn ? "কর্মীর নাম ও আইডি" : "Name & ID"}</th>
        <th>${bn ? "পদবি" : "Designation"}</th>
        <th class="right">${bn ? "মূল বেতন (৳)" : "Base (BDT)"}</th>
        <th class="center">${bn ? "উপ" : "P"}</th>
        <th class="center">${bn ? "অনু" : "A"}</th>
        <th class="center">${bn ? "বি" : "L"}</th>
        <th class="right">${bn ? "কর্তন (৳)" : "Deduction"}</th>
        <th class="right">${bn ? "ওভারটাইম (৳)" : "Overtime"}</th>
        <th class="right">${bn ? "জমা (৳)" : "Deposit"}</th>
        <th class="right">${bn ? "নিট প্রদেয় (৳)" : "Net Payable"}</th>
      </tr>`;

    const renderStaffRows = (rows: any[], startIndex: number) => rows.map((s: any, i: number) => `
      <tr class="staff-row">
        <td class="c-num">${bn ? toBnDigits(startIndex + i + 1) : startIndex + i + 1}</td>
        <td class="c-name"><div class="nm">${escapeHtml(s.name)}</div>${s.staff_id && s.staff_id !== '-' ? `<div class="sid">${escapeHtml(s.staff_id)}</div>` : ""}</td>
        <td>${escapeHtml(s.designation)}</td>
        <td class="c-amt">${fmtNum(Number(s.base_salary))}</td>
        <td class="c-num">${bn ? toBnDigits(s.present) : s.present}</td>
        <td class="c-num">${bn ? toBnDigits(s.absent) : s.absent}</td>
        <td class="c-num">${bn ? toBnDigits(s.late) : s.late}</td>
        <td class="c-amt">${Number(s.deductions) > 0 ? fmtNum(Number(s.deductions)) : "—"}</td>
        <td class="c-amt">${Number(s.overtime || 0) > 0 ? fmtNum(Number(s.overtime)) : "—"}</td>
        <td class="c-amt">${Number(s.advance || 0) > 0 ? fmtNum(Number(s.advance)) : "—"}</td>
        <td class="c-amt c-net">${fmtNum(Number(s.net_salary))}</td>
      </tr>
    `).join("");

    const renderTotalsAndNote = () => `
      <tr class="totals">
        <td colspan="3">${bn ? "সর্বমোট" : "Grand Total"} (${bn ? toBnDigits(staff.length) : staff.length} ${bn ? "জন" : "staff"})</td>
        <td class="c-amt">${fmtNum(Number(totals?.base || 0))}</td>
        <td></td><td></td><td></td>
        <td class="c-amt">${fmtNum(Number(totals?.deductions || 0))}</td>
        <td></td><td></td>
        <td class="c-amt c-net">${fmtNum(Number(totals?.net || 0))}</td>
      </tr>
      <tr class="note-row">
        <td colspan="11" class="note-cell">
          <strong>${bn ? "নোটঃ" : "Note:"}</strong>
          ${bn
            ? "এই বিবরণীটি সিস্টেম দ্বারা স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত। কোষাধক্য কর্তৃক যাচাইপূর্বক প্রিন্সিপাল মহোদয়ের অনুমোদন গ্রহণ করিতে হইবে।"
            : "This statement is auto-generated. Verification by the Accountant and approval by the Principal is required before disbursement."}
        </td>
      </tr>`;

    const renderFooter = () => `
      <tfoot>
        <tr>
          <td colspan="11" class="footer-cell">
            <div class="footer-inner">
              <div class="signatures" style="--sig-cols: ${(paid_by && String(paid_by).trim()) ? 4 : 3};">
                <div class="sig">
                  <div class="sig-line"></div>
                  <div class="sig-name">${escapeHtml((prepared_by && String(prepared_by).trim()) || accountantName || "\u00A0")}</div>
                  <div class="role">${bn ? "প্রস্তুতকারী" : "Prepared by"}</div>
                  <div class="role-meta">${escapeHtml((prepared_by_role && String(prepared_by_role).trim()) ? `(${prepared_by_role})` : (bn ? "(কোষাধক্য)" : "(Accountant)"))}</div>
                </div>
                <div class="sig">
                  <div class="sig-line"></div>
                  <div class="sig-name">${escapeHtml((verified_by && String(verified_by).trim()) || verifierName || "\u00A0")}</div>
                  <div class="role">${bn ? "যাচাইকারী" : "Verified by"}</div>
                  <div class="role-meta">${escapeHtml((verified_by_role && String(verified_by_role).trim()) ? `(${verified_by_role})` : (bn ? "(নিরীক্ষক)" : "(Auditor)"))}</div>
                </div>
                <div class="sig">
                  <div class="sig-line"></div>
                  <div class="sig-name">${escapeHtml((approved_by && String(approved_by).trim()) || principalName || "\u00A0")}</div>
                  <div class="role">${bn ? "অনুমোদনকারী" : "Approved by"}</div>
                  <div class="role-meta">${escapeHtml((approved_by_role && String(approved_by_role).trim()) ? `(${approved_by_role})` : (bn ? "(প্রিন্সিপাল)" : "(Principal)"))}</div>
                </div>
                ${(paid_by && String(paid_by).trim()) ? `
                <div class="sig">
                  <div class="sig-line"></div>
                  <div class="sig-name">${escapeHtml(paid_by)}</div>
                  <div class="role">${bn ? "পরিশোধকারী" : "Paid by"}</div>
                  <div class="role-meta">${escapeHtml((paid_by_role && String(paid_by_role).trim()) ? `(${paid_by_role})` : (bn ? "(কোষাধ্যক্ষ)" : "(Treasurer)"))}</div>
                </div>` : ''}
              </div>
              <div class="footer">
                <div>© ${escapeHtml(instName)}</div>
                <div class="ref">${bn ? "স্মারক:" : "Ref:"} ${escapeHtml(sheetId)} &nbsp;•&nbsp; ${bn ? "মুদ্রণ:" : "Printed:"} ${escapeHtml(issueDate)}</div>
              </div>
            </div>
          </td>
        </tr>
      </tfoot>`;

    const rowsPerPage = 12;
    const staffPages: any[][] = [];
    for (let i = 0; i < staff.length; i += rowsPerPage) staffPages.push(staff.slice(i, i + rowsPerPage));
    if (staffPages.length === 0) staffPages.push([]);
    const pagesHtml = staffPages.map((pageRows, pageIndex) => `
      <section class="salary-page">
        <table class="page-table">
          ${colGroup}
          <thead>${renderPageHeader()}${renderColumnHeaders()}</thead>
          <tbody>
            ${renderStaffRows(pageRows, pageIndex * rowsPerPage)}
            ${pageIndex === staffPages.length - 1 ? renderTotalsAndNote() : ""}
          </tbody>
          ${renderFooter()}
        </table>
      </section>
    `).join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${bn ? "বেতন বিবরণী" : "Salary Statement"} — ${monthLabel} ${year}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;500;600;700&family=Tinos:ital,wght@0,400;0,700;1,400&display=swap');
  @import url('https://fonts.maateen.me/solaiman-lipi/font.css');
  *,*::before,*::after { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body {
    background: #ffffff;
    color: #000000;
    font-family: 'SolaimanLipi', 'Noto Serif Bengali', 'Tinos', 'Times New Roman', serif;
    font-size: 10pt;
    line-height: 1.3;
  }
  body { padding: 5mm 6mm; }

  .sheet {
    width: 100%;
    margin: 0 auto;
    background: #fff;
    border: 1pt solid #000;
    padding: 5mm 6mm 5mm;
    position: relative;
  }

  /* ===== Letterhead ===== */
  .letterhead {
    text-align: center;
    border-bottom: 1.5pt double #000;
    padding-bottom: 4pt;
    margin-bottom: 5pt;
    position: relative;
    min-height: 50px;
  }
  .logo-wrap {
    position: absolute;
    left: 0; top: 0;
    width: 50px; height: 50px;
    border: 0.75pt solid #000;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
    background: #fff;
  }
  .logo-img { width: 100%; height: 100%; object-fit: contain; padding: 1px; }
  .logo-fallback {
    font-size: 24px; font-weight: 700;
    color: #000;
    font-family: 'Noto Serif Bengali', serif;
  }
  .inst-name {
    font-family: 'Noto Serif Bengali', 'Tinos', serif;
    font-size: 15pt;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: .1pt;
    color: #000;
    margin: 0 0 2pt;
  }
  .inst-address {
    font-size: 8.5pt;
    line-height: 1.25;
    color: #000;
  }
  .inst-contact {
    font-size: 8pt;
    color: #000;
    margin-top: 1pt;
  }
  .inst-contact .sep { margin: 0 4pt; }

  /* ===== Document title ===== */
  .doc-title {
    text-align: center;
    margin: 4pt 0 4pt;
  }
  .doc-title h2 {
    font-family: 'Noto Serif Bengali', 'Tinos', serif;
    font-size: 11pt;
    font-weight: 700;
    color: #000;
    letter-spacing: .6pt;
    text-transform: uppercase;
    display: inline-block;
    padding: 2pt 14pt;
    border: 1pt solid #000;
    border-radius: 2pt;
  }
  .doc-period {
    margin-top: 3pt;
    font-size: 9pt;
    color: #000;
  }
  .doc-period strong { font-weight: 700; }

  /* Memo / date row */
  .memo-row {
    display: flex; justify-content: space-between;
    font-size: 8.5pt;
    margin: 3pt 0 5pt;
    color: #000;
  }
  .memo-row span strong { font-weight: 700; }

  /* ===== Table ===== */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8pt;
    color: #000;
    table-layout: fixed;
  }
  thead th {
    background: #f1f1f1;
    color: #000;
    font-weight: 700;
    padding: 3pt 3pt;
    text-align: left;
    border: 0.5pt solid #000;
    font-family: 'Noto Serif Bengali', 'Tinos', serif;
    vertical-align: middle;
    font-size: 8pt;
    line-height: 1.15;
    word-break: break-word;
  }
  thead th.center { text-align: center; }
  thead th.right { text-align: right; }
  tbody td {
    padding: 2pt 2.5pt;
    border: 0.4pt solid #000;
    vertical-align: middle;
    color: #000;
    line-height: 1.15;
    word-break: normal;
    overflow-wrap: anywhere;
  }
  tbody tr:nth-child(even) td { background: #fafafa; }

  .c-num { text-align: center; font-variant-numeric: tabular-nums; }
  .c-name .nm { font-weight: 700; font-size: 8pt; }
  .c-name .sid {
    font-size: 7pt;
    color: #333;
    margin-top: 0;
    font-family: 'Tinos', monospace;
  }
  .c-amt {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .c-net { font-weight: 700; }

  .totals td {
    background: #e8e8e8 !important;
    font-weight: 700;
    border: 0.75pt solid #000;
    padding: 4pt 3pt;
  }
  .totals td:first-child {
    text-align: center;
    text-transform: uppercase;
    letter-spacing: .3pt;
  }

  /* ===== Note ===== */
  .note {
    margin: 5pt 0 0;
    padding: 3pt 5pt;
    font-size: 7.5pt;
    color: #000;
    border: 0.4pt solid #000;
    background: #fafafa;
    line-height: 1.3;
  }
  .note strong { font-weight: 700; }

  /* ===== Page Header (repeats on every printed page) ===== */
  .page-header { background: #fff; }
  /* Header cell inside <thead> repeats on every printed page */
  .header-cell { padding: 0 0 4mm !important; border: none !important; background: #fff !important; }
  thead th.header-cell, thead .header-cell { background: #fff !important; }
  /* ===== Persistent footer cell inside <tfoot> (repeats every page) ===== */
  .footer-cell { padding: 0 !important; border: none !important; background: #fff !important; }
  .footer-inner { padding-top: 6mm; vertical-align: bottom; }
  .signatures {
    display: grid;
    grid-template-columns: repeat(var(--sig-cols, 3), 1fr);
    gap: 8mm;
    margin: 4mm 4mm 2mm;
  }
  .sig {
    text-align: center;
    font-size: 8.5pt;
    color: #000;
  }
  .sig .sig-line {
    border-top: 0.75pt solid #000;
    margin-bottom: 2pt;
    height: 0;
  }
  .sig .sig-name {
    font-family: 'Noto Serif Bengali', 'Tinos', serif;
    font-size: 9pt;
    font-weight: 700;
    min-height: 11pt;
    margin-bottom: 1pt;
    color: #000;
  }
  .sig .role {
    font-weight: 700;
    color: #000;
    font-size: 8.5pt;
  }
  .sig .role-meta {
    font-size: 7.5pt;
    color: #333;
    margin-top: 0;
    font-style: italic;
  }

  /* ===== Footer ===== */
  .footer {
    margin-top: 5pt;
    padding-top: 3pt;
    border-top: 0.4pt solid #000;
    text-align: center;
    font-size: 7.5pt;
    color: #000;
  }
  .footer .ref {
    margin-top: 1pt;
    font-family: 'Tinos', monospace;
    font-size: 7pt;
    color: #333;
  }

  @media print {
    html, body { width: 100%; min-height: 100%; }
    body { padding: 0; background: #fff; }
    .sheet { border: 1pt solid #000; max-width: 100%; padding: 4mm 5mm 5mm; overflow: visible; }
    @page {
      size: A4 landscape;
      margin: 15mm;
      @bottom-right {
        content: "${bn ? "পৃষ্ঠা " : "Page "}" counter(page) "${bn ? " / " : " of "}" counter(pages);
        font-family: 'SolaimanLipi', 'Noto Serif Bengali', 'Tinos', serif;
        font-size: 9pt;
        color: #000;
        padding-right: 4mm;
      }
    }
    table { page-break-inside: auto; break-inside: auto; font-size: 7.2pt; }
    tr { page-break-inside: avoid; break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tfoot tr.totals td { page-break-inside: avoid; break-inside: avoid; }
    .page-header {
      position: static;
      max-height: none; overflow: visible;
      background: #fff; border-bottom: 0.6pt solid #000; padding-bottom: 2mm; margin-bottom: 3mm;
    }
    .footer-inner { padding-top: 5mm; }
    .letterhead { min-height: 42px; margin-bottom: 3pt; padding-bottom: 3pt; }
    .logo-wrap { width: 42px; height: 42px; }
    .inst-name { font-size: 13pt; }
    .inst-address, .memo-row { font-size: 7.6pt; }
    .inst-contact, .doc-period { font-size: 7.3pt; }
    .doc-title { margin: 3pt 0; }
    .doc-title h2 { font-size: 9.5pt; padding: 1.5pt 12pt; }
    thead th { font-size: 7.1pt; padding: 2pt 2pt; line-height: 1.05; }
    tbody td { font-size: 7pt; padding: 1.7pt 2pt; line-height: 1.08; }
    .c-name .nm { font-size: 7.1pt; line-height: 1.05; }
    .c-name .sid { font-size: 6.2pt; line-height: 1.05; }
    .note { font-size: 6.8pt; padding: 2pt 4pt; margin-top: 3pt; }
    .signatures { margin: 6mm 3mm 2mm; gap: 6mm; }
    .sig, .sig .role { font-size: 7.4pt; }
    .sig .sig-name { font-size: 8pt; min-height: 9pt; }
    .sig .role-meta, .footer, .footer .ref { font-size: 6.6pt; }
  }

</style>
</head><body>
<div class="sheet">

  <table>
    <colgroup>
      <col style="width:4%"/>
      <col style="width:18%"/>
      <col style="width:14%"/>
      <col style="width:9%"/>
      <col style="width:4%"/>
      <col style="width:4%"/>
      <col style="width:4%"/>
      <col style="width:9%"/>
      <col style="width:9%"/>
      <col style="width:9%"/>
      <col style="width:16%"/>
    </colgroup>
    <thead>
      <tr class="page-header-row">
        <td colspan="11" class="header-cell">
          <div class="page-header">
            <div class="letterhead">
              <div class="logo-wrap">${logoBlock}</div>
              <div class="inst-name">${instName}</div>
              ${instAddress ? `<div class="inst-address">${instAddress}</div>` : ""}
              <div class="inst-contact">
                ${instPhone ? `<span>${bn ? "ফোন" : "Phone"}: ${bn ? toBnDigits(instPhone) : instPhone}</span>` : ""}
                ${instPhone && instEmail ? `<span class="sep">|</span>` : ""}
                ${instEmail ? `<span>${bn ? "ইমেইল" : "E-mail"}: ${instEmail}</span>` : ""}
              </div>
              ${(instEstablished || instRegNo) ? `
              <div class="inst-contact">
                ${instEstablished ? `<span>${bn ? "স্থাপিত" : "Established"}: ${bn ? toBnDigits(instEstablished) : instEstablished}</span>` : ""}
                ${instEstablished && instRegNo ? `<span class="sep">|</span>` : ""}
                ${instRegNo ? `<span>${bn ? "রেজিঃ নং" : "Reg. No"}: ${bn ? toBnDigits(instRegNo) : instRegNo}</span>` : ""}
              </div>` : ""}
            </div>

            <div class="doc-title">
              <h2>${bn ? "বেতন বিবরণী" : "Salary Statement"}</h2>
              <div class="doc-period"><strong>${bn ? "মাস:" : "For the month of:"}</strong> ${monthLabel} ${bn ? toBnDigits(year) : year}</div>
            </div>

            <div class="memo-row">
              <span><strong>${bn ? "স্মারক নং:" : "Memo No:"}</strong> ${sheetId}</span>
              <span><strong>${bn ? "তারিখ:" : "Date:"}</strong> ${issueDate}</span>
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <th class="center">${bn ? "ক্রঃ" : "SL"}</th>
        <th>${bn ? "কর্মীর নাম ও আইডি" : "Name & ID"}</th>
        <th>${bn ? "পদবি" : "Designation"}</th>
        <th class="right">${bn ? "মূল বেতন (৳)" : "Base (BDT)"}</th>
        <th class="center">${bn ? "উপ" : "P"}</th>
        <th class="center">${bn ? "অনু" : "A"}</th>
        <th class="center">${bn ? "বি" : "L"}</th>
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
      <tr class="note-row">
        <td colspan="11" style="border:0.4pt solid #000;background:#fafafa;padding:3pt 5pt;font-size:7.5pt;line-height:1.3;">
          <strong>${bn ? "নোটঃ" : "Note:"}</strong>
          ${bn
            ? "এই বিবরণীটি সিস্টেম দ্বারা স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত। কোষাধক্য কর্তৃক যাচাইপূর্বক প্রিন্সিপাল মহোদয়ের অনুমোদন গ্রহণ করিতে হইবে।"
            : "This statement is auto-generated. Verification by the Accountant and approval by the Principal is required before disbursement."}
        </td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <td colspan="11" class="footer-cell">
          <div class="footer-inner">
            <div class="signatures" style="--sig-cols: ${(paid_by && String(paid_by).trim()) ? 4 : 3};">
              <div class="sig">
                <div class="sig-line"></div>
                <div class="sig-name">${(prepared_by && String(prepared_by).trim()) || accountantName || "&nbsp;"}</div>
                <div class="role">${bn ? "প্রস্তুতকারী" : "Prepared by"}</div>
                <div class="role-meta">${(prepared_by_role && String(prepared_by_role).trim()) ? `(${prepared_by_role})` : (bn ? "(কোষাধক্য)" : "(Accountant)")}</div>
              </div>
              <div class="sig">
                <div class="sig-line"></div>
                <div class="sig-name">${(verified_by && String(verified_by).trim()) || verifierName || "&nbsp;"}</div>
                <div class="role">${bn ? "যাচাইকারী" : "Verified by"}</div>
                <div class="role-meta">${(verified_by_role && String(verified_by_role).trim()) ? `(${verified_by_role})` : (bn ? "(নিরীক্ষক)" : "(Auditor)")}</div>
              </div>
              <div class="sig">
                <div class="sig-line"></div>
                <div class="sig-name">${(approved_by && String(approved_by).trim()) || principalName || "&nbsp;"}</div>
                <div class="role">${bn ? "অনুমোদনকারী" : "Approved by"}</div>
                <div class="role-meta">${(approved_by_role && String(approved_by_role).trim()) ? `(${approved_by_role})` : (bn ? "(প্রিন্সিপাল)" : "(Principal)")}</div>
              </div>
              ${(paid_by && String(paid_by).trim()) ? `
              <div class="sig">
                <div class="sig-line"></div>
                <div class="sig-name">${paid_by}</div>
                <div class="role">${bn ? "পরিশোধকারী" : "Paid by"}</div>
                <div class="role-meta">${(paid_by_role && String(paid_by_role).trim()) ? `(${paid_by_role})` : (bn ? "(কোষাধ্যক্ষ)" : "(Treasurer)")}</div>
              </div>` : ''}
            </div>
            <div class="footer">
              <div>© ${instName}</div>
              <div class="ref">${bn ? "স্মারক:" : "Ref:"} ${sheetId} &nbsp;•&nbsp; ${bn ? "মুদ্রণ:" : "Printed:"} ${issueDate}</div>
            </div>
          </div>
        </td>
      </tr>
    </tfoot>
  </table>

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
