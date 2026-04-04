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
          <div class="inst-name-bn" style="font-size:${12 * fs}px">${data.institutionName}</div>
          ${data.institutionNameEn ? `<div class="inst-name-en" style="font-size:${7.5 * fs}px">${data.institutionNameEn}</div>` : ''}
          <div class="inst-detail" style="font-size:${6 * fs}px">${data.institutionAddress}</div>
          ${data.institutionPhone ? `<div class="inst-detail" style="font-size:${6 * fs}px">যোগাযোগ: ${data.institutionPhone}</div>` : ''}
        </div>
        ${data.logoUrl ? `<img src="${data.logoUrl}" class="header-logo" />` : '<div class="header-logo-placeholder"></div>'}
      </div>

      <!-- Title Row -->
      <div class="title-row">
        <div class="serial-box">
          <span class="serial-label" style="font-size:${7 * fs}px">ক্রমিক নং:</span>
          <span class="serial-val" style="font-size:${7 * fs}px;font-weight:700;color:${pc}">${data.receiptSerial || data.transactionId.slice(-6)}</span>
        </div>
        <div class="title-capsule" style="background:${pc};font-size:${10 * fs}px">${style.receiptTitle || 'রশিদ বই'}</div>
        <div class="date-box">
          <span class="date-label" style="font-size:${7 * fs}px">তারিখ:</span>
          <span class="date-val" style="font-size:${7 * fs}px">${data.date}</span>
        </div>
      </div>

      <!-- TrxID & Timestamp Row -->
      ${(style.showTrxId !== false && data.gatewayTrxId) || (style.showTimestamp !== false && data.paymentTimestamp) ? `
      <div class="trx-row">
        ${style.showTrxId !== false && data.gatewayTrxId ? `<span class="trx-item" style="font-size:${6 * fs}px">TrxID: <strong>${data.gatewayTrxId}</strong></span>` : ''}
        ${style.showTimestamp !== false && data.paymentTimestamp ? `<span class="trx-item" style="font-size:${6 * fs}px">সময়: ${data.paymentTimestamp}</span>` : ''}
      </div>` : ''}

      <!-- Form Fields -->
      <div class="form-body">
        <div class="form-row">
          <span class="field-label" style="font-size:${8 * fs}px">নাম:</span>
          <div class="field-input"><span class="field-value" style="font-size:${8 * fs}px">${data.studentName}</span></div>
        </div>
        <div class="form-row">
          <span class="field-label" style="font-size:${8 * fs}px">আইডি / রোল:</span>
          <div class="field-input"><span class="field-value" style="font-size:${8 * fs}px">${data.studentId || data.rollNumber ? [data.studentId, data.rollNumber ? 'রোল: ' + data.rollNumber : ''].filter(Boolean).join(' | ') : ''}</span></div>
        </div>
        <div class="form-row">
          <span class="field-label" style="font-size:${8 * fs}px">ক্লাস / সেশন:</span>
          <div class="field-input"><span class="field-value" style="font-size:${8 * fs}px">${data.className || data.sessionName ? [data.className, data.sessionName].filter(Boolean).join(' | ') : ''}</span></div>
        </div>
        <div class="form-row">
          <span class="field-label" style="font-size:${8 * fs}px">বাবদ:</span>
          <div class="field-input"><span class="field-value" style="font-size:${8 * fs}px">${data.feeType}</span></div>
        </div>
        <div class="form-row-split">
          <div class="form-row half">
            <span class="field-label" style="font-size:${8 * fs}px">টাকা:</span>
            <div class="field-input amt"><span class="field-value amt-val" style="font-size:${9 * fs}px">৳ ${data.amount}</span></div>
          </div>
          <div class="form-row half">
            <span class="field-label" style="font-size:${8 * fs}px">স্ট্যাটাস:</span>
            <div class="field-input"><span class="field-value" style="font-size:${8 * fs}px;color:${data.statusColor};font-weight:700">${data.status}</span></div>
          </div>
        </div>
        ${style.showQr !== false ? `
        <div class="qr-corner">
          <img src="${qrUrl}" class="qr-img" alt="QR" />
        </div>` : ''}
      </div>

      <!-- Signatures -->
      <div class="sig-footer">
        <div class="sig-block">
          <div class="sig-line" style="border-color:${pc}"></div>
          <div class="sig-title" style="font-size:${6.5 * fs}px">আদায়কারী স্বাক্ষর</div>
          <div class="sig-name" style="font-size:${5.5 * fs}px">${data.collectorName}</div>
        </div>
        ${data.approverName ? `
        <div class="sig-block">
          <div class="sig-line" style="border-color:${pc}"></div>
          <div class="sig-title" style="font-size:${6.5 * fs}px">পরিচালকের স্বাক্ষর</div>
          <div class="sig-name" style="font-size:${5.5 * fs}px">${data.approverName}</div>
        </div>` : `
        <div class="sig-block">
          <div class="sig-line" style="border-color:${pc}"></div>
          <div class="sig-title" style="font-size:${6.5 * fs}px">পরিচালকের স্বাক্ষর</div>
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

  .page { width: 210mm; height: 297mm; padding: 4mm; display: flex; flex-direction: column; page-break-after: always; overflow: hidden; position: relative; }
  .page:last-child { page-break-after: auto; }

  /* MODE 1: Single - 2 stacked */
  .mode-single .receipt-card { width: 100%; height: calc(50% - 3mm); }
  .mode-single .cut-h { border-top: 1.5px dashed #aaa; margin: 2mm 0; }

  /* MODE 2: Bulk - 3×2 grid */
  .mode-bulk { flex-wrap: wrap; flex-direction: row; gap: 0; }
  .mode-bulk .receipt-row { display: flex; width: 100%; height: calc(33.33% - 2mm); }
  .mode-bulk .receipt-card { width: 50%; }
  .mode-bulk .cut-v { width: 0; border-left: 1.5px dashed #aaa; }
  .mode-bulk .cut-h { border-top: 1.5px dashed #aaa; width: 100%; }

  .receipt-card {
    position: relative; overflow: hidden;
    border: 2px solid ${pc}; border-radius: 4px;
    padding: 0; display: flex; flex-direction: column;
  }

  /* Watermark */
  .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 0; opacity: 0.06; pointer-events: none; }
  .watermark img { width: 80px; height: 80px; object-fit: contain; }
  .watermark-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg);
    font-size: 20px; font-weight: 700; color: rgba(0,0,0,0.04); white-space: nowrap; pointer-events: none; z-index: 0; }

  /* Copy label */
  .copy-label { position: absolute; top: 2mm; right: 2mm; font-size: 6.5px; font-weight: 700;
    padding: 1px 7px; border-radius: 8px; background: rgba(255,255,255,0.25); color: #fff; z-index: 3; letter-spacing: 0.3px; }

  /* Header */
  .receipt-header { display: flex; align-items: center; gap: 2mm; padding: 2.5mm 3mm; position: relative; z-index: 1; }
  .header-logo { height: 28px; width: 28px; object-fit: contain; border-radius: 3px; flex-shrink: 0; background: rgba(255,255,255,0.15); padding: 1px; }
  .header-logo-placeholder { height: 28px; width: 28px; flex-shrink: 0; }
  .header-center { flex: 1; text-align: center; }
  .inst-name-bn { font-weight: 700; color: #fff; line-height: 1.25; }
  .inst-name-en { font-weight: 600; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 0.5px; }
  .inst-detail { color: rgba(255,255,255,0.7); line-height: 1.3; }

  /* Title row */
  .title-row { display: flex; align-items: center; justify-content: space-between; padding: 1.5mm 3mm 0; position: relative; z-index: 1; }
  .serial-box, .date-box { display: flex; align-items: center; gap: 1mm; }
  .serial-label, .date-label { font-weight: 600; color: #555; }
  .serial-val, .date-val { color: #111; }
  .title-capsule { color: #fff; font-weight: 700; text-align: center; padding: 1px 14px; border-radius: 10px; white-space: nowrap; }

  .trx-row { display: flex; justify-content: center; gap: 4mm; padding: 0 3mm; position: relative; z-index: 1; }
  .trx-item { color: #666; font-family: monospace, 'Noto Sans Bengali', sans-serif; }
  .trx-item strong { color: #333; }

  /* Form body */
  .form-body { flex: 1; padding: 1.5mm 3mm; position: relative; z-index: 1; display: flex; flex-direction: column; gap: 1mm; }
  .form-row { display: flex; align-items: center; gap: 1.5mm; }
  .form-row-split { display: flex; gap: 2mm; }
  .form-row.half { flex: 1; }
  .field-label { width: 52px; flex-shrink: 0; font-weight: 600; color: #444; white-space: nowrap; }
  .field-input { flex: 1; height: 16px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 10px;
    display: flex; align-items: center; padding: 0 6px; }
  .field-input.amt { background: #ecfdf5; border-color: ${pc}44; }
  .field-value { color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .amt-val { font-weight: 700; color: ${pc}; }

  /* QR corner */
  .qr-corner { position: absolute; bottom: 0; right: 3mm; z-index: 2; }
  .qr-img { width: 36px; height: 36px; }

  /* Signatures */
  .sig-footer { display: flex; justify-content: space-between; padding: 0 3mm 2mm; margin-top: auto; position: relative; z-index: 1; }
  .sig-block { text-align: center; width: 32%; }
  .sig-line { border-top: 0.8px solid; margin-bottom: 0.5mm; }
  .sig-title { font-weight: 600; color: #555; }
  .sig-name { color: #888; }

  @media print {
    @page { size: A4; margin: 0; }
    body { padding: 0; }
    .page { padding: 4mm; }
  }
  @media screen {
    body { background: #e5e7eb; padding: 20px; }
    .page { background: white; margin: 0 auto 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
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
    <div class="cut-h"></div>
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
