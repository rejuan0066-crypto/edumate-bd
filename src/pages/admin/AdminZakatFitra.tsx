import AdminLayout from '@/components/AdminLayout';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Plus, Save, Trash2, Calculator, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { usePagePermissions } from '@/hooks/usePagePermissions';

interface FitraOption {
  name_bn: string;
  name_en: string;
  amount_kg: number;
  price_per_kg: number;
}

interface Row {
  id: string;
  year: number;
  nisab_gold_grams: number;
  nisab_silver_grams: number;
  gold_price_per_gram: number;
  silver_price_per_gram: number;
  zakat_rate: number;
  fitra_options: FitraOption[];
  notes_bn: string;
  notes_en: string;
  is_active: boolean;
}

const blank = (year: number): Omit<Row, 'id'> => ({
  year,
  nisab_gold_grams: 87.48,
  nisab_silver_grams: 612.36,
  gold_price_per_gram: 0,
  silver_price_per_gram: 0,
  zakat_rate: 2.5,
  fitra_options: [{ name_bn: 'গম/আটা', name_en: 'Wheat', amount_kg: 1.65, price_per_kg: 70 }],
  notes_bn: '',
  notes_en: '',
  is_active: true,
});

const AdminZakatFitra = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const confirm = useConfirm();
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/zakat-fitra');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('zakat_fitra_settings')
      .select('*')
      .order('year', { ascending: false });
    if (error) toast.error(error.message);
    setRows(((data as unknown) as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const updateFitra = (id: string, idx: number, patch: Partial<FitraOption>) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, fitra_options: r.fitra_options.map((o, i) => (i === idx ? { ...o, ...patch } : o)) }
          : r,
      ),
    );

  const addFitra = (id: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, fitra_options: [...r.fitra_options, { name_bn: '', name_en: '', amount_kg: 0, price_per_kg: 0 }] }
          : r,
      ),
    );

  const removeFitra = (id: string, idx: number) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, fitra_options: r.fitra_options.filter((_, i) => i !== idx) } : r,
      ),
    );

  const save = async (r: Row) => {
    setSaving(r.id);
    const { id, ...rest } = r;
    const { error } = await supabase
      .from('zakat_fitra_settings')
      .update({ ...rest, fitra_options: rest.fitra_options as unknown as never })
      .eq('id', id);
    setSaving(null);
    if (error) return toast.error(bn ? 'সংরক্ষণ ব্যর্থ' : 'Save failed', { description: error.message });
    toast.success(bn ? 'সংরক্ষিত হয়েছে' : 'Saved');
  };

  const addYear = async () => {
    const next = (rows[0]?.year || new Date().getFullYear()) + 1;
    const { error } = await supabase.from('zakat_fitra_settings').insert(blank(next) as never);
    if (error) return toast.error(error.message);
    toast.success(bn ? `${next} সাল যোগ হয়েছে` : `Added ${next}`);
    load();
  };

  const remove = async (r: Row) => {
    const ok = await confirm({
      title: bn ? 'মুছবেন?' : 'Delete?',
      description: bn ? `${r.year} সালের সেটিং স্থায়ীভাবে মুছে ফেলা হবে।` : `${r.year} settings will be deleted.`,
      confirmText: bn ? 'মুছুন' : 'Delete',
      cancelText: bn ? 'বাতিল' : 'Cancel',
      variant: 'destructive',
    });
    if (!ok) return;
    const { error } = await supabase.from('zakat_fitra_settings').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    load();
  };

  const toggleActive = async (r: Row) => {
    const newVal = !r.is_active;
    const ok = await confirm({
      title: newVal ? (bn ? 'সক্রিয় করবেন?' : 'Activate?') : (bn ? 'নিষ্ক্রিয় করবেন?' : 'Deactivate?'),
      description: `${r.year}`,
      confirmText: bn ? 'হ্যাঁ' : 'Yes',
      cancelText: bn ? 'বাতিল' : 'Cancel',
      variant: newVal ? 'default' : 'warning',
    });
    if (!ok) return;
    const { error } = await supabase.from('zakat_fitra_settings').update({ is_active: newVal }).eq('id', r.id);
    if (error) return toast.error(bn ? 'টগল ব্যর্থ' : 'Toggle failed', { description: error.message });
    toast.success(bn ? 'আপডেট হয়েছে' : 'Updated');
    load();
  };

  const setAsActiveYear = async (r: Row) => {
    const ok = await confirm({
      title: bn ? 'অ্যাক্টিভ ইয়ার সেট করবেন?' : 'Set as active year?',
      description: bn
        ? `${r.year} সালকে অ্যাক্টিভ ইয়ার হিসেবে সেট করা হবে এবং অন্য সব বছর নিষ্ক্রিয় হয়ে যাবে। পাবলিক পেজ এই বছরের রেট ব্যবহার করবে।`
        : `${r.year} will be set as the active year and all other years will be deactivated. Public page will use this year's rates.`,
      confirmText: bn ? 'হ্যাঁ, সেট করুন' : 'Yes, set active',
      cancelText: bn ? 'বাতিল' : 'Cancel',
      variant: 'default',
    });
    if (!ok) return;
    // Deactivate all others, then activate this one
    const { error: e1 } = await supabase
      .from('zakat_fitra_settings')
      .update({ is_active: false })
      .neq('id', r.id);
    if (e1) return toast.error(bn ? 'আপডেট ব্যর্থ' : 'Update failed', { description: e1.message });
    const { error: e2 } = await supabase
      .from('zakat_fitra_settings')
      .update({ is_active: true })
      .eq('id', r.id);
    if (e2) return toast.error(bn ? 'আপডেট ব্যর্থ' : 'Update failed', { description: e2.message });
    toast.success(bn ? `${r.year} এখন অ্যাক্টিভ ইয়ার` : `${r.year} is now the active year`);
    load();
  };

  return (
    <AdminLayout>
      <div className="max-w-[1200px] mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Calculator className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{bn ? 'যাকাত ও ফিতরা সেটিংস' : 'Zakat & Fitra Settings'}</h1>
              <p className="text-sm text-muted-foreground">
                {bn ? 'প্রতি বছরের নিসাব ও ফিতরা রেট কনফিগার করুন।' : 'Configure yearly nisab and fitra rates.'}
              </p>
            </div>
          </div>
          {canAddItem && (
            <Button onClick={addYear} className="rounded-2xl">
              <Plus className="w-4 h-4 mr-2" />
              {bn ? 'নতুন বছর যোগ' : 'Add new year'}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground rounded-[32px]">
            {bn ? 'কোনো সেটিং নেই' : 'No settings yet'}
          </Card>
        ) : (
          <div className="space-y-5">
            {rows.map((r) => {
              const activeRow = rows.find((x) => x.is_active);
              const isActiveYear = activeRow?.id === r.id;
              return (
              <Card key={r.id} className={`rounded-[32px] p-5 sm:p-6 bg-card/80 backdrop-blur-xl border shadow-sm ${isActiveYear ? 'border-primary/60 ring-2 ring-primary/30' : 'border-border/60'}`}>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-xl">{r.year}</h3>
                    {isActiveYear && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                        <Star className="w-3 h-3 fill-current" />
                        {bn ? 'অ্যাক্টিভ ইয়ার' : 'Active Year'}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} disabled={!canEditItem} />
                      <Label className="text-xs">{r.is_active ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}</Label>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {!isActiveYear && canEditItem && (
                      <Button variant="outline" size="sm" onClick={() => setAsActiveYear(r)} className="rounded-xl">
                        <Star className="w-4 h-4 mr-1" />
                        {bn ? 'অ্যাক্টিভ ইয়ার করুন' : 'Set as active year'}
                      </Button>
                    )}
                    {canDeleteItem && (
                      <Button variant="outline" size="sm" onClick={() => remove(r)} className="rounded-xl text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    {canEditItem && (
                      <Button onClick={() => save(r)} disabled={saving === r.id} className="rounded-2xl">
                        {saving === r.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {bn ? 'সংরক্ষণ' : 'Save'}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                  <Field label={bn ? 'স্বর্ণের নিসাব (গ্রাম)' : 'Gold Nisab (g)'} value={r.nisab_gold_grams}
                    onChange={(v) => update(r.id, { nisab_gold_grams: v })} />
                  <Field label={bn ? 'রূপার নিসাব (গ্রাম)' : 'Silver Nisab (g)'} value={r.nisab_silver_grams}
                    onChange={(v) => update(r.id, { nisab_silver_grams: v })} />
                  <Field label={bn ? 'স্বর্ণ/গ্রাম (৳)' : 'Gold/g (৳)'} value={r.gold_price_per_gram}
                    onChange={(v) => update(r.id, { gold_price_per_gram: v })} />
                  <Field label={bn ? 'রূপা/গ্রাম (৳)' : 'Silver/g (৳)'} value={r.silver_price_per_gram}
                    onChange={(v) => update(r.id, { silver_price_per_gram: v })} />
                  <Field label={bn ? 'যাকাত হার (%)' : 'Zakat rate (%)'} value={r.zakat_rate}
                    onChange={(v) => update(r.id, { zakat_rate: v })} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold">{bn ? 'ফিতরা অপশন' : 'Fitra options'}</Label>
                    {canEditItem && (
                      <Button variant="outline" size="sm" onClick={() => addFitra(r.id)} className="rounded-xl">
                        <Plus className="w-3 h-3 mr-1" /> {bn ? 'যোগ' : 'Add'}
                      </Button>
                    )}
                  </div>
                  {r.fitra_options.map((o, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end p-3 rounded-2xl bg-muted/30">
                      <div className="sm:col-span-3">
                        <Label className="text-xs">{bn ? 'নাম (বাংলা)' : 'Name (BN)'}</Label>
                        <Input value={o.name_bn} onChange={(e) => updateFitra(r.id, i, { name_bn: e.target.value })} className="rounded-xl" disabled={!canEditItem} />
                      </div>
                      <div className="sm:col-span-3">
                        <Label className="text-xs">{bn ? 'নাম (ইংরেজি)' : 'Name (EN)'}</Label>
                        <Input value={o.name_en} onChange={(e) => updateFitra(r.id, i, { name_en: e.target.value })} className="rounded-xl" disabled={!canEditItem} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs">{bn ? 'পরিমাণ (কেজি)' : 'Amount (kg)'}</Label>
                        <Input type="number" step="0.01" value={o.amount_kg || ''}
                          onChange={(e) => updateFitra(r.id, i, { amount_kg: parseFloat(e.target.value) || 0 })} className="rounded-xl" disabled={!canEditItem} />
                      </div>
                      <div className="sm:col-span-3">
                        <Label className="text-xs">{bn ? 'মূল্য/কেজি (৳)' : 'Price/kg (৳)'}</Label>
                        <Input type="number" step="0.01" value={o.price_per_kg || ''}
                          onChange={(e) => updateFitra(r.id, i, { price_per_kg: parseFloat(e.target.value) || 0 })} className="rounded-xl" disabled={!canEditItem} />
                      </div>
                      <div className="sm:col-span-1">
                        {canDeleteItem && (
                          <Button variant="ghost" size="sm" onClick={() => removeFitra(r.id, i)} className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mt-5">
                  <div>
                    <Label className="text-xs">{bn ? 'নোট (বাংলা)' : 'Notes (BN)'}</Label>
                    <Textarea rows={3} value={r.notes_bn} onChange={(e) => update(r.id, { notes_bn: e.target.value })} className="rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'নোট (ইংরেজি)' : 'Notes (EN)'}</Label>
                    <Textarea rows={3} value={r.notes_en} onChange={(e) => update(r.id, { notes_en: e.target.value })} className="rounded-xl" />
                  </div>
                </div>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const Field = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <Input type="number" step="0.01" value={value || ''} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="rounded-xl" />
  </div>
);

export default AdminZakatFitra;
