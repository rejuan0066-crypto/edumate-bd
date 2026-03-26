import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AdminStaff = () => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name_bn: '', name_en: '', designation: '', phone: '', email: '', department: '' });

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('staff').insert({
        name_bn: form.name_bn.trim(),
        name_en: form.name_en.trim() || null,
        designation: form.designation.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        department: form.department || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setForm({ name_bn: '', name_en: '', designation: '', phone: '', email: '', department: '' });
      setShowAdd(false);
      toast.success(language === 'bn' ? 'কর্মী যোগ হয়েছে' : 'Staff added');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(language === 'bn' ? 'কর্মী মুছে ফেলা হয়েছে' : 'Staff deleted');
    },
    onError: () => toast.error('Error'),
  });

  const filtered = staffList.filter((s: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name_bn?.toLowerCase().includes(q) || s.designation?.toLowerCase().includes(q);
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{t('staff')}</h1>
            <p className="text-sm text-muted-foreground">{language === 'bn' ? `মোট ${staffList.length} জন কর্মী/শিক্ষক` : `Total ${staffList.length} staff`}</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="btn-primary-gradient flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t('addNew')}
          </Button>
        </div>

        <div className="card-elevated p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder={language === 'bn' ? 'নাম বা পদবী দিয়ে খুঁজুন...' : 'Search by name or designation...'} className="pl-10 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="card-elevated overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'নাম' : 'Name'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'পদবী' : 'Designation'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'মোবাইল' : 'Mobile'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s: any) => (
                    <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent-foreground font-bold text-sm">{s.name_bn?.[0] || '?'}</div>
                          <div>
                            <span className="font-medium text-foreground text-sm block">{s.name_bn}</span>
                            {s.name_en && <span className="text-xs text-muted-foreground">{s.name_en}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.designation || '-'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.phone || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.status === 'active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {s.status === 'active' ? (language === 'bn' ? 'সক্রিয়' : 'Active') : (language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteMutation.mutate(s.id)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">{language === 'bn' ? 'কোনো কর্মী পাওয়া যায়নি' : 'No staff found'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{language === 'bn' ? 'নতুন কর্মী/শিক্ষক যোগ' : 'Add New Staff'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div><Label>{language === 'bn' ? 'নাম (বাংলা)' : 'Name (BN)'} *</Label><Input className="mt-1" value={form.name_bn} onChange={e => setForm({ ...form, name_bn: e.target.value })} /></div>
            <div><Label>{language === 'bn' ? 'নাম (ইংরেজি)' : 'Name (EN)'}</Label><Input className="mt-1" value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} /></div>
            <div>
              <Label>{language === 'bn' ? 'পদবী' : 'Designation'}</Label>
              <Select value={form.designation} onValueChange={v => setForm({ ...form, designation: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="প্রধান শিক্ষক">{language === 'bn' ? 'প্রধান শিক্ষক' : 'Head Teacher'}</SelectItem>
                  <SelectItem value="সহকারী শিক্ষক">{language === 'bn' ? 'সহকারী শিক্ষক' : 'Asst. Teacher'}</SelectItem>
                  <SelectItem value="আরবি শিক্ষক">{language === 'bn' ? 'আরবি শিক্ষক' : 'Arabic Teacher'}</SelectItem>
                  <SelectItem value="হিফয শিক্ষক">{language === 'bn' ? 'হিফয শিক্ষক' : 'Hifz Teacher'}</SelectItem>
                  <SelectItem value="অফিস সহকারী">{language === 'bn' ? 'অফিস সহকারী' : 'Office Assistant'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{language === 'bn' ? 'মোবাইল' : 'Mobile'}</Label><Input className="mt-1" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>{language === 'bn' ? 'ইমেইল' : 'Email'}</Label><Input className="mt-1" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <Button onClick={() => form.name_bn.trim() && addMutation.mutate()} className="btn-primary-gradient" disabled={addMutation.isPending}>
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {language === 'bn' ? 'কর্মী যোগ করুন' : 'Add Staff'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminStaff;
