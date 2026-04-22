import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import {
  Loader2, Plus, Pencil, Trash2, FileText, Save, Tag, Eye, Copy,
  Receipt, GraduationCap, CalendarX, ClipboardList, Bell, Sparkles,
  AsteriskSquare, X, GripVertical, AlertCircle,
} from 'lucide-react';

type VarType = 'text' | 'number' | 'date' | 'currency';

interface VariableRule {
  key: string;
  label: string;
  required: boolean;
  type: VarType;
  placeholder?: string;
  default_value?: string;
}

interface Template {
  id: string;
  template_key: string;
  name: string;
  name_bn: string;
  category: string;
  description: string | null;
  body_en: string;
  body_bn: string;
  variables: string[];
  variable_rules: VariableRule[];
  meta_template_name: string | null;
  meta_language_code: string | null;
  use_meta_template: boolean;
  is_active: boolean;
  sort_order: number | null;
}

const CATEGORY_META: Record<string, { icon: any; color: string; labelBn: string; labelEn: string }> = {
  fee: { icon: Receipt, color: 'text-emerald-600 bg-emerald-500/10', labelBn: 'ফি', labelEn: 'Fee' },
  result: { icon: GraduationCap, color: 'text-blue-600 bg-blue-500/10', labelBn: 'ফলাফল', labelEn: 'Result' },
  attendance: { icon: CalendarX, color: 'text-amber-600 bg-amber-500/10', labelBn: 'হাজিরা', labelEn: 'Attendance' },
  exam: { icon: ClipboardList, color: 'text-purple-600 bg-purple-500/10', labelBn: 'পরীক্ষা', labelEn: 'Exam' },
  general: { icon: Bell, color: 'text-slate-600 bg-slate-500/10', labelBn: 'সাধারণ', labelEn: 'General' },
};

const SUGGESTED_VARS = [
  'student_name', 'class', 'roll', 'month', 'amount', 'receipt_no',
  'due_date', 'date', 'exam_name', 'gpa', 'position', 'institution', 'message',
];

const VAR_TYPE_LABELS: Record<VarType, { bn: string; en: string }> = {
  text: { bn: 'টেক্সট', en: 'Text' },
  number: { bn: 'সংখ্যা', en: 'Number' },
  date: { bn: 'তারিখ', en: 'Date' },
  currency: { bn: 'মুদ্রা', en: 'Currency' },
};

const emptyForm = (): Omit<Template, 'id'> => ({
  template_key: '',
  name: '',
  name_bn: '',
  category: 'general',
  description: '',
  body_en: '',
  body_bn: '',
  variables: [],
  variable_rules: [],
  meta_template_name: '',
  meta_language_code: 'bn',
  use_meta_template: false,
  is_active: true,
  sort_order: 0,
});

const detectVars = (text: string) => {
  const matches = text.match(/\{([a-z_][a-z0-9_]*)\}/gi) || [];
  return [...new Set(matches.map(m => m.slice(1, -1)))];
};

