import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PublicLayout from '@/components/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Inbox, ShieldAlert } from 'lucide-react';

const ComplaintPage = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ ticket: string } | null>(null);

  const [form, setForm] = useState({
    category: 'other',
    priority: 'medium',
    subject: '',
    description: '',
    complainant_name: '',
    complainant_phone: '',
    complainant_email: '',
    is_anonymous: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      toast({ title: language === 'bn' ? 'বিষয় ও বিবরণ আবশ্যক' : 'Subject and description are required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        category: form.category,
        priority: form.priority,
        subject: form.subject,
        description: form.description,
        is_anonymous: form.is_anonymous,
        complainant_name: form.is_anonymous ? null : form.complainant_name || null,
        complainant_phone: form.is_anonymous ? null : form.complainant_phone || null,
        complainant_email: form.is_anonymous ? null : form.complainant_email || null,
      };
      const { data, error } = await supabase.from('complaints').insert(payload).select('ticket_number').single();
      if (error) throw error;
      setSubmitted({ ticket: data.ticket_number });
    } catch (err) {
      toast({ title: language === 'bn' ? 'জমা দিতে ব্যর্থ' : 'Submission failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
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
                {language === 'bn' ? 'অভিযোগ সফলভাবে জমা হয়েছে' : 'Complaint Submitted Successfully'}
              </h2>
              <p className="text-muted-foreground">
                {language === 'bn' ? 'আপনার টিকিট নম্বর' : 'Your ticket number'}
              </p>
              <div className="text-4xl font-mono font-bold tracking-wider bg-primary/10 text-primary py-4 px-6 rounded-2xl inline-block">
                {submitted.ticket}
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'bn' 
                  ? 'কর্তৃপক্ষ শীঘ্রই আপনার অভিযোগ পর্যালোচনা করবে। ভবিষ্যৎ যোগাযোগের জন্য টিকিট নম্বরটি সংরক্ষণ করুন।'
                  : 'Authority will review your complaint shortly. Please save the ticket number for future reference.'}
              </p>
              <Button onClick={() => { setSubmitted(null); setForm({ category: 'other', priority: 'medium', subject: '', description: '', complainant_name: '', complainant_phone: '', complainant_email: '', is_anonymous: false }); }} className="rounded-2xl">
                {language === 'bn' ? 'আরেকটি জমা দিন' : 'Submit Another'}
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
            {language === 'bn' ? 'অভিযোগ বক্স' : 'Complaint Box'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'bn' 
              ? 'আপনার মতামত ও অভিযোগ আমাদের প্রতিষ্ঠান উন্নত করতে সাহায্য করে। সম্পূর্ণ গোপনীয়তা বজায় রাখা হয়।'
              : 'Your feedback helps us improve. Complete confidentiality is maintained.'}
          </p>
        </div>

        <Card className="rounded-[38px] border-0 bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              {language === 'bn' ? 'অভিযোগ ফরম' : 'Complaint Form'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'bn' ? 'বিভাগ' : 'Category'} *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">{language === 'bn' ? 'শিক্ষা সংক্রান্ত' : 'Academic'}</SelectItem>
                      <SelectItem value="financial">{language === 'bn' ? 'আর্থিক' : 'Financial'}</SelectItem>
                      <SelectItem value="infrastructure">{language === 'bn' ? 'অবকাঠামো' : 'Infrastructure'}</SelectItem>
                      <SelectItem value="staff">{language === 'bn' ? 'কর্মী সংক্রান্ত' : 'Staff'}</SelectItem>
                      <SelectItem value="other">{language === 'bn' ? 'অন্যান্য' : 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'bn' ? 'অগ্রাধিকার' : 'Priority'} *</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{language === 'bn' ? 'কম' : 'Low'}</SelectItem>
                      <SelectItem value="medium">{language === 'bn' ? 'মাঝারি' : 'Medium'}</SelectItem>
                      <SelectItem value="high">{language === 'bn' ? 'উচ্চ' : 'High'}</SelectItem>
                      <SelectItem value="urgent">{language === 'bn' ? 'জরুরি' : 'Urgent'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>{language === 'bn' ? 'বিষয়' : 'Subject'} *</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="rounded-xl" required maxLength={200} />
              </div>

              <div>
                <Label>{language === 'bn' ? 'বিস্তারিত বিবরণ' : 'Detailed Description'} *</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} className="rounded-xl" required maxLength={5000} />
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50">
                <Checkbox id="anon" checked={form.is_anonymous} onCheckedChange={(v) => setForm({ ...form, is_anonymous: !!v })} />
                <Label htmlFor="anon" className="cursor-pointer">
                  {language === 'bn' ? 'বেনামে জমা দিন (নাম ও যোগাযোগ গোপন থাকবে)' : 'Submit anonymously (hide name & contact)'}
                </Label>
              </div>

              {!form.is_anonymous && (
                <div className="space-y-4 p-5 rounded-2xl border border-border/50">
                  <p className="text-sm font-semibold text-muted-foreground">
                    {language === 'bn' ? 'যোগাযোগের তথ্য (ঐচ্ছিক)' : 'Contact Information (Optional)'}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>{language === 'bn' ? 'নাম' : 'Name'}</Label>
                      <Input value={form.complainant_name} onChange={(e) => setForm({ ...form, complainant_name: e.target.value })} className="rounded-xl" />
                    </div>
                    <div>
                      <Label>{language === 'bn' ? 'ফোন' : 'Phone'}</Label>
                      <Input value={form.complainant_phone} onChange={(e) => setForm({ ...form, complainant_phone: e.target.value })} className="rounded-xl" />
                    </div>
                    <div>
                      <Label>{language === 'bn' ? 'ইমেইল' : 'Email'}</Label>
                      <Input type="email" value={form.complainant_email} onChange={(e) => setForm({ ...form, complainant_email: e.target.value })} className="rounded-xl" />
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" disabled={submitting} className="w-full h-12 rounded-2xl text-base">
                {submitting ? (language === 'bn' ? 'জমা হচ্ছে...' : 'Submitting...') : (language === 'bn' ? 'অভিযোগ জমা দিন' : 'Submit Complaint')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default ComplaintPage;
