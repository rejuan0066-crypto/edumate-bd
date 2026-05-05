import { format } from 'date-fns';
import { downloadReceiptAsPdf } from '@/lib/receiptPdfDownload';

interface IssuancePrintData {
  bookTitle: string;
  recipientName: string;
  recipientType: string;
  distributionType: string;
  bookCondition: string;
  sellingPrice: number;
  distributorName: string;
  issuedDate: string;
  recipientId?: string;
}

interface InstitutionInfo {
  name: string;
  nameEn: string;
  address: string;
  phone: string;
  logoUrl: string;
}

export const printIssuanceReceipt = (data: IssuancePrintData, institution: InstitutionInfo) => {
  const recipientTypeLabel: Record<string, [string, string]> = {
    student: ['ছাত্র', 'Student'],
    teacher: ['শিক্ষক', 'Teacher'],
    staff: ['স্টাফ', 'Staff'],
  };
  const [typeBn] = recipientTypeLabel[data.recipientType] || ['—', '—'];
  const conditionBn = data.bookCondition === 'new' ? 'নতুন' : 'পুরাতন';
  const distTypeBn = data.distributionType === 'sale' ? 'বিক্রয়' : 'ফ্রি';

  const html = `<!DOCTYPE html>
<html lang="bn"><head><meta charset="UTF-8">
<title>বই বিতরণ রসিদ</title>
<style>@font-face{font-family:"Kalpurush";src:url("https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/kalpurush/Kalpurush-v0.258.ttf") format("truetype");font-display:block;}@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family: 'Kalpurush', 'SutonnyOMJ','Noto Sans Bengali',sans-serif;padding:20px;color:#1a1a1a;font-size:14px}
  .receipt{max-width:500px;margin:auto;border:2px solid #333;padding:24px;border-radius:8px}
  .header{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px}
  .header img{width:60px;height:60px;object-fit:contain;margin-bottom:6px}
  .header h1{font-size:18px;font-weight:700;margin:0}
  .header p{font-size:12px;color:#555;margin:2px 0}
  .title{text-align:center;font-size:16px;font-weight:700;margin:12px 0;padding:6px;background:#f0f0f0;border-radius:4px}
  .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #ddd}
  .row:last-child{border-bottom:none}
  .label{font-weight:600;color:#555}
  .value{font-weight:600;text-align:right}
  .footer{margin-top:20px;display:flex;justify-content:space-between;padding-top:40px}
  .sig{text-align:center;border-top:1px solid #333;padding-top:4px;min-width:120px;font-size:12px}
  .print-date{text-align:center;font-size:11px;color:#888;margin-top:16px}
  @media print{body{padding:0}.no-print{display:none!important}}
</style>
</head><body>
<div class="no-print" style="text-align:center;margin-bottom:16px">
  <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer;border:1px solid #333;border-radius:4px;background:#fff">🖨️ প্রিন্ট করুন</button>
  <button onclick="window.close()" style="padding:8px 24px;font-size:14px;cursor:pointer;border:1px solid #ccc;border-radius:4px;background:#fff;margin-left:8px">✕ বন্ধ করুন</button>
</div>
<div class="receipt">
  <div class="header">
    ${institution.logoUrl ? `<img src="${institution.logoUrl}" alt="Logo">` : ''}
    <h1>${institution.name}</h1>
    ${institution.nameEn ? `<p style="font-size:13px">${institution.nameEn}</p>` : ''}
    <p>${institution.address}</p>
    <p>📞 ${institution.phone}</p>
  </div>
  <div class="title">📚 বই বিতরণ রসিদ</div>
  <div class="row"><span class="label">বইয়ের নাম:</span><span class="value">${data.bookTitle}</span></div>
  <div class="row"><span class="label">গ্রহীতার নাম:</span><span class="value">${data.recipientName}</span></div>
  ${data.recipientId ? `<div class="row"><span class="label">আইডি:</span><span class="value">${data.recipientId}</span></div>` : ''}
  <div class="row"><span class="label">গ্রহীতার ধরন:</span><span class="value">${typeBn}</span></div>
  <div class="row"><span class="label">বিতরণ ধরন:</span><span class="value">${distTypeBn}</span></div>
  <div class="row"><span class="label">বইয়ের অবস্থা:</span><span class="value">${conditionBn}</span></div>
  ${data.distributionType === 'sale' ? `<div class="row"><span class="label">বিক্রয়মূল্য:</span><span class="value">৳${data.sellingPrice}</span></div>` : ''}
  <div class="row"><span class="label">বিতরণকারী:</span><span class="value">${data.distributorName || '—'}</span></div>
  <div class="row"><span class="label">তারিখ:</span><span class="value">${data.issuedDate}</span></div>
  <div class="footer">
    <div class="sig">গ্রহীতার স্বাক্ষর</div>
    <div class="sig">বিতরণকারীর স্বাক্ষর</div>
  </div>
  <div class="print-date">প্রিন্ট: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}</div>
</div>
</body></html>`;

  const w = window.open('', '_blank', 'width=600,height=700');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
};

