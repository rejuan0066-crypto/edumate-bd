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

    // ===== Dynamic column registry =====
    // Add/remove/reorder entries here — widths, headers, cells, totals, and colspans
    // all auto-recompute. `weight` is a relative width unit (normalized to 100%).
    type ColDef = {
      key: string;
      header: string;
      align?: "left" | "center" | "right";
      weight: number; // relative width
      cell: (s: any, idx: number) => string;
      total?: () => string; // value rendered in totals row (else empty)
      groupStart?: boolean; // if true, starts a new totals-row segment (Grand Total label spans all groupStart=false leading cols)
    };

    const COLUMNS: ColDef[] = [
      { key: "sl", header: bn ? "ক্রঃ" : "SL", align: "center", weight: 3,
        cell: (_s, i) => `<td class="c-num">${bn ? toBnDigits(i + 1) : i + 1}</td>` },
      { key: "name", header: bn ? "কর্মীর নাম ও আইডি" : "Name & ID", weight: 15,
        cell: (s) => `<td class="c-name"><div class="nm">${escapeHtml(s.name)}</div>${s.staff_id && s.staff_id !== '-' ? `<div class="sid">${escapeHtml(s.staff_id)}</div>` : ""}</td>` },
      { key: "designation", header: bn ? "পদবি" : "Designation", weight: 12,
        cell: (s) => `<td>${escapeHtml(s.designation)}</td>` },
      { key: "base", header: bn ? "মূল বেতন (৳)" : "Base (BDT)", align: "right", weight: 8,
        cell: (s) => `<td class="c-amt">${fmtNum(Number(s.base_salary))}</td>`,
        total: () => `<td class="c-amt">${fmtNum(Number(totals?.base || 0))}</td>` },
      { key: "present", header: bn ? "উপ" : "P", align: "center", weight: 3,
        cell: (s) => `<td class="c-num">${bn ? toBnDigits(s.present) : s.present}</td>`,
        total: () => `<td></td>` },
      { key: "absent", header: bn ? "অনু" : "A", align: "center", weight: 3,
        cell: (s) => `<td class="c-num">${bn ? toBnDigits(s.absent) : s.absent}</td>`,
        total: () => `<td></td>` },
      { key: "late", header: bn ? "বি" : "L", align: "center", weight: 3,
        cell: (s) => `<td class="c-num">${bn ? toBnDigits(s.late) : s.late}</td>`,
        total: () => `<td></td>` },
      { key: "leave", header: bn ? "ছু" : "Lv", align: "center", weight: 3,
        cell: (s) => `<td class="c-num">${bn ? toBnDigits(s.leave || 0) : (s.leave || 0)}</td>`,
        total: () => `<td></td>` },
      { key: "deduction", header: bn ? "কর্তন (৳)" : "Deduction", align: "right", weight: 8,
        cell: (s) => { const d = Number(s.deductions || 0); return `<td class="c-amt">${d > 0 ? fmtNum(d) : "—"}</td>`; },
        total: () => `<td class="c-amt">${fmtNum(Number(totals?.deductions || 0))}</td>` },
      { key: "overtime", header: bn ? "ওভারটাইম (৳)" : "Overtime", align: "right", weight: 7,
        cell: (s) => `<td class="c-amt">${Number(s.overtime || 0) > 0 ? fmtNum(Number(s.overtime)) : "—"}</td>`,
        total: () => `<td class="c-amt">${Number(totals?.overtime || 0) > 0 ? fmtNum(Number(totals?.overtime || 0)) : "—"}</td>` },
      { key: "deposit", header: bn ? "জমা (৳)" : "Deposit", align: "right", weight: 8,
        cell: (s) => { const dep = Number(s.savings ?? s.advance ?? 0); return `<td class="c-amt">${dep > 0 ? fmtNum(dep) : "—"}</td>`; },
        total: () => `<td class="c-amt">${Number(totals?.savings || 0) > 0 ? fmtNum(Number(totals?.savings || 0)) : "—"}</td>` },
      { key: "totalDed", header: bn ? "মোট কর্তন (৳)" : "Total Ded.", align: "right", weight: 9,
        cell: (s) => {
          const d = Number(s.deductions || 0); const dep = Number(s.savings ?? s.advance ?? 0); const t = d + dep;
          return `<td class="c-amt" style="font-weight:700;color:#b91c1c">${t > 0 ? fmtNum(t) : "—"}</td>`;
        },
        total: () => {
          const t = Number(totals?.deductions || 0) + Number(totals?.savings || 0);
          return `<td class="c-amt" style="font-weight:700;color:#b91c1c">${t > 0 ? fmtNum(t) : "—"}</td>`;
        } },
      { key: "net", header: bn ? "নিট প্রদেয় (৳)" : "Net Payable", align: "right", weight: 12,
        cell: (s) => `<td class="c-amt c-net">${fmtNum(Number(s.net_salary))}</td>`,
        total: () => `<td class="c-amt c-net">${fmtNum(Number(totals?.net || 0))}</td>` },
    ];

    const COL_COUNT = COLUMNS.length;
    const totalWeight = COLUMNS.reduce((a, c) => a + c.weight, 0);
    const colGroup = `
      <colgroup>
        ${COLUMNS.map((c) => `<col style="width:${((c.weight / totalWeight) * 100).toFixed(3)}%"/>`).join("")}
      </colgroup>`;

    const alignClass = (a?: string) => a === "center" ? " center" : a === "right" ? " right" : "";

    const renderPageHeader = () => `
      <tr class="page-header-row">
        <th colspan="${COL_COUNT}" class="header-cell">
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
        ${COLUMNS.map((c) => `<th class="${alignClass(c.align).trim()}">${c.header}</th>`).join("")}
      </tr>`;

    const renderStaffRows = (rows: any[], startIndex: number) => rows.map((s: any, i: number) => `
      <tr class="staff-row">
        ${COLUMNS.map((c) => c.cell(s, startIndex + i)).join("")}
      </tr>`).join("");

    const renderTotalsAndNote = () => {
      // First N columns without `total` get merged into the "Grand Total" label cell.
      let labelSpan = 0;
      while (labelSpan < COLUMNS.length && !COLUMNS[labelSpan].total) labelSpan++;
      if (labelSpan === 0) labelSpan = 1;
      const labelCell = `<td colspan="${labelSpan}">${bn ? "সর্বমোট" : "Grand Total"} (${bn ? toBnDigits(staff.length) : staff.length} ${bn ? "জন" : "staff"})</td>`;
      const totalCells = COLUMNS.slice(labelSpan).map((c) => c.total ? c.total() : `<td></td>`).join("");
      return `
      <tr class="totals">
        ${labelCell}${totalCells}
      </tr>
      <tr class="note-row">
        <td colspan="${COL_COUNT}" class="note-cell">
          <strong>${bn ? "নোটঃ" : "Note:"}</strong>
          ${bn
            ? "এই বিবরণীটি সিস্টেম দ্বারা স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত। কোষাধ্যক্ষ কর্তৃক যাচাইপূর্বক প্রিন্সিপাল মহোদয়ের অনুমোদন গ্রহণ করিতে হইবে।"
            : "This statement is auto-generated. Verification by the Accountant and approval by the Principal is required before disbursement."}
        </td>
      </tr>`;
    };

    const renderFooter = () => `
      <tfoot>
        <tr>
          <td colspan="${COL_COUNT}" class="footer-cell">
            <div class="footer-inner">
              <div class="signatures" style="--sig-cols: ${(paid_by && String(paid_by).trim()) ? 4 : 3};">
                <div class="sig">
                  <div class="sig-line"></div>
                  <div class="sig-name">${escapeHtml((prepared_by && String(prepared_by).trim()) || "\u00A0")}</div>
                  <div class="role-meta">${escapeHtml((prepared_by_role && String(prepared_by_role).trim()) ? prepared_by_role : (bn ? "কোষাধ্যক্ষ" : "Treasurer"))}</div>
                  <div class="role">${bn ? "প্রস্তুতকারী" : "Prepared by"}</div>
                </div>
                <div class="sig">
                  <div class="sig-line"></div>
                  <div class="sig-name">${escapeHtml((verified_by && String(verified_by).trim()) || verifierName || "\u00A0")}</div>
                  <div class="role-meta">${escapeHtml((verified_by_role && String(verified_by_role).trim()) ? verified_by_role : (bn ? "নিরীক্ষক" : "Auditor"))}</div>
                  <div class="role">${bn ? "যাচাইকারী" : "Verified by"}</div>
                </div>
                <div class="sig">
                  <div class="sig-line"></div>
                  <div class="sig-name">${escapeHtml((approved_by && String(approved_by).trim()) || principalName || "\u00A0")}</div>
                  <div class="role-meta">${escapeHtml((approved_by_role && String(approved_by_role).trim()) ? approved_by_role : (bn ? "প্রিন্সিপাল" : "Principal"))}</div>
                  <div class="role">${bn ? "অনুমোদনকারী" : "Approved by"}</div>
                </div>
                ${(paid_by && String(paid_by).trim()) ? `
                <div class="sig">
                  <div class="sig-line"></div>
                  <div class="sig-name">${escapeHtml(paid_by)}</div>
                  <div class="role-meta">${escapeHtml((paid_by_role && String(paid_by_role).trim()) ? paid_by_role : (bn ? "কোষাধ্যক্ষ" : "Treasurer"))}</div>
                  <div class="role">${bn ? "পরিশোধকারী" : "Paid by"}</div>
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

    // Dynamic rows-per-page: fit small lists on a single A4 landscape page.
    // Up to ~22 staff comfortably fit with compact row height; beyond that, paginate by 20.
    const rowsPerPage = staff.length <= 22 ? Math.max(staff.length, 1) : 20;
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
<meta name="viewport" content="width=device-width, initial-scale=1">
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
  body { padding: 0; }

  .salary-page {
    width: 100%;
    margin: 0 auto;
    background: #fff;
    border: 1pt solid #000;
    padding: 5mm 6mm 5mm;
    position: relative;
    break-after: page;
    page-break-after: always;
  }
  .salary-page:last-child {
    break-after: auto;
    page-break-after: auto;
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
    max-width: 100%;
    border-collapse: collapse;
    font-size: 8pt;
    color: #000;
    table-layout: fixed;
    height: 100%;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  thead th {
    background: #f1f1f1;
    color: #000;
    font-weight: 700;
    padding: 3pt 2pt;
    text-align: left;
    border: 0.5pt solid #000;
    font-family: 'Noto Serif Bengali', 'Tinos', serif;
    vertical-align: middle;
    font-size: 8pt;
    line-height: 1.15;
    word-break: break-word;
    overflow-wrap: anywhere;
    hyphens: auto;
    -webkit-hyphens: auto;
  }
  thead th.center { text-align: center; }
  thead th.right { text-align: right; }
  tbody td {
    padding: 2pt 2pt;
    border: 0.4pt solid #000;
    vertical-align: middle;
    color: #000;
    line-height: 1.15;
    word-break: break-word;
    overflow-wrap: anywhere;
    hyphens: auto;
    -webkit-hyphens: auto;
    overflow: hidden;
  }
  tbody tr:nth-child(even) td { background: #fafafa; }

  .staff-row { height: 8.5mm; }

  .c-num { text-align: center; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .c-name { word-break: break-word; overflow-wrap: anywhere; }
  .c-name .nm { font-weight: 700; font-size: 8pt; word-break: break-word; overflow-wrap: anywhere; }
  .c-name .sid {
    font-size: 7pt;
    color: #333;
    margin-top: 0;
    font-family: 'Tinos', monospace;
    word-break: break-all;
    overflow-wrap: anywhere;
  }
  .c-amt {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
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
  .note-cell {
    border: 0.4pt solid #000;
    background: #fafafa;
    padding: 3pt 5pt;
    font-size: 7.5pt;
    line-height: 1.3;
  }

  /* ===== Page Header (repeats on every printed page) ===== */
  .page-header { background: #fff; }
  /* Header cell inside <thead> repeats on every printed page */
  .header-cell { padding: 0 0 4mm !important; border: none !important; background: #fff !important; }
  thead th.header-cell, thead .header-cell { background: #fff !important; }
  /* ===== Persistent footer cell inside <tfoot> (repeats every page) ===== */
  .footer-cell { padding: 0 !important; border: none !important; background: #fff !important; }
  .footer-inner { padding-top: 6mm; vertical-align: bottom; min-height: 28mm; }
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
    html, body { width: 100%; min-height: 0; height: auto; }
    body { padding: 0; background: #fff; }
    .salary-page {
      border: 1pt solid #000;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      /* Don't force a fixed height — let content determine page; prevents extra blank page on mobile */
      height: auto;
      min-height: 0;
      padding: 3mm 3mm 4mm;
      overflow: hidden;
      break-after: page;
      page-break-after: always;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .salary-page:last-child {
      break-after: auto;
      page-break-after: auto;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    @page {
      size: A4 landscape;
      margin: 6mm 5mm;
      @bottom-right {
        content: "${bn ? "পৃষ্ঠা " : "Page "}" counter(page) "${bn ? " / " : " of "}" counter(pages);
        font-family: 'SolaimanLipi', 'Noto Serif Bengali', 'Tinos', serif;
        font-size: 9pt;
        color: #000;
        padding-right: 4mm;
      }
    }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    /* Print Settings Bar — visible on screen, hidden during print */
    .print-settings-bar {
      position: sticky; top: 0; z-index: 1000;
      background: linear-gradient(180deg,#ecfdf5,#d1fae5);
      border-bottom: 2px solid #10b981;
      padding: 10px 14px;
      display: flex; flex-wrap: wrap; gap: 14px; align-items: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12.5px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }
    .print-settings-bar .grp { display: flex; align-items: center; gap: 6px; }
    .print-settings-bar label { font-weight: 600; color: #065f46; }
    .print-settings-bar select,
    .print-settings-bar input[type="number"] {
      border: 1px solid #10b981; background: #fff; padding: 4px 8px;
      border-radius: 8px; font-size: 12px; min-width: 70px;
    }
    .print-settings-bar input[type="range"] { width: 110px; accent-color: #10b981; }
    .print-settings-bar .val { font-variant-numeric: tabular-nums; min-width: 36px; color: #047857; font-weight: 700; }
    .print-settings-bar button {
      background: #059669; color: #fff; border: 0; padding: 7px 16px;
      border-radius: 999px; font-weight: 700; font-size: 12.5px; cursor: pointer;
      box-shadow: 0 2px 6px rgba(5,150,105,0.35);
    }
    .print-settings-bar button:hover { background: #047857; }
    .print-settings-bar .hint { color: #047857; font-size: 11px; opacity: .85; }
    @media print { .print-settings-bar { display: none !important; } }
    table { page-break-inside: avoid; break-inside: avoid; font-size: 7pt; }
    tr { page-break-inside: avoid; break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group !important; }
    tbody { display: table-row-group !important; }
    tfoot { display: table-footer-group !important; }
    tfoot tr.totals td { page-break-inside: avoid; break-inside: avoid; }
    .page-header {
      position: static;
      max-height: none; overflow: visible;
      background: #fff; border-bottom: 0.6pt solid #000; padding-bottom: 1.5mm; margin-bottom: 2mm;
    }
    .header-cell { padding: 0 0 2.5mm !important; }
    .footer-inner { padding-top: 3mm; min-height: 22mm; }
    .letterhead { min-height: 38px; margin-bottom: 2pt; padding-bottom: 2pt; }
    .logo-wrap { width: 38px; height: 38px; }
    .inst-name { font-size: 12.5pt; }
    .inst-address, .memo-row { font-size: 7.4pt; }
    .inst-contact, .doc-period { font-size: 7pt; }
    .doc-title { margin: 2pt 0; }
    .doc-title h2 { font-size: 9pt; padding: 1pt 10pt; }
    thead th { font-size: 6.9pt; padding: 1.5pt 2pt; line-height: 1.0; }
    tbody td { font-size: 6.8pt; padding: 1.2pt 2pt; line-height: 1.05; }
    .staff-row { height: 5.8mm; }
    .c-name .nm { font-size: 6.9pt; line-height: 1.0; }
    .c-name .sid { font-size: 6pt; line-height: 1.0; }
    .totals td { padding: 2.5pt 2pt; }
    .note-cell { font-size: 6.6pt; padding: 1.8pt 3pt; }
    .signatures { margin: 4mm 3mm 1mm; gap: 5mm; }
    .sig, .sig .role { font-size: 7.2pt; }
    .sig .sig-name { font-size: 7.8pt; min-height: 8pt; }
    .sig .role-meta, .footer, .footer .ref { font-size: 6.4pt; }
    .footer { margin-top: 3pt; padding-top: 2pt; }
  }
  /* Auto-fit hooks */
  @media print {
    .salary-page { transform-origin: top left; }
    /* Strip trailing break on the last page — Safari mobile otherwise renders an empty 2nd page */
    .salary-page:last-child { break-after: avoid !important; page-break-after: avoid !important; }
    .sheet > *:last-child { margin-bottom: 0 !important; padding-bottom: 0 !important; }
  }
</style>
</head><body>
<div class="print-settings-bar" id="printSettingsBar">
  <div class="grp">
    <label for="ps-orient">${bn ? 'অরিয়েন্টেশন' : 'Orientation'}:</label>
    <select id="ps-orient">
      <option value="landscape">${bn ? 'ল্যান্ডস্কেপ' : 'Landscape'}</option>
      <option value="portrait">${bn ? 'পোর্ট্রেট' : 'Portrait'}</option>
    </select>
  </div>
  <div class="grp">
    <label for="ps-size">${bn ? 'পেপার' : 'Paper'}:</label>
    <select id="ps-size">
      <option value="A4">A4</option>
      <option value="Letter">Letter</option>
      <option value="Legal">Legal</option>
      <option value="A3">A3</option>
    </select>
  </div>
  <div class="grp">
    <label for="ps-min">${bn ? 'সর্বনিম্ন স্কেল' : 'Min scale'}:</label>
    <input id="ps-min" type="range" min="0.4" max="1" step="0.05" value="0.55"/>
    <span class="val" id="ps-min-v">55%</span>
  </div>
  <div class="grp">
    <label for="ps-max">${bn ? 'সর্বোচ্চ স্কেল' : 'Max scale'}:</label>
    <input id="ps-max" type="range" min="0.5" max="1.2" step="0.05" value="1"/>
    <span class="val" id="ps-max-v">100%</span>
  </div>
  <div class="grp">
    <label for="ps-margin">${bn ? 'মার্জিন (mm)' : 'Margin (mm)'}:</label>
    <input id="ps-margin" type="number" min="0" max="25" step="1" value="8"/>
  </div>
  <div class="grp" style="margin-left:auto">
    <button id="ps-print" type="button">🖨️ ${bn ? 'প্রিন্ট করুন' : 'Print'}</button>
  </div>
  <div class="hint">${bn ? 'ব্রাউজার ডায়ালগে অরিয়েন্টেশন/সাইজ মিলিয়ে দিন।' : 'Match the browser dialog to these settings.'}</div>
</div>
<div class="sheet">

  ${pagesHtml}

</div>
<script>
  (function(){
    // Detect Safari (iOS + macOS) — it does NOT honor CSS 'zoom' in print.
    var ua = navigator.userAgent;
    var isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua) || /iPad|iPhone|iPod/.test(ua);

    // Print settings (live, user-controlled)
    var settings = {
      orientation: 'landscape',
      paper: 'A4',
      minScale: 0.55,
      maxScale: 1,
      marginMm: 8,
    };

    // Paper sizes in mm (portrait W x H)
    var PAPER = {
      A4:     { w: 210, h: 297 },
      Letter: { w: 216, h: 279 },
      Legal:  { w: 216, h: 356 },
      A3:     { w: 297, h: 420 },
    };

    function injectPageRule(){
      var p = PAPER[settings.paper] || PAPER.A4;
      var w = settings.orientation === 'landscape' ? p.h : p.w;
      var h = settings.orientation === 'landscape' ? p.w : p.h;
      var m = settings.marginMm;
      var styleId = 'dynamic-page-rule';
      var el = document.getElementById(styleId);
      if (!el) { el = document.createElement('style'); el.id = styleId; document.head.appendChild(el); }
      // Use 'size: auto' so the OS print dialog choice (paper/orientation) always wins —
      // critical on iOS Safari which ignores explicit @page size. We still hint with the
      // chosen orientation as a fallback for desktop browsers.
      el.textContent =
        '@page { size: ' + settings.paper + ' ' + settings.orientation + '; margin: ' + m + 'mm; }' +
        '@media print { @page { size: auto; margin: ' + m + 'mm; } }';
      // expose for autoFit
      settings._pageW = w; settings._pageH = h;
    }

    function autoFit(){
      var pages = document.querySelectorAll('.salary-page');
      var MM_TO_PX = 96 / 25.4;
      // Fit to the SMALLER of the two orientations so the page also fits when the user
      // picks the opposite orientation in the OS print dialog (common on iOS).
      var p = PAPER[settings.paper] || PAPER.A4;
      var shortSide = Math.min(p.w, p.h) - settings.marginMm * 2;
      var longSide  = Math.max(p.w, p.h) - settings.marginMm * 2;
      // Width budget = short side (portrait width); Height budget = long side.
      var maxW = shortSide * MM_TO_PX;
      var maxH = longSide * MM_TO_PX;
      pages.forEach(function(p){
        p.style.zoom = ''; p.style.transform = ''; p.style.width = ''; p.style.height = '';
        var h = p.scrollHeight, w = p.scrollWidth;
        var scale = Math.min(maxH / h, maxW / w);
        scale = Math.max(settings.minScale, Math.min(settings.maxScale, scale * 0.98));
        if (scale >= 0.999 && h <= maxH && w <= maxW) return;
        if (isSafari) {
          p.style.transform = 'scale(' + scale + ')';
          p.style.transformOrigin = 'top left';
          p.style.width = (100 / scale) + '%';
          p.style.height = (h * scale) + 'px';
        } else {
          p.style.zoom = String(scale);
        }
      });
    }

    function applyAll(){
      injectPageRule();
      autoFit();
    }

    // Wire up the settings UI
    function bindUI(){
      var bar = document.getElementById('printSettingsBar');
      if (!bar) return;
      var $o = document.getElementById('ps-orient');
      var $s = document.getElementById('ps-size');
      var $min = document.getElementById('ps-min');
      var $max = document.getElementById('ps-max');
      var $minV = document.getElementById('ps-min-v');
      var $maxV = document.getElementById('ps-max-v');
      var $margin = document.getElementById('ps-margin');
      var $print = document.getElementById('ps-print');

      // Restore from localStorage
      try {
        var saved = JSON.parse(localStorage.getItem('salary_print_settings') || '{}');
        if (saved.orientation) settings.orientation = saved.orientation;
        if (saved.paper) settings.paper = saved.paper;
        if (typeof saved.minScale === 'number') settings.minScale = saved.minScale;
        if (typeof saved.maxScale === 'number') settings.maxScale = saved.maxScale;
        if (typeof saved.marginMm === 'number') settings.marginMm = saved.marginMm;
      } catch(e){}

      $o.value = settings.orientation;
      $s.value = settings.paper;
      $min.value = settings.minScale;
      $max.value = settings.maxScale;
      $margin.value = settings.marginMm;
      $minV.textContent = Math.round(settings.minScale * 100) + '%';
      $maxV.textContent = Math.round(settings.maxScale * 100) + '%';

      function persist(){
        try { localStorage.setItem('salary_print_settings', JSON.stringify(settings)); } catch(e){}
      }
      function refresh(){ applyAll(); persist(); }

      $o.addEventListener('change', function(){ settings.orientation = $o.value; refresh(); });
      $s.addEventListener('change', function(){ settings.paper = $s.value; refresh(); });
      $min.addEventListener('input', function(){
        settings.minScale = parseFloat($min.value);
        $minV.textContent = Math.round(settings.minScale * 100) + '%';
        if (settings.minScale > settings.maxScale) {
          settings.maxScale = settings.minScale;
          $max.value = settings.maxScale;
          $maxV.textContent = Math.round(settings.maxScale * 100) + '%';
        }
        refresh();
      });
      $max.addEventListener('input', function(){
        settings.maxScale = parseFloat($max.value);
        $maxV.textContent = Math.round(settings.maxScale * 100) + '%';
        if (settings.maxScale < settings.minScale) {
          settings.minScale = settings.maxScale;
          $min.value = settings.minScale;
          $minV.textContent = Math.round(settings.minScale * 100) + '%';
        }
        refresh();
      });
      $margin.addEventListener('change', function(){
        var v = parseFloat($margin.value); if (isNaN(v)) v = 8;
        settings.marginMm = Math.max(0, Math.min(25, v));
        $margin.value = settings.marginMm;
        refresh();
      });
      $print.addEventListener('click', function(){
        applyAll();
        setTimeout(function(){ window.print(); }, 80);
      });
    }

    window.addEventListener('load', function(){ bindUI(); setTimeout(applyAll, 50); });
    window.addEventListener('beforeprint', applyAll);
    window.addEventListener('afterprint', function(){
      document.querySelectorAll('.salary-page').forEach(function(p){
        p.style.zoom=''; p.style.transform=''; p.style.width=''; p.style.height='';
      });
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function(){ setTimeout(applyAll, 30); });
    }
  })();
</script>
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
