import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, Layers, Loader2, BookOpen, GraduationCap, Edit2, Check, X, ArrowUp, ArrowDown, Power, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useConfirm } from '@/contexts/ConfirmContext';
import { invalidateAllStudentQueries } from '@/lib/studentQueryInvalidator';

const AdminDivisions = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { checkApproval: checkDivApproval } = useApprovalCheck('/admin/divisions', 'divisions');
  const { canAddItem, canDeleteItem, canEditItem } = usePagePermissions('/admin/divisions');
  const { checkApproval: checkClassApproval } = useApprovalCheck('/admin/divisions', 'classes');
  const [selectedDiv, setSelectedDiv] = useState<string | null>(null);
  const [newDivName, setNewDivName] = useState('');
  const [newDivNameEn, setNewDivNameEn] = useState('');
  const [newDivNameAr, setNewDivNameAr] = useState('');
  const [newDivPrefix, setNewDivPrefix] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassNameEn, setNewClassNameEn] = useState('');
  const [newClassNameAr, setNewClassNameAr] = useState('');

  const [editingDivId, setEditingDivId] = useState<string | null>(null);
  const [editDivName, setEditDivName] = useState('');
  const [editDivNameEn, setEditDivNameEn] = useState('');
  const [editDivNameAr, setEditDivNameAr] = useState('');
  const [editDivPrefix, setEditDivPrefix] = useState('');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassNameEn, setEditClassNameEn] = useState('');
  const [editClassNameAr, setEditClassNameAr] = useState('');

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

  const { data: allClasses = [], isLoading: classesLoading } = useQuery({
    queryKey: ['all-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Classes for the selected division
  const classes = allClasses.filter((c: any) => c.division_id === selectedDiv);

  // Compute global serial offset: count classes in divisions that come before the selected one
  const globalClassOffset = (() => {
    if (!selectedDiv) return 0;
    const selectedDivIndex = divisions.findIndex(d => d.id === selectedDiv);
    if (selectedDivIndex <= 0) return 0;
    return divisions.slice(0, selectedDivIndex).reduce((sum, div) => {
      return sum + allClasses.filter((c: any) => c.division_id === div.id).length;
    }, 0);
  })();

  // Self-healing synchronization: if any classes are inactive, ensure their students are marked inactive
  useEffect(() => {
    (async () => {
      try {
        const { data: inactiveCls } = await supabase.from('classes').select('id').eq('is_active', false);
        if (inactiveCls && inactiveCls.length > 0) {
          const inactiveIds = inactiveCls.map(c => c.id);
          const { data: activeStudentsToFix } = await supabase
            .from('students')
            .select('id')
            .in('class_id', inactiveIds)
            .eq('status', 'active')
            .is('deleted_at', null)
            .limit(500);

          if (activeStudentsToFix && activeStudentsToFix.length > 0) {
            const { error } = await supabase
              .from('students')
              .update({ status: 'inactive' } as any)
              .in('id', activeStudentsToFix.map(s => s.id));
            if (!error) {
              invalidateAllStudentQueries(queryClient);
            }
          }
        }
      } catch (err) {
        console.warn('Sync inactive classes to students error:', err);
      }
    })();
  }, [queryClient]);

  const addDivMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { name_bn: newDivName.trim(), name: newDivNameEn.trim() || newDivName.trim(), name_ar: newDivNameAr.trim() || null, prefix: newDivPrefix.trim().toUpperCase(), sort_order: divisions.length };
      if (await checkDivApproval('add', payload, undefined, `বিভাগ যোগ: ${newDivName.trim()}`)) return;
      const { error } = await supabase.from('divisions').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
      setNewDivName('');
      setNewDivNameEn('');
      setNewDivNameAr('');
      setNewDivPrefix('');
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

  const editDivMutation = useMutation({
    mutationFn: async ({ id, name_bn, name, name_ar, prefix }: { id: string; name_bn: string; name: string; name_ar: string; prefix: string }) => {
      if (await checkDivApproval('edit', { id, name_bn, name, name_ar, prefix }, id, `বিভাগ সম্পাদনা: ${name_bn}`)) return;
      const { error } = await supabase.from('divisions').update({ name_bn, name, name_ar: name_ar || null, prefix: prefix.toUpperCase() } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
      setEditingDivId(null);
      toast.success(language === 'bn' ? 'বিভাগ আপডেট হয়েছে' : 'Division updated');
    },
    onError: () => toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

  const reorderDivMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      const idx = divisions.findIndex(d => d.id === id);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= divisions.length) return;
      const current = divisions[idx];
      const swap = divisions[swapIdx];
      await Promise.all([
        supabase.from('divisions').update({ sort_order: swap.sort_order ?? swapIdx }).eq('id', current.id),
        supabase.from('divisions').update({ sort_order: current.sort_order ?? idx }).eq('id', swap.id),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['divisions'] }),
    onError: () => toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

  const addClassMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { division_id: selectedDiv!, name_bn: newClassName.trim(), name: newClassNameEn.trim() || newClassName.trim(), name_ar: newClassNameAr.trim() || null, sort_order: classes.length };
      if (await checkClassApproval('add', payload, undefined, `শ্রেণী যোগ: ${newClassName.trim()}`)) return;
      const { error } = await supabase.from('classes').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-classes'] });
      setNewClassName('');
      setNewClassNameEn('');
      setNewClassNameAr('');
      toast.success(language === 'bn' ? 'ক্লাস যোগ হয়েছে' : 'Class added');
    },
    onError: () => toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const cls = classes.find((c: any) => c.id === id);
      if (await checkClassApproval('delete', { id, name_bn: cls?.name_bn }, id, `শ্রেণী মুছুন: ${cls?.name_bn}`)) return;

      // Update students of this class to inactive
      await supabase
        .from('students')
        .update({ status: 'inactive' } as any)
        .eq('class_id', id)
        .is('deleted_at', null);

      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-classes'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      invalidateAllStudentQueries(queryClient);
      toast.success(language === 'bn' ? 'ক্লাস মুছে ফেলা হয়েছে ও সংশ্লিষ্ট ছাত্র নিষ্ক্রিয় করা হয়েছে' : 'Class deleted and students deactivated');
    },
    onError: () => toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

  const editClassMutation = useMutation({
    mutationFn: async ({ id, name_bn, name, name_ar }: { id: string; name_bn: string; name: string; name_ar: string }) => {
      if (await checkClassApproval('edit', { id, name_bn, name, name_ar }, id, `শ্রেণী সম্পাদনা: ${name_bn}`)) return;
      const { error } = await supabase.from('classes').update({ name_bn, name, name_ar: name_ar || null } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-classes'] });
      setEditingClassId(null);
      toast.success(language === 'bn' ? 'শ্রেণী আপডেট হয়েছে' : 'Class updated');
    },
    onError: () => toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

  const reorderClassMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      const idx = classes.findIndex((c: any) => c.id === id);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= classes.length) return;
      const current = classes[idx];
      const swap = classes[swapIdx];
      await Promise.all([
        supabase.from('classes').update({ sort_order: swap.sort_order ?? swapIdx }).eq('id', current.id),
        supabase.from('classes').update({ sort_order: current.sort_order ?? idx }).eq('id', swap.id),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-classes'] }),
    onError: () => toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

  const toggleDivActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const div = divisions.find(d => d.id === id);
      if (await checkDivApproval('edit', { id, is_active }, id, `বিভাগ ${is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}: ${div?.name_bn}`)) return;
      const { error } = await supabase.from('divisions').update({ is_active } as any).eq('id', id);
      if (error) throw error;

      // Update all classes under this division
      await supabase.from('classes').update({ is_active } as any).eq('division_id', id);

      // Update all students in this division
      const targetStatus = is_active ? 'active' : 'inactive';
      await supabase
        .from('students')
        .update({ status: targetStatus } as any)
        .eq('division_id', id)
        .is('deleted_at', null);
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['divisions'] });
      queryClient.invalidateQueries({ queryKey: ['all-classes'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      invalidateAllStudentQueries(queryClient);
      toast.success(
        language === 'bn'
          ? (is_active ? 'বিভাগ, শ্রেণী ও সকল ছাত্র সক্রিয় করা হয়েছে' : 'বিভাগ, এর শ্রেণী ও সংশ্লিষ্ট সকল ছাত্র নিষ্ক্রিয় করা হয়েছে')
          : (is_active ? 'Division and related students activated' : 'Division and related students deactivated')
      );
    },
    onError: (err: any) => toast.error(language === 'bn' ? 'বিভাগ টগল ব্যর্থ হয়েছে' : 'Failed to toggle division', { description: err?.message || (language === 'bn' ? 'অজানা সমস্যা' : 'Unknown error') }),
  });

  const toggleClassActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const cls = allClasses.find((c: any) => c.id === id);
      if (await checkClassApproval('edit', { id, is_active }, id, `শ্রেণী ${is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}: ${cls?.name_bn}`)) return;
      const { error } = await supabase.from('classes').update({ is_active } as any).eq('id', id);
      if (error) throw error;

      // Synchronize all students belonging to this class
      const targetStatus = is_active ? 'active' : 'inactive';
      const { error: studentErr } = await supabase
        .from('students')
        .update({ status: targetStatus } as any)
        .eq('class_id', id)
        .is('deleted_at', null);
      if (studentErr) {
        console.error('Failed to sync student status for class:', studentErr);
      }
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['all-classes'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      invalidateAllStudentQueries(queryClient);
      toast.success(
        language === 'bn'
          ? (is_active ? 'শ্রেণী ও সকল ছাত্র সক্রিয় করা হয়েছে' : 'শ্রেণী ও এই শ্রেণীর সকল ছাত্র নিষ্ক্রিয় করা হয়েছে')
          : (is_active ? 'Class and students activated' : 'Class and its students deactivated')
      );
    },
    onError: (err: any) => toast.error(language === 'bn' ? 'শ্রেণী টগল ব্যর্থ হয়েছে' : 'Failed to toggle class', { description: err?.message || (language === 'bn' ? 'অজানা সমস্যা' : 'Unknown error') }),
  });

  const selected = divisions.find(d => d.id === selectedDiv);

  const startEditDiv = (d: any) => {
    setEditingDivId(d.id);
    setEditDivName(d.name_bn);
    setEditDivNameEn(d.name);
    setEditDivNameAr(d.name_ar || '');
    setEditDivPrefix((d as any).prefix || '');
  };

  const startEditClass = (c: any) => {
    setEditingClassId(c.id);
    setEditClassName(c.name_bn);
    setEditClassNameEn(c.name);
    setEditClassNameAr(c.name_ar || '');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {language === 'bn' ? 'বিভাগ ও শ্রেণী ব্যবস্থাপনা' : 'Division & Class Management'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {language === 'bn' ? 'মাদ্রাসার প্রাতিষ্ঠানিক বিভাগ ও শ্রেণী পরিচালনা করুন' : 'Manage madrasa institutional divisions and classes'}
          </p>
        </div>

        {/* Online Admission Division & Class Scope Banner */}
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {language === 'bn' ? 'অনলাইন ভর্তি আবেদনের বিভাগ ও জামাত নিয়ন্ত্রণ' : 'Online Admission Division & Class Control'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {language === 'bn'
                  ? 'পাবলিক ভর্তি ফরমে কোন কোন বিভাগ ও ক্লাস উন্মুক্ত থাকবে তা বর্তমান শিক্ষার্থীদের কোনো ক্ষতি না করে আলাদাভাবে অন/অফ করতে অনলাইন আবেদন কন্ট্রোলে যান।'
                  : 'Configure which divisions & classes are open for online admission without affecting existing enrolled students.'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/admin/website?tab=form-settings'}
            className="shrink-0 text-xs font-semibold border-emerald-400/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 gap-1.5 shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {language === 'bn' ? 'ভর্তি আবেদন কন্ট্রোল খুলুন' : 'Open Admission Control'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Divisions */}
          <div className="card-elevated p-5">
            <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              {language === 'bn' ? 'বিভাগসমূহ' : 'Divisions'}
            </h3>
            {canAddItem && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Input placeholder={language === 'bn' ? 'বিভাগের নাম (বাংলা)' : 'Division Name (BN)'} value={newDivName} onChange={(e) => setNewDivName(e.target.value)} className="bg-background flex-1 min-w-[140px]" />
                <Input placeholder={language === 'bn' ? 'ইংরেজি নাম' : 'English Name'} value={newDivNameEn} onChange={(e) => setNewDivNameEn(e.target.value)} className="bg-background flex-1 min-w-[140px]" />
                <Input
                  placeholder="الاسم بالعربية"
                  value={newDivNameAr}
                  onChange={(e) => setNewDivNameAr(e.target.value)}
                  className="bg-background flex-1 min-w-[140px] text-right"
                  dir="rtl"
                  lang="ar"
                  style={{ fontFamily: '"Traditional Arabic", "Amiri", "Noto Naskh Arabic", serif' }}
                />
                <Input placeholder={language === 'bn' ? 'প্রিফিক্স' : 'Prefix'} value={newDivPrefix} onChange={(e) => setNewDivPrefix(e.target.value)} className="bg-background w-20 shrink-0 uppercase" maxLength={5} />
                <Button onClick={() => { if (!newDivName.trim()) { toast.error(language === 'bn' ? 'বিভাগের নাম লিখুন' : 'Enter division name'); return; } addDivMutation.mutate(); }} size="sm" className="shrink-0 btn-primary-gradient" disabled={addDivMutation.isPending}>
                  {addDivMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            )}
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2">
                {divisions.map((d, idx) => (
                  <div key={d.id}
                    onClick={() => { if (editingDivId !== d.id) setSelectedDiv(d.id); }}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${selectedDiv === d.id ? 'bg-primary/10 border border-primary/30' : 'bg-secondary/50 hover:bg-secondary'}`}>
                    {editingDivId === d.id ? (
                      <div className="flex flex-wrap items-center gap-2 flex-1 mr-2" onClick={e => e.stopPropagation()}>
                        <Input value={editDivName} onChange={e => setEditDivName(e.target.value)} className="bg-background h-8 text-sm flex-1 min-w-[110px]" placeholder="বাংলা নাম" />
                        <Input value={editDivNameEn} onChange={e => setEditDivNameEn(e.target.value)} className="bg-background h-8 text-sm flex-1 min-w-[110px]" placeholder="English" />
                        <Input
                          value={editDivNameAr}
                          onChange={e => setEditDivNameAr(e.target.value)}
                          className="bg-background h-8 text-sm flex-1 min-w-[110px] text-right"
                          placeholder="عربي"
                          dir="rtl"
                          lang="ar"
                          style={{ fontFamily: '"Traditional Arabic", "Amiri", "Noto Naskh Arabic", serif' }}
                        />
                        <Input value={editDivPrefix} onChange={e => setEditDivPrefix(e.target.value)} className="bg-background h-8 text-sm w-20 shrink-0 uppercase" placeholder="প্রিফিক্স" maxLength={5} />
                        <button onClick={() => { if (!editDivName.trim()) return; editDivMutation.mutate({ id: d.id, name_bn: editDivName.trim(), name: editDivNameEn.trim() || editDivName.trim(), name_ar: editDivNameAr.trim(), prefix: editDivPrefix.trim() }); }} className="p-1.5 rounded hover:bg-success/10 text-success"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingDivId(null)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-5 text-center">{idx + 1}</span>
                          <Layers className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium text-foreground flex items-center gap-2 flex-wrap">
                              {(d as any).prefix ? <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">{(d as any).prefix}</span> : null}
                              <span className={!(d as any).is_active ? 'opacity-60 line-through' : ''}>{language === 'bn' ? d.name_bn : d.name}</span>
                              {!(d as any).is_active && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">{language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive'}</span>}
                            </p>
                            {(d as any).name_ar && (
                              <p dir="rtl" lang="ar" className="text-sm text-primary/80 leading-tight" style={{ fontFamily: '"Traditional Arabic", "Amiri", "Noto Naskh Arabic", serif' }}>{(d as any).name_ar}</p>
                            )}
                            <p className="text-xs text-muted-foreground">{d.description || ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {canEditItem && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); if (idx > 0) reorderDivMutation.mutate({ id: d.id, direction: 'up' }); }} disabled={idx === 0 || reorderDivMutation.isPending} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                              <button onClick={(e) => { e.stopPropagation(); if (idx < divisions.length - 1) reorderDivMutation.mutate({ id: d.id, direction: 'down' }); }} disabled={idx === divisions.length - 1 || reorderDivMutation.isPending} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                              <button onClick={(e) => { e.stopPropagation(); startEditDiv(d); }} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={async (e) => { e.stopPropagation(); const next = !(d as any).is_active; const ok = await confirm({ title: language === 'bn' ? (next ? 'বিভাগ সক্রিয় করবেন?' : 'বিভাগ নিষ্ক্রিয় করবেন?') : (next ? 'Activate division?' : 'Deactivate division?'), description: language === 'bn' ? `"${d.name_bn}" ${next ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করতে চান?` : `Are you sure you want to ${next ? 'activate' : 'deactivate'} "${d.name}"?`, confirmText: language === 'bn' ? 'হ্যাঁ' : 'Yes', cancelText: language === 'bn' ? 'বাতিল' : 'Cancel', variant: next ? 'default' : 'warning' }); if (!ok) return; toggleDivActiveMutation.mutate({ id: d.id, is_active: next }); }} title={(d as any).is_active ? (language === 'bn' ? 'নিষ্ক্রিয় করুন' : 'Deactivate') : (language === 'bn' ? 'সক্রিয় করুন' : 'Activate')} className={`p-1.5 rounded hover:bg-primary/10 ${(d as any).is_active ? 'text-success' : 'text-muted-foreground'}`}><Power className="w-4 h-4" /></button>
                            </>
                          )}
                          {canDeleteItem && <button onClick={(e) => { e.stopPropagation(); deleteDivMutation.mutate(d.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </>
                    )}
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
                <div className="p-3 rounded-lg bg-secondary/50 space-y-1">
                  <p className="text-xs text-muted-foreground">{language === 'bn' ? 'বাংলা:' : 'BN:'} <span className="text-foreground font-medium">{selected.name_bn}</span> | {language === 'bn' ? 'ইংরেজি:' : 'EN:'} <span className="text-foreground font-medium">{selected.name}</span>{(selected as any).prefix ? <> | {language === 'bn' ? 'প্রিফিক্স:' : 'Prefix:'} <span className="font-mono text-primary font-bold">{(selected as any).prefix}</span></> : null}</p>
                  {(selected as any).name_ar && (
                    <p className="text-xs text-muted-foreground">{language === 'bn' ? 'আরবি:' : 'AR:'} <span dir="rtl" lang="ar" className="text-foreground font-medium" style={{ fontFamily: '"Traditional Arabic", "Amiri", "Noto Naskh Arabic", serif' }}>{(selected as any).name_ar}</span></p>
                  )}
                  <p className="text-xs"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selected.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{selected.is_active ? (language === 'bn' ? 'সক্রিয়' : 'Active') : (language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive')}</span></p>
                </div>

                {canAddItem && (
                  <div className="flex flex-wrap gap-2">
                    <Input placeholder={language === 'bn' ? 'শ্রেণীর নাম (বাংলা)' : 'Class Name (BN)'} value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="bg-background flex-1 min-w-[120px]" />
                    <Input placeholder={language === 'bn' ? 'ইংরেজি নাম' : 'English Name'} value={newClassNameEn} onChange={(e) => setNewClassNameEn(e.target.value)} className="bg-background flex-1 min-w-[120px]" />
                    <Input
                      placeholder="الاسم بالعربية"
                      value={newClassNameAr}
                      onChange={(e) => setNewClassNameAr(e.target.value)}
                      className="bg-background flex-1 min-w-[120px] text-right"
                      dir="rtl"
                      lang="ar"
                      style={{ fontFamily: '"Traditional Arabic", "Amiri", "Noto Naskh Arabic", serif' }}
                    />
                    <Button onClick={() => { if (!newClassName.trim()) { toast.error(language === 'bn' ? 'শ্রেণীর নাম লিখুন' : 'Enter class name'); return; } addClassMutation.mutate(); }} size="sm" className="shrink-0 btn-primary-gradient" disabled={addClassMutation.isPending}>
                      {addClassMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>
                )}

                {classesLoading ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : (
                  <div className="space-y-2">
                    {classes.map((c: any, idx: number) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                        {editingClassId === c.id ? (
                          <div className="flex flex-wrap items-center gap-2 flex-1 mr-2">
                            <Input value={editClassName} onChange={e => setEditClassName(e.target.value)} className="bg-background h-8 text-sm flex-1 min-w-[100px]" placeholder="বাংলা নাম" />
                            <Input value={editClassNameEn} onChange={e => setEditClassNameEn(e.target.value)} className="bg-background h-8 text-sm flex-1 min-w-[100px]" placeholder="English" />
                            <Input
                              value={editClassNameAr}
                              onChange={e => setEditClassNameAr(e.target.value)}
                              className="bg-background h-8 text-sm flex-1 min-w-[100px] text-right"
                              placeholder="عربي"
                              dir="rtl"
                              lang="ar"
                              style={{ fontFamily: '"Traditional Arabic", "Amiri", "Noto Naskh Arabic", serif' }}
                            />
                            <button onClick={() => { if (!editClassName.trim()) return; editClassMutation.mutate({ id: c.id, name_bn: editClassName.trim(), name: editClassNameEn.trim() || editClassName.trim(), name_ar: editClassNameAr.trim() }); }} className="p-1.5 rounded hover:bg-success/10 text-success"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingClassId(null)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-muted-foreground w-5 text-center">{globalClassOffset + idx + 1}</span>
                              <BookOpen className="w-4 h-4 text-primary" />
                              <div>
                                <p className="text-sm font-medium text-foreground flex items-center gap-2 flex-wrap">
                                  <span className={!c.is_active ? 'opacity-60 line-through' : ''}>{language === 'bn' ? c.name_bn : c.name}</span>
                                  {!c.is_active && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">{language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive'}</span>}
                                </p>
                                <p className="text-xs text-muted-foreground">{language === 'bn' ? c.name : c.name_bn}</p>
                                {c.name_ar && (
                                  <p dir="rtl" lang="ar" className="text-sm text-primary/80 leading-tight" style={{ fontFamily: '"Traditional Arabic", "Amiri", "Noto Naskh Arabic", serif' }}>{c.name_ar}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                              {canEditItem && (
                                <>
                                  <button onClick={() => { if (idx > 0) reorderClassMutation.mutate({ id: c.id, direction: 'up' }); }} disabled={idx === 0 || reorderClassMutation.isPending} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => { if (idx < classes.length - 1) reorderClassMutation.mutate({ id: c.id, direction: 'down' }); }} disabled={idx === classes.length - 1 || reorderClassMutation.isPending} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => startEditClass(c)} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"><Edit2 className="w-4 h-4" /></button>
                                  <button onClick={async () => { const next = !c.is_active; const ok = await confirm({ title: language === 'bn' ? (next ? 'শ্রেণী সক্রিয় করবেন?' : 'শ্রেণী নিষ্ক্রিয় করবেন?') : (next ? 'Activate class?' : 'Deactivate class?'), description: language === 'bn' ? `"${c.name_bn}" ${next ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করতে চান?` : `Are you sure you want to ${next ? 'activate' : 'deactivate'} "${c.name}"?`, confirmText: language === 'bn' ? 'হ্যাঁ' : 'Yes', cancelText: language === 'bn' ? 'বাতিল' : 'Cancel', variant: next ? 'default' : 'warning' }); if (!ok) return; toggleClassActiveMutation.mutate({ id: c.id, is_active: next }); }} title={c.is_active ? (language === 'bn' ? 'নিষ্ক্রিয় করুন' : 'Deactivate') : (language === 'bn' ? 'সক্রিয় করুন' : 'Activate')} className={`p-1.5 rounded hover:bg-primary/10 ${c.is_active ? 'text-success' : 'text-muted-foreground'}`}><Power className="w-4 h-4" /></button>
                                </>
                              )}
                              {canDeleteItem && (
                                <button onClick={() => deleteClassMutation.mutate(c.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </>
                        )}
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