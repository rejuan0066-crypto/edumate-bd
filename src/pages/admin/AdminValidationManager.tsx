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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { toast } from 'sonner';
import {
  Plus, Edit2, Trash2, ShieldCheck, Search, AlertTriangle,
  CheckCircle2, FileText, CreditCard, GraduationCap, Wallet, Users
} from 'lucide-react';

const MODULE_OPTIONS = [
  { value: 'student', label: 'Student', label_bn: 'ছাত্র', icon: Users },
  { value: 'staff', label: 'Staff', label_bn: 'স্টাফ', icon: Users },
  { value: 'fee', label: 'Fee', label_bn: 'ফি', icon: CreditCard },
  { value: 'result', label: 'Result', label_bn: 'ফলাফল', icon: GraduationCap },
  { value: 'salary', label: 'Salary', label_bn: 'বেতন', icon: Wallet },
  { value: 'expense', label: 'Expense', label_bn: 'খরচ', icon: FileText },
];

const RULE_LEVELS = [
  { value: 'field', label: 'Field Level', label_bn: 'ফিল্ড লেভেল' },
  { value: 'business', label: 'Business Logic', label_bn: 'বিজনেস লজিক' },
  { value: 'form', label: 'Form Level', label_bn: 'ফর্ম লেভেল' },
];

const RULE_TYPES = [
  { value: 'required', label: 'Required', label_bn: 'আবশ্যক' },
  { value: 'format', label: 'Format/Pattern', label_bn: 'ফরম্যাট/প্যাটার্ন' },
  { value: 'range', label: 'Min/Max Range', label_bn: 'সর্বনিম্ন/সর্বোচ্চ' },
  { value: 'max_value', label: 'Max Value (Compare)', label_bn: 'সর্বোচ্চ মান (তুলনা)' },
  { value: 'min_length', label: 'Min Length', label_bn: 'সর্বনিম্ন দৈর্ঘ্য' },
  { value: 'max_length', label: 'Max Length', label_bn: 'সর্বোচ্চ দৈর্ঘ্য' },
  { value: 'unique', label: 'Unique Check', label_bn: 'ডুপ্লিকেট চেক' },
  { value: 'custom', label: 'Custom', label_bn: 'কাস্টম' },
];

type RuleData = {
  id?: string;
  name: string;
  name_bn: string;
  description: string;
  module: string;
  rule_level: string;
  field_name: string;
  rule_type: string;
  config: any;
  error_message: string;
  error_message_bn: string;
  is_active: boolean;
  sort_order: number;
};

const emptyRule: RuleData = {
  name: '', name_bn: '', description: '', module: 'student',
  rule_level: 'field', field_name: '', rule_type: 'required',
  config: {}, error_message: '', error_message_bn: '',
  is_active: true, sort_order: 0,
};

