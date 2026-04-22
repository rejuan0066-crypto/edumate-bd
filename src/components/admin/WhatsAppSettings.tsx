import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, MessageCircle, Save, ExternalLink, Phone, Send, CheckCircle2, XCircle } from 'lucide-react';
import { buildWhatsAppUrl } from '@/hooks/useWhatsAppConfig';

const WhatsAppSettings = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['whatsapp-config-admin'],
    queryFn: async () => {
      const { data } = await supabase.from('whatsapp_config').select('*').limit(1).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    phone_number: '',
    welcome_message: '',
    button_label: '',
    show_floating_button: true,
    button_position: 'bottom-right' as 'bottom-right' | 'bottom-left',
    business_hours: '',
    away_message: '',
    cloud_api_enabled: false,
    phone_number_id: '',
    business_account_id: '',
    default_language: 'bn',
  });
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState(
    bn ? 'এটি একটি টেস্ট মেসেজ। WhatsApp Cloud API সঠিকভাবে কনফিগার করা হয়েছে।' : 'This is a test message. WhatsApp Cloud API is correctly configured.'
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; messageId?: string; error?: string; sentAt?: string } | null>(null);

  const handleTest = async () => {
    if (!testPhone.trim()) {
      toast({ title: bn ? 'ফোন নম্বর দিন' : 'Enter a phone number', variant: 'destructive' });
      return;
    }
    if (!testMessage.trim()) {
      toast({ title: bn ? 'মেসেজ দিন' : 'Enter a message', variant: 'destructive' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { recipients: [testPhone.trim()], message: testMessage.trim() },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      const ok = !!result?.success;
      setTestResult({
        success: ok,
        messageId: result?.messageId,
        error: result?.error || (ok ? undefined : data?.error),
        sentAt: new Date().toLocaleString(bn ? 'bn-BD' : 'en-US'),
      });
      toast({
        title: ok ? (bn ? 'মেসেজ পাঠানো হয়েছে' : 'Message sent') : (bn ? 'পাঠানো ব্যর্থ' : 'Send failed'),
        description: ok ? (bn ? 'WhatsApp এ চেক করুন' : 'Check WhatsApp inbox') : (result?.error || data?.error),
        variant: ok ? 'default' : 'destructive',
      });
    } catch (err: any) {
      setTestResult({ success: false, error: err.message, sentAt: new Date().toLocaleString(bn ? 'bn-BD' : 'en-US') });
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    if (config) {
      setForm({
        phone_number: config.phone_number || '',
        welcome_message: config.welcome_message || '',
        button_label: config.button_label || '',
        show_floating_button: config.show_floating_button ?? true,
        button_position: (config.button_position as any) || 'bottom-right',
        business_hours: config.business_hours || '',
        away_message: config.away_message || '',
        cloud_api_enabled: config.cloud_api_enabled ?? false,
        phone_number_id: config.phone_number_id || '',
        business_account_id: config.business_account_id || '',
        default_language: config.default_language || 'bn',
      });
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (config?.id) {
        const { error } = await supabase.from('whatsapp_config').update(form).eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('whatsapp_config').insert(form);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ['whatsapp-config'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-config-admin'] });
      toast({ title: bn ? 'সংরক্ষিত হয়েছে' : 'Saved' });
    } catch (err: any) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const previewUrl = form.phone_number ? buildWhatsAppUrl(form.phone_number, form.welcome_message) : '';

  return (
    <div className="space-y-4">
      {/* Click-to-Chat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            {bn ? 'WhatsApp ফ্লোটিং বাটন (Click-to-Chat)' : 'WhatsApp Floating Button'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <div>
              <Label>{bn ? 'ফ্লোটিং বাটন দেখান' : 'Show floating button'}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {bn ? 'ওয়েবসাইটের সব পেজে নিচে WhatsApp আইকন দেখাবে' : 'Show WhatsApp icon on all public pages'}
              </p>
            </div>
            <Switch
              checked={form.show_floating_button}
              onCheckedChange={(v) => setForm({ ...form, show_floating_button: v })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{bn ? 'WhatsApp নম্বর' : 'WhatsApp number'} *</Label>
              <Input
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="+8801XXXXXXXXX"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {bn ? 'কান্ট্রি কোডসহ (যেমন: +880)' : 'Include country code (e.g., +880)'}
              </p>
            </div>
            <div>
              <Label>{bn ? 'বাটনের অবস্থান' : 'Button position'}</Label>
              <Select value={form.button_position} onValueChange={(v: any) => setForm({ ...form, button_position: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">{bn ? 'নিচে-ডান' : 'Bottom Right'}</SelectItem>
                  <SelectItem value="bottom-left">{bn ? 'নিচে-বাম' : 'Bottom Left'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{bn ? 'স্বাগত বার্তা (Pre-filled message)' : 'Welcome message (Pre-filled)'}</Label>
            <Textarea
              value={form.welcome_message}
              onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
              rows={3}
              placeholder={bn ? 'আসসালামু আলাইকুম, আমি জানতে চাই...' : 'Hello, I would like to know...'}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {bn ? 'ব্যবহারকারীর WhatsApp এ এই বার্তাটি অটো-ফিল হয়ে যাবে' : "This message will be auto-filled in user's WhatsApp"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{bn ? 'বাটন লেবেল' : 'Button label'}</Label>
              <Input
                value={form.button_label}
                onChange={(e) => setForm({ ...form, button_label: e.target.value })}
                placeholder={bn ? 'WhatsApp এ চ্যাট' : 'Chat on WhatsApp'}
              />
            </div>
            <div>
              <Label>{bn ? 'অফিস টাইম (ঐচ্ছিক)' : 'Business hours (optional)'}</Label>
              <Input
                value={form.business_hours}
                onChange={(e) => setForm({ ...form, business_hours: e.target.value })}
                placeholder={bn ? 'সকাল ৯টা - সন্ধ্যা ৬টা' : '9 AM - 6 PM'}
              />
            </div>
          </div>

          {previewUrl && (
            <div className="p-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-between">
              <div className="text-xs">
                <p className="font-medium text-foreground">{bn ? 'প্রিভিউ লিংক:' : 'Preview link:'}</p>
                <p className="text-muted-foreground truncate max-w-[280px]">{previewUrl}</p>
              </div>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />{bn ? 'টেস্ট' : 'Test'}
                </Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cloud API */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {bn ? 'Meta WhatsApp Cloud API (Bulk মেসেজিং)' : 'Meta WhatsApp Cloud API (Bulk Messaging)'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-xs text-muted-foreground">
            <p>{bn
              ? 'Bulk মেসেজ পাঠাতে Meta Business Suite এ গিয়ে WhatsApp Business Account তৈরি করতে হবে। এরপর Phone Number ID ও Access Token সংগ্রহ করে এখানে যোগ করুন। Access Token আলাদাভাবে সিকিউর সিক্রেট হিসেবে স্টোর করতে হবে।'
              : 'To send bulk messages, create a WhatsApp Business Account in Meta Business Suite. Get the Phone Number ID and Access Token, then add them here. The Access Token must be stored as a secure secret.'}</p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <div>
              <Label>{bn ? 'Cloud API চালু' : 'Enable Cloud API'}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {bn ? 'গার্ডিয়ান নোটিফিকেশনে WhatsApp চ্যানেল ব্যবহার করতে পারবেন' : 'Use WhatsApp channel in Guardian Notifications'}
              </p>
            </div>
            <Switch
              checked={form.cloud_api_enabled}
              onCheckedChange={(v) => setForm({ ...form, cloud_api_enabled: v })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Phone Number ID</Label>
              <Input
                value={form.phone_number_id}
                onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
                placeholder="123456789012345"
              />
            </div>
            <div>
              <Label>Business Account ID</Label>
              <Input
                value={form.business_account_id}
                onChange={(e) => setForm({ ...form, business_account_id: e.target.value })}
                placeholder="987654321098765"
              />
            </div>
          </div>

          <div>
            <Label>{bn ? 'ডিফল্ট ভাষা' : 'Default language'}</Label>
            <Select value={form.default_language} onValueChange={(v) => setForm({ ...form, default_language: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bn">বাংলা</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="en_US">English (US)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Test WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="w-4 h-4 text-[#25D366]" />
            {bn ? 'টেস্ট WhatsApp মেসেজ পাঠান' : 'Send Test WhatsApp Message'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-xl bg-muted/50 text-xs text-muted-foreground">
            {bn
              ? 'যেকোনো গার্ডিয়ান বা স্টাফের নম্বরে টেস্ট মেসেজ পাঠিয়ে Cloud API কনফিগারেশন যাচাই করুন। নম্বরটি অবশ্যই কান্ট্রি কোডসহ E.164 ফরম্যাটে দিতে হবে (যেমন: +8801XXXXXXXXX)।'
              : 'Verify your Cloud API setup by sending a test message to any guardian or staff number. Use E.164 format with country code (e.g., +8801XXXXXXXXX).'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {bn ? 'প্রাপকের নম্বর' : 'Recipient phone'} *
              </Label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+8801XXXXXXXXX"
                disabled={testing}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleTest}
                disabled={testing || !form.cloud_api_enabled || !form.phone_number_id}
                className="w-full gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {testing ? (bn ? 'পাঠানো হচ্ছে...' : 'Sending...') : (bn ? 'টেস্ট পাঠান' : 'Send Test')}
              </Button>
            </div>
          </div>

          <div>
            <Label>{bn ? 'টেস্ট মেসেজ' : 'Test message'}</Label>
            <Textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={3}
              disabled={testing}
            />
          </div>

          {(!form.cloud_api_enabled || !form.phone_number_id) && (
            <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-xs text-muted-foreground">
              {bn
                ? '⚠️ টেস্ট পাঠানোর আগে Cloud API চালু করুন এবং Phone Number ID যোগ করে সংরক্ষণ করুন।'
                : '⚠️ Enable Cloud API and save a Phone Number ID before testing.'}
            </div>
          )}

          {testResult && (
            <div
              className={`p-4 rounded-xl border ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-destructive/10 border-destructive/30'
              }`}
            >
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1.5 text-xs">
                  <p className="font-semibold text-sm text-foreground">
                    {testResult.success
                      ? bn ? 'সফলভাবে পাঠানো হয়েছে' : 'Successfully delivered to Meta'
                      : bn ? 'মেসেজ পাঠানো ব্যর্থ' : 'Message delivery failed'}
                  </p>
                  {testResult.sentAt && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">{bn ? 'সময়:' : 'Time:'}</span> {testResult.sentAt}
                    </p>
                  )}
                  {testResult.messageId && (
                    <p className="text-muted-foreground break-all">
                      <span className="font-medium">{bn ? 'মেসেজ আইডি:' : 'Message ID:'}</span>{' '}
                      <code className="text-[10px] bg-background/50 px-1.5 py-0.5 rounded">{testResult.messageId}</code>
                    </p>
                  )}
                  {testResult.error && (
                    <p className="text-destructive">
                      <span className="font-medium">{bn ? 'ত্রুটি:' : 'Error:'}</span> {testResult.error}
                    </p>
                  )}
                  {testResult.success && (
                    <p className="text-muted-foreground italic mt-2">
                      {bn
                        ? 'প্রাপকের WhatsApp ইনবক্সে মেসেজ চেক করুন। ২৪ ঘণ্টার সেশন উইন্ডোর বাইরে শুধু approved টেমপ্লেট মেসেজ পাঠানো যাবে।'
                        : 'Check the recipient\'s WhatsApp inbox. Outside the 24-hour session window, only approved template messages can be delivered.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {bn ? 'সংরক্ষণ করুন' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default WhatsAppSettings;
