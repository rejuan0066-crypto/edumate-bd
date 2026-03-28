import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, DollarSign, TrendingDown, TrendingUp, Wallet, Printer, FolderPlus, TagIcon, Upload } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

const getMonthYearOptions = (lang: string) => {
  const m = lang === 'bn' ? MONTHS_BN : MONTHS;
  const opts: string[] = [];
  years.forEach(y => m.forEach((mn, i) => {
    opts.push(`${MONTHS[i]}-${y}`);
  }));
  return opts;
};

const AdminExpenses = () => {
  const { language } = useLanguage();
  const qc = useQueryClient();
  const bn = language === 'bn';

  const [selectedMonthYear, setSelectedMonthYear] = useState(`${MONTHS[new Date().getMonth()]}-${currentYear}`);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Dialogs
  const [projectDialog, setProjectDialog] = useState(false);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [depositDialog, setDepositDialog] = useState(false);

  // Edit IDs
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingDepositId, setEditingDepositId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // Form states
  const defaultExpenseForm = { project_id: '', category_id: '', expense_date: new Date().toISOString().split('T')[0], description: '', quantity: '1', has_receipt: false, receipt_url: '', amount: '' };
  const defaultDepositForm = { deposit_date: new Date().toISOString().split('T')[0], bank_details: '', other_details: '', amount: '', source: 'manual' };
  const [projectForm, setProjectForm] = useState({ name: '', name_bn: '' });
  const [categoryForm, setCategoryForm] = useState({ project_id: '', name: '', name_bn: '' });
  const [expenseForm, setExpenseForm] = useState(defaultExpenseForm);
  const [depositForm, setDepositForm] = useState(defaultDepositForm);
  const [summaryForm, setSummaryForm] = useState({ principal_name: '', casher_name: '', previous_arrears: '0' });

  // Queries
  const { data: projects = [] } = useQuery({
    queryKey: ['expense_projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expense_projects').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense_categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expense_categories').select('*, expense_projects(name, name_bn)').order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', selectedMonthYear],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses')
        .select('*, expense_projects(name, name_bn), expense_categories(name, name_bn)')
        .eq('month_year', selectedMonthYear)
        .order('expense_date', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: deposits = [] } = useQuery({
    queryKey: ['deposits', selectedMonthYear],
    queryFn: async () => {
      const { data, error } = await supabase.from('deposits')
        .select('*').eq('month_year', selectedMonthYear).order('deposit_date', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ['all_expenses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('month_year, amount');
      if (error) throw error;
      return data;
    }
  });

  const { data: allDeposits = [] } = useQuery({
    queryKey: ['all_deposits'],
    queryFn: async () => {
      const { data, error } = await supabase.from('deposits').select('month_year, amount');
      if (error) throw error;
      return data;
    }
  });

  const { data: summaryData } = useQuery({
    queryKey: ['expense_summary', selectedMonthYear],
    queryFn: async () => {
      const { data } = await supabase.from('expense_monthly_summary')
        .select('*').eq('month_year', selectedMonthYear).maybeSingle();
      return data;
    }
  });

  // Stats
  const monthlyTotalExpense = useMemo(() => expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0), [expenses]);
  const monthlyTotalDeposit = useMemo(() => deposits.reduce((s: number, d: any) => s + Number(d.amount || 0), 0), [deposits]);
  const previousArrears = Number(summaryData?.previous_arrears || 0);
  const rawCash = monthlyTotalDeposit - monthlyTotalExpense - previousArrears;
  const monthlyCash = rawCash >= 0 ? rawCash : 0;
  const currentArrears = rawCash < 0 ? Math.abs(rawCash) : 0;
  const totalArrears = previousArrears + currentArrears;

  const totalExpenseAll = useMemo(() => allExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0), [allExpenses]);
  const totalDepositAll = useMemo(() => allDeposits.reduce((s: number, d: any) => s + Number(d.amount || 0), 0), [allDeposits]);
  const rawCashAll = totalDepositAll - totalExpenseAll;
  const totalCashAll = rawCashAll >= 0 ? rawCashAll : 0;
  const totalArrearsAll = rawCashAll < 0 ? Math.abs(rawCashAll) : 0;

  // Mutations
  const addProject = useMutation({
    mutationFn: async () => {
      if (!projectForm.name || !projectForm.name_bn) { toast.error(bn ? 'সব তথ্য পূরণ করুন' : 'Fill all fields'); return; }
      if (editingProjectId) {
        const { error } = await supabase.from('expense_projects').update(projectForm).eq('id', editingProjectId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expense_projects').insert(projectForm);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expense_projects'] }); setProjectDialog(false); setProjectForm({ name: '', name_bn: '' }); setEditingProjectId(null); toast.success(bn ? 'সংরক্ষিত' : 'Saved'); },
    onError: () => toast.error(bn ? 'ত্রুটি হয়েছে' : 'Error occurred')
  });

  const addCategory = useMutation({
    mutationFn: async () => {
      if (!categoryForm.project_id || !categoryForm.name || !categoryForm.name_bn) { toast.error(bn ? 'সব তথ্য পূরণ করুন' : 'Fill all fields'); return; }
      if (editingCategoryId) {
        const { error } = await supabase.from('expense_categories').update(categoryForm).eq('id', editingCategoryId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expense_categories').insert(categoryForm);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expense_categories'] }); setCategoryDialog(false); setCategoryForm({ project_id: '', name: '', name_bn: '' }); setEditingCategoryId(null); toast.success(bn ? 'সংরক্ষিত' : 'Saved'); },
    onError: () => toast.error(bn ? 'ত্রুটি হয়েছে' : 'Error occurred')
  });

  const addExpense = useMutation({
    mutationFn: async () => {
      if (!expenseForm.project_id || !expenseForm.category_id || !expenseForm.amount) { toast.error(bn ? 'সব তথ্য পূরণ করুন' : 'Fill required fields'); return; }
      
      let receiptUrl = expenseForm.receipt_url || null;
      
      // Upload receipt file if exists
      if (receiptFile && expenseForm.has_receipt) {
        setUploading(true);
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptFile);
        setUploading(false);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(uploadData.path);
        receiptUrl = urlData.publicUrl;
      }
      
      const payload = {
        month_year: selectedMonthYear,
        project_id: expenseForm.project_id,
        category_id: expenseForm.category_id,
        expense_date: expenseForm.expense_date,
        description: expenseForm.description,
        quantity: Number(expenseForm.quantity) || 1,
        has_receipt: expenseForm.has_receipt,
        receipt_url: receiptUrl,
        amount: Number(expenseForm.amount)
      };
      if (editingExpenseId) {
        const { error } = await supabase.from('expenses').update(payload).eq('id', editingExpenseId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expenses').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['all_expenses'] });
      // Reset form for new entry, keep dialog open
      setExpenseForm(defaultExpenseForm);
      setReceiptFile(null);
      setEditingExpenseId(null);
      toast.success(bn ? 'সংরক্ষিত! নতুন এন্ট্রি দিন' : 'Saved! Add new entry');
    },
    onError: () => toast.error(bn ? 'ত্রুটি হয়েছে' : 'Error occurred')
  });

  const addDeposit = useMutation({
    mutationFn: async () => {
      if (!depositForm.amount) { toast.error(bn ? 'পরিমাণ দিন' : 'Enter amount'); return; }
      const payload = {
        month_year: selectedMonthYear,
        deposit_date: depositForm.deposit_date,
        bank_details: depositForm.bank_details || null,
        other_details: depositForm.other_details || null,
        amount: Number(depositForm.amount),
        source: depositForm.source
      };
      if (editingDepositId) {
        const { error } = await supabase.from('deposits').update(payload).eq('id', editingDepositId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('deposits').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deposits'] });
      qc.invalidateQueries({ queryKey: ['all_deposits'] });
      setDepositForm(defaultDepositForm);
      setEditingDepositId(null);
      toast.success(bn ? 'সংরক্ষিত! নতুন এন্ট্রি দিন' : 'Saved! Add new entry');
    },
    onError: () => toast.error(bn ? 'ত্রুটি হয়েছে' : 'Error occurred')
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['all_expenses'] }); toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted'); }
  });

  const deleteDeposit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('deposits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deposits'] }); qc.invalidateQueries({ queryKey: ['all_deposits'] }); toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted'); }
  });

  const saveSummary = useMutation({
    mutationFn: async () => {
      const payload = {
        month_year: selectedMonthYear,
        total_expense: monthlyTotalExpense,
        total_deposit: monthlyTotalDeposit,
        previous_arrears: Number(summaryForm.previous_arrears) || 0,
        cash_amount: monthlyCash,
        principal_name: summaryForm.principal_name || null,
        casher_name: summaryForm.casher_name || null,
      };
      const { error } = await supabase.from('expense_monthly_summary').upsert(payload, { onConflict: 'month_year' });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expense_summary'] }); toast.success(bn ? 'সংরক্ষিত' : 'Saved'); },
    onError: () => toast.error(bn ? 'ত্রুটি হয়েছে' : 'Error')
  });

  const filteredCategories = categories.filter((c: any) => !expenseForm.project_id || c.project_id === expenseForm.project_id);

  const handlePrint = () => window.print();
  const formatNum = (n: number) => n.toLocaleString(bn ? 'bn-BD' : 'en-BD');

  const openEditExpense = (e: any) => {
    setEditingExpenseId(e.id);
    setExpenseForm({ project_id: e.project_id, category_id: e.category_id, expense_date: e.expense_date, description: e.description || '', quantity: String(e.quantity || 1), has_receipt: !!e.has_receipt, receipt_url: e.receipt_url || '', amount: String(e.amount) });
    setExpenseDialog(true);
  };
  const openEditDeposit = (d: any) => {
    setEditingDepositId(d.id);
    setDepositForm({ deposit_date: d.deposit_date, bank_details: d.bank_details || '', other_details: d.other_details || '', amount: String(d.amount), source: d.source || 'manual' });
    setDepositDialog(true);
  };
  const openEditProject = (p: any) => {
    setEditingProjectId(p.id);
    setProjectForm({ name: p.name, name_bn: p.name_bn });
    setProjectDialog(true);
  };
  const openEditCategory = (c: any) => {
    setEditingCategoryId(c.id);
    setCategoryForm({ project_id: c.project_id, name: c.name, name_bn: c.name_bn });
    setCategoryDialog(true);
  };
  const resetExpenseDialog = (open: boolean) => { if (!open) { setEditingExpenseId(null); setExpenseForm(defaultExpenseForm); } setExpenseDialog(open); };
  const resetDepositDialog = (open: boolean) => { if (!open) { setEditingDepositId(null); setDepositForm(defaultDepositForm); } setDepositDialog(open); };
  const resetProjectDialog = (open: boolean) => { if (!open) { setEditingProjectId(null); setProjectForm({ name: '', name_bn: '' }); } setProjectDialog(open); };
  const resetCategoryDialog = (open: boolean) => { if (!open) { setEditingCategoryId(null); setCategoryForm({ project_id: '', name: '', name_bn: '' }); } setCategoryDialog(open); };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-display font-bold text-foreground">
            {bn ? 'খরচ ব্যবস্থাপনা' : 'Expense Management'}
          </h1>
          <div className="flex items-center gap-2">
            <Select value={selectedMonthYear} onValueChange={setSelectedMonthYear}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {years.map(y => MONTHS.map((m, i) => (
                  <SelectItem key={`${m}-${y}`} value={`${m}-${y}`}>
                    {bn ? `${MONTHS_BN[i]} ${y}` : `${m} ${y}`}
                  </SelectItem>
                )))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><TrendingDown className="w-5 h-5 text-destructive" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{bn ? 'মাসিক খরচ' : 'Monthly Expense'}</p>
                <p className="text-lg font-bold text-foreground">৳{formatNum(monthlyTotalExpense)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{bn ? 'মাসিক জমা' : 'Monthly Deposit'}</p>
                <p className="text-lg font-bold text-foreground">৳{formatNum(monthlyTotalDeposit)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/40"><Wallet className="w-5 h-5 text-accent-foreground" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{bn ? 'মাসিক ক্যাশ' : 'Monthly Cash'}</p>
                <p className={`text-lg font-bold ${monthlyCash >= 0 ? 'text-primary' : 'text-destructive'}`}>৳{formatNum(monthlyCash)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary"><DollarSign className="w-5 h-5 text-secondary-foreground" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{bn ? 'বকেয়া' : 'Arrears'}</p>
                <p className={`text-lg font-bold ${totalArrears > 0 ? 'text-destructive' : 'text-foreground'}`}>৳{formatNum(totalArrears)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: bn ? 'মোট খরচ' : 'Total Expense', val: totalExpenseAll, color: 'text-destructive' },
            { label: bn ? 'মোট জমা' : 'Total Deposit', val: totalDepositAll, color: 'text-primary' },
            { label: bn ? 'মোট ক্যাশ' : 'Total Cash', val: totalCashAll, color: totalCashAll >= 0 ? 'text-primary' : 'text-destructive' },
            { label: bn ? 'মোট বকেয়া' : 'Total Arrears', val: totalArrearsAll, color: totalArrearsAll > 0 ? 'text-destructive' : 'text-muted-foreground' },
          ].map((s, i) => (
            <div key={i} className="bg-card rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-base font-bold ${s.color}`}>৳{formatNum(s.val)}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="dashboard">{bn ? 'খরচ' : 'Expenses'}</TabsTrigger>
            <TabsTrigger value="deposits">{bn ? 'জমা' : 'Deposits'}</TabsTrigger>
            <TabsTrigger value="settings">{bn ? 'প্রকল্প' : 'Projects'}</TabsTrigger>
            <TabsTrigger value="summary">{bn ? 'সারাংশ' : 'Summary'}</TabsTrigger>
          </TabsList>

          {/* Expenses Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">{bn ? 'খরচ তালিকা' : 'Expense List'} ({selectedMonthYear})</h3>
              <Dialog open={expenseDialog} onOpenChange={resetExpenseDialog}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" />{bn ? 'খরচ যোগ' : 'Add Expense'}</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editingExpenseId ? (bn ? 'খরচ সম্পাদনা' : 'Edit Expense') : (bn ? 'নতুন খরচ' : 'New Expense')}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>{bn ? 'প্রকল্প' : 'Project'} *</Label>
                      <Select value={expenseForm.project_id} onValueChange={v => setExpenseForm(f => ({ ...f, project_id: v, category_id: '' }))}>
                        <SelectTrigger><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                        <SelectContent>
                          {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{bn ? p.name_bn : p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{bn ? 'ক্যাটেগরি' : 'Category'} *</Label>
                      <Select value={expenseForm.category_id} onValueChange={v => setExpenseForm(f => ({ ...f, category_id: v }))}>
                        <SelectTrigger><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                        <SelectContent>
                          {filteredCategories.map((c: any) => <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>{bn ? 'তারিখ' : 'Date'} *</Label>
                        <Input type="date" value={expenseForm.expense_date} onChange={e => setExpenseForm(f => ({ ...f, expense_date: e.target.value }))} />
                      </div>
                      <div>
                        <Label>{bn ? 'পরিমাণ' : 'Quantity'}</Label>
                        <Input type="number" value={expenseForm.quantity} onChange={e => setExpenseForm(f => ({ ...f, quantity: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <Label>{bn ? 'বিবরণ' : 'Description'}</Label>
                      <Textarea value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{bn ? 'পরিমাণ (টাকা)' : 'Amount (BDT)'} *</Label>
                      <Input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={expenseForm.has_receipt} onCheckedChange={v => setExpenseForm(f => ({ ...f, has_receipt: !!v }))} />
                      <Label>{bn ? 'রসিদ আছে' : 'Has Receipt'}</Label>
                    </div>
                    {expenseForm.has_receipt && (
                      <div>
                        <Label>{bn ? 'রসিদ আপলোড' : 'Upload Receipt'}</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="file" 
                            accept="image/*,.pdf" 
                            onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                            className="flex-1"
                          />
                          {receiptFile && <Upload className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        {expenseForm.receipt_url && !receiptFile && (
                          <a href={expenseForm.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline mt-1 inline-block">
                            {bn ? 'বর্তমান রসিদ দেখুন' : 'View current receipt'}
                          </a>
                        )}
                      </div>
                    )}
                    <Button className="w-full" onClick={() => addExpense.mutate()} disabled={addExpense.isPending || uploading}>
                      {uploading ? (bn ? 'আপলোড হচ্ছে...' : 'Uploading...') : (bn ? 'সংরক্ষণ করুন' : 'Save')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                    <TableHead>{bn ? 'প্রকল্প' : 'Project'}</TableHead>
                    <TableHead>{bn ? 'ক্যাটেগরি' : 'Category'}</TableHead>
                    <TableHead>{bn ? 'বিবরণ' : 'Description'}</TableHead>
                    <TableHead>{bn ? 'পরিমাণ' : 'Qty'}</TableHead>
                    <TableHead>{bn ? 'রসিদ' : 'Receipt'}</TableHead>
                    <TableHead className="text-right">{bn ? 'টাকা' : 'Amount'}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">{bn ? 'কোনো খরচ নেই' : 'No expenses'}</TableCell></TableRow>
                  )}
                  {expenses.map((e: any, i: number) => (
                    <TableRow key={e.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{e.expense_date}</TableCell>
                      <TableCell>{bn ? e.expense_projects?.name_bn : e.expense_projects?.name}</TableCell>
                      <TableCell>{bn ? e.expense_categories?.name_bn : e.expense_categories?.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{e.description || '-'}</TableCell>
                      <TableCell>{e.quantity}</TableCell>
                      <TableCell>{e.has_receipt ? '✅' : '❌'}</TableCell>
                      <TableCell className="text-right font-medium">৳{formatNum(Number(e.amount))}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditExpense(e)}><Edit2 className="w-4 h-4 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteExpense.mutate(e.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {expenses.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={7} className="text-right">{bn ? 'মোট খরচ:' : 'Total:'}</TableCell>
                      <TableCell className="text-right">৳{formatNum(monthlyTotalExpense)}</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Deposits Tab */}
          <TabsContent value="deposits" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">{bn ? 'জমা তালিকা' : 'Deposit List'} ({selectedMonthYear})</h3>
              <Dialog open={depositDialog} onOpenChange={resetDepositDialog}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-1" />{bn ? 'জমা যোগ' : 'Add Deposit'}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingDepositId ? (bn ? 'জমা সম্পাদনা' : 'Edit Deposit') : (bn ? 'নতুন জমা' : 'New Deposit')}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>{bn ? 'তারিখ' : 'Date'} *</Label>
                      <Input type="date" value={depositForm.deposit_date} onChange={e => setDepositForm(f => ({ ...f, deposit_date: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{bn ? 'ব্যাংক বিবরণ' : 'Bank Details'}</Label>
                      <Input value={depositForm.bank_details} onChange={e => setDepositForm(f => ({ ...f, bank_details: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{bn ? 'অন্যান্য বিবরণ' : 'Other Details'}</Label>
                      <Input value={depositForm.other_details} onChange={e => setDepositForm(f => ({ ...f, other_details: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{bn ? 'উৎস' : 'Source'}</Label>
                      <Select value={depositForm.source} onValueChange={v => setDepositForm(f => ({ ...f, source: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">{bn ? 'ম্যানুয়াল' : 'Manual'}</SelectItem>
                          <SelectItem value="fees">{bn ? 'ফি' : 'Fees'}</SelectItem>
                          <SelectItem value="donation">{bn ? 'অনুদান' : 'Donation'}</SelectItem>
                          <SelectItem value="other">{bn ? 'অন্যান্য' : 'Other'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{bn ? 'পরিমাণ (টাকা)' : 'Amount (BDT)'} *</Label>
                      <Input type="number" value={depositForm.amount} onChange={e => setDepositForm(f => ({ ...f, amount: e.target.value }))} />
                    </div>
                    <Button className="w-full" onClick={() => addDeposit.mutate()} disabled={addDeposit.isPending}>
                      {bn ? 'সংরক্ষণ করুন' : 'Save'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                    <TableHead>{bn ? 'ব্যাংক' : 'Bank'}</TableHead>
                    <TableHead>{bn ? 'বিবরণ' : 'Details'}</TableHead>
                    <TableHead>{bn ? 'উৎস' : 'Source'}</TableHead>
                    <TableHead className="text-right">{bn ? 'টাকা' : 'Amount'}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{bn ? 'কোনো জমা নেই' : 'No deposits'}</TableCell></TableRow>
                  )}
                  {deposits.map((d: any, i: number) => (
                    <TableRow key={d.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{d.deposit_date}</TableCell>
                      <TableCell>{d.bank_details || '-'}</TableCell>
                      <TableCell>{d.other_details || '-'}</TableCell>
                      <TableCell>{d.source}</TableCell>
                      <TableCell className="text-right font-medium">৳{formatNum(Number(d.amount))}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDeposit(d)}><Edit2 className="w-4 h-4 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteDeposit.mutate(d.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {deposits.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={5} className="text-right">{bn ? 'মোট জমা:' : 'Total:'}</TableCell>
                      <TableCell className="text-right">৳{formatNum(monthlyTotalDeposit)}</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Projects & Categories Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Projects */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">{bn ? 'প্রকল্প' : 'Projects'}</CardTitle>
                  <Dialog open={projectDialog} onOpenChange={resetProjectDialog}>
                    <DialogTrigger asChild><Button size="sm" variant="outline"><FolderPlus className="w-4 h-4 mr-1" />{bn ? 'যোগ' : 'Add'}</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{editingProjectId ? (bn ? 'প্রকল্প সম্পাদনা' : 'Edit Project') : (bn ? 'নতুন প্রকল্প' : 'New Project')}</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div><Label>{bn ? 'নাম (ইংরেজি)' : 'Name (English)'} *</Label><Input value={projectForm.name} onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))} /></div>
                        <div><Label>{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} *</Label><Input value={projectForm.name_bn} onChange={e => setProjectForm(f => ({ ...f, name_bn: e.target.value }))} /></div>
                        <Button className="w-full" onClick={() => addProject.mutate()} disabled={addProject.isPending}>{bn ? 'সংরক্ষণ' : 'Save'}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {projects.length === 0 ? <p className="text-sm text-muted-foreground">{bn ? 'কোনো প্রকল্প নেই' : 'No projects'}</p> : (
                    <ul className="space-y-2">
                      {projects.map((p: any) => (
                        <li key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                          <span className="text-sm font-medium">{bn ? p.name_bn : p.name}</span>
                          <Button variant="ghost" size="icon" onClick={() => openEditProject(p)}><Edit2 className="w-4 h-4 text-muted-foreground" /></Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Categories */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">{bn ? 'ক্যাটেগরি' : 'Categories'}</CardTitle>
                  <Dialog open={categoryDialog} onOpenChange={resetCategoryDialog}>
                    <DialogTrigger asChild><Button size="sm" variant="outline"><TagIcon className="w-4 h-4 mr-1" />{bn ? 'যোগ' : 'Add'}</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{editingCategoryId ? (bn ? 'ক্যাটেগরি সম্পাদনা' : 'Edit Category') : (bn ? 'নতুন ক্যাটেগরি' : 'New Category')}</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <Label>{bn ? 'প্রকল্প' : 'Project'} *</Label>
                          <Select value={categoryForm.project_id} onValueChange={v => setCategoryForm(f => ({ ...f, project_id: v }))}>
                            <SelectTrigger><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                            <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{bn ? p.name_bn : p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div><Label>{bn ? 'নাম (ইংরেজি)' : 'Name (English)'} *</Label><Input value={categoryForm.name} onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))} /></div>
                        <div><Label>{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} *</Label><Input value={categoryForm.name_bn} onChange={e => setCategoryForm(f => ({ ...f, name_bn: e.target.value }))} /></div>
                        <Button className="w-full" onClick={() => addCategory.mutate()} disabled={addCategory.isPending}>{bn ? 'সংরক্ষণ' : 'Save'}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {categories.length === 0 ? <p className="text-sm text-muted-foreground">{bn ? 'কোনো ক্যাটেগরি নেই' : 'No categories'}</p> : (
                    <ul className="space-y-2">
                      {categories.map((c: any) => (
                        <li key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                          <div>
                            <span className="text-sm font-medium">{bn ? c.name_bn : c.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">({bn ? (c as any).expense_projects?.name_bn : (c as any).expense_projects?.name})</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => openEditCategory(c)}><Edit2 className="w-4 h-4 text-muted-foreground" /></Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{bn ? 'মাসিক সারাংশ' : 'Monthly Summary'} — {selectedMonthYear}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/30">
                  <div><p className="text-xs text-muted-foreground">{bn ? 'মোট খরচ' : 'Total Expense'}</p><p className="font-bold text-destructive">৳{formatNum(monthlyTotalExpense)}</p></div>
                  <div><p className="text-xs text-muted-foreground">{bn ? 'মোট জমা' : 'Total Deposit'}</p><p className="font-bold text-primary">৳{formatNum(monthlyTotalDeposit)}</p></div>
                  <div><p className="text-xs text-muted-foreground">{bn ? 'বকেয়া' : 'Arrears'}</p><p className={`font-bold ${totalArrears > 0 ? 'text-destructive' : ''}`}>৳{formatNum(totalArrears)}</p></div>
                  <div><p className="text-xs text-muted-foreground">{bn ? 'ক্যাশ' : 'Cash'}</p><p className={`font-bold ${monthlyCash >= 0 ? 'text-primary' : 'text-destructive'}`}>৳{formatNum(monthlyCash)}</p></div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>{bn ? 'পূর্ববর্তী বকেয়া' : 'Previous Arrears'}</Label>
                    <Input type="number" value={summaryForm.previous_arrears} onChange={e => setSummaryForm(f => ({ ...f, previous_arrears: e.target.value }))} />
                  </div>
                  <div>
                    <Label>{bn ? 'প্রিন্সিপালের নাম' : 'Principal Name'}</Label>
                    <Input value={summaryForm.principal_name} onChange={e => setSummaryForm(f => ({ ...f, principal_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>{bn ? 'ক্যাশিয়ারের নাম' : 'Casher Name'}</Label>
                    <Input value={summaryForm.casher_name} onChange={e => setSummaryForm(f => ({ ...f, casher_name: e.target.value }))} />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => saveSummary.mutate()} disabled={saveSummary.isPending}>
                    {bn ? 'সারাংশ সংরক্ষণ' : 'Save Summary'}
                  </Button>
                  <Button variant="outline" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-1" />{bn ? 'প্রিন্ট' : 'Print'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminExpenses;
