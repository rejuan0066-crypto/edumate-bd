import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMenuSettings } from '@/hooks/useMenuSettings';
import { flattenMenuPaths, mergeMenuPaths, DEFAULT_MENU_PATHS, MenuPathItem } from '@/lib/menuPathList';
import { KNOWN_PAGE_FEATURES } from '@/lib/pageFeatures';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useConfirm } from '@/contexts/ConfirmContext';
import {
  Shield,
  ShieldCheck,
  KeyRound,
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Sliders,
  AlertTriangle,
  Layers,
  Eye,
  FileCheck,
  CheckCircle2,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { PermissionPageEditor, PagePermItem } from '@/components/admin/PermissionPageEditor';

interface CustomRole {
  id: string;
  name: string;
  name_bn: string;
  description: string | null;
  description_bn: string | null;
  base_role: string;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
}

// Built-in system roles fallback if custom_roles doesn't include them
const DEFAULT_SYSTEM_ROLES: CustomRole[] = [
  {
    id: 'sys-super_admin',
    name: 'super_admin',
    name_bn: 'সুপার অ্যাডমিন',
    description: 'Full system access & root administrator',
    description_bn: 'সকল মডিউল ও সিস্টেমের পূর্ণ নিয়ন্ত্রক',
    base_role: 'admin',
    is_system: true,
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'sys-admin',
    name: 'admin',
    name_bn: 'অ্যাডমিন',
    description: 'School administrator with management rights',
    description_bn: 'প্রতিষ্ঠান প্রশাসনিক দায়িত্ব ও ব্যবস্থাপনা',
    base_role: 'admin',
    is_system: true,
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'sys-teacher',
    name: 'teacher',
    name_bn: 'শিক্ষক',
    description: 'Academic and classroom management',
    description_bn: 'একাডেমিক ও শ্রেণি পাঠদান ব্যবস্থাপনা',
    base_role: 'teacher',
    is_system: true,
    is_active: true,
    sort_order: 3,
  },
  {
    id: 'sys-staff',
    name: 'staff',
    name_bn: 'স্টাফ / কর্মচারী',
    description: 'General support and administrative staff',
    description_bn: 'সাধারণ অফিস ও সহায়ক কার্যক্রম',
    base_role: 'staff',
    is_system: true,
    is_active: true,
    sort_order: 4,
  },
  {
    id: 'sys-student',
    name: 'student',
    name_bn: 'শিক্ষার্থী',
    description: 'Student portal read & limited submission',
    description_bn: 'শিক্ষার্থী পোর্টাল ও পরীক্ষার ফলাফল',
    base_role: 'student',
    is_system: true,
    is_active: true,
    sort_order: 5,
  },
  {
    id: 'sys-parent',
    name: 'parent',
    name_bn: 'অভিভাবক',
    description: 'Guardian portal for fee & child reports',
    description_bn: 'অভিভাবক পোর্টাল ও সন্তানের অগ্রগতি',
    base_role: 'parent',
    is_system: true,
    is_active: true,
    sort_order: 6,
  },
];

const AdminPermissions = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { menuConfig } = useMenuSettings();

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
  const [baseFilter, setBaseFilter] = useState<string>('all');

  // Role dialog (Create / Edit)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleNameBn, setRoleNameBn] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [roleDescBn, setRoleDescBn] = useState('');
  const [roleBaseRole, setRoleBaseRole] = useState('staff');
  const [roleSaving, setRoleSaving] = useState(false);

  // Role Permission Page state
  const [selectedRoleForModal, setSelectedRoleForModal] = useState<CustomRole | null>(null);
  const [rolePermsForModal, setRolePermsForModal] = useState<PagePermItem[]>([]);
  const [roleFeaturesForModal, setRoleFeaturesForModal] = useState<Record<string, boolean>>({});
  const [modalLoading, setModalLoading] = useState(false);

  // Derive all menu paths
  const allMenuPaths = useMemo(() => {
    const dynamic = flattenMenuPaths(menuConfig?.sidebar ?? []);
    return mergeMenuPaths(dynamic, DEFAULT_MENU_PATHS);
  }, [menuConfig]);

  // 1. Fetch custom roles from database
  const { data: dbRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('custom_roles').select('*').order('sort_order');
      if (error) throw error;
      return data as CustomRole[];
    },
  });

  // Merge default system roles with database roles
  const rolesList: CustomRole[] = useMemo(() => {
    const list = [...DEFAULT_SYSTEM_ROLES];
    dbRoles.forEach((dbRole) => {
      const idx = list.findIndex((r) => r.name === dbRole.name);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...dbRole };
      } else {
        list.push(dbRole);
      }
    });
    return list;
  }, [dbRoles]);

  // 2. Fetch all role permissions for stat counts & matrix
  const { data: allRolePerms = [] } = useQuery({
    queryKey: ['role-permissions-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('role_permissions').select('*');
      if (error) throw error;
      return (data || []) as {
        role: string;
        menu_path: string;
        can_view: boolean;
        can_add: boolean;
        can_edit: boolean;
        can_delete: boolean;
        can_approve: boolean;
      }[];
    },
  });

  // 3. Fetch role feature permissions & approvals from website_settings
  const { data: roleFeatureSettings = {} } = useQuery({
    queryKey: ['role_feature_permissions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'role_feature_permissions')
        .maybeSingle();
      return (data?.value as Record<string, Record<string, boolean>>) || {};
    },
  });

  // 4. Fetch user counts per role
  const { data: roleUserCounts = {} } = useQuery({
    queryKey: ['role-user-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('role');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        if (row.role) counts[row.role] = (counts[row.role] || 0) + 1;
      });
      return counts;
    },
  });

  // Filtered roles
  const filteredRoles = useMemo(() => {
    return rolesList.filter((r) => {
      if (baseFilter !== 'all' && r.base_role !== baseFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        (r.name_bn && r.name_bn.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.description_bn && r.description_bn.toLowerCase().includes(q))
      );
    });
  }, [rolesList, baseFilter, search]);

  // Open Permission Page for a role
  const handleOpenPermModal = async (role: CustomRole) => {
    setSelectedRoleForModal(role);
    setModalLoading(true);

    try {
      // 1. Fetch current permissions for this role
      const { data: permsData, error: permErr } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', role.name);
      if (permErr) throw permErr;

      const permsMap = (permsData || []).map((p: any) => ({
        menu_path: p.menu_path,
        can_view: !!p.can_view,
        can_add: !!p.can_add,
        can_edit: !!p.can_edit,
        can_delete: !!p.can_delete,
        can_approve: !!p.can_approve,
      }));
      setRolePermsForModal(permsMap);

      // 2. Fetch current sub-feature & approval settings
      const currentFeatures = roleFeatureSettings[role.name] || {};
      setRoleFeaturesForModal(currentFeatures);
    } catch {
      toast.error(bn ? 'পারমিশন লোড ব্যর্থ' : 'Failed to load permissions');
    } finally {
      setModalLoading(false);
    }
  };

  // Open Create/Edit role dialog
  const openRoleDialog = (role?: CustomRole) => {
    if (role) {
      setEditingRole(role);
      setRoleName(role.name);
      setRoleNameBn(role.name_bn);
      setRoleDesc(role.description || '');
      setRoleDescBn(role.description_bn || '');
      setRoleBaseRole(role.base_role);
    } else {
      setEditingRole(null);
      setRoleName('');
      setRoleNameBn('');
      setRoleDesc('');
      setRoleDescBn('');
      setRoleBaseRole('staff');
    }
    setRoleDialogOpen(true);
  };

  // Save role
  const saveCustomRole = async () => {
    if (!roleName.trim() || !roleNameBn.trim()) {
      toast.error(bn ? 'রোলের নাম ও বাংলা নাম দিন' : 'Enter role name');
      return;
    }
    setRoleSaving(true);
    try {
      if (editingRole?.is_system) {
        // System roles: only update description and bengali name
        const { error } = await supabase
          .from('custom_roles')
          .update({
            name_bn: roleNameBn.trim(),
            description: roleDesc.trim() || null,
            description_bn: roleDescBn.trim() || null,
          })
          .eq('id', editingRole.id);
        if (error) throw error;
      } else {
        const payload = {
          name: roleName.trim().toLowerCase(),
          name_bn: roleNameBn.trim(),
          description: roleDesc.trim() || null,
          description_bn: roleDescBn.trim() || null,
          base_role: roleBaseRole,
        };

        if (editingRole) {
          const { error } = await supabase.from('custom_roles').update(payload).eq('id', editingRole.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('custom_roles').insert(payload);
          if (error) throw error;
        }
      }

      toast.success(bn ? '✅ রোল সফলভাবে সংরক্ষিত হয়েছে' : '✅ Role saved successfully');
      setRoleDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'রোল সেভ ব্যর্থ' : 'Failed to save role'));
    } finally {
      setRoleSaving(false);
    }
  };

  // Delete role
  const deleteCustomRole = async (role: CustomRole) => {
    if (
      !(await confirm({
        description: bn
          ? `আপনি কি নিশ্চিতভাবে "${role.name_bn || role.name}" রোলটি মুছে ফেলতে চান?`
          : `Are you sure you want to delete role "${role.name}"?`,
        variant: 'destructive',
      }))
    )
      return;

    try {
      const { error } = await supabase.from('custom_roles').delete().eq('id', role.id);
      if (error) throw error;
      toast.success(bn ? 'রোল মুছে ফেলা হয়েছে' : 'Role deleted');
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
    } catch {
      toast.error(bn ? 'ডিলিট ব্যর্থ' : 'Delete failed');
    }
  };

  if (selectedRoleForModal) {

    return (
      <AdminLayout>
        {modalLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <PermissionPageEditor
            mode="role"
            target={selectedRoleForModal}
            allMenuPaths={allMenuPaths}
            initialPerms={rolePermsForModal}
            initialHiddenFeatures={roleFeaturesForModal}
            onBack={() => setSelectedRoleForModal(null)}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['role-permissions-all'] });
              queryClient.invalidateQueries({ queryKey: ['role_feature_permissions'] });
            }}
          />
        )}
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>

      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                <KeyRound className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  {bn ? 'রোল ও পারমিশন কন্ট্রোল হাব' : 'Role & Permissions Hub'}
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  {bn
                    ? 'প্রতিটি পেজের অ্যাক্সেস, মেকার-চেকার অনুমোদন শর্ত এবং অভ্যন্তরীণ ট্যাব ১০০% হাইড করার কেন্দ্রীয় নিয়ন্ত্রণ।'
                    : 'Manage page access, maker-checker approval controls, and 100% invisible sub-features for every role.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className={`gap-1.5 h-9 ${viewMode === 'cards' ? 'btn-primary-gradient' : ''}`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>{bn ? 'কার্ড ভিউ' : 'Card View'}</span>
              </Button>
              <Button
                variant={viewMode === 'matrix' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('matrix')}
                className={`gap-1.5 h-9 ${viewMode === 'matrix' ? 'btn-primary-gradient' : ''}`}
              >
                <TableIcon className="w-4 h-4" />
                <span>{bn ? 'ম্যাট্রিক্স ভিউ' : 'Matrix View'}</span>
              </Button>
              <Button onClick={() => openRoleDialog()} className="btn-primary-gradient gap-1.5 h-9 shadow-sm">
                <Plus className="w-4 h-4" />
                <span>{bn ? 'নতুন রোল তৈরি' : 'New Role'}</span>
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mt-5 pt-4 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={bn ? 'রোল নাম বা বিবরণ খুঁজুন...' : 'Search role name...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <Button
                size="sm"
                variant={baseFilter === 'all' ? 'default' : 'ghost'}
                onClick={() => setBaseFilter('all')}
                className={`h-7 px-2.5 text-xs rounded-full ${baseFilter === 'all' ? 'btn-primary-gradient' : ''}`}
              >
                {bn ? 'সকল রোল' : 'All'} ({rolesList.length})
              </Button>
              {['admin', 'teacher', 'staff', 'student', 'parent'].map((bf) => (
                <Button
                  key={bf}
                  size="sm"
                  variant={baseFilter === bf ? 'default' : 'ghost'}
                  onClick={() => setBaseFilter(bf)}
                  className={`h-7 px-2.5 text-xs rounded-full capitalize ${
                    baseFilter === bf ? 'btn-primary-gradient' : ''
                  }`}
                >
                  {bf}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* View Mode: Cards View */}
        {viewMode === 'cards' && (
          <div className="space-y-4">
            {rolesLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border rounded-2xl bg-card">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-base font-semibold">{bn ? 'কোনো রোল পাওয়া যায়নি' : 'No roles found'}</p>
                <p className="text-xs mt-1">{bn ? 'নতুন রোল তৈরি করতে উপরের বাটনে ক্লিক করুন।' : 'Click the button above to create a new role.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredRoles.map((r) => {
                  const userCount = roleUserCounts[r.name] || 0;
                  // Calculate permitted pages
                  const rolePerms = allRolePerms.filter((p) => p.role === r.name && p.can_view);
                  const allowedPagesCount = rolePerms.length;

                  // Calculate approval requirements count
                  const featSettings = roleFeatureSettings[r.name] || {};
                  let approvalCount = 0;
                  let hiddenFeaturesCount = 0;
                  Object.entries(featSettings).forEach(([k, v]) => {
                    if (k.includes(':approval_') && v === true) approvalCount++;
                    else if (!k.includes(':approval_') && v === false) hiddenFeaturesCount++;
                  });

                  return (
                    <div
                      key={r.id}
                      className="group relative bg-card hover:bg-card/90 rounded-2xl border border-border/80 hover:border-primary/40 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Top bar */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-inner">
                              <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="font-bold text-base text-foreground leading-tight">
                                {bn ? r.name_bn || r.name : r.name}
                              </h3>
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">{r.name}</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {r.is_system ? (
                              <Badge variant="secondary" className="text-[10px] h-4">
                                {bn ? 'সিস্টেম' : 'System'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] h-4 text-primary border-primary/30">
                                {bn ? 'কাস্টম' : 'Custom'}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] h-4 bg-muted text-muted-foreground">
                              Base: {r.base_role}
                            </Badge>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px] mb-4">
                          {(bn ? r.description_bn : r.description) ||
                            (bn ? 'এই রোলের জন্য কোনো বিশেষ বিবরণ যোগ করা হয়নি।' : 'No description provided.')}
                        </p>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs py-2.5 px-3 rounded-xl bg-muted/40 mb-4 border border-border/40">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="w-3.5 h-3.5 text-primary" />
                            <span>{bn ? 'ইউজার:' : 'Users:'}</span>
                            <strong className="text-foreground font-mono">{userCount}</strong>
                          </div>

                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{bn ? 'পেজ অ্যাক্সেস:' : 'Pages:'}</span>
                            <strong className="text-foreground font-mono">{allowedPagesCount}</strong>
                          </div>

                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            <span>{bn ? 'অনুমোদন শর্ত:' : 'Approvals:'}</span>
                            <strong className="text-foreground font-mono">{approvalCount}</strong>
                          </div>

                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Sliders className="w-3.5 h-3.5 text-rose-500" />
                            <span>{bn ? 'ট্যাব হাইড:' : 'Hidden tabs:'}</span>
                            <strong className="text-foreground font-mono">{hiddenFeaturesCount}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleOpenPermModal(r)}
                          className="flex-1 btn-primary-gradient h-8 text-xs gap-1.5 shadow-sm"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>{bn ? 'পারমিশন কার্ড ওপেন করুন' : 'Open Permissions'}</span>
                        </Button>

                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            onClick={() => openRoleDialog(r)}
                            title={bn ? 'রোল সম্পাদনা' : 'Edit Role'}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {!r.is_system && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                              onClick={() => deleteCustomRole(r)}
                              title={bn ? 'মুছুন' : 'Delete Role'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* View Mode: Matrix View */}
        {viewMode === 'matrix' && (
          <div className="rounded-2xl border bg-card p-4 overflow-x-auto shadow-sm">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-3 font-semibold">{bn ? 'পেজ / মডিউল' : 'Page / Module'}</th>
                  {filteredRoles.map((r) => (
                    <th key={r.name} className="p-3 text-center font-semibold whitespace-nowrap">
                      <div>{bn ? r.name_bn || r.name : r.name}</div>
                      <span className="text-[10px] text-muted-foreground font-mono font-normal">({r.name})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {allMenuPaths.map((mp) => (
                  <tr key={mp.path} className="hover:bg-muted/10 transition-colors">
                    <td className="p-3">
                      <div className="font-medium text-foreground">{bn ? mp.label_bn : mp.label_en}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{mp.path}</div>
                    </td>
                    {filteredRoles.map((r) => {
                      const perm = allRolePerms.find((p) => p.role === r.name && p.menu_path === mp.path);
                      const hasView = perm?.can_view;
                      const hasApp =
                        roleFeatureSettings[r.name]?.[`${mp.path}:approval_add`] ||
                        roleFeatureSettings[r.name]?.[`${mp.path}:approval_edit`] ||
                        roleFeatureSettings[r.name]?.[`${mp.path}:approval_delete`];

                      return (
                        <td key={r.name} className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenPermModal(r)}
                            className="inline-flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                          >
                            {hasView ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                                {bn ? 'সক্রিয়' : 'Active'}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="opacity-40 text-[10px]">
                                {bn ? 'বন্ধ' : 'None'}
                              </Badge>
                            )}
                            {hasApp && (
                              <span className="text-[9px] text-amber-600 font-bold">
                                {bn ? 'অনুমোদন শর্ত' : 'Needs Appr'}
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Role Create / Edit Dialog */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span>
                  {editingRole
                    ? (bn ? 'রোল সম্পাদনা' : 'Edit Role')
                    : (bn ? 'নতুন কাস্টম রোল তৈরি' : 'Create Custom Role')}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>{bn ? 'রোলের আইডেন্টিফায়ার (ইংরেজি ছোট হাতের)' : 'Role Slug'}</Label>
                <Input
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="e.g. accountant, librarian, driver"
                  disabled={editingRole?.is_system}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{bn ? 'বাংলা নাম' : 'Bengali Name'}</Label>
                <Input
                  value={roleNameBn}
                  onChange={(e) => setRoleNameBn(e.target.value)}
                  placeholder="যেমন: একাউন্ট্যান্ট, লাইব্রেরিয়ান"
                />
              </div>

              <div className="space-y-1.5">
                <Label>{bn ? 'বেস রোল' : 'Base Role'}</Label>
                <Select value={roleBaseRole} onValueChange={setRoleBaseRole} disabled={editingRole?.is_system}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {bn ? 'এই রোলটি কোন মূল ধরনের কাঠামোর অধীনে থাকবে।' : 'Determines default portal behavior.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>{bn ? 'বিবরণ (বাংলা)' : 'Description (Bengali)'}</Label>
                <Textarea
                  value={roleDescBn}
                  onChange={(e) => setRoleDescBn(e.target.value)}
                  rows={2}
                  placeholder="রোলের সংক্ষিপ্ত দায়িত্ব লিখুন..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)} disabled={roleSaving}>
                {bn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button onClick={saveCustomRole} disabled={roleSaving} className="btn-primary-gradient">
                {roleSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                {bn ? 'রোল সেভ করুন' : 'Save Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};


export default AdminPermissions;
