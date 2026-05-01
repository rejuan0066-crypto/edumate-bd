import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PublicLayout from '@/components/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Inbox, ShieldCheck, Loader2 } from 'lucide-react';
import OtpVerificationDialog from '@/components/OtpVerificationDialog';

type FieldConfig = {
  id: string;
  field_key: string;
  label_bn: string;
  label_en: string;
  placeholder_bn?: string | null;
  placeholder_en?: string | null;
  field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number';
  options?: Array<{ value: string; label_bn: string; label_en: string }> | null;
  is_visible: boolean;
  is_required: boolean;
  is_locked: boolean;
  min_length?: number | null;
  max_length?: number | null;
  display_order: number;
};

const IDENTITY_KEYS = new Set([
  'complainant_name', 'complainant_phone', 'complainant_email',
  'complainant_address', 'complainant_student_id',
]);

const ComplaintPage = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ ticket: string } | null>(null);
  const [otpOpen, setOtpOpen] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');

  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('complaint_field_config')
        .select('*')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });
      if (!alive) return;
      if (error) {
        toast({ title: bn ? 'ফিল্ড লোড ব্যর্থ' : 'Failed to load fields', variant: 'destructive' });
        setLoadingFields(false);
        return;
      }
      const list = (data || []) as unknown as FieldConfig[];
      setFields(list);
      const initial: Record<string, string> = {};
      list.forEach((f) => {
        if (f.field_type === 'select' && f.options?.length) {
          initial[f.field_key] = f.options[Math.min(1, f.options.length - 1)].value;
        } else {
          initial[f.field_key] = '';
        }
      });
      setForm(initial);
      setLoadingFields(false);
    })();
    return () => { alive = false; };
  }, [bn, toast]);

  const fieldByKey = useMemo(() => {
    const m: Record<string, FieldConfig> = {};
    fields.forEach((f) => { m[f.field_key] = f; });
    return m;
  }, [fields]);

  const updateField = (key: string, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (key === 'complainant_email' && val.trim().toLowerCase() !== verifiedEmail.toLowerCase()) {
      setEmailVerified(false);
    }
  };

  const validateRequired = (): string | null => {
    for (const f of fields) {
      if (!f.is_required) continue;
      const val = (form[f.field_key] || '').trim();
      const labelText = bn ? f.label_bn : f.label_en;
      if (!val) return bn ? `${f.label_bn} আবশ্যক` : `${f.label_en} is required`;
      if (f.min_length && val.length < f.min_length)
        return bn ? `${f.label_bn} কমপক্ষে ${f.min_length} অক্ষর হতে হবে` : `${labelText} must be at least ${f.min_length} characters`;
      if (f.max_length && val.length > f.max_length)
        return bn ? `${f.label_bn} সর্বোচ্চ ${f.max_length} অক্ষর` : `${labelText} must be at most ${f.max_length} characters`;
      if (f.field_type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val))
        return bn ? `বৈধ ${f.label_bn} দিন` : `Enter a valid ${labelText}`;
      if (f.field_type === 'phone' && !/^[0-9+\-\s()]{6,20}$/.test(val))
        return bn ? `বৈধ ${f.label_bn} দিন` : `Enter a valid ${labelText}`;
    }
    // Email is mandatory for OTP verification regardless of config
    const emailVal = (form.complainant_email || '').trim();
    if (!emailVal || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailVal))
      return bn ? 'OTP যাচাইয়ের জন্য বৈধ ইমেইল আবশ্যক' : 'A valid email is required for OTP verification';
    return null;
  };

  const submitComplaint = async () => {
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        is_anonymous: false,
        contact_verified: true,
        contact_verified_at: new Date().toISOString(),
        contact_verification_method: 'email_otp',
      };
      fields.forEach((f) => {
        const v = (form[f.field_key] || '').trim();
        if (v !== '') payload[f.field_key] = v;
      });
      // Sensible defaults for non-visible required-by-DB fields
      if (!payload.category) payload.category = 'other';
      if (!payload.priority) payload.priority = 'medium';
      if (!payload.subject) payload.subject = (payload.description || '').slice(0, 80) || 'Complaint';
      if (!payload.description) payload.description = '-';

      const { data, error } = await supabase
        .from('complaints')
        .insert(payload as any)
        .select('ticket_number')
        .single();
      if (error) throw error;
      setSubmitted({ ticket: data.ticket_number! });
    } catch (err) {
      toast({
        title: bn ? 'জমা দিতে ব্যর্থ' : 'Submission failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpVerified = async () => {
    setEmailVerified(true);
    setVerifiedEmail((form.complainant_email || '').trim());
    setOtpOpen(false);
    await submitComplaint();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateRequired();
    if (err) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: err, variant: 'destructive' });
      return;
    }
    const emailVal = (form.complainant_email || '').trim();
    if (emailVerified && verifiedEmail.toLowerCase() === emailVal.toLowerCase()) {
      await submitComplaint();
    } else {
      setOtpOpen(true);
    }
  };

  const renderField = (f: FieldConfig) => {
    const labelText = bn ? f.label_bn : f.label_en;
    const placeholder = (bn ? f.placeholder_bn : f.placeholder_en) || undefined;
    const value = form[f.field_key] || '';
    const wrapperClass = f.field_type === 'textarea' ? 'md:col-span-2' : '';

    if (f.field_type === 'select' && f.options?.length) {
      return (
        <div key={f.id} className={wrapperClass}>
          <Label>{labelText} {f.is_required && '*'}</Label>
          <Select value={value} onValueChange={(v) => updateField(f.field_key, v)}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {f.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {bn ? opt.label_bn : opt.label_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (f.field_type === 'textarea') {
      return (
        <div key={f.id} className={wrapperClass}>
          <Label>{labelText} {f.is_required && '*'}</Label>
          <Textarea
            value={value}
            onChange={(e) => updateField(f.field_key, e.target.value)}
            rows={f.field_key === 'description' ? 6 : 3}
            className="rounded-xl"
            placeholder={placeholder}
            maxLength={f.max_length || undefined}
            required={f.is_required}
          />
        </div>
      );
    }

    return (
      <div key={f.id} className={wrapperClass}>
        <Label>{labelText} {f.is_required && '*'}</Label>
        <Input
          type={f.field_type === 'email' ? 'email' : f.field_type === 'phone' ? 'tel' : f.field_type === 'number' ? 'text' : 'text'}
          value={value}
          onChange={(e) => updateField(f.field_key, e.target.value)}
          className="rounded-xl"
          placeholder={placeholder}
          maxLength={f.max_length || undefined}
          required={f.is_required}
        />
      </div>
    );
  };

  if (submitted) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <Card className="rounded-[38px] border-0 bg-card/80 backdrop-blur-xl shadow-2xl">
            <CardContent className="text-center py-16 space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold">
                {bn ? 'অভিযোগ সফলভাবে জমা হয়েছে' : 'Complaint Submitted Successfully'}
              </h2>
              <p className="text-muted-foreground">
                {bn ? 'আপনার টিকিট নম্বর' : 'Your ticket number'}
              </p>
              <div className="text-4xl font-mono font-bold tracking-wider bg-primary/10 text-primary py-4 px-6 rounded-2xl inline-block">
                {submitted.ticket}
              </div>
              <p className="text-sm text-muted-foreground">
                {bn
                  ? 'কর্তৃপক্ষ শীঘ্রই আপনার অভিযোগ পর্যালোচনা করবে। ভবিষ্যৎ যোগাযোগের জন্য টিকিট নম্বরটি সংরক্ষণ করুন।'
                  : 'Authority will review your complaint shortly. Please save the ticket number for future reference.'}
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(null);
                    setEmailVerified(false);
                    setVerifiedEmail('');
                    const initial: Record<string, string> = {};
                    fields.forEach((f) => {
                      initial[f.field_key] = f.field_type === 'select' && f.options?.length
                        ? f.options[Math.min(1, f.options.length - 1)].value : '';
                    });
                    setForm(initial);
                  }}
                  className="rounded-2xl"
                >
                  {bn ? 'আরেকটি জমা দিন' : 'Submit Another'}
                </Button>
                <Button asChild className="rounded-2xl">
                  <Link to={`/complaints/track?ticket=${submitted.ticket}`}>
                    {bn ? 'অভিযোগ ট্র্যাক করুন' : 'Track This Complaint'}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  // Group fields: identity vs others (preserves the original visual structure)
  const identityFields = fields.filter((f) => IDENTITY_KEYS.has(f.field_key));
  const otherFields = fields.filter((f) => !IDENTITY_KEYS.has(f.field_key));

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Inbox className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-3">
            {bn ? 'অভিযোগ বক্স' : 'Complaint Box'}
          </h1>
          <p className="text-muted-foreground">
            {bn
              ? 'বেনামে অভিযোগ গ্রহণ করা হয় না। সঠিক পরিচয় ও যাচাইকৃত যোগাযোগ মাধ্যম দিয়ে অভিযোগ জমা দিন।'
              : 'Anonymous complaints are not accepted. Please provide a verified contact to submit a complaint.'}
          </p>
          <div className="mt-4">
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link to="/complaints/track">
                {bn ? 'আগের অভিযোগ ট্র্যাক করুন' : 'Track an existing complaint'}
              </Link>
            </Button>
          </div>
        </div>

        <Card className="rounded-[38px] border-0 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle>{bn ? 'অভিযোগের বিবরণ' : 'Complaint Details'}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingFields ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {identityFields.length > 0 && (
                  <div className="space-y-4 p-5 rounded-2xl border border-primary/30 bg-primary/5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-sm font-semibold">
                        {bn ? 'পরিচয় ও যোগাযোগ' : 'Identity & Contact'}
                      </p>
                      {emailVerified && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 px-3 py-1 rounded-full">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {bn ? 'ইমেইল ভেরিফাইড' : 'Email Verified'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {identityFields.map(renderField)}
                    </div>
                  </div>
                )}

                {otherFields.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {otherFields.map(renderField)}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 rounded-2xl text-base"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{bn ? 'জমা হচ্ছে...' : 'Submitting...'}</>
                  ) : (
                    bn ? 'অভিযোগ জমা দিন' : 'Submit Complaint'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <OtpVerificationDialog
        open={otpOpen}
        onOpenChange={setOtpOpen}
        email={(form.complainant_email || '').trim()}
        purpose="email_verification"
        recipientName={(form.complainant_name || '').trim()}
        onVerified={handleOtpVerified}
        title={bn ? 'ইমেইল যাচাই' : 'Verify Email'}
        description={bn ? 'আপনার ইমেইলে পাঠানো ৬-সংখ্যার কোড লিখুন' : 'Enter the 6-digit code sent to your email'}
      />
    </PublicLayout>
  );
};

export default ComplaintPage;
