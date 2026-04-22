import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DatePicker } from '@/components/ui/date-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Wallet, Plus, Trash2, Pencil, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { toast } from 'sonner';
import { usePagePermissions } from '@/hooks/usePagePermissions';

const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]);
const fmt = (n: number) => toBn(n.toLocaleString('en-IN'));

interface BudgetForm {
  id?: string;
  name: string;
  name_bn: string;
  fiscal_year: string;
  budget_type: string;
  category_id: string;
  institution_id: string;
  planned_amount: string;
  period_start: string;
  period_end: string;
  status: string;
  notes: string;
}

const blank: BudgetForm = {
  name: '', name_bn: '', fiscal_year: String(new Date().getFullYear()),
  budget_type: 'annual', category_id: '', institution_id: '',
  planned_amount: '', period_start: '', period_end: '',
  status: 'active', notes: '',
};

const AdminBudgets = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/budgets');

  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState<BudgetForm>(blank);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, expense_categories(name, name_bn), expense_institutions(name, name_bn)')
        .is('deleted_at', null)
        .order('period_start', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses-for-budget'],
    queryFn: async () => {
      const { data } = await supabase.from('expenses').select('amount, category_id, institution_id, expense_date').is('deleted_at', null);
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories-all'],
    queryFn: async () => {
      const { data } = await supabase.from('expense_categories').select('id, name, name_bn, institution_id').eq('is_active', true);
      return data || [];
    },
  });

  const { data: institutions = [] } = useQuery({
    queryKey: ['expense-institutions-all'],
    queryFn: async () => {
      const { data } = await supabase.from('expense_institutions').select('id, name, name_bn').eq('is_active', true);
      return data || [];
    },
  });

  const budgetsWithSpent = useMemo(() => {
    return budgets.map((b: any) => {
      const spent = expenses
        .filter((e: any) => {
          if (b.category_id && e.category_id !== b.category_id) return false;
          if (b.institution_id && e.institution_id !== b.institution_id) return false;
          const d = e.expense_date;
          return d >= b.period_start && d <= b.period_end;
        })
        .reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0);
      const planned = parseFloat(b.planned_amount || 0);
      const usedPct = planned > 0 ? (spent / planned) * 100 : 0;
      return { ...b, spent, usedPct, remaining: planned - spent };
    });
  }, [budgets, expenses]);

  const summary = useMemo(() => {
    const totalPlanned = budgetsWithSpent.reduce((s, b) => s + parseFloat(b.planned_amount || 0), 0);
    const totalSpent = budgetsWithSpent.reduce((s, b) => s + b.spent, 0);
    const overBudget = budgetsWithSpent.filter(b => b.usedPct > 100).length;
    return { totalPlanned, totalSpent, overBudget, remaining: totalPlanned - totalSpent };
  }, [budgetsWithSpent]);

  const saveBudget = useMutation({
    mutationFn: async (f: BudgetForm) => {
      if (!f.name_bn || !f.planned_amount || !f.period_start || !f.period_end) {
        throw new Error(bn ? 'নাম, পরিমাণ ও সময়কাল আবশ্যক' : 'Name, amount and period required');
      }
      const payload = {
        name: f.name || f.name_bn,
        name_bn: f.name_bn,
        fiscal_year: f.fiscal_year,
        budget_type: f.budget_type,
        category_id: f.category_id || null,
        institution_id: f.institution_id || null,
        planned_amount: parseFloat(f.planned_amount),
        period_start: f.period_start,
        period_end: f.period_end,
        status: f.status,
        notes: f.notes || null,
      };
      if (f.id) {
        const { error } = await supabase.from('budgets').update(payload).eq('id', f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('budgets').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setOpenDialog(false);
      setForm(blank);
      toast.success(bn ? 'সংরক্ষিত হয়েছে' : 'Saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budgets').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setDeleteId(null);
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    },
  });

  const onBudgetTypeChange = (type: string) => {
    const yr = parseInt(form.fiscal_year || String(new Date().getFullYear()));
    let start = '', end = '';
    if (type === 'annual') { start = `${yr}-01-01`; end = `${yr}-12-31`; }
    setForm({ ...form, budget_type: type, period_start: start || form.period_start, period_end: end || form.period_end });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Wallet className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{bn ? 'বাজেট ব্যবস্থাপনা' : 'Budget Management'}</h1>
            <p className="text-sm text-muted-foreground">{bn ? 'পরিকল্পিত বনাম প্রকৃত খরচ ট্র্যাকিং' : 'Planned vs actual expense tracking'}</p>
          </div>
        </div>
        {canAddItem && (
          <Button onClick={() => { setForm(blank); setOpenDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            {bn ? 'নতুন বাজেট' : 'New Budget'}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">{bn ? 'মোট পরিকল্পিত' : 'Total Planned'}</div>
          <div className="text-2xl font-bold">৳{fmt(summary.totalPlanned)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">{bn ? 'মোট ব্যয়িত' : 'Total Spent'}</div>
          <div className="text-2xl font-bold text-orange-600">৳{fmt(summary.totalSpent)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">{bn ? 'অবশিষ্ট' : 'Remaining'}</div>
          <div className={`text-2xl font-bold ${summary.remaining < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
            ৳{fmt(summary.remaining)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">{bn ? 'বাজেট অতিক্রান্ত' : 'Over Budget'}</div>
          <div className="text-2xl font-bold text-destructive flex items-center gap-2">
            {toBn(summary.overBudget)} {summary.overBudget > 0 && <AlertTriangle className="w-5 h-5" />}
          </div>
        </Card>
      </div>

      {/* Budget List */}
      <div className="space-y-3">
        {budgetsWithSpent.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground">
            {bn ? 'কোনো বাজেট নেই' : 'No budgets yet'}
          </Card>
        )}
        {budgetsWithSpent.map((b) => {
          const isOver = b.usedPct > 100;
          const isWarn = b.usedPct >= 80 && b.usedPct <= 100;
          return (
            <Card key={b.id} className="p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold">{bn ? b.name_bn : b.name}</h3>
                    <Badge variant="outline">{b.fiscal_year}</Badge>
                    <Badge variant="secondary">{
                      b.budget_type === 'annual' ? (bn ? 'বার্ষিক' : 'Annual') :
                      b.budget_type === 'monthly' ? (bn ? 'মাসিক' : 'Monthly') :
                      (bn ? 'ত্রৈমাসিক' : 'Quarterly')
                    }</Badge>
                    {isOver && <Badge variant="destructive">{bn ? 'অতিক্রান্ত' : 'Over Budget'}</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground space-x-3">
                    {b.expense_institutions && <span>{bn ? 'প্রতিষ্ঠান:' : 'Institution:'} {bn ? b.expense_institutions.name_bn : b.expense_institutions.name}</span>}
                    {b.expense_categories && <span>{bn ? 'ক্যাটাগরি:' : 'Category:'} {bn ? b.expense_categories.name_bn : b.expense_categories.name}</span>}
                    <span>{new Date(b.period_start).toLocaleDateString(bn ? 'bn-BD' : 'en-GB')} → {new Date(b.period_end).toLocaleDateString(bn ? 'bn-BD' : 'en-GB')}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {canEditItem && (
                    <Button size="icon" variant="ghost" onClick={() => {
                      setForm({
                        id: b.id, name: b.name, name_bn: b.name_bn,
                        fiscal_year: b.fiscal_year, budget_type: b.budget_type,
                        category_id: b.category_id || '', institution_id: b.institution_id || '',
                        planned_amount: String(b.planned_amount),
                        period_start: b.period_start, period_end: b.period_end,
                        status: b.status, notes: b.notes || '',
                      });
                      setOpenDialog(true);
                    }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                  {canDeleteItem && (
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(b.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">{bn ? 'পরিকল্পিত' : 'Planned'}</div>
                  <div className="font-semibold">৳{fmt(parseFloat(b.planned_amount))}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{bn ? 'ব্যয়িত' : 'Spent'}</div>
                  <div className="font-semibold text-orange-600">৳{fmt(b.spent)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{bn ? 'অবশিষ্ট' : 'Remaining'}</div>
                  <div className={`font-semibold flex items-center gap-1 ${b.remaining < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                    {b.remaining < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                    ৳{fmt(Math.abs(b.remaining))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{bn ? 'ব্যবহার' : 'Usage'}</span>
                  <span className={`font-semibold ${isOver ? 'text-destructive' : isWarn ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {toBn(b.usedPct.toFixed(1))}%
                  </span>
                </div>
                <Progress value={Math.min(b.usedPct, 100)} className={isOver ? '[&>div]:bg-destructive' : isWarn ? '[&>div]:bg-orange-500' : ''} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Form Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? (bn ? 'বাজেট সম্পাদনা' : 'Edit Budget') : (bn ? 'নতুন বাজেট' : 'New Budget')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{bn ? 'নাম (বাংলা) *' : 'Name (Bangla) *'}</Label>
              <Input value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} />
            </div>
            <div>
              <Label>{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>{bn ? 'অর্থবছর' : 'Fiscal Year'}</Label>
              <Input value={form.fiscal_year} onChange={(e) => setForm({ ...form, fiscal_year: e.target.value.replace(/\D/g, '') })} />
            </div>
            <div>
              <Label>{bn ? 'বাজেটের ধরন' : 'Budget Type'}</Label>
              <Select value={form.budget_type} onValueChange={onBudgetTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">{bn ? 'বার্ষিক' : 'Annual'}</SelectItem>
                  <SelectItem value="monthly">{bn ? 'মাসিক' : 'Monthly'}</SelectItem>
                  <SelectItem value="quarterly">{bn ? 'ত্রৈমাসিক' : 'Quarterly'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{bn ? 'প্রতিষ্ঠান' : 'Institution'}</Label>
              <Select value={form.institution_id || 'all'} onValueChange={(v) => setForm({ ...form, institution_id: v === 'all' ? '' : v, category_id: '' })}>
                <SelectTrigger><SelectValue placeholder={bn ? 'সকল' : 'All'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{bn ? 'সকল' : 'All'}</SelectItem>
                  {institutions.map((i: any) => <SelectItem key={i.id} value={i.id}>{bn ? i.name_bn : i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{bn ? 'ক্যাটাগরি' : 'Category'}</Label>
              <Select value={form.category_id || 'all'} onValueChange={(v) => setForm({ ...form, category_id: v === 'all' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder={bn ? 'সকল' : 'All'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{bn ? 'সকল' : 'All'}</SelectItem>
                  {categories
                    .filter((c: any) => !form.institution_id || c.institution_id === form.institution_id)
                    .map((c: any) => <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{bn ? 'পরিকল্পিত পরিমাণ ৳ *' : 'Planned Amount ৳ *'}</Label>
              <Input type="text" value={form.planned_amount} onChange={(e) => setForm({ ...form, planned_amount: e.target.value.replace(/[^\d.]/g, '') })} />
            </div>
            <div>
              <Label>{bn ? 'অবস্থা' : 'Status'}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{bn ? 'খসড়া' : 'Draft'}</SelectItem>
                  <SelectItem value="active">{bn ? 'সক্রিয়' : 'Active'}</SelectItem>
                  <SelectItem value="closed">{bn ? 'সম্পন্ন' : 'Closed'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{bn ? 'শুরুর তারিখ *' : 'Start Date *'}</Label>
              <DatePicker value={form.period_start ? new Date(form.period_start) : undefined} onChange={(d) => setForm({ ...form, period_start: d ? d.toISOString().slice(0, 10) : '' })} />
            </div>
            <div>
              <Label>{bn ? 'শেষ তারিখ *' : 'End Date *'}</Label>
              <DatePicker value={form.period_end ? new Date(form.period_end) : undefined} onChange={(d) => setForm({ ...form, period_end: d ? d.toISOString().slice(0, 10) : '' })} />
            </div>
            <div className="col-span-2">
              <Label>{bn ? 'নোট' : 'Notes'}</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={() => saveBudget.mutate(form)} disabled={saveBudget.isPending}>{bn ? 'সংরক্ষণ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} onConfirm={() => deleteId && deleteBudget.mutate(deleteId)} />
    </div>
  );
};

export default AdminBudgets;
