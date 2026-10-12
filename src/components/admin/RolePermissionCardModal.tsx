import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { KNOWN_PAGE_FEATURES, SubFeatureItem } from '@/lib/pageFeatures';
import type { MenuPathItem } from '@/lib/menuPathList';

export interface RolePermItem {
  menu_path: string;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
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
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Local state for basic permissions (can_view, can_add, etc.)
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
  }, [allMenuPaths, activeCategory, search]);

  // Toggle helpers
  const togglePerm = (path: string, field: keyof Omit<RolePermItem, 'menu_path'>) => {
    setPermsMap((prev) => {
      const current = prev[path] || {
        menu_path: path,
        can_view: false,
        can_add: false,
        can_edit: false,
        can_delete: false,
        can_approve: false,
      };
      const updated = { ...current, [field]: !current[field] };
      // If toggling off view, automatically toggle off sub actions
      if (field === 'can_view' && !updated.can_view) {
        updated.can_add = false;
        updated.can_edit = false;
        updated.can_delete = false;
        updated.can_approve = false;
      }
      return { ...prev, [path]: updated };
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
      };
      const allOn =
        current.can_view && current.can_add && current.can_edit && current.can_delete && current.can_approve;
      return {
        ...prev,
        [path]: {
          menu_path: path,
          can_view: !allOn,
          can_add: !allOn,
          can_edit: !allOn,
          can_delete: !allOn,
          can_approve: !allOn,
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
        const curr = next[mp.path] || {
          menu_path: mp.path,
          can_view: false,
          can_add: false,
          can_edit: false,
          can_delete: false,
          can_approve: false,
        };
        next[mp.path] = { ...curr, [action]: val };
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

      // 2. Save hidden features into website_settings key 'role_feature_permissions'
      const { data: existingSettings } = await supabase
        .from('website_settings')
        .select('id, value')
        .eq('key', 'role_feature_permissions')
        .maybeSingle();

      const currentVal = (existingSettings?.value as Record<string, Record<string, boolean>>) || {};
      const updatedVal = {
        ...currentVal,
        [role.name]: subFeaturesMap,
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

      toast.success(bn ? '✅ রোলের সকল পারমিশন ও অপশন সেভ সম্পন্ন!' : '✅ Role permissions & sub-features saved!');
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
      <DialogContent className="sm:max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <span>{bn ? 'রোল পারমিশন ও অপশন নিয়ন্ত্রণ' : 'Role Permissions & Feature Controls'}</span>
                {role && (
                  <Badge variant="outline" className="ml-2.5 bg-primary/5 text-primary border-primary/20 text-xs">
                    {bn ? role.name_bn || role.name : role.name}
                  </Badge>
                )}
              </div>
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {bn
              ? 'প্রতিটি পেজের ভিউ, অ্যাড, এডিট, ডিলিটের পাশাপাশি সংবেদনশীল ট্যাব/অপশন পারমিশন না থাকলে ব্যবহারকারীর স্ক্রিন থেকে সম্পূর্ণ উধাও (১০০% Invisible) থাকবে।'
              : 'Configure page access, action permissions, and completely hide sensitive internal tabs/buttons.'}
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
              <Button size="sm" variant="outline" onClick={() => bulkSetAction('can_view', false)} className="h-8 text-xs">
                {bn ? 'ক্লিয়ার সব' : 'Clear All'}
              </Button>
            </div>
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

        {/* Body: Page Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-muted/10">
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
              };
              const subFeatures = KNOWN_PAGE_FEATURES[mp.path] || [];
              const isExpanded = expandedPages.has(mp.path);
              const allChecked =
                perm.can_view && perm.can_add && perm.can_edit && perm.can_delete && perm.can_approve;

              return (
                <div
                  key={mp.path}
                  className={`border rounded-xl transition-all ${
                    perm.can_view ? 'bg-card border-border/80 shadow-sm' : 'bg-muted/20 border-dashed border-border/40 opacity-75'
                  }`}
                >
                  {/* Card Header Row */}
                  <div className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={perm.can_view}
                        onCheckedChange={() => togglePerm(mp.path, 'can_view')}
                        className="data-[state=checked]:bg-primary"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {bn ? mp.label_bn : mp.label_en}
                          </span>
                          {mp.group_bn && (
                            <Badge variant="secondary" className="text-[10px] h-4 font-normal">
                              {mp.group_bn}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{mp.path}</p>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-3 flex-wrap pl-7 md:pl-0">
                      {/* View */}
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                        <Checkbox
                          checked={perm.can_view}
                          onCheckedChange={() => togglePerm(mp.path, 'can_view')}
                        />
                        <span className="text-muted-foreground">{bn ? 'দেখা' : 'View'}</span>
                      </label>

                      {/* Add */}
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                        <Checkbox
                          checked={perm.can_add}
                          onCheckedChange={() => togglePerm(mp.path, 'can_add')}
                          disabled={!perm.can_view}
                        />
                        <span className="text-muted-foreground">{bn ? 'যোগ' : 'Add'}</span>
                      </label>

                      {/* Edit */}
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                        <Checkbox
                          checked={perm.can_edit}
                          onCheckedChange={() => togglePerm(mp.path, 'can_edit')}
                          disabled={!perm.can_view}
                        />
                        <span className="text-muted-foreground">{bn ? 'এডিট' : 'Edit'}</span>
                      </label>

                      {/* Delete */}
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                        <Checkbox
                          checked={perm.can_delete}
                          onCheckedChange={() => togglePerm(mp.path, 'can_delete')}
                          disabled={!perm.can_view}
                          className="border-rose-400 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                        />
                        <span className="text-rose-600 dark:text-rose-400">{bn ? 'ডিলিট' : 'Delete'}</span>
                      </label>

                      {/* Approve */}
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                        <Checkbox
                          checked={perm.can_approve}
                          onCheckedChange={() => togglePerm(mp.path, 'can_approve')}
                          disabled={!perm.can_view}
                          className="border-emerald-500 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{bn ? 'অনুমোদন' : 'Approve'}</span>
                      </label>

                      {/* Expand sub-features button */}
                      {subFeatures.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleExpand(mp.path)}
                          className="h-7 px-2 text-xs text-primary gap-1"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>{bn ? 'ট্যাব/অপশন নিয়ন্ত্রণ' : 'Sub-Features'}</span>
                          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Sub-features accordion */}
                  {isExpanded && subFeatures.length > 0 && (
                    <div className="px-4 py-3 border-t bg-muted/30 rounded-b-xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
                        <span className="flex items-center gap-1 text-primary">
                          <EyeOff className="w-3.5 h-3.5" />
                          {bn ? 'অভ্যন্তরীণ ট্যাব ও সংবেদনশীল বাটন ভিজিবিলিটি (টিক না দিলে সম্পূর্ণ উধাও থাকবে):' : 'Tab & Action Visibility (Unchecked = 100% Invisible):'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {subFeatures.map((feat) => {
                          const featKey = `${mp.path}:${feat.key}`;
                          const isAllowed = subFeaturesMap[featKey] !== false; // default true unless explicitly toggled off

                          return (
                            <div
                              key={feat.key}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                                isAllowed
                                  ? 'bg-card border-emerald-500/30 text-foreground'
                                  : 'bg-rose-500/5 border-rose-500/20 text-muted-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={isAllowed}
                                  onCheckedChange={() => toggleSubFeature(mp.path, feat.key)}
                                  disabled={!perm.can_view}
                                />
                                <div>
                                  <p className="font-medium">{bn ? feat.label_bn : feat.label_en}</p>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1 py-0 h-3.5 mt-0.5 ${
                                      feat.type === 'tab' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'
                                    }`}
                                  >
                                    {feat.type === 'tab' ? (bn ? 'ট্যাব' : 'Tab') : (bn ? 'বাটন' : 'Action')}
                                  </Badge>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-semibold ${
                                  isAllowed ? 'text-emerald-600' : 'text-rose-500'
                                }`}
                              >
                                {isAllowed ? (bn ? 'দেখবে' : 'Visible') : (bn ? 'উধাও' : 'Hidden')}
                              </span>
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
        <DialogFooter className="px-6 py-3 border-t bg-card flex items-center justify-between sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {role && (
              <span>
                {bn ? 'রোল:' : 'Role:'} <strong className="text-foreground">{role.name_bn || role.name}</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="btn-primary-gradient min-w-[120px]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {bn ? 'সংরক্ষণ করুন' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
