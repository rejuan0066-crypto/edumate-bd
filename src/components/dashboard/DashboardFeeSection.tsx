import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, ChevronDown, ChevronUp, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type FeeCategory = 'monthly' | 'exam' | 'admission';

interface FeeSectionProps {
  category: FeeCategory;
  titleBn: string;
  titleEn: string;
  icon?: React.ReactNode;
}

const DashboardFeeSection = ({ category, titleBn, titleEn, icon }: FeeSectionProps) => {
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [listType, setListType] = useState<'paid' | 'unpaid'>('paid');

  const { data: payments = [] } = useQuery({
    queryKey: ['dashboard-fee-payments', category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fee_payments')
        .select('*, students(name_bn, roll_number, division_id, divisions(name_bn)), fee_types(name_bn, fee_category, name)')
        .eq('fee_types.fee_category', category)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).filter((p: any) => p.fee_types?.fee_category === category);
    },
  });

  // Group by month/exam/year
  const groups = payments.reduce((acc: any, p: any) => {
    let key = '';
    if (category === 'monthly') key = p.month || 'N/A';
    else if (category === 'exam') key = p.fee_types?.name_bn || p.fee_types?.name || 'N/A';
    else key = `${p.year || 'N/A'}`;

    if (!acc[key]) acc[key] = { label: key, total: 0, paid: [], unpaid: [] };
    const amount = p.paid_amount || p.amount || 0;
    if (p.status === 'paid') {
      acc[key].paid.push(p);
      acc[key].total += Number(amount);
    } else {
      acc[key].unpaid.push(p);
    }
    return acc;
  }, {});

  const groupList = Object.values(groups) as any[];
  const totalAmount = groupList.reduce((s: number, g: any) => s + g.total, 0);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !selectedGroup) return;
    const list = listType === 'paid' ? selectedGroup.paid : selectedGroup.unpaid;
    const sorted = [...list].sort((a: any, b: any) => {
      const divA = a.students?.divisions?.name_bn || '';
      const divB = b.students?.divisions?.name_bn || '';
      if (divA !== divB) return divA.localeCompare(divB);
      return (a.students?.roll_number || '').localeCompare(b.students?.roll_number || '');
    });

    printWindow.document.write(`<html><head><title>Print</title><style>
      body{font-family:Arial,sans-serif;padding:20px}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}
      th{background:#f5f5f5}
      h2{margin:0}
    </style></head><body>
      <h2>${language === 'bn' ? titleBn : titleEn} - ${selectedGroup.label}</h2>
      <p>${listType === 'paid' ? (language === 'bn' ? 'পরিশোধিত তালিকা' : 'Paid List') : (language === 'bn' ? 'অপরিশোধিত তালিকা' : 'Unpaid List')}</p>
      <table><thead><tr>
        <th>#</th><th>${language === 'bn' ? 'নাম' : 'Name'}</th><th>${language === 'bn' ? 'রোল' : 'Roll'}</th>
        <th>${language === 'bn' ? 'বিভাগ' : 'Division'}</th>
        ${category === 'monthly' ? `<th>${language === 'bn' ? 'মাস' : 'Month'}</th>` : ''}
        ${category === 'exam' ? `<th>${language === 'bn' ? 'পরীক্ষা' : 'Exam'}</th>` : ''}
        <th>${language === 'bn' ? 'সেশন' : 'Year'}</th>
        <th>${listType === 'paid' ? (language === 'bn' ? 'পরিশোধিত' : 'Paid') : (language === 'bn' ? 'স্ট্যাটাস' : 'Status')}</th>
      </tr></thead><tbody>
      ${sorted.map((p: any, i: number) => `<tr>
        <td>${i + 1}</td>
        <td>${p.students?.name_bn || '-'}</td>
        <td>${p.students?.roll_number || '-'}</td>
        <td>${p.students?.divisions?.name_bn || '-'}</td>
        ${category === 'monthly' ? `<td>${p.month || '-'}</td>` : ''}
        ${category === 'exam' ? `<td>${p.fee_types?.name_bn || '-'}</td>` : ''}
        <td>${p.year || '-'}</td>
        <td>${listType === 'paid' ? `৳ ${p.paid_amount || p.amount}` : (language === 'bn' ? 'অপরিশোধিত' : 'Unpaid')}</td>
      </tr>`).join('')}
      </tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadCSV = () => {
    if (!selectedGroup) return;
    const list = listType === 'paid' ? selectedGroup.paid : selectedGroup.unpaid;
    const sorted = [...list].sort((a: any, b: any) => {
      const divA = a.students?.divisions?.name_bn || '';
      const divB = b.students?.divisions?.name_bn || '';
      if (divA !== divB) return divA.localeCompare(divB);
      return (a.students?.roll_number || '').localeCompare(b.students?.roll_number || '');
    });

    const headers = [language === 'bn' ? 'নাম' : 'Name', language === 'bn' ? 'রোল' : 'Roll', language === 'bn' ? 'বিভাগ' : 'Division', language === 'bn' ? 'সেশন' : 'Year', listType === 'paid' ? (language === 'bn' ? 'পরিশোধিত' : 'Amount') : (language === 'bn' ? 'স্ট্যাটাস' : 'Status')];
    const rows = sorted.map((p: any) => [
      p.students?.name_bn || '-', p.students?.roll_number || '-', p.students?.divisions?.name_bn || '-', p.year || '-',
      listType === 'paid' ? (p.paid_amount || p.amount) : (language === 'bn' ? 'অপরিশোধিত' : 'Unpaid')
    ]);
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category}_${selectedGroup.label}_${listType}.csv`;
    a.click();
  };

  return (
    <div className="card-elevated p-4">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon || <CreditCard className="w-5 h-5 text-primary" />}
          <h3 className="font-display font-bold text-foreground">{language === 'bn' ? titleBn : titleEn}</h3>
          <span className="text-sm font-bold text-primary">৳ {totalAmount.toLocaleString()}</span>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-2">
          {groupList.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{language === 'bn' ? 'কোনো রেকর্ড নেই' : 'No records'}</p>}
          {groupList.map((g: any, i: number) => (
            <div key={i}
              onClick={() => setSelectedGroup(g)}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
              <span className="text-sm font-medium text-foreground">{g.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-success">{language === 'bn' ? 'পরিশোধিত' : 'Paid'}: {g.paid.length}</span>
                <span className="text-xs text-destructive">{language === 'bn' ? 'অপরিশোধিত' : 'Unpaid'}: {g.unpaid.length}</span>
                <span className="font-bold text-primary text-sm">৳ {g.total.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedGroup} onOpenChange={() => setSelectedGroup(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === 'bn' ? titleBn : titleEn} - {selectedGroup?.label}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setListType('paid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${listType === 'paid' ? 'bg-success text-success-foreground' : 'bg-success/10 text-success'}`}>
              {language === 'bn' ? 'পরিশোধিত' : 'Paid'} ({selectedGroup?.paid?.length || 0})
            </button>
            <button onClick={() => setListType('unpaid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${listType === 'unpaid' ? 'bg-destructive text-destructive-foreground' : 'bg-destructive/10 text-destructive'}`}>
              {language === 'bn' ? 'অপরিশোধিত' : 'Unpaid'} ({selectedGroup?.unpaid?.length || 0})
            </button>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" />{language === 'bn' ? 'প্রিন্ট' : 'Print'}</Button>
              <Button size="sm" variant="outline" onClick={handleDownloadCSV}><Download className="w-4 h-4 mr-1" />{language === 'bn' ? 'ডাউনলোড' : 'Download'}</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'নাম' : 'Name'}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'রোল' : 'Roll'}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'বিভাগ' : 'Division'}</th>
                  {category === 'monthly' && <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'মাস' : 'Month'}</th>}
                  {category === 'exam' && <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'পরীক্ষা সেশন' : 'Exam Session'}</th>}
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'সেশন' : 'Year'}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{listType === 'paid' ? (language === 'bn' ? 'পরিশোধিত' : 'Amount') : (language === 'bn' ? 'স্ট্যাটাস' : 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {((() => {
                  const list = listType === 'paid' ? (selectedGroup?.paid || []) : (selectedGroup?.unpaid || []);
                  return [...list].sort((a: any, b: any) => {
                    const divA = a.students?.divisions?.name_bn || '';
                    const divB = b.students?.divisions?.name_bn || '';
                    if (divA !== divB) return divA.localeCompare(divB);
                    return (a.students?.roll_number || '').localeCompare(b.students?.roll_number || '');
                  });
                })()).map((p: any, i: number) => (
                  <tr key={p.id} className="hover:bg-secondary/30">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{p.students?.name_bn || '-'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.students?.roll_number || '-'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.students?.divisions?.name_bn || '-'}</td>
                    {category === 'monthly' && <td className="px-3 py-2 text-muted-foreground">{p.month || '-'}</td>}
                    {category === 'exam' && <td className="px-3 py-2 text-muted-foreground">{p.fee_types?.name_bn || '-'}</td>}
                    <td className="px-3 py-2 text-muted-foreground">{p.year || '-'}</td>
                    <td className="px-3 py-2">
                      {listType === 'paid' ? (
                        <span className="font-bold text-success">৳ {p.paid_amount || p.amount}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">{language === 'bn' ? 'অপরিশোধিত' : 'Unpaid'}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {((listType === 'paid' ? selectedGroup?.paid : selectedGroup?.unpaid) || []).length === 0 && (
                  <tr><td colSpan={8} className="text-center py-6 text-muted-foreground">{language === 'bn' ? 'কোনো রেকর্ড নেই' : 'No records'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardFeeSection;
