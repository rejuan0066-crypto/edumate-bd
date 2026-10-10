/**
 * Bilingual PDF Report Generator
 * Opens HTML reports in a new window with embedded SutonnyOMJ font for Bengali.
 * User triggers browser "Save as PDF" via print dialog.
 */
import { toast } from "sonner";
import { toBnDigits } from "@/lib/digits";

export interface ReportSection {
  title_bn: string;
  title_en: string;
  headers: { bn: string; en: string }[];
  rows: (string | number)[][];
  /** Optional totals/summary row appended at the bottom */
  totals?: { bn: string; en: string; value: string | number }[];
  /** Optional page break after this section */
  pageBreakAfter?: boolean;
}

export interface ReportMeta {
  institution_name: string;
  institution_name_en: string;
  address: string;
  phone: string;
  email: string;
  logo_url?: string;
  report_title_bn: string;
  report_title_en: string;
  period_label_bn?: string;
  period_label_en?: string;
  principal_name?: string;
  accountant_name?: string;
  bengali_digits?: boolean;
}

export interface ReportSummaryStat {
  label_bn: string;
  label_en: string;
  value: string | number;
  /** semantic color: positive | negative | neutral | accent */
  tone?: 'positive' | 'negative' | 'neutral' | 'accent';
}

const escapeHtml = (s: any): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatCell = (v: string | number, bengaliDigits: boolean = false): string => {
  if (typeof v === 'number') {
    const formatted = v.toLocaleString('en-US');
    return bengaliDigits ? toBnDigits(formatted) : formatted;
  }
  return bengaliDigits ? toBnDigits(escapeHtml(v)) : escapeHtml(v);
};

const toneColor = (t?: string) => {
  switch (t) {
    case 'positive': return '#059669';
    case 'negative': return '#dc2626';
    case 'accent': return '#7c3aed';
    default: return '#0f172a';
  }
};

