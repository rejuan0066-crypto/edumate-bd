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

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminClient = createClient(supabaseUrl, serviceKey!);
    const { data: hasAdmin } = await adminClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const { data: hasSuperAdmin } = await adminClient.rpc("has_role", { _user_id: user.id, _role: "super_admin" });
    const isStaffAdmin = hasAdmin === true || hasSuperAdmin === true;

    // Access control: non-admins can only view their own staff letters
    if (!isStaffAdmin) {
      const requestedStaffId = (await req.clone().json().catch(() => ({})))?.staff?.staff_id;
      const { data: staffRow } = await adminClient
        .from("staff")
        .select("user_id, staff_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!staffRow || (requestedStaffId && staffRow.staff_id !== requestedStaffId)) {
        return new Response(JSON.stringify({ error: "Forbidden: You can only generate or view your own staff letters" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
      // editable text overrides
      intro_text,
      closing_text,
      subject_text,
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

    const memoNo = letter_number || `${type === 'promotion' ? 'P' : 'S'}-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    const issueDate = fmtDate(new Date().toISOString());

    const isPromotion = type === 'promotion';
    const titleText = isPromotion
      ? (bn ? 'পদোন্নতি / পদবি পরিবর্তন পত্র' : 'Promotion / Designation Change Letter')
      : (bn ? 'বেতন পরিবর্তন পত্র' : 'Salary Revision Letter');

    // Body content
    const staffName = staff.name || '';
    const staffIdTxt = staff.staff_id || '-';
    const currentDesig = staff.designation || '';

    const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
    const richText = (s: string) => esc(s).replace(/\n/g, '<br/>');

    let bodyHtml = '';
    if (isPromotion) {
      const defaultIntroBn = `আপনাকে অবগত করা যাইতেছে যে, প্রতিষ্ঠানের পরিচালনা কর্তৃপক্ষের সিদ্ধান্ত মোতাবেক <strong>${fmtDate(effective_date)}</strong> তারিখ হইতে আপনার পদবি নিম্নরূপে পরিবর্তন করা হইল —`;
      const defaultIntroEn = `We are pleased to inform you that, as per the decision of the management, your designation has been revised with effect from <strong>${fmtDate(effective_date)}</strong> as follows —`;
      const defaultClosingBn = `আশা করা যায়, আপনি নতুন দায়িত্বে দক্ষতা ও আন্তরিকতার সহিত কর্ম সম্পাদন করিয়া প্রতিষ্ঠানের সুনাম বৃদ্ধিতে ভূমিকা রাখিবেন। প্রতিষ্ঠানের সকল নিয়ম-কানুন যথাযথভাবে মানিয়া চলিতে অনুরোধ করা হইল।\n\nআপনার নতুন দায়িত্বের জন্য শুভকামনা রহিল।`;
      const defaultClosingEn = `We expect you to discharge your new responsibilities with dedication and integrity, and uphold the institution's values and policies.\n\nBest wishes for your new role.`;
      const introHtml = intro_text ? richText(intro_text) : (bn ? defaultIntroBn : defaultIntroEn);
      const closingHtml = closing_text ? richText(closing_text) : (bn ? defaultClosingBn : defaultClosingEn);

      bodyHtml = bn ? `
        <p>প্রিয় <strong>${staffName}</strong> (আইডি: ${staffIdTxt}),</p>
        <p>${introHtml}</p>
        <table class="info">
          <tr><th>পূর্বের পদবি</th><td>${old_designation || currentDesig || '—'}</td></tr>
          <tr><th>নতুন পদবি</th><td><strong>${new_designation || '—'}</strong></td></tr>
          <tr><th>কার্যকর তারিখ</th><td>${fmtDate(effective_date)}</td></tr>
          ${reason ? `<tr><th>কারণ / মন্তব্য</th><td>${esc(reason)}</td></tr>` : ''}
        </table>
        <p>${closingHtml}</p>
      ` : `
        <p>Dear <strong>${staffName}</strong> (ID: ${staffIdTxt}),</p>
        <p>${introHtml}</p>
        <table class="info">
          <tr><th>Previous Designation</th><td>${old_designation || currentDesig || '—'}</td></tr>
          <tr><th>New Designation</th><td><strong>${new_designation || '—'}</strong></td></tr>
          <tr><th>Effective Date</th><td>${fmtDate(effective_date)}</td></tr>
          ${reason ? `<tr><th>Reason / Remarks</th><td>${esc(reason)}</td></tr>` : ''}
        </table>
        <p>${closingHtml}</p>
      `;
    } else {
      const isInc = change_type === 'increase';
      const isDec = change_type === 'decrease';
      const changeLabel = bn
        ? (isInc ? 'বৃদ্ধি' : isDec ? 'হ্রাস' : 'সমন্বয়')
        : (isInc ? 'Increase' : isDec ? 'Decrease' : 'Adjustment');
      const diff = Number(new_salary || 0) - Number(old_salary || 0);
      const diffAbs = Math.abs(diff);

      const defaultIntroBn = `প্রতিষ্ঠানের পরিচালনা কর্তৃপক্ষের সিদ্ধান্ত মোতাবেক <strong>${fmtDate(effective_date)}</strong> তারিখ হইতে আপনার মাসিক বেতন <strong>${changeLabel}</strong> করিয়া নিম্নরূপ নির্ধারণ করা হইল —`;
      const defaultIntroEn = `As per the decision of the management, your monthly salary has been <strong>${changeLabel.toLowerCase()}d</strong> with effect from <strong>${fmtDate(effective_date)}</strong> as follows —`;
      const defaultClosingBn = `উক্ত সিদ্ধান্ত অনুযায়ী পরবর্তী মাস হইতে আপনার বেতন নতুন হারে প্রদান করা হইবে। প্রতিষ্ঠানের সকল নিয়ম-কানুন যথাযথভাবে মানিয়া চলিতে অনুরোধ করা হইল।`;
      const defaultClosingEn = `The revised salary will be effective from the next pay cycle. Please continue to abide by all institutional policies.`;
      const introHtml = intro_text ? richText(intro_text) : (bn ? defaultIntroBn : defaultIntroEn);
      const closingHtml = closing_text ? richText(closing_text) : (bn ? defaultClosingBn : defaultClosingEn);

      bodyHtml = bn ? `
        <p>প্রিয় <strong>${staffName}</strong> (আইডি: ${staffIdTxt}, পদবি: ${currentDesig || '—'}),</p>
        <p>${introHtml}</p>
        <table class="info">
          <tr><th>পূর্বের বেতন</th><td>৳ ${fmtNum(Number(old_salary || 0))}</td></tr>
          <tr><th>নতুন বেতন</th><td><strong>৳ ${fmtNum(Number(new_salary || 0))}</strong></td></tr>
          <tr><th>${isDec ? 'হ্রাসকৃত পরিমাণ' : 'বৃদ্ধির পরিমাণ'}</th><td>৳ ${fmtNum(diffAbs)}</td></tr>
          <tr><th>কার্যকর তারিখ</th><td>${fmtDate(effective_date)}</td></tr>
          ${reason ? `<tr><th>কারণ / মন্তব্য</th><td>${esc(reason)}</td></tr>` : ''}
        </table>
        <p>${closingHtml}</p>
      ` : `
        <p>Dear <strong>${staffName}</strong> (ID: ${staffIdTxt}, Designation: ${currentDesig || '—'}),</p>
        <p>${introHtml}</p>
        <table class="info">
          <tr><th>Previous Salary</th><td>BDT ${fmtNum(Number(old_salary || 0))}</td></tr>
          <tr><th>Revised Salary</th><td><strong>BDT ${fmtNum(Number(new_salary || 0))}</strong></td></tr>
          <tr><th>${isDec ? 'Reduction Amount' : 'Increment Amount'}</th><td>BDT ${fmtNum(diffAbs)}</td></tr>
          <tr><th>Effective Date</th><td>${fmtDate(effective_date)}</td></tr>
          ${reason ? `<tr><th>Reason / Remarks</th><td>${esc(reason)}</td></tr>` : ''}
        </table>
        <p>${closingHtml}</p>
      `;
    }

    const logoBlock = instLogo
      ? `<img src="${instLogo}" alt="logo" class="logo-img"/>`
      : `<div class="logo-fallback">${(instName || 'A').charAt(0)}</div>`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=840, initial-scale=1, viewport-fit=cover">
<title>${titleText} — ${staffName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400&family=Cormorant+Garamond:wght@500;600;700&display=swap');
  /* Kalpurush — Bangla unicode font (Omicron Lab CDN, jsDelivr mirror) */
  @font-face {
    font-family: 'Kalpurush';
    src: url('https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/Kalpurush/kalpurush.woff2') format('woff2'),
         url('https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/Kalpurush/kalpurush.woff') format('woff'),
         url('https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/Kalpurush/kalpurush.ttf') format('truetype');
    font-weight: 400 700;
    font-style: normal;
    font-display: swap;
  }

  *,*::before,*::after { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  :root {
    --ink: #0b0b0b;
    --ink-soft: #2a2a2a;
    --muted: #555;
    --accent: #1f4d3a;        /* deep emerald — institutional */
    --accent-soft: #e8efe9;
    --line: #1a1a1a;
    --hairline: #cfcfcf;
  }
  html, body {
    background:#fff;
    color: var(--ink);
    font-family: 'Kalpurush','Tinos','Times New Roman','Cormorant Garamond', serif;
    font-size: 12.5pt;
    line-height: 1.65;
    font-feature-settings: "liga", "kern";
  }
  body { padding: 14mm 14mm; }

  .sheet {
    max-width: 190mm;
    margin: 0 auto;
    background: #fff;
    padding: 12mm 16mm 14mm;
    position: relative;
    min-height: 260mm;
    border: 0.6pt solid var(--hairline);
    box-shadow: 0 0 0 3pt #fff, 0 0 0 3.4pt var(--accent);
  }
  /* faint diagonal watermark of institute name */
  .sheet::before {
    content: "${instName.replace(/"/g, '\\"')}";
    position: absolute;
    inset: 0;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Kalpurush','Tinos', serif;
    font-size: 60pt;
    font-weight: 700;
    color: var(--accent);
    opacity: 0.04;
    transform: rotate(-28deg);
    pointer-events: none;
    letter-spacing: 4pt;
    white-space: nowrap;
    overflow: hidden;
  }

  /* === Letterhead === */
  .letterhead {
    text-align: center;
    padding: 6pt 0 12pt 100px;
    margin-bottom: 6pt;
    position: relative;
    min-height: 96px;
    border-bottom: 1.5pt solid var(--accent);
  }
  .letterhead::after {
    content: "";
    display: block;
    height: 1.2pt;
    background: var(--accent);
    margin-top: 2pt;
    opacity: 0.35;
  }
  .logo-wrap {
    position: absolute; left: 0; top: 4pt;
    width: 88px; height: 88px;
    border-radius: 50%;
    border: 1.25pt solid var(--accent);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; background: #fff;
    box-shadow: 0 0 0 2pt #fff, 0 0 0 2.4pt var(--accent-soft);
  }
  .logo-img { width: 100%; height: 100%; object-fit: contain; padding: 3px; }
  .logo-fallback { font-size: 38px; font-weight: 700; color: var(--accent); font-family: 'Kalpurush','Tinos',serif; }

  .inst-name {
    font-size: 24pt;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: .3pt;
    color: var(--accent);
    margin: 0 0 3pt;
  }
  .inst-tagline {
    font-size: 9.5pt;
    letter-spacing: normal;
    color: var(--muted);
    margin: 1pt 0 4pt;
  }
  /* Wide tracking + caps only for Latin text — it breaks Bangla conjuncts. */
  .lang-en .inst-tagline { letter-spacing: 5pt; text-transform: uppercase; }
  .inst-address { font-size: 10.5pt; color: var(--ink-soft); line-height: 1.4; }
  .inst-contact { font-size: 10pt; color: var(--muted); margin-top: 2pt; }
  .inst-contact .sep { margin: 0 6pt; color: var(--accent); }

  /* === Title === */
  .doc-title { text-align: center; margin: 14pt 0 10pt; position: relative; }
  .doc-title h2 {
    display: inline-block;
    font-size: 14.5pt;
    font-weight: 700;
    letter-spacing: normal;
    color: var(--accent);
    padding: 5pt 26pt;
    border-top: 0.8pt solid var(--accent);
    border-bottom: 0.8pt solid var(--accent);
    background: linear-gradient(180deg, transparent 0%, var(--accent-soft) 100%);
  }
  .lang-en .doc-title h2 { letter-spacing: 2.5pt; text-transform: uppercase; }

  /* === Memo row === */
  .memo-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10.5pt;
    margin: 10pt 0 16pt;
    padding: 6pt 10pt;
    background: var(--accent-soft);
    border-left: 3pt solid var(--accent);
    border-radius: 2pt;
  }
  .memo-row strong { font-weight: 700; color: var(--accent); margin-right: 4pt; }

  /* === Body === */
  .body-content p {
    margin: 7pt 0;
    text-align: justify;
    text-justify: inter-word;
    text-indent: 0;
  }
  .body-content p strong { color: var(--accent); }

  .body-content table.info {
    width: 100%;
    border-collapse: collapse;
    margin: 12pt 0;
    font-size: 11pt;
    box-shadow: 0 0 0 0.4pt var(--hairline);
  }
  .body-content table.info th,
  .body-content table.info td {
    border: 0.5pt solid var(--hairline);
    padding: 7pt 10pt;
    text-align: left;
    vertical-align: middle;
  }
  .body-content table.info th {
    background: var(--accent);
    color: #fff;
    width: 38%;
    font-weight: 600;
    letter-spacing: .2pt;
  }
  .body-content table.info tr:nth-child(even) td { background: #fafafa; }

  /* === Closing & signature === */
  .closing { margin-top: 20pt; }
  .closing p { margin: 4pt 0; font-style: italic; color: var(--ink-soft); }

  .signature-block {
    margin-top: 26mm;
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
  }
  .signature-block .sig {
    text-align: center;
    min-width: 76mm;
    position: relative;
  }
  .signature-block .sig::before {
    content: "";
    display: block;
    width: 90%;
    margin: 0 auto 4pt;
    border-top: 1pt solid var(--ink);
  }
  .signature-block .sig-name {
    font-weight: 700;
    font-size: 12pt;
    color: var(--accent);
    letter-spacing: .3pt;
  }
  .signature-block .role {
    font-size: 10pt;
    font-style: italic;
    color: var(--muted);
    margin-top: 1pt;
  }
  .signature-block .role.inst { color: var(--ink-soft); font-style: normal; font-weight: 600; }

  /* Decorative ornament */
  .ornament {
    text-align: center;
    margin: 8pt 0;
    color: var(--accent);
    letter-spacing: 12pt;
    font-size: 11pt;
    opacity: 0.6;
  }

  /* === Footer === */
  .footer {
    position: absolute;
    left: 16mm; right: 16mm; bottom: 8mm;
    padding-top: 6pt;
    border-top: 0.4pt solid var(--accent);
    text-align: center;
    font-size: 8.5pt;
    color: var(--muted);
  }
  .footer .brand { color: var(--accent); font-weight: 600; letter-spacing: .5pt; }
  .footer .ref { margin-top: 2pt; font-size: 8pt; }

  /* On-screen preview (incl. mobile print-preview frame): show the full A4
     page laid out at its natural width. The viewport meta (width=840) makes
     mobile browsers fit the whole page into the screen instead of squeezing
     the content into a narrow, oversized column. */
  @media screen {
    body { background: #e5e7eb; padding: 16px 0; }
    .sheet { margin: 0 auto; width: 190mm; max-width: 190mm; }
  }

  @media print {
    body { padding: 0; background: #fff; }
    .sheet { border: none; box-shadow: 0 0 0 2pt var(--accent); max-width: 100%; min-height: auto; }
    @page { size: A4 portrait; margin: 12mm; }
  }
</style></head><body class="${bn ? 'lang-bn' : 'lang-en'}">
<div class="sheet">
  <div class="letterhead">
    <div class="logo-wrap">${logoBlock}</div>
    <div class="inst-name">${instName}</div>
    <div class="inst-tagline">${bn ? 'অফিসিয়াল পত্র' : 'Official Correspondence'}</div>
    ${instAddress ? `<div class="inst-address">${instAddress}</div>` : ''}
    <div class="inst-contact">
      ${instPhone ? `<span>${bn ? 'ফোন' : 'Phone'}: ${bn ? toBn(instPhone) : instPhone}</span>` : ''}
      ${instPhone && instEmail ? `<span class="sep">◆</span>` : ''}
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

  <div class="ornament">✦ ✦ ✦</div>

  <div class="signature-block">
    <div class="sig">
      <div class="sig-name">${principalName || '&nbsp;'}</div>
      <div class="role">${issued_by ? issued_by : (bn ? 'প্রিন্সিপাল' : 'Principal')}</div>
      <div class="role inst">${instName}</div>
    </div>
  </div>

  <div class="footer">
    <div class="brand">${instName}</div>
    <div class="ref">${bn ? 'স্মারক:' : 'Ref:'} ${memoNo} &nbsp;•&nbsp; ${bn ? 'মুদ্রণ' : 'Printed'}: ${issueDate}</div>
  </div>
</div>
<script>
  (function () {
    var printed = false;
    function doPrint() {
      if (printed) return;
      printed = true;
      try { window.focus(); } catch (e) {}
      try { window.print(); } catch (e) {}
    }
    function waitImages() {
      var imgs = Array.prototype.slice.call(document.images || []);
      var pending = imgs.filter(function (i) { return !i.complete; });
      if (!pending.length) return Promise.resolve();
      return Promise.all(pending.map(function (i) {
        return new Promise(function (res) {
          i.addEventListener('load', res);
          i.addEventListener('error', res);
          setTimeout(res, 3000);
        });
      }));
    }
    function start() {
      var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
      Promise.all([fontsReady, waitImages()]).then(function () {
        setTimeout(doPrint, 250);
      }).catch(function () {
        setTimeout(doPrint, 700);
      });
      // Hard fallback so it always prints even if a resource hangs.
      setTimeout(doPrint, 4000);
    }
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start);
  })();
</script>
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
