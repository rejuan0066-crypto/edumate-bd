import { useState, useMemo, useEffect, useCallback } from 'react';
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
import { Plus, Trash2, Edit2, DollarSign, TrendingDown, TrendingUp, Wallet, Printer, FolderPlus, TagIcon, Upload, Download, Eye, ScanLine, Building2, Package, AlertTriangle, FileText, FileBarChart, CheckCircle2, Clock } from 'lucide-react';
import ExpenseVoucherPrint from '@/components/expenses/ExpenseVoucherPrint';
import ExpenseHierarchyReport from '@/components/expenses/ExpenseHierarchyReport';
import LedgerReport from '@/components/expenses/LedgerReport';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedCounter from '@/components/expenses/AnimatedCounter';
import MiniSparkline from '@/components/expenses/MiniSparkline';
import { generateBilingualReport } from '@/lib/reportPdfGenerator';
import { useConfirm } from "@/contexts/ConfirmContext";
import { exportExpensesMultiTabExcel, exportSingleInstitutionExcel, getInstShortName } from '@/lib/expenseExcelExport';

const QUANTITY_UNITS = ['পিস', 'কেজি', 'গ্রাম', 'লিটার', 'ফুট', 'মিটার', 'সেট', 'প্যাকেট', 'বস্তা', 'রিম'];
const EXPENSE_METHODS = ['ক্যাশ', 'চেক', 'বিকাশ', 'নগদ', 'রকেট', 'ব্যাংক ট্রান্সফার', 'অন্যান্য'];

const bnToEnDigit = (str: string) => str.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d).toString());
const onlyNumbers = (str: string) => str.replace(/[^0-9০-৯.]/g, '');
const getUnit = (desc: string) => desc?.match(/\[unit:(.*?)\]/)?.[1] || 'পিস';
const getMethod = (desc: string) => desc?.match(/\[method:(.*?)\]/)?.[1] || 'ক্যাশ';
const getMemo = (desc: string) => desc?.match(/\[memo:(.*?)\]/)?.[1] || '-';
const getRemarks = (desc: string) => desc?.match(/\[remarks:(.*?)\]/)?.[1] || '-';
const isUnpaidDue = (desc: string) => (desc || '').includes('[due:unpaid]');
const isPaidDue = (desc: string) => (desc || '').includes('[due:paid]');
const cleanDesc = (desc: string) => (desc || '')
  .replace(/\[unit:.*?\]/g, '')
  .replace(/\[method:.*?\]/g, '')
  .replace(/\[memo:.*?\]/g, '')
  .replace(/\[remarks:.*?\]/g, '')
  .replace(/\[due:.*?\]/g, '')
  .replace(/\[original_due_id:.*?\]/g, '')
  .trim() || '-';

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

const getInstName = (inst: any, isBn: boolean = true): string => {
  if (!inst) return '';
  if (isBn) {
    return inst.name_bn || inst.name || inst.name_en || '';
  }
  return inst.name_en || inst.name || inst.name_bn || '';
};

const getCatName = (cat: any, isBn: boolean = true): string => {
  if (!cat) return '';
  if (isBn) {
    return cat.name_bn || cat.name || '';
  }
  return cat.name || cat.name_bn || '';
};

