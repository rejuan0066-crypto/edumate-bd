import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Smartphone, CreditCard, Building, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import ManualPaymentMethods from '@/components/ManualPaymentMethods';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';

const generateDonationTrxId = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `DON-${y}${m}${d}-${rand}`;
};

const DonationPage = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    amount: '',
    purpose: '',
    paymentMethod: '',
  });
  const [manualMethod, setManualMethod] = useState('');
  const [manualTrxId, setManualTrxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [trxId, setTrxId] = useState('');

  const updateField = (key: string, value: string) => setForm(p => ({ ...p, [key]: value }));

  const { data: gateways = [] } = useQuery({
    queryKey: ['public-payment-gateways'],
    queryFn: async () => {
      const { data } = await supabase.from('payment_gateway_config').select('provider, provider_name, is_enabled').eq('is_enabled', true);
      return data || [];
    },
  });

  const { data: manualMethods = [] } = useQuery({
    queryKey: ['public-manual-payment-methods'],
    queryFn: async () => {
      const { data } = await supabase.from('manual_payment_methods').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: institution } = useQuery({
    queryKey: ['institution-donation-public'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
  });

  const hasGateway = gateways.length > 0;
  const hasManualMethods = manualMethods.length > 0;

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.amount || !form.paymentMethod) {
      toast.error(bn ? 'নাম, পরিমাণ ও পদ্ধতি আবশ্যক' : 'Name, amount & method required');
      return;
    }

    if (form.paymentMethod === 'mobile_manual' && !manualTrxId) {
      toast.error(bn ? 'ট্রানজেকশন আইডি আবশ্যক' : 'Transaction ID required');
      return;
    }

    setIsSubmitting(true);
    try {
      const txId = generateDonationTrxId();

      if (form.paymentMethod === 'online' && hasGateway) {
        const { data, error } = await supabase.functions.invoke('process-payment', {
          body: {
            amount: parseFloat(form.amount),
            fee_type: 'donation',
            payer_name: form.name,
            payer_phone: form.phone,
            payer_email: form.email,
            transaction_id: txId,
            purpose: form.purpose || 'General Donation',
            callback_url: window.location.origin + '/donation?status=success',
          },
        });

        if (error) throw new Error(bn ? 'পেমেন্ট গেটওয়ে ত্রুটি' : 'Payment gateway error');

        if (data?.redirect_url) {
          await supabase.from('donors').insert({
            name_bn: form.name,
            phone: form.phone || null,
            donation_amount: parseFloat(form.amount),
            donation_type: 'অনলাইন',
            purpose: form.purpose || null,
            status: 'active',
            notes: `TrxID: ${txId} | Online Payment | Pending`,
          });
          window.location.href = data.redirect_url;
          return;
        }
      }

      // Manual mobile banking or cash/bank
      const donationType = form.paymentMethod === 'mobile_manual'
        ? manualMethod || 'মোবাইল ব্যাংকিং'
        : form.paymentMethod === 'bank'
        ? 'ব্যাংক'
        : 'নগদ';

      const notes = form.paymentMethod === 'mobile_manual'
        ? `TrxID: ${manualTrxId} | ${manualMethod} | Manual`
        : `TrxID: ${txId} | ${form.paymentMethod}`;

      // Insert into payments table for approval workflow
      if (form.paymentMethod === 'mobile_manual') {
        await supabase.from('payments').insert({
          transaction_id: manualTrxId,
          amount: parseFloat(form.amount),
          fee_type: 'donation',
          payer_name: form.name,
          payer_phone: form.phone || null,
          payer_email: form.email || null,
          status: 'pending',
          payment_method: manualMethod,
          notes: form.purpose || null,
        });
      }

      await supabase.from('donors').insert({
        name_bn: form.name,
        phone: form.phone || null,
        donation_amount: parseFloat(form.amount),
        donation_type: donationType,
        purpose: form.purpose || null,
        status: 'active',
        notes,
      });

      setTrxId(form.paymentMethod === 'mobile_manual' ? manualTrxId : txId);
      setIsDone(true);
      toast.success(bn ? 'দানের জন্য ধন্যবাদ!' : 'Thank you for your donation!');
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 max-w-lg text-center">
          <div className="card-elevated p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/20 mx-auto flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              {bn ? 'জাযাকাল্লাহু খাইরান!' : 'Thank You!'}
            </h2>
            <p className="text-muted-foreground">
              {bn
                ? form.paymentMethod === 'mobile_manual'
                  ? 'আপনার দান অনুমোদনের জন্য অপেক্ষমাণ রয়েছে।'
                  : 'আপনার দান সফলভাবে রেকর্ড করা হয়েছে।'
                : form.paymentMethod === 'mobile_manual'
                ? 'Your donation is pending approval.'
                : 'Your donation has been recorded successfully.'}
            </p>
            <div className="bg-secondary/50 rounded-lg p-3 text-sm">
              <span className="text-muted-foreground">{bn ? 'ট্রানজেকশন আইডি:' : 'Transaction ID:'}</span>
              <span className="font-mono font-bold text-foreground ml-2">{trxId}</span>
            </div>
            <Button onClick={() => { setIsDone(false); setForm({ name: '', phone: '', email: '', amount: '', purpose: '', paymentMethod: '' }); setManualTrxId(''); setManualMethod(''); }} variant="outline">
              {bn ? 'আবার দান করুন' : 'Donate Again'}
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-accent/20 mx-auto mb-4 flex items-center justify-center">
            <Heart className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            {bn ? 'দান করুন' : 'Make a Donation'}
          </h1>
          <p className="text-muted-foreground">
            {bn ? 'আপনার দান ছাত্রদের শিক্ষার জন্য ব্যবহৃত হবে' : 'Your donation will be used for student education'}
          </p>
          {institution && (
            <p className="text-xs text-muted-foreground mt-1">{bn ? institution.name : (institution.name_en || institution.name)}</p>
          )}
        </div>

        <form className="space-y-6" onSubmit={handleDonate}>
          <div className="card-elevated p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-foreground">{bn ? 'আপনার নাম' : 'Your Name'} *</Label>
                <Input className="bg-background mt-1" value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">{bn ? 'মোবাইল নম্বর' : 'Mobile Number'}</Label>
                <Input className="bg-background mt-1" type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">{bn ? 'পরিমাণ (৳)' : 'Amount (৳)'} *</Label>
                <Input type="number" className="bg-background mt-1" value={form.amount} onChange={(e) => updateField('amount', e.target.value)} required placeholder="1000" />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">{bn ? 'উদ্দেশ্য / বাবদ' : 'Purpose'}</Label>
                <Input className="bg-background mt-1" value={form.purpose} onChange={(e) => updateField('purpose', e.target.value)} placeholder={bn ? 'মসজিদ নির্মাণ, শিক্ষা...' : 'Building, education...'} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm font-medium text-foreground">{bn ? 'পেমেন্ট পদ্ধতি' : 'Payment Method'} *</Label>
                <Select value={form.paymentMethod} onValueChange={(v) => { updateField('paymentMethod', v); if (v !== 'mobile_manual') { setManualMethod(''); setManualTrxId(''); } }} required>
                  <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select method'} /></SelectTrigger>
                  <SelectContent>
                    {hasGateway && (
                      <SelectItem value="online">{bn ? '💳 অনলাইন পেমেন্ট (গেটওয়ে)' : '💳 Online Payment (Gateway)'}</SelectItem>
                    )}
                    {hasManualMethods && (
                      <SelectItem value="mobile_manual">{bn ? '📱 মোবাইল ব্যাংকিং (বিকাশ/নগদ/রকেট)' : '📱 Mobile Banking (bKash/Nagad/Rocket)'}</SelectItem>
                    )}
                    <SelectItem value="manual">{bn ? '🏦 ম্যানুয়াল (ক্যাশ)' : '🏦 Manual (Cash)'}</SelectItem>
                    <SelectItem value="bank">{bn ? '🏛️ ব্যাংক ট্রান্সফার' : '🏛️ Bank Transfer'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Manual Mobile Banking Section */}
            {form.paymentMethod === 'mobile_manual' && (
              <ManualPaymentMethods
                transactionId={manualTrxId}
                onTransactionIdChange={setManualTrxId}
                selectedMethod={manualMethod}
                onMethodSelect={setManualMethod}
              />
            )}

            {/* Gateway warning */}
            {!hasGateway && !hasManualMethods && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {bn ? 'অনলাইন পেমেন্ট গেটওয়ে এখনো সেটআপ হয়নি। আপাতত ম্যানুয়াল বা ব্যাংক ট্রান্সফার ব্যবহার করুন।' : 'Online payment gateway not configured yet. Use manual or bank transfer for now.'}
                </p>
              </div>
            )}
          </div>

          {/* Payment Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-elevated p-4 text-center">
              <Smartphone className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">{bn ? 'মোবাইল ব্যাংকিং' : 'Mobile Banking'}</p>
              <p className="text-xs text-muted-foreground mt-1">bKash / Nagad / Rocket</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <CreditCard className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">{bn ? 'কার্ড পেমেন্ট' : 'Card Payment'}</p>
              <p className="text-xs text-muted-foreground mt-1">Visa / Mastercard</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <Building className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">{bn ? 'ব্যাংক ট্রান্সফার' : 'Bank Transfer'}</p>
              <p className="text-xs text-muted-foreground mt-1">{bn ? 'সরাসরি' : 'Direct'}</p>
            </div>
          </div>

          <Button type="submit" className="btn-primary-gradient w-full text-lg py-6" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Heart className="w-5 h-5 mr-2" />}
            {bn ? 'দান করুন' : 'Donate Now'}
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
};

export default DonationPage;
