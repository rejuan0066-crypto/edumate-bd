import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';
import { Save, Shield, Bell, Palette, Mail, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const AdminSettings = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
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

  useEffect(() => {
    loadEmailjsConfig();
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

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-display font-bold text-foreground">{bn ? 'সেটিংস' : 'Settings'}</h1>

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

              <Button onClick={saveEmailjsConfig} disabled={emailjsSaving} className="btn-primary-gradient">
                {emailjsSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {bn ? 'ইমেইল সেটিংস সংরক্ষণ' : 'Save Email Settings'}
              </Button>

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

        {/* Security */}
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

        {/* Notifications */}
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

        {/* General */}
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
    </AdminLayout>
  );
};

export default AdminSettings;
