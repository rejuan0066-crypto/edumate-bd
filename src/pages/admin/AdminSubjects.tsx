import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Plus, Trash2, BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const AdminSubjects = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDivision, setNewDivision] = useState('');
  const [filterDivision, setFilterDivision] = useState('all');

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*, divisions(name, name_bn)').order('name_bn');
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('subjects').insert({
        name_bn: newName.trim(),
        name: newNameEn.trim() || newName.trim(),
        code: newCode.trim() || null,
        division_id: newDivision || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setNewName(''); setNewNameEn(''); setNewCode(''); setNewDivision('');
      toast.success(language === 'bn' ? 'বিষয় যোগ হয়েছে' : 'Subject added');
    },
    onError: () => toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success(language === 'bn' ? 'বিষয় মুছে ফেলা হয়েছে' : 'Subject deleted');
    },
    onError: () => toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

  const filtered = filterDivision === 'all' ? subjects : subjects.filter((s: any) => s.division_id === filterDivision);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">{language === 'bn' ? 'বিষয় ব্যবস্থাপনা' : 'Subject Management'}</h1>

        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4">{language === 'bn' ? 'নতুন বিষয় যোগ' : 'Add New Subject'}</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input placeholder={language === 'bn' ? 'বিষয়ের নাম (বাংলা)' : 'Subject Name (BN)'} value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-background" />
            <Input placeholder={language === 'bn' ? 'ইংরেজি নাম' : 'English Name'} value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} className="bg-background" />
            <Input placeholder={language === 'bn' ? 'কোড' : 'Code'} value={newCode} onChange={(e) => setNewCode(e.target.value)} className="bg-background w-24" />
            <Select value={newDivision} onValueChange={setNewDivision}>
              <SelectTrigger className="bg-background"><SelectValue placeholder={language === 'bn' ? 'বিভাগ নির্বাচন' : 'Select Division'} /></SelectTrigger>
              <SelectContent>{divisions.map(d => <SelectItem key={d.id} value={d.id}>{language === 'bn' ? d.name_bn : d.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={() => newName.trim() && addMutation.mutate()} className="btn-primary-gradient shrink-0" disabled={addMutation.isPending}>
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              {language === 'bn' ? 'যোগ' : 'Add'}
            </Button>
          </div>
        </div>

        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-foreground">{language === 'bn' ? 'বিষয় তালিকা' : 'Subject List'}</h3>
            <Select value={filterDivision} onValueChange={setFilterDivision}>
              <SelectTrigger className="bg-background w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'bn' ? 'সকল বিভাগ' : 'All Divisions'}</SelectItem>
                {divisions.map(d => <SelectItem key={d.id} value={d.id}>{language === 'bn' ? d.name_bn : d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'বিষয়' : 'Subject'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'ইংরেজি নাম' : 'English Name'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'কোড' : 'Code'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'বিভাগ' : 'Division'}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s: any) => (
                    <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />{s.name_bn}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.code || '-'}</td>
                      <td className="px-4 py-3 text-sm"><span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{language === 'bn' ? s.divisions?.name_bn : s.divisions?.name || '-'}</span></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteMutation.mutate(s.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">{language === 'bn' ? 'কোনো বিষয় নেই' : 'No subjects'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSubjects;
