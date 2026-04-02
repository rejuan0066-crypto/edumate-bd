import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useApiVerificationConfig } from '@/hooks/useApiVerification';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Shield, Key, Link2, MapPin, Lock, Eye, EyeOff, Plus, Trash2, Save } from 'lucide-react';

const AdminApiVerification = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useApiVerificationConfig();

  // Password gate
  const [unlocked, setUnlocked] = useState(false);
  const [masterInput, setMasterInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');

  // Form state
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [newMasterPassword, setNewMasterPassword] = useState('');
  const [studentMappings, setStudentMappings] = useState<Array<{ apiKey: string; formField: string }>>([]);
  const [staffMappings, setStaffMappings] = useState<Array<{ apiKey: string; formField: string }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setApiUrl(config.api_url || '');
      setApiKey(config.api_key || '');
      setIsEnabled(config.is_enabled || false);

      const sm = config.field_mappings?.student || {};
      setStudentMappings(Object.entries(sm).map(([apiKey, formField]) => ({ apiKey, formField: formField as string })));

      const stm = config.field_mappings?.staff || {};
      setStaffMappings(Object.entries(stm).map(([apiKey, formField]) => ({ apiKey, formField: formField as string })));
    }
  }, [config]);

  const handleUnlock = () => {
    if (!config) return;
    if (!config.master_password) {
      setUnlocked(true);
      return;
    }
    if (masterInput === config.master_password) {
      setUnlocked(true);
      setMasterInput('');
    } else {
      toast.error(bn ? 'ভুল পাসওয়ার্ড' : 'Wrong password');
    }
  };

  const handleForgotReset = async () => {
    if (resetConfirmInput !== 'RESET') {
      toast.error(bn ? 'অনুগ্রহ করে RESET টাইপ করুন' : 'Please type RESET to confirm');
      return;
    }
    if (!config?.id) return;
    const { error } = await supabase
      .from('api_verification_config')
      .update({ master_password: '', updated_at: new Date().toISOString() })
      .eq('id', config.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(bn ? 'পাসওয়ার্ড রিসেট হয়েছে। নতুন পাসওয়ার্ড সেট করুন।' : 'Password reset. Please set a new password.');
      setForgotMode(false);
      setResetConfirmInput('');
      setUnlocked(true);
      queryClient.invalidateQueries({ queryKey: ['api-verification-config'] });
    }
  };

  const handleSave = async () => {
    if (!config?.id) return;
    setSaving(true);

    const studentMap: Record<string, string> = {};
    studentMappings.filter(m => m.apiKey && m.formField).forEach(m => { studentMap[m.apiKey] = m.formField; });

    const staffMap: Record<string, string> = {};
    staffMappings.filter(m => m.apiKey && m.formField).forEach(m => { staffMap[m.apiKey] = m.formField; });

    const updateData: any = {
      api_url: apiUrl,
      api_key: apiKey,
      is_enabled: isEnabled,
      field_mappings: { student: studentMap, staff: staffMap },
      updated_at: new Date().toISOString(),
    };

    if (newMasterPassword.trim()) {
      updateData.master_password = newMasterPassword.trim();
    }

    const { error } = await supabase
      .from('api_verification_config')
      .update(updateData)
      .eq('id', config.id);

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(bn ? 'সেটিংস সেভ হয়েছে' : 'Settings saved');
      setNewMasterPassword('');
      queryClient.invalidateQueries({ queryKey: ['api-verification-config'] });
      queryClient.invalidateQueries({ queryKey: ['api-verification-enabled'] });
    }
  };

  const addMapping = (type: 'student' | 'staff') => {
    if (type === 'student') setStudentMappings(prev => [...prev, { apiKey: '', formField: '' }]);
    else setStaffMappings(prev => [...prev, { apiKey: '', formField: '' }]);
  };

  const removeMapping = (type: 'student' | 'staff', index: number) => {
    if (type === 'student') setStudentMappings(prev => prev.filter((_, i) => i !== index));
    else setStaffMappings(prev => prev.filter((_, i) => i !== index));
  };

  const updateMapping = (type: 'student' | 'staff', index: number, field: 'apiKey' | 'formField', value: string) => {
    const setter = type === 'student' ? setStudentMappings : setStaffMappings;
    setter(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const STUDENT_FIELDS = [
    { value: 'first_name', label: bn ? 'নাম (প্রথম)' : 'First Name' },
    { value: 'last_name', label: bn ? 'নাম (শেষ)' : 'Last Name' },
    { value: 'father_name', label: bn ? 'পিতার নাম' : 'Father Name' },
    { value: 'mother_name', label: bn ? 'মাতার নাম' : 'Mother Name' },
    { value: 'date_of_birth', label: bn ? 'জন্ম তারিখ' : 'Date of Birth' },
    { value: 'gender', label: bn ? 'লিঙ্গ' : 'Gender' },
    { value: 'religion', label: bn ? 'ধর্ম' : 'Religion' },
    { value: 'birth_reg_no', label: bn ? 'জন্ম নিবন্ধন নং' : 'Birth Reg No' },
    { value: 'address', label: bn ? 'ঠিকানা' : 'Address' },
    { value: 'phone', label: bn ? 'ফোন' : 'Phone' },
    { value: 'father_occupation', label: bn ? 'পিতার পেশা' : 'Father Occupation' },
    { value: 'father_nid', label: bn ? 'পিতার NID' : 'Father NID' },
    { value: 'mother_nid', label: bn ? 'মাতার NID' : 'Mother NID' },
  ];

  const STAFF_FIELDS = [
    { value: 'name_bn', label: bn ? 'নাম (বাংলা)' : 'Name (BN)' },
    { value: 'name_en', label: bn ? 'নাম (ইংরেজি)' : 'Name (EN)' },
    { value: 'father_name', label: bn ? 'পিতার নাম' : 'Father Name' },
    { value: 'date_of_birth', label: bn ? 'জন্ম তারিখ' : 'Date of Birth' },
    { value: 'address', label: bn ? 'ঠিকানা' : 'Address' },
    { value: 'phone', label: bn ? 'ফোন' : 'Phone' },
    { value: 'email', label: bn ? 'ইমেইল' : 'Email' },
    { value: 'nid', label: 'NID' },
    { value: 'education', label: bn ? 'শিক্ষাগত যোগ্যতা' : 'Education' },
  ];

  const renderMappings = (type: 'student' | 'staff', mappings: Array<{ apiKey: string; formField: string }>, fields: typeof STUDENT_FIELDS) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">{type === 'student' ? (bn ? 'ছাত্র ফর্ম ম্যাপিং' : 'Student Form Mapping') : (bn ? 'স্টাফ ফর্ম ম্যাপিং' : 'Staff Form Mapping')}</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => addMapping(type)}>
          <Plus className="w-3.5 h-3.5 mr-1" />{bn ? 'যোগ' : 'Add'}
        </Button>
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        {bn ? 'API Response Key → ফর্ম ফিল্ড (যেমন: std_name → first_name)' : 'API Response Key → Form Field (e.g., std_name → first_name)'}
      </div>
      {mappings.map((m, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder={bn ? 'API Key (যেমন: std_name)' : 'API Key (e.g., std_name)'}
            value={m.apiKey}
            onChange={e => updateMapping(type, i, 'apiKey', e.target.value)}
            className="flex-1 bg-background text-sm"
          />
          <span className="text-muted-foreground text-sm">→</span>
          <select
            value={m.formField}
            onChange={e => updateMapping(type, i, 'formField', e.target.value)}
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{bn ? 'ফিল্ড নির্বাচন' : 'Select field'}</option>
            {fields.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <Button type="button" variant="ghost" size="icon" onClick={() => removeMapping(type, i)} className="text-destructive hover:text-destructive shrink-0">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      {mappings.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
          {bn ? 'কোনো ম্যাপিং নেই। "যোগ" বাটন ক্লিক করুন।' : 'No mappings. Click "Add" to create one.'}
        </p>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </AdminLayout>
    );
  }

  // Password gate
  if (!unlocked) {
    return (
      <AdminLayout>
        <div className="max-w-md mx-auto mt-12">
          <Card>
            <CardHeader className="text-center">
              <Lock className="w-12 h-12 text-primary mx-auto mb-2" />
              <CardTitle>{bn ? 'পাসওয়ার্ড প্রয়োজন' : 'Password Required'}</CardTitle>
              <CardDescription>
                {!config?.master_password
                  ? (bn ? 'প্রথমবার ব্যবহার। এন্টার চেপে প্রবেশ করুন।' : 'First time use. Press Enter to proceed.')
                  : (bn ? 'সেটিংস দেখতে মাস্টার পাসওয়ার্ড দিন' : 'Enter master password to access settings')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {forgotMode ? (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive font-medium mb-1">
                      {bn ? '⚠️ সতর্কতা' : '⚠️ Warning'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {bn ? 'পাসওয়ার্ড রিসেট করলে পুরাতন পাসওয়ার্ড মুছে যাবে। নিশ্চিত করতে নিচে RESET টাইপ করুন।' : 'Resetting will remove the old password. Type RESET below to confirm.'}
                    </p>
                  </div>
                  <Input
                    value={resetConfirmInput}
                    onChange={e => setResetConfirmInput(e.target.value)}
                    placeholder={bn ? 'RESET টাইপ করুন' : 'Type RESET'}
                    className="font-mono text-center tracking-widest"
                    onKeyDown={e => e.key === 'Enter' && handleForgotReset()}
                  />
                  <Button className="w-full" variant="destructive" onClick={handleForgotReset}>
                    {bn ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset Password'}
                  </Button>
                  <Button className="w-full" variant="ghost" onClick={() => { setForgotMode(false); setResetConfirmInput(''); }}>
                    {bn ? 'বাতিল' : 'Cancel'}
                  </Button>
                </div>
              ) : config?.master_password ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={masterInput}
                      onChange={e => setMasterInput(e.target.value)}
                      placeholder={bn ? 'মাস্টার পাসওয়ার্ড' : 'Master password'}
                      onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button className="w-full btn-primary-gradient" onClick={handleUnlock}>
                    <Shield className="w-4 h-4 mr-2" />{bn ? 'আনলক করুন' : 'Unlock'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="w-full text-sm text-primary hover:underline"
                  >
                    {bn ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                  </button>
                </div>
              ) : (
                <Button className="w-full btn-primary-gradient" onClick={handleUnlock}>
                  <Shield className="w-4 h-4 mr-2" />{bn ? 'সেটআপ শুরু করুন' : 'Start Setup'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Service Toggle */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{bn ? 'সার্ভিস চালু/বন্ধ' : 'Service On/Off'}</h3>
                <p className="text-sm text-muted-foreground">
                  {bn ? 'চালু করলে ফর্মে কার্ড ভেরিফাই অপশন দেখাবে' : 'When on, card verify option appears in forms'}
                </p>
              </div>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </div>
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="w-5 h-5 text-primary" />
              {bn ? 'API কনফিগারেশন' : 'API Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{bn ? 'API URL' : 'API URL'}</Label>
              <Input
                className="mt-1 bg-background font-mono text-sm"
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                placeholder="https://api.example.com/verify/{card_number}"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {bn ? '{card_number} জায়গায় কার্ড নম্বর বসবে' : '{card_number} will be replaced with actual card number'}
              </p>
            </div>
            <div>
              <Label className="flex items-center gap-1"><Key className="w-3.5 h-3.5" /> API Key</Label>
              <Input
                className="mt-1 bg-background font-mono text-sm"
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={bn ? 'API কী (ঐচ্ছিক)' : 'API Key (optional)'}
              />
            </div>
          </CardContent>
        </Card>

        {/* Field Mappings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5 text-primary" />
              {bn ? 'ফিল্ড ম্যাপিং' : 'Field Mapping'}
            </CardTitle>
            <CardDescription>
              {bn ? 'API Response এর কোন Key কোন ফর্ম ফিল্ডে বসবে তা নির্ধারণ করুন' : 'Define which API response key maps to which form field'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="student">
              <TabsList className="w-full">
                <TabsTrigger value="student" className="flex-1">{bn ? 'ছাত্র ফর্ম' : 'Student Form'}</TabsTrigger>
                <TabsTrigger value="staff" className="flex-1">{bn ? 'স্টাফ ফর্ম' : 'Staff Form'}</TabsTrigger>
              </TabsList>
              <TabsContent value="student" className="mt-4">
                {renderMappings('student', studentMappings, STUDENT_FIELDS)}
              </TabsContent>
              <TabsContent value="staff" className="mt-4">
                {renderMappings('staff', staffMappings, STAFF_FIELDS)}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Master Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="w-5 h-5 text-primary" />
              {bn ? 'মাস্টার পাসওয়ার্ড' : 'Master Password'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {config?.master_password && (
              <div>
                <Label>{bn ? 'বর্তমান পাসওয়ার্ড' : 'Current Password'}</Label>
                <div className="relative mt-1">
                  <Input
                    className="bg-muted/50 pr-10"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={config.master_password}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
            <div>
              <Label>{bn ? 'নতুন পাসওয়ার্ড সেট করুন' : 'Set New Password'}</Label>
              <div className="relative mt-1">
                <Input
                  className="bg-background pr-10"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newMasterPassword}
                  onChange={e => setNewMasterPassword(e.target.value)}
                  placeholder={bn ? 'নতুন পাসওয়ার্ড (খালি রাখলে পুরাতনটি থাকবে)' : 'New password (leave blank to keep current)'}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end pb-6">
          <Button onClick={handleSave} disabled={saving} className="btn-primary-gradient px-8">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {bn ? 'সেভ করুন' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminApiVerification;
