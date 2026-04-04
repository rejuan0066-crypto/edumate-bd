import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { toast } from 'sonner';
import {
  Plus, Edit2, Trash2, Calculator, GraduationCap, Wallet,
  Receipt, CreditCard, Variable, FlaskConical, Search
} from 'lucide-react';

const MODULE_OPTIONS = [
  { value: 'fee', label: 'Fee', label_bn: 'ফি', icon: CreditCard },
  { value: 'salary', label: 'Salary', label_bn: 'বেতন', icon: Wallet },
  { value: 'expense', label: 'Expense', label_bn: 'খরচ', icon: Receipt },
  { value: 'grade', label: 'Grade', label_bn: 'গ্রেড', icon: GraduationCap },
];

const FORMULA_TYPES = [
  { value: 'calculation', label: 'Calculation', label_bn: 'হিসাব' },
  { value: 'grade_rule', label: 'Grade Rule', label_bn: 'গ্রেড রুল' },
  { value: 'deduction', label: 'Deduction', label_bn: 'কর্তন' },
  { value: 'bonus', label: 'Bonus', label_bn: 'বোনাস' },
  { value: 'condition', label: 'Condition', label_bn: 'শর্ত' },
];

const SALARY_PRESETS = [
  { name: 'Net Salary', name_bn: 'নিট বেতন', formula: 'base_salary + bonus + overtime + other_allowance - late_deduction - absence_deduction - advance_deduction - other_deduction', result_field: 'net_salary', type: 'calculation',
    vars: [
      { key: 'base_salary', label: 'মূল বেতন', label_en: 'Base Salary' },
      { key: 'bonus', label: 'বোনাস', label_en: 'Bonus' },
      { key: 'overtime', label: 'ওভারটাইম', label_en: 'Overtime' },
      { key: 'other_allowance', label: 'অন্যান্য ভাতা', label_en: 'Other Allowance' },
      { key: 'late_deduction', label: 'বিলম্ব উপস্থিত কর্তন', label_en: 'Late Present Deduction' },
      { key: 'absence_deduction', label: 'অনুপস্থিতি কর্তন', label_en: 'Absence Deduction' },
      { key: 'advance_deduction', label: 'অগ্রিম কর্তন', label_en: 'Advance Deduction' },
      { key: 'other_deduction', label: 'অন্যান্য কর্তন', label_en: 'Other Deduction' },
    ]},
  { name: 'Absence Deduction', name_bn: 'অনুপস্থিতি কর্তন', formula: '(base_salary / working_days) * absent_days', result_field: 'absence_deduction', type: 'deduction',
    vars: [
      { key: 'base_salary', label: 'মূল বেতন', label_en: 'Base Salary' },
      { key: 'working_days', label: 'কর্মদিবস', label_en: 'Working Days' },
      { key: 'absent_days', label: 'অনুপস্থিত দিন', label_en: 'Absent Days' },
    ]},
  { name: 'Eid Bonus', name_bn: 'ঈদ বোনাস', formula: 'base_salary * (percentage / 100)', result_field: 'eid_bonus', type: 'bonus',
    vars: [
      { key: 'base_salary', label: 'মূল বেতন', label_en: 'Base Salary' },
      { key: 'percentage', label: 'শতাংশ', label_en: 'Percentage' },
    ]},
];

type VariableItem = { key: string; label: string; label_en: string };

type FormulaData = {
  id?: string;
  name: string;
  name_bn: string;
  description: string;
  module: string;
  formula_type: string;
  expression: any;
  variables: VariableItem[];
  is_active: boolean;
  sort_order: number;
};

const emptyFormula: FormulaData = {
  name: '', name_bn: '', description: '', module: 'fee',
  formula_type: 'calculation', expression: { formula: '', result_field: '' },
  variables: [], is_active: true, sort_order: 0,
};

const emptyGradeFormula: FormulaData = {
  ...emptyFormula, module: 'grade', formula_type: 'grade_rule',
  expression: { min_marks: 0, max_marks: 100, grade: '', gpa: 0 },
};

