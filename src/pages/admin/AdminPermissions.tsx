import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield, Save, Loader2 } from 'lucide-react';

const MENU_ITEMS = [
  { path: '/admin', label: 'Dashboard', label_bn: 'ড্যাশবোর্ড' },
  { path: '/admin/donors', label: 'Donor List', label_bn: 'দাতা তালিকা' },
  { path: '/admin/students', label: 'Student Management', label_bn: 'ছাত্র ব্যবস্থাপনা' },
  { path: '/admin/staff', label: 'Staff/Teacher Management', label_bn: 'স্টাফ/শিক্ষক ব্যবস্থাপনা' },
  { path: '/admin/divisions', label: 'Division & Class', label_bn: 'বিভাগ ও শ্রেণী' },
  { path: '/admin/fee-receipts', label: 'Fee Receipts', label_bn: 'ফি রসিদ' },
  { path: '/admin/resign-letters', label: 'Resign Letters', label_bn: 'পদত্যাগ পত্র' },
  { path: '/admin/joining-letters', label: 'Joining Letters', label_bn: 'যোগদান পত্র' },
  { path: '/admin/admission-letters', label: 'Admission Letters', label_bn: 'ভর্তি পত্র' },
  { path: '/admin/results', label: 'Results', label_bn: 'ফলাফল' },
  { path: '/admin/notices', label: 'Notice', label_bn: 'নোটিশ' },
  { path: '/admin/students-fees', label: 'Student Fees', label_bn: 'ছাত্র ফি' },
  { path: '/admin/expenses', label: 'Expenses', label_bn: 'খরচ ব্যবস্থাপনা' },
  { path: '/admin/website', label: 'Website Control', label_bn: 'ওয়েবসাইট নিয়ন্ত্রণ' },
  { path: '/admin/designations', label: 'Designations', label_bn: 'পদবি' },
  { path: '/admin/subjects', label: 'Subjects', label_bn: 'বিষয়সমূহ' },
  { path: '/admin/form-builder', label: 'Custom Builder', label_bn: 'কাস্টম বিল্ডার' },
  { path: '/admin/module-manager', label: 'Module Manager', label_bn: 'মডিউল ম্যানেজার' },
  { path: '/admin/formula-builder', label: 'Formula Builder', label_bn: 'ফর্মুলা বিল্ডার' },
  { path: '/admin/attendance', label: 'Attendance', label_bn: 'অ্যাটেন্ডেন্স' },
  { path: '/admin/validation-manager', label: 'Validation Manager', label_bn: 'ভ্যালিডেশন ম্যানেজার' },
  { path: '/admin/reports', label: 'Reports & Analytics', label_bn: 'রিপোর্ট ও অ্যানালিটিক্স' },
  { path: '/admin/permissions', label: 'Permissions', label_bn: 'পারমিশন' },
  { path: '/admin/settings', label: 'Settings', label_bn: 'সেটিংস' },
];

const ROLES = [
  { value: 'staff', label: 'Staff', label_bn: 'স্টাফ' },
  { value: 'teacher', label: 'Teacher', label_bn: 'শিক্ষক' },
];

