import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer } from 'lucide-react';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';

interface ExpenseVoucherPrintProps {
  expense: any;
  open: boolean;
  onClose: () => void;
}

const ExpenseVoucherPrint = ({ expense, open, onClose }: ExpenseVoucherPrintProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const { data: institution } = useQuery({
    queryKey: ['voucher-institution'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
  });

  if (!expense) return null;

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
  const getMethod = (desc: string) => desc?.match(/\[method:(.*?)\]/)?.[1] || 'ক্যাশ';
  const fmt = (n: number) => `৳${n.toLocaleString('en-IN')}`;

  const handlePrint = () => {
    const printContent = document.getElementById('expense-voucher-content');
    if (!printContent) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Voucher</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Noto Sans Bengali', sans-serif; padding: 20px; color: #1e293b; }
      @media print { body { padding: 10px; } }
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
            {institution?.logo_url && (
              <img src={institution.logo_url} alt="Logo" className="w-14 h-14 mx-auto mb-2 object-contain" />
            )}
            <h2 className="text-lg font-bold">{institution?.name || 'প্রতিষ্ঠান'}</h2>
            {institution?.name_en && <p className="text-sm text-gray-500">{institution.name_en}</p>}
            {institution?.address && <p className="text-xs text-gray-500">{institution.address}</p>}
            {institution?.phone && <p className="text-xs text-gray-500">{bn ? 'ফোন' : 'Phone'}: {institution.phone}</p>}
            <div className="mt-2 inline-block bg-emerald-100 text-emerald-800 text-sm font-bold px-4 py-1 rounded-full">
              {bn ? 'হিসাব ভাউচার' : 'EXPENSE VOUCHER'}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-2 text-sm mb-4">
            <div><span className="text-gray-500">{bn ? 'ভাউচার নং:' : 'Voucher #:'}</span> <strong>{expense.id?.slice(0, 8).toUpperCase()}</strong></div>
            <div className="text-right"><span className="text-gray-500">{bn ? 'তারিখ:' : 'Date:'}</span> <strong>{expense.expense_date}</strong></div>
            <div><span className="text-gray-500">{bn ? 'প্রকল্প:' : 'Project:'}</span> <strong>{bn ? expense.expense_institutions?.name_bn : expense.expense_institutions?.name}</strong></div>
            <div className="text-right"><span className="text-gray-500">{bn ? 'ক্যাটেগরি:' : 'Category:'}</span> <strong>{bn ? expense.expense_categories?.name_bn : expense.expense_categories?.name}</strong></div>
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
                <td className="border border-gray-300 px-2 py-1.5 text-center">{expense.quantity || 1}{getUnit(expense.description) ? ` ${getUnit(expense.description)}` : ''}</td>
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

          {expense.month_year && (
            <p className="text-xs text-gray-500 mb-4">{bn ? 'মাস' : 'Period'}: {expense.month_year}</p>
          )}

          {/* Signature lines */}
          <div className="flex justify-between mt-12 pt-2 text-xs text-gray-600">
            <div className="text-center min-w-[120px]">
              {institution?.accountant_name && (
                <div className="font-semibold text-gray-900 text-xs mb-0.5">{institution.accountant_name}</div>
              )}
              <div className="border-t border-gray-400 pt-1">{bn ? 'ক্যাশিয়ার / প্রস্তুতকারী' : 'Cashier / Prepared By'}</div>
            </div>
            <div className="text-center min-w-[120px]">
              {institution?.verifier_name && (
                <div className="font-semibold text-gray-900 text-xs mb-0.5">{institution.verifier_name}</div>
              )}
              <div className="border-t border-gray-400 pt-1">{bn ? 'যাচাইকারী / নিরীক্ষক' : 'Verified By / Auditor'}</div>
            </div>
            <div className="text-center min-w-[120px]">
              {institution?.principal_name && (
                <div className="font-semibold text-gray-900 text-xs mb-0.5">{institution.principal_name}</div>
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
