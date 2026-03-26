import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Trash2, UserCheck, UserX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AdminStudents = () => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name_bn: '', name_en: '', student_id: '', roll_number: '', father_name: '', phone: '', division_id: '', gender: 'male' });

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*, divisions(name, name_bn)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('students').insert({
        student_id: form.student_id.trim(),
        name_bn: form.name_bn.trim(),
        name_en: form.name_en.trim() || null,
        roll_number: form.roll_number.trim() || null,
        father_name: form.father_name.trim() || null,
        phone: form.phone.trim() || null,
        division_id: form.division_id || null,
        gender: form.gender,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setForm({ name_bn: '', name_en: '', student_id: '', roll_number: '', father_name: '', phone: '', division_id: '', gender: 'male' });
      setShowAdd(false);
      toast.success(language === 'bn' ? 'ছাত্র যোগ হয়েছে' : 'Student added');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success(language === 'bn' ? 'ছাত্র মুছে ফেলা হয়েছে' : 'Student deleted');
    },
    onError: () => toast.error('Error'),
  });

  const filtered = students.filter((s: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name_bn?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q) || s.roll_number?.toLowerCase().includes(q);
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{t('students')}</h1>
            <p className="text-sm text-muted-foreground">{language === 'bn' ? `মোট ${students.length} জন ছাত্র` : `Total ${students.length} students`}</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="btn-primary-gradient flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t('addNew')}
          </Button>
        </div>

        <div className="card-elevated p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder={language === 'bn' ? 'নাম, আইডি বা রোল দিয়ে খুঁজুন...' : 'Search by name, ID or roll...'} className="pl-10 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'আইডি' : 'ID'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'রোল' : 'Roll'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'বিভাগ' : 'Division'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s: any) => (
                    <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {s.name_bn?.[0] || '?'}
                          </div>
                          <div>
                            <span className="font-medium text-foreground text-sm block">{s.name_bn}</span>
                            {s.name_en && <span className="text-xs text-muted-foreground">{s.name_en}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.student_id}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.roll_number || '-'}</td>
                      <td className="px-4 py-3 text-sm"><span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{language === 'bn' ? s.divisions?.name_bn : s.divisions?.name || '-'}</span></td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${s.status === 'active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {s.status === 'active' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          {s.status === 'active' ? (language === 'bn' ? 'সক্রিয়' : 'Active') : (language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteMutation.mutate(s.id)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">{language === 'bn' ? 'কোনো ছাত্র পাওয়া যায়নি' : 'No students found'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{language === 'bn' ? 'নতুন ছাত্র যোগ' : 'Add New Student'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div><Label>{language === 'bn' ? 'ছাত্র আইডি' : 'Student ID'} *</Label><Input className="mt-1" value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} required /></div>
            <div><Label>{language === 'bn' ? 'নাম (বাংলা)' : 'Name (BN)'} *</Label><Input className="mt-1" value={form.name_bn} onChange={e => setForm({ ...form, name_bn: e.target.value })} required /></div>
            <div><Label>{language === 'bn' ? 'নাম (ইংরেজি)' : 'Name (EN)'}</Label><Input className="mt-1" value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} /></div>
            <div><Label>{language === 'bn' ? 'রোল নম্বর' : 'Roll Number'}</Label><Input className="mt-1" value={form.roll_number} onChange={e => setForm({ ...form, roll_number: e.target.value })} /></div>
            <div><Label>{language === 'bn' ? 'পিতার নাম' : 'Father Name'}</Label><Input className="mt-1" value={form.father_name} onChange={e => setForm({ ...form, father_name: e.target.value })} /></div>
            <div><Label>{language === 'bn' ? 'ফোন' : 'Phone'}</Label><Input className="mt-1" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div>
              <Label>{language === 'bn' ? 'বিভাগ' : 'Division'}</Label>
              <Select value={form.division_id} onValueChange={v => setForm({ ...form, division_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                <SelectContent>{divisions.map(d => <SelectItem key={d.id} value={d.id}>{language === 'bn' ? d.name_bn : d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => form.student_id.trim() && form.name_bn.trim() && addMutation.mutate()} className="btn-primary-gradient" disabled={addMutation.isPending}>
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {language === 'bn' ? 'ছাত্র যোগ করুন' : 'Add Student'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminStudents;