type PermRow = {
  menu_path: string;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

const AdminPermissions = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('staff');
  const [localPerms, setLocalPerms] = useState<Record<string, PermRow>>({});
  const [dirty, setDirty] = useState(false);

  const { data: savedPerms = [], isLoading } = useQuery({
    queryKey: ['role-permissions', selectedRole],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', selectedRole);
      if (error) throw error;

      // Build local state from saved data
      const map: Record<string, PermRow> = {};
      MENU_ITEMS.forEach(item => {
        const saved = (data || []).find((d: any) => d.menu_path === item.path);
        map[item.path] = {
          menu_path: item.path,
          can_view: saved?.can_view ?? false,
          can_add: saved?.can_add ?? false,
          can_edit: saved?.can_edit ?? false,
          can_delete: saved?.can_delete ?? false,
        };
      });
      setLocalPerms(map);
      setDirty(false);
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const rows = Object.values(localPerms).map(p => ({
        role: selectedRole,
        menu_path: p.menu_path,
        can_view: p.can_view,
        can_add: p.can_add,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
        updated_at: new Date().toISOString(),
      }));

      // Delete existing then insert
      await supabase.from('role_permissions').delete().eq('role', selectedRole);
      const { error } = await supabase.from('role_permissions').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(language === 'bn' ? 'পারমিশন সেভ হয়েছে' : 'Permissions saved');
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      setDirty(false);
    },
    onError: () => {
      toast.error(language === 'bn' ? 'সেভ করতে সমস্যা হয়েছে' : 'Failed to save');
    },
  });

  const togglePerm = (path: string, field: keyof PermRow) => {
    if (field === 'menu_path') return;
    setLocalPerms(prev => ({
      ...prev,
      [path]: { ...prev[path], [field]: !prev[path][field] },
    }));
    setDirty(true);
  };

  const toggleAllForMenu = (path: string) => {
    const p = localPerms[path];
    const allChecked = p.can_view && p.can_add && p.can_edit && p.can_delete;
    setLocalPerms(prev => ({
      ...prev,
      [path]: { ...prev[path], can_view: !allChecked, can_add: !allChecked, can_edit: !allChecked, can_delete: !allChecked },
    }));
    setDirty(true);
  };

  const toggleAllForAction = (field: 'can_view' | 'can_add' | 'can_edit' | 'can_delete') => {
    const allChecked = MENU_ITEMS.every(item => localPerms[item.path]?.[field]);
    const updated = { ...localPerms };
    MENU_ITEMS.forEach(item => {
      if (updated[item.path]) {
        updated[item.path] = { ...updated[item.path], [field]: !allChecked };
      }
    });
    setLocalPerms(updated);
    setDirty(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold font-display">
              {language === 'bn' ? 'পারমিশন ম্যানেজার' : 'Permission Manager'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>
                    {language === 'bn' ? r.label_bn : r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {language === 'bn' ? 'সেভ করুন' : 'Save'}
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {language === 'bn'
            ? 'অ্যাডমিন সবসময় সম্পূর্ণ অ্যাক্সেস পাবে। এখানে শুধু Staff ও Teacher রোলের পারমিশন কনফিগার করুন।'
            : 'Admin always has full access. Configure permissions for Staff and Teacher roles here.'}
        </p>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {language === 'bn' ? 'পারমিশন ম্যাট্রিক্স' : 'Permission Matrix'} — {ROLES.find(r => r.value === selectedRole)?.[language === 'bn' ? 'label_bn' : 'label']}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium min-w-[200px]">
                        {language === 'bn' ? 'মেনু / ফিচার' : 'Menu / Feature'}
                      </th>
                      {(['can_view', 'can_add', 'can_edit', 'can_delete'] as const).map(field => (
                        <th key={field} className="text-center p-3 font-medium w-24">
                          <div className="flex flex-col items-center gap-1">
                            <span>{field === 'can_view' ? (language === 'bn' ? 'দেখা' : 'View')
                              : field === 'can_add' ? (language === 'bn' ? 'যোগ' : 'Add')
                              : field === 'can_edit' ? (language === 'bn' ? 'সম্পাদনা' : 'Edit')
                              : (language === 'bn' ? 'মুছুন' : 'Delete')}</span>
                            <Checkbox
                              checked={MENU_ITEMS.every(item => localPerms[item.path]?.[field])}
                              onCheckedChange={() => toggleAllForAction(field)}
                              className="mt-1"
                            />
                          </div>
                        </th>
                      ))}
                      <th className="text-center p-3 font-medium w-20">
                        {language === 'bn' ? 'সব' : 'All'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {MENU_ITEMS.map((item, idx) => {
                      const perm = localPerms[item.path];
                      if (!perm) return null;
                      const allChecked = perm.can_view && perm.can_add && perm.can_edit && perm.can_delete;
                      return (
                        <tr key={item.path} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                          <td className="p-3 font-medium">
                            {language === 'bn' ? item.label_bn : item.label}
                          </td>
                          {(['can_view', 'can_add', 'can_edit', 'can_delete'] as const).map(field => (
                            <td key={field} className="text-center p-3">
                              <Checkbox
                                checked={perm[field]}
                                onCheckedChange={() => togglePerm(item.path, field)}
                              />
                            </td>
                          ))}
                          <td className="text-center p-3">
                            <Checkbox
                              checked={allChecked}
                              onCheckedChange={() => toggleAllForMenu(item.path)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminPermissions;
