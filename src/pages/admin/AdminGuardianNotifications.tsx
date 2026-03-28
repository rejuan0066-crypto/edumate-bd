import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  MessageSquare, Send, Users, FileText, Loader2, Phone, Mail,
  CheckCircle2, XCircle, Clock, Filter, AlertCircle
} from 'lucide-react';

const AdminGuardianNotifications = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [activeTab, setActiveTab] = useState('send');
  const [channel, setChannel] = useState<'sms' | 'email'>('sms');
  const [templateType, setTemplateType] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewRecipients, setPreviewRecipients] = useState<any[]>([]);

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notification_templates').select('*').eq('is_active', true).order('template_type');
      if (error) throw error;
      return data;
    },
  });

  // Fetch divisions
  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch students with guardian info
  const { data: students = [] } = useQuery({
    queryKey: ['students-for-notify', divisionFilter],
    queryFn: async () => {
      let query = supabase.from('students').select('*, divisions(name, name_bn)').eq('status', 'active');
      if (divisionFilter !== 'all') query = query.eq('division_id', divisionFilter);
      const { data, error } = await query.order('name_bn');
      if (error) throw error;
      return data;
    },
  });

  // Fetch sent notifications history
  const { data: sentHistory = [] } = useQuery({
    queryKey: ['sent-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('guardian_notifications').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const filteredTemplates = templates.filter(t => t.channel === channel && (templateType ? t.template_type === templateType : true));

  const recipientsWithContact = students.filter(s => channel === 'sms' ? s.guardian_phone : s.email);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tpl = templates.find(t => t.id === templateId);
    if (tpl) {
      setMessage(bn ? tpl.body_bn : tpl.body);
      if (tpl.subject) setSubject(tpl.subject);
    }
  };

  const handlePreview = () => {
    setPreviewRecipients(recipientsWithContact.slice(0, 10));
    setShowPreview(true);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast({ title: bn ? 'বার্তা খালি' : 'Message empty', variant: 'destructive' });
      return;
    }
    if (recipientsWithContact.length === 0) {
      toast({ title: bn ? 'কোন প্রাপক নেই' : 'No recipients', description: bn ? `${channel === 'sms' ? 'অভিভাবকের ফোন নম্বর' : 'ইমেইল'} পাওয়া যায়নি` : `No ${channel === 'sms' ? 'guardian phone' : 'email'} found`, variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Store notification record
      const { error } = await supabase.from('guardian_notifications').insert({
        notification_type: templateType || 'general',
        channel,
        template_key: selectedTemplate || null,
        subject: channel === 'email' ? subject : null,
        message: message.trim(),
        recipient_filter: { division_id: divisionFilter } as any,
        recipients_count: recipientsWithContact.length,
        sent_count: recipientsWithContact.length,
        failed_count: 0,
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_by: session.user.id,
      });

      if (error) throw error;

      toast({
        title: bn ? 'বার্তা পাঠানো হয়েছে' : 'Notification Sent',
        description: bn
          ? `${recipientsWithContact.length} জন অভিভাবকের কাছে বার্তা কিউতে যোগ হয়েছে`
          : `Message queued for ${recipientsWithContact.length} guardians`,
      });

      setMessage('');
      setSubject('');
      setSelectedTemplate('');
      setShowPreview(false);
    } catch (error: any) {
      toast({ title: bn ? 'পাঠানো ব্যর্থ' : 'Send Failed', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            {bn ? 'অভিভাবক নোটিফিকেশন' : 'Guardian Notifications'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {bn ? 'অভিভাবকদের কাছে SMS ও ইমেইল বার্তা পাঠান' : 'Send SMS & Email messages to guardians'}
          </p>
        </div>

        {/* SMS/Email Config Notice */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{bn ? 'সেটআপ প্রয়োজন' : 'Setup Required'}</p>
              <p>{bn
                ? 'SMS পাঠাতে Twilio সংযোগ এবং ইমেইল পাঠাতে ইমেইল ডোমেইন সেটআপ করতে হবে। বর্তমানে বার্তাগুলো রেকর্ড হিসেবে সংরক্ষিত হবে।'
                : 'Connect Twilio for SMS and set up email domain for emails. Currently messages will be saved as records.'
              }</p>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger value="send" className="gap-1"><Send className="w-3.5 h-3.5" />{bn ? 'বার্তা পাঠান' : 'Send'}</TabsTrigger>
            <TabsTrigger value="history" className="gap-1"><Clock className="w-3.5 h-3.5" />{bn ? 'ইতিহাস' : 'History'}</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left: Compose */}
              <div className="lg:col-span-2 space-y-4">
                {/* Channel & Type */}
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label>{bn ? 'মাধ্যম' : 'Channel'}</Label>
                        <Select value={channel} onValueChange={(v) => { setChannel(v as 'sms' | 'email'); setSelectedTemplate(''); setMessage(''); }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sms"><div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />SMS</div></SelectItem>
                            <SelectItem value="email"><div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />{bn ? 'ইমেইল' : 'Email'}</div></SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{bn ? 'বিভাগ' : 'Division'}</Label>
                        <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{bn ? 'সকল বিভাগ' : 'All Divisions'}</SelectItem>
                            {divisions.map(d => (
                              <SelectItem key={d.id} value={d.id}>{bn ? d.name_bn : d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{bn ? 'ধরন' : 'Type'}</Label>
                        <Select value={templateType} onValueChange={(v) => { setTemplateType(v); setSelectedTemplate(''); }}>
                          <SelectTrigger><SelectValue placeholder={bn ? 'সব ধরন' : 'All types'} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fee_reminder">{bn ? 'ফি রিমাইন্ডার' : 'Fee Reminder'}</SelectItem>
                            <SelectItem value="attendance">{bn ? 'অনুপস্থিতি' : 'Attendance'}</SelectItem>
                            <SelectItem value="result">{bn ? 'ফলাফল' : 'Result'}</SelectItem>
                            <SelectItem value="general">{bn ? 'সাধারণ' : 'General'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Template Selection */}
                    {filteredTemplates.length > 0 && (
                      <div>
                        <Label>{bn ? 'টেমপ্লেট নির্বাচন' : 'Select Template'}</Label>
                        <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                          <SelectTrigger><SelectValue placeholder={bn ? 'টেমপ্লেট বাছাই করুন' : 'Choose a template'} /></SelectTrigger>
                          <SelectContent>
                            {filteredTemplates.map(t => (
                              <SelectItem key={t.id} value={t.id}>{bn ? t.name_bn : t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Subject (email only) */}
                    {channel === 'email' && (
                      <div>
                        <Label>{bn ? 'বিষয়' : 'Subject'}</Label>
                        <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={bn ? 'ইমেইলের বিষয়' : 'Email subject'} />
                      </div>
                    )}

                    {/* Message */}
                    <div>
                      <Label>{bn ? 'বার্তা' : 'Message'}</Label>
                      <Textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder={bn ? 'অভিভাবকদের কাছে পাঠানো বার্তা লিখুন...' : 'Write message to send to guardians...'}
                        rows={6}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {bn ? 'ভেরিয়েবল: {{student_name}}, {{student_id}}, {{roll}}, {{amount}}, {{month}}, {{date}}, {{exam_name}}, {{gpa}}' : 'Variables: {{student_name}}, {{student_id}}, {{roll}}, {{amount}}, {{month}}, {{date}}, {{exam_name}}, {{gpa}}'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handlePreview} disabled={!message.trim() || sending}>
                    <Users className="w-4 h-4 mr-2" />
                    {bn ? `প্রিভিউ (${recipientsWithContact.length} প্রাপক)` : `Preview (${recipientsWithContact.length} recipients)`}
                  </Button>
                  <Button onClick={handleSend} disabled={!message.trim() || sending || recipientsWithContact.length === 0}>
                    {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    {sending ? (bn ? 'পাঠানো হচ্ছে...' : 'Sending...') : (bn ? 'বার্তা পাঠান' : 'Send Message')}
                  </Button>
                </div>
              </div>

              {/* Right: Stats */}
              <div className="space-y-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{bn ? 'প্রাপক তথ্য' : 'Recipient Info'}</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{bn ? 'মোট ছাত্র' : 'Total Students'}</span>
                      <span className="font-medium">{students.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{channel === 'sms' ? (bn ? 'ফোন নম্বর আছে' : 'Has Phone') : (bn ? 'ইমেইল আছে' : 'Has Email')}</span>
                      <span className="font-medium text-emerald-600">{recipientsWithContact.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{channel === 'sms' ? (bn ? 'ফোন নম্বর নেই' : 'No Phone') : (bn ? 'ইমেইল নেই' : 'No Email')}</span>
                      <span className="font-medium text-destructive">{students.length - recipientsWithContact.length}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{bn ? 'আজকের সারাংশ' : "Today's Summary"}</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {(() => {
                      const today = new Date().toISOString().split('T')[0];
                      const todaySent = sentHistory.filter(n => n.sent_at?.startsWith(today));
                      const totalSent = todaySent.reduce((s, n) => s + (n.sent_count || 0), 0);
                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{bn ? 'পাঠানো বার্তা' : 'Messages Sent'}</span>
                            <span className="font-medium">{todaySent.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{bn ? 'মোট প্রাপক' : 'Total Recipients'}</span>
                            <span className="font-medium">{totalSent}</span>
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{bn ? 'টেমপ্লেট' : 'Templates'}</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    {templates.filter(t => t.channel === channel).map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleTemplateSelect(t.id)}
                        className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{bn ? t.name_bn : t.name}</span>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">{bn ? 'তারিখ' : 'Date'}</th>
                        <th className="text-left p-3 font-medium">{bn ? 'ধরন' : 'Type'}</th>
                        <th className="text-left p-3 font-medium">{bn ? 'মাধ্যম' : 'Channel'}</th>
                        <th className="text-left p-3 font-medium">{bn ? 'বার্তা' : 'Message'}</th>
                        <th className="text-center p-3 font-medium">{bn ? 'প্রাপক' : 'Recipients'}</th>
                        <th className="text-center p-3 font-medium">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sentHistory.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{bn ? 'কোন বার্তা পাঠানো হয়নি' : 'No messages sent yet'}</td></tr>
                      ) : sentHistory.map(n => (
                        <tr key={n.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 whitespace-nowrap">{n.sent_at ? new Date(n.sent_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US') : '-'}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {n.notification_type === 'fee_reminder' ? (bn ? 'ফি' : 'Fee') :
                               n.notification_type === 'attendance' ? (bn ? 'হাজিরা' : 'Attendance') :
                               n.notification_type === 'result' ? (bn ? 'ফলাফল' : 'Result') : (bn ? 'সাধারণ' : 'General')}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {n.channel === 'sms' ? <Phone className="w-4 h-4 text-blue-500" /> : <Mail className="w-4 h-4 text-purple-500" />}
                          </td>
                          <td className="p-3 max-w-[200px] truncate">{n.message}</td>
                          <td className="p-3 text-center">{n.recipients_count}</td>
                          <td className="p-3 text-center">
                            {n.status === 'sent' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> :
                             n.status === 'failed' ? <XCircle className="w-4 h-4 text-destructive mx-auto" /> :
                             <Clock className="w-4 h-4 text-amber-500 mx-auto" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{bn ? 'বার্তা প্রিভিউ' : 'Message Preview'}</DialogTitle>
            <DialogDescription>{bn ? `${recipientsWithContact.length} জন প্রাপকের কাছে পাঠানো হবে` : `Will be sent to ${recipientsWithContact.length} recipients`}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">{message}</div>
            <div className="text-xs font-medium text-muted-foreground">{bn ? 'প্রাপকদের নমুনা (প্রথম ১০):' : 'Sample recipients (first 10):'}</div>
            <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
              {previewRecipients.map(s => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{bn ? s.name_bn : (s.name_en || s.name_bn)}</span>
                  <span className="text-xs text-muted-foreground">{channel === 'sms' ? s.guardian_phone : s.email}</span>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {bn ? 'পাঠান' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminGuardianNotifications;
