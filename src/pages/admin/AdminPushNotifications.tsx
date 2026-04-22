import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Bell, KeyRound, Send, Smartphone, Loader2, CheckCircle2, XCircle, Sparkles, Copy } from 'lucide-react';
import { format } from 'date-fns';

const AdminPushNotifications = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { toast } = useToast();
  const qc = useQueryClient();

  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('/');
  const [sending, setSending] = useState(false);

  // Load current public key
  useEffect(() => {
    supabase
      .from('website_settings')
      .select('value')
      .eq('key', 'push_vapid_public_key')
      .maybeSingle()
      .then(({ data }) => {
        const v = (data?.value as any)?.key;
        if (v) setPublicKey(v);
      });
  }, []);

  // Active subscriptions count
  const { data: subs = [] } = useQuery({
    queryKey: ['push-subs-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id, user_agent, is_active, last_used_at, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Recent push log
  const { data: logs = [] } = useQuery({
    queryKey: ['push-log-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('push_notification_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const generateKeys = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-vapid');
      if (error) throw error;
      setPublicKey(data.publicKey);
      setPrivateKey(data.privateKey);
      toast({
        title: bn ? 'কী জেনারেট হয়েছে' : 'Keys generated',
        description: bn ? 'নিচের প্রাইভেট কী কপি করে সেক্রেটে যোগ করুন' : 'Copy private key and add to secrets',
      });
    } catch (e: any) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const savePublicKey = async () => {
    setSavingKey(true);
    try {
      const { error } = await supabase.from('website_settings').upsert(
        { key: 'push_vapid_public_key', value: { key: publicKey } as any, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) throw error;
      toast({ title: bn ? 'পাবলিক কী সেভ হয়েছে' : 'Public key saved' });
    } catch (e: any) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSavingKey(false);
    }
  };

  const sendBroadcast = async () => {
    if (!title.trim()) {
      toast({ title: bn ? 'শিরোনাম প্রয়োজন' : 'Title required', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: { title, body, link, target: 'all', category: 'broadcast' },
      });
      if (error) throw error;
      toast({
        title: bn ? 'পাঠানো হয়েছে' : 'Sent',
        description: `${data.sent} successful, ${data.failed} failed`,
      });
      setTitle(''); setBody('');
      qc.invalidateQueries({ queryKey: ['push-log-admin'] });
    } catch (e: any) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: bn ? 'কপি হয়েছে' : 'Copied' });
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            {bn ? 'পুশ নোটিফিকেশন' : 'Push Notifications'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {bn ? 'মোবাইল ও ব্রাউজার পুশ নোটিফিকেশন কনফিগার ও পাঠান' : 'Configure and send web push notifications to subscribed devices'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="rounded-[24px]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10"><Smartphone className="w-5 h-5 text-primary" /></div>
              <div>
                <div className="text-2xl font-bold">{subs.length}</div>
                <div className="text-xs text-muted-foreground">{bn ? 'সক্রিয় সাবস্ক্রাইবার' : 'Active Subscribers'}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[24px]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
              <div>
                <div className="text-2xl font-bold">{logs.reduce((s, l) => s + (l.sent_count || 0), 0)}</div>
                <div className="text-xs text-muted-foreground">{bn ? 'মোট পাঠানো' : 'Total Sent'}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-[24px]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-destructive/10"><XCircle className="w-5 h-5 text-destructive" /></div>
              <div>
                <div className="text-2xl font-bold">{logs.reduce((s, l) => s + (l.failed_count || 0), 0)}</div>
                <div className="text-xs text-muted-foreground">{bn ? 'ব্যর্থ' : 'Failed'}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* VAPID setup */}
        <Card className="rounded-[24px]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4" /> {bn ? 'VAPID কী সেটআপ' : 'VAPID Key Setup'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {bn
                ? '১. "জেনারেট করুন" চাপুন। ২. পাবলিক কী সেভ করুন। ৩. প্রাইভেট কী কপি করে Lovable Cloud Secrets-এ VAPID_PRIVATE_KEY এবং VAPID_PUBLIC_KEY হিসেবে যোগ করুন।'
                : '1. Click Generate. 2. Save public key. 3. Copy private key & add to Lovable Cloud Secrets as VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={generateKeys} disabled={generating} variant="outline" className="rounded-xl">
                {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {bn ? 'নতুন কী জেনারেট করুন' : 'Generate New Keys'}
              </Button>
            </div>

            <div>
              <Label className="text-xs">{bn ? 'পাবলিক কী' : 'Public Key'}</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  placeholder="BLc..."
                  className="rounded-xl font-mono text-xs"
                />
                <Button onClick={() => copyToClipboard(publicKey)} variant="outline" size="icon" className="rounded-xl shrink-0" disabled={!publicKey}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button onClick={savePublicKey} disabled={!publicKey || savingKey} className="rounded-xl shrink-0">
                  {savingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : (bn ? 'সেভ' : 'Save')}
                </Button>
              </div>
            </div>

            {privateKey && (
              <div>
                <Label className="text-xs text-destructive flex items-center gap-1">
                  {bn ? 'প্রাইভেট কী (Lovable Cloud Secrets-এ যোগ করুন, এখানে স্টোর হবে না)' : 'Private Key (Add to Lovable Cloud Secrets, NOT stored here)'}
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input value={privateKey} readOnly className="rounded-xl font-mono text-xs" />
                  <Button onClick={() => copyToClipboard(privateKey)} variant="outline" size="icon" className="rounded-xl shrink-0">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {bn ? 'পেজ রিফ্রেশ করলে এই কী হারিয়ে যাবে। এখনই কপি করে Secrets-এ যোগ করুন।' : 'This key will be lost on refresh. Copy and add to Secrets now.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Broadcast */}
        <Card className="rounded-[24px]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4" /> {bn ? 'নোটিফিকেশন পাঠান' : 'Send Notification'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">{bn ? 'শিরোনাম' : 'Title'} *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl mt-1" placeholder={bn ? 'গুরুত্বপূর্ণ নোটিশ' : 'Important Notice'} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'বার্তা' : 'Message'}</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="rounded-xl mt-1" placeholder={bn ? 'বিস্তারিত লিখুন...' : 'Write the message...'} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'ক্লিক লিংক' : 'Click Link'}</Label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} className="rounded-xl mt-1" placeholder="/notices" />
            </div>
            <Button onClick={sendBroadcast} disabled={sending || !title.trim()} className="w-full rounded-xl btn-primary-gradient">
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {bn ? `সবাইকে পাঠান (${subs.length})` : `Send to All (${subs.length})`}
            </Button>
          </CardContent>
        </Card>

        {/* Recent log */}
        <Card className="rounded-[24px]">
          <CardHeader>
            <CardTitle className="text-base">{bn ? 'সাম্প্রতিক পুশ লগ' : 'Recent Push Log'}</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{bn ? 'কোনো লগ নেই' : 'No logs yet'}</p>
            ) : (
              <div className="space-y-2">
                {logs.map((l) => (
                  <div key={l.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/30 transition">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{l.title}</div>
                      {l.body && <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{l.body}</div>}
                      <div className="text-[10px] text-muted-foreground mt-1">{format(new Date(l.created_at), 'dd/MM/yyyy HH:mm')}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">✓ {l.sent_count}</Badge>
                      {l.failed_count > 0 && <Badge variant="destructive" className="text-[10px]">✗ {l.failed_count}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminPushNotifications;
