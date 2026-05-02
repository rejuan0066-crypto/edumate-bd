import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, FileText, TrendingUp, TrendingDown, ArrowRight, Printer, Pencil, X, Save, Download } from 'lucide-react';
import { format } from 'date-fns';

interface StaffLetterDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  staff: any;
  bn: boolean;
}

const StaffLetterDialog = ({ open, onOpenChange, staff, bn }: StaffLetterDialogProps) => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'promotion' | 'salary'>('promotion');

  // Promotion form
  const [newDesignation, setNewDesignation] = useState('');
  const [pEffectiveDate, setPEffectiveDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [pReason, setPReason] = useState('');
  const [pLetterNo, setPLetterNo] = useState('');
  const [pIntroText, setPIntroText] = useState('');
  const [pClosingText, setPClosingText] = useState('');

  // Salary form
  const [newSalary, setNewSalary] = useState<string>('');
  const [changeType, setChangeType] = useState<'increase' | 'decrease' | 'adjustment'>('increase');
  const [sEffectiveDate, setSEffectiveDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [sReason, setSReason] = useState('');
  const [sLetterNo, setSLetterNo] = useState('');
  const [sIntroText, setSIntroText] = useState('');
  const [sClosingText, setSClosingText] = useState('');

  // Edit states for history
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [editPromo, setEditPromo] = useState<any>({});
  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);
  const [editSalary, setEditSalary] = useState<any>({});

  useEffect(() => {
    if (open) {
      setNewDesignation('');
      setNewSalary('');
      setPReason(''); setPLetterNo(''); setPIntroText(''); setPClosingText('');
      setSReason(''); setSLetterNo(''); setSIntroText(''); setSClosingText('');
      setPEffectiveDate(format(new Date(), 'yyyy-MM-dd'));
      setSEffectiveDate(format(new Date(), 'yyyy-MM-dd'));
      setChangeType('increase');
      setEditingPromoId(null);
      setEditingSalaryId(null);
    }
  }, [open]);

  // Designations list
  const { data: designations = [] } = useQuery({
    queryKey: ['designations-letter-dialog'],
    queryFn: async () => {
      const { data } = await supabase.from('designations').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
    enabled: open,
  });

  // History
  const { data: promotionHistory = [] } = useQuery({
    queryKey: ['staff-promotions', staff?.id],
    queryFn: async () => {
      const { data } = await supabase.from('staff_promotions')
        .select('*').eq('staff_id', staff.id).is('deleted_at', null)
        .order('effective_date', { ascending: false });
      return data || [];
    },
    enabled: open && !!staff?.id,
  });

  const { data: salaryHistory = [] } = useQuery({
    queryKey: ['staff-salary-changes', staff?.id],
    queryFn: async () => {
      const { data } = await supabase.from('staff_salary_changes')
        .select('*').eq('staff_id', staff.id).is('deleted_at', null)
        .order('effective_date', { ascending: false });
      return data || [];
    },
    enabled: open && !!staff?.id,
  });

  const generateLetter = async (payload: any): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    const url = `https://wwhunyzobtuibhvkipwk.supabase.co/functions/v1/staff-letter-pdf`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Letter generation failed');
    const html = await res.text();

    // 1) Open in new window for print
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }

    // 2) Upload HTML to storage so it persists as a file
    let publicUrl: string | null = null;
    try {
      const safeId = (staff.staff_id || staff.id || 'staff').toString().replace(/[^a-zA-Z0-9_-]/g, '_');
      const ts = Date.now();
      const path = `${safeId}/${payload.type}-${ts}.html`;
      const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
      const { error: upErr } = await supabase.storage.from('staff-letters').upload(path, blob, {
        contentType: 'text/html; charset=utf-8',
        upsert: false,
      });
      if (!upErr) {
        // Store storage ref; signed URLs are fetched on demand via request-signed-url edge fn.
        publicUrl = `staff-letters/${path}`;
      }
    } catch (e) {
      console.warn('Letter file upload failed:', e);
    }
    return publicUrl;
  };

  const promotionMutation = useMutation({
    mutationFn: async () => {
      if (!newDesignation) throw new Error(bn ? 'নতুন পদবি নির্বাচন করুন' : 'Select new designation');
      const oldDesig = staff.designation || '';
      // 1) update staff designation
      const { error: updErr } = await supabase.from('staff')
        .update({ designation: newDesignation })
        .eq('id', staff.id);
      if (updErr) throw updErr;
      // 2) generate + upload letter (gets file URL)
      const fileUrl = await generateLetter({
        type: 'promotion',
        language: bn ? 'bn' : 'en',
        staff: {
          name: bn ? (staff.name_bn || staff.name_en) : (staff.name_en || staff.name_bn),
          staff_id: staff.staff_id,
          designation: oldDesig,
        },
        old_designation: oldDesig,
        new_designation: newDesignation,
        effective_date: pEffectiveDate,
        reason: pReason,
        letter_number: pLetterNo,
        intro_text: pIntroText || undefined,
        closing_text: pClosingText || undefined,
      });
      // 3) insert history with file URL
      const { data: { user } } = await supabase.auth.getUser();
      const { error: histErr } = await supabase.from('staff_promotions').insert({
        staff_id: staff.id,
        old_designation: oldDesig,
        new_designation: newDesignation,
        effective_date: pEffectiveDate,
        reason: pReason || null,
        letter_number: pLetterNo || null,
        letter_file_url: fileUrl,
        created_by: user?.id,
      });
      if (histErr) throw histErr;
    },
    onSuccess: () => {
      toast.success(bn ? 'পদোন্নতি পত্র তৈরি ও সংরক্ষণ সম্পন্ন' : 'Promotion letter generated & saved');
      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: ['staff-promotions', staff.id] });
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const salaryMutation = useMutation({
    mutationFn: async () => {
      const newSal = Number(newSalary);
      if (!newSal || isNaN(newSal) || newSal <= 0) throw new Error(bn ? 'বৈধ বেতন দিন' : 'Enter valid salary');
      const oldSal = Number(staff.salary || 0);
      const { error: updErr } = await supabase.from('staff')
        .update({ salary: newSal })
        .eq('id', staff.id);
      if (updErr) throw updErr;
      // Generate + upload letter first to get file URL
      const fileUrl = await generateLetter({
        type: 'salary_change',
        language: bn ? 'bn' : 'en',
        staff: {
          name: bn ? (staff.name_bn || staff.name_en) : (staff.name_en || staff.name_bn),
          staff_id: staff.staff_id,
          designation: staff.designation,
        },
        old_salary: oldSal,
        new_salary: newSal,
        change_type: changeType,
        effective_date: sEffectiveDate,
        reason: sReason,
        letter_number: sLetterNo,
        intro_text: sIntroText || undefined,
        closing_text: sClosingText || undefined,
      });
      const { data: { user } } = await supabase.auth.getUser();
      const { error: histErr } = await supabase.from('staff_salary_changes').insert({
        staff_id: staff.id,
        old_salary: oldSal,
        new_salary: newSal,
        change_type: changeType,
        effective_date: sEffectiveDate,
        reason: sReason || null,
        letter_number: sLetterNo || null,
        letter_file_url: fileUrl,
        created_by: user?.id,
      });
      if (histErr) throw histErr;
    },
    onSuccess: () => {
      toast.success(bn ? 'বেতন পরিবর্তন পত্র তৈরি ও সংরক্ষণ সম্পন্ন' : 'Salary change letter generated & saved');
      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: ['staff-salary-changes', staff.id] });
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  // Update existing promotion record
  const updatePromoMutation = useMutation({
    mutationFn: async () => {
      if (!editingPromoId) return;
      const { error } = await supabase.from('staff_promotions').update({
        old_designation: editPromo.old_designation || null,
        new_designation: editPromo.new_designation,
        effective_date: editPromo.effective_date,
        reason: editPromo.reason || null,
        letter_number: editPromo.letter_number || null,
      }).eq('id', editingPromoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'পত্র আপডেট হয়েছে' : 'Letter updated');
      setEditingPromoId(null);
      qc.invalidateQueries({ queryKey: ['staff-promotions', staff.id] });
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const updateSalaryMutation = useMutation({
    mutationFn: async () => {
      if (!editingSalaryId) return;
      const { error } = await supabase.from('staff_salary_changes').update({
        old_salary: Number(editSalary.old_salary || 0),
        new_salary: Number(editSalary.new_salary || 0),
        change_type: editSalary.change_type,
        effective_date: editSalary.effective_date,
        reason: editSalary.reason || null,
        letter_number: editSalary.letter_number || null,
      }).eq('id', editingSalaryId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'পত্র আপডেট হয়েছে' : 'Letter updated');
      setEditingSalaryId(null);
      qc.invalidateQueries({ queryKey: ['staff-salary-changes', staff.id] });
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const reprintPromo = async (h: any) => {
    const fileUrl = await generateLetter({
      type: 'promotion',
      language: bn ? 'bn' : 'en',
      staff: {
        name: bn ? (staff.name_bn || staff.name_en) : (staff.name_en || staff.name_bn),
        staff_id: staff.staff_id,
        designation: h.old_designation,
      },
      old_designation: h.old_designation,
      new_designation: h.new_designation,
      effective_date: h.effective_date,
      reason: h.reason,
      letter_number: h.letter_number,
    });
    if (fileUrl) {
      await supabase.from('staff_promotions').update({ letter_file_url: fileUrl }).eq('id', h.id);
      qc.invalidateQueries({ queryKey: ['staff-promotions', staff.id] });
    }
  };

  const reprintSalary = async (h: any) => {
    const fileUrl = await generateLetter({
      type: 'salary_change',
      language: bn ? 'bn' : 'en',
      staff: {
        name: bn ? (staff.name_bn || staff.name_en) : (staff.name_en || staff.name_bn),
        staff_id: staff.staff_id,
        designation: staff.designation,
      },
      old_salary: h.old_salary,
      new_salary: h.new_salary,
      change_type: h.change_type,
      effective_date: h.effective_date,
      reason: h.reason,
      letter_number: h.letter_number,
    });
    if (fileUrl) {
      await supabase.from('staff_salary_changes').update({ letter_file_url: fileUrl }).eq('id', h.id);
      qc.invalidateQueries({ queryKey: ['staff-salary-changes', staff.id] });
    }
  };

  if (!staff) return null;

  const staffName = bn ? (staff.name_bn || staff.name_en) : (staff.name_en || staff.name_bn);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[38px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {bn ? 'স্টাফ পত্র জেনারেটর' : 'Staff Letter Generator'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {staffName} {staff.staff_id ? `• ${staff.staff_id}` : ''} • {staff.designation || '—'}
          </p>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="promotion">{bn ? 'পদোন্নতি / পদবি' : 'Promotion / Designation'}</TabsTrigger>
            <TabsTrigger value="salary">{bn ? 'বেতন পরিবর্তন' : 'Salary Change'}</TabsTrigger>
          </TabsList>

          {/* PROMOTION TAB */}
          <TabsContent value="promotion" className="space-y-4 pt-4">
            <div className="rounded-[20px] bg-secondary/40 p-3 text-sm flex items-center gap-2">
              <span className="text-muted-foreground">{bn ? 'বর্তমান পদবি:' : 'Current:'}</span>
              <strong>{staff.designation || '—'}</strong>
              <ArrowRight className="w-4 h-4 text-primary" />
              <span className="text-primary font-semibold">{newDesignation || (bn ? 'নতুন পদবি' : 'New Designation')}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{bn ? 'নতুন পদবি *' : 'New Designation *'}</Label>
                <Select value={newDesignation} onValueChange={setNewDesignation}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    {designations.map((d: any) => (
                      <SelectItem key={d.id} value={bn ? d.name_bn : d.name}>
                        {bn ? d.name_bn : d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{bn ? 'কার্যকর তারিখ' : 'Effective Date'}</Label>
                <Input type="date" value={pEffectiveDate} onChange={e => setPEffectiveDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>{bn ? 'স্মারক নং (ঐচ্ছিক)' : 'Letter No (optional)'}</Label>
              <Input value={pLetterNo} onChange={e => setPLetterNo(e.target.value)} placeholder={bn ? 'স্বয়ংক্রিয়' : 'Auto-generate'} className="mt-1" />
            </div>
            <div>
              <Label>{bn ? 'কারণ / মন্তব্য' : 'Reason / Remarks'}</Label>
              <Textarea value={pReason} onChange={e => setPReason(e.target.value)} rows={2} className="mt-1" />
            </div>
            <details className="rounded-[16px] border bg-secondary/20 p-3">
              <summary className="cursor-pointer text-sm font-medium">
                {bn ? '✏️ পত্রের টেক্সট কাস্টমাইজ করুন (ঐচ্ছিক)' : '✏️ Customize Letter Text (optional)'}
              </summary>
              <div className="mt-3 space-y-2">
                <div>
                  <Label className="text-xs">{bn ? 'শুরুর অনুচ্ছেদ (খালি রাখলে ডিফল্ট ব্যবহার হবে)' : 'Opening paragraph (leave blank for default)'}</Label>
                  <Textarea value={pIntroText} onChange={e => setPIntroText(e.target.value)} rows={3} className="mt-1 text-sm" placeholder={bn ? 'আপনাকে অবগত করা যাইতেছে যে...' : 'We are pleased to inform you...'} />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'শেষের অনুচ্ছেদ' : 'Closing paragraph'}</Label>
                  <Textarea value={pClosingText} onChange={e => setPClosingText(e.target.value)} rows={3} className="mt-1 text-sm" placeholder={bn ? 'আশা করা যায়, আপনি নতুন দায়িত্বে...' : 'We expect you to discharge...'} />
                </div>
              </div>
            </details>

            <Button onClick={() => promotionMutation.mutate()} disabled={promotionMutation.isPending} className="w-full btn-primary-gradient">
              {promotionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Printer className="w-4 h-4 mr-2" />}
              {bn ? 'পত্র তৈরি ও সংরক্ষণ' : 'Generate & Save Letter'}
            </Button>

            {/* History */}
            {promotionHistory.length > 0 && (
              <div className="pt-2">
                <h4 className="text-sm font-semibold mb-2">{bn ? 'পদোন্নতির ইতিহাস' : 'Promotion History'}</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {promotionHistory.map((h: any) => editingPromoId === h.id ? (
                    <div key={h.id} className="rounded-[16px] bg-card border p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">{bn ? 'পূর্বের পদবি' : 'Old Designation'}</Label>
                          <Input className="mt-1 h-8 text-xs" value={editPromo.old_designation || ''} onChange={e => setEditPromo({ ...editPromo, old_designation: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">{bn ? 'নতুন পদবি' : 'New Designation'}</Label>
                          <Select value={editPromo.new_designation || ''} onValueChange={(v) => setEditPromo({ ...editPromo, new_designation: v })}>
                            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {designations.map((d: any) => (
                                <SelectItem key={d.id} value={bn ? d.name_bn : d.name}>{bn ? d.name_bn : d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">{bn ? 'কার্যকর তারিখ' : 'Effective Date'}</Label>
                          <Input type="date" className="mt-1 h-8 text-xs" value={editPromo.effective_date || ''} onChange={e => setEditPromo({ ...editPromo, effective_date: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">{bn ? 'স্মারক নং' : 'Letter No'}</Label>
                          <Input className="mt-1 h-8 text-xs" value={editPromo.letter_number || ''} onChange={e => setEditPromo({ ...editPromo, letter_number: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">{bn ? 'কারণ' : 'Reason'}</Label>
                        <Textarea rows={2} className="mt-1 text-xs" value={editPromo.reason || ''} onChange={e => setEditPromo({ ...editPromo, reason: e.target.value })} />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setEditingPromoId(null)}><X className="w-3 h-3 mr-1" />{bn ? 'বাতিল' : 'Cancel'}</Button>
                        <Button size="sm" onClick={() => updatePromoMutation.mutate()} disabled={updatePromoMutation.isPending}>
                          {updatePromoMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                          {bn ? 'সংরক্ষণ' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div key={h.id} className="rounded-[16px] bg-card border p-2 text-xs flex items-center gap-2">
                      <span className="text-muted-foreground">{format(new Date(h.effective_date), 'dd/MM/yyyy')}</span>
                      <span>{h.old_designation || '—'}</span>
                      <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                      <span className="font-semibold text-primary">{h.new_designation}</span>
                      <div className="ml-auto flex gap-1">
                        {h.letter_file_url && (
                          <Button asChild size="icon" variant="ghost" className="h-7 w-7" title={bn ? 'ফাইল ডাউনলোড' : 'Download File'}>
                            <a href={h.letter_file_url} target="_blank" rel="noopener noreferrer" download>
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => reprintPromo(h)} title={bn ? 'পুনরায় প্রিন্ট' : 'Reprint'}>
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingPromoId(h.id); setEditPromo({ ...h }); }} title={bn ? 'এডিট' : 'Edit'}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* SALARY TAB */}
          <TabsContent value="salary" className="space-y-4 pt-4">
            <div className="rounded-[20px] bg-secondary/40 p-3 text-sm flex items-center gap-2">
              <span className="text-muted-foreground">{bn ? 'বর্তমান বেতন:' : 'Current:'}</span>
              <strong>৳ {Number(staff.salary || 0).toLocaleString()}</strong>
              <ArrowRight className="w-4 h-4 text-primary" />
              <span className="text-primary font-semibold">৳ {newSalary ? Number(newSalary).toLocaleString() : (bn ? 'নতুন বেতন' : 'New Salary')}</span>
              {newSalary && Number(newSalary) !== Number(staff.salary || 0) && (
                <span className={`ml-auto inline-flex items-center gap-1 text-xs font-semibold ${Number(newSalary) > Number(staff.salary || 0) ? 'text-success' : 'text-destructive'}`}>
                  {Number(newSalary) > Number(staff.salary || 0) ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  ৳ {Math.abs(Number(newSalary) - Number(staff.salary || 0)).toLocaleString()}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{bn ? 'নতুন বেতন (৳) *' : 'New Salary (BDT) *'}</Label>
                <Input type="number" value={newSalary} onChange={e => setNewSalary(e.target.value)} placeholder="0" className="mt-1" />
              </div>
              <div>
                <Label>{bn ? 'পরিবর্তনের ধরন' : 'Change Type'}</Label>
                <Select value={changeType} onValueChange={(v) => setChangeType(v as any)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">{bn ? 'বৃদ্ধি' : 'Increase'}</SelectItem>
                    <SelectItem value="decrease">{bn ? 'হ্রাস' : 'Decrease'}</SelectItem>
                    <SelectItem value="adjustment">{bn ? 'সমন্বয়' : 'Adjustment'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{bn ? 'কার্যকর তারিখ' : 'Effective Date'}</Label>
                <Input type="date" value={sEffectiveDate} onChange={e => setSEffectiveDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>{bn ? 'স্মারক নং (ঐচ্ছিক)' : 'Letter No (optional)'}</Label>
                <Input value={sLetterNo} onChange={e => setSLetterNo(e.target.value)} placeholder={bn ? 'স্বয়ংক্রিয়' : 'Auto'} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>{bn ? 'কারণ / মন্তব্য' : 'Reason / Remarks'}</Label>
              <Textarea value={sReason} onChange={e => setSReason(e.target.value)} rows={2} className="mt-1" />
            </div>
            <details className="rounded-[16px] border bg-secondary/20 p-3">
              <summary className="cursor-pointer text-sm font-medium">
                {bn ? '✏️ পত্রের টেক্সট কাস্টমাইজ করুন (ঐচ্ছিক)' : '✏️ Customize Letter Text (optional)'}
              </summary>
              <div className="mt-3 space-y-2">
                <div>
                  <Label className="text-xs">{bn ? 'শুরুর অনুচ্ছেদ' : 'Opening paragraph'}</Label>
                  <Textarea value={sIntroText} onChange={e => setSIntroText(e.target.value)} rows={3} className="mt-1 text-sm" placeholder={bn ? 'প্রতিষ্ঠানের সিদ্ধান্ত মোতাবেক...' : 'As per management decision...'} />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'শেষের অনুচ্ছেদ' : 'Closing paragraph'}</Label>
                  <Textarea value={sClosingText} onChange={e => setSClosingText(e.target.value)} rows={3} className="mt-1 text-sm" placeholder={bn ? 'উক্ত সিদ্ধান্ত অনুযায়ী...' : 'The revised salary will...'} />
                </div>
              </div>
            </details>

            <Button onClick={() => salaryMutation.mutate()} disabled={salaryMutation.isPending} className="w-full btn-primary-gradient">
              {salaryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Printer className="w-4 h-4 mr-2" />}
              {bn ? 'পত্র তৈরি ও সংরক্ষণ' : 'Generate & Save Letter'}
            </Button>

            {salaryHistory.length > 0 && (
              <div className="pt-2">
                <h4 className="text-sm font-semibold mb-2">{bn ? 'বেতন পরিবর্তনের ইতিহাস' : 'Salary Change History'}</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {salaryHistory.map((h: any) => editingSalaryId === h.id ? (
                    <div key={h.id} className="rounded-[16px] bg-card border p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">{bn ? 'পূর্বের বেতন' : 'Old Salary'}</Label>
                          <Input type="number" className="mt-1 h-8 text-xs" value={editSalary.old_salary ?? ''} onChange={e => setEditSalary({ ...editSalary, old_salary: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">{bn ? 'নতুন বেতন' : 'New Salary'}</Label>
                          <Input type="number" className="mt-1 h-8 text-xs" value={editSalary.new_salary ?? ''} onChange={e => setEditSalary({ ...editSalary, new_salary: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">{bn ? 'ধরন' : 'Type'}</Label>
                          <Select value={editSalary.change_type || 'increase'} onValueChange={(v) => setEditSalary({ ...editSalary, change_type: v })}>
                            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="increase">{bn ? 'বৃদ্ধি' : 'Increase'}</SelectItem>
                              <SelectItem value="decrease">{bn ? 'হ্রাস' : 'Decrease'}</SelectItem>
                              <SelectItem value="adjustment">{bn ? 'সমন্বয়' : 'Adjustment'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">{bn ? 'কার্যকর তারিখ' : 'Effective Date'}</Label>
                          <Input type="date" className="mt-1 h-8 text-xs" value={editSalary.effective_date || ''} onChange={e => setEditSalary({ ...editSalary, effective_date: e.target.value })} />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">{bn ? 'স্মারক নং' : 'Letter No'}</Label>
                          <Input className="mt-1 h-8 text-xs" value={editSalary.letter_number || ''} onChange={e => setEditSalary({ ...editSalary, letter_number: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">{bn ? 'কারণ' : 'Reason'}</Label>
                        <Textarea rows={2} className="mt-1 text-xs" value={editSalary.reason || ''} onChange={e => setEditSalary({ ...editSalary, reason: e.target.value })} />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setEditingSalaryId(null)}><X className="w-3 h-3 mr-1" />{bn ? 'বাতিল' : 'Cancel'}</Button>
                        <Button size="sm" onClick={() => updateSalaryMutation.mutate()} disabled={updateSalaryMutation.isPending}>
                          {updateSalaryMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                          {bn ? 'সংরক্ষণ' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div key={h.id} className="rounded-[16px] bg-card border p-2 text-xs flex items-center gap-2">
                      <span className="text-muted-foreground">{format(new Date(h.effective_date), 'dd/MM/yyyy')}</span>
                      <span>৳ {Number(h.old_salary || 0).toLocaleString()}</span>
                      <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                      <span className="font-semibold text-primary">৳ {Number(h.new_salary).toLocaleString()}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${h.change_type === 'increase' ? 'bg-success/10 text-success' : h.change_type === 'decrease' ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
                        {h.change_type === 'increase' ? (bn ? 'বৃদ্ধি' : 'Increase') : h.change_type === 'decrease' ? (bn ? 'হ্রাস' : 'Decrease') : (bn ? 'সমন্বয়' : 'Adjust')}
                      </span>
                      <div className="ml-auto flex gap-1">
                        {h.letter_file_url && (
                          <Button asChild size="icon" variant="ghost" className="h-7 w-7" title={bn ? 'ফাইল ডাউনলোড' : 'Download File'}>
                            <a href={h.letter_file_url} target="_blank" rel="noopener noreferrer" download>
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => reprintSalary(h)} title={bn ? 'পুনরায় প্রিন্ট' : 'Reprint'}>
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingSalaryId(h.id); setEditSalary({ ...h }); }} title={bn ? 'এডিট' : 'Edit'}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default StaffLetterDialog;
