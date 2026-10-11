import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, ShieldCheck, Building2, Phone, Mail, Power, PowerOff, Settings2, Check, X, UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import PhotoUpload from '@/components/PhotoUpload';
import { format } from 'date-fns';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useConfirm } from "@/contexts/ConfirmContext";
import PasswordStrengthMeter, { isPasswordStrongAgainst, firstFailedRuleMessage, usePasswordPolicy } from '@/components/PasswordStrengthMeter';

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
  user_id: string | null;
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
  const confirm = useConfirm();
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
  const [manageOpen, setManageOpen] = useState(false);
  const [manageTab, setManageTab] = useState<'department' | 'designation'>('department');
  const [editRow, setEditRow] = useState<{ id: string; name_bn: string; name: string; code?: string } | null>(null);
  const [newRow, setNewRow] = useState<{ name_bn: string; name: string; code: string }>({ name_bn: '', name: '', code: '' });

  // Account creation
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null);
  const [accEmail, setAccEmail] = useState('');
  const [accPassword, setAccPassword] = useState('');
  const [accRole, setAccRole] = useState('administrative');
  const [accCreating, setAccCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordPolicy = usePasswordPolicy();

  const openAccountDialog = (o: Officer) => {
    setSelectedOfficer(o);
    setAccEmail(o.email || '');
    setAccPassword('');
    setAccRole('administrative');
    setShowPassword(false);
    setAccountDialogOpen(true);
  };

  const handleCreateAccount = async () => {
    if (!accEmail.trim()) { toast.error(bn ? 'ইমেইল দিন' : 'Enter email'); return; }
    if (!isPasswordStrongAgainst(accPassword, passwordPolicy)) {
      toast.error(firstFailedRuleMessage(accPassword, passwordPolicy, bn) || (bn ? 'পাসওয়ার্ড নীতিমালা পূরণ করছে না' : 'Password policy not met'));
      return;
    }
    setAccCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          email: accEmail.trim(),
          password: accPassword,
          role: accRole === 'none' ? undefined : accRole,
          full_name: selectedOfficer?.name_bn || selectedOfficer?.name_en || '',
          officer_id: selectedOfficer?.id,
        },
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || (bn ? 'অ্যাকাউন্ট তৈরি ব্যর্থ' : 'Failed to create account'));
        setAccCreating(false);
        return;
      }
      toast.success(bn ? '✅ অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!' : '✅ Account created!');
      setAccountDialogOpen(false);
      qc.invalidateQueries({ queryKey: ['administrative-officers'] });
    } catch {
      toast.error(bn ? 'অ্যাকাউন্ট তৈরি ব্যর্থ' : 'Failed to create account');
    }
    setAccCreating(false);
  };
  // Inline error state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>('');
  const [quickAddError, setQuickAddError] = useState<{ field?: 'name_bn' | 'name_en'; message: string } | null>(null);
  const [manageNewError, setManageNewError] = useState<{ field?: 'name_bn' | 'name' | 'code'; message: string } | null>(null);
  const [manageEditError, setManageEditError] = useState<{ field?: 'name_bn' | 'name' | 'code'; message: string } | null>(null);

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const { [field]: _, ...rest } = prev;
      return rest;
    });
    if (formError) setFormError('');
  };

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
        .select('id, name, name_bn, code')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name_bn', { ascending: true });
      if (error) throw error;
      return ((data || []) as unknown) as Array<{ id: string; name: string; name_bn: string; code?: string | null }>;
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
    onError: (e: any) => {
      const parsed = parseBackendError(e);
      const f = parsed.field === 'name' ? 'name_en' : parsed.field === 'name_bn' ? 'name_bn' : undefined;
      setQuickAddError({ field: f as any, message: parsed.message });
      toast.error(parsed.message);
    },
  });

  const updateOption = useMutation({
    mutationFn: async (payload: { kind: 'department' | 'designation'; id: string; name_bn: string; name: string; code?: string }) => {
      const name_bn = payload.name_bn.trim();
      const name = (payload.name || name_bn).trim();
      if (!name_bn) throw new Error(bn ? 'বাংলা নাম দিন' : 'Bengali name required');
      if (payload.kind === 'department') {
        const code = (payload.code || '').trim().toUpperCase();
        if (!code) throw new Error('REQUIRED_FIELD: ' + (bn ? 'বিভাগের কোড আবশ্যক।' : 'Department code is required.'));
        const { error } = await supabase.from('administrative_departments' as any).update({ name_bn, name, code }).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('designations').update({ name_bn, name }).eq('id', payload.id);
        if (error) throw error;
      }
      return payload.kind;
    },
    onSuccess: (kind) => {
      toast.success(bn ? 'হালনাগাদ হয়েছে' : 'Updated');
      qc.invalidateQueries({ queryKey: [kind === 'department' ? 'administrative-departments' : 'administrative-designations'] });
      setEditRow(null);
    },
    onError: (e: any) => {
      const parsed = parseBackendError(e);
      setManageEditError({ field: parsed.field as any, message: parsed.message });
      toast.error(parsed.message);
    },
  });

  const deleteOption = useMutation({
    mutationFn: async (payload: { kind: 'department' | 'designation'; id: string }) => {
      const table = payload.kind === 'department' ? 'administrative_departments' : 'designations';
      // soft-delete via deleted_at if exists, else is_active=false
      const { error } = await supabase
        .from(table as any)
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', payload.id);
      if (error) {
        // fallback: try just is_active
        const { error: e2 } = await supabase.from(table as any).update({ is_active: false }).eq('id', payload.id);
        if (e2) throw e2;
      }
      return payload.kind;
    },
    onSuccess: (kind) => {
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Removed');
      qc.invalidateQueries({ queryKey: [kind === 'department' ? 'administrative-departments' : 'administrative-designations'] });
    },
    onError: (e: any) => toast.error(parseBackendError(e).message),
  });

  const addInline = useMutation({
    mutationFn: async (payload: { kind: 'department' | 'designation'; name_bn: string; name: string; code?: string }) => {
      const name_bn = payload.name_bn.trim();
      const name = (payload.name || name_bn).trim();
      if (!name_bn) throw new Error(bn ? 'বাংলা নাম দিন' : 'Bengali name required');
      if (payload.kind === 'department') {
        const code = (payload.code || '').trim().toUpperCase();
        if (!code) throw new Error('REQUIRED_FIELD: ' + (bn ? 'বিভাগের কোড আবশ্যক।' : 'Department code is required.'));
        const { error } = await supabase.from('administrative_departments' as any).insert({ name, name_bn, code, is_active: true });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('designations').insert({ name, name_bn, staff_category: 'administrative', is_active: true });
        if (error) throw error;
      }
      return payload.kind;
    },
    onSuccess: (kind) => {
      toast.success(bn ? 'যোগ করা হয়েছে' : 'Added');
      qc.invalidateQueries({ queryKey: [kind === 'department' ? 'administrative-departments' : 'administrative-designations'] });
      setNewRow({ name_bn: '', name: '', code: '' });
    },
    onError: (e: any) => {
      const parsed = parseBackendError(e);
      setManageNewError({ field: parsed.field as any, message: parsed.message });
      toast.error(parsed.message);
    },
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

  // Map backend errors (from triggers / RLS / constraints) to {field, message}.
  // Used by both officer form and department/designation dialogs.
  type ParsedErr = { field?: string; message: string };
  const parseBackendError = (e: any): ParsedErr => {
    const raw = String(e?.message || e?.error_description || e || '');
    const msg = raw.toUpperCase();

    // ---- Joining date required ----
    if (msg.includes('JOINING_DATE_REQUIRED')) {
      return { field: 'joining_date', message: bn ? 'যোগদানের তারিখ দিন' : 'Joining date is required' };
    }
    if (msg.includes('JOINING_DATE_FUTURE')) {
      return { field: 'joining_date', message: bn ? 'যোগদানের তারিখ ভবিষ্যতের হতে পারে না — সঠিক তারিখ দিন' : 'Joining date cannot be in the future' };
    }

    // ---- Officer field-level violations ----
    if (msg.includes('DUPLICATE_PHONE') || raw.includes('uq_admin_officers_phone') || raw.includes('uq_staff_phone')) {
      return { field: 'phone', message: bn ? 'এই ফোন নম্বর ইতিমধ্যে ব্যবহৃত হয়েছে।' : 'This phone number is already in use.' };
    }
    if (msg.includes('DUPLICATE_EMAIL') || raw.includes('uq_admin_officers_email') || raw.includes('uq_staff_email')) {
      return { field: 'email', message: bn ? 'এই ইমেইল ইতিমধ্যে ব্যবহৃত হয়েছে।' : 'This email is already in use.' };
    }
    if (msg.includes('DUPLICATE_NID')) {
      return { field: 'nid', message: bn ? 'এই এনআইডি ইতিমধ্যে ব্যবহৃত হয়েছে।' : 'This NID is already in use.' };
    }
    if (msg.includes('DUPLICATE_USER')) {
      return { message: bn ? 'এই ইউজার ইতিমধ্যে অন্য তালিকায় আছেন।' : 'This user is already registered elsewhere.' };
    }
    if (msg.includes('CROSS_TABLE_DUPLICATE')) {
      // Pick most likely field based on words in the original raw message
      if (/phone|ফোন/i.test(raw)) return { field: 'phone', message: bn ? 'এই ফোন নম্বর ইতিমধ্যে স্টাফ/প্রশাসনিক তালিকায় আছে।' : 'Phone already exists in staff/admin list.' };
      if (/email|ইমেইল/i.test(raw)) return { field: 'email', message: bn ? 'এই ইমেইল ইতিমধ্যে স্টাফ/প্রশাসনিক তালিকায় আছে।' : 'Email already exists in staff/admin list.' };
      if (/nid|এনআইডি/i.test(raw)) return { field: 'nid', message: bn ? 'এই এনআইডি ইতিমধ্যে স্টাফ/প্রশাসনিক তালিকায় আছে।' : 'NID already exists in staff/admin list.' };
      return { message: bn ? 'এই তথ্য ইতিমধ্যে স্টাফ/প্রশাসনিক তালিকায় আছে।' : 'Record already exists in staff/admin list.' };
    }
    if (msg.includes('INVALID_PHONE')) {
      return { field: 'phone', message: bn ? 'সঠিক ১১-সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন (01XXXXXXXXX)।' : 'Enter a valid 11-digit Bangladesh mobile (01XXXXXXXXX).' };
    }
    if (msg.includes('INVALID_EMAIL')) {
      return { field: 'email', message: bn ? 'সঠিক ইমেইল ঠিকানা দিন।' : 'Enter a valid email address.' };
    }
    if (msg.includes('INVALID_NID')) {
      return { field: 'nid', message: bn ? 'সঠিক এনআইডি দিন (১০, ১৩ অথবা ১৭ সংখ্যা)।' : 'NID must be 10, 13, or 17 digits.' };
    }
    if (msg.includes('INVALID_DEPARTMENT')) {
      return { field: 'department', message: bn ? 'নির্বাচিত বিভাগটি সক্রিয় বিভাগ তালিকায় নেই।' : 'Selected department does not exist in the active list.' };
    }
    if (msg.includes('REQUIRED_NAME_BN') || msg.includes('NAME_BN_REQUIRED')) {
      return { field: 'name_bn', message: bn ? 'বাংলা নাম আবশ্যক।' : 'Bangla name is required.' };
    }
    if (msg.includes('REQUIRED_NAME') || msg.includes('NAME_REQUIRED')) {
      return { field: 'name', message: bn ? 'ইংরেজি নাম আবশ্যক।' : 'English name is required.' };
    }
    if (msg.includes('DUPLICATE_DEPT_NAME') || msg.includes('DUPLICATE_DEPARTMENT_NAME') || raw.includes('uq_admin_departments_name')) {
      return { field: 'name', message: bn ? 'এই নামের একটি বিভাগ ইতিমধ্যে আছে।' : 'A department with this name already exists.' };
    }
    if (msg.includes('DUPLICATE_DEPT_NAME_BN') || raw.includes('uq_admin_departments_name_bn')) {
      return { field: 'name_bn', message: bn ? 'এই বাংলা নামের একটি বিভাগ ইতিমধ্যে আছে।' : 'A department with this Bangla name already exists.' };
    }
    if (msg.includes('DUPLICATE_DEPT_CODE') || raw.includes('uq_admin_dept_code_active')) {
      return { field: 'code', message: bn ? 'এই কোডের একটি বিভাগ ইতিমধ্যে আছে।' : 'A department with this code already exists.' };
    }
    if (msg.includes('INVALID_DEPT_CODE')) {
      return { field: 'code', message: bn ? 'কোড ২-১০ অক্ষরের ইংরেজি অক্ষর/সংখ্যা হতে হবে (যেমন: ACC, IT01)।' : 'Code must be 2–10 letters/digits (A–Z, 0–9).' };
    }
    if (msg.includes('REQUIRED_FIELD') && /কোড|code/i.test(raw)) {
      return { field: 'code', message: bn ? 'বিভাগের কোড আবশ্যক।' : 'Department code is required.' };
    }

    // ---- Permission / RLS ----
    if (msg.includes('PERMISSION_DENIED') || raw.toLowerCase().includes('row-level security') || raw.toLowerCase().includes('permission')) {
      return { message: bn ? 'এই কাজটি করার অনুমতি আপনার নেই।' : 'You do not have permission to perform this action.' };
    }

    // Strip leading SQL prefixes like "DUPLICATE_PHONE: " for cleaner display
    const cleaned = raw.replace(/^[A-Z_]+:\s*/, '').trim();
    return { message: cleaned || (bn ? 'একটি ত্রুটি ঘটেছে' : 'An error occurred') };
  };

  // Convenience: surface any backend error onto the officer form. Returns
  // true when the error was attached to a specific field.
  const applyOfficerError = (e: any): boolean => {
    const parsed = parseBackendError(e);
    if (parsed.field) {
      setFieldErrors(prev => ({ ...prev, [parsed.field!]: parsed.message }));
      setFormError('');
      toast.error(parsed.message);
      return true;
    }
    setFormError(parsed.message);
    toast.error(parsed.message);
    return false;
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
      setFieldErrors({});
      setFormError('');
    },
    onError: (e: any) => applyOfficerError(e),
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
    onError: (e: any) => toast.error(parseBackendError(e).message),
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
    onError: (e: any) => toast.error(parseBackendError(e).message),
  });

  // Client-side pre-validation that mirrors the backend triggers, so users
  // see inline messages immediately without a round-trip.
  const validateOfficerForm = (): boolean => {
    const errs: Record<string, string> = {};
    const f = form;
    if (!f.name_bn || !String(f.name_bn).trim()) {
      errs.name_bn = bn ? 'বাংলা নাম আবশ্যক।' : 'Bangla name is required.';
    }
    if (f.phone) {
      const digits = String(f.phone).replace(/[^0-9]/g, '');
      if (!/^01[3-9][0-9]{8}$/.test(digits)) {
        errs.phone = bn ? 'সঠিক ১১-সংখ্যার মোবাইল নম্বর দিন (01XXXXXXXXX)।' : 'Enter a valid 11-digit mobile (01XXXXXXXXX).';
      }
    }
    if (f.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(f.email))) {
        errs.email = bn ? 'সঠিক ইমেইল ঠিকানা দিন।' : 'Enter a valid email address.';
      }
    }
    if (f.nid) {
      const nd = String(f.nid).replace(/[^0-9]/g, '');
      if (![10, 13, 17].includes(nd.length)) {
        errs.nid = bn ? 'এনআইডি ১০, ১৩ অথবা ১৭ সংখ্যা হতে হবে।' : 'NID must be 10, 13, or 17 digits.';
      }
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setFormError(bn ? 'অনুগ্রহ করে নিচের ভুলগুলো ঠিক করুন।' : 'Please fix the errors below.');
      return false;
    }
    setFormError('');
    return true;
  };

  const handleSaveOfficer = () => {
    if (!validateOfficerForm()) return;
    upsert.mutate(form);
  };

  const openAdd = () => { setEditing(null); setForm(emptyForm); setFieldErrors({}); setFormError(''); setOpen(true); };
  const openEdit = (o: Officer) => {
    setEditing(o);
    setForm({ ...o });
    setFieldErrors({});
    setFormError('');
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
            {canEditItem && (
              <Button variant="outline" onClick={() => setManageOpen(true)} className="gap-2">
                <Settings2 className="w-4 h-4" />
                {bn ? 'বিভাগ ও পদবি' : 'Departments & Designations'}
              </Button>
            )}
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
                      {o.user_id ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 inline-flex items-center gap-1">
                          <Check className="w-3 h-3" /> {bn ? 'আইডি আছে' : 'Account linked'}
                        </span>
                      ) : (
                        <button
                          onClick={() => openAccountDialog(o)}
                          className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 inline-flex items-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" /> {bn ? 'অ্যাকাউন্ট তৈরি' : 'Create Account'}
                        </button>
                      )}
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
                        onClick={async () => { const cur = (o.status || 'active'); const next = cur === 'active' ? 'inactive' : 'active'; const ok = await confirm({ title: bn ? (next === 'active' ? 'অফিসার সক্রিয় করবেন?' : 'অফিসার নিষ্ক্রিয় করবেন?') : (next === 'active' ? 'Activate officer?' : 'Deactivate officer?'), description: bn ? `"${o.name_bn || o.name_en}" কে ${next === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করতে চান?` : `Are you sure you want to ${next === 'active' ? 'activate' : 'deactivate'} "${o.name_en || o.name_bn}"?`, confirmText: bn ? 'হ্যাঁ' : 'Yes', cancelText: bn ? 'বাতিল' : 'Cancel', variant: next === 'active' ? 'default' : 'warning' }); if (!ok) return; toggleStatus.mutate(o); }}
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
                  <Label className={fieldErrors.name_bn ? 'text-destructive' : ''}>
                    {bn ? 'নাম (বাংলা) *' : 'Name (Bangla) *'}
                  </Label>
                  <Input
                    value={form.name_bn || ''}
                    onChange={e => { setForm({ ...form, name_bn: e.target.value }); clearFieldError('name_bn'); }}
                    required
                    aria-invalid={!!fieldErrors.name_bn}
                    className={fieldErrors.name_bn ? 'border-destructive ring-1 ring-destructive/30' : ''}
                  />
                  {fieldErrors.name_bn && <p className="text-xs text-destructive mt-1">{fieldErrors.name_bn}</p>}
                </div>
                <div>
                  <Label>{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</Label>
                  <Input value={form.name_en || ''} onChange={e => setForm({ ...form, name_en: e.target.value })} />
                </div>
                <div>
                  <Label>
                    {bn ? 'কর্মকর্তা আইডি' : 'Officer ID'}
                    {!editing && <span className="ml-1 text-xs text-emerald-600">{bn ? '(অটো)' : '(auto)'}</span>}
                  </Label>
                  <Input
                    value={form.officer_id || ''}
                    onChange={e => setForm({ ...form, officer_id: e.target.value })}
                    placeholder={editing ? 'ADO-2026-0001' : (bn ? 'সংরক্ষণ করলে স্বয়ংক্রিয়ভাবে তৈরি হবে' : 'Auto-generated on save')}
                    disabled={!editing}
                  />
                </div>
                <div>
                  <Label className={fieldErrors.nid ? 'text-destructive' : ''}>{bn ? 'NID' : 'NID'}</Label>
                  <Input
                    value={form.nid || ''}
                    onChange={e => { setForm({ ...form, nid: e.target.value }); clearFieldError('nid'); }}
                    aria-invalid={!!fieldErrors.nid}
                    className={fieldErrors.nid ? 'border-destructive ring-1 ring-destructive/30' : ''}
                  />
                  {fieldErrors.nid && <p className="text-xs text-destructive mt-1">{fieldErrors.nid}</p>}
                </div>
                <div>
                  <Label className="mb-1 block">{bn ? 'জন্মতারিখ' : 'Date of Birth'}</Label>
                  <DatePicker value={form.date_of_birth || ''} onChange={v => setForm({ ...form, date_of_birth: v })} bengali={bn} clearable fromYear={1940} toYear={2026} />
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
                  <Label className={fieldErrors.phone ? 'text-destructive' : ''}>{bn ? 'ফোন' : 'Phone'}</Label>
                  <Input
                    value={form.phone || ''}
                    onChange={e => { setForm({ ...form, phone: e.target.value }); clearFieldError('phone'); }}
                    placeholder="01XXXXXXXXX"
                    aria-invalid={!!fieldErrors.phone}
                    className={fieldErrors.phone ? 'border-destructive ring-1 ring-destructive/30' : ''}
                  />
                  {fieldErrors.phone && <p className="text-xs text-destructive mt-1">{fieldErrors.phone}</p>}
                </div>
                <div>
                  <Label className={fieldErrors.email ? 'text-destructive' : ''}>{bn ? 'ইমেইল' : 'Email'}</Label>
                  <Input
                    type="email"
                    value={form.email || ''}
                    onChange={e => { setForm({ ...form, email: e.target.value }); clearFieldError('email'); }}
                    aria-invalid={!!fieldErrors.email}
                    className={fieldErrors.email ? 'border-destructive ring-1 ring-destructive/30' : ''}
                  />
                  {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
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
                  <div className="flex items-center justify-between">
                    <Label>{bn ? 'পদবী' : 'Designation'}</Label>
                    <button
                      type="button"
                      onClick={() => setQuickAdd({ kind: 'designation', name_bn: '', name_en: '' })}
                      className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />{bn ? 'নতুন' : 'New'}
                    </button>
                  </div>
                  <Select value={form.designation || ''} onValueChange={v => setForm({ ...form, designation: v })}>
                    <SelectTrigger><SelectValue placeholder={bn ? 'পদবী নির্বাচন' : 'Select designation'} /></SelectTrigger>
                    <SelectContent>
                      {designations.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">{bn ? 'কোনো পদবী নেই — "নতুন" ক্লিক করুন' : 'No designations — click "New"'}</div>
                      )}
                      {designations.map(d => (
                        <SelectItem key={d.id} value={d.name_bn}>{bn ? d.name_bn : (d.name || d.name_bn)}</SelectItem>
                      ))}
                      {form.designation && !designations.some(d => d.name_bn === form.designation) && (
                        <SelectItem value={form.designation}>{form.designation} {bn ? '(কাস্টম)' : '(custom)'}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className={fieldErrors.department ? 'text-destructive' : ''}>{bn ? 'বিভাগ' : 'Department'}</Label>
                    <button
                      type="button"
                      onClick={() => setQuickAdd({ kind: 'department', name_bn: '', name_en: '' })}
                      className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />{bn ? 'নতুন' : 'New'}
                    </button>
                  </div>
                  <Select value={form.department || ''} onValueChange={v => { setForm({ ...form, department: v }); clearFieldError('department'); }}>
                    <SelectTrigger className={fieldErrors.department ? 'border-destructive ring-1 ring-destructive/30' : ''}>
                      <SelectValue placeholder={bn ? 'বিভাগ নির্বাচন' : 'Select department'} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">{bn ? 'কোনো বিভাগ নেই — "নতুন" ক্লিক করুন' : 'No departments — click "New"'}</div>
                      )}
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.name_bn}>{bn ? d.name_bn : (d.name || d.name_bn)}</SelectItem>
                      ))}
                      {form.department && !departments.some(d => d.name_bn === form.department) && (
                        <SelectItem value={form.department}>{form.department} {bn ? '(কাস্টম)' : '(custom)'}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {fieldErrors.department && <p className="text-xs text-destructive mt-1">{fieldErrors.department}</p>}
                </div>
                <div>
                  <Label>{bn ? 'অফিস কক্ষ' : 'Office Room'}</Label>
                  <Input value={form.office_room || ''} onChange={e => setForm({ ...form, office_room: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-1 block">{bn ? 'যোগদান তারিখ' : 'Joining Date'}</Label>
                  <DatePicker value={form.joining_date || ''} onChange={v => setForm({ ...form, joining_date: v })} bengali={bn} clearable fromYear={1970} toYear={2035} />
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
                  <TimePicker value={form.duty_start_time || ''} placeholder={bn ? 'ডিউটি শুরু' : 'Duty start'} onChange={v => setForm({ ...form, duty_start_time: v })} />
                </div>
                <div>
                  <Label>{bn ? 'ডিউটি শেষ' : 'Duty End'}</Label>
                  <TimePicker value={form.duty_end_time || ''} placeholder={bn ? 'ডিউটি শেষ' : 'Duty end'} onChange={v => setForm({ ...form, duty_end_time: v })} />
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
                  <Input type="number" value={form.salary ?? ''} onChange={e => setForm({ ...form, salary: Number(e.target.value) })} />
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

          {(formError || Object.keys(fieldErrors).length > 0) && (
            <div className="mt-2 px-4 py-2 rounded-[14px] bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              {formError || (bn ? 'নিচে চিহ্নিত ফিল্ডগুলো ঠিক করুন।' : 'Please fix the highlighted fields below.')}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={handleSaveOfficer} disabled={!form.name_bn || upsert.isPending}>
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

      {/* Quick Add: Department / Designation */}
      <Dialog open={!!quickAdd} onOpenChange={(o) => { if (!o) { setQuickAdd(null); setQuickAddError(null); } }}>
        <DialogContent className="max-w-md rounded-[38px]">
          <DialogHeader>
            <DialogTitle>
              {quickAdd?.kind === 'department'
                ? (bn ? 'নতুন বিভাগ যোগ করুন' : 'Add New Department')
                : (bn ? 'নতুন পদবী যোগ করুন' : 'Add New Designation')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className={quickAddError?.field === 'name_bn' ? 'text-destructive' : ''}>
                {bn ? 'বাংলা নাম *' : 'Bangla Name *'}
              </Label>
              <Input
                autoFocus
                value={quickAdd?.name_bn || ''}
                onChange={(e) => { setQuickAdd(q => q ? { ...q, name_bn: e.target.value } : q); if (quickAddError) setQuickAddError(null); }}
                placeholder={quickAdd?.kind === 'department' ? (bn ? 'যেমনঃ হিসাব শাখা' : 'e.g. Accounts') : (bn ? 'যেমনঃ অফিস সহকারী' : 'e.g. Office Assistant')}
                aria-invalid={quickAddError?.field === 'name_bn'}
                className={quickAddError?.field === 'name_bn' ? 'border-destructive ring-1 ring-destructive/30' : ''}
              />
              {quickAddError?.field === 'name_bn' && <p className="text-xs text-destructive mt-1">{quickAddError.message}</p>}
            </div>
            <div>
              <Label className={quickAddError?.field === 'name_en' ? 'text-destructive' : ''}>
                {bn ? 'ইংরেজি নাম' : 'English Name'}
              </Label>
              <Input
                value={quickAdd?.name_en || ''}
                onChange={(e) => { setQuickAdd(q => q ? { ...q, name_en: e.target.value } : q); if (quickAddError) setQuickAddError(null); }}
                placeholder={quickAdd?.kind === 'department' ? 'e.g. Accounts' : 'e.g. Office Assistant'}
                aria-invalid={quickAddError?.field === 'name_en'}
                className={quickAddError?.field === 'name_en' ? 'border-destructive ring-1 ring-destructive/30' : ''}
              />
              {quickAddError?.field === 'name_en' && <p className="text-xs text-destructive mt-1">{quickAddError.message}</p>}
            </div>
            {quickAddError && !quickAddError.field && (
              <div className="px-3 py-2 rounded-[14px] bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                {quickAddError.message}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setQuickAdd(null); setQuickAddError(null); }}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button
              onClick={() => {
                if (!quickAdd) return;
                setQuickAddError(null);
                if (!quickAdd.name_bn?.trim()) {
                  setQuickAddError({ field: 'name_bn', message: bn ? 'বাংলা নাম আবশ্যক।' : 'Bangla name is required.' });
                  return;
                }
                createOption.mutate(quickAdd);
              }}
              disabled={!quickAdd?.name_bn?.trim() || createOption.isPending}
            >
              {createOption.isPending ? (bn ? 'যোগ হচ্ছে...' : 'Adding...') : (bn ? 'যোগ করুন' : 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Departments & Designations */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[38px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-emerald-600" />
              {bn ? 'বিভাগ ও পদবি ব্যবস্থাপনা' : 'Manage Departments & Designations'}
            </DialogTitle>
          </DialogHeader>
          <Tabs value={manageTab} onValueChange={(v) => { setManageTab(v as any); setEditRow(null); setNewRow({ name_bn: '', name: '', code: '' }); }}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="department">{bn ? 'বিভাগসমূহ' : 'Departments'} ({departments.length})</TabsTrigger>
              <TabsTrigger value="designation">{bn ? 'পদবিসমূহ' : 'Designations'} ({designations.length})</TabsTrigger>
            </TabsList>

            {(['department','designation'] as const).map((kind) => (
              <TabsContent key={kind} value={kind} className="space-y-3 mt-3">
                {/* Add new row */}
                <div className="space-y-2">
                  <div className={`grid grid-cols-1 ${kind === 'department' ? 'md:grid-cols-[1fr_1fr_140px_auto]' : 'md:grid-cols-[1fr_1fr_auto]'} gap-2 p-3 rounded-[20px] bg-muted/30 border`}>
                    <div>
                      <Input
                        placeholder={bn ? 'বাংলা নাম *' : 'Bangla name *'}
                        value={newRow.name_bn}
                        onChange={(e) => { setNewRow({ ...newRow, name_bn: e.target.value }); if (manageNewError) setManageNewError(null); }}
                        aria-invalid={manageNewError?.field === 'name_bn'}
                        className={manageNewError?.field === 'name_bn' ? 'border-destructive ring-1 ring-destructive/30' : ''}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder={bn ? 'ইংরেজি নাম' : 'English name'}
                        value={newRow.name}
                        onChange={(e) => { setNewRow({ ...newRow, name: e.target.value }); if (manageNewError) setManageNewError(null); }}
                        aria-invalid={manageNewError?.field === 'name'}
                        className={manageNewError?.field === 'name' ? 'border-destructive ring-1 ring-destructive/30' : ''}
                      />
                    </div>
                    {kind === 'department' && (
                      <div>
                        <Input
                          placeholder={bn ? 'কোড * (যেমন ACC)' : 'Code * (e.g. ACC)'}
                          value={newRow.code}
                          maxLength={10}
                          onChange={(e) => { setNewRow({ ...newRow, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }); if (manageNewError) setManageNewError(null); }}
                          aria-invalid={manageNewError?.field === 'code'}
                          className={`uppercase tracking-wider ${manageNewError?.field === 'code' ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
                        />
                      </div>
                    )}
                    <Button
                      onClick={() => {
                        setManageNewError(null);
                        if (!newRow.name_bn.trim()) {
                          setManageNewError({ field: 'name_bn', message: bn ? 'বাংলা নাম আবশ্যক।' : 'Bangla name is required.' });
                          return;
                        }
                        if (kind === 'department') {
                          if (!newRow.code.trim()) {
                            setManageNewError({ field: 'code', message: bn ? 'বিভাগের কোড আবশ্যক।' : 'Department code is required.' });
                            return;
                          }
                          if (!/^[A-Z0-9]{2,10}$/.test(newRow.code.trim())) {
                            setManageNewError({ field: 'code', message: bn ? 'কোড ২-১০ অক্ষরের ইংরেজি অক্ষর/সংখ্যা হতে হবে।' : 'Code must be 2–10 letters/digits (A–Z, 0–9).' });
                            return;
                          }
                        }
                        addInline.mutate({ kind, name_bn: newRow.name_bn, name: newRow.name, code: newRow.code });
                      }}
                      disabled={!newRow.name_bn.trim() || (kind === 'department' && !newRow.code.trim()) || addInline.isPending}
                      className="gap-1"
                    >
                      <Plus className="w-4 h-4" />{bn ? 'যোগ' : 'Add'}
                    </Button>
                  </div>
                  {manageNewError && (
                    <p className="text-xs text-destructive px-1">{manageNewError.message}</p>
                  )}
                </div>

                {/* List */}
                <div className="divide-y border rounded-[20px] overflow-hidden">
                  {(kind === 'department' ? departments : designations).length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      {bn ? 'কোনো এন্ট্রি নেই' : 'No entries'}
                    </div>
                  ) : (
                    (kind === 'department' ? departments : designations).map((row: any) => {
                      const isEditing = editRow?.id === row.id;
                      return (
                        <div key={row.id} className={`p-3 hover:bg-muted/20 ${isEditing && manageEditError ? 'bg-destructive/5' : ''}`}>
                          <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <Input
                                className={`flex-1 ${manageEditError?.field === 'name_bn' ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
                                value={editRow!.name_bn}
                                onChange={(e) => { setEditRow({ ...editRow!, name_bn: e.target.value }); if (manageEditError) setManageEditError(null); }}
                                placeholder={bn ? 'বাংলা নাম' : 'Bangla'}
                                aria-invalid={manageEditError?.field === 'name_bn'}
                              />
                              <Input
                                className={`flex-1 ${manageEditError?.field === 'name' ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
                                value={editRow!.name}
                                onChange={(e) => { setEditRow({ ...editRow!, name: e.target.value }); if (manageEditError) setManageEditError(null); }}
                                placeholder={bn ? 'ইংরেজি নাম' : 'English'}
                                aria-invalid={manageEditError?.field === 'name'}
                              />
                              {kind === 'department' && (
                                <Input
                                  className={`w-28 uppercase tracking-wider ${manageEditError?.field === 'code' ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
                                  value={editRow!.code || ''}
                                  maxLength={10}
                                  onChange={(e) => { setEditRow({ ...editRow!, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }); if (manageEditError) setManageEditError(null); }}
                                  placeholder={bn ? 'কোড *' : 'Code *'}
                                  aria-invalid={manageEditError?.field === 'code'}
                                />
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-full text-emerald-600"
                                onClick={() => {
                                  setManageEditError(null);
                                  if (!editRow!.name_bn.trim()) {
                                    setManageEditError({ field: 'name_bn', message: bn ? 'বাংলা নাম আবশ্যক।' : 'Bangla name is required.' });
                                    return;
                                  }
                                  if (kind === 'department') {
                                    const c = (editRow!.code || '').trim();
                                    if (!c) {
                                      setManageEditError({ field: 'code', message: bn ? 'বিভাগের কোড আবশ্যক।' : 'Department code is required.' });
                                      return;
                                    }
                                    if (!/^[A-Z0-9]{2,10}$/.test(c)) {
                                      setManageEditError({ field: 'code', message: bn ? 'কোড ২-১০ অক্ষরের ইংরেজি অক্ষর/সংখ্যা হতে হবে।' : 'Code must be 2–10 letters/digits (A–Z, 0–9).' });
                                      return;
                                    }
                                  }
                                  updateOption.mutate({ kind, id: editRow!.id, name_bn: editRow!.name_bn, name: editRow!.name, code: editRow!.code });
                                }}
                                disabled={updateOption.isPending}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="rounded-full" onClick={() => { setEditRow(null); setManageEditError(null); }}>
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="flex-1">
                                <div className="font-medium text-sm flex items-center gap-2">
                                  {row.name_bn}
                                  {kind === 'department' && row.code && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono tracking-wider border border-emerald-200/50 dark:border-emerald-700/50">
                                      {row.code}
                                    </span>
                                  )}
                                </div>
                                {row.name && row.name !== row.name_bn && (
                                  <div className="text-xs text-muted-foreground">{row.name}</div>
                                )}
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-full"
                                onClick={() => setEditRow({ id: row.id, name_bn: row.name_bn, name: row.name || '', code: row.code || '' })}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-full text-destructive"
                                onClick={async () => {
                                  if ((await confirm({ description: bn ? 'মুছে ফেলতে চান?' : 'Delete this entry?', variant: 'destructive' }))) {
                                    deleteOption.mutate({ kind, id: row.id });
                                  }
                                }}
                                disabled={deleteOption.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          </div>
                          {isEditing && manageEditError && (
                            <p className="text-xs text-destructive mt-1 px-1">{manageEditError.message}</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageOpen(false)}>{bn ? 'বন্ধ করুন' : 'Close'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Creation Dialog */}
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[32px]">
          <DialogHeader>
            <DialogTitle>{bn ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {bn ? `কর্মকর্তা: ${selectedOfficer?.name_bn || ''}` : `Officer: ${selectedOfficer?.name_en || selectedOfficer?.name_bn || ''}`}
            </p>
            <div className="space-y-2">
              <Label>{bn ? 'ইমেইল' : 'Email'}</Label>
              <Input type="email" value={accEmail} onChange={e => setAccEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label>{bn ? 'পাসওয়ার্ড' : 'Password'}</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={accPassword} onChange={e => setAccPassword(e.target.value)} placeholder={bn ? 'নতুন পাসওয়ার্ড' : 'New password'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrengthMeter password={accPassword} bn={bn} />
            </div>
            <div className="space-y-2">
              <Label>{bn ? 'রোল' : 'Role'}</Label>
              <Select value={accRole} onValueChange={setAccRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{bn ? 'রোল ছাড়া' : 'No Role'}</SelectItem>
                  <SelectItem value="administrative">{bn ? 'প্রশাসনিক' : 'Administrative'}</SelectItem>
                  <SelectItem value="staff">{bn ? 'স্টাফ' : 'Staff'}</SelectItem>
                  <SelectItem value="admin">{bn ? 'অ্যাডমিন' : 'Admin'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateAccount} disabled={accCreating} className="w-full">
              {accCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              {bn ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminAdministrative;
