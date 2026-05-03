import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useStaffDirectory } from '@/hooks/useStaffDirectory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trash2, Plus, ShieldCheck, BadgeCheck, Wallet, Star, UserPlus } from 'lucide-react';

type Role = 'verifier' | 'approver' | 'treasurer';

const ROLE_META: Record<Role, { bn: string; en: string; icon: any; color: string }> = {
  verifier: { bn: 'যাচাইকারী', en: 'Verifier', icon: ShieldCheck, color: 'text-blue-600' },
  approver: { bn: 'অনুমোদনকারী', en: 'Approver', icon: BadgeCheck, color: 'text-emerald-600' },
  treasurer: { bn: 'কোষাধ্যক্ষ / হিসাবরক্ষক', en: 'Treasurer / Accountant', icon: Wallet, color: 'text-green-600' },
};

export default function SalaryWorkflowSettings() {
  const { language } = useLanguage();
  const { role: authRole } = useAuth();
  const isSuperAdmin = authRole === 'super_admin';
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [picker, setPicker] = useState<Record<Role, string>>({ verifier: '', approver: '', treasurer: '' });
  const [tab, setTab] = useState<Record<Role, 'directory' | 'custom'>>({
    verifier: 'directory', approver: 'directory', treasurer: 'directory',
  });
  const [custom, setCustom] = useState<Record<Role, { name: string; designation: string }>>({
    verifier: { name: '', designation: '' },
    approver: { name: '', designation: '' },
    treasurer: { name: '', designation: '' },
  });

  // Pull from unified directory (staff + administrative officers)
  const { data: directory = [] } = useStaffDirectory({ source: 'all', status: 'active' });

  // Global toggle: allow custom entries
  const { data: configRow } = useQuery({
    queryKey: ['salary-workflow-config'],
    queryFn: async () => {
      const { data } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'salary_workflow_config')
        .maybeSingle();
      return (data?.value as any) || { allow_custom_entries: true };
    },
  });
  const allowCustom = configRow?.allow_custom_entries !== false;

  const setAllowCustomMutation = useMutation({
    mutationFn: async (val: boolean) => {
      const { error } = await supabase
        .from('website_settings')
        .upsert({ key: 'salary_workflow_config', value: { ...(configRow || {}), allow_custom_entries: val } }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-config'] });
      toast.success(bn ? 'সংরক্ষিত হয়েছে' : 'Saved');
    },
    onError: (e: any) => toast.error(e?.message || 'Error'),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['salary-workflow-settings-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_workflow_settings')
        .select('*')
        .order('role')
        .order('sort_order');
      if (error) throw error;
      return data as any[];
    },
  });

  const addFromDirectoryMutation = useMutation({
    mutationFn: async ({ role, personId }: { role: Role; personId: string }) => {
      const p = directory.find((x) => x.id === personId);
      if (!p) throw new Error('Person not found');
      // staff_id column references staff(id) historically; only set when source is staff to avoid FK violation
      const payload: any = {
        role,
        staff_id: p.source === 'staff' ? p.id : null,
        admin_officer_id: p.source === 'administrative' ? p.id : null,
        display_name: p.name_bn || p.name_en || '',
        designation: p.designation || null,
        source: p.source,
        is_custom: false,
        sort_order: settings.filter((x: any) => x.role === role).length,
      };
      const { error } = await supabase.from('salary_workflow_settings').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-settings-admin'] });
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-settings'] });
      toast.success(bn ? 'যোগ হয়েছে' : 'Added');
    },
    onError: (e: any) => {
      if (e?.code === '23505') toast.error(bn ? 'ইতিমধ্যে যোগ করা আছে' : 'Already added');
      else toast.error(e?.message || 'Error');
    },
  });

  const addCustomMutation = useMutation({
    mutationFn: async ({ role, name, designation }: { role: Role; name: string; designation: string }) => {
      if (!name.trim()) throw new Error(bn ? 'নাম লিখুন' : 'Enter a name');
      const { error } = await supabase.from('salary_workflow_settings').insert({
        role,
        staff_id: null,
        display_name: name.trim(),
        designation: designation.trim() || null,
        source: 'custom',
        is_custom: true,
        sort_order: settings.filter((x: any) => x.role === role).length,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-settings-admin'] });
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-settings'] });
      setCustom((c) => ({ ...c, [vars.role]: { name: '', designation: '' } }));
      toast.success(bn ? 'কাস্টম এন্ট্রি যোগ হয়েছে' : 'Custom entry added');
    },
    onError: (e: any) => toast.error(e?.message || 'Error'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('salary_workflow_settings').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-settings-admin'] });
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-settings'] });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) => {
      const { error: e1 } = await supabase
        .from('salary_workflow_settings')
        .update({ is_default: false })
        .eq('role', role);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from('salary_workflow_settings')
        .update({ is_default: true, is_active: true })
        .eq('id', id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-settings-admin'] });
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-settings'] });
      toast.success(bn ? 'ডিফল্ট হিসেবে সেট হয়েছে' : 'Set as default');
    },
    onError: (e: any) => toast.error(e?.message || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('salary_workflow_settings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-settings-admin'] });
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-settings'] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Removed');
    },
  });

  const renderSection = (role: Role) => {
    const meta = ROLE_META[role];
    const Icon = meta.icon;
    const list = settings.filter((s: any) => s.role === role);
    const usedDirIds = new Set(list.filter((s: any) => !s.is_custom && s.staff_id).map((s: any) => s.staff_id));
    const available = directory.filter((p) => !(p.source === 'staff' && usedDirIds.has(p.id)));

    return (
      <Card key={role} className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className={`text-base flex items-center gap-2 ${meta.color}`}>
            <Icon className="h-4 w-4" /> {bn ? meta.bn : meta.en}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={tab[role]} onValueChange={(v) => setTab({ ...tab, [role]: v as any })}>
            <TabsList className="grid grid-cols-2 w-full h-8">
              <TabsTrigger value="directory" className="text-xs">
                {bn ? 'ডিরেক্টরি থেকে' : 'From directory'}
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-xs" disabled={!allowCustom}>
                {bn ? 'কাস্টম' : 'Custom'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="directory" className="mt-3">
              <div className="flex gap-2">
                <Select value={picker[role]} onValueChange={(v) => setPicker({ ...picker, [role]: v })}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={bn ? 'স্টাফ / কর্মকর্তা নির্বাচন করুন' : 'Select person'} />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((p) => (
                      <SelectItem key={`${p.source}-${p.id}`} value={p.id}>
                        <span className="inline-flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {p.source === 'administrative' ? (bn ? 'প্রশাসনিক' : 'Admin') : (bn ? 'স্টাফ' : 'Staff')}
                          </Badge>
                          {bn ? p.name_bn : (p.name_en || p.name_bn)}
                          {p.designation ? ` · ${p.designation}` : ''}
                          {p.code ? ` (${p.code})` : ''}
                        </span>
                      </SelectItem>
                    ))}
                    {available.length === 0 && (
                      <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                        {bn ? 'সব ব্যক্তি যোগ করা হয়েছে' : 'All people added'}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!picker[role] || addFromDirectoryMutation.isPending}
                  onClick={() => {
                    addFromDirectoryMutation.mutate({ role, personId: picker[role] });
                    setPicker({ ...picker, [role]: '' });
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> {bn ? 'যোগ' : 'Add'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="mt-3 space-y-2">
              {!allowCustom ? (
                <p className="text-xs text-muted-foreground italic">
                  {bn ? 'কাস্টম এন্ট্রি বন্ধ আছে।' : 'Custom entries are disabled.'}
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-2">
                    <Input
                      placeholder={bn ? 'পূর্ণ নাম' : 'Full name'}
                      value={custom[role].name}
                      onChange={(e) => setCustom({ ...custom, [role]: { ...custom[role], name: e.target.value } })}
                    />
                    <Input
                      placeholder={bn ? 'পদবি (ঐচ্ছিক)' : 'Designation (optional)'}
                      value={custom[role].designation}
                      onChange={(e) => setCustom({ ...custom, [role]: { ...custom[role], designation: e.target.value } })}
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!custom[role].name.trim() || addCustomMutation.isPending}
                    onClick={() => addCustomMutation.mutate({ role, name: custom[role].name, designation: custom[role].designation })}
                  >
                    <UserPlus className="h-3 w-3 mr-1" /> {bn ? 'কাস্টম যোগ করুন' : 'Add custom'}
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>

          <div className="space-y-1.5">
            {list.length === 0 && (
              <p className="text-xs text-muted-foreground italic">{bn ? 'কোন তালিকা নেই' : 'No entries yet'}</p>
            )}
            {list.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-muted/30">
                <div className="text-sm min-w-0">
                  <div className="font-medium flex items-center gap-1.5">
                    <span className="truncate">{item.display_name}</span>
                    {item.is_custom && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        {bn ? 'কাস্টম' : 'Custom'}
                      </Badge>
                    )}
                    {item.source === 'administrative' && !item.is_custom && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {bn ? 'প্রশাসনিক' : 'Admin'}
                      </Badge>
                    )}
                  </div>
                  {item.designation && <div className="text-xs text-muted-foreground truncate">{item.designation}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    title={bn ? 'অটো-অ্যাডভান্সে ডিফল্ট হিসেবে ব্যবহার করুন' : 'Use as default for auto-advance'}
                    onClick={() => setDefaultMutation.mutate({ id: item.id, role })}
                  >
                    <Star className={`h-3.5 w-3.5 ${item.is_default ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground'}`} />
                  </Button>
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: item.id, is_active: v })}
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteMutation.mutate(item.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {bn
          ? 'বেতন বিবরণীর অনুমোদন প্রক্রিয়ায় যাচাইকারী, অনুমোদনকারী ও পরিশোধকারী হিসেবে কাজ করতে পারবেন এমন স্টাফ ও প্রশাসনিক কর্মকর্তাদের নির্ধারণ করুন। প্রস্তুতকারী হিসেবে স্বয়ংক্রিয়ভাবে বর্তমান লগইন ব্যবহারকারীর নাম আসবে।'
          : 'Configure which staff and administrative officers can act as verifier, approver, and treasurer. The current logged-in user is automatically used as the preparer.'}
      </div>

      <Card className="rounded-2xl border-emerald-200/60 bg-emerald-50/30">
        <CardContent className="p-4 flex items-start sm:items-center gap-3 flex-col sm:flex-row justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-semibold">
              {bn ? 'কাস্টম এন্ট্রি অনুমোদন' : 'Allow custom entries'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {bn
                ? 'বন্ধ থাকলে শুধুমাত্র ডিরেক্টরির স্টাফ/কর্মকর্তা যোগ করা যাবে; ম্যানুয়াল নাম/পদবি যোগ করা বন্ধ থাকবে।'
                : 'When off, only directory staff/officers can be added; manual name/designation entries are blocked.'}
            </p>
          </div>
          <Switch
            checked={allowCustom}
            disabled={!isSuperAdmin || setAllowCustomMutation.isPending}
            onCheckedChange={(v) => setAllowCustomMutation.mutate(v)}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(['verifier', 'approver', 'treasurer'] as Role[]).map(renderSection)}
      </div>
    </div>
  );
}
