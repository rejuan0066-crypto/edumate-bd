import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PublicLayout from '@/components/PublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Search,
  Loader2,
  Inbox,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  UserCheck,
  FileText,
  ShieldCheck,
  ArrowLeft,
  MessageSquarePlus,
  Send,
  MessageCircle,
} from 'lucide-react';
import OtpVerificationDialog from '@/components/OtpVerificationDialog';
import { Textarea } from '@/components/ui/textarea';

type ComplaintUpdate = {
  id: string;
  update_type: 'created' | 'status_change' | 'note' | 'assignment' | 'resolution' | 'reply';
  from_status?: string | null;
  to_status?: string | null;
  message?: string | null;
  created_at: string;
};

type ComplaintData = {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  complainant_name: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  updates: ComplaintUpdate[];
};

const STATUS_VARIANT: Record<string, { bn: string; en: string; cls: string }> = {
  pending: { bn: 'অপেক্ষমাণ', en: 'Pending', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  in_review: { bn: 'পর্যালোচনাধীন', en: 'In Review', cls: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  in_progress: { bn: 'প্রক্রিয়াধীন', en: 'In Progress', cls: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' },
  resolved: { bn: 'সমাধান হয়েছে', en: 'Resolved', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  rejected: { bn: 'প্রত্যাখ্যাত', en: 'Rejected', cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' },
  closed: { bn: 'বন্ধ', en: 'Closed', cls: 'bg-muted text-muted-foreground' },
};

const ComplaintTrackPage = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { toast } = useToast();

  const [searchParams] = useSearchParams();
  const [ticket, setTicket] = useState(searchParams.get('ticket') || '');
  const [email, setEmail] = useState('');
  const [otpOpen, setOtpOpen] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ComplaintData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const canReply = data && !['rejected', 'closed'].includes(data.status);

  const handleSendReply = async () => {
    if (!data) return;
    const msg = reply.trim();
    if (msg.length < 2) {
      toast({ title: bn ? 'বার্তা লিখুন' : 'Please write a message', variant: 'destructive' });
      return;
    }
    if (msg.length > 4000) {
      toast({ title: bn ? 'বার্তা অনেক বড় (সর্বোচ্চ ৪০০০ অক্ষর)' : 'Message too long (max 4000 chars)', variant: 'destructive' });
      return;
    }
    setSendingReply(true);
    try {
      const { error } = await supabase.rpc('add_complaint_reply', {
        p_ticket: data.ticket_number,
        p_email: verifiedEmail,
        p_message: msg,
      });
      if (error) throw error;
      toast({ title: bn ? 'উত্তর যুক্ত হয়েছে' : 'Reply posted', description: bn ? 'আপনার বার্তা টাইমলাইনে যুক্ত হয়েছে' : 'Your message has been added to the timeline' });
      setReply('');
      await fetchComplaint(data.ticket_number, verifiedEmail);
    } catch (err: any) {
      toast({
        title: bn ? 'ত্রুটি' : 'Error',
        description: err?.message || (bn ? 'উত্তর পাঠানো যায়নি' : 'Could not send reply'),
        variant: 'destructive',
      });
    } finally {
      setSendingReply(false);
    }
  };

  const statusBadge = (status: string) => {
    const s = STATUS_VARIANT[status] || { bn: status, en: status, cls: 'bg-muted' };
    return (
      <Badge className={`${s.cls} border-0 rounded-full px-3 py-1 text-xs font-medium`}>
        {bn ? s.bn : s.en}
      </Badge>
    );
  };

  const fetchComplaint = async (tkt: string, mail: string) => {
    setLoading(true);
    setNotFound(false);
    setData(null);
    try {
      const { data: result, error } = await supabase.rpc('get_complaint_by_ticket', {
        p_ticket: tkt.trim(),
        p_email: mail.trim(),
      });
      if (error) throw error;
      if (!result) {
        setNotFound(true);
        return;
      }
      setData(result as unknown as ComplaintData);
    } catch (err: any) {
      toast({
        title: bn ? 'ত্রুটি' : 'Error',
        description: err?.message || (bn ? 'সার্ভার ত্রুটি' : 'Server error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket.trim()) {
      toast({ title: bn ? 'টিকিট নম্বর দিন' : 'Enter ticket number', variant: 'destructive' });
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({ title: bn ? 'সঠিক ইমেইল দিন' : 'Enter a valid email', variant: 'destructive' });
      return;
    }
    if (verifiedEmail.toLowerCase() === email.trim().toLowerCase()) {
      void fetchComplaint(ticket, email);
    } else {
      setOtpOpen(true);
    }
  };

  const handleOtpVerified = async () => {
    setOtpOpen(false);
    setVerifiedEmail(email.trim());
    await fetchComplaint(ticket, email);
  };

  const updateIcon = (type: ComplaintUpdate['update_type']) => {
    switch (type) {
      case 'created': return <Inbox className="w-4 h-4" />;
      case 'status_change': return <ArrowRightLeft className="w-4 h-4" />;
      case 'assignment': return <UserCheck className="w-4 h-4" />;
      case 'resolution': return <CheckCircle2 className="w-4 h-4" />;
      case 'reply': return <MessageCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const updateLabel = (u: ComplaintUpdate) => {
    if (u.update_type === 'created') return bn ? 'অভিযোগ জমা হয়েছে' : 'Complaint submitted';
    if (u.update_type === 'status_change') {
      const from = u.from_status ? (STATUS_VARIANT[u.from_status]?.[bn ? 'bn' : 'en'] || u.from_status) : '';
      const to = u.to_status ? (STATUS_VARIANT[u.to_status]?.[bn ? 'bn' : 'en'] || u.to_status) : '';
      return bn ? `স্ট্যাটাস: ${from} → ${to}` : `Status: ${from} → ${to}`;
    }
    if (u.update_type === 'assignment') return bn ? 'পর্যালোচনার জন্য অর্পণ করা হয়েছে' : 'Assigned for review';
    if (u.update_type === 'resolution') return bn ? 'সমাধান প্রদান করা হয়েছে' : 'Resolution provided';
    if (u.update_type === 'reply') return bn ? 'অভিযোগকারীর বার্তা' : 'Complainant reply';
    return bn ? 'আপডেট' : 'Update';
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-6">
          <Link to="/complaints" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> {bn ? 'অভিযোগ ফর্মে ফিরুন' : 'Back to complaint form'}
          </Link>
        </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Search className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-3">
            {bn ? 'অভিযোগ ট্র্যাকিং' : 'Track Your Complaint'}
          </h1>
          <p className="text-muted-foreground">
            {bn
              ? 'টিকিট নম্বর ও ইমেইল ভেরিফাই করে আপনার অভিযোগের সর্বশেষ অবস্থা দেখুন।'
              : 'Verify your ticket number and email to view the latest status of your complaint.'}
          </p>
        </div>

        <Card className="rounded-[38px] border-0 bg-card/80 backdrop-blur-xl shadow-2xl mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {bn ? 'টিকিট অনুসন্ধান' : 'Lookup Ticket'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'টিকিট নম্বর' : 'Ticket Number'} *</Label>
                <Input
                  value={ticket}
                  onChange={(e) => setTicket(e.target.value)}
                  placeholder="CMP-YYYY-XXXXX"
                  className="rounded-xl font-mono uppercase"
                  required
                />
              </div>
              <div>
                <Label>{bn ? 'নিবন্ধিত ইমেইল' : 'Registered Email'} *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (e.target.value.trim().toLowerCase() !== verifiedEmail.toLowerCase()) {
                      setVerifiedEmail('');
                      setData(null);
                    }
                  }}
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={loading} className="w-full rounded-2xl">
                  {loading
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Search className="w-4 h-4 mr-2" />}
                  {verifiedEmail.toLowerCase() === email.trim().toLowerCase() && verifiedEmail
                    ? (bn ? 'অনুসন্ধান করুন' : 'Search')
                    : (bn ? 'যাচাই করে দেখুন' : 'Verify & View')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {notFound && (
          <Card className="rounded-[38px] border-0 bg-rose-500/5 mb-8">
            <CardContent className="py-8 text-center">
              <p className="text-rose-600 dark:text-rose-400 font-medium">
                {bn
                  ? 'কোন অভিযোগ পাওয়া যায়নি। টিকিট নম্বর ও ইমেইল মিলিয়ে দেখুন।'
                  : 'No complaint found. Please check the ticket number and email.'}
              </p>
            </CardContent>
          </Card>
        )}

        {data && (
          <Card className="rounded-[38px] border-0 bg-card/80 backdrop-blur-xl shadow-2xl">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    {bn ? 'টিকিট' : 'Ticket'}
                  </p>
                  <CardTitle className="text-2xl font-mono">{data.ticket_number}</CardTitle>
                </div>
                {statusBadge(data.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{bn ? 'বিষয়' : 'Subject'}</p>
                  <p className="font-medium">{data.subject}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{bn ? 'ক্যাটাগরি' : 'Category'}</p>
                  <p className="font-medium capitalize">{data.category}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{bn ? 'অগ্রাধিকার' : 'Priority'}</p>
                  <p className="font-medium capitalize">{data.priority}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{bn ? 'জমাদানের তারিখ' : 'Submitted'}</p>
                  <p className="font-medium">{format(new Date(data.created_at), 'dd/MM/yyyy HH:mm')}</p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-2">{bn ? 'বিবরণ' : 'Description'}</p>
                <div className="rounded-2xl bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                  {data.description}
                </div>
              </div>

              {data.resolution_notes && (
                <div>
                  <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {bn ? 'সমাধান নোট' : 'Resolution Notes'}
                  </p>
                  <div className="rounded-2xl bg-emerald-500/10 p-4 text-sm whitespace-pre-wrap">
                    {data.resolution_notes}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {bn ? 'টাইমলাইন' : 'Timeline'}
                </p>
                <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
                  {data.updates.map((u) => (
                    <div key={u.id} className="relative">
                      <div className="absolute -left-[22px] top-0 w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center ring-4 ring-background">
                        {updateIcon(u.update_type)}
                      </div>
                      <div className="rounded-2xl border bg-background/50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-medium">{updateLabel(u)}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(u.created_at), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                        {u.message && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{u.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {data.updates.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {bn ? 'কোন আপডেট নেই' : 'No updates yet'}
                    </p>
                  )}
                </div>
              </div>

              {/* Complainant reply box */}
              <div className="rounded-2xl border bg-background/50 p-4">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <MessageSquarePlus className="w-4 h-4 text-primary" />
                  {bn ? 'উত্তর দিন বা অতিরিক্ত তথ্য যোগ করুন' : 'Reply or add more information'}
                </p>
                {canReply ? (
                  <>
                    <Textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={4}
                      maxLength={4000}
                      placeholder={bn
                        ? 'প্রশাসনের জন্য আপনার বার্তা বা অতিরিক্ত তথ্য লিখুন...'
                        : 'Write your message or additional details for the administration...'}
                      className="rounded-xl resize-none"
                      disabled={sendingReply}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                      <p className="text-xs text-muted-foreground">
                        {reply.length}/4000
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSendReply}
                        disabled={sendingReply || reply.trim().length < 2}
                        className="rounded-xl"
                      >
                        {sendingReply
                          ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          : <Send className="w-4 h-4 mr-2" />}
                        {bn ? 'উত্তর পাঠান' : 'Send Reply'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {bn
                      ? 'এই অভিযোগটি বন্ধ হয়েছে এবং নতুন উত্তর গ্রহণ করছে না।'
                      : 'This complaint is closed and no longer accepts new replies.'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <OtpVerificationDialog
        open={otpOpen}
        onOpenChange={setOtpOpen}
        email={email.trim()}
        purpose="email_verification"
        recipientName={bn ? 'অভিযোগকারী' : 'Complainant'}
        onVerified={handleOtpVerified}
        title={bn ? 'ইমেইল যাচাই' : 'Verify Email'}
        description={bn
          ? 'নিরাপত্তার জন্য আপনার ইমেইলে পাঠানো ৬-সংখ্যার কোড দিন'
          : 'For security, enter the 6-digit code sent to your email'}
      />
    </PublicLayout>
  );
};

export default ComplaintTrackPage;
