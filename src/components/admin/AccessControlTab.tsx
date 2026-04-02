import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Save, Lock, Unlock } from 'lucide-react';

const ALL_ADMIN_PATHS = [
  { path: '/admin/settings', label_en: 'Settings', label_bn: 'সেটিংস' },
  { path: '/admin/user-management', label_en: 'User Management', label_bn: 'ইউজার ম্যানেজমেন্ট' },
  { path: '/admin/permissions', label_en: 'Permissions', label_bn: 'পারমিশন' },
  { path: '/admin/module-manager', label_en: 'Module Manager', label_bn: 'মডিউল ম্যানেজার' },
  { path: '/admin/theme', label_en: 'Theme Customizer', label_bn: 'থিম কাস্টমাইজার' },
  { path: '/admin/menu-manager', label_en: 'Menu Manager', label_bn: 'মেনু ম্যানেজার' },
  { path: '/admin/widget-builder', label_en: 'Widget Builder', label_bn: 'উইজেট বিল্ডার' },
  { path: '/admin/backup', label_en: 'Backup', label_bn: 'ব্যাকআপ' },
  { path: '/admin/website', label_en: 'Website Control', label_bn: 'ওয়েবসাইট নিয়ন্ত্রণ' },
  { path: '/admin/form-builder', label_en: 'Custom Builder', label_bn: 'কাস্টম বিল্ডার' },
  { path: '/admin/formula-builder', label_en: 'Formula Builder', label_bn: 'ফর্মুলা বিল্ডার' },
  { path: '/admin/validation-manager', label_en: 'Validation Manager', label_bn: 'ভ্যালিডেশন ম্যানেজার' },
  { path: '/admin/api-verification', label_en: 'API Verification', label_bn: 'API ভেরিফিকেশন' },
  { path: '/admin/address-manager', label_en: 'Address Manager', label_bn: 'ঠিকানা ম্যানেজার' },
  { path: '/admin/prayer-calendar', label_en: 'Prayer & Calendar', label_bn: 'নামাজ ও ক্যালেন্ডার' },
  { path: '/admin/guardian-notify', label_en: 'Guardian Notifications', label_bn: 'অভিভাবক নোটিফিকেশন' },
  { path: '/admin/approvals', label_en: 'Approvals', label_bn: 'অনুমোদন' },
  { path: '/admin/designations', label_en: 'Designations', label_bn: 'পদবি' },
  { path: '/admin/academic-sessions', label_en: 'Academic Sessions', label_bn: 'একাডেমিক সেশন' },
  { path: '/admin/students', label_en: 'Students', label_bn: 'ছাত্র ব্যবস্থাপনা' },
  { path: '/admin/staff', label_en: 'Staff/Teacher', label_bn: 'স্টাফ/শিক্ষক' },
  { path: '/admin/divisions', label_en: 'Divisions & Class', label_bn: 'বিভাগ ও শ্রেণী' },
  { path: '/admin/subjects', label_en: 'Subjects', label_bn: 'বিষয়সমূহ' },
  { path: '/admin/results', label_en: 'Results', label_bn: 'ফলাফল' },
  { path: '/admin/notices', label_en: 'Notices', label_bn: 'নোটিশ' },
  { path: '/admin/fees', label_en: 'Fees', label_bn: 'ফি' },
  { path: '/admin/fee-receipts', label_en: 'Fee Receipts', label_bn: 'ফি রসিদ' },
  { path: '/admin/expenses', label_en: 'Expenses', label_bn: 'খরচ ব্যবস্থাপনা' },
  { path: '/admin/donors', label_en: 'Donors', label_bn: 'দাতা তালিকা' },
  { path: '/admin/attendance', label_en: 'Attendance', label_bn: 'হাজিরা' },
  { path: '/admin/salary', label_en: 'Salary', label_bn: 'বেতন ব্যবস্থাপনা' },
  { path: '/admin/reports', label_en: 'Reports', label_bn: 'রিপোর্ট' },
  { path: '/admin/posts', label_en: 'Posts', label_bn: 'পোস্ট' },
  { path: '/admin/resign-letters', label_en: 'Resign Letters', label_bn: 'পদত্যাগ পত্র' },
  { path: '/admin/joining-letters', label_en: 'Joining Letters', label_bn: 'যোগদান পত্র' },
  { path: '/admin/admission-letters', label_en: 'Admission Letters', label_bn: 'ভর্তি পত্র' },
];

const DEFAULT_ADMIN_ONLY = [
  '/admin/settings', '/admin/user-management', '/admin/permissions',
  '/admin/module-manager', '/admin/theme', '/admin/menu-manager',
  '/admin/widget-builder', '/admin/backup', '/admin/website',
  '/admin/form-builder', '/admin/formula-builder', '/admin/validation-manager',
  '/admin/api-verification', '/admin/address-manager', '/admin/prayer-calendar',
  '/admin/guardian-notify', '/admin/approvals', '/admin/designations',
  '/admin/academic-sessions',
];

const AccessControlTab = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [restricted, setRestricted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'admin_only_paths')
        .maybeSingle();
      if (data?.value && Array.isArray((data.value as any)?.paths)) {
        setRestricted((data.value as any).paths);
      } else {
        setRestricted([...DEFAULT_ADMIN_ONLY]);
      }
    } catch {
      setRestricted([...DEFAULT_ADMIN_ONLY]);
    }
    setLoading(false);
  };

  const togglePath = (path: string) => {
    setRestricted(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('website_settings')
        .upsert({ key: 'admin_only_paths', value: { paths: restricted } as any, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      toast.success(bn ? 'অ্যাক্সেস কন্ট্রোল সেভ হয়েছে' : 'Access control saved');
      setDirty(false);
    } catch {
      toast.error(bn ? 'সেভ করতে সমস্যা' : 'Failed to save');
    }
    setSaving(false);
  };

  const selectAll = () => {
    setRestricted(ALL_ADMIN_PATHS.map(p => p.path));
    setDirty(true);
  };

  const deselectAll = () => {
    setRestricted([]);
    setDirty(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {bn
            ? '✅ চেকমার্ক = শুধু অ্যাডমিন অ্যাক্সেস করতে পারবে। ❌ আনচেক = পারমিশন অনুযায়ী স্টাফ/শিক্ষকও অ্যাক্সেস পাবে।'
            : '✅ Checked = Admin only. ❌ Unchecked = Staff/Teacher can access based on their permissions.'}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            <Lock className="w-3.5 h-3.5 mr-1.5" />
            {bn ? 'সব সীমিত করুন' : 'Restrict All'}
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            <Unlock className="w-3.5 h-3.5 mr-1.5" />
            {bn ? 'সব উন্মুক্ত করুন' : 'Open All'}
          </Button>
          <Button onClick={handleSave} disabled={!dirty || saving} size="sm" className="btn-primary-gradient">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
            {bn ? 'সেভ করুন' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
          {ALL_ADMIN_PATHS.map((item, idx) => {
            const isRestricted = restricted.includes(item.path);
            return (
              <label
                key={item.path}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-r border-border/50 hover:bg-muted/50 ${isRestricted ? 'bg-destructive/5' : 'bg-background'}`}
              >
                <Checkbox
                  checked={isRestricted}
                  onCheckedChange={() => togglePath(item.path)}
                />
                <div className="flex items-center gap-2 min-w-0">
                  {isRestricted ? (
                    <Lock className="w-3.5 h-3.5 text-destructive shrink-0" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  )}
                  <span className="text-sm font-medium truncate">
                    {bn ? item.label_bn : item.label_en}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AccessControlTab;
