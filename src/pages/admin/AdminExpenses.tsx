import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, DollarSign, TrendingDown, TrendingUp, Wallet, Printer, FolderPlus, TagIcon, Upload, Download, Eye, ScanLine, Building2, Package, AlertTriangle, FileText, FileBarChart } from 'lucide-react';
import ExpenseVoucherPrint from '@/components/expenses/ExpenseVoucherPrint';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedCounter from '@/components/expenses/AnimatedCounter';
import MiniSparkline from '@/components/expenses/MiniSparkline';
import { generateBilingualReport } from '@/lib/reportPdfGenerator';

const QUANTITY_UNITS = ['পিস', 'কেজি', 'গ্রাম', 'লিটার', 'ফুট', 'মিটার', 'সেট', 'প্যাকেট', 'বস্তা', 'রিম'];
const EXPENSE_METHODS = ['ক্যাশ', 'চেক', 'বিকাশ', 'নগদ', 'রকেট', 'ব্যাংক ট্রান্সফার', 'অন্যান্য'];

const bnToEnDigit = (str: string) => str.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d).toString());
const onlyNumbers = (str: string) => str.replace(/[^0-9০-৯.]/g, '');
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
const years = Array.from({ length: 100 }, (_, i) => 2000 + i);

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
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/expenses');
  const bn = language === 'bn';

  const [selectedMonthYear, setSelectedMonthYear] = useState(`${MONTHS[new Date().getMonth()]}-${currentYear}`);
  const [filterMode, setFilterMode] = useState<'monthly' | 'yearly' | 'session'>('monthly');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [printInstitutionId, setPrintInstitutionId] = useState<string | null>(null);
  const [editInstitutionEntriesId, setEditInstitutionEntriesId] = useState<string | null>(null);
  const [entriesFilterCategoryId, setEntriesFilterCategoryId] = useState<string>('all');
  const [entriesSearchText, setEntriesSearchText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmType, setDeleteConfirmType] = useState<'expense' | 'deposit'>('expense');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('');
  const [breakdownTab, setBreakdownTab] = useState<'institution' | 'category' | null>(null);
  const [voucherExpense, setVoucherExpense] = useState<any>(null);

  // Dialogs
  const [expInstDialog, setExpInstDialog] = useState(false);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [depositDialog, setDepositDialog] = useState(false);
  const [institutionDialog, setInstitutionDialog] = useState(false);
  const [editingInstitutionId, setEditingInstitutionId] = useState<string | null>(null);
  const [printEditMode, setPrintEditMode] = useState(false);
  const [printEditData, setPrintEditData] = useState({
    instName: '', instNameEn: '', instAddress: '', instPhone: '', instEmail: '', instOther: '', instLogo: '',
    reportTitle: '', reportSubtitle: '', casherName: '', principalName: '', extraNote: ''
  });

  // Edit IDs
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingDepositId, setEditingDepositId] = useState<string | null>(null);
  const [editingExpInstId, setEditingExpInstId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // Form states
  const defaultExpenseForm = { institution_id: '', category_id: '', expense_date: new Date().toISOString().split('T')[0], description: '', quantity: '', quantity_unit: '', has_receipt: false, receipt_url: '', amount: '', expense_method: 'ক্যাশ', expense_method_other: '', add_to_inventory: false, inventory_item_id: '' };
  const defaultDepositForm = { deposit_date: new Date().toISOString().split('T')[0], bank_details: '', other_details: '', amount: '', source: 'manual' };
  const [expInstForm, setExpInstForm] = useState({ name: '', name_bn: '' });
  const [categoryForm, setCategoryForm] = useState({ institution_id: '', name: '', name_bn: '' });
  const [expenseForm, setExpenseForm] = useState(defaultExpenseForm);
  const [depositForm, setDepositForm] = useState(defaultDepositForm);
  const [institutionForm, setInstitutionForm] = useState({ name: '', name_en: '', address: '', phone: '', email: '', other_info: '', logo_url: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [summaryForm, setSummaryForm] = useState({ principal_name: '', casher_name: '', previous_arrears: '0' });

  // Queries
  const { data: academicSessions = [] } = useQuery({
    queryKey: ['academic_sessions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_sessions').select('*').order('name', { ascending: false });
      if (error) throw error;
      return data as any[];
    }
  });

  // expense_institutions is now the top-level entity
  const { data: expenseInstitutions = [] } = useQuery({
    queryKey: ['expense_institutions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expense_institutions').select('*').order('name');
      if (error) throw error;
      return data as any[];
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense_categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expense_categories').select('*, expense_institutions(name, name_bn)').order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', selectedMonthYear],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses')
        .select('*, expense_institutions(name, name_bn), expense_categories(name, name_bn)')
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
      const { data, error } = await supabase.from('expenses').select('month_year, amount, institution_id, category_id, expense_institutions(name, name_bn), expense_categories(name, name_bn)');
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

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('institutions').select('*').order('created_at');
      if (error) throw error;
      return data as any[];
    }
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory-items-for-expense'],
    queryFn: async () => {
      const { data } = await supabase.from('inventory_items').select('*').eq('is_active', true).order('name_bn');
      return data || [];
    },
  });

  // Auto-select default institution
  useEffect(() => {
    if (institutions.length > 0 && !selectedInstitutionId) {
      const def = institutions.find((i: any) => i.is_default);
      setSelectedInstitutionId(def?.id || institutions[0].id);
    }
  }, [institutions, selectedInstitutionId]);

  const selectedInstitution = institutions.find((i: any) => i.id === selectedInstitutionId) || institutions[0];
  const instName = selectedInstitution?.name || '';
  const instNameEn = selectedInstitution?.name_en || '';
  const instAddress = selectedInstitution?.address || '';
  const instPhone = selectedInstitution?.phone || '';
  const instEmail = selectedInstitution?.email || '';
  const instOther = selectedInstitution?.other_info || '';
  const instLogo = selectedInstitution?.logo_url || '';

  // Stats
  const monthlyTotalExpense = useMemo(() => expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0), [expenses]);
  const monthlyTotalDeposit = useMemo(() => deposits.reduce((s: number, d: any) => s + Number(d.amount || 0), 0), [deposits]);
  const previousArrears = Number(summaryData?.previous_arrears || 0);
  const rawCash = monthlyTotalDeposit - monthlyTotalExpense - previousArrears;
  const monthlyCash = rawCash >= 0 ? rawCash : 0;
  const currentArrears = rawCash < 0 ? Math.abs(rawCash) : 0;
  const totalArrears = previousArrears + currentArrears;

  // Helper: check if month_year matches current filter
  const matchesFilter = (monthYear: string) => {
    if (filterMode === 'yearly') {
      return monthYear.endsWith(`-${selectedYear}`);
    }
    if (filterMode === 'session') {
      const session = academicSessions.find((s: any) => s.id === selectedSessionId);
      if (!session || !session.start_date || !session.end_date) return false;
      // Extract year and month from month_year (e.g., "January-2026")
      const parts = monthYear.split('-');
      const yr = parseInt(parts[1]);
      const mi = MONTHS.indexOf(parts[0]);
      if (mi < 0) return false;
      const entryDate = new Date(yr, mi, 15); // mid-month
      return entryDate >= new Date(session.start_date) && entryDate <= new Date(session.end_date);
    }
    return true; // monthly mode - show all for "total" row
  };

  const filteredExpenses = useMemo(() => allExpenses.filter((e: any) => matchesFilter(e.month_year)), [allExpenses, filterMode, selectedYear, selectedSessionId, academicSessions]);
  const filteredDeposits = useMemo(() => allDeposits.filter((d: any) => matchesFilter(d.month_year)), [allDeposits, filterMode, selectedYear, selectedSessionId, academicSessions]);

  const totalExpenseAll = useMemo(() => filteredExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0), [filteredExpenses]);
  const totalDepositAll = useMemo(() => filteredDeposits.reduce((s: number, d: any) => s + Number(d.amount || 0), 0), [filteredDeposits]);
  const rawCashAll = totalDepositAll - totalExpenseAll;
  const totalCashAll = rawCashAll >= 0 ? rawCashAll : 0;
  const totalArrearsAll = rawCashAll < 0 ? Math.abs(rawCashAll) : 0;

  const filterLabel = filterMode === 'yearly' 
    ? (bn ? `${selectedYear} সাল` : `Year ${selectedYear}`)
    : filterMode === 'session'
    ? (bn ? (academicSessions.find((s: any) => s.id === selectedSessionId)?.name_bn || 'সেশন') : (academicSessions.find((s: any) => s.id === selectedSessionId)?.name || 'Session'))
    : (bn ? 'সর্বমোট' : 'Grand Total');

  // Institution-wise breakdown
  const institutionBreakdown = useMemo(() => {
    const map: Record<string, { name: string, name_bn: string, monthly: number, total: number }> = {};
    filteredExpenses.forEach((e: any) => {
      if (!e.institution_id) return;
      if (!map[e.institution_id]) {
        map[e.institution_id] = { name: e.expense_institutions?.name || '', name_bn: e.expense_institutions?.name_bn || '', monthly: 0, total: 0 };
      }
      map[e.institution_id].total += Number(e.amount || 0);
      if (e.month_year === selectedMonthYear) map[e.institution_id].monthly += Number(e.amount || 0);
    });
    return Object.values(map);
  }, [filteredExpenses, selectedMonthYear]);

  // Category-wise breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { name: string, name_bn: string, monthly: number, total: number }> = {};
    filteredExpenses.forEach((e: any) => {
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
  const addExpInst = useMutation({
    mutationFn: async () => {
      if (!expInstForm.name || !expInstForm.name_bn) { toast.error(bn ? 'সব তথ্য পূরণ করুন' : 'Fill all fields'); return; }
      if (editingExpInstId) {
        const { error } = await supabase.from('expense_institutions').update(expInstForm).eq('id', editingExpInstId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expense_institutions').insert(expInstForm);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expense_institutions'] }); setExpInstDialog(false); setExpInstForm({ name: '', name_bn: '' }); setEditingExpInstId(null); toast.success(bn ? 'সংরক্ষিত' : 'Saved'); },
    onError: () => toast.error(bn ? 'ত্রুটি হয়েছে' : 'Error occurred')
  });

  const addCategory = useMutation({
    mutationFn: async () => {
      if (!categoryForm.institution_id || !categoryForm.name || !categoryForm.name_bn) { toast.error(bn ? 'সব তথ্য পূরণ করুন' : 'Fill all fields'); return; }
      if (editingCategoryId) {
        const { error } = await supabase.from('expense_categories').update(categoryForm).eq('id', editingCategoryId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expense_categories').insert(categoryForm);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expense_categories'] }); setCategoryDialog(false); setCategoryForm({ institution_id: '', name: '', name_bn: '' }); setEditingCategoryId(null); toast.success(bn ? 'সংরক্ষিত' : 'Saved'); },
    onError: () => toast.error(bn ? 'ত্রুটি হয়েছে' : 'Error occurred')
  });


  const deleteExpInst = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expense_institutions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expense_institutions'] }); toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted'); }
  });

  const addExpense = useMutation({
    mutationFn: async () => {
      if (!expenseForm.institution_id || !expenseForm.category_id || !expenseForm.amount || !expenseForm.quantity) { toast.error(bn ? 'পরিমাণ ও টাকা অবশ্যই পূরণ করুন' : 'Quantity & Amount are required'); return; }
      const parsedAmount = Number(bnToEnDigit(expenseForm.amount));
      const parsedQty = expenseForm.quantity ? Number(bnToEnDigit(expenseForm.quantity)) : 1;
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
        institution_id: expenseForm.institution_id,
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
        const { data: insertedExpense, error } = await supabase.from('expenses').insert(payload).select('id').single();
        if (error) throw error;

        // Inventory integration: update stock and create log
        if (expenseForm.add_to_inventory && expenseForm.inventory_item_id && insertedExpense) {
          const { error: stockError } = await supabase.rpc('increment_inventory_stock' as any, {
            p_item_id: expenseForm.inventory_item_id,
            p_amount: parsedQty
          });
          if (stockError) {
            // Fallback: manual update
            const { data: currentItem } = await supabase.from('inventory_items').select('current_stock').eq('id', expenseForm.inventory_item_id).single();
            if (currentItem) {
              await supabase.from('inventory_items').update({ current_stock: (currentItem.current_stock || 0) + parsedQty }).eq('id', expenseForm.inventory_item_id);
            }
          }
          await supabase.from('inventory_logs').insert({
            item_id: expenseForm.inventory_item_id,
            type: 'in',
            change_amount: parsedQty,
            reason: `Purchased via Expense ID: ${insertedExpense.id}`,
            expense_id: insertedExpense.id,
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['all_expenses'] });
      qc.invalidateQueries({ queryKey: ['inventory-items-for-expense'] });
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-logs'] });
      // Reset form for new entry, keep dialog open with same project/category
      const keepInstitutionId = expenseForm.institution_id || '';
      const keepCategoryId = expenseForm.category_id || '';
      setExpenseForm({ ...defaultExpenseForm, institution_id: keepInstitutionId, category_id: keepCategoryId });
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

  const saveInstitution = useMutation({
    mutationFn: async () => {
      if (!institutionForm.name) { toast.error(bn ? 'প্রতিষ্ঠানের নাম দিন' : 'Enter institution name'); return; }
      let logoUrl = institutionForm.logo_url || null;
      if (logoFile) {
        setLogoUploading(true);
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('institution-logos').upload(fileName, logoFile);
        setLogoUploading(false);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('institution-logos').getPublicUrl(uploadData.path);
        logoUrl = urlData.publicUrl;
      }
      const payload = { name: institutionForm.name, name_en: institutionForm.name_en || null, address: institutionForm.address || null, phone: institutionForm.phone || null, email: institutionForm.email || null, other_info: institutionForm.other_info || null, logo_url: logoUrl };
      if (editingInstitutionId) {
        const { error } = await supabase.from('institutions').update(payload).eq('id', editingInstitutionId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('institutions').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['institutions'] }); setInstitutionDialog(false); setInstitutionForm({ name: '', name_en: '', address: '', phone: '', email: '', other_info: '', logo_url: '' }); setLogoFile(null); setEditingInstitutionId(null); toast.success(bn ? 'সংরক্ষিত' : 'Saved'); },
    onError: () => toast.error(bn ? 'ত্রুটি হয়েছে' : 'Error')
  });

  const deleteInstitution = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('institutions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['institutions'] }); toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted'); },
    onError: () => toast.error(bn ? 'ত্রুটি হয়েছে' : 'Error')
  });

  // filteredInstitutions no longer needed - institutions are top-level
  const filteredCategories = categories.filter((c: any) => {
    if (!expenseForm.institution_id) return false;
    if (c.institution_id !== expenseForm.institution_id) return false;
    if (expenseForm.institution_id && (c as any).institution_id && (c as any).institution_id !== expenseForm.institution_id) return false;
    return true;
  });
  const selectedExpenseProject = expenseInstitutions.find((p: any) => p.id === expenseForm.institution_id);
  const selectedExpenseCategory = categories.find((c: any) => c.id === expenseForm.category_id);

  // Load summary defaults
  useEffect(() => {
    setSummaryForm(f => ({
      ...f,
      principal_name: summaryData?.principal_name || f.principal_name || '',
      casher_name: summaryData?.casher_name || f.casher_name || '',
      previous_arrears: String(summaryData?.previous_arrears || f.previous_arrears || '0'),
    }));
  }, [summaryData]);

  // Drill-down state for expenses tab
  const [selectedInstId, setSelectedInstId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Auto-select first institution

  const selectedInst = expenseInstitutions.find((p: any) => p.id === selectedInstId);
  const instCategories = categories.filter((c: any) => c.institution_id === selectedInstId);
  const categoryExpenses = expenses.filter((e: any) => e.institution_id === selectedInstId && e.category_id === selectedCategoryId);
  const categoryExpenseTotal = categoryExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const selectedCategory = categories.find((c: any) => c.id === selectedCategoryId);

  // Project monthly/total for drill-down
  const getInstMonthly = (pid: string) => expenses.filter((e: any) => e.institution_id === pid).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const getInstTotal = (pid: string) => allExpenses.filter((e: any) => e.institution_id === pid).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const getCategoryMonthly = (cid: string) => expenses.filter((e: any) => e.category_id === cid).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const getCategoryTotal = (cid: string) => allExpenses.filter((e: any) => e.category_id === cid).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  const handlePrint = () => window.print();
  const formatNum = (n: number) => n.toLocaleString(bn ? 'bn-BD' : 'en-BD');

  // Get selected month display name
  const selectedMonthIndex = MONTHS.indexOf(selectedMonthYear.split('-')[0]);
  const selectedMonthYearStr = selectedMonthYear.split('-')[1];
  const selectedMonthName = bn 
    ? `${MONTHS_BN[selectedMonthIndex]} ${selectedMonthYearStr}` 
    : `${MONTHS[selectedMonthIndex]} ${selectedMonthYearStr}`;

  const openEditExpense = (e: any) => {
    setEditingExpenseId(e.id);
    const method = getMethod(e.description);
    const isKnownMethod = EXPENSE_METHODS.includes(method);
    const cat = categories.find((c: any) => c.id === e.category_id);
    const instId = (cat as any)?.institution_id || '';
    setExpenseForm({ institution_id: e.institution_id, category_id: e.category_id, expense_date: e.expense_date, description: cleanDesc(e.description) === '-' ? '' : cleanDesc(e.description), quantity: String(e.quantity || 1), quantity_unit: getUnit(e.description), has_receipt: !!e.has_receipt, receipt_url: e.receipt_url || '', amount: String(e.amount), expense_method: isKnownMethod ? method : 'অন্যান্য', expense_method_other: isKnownMethod ? '' : method, add_to_inventory: false, inventory_item_id: '' });
    setExpenseDialog(true);
  };
  const openEditDeposit = (d: any) => {
    setEditingDepositId(d.id);
    setDepositForm({ deposit_date: d.deposit_date, bank_details: d.bank_details || '', other_details: d.other_details || '', amount: String(d.amount), source: d.source || 'manual' });
    setDepositDialog(true);
  };
  const openEditExpInst = (p: any) => {
    setEditingExpInstId(p.id);
    setExpInstForm({ name: p.name, name_bn: p.name_bn });
    setExpInstDialog(true);
  };
  const handleExcelDownload = () => {
    const rows: string[][] = [];
    // Header
    rows.push([bn ? 'প্রতিষ্ঠান' : 'Institution', bn ? instName : instNameEn]);
    rows.push([bn ? 'ঠিকানা' : 'Address', instAddress]);
    rows.push([bn ? 'ফোন' : 'Phone', instPhone]);
    rows.push([bn ? 'ইমেইল' : 'Email', instEmail]);
    if (instOther) rows.push([bn ? 'অন্যান্য' : 'Other', instOther]);
    rows.push([]);
    rows.push([bn ? 'খরচ প্রতিবেদন' : 'Expense Report', selectedMonthYear]);
    rows.push([]);
    // Summary
    rows.push([bn ? 'মোট খরচ' : 'Total Expense', `৳${formatNum(monthlyTotalExpense)}`, bn ? 'মোট জমা' : 'Total Deposit', `৳${formatNum(monthlyTotalDeposit)}`]);
    rows.push([bn ? 'পূর্ববর্তী বকেয়া' : 'Previous Arrears', `৳${formatNum(previousArrears)}`, bn ? 'ক্যাশ' : 'Cash', `৳${formatNum(monthlyCash)}`]);
    rows.push([]);

    expenseInstitutions.forEach((inst: any) => {
      const instExpenses = expenses.filter((e: any) => e.institution_id === inst.id);
      if (instExpenses.length === 0) return;
      const instTotal = instExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      rows.push([`${bn ? 'প্রতিষ্ঠান' : 'Institution'}: ${bn ? inst.name_bn : inst.name}`, '', '', '', `৳${formatNum(instTotal)}`]);

      const instCatsForPrint = categories.filter((c: any) => c.institution_id === inst.id);
      instCatsForPrint.forEach((cat: any) => {
        const catExpenses = instExpenses.filter((e: any) => e.category_id === cat.id);
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

  const [depositPrintPreview, setDepositPrintPreview] = useState(false);
  const [depositPrintEditMode, setDepositPrintEditMode] = useState(false);
  const [depositPrintEditData, setDepositPrintEditData] = useState({
    instName: '', instNameEn: '', instAddress: '', instPhone: '', instEmail: '', instOther: '', instLogo: '',
    reportTitle: '', reportSubtitle: '', casherName: '', principalName: '', extraNote: ''
  });

  const handleDepositExcelDownload = () => {
    const rows: string[][] = [];
    rows.push([bn ? 'প্রতিষ্ঠান' : 'Institution', bn ? instName : instNameEn]);
    rows.push([bn ? 'ঠিকানা' : 'Address', instAddress]);
    rows.push([bn ? 'ফোন' : 'Phone', instPhone]);
    rows.push([bn ? 'ইমেইল' : 'Email', instEmail]);
    if (instOther) rows.push([bn ? 'অন্যান্য' : 'Other', instOther]);
    rows.push([]);
    rows.push([bn ? 'জমা প্রতিবেদন' : 'Deposit Report', selectedMonthYear]);
    rows.push([]);
    rows.push(['#', bn ? 'তারিখ' : 'Date', bn ? 'ব্যাংক বিবরণ' : 'Bank Details', bn ? 'অন্যান্য বিবরণ' : 'Other Details', bn ? 'উৎস' : 'Source', bn ? 'টাকা' : 'Amount']);
    deposits.forEach((d: any, i: number) => {
      rows.push([String(i + 1), d.deposit_date, d.bank_details || '-', d.other_details || '-', d.source || '-', `৳${formatNum(Number(d.amount))}`]);
    });
    rows.push([]);
    rows.push([bn ? 'মোট জমা' : 'Total Deposit', `৳${formatNum(monthlyTotalDeposit)}`]);

    const csvContent = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deposit_report_${selectedMonthYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(bn ? 'ডাউনলোড হয়েছে' : 'Downloaded');
  };

  const handleInstExcelDownload = (instId: string) => {
    const inst = expenseInstitutions.find((p: any) => p.id === instId);
    if (!inst) return;
    const instExpensesFiltered = expenses.filter((e: any) => e.institution_id === instId);
    const instTotal = instExpensesFiltered.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const rows: string[][] = [];
    rows.push([bn ? 'প্রতিষ্ঠান' : 'Institution', bn ? instName : instNameEn]);
    rows.push([bn ? 'ঠিকানা' : 'Address', instAddress]);
    rows.push([bn ? 'ফোন' : 'Phone', instPhone]);
    rows.push([bn ? 'ইমেইল' : 'Email', instEmail]);
    if (instOther) rows.push([bn ? 'অন্যান্য' : 'Other', instOther]);
    rows.push([]);
    rows.push([`${bn ? 'প্রতিষ্ঠান' : 'Institution'}: ${bn ? inst.name_bn : inst.name}`, selectedMonthYear]);
    rows.push([]);

    const instCatsForPrint = categories.filter((c: any) => c.institution_id === instId);
    instCatsForPrint.forEach((cat: any) => {
      const catExpenses = instExpensesFiltered.filter((e: any) => e.category_id === cat.id);
      if (catExpenses.length === 0) return;
      const catTotal = catExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      rows.push([`${bn ? 'ক্যাটেগরি' : 'Category'}: ${bn ? cat.name_bn : cat.name}`, '', '', '', '', `৳${formatNum(catTotal)}`]);
      rows.push(['#', bn ? 'তারিখ' : 'Date', bn ? 'বিবরণ' : 'Description', bn ? 'পরিমাণ' : 'Qty', bn ? 'মাধ্যম' : 'Method', bn ? 'টাকা' : 'Amount', bn ? 'রসিদ' : 'Receipt']);
      catExpenses.forEach((e: any, i: number) => {
        rows.push([String(i + 1), e.expense_date, cleanDesc(e.description), `${e.quantity || 1} ${getUnit(e.description)}`, getMethod(e.description), `৳${formatNum(Number(e.amount))}`, e.has_receipt ? '✓' : '-']);
      });
      rows.push([]);
    });

    rows.push([bn ? 'প্রকল্প মোট খরচ' : 'Project Total', `৳${formatNum(instTotal)}`]);
    const csvContent = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bn ? inst.name_bn : inst.name}_${selectedMonthYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(bn ? 'ডাউনলোড হয়েছে' : 'Downloaded');
  };

  const openEditCategory = (c: any) => {
    setEditingCategoryId(c.id);
    setCategoryForm({ institution_id: (c as any).institution_id || '', name: c.name, name_bn: c.name_bn });
    setCategoryDialog(true);
  };
  const resetExpenseDialog = (open: boolean) => { if (!open) { setEditingExpenseId(null); setExpenseForm(defaultExpenseForm); } setExpenseDialog(open); };
  const resetDepositDialog = (open: boolean) => { if (!open) { setEditingDepositId(null); setDepositForm(defaultDepositForm); } setDepositDialog(open); };
  const resetExpInstDialog = (open: boolean) => { if (!open) { setEditingExpInstId(null); setExpInstForm({ name: '', name_bn: '' }); } setExpInstDialog(open); };
  const resetCategoryDialog = (open: boolean) => { if (!open) { setEditingCategoryId(null); setCategoryForm({ institution_id: '', name: '', name_bn: '' }); } setCategoryDialog(open); };

  return (
    <>
      <div className="space-y-6 relative">
        {/* Glassmorphism Container */}
        <div className="rounded-3xl border border-emerald-200/30 bg-white/40 dark:bg-white/5 backdrop-blur-xl p-6 space-y-6" style={{ boxShadow: '0 8px 32px rgba(16,185,129,0.06)' }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
              {bn ? 'খরচ ব্যবস্থাপনা' : 'Expense Management'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{bn ? 'আর্থিক লেনদেন পরিচালনা করুন' : 'Manage financial transactions'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterMode} onValueChange={(v: any) => setFilterMode(v)}>
              <SelectTrigger className="w-[140px] rounded-xl border-emerald-200/50 bg-white/60 dark:bg-white/10 backdrop-blur"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{bn ? 'মাসিক' : 'Monthly'}</SelectItem>
                <SelectItem value="yearly">{bn ? 'বাৎসরিক' : 'Yearly'}</SelectItem>
                <SelectItem value="session">{bn ? 'সেশন ইয়ার' : 'Session Year'}</SelectItem>
              </SelectContent>
            </Select>
            {filterMode === 'yearly' && (
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[110px] rounded-xl border-emerald-200/50 bg-white/60 dark:bg-white/10 backdrop-blur"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {filterMode === 'session' && (
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger className="w-[150px] rounded-xl border-emerald-200/50 bg-white/60 dark:bg-white/10 backdrop-blur"><SelectValue placeholder={bn ? 'সেশন বাছুন' : 'Select Session'} /></SelectTrigger>
                <SelectContent>
                  {academicSessions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn || s.name : s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={selectedMonthYear} onValueChange={setSelectedMonthYear}>
              <SelectTrigger className="w-[180px] rounded-xl border-emerald-200/50 bg-white/60 dark:bg-white/10 backdrop-blur"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {(() => {
                  if (filterMode === 'yearly') {
                    return MONTHS.map((m, i) => (
                      <SelectItem key={`${m}-${selectedYear}`} value={`${m}-${selectedYear}`}>
                        {bn ? `${MONTHS_BN[i]} ${selectedYear}` : `${m} ${selectedYear}`}
                      </SelectItem>
                    ));
                  }
                  if (filterMode === 'session') {
                    const session = academicSessions.find((s: any) => s.id === selectedSessionId);
                    if (session?.start_date && session?.end_date) {
                      const start = new Date(session.start_date);
                      const end = new Date(session.end_date);
                      const opts: { key: string; label: string }[] = [];
                      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
                      while (cur <= end) {
                        const mi = cur.getMonth();
                        const yr = cur.getFullYear();
                        const val = `${MONTHS[mi]}-${yr}`;
                        opts.push({ key: val, label: bn ? `${MONTHS_BN[mi]} ${yr}` : `${MONTHS[mi]} ${yr}` });
                        cur.setMonth(cur.getMonth() + 1);
                      }
                      return opts.map(o => (
                        <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                      ));
                    }
                    return <SelectItem value="" disabled>{bn ? 'সেশন বাছুন' : 'Select session first'}</SelectItem>;
                  }
                  return years.map(y => MONTHS.map((m, i) => (
                    <SelectItem key={`${m}-${y}`} value={`${m}-${y}`}>
                      {bn ? `${MONTHS_BN[i]} ${y}` : `${m} ${y}`}
                    </SelectItem>
                  )));
                })()}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Premium Stats Cards - Monthly */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: bn ? `${selectedMonthName} খরচ` : `${selectedMonthName} Expense`, val: monthlyTotalExpense, gradient: 'from-rose-500/10 via-red-400/5 to-transparent', iconBg: 'bg-gradient-to-br from-rose-500 to-red-400', icon: TrendingDown, color: 'text-rose-600 dark:text-rose-400', sparkColor: '#f43f5e', sparkData: [3,5,4,7,6,8,monthlyTotalExpense > 0 ? 10 : 0] },
            { label: bn ? `${selectedMonthName} জমা` : `${selectedMonthName} Deposit`, val: monthlyTotalDeposit, gradient: 'from-emerald-500/10 via-green-400/5 to-transparent', iconBg: 'bg-gradient-to-br from-emerald-500 to-green-400', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', sparkColor: '#10b981', sparkData: [2,4,3,6,5,7,monthlyTotalDeposit > 0 ? 10 : 0] },
            { label: bn ? `${selectedMonthName} ক্যাশ` : `${selectedMonthName} Cash`, val: monthlyCash, gradient: monthlyCash >= 0 ? 'from-blue-500/10 via-sky-400/5 to-transparent' : 'from-orange-500/10 via-amber-400/5 to-transparent', iconBg: monthlyCash >= 0 ? 'bg-gradient-to-br from-blue-500 to-sky-400' : 'bg-gradient-to-br from-orange-500 to-amber-400', icon: Wallet, color: monthlyCash >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400', sparkColor: monthlyCash >= 0 ? '#3b82f6' : '#f97316', sparkData: [5,4,6,3,7,5,8] },
            { label: bn ? 'বকেয়া' : 'Arrears', val: totalArrears, gradient: totalArrears > 0 ? 'from-amber-500/10 via-yellow-400/5 to-transparent' : 'from-slate-500/10 via-gray-400/5 to-transparent', iconBg: totalArrears > 0 ? 'bg-gradient-to-br from-amber-500 to-yellow-400' : 'bg-gradient-to-br from-slate-400 to-gray-400', icon: DollarSign, color: totalArrears > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground', sparkColor: '#f59e0b', sparkData: [2,3,2,4,3,5,totalArrears > 0 ? 6 : 0] },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className={`relative overflow-hidden rounded-2xl border border-emerald-200/20 dark:border-emerald-800/20 bg-gradient-to-br ${s.gradient} bg-white/60 dark:bg-white/5 backdrop-blur-lg p-4`}
              style={{ boxShadow: '0 4px 20px rgba(16,185,129,0.04)' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center shadow-lg`}>
                    <s.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <AnimatedCounter value={s.val} className={`text-xl font-bold ${s.color}`} />
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                </div>
                <MiniSparkline data={s.sparkData} color={s.sparkColor} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Overall / Filtered Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: `${filterLabel} ${bn ? 'খরচ' : 'Expense'}`, val: totalExpenseAll, gradient: 'from-rose-500/10 via-red-400/5 to-transparent', iconBg: 'bg-gradient-to-br from-rose-500 to-red-400', icon: TrendingDown, color: 'text-rose-600 dark:text-rose-400', sparkColor: '#f43f5e' },
            { label: `${filterLabel} ${bn ? 'জমা' : 'Deposit'}`, val: totalDepositAll, gradient: 'from-emerald-500/10 via-green-400/5 to-transparent', iconBg: 'bg-gradient-to-br from-emerald-500 to-green-400', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', sparkColor: '#10b981' },
            { label: `${filterLabel} ${bn ? 'ক্যাশ' : 'Cash'}`, val: totalCashAll, gradient: totalCashAll >= 0 ? 'from-blue-500/10 via-sky-400/5 to-transparent' : 'from-orange-500/10 via-amber-400/5 to-transparent', iconBg: totalCashAll >= 0 ? 'bg-gradient-to-br from-blue-500 to-sky-400' : 'bg-gradient-to-br from-orange-500 to-amber-400', icon: Wallet, color: totalCashAll >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400', sparkColor: totalCashAll >= 0 ? '#3b82f6' : '#f97316' },
            { label: `${filterLabel} ${bn ? 'বকেয়া' : 'Arrears'}`, val: totalArrearsAll, gradient: totalArrearsAll > 0 ? 'from-amber-500/10 via-yellow-400/5 to-transparent' : 'from-slate-500/10 via-gray-400/5 to-transparent', iconBg: totalArrearsAll > 0 ? 'bg-gradient-to-br from-amber-500 to-yellow-400' : 'bg-gradient-to-br from-slate-400 to-gray-400', icon: DollarSign, color: totalArrearsAll > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground', sparkColor: '#f59e0b' },
          ].map((s, i) => (
            <motion.div
              key={`all-${i}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
              className={`relative overflow-hidden rounded-2xl border border-emerald-200/20 dark:border-emerald-800/20 bg-gradient-to-br ${s.gradient} bg-white/60 dark:bg-white/5 backdrop-blur-lg p-4`}
              style={{ boxShadow: '0 4px 20px rgba(16,185,129,0.04)' }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center shadow-lg`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <AnimatedCounter value={s.val} className={`text-lg font-bold ${s.color}`} />
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Inventory Summary Card */}
        {inventoryItems.length > 0 && (() => {
          const totalStockValue = inventoryItems.reduce((s: number, item: any) => s + (Number(item.current_stock || 0) * Number(item.buying_price || 0)), 0);
          const lowStockItems = inventoryItems.filter((item: any) => Number(item.current_stock || 0) < Number(item.min_stock_level || 5));
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="relative overflow-hidden rounded-2xl border border-emerald-200/20 dark:border-emerald-800/20 bg-gradient-to-br from-teal-500/10 via-cyan-400/5 to-transparent bg-white/60 dark:bg-white/5 backdrop-blur-lg p-4"
                style={{ boxShadow: '0 4px 20px rgba(16,185,129,0.04)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center shadow-lg">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <AnimatedCounter value={totalStockValue} className="text-lg font-bold text-teal-600 dark:text-teal-400" />
                    <p className="text-[11px] text-muted-foreground mt-0.5">{bn ? 'মোট স্টক মূল্য' : 'Total Stock Value'}</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className={`relative overflow-hidden rounded-2xl border ${lowStockItems.length > 0 ? 'border-amber-300/30 dark:border-amber-700/30' : 'border-emerald-200/20 dark:border-emerald-800/20'} bg-gradient-to-br ${lowStockItems.length > 0 ? 'from-amber-500/10 via-orange-400/5 to-transparent' : 'from-emerald-500/10 via-green-400/5 to-transparent'} bg-white/60 dark:bg-white/5 backdrop-blur-lg p-4`}
                style={{ boxShadow: '0 4px 20px rgba(16,185,129,0.04)' }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${lowStockItems.length > 0 ? 'bg-gradient-to-br from-amber-500 to-orange-400' : 'bg-gradient-to-br from-emerald-500 to-green-400'} flex items-center justify-center shadow-lg shrink-0`}>
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-lg font-bold ${lowStockItems.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{lowStockItems.length}</p>
                    <p className="text-[11px] text-muted-foreground">{bn ? 'কম স্টক সতর্কতা' : 'Low Stock Alerts'}</p>
                    {lowStockItems.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lowStockItems.slice(0, 3).map((item: any) => (
                          <span key={item.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                            {bn ? item.name_bn : (item.name_en || item.name_bn)}: {item.current_stock}
                          </span>
                        ))}
                        {lowStockItems.length > 3 && <span className="text-[10px] text-muted-foreground">+{lowStockItems.length - 3}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}

        {/* Project & Category Breakdown Tabs */}
        {(institutionBreakdown.length > 0 || categoryBreakdown.length > 0) && (
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { value: 'institution' as const, label: bn ? 'প্রতিষ্ঠান ভিত্তিক খরচ' : 'Institution-wise' },
                  { value: 'category' as const, label: bn ? 'ক্যাটেগরি ভিত্তিক খরচ' : 'Category-wise' },
                ].map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => setBreakdownTab(prev => prev === tab.value ? null : tab.value)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 whitespace-nowrap ${breakdownTab === tab.value ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {breakdownTab === 'institution' && (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{bn ? 'প্রতিষ্ঠান' : 'Institution'}</TableHead>
                        <TableHead className="text-right">{bn ? `${selectedMonthName} খরচ` : `${selectedMonthName}`}</TableHead>
                        <TableHead className="text-right">{`${filterLabel} ${bn ? 'খরচ' : 'Total'}`}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {institutionBreakdown.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{bn ? p.name_bn : p.name}</TableCell>
                          <TableCell className="text-right text-destructive">৳{formatNum(p.monthly)}</TableCell>
                          <TableCell className="text-right text-destructive font-semibold">৳{formatNum(p.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {breakdownTab === 'category' && (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{bn ? 'ক্যাটেগরি' : 'Category'}</TableHead>
                        <TableHead className="text-right">{bn ? `${selectedMonthName} খরচ` : `${selectedMonthName}`}</TableHead>
                        <TableHead className="text-right">{`${filterLabel} ${bn ? 'খরচ' : 'Total'}`}</TableHead>
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
              )}
            </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { value: 'dashboard', label: bn ? 'খরচ' : 'Expenses' },
              { value: 'deposits', label: bn ? 'জমা' : 'Deposits' },
              { value: 'settings', label: bn ? 'প্রতিষ্ঠান' : 'Institutions' },
              { value: 'summary', label: bn ? 'সারাংশ' : 'Summary' },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(activeTab === tab.value ? '' : tab.value)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.value
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-white/60 dark:bg-white/10 backdrop-blur border border-emerald-200/30 dark:border-emerald-800/30 text-muted-foreground hover:text-foreground hover:shadow-md hover:border-emerald-300/50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Expenses Tab - Drill-down: Projects → Categories → Expenses */}
          <TabsContent value="dashboard" className="space-y-4">
            {/* Institution Tabs */}
            {expenseInstitutions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{bn ? 'কোনো প্রতিষ্ঠান নেই। সেটিংস ট্যাব থেকে যোগ করুন।' : 'No institutions. Add from Settings tab.'}</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 items-center">
                  {expenseInstitutions.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedInstId(selectedInstId === p.id ? '' : p.id); setSelectedCategoryId(null); }}
                      className={`group px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${selectedInstId === p.id
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                        : 'bg-white/60 dark:bg-white/10 backdrop-blur border border-emerald-200/30 dark:border-emerald-800/30 text-foreground hover:shadow-md hover:border-emerald-300/50'}`}
                    >
                      <Building2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                      {bn ? p.name_bn : p.name}
                      <span className="ml-2 text-[11px] opacity-80">৳{formatNum(getInstMonthly(p.id))}</span>
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-3">
                    <span className="text-sm font-semibold text-destructive">
                      {bn ? 'মোট:' : 'Total:'} ৳{formatNum(monthlyTotalExpense)}
                    </span>
                    {canAddItem && !selectedInstId && (
                      <motion.button
                        whileHover={{ scale: 1.04, boxShadow: '0 8px 32px -4px rgba(16,185,129,0.45)' }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                          setReceiptFile(null);
                          setEditingExpenseId(null);
                          setExpenseForm(defaultExpenseForm);
                          setExpenseDialog(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide text-white border border-white/20 backdrop-blur-sm transition-all duration-300"
                        style={{ background: 'linear-gradient(135deg, hsl(160 84% 30%), hsl(160 70% 36%))', boxShadow: '0 4px 20px -4px rgba(16,185,129,0.35)' }}
                      >
                        <Plus className="w-4 h-4" />
                        <span>{bn ? 'খরচ যোগ করুন' : 'Add Expense'}</span>
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Breadcrumb when inside a category */}
                {selectedInstId && selectedCategoryId && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <button onClick={() => setSelectedCategoryId(null)} className="text-primary hover:underline cursor-pointer">
                      {bn ? selectedInst?.name_bn : selectedInst?.name}
                    </button>
                    <span>/</span>
                    <span className="font-medium text-foreground">{bn ? selectedCategory?.name_bn : selectedCategory?.name}</span>
                  </div>
                )}
              </>
            )}

            {/* Level 2: Category List for selected project */}
            {selectedInstId && !selectedCategoryId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{bn ? 'ক্যাটেগরি নির্বাচন করুন' : 'Select Category'} — {bn ? selectedInst?.name_bn : selectedInst?.name}</h3>
                  {canAddItem && (
                    <motion.button
                      whileHover={{ scale: 1.04, boxShadow: '0 8px 32px -4px rgba(16,185,129,0.45)' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setReceiptFile(null);
                        setEditingExpenseId(null);
                        setExpenseForm({ ...defaultExpenseForm, institution_id: selectedInstId });
                        setExpenseDialog(true);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[16px] text-sm font-semibold tracking-wide text-white border border-white/20 backdrop-blur-sm transition-all duration-300"
                      style={{ background: 'linear-gradient(135deg, hsl(160 84% 30%), hsl(160 70% 36%))' , boxShadow: '0 4px 20px -4px rgba(16,185,129,0.35)' }}
                    >
                      <Plus className="w-4 h-4" />{bn ? 'খরচ এন্ট্রি' : 'Add Expense'}
                    </motion.button>
                  )}
                </div>
                {instCategories.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">{bn ? 'এই প্রতিষ্ঠানে কোনো ক্যাটেগরি নেই।' : 'No categories in this institution.'}</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {instCategories.map((c: any) => (
                      <motion.div
                        key={c.id}
                        whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(16,185,129,0.12)' }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-3 cursor-pointer rounded-2xl border border-emerald-200/20 dark:border-emerald-800/20 bg-white/60 dark:bg-white/5 backdrop-blur-lg p-4 hover:border-emerald-300/40"
                        onClick={() => setSelectedCategoryId(c.id)}
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                          <TagIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-foreground text-sm leading-tight truncate">{bn ? c.name_bn : c.name}</h4>
                          <div className="flex gap-3 text-[11px] text-muted-foreground mt-0.5">
                            <span>{bn ? `${selectedMonthName}:` : `${selectedMonthName}:`} <span className="text-rose-500 font-medium">৳{formatNum(getCategoryMonthly(c.id))}</span></span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Level 3: Expenses for selected project+category */}
            {selectedInstId && selectedCategoryId && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{bn ? 'খরচ তালিকা' : 'Expense List'} ({selectedMonthYear})</h3>
                </div>

                {categoryExpenses.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">{bn ? 'কোনো খরচ নেই' : 'No expenses'}</p>
                ) : (
                  <div className="space-y-3">
                    {categoryExpenses.map((e: any, i: number) => (
                      <motion.div
                        key={e.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(16,185,129,0.12)' }}
                        className="rounded-[20px] border border-emerald-200/20 dark:border-emerald-800/20 bg-white/70 dark:bg-white/5 backdrop-blur-lg p-4 flex items-center gap-4 transition-all"
                      >
                        <span className="text-xs font-bold text-muted-foreground w-6 text-center">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground text-sm truncate">{cleanDesc(e.description)}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{getMethod(e.description)}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{e.expense_date}</span>
                            <span>{e.quantity} {getUnit(e.description)}</span>
                          </div>
                        </div>
                        {/* Receipt glowing dot */}
                        <div className="flex items-center gap-1">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${e.has_receipt ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'}`} />
                          {e.has_receipt && e.receipt_url && (
                            <Button variant="ghost" size="sm" className="text-emerald-600 p-0 h-auto text-xs" onClick={() => setReceiptPreview(e.receipt_url)}>
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                        <span className="font-bold text-foreground text-sm whitespace-nowrap">৳{formatNum(Number(e.amount))}</span>
                        <div className="flex gap-1">
                          <button onClick={() => setVoucherExpense(e)} className="w-8 h-8 rounded-full bg-white dark:bg-white/10 border border-blue-200/30 flex items-center justify-center shadow-sm hover:shadow-md hover:scale-110 transition-all" title={bn ? 'ভাউচার' : 'Voucher'}><FileText className="w-3.5 h-3.5 text-blue-500" /></button>
                          {canEditItem && <button onClick={() => openEditExpense(e)} className="w-8 h-8 rounded-full bg-white dark:bg-white/10 border border-emerald-200/30 flex items-center justify-center shadow-sm hover:shadow-md hover:scale-110 transition-all"><Edit2 className="w-3.5 h-3.5 text-emerald-600" /></button>}
                          {canDeleteItem && <button onClick={() => { setDeleteConfirmId(e.id); setDeleteConfirmType('expense'); }} className="w-8 h-8 rounded-full bg-white dark:bg-white/10 border border-rose-200/30 flex items-center justify-center shadow-sm hover:shadow-md hover:scale-110 transition-all"><Trash2 className="w-3.5 h-3.5 text-rose-500" /></button>}
                        </div>
                      </motion.div>
                    ))}
                    {/* Total bar */}
                    <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200/30 p-4 flex justify-between items-center">
                      <span className="font-semibold text-foreground">{bn ? 'মোট খরচ:' : 'Total:'}</span>
                      <span className="font-bold text-lg text-emerald-600">৳{formatNum(categoryExpenseTotal)}</span>
                    </div>
                    {/* Add Expense Button below total */}
                    {canAddItem && (
                      <motion.button
                        whileHover={{ scale: 1.04, boxShadow: '0 12px 40px -6px rgba(16,185,129,0.5)' }}
                        whileTap={{ scale: 0.92 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => {
                          setReceiptFile(null);
                          setEditingExpenseId(null);
                          setExpenseForm({ ...defaultExpenseForm, institution_id: selectedInstId, category_id: selectedCategoryId });
                          setExpenseDialog(true);
                        }}
                        className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-[16px] text-white text-sm font-semibold tracking-wide border border-white/20 backdrop-blur-sm transition-all duration-300"
                        style={{ background: 'linear-gradient(135deg, hsl(160 84% 30%), hsl(160 70% 36%))', boxShadow: '0 4px 20px -4px rgba(16,185,129,0.35)' }}
                      >
                        <Plus className="w-5 h-5" />
                        <span>{bn ? 'খরচ যোগ করুন' : 'Add Expense'}</span>
                      </motion.button>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Deposits Tab */}
          <TabsContent value="deposits" className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h3 className="font-semibold">{bn ? 'জমা তালিকা' : 'Deposit List'} ({selectedMonthYear})</h3>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => {
                  setDepositPrintEditData({
                    instName, instNameEn, instAddress, instPhone, instEmail, instOther, instLogo,
                    reportTitle: bn ? 'জমা প্রতিবেদন' : 'Deposit Report',
                    reportSubtitle: '', casherName: summaryData?.casher_name || '', principalName: summaryData?.principal_name || '', extraNote: ''
                  });
                  setDepositPrintEditMode(false);
                  setDepositPrintPreview(true);
                }}>
                  <Eye className="w-4 h-4 mr-1" />{bn ? 'প্রিভিউ' : 'Preview'}
                </Button>
                <Button size="sm" variant="outline" onClick={handleDepositExcelDownload}>
                  <Download className="w-4 h-4 mr-1" />{bn ? 'এক্সেল' : 'Excel'}
                </Button>
                {canAddItem && <Dialog open={depositDialog} onOpenChange={resetDepositDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-1" />{bn ? 'জমা যোগ' : 'Add Deposit'}</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editingDepositId ? (bn ? 'জমা সম্পাদনা' : 'Edit Deposit') : (bn ? 'নতুন জমা' : 'New Deposit')}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>{bn ? 'তারিখ' : 'Date'} *</Label>
                        <DatePicker bengali={bn} value={depositForm.deposit_date} onChange={v => setDepositForm(f => ({ ...f, deposit_date: v }))} />
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
                        <Input type="text" inputMode="decimal" value={depositForm.amount} onChange={e => setDepositForm(f => ({ ...f, amount: onlyNumbers(e.target.value) }))} />
                      </div>
                      <Button className="w-full" onClick={() => addDeposit.mutate()} disabled={addDeposit.isPending}>
                        {bn ? 'সংরক্ষণ করুন' : 'Save'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>}
              </div>
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
                        <Button variant="ghost" size="icon" onClick={() => { setDeleteConfirmId(d.id); setDeleteConfirmType('deposit'); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
                  <CardTitle className="text-base">{bn ? 'প্রতিষ্ঠান' : 'Institutions'}</CardTitle>
                  <Dialog open={expInstDialog} onOpenChange={resetExpInstDialog}>
                    <DialogTrigger asChild><Button size="sm" variant="outline"><FolderPlus className="w-4 h-4 mr-1" />{bn ? 'যোগ' : 'Add'}</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{editingExpInstId ? (bn ? 'প্রকল্প সম্পাদনা' : 'Edit Project') : (bn ? 'নতুন প্রকল্প' : 'New Project')}</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div><Label>{bn ? 'নাম (ইংরেজি)' : 'Name (English)'} *</Label><Input value={expInstForm.name} onChange={e => setExpInstForm(f => ({ ...f, name: e.target.value }))} /></div>
                        <div><Label>{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} *</Label><Input value={expInstForm.name_bn} onChange={e => setExpInstForm(f => ({ ...f, name_bn: e.target.value }))} /></div>
                        <Button className="w-full" onClick={() => addExpInst.mutate()} disabled={addExpInst.isPending}>{bn ? 'সংরক্ষণ' : 'Save'}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {expenseInstitutions.length === 0 ? <p className="text-sm text-muted-foreground">{bn ? 'কোনো প্রতিষ্ঠান নেই' : 'No institutions'}</p> : (
                    <ul className="space-y-2">
                      {expenseInstitutions.map((p: any) => (
                        <li key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                          <span className="text-sm font-medium">{bn ? p.name_bn : p.name}</span>
                          <Button variant="ghost" size="icon" onClick={() => openEditExpInst(p)}><Edit2 className="w-4 h-4 text-muted-foreground" /></Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Expense Institutions */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">{bn ? 'শাখা/প্রতিষ্ঠান' : 'Institutions'}</CardTitle>
                  <Dialog open={expInstDialog} onOpenChange={(open) => { if (!open) { setEditingExpInstId(null); setExpInstForm({ name: '', name_bn: '' }); } setExpInstDialog(open); }}>
                    <DialogTrigger asChild><Button size="sm" variant="outline"><Building2 className="w-4 h-4 mr-1" />{bn ? 'যোগ' : 'Add'}</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{editingExpInstId ? (bn ? 'শাখা সম্পাদনা' : 'Edit Institution') : (bn ? 'নতুন শাখা' : 'New Institution')}</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <Label>{bn ? 'প্রতিষ্ঠান' : 'Institution'} *</Label>
                          <Select value={expInstForm.name} onValueChange={v => setExpInstForm(f => ({ ...f, name: v }))}>
                            <SelectTrigger><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                            <SelectContent>{expenseInstitutions.map((p: any) => <SelectItem key={p.id} value={p.id}>{bn ? p.name_bn : p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div><Label>{bn ? 'নাম (ইংরেজি)' : 'Name (English)'} *</Label><Input value={expInstForm.name} onChange={e => setExpInstForm(f => ({ ...f, name: e.target.value }))} /></div>
                        <div><Label>{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} *</Label><Input value={expInstForm.name_bn} onChange={e => setExpInstForm(f => ({ ...f, name_bn: e.target.value }))} /></div>
                        <Button className="w-full" onClick={() => addExpInst.mutate()} disabled={addExpInst.isPending}>{bn ? 'সংরক্ষণ' : 'Save'}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {expenseInstitutions.length === 0 ? <p className="text-sm text-muted-foreground">{bn ? 'কোনো শাখা নেই' : 'No institutions'}</p> : (
                    <ul className="space-y-2">
                      {expenseInstitutions.map((inst: any) => {
                        const proj = expenseInstitutions.find((p: any) => p.id === inst.id);
                        return (
                          <li key={inst.id} className="flex items-center justify-between p-2 rounded-[12px] bg-primary/5 border border-primary/10">
                            <div>
                              <Building2 className="w-3.5 h-3.5 inline mr-1.5 text-primary" />
                              <span className="text-sm font-medium">{bn ? inst.name_bn : inst.name}</span>
                              {proj && <span className="text-xs text-muted-foreground ml-2">({bn ? proj.name_bn : proj.name})</span>}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingExpInstId(inst.id); setExpInstForm({ name: inst.name, name_bn: inst.name_bn }); setExpInstDialog(true); }}><Edit2 className="w-4 h-4 text-muted-foreground" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm(bn ? 'মুছে ফেলতে চান?' : 'Delete?')) deleteExpInst.mutate(inst.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Categories - full width below */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{bn ? 'ক্যাটেগরি' : 'Categories'}</CardTitle>
                <Dialog open={categoryDialog} onOpenChange={resetCategoryDialog}>
                  <DialogTrigger asChild><Button size="sm" variant="outline"><TagIcon className="w-4 h-4 mr-1" />{bn ? 'যোগ' : 'Add'}</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editingCategoryId ? (bn ? 'ক্যাটেগরি সম্পাদনা' : 'Edit Category') : (bn ? 'নতুন ক্যাটেগরি' : 'New Category')}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>{bn ? 'প্রতিষ্ঠান' : 'Institution'} *</Label>
                        <Select value={categoryForm.institution_id} onValueChange={v => setCategoryForm(f => ({ ...f, institution_id: v }))}>
                          <SelectTrigger><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                          <SelectContent>{expenseInstitutions.map((p: any) => <SelectItem key={p.id} value={p.id}>{bn ? p.name_bn : p.name}</SelectItem>)}</SelectContent>
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
                    {categories.map((c: any) => {
                      const catInst = expenseInstitutions.find((i: any) => i.id === (c as any).institution_id);
                      return (
                        <li key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                          <div>
                            <span className="text-sm font-medium">{bn ? c.name_bn : c.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">({bn ? (c as any).expense_institutions?.name_bn : (c as any).expense_institutions?.name})</span>
                            {catInst && <span className="text-xs text-primary ml-1">• {bn ? catInst.name_bn : catInst.name}</span>}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => openEditCategory(c)}><Edit2 className="w-4 h-4 text-muted-foreground" /></Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{bn ? `${selectedMonthName} সারাংশ` : `${selectedMonthName} Summary`}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="stat-card flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                      <TrendingDown className="w-5 h-5 text-destructive" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-destructive leading-tight">৳{formatNum(monthlyTotalExpense)}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{bn ? 'মোট খরচ' : 'Total Expense'}</p>
                    </div>
                  </div>
                  <div className="stat-card flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-primary leading-tight">৳{formatNum(monthlyTotalDeposit)}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{bn ? 'মোট জমা' : 'Total Deposit'}</p>
                    </div>
                  </div>
                  <div className="stat-card flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${totalArrears > 0 ? 'bg-destructive/10' : 'bg-muted/50'} flex items-center justify-center shrink-0`}>
                      <DollarSign className={`w-5 h-5 ${totalArrears > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-lg font-bold leading-tight ${totalArrears > 0 ? 'text-destructive' : 'text-foreground'}`}>৳{formatNum(totalArrears)}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{bn ? 'বকেয়া' : 'Arrears'}</p>
                    </div>
                  </div>
                  <div className="stat-card flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${monthlyCash >= 0 ? 'bg-primary/10' : 'bg-destructive/10'} flex items-center justify-center shrink-0`}>
                      <Wallet className={`w-5 h-5 ${monthlyCash >= 0 ? 'text-primary' : 'text-destructive'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-lg font-bold leading-tight ${monthlyCash >= 0 ? 'text-primary' : 'text-destructive'}`}>৳{formatNum(monthlyCash)}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{bn ? 'ক্যাশ' : 'Cash'}</p>
                    </div>
                  </div>
                </div>

                {/* Institution Management */}
                <div className="card-elevated p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-foreground">{bn ? 'প্রতিষ্ঠানের তথ্য' : 'Institution Info'}</h4>
                    <div className="flex gap-2">
                      <Dialog open={institutionDialog} onOpenChange={(open) => { if (!open) { setEditingInstitutionId(null); setInstitutionForm({ name: '', name_en: '', address: '', phone: '', email: '', other_info: '', logo_url: '' }); setLogoFile(null); } setInstitutionDialog(open); }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />{bn ? 'নতুন প্রতিষ্ঠান' : 'New Institution'}</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>{editingInstitutionId ? (bn ? 'প্রতিষ্ঠান সম্পাদনা' : 'Edit Institution') : (bn ? 'নতুন প্রতিষ্ঠান' : 'New Institution')}</DialogTitle></DialogHeader>
                          <div className="space-y-3 max-h-[70vh] overflow-auto">
                            <div><Label>{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} *</Label><Input value={institutionForm.name} onChange={e => setInstitutionForm(f => ({ ...f, name: e.target.value }))} /></div>
                            <div><Label>{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</Label><Input value={institutionForm.name_en} onChange={e => setInstitutionForm(f => ({ ...f, name_en: e.target.value }))} /></div>
                            <div><Label>{bn ? 'ঠিকানা' : 'Address'}</Label><Input value={institutionForm.address} onChange={e => setInstitutionForm(f => ({ ...f, address: e.target.value }))} /></div>
                            <div><Label>{bn ? 'ফোন' : 'Phone'}</Label><Input value={institutionForm.phone} onChange={e => setInstitutionForm(f => ({ ...f, phone: e.target.value }))} /></div>
                            <div><Label>{bn ? 'ইমেইল' : 'Email'}</Label><Input value={institutionForm.email} onChange={e => setInstitutionForm(f => ({ ...f, email: e.target.value }))} /></div>
                            <div><Label>{bn ? 'অন্যান্য তথ্য' : 'Other Info'}</Label><Input value={institutionForm.other_info} onChange={e => setInstitutionForm(f => ({ ...f, other_info: e.target.value }))} placeholder={bn ? 'EIIN, MPO নং ইত্যাদি' : 'EIIN, MPO No.'} /></div>
                            <div>
                              <Label>{bn ? 'লোগো আপলোড' : 'Logo Upload'}</Label>
                              {institutionForm.logo_url && (
                                <div className="mb-2 flex items-center gap-2">
                                  <img src={institutionForm.logo_url} alt="Logo" className="w-16 h-16 object-contain border rounded" />
                                  <Button variant="ghost" size="sm" onClick={() => setInstitutionForm(f => ({ ...f, logo_url: '' }))}><Trash2 className="w-3 h-3 mr-1" />{bn ? 'সরান' : 'Remove'}</Button>
                                </div>
                              )}
                              <Input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { if (f.size > 300 * 1024) { toast.error(bn ? 'সর্বোচ্চ ৩০০KB' : 'Max 300KB'); return; } setLogoFile(f); } }} />
                              {logoFile && <p className="text-xs text-muted-foreground mt-1">{logoFile.name}</p>}
                            </div>
                            <Button className="w-full" onClick={() => saveInstitution.mutate()} disabled={saveInstitution.isPending || logoUploading}>
                              {logoUploading ? (bn ? 'আপলোড হচ্ছে...' : 'Uploading...') : (bn ? 'সংরক্ষণ' : 'Save')}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  {institutions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{bn ? 'কোনো প্রতিষ্ঠান নেই' : 'No institutions'}</p>
                  ) : (
                    <div className="space-y-2">
                      {institutions.map((inst: any) => (
                        <div key={inst.id} className={`stat-card flex items-center justify-between ${selectedInstitutionId === inst.id ? 'border-primary bg-primary/5' : ''}`}>
                          <div className="cursor-pointer flex-1 flex items-center gap-2" onClick={() => setSelectedInstitutionId(inst.id)}>
                            {inst.logo_url && <img src={inst.logo_url} alt="Logo" className="w-8 h-8 object-contain rounded" />}
                            <div>
                              <span className="text-sm font-medium">{bn ? inst.name : (inst.name_en || inst.name)}</span>
                              {inst.address && <span className="text-xs text-muted-foreground ml-2">— {inst.address}</span>}
                              {selectedInstitutionId === inst.id && <span className="text-xs text-primary ml-2">✓ {bn ? 'নির্বাচিত' : 'Selected'}</span>}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingInstitutionId(inst.id); setInstitutionForm({ name: inst.name, name_en: inst.name_en || '', address: inst.address || '', phone: inst.phone || '', email: inst.email || '', other_info: inst.other_info || '', logo_url: inst.logo_url || '' }); setInstitutionDialog(true); }}>
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm(bn ? 'এই প্রতিষ্ঠান মুছে ফেলতে চান?' : 'Delete this institution?')) { deleteInstitution.mutate(inst.id); if (selectedInstitutionId === inst.id) setSelectedInstitutionId(''); } }}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedInstitution && (
                    <p className="text-xs text-muted-foreground mt-2">{bn ? 'নির্বাচিত প্রতিষ্ঠানের তথ্য প্রিন্ট ও এক্সেল ফাইলে ব্যবহৃত হবে' : 'Selected institution info will be used in print & Excel files'}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>{bn ? 'পূর্ববর্তী বকেয়া' : 'Previous Arrears'}</Label>
                    <Input type="text" inputMode="decimal" value={summaryForm.previous_arrears} onChange={e => setSummaryForm(f => ({ ...f, previous_arrears: onlyNumbers(e.target.value) }))} />
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

                {/* Per-institution download */}
                {expenseInstitutions.length > 0 && (
                  <div className="card-elevated p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-foreground">{bn ? 'প্রতিষ্ঠান ভিত্তিক ডাউনলোড' : 'Per-Project Download'}</h4>
                      {institutions.length > 1 && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">{bn ? 'প্রতিষ্ঠান:' : 'Institution:'}</Label>
                          <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
                            <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {institutions.map((inst: any) => <SelectItem key={inst.id} value={inst.id}>{bn ? inst.name : (inst.name_en || inst.name)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {expenseInstitutions.map((p: any) => {
                        const projExp = expenses.filter((e: any) => e.institution_id === p.id);
                        const instTotal = projExp.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                        if (projExp.length === 0) return null;
                        return (
                          <div key={p.id} className="stat-card flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium">{bn ? p.name_bn : p.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">৳{formatNum(instTotal)}</span>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" onClick={() => setEditInstitutionEntriesId(p.id)}>
                                <Edit2 className="w-3 h-3 mr-1" />{bn ? 'এডিট' : 'Edit'}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setPrintInstitutionId(p.id)}>
                                <Printer className="w-3 h-3 mr-1" />{bn ? 'প্রিন্ট' : 'Print'}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleInstExcelDownload(p.id)}>
                                <Download className="w-3 h-3 mr-1" />{bn ? 'এক্সেল' : 'Excel'}
                              </Button>
                            </div>
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
        </div>{/* end glassmorphism container */}
      </div>{/* end space-y-6 */}

      {/* Print Section */}
      <div className="print-section hidden print:block p-8" style={{ fontFamily: "'Noto Sans Bengali', sans-serif" }}>
        {/* Institution Header */}
        <div className="text-center mb-4 border-b-2 border-black pb-3">
          {instLogo && <img src={instLogo} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-1" />}
          <h1 className="text-lg font-bold">{bn ? instName : instNameEn}</h1>
          <p className="text-sm">{instAddress}</p>
          <p className="text-xs">{bn ? 'ফোন' : 'Phone'}: {instPhone} | {bn ? 'ইমেইল' : 'Email'}: {instEmail}</p>
          {instOther && <p className="text-xs">{instOther}</p>}
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
        {expenseInstitutions.map((inst: any) => {
          const instExpenses = expenses.filter((e: any) => e.institution_id === inst.id);
          if (instExpenses.length === 0) return null;
          const instTotal = instExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
          const instCatsForPrint = categories.filter((c: any) => c.institution_id === inst.id);
          
          return (
            <div key={inst.id} className="mb-6" style={{ pageBreakInside: 'avoid' }}>
              <h2 className="text-base font-bold mb-1 border-b pb-1">
                {bn ? 'প্রতিষ্ঠান' : 'Institution'}: {bn ? inst.name_bn : inst.name}
                <span className="float-right">{bn ? 'মোট' : 'Total'}: ৳{formatNum(instTotal)}</span>
              </h2>
              
              {instCatsForPrint.map((cat: any) => {
                const catExpenses = instExpenses.filter((e: any) => e.category_id === cat.id);
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
      <Dialog open={expenseDialog} onOpenChange={resetExpenseDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingExpenseId ? (bn ? 'খরচ সম্পাদনা' : 'Edit Expense') : (bn ? 'নতুন খরচ' : 'New Expense')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{bn ? 'প্রতিষ্ঠান' : 'Institution'} *</Label>
              <Select
                value={expenseForm.institution_id || undefined}
                onValueChange={value => setExpenseForm(f => ({ ...f, institution_id: value, category_id: '' }))}
              >
                <SelectTrigger><SelectValue placeholder={bn ? 'প্রতিষ্ঠান নির্বাচন করুন' : 'Select institution'} /></SelectTrigger>
                <SelectContent>
                  {expenseInstitutions.map((inst: any) => <SelectItem key={inst.id} value={inst.id}>{bn ? inst.name_bn : inst.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{bn ? 'ক্যাটেগরি' : 'Category'} *</Label>
              <Select
                value={expenseForm.category_id || undefined}
                onValueChange={value => {
                  const cat = categories.find((c: any) => c.id === value);
                  const catName = (cat?.name || '').toLowerCase();
                  const catNameBn = cat?.name_bn || '';
                  const isInventoryCategory = catName.includes('grocery') || catName.includes('stationar') || catNameBn.includes('খাদ্য') || catNameBn.includes('স্টেশনার') || catNameBn.includes('মুদি');
                  setExpenseForm(f => ({ ...f, category_id: value, add_to_inventory: isInventoryCategory ? true : f.add_to_inventory }));
                }}
                disabled={!expenseForm.institution_id}
              >
                <SelectTrigger><SelectValue placeholder={bn ? 'ক্যাটেগরি নির্বাচন করুন' : 'Select category'} /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((category: any) => <SelectItem key={category.id} value={category.id}>{bn ? category.name_bn : category.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedExpenseProject && !selectedExpenseCategory && (
                <p className="mt-1 text-xs text-muted-foreground">{bn ? 'এই প্রতিষ্ঠানের জন্য একটি ক্যাটেগরি নির্বাচন করুন' : 'Select a category for this institution'}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{bn ? 'তারিখ' : 'Date'} *</Label>
                <DatePicker bengali={bn} value={expenseForm.expense_date} onChange={v => setExpenseForm(f => ({ ...f, expense_date: v }))} />
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
                      <SelectValue placeholder={bn ? 'একক' : 'Unit'} />
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
              <div className="flex flex-col gap-2">
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => {
                    const scanInput = document.createElement('input');
                    scanInput.type = 'file';
                    scanInput.accept = 'image/*';
                    scanInput.capture = 'environment';
                    scanInput.onchange = (ev) => {
                      const file = (ev.target as HTMLInputElement).files?.[0] || null;
                      if (file) {
                        setReceiptFile(file);
                        setExpenseForm(f => ({ ...f, has_receipt: true }));
                        toast.success(bn ? 'রসিদ স্ক্যান সফল হয়েছে' : 'Receipt scanned successfully');
                      }
                    };
                    scanInput.click();
                  }}
                >
                  <ScanLine className="h-4 w-4" />
                  {bn ? 'স্ক্যানার দিয়ে স্ক্যান করুন' : 'Scan with Scanner'}
                </Button>
              </div>
              {receiptFile && (
                <p className="text-xs text-muted-foreground mt-1 truncate">{receiptFile.name}</p>
              )}
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

            {/* Inventory Integration Toggle */}
            <div className="rounded-xl border border-emerald-200/30 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                  <Label className="text-sm font-semibold">{bn ? 'ইনভেন্টরিতে যোগ হবে?' : 'Add to Inventory?'}</Label>
                </div>
                <Switch
                  checked={expenseForm.add_to_inventory}
                  onCheckedChange={v => setExpenseForm(f => ({ ...f, add_to_inventory: v, inventory_item_id: v ? f.inventory_item_id : '' }))}
                />
              </div>
              {expenseForm.add_to_inventory && (
                <div>
                  <Label className="text-xs">{bn ? 'ইনভেন্টরি আইটেম নির্বাচন করুন' : 'Select Inventory Item'}</Label>
                  <Select
                    value={expenseForm.inventory_item_id || undefined}
                    onValueChange={v => setExpenseForm(f => ({ ...f, inventory_item_id: v }))}
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder={bn ? 'আইটেম বাছুন...' : 'Select item...'} /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {inventoryItems.map((item: any) => (
                        <SelectItem key={item.id} value={item.id}>
                          {bn ? item.name_bn : (item.name_en || item.name_bn)} — {bn ? 'স্টক:' : 'Stock:'} {item.current_stock} {item.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {inventoryItems.length === 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">{bn ? 'ইনভেন্টরি পেজ থেকে আইটেম যোগ করুন' : 'Add items from Inventory page first'}</p>
                  )}
                </div>
              )}
            </div>

            <Button className="w-full" onClick={() => addExpense.mutate()} disabled={addExpense.isPending || uploading}>
              {uploading ? (bn ? 'আপলোড হচ্ছে...' : 'Uploading...') : (bn ? 'সংরক্ষণ করুন' : 'Save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ExpenseVoucherPrint expense={voucherExpense} open={!!voucherExpense} onClose={() => setVoucherExpense(null)} />

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

      {/* Project Entries Edit Dialog */}
      <Dialog open={!!editInstitutionEntriesId} onOpenChange={(open) => { if (!open) { setEditInstitutionEntriesId(null); setEntriesFilterCategoryId('all'); setEntriesSearchText(''); } }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{bn ? 'প্রতিষ্ঠানের এন্ট্রি সম্পাদনা' : 'Edit Institution Entries'} — {(() => { const p = expenseInstitutions.find((p: any) => p.id === editInstitutionEntriesId); return p ? (bn ? p.name_bn : p.name) : ''; })()}</span>
              <Button size="sm" onClick={() => {
                const pid = editInstitutionEntriesId || '';
                setEditInstitutionEntriesId(null);
                setTimeout(() => { setExpenseForm({ ...defaultExpenseForm, institution_id: pid }); setEditingExpenseId(null); setExpenseDialog(true); }, 150);
              }}>
                <Plus className="w-3 h-3 mr-1" />{bn ? 'নতুন এন্ট্রি' : 'New Entry'}
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Filter & Search */}
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={entriesFilterCategoryId} onValueChange={setEntriesFilterCategoryId}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder={bn ? 'ক্যাটেগরি ফিল্টার' : 'Filter Category'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সব ক্যাটেগরি' : 'All Categories'}</SelectItem>
                {categories.filter((c: any) => c.institution_id === editInstitutionEntriesId).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="h-8 text-xs flex-1 min-w-[150px]"
              placeholder={bn ? 'বিবরণ, তারিখ দিয়ে খুঁজুন...' : 'Search by description, date...'}
              value={entriesSearchText}
              onChange={e => setEntriesSearchText(e.target.value)}
            />
          </div>

          {(() => {
            let instExpenses = expenses.filter((e: any) => e.institution_id === editInstitutionEntriesId);
            const instCatsForPrint = categories.filter((c: any) => c.institution_id === editInstitutionEntriesId);
            if (instExpenses.length === 0) return <p className="text-sm text-muted-foreground">{bn ? 'কোনো এন্ট্রি নেই' : 'No entries'}</p>;

            // Apply category filter
            if (entriesFilterCategoryId !== 'all') {
              instExpenses = instExpenses.filter((e: any) => e.category_id === entriesFilterCategoryId);
            }
            // Apply search
            if (entriesSearchText.trim()) {
              const q = entriesSearchText.trim().toLowerCase();
              instExpenses = instExpenses.filter((e: any) =>
                (e.description || '').toLowerCase().includes(q) ||
                (e.expense_date || '').includes(q) ||
                String(e.amount).includes(q)
              );
            }

            const filteredCategories = entriesFilterCategoryId === 'all'
              ? instCatsForPrint
              : instCatsForPrint.filter((c: any) => c.id === entriesFilterCategoryId);

            if (instExpenses.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">{bn ? 'কোনো ফলাফল পাওয়া যায়নি' : 'No results found'}</p>;

            return (
              <div className="space-y-4">
                {filteredCategories.map((cat: any) => {
                  const catExpenses = instExpenses.filter((e: any) => e.category_id === cat.id);
                  if (catExpenses.length === 0) return null;
                  const catTotal = catExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                  return (
                    <div key={cat.id}>
                      <h3 className="text-sm font-semibold mb-2 flex items-center justify-between">
                        <span>{bn ? cat.name_bn : cat.name}</span>
                        <span className="text-xs text-muted-foreground">৳{formatNum(catTotal)}</span>
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                            <TableHead>{bn ? 'বিবরণ' : 'Description'}</TableHead>
                            <TableHead>{bn ? 'পরিমাণ' : 'Qty'}</TableHead>
                            <TableHead>{bn ? 'মাধ্যম' : 'Method'}</TableHead>
                            <TableHead className="text-right">{bn ? 'টাকা' : 'Amount'}</TableHead>
                            <TableHead className="text-center">{bn ? 'রসিদ' : 'Receipt'}</TableHead>
                            <TableHead className="w-20">{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {catExpenses.map((e: any, i: number) => (
                            <TableRow key={e.id}>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell>{e.expense_date}</TableCell>
                              <TableCell>{cleanDesc(e.description)}</TableCell>
                              <TableCell>{e.quantity || 1} {getUnit(e.description)}</TableCell>
                              <TableCell>{getMethod(e.description)}</TableCell>
                              <TableCell className="text-right">৳{formatNum(Number(e.amount))}</TableCell>
                              <TableCell className="text-center">
                                {e.has_receipt ? (
                                  e.receipt_url ? <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setReceiptPreview(e.receipt_url)}><Eye className="w-3 h-3 text-primary" /></Button> : <span className="text-primary">✓</span>
                                ) : '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                    setEditInstitutionEntriesId(null);
                                    setTimeout(() => { openEditExpense(e); }, 150);
                                  }}>
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDeleteConfirmId(e.id); setDeleteConfirmType('expense'); }}>
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}
                <div className="border-t pt-2 text-right font-bold text-sm">
                  {bn ? 'মোট' : 'Total'}: ৳{formatNum(instExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0))}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!printInstitutionId} onOpenChange={(open) => {
        if (!open) { setPrintInstitutionId(null); setPrintEditMode(false); }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{bn ? 'প্রকল্প প্রিন্ট প্রিভিউ' : 'Project Print Preview'}</span>
              <Button variant={printEditMode ? 'default' : 'outline'} size="sm" onClick={() => {
                if (!printEditMode) {
                  setPrintEditData({
                    instName: instName, instNameEn: instNameEn, instAddress: instAddress,
                    instPhone: instPhone, instEmail: instEmail, instOther: instOther, instLogo: instLogo,
                    reportTitle: bn ? 'প্রকল্প খরচ প্রতিবেদন' : 'Project Expense Report',
                    reportSubtitle: '',
                    casherName: summaryData?.casher_name || '',
                    principalName: summaryData?.principal_name || '',
                    extraNote: ''
                  });
                }
                setPrintEditMode(!printEditMode);
              }}>
                <Edit2 className="w-3 h-3 mr-1" />{printEditMode ? (bn ? 'প্রিভিউ দেখুন' : 'Preview') : (bn ? 'এডিট করুন' : 'Edit')}
              </Button>
            </DialogTitle>
          </DialogHeader>

          {printEditMode ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{bn ? 'প্রতিষ্ঠানের নাম (বাংলা)' : 'Institution Name (BN)'}</Label>
                  <Input value={printEditData.instName} onChange={e => setPrintEditData(p => ({ ...p, instName: e.target.value }))} /></div>
                <div><Label>{bn ? 'প্রতিষ্ঠানের নাম (ইংরেজি)' : 'Institution Name (EN)'}</Label>
                  <Input value={printEditData.instNameEn} onChange={e => setPrintEditData(p => ({ ...p, instNameEn: e.target.value }))} /></div>
              </div>
              <div><Label>{bn ? 'ঠিকানা' : 'Address'}</Label>
                <Input value={printEditData.instAddress} onChange={e => setPrintEditData(p => ({ ...p, instAddress: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{bn ? 'ফোন' : 'Phone'}</Label>
                  <Input value={printEditData.instPhone} onChange={e => setPrintEditData(p => ({ ...p, instPhone: e.target.value }))} /></div>
                <div><Label>{bn ? 'ইমেইল' : 'Email'}</Label>
                  <Input value={printEditData.instEmail} onChange={e => setPrintEditData(p => ({ ...p, instEmail: e.target.value }))} /></div>
              </div>
              <div><Label>{bn ? 'অতিরিক্ত তথ্য' : 'Other Info'}</Label>
                <Input value={printEditData.instOther} onChange={e => setPrintEditData(p => ({ ...p, instOther: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{bn ? 'রিপোর্ট শিরোনাম' : 'Report Title'}</Label>
                  <Input value={printEditData.reportTitle} onChange={e => setPrintEditData(p => ({ ...p, reportTitle: e.target.value }))} /></div>
                <div><Label>{bn ? 'অতিরিক্ত সাবটাইটেল' : 'Subtitle'}</Label>
                  <Input value={printEditData.reportSubtitle} onChange={e => setPrintEditData(p => ({ ...p, reportSubtitle: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{bn ? 'ক্যাশিয়ারের নাম' : 'Cashier Name'}</Label>
                  <Input value={printEditData.casherName} onChange={e => setPrintEditData(p => ({ ...p, casherName: e.target.value }))} /></div>
                <div><Label>{bn ? 'প্রিন্সিপালের নাম' : 'Principal Name'}</Label>
                  <Input value={printEditData.principalName} onChange={e => setPrintEditData(p => ({ ...p, principalName: e.target.value }))} /></div>
              </div>
              <div><Label>{bn ? 'অতিরিক্ত নোট (প্রিন্টে দেখাবে)' : 'Extra Note (shown in print)'}</Label>
                <Textarea value={printEditData.extraNote} onChange={e => setPrintEditData(p => ({ ...p, extraNote: e.target.value }))} rows={2} /></div>
            </div>
          ) : (
          (() => {
            const inst = expenseInstitutions.find((p: any) => p.id === printInstitutionId);
            if (!inst) return null;
            const instExpenses = expenses.filter((e: any) => e.institution_id === printInstitutionId);
            const instTotal = instExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
            const instCatsForPrint = categories.filter((c: any) => c.institution_id === printInstitutionId);
            const ed = printEditData;
            const dInstName = ed.instName || (bn ? instName : instNameEn);
            const dInstAddress = ed.instAddress || instAddress;
            const dInstPhone = ed.instPhone || instPhone;
            const dInstEmail = ed.instEmail || instEmail;
            const dInstOther = ed.instOther || instOther;
            const dInstLogo = ed.instLogo || instLogo;
            const dReportTitle = ed.reportTitle || (bn ? 'প্রকল্প খরচ প্রতিবেদন' : 'Project Expense Report');
            const dCasher = ed.casherName || summaryData?.casher_name || (bn ? 'ক্যাশিয়ার' : 'Cashier');
            const dPrincipal = ed.principalName || summaryData?.principal_name || (bn ? 'অধ্যক্ষ' : 'Principal');
            return (
              <div id="project-print-content">
                <div className="text-center mb-4 border-b-2 border-foreground pb-3">
                  {dInstLogo && <img src={dInstLogo} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-1" />}
                  <h1 className="text-lg font-bold">{dInstName}</h1>
                  <p className="text-sm">{dInstAddress}</p>
                  <p className="text-xs">{bn ? 'ফোন' : 'Phone'}: {dInstPhone} | {bn ? 'ইমেইল' : 'Email'}: {dInstEmail}</p>
                  {dInstOther && <p className="text-xs">{dInstOther}</p>}
                  <p className="text-base font-semibold mt-2">{dReportTitle}</p>
                  {ed.reportSubtitle && <p className="text-sm">{ed.reportSubtitle}</p>}
                  <p className="text-sm">{bn ? 'প্রতিষ্ঠান' : 'Institution'}: {bn ? inst.name_bn : inst.name} | {selectedMonthYear}</p>
                </div>

                {ed.extraNote && <p className="text-xs mb-3 italic border-l-2 border-primary pl-2">{ed.extraNote}</p>}

                {instCatsForPrint.map((cat: any) => {
                  const catExpenses = instExpenses.filter((e: any) => e.category_id === cat.id);
                  if (catExpenses.length === 0) return null;
                  const catTotal = catExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                  return (
                    <div key={cat.id} className="mb-4">
                      <h3 className="text-sm font-semibold mb-1">{bn ? cat.name_bn : cat.name} — ৳{formatNum(catTotal)}</h3>
                      <table className="w-full border-collapse border text-xs">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border p-1 text-left w-8">#</th>
                            <th className="border p-1 text-left">{bn ? 'তারিখ' : 'Date'}</th>
                            <th className="border p-1 text-left">{bn ? 'বিবরণ' : 'Description'}</th>
                            <th className="border p-1 text-left">{bn ? 'পরিমাণ' : 'Qty'}</th>
                            <th className="border p-1 text-left">{bn ? 'মাধ্যম' : 'Method'}</th>
                            <th className="border p-1 text-right">{bn ? 'টাকা' : 'Amount'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catExpenses.map((e: any, i: number) => (
                            <tr key={e.id}>
                              <td className="border p-1">{i + 1}</td>
                              <td className="border p-1">{e.expense_date}</td>
                              <td className="border p-1">{cleanDesc(e.description)}</td>
                              <td className="border p-1">{e.quantity || 1} {getUnit(e.description)}</td>
                              <td className="border p-1">{getMethod(e.description)}</td>
                              <td className="border p-1 text-right">৳{formatNum(Number(e.amount))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}

                <div className="border-t-2 border-foreground pt-2 text-right font-bold text-sm">
                  {bn ? 'প্রকল্প মোট খরচ' : 'Project Total'}: ৳{formatNum(instTotal)}
                </div>

                <div className="flex justify-between mt-12 pt-8">
                  <div className="text-center">
                    <div className="border-t border-foreground w-40 mx-auto mb-1"></div>
                    <p className="text-sm font-medium">{dCasher}</p>
                    <p className="text-xs">{bn ? 'ক্যাশিয়ার' : 'Cashier'}</p>
                  </div>
                  <div className="text-center">
                    <div className="border-t border-foreground w-40 mx-auto mb-1"></div>
                    <p className="text-sm font-medium">{dPrincipal}</p>
                    <p className="text-xs">{bn ? 'অধ্যক্ষ' : 'Principal'}</p>
                  </div>
                </div>
              </div>
            );
          })()
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setPrintInstitutionId(null); setPrintEditMode(false); }}>{bn ? 'বন্ধ করুন' : 'Close'}</Button>
            {!printEditMode && (
              <Button onClick={() => {
                const content = document.getElementById('project-print-content');
                if (!content) return;
                const win = window.open('', '_blank');
                if (!win) return;
                win.document.write(`<html><head><title>${bn ? 'প্রকল্প প্রতিবেদন' : 'Project Report'}</title><style>body{font-family:'SutonnyOMJ','Noto Sans Bengali',sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:4px 8px}th{background:#f0f0f0;text-align:left}.text-right{text-align:right}.text-center{text-align:center}h1{font-size:18px}h3{font-size:14px}.italic{font-style:italic}@media print{body{padding:0}}</style></head><body>${content.innerHTML}</body></html>`);
                win.document.close();
                win.focus();
                win.print();
              }}>
                <Printer className="w-4 h-4 mr-1" />{bn ? 'প্রিন্ট করুন' : 'Print'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Deposit Print Preview Dialog */}
      <Dialog open={depositPrintPreview} onOpenChange={(open) => { if (!open) { setDepositPrintPreview(false); setDepositPrintEditMode(false); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{bn ? 'জমা প্রিন্ট প্রিভিউ' : 'Deposit Print Preview'}</span>
              <Button variant={depositPrintEditMode ? 'default' : 'outline'} size="sm" onClick={() => {
                if (!depositPrintEditMode) {
                  setDepositPrintEditData({
                    instName, instNameEn, instAddress, instPhone, instEmail, instOther, instLogo,
                    reportTitle: bn ? 'জমা প্রতিবেদন' : 'Deposit Report',
                    reportSubtitle: '', casherName: summaryData?.casher_name || '', principalName: summaryData?.principal_name || '', extraNote: ''
                  });
                }
                setDepositPrintEditMode(!depositPrintEditMode);
              }}>
                <Edit2 className="w-3 h-3 mr-1" />{depositPrintEditMode ? (bn ? 'প্রিভিউ দেখুন' : 'Preview') : (bn ? 'এডিট করুন' : 'Edit')}
              </Button>
            </DialogTitle>
          </DialogHeader>

          {depositPrintEditMode ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{bn ? 'প্রতিষ্ঠানের নাম (বাংলা)' : 'Institution Name (BN)'}</Label>
                  <Input value={depositPrintEditData.instName} onChange={e => setDepositPrintEditData(p => ({ ...p, instName: e.target.value }))} /></div>
                <div><Label>{bn ? 'প্রতিষ্ঠানের নাম (ইংরেজি)' : 'Institution Name (EN)'}</Label>
                  <Input value={depositPrintEditData.instNameEn} onChange={e => setDepositPrintEditData(p => ({ ...p, instNameEn: e.target.value }))} /></div>
              </div>
              <div><Label>{bn ? 'ঠিকানা' : 'Address'}</Label>
                <Input value={depositPrintEditData.instAddress} onChange={e => setDepositPrintEditData(p => ({ ...p, instAddress: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{bn ? 'ফোন' : 'Phone'}</Label>
                  <Input value={depositPrintEditData.instPhone} onChange={e => setDepositPrintEditData(p => ({ ...p, instPhone: e.target.value }))} /></div>
                <div><Label>{bn ? 'ইমেইল' : 'Email'}</Label>
                  <Input value={depositPrintEditData.instEmail} onChange={e => setDepositPrintEditData(p => ({ ...p, instEmail: e.target.value }))} /></div>
              </div>
              <div><Label>{bn ? 'অতিরিক্ত তথ্য' : 'Other Info'}</Label>
                <Input value={depositPrintEditData.instOther} onChange={e => setDepositPrintEditData(p => ({ ...p, instOther: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{bn ? 'রিপোর্ট শিরোনাম' : 'Report Title'}</Label>
                  <Input value={depositPrintEditData.reportTitle} onChange={e => setDepositPrintEditData(p => ({ ...p, reportTitle: e.target.value }))} /></div>
                <div><Label>{bn ? 'সাবটাইটেল' : 'Subtitle'}</Label>
                  <Input value={depositPrintEditData.reportSubtitle} onChange={e => setDepositPrintEditData(p => ({ ...p, reportSubtitle: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{bn ? 'ক্যাশিয়ারের নাম' : 'Cashier Name'}</Label>
                  <Input value={depositPrintEditData.casherName} onChange={e => setDepositPrintEditData(p => ({ ...p, casherName: e.target.value }))} /></div>
                <div><Label>{bn ? 'প্রিন্সিপালের নাম' : 'Principal Name'}</Label>
                  <Input value={depositPrintEditData.principalName} onChange={e => setDepositPrintEditData(p => ({ ...p, principalName: e.target.value }))} /></div>
              </div>
              <div><Label>{bn ? 'অতিরিক্ত নোট' : 'Extra Note'}</Label>
                <Textarea value={depositPrintEditData.extraNote} onChange={e => setDepositPrintEditData(p => ({ ...p, extraNote: e.target.value }))} rows={2} /></div>
            </div>
          ) : (
            <div id="deposit-print-preview-content">
              <div className="text-center mb-4 border-b-2 border-foreground pb-3">
                {(depositPrintEditData.instLogo || instLogo) && <img src={depositPrintEditData.instLogo || instLogo} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-1" />}
                <h1 className="text-lg font-bold">{depositPrintEditData.instName || (bn ? instName : instNameEn)}</h1>
                <p className="text-sm">{depositPrintEditData.instAddress || instAddress}</p>
                <p className="text-xs">{bn ? 'ফোন' : 'Phone'}: {depositPrintEditData.instPhone || instPhone} | {bn ? 'ইমেইল' : 'Email'}: {depositPrintEditData.instEmail || instEmail}</p>
                {(depositPrintEditData.instOther || instOther) && <p className="text-xs">{depositPrintEditData.instOther || instOther}</p>}
                <p className="text-base font-semibold mt-2">{depositPrintEditData.reportTitle || (bn ? 'জমা প্রতিবেদন' : 'Deposit Report')}</p>
                {depositPrintEditData.reportSubtitle && <p className="text-sm">{depositPrintEditData.reportSubtitle}</p>}
                <p className="text-sm">{selectedMonthYear}</p>
              </div>

              {depositPrintEditData.extraNote && <p className="text-xs mb-3 italic border-l-2 border-primary pl-2">{depositPrintEditData.extraNote}</p>}

              <table className="w-full border-collapse border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-1 text-left w-8">#</th>
                    <th className="border p-1 text-left">{bn ? 'তারিখ' : 'Date'}</th>
                    <th className="border p-1 text-left">{bn ? 'ব্যাংক বিবরণ' : 'Bank Details'}</th>
                    <th className="border p-1 text-left">{bn ? 'অন্যান্য বিবরণ' : 'Other Details'}</th>
                    <th className="border p-1 text-left">{bn ? 'উৎস' : 'Source'}</th>
                    <th className="border p-1 text-right">{bn ? 'টাকা' : 'Amount'}</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((d: any, i: number) => (
                    <tr key={d.id}>
                      <td className="border p-1">{i + 1}</td>
                      <td className="border p-1">{d.deposit_date}</td>
                      <td className="border p-1">{d.bank_details || '-'}</td>
                      <td className="border p-1">{d.other_details || '-'}</td>
                      <td className="border p-1">{d.source || '-'}</td>
                      <td className="border p-1 text-right">৳{formatNum(Number(d.amount))}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-muted/50">
                    <td colSpan={5} className="border p-1 text-right">{bn ? 'মোট জমা:' : 'Total:'}</td>
                    <td className="border p-1 text-right">৳{formatNum(monthlyTotalDeposit)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-between mt-12 pt-8">
                <div className="text-center">
                  <div className="border-t border-foreground w-40 mx-auto mb-1"></div>
                  <p className="text-sm font-medium">{depositPrintEditData.casherName || summaryData?.casher_name || (bn ? 'ক্যাশিয়ার' : 'Cashier')}</p>
                  <p className="text-xs">{bn ? 'ক্যাশিয়ার' : 'Cashier'}</p>
                </div>
                <div className="text-center">
                  <div className="border-t border-foreground w-40 mx-auto mb-1"></div>
                  <p className="text-sm font-medium">{depositPrintEditData.principalName || summaryData?.principal_name || (bn ? 'অধ্যক্ষ' : 'Principal')}</p>
                  <p className="text-xs">{bn ? 'অধ্যক্ষ' : 'Principal'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setDepositPrintPreview(false); setDepositPrintEditMode(false); }}>{bn ? 'বন্ধ করুন' : 'Close'}</Button>
            {!depositPrintEditMode && (
              <Button onClick={() => {
                const content = document.getElementById('deposit-print-preview-content');
                if (!content) return;
                const win = window.open('', '_blank');
                if (!win) return;
                win.document.write(`<html><head><title>${bn ? 'জমা প্রতিবেদন' : 'Deposit Report'}</title><style>body{font-family:'SutonnyOMJ','Noto Sans Bengali',sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:4px 8px}th{background:#f0f0f0;text-align:left}.text-right{text-align:right}.text-center{text-align:center}.italic{font-style:italic}@media print{body{padding:0}}</style></head><body>${content.innerHTML}</body></html>`);
                win.document.close();
                win.focus();
                win.print();
              }}>
                <Printer className="w-4 h-4 mr-1" />{bn ? 'প্রিন্ট করুন' : 'Print'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{bn ? 'মুছে ফেলার নিশ্চিতকরণ' : 'Confirm Deletion'}</AlertDialogTitle>
            <AlertDialogDescription>
              {bn ? 'আপনি কি নিশ্চিত যে এই এন্ট্রিটি মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।' : 'Are you sure you want to delete this entry? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{bn ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (deleteConfirmId) {
                if (deleteConfirmType === 'expense') {
                  deleteExpense.mutate(deleteConfirmId);
                } else {
                  deleteDeposit.mutate(deleteConfirmId);
                }
                setDeleteConfirmId(null);
              }
            }}>
              {bn ? 'মুছে ফেলুন' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminExpenses;
