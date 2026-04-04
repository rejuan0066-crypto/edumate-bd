/**
 * Professional রশিদ বই (Receipt Book) Print Layouts
 * Matching the reference image: Green header, rounded fields, watermark, signatures
 * Mode 1: Single student → 2 copies (Office + Student) stacked on one A4
 * Mode 2: Bulk class → 6 receipts per A4 (3 rows × 2 cols)
 */

export interface ReceiptData {
  studentName: string;
  studentId: string;
  rollNumber: string;
  className: string;
  sessionName: string;
  feeType: string;
  amount: string;
  transactionId: string;
  receiptSerial: string;
  gatewayTrxId: string;
  paymentTimestamp: string;
  date: string;
  status: string;
  statusColor: string;
  paymentMethod: string;
  collectorName: string;
  approverName: string;
  institutionName: string;
  institutionNameEn: string;
  institutionAddress: string;
  institutionPhone: string;
  institutionEmail: string;
  institutionOtherInfo: string;
  logoUrl: string;
  bn: boolean;
}

export interface ReceiptStyleConfig {
  primaryColor: string;
  fontSize: number;
  receiptTitle: string;
  showWatermark: boolean;
  showQr: boolean;
  showTrxId: boolean;
  showTimestamp: boolean;
}

const DEFAULT_STYLE: ReceiptStyleConfig = {
  primaryColor: '#1a5c2e',
  fontSize: 100,
  receiptTitle: 'রশিদ বই',
  showWatermark: true,
  showQr: true,
  showTrxId: true,
  showTimestamp: true,
};

