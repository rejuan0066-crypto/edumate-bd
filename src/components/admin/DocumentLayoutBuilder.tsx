import { useState, useRef, DragEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Plus, Trash2, Edit, Copy, FileText, Receipt, Eye, Printer,
  ChevronDown, ChevronUp, X, Type, Calendar, List, Image, Hash,
  ToggleLeft, Mail, Phone, Pen, FolderOpen, GripVertical, AlignLeft, AlignCenter, AlignRight, Palette
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';

// ─── Types ───
interface LayoutField {
  id: string; label: string; label_bn: string;
  type: 'text' | 'number' | 'date' | 'select' | 'photo' | 'textarea' | 'toggle' | 'email' | 'phone';
  required: boolean; options?: string[]; show: boolean; width: 'full' | 'half';
}
interface SectionStyle {
  fontSize?: number; color?: string; textAlign?: 'left' | 'center' | 'right';
  bgColor?: string;
}
interface LayoutSection { id: string; name: string; name_bn: string; fields: LayoutField[]; collapsed: boolean; style?: SectionStyle; }
interface SignatureLine { id: string; title: string; title_bn: string; }
interface ReceiptRow { id: string; label: string; label_bn: string; type: 'fee' | 'amount' | 'info'; show: boolean; }
interface HeaderConfig {
  showLogo: boolean; showName: boolean; showAddress: boolean; showContact: boolean;
  customTitle: string; customTitle_bn: string; customSubtitle: string; customSubtitle_bn: string;
  institutionName?: string; institutionName_bn?: string;
  institutionAddress?: string; institutionPhone?: string; institutionEmail?: string;
  logoUrl?: string;
}
interface LayoutConfig {
  header: HeaderConfig;
  footer: { signatures: SignatureLine[]; termsText: string; termsText_bn: string; copyrightText: string; };
  sections: LayoutSection[]; receiptRows: ReceiptRow[];
  showFields: { studentId: boolean; date: boolean; amountInWords: boolean; receiptNo: boolean; };
}
interface DocumentLayout { id: string; name: string; name_bn: string; layout_type: string; category: string; config: LayoutConfig; is_active: boolean; created_at: string; updated_at: string; }

const uid = () => crypto.randomUUID().slice(0, 8);

const DEFAULT_CONFIG: LayoutConfig = {
  header: { showLogo: true, showName: true, showAddress: true, showContact: true, customTitle: '', customTitle_bn: '', customSubtitle: '', customSubtitle_bn: '' },
  footer: { signatures: [{ id: uid(), title: 'Principal Signature', title_bn: 'অধ্যক্ষের স্বাক্ষর' }], termsText: '', termsText_bn: '', copyrightText: '' },
  sections: [{ id: uid(), name: 'Personal Information', name_bn: 'ব্যক্তিগত তথ্য', fields: [
    { id: uid(), label: 'Full Name', label_bn: 'পূর্ণ নাম', type: 'text', required: true, show: true, width: 'half' },
    { id: uid(), label: 'Date of Birth', label_bn: 'জন্ম তারিখ', type: 'date', required: true, show: true, width: 'half' },
    { id: uid(), label: 'Photo', label_bn: 'ছবি', type: 'photo', required: false, show: true, width: 'half' },
  ], collapsed: false }],
  receiptRows: [],
  showFields: { studentId: true, date: true, amountInWords: true, receiptNo: true },
};

const RECEIPT_CONFIG: LayoutConfig = {
  ...DEFAULT_CONFIG, sections: [],
  receiptRows: [
    { id: uid(), label: 'Admission Fee', label_bn: 'ভর্তি ফি', type: 'fee', show: true },
    { id: uid(), label: 'Monthly Fee', label_bn: 'মাসিক ফি', type: 'fee', show: true },
    { id: uid(), label: 'Total', label_bn: 'মোট', type: 'amount', show: true },
  ],
  footer: { ...DEFAULT_CONFIG.footer, signatures: [{ id: uid(), title: 'Cashier', title_bn: 'ক্যাশিয়ার' }, { id: uid(), title: 'Principal', title_bn: 'অধ্যক্ষ' }] },
};

const FIELD_TYPE_ICONS: Record<string, any> = { text: Type, number: Hash, date: Calendar, select: List, photo: Image, textarea: FileText, toggle: ToggleLeft, email: Mail, phone: Phone };

const CATEGORIES = [
  { value: 'student', label: 'Student Admission', label_bn: 'ছাত্র ভর্তি' },
  { value: 'teacher', label: 'Teacher Recruitment', label_bn: 'শিক্ষক নিয়োগ' },
  { value: 'staff', label: 'Staff Profile', label_bn: 'স্টাফ প্রোফাইল' },
  { value: 'admission_fee', label: 'Admission Fee Receipt', label_bn: 'ভর্তি ফি রসিদ' },
  { value: 'salary', label: 'Monthly Salary Receipt', label_bn: 'মাসিক বেতন রসিদ' },
  { value: 'donation', label: 'General Donation Receipt', label_bn: 'সাধারণ দান রসিদ' },
];

const FIELD_TYPE_MAP: Record<string, LayoutField['type']> = {
  text: 'text', number: 'number', textarea: 'textarea', select: 'select',
  radio: 'select', checkbox: 'select', file: 'photo', date: 'date',
  switch: 'toggle', email: 'email', phone: 'phone',
  address_permanent: 'text', address_present: 'text', post_office: 'text',
  village: 'text', nid: 'text', identity_card: 'text',
};

const PRESET_COLORS = [
  '#000000', '#1a1a2e', '#16213e', '#0f3460', '#533483',
  '#e94560', '#1b5e20', '#2e7d32', '#4a148c', '#b71c1c',
  '#004d40', '#01579b', '#e65100', '#33691e', '#880e4f',
];

const DocumentLayoutBuilder = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();

  const [editorOpen, setEditorOpen] = useState(false);
  const [current, setCurrent] = useState<DocumentLayout | null>(null);
  const [config, setConfig] = useState<LayoutConfig>(DEFAULT_CONFIG);
  const [formName, setFormName] = useState('');
  const [formNameBn, setFormNameBn] = useState('');
  const [formType, setFormType] = useState<'form' | 'receipt'>('form');
  const [formCategory, setFormCategory] = useState('student');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('sections');
  const [importingForm, setImportingForm] = useState(false);

  // Drag state
  const dragFieldRef = useRef<{ sectionId: string; fieldIndex: number } | null>(null);
  const dragSectionRef = useRef<number | null>(null);
  const [dragOverField, setDragOverField] = useState<{ sectionId: string; fieldIndex: number } | null>(null);
  const [dragOverSection, setDragOverSection] = useState<number | null>(null);

  const { data: layouts = [], isLoading } = useQuery({
    queryKey: ['document_layouts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('document_layouts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({ ...d, config: d.config as LayoutConfig })) as DocumentLayout[];
    },
  });

  const { data: customForms = [] } = useQuery({
    queryKey: ['custom-forms-for-import'],
    queryFn: async () => {
      const { data, error } = await supabase.from('custom_forms').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const importFromFormBuilder = async (formId: string) => {
    setImportingForm(true);
    try {
      const form = customForms.find(f => f.id === formId);
      if (!form) return;
      const { data: fields, error } = await supabase.from('custom_form_fields').select('*').eq('form_id', formId).eq('is_active', true).order('sort_order');
      if (error) throw error;
      if (!fields || fields.length === 0) { toast.error(bn ? 'এই ফর্মে কোনো ফিল্ড নেই' : 'No fields in this form'); return; }
      const layoutFields: LayoutField[] = fields.map(f => ({
        id: uid(), label: f.label, label_bn: f.label_bn,
        type: FIELD_TYPE_MAP[f.field_type] || 'text',
        required: f.is_required || false, show: true,
        width: ['textarea', 'address_permanent', 'address_present'].includes(f.field_type) ? 'full' as const : 'half' as const,
        ...(f.field_type === 'select' || f.field_type === 'radio' ? { options: (() => { try { return typeof f.options === 'string' ? JSON.parse(f.options) : (Array.isArray(f.options) ? f.options : []); } catch { return []; } })() } : {}),
      }));
      const newSection: LayoutSection = { id: uid(), name: form.name, name_bn: form.name_bn, fields: layoutFields, collapsed: false };
      setConfig(c => ({ ...c, sections: [...c.sections, newSection] }));
      if (!formName) setFormName(form.name);
      if (!formNameBn) setFormNameBn(form.name_bn);
      toast.success(bn ? `${fields.length}টি ফিল্ড ইমপোর্ট হয়েছে` : `${fields.length} fields imported`);
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImportingForm(false);
    }
  };

  const { data: institution } = useQuery({
    queryKey: ['institution-default'],
    queryFn: async () => {
      const { data } = await supabase.from('institutions').select('*').eq('is_default', true).maybeSingle();
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { error } = await supabase.from('document_layouts').update({ name: payload.name, name_bn: payload.name_bn, layout_type: payload.layout_type, category: payload.category, config: payload.config as any, updated_at: new Date().toISOString() }).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('document_layouts').insert({ name: payload.name, name_bn: payload.name_bn, layout_type: payload.layout_type, category: payload.category, config: payload.config as any });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['document_layouts'] }); setEditorOpen(false); toast.success(bn ? 'সংরক্ষিত!' : 'Saved!'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('document_layouts').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['document_layouts'] }); setDeleteId(null); toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted'); },
  });

  const openNew = () => { setCurrent(null); setFormName(''); setFormNameBn(''); setFormType('form'); setFormCategory('student'); setConfig(JSON.parse(JSON.stringify(DEFAULT_CONFIG))); setActiveTab('sections'); setEditorOpen(true); };
  const openEdit = (l: DocumentLayout) => { setCurrent(l); setFormName(l.name); setFormNameBn(l.name_bn); setFormType(l.layout_type as any); setFormCategory(l.category); setConfig(JSON.parse(JSON.stringify(l.config))); setActiveTab(l.layout_type === 'receipt' ? 'receipt' : 'sections'); setEditorOpen(true); };
  const duplicate = (l: DocumentLayout) => { setCurrent(null); setFormName(l.name + ' (Copy)'); setFormNameBn(l.name_bn + ' (কপি)'); setFormType(l.layout_type as any); setFormCategory(l.category); setConfig(JSON.parse(JSON.stringify(l.config))); setActiveTab(l.layout_type === 'receipt' ? 'receipt' : 'sections'); setEditorOpen(true); };
  const handleSave = () => { if (!formName.trim() || !formNameBn.trim()) { toast.error(bn ? 'নাম দিন' : 'Enter name'); return; } saveMutation.mutate({ id: current?.id, name: formName, name_bn: formNameBn, layout_type: formType, category: formCategory, config }); };

  // Section helpers
  const addSection = () => setConfig(c => ({ ...c, sections: [...c.sections, { id: uid(), name: 'New Section', name_bn: 'নতুন সেকশন', fields: [], collapsed: false, style: { fontSize: 13, color: '#000000', textAlign: 'left', bgColor: '#f3f4f6' } }] }));
  const removeSection = (sid: string) => setConfig(c => ({ ...c, sections: c.sections.filter(s => s.id !== sid) }));
  const updateSection = (sid: string, key: string, val: any) => setConfig(c => ({ ...c, sections: c.sections.map(s => s.id === sid ? { ...s, [key]: val } : s) }));
  const updateSectionStyle = (sid: string, key: string, val: any) => setConfig(c => ({ ...c, sections: c.sections.map(s => s.id === sid ? { ...s, style: { ...s.style, [key]: val } } : s) }));

  // Field helpers
  const addField = (sid: string) => setConfig(c => ({ ...c, sections: c.sections.map(s => s.id === sid ? { ...s, fields: [...s.fields, { id: uid(), label: 'New Field', label_bn: 'নতুন ফিল্ড', type: 'text', required: false, show: true, width: 'half' }] } : s) }));
  const removeField = (sid: string, fid: string) => setConfig(c => ({ ...c, sections: c.sections.map(s => s.id === sid ? { ...s, fields: s.fields.filter(f => f.id !== fid) } : s) }));
  const updateField = (sid: string, fid: string, key: string, val: any) => setConfig(c => ({ ...c, sections: c.sections.map(s => s.id === sid ? { ...s, fields: s.fields.map(f => f.id === fid ? { ...f, [key]: val } : f) } : s) }));

  // Drag & Drop - Fields
  const handleFieldDragStart = (e: DragEvent, sectionId: string, fieldIndex: number) => {
    dragFieldRef.current = { sectionId, fieldIndex };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'field');
  };
  const handleFieldDragOver = (e: DragEvent, sectionId: string, fieldIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverField({ sectionId, fieldIndex });
  };
  const handleFieldDrop = (e: DragEvent, targetSectionId: string, targetIndex: number) => {
    e.preventDefault();
    setDragOverField(null);
    const src = dragFieldRef.current;
    if (!src) return;
    if (src.sectionId === targetSectionId && src.fieldIndex === targetIndex) return;

    setConfig(c => {
      const newSections = c.sections.map(s => ({ ...s, fields: [...s.fields] }));
      const srcSection = newSections.find(s => s.id === src.sectionId);
      const tgtSection = newSections.find(s => s.id === targetSectionId);
      if (!srcSection || !tgtSection) return c;

      const [movedField] = srcSection.fields.splice(src.fieldIndex, 1);
      const adjustedIndex = src.sectionId === targetSectionId && src.fieldIndex < targetIndex ? targetIndex - 1 : targetIndex;
      tgtSection.fields.splice(adjustedIndex, 0, movedField);
      return { ...c, sections: newSections };
    });
    dragFieldRef.current = null;
  };

  // Drag & Drop - Sections
  const handleSectionDragStart = (e: DragEvent, index: number) => {
    dragSectionRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'section');
  };
  const handleSectionDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSection(index);
  };
  const handleSectionDrop = (e: DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverSection(null);
    const srcIndex = dragSectionRef.current;
    if (srcIndex === null || srcIndex === targetIndex) return;
    setConfig(c => {
      const arr = [...c.sections];
      const [moved] = arr.splice(srcIndex, 1);
      arr.splice(targetIndex, 0, moved);
      return { ...c, sections: arr };
    });
    dragSectionRef.current = null;
  };

  // Signature, Receipt helpers
  const addSignature = () => setConfig(c => ({ ...c, footer: { ...c.footer, signatures: [...c.footer.signatures, { id: uid(), title: 'Signature', title_bn: 'স্বাক্ষর' }] } }));
  const removeSignature = (sid: string) => setConfig(c => ({ ...c, footer: { ...c.footer, signatures: c.footer.signatures.filter(s => s.id !== sid) } }));
  const updateSignature = (sid: string, key: string, val: string) => setConfig(c => ({ ...c, footer: { ...c.footer, signatures: c.footer.signatures.map(s => s.id === sid ? { ...s, [key]: val } : s) } }));
  const addReceiptRow = () => setConfig(c => ({ ...c, receiptRows: [...c.receiptRows, { id: uid(), label: 'Item', label_bn: 'আইটেম', type: 'fee', show: true }] }));
  const removeReceiptRow = (rid: string) => setConfig(c => ({ ...c, receiptRows: c.receiptRows.filter(r => r.id !== rid) }));
  const updateReceiptRow = (rid: string, key: string, val: any) => setConfig(c => ({ ...c, receiptRows: c.receiptRows.map(r => r.id === rid ? { ...r, [key]: val } : r) }));
  const moveReceiptRow = (idx: number, dir: -1 | 1) => { setConfig(c => { const arr = [...c.receiptRows]; const ni = idx + dir; if (ni < 0 || ni >= arr.length) return c; [arr[idx], arr[ni]] = [arr[ni], arr[idx]]; return { ...c, receiptRows: arr }; }); };

  // Header helpers
  const updateHeader = (key: string, val: any) => setConfig(c => ({ ...c, header: { ...c.header, [key]: val } }));

  const handlePrint = () => {
    const el = document.getElementById('layout-preview-area');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${formName}</title><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans Bengali',sans-serif;padding:20mm;font-size:12px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #333;padding:6px 8px;text-align:left}.footer-area{margin-top:32px;display:flex;justify-content:space-between}@media print{@page{margin:15mm}}</style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const getHeaderName = () => config.header.institutionName_bn || config.header.institutionName || institution?.name || 'প্রতিষ্ঠানের নাম';
  const getHeaderAddress = () => config.header.institutionAddress || institution?.address || '';
  const getHeaderPhone = () => config.header.institutionPhone || institution?.phone || '';
  const getHeaderEmail = () => config.header.institutionEmail || institution?.email || '';
  const getHeaderLogo = () => config.header.logoUrl || institution?.logo_url || '';

  const renderPreview = () => (
    <div id="layout-preview-area" className="bg-white text-black p-6 text-xs min-h-[400px] border border-border rounded-lg">
      <div className="text-center mb-4">
        {config.header.showLogo && getHeaderLogo() && <img src={getHeaderLogo()} alt="Logo" className="mx-auto h-12 mb-2" />}
        {config.header.showName && <h2 className="text-lg font-bold">{getHeaderName()}</h2>}
        {config.header.showAddress && getHeaderAddress() && <p className="text-[10px]">{getHeaderAddress()}</p>}
        {config.header.showContact && (getHeaderPhone() || getHeaderEmail()) && <p className="text-[10px]">{getHeaderPhone()} {getHeaderEmail() && `| ${getHeaderEmail()}`}</p>}
        {config.header.customTitle && <h3 className="text-sm font-semibold mt-2">{bn ? config.header.customTitle_bn || config.header.customTitle : config.header.customTitle}</h3>}
        {config.header.customSubtitle && <p className="text-[10px]">{bn ? config.header.customSubtitle_bn || config.header.customSubtitle : config.header.customSubtitle}</p>}
        <div className="border-b-2 border-black mt-2" />
      </div>
      {formType === 'receipt' && (
        <div className="flex justify-between mb-3 text-[10px]">
          {config.showFields.receiptNo && <span><strong>{bn ? 'রসিদ নং:' : 'Receipt No:'}</strong> ________</span>}
          {config.showFields.studentId && <span><strong>{bn ? 'আইডি:' : 'ID:'}</strong> ________</span>}
          {config.showFields.date && <span><strong>{bn ? 'তারিখ:' : 'Date:'}</strong> ________</span>}
        </div>
      )}
      {formType === 'form' && config.sections.map(sec => {
        const style = sec.style || {};
        return (
          <div key={sec.id} className="mb-3">
            <h4 className="text-xs font-bold px-2 py-1 border border-gray-300" style={{
              fontSize: style.fontSize ? `${style.fontSize}px` : '13px',
              color: style.color || '#000',
              textAlign: style.textAlign || 'left',
              backgroundColor: style.bgColor || '#f3f4f6',
            }}>{bn ? sec.name_bn : sec.name}</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 p-2 border border-t-0 border-gray-300">
              {sec.fields.filter(f => f.show).map(f => (
                <div key={f.id} className={f.width === 'full' ? 'col-span-2' : ''}>
                  <span className="text-[10px]">{bn ? f.label_bn : f.label}{f.required && <span className="text-red-500">*</span>}: </span>
                  {f.type === 'photo' ? <div className="inline-block w-16 h-16 border border-dashed border-gray-400 text-center text-[8px] leading-[60px]">Photo</div> : <span className="border-b border-dotted border-gray-400 inline-block min-w-[80px]">&nbsp;</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {formType === 'receipt' && config.receiptRows.length > 0 && (
        <table className="w-full text-[10px] mb-3"><thead><tr><th className="border border-gray-400 bg-gray-100 px-2 py-1">{bn ? 'বিবরণ' : 'Description'}</th><th className="border border-gray-400 bg-gray-100 px-2 py-1 w-24">{bn ? 'পরিমাণ' : 'Amount'}</th></tr></thead>
          <tbody>{config.receiptRows.filter(r => r.show).map(r => (<tr key={r.id}><td className="border border-gray-400 px-2 py-1">{bn ? r.label_bn : r.label}</td><td className="border border-gray-400 px-2 py-1 text-right">{r.type === 'amount' ? <strong>৳ _____</strong> : '৳ _____'}</td></tr>))}</tbody>
        </table>
      )}
      {formType === 'receipt' && config.showFields.amountInWords && <p className="text-[10px] mb-3"><strong>{bn ? 'কথায়:' : 'In Words:'}</strong> ________________________________</p>}
      <div className="mt-6">
        {config.footer.termsText && <p className="text-[8px] text-gray-500 mb-4">{bn ? config.footer.termsText_bn || config.footer.termsText : config.footer.termsText}</p>}
        <div className="flex justify-between mt-8 pt-2">
          {config.footer.signatures.map(sig => (<div key={sig.id} className="text-center"><div className="border-t border-black w-28 mx-auto mb-1" /><span className="text-[10px]">{bn ? sig.title_bn : sig.title}</span></div>))}
        </div>
        {config.footer.copyrightText && <p className="text-[8px] text-center text-gray-400 mt-4">{config.footer.copyrightText}</p>}
      </div>
    </div>
  );

  const formLayouts = layouts.filter(l => l.layout_type === 'form');
  const receiptLayouts = layouts.filter(l => l.layout_type === 'receipt');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{bn ? 'ফর্ম ও রসিদের টেমপ্লেট তৈরি, সম্পাদনা ও মুছুন' : 'Create, edit, and delete form & receipt layout templates'}</p>
        <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" />{bn ? 'নতুন টেমপ্লেট' : 'New Template'}</Button>
      </div>

      <Tabs defaultValue="forms">
        <TabsList>
          <TabsTrigger value="forms"><FileText className="w-4 h-4 mr-1" />{bn ? 'ফর্ম' : 'Forms'} ({formLayouts.length})</TabsTrigger>
          <TabsTrigger value="receipts"><Receipt className="w-4 h-4 mr-1" />{bn ? 'রসিদ' : 'Receipts'} ({receiptLayouts.length})</TabsTrigger>
        </TabsList>
        {['forms', 'receipts'].map(tab => (
          <TabsContent key={tab} value={tab}>
            {isLoading ? <p className="text-muted-foreground p-4">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(tab === 'forms' ? formLayouts : receiptLayouts).map(layout => (
                  <Card key={layout.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{bn ? layout.name_bn : layout.name}</CardTitle>
                          <Badge variant="secondary" className="mt-1 text-[10px]">{CATEGORIES.find(c => c.value === layout.category)?.[bn ? 'label_bn' : 'label'] || layout.category}</Badge>
                        </div>
                        <Badge variant={layout.is_active ? 'default' : 'outline'}>{layout.is_active ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <p className="text-[11px] text-muted-foreground mb-3">
                        {tab === 'forms' ? `${layout.config?.sections?.length || 0} ${bn ? 'সেকশন' : 'sections'}, ${layout.config?.sections?.reduce((a: number, s: any) => a + (s.fields?.length || 0), 0) || 0} ${bn ? 'ফিল্ড' : 'fields'}` : `${layout.config?.receiptRows?.length || 0} ${bn ? 'সারি' : 'rows'}`}
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => openEdit(layout)}><Edit className="w-3 h-3 mr-1" />{bn ? 'এডিট' : 'Edit'}</Button>
                        <Button size="sm" variant="outline" onClick={() => duplicate(layout)}><Copy className="w-3 h-3 mr-1" />{bn ? 'কপি' : 'Duplicate'}</Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteId(layout.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(tab === 'forms' ? formLayouts : receiptLayouts).length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>{bn ? 'কোনো টেমপ্লেট নেই' : 'No templates yet'}</p>
                    <Button variant="outline" className="mt-3" onClick={openNew}><Plus className="w-4 h-4 mr-1" />{bn ? 'তৈরি করুন' : 'Create One'}</Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{bn ? 'মুছে ফেলুন?' : 'Delete Template?'}</DialogTitle><DialogDescription>{bn ? 'এই টেমপ্লেটটি স্থায়ীভাবে মুছে যাবে।' : 'This template will be permanently deleted.'}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)}>{bn ? 'বাতিল' : 'Cancel'}</Button><Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>{bn ? 'মুছুন' : 'Delete'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-2 border-b border-border">
            <DialogTitle>{current ? (bn ? 'টেমপ্লেট সম্পাদনা' : 'Edit Template') : (bn ? 'নতুন টেমপ্লেট' : 'New Template')}</DialogTitle>
            <DialogDescription>{bn ? 'ফর্ম বা রসিদের লেআউট ডিজাইন করুন' : 'Design your form or receipt layout'}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col lg:flex-row h-[calc(90vh-130px)]">
            <ScrollArea className="w-full lg:w-1/2 border-r border-border">
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{bn ? 'নাম (EN)' : 'Name (EN)'}</Label><Input value={formName} onChange={e => setFormName(e.target.value)} /></div>
                  <div><Label>{bn ? 'নাম (BN)' : 'Name (BN)'}</Label><Input value={formNameBn} onChange={e => setFormNameBn(e.target.value)} /></div>
                  <div><Label>{bn ? 'ধরন' : 'Type'}</Label>
                    <Select value={formType} onValueChange={(v: any) => { setFormType(v); if (v === 'receipt') setConfig(c => ({ ...c, receiptRows: c.receiptRows.length ? c.receiptRows : RECEIPT_CONFIG.receiptRows })); setActiveTab(v === 'receipt' ? 'receipt' : 'sections'); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="form">{bn ? 'ফর্ম' : 'Form'}</SelectItem><SelectItem value="receipt">{bn ? 'রসিদ' : 'Receipt'}</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>{bn ? 'ক্যাটাগরি' : 'Category'}</Label>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.filter(c => formType === 'form' ? ['student','teacher','staff'].includes(c.value) : ['admission_fee','salary','donation'].includes(c.value)).map(c => <SelectItem key={c.value} value={c.value}>{bn ? c.label_bn : c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full grid grid-cols-4">
                    <TabsTrigger value="header">{bn ? 'হেডার' : 'Header'}</TabsTrigger>
                    {formType === 'form' ? <TabsTrigger value="sections">{bn ? 'সেকশন' : 'Sections'}</TabsTrigger> : <TabsTrigger value="receipt">{bn ? 'রসিদ' : 'Receipt'}</TabsTrigger>}
                    <TabsTrigger value="footer">{bn ? 'ফুটার' : 'Footer'}</TabsTrigger>
                    <TabsTrigger value="preview"><Eye className="w-3 h-3 mr-1" />{bn ? 'প্রিভিউ' : 'Preview'}</TabsTrigger>
                  </TabsList>

                  {/* Header Tab */}
                  <TabsContent value="header" className="space-y-3 mt-3">
                    <Card><CardContent className="p-3 space-y-3">
                      <h4 className="font-semibold text-sm">{bn ? 'দেখান/লুকান' : 'Show/Hide'}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {[{ k: 'showLogo', l: 'Show Logo', l_bn: 'লোগো দেখান' }, { k: 'showName', l: 'Show Name', l_bn: 'নাম দেখান' }, { k: 'showAddress', l: 'Show Address', l_bn: 'ঠিকানা দেখান' }, { k: 'showContact', l: 'Show Contact', l_bn: 'যোগাযোগ দেখান' }].map(i => (
                          <div key={i.k} className="flex items-center gap-2"><Switch checked={(config.header as any)[i.k]} onCheckedChange={v => updateHeader(i.k, v)} /><Label>{bn ? i.l_bn : i.l}</Label></div>
                        ))}
                      </div>
                    </CardContent></Card>

                    <Card><CardContent className="p-3 space-y-3">
                      <h4 className="font-semibold text-sm">{bn ? 'প্রতিষ্ঠানের তথ্য (ওভাররাইড)' : 'Institution Info (Override)'}</h4>
                      <p className="text-[11px] text-muted-foreground">{bn ? 'খালি রাখলে ডিফল্ট প্রতিষ্ঠানের তথ্য ব্যবহার হবে' : 'Leave empty to use default institution data'}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>{bn ? 'প্রতিষ্ঠানের নাম (EN)' : 'Institution Name (EN)'}</Label><Input value={config.header.institutionName || ''} onChange={e => updateHeader('institutionName', e.target.value)} placeholder={institution?.name_en || 'Default'} /></div>
                        <div><Label>{bn ? 'প্রতিষ্ঠানের নাম (BN)' : 'Institution Name (BN)'}</Label><Input value={config.header.institutionName_bn || ''} onChange={e => updateHeader('institutionName_bn', e.target.value)} placeholder={institution?.name || 'Default'} /></div>
                        <div className="col-span-2"><Label>{bn ? 'ঠিকানা' : 'Address'}</Label><Input value={config.header.institutionAddress || ''} onChange={e => updateHeader('institutionAddress', e.target.value)} placeholder={institution?.address || 'Default'} /></div>
                        <div><Label>{bn ? 'ফোন' : 'Phone'}</Label><Input value={config.header.institutionPhone || ''} onChange={e => updateHeader('institutionPhone', e.target.value)} placeholder={institution?.phone || 'Default'} /></div>
                        <div><Label>{bn ? 'ইমেইল' : 'Email'}</Label><Input value={config.header.institutionEmail || ''} onChange={e => updateHeader('institutionEmail', e.target.value)} placeholder={institution?.email || 'Default'} /></div>
                        <div className="col-span-2"><Label>{bn ? 'লোগো URL' : 'Logo URL'}</Label><Input value={config.header.logoUrl || ''} onChange={e => updateHeader('logoUrl', e.target.value)} placeholder={bn ? 'ডিফল্ট লোগো ব্যবহার হবে' : 'Uses default logo'} /></div>
                      </div>
                    </CardContent></Card>

                    <Card><CardContent className="p-3 space-y-3">
                      <h4 className="font-semibold text-sm">{bn ? 'কাস্টম টাইটেল' : 'Custom Titles'}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>{bn ? 'শিরোনাম (EN)' : 'Title (EN)'}</Label><Input value={config.header.customTitle} onChange={e => updateHeader('customTitle', e.target.value)} /></div>
                        <div><Label>{bn ? 'শিরোনাম (BN)' : 'Title (BN)'}</Label><Input value={config.header.customTitle_bn} onChange={e => updateHeader('customTitle_bn', e.target.value)} /></div>
                        <div><Label>{bn ? 'সাবটাইটেল (EN)' : 'Subtitle (EN)'}</Label><Input value={config.header.customSubtitle} onChange={e => updateHeader('customSubtitle', e.target.value)} /></div>
                        <div><Label>{bn ? 'সাবটাইটেল (BN)' : 'Subtitle (BN)'}</Label><Input value={config.header.customSubtitle_bn} onChange={e => updateHeader('customSubtitle_bn', e.target.value)} /></div>
                      </div>
                    </CardContent></Card>
                  </TabsContent>

                  {/* Sections Tab */}
                  <TabsContent value="sections" className="space-y-3 mt-3">
                    {config.sections.map((sec, si) => (
                      <Card
                        key={sec.id}
                        draggable
                        onDragStart={e => handleSectionDragStart(e, si)}
                        onDragOver={e => handleSectionDragOver(e, si)}
                        onDrop={e => handleSectionDrop(e, si)}
                        onDragEnd={() => setDragOverSection(null)}
                        className={`transition-all ${dragOverSection === si ? 'ring-2 ring-primary border-primary' : ''}`}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
                            <Input value={sec.name} onChange={e => updateSection(sec.id, 'name', e.target.value)} className="flex-1 h-8 text-sm" placeholder="Section Name (EN)" />
                            <Input value={sec.name_bn} onChange={e => updateSection(sec.id, 'name_bn', e.target.value)} className="flex-1 h-8 text-sm" placeholder="সেকশনের নাম (BN)" />
                            <Button size="icon" variant="ghost" onClick={() => updateSection(sec.id, 'collapsed', !sec.collapsed)}>{sec.collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}</Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeSection(sec.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>

                          {/* Section Style Controls */}
                          {!sec.collapsed && (
                            <div className="flex items-center gap-2 pl-6 flex-wrap">
                              <div className="flex items-center gap-1">
                                <Label className="text-[10px] whitespace-nowrap">{bn ? 'সাইজ' : 'Size'}</Label>
                                <div className="w-20">
                                  <Slider
                                    value={[sec.style?.fontSize || 13]}
                                    min={10} max={24} step={1}
                                    onValueChange={([v]) => updateSectionStyle(sec.id, 'fontSize', v)}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground w-6">{sec.style?.fontSize || 13}px</span>
                              </div>

                              <Separator orientation="vertical" className="h-5" />

                              <div className="flex items-center gap-1">
                                <Label className="text-[10px]">{bn ? 'রং' : 'Color'}</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="w-5 h-5 rounded border border-border" style={{ backgroundColor: sec.style?.color || '#000000' }} />
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-2" align="start">
                                    <div className="grid grid-cols-5 gap-1 mb-2">
                                      {PRESET_COLORS.map(c => (
                                        <button key={c} className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform" style={{ backgroundColor: c }}
                                          onClick={() => updateSectionStyle(sec.id, 'color', c)} />
                                      ))}
                                    </div>
                                    <Input type="color" value={sec.style?.color || '#000000'} onChange={e => updateSectionStyle(sec.id, 'color', e.target.value)} className="h-7 w-full p-0 border-0" />
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <Separator orientation="vertical" className="h-5" />

                              <div className="flex items-center gap-1">
                                <Label className="text-[10px]">{bn ? 'ব্যাকগ্রাউন্ড' : 'BG'}</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="w-5 h-5 rounded border border-border" style={{ backgroundColor: sec.style?.bgColor || '#f3f4f6' }} />
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-2" align="start">
                                    <div className="grid grid-cols-5 gap-1 mb-2">
                                      {['#f3f4f6','#e5e7eb','#d1d5db','#fef3c7','#dbeafe','#d1fae5','#fce7f3','#ede9fe','#ffffff','#000000'].map(c => (
                                        <button key={c} className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform" style={{ backgroundColor: c }}
                                          onClick={() => updateSectionStyle(sec.id, 'bgColor', c)} />
                                      ))}
                                    </div>
                                    <Input type="color" value={sec.style?.bgColor || '#f3f4f6'} onChange={e => updateSectionStyle(sec.id, 'bgColor', e.target.value)} className="h-7 w-full p-0 border-0" />
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <Separator orientation="vertical" className="h-5" />

                              <div className="flex items-center gap-0.5">
                                {(['left', 'center', 'right'] as const).map(align => (
                                  <Button key={align} size="icon" variant={(sec.style?.textAlign || 'left') === align ? 'default' : 'ghost'}
                                    className="h-6 w-6" onClick={() => updateSectionStyle(sec.id, 'textAlign', align)}>
                                    {align === 'left' && <AlignLeft className="w-3 h-3" />}
                                    {align === 'center' && <AlignCenter className="w-3 h-3" />}
                                    {align === 'right' && <AlignRight className="w-3 h-3" />}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Fields with drag & drop */}
                          {!sec.collapsed && (
                            <div className="space-y-1.5 pl-6">
                              {sec.fields.map((f, fi) => {
                                const FIcon = FIELD_TYPE_ICONS[f.type] || Type;
                                return (
                                  <div
                                    key={f.id}
                                    draggable
                                    onDragStart={e => { e.stopPropagation(); handleFieldDragStart(e, sec.id, fi); }}
                                    onDragOver={e => { e.stopPropagation(); handleFieldDragOver(e, sec.id, fi); }}
                                    onDrop={e => { e.stopPropagation(); handleFieldDrop(e, sec.id, fi); }}
                                    onDragEnd={() => setDragOverField(null)}
                                    className={`flex items-center gap-1.5 bg-secondary/30 rounded p-1.5 transition-all cursor-move ${
                                      dragOverField?.sectionId === sec.id && dragOverField?.fieldIndex === fi ? 'ring-2 ring-primary bg-primary/10' : ''
                                    }`}
                                  >
                                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab shrink-0" />
                                    <FIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <Input value={f.label} onChange={e => updateField(sec.id, f.id, 'label', e.target.value)} className="h-7 text-xs flex-1" placeholder="EN" />
                                    <Input value={f.label_bn} onChange={e => updateField(sec.id, f.id, 'label_bn', e.target.value)} className="h-7 text-xs flex-1" placeholder="BN" />
                                    <Select value={f.type} onValueChange={v => updateField(sec.id, f.id, 'type', v)}>
                                      <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                                      <SelectContent>{Object.keys(FIELD_TYPE_ICONS).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select value={f.width} onValueChange={v => updateField(sec.id, f.id, 'width', v)}>
                                      <SelectTrigger className="h-7 text-xs w-16"><SelectValue /></SelectTrigger>
                                      <SelectContent><SelectItem value="half">½</SelectItem><SelectItem value="full">Full</SelectItem></SelectContent>
                                    </Select>
                                    <div className="flex items-center gap-1"><Switch checked={f.required} onCheckedChange={v => updateField(sec.id, f.id, 'required', v)} /><span className="text-[10px]">Req</span></div>
                                    <div className="flex items-center gap-1"><Switch checked={f.show} onCheckedChange={v => updateField(sec.id, f.id, 'show', v)} /><span className="text-[10px]">Show</span></div>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeField(sec.id, f.id)}><X className="w-3 h-3" /></Button>
                                  </div>
                                );
                              })}
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addField(sec.id)}><Plus className="w-3 h-3 mr-1" />{bn ? 'ফিল্ড যোগ' : 'Add Field'}</Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" onClick={addSection}><Plus className="w-4 h-4 mr-1" />{bn ? 'সেকশন যোগ' : 'Add Section'}</Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" disabled={importingForm || customForms.length === 0}>
                            <FolderOpen className="w-4 h-4 mr-1" />{importingForm ? (bn ? 'ইমপোর্ট হচ্ছে...' : 'Importing...') : (bn ? 'ফর্ম বিল্ডার থেকে ইমপোর্ট' : 'Import from Form Builder')}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {customForms.map(f => (
                            <DropdownMenuItem key={f.id} onClick={() => importFromFormBuilder(f.id)}>
                              {bn ? f.name_bn : f.name}
                            </DropdownMenuItem>
                          ))}
                          {customForms.length === 0 && (
                            <DropdownMenuItem disabled>{bn ? 'কোনো ফর্ম নেই' : 'No forms available'}</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TabsContent>

                  {/* Receipt Tab */}
                  <TabsContent value="receipt" className="space-y-3 mt-3">
                    <Card><CardContent className="p-3 space-y-2">
                      <h4 className="font-semibold text-sm">{bn ? 'ডেটা ফিল্ড দেখান/লুকান' : 'Show/Hide Data Fields'}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[{ k: 'studentId', l: 'Student ID', l_bn: 'আইডি' }, { k: 'date', l: 'Date', l_bn: 'তারিখ' }, { k: 'amountInWords', l: 'Amount in Words', l_bn: 'কথায় টাকা' }, { k: 'receiptNo', l: 'Receipt No', l_bn: 'রসিদ নম্বর' }].map(i => (
                          <div key={i.k} className="flex items-center gap-2"><Switch checked={(config.showFields as any)[i.k]} onCheckedChange={v => setConfig(c => ({ ...c, showFields: { ...c.showFields, [i.k]: v } }))} /><Label>{bn ? i.l_bn : i.l}</Label></div>
                        ))}
                      </div>
                    </CardContent></Card>
                    <Card><CardContent className="p-3 space-y-2">
                      <h4 className="font-semibold text-sm">{bn ? 'রসিদ সারি' : 'Receipt Rows'}</h4>
                      {config.receiptRows.map((r, ri) => (
                        <div key={r.id} className="flex items-center gap-1.5 bg-secondary/30 rounded p-1.5">
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => moveReceiptRow(ri, -1)} disabled={ri === 0} className="p-0.5 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                            <button onClick={() => moveReceiptRow(ri, 1)} disabled={ri === config.receiptRows.length - 1} className="p-0.5 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                          </div>
                          <Input value={r.label} onChange={e => updateReceiptRow(r.id, 'label', e.target.value)} className="h-7 text-xs flex-1" placeholder="EN" />
                          <Input value={r.label_bn} onChange={e => updateReceiptRow(r.id, 'label_bn', e.target.value)} className="h-7 text-xs flex-1" placeholder="BN" />
                          <Select value={r.type} onValueChange={v => updateReceiptRow(r.id, 'type', v)}>
                            <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="fee">Fee</SelectItem><SelectItem value="amount">Total</SelectItem><SelectItem value="info">Info</SelectItem></SelectContent>
                          </Select>
                          <Switch checked={r.show} onCheckedChange={v => updateReceiptRow(r.id, 'show', v)} />
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeReceiptRow(r.id)}><X className="w-3 h-3" /></Button>
                        </div>
                      ))}
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addReceiptRow}><Plus className="w-3 h-3 mr-1" />{bn ? 'সারি যোগ' : 'Add Row'}</Button>
                    </CardContent></Card>
                  </TabsContent>

                  {/* Footer Tab */}
                  <TabsContent value="footer" className="space-y-3 mt-3">
                    <Card><CardContent className="p-3 space-y-3">
                      <h4 className="font-semibold text-sm">{bn ? 'স্বাক্ষর লাইন' : 'Signature Lines'}</h4>
                      {config.footer.signatures.map(sig => (
                        <div key={sig.id} className="flex items-center gap-2">
                          <Pen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <Input value={sig.title} onChange={e => updateSignature(sig.id, 'title', e.target.value)} className="h-7 text-xs flex-1" placeholder="EN" />
                          <Input value={sig.title_bn} onChange={e => updateSignature(sig.id, 'title_bn', e.target.value)} className="h-7 text-xs flex-1" placeholder="BN" />
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeSignature(sig.id)}><X className="w-3 h-3" /></Button>
                        </div>
                      ))}
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addSignature}><Plus className="w-3 h-3 mr-1" />{bn ? 'স্বাক্ষর যোগ' : 'Add Signature'}</Button>
                    </CardContent></Card>
                    <Card><CardContent className="p-3 space-y-3">
                      <h4 className="font-semibold text-sm">{bn ? 'শর্তাবলী ও কপিরাইট' : 'Terms & Copyright'}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Terms (EN)</Label><Textarea value={config.footer.termsText} onChange={e => setConfig(c => ({ ...c, footer: { ...c.footer, termsText: e.target.value } }))} className="text-xs h-16" /></div>
                        <div><Label>Terms (BN)</Label><Textarea value={config.footer.termsText_bn} onChange={e => setConfig(c => ({ ...c, footer: { ...c.footer, termsText_bn: e.target.value } }))} className="text-xs h-16" /></div>
                      </div>
                      <div><Label>Copyright</Label><Input value={config.footer.copyrightText} onChange={e => setConfig(c => ({ ...c, footer: { ...c.footer, copyrightText: e.target.value } }))} className="text-xs" /></div>
                    </CardContent></Card>
                  </TabsContent>

                  {/* Mobile Preview */}
                  <TabsContent value="preview" className="mt-3 lg:hidden">
                    <div className="space-y-2">
                      <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="w-3 h-3 mr-1" />{bn ? 'প্রিন্ট' : 'Print'}</Button>
                      {renderPreview()}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
            <div className="hidden lg:flex flex-col w-1/2">
              <div className="flex items-center justify-between p-3 border-b border-border">
                <span className="text-sm font-semibold">{bn ? 'লাইভ প্রিভিউ' : 'Live Preview'}</span>
                <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="w-3 h-3 mr-1" />{bn ? 'প্রিন্ট' : 'Print'}</Button>
              </div>
              <ScrollArea className="flex-1 p-4">{renderPreview()}</ScrollArea>
            </div>
          </div>
          <div className="flex justify-end gap-2 p-4 border-t border-border">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>{saveMutation.isPending ? (bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (bn ? 'সংরক্ষণ' : 'Save Template')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentLayoutBuilder;
