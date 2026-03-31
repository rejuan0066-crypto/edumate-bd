import { useState } from 'react';
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
  ToggleLeft, Mail, Phone, Pen
} from 'lucide-react';

// ─── Types ───
interface LayoutField {
  id: string; label: string; label_bn: string;
  type: 'text' | 'number' | 'date' | 'select' | 'photo' | 'textarea' | 'toggle' | 'email' | 'phone';
  required: boolean; options?: string[]; show: boolean; width: 'full' | 'half';
}
interface LayoutSection { id: string; name: string; name_bn: string; fields: LayoutField[]; collapsed: boolean; }
interface SignatureLine { id: string; title: string; title_bn: string; }
interface ReceiptRow { id: string; label: string; label_bn: string; type: 'fee' | 'amount' | 'info'; show: boolean; }
interface LayoutConfig {
  header: { showLogo: boolean; showName: boolean; showAddress: boolean; showContact: boolean; customTitle: string; customTitle_bn: string; customSubtitle: string; customSubtitle_bn: string; };
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

  const { data: layouts = [], isLoading } = useQuery({
    queryKey: ['document_layouts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('document_layouts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({ ...d, config: d.config as LayoutConfig })) as DocumentLayout[];
    },
  });

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

  // Helpers
  const addSection = () => setConfig(c => ({ ...c, sections: [...c.sections, { id: uid(), name: 'New Section', name_bn: 'নতুন সেকশন', fields: [], collapsed: false }] }));
  const removeSection = (sid: string) => setConfig(c => ({ ...c, sections: c.sections.filter(s => s.id !== sid) }));
  const updateSection = (sid: string, key: string, val: any) => setConfig(c => ({ ...c, sections: c.sections.map(s => s.id === sid ? { ...s, [key]: val } : s) }));
  const moveSection = (idx: number, dir: -1 | 1) => { setConfig(c => { const arr = [...c.sections]; const ni = idx + dir; if (ni < 0 || ni >= arr.length) return c; [arr[idx], arr[ni]] = [arr[ni], arr[idx]]; return { ...c, sections: arr }; }); };

  const addField = (sid: string) => setConfig(c => ({ ...c, sections: c.sections.map(s => s.id === sid ? { ...s, fields: [...s.fields, { id: uid(), label: 'New Field', label_bn: 'নতুন ফিল্ড', type: 'text', required: false, show: true, width: 'half' }] } : s) }));
  const removeField = (sid: string, fid: string) => setConfig(c => ({ ...c, sections: c.sections.map(s => s.id === sid ? { ...s, fields: s.fields.filter(f => f.id !== fid) } : s) }));
  const updateField = (sid: string, fid: string, key: string, val: any) => setConfig(c => ({ ...c, sections: c.sections.map(s => s.id === sid ? { ...s, fields: s.fields.map(f => f.id === fid ? { ...f, [key]: val } : f) } : s) }));
  const moveField = (sid: string, idx: number, dir: -1 | 1) => { setConfig(c => ({ ...c, sections: c.sections.map(s => { if (s.id !== sid) return s; const arr = [...s.fields]; const ni = idx + dir; if (ni < 0 || ni >= arr.length) return s; [arr[idx], arr[ni]] = [arr[ni], arr[idx]]; return { ...s, fields: arr }; }) })); };

  const addSignature = () => setConfig(c => ({ ...c, footer: { ...c.footer, signatures: [...c.footer.signatures, { id: uid(), title: 'Signature', title_bn: 'স্বাক্ষর' }] } }));
  const removeSignature = (sid: string) => setConfig(c => ({ ...c, footer: { ...c.footer, signatures: c.footer.signatures.filter(s => s.id !== sid) } }));
  const updateSignature = (sid: string, key: string, val: string) => setConfig(c => ({ ...c, footer: { ...c.footer, signatures: c.footer.signatures.map(s => s.id === sid ? { ...s, [key]: val } : s) } }));

  const addReceiptRow = () => setConfig(c => ({ ...c, receiptRows: [...c.receiptRows, { id: uid(), label: 'Item', label_bn: 'আইটেম', type: 'fee', show: true }] }));
  const removeReceiptRow = (rid: string) => setConfig(c => ({ ...c, receiptRows: c.receiptRows.filter(r => r.id !== rid) }));
  const updateReceiptRow = (rid: string, key: string, val: any) => setConfig(c => ({ ...c, receiptRows: c.receiptRows.map(r => r.id === rid ? { ...r, [key]: val } : r) }));
  const moveReceiptRow = (idx: number, dir: -1 | 1) => { setConfig(c => { const arr = [...c.receiptRows]; const ni = idx + dir; if (ni < 0 || ni >= arr.length) return c; [arr[idx], arr[ni]] = [arr[ni], arr[idx]]; return { ...c, receiptRows: arr }; }); };

  const handlePrint = () => {
    const el = document.getElementById('layout-preview-area');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${formName}</title><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Noto Sans Bengali',sans-serif;padding:20mm;font-size:12px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #333;padding:6px 8px;text-align:left}.footer-area{margin-top:32px;display:flex;justify-content:space-between}@media print{@page{margin:15mm}}</style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const renderPreview = () => {
    const inst = institution;
    return (
      <div id="layout-preview-area" className="bg-white text-black p-6 text-xs min-h-[400px] border border-border rounded-lg">
        <div className="text-center mb-4">
          {config.header.showLogo && inst?.logo_url && <img src={inst.logo_url} alt="Logo" className="mx-auto h-12 mb-2" />}
          {config.header.showName && <h2 className="text-lg font-bold">{inst?.name || 'প্রতিষ্ঠানের নাম'}</h2>}
          {config.header.showAddress && inst?.address && <p className="text-[10px]">{inst.address}</p>}
          {config.header.showContact && (inst?.phone || inst?.email) && <p className="text-[10px]">{inst.phone} {inst.email && `| ${inst.email}`}</p>}
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
        {formType === 'form' && config.sections.map(sec => (
          <div key={sec.id} className="mb-3">
            <h4 className="text-xs font-bold bg-gray-100 px-2 py-1 border border-gray-300">{bn ? sec.name_bn : sec.name}</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 p-2 border border-t-0 border-gray-300">
              {sec.fields.filter(f => f.show).map(f => (
                <div key={f.id} className={f.width === 'full' ? 'col-span-2' : ''}>
                  <span className="text-[10px]">{bn ? f.label_bn : f.label}{f.required && <span className="text-red-500">*</span>}: </span>
                  {f.type === 'photo' ? <div className="inline-block w-16 h-16 border border-dashed border-gray-400 text-center text-[8px] leading-[60px]">Photo</div> : <span className="border-b border-dotted border-gray-400 inline-block min-w-[80px]">&nbsp;</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
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
  };

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

                  {/* Header */}
                  <TabsContent value="header" className="space-y-3 mt-3">
                    <Card><CardContent className="p-3 space-y-3">
                      <h4 className="font-semibold text-sm">{bn ? 'হেডার সেটিংস' : 'Header Settings'}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {[{ k: 'showLogo', l: 'Show Logo', l_bn: 'লোগো দেখান' }, { k: 'showName', l: 'Show Name', l_bn: 'নাম দেখান' }, { k: 'showAddress', l: 'Show Address', l_bn: 'ঠিকানা দেখান' }, { k: 'showContact', l: 'Show Contact', l_bn: 'যোগাযোগ দেখান' }].map(i => (
                          <div key={i.k} className="flex items-center gap-2"><Switch checked={(config.header as any)[i.k]} onCheckedChange={v => setConfig(c => ({ ...c, header: { ...c.header, [i.k]: v } }))} /><Label>{bn ? i.l_bn : i.l}</Label></div>
                        ))}
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>{bn ? 'কাস্টম শিরোনাম (EN)' : 'Custom Title (EN)'}</Label><Input value={config.header.customTitle} onChange={e => setConfig(c => ({ ...c, header: { ...c.header, customTitle: e.target.value } }))} /></div>
                        <div><Label>{bn ? 'কাস্টম শিরোনাম (BN)' : 'Custom Title (BN)'}</Label><Input value={config.header.customTitle_bn} onChange={e => setConfig(c => ({ ...c, header: { ...c.header, customTitle_bn: e.target.value } }))} /></div>
                        <div><Label>{bn ? 'সাবটাইটেল (EN)' : 'Subtitle (EN)'}</Label><Input value={config.header.customSubtitle} onChange={e => setConfig(c => ({ ...c, header: { ...c.header, customSubtitle: e.target.value } }))} /></div>
                        <div><Label>{bn ? 'সাবটাইটেল (BN)' : 'Subtitle (BN)'}</Label><Input value={config.header.customSubtitle_bn} onChange={e => setConfig(c => ({ ...c, header: { ...c.header, customSubtitle_bn: e.target.value } }))} /></div>
                      </div>
                    </CardContent></Card>
                  </TabsContent>

                  {/* Sections */}
                  <TabsContent value="sections" className="space-y-3 mt-3">
                    {config.sections.map((sec, si) => (
                      <Card key={sec.id}><CardContent className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => moveSection(si, -1)} disabled={si === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                            <button onClick={() => moveSection(si, 1)} disabled={si === config.sections.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                          </div>
                          <Input value={sec.name} onChange={e => updateSection(sec.id, 'name', e.target.value)} className="flex-1 h-8 text-sm" placeholder="Section Name (EN)" />
                          <Input value={sec.name_bn} onChange={e => updateSection(sec.id, 'name_bn', e.target.value)} className="flex-1 h-8 text-sm" placeholder="সেকশনের নাম (BN)" />
                          <Button size="icon" variant="ghost" onClick={() => updateSection(sec.id, 'collapsed', !sec.collapsed)}>{sec.collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}</Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeSection(sec.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                        {!sec.collapsed && (
                          <div className="space-y-1.5 pl-6">
                            {sec.fields.map((f, fi) => {
                              const FIcon = FIELD_TYPE_ICONS[f.type] || Type;
                              return (
                                <div key={f.id} className="flex items-center gap-1.5 bg-secondary/30 rounded p-1.5">
                                  <div className="flex flex-col gap-0.5">
                                    <button onClick={() => moveField(sec.id, fi, -1)} disabled={fi === 0} className="p-0.5 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                                    <button onClick={() => moveField(sec.id, fi, 1)} disabled={fi === sec.fields.length - 1} className="p-0.5 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                                  </div>
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
                      </CardContent></Card>
                    ))}
                    <Button variant="outline" onClick={addSection}><Plus className="w-4 h-4 mr-1" />{bn ? 'সেকশন যোগ' : 'Add Section'}</Button>
                  </TabsContent>

                  {/* Receipt */}
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

                  {/* Footer */}
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
