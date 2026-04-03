import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { CreditCard, Loader2, CheckCircle, ArrowRight, ExternalLink, Search, User, Banknote, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery } from '@tanstack/react-query';

type FeeType = 'admission_fee' | 'monthly_fee' | 'exam_fee';
type PaymentMethod = 'cash' | 'online';

const feeTypeLabels: Record<FeeType, { bn: string; en: string }> = {
  admission_fee: { bn: 'ভর্তি ফি', en: 'Admission Fee' },
  monthly_fee: { bn: 'মাসিক ফি', en: 'Monthly Fee' },
  exam_fee: { bn: 'পরীক্ষা ফি', en: 'Exam Fee' },
};

const generateTransactionId = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `STU-${y}${m}${d}-${rand}`;
};

type SearchMode = 'registration' | 'session_roll';

const AdminStudentsFees = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [feeType, setFeeType] = useState<FeeType | ''>('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [step, setStep] = useState<'form' | 'summary' | 'done'>('form');
  const [transactionId, setTransactionId] = useState('');

  // Student search
  const [searchMode, setSearchMode] = useState<SearchMode>('registration');
  const [regNo, setRegNo] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [foundStudent, setFoundStudent] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const { data: sessions = [] } = useQuery({
    queryKey: ['academic_sessions_fee'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_sessions').select('*').eq('is_active', true).order('name');
      return data || [];
    },
  });

  const searchStudent = async () => {
    setSearching(true);
    setFoundStudent(null);
    try {
      let query = supabase.from('students').select('*, divisions(name_bn, name)').eq('status', 'active');

      if (searchMode === 'registration') {
        if (!regNo.trim()) { toast.error(bn ? 'রেজিস্ট্রেশন নম্বর দিন' : 'Enter registration number'); return; }
        query = query.eq('registration_no', regNo.trim());
      } else {
        if (!selectedSession || !rollNumber.trim()) { toast.error(bn ? 'সেশন ও রোল নম্বর দিন' : 'Enter session & roll'); return; }
        const session = sessions.find((s: any) => s.id === selectedSession);
        query = query.eq('admission_session', session?.name || '').eq('roll_number', rollNumber.trim());
      }

      const { data, error } = await query.limit(1).maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error(bn ? 'ছাত্র পাওয়া যায়নি' : 'Student not found');
        return;
      }
      setFoundStudent(data);
      toast.success(bn ? 'ছাত্র পাওয়া গেছে' : 'Student found');
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setSearching(false);
    }
  };

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!feeType || !foundStudent || !amount) throw new Error('All fields are required');
      const txnId = generateTransactionId();
      setTransactionId(txnId);
      const isCash = paymentMethod === 'cash';
      const { error } = await supabase.from('payments').insert({
        fee_type: feeType,
        amount: parseFloat(amount),
        transaction_id: txnId,
        status: isCash ? 'success' : 'pending',
        student_id: foundStudent.id,
        payer_name: foundStudent.name_bn,
        payment_method: isCash ? 'cash' : 'online',
        notes: `Reg: ${foundStudent.registration_no || ''}, Roll: ${foundStudent.roll_number || ''}${isCash ? ' | Cash Payment' : ''}`,
      });
      if (error) throw error;
      return txnId;
    },
    onSuccess: (txnId) => {
      setStep('done');
      if (paymentMethod === 'cash') {
        toast.success(bn ? 'ক্যাশ পেমেন্ট সফলভাবে সংরক্ষিত হয়েছে' : 'Cash payment saved successfully');
      } else {
        toast.success(bn ? 'পেমেন্ট সফলভাবে সংরক্ষিত হয়েছে' : 'Payment saved successfully');
        setTimeout(() => {
          window.open(`https://payment-gateway.example.com/pay?txn=${txnId}&amount=${amount}`, '_blank');
        }, 1500);
      }
    },
    onError: (e: any) => toast.error(e.message || 'Error saving payment'),
  });

  const handleProceed = () => {
    if (!feeType) { toast.error(bn ? 'ফি ধরন নির্বাচন করুন' : 'Select fee type'); return; }
    if (!foundStudent) { toast.error(bn ? 'প্রথমে ছাত্র খুঁজুন' : 'Search student first'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { toast.error(bn ? 'সঠিক পরিমাণ দিন' : 'Enter valid amount'); return; }
    setStep('summary');
  };

  const handleReset = () => {
    setStep('form');
    setFeeType('');
    setAmount('');
    setPaymentMethod('cash');
    setTransactionId('');
    setFoundStudent(null);
    setRegNo('');
    setRollNumber('');
    setSelectedSession('');
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" />
          {bn ? 'ছাত্র ফি পরিশোধ' : 'Student Fee Payment'}
        </h1>

        {step === 'form' && (
          <div className="card-elevated p-6 space-y-5">
            <h3 className="font-display font-semibold text-foreground text-lg">
              {bn ? 'ছাত্র খুঁজুন' : 'Find Student'}
            </h3>

            {/* Search mode toggle */}
            <div className="flex gap-2">
              <button onClick={() => { setSearchMode('registration'); setFoundStudent(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${searchMode === 'registration' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
                {bn ? 'রেজিস্ট্রেশন নম্বর' : 'Registration No'}
              </button>
              <button onClick={() => { setSearchMode('session_roll'); setFoundStudent(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${searchMode === 'session_roll' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
                {bn ? 'সেশন + রোল' : 'Session + Roll'}
              </button>
            </div>

            {/* Search fields */}
            <div className="space-y-3">
              {searchMode === 'registration' ? (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    {bn ? 'রেজিস্ট্রেশন নম্বর' : 'Registration Number'} <span className="text-destructive">*</span>
                  </label>
                  <div className="flex gap-2">
                    <Input className="bg-background flex-1" value={regNo} onChange={(e) => setRegNo(e.target.value)}
                      placeholder={bn ? 'যেমন: 20261001' : 'e.g. 20261001'}
                      onKeyDown={(e) => e.key === 'Enter' && searchStudent()} />
                    <Button onClick={searchStudent} disabled={searching} variant="outline" size="icon">
                      {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      {bn ? 'সেশন' : 'Session'} <span className="text-destructive">*</span>
                    </label>
                    <Select value={selectedSession} onValueChange={setSelectedSession}>
                      <SelectTrigger className="bg-background"><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                      <SelectContent>
                        {sessions.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      {bn ? 'রোল নম্বর' : 'Roll Number'} <span className="text-destructive">*</span>
                    </label>
                    <div className="flex gap-2">
                      <Input className="bg-background flex-1" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)}
                        placeholder={bn ? 'রোল' : 'Roll'}
                        onKeyDown={(e) => e.key === 'Enter' && searchStudent()} />
                      <Button onClick={searchStudent} disabled={searching} variant="outline" size="icon">
                        {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Found student card */}
            {foundStudent && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{foundStudent.name_bn}</p>
                  <p className="text-xs text-muted-foreground">
                    {bn ? 'রোল' : 'Roll'}: {foundStudent.roll_number || '-'} | {bn ? 'রেজি' : 'Reg'}: {foundStudent.registration_no || '-'} | {foundStudent.divisions?.name_bn || ''}
                  </p>
                </div>
                <CheckCircle className="w-5 h-5 text-primary shrink-0" />
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  {bn ? 'ফি ধরন' : 'Fee Type'} <span className="text-destructive">*</span>
                </label>
                <Select value={feeType} onValueChange={(v) => setFeeType(v as FeeType)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={bn ? 'ফি ধরন নির্বাচন করুন' : 'Select Fee Type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(feeTypeLabels) as FeeType[]).map((key) => (
                      <SelectItem key={key} value={key}>{bn ? feeTypeLabels[key].bn : feeTypeLabels[key].en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  {bn ? 'পরিমাণ (৳)' : 'Amount (৳)'} <span className="text-destructive">*</span>
                </label>
                <Input type="number" className="bg-background" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="৳ 0.00" min="0" step="0.01" />
              </div>
            </div>

            <Button onClick={handleProceed} className="btn-primary-gradient w-full mt-2">
              <ArrowRight className="w-4 h-4 mr-2" />
              {bn ? 'পরিশোধে এগিয়ে যান' : 'Proceed to Pay'}
            </Button>
          </div>
        )}

        {step === 'summary' && (
          <div className="card-elevated p-6 space-y-5">
            <h3 className="font-display font-semibold text-foreground text-lg">
              {bn ? 'পেমেন্ট সারাংশ' : 'Payment Summary'}
            </h3>
            <div className="bg-secondary/30 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{bn ? 'ছাত্রের নাম' : 'Student Name'}</span>
                <span className="font-semibold text-foreground">{foundStudent?.name_bn}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{bn ? 'রেজিস্ট্রেশন' : 'Registration'}</span>
                <span className="font-semibold text-foreground">{foundStudent?.registration_no || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{bn ? 'রোল' : 'Roll'}</span>
                <span className="font-semibold text-foreground">{foundStudent?.roll_number || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{bn ? 'ফি ধরন' : 'Fee Type'}</span>
                <span className="font-semibold text-foreground">
                  {feeType && (bn ? feeTypeLabels[feeType].bn : feeTypeLabels[feeType].en)}
                </span>
              </div>
              <div className="border-t border-border my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">{bn ? 'মোট পরিমাণ' : 'Total Amount'}</span>
                <span className="text-xl font-bold text-primary">৳ {parseFloat(amount).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
                {bn ? 'পরিবর্তন করুন' : 'Edit'}
              </Button>
              <Button onClick={() => payMutation.mutate()} className="btn-primary-gradient flex-1" disabled={payMutation.isPending}>
                {payMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                <CheckCircle className="w-4 h-4 mr-1" />
                {bn ? 'নিশ্চিত করুন ও পরিশোধ করুন' : 'Confirm & Pay'}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="card-elevated p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-display font-bold text-foreground text-lg">
              {bn ? 'পেমেন্ট সংরক্ষিত!' : 'Payment Saved!'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {bn ? 'আপনার ট্রানজেকশন আইডি:' : 'Your Transaction ID:'}
            </p>
            <div className="bg-secondary/50 rounded-lg px-4 py-3 font-mono text-lg font-bold text-foreground">
              {transactionId}
            </div>
            <p className="text-xs text-muted-foreground">
              {bn ? 'পেমেন্ট গেটওয়েতে রিডাইরেক্ট হচ্ছে...' : 'Redirecting to payment gateway...'}
              <ExternalLink className="w-3 h-3 inline ml-1" />
            </p>
            <Button variant="outline" onClick={handleReset} className="mt-4">
              {bn ? 'নতুন পেমেন্ট' : 'New Payment'}
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminStudentsFees;
