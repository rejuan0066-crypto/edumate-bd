import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer } from 'lucide-react';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { toBnDigits } from '@/lib/digits';

interface ExpenseVoucherPrintProps {
  expense: any;
  open: boolean;
  onClose: () => void;
}

const ExpenseVoucherPrint = ({ expense, open, onClose }: ExpenseVoucherPrintProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  // Global default institution info (used as fallback)
  const { data: globalInst } = useQuery({
    queryKey: ['voucher-institution'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
  });

  const institutionId = expense?.institution_id || expense?.expense_institutions?.id;
  const categoryId = expense?.category_id || expense?.expense_categories?.id;

  // Specific expense institution query (if present)
  const { data: expInst } = useQuery({
    queryKey: ['voucher-expense-institution', institutionId],
    queryFn: async () => {
      if (!institutionId) return null;
      const { data: ei } = await supabase
        .from('expense_institutions')
        .select('*')
        .eq('id', institutionId)
        .maybeSingle();
      if (ei) return ei;

      const { data: inst } = await supabase
        .from('institutions')
        .select('*')
        .eq('id', institutionId)
        .maybeSingle();
      return inst || null;
    },
    enabled: !!institutionId,
  });

  // Specific category query (fallback if expense record doesn't include it)
  const { data: expCat } = useQuery({
    queryKey: ['voucher-expense-category', categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      const { data } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('id', categoryId)
        .maybeSingle();
      return data || null;
    },
    enabled: !!categoryId && !expense?.expense_categories?.name && !expense?.expense_categories?.name_bn,
  });

  if (!expense) return null;

  // Active institution resolution
  const activeInst = expInst || expense.expense_institutions;
  const isDifferentFromGlobal = institutionId && globalInst?.id && institutionId !== globalInst.id;

  const headerName = bn
    ? (activeInst?.name_bn || activeInst?.name || globalInst?.name || 'প্রতিষ্ঠান')
    : (activeInst?.name || activeInst?.name_bn || globalInst?.name || 'Institution');

  const headerNameEn = (activeInst?.name && activeInst?.name !== activeInst?.name_bn)
    ? activeInst.name
    : isDifferentFromGlobal
      ? ''
      : (globalInst?.name_en || '');

  const headerAddress = activeInst?.address || globalInst?.address || '';
  const headerPhone = activeInst?.phone || globalInst?.phone || '';
  const headerLogo = activeInst?.logo_url || globalInst?.logo_url || '';

  // Active category (used as "প্রকল্প" / Project per user requirement)
  const activeCat = expCat || expense.expense_categories;
  const categoryName = bn
    ? (activeCat?.name_bn || activeCat?.name || '-')
    : (activeCat?.name || activeCat?.name_bn || '-');

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = String(dateStr).trim().split('-');
    if (parts.length === 3) {
      const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
      return bn ? toBnDigits(formatted) : formatted;
    }
    return bn ? toBnDigits(dateStr) : dateStr;
  };

  const formatMonthYear = (myStr: string) => {
    if (!myStr) return '-';
    const monthMap: Record<string, string> = {
      January: 'জানুয়ারি', February: 'ফেব্রুয়ারি', March: 'মার্চ',
      April: 'এপ্রিল', May: 'মে', June: 'জুন',
      July: 'জুলাই', August: 'আগস্ট', September: 'সেপ্টেম্বর',
      October: 'অক্টোবর', November: 'নভেম্বর', December: 'ডিসেম্বর',
    };
    const parts = String(myStr).trim().split('-');
    if (parts.length === 2) {
      const month = parts[0];
      const year = parts[1];
      if (bn) {
        const bnMonth = monthMap[month] || month;
        return `${bnMonth}-${toBnDigits(year)}`;
      }
      return `${month}-${year}`;
    }
    return bn ? toBnDigits(myStr) : myStr;
  };

  const cleanDesc = (desc: string) => (desc || '')
    .replace(/\[unit:.*?\]/g, '')
    .replace(/\[method:.*?\]/g, '')
    .replace(/\[memo:.*?\]/g, '')
    .replace(/\[remarks:.*?\]/g, '')
    .replace(/\[due:.*?\]/g, '')
    .replace(/\[paid_date:.*?\]/g, '')
    .replace(/\[salary_bulk_total\]/g, '')
    .replace(/\[salary_month:.*?\]/g, '')
    .replace(/\[staff_id:.*?\]/g, '')
    .trim() || '-';

  const memo = expense.description?.match(/\[memo:(.*?)\]/)?.[1]?.trim();
  const remarks = expense.description?.match(/\[remarks:(.*?)\]/)?.[1]?.trim();

  const getUnit = (desc: string) => {
    const match = desc?.match(/\[unit:(.*?)\]/)?.[1];
    if (match !== undefined) {
      if (match === 'none' || match === 'ফাঁকা' || match === '-' || match === 'none_unit') return '';
      return match;
    }
    if (desc && /বেতন|salary|সম্মানী|honorarium|শিক্ষক-স্টাফ/i.test(desc)) {
      if (desc.includes('জন')) return 'জন';
      return '';
    }
    return 'পিস';
  };

  const getMethod = (desc: string) => {
    const m = desc?.match(/\[method:(.*?)\]/)?.[1] || 'ক্যাশ';
    if (!bn) return m;
    const lower = m.toLowerCase().trim();
    if (lower === 'cash' || lower === 'ক্যাশ') return 'ক্যাশ';
    if (lower === 'bank' || lower === 'ব্যাংক') return 'ব্যাংক';
    if (lower === 'cheque' || lower === 'check' || lower === 'চেক') return 'চেক';
    if (lower === 'bkash' || lower === 'বিকাশ') return 'বিকাশ';
    if (lower === 'nagad' || lower === 'নগদ') return 'নগদ';
    return m;
  };

  const fmt = (n: number) => {
    const val = n.toLocaleString('en-US');
    return `৳${bn ? toBnDigits(val) : val}`;
  };

  const handlePrint = () => {
    const printContent = document.getElementById('expense-voucher-content');
    if (!printContent) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${bn ? 'হিসাব ভাউচার' : 'Expense Voucher'}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Noto Sans Bengali', sans-serif; padding: 24px; color: #1e293b; background: #fff; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-left { text-align: left; }
      .font-bold { font-weight: 700; }
      .font-semibold { font-weight: 600; }
      .border-b-2 { border-bottom: 2px solid #1e293b; }
      .border-t { border-top: 1px solid #94a3b8; }
      .pb-3 { padding-bottom: 12px; }
      .mb-4 { margin-bottom: 16px; }
      .mb-3 { margin-bottom: 12px; }
      .mb-2 { margin-bottom: 8px; }
      .mb-1 { margin-bottom: 4px; }
      .mb-0\\.5 { margin-bottom: 2px; }
      .mt-2 { margin-top: 8px; }
      .mt-12 { margin-top: 48px; }
      .pt-1 { padding-top: 4px; }
      .pt-2 { padding-top: 8px; }
      .text-lg { font-size: 18px; }
      .text-sm { font-size: 14px; }
      .text-xs { font-size: 12px; }
      .text-gray-500 { color: #64748b; }
      .text-gray-600 { color: #475569; }
      .text-gray-900 { color: #0f172a; }
      .text-emerald-700 { color: #047857; }
      .text-emerald-800 { color: #065f46; }
      .bg-emerald-50 { background-color: #ecfdf5; }
      .bg-emerald-100 { background-color: #d1fae5; }
      .bg-gray-50 { background-color: #f8fafc; }
      .bg-gray-100 { background-color: #f1f5f9; }
      .rounded { border-radius: 6px; }
      .rounded-lg { border-radius: 8px; }
      .rounded-full { border-radius: 9999px; }
      .p-2 { padding: 8px; }
      .p-6 { padding: 24px; }
      .px-4 { padding-left: 16px; padding-right: 16px; }
      .py-1 { padding-top: 4px; padding-bottom: 4px; }
      .px-2 { padding-left: 8px; padding-right: 8px; }
      .py-1\\.5 { padding-top: 6px; padding-bottom: 6px; }
      .inline-block { display: inline-block; }
      .grid { display: grid; }
      .grid-cols-2 { display: grid; grid-template-columns: 1fr 1fr; }
      .gap-2 { gap: 8px; }
      .space-y-0\\.5 > * + * { margin-top: 2px; }
      .flex { display: flex; }
      .justify-between { justify-content: space-between; }
      .min-w-\\[120px\\] { min-width: 120px; }
      .w-14 { width: 56px; }
      .h-14 { height: 56px; }
      .mx-auto { margin-left: auto; margin-right: auto; }
      .object-contain { object-fit: contain; }
      .border { border: 1px solid #e2e8f0; }
      .border-gray-200 { border-color: #e2e8f0; }
      .border-gray-300 { border-color: #cbd5e1; }
      .border-gray-400 { border-color: #94a3b8; }
      .border-gray-800 { border-color: #1e293b; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th, td { border: 1px solid #cbd5e1; padding: 6px 8px; }
      @media print {
        body { padding: 10px; }
        @page { margin: 12mm; }
      }
    </style></head><body>${printContent.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{bn ? 'হিসাব ভাউচার' : 'Expense Voucher'}</DialogTitle>
        </DialogHeader>
        <div id="expense-voucher-content" className="bg-white text-gray-900 p-6 rounded-lg border">
          {/* Header */}
          <div className="text-center border-b-2 border-gray-800 pb-3 mb-4">
            {headerLogo && (
              <img src={headerLogo} alt="Logo" className="w-14 h-14 mx-auto mb-2 object-contain" />
            )}
            <h2 className="text-lg font-bold">{headerName}</h2>
            {headerNameEn && <p className="text-sm text-gray-500">{headerNameEn}</p>}
            {headerAddress && <p className="text-xs text-gray-500">{headerAddress}</p>}
            {headerPhone && <p className="text-xs text-gray-500">{bn ? 'ফোন' : 'Phone'}: {headerPhone}</p>}
            <div className="mt-2 inline-block bg-emerald-100 text-emerald-800 text-sm font-bold px-4 py-1 rounded-full">
              {bn ? 'হিসাব ভাউচার' : 'EXPENSE VOUCHER'}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-2 text-sm mb-4">
            <div>
              <span className="text-gray-500">{bn ? 'ভাউচার নং:' : 'Voucher #:'}</span>{' '}
              <strong>{expense.id?.slice(0, 8).toUpperCase()}</strong>
            </div>
            <div className="text-right">
              <span className="text-gray-500">{bn ? 'তারিখ:' : 'Date:'}</span>{' '}
              <strong>{formatDate(expense.expense_date)}</strong>
            </div>
            <div>
              <span className="text-gray-500">{bn ? 'প্রকল্প:' : 'Project:'}</span>{' '}
              <strong>{categoryName}</strong>
            </div>
            <div className="text-right">
              <span className="text-gray-500">{bn ? 'মাস:' : 'Month:'}</span>{' '}
              <strong>{formatMonthYear(expense.month_year)}</strong>
            </div>
          </div>

          {/* Main table */}
          <table className="w-full border-collapse text-sm mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1.5 text-left">{bn ? 'বিবরণ' : 'Description'}</th>
                <th className="border border-gray-300 px-2 py-1.5 text-center">{bn ? 'পরিমাণ' : 'Qty'}</th>
                <th className="border border-gray-300 px-2 py-1.5 text-center">{bn ? 'মাধ্যম' : 'Method'}</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right">{bn ? 'টাকা' : 'Amount'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-1.5">{cleanDesc(expense.description)}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center">
                  {bn ? toBnDigits(expense.quantity || 1) : (expense.quantity || 1)}
                  {getUnit(expense.description) ? ` ${getUnit(expense.description)}` : ''}
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-center">{getMethod(expense.description)}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right font-bold">{fmt(Number(expense.amount))}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-emerald-50">
                <td colSpan={3} className="border border-gray-300 px-2 py-1.5 text-right font-bold">{bn ? 'মোট:' : 'Total:'}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right font-bold text-emerald-700">{fmt(Number(expense.amount))}</td>
              </tr>
            </tfoot>
          </table>

          {/* Memo & Remarks (if present) */}
          {(memo || remarks) && (
            <div className="text-xs text-gray-600 mb-3 space-y-0.5 bg-gray-50 p-2 rounded border border-gray-200">
              {memo && (
                <div>
                  <span className="font-semibold text-gray-500">{bn ? 'মেমো / বিল নং:' : 'Memo / Bill #:'}</span>{' '}
                  {bn ? toBnDigits(memo) : memo}
                </div>
              )}
              {remarks && (
                <div>
                  <span className="font-semibold text-gray-500">{bn ? 'মন্তব্য:' : 'Remarks:'}</span>{' '}
                  {remarks}
                </div>
              )}
            </div>
          )}

          {/* Signature lines */}
          <div className="flex justify-between mt-12 pt-2 text-xs text-gray-600">
            <div className="text-center min-w-[120px]">
              {globalInst?.accountant_name && (
                <div className="font-semibold text-gray-900 text-xs mb-0.5">{globalInst.accountant_name}</div>
              )}
              <div className="border-t border-gray-400 pt-1">{bn ? 'ক্যাশিয়ার / প্রস্তুতকারী' : 'Cashier / Prepared By'}</div>
            </div>
            <div className="text-center min-w-[120px]">
              {globalInst?.verifier_name && (
                <div className="font-semibold text-gray-900 text-xs mb-0.5">{globalInst.verifier_name}</div>
              )}
              <div className="border-t border-gray-400 pt-1">{bn ? 'যাচাইকারী / নিরীক্ষক' : 'Verified By / Auditor'}</div>
            </div>
            <div className="text-center min-w-[120px]">
              {globalInst?.principal_name && (
                <div className="font-semibold text-gray-900 text-xs mb-0.5">{globalInst.principal_name}</div>
              )}
              <div className="border-t border-gray-400 pt-1">{bn ? 'মুহতামিম / অধ্যক্ষ' : 'Principal / Authorized By'}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-3">
          <Button onClick={handlePrint} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Printer className="w-4 h-4" />
            {bn ? 'প্রিন্ট করুন' : 'Print Voucher'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseVoucherPrint;
