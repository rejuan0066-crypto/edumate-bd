/**
 * Two print modes for Fee Receipts with premium green capsule design.
 * Mode 1: Single student → 2 copies (Office + Student) on one A4.
 * Mode 2: Bulk class → 6 receipts per A4 (3 rows × 2 cols).
 */

interface ReceiptData {
  studentName: string;
  studentId: string;
  rollNumber: string;
  className: string;
  sessionName: string;
  feeType: string;
  amount: string;
  transactionId: string;
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

function buildGreenReceipt(data: ReceiptData, copyLabel: string): string {
  const qrData = encodeURIComponent(`TXN:${data.transactionId}|AMT:${data.amount}|STU:${data.studentId}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${qrData}`;

  return `
    <div class="receipt-card">
      <!-- Watermark Logo -->
      ${data.logoUrl ? `<div class="watermark-logo"><img src="${data.logoUrl}" /></div>` : `<div class="watermark-text">${data.institutionName}</div>`}
      
      <!-- Copy Label -->
      <div class="copy-badge">${copyLabel}</div>
      
      <!-- Green Header -->
      <div class="green-header">
        ${data.logoUrl ? `<img src="${data.logoUrl}" class="header-logo" />` : ''}
        <div class="header-center">
          <div class="inst-name-bn">${data.institutionName}</div>
          ${data.institutionNameEn ? `<div class="inst-name-en">${data.institutionNameEn}</div>` : ''}
          <div class="inst-detail">${data.institutionAddress}${data.institutionPhone ? ` | ${data.institutionPhone}` : ''}${data.institutionEmail ? ` | ${data.institutionEmail}` : ''}</div>
          ${data.institutionOtherInfo ? `<div class="inst-detail">${data.institutionOtherInfo}</div>` : ''}
        </div>
        ${data.logoUrl ? `<img src="${data.logoUrl}" class="header-logo" />` : ''}
      </div>
      
      <!-- Title Capsule -->
      <div class="title-capsule">${data.bn ? 'ফি রিসিট' : 'Fee Receipt'}</div>
      
      <!-- Body -->
      <div class="receipt-body">
        <div class="info-section">
          <div class="info-row"><span class="lbl">${data.bn ? 'নাম' : 'Name'}:</span><span class="val">${data.studentName}</span></div>
          <div class="info-row"><span class="lbl">${data.bn ? 'আইডি' : 'ID'}:</span><span class="val">${data.studentId}</span></div>
          <div class="info-row"><span class="lbl">${data.bn ? 'রোল' : 'Roll'}:</span><span class="val">${data.rollNumber}</span></div>
          <div class="info-row"><span class="lbl">${data.bn ? 'ক্লাস' : 'Class'}:</span><span class="val">${data.className}</span></div>
          <div class="info-row"><span class="lbl">${data.bn ? 'সেশন' : 'Session'}:</span><span class="val">${data.sessionName}</span></div>
          <div class="info-row"><span class="lbl">${data.bn ? 'ফি ধরন' : 'Fee Type'}:</span><span class="val">${data.feeType}</span></div>
          <div class="info-row amt-row"><span class="lbl">${data.bn ? 'পরিমাণ' : 'Amount'}:</span><span class="val amt">৳ ${data.amount}</span></div>
          <div class="info-row"><span class="lbl">TXN:</span><span class="val txn">${data.transactionId}</span></div>
          <div class="info-row"><span class="lbl">${data.bn ? 'তারিখ' : 'Date'}:</span><span class="val">${data.date}</span></div>
          <div class="info-row"><span class="lbl">${data.bn ? 'স্ট্যাটাস' : 'Status'}:</span><span class="val" style="color:${data.statusColor};font-weight:700">${data.status}</span></div>
        </div>
        <div class="qr-box">
          <img src="${qrUrl}" class="qr-img" alt="QR" />
        </div>
      </div>
      
      <!-- Footer Signatures -->
      <div class="sig-footer">
        <div class="sig-item">
          <div class="sig-line-mark"></div>
          <div class="sig-title">${data.bn ? 'আদায়কারী' : 'Collector'}</div>
          <div class="sig-person">${data.collectorName}</div>
        </div>
        ${data.approverName ? `
        <div class="sig-item">
          <div class="sig-line-mark"></div>
          <div class="sig-title">${data.bn ? 'অনুমোদনকারী' : 'Approver'}</div>
          <div class="sig-person">${data.approverName}</div>
        </div>` : ''}
      </div>
    </div>`;
}

const GREEN_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Sans Bengali', sans-serif; background: #fff; color: #1a1a1a; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  
  .page { width: 210mm; height: 297mm; padding: 4mm; display: flex; flex-direction: column; page-break-after: always; overflow: hidden; position: relative; }
  .page:last-child { page-break-after: auto; }
  
  /* MODE 1: Single student - 2 rows, 1 col */
  .mode-single .receipt-card { width: 100%; height: calc(50% - 3mm); }
  .mode-single .cut-h { border-top: 1px dashed #aaa; margin: 2mm 0; }

  /* MODE 2: Bulk - 3 rows, 2 cols */
  .mode-bulk { flex-wrap: wrap; flex-direction: row; gap: 0; }
  .mode-bulk .receipt-row { display: flex; width: 100%; height: calc(33.33% - 2mm); }
  .mode-bulk .receipt-card { width: 50%; }
  .mode-bulk .cut-v { width: 0; border-left: 1px dashed #aaa; }
  .mode-bulk .cut-h { border-top: 1px dashed #aaa; width: 100%; }

  .receipt-card {
    position: relative;
    overflow: hidden;
    border: 1.5px solid #1a5c2e;
    border-radius: 4px;
    padding: 3mm;
    display: flex;
    flex-direction: column;
  }

  /* Watermark */
  .watermark-logo { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 0; opacity: 0.06; pointer-events: none; }
  .watermark-logo img { width: 70px; height: 70px; object-fit: contain; }
  .watermark-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-25deg); font-size: 22px; font-weight: 700; color: rgba(26,92,46,0.05); white-space: nowrap; pointer-events: none; z-index: 0; }

  /* Copy badge */
  .copy-badge { position: absolute; top: 2mm; right: 2mm; font-size: 7px; font-weight: 700; padding: 1px 6px; border-radius: 8px; background: #dcfce7; color: #166534; z-index: 2; border: 1px solid #bbf7d0; }

  /* Green Header */
  .green-header { display: flex; align-items: center; gap: 2mm; background: linear-gradient(135deg, #1a5c2e 0%, #2d8a4e 100%); border-radius: 3px; padding: 2mm 3mm; position: relative; z-index: 1; }
  .header-logo { height: 24px; width: 24px; object-fit: contain; border-radius: 2px; flex-shrink: 0; }
  .header-center { flex: 1; text-align: center; }
  .inst-name-bn { font-size: 10px; font-weight: 700; color: #fff; line-height: 1.2; }
  .inst-name-en { font-size: 7px; font-weight: 600; color: #d1fae5; }
  .inst-detail { font-size: 6px; color: #bbf7d0; line-height: 1.3; }

  /* Title capsule */
  .title-capsule { background: #1a5c2e; color: #fff; font-size: 9px; font-weight: 700; text-align: center; padding: 1.5px 12px; border-radius: 10px; width: fit-content; margin: 2mm auto 1mm; position: relative; z-index: 1; }

  /* Body */
  .receipt-body { display: flex; gap: 2mm; flex: 1; position: relative; z-index: 1; }
  .info-section { flex: 1; }
  .info-row { display: flex; font-size: 8px; line-height: 1.5; border-bottom: 0.5px dotted #e5e7eb; padding: 0.3mm 0; }
  .lbl { width: 42px; font-weight: 600; color: #555; flex-shrink: 0; }
  .val { flex: 1; color: #111; }
  .amt { font-weight: 700; font-size: 10px; color: #1a5c2e; }
  .txn { font-size: 6.5px; font-family: monospace; word-break: break-all; }
  .qr-box { display: flex; align-items: flex-start; justify-content: center; flex-shrink: 0; padding-top: 1mm; }
  .qr-img { width: 42px; height: 42px; }

  /* Signatures */
  .sig-footer { display: flex; justify-content: space-between; margin-top: auto; padding-top: 2mm; position: relative; z-index: 1; }
  .sig-item { text-align: center; width: 30mm; }
  .sig-line-mark { border-top: 0.8px solid #1a5c2e; margin-bottom: 0.5mm; }
  .sig-title { font-size: 6px; font-weight: 600; color: #555; }
  .sig-person { font-size: 5.5px; color: #888; }

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

function wrapInHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${GREEN_CSS}</style>
</head><body>
${body}
<script>document.fonts.ready.then(()=>{setTimeout(()=>window.print(),800)});</script>
</body></html>`;
}

/**
 * Mode 1: Single student → 2 copies (Office top, Student bottom) on one A4.
 */
export function buildSingleStudentPrintHtml(receiptData: ReceiptData): string {
  const bn = receiptData.bn;
  const officeCopy = buildGreenReceipt(receiptData, bn ? 'অফিস কপি' : 'Office Copy');
  const studentCopy = buildGreenReceipt(receiptData, bn ? 'ছাত্র কপি' : 'Student Copy');

  const page = `<div class="page mode-single">
    ${officeCopy}
    <div class="cut-h"></div>
    ${studentCopy}
  </div>`;

  return wrapInHtml(bn ? 'ফি রিসিট' : 'Fee Receipt', page);
}

/**
 * Mode 2: Bulk class → 6 receipts per A4 (3 rows × 2 cols).
 * Each row = 1 student (office + student copy side by side).
 */
export function buildBulkClassPrintHtml(allReceipts: ReceiptData[]): string {
  const bn = allReceipts[0]?.bn ?? true;
  const pages: string[] = [];

  // Group into chunks of 3 students per page
  for (let i = 0; i < allReceipts.length; i += 3) {
    const chunk = allReceipts.slice(i, i + 3);
    const rows = chunk.map((rd, idx) => {
      const office = buildGreenReceipt(rd, bn ? 'অফিস কপি' : 'Office Copy');
      const student = buildGreenReceipt(rd, bn ? 'ছাত্র কপি' : 'Student Copy');
      const cutH = idx < chunk.length - 1 ? '<div class="cut-h"></div>' : '';
      return `<div class="receipt-row">${office}<div class="cut-v"></div>${student}</div>${cutH}`;
    }).join('');

    pages.push(`<div class="page mode-bulk">${rows}</div>`);
  }

  return wrapInHtml(bn ? 'ফি রিসিট - বাল্ক' : 'Fee Receipt - Bulk', pages.join(''));
}

export type { ReceiptData };
