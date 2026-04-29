import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, ShieldCheck, Building2, Phone, Mail, Power, PowerOff } from 'lucide-react';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import PhotoUpload from '@/components/PhotoUpload';
import { format } from 'date-fns';
import { usePagePermissions } from '@/hooks/usePagePermissions';

type Officer = {
  id: string;
  name_bn: string;
  name_en: string | null;
  designation: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  photo_url: string | null;
  date_of_birth: string | null;
  religion: string | null;
  nid: string | null;
  joining_date: string | null;
  status: string | null;
  employment_type: string | null;
  residence_type: string | null;
  duty_start_time: string | null;
  duty_end_time: string | null;
  education: string | null;
  experience: string | null;
  previous_institute: string | null;
  salary: number | null;
  responsibilities: string | null;
  office_room: string | null;
  officer_id: string | null;
  created_at: string;
};

const emptyForm: Partial<Officer> = {
  name_bn: '',
  name_en: '',
  designation: '',
  department: '',
  phone: '',
  email: '',
  address: '',
  photo_url: '',
  date_of_birth: '',
  religion: 'islam',
  nid: '',
  joining_date: format(new Date(), 'yyyy-MM-dd'),
  status: 'active',
  employment_type: 'full_time',
  residence_type: 'non_residential',
  duty_start_time: '09:00',
  duty_end_time: '17:00',
  education: '',
  experience: '',
  previous_institute: '',
  salary: 0,
  responsibilities: '',
  office_room: '',
  officer_id: '',
};

