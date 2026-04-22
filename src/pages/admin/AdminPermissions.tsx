import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMenuSettings, type MenuItemConfig } from '@/hooks/useMenuSettings';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield, Save, Loader2, Search } from 'lucide-react';

const ROLES = [
  { value: 'staff', label: 'Staff', label_bn: 'স্টাফ' },
  { value: 'teacher', label: 'Teacher', label_bn: 'শিক্ষক' },
];

type FlatMenu = {
  path: string;
  label: string;
  label_bn: string;
  group?: string;
  group_bn?: string;
  depth: number;
};

// Flatten the nested sidebar tree into a single list, preserving group context
// and de-duplicating by path so the same page never appears twice.
const flattenMenu = (items: MenuItemConfig[]): FlatMenu[] => {
  const seen = new Set<string>();
  const out: FlatMenu[] = [];
  items
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .forEach((parent) => {
      if (!seen.has(parent.path)) {
        seen.add(parent.path);
        out.push({
          path: parent.path,
          label: parent.label_en,
          label_bn: parent.label_bn,
          group: parent.label_en,
          group_bn: parent.label_bn,
          depth: 0,
        });
      }
      (parent.children ?? [])
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .forEach((child) => {
          if (seen.has(child.path)) return;
          seen.add(child.path);
          out.push({
            path: child.path,
            label: child.label_en,
            label_bn: child.label_bn,
            group: parent.label_en,
            group_bn: parent.label_bn,
            depth: 1,
          });
        });
    });
  return out;
};

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
  const { menuConfig, isLoading: menuLoading } = useMenuSettings();
  const [selectedRole, setSelectedRole] = useState('staff');
  const [localPerms, setLocalPerms] = useState<Record<string, PermRow>>({});
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState('');

  // Dynamically derive the full menu list from the saved menu config so any
  // new page added through useMenuSettings (or Menu Manager) appears here
  // automatically — no code changes needed.
  const menuItems = useMemo(
    () => flattenMenu(menuConfig?.sidebar ?? []),
    [menuConfig],
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return menuItems;
    return menuItems.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.label_bn.toLowerCase().includes(q) ||
        m.path.toLowerCase().includes(q),
    );
  }, [menuItems, search]);

  const { isLoading } = useQuery({
    queryKey: ['role-permissions', selectedRole, menuItems.length],
    enabled: menuItems.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', selectedRole);
      if (error) throw error;

      // Build local state for every menu item currently in the dynamic list
      const map: Record<string, PermRow> = {};
      menuItems.forEach((item) => {
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
      // Only persist rows for menu paths that currently exist — keeps the
      // table free of stale entries for menus that have been removed.
      const validPaths = new Set(menuItems.map((m) => m.path));
      const rows = Object.values(localPerms)
        .filter((p) => p.menu_path && validPaths.has(p.menu_path))
        .map((p) => ({
          role: selectedRole,
          menu_path: p.menu_path,
          can_view: !!p.can_view,
          can_add: !!p.can_add,
          can_edit: !!p.can_edit,
          can_delete: !!p.can_delete,
          updated_at: new Date().toISOString(),
        }));

      // Always clear the role's existing rows, then insert only if we have rows.
      const { error: delErr } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role', selectedRole);
      if (delErr) throw delErr;

      if (rows.length === 0) return;
      const { error } = await supabase.from('role_permissions').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(language === 'bn' ? 'পারমিশন সেভ হয়েছে' : 'Permissions saved');
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      setDirty(false);
    },
    onError: (err: any) => {
      console.error('[AdminPermissions] save failed', err);
      toast.error(language === 'bn' ? 'সেভ করতে সমস্যা হয়েছে' : 'Failed to save');
    },
  });

  // Build a fresh permission row with all flags off — used as a safe default
  // when a menu path has no existing role_permissions record yet.
  const blankRow = (path: string): PermRow => ({
    menu_path: path,
    can_view: false,
    can_add: false,
    can_edit: false,
    can_delete: false,
  });

  const togglePerm = (path: string, field: keyof PermRow) => {
    if (field === 'menu_path') return;
    setLocalPerms((prev) => {
      const current = prev[path] ?? blankRow(path);
      return {
        ...prev,
        [path]: { ...current, [field]: !current[field] },
      };
    });
    setDirty(true);
  };

  const toggleAllForMenu = (path: string) => {
    setLocalPerms((prev) => {
      const current = prev[path] ?? blankRow(path);
      const allChecked =
        current.can_view && current.can_add && current.can_edit && current.can_delete;
      return {
        ...prev,
        [path]: {
          ...current,
          can_view: !allChecked,
          can_add: !allChecked,
          can_edit: !allChecked,
          can_delete: !allChecked,
        },
      };
    });
    setDirty(true);
  };

  const toggleAllForAction = (field: 'can_view' | 'can_add' | 'can_edit' | 'can_delete') => {
    const allChecked = filteredItems.every((item) => localPerms[item.path]?.[field]);
    setLocalPerms((prev) => {
      const updated = { ...prev };
      filteredItems.forEach((item) => {
        const current = updated[item.path] ?? blankRow(item.path);
        updated[item.path] = { ...current, [field]: !allChecked };
      });
      return updated;
    });
    setDirty(true);
  };

  // Group filtered items by parent for cleaner display
  const grouped = useMemo(() => {
    const groups: { name: string; name_bn: string; items: FlatMenu[] }[] = [];
    const idx = new Map<string, number>();
    filteredItems.forEach((item) => {
      const key = item.group ?? item.label;
      const keyBn = item.group_bn ?? item.label_bn;
      if (!idx.has(key)) {
        idx.set(key, groups.length);
        groups.push({ name: key, name_bn: keyBn, items: [] });
      }
      groups[idx.get(key)!].items.push(item);
    });
    return groups;
  }, [filteredItems]);

  const loading = isLoading || menuLoading;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold font-display">
                {language === 'bn' ? 'পারমিশন ম্যানেজার' : 'Permission Manager'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === 'bn'
                  ? `মেনু থেকে অটো-লোডকৃত ${menuItems.length}টি পেজ`
                  : `${menuItems.length} pages auto-loaded from menu config`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder={language === 'bn' ? 'মেনু খুঁজুন...' : 'Search menu...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8 w-48"
              />
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
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
            ? 'অ্যাডমিন সবসময় সম্পূর্ণ অ্যাক্সেস পাবে। মেনু কনফিগে নতুন পেজ যোগ করলে এই ম্যাট্রিক্সে অটো প্রদর্শিত হবে।'
            : 'Admin always has full access. New pages added via the menu config appear here automatically.'}
        </p>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {language === 'bn' ? 'পারমিশন ম্যাট্রিক্স' : 'Permission Matrix'} —{' '}
              {ROLES.find((r) => r.value === selectedRole)?.[language === 'bn' ? 'label_bn' : 'label']}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : grouped.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {language === 'bn' ? 'কোনো মেনু পাওয়া যায়নি' : 'No menu items found'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium min-w-[260px]">
                        {language === 'bn' ? 'মেনু / ফিচার' : 'Menu / Feature'}
                      </th>
                      {(['can_view', 'can_add', 'can_edit', 'can_delete'] as const).map((field) => (
                        <th key={field} className="text-center p-3 font-medium w-24">
                          <div className="flex flex-col items-center gap-1">
                            <span>
                              {field === 'can_view'
                                ? language === 'bn' ? 'দেখা' : 'View'
                                : field === 'can_add'
                                ? language === 'bn' ? 'যোগ' : 'Add'
                                : field === 'can_edit'
                                ? language === 'bn' ? 'সম্পাদনা' : 'Edit'
                                : language === 'bn' ? 'মুছুন' : 'Delete'}
                            </span>
                            <Checkbox
                              checked={
                                filteredItems.length > 0 &&
                                filteredItems.every((item) => localPerms[item.path]?.[field])
                              }
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
                    {grouped.map((group) => (
                      <>
                        <tr key={`g-${group.name}`} className="bg-muted/40">
                          <td colSpan={6} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {language === 'bn' ? group.name_bn : group.name}
                          </td>
                        </tr>
                        {group.items.map((item, idx) => {
                          const perm = localPerms[item.path];
                          if (!perm) return null;
                          const allChecked =
                            perm.can_view && perm.can_add && perm.can_edit && perm.can_delete;
                          return (
                            <tr
                              key={item.path}
                              className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                            >
                              <td className="p-3 font-medium">
                                <div
                                  className="flex flex-col"
                                  style={{ paddingLeft: item.depth * 16 }}
                                >
                                  <span>{language === 'bn' ? item.label_bn : item.label}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {item.path}
                                  </span>
                                </div>
                              </td>
                              {(['can_view', 'can_add', 'can_edit', 'can_delete'] as const).map(
                                (field) => (
                                  <td key={field} className="text-center p-3">
                                    <Checkbox
                                      checked={perm[field]}
                                      onCheckedChange={() => togglePerm(item.path, field)}
                                    />
                                  </td>
                                ),
                              )}
                              <td className="text-center p-3">
                                <Checkbox
                                  checked={allChecked}
                                  onCheckedChange={() => toggleAllForMenu(item.path)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    ))}
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