const AdminFormulaBuilder = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/formula-builder');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formulaData, setFormulaData] = useState<FormulaData>(emptyFormula);
  const [activeTab, setActiveTab] = useState('all');
  const [varKey, setVarKey] = useState('');
  const [varLabel, setVarLabel] = useState('');
  const [varLabelEn, setVarLabelEn] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: formulas = [] } = useQuery({
    queryKey: ['formulas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('formulas').select('*').order('module').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FormulaData) => {
      const payload = {
        name: data.name, name_bn: data.name_bn, description: data.description,
        module: data.module, formula_type: data.formula_type,
        expression: data.expression, variables: data.variables as any,
        is_active: data.is_active, sort_order: data.sort_order,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await supabase.from('formulas').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('formulas').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formulas'] });
      setDialogOpen(false);
      setFormulaData(emptyFormula);
      setEditingId(null);
      toast.success(bn ? 'ফর্মুলা সেভ হয়েছে' : 'Formula saved');
    },
    onError: () => toast.error(bn ? 'সেভ করতে সমস্যা' : 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('formulas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formulas'] });
      toast.success(bn ? 'ফর্মুলা মুছে ফেলা হয়েছে' : 'Formula deleted');
    },
  });

  const openEdit = (f: any) => {
    const vars: VariableItem[] = Array.isArray(f.variables) ? f.variables : [];
    setFormulaData({
      name: f.name, name_bn: f.name_bn, description: f.description || '',
      module: f.module, formula_type: f.formula_type,
      expression: f.expression || {}, variables: vars,
      is_active: f.is_active, sort_order: f.sort_order,
    });
    setEditingId(f.id);
    setDialogOpen(true);
  };

  const addVariable = () => {
    if (!varKey.trim() || !varLabel.trim()) return;
    setFormulaData(p => ({
      ...p,
      variables: [...p.variables, { key: varKey.trim(), label: varLabel.trim(), label_en: varLabelEn.trim() }],
    }));
    setVarKey(''); setVarLabel(''); setVarLabelEn('');
  };

  const removeVariable = (idx: number) => {
    setFormulaData(p => ({ ...p, variables: p.variables.filter((_, i) => i !== idx) }));
  };

  const filtered = formulas.filter((f: any) => {
    const matchTab = activeTab === 'all' || f.module === activeTab;
    const matchSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.name_bn.includes(searchQuery);
    return matchTab && matchSearch;
  });

  const isGrade = formulaData.formula_type === 'grade_rule';

  const getModuleIcon = (mod: string) => {
    const m = MODULE_OPTIONS.find(o => o.value === mod);
    return m ? m.icon : Calculator;
  };

  const getModuleLabel = (mod: string) => {
    const m = MODULE_OPTIONS.find(o => o.value === mod);
    return m ? (bn ? m.label_bn : m.label) : mod;
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {bn ? 'ফর্মুলা ও লজিক বিল্ডার' : 'Formula & Logic Builder'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn ? 'ফি, বেতন, গ্রেড ইত্যাদির হিসাবের ফর্মুলা তৈরি ও এডিট করুন' : 'Create and edit formulas for fee, salary, grade calculations'}
            </p>
          </div>
          {canAddItem && <Button onClick={() => { setFormulaData({ ...emptyFormula, sort_order: formulas.length }); setEditingId(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> {bn ? 'নতুন ফর্মুলা' : 'New Formula'}
          </Button>}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MODULE_OPTIONS.map(mod => {
            const count = formulas.filter((f: any) => f.module === mod.value).length;
            const Icon = mod.icon;
            return (
              <Card key={mod.value} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab(mod.value)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{bn ? mod.label_bn : mod.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-wrap gap-2">
            {[{ value: 'all', label: 'All', label_bn: 'সকল' }, ...MODULE_OPTIONS].map(mod => (
              <button key={mod.value} onClick={() => setActiveTab(mod.value)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 whitespace-nowrap ${activeTab === mod.value ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
                {bn ? mod.label_bn : mod.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder={bn ? 'খুঁজুন...' : 'Search...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {/* Formula List */}
        <div className="space-y-2">
          {filtered.map((f: any) => {
            const Icon = getModuleIcon(f.module);
            const expr = f.expression || {};
            return (
              <Card key={f.id} className={`transition-all ${!f.is_active ? 'opacity-60' : ''}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{bn ? f.name_bn : f.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{getModuleLabel(f.module)}</Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {FORMULA_TYPES.find(t => t.value === f.formula_type)?.[bn ? 'label_bn' : 'label'] || f.formula_type}
                      </Badge>
                    </div>
                    {(f.formula_type === 'calculation' || f.formula_type === 'deduction' || f.formula_type === 'bonus') && expr.formula && (
                      <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded mt-1 inline-block font-mono">
                        {expr.result_field} = {expr.formula}
                      </code>
                    )}
                    {f.formula_type === 'grade_rule' && (
                      <span className="text-xs text-muted-foreground mt-1 inline-block">
                        {bn ? `নম্বর ${expr.min_marks}-${expr.max_marks} → ${expr.grade} (GPA: ${expr.gpa})` : `Marks ${expr.min_marks}-${expr.max_marks} → ${expr.grade} (GPA: ${expr.gpa})`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={f.is_active} onCheckedChange={c => {
                      saveMutation.mutate({ ...f, variables: Array.isArray(f.variables) ? f.variables : [], is_active: c });
                    }} />
                    {canEditItem && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(f)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>}
                    {canDeleteItem && <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => { if (confirm(bn ? 'মুছে ফেলতে চান?' : 'Delete?')) deleteMutation.mutate(f.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{bn ? 'কোনো ফর্মুলা পাওয়া যায়নি' : 'No formulas found'}</p>
            </CardContent></Card>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setFormulaData(emptyFormula); setEditingId(null); } }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                <Calculator className="h-5 w-5 inline mr-2" />
                {editingId ? (bn ? 'ফর্মুলা সম্পাদনা' : 'Edit Formula') : (bn ? 'নতুন ফর্মুলা' : 'New Formula')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'নাম (ইংরেজি)' : 'Name (EN)'}</Label>
                  <Input value={formulaData.name} onChange={e => setFormulaData(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <Label>{bn ? 'নাম (বাংলা)' : 'Name (BN)'}</Label>
                  <Input value={formulaData.name_bn} onChange={e => setFormulaData(p => ({ ...p, name_bn: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'মডিউল' : 'Module'}</Label>
                  <Select value={formulaData.module} onValueChange={v => {
                    const isGradeNew = v === 'grade';
                    setFormulaData(p => ({
                      ...p, module: v,
                      formula_type: isGradeNew ? 'grade_rule' : 'calculation',
                      expression: isGradeNew ? { min_marks: 0, max_marks: 100, grade: '', gpa: 0 } : { formula: '', result_field: '' },
                    }));
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODULE_OPTIONS.map(m => <SelectItem key={m.value} value={m.value}>{bn ? m.label_bn : m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'ফর্মুলার ধরন' : 'Formula Type'}</Label>
                  <Select value={formulaData.formula_type} onValueChange={v => setFormulaData(p => ({ ...p, formula_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FORMULA_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{bn ? t.label_bn : t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>{bn ? 'বিবরণ' : 'Description'}</Label>
                <Textarea value={formulaData.description} onChange={e => setFormulaData(p => ({ ...p, description: e.target.value }))} rows={2} />
              </div>

              {/* Salary Preset Templates */}
              {formulaData.module === 'salary' && !editingId && (
                <div className="border rounded-lg p-3 bg-accent/10 space-y-2">
                  <Label className="font-semibold text-xs">{bn ? '⚡ বেতন টেমপ্লেট থেকে তৈরি করুন' : '⚡ Quick Start from Salary Template'}</Label>
                  <div className="flex flex-wrap gap-2">
                    {SALARY_PRESETS.map((preset, i) => (
                      <Button key={i} size="sm" variant="outline" className="text-xs" onClick={() => {
                        setFormulaData(p => ({
                          ...p,
                          name: preset.name,
                          name_bn: preset.name_bn,
                          formula_type: preset.type,
                          expression: { formula: preset.formula, result_field: preset.result_field },
                          variables: preset.vars,
                        }));
                      }}>
                        <Wallet className="h-3 w-3 mr-1" /> {bn ? preset.name_bn : preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Expression Editor */}
              {isGrade ? (
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <Label className="font-semibold">{bn ? '🎓 গ্রেড রুল' : '🎓 Grade Rule'}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{bn ? 'সর্বনিম্ন নম্বর' : 'Min Marks'}</Label>
                      <Input type="number" value={formulaData.expression.min_marks ?? 0}
                        onChange={e => setFormulaData(p => ({ ...p, expression: { ...p.expression, min_marks: Number(e.target.value) } }))} />
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'সর্বোচ্চ নম্বর' : 'Max Marks'}</Label>
                      <Input type="number" value={formulaData.expression.max_marks ?? 100}
                        onChange={e => setFormulaData(p => ({ ...p, expression: { ...p.expression, max_marks: Number(e.target.value) } }))} />
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'গ্রেড' : 'Grade'}</Label>
                      <Input value={formulaData.expression.grade ?? ''}
                        onChange={e => setFormulaData(p => ({ ...p, expression: { ...p.expression, grade: e.target.value } }))} placeholder="A+, A, B..." />
                    </div>
                    <div>
                      <Label className="text-xs">GPA</Label>
                      <Input type="number" step="0.5" value={formulaData.expression.gpa ?? 0}
                        onChange={e => setFormulaData(p => ({ ...p, expression: { ...p.expression, gpa: Number(e.target.value) } }))} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <Label className="font-semibold">{bn ? '🧮 ফর্মুলা এক্সপ্রেশন' : '🧮 Formula Expression'}</Label>
                  <div>
                    <Label className="text-xs">{bn ? 'ফর্মুলা' : 'Formula'}</Label>
                    <Input value={formulaData.expression.formula ?? ''}
                      onChange={e => setFormulaData(p => ({ ...p, expression: { ...p.expression, formula: e.target.value } }))}
                      placeholder="monthly + exam + hostel - discount"
                      className="font-mono text-sm" />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {bn ? 'ভ্যারিয়েবল কী ব্যবহার করুন। যেমন: base + bonus - deduction' : 'Use variable keys. e.g.: base + bonus - deduction'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'রেজাল্ট ফিল্ড' : 'Result Field'}</Label>
                    <Input value={formulaData.expression.result_field ?? ''}
                      onChange={e => setFormulaData(p => ({ ...p, expression: { ...p.expression, result_field: e.target.value } }))}
                      placeholder="total_fee" className="font-mono text-sm" />
                  </div>
                </div>
              )}

              {/* Variables */}
              {!isGrade && (
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <Label className="font-semibold flex items-center gap-1">
                    <Variable className="h-4 w-4" /> {bn ? 'ভ্যারিয়েবল' : 'Variables'}
                  </Label>
                  {formulaData.variables.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 bg-background rounded-md p-2">
                      <code className="text-xs font-mono bg-primary/10 px-1.5 py-0.5 rounded">{v.key}</code>
                      <span className="text-xs text-muted-foreground flex-1">{v.label} / {v.label_en}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeVariable(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="grid grid-cols-3 gap-2">
                    <Input value={varKey} onChange={e => setVarKey(e.target.value)} placeholder={bn ? 'কী' : 'Key'} className="font-mono text-xs" />
                    <Input value={varLabel} onChange={e => setVarLabel(e.target.value)} placeholder={bn ? 'লেবেল (বাংলা)' : 'Label (BN)'} className="text-xs" />
                    <Input value={varLabelEn} onChange={e => setVarLabelEn(e.target.value)} placeholder={bn ? 'লেবেল (EN)' : 'Label (EN)'} className="text-xs" />
                  </div>
                  <Button size="sm" variant="outline" onClick={addVariable} className="w-full">
                    <Plus className="h-3.5 w-3.5 mr-1" /> {bn ? 'ভ্যারিয়েবল যোগ' : 'Add Variable'}
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch checked={formulaData.is_active} onCheckedChange={c => setFormulaData(p => ({ ...p, is_active: c }))} />
                <Label>{bn ? 'সক্রিয়' : 'Active'}</Label>
              </div>

              <Button className="w-full" onClick={() => saveMutation.mutate(formulaData)} disabled={!formulaData.name || !formulaData.name_bn}>
                {editingId ? (bn ? 'আপডেট করুন' : 'Update') : (bn ? 'তৈরি করুন' : 'Create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminFormulaBuilder;