export const downloadIssuanceReceipt = async (data: IssuancePrintData, institution: InstitutionInfo) => {
  const recipientTypeLabel: Record<string, [string, string]> = {
    student: ['ছাত্র', 'Student'],
    teacher: ['শিক্ষক', 'Teacher'],
    staff: ['স্টাফ', 'Staff'],
  };
  const [typeBn] = recipientTypeLabel[data.recipientType] || ['—', '—'];
  const conditionBn = data.bookCondition === 'new' ? 'নতুন' : 'পুরাতন';
  const distTypeBn = data.distributionType === 'sale' ? 'বিক্রয়' : 'ফ্রি';

  const html = `<!DOCTYPE html>
<html lang="bn"><head><meta charset="UTF-8">
<title>বই বিতরণ রসিদ</title>
<style>@font-face{font-family:"Kalpurush";src:url("https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/kalpurush/Kalpurush-v0.258.ttf") format("truetype");font-display:block;}@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family: 'Kalpurush', 'SutonnyOMJ','Noto Sans Bengali',sans-serif;padding:20px;color:#1a1a1a;font-size:14px}
  .receipt{max-width:500px;margin:auto;border:2px solid #333;padding:24px;border-radius:8px}
  .header{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px}
  .header img{width:60px;height:60px;object-fit:contain;margin-bottom:6px}
  .header h1{font-size:18px;font-weight:700;margin:0}
  .header p{font-size:12px;color:#555;margin:2px 0}
  .title{text-align:center;font-size:16px;font-weight:700;margin:12px 0;padding:6px;background:#f0f0f0;border-radius:4px}
  .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #ddd}
  .row:last-child{border-bottom:none}
  .label{font-weight:600;color:#555}
  .value{font-weight:600;text-align:right}
  .footer{margin-top:20px;display:flex;justify-content:space-between;padding-top:40px}
  .sig{text-align:center;border-top:1px solid #333;padding-top:4px;min-width:120px;font-size:12px}
  .print-date{text-align:center;font-size:11px;color:#888;margin-top:16px}
</style>
</head><body>
<div class="receipt">
  <div class="header">
    ${institution.logoUrl ? `<img src="${institution.logoUrl}" alt="Logo">` : ''}
    <h1>${institution.name}</h1>
    ${institution.nameEn ? `<p style="font-size:13px">${institution.nameEn}</p>` : ''}
    <p>${institution.address}</p>
    <p>📞 ${institution.phone}</p>
  </div>
  <div class="title">📚 বই বিতরণ রসিদ</div>
  <div class="row"><span class="label">বইয়ের নাম:</span><span class="value">${data.bookTitle}</span></div>
  <div class="row"><span class="label">গ্রহীতার নাম:</span><span class="value">${data.recipientName}</span></div>
  ${data.recipientId ? `<div class="row"><span class="label">আইডি:</span><span class="value">${data.recipientId}</span></div>` : ''}
  <div class="row"><span class="label">গ্রহীতার ধরন:</span><span class="value">${typeBn}</span></div>
  <div class="row"><span class="label">বিতরণ ধরন:</span><span class="value">${distTypeBn}</span></div>
  <div class="row"><span class="label">বইয়ের অবস্থা:</span><span class="value">${conditionBn}</span></div>
  ${data.distributionType === 'sale' ? `<div class="row"><span class="label">বিক্রয়মূল্য:</span><span class="value">৳${data.sellingPrice}</span></div>` : ''}
  <div class="row"><span class="label">বিতরণকারী:</span><span class="value">${data.distributorName || '—'}</span></div>
  <div class="row"><span class="label">তারিখ:</span><span class="value">${data.issuedDate}</span></div>
  <div class="footer">
    <div class="sig">গ্রহীতার স্বাক্ষর</div>
    <div class="sig">বিতরণকারীর স্বাক্ষর</div>
  </div>
  <div class="print-date">প্রিন্ট: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}</div>
</div>
</body></html>`;

  await downloadReceiptAsPdf(html, `book-receipt-${data.issuedDate}.pdf`);
};

