import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { CreditCard, Loader2, CheckCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation } from '@tanstack/react-query';

type FeeType = 'admission_fee' | 'monthly_fee' | 'exam_fee';

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

const AdminStudentsFees = () => {
  const { language } = useLanguage();
  const [feeType, setFeeType] = useState<FeeType | ''>('');
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'form' | 'summary' | 'done'>('form');
  const [transactionId, setTransactionId] = useState('');

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!feeType || !studentId || !amount) throw new Error('All fields are required');
      const txnId = generateTransactionId();
      setTransactionId(txnId);
      const { error } = await supabase.from('payments').insert({
        fee_type: feeType,
        amount: parseFloat(amount),
        transaction_id: txnId,
        status: 'pending',
        payer_name: `Student #${studentId}`,
        notes: `Student ID: ${studentId}`,
      });
      if (error) throw error;
      return txnId;
    },
    onSuccess: (txnId) => {
      setStep('done');
      toast.success(language === 'bn' ? 'পেমেন্ট সফলভাবে সংরক্ষিত হয়েছে' : 'Payment saved successfully');
      // Redirect to gateway after short delay
      setTimeout(() => {
        window.open(`https://payment-gateway.example.com/pay?txn=${txnId}&amount=${amount}`, '_blank');
      }, 1500);
    },
    onError: (e: any) => toast.error(e.message || 'Error saving payment'),
  });

  const handleProceed = () => {
    if (!feeType) { toast.error(language === 'bn' ? 'ফি ধরন নির্বাচন করুন' : 'Select fee type'); return; }
    if (!studentId || isNaN(Number(studentId))) { toast.error(language === 'bn' ? 'সঠিক স্টুডেন্ট আইডি দিন' : 'Enter valid Student ID'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { toast.error(language === 'bn' ? 'সঠিক পরিমাণ দিন' : 'Enter valid amount'); return; }
    setStep('summary');
  };

  const handleReset = () => {
    setStep('form');
    setFeeType('');
    setStudentId('');
    setAmount('');
    setTransactionId('');
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" />
          {language === 'bn' ? 'ছাত্র ফি পরিশোধ' : 'Student Fee Payment'}
        </h1>

        {/* Step 1: Form */}
        {step === 'form' && (
          <div className="card-elevated p-6 space-y-5">
            <h3 className="font-display font-semibold text-foreground text-lg">
              {language === 'bn' ? 'পেমেন্ট তথ্য দিন' : 'Enter Payment Details'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  {language === 'bn' ? 'ফি ধরন' : 'Fee Type'} <span className="text-destructive">*</span>
                </label>
                <Select value={feeType} onValueChange={(v) => setFeeType(v as FeeType)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={language === 'bn' ? 'ফি ধরন নির্বাচন করুন' : 'Select Fee Type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(feeTypeLabels) as FeeType[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {language === 'bn' ? feeTypeLabels[key].bn : feeTypeLabels[key].en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  {language === 'bn' ? 'স্টুডেন্ট আইডি' : 'Student ID'} <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  className="bg-background"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder={language === 'bn' ? 'স্টুডেন্ট আইডি নম্বর' : 'Enter Student ID number'}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  {language === 'bn' ? 'পরিমাণ (৳)' : 'Amount (৳)'} <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  className="bg-background"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="৳ 0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <Button onClick={handleProceed} className="btn-primary-gradient w-full mt-2">
              <ArrowRight className="w-4 h-4 mr-2" />
              {language === 'bn' ? 'পরিশোধে এগিয়ে যান' : 'Proceed to Pay'}
            </Button>
          </div>
        )}

        {/* Step 2: Payment Summary */}
        {step === 'summary' && (
          <div className="card-elevated p-6 space-y-5">
            <h3 className="font-display font-semibold text-foreground text-lg">
              {language === 'bn' ? 'পেমেন্ট সারাংশ' : 'Payment Summary'}
            </h3>

            <div className="bg-secondary/30 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{language === 'bn' ? 'ফি ধরন' : 'Fee Type'}</span>
                <span className="font-semibold text-foreground">
                  {feeType && (language === 'bn' ? feeTypeLabels[feeType].bn : feeTypeLabels[feeType].en)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{language === 'bn' ? 'স্টুডেন্ট আইডি' : 'Student ID'}</span>
                <span className="font-semibold text-foreground">{studentId}</span>
              </div>
              <div className="border-t border-border my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">{language === 'bn' ? 'মোট পরিমাণ' : 'Total Amount'}</span>
                <span className="text-xl font-bold text-primary">৳ {parseFloat(amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
                {language === 'bn' ? 'পরিবর্তন করুন' : 'Edit'}
              </Button>
              <Button onClick={() => payMutation.mutate()} className="btn-primary-gradient flex-1" disabled={payMutation.isPending}>
                {payMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                <CheckCircle className="w-4 h-4 mr-1" />
                {language === 'bn' ? 'নিশ্চিত করুন ও পরিশোধ করুন' : 'Confirm & Pay'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 'done' && (
          <div className="card-elevated p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-display font-bold text-foreground text-lg">
              {language === 'bn' ? 'পেমেন্ট সংরক্ষিত!' : 'Payment Saved!'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === 'bn' ? 'আপনার ট্রানজেকশন আইডি:' : 'Your Transaction ID:'}
            </p>
            <div className="bg-secondary/50 rounded-lg px-4 py-3 font-mono text-lg font-bold text-foreground">
              {transactionId}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'bn'
                ? 'পেমেন্ট গেটওয়েতে রিডাইরেক্ট হচ্ছে...'
                : 'Redirecting to payment gateway...'}
              <ExternalLink className="w-3 h-3 inline ml-1" />
            </p>
            <Button variant="outline" onClick={handleReset} className="mt-4">
              {language === 'bn' ? 'নতুন পেমেন্ট' : 'New Payment'}
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminStudentsFees;
