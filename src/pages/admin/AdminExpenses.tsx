import { useState, useMemo, useEffect } from 'react';
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
import { Plus, Trash2, Edit2, DollarSign, TrendingDown, TrendingUp, Wallet, Printer, FolderPlus, TagIcon, Upload, Download, Eye } from 'lucide-react';

const QUANTITY_UNITS = ['পিস', 'কেজি', 'গ্রাম', 'লিটার', 'ফুট', 'মিটার', 'সেট', 'প্যাকেট', 'বস্তা', 'রিম'];
const EXPENSE_METHODS = ['ক্যাশ', 'চেক', 'বিকাশ', 'নগদ', 'রকেট', 'ব্যাংক ট্রান্সফার', 'অন্যান্য'];

const bnToEnDigit = (str: string) => str.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d).toString());
const onlyNumbers = (str: string) => bnToEnDigit(str).replace(/[^0-9.]/g, '');
const getUnit = (desc: string) => desc?.match(/\[unit:(.*?)\]/)?.[1] || 'পিস';
const getMethod = (desc: string) => desc?.match(/\[method:(.*?)\]/)?.[1] || 'ক্যাশ';
const cleanDesc = (desc: string) => (desc || '').replace(/\[unit:.*?\]/g, '').replace(/\[method:.*?\]/g, '').trim() || '-';

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
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

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
  const defaultExpenseForm = { project_id: '', category_id: '', expense_date: new Date().toISOString().split('T')[0], description: '', quantity: '1', quantity_unit: 'পিস', has_receipt: false, receipt_url: '', amount: '', expense_method: 'ক্যাশ', expense_method_other: '' };
  const defaultDepositForm = { deposit_date: new Date().toISOString().split('T')[0], bank_details: '', other_details: '', amount: '', source: 'manual' };
  const [projectForm, setProjectForm] = useState({ name: '', name_bn: '' });
  const [categoryForm, setCategoryForm] = useState({ project_id: '', name: '', name_bn: '' });
  const [expenseForm, setExpenseForm] = useState(defaultExpenseForm);
  const [depositForm, setDepositForm] = useState(defaultDepositForm);
  const [summaryForm, setSummaryForm] = useState({ principal_name: '', casher_name: '', previous_arrears: '0', inst_name: '', inst_name_en: '', inst_address: '', inst_phone: '', inst_email: '', inst_other: '' });

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
      const { data, error } = await supabase.from('expenses').select('month_year, amount, project_id, category_id, expense_projects(name, name_bn), expense_categories(name, name_bn)');
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

  const { data: websiteSettings = [] } = useQuery({
    queryKey: ['website_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('website_settings').select('*');
      if (error) throw error;
      return data;
    }
  });

  const getSetting = (key: string) => {
    const s = websiteSettings.find((ws: any) => ws.key === key);
    return s?.value as string || '';
  };

  const madrasaName = getSetting('madrasa_name') || 'আল-আরাবিয়া সুভানিয়া হাফিজিয়া মাদ্রাসা';
  const madrasaNameEn = getSetting('madrasa_name_en') || 'Al-Arabia Subhania Hafizia Madrasah';
  const madrasaAddress = getSetting('madrasa_address') || 'খজান্চি রোড, এমএইচ সেন্টার, বিশ্বনাথ, সিলেট';
  const madrasaPhone = getSetting('madrasa_phone') || '01749842401';
  const madrasaEmail = getSetting('madrasa_email') || 'info@subhania.edu.bd';

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

  // Project-wise breakdown
  const projectBreakdown = useMemo(() => {
    const map: Record<string, { name: string, name_bn: string, monthly: number, total: number }> = {};
    allExpenses.forEach((e: any) => {
      if (!e.project_id) return;
      if (!map[e.project_id]) {
        map[e.project_id] = { name: e.expense_projects?.name || '', name_bn: e.expense_projects?.name_bn || '', monthly: 0, total: 0 };
      }
      map[e.project_id].total += Number(e.amount || 0);
      if (e.month_year === selectedMonthYear) map[e.project_id].monthly += Number(e.amount || 0);
    });
    return Object.values(map);
  }, [allExpenses, selectedMonthYear]);

  // Category-wise breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { name: string, name_bn: string, monthly: number, total: number }> = {};
    allExpenses.forEach((e: any) => {
      if (!e.category_id) return;
      if (!map[e.category_id]) {
        map[e.category_id] = { name: e.expense_categories?.name || '', name_bn: e.expense_categories?.name_bn || '', monthly: 0, total: 0 };
      }
      map[e.category_id].total += Number(e.amount || 0);
      if (e.month_year === selectedMonthYear) map[e.category_id].monthly += Number(e.amount || 0);
    });
    return Object.values(map);
  }, [allExpenses, selectedMonthYear]);

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
      if (!expenseForm.project_id || !expenseForm.category_id || !expenseForm.amount || !expenseForm.quantity) { toast.error(bn ? 'পরিমাণ ও টাকা অবশ্যই পূরণ করুন' : 'Quantity & Amount are required'); return; }
      const parsedAmount = Number(onlyNumbers(expenseForm.amount));
      const parsedQty = Number(onlyNumbers(expenseForm.quantity));
      if (isNaN(parsedAmount) || parsedAmount <= 0) { toast.error(bn ? 'সঠিক টাকার পরিমাণ দিন' : 'Enter valid amount'); return; }
      if (isNaN(parsedQty) || parsedQty <= 0) { toast.error(bn ? 'সঠিক পরিমাণ দিন' : 'Enter valid quantity'); return; }
      
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
      
      let descWithTags = (expenseForm.description || '').trim();
      if (expenseForm.quantity_unit && expenseForm.quantity_unit !== 'পিস') descWithTags += `[unit:${expenseForm.quantity_unit}]`;
      const finalMethod = expenseForm.expense_method === 'অন্যান্য' ? expenseForm.expense_method_other.trim() || 'অন্যান্য' : expenseForm.expense_method;
      if (finalMethod && finalMethod !== 'ক্যাশ') descWithTags += `[method:${finalMethod}]`;
      
      const payload = {
        month_year: selectedMonthYear,
        project_id: expenseForm.project_id,
        category_id: expenseForm.category_id,
        expense_date: expenseForm.expense_date,
        description: descWithTags,
        quantity: parsedQty,
        has_receipt: expenseForm.has_receipt,
        receipt_url: receiptUrl,
        amount: parsedAmount
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
      // Reset form for new entry, keep dialog open with same project/category
      const keepProjectId = selectedProjectId || '';
      const keepCategoryId = selectedCategoryId || '';
      setExpenseForm({ ...defaultExpenseForm, project_id: keepProjectId, category_id: keepCategoryId });
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

  // Load summary and institution defaults
  useEffect(() => {
    setSummaryForm(f => ({
      ...f,
      principal_name: summaryData?.principal_name || f.principal_name || '',
      casher_name: summaryData?.casher_name || f.casher_name || '',
      previous_arrears: String(summaryData?.previous_arrears || f.previous_arrears || '0'),
      inst_name: f.inst_name || madrasaName,
      inst_name_en: f.inst_name_en || madrasaNameEn,
      inst_address: f.inst_address || madrasaAddress,
      inst_phone: f.inst_phone || madrasaPhone,
      inst_email: f.inst_email || madrasaEmail,
    }));
  }, [summaryData, madrasaName, madrasaNameEn, madrasaAddress, madrasaPhone, madrasaEmail]);

  // Drill-down state for expenses tab
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const selectedProject = projects.find((p: any) => p.id === selectedProjectId);
  const projectCategories = categories.filter((c: any) => c.project_id === selectedProjectId);
  const categoryExpenses = expenses.filter((e: any) => e.project_id === selectedProjectId && e.category_id === selectedCategoryId);
  const categoryExpenseTotal = categoryExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const selectedCategory = categories.find((c: any) => c.id === selectedCategoryId);

  // Project monthly/total for drill-down
  const getProjectMonthly = (pid: string) => expenses.filter((e: any) => e.project_id === pid).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const getProjectTotal = (pid: string) => allExpenses.filter((e: any) => e.project_id === pid).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const getCategoryMonthly = (cid: string) => expenses.filter((e: any) => e.category_id === cid).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const getCategoryTotal = (cid: string) => allExpenses.filter((e: any) => e.category_id === cid).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  const handlePrint = () => window.print();
  const formatNum = (n: number) => n.toLocaleString(bn ? 'bn-BD' : 'en-BD');

  const openEditExpense = (e: any) => {
    setEditingExpenseId(e.id);
    const method = getMethod(e.description);
    const isKnownMethod = EXPENSE_METHODS.includes(method);
    setExpenseForm({ project_id: e.project_id, category_id: e.category_id, expense_date: e.expense_date, description: cleanDesc(e.description) === '-' ? '' : cleanDesc(e.description), quantity: String(e.quantity || 1), quantity_unit: getUnit(e.description), has_receipt: !!e.has_receipt, receipt_url: e.receipt_url || '', amount: String(e.amount), expense_method: isKnownMethod ? method : 'অন্যান্য', expense_method_other: isKnownMethod ? '' : method });
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
  const handleExcelDownload = () => {
    const rows: string[][] = [];
    // Header
    rows.push([bn ? 'প্রতিষ্ঠান' : 'Institution', bn ? summaryForm.inst_name : summaryForm.inst_name_en]);
    rows.push([bn ? 'ঠিকানা' : 'Address', summaryForm.inst_address]);
    rows.push([bn ? 'ফোন' : 'Phone', summaryForm.inst_phone]);
    rows.push([bn ? 'ইমেইল' : 'Email', summaryForm.inst_email]);
    if (summaryForm.inst_other) rows.push([bn ? 'অন্যান্য' : 'Other', summaryForm.inst_other]);
    rows.push([]);
    rows.push([bn ? 'খরচ প্রতিবেদন' : 'Expense Report', selectedMonthYear]);
    rows.push([]);
    // Summary
    rows.push([bn ? 'মোট খরচ' : 'Total Expense', `৳${formatNum(monthlyTotalExpense)}`, bn ? 'মোট জমা' : 'Total Deposit', `৳${formatNum(monthlyTotalDeposit)}`]);
    rows.push([bn ? 'পূর্ববর্তী বকেয়া' : 'Previous Arrears', `৳${formatNum(previousArrears)}`, bn ? 'ক্যাশ' : 'Cash', `৳${formatNum(monthlyCash)}`]);
    rows.push([]);

    projects.forEach((project: any) => {
      const projExpenses = expenses.filter((e: any) => e.project_id === project.id);
      if (projExpenses.length === 0) return;
      const projTotal = projExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      rows.push([`${bn ? 'প্রকল্প' : 'Project'}: ${bn ? project.name_bn : project.name}`, '', '', '', `৳${formatNum(projTotal)}`]);

      const projCategories = categories.filter((c: any) => c.project_id === project.id);
      projCategories.forEach((cat: any) => {
        const catExpenses = projExpenses.filter((e: any) => e.category_id === cat.id);
        if (catExpenses.length === 0) return;
        const catTotal = catExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
        rows.push([`  ${bn ? 'ক্যাটেগরি' : 'Category'}: ${bn ? cat.name_bn : cat.name}`, '', '', '', `৳${formatNum(catTotal)}`]);
        rows.push(['#', bn ? 'তারিখ' : 'Date', bn ? 'বিবরণ' : 'Description', bn ? 'পরিমাণ' : 'Qty', bn ? 'মাধ্যম' : 'Method', bn ? 'টাকা' : 'Amount', bn ? 'রসিদ' : 'Receipt']);
        catExpenses.forEach((e: any, i: number) => {
          rows.push([String(i + 1), e.expense_date, cleanDesc(e.description), `${e.quantity || 1} ${getUnit(e.description)}`, getMethod(e.description), `৳${formatNum(Number(e.amount))}`, e.has_receipt ? '✓' : '-']);
        });
        rows.push([]);
      });
    });

    rows.push([bn ? 'সর্বমোট খরচ' : 'Grand Total Expense', `৳${formatNum(monthlyTotalExpense)}`]);

    const csvContent = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense_report_${selectedMonthYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(bn ? 'ডাউনলোড হয়েছে' : 'Downloaded');
  };

  const handleProjectExcelDownload = (projectId: string) => {
    const project = projects.find((p: any) => p.id === projectId);
    if (!project) return;
    const projExpenses = expenses.filter((e: any) => e.project_id === projectId);
    const projTotal = projExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const rows: string[][] = [];
    rows.push([bn ? 'প্রতিষ্ঠান' : 'Institution', bn ? summaryForm.inst_name : summaryForm.inst_name_en]);
    rows.push([bn ? 'ঠিকানা' : 'Address', summaryForm.inst_address]);
    rows.push([bn ? 'ফোন' : 'Phone', summaryForm.inst_phone]);
    rows.push([bn ? 'ইমেইল' : 'Email', summaryForm.inst_email]);
    if (summaryForm.inst_other) rows.push([bn ? 'অন্যান্য' : 'Other', summaryForm.inst_other]);
    rows.push([]);
    rows.push([`${bn ? 'প্রকল্প' : 'Project'}: ${bn ? project.name_bn : project.name}`, selectedMonthYear]);
    rows.push([]);

    const projCategories = categories.filter((c: any) => c.project_id === projectId);
    projCategories.forEach((cat: any) => {
      const catExpenses = projExpenses.filter((e: any) => e.category_id === cat.id);
      if (catExpenses.length === 0) return;
      const catTotal = catExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      rows.push([`${bn ? 'ক্যাটেগরি' : 'Category'}: ${bn ? cat.name_bn : cat.name}`, '', '', '', '', `৳${formatNum(catTotal)}`]);
      rows.push(['#', bn ? 'তারিখ' : 'Date', bn ? 'বিবরণ' : 'Description', bn ? 'পরিমাণ' : 'Qty', bn ? 'মাধ্যম' : 'Method', bn ? 'টাকা' : 'Amount', bn ? 'রসিদ' : 'Receipt']);
      catExpenses.forEach((e: any, i: number) => {
        rows.push([String(i + 1), e.expense_date, cleanDesc(e.description), `${e.quantity || 1} ${getUnit(e.description)}`, getMethod(e.description), `৳${formatNum(Number(e.amount))}`, e.has_receipt ? '✓' : '-']);
      });
      rows.push([]);
    });

    rows.push([bn ? 'প্রকল্প মোট খরচ' : 'Project Total', `৳${formatNum(projTotal)}`]);
    const csvContent = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bn ? project.name_bn : project.name}_${selectedMonthYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(bn ? 'ডাউনলোড হয়েছে' : 'Downloaded');
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

        {/* Project & Category Breakdown Tabs */}
        {(projectBreakdown.length > 0 || categoryBreakdown.length > 0) && (
          <Tabs defaultValue="project-breakdown">
            <TabsList className="grid grid-cols-2 w-full max-w-md">
              <TabsTrigger value="project-breakdown">{bn ? 'প্রকল্প ভিত্তিক খরচ' : 'Project-wise'}</TabsTrigger>
              <TabsTrigger value="category-breakdown">{bn ? 'ক্যাটেগরি ভিত্তিক খরচ' : 'Category-wise'}</TabsTrigger>
            </TabsList>
            <TabsContent value="project-breakdown">
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{bn ? 'প্রকল্প' : 'Project'}</TableHead>
                      <TableHead className="text-right">{bn ? 'মাসিক খরচ' : 'Monthly'}</TableHead>
                      <TableHead className="text-right">{bn ? 'মোট খরচ' : 'Total'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectBreakdown.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{bn ? p.name_bn : p.name}</TableCell>
                        <TableCell className="text-right text-destructive">৳{formatNum(p.monthly)}</TableCell>
                        <TableCell className="text-right text-destructive font-semibold">৳{formatNum(p.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="category-breakdown">
              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{bn ? 'ক্যাটেগরি' : 'Category'}</TableHead>
                      <TableHead className="text-right">{bn ? 'মাসিক খরচ' : 'Monthly'}</TableHead>
                      <TableHead className="text-right">{bn ? 'মোট খরচ' : 'Total'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryBreakdown.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{bn ? c.name_bn : c.name}</TableCell>
                        <TableCell className="text-right text-destructive">৳{formatNum(c.monthly)}</TableCell>
                        <TableCell className="text-right text-destructive font-semibold">৳{formatNum(c.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="dashboard">{bn ? 'খরচ' : 'Expenses'}</TabsTrigger>
            <TabsTrigger value="deposits">{bn ? 'জমা' : 'Deposits'}</TabsTrigger>
            <TabsTrigger value="settings">{bn ? 'প্রকল্প' : 'Projects'}</TabsTrigger>
            <TabsTrigger value="summary">{bn ? 'সারাংশ' : 'Summary'}</TabsTrigger>
          </TabsList>

          {/* Expenses Tab - Drill-down: Projects → Categories → Expenses */}
          <TabsContent value="dashboard" className="space-y-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <button 
                onClick={() => { setSelectedProjectId(null); setSelectedCategoryId(null); }}
                className={`font-medium ${!selectedProjectId ? 'text-primary' : 'text-muted-foreground hover:text-foreground underline cursor-pointer'}`}
              >
                {bn ? 'প্রকল্প সমূহ' : 'Projects'}
              </button>
              {selectedProjectId && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <button 
                    onClick={() => setSelectedCategoryId(null)}
                    className={`font-medium ${!selectedCategoryId ? 'text-primary' : 'text-muted-foreground hover:text-foreground underline cursor-pointer'}`}
                  >
                    {bn ? selectedProject?.name_bn : selectedProject?.name}
                  </button>
                </>
              )}
              {selectedCategoryId && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="font-medium text-primary">{bn ? selectedCategory?.name_bn : selectedCategory?.name}</span>
                </>
              )}
            </div>

            {/* Level 1: Project List */}
            {!selectedProjectId && (
              <div className="space-y-3">
                <h3 className="font-semibold">{bn ? 'প্রকল্প নির্বাচন করুন' : 'Select Project'} ({selectedMonthYear})</h3>
                {projects.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">{bn ? 'কোনো প্রকল্প নেই। প্রকল্প ট্যাব থেকে যোগ করুন।' : 'No projects. Add from Projects tab.'}</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {projects.map((p: any) => (
                      <Card key={p.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedProjectId(p.id)}>
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-foreground">{bn ? p.name_bn : p.name}</h4>
                          <div className="mt-2 flex justify-between text-sm">
                            <span className="text-muted-foreground">{bn ? 'মাসিক:' : 'Monthly:'} <span className="text-destructive font-medium">৳{formatNum(getProjectMonthly(p.id))}</span></span>
                            <span className="text-muted-foreground">{bn ? 'মোট:' : 'Total:'} <span className="text-destructive font-medium">৳{formatNum(getProjectTotal(p.id))}</span></span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Level 2: Category List for selected project */}
            {selectedProjectId && !selectedCategoryId && (
              <div className="space-y-3">
                <h3 className="font-semibold">{bn ? 'ক্যাটেগরি নির্বাচন করুন' : 'Select Category'} — {bn ? selectedProject?.name_bn : selectedProject?.name}</h3>
                {projectCategories.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">{bn ? 'এই প্রকল্পে কোনো ক্যাটেগরি নেই। প্রকল্প ট্যাব থেকে যোগ করুন।' : 'No categories in this project.'}</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {projectCategories.map((c: any) => (
                      <Card key={c.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedCategoryId(c.id)}>
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-foreground">{bn ? c.name_bn : c.name}</h4>
                          <div className="mt-2 flex justify-between text-sm">
                            <span className="text-muted-foreground">{bn ? 'মাসিক:' : 'Monthly:'} <span className="text-destructive font-medium">৳{formatNum(getCategoryMonthly(c.id))}</span></span>
                            <span className="text-muted-foreground">{bn ? 'মোট:' : 'Total:'} <span className="text-destructive font-medium">৳{formatNum(getCategoryTotal(c.id))}</span></span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Level 3: Expenses for selected project+category */}
            {selectedProjectId && selectedCategoryId && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{bn ? 'খরচ তালিকা' : 'Expense List'} ({selectedMonthYear})</h3>
                  <Dialog open={expenseDialog} onOpenChange={resetExpenseDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => setExpenseForm(f => ({ ...f, project_id: selectedProjectId, category_id: selectedCategoryId }))}>
                        <Plus className="w-4 h-4 mr-1" />{bn ? 'খরচ যোগ' : 'Add Expense'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>{editingExpenseId ? (bn ? 'খরচ সম্পাদনা' : 'Edit Expense') : (bn ? 'নতুন খরচ' : 'New Expense')}</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <Label>{bn ? 'প্রকল্প' : 'Project'}</Label>
                          <Input value={bn ? selectedProject?.name_bn : selectedProject?.name} disabled className="bg-muted" />
                        </div>
                        <div>
                          <Label>{bn ? 'ক্যাটেগরি' : 'Category'}</Label>
                          <Input value={bn ? selectedCategory?.name_bn : selectedCategory?.name} disabled className="bg-muted" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>{bn ? 'তারিখ' : 'Date'} *</Label>
                            <Input type="date" value={expenseForm.expense_date} onChange={e => setExpenseForm(f => ({ ...f, expense_date: e.target.value }))} />
                          </div>
                          <div>
                            <Label>{bn ? 'পরিমাণ' : 'Quantity'}</Label>
                            <div className="flex gap-2">
                              <Input 
                                className="flex-1" 
                                value={expenseForm.quantity} 
                                onChange={e => setExpenseForm(f => ({ ...f, quantity: onlyNumbers(e.target.value) }))} 
                                placeholder="১"
                                inputMode="decimal"
                              />
                              <Select value={expenseForm.quantity_unit} onValueChange={v => setExpenseForm(f => ({ ...f, quantity_unit: v }))}>
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {QUANTITY_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label>{bn ? 'বিবরণ' : 'Description'}</Label>
                          <Textarea value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div>
                          <Label>{bn ? 'পরিমাণ (টাকা)' : 'Amount (BDT)'} *</Label>
                          <Input 
                            value={expenseForm.amount} 
                            onChange={e => setExpenseForm(f => ({ ...f, amount: onlyNumbers(e.target.value) }))} 
                            placeholder="০" 
                            inputMode="decimal"
                          />
                        </div>
                        <div>
                          <Label>{bn ? 'খরচের মাধ্যম' : 'Expense Method'} *</Label>
                          <Select value={expenseForm.expense_method} onValueChange={v => setExpenseForm(f => ({ ...f, expense_method: v, expense_method_other: v === 'অন্যান্য' ? f.expense_method_other : '' }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {EXPENSE_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {expenseForm.expense_method === 'অন্যান্য' && (
                            <Input 
                              className="mt-2" 
                              placeholder={bn ? 'মাধ্যমের নাম লিখুন...' : 'Enter method name...'} 
                              value={expenseForm.expense_method_other} 
                              onChange={e => setExpenseForm(f => ({ ...f, expense_method_other: e.target.value }))} 
                            />
                          )}
                        </div>
                        <div>
                          <Label>{bn ? 'রসিদ সংযুক্ত করুন' : 'Attach Receipt'}</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="file" 
                              accept="image/*,.pdf" 
                              onChange={e => {
                                const file = e.target.files?.[0] || null;
                                setReceiptFile(file);
                                if (file) setExpenseForm(f => ({ ...f, has_receipt: true }));
                              }}
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
                        <div className="flex items-center gap-2">
                          <Checkbox checked={expenseForm.has_receipt} onCheckedChange={v => setExpenseForm(f => ({ ...f, has_receipt: !!v }))} />
                          <Label>{bn ? 'রসিদ আছে' : 'Has Receipt'}</Label>
                        </div>
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
                        <TableHead>{bn ? 'বিবরণ' : 'Description'}</TableHead>
                        <TableHead>{bn ? 'পরিমাণ' : 'Qty'}</TableHead>
                        <TableHead>{bn ? 'মাধ্যম' : 'Method'}</TableHead>
                        <TableHead>{bn ? 'রসিদ' : 'Receipt'}</TableHead>
                        <TableHead className="text-right">{bn ? 'টাকা' : 'Amount'}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryExpenses.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">{bn ? 'কোনো খরচ নেই' : 'No expenses'}</TableCell></TableRow>
                      )}
                      {categoryExpenses.map((e: any, i: number) => (
                        <TableRow key={e.id}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{e.expense_date}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{cleanDesc(e.description)}</TableCell>
                          <TableCell>{e.quantity} {getUnit(e.description)}</TableCell>
                          <TableCell>{getMethod(e.description)}</TableCell>
                          <TableCell>
                            {e.has_receipt && e.receipt_url ? (
                              <Button variant="ghost" size="sm" className="text-primary p-0 h-auto" onClick={() => setReceiptPreview(e.receipt_url)}>
                                <Eye className="w-4 h-4 mr-1" />{bn ? 'দেখুন' : 'View'}
                              </Button>
                            ) : e.has_receipt ? '✅' : '❌'}
                          </TableCell>
                          <TableCell className="text-right font-medium">৳{formatNum(Number(e.amount))}</TableCell>
                          <TableCell className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditExpense(e)}><Edit2 className="w-4 h-4 text-muted-foreground" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteExpense.mutate(e.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {categoryExpenses.length > 0 && (
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={6} className="text-right">{bn ? 'মোট খরচ:' : 'Total:'}</TableCell>
                          <TableCell className="text-right">৳{formatNum(categoryExpenseTotal)}</TableCell>
                          <TableCell />
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
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

                {/* Institution Info for Print/Excel */}
                <div className="border rounded-lg p-4 bg-muted/20">
                  <h4 className="text-sm font-semibold mb-3 text-foreground">{bn ? 'প্রতিষ্ঠানের তথ্য (প্রিন্ট/এক্সেল)' : 'Institution Info (Print/Excel)'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>{bn ? 'প্রতিষ্ঠানের নাম (বাংলা)' : 'Institution Name (Bangla)'}</Label>
                      <Input value={summaryForm.inst_name} onChange={e => setSummaryForm(f => ({ ...f, inst_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{bn ? 'প্রতিষ্ঠানের নাম (ইংরেজি)' : 'Institution Name (English)'}</Label>
                      <Input value={summaryForm.inst_name_en} onChange={e => setSummaryForm(f => ({ ...f, inst_name_en: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{bn ? 'ঠিকানা' : 'Address'}</Label>
                      <Input value={summaryForm.inst_address} onChange={e => setSummaryForm(f => ({ ...f, inst_address: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{bn ? 'ফোন' : 'Phone'}</Label>
                      <Input value={summaryForm.inst_phone} onChange={e => setSummaryForm(f => ({ ...f, inst_phone: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{bn ? 'ইমেইল' : 'Email'}</Label>
                      <Input value={summaryForm.inst_email} onChange={e => setSummaryForm(f => ({ ...f, inst_email: e.target.value }))} />
                    </div>
                    <div>
                      <Label>{bn ? 'অন্যান্য তথ্য' : 'Other Info'}</Label>
                      <Input value={summaryForm.inst_other} onChange={e => setSummaryForm(f => ({ ...f, inst_other: e.target.value }))} placeholder={bn ? 'EIIN, MPO নং ইত্যাদি' : 'EIIN, MPO No. etc.'} />
                    </div>
                  </div>
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

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => saveSummary.mutate()} disabled={saveSummary.isPending}>
                    {bn ? 'সারাংশ সংরক্ষণ' : 'Save Summary'}
                  </Button>
                  <Button variant="outline" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-1" />{bn ? 'সম্পূর্ণ প্রিন্ট' : 'Print All'}
                  </Button>
                  <Button variant="outline" onClick={handleExcelDownload}>
                    <Download className="w-4 h-4 mr-1" />{bn ? 'সম্পূর্ণ এক্সেল' : 'Excel All'}
                  </Button>
                </div>

                {/* Per-project download */}
                {projects.length > 0 && (
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">{bn ? 'প্রকল্প ভিত্তিক ডাউনলোড' : 'Per-Project Download'}</h4>
                    <div className="space-y-2">
                      {projects.map((p: any) => {
                        const projExp = expenses.filter((e: any) => e.project_id === p.id);
                        const projTotal = projExp.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                        if (projExp.length === 0) return null;
                        return (
                          <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                            <div>
                              <span className="text-sm font-medium">{bn ? p.name_bn : p.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">৳{formatNum(projTotal)}</span>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleProjectExcelDownload(p.id)}>
                              <Download className="w-3 h-3 mr-1" />{bn ? 'এক্সেল' : 'Excel'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Print Section */}
      <div className="print-section hidden print:block p-8" style={{ fontFamily: "'Noto Sans Bengali', sans-serif" }}>
        {/* Institution Header */}
        <div className="text-center mb-4 border-b-2 border-black pb-3">
          <h1 className="text-lg font-bold">{bn ? summaryForm.inst_name : summaryForm.inst_name_en}</h1>
          <p className="text-sm">{summaryForm.inst_address}</p>
          <p className="text-xs">{bn ? 'ফোন' : 'Phone'}: {summaryForm.inst_phone} | {bn ? 'ইমেইল' : 'Email'}: {summaryForm.inst_email}</p>
          {summaryForm.inst_other && <p className="text-xs">{summaryForm.inst_other}</p>}
          <p className="text-base font-semibold mt-2">{bn ? 'খরচ প্রতিবেদন' : 'Expense Report'}</p>
          <p className="text-sm">{selectedMonthYear}</p>
        </div>

        {/* Summary */}
        <table className="w-full border-collapse border mb-4 text-sm">
          <tbody>
            <tr>
              <td className="border p-2 font-medium">{bn ? 'মোট খরচ' : 'Total Expense'}</td>
              <td className="border p-2 text-right">৳{formatNum(monthlyTotalExpense)}</td>
              <td className="border p-2 font-medium">{bn ? 'মোট জমা' : 'Total Deposit'}</td>
              <td className="border p-2 text-right">৳{formatNum(monthlyTotalDeposit)}</td>
            </tr>
            <tr>
              <td className="border p-2 font-medium">{bn ? 'পূর্ববর্তী বকেয়া' : 'Previous Arrears'}</td>
              <td className="border p-2 text-right">৳{formatNum(previousArrears)}</td>
              <td className="border p-2 font-medium">{bn ? 'ক্যাশ' : 'Cash'}</td>
              <td className="border p-2 text-right">৳{formatNum(monthlyCash)}</td>
            </tr>
          </tbody>
        </table>

        {/* Project & Category wise detailed breakdown */}
        {projects.map((project: any) => {
          const projExpenses = expenses.filter((e: any) => e.project_id === project.id);
          if (projExpenses.length === 0) return null;
          const projTotal = projExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
          const projCategories = categories.filter((c: any) => c.project_id === project.id);
          
          return (
            <div key={project.id} className="mb-6" style={{ pageBreakInside: 'avoid' }}>
              <h2 className="text-base font-bold mb-1 border-b pb-1">
                {bn ? 'প্রকল্প' : 'Project'}: {bn ? project.name_bn : project.name}
                <span className="float-right">{bn ? 'মোট' : 'Total'}: ৳{formatNum(projTotal)}</span>
              </h2>
              
              {projCategories.map((cat: any) => {
                const catExpenses = projExpenses.filter((e: any) => e.category_id === cat.id);
                if (catExpenses.length === 0) return null;
                const catTotal = catExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                
                return (
                  <div key={cat.id} className="mb-3 ml-2">
                    <h3 className="text-sm font-semibold mb-1">
                      {bn ? 'ক্যাটেগরি' : 'Category'}: {bn ? cat.name_bn : cat.name}
                      <span className="float-right">৳{formatNum(catTotal)}</span>
                    </h3>
                    <table className="w-full border-collapse border text-sm">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-1 text-left w-8">#</th>
                          <th className="border p-1 text-left">{bn ? 'তারিখ' : 'Date'}</th>
                          <th className="border p-1 text-left">{bn ? 'বিবরণ' : 'Description'}</th>
                          <th className="border p-1 text-center">{bn ? 'পরিমাণ' : 'Qty'}</th>
                          <th className="border p-1 text-center">{bn ? 'মাধ্যম' : 'Method'}</th>
                          <th className="border p-1 text-right">{bn ? 'টাকা' : 'Amount'}</th>
                          <th className="border p-1 text-center">{bn ? 'রসিদ' : 'Receipt'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catExpenses.map((e: any, i: number) => (
                          <tr key={e.id}>
                            <td className="border p-1">{i + 1}</td>
                            <td className="border p-1">{e.expense_date}</td>
                            <td className="border p-1">{cleanDesc(e.description)}</td>
                            <td className="border p-1 text-center">{e.quantity || 1} {getUnit(e.description)}</td>
                            <td className="border p-1 text-center">{getMethod(e.description)}</td>
                            <td className="border p-1 text-right">৳{formatNum(Number(e.amount))}</td>
                            <td className="border p-1 text-center">{e.has_receipt ? '✓' : '-'}</td>
                          </tr>
                        ))}
                        <tr className="font-bold bg-muted/50">
                          <td colSpan={5} className="border p-1 text-right">{bn ? 'উপমোট:' : 'Subtotal:'}</td>
                          <td className="border p-1 text-right">৳{formatNum(catTotal)}</td>
                          <td className="border p-1"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Grand Total */}
        <table className="w-full border-collapse border mb-6 text-sm">
          <tr className="font-bold bg-muted">
            <td className="border p-2">{bn ? 'সর্বমোট খরচ' : 'Grand Total Expense'}</td>
            <td className="border p-2 text-right">৳{formatNum(monthlyTotalExpense)}</td>
          </tr>
        </table>

        {/* Signatures */}
        <div className="flex justify-between mt-12 pt-8">
          <div className="text-center">
            <div className="border-t border-black w-40 mx-auto mb-1"></div>
            <p className="text-sm font-medium">{summaryData?.casher_name || (bn ? 'ক্যাশিয়ার' : 'Cashier')}</p>
            <p className="text-xs">{bn ? 'ক্যাশিয়ার' : 'Cashier'}</p>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-40 mx-auto mb-1"></div>
            <p className="text-sm font-medium">{summaryData?.principal_name || (bn ? 'অধ্যক্ষ' : 'Principal')}</p>
            <p className="text-xs">{bn ? 'অধ্যক্ষ' : 'Principal'}</p>
          </div>
        </div>
      </div>

      {/* Receipt Preview Dialog */}
      <Dialog open={!!receiptPreview} onOpenChange={() => setReceiptPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{bn ? 'রসিদ প্রিভিউ' : 'Receipt Preview'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 overflow-auto max-h-[70vh]">
            {receiptPreview?.endsWith('.pdf') ? (
              <iframe src={receiptPreview} className="w-full h-[60vh] border rounded" />
            ) : (
              <img src={receiptPreview || ''} alt="Receipt" className="max-w-full max-h-[60vh] object-contain rounded border" />
            )}
            <div className="flex gap-2">
              <a href={receiptPreview || ''} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />{bn ? 'ডাউনলোড' : 'Download'}</Button>
              </a>
              <Button variant="outline" size="sm" onClick={() => { if (receiptPreview) window.print(); }}>
                <Printer className="w-4 h-4 mr-1" />{bn ? 'প্রিন্ট' : 'Print'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminExpenses;
