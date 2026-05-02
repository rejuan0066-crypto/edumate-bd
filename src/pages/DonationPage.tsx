import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Heart, Smartphone, CreditCard, Building, Loader2, AlertCircle, CheckCircle,
  ChevronRight, ChevronLeft, Globe, Banknote, Download, ShieldCheck, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import ManualPaymentMethods from '@/components/ManualPaymentMethods';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { downloadReceiptAsPdf } from '@/lib/receiptPdfDownload';
import { buildDonationReceiptHtml, type DonationReceiptData } from '@/components/fees/receiptPrintLayouts';
import { dMsg, type Lang } from '@/lib/donationMessages';

// Bengali → English digit conversion
const toEnDigits = (s: string) =>
  s.replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d).toString());

const generateDonationTrxId = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `DON-${y}${m}${d}-${rand}`;
};

const PRESET_AMOUNTS = [500, 1000, 5000];

type PayMode = 'online' | 'manual' | '';

const DonationPage = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const lang: Lang = bn ? 'bn' : 'en';
  const t = (k: Parameters<typeof dMsg>[1], v?: Record<string, string | number>) => dMsg(lang, k, v);

  // Step: 1 = details, 2 = payment selection, 3 = pay (manual or online launch)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    purposeKey: '',
    purposeOther: '',
    amount: '',
  });
  const [payMode, setPayMode] = useState<PayMode>('');
  const [manualMethod, setManualMethod] = useState('');
  const [manualTrxId, setManualTrxId] = useState('');
  const [senderNumber, setSenderNumber] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [result, setResult] = useState<{
    trxId: string;
    status: 'verified' | 'pending';
    donorId?: string;
    receiptNumber?: string | null;
  } | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  // ---- Handle gateway redirect: ?status=success&tran_id=... ----
  // After SSLCommerz/etc. redirects back, we look up the donor row by TrxID
  // and poll briefly for the webhook to flip payment_status to 'verified'.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const tranId =
      params.get('tran_id') || params.get('transaction_id') || params.get('trxId');
    if (status !== 'success' || !tranId) return;

    let cancelled = false;
    const lookup = async (): Promise<boolean> => {
      const { data: donor } = await supabase
        .from('donors')
        .select('id, payment_status, receipt_number, donation_amount')
        .ilike('notes', `%TrxID: ${tranId}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !donor) return false;
      const verified = donor.payment_status === 'verified';
      setResult({
        trxId: tranId,
        status: verified ? 'verified' : 'pending',
        donorId: donor.id,
        receiptNumber: donor.receipt_number ?? null,
      });
      setIsDone(true);
      // Clean URL so refresh doesn't re-trigger
      window.history.replaceState({}, '', '/donation');
      if (verified) {
        toast.success(t('paymentVerified'));
        return true;
      }
      return false;
    };

    (async () => {
      // Poll up to 10× over ~20s waiting for webhook to verify.
      for (let i = 0; i < 10; i++) {
        const done = await lookup();
        if (cancelled || done) return;
        await new Promise((r) => setTimeout(r, 2000));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (key: keyof typeof form, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  // ---- Data ----
  const { data: gateways = [] } = useQuery({
    queryKey: ['public-payment-gateways'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payment_gateway_config')
        .select('provider, provider_name, is_enabled')
        .eq('is_enabled', true);
      return data || [];
    },
  });

  const { data: manualMethods = [] } = useQuery({
    queryKey: ['public-manual-payment-methods'],
    queryFn: async () => {
      const { data } = await supabase
        .from('manual_payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      return data || [];
    },
  });

  const { data: purposes = [] } = useQuery({
    queryKey: ['donation-purposes-public'],
    queryFn: async () => {
      const { data } = await supabase
        .from('donation_purposes')
        .select('key,label_bn,label_en')
        .eq('is_active', true)
        .order('sort_order');
      return data || [];
    },
  });

  const { data: institution } = useQuery({
    queryKey: ['institution-donation-public'],
    queryFn: () => fetchInstitutionInfo(),
  });

  const hasGateway = gateways.length > 0;
  const hasManualMethods = manualMethods.length > 0;

  // ---- Validation ----
  const amountNum = useMemo(() => {
    const cleaned = toEnDigits(form.amount).replace(/[^\d.]/g, '');
    return parseFloat(cleaned) || 0;
  }, [form.amount]);

  const purposeLabel = useMemo(() => {
    if (!form.purposeKey) return '';
    if (form.purposeKey === 'other') return form.purposeOther || (bn ? 'অন্যান্য' : 'Other');
    const p = (purposes as any[]).find((x) => x.key === form.purposeKey);
    return p ? (bn ? p.label_bn : p.label_en) : form.purposeKey;
  }, [form.purposeKey, form.purposeOther, purposes, bn]);

  // RFC 5322-lite: standard email regex used across the app.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const emailTrimmed = form.email.trim();
  const emailFormatValid = emailTrimmed === '' || EMAIL_RE.test(emailTrimmed);
  const emailError = !emailFormatValid ? t('emailInvalid') : '';

  // Phone validation:
  //  - Bangladeshi mobile: 11 digits starting with 01[3-9] (e.g. 017XXXXXXXX)
  //  - International:      +<country code><number>, total 10–15 digits
  // Strip spaces/hyphens/parentheses before testing so users can type
  // "+880 1712-345678" or "(017) 1234 5678" naturally.
  const phoneRaw = form.phone.trim();
  const phoneDigits = phoneRaw.replace(/[\s\-()]/g, '');
  const BD_MOBILE_RE = /^01[3-9]\d{8}$/;
  const INTL_RE = /^\+\d{10,15}$/;
  const phoneFormatValid =
    phoneRaw === '' ? false : BD_MOBILE_RE.test(phoneDigits) || INTL_RE.test(phoneDigits);
  const phoneError = phoneRaw === ''
    ? ''
    : !phoneFormatValid
      ? t('phoneInvalid')
      : '';

  const step1Valid =
    form.name.trim().length > 0 &&
    phoneFormatValid &&
    amountNum > 0 &&
    !!form.purposeKey &&
    (form.purposeKey !== 'other' || form.purposeOther.trim().length > 0) &&
    emailFormatValid;

  const goNextFromStep1 = () => {
    if (!phoneFormatValid) {
      toast.error(phoneError || t('phoneInvalidShort'));
      return;
    }
    if (!emailFormatValid) {
      toast.error(emailError);
      return;
    }
    if (!step1Valid) {
      toast.error(t('step1Required'));
      return;
    }
    setStep(2);
  };

  const choosePayMode = (mode: PayMode) => {
    setPayMode(mode);
    setStep(3);
  };

  // ---- Submit handlers ----
  const handleOnlinePay = async () => {
    if (!hasGateway) {
      toast.error(t('gatewayDisabled'));
      return;
    }
    setIsSubmitting(true);
    try {
      const txId = generateDonationTrxId();
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: {
          amount: amountNum,
          fee_type: 'donation',
          payer_name: form.name,
          payer_phone: form.phone,
          payer_email: form.email || null,
          transaction_id: txId,
          purpose: purposeLabel,
          callback_url: window.location.origin + '/donation?status=success',
        },
      });
      if (error) throw new Error(t('gatewayError'));

      // Pre-record pending donor row so admin sees it
      await supabase.from('donors').insert({
        name_bn: form.name,
        phone: form.phone || null,
        email: form.email || null,
        donation_amount: amountNum,
        donation_type: bn ? 'অনলাইন' : 'Online',
        purpose: purposeLabel,
        purpose_key: form.purposeKey,
        status: 'active',
        notes: `TrxID: ${txId} | Online Payment | Pending`,
      });

      if (data?.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }
      throw new Error(t('noGatewayResponse'));
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualMethod) {
      toast.error(t('selectMethod'));
      return;
    }
    if (!manualTrxId.trim()) {
      toast.error(t('trxIdRequired'));
      return;
    }
    if (!senderNumber.trim()) {
      toast.error(t('senderRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      const trxClean = manualTrxId.trim();

      // Insert donor row — trigger auto-runs verify_donation_payment
      const { data: inserted, error: insErr } = await supabase
        .from('donors')
        .insert({
          name_bn: form.name,
          phone: form.phone || null,
          email: form.email || null,
          sender_number: senderNumber.trim(),
          donation_amount: amountNum,
          donation_type: manualMethod,
          purpose: purposeLabel,
          purpose_key: form.purposeKey,
          status: 'active',
          notes: `TrxID: ${trxClean} | ${manualMethod} | Manual | Sender: ${senderNumber.trim()}`,
        })
        .select('id, payment_status, receipt_number')
        .single();

      if (insErr) throw insErr;

      // Server-side rate-limited verification.
      // - If TrxID + amount match an admin-seeded verified_payments row, the
      //   donor is flipped to 'verified' here.
      // - Otherwise, attempt is counted (5/10min per phone, 20/10min per IP).
      //   On mismatch the row stays 'pending' and admins receive a notification.
      // - On lockout we surface a clear message + retry-after to the user.
      let verified = inserted?.payment_status === 'verified';
      let rateLimited = false;
      let retryAfter: number | null = null;
      let remaining: number | null = null;

      if (!verified && inserted?.id) {
        const { data: rpcRes } = await supabase.rpc('verify_donation_attempt', {
          _donor_id: inserted.id,
          _trx_id: trxClean,
          _amount: amountNum,
          _phone: form.phone || senderNumber.trim() || '',
          _client_ip: null,
        });
        const r = (rpcRes ?? {}) as Record<string, any>;
        verified = !!r.matched;
        rateLimited = !!r.rate_limited;
        retryAfter = typeof r.retry_after === 'number' ? r.retry_after : null;
        remaining = typeof r.remaining_attempts === 'number' ? r.remaining_attempts : null;
      }

      // Record gateway-side payment row (non-fatal; admin can reconcile)
      try {
        await supabase.from('payments').insert({
          transaction_id: trxClean,
          amount: amountNum,
          fee_type: 'donation',
          payer_name: form.name,
          payer_phone: form.phone || null,
          status: verified ? 'success' : 'pending',
          payment_method: manualMethod,
          notes: `Donation | ${purposeLabel}`,
        });
      } catch {
        /* non-fatal */
      }

      setResult({
        trxId: trxClean,
        status: verified ? 'verified' : 'pending',
        donorId: inserted?.id,
        receiptNumber: inserted?.receipt_number ?? null,
      });
      setIsDone(true);

      if (verified) {
        toast.success(bn ? 'ট্রানজেকশন যাচাই সম্পন্ন!' : 'Transaction verified!');
      } else if (rateLimited) {
        const mins = retryAfter ? Math.ceil(retryAfter / 60) : 10;
        toast.error(
          bn
            ? `অনেকবার ভুল TrxID — ${mins} মিনিট পর আবার চেষ্টা করুন। জমাটি pending হিসেবে রইল ও অ্যাডমিনকে জানানো হয়েছে।`
            : `Too many wrong TrxID attempts — try again in ${mins} min. Saved as pending; admin notified.`,
          { duration: 6000 },
        );
      } else {
        toast.warning(
          bn
            ? `TrxID মিল হয়নি — pending হিসেবে রইল, অ্যাডমিন যাচাই করবেন।${
                remaining !== null ? ` (বাকি চেষ্টা: ${remaining})` : ''
              }`
            : `TrxID did not match — saved as pending for admin review.${
                remaining !== null ? ` (Attempts left: ${remaining})` : ''
              }`,
          { duration: 6000 },
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- PDF Receipt ----
  const downloadPdf = async () => {
    if (!result) return;
    setPdfBusy(true);
    try {
      const data: DonationReceiptData = {
        donorName: form.name,
        donorPhone: form.phone,
        donorAddress: '',
        donationAmount: String(amountNum),
        donationType: payMode === 'online' ? (bn ? 'অনলাইন' : 'Online') : manualMethod,
        purpose: purposeLabel,
        receiptSerial: result.receiptNumber || '—',
        date: new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-GB'),
        transactionId: result.trxId,
        gatewayTrxId: result.trxId,
        paymentTimestamp: new Date().toLocaleString(bn ? 'bn-BD' : 'en-GB'),
        paymentMethod: payMode === 'online' ? 'Online Gateway' : manualMethod,
        collectorName: '—',
        approverName: '—',
        institutionName: institution?.name || '',
        institutionNameEn: institution?.name_en || '',
        institutionAddress: institution?.address || '',
        institutionPhone: institution?.phone || '',
        institutionEmail: institution?.email || '',
        institutionOtherInfo: '',
        logoUrl: institution?.logo_url || '',
        bn,
      };
      const html = buildDonationReceiptHtml(data);
      await downloadReceiptAsPdf(html, `donation-receipt-${result.trxId}.pdf`);
    } catch (e: any) {
      toast.error(e?.message || 'PDF generation failed');
    } finally {
      setPdfBusy(false);
    }
  };

  const resetAll = () => {
    setIsDone(false);
    setResult(null);
    setStep(1);
    setForm({ name: '', phone: '', email: '', purposeKey: '', purposeOther: '', amount: '' });
    setPayMode('');
    setManualMethod('');
    setManualTrxId('');
    setSenderNumber('');
  };

  // ---- Success Screen ----
  if (isDone && result) {
    const verified = result.status === 'verified';
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-12 max-w-xl">
          <div className="card-elevated p-8 space-y-5 text-center">
            <div
              className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
                verified ? 'bg-emerald-500/15' : 'bg-amber-500/15'
              }`}
            >
              {verified ? (
                <ShieldCheck className="w-10 h-10 text-emerald-600" />
              ) : (
                <Clock className="w-10 h-10 text-amber-600" />
              )}
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground">
              {bn ? 'জাযাকাল্লাহু খাইরান!' : 'Thank You!'}
            </h2>
            <p
              className={`text-sm font-semibold ${
                verified ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {verified
                ? bn ? '✓ ট্রানজেকশন স্বয়ংক্রিয়ভাবে যাচাইকৃত' : '✓ Transaction Auto-Verified'
                : bn ? '⏳ অনুমোদনের জন্য অপেক্ষমাণ' : '⏳ Pending admin verification'}
            </p>
            <div className="bg-secondary/50 rounded-2xl p-4 text-sm space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{bn ? 'পরিমাণ' : 'Amount'}</span>
                <span className="font-bold text-foreground">৳ {amountNum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{bn ? 'উদ্দেশ্য' : 'Purpose'}</span>
                <span className="text-foreground">{purposeLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{bn ? 'ট্রানজেকশন আইডি' : 'Transaction ID'}</span>
                <span className="font-mono font-bold text-foreground">{result.trxId}</span>
              </div>
              {result.receiptNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{bn ? 'রসিদ নম্বর' : 'Receipt No.'}</span>
                  <span className="font-mono font-bold text-emerald-700">{result.receiptNumber}</span>
                </div>
              )}
            </div>

            {verified ? (
              <Button onClick={downloadPdf} disabled={pdfBusy} className="btn-primary-gradient w-full">
                {pdfBusy ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {bn ? 'PDF রসিদ ডাউনলোড করুন' : 'Download PDF Receipt'}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                {bn
                  ? 'অ্যাডমিন যাচাই সম্পন্ন হলে আপনি রসিদ ডাউনলোড করতে পারবেন।'
                  : 'You can download your receipt once admin verification is complete.'}
              </p>
            )}

            <Button onClick={resetAll} variant="outline" className="w-full">
              {bn ? 'আবার দান করুন' : 'Donate Again'}
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // ---- Form (3 steps) ----
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-accent/20 mx-auto mb-3 flex items-center justify-center">
            <Heart className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">
            {bn ? 'দান করুন' : 'Make a Donation'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {bn ? 'আপনার দান ছাত্রদের শিক্ষায় ব্যবহৃত হবে' : 'Your donation will support student education'}
          </p>
          {institution && (
            <p className="text-xs text-muted-foreground mt-1">
              {bn ? institution.name : institution.name_en || institution.name}
            </p>
          )}
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step >= n
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {n}
              </div>
              {n < 3 && (
                <div
                  className={`w-10 h-0.5 ${step > n ? 'bg-primary' : 'bg-secondary'}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* STEP 1: Donor Details */}
        {step === 1 && (
          <div className="card-elevated p-6 space-y-5">
            <h2 className="font-display font-bold text-foreground text-lg">
              {bn ? 'দাতার তথ্য' : 'Donor Details'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">{bn ? 'নাম' : 'Name'} *</Label>
                <Input
                  className="bg-background mt-1"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
              <div>
                <Label className="text-sm">{bn ? 'মোবাইল নম্বর' : 'Mobile Number'} *</Label>
                <Input
                  className={`bg-background mt-1 ${phoneError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => updateField('phone', toEnDigits(e.target.value))}
                  placeholder="01XXXXXXXXX"
                  maxLength={20}
                  aria-invalid={!!phoneError}
                  aria-describedby={phoneError ? 'donation-phone-error' : undefined}
                />
                {phoneError && (
                  <p id="donation-phone-error" className="text-xs text-destructive mt-1">
                    {phoneError}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm">
                  {bn ? 'ইমেইল (ঐচ্ছিক)' : 'Email (Optional)'}
                </Label>
                <Input
                  className={`bg-background mt-1 ${emailError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="example@email.com"
                  maxLength={255}
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'donation-email-error' : undefined}
                />
                {emailError && (
                  <p id="donation-email-error" className="text-xs text-destructive mt-1">
                    {emailError}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm">{bn ? 'দানের উদ্দেশ্য' : 'Donation Purpose'} *</Label>
                <Select
                  value={form.purposeKey}
                  onValueChange={(v) => updateField('purposeKey', v)}
                >
                  <SelectTrigger className="bg-background mt-1">
                    <SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select purpose'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(purposes as any[]).map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {bn ? p.label_bn : p.label_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.purposeKey === 'other' && (
                  <Input
                    className="bg-background mt-2"
                    placeholder={bn ? 'উদ্দেশ্য লিখুন' : 'Specify purpose'}
                    value={form.purposeOther}
                    onChange={(e) => updateField('purposeOther', e.target.value)}
                    maxLength={200}
                  />
                )}
              </div>

              {/* Amount with presets */}
              <div className="sm:col-span-2">
                <Label className="text-sm">{bn ? 'পরিমাণ (৳)' : 'Amount (৳)'} *</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => updateField('amount', String(amt))}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                        amountNum === amt
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      ৳ {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="bg-background mt-2"
                  value={form.amount}
                  onChange={(e) => updateField('amount', toEnDigits(e.target.value))}
                  placeholder={bn ? 'কাস্টম পরিমাণ' : 'Custom amount'}
                />
              </div>
            </div>

            <Button
              onClick={goNextFromStep1}
              disabled={!step1Valid}
              className="btn-primary-gradient w-full"
            >
              {bn ? 'পরবর্তী' : 'Next'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* STEP 2: Choose Payment Mode */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="card-elevated p-6">
              <h2 className="font-display font-bold text-foreground text-lg mb-1">
                {bn ? 'পেমেন্ট পদ্ধতি বেছে নিন' : 'Choose Payment Method'}
              </h2>
              <p className="text-xs text-muted-foreground mb-5">
                {bn
                  ? 'অনলাইনে তাৎক্ষণিক পেমেন্ট অথবা নিজে টাকা পাঠিয়ে যাচাই — যেকোনো একটি'
                  : 'Pay instantly online or send money manually and verify — pick one'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option A — Online */}
                <button
                  type="button"
                  onClick={() => hasGateway && choosePayMode('online')}
                  disabled={!hasGateway}
                  className={`group relative text-left p-5 rounded-3xl border-2 transition-all ${
                    hasGateway
                      ? 'border-border hover:border-primary hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30'
                      : 'border-border opacity-50 cursor-not-allowed bg-secondary/30'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                      <Globe className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">
                        {bn ? 'অপশন A — অনলাইন পেমেন্ট' : 'Option A — Online Payment'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {bn ? 'তাৎক্ষণিক যাচাই' : 'Instant verification'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {bn
                      ? 'বিকাশ, নগদ, রকেট, ভিসা, মাস্টারকার্ড — সব ধরনের পেমেন্ট সমর্থিত।'
                      : 'bKash, Nagad, Rocket, Visa, Mastercard — all supported.'}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {['bKash', 'Nagad', 'Rocket', 'Card'].map((m) => (
                      <span
                        key={m}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-background border border-border text-muted-foreground"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                  {!hasGateway && (
                    <p className="mt-3 text-[11px] text-amber-600">
                      {bn ? 'গেটওয়ে এখনো সেটআপ হয়নি' : 'Gateway not configured'}
                    </p>
                  )}
                </button>

                {/* Option B — Manual */}
                <button
                  type="button"
                  onClick={() => hasManualMethods && choosePayMode('manual')}
                  disabled={!hasManualMethods}
                  className={`group relative text-left p-5 rounded-3xl border-2 transition-all ${
                    hasManualMethods
                      ? 'border-border hover:border-primary hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-amber-50 to-pink-50 dark:from-amber-950/30 dark:to-pink-950/30'
                      : 'border-border opacity-50 cursor-not-allowed bg-secondary/30'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-pink-500/15 flex items-center justify-center">
                      <Banknote className="w-6 h-6 text-pink-600" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">
                        {bn ? 'অপশন B — ম্যানুয়াল ট্রানজেকশন' : 'Option B — Manual Transaction'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {bn ? 'আপনি নিজে পাঠাবেন' : 'Send & verify yourself'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {bn
                      ? 'মাদরাসার বিকাশ/নগদ/রকেট নম্বরে টাকা পাঠিয়ে TrxID দিন — মিলে গেলে অটো-ভেরিফাই।'
                      : 'Send money to our bKash/Nagad/Rocket and submit TrxID — auto-verified if matched.'}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {bn ? 'অটো-ভেরিফিকেশন সক্রিয়' : 'Auto-verification enabled'}
                  </div>
                  {!hasManualMethods && (
                    <p className="mt-3 text-[11px] text-amber-600">
                      {bn ? 'ম্যানুয়াল মাধ্যম সেটআপ নেই' : 'No manual methods set up'}
                    </p>
                  )}
                </button>
              </div>

              {!hasGateway && !hasManualMethods && (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {bn
                      ? 'কোনো পেমেন্ট মাধ্যম এখনো সেটআপ করা হয়নি।'
                      : 'No payment method has been configured yet.'}
                  </p>
                </div>
              )}
            </div>

            <Button onClick={() => setStep(1)} variant="outline" className="w-full sm:w-auto">
              <ChevronLeft className="w-4 h-4 mr-1" />
              {bn ? 'পেছনে' : 'Back'}
            </Button>
          </div>
        )}

        {/* STEP 3: Pay */}
        {step === 3 && (
          <div className="space-y-5">
            {payMode === 'online' ? (
              <div className="card-elevated p-6 space-y-5">
                <h2 className="font-display font-bold text-foreground text-lg">
                  {bn ? 'অনলাইন পেমেন্ট চালু করুন' : 'Launch Online Payment'}
                </h2>
                <div className="bg-secondary/40 rounded-2xl p-4 text-sm space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{bn ? 'নাম' : 'Name'}</span>
                    <span className="font-semibold">{form.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{bn ? 'উদ্দেশ্য' : 'Purpose'}</span>
                    <span>{purposeLabel}</span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-muted-foreground">{bn ? 'পরিমাণ' : 'Amount'}</span>
                    <span className="font-bold text-primary">৳ {amountNum.toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {bn
                    ? 'নিচে ক্লিক করলে নিরাপদ পেমেন্ট গেটওয়ে খুলবে। সফল পেমেন্টের পর অটোমেটিক "Success" হবে।'
                    : 'Clicking below opens a secure gateway. Status auto-flips to "Success" after a successful payment.'}
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-secondary/50">
                    <Smartphone className="w-6 h-6 text-primary mx-auto mb-1" />
                    <p className="text-xs">bKash · Nagad · Rocket</p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/50">
                    <CreditCard className="w-6 h-6 text-primary mx-auto mb-1" />
                    <p className="text-xs">Visa · Mastercard</p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/50">
                    <Building className="w-6 h-6 text-primary mx-auto mb-1" />
                    <p className="text-xs">{bn ? 'ব্যাংক' : 'Bank'}</p>
                  </div>
                </div>
                <Button
                  onClick={handleOnlinePay}
                  disabled={isSubmitting}
                  className="btn-primary-gradient w-full text-base py-6"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Globe className="w-5 h-5 mr-2" />
                  )}
                  {bn ? `৳ ${amountNum.toLocaleString()} পেমেন্ট করুন` : `Pay ৳ ${amountNum.toLocaleString()}`}
                </Button>
              </div>
            ) : (
              <div className="card-elevated p-6 space-y-5">
                <h2 className="font-display font-bold text-foreground text-lg">
                  {bn ? 'ম্যানুয়াল ট্রানজেকশন' : 'Manual Transaction'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {bn
                    ? 'নিচের যেকোনো নম্বরে ৳ ' + amountNum.toLocaleString() + ' পাঠিয়ে TrxID ও আপনার সেন্ডার নম্বর দিন।'
                    : `Send ৳ ${amountNum.toLocaleString()} to any of the numbers below, then submit your TrxID & sender number.`}
                </p>

                <ManualPaymentMethods
                  transactionId={manualTrxId}
                  onTransactionIdChange={setManualTrxId}
                  selectedMethod={manualMethod}
                  onMethodSelect={setManualMethod}
                />

                <div>
                  <Label className="text-sm">{bn ? 'প্রেরকের নম্বর' : 'Sender Number'} *</Label>
                  <Input
                    className="bg-background mt-1"
                    type="tel"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(toEnDigits(e.target.value))}
                    placeholder="01XXXXXXXXX"
                    maxLength={15}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {bn
                      ? 'যে নম্বর থেকে টাকা পাঠিয়েছেন'
                      : 'The number you sent the money from'}
                  </p>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    {bn
                      ? 'TrxID এবং পরিমাণ আমাদের ভেরিফায়েড লিস্টের সাথে মিলে গেলে স্ট্যাটাস স্বয়ংক্রিয়ভাবে "Verified" হয়ে যাবে।'
                      : 'If your TrxID and amount match our verified list, status will auto-flip to "Verified" instantly.'}
                  </p>
                </div>

                <Button
                  onClick={handleManualSubmit}
                  disabled={isSubmitting}
                  className="btn-primary-gradient w-full text-base py-6"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5 mr-2" />
                  )}
                  {bn ? 'যাচাইয়ের জন্য জমা দিন' : 'Submit for Verification'}
                </Button>
              </div>
            )}

            <Button onClick={() => setStep(2)} variant="outline" className="w-full sm:w-auto">
              <ChevronLeft className="w-4 h-4 mr-1" />
              {bn ? 'পদ্ধতি পরিবর্তন' : 'Change Method'}
            </Button>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default DonationPage;