const AdminValidationManager = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/validation-manager');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ruleData, setRuleData] = useState<RuleData>(emptyRule);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: rules = [] } = useQuery({
    queryKey: ['validation-rules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('validation_rules').select('*').order('module').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: RuleData) => {
      const payload = {
        name: data.name, name_bn: data.name_bn, description: data.description,
        module: data.module, rule_level: data.rule_level, field_name: data.field_name,
        rule_type: data.rule_type, config: data.config,
        error_message: data.error_message, error_message_bn: data.error_message_bn,
        is_active: data.is_active, sort_order: data.sort_order,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await supabase.from('validation_rules').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('validation_rules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-rules'] });
      setDialogOpen(false);
      setRuleData(emptyRule);
      setEditingId(null);
      toast.success(bn ? 'ভ্যালিডেশন রুল সেভ হয়েছে' : 'Validation rule saved');
    },
    onError: () => toast.error(bn ? 'সেভ করতে সমস্যা' : 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('validation_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-rules'] });
      toast.success(bn ? 'রুল মুছে ফেলা হয়েছে' : 'Rule deleted');
    },
  });

  const openEdit = (r: any) => {
    setRuleData({
      name: r.name, name_bn: r.name_bn, description: r.description || '',
      module: r.module, rule_level: r.rule_level, field_name: r.field_name || '',
      rule_type: r.rule_type, config: r.config || {},
      error_message: r.error_message || '', error_message_bn: r.error_message_bn || '',
      is_active: r.is_active, sort_order: r.sort_order,
    });
    setEditingId(r.id);
    setDialogOpen(true);
  };

  const filtered = rules.filter((r: any) => {
    const matchTab = activeTab === 'all' || r.module === activeTab;
    const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.name_bn.includes(searchQuery);
    return matchTab && matchSearch;
  });

  const getModuleLabel = (mod: string) => {
    const m = MODULE_OPTIONS.find(o => o.value === mod);
    return m ? (bn ? m.label_bn : m.label) : mod;
  };

  const getRuleTypeLabel = (t: string) => {
    const r = RULE_TYPES.find(o => o.value === t);
    return r ? (bn ? r.label_bn : r.label) : t;
  };

  const getLevelLabel = (l: string) => {
    const r = RULE_LEVELS.find(o => o.value === l);
    return r ? (bn ? r.label_bn : r.label) : l;
  };

  // Config fields based on rule_type
  const renderConfigFields = () => {
    switch (ruleData.rule_type) {
      case 'format':
        return (
          <div>
            <Label className="text-xs">{bn ? 'প্যাটার্ন (Regex)' : 'Pattern (Regex)'}</Label>
            <Input value={ruleData.config.pattern || ''} className="font-mono text-sm"
              onChange={e => setRuleData(p => ({ ...p, config: { ...p.config, pattern: e.target.value } }))}
              placeholder="^\\d{10}$" />
          </div>
        );
      case 'range':
        return (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{bn ? 'সর্বনিম্ন' : 'Min'}</Label>
              <Input type="number" value={ruleData.config.min ?? ''}
                onChange={e => setRuleData(p => ({ ...p, config: { ...p.config, min: Number(e.target.value) } }))} />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'সর্বোচ্চ' : 'Max'}</Label>
              <Input type="number" value={ruleData.config.max ?? ''}
                onChange={e => setRuleData(p => ({ ...p, config: { ...p.config, max: Number(e.target.value) } }))} />
            </div>
          </div>
        );
      case 'max_value':
        return (
          <div>
            <Label className="text-xs">{bn ? 'তুলনামূলক ফিল্ড' : 'Compare Field'}</Label>
            <Input value={ruleData.config.compare_field || ''} className="font-mono text-sm"
              onChange={e => setRuleData(p => ({ ...p, config: { ...p.config, compare_field: e.target.value } }))}
              placeholder="amount" />
          </div>
        );
      case 'min_length':
      case 'max_length':
        return (
          <div>
            <Label className="text-xs">{bn ? 'দৈর্ঘ্য' : 'Length'}</Label>
            <Input type="number" value={ruleData.config.length ?? ''}
              onChange={e => setRuleData(p => ({ ...p, config: { ...p.config, length: Number(e.target.value) } }))} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {bn ? 'ভ্যালিডেশন ম্যানেজার' : 'Validation Manager'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn ? 'ফিল্ড-লেভেল ও বিজনেস লজিক ভ্যালিডেশন যোগ, এডিট ও নিয়ন্ত্রণ করুন' : 'Add, edit and control field-level & business logic validations'}
            </p>
          </div>
          {canAddItem && <Button onClick={() => { setRuleData({ ...emptyRule, sort_order: rules.length }); setEditingId(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> {bn ? 'নতুন রুল' : 'New Rule'}
          </Button>}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: bn ? 'মোট রুল' : 'Total Rules', value: rules.length, icon: ShieldCheck, color: 'bg-primary/10 text-primary' },
            { label: bn ? 'সক্রিয়' : 'Active', value: rules.filter((r: any) => r.is_active).length, icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
            { label: bn ? 'ফিল্ড লেভেল' : 'Field Level', value: rules.filter((r: any) => r.rule_level === 'field').length, icon: FileText, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
            { label: bn ? 'বিজনেস লজিক' : 'Business Logic', value: rules.filter((r: any) => r.rule_level === 'business').length, icon: AlertTriangle, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={i}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg ${s.color} flex items-center justify-center`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
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

        {/* Rules List */}
        <div className="space-y-2">
          {filtered.map((r: any) => {
            const cfg = r.config || {};
            return (
              <Card key={r.id} className={`transition-all ${!r.is_active ? 'opacity-60' : ''}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{bn ? r.name_bn : r.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{getModuleLabel(r.module)}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{getLevelLabel(r.rule_level)}</Badge>
                      <Badge className="text-[10px] bg-muted text-muted-foreground">{getRuleTypeLabel(r.rule_type)}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {r.field_name && (
                        <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{r.field_name}</code>
                      )}
                      {cfg.pattern && (
                        <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">/{cfg.pattern}/</code>
                      )}
                      {cfg.min !== undefined && cfg.max !== undefined && (
                        <span className="text-[10px] text-muted-foreground">{cfg.min} - {cfg.max}</span>
                      )}
                      {cfg.compare_field && (
                        <span className="text-[10px] text-muted-foreground">≤ {cfg.compare_field}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-destructive mt-0.5">
                      ⚠ {bn ? r.error_message_bn : r.error_message}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={r.is_active} onCheckedChange={c => {
                      saveMutation.mutate({ ...r, config: r.config || {}, is_active: c });
                    }} />
                    {canEditItem && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>}
                    {canDeleteItem && <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => { if (confirm(bn ? 'মুছে ফেলতে চান?' : 'Delete?')) deleteMutation.mutate(r.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{bn ? 'কোনো ভ্যালিডেশন রুল পাওয়া যায়নি' : 'No validation rules found'}</p>
            </CardContent></Card>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setRuleData(emptyRule); setEditingId(null); } }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                <ShieldCheck className="h-5 w-5 inline mr-2" />
                {editingId ? (bn ? 'রুল সম্পাদনা' : 'Edit Rule') : (bn ? 'নতুন রুল' : 'New Rule')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'নাম (EN)' : 'Name (EN)'}</Label>
                  <Input value={ruleData.name} onChange={e => setRuleData(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <Label>{bn ? 'নাম (বাংলা)' : 'Name (BN)'}</Label>
                  <Input value={ruleData.name_bn} onChange={e => setRuleData(p => ({ ...p, name_bn: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'মডিউল' : 'Module'}</Label>
                  <Select value={ruleData.module} onValueChange={v => setRuleData(p => ({ ...p, module: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODULE_OPTIONS.map(m => <SelectItem key={m.value} value={m.value}>{bn ? m.label_bn : m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'রুল লেভেল' : 'Rule Level'}</Label>
                  <Select value={ruleData.rule_level} onValueChange={v => setRuleData(p => ({ ...p, rule_level: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RULE_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{bn ? l.label_bn : l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'ফিল্ড নাম' : 'Field Name'}</Label>
                  <Input value={ruleData.field_name} onChange={e => setRuleData(p => ({ ...p, field_name: e.target.value }))}
                    placeholder="phone, email, marks..." className="font-mono text-sm" />
                </div>
                <div>
                  <Label>{bn ? 'রুল টাইপ' : 'Rule Type'}</Label>
                  <Select value={ruleData.rule_type} onValueChange={v => setRuleData(p => ({ ...p, rule_type: v, config: {} }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RULE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{bn ? t.label_bn : t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic Config */}
              {renderConfigFields() && (
                <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
                  <Label className="font-semibold text-xs">{bn ? '⚙ কনফিগারেশন' : '⚙ Configuration'}</Label>
                  {renderConfigFields()}
                </div>
              )}

              {/* Error Messages */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'ত্রুটি বার্তা (EN)' : 'Error Message (EN)'}</Label>
                  <Input value={ruleData.error_message} onChange={e => setRuleData(p => ({ ...p, error_message: e.target.value }))} />
                </div>
                <div>
                  <Label>{bn ? 'ত্রুটি বার্তা (বাংলা)' : 'Error Message (BN)'}</Label>
                  <Input value={ruleData.error_message_bn} onChange={e => setRuleData(p => ({ ...p, error_message_bn: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label>{bn ? 'বিবরণ' : 'Description'}</Label>
                <Textarea value={ruleData.description} onChange={e => setRuleData(p => ({ ...p, description: e.target.value }))} rows={2} />
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={ruleData.is_active} onCheckedChange={c => setRuleData(p => ({ ...p, is_active: c }))} />
                <Label>{bn ? 'সক্রিয়' : 'Active'}</Label>
              </div>

              <Button className="w-full" onClick={() => saveMutation.mutate(ruleData)} disabled={!ruleData.name || !ruleData.name_bn}>
                {editingId ? (bn ? 'আপডেট করুন' : 'Update') : (bn ? 'তৈরি করুন' : 'Create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminValidationManager;
