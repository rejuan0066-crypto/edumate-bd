import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';
import { Save, Shield, Bell, Palette } from 'lucide-react';
import { toast } from 'sonner';

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

  // Email change state
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setCurrentEmail(user.email);
    };
    getUser();
  }, []);

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      toast.error(bn ? 'নতুন ইমেইল দিন' : 'Enter new email');
      return;
    }
    if (!emailPassword.trim()) {
      toast.error(bn ? 'বর্তমান পাসওয়ার্ড দিন' : 'Enter current password');
      return;
    }
    if (newEmail === currentEmail) {
      toast.error(bn ? 'নতুন ইমেইল বর্তমান ইমেইলের মতো' : 'New email is same as current');
      return;
    }

    setChangingEmail(true);

    // Re-authenticate with current password first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password: emailPassword,
    });

    if (signInError) {
      toast.error(bn ? 'পাসওয়ার্ড ভুল' : 'Incorrect password');
      setChangingEmail(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setChangingEmail(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(
        bn
          ? `${newEmail} এ একটি ভেরিফিকেশন লিংক পাঠানো হয়েছে। লিংকে ক্লিক করলে ইমেইল পরিবর্তন হবে।`
          : `A verification link has been sent to ${newEmail}. Click the link to confirm the change.`
      );
      setNewEmail('');
      setEmailPassword('');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-display font-bold text-foreground">{bn ? 'সেটিংস' : 'Settings'}</h1>

        {/* Email Change */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" /> {bn ? 'লগইন ইমেইল পরিবর্তন' : 'Change Login Email'}
          </h3>
          <div className="space-y-4">
            <div>
              <Label>{bn ? 'বর্তমান ইমেইল' : 'Current Email'}</Label>
              <Input className="mt-1 bg-muted/50" value={currentEmail} readOnly />
            </div>
            <div>
              <Label>{bn ? 'নতুন ইমেইল' : 'New Email'}</Label>
              <Input
                className="mt-1 bg-background"
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder={bn ? 'নতুন ইমেইল অ্যাড্রেস' : 'New email address'}
              />
            </div>
            <div>
              <Label>{bn ? 'বর্তমান পাসওয়ার্ড (নিশ্চিতকরণ)' : 'Current Password (confirmation)'}</Label>
              <div className="relative mt-1">
                <Input
                  className="bg-background pr-10"
                  type={showEmailPassword ? 'text' : 'password'}
                  value={emailPassword}
                  onChange={e => setEmailPassword(e.target.value)}
                  placeholder={bn ? 'পাসওয়ার্ড দিন' : 'Enter password'}
                />
                <button
                  type="button"
                  onClick={() => setShowEmailPassword(!showEmailPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showEmailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button onClick={handleChangeEmail} disabled={changingEmail} className="btn-primary-gradient">
              {changingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
              {bn ? 'ইমেইল পরিবর্তন করুন' : 'Change Email'}
            </Button>
            <p className="text-xs text-muted-foreground">
              {bn ? '⚠️ নতুন ইমেইলে ভেরিফিকেশন লিংক যাবে। লিংকে ক্লিক করলে ইমেইল আপডেট হবে।' : '⚠️ A verification link will be sent to the new email. Click it to confirm the change.'}
            </p>
          </div>
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