const AdminAdministrative = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const { canViewPage, canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/administrative');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Officer | null>(null);
  const [form, setForm] = useState<Partial<Officer>>(emptyForm);
  const [delTarget, setDelTarget] = useState<Officer | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ kind: 'department' | 'designation'; name_bn: string; name_en: string } | null>(null);

  const { data: officers = [], isLoading } = useQuery({
    queryKey: ['administrative-officers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('administrative_officers' as any)
        .select('*')
        .is('deleted_at', null)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Officer[];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['administrative-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('administrative_departments' as any)
        .select('id, name, name_bn')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name_bn', { ascending: true });
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string; name_bn: string }>;
    },
  });

  const { data: designations = [] } = useQuery({
    queryKey: ['administrative-designations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('designations')
        .select('id, name, name_bn, staff_category')
        .eq('is_active', true)
        .eq('staff_category', 'administrative')
        .order('sort_order', { ascending: true })
        .order('name_bn', { ascending: true });
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string; name_bn: string }>;
    },
  });

  const createOption = useMutation({
    mutationFn: async (payload: { kind: 'department' | 'designation'; name_bn: string; name_en: string }) => {
      const name = (payload.name_en || payload.name_bn).trim();
      const name_bn = payload.name_bn.trim();
      if (!name_bn) throw new Error(bn ? 'বাংলা নাম দিন' : 'Bengali name required');
      if (payload.kind === 'department') {
        const { error } = await supabase
          .from('administrative_departments' as any)
          .insert({ name, name_bn, is_active: true });
        if (error) throw error;
        return { kind: payload.kind, value: name_bn };
      } else {
        const { error } = await supabase
          .from('designations')
          .insert({ name, name_bn, staff_category: 'administrative', is_active: true });
        if (error) throw error;
        return { kind: payload.kind, value: name_bn };
      }
    },
    onSuccess: (res) => {
      toast.success(bn ? 'যোগ করা হয়েছে' : 'Added');
      qc.invalidateQueries({ queryKey: [res.kind === 'department' ? 'administrative-departments' : 'administrative-designations'] });
      setForm(prev => ({ ...prev, [res.kind === 'department' ? 'department' : 'designation']: res.value }));
      setQuickAdd(null);
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = officers;
    if (statusFilter !== 'all') {
      list = list.filter(o => (o.status || 'active') === statusFilter);
    }
    if (!q) return list;
    return list.filter(o =>
      [o.name_bn, o.name_en, o.designation, o.department, o.phone, o.email, o.officer_id]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    );
  }, [officers, search, statusFilter]);

  const friendlyError = (e: any): string => {
    const msg = String(e?.message || e || '');
    if (msg.includes('DUPLICATE_PHONE') || (msg.includes('uq_admin_officers_phone') )) {
      return bn ? 'এই ফোন নম্বর ইতিমধ্যে অন্য একজন প্রশাসনিক কর্মকর্তার জন্য ব্যবহৃত হয়েছে।' : 'This phone number is already used by another administrative officer.';
    }
    if (msg.includes('DUPLICATE_EMAIL') || msg.includes('uq_admin_officers_email')) {
      return bn ? 'এই ইমেইল ইতিমধ্যে অন্য একজন প্রশাসনিক কর্মকর্তার জন্য ব্যবহৃত হয়েছে।' : 'This email is already used by another administrative officer.';
    }
    if (msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('permission')) {
      return bn ? 'এই কাজটি করার অনুমতি আপনার নেই।' : 'You do not have permission to perform this action.';
    }
    return msg || (bn ? 'একটি ত্রুটি ঘটেছে' : 'An error occurred');
  };

  const upsert = useMutation({
    mutationFn: async (payload: Partial<Officer>) => {
      const cleaned: any = { ...payload };
      ['name_en','designation','department','phone','email','address','photo_url','date_of_birth','nid','education','experience','previous_institute','responsibilities','office_room','officer_id'].forEach(k => {
        if (cleaned[k] === '') cleaned[k] = null;
      });
      cleaned.salary = Number(cleaned.salary || 0);
      if (editing) {
        if (!canEditItem) throw new Error('PERMISSION_DENIED');
        const { error } = await supabase
          .from('administrative_officers' as any)
          .update(cleaned)
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        if (!canAddItem) throw new Error('PERMISSION_DENIED');
        const { error } = await supabase
          .from('administrative_officers' as any)
          .insert(cleaned);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(bn ? 'সফলভাবে সংরক্ষণ হয়েছে' : 'Saved successfully');
      qc.invalidateQueries({ queryKey: ['administrative-officers'] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(friendlyError(e)),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      if (!canDeleteItem) throw new Error('PERMISSION_DENIED');
      const { error } = await supabase
        .from('administrative_officers' as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
      qc.invalidateQueries({ queryKey: ['administrative-officers'] });
      setDelTarget(null);
    },
    onError: (e: any) => toast.error(friendlyError(e)),
  });

  const toggleStatus = useMutation({
    mutationFn: async (o: Officer) => {
      if (!canEditItem) throw new Error('PERMISSION_DENIED');
      const next = (o.status || 'active') === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('administrative_officers' as any)
        .update({ status: next })
        .eq('id', o.id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      toast.success(next === 'active' ? (bn ? 'সক্রিয় করা হয়েছে' : 'Activated') : (bn ? 'নিষ্ক্রিয় করা হয়েছে' : 'Deactivated'));
      qc.invalidateQueries({ queryKey: ['administrative-officers'] });
    },
    onError: (e: any) => toast.error(friendlyError(e)),
  });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (o: Officer) => {
    setEditing(o);
    setForm({ ...o });
    setOpen(true);
  };

  if (!canViewPage) {
    return (
      <AdminLayout>
        <div className="max-w-[1440px] mx-auto p-12 text-center text-muted-foreground">
          <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
          {bn ? 'এই পেজ দেখার অনুমতি নেই' : 'You do not have permission to view this page'}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-[1440px] mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
              {bn ? 'প্রশাসনিক কর্মকর্তা' : 'Administrative Officers'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn ? 'প্রতিষ্ঠানের প্রশাসনিক কর্মকর্তাদের তালিকা ও ব্যবস্থাপনা' : 'Manage institutional administrative officers'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={bn ? 'খুঁজুন...' : 'Search...'}
                className="pl-9 w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সব স্ট্যাটাস' : 'All status'}</SelectItem>
                <SelectItem value="active">{bn ? 'সক্রিয়' : 'Active'}</SelectItem>
                <SelectItem value="inactive">{bn ? 'নিষ্ক্রিয়' : 'Inactive'}</SelectItem>
                <SelectItem value="on_leave">{bn ? 'ছুটিতে' : 'On Leave'}</SelectItem>
              </SelectContent>
            </Select>
            {canAddItem && (
              <Button onClick={openAdd} className="gap-2">
                <Plus className="w-4 h-4" />
                {bn ? 'নতুন কর্মকর্তা' : 'Add Officer'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: bn ? 'মোট' : 'Total', value: officers.length, color: 'text-emerald-600' },
            { label: bn ? 'সক্রিয়' : 'Active', value: officers.filter(o => o.status === 'active').length, color: 'text-blue-600' },
            { label: bn ? 'নিষ্ক্রিয়' : 'Inactive', value: officers.filter(o => o.status === 'inactive').length, color: 'text-orange-600' },
            { label: bn ? 'পূর্ণকালীন' : 'Full-time', value: officers.filter(o => o.employment_type === 'full_time').length, color: 'text-purple-600' },
          ].map((s, i) => (
            <Card key={i} className="rounded-[24px] p-4 backdrop-blur-xl bg-card/60 border">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
            </Card>
          ))}
        </div>

        {/* List */}
        <Card className="rounded-[32px] overflow-hidden border bg-card/60 backdrop-blur-xl">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
              {bn ? 'কোনো কর্মকর্তা পাওয়া যায়নি' : 'No officers found'}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((o) => (
                <div key={o.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-all hover:-translate-y-[2px]">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center overflow-hidden shrink-0">
                    {o.photo_url ? (
                      <img src={o.photo_url} alt={o.name_bn} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-emerald-600">{o.name_bn.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">{o.name_bn}</h3>
                      {o.officer_id && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">{o.officer_id}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === 'active' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' : 'bg-gray-500/10 text-gray-600'}`}>
                        {o.status === 'active' ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
                      {o.designation && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{o.designation}</span>}
                      {o.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{o.phone}</span>}
                      {o.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{o.email}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canEditItem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => toggleStatus.mutate(o)}
                        disabled={toggleStatus.isPending}
                        title={(o.status || 'active') === 'active' ? (bn ? 'নিষ্ক্রিয় করুন' : 'Deactivate') : (bn ? 'সক্রিয় করুন' : 'Activate')}
                      >
                        {(o.status || 'active') === 'active' ? <PowerOff className="w-4 h-4 text-orange-600" /> : <Power className="w-4 h-4 text-emerald-600" />}
                      </Button>
                    )}
                    {canEditItem && (
                      <Button variant="ghost" size="icon" className="rounded-full" onClick={() => openEdit(o)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {canDeleteItem && (
                      <Button variant="ghost" size="icon" className="rounded-full text-destructive" onClick={() => setDelTarget(o)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-[38px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? (bn ? 'কর্মকর্তা সম্পাদনা' : 'Edit Officer') : (bn ? 'নতুন কর্মকর্তা যোগ করুন' : 'Add New Officer')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Section 1: Identity */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{bn ? '১. পরিচিতি' : '1. Identity'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2 flex justify-center">
                  <PhotoUpload
                    value={form.photo_url || null}
                    onChange={(url) => setForm({ ...form, photo_url: url || '' })}
                    folder="administrative-officers"
                  />
                </div>
                <div>
                  <Label>{bn ? 'নাম (বাংলা) *' : 'Name (Bangla) *'}</Label>
                  <Input value={form.name_bn || ''} onChange={e => setForm({ ...form, name_bn: e.target.value })} required />
                </div>
                <div>
                  <Label>{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</Label>
                  <Input value={form.name_en || ''} onChange={e => setForm({ ...form, name_en: e.target.value })} />
                </div>
                <div>
                  <Label>{bn ? 'কর্মকর্তা আইডি' : 'Officer ID'}</Label>
                  <Input value={form.officer_id || ''} onChange={e => setForm({ ...form, officer_id: e.target.value })} placeholder="ADO-2026-001" />
                </div>
                <div>
                  <Label>{bn ? 'NID' : 'NID'}</Label>
                  <Input value={form.nid || ''} onChange={e => setForm({ ...form, nid: e.target.value })} />
                </div>
                <div>
                  <Label>{bn ? 'জন্মতারিখ' : 'Date of Birth'}</Label>
                  <Input type="date" value={form.date_of_birth || ''} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
                </div>
                <div>
                  <Label>{bn ? 'ধর্ম' : 'Religion'}</Label>
                  <Select value={form.religion || 'islam'} onValueChange={v => setForm({ ...form, religion: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="islam">{bn ? 'ইসলাম' : 'Islam'}</SelectItem>
                      <SelectItem value="hinduism">{bn ? 'হিন্দু' : 'Hinduism'}</SelectItem>
                      <SelectItem value="christianity">{bn ? 'খ্রিস্টান' : 'Christianity'}</SelectItem>
                      <SelectItem value="buddhism">{bn ? 'বৌদ্ধ' : 'Buddhism'}</SelectItem>
                      <SelectItem value="other">{bn ? 'অন্যান্য' : 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Section 2: Contact */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{bn ? '২. যোগাযোগ' : '2. Contact'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'ফোন' : 'Phone'}</Label>
                  <Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <Label>{bn ? 'ইমেইল' : 'Email'}</Label>
                  <Input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>{bn ? 'ঠিকানা' : 'Address'}</Label>
                  <Textarea value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} />
                </div>
              </div>
            </section>

            {/* Section 3: Designation & Duty */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{bn ? '৩. পদবী ও দায়িত্ব' : '3. Designation & Duty'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'পদবী' : 'Designation'}</Label>
                  <Input value={form.designation || ''} onChange={e => setForm({ ...form, designation: e.target.value })} />
                </div>
                <div>
                  <Label>{bn ? 'বিভাগ' : 'Department'}</Label>
                  <Input value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })} />
                </div>
                <div>
                  <Label>{bn ? 'অফিস কক্ষ' : 'Office Room'}</Label>
                  <Input value={form.office_room || ''} onChange={e => setForm({ ...form, office_room: e.target.value })} />
                </div>
                <div>
                  <Label>{bn ? 'যোগদান তারিখ' : 'Joining Date'}</Label>
                  <Input type="date" value={form.joining_date || ''} onChange={e => setForm({ ...form, joining_date: e.target.value })} />
                </div>
                <div>
                  <Label>{bn ? 'চাকরির ধরন' : 'Employment Type'}</Label>
                  <Select value={form.employment_type || 'full_time'} onValueChange={v => setForm({ ...form, employment_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">{bn ? 'পূর্ণকালীন' : 'Full-time'}</SelectItem>
                      <SelectItem value="part_time">{bn ? 'খণ্ডকালীন' : 'Part-time'}</SelectItem>
                      <SelectItem value="contract">{bn ? 'চুক্তিভিত্তিক' : 'Contract'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'আবাসন' : 'Residence'}</Label>
                  <Select value={form.residence_type || 'non_residential'} onValueChange={v => setForm({ ...form, residence_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">{bn ? 'আবাসিক' : 'Residential'}</SelectItem>
                      <SelectItem value="non_residential">{bn ? 'অনাবাসিক' : 'Non-residential'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'ডিউটি শুরু' : 'Duty Start'}</Label>
                  <Input type="time" value={form.duty_start_time || ''} onChange={e => setForm({ ...form, duty_start_time: e.target.value })} />
                </div>
                <div>
                  <Label>{bn ? 'ডিউটি শেষ' : 'Duty End'}</Label>
                  <Input type="time" value={form.duty_end_time || ''} onChange={e => setForm({ ...form, duty_end_time: e.target.value })} />
                </div>
                <div>
                  <Label>{bn ? 'স্ট্যাটাস' : 'Status'}</Label>
                  <Select value={form.status || 'active'} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{bn ? 'সক্রিয়' : 'Active'}</SelectItem>
                      <SelectItem value="inactive">{bn ? 'নিষ্ক্রিয়' : 'Inactive'}</SelectItem>
                      <SelectItem value="on_leave">{bn ? 'ছুটিতে' : 'On Leave'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'বেতন' : 'Salary'}</Label>
                  <Input type="number" value={form.salary ?? 0} onChange={e => setForm({ ...form, salary: Number(e.target.value) })} />
                </div>
                <div className="md:col-span-2">
                  <Label>{bn ? 'দায়িত্বসমূহ' : 'Responsibilities'}</Label>
                  <Textarea value={form.responsibilities || ''} onChange={e => setForm({ ...form, responsibilities: e.target.value })} rows={2} />
                </div>
              </div>
            </section>

            {/* Section 4: Background */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{bn ? '৪. শিক্ষা ও অভিজ্ঞতা' : '4. Education & Experience'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label>{bn ? 'শিক্ষাগত যোগ্যতা' : 'Education'}</Label>
                  <Textarea value={form.education || ''} onChange={e => setForm({ ...form, education: e.target.value })} rows={2} />
                </div>
                <div className="md:col-span-2">
                  <Label>{bn ? 'অভিজ্ঞতা' : 'Experience'}</Label>
                  <Textarea value={form.experience || ''} onChange={e => setForm({ ...form, experience: e.target.value })} rows={2} />
                </div>
                <div className="md:col-span-2">
                  <Label>{bn ? 'পূর্বের প্রতিষ্ঠান' : 'Previous Institute'}</Label>
                  <Input value={form.previous_institute || ''} onChange={e => setForm({ ...form, previous_institute: e.target.value })} />
                </div>
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={() => upsert.mutate(form)} disabled={!form.name_bn || upsert.isPending}>
              {upsert.isPending ? (bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (bn ? 'সংরক্ষণ করুন' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!delTarget}
        onOpenChange={(o) => !o && setDelTarget(null)}
        onConfirm={() => delTarget && softDelete.mutate(delTarget.id)}
        title={bn ? 'কর্মকর্তা মুছে ফেলুন' : 'Delete Officer'}
        description={delTarget ? `${delTarget.name_bn} ${bn ? 'কে মুছে ফেলতে চান?' : 'will be removed.'}` : ''}
        isPending={softDelete.isPending}
      />
    </AdminLayout>
  );
};

export default AdminAdministrative;