function buildReceipt(data: ReceiptData, copyLabel: string, style: ReceiptStyleConfig = DEFAULT_STYLE): string {
  const pc = style.primaryColor || '#1a5c2e';
  const fs = (style.fontSize || 100) / 100;
  const qrData = encodeURIComponent(`TXN:${data.transactionId}|AMT:${data.amount}|STU:${data.studentId}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${qrData}`;

  return `
    <div class="receipt-card">
      <!-- Watermark -->
      ${style.showWatermark !== false ? (data.logoUrl
        ? `<div class="watermark"><img src="${data.logoUrl}" /></div>`
        : `<div class="watermark-text">${data.institutionName}</div>`) : ''}

      <!-- Copy Label -->
      <div class="copy-label">${copyLabel}</div>

      <!-- Header -->
      <div class="receipt-header" style="background:linear-gradient(135deg, ${pc} 0%, ${pc}dd 100%);">
        ${data.logoUrl ? `<img src="${data.logoUrl}" class="header-logo" />` : '<div class="header-logo-placeholder"></div>'}
        <div class="header-center">
          <div class="inst-name-bn" style="font-size:${10 * fs}px">${data.institutionName}</div>
          ${data.institutionNameEn ? `<div class="inst-name-en" style="font-size:${6.5 * fs}px">${data.institutionNameEn}</div>` : ''}
          <div class="inst-detail" style="font-size:${5.5 * fs}px">${data.institutionAddress}</div>
          ${data.institutionPhone ? `<div class="inst-detail" style="font-size:${5.5 * fs}px">যোগাযোগ: ${data.institutionPhone}</div>` : ''}
        </div>
        ${data.logoUrl ? `<img src="${data.logoUrl}" class="header-logo" />` : '<div class="header-logo-placeholder"></div>'}
      </div>

      <!-- Title Row -->
      <div class="title-row">
        <div class="serial-box">
          ${style.showQr !== false ? `<img src="${qrUrl}" class="qr-title-img" alt="QR" />` : ''}
          <span class="serial-label" style="font-size:${6 * fs}px">ক্রমিক নং:</span>
          <span class="serial-capsule" style="font-size:${6 * fs}px;color:${pc}">${data.receiptSerial || ''}</span>
        </div>
        <div class="title-capsule" style="background:${pc};font-size:${8.5 * fs}px">${style.receiptTitle || 'রশিদ বই'}</div>
        <div class="date-box-row">
          <span class="date-label-text" style="font-size:${6 * fs}px">তারিখ:</span>
          <span class="date-capsule" style="font-size:${6 * fs}px">${data.date || ''}</span>
        </div>
      </div>

      <!-- TrxID & Timestamp Row -->
      ${(style.showTrxId !== false && data.gatewayTrxId) || (style.showTimestamp !== false && data.paymentTimestamp) ? `
      <div class="trx-row">
        ${style.showTrxId !== false && data.gatewayTrxId ? `<span class="trx-item" style="font-size:${5.5 * fs}px">TrxID: <strong>${data.gatewayTrxId}</strong></span>` : ''}
        ${style.showTimestamp !== false && data.paymentTimestamp ? `<span class="trx-item" style="font-size:${5.5 * fs}px">সময়: ${data.paymentTimestamp}</span>` : ''}
      </div>` : ''}

      <!-- Form Fields -->
      <div class="form-body">
        <div class="form-row">
          <span class="field-label" style="font-size:${7 * fs}px">নাম:</span>
          <div class="field-input"><span class="field-value" style="font-size:${7 * fs}px">${data.studentName}</span></div>
        </div>
        <div class="form-row">
          <span class="field-label" style="font-size:${7 * fs}px">আইডি / রোল:</span>
          <div class="field-input"><span class="field-value" style="font-size:${7 * fs}px">${data.studentId || data.rollNumber ? [data.studentId, data.rollNumber ? 'রোল: ' + data.rollNumber : ''].filter(Boolean).join(' | ') : ''}</span></div>
        </div>
        <div class="form-row">
          <span class="field-label" style="font-size:${7 * fs}px">ক্লাস / সেশন:</span>
          <div class="field-input"><span class="field-value" style="font-size:${7 * fs}px">${data.className || data.sessionName ? [data.className, data.sessionName].filter(Boolean).join(' | ') : ''}</span></div>
        </div>
        <div class="form-row">
          <span class="field-label" style="font-size:${7 * fs}px">বাবদ:</span>
          <div class="field-input"><span class="field-value" style="font-size:${7 * fs}px">${data.feeType}</span></div>
        </div>
        <div class="form-row-split">
          <div class="form-row half">
            <span class="field-label" style="font-size:${7 * fs}px">টাকা:</span>
            <div class="field-input amt"><span class="field-value amt-val" style="font-size:${7.5 * fs}px">৳ ${data.amount}</span></div>
          </div>
          <div class="form-row half">
            <span class="field-label" style="font-size:${7 * fs}px">স্ট্যাটাস:</span>
            <div class="field-input"><span class="field-value" style="font-size:${7 * fs}px;color:${data.statusColor};font-weight:700">${data.status}</span></div>
          </div>
        </div>
      </div>

      <!-- Signatures -->
      <div class="sig-footer">
        <div class="sig-block">
          <div class="sig-line" style="border-color:${pc}"></div>
          <div class="sig-title" style="font-size:${5.5 * fs}px">আদায়কারী স্বাক্ষর</div>
          <div class="sig-name" style="font-size:${5 * fs}px">${data.collectorName}</div>
        </div>
        ${data.approverName ? `
        <div class="sig-block">
          <div class="sig-line" style="border-color:${pc}"></div>
          <div class="sig-title" style="font-size:${5.5 * fs}px">গ্রহণকারী স্বাক্ষর</div>
          <div class="sig-name" style="font-size:${5 * fs}px">${data.approverName}</div>
        </div>` : `
        <div class="sig-block">
          <div class="sig-line" style="border-color:${pc}"></div>
          <div class="sig-title" style="font-size:${5.5 * fs}px">গ্রহণকারী স্বাক্ষর</div>
        </div>`}
      </div>
    </div>`;
}
function getCSS(style: ReceiptStyleConfig = DEFAULT_STYLE): string {
  const pc = style.primaryColor || '#1a5c2e';
  return `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Sans Bengali', sans-serif; background: #fff; color: #1a1a1a;
    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }

  .page { width: 210mm; min-height: auto; padding: 6mm 10mm; display: flex; flex-direction: column; page-break-after: always; overflow: hidden; position: relative; }
  .page:last-child { page-break-after: auto; }

  /* MODE 1: Single - 2 side-by-side copies */
  .mode-single { flex-direction: row; justify-content: center; align-items: flex-start; gap: 0; }
  .mode-single .receipt-card { width: 50%; height: auto; }
  .mode-single .cut-v { 
    width: 0; border-left: 1.5px dashed #aaa; position: relative; align-self: stretch;
  }
  .mode-single .cut-v::after {
    content: '✂'; position: absolute; top: 4px; left: -7px; font-size: 10px; color: #999; background: #fff; padding: 2px 0;
  }

  /* MODE 2: Bulk - 3×2 grid */
  .mode-bulk { flex-wrap: wrap; flex-direction: row; gap: 0; height: 297mm; }
  .mode-bulk .receipt-row { display: flex; width: 100%; height: calc(33.33% - 2mm); }
  .mode-bulk .receipt-card { width: 50%; }
  .mode-bulk .cut-v { width: 0; border-left: 1.5px dashed #aaa; }
  .mode-bulk .cut-h { border-top: 1.5px dashed #aaa; width: 100%; position: relative; }
  .mode-bulk .cut-h::after { content: '✂'; position: absolute; left: 4px; top: -7px; font-size: 10px; color: #999; background: #fff; padding: 0 3px; }

  .receipt-card {
    position: relative; overflow: hidden;
    border: 1.5px solid ${pc}; border-radius: 3px;
    padding: 0; display: flex; flex-direction: column;
  }

  /* Watermark */
  .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 0; opacity: 0.05; pointer-events: none; }
  .watermark img { width: 60px; height: 60px; object-fit: contain; }
  .watermark-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg);
    font-size: 16px; font-weight: 700; color: rgba(0,0,0,0.04); white-space: nowrap; pointer-events: none; z-index: 0; }

  /* Copy label */
  .copy-label { position: absolute; top: 1.5mm; right: 1.5mm; font-size: 5.5px; font-weight: 700;
    padding: 0.5px 6px; border-radius: 6px; background: rgba(255,255,255,0.3); color: #fff; z-index: 3; letter-spacing: 0.3px; }

  /* Header - thinner */
  .receipt-header { display: flex; align-items: center; gap: 1.5mm; padding: 1.5mm 2.5mm; position: relative; z-index: 1; }
  .header-logo { height: 22px; width: 22px; object-fit: contain; border-radius: 2px; flex-shrink: 0; background: rgba(255,255,255,0.15); padding: 1px; }
  .header-logo-placeholder { height: 22px; width: 22px; flex-shrink: 0; }
  .header-center { flex: 1; text-align: center; }
  .inst-name-bn { font-weight: 700; color: #fff; line-height: 1.2; }
  .inst-name-en { font-weight: 600; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.5px; }
  .inst-detail { color: rgba(255,255,255,0.7); line-height: 1.2; }

  /* Title row */
  .title-row { display: flex; align-items: center; justify-content: space-between; padding: 1mm 2.5mm 0; position: relative; z-index: 1; }
  .serial-box { display: flex; align-items: center; gap: 1mm; }
  .serial-capsule { font-weight: 700; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1px 6px; min-width: 40px; min-height: 12px; text-align: center; display: inline-block; }
  .date-box-row { display: flex; align-items: center; gap: 1mm; }
  .date-label-text { font-weight: 600; color: #555; white-space: nowrap; }
  .date-capsule { font-weight: 600; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1px 6px; min-width: 55px; min-height: 12px; color: #111; white-space: nowrap; display: inline-block; }
  .title-capsule { color: #fff; font-weight: 700; text-align: center; padding: 0.5px 12px; border-radius: 8px; white-space: nowrap; }

  .trx-row { display: flex; justify-content: center; gap: 3mm; padding: 0 2.5mm; position: relative; z-index: 1; }
  .trx-item { color: #666; font-family: monospace, 'Noto Sans Bengali', sans-serif; }
  .trx-item strong { color: #333; }

  /* Form body - compact */
  .form-body { flex: 1; padding: 1mm 2.5mm; position: relative; z-index: 1; display: flex; flex-direction: column; gap: 0.5mm; }
  .form-row { display: flex; align-items: center; gap: 1mm; }
  .form-row-split { display: flex; gap: 1.5mm; }
  .form-row.half { flex: 1; }
  .field-label { width: 48px; flex-shrink: 0; font-weight: 600; color: #444; white-space: nowrap; }
  .field-input { flex: 1; height: 13px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px;
    display: flex; align-items: center; padding: 0 5px; }
  .field-input.amt { background: #ecfdf5; border-color: ${pc}44; }
  .field-value { color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .amt-val { font-weight: 700; color: ${pc}; }

  /* QR in title row */
  .qr-title-box { display: flex; align-items: center; justify-content: center; }
  .qr-title-img { width: 28px; height: 28px; }

  /* Signatures */
  .sig-footer { display: flex; justify-content: space-between; padding: 0 2.5mm 1.5mm; margin-top: auto; position: relative; z-index: 1; }
  .sig-block { text-align: center; width: 32%; }
  .sig-line { border-top: 0.8px solid; margin-bottom: 0.3mm; }
  .sig-title { font-weight: 600; color: #555; }
  .sig-name { color: #888; }

  @media print {
    @page { size: A4; margin: 0; }
    html, body { width: 210mm; background: #fff !important; }
    body { padding: 0; }
    .page { padding: 6mm 10mm; break-inside: avoid; }
    /* Hide everything except receipt */
    nav, header, aside, footer, .sidebar, .no-print { display: none !important; }
  }
  @media screen {
    body { background: #e5e7eb; padding: 20px; }
    .page { background: white; margin: 0 auto 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); max-width: 210mm; }
  }
`;
}

function wrapInHtml(title: string, body: string, style?: ReceiptStyleConfig): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${getCSS(style)}</style>
</head><body>
${body}
<script>document.fonts.ready.then(()=>{setTimeout(()=>window.print(),800)});</script>
</body></html>`;
}

/**
 * Mode 1: Single student → 2 copies (Office top, Student bottom) on one A4.
 */
export function buildSingleStudentPrintHtml(receiptData: ReceiptData, style?: ReceiptStyleConfig): string {
  const s = { ...DEFAULT_STYLE, ...style };
  const officeCopy = buildReceipt(receiptData, 'অফিস কপি', s);
  const studentCopy = buildReceipt(receiptData, 'ছাত্র কপি', s);

  const page = `<div class="page mode-single">
    ${officeCopy}
    <div class="cut-v"></div>
    ${studentCopy}
  </div>`;

  return wrapInHtml('রশিদ বই', page, s);
}

/**
 * Mode 2: Bulk class → 6 receipts per A4 (3 rows × 2 cols).
 * Each row = 1 student (office + student copy side by side).
 */
export function buildBulkClassPrintHtml(allReceipts: ReceiptData[], style?: ReceiptStyleConfig): string {
  const s = { ...DEFAULT_STYLE, ...style };
  const pages: string[] = [];

  for (let i = 0; i < allReceipts.length; i += 3) {
    const chunk = allReceipts.slice(i, i + 3);
    const rows = chunk.map((rd, idx) => {
      const office = buildReceipt(rd, 'অফিস কপি', s);
      const student = buildReceipt(rd, 'ছাত্র কপি', s);
      const cutH = idx < chunk.length - 1 ? '<div class="cut-h"></div>' : '';
      return `<div class="receipt-row">${office}<div class="cut-v"></div>${student}</div>${cutH}`;
    }).join('');

    pages.push(`<div class="page mode-bulk">${rows}</div>`);
  }

  return wrapInHtml('রশিদ বই - বাল্ক', pages.join(''), s);
}
