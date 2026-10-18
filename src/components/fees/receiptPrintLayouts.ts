/**
 * Modern রশিদ বই (Receipt Book) Print Layouts
 * TABLE-BASED layout for DomPDF / html2canvas compatibility
 * Mode 1: Single student → 2 copies (Office + Student) side by side on one A4 Landscape
 * Mode 2: Bulk class → 6 receipts per A4 (3 rows × 2 cols)
 */

export interface ReceiptData {
  studentName: string;
  fatherName?: string;
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
  principalName?: string;
  principalSignatureUrl?: string;
}

const DEFAULT_STYLE: ReceiptStyleConfig = {
  primaryColor: '#0f766e',
  fontSize: 100,
  receiptTitle: 'রশিদ',
  showWatermark: true,
  showQr: true,
  showTrxId: true,
  showTimestamp: true,
};

function buildReceipt(data: ReceiptData, copyLabel: string, style: ReceiptStyleConfig = DEFAULT_STYLE): string {
  const pc = style.primaryColor || '#0f766e';
  const fs = (style.fontSize || 100) / 100;
  const qrData = encodeURIComponent(`TXN:${data.transactionId}|AMT:${data.amount}|STU:${data.studentId}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${qrData}`;

  // Derive lighter shade for accents
  const isPaid = data.statusColor === '#22c55e';

  return `
    <td class="receipt-cell" style="border:1.5px solid ${pc}22;border-radius:10px;overflow:hidden;">
      <div style="position:relative;width:100%;height:100%;">
        <!-- Watermark -->
        ${style.showWatermark !== false ? (data.logoUrl
          ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.04;z-index:0;pointer-events:none;"><img src="${data.logoUrl}" style="width:80px;height:80px;object-fit:contain;" /></div>`
          : `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-20deg);font-size:20px;font-weight:800;color:rgba(0,0,0,0.03);white-space:nowrap;pointer-events:none;z-index:0;letter-spacing:2px;">${data.institutionName}</div>`) : ''}

        <!-- Modern Header -->
        <table cellpadding="0" cellspacing="0" style="width:100%;background:${pc};border-collapse:collapse;">
          <tr>
            <td style="width:28px;padding:2.5mm 2mm;vertical-align:middle;">
              ${data.logoUrl
                ? `<img src="${data.logoUrl}" style="height:22px;width:22px;object-fit:contain;border-radius:4px;background:rgba(255,255,255,0.2);padding:1.5px;" />`
                : `<div style="height:22px;width:22px;border-radius:4px;background:rgba(255,255,255,0.15);"></div>`}
            </td>
            <td style="text-align:center;padding:1.5mm 1mm;vertical-align:middle;">
              <div style="font-weight:800;color:#fff;font-size:${9 * fs}px;line-height:1.15;letter-spacing:0.3px;">${data.institutionName}</div>
              ${data.institutionNameEn ? `<div style="font-weight:500;color:rgba(255,255,255,0.85);font-size:${5 * fs}px;text-transform:uppercase;letter-spacing:1px;margin-top:0.5px;">${data.institutionNameEn}</div>` : ''}
              <div style="color:rgba(255,255,255,0.7);font-size:${4 * fs}px;line-height:1.3;margin-top:0.5px;">${data.institutionAddress}${data.institutionPhone ? ` | ${data.institutionPhone}` : ''}</div>
            </td>
            <td style="width:20px;padding:2mm;vertical-align:middle;">
              <div style="background:rgba(255,255,255,0.15);border-radius:4px;padding:3px 2px;text-align:center;writing-mode:vertical-rl;text-orientation:mixed;min-height:30px;">
                <span style="font-size:5.5px;font-weight:700;color:rgba(255,255,255,0.9);letter-spacing:0.5px;white-space:nowrap;">${copyLabel}</span>
              </div>
            </td>
          </tr>
        </table>

        <!-- Accent line -->
        <div style="height:2px;background:linear-gradient(90deg, ${pc}44, ${pc}, ${pc}44);"></div>

        <!-- Serial / Badge / Date Row -->
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:2mm;">
          <tr>
            <td style="width:33%;text-align:left;padding:0 3mm;vertical-align:middle;">
              <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
                ${style.showQr !== false ? `<td style="vertical-align:middle;padding-right:3px;"><img src="${qrUrl}" style="width:24px;height:24px;border-radius:3px;border:1px solid #e5e7eb;" alt="QR" /></td>` : ''}
                <td style="vertical-align:middle;">
                  <div style="font-size:${4 * fs}px;color:#9ca3af;font-weight:500;line-height:1;">ক্রমিক নং</div>
                  <div style="font-weight:700;font-size:${5.5 * fs}px;color:${pc};margin-top:0.5px;">${data.receiptSerial || '—'}</div>
                </td>
              </tr></table>
            </td>
            <td style="width:34%;text-align:center;vertical-align:middle;">
              <span style="background:${pc};color:#fff;font-weight:700;font-size:${6.5 * fs}px;padding:1.5px 14px;border-radius:20px;white-space:nowrap;display:inline-block;letter-spacing:0.5px;">${style.receiptTitle || 'রশিদ'}</span>
            </td>
            <td style="width:33%;text-align:right;padding:0 3mm;vertical-align:middle;">
              <div style="font-size:${4 * fs}px;color:#9ca3af;font-weight:500;line-height:1;">তারিখ</div>
              <div style="font-weight:600;font-size:${5.5 * fs}px;color:#374151;margin-top:0.5px;">${data.date || '—'}</div>
            </td>
          </tr>
        </table>

        <!-- TrxID & Timestamp -->
        ${(style.showTrxId !== false && data.gatewayTrxId) || (style.showTimestamp !== false && data.paymentTimestamp) ? `
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          <tr><td style="text-align:center;padding:0.5mm 3mm;">
            <div style="background:#f9fafb;border-radius:4px;padding:1px 6px;display:inline-block;">
              ${style.showTrxId !== false && data.gatewayTrxId ? `<span style="color:#6b7280;font-size:${4 * fs}px;font-family:monospace,'Noto Sans Bengali',sans-serif;">TrxID: <strong style="color:#374151;">${data.gatewayTrxId}</strong></span>` : ''}
              ${(style.showTrxId !== false && data.gatewayTrxId) && (style.showTimestamp !== false && data.paymentTimestamp) ? `<span style="color:#d1d5db;margin:0 3px;">|</span>` : ''}
              ${style.showTimestamp !== false && data.paymentTimestamp ? `<span style="color:#6b7280;font-size:${4 * fs}px;">সময়: ${data.paymentTimestamp}</span>` : ''}
            </div>
          </td></tr>
        </table>` : ''}

        <!-- Form Fields -->
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:1.5mm 0 1mm;">
          ${[
            { label: 'নাম:', value: data.studentName },
            ...(data.fatherName ? [{ label: 'পিতার নাম:', value: data.fatherName }] : []),
            { label: 'আইডি / রোল:', value: data.studentId || data.rollNumber ? [data.studentId, data.rollNumber ? 'রোল: ' + data.rollNumber : ''].filter(Boolean).join(' | ') : '' },
            { label: 'ক্লাস / সেশন:', value: data.className || data.sessionName ? [data.className, data.sessionName].filter(Boolean).join(' | ') : '' },
            { label: 'বাবদ:', value: data.feeType },
          ].map(f => `
          <tr>
            <td style="font-weight:500;color:#6b7280;white-space:nowrap;font-size:${5.5 * fs}px;padding:1.5px 4px 1.5px 10px;text-align:left;vertical-align:middle;width:70px;">${f.label}</td>
            <td style="padding:1.5px 10px 1.5px 4px;">
              <div style="height:15px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:1px 8px;font-size:${5.5 * fs}px;color:#111827;line-height:15px;overflow:visible;white-space:nowrap;font-weight:500;">${f.value}</div>
            </td>
          </tr>`).join('')}
          <tr>
            <td style="font-weight:500;color:#6b7280;white-space:nowrap;font-size:${5.5 * fs}px;padding:1.5px 4px 1.5px 10px;text-align:left;vertical-align:middle;width:70px;">টাকা:</td>
            <td style="padding:1.5px 10px 1.5px 4px;">
              <div style="height:15px;background:#ecfdf5;border:1px solid #86efac;border-radius:6px;padding:1px 8px;font-size:${6 * fs}px;font-weight:700;color:#059669;line-height:15px;overflow:visible;white-space:nowrap;">৳ ${data.amount}</div>
            </td>
          </tr>
          <tr>
            <td style="font-weight:500;color:#6b7280;white-space:nowrap;font-size:${5.5 * fs}px;padding:1.5px 4px 1.5px 10px;text-align:left;vertical-align:middle;width:70px;">স্ট্যাটাস:</td>
            <td style="padding:1.5px 10px 1.5px 4px;">
              <div style="height:15px;${isPaid ? 'background:#ecfdf5;border:1px solid #86efac;color:#059669;' : 'background:#fef3c7;border:1px solid #fcd34d;color:#d97706;'}border-radius:6px;padding:1px 8px;font-size:${5.5 * fs}px;font-weight:700;line-height:15px;overflow:visible;white-space:nowrap;">${data.status}</div>
            </td>
          </tr>
        </table>

        <!-- Signatures -->
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:5mm;">
          <tr>
            <td style="width:30%;text-align:center;vertical-align:bottom;padding:0 3mm 2mm;">
              <div style="border-top:1.5px solid ${pc}33;margin-bottom:1mm;"></div>
              <div style="font-weight:600;color:#6b7280;font-size:${4 * fs}px;">আদায়কারী</div>
              <div style="color:#374151;font-size:${4 * fs}px;font-weight:500;">${data.collectorName}</div>
            </td>
            <td style="width:${data.approverName ? '30' : '70'}%;text-align:center;vertical-align:bottom;padding:0 3mm 2mm;">
              ${style.principalSignatureUrl ? `<img src="${style.principalSignatureUrl}" style="height:18px;max-width:50px;object-fit:contain;display:block;margin:0 auto 1px;" />` : ''}
              <div style="border-top:1.5px solid ${pc}33;margin-bottom:1mm;"></div>
              <div style="font-weight:600;color:#6b7280;font-size:${4 * fs}px;">মুহতামিম / প্রিন্সিপাল</div>
              <div style="color:#374151;font-size:${4 * fs}px;font-weight:500;">${style.principalName || ''}</div>
            </td>
            ${data.approverName ? `
            <td style="width:30%;text-align:center;vertical-align:bottom;padding:0 3mm 2mm;">
              <div style="border-top:1.5px solid ${pc}33;margin-bottom:1mm;"></div>
              <div style="font-weight:600;color:#6b7280;font-size:${4 * fs}px;">গ্রহণকারী</div>
              <div style="color:#374151;font-size:${4 * fs}px;font-weight:500;">${data.approverName}</div>
            </td>` : ''}
          </tr>
        </table>
      </div>
    </td>`;
}

function getCSS(style: ReceiptStyleConfig = DEFAULT_STYLE): string {
  const pc = style.primaryColor || '#0f766e';
  return `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Kalpurush', 'SutonnyOMJ', 'Noto Sans Bengali', 'Inter', system-ui, sans-serif;
    background: #f0f2f5;
    color: #111827;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  .page {
    width: 297mm;
    height: 210mm;
    padding: 5mm 7mm;
    page-break-after: always;
    overflow: hidden;
    position: relative;
    background: #fff;
  }
  .page:last-child { page-break-after: auto; }

  .receipt-outer-table {
    width: 100%;
    height: 100%;
    border-collapse: separate;
    border-spacing: 4mm 0;
    table-layout: fixed;
  }

  .receipt-cell {
    width: 50%;
    vertical-align: top;
    padding: 0;
    position: relative;
    overflow: hidden;
    background: #ffffff;
  }

  .cut-cell {
    width: 0;
    border-left: 1.5px dashed #d1d5db;
    position: relative;
    padding: 0;
  }
  .cut-cell::after {
    content: '✂';
    position: absolute;
    top: 4px;
    left: -7px;
    font-size: 10px;
    color: #9ca3af;
    background: #fff;
    padding: 2px 0;
  }

  .bulk-outer-table {
    width: 100%;
    height: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .bulk-row-cell {
    height: 33.33%;
    padding: 1mm 0;
    vertical-align: top;
  }
  .bulk-inner-table {
    width: 100%;
    height: 100%;
    border-collapse: separate;
    border-spacing: 2mm 0;
    table-layout: fixed;
  }
  .cut-h-row td {
    border-top: 1.5px dashed #d1d5db;
    padding: 0;
    height: 0;
    position: relative;
  }
  .cut-h-row td::after {
    content: '✂';
    position: absolute;
    left: 4px;
    top: -7px;
    font-size: 10px;
    color: #9ca3af;
    background: #fff;
    padding: 0 3px;
  }

  @media print {
    @page { size: A4 landscape; margin: 0; }
    html, body { width: 297mm; background: #fff !important; }
    body { padding: 0; }
    .page { padding: 5mm 7mm; break-inside: avoid; box-shadow: none !important; }
    nav, header, aside, footer, .sidebar, .no-print { display: none !important; }
  }
  @media screen {
    body { background: #e5e7eb; padding: 20px; }
    .page { margin: 0 auto 20px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 297mm; border-radius: 12px; }
  }
`;
}

function wrapInHtml(title: string, body: string, style?: ReceiptStyleConfig): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>${title}</title>
<style>@font-face{font-family:"Kalpurush";src:url("https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/kalpurush/Kalpurush-v0.258.ttf") format("truetype");font-display:block;}@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${getCSS(style)}</style>
</head><body>
${body}
<script>document.fonts.ready.then(()=>{setTimeout(()=>window.print(),800)});</script>
</body></html>`;
}

/**
 * Mode 1: Single student → 2 copies (Office + Student) side by side on one A4 Landscape.
 */
export function buildSingleStudentPrintHtml(receiptData: ReceiptData, style?: ReceiptStyleConfig): string {
  const s = { ...DEFAULT_STYLE, ...style };
  const officeCopy = buildReceipt(receiptData, 'অফিস কপি', s);
  const studentCopy = buildReceipt(receiptData, 'ছাত্র কপি', s);

  const page = `<div class="page">
    <table class="receipt-outer-table">
      <tr>
        ${officeCopy}
        <td class="cut-cell"></td>
        ${studentCopy}
      </tr>
    </table>
  </div>`;

  return wrapInHtml('রশিদ', page, s);
}

/**
 * Mode 2: Bulk class → 6 receipts per A4 (3 rows × 2 cols).
 */
export function buildBulkClassPrintHtml(allReceipts: ReceiptData[], style?: ReceiptStyleConfig): string {
  const s = { ...DEFAULT_STYLE, ...style };
  const pages: string[] = [];

  for (let i = 0; i < allReceipts.length; i += 3) {
    const chunk = allReceipts.slice(i, i + 3);
    const rows = chunk.map((rd, idx) => {
      const office = buildReceipt(rd, 'অফিস কপি', s);
      const student = buildReceipt(rd, 'ছাত্র কপি', s);
      const cutH = idx < chunk.length - 1 ? '<tr class="cut-h-row"><td colspan="3"></td></tr>' : '';
      return `<tr><td class="bulk-row-cell"><table class="bulk-inner-table"><tr>${office}<td class="cut-cell"></td>${student}</tr></table></td></tr>${cutH}`;
    }).join('');

    pages.push(`<div class="page"><table class="bulk-outer-table">${rows}</table></div>`);
  }

  return wrapInHtml('রশিদ - বাল্ক', pages.join(''), s);
}

/* ===================== DONATION RECEIPT ===================== */

export interface DonationReceiptData {
  donorName: string;
  donorPhone: string;
  donorAddress: string;
  donationAmount: string;
  donationType: string;
  purpose: string;
  receiptSerial: string;
  date: string;
  transactionId: string;
  gatewayTrxId: string;
  paymentTimestamp: string;
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

function buildDonationReceipt(data: DonationReceiptData, copyLabel: string, style: ReceiptStyleConfig = DEFAULT_STYLE): string {
  const pc = style.primaryColor || '#0f766e';
  const fs = (style.fontSize || 100) / 100;
  const qrData = encodeURIComponent(`DON:${data.transactionId}|AMT:${data.donationAmount}|NAME:${data.donorName}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${qrData}`;

  return `
    <td class="receipt-cell" style="border:1.5px solid ${pc}22;border-radius:10px;overflow:hidden;">
      <div style="position:relative;width:100%;height:100%;">
        ${style.showWatermark !== false ? (data.logoUrl
          ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.04;z-index:0;pointer-events:none;"><img src="${data.logoUrl}" style="width:80px;height:80px;object-fit:contain;" /></div>`
          : `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-20deg);font-size:20px;font-weight:800;color:rgba(0,0,0,0.03);white-space:nowrap;pointer-events:none;z-index:0;letter-spacing:2px;">${data.institutionName}</div>`) : ''}

        <!-- Header -->
        <table cellpadding="0" cellspacing="0" style="width:100%;background:${pc};border-collapse:collapse;">
          <tr>
            <td style="width:28px;padding:2.5mm 2mm;vertical-align:middle;">
              ${data.logoUrl ? `<img src="${data.logoUrl}" style="height:22px;width:22px;object-fit:contain;border-radius:4px;background:rgba(255,255,255,0.2);padding:1.5px;" />` : '<div style="height:22px;width:22px;border-radius:4px;background:rgba(255,255,255,0.15);"></div>'}
            </td>
            <td style="text-align:center;padding:1.5mm 1mm;vertical-align:middle;">
              <div style="font-weight:800;color:#fff;font-size:${10 * fs}px;line-height:1.15;letter-spacing:0.3px;">${data.institutionName}</div>
              ${data.institutionNameEn ? `<div style="font-weight:500;color:rgba(255,255,255,0.85);font-size:${6 * fs}px;text-transform:uppercase;letter-spacing:1px;margin-top:0.5px;">${data.institutionNameEn}</div>` : ''}
              <div style="color:rgba(255,255,255,0.7);font-size:${5 * fs}px;line-height:1.3;margin-top:0.5px;">${data.institutionAddress}${data.institutionPhone ? ` | ${data.institutionPhone}` : ''}</div>
            </td>
            <td style="width:20px;padding:2mm;vertical-align:middle;">
              <div style="background:rgba(255,255,255,0.15);border-radius:4px;padding:3px 2px;text-align:center;writing-mode:vertical-rl;text-orientation:mixed;min-height:30px;">
                <span style="font-size:5.5px;font-weight:700;color:rgba(255,255,255,0.9);letter-spacing:0.5px;white-space:nowrap;">${copyLabel}</span>
              </div>
            </td>
          </tr>
        </table>

        <div style="height:2px;background:linear-gradient(90deg, ${pc}44, ${pc}, ${pc}44);"></div>

        <!-- Title Row -->
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:2mm;">
          <tr>
            <td style="width:33%;text-align:left;padding:0 3mm;vertical-align:middle;">
              <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
                ${style.showQr !== false ? `<td style="vertical-align:middle;padding-right:3px;"><img src="${qrUrl}" style="width:24px;height:24px;border-radius:3px;border:1px solid #e5e7eb;" alt="QR" /></td>` : ''}
                <td style="vertical-align:middle;">
                  <div style="font-size:${4.5 * fs}px;color:#9ca3af;font-weight:500;line-height:1;">ক্রমিক নং</div>
                  <div style="font-weight:700;font-size:${6 * fs}px;color:${pc};margin-top:0.5px;">${data.receiptSerial || '—'}</div>
                </td>
              </tr></table>
            </td>
            <td style="width:34%;text-align:center;vertical-align:middle;">
              <span style="background:${pc};color:#fff;font-weight:700;font-size:${7.5 * fs}px;padding:1.5px 14px;border-radius:20px;white-space:nowrap;display:inline-block;letter-spacing:0.5px;">${style.receiptTitle || 'দানের রশিদ'}</span>
            </td>
            <td style="width:33%;text-align:right;padding:0 3mm;vertical-align:middle;">
              <div style="font-size:${4.5 * fs}px;color:#9ca3af;font-weight:500;line-height:1;">তারিখ</div>
              <div style="font-weight:600;font-size:${6 * fs}px;color:#374151;margin-top:0.5px;">${data.date || '—'}</div>
            </td>
          </tr>
        </table>

        <!-- TrxID -->
        ${(style.showTrxId !== false && data.gatewayTrxId) || (style.showTimestamp !== false && data.paymentTimestamp) ? `
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          <tr><td style="text-align:center;padding:0.5mm 3mm;">
            <div style="background:#f9fafb;border-radius:4px;padding:1px 6px;display:inline-block;">
              ${style.showTrxId !== false && data.gatewayTrxId ? `<span style="color:#6b7280;font-size:${5 * fs}px;font-family:monospace,'Noto Sans Bengali',sans-serif;">TrxID: <strong style="color:#374151;">${data.gatewayTrxId}</strong></span>` : ''}
              ${(style.showTrxId !== false && data.gatewayTrxId) && (style.showTimestamp !== false && data.paymentTimestamp) ? `<span style="color:#d1d5db;margin:0 3px;">|</span>` : ''}
              ${style.showTimestamp !== false && data.paymentTimestamp ? `<span style="color:#6b7280;font-size:${5 * fs}px;">সময়: ${data.paymentTimestamp}</span>` : ''}
            </div>
          </td></tr>
        </table>` : ''}

        <!-- Form Fields -->
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:1.5mm 0 1mm;">
          ${[
            { label: 'দাতার নাম:', value: data.donorName },
            { label: 'মোবাইল:', value: data.donorPhone },
            { label: 'ঠিকানা:', value: data.donorAddress },
            { label: 'দানের ধরন:', value: data.donationType },
            { label: 'উদ্দেশ্য:', value: data.purpose },
          ].map(f => `
          <tr>
            <td style="font-weight:500;color:#6b7280;white-space:nowrap;font-size:${6.5 * fs}px;padding:1.5px 4px 1.5px 10px;text-align:left;vertical-align:middle;width:70px;">${f.label}</td>
            <td style="padding:1.5px 10px 1.5px 4px;">
              <div style="height:15px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:1px 8px;font-size:${6.5 * fs}px;color:#111827;line-height:15px;overflow:visible;white-space:nowrap;font-weight:500;">${f.value}</div>
            </td>
          </tr>`).join('')}
          <tr>
            <td style="font-weight:500;color:#6b7280;white-space:nowrap;font-size:${6.5 * fs}px;padding:1.5px 4px 1.5px 10px;text-align:left;vertical-align:middle;width:70px;">টাকা:</td>
            <td style="padding:1.5px 10px 1.5px 4px;">
              <div style="height:15px;background:#ecfdf5;border:1px solid #86efac;border-radius:6px;padding:1px 8px;font-size:${7 * fs}px;font-weight:700;color:#059669;line-height:15px;overflow:visible;white-space:nowrap;">৳ ${data.donationAmount}</div>
            </td>
          </tr>
          <tr>
            <td style="font-weight:500;color:#6b7280;white-space:nowrap;font-size:${6.5 * fs}px;padding:1.5px 4px 1.5px 10px;text-align:left;vertical-align:middle;width:70px;">পদ্ধতি:</td>
            <td style="padding:1.5px 10px 1.5px 4px;">
              <div style="height:15px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:1px 8px;font-size:${6.5 * fs}px;color:#111827;line-height:15px;overflow:visible;white-space:nowrap;font-weight:500;">${data.paymentMethod}</div>
            </td>
          </tr>
        </table>

        <!-- Signatures -->
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:5mm;">
          <tr>
            <td style="width:30%;text-align:center;vertical-align:bottom;padding:0 3mm 2mm;">
              <div style="border-top:1.5px solid ${pc}33;margin-bottom:1mm;"></div>
              <div style="font-weight:600;color:#6b7280;font-size:${5 * fs}px;">আদায়কারী</div>
              <div style="color:#374151;font-size:${4.5 * fs}px;font-weight:500;">${data.collectorName}</div>
            </td>
            <td style="width:${data.approverName ? '30' : '70'}%;text-align:center;vertical-align:bottom;padding:0 3mm 2mm;">
              ${style.principalSignatureUrl ? `<img src="${style.principalSignatureUrl}" style="height:18px;max-width:50px;object-fit:contain;display:block;margin:0 auto 1px;" />` : ''}
              <div style="border-top:1.5px solid ${pc}33;margin-bottom:1mm;"></div>
              <div style="font-weight:600;color:#6b7280;font-size:${5 * fs}px;">মুহতামিম / প্রিন্সিপাল</div>
              <div style="color:#374151;font-size:${4.5 * fs}px;font-weight:500;">${style.principalName || ''}</div>
            </td>
            ${data.approverName ? `
            <td style="width:30%;text-align:center;vertical-align:bottom;padding:0 3mm 2mm;">
              <div style="border-top:1.5px solid ${pc}33;margin-bottom:1mm;"></div>
              <div style="font-weight:600;color:#6b7280;font-size:${5 * fs}px;">গ্রহণকারী</div>
              <div style="color:#374151;font-size:${4.5 * fs}px;font-weight:500;">${data.approverName}</div>
            </td>` : ''}
          </tr>
        </table>
      </div>
    </td>`;
}

export function buildDonationReceiptHtml(data: DonationReceiptData, style?: ReceiptStyleConfig): string {
  const s = { ...DEFAULT_STYLE, receiptTitle: 'দানের রশিদ', ...style };
  const officeCopy = buildDonationReceipt(data, 'অফিস কপি', s);
  const donorCopy = buildDonationReceipt(data, 'দাতা কপি', s);

  const page = `<div class="page">
    <table class="receipt-outer-table">
      <tr>
        ${officeCopy}
        <td class="cut-cell"></td>
        ${donorCopy}
      </tr>
    </table>
  </div>`;

  return wrapInHtml('দানের রশিদ', page, s);
}
