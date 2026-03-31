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
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Edit2, Trash2, GripVertical, Eye, Copy,
  Type, Hash, ListOrdered, CheckSquare, CircleDot,
  Upload, Calendar, ToggleLeft, FileText, MapPin, Mail, Phone, CreditCard,
  ChevronDown, FolderOpen
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import AddressFields, { type AddressData } from '@/components/AddressFields';
import { Checkbox } from '@/components/ui/checkbox';

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
  { value: 'email', label: 'Email', label_bn: 'ইমেইল', icon: Mail },
  { value: 'phone', label: 'Phone', label_bn: 'ফোন নম্বর', icon: Phone },
  { value: 'address_permanent', label: 'Permanent Address', label_bn: 'স্থায়ী ঠিকানা', icon: MapPin },
  { value: 'address_present', label: 'Present Address', label_bn: 'বর্তমান ঠিকানা', icon: MapPin },
  { value: 'post_office', label: 'Post Office', label_bn: 'পোস্ট অফিস', icon: Mail },
  { value: 'village', label: 'Village', label_bn: 'গ্রাম', icon: MapPin },
  { value: 'nid', label: 'NID', label_bn: 'এনআইডি (NID)', icon: CreditCard },
];

type FormData = {
  id?: string;
  name: string;
  name_bn: string;
  description: string;
  form_type: string;
  is_active: boolean;
  publish_to: string;
  parent_menu: string;
  menu_slug: string;
};

const ADMIN_MENUS = [
  { value: '/admin', label: 'Dashboard', label_bn: 'ড্যাশবোর্ড' },
  { value: '/admin/donors', label: 'Donor List', label_bn: 'দাতা তালিকা' },
  { value: '/admin/students', label: 'Student Management', label_bn: 'ছাত্র ব্যবস্থাপনা' },
  { value: '/admin/staff', label: 'Staff/Teacher Management', label_bn: 'স্টাফ/শিক্ষক ব্যবস্থাপনা' },
  { value: '/admin/divisions', label: 'Division & Class', label_bn: 'বিভাগ ও শ্রেণী' },
  { value: '/admin/fee-receipts', label: 'Fee Receipts', label_bn: 'ফি রসিদ' },
  { value: '/admin/results', label: 'Results', label_bn: 'ফলাফল' },
  { value: '/admin/notices', label: 'Notice', label_bn: 'নোটিশ' },
  { value: '/admin/fees', label: 'Fees', label_bn: 'ফি' },
  { value: '/admin/expenses', label: 'Expenses', label_bn: 'খরচ ব্যবস্থাপনা' },
  { value: '/admin/website', label: 'Website Control', label_bn: 'ওয়েবসাইট নিয়ন্ত্রণ' },
  { value: '/admin/designations', label: 'Designations', label_bn: 'পদবি তৈরি' },
  { value: '/admin/subjects', label: 'Subjects', label_bn: 'বিষয়সমূহ' },
  { value: '/admin/form-builder', label: 'Custom Builder', label_bn: 'কাস্টম বিল্ডার' },
  { value: '/admin/settings', label: 'Settings', label_bn: 'সেটিংস' },
];

type ConditionData = {
  enabled: boolean;
  source_field_id: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_empty' | 'is_empty';
  value: string;
};

type ValidationData = {
  min_length: string;
  max_length: string;
  min_value: string;
  max_value: string;
  pattern: string;
  error_message: string;
  error_message_bn: string;
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
  condition: ConditionData;
  validation: ValidationData;
};

const emptyValidation: ValidationData = { min_length: '', max_length: '', min_value: '', max_value: '', pattern: '', error_message: '', error_message_bn: '' };
const emptyCondition: ConditionData = { enabled: false, source_field_id: '', operator: 'equals', value: '' };
const emptyForm: FormData = { name: '', name_bn: '', description: '', form_type: 'custom', is_active: true, publish_to: 'none', parent_menu: '', menu_slug: '' };
const emptyField: FieldData = { field_type: 'text', label: '', label_bn: '', placeholder: '', is_required: false, sort_order: 0, options: [], default_value: '', is_active: true, condition: { ...emptyCondition }, validation: { ...emptyValidation } };

