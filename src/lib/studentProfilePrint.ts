// Printable student profile - opens a styled A4 print window with
// institution header, photo, and grouped info sections.
import type { InstitutionInfo } from '@/hooks/useInstitutionInfo';
import { CANONICAL_BANGLA_LABELS as L } from './banglaCanonicalLabels';
import { formatDigits } from './utils';

const esc = (v: any): string => {
  if (v === null || v === undefined || v === '') return '—';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

interface Row { label: string; value: any; }
interface Section { title: string; rows: Row[]; }

const renderSection = (s: Section): string => `
  <section class="sec">
    <h2>${esc(s.title)}</h2>
    <table>
      <tbody>
        ${s.rows.map((r, i) => `
          <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
            <th>${esc(r.label)}</th>
            <td>${esc(r.value)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </section>
`;

export interface PrintStudentProfileOptions {
  student: any;
  bn: boolean;
  institution: Partial<InstitutionInfo>;
  className?: string;
  sessionName?: string;
}

export const printStudentProfile = ({
  student, bn, institution, className, sessionName,
}: PrintStudentProfileOptions) => {
  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) return;

  const t = (en: string, bnT: string) => (bn ? bnT : en);

  const sections: Section[] = [
    {
      title: t('Basic Information', 'মৌলিক তথ্য'),
      rows: [
        { label: t('Name (BN)', 'নাম (বাংলা)'), value: student.name_bn || student.name },
        { label: t('Name (EN)', 'নাম (ইংরেজি)'), value: student.name_en },
        { label: t('Registration No', 'রেজিস্ট্রেশন নং'), value: formatDigits(student.registration_no || student.student_id, bn) },
        { label: t('Roll', 'রোল'), value: formatDigits(student.roll_number, bn) },
        { label: t('Date of Birth', 'জন্ম তারিখ'), value: formatDigits(student.date_of_birth, bn) },
        { label: t('Gender', 'লিঙ্গ'), value: student.gender },
        { label: t('Religion', 'ধর্ম'), value: student.religion },
        { label: t('Blood Group', 'রক্তের গ্রুপ'), value: student.blood_group },
        { label: t('Birth Reg', 'জন্ম নিবন্ধন'), value: formatDigits(student.birth_reg_no, bn) },
        { label: t('Phone', 'ফোন'), value: formatDigits(student.phone, bn) },
        { label: t('Email', 'ইমেইল'), value: student.email },
      ],
    },
    {
      title: t('Academic Information', 'একাডেমিক তথ্য'),
      rows: [
        { label: t('Class', 'শ্রেণী'), value: className },
        { label: t('Session', 'সেশন'), value: formatDigits(sessionName, bn) },
        { label: t('Session Year', 'সেশন বছর'), value: formatDigits(student.session_year, bn) },
        { label: t('Admission Date', 'ভর্তির তারিখ'), value: formatDigits(student.admission_date, bn) },
        { label: t('Previous Class', 'পূর্বের শ্রেণী'), value: student.previous_class },
        { label: t('Previous Institute', 'পূর্বের প্রতিষ্ঠান'), value: student.previous_institute },
        { label: t('Status', 'অবস্থা'), value: student.status || 'active' },
      ],
    },
    {
      title: t('Parents Information', 'অভিভাবক তথ্য'),
      rows: [
        { label: t("Father's Name (BN)", 'পিতার নাম (বাংলা)'), value: student.father_name },
        { label: t("Father's Name (EN)", 'পিতার নাম (ইংরেজি)'), value: student.father_name_en },
        { label: t("Father's Occupation", 'পিতার পেশা'), value: student.father_occupation },
        { label: t("Father's NID", 'পিতার NID'), value: formatDigits(student.father_nid, bn) },
        { label: t("Father's Phone", 'পিতার ফোন'), value: formatDigits(student.father_phone, bn) },
        { label: t("Mother's Name (BN)", 'মাতার নাম (বাংলা)'), value: student.mother_name },
        { label: t("Mother's Name (EN)", 'মাতার নাম (ইংরেজি)'), value: student.mother_name_en },
        { label: t("Mother's Occupation", 'মাতার পেশা'), value: student.mother_occupation },
        { label: t("Mother's NID", 'মাতার NID'), value: formatDigits(student.mother_nid, bn) },
        { label: t("Mother's Phone", 'মাতার ফোন'), value: formatDigits(student.mother_phone, bn) },
        { label: t('Guardian Phone', 'অভিভাবক ফোন'), value: formatDigits(student.guardian_phone, bn) },
      ],
    },
    {
      title: t('Address & Other', 'ঠিকানা ও অন্যান্য'),
      rows: [
        { label: t('Address', 'ঠিকানা'), value: student.address },
        { label: t('Residence', 'আবাসিক'), value: student.residence_type },
        { label: t('Category', 'ক্যাটাগরি'), value: student.student_category },
      ],
    },
  ];

  const photo = student.photo_url || student.photo || '';
  const instName = bn ? (institution.name || institution.name_en) : (institution.name_en || institution.name);
  const instAddr = bn ? (institution.address || institution.address_en) : (institution.address_en || institution.address);

  const html = `<!DOCTYPE html>
<html lang="${bn ? 'bn' : 'en'}">
<head>
<meta charset="utf-8" />
<title>${t('Student Profile', 'ছাত্র প্রোফাইল')} - ${esc(student.name || student.name_en || '')}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  @font-face { font-family: 'Kalpurush'; src: url('https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/kalpurush/Kalpurush-v0.258.ttf') format('truetype'); font-display: block; }
  @page { size: A4; margin: 14mm 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body {
    font-family: ${bn ? "'Kalpurush', 'Hind Siliguri', 'Noto Sans Bengali'," : "'Kalpurush',"} 'Inter', system-ui, sans-serif;
    font-size: 11px; color: #1f2937; background: #fff;
  }
    font-size: 11px; color: #1f2937; background: #fff;
  }
  .page { max-width: 186mm; margin: 0 auto; }
  header.inst {
    display: flex; align-items: center; gap: 14px; padding-bottom: 10px;
    border-bottom: 2px solid #047857;
  }
  header.inst img.logo { width: 64px; height: 64px; object-fit: contain; }
  header.inst .info { flex: 1; text-align: center; }
  header.inst h1 { font-size: 20px; font-weight: 800; color: #064e3b; letter-spacing: 0.2px; }
  header.inst p { font-size: 11px; color: #4b5563; margin-top: 2px; }
  .doc-title {
    text-align: center; margin: 14px 0 16px;
    font-size: 14px; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase; color: #065f46;
  }
  .doc-title span {
    display: inline-block; padding: 4px 18px;
    border: 1.5px solid #065f46; border-radius: 999px;
    background: linear-gradient(90deg, #ecfdf5, #f0fdf4);
  }
  .top {
    display: grid; grid-template-columns: 110px 1fr; gap: 16px; margin-bottom: 14px;
    align-items: start;
  }
  .photo-box {
    width: 110px; height: 130px; border: 1.5px solid #d1d5db;
    background: #f9fafb; display: flex; align-items: center; justify-content: center;
    overflow: hidden; border-radius: 6px;
  }
  .photo-box img { width: 100%; height: 100%; object-fit: cover; }
  .photo-box .placeholder { color: #9ca3af; font-size: 10px; }
  .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 14px; }
  .summary div { font-size: 11px; }
  .summary div b { color: #065f46; font-weight: 600; }
  .sec { margin-top: 10px; page-break-inside: avoid; }
  .sec h2 {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.6px; color: #047857; padding: 5px 8px;
    background: #ecfdf5; border-left: 3px solid #047857; border-radius: 3px;
    margin-bottom: 4px;
  }
  table { width: 100%; border-collapse: collapse; }
  table th, table td { padding: 4px 8px; text-align: left; vertical-align: top; font-size: 10.5px; }
  table th {
    width: 32%; font-weight: 600; color: #374151;
    background: #f9fafb; border: 1px solid #e5e7eb;
  }
  table td { border: 1px solid #e5e7eb; color: #111827; }
  tr.odd td, tr.odd th { background: #fafafa; }
  footer.sigs {
    margin-top: 28px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
    page-break-inside: avoid;
  }
  footer.sigs .sig { text-align: center; }
  footer.sigs .sig .line { border-top: 1px solid #6b7280; margin: 32px 12px 4px; }
  footer.sigs .sig small { font-size: 10px; color: #4b5563; }
  .meta {
    margin-top: 14px; padding-top: 8px; border-top: 1px dashed #d1d5db;
    display: flex; justify-content: space-between; font-size: 9.5px; color: #6b7280;
  }
  @media print {
    .no-print { display: none !important; }
  }
  .toolbar {
    position: fixed; top: 12px; right: 12px; display: flex; gap: 8px; z-index: 999;
  }
  .toolbar button {
    background: #047857; color: #fff; border: 0; padding: 8px 14px;
    border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;
  }
  .toolbar button.ghost { background: #6b7280; }
</style>
</head>
<body>
  <div class="toolbar no-print">
    <button onclick="window.print()">🖨️ ${t('Print', 'প্রিন্ট')}</button>
    <button class="ghost" onclick="window.close()">✕ ${t('Close', 'বন্ধ')}</button>
  </div>
  <div class="page">
    <header class="inst">
      ${institution.logo_url ? `<img class="logo" src="${esc(institution.logo_url)}" alt="logo" />` : ''}
      <div class="info">
        <h1>${esc(instName)}</h1>
        ${instAddr ? `<p>${esc(instAddr)}</p>` : ''}
        ${institution.phone || institution.email ? `<p>${[institution.phone, institution.email].filter(Boolean).map(esc).join(' • ')}</p>` : ''}
      </div>
    </header>

    <div class="doc-title"><span>${t('Student Profile', 'ছাত্র প্রোফাইল')}</span></div>

    <div class="top">
      <div class="photo-box">
        ${photo ? `<img src="${esc(photo)}" alt="photo" onerror="this.style.display='none'" />` : `<span class="placeholder">${t('No Photo', 'ছবি নেই')}</span>`}
      </div>
      <div class="summary">
        <div><b>${t('Name (BN)', 'নাম (বাংলা)')}:</b> ${esc(student.name_bn || student.name || '-')}</div>
        ${student.name_en ? `<div><b>${t('Name (EN)', 'নাম (ইংরেজি)')}:</b> ${esc(student.name_en)}</div>` : ''}
        <div><b>${t('Reg No', 'রেজিস্ট্রেশন')}:</b> ${esc(formatDigits(student.registration_no || student.student_id, bn))}</div>
        <div><b>${t('Class', 'শ্রেণী')}:</b> ${esc(className)}</div>
        <div><b>${t('Roll', 'রোল')}:</b> ${esc(formatDigits(student.roll_number, bn))}</div>
        <div><b>${t('Session', 'সেশন')}:</b> ${esc(formatDigits(sessionName, bn))}</div>
        <div><b>${t('DOB', 'জন্ম তারিখ')}:</b> ${esc(formatDigits(student.date_of_birth, bn))}</div>
        <div><b>${t('Father (BN)', 'পিতা (বাংলা)')}:</b> ${esc(student.father_name || '-')}</div>
        ${student.father_name_en ? `<div><b>${t('Father (EN)', 'পিতা (ইংরেজি)')}:</b> ${esc(student.father_name_en)}</div>` : ''}
        <div><b>${t('Phone', 'ফোন')}:</b> ${esc(formatDigits(student.guardian_phone || student.phone, bn))}</div>
      </div>
    </div>

    ${sections.map(renderSection).join('')}

    <footer class="sigs">
      <div class="sig"><div class="line"></div><small>${t("Guardian's Signature", 'অভিভাবকের স্বাক্ষর')}</small></div>
      <div class="sig"><div class="line"></div><small>${t('Class Teacher', L.classTeacher)}</small></div>
      <div class="sig"><div class="line"></div><small>${esc(institution.principal_name || institution.principal_name_en) || t('Principal', L.headmaster)}</small></div>
    </footer>

    <div class="meta">
      <span>${t('Generated', 'তৈরি')}: ${new Date().toLocaleString(bn ? 'bn-BD' : 'en-GB')}</span>
      <span>${esc(instName)}</span>
    </div>
  </div>
  <script>
    window.addEventListener('load', () => { setTimeout(() => window.print(), 400); });
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
};
