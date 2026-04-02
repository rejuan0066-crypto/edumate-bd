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

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-display font-bold text-foreground">{bn ? 'সেটিংস' : 'Settings'}</h1>

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