export const printYearlyIssuanceList = (
  issuances: any[],
  year: number,
  institution: InstitutionInfo
) => {
  let totalSaleAmount = 0;
  const rows = issuances.map((i: any, idx: number) => {
    const bookTitle = i.library_books?.title_bn || i.library_books?.title || '—';
    const recipientTypeBn = i.recipient_type === 'student' ? 'ছাত্র' : i.recipient_type === 'teacher' ? 'শিক্ষক' : 'স্টাফ';
    const distBn = i.distribution_type === 'sale' ? 'বিক্রয়' : 'ফ্রি';
    const condBn = i.book_condition === 'new' ? 'নতুন' : 'পুরাতন';
    const statusBn = i.status === 'issued' ? 'ইস্যু' : i.status === 'returned' ? 'ফেরত' : 'হারানো';
    const price = i.distribution_type === 'sale' ? (i.selling_price || 0) : 0;
    totalSaleAmount += price;

    return `<tr>
      <td style="text-align:center">${idx + 1}</td>
      <td>${bookTitle}</td>
      <td>${i.recipient_name || '—'}</td>
      <td style="text-align:center">${recipientTypeBn}</td>
      <td style="text-align:center">${distBn}</td>
      <td style="text-align:center">${condBn}</td>
      <td style="text-align:center">${statusBn}</td>
      <td style="text-align:right">${price > 0 ? `৳${price}` : '—'}</td>
      <td style="text-align:center">${i.issued_date ? format(new Date(i.issued_date), 'dd/MM/yyyy') : '—'}</td>
      <td>${i.distributor_name || '—'}</td>
    </tr>`;
  }).join('');

  const summaryIssued = issuances.filter(i => i.status === 'issued').length;
  const summaryReturned = issuances.filter(i => i.status === 'returned').length;
  const summaryLost = issuances.filter(i => i.status === 'lost').length;
  const summaryFree = issuances.filter(i => i.distribution_type === 'free').length;
  const summarySale = issuances.filter(i => i.distribution_type === 'sale').length;

  const html = `<!DOCTYPE html>
<html lang="bn"><head><meta charset="UTF-8">
<title>বাৎসরিক বই বিতরণ তালিকা - ${year}</title>
<style>@font-face{font-family:"Kalpurush";src:url("https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/kalpurush/Kalpurush-v0.258.ttf") format("truetype");font-display:block;}@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family: 'Kalpurush', 'SutonnyOMJ','Noto Sans Bengali',sans-serif;padding:20px;color:#1a1a1a;font-size:12px}
  .header{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px}
  .header img{width:50px;height:50px;object-fit:contain;margin-bottom:4px}
  .header h1{font-size:16px;font-weight:700}
  .header p{font-size:11px;color:#555;margin:1px 0}
  .title{text-align:center;font-size:15px;font-weight:700;margin:12px 0}
  .summary{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:12px}
  .summary span{background:#f5f5f5;padding:4px 10px;border-radius:4px;font-size:12px;border:1px solid #ddd}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th,td{border:1px solid #999;padding:5px 6px;font-size:11px}
  th{background:#e8e8e8;font-weight:700;text-align:center}
  .total-row{font-weight:700;background:#f0f0f0}
  .footer{margin-top:24px;display:flex;justify-content:space-between;padding-top:40px}
  .sig{text-align:center;border-top:1px solid #333;padding-top:4px;min-width:100px;font-size:11px}
  .print-date{text-align:center;font-size:10px;color:#888;margin-top:12px}
  @media print{body{padding:8px;font-size:10px}th,td{font-size:9px;padding:3px 4px}.no-print{display:none!important}}
</style>
</head><body>
<div class="no-print" style="text-align:center;margin-bottom:16px">
  <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer;border:1px solid #333;border-radius:4px;background:#fff">🖨️ প্রিন্ট করুন</button>
  <button onclick="window.close()" style="padding:8px 24px;font-size:14px;cursor:pointer;border:1px solid #ccc;border-radius:4px;background:#fff;margin-left:8px">✕ বন্ধ করুন</button>
</div>
<div class="header">
  ${institution.logoUrl ? `<img src="${institution.logoUrl}" alt="Logo">` : ''}
  <h1>${institution.name}</h1>
  ${institution.nameEn ? `<p style="font-size:12px">${institution.nameEn}</p>` : ''}
  <p>${institution.address} | 📞 ${institution.phone}</p>
</div>
<div class="title">📚 বাৎসরিক বই বিতরণ তালিকা — ${year}</div>
<div class="summary">
  <span>মোট: ${issuances.length}</span>
  <span>ইস্যু: ${summaryIssued}</span>
  <span>ফেরত: ${summaryReturned}</span>
  <span>হারানো: ${summaryLost}</span>
  <span>ফ্রি: ${summaryFree}</span>
  <span>বিক্রয়: ${summarySale}</span>
  ${totalSaleAmount > 0 ? `<span>মোট বিক্রয়: ৳${totalSaleAmount}</span>` : ''}
</div>
<table>
  <thead><tr>
    <th>ক্র.</th><th>বইয়ের নাম</th><th>গ্রহীতা</th><th>ধরন</th><th>বিতরণ</th><th>অবস্থা</th><th>স্ট্যাটাস</th><th>দাম</th><th>তারিখ</th><th>বিতরণকারী</th>
  </tr></thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td colspan="7" style="text-align:right">মোট বিক্রয়:</td>
      <td style="text-align:right">${totalSaleAmount > 0 ? `৳${totalSaleAmount}` : '—'}</td>
      <td colspan="2"></td>
    </tr>
  </tbody>
</table>
<div class="footer">
  <div class="sig">লাইব্রেরিয়ান</div>
  <div class="sig">হিসাবরক্ষক</div>
  <div class="sig">অধ্যক্ষ</div>
</div>
<div class="print-date">প্রিন্ট: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}</div>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
};

export const downloadYearlyIssuanceList = async (
  issuances: any[],
  year: number,
  institution: InstitutionInfo
) => {
  let totalSaleAmount = 0;
  const rows = issuances.map((i: any, idx: number) => {
    const bookTitle = i.library_books?.title_bn || i.library_books?.title || '—';
    const recipientTypeBn = i.recipient_type === 'student' ? 'ছাত্র' : i.recipient_type === 'teacher' ? 'শিক্ষক' : 'স্টাফ';
    const distBn = i.distribution_type === 'sale' ? 'বিক্রয়' : 'ফ্রি';
    const condBn = i.book_condition === 'new' ? 'নতুন' : 'পুরাতন';
    const statusBn = i.status === 'issued' ? 'ইস্যু' : i.status === 'returned' ? 'ফেরত' : 'হারানো';
    const price = i.distribution_type === 'sale' ? (i.selling_price || 0) : 0;
    totalSaleAmount += price;
    return `<tr>
      <td style="text-align:center">${idx + 1}</td>
      <td>${bookTitle}</td>
      <td>${i.recipient_name || '—'}</td>
      <td style="text-align:center">${recipientTypeBn}</td>
      <td style="text-align:center">${distBn}</td>
      <td style="text-align:center">${condBn}</td>
      <td style="text-align:center">${statusBn}</td>
      <td style="text-align:right">${price > 0 ? `৳${price}` : '—'}</td>
      <td style="text-align:center">${i.issued_date ? format(new Date(i.issued_date), 'dd/MM/yyyy') : '—'}</td>
      <td>${i.distributor_name || '—'}</td>
    </tr>`;
  }).join('');

  const summaryIssued = issuances.filter(i => i.status === 'issued').length;
  const summaryReturned = issuances.filter(i => i.status === 'returned').length;
  const summaryLost = issuances.filter(i => i.status === 'lost').length;
  const summaryFree = issuances.filter(i => i.distribution_type === 'free').length;
  const summarySale = issuances.filter(i => i.distribution_type === 'sale').length;

  const html = `<!DOCTYPE html>
<html lang="bn"><head><meta charset="UTF-8">
<title>বাৎসরিক বই বিতরণ তালিকা - ${year}</title>
<style>@font-face{font-family:"Kalpurush";src:url("https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/kalpurush/Kalpurush-v0.258.ttf") format("truetype");font-display:block;}@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family: 'Kalpurush', 'SutonnyOMJ','Noto Sans Bengali',sans-serif;padding:20px;color:#1a1a1a;font-size:12px}
  .header{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px}
  .header img{width:50px;height:50px;object-fit:contain;margin-bottom:4px}
  .header h1{font-size:16px;font-weight:700}
  .header p{font-size:11px;color:#555;margin:1px 0}
  .title{text-align:center;font-size:15px;font-weight:700;margin:12px 0}
  .summary{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:12px}
  .summary span{background:#f5f5f5;padding:4px 10px;border-radius:4px;font-size:12px;border:1px solid #ddd}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th,td{border:1px solid #999;padding:5px 6px;font-size:11px}
  th{background:#e8e8e8;font-weight:700;text-align:center}
  .total-row{font-weight:700;background:#f0f0f0}
  .footer{margin-top:24px;display:flex;justify-content:space-between;padding-top:40px}
  .sig{text-align:center;border-top:1px solid #333;padding-top:4px;min-width:100px;font-size:11px}
  .print-date{text-align:center;font-size:10px;color:#888;margin-top:12px}
</style>
</head><body>
<div class="header">
  ${institution.logoUrl ? `<img src="${institution.logoUrl}" alt="Logo">` : ''}
  <h1>${institution.name}</h1>
  ${institution.nameEn ? `<p style="font-size:12px">${institution.nameEn}</p>` : ''}
  <p>${institution.address} | 📞 ${institution.phone}</p>
</div>
<div class="title">📚 বাৎসরিক বই বিতরণ তালিকা — ${year}</div>
<div class="summary">
  <span>মোট: ${issuances.length}</span>
  <span>ইস্যু: ${summaryIssued}</span>
  <span>ফেরত: ${summaryReturned}</span>
  <span>হারানো: ${summaryLost}</span>
  <span>ফ্রি: ${summaryFree}</span>
  <span>বিক্রয়: ${summarySale}</span>
  ${totalSaleAmount > 0 ? `<span>মোট বিক্রয়: ৳${totalSaleAmount}</span>` : ''}
</div>
<table>
  <thead><tr>
    <th>ক্র.</th><th>বইয়ের নাম</th><th>গ্রহীতা</th><th>ধরন</th><th>বিতরণ</th><th>অবস্থা</th><th>স্ট্যাটাস</th><th>দাম</th><th>তারিখ</th><th>বিতরণকারী</th>
  </tr></thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td colspan="7" style="text-align:right">মোট বিক্রয়:</td>
      <td style="text-align:right">${totalSaleAmount > 0 ? `৳${totalSaleAmount}` : '—'}</td>
      <td colspan="2"></td>
    </tr>
  </tbody>
</table>
<div class="footer">
  <div class="sig">লাইব্রেরিয়ান</div>
  <div class="sig">হিসাবরক্ষক</div>
  <div class="sig">অধ্যক্ষ</div>
</div>
<div class="print-date">প্রিন্ট: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}</div>
</body></html>`;

  await downloadReceiptAsPdf(html, `book-issuance-list-${year}.pdf`);
};
