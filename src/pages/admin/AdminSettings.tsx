import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';
import { Save, Shield, Bell, Palette, Mail, Loader2, Eye, EyeOff, Globe, ArrowRight, CheckCircle2, AlertCircle, Send, CreditCard, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import PaymentGatewaySettings from '@/components/admin/PaymentGatewaySettings';
import SmsGatewaySettings from '@/components/admin/SmsGatewaySettings';

const AdminSettings = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { canEditItem } = usePagePermissions('/admin/settings');
  const [emailProvider, setEmailProvider] = useState<'emailjs' | 'custom_domain'>('emailjs');
  const [settings, setSettings] = useState({
    twoFactorAuth: true,
    otpExpiry: '5',
    maxOtpAttempts: '3',
    emailNotifications: true,
    smsNotifications: false,
    autoApproveAdmission: false,
    maintenanceMode: false,
  });

  // EmailJS config
  const [emailjs, setEmailjs] = useState({
    service_id: '',
    template_id: '',
    public_key: '',
    is_enabled: false,
    otp_expiry_minutes: 10,
  });
  const [emailjsLoading, setEmailjsLoading] = useState(true);
  const [emailjsSaving, setEmailjsSaving] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [emailjsTesting, setEmailjsTesting] = useState(false);
  const [testEmailDialog, setTestEmailDialog] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  // SMTP config
  const [smtp, setSmtp] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
    is_enabled: false,
    use_tls: true,
  });
  const [smtpLoading, setSmtpLoading] = useState(true);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);

  useEffect(() => {
    loadEmailjsConfig();
    loadSmtpConfig();
  }, []);

  const loadEmailjsConfig = async () => {
    const { data } = await supabase
      .from('emailjs_config')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) {
      setEmailjs({
        service_id: data.service_id,
        template_id: data.template_id,
        public_key: data.public_key,
        is_enabled: data.is_enabled,
        otp_expiry_minutes: data.otp_expiry_minutes,
      });
    }
    setEmailjsLoading(false);
  };

  const saveEmailjsConfig = async () => {
    setEmailjsSaving(true);
    // Check if config exists
    const { data: existing } = await supabase
      .from('emailjs_config')
      .select('id')
      .limit(1)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from('emailjs_config')
        .update({ ...emailjs, updated_at: new Date().toISOString() })
        .eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('emailjs_config').insert(emailjs));
    }

    setEmailjsSaving(false);
    if (error) {
      toast.error(bn ? 'সংরক্ষণ ব্যর্থ' : 'Failed to save');
    } else {
      toast.success(bn ? 'ইমেইল সেটিংস সংরক্ষিত' : 'Email settings saved');
    }
  };

  const loadSmtpConfig = async () => {
    const { data } = await supabase
      .from('smtp_config')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) {
      setSmtp({
        smtp_host: data.smtp_host,
        smtp_port: data.smtp_port,
        smtp_username: data.smtp_username,
        smtp_password: data.smtp_password,
        from_email: data.from_email,
        from_name: data.from_name,
        is_enabled: data.is_enabled,
        use_tls: data.use_tls,
      });
      if (data.is_enabled) setEmailProvider('custom_domain');
    }
    setSmtpLoading(false);
  };

  const saveSmtpConfig = async () => {
    setSmtpSaving(true);
    const { data: existing } = await supabase
      .from('smtp_config')
      .select('id')
      .limit(1)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from('smtp_config')
        .update({ ...smtp, updated_at: new Date().toISOString() })
        .eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('smtp_config').insert(smtp));
    }

    setSmtpSaving(false);
    if (error) {
      toast.error(bn ? 'সংরক্ষণ ব্যর্থ' : 'Failed to save');
    } else {
      toast.success(bn ? 'SMTP সেটিংস সংরক্ষিত' : 'SMTP settings saved');
    }
  };

  const testSmtpConnection = async () => {
    if (!smtp.smtp_host || !smtp.smtp_username || !smtp.from_email) {
      toast.error(bn ? 'সব ফিল্ড পূরণ করুন' : 'Please fill all required fields');
      return;
    }
    setSmtpTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-smtp', {
        body: { ...smtp },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(bn ? 'SMTP সংযোগ সফল!' : 'SMTP connection successful!');
      } else {
        toast.error(data?.error || (bn ? 'সংযোগ ব্যর্থ' : 'Connection failed'));
      }
    } catch {
      toast.error(bn ? 'SMTP টেস্ট ব্যর্থ' : 'SMTP test failed');
    }
    setSmtpTesting(false);
  };

  const testEmailjs = async () => {
    if (!testEmail) {
      toast.error(bn ? 'টেস্ট ইমেইল দিন' : 'Enter test email');
      return;
    }
    if (!emailjs.service_id || !emailjs.template_id || !emailjs.public_key) {
      toast.error(bn ? 'প্রথমে EmailJS কনফিগারেশন সম্পূর্ণ করুন' : 'Complete EmailJS configuration first');
      return;
    }
    setEmailjsTesting(true);
    try {
      const { default: emailjsLib } = await import('@emailjs/browser');
      emailjsLib.init(emailjs.public_key);
      await emailjsLib.send(
        emailjs.service_id,
        emailjs.template_id,
        {
          to_email: testEmail,
          email: testEmail,
          reply_to: testEmail,
          to_name: 'Test User',
          otp_code: '123456',
          expiry_minutes: emailjs.otp_expiry_minutes,
          purpose: 'Test Email',
        }
      );
      toast.success(bn ? `✅ টেস্ট ইমেইল পাঠানো হয়েছে: ${testEmail}` : `✅ Test email sent to: ${testEmail}`);
      setTestEmailDialog(false);
    } catch (err: any) {
      console.error('EmailJS test error:', err);
      toast.error(bn ? `❌ ইমেইল পাঠানো ব্যর্থ: ${err?.text || err?.message || 'Unknown error'}` : `❌ Failed to send: ${err?.text || err?.message || 'Unknown error'}`);
    }
    setEmailjsTesting(false);
  };


  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">{bn ? 'সেটিংস' : 'Settings'}</h1>

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="email" className="gap-1.5">
              <Mail className="w-4 h-4" /> {bn ? 'ইমেইল' : 'Email'}
            </TabsTrigger>
            <TabsTrigger value="payment" className="gap-1.5">
              <CreditCard className="w-4 h-4" /> {bn ? 'পেমেন্ট' : 'Payment'}
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1.5">
              <MessageSquare className="w-4 h-4" /> {bn ? 'SMS' : 'SMS'}
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5">
              <Shield className="w-4 h-4" /> {bn ? 'নিরাপত্তা' : 'Security'}
            </TabsTrigger>
            <TabsTrigger value="general" className="gap-1.5">
              <Palette className="w-4 h-4" /> {bn ? 'সাধারণ' : 'General'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-6">
            <div className="space-y-6 max-w-3xl">

        {/* Email Provider Selection */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" /> {bn ? 'ইমেইল প্রোভাইডার' : 'Email Provider'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={() => setEmailProvider('emailjs')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                emailProvider === 'emailjs'
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-foreground">EmailJS (Gmail)</span>
                {emailProvider === 'emailjs' && <CheckCircle2 className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground">{bn ? 'ফ্রি — Gmail দিয়ে OTP পাঠান' : 'Free — Send OTP via Gmail'}</p>
              <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">
                {bn ? 'বর্তমান' : 'Current'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setEmailProvider('custom_domain')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                emailProvider === 'custom_domain'
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-foreground">{bn ? 'কাস্টম SMTP ডোমেইন' : 'Custom SMTP Domain'}</span>
                {emailProvider === 'custom_domain' && <CheckCircle2 className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground">{bn ? 'নিজের ডোমেইন থেকে ইমেইল পাঠান' : 'Send emails from your own domain'}</p>
              <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {bn ? 'প্রো' : 'Pro'}
              </span>
            </button>
          </div>
        </div>

        {/* Custom SMTP Configuration */}
        {emailProvider === 'custom_domain' && (
          <div className="card-elevated p-5">
            <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" /> {bn ? 'SMTP কনফিগারেশন' : 'SMTP Configuration'}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {bn
                ? 'আপনার ইমেইল প্রোভাইডারের SMTP সেটিংস দিন (যেমন: Gmail, Zoho, Outlook, বা যেকোনো কাস্টম ডোমেইন)।'
                : 'Enter your email provider SMTP settings (e.g., Gmail, Zoho, Outlook, or any custom domain).'}
            </p>

            {smtpLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{bn ? 'SMTP সক্রিয়' : 'SMTP Enabled'}</p>
                    <p className="text-xs text-muted-foreground">{bn ? 'কাস্টম SMTP দিয়ে ইমেইল পাঠানো চালু/বন্ধ' : 'Enable/disable custom SMTP emails'}</p>
                  </div>
                  <Switch
                    checked={smtp.is_enabled}
                    onCheckedChange={(v) => setSmtp({ ...smtp, is_enabled: v })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{bn ? 'SMTP হোস্ট' : 'SMTP Host'} <span className="text-destructive">*</span></Label>
                    <Input
                      className="mt-1 bg-background"
                      value={smtp.smtp_host}
                      onChange={(e) => setSmtp({ ...smtp, smtp_host: e.target.value })}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div>
                    <Label>{bn ? 'SMTP পোর্ট' : 'SMTP Port'} <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      className="mt-1 bg-background"
                      value={smtp.smtp_port}
                      onChange={(e) => setSmtp({ ...smtp, smtp_port: parseInt(e.target.value) || 587 })}
                      placeholder="587"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{bn ? 'SMTP ইউজারনেম' : 'SMTP Username'} <span className="text-destructive">*</span></Label>
                    <Input
                      className="mt-1 bg-background"
                      value={smtp.smtp_username}
                      onChange={(e) => setSmtp({ ...smtp, smtp_username: e.target.value })}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <Label>{bn ? 'SMTP পাসওয়ার্ড' : 'SMTP Password'} <span className="text-destructive">*</span></Label>
                    <div className="relative mt-1">
                      <Input
                        className="bg-background pr-10"
                        type={showSmtpPassword ? 'text' : 'password'}
                        value={smtp.smtp_password}
                        onChange={(e) => setSmtp({ ...smtp, smtp_password: e.target.value })}
                        placeholder={bn ? 'অ্যাপ পাসওয়ার্ড ব্যবহার করুন' : 'Use app password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{bn ? 'প্রেরকের ইমেইল' : 'From Email'} <span className="text-destructive">*</span></Label>
                    <Input
                      className="mt-1 bg-background"
                      value={smtp.from_email}
                      onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })}
                      placeholder="noreply@yourdomain.com"
                    />
                  </div>
                  <div>
                    <Label>{bn ? 'প্রেরকের নাম' : 'From Name'}</Label>
                    <Input
                      className="mt-1 bg-background"
                      value={smtp.from_name}
                      onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })}
                      placeholder={bn ? 'আপনার প্রতিষ্ঠানের নাম' : 'Your Institution Name'}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{bn ? 'TLS/SSL ব্যবহার করুন' : 'Use TLS/SSL'}</p>
                    <p className="text-xs text-muted-foreground">{bn ? 'নিরাপদ সংযোগ (সাধারণত চালু রাখুন)' : 'Secure connection (usually keep on)'}</p>
                  </div>
                  <Switch
                    checked={smtp.use_tls}
                    onCheckedChange={(v) => setSmtp({ ...smtp, use_tls: v })}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveSmtpConfig} disabled={smtpSaving} className="btn-primary-gradient flex-1">
                    {smtpSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {bn ? 'SMTP সেটিংস সংরক্ষণ' : 'Save SMTP Settings'}
                  </Button>
                  <Button onClick={testSmtpConnection} disabled={smtpTesting} variant="outline">
                    {smtpTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                    {bn ? 'টেস্ট' : 'Test'}
                  </Button>
                </div>

                <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-2">
                  <p className="font-medium text-foreground">{bn ? 'সাধারণ SMTP সেটিংস:' : 'Common SMTP Settings:'}</p>
                  <div className="space-y-1">
                    <p><span className="font-medium">Gmail:</span> smtp.gmail.com : 587 (TLS) — {bn ? 'অ্যাপ পাসওয়ার্ড প্রয়োজন' : 'App password required'}</p>
                    <p><span className="font-medium">Zoho:</span> smtp.zoho.com : 587 (TLS)</p>
                    <p><span className="font-medium">Outlook:</span> smtp.office365.com : 587 (TLS)</p>
                    <p><span className="font-medium">Yahoo:</span> smtp.mail.yahoo.com : 587 (TLS)</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* EmailJS Configuration */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" /> {bn ? 'ইমেইল সার্ভিস (EmailJS)' : 'Email Service (EmailJS)'}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {bn
              ? 'EmailJS ব্যবহার করে OTP ইমেইল পাঠানো হবে। emailjs.com থেকে ফ্রি অ্যাকাউন্ট তৈরি করে Service ID, Template ID এবং Public Key সংগ্রহ করুন।'
              : 'OTP emails will be sent via EmailJS. Create a free account at emailjs.com and get your Service ID, Template ID, and Public Key.'}
          </p>

          {emailjsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-sm font-medium text-foreground">{bn ? 'ইমেইল সার্ভিস সক্রিয়' : 'Email Service Enabled'}</p>
                  <p className="text-xs text-muted-foreground">{bn ? 'OTP ইমেইল পাঠানো চালু/বন্ধ' : 'Enable/disable OTP emails'}</p>
                </div>
                <Switch
                  checked={emailjs.is_enabled}
                  onCheckedChange={(v) => setEmailjs({ ...emailjs, is_enabled: v })}
                />
              </div>

              <div>
                <Label>{bn ? 'সার্ভিস আইডি' : 'Service ID'}</Label>
                <Input
                  className="mt-1 bg-background"
                  value={emailjs.service_id}
                  onChange={(e) => setEmailjs({ ...emailjs, service_id: e.target.value })}
                  placeholder="service_xxxxxxx"
                />
              </div>

              <div>
                <Label>{bn ? 'টেমপ্লেট আইডি' : 'Template ID'}</Label>
                <Input
                  className="mt-1 bg-background"
                  value={emailjs.template_id}
                  onChange={(e) => setEmailjs({ ...emailjs, template_id: e.target.value })}
                  placeholder="template_xxxxxxx"
                />
              </div>

              <div>
                <Label>{bn ? 'পাবলিক কী' : 'Public Key'}</Label>
                <div className="relative mt-1">
                  <Input
                    className="bg-background pr-10"
                    type={showPublicKey ? 'text' : 'password'}
                    value={emailjs.public_key}
                    onChange={(e) => setEmailjs({ ...emailjs, public_key: e.target.value })}
                    placeholder="xxxxxxxxxxxxxxx"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPublicKey(!showPublicKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPublicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label>{bn ? 'OTP মেয়াদ (মিনিট)' : 'OTP Expiry (minutes)'}</Label>
                <Input
                  type="number"
                  className="mt-1 bg-background"
                  value={emailjs.otp_expiry_minutes}
                  onChange={(e) => setEmailjs({ ...emailjs, otp_expiry_minutes: parseInt(e.target.value) || 10 })}
                  min={2}
                  max={30}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={saveEmailjsConfig} disabled={emailjsSaving} className="btn-primary-gradient flex-1">
                  {emailjsSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {bn ? 'ইমেইল সেটিংস সংরক্ষণ' : 'Save Email Settings'}
                </Button>
                <Button onClick={() => setTestEmailDialog(true)} variant="outline">
                  <Send className="w-4 h-4 mr-2" />
                  {bn ? 'টেস্ট ইমেইল' : 'Test Email'}
                </Button>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">{bn ? 'EmailJS টেমপ্লেটে এই ভেরিয়েবল ব্যবহার করুন:' : 'Use these variables in your EmailJS template:'}</p>
                <code className="block">{'{{to_email}}'} — {bn ? 'প্রাপকের ইমেইল' : 'Recipient email'}</code>
                <code className="block">{'{{to_name}}'} — {bn ? 'প্রাপকের নাম' : 'Recipient name'}</code>
                <code className="block">{'{{otp_code}}'} — {bn ? 'ভেরিফিকেশন কোড' : 'Verification code'}</code>
                <code className="block">{'{{expiry_minutes}}'} — {bn ? 'মেয়াদ (মিনিট)' : 'Expiry time'}</code>
                <code className="block">{'{{purpose}}'} — {bn ? 'উদ্দেশ্য' : 'Purpose'}</code>
              </div>
            </div>
          )}
        </div>
            </div>

          </TabsContent>

          <TabsContent value="payment" className="mt-6">
            <PaymentGatewaySettings />
          </TabsContent>

          <TabsContent value="sms" className="mt-6">
            <SmsGatewaySettings />
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <div className="space-y-6 max-w-3xl">
              <div className="card-elevated p-5">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> {bn ? 'নিরাপত্তা' : 'Security'}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">{bn ? 'টু-ফ্যাক্টর OTP যাচাই' : '2FA OTP Verification'}</p>
                      <p className="text-xs text-muted-foreground">{bn ? 'লগইনের পর মোবাইলে OTP পাঠানো হবে' : 'Send OTP to mobile after login'}</p>
                    </div>
                    <Switch checked={settings.twoFactorAuth} onCheckedChange={(v) => setSettings({...settings, twoFactorAuth: v})} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>{bn ? 'OTP মেয়াদ (মিনিট)' : 'OTP Expiry (minutes)'}</Label>
                      <Input type="number" className="bg-background mt-1" value={settings.otpExpiry} onChange={(e) => setSettings({...settings, otpExpiry: e.target.value})} min={2} max={10} />
                    </div>
                    <div>
                      <Label>{bn ? 'সর্বোচ্চ OTP চেষ্টা' : 'Max OTP Attempts'}</Label>
                      <Input type="number" className="bg-background mt-1" value={settings.maxOtpAttempts} onChange={(e) => setSettings({...settings, maxOtpAttempts: e.target.value})} min={3} max={5} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-elevated p-5">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> {bn ? 'নোটিফিকেশন' : 'Notifications'}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm font-medium text-foreground">{bn ? 'ইমেইল নোটিফিকেশন' : 'Email Notifications'}</span>
                    <Switch checked={settings.emailNotifications} onCheckedChange={(v) => setSettings({...settings, emailNotifications: v})} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm font-medium text-foreground">{bn ? 'SMS নোটিফিকেশন' : 'SMS Notifications'}</span>
                    <Switch checked={settings.smsNotifications} onCheckedChange={(v) => setSettings({...settings, smsNotifications: v})} />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="general" className="mt-6">
            <div className="space-y-6 max-w-3xl">
              <div className="card-elevated p-5">
                <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2"><Palette className="w-5 h-5 text-primary" /> {bn ? 'সাধারণ' : 'General'}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">{bn ? 'ভর্তি স্বয়ংক্রিয় অনুমোদন' : 'Auto Approve Admission'}</p>
                      <p className="text-xs text-muted-foreground">{bn ? 'বন্ধ থাকলে অ্যাডমিন ম্যানুয়ালি অনুমোদন দিবেন' : 'If off, admin approves manually'}</p>
                    </div>
                    <Switch checked={settings.autoApproveAdmission} onCheckedChange={(v) => setSettings({...settings, autoApproveAdmission: v})} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">{bn ? 'মেইনটেন্যান্স মোড' : 'Maintenance Mode'}</p>
                      <p className="text-xs text-muted-foreground">{bn ? 'চালু থাকলে ওয়েবসাইট বন্ধ থাকবে' : 'If on, website will be offline'}</p>
                    </div>
                    <Switch checked={settings.maintenanceMode} onCheckedChange={(v) => setSettings({...settings, maintenanceMode: v})} />
                  </div>
                </div>
              </div>
              <Button className="btn-primary-gradient w-full" onClick={() => toast.success(bn ? 'সেটিংস সংরক্ষিত' : 'Settings saved')}>
                <Save className="w-4 h-4 mr-2" /> {bn ? 'সকল সেটিংস সংরক্ষণ করুন' : 'Save All Settings'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Test Email Dialog */}
      <Dialog open={testEmailDialog} onOpenChange={setTestEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              {bn ? 'EmailJS টেস্ট ইমেইল পাঠান' : 'Send EmailJS Test Email'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {bn 
                ? 'একটি টেস্ট OTP ইমেইল (কোড: 123456) পাঠানো হবে। ইমেইল আসলে EmailJS সঠিকভাবে কাজ করছে।'
                : 'A test OTP email (code: 123456) will be sent. If received, EmailJS is working correctly.'}
            </p>
            <div>
              <Label>{bn ? 'প্রাপকের ইমেইল' : 'Recipient Email'}</Label>
              <Input
                className="mt-1"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder={bn ? 'আপনার ইমেইল দিন' : 'Enter your email'}
              />
            </div>
            <Button onClick={testEmailjs} disabled={emailjsTesting} className="w-full btn-primary-gradient">
              {emailjsTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {bn ? 'টেস্ট ইমেইল পাঠান' : 'Send Test Email'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSettings;
