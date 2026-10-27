export interface InstitutionInfo {
  name?: string;
  name_en?: string;
  address?: string;
  logo_url?: string;
}

export function escapeHtml(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(url: any): string {
  if (!url || typeof url !== 'string') return '';
  const clean = url.trim();
  if (/^(https?:\/\/|\/|data:image\/)/i.test(clean)) {
    return escapeHtml(clean);
  }
  return '';
}

export function buildStudentApplicationHTML(student: any, institution?: InstitutionInfo): string {
  const instName = escapeHtml(institution?.name || '');
  const instNameEn = escapeHtml(institution?.name_en || '');
  const instAddr = escapeHtml(institution?.address || '');
  const instLogo = sanitizeUrl(institution?.logo_url);

  const rawAppNo = student?.admission_data?.application_no || student?.student_id || student?.id?.slice(0, 8) || '';
  const appNo = escapeHtml(rawAppNo);
  const className = escapeHtml(student?.classes?.name_bn || student?.classes?.name || student?.admission_class || '');
  const divName = escapeHtml(student?.classes?.divisions?.name_bn || student?.classes?.divisions?.name || student?.admission_division || '');
  const applyDate = escapeHtml(student?.admission_date || (student?.created_at ? new Date(student.created_at).toLocaleDateString('bn-BD') : ''));

  const applicantSignature = sanitizeUrl(student?.admission_data?.signature_url || student?.signature_url);
  const photoUrl = sanitizeUrl(student?.photo_url);

  const statusLabel = student?.approval_status === 'approved'
    ? 'অনুমোদিত (Approved)'
    : student?.approval_status === 'rejected'
    ? 'বাতিল (Rejected)'
    : 'অনুমোদনের অপেক্ষায় (Pending Review)';

  const statusColor = student?.approval_status === 'approved'
    ? '#059669'
    : student?.approval_status === 'rejected'
    ? '#dc2626'
    : '#d97706';

  const presentAddr = escapeHtml([student?.present_village, student?.present_post, student?.present_thana, student?.present_district].filter(Boolean).join(', ') || student?.address || '—');
  const permAddr = escapeHtml([student?.permanent_village, student?.permanent_post, student?.permanent_thana, student?.permanent_district].filter(Boolean).join(', ') || student?.address || '—');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ভর্তি আবেদন পত্র - ${appNo}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans Bengali', sans-serif; padding: 12mm 15mm; font-size: 11px; color: #1f2937; line-height: 1.4; background: #fff; }
    .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; position: relative; }
    .header img { height: 55px; margin-bottom: 4px; object-fit: contain; }
    .header h1 { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
    .header p { font-size: 10.5px; color: #4b5563; }
    .title-bar { display: flex; justify-content: space-between; align-items: center; margin: 10px 0; padding: 6px 12px; background: #f1f5f9; border-radius: 6px; border: 1px solid #cbd5e1; }
    .title-bar h2 { font-size: 13px; font-weight: 700; color: #0f172a; }
    .app-badge { font-family: monospace; font-size: 12.5px; font-weight: 700; color: #1e40af; background: #dbeafe; padding: 3px 8px; border-radius: 4px; border: 1px solid #bfdbfe; }
    .photo-box { width: 95px; height: 115px; border: 1.5px solid #94a3b8; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f8fafc; font-size: 10px; color: #64748b; }
    .photo-box img { width: 100%; height: 100%; object-fit: cover; }
    .section { margin-top: 10px; margin-bottom: 10px; }
    .section-title { font-size: 11.5px; font-weight: 700; padding: 3px 8px; background: #e2e8f0; border-left: 3px solid #0f172a; color: #0f172a; margin-bottom: 6px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
    .field { display: flex; padding: 2.5px 0; border-bottom: 1px dotted #e2e8f0; }
    .label { font-weight: 600; min-width: 115px; color: #475569; font-size: 10.5px; }
    .value { flex: 1; font-weight: 500; color: #0f172a; font-size: 10.5px; }
    .notice { margin-top: 14px; padding: 8px 12px; background: #fefce8; border: 1px solid #fef08a; border-radius: 4px; font-size: 9.5px; color: #713f12; }
    .signatures { margin-top: 30px; display: flex; justify-content: space-between; padding: 0 10px; }
    .sign-box { text-align: center; border-top: 1px solid #475569; padding-top: 4px; width: 155px; font-size: 10px; font-weight: 600; color: #334155; }
    .sign-img { max-height: 38px; max-width: 120px; object-fit: contain; margin: 0 auto 3px auto; display: block; }
    @media print { body { padding: 10mm; } @page { margin: 8mm; } }
  </style>
</head>
<body>
  <div class="header">
    ${instLogo ? `<img src="${instLogo}" alt="Logo" crossorigin="anonymous">` : ''}
    <h1>${instName}</h1>
    ${instNameEn ? `<p>${instNameEn}</p>` : ''}
    ${instAddr ? `<p>${instAddr}</p>` : ''}
  </div>

  <div class="title-bar">
    <h2>ভর্তি আবেদন পত্র (Student Admission Form)</h2>
    <div>
      আবেদন নম্বর: <span class="app-badge">${appNo}</span>
    </div>
  </div>

  <div style="display: flex; gap: 16px; margin-bottom: 8px;">
    <div style="flex: 1;">
      <div class="section-title">১. মৌলিক তথ্য ও স্ট্যাটাস</div>
      <div class="grid-2">
        <div class="field"><span class="label">শিক্ষার্থীর নাম (বাংলা):</span><span class="value">${escapeHtml(student?.name_bn || '—')}</span></div>
        <div class="field"><span class="label">নাম (ইংরেজি):</span><span class="value">${escapeHtml(student?.name_en || '—')}</span></div>
        <div class="field"><span class="label">ভর্তি শ্রেণি:</span><span class="value">${className}</span></div>
        <div class="field"><span class="label">বিভাগ:</span><span class="value">${divName}</span></div>
        <div class="field"><span class="label">ভর্তি শিক্ষাবর্ষ:</span><span class="value">${escapeHtml(student?.admission_session || '—')}</span></div>
        <div class="field"><span class="label">আবেদনের তারিখ:</span><span class="value">${applyDate}</span></div>
        <div class="field"><span class="label">আবেদনের স্ট্যাটাস:</span><span class="value" style="font-weight: 700; color: ${statusColor};">${escapeHtml(statusLabel)}</span></div>
        ${student?.roll_number ? `<div class="field"><span class="label">বরাদ্দকৃত রোল:</span><span class="value" style="font-weight: 700;">${escapeHtml(student.roll_number)}</span></div>` : ''}
      </div>
    </div>
    <div class="photo-box">
      ${photoUrl ? `<img src="${photoUrl}" alt="Photo" crossorigin="anonymous">` : 'ছবি'}
    </div>
  </div>

  <div class="section">
    <div class="section-title">২. ব্যক্তিগত ও পারিবারিক তথ্য</div>
    <div class="grid-2">
      <div class="field"><span class="label">জন্ম তারিখ:</span><span class="value">${escapeHtml(student?.date_of_birth || '—')}</span></div>
      <div class="field"><span class="label">জন্ম নিবন্ধন / NID:</span><span class="value">${escapeHtml(student?.birth_certificate_no || student?.birth_reg_no || student?.nid || '—')}</span></div>
      <div class="field"><span class="label">লিঙ্গ:</span><span class="value">${escapeHtml(student?.gender === 'female' ? 'মহিলা' : 'পুরুষ')}</span></div>
      <div class="field"><span class="label">ধর্ম:</span><span class="value">${escapeHtml(student?.religion || 'ইসলাম')}</span></div>
      <div class="field"><span class="label">পিতার নাম:</span><span class="value">${escapeHtml(student?.father_name || '—')}</span></div>
      <div class="field"><span class="label">পিতার মোবাইল:</span><span class="value">${escapeHtml(student?.father_phone || '—')}</span></div>
      <div class="field"><span class="label">মাতার নাম:</span><span class="value">${escapeHtml(student?.mother_name || '—')}</span></div>
      <div class="field"><span class="label">মাতার মোবাইল:</span><span class="value">${escapeHtml(student?.mother_phone || '—')}</span></div>
      <div class="field"><span class="label">অভিভাবকের নাম:</span><span class="value">${escapeHtml(student?.guardian_name || student?.father_name || '—')} (${escapeHtml(student?.guardian_relation || 'অভিভাবক')})</span></div>
      <div class="field"><span class="label">অভিভাবকের ফোন:</span><span class="value">${escapeHtml(student?.guardian_phone || student?.father_phone || '—')}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">৩. ঠিকানার বিবরণ</div>
    <div class="grid-2">
      <div class="field"><span class="label">বর্তমান ঠিকানা:</span><span class="value">${presentAddr}</span></div>
      <div class="field"><span class="label">স্থায়ী ঠিকানা:</span><span class="value">${permAddr}</span></div>
    </div>
  </div>

  <div class="notice">
    <strong>নির্দেশনা:</strong> এই আবেদনপত্রটি অনলাইনে সংরক্ষণ করা হয়েছে। আবেদনের অগ্রগতি জানতে এবং চূড়ান্ত ভর্তি নিশ্চিতকরণের জন্য আপনার আবেদন নম্বর (${appNo}) ব্যবহার করে ওয়েবসাইটে স্ট্যাটাস যাচাই করতে পারবেন।
  </div>

  <div class="signatures">
    <div class="sign-box">
      ${applicantSignature ? `<img src="${applicantSignature}" alt="Signature" class="sign-img" crossorigin="anonymous">` : '<div style="height: 38px;"></div>'}
      <div>শিক্ষার্থী / অভিভাবকের স্বাক্ষর</div>
    </div>
    <div class="sign-box">
      <div style="height: 38px;"></div>
      <div>যাচাইকারী কর্মকর্তার স্বাক্ষর</div>
    </div>
    <div class="sign-box">
      <div style="height: 38px;"></div>
      <div>মুহতামিম / অধ্যক্ষের স্বাক্ষর</div>
    </div>
  </div>
</body>
</html>`;
}

export function buildStaffApplicationHTML(staff: any, institution?: InstitutionInfo): string {
  const instName = escapeHtml(institution?.name || '');
  const instNameEn = escapeHtml(institution?.name_en || '');
  const instAddr = escapeHtml(institution?.address || '');
  const instLogo = sanitizeUrl(institution?.logo_url);

  const rawAppNo = staff?.staff_data?.application_no || staff?.staff_id || staff?.id?.slice(0, 8) || '';
  const appNo = escapeHtml(rawAppNo);
  const applyDate = escapeHtml(staff?.joining_date || (staff?.created_at ? new Date(staff.created_at).toLocaleDateString('bn-BD') : ''));

  const applicantSignature = sanitizeUrl(staff?.staff_data?.signature_url || staff?.signature_url);
  const photoUrl = sanitizeUrl(staff?.photo_url);

  const maritalRaw = staff?.staff_data?.marital_status || staff?.marital_status;
  const maritalLabel = escapeHtml(
    maritalRaw === 'married' ? 'বিবাহিত'
    : maritalRaw === 'unmarried' || maritalRaw === 'single' ? 'অবিবাহিত'
    : maritalRaw === 'widowed' || maritalRaw === 'widow' ? 'বিধবা / বিপত্নীক'
    : maritalRaw === 'divorced' ? 'তালাকপ্রাপ্ত'
    : (maritalRaw || '—')
  );

  const statusLabel = staff?.status === 'active'
    ? 'অনুমোদিত ও সক্রিয় (Approved)'
    : staff?.status === 'rejected'
    ? 'বাতিল (Rejected)'
    : 'অনুমোদনের অপেক্ষায় (Pending Review)';

  const statusColor = staff?.status === 'active'
    ? '#059669'
    : staff?.status === 'rejected'
    ? '#dc2626'
    : '#d97706';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>নিয়োগ আবেদন পত্র - ${appNo}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans Bengali', sans-serif; padding: 12mm 15mm; font-size: 11px; color: #1f2937; line-height: 1.4; background: #fff; }
    .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; position: relative; }
    .header img { height: 55px; margin-bottom: 4px; object-fit: contain; }
    .header h1 { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
    .header p { font-size: 10.5px; color: #4b5563; }
    .title-bar { display: flex; justify-content: space-between; align-items: center; margin: 10px 0; padding: 6px 12px; background: #f1f5f9; border-radius: 6px; border: 1px solid #cbd5e1; }
    .title-bar h2 { font-size: 13px; font-weight: 700; color: #0f172a; }
    .app-badge { font-family: monospace; font-size: 12.5px; font-weight: 700; color: #6b21a8; background: #f3e8ff; padding: 3px 8px; border-radius: 4px; border: 1px solid #e9d5ff; }
    .photo-box { width: 95px; height: 115px; border: 1.5px solid #94a3b8; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f8fafc; font-size: 10px; color: #64748b; }
    .photo-box img { width: 100%; height: 100%; object-fit: cover; }
    .section { margin-top: 10px; margin-bottom: 10px; }
    .section-title { font-size: 11.5px; font-weight: 700; padding: 3px 8px; background: #e2e8f0; border-left: 3px solid #0f172a; color: #0f172a; margin-bottom: 6px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
    .field { display: flex; padding: 2.5px 0; border-bottom: 1px dotted #e2e8f0; }
    .label { font-weight: 600; min-width: 120px; color: #475569; font-size: 10.5px; }
    .value { flex: 1; font-weight: 500; color: #0f172a; font-size: 10.5px; }
    .notice { margin-top: 14px; padding: 8px 12px; background: #fefce8; border: 1px solid #fef08a; border-radius: 4px; font-size: 9.5px; color: #713f12; }
    .signatures { margin-top: 35px; display: flex; justify-content: space-between; padding: 0 10px; }
    .sign-box { text-align: center; border-top: 1px solid #475569; padding-top: 4px; width: 160px; font-size: 10px; font-weight: 600; color: #334155; }
    .sign-img { max-height: 38px; max-width: 120px; object-fit: contain; margin: 0 auto 3px auto; display: block; }
    @media print { body { padding: 10mm; } @page { margin: 8mm; } }
  </style>
</head>
<body>
  <div class="header">
    ${instLogo ? `<img src="${instLogo}" alt="Logo" crossorigin="anonymous">` : ''}
    <h1>${instName}</h1>
    ${instNameEn ? `<p>${instNameEn}</p>` : ''}
    ${instAddr ? `<p>${instAddr}</p>` : ''}
  </div>

  <div class="title-bar">
    <h2>শিক্ষক / স্টাফ নিয়োগ আবেদন পত্র (Staff Employment Application)</h2>
    <div>
      আবেদন নম্বর: <span class="app-badge">${appNo}</span>
    </div>
  </div>

  <div style="display: flex; gap: 16px; margin-bottom: 8px;">
    <div style="flex: 1;">
      <div class="section-title">১. মৌলিক তথ্য ও পদবী</div>
      <div class="grid-2">
        <div class="field"><span class="label">প্রার্থীর নাম (বাংলা):</span><span class="value">${escapeHtml(staff?.name_bn || '—')}</span></div>
        <div class="field"><span class="label">নাম (ইংরেজি):</span><span class="value">${escapeHtml(staff?.name_en || '—')}</span></div>
        <div class="field"><span class="label">আবেদনের পদবী:</span><span class="value">${escapeHtml(staff?.designation || '—')}</span></div>
        <div class="field"><span class="label">বিভাগ / শাখা:</span><span class="value">${escapeHtml(staff?.department || '—')}</span></div>
        <div class="field"><span class="label">চাকরির ধরন:</span><span class="value">${escapeHtml(staff?.employment_type || 'পূর্ণকালীন')}</span></div>
        <div class="field"><span class="label">আবেদনের তারিখ:</span><span class="value">${applyDate}</span></div>
        <div class="field"><span class="label">আবেদনের স্ট্যাটাস:</span><span class="value" style="font-weight: 700; color: ${statusColor};">${escapeHtml(statusLabel)}</span></div>
        <div class="field"><span class="label">আইডি:</span><span class="value" style="font-weight: 700;">${appNo}</span></div>
      </div>
    </div>
    <div class="photo-box">
      ${photoUrl ? `<img src="${photoUrl}" alt="Photo" crossorigin="anonymous">` : 'ছবি'}
    </div>
  </div>

  <div class="section">
    <div class="section-title">২. ব্যক্তিগত ও পারিবারিক তথ্য</div>
    <div class="grid-2">
      <div class="field"><span class="label">মোবাইল নম্বর:</span><span class="value">${escapeHtml(staff?.phone || staff?.mobile || '—')}</span></div>
      <div class="field"><span class="label">ইমেইল:</span><span class="value">${escapeHtml(staff?.email || '—')}</span></div>
      <div class="field"><span class="label">জাতীয় পরিচয়পত্র (NID):</span><span class="value">${escapeHtml(staff?.nid || '—')}</span></div>
      <div class="field"><span class="label">জন্ম তারিখ:</span><span class="value">${escapeHtml(staff?.date_of_birth || '—')}</span></div>
      <div class="field"><span class="label">লিঙ্গ:</span><span class="value">${escapeHtml(staff?.gender === 'female' ? 'মহিলা' : 'পুরুষ')}</span></div>
      <div class="field"><span class="label">ধর্ম:</span><span class="value">${escapeHtml(staff?.religion || 'ইসলাম')}</span></div>
      <div class="field"><span class="label">বৈবাহিক অবস্থা:</span><span class="value">${maritalLabel}</span></div>
      <div class="field"><span class="label">শিক্ষাগত যোগ্যতা:</span><span class="value">${escapeHtml(staff?.education || '—')}</span></div>
      <div class="field"><span class="label">কাজের অভিজ্ঞতা:</span><span class="value">${escapeHtml(staff?.experience || '—')}</span></div>
      <div class="field" style="grid-column: span 2;"><span class="label">পূর্ববর্তী প্রতিষ্ঠান:</span><span class="value">${escapeHtml(staff?.previous_institute || '—')}</span></div>
      <div class="field" style="grid-column: span 2;"><span class="label">ঠিকানা:</span><span class="value">${escapeHtml(staff?.address || '—')}</span></div>
    </div>
  </div>

  <div class="notice">
    <strong>নির্দেশনা:</strong> এই আবেদনপত্রটি প্রতিষ্ঠানের ডিজিটাল আর্কাইভে সংরক্ষিত হয়েছে। মৌখিক পরীক্ষা বা নিয়োগ প্রক্রিয়া সংক্রান্ত তথ্যের জন্য আপনার আবেদন নম্বর (${appNo}) উল্লেখ করুন।
  </div>

  <div class="signatures">
    <div class="sign-box">
      ${applicantSignature ? `<img src="${applicantSignature}" alt="Signature" class="sign-img" crossorigin="anonymous">` : '<div style="height: 38px;"></div>'}
      <div>আবেদনকারীর স্বাক্ষর</div>
    </div>
    <div class="sign-box">
      <div style="height: 38px;"></div>
      <div>যাচাইকারী কর্মকর্তার স্বাক্ষর</div>
    </div>
    <div class="sign-box">
      <div style="height: 38px;"></div>
      <div>অধ্যক্ষ / নিয়োগ কমিটির স্বাক্ষর</div>
    </div>
  </div>
</body>
</html>`;
}

export async function downloadHTMLAsPDF(htmlContent: string, fileName: string): Promise<void> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '0';
  iframe.style.top = '0';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-9999';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Failed to create iframe');
  }

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  // Wait for fonts and all images inside iframe to complete
  try {
    if ((iframeDoc as any).fonts?.ready) {
      await (iframeDoc as any).fonts.ready;
    }
    const images = Array.from(iframeDoc.images);
    if (images.length > 0) {
      await Promise.all(
        images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 3000);
          });
        })
      );
    }
  } catch (e) {
    console.warn('Image/font load wait notice:', e);
  }

  await new Promise(resolve => setTimeout(resolve, 800));

  try {
    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF } = await import('jspdf');

    const body = iframeDoc.body;
    const actualHeight = Math.max(body.scrollHeight, body.offsetHeight, 1123);

    const canvas = await html2canvas(body, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: 794,
      height: actualHeight,
      windowWidth: 794,
      windowHeight: actualHeight,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pageHeight = 297;
    const imgAspect = canvas.height / canvas.width;
    let imgW = pdfWidth;
    let imgH = pdfWidth * imgAspect;
    if (imgH > pageHeight) {
      imgH = pageHeight;
      imgW = pageHeight / imgAspect;
    }
    const offsetX = (pdfWidth - imgW) / 2;
    pdf.addImage(imgData, 'JPEG', offsetX, 0, imgW, imgH);
    pdf.save(fileName);
  } finally {
    document.body.removeChild(iframe);
  }
}

export function printHTML(htmlContent: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 800);
}
