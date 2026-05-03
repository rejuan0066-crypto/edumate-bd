import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Languages, Tag, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { checkBanglaDesignation } from '@/lib/banglaDesignationSpellCheck';

type Row = {
  id: string;
  role_key: string;
  name_en: string;
  name_bn: string;
  description_en: string | null;
  description_bn: string | null;
  is_system: boolean;
  sort_order: number;
};

const AdminTranslations = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, Partial<Row>>>({});

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['role-translations-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_translations')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as Row[];
    },
  });

  useEffect(() => { setEdits({}); }, [roles.length]);

  const saveOne = useMutation({
    mutationFn: async (row: Row) => {
      const patch = edits[row.id];
      if (!patch) return;
      const nameBn = (patch.name_bn ?? row.name_bn).trim();
      const nameEn = (patch.name_en ?? row.name_en).trim();
      if (!nameBn || !nameEn) throw new Error(bn ? 'বাংলা ও ইংরেজি নাম আবশ্যক' : 'Both names required');
      const check = checkBanglaDesignation(nameBn, roles.filter(r => r.id !== row.id).map(r => r.name_bn));
      if (check.level === 'error') throw new Error(check.message || 'Spelling error');
      const { error } = await supabase
        .from('role_translations')
        .update({
          name_en: nameEn,
          name_bn: nameBn,
          description_en: (patch.description_en ?? row.description_en ?? '').toString().trim() || null,
          description_bn: (patch.description_bn ?? row.description_bn ?? '').toString().trim() || null,
        })
        .eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['role-translations-admin'] });
      qc.invalidateQueries({ queryKey: ['role-translations'] });
      toast.success(bn ? 'সংরক্ষিত হয়েছে' : 'Saved');
    },
    onError: (e: any) => toast.error(e?.message || 'Error'),
  });

  const update = (id: string, patch: Partial<Row>) =>
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const dirty = (id: string) => !!edits[id] && Object.keys(edits[id]).length > 0;

  return (
    <AdminLayout>
      <div className="max-w-[1200px] mx-auto px-4 lg:px-6 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Languages className="w-6 h-6 text-primary" />
              {bn ? 'অনুবাদ ব্যবস্থাপনা' : 'Translations Manager'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn ? 'ভূমিকা ও পদবির বাংলা/ইংরেজি অনুবাদ ডায়নামিকভাবে এডিট করুন' : 'Edit role & designation translations dynamically'}
            </p>
          </div>
        </div>

        <Tabs defaultValue="roles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="roles" className="gap-1.5"><Shield className="w-4 h-4" /> {bn ? 'ভূমিকা' : 'Roles'}</TabsTrigger>
            <TabsTrigger value="designations" className="gap-1.5"><Tag className="w-4 h-4" /> {bn ? 'পদবি' : 'Designations'}</TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="space-y-3">
            {isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />{bn ? 'লোড হচ্ছে...' : 'Loading...'}</div>}
            {roles.map((r) => {
              const cur = { ...r, ...edits[r.id] };
              return (
                <div key={r.id} className="rounded-2xl border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <code className="text-xs px-2 py-0.5 rounded bg-muted font-mono">{r.role_key}</code>
                      {r.is_system && <Badge variant="secondary" className="text-[10px]">{bn ? 'সিস্টেম' : 'System'}</Badge>}
                    </div>
                    <Button size="sm" disabled={!dirty(r.id) || saveOne.isPending} onClick={() => saveOne.mutate(r)} className="gap-1.5">
                      {saveOne.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {bn ? 'সংরক্ষণ' : 'Save'}
                    </Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'}</Label>
                      <Input className="bg-background mt-1" value={cur.name_bn || ''} onChange={(e) => update(r.id, { name_bn: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</Label>
                      <Input className="bg-background mt-1" value={cur.name_en || ''} onChange={(e) => update(r.id, { name_en: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'বিবরণ (বাংলা)' : 'Description (Bangla)'}</Label>
                      <Textarea rows={2} className="bg-background mt-1" value={cur.description_bn || ''} onChange={(e) => update(r.id, { description_bn: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'বিবরণ (ইংরেজি)' : 'Description (English)'}</Label>
                      <Textarea rows={2} className="bg-background mt-1" value={cur.description_en || ''} onChange={(e) => update(r.id, { description_en: e.target.value })} />
                    </div>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="designations">
            <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
              {bn
                ? 'পদবির অনুবাদ পরিচালনার জন্য '
                : 'To manage designation translations, visit '}
              <Link to="/admin/designations" className="text-primary underline font-semibold">
                /admin/designations
              </Link>
              {bn ? ' পেজে যান। সেখানে বাংলা ও ইংরেজি উভয় নাম এডিট করা যাবে এবং বানান যাচাই হবে।' : '. Both Bangla and English names can be edited there with spell-check.'}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminTranslations;
