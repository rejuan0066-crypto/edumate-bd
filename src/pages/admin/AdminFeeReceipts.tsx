import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { CheckCircle2, Download, Printer, Receipt, Search, Calendar, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { numberToBanglaWords, toBanglaDigits } from '@/lib/amountInWords';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { generateReceiptQrDataUrl } from '@/lib/receiptQr';
import { bnToEn, enToBn } from '@/lib/utils';

interface ReceiptData {
  id: string;
  receipt_number: string;
  student_name: string;
  student_id: string;
  class_name: string;
  roll: string;
  fee_type: string;
  amount: number;
  paid_amount: number;
  status: string;
  paid_at: string;
  month: string;
  year: number;
  collected_by: string;
  approved_by: string;
}

const AdminFeeReceipts = () => {
  const { language } = useLanguage();
  const [searchRoll, setSearchRoll] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  const { data: institution } = useQuery({
    queryKey: ['institution-receipt'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    }
  });

  const { data: academicSessions = [] } = useQuery({
    queryKey: ['academic-sessions-receipts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_sessions').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: payments, isLoading } = useQuery({
    queryKey: ['fee-payments-receipts', selectedYear, selectedMonth, searchRoll],
    queryFn: async () => {
      let query = supabase
        .from('fee_payments')
        .select(`
          *,
          students!inner(name_bn, name_en, student_id, roll_number, class_id, division_id, classes:class_id(name, name_bn), divisions:division_id(name, name_bn)),
          fee_types!inner(name, name_bn, fee_category)
        `)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false });

      if (selectedYear) query = query.eq('year', parseInt(selectedYear));
      if (selectedMonth) query = query.eq('month', selectedMonth);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((p: any) => ({
        id: p.id,
        receipt_number: p.receipt_number || `RCP-${p.id.slice(0, 8).toUpperCase()}`,
        student_name: p.students?.name_bn || p.students?.name_en || '',
        student_id: p.students?.student_id || '',
        class_name: p.students?.classes?.name_bn || p.students?.classes?.name || p.students?.divisions?.name_bn || '',
        roll: p.students?.roll_number || '',
        fee_type: language === 'bn' ? p.fee_types?.name_bn : p.fee_types?.name,
        amount: p.amount,
        paid_amount: p.paid_amount || p.amount,
        status: p.status,
        paid_at: p.paid_at,
        month: p.month,
        year: p.year,
        collected_by: p.collected_by || '',
        approved_by: p.approved_by || '',
      })) as ReceiptData[];
    }
  });

  const cleanSearch = searchRoll.trim();
  const searchEn = bnToEn(cleanSearch).toLowerCase();
  const searchBn = enToBn(cleanSearch);

  const filteredPayments = (payments || []).filter(p => {
    if (!cleanSearch) return true;
    const rollStr = String(p.roll || '').toLowerCase();
    const idStr = String(p.student_id || '').toLowerCase();
    const nameStr = String(p.student_name || '').toLowerCase();
    return (
      rollStr.includes(searchEn) ||
      rollStr.includes(searchBn) ||
      idStr.includes(searchEn) ||
      idStr.includes(searchBn) ||
      nameStr.includes(cleanSearch.toLowerCase())
    );
  });

  const months = [
    { value: 'january', en: 'January', bn: 'জানুয়ারি' },
    { value: 'february', en: 'February', bn: 'ফেব্রুয়ারি' },
    { value: 'march', en: 'March', bn: 'মার্চ' },
    { value: 'april', en: 'April', bn: 'এপ্রিল' },
    { value: 'may', en: 'May', bn: 'মে' },
    { value: 'june', en: 'June', bn: 'জুন' },
    { value: 'july', en: 'July', bn: 'জুলাই' },
    { value: 'august', en: 'August', bn: 'আগস্ট' },
    { value: 'september', en: 'September', bn: 'সেপ্টেম্বর' },
    { value: 'october', en: 'October', bn: 'অক্টোবর' },
    { value: 'november', en: 'November', bn: 'নভেম্বর' },
    { value: 'december', en: 'December', bn: 'ডিসেম্বর' },
  ];

  const buildReceiptBlock = (receipt: ReceiptData, copyLabel: string, isStudentCopy: boolean = false, qrDataUrl: string | null = null) => {
    const amountWords = numberToBanglaWords(receipt.paid_amount);
    const amountBn = toBanglaDigits(receipt.paid_amount.toLocaleString());
    const dateBn = receipt.paid_at ? new Date(receipt.paid_at).toLocaleDateString('bn-BD') : '-';
    const monthLabel = receipt.month || '-';
    const yearLabel = receipt.year ? toBanglaDigits(String(receipt.year)) : '-';
    const logoTag = institution?.logo_url ? `<img src="${institution.logo_url}" style="height:38px; width:38px; object-fit:contain;" />` : '';

    return `
      <td class="receipt-cell">
        <div class="receipt-shell">
          <div class="copy-label">${copyLabel}</div>

          <div class="header">
            <div class="brand-row">
              <div class="logo-wrap">${logoTag}</div>
              <div class="brand-text">
                <div class="inst-name">${institution?.name || 'প্রতিষ্ঠানের নাম'}</div>
                ${institution?.name_en ? `<div class="inst-name-en">${institution.name_en}</div>` : ''}
                <div class="inst-meta">
                  ${institution?.address || ''}
                  ${institution?.phone ? ` | ফোন: ${institution.phone}` : ''}
                  ${institution?.email ? ` | ইমেইল: ${institution.email}` : ''}
                </div>
              </div>
            </div>
          </div>

          <div class="receipt-title">
            <div class="receipt-title-bn">মানি রিসিট</div>
            <div class="receipt-title-en">MONEY RECEIPT</div>
          </div>

          <div class="receipt-body">
            <div class="info-grid">
              <span class="lbl">রসিদ নং:</span>
              <span class="val">${receipt.receipt_number}</span>
              <span class="lbl">তারিখ:</span>
              <span class="val">${dateBn}</span>
              <span class="lbl">স্ট্যাটাস:</span>
              <span class="val"><span class="badge">✓ পরিশোধিত</span></span>
            </div>

            <div class="divider"></div>

            <div class="info-grid">
              <span class="lbl">ছাত্রের নাম:</span>
              <span class="val">${receipt.student_name}</span>
              <span class="lbl">ছাত্র আইডি:</span>
              <span class="val">${receipt.student_id}</span>
              <span class="lbl">শ্রেণী:</span>
              <span class="val">${receipt.class_name}</span>
              <span class="lbl">রোল নম্বর:</span>
              <span class="val">${receipt.roll}</span>
            </div>

            <div class="divider"></div>

            <div class="info-grid">
              <span class="lbl">ফি এর ধরন:</span>
              <span class="val">${receipt.fee_type}</span>
              <span class="lbl">মাস:</span>
              <span class="val">${monthLabel}</span>
              <span class="lbl">বছর:</span>
              <span class="val">${yearLabel}</span>
            </div>

            <div class="amount-box">
              <div class="figure"><span class="taka">৳</span> ${amountBn}</div>
              <div class="words">কথায়: ${amountWords}</div>
            </div>

            <div class="signature-section">
              <div class="signature-block">
                <div class="collector-name">${receipt.collected_by || (institution as any)?.collector_name || (institution as any)?.principal_name || '-'}</div>
                <div class="signature-line"></div>
                <div class="signature-title">আদায়কারী</div>
                <div class="signature-sub">Collector</div>
              </div>
              ${!isStudentCopy ? `<div class="signature-block">
                <div class="collector-name">${receipt.approved_by || (institution as any)?.principal_name || receipt.collected_by || '-'}</div>
                <div class="signature-line"></div>
                <div class="signature-title">গ্রহণকারী</div>
                <div class="signature-sub">Receiver</div>
              </div>` : ''}
            </div>
          </div>

          <div class="receipt-footer">
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="height:60px;width:60px;float:right;margin-left:6px;border:1px solid #d1fae5;border-radius:4px;padding:2px;background:#fff;" />` : ''}
            <p>কম্পিউটার জেনারেটেড মানি রিসিট | Computer Generated Money Receipt</p>
            ${qrDataUrl ? `<p style="font-size:9px;color:#059669;margin-top:2px;">🔒 যাচাই করতে QR স্ক্যান করুন | Scan QR to verify</p>` : ''}
          </div>
        </div>
      </td>`;
  };

  const getReceiptHtml = (receipt: ReceiptData, qrDataUrl: string | null = null) => {
    const officeCopy = buildReceiptBlock(receipt, '📋 অফিস কপি | Office Copy', false, qrDataUrl);
    const studentCopy = buildReceiptBlock(receipt, '🎓 ছাত্র কপি | Student Copy', true, qrDataUrl);

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>মানি রিসিট - ${receipt.receipt_number}</title>
    <style>@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        font-family: 'SutonnyOMJ', 'Noto Sans Bengali', sans-serif;
        background: #eef7f4;
        color: #0f172a;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      .page {
        width: 297mm;
        min-height: 210mm;
        padding: 4mm;
        background: #ffffff;
      }
      .receipt-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 4mm 0;
        table-layout: fixed;
      }
      .receipt-cell {
        width: 50%;
        vertical-align: top;
      }
      .cut-cell {
        width: 0;
        border-left: 1.5px dashed #94a3b8;
        position: relative;
      }
      .cut-cell::after {
        content: '✂';
        position: absolute;
        top: 6px;
        left: -8px;
        background: #fff;
        color: #64748b;
        font-size: 10px;
        padding: 0 2px;
      }
      .receipt-shell {
        border: 2px solid #059669;
        background: #ffffff;
      }
      .copy-label {
        background: #065f46;
        color: #ffffff;
        text-align: center;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1.8px;
      }
      .header {
        background: linear-gradient(180deg, #065f46 0%, #059669 100%);
        padding: 16px 18px 12px;
        color: #ffffff;
      }
      .brand-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
      }
      .logo-wrap {
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.28);
      }
      .brand-text { text-align: center; }
      .inst-name {
        font-size: 18px;
        font-weight: 800;
        line-height: 1.15;
      }
      .inst-name-en {
        margin-top: 3px;
        font-size: 12px;
        font-weight: 700;
      }
      .inst-meta {
        margin-top: 6px;
        font-size: 9px;
        line-height: 1.4;
        opacity: 0.95;
      }
      .receipt-title {
        text-align: center;
        background: #eefaf5;
        border-top: 1px solid #a7f3d0;
        border-bottom: 1px solid #a7f3d0;
        padding: 8px 0 7px;
      }
      .receipt-title-bn {
        font-size: 18px;
        font-weight: 800;
        color: #064e3b;
        line-height: 1;
      }
      .receipt-title-en {
        margin-top: 3px;
        font-size: 10px;
        letter-spacing: 2.5px;
        color: #6b7280;
      }
      .receipt-body {
        padding: 16px 18px 14px;
      }
      .info-grid {
        display: grid;
        grid-template-columns: 106px 1fr;
        gap: 7px 10px;
      }
      .lbl {
        font-size: 11px;
        font-weight: 700;
        color: #1f2937;
      }
      .val {
        font-size: 12px;
        font-weight: 700;
        color: #0f172a;
        border-bottom: 1px dotted #cbd5e1;
        padding-bottom: 2px;
      }
      .divider {
        border-top: 1px dashed #86efac;
        margin: 14px 0;
      }
      .badge {
        display: inline-block;
        background: #dcfce7;
        color: #047857;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
      }
      .amount-box {
        margin-top: 14px;
        border: 2px solid #10b981;
        background: linear-gradient(90deg, #effcf6 0%, #d9fbe8 100%);
        border-radius: 8px;
        text-align: center;
        padding: 14px 12px 12px;
      }
      .figure {
        font-size: 30px;
        font-weight: 800;
        color: #065f46;
        line-height: 1;
      }
      .taka {
        font-size: 18px;
      }
      .words {
        margin-top: 7px;
        font-size: 11px;
        font-weight: 700;
        color: #166534;
      }
      .signature-section {
        display: flex;
        justify-content: space-between;
        gap: 22px;
        margin-top: 30px;
      }
      .signature-block {
        flex: 1;
        text-align: center;
      }
      .collector-name {
        font-size: 12px;
        font-weight: 700;
        color: #065f46;
        margin-bottom: 4px;
      }
      .signature-line {
        border-top: 1.5px solid #1f2937;
        margin-bottom: 6px;
      }
      .signature-title {
        font-size: 10px;
        font-weight: 700;
        color: #1f2937;
      }
      .signature-sub {
        margin-top: 2px;
        font-size: 9px;
        color: #6b7280;
      }
      .receipt-footer {
        text-align: center;
        background: #eefaf5;
        border-top: 1px solid #d1fae5;
        padding: 8px 10px;
      }
      .receipt-footer p {
        font-size: 9px;
        color: #6b7280;
      }
      @media print {
        @page { size: A4 landscape; margin: 0; }
        html, body { width: 297mm; background: #fff !important; }
        body { padding: 0; }
      }
      @media screen {
        body { padding: 18px; }
        .page {
          margin: 0 auto;
          box-shadow: 0 10px 30px rgba(6, 95, 70, 0.12);
        }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <table class="receipt-table">
        <tr>
          ${officeCopy}
          <td class="cut-cell"></td>
          ${studentCopy}
        </tr>
      </table>
    </div>
  </body>
</html>`;
  };

  const handlePrint = async (receipt: ReceiptData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const qr = await generateReceiptQrDataUrl('fee_payment', receipt.id, 180);
    printWindow.document.write(getReceiptHtml(receipt, qr?.dataUrl ?? null));
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 700);
  };

  const handleDownload = async (receipt: ReceiptData) => {
    try {
      const qr = await generateReceiptQrDataUrl('fee_payment', receipt.id, 180);
      const { downloadReceiptAsPdf } = await import('@/lib/receiptPdfDownload');
      await downloadReceiptAsPdf(
        getReceiptHtml(receipt, qr?.dataUrl ?? null),
        `money-receipt-${receipt.receipt_number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`
      );
      toast.success(language === 'bn' ? 'PDF ডাউনলোড হয়েছে' : 'PDF downloaded');
    } catch (error: any) {
      toast.error(error?.message || (language === 'bn' ? 'PDF তৈরি করা যায়নি' : 'Failed to generate PDF'));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {language === 'bn' ? '🧾 ফি রসিদ' : '🧾 Fee Receipts'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {language === 'bn' ? 'পরিশোধিত ফি এর রসিদ দেখুন ও প্রিন্ট করুন' : 'View and print paid fee receipts'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="card-elevated p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={language === 'bn' ? 'নাম / রোল / আইডি...' : 'Name / Roll / ID...'}
                value={searchRoll}
                onChange={(e) => setSearchRoll(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="bg-background">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder={language === 'bn' ? 'বছর' : 'Year'} />
              </SelectTrigger>
              <SelectContent>
                {academicSessions.map((s: any) => (
                  <SelectItem key={s.id} value={s.name}>{language === 'bn' ? (s.name_bn || s.name) : s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={language === 'bn' ? 'সব মাস' : 'All Months'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'bn' ? 'সব মাস' : 'All Months'}</SelectItem>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{language === 'bn' ? m.bn : m.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Receipt className="w-4 h-4" />
              <span>{language === 'bn' ? `মোট: ${filteredPayments.length}টি` : `Total: ${filteredPayments.length}`}</span>
            </div>
          </div>
        </div>

        {/* Receipt Preview or List */}
        {selectedReceipt ? (
          <div className="animate-fade-in">
            {/* Floating Receipt Card */}
            <div className="flex justify-center">
              <div className="w-full max-w-md bg-card/80 backdrop-blur-md rounded-3xl shadow-2xl border border-border overflow-hidden">
                {/* Header */}
                <div className="text-center pt-8 pb-4 px-6">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <CheckCircle2 className="w-7 h-7 text-success-foreground" />
                  </div>
                  {institution?.logo_url && (
                    <img src={institution.logo_url} alt="Logo" className="h-10 mx-auto mb-2 object-contain" />
                  )}
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-lg font-bold text-foreground">{institution?.name || 'প্রতিষ্ঠান'}</h2>
                  </div>
                  {institution?.name_en && (
                    <p className="text-sm font-semibold text-foreground/80">{institution.name_en}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{institution?.address || ''}</p>
                  {institution?.phone && (
                    <p className="text-xs text-muted-foreground">{language === 'bn' ? 'ফোন' : 'Phone'}: {institution.phone}</p>
                  )}
                  {institution?.email && (
                    <p className="text-xs text-muted-foreground">{language === 'bn' ? 'ইমেইল' : 'Email'}: {institution.email}</p>
                  )}
                  {institution?.other_info && (
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{institution.other_info}</p>
                  )}
                  <p className="text-[11px] uppercase tracking-[3px] text-muted-foreground/60 mt-3 font-medium">
                    {language === 'bn' ? 'পেমেন্ট রসিদ' : 'Payment Receipt'}
                  </p>
                </div>

                {/* Order Info */}
                <div className="mx-5 mb-3 bg-muted/50 rounded-2xl p-4 space-y-2">
                  <InfoRow label={language === 'bn' ? 'রসিদ নং' : 'Receipt No'} value={selectedReceipt.receipt_number} />
                  <InfoRow label={language === 'bn' ? 'তারিখ' : 'Date'} value={selectedReceipt.paid_at ? new Date(selectedReceipt.paid_at).toLocaleDateString('bn-BD') : '-'} />
                  <InfoRow label={language === 'bn' ? 'স্ট্যাটাস' : 'Status'} value={
                    <span className="inline-block bg-success/15 text-success text-[11px] font-semibold px-3 py-0.5 rounded-full uppercase tracking-wider">
                      {language === 'bn' ? 'পরিশোধিত' : 'Paid'}
                    </span>
                  } />
                </div>

                {/* Student Info */}
                <div className="mx-5 mb-3 bg-muted/50 rounded-2xl p-4 space-y-2">
                  <InfoRow label={language === 'bn' ? 'ছাত্রের নাম' : 'Student'} value={selectedReceipt.student_name} />
                  <InfoRow label={language === 'bn' ? 'আইডি' : 'ID'} value={selectedReceipt.student_id} />
                  <InfoRow label={language === 'bn' ? 'শ্রেণী' : 'Class'} value={selectedReceipt.class_name} />
                  <InfoRow label={language === 'bn' ? 'রোল' : 'Roll'} value={selectedReceipt.roll} />
                </div>

                {/* Fee Details */}
                <div className="mx-5 mb-3 bg-muted/50 rounded-2xl p-4 space-y-2">
                  <InfoRow label={language === 'bn' ? 'ফি এর ধরন' : 'Fee Type'} value={selectedReceipt.fee_type} />
                  <InfoRow label={language === 'bn' ? 'মাস' : 'Month'} value={selectedReceipt.month || '-'} />
                  <InfoRow label={language === 'bn' ? 'বছর' : 'Year'} value={String(selectedReceipt.year || '-')} />
                </div>

                {/* Dashed separator + Total */}
                <div className="mx-5 mb-2">
                  <div className="border-t-2 border-dashed border-border my-4" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                      {language === 'bn' ? 'মোট পরিশোধ' : 'Total Paid'}
                    </span>
                    <span className="text-3xl font-extrabold text-primary">
                      <span className="text-lg font-medium">৳</span>{selectedReceipt.paid_amount.toLocaleString('bn-BD')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 italic text-center">
                    {language === 'bn' ? 'কথায়' : 'In words'}: {numberToBanglaWords(selectedReceipt.paid_amount)}
                  </p>
                </div>

                {/* Signature */}
                <div className="mx-5 mt-8 mb-2 flex justify-between gap-8">
                  <div className="flex-1 text-center">
                    <div className="border-t border-border pt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {language === 'bn' ? 'হিসাবরক্ষক / গ্রহণকারী' : 'Accountant / Receiver'}
                    </div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="border-t border-border pt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {language === 'bn' ? 'অভিভাবক / ছাত্র' : 'Guardian / Student'}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center py-4 text-[10px] text-muted-foreground/50">
                  {language === 'bn' ? 'এটি কম্পিউটার জেনারেটেড রসিদ' : 'This is a computer-generated receipt'}
                </div>

                {/* Action Buttons */}
                <div className="px-5 pb-6 flex gap-3">
                  <Button
                    className="flex-1 rounded-xl bg-primary/90 backdrop-blur-sm hover:bg-primary text-primary-foreground font-semibold"
                    onClick={() => void handleDownload(selectedReceipt)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {language === 'bn' ? 'ডাউনলোড' : 'Download PDF'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl backdrop-blur-sm border-border/60 font-semibold"
                    onClick={() => handlePrint(selectedReceipt)}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    {language === 'bn' ? 'প্রিন্ট' : 'Print'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-4">
              <Button variant="ghost" onClick={() => setSelectedReceipt(null)} className="text-muted-foreground">
                ← {language === 'bn' ? 'তালিকায় ফিরুন' : 'Back to list'}
              </Button>
            </div>
          </div>
        ) : (
          /* Receipt Table */
          <div className="card-elevated overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      {language === 'bn' ? 'রসিদ নং' : 'Receipt #'}
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      {language === 'bn' ? 'ছাত্র' : 'Student'}
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">
                      {language === 'bn' ? 'ফি' : 'Fee'}
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      {language === 'bn' ? 'পরিমাণ' : 'Amount'}
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      {language === 'bn' ? 'অ্যাকশন' : 'Action'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">
                      {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
                    </td></tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12">
                      <Receipt className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">{language === 'bn' ? 'কোনো রসিদ পাওয়া যায়নি' : 'No receipts found'}</p>
                    </td></tr>
                  ) : filteredPayments.map((p) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{p.receipt_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{p.student_name}</div>
                        <div className="text-xs text-muted-foreground">{p.class_name} • {language === 'bn' ? 'রোল' : 'Roll'}: {p.roll}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{p.fee_type}</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">৳{p.paid_amount.toLocaleString('bn-BD')}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" className="text-primary hover:text-primary" onClick={() => setSelectedReceipt(p)}>
                            <Receipt className="w-4 h-4 mr-1" />
                            {language === 'bn' ? 'রসিদ' : 'View'}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-success hover:text-success" onClick={() => handlePrint(p)} title={language === 'bn' ? 'প্রিন্ট' : 'Print'}>
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between">
    <span className="text-[11px] uppercase tracking-[1.5px] text-muted-foreground font-medium">{label}</span>
    <span className="text-sm font-semibold text-foreground">{typeof value === 'string' ? value : value}</span>
  </div>
);

export default AdminFeeReceipts;
