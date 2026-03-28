import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus, Edit2, Trash2, GripVertical, Eye, Copy,
  Type, Hash, ListOrdered, CheckSquare, CircleDot,
  Upload, Calendar, ToggleLeft, FileText, ArrowUp, ArrowDown
} from 'lucide-react';

const FORM_TYPES = [
  { value: 'custom', label: 'Custom Form', label_bn: 'কাস্টম ফর্ম' },
  { value: 'admission', label: 'Admission Form', label_bn: 'ভর্তি ফর্ম' },
  { value: 'fee', label: 'Fee Form', label_bn: 'ফি ফর্ম' },
  { value: 'joining', label: 'Joining Letter', label_bn: 'জয়েনিং পত্র' },
  { value: 'resign', label: 'Resign Letter', label_bn: 'পদত্যাগ পত্র' },
  { value: 'expense', label: 'Expense Management', label_bn: 'খরচ ব্যবস্থাপনা' },
  { value: 'salary', label: 'Salary Management', label_bn: 'বেতন ব্যবস্থাপনা' },
  { value: 'attendance', label: 'Attendance Management', label_bn: 'উপস্থিতি ব্যবস্থাপনা' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text Box', label_bn: 'টেক্সট বক্স', icon: Type },
  { value: 'number', label: 'Number Box', label_bn: 'নম্বর বক্স', icon: Hash },
  { value: 'textarea', label: 'Text Area', label_bn: 'টেক্সট এরিয়া', icon: FileText },
  { value: 'select', label: 'Dropdown', label_bn: 'ড্রপডাউন', icon: ListOrdered },
  { value: 'radio', label: 'Radio Button', label_bn: 'রেডিও বাটন', icon: CircleDot },
  { value: 'checkbox', label: 'Checkbox', label_bn: 'চেকবক্স', icon: CheckSquare },
  { value: 'file', label: 'Photo/File Upload', label_bn: 'ফটো/ফাইল আপলোড', icon: Upload },
  { value: 'date', label: 'Date Picker', label_bn: 'তারিখ', icon: Calendar },
  { value: 'switch', label: 'Toggle Switch', label_bn: 'টগল সুইচ', icon: ToggleLeft },
  { value: 'email', label: 'Email', label_bn: 'ইমেইল', icon: Type },
  { value: 'phone', label: 'Phone', label_bn: 'ফোন নম্বর', icon: Hash },
];

type FormData = {
  id?: string;
  name: string;
  name_bn: string;
  description: string;
  form_type: string;
  is_active: boolean;
};

type FieldData = {
  id?: string;
  form_id?: string;
  field_type: string;
  label: string;
  label_bn: string;
  placeholder: string;
  is_required: boolean;
  sort_order: number;
  options: string[];
  default_value: string;
  is_active: boolean;
};

const emptyForm: FormData = { name: '', name_bn: '', description: '', form_type: 'custom', is_active: true };
const emptyField: FieldData = { field_type: 'text', label: '', label_bn: '', placeholder: '', is_required: false, sort_order: 0, options: [], default_value: '', is_active: true };

const AdminFormBuilder = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();

  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [fieldData, setFieldData] = useState<FieldData>(emptyField);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [optionInput, setOptionInput] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  // Fetch forms
  const { data: forms = [] } = useQuery({
    queryKey: ['custom-forms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('custom_forms').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch fields for selected form
  const { data: fields = [] } = useQuery({
    queryKey: ['custom-form-fields', selectedFormId],
    queryFn: async () => {
      if (!selectedFormId) return [];
      const { data, error } = await supabase.from('custom_form_fields').select('*').eq('form_id', selectedFormId).order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFormId,
  });

  // Form mutations
  const saveForm = useMutation({
    mutationFn: async (data: FormData) => {
      if (editingFormId) {
        const { error } = await supabase.from('custom_forms').update({ ...data, updated_at: new Date().toISOString() }).eq('id', editingFormId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('custom_forms').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-forms'] });
      setFormDialogOpen(false);
      setFormData(emptyForm);
      setEditingFormId(null);
      toast.success(bn ? 'ফর্ম সেভ হয়েছে' : 'Form saved');
    },
    onError: () => toast.error(bn ? 'ফর্ম সেভ করতে সমস্যা হয়েছে' : 'Failed to save form'),
  });

  const deleteForm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_forms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-forms'] });
      if (selectedFormId) setSelectedFormId(null);
      toast.success(bn ? 'ফর্ম মুছে ফেলা হয়েছে' : 'Form deleted');
    },
  });

  // Field mutations
  const saveField = useMutation({
    mutationFn: async (data: FieldData) => {
      const payload = {
        form_id: selectedFormId!,
        field_type: data.field_type,
        label: data.label,
        label_bn: data.label_bn,
        placeholder: data.placeholder,
        is_required: data.is_required,
        sort_order: data.sort_order,
        options: JSON.stringify(data.options),
        default_value: data.default_value,
        is_active: data.is_active,
      };
      if (editingFieldId) {
        const { error } = await supabase.from('custom_form_fields').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingFieldId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('custom_form_fields').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-form-fields', selectedFormId] });
      setFieldDialogOpen(false);
      setFieldData(emptyField);
      setEditingFieldId(null);
      toast.success(bn ? 'ফিল্ড সেভ হয়েছে' : 'Field saved');
    },
    onError: () => toast.error(bn ? 'ফিল্ড সেভ করতে সমস্যা হয়েছে' : 'Failed to save field'),
  });

  const deleteField = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_form_fields').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-form-fields', selectedFormId] });
      toast.success(bn ? 'ফিল্ড মুছে ফেলা হয়েছে' : 'Field deleted');
    },
  });

  const moveField = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      const idx = fields.findIndex(f => f.id === id);
      if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === fields.length - 1)) return;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      const updates = [
        supabase.from('custom_form_fields').update({ sort_order: fields[swapIdx].sort_order }).eq('id', fields[idx].id),
        supabase.from('custom_form_fields').update({ sort_order: fields[idx].sort_order }).eq('id', fields[swapIdx].id),
      ];
      await Promise.all(updates);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-form-fields', selectedFormId] }),
  });

  const openEditForm = (form: any) => {
    setFormData({ name: form.name, name_bn: form.name_bn, description: form.description || '', form_type: form.form_type, is_active: form.is_active });
    setEditingFormId(form.id);
    setFormDialogOpen(true);
  };

  const openEditField = (field: any) => {
    let opts: string[] = [];
    try { opts = typeof field.options === 'string' ? JSON.parse(field.options) : (Array.isArray(field.options) ? field.options : []); } catch { opts = []; }
    setFieldData({ field_type: field.field_type, label: field.label, label_bn: field.label_bn, placeholder: field.placeholder || '', is_required: field.is_required, sort_order: field.sort_order, options: opts, default_value: field.default_value || '', is_active: field.is_active });
    setEditingFieldId(field.id);
    setFieldDialogOpen(true);
  };

  const addOption = () => {
    if (!optionInput.trim()) return;
    setFieldData(p => ({ ...p, options: [...p.options, optionInput.trim()] }));
    setOptionInput('');
  };

  const removeOption = (idx: number) => {
    setFieldData(p => ({ ...p, options: p.options.filter((_, i) => i !== idx) }));
  };

  const selectedForm = forms.find(f => f.id === selectedFormId);
  const getFieldIcon = (type: string) => FIELD_TYPES.find(f => f.value === type)?.icon || Type;
  const getFieldLabel = (type: string) => {
    const ft = FIELD_TYPES.find(f => f.value === type);
    return ft ? (bn ? ft.label_bn : ft.label) : type;
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {bn ? 'কাস্টম ফর্ম বিল্ডার' : 'Custom Form Builder'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn ? 'ফর্ম তৈরি, সম্পাদনা এবং ফিল্ড যোগ করুন' : 'Create, edit forms and add fields'}
            </p>
          </div>
          <Dialog open={formDialogOpen} onOpenChange={(o) => { setFormDialogOpen(o); if (!o) { setFormData(emptyForm); setEditingFormId(null); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> {bn ? 'নতুন ফর্ম' : 'New Form'}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingFormId ? (bn ? 'ফর্ম সম্পাদনা' : 'Edit Form') : (bn ? 'নতুন ফর্ম তৈরি' : 'Create New Form')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{bn ? 'ফর্মের নাম (ইংরেজি)' : 'Form Name (EN)'}</Label>
                    <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Admission Form" />
                  </div>
                  <div>
                    <Label>{bn ? 'ফর্মের নাম (বাংলা)' : 'Form Name (BN)'}</Label>
                    <Input value={formData.name_bn} onChange={e => setFormData(p => ({ ...p, name_bn: e.target.value }))} placeholder="যেমন: ভর্তি ফর্ম" />
                  </div>
                </div>
                <div>
                  <Label>{bn ? 'ফর্মের ধরন' : 'Form Type'}</Label>
                  <Select value={formData.form_type} onValueChange={v => setFormData(p => ({ ...p, form_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FORM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{bn ? t.label_bn : t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'বিবরণ' : 'Description'}</Label>
                  <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={2} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.is_active} onCheckedChange={c => setFormData(p => ({ ...p, is_active: c }))} />
                  <Label>{bn ? 'সক্রিয়' : 'Active'}</Label>
                </div>
                <Button className="w-full" onClick={() => saveForm.mutate(formData)} disabled={!formData.name || !formData.name_bn}>
                  {editingFormId ? (bn ? 'আপডেট করুন' : 'Update') : (bn ? 'তৈরি করুন' : 'Create')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Form List */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {bn ? 'ফর্ম তালিকা' : 'Form List'} ({forms.length})
            </h2>
            {forms.length === 0 && (
              <Card><CardContent className="p-6 text-center text-muted-foreground">{bn ? 'কোনো ফর্ম নেই' : 'No forms yet'}</CardContent></Card>
            )}
            {forms.map(form => {
              const ft = FORM_TYPES.find(t => t.value === form.form_type);
              return (
                <Card
                  key={form.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedFormId === form.id ? 'ring-2 ring-primary border-primary' : ''}`}
                  onClick={() => setSelectedFormId(form.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{bn ? form.name_bn : form.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={form.is_active ? 'default' : 'secondary'} className="text-xs">
                            {form.is_active ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {ft ? (bn ? ft.label_bn : ft.label) : form.form_type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEditForm(form); }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); if (confirm(bn ? 'ফর্মটি মুছে ফেলতে চান?' : 'Delete this form?')) deleteForm.mutate(form.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Field Builder */}
          <div className="lg:col-span-8">
            {!selectedFormId ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>{bn ? 'বাম পাশ থেকে একটি ফর্ম নির্বাচন করুন অথবা নতুন ফর্ম তৈরি করুন' : 'Select a form from the left or create a new one'}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{bn ? selectedForm?.name_bn : selectedForm?.name}</h2>
                    <p className="text-xs text-muted-foreground">{selectedForm?.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                      <Eye className="h-4 w-4 mr-1" /> {bn ? 'প্রিভিউ' : 'Preview'}
                    </Button>
                    <Dialog open={fieldDialogOpen} onOpenChange={(o) => { setFieldDialogOpen(o); if (!o) { setFieldData(emptyField); setEditingFieldId(null); } }}>
                      <DialogTrigger asChild>
                        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> {bn ? 'ফিল্ড যোগ' : 'Add Field'}</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{editingFieldId ? (bn ? 'ফিল্ড সম্পাদনা' : 'Edit Field') : (bn ? 'নতুন ফিল্ড যোগ' : 'Add New Field')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Field type selector */}
                          <div>
                            <Label>{bn ? 'ফিল্ডের ধরন' : 'Field Type'}</Label>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              {FIELD_TYPES.map(ft => {
                                const Icon = ft.icon;
                                return (
                                  <button
                                    key={ft.value}
                                    type="button"
                                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all ${fieldData.field_type === ft.value ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:border-primary/50'}`}
                                    onClick={() => setFieldData(p => ({ ...p, field_type: ft.value }))}
                                  >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{bn ? ft.label_bn : ft.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>{bn ? 'লেবেল (ইংরেজি)' : 'Label (EN)'}</Label>
                              <Input value={fieldData.label} onChange={e => setFieldData(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Full Name" />
                            </div>
                            <div>
                              <Label>{bn ? 'লেবেল (বাংলা)' : 'Label (BN)'}</Label>
                              <Input value={fieldData.label_bn} onChange={e => setFieldData(p => ({ ...p, label_bn: e.target.value }))} placeholder="যেমন: পূর্ণ নাম" />
                            </div>
                          </div>

                          <div>
                            <Label>{bn ? 'প্লেসহোল্ডার' : 'Placeholder'}</Label>
                            <Input value={fieldData.placeholder} onChange={e => setFieldData(p => ({ ...p, placeholder: e.target.value }))} />
                          </div>

                          <div>
                            <Label>{bn ? 'ডিফল্ট মান' : 'Default Value'}</Label>
                            <Input value={fieldData.default_value} onChange={e => setFieldData(p => ({ ...p, default_value: e.target.value }))} />
                          </div>

                          {/* Options for select/radio/checkbox */}
                          {['select', 'radio', 'checkbox'].includes(fieldData.field_type) && (
                            <div>
                              <Label>{bn ? 'অপশন সমূহ' : 'Options'}</Label>
                              <div className="flex gap-2 mt-1">
                                <Input value={optionInput} onChange={e => setOptionInput(e.target.value)} placeholder={bn ? 'অপশন লিখুন' : 'Type option'} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())} />
                                <Button type="button" size="sm" onClick={addOption}><Plus className="h-4 w-4" /></Button>
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {fieldData.options.map((opt, i) => (
                                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                                    {opt}
                                    <button onClick={() => removeOption(i)} className="ml-1 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Switch checked={fieldData.is_required} onCheckedChange={c => setFieldData(p => ({ ...p, is_required: c }))} />
                              <Label>{bn ? 'আবশ্যক ফিল্ড' : 'Required'}</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch checked={fieldData.is_active} onCheckedChange={c => setFieldData(p => ({ ...p, is_active: c }))} />
                              <Label>{bn ? 'সক্রিয়' : 'Active'}</Label>
                            </div>
                          </div>

                          <div>
                            <Label>{bn ? 'ক্রম' : 'Sort Order'}</Label>
                            <Input type="number" value={fieldData.sort_order} onChange={e => setFieldData(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
                          </div>

                          <Button className="w-full" onClick={() => saveField.mutate(fieldData)} disabled={!fieldData.label || !fieldData.label_bn}>
                            {editingFieldId ? (bn ? 'আপডেট করুন' : 'Update') : (bn ? 'যোগ করুন' : 'Add Field')}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Fields list */}
                {fields.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Plus className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>{bn ? 'এই ফর্মে কোনো ফিল্ড নেই। উপরের "ফিল্ড যোগ" বাটনে ক্লিক করুন।' : 'No fields yet. Click "Add Field" above.'}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {fields.map((field, idx) => {
                      const Icon = getFieldIcon(field.field_type);
                      let opts: string[] = [];
                      try { opts = typeof field.options === 'string' ? JSON.parse(field.options as string) : (Array.isArray(field.options) ? (field.options as string[]) : []); } catch { opts = []; }
                      return (
                        <Card key={field.id} className={`transition-all ${!field.is_active ? 'opacity-50' : ''}`}>
                          <CardContent className="p-3 flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-foreground truncate">{bn ? field.label_bn : field.label}</span>
                                {field.is_required && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">*</Badge>}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-[10px]">{getFieldLabel(field.field_type)}</Badge>
                                {opts.length > 0 && <span className="text-[10px] text-muted-foreground">{opts.length} {bn ? 'টি অপশন' : 'options'}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveField.mutate({ id: field.id, direction: 'up' })} disabled={idx === 0}>
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveField.mutate({ id: field.id, direction: 'down' })} disabled={idx === fields.length - 1}>
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditField(field)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm(bn ? 'ফিল্ডটি মুছে ফেলতে চান?' : 'Delete this field?')) deleteField.mutate(field.id); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{bn ? 'ফর্ম প্রিভিউ' : 'Form Preview'}: {bn ? selectedForm?.name_bn : selectedForm?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-2">
              {fields.filter(f => f.is_active).map(field => {
                let opts: string[] = [];
                try { opts = typeof field.options === 'string' ? JSON.parse(field.options as string) : (Array.isArray(field.options) ? (field.options as string[]) : []); } catch { opts = []; }
                return (
                  <div key={field.id} className="space-y-1.5">
                    <Label className="flex items-center gap-1">
                      {bn ? field.label_bn : field.label}
                      {field.is_required && <span className="text-destructive">*</span>}
                    </Label>
                    {field.field_type === 'text' && <Input placeholder={field.placeholder || ''} defaultValue={field.default_value || ''} />}
                    {field.field_type === 'email' && <Input type="email" placeholder={field.placeholder || ''} />}
                    {field.field_type === 'phone' && <Input type="tel" placeholder={field.placeholder || ''} />}
                    {field.field_type === 'number' && <Input type="number" placeholder={field.placeholder || ''} />}
                    {field.field_type === 'textarea' && <Textarea placeholder={field.placeholder || ''} rows={3} />}
                    {field.field_type === 'date' && <Input type="date" />}
                    {field.field_type === 'file' && <Input type="file" />}
                    {field.field_type === 'switch' && <Switch />}
                    {field.field_type === 'select' && (
                      <Select>
                        <SelectTrigger><SelectValue placeholder={field.placeholder || (bn ? 'নির্বাচন করুন' : 'Select...')} /></SelectTrigger>
                        <SelectContent>
                          {opts.map((opt, i) => <SelectItem key={i} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    {field.field_type === 'radio' && (
                      <div className="flex flex-wrap gap-3">
                        {opts.map((opt, i) => (
                          <label key={i} className="flex items-center gap-1.5 text-sm">
                            <input type="radio" name={field.id} value={opt} className="accent-primary" />
                            {opt}
                          </label>
                        ))}
                      </div>
                    )}
                    {field.field_type === 'checkbox' && (
                      <div className="flex flex-wrap gap-3">
                        {opts.map((opt, i) => (
                          <label key={i} className="flex items-center gap-1.5 text-sm">
                            <input type="checkbox" value={opt} className="accent-primary" />
                            {opt}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {fields.filter(f => f.is_active).length === 0 && (
                <p className="text-center text-muted-foreground py-8">{bn ? 'কোনো সক্রিয় ফিল্ড নেই' : 'No active fields'}</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminFormBuilder;
