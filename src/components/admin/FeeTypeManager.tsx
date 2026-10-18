import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2, Filter, Download } from 'lucide-react';
import { toast } from 'sonner';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';

const exportFeeTypesCSV = (data: any[], categories: any[], bn: boolean) => {
  const bom = '\uFEFF';
  const headers = [bn ? 'নাম' : 'Name', bn ? 'সেশন' : 'Session', bn ? 'ক্যাটাগরি' : 'Category', bn ? 'ফ্রিকোয়েন্সি' : 'Frequency', bn ? 'পরিমাণ' : 'Amount', bn ? 'বিভাগ' : 'Division', bn ? 'শ্রেণী' : 'Class'];
  const rows = data.map((f: any) => [
    f.name_bn || f.name,
    f.academic_sessions?.[bn ? 'name_bn' : 'name'] || '—',
    categories.find((c: any) => c.key === f.fee_category)?.[bn ? 'bn' : 'en'] || f.fee_category,
    f.payment_frequency === 'monthly' ? (bn ? 'মাসিক' : 'Monthly') : (bn ? 'একবার' : 'One-time'),
    f.amount,
    f.divisions?.name_bn || (bn ? 'সব' : 'All'),
    f.classes?.name_bn || (bn ? 'সব' : 'All'),
  ]);
  const csv = bom + [headers, ...rows].map(r => r.map((c: any) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fee-types-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const FeeTypeManager = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterSessionId, setFilterSessionId] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; name_bn: string; amount: string; fee_category: string; division_id: string; class_id: string; session_id: string; payment_frequency: string; applicable_months: string[] }>({ name: '', name_bn: '', amount: '', fee_category: 'monthly', division_id: '', class_id: '', session_id: '', payment_frequency: 'one-time', applicable_months: [] });

  const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

  const { data: sessions = [] } = useQuery({
    queryKey: ['academic_sessions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_sessions').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  // Compute applicable months based on selected session's date range
  const sessionMonths = useMemo(() => {
    if (!form.session_id) return MONTHS_EN.map((m, i) => ({ en: m, bn: MONTHS_BN[i], index: i, key: m, year: new Date().getFullYear() }));
    const session = sessions.find((s: any) => s.id === form.session_id);
    if (!session?.start_date || !session?.end_date) return MONTHS_EN.map((m, i) => ({ en: m, bn: MONTHS_BN[i], index: i, key: m, year: new Date().getFullYear() }));
    
    const start = new Date(session.start_date + 'T00:00:00');
    const end = new Date(session.end_date + 'T00:00:00');
    const months: { en: string; bn: string; index: number; key: string; year: number }[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    
    while (cursor <= end) {
      const mi = cursor.getMonth();
      const yr = cursor.getFullYear();
      const key = `${MONTHS_EN[mi]}-${yr}`;
      months.push({ en: MONTHS_EN[mi], bn: MONTHS_BN[mi], index: mi, key, year: yr });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  }, [form.session_id, sessions]);

  const { data: feeTypes = [] } = useQuery({
    queryKey: ['all_fee_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fee_types').select('*, divisions(name_bn), classes(name_bn), academic_sessions(name_bn, name)').order('fee_category').order('name_bn');
      if (error) throw error;
      return data;
    },
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: allClasses = [] } = useQuery({
    queryKey: ['all_classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: feeCategories = [] } = useQuery({
    queryKey: ['fee_categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fee_categories').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const filteredClasses = form.division_id
    ? allClasses.filter((c: any) => c.division_id === form.division_id)
    : allClasses;

  // Filter fee types by selected session
  const displayedFeeTypes = feeTypes.filter((f: any) => {
    if (f.is_active === false) return false;
    if (filterSessionId === 'all') return true;
    if (filterSessionId === 'none') return !f.session_id;
    return f.session_id === filterSessionId;
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name_bn || !form.amount) throw new Error(bn ? 'নাম ও পরিমাণ আবশ্যক' : 'Name and amount required');
      const payload: any = {
        name: form.name || form.name_bn,
        name_bn: form.name_bn,
        amount: parseFloat(form.amount),
        fee_category: form.fee_category,
        division_id: form.division_id || null,
        class_id: form.class_id || null,
        session_id: form.session_id || null,
        payment_frequency: form.payment_frequency || 'one-time',
        applicable_months: form.applicable_months.length > 0 ? form.applicable_months : null,
      };
      if (editId) {
        const { error } = await supabase.from('fee_types').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('fee_types').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_fee_types'] });
      queryClient.invalidateQueries({ queryKey: ['fee_types'] });
      setOpen(false);
      resetForm();
      toast.success(bn ? 'সফল' : 'Success');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fee_types').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_fee_types'] });
      queryClient.invalidateQueries({ queryKey: ['fee_types'] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    },
  });

  const resetForm = () => {
    setForm({ name: '', name_bn: '', amount: '', fee_category: 'monthly', division_id: '', class_id: '', session_id: '', payment_frequency: 'one-time', applicable_months: [] });
    setEditId(null);
  };

  const openEdit = (item: any) => {
    const months = Array.isArray(item.applicable_months) ? item.applicable_months : [];
    setForm({
      name: item.name,
      name_bn: item.name_bn,
      amount: String(item.amount),
      fee_category: item.fee_category,
      division_id: item.division_id || '',
      class_id: item.class_id || '',
      session_id: item.session_id || '',
      payment_frequency: item.payment_frequency || 'one-time',
      applicable_months: months,
    });
    setEditId(item.id);
    setOpen(true);
  };

  const handleDivisionChange = (v: string) => {
    setForm(p => ({ ...p, division_id: v, class_id: '' }));
  };

  const categories = feeCategories.map((c: any) => ({ key: c.name, bn: c.name_bn, en: c.name }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-display font-bold text-foreground">{bn ? 'ফি ধরন ব্যবস্থাপনা' : 'Fee Type Management'}</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterSessionId} onValueChange={setFilterSessionId}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <SelectValue placeholder={bn ? 'সেশন ফিল্টার' : 'Filter by session'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? '📋 সব সেশন' : '📋 All Sessions'}</SelectItem>
                <SelectItem value="none">{bn ? '🔹 সেশন ছাড়া' : '🔹 No Session'}</SelectItem>
                {sessions.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn || s.name : s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="outline" onClick={() => exportFeeTypesCSV(displayedFeeTypes, categories, bn)} disabled={displayedFeeTypes.length === 0}>
            <Download className="w-4 h-4 mr-1" /> {bn ? 'ডাউনলোড' : 'Export'}
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setOpen(true); }} className="btn-primary-gradient">
            <Plus className="w-4 h-4 mr-1" /> {bn ? 'নতুন যোগ' : 'Add New'}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'নাম' : 'Name'}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'সেশন' : 'Session'}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'ক্যাটাগরি' : 'Category'}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'ফ্রিকোয়েন্সি' : 'Frequency'}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'পরিমাণ' : 'Amount'}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'বিভাগ' : 'Division'}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'শ্রেণী' : 'Class'}</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">{bn ? 'অ্যাকশন' : 'Action'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayedFeeTypes.map((f: any) => (
              <tr key={f.id} className="hover:bg-secondary/30">
                <td className="px-4 py-3 font-medium text-foreground">{f.name_bn}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-accent/50 text-accent-foreground">
                    {f.academic_sessions?.[bn ? 'name_bn' : 'name'] || (bn ? '—' : '—')}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                    {categories.find(c => c.key === f.fee_category)?.[bn ? 'bn' : 'en'] || f.fee_category}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.payment_frequency === 'monthly' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {f.payment_frequency === 'monthly' ? (bn ? '🔄 মাসিক' : '🔄 Monthly') : (bn ? '1️⃣ একবার' : '1️⃣ One-time')}
                  </span>
                  {Array.isArray(f.applicable_months) && f.applicable_months.length > 0 && (
                    <div className="text-[11px] text-primary mt-1 font-medium flex items-center gap-1">
                      <span>📅</span>
                      <span>
                        {f.applicable_months.length === 12
                          ? (bn ? 'সব মাস' : 'All Months')
                          : f.applicable_months.map((m: string) => {
                              const base = m.split('-')[0];
                              const idx = MONTHS_EN.indexOf(base);
                              return bn && idx >= 0 ? MONTHS_BN[idx] : base;
                            }).join(', ')}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-bold text-foreground">৳{f.amount}</td>
                <td className="px-4 py-3 text-muted-foreground">{f.divisions?.name_bn || (bn ? 'সব বিভাগ' : 'All')}</td>
                <td className="px-4 py-3 text-muted-foreground">{f.classes?.name_bn || (bn ? 'সব শ্রেণী' : 'All')}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(f)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(f.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {displayedFeeTypes.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">{bn ? 'কোনো ফি ধরন নেই' : 'No fee types'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? (bn ? 'ফি ধরন সম্পাদনা' : 'Edit Fee Type') : (bn ? 'নতুন ফি ধরন' : 'New Fee Type')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
             <div>
              <label className="text-sm font-medium">{bn ? 'শিক্ষাবর্ষ' : 'Academic Session'}</label>
              <Select value={form.session_id || 'none'} onValueChange={v => {
                const newSessionId = v === 'none' ? '' : v;
                setForm(p => {
                  const newSession = sessions.find((s: any) => s.id === newSessionId);
                  let validMonths = p.applicable_months;
                  if (newSession?.start_date && newSession?.end_date) {
                    const start = new Date(newSession.start_date + 'T00:00:00');
                    const end = new Date(newSession.end_date + 'T00:00:00');
                    const allowedKeys: string[] = [];
                    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
                    while (cursor <= end) {
                      allowedKeys.push(`${MONTHS_EN[cursor.getMonth()]}-${cursor.getFullYear()}`);
                      cursor.setMonth(cursor.getMonth() + 1);
                    }
                    validMonths = p.applicable_months.filter(m => allowedKeys.includes(m));
                  }
                  return { ...p, session_id: newSessionId, applicable_months: validMonths };
                });
              }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{bn ? '— সেশন ছাড়া —' : '— No Session —'}</SelectItem>
                  {sessions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn || s.name : s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} *</label>
              <Input value={form.name_bn} onChange={e => setForm(p => ({ ...p, name_bn: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">{bn ? 'পরিমাণ (৳)' : 'Amount (৳)'} *</label>
              <NumberInput value={form.amount === '' ? null : Number(form.amount)} onValueChange={n => setForm(p => ({ ...p, amount: n ? String(n) : '' }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">{bn ? 'ক্যাটাগরি' : 'Category'}</label>
              <Select value={form.fee_category} onValueChange={v => setForm(p => ({ ...p, fee_category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.key} value={c.key}>{bn ? c.bn : c.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{bn ? 'পেমেন্ট ফ্রিকোয়েন্সি' : 'Payment Frequency'}</label>
              <Select value={form.payment_frequency} onValueChange={v => setForm(p => ({ ...p, payment_frequency: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-time">{bn ? 'একবার (One-time)' : 'One-time'}</SelectItem>
                  <SelectItem value="monthly">{bn ? 'মাসিক (Monthly)' : 'Monthly'}</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    {form.payment_frequency === 'one-time'
                      ? (bn ? 'কোন মাসের জন্য প্রযোজ্য (ঐচ্ছিক):' : 'Applicable Month (Optional):')
                      : (bn ? 'প্রযোজ্য মাস নির্বাচন করুন:' : 'Select applicable months:')}
                    {form.session_id && (
                      <span className="ml-1 text-muted-foreground font-normal">
                        ({sessionMonths.length} {bn ? 'টি মাস' : 'months'})
                      </span>
                    )}
                  </label>
                  <button type="button" className="text-xs text-primary hover:underline" onClick={() => {
                    const allKeys = sessionMonths.map(m => m.key);
                    setForm(p => ({
                      ...p,
                      applicable_months: p.applicable_months.length === sessionMonths.length ? [] : (p.payment_frequency === 'one-time' && p.applicable_months.length > 0 ? [] : allKeys)
                    }));
                  }}>
                    {form.applicable_months.length === sessionMonths.length || (form.payment_frequency === 'one-time' && form.applicable_months.length > 0)
                      ? (bn ? 'সব বাদ দিন' : 'Deselect All')
                      : (bn ? 'সব নির্বাচন' : 'Select All')}
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {sessionMonths.map((month) => {
                    const isSelected = form.applicable_months.includes(month.key);
                    const showYear = sessionMonths.some(m => m.en === month.en && m.year !== month.year);
                    return (
                      <button
                        key={month.key}
                        type="button"
                        onClick={() => {
                          setForm(p => ({
                            ...p,
                            applicable_months: isSelected
                              ? p.applicable_months.filter(m => m !== month.key)
                              : [...p.applicable_months, month.key]
                          }));
                        }}
                        className={`text-center rounded-lg px-2 py-2 text-xs font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary ring-1 ring-primary'
                            : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        {bn ? month.bn : month.en.slice(0, 3)}
                        {showYear && <span className="block text-[10px] opacity-70">{month.year}</span>}
                      </button>
                    );
                  })}
                </div>
                {form.applicable_months.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {form.payment_frequency === 'one-time'
                      ? (bn ? '✦ কোনো নির্দিষ্ট মাস নির্বাচিত নয় — যেকোনো মাসে প্রযোজ্য হবে (আগের মতো)' : '✦ No specific month selected — will apply to any month')
                      : (bn ? '⚠ কোনো মাস নির্বাচিত নয় — সব মাসে প্রযোজ্য হবে' : '⚠ No months selected — will apply to all months')}
                  </p>
                )}
                {form.applicable_months.length > 0 && (
                  <p className="text-xs text-primary bg-primary/5 rounded-lg px-3 py-1.5 font-medium">
                    ✓ {form.applicable_months.length} {bn ? 'টি মাস নির্বাচিত' : 'month(s) selected'}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{bn ? 'বিভাগ' : 'Division'}</label>
                <Select value={form.division_id || 'all'} onValueChange={v => handleDivisionChange(v === 'all' ? '' : v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="font-semibold text-primary">{bn ? '✦ সব বিভাগ' : '✦ All Divisions'}</span>
                    </SelectItem>
                    {divisions.map((d: any) => <SelectItem key={d.id} value={d.id}>{bn ? d.name_bn : d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">{bn ? 'শ্রেণী' : 'Class'}</label>
                <Select value={form.class_id || 'all'} onValueChange={v => setForm(p => ({ ...p, class_id: v === 'all' ? '' : v }))} disabled={!!form.division_id && filteredClasses.length === 0}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="font-semibold text-primary">{bn ? '✦ সব শ্রেণী' : '✦ All Classes'}</span>
                    </SelectItem>
                    {(form.division_id ? filteredClasses : allClasses).map((c: any) => <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-xs rounded-lg px-3 py-2 bg-primary/5 text-primary border border-primary/20 space-y-1">
              {!form.division_id && !form.class_id && (
                <p>{bn ? '✦ "সব বিভাগ" ও "সব শ্রেণী" নির্বাচিত — এই ফি সকল বিভাগ ও শ্রেণীর শিক্ষার্থীদের জন্য প্রযোজ্য হবে।' : '✦ "All Divisions" & "All Classes" selected — this fee will apply equally to all divisions and classes.'}</p>
              )}
              {form.division_id && !form.class_id && (
                <p>{bn ? `✦ নির্বাচিত বিভাগ: "${divisions.find((d: any) => d.id === form.division_id)?.name_bn || ''}"-এর সকল শ্রেণীর শিক্ষার্থীদের জন্য প্রযোজ্য হবে।` : `✦ Selected division: All classes under this division.`}</p>
              )}
              {form.division_id && form.class_id && (
                <p>{bn ? `✦ "${divisions.find((d: any) => d.id === form.division_id)?.name_bn || ''}" বিভাগের "${allClasses.find((c: any) => c.id === form.class_id)?.name_bn || ''}" শ্রেণীর শিক্ষার্থীদের জন্য প্রযোজ্য হবে।` : `✦ Specific division and class selected.`}</p>
              )}
              {!form.division_id && form.class_id && (
                <p>{bn ? `✦ শুধুমাত্র "${allClasses.find((c: any) => c.id === form.class_id)?.name_bn || ''}" শ্রেণীর শিক্ষার্থীদের জন্য প্রযোজ্য হবে (সকল বিভাগ)।` : `✦ Specific class selected across all divisions.`}</p>
              )}
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

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        onConfirm={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null); } }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
};

export default FeeTypeManager;
