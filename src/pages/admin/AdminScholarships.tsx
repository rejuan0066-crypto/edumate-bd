import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Award, Plus, Trash2, Pencil, Users, Sparkles } from 'lucide-react';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { toast } from 'sonner';
import { usePagePermissions } from '@/hooks/usePagePermissions';

const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]);

interface ScholarshipForm {
  id?: string;
  name: string;
  name_bn: string;
  description: string;
  scholarship_type: string;
  discount_type: string;
  discount_value: string;
  max_recipients: string;
  academic_session_id: string;
  class_id: string;
  eligibility_criteria: string;
  is_active: boolean;
}

const blankScholarship: ScholarshipForm = {
  name: '', name_bn: '', description: '',
  scholarship_type: 'merit', discount_type: 'percentage',
  discount_value: '', max_recipients: '',
  academic_session_id: '', class_id: '',
  eligibility_criteria: '', is_active: true,
};

const AdminScholarships = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/scholarships');

  const [tab, setTab] = useState('list');
  const [openDialog, setOpenDialog] = useState(false);
  const [openAwardDialog, setOpenAwardDialog] = useState(false);
  const [form, setForm] = useState<ScholarshipForm>(blankScholarship);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteAwardId, setDeleteAwardId] = useState<string | null>(null);
  const [awardForm, setAwardForm] = useState({
    scholarship_id: '', student_id: '', awarded_amount: '', notes: '',
  });

  const { data: scholarships = [] } = useQuery({
    queryKey: ['scholarships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scholarships')
        .select('*, academic_sessions(name, name_bn), classes(name, name_bn)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: awards = [] } = useQuery({
    queryKey: ['scholarship-awards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scholarship_awards')
        .select('*, scholarships(name, name_bn, scholarship_type), students(name_bn, name_en, student_id, roll_number)')
        .is('deleted_at', null)
        .order('awarded_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['academic-sessions-active'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_sessions').select('id, name, name_bn').eq('is_active', true);
      return data || [];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-all'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('id, name, name_bn').eq('is_active', true);
      return data || [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-list-min'],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('id, name_bn, name_en, student_id, roll_number').is('deleted_at', null).limit(2000);
      return data || [];
    },
  });

  const saveScholarship = useMutation({
    mutationFn: async (f: ScholarshipForm) => {
      if (!f.name_bn || !f.discount_value) throw new Error(bn ? 'নাম ও পরিমাণ আবশ্যক' : 'Name and value required');
      const payload = {
        name: f.name || f.name_bn,
        name_bn: f.name_bn,
        description: f.description || null,
        scholarship_type: f.scholarship_type,
        discount_type: f.discount_type,
        discount_value: parseFloat(f.discount_value),
        max_recipients: f.max_recipients ? parseInt(f.max_recipients) : null,
        academic_session_id: f.academic_session_id || null,
        class_id: f.class_id || null,
        eligibility_criteria: f.eligibility_criteria || null,
        is_active: f.is_active,
      };
      if (f.id) {
        const { error } = await supabase.from('scholarships').update(payload).eq('id', f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('scholarships').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scholarships'] });
      setOpenDialog(false);
      setForm(blankScholarship);
      toast.success(bn ? 'সংরক্ষিত হয়েছে' : 'Saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteScholarship = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scholarships').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scholarships'] });
      setDeleteId(null);
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    },
  });

  const saveAward = useMutation({
    mutationFn: async () => {
      if (!awardForm.scholarship_id || !awardForm.student_id || !awardForm.awarded_amount) {
        throw new Error(bn ? 'সব ফিল্ড পূরণ করুন' : 'Fill all fields');
      }
      const sch = scholarships.find((s: any) => s.id === awardForm.scholarship_id);
      const { error } = await supabase.from('scholarship_awards').insert({
        scholarship_id: awardForm.scholarship_id,
        student_id: awardForm.student_id,
        academic_session_id: sch?.academic_session_id || null,
        awarded_amount: parseFloat(awardForm.awarded_amount),
        notes: awardForm.notes || null,
        status: 'active',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scholarship-awards'] });
      setOpenAwardDialog(false);
      setAwardForm({ scholarship_id: '', student_id: '', awarded_amount: '', notes: '' });
      toast.success(bn ? 'বৃত্তি প্রদান করা হয়েছে' : 'Awarded');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeAward = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scholarship_awards').update({ deleted_at: new Date().toISOString(), status: 'revoked' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scholarship-awards'] });
      setDeleteAwardId(null);
      toast.success(bn ? 'বাতিল করা হয়েছে' : 'Revoked');
    },
  });

  const typeLabels: Record<string, { en: string; bn: string; cls: string }> = {
    merit: { en: 'Merit', bn: 'মেধা', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
    need_based: { en: 'Need-based', bn: 'অভাবগ্রস্ত', cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
    sports: { en: 'Sports', bn: 'খেলাধুলা', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
    special: { en: 'Special', bn: 'বিশেষ', cls: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' },
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{bn ? 'বৃত্তি ব্যবস্থাপনা' : 'Scholarships'}</h1>
            <p className="text-sm text-muted-foreground">{bn ? 'বৃত্তি তৈরি ও ছাত্রদের প্রদান' : 'Create and award scholarships'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canAddItem && (
            <Button variant="outline" onClick={() => setOpenAwardDialog(true)}>
              <Sparkles className="w-4 h-4 mr-2" />
              {bn ? 'বৃত্তি প্রদান' : 'Award'}
            </Button>
          )}
          {canAddItem && (
            <Button onClick={() => { setForm(blankScholarship); setOpenDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              {bn ? 'নতুন বৃত্তি' : 'New Scholarship'}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list">{bn ? 'বৃত্তির তালিকা' : 'Scholarships'} ({toBn(scholarships.length)})</TabsTrigger>
          <TabsTrigger value="awards">{bn ? 'প্রদানকৃত' : 'Awards'} ({toBn(awards.length)})</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-3 mt-4">
          {scholarships.length === 0 && (
            <Card className="p-12 text-center text-muted-foreground">
              {bn ? 'কোনো বৃত্তি নেই' : 'No scholarships yet'}
            </Card>
          )}
          {scholarships.map((s: any) => {
            const t = typeLabels[s.scholarship_type] || typeLabels.merit;
            const recipientCount = awards.filter((a: any) => a.scholarship_id === s.id).length;
            return (
              <Card key={s.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{bn ? s.name_bn : s.name}</h3>
                      <Badge className={t.cls} variant="secondary">{bn ? t.bn : t.en}</Badge>
                      {!s.is_active && <Badge variant="outline">{bn ? 'নিষ্ক্রিয়' : 'Inactive'}</Badge>}
                    </div>
                    {s.description && <p className="text-sm text-muted-foreground mb-2">{s.description}</p>}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <strong>{s.discount_type === 'percentage' ? `${toBn(s.discount_value)}%` : `৳${toBn(s.discount_value)}`}</strong>
                        <span className="text-muted-foreground">{bn ? 'ছাড়' : 'discount'}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {toBn(recipientCount)}{s.max_recipients ? ` / ${toBn(s.max_recipients)}` : ''} {bn ? 'গ্রহীতা' : 'recipients'}
                      </span>
                      {s.classes && <span className="text-muted-foreground">{bn ? 'শ্রেণী:' : 'Class:'} {bn ? s.classes.name_bn : s.classes.name}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {canEditItem && (
                      <Button size="icon" variant="ghost" onClick={() => {
                        setForm({
                          id: s.id, name: s.name, name_bn: s.name_bn,
                          description: s.description || '',
                          scholarship_type: s.scholarship_type,
                          discount_type: s.discount_type,
                          discount_value: String(s.discount_value),
                          max_recipients: s.max_recipients ? String(s.max_recipients) : '',
                          academic_session_id: s.academic_session_id || '',
                          class_id: s.class_id || '',
                          eligibility_criteria: s.eligibility_criteria || '',
                          is_active: s.is_active,
                        });
                        setOpenDialog(true);
                      }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {canDeleteItem && (
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(s.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="awards" className="space-y-3 mt-4">
          {awards.length === 0 && (
            <Card className="p-12 text-center text-muted-foreground">
              {bn ? 'কোনো বৃত্তি প্রদান করা হয়নি' : 'No awards yet'}
            </Card>
          )}
          {awards.map((a: any) => (
            <Card key={a.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{bn ? a.students?.name_bn : (a.students?.name_en || a.students?.name_bn)}</h4>
                  <Badge variant="outline">{a.students?.student_id}</Badge>
                  {a.status === 'revoked' && <Badge variant="destructive">{bn ? 'বাতিল' : 'Revoked'}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  <Award className="w-3 h-3 inline mr-1" />
                  {bn ? a.scholarships?.name_bn : a.scholarships?.name} • ৳{toBn(a.awarded_amount)} • {new Date(a.awarded_date).toLocaleDateString(bn ? 'bn-BD' : 'en-GB')}
                </p>
              </div>
              {canDeleteItem && a.status === 'active' && (
                <Button size="sm" variant="ghost" onClick={() => setDeleteAwardId(a.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Scholarship Form Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? (bn ? 'বৃত্তি সম্পাদনা' : 'Edit Scholarship') : (bn ? 'নতুন বৃত্তি' : 'New Scholarship')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{bn ? 'নাম (বাংলা) *' : 'Name (Bangla) *'}</Label>
              <Input value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} />
            </div>
            <div>
              <Label>{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>{bn ? 'ধরন' : 'Type'}</Label>
              <Select value={form.scholarship_type} onValueChange={(v) => setForm({ ...form, scholarship_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="merit">{bn ? 'মেধা ভিত্তিক' : 'Merit'}</SelectItem>
                  <SelectItem value="need_based">{bn ? 'অভাবগ্রস্ত' : 'Need-based'}</SelectItem>
                  <SelectItem value="sports">{bn ? 'খেলাধুলা' : 'Sports'}</SelectItem>
                  <SelectItem value="special">{bn ? 'বিশেষ' : 'Special'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{bn ? 'ছাড়ের ধরন' : 'Discount Type'}</Label>
              <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{bn ? 'শতাংশ %' : 'Percentage %'}</SelectItem>
                  <SelectItem value="fixed">{bn ? 'নির্দিষ্ট ৳' : 'Fixed ৳'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{bn ? 'পরিমাণ *' : 'Value *'}</Label>
              <Input type="text" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value.replace(/[^\d.]/g, '') })} />
            </div>
            <div>
              <Label>{bn ? 'সর্বোচ্চ গ্রহীতা' : 'Max Recipients'}</Label>
              <Input type="text" value={form.max_recipients} onChange={(e) => setForm({ ...form, max_recipients: e.target.value.replace(/\D/g, '') })} />
            </div>
            <div>
              <Label>{bn ? 'একাডেমিক সেশন' : 'Session'}</Label>
              <Select value={form.academic_session_id || 'none'} onValueChange={(v) => setForm({ ...form, academic_session_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder={bn ? 'যেকোনো' : 'Any'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{bn ? 'যেকোনো' : 'Any'}</SelectItem>
                  {sessions.map((s: any) => <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn : s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{bn ? 'শ্রেণী' : 'Class'}</Label>
              <Select value={form.class_id || 'none'} onValueChange={(v) => setForm({ ...form, class_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder={bn ? 'যেকোনো' : 'Any'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{bn ? 'যেকোনো' : 'Any'}</SelectItem>
                  {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>{bn ? 'বিবরণ' : 'Description'}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="col-span-2">
              <Label>{bn ? 'যোগ্যতার মানদণ্ড' : 'Eligibility Criteria'}</Label>
              <Textarea value={form.eligibility_criteria} onChange={(e) => setForm({ ...form, eligibility_criteria: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={() => saveScholarship.mutate(form)} disabled={saveScholarship.isPending}>
              {bn ? 'সংরক্ষণ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Award Dialog */}
      <Dialog open={openAwardDialog} onOpenChange={setOpenAwardDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{bn ? 'বৃত্তি প্রদান' : 'Award Scholarship'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{bn ? 'বৃত্তি *' : 'Scholarship *'}</Label>
              <Select value={awardForm.scholarship_id} onValueChange={(v) => setAwardForm({ ...awardForm, scholarship_id: v })}>
                <SelectTrigger><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  {scholarships.filter((s: any) => s.is_active).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn : s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{bn ? 'ছাত্র *' : 'Student *'}</Label>
              <Select value={awardForm.student_id} onValueChange={(v) => setAwardForm({ ...awardForm, student_id: v })}>
                <SelectTrigger><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  {students.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {bn ? s.name_bn : (s.name_en || s.name_bn)} ({s.student_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{bn ? 'প্রদানকৃত পরিমাণ ৳ *' : 'Awarded Amount ৳ *'}</Label>
              <Input type="text" value={awardForm.awarded_amount} onChange={(e) => setAwardForm({ ...awardForm, awarded_amount: e.target.value.replace(/[^\d.]/g, '') })} />
            </div>
            <div>
              <Label>{bn ? 'নোট' : 'Notes'}</Label>
              <Textarea value={awardForm.notes} onChange={(e) => setAwardForm({ ...awardForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAwardDialog(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={() => saveAward.mutate()} disabled={saveAward.isPending}>{bn ? 'প্রদান' : 'Award'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && deleteScholarship.mutate(deleteId)} />
      <DeleteConfirmDialog open={!!deleteAwardId} onOpenChange={() => setDeleteAwardId(null)} onConfirm={() => deleteAwardId && revokeAward.mutate(deleteAwardId)} />
    </div>
  );
};

export default AdminScholarships;
