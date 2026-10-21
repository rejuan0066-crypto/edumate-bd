import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { broadcastPermissionChange } from '@/hooks/usePermissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  KeyRound,
  Search,
  Save,
  Loader2,
  CheckCircle2,
  Eye,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  EyeOff,
  Sliders,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { KNOWN_PAGE_FEATURES, SubFeatureItem } from '@/lib/pageFeatures';
import { getPagePermissionProfile } from '@/lib/permissionProfiles';
import type { MenuPathItem } from '@/lib/menuPathList';

export interface RolePermItem {
  menu_path: string;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  approval_add?: boolean;
  approval_edit?: boolean;
  approval_delete?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: { id: string; name: string; name_bn?: string; base_role?: string } | null;
  allMenuPaths: MenuPathItem[];
  initialPerms: RolePermItem[];
  initialHiddenFeatures?: Record<string, boolean>; // key: `${menuPath}:${featureKey}` -> boolean (false = hidden)
  onSaved: () => void;
}

export const RolePermissionCardModal = ({
  open,
  onOpenChange,
  role,
  allMenuPaths,
  initialPerms,
  initialHiddenFeatures = {},
  onSaved,
}: Props) => {
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'data' | 'audit_log' | 'settings'>('all');
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Local state for permissions (including approval_add, approval_edit, approval_delete)
  const [permsMap, setPermsMap] = useState<Record<string, RolePermItem>>(() => {
    const map: Record<string, RolePermItem> = {};
    allMenuPaths.forEach((mp) => {
      const found = initialPerms.find((p) => p.menu_path === mp.path);
      map[mp.path] = {
        menu_path: mp.path,
        can_view: found?.can_view ?? false,
        can_add: found?.can_add ?? false,
        can_edit: found?.can_edit ?? false,
        can_delete: found?.can_delete ?? false,
        can_approve: found?.can_approve ?? false,
        approval_add: initialHiddenFeatures[`${mp.path}:approval_add`] ?? found?.approval_add ?? false,
        approval_edit: initialHiddenFeatures[`${mp.path}:approval_edit`] ?? found?.approval_edit ?? false,
        approval_delete: initialHiddenFeatures[`${mp.path}:approval_delete`] ?? found?.approval_delete ?? false,
      };
    });
    return map;
  });

  // Local state for internal sub-features / tabs visibility (true = allowed, false = 100% hidden)
  const [subFeaturesMap, setSubFeaturesMap] = useState<Record<string, boolean>>(() => {
    return { ...initialHiddenFeatures };
  });

  // Sync state if modal is reopened with new props
  useMemo(() => {
    const map: Record<string, RolePermItem> = {};
    allMenuPaths.forEach((mp) => {
      const found = initialPerms.find((p) => p.menu_path === mp.path);
      map[mp.path] = {
        menu_path: mp.path,
        can_view: found?.can_view ?? false,
        can_add: found?.can_add ?? false,
        can_edit: found?.can_edit ?? false,
        can_delete: found?.can_delete ?? false,
        can_approve: found?.can_approve ?? false,
        approval_add: initialHiddenFeatures[`${mp.path}:approval_add`] ?? found?.approval_add ?? false,
        approval_edit: initialHiddenFeatures[`${mp.path}:approval_edit`] ?? found?.approval_edit ?? false,
        approval_delete: initialHiddenFeatures[`${mp.path}:approval_delete`] ?? found?.approval_delete ?? false,
      };
    });
    setPermsMap(map);
    setSubFeaturesMap({ ...initialHiddenFeatures });
  }, [role?.name, initialPerms, initialHiddenFeatures, allMenuPaths]);

  // Group pages by group_bn / category
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allMenuPaths.forEach((mp) => {
      if (mp.group_bn) cats.add(mp.group_bn);
    });
    return Array.from(cats);
  }, [allMenuPaths]);

  // Filtered menu paths
  const filteredPaths = useMemo(() => {
    let list = allMenuPaths;
    if (activeCategory !== 'all') {
      list = list.filter((mp) => mp.group_bn === activeCategory);
    }
    if (activeTypeFilter !== 'all') {
      list = list.filter((mp) => {
        const prof = getPagePermissionProfile(mp.path);
        if (activeTypeFilter === 'audit_log') return prof.type === 'audit_log' || prof.type === 'report';
        if (activeTypeFilter === 'settings') return prof.type === 'settings';
        if (activeTypeFilter === 'data') return prof.type === 'standard_crud' || prof.type === 'approval_workflow';
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (mp) =>
          mp.path.toLowerCase().includes(q) ||
          (mp.label_bn && mp.label_bn.toLowerCase().includes(q)) ||
          (mp.label_en && mp.label_en.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allMenuPaths, activeCategory, activeTypeFilter, search]);

  // Toggle basic permission
  const togglePerm = (path: string, field: keyof Omit<RolePermItem, 'menu_path'>) => {
    setPermsMap((prev) => {
      const current = prev[path] || {
        menu_path: path,
        can_view: false,
        can_add: false,
        can_edit: false,
        can_delete: false,
        can_approve: false,
        approval_add: false,
        approval_edit: false,
        approval_delete: false,
      };
      const updated = { ...current, [field]: !current[field] };
      // If toggling off view, automatically toggle off all sub actions & approvals
      if (field === 'can_view' && !updated.can_view) {
        updated.can_add = false;
        updated.can_edit = false;
        updated.can_delete = false;
        updated.can_approve = false;
        updated.approval_add = false;
        updated.approval_edit = false;
        updated.approval_delete = false;
      }
      // If toggling off add/edit/delete, clear their corresponding approval flag
      if (field === 'can_add' && !updated.can_add) updated.approval_add = false;
      if (field === 'can_edit' && !updated.can_edit) updated.approval_edit = false;
      if (field === 'can_delete' && !updated.can_delete) updated.approval_delete = false;

      return { ...prev, [path]: updated };
    });
  };

  // Toggle approval requirement (Maker-Checker)
  const toggleApproval = (path: string, field: 'approval_add' | 'approval_edit' | 'approval_delete') => {
    setPermsMap((prev) => {
      const current = prev[path] || {
        menu_path: path,
        can_view: false,
        can_add: false,
        can_edit: false,
        can_delete: false,
        can_approve: false,
        approval_add: false,
        approval_edit: false,
        approval_delete: false,
      };
      return {
        ...prev,
        [path]: {
          ...current,
          [field]: !current[field],
        },
      };
    });
  };

  const toggleAllForPath = (path: string) => {
    setPermsMap((prev) => {
      const current = prev[path] || {
        menu_path: path,
        can_view: false,
        can_add: false,
        can_edit: false,
        can_delete: false,
        can_approve: false,
        approval_add: false,
        approval_edit: false,
        approval_delete: false,
      };
      const allOn =
        current.can_view && current.can_add && current.can_edit && current.can_delete && current.can_approve;
      return {
        ...prev,
        [path]: {
          ...current,
          can_view: !allOn,
          can_add: !allOn,
          can_edit: !allOn,
          can_delete: !allOn,
          can_approve: !allOn,
          approval_add: !allOn ? current.approval_add : false,
          approval_edit: !allOn ? current.approval_edit : false,
          approval_delete: !allOn ? current.approval_delete : false,
        },
      };
    });
  };

  const toggleSubFeature = (path: string, featKey: string) => {
    const key = `${path}:${featKey}`;
    setSubFeaturesMap((prev) => {
      const curr = prev[key] !== false; // default true
      return { ...prev, [key]: !curr };
    });
  };

  const toggleExpand = (path: string) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // Bulk actions for visible list
  const bulkSetAction = (action: keyof Omit<RolePermItem, 'menu_path'>, val: boolean) => {
    setPermsMap((prev) => {
      const next = { ...prev };
      filteredPaths.forEach((mp) => {
        const profile = getPagePermissionProfile(mp.path);
        if (action === 'can_add' && !profile.allowAdd && val) return;
        if (action === 'can_edit' && !profile.allowEdit && val) return;
        if (action === 'can_delete' && !profile.allowDelete && val) return;
        if (action === 'can_approve' && !profile.allowApprove && val) return;

        const curr = next[mp.path] || {
          menu_path: mp.path,
          can_view: false,
          can_add: false,
          can_edit: false,
          can_delete: false,
          can_approve: false,
          approval_add: false,
          approval_edit: false,
          approval_delete: false,
        };
        const updated = { ...curr, [action]: val };
        if (action === 'can_view' && !val) {
          updated.can_add = false;
          updated.can_edit = false;
          updated.can_delete = false;
          updated.can_approve = false;
          updated.approval_add = false;
          updated.approval_edit = false;
          updated.approval_delete = false;
        }
        next[mp.path] = updated;
      });
      return next;
    });
  };

  const setReadOnly = () => {
    setPermsMap((prev) => {
      const next = { ...prev };
      filteredPaths.forEach((mp) => {
        next[mp.path] = {
          menu_path: mp.path,
          can_view: true,
          can_add: false,
          can_edit: false,
          can_delete: false,
          can_approve: false,
          approval_add: false,
          approval_edit: false,
          approval_delete: false,
        };
      });
      return next;
    });
  };

  // Bulk Maker-Checker approvals toggle
  const bulkSetApprovals = (val: boolean) => {
    setPermsMap((prev) => {
      const next = { ...prev };
      filteredPaths.forEach((mp) => {
        const profile = getPagePermissionProfile(mp.path);
        const curr = next[mp.path] || {
          menu_path: mp.path,
          can_view: false,
          can_add: false,
          can_edit: false,
          can_delete: false,
          can_approve: false,
          approval_add: false,
          approval_edit: false,
          approval_delete: false,
        };
        next[mp.path] = {
          ...curr,
          approval_add: val && profile.supportsApprovalWorkflow && profile.allowAdd && curr.can_add,
          approval_edit: val && profile.supportsApprovalWorkflow && profile.allowEdit && curr.can_edit,
          approval_delete: val && profile.supportsApprovalWorkflow && profile.allowDelete && curr.can_delete,
        };
      });
      return next;
    });
  };

  // Save handler
  const handleSave = async () => {
    if (!role) return;
    setSaving(true);
    try {
      // 1. Delete and re-insert role_permissions
      await supabase.from('role_permissions').delete().eq('role', role.name);

      const toInsert = Object.values(permsMap)
        .filter((p) => p.can_view || p.can_add || p.can_edit || p.can_delete || p.can_approve)
        .map((p) => ({
          role: role.name,
          menu_path: p.menu_path,
          can_view: p.can_view,
          can_add: p.can_add,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
          can_approve: p.can_approve,
        }));

      if (toInsert.length > 0) {
        const { error: permErr } = await supabase.from('role_permissions').insert(toInsert);
        if (permErr) throw permErr;
      }

      // 2. Prepare sub-features map including approval flags: `${menuPath}:approval_${action}`
      const finalFeaturesMap: Record<string, boolean> = { ...subFeaturesMap };
      Object.values(permsMap).forEach((p) => {
        // Save approval flags into features map
        if (p.approval_add) finalFeaturesMap[`${p.menu_path}:approval_add`] = true;
        else delete finalFeaturesMap[`${p.menu_path}:approval_add`];

        if (p.approval_edit) finalFeaturesMap[`${p.menu_path}:approval_edit`] = true;
        else delete finalFeaturesMap[`${p.menu_path}:approval_edit`];

        if (p.approval_delete) finalFeaturesMap[`${p.menu_path}:approval_delete`] = true;
        else delete finalFeaturesMap[`${p.menu_path}:approval_delete`];
      });

      // Save into website_settings key 'role_feature_permissions'
      const { data: existingSettings } = await supabase
        .from('website_settings')
        .select('id, value')
        .eq('key', 'role_feature_permissions')
        .maybeSingle();

      const currentVal = (existingSettings?.value as Record<string, Record<string, boolean>>) || {};
      const updatedVal = {
        ...currentVal,
        [role.name]: finalFeaturesMap,
      };

      if (existingSettings?.id) {
        await supabase
          .from('website_settings')
          .update({ value: updatedVal as any, updated_at: new Date().toISOString() })
          .eq('id', existingSettings.id);
      } else {
        await supabase
          .from('website_settings')
          .insert({ key: 'role_feature_permissions', value: updatedVal as any });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['role-permissions'] }),
        queryClient.invalidateQueries({ queryKey: ['user-permissions'] }),
        queryClient.invalidateQueries({ queryKey: ['role-hidden-features-settings'] }),
        queryClient.invalidateQueries({ queryKey: ['user-permissions-approval'] }),
      ]);
      broadcastPermissionChange();

      toast.success(bn ? '✅ রোলের সকল পারমিশন, অনুমোদন ও অপশন সেভ সম্পন্ন!' : '✅ Role permissions, approvals & options saved!');
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'পারমিশন সেভ ব্যর্থ' : 'Failed to save permissions'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[94vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-primary/20">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold">{bn ? 'রোল পারমিশন ও অনুমোদন নিয়ন্ত্রণ' : 'Role Permissions & Approval Controls'}</span>
                {role && (
                  <Badge variant="outline" className="ml-2.5 bg-primary/10 text-primary border-primary/30 text-xs px-2.5 py-0.5">
                    {bn ? role.name_bn || role.name : role.name} ({role.name})
                  </Badge>
                )}
              </div>
            </DialogTitle>

            {role?.base_role && (
              <Badge variant="secondary" className="text-xs">
                Base Role: {role.base_role}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {bn
              ? 'প্রতিটি পেজের অ্যাক্সেস, অ্যাকশন ক্ষমতা, মেকার-চেকার অনুমোদন শর্ত এবং অভ্যন্তরীণ ট্যাব ১০০% অদৃশ্য করার নিয়ন্ত্রণ।'
              : 'Configure page access, CRUD actions, maker-checker approval requirements, and complete visibility control for internal tabs.'}
          </p>
        </DialogHeader>

        {/* Toolbar: Category tabs, Search & Bulk Actions */}
        <div className="p-4 border-b bg-card space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={bn ? 'পেজ বা মেনু নাম লিখে খুঁজুন...' : 'Search page or feature name...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Bulk Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => bulkSetAction('can_view', true)} className="h-8 text-xs">
                {bn ? 'সব পেজ দেখা' : 'View All'}
              </Button>
              <Button size="sm" variant="outline" onClick={setReadOnly} className="h-8 text-xs">
                {bn ? 'শুধু রিড-অনলি' : 'Read Only'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkSetApprovals(true)}
                className="h-8 text-xs border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
              >
                <AlertTriangle className="w-3 h-3 mr-1 text-amber-500" />
                {bn ? 'সব অনুমোদন আবশ্যক' : 'All Approvals On'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkSetApprovals(false)}
                className="h-8 text-xs border-muted text-muted-foreground"
              >
                {bn ? 'অনুমোদন বন্ধ' : 'Approvals Off'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkSetAction('can_view', false)} className="h-8 text-xs">
                {bn ? 'ক্লিয়ার সব' : 'Clear All'}
              </Button>
            </div>
          </div>

          {/* Page Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-b border-border/40 pb-2">
            <span className="text-xs font-semibold text-muted-foreground mr-1 hidden sm:inline">{bn ? 'পেইজের ধরন:' : 'Page Type:'}</span>
            <Button
              size="sm"
              variant={activeTypeFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setActiveTypeFilter('all')}
              className={`h-7 px-2.5 text-xs rounded-lg ${activeTypeFilter === 'all' ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'border-border/60 text-muted-foreground'}`}
            >
              {bn ? 'সকল পেইজ' : 'All Pages'}
            </Button>
            <Button
              size="sm"
              variant={activeTypeFilter === 'data' ? 'default' : 'outline'}
              onClick={() => setActiveTypeFilter('data')}
              className={`h-7 px-2.5 text-xs rounded-lg ${activeTypeFilter === 'data' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm' : 'border-border/60 text-muted-foreground'}`}
            >
              {bn ? 'ম্যানেজমেন্ট ও ডাটা এন্ট্রি' : 'Management & Data'}
            </Button>
            <Button
              size="sm"
              variant={activeTypeFilter === 'audit_log' ? 'default' : 'outline'}
              onClick={() => setActiveTypeFilter('audit_log')}
              className={`h-7 px-2.5 text-xs rounded-lg ${activeTypeFilter === 'audit_log' ? 'bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm' : 'border-border/60 text-muted-foreground'}`}
            >
              {bn ? 'অডিট রেকর্ড ও রিপোর্ট (শুধু দেখা)' : 'Audit & Reports (Read-Only)'}
            </Button>
            <Button
              size="sm"
              variant={activeTypeFilter === 'settings' ? 'default' : 'outline'}
              onClick={() => setActiveTypeFilter('settings')}
              className={`h-7 px-2.5 text-xs rounded-lg ${activeTypeFilter === 'settings' ? 'bg-slate-700 hover:bg-slate-800 text-white font-semibold shadow-sm' : 'border-border/60 text-muted-foreground'}`}
            >
              {bn ? 'সেটিংস ও কনফিগারেশন' : 'Settings & Setup'}
            </Button>
          </div>

          {/* Categories Horizontal Tabs */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <Button
                size="sm"
                variant={activeCategory === 'all' ? 'default' : 'ghost'}
                onClick={() => setActiveCategory('all')}
                className={`h-7 px-2.5 text-xs rounded-full ${activeCategory === 'all' ? 'btn-primary-gradient' : ''}`}
              >
                {bn ? 'সকল মডিউল' : 'All Modules'}
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={activeCategory === cat ? 'default' : 'ghost'}
                  onClick={() => setActiveCategory(cat)}
                  className={`h-7 px-2.5 text-xs rounded-full whitespace-nowrap ${
                    activeCategory === cat ? 'btn-primary-gradient' : ''
                  }`}
                >
                  {cat}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Legend bar */}
        <div className="px-6 py-2 bg-muted/40 border-b flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-primary" /> {bn ? 'দেখা (View)' : 'View'}
            </span>
            <span className="flex items-center gap-1">
              <Plus className="w-3.5 h-3.5 text-primary" /> {bn ? 'যোগ (Add)' : 'Add'}
            </span>
            <span className="flex items-center gap-1">
              <Pencil className="w-3.5 h-3.5 text-primary" /> {bn ? 'এডিট (Edit)' : 'Edit'}
            </span>
            <span className="flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5 text-rose-500" /> {bn ? 'ডিলিট (Delete)' : 'Delete'}
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> {bn ? 'অনুমোদন দেওয়া (Approve)' : 'Can Approve'}
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> {bn ? 'অনুমোদন লাগবে (Needs Approval)' : 'Needs Approval'}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground italic">
            {bn ? '💡 অপশন আনচেক করলে পেজে কোনো ধূসর লক দেখাবে না, সম্পূর্ণ উধাও থাকবে।' : '💡 Unchecked options are completely omitted from DOM.'}
          </span>
        </div>

        {/* Body: Page Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-muted/10">
          {filteredPaths.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
              {bn ? 'কোনো পেজ পাওয়া যায়নি' : 'No pages found'}
            </div>
          ) : (
            filteredPaths.map((mp) => {
              const perm = permsMap[mp.path] || {
                menu_path: mp.path,
                can_view: false,
                can_add: false,
                can_edit: false,
                can_delete: false,
                can_approve: false,
                approval_add: false,
                approval_edit: false,
                approval_delete: false,
              };
              const profile = getPagePermissionProfile(mp.path);
              const subFeatures = KNOWN_PAGE_FEATURES[mp.path] || [];
              const isExpanded = expandedPages.has(mp.path);
              const allChecked =
                perm.can_view && perm.can_add && perm.can_edit && perm.can_delete && perm.can_approve;

              // Check if any sub-feature is hidden for this page
              const hiddenSubCount = subFeatures.filter(
                (sf) => subFeaturesMap[`${mp.path}:${sf.key}`] === false
              ).length;

              return (
                <div
                  key={mp.path}
                  className={`border rounded-2xl transition-all ${
                    perm.can_view
                      ? 'bg-card border-border/80 shadow-sm'
                      : 'bg-muted/20 border-dashed border-border/40 opacity-70'
                  }`}
                >
                  {/* Card Header Row */}
                  <div className="p-3.5 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <Checkbox
                        checked={perm.can_view}
                        onCheckedChange={() => togglePerm(mp.path, 'can_view')}
                        className="data-[state=checked]:bg-primary mt-1 sm:mt-0"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            {bn ? mp.label_bn : mp.label_en}
                          </span>
                          {mp.group_bn && (
                            <Badge variant="secondary" className="text-[10px] h-4 font-normal">
                              {mp.group_bn}
                            </Badge>
                          )}
                          <Badge variant="outline" className={`text-[10px] h-4 font-normal ${
                            profile.type === 'audit_log' ? 'text-purple-700 border-purple-300 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-300' :
                            profile.type === 'report' ? 'text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300' :
                            profile.type === 'settings' ? 'text-slate-700 border-slate-300 bg-slate-50 dark:bg-slate-900/40 dark:text-slate-300' :
                            profile.type === 'approval_workflow' ? 'text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300' :
                            'text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300'
                          }`}>
                            {bn ? profile.typeBadge_bn : profile.typeBadge_en}
                          </Badge>
                          {hiddenSubCount > 0 && (
                            <Badge variant="outline" className="text-[10px] h-4 text-amber-600 border-amber-400 bg-amber-500/5 font-semibold">
                              {hiddenSubCount} {bn ? 'টি অপশন হাইড' : 'hidden'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{mp.path}</p>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-3 flex-wrap pl-7 xl:pl-0">
                      {/* Standard Actions Group */}
                      <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-muted/40 border border-border/50">
                        {/* View */}
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                          <Checkbox
                            checked={perm.can_view}
                            onCheckedChange={() => togglePerm(mp.path, 'can_view')}
                          />
                          <span className="text-muted-foreground font-medium">{bn ? 'দেখা' : 'View'}</span>
                        </label>

                        {/* Add */}
                        {profile.allowAdd && (
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                            <Checkbox
                              checked={perm.can_add}
                              onCheckedChange={() => togglePerm(mp.path, 'can_add')}
                              disabled={!perm.can_view}
                            />
                            <span className="text-muted-foreground">{bn ? 'যোগ' : 'Add'}</span>
                          </label>
                        )}

                        {/* Edit */}
                        {profile.allowEdit && (
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                            <Checkbox
                              checked={perm.can_edit}
                              onCheckedChange={() => togglePerm(mp.path, 'can_edit')}
                              disabled={!perm.can_view}
                            />
                            <span className="text-muted-foreground">{bn ? 'এডিট' : 'Edit'}</span>
                          </label>
                        )}

                        {/* Delete */}
                        {profile.allowDelete && (
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                            <Checkbox
                              checked={perm.can_delete}
                              onCheckedChange={() => togglePerm(mp.path, 'can_delete')}
                              disabled={!perm.can_view}
                              className="border-rose-400 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                            />
                            <span className="text-rose-600 dark:text-rose-400 font-medium">{bn ? 'ডিলিট' : 'Delete'}</span>
                          </label>
                        )}

                        {/* Approve */}
                        {profile.allowApprove && (
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                            <Checkbox
                              checked={perm.can_approve}
                              onCheckedChange={() => togglePerm(mp.path, 'can_approve')}
                              disabled={!perm.can_view}
                              className="border-emerald-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                            />
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{bn ? 'অনুমোদন' : 'Approve'}</span>
                          </label>
                        )}
                      </div>

                      {/* Maker-Checker: Needs Approval Group */}
                      {profile.supportsApprovalWorkflow && (
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            {bn ? 'অনুমোদন প্রযোজ্য:' : 'Approval Applicable:'}
                          </span>

                          {/* Approval Add */}
                          {profile.allowAdd && (
                            <label className="flex items-center gap-1 text-[11px] cursor-pointer select-none" title={bn ? 'যোগ করার জন্য অনুমোদন প্রযোজ্য' : 'Approval applicable on add'}>
                              <Checkbox
                                checked={perm.approval_add}
                                onCheckedChange={() => toggleApproval(mp.path, 'approval_add')}
                                disabled={!perm.can_add}
                                className="border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 h-3.5 w-3.5"
                              />
                              <span className="text-amber-800 dark:text-amber-300">{bn ? 'যোগ' : 'Add'}</span>
                            </label>
                          )}

                          {/* Approval Edit */}
                          {profile.allowEdit && (
                            <label className="flex items-center gap-1 text-[11px] cursor-pointer select-none" title={bn ? 'এডিট করার জন্য অনুমোদন প্রযোজ্য' : 'Approval applicable on edit'}>
                              <Checkbox
                                checked={perm.approval_edit}
                                onCheckedChange={() => toggleApproval(mp.path, 'approval_edit')}
                                disabled={!perm.can_edit}
                                className="border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 h-3.5 w-3.5"
                              />
                              <span className="text-amber-800 dark:text-amber-300">{bn ? 'এডিট' : 'Edit'}</span>
                            </label>
                          )}

                          {/* Approval Delete */}
                          {profile.allowDelete && (
                            <label className="flex items-center gap-1 text-[11px] cursor-pointer select-none" title={bn ? 'ডিলিট/রিসেট করার জন্য অনুমোদন প্রযোজ্য' : 'Approval applicable on delete'}>
                              <Checkbox
                                checked={perm.approval_delete}
                                onCheckedChange={() => toggleApproval(mp.path, 'approval_delete')}
                                disabled={!perm.can_delete}
                                className="border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 h-3.5 w-3.5"
                              />
                              <span className="text-amber-800 dark:text-amber-300">{bn ? 'ডিলিট' : 'Del'}</span>
                            </label>
                          )}
                        </div>
                      )}

                      {/* Expand sub-features button */}
                      {subFeatures.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleExpand(mp.path)}
                          className={`h-8 px-2.5 text-xs gap-1.5 rounded-xl border ${
                            isExpanded ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-muted/30 border-border/60 text-muted-foreground'
                          }`}
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>{bn ? 'ট্যাব/অপশন নিয়ন্ত্রণ' : 'Tabs/Options'}</span>
                          <Badge variant="secondary" className="text-[10px] h-4 px-1 font-mono">
                            {subFeatures.length}
                          </Badge>
                          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Sub-features accordion */}
                  {isExpanded && subFeatures.length > 0 && (
                    <div className="px-4 py-3.5 border-t bg-muted/20 rounded-b-2xl space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground flex-wrap gap-2">
                        <span className="flex items-center gap-1.5 text-primary">
                          <EyeOff className="w-4 h-4 text-primary" />
                          <span>{bn ? 'অভ্যন্তরীণ ট্যাব ও সংবেদনশীল বাটন ভিজিবিলিটি (আনচেক থাকলে পেজে ১০০% অদৃশ্য থাকবে):' : 'Internal Tab & Sensitive Action Visibility (Unchecked = 100% Invisible):'}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSubFeaturesMap((prev) => {
                                const next = { ...prev };
                                subFeatures.forEach((f) => {
                                  delete next[`${mp.path}:${f.key}`];
                                });
                                return next;
                              });
                            }}
                            className="text-[11px] text-primary hover:underline"
                          >
                            {bn ? 'সব দৃশ্যমান করুন' : 'Show All'}
                          </button>
                          <span className="text-muted-foreground">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSubFeaturesMap((prev) => {
                                const next = { ...prev };
                                subFeatures.forEach((f) => {
                                  next[`${mp.path}:${f.key}`] = false;
                                });
                                return next;
                              });
                            }}
                            className="text-[11px] text-rose-500 hover:underline"
                          >
                            {bn ? 'সব হাইড করুন' : 'Hide All'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {subFeatures.map((feat) => {
                          const featKey = `${mp.path}:${feat.key}`;
                          const isAllowed = subFeaturesMap[featKey] !== false; // default true unless explicitly toggled off

                          const isTab = feat.type === 'tab';

                          return (
                            <div
                              key={feat.key}
                              onClick={() => toggleSubFeature(mp.path, feat.key)}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all cursor-pointer select-none ${
                                isAllowed
                                  ? 'bg-card border-emerald-500/30 text-foreground shadow-sm hover:border-emerald-500/60 hover:bg-emerald-500/5'
                                  : 'bg-rose-500/5 border-rose-500/30 text-muted-foreground hover:border-rose-500/50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <Checkbox
                                  checked={isAllowed}
                                  onCheckedChange={() => toggleSubFeature(mp.path, feat.key)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 h-4 w-4 shrink-0"
                                />
                                <div className="truncate">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-semibold truncate text-sm">{bn ? feat.label_bn : feat.label_en}</p>
                                    <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                                      {isTab ? (bn ? 'ট্যাব' : 'Tab') : (bn ? 'অ্যাকশন' : 'Action')}
                                    </Badge>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground font-mono truncate">{feat.key}</p>
                                </div>
                              </div>

                              <Badge
                                variant={isAllowed ? 'outline' : 'secondary'}
                                className={`text-[10px] shrink-0 font-medium ${
                                  isAllowed
                                    ? 'text-emerald-600 border-emerald-500/40 bg-emerald-500/10'
                                    : 'text-rose-600 bg-rose-500/10 border-rose-500/30'
                                }`}
                              >
                                {isAllowed ? (bn ? 'দৃশ্যমান' : 'Visible') : (bn ? '১০০% হাইড' : 'Hidden')}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3.5 border-t bg-muted/20 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {role ? (
              <span>
                {bn ? 'রোল:' : 'Role:'} <strong className="text-foreground">{bn ? role.name_bn || role.name : role.name}</strong>
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="btn-primary-gradient gap-1.5 shadow-md">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{bn ? 'সকল পারমিশন সেভ করুন' : 'Save All Permissions'}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
