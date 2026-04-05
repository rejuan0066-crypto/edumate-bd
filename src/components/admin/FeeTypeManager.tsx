import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const FeeTypeManager = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', name_bn: '', amount: '', fee_category: 'monthly', division_id: '' });

  const { data: feeTypes = [], isLoading } = useQuery({
    queryKey: ['all_fee_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fee_types').select('*, divisions(name_bn)').order('fee_category').order('name_bn');
      if (error) throw error;
      return data;
    },
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name_bn || !form.amount) throw new Error(bn ? 'নাম ও পরিমাণ আবশ্যক' : 'Name and amount required');
      const payload = {
        name: form.name || form.name_bn,
        name_bn: form.name_bn,
        amount: parseFloat(form.amount),
        fee_category: form.fee_category,
        division_id: form.division_id || null,
      };
      if (editId) {
        const { error } = await supabase.from('fee_types').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('fee_types').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_fee_types'] });
      queryClient.invalidateQueries({ queryKey: ['fee_types'] });
      setOpen(false);
      resetForm();
      toast.success(bn ? 'সফল' : 'Success');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fee_types').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_fee_types'] });
      queryClient.invalidateQueries({ queryKey: ['fee_types'] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    },
  });

  const resetForm = () => {
    setForm({ name: '', name_bn: '', amount: '', fee_category: 'monthly', division_id: '' });
    setEditId(null);
  };

  const openEdit = (item: any) => {
    setForm({ name: item.name, name_bn: item.name_bn, amount: String(item.amount), fee_category: item.fee_category, division_id: item.division_id || '' });
    setEditId(item.id);
    setOpen(true);
  };

  const categories = [
    { key: 'monthly', bn: 'মাসিক', en: 'Monthly' },
    { key: 'exam', bn: 'পরীক্ষা', en: 'Exam' },
    { key: 'admission', bn: 'ভর্তি', en: 'Admission' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-foreground">{bn ? 'ফি ধরন ব্যবস্থাপনা' : 'Fee Type Management'}</h3>
        <Button size="sm" onClick={() => { resetForm(); setOpen(true); }} className="btn-primary-gradient">
          <Plus className="w-4 h-4 mr-1" /> {bn ? 'নতুন যোগ' : 'Add New'}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'নাম' : 'Name'}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'ক্যাটাগরি' : 'Category'}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'পরিমাণ' : 'Amount'}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'বিভাগ' : 'Division'}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">{bn ? 'অ্যাকশন' : 'Action'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {feeTypes.filter((f: any) => f.is_active !== false).map((f: any) => (
              <tr key={f.id} className="hover:bg-secondary/30">
                <td className="px-4 py-3 font-medium text-foreground">{f.name_bn}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                    {categories.find(c => c.key === f.fee_category)?.[bn ? 'bn' : 'en'] || f.fee_category}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold text-foreground">৳{f.amount}</td>
                <td className="px-4 py-3 text-muted-foreground">{(f as any).divisions?.name_bn || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(f)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(f.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {feeTypes.filter((f: any) => f.is_active !== false).length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">{bn ? 'কোনো ফি ধরন নেই' : 'No fee types'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? (bn ? 'ফি ধরন সম্পাদনা' : 'Edit Fee Type') : (bn ? 'নতুন ফি ধরন' : 'New Fee Type')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} *</label>
              <Input value={form.name_bn} onChange={e => setForm(p => ({ ...p, name_bn: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">{bn ? 'পরিমাণ (৳)' : 'Amount (৳)'} *</label>
              <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">{bn ? 'ক্যাটাগরি' : 'Category'}</label>
              <Select value={form.fee_category} onValueChange={v => setForm(p => ({ ...p, fee_category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.key} value={c.key}>{bn ? c.bn : c.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{bn ? 'বিভাগ (ঐচ্ছিক)' : 'Division (Optional)'}</label>
              <Select value={form.division_id} onValueChange={v => setForm(p => ({ ...p, division_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={bn ? 'সব বিভাগ' : 'All Divisions'} /></SelectTrigger>
                <SelectContent>
                  {divisions.map((d: any) => <SelectItem key={d.id} value={d.id}>{bn ? d.name_bn : d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary-gradient">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {bn ? 'সেভ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeeTypeManager;
