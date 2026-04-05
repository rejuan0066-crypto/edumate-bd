import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const StudentCategoryManager = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', name_bn: '', description: '' });

  const { data: categories = [] } = useQuery({
    queryKey: ['student_categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('student_categories').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name_bn) throw new Error(bn ? 'বাংলা নাম আবশ্যক' : 'Bangla name required');
      const payload = {
        name: form.name || form.name_bn,
        name_bn: form.name_bn,
        description: form.description || null,
      };
      if (editId) {
        const { error } = await supabase.from('student_categories').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const maxSort = categories.length > 0 ? Math.max(...categories.map((c: any) => c.sort_order || 0)) : 0;
        const { error } = await supabase.from('student_categories').insert({ ...payload, sort_order: maxSort + 1 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student_categories'] });
      setOpen(false);
      resetForm();
      toast.success(bn ? 'সফল' : 'Success');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('student_categories').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student_categories'] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    },
  });

  const resetForm = () => {
    setForm({ name: '', name_bn: '', description: '' });
    setEditId(null);
  };

  const openEdit = (item: any) => {
    setForm({ name: item.name, name_bn: item.name_bn, description: item.description || '' });
    setEditId(item.id);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-foreground">{bn ? 'ছাত্র ক্যাটাগরি ব্যবস্থাপনা' : 'Student Category Management'}</h3>
        <Button size="sm" onClick={() => { resetForm(); setOpen(true); }} className="btn-primary-gradient">
          <Plus className="w-4 h-4 mr-1" /> {bn ? 'নতুন যোগ' : 'Add New'}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'নাম (বাংলা)' : 'Name (BN)'}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'নাম (ইংরেজি)' : 'Name (EN)'}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'বিবরণ' : 'Description'}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">{bn ? 'অ্যাকশন' : 'Action'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.filter((c: any) => c.is_active !== false).map((c: any, i: number) => (
              <tr key={c.id} className="hover:bg-secondary/30">
                <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-foreground">{c.name_bn}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.description || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.filter((c: any) => c.is_active !== false).length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">{bn ? 'কোনো ক্যাটাগরি নেই' : 'No categories'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? (bn ? 'ক্যাটাগরি সম্পাদনা' : 'Edit Category') : (bn ? 'নতুন ক্যাটাগরি' : 'New Category')}</DialogTitle></DialogHeader>
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
              <label className="text-sm font-medium">{bn ? 'বিবরণ' : 'Description'}</label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="mt-1" />
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

export default StudentCategoryManager;
