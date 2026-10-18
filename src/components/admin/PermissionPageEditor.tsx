import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
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
  ArrowLeft,
  User,
  Shield,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { KNOWN_PAGE_FEATURES, SubFeatureItem } from '@/lib/pageFeatures';
import { getPagePermissionProfile, PagePermissionProfile } from '@/lib/permissionProfiles';
import type { MenuPathItem } from '@/lib/menuPathList';

export interface PagePermItem {
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
  mode: 'role' | 'user';
  target: {
    id: string;
    name: string;
    name_bn?: string;
    base_role?: string;
    email?: string;
    full_name?: string;
  };
  allMenuPaths: MenuPathItem[];
  initialPerms: PagePermItem[];
  initialHiddenFeatures?: Record<string, boolean>; // key: `${menuPath}:${featureKey}` -> boolean (false = hidden)
  onBack: () => void;
  onSaved: () => void;
}

export const PermissionPageEditor = ({
  mode,
  target,
  allMenuPaths,
  initialPerms,
  initialHiddenFeatures = {},
  onBack,
  onSaved,
}: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'data' | 'audit_log' | 'settings'>('all');
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Local state for permissions (including approval_add, approval_edit, approval_delete)
  const [permsMap, setPermsMap] = useState<Record<string, PagePermItem>>(() => {
    const map: Record<string, PagePermItem> = {};
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
          (mp.label_en && mp.label_en.toLowerCase().includes(q)) ||
          (mp.group_bn && mp.group_bn.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allMenuPaths, activeCategory, activeTypeFilter, search]);


  // Summary counts
  const summaryCounts = useMemo(() => {
    let viewCount = 0;
    let approvalCount = 0;
    let hiddenCount = 0;

    Object.values(permsMap).forEach((p) => {
      if (p.can_view) viewCount++;
      if (p.approval_add) approvalCount++;
      if (p.approval_edit) approvalCount++;
      if (p.approval_delete) approvalCount++;
    });

    Object.entries(subFeaturesMap).forEach(([k, v]) => {
      if (!k.includes(':approval_') && v === false) {
        hiddenCount++;
      }
    });

    return { viewCount, approvalCount, hiddenCount };
  }, [permsMap, subFeaturesMap]);

  // Toggle basic permission
  const togglePerm = (path: string, field: keyof Omit<PagePermItem, 'menu_path'>) => {
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

  const toggleSubFeature = (path: string, featKey: string) => {
    const key = `${path}:${featKey}`;
    setSubFeaturesMap((prev) => {
      const curr = prev[key] !== false; // default true
      const nextVal = !curr;
      const nextMap = { ...prev, [key]: nextVal };
      // If toggling off the entire tab, also clear sub-actions
      if (!nextVal) {
        ['view', 'add', 'edit', 'delete', 'print'].forEach((act) => {
          delete nextMap[`${path}:${featKey}:${act}`];
        });
        ['approval_add', 'approval_edit', 'approval_delete'].forEach((app) => {
          delete nextMap[`${path}:${featKey}:${app}`];
        });
      }
      return nextMap;
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
  const bulkSetAction = (action: keyof Omit<PagePermItem, 'menu_path'>, val: boolean) => {
    setPermsMap((prev) => {
      const next = { ...prev };
      filteredPaths.forEach((mp) => {
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
          approval_add: val && curr.can_add,
          approval_edit: val && curr.can_edit,
          approval_delete: val && curr.can_delete,
        };
      });
      return next;
    });
  };

  // Save handler for both Role and User
  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === 'role') {
        // --- ROLE MODE SAVE ---
        // 1. Delete and re-insert role_permissions
        await supabase.from('role_permissions').delete().eq('role', target.name);

        const toInsert = Object.values(permsMap)
          .filter((p) => p.can_view || p.can_add || p.can_edit || p.can_delete || p.can_approve)
          .map((p) => ({
            role: target.name,
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
          [target.name]: finalFeaturesMap,
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

        toast.success(bn ? '✅ রোলের সকল পারমিশন ও অপশন সফলভাবে সেভ হয়েছে!' : '✅ Role permissions saved successfully!');
      } else {
        // --- USER MODE SAVE ---
        // 1. Delete and re-insert user_permissions
        await supabase.from('user_permissions').delete().eq('user_id', target.id);

        const toInsert = Object.values(permsMap)
          .filter((p) => p.can_view || p.can_add || p.can_edit || p.can_delete || p.can_approve)
          .map((p) => ({
            user_id: target.id,
            menu_path: p.menu_path,
            can_view: p.can_view,
            can_add: p.can_add,
            can_edit: p.can_edit,
            can_delete: p.can_delete,
            can_approve: p.can_approve,
            approval_view: false,
            approval_add: !!p.approval_add,
            approval_edit: !!p.approval_edit,
            approval_delete: !!p.approval_delete,
          }));

        if (toInsert.length > 0) {
          const { error: permErr } = await supabase.from('user_permissions').insert(toInsert);
          if (permErr) throw permErr;
        }

        // 2. Also save user's custom hidden sub-features into website_settings if needed
        const finalFeaturesMap: Record<string, boolean> = { ...subFeaturesMap };
        const { data: existingSettings } = await supabase
          .from('website_settings')
          .select('id, value')
          .eq('key', 'role_feature_permissions')
          .maybeSingle();

        const currentVal = (existingSettings?.value as Record<string, Record<string, boolean>>) || {};
        const updatedVal = {
          ...currentVal,
          [`user_${target.id}`]: finalFeaturesMap,
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

        toast.success(bn ? '✅ ইউজারের ব্যক্তিগত পারমিশন সফলভাবে সেভ হয়েছে!' : '✅ User individual permissions saved!');
      }

      onSaved();
      onBack();
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'পারমিশন সেভ ব্যর্থ' : 'Failed to save permissions'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Banner Navigation */}
      <div className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="gap-1.5 h-10 px-3.5 rounded-xl border-primary/30 hover:bg-primary/10 text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{bn ? 'ফিরে যান' : 'Back'}</span>
            </Button>

            <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
              <KeyRound className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  {mode === 'role'
                    ? (bn ? 'রোল পারমিশন ও অপশন নিয়ন্ত্রণ' : 'Role Permissions & Features')
                    : (bn ? 'ব্যক্তিগত পারমিশন ও অপশন নিয়ন্ত্রণ' : 'Individual Permissions & Features')}
                </h1>

                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs px-2.5 py-0.5 font-bold">
                  {bn ? target.name_bn || target.name : target.name}
                </Badge>

                {target.base_role && (
                  <Badge variant="secondary" className="text-xs">
                    Base: {target.base_role}
                  </Badge>
                )}

                {target.email && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {target.email}
                  </Badge>
                )}
              </div>

              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {mode === 'role'
                  ? (bn
                      ? 'এই রোলের অধীনে থাকা সকল ব্যবহারকারীর প্রতিটি পেজ অ্যাক্সেস, মেকার-চেকার অনুমোদন এবং অভ্যন্তরীণ সাব-ট্যাব সম্পূর্ণ হাইড করার পূর্ণাঙ্গ পেইজ।'
                      : 'Full-page configuration for page access, maker-checker approvals, and 100% invisible sub-features for this role.')
                  : (bn
                      ? 'এই নির্দিষ্ট ব্যবহারকারীর জন্য বিশেষ পারমিশন (যা রোলের পারমিশনের চেয়ে অগ্রাধিকার পাবে)।'
                      : 'Special individual permissions for this user (overrides default role permissions).')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end lg:self-center">
            <Button variant="outline" size="sm" onClick={onBack} disabled={saving} className="h-10 px-4 rounded-xl">
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="btn-primary-gradient gap-2 h-10 px-5 rounded-xl shadow-md">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="font-semibold">{bn ? 'সকল পারমিশন সেভ করুন' : 'Save All Permissions'}</span>
            </Button>
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="mt-5 pt-4 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-600" />
              {bn ? 'দৃশ্যমান পেজ:' : 'Active Pages:'}
            </span>
            <strong className="text-foreground text-sm font-mono">{summaryCounts.viewCount} {bn ? 'টি' : ''}</strong>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {bn ? 'অনুমোদন শর্ত:' : 'Needs Approval:'}
            </span>
            <strong className="text-amber-800 dark:text-amber-300 text-sm font-mono">{summaryCounts.approvalCount} {bn ? 'টি' : ''}</strong>
          </div>

          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
            <span className="text-rose-700 dark:text-rose-400 font-medium flex items-center gap-1.5">
              <EyeOff className="w-4 h-4 text-rose-500" />
              {bn ? 'সম্পূর্ণ উধাও অপশন:' : '100% Hidden Tabs:'}
            </span>
            <strong className="text-rose-800 dark:text-rose-300 text-sm font-mono">{summaryCounts.hiddenCount} {bn ? 'টি' : ''}</strong>
          </div>

          <div className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" />
              {bn ? 'মোট তালিকাভুক্ত পেজ:' : 'Total Pages:'}
            </span>
            <strong className="text-foreground text-sm font-mono">{allMenuPaths.length} {bn ? 'টি' : ''}</strong>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Bulk Actions */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={bn ? 'পেজ বা মেনু নাম লিখে খুঁজুন...' : 'Search page or menu name...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl"
            />
          </div>

          {/* Bulk Action Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => bulkSetAction('can_view', true)} className="h-9 text-xs rounded-xl">
              {bn ? 'সব পেজ দেখা' : 'View All'}
            </Button>
            <Button size="sm" variant="outline" onClick={setReadOnly} className="h-9 text-xs rounded-xl">
              {bn ? 'শুধু রিড-অনলি' : 'Read Only'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkSetApprovals(true)}
              className="h-9 text-xs rounded-xl border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-500" />
              {bn ? 'সব অনুমোদন আবশ্যক' : 'All Approvals On'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkSetApprovals(false)}
              className="h-9 text-xs rounded-xl border-muted text-muted-foreground"
            >
              {bn ? 'অনুমোদন বন্ধ' : 'Approvals Off'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkSetAction('can_view', false)} className="h-9 text-xs rounded-xl">
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
            {bn ? 'অডিট রেকর্ড ও রিপোর্ট (শুধু দেখা)' : 'Audit Logs & Reports'}
          </Button>
          <Button
            size="sm"
            variant={activeTypeFilter === 'settings' ? 'default' : 'outline'}
            onClick={() => setActiveTypeFilter('settings')}
            className={`h-7 px-2.5 text-xs rounded-lg ${activeTypeFilter === 'settings' ? 'bg-slate-700 text-white font-semibold shadow-sm' : 'border-border/60 text-muted-foreground'}`}
          >
            {bn ? 'সেটিংস ও কনফিগারেশন' : 'Settings & Config'}
          </Button>
        </div>

        {/* Categories Horizontal Tabs */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
            <Button
              size="sm"
              variant={activeCategory === 'all' ? 'default' : 'ghost'}
              onClick={() => setActiveCategory('all')}
              className={`h-8 px-3 text-xs rounded-full ${activeCategory === 'all' ? 'btn-primary-gradient' : ''}`}
            >
              {bn ? 'সকল মডিউল' : 'All Modules'}
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={activeCategory === cat ? 'default' : 'ghost'}
                onClick={() => setActiveCategory(cat)}
                className={`h-8 px-3 text-xs rounded-full whitespace-nowrap ${
                  activeCategory === cat ? 'btn-primary-gradient' : ''
                }`}
              >
                {cat}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Guide Info Legend */}
      <div className="px-5 py-2.5 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1 font-medium text-foreground">
            <Eye className="w-3.5 h-3.5 text-primary" /> {bn ? 'দেখা (View)' : 'View'}
          </span>
          <span className="flex items-center gap-1">
            <Plus className="w-3.5 h-3.5 text-primary" /> {bn ? 'যোগ (Add)' : 'Add'}
          </span>
          <span className="flex items-center gap-1">
            <Pencil className="w-3.5 h-3.5 text-primary" /> {bn ? 'এডিট (Edit)' : 'Edit'}
          </span>
          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
            <Trash2 className="w-3.5 h-3.5" /> {bn ? 'ডিলিট (Delete)' : 'Delete'}
          </span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> {bn ? 'অনুমোদন দেওয়া (Approve)' : 'Can Approve'}
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> {bn ? 'অনুমোদন লাগবে (Needs Approval)' : 'Needs Approval'}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground italic font-medium">
          {bn ? '💡 অপশন বন্ধ থাকলে কোনো ধূসর লক দেখাবে না, পেজ থেকে ১০০% অদৃশ্য থাকবে।' : '💡 Unchecked options are 100% invisible in DOM (no greyed lock).'}
        </span>
      </div>

      {/* Page Cards Grid */}
      <div className="space-y-3.5">
        {filteredPaths.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground border rounded-2xl bg-card">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-base font-semibold">{bn ? 'কোনো পেজ পাওয়া যায়নি' : 'No pages found'}</p>
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

            const hiddenSubCount = subFeatures.filter(
              (sf) => subFeaturesMap[`${mp.path}:${sf.key}`] === false
            ).length;

            return (
              <div
                key={mp.path}
                className={`border rounded-2xl transition-all ${
                  perm.can_view
                    ? 'bg-card border-border/80 shadow-sm hover:shadow-md'
                    : 'bg-muted/15 border-dashed border-border/50 opacity-70'
                }`}
              >
                {/* Card Main Row */}
                <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  {/* Page Title & Checkbox */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-[280px]">
                    <Checkbox
                      checked={perm.can_view}
                      onCheckedChange={() => togglePerm(mp.path, 'can_view')}
                      className="data-[state=checked]:bg-primary h-5 w-5 mt-0.5 sm:mt-0"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-foreground">
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
                            {hiddenSubCount} {bn ? 'টি অপশন সম্পূর্ণ হাইড' : 'hidden'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{mp.path}</p>
                    </div>
                  </div>

                  {/* Actions & Approvals Controls */}
                  <div className="flex items-center gap-3 flex-wrap pl-8 xl:pl-0">
                    {/* Standard Permissions Group */}
                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/40 border border-border/60">
                      {/* View */}
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                        <Checkbox
                          checked={perm.can_view}
                          onCheckedChange={() => togglePerm(mp.path, 'can_view')}
                        />
                        <span className="text-muted-foreground font-semibold">{bn ? 'দেখা' : 'View'}</span>
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
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">{bn ? 'ডিলিট' : 'Delete'}</span>
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
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{bn ? 'অনুমোদন' : 'Approve'}</span>
                        </label>
                      )}
                    </div>

                    {/* Maker-Checker: Needs Approval Group */}
                    {profile.supportsApprovalWorkflow && (
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          {bn ? 'অনুমোদন লাগবে:' : 'Needs Approval:'}
                        </span>

                        {/* Approval Add */}
                        {profile.allowAdd && (
                          <label className="flex items-center gap-1 text-xs cursor-pointer select-none" title={bn ? 'যোগ করার পর অ্যাডমিন অনুমোদন লাগবে' : 'Needs admin approval on add'}>
                            <Checkbox
                              checked={perm.approval_add}
                              onCheckedChange={() => toggleApproval(mp.path, 'approval_add')}
                              disabled={!perm.can_add}
                              className="border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 h-4 w-4"
                            />
                            <span className="text-amber-800 dark:text-amber-300 font-medium">{bn ? 'যোগ' : 'Add'}</span>
                          </label>
                        )}

                        {/* Approval Edit */}
                        {profile.allowEdit && (
                          <label className="flex items-center gap-1 text-xs cursor-pointer select-none" title={bn ? 'এডিট করার পর অ্যাডমিন অনুমোদন লাগবে' : 'Needs admin approval on edit'}>
                            <Checkbox
                              checked={perm.approval_edit}
                              onCheckedChange={() => toggleApproval(mp.path, 'approval_edit')}
                              disabled={!perm.can_edit}
                              className="border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 h-4 w-4"
                            />
                            <span className="text-amber-800 dark:text-amber-300 font-medium">{bn ? 'এডিট' : 'Edit'}</span>
                          </label>
                        )}

                        {/* Approval Delete */}
                        {profile.allowDelete && (
                          <label className="flex items-center gap-1 text-xs cursor-pointer select-none" title={bn ? 'ডিলিট করার পর অ্যাডমিন অনুমোদন লাগবে' : 'Needs admin approval on delete'}>
                            <Checkbox
                              checked={perm.approval_delete}
                              onCheckedChange={() => toggleApproval(mp.path, 'approval_delete')}
                              disabled={!perm.can_delete}
                              className="border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 h-4 w-4"
                            />
                            <span className="text-amber-800 dark:text-amber-300 font-medium">{bn ? 'ডিলিট' : 'Del'}</span>
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
                        className={`h-9 px-3 text-xs gap-1.5 rounded-xl border ${
                          isExpanded
                            ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                            : 'bg-muted/30 border-border/60 text-muted-foreground'
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{bn ? 'ট্যাব/অপশন নিয়ন্ত্রণ' : 'Tabs/Options'}</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1 font-mono">
                          {subFeatures.length}
                        </Badge>
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Sub-features accordion */}
                {isExpanded && subFeatures.length > 0 && (
                  <div className="px-5 py-4 border-t bg-muted/20 rounded-b-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground flex-wrap gap-2">
                      <span className="flex items-center gap-2 text-primary font-bold">
                        <EyeOff className="w-4 h-4 text-primary" />
                        <span>{bn ? 'অভ্যন্তরীণ সংবেদনশীল ট্যাব ও অপশন নিয়ন্ত্রণ (আনচেক থাকলে পেজে ১০০% অদৃশ্য থাকবে):' : 'Internal Tab & Action Visibility (Unchecked = 100% Invisible in DOM):'}</span>
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
                          className="text-xs text-primary hover:underline font-medium"
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
                          className="text-xs text-rose-500 hover:underline font-medium"
                        >
                          {bn ? 'সব হাইড করুন' : 'Hide All'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {subFeatures.map((feat) => {
                        const featKey = `${mp.path}:${feat.key}`;
                        const isAllowed = subFeaturesMap[featKey] !== false; // default true unless explicitly toggled off
                        const isTab = feat.type === 'tab';

                        return (
                          <div
                            key={feat.key}
                            onClick={() => toggleSubFeature(mp.path, feat.key)}
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all cursor-pointer select-none ${
                              isAllowed
                                ? 'bg-card border-emerald-500/30 text-foreground shadow-sm hover:border-emerald-500/60 hover:bg-emerald-500/5'
                                : 'bg-rose-500/5 border-rose-500/30 text-muted-foreground hover:border-rose-500/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
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

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl bg-card/95 backdrop-blur-md border border-primary/30 p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-4 z-50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground pl-2">
          <span>{mode === 'role' ? (bn ? 'রোল:' : 'Role:') : (bn ? 'ইউজার:' : 'User:')}</span>
          <strong className="text-foreground">{bn ? target.name_bn || target.name : target.name}</strong>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={onBack} disabled={saving} className="rounded-xl h-9">
            {bn ? 'ফিরে যান' : 'Back'}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="btn-primary-gradient gap-2 rounded-xl h-9 px-5 shadow-lg">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="font-bold">{bn ? 'সকল পারমিশন সেভ করুন' : 'Save All Permissions'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