const AdminExpenses = () => {
  const confirm = useConfirm();
  const { language } = useLanguage();
  const qc = useQueryClient();
  const { canAddItem: permCanAdd, canEditItem: permCanEdit, canDeleteItem: permCanDelete } = usePagePermissions('/admin/expenses');
  const canAddItem = permCanAdd ?? true;
  const canEditItem = permCanEdit ?? true;
  const canDeleteItem = permCanDelete ?? true;
  const bn = language === 'bn';

  const [selectedMonthYear, setSelectedMonthYear] = useState(`${MONTHS[new Date().getMonth()]}-${currentYear}`);
  const [filterMode, setFilterMode] = useState<'monthly' | 'yearly' | 'session'>('monthly');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
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
  const [selectedInstId, setSelectedInstId] = useState<string | null>(null);
  const [tableCategoryId, setTableCategoryId] = useState<string>('all');
  const [tableSearchText, setTableSearchText] = useState<string>('');
  const [breakdownTab, setBreakdownTab] = useState<'institution' | 'category' | 'hierarchy' | null>(null);
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
  const defaultExpenseForm = {
    institution_id: '',
    category_id: '',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
    quantity: '',
    quantity_unit: 'পিস',
    has_receipt: false,
    receipt_url: '',
    amount: '',
    expense_method: 'ক্যাশ',
    expense_method_other: '',
    memo_no: '',
    remarks: '',
    is_due: false,
    add_to_inventory: false,
    inventory_item_id: ''
  };
  const defaultDepositForm = { deposit_date: new Date().toISOString().split('T')[0], bank_details: '', other_details: '', amount: '', source: 'manual' };
  const [expInstForm, setExpInstForm] = useState({ name: '', name_bn: '' });
  const [categoryForm, setCategoryForm] = useState({ institution_id: '', name: '', name_bn: '' });
  const [expenseForm, setExpenseForm] = useState(defaultExpenseForm);
  const [depositForm, setDepositForm] = useState(defaultDepositForm);
  const [institutionForm, setInstitutionForm] = useState({ name: '', name_en: '', address: '', phone: '', email: '', other_info: '', logo_url: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [summaryForm, setSummaryForm] = useState({ principal_name: '', casher_name: '', previous_arrears: '0' });

  // Due settlement state
  const [payDueExpense, setPayDueExpense] = useState<any>(null);
  const [payDueForm, setPayDueForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'ক্যাশ',
    payment_method_other: '',
    memo_no: '',
    remarks: '',
  });

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
      const { data, error } = await supabase.from('expenses')
        .select('id, month_year, expense_date, amount, institution_id, category_id, description, quantity, has_receipt, receipt_url, expense_institutions(name, name_bn), expense_categories(name, name_bn)')
        .order('expense_date', { ascending: false });
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

  // For Annual Financial Summary report
  const { data: annualFeePayments = [] } = useQuery({
    queryKey: ['annual-fee-payments', selectedYear],
    queryFn: async () => {
      const { data } = await supabase.from('fee_payments')
        .select('paid_amount, status, month, year')
        .eq('year', selectedYear);
      return data || [];
    },
  });

  const { data: annualDonors = [] } = useQuery({
    queryKey: ['annual-donors', selectedYear],
    queryFn: async () => {
      const start = `${selectedYear}-01-01`;
      const end = `${selectedYear}-12-31`;
      const { data } = await supabase.from('donors')
        .select('donation_amount, donation_date')
        .gte('donation_date', start)
        .lte('donation_date', end);
      return data || [];
    },
  });

  // Unified institutions list: expense_institutions is the primary entity for expenses
  const allInstitutions = useMemo(() => {
    if (expenseInstitutions && expenseInstitutions.length > 0) {
      return expenseInstitutions.map((ei: any) => {
        const instMatch = institutions.find((i: any) => i.id === ei.id);
        return {
          id: ei.id,
          name: ei.name || ei.name_bn,
          name_bn: ei.name_bn || ei.name,
          name_en: ei.name || ei.name_bn,
          address: instMatch?.address || '',
          phone: instMatch?.phone || '',
          email: instMatch?.email || '',
          other_info: instMatch?.other_info || '',
          logo_url: instMatch?.logo_url || '',
          is_default: instMatch?.is_default || false,
          source: 'expense_institutions'
        };
      });
    }
    return institutions.map((i: any) => ({
      id: i.id,
      name: i.name_en || i.name,
      name_bn: i.name,
      name_en: i.name_en || i.name,
      address: i.address,
      phone: i.phone,
      email: i.email,
      other_info: i.other_info,
      logo_url: i.logo_url,
      is_default: i.is_default,
      source: 'institutions'
    }));
  }, [expenseInstitutions, institutions]);

  // Auto-select default institution
  useEffect(() => {
    if (allInstitutions.length > 0 && !selectedInstitutionId) {
      const def = institutions.find((i: any) => i.is_default) || allInstitutions[0];
      const targetId = def?.id || allInstitutions[0]?.id;
      setSelectedInstitutionId(targetId);
      if (!selectedInstId) {
        setSelectedInstId(targetId);
      }
    }
  }, [allInstitutions, institutions, selectedInstitutionId, selectedInstId]);

  const selectedInstitution = allInstitutions.find((i: any) => i.id === (selectedInstitutionId || selectedInstId)) || allInstitutions[0] || institutions[0];
  const instName = getInstName(selectedInstitution, true);
  const instNameEn = getInstName(selectedInstitution, false);
  const instAddress = selectedInstitution?.address || '';
  const instPhone = selectedInstitution?.phone || '';
  const instEmail = selectedInstitution?.email || '';
  const instOther = selectedInstitution?.other_info || '';
  const instLogo = selectedInstitution?.logo_url || '';

  // Stats
  const paidExpenses = useMemo(() => expenses.filter((e: any) => !isUnpaidDue(e.description)), [expenses]);
  const monthlyTotalExpense = useMemo(() => paidExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0), [paidExpenses]);
  const monthlyTotalDeposit = useMemo(() => deposits.reduce((s: number, d: any) => s + Number(d.amount || 0), 0), [deposits]);
  const previousArrears = Number(summaryData?.previous_arrears || 0);
  const rawCash = monthlyTotalDeposit - monthlyTotalExpense - previousArrears;
  const monthlyCash = rawCash >= 0 ? rawCash : 0;
  const currentArrears = rawCash < 0 ? Math.abs(rawCash) : 0;
  const totalArrears = previousArrears + currentArrears;

  // Calculate previous month key e.g. September-2026 for October-2026
  const prevMonthKey = useMemo(() => {
    const parts = selectedMonthYear.split('-');
    const mStr = parts[0];
    const yr = parseInt(parts[1]) || currentYear;
    const idx = MONTHS.indexOf(mStr);
    if (idx > 0) {
      return `${MONTHS[idx - 1]}-${yr}`;
    }
    return `${MONTHS[11]}-${yr - 1}`;
  }, [selectedMonthYear]);

  // Previous month statistics for opening balance / arrears adjustment
  const { previousMonthCash, previousMonthDue } = useMemo(() => {
    const prevPaid = allExpenses.filter((e: any) => e.month_year === prevMonthKey && !isUnpaidDue(e.description));
    const prevExpSum = prevPaid.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const prevDeps = allDeposits.filter((d: any) => d.month_year === prevMonthKey);
    const prevDepSum = prevDeps.reduce((s: number, d: any) => s + Number(d.amount || 0), 0);
    const rawPrevCash = prevDepSum - prevExpSum;

    const manualPrevArrears = Number(summaryData?.previous_arrears || 0);
    const prevCash = rawPrevCash > 0 ? rawPrevCash : 0;
    const prevDue = manualPrevArrears > 0 ? manualPrevArrears : (rawPrevCash < 0 ? Math.abs(rawPrevCash) : 0);

    return {
      previousMonthCash: prevCash,
      previousMonthDue: prevDue,
    };
  }, [allExpenses, allDeposits, prevMonthKey, summaryData]);

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

  const filteredExpenses = useMemo(() => allExpenses.filter((e: any) => matchesFilter(e.month_year) && !isUnpaidDue(e.description)), [allExpenses, filterMode, selectedYear, selectedSessionId, academicSessions]);
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
      const nameBn = (expInstForm.name_bn || '').trim();
      const nameEn = (expInstForm.name || '').trim() || nameBn;
      if (!nameBn) {
        toast.error(bn ? 'প্রতিষ্ঠানের নাম লিখুন' : 'Please enter institution name');
        return;
      }
      const payload = { name: nameEn, name_bn: nameBn };
      if (editingExpInstId) {
        const { error } = await supabase.from('expense_institutions').update(payload).eq('id', editingExpInstId);
        if (error) {
          const { error: upsertErr } = await supabase.from('expense_institutions').upsert({ id: editingExpInstId, ...payload });
          if (upsertErr) throw upsertErr;
        }
        await supabase.from('institutions').update({ name: nameBn, name_en: nameEn }).eq('id', editingExpInstId);
      } else {
        const { error } = await supabase.from('expense_institutions').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense_institutions'] });
      qc.invalidateQueries({ queryKey: ['institutions'] });
      setExpInstDialog(false);
      setExpInstForm({ name: '', name_bn: '' });
      setEditingExpInstId(null);
      toast.success(bn ? 'সংরক্ষিত' : 'Saved');
    },
    onError: (err: any) => {
      console.error('Save institution error:', err);
      toast.error(err?.message || (bn ? 'ত্রুটি হয়েছে' : 'Error occurred'));
    }
  });

  const addCategory = useMutation({
    mutationFn: async () => {
      const nameBn = (categoryForm.name_bn || '').trim();
      const nameEn = (categoryForm.name || '').trim() || nameBn;
      if (!categoryForm.institution_id || !nameBn) {
        toast.error(bn ? 'প্রতিষ্ঠান এবং ক্যাটাগরির নাম দিন' : 'Institution and Category name are required');
        return;
      }
      const payload = {
        institution_id: categoryForm.institution_id,
        name: nameEn,
        name_bn: nameBn
      };
      if (editingCategoryId) {
        const { error } = await supabase.from('expense_categories').update(payload).eq('id', editingCategoryId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expense_categories').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense_categories'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['all_expenses'] });
      setCategoryDialog(false);
      setCategoryForm({ institution_id: '', name: '', name_bn: '' });
      setEditingCategoryId(null);
      toast.success(bn ? 'সংরক্ষিত' : 'Saved');
    },
    onError: (err: any) => {
      console.error('Save category error:', err);
      toast.error(err?.message || (bn ? 'ত্রুটি হয়েছে' : 'Error occurred'));
    }
  });

  const deleteExpInst = useMutation({
    mutationFn: async (id: string) => {
      // 1. Delete associated expenses first to prevent foreign key errors
      const { error: expErr } = await supabase.from('expenses').delete().eq('institution_id', id);
      if (expErr) console.warn('Expenses delete warning:', expErr);

      // 2. Delete associated categories
      const { error: catErr } = await supabase.from('expense_categories').delete().eq('institution_id', id);
      if (catErr) console.warn('Categories delete warning:', catErr);

      // 3. Delete from expense_institutions
      const { error: expInstErr } = await supabase.from('expense_institutions').delete().eq('id', id);
      if (expInstErr) throw expInstErr;

      // 4. If present in institutions table and NOT default school, delete from institutions
      const targetInst = institutions.find((i: any) => i.id === id);
      if (targetInst && !targetInst.is_default) {
        await supabase.from('institutions').delete().eq('id', id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense_institutions'] });
      qc.invalidateQueries({ queryKey: ['institutions'] });
      qc.invalidateQueries({ queryKey: ['expense_categories'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['all_expenses'] });
      toast.success(bn ? 'প্রতিষ্ঠান মুছে ফেলা হয়েছে' : 'Institution deleted');
    },
    onError: (err: any) => {
      console.error('Delete institution error:', err);
      toast.error(err?.message || (bn ? 'মুছে ফেলতে ব্যর্থ' : 'Failed to delete'));
    }
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      // 1. Delete associated expenses first to prevent foreign key constraint violation
      const { error: expErr } = await supabase.from('expenses').delete().eq('category_id', id);
      if (expErr) console.warn('Expenses delete warning:', expErr);

      // 2. Delete from expense_categories
      const { error: catErr } = await supabase.from('expense_categories').delete().eq('id', id);
      if (catErr) throw catErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense_categories'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['all_expenses'] });
      toast.success(bn ? 'ক্যাটেগরি মুছে ফেলা হয়েছে' : 'Category deleted');
    },
    onError: (err: any) => {
      console.error('Delete category error:', err);
      toast.error(err?.message || (bn ? 'মুছে ফেলতে ব্যর্থ' : 'Failed to delete'));
    }
  });

  const addExpense = useMutation({
    mutationFn: async () => {
      if (!expenseForm.institution_id || !expenseForm.category_id || !expenseForm.amount) { toast.error(bn ? 'প্রতিষ্ঠান, ক্যাটাগরি ও টাকা প্রদান করুন' : 'Institution, Category & Amount are required'); return; }
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
        // Store storage ref instead of broken public URL on private bucket; signed URL is fetched on demand.
        receiptUrl = `receipts/${uploadData.path}`;
      }
      
      let descWithTags = (expenseForm.description || '').trim();
      if (expenseForm.quantity_unit && expenseForm.quantity_unit !== 'পিস') descWithTags += `[unit:${expenseForm.quantity_unit}]`;
      const rawMethod = (expenseForm.expense_method || '').trim() || 'ক্যাশ';
      const finalMethod = rawMethod.replace(/[\[\]]/g, '');
      if (finalMethod) descWithTags += `[method:${finalMethod}]`;
      if (expenseForm.memo_no && expenseForm.memo_no.trim()) descWithTags += `[memo:${expenseForm.memo_no.trim()}]`;
      if (expenseForm.remarks && expenseForm.remarks.trim()) descWithTags += `[remarks:${expenseForm.remarks.trim()}]`;
      if (expenseForm.is_due) descWithTags += `[due:unpaid]`;
      
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

  const payDueMutation = useMutation({
    mutationFn: async () => {
      if (!payDueExpense) return;
      const pDate = new Date(payDueForm.payment_date);
      const pMonthYear = `${MONTHS[pDate.getMonth()]}-${pDate.getFullYear()}`;
      const rawPayMethod = (payDueForm.payment_method || '').trim() || 'ক্যাশ';
      const finalMethod = rawPayMethod.replace(/[\[\]]/g, '');

      // 1. Mark original expense as paid
      const originalDesc = payDueExpense.description || '';
      const updatedOriginalDesc = originalDesc
        .replace(/\[due:unpaid\]/g, `[due:paid][paid_date:${payDueForm.payment_date}]`);

      const { error: updateError } = await supabase
        .from('expenses')
        .update({ description: updatedOriginalDesc })
        .eq('id', payDueExpense.id);
      if (updateError) throw updateError;

      // 2. Insert new cash outflow expense in the month of payment
      let paidDesc = `[বকেয়া পরিশোধ] ${cleanDesc(originalDesc)}`;
      if (payDueForm.remarks.trim()) paidDesc += `[remarks:${payDueForm.remarks.trim()}]`;
      if (payDueForm.memo_no.trim()) paidDesc += `[memo:${payDueForm.memo_no.trim()}]`;
      if (finalMethod) paidDesc += `[method:${finalMethod}]`;
      paidDesc += `[original_due_id:${payDueExpense.id}]`;

      const { error: insertError } = await supabase.from('expenses').insert({
        month_year: pMonthYear,
        institution_id: payDueExpense.institution_id,
        category_id: payDueExpense.category_id,
        expense_date: payDueForm.payment_date,
        description: paidDesc,
        quantity: payDueExpense.quantity || 1,
        amount: Number(payDueExpense.amount),
        has_receipt: payDueExpense.has_receipt,
        receipt_url: payDueExpense.receipt_url,
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['all_expenses'] });
      setPayDueExpense(null);
      setPayDueForm({
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'ক্যাশ',
        payment_method_other: '',
        memo_no: '',
        remarks: '',
      });
      toast.success(bn ? 'বকেয়া পরিশোধ সম্পন্ন হয়েছে এবং চলতি মাসের ক্যাশ খরচে যুক্ত হয়েছে' : 'Due paid and recorded in payment month cash outflow');
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

  // Dynamic category filtering:
  // If categories specifically match the institution, return those + any global categories;
  // If no category is specifically bound to the institution, return all active categories so the dropdown is NEVER empty!
  const getCategoriesForInst = useCallback((instId?: string | null) => {
    if (!instId || instId === 'all') return categories;
    const matched = categories.filter((c: any) => c.institution_id === instId);
    if (matched.length > 0) {
      const globals = categories.filter((c: any) => !c.institution_id);
      return [...matched, ...globals];
    }
    return categories;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    return getCategoriesForInst(expenseForm.institution_id);
  }, [expenseForm.institution_id, getCategoriesForInst]);

  const selectedExpenseProject = allInstitutions.find((p: any) => p.id === expenseForm.institution_id);
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

  // Auto-select first institution
  useEffect(() => {
    if (allInstitutions.length > 0 && !selectedInstId) {
      const def = institutions.find((i: any) => i.is_default) || allInstitutions[0];
      const targetId = def?.id || allInstitutions[0]?.id;
      setSelectedInstId(targetId);
    }
  }, [allInstitutions, institutions, selectedInstId]);

  const handleSelectInstitution = (instId: string) => {
    setSelectedInstId(instId);
    setTableCategoryId('all');
    if (instId !== 'all') {
      setSelectedInstitutionId(instId);
    }
  };

  const selectedInst = allInstitutions.find((p: any) => p.id === selectedInstId) || allInstitutions[0];
  const instCategories = useMemo(() => {
    return getCategoriesForInst(selectedInstId);
  }, [getCategoriesForInst, selectedInstId]);

  // Institution monthly cash and dues
  const getInstMonthly = (pid: string) => expenses.filter((e: any) => e.institution_id === pid && !isUnpaidDue(e.description)).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const getInstDueTotal = (pid: string) => allExpenses.filter((e: any) => e.institution_id === pid && isUnpaidDue(e.description)).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const getInstTotal = (pid: string) => allExpenses.filter((e: any) => e.institution_id === pid && !isUnpaidDue(e.description)).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const getCategoryMonthly = (cid: string) => expenses.filter((e: any) => e.category_id === cid && !isUnpaidDue(e.description)).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const getCategoryTotal = (cid: string) => allExpenses.filter((e: any) => e.category_id === cid && !isUnpaidDue(e.description)).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  const handlePrint = () => window.print();
  const formatNum = (n: number) => n.toLocaleString(bn ? 'bn-BD' : 'en-BD');

  // Annual Financial Summary PDF (Income / Expense / Net Balance per month)
  const handleAnnualFinancialPDF = () => {
    const yearStr = String(selectedYear);
    const monthlyRows = MONTHS.map((m, i) => {
      const monthKey = `${MONTHS[i]}-${selectedYear}`;
      // Income = deposits for that month + paid fee_payments for that month
      const monthDeposits = allDeposits
        .filter((d: any) => d.month_year === monthKey)
        .reduce((s: number, d: any) => s + Number(d.amount || 0), 0);
      const monthFees = annualFeePayments
        .filter((f: any) => f.month === MONTHS[i] && f.status === 'paid')
        .reduce((s: number, f: any) => s + Number(f.paid_amount || 0), 0);
      const income = monthDeposits + monthFees;
      const expense = allExpenses
        .filter((e: any) => e.month_year === monthKey)
        .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      return { monthIdx: i, income, expense, profit: income - expense };
    });

    const totalIncome = monthlyRows.reduce((s, r) => s + r.income, 0);
    const totalExpense = monthlyRows.reduce((s, r) => s + r.expense, 0);
    const totalDonation = annualDonors.reduce((s: number, d: any) => s + Number(d.donation_amount || 0), 0);

    generateBilingualReport(
      {
        institution_name: instName || '',
        institution_name_en: instNameEn || '',
        address: instAddress || '',
        phone: instPhone || '',
        email: instEmail || '',
        logo_url: selectedInstitution?.logo_url,
        report_title_bn: 'মাসিক আর্থিক সারসংক্ষেপ',
        report_title_en: 'Monthly Financial Summary',
        period_label_bn: `সাল: ${yearStr}`,
        period_label_en: `Year: ${yearStr}`,
      },
      [{
        title_bn: 'মাসিক আয়-ব্যয় বিবরণী',
        title_en: 'Monthly Income & Expense Statement',
        headers: [
          { bn: 'মাস', en: 'Month' },
          { bn: 'আয় (৳)', en: 'Income (৳)' },
          { bn: 'ব্যয় (৳)', en: 'Expense (৳)' },
          { bn: 'নেট ব্যালেন্স (৳)', en: 'Net Balance (৳)' },
        ],
        rows: monthlyRows.map(r => [
          bn ? MONTHS_BN[r.monthIdx] : MONTHS[r.monthIdx],
          r.income,
          r.expense,
          r.profit,
        ]),
        totals: [
          { bn: 'মোট আয়', en: 'Total Income', value: totalIncome },
          { bn: 'মোট ব্যয়', en: 'Total Expense', value: totalExpense },
          { bn: 'নেট ব্যালেন্স', en: 'Net Balance', value: totalIncome - totalExpense },
        ],
      }],
      [
        { label_bn: 'মোট আয়', label_en: 'Income', value: '৳' + totalIncome.toLocaleString(), tone: 'positive' },
        { label_bn: 'মোট ব্যয়', label_en: 'Expense', value: '৳' + totalExpense.toLocaleString(), tone: 'negative' },
        { label_bn: 'নেট ব্যালেন্স', label_en: 'Net Balance', value: '৳' + (totalIncome - totalExpense).toLocaleString(), tone: totalIncome >= totalExpense ? 'positive' : 'negative' },
        { label_bn: 'অনুদান', label_en: 'Donations', value: '৳' + totalDonation.toLocaleString(), tone: 'accent' },
      ],
    );
  };

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
    const memo = getMemo(e.description);
    const rem = getRemarks(e.description);
    setExpenseForm({
      institution_id: e.institution_id,
      category_id: e.category_id,
      expense_date: e.expense_date,
      description: cleanDesc(e.description) === '-' ? '' : cleanDesc(e.description),
      quantity: String(e.quantity || 1),
      quantity_unit: getUnit(e.description),
      has_receipt: !!e.has_receipt,
      receipt_url: e.receipt_url || '',
      amount: String(e.amount),
      expense_method: method || 'ক্যাশ',
      expense_method_other: '',
      memo_no: memo === '-' ? '' : memo,
      remarks: rem === '-' ? '' : rem,
      is_due: isUnpaidDue(e.description),
      add_to_inventory: false,
      inventory_item_id: ''
    });
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
    exportExpensesMultiTabExcel({
      institutionName: instName || (bn ? 'সকল প্রতিষ্ঠান' : 'All Institutions'),
      reportPeriod: selectedMonthName,
      selectedMonthYear,
      institutions: allInstitutions,
      categories,
      expenses,
      unpaidDues: allExpenses.filter((e: any) => isUnpaidDue(e.description)),
      monthlyTotalExpense,
      monthlyTotalDeposit,
      previousArrears,
      previousMonthCash,
      previousMonthDue,
      monthlyCash,
      deposits,
      bn,
      cleanDesc,
      getUnit,
      getMethod,
      getMemo,
      getRemarks,
      formatNum,
    });
    toast.success(bn ? 'সকল প্রতিষ্ঠানের মাল্টি-ট্যাব এক্সেল ডাউনলোড হয়েছে' : 'Multi-tab Excel downloaded successfully');
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
    rows.push([bn ? 'টাকা আয়/উত্তোলন প্রতিবেদন' : 'Deposit Report', selectedMonthYear]);
    rows.push([]);
    rows.push(['#', bn ? 'তারিখ' : 'Date', bn ? 'ব্যাংক বিবরণ' : 'Bank Details', bn ? 'অন্যান্য বিবরণ' : 'Other Details', bn ? 'উৎস' : 'Source', bn ? 'টাকা' : 'Amount']);
    deposits.forEach((d: any, i: number) => {
      rows.push([String(i + 1), d.deposit_date, d.bank_details || '-', d.other_details || '-', d.source || '-', `৳${formatNum(Number(d.amount))}`]);
    });
    rows.push([]);
    rows.push([bn ? 'মোট টাকা আয়/উত্তোলন' : 'Total Deposit', `৳${formatNum(monthlyTotalDeposit)}`]);

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
    const inst = allInstitutions.find((p: any) => p.id === instId);
    if (!inst) return;
    exportSingleInstitutionExcel({
      selectedInstId: instId,
      institutionName: getInstName(inst, bn),
      reportPeriod: selectedMonthName,
      selectedMonthYear,
      institutions: allInstitutions,
      categories,
      expenses,
      unpaidDues: allExpenses.filter((e: any) => isUnpaidDue(e.description)),
      monthlyTotalExpense,
      monthlyTotalDeposit,
      previousArrears,
      previousMonthCash,
      previousMonthDue,
      monthlyCash,
      deposits,
      bn,
      cleanDesc,
      getUnit,
      getMethod,
      getMemo,
      getRemarks,
      formatNum,
    });
    toast.success(bn ? 'প্রতিষ্ঠানের এক্সেল ফাইল ডাউনলোড হয়েছে' : 'Institution Excel downloaded');
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
              {bn ? 'হিসাব\u00a0ব্যবস্থাপনা\n' : 'Expense Management'}
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
            { label: bn ? `${selectedMonthName} হিসাব` : `${selectedMonthName} Expense`, val: monthlyTotalExpense, gradient: 'from-rose-500/10 via-red-400/5 to-transparent', iconBg: 'bg-gradient-to-br from-rose-500 to-red-400', icon: TrendingDown, color: 'text-rose-600 dark:text-rose-400', sparkColor: '#f43f5e', sparkData: [3,5,4,7,6,8,monthlyTotalExpense > 0 ? 10 : 0] },
            { label: bn ? `${selectedMonthName} টাকা আয়/উত্তোলন` : `${selectedMonthName} Deposit`, val: monthlyTotalDeposit, gradient: 'from-emerald-500/10 via-green-400/5 to-transparent', iconBg: 'bg-gradient-to-br from-emerald-500 to-green-400', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', sparkColor: '#10b981', sparkData: [2,4,3,6,5,7,monthlyTotalDeposit > 0 ? 10 : 0] },
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
            { label: `${filterLabel} ${bn ? 'হিসাব' : 'Expense'}`, val: totalExpenseAll, gradient: 'from-rose-500/10 via-red-400/5 to-transparent', iconBg: 'bg-gradient-to-br from-rose-500 to-red-400', icon: TrendingDown, color: 'text-rose-600 dark:text-rose-400', sparkColor: '#f43f5e' },
            { label: `${filterLabel} ${bn ? 'টাকা আয়/উত্তোলন' : 'Deposit'}`, val: totalDepositAll, gradient: 'from-emerald-500/10 via-green-400/5 to-transparent', iconBg: 'bg-gradient-to-br from-emerald-500 to-green-400', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', sparkColor: '#10b981' },
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

        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { value: 'dashboard', label: bn ? 'হিসাব ও ব্যয় এন্ট্রি' : 'Expenses' },
              { value: 'deposits', label: bn ? 'টাকা আয়/উত্তোলন' : 'Deposits' },
              { value: 'hierarchy', label: bn ? 'প্রতিষ্ঠান ভিত্তিক রিপোর্ট' : 'Institution Report' },
              { value: 'summary', label: bn ? 'সারাংশ' : 'Summary' },
              { value: 'ledger', label: bn ? 'লেজার' : 'Ledger' },
              { value: 'settings', label: bn ? 'প্রতিষ্ঠান ও ক্যাটাগরি সেটিংস' : 'Institution Setup' },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${activeTab === tab.value
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-white/60 dark:bg-white/10 backdrop-blur border border-emerald-200/30 dark:border-emerald-800/30 text-muted-foreground hover:text-foreground hover:shadow-md hover:border-emerald-300/50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Expenses Tab - Institution-based tables & Dues tables */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Institution Selector Pills */}
            {allInstitutions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{bn ? 'কোনো প্রতিষ্ঠান নেই। সেটিংস ট্যাব থেকে যোগ করুন।' : 'No institutions. Add from Settings tab.'}</p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      onClick={() => handleSelectInstitution('all')}
                      className={`group px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${selectedInstId === 'all'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                        : 'bg-white/60 dark:bg-white/10 backdrop-blur border border-emerald-200/30 dark:border-emerald-800/30 text-foreground hover:shadow-md hover:border-emerald-300/50'}`}
                    >
                      <Building2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                      {bn ? 'সকল প্রতিষ্ঠান' : 'All Institutions'}
                      <span className="ml-2 text-[11px] opacity-80">৳{formatNum(monthlyTotalExpense)}</span>
                    </button>
                    {allInstitutions.map((p: any) => {
                      const instMonthly = getInstMonthly(p.id);
                      const instDue = getInstDueTotal(p.id);
                      const isSelected = selectedInstId === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleSelectInstitution(p.id)}
                          className={`group px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${isSelected
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                            : 'bg-white/60 dark:bg-white/10 backdrop-blur border border-emerald-200/30 dark:border-emerald-800/30 text-foreground hover:shadow-md hover:border-emerald-300/50'}`}
                        >
                          <Building2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                          {getInstName(p, bn)}
                          <span className="ml-2 text-[11px] opacity-80">৳{formatNum(instMonthly)}</span>
                          {instDue > 0 && (
                            <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isSelected ? 'bg-amber-300 text-amber-950' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                              {bn ? 'বকেয়া' : 'Due'} ৳{formatNum(instDue)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        const targetInst = (selectedInstId && selectedInstId !== 'all')
                          ? allInstitutions.find((p: any) => p.id === selectedInstId)
                          : allInstitutions[0];
                        const targetId = targetInst?.id || '';
                        setReceiptFile(null);
                        setEditingExpenseId(null);
                        const availCats = getCategoriesForInst(targetId);
                        setExpenseForm({
                          ...defaultExpenseForm,
                          institution_id: targetId,
                          category_id: availCats[0]?.id || '',
                        });
                        setExpenseDialog(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-emerald-500/25 transition-all cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {bn
                          ? (selectedInstId && selectedInstId !== 'all'
                              ? `+ খরচ যোগ (${getInstShortName(getInstName(allInstitutions.find((p: any) => p.id === selectedInstId), bn))})`
                              : '+ খরচ যোগ')
                          : '+ Add Expense'}
                      </span>
                    </motion.button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExcelDownload}
                      className="border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{bn ? 'সকল প্রতিষ্ঠান এক্সেল (ক্যাটাগরি ট্যাব)' : 'Export Multi-Tab Excel'}</span>
                    </Button>
                    <span className="text-sm font-semibold text-destructive px-2 py-1 rounded bg-destructive/10">
                      {bn ? 'মাসিক মোট:' : 'Monthly Total:'} ৳{formatNum(monthlyTotalExpense)}
                    </span>
                  </div>
                </div>

                {/* Render table: Consolidated table if 'all', or dedicated table if single institution */}
                {(() => {
                  const isAll = selectedInstId === 'all';
                  const inst = isAll
                    ? null
                    : (allInstitutions.find((p: any) => p.id === selectedInstId) || allInstitutions[0]);

                  const instPaidAll = isAll
                    ? expenses.filter((e: any) => !isUnpaidDue(e.description))
                    : expenses.filter((e: any) => e.institution_id === inst?.id && !isUnpaidDue(e.description));

                  const instCats = isAll
                    ? categories
                    : getCategoriesForInst(inst?.id);

                  const instDues = isAll
                    ? allExpenses.filter((e: any) => isUnpaidDue(e.description))
                    : allExpenses.filter((e: any) => e.institution_id === inst?.id && isUnpaidDue(e.description));

                  const instPaidSum = instPaidAll.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                  const instDueSum = instDues.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

                  // Filter by category and search
                  let displayExpenses = instPaidAll;
                  if (tableCategoryId !== 'all') {
                    displayExpenses = displayExpenses.filter((e: any) => e.category_id === tableCategoryId);
                  }
                  if (tableSearchText.trim()) {
                    const q = tableSearchText.trim().toLowerCase();
                    displayExpenses = displayExpenses.filter((e: any) =>
                      cleanDesc(e.description || '').toLowerCase().includes(q) ||
                      (e.expense_date || '').includes(q) ||
                      getMemo(e.description || '').toLowerCase().includes(q) ||
                      getRemarks(e.description || '').toLowerCase().includes(q) ||
                      String(e.amount).includes(q)
                    );
                  }
                  const displayTotal = displayExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

                  // Filter dues by search as well
                  let displayDues = instDues;
                  if (tableSearchText.trim()) {
                    const q = tableSearchText.trim().toLowerCase();
                    displayDues = displayDues.filter((e: any) =>
                      cleanDesc(e.description || '').toLowerCase().includes(q) ||
                      (e.expense_date || '').includes(q) ||
                      getMemo(e.description || '').toLowerCase().includes(q) ||
                      getRemarks(e.description || '').toLowerCase().includes(q) ||
                      String(e.amount).includes(q)
                    );
                  }

                  return (
                    <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-4 sm:p-5 shadow-sm">
                      {/* Header Banner */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20">
                        <div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-emerald-600" />
                            <h3 className="text-lg font-bold text-foreground">
                              {isAll
                                ? (bn ? 'সকল প্রতিষ্ঠানের সম্মিলিত খরচের হিসাব' : 'All Institutions Combined Expenses')
                                : getInstName(inst, bn)}
                            </h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 font-medium">
                              {bn ? 'হিসাবের মাস' : 'Month'}: {selectedMonthName}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-medium">
                              {bn ? 'পরিশোধিত ব্যয়' : 'Paid Expense'}: <strong className="text-emerald-600 ml-1">৳{formatNum(instPaidSum)}</strong>
                            </span>
                            {instDueSum > 0 ? (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 font-semibold">
                                {bn ? 'বকেয়া খরচ' : 'Outstanding Due'}: <strong className="text-amber-600 ml-1">৳{formatNum(instDueSum)}</strong>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 font-normal">
                                ✓ {bn ? 'কোনো বকেয়া নেই' : 'No dues'}
                              </span>
                            )}
                            <span className="text-muted-foreground ml-1">
                              ({displayExpenses.length} {bn ? 'টি এন্ট্রি' : 'items'})
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons: Add Expense, Excel, Print */}
                        <div className="flex flex-wrap items-center gap-2">
                          {(canAddItem ?? true) && (
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => {
                                setReceiptFile(null);
                                setEditingExpenseId(null);
                                const targetInstId = isAll ? (allInstitutions[0]?.id || '') : (inst?.id || '');
                                const availCats = getCategoriesForInst(targetInstId);
                                setExpenseForm({
                                  ...defaultExpenseForm,
                                  institution_id: targetInstId,
                                  category_id: availCats[0]?.id || '',
                                });
                                setExpenseDialog(true);
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md transition-all cursor-pointer"
                              style={{ background: 'linear-gradient(135deg, hsl(160 84% 30%), hsl(160 70% 36%))' }}
                            >
                              <Plus className="w-4 h-4" />
                              <span>{bn ? 'ব্যয় এন্ট্রি' : 'Add Expense'}</span>
                            </motion.button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => isAll ? handleExcelDownload() : handleInstExcelDownload(inst?.id)}
                            className="text-xs h-9 gap-1.5 border-emerald-300 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            title={isAll ? (bn ? 'সকল প্রতিষ্ঠান এক্সেল ডাউনলোড' : 'Export Multi-Tab Excel') : (bn ? 'এই প্রতিষ্ঠানের ক্যাটাগরিভিত্তিক এক্সেল' : 'Export institution excel')}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{bn ? 'এক্সেল ডাউনলোড' : 'Excel'}</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPrintInstitutionId(isAll ? (allInstitutions[0]?.id || null) : inst?.id)}
                            className="text-xs h-9 gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>{bn ? 'প্রিন্ট / ভাউচার' : 'Print'}</span>
                          </Button>
                        </div>
                      </div>

                      {/* Search & Category Filter Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                          <Select value={tableCategoryId} onValueChange={setTableCategoryId}>
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                              <SelectValue placeholder={bn ? 'সকল ক্যাটাগরি' : 'All Categories'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{bn ? 'সকল ক্যাটাগরি' : 'All Categories'}</SelectItem>
                              {instCats.map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>{getCatName(c, bn)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Input
                            className="h-8 text-xs max-w-xs flex-1"
                            placeholder={bn ? 'বিবরণ, মেমো বা তারিখ দিয়ে খুঁজুন...' : 'Search description, memo, date...'}
                            value={tableSearchText}
                            onChange={e => setTableSearchText(e.target.value)}
                          />
                          {tableSearchText && (
                            <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={() => setTableSearchText('')}>
                              {bn ? 'ক্লিয়ার' : 'Clear'}
                            </Button>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {bn ? 'পরিশোধিত খরচ প্রদর্শিত হচ্ছে' : 'Showing paid expenses'}
                        </div>
                      </div>

                      {/* Main Expenses Table */}
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto bg-card">
                        <table className="w-full border-collapse text-sm text-foreground">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs">
                              <th className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-300 w-10">#</th>
                              <th className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-300 w-28">{bn ? 'তারিখ' : 'Date'}</th>
                              {isAll && (
                                <th className="px-3 py-2 text-left font-bold text-slate-700 dark:text-slate-300 w-36">{bn ? 'প্রতিষ্ঠান' : 'Institution'}</th>
                              )}
                              <th className="px-3 py-2 text-left font-bold text-slate-700 dark:text-slate-300 w-36">{bn ? 'ক্যাটাগরি' : 'Category'}</th>
                              <th className="px-3 py-2 text-left font-bold text-slate-700 dark:text-slate-300">{bn ? 'ব্যয়ের বিবরণ' : 'Description'}</th>
                              <th className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-300 w-24">{bn ? 'পরিমাণ' : 'Quantity'}</th>
                              <th className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-300 min-w-[110px]">{bn ? 'ব্যয়ের মাধ্যম' : 'Method'}</th>
                              <th className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-300 w-28">{bn ? 'মেমো / রশিদ' : 'Memo/Receipt'}</th>
                              <th className="px-3 py-2 text-right font-bold text-slate-700 dark:text-slate-300 w-32">{bn ? 'ব্যয় টাকা (৳)' : 'Amount (৳)'}</th>
                              <th className="px-3 py-2 text-left font-bold text-slate-700 dark:text-slate-300 w-36">{bn ? 'মন্তব্য' : 'Remarks'}</th>
                              <th className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-300 w-28">{bn ? 'অ্যাকশন' : 'Action'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayExpenses.length === 0 ? (
                              <tr>
                                <td colSpan={isAll ? 11 : 10} className="px-3 py-10 text-center text-muted-foreground">
                                  {bn ? 'এই ফিল্টারে কোনো ব্যয়ের হিসাব পাওয়া যায়নি।' : 'No expenses found for this filter.'}
                                </td>
                              </tr>
                            ) : (
                              displayExpenses.map((e: any, idx: number) => {
                                const catObj = categories.find((c: any) => c.id === e.category_id);
                                const catLabel = catObj ? getCatName(catObj, bn) : (e.expense_categories ? getCatName(e.expense_categories, bn) : '-');
                                const memoStr = getMemo(e.description);
                                const remarksStr = getRemarks(e.description);
                                const rawQty = e.quantity ? String(e.quantity) : '১';
                                const unit = getUnit(e.description);
                                const displayQty = `${rawQty} ${unit}`;
                                const rowInst = allInstitutions.find((i: any) => i.id === e.institution_id);

                                return (
                                  <tr key={e.id} className={`border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-slate-50/40 dark:bg-slate-900/20'}`}>
                                    <td className="px-3 py-2 text-center tabular-nums text-xs text-muted-foreground">{idx + 1}</td>
                                    <td className="px-3 py-2 text-center tabular-nums text-xs whitespace-nowrap">{e.expense_date}</td>
                                    {isAll && (
                                      <td className="px-3 py-2 text-left">
                                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 truncate max-w-[140px]">
                                          {rowInst ? getInstShortName(getInstName(rowInst, bn)) : '-'}
                                        </span>
                                      </td>
                                    )}
                                    <td className="px-3 py-2 text-left">
                                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 truncate max-w-[140px]">
                                        {catLabel}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-left">
                                      <span className="font-medium text-foreground">{cleanDesc(e.description)}</span>
                                    </td>
                                    <td className="px-3 py-2 text-center text-xs tabular-nums text-slate-700 dark:text-slate-300">
                                      {displayQty}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[150px] truncate" title={getMethod(e.description)}>
                                        {getMethod(e.description)}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-center text-xs">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                                          {memoStr !== '-' ? memoStr : '-'}
                                        </span>
                                        {e.has_receipt && e.receipt_url && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                            onClick={() => setReceiptPreview(e.receipt_url)}
                                            title={bn ? 'রসিদ দেখুন' : 'View receipt'}
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                          </Button>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums font-bold text-foreground">
                                      ৳{formatNum(Number(e.amount))}
                                    </td>
                                    <td className="px-3 py-2 text-left text-xs text-muted-foreground truncate max-w-[150px]" title={remarksStr !== '-' ? remarksStr : ''}>
                                      {remarksStr !== '-' ? remarksStr : '-'}
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                      <div className="flex gap-1 justify-center items-center">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                          onClick={() => setVoucherExpense(e)}
                                          title={bn ? 'ভাউচার প্রিন্ট' : 'Voucher print'}
                                        >
                                          <FileText className="w-3.5 h-3.5" />
                                        </Button>
                                        {(canEditItem ?? true) && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                                            onClick={() => openEditExpense(e)}
                                            title={bn ? 'সম্পাদনা' : 'Edit'}
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </Button>
                                        )}
                                        {(canDeleteItem ?? true) && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                                            onClick={() => { setDeleteConfirmId(e.id); setDeleteConfirmType('expense'); }}
                                            title={bn ? 'মুছে ফেলুন' : 'Delete'}
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-800 text-white font-bold text-xs">
                              <td colSpan={isAll ? 8 : 7} className="px-4 py-2.5 text-right">
                                {bn ? 'মোট পরিশোধিত ব্যয়:' : 'Total Paid Expense:'}
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-sm text-emerald-300">
                                ৳{formatNum(displayTotal)}
                              </td>
                              <td colSpan={2} className="px-3 py-2.5 text-slate-400 text-right">
                                ({displayExpenses.length} {bn ? 'টি এন্ট্রি' : 'items'})
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Dedicated Dues Table (বকেয়া খরচের হিসাব) */}
                      <div className="rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50/20 dark:bg-amber-950/10 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 dark:border-amber-800/40 pb-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                              {isAll
                                ? (bn ? 'সকল প্রতিষ্ঠানের বকেয়া খরচের হিসাব (পরিশোধ বাকি)' : 'All Institutions Outstanding Dues')
                                : (bn ? 'বকেয়া খরচের হিসাব (পরিশোধ বাকি)' : 'Outstanding Dues for Institution')}
                            </h4>
                            <span className="text-xs text-amber-700 dark:text-amber-300">
                              — {bn ? 'পরিশোধ করলে পরিশোধের মাসের ক্যাশ খরচে এন্ট্রি হবে' : 'Settling records payment in settlement month'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-100">
                              {bn ? 'মোট বকেয়া:' : 'Total Due:'} ৳{formatNum(instDueSum)}
                            </span>
                          </div>
                        </div>

                        <div className="border border-amber-200 dark:border-amber-800/40 rounded-lg overflow-x-auto bg-card">
                          <table className="w-full border-collapse text-xs text-foreground">
                            <thead>
                              <tr className="bg-amber-100/60 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/40">
                                <th className="px-3 py-2 text-center font-bold text-amber-950 dark:text-amber-200 w-10">#</th>
                                <th className="px-3 py-2 text-center font-bold text-amber-950 dark:text-amber-200 w-28">{bn ? 'বকেয়ার তারিখ' : 'Due Date'}</th>
                                {isAll && (
                                  <th className="px-3 py-2 text-left font-bold text-amber-950 dark:text-amber-200 w-36">{bn ? 'প্রতিষ্ঠান' : 'Institution'}</th>
                                )}
                                <th className="px-3 py-2 text-left font-bold text-amber-950 dark:text-amber-200 w-36">{bn ? 'ক্যাটাগরি' : 'Category'}</th>
                                <th className="px-3 py-2 text-left font-bold text-amber-950 dark:text-amber-200">{bn ? 'ব্যয়ের বিবরণ ও পাওনাদার' : 'Description & Vendor'}</th>
                                <th className="px-3 py-2 text-center font-bold text-amber-950 dark:text-amber-200 w-24">{bn ? 'পরিমাণ' : 'Quantity'}</th>
                                <th className="px-3 py-2 text-center font-bold text-amber-950 dark:text-amber-200 w-28">{bn ? 'মেমো / চালান' : 'Memo/Invoice'}</th>
                                <th className="px-3 py-2 text-right font-bold text-amber-950 dark:text-amber-200 w-32">{bn ? 'বকেয়া টাকা (৳)' : 'Due Amount (৳)'}</th>
                                <th className="px-3 py-2 text-left font-bold text-amber-950 dark:text-amber-200 w-36">{bn ? 'মন্তব্য' : 'Remarks'}</th>
                                <th className="px-3 py-2 text-center font-bold text-amber-950 dark:text-amber-200 w-36">{bn ? 'অ্যাকশন' : 'Action'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayDues.length === 0 ? (
                                <tr>
                                  <td colSpan={isAll ? 10 : 9} className="px-3 py-6 text-center text-muted-foreground">
                                    ✓ {bn ? 'কোনো বকেয়া খরচ নেই। সব পরিশোধিত।' : 'No outstanding dues.'}
                                  </td>
                                </tr>
                              ) : (
                                displayDues.map((due: any, dIdx: number) => {
                                  const catObj = categories.find((c: any) => c.id === due.category_id);
                                  const catLabel = catObj ? (bn ? catObj.name_bn || catObj.name : catObj.name) : '-';
                                  const rawQty = due.quantity ? String(due.quantity) : '১';
                                  const unit = getUnit(due.description);
                                  const displayQty = `${rawQty} ${unit}`;
                                  const memoStr = getMemo(due.description);
                                  const remarksStr = getRemarks(due.description);
                                  const rowInst = allInstitutions.find((i: any) => i.id === due.institution_id);

                                  return (
                                    <tr key={due.id} className="border-b border-amber-100 dark:border-amber-950/60 hover:bg-amber-50/40 dark:hover:bg-amber-950/20">
                                      <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{dIdx + 1}</td>
                                      <td className="px-3 py-2 text-center tabular-nums whitespace-nowrap">{due.expense_date}</td>
                                      {isAll && (
                                        <td className="px-3 py-2 text-left">
                                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-200/80 text-amber-950 dark:bg-amber-900 dark:text-amber-100 truncate max-w-[140px]">
                                            {rowInst ? getInstShortName(getInstName(rowInst, bn)) : '-'}
                                          </span>
                                        </td>
                                      )}
                                      <td className="px-3 py-2 text-left">
                                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200">
                                          {catLabel}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-left">
                                        <span className="font-medium text-foreground">{cleanDesc(due.description)}</span>
                                      </td>
                                      <td className="px-3 py-2 text-center tabular-nums text-slate-700 dark:text-slate-300">
                                        {displayQty}
                                      </td>
                                      <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                        {memoStr !== '-' ? memoStr : '-'}
                                      </td>
                                      <td className="px-3 py-2 text-right tabular-nums font-bold text-amber-700 dark:text-amber-300">
                                        ৳{formatNum(Number(due.amount))}
                                      </td>
                                      <td className="px-3 py-2 text-left text-muted-foreground truncate max-w-[140px]" title={remarksStr !== '-' ? remarksStr : ''}>
                                        {remarksStr !== '-' ? remarksStr : '-'}
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        <div className="flex gap-1 justify-center items-center">
                                          <Button
                                            size="sm"
                                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-2.5 cursor-pointer"
                                            onClick={() => {
                                              setPayDueExpense(due);
                                              setPayDueForm({
                                                payment_date: new Date().toISOString().split('T')[0],
                                                payment_method: 'ক্যাশ',
                                                payment_method_other: '',
                                                memo_no: memoStr !== '-' ? memoStr : '',
                                                remarks: remarksStr !== '-' ? remarksStr : '',
                                              });
                                            }}
                                          >
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>{bn ? 'পরিশোধ' : 'Pay'}</span>
                                          </Button>

                                          {(canEditItem ?? true) && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                                              onClick={() => openEditExpense(due)}
                                              title={bn ? 'সম্পাদনা' : 'Edit'}
                                            >
                                              <Edit2 className="w-3 h-3" />
                                            </Button>
                                          )}

                                          {(canDeleteItem ?? true) && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                                              onClick={() => { setDeleteConfirmId(due.id); setDeleteConfirmType('expense'); }}
                                              title={bn ? 'মুছে ফেলুন' : 'Delete'}
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                            {displayDues.length > 0 && (
                              <tfoot>
                                <tr className="bg-amber-900 text-white font-bold text-xs">
                                  <td colSpan={isAll ? 7 : 6} className="px-4 py-2 text-right">
                                    {bn ? 'সর্বমোট বকেয়া দায়:' : 'Total Outstanding:'}
                                  </td>
                                  <td className="px-3 py-2 text-right tabular-nums text-amber-200">
                                    ৳{formatNum(instDueSum)}
                                  </td>
                                  <td colSpan={2} className="px-3 py-2 text-amber-300 text-right">
                                    ({displayDues.length} {bn ? 'টি বকেয়া' : 'dues'})
                                  </td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </TabsContent>

          {/* Deposits Tab */}
          <TabsContent value="deposits" className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h3 className="font-semibold">{bn ? 'টাকা আয়/উত্তোলন তালিকা' : 'Deposit List'} ({selectedMonthYear})</h3>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => {
                  setDepositPrintEditData({
                    instName, instNameEn, instAddress, instPhone, instEmail, instOther, instLogo,
                    reportTitle: bn ? 'টাকা আয়/উত্তোলন প্রতিবেদন' : 'Deposit Report',
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
                    <Button size="sm"><Plus className="w-4 h-4 mr-1" />{bn ? 'টাকা আয়/উত্তোলন যোগ' : 'Add Deposit'}</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editingDepositId ? (bn ? 'টাকা আয়/উত্তোলন সম্পাদনা' : 'Edit Deposit') : (bn ? 'নতুন টাকা আয়/উত্তোলন' : 'New Deposit')}</DialogTitle></DialogHeader>
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

            <div className="border border-slate-300 overflow-auto bg-white">
              <table className="w-full border-collapse text-sm text-slate-700">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300">
                    <th className="border border-slate-300 px-3 py-1.5 text-center font-semibold text-slate-800 w-12">#</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-center font-semibold text-slate-800 w-32">{bn ? 'তারিখ' : 'Date'}</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-left font-semibold text-slate-800">{bn ? 'ব্যাংক/অন্যান্য' : 'Bank/Other'}</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-left font-semibold text-slate-800">{bn ? 'বিবরণ' : 'Details'}</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-left font-semibold text-slate-800 w-32">{bn ? 'উৎস' : 'Source'}</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-right font-semibold text-slate-800 w-40">{bn ? 'টাকা' : 'Amount'}</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-center font-semibold text-slate-800 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.length === 0 && (
                    <tr>
                      <td colSpan={7} className="border border-slate-300 px-3 py-8 text-center text-slate-500">
                        {bn ? 'কোনো টাকা আয়/উত্তোলন নেই' : 'No deposits'}
                      </td>
                    </tr>
                  )}
                  {deposits.map((d: any, i: number) => (
                    <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-slate-300 px-3 py-1.5 text-center tabular-nums">{i + 1}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-center tabular-nums">{d.deposit_date}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-left">{d.bank_details || '-'}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-left">{d.other_details || '-'}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-left">{d.source}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-right tabular-nums font-medium">৳{formatNum(Number(d.amount))}</td>
                      <td className="border border-slate-300 px-2 py-1 text-center">
                        <div className="flex gap-0.5 justify-center">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDeposit(d)}><Edit2 className="w-3.5 h-3.5 text-slate-500" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDeleteConfirmId(d.id); setDeleteConfirmType('deposit'); }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {deposits.length > 0 && (
                    <tr className="bg-slate-800 text-white font-bold">
                      <td colSpan={5} className="border border-slate-700 px-3 py-2 text-right">{bn ? 'মোট টাকা আয়/উত্তোলন:' : 'Total:'}</td>
                      <td className="border border-slate-700 px-3 py-2 text-right tabular-nums">৳{formatNum(monthlyTotalDeposit)}</td>
                      <td className="border border-slate-700 px-3 py-2"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Hierarchy Report Tab */}
          <TabsContent value="hierarchy" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-white/60 dark:bg-card/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div>
                <h3 className="font-bold text-base text-foreground">{bn ? 'প্রতিষ্ঠান ও ক্যাটাগরিভিত্তিক ব্যয় রিপোর্ট' : 'Hierarchy Report'}</h3>
                <p className="text-xs text-muted-foreground">{bn ? 'প্রতিষ্ঠান ও ক্যাটাগরি অনুযায়ী ব্যয়ের শ্রেণীবদ্ধ বিবরণ' : 'Hierarchical breakdown by institution and category'}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setActiveTab('dashboard');
                  const targetId = allInstitutions[0]?.id || '';
                  const availCats = getCategoriesForInst(targetId);
                  setExpenseForm({
                    ...defaultExpenseForm,
                    institution_id: targetId,
                    category_id: availCats[0]?.id || '',
                  });
                  setExpenseDialog(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-emerald-500/25 transition-all cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
              >
                <Plus className="w-4 h-4" />
                <span>{bn ? '+ খরচ যোগ' : '+ Add Expense'}</span>
              </motion.button>
            </div>
            <ExpenseHierarchyReport
              expenses={expenses as any}
              bn={bn}
              formatNum={formatNum}
              cleanDesc={cleanDesc}
              periodLabel={selectedMonthName}
            />
          </TabsContent>

          {/* Projects & Categories Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            {/* Quick Helper Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="font-semibold">{bn ? 'প্রতিষ্ঠান ও ক্যাটাগরি কনফিগারেশন' : 'Institution & Category Setup'}</div>
                  <div className="text-xs text-muted-foreground">{bn ? 'নতুন প্রতিষ্ঠান বা ব্যয়ের ক্যাটাগরি সেটআপ করুন। খরচের হিসাব এন্ট্রি করতে "হিসাব ও ব্যয় এন্ট্রি" ট্যাবে যান।' : 'Configure institutions or categories. Go to "Expenses" tab to enter expenses.'}</div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setActiveTab('dashboard');
                  const targetId = allInstitutions[0]?.id || '';
                  const availCats = getCategoriesForInst(targetId);
                  setExpenseForm({
                    ...defaultExpenseForm,
                    institution_id: targetId,
                    category_id: availCats[0]?.id || '',
                  });
                  setExpenseDialog(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{bn ? '+ খরচ যোগ করুন' : '+ Add Expense'}</span>
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Institutions List Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>{bn ? 'প্রতিষ্ঠান তালিকা' : 'Institutions'}</span>
                  </CardTitle>
                  <Dialog open={expInstDialog} onOpenChange={resetExpInstDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1.5 cursor-pointer">
                        <FolderPlus className="w-4 h-4 text-emerald-600" />
                        {bn ? 'নতুন প্রতিষ্ঠান' : 'Add Institution'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingExpInstId ? (bn ? 'প্রতিষ্ঠান সম্পাদনা' : 'Edit Institution') : (bn ? 'নতুন প্রতিষ্ঠান' : 'New Institution')}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <Label>{bn ? 'প্রতিষ্ঠানের নাম (বাংলা)' : 'Name (Bangla)'} *</Label>
                          <Input value={expInstForm.name_bn} onChange={e => setExpInstForm(f => ({ ...f, name_bn: e.target.value }))} placeholder="যেমন: মাদরাসা" />
                        </div>
                        <div>
                          <Label>{bn ? 'নাম (ইংরেজি - ঐচ্ছিক)' : 'Name (English - Optional)'}</Label>
                          <Input value={expInstForm.name} onChange={e => setExpInstForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Madrasah" />
                        </div>
                        <Button className="w-full" onClick={() => addExpInst.mutate()} disabled={addExpInst.isPending}>
                          {bn ? 'সংরক্ষণ' : 'Save'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {allInstitutions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{bn ? 'কোনো প্রতিষ্ঠান নেই' : 'No institutions'}</p>
                  ) : (
                    <ul className="space-y-2">
                      {allInstitutions.map((p: any) => (
                        <li key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-medium text-foreground">{getInstName(p, bn)}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => openEditExpInst(p)} title={bn ? 'সম্পাদনা' : 'Edit'}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:bg-rose-50" onClick={async () => {
                              const expCount = allExpenses.filter((e: any) => e.institution_id === p.id).length;
                              const catCount = categories.filter((c: any) => (c as any).institution_id === p.id).length;
                              let desc = bn ? `"${getInstName(p, bn)}" প্রতিষ্ঠানটি মুছে ফেলতে চান?` : `Delete institution "${getInstName(p, bn)}"?`;
                              if (expCount > 0 || catCount > 0) {
                                desc += bn
                                  ? `\n\nসতর্কতা: এতে ${expCount}টি খরচের হিসাব এবং ${catCount}টি ক্যাটাগরি রয়েছে। প্রতিষ্ঠানটি মুছে ফেললে এগুলোও মুছে যাবে।`
                                  : `\n\nWarning: Contains ${expCount} expenses and ${catCount} categories that will also be removed.`;
                              }
                              if (await confirm({ title: bn ? 'প্রতিষ্ঠান মুছে ফেলুন' : 'Delete Institution', description: desc, variant: 'destructive' })) {
                                deleteExpInst.mutate(p.id);
                              }
                            }} title={bn ? 'মুছে ফেলুন' : 'Delete'}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Categories Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TagIcon className="w-4 h-4 text-emerald-600" />
                    <span>{bn ? 'ব্যয়ের ক্যাটাগরি' : 'Expense Categories'}</span>
                  </CardTitle>
                  <Dialog open={categoryDialog} onOpenChange={resetCategoryDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1.5 cursor-pointer">
                        <TagIcon className="w-4 h-4 text-emerald-600" />
                        {bn ? 'নতুন ক্যাটাগরি' : 'Add Category'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{editingCategoryId ? (bn ? 'ক্যাটেগরি সম্পাদনা' : 'Edit Category') : (bn ? 'নতুন ক্যাটেগরি' : 'New Category')}</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <Label>{bn ? 'প্রতিষ্ঠান' : 'Institution'} *</Label>
                          <Select value={categoryForm.institution_id} onValueChange={v => setCategoryForm(f => ({ ...f, institution_id: v }))}>
                            <SelectTrigger><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                            <SelectContent>{allInstitutions.map((p: any) => <SelectItem key={p.id} value={p.id}>{getInstName(p, bn)}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>{bn ? 'ক্যাটাগরি নাম (বাংলা)' : 'Category Name (Bangla)'} *</Label>
                          <Input value={categoryForm.name_bn} onChange={e => setCategoryForm(f => ({ ...f, name_bn: e.target.value }))} placeholder="যেমন: খাবার" />
                        </div>
                        <div>
                          <Label>{bn ? 'ক্যাটাগরি নাম (ইংরেজি - ঐচ্ছিক)' : 'Category Name (English - Optional)'}</Label>
                          <Input value={categoryForm.name} onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Food" />
                        </div>
                        <Button className="w-full" onClick={() => addCategory.mutate()} disabled={addCategory.isPending}>{bn ? 'সংরক্ষণ' : 'Save'}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {categories.length === 0 ? <p className="text-sm text-muted-foreground">{bn ? 'কোনো ক্যাটেগরি নেই' : 'No categories'}</p> : (
                    <ul className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                      {categories.map((c: any) => {
                        const catInst = allInstitutions.find((i: any) => i.id === (c as any).institution_id);
                        return (
                          <li key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                            <div>
                              <span className="text-sm font-medium">{getCatName(c, bn)}</span>
                              {catInst && <span className="text-xs text-primary ml-1.5 font-normal">({getInstName(catInst, bn)})</span>}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => openEditCategory(c)} title={bn ? 'সম্পাদনা' : 'Edit'}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:bg-rose-50" onClick={async () => {
                                const expCount = allExpenses.filter((e: any) => e.category_id === c.id).length;
                                let desc = bn ? `"${getCatName(c, bn)}" ক্যাটাগরিটি মুছে ফেলতে চান?` : `Delete category "${getCatName(c, bn)}"?`;
                                if (expCount > 0) {
                                  desc += bn
                                    ? `\n\nসতর্কতা: এই ক্যাটাগরিতে ${expCount}টি খরচের এন্ট্রি রয়েছে। ক্যাটাগরি মুছে ফেললে সংশ্লিষ্ট খরচও মুছে যাবে।`
                                    : `\n\nWarning: Contains ${expCount} expenses that will also be removed.`;
                                }
                                if (await confirm({ title: bn ? 'ক্যাটাগরি মুছে ফেলুন' : 'Delete Category', description: desc, variant: 'destructive' })) {
                                  deleteCategory.mutate(c.id);
                                }
                              }} title={bn ? 'মুছে ফেলুন' : 'Delete'}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </li>
                        );
                      })}
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
                      <p className="text-[11px] text-muted-foreground leading-tight">{bn ? 'মোট হিসাব' : 'Total Expense'}</p>
                    </div>
                  </div>
                  <div className="stat-card flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-primary leading-tight">৳{formatNum(monthlyTotalDeposit)}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{bn ? 'মোট টাকা আয়/উত্তোলন' : 'Total Deposit'}</p>
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
                      {allInstitutions.map((inst: any) => (
                        <div key={inst.id} className={`stat-card flex items-center justify-between ${(selectedInstitutionId === inst.id || selectedInstId === inst.id) ? 'border-primary bg-primary/5' : ''}`}>
                          <div className="cursor-pointer flex-1 flex items-center gap-2" onClick={() => handleSelectInstitution(inst.id)}>
                            {inst.logo_url && <img src={inst.logo_url} alt="Logo" className="w-8 h-8 object-contain rounded" />}
                            <div>
                              <span className="text-sm font-medium">{getInstName(inst, bn)}</span>
                              {inst.address && <span className="text-xs text-muted-foreground ml-2">— {inst.address}</span>}
                              {(selectedInstitutionId === inst.id || selectedInstId === inst.id) && <span className="text-xs text-primary ml-2">✓ {bn ? 'নির্বাচিত' : 'Selected'}</span>}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingInstitutionId(inst.id); setInstitutionForm({ name: inst.name, name_en: inst.name_en || '', address: inst.address || '', phone: inst.phone || '', email: inst.email || '', other_info: inst.other_info || '', logo_url: inst.logo_url || '' }); setInstitutionDialog(true); }}>
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={async () => { if ((await confirm({ description: bn ? 'এই প্রতিষ্ঠান মুছে ফেলতে চান?' : 'Delete this institution?', variant: 'destructive' }))) { deleteInstitution.mutate(inst.id); if (selectedInstitutionId === inst.id) setSelectedInstitutionId(''); } }}>
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

                <div className="flex flex-wrap gap-3 items-end">
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

                {/* Annual Financial Summary (Year-wise PDF) - moved from Reports & Analytics */}
                <div className="card-elevated p-4 border-2 border-primary/20 bg-primary/5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <FileBarChart className="w-4 h-4 text-primary" />
                        {bn ? 'মাসিক আর্থিক সারসংক্ষেপ (বার্ষিক রিপোর্ট)' : 'Monthly Financial Summary (Annual Report)'}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {bn ? 'নির্বাচিত বছরের প্রতি মাসের আয়, ব্যয় ও নেট ব্যালেন্সের বাংলা-ইংরেজি দ্বিভাষিক PDF রিপোর্ট।' : 'Bilingual PDF report of monthly income, expense and net balance for the selected year.'}
                      </p>
                    </div>
                    <div className="flex items-end gap-2">
                      <div>
                        <Label className="text-xs">{bn ? 'বছর' : 'Year'}</Label>
                        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                          <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 8 }, (_, i) => currentYear - i).map(y => (
                              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAnnualFinancialPDF}>
                        <FileText className="w-4 h-4 mr-1" />{bn ? 'PDF ডাউনলোড' : 'Download PDF'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Per-institution download */}
                {allInstitutions.length > 0 && (
                  <div className="card-elevated p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-foreground">{bn ? 'প্রতিষ্ঠান ভিত্তিক ডাউনলোড' : 'Per-Project Download'}</h4>
                      {allInstitutions.length > 1 && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">{bn ? 'প্রতিষ্ঠান:' : 'Institution:'}</Label>
                          <Select value={selectedInstitutionId} onValueChange={handleSelectInstitution}>
                            <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {allInstitutions.map((inst: any) => <SelectItem key={inst.id} value={inst.id}>{getInstName(inst, bn)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {allInstitutions.map((p: any) => {
                        const projExp = expenses.filter((e: any) => e.institution_id === p.id);
                        const instTotal = projExp.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                        if (projExp.length === 0) return null;
                        return (
                          <div key={p.id} className="stat-card flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium">{getInstName(p, bn)}</span>
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

          {/* Ledger Tab */}
          <TabsContent value="ledger" className="space-y-4">
            <LedgerReport
              bn={bn}
              expenseInstitutions={allInstitutions}
              categories={categories as any[]}
              cleanDesc={cleanDesc}
            />
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
          <p className="text-base font-semibold mt-2">{bn ? 'হিসাব প্রতিবেদন' : 'Expense Report'}</p>
          <p className="text-sm">{selectedMonthYear}</p>
        </div>

        {/* Summary */}
        <table className="w-full border-collapse border mb-4 text-sm">
          <tbody>
            <tr>
              <td className="border p-2 font-medium">{bn ? 'মোট হিসাব' : 'Total Expense'}</td>
              <td className="border p-2 text-right">৳{formatNum(monthlyTotalExpense)}</td>
              <td className="border p-2 font-medium">{bn ? 'মোট টাকা আয়/উত্তোলন' : 'Total Deposit'}</td>
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
        {allInstitutions.map((inst: any) => {
          const instExpenses = expenses.filter((e: any) => e.institution_id === inst.id);
          if (instExpenses.length === 0) return null;
          const instTotal = instExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
          const instCatsForPrint = getCategoriesForInst(inst.id);
          
          return (
            <div key={inst.id} className="mb-6" style={{ pageBreakInside: 'avoid' }}>
              <h2 className="text-base font-bold mb-1 border-b pb-1">
                {bn ? 'প্রতিষ্ঠান' : 'Institution'}: {getInstName(inst, bn)}
                <span className="float-right">{bn ? 'মোট' : 'Total'}: ৳{formatNum(instTotal)}</span>
              </h2>
              
              {instCatsForPrint.map((cat: any) => {
                const catExpenses = instExpenses.filter((e: any) => e.category_id === cat.id);
                if (catExpenses.length === 0) return null;
                const catTotal = catExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                
                return (
                  <div key={cat.id} className="mb-3 ml-2">
                    <h3 className="text-sm font-semibold mb-1">
                      {bn ? 'ক্যাটেগরি' : 'Category'}: {getCatName(cat, bn)}
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
            <td className="border p-2">{bn ? 'সর্বমোট হিসাব' : 'Grand Total Expense'}</td>
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
          <DialogHeader><DialogTitle>{editingExpenseId ? (bn ? 'হিসাব সম্পাদনা' : 'Edit Expense') : (bn ? 'নতুন হিসাব' : 'New Expense')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{bn ? 'প্রতিষ্ঠান' : 'Institution'} *</Label>
              <Select
                value={expenseForm.institution_id || undefined}
                onValueChange={value => {
                  const availCats = getCategoriesForInst(value);
                  setExpenseForm(f => ({ ...f, institution_id: value, category_id: availCats[0]?.id || '' }));
                }}
              >
                <SelectTrigger><SelectValue placeholder={bn ? 'প্রতিষ্ঠান নির্বাচন করুন' : 'Select institution'} /></SelectTrigger>
                <SelectContent>
                  {allInstitutions.map((inst: any) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {getInstName(inst, bn)}
                    </SelectItem>
                  ))}
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
              >
                <SelectTrigger><SelectValue placeholder={bn ? 'ক্যাটেগরি নির্বাচন করুন' : 'Select category'} /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id}>
                      {getCatName(category, bn)}
                    </SelectItem>
                  ))}
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
            <div className="grid grid-cols-2 gap-3">
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
                <Label>{bn ? 'মেমো / রশিদ নং' : 'Memo / Receipt #'}</Label>
                <Input 
                  placeholder={bn ? 'উদা: MM-1042' : 'e.g. MM-1042'} 
                  value={expenseForm.memo_no} 
                  onChange={e => setExpenseForm(f => ({ ...f, memo_no: e.target.value }))} 
                />
              </div>
            </div>

            <div>
              <Label>{bn ? 'মন্তব্য' : 'Remarks'}</Label>
              <Input 
                placeholder={bn ? 'প্রয়োজনীয় মন্তব্য বা নোট...' : 'Notes or remarks...'} 
                value={expenseForm.remarks} 
                onChange={e => setExpenseForm(f => ({ ...f, remarks: e.target.value }))} 
              />
            </div>

            {/* Due (বকেয়া) Checkbox */}
            <div className="rounded-xl border border-amber-300/80 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="expense_is_due_cb"
                  checked={expenseForm.is_due} 
                  onCheckedChange={v => setExpenseForm(f => ({ ...f, is_due: !!v }))} 
                />
                <Label htmlFor="expense_is_due_cb" className="text-sm font-semibold text-amber-900 dark:text-amber-200 cursor-pointer">
                  {bn ? 'খরচটি বকেয়া (পরিশোধ বাকি)' : 'This expense is Due (Unpaid)'}
                </Label>
              </div>
              <p className="text-[11px] text-muted-foreground ml-6">
                {bn ? 'চিহ্নিত করলে এই খরচটি বকেয়া টেবিলে যাবে এবং নগদ ব্যালেন্স থেকে এখনই বাদ যাবে না।' : 'Will be tracked in the Dues table and not deducted from cash until settled.'}
              </p>
            </div>

            {!expenseForm.is_due ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>{bn ? 'ব্যয়ের মাধ্যম (কার মাধ্যমে / কিভাবে ব্যয়)' : 'Expense Method / Paid Via'} *</Label>
                  <span className="text-[11px] text-muted-foreground">{bn ? 'টাইপ করুন বা নিচে দ্রুত নির্বাচন করুন' : 'Type or quick select'}</span>
                </div>
                <Input 
                  placeholder={bn ? 'উদা: ক্যাশ, বিকাশ, রহিমের মাধ্যমে, ব্যাংক...' : 'e.g. Cash, bKash, via Rahim, Bank...'} 
                  value={expenseForm.expense_method} 
                  onChange={e => setExpenseForm(f => ({ ...f, expense_method: e.target.value }))} 
                />
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] text-muted-foreground mr-1">{bn ? 'দ্রুত বাছাই:' : 'Quick select:'}</span>
                  {EXPENSE_METHODS.filter(m => m !== 'অন্যান্য').map(m => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setExpenseForm(f => ({ ...f, expense_method: m }))}
                      className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all ${
                        expenseForm.expense_method === m
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-semibold'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                  {expenseForm.expense_method && !expenseForm.expense_method.includes('মাধ্যমে') && (
                    <button
                      type="button"
                      onClick={() => setExpenseForm(f => ({ ...f, expense_method: `${f.expense_method ? f.expense_method + ' - ' : ''}কার মাধ্যমে: ` }))}
                      className="text-[11px] px-2 py-0.5 rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      {bn ? '+ ব্যক্তির নাম যুক্ত করুন' : '+ Add Person'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-amber-100/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                <span>{bn ? 'বকেয়া খরচ পরিশোধের সময় ব্যয়ের মাধ্যম ও রশিদ নির্ধারণ করা যাবে।' : 'Payment method will be recorded upon settling the due.'}</span>
              </div>
            )}
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

      {/* Pay Due Dialog */}
      <Dialog open={!!payDueExpense} onOpenChange={(open) => { if (!open) setPayDueExpense(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              <span>{bn ? 'বকেয়া খরচ পরিশোধ' : 'Pay Due Expense'}</span>
            </DialogTitle>
          </DialogHeader>
          {payDueExpense && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{bn ? 'বিবরণ:' : 'Description:'}</span>
                  <span className="font-semibold text-foreground text-right">{cleanDesc(payDueExpense.description)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{bn ? 'বকেয়ার তারিখ:' : 'Due Date:'}</span>
                  <span>{payDueExpense.expense_date}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-destructive pt-1 border-t border-amber-200 dark:border-amber-800/60">
                  <span>{bn ? 'বকেয়া পরিমাণ:' : 'Due Amount:'}</span>
                  <span>৳{formatNum(Number(payDueExpense.amount))}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>{bn ? 'পরিশোধের তারিখ' : 'Payment Date'} *</Label>
                  <DatePicker bengali={bn} value={payDueForm.payment_date} onChange={v => setPayDueForm(f => ({ ...f, payment_date: v }))} />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {bn ? 'যে তারিখে পরিশোধ করবেন, সেই মাসের ক্যাশ খরচে এই টাকা যুক্ত হবে।' : 'Expense will be recorded in this date\'s month cash flow.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>{bn ? 'পরিশোধের মাধ্যম (কার মাধ্যমে / কিভাবে পরিশোধ)' : 'Payment Method / Paid Via'} *</Label>
                    <span className="text-[11px] text-muted-foreground">{bn ? 'টাইপ করুন বা নিচে দ্রুত নির্বাচন করুন' : 'Type or quick select'}</span>
                  </div>
                  <Input 
                    placeholder={bn ? 'উদা: ক্যাশ, বিকাশ, রহিমের মাধ্যমে, ব্যাংক...' : 'e.g. Cash, bKash, via Rahim...'} 
                    value={payDueForm.payment_method} 
                    onChange={e => setPayDueForm(f => ({ ...f, payment_method: e.target.value }))} 
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] text-muted-foreground mr-1">{bn ? 'দ্রুত বাছাই:' : 'Quick select:'}</span>
                    {EXPENSE_METHODS.filter(m => m !== 'অন্যান্য').map(m => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setPayDueForm(f => ({ ...f, payment_method: m }))}
                        className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all ${
                          payDueForm.payment_method === m
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-semibold'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>{bn ? 'পরিশোধ মেমো / রশিদ নং' : 'Payment Memo / Receipt #'}</Label>
                  <Input
                    placeholder={bn ? 'উদা: VOUCH-012' : 'e.g. VOUCH-012'}
                    value={payDueForm.memo_no}
                    onChange={e => setPayDueForm(f => ({ ...f, memo_no: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>{bn ? 'মন্তব্য' : 'Remarks'}</Label>
                  <Input
                    placeholder={bn ? 'পরিশোধ সংক্রান্ত নোট...' : 'Payment notes...'}
                    value={payDueForm.remarks}
                    onChange={e => setPayDueForm(f => ({ ...f, remarks: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setPayDueExpense(null)}>
                  {bn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => payDueMutation.mutate()}
                  disabled={payDueMutation.isPending}
                >
                  {payDueMutation.isPending ? (bn ? 'পরিশোধ হচ্ছে...' : 'Processing...') : (bn ? 'পরিশোধ নিশ্চিত করুন' : 'Confirm Payment')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              <span>{bn ? 'প্রতিষ্ঠানের এন্ট্রি সম্পাদনা' : 'Edit Institution Entries'} — {(() => { const p = allInstitutions.find((p: any) => p.id === editInstitutionEntriesId); return p ? getInstName(p, bn) : ''; })()}</span>
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
                {getCategoriesForInst(editInstitutionEntriesId).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{getCatName(c, bn)}</SelectItem>
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
            const instCatsForPrint = getCategoriesForInst(editInstitutionEntriesId);
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
                    reportTitle: bn ? 'প্রকল্প হিসাব প্রতিবেদন' : 'Project Expense Report',
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
            const inst = allInstitutions.find((p: any) => p.id === printInstitutionId);
            if (!inst) return null;
            const instExpenses = expenses.filter((e: any) => e.institution_id === printInstitutionId);
            const instTotal = instExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
            const instCatsForPrint = getCategoriesForInst(printInstitutionId);
            const ed = printEditData;
            const dInstName = ed.instName || (bn ? instName : instNameEn);
            const dInstAddress = ed.instAddress || instAddress;
            const dInstPhone = ed.instPhone || instPhone;
            const dInstEmail = ed.instEmail || instEmail;
            const dInstOther = ed.instOther || instOther;
            const dInstLogo = ed.instLogo || instLogo;
            const dReportTitle = ed.reportTitle || (bn ? 'প্রকল্প হিসাব প্রতিবেদন' : 'Project Expense Report');
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
                            <th className="border p-1 text-center w-8">#</th>
                            <th className="border p-1 text-center w-20">{bn ? 'তারিখ' : 'Date'}</th>
                            <th className="border p-1 text-left">{bn ? 'ব্যয়ের বিবরণ' : 'Description'}</th>
                            <th className="border p-1 text-center w-20">{bn ? 'পরিমাণ' : 'Quantity'}</th>
                            <th className="border p-1 text-center w-20">{bn ? 'ব্যয়ের মাধ্যম' : 'Method'}</th>
                            <th className="border p-1 text-center w-24">{bn ? 'মেমো / রশিদ' : 'Memo/Receipt'}</th>
                            <th className="border p-1 text-right w-24">{bn ? 'ব্যয় টাকা (৳)' : 'Amount (৳)'}</th>
                            <th className="border p-1 text-left w-28">{bn ? 'মন্তব্য' : 'Remarks'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catExpenses.map((e: any, i: number) => (
                            <tr key={e.id}>
                              <td className="border p-1 text-center">{i + 1}</td>
                              <td className="border p-1 text-center">{e.expense_date}</td>
                              <td className="border p-1">{cleanDesc(e.description)}</td>
                              <td className="border p-1 text-center">{e.quantity || 1} {getUnit(e.description)}</td>
                              <td className="border p-1 text-center">{getMethod(e.description)}</td>
                              <td className="border p-1 text-center font-mono">{getMemo(e.description)}</td>
                              <td className="border p-1 text-right font-semibold">৳{formatNum(Number(e.amount))}</td>
                              <td className="border p-1 text-muted-foreground">{getRemarks(e.description)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}

                {/* Dues Section in Print */}
                {(() => {
                  const instDues = allExpenses.filter((e: any) => e.institution_id === printInstitutionId && isUnpaidDue(e.description));
                  if (instDues.length === 0) return null;
                  const duesTotal = instDues.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                  return (
                    <div className="mb-4 mt-6 border-t border-dashed border-amber-500 pt-3">
                      <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-1">
                        {bn ? 'বকেয়া খরচের হিসাব (পরিশোধ বাকি)' : 'Outstanding Payable Dues'} — ৳{formatNum(duesTotal)}
                      </h3>
                      <table className="w-full border-collapse border text-xs">
                        <thead>
                          <tr className="bg-amber-100/60 dark:bg-amber-950/40">
                            <th className="border p-1 text-center w-8">#</th>
                            <th className="border p-1 text-center w-20">{bn ? 'তারিখ' : 'Date'}</th>
                            <th className="border p-1 text-left">{bn ? 'ব্যয়ের বিবরণ ও পাওনাদার' : 'Description & Vendor'}</th>
                            <th className="border p-1 text-center w-20">{bn ? 'পরিমাণ' : 'Quantity'}</th>
                            <th className="border p-1 text-center w-24">{bn ? 'মেমো / চালান' : 'Memo/Invoice'}</th>
                            <th className="border p-1 text-right w-24">{bn ? 'বকেয়া টাকা (৳)' : 'Due Amount'}</th>
                            <th className="border p-1 text-left w-28">{bn ? 'মন্তব্য' : 'Remarks'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {instDues.map((due: any, di: number) => (
                            <tr key={due.id}>
                              <td className="border p-1 text-center">{di + 1}</td>
                              <td className="border p-1 text-center">{due.expense_date}</td>
                              <td className="border p-1">{cleanDesc(due.description)}</td>
                              <td className="border p-1 text-center">{due.quantity || 1} {getUnit(due.description)}</td>
                              <td className="border p-1 text-center font-mono">{getMemo(due.description)}</td>
                              <td className="border p-1 text-right font-semibold text-amber-700">৳{formatNum(Number(due.amount))}</td>
                              <td className="border p-1 text-muted-foreground">{getRemarks(due.description)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                <div className="border-t-2 border-foreground pt-2 text-right font-bold text-sm">
                  {bn ? 'প্রকল্প মোট পরিশোধিত ব্যয়' : 'Project Paid Total'}: ৳{formatNum(instTotal)}
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
              <span>{bn ? 'টাকা আয়/উত্তোলন প্রিন্ট প্রিভিউ' : 'Deposit Print Preview'}</span>
              <Button variant={depositPrintEditMode ? 'default' : 'outline'} size="sm" onClick={() => {
                if (!depositPrintEditMode) {
                  setDepositPrintEditData({
                    instName, instNameEn, instAddress, instPhone, instEmail, instOther, instLogo,
                    reportTitle: bn ? 'টাকা আয়/উত্তোলন প্রতিবেদন' : 'Deposit Report',
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
                <p className="text-base font-semibold mt-2">{depositPrintEditData.reportTitle || (bn ? 'টাকা আয়/উত্তোলন প্রতিবেদন' : 'Deposit Report')}</p>
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
                    <td colSpan={5} className="border p-1 text-right">{bn ? 'মোট টাকা আয়/উত্তোলন:' : 'Total:'}</td>
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
                win.document.write(`<html><head><title>${bn ? 'টাকা আয়/উত্তোলন প্রতিবেদন' : 'Deposit Report'}</title><style>body{font-family:'SutonnyOMJ','Noto Sans Bengali',sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:4px 8px}th{background:#f0f0f0;text-align:left}.text-right{text-align:right}.text-center{text-align:center}.italic{font-style:italic}@media print{body{padding:0}}</style></head><body>${content.innerHTML}</body></html>`);
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
