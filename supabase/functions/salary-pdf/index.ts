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
    // Peek body once so we can detect dryRun (regression-test bypass) before auth.
    let bodyRaw: any = {};
    try { bodyRaw = await req.json(); } catch (_e) { bodyRaw = {}; }
    const isDryRun = bodyRaw && bodyRaw.dryRun === "html";

    // Validate JWT (skipped for dryRun=html — used only by regression tests
    // to inspect the rendered HTML structure without DB access).
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    let supabase: any;

    if (!isDryRun) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }

      supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }

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
        console.warn(`salary-pdf: forbidden access by user=${user.id}`);
        return new Response(
          JSON.stringify({ error: "Forbidden", message: "Only administrators may generate salary PDFs." }),
          { status: 403, headers: corsHeaders }
        );
      }
    } else {
      // dryRun: anonymous client, no DB calls expected.
      supabase = createClient(supabaseUrl, supabaseKey);
    }

    const body = bodyRaw;
    const { monthYear, monthLabel, year, language, staff, totals, issueDate: issueDateInput,
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

    // Fetch institution info + website_settings (skipped in dryRun to avoid DB).
    const [{ data: institution }, { data: wsRows }] = isDryRun
      ? [{ data: null }, { data: [] }] as any
      : await Promise.all([
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

    // Stable per-month memo number — same value every time the same month is regenerated.
    let sheetId = `SS-${monthYear || ""}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    if (monthYear) {
      try {
        const { data: memoData, error: memoErr } = await supabase
          .rpc("get_or_create_salary_memo", { p_month_year: monthYear });
        if (!memoErr && typeof memoData === "string" && memoData.length > 0) {
          sheetId = memoData;
        }
      } catch (_e) {
        // fall back to random sheetId
      }
    }
    const issueDate = (issueDateInput && String(issueDateInput).trim())
      ? String(issueDateInput).trim()
      : new Date().toLocaleDateString(bn ? "bn-BD" : "en-GB");

    // Fetch holidays for the selected month (date + reason) for the salary sheet appendix.
    let monthHolidays: any[] = [];
    if (!isDryRun && monthYear && /^\d{4}-\d{2}$/.test(monthYear)) {
      const startDate = `${monthYear}-01`;
      const [hy, hm] = monthYear.split("-").map(Number);
      const nextMonth = hm === 12 ? `${hy + 1}-01-01` : `${hy}-${String(hm + 1).padStart(2, "0")}-01`;
      const { data: holRows } = await supabase
        .from("staff_holidays")
        .select("holiday_date, name_bn, name_en, holiday_type, is_paid, notes")
        .gte("holiday_date", startDate)
        .lt("holiday_date", nextMonth)
        .is("deleted_at", null)
        .order("holiday_date", { ascending: true });
      monthHolidays = holRows || [];
    }



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

    // ===== Column renderers (keyed by col_key) =====
    // The set of available columns is fixed in code (each needs a cell renderer),
    // but their visibility, order, label, alignment, and width come from the
    // `salary_pdf_columns` table managed at /admin/salary-pdf-columns.
    type ColDef = {
      key: string;
      header: string;
      align?: "left" | "center" | "right";
      weight: number;
      cell: (s: any, idx: number) => string;
      total?: () => string;
    };

    type ColRenderer = {
      defaultHeaderBn: string;
      defaultHeaderEn: string;
      defaultAlign: "left" | "center" | "right";
      defaultWeight: number;
      cell: (s: any, idx: number) => string;
      total?: () => string;
    };

    const RENDERERS: Record<string, ColRenderer> = {
      sl: { defaultHeaderBn: "ক্রঃ", defaultHeaderEn: "SL", defaultAlign: "center", defaultWeight: 3,
        cell: (_s, i) => `<td class="c-num">${bn ? toBnDigits(i + 1) : i + 1}</td>` },
      name: { defaultHeaderBn: "কর্মীর নাম ও আইডি", defaultHeaderEn: "Name & ID", defaultAlign: "left", defaultWeight: 15,
        cell: (s) => `<td class="c-name"><div class="nm">${escapeHtml(s.name)}</div>${s.staff_id && s.staff_id !== '-' ? `<div class="sid">${escapeHtml(s.staff_id)}</div>` : ""}</td>` },
      designation: { defaultHeaderBn: "পদবি", defaultHeaderEn: "Designation", defaultAlign: "left", defaultWeight: 12,
        cell: (s) => `<td>${escapeHtml(s.designation)}</td>` },
      base: { defaultHeaderBn: "মূল বেতন (৳)", defaultHeaderEn: "Base (BDT)", defaultAlign: "right", defaultWeight: 8,
        cell: (s) => `<td class="c-amt">${fmtNum(Number(s.base_salary))}</td>`,
        total: () => `<td class="c-amt">${fmtNum(Number(totals?.base || 0))}</td>` },
      present: { defaultHeaderBn: "উপ", defaultHeaderEn: "P", defaultAlign: "center", defaultWeight: 3,
        cell: (s) => `<td class="c-num">${bn ? toBnDigits(s.present) : s.present}</td>`,
        total: () => `<td></td>` },
      absent: { defaultHeaderBn: "অনু", defaultHeaderEn: "A", defaultAlign: "center", defaultWeight: 3,
        cell: (s) => `<td class="c-num">${bn ? toBnDigits(s.absent) : s.absent}</td>`,
        total: () => `<td></td>` },
      late: { defaultHeaderBn: "বি", defaultHeaderEn: "L", defaultAlign: "center", defaultWeight: 3,
        cell: (s) => `<td class="c-num">${bn ? toBnDigits(s.late) : s.late}</td>`,
        total: () => `<td></td>` },
      leave: { defaultHeaderBn: "ছু", defaultHeaderEn: "Lv", defaultAlign: "center", defaultWeight: 3,
        cell: (s) => `<td class="c-num">${bn ? toBnDigits(s.leave || 0) : (s.leave || 0)}</td>`,
        total: () => `<td></td>` },
      deduction: { defaultHeaderBn: "কর্তন (৳)", defaultHeaderEn: "Deduction", defaultAlign: "right", defaultWeight: 8,
        cell: (s) => { const d = Number(s.deductions || 0); return `<td class="c-amt">${d > 0 ? fmtNum(d) : "—"}</td>`; },
        total: () => `<td class="c-amt">${fmtNum(Number(totals?.deductions || 0))}</td>` },
      overtime: { defaultHeaderBn: "ওভারটাইম/বোনাস (৳)", defaultHeaderEn: "Overtime/Bonus", defaultAlign: "right", defaultWeight: 7,
        cell: (s) => `<td class="c-amt"${s.overtime_reason ? ` title="${escapeHtml(s.overtime_reason)}"` : ''}>${Number(s.overtime || 0) > 0 ? fmtNum(Number(s.overtime)) + (s.overtime_reason ? ` <span style="color:#64748b;font-size:8px">(${escapeHtml(s.overtime_reason)})</span>` : '') : "—"}</td>`,
        total: () => `<td class="c-amt">${Number(totals?.overtime || 0) > 0 ? fmtNum(Number(totals?.overtime || 0)) : "—"}</td>` },
      deposit: { defaultHeaderBn: "জমা (৳)", defaultHeaderEn: "Deposit", defaultAlign: "right", defaultWeight: 8,
        cell: (s) => { const dep = Number(s.savings ?? s.advance ?? 0); return `<td class="c-amt">${dep > 0 ? fmtNum(dep) : "—"}</td>`; },
        total: () => `<td class="c-amt">${Number(totals?.savings || 0) > 0 ? fmtNum(Number(totals?.savings || 0)) : "—"}</td>` },
      totalDed: { defaultHeaderBn: "মোট কর্তন (৳)", defaultHeaderEn: "Total Ded.", defaultAlign: "right", defaultWeight: 9,
        cell: (s) => {
          const d = Number(s.deductions || 0); const dep = Number(s.savings ?? s.advance ?? 0); const t = d + dep;
          return `<td class="c-amt" style="font-weight:700;color:#b91c1c">${t > 0 ? fmtNum(t) : "—"}</td>`;
        },
        total: () => {
          const t = Number(totals?.deductions || 0) + Number(totals?.savings || 0);
          return `<td class="c-amt" style="font-weight:700;color:#b91c1c">${t > 0 ? fmtNum(t) : "—"}</td>`;
        } },
      net: { defaultHeaderBn: "নিট প্রদেয় (৳)", defaultHeaderEn: "Net Payable", defaultAlign: "right", defaultWeight: 12,
        cell: (s) => `<td class="c-amt c-net">${fmtNum(Number(s.net_salary))}</td>`,
        total: () => `<td class="c-amt c-net">${fmtNum(Number(totals?.net || 0))}</td>` },
    };

    const DEFAULT_ORDER = ["sl","name","designation","base","present","absent","late","leave","deduction","overtime","deposit","totalDed","net"];

    // Load admin config (visible columns + order + labels). Falls back to defaults
    // if the table is empty, the read fails, or we're in dryRun.
    let configRows: any[] | null = null;
    if (!isDryRun) {
      try {
        const { data } = await supabase
          .from("salary_pdf_columns")
          .select("col_key,label_bn,label_en,align,weight,visible,sort_order")
          .eq("visible", true)
          .order("sort_order", { ascending: true });
        if (data && data.length > 0) configRows = data;
      } catch (e) {
        console.warn("salary-pdf: could not load column config, using defaults", e);
      }
    }

    const buildFromConfig = (rows: any[]): ColDef[] =>
      rows
        .filter((r) => RENDERERS[r.col_key])
        .map((r) => {
          const rd = RENDERERS[r.col_key];
          const align = (r.align as "left" | "center" | "right") || rd.defaultAlign;
          const w = Number(r.weight) > 0 ? Number(r.weight) : rd.defaultWeight;
          return {
            key: r.col_key,
            header: bn ? (r.label_bn || rd.defaultHeaderBn) : (r.label_en || rd.defaultHeaderEn),
            align,
            weight: w,
            cell: rd.cell,
            total: rd.total,
          };
        });

    const buildDefault = (): ColDef[] =>
      DEFAULT_ORDER.map((k) => {
        const rd = RENDERERS[k];
        return {
          key: k,
          header: bn ? rd.defaultHeaderBn : rd.defaultHeaderEn,
          align: rd.defaultAlign,
          weight: rd.defaultWeight,
          cell: rd.cell,
          total: rd.total,
        };
      });

    const COLUMNS: ColDef[] = configRows ? buildFromConfig(configRows) : buildDefault();
    if (COLUMNS.length === 0) COLUMNS.push(...buildDefault()); // safety net

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

    // Dynamic rows-per-page: keep each section strictly within ONE printed A4 landscape page
    // so header (thead) + signatures (tfoot) reliably appear on every page.
    // Reduced from 20 -> 14 to leave room for letterhead, doc-title, memo row, totals & 4-signature footer
    // even when Bengali text wraps to 2 lines per cell.
    const rowsPerPage = staff.length <= 14 ? Math.max(staff.length, 1) : 14;
    const staffPages: any[][] = [];
    for (let i = 0; i < staff.length; i += rowsPerPage) staffPages.push(staff.slice(i, i + rowsPerPage));
    if (staffPages.length === 0) staffPages.push([]);
    const pagesHtml = staffPages.map((pageRows, pageIndex) => `
      <section class="salary-page">
        <div class="print-fit">
          <table class="page-table">
            ${colGroup}
            <thead>${renderPageHeader()}${renderColumnHeaders()}</thead>
            <tbody>
              ${renderStaffRows(pageRows, pageIndex * rowsPerPage)}
              ${pageIndex === staffPages.length - 1 ? renderTotalsAndNote() : ""}
            </tbody>
            ${renderFooter()}
          </table>
        </div>
      </section>
    `).join("");

    // ===== Late-arrival detail appendix (date • check-in → check-out • minutes) =====
    const fmt12 = (t: string): string => {
      if (!t) return "—";
      const [hRaw, mRaw] = String(t).split(":");
      let h = parseInt(hRaw, 10); const m = parseInt(mRaw || "0", 10);
      if (isNaN(h)) return "—";
      const period = h >= 12 ? (bn ? "PM" : "PM") : (bn ? "AM" : "AM");
      const h12 = h % 12 || 12;
      const out = `${h12}:${String(m).padStart(2, "0")} ${period}`;
      return bn ? toBnDigits(out) : out;
    };
    const fmtDate = (d: string): string => {
      if (!d) return "—";
      const [y, mo, da] = d.split("-");
      const out = `${da}/${mo}/${y}`;
      return bn ? toBnDigits(out) : out;
    };
    const fmtMins = (mins: number): string => {
      const h = Math.floor(mins / 60); const m = mins % 60;
      const parts: string[] = [];
      if (h > 0) parts.push(`${bn ? toBnDigits(h) : h} ${bn ? "ঘণ্টা" : "h"}`);
      parts.push(`${bn ? toBnDigits(m) : m} ${bn ? "মিনিট" : "min"}`);
      return parts.join(" ");
    };

    const staffWithLate = (staff || []).filter(
      (s: any) => Array.isArray(s.lateDetails) && s.lateDetails.length > 0
    );
    const lateAppendixHtml = staffWithLate.length > 0 ? `
      <section class="salary-page">
        <div class="print-fit">
          <table class="page-table">
            ${colGroup}
            <thead>${renderPageHeader()}</thead>
            <tbody>
              <tr><td colspan="${COL_COUNT}" style="padding:0;border:none;">
                <h3 style="text-align:center;margin:6pt 0 8pt;font-size:11pt;font-weight:700;">
                  ${bn ? "বিলম্ব উপস্থিতির বিবরণ" : "Late Attendance Details"}
                </h3>
                ${staffWithLate.map((s: any) => `
                  <div style="margin:0 0 10pt;">
                    <div style="font-weight:700;font-size:9.5pt;margin-bottom:3pt;">
                      ${escapeHtml(bn ? toBnDigits(s.name) : s.name)}${s.staff_id && s.staff_id !== "-" ? ` (${escapeHtml(bn ? toBnDigits(s.staff_id) : s.staff_id)})` : ""}
                    </div>
                    <table style="width:100%;border-collapse:collapse;font-size:8.5pt;">
                      <thead>
                        <tr style="background:#f1f5f9;">
                          <th style="border:0.5pt solid #94a3b8;padding:2.5pt 4pt;text-align:left;">${bn ? "তারিখ" : "Date"}</th>
                          <th style="border:0.5pt solid #94a3b8;padding:2.5pt 4pt;text-align:center;">${bn ? "প্রবেশ" : "Check-in"}</th>
                          <th style="border:0.5pt solid #94a3b8;padding:2.5pt 4pt;text-align:center;">${bn ? "বাহির" : "Check-out"}</th>
                          <th style="border:0.5pt solid #94a3b8;padding:2.5pt 4pt;text-align:right;">${bn ? "বিলম্ব" : "Late by"}</th>
                          <th style="border:0.5pt solid #94a3b8;padding:2.5pt 4pt;text-align:right;">${bn ? "কর্তন (৳)" : "Deduction (৳)"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${s.lateDetails.map((d: any) => `
                          <tr>
                            <td style="border:0.5pt solid #cbd5e1;padding:2.5pt 4pt;">${fmtDate(d.date)}</td>
                            <td style="border:0.5pt solid #cbd5e1;padding:2.5pt 4pt;text-align:center;">${fmt12(d.checkIn)}</td>
                            <td style="border:0.5pt solid #cbd5e1;padding:2.5pt 4pt;text-align:center;">${fmt12(d.checkOut)}</td>
                            <td style="border:0.5pt solid #cbd5e1;padding:2.5pt 4pt;text-align:right;font-weight:600;color:#b45309;">${fmtMins(Number(d.lateMin) || 0)}</td>
                            <td style="border:0.5pt solid #cbd5e1;padding:2.5pt 4pt;text-align:right;font-weight:600;color:#b91c1c;">${bn ? toBnDigits((Number(d.deduction) || 0).toLocaleString("en-US")) : (Number(d.deduction) || 0).toLocaleString("en-US")}</td>
                          </tr>
                        `).join("")}
                      </tbody>
                    </table>
                  </div>
                `).join("")}
              </td></tr>
            </tbody>
            ${renderFooter()}
          </table>
        </div>
      </section>
    ` : "";

    const staffWithAbsent = (staff || []).filter(
      (s: any) => Array.isArray(s.absentDetails) && s.absentDetails.length > 0
    );
    const absentAppendixHtml = staffWithAbsent.length > 0 ? `
      <section class="salary-page">
        <div class="print-fit">
          <table class="page-table">
            ${colGroup}
            <thead>${renderPageHeader()}</thead>
            <tbody>
              <tr><td colspan="${COL_COUNT}" style="padding:0;border:none;">
                <h3 style="text-align:center;margin:6pt 0 8pt;font-size:11pt;font-weight:700;">
                  ${bn ? "অনুপস্থিতির বিবরণী" : "Absence Details"}
                </h3>
                ${staffWithAbsent.map((s: any) => `
                  <div style="margin:0 0 10pt;page-break-inside:avoid;break-inside:avoid;display:table;width:100%;">
                    <div style="font-weight:700;font-size:9.5pt;margin-bottom:3pt;">
                      ${escapeHtml(bn ? toBnDigits(s.name) : s.name)}${s.staff_id && s.staff_id !== "-" ? ` (${escapeHtml(bn ? toBnDigits(s.staff_id) : s.staff_id)})` : ""}
                      <span style="font-weight:600;color:#b91c1c;margin-left:6pt;">${bn ? "মোট" : "Total"}: ${bn ? toBnDigits(s.absentDetails.length) : s.absentDetails.length} ${bn ? "দিন" : "days"}</span>
                    </div>
                    <table style="width:100%;border-collapse:collapse;font-size:8.5pt;">
                      <thead>
                        <tr style="background:#f1f5f9;">
                          <th style="border:0.5pt solid #94a3b8;padding:2.5pt 4pt;text-align:left;">${bn ? "ক্রম" : "SL"}</th>
                          <th style="border:0.5pt solid #94a3b8;padding:2.5pt 4pt;text-align:left;">${bn ? "তারিখ" : "Date"}</th>
                          <th style="border:0.5pt solid #94a3b8;padding:2.5pt 4pt;text-align:right;">${bn ? "কর্তন (৳)" : "Deduction (৳)"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${s.absentDetails.map((d: any, i: number) => `
                          <tr>
                            <td style="border:0.5pt solid #cbd5e1;padding:2.5pt 4pt;">${bn ? toBnDigits(i + 1) : i + 1}</td>
                            <td style="border:0.5pt solid #cbd5e1;padding:2.5pt 4pt;">${fmtDate(d.date)}</td>
                            <td style="border:0.5pt solid #cbd5e1;padding:2.5pt 4pt;text-align:right;font-weight:600;color:#b91c1c;">${bn ? toBnDigits((Number(d.deduction) || 0).toLocaleString("en-US")) : (Number(d.deduction) || 0).toLocaleString("en-US")}</td>
                          </tr>
                        `).join("")}
                      </tbody>
                    </table>
                  </div>
                `).join("")}
              </td></tr>
            </tbody>
            ${renderFooter()}
          </table>
        </div>
      </section>
    ` : "";

    const staffWithDuty = (staff || []).filter(
      (s: any) => Array.isArray(s.dutyDetails) && s.dutyDetails.length > 0
    );
    const dutyAppendixHtml = staffWithDuty.length > 0 ? `
      <section class="salary-page">
        <div class="print-fit">
          <table class="page-table">
            ${colGroup}
            <thead>${renderPageHeader()}</thead>
            <tbody>
              <tr><td colspan="${COL_COUNT}" style="padding:0;border:none;">
                <h3 style="text-align:center;margin:6pt 0 8pt;font-size:11pt;font-weight:700;">
                  ${bn ? "আবাসিক ডিউটি কর্তনের বিবরণী" : "Residential Duty Deduction Details"}
                </h3>
                ${staffWithDuty.map((s: any) => {
                  const total = s.dutyDetails.reduce((a: number, d: any) => a + (Number(d.amount) || 0), 0);
                  return `
                  <div style="margin:0 0 10pt;page-break-inside:avoid;break-inside:avoid;display:table;width:100%;">
                    <div style="font-weight:700;font-size:9.5pt;margin-bottom:3pt;">
                      ${escapeHtml(bn ? toBnDigits(s.name) : s.name)}${s.staff_id && s.staff_id !== "-" ? ` (${escapeHtml(bn ? toBnDigits(s.staff_id) : s.staff_id)})` : ""}
                      <span style="font-weight:600;color:#b91c1c;margin-left:6pt;">${bn ? "মোট কর্তন" : "Total"}: ৳${bn ? toBnDigits(total.toLocaleString("en-US")) : total.toLocaleString("en-US")}</span>
                    </div>
                    <table style="width:100%;border-collapse:collapse;font-size:8.5pt;">
                      <thead>
                        <tr style="background:#f1f5f9;">
                          <th style="border:0.5pt solid #94a3b8;padding:2.5pt 4pt;text-align:left;">${bn ? "ক্রম" : "SL"}</th>
                          <th style="border:0.5pt solid #94a3b8;padding:2.5pt 4pt;text-align:left;">${bn ? "তারিখ" : "Date"}</th>
                          <th style="border:0.5pt solid #94a3b8;padding:2.5pt 4pt;text-align:left;">${bn ? "শিফট" : "Shift"}</th>
                          <th style="border:0.5pt solid #94a3b8;padding:2.5pt 4pt;text-align:left;">${bn ? "কারণ" : "Reason"}</th>
                          <th style="border:0.5pt solid #94a3b8;padding:2.5pt 4pt;text-align:right;">${bn ? "কর্তন (৳)" : "Deduction (৳)"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${s.dutyDetails.map((d: any, i: number) => `
                          <tr>
                            <td style="border:0.5pt solid #cbd5e1;padding:2.5pt 4pt;">${bn ? toBnDigits(i + 1) : i + 1}</td>
                            <td style="border:0.5pt solid #cbd5e1;padding:2.5pt 4pt;">${fmtDate(d.date)}</td>
                            <td style="border:0.5pt solid #cbd5e1;padding:2.5pt 4pt;">${escapeHtml(String(d.shift || "—"))}</td>
                            <td style="border:0.5pt solid #cbd5e1;padding:2.5pt 4pt;">${escapeHtml(String(d.note || (d.reason === "absent" ? (bn ? "অনুপস্থিত" : "Absent") : (bn ? "বিলম্ব" : "Late"))))}</td>
                            <td style="border:0.5pt solid #cbd5e1;padding:2.5pt 4pt;text-align:right;font-weight:600;color:#b91c1c;">${bn ? toBnDigits((Number(d.amount) || 0).toLocaleString("en-US")) : (Number(d.amount) || 0).toLocaleString("en-US")}</td>
                          </tr>
                        `).join("")}
                      </tbody>
                    </table>
                  </div>
                `; }).join("")}
              </td></tr>
            </tbody>
            ${renderFooter()}
          </table>
        </div>
      </section>
    ` : "";

    const holidayTypeLabel = (t: string): string => {
      if (bn) {
        if (t === "weekly") return "সাপ্তাহিক";
        if (t === "public") return "সরকারি";
        if (t === "special") return "বিশেষ";
        return t || "—";
      }
      return t ? t.charAt(0).toUpperCase() + t.slice(1) : "—";
    };
    const holidayAppendixHtml = monthHolidays.length > 0 ? `
      <section class="salary-page">
        <div class="print-fit">
          <table class="page-table">
            ${colGroup}
            <thead>${renderPageHeader()}</thead>
            <tbody>
              <tr><td colspan="${COL_COUNT}" style="padding:0;border:none;">
                <h3 style="text-align:center;margin:6pt 0 8pt;font-size:11pt;font-weight:700;">
                  ${bn ? "ছুটির তালিকা" : "Holiday List"} — ${escapeHtml(monthLabel)} ${escapeHtml(bn ? toBnDigits(year) : year)}
                </h3>
                <table style="width:100%;border-collapse:collapse;font-size:9pt;">
                  <thead>
                    <tr style="background:#f1f5f9;">
                      <th style="border:0.5pt solid #94a3b8;padding:3pt 5pt;text-align:left;width:8%;">${bn ? "ক্রম" : "SL"}</th>
                      <th style="border:0.5pt solid #94a3b8;padding:3pt 5pt;text-align:left;width:20%;">${bn ? "তারিখ" : "Date"}</th>
                      <th style="border:0.5pt solid #94a3b8;padding:3pt 5pt;text-align:left;">${bn ? "কারণ" : "Reason"}</th>
                      <th style="border:0.5pt solid #94a3b8;padding:3pt 5pt;text-align:center;width:16%;">${bn ? "ধরন" : "Type"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${monthHolidays.map((h: any, i: number) => `
                      <tr>
                        <td style="border:0.5pt solid #cbd5e1;padding:3pt 5pt;">${bn ? toBnDigits(i + 1) : i + 1}</td>
                        <td style="border:0.5pt solid #cbd5e1;padding:3pt 5pt;">${fmtDate(h.holiday_date)}</td>
                        <td style="border:0.5pt solid #cbd5e1;padding:3pt 5pt;">${escapeHtml(bn ? (h.name_bn || h.name_en || "—") : (h.name_en || h.name_bn || "—"))}${h.notes ? ` <span style="color:#64748b;">(${escapeHtml(h.notes)})</span>` : ""}</td>
                        <td style="border:0.5pt solid #cbd5e1;padding:3pt 5pt;text-align:center;">${escapeHtml(holidayTypeLabel(h.holiday_type))}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
                <div style="margin-top:6pt;font-size:8.5pt;color:#475569;">
                  ${bn ? "মোট ছুটি" : "Total holidays"}: ${bn ? toBnDigits(monthHolidays.length) : monthHolidays.length} ${bn ? "দিন" : "days"}
                </div>
              </td></tr>
            </tbody>
            ${renderFooter()}
          </table>
        </div>
      </section>
    ` : "";

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${bn ? "বেতন বিবরণী" : "Salary Statement"} — ${monthLabel} ${year}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;500;600;700&family=Tinos:ital,wght@0,400;0,700;1,400&display=swap');
  @import url('https://fonts.maateen.me/solaiman-lipi/font.css');
  @font-face { font-family: 'Kalpurush'; src: url('https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/kalpurush/Kalpurush-v0.258.ttf') format('truetype'); font-display: block; }
  *,*::before,*::after { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body {
    background: #ffffff;
    color: #000000;
    font-family: 'Kalpurush', 'SolaimanLipi', 'Noto Serif Bengali', 'Tinos', 'Times New Roman', serif;
    font-size: 10pt;
    line-height: 1.3;
  }
  body { padding: 0; }

  .salary-page {
    width: 297mm;
    height: 210mm;
    margin: 0 auto;
    background: #fff;
    padding: 8mm 10mm;
    position: relative;
    break-after: page;
    page-break-after: always;
    overflow: hidden;
  }
  .print-fit {
    width: 100%;
    transform-origin: top center;
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
    font-family: 'Kalpurush', 'Noto Serif Bengali', serif;
  }
  .inst-name {
    font-family: 'Kalpurush', 'Noto Serif Bengali', 'Tinos', serif;
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
    font-family: 'Kalpurush', 'Noto Serif Bengali', 'Tinos', serif;
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
    font-size: 7.5pt;
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
    padding: 5pt 5pt;
    text-align: left;
    border: 0.5pt solid #000;
    font-family: 'Kalpurush', 'Noto Serif Bengali', 'Tinos', serif;
    vertical-align: middle;
    font-size: 7.5pt;
    line-height: 1.5;
    /* Long headers wrap softly across spaces, then fall back to anywhere */
    white-space: normal;
    overflow-wrap: break-word;
    word-break: normal;
    hyphens: auto;
    -webkit-hyphens: auto;
  }
  thead th.center { text-align: center; }
  thead th.right  { text-align: right; }
  /* Numeric headers stay aligned with their columns and never wrap awkwardly */
  thead th.right, thead th.center {
    word-break: keep-all;
    overflow-wrap: normal;
    hyphens: manual;
  }

  tbody td {
    padding: 4.5pt 5pt;
    border: 0.4pt solid #000;
    font-size: 7.5pt;
    vertical-align: middle;
    color: #000;
    line-height: 1.5;
    overflow: hidden;
    /* Default body cells: wrap softly */
    white-space: normal;
    overflow-wrap: break-word;
    word-break: normal;
    hyphens: auto;
    -webkit-hyphens: auto;
  }
  tbody tr:nth-child(even) td { background: #fafafa; }

  .staff-row { min-height: 9mm; }

  /* === Numeric / amount columns: keep on a single line, right-aligned, monospaced digits === */
  .c-num {
    text-align: center;
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1, "lnum" 1;
    white-space: nowrap;
    word-break: keep-all;
    overflow-wrap: normal;
    hyphens: manual;
    letter-spacing: 0;
  }
  .c-amt {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1, "lnum" 1;
    white-space: nowrap;
    word-break: keep-all;
    overflow-wrap: normal;
    hyphens: manual;
    letter-spacing: 0;
  }
  .c-net { font-weight: 700; }

  /* === Name + Staff ID column: aggressive wrapping for long names === */
  .c-name {
    text-align: left;
    overflow-wrap: anywhere;
    word-break: break-word;
    hyphens: auto;
    -webkit-hyphens: auto;
    line-height: 1.4;
  }
  .c-name .nm {
    font-weight: 700;
    font-size: 7.5pt;
    overflow-wrap: anywhere;
    word-break: break-word;
    hyphens: auto;
    display: block;
    line-height: 1.4;
  }
  .c-name .sid {
    font-size: 6.8pt;
    color: #444;
    margin-top: 1pt;
    font-family: 'Kalpurush', 'Tinos', monospace;
    letter-spacing: 0.2pt;
    line-height: 1.3;
    /* IDs are alphanumeric — break anywhere if needed but never wrap mid-digit-run on big screens */
    overflow-wrap: anywhere;
    word-break: break-all;
    white-space: normal;
    display: block;
  }

  .totals td {
    background: #e8e8e8 !important;
    font-weight: 700;
    border: 0.75pt solid #000;
    padding: 5pt 5pt;
    font-size: 7.5pt;
    line-height: 1.5;
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
    font-family: 'Kalpurush', 'Noto Serif Bengali', 'Tinos', serif;
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
    font-family: 'Kalpurush', 'Tinos', monospace;
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
      height: var(--print-page-height, auto);
      max-height: var(--print-page-height, none);
      min-height: 0;
      padding: 0;
      overflow: visible;
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
      margin: 10mm;
      @bottom-right {
        content: "${bn ? "পৃষ্ঠা " : "Page "}" counter(page) "${bn ? " / " : " of "}" counter(pages);
        font-family: 'Kalpurush', 'SolaimanLipi', 'Noto Serif Bengali', 'Tinos', serif;
        font-size: 9pt;
        color: #000;
        padding-right: 4mm;
      }
    }
    /* Force table to use full A4 landscape width — no manual scaling */
    .salary-page, .print-fit, .sheet, table {
      width: 100% !important;
      max-width: 100% !important;
    }
    .print-fit { transform: none !important; zoom: 1 !important; }
    table { table-layout: auto !important; }
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
    table { page-break-inside: avoid; break-inside: avoid; font-size: 8.5pt; }
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
    thead th { font-size: 8pt; padding: 3pt 3.5pt; line-height: 1.4; }
    tbody td { font-size: 8pt; padding: 3pt 3.5pt; line-height: 1.45; }
    .staff-row { min-height: 7.5mm; height: auto; }
    .c-name .nm { font-size: 8pt; line-height: 1.4; }
    .c-name .sid { font-size: 7pt; line-height: 1.3; }
    .totals td { padding: 3pt 3.5pt; line-height: 1.4; }
    .note-cell { font-size: 7.6pt; padding: 1.8pt 3pt; }
    .signatures { margin: 4mm 3mm 1mm; gap: 5mm; }
    .sig, .sig .role { font-size: 7.2pt; }
    .sig .sig-name { font-size: 7.8pt; min-height: 8pt; }
    .sig .role-meta, .footer, .footer .ref { font-size: 6.4pt; }
    .footer { margin-top: 3pt; padding-top: 2pt; }
    .salary-page { border: none !important; }
  }
  /* Auto-fit hooks */
  @media print {
    .print-fit { transform-origin: top left; }
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
      <option value="A3">A3</option>
    </select>
  </div>
  <div class="grp">
    <label for="ps-min">${bn ? 'সর্বনিম্ন স্কেল' : 'Min scale'}:</label>
    <input id="ps-min" type="range" min="0.4" max="1" step="0.05" value="1"/>
    <span class="val" id="ps-min-v">100%</span>
  </div>
  <div class="grp">
    <label for="ps-max">${bn ? 'সর্বোচ্চ স্কেল' : 'Max scale'}:</label>
    <input id="ps-max" type="range" min="0.5" max="1.2" step="0.05" value="1"/>
    <span class="val" id="ps-max-v">100%</span>
  </div>
  <div class="grp">
    <label for="ps-margin">${bn ? 'মার্জিন (mm)' : 'Margin (mm)'}:</label>
    <input id="ps-margin" type="number" min="0" max="25" step="1" value="10"/>
  </div>
  <div class="grp" style="margin-left:auto">
    <button id="ps-print" type="button">🖨️ ${bn ? 'প্রিন্ট করুন' : 'Print'}</button>
  </div>
  <div class="hint">${bn ? 'ব্রাউজার ডায়ালগে অরিয়েন্টেশন/সাইজ মিলিয়ে দিন।' : 'Match the browser dialog to these settings.'}</div>
</div>
<div class="sheet">

  ${pagesHtml}
  ${lateAppendixHtml}
  ${absentAppendixHtml}
  ${dutyAppendixHtml}
  ${holidayAppendixHtml}

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
      minScale: 1,
      maxScale: 1,
      marginMm: 10,
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
      el.textContent =
        '@page { size: ' + settings.paper + ' ' + settings.orientation + '; margin: ' + m + 'mm; }' +
        '@media print { @page { size: ' + settings.paper + ' ' + settings.orientation + '; margin: ' + m + 'mm; } }';
      // expose for autoFit
      settings._pageW = w; settings._pageH = h;
    }

    function autoFit(){
      var pages = document.querySelectorAll('.salary-page');
      var MM_TO_PX = 96 / 25.4;
      var pp = PAPER[settings.paper] || PAPER.A4;
      var pageWmm = settings.orientation === 'landscape' ? pp.h : pp.w;
      var pageHmm = settings.orientation === 'landscape' ? pp.w : pp.h;
      var maxW = (pageWmm - settings.marginMm * 2) * MM_TO_PX;
      // Subtract a small safety epsilon so a fixed page-box height that equals the
      // printable area can't spill 1px onto a trailing blank page.
      var maxH = (pageHmm - settings.marginMm * 2) * MM_TO_PX - 6;
      // Auto floor: how small auto-fit is allowed to shrink to guarantee the
      // full content (incl. bottom signatures) fits — independent of the UI min slider.
      var AUTO_FLOOR = 0.55;
      pages.forEach(function(p){
        var inner = p.querySelector('.print-fit') || p;
        // Reset any prior sizing and measure the TRUE content height BEFORE
        // pinning the page height, so signatures (tfoot) are included.
        inner.style.zoom = ''; inner.style.transform = ''; inner.style.width = ''; inner.style.height = '';
        inner.style.maxWidth = maxW + 'px';
        var h = inner.scrollHeight, w = inner.scrollWidth;
        // Now pin the printed page box.
        p.style.setProperty('--print-page-height', maxH + 'px');
        p.style.width = maxW + 'px';
        p.style.maxWidth = maxW + 'px';
        p.style.height = maxH + 'px';
        var computed = Math.min(maxH / h, maxW / w) * 0.985;
        // If content overflows, allow shrinking down to AUTO_FLOOR regardless of
        // the UI min slider; otherwise honor the user's min/max range.
        var overflow = (h > maxH) || (w > maxW);
        var lo = overflow ? Math.min(settings.minScale, AUTO_FLOOR) : settings.minScale;
        var scale = Math.max(lo, Math.min(settings.maxScale, computed));
        if (scale >= 0.999 && h <= maxH && w <= maxW) return;
        if (isSafari || true) {
          inner.style.transform = 'scale(' + scale + ')';
          inner.style.transformOrigin = 'top center';
          inner.style.width = (maxW / scale) + 'px';
          inner.style.height = (h * scale) + 'px';
        } else {
          inner.style.zoom = String(scale);
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
        var inner = p.querySelector('.print-fit') || p;
        p.style.removeProperty('--print-page-height');
        p.style.width=''; p.style.maxWidth=''; p.style.height='';
        inner.style.zoom=''; inner.style.transform=''; inner.style.width=''; inner.style.height=''; inner.style.maxWidth='';
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
