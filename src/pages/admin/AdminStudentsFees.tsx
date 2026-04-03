import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { CreditCard, Loader2, CheckCircle, ArrowRight, ExternalLink, Search, User, Banknote, Globe, AlertCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import FeeReceiptDownload from '@/components/fees/FeeReceiptDownload';

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const { checkApproval } = useApprovalCheck('/admin/students-fees', 'payments');
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

  // Check if payment gateway is configured
  const { data: gatewayConfig } = useQuery({
    queryKey: ['payment_gateway_config_check'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payment_gateway_config')
        .select('id, provider, provider_name, is_enabled')
        .eq('is_enabled', true)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
  const isGatewayReady = !!gatewayConfig;

  // Get logged-in user's staff/profile name for collector
  const { data: collectorName = '' } = useQuery({
    queryKey: ['collector_name', user?.id],
    queryFn: async () => {
      if (!user?.id) return '';
      // Try staff table first
      const { data: staffData } = await supabase
        .from('staff')
        .select('name_bn, name_en')
        .eq('user_id', user.id)
        .maybeSingle();
      if (staffData) return staffData.name_bn || staffData.name_en || '';
      // Fallback to profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      return profile?.full_name || user.email || '';
    },
    enabled: !!user?.id,
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
      const payload = {
        fee_type: feeType,
        amount: parseFloat(amount),
        transaction_id: txnId,
        status: isCash ? 'pending' : 'pending',
        student_id: foundStudent.id,
        payer_name: foundStudent.name_bn,
        payment_method: isCash ? 'cash' : 'online',
        notes: `${bn ? 'আদায়কারী' : 'Collector'}: ${collectorName} | Reg: ${foundStudent.registration_no || ''}, Roll: ${foundStudent.roll_number || ''}${isCash ? ' | Cash Payment' : ''}`,
      };

      // Check if approval is needed
      if (await checkApproval('add', payload, undefined, `${bn ? 'ফি আদায়' : 'Fee Collection'}: ৳${amount} - ${foundStudent.name_bn}`)) {
        return txnId;
      }

      const { error } = await supabase.from('payments').insert(payload);
      if (error) throw error;
      return txnId;
    },
    onSuccess: async (txnId) => {
      setStep('done');
      if (paymentMethod === 'cash') {
        toast.success(bn ? 'ক্যাশ পেমেন্ট সফলভাবে সংরক্ষিত হয়েছে (অনুমোদনের অপেক্ষায়)' : 'Cash payment saved (awaiting approval)');
      } else {
        // Call process-payment edge function
        try {
          const { data, error } = await supabase.functions.invoke('process-payment', {
            body: {
              action: 'initiate',
              amount: parseFloat(amount),
              student_id: foundStudent?.id,
              fee_type_id: feeType,
            },
          });
          if (error) throw error;
          if (data?.payment_url) {
            toast.success(bn ? 'পেমেন্ট গেটওয়েতে রিডাইরেক্ট হচ্ছে...' : 'Redirecting to payment gateway...');
            setTimeout(() => window.open(data.payment_url, '_blank'), 1000);
          } else {
            toast.success(bn ? 'পেমেন্ট সংরক্ষিত হয়েছে' : 'Payment saved');
          }
        } catch (e: any) {
          toast.error(bn ? 'গেটওয়ে ত্রুটি, পেমেন্ট পেন্ডিং আছে' : 'Gateway error, payment is pending');
        }
      }
    },
    onError: (e: any) => toast.error(e.message || 'Error saving payment'),
  });

  const handleProceed = () => {
    if (!feeType) { toast.error(bn ? 'ফি ধরন নির্বাচন করুন' : 'Select fee type'); return; }
    if (!foundStudent) { toast.error(bn ? 'প্রথমে ছাত্র খুঁজুন' : 'Search student first'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { toast.error(bn ? 'সঠিক পরিমাণ দিন' : 'Enter valid amount'); return; }
    if (paymentMethod === 'online' && !isGatewayReady) {
      toast.error(bn ? 'প্রথমে পেমেন্ট গেটওয়ে সেটআপ করুন' : 'Please setup payment gateway first');
      return;
    }
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

              {/* Payment Method */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {bn ? 'পেমেন্ট পদ্ধতি' : 'Payment Method'} <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${paymentMethod === 'cash' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/40'}`}>
                    <Banknote className="w-5 h-5" />
                    {bn ? 'ক্যাশ পেমেন্ট' : 'Cash Payment'}
                  </button>
                  <button onClick={() => setPaymentMethod('online')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${paymentMethod === 'online' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/40'}`}>
                    <Globe className="w-5 h-5" />
                    {bn ? 'অনলাইন পেমেন্ট' : 'Online Payment'}
                  </button>
                </div>

                {/* Online payment gateway status */}
                {paymentMethod === 'online' && !isGatewayReady && (
                  <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                      <span className="text-sm font-medium text-warning">
                        {bn ? 'পেমেন্ট গেটওয়ে সেটআপ করা হয়নি' : 'Payment gateway not configured'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {bn
                        ? 'অনলাইন পেমেন্ট ব্যবহার করতে প্রথমে পেমেন্ট গেটওয়ে (bKash, Nagad, SSLCommerz ইত্যাদি) সেটআপ করুন।'
                        : 'To accept online payments, configure a payment gateway (bKash, Nagad, SSLCommerz, etc.) first.'}
                    </p>
                    <Button variant="outline" size="sm" className="mt-1" onClick={() => navigate('/admin/settings')}>
                      <Settings className="w-3.5 h-3.5 mr-1.5" />
                      {bn ? 'গেটওয়ে সেটআপ করুন' : 'Setup Gateway'}
                    </Button>
                  </div>
                )}

                {paymentMethod === 'online' && isGatewayReady && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground">
                      {bn ? `${gatewayConfig?.provider_name || gatewayConfig?.provider} গেটওয়ে সক্রিয়` : `${gatewayConfig?.provider_name || gatewayConfig?.provider} gateway active`}
                    </span>
                  </div>
                )}
              </div>

              {/* Collector name display for cash */}
              {paymentMethod === 'cash' && collectorName && (
                <div className="bg-accent/50 border border-accent rounded-lg p-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">
                    <strong>{bn ? 'আদায়কারী' : 'Collector'}:</strong> {collectorName}
                  </span>
                </div>
              )}

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
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{bn ? 'পেমেন্ট পদ্ধতি' : 'Payment Method'}</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  {paymentMethod === 'cash' ? <><Banknote className="w-4 h-4" /> {bn ? 'ক্যাশ' : 'Cash'}</> : <><Globe className="w-4 h-4" /> {bn ? 'অনলাইন' : 'Online'}</>}
                </span>
              </div>
              {paymentMethod === 'cash' && collectorName && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{bn ? 'আদায়কারী' : 'Collector'}</span>
                  <span className="font-semibold text-foreground">{collectorName}</span>
                </div>
              )}
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
                {paymentMethod === 'cash' ? <Banknote className="w-4 h-4 mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                {paymentMethod === 'cash' ? (bn ? 'ক্যাশ পরিশোধ নিশ্চিত করুন' : 'Confirm Cash Payment') : (bn ? 'নিশ্চিত করুন ও পরিশোধ করুন' : 'Confirm & Pay')}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="card-elevated p-6 text-center space-y-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${paymentMethod === 'cash' ? 'bg-primary/10' : 'bg-primary/10'}`}>
              {paymentMethod === 'cash' ? <Banknote className="w-8 h-8 text-primary" /> : <CheckCircle className="w-8 h-8 text-primary" />}
            </div>
            <h3 className="font-display font-bold text-foreground text-lg">
              {paymentMethod === 'cash'
                ? (bn ? 'ক্যাশ পেমেন্ট সম্পন্ন!' : 'Cash Payment Complete!')
                : (bn ? 'পেমেন্ট সংরক্ষিত!' : 'Payment Saved!')}
            </h3>
            {paymentMethod === 'cash' && (
              <p className="text-sm text-muted-foreground font-medium">
                {bn ? 'অনুমোদনের অপেক্ষায় রয়েছে' : 'Awaiting admin approval'}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {bn ? 'ট্রানজেকশন আইডি:' : 'Transaction ID:'}
            </p>
            <div className="bg-secondary/50 rounded-lg px-4 py-3 font-mono text-lg font-bold text-foreground">
              {transactionId}
            </div>
            {paymentMethod === 'online' && (
              <p className="text-xs text-muted-foreground">
                {bn ? 'পেমেন্ট গেটওয়েতে রিডাইরেক্ট হচ্ছে...' : 'Redirecting to payment gateway...'}
                <ExternalLink className="w-3 h-3 inline ml-1" />
              </p>
            )}
            <Button variant="outline" onClick={handleReset} className="mt-4">
              {bn ? 'নতুন পেমেন্ট' : 'New Payment'}
            </Button>
          </div>
        )}

        {/* Receipt Download Section */}
        <FeeReceiptDownload collectorName={collectorName} />
      </div>
    </AdminLayout>
  );
};

export default AdminStudentsFees;
