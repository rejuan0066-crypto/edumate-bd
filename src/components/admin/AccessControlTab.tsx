import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Save, Lock, Unlock, ShieldCheck } from 'lucide-react';

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
  { path: '/admin/students-fees', label_en: 'Student Fees', label_bn: 'ছাত্র ফি' },
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

const BASE_ROLES = [
  { key: 'teacher', label_en: 'Teacher', label_bn: 'শিক্ষক' },
  { key: 'staff', label_en: 'Staff', label_bn: 'স্টাফ' },
];

// path → { teacher: true/false, staff: true/false }
type RoleAccessMap = Record<string, Record<string, boolean>>;

const AccessControlTab = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [accessMap, setAccessMap] = useState<RoleAccessMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const buildDefaultMap = (): RoleAccessMap => {
    const map: RoleAccessMap = {};
    ALL_ADMIN_PATHS.forEach(item => {
      // Default: first 19 paths admin-only, rest open to teacher & staff
      const idx = ALL_ADMIN_PATHS.indexOf(item);
      const isAdminOnly = idx < 19;
      map[item.path] = {
        teacher: !isAdminOnly,
        staff: !isAdminOnly,
      };
    });
    return map;
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'admin_only_paths')
        .maybeSingle();

      if (data?.value) {
        const val = data.value as any;
        // Support new format: { access_map: { path: { teacher: bool, staff: bool } } }
        if (val.access_map && typeof val.access_map === 'object') {
          // Merge with defaults for any missing paths
          const defaults = buildDefaultMap();
          const loaded = val.access_map as RoleAccessMap;
          const merged: RoleAccessMap = {};
          ALL_ADMIN_PATHS.forEach(item => {
            merged[item.path] = loaded[item.path] || defaults[item.path];
          });
          setAccessMap(merged);
        } else if (Array.isArray(val.paths)) {
          // Migrate from old format: paths[] = admin-only paths
          const map: RoleAccessMap = {};
          ALL_ADMIN_PATHS.forEach(item => {
            const isAdminOnly = val.paths.includes(item.path);
            map[item.path] = { teacher: !isAdminOnly, staff: !isAdminOnly };
          });
          setAccessMap(map);
        } else {
          setAccessMap(buildDefaultMap());
        }
      } else {
        setAccessMap(buildDefaultMap());
      }
    } catch {
      setAccessMap(buildDefaultMap());
    }
    setLoading(false);
  };

  const toggleAccess = (path: string, role: string) => {
    setAccessMap(prev => ({
      ...prev,
      [path]: {
        ...prev[path],
        [role]: !prev[path]?.[role],
      },
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Also compute admin_only_paths for backward compatibility with ProtectedRoute
      const adminOnlyPaths = ALL_ADMIN_PATHS
        .filter(item => {
          const access = accessMap[item.path];
          return !access?.teacher && !access?.staff;
        })
        .map(item => item.path);

      const { error } = await supabase
        .from('website_settings')
        .upsert({
          key: 'admin_only_paths',
          value: {
            paths: adminOnlyPaths,
            access_map: accessMap,
          } as any,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });
      if (error) throw error;
      toast.success(bn ? 'অ্যাক্সেস কন্ট্রোল সেভ হয়েছে' : 'Access control saved');
      setDirty(false);
    } catch {
      toast.error(bn ? 'সেভ করতে সমস্যা' : 'Failed to save');
    }
    setSaving(false);
  };

  const setAllForRole = (role: string, value: boolean) => {
    setAccessMap(prev => {
      const next = { ...prev };
      ALL_ADMIN_PATHS.forEach(item => {
        next[item.path] = { ...next[item.path], [role]: value };
      });
      return next;
    });
    setDirty(true);
  };

  const setAllPaths = (value: boolean) => {
    setAccessMap(prev => {
      const next = { ...prev };
      ALL_ADMIN_PATHS.forEach(item => {
        const roleAccess: Record<string, boolean> = {};
        BASE_ROLES.forEach(r => { roleAccess[r.key] = value; });
        next[item.path] = roleAccess;
      });
      return next;
    });
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
            ? '✅ চেকমার্ক = সংশ্লিষ্ট রোল অ্যাক্সেস পাবে। ❌ আনচেক = অ্যাক্সেস পাবে না। অ্যাডমিনের সব সময় অ্যাক্সেস থাকবে।'
            : '✅ Checked = Role can access. ❌ Unchecked = No access. Admin always has full access.'}
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setAllPaths(false)}>
            <Lock className="w-3.5 h-3.5 mr-1.5" />
            {bn ? 'সব সীমিত করুন' : 'Restrict All'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAllPaths(true)}>
            <Unlock className="w-3.5 h-3.5 mr-1.5" />
            {bn ? 'সব উন্মুক্ত করুন' : 'Open All'}
          </Button>
          <Button onClick={handleSave} disabled={!dirty || saving} size="sm" className="btn-primary-gradient">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
            {bn ? 'সেভ করুন' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="card-elevated overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-foreground">
                {bn ? 'মেনু / পাথ' : 'Menu / Path'}
              </th>
              <th className="px-3 py-3 text-center font-semibold text-foreground min-w-[80px]">
                <div className="flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  {bn ? 'অ্যাডমিন' : 'Admin'}
                </div>
              </th>
              {BASE_ROLES.map(role => (
                <th key={role.key} className="px-3 py-3 text-center font-semibold text-foreground min-w-[80px]">
                  <div className="flex flex-col items-center gap-1">
                    <span>{bn ? role.label_bn : role.label_en}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setAllForRole(role.key, true)}
                        className="text-[10px] text-primary hover:underline"
                      >
                        {bn ? 'সব' : 'All'}
                      </button>
                      <span className="text-muted-foreground">|</span>
                      <button
                        onClick={() => setAllForRole(role.key, false)}
                        className="text-[10px] text-destructive hover:underline"
                      >
                        {bn ? 'কোনোটি না' : 'None'}
                      </button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_ADMIN_PATHS.map((item) => {
              const access = accessMap[item.path] || {};
              const allBlocked = !access.teacher && !access.staff;
              return (
                <tr
                  key={item.path}
                  className={`border-b border-border/50 transition-colors hover:bg-muted/50 ${allBlocked ? 'bg-destructive/5' : ''}`}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {allBlocked ? (
                        <Lock className="w-3.5 h-3.5 text-destructive shrink-0" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                      <span className="font-medium truncate">
                        {bn ? item.label_bn : item.label_en}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Checkbox checked disabled className="opacity-60" />
                  </td>
                  {BASE_ROLES.map(role => (
                    <td key={role.key} className="px-3 py-2.5 text-center">
                      <Checkbox
                        checked={!!access[role.key]}
                        onCheckedChange={() => toggleAccess(item.path, role.key)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccessControlTab;
