import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Loader2, Layers, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddressLevel {
  id: string;
  key: string;
  label: string;
  label_bn: string;
  sort_order: number;
  is_active: boolean;
  parent_level_key: string | null;
}

export const useAddressLevels = () => {
  return useQuery({
    queryKey: ['address-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('address_levels')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as AddressLevel[];
    },
    staleTime: 5 * 60 * 1000,
  });
};

const AddressLevelManager = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { data: levels = [], isLoading } = useAddressLevels();

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<AddressLevel | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formKey, setFormKey] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formLabelBn, setFormLabelBn] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formParentKey, setFormParentKey] = useState('');

  const resetForm = () => {
    setShowForm(false);
    setEditItem(null);
    setFormKey('');
    setFormLabel('');
    setFormLabelBn('');
    setFormSortOrder(levels.length + 1);
    setFormParentKey('');
  };

  const openAdd = () => {
    resetForm();
    setFormSortOrder(levels.length + 1);
    setShowForm(true);
  };

  const openEdit = (item: AddressLevel) => {
    setEditItem(item);
    setFormKey(item.key);
    setFormLabel(item.label);
    setFormLabelBn(item.label_bn);
    setFormSortOrder(item.sort_order);
    setFormParentKey(item.parent_level_key || '');
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (entry: any) => {
      if (entry.id) {
        const { error } = await supabase.from('address_levels').update(entry).eq('id', entry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('address_levels').insert(entry);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['address-levels'] });
      toast.success(bn ? 'সেভ হয়েছে' : 'Saved');
      resetForm();
    },
    onError: (e: any) => toast.error(e?.message || (bn ? 'ত্রুটি হয়েছে' : 'Error')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('address_levels').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['address-levels'] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    },
    onError: (e: any) => toast.error(e?.message || 'Error'),
  });

  const handleSave = () => {
    if (!formKey.trim() || !formLabel.trim() || !formLabelBn.trim()) {
      toast.error(bn ? 'সব ফিল্ড পূরণ করুন' : 'Fill all fields');
      return;
    }

    const entry: any = {
      key: formKey.trim().toLowerCase().replace(/\s+/g, '_'),
      label: formLabel.trim(),
      label_bn: formLabelBn.trim(),
      sort_order: formSortOrder,
      parent_level_key: formParentKey || null,
      is_active: true,
    };

    if (editItem) entry.id = editItem.id;
    saveMutation.mutate(entry);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">{bn ? 'ঠিকানা লেভেল ব্যবস্থাপনা' : 'Address Level Management'}</h2>
        </div>
        <Button onClick={openAdd} size="sm" variant="outline" className="flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> {bn ? 'নতুন লেভেল' : 'New Level'}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">#</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Key</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'ইংরেজি নাম' : 'Label (EN)'}</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'বাংলা নাম' : 'Label (BN)'}</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'প্যারেন্ট' : 'Parent'}</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'অ্যাকশন' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {levels.map((l, i) => (
                <tr key={l.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-3 py-2 text-sm text-muted-foreground">{l.sort_order}</td>
                  <td className="px-3 py-2 text-sm font-mono text-muted-foreground">{l.key}</td>
                  <td className="px-3 py-2 text-sm font-medium text-foreground">{l.label}</td>
                  <td className="px-3 py-2 text-sm text-foreground">{l.label_bn}</td>
                  <td className="px-3 py-2 text-sm text-muted-foreground">{l.parent_level_key || '-'}</td>
                  <td className="px-3 py-2 text-right flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(l)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(l.id)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {levels.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-sm text-muted-foreground">{bn ? 'কোনো লেভেল নেই' : 'No levels'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? (bn ? 'লেভেল সম্পাদনা' : 'Edit Level') : (bn ? 'নতুন লেভেল' : 'New Level')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Key ({bn ? 'ইউনিক আইডি' : 'Unique ID'})</Label>
              <Input className="mt-1 bg-background" value={formKey} onChange={e => setFormKey(e.target.value)} placeholder="e.g. village" disabled={!!editItem} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{bn ? 'ইংরেজি নাম' : 'English Label'}</Label>
                <Input className="mt-1 bg-background" value={formLabel} onChange={e => setFormLabel(e.target.value)} placeholder="Village" />
              </div>
              <div>
                <Label>{bn ? 'বাংলা নাম' : 'Bengali Label'}</Label>
                <Input className="mt-1 bg-background" value={formLabelBn} onChange={e => setFormLabelBn(e.target.value)} placeholder="গ্রাম" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{bn ? 'ক্রম' : 'Sort Order'}</Label>
                <Input className="mt-1 bg-background" type="number" value={formSortOrder || ''} onChange={e => setFormSortOrder(Number(e.target.value))} />
              </div>
              <div>
                <Label>{bn ? 'প্যারেন্ট লেভেল' : 'Parent Level'}</Label>
                <Select value={formParentKey || 'none'} onValueChange={v => setFormParentKey(v === 'none' ? '' : v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{bn ? 'নেই (রুট)' : 'None (Root)'}</SelectItem>
                    {levels.filter(l => l.key !== formKey).map(l => (
                      <SelectItem key={l.key} value={l.key}>{bn ? l.label_bn : l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary-gradient">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {bn ? 'সেভ করুন' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{bn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?'}</AlertDialogTitle>
            <AlertDialogDescription>{bn ? 'এই লেভেল মুছে ফেলা হবে। এর চাইল্ড লেভেল থাকলে আগে সেগুলো মুছুন।' : 'This level will be deleted. Remove child levels first.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{bn ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null); } }}>
              {bn ? 'মুছে ফেলুন' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AddressLevelManager;
