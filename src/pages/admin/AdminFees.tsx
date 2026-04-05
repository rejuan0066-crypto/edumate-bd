import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { CreditCard, Printer, CheckCircle, Clock, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { usePagePermissions } from '@/hooks/usePagePermissions';

type FeeTab = 'admission' | 'monthly' | 'exam';

const AdminFees = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { checkApproval } = useApprovalCheck('/admin/fees', 'fee_payments');
  const { canAddItem, canEditItem } = usePagePermissions('/admin/fees');
  const [tab, setTab] = useState<FeeTab>('monthly');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMonth, setPaymentMonth] = useState('');
  const [showList, setShowList] = useState(false);
  const [listType, setListType] = useState<'paid' | 'unpaid'>('paid');
  const [selectedFeeType, setSelectedFeeType] = useState('');

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-for-fees', selectedDivision],
    queryFn: async () => {
      let q = supabase.from('students').select('*, divisions(name_bn)').eq('status', 'active');
      if (selectedDivision) q = q.eq('division_id', selectedDivision);
      const { data, error } = await q.order('roll_number');
      if (error) throw error;
      return data;
    },
  });

  // Fee waivers for selected student
  const { data: studentWaivers = [] } = useQuery({
    queryKey: ['fee_waivers', selectedStudent],
    queryFn: async () => {
      if (!selectedStudent) return [];
      const { data, error } = await supabase.from('fee_waivers').select('*').eq('student_id', selectedStudent).eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudent,
  });

  const { data: feeTypes = [] } = useQuery({
    queryKey: ['fee_types', tab],
    queryFn: async () => {
      const { data, error } = await supabase.from('fee_types').select('*').eq('fee_category', tab).eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['fee_payments', selectedDivision, tab, paymentMonth],
    queryFn: async () => {
      let q = supabase.from('fee_payments').select('*, students(name_bn, roll_number, division_id, divisions(name_bn)), fee_types(name_bn, fee_category)');
      if (paymentMonth) q = q.eq('month', paymentMonth);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Check if selected student is free
  const selectedStudentData = students.find((s: any) => s.id === selectedStudent);
  const isFreeStudent = selectedStudentData?.is_free === true;
  const selectedFeeTypeData = feeTypes.find((f: any) => f.id === selectedFeeType);

  // Calculate waiver for selected fee type
  const getWaiverPercent = () => {
    if (isFreeStudent && selectedFeeTypeData?.fee_category === 'monthly') return 100;
    const waiver = studentWaivers.find((w: any) => w.fee_type_id === selectedFeeType);
    return waiver ? Number(waiver.waiver_percent) : 0;
  };

  const waiverPercent = getWaiverPercent();
  const originalAmount = selectedFeeTypeData ? Number(selectedFeeTypeData.amount) : 0;
  const discountAmount = Math.round(originalAmount * waiverPercent / 100);
  const netAmount = originalAmount - discountAmount;

  // Auto-fill amount when fee type changes
  useEffect(() => {
    if (selectedFeeType && selectedFeeTypeData) {
      setPaidAmount(netAmount.toString());
    }
  }, [selectedFeeType, selectedStudent, netAmount]);

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent || !paidAmount || !selectedFeeType) throw new Error('Fill all fields');

      const { data: serialNumber, error: serialErr } = await supabase.rpc('get_next_receipt_serial');
      if (serialErr) throw new Error('Serial number generation failed');

      const payload = {
        student_id: selectedStudent,
        fee_type_id: selectedFeeType,
        amount: originalAmount,
        paid_amount: parseFloat(paidAmount),
        month: paymentMonth || null,
        year: new Date().getFullYear(),
        status: 'paid',
        paid_at: new Date().toISOString(),
        receipt_number: serialNumber,
      };
      if (await checkApproval('add', payload, undefined, `ফি পরিশোধ: ৳${paidAmount}`)) return;
      const { error } = await supabase.from('fee_payments').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee_payments'] });
      setPaidAmount(''); setSelectedStudent('');
      toast.success(language === 'bn' ? 'ফি পরিশোধ সফল' : 'Fee paid successfully');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const tabs: { key: FeeTab; bn: string; en: string; }[] = [
    { key: 'monthly', bn: 'মাসিক ফি', en: 'Monthly Fee' },
    { key: 'exam', bn: 'পরীক্ষা ফি', en: 'Exam Fee' },
    { key: 'admission', bn: 'ভর্তি ফি', en: 'Admission Fee' },
  ];

  const paidPayments = payments.filter((p: any) => p.status === 'paid');
  const unpaidPayments = payments.filter((p: any) => p.status === 'unpaid');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">{language === 'bn' ? 'ফি ব্যবস্থাপনা' : 'Fee Management'}</h1>

        <div className="flex flex-wrap gap-2">
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setShowList(false); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 whitespace-nowrap ${tab === t.key ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
              {language === 'bn' ? t.bn : t.en}
            </button>
          ))}
        </div>

        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            {language === 'bn' ? `${tabs.find(t => t.key === tab)?.bn} পরিশোধ` : `Pay ${tabs.find(t => t.key === tab)?.en}`}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'বিভাগ' : 'Division'}</label>
              <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                <SelectContent>{divisions.map(d => <SelectItem key={d.id} value={d.id}>{language === 'bn' ? d.name_bn : d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'ছাত্র' : 'Student'}</label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                <SelectContent>{students.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.roll_number} - {s.name_bn}
                    {s.is_free ? ` 🟢` : ''}
                  </SelectItem>
                ))}</SelectContent>
              </Select>
              {isFreeStudent && (
                <p className="text-xs mt-1 px-2 py-1 rounded bg-success/10 text-success font-medium">
                  {language === 'bn' ? '✓ বিনা বেতন ছাত্র — মাসিক ফি ১০০% ছাড়' : '✓ Free Student — 100% monthly fee waiver'}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'ফি ধরন' : 'Fee Type'}</label>
              <Select value={selectedFeeType} onValueChange={setSelectedFeeType}>
                <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  {feeTypes.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name_bn} (৳{f.amount})</SelectItem>)}
                  {feeTypes.length === 0 && <SelectItem value="none" disabled>{language === 'bn' ? 'ফি ধরন যোগ করুন' : 'Add fee types first'}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {tab === 'monthly' && (
              <div>
                <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'মাস' : 'Month'}</label>
                <Input type="month" className="bg-background mt-1" value={paymentMonth} onChange={(e) => setPaymentMonth(e.target.value)} />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground">{language === 'bn' ? 'পরিশোধ পরিমাণ' : 'Amount'}</label>
              <Input type="number" className="bg-background mt-1" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="৳" />
              {waiverPercent > 0 && selectedFeeType && (
                <div className="text-xs mt-1 space-y-0.5">
                  <p className="text-muted-foreground">{language === 'bn' ? 'মূল ফি' : 'Original'}: ৳{originalAmount} | {language === 'bn' ? 'ছাড়' : 'Discount'}: ৳{discountAmount} ({waiverPercent}%)</p>
                  <p className="font-semibold text-success">{language === 'bn' ? 'পরিশোধযোগ্য' : 'Payable'}: ৳{netAmount}</p>
                </div>
              )}
            </div>
          </div>
          <Button onClick={() => payMutation.mutate()} className="btn-primary-gradient mt-4" disabled={payMutation.isPending}>
            {payMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {language === 'bn' ? 'পরিশোধ করুন' : 'Pay'}
          </Button>
        </div>

        <div className="card-elevated p-5">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="font-display font-bold text-foreground">{language === 'bn' ? 'পেমেন্ট তালিকা' : 'Payment List'}</h3>
            <div className="flex gap-2">
              <button onClick={() => { setListType('paid'); setShowList(true); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${listType === 'paid' && showList ? 'bg-success text-success-foreground' : 'bg-success/10 text-success'}`}>
                <CheckCircle className="w-3 h-3 inline mr-1" /> {language === 'bn' ? 'পরিশোধিত' : 'Paid'} ({paidPayments.length})
              </button>
              <button onClick={() => { setListType('unpaid'); setShowList(true); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${listType === 'unpaid' && showList ? 'bg-destructive text-destructive-foreground' : 'bg-destructive/10 text-destructive'}`}>
                <Clock className="w-3 h-3 inline mr-1" /> {language === 'bn' ? 'অপরিশোধিত' : 'Unpaid'} ({unpaidPayments.length})
              </button>
            </div>
            {showList && <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" /> {language === 'bn' ? 'প্রিন্ট' : 'Print'}</Button>}
          </div>

          {showList && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'নাম' : 'Name'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'রোল' : 'Roll'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'ফি ধরন' : 'Fee Type'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'পরিমাণ' : 'Amount'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(listType === 'paid' ? paidPayments : unpaidPayments).map((p: any) => (
                    <tr key={p.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-3 font-medium text-foreground">{p.students?.name_bn || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.students?.roll_number || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.fee_types?.name_bn || '-'}</td>
                      <td className="px-4 py-3 font-bold text-foreground">৳ {p.paid_amount || p.amount}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.status === 'paid' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {p.status === 'paid' ? (language === 'bn' ? 'পরিশোধিত' : 'Paid') : (language === 'bn' ? 'অপরিশোধিত' : 'Unpaid')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(listType === 'paid' ? paidPayments : unpaidPayments).length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">{language === 'bn' ? 'কোনো রেকর্ড নেই' : 'No records'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFees;