// Sortable field item component
const SortableFieldItem = ({ field, bn, getFieldIcon, getFieldLabel, openEditField, deleteField, fields }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined, opacity: isDragging ? 0.5 : (!field.is_active ? 0.5 : 1) };
  const Icon = getFieldIcon(field.field_type);
  let opts: string[] = [];
  try { opts = typeof field.options === 'string' ? JSON.parse(field.options as string) : (Array.isArray(field.options) ? (field.options as string[]) : []); } catch { opts = []; }
  let hasCondition = false;
  try { const v = typeof field.validation === 'string' ? JSON.parse(field.validation) : (field.validation || {}); hasCondition = !!v.condition; } catch {}

  return (
    <Card ref={setNodeRef} style={style} className="transition-shadow">
      <CardContent className="p-3 flex items-center gap-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1 -m-1 rounded hover:bg-muted">
          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
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
            {hasCondition && (
              <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {bn ? 'শর্তযুক্ত' : 'Conditional'}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditField(field)}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm(bn ? 'ফিল্ডটি মুছে ফেলতে চান?' : 'Delete this field?')) deleteField(field.id); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

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
  const [permanentAddr, setPermanentAddr] = useState<AddressData>({ division: '', district: '', upazila: '', union: '', postOffice: '', village: '' });
  const [presentAddr, setPresentAddr] = useState<AddressData>({ division: '', district: '', upazila: '', union: '', postOffice: '', village: '' });
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});

  // Sync present address when "same as permanent" is checked
  const handleSameAsPermanent = (checked: boolean) => {
    setSameAsPermanent(checked);
    if (checked) setPresentAddr({ ...permanentAddr });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  // Duplicate form mutation
  const duplicateForm = useMutation({
    mutationFn: async (formId: string) => {
      const sourceForm = forms.find(f => f.id === formId);
      if (!sourceForm) throw new Error('Form not found');

      // Create new form
      const { data: newForm, error: formErr } = await supabase.from('custom_forms').insert({
        name: sourceForm.name + ' (Copy)',
        name_bn: sourceForm.name_bn + ' (কপি)',
        description: sourceForm.description,
        form_type: sourceForm.form_type,
        is_active: sourceForm.is_active,
      }).select().single();
      if (formErr || !newForm) throw formErr;

      // Copy fields
      const { data: sourceFields } = await supabase.from('custom_form_fields').select('*').eq('form_id', formId).order('sort_order');
      if (sourceFields && sourceFields.length > 0) {
        const newFields = sourceFields.map(f => ({
          form_id: newForm.id,
          field_type: f.field_type,
          label: f.label,
          label_bn: f.label_bn,
          placeholder: f.placeholder,
          is_required: f.is_required,
          sort_order: f.sort_order,
          options: f.options,
          validation: f.validation,
          default_value: f.default_value,
          is_active: f.is_active,
        }));
        const { error: fieldsErr } = await supabase.from('custom_form_fields').insert(newFields);
        if (fieldsErr) throw fieldsErr;
      }
      return newForm;
    },
    onSuccess: (newForm) => {
      queryClient.invalidateQueries({ queryKey: ['custom-forms'] });
      setSelectedFormId(newForm.id);
      toast.success(bn ? 'ফর্ম ডুপ্লিকেট হয়েছে' : 'Form duplicated');
    },
    onError: () => toast.error(bn ? 'ডুপ্লিকেট করতে সমস্যা হয়েছে' : 'Failed to duplicate'),
  });

  // Field mutations
  const saveField = useMutation({
    mutationFn: async (data: FieldData) => {
      const validationObj: Record<string, any> = {};
      if (data.condition.enabled) {
        validationObj.condition = { source_field_id: data.condition.source_field_id, operator: data.condition.operator, value: data.condition.value };
      }
      const hasRules = data.validation.min_length || data.validation.max_length || data.validation.min_value || data.validation.max_value || data.validation.pattern || data.validation.error_message || data.validation.error_message_bn;
      if (hasRules) {
        validationObj.rules = { ...data.validation };
      }
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
        validation: JSON.stringify(validationObj),
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

  const deleteFieldMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_form_fields').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-form-fields', selectedFormId] });
      toast.success(bn ? 'ফিল্ড মুছে ফেলা হয়েছে' : 'Field deleted');
    },
  });

  // Drag end handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex(f => f.id === active.id);
    const newIndex = fields.findIndex(f => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(fields, oldIndex, newIndex);

    // Update all sort_orders in DB
    const updates = reordered.map((f, i) =>
      supabase.from('custom_form_fields').update({ sort_order: i }).eq('id', f.id)
    );
    await Promise.all(updates);
    queryClient.invalidateQueries({ queryKey: ['custom-form-fields', selectedFormId] });
  };

  const openEditForm = (form: any) => {
    setFormData({ name: form.name, name_bn: form.name_bn, description: form.description || '', form_type: form.form_type, is_active: form.is_active, publish_to: form.publish_to || 'none', parent_menu: form.parent_menu || '', menu_slug: form.menu_slug || '' });
    setEditingFormId(form.id);
    setFormDialogOpen(true);
  };

  const openEditField = (field: any) => {
    let opts: string[] = [];
    try { opts = typeof field.options === 'string' ? JSON.parse(field.options) : (Array.isArray(field.options) ? field.options : []); } catch { opts = []; }
    let cond: ConditionData = { ...emptyCondition };
    let val: ValidationData = { ...emptyValidation };
    try {
      const v = typeof field.validation === 'string' ? JSON.parse(field.validation) : (field.validation || {});
      if (v.condition) cond = { ...emptyCondition, ...v.condition, enabled: true };
      if (v.rules) val = { ...emptyValidation, ...v.rules };
    } catch {}
    setFieldData({ field_type: field.field_type, label: field.label, label_bn: field.label_bn, placeholder: field.placeholder || '', is_required: field.is_required, sort_order: field.sort_order, options: opts, default_value: field.default_value || '', is_active: field.is_active, condition: cond, validation: val });
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

  const evaluateCondition = (field: any): boolean => {
    let validation: any = {};
    try { validation = typeof field.validation === 'string' ? JSON.parse(field.validation) : (field.validation || {}); } catch {}
    if (!validation.condition) return true;
    const { source_field_id, operator, value } = validation.condition;
    const sourceVal = previewValues[source_field_id] || '';
    switch (operator) {
      case 'equals': return sourceVal === value;
      case 'not_equals': return sourceVal !== value;
      case 'contains': return sourceVal.toLowerCase().includes((value || '').toLowerCase());
      case 'not_empty': return sourceVal.trim() !== '';
      case 'is_empty': return sourceVal.trim() === '';
      default: return true;
    }
  };

  const updatePreviewValue = (fieldId: string, val: string) => {
    setPreviewValues(p => ({ ...p, [fieldId]: val }));
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
         <div className="flex items-center justify-between">
           <div>
             <h1 className="text-2xl font-display font-bold text-foreground">
               {bn ? 'কাস্টম বিল্ডার' : 'Custom Builder'}
             </h1>
             <p className="text-sm text-muted-foreground mt-1">
               {bn ? 'মেনু/ক্যাটাগরি অনুযায়ী ফর্ম তৈরি ও পরিচালনা করুন' : 'Create and manage forms by menu/category'}
             </p>
           </div>
           <div className="flex items-center gap-2">
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button><Plus className="h-4 w-4 mr-1" /> {bn ? 'নতুন ফর্ম' : 'New Form'} <ChevronDown className="h-4 w-4 ml-1" /></Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-56">
                 {FORM_TYPES.map(ft => (
                   <DropdownMenuItem key={ft.value} onClick={() => {
                     setFormData({ ...emptyForm, form_type: ft.value, name: ft.label, name_bn: ft.label_bn });
                     setEditingFormId(null);
                     setFormDialogOpen(true);
                   }}>
                     <FolderOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                     {bn ? ft.label_bn : ft.label}
                     <Badge variant="outline" className="ml-auto text-[10px]">
                       {forms.filter(f => f.form_type === ft.value).length}
                     </Badge>
                   </DropdownMenuItem>
                 ))}
               </DropdownMenuContent>
             </DropdownMenu>
           </div>
         </div>

         {/* Form Edit Dialog */}
         <Dialog open={formDialogOpen} onOpenChange={(o) => { setFormDialogOpen(o); if (!o) { setFormData(emptyForm); setEditingFormId(null); } }}>
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

               {/* Menu Publish Options */}
               <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                 <Label className="font-semibold">{bn ? '📌 মেনুতে পাবলিশ' : '📌 Publish to Menu'}</Label>
                 <div>
                   <Label className="text-xs">{bn ? 'পাবলিশ টাইপ' : 'Publish Type'}</Label>
                   <Select value={formData.publish_to} onValueChange={v => setFormData(p => ({ ...p, publish_to: v, parent_menu: v === 'none' ? '' : p.parent_menu }))}>
                     <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="none">{bn ? 'পাবলিশ করবেন না' : "Don't Publish"}</SelectItem>
                       <SelectItem value="main_menu">{bn ? 'মেইন মেনু হিসেবে' : 'As Main Menu'}</SelectItem>
                       <SelectItem value="sub_menu">{bn ? 'সাব মেনু হিসেবে' : 'As Sub Menu'}</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 {formData.publish_to === 'sub_menu' && (
                   <div>
                     <Label className="text-xs">{bn ? 'প্যারেন্ট মেনু' : 'Parent Menu'}</Label>
                     <Select value={formData.parent_menu} onValueChange={v => setFormData(p => ({ ...p, parent_menu: v }))}>
                       <SelectTrigger className="mt-1"><SelectValue placeholder={bn ? 'মেনু নির্বাচন করুন' : 'Select parent menu'} /></SelectTrigger>
                       <SelectContent>
                         {ADMIN_MENUS.map(m => (
                           <SelectItem key={m.value} value={m.value}>{bn ? m.label_bn : m.label}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 )}
                 {formData.publish_to !== 'none' && (
                   <div>
                     <Label className="text-xs">{bn ? 'মেনু স্লাগ (URL)' : 'Menu Slug (URL)'}</Label>
                     <div className="flex items-center gap-1 mt-1">
                       <span className="text-xs text-muted-foreground">/admin/custom/</span>
                       <Input
                         value={formData.menu_slug}
                         onChange={e => setFormData(p => ({ ...p, menu_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                         placeholder="my-form"
                         className="flex-1"
                       />
                     </div>
                   </div>
                 )}
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

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
           {/* Form List grouped by category */}
           <div className="lg:col-span-4 space-y-3">
             <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
               {bn ? 'ক্যাটাগরি অনুযায়ী ফর্ম' : 'Forms by Category'} ({forms.length})
             </h2>
             {FORM_TYPES.filter(ft => forms.some(f => f.form_type === ft.value)).map(ft => {
               const categoryForms = forms.filter(f => f.form_type === ft.value);
               return (
                 <Collapsible key={ft.value} defaultOpen={categoryForms.some(f => f.id === selectedFormId)}>
                   <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                     <div className="flex items-center gap-2">
                       <FolderOpen className="h-4 w-4 text-primary" />
                       <span className="font-semibold text-sm text-foreground">{bn ? ft.label_bn : ft.label}</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <Badge variant="secondary" className="text-[10px]">{categoryForms.length}</Badge>
                       <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
                     </div>
                   </CollapsibleTrigger>
                   <CollapsibleContent className="mt-1 space-y-1.5 pl-2">
                     {categoryForms.map(form => (
                       <Card
                         key={form.id}
                         className={`cursor-pointer transition-all hover:shadow-md ${selectedFormId === form.id ? 'ring-2 ring-primary border-primary' : ''}`}
                         onClick={() => setSelectedFormId(form.id)}
                       >
                         <CardContent className="p-3">
                           <div className="flex items-start justify-between">
                             <div className="flex-1 min-w-0">
                               <h3 className="font-medium text-sm text-foreground truncate">{bn ? form.name_bn : form.name}</h3>
                               <Badge variant={form.is_active ? 'default' : 'secondary'} className="text-[10px] mt-1">
                                 {form.is_active ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}
                               </Badge>
                             </div>
                             <div className="flex gap-1 ml-2">
                               <Button size="icon" variant="ghost" className="h-7 w-7" title={bn ? 'ডুপ্লিকেট' : 'Duplicate'} onClick={e => { e.stopPropagation(); duplicateForm.mutate(form.id); }}>
                                 <Copy className="h-3.5 w-3.5" />
                               </Button>
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
                     ))}
                   </CollapsibleContent>
                 </Collapsible>
               );
             })}
             {forms.length === 0 && (
               <Card><CardContent className="p-6 text-center text-muted-foreground">
                 {bn ? 'কোনো ফর্ম নেই। উপরের ড্রপডাউন থেকে ক্যাটাগরি বেছে নতুন ফর্ম তৈরি করুন।' : 'No forms yet. Select a category from the dropdown above to create one.'}
               </CardContent></Card>
             )}
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

                          {/* Conditional Logic */}
                          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                            <div className="flex items-center gap-2">
                              <Switch checked={fieldData.condition.enabled} onCheckedChange={c => setFieldData(p => ({ ...p, condition: { ...p.condition, enabled: c } }))} />
                              <Label className="font-semibold">{bn ? 'কন্ডিশনাল লজিক' : 'Conditional Logic'}</Label>
                            </div>
                            {fieldData.condition.enabled && (
                              <div className="space-y-2 pl-1">
                                <p className="text-xs text-muted-foreground">{bn ? 'এই ফিল্ডটি তখনই দেখাবে যখন:' : 'Show this field only when:'}</p>
                                <div>
                                  <Label className="text-xs">{bn ? 'উৎস ফিল্ড' : 'Source Field'}</Label>
                                  <Select value={fieldData.condition.source_field_id} onValueChange={v => setFieldData(p => ({ ...p, condition: { ...p.condition, source_field_id: v } }))}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder={bn ? 'ফিল্ড নির্বাচন করুন' : 'Select field'} /></SelectTrigger>
                                    <SelectContent>
                                      {fields.filter(f => f.id !== editingFieldId).map(f => (
                                        <SelectItem key={f.id} value={f.id}>{bn ? f.label_bn : f.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">{bn ? 'শর্ত' : 'Operator'}</Label>
                                  <Select value={fieldData.condition.operator} onValueChange={v => setFieldData(p => ({ ...p, condition: { ...p.condition, operator: v as ConditionData['operator'] } }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="equals">{bn ? 'সমান' : 'Equals'}</SelectItem>
                                      <SelectItem value="not_equals">{bn ? 'সমান নয়' : 'Not Equals'}</SelectItem>
                                      <SelectItem value="contains">{bn ? 'ধারণ করে' : 'Contains'}</SelectItem>
                                      <SelectItem value="not_empty">{bn ? 'খালি নয়' : 'Not Empty'}</SelectItem>
                                      <SelectItem value="is_empty">{bn ? 'খালি' : 'Is Empty'}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                {!['not_empty', 'is_empty'].includes(fieldData.condition.operator) && (
                                  <div>
                                    <Label className="text-xs">{bn ? 'মান' : 'Value'}</Label>
                                    <Input className="mt-1" value={fieldData.condition.value} onChange={e => setFieldData(p => ({ ...p, condition: { ...p.condition, value: e.target.value } }))} placeholder={bn ? 'মান লিখুন' : 'Enter value'} />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Validation Rules */}
                          {['text', 'number', 'textarea', 'email', 'phone', 'nid'].includes(fieldData.field_type) && (
                            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                              <Label className="font-semibold">{bn ? 'ভ্যালিডেশন নিয়ম' : 'Validation Rules'}</Label>
                              <div className="grid grid-cols-2 gap-3">
                                {['text', 'textarea', 'email', 'phone', 'nid'].includes(fieldData.field_type) && (
                                  <>
                                    <div>
                                      <Label className="text-xs">{bn ? 'সর্বনিম্ন অক্ষর' : 'Min Length'}</Label>
                                      <Input type="number" className="mt-1" value={fieldData.validation.min_length} onChange={e => setFieldData(p => ({ ...p, validation: { ...p.validation, min_length: e.target.value } }))} placeholder="0" />
                                    </div>
                                    <div>
                                      <Label className="text-xs">{bn ? 'সর্বোচ্চ অক্ষর' : 'Max Length'}</Label>
                                      <Input type="number" className="mt-1" value={fieldData.validation.max_length} onChange={e => setFieldData(p => ({ ...p, validation: { ...p.validation, max_length: e.target.value } }))} placeholder="999" />
                                    </div>
                                  </>
                                )}
                                {fieldData.field_type === 'number' && (
                                  <>
                                    <div>
                                      <Label className="text-xs">{bn ? 'সর্বনিম্ন মান' : 'Min Value'}</Label>
                                      <Input type="number" className="mt-1" value={fieldData.validation.min_value} onChange={e => setFieldData(p => ({ ...p, validation: { ...p.validation, min_value: e.target.value } }))} placeholder="0" />
                                    </div>
                                    <div>
                                      <Label className="text-xs">{bn ? 'সর্বোচ্চ মান' : 'Max Value'}</Label>
                                      <Input type="number" className="mt-1" value={fieldData.validation.max_value} onChange={e => setFieldData(p => ({ ...p, validation: { ...p.validation, max_value: e.target.value } }))} placeholder="999999" />
                                    </div>
                                  </>
                                )}
                              </div>
                              <div>
                                <Label className="text-xs">{bn ? 'রেজেক্স প্যাটার্ন' : 'Regex Pattern'}</Label>
                                <Input className="mt-1 font-mono text-xs" value={fieldData.validation.pattern} onChange={e => setFieldData(p => ({ ...p, validation: { ...p.validation, pattern: e.target.value } }))} placeholder={bn ? 'যেমন: ^[0-9]{10,17}$' : 'e.g. ^[0-9]{10,17}$'} />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">{bn ? 'এরর মেসেজ (EN)' : 'Error Message (EN)'}</Label>
                                  <Input className="mt-1" value={fieldData.validation.error_message} onChange={e => setFieldData(p => ({ ...p, validation: { ...p.validation, error_message: e.target.value } }))} placeholder="Invalid input" />
                                </div>
                                <div>
                                  <Label className="text-xs">{bn ? 'এরর মেসেজ (বাংলা)' : 'Error Message (BN)'}</Label>
                                  <Input className="mt-1" value={fieldData.validation.error_message_bn} onChange={e => setFieldData(p => ({ ...p, validation: { ...p.validation, error_message_bn: e.target.value } }))} placeholder="সঠিক তথ্য দিন" />
                                </div>
                              </div>
                            </div>
                          )}

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

                {/* Fields list with drag and drop */}
                {fields.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Plus className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>{bn ? 'এই ফর্মে কোনো ফিল্ড নেই। উপরের "ফিল্ড যোগ" বাটনে ক্লিক করুন।' : 'No fields yet. Click "Add Field" above.'}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {fields.map(field => (
                          <SortableFieldItem
                            key={field.id}
                            field={field}
                            bn={bn}
                            getFieldIcon={getFieldIcon}
                            getFieldLabel={getFieldLabel}
                            openEditField={openEditField}
                            deleteField={(id: string) => deleteFieldMut.mutate(id)}
                            fields={fields}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                {fields.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    <GripVertical className="h-3 w-3 inline-block mr-1" />
                    {bn ? 'ফিল্ড টেনে সাজান (ড্র্যাগ এন্ড ড্রপ)' : 'Drag fields to reorder'}
                  </p>
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
                if (!evaluateCondition(field)) return null;
                let opts: string[] = [];
                try { opts = typeof field.options === 'string' ? JSON.parse(field.options as string) : (Array.isArray(field.options) ? (field.options as string[]) : []); } catch { opts = []; }
                return (
                  <div key={field.id} className="space-y-1.5">
                    <Label className="flex items-center gap-1">
                      {bn ? field.label_bn : field.label}
                      {field.is_required && <span className="text-destructive">*</span>}
                    </Label>
                    {field.field_type === 'text' && <Input placeholder={field.placeholder || ''} defaultValue={field.default_value || ''} onChange={e => updatePreviewValue(field.id, e.target.value)} />}
                    {field.field_type === 'email' && <Input type="email" placeholder={field.placeholder || ''} onChange={e => updatePreviewValue(field.id, e.target.value)} />}
                    {field.field_type === 'phone' && <Input type="tel" placeholder={field.placeholder || ''} onChange={e => updatePreviewValue(field.id, e.target.value)} />}
                    {field.field_type === 'number' && <Input type="number" placeholder={field.placeholder || ''} onChange={e => updatePreviewValue(field.id, e.target.value)} />}
                    {field.field_type === 'textarea' && <Textarea placeholder={field.placeholder || ''} rows={3} onChange={e => updatePreviewValue(field.id, e.target.value)} />}
                    {field.field_type === 'date' && <Input type="date" />}
                    {field.field_type === 'file' && <Input type="file" />}
                    {field.field_type === 'switch' && <Switch />}
                    {field.field_type === 'post_office' && <Input placeholder={bn ? 'পোস্ট অফিস লিখুন' : 'Enter post office'} />}
                    {field.field_type === 'village' && <Input placeholder={bn ? 'গ্রাম লিখুন' : 'Enter village'} />}
                    {field.field_type === 'nid' && <Input placeholder={bn ? '১০ বা ১৭ ডিজিট NID' : '10 or 17 digit NID'} maxLength={17} onChange={e => { const cleaned = e.target.value.replace(/\D/g, ''); e.target.value = cleaned; updatePreviewValue(field.id, cleaned); }} />}
                    {field.field_type === 'address_permanent' && (
                      <AddressFields
                        label={bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'}
                        value={permanentAddr}
                        onChange={(data) => {
                          setPermanentAddr(data);
                          if (sameAsPermanent) setPresentAddr(data);
                        }}
                      />
                    )}
                    {field.field_type === 'address_present' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={sameAsPermanent}
                            onCheckedChange={(c) => handleSameAsPermanent(!!c)}
                          />
                          <Label className="text-sm font-normal cursor-pointer">
                            {bn ? 'স্থায়ী ঠিকানার মতো একই' : 'Same as Permanent Address'}
                          </Label>
                        </div>
                        <AddressFields
                          label={bn ? 'বর্তমান ঠিকানা' : 'Present Address'}
                          value={presentAddr}
                          onChange={setPresentAddr}
                          disabled={sameAsPermanent}
                        />
                      </div>
                    )}
                    {field.field_type === 'select' && (
                      <Select onValueChange={v => updatePreviewValue(field.id, v)}>
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
                            <input type="radio" name={field.id} value={opt} className="accent-primary" onChange={() => updatePreviewValue(field.id, opt)} />
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
