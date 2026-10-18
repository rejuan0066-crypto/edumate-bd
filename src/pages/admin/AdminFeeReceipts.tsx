import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { CheckCircle2, Download, Printer, Receipt, Search, Calendar, Building2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { numberToBanglaWords, toBanglaDigits, toBanglaMonth } from '@/lib/amountInWords';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { generateReceiptQrDataUrl } from '@/lib/receiptQr';
import { bnToEn, enToBn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { isAdminRole } from '@/lib/roles';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ReceiptData {
  id: string;
  receipt_number: string;
  student_name: string;
  father_name?: string;
  student_id: string;
  student_uuid: string;
  fee_type_id: string;
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
  const queryClient = useQueryClient();
  const { user, role } = useAuth();
  const { canDeleteItem } = usePagePermissions('/admin/fee-receipts');
  const canDelete = isAdminRole(role) || canDeleteItem;
  const [searchRoll, setSearchRoll] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [deletingReceipt, setDeletingReceipt] = useState<ReceiptData | null>(null);

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
          students!inner(name_bn, name_en, father_name, father_name_en, student_id, roll_number, class_id, division_id, classes:class_id(name, name_bn), divisions:division_id(name, name_bn)),
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
        father_name: p.students?.father_name || p.students?.father_name_en || '',
        student_id: p.students?.student_id || '',
        student_uuid: p.student_id,
        fee_type_id: p.fee_type_id,
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

  const deleteReceiptMutation = useMutation({
    mutationFn: async () => {
      if (!canDelete) {
        throw new Error(language === 'bn' ? 'রসিদ মুছে ফেলার অনুমতি নেই' : 'No permission to delete receipt');
      }
      if (!deletingReceipt) return;

      // 1. Delete from fee_payments
      const { error: feeErr } = await supabase
        .from('fee_payments')
        .delete()
        .eq('id', deletingReceipt.id);
      if (feeErr) throw feeErr;

      // 2. Delete matching payment from payments table
      try {
        if (deletingReceipt.receipt_number && deletingReceipt.student_uuid) {
          const { data: matchedPayments } = await supabase
            .from('payments')
            .select('id')
            .eq('student_id', deletingReceipt.student_uuid)
            .or(`transaction_id.eq."${deletingReceipt.receipt_number}",notes.ilike."%${deletingReceipt.receipt_number}%"`);

          if (matchedPayments && matchedPayments.length > 0) {
            const pIds = matchedPayments.map((p: any) => p.id);
            await supabase.from('payments').delete().in('id', pIds);
          } else {
            // Fallback match by student_id and amount
            const { data: fallbackPayments } = await supabase
              .from('payments')
              .select('id')
              .eq('student_id', deletingReceipt.student_uuid)
              .eq('amount', deletingReceipt.paid_amount)
              .order('created_at', { ascending: false })
              .limit(1);

            if (fallbackPayments && fallbackPayments.length > 0) {
              await supabase.from('payments').delete().eq('id', fallbackPayments[0].id);
            }
          }
        }
      } catch (err) {
        console.warn('Payments sync delete error:', err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-payments-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['fee_payments'] });
      queryClient.invalidateQueries({ queryKey: ['existing_payment_check'] });
      queryClient.invalidateQueries({ queryKey: ['student_fee_payments_status'] });
      queryClient.invalidateQueries({ queryKey: ['student-fee-payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-fee-payments'] });
      queryClient.invalidateQueries({ queryKey: ['dues-fee-payments'] });
      queryClient.invalidateQueries({ queryKey: ['dues_students'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-fees'] });
      queryClient.invalidateQueries({ queryKey: ['ledger_fees'] });
      queryClient.invalidateQueries({ queryKey: ['fee-payments-public'] });
      queryClient.invalidateQueries({ queryKey: ['fee-types-summary'] });

      toast.success(
        language === 'bn'
          ? 'রসিদ ও পেমেন্ট রেকর্ড সফলভাবে মুছে ফেলা হয়েছে এবং স্ট্যাটাস আনপেইড (বকেয়া) করা হয়েছে।'
          : 'Receipt & payment deleted successfully and reverted to unpaid.'
      );
      setDeletingReceipt(null);
      if (selectedReceipt?.id === deletingReceipt?.id) {
        setSelectedReceipt(null);
      }
    },
    onError: (e: any) => toast.error(e.message),
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
    const isBn = language === 'bn';
    const amountWords = numberToBanglaWords(receipt.paid_amount);
    const amountBn = toBanglaDigits(receipt.paid_amount.toLocaleString());
    const dateBn = receipt.paid_at ? new Date(receipt.paid_at).toLocaleDateString('bn-BD') : '-';
    const monthLabel = isBn ? toBanglaMonth(receipt.month) : (receipt.month || '-');
    const yearLabel = receipt.year ? (isBn ? toBanglaDigits(String(receipt.year)) : String(receipt.year)) : '-';
    const rollLabel = isBn && receipt.roll ? toBanglaDigits(String(receipt.roll)) : (receipt.roll || '-');
    const studentIdLabel = isBn && receipt.student_id ? toBanglaDigits(String(receipt.student_id)) : (receipt.student_id || '-');
    const logoTag = institution?.logo_url ? `<img src="${institution.logo_url}" style="height:36px; width:36px; object-fit:contain;" />` : '';

    return `
      <td class="receipt-cell">
        <div class="receipt-shell">
          <div class="copy-label">${copyLabel}</div>

          <div class="header">
            <div class="brand-row">
              <div class="logo-wrap">${logoTag}</div>
              <div class="brand-text">
                <div class="inst-name">${institution?.name || (isBn ? 'প্রতিষ্ঠানের নাম' : 'Institution Name')}</div>
                ${!isBn && institution?.name_en ? `<div class="inst-name-en">${institution.name_en}</div>` : (institution?.name_en ? `<div class="inst-name-en">${institution.name_en}</div>` : '')}
                <div class="inst-meta">
                  ${institution?.address || ''}
                  ${institution?.phone ? ` | ${isBn ? 'ফোন:' : 'Phone:'} ${isBn ? toBanglaDigits(institution.phone) : institution.phone}` : ''}
                  ${institution?.email ? ` | ${isBn ? 'ইমেইল:' : 'Email:'} ${institution.email}` : ''}
                </div>
              </div>
            </div>
          </div>

          <div class="receipt-title">
            <div class="receipt-title-bn">${isBn ? 'মানি রিসিট' : 'Money Receipt'}</div>
            ${!isBn ? `<div class="receipt-title-en">MONEY RECEIPT</div>` : ''}
          </div>

          <div class="receipt-body">
            <div class="info-grid">
              <span class="lbl">${isBn ? 'রসিদ নং:' : 'Receipt No:'}</span>
              <span class="val font-mono">${receipt.receipt_number}</span>
              <span class="lbl">${isBn ? 'তারিখ:' : 'Date:'}</span>
              <span class="val">${dateBn}</span>
              <span class="lbl">${isBn ? 'স্ট্যাটাস:' : 'Status:'}</span>
              <span class="val"><span class="badge">✓ ${isBn ? 'পরিশোধিত' : 'Paid'}</span></span>
            </div>

            <div class="divider"></div>

            <div class="info-grid">
              <span class="lbl">${isBn ? 'ছাত্রের নাম:' : 'Student Name:'}</span>
              <span class="val">${receipt.student_name || '-'}</span>
              <span class="lbl">${isBn ? 'পিতার নাম:' : "Father's Name:"}</span>
              <span class="val">${receipt.father_name || '-'}</span>
              <span class="lbl">${isBn ? 'ছাত্র আইডি:' : 'Student ID:'}</span>
              <span class="val font-mono">${studentIdLabel}</span>
              <span class="lbl">${isBn ? 'শ্রেণী:' : 'Class:'}</span>
              <span class="val">${receipt.class_name || '-'}</span>
              <span class="lbl">${isBn ? 'রোল নম্বর:' : 'Roll No:'}</span>
              <span class="val">${rollLabel}</span>
            </div>

            <div class="divider"></div>

            <div class="info-grid">
              <span class="lbl">${isBn ? 'ফি এর ধরন:' : 'Fee Type:'}</span>
              <span class="val">${receipt.fee_type}</span>
              <span class="lbl">${isBn ? 'মাস:' : 'Month:'}</span>
              <span class="val">${monthLabel}</span>
              <span class="lbl">${isBn ? 'বছর:' : 'Year:'}</span>
              <span class="val">${yearLabel}</span>
            </div>

            <div class="amount-box">
              <div class="figure"><span class="taka">৳</span> ${amountBn}</div>
              <div class="words">${isBn ? `কথায়: ${amountWords}` : `In Words: ${amountWords}`}</div>
            </div>

            <div class="signature-section">
              <div class="signature-block">
                <div class="collector-name">${receipt.collected_by || (institution as any)?.collector_name || (institution as any)?.principal_name || '-'}</div>
                <div class="signature-line"></div>
                <div class="signature-title">${isBn ? 'আদায়কারী' : 'Collector'}</div>
                ${!isBn ? `<div class="signature-sub">Collector</div>` : ''}
              </div>
              ${!isStudentCopy ? `<div class="signature-block">
                <div class="collector-name">${receipt.approved_by || (institution as any)?.principal_name || receipt.collected_by || '-'}</div>
                <div class="signature-line"></div>
                <div class="signature-title">${isBn ? 'গ্রহণকারী' : 'Receiver'}</div>
                ${!isBn ? `<div class="signature-sub">Receiver</div>` : ''}
              </div>` : ''}
            </div>
          </div>

          <div class="receipt-footer">
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="height:50px;width:50px;float:right;margin-left:6px;border:1px solid #d1fae5;border-radius:4px;padding:2px;background:#fff;" />` : ''}
            <p>${isBn ? 'কম্পিউটার জেনারেটেড মানি রিসিট' : 'Computer Generated Money Receipt'}</p>
            ${qrDataUrl ? `<p style="font-size:8.5px;color:#059669;margin-top:2px;">${isBn ? '🔒 যাচাই করতে QR স্ক্যান করুন' : '🔒 Scan QR to verify'}</p>` : ''}
          </div>
        </div>
      </td>`;
  };

  const getReceiptHtml = (receipt: ReceiptData, qrDataUrl: string | null = null) => {
    const isBn = language === 'bn';
    const officeLabel = isBn ? '📋 অফিস কপি' : '📋 Office Copy';
    const studentLabel = isBn ? '🎓 ছাত্র কপি' : '🎓 Student Copy';
    const officeCopy = buildReceiptBlock(receipt, officeLabel, false, qrDataUrl);
    const studentCopy = buildReceiptBlock(receipt, studentLabel, true, qrDataUrl);

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${isBn ? 'মানি রিসিট' : 'Money Receipt'} - ${receipt.receipt_number}</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif;
        background: #eef7f4;
        color: #0f172a;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      .page {
        width: 297mm;
        min-height: 200mm;
        max-height: 208mm;
        padding: 4mm 5mm;
        background: #ffffff;
        margin: 0 auto;
        box-sizing: border-box;
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
        font-size: 11px;
        padding: 0 2px;
      }
      .receipt-shell {
        border: 2px solid #059669;
        border-radius: 6px;
        background: #ffffff;
        overflow: hidden;
      }
      .copy-label {
        background: #065f46;
        color: #ffffff;
        text-align: center;
        padding: 3.5px 8px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1px;
      }
      .header {
        background: linear-gradient(180deg, #065f46 0%, #059669 100%);
        padding: 12px 14px 10px;
        color: #ffffff;
      }
      .brand-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }
      .logo-wrap {
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.28);
        border-radius: 4px;
      }
      .brand-text { text-align: center; }
      .inst-name {
        font-size: 16px;
        font-weight: 800;
        line-height: 1.2;
      }
      .inst-name-en {
        margin-top: 2px;
        font-size: 11px;
        font-weight: 600;
        opacity: 0.95;
      }
      .inst-meta {
        margin-top: 4px;
        font-size: 8.5px;
        line-height: 1.35;
        opacity: 0.95;
      }
      .receipt-title {
        text-align: center;
        background: #eefaf5;
        border-top: 1px solid #a7f3d0;
        border-bottom: 1px solid #a7f3d0;
        padding: 5px 0;
      }
      .receipt-title-bn {
        font-size: 16px;
        font-weight: 800;
        color: #064e3b;
        line-height: 1.1;
      }
      .receipt-title-en {
        margin-top: 2px;
        font-size: 9.5px;
        letter-spacing: 2px;
        color: #6b7280;
      }
      .receipt-body {
        padding: 10px 14px 8px;
      }
      .info-grid {
        display: grid;
        grid-template-columns: 88px 1fr;
        gap: 4px 6px;
      }
      .lbl {
        font-size: 10.5px;
        font-weight: 700;
        color: #1f2937;
      }
      .val {
        font-size: 11px;
        font-weight: 700;
        color: #0f172a;
        border-bottom: 1px dotted #cbd5e1;
        padding-bottom: 1px;
      }
      .divider {
        border-top: 1px dashed #86efac;
        margin: 7px 0;
      }
      .badge {
        display: inline-block;
        background: #dcfce7;
        color: #047857;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 9.5px;
        font-weight: 700;
      }
      .amount-box {
        margin-top: 8px;
        border: 1.5px solid #10b981;
        background: linear-gradient(90deg, #effcf6 0%, #d9fbe8 100%);
        border-radius: 6px;
        text-align: center;
        padding: 7px 6px;
      }
      .figure {
        font-size: 24px;
        font-weight: 800;
        color: #065f46;
        line-height: 1;
      }
      .taka {
        font-size: 16px;
      }
      .words {
        margin-top: 4px;
        font-size: 10px;
        font-weight: 700;
        color: #166534;
      }
      .signature-section {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        margin-top: 18px;
      }
      .signature-block {
        flex: 1;
        text-align: center;
      }
      .collector-name {
        font-size: 11px;
        font-weight: 700;
        color: #065f46;
        margin-bottom: 3px;
        min-height: 14px;
      }
      .signature-line {
        border-top: 1.5px solid #1f2937;
        margin-bottom: 4px;
      }
      .signature-title {
        font-size: 9.5px;
        font-weight: 700;
        color: #1f2937;
      }
      .signature-sub {
        margin-top: 1px;
        font-size: 8.5px;
        color: #6b7280;
      }
      .receipt-footer {
        text-align: center;
        background: #eefaf5;
        border-top: 1px solid #d1fae5;
        padding: 5px 8px;
      }
      .receipt-footer p {
        font-size: 8.5px;
        color: #6b7280;
      }
      @media print {
        @page {
          size: A4 landscape;
          margin: 0;
        }
        html, body {
          width: 297mm;
          height: 210mm;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          overflow: hidden !important;
        }
        .page {
          width: 297mm !important;
          max-width: 297mm !important;
          height: 210mm !important;
          max-height: 210mm !important;
          margin: 0 !important;
          padding: 3mm 4mm !important;
          box-shadow: none !important;
          page-break-inside: avoid;
          break-inside: avoid;
        }
      }
      @media screen {
        body { padding: 12px; }
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
                  {canDelete && (
                    <Button
                      variant="destructive"
                      className="rounded-xl font-semibold"
                      onClick={() => setDeletingReceipt(selectedReceipt)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {language === 'bn' ? 'ডিলিট' : 'Delete'}
                    </Button>
                  )}
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
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingReceipt(p)}
                              title={language === 'bn' ? 'ডিলিট করুন' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Dialog open={!!deletingReceipt} onOpenChange={(open) => !open && setDeletingReceipt(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                {language === 'bn' ? 'রসিদ ও পেমেন্ট ডিলিট নিশ্চিতকরণ' : 'Confirm Receipt Deletion'}
              </DialogTitle>
              <DialogDescription>
                {language === 'bn'
                  ? `আপনি কি নিশ্চিত যে রসিদ #${deletingReceipt?.receipt_number} মুছে ফেলতে চান? এটি মুছে ফেললে সকল রিপোর্ট ও ড্যাশবোর্ড থেকে পেমেন্টটি বাদ যাবে এবং ফি-টি পুনরায় বকেয়া (আনপেইড) হিসেবে দেখাবে।`
                  : `Are you sure you want to delete receipt #${deletingReceipt?.receipt_number}? This will remove it from all reports and revert the fee to unpaid.`}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeletingReceipt(null)}>
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteReceiptMutation.isPending}
                onClick={() => deleteReceiptMutation.mutate()}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                {language === 'bn' ? 'হ্যাঁ, ডিলিট করুন' : 'Yes, Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
