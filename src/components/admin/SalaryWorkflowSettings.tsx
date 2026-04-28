import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Trash2, Plus, ShieldCheck, BadgeCheck, Wallet } from 'lucide-react';

type Role = 'verifier' | 'approver' | 'treasurer';

const ROLE_META: Record<Role, { bn: string; en: string; icon: any; color: string }> = {
  verifier: { bn: 'যাচাইকারী', en: 'Verifier', icon: ShieldCheck, color: 'text-blue-600' },
  approver: { bn: 'অনুমোদনকারী', en: 'Approver', icon: BadgeCheck, color: 'text-emerald-600' },
  treasurer: { bn: 'কোষাধ্যক্ষ / হিসাবরক্ষক', en: 'Treasurer / Accountant', icon: Wallet, color: 'text-green-600' },
};

export default function SalaryWorkflowSettings() {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [picker, setPicker] = useState<Record<Role, string>>({ verifier: '', approver: '', treasurer: '' });

  const { data: staff = [] } = useQuery({
    queryKey: ['workflow-staff-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name_bn, name_en, designation, staff_id')
        .eq('status', 'active')
        .order('name_bn');
      if (error) throw error;
      return data as any[];
    },
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

  const addMutation = useMutation({
    mutationFn: async ({ role, staffId }: { role: Role; staffId: string }) => {
      const s = staff.find((x: any) => x.id === staffId);
      if (!s) throw new Error('Staff not found');
      const { error } = await supabase.from('salary_workflow_settings').insert({
        role,
        staff_id: staffId,
        display_name: s.name_bn || s.name_en,
        designation: s.designation || null,
        sort_order: settings.filter((x: any) => x.role === role).length,
      });
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
    const usedIds = new Set(list.map((s: any) => s.staff_id));
    const available = staff.filter((s: any) => !usedIds.has(s.id));

    return (
      <Card key={role} className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className={`text-base flex items-center gap-2 ${meta.color}`}>
            <Icon className="h-4 w-4" /> {bn ? meta.bn : meta.en}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select value={picker[role]} onValueChange={(v) => setPicker({ ...picker, [role]: v })}>
              <SelectTrigger className="flex-1"><SelectValue placeholder={bn ? 'স্টাফ নির্বাচন করুন' : 'Select staff'} /></SelectTrigger>
              <SelectContent>
                {available.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {bn ? s.name_bn : (s.name_en || s.name_bn)}
                    {s.designation ? ` · ${s.designation}` : ''}
                    {s.staff_id ? ` (${s.staff_id})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!picker[role] || addMutation.isPending}
              onClick={() => {
                addMutation.mutate({ role, staffId: picker[role] });
                setPicker({ ...picker, [role]: '' });
              }}
            >
              <Plus className="h-3 w-3 mr-1" /> {bn ? 'যোগ করুন' : 'Add'}
            </Button>
          </div>

          <div className="space-y-1.5">
            {list.length === 0 && (
              <p className="text-xs text-muted-foreground italic">{bn ? 'কোন তালিকা নেই' : 'No entries yet'}</p>
            )}
            {list.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-muted/30">
                <div className="text-sm">
                  <div className="font-medium">{item.display_name}</div>
                  {item.designation && <div className="text-xs text-muted-foreground">{item.designation}</div>}
                </div>
                <div className="flex items-center gap-2">
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
          ? 'বেতন বিবরণীর অনুমোদন প্রক্রিয়ায় যাচাইকারী, অনুমোদনকারী ও পরিশোধকারী হিসেবে কাজ করতে পারবেন এমন স্টাফদের নির্ধারণ করুন। প্রস্তুতকারী হিসেবে স্বয়ংক্রিয়ভাবে বর্তমান লগইন ব্যবহারকারীর নাম আসবে।'
          : 'Configure which staff can act as verifier, approver, and treasurer in the salary approval workflow. The current logged-in user is automatically used as the preparer.'}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(['verifier', 'approver', 'treasurer'] as Role[]).map(renderSection)}
      </div>
    </div>
  );
}