export const generateBilingualReport = (
  meta: ReportMeta,
  sections: ReportSection[],
  summary: ReportSummaryStat[] = [],
) => {
  const win = window.open('', '_blank', 'width=1200,height=900');
  if (!win) {
    toast.error('Popup blocked. Please allow popups to download the report.');
    return;
  }

  const isBnDigits = !!meta.bengali_digits;
  const date = new Date();
  const dateStr = date.toLocaleDateString('en-GB');
  const dateStrBn = toBnDigits(date.toLocaleDateString('en-GB'));

  const logoHtml = meta.logo_url
    ? `<img src="${meta.logo_url}" alt="logo" style="height:72px;width:72px;object-fit:contain;border-radius:12px;border:1px solid #e2e8f0;" />`
    : '';

  const summaryHtml = summary.length
    ? `<section class="summary-grid">
        ${summary.map(s => `
          <div class="summary-card">
            <div class="summary-label">
              <span class="bn">${escapeHtml(s.label_bn)}</span>
              <span class="en">${escapeHtml(s.label_en)}</span>
            </div>
            <div class="summary-value" style="color:${toneColor(s.tone)};">
              ${typeof s.value === 'number' ? (isBnDigits ? toBnDigits(s.value.toLocaleString('en-US')) : s.value.toLocaleString('en-US')) : (isBnDigits ? toBnDigits(escapeHtml(s.value)) : escapeHtml(s.value))}
            </div>
          </div>
        `).join('')}
      </section>`
    : '';

  const sectionsHtml = sections.map((sec) => `
    <section class="report-section"${sec.pageBreakAfter ? ' style="page-break-after: always; break-after: page;"' : ''}>
      <h2 class="section-title">
        <span class="bn">${escapeHtml(sec.title_bn)}</span>
        <span class="sep">|</span>
        <span class="en">${escapeHtml(sec.title_en)}</span>
      </h2>
      <table class="data-table">
        <thead>
          <tr>
            ${sec.headers.map(h => `
              <th>
                <div class="bn">${escapeHtml(h.bn)}</div>
                <div class="en">${escapeHtml(h.en)}</div>
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${sec.rows.length > 0 ? sec.rows.map((row, i) => `
            <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
              ${row.map(cell => `<td>${formatCell(cell, isBnDigits)}</td>`).join('')}
            </tr>
          `).join('') : `
            <tr><td colspan="${sec.headers.length}" class="empty">No data available / কোনো তথ্য পাওয়া যায়নি</td></tr>
          `}
        </tbody>
        ${sec.totals && sec.totals.length > 0 ? `
          <tfoot>
            ${sec.totals.map(t => `
              <tr class="total-row">
                <td colspan="${sec.headers.length - 1}" class="total-label">
                  <strong>${escapeHtml(t.bn)} / ${escapeHtml(t.en)}</strong>
                </td>
                <td class="total-value">
                  <strong>${typeof t.value === 'number' ? (isBnDigits ? toBnDigits(t.value.toLocaleString('en-US')) : t.value.toLocaleString('en-US')) : (isBnDigits ? toBnDigits(escapeHtml(t.value)) : escapeHtml(t.value))}</strong>
                </td>
              </tr>
            `).join('')}
          </tfoot>
        ` : ''}
      </table>
    </section>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(meta.report_title_en)} — ${escapeHtml(meta.institution_name_en)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @font-face { font-family: 'Kalpurush'; src: url('https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/kalpurush/Kalpurush-v0.258.ttf') format('truetype'); font-display: block; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page {
      size: A4;
      margin: 14mm 10mm 14mm 10mm;
    }
    body {
      font-family: 'Kalpurush', 'Noto Sans Bengali', 'Inter', system-ui, sans-serif;
      font-size: 11px;
      color: #1e293b;
      background: #fff;
      line-height: 1.45;
      padding: 16px 20px;
    }
    .report-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding-bottom: 14px;
      border-bottom: 3px double #0f172a;
      margin-bottom: 16px;
    }
    .header-text { flex: 1; }
    .institution-bn {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.3px;
    }
    .institution-en {
      font-size: 14px;
      font-weight: 600;
      color: #475569;
      margin-top: 2px;
    }
    .institution-meta {
      font-size: 10px;
      color: #64748b;
      margin-top: 6px;
      line-height: 1.6;
    }
    .report-title-bar {
      background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
      color: #fff;
      padding: 12px 18px;
      border-radius: 10px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .report-title-text {
      font-size: 16px;
      font-weight: 700;
    }
    .report-title-text .en {
      font-size: 12px;
      opacity: 0.9;
      display: block;
      margin-top: 2px;
      font-weight: 500;
    }
    .report-meta {
      font-size: 10px;
      text-align: right;
      opacity: 0.95;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 8px;
      margin-bottom: 18px;
    }
    .summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      text-align: center;
    }
    .summary-label {
      font-size: 10px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .summary-label .en {
      display: block;
      font-size: 9px;
      opacity: 0.8;
    }
    .summary-value {
      font-size: 18px;
      font-weight: 700;
    }
    .report-section {
      margin-bottom: 22px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 2px solid #14b8a6;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title .sep {
      color: #cbd5e1;
      font-weight: 300;
    }
    .section-title .en {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    .data-table th {
      background: #0f766e;
      color: #fff;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
      border: 1px solid #0d6862;
    }
    .data-table th .bn { font-size: 11px; }
    .data-table th .en { font-size: 9px; opacity: 0.85; font-weight: 500; }
    .data-table td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .data-table tr.odd td { background: #f8fafc; }
    .data-table tr.even td { background: #fff; }
    .data-table td.empty {
      text-align: center;
      color: #94a3b8;
      padding: 20px;
      font-style: italic;
    }
    .total-row td {
      background: #fef3c7 !important;
      font-size: 11.5px;
    }
    .total-label { text-align: right; }
    .total-value { text-align: right; color: #b45309; }
    .footer {
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .signature {
      text-align: center;
      width: 200px;
    }
    .signature-line {
      border-top: 1px solid #475569;
      padding-top: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #334155;
    }
    .signature-line .en {
      display: block;
      font-size: 9px;
      color: #64748b;
      font-weight: 400;
    }
    .footer-meta {
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
      flex: 1;
    }
    .print-controls {
      position: fixed;
      top: 16px;
      right: 16px;
      display: flex;
      gap: 8px;
      z-index: 100;
    }
    .print-btn {
      background: #0f766e;
      color: #fff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);
      font-family: inherit;
    }
    .print-btn:hover { background: #0d6862; }
    .close-btn {
      background: #e2e8f0;
      color: #475569;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    @media print {
      .print-controls { display: none !important; }
      body { padding: 0; }
      .report-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="print-controls">
    <button class="print-btn" onclick="window.print()">⬇ Save as PDF / PDF সংরক্ষণ</button>
    <button class="close-btn" onclick="window.close()">✕ Close</button>
  </div>

  <header class="report-header">
    ${logoHtml}
    <div class="header-text">
      <div class="institution-bn">${escapeHtml(meta.institution_name)}</div>
      <div class="institution-en">${escapeHtml(meta.institution_name_en)}</div>
      <div class="institution-meta">
        ${escapeHtml(meta.address)}<br />
        Phone / ফোন: ${escapeHtml(meta.phone)} &nbsp;•&nbsp; Email / ইমেইল: ${escapeHtml(meta.email)}
      </div>
    </div>
  </header>

  <div class="report-title-bar">
    <div class="report-title-text">
      ${escapeHtml(meta.report_title_bn)}
      <span class="en">${escapeHtml(meta.report_title_en)}</span>
    </div>
    <div class="report-meta">
      ${meta.period_label_bn ? `<div>${escapeHtml(meta.period_label_bn)} / ${escapeHtml(meta.period_label_en || '')}</div>` : ''}
      <div>তারিখ / Date: ${dateStrBn} (${dateStr})</div>
    </div>
  </div>

  ${summaryHtml}

  ${sectionsHtml}

  <footer class="footer">
    <div class="signature">
      <div class="signature-line">
        ${meta.accountant_name ? `<div style="font-weight:700; color:#0f172a; margin-bottom:2px;">${escapeHtml(meta.accountant_name)}</div>` : ''}
        ক্যাশিয়ার / অ্যাকাউন্ট্যান্ট
        <span class="en">Cashier / Accountant</span>
      </div>
    </div>
    <div class="footer-meta">
      ${escapeHtml(meta.institution_name_en)} • Generated by School ERP<br />
      ${dateStr} ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
    </div>
    <div class="signature">
      <div class="signature-line">
        ${meta.principal_name ? `<div style="font-weight:700; color:#0f172a; margin-bottom:2px;">${escapeHtml(meta.principal_name)}</div>` : ''}
        মুহতামিম / অধ্যক্ষ
        <span class="en">Principal</span>
      </div>
    </div>
  </footer>

  <script>
    // Auto-trigger print dialog after fonts load
    document.fonts.ready.then(() => {
      setTimeout(() => window.print(), 600);
    });
  </script>
</body>
</html>
  `;

  win.document.open();
  win.document.write(html);
  win.document.close();
};