const WhatsAppTemplatesManager = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();

  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState<Omit<Template, 'id'>>(emptyForm());
  const [open, setOpen] = useState(false);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState<Template | null>(null);
  const [filterCat, setFilterCat] = useState<string>('all');
  const [saving, setSaving] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Template[];
    },
  });

  const filtered = filterCat === 'all' ? templates : templates.filter(t => t.category === filterCat);

  // Auto-sync rules when message body changes — add new vars, keep existing rules
  useEffect(() => {
    if (!open) return;
    const detected = [...new Set([...detectVars(form.body_bn), ...detectVars(form.body_en)])];
    const existing = new Map(form.variable_rules.map(r => [r.key, r]));
    const merged: VariableRule[] = detected.map(key =>
      existing.get(key) || { key, label: key, required: false, type: 'text', placeholder: '', default_value: '' }
    );
    // Keep manually-added rules whose keys aren't yet in the body
    form.variable_rules.forEach(r => {
      if (!detected.includes(r.key) && !merged.find(m => m.key === r.key)) merged.push(r);
    });
    if (JSON.stringify(merged) !== JSON.stringify(form.variable_rules)) {
      setForm(f => ({ ...f, variable_rules: merged, variables: merged.map(r => r.key) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.body_bn, form.body_en, open]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({
      template_key: t.template_key,
      name: t.name,
      name_bn: t.name_bn,
      category: t.category,
      description: t.description || '',
      body_en: t.body_en || '',
      body_bn: t.body_bn,
      variables: t.variables || [],
      variable_rules: t.variable_rules || [],
      meta_template_name: t.meta_template_name || '',
      meta_language_code: t.meta_language_code || 'bn',
      use_meta_template: t.use_meta_template,
      is_active: t.is_active,
      sort_order: t.sort_order || 0,
    });
    setOpen(true);
  };

  const updateRule = (idx: number, patch: Partial<VariableRule>) => {
    setForm(f => ({
      ...f,
      variable_rules: f.variable_rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));
  };

  const removeRule = (idx: number) => {
    setForm(f => ({
      ...f,
      variable_rules: f.variable_rules.filter((_, i) => i !== idx),
      variables: f.variable_rules.filter((_, i) => i !== idx).map(r => r.key),
    }));
  };

  const addCustomRule = () => {
    setForm(f => ({
      ...f,
      variable_rules: [
        ...f.variable_rules,
        { key: `var_${f.variable_rules.length + 1}`, label: '', required: false, type: 'text', placeholder: '', default_value: '' },
      ],
    }));
  };

  const handleSave = async () => {
    if (!form.template_key.trim() || !form.name_bn.trim() || !form.body_bn.trim()) {
      toast({ title: bn ? 'প্রয়োজনীয় ফিল্ড পূরণ করুন' : 'Fill required fields', variant: 'destructive' });
      return;
    }
    // Validate rule keys are unique and valid
    const keys = form.variable_rules.map(r => r.key.trim()).filter(Boolean);
    if (new Set(keys).size !== keys.length) {
      toast({ title: bn ? 'ভ্যারিয়েবল কী ইউনিক হতে হবে' : 'Variable keys must be unique', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const cleanRules = form.variable_rules
        .map(r => ({ ...r, key: r.key.trim() }))
        .filter(r => r.key);
      const payload = {
        ...form,
        template_key: form.template_key.trim().toLowerCase().replace(/\s+/g, '_'),
        variable_rules: cleanRules,
        variables: cleanRules.map(r => r.key),
      };

      if (editing) {
        const { error } = await supabase.from('whatsapp_templates').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('whatsapp_templates').insert(payload);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast({ title: bn ? 'সংরক্ষিত হয়েছে' : 'Saved' });
      setOpen(false);
    } catch (err: any) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(bn ? 'এই টেমপ্লেট মুছে ফেলবেন?' : 'Delete this template?')) return;
    const { error } = await supabase.from('whatsapp_templates').delete().eq('id', id);
    if (error) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['whatsapp-templates'] });
    toast({ title: bn ? 'মুছে ফেলা হয়েছে' : 'Deleted' });
  };

  const toggleActive = async (t: Template) => {
    await supabase.from('whatsapp_templates').update({ is_active: !t.is_active }).eq('id', t.id);
    qc.invalidateQueries({ queryKey: ['whatsapp-templates'] });
  };

  const insertVar = (v: string) => {
    setForm(f => ({ ...f, body_bn: `${f.body_bn}{${v}}` }));
  };

  const renderPreview = (body: string, vars: Record<string, string>) => {
    return body.replace(/\{([a-z_][a-z0-9_]*)\}/gi, (_, key) => vars[key] || `{${key}}`);
  };

  const validatePreview = (tpl: Template) => {
    const errors: Record<string, string> = {};
    (tpl.variable_rules || []).forEach(rule => {
      const val = (previewVars[rule.key] || rule.default_value || '').trim();
      if (rule.required && !val) {
        errors[rule.key] = bn ? 'এটি আবশ্যক' : 'Required';
        return;
      }
      if (!val) return;
      if (rule.type === 'number' && isNaN(Number(val))) {
        errors[rule.key] = bn ? 'সংখ্যা হতে হবে' : 'Must be a number';
      } else if (rule.type === 'currency' && isNaN(Number(val.replace(/[৳$,\s]/g, '')))) {
        errors[rule.key] = bn ? 'বৈধ মুদ্রা মান দিন' : 'Invalid currency value';
      } else if (rule.type === 'date' && isNaN(Date.parse(val))) {
        errors[rule.key] = bn ? 'বৈধ তারিখ দিন' : 'Invalid date';
      }
    });
    return errors;
  };

  const handleCopy = (tpl: Template) => {
    const errs = validatePreview(tpl);
    setPreviewErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({ title: bn ? 'বৈধতা ব্যর্থ' : 'Validation failed', description: bn ? 'আবশ্যক ফিল্ড পূরণ করুন' : 'Fill required fields', variant: 'destructive' });
      return;
    }
    const merged = { ...Object.fromEntries((tpl.variable_rules || []).map(r => [r.key, r.default_value || ''])), ...previewVars };
    navigator.clipboard.writeText(renderPreview(tpl.body_bn, merged));
    toast({ title: bn ? 'কপি করা হয়েছে' : 'Copied' });
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#25D366]" />
            {bn ? 'WhatsApp মেসেজ টেমপ্লেট' : 'WhatsApp Message Templates'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {bn
              ? 'ফি, ফলাফল, হাজিরা ইত্যাদির জন্য পুনরায় ব্যবহারযোগ্য টেমপ্লেট তৈরি করুন। প্রতিটি ভ্যারিয়েবলের জন্য টাইপ ও আবশ্যকতা সেট করুন।'
              : 'Create reusable templates with typed, validated variable placeholders.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bn ? 'সব ক্যাটেগরি' : 'All categories'}</SelectItem>
              {Object.entries(CATEGORY_META).map(([k, m]) => (
                <SelectItem key={k} value={k}>{bn ? m.labelBn : m.labelEn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openNew} className="gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white">
            <Plus className="w-4 h-4" />{bn ? 'নতুন' : 'New'}
          </Button>
        </div>
      </div>

      {/* Templates grid */}
      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          {bn ? 'কোনো টেমপ্লেট নেই। নতুন তৈরি করুন।' : 'No templates yet. Create one to get started.'}
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((t) => {
            const meta = CATEGORY_META[t.category] || CATEGORY_META.general;
            const Icon = meta.icon;
            const requiredCount = (t.variable_rules || []).filter(r => r.required).length;
            return (
              <Card key={t.id} className={`transition-all hover:shadow-md ${!t.is_active ? 'opacity-60' : ''}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm truncate">{bn ? t.name_bn : t.name}</h4>
                        <code className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">{t.template_key}</code>
                      </div>
                    </div>
                    <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} />
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {bn ? t.body_bn : (t.body_en || t.body_bn)}
                  </p>

                  {t.variable_rules && t.variable_rules.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {t.variable_rules.slice(0, 4).map(r => (
                        <Badge key={r.key} variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                          {r.required && <AsteriskSquare className="w-2.5 h-2.5 text-destructive" />}
                          <Tag className="w-2.5 h-2.5" />{r.key}
                        </Badge>
                      ))}
                      {t.variable_rules.length > 4 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{t.variable_rules.length - 4}</Badge>
                      )}
                      {requiredCount > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-0">
                          {requiredCount} {bn ? 'আবশ্যক' : 'required'}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/50">
                    <Button size="sm" variant="ghost" onClick={() => { setPreviewOpen(t); setPreviewVars({}); setPreviewErrors({}); }} className="h-8 px-2 gap-1.5">
                      <Eye className="w-3.5 h-3.5" />{bn ? 'প্রিভিউ' : 'Preview'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(t)} className="h-8 px-2 gap-1.5">
                      <Pencil className="w-3.5 h-3.5" />{bn ? 'এডিট' : 'Edit'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(t.id)} className="h-8 px-2 text-destructive hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#25D366]" />
              {editing ? (bn ? 'টেমপ্লেট এডিট' : 'Edit Template') : (bn ? 'নতুন টেমপ্লেট' : 'New Template')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{bn ? 'টেমপ্লেট কী' : 'Template key'} *</Label>
                <Input
                  value={form.template_key}
                  onChange={(e) => setForm({ ...form, template_key: e.target.value })}
                  placeholder="fee_paid"
                  disabled={!!editing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {bn ? 'ইউনিক আইডি (ছোট অক্ষরে)' : 'Unique identifier (lowercase)'}
                </p>
              </div>
              <div>
                <Label>{bn ? 'ক্যাটেগরি' : 'Category'} *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_META).map(([k, m]) => (
                      <SelectItem key={k} value={k}>{bn ? m.labelBn : m.labelEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{bn ? 'নাম (বাংলা)' : 'Name (Bengali)'} *</Label>
                <Input value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} />
              </div>
              <div>
                <Label>{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>{bn ? 'বিবরণ' : 'Description'}</Label>
              <Input
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={bn ? 'কখন ব্যবহার করা হবে...' : 'When this template is used...'}
              />
            </div>

            {/* Suggested variables */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <Label className="text-xs flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {bn ? 'ভ্যারিয়েবল যোগ করতে ক্লিক করুন' : 'Click to insert a variable'}
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_VARS.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVar(v)}
                    className="text-[11px] font-mono px-2 py-1 rounded-md bg-background border border-border hover:border-[#25D366] hover:text-[#25D366] transition-colors"
                  >
                    {`{${v}}`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>{bn ? 'মেসেজ বডি (বাংলা)' : 'Message body (Bengali)'} *</Label>
              <Textarea
                value={form.body_bn}
                onChange={(e) => setForm({ ...form, body_bn: e.target.value })}
                rows={4}
                placeholder={bn ? 'প্রিয় অভিভাবক, {student_name} ...' : 'Dear Guardian, {student_name} ...'}
              />
            </div>

            <div>
              <Label>{bn ? 'মেসেজ বডি (ইংরেজি)' : 'Message body (English)'}</Label>
              <Textarea
                value={form.body_en}
                onChange={(e) => setForm({ ...form, body_en: e.target.value })}
                rows={3}
                placeholder="Dear Guardian, {student_name} ..."
              />
            </div>

            {/* Variable rules editor */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#25D366]/5 to-emerald-500/5 border border-[#25D366]/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#25D366]" />
                    {bn ? 'ভ্যারিয়েবল ভ্যালিডেশন রুল' : 'Variable Validation Rules'}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bn ? 'প্রতিটি ভ্যারিয়েবলের জন্য টাইপ, লেবেল ও আবশ্যকতা নির্ধারণ করুন' : 'Define type, label, and required flag per variable'}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addCustomRule} className="gap-1.5 h-8">
                  <Plus className="w-3.5 h-3.5" />{bn ? 'কাস্টম' : 'Custom'}
                </Button>
              </div>

              {form.variable_rules.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  {bn ? 'মেসেজ বডিতে {variable} যোগ করুন বা কাস্টম রুল তৈরি করুন' : 'Add {variable} in message body or create a custom rule'}
                </div>
              ) : (
                <div className="space-y-2">
                  {form.variable_rules.map((rule, idx) => (
                    <div key={idx} className="bg-background rounded-xl border border-border/60 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <code className="text-[11px] font-mono px-2 py-1 rounded bg-muted/60 text-foreground">{`{${rule.key}}`}</code>
                        <div className="ml-auto flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                            <Switch
                              checked={rule.required}
                              onCheckedChange={(v) => updateRule(idx, { required: v })}
                            />
                            <span className={rule.required ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                              {bn ? 'আবশ্যক' : 'Required'}
                            </span>
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeRule(idx)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">{bn ? 'কী' : 'Key'}</Label>
                          <Input
                            className="h-8 text-xs font-mono"
                            value={rule.key}
                            onChange={(e) => updateRule(idx, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">{bn ? 'লেবেল' : 'Label'}</Label>
                          <Input
                            className="h-8 text-xs"
                            value={rule.label}
                            onChange={(e) => updateRule(idx, { label: e.target.value })}
                            placeholder={rule.key}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">{bn ? 'টাইপ' : 'Type'}</Label>
                          <Select value={rule.type} onValueChange={(v: VarType) => updateRule(idx, { type: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(Object.keys(VAR_TYPE_LABELS) as VarType[]).map(t => (
                                <SelectItem key={t} value={t}>{bn ? VAR_TYPE_LABELS[t].bn : VAR_TYPE_LABELS[t].en}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">{bn ? 'ডিফল্ট' : 'Default'}</Label>
                          <Input
                            className="h-8 text-xs"
                            value={rule.default_value || ''}
                            onChange={(e) => updateRule(idx, { default_value: e.target.value })}
                            placeholder={rule.placeholder}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">{bn ? 'Meta Approved Template ব্যবহার' : 'Use Meta Approved Template'}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bn ? '২৪ ঘণ্টা সেশন উইন্ডোর বাইরে পাঠাতে প্রয়োজন' : 'Required to send outside 24-hour session window'}
                  </p>
                </div>
                <Switch
                  checked={form.use_meta_template}
                  onCheckedChange={(v) => setForm({ ...form, use_meta_template: v })}
                />
              </div>
              {form.use_meta_template && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
                  <div>
                    <Label className="text-xs">{bn ? 'Meta টেমপ্লেট নাম' : 'Meta template name'}</Label>
                    <Input
                      value={form.meta_template_name || ''}
                      onChange={(e) => setForm({ ...form, meta_template_name: e.target.value })}
                      placeholder="fee_payment_confirmation"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'ভাষা কোড' : 'Language code'}</Label>
                    <Select
                      value={form.meta_language_code || 'bn'}
                      onValueChange={(v) => setForm({ ...form, meta_language_code: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bn">বাংলা (bn)</SelectItem>
                        <SelectItem value="en">English (en)</SelectItem>
                        <SelectItem value="en_US">English US (en_US)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <Label>{bn ? 'সক্রিয়' : 'Active'}</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {bn ? 'সংরক্ষণ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewOpen} onOpenChange={(o) => { if (!o) { setPreviewOpen(null); setPreviewVars({}); setPreviewErrors({}); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#25D366]" />
              {bn ? 'টেমপ্লেট প্রিভিউ' : 'Template Preview'}
            </DialogTitle>
          </DialogHeader>
          {previewOpen && (
            <div className="space-y-4">
              {previewOpen.variable_rules && previewOpen.variable_rules.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">{bn ? 'ভ্যারিয়েবল মান দিন' : 'Fill variables'}</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {previewOpen.variable_rules.map(rule => {
                      const inputType = rule.type === 'date' ? 'date' : rule.type === 'number' || rule.type === 'currency' ? 'text' : 'text';
                      const err = previewErrors[rule.key];
                      return (
                        <div key={rule.key}>
                          <Label className="text-[10px] flex items-center gap-1">
                            <span className="font-medium">{rule.label || rule.key}</span>
                            {rule.required && <span className="text-destructive">*</span>}
                            <code className="text-[9px] font-mono text-muted-foreground ml-auto">{`{${rule.key}}`}</code>
                          </Label>
                          <Input
                            type={inputType}
                            className={`h-8 text-xs ${err ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
                            value={previewVars[rule.key] ?? rule.default_value ?? ''}
                            onChange={(e) => {
                              setPreviewVars({ ...previewVars, [rule.key]: e.target.value });
                              if (err) setPreviewErrors({ ...previewErrors, [rule.key]: '' });
                            }}
                            placeholder={rule.placeholder || rule.label || rule.key}
                          />
                          {err && (
                            <p className="text-[10px] text-destructive flex items-center gap-1 mt-0.5">
                              <AlertCircle className="w-2.5 h-2.5" />{err}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-[#DCF8C6] dark:bg-[#005C4B] p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed shadow-sm">
                {renderPreview(
                  previewOpen.body_bn,
                  { ...Object.fromEntries((previewOpen.variable_rules || []).map(r => [r.key, r.default_value || ''])), ...previewVars },
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => handleCopy(previewOpen)}
              >
                <Copy className="w-3.5 h-3.5" />{bn ? 'কপি করুন (ভ্যালিডেট সহ)' : 'Copy (with validation)'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppTemplatesManager;
