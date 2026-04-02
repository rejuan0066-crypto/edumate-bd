import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Plus, Trash2, ChevronRight, Layers, Loader2, BookOpen, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';

const AdminDivisions = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { checkApproval: checkDivApproval } = useApprovalCheck('/admin/divisions', 'divisions');
  const { checkApproval: checkClassApproval } = useApprovalCheck('/admin/divisions', 'classes');
  const [selectedDiv, setSelectedDiv] = useState<string | null>(null);
  const [newDivName, setNewDivName] = useState('');
  const [newDivNameEn, setNewDivNameEn] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassNameEn, setNewClassNameEn] = useState('');

  const { data: divisions = [], isLoading } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes', selectedDiv],
    queryFn: async () => {
      if (!selectedDiv) return [];
      const { data, error } = await supabase
        .from('classes' as any)
        .select('*')
        .eq('division_id', selectedDiv)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedDiv,
  });

  const addDivMutation = useMutation({
    mutationFn: async () => {
      const payload = { name_bn: newDivName.trim(), name: newDivNameEn.trim() || newDivName.trim(), sort_order: divisions.length };
      if (await checkDivApproval('add', payload, undefined, `বিভাগ যোগ: ${newDivName.trim()}`)) return;
      const { error } = await supabase.from('divisions').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
      setNewDivName('');
      setNewDivNameEn('');
      toast.success(language === 'bn' ? 'বিভাগ যোগ হয়েছে' : 'Division added');
    },
    onError: () => toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

  const deleteDivMutation = useMutation({
    mutationFn: async (id: string) => {
      const div = divisions.find(d => d.id === id);
      if (await checkDivApproval('delete', { id, name_bn: div?.name_bn }, id, `বিভাগ মুছুন: ${div?.name_bn}`)) return;
      const { error } = await supabase.from('divisions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
      if (selectedDiv === id) setSelectedDiv(null);
      toast.success(language === 'bn' ? 'বিভাগ মুছে ফেলা হয়েছে' : 'Division deleted');
    },
    onError: () => toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

  const addClassMutation = useMutation({
    mutationFn: async () => {
      const payload = { division_id: selectedDiv, name_bn: newClassName.trim(), name: newClassNameEn.trim() || newClassName.trim(), sort_order: classes.length };
      if (await checkClassApproval('add', payload, undefined, `শ্রেণী যোগ: ${newClassName.trim()}`)) return;
      const { error } = await supabase.from('classes' as any).insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', selectedDiv] });
      setNewClassName('');
      setNewClassNameEn('');
      toast.success(language === 'bn' ? 'ক্লাস যোগ হয়েছে' : 'Class added');
    },
    onError: () => toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const cls = classes.find((c: any) => c.id === id);
      if (await checkClassApproval('delete', { id, name_bn: cls?.name_bn }, id, `শ্রেণী মুছুন: ${cls?.name_bn}`)) return;
      const { error } = await supabase.from('classes' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes', selectedDiv] });
      toast.success(language === 'bn' ? 'ক্লাস মুছে ফেলা হয়েছে' : 'Class deleted');
    },
    onError: () => toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

  const selected = divisions.find(d => d.id === selectedDiv);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">
          {language === 'bn' ? 'বিভাগ ও শ্রেণী ব্যবস্থাপনা' : 'Division & Class Management'}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Divisions */}
          <div className="card-elevated p-5">
            <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              {language === 'bn' ? 'বিভাগসমূহ' : 'Divisions'}
            </h3>
            <div className="flex gap-2 mb-4">
              <Input placeholder={language === 'bn' ? 'বিভাগের নাম (বাংলা)' : 'Division Name (BN)'} value={newDivName} onChange={(e) => setNewDivName(e.target.value)} className="bg-background" />
              <Input placeholder={language === 'bn' ? 'ইংরেজি নাম' : 'English Name'} value={newDivNameEn} onChange={(e) => setNewDivNameEn(e.target.value)} className="bg-background" />
              <Button onClick={() => { if (!newDivName.trim()) { toast.error(language === 'bn' ? 'বিভাগের নাম লিখুন' : 'Enter division name'); return; } addDivMutation.mutate(); }} size="sm" className="shrink-0 btn-primary-gradient" disabled={addDivMutation.isPending}>
                {addDivMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2">
                {divisions.map(d => (
                  <div key={d.id}
                    onClick={() => setSelectedDiv(d.id)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${selectedDiv === d.id ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50 hover:bg-secondary'}`}>
                    <div className="flex items-center gap-3">
                      <Layers className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{language === 'bn' ? d.name_bn : d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.description || ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); deleteDivMutation.mutate(d.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
                {divisions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{language === 'bn' ? 'কোনো বিভাগ নেই' : 'No divisions yet'}</p>}
              </div>
            )}
          </div>

          {/* Classes under selected division */}
          <div className="card-elevated p-5">
            <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              {selected
                ? (language === 'bn' ? `${selected.name_bn} - শ্রেণীসমূহ` : `${selected.name} - Classes`)
                : (language === 'bn' ? 'বিভাগ নির্বাচন করুন' : 'Select a Division')}
            </h3>
            {selected ? (
              <div className="space-y-4">
                {/* Division info */}
                <div className="p-3 rounded-lg bg-secondary/50 space-y-1">
                  <p className="text-xs text-muted-foreground">{language === 'bn' ? 'বাংলা:' : 'BN:'} <span className="text-foreground font-medium">{selected.name_bn}</span> | {language === 'bn' ? 'ইংরেজি:' : 'EN:'} <span className="text-foreground font-medium">{selected.name}</span></p>
                  <p className="text-xs"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selected.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{selected.is_active ? (language === 'bn' ? 'সক্রিয়' : 'Active') : (language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive')}</span></p>
                </div>

                {/* Add class form */}
                <div className="flex gap-2">
                  <Input placeholder={language === 'bn' ? 'শ্রেণীর নাম (বাংলা)' : 'Class Name (BN)'} value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="bg-background" />
                  <Input placeholder={language === 'bn' ? 'ইংরেজি নাম' : 'English Name'} value={newClassNameEn} onChange={(e) => setNewClassNameEn(e.target.value)} className="bg-background" />
                  <Button onClick={() => { if (!newClassName.trim()) { toast.error(language === 'bn' ? 'শ্রেণীর নাম লিখুন' : 'Enter class name'); return; } addClassMutation.mutate(); }} size="sm" className="shrink-0 btn-primary-gradient" disabled={addClassMutation.isPending}>
                    {addClassMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Class list */}
                {classesLoading ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : (
                  <div className="space-y-2">
                    {classes.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                        <div className="flex items-center gap-3">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{language === 'bn' ? c.name_bn : c.name}</p>
                            <p className="text-xs text-muted-foreground">{language === 'bn' ? c.name : c.name_bn}</p>
                          </div>
                        </div>
                        <button onClick={() => deleteClassMutation.mutate(c.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {classes.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {language === 'bn' ? 'কোনো শ্রেণী নেই। উপরে থেকে যোগ করুন।' : 'No classes yet. Add from above.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">{language === 'bn' ? 'একটি বিভাগ নির্বাচন করুন' : 'Select a division to manage classes'}</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDivisions;
