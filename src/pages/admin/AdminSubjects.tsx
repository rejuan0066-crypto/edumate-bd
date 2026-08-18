import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Plus, Trash2, BookOpen, Loader2, Edit2, Check, X, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useConfirm } from '@/contexts/ConfirmContext';

const AdminSubjects = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { checkApproval, isRecordPending } = useApprovalCheck('/admin/subjects', 'subjects');
  const confirm = useConfirm();
  const { canAddItem, canDeleteItem, canEditItem } = usePagePermissions('/admin/subjects');
  const [newName, setNewName] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newClass, setNewClass] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editClass, setEditClass] = useState('');

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*, divisions(name, name_bn)').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('*, classes(name, name_bn, divisions(name, name_bn))').order('name_bn');
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const nameBn = newName.trim();
      const classId = newClass || null;

      // Check for duplicates in the same class
      const isDuplicate = subjects.some(
        (s: any) =>
          s.class_id === classId &&
          s.name_bn.toLowerCase() === nameBn.toLowerCase()
      );

      if (isDuplicate) {
        throw new Error(language === 'bn' ? 'একই ক্লাসে এই বিষয়টি ইতিমধ্যে বিদ্যমান' : 'This subject already exists in this class');
      }

      const payload = {
        name_bn: nameBn,
        name: newNameEn.trim() || nameBn,
        code: newCode.trim() || null,
        class_id: classId,
      };
      if (await checkApproval('add', payload, undefined, `বিষয় যোগ: ${nameBn}`)) return;
      const { error } = await supabase.from('subjects').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setNewName(''); setNewNameEn(''); setNewCode(''); setNewClass('');
      toast.success(language === 'bn' ? 'বিষয় যোগ হয়েছে' : 'Subject added');
    },
    onError: (err: any) => toast.error(err.message || (language === 'bn' ? 'সমস্যা হয়েছে' : 'Error occurred')),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, name_bn, name, code, class_id }: { id: string; name_bn: string; name: string; code: string; class_id: string }) => {
      const trimmedNameBn = name_bn.trim();
      const trimmedClassId = class_id || null;

      // Check for duplicates in the same class (excluding current record)
      const isDuplicate = subjects.some(
        (s: any) =>
          s.id !== id &&
          s.class_id === trimmedClassId &&
          s.name_bn.toLowerCase() === trimmedNameBn.toLowerCase()
      );

      if (isDuplicate) {
        throw new Error(language === 'bn' ? 'একই ক্লাসে এই বিষয়টি ইতিমধ্যে বিদ্যমান' : 'This subject already exists in this class');
      }

      const payload = { name_bn: trimmedNameBn, name: name.trim() || trimmedNameBn, code: code.trim() || null, class_id: trimmedClassId };
      if (await checkApproval('edit', payload, id, `বিষয় সম্পাদনা: ${trimmedNameBn}`)) return;
      const { error } = await supabase.from('subjects').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setEditingId(null);
      toast.success(language === 'bn' ? 'বিষয় আপডেট হয়েছে' : 'Subject updated');
    },
    onError: (err: any) => toast.error(err.message || (language === 'bn' ? 'সমস্যা হয়েছে' : 'Error occurred')),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const subject = subjects.find((s: any) => s.id === id);
      const isConfirmed = await confirm({
        title: language === 'bn' ? 'আপনি কি নিশ্চিত?' : 'Are you sure?',
        description: language === 'bn' ? `আপনি "${subject?.name_bn}" বিষয়টি মুছে ফেলতে চাচ্ছেন। এটি আর ফিরে পাওয়া যাবে না।` : `You are about to delete "${subject?.name_bn}". This action cannot be undone.`,
        variant: 'destructive',
        confirmText: language === 'bn' ? 'মুছে ফেলুন' : 'Delete',
        cancelText: language === 'bn' ? 'বাতিল' : 'Cancel'
      });
      if (!isConfirmed) return;
      if (await checkApproval('delete', { id, name_bn: subject?.name_bn }, id, `বিষয় মুছুন: ${subject?.name_bn}`)) return;
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success(language === 'bn' ? 'বিষয় মুছে ফেলা হয়েছে' : 'Subject deleted');
    },
    onError: () => toast.error(language === 'bn' ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

  const filtered = filterClass === 'all' ? subjects : subjects.filter((s: any) => s.class_id === filterClass);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">{language === 'bn' ? 'বিষয় ব্যবস্থাপনা' : 'Subject Management'}</h1>

        {canAddItem && (
          <div className="card-elevated p-5">
            <h3 className="font-display font-bold text-foreground mb-4">{language === 'bn' ? 'নতুন বিষয় যোগ' : 'Add New Subject'}</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input placeholder={language === 'bn' ? 'বিষয়ের নাম (বাংলা)' : 'Subject Name (BN)'} value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-background" />
              <Input placeholder={language === 'bn' ? 'ইংরেজি নাম' : 'English Name'} value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} className="bg-background" />
              <Input placeholder={language === 'bn' ? 'কোড' : 'Code'} value={newCode} onChange={(e) => setNewCode(e.target.value)} className="bg-background w-24" />
              <Select value={newClass} onValueChange={setNewClass}>
                <SelectTrigger className="bg-background"><SelectValue placeholder={language === 'bn' ? 'ক্লাস নির্বাচন' : 'Select Class'} /></SelectTrigger>
                <SelectContent>{classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{language === 'bn' ? `${c.name_bn} (${c.divisions?.name_bn || ''})` : `${c.name} (${c.divisions?.name || ''})`}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={() => { if (!newName.trim()) { toast.error(language === 'bn' ? 'বিষয়ের নাম লিখুন' : 'Enter subject name'); return; } addMutation.mutate(); }} className="btn-primary-gradient shrink-0" disabled={addMutation.isPending}>
                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                {language === 'bn' ? 'যোগ' : 'Add'}
              </Button>
            </div>
          </div>
        )}

        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-foreground">{language === 'bn' ? 'বিষয় তালিকা' : 'Subject List'}</h3>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="bg-background w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'bn' ? 'সকল ক্লাস' : 'All Classes'}</SelectItem>
                {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{language === 'bn' ? `${c.name_bn} (${c.divisions?.name_bn || ''})` : `${c.name} (${c.divisions?.name || ''})`}</SelectItem>)}
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'ক্লাস' : 'Class'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'পেন্ডিং অবস্থা' : 'Pending Status'}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s: any) => (
                    <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                      {editingId === s.id ? (
                        <>
                          <td className="px-4 py-3"><Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm" /></td>
                          <td className="px-4 py-3"><Input value={editNameEn} onChange={e => setEditNameEn(e.target.value)} className="h-8 text-sm" /></td>
                          <td className="px-4 py-3"><Input value={editCode} onChange={e => setEditCode(e.target.value)} className="h-8 text-sm w-20" /></td>
                          <td className="px-4 py-3">
                            <Select value={editClass} onValueChange={setEditClass}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>{classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{language === 'bn' ? `${c.name_bn} (${c.divisions?.name_bn || ''})` : `${c.name} (${c.divisions?.name || ''})`}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => editMutation.mutate({ id: s.id, name_bn: editName, name: editNameEn, code: editCode, class_id: editClass })} className="p-1.5 rounded hover:bg-success/10 text-success"><Check className="w-4 h-4" /></button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><X className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm font-medium text-foreground flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />{s.name_bn}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{s.name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{s.code || '-'}</td>
                          <td className="px-4 py-3 text-sm"><span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{language === 'bn' ? s.classes?.name_bn : s.classes?.name || '-'}</span></td>
                          <td className="px-4 py-3">
                            {isRecordPending(s.id) && (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse text-[10px]">
                                <Clock className="w-3 h-3 mr-1" />
                                {language === 'bn' ? 'অ্যাডমিন অনুমোদনের অপেক্ষায়' : 'Awaiting Admin Approval'}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              {canEditItem && (
                                <button 
                                  disabled={isRecordPending(s.id)}
                                  onClick={() => { setEditingId(s.id); setEditName(s.name_bn); setEditNameEn(s.name || ''); setEditCode(s.code || ''); setEditClass(s.class_id || ''); }} 
                                  className={`p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary ${isRecordPending(s.id) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              {canDeleteItem && (
                                <button 
                                  disabled={isRecordPending(s.id)}
                                  onClick={() => deleteMutation.mutate(s.id)} 
                                  className={`p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive ${isRecordPending(s.id) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
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
