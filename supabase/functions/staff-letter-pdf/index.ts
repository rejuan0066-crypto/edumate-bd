import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
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
    const {
      type, // 'promotion' | 'salary_change'
      language,
      staff, // { name, staff_id, designation, joining_date, photo_url }
      // promotion fields
      old_designation,
      new_designation,
      // salary fields
      old_salary,
      new_salary,
      change_type, // 'increase' | 'decrease' | 'adjustment'
      // common
      effective_date,
      reason,
      letter_number,
      issued_by,
    } = body || {};

    if (!type || !staff) {
      return new Response(JSON.stringify({ error: "Invalid data" }), { status: 400, headers: corsHeaders });
    }

    const bn = language !== "en";
    const toBn = (v: string | number) => {
      const d = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
      return String(v).replace(/[0-9]/g, x => d[parseInt(x)]);
    };
    const fmtNum = (n: number) => bn ? toBn(n.toLocaleString('en-US')) : n.toLocaleString('en-US');
    const fmtDate = (d: string | undefined) => {
      if (!d) return '';
      const dt = new Date(d);
      const day = String(dt.getDate()).padStart(2, '0');
      const mo = String(dt.getMonth() + 1).padStart(2, '0');
      const yr = dt.getFullYear();
      const out = `${day}/${mo}/${yr}`;
      return bn ? toBn(out) : out;
    };

    // Fetch institution + signatures
    const [{ data: institution }, { data: wsRows }] = await Promise.all([
      supabase.from("institutions").select("*").eq("is_default", true).maybeSingle(),
      supabase.from("website_settings").select("key,value").in("key", [
        "institution_name","institution_name_en","address","address_en",
        "phone","email","logo_url","principal_name","principal_name_en",
      ]),
    ]);
    const ws: Record<string,string> = {};
    (wsRows || []).forEach((r: any) => {
      ws[r.key] = (typeof r.value === 'string' ? r.value : (r.value ?? '')) || '';
    });
    const inst: any = institution || {};
    const pick = (a: string, b: string, fb = '') => {
      const x = inst[a]; if (x != null && String(x).trim() !== '') return String(x).trim();
      const y = ws[b]; if (y != null && String(y).trim() !== '') return String(y).trim();
      return fb;
    };
    const instName = pick("name", "institution_name", bn ? "প্রতিষ্ঠান" : "Institution");
    const instAddress = pick("address", "address", "");
    const instPhone = pick("phone", "phone", "");
    const instEmail = pick("email", "email", "");
    const instLogo = pick("logo_url", "logo_url", "");
    const principalName = pick("principal_name", "principal_name", bn ? "প্রিন্সিপাল" : "Principal");

    const memoNo = letter_number || `${type === 'promotion' ? (bn ? 'পদ' : 'PRO') : (bn ? 'বে' : 'SAL')}-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    const issueDate = fmtDate(new Date().toISOString());

    const isPromotion = type === 'promotion';
    const titleText = isPromotion
      ? (bn ? 'পদোন্নতি / পদবি পরিবর্তন পত্র' : 'Promotion / Designation Change Letter')
      : (bn ? 'বেতন পরিবর্তন পত্র' : 'Salary Revision Letter');

    // Body content
    const staffName = staff.name || '';
    const staffIdTxt = staff.staff_id || '-';
    const currentDesig = staff.designation || '';

    let bodyHtml = '';
    if (isPromotion) {
      bodyHtml = bn ? `
        <p>প্রিয় <strong>${staffName}</strong> (আইডি: ${staffIdTxt}),</p>
        <p>আপনাকে অবগত করা যাইতেছে যে, প্রতিষ্ঠানের পরিচালনা কর্তৃপক্ষের সিদ্ধান্ত মোতাবেক <strong>${fmtDate(effective_date)}</strong> তারিখ হইতে আপনার পদবি নিম্নরূপে পরিবর্তন করা হইল —</p>
        <table class="info">
          <tr><th>পূর্বের পদবি</th><td>${old_designation || currentDesig || '—'}</td></tr>
          <tr><th>নতুন পদবি</th><td><strong>${new_designation || '—'}</strong></td></tr>
          <tr><th>কার্যকর তারিখ</th><td>${fmtDate(effective_date)}</td></tr>
          ${reason ? `<tr><th>কারণ / মন্তব্য</th><td>${reason}</td></tr>` : ''}
        </table>
        <p>আশা করা যায়, আপনি নতুন দায়িত্বে দক্ষতা ও আন্তরিকতার সহিত কর্ম সম্পাদন করিয়া প্রতিষ্ঠানের সুনাম বৃদ্ধিতে ভূমিকা রাখিবেন। প্রতিষ্ঠানের সকল নিয়ম-কানুন যথাযথভাবে মানিয়া চলিতে অনুরোধ করা হইল।</p>
        <p>আপনার নতুন দায়িত্বের জন্য শুভকামনা রহিল।</p>
      ` : `
        <p>Dear <strong>${staffName}</strong> (ID: ${staffIdTxt}),</p>
        <p>We are pleased to inform you that, as per the decision of the management, your designation has been revised with effect from <strong>${fmtDate(effective_date)}</strong> as follows —</p>
        <table class="info">
          <tr><th>Previous Designation</th><td>${old_designation || currentDesig || '—'}</td></tr>
          <tr><th>New Designation</th><td><strong>${new_designation || '—'}</strong></td></tr>
          <tr><th>Effective Date</th><td>${fmtDate(effective_date)}</td></tr>
          ${reason ? `<tr><th>Reason / Remarks</th><td>${reason}</td></tr>` : ''}
        </table>
        <p>We expect you to discharge your new responsibilities with dedication and integrity, and uphold the institution's values and policies.</p>
        <p>Best wishes for your new role.</p>
      `;
    } else {
      const isInc = change_type === 'increase';
      const isDec = change_type === 'decrease';
      const changeLabel = bn
        ? (isInc ? 'বৃদ্ধি' : isDec ? 'হ্রাস' : 'সমন্বয়')
        : (isInc ? 'Increase' : isDec ? 'Decrease' : 'Adjustment');
      const diff = Number(new_salary || 0) - Number(old_salary || 0);
      const diffAbs = Math.abs(diff);
      bodyHtml = bn ? `
        <p>প্রিয় <strong>${staffName}</strong> (আইডি: ${staffIdTxt}, পদবি: ${currentDesig || '—'}),</p>
        <p>প্রতিষ্ঠানের পরিচালনা কর্তৃপক্ষের সিদ্ধান্ত মোতাবেক <strong>${fmtDate(effective_date)}</strong> তারিখ হইতে আপনার মাসিক বেতন <strong>${changeLabel}</strong> করিয়া নিম্নরূপ নির্ধারণ করা হইল —</p>
        <table class="info">
          <tr><th>পূর্বের বেতন</th><td>৳ ${fmtNum(Number(old_salary || 0))}</td></tr>
          <tr><th>নতুন বেতন</th><td><strong>৳ ${fmtNum(Number(new_salary || 0))}</strong></td></tr>
          <tr><th>${isDec ? 'হ্রাসকৃত পরিমাণ' : 'বৃদ্ধির পরিমাণ'}</th><td>৳ ${fmtNum(diffAbs)}</td></tr>
          <tr><th>কার্যকর তারিখ</th><td>${fmtDate(effective_date)}</td></tr>
          ${reason ? `<tr><th>কারণ / মন্তব্য</th><td>${reason}</td></tr>` : ''}
        </table>
        <p>উক্ত সিদ্ধান্ত অনুযায়ী পরবর্তী মাস হইতে আপনার বেতন নতুন হারে প্রদান করা হইবে। প্রতিষ্ঠানের সকল নিয়ম-কানুন যথাযথভাবে মানিয়া চলিতে অনুরোধ করা হইল।</p>
      ` : `
        <p>Dear <strong>${staffName}</strong> (ID: ${staffIdTxt}, Designation: ${currentDesig || '—'}),</p>
        <p>As per the decision of the management, your monthly salary has been <strong>${changeLabel.toLowerCase()}d</strong> with effect from <strong>${fmtDate(effective_date)}</strong> as follows —</p>
        <table class="info">
          <tr><th>Previous Salary</th><td>BDT ${fmtNum(Number(old_salary || 0))}</td></tr>
          <tr><th>Revised Salary</th><td><strong>BDT ${fmtNum(Number(new_salary || 0))}</strong></td></tr>
          <tr><th>${isDec ? 'Reduction Amount' : 'Increment Amount'}</th><td>BDT ${fmtNum(diffAbs)}</td></tr>
          <tr><th>Effective Date</th><td>${fmtDate(effective_date)}</td></tr>
          ${reason ? `<tr><th>Reason / Remarks</th><td>${reason}</td></tr>` : ''}
        </table>
        <p>The revised salary will be effective from the next pay cycle. Please continue to abide by all institutional policies.</p>
      `;
    }

    const logoBlock = instLogo
      ? `<img src="${instLogo}" alt="logo" class="logo-img"/>`
      : `<div class="logo-fallback">${(instName || 'A').charAt(0)}</div>`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${titleText} — ${staffName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;500;600;700&family=Tinos:ital,wght@0,400;0,700;1,400&display=swap');
  *,*::before,*::after { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  html, body { background:#fff; color:#000; font-family:'Noto Serif Bengali','Tinos','Times New Roman',serif; font-size:12pt; line-height:1.55; }
  body { padding: 14mm 14mm; }
  .sheet { max-width: 190mm; margin:0 auto; background:#fff; border:1.5pt solid #000; padding:10mm 14mm 14mm; position:relative; min-height: 260mm; }

  .letterhead { text-align:center; border-bottom:2pt double #000; padding-bottom:8pt; margin-bottom:10pt; position:relative; min-height:78px; }
  .logo-wrap { position:absolute; left:0; top:2pt; width:78px; height:78px; border:1pt solid #000; display:flex; align-items:center; justify-content:center; overflow:hidden; background:#fff; }
  .logo-img { width:100%; height:100%; object-fit:contain; padding:2px; }
  .logo-fallback { font-size:36px; font-weight:700; color:#000; }
  .inst-name { font-size:22pt; font-weight:700; line-height:1.15; letter-spacing:.2pt; margin:0 0 4pt; }
  .inst-address { font-size:11pt; line-height:1.35; }
  .inst-contact { font-size:10.5pt; margin-top:2pt; }
  .inst-contact .sep { margin:0 6pt; }

  .doc-title { text-align:center; margin: 10pt 0 8pt; }
  .doc-title h2 { font-size:15pt; font-weight:700; letter-spacing:1pt; text-transform:uppercase; display:inline-block; padding:4pt 22pt; border:1.25pt solid #000; border-radius:2pt; }

  .memo-row { display:flex; justify-content:space-between; font-size:10.5pt; margin: 8pt 0 14pt; }
  .memo-row strong { font-weight:700; }

  .body-content p { margin: 6pt 0; text-align: justify; }
  .body-content table.info { width: 100%; border-collapse: collapse; margin: 8pt 0 10pt; font-size:11pt; }
  .body-content table.info th, .body-content table.info td { border: 0.6pt solid #000; padding: 5pt 8pt; text-align: left; vertical-align: middle; }
  .body-content table.info th { background:#f1f1f1; width: 38%; font-weight:700; }

  .closing { margin-top: 18pt; }
  .closing p { margin: 4pt 0; }

  .signature-block { margin-top: 28mm; display:flex; justify-content: flex-end; }
  .signature-block .sig { text-align:center; min-width: 70mm; }
  .signature-block .sig-line { border-top: 1pt solid #000; margin-bottom: 4pt; }
  .signature-block .sig-name { font-weight:700; font-size: 11.5pt; }
  .signature-block .role { font-size: 10.5pt; font-style: italic; margin-top: 1pt; }

  .footer { margin-top: 14pt; padding-top: 6pt; border-top: 0.5pt solid #000; text-align:center; font-size:9pt; }
  .footer .ref { margin-top:2pt; font-size:8.5pt; color:#333; }

  @media print {
    body { padding:0; background:#fff; }
    .sheet { border:1.25pt solid #000; max-width:100%; min-height: auto; }
    @page { size: A4 portrait; margin: 12mm; }
  }
</style></head><body>
<div class="sheet">
  <div class="letterhead">
    <div class="logo-wrap">${logoBlock}</div>
    <div class="inst-name">${instName}</div>
    ${instAddress ? `<div class="inst-address">${instAddress}</div>` : ''}
    <div class="inst-contact">
      ${instPhone ? `<span>${bn ? 'ফোন' : 'Phone'}: ${bn ? toBn(instPhone) : instPhone}</span>` : ''}
      ${instPhone && instEmail ? `<span class="sep">|</span>` : ''}
      ${instEmail ? `<span>${bn ? 'ইমেইল' : 'E-mail'}: ${instEmail}</span>` : ''}
    </div>
  </div>

  <div class="doc-title"><h2>${titleText}</h2></div>

  <div class="memo-row">
    <span><strong>${bn ? 'স্মারক নং:' : 'Memo No:'}</strong> ${memoNo}</span>
    <span><strong>${bn ? 'তারিখ:' : 'Date:'}</strong> ${issueDate}</span>
  </div>

  <div class="body-content">
    ${bodyHtml}
  </div>

  <div class="closing">
    <p>${bn ? 'ধন্যবাদান্তে,' : 'Sincerely,'}</p>
  </div>

  <div class="signature-block">
    <div class="sig">
      <div class="sig-line"></div>
      <div class="sig-name">${principalName || '&nbsp;'}</div>
      <div class="role">${issued_by ? issued_by : (bn ? 'প্রিন্সিপাল' : 'Principal')}</div>
      <div class="role">${instName}</div>
    </div>
  </div>

  <div class="footer">
    <div>© ${instName}</div>
    <div class="ref">${bn ? 'স্মারক:' : 'Ref:'} ${memoNo} &nbsp;•&nbsp; ${bn ? 'মুদ্রণ:' : 'Printed:'} ${issueDate}</div>
  </div>
</div>
</body></html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("staff-letter-pdf error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
