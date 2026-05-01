import { useState } from 'react';
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
import { CheckCircle2, Inbox, ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import OtpVerificationDialog from '@/components/OtpVerificationDialog';

const ComplaintPage = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ ticket: string } | null>(null);
  const [otpOpen, setOtpOpen] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');

  const initialForm = {
    category: 'other',
    priority: 'medium',
    subject: '',
    description: '',
    complainant_name: '',
    complainant_phone: '',
    complainant_email: '',
    complainant_address: '',
    complainant_student_id: '',
  };
  const [form, setForm] = useState(initialForm);

  // Reset verified flag if email changes
  const updateField = (key: keyof typeof form, val: string) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (key === 'complainant_email' && val.trim().toLowerCase() !== verifiedEmail.toLowerCase()) {
      setEmailVerified(false);
    }
  };

  const validateRequired = (): string | null => {
    if (!form.complainant_name.trim() || form.complainant_name.trim().length < 2)
      return bn ? 'নাম আবশ্যক' : 'Name is required';
    if (!form.complainant_phone.trim() || form.complainant_phone.trim().length < 6)
      return bn ? 'মোবাইল নম্বর আবশ্যক' : 'Phone number is required';
    const email = form.complainant_email.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return bn ? 'বৈধ ইমেইল আবশ্যক' : 'Valid email is required';
    if (!form.complainant_address.trim() || form.complainant_address.trim().length < 4)
      return bn ? 'ঠিকানা আবশ্যক' : 'Address is required';
    if (!form.complainant_student_id.trim())
      return bn ? 'শিক্ষার্থী/সদস্য আইডি আবশ্যক' : 'Student/Member ID is required';
    if (!form.subject.trim()) return bn ? 'বিষয় আবশ্যক' : 'Subject is required';
    if (!form.description.trim()) return bn ? 'বিবরণ আবশ্যক' : 'Description is required';
    return null;
  };

  const submitComplaint = async () => {
    setSubmitting(true);
    try {
      const payload = {
        category: form.category,
        priority: form.priority,
        subject: form.subject.trim(),
        description: form.description.trim(),
        is_anonymous: false,
        complainant_name: form.complainant_name.trim(),
        complainant_phone: form.complainant_phone.trim(),
        complainant_email: form.complainant_email.trim(),
        complainant_address: form.complainant_address.trim(),
        complainant_student_id: form.complainant_student_id.trim(),
        contact_verified: true,
        contact_verified_at: new Date().toISOString(),
        contact_verification_method: 'email_otp',
      } as any;
      const { data, error } = await supabase
        .from('complaints')
        .insert(payload)
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
    setVerifiedEmail(form.complainant_email.trim());
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
    // If email already verified (and unchanged), submit directly. Otherwise open OTP dialog.
    if (emailVerified && verifiedEmail.toLowerCase() === form.complainant_email.trim().toLowerCase()) {
      await submitComplaint();
    } else {
      setOtpOpen(true);
    }
  };

  if (submitted) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <Card className="rounded-[38px] border-0 bg-card/80 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-12 text-center space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
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
              <Button
                onClick={() => {
                  setSubmitted(null);
                  setForm(initialForm);
                  setEmailVerified(false);
                  setVerifiedEmail('');
                }}
                className="rounded-2xl"
              >
                {bn ? 'আরেকটি জমা দিন' : 'Submit Another'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

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
        </div>

        <Card className="rounded-[38px] border-0 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              {bn ? 'অভিযোগ ফরম' : 'Complaint Form'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Identity (REQUIRED) */}
              <div className="space-y-4 p-5 rounded-2xl border border-primary/30 bg-primary/5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-semibold">
                    {bn ? 'পরিচয় ও যোগাযোগ (আবশ্যক)' : 'Identity & Contact (Required)'}
                  </p>
                  {emailVerified ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 px-3 py-1 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {bn ? 'ইমেইল ভেরিফাইড' : 'Email Verified'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {bn ? 'যাচাই বাকি' : 'Not Verified'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{bn ? 'নাম' : 'Name'} *</Label>
                    <Input
                      value={form.complainant_name}
                      onChange={(e) => updateField('complainant_name', e.target.value)}
                      className="rounded-xl"
                      maxLength={100}
                      required
                    />
                  </div>
                  <div>
                    <Label>{bn ? 'শিক্ষার্থী/সদস্য আইডি' : 'Student/Member ID'} *</Label>
                    <Input
                      value={form.complainant_student_id}
                      onChange={(e) => updateField('complainant_student_id', e.target.value)}
                      className="rounded-xl"
                      maxLength={50}
                      required
                    />
                  </div>
                  <div>
                    <Label>{bn ? 'মোবাইল' : 'Phone'} *</Label>
                    <Input
                      type="tel"
                      value={form.complainant_phone}
                      onChange={(e) => updateField('complainant_phone', e.target.value)}
                      className="rounded-xl"
                      maxLength={20}
                      required
                    />
                  </div>
                  <div>
                    <Label>{bn ? 'ইমেইল' : 'Email'} *</Label>
                    <Input
                      type="email"
                      value={form.complainant_email}
                      onChange={(e) => updateField('complainant_email', e.target.value)}
                      className="rounded-xl"
                      maxLength={255}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>{bn ? 'ঠিকানা' : 'Address'} *</Label>
                    <Input
                      value={form.complainant_address}
                      onChange={(e) => updateField('complainant_address', e.target.value)}
                      className="rounded-xl"
                      maxLength={300}
                      required
                    />
                  </div>
                </div>

                {!emailVerified && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleVerifyClick}
                    className="w-full rounded-xl"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    {bn ? 'ইমেইল OTP দিয়ে ভেরিফাই করুন' : 'Verify Email via OTP'}
                  </Button>
                )}
              </div>

              {/* Category & priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{bn ? 'বিভাগ' : 'Category'} *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">{bn ? 'শিক্ষা সংক্রান্ত' : 'Academic'}</SelectItem>
                      <SelectItem value="financial">{bn ? 'আর্থিক' : 'Financial'}</SelectItem>
                      <SelectItem value="infrastructure">{bn ? 'অবকাঠামো' : 'Infrastructure'}</SelectItem>
                      <SelectItem value="staff">{bn ? 'কর্মী সংক্রান্ত' : 'Staff'}</SelectItem>
                      <SelectItem value="other">{bn ? 'অন্যান্য' : 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'অগ্রাধিকার' : 'Priority'} *</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{bn ? 'কম' : 'Low'}</SelectItem>
                      <SelectItem value="medium">{bn ? 'মাঝারি' : 'Medium'}</SelectItem>
                      <SelectItem value="high">{bn ? 'উচ্চ' : 'High'}</SelectItem>
                      <SelectItem value="urgent">{bn ? 'জরুরি' : 'Urgent'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>{bn ? 'বিষয়' : 'Subject'} *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="rounded-xl"
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <Label>{bn ? 'বিস্তারিত বিবরণ' : 'Detailed Description'} *</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={6}
                  className="rounded-xl"
                  required
                  maxLength={5000}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !emailVerified}
                className="w-full h-12 rounded-2xl text-base"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{bn ? 'জমা হচ্ছে...' : 'Submitting...'}</>
                ) : !emailVerified ? (
                  bn ? 'প্রথমে ইমেইল ভেরিফাই করুন' : 'Verify email first'
                ) : (
                  bn ? 'অভিযোগ জমা দিন' : 'Submit Complaint'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <OtpVerificationDialog
        open={otpOpen}
        onOpenChange={setOtpOpen}
        email={form.complainant_email.trim()}
        purpose="email_verification"
        recipientName={form.complainant_name.trim()}
        onVerified={handleOtpVerified}
        title={bn ? 'ইমেইল যাচাই' : 'Verify Email'}
        description={bn ? 'আপনার ইমেইলে পাঠানো ৬-সংখ্যার কোড লিখুন' : 'Enter the 6-digit code sent to your email'}
      />
    </PublicLayout>
  );
};

export default ComplaintPage;
