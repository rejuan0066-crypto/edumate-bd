// @ts-nocheck -- generated DB types are stricter than these legacy dynamic shapes
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, DollarSign, TrendingDown, TrendingUp, Wallet, Printer, FolderPlus, TagIcon, Upload, Download, Eye, ScanLine, Building2, Package, AlertTriangle, FileText, FileBarChart, CheckCircle2, Clock, Coins, Check, ExternalLink } from 'lucide-react';
import ExpenseVoucherPrint from '@/components/expenses/ExpenseVoucherPrint';
import ExpenseHierarchyReport from '@/components/expenses/ExpenseHierarchyReport';
import LedgerReport from '@/components/expenses/LedgerReport';
import AccountsAuditView from '@/components/admin/AccountsAuditView';
import { useSearchParams } from 'react-router-dom';
import { useOptionalAuth } from '@/hooks/useAuth';
import { logAccountsAudit } from '@/lib/accountsAudit';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedCounter from '@/components/expenses/AnimatedCounter';
import MiniSparkline from '@/components/expenses/MiniSparkline';
import { generateBilingualReport } from '@/lib/reportPdfGenerator';
import { useConfirm } from "@/contexts/ConfirmContext";
import { exportExpensesMultiTabExcel, exportSingleInstitutionExcel, getInstShortName } from '@/lib/expenseExcelExport';
import { toBnDigits } from '@/lib/digits';
import { useSignatoryAuthorities } from '@/hooks/useSignatoryAuthorities';

export const DEFAULT_QUANTITY_UNITS = [
  'পিস',
  'জন',
  'মাস',
  'দিন',
  'ঘণ্টা',
  'বার',
  'টি',
  'কেজি',
  'গ্রাম',
  'টন',
  'বস্তা',
  'সিএফটি (cft)',
  'ট্রাক',
  'স্কয়ার ফিট (sqft)',
  'লিটার',
  'ফুট',
  'মিটার',
  'গজ',
  'সেট',
  'প্যাকেট',
  'বক্স',
  'বান্ডিল',
  'রিম'
];
export const QUANTITY_UNITS = DEFAULT_QUANTITY_UNITS;
const EXPENSE_METHODS = ['ক্যাশ', 'চেক', 'বিকাশ', 'নগদ', 'রকেট', 'ব্যাংক ট্রান্সফার', 'অন্যান্য'];

export const BUILTIN_DEPOSIT_SOURCES = [
  { id: 'manual', name_bn: 'ম্যানুয়াল / সাধারণ', name_en: 'Manual / General' },
  { id: 'fees', name_bn: 'শিক্ষার্থীদের ফি', name_en: 'Student Fees' },
  { id: 'donation', name_bn: 'দান ও অনুদান', name_en: 'Donation' },
  { id: 'bank', name_bn: 'ব্যাংক জমা / উত্তোলন', name_en: 'Bank Deposit / Withdrawal' },
  { id: 'other', name_bn: 'অন্যান্য', name_en: 'Other' },
];

export const getSourceLabel = (sourceKey: string, bn: boolean, customSources: any[] = []) => {
  if (!sourceKey) return '-';
  const builtin = BUILTIN_DEPOSIT_SOURCES.find(s => s.id === sourceKey);
  if (builtin) return bn ? builtin.name_bn : builtin.name_en;
  const custom = customSources.find((s: any) => s.id === sourceKey || s.name_bn === sourceKey || s.name === sourceKey);
  if (custom) return bn ? (custom.name_bn || custom.name) : (custom.name_en || custom.name_bn || custom.name);
  return sourceKey;
};

const bnToEnDigit = (str: string) => str.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d).toString());
const onlyNumbers = (str: string) => str.replace(/[^0-9০-৯.]/g, '');

const getUnit = (desc: string, categoryName?: string) => {
  const match = desc?.match(/\[unit:(.*?)\]/)?.[1];
  if (match !== undefined) {
    if (match === 'none' || match === 'ফাঁকা' || match === '-' || match === 'none_unit') return '';
    return match;
  }
  const isSalary = (desc && /বেতন|salary|সম্মানী|honorarium|শিক্ষক-স্টাফ/i.test(desc)) ||
                   (categoryName && /বেতন|salary|সম্মানী|honorarium/i.test(categoryName));
  if (isSalary) {
    if (desc && desc.includes('জন')) return 'জন';
    return '';
  }
  return 'পিস';
};

export const formatDateBn = (dateStr: string | null | undefined, isBn: boolean = true) => {
  if (!dateStr) return '-';
  const str = String(dateStr).trim();
  const parts = str.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    const formatted = `${d}/${m}/${y}`;
    return isBn ? toBnDigits(formatted) : formatted;
  }
  return isBn ? toBnDigits(str) : str;
};

export const getMethodBn = (methodStr: string) => {
  if (!methodStr) return 'ক্যাশ';
  const m = methodStr.toLowerCase().trim();
  if (m === 'cash' || m === 'ক্যাশ') return 'ক্যাশ';
  if (m === 'bank' || m === 'ব্যাংক') return 'ব্যাংক';
  if (m === 'cheque' || m === 'check' || m === 'চেক') return 'চেক';
  if (m === 'bkash' || m === 'বিকাশ') return 'বিকাশ';
  if (m === 'nagad' || m === 'নগদ') return 'নগদ';
  if (m === 'rocket' || m === 'রকেট') return 'রকেট';
  if (m === 'online' || m === 'অনলাইন') return 'অনলাইন';
  return methodStr;
};

const getMethod = (desc: string, isBn: boolean = true) => {
  const m = desc?.match(/\[method:(.*?)\]/)?.[1] || (isBn ? 'ক্যাশ' : 'Cash');
  return isBn ? getMethodBn(m) : m;
};

const getMemo = (desc: string, isBn: boolean = false) => {
  const memo = desc?.match(/\[memo:(.*?)\]/)?.[1] || '-';
  if (memo === '-') return '-';
  return isBn ? toBnDigits(memo) : memo;
};
const getRemarks = (desc: string) => desc?.match(/\[remarks:(.*?)\]/)?.[1] || '-';
const isUnpaidDue = (desc: string) => (desc || '').includes('[due:unpaid]');
const isPaidDue = (desc: string) => (desc || '').includes('[due:paid]');
const cleanDesc = (desc: string) => (desc || '')
  .replace(/\[unit:.*?\]/g, '')
  .replace(/\[method:.*?\]/g, '')
  .replace(/\[memo:.*?\]/g, '')
  .replace(/\[remarks:.*?\]/g, '')
  .replace(/\[due:.*?\]/g, '')
  .replace(/\[paid_date:.*?\]/g, '')
  .replace(/\[original_due_id:.*?\]/g, '')
  .replace(/\[salary_bulk_total\]/g, '')
  .replace(/\[salary_month:.*?\]/g, '')
  .replace(/\[staff_id:.*?\]/g, '')
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

  const { user, role } = useOptionalAuth();
  const [searchParams] = useSearchParams();
  const [selectedMonthYear, setSelectedMonthYear] = useState(`${MONTHS[new Date().getMonth()]}-${currentYear}`);
  const [filterMode, setFilterMode] = useState<'monthly' | 'yearly' | 'session'>('monthly');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') === 'audit' ? 'audit' : 'dashboard');
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
  const [expenseListTab, setExpenseListTab] = useState<'paid' | 'dues'>('paid');
  const [breakdownTab, setBreakdownTab] = useState<'institution' | 'category' | 'hierarchy' | null>(null);
  const [voucherExpense, setVoucherExpense] = useState<any>(null);

  // Dialogs
  const [expInstDialog, setExpInstDialog] = useState(false);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [depositDialog, setDepositDialog] = useState(false);
  const [institutionDialog, setInstitutionDialog] = useState(false);
  const [editingInstitutionId, setEditingInstitutionId] = useState<string | null>(null);
  const { headOfInstitute, accountantCashier, verifierAuditor } = useSignatoryAuthorities();
  const [printEditMode, setPrintEditMode] = useState(false);
  const [printEditData, setPrintEditData] = useState({
    instName: '', instNameEn: '', instAddress: '', instPhone: '', instEmail: '', instOther: '', instLogo: '',
    reportTitle: '', reportSubtitle: '',
    casherName: '', casherDesignation: '',
    verifierName: '', verifierDesignation: '',
    principalName: '', principalDesignation: '',
    extraNote: ''
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
  const defaultExpInstForm = { name: '', name_bn: '', address: '', phone: '', email: '', other_info: '', logo_url: '' };
  const [expInstForm, setExpInstForm] = useState(defaultExpInstForm);
  const [expInstLogoFile, setExpInstLogoFile] = useState<File | null>(null);
  const [expInstLogoUploading, setExpInstLogoUploading] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ institution_id: '', name: '', name_bn: '' });
  const [expenseForm, setExpenseForm] = useState(defaultExpenseForm);
  const [isCustomUnitActive, setIsCustomUnitActive] = useState(false);
  const [customUnitText, setCustomUnitText] = useState('');
  const [depositForm, setDepositForm] = useState(defaultDepositForm);
  const [isAddingNewSource, setIsAddingNewSource] = useState(false);
  const [newSourceInput, setNewSourceInput] = useState('');
  const [settingNewSourceInput, setSettingNewSourceInput] = useState('');
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
      try {
        const { data, error } = await supabase.from('expense_institutions').select('*').order('name');
        if (error) {
          console.error('expenseInstitutions query error:', error);
          return [];
        }
        return data || [];
      } catch (err) {
        console.error('expenseInstitutions exception:', err);
        return [];
      }
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense_categories'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('expense_categories').select('*, expense_institutions(name, name_bn)').order('name');
        if (error) {
          console.error('Categories query error:', error);
          const { data: fallbackData } = await supabase.from('expense_categories').select('*').order('name');
          return fallbackData || [];
        }
        return data || [];
      } catch (err) {
        console.error('Categories exception:', err);
        return [];
      }
    }
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', selectedMonthYear],
    queryFn: async () => {
      const parts = selectedMonthYear.split('-');
      const mIdx = MONTHS.indexOf(parts[0]) + 1;
      const isoPrefix = parts[1] && mIdx > 0 ? `${parts[1]}-${String(mIdx).padStart(2, '0')}` : null;

      try {
        let query = supabase.from('expenses')
          .select('*, expense_institutions(*), expense_categories(*)')
          .order('expense_date', { ascending: false });

        if (isoPrefix) {
          query = query.or(`month_year.eq.${selectedMonthYear},and(expense_date.gte.${isoPrefix}-01,expense_date.lte.${isoPrefix}-31)`);
        } else {
          query = query.eq('month_year', selectedMonthYear);
        }

        const { data, error } = await query;
        if (!error && data) return data;
      } catch (err) {
        console.warn('Advanced expense query error, attempting simple query:', err);
      }

      try {
        const { data, error } = await supabase.from('expenses')
          .select('*, expense_institutions(*), expense_categories(*)')
          .eq('month_year', selectedMonthYear)
          .order('expense_date', { ascending: false });

        if (error) {
          console.error('Expenses fallback query error:', error);
          return [];
        }
        return data || [];
      } catch (err) {
        console.error('Expenses fallback query exception:', err);
        return [];
      }
    }
  });

  const { data: deposits = [] } = useQuery({
    queryKey: ['deposits', selectedMonthYear],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('deposits')
          .select('*').eq('month_year', selectedMonthYear).order('deposit_date', { ascending: false });
        if (error) {
          console.error('deposits query error:', error);
          return [];
        }
        return data || [];
      } catch (err) {
        console.error('deposits exception:', err);
        return [];
      }
    }
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ['all_expenses'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('expenses')
          .select('id, month_year, expense_date, amount, institution_id, category_id, description, quantity, has_receipt, receipt_url, expense_institutions(*), expense_categories(*)')
          .order('expense_date', { ascending: false });
        if (error) {
          console.error('allExpenses query error:', error);
          const { data: fallbackData } = await supabase.from('expenses')
            .select('id, month_year, expense_date, amount, institution_id, category_id, description, quantity, has_receipt, receipt_url')
            .order('expense_date', { ascending: false });
          return fallbackData || [];
        }
        return data || [];
      } catch (err) {
        console.error('allExpenses exception:', err);
        return [];
      }
    }
  });

  const { data: allDeposits = [] } = useQuery({
    queryKey: ['all_deposits'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('deposits').select('month_year, amount');
        if (error) {
          console.error('allDeposits error:', error);
          return [];
        }
        return data || [];
      } catch (err) {
        console.error('allDeposits exception:', err);
        return [];
      }
    }
  });

  const allCategories = categories || [];

  const allAvailableUnits = useMemo(() => {
    const unitsSet = new Set<string>(DEFAULT_QUANTITY_UNITS);
    (allExpenses || []).forEach((e: any) => {
      const u = getUnit(e.description);
      if (u && u !== 'পিস' && !unitsSet.has(u)) {
        unitsSet.add(u);
      }
    });
    return Array.from(unitsSet);
  }, [allExpenses]);

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

  const customDepositSources = useMemo<Array<{ id: string; name_bn: string; name_en?: string }>>(() => {
    const row = (websiteSettings as any[]).find((s: any) => s.key === 'deposit_sources');
    if (!row || !row.value) return [];
    if (Array.isArray(row.value)) {
      return row.value.map((item: any, idx: number) => {
        if (typeof item === 'string') {
          return { id: item, name_bn: item, name_en: item };
        }
        return {
          id: item.id || `custom_src_${idx}`,
          name_bn: item.name_bn || item.name || String(item),
          name_en: item.name_en || item.name || item.name_bn || String(item),
        };
      });
    }
    return [];
  }, [websiteSettings]);

  const saveDepositSourcesMutation = useMutation({
    mutationFn: async (updatedSources: Array<{ id: string; name_bn: string; name_en?: string }>) => {
      const { error } = await supabase.from('website_settings').upsert(
        { key: 'deposit_sources', value: updatedSources },
        { onConflict: 'key' }
      );
      if (error) throw error;
      await logAccountsAudit({
        action: 'category_update',
        entity_type: 'category',
        title: 'টাকা আয়/উত্তোলনের উৎস তালিকা হালনাগাদ',
        new_data: { sources: updatedSources },
        user_id: user?.id,
        user_name: user?.user_metadata?.full_name || user?.email,
        user_email: user?.email,
        user_role: role,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['website_settings'] });
      toast.success(bn ? 'উৎস তালিকা হালনাগাদ হয়েছে' : 'Deposit sources updated');
    },
    onError: (err: any) => {
      console.error('Failed to update deposit sources:', err);
      toast.error(err?.message || (bn ? 'উৎস সংরক্ষণ ব্যর্থ হয়েছে' : 'Failed to save source'));
    }
  });

  const handleQuickAddSource = async () => {
    const trimmed = newSourceInput.trim();
    if (!trimmed) {
      toast.error(bn ? 'উৎসের নাম লিখুন' : 'Enter source name');
      return;
    }
    const exists = customDepositSources.some(
      s => s.name_bn.toLowerCase() === trimmed.toLowerCase() || s.id.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      const newEntry = { id: trimmed, name_bn: trimmed, name_en: trimmed };
      await saveDepositSourcesMutation.mutateAsync([...customDepositSources, newEntry]);
    }
    setDepositForm(f => ({ ...f, source: trimmed }));
    setNewSourceInput('');
    setIsAddingNewSource(false);
    toast.success(bn ? `"${trimmed}" উৎস যোগ ও নির্বাচন করা হয়েছে` : `Added "${trimmed}" source`);
  };

  const handleAddSettingSource = async () => {
    const trimmed = settingNewSourceInput.trim();
    if (!trimmed) {
      toast.error(bn ? 'উৎসের নাম লিখুন' : 'Enter source name');
      return;
    }
    const isBuiltin = BUILTIN_DEPOSIT_SOURCES.some(
      s => s.name_bn.toLowerCase() === trimmed.toLowerCase() || s.id.toLowerCase() === trimmed.toLowerCase()
    );
    const isCustom = customDepositSources.some(
      s => s.name_bn.toLowerCase() === trimmed.toLowerCase() || s.id.toLowerCase() === trimmed.toLowerCase()
    );
    if (isBuiltin || isCustom) {
      toast.error(bn ? 'এই উৎসটি ইতিমধ্যে তালিকায় রয়েছে' : 'Source already exists');
      return;
    }
    const newEntry = { id: trimmed, name_bn: trimmed, name_en: trimmed };
    await saveDepositSourcesMutation.mutateAsync([...customDepositSources, newEntry]);
    setSettingNewSourceInput('');
  };

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('institutions').select('*').order('created_at');
        if (error) {
          console.error('institutions query error:', error);
          return [];
        }
        return (data || []) as any[];
      } catch (err) {
        console.error('institutions exception:', err);
        return [];
      }
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
    const safeExpInsts = expenseInstitutions || [];
    const safeInsts = institutions || [];

    if (safeExpInsts.length > 0) {
      return safeExpInsts.map((ei: any) => {
        const instMatch = safeInsts.find((i: any) => i.id === ei.id || (i.name && (ei.name_bn || ei.name) && i.name.trim() === (ei.name_bn || ei.name).trim()));
        return {
          id: ei.id,
          name: ei.name || ei.name_bn || '',
          name_bn: ei.name_bn || ei.name || '',
          name_en: ei.name || ei.name_bn || '',
          address: (ei as any).address || instMatch?.address || '',
          phone: (ei as any).phone || instMatch?.phone || '',
          email: (ei as any).email || instMatch?.email || '',
          other_info: (ei as any).other_info || instMatch?.other_info || '',
          logo_url: (ei as any).logo_url || instMatch?.logo_url || '',
          is_default: instMatch?.is_default || false,
          source: 'expense_institutions'
        };
      });
    }
    return safeInsts.map((i: any) => ({
      id: i.id,
      name: i.name_en || i.name || '',
      name_bn: i.name || '',
      name_en: i.name_en || i.name || '',
      address: i.address || '',
      phone: i.phone || '',
      email: i.email || '',
      other_info: i.other_info || '',
      logo_url: i.logo_url || '',
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

  // Auto-align any salary/other expenses where payment date falls in this month but month_year was mismatched
  useEffect(() => {
    if (!selectedMonthYear || !allExpenses || allExpenses.length === 0) return;
    const parts = selectedMonthYear.split('-');
    const mIdx = MONTHS.indexOf(parts[0]) + 1;
    if (!mIdx || !parts[1]) return;
    const isoPrefix = `${parts[1]}-${String(mIdx).padStart(2, '0')}`;

    const mismatched = (allExpenses || []).filter((e: any) =>
      e.expense_date &&
      typeof e.expense_date === 'string' &&
      e.expense_date.startsWith(isoPrefix) &&
      e.month_year !== selectedMonthYear
    );

    if (mismatched.length > 0) {
      const ids = mismatched.map((m: any) => m.id);
      const builder = supabase.from('expenses');
      if (typeof (builder as any).update === 'function') {
        const updateBuilder = (builder as any).update({ month_year: selectedMonthYear });
        if (typeof updateBuilder.in === 'function') {
          updateBuilder.in('id', ids)
            .then(() => {
              qc.invalidateQueries({ queryKey: ['expenses', selectedMonthYear] });
              qc.invalidateQueries({ queryKey: ['all_expenses'] });
            })
            .catch((err: any) => console.error('Failed to align mismatched expense dates:', err));
        }
      }
    }
  }, [selectedMonthYear, allExpenses]);

  const selectedInstitution = (allInstitutions || []).find((i: any) => i.id === (selectedInstitutionId || selectedInstId)) || allInstitutions[0] || institutions[0];
  const instName = getInstName(selectedInstitution, true);
  const instNameEn = getInstName(selectedInstitution, false);
  const instAddress = selectedInstitution?.address || '';
  const instPhone = selectedInstitution?.phone || '';
  const instEmail = selectedInstitution?.email || '';
  const instOther = selectedInstitution?.other_info || '';
  const instLogo = selectedInstitution?.logo_url || '';

  // Stats
  const paidExpenses = useMemo(() => (expenses || []).filter((e: any) => !isUnpaidDue(e.description)), [expenses]);
  const monthlyTotalExpense = useMemo(() => paidExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0), [paidExpenses]);
  const monthlyTotalDeposit = useMemo(() => (deposits || []).reduce((s: number, d: any) => s + Number(d.amount || 0), 0), [deposits]);
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
    const prevPaid = (allExpenses || []).filter((e: any) => e.month_year === prevMonthKey && !isUnpaidDue(e.description));
    const prevExpSum = prevPaid.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const prevDeps = (allDeposits || []).filter((d: any) => d.month_year === prevMonthKey);
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

  const filteredExpenses = useMemo(() => (allExpenses || []).filter((e: any) => matchesFilter(e.month_year) && !isUnpaidDue(e.description)), [allExpenses, filterMode, selectedYear, selectedSessionId, academicSessions]);
  const filteredDeposits = useMemo(() => (allDeposits || []).filter((d: any) => matchesFilter(d.month_year)), [allDeposits, filterMode, selectedYear, selectedSessionId, academicSessions]);

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
    (filteredExpenses || []).forEach((e: any) => {
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
    (filteredExpenses || []).forEach((e: any) => {
      if (!e.category_id) return;
      if (!map[e.category_id]) {
        map[e.category_id] = { name: e.expense_categories?.name || '', name_bn: e.expense_categories?.name_bn || '', monthly: 0, total: 0 };
      }
      map[e.category_id].total += Number(e.amount || 0);
      if (e.month_year === selectedMonthYear) map[e.category_id].monthly += Number(e.amount || 0);
    });
    return Object.values(map);
  }, [filteredExpenses, selectedMonthYear]);

  // Mutations
  const addExpInst = useMutation({
    mutationFn: async () => {
      const nameBn = (expInstForm.name_bn || '').trim();
      const nameEn = (expInstForm.name || '').trim() || nameBn;
      if (!nameBn) {
        toast.error(bn ? 'প্রতিষ্ঠানের নাম লিখুন' : 'Please enter institution name');
        return;
      }

      let finalLogoUrl = expInstForm.logo_url || '';
      if (expInstLogoFile) {
        setExpInstLogoUploading(true);
        try {
          const fileExt = expInstLogoFile.name.split('.').pop() || 'png';
          const fileName = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('institution-logos')
            .upload(fileName, expInstLogoFile);
          if (uploadErr) {
            console.warn('Upload to institution-logos bucket failed, trying receipts bucket:', uploadErr);
            const { data: recData, error: recErr } = await supabase.storage
              .from('receipts')
              .upload(fileName, expInstLogoFile);
            if (recErr) throw uploadErr;
            const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(recData.path);
            finalLogoUrl = urlData.publicUrl;
          } else {
            const { data: urlData } = supabase.storage.from('institution-logos').getPublicUrl(uploadData.path);
            finalLogoUrl = urlData.publicUrl;
          }
        } finally {
          setExpInstLogoUploading(false);
        }
      }

      const expInstPayload = { name: nameEn, name_bn: nameBn };
      const instPayload = {
        name: nameBn,
        name_en: nameEn,
        address: expInstForm.address || null,
        phone: expInstForm.phone || null,
        email: expInstForm.email || null,
        other_info: expInstForm.other_info || null,
        logo_url: finalLogoUrl || null,
      };

      let targetId = editingExpInstId;

      if (editingExpInstId) {
        const { error } = await supabase.from('expense_institutions').update(expInstPayload).eq('id', editingExpInstId);
        if (error) {
          const { error: upsertErr } = await supabase.from('expense_institutions').upsert({ id: editingExpInstId, ...expInstPayload });
          if (upsertErr) throw upsertErr;
        }
        const { error: instErr } = await supabase.from('institutions').upsert({ id: editingExpInstId, ...instPayload });
        if (instErr) {
          await supabase.from('institutions').update(instPayload).eq('id', editingExpInstId);
        }
      } else {
        const { data: inserted, error: expInsertErr } = await supabase
          .from('expense_institutions')
          .insert(expInstPayload)
          .select('id')
          .single();
        if (expInsertErr) throw expInsertErr;

        targetId = inserted?.id;
        if (targetId) {
          await supabase.from('institutions').upsert({ id: targetId, ...instPayload });
        }
      }

      if (targetId) {
        try {
          await (supabase.from('expense_institutions') as any)
            .update({
              address: expInstForm.address || null,
              phone: expInstForm.phone || null,
              email: expInstForm.email || null,
              other_info: expInstForm.other_info || null,
              logo_url: finalLogoUrl || null,
            })
            .eq('id', targetId);
        } catch {
          // ignore if optional columns are not yet present in expense_institutions
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense_institutions'] });
      qc.invalidateQueries({ queryKey: ['institutions'] });
      setExpInstDialog(false);
      setExpInstForm(defaultExpInstForm);
      setExpInstLogoFile(null);
      setEditingExpInstId(null);
      toast.success(bn ? 'প্রতিষ্ঠানের তথ্য সংরক্ষিত হয়েছে' : 'Institution saved successfully');
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
      if (!expenseForm.institution_id || !expenseForm.category_id || !expenseForm.amount) {
        toast.error(bn ? 'প্রতিষ্ঠান, ক্যাটাগরি ও টাকা প্রদান করুন' : 'Institution, Category & Amount are required');
        throw new Error(bn ? 'প্রতিষ্ঠান, ক্যাটাগরি ও টাকা প্রদান করুন' : 'Institution, Category & Amount are required');
      }
      const parsedAmount = Number(bnToEnDigit(expenseForm.amount));
      const parsedQty = expenseForm.quantity ? Number(bnToEnDigit(expenseForm.quantity)) : 1;
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast.error(bn ? 'সঠিক টাকার পরিমাণ দিন' : 'Enter valid amount');
        throw new Error(bn ? 'সঠিক টাকার পরিমাণ দিন' : 'Enter valid amount');
      }
      if (isNaN(parsedQty) || parsedQty <= 0) {
        toast.error(bn ? 'সঠিক পরিমাণ দিন' : 'Enter valid quantity');
        throw new Error(bn ? 'সঠিক পরিমাণ দিন' : 'Enter valid quantity');
      }
      
      let receiptUrl = expenseForm.receipt_url || null;
      
      // Upload receipt file if exists
      if (receiptFile && expenseForm.has_receipt) {
        setUploading(true);
        try {
          const fileExt = receiptFile.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(fileName, receiptFile);
          if (uploadError) throw uploadError;
          receiptUrl = `receipts/${uploadData.path}`;
        } finally {
          setUploading(false);
        }
      }
      
      let descWithTags = (expenseForm.description || '').trim()
        .replace(/\[unit:.*?\]/g, '')
        .replace(/\[method:.*?\]/g, '')
        .replace(/\[memo:.*?\]/g, '')
        .replace(/\[remarks:.*?\]/g, '')
        .replace(/\[due:.*?\]/g, '')
        .trim();

      const unitVal = (expenseForm.quantity_unit || '').trim();
      if (unitVal && unitVal !== 'none' && unitVal !== 'কোনোটি নয় (ফাঁকা)') {
        descWithTags += `[unit:${unitVal}]`;
      } else {
        descWithTags += `[unit:none]`;
      }

      const rawMethod = (expenseForm.expense_method || '').trim() || 'ক্যাশ';
      const finalMethod = rawMethod.replace(/[\[\]]/g, '');
      if (finalMethod) descWithTags += `[method:${finalMethod}]`;
      if (expenseForm.memo_no && expenseForm.memo_no.trim()) descWithTags += `[memo:${expenseForm.memo_no.trim()}]`;
      if (expenseForm.remarks && expenseForm.remarks.trim()) descWithTags += `[remarks:${expenseForm.remarks.trim()}]`;
      if (expenseForm.is_due) descWithTags += `[due:unpaid]`;

      const oldExpense = editingExpenseId 
        ? (allExpenses || expenses || []).find((e: any) => e.id === editingExpenseId) 
        : null;

      // Preserve special system tags if editing
      if (oldExpense?.description) {
        if (oldExpense.description.includes('[salary_bulk_total]') && !descWithTags.includes('[salary_bulk_total]')) {
          descWithTags += ' [salary_bulk_total]';
        }
        const mMatch = oldExpense.description.match(/\[salary_month:.*?\]/);
        if (mMatch && !descWithTags.includes('[salary_month:')) {
          descWithTags += ` ${mMatch[0]}`;
        }
        const sMatch = oldExpense.description.match(/\[staff_id:.*?\]/);
        if (sMatch && !descWithTags.includes('[staff_id:')) {
          descWithTags += ` ${sMatch[0]}`;
        }
      }

      // Compute month_year intelligently
      const expDate = new Date(expenseForm.expense_date);
      const computedMonthYear = !isNaN(expDate.getTime())
        ? `${MONTHS[expDate.getMonth()]}-${expDate.getFullYear()}`
        : selectedMonthYear;

      const finalMonthYear = oldExpense?.month_year && oldExpense.expense_date === expenseForm.expense_date
        ? oldExpense.month_year
        : computedMonthYear;
      
      const payload = {
        month_year: finalMonthYear,
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

        const instName = allInstitutions.find(i => i.id === (expenseForm.institution_id || oldExpense?.institution_id))?.name || '';
        const catName = categories.find(c => c.id === (expenseForm.category_id || oldExpense?.category_id))?.name || '';

        await logAccountsAudit({
          action: 'expense_update',
          entity_type: 'expense',
          entity_id: editingExpenseId,
          title: payload.description || oldExpense?.description || 'Expense',
          amount: parsedAmount,
          month_year: payload.month_year,
          institution_name: instName,
          category_name: catName,
          expense_method: expenseForm.expense_method,
          quantity: parsedQty,
          memo_no: expenseForm.memo_no,
          recipient_or_by: expenseForm.expense_method,
          old_data: oldExpense ? {
            amount: oldExpense.amount,
            description: oldExpense.description,
            expense_date: oldExpense.expense_date,
            month_year: oldExpense.month_year,
          } : null,
          new_data: {
            amount: parsedAmount,
            description: payload.description,
            expense_date: payload.expense_date,
            month_year: payload.month_year,
          },
          user_id: user?.id,
          user_name: user?.user_metadata?.full_name || user?.email,
          user_email: user?.email,
          user_role: role,
        });
      } else {
        const { data: insertedExpense, error } = await supabase.from('expenses').insert(payload).select('id').single();
        if (error) throw error;

        const instName = allInstitutions.find(i => i.id === expenseForm.institution_id)?.name || '';
        const catName = categories.find(c => c.id === expenseForm.category_id)?.name || '';

        await logAccountsAudit({
          action: 'expense_create',
          entity_type: 'expense',
          entity_id: insertedExpense?.id,
          title: payload.description,
          amount: parsedAmount,
          month_year: payload.month_year,
          institution_name: instName,
          category_name: catName,
          expense_method: expenseForm.expense_method,
          quantity: parsedQty,
          memo_no: expenseForm.memo_no,
          recipient_or_by: expenseForm.expense_method,
          new_data: {
            amount: parsedAmount,
            description: payload.description,
            expense_date: payload.expense_date,
            month_year: payload.month_year,
          },
          user_id: user?.id,
          user_name: user?.user_metadata?.full_name || user?.email,
          user_email: user?.email,
          user_role: role,
        });

        // Inventory integration: update stock, total_purchased, and create rich log
        if (expenseForm.add_to_inventory && expenseForm.inventory_item_id && insertedExpense) {
          try {
            const { data: currentItem } = await supabase
              .from('inventory_items')
              .select('current_stock, total_purchased, buying_price')
              .eq('id', expenseForm.inventory_item_id)
              .single();

            const curStock = Number(currentItem?.current_stock || 0);
            const curPurchased = Number(currentItem?.total_purchased ?? currentItem?.current_stock ?? 0);
            const newStock = curStock + parsedQty;
            const newPurchased = curPurchased + parsedQty;
            const unitPrice = parsedQty > 0 ? (parsedAmount / parsedQty) : Number(currentItem?.buying_price || 0);

            // Attempt RPC increment first
            const { error: stockError } = await supabase.rpc('increment_inventory_stock' as any, {
              p_item_id: expenseForm.inventory_item_id,
              p_amount: parsedQty
            });

            // Sync total_purchased and fallback stock update if RPC had issues
            const updatePayload: Record<string, any> = {
              total_purchased: newPurchased,
            };
            if (unitPrice > 0) {
              updatePayload.buying_price = Math.round(unitPrice * 100) / 100;
            }
            if (stockError || !currentItem) {
              updatePayload.current_stock = newStock;
            }
            await supabase.from('inventory_items').update(updatePayload).eq('id', expenseForm.inventory_item_id);

            // Insert detailed inventory log
            await supabase.from('inventory_logs').insert({
              item_id: expenseForm.inventory_item_id,
              type: 'in',
              change_amount: parsedQty,
              project_name: payload.description || 'খরচ এন্ট্রি হতে ক্রয়',
              unit_price: unitPrice > 0 ? Math.round(unitPrice * 100) / 100 : 0,
              total_price: parsedAmount,
              recipient: payload.vendor_name || expenseForm.expense_method || 'হিসাব শাখা',
              reason: `খরচ এন্ট্রি হতে ক্রয় (ভাউচার #${insertedExpense.voucher_no || insertedExpense.id?.slice(0, 8)})`,
              expense_id: insertedExpense.id,
            });
          } catch (invErr) {
            console.warn('Inventory log error:', invErr);
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['all_expenses'] });
      qc.invalidateQueries({ queryKey: ['accounts-audit-logs'] });
      qc.invalidateQueries({ queryKey: ['inventory-items-for-expense'] });
      qc.invalidateQueries({ queryKey: ['inventory-items'] });
      qc.invalidateQueries({ queryKey: ['inventory-logs'] });
      
      const isEdit = !!editingExpenseId;
      const keepInstitutionId = expenseForm.institution_id || '';
      const keepCategoryId = expenseForm.category_id || '';
      
      setExpenseForm({ ...defaultExpenseForm, institution_id: keepInstitutionId, category_id: keepCategoryId });
      setReceiptFile(null);
      setEditingExpenseId(null);
      setIsCustomUnitActive(false);
      setCustomUnitText('');
      
      if (isEdit) {
        setExpenseDialog(false);
        toast.success(bn ? 'হিসাব সফলভাবে আপডেট করা হয়েছে' : 'Expense updated successfully');
      } else {
        toast.success(bn ? 'সংরক্ষিত! নতুন এন্ট্রি দিন' : 'Saved! Add new entry');
      }
    },
    onError: (err: any) => {
      console.error('Expense add/edit error:', err);
      toast.error(err?.message || (bn ? 'সংরক্ষণে ত্রুটি হয়েছে' : 'Error saving expense'));
    }
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

      await logAccountsAudit({
        action: 'expense_pay_due',
        entity_type: 'expense',
        entity_id: payDueExpense.id,
        title: `বকেয়া পরিশোধ - ${cleanDesc(originalDesc)}`,
        amount: Number(payDueExpense.amount),
        month_year: pMonthYear,
        expense_method: finalMethod,
        memo_no: payDueForm.memo_no,
        recipient_or_by: payDueForm.remarks,
        user_id: user?.id,
        user_name: user?.user_metadata?.full_name || user?.email,
        user_email: user?.email,
        user_role: role,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['all_expenses'] });
      qc.invalidateQueries({ queryKey: ['accounts-audit-logs'] });
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
      const parsedAmount = Number(bnToEnDigit(depositForm.amount));
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast.error(bn ? 'সঠিক টাকার পরিমাণ প্রদান করুন' : 'Enter a valid amount');
        return;
      }
      if (!depositForm.deposit_date) {
        toast.error(bn ? 'তারিখ নির্বাচন করুন' : 'Select date');
        return;
      }

      // Calculate month_year based on deposit_date or fallback to selectedMonthYear
      let depositMonthYear = selectedMonthYear;
      if (depositForm.deposit_date) {
        const d = new Date(depositForm.deposit_date);
        if (!isNaN(d.getTime())) {
          depositMonthYear = `${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
        }
      }

      const finalSource = depositForm.source || 'manual';

      const payload = {
        month_year: depositMonthYear,
        deposit_date: depositForm.deposit_date,
        bank_details: depositForm.bank_details || null,
        other_details: depositForm.other_details || null,
        amount: parsedAmount,
        source: finalSource
      };
      if (editingDepositId) {
        const oldDep = (deposits || []).find((d: any) => d.id === editingDepositId);
        const { error } = await supabase.from('deposits').update(payload).eq('id', editingDepositId);
        if (error) throw error;

        await logAccountsAudit({
          action: 'deposit_update',
          entity_type: 'deposit',
          entity_id: editingDepositId,
          title: payload.source || 'Deposit',
          amount: payload.amount,
          month_year: payload.month_year,
          old_data: oldDep ? { amount: oldDep.amount, source: oldDep.source, deposit_date: oldDep.deposit_date, bank_details: oldDep.bank_details, other_details: oldDep.other_details } : null,
          new_data: { amount: payload.amount, source: payload.source, deposit_date: payload.deposit_date, bank_details: payload.bank_details, other_details: payload.other_details },
          user_id: user?.id,
          user_name: user?.user_metadata?.full_name || user?.email,
          user_email: user?.email,
          user_role: role,
        });
      } else {
        const { error } = await supabase.from('deposits').insert(payload);
        if (error) throw error;

        await logAccountsAudit({
          action: 'deposit_create',
          entity_type: 'deposit',
          title: payload.source || 'Deposit',
          amount: payload.amount,
          month_year: payload.month_year,
          new_data: { amount: payload.amount, source: payload.source, deposit_date: payload.deposit_date, bank_details: payload.bank_details, other_details: payload.other_details },
          user_id: user?.id,
          user_name: user?.user_metadata?.full_name || user?.email,
          user_email: user?.email,
          user_role: role,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deposits'] });
      qc.invalidateQueries({ queryKey: ['all_deposits'] });
      qc.invalidateQueries({ queryKey: ['accounts-audit-logs'] });
      setDepositForm(defaultDepositForm);
      setEditingDepositId(null);
      setIsAddingNewSource(false);
      setNewSourceInput('');
      setDepositDialog(false);
      toast.success(bn ? 'টাকা আয়/উত্তোলন সফলভাবে সংরক্ষিত হয়েছে' : 'Deposit saved successfully');
    },
    onError: (err: any) => {
      console.error('Failed to save deposit:', err);
      toast.error(err?.message || (bn ? 'ত্রুটি হয়েছে' : 'Error occurred'));
    }
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const oldExpense = (allExpenses || expenses || []).find((e: any) => e.id === id);
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;

      await logAccountsAudit({
        action: 'expense_delete',
        entity_type: 'expense',
        entity_id: id,
        title: oldExpense?.description || 'Expense',
        amount: oldExpense?.amount ? Number(oldExpense.amount) : undefined,
        month_year: oldExpense?.month_year,
        old_data: oldExpense ? {
          amount: oldExpense.amount,
          description: oldExpense.description,
          expense_date: oldExpense.expense_date,
          month_year: oldExpense.month_year,
        } : null,
        user_id: user?.id,
        user_name: user?.user_metadata?.full_name || user?.email,
        user_email: user?.email,
        user_role: role,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['all_expenses'] });
      qc.invalidateQueries({ queryKey: ['accounts-audit-logs'] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    }
  });

  const deleteDeposit = useMutation({
    mutationFn: async (id: string) => {
      const oldDep = (deposits || []).find((d: any) => d.id === id);
      const { error } = await supabase.from('deposits').delete().eq('id', id);
      if (error) throw error;

      await logAccountsAudit({
        action: 'deposit_delete',
        entity_type: 'deposit',
        entity_id: id,
        title: oldDep?.source || 'Deposit',
        amount: oldDep?.amount ? Number(oldDep.amount) : undefined,
        month_year: oldDep?.month_year,
        old_data: oldDep ? { amount: oldDep.amount, source: oldDep.source, deposit_date: oldDep.deposit_date } : null,
        user_id: user?.id,
        user_name: user?.user_metadata?.full_name || user?.email,
        user_email: user?.email,
        user_role: role,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deposits'] });
      qc.invalidateQueries({ queryKey: ['all_deposits'] });
      qc.invalidateQueries({ queryKey: ['accounts-audit-logs'] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    }
  });

  const saveSummary = useMutation({
    mutationFn: async () => {
      const payload = {
        month_year: selectedMonthYear,
        total_expense: monthlyTotalExpense,
        total_deposit: monthlyTotalDeposit,
        previous_arrears: Number(bnToEnDigit(summaryForm.previous_arrears || '0')) || 0,
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
    const safeCats = categories || [];
    if (!instId || instId === 'all') return safeCats;
    const matched = safeCats.filter((c: any) => c.institution_id === instId);
    if (matched.length > 0) {
      const globals = safeCats.filter((c: any) => !c.institution_id);
      return [...matched, ...globals];
    }
    return safeCats;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    return getCategoriesForInst(expenseForm.institution_id);
  }, [expenseForm.institution_id, getCategoriesForInst]);

  const selectedExpenseProject = (allInstitutions || []).find((p: any) => p.id === expenseForm.institution_id);
  const selectedExpenseCategory = (categories || []).find((c: any) => c.id === expenseForm.category_id);

  // Load summary defaults
  useEffect(() => {
    setSummaryForm(f => ({
      ...f,
      principal_name: summaryData?.principal_name ?? (f.principal_name || headOfInstitute?.person_name_bn || ''),
      casher_name: summaryData?.casher_name ?? (f.casher_name || accountantCashier?.person_name_bn || ''),
      previous_arrears: String(summaryData?.previous_arrears ?? (f.previous_arrears || '0')),
    }));
  }, [summaryData, headOfInstitute, accountantCashier]);

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

  const selectedInst = (allInstitutions || []).find((p: any) => p.id === selectedInstId) || allInstitutions[0];
  const instCategories = useMemo(() => {
    return getCategoriesForInst(selectedInstId);
  }, [getCategoriesForInst, selectedInstId]);

  // Institution monthly cash and dues
  const getInstMonthly = (pid: string) => (expenses || []).filter((e: any) => e.institution_id === pid && !isUnpaidDue(e.description)).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const getInstDueTotal = (pid: string) => (allExpenses || []).filter((e: any) => e.institution_id === pid && isUnpaidDue(e.description)).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const getInstTotal = (pid: string) => (allExpenses || []).filter((e: any) => e.institution_id === pid && !isUnpaidDue(e.description)).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const getCategoryMonthly = (cid: string) => (expenses || []).filter((e: any) => e.category_id === cid && !isUnpaidDue(e.description)).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const getCategoryTotal = (cid: string) => (allExpenses || []).filter((e: any) => e.category_id === cid && !isUnpaidDue(e.description)).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

  const handlePrint = () => window.print();
  const formatNum = (n: any) => {
    const num = Number(n ?? 0);
    if (isNaN(num)) return bn ? '০' : '0';
    const formatted = num.toLocaleString('en-US');
    return bn ? toBnDigits(formatted) : formatted;
  };

  // Annual Financial Summary PDF (Income / Expense / Net Balance per month)
  const handleAnnualFinancialPDF = () => {
    const yearStr = String(selectedYear);
    const isAll = !selectedInstId || selectedInstId === 'all';
    const targetInst = isAll
      ? (institutions.find((i: any) => i.is_default) || allInstitutions[0])
      : (allInstitutions.find((p: any) => p.id === selectedInstId) || allInstitutions[0]);

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
        .filter((e: any) => e.month_year === monthKey && (isAll || e.institution_id === targetInst?.id))
        .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      return { monthIdx: i, income, expense, profit: income - expense };
    });

    const totalIncome = monthlyRows.reduce((s, r) => s + r.income, 0);
    const totalExpense = monthlyRows.reduce((s, r) => s + r.expense, 0);
    const totalDonation = annualDonors.reduce((s: number, d: any) => s + Number(d.donation_amount || 0), 0);

    generateBilingualReport(
      {
        institution_name: isAll ? (bn ? 'সকল প্রতিষ্ঠান (সমন্বিত হিসাব)' : 'All Institutions (Consolidated)') : getInstName(targetInst, true),
        institution_name_en: isAll ? 'All Institutions (Consolidated)' : getInstName(targetInst, false),
        address: targetInst?.address || '',
        phone: targetInst?.phone || '',
        email: targetInst?.email || '',
        logo_url: targetInst?.logo_url,
        report_title_bn: isAll ? 'সকল প্রতিষ্ঠানের বার্ষিক আর্থিক সারসংক্ষেপ' : `${getInstName(targetInst, true)} - বার্ষিক আর্থিক সারসংক্ষেপ`,
        report_title_en: isAll ? 'All Institutions Annual Financial Summary' : `${getInstName(targetInst, false)} - Annual Financial Summary`,
        period_label_bn: `সাল: ${bn ? toBnDigits(yearStr) : yearStr}`,
        period_label_en: `Year: ${yearStr}`,
        bengali_digits: bn,
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
        { label_bn: 'মোট আয়', label_en: 'Income', value: '৳' + formatNum(totalIncome), tone: 'positive' },
        { label_bn: 'মোট ব্যয়', label_en: 'Expense', value: '৳' + formatNum(totalExpense), tone: 'negative' },
        { label_bn: 'নেট ব্যালেন্স', label_en: 'Net Balance', value: '৳' + formatNum(totalIncome - totalExpense), tone: totalIncome >= totalExpense ? 'positive' : 'negative' },
        { label_bn: 'অনুদান', label_en: 'Donations', value: '৳' + formatNum(totalDonation), tone: 'accent' },
      ],
    );
  };

  // Get selected month display name
  const selectedMonthIndex = MONTHS.indexOf(selectedMonthYear.split('-')[0]);
  const selectedMonthYearStr = selectedMonthYear.split('-')[1];
  const selectedMonthName = bn 
    ? `${MONTHS_BN[selectedMonthIndex]} ${toBnDigits(selectedMonthYearStr)}` 
    : `${MONTHS[selectedMonthIndex]} ${selectedMonthYearStr}`;

  const openEditExpense = (e: any) => {
    setEditingExpenseId(e.id);
    const cat = categories.find((c: any) => c.id === e.category_id);
    const unit = getUnit(e.description, cat?.name || cat?.name_bn);
    const method = getMethod(e.description);
    const memo = getMemo(e.description);
    const rem = getRemarks(e.description);

    const isStandard = DEFAULT_QUANTITY_UNITS.includes(unit) || unit === '';
    if (!isStandard && unit) {
      setIsCustomUnitActive(true);
      setCustomUnitText(unit);
    } else {
      setIsCustomUnitActive(false);
      setCustomUnitText('');
    }

    setExpenseForm({
      institution_id: e.institution_id,
      category_id: e.category_id,
      expense_date: e.expense_date,
      description: cleanDesc(e.description) === '-' ? '' : cleanDesc(e.description),
      quantity: String(e.quantity || 1),
      quantity_unit: unit || 'none',
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
    setIsAddingNewSource(false);
    setNewSourceInput('');
    setDepositDialog(true);
  };
  const openEditExpInst = (p: any) => {
    setEditingExpInstId(p.id);
    setExpInstForm({
      name: p.name || p.name_en || '',
      name_bn: p.name_bn || p.name || '',
      address: p.address || '',
      phone: p.phone || '',
      email: p.email || '',
      other_info: p.other_info || '',
      logo_url: p.logo_url || ''
    });
    setExpInstLogoFile(null);
    setExpInstDialog(true);
  };

  // Comprehensive Bilingual PDF Export (Supports All Institutions or Specific Institution)
  const handleExpensesPDF = (instId?: string | null) => {
    const isAll = !instId || instId === 'all';
    const defaultInst = institutions.find((i: any) => i.is_default) || allInstitutions[0];

    if (isAll) {
      // 1. ALL INSTITUTIONS CONSOLIDATED REPORT
      const paidAllExpenses = expenses.filter((e: any) => !isUnpaidDue(e.description));
      const allDues = allExpenses.filter((e: any) => isUnpaidDue(e.description));
      const totalExp = paidAllExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const totalDep = deposits.reduce((s: number, d: any) => s + Number(d.amount || 0), 0);
      const totalDue = allDues.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const cash = totalDep - totalExp - previousArrears;

      // Institution summary rows
      const instSummaryRows = allInstitutions.map((inst: any) => {
        const instExp = expenses.filter((e: any) => e.institution_id === inst.id && !isUnpaidDue(e.description));
        const instDue = allExpenses.filter((e: any) => e.institution_id === inst.id && isUnpaidDue(e.description));
        const instExpTotal = instExp.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
        const instDueTotal = instDue.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
        const pct = totalExp > 0 ? ((instExpTotal / totalExp) * 100).toFixed(1) + '%' : '0%';
        return [
          getInstName(inst, bn),
          instExp.length,
          instExpTotal,
          instDueTotal,
          pct
        ];
      });

      const sections: any[] = [
        {
          title_bn: 'প্রতিষ্ঠানভিত্তিক সারসংক্ষেপ',
          title_en: 'Institution Breakdown Summary',
          headers: [
            { bn: 'প্রতিষ্ঠানের নাম', en: 'Institution' },
            { bn: 'মোট এন্ট্রি', en: 'Entries' },
            { bn: 'মোট খরচ (৳)', en: 'Total Expense (৳)' },
            { bn: 'বকেয়া (৳)', en: 'Dues (৳)' },
            { bn: 'অংশ', en: 'Share' }
          ],
          rows: instSummaryRows,
          totals: [
            { bn: 'সর্বমোট খরচ', en: 'Grand Total Expense', value: totalExp },
            { bn: 'সর্বমোট বকেয়া', en: 'Grand Total Dues', value: totalDue }
          ],
          pageBreakAfter: true,
        }
      ];

      // For each institution, create category-wise sections with pageBreakAfter (matching Excel tabs)
      allInstitutions.forEach((inst: any) => {
        const instExp = paidAllExpenses.filter((e: any) => e.institution_id === inst.id);
        const instDue = allDues.filter((e: any) => e.institution_id === inst.id);

        // Find categories for this institution exactly like Excel export
        const instSpecificCats = (categories || []).filter((c: any) => c.institution_id === inst.id);
        const targetCats = instSpecificCats.length > 0 ? instSpecificCats : getCategoriesForInst(inst.id);
        const catsWithExpenses = (categories || []).filter((c: any) => instExp.some((e: any) => e.category_id === c.id));
        const seenCatIds = new Set<string>();
        const finalCats: any[] = [];
        [...targetCats, ...catsWithExpenses].forEach((c: any) => {
          if (c && !seenCatIds.has(c.id)) {
            seenCatIds.add(c.id);
            finalCats.push(c);
          }
        });

        finalCats.forEach((cat: any) => {
          const catExp = instExp.filter((e: any) => e.category_id === cat.id);
          const catTot = catExp.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

          sections.push({
            title_bn: `${getInstName(inst, true)} — ${getCatName(cat, true)}`,
            title_en: `${getInstName(inst, false)} — ${getCatName(cat, false)}`,
            headers: [
              { bn: 'ক্রম', en: 'SL' },
              { bn: 'তারিখ', en: 'Date' },
              { bn: 'বিবরণ', en: 'Description' },
              { bn: 'পরিমাণ', en: 'Qty' },
              { bn: 'মাধ্যম', en: 'Method' },
              { bn: 'মেমো/রশিদ', en: 'Memo/Receipt' },
              { bn: 'টাকা (৳)', en: 'Amount (৳)' },
            ],
            rows: catExp.length === 0 ? [
              ['-', '-', bn ? 'কোনো ব্যয়ের রেকর্ড নেই' : 'No expenses', '-', '-', '-', 0]
            ] : catExp.map((e: any, idx: number) => {
              const unit = getUnit(e.description, cat?.name || cat?.name_bn);
              const qtyStr = e.quantity ? `${bn ? toBnDigits(e.quantity) : e.quantity} ${unit || ''}`.trim() : (bn ? '১' : '1');
              return [
                bn ? toBnDigits(idx + 1) : idx + 1,
                formatDateBn(e.expense_date, bn),
                cleanDesc(e.description) || '-',
                qtyStr,
                getMethod(e.description, bn),
                getMemo(e.description, bn) === '-' ? '' : getMemo(e.description, bn),
                Number(e.amount || 0)
              ];
            }),
            totals: [
              { bn: `“${getCatName(cat, true)}” মোট ব্যয়`, en: `Total for ${getCatName(cat, false)}`, value: catTot }
            ],
            pageBreakAfter: true,
          });
        });

        // Uncategorized expenses
        const uncatExp = instExp.filter((e: any) => !e.category_id || !finalCats.some((c: any) => c.id === e.category_id));
        if (uncatExp.length > 0) {
          const uncatTot = uncatExp.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
          sections.push({
            title_bn: `${getInstName(inst, true)} — সাধারণ / অন্যান্য ব্যয়`,
            title_en: `${getInstName(inst, false)} — Other Expenses`,
            headers: [
              { bn: 'ক্রম', en: 'SL' },
              { bn: 'তারিখ', en: 'Date' },
              { bn: 'বিবরণ', en: 'Description' },
              { bn: 'পরিমাণ', en: 'Qty' },
              { bn: 'মাধ্যম', en: 'Method' },
              { bn: 'মেমো/রশিদ', en: 'Memo/Receipt' },
              { bn: 'টাকা (৳)', en: 'Amount (৳)' },
            ],
            rows: uncatExp.map((e: any, idx: number) => [
              bn ? toBnDigits(idx + 1) : idx + 1,
              formatDateBn(e.expense_date, bn),
              cleanDesc(e.description) || '-',
              bn ? toBnDigits(e.quantity || 1) : (e.quantity || 1),
              getMethod(e.description, bn),
              getMemo(e.description, bn) === '-' ? '' : getMemo(e.description, bn),
              Number(e.amount || 0)
            ]),
            totals: [
              { bn: 'অন্যান্য মোট ব্যয়', en: 'Total Other Expense', value: uncatTot }
            ],
            pageBreakAfter: true,
          });
        }

        // Dues section: ALWAYS include for institution (matching Excel dues sheet)
        const instDueTotal = instDue.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
        sections.push({
          title_bn: `${getInstName(inst, true)} — বকেয়া খরচের হিসাব`,
          title_en: `${getInstName(inst, false)} — Outstanding Dues`,
          headers: [
            { bn: 'ক্রম', en: 'SL' },
            { bn: 'তারিখ', en: 'Date' },
            { bn: 'বিবরণ ও পাওনাদার', en: 'Description & Vendor' },
            { bn: 'পরিমাণ', en: 'Qty' },
            { bn: 'মেমো/চালান', en: 'Memo/Invoice' },
            { bn: 'বকেয়া টাকা (৳)', en: 'Due Amount (৳)' }
          ],
          rows: instDue.length === 0 ? [
            ['-', '-', bn ? 'কোনো বকেয়া নেই' : 'No dues', '-', '-', 0]
          ] : instDue.map((d: any, idx: number) => [
            bn ? toBnDigits(idx + 1) : idx + 1,
            formatDateBn(d.expense_date, bn),
            cleanDesc(d.description) || '-',
            bn ? toBnDigits(d.quantity || 1) : (d.quantity || 1),
            getMemo(d.description, bn) === '-' ? '' : getMemo(d.description, bn),
            Number(d.amount || 0)
          ]),
          totals: [
            { bn: 'মোট বকেয়া', en: 'Total Dues', value: instDueTotal }
          ],
          pageBreakAfter: true,
        });
      });

      // Dedicated Bank & Deposit Statement Section (matching Excel 'টাকা আয়-উত্তোলন')
      sections.push({
        title_bn: 'টাকা আয়/উত্তোলন ও ব্যাংক হিসাব বিবরণী',
        title_en: 'Deposit, Income & Bank Account Statement',
        headers: [
          { bn: 'ক্রম', en: 'SL' },
          { bn: 'তারিখ', en: 'Date' },
          { bn: 'ব্যাংক বিবরণ', en: 'Bank Details' },
          { bn: 'অন্যান্য বিবরণ', en: 'Other Details' },
          { bn: 'উৎস', en: 'Source' },
          { bn: 'টাকা (৳)', en: 'Amount (৳)' }
        ],
        rows: deposits.length === 0 ? [
          ['-', '-', bn ? 'কোনো ব্যাংক জমা বা উত্তোলনের রেকর্ড নেই' : 'No deposit records', '-', '-', 0]
        ] : deposits.map((d: any, idx: number) => [
          bn ? toBnDigits(idx + 1) : idx + 1,
          formatDateBn(d.deposit_date, bn),
          d.bank_details || '-',
          d.other_details || '-',
          getSourceLabel(d.source, bn, customDepositSources),
          Number(d.amount || 0)
        ]),
        totals: [
          { bn: 'মোট টাকা আয় / উত্তোলন', en: 'Total Deposit', value: totalDep },
          { bn: 'অবশিষ্ট নগদ তহবিল (জের)', en: 'Closing Cash Balance', value: cash >= 0 ? cash : 0 }
        ],
        pageBreakAfter: true,
      });

      generateBilingualReport(
        {
          institution_name: 'সকল প্রতিষ্ঠান (সমন্বিত হিসাব)',
          institution_name_en: 'All Institutions (Consolidated)',
          address: defaultInst?.address || '',
          phone: defaultInst?.phone || '',
          email: defaultInst?.email || '',
          logo_url: defaultInst?.logo_url,
          report_title_bn: 'সকল প্রতিষ্ঠানের মাসিক সমন্বিত হিসাব বিবরণী',
          report_title_en: 'All Institutions Consolidated Monthly Expense Statement',
          period_label_bn: `মাস: ${selectedMonthName}`,
          period_label_en: `Period: ${selectedMonthName}`,
          bengali_digits: bn,
        },
        sections,
        [
          { label_bn: 'মোট খরচ', label_en: 'Total Expense', value: '৳' + formatNum(totalExp), tone: 'negative' },
          { label_bn: 'মোট জমা/উত্তোলন', label_en: 'Total Deposit', value: '৳' + formatNum(totalDep), tone: 'positive' },
          { label_bn: 'নগদ উদ্বৃত্ত', label_en: 'Cash Balance', value: '৳' + formatNum(cash >= 0 ? cash : 0), tone: cash >= 0 ? 'positive' : 'negative' },
          { label_bn: 'মোট বকেয়া', label_en: 'Total Dues', value: '৳' + formatNum(totalDue), tone: 'accent' }
        ]
      );
    } else {
      // 2. SPECIFIC INSTITUTION DEDICATED REPORT
      const targetInst = allInstitutions.find((p: any) => p.id === instId);
      if (!targetInst) return;

      const instPaid = expenses.filter((e: any) => e.institution_id === targetInst.id && !isUnpaidDue(e.description));
      const instDues = allExpenses.filter((e: any) => e.institution_id === targetInst.id && isUnpaidDue(e.description));
      const totalExp = instPaid.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const totalDue = instDues.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const totalDep = deposits.reduce((s: number, d: any) => s + Number(d.amount || 0), 0);
      const cash = totalDep - totalExp - previousArrears;

      const instSpecificCats = (categories || []).filter((c: any) => c.institution_id === targetInst.id);
      const targetCats = instSpecificCats.length > 0 ? instSpecificCats : getCategoriesForInst(targetInst.id);
      const catsWithExpenses = (categories || []).filter((c: any) => instPaid.some((e: any) => e.category_id === c.id));
      const seenCatIds = new Set<string>();
      const finalCats: any[] = [];
      [...targetCats, ...catsWithExpenses].forEach((c: any) => {
        if (c && !seenCatIds.has(c.id)) {
          seenCatIds.add(c.id);
          finalCats.push(c);
        }
      });

      const sections: any[] = [];

      finalCats.forEach((cat: any) => {
        const catExpenses = instPaid.filter((e: any) => e.category_id === cat.id);
        const catTot = catExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

        sections.push({
          title_bn: `${getCatName(cat, true)} (ব্যয় বিবরণী)`,
          title_en: `${getCatName(cat, false)} (Expense Statement)`,
          headers: [
            { bn: 'ক্রম', en: 'SL' },
            { bn: 'তারিখ', en: 'Date' },
            { bn: 'বিবরণ', en: 'Description' },
            { bn: 'পরিমাণ', en: 'Qty' },
            { bn: 'ভাউচার/মেমো', en: 'Memo/Voucher' },
            { bn: 'মাধ্যম', en: 'Method' },
            { bn: 'টাকা (৳)', en: 'Amount (৳)' }
          ],
          rows: catExpenses.length === 0 ? [
            ['-', '-', bn ? 'কোনো ব্যয়ের রেকর্ড নেই' : 'No expenses', '-', '-', '-', 0]
          ] : catExpenses.map((e: any, idx: number) => {
            const unit = getUnit(e.description, cat?.name || cat?.name_bn);
            const qtyStr = e.quantity ? `${bn ? toBnDigits(e.quantity) : e.quantity} ${unit || ''}`.trim() : (bn ? '১' : '1');
            const memo = getMemo(e.description, bn);
            return [
              bn ? toBnDigits(idx + 1) : idx + 1,
              formatDateBn(e.expense_date, bn),
              cleanDesc(e.description) || '-',
              qtyStr,
              memo === '-' ? '' : memo,
              getMethod(e.description, bn),
              Number(e.amount || 0)
            ];
          }),
          totals: [
            { bn: `“${getCatName(cat, true)}” মোট ব্যয়`, en: `Total for ${getCatName(cat, false)}`, value: catTot }
          ],
          pageBreakAfter: true,
        });
      });

      // Uncategorized expenses
      const uncatExp = instPaid.filter((e: any) => !e.category_id || !finalCats.some((c: any) => c.id === e.category_id));
      if (uncatExp.length > 0) {
        const uncatTot = uncatExp.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
        sections.push({
          title_bn: 'সাধারণ / অন্যান্য ব্যয়',
          title_en: 'Other Expenses',
          headers: [
            { bn: 'ক্রম', en: 'SL' },
            { bn: 'তারিখ', en: 'Date' },
            { bn: 'বিবরণ', en: 'Description' },
            { bn: 'পরিমাণ', en: 'Qty' },
            { bn: 'ভাউচার/মেমো', en: 'Memo/Voucher' },
            { bn: 'মাধ্যম', en: 'Method' },
            { bn: 'টাকা (৳)', en: 'Amount (৳)' }
          ],
          rows: uncatExp.map((e: any, idx: number) => [
            bn ? toBnDigits(idx + 1) : idx + 1,
            formatDateBn(e.expense_date, bn),
            cleanDesc(e.description) || '-',
            bn ? toBnDigits(e.quantity || 1) : (e.quantity || 1),
            getMemo(e.description, bn) === '-' ? '' : getMemo(e.description, bn),
            getMethod(e.description, bn),
            Number(e.amount || 0)
          ]),
          totals: [
            { bn: 'অন্যান্য মোট ব্যয়', en: 'Total Other Expense', value: uncatTot }
          ],
          pageBreakAfter: true,
        });
      }

      // Dues section (ALWAYS included, even if 0)
      sections.push({
        title_bn: 'বকেয়া হিসাব বিবরণী (পরিশোধ বাকি)',
        title_en: 'Outstanding Dues Statement',
        headers: [
          { bn: 'ক্রম', en: 'SL' },
          { bn: 'তারিখ', en: 'Date' },
          { bn: 'বিবরণ', en: 'Description' },
          { bn: 'পরিমাণ', en: 'Qty' },
          { bn: 'বকেয়া টাকা (৳)', en: 'Due Amount (৳)' }
        ],
        rows: instDues.length === 0 ? [
          ['-', '-', bn ? 'কোনো বকেয়া নেই' : 'No dues', '-', 0]
        ] : instDues.map((d: any, idx: number) => [
          bn ? toBnDigits(idx + 1) : idx + 1,
          formatDateBn(d.expense_date, bn),
          cleanDesc(d.description) || '-',
          bn ? toBnDigits(d.quantity || 1) : (d.quantity || 1),
          Number(d.amount || 0)
        ]),
        totals: [
          { bn: 'মোট বকেয়া', en: 'Total Dues', value: totalDue }
        ],
        pageBreakAfter: true,
      });

      // Bank deposit & fund statement section
      sections.push({
        title_bn: 'টাকা আয়/উত্তোলন ও ব্যাংক হিসাব বিবরণী',
        title_en: 'Deposit, Income & Bank Account Statement',
        headers: [
          { bn: 'ক্রম', en: 'SL' },
          { bn: 'তারিখ', en: 'Date' },
          { bn: 'ব্যাংক বিবরণ', en: 'Bank Details' },
          { bn: 'অন্যান্য বিবরণ', en: 'Other Details' },
          { bn: 'উৎস', en: 'Source' },
          { bn: 'টাকা (৳)', en: 'Amount (৳)' }
        ],
        rows: deposits.length === 0 ? [
          ['-', '-', bn ? 'কোনো ব্যাংক জমা বা উত্তোলনের রেকর্ড নেই' : 'No deposits', '-', '-', 0]
        ] : deposits.map((d: any, idx: number) => [
          bn ? toBnDigits(idx + 1) : idx + 1,
          formatDateBn(d.deposit_date, bn),
          d.bank_details || '-',
          d.other_details || '-',
          getSourceLabel(d.source, bn, customDepositSources),
          Number(d.amount || 0)
        ]),
        totals: [
          { bn: 'মোট জমা / উত্তোলন', en: 'Total Deposit', value: totalDep },
          { bn: 'অবশিষ্ট নগদ তহবিল (জের)', en: 'Closing Cash Balance', value: cash >= 0 ? cash : 0 }
        ],
        pageBreakAfter: true,
      });

      generateBilingualReport(
        {
          institution_name: getInstName(targetInst, true),
          institution_name_en: getInstName(targetInst, false),
          address: targetInst.address || defaultInst?.address || '',
          phone: targetInst.phone || defaultInst?.phone || '',
          email: targetInst.email || defaultInst?.email || '',
          logo_url: targetInst.logo_url || defaultInst?.logo_url,
          report_title_bn: `${getInstName(targetInst, true)} - মাসিক খরচ বিবরণী`,
          report_title_en: `${getInstName(targetInst, false)} - Monthly Expense Statement`,
          period_label_bn: `মাস: ${selectedMonthName}`,
          period_label_en: `Period: ${selectedMonthName}`,
          bengali_digits: bn,
        },
        sections,
        [
          { label_bn: 'মোট ব্যয়', label_en: 'Total Expense', value: '৳' + formatNum(totalExp), tone: 'negative' },
          { label_bn: 'মোট এন্ট্রি সংখ্যা', label_en: 'Total Entries', value: bn ? toBnDigits(instPaid.length) : instPaid.length, tone: 'neutral' },
          { label_bn: 'মোট বকেয়া', label_en: 'Total Dues', value: '৳' + formatNum(totalDue), tone: totalDue > 0 ? 'accent' : 'positive' }
        ]
      );
    }
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
    reportTitle: '', reportSubtitle: '',
    casherName: '', casherDesignation: '',
    verifierName: '', verifierDesignation: '',
    principalName: '', principalDesignation: '',
    extraNote: ''
  });

  const handleDepositExcelDownload = () => {
    const rows: string[][] = [];
    rows.push([bn ? 'প্রতিষ্ঠান' : 'Institution', bn ? instName : instNameEn]);
    rows.push([bn ? 'ঠিকানা' : 'Address', instAddress]);
    rows.push([bn ? 'ফোন' : 'Phone', instPhone]);
    rows.push([bn ? 'ইমেইল' : 'Email', instEmail]);
    if (instOther) rows.push([bn ? 'অন্যান্য' : 'Other', instOther]);
    rows.push([]);
    rows.push([bn ? 'টাকা আয়/উত্তোলন প্রতিবেদন' : 'Deposit Report', bn ? selectedMonthName : selectedMonthYear]);
    rows.push([]);
    rows.push(['#', bn ? 'তারিখ' : 'Date', bn ? 'ব্যাংক বিবরণ' : 'Bank Details', bn ? 'অন্যান্য বিবরণ' : 'Other Details', bn ? 'উৎস' : 'Source', bn ? 'টাকা' : 'Amount']);
    deposits.forEach((d: any, i: number) => {
      rows.push([bn ? toBnDigits(i + 1) : String(i + 1), formatDateBn(d.deposit_date, bn), d.bank_details || '-', d.other_details || '-', getSourceLabel(d.source, bn, customDepositSources), `৳${formatNum(Number(d.amount))}`]);
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
  const resetExpenseDialog = (open: boolean) => {
    if (!open) {
      setEditingExpenseId(null);
      setExpenseForm(defaultExpenseForm);
      setIsCustomUnitActive(false);
      setCustomUnitText('');
    }
    setExpenseDialog(open);
  };
  const resetDepositDialog = (open: boolean) => {
    if (!open) {
      setEditingDepositId(null);
      setDepositForm(defaultDepositForm);
      setIsAddingNewSource(false);
      setNewSourceInput('');
    }
    setDepositDialog(open);
  };
  const resetExpInstDialog = (open: boolean) => {
    if (!open) {
      setEditingExpInstId(null);
      setExpInstForm(defaultExpInstForm);
      setExpInstLogoFile(null);
    }
    setExpInstDialog(open);
  };
  const resetCategoryDialog = (open: boolean) => { if (!open) { setEditingCategoryId(null); setCategoryForm({ institution_id: '', name: '', name_bn: '' }); } setCategoryDialog(open); };

  const printDocumentHtml = (contentHtml: string, title: string) => {
    const win = window.open('', '_blank');
    if (!win) return;

    const parentStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => el.outerHTML)
      .join('\n');

    win.document.write(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
  ${parentStyles}
  <style>
    @font-face {
      font-family: 'Kalpurush';
      src: url('/fonts/Kalpurush.ttf') format('truetype'),
           url('https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/kalpurush/Kalpurush-v0.258.ttf') format('truetype');
      font-display: block;
    }
    @font-face {
      font-family: 'SolaimanLipi';
      src: url('https://cdn.jsdelivr.net/gh/maateen/bangla-web-fonts/fonts/solaiman-lipi/SolaimanLipi-v0.258.ttf') format('truetype');
      font-display: block;
    }
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: 'Kalpurush', 'SolaimanLipi', 'Hind Siliguri', 'Noto Sans Bengali', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      -webkit-font-smoothing: antialiased;
      width: 100% !important;
    }
    body, body * {
      visibility: visible !important;
      font-family: 'Kalpurush', 'SolaimanLipi', 'Hind Siliguri', 'Noto Sans Bengali', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }
    .print\\:hidden, [class*="print:hidden"] {
      display: none !important;
      visibility: hidden !important;
    }
    .print-page {
      box-sizing: border-box !important;
      min-height: 265mm !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      padding: 0 !important;
      margin: 0 !important;
      background: #ffffff !important;
      border: none !important;
      box-shadow: none !important;
    }
    .print-page:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .page-header {
      margin-bottom: 12px !important;
      border-bottom: 2px solid #000000 !important;
      padding-bottom: 8px !important;
    }
    .page-footer {
      margin-top: auto !important;
      padding-top: 14px !important;
      border-top: 1px solid #cbd5e1 !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      display: flex !important;
      justify-content: space-between !important;
      width: 100% !important;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 11px !important;
      page-break-inside: auto;
      margin-top: 6px !important;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th, td {
      border: 1px solid #334155 !important;
      padding: 4px 6px !important;
      font-size: 11px !important;
    }
    th {
      background-color: #f1f5f9 !important;
      color: #0f172a !important;
      font-weight: 700 !important;
    }
    .bg-muted, [class*="bg-muted"] {
      background-color: #f1f5f9 !important;
    }
    .bg-amber-100, [class*="bg-amber"] {
      background-color: #fef3c7 !important;
    }
    .bg-teal-50, [class*="bg-teal-50"] {
      background-color: #f0fdfa !important;
    }
    .bg-teal-100, [class*="bg-teal-100"] {
      background-color: #ccfbf1 !important;
    }
    .bg-emerald-100, [class*="bg-emerald-100"] {
      background-color: #d1fae5 !important;
    }
    .text-right { text-align: right !important; }
    .text-center { text-align: center !important; }
    .text-left { text-align: left !important; }
    .flex { display: flex !important; }
    .flex-col { flex-direction: column !important; }
    .justify-between { justify-content: space-between !important; }
    .items-center { align-items: center !important; }
    .w-full { width: 100% !important; }
    .w-40 { width: 160px !important; }
    .w-32 { width: 128px !important; }
    .w-28 { width: 112px !important; }
    .w-24 { width: 96px !important; }
    .w-20 { width: 80px !important; }
    .w-16 { width: 64px !important; }
    .w-10 { width: 40px !important; }
    .w-8 { width: 32px !important; }
    .h-16 { height: 64px !important; }
    .mx-auto { margin-left: auto !important; margin-right: auto !important; }
    .font-bold { font-weight: 700 !important; }
    .font-semibold { font-weight: 600 !important; }
    .font-medium { font-weight: 500 !important; }
    .font-black { font-weight: 900 !important; }
    .font-mono { font-family: monospace !important; }
    .border-b-2 { border-bottom: 2px solid #000000 !important; }
    .border-t-2 { border-top: 2px solid #000000 !important; }
    .border-t { border-top: 1px solid #334155 !important; }
    .border { border: 1px solid #334155 !important; }
    .text-amber-700, .text-amber-800 { color: #b45309 !important; }
    .text-emerald-700, .text-emerald-800, .text-emerald-900 { color: #047857 !important; }
    .text-teal-700, .text-teal-800, .text-teal-900 { color: #0f766e !important; }
    .text-rose-700 { color: #be123c !important; }
    .text-muted-foreground { color: #475569 !important; }
    .text-primary { color: #0f172a !important; }
    .text-foreground { color: #000000 !important; }
    .text-sm { font-size: 13px !important; }
    .text-xs { font-size: 11px !important; }
    .text-base { font-size: 15px !important; }
    .text-lg { font-size: 18px !important; }
    @media print {
      body, body * {
        visibility: visible !important;
      }
      .print\\:hidden, [class*="print:hidden"] {
        display: none !important;
        visibility: hidden !important;
      }
      .print-page {
        min-height: 265mm !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        visibility: visible !important;
      }
      .print-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }
  </style>
</head>
<body>
  ${contentHtml}
</body>
</html>`);

    win.document.close();
    win.focus();
    const triggerPrint = () => {
      setTimeout(() => {
        win.print();
      }, 250);
    };
    if (win.document.fonts && win.document.fonts.ready) {
      win.document.fonts.ready.then(triggerPrint).catch(triggerPrint);
    } else {
      setTimeout(triggerPrint, 500);
    }
  };

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
                    <SelectItem key={y} value={String(y)}>{bn ? toBnDigits(y) : y}</SelectItem>
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
                        {bn ? `${MONTHS_BN[i]} ${toBnDigits(selectedYear)}` : `${m} ${selectedYear}`}
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
                        opts.push({ key: val, label: bn ? `${MONTHS_BN[mi]} ${toBnDigits(yr)}` : `${MONTHS[mi]} ${yr}` });
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
                      {bn ? `${MONTHS_BN[i]} ${toBnDigits(y)}` : `${m} ${y}`}
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
              { value: 'audit', label: bn ? 'অডিট লগ' : 'Audit Log' },
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
                    : ((allInstitutions || []).find((p: any) => p.id === selectedInstId) || allInstitutions[0]);

                  const instPaidAll = isAll
                    ? (expenses || []).filter((e: any) => !isUnpaidDue(e.description))
                    : (expenses || []).filter((e: any) => e.institution_id === inst?.id && !isUnpaidDue(e.description));

                  const instCats = isAll
                    ? (categories || [])
                    : getCategoriesForInst(inst?.id);

                  const instDues = isAll
                    ? (allExpenses || []).filter((e: any) => isUnpaidDue(e.description))
                    : (allExpenses || []).filter((e: any) => e.institution_id === inst?.id && isUnpaidDue(e.description));

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
                      String(e.amount ?? '').includes(q)
                    );
                  }
                  const displayTotal = displayExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

                  // Filter dues by category and search as well
                  let displayDues = instDues;
                  if (tableCategoryId !== 'all') {
                    displayDues = displayDues.filter((e: any) => e.category_id === tableCategoryId);
                  }
                  if (tableSearchText.trim()) {
                    const q = tableSearchText.trim().toLowerCase();
                    displayDues = displayDues.filter((e: any) =>
                      cleanDesc(e.description || '').toLowerCase().includes(q) ||
                      (e.expense_date || '').includes(q) ||
                      getMemo(e.description || '').toLowerCase().includes(q) ||
                      getRemarks(e.description || '').toLowerCase().includes(q) ||
                      String(e.amount ?? '').includes(q)
                    );
                  }
                  const displayDuesTotal = displayDues.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

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
                            onClick={() => handleExpensesPDF(isAll ? 'all' : (inst?.id || selectedInstId))}
                            className="text-xs h-9 gap-1.5 border-rose-300 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title={isAll ? (bn ? 'সকল প্রতিষ্ঠানের সমন্বিত PDF ডাউনলোড' : 'Download All Institutions PDF') : (bn ? 'এই প্রতিষ্ঠানের PDF ডাউনলোড' : 'Download Institution PDF')}
                          >
                            <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span>{bn ? 'PDF ডাউনলোড' : 'PDF'}</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPrintInstitutionId(isAll ? 'all' : (inst?.id || null))}
                            className="text-xs h-9 gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>{bn ? 'প্রিন্ট / ভাউচার' : 'Print'}</span>
                          </Button>
                        </div>
                      </div>

                      {/* ─── Two Dedicated Tabs: Paid Expenses vs Due Expenses ─── */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-2.5">
                        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          {/* Tab 1: Paid Expenses */}
                          <button
                            type="button"
                            onClick={() => setExpenseListTab('paid')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              expenseListTab === 'paid'
                                ? 'bg-white dark:bg-card text-emerald-700 dark:text-emerald-300 shadow-sm border border-emerald-500/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-foreground'
                            }`}
                          >
                            <CheckCircle2 className={`w-4 h-4 ${expenseListTab === 'paid' ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span>{bn ? 'পরিশোধিত খরচ (নগদ ব্যয়)' : 'Paid Expenses (Cash)'}</span>
                            <Badge
                              variant="outline"
                              className="ml-1 text-[11px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            >
                              ৳{formatNum(displayTotal)} ({displayExpenses.length})
                            </Badge>
                          </button>

                          {/* Tab 2: Due Expenses */}
                          <button
                            type="button"
                            onClick={() => setExpenseListTab('dues')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              expenseListTab === 'dues'
                                ? 'bg-white dark:bg-card text-amber-700 dark:text-amber-300 shadow-sm border border-amber-500/30'
                                : 'text-slate-600 dark:text-slate-400 hover:text-foreground'
                            }`}
                          >
                            <AlertTriangle className={`w-4 h-4 ${displayDues.length > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
                            <span>{bn ? 'বকেয়া খরচের হিসাব (পরিশোধ বাকি)' : 'Outstanding Dues (Payable)'}</span>
                            <Badge
                              variant="outline"
                              className={`ml-1 text-[11px] font-bold ${
                                displayDues.length > 0
                                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              ৳{formatNum(displayDuesTotal)} ({displayDues.length})
                            </Badge>
                          </button>
                        </div>

                        {/* Status Hint */}
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                          {expenseListTab === 'paid' ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span>{bn ? 'পরিশোধিত নগদ খরচের তালিকা প্রদর্শিত হচ্ছে' : 'Showing paid expenses list'}</span>
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              <span>{bn ? 'বকেয়া খরচের হিসাব প্রদর্শিত হচ্ছে — পরিশোধ করলে ক্যাশ হিসেবে যোগ হবে' : 'Showing outstanding dues list'}</span>
                            </>
                          )}
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
                            placeholder={expenseListTab === 'paid' ? (bn ? 'বিবরণ, মেমো বা তারিখ দিয়ে খুঁজুন...' : 'Search description, memo, date...') : (bn ? 'পাওনাদার, বিবরণ বা মেমো দিয়ে খুঁজুন...' : 'Search vendor, description, memo...')}
                            value={tableSearchText}
                            onChange={e => setTableSearchText(e.target.value)}
                          />
                          {tableSearchText && (
                            <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={() => setTableSearchText('')}>
                              {bn ? 'ক্লিয়ার' : 'Clear'}
                            </Button>
                          )}
                        </div>

                        <div className="text-xs font-medium">
                          {expenseListTab === 'paid' ? (
                            <span className="text-emerald-700 dark:text-emerald-300">
                              {bn ? `মোট পরিশোধিত: ৳${formatNum(displayTotal)} (${displayExpenses.length}টি এন্ট্রি)` : `Total Paid: ৳${formatNum(displayTotal)} (${displayExpenses.length} items)`}
                            </span>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-300">
                              {bn ? `মোট বকেয়া: ৳${formatNum(displayDuesTotal)} (${displayDues.length}টি বকেয়া)` : `Total Due: ৳${formatNum(displayDuesTotal)} (${displayDues.length} dues)`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ─── Tab 1: Paid Expenses Table ─── */}
                      {expenseListTab === 'paid' && (
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
                                  const catObj = (categories || []).find((c: any) => c.id === e.category_id);
                                  const catLabel = catObj ? getCatName(catObj, bn) : (e.expense_categories ? getCatName(e.expense_categories, bn) : '-');
                                  const memoStr = getMemo(e.description, bn);
                                  const remarksStr = getRemarks(e.description);
                                  const rawQty = e.quantity ? (bn ? toBnDigits(e.quantity) : String(e.quantity)) : (bn ? '১' : '1');
                                  const unit = getUnit(e.description, catLabel);
                                  const displayQty = unit ? `${rawQty} ${unit}` : `${rawQty}`;
                                  const rowInst = (allInstitutions || []).find((i: any) => i.id === e.institution_id);

                                  return (
                                    <tr key={e.id} className={`border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-slate-50/40 dark:bg-slate-900/20'}`}>
                                      <td className="px-3 py-2 text-center tabular-nums text-xs text-muted-foreground">{bn ? toBnDigits(idx + 1) : idx + 1}</td>
                                      <td className="px-3 py-2 text-center tabular-nums text-xs whitespace-nowrap">{formatDateBn(e.expense_date, bn)}</td>
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
                                        <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[150px] truncate" title={getMethod(e.description, bn)}>
                                          {getMethod(e.description, bn)}
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
                      )}

                      {/* ─── Tab 2: Dedicated Dues Table (বকেয়া খরচের হিসাব) ─── */}
                      {expenseListTab === 'dues' && (
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
                                {bn ? 'মোট বকেয়া:' : 'Total Due:'} ৳{formatNum(displayDuesTotal)}
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
                                    const catObj = (categories || []).find((c: any) => c.id === due.category_id);
                                    const catLabel = catObj ? (bn ? catObj.name_bn || catObj.name : catObj.name) : '-';
                                    const rawQty = due.quantity ? (bn ? toBnDigits(due.quantity) : String(due.quantity)) : (bn ? '১' : '1');
                                    const unit = getUnit(due.description, catLabel);
                                    const displayQty = unit ? `${rawQty} ${unit}` : `${rawQty}`;
                                    const memoStr = getMemo(due.description, bn);
                                    const remarksStr = getRemarks(due.description);
                                    const rowInst = (allInstitutions || []).find((i: any) => i.id === due.institution_id);

                                    return (
                                      <tr key={due.id} className="border-b border-amber-100 dark:border-amber-950/60 hover:bg-amber-50/40 dark:hover:bg-amber-950/20">
                                        <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{bn ? toBnDigits(dIdx + 1) : dIdx + 1}</td>
                                        <td className="px-3 py-2 text-center tabular-nums whitespace-nowrap">{formatDateBn(due.expense_date, bn)}</td>
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
                                      ৳{formatNum(displayDuesTotal)}
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
                      )}
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
                    reportSubtitle: '',
                    casherName: summaryData?.casher_name || selectedInst?.accountant_name || accountantCashier?.person_name_bn || '',
                    casherDesignation: selectedInst?.accountant_designation || accountantCashier?.person_designation_bn || (bn ? 'ক্যাশিয়ার / প্রস্তুতকারী' : 'Cashier / Prepared By'),
                    verifierName: selectedInst?.verifier_name || verifierAuditor?.person_name_bn || '',
                    verifierDesignation: selectedInst?.verifier_designation || verifierAuditor?.person_designation_bn || (bn ? 'যাচাইকারী / নিরীক্ষক' : 'Verified By / Auditor'),
                    principalName: summaryData?.principal_name || selectedInst?.principal_name || headOfInstitute?.person_name_bn || '',
                    principalDesignation: selectedInst?.principal_designation || headOfInstitute?.person_designation_bn || (bn ? 'মুহতামিম / অধ্যক্ষ' : 'Principal / Authorized By'),
                    extraNote: ''
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
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingDepositId ? (bn ? 'টাকা আয়/উত্তোলন সম্পাদনা' : 'Edit Deposit') : (bn ? 'নতুন টাকা আয়/উত্তোলন' : 'New Deposit')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                      <div>
                        <Label>{bn ? 'তারিখ' : 'Date'} *</Label>
                        <DatePicker bengali={bn} value={depositForm.deposit_date} onChange={v => setDepositForm(f => ({ ...f, deposit_date: v }))} />
                      </div>
                      <div>
                        <Label>{bn ? 'ব্যাংক বিবরণ' : 'Bank Details'}</Label>
                        <Input
                          placeholder={bn ? 'যেমন: এক্সিম ব্যাংক, হিসাব নং...' : 'e.g. Exim Bank, A/C...'}
                          value={depositForm.bank_details}
                          onChange={e => setDepositForm(f => ({ ...f, bank_details: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>{bn ? 'অন্যান্য বিবরণ' : 'Other Details'}</Label>
                        <Input
                          placeholder={bn ? 'বিবরণ বা মন্তব্য' : 'Details or remarks'}
                          value={depositForm.other_details}
                          onChange={e => setDepositForm(f => ({ ...f, other_details: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label>{bn ? 'উৎস' : 'Source'}</Label>
                          {!isAddingNewSource && (
                            <button
                              type="button"
                              onClick={() => setIsAddingNewSource(true)}
                              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              {bn ? 'নতুন উৎস যোগ' : 'Add custom'}
                            </button>
                          )}
                        </div>
                        <Select
                          value={depositForm.source}
                          onValueChange={v => {
                            if (v === '__add_custom__') {
                              setIsAddingNewSource(true);
                            } else {
                              setDepositForm(f => ({ ...f, source: v }));
                            }
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={bn ? 'উৎস নির্বাচন করুন' : 'Select source'} />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            <SelectGroup>
                              <SelectLabel className="text-xs text-muted-foreground">{bn ? 'সিস্টেম উৎস' : 'System Sources'}</SelectLabel>
                              {BUILTIN_DEPOSIT_SOURCES.map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                  {bn ? s.name_bn : s.name_en}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                            {customDepositSources.length > 0 && (
                              <SelectGroup>
                                <SelectLabel className="text-xs text-muted-foreground">{bn ? 'কাস্টম উৎসসমূহ' : 'Custom Sources'}</SelectLabel>
                                {customDepositSources.map(s => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {bn ? s.name_bn : (s.name_en || s.name_bn)}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            )}
                            {depositForm.source &&
                              !BUILTIN_DEPOSIT_SOURCES.some(s => s.id === depositForm.source) &&
                              !customDepositSources.some(s => s.id === depositForm.source || s.name_bn === depositForm.source) && (
                                <SelectItem value={depositForm.source}>
                                  {depositForm.source}
                                </SelectItem>
                              )}
                            <div className="p-1 border-t border-slate-200 dark:border-slate-800">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs text-emerald-600 font-semibold h-8 px-2"
                                onClick={() => setIsAddingNewSource(true)}
                              >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                {bn ? '+ নতুন উৎস কাস্টমাইজ করুন' : '+ Add Custom Source'}
                              </Button>
                            </div>
                          </SelectContent>
                        </Select>

                        {isAddingNewSource && (
                          <div className="p-2.5 rounded-lg border border-dashed border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 space-y-2 mt-2">
                            <Label className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                              {bn ? 'নতুন উৎসের নাম লিখুন:' : 'New Source Name:'}
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                autoFocus
                                placeholder={bn ? 'যেমন: চেয়ারম্যান সাহেব নগদ(এক্সিম ব্যাংক)' : 'e.g. Chairman Cash'}
                                value={newSourceInput}
                                onChange={e => setNewSourceInput(e.target.value)}
                                className="h-8 text-xs bg-white dark:bg-slate-900"
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleQuickAddSource();
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                                onClick={handleQuickAddSource}
                                disabled={saveDepositSourcesMutation.isPending}
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                {bn ? 'যোগ' : 'Add'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-xs"
                                onClick={() => { setIsAddingNewSource(false); setNewSourceInput(''); }}
                              >
                                {bn ? 'বাতিল' : 'Cancel'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <Label>{bn ? 'পরিমাণ (টাকা)' : 'Amount (BDT)'} *</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={depositForm.amount}
                          onChange={e => setDepositForm(f => ({ ...f, amount: onlyNumbers(e.target.value) }))}
                        />
                      </div>
                      <Button className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium cursor-pointer" onClick={() => addDeposit.mutate()} disabled={addDeposit.isPending}>
                        {addDeposit.isPending ? (bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (bn ? 'সংরক্ষণ করুন' : 'Save')}
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
                    <th className="border border-slate-300 px-3 py-1.5 text-left font-semibold text-slate-800 w-36">{bn ? 'উৎস' : 'Source'}</th>
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
                      <td className="border border-slate-300 px-3 py-1.5 text-center tabular-nums">{bn ? toBnDigits(i + 1) : i + 1}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-center tabular-nums">{formatDateBn(d.deposit_date, bn)}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-left">{d.bank_details || '-'}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-left">{d.other_details || '-'}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-left">
                        <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                          {getSourceLabel(d.source, bn, customDepositSources)}
                        </span>
                      </td>
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>{editingExpInstId ? (bn ? 'প্রতিষ্ঠান সম্পাদনা' : 'Edit Institution') : (bn ? 'নতুন প্রতিষ্ঠান' : 'New Institution')}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3.5 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">{bn ? 'প্রতিষ্ঠানের নাম (বাংলা)' : 'Name (Bangla)'} *</Label>
                            <Input
                              value={expInstForm.name_bn}
                              onChange={e => setExpInstForm(f => ({ ...f, name_bn: e.target.value }))}
                              placeholder="যেমন: এম এইচ সেন্টার"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{bn ? 'নাম (ইংরেজি - ঐচ্ছিক)' : 'Name (English - Optional)'}</Label>
                            <Input
                              value={expInstForm.name}
                              onChange={e => setExpInstForm(f => ({ ...f, name: e.target.value }))}
                              placeholder="e.g. MH Center"
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">{bn ? 'প্রতিষ্ঠানের ঠিকানা' : 'Address'}</Label>
                          <Input
                            value={expInstForm.address}
                            onChange={e => setExpInstForm(f => ({ ...f, address: e.target.value }))}
                            placeholder={bn ? 'যেমন: বন্দর, নারায়ণগঞ্জ' : 'e.g. Bandar, Narayanganj'}
                            className="h-9 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">{bn ? 'মোবাইল / ফোন নম্বর' : 'Phone'}</Label>
                            <Input
                              value={expInstForm.phone}
                              onChange={e => setExpInstForm(f => ({ ...f, phone: e.target.value }))}
                              placeholder="01XXXXXXXXX"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{bn ? 'ইমেইল অ্যাড্রেস' : 'Email'}</Label>
                            <Input
                              type="email"
                              value={expInstForm.email}
                              onChange={e => setExpInstForm(f => ({ ...f, email: e.target.value }))}
                              placeholder="info@institution.com"
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">{bn ? 'অন্যান্য তথ্য / স্লোগান' : 'Other Info / Slogan'}</Label>
                          <Input
                            value={expInstForm.other_info}
                            onChange={e => setExpInstForm(f => ({ ...f, other_info: e.target.value }))}
                            placeholder={bn ? 'যেমন: সততা ও সেবায় নিয়োজিত' : 'e.g. Slogan or note'}
                            className="h-9 text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-xs">{bn ? 'প্রতিষ্ঠানের লোগো' : 'Institution Logo'}</Label>
                          {(expInstForm.logo_url || expInstLogoFile) && (
                            <div className="mb-2 flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                              <img
                                src={expInstLogoFile ? URL.createObjectURL(expInstLogoFile) : expInstForm.logo_url}
                                alt="Logo Preview"
                                className="w-12 h-12 object-contain rounded border bg-white"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{expInstLogoFile ? expInstLogoFile.name : (bn ? 'বর্তমান লোগো' : 'Current logo')}</p>
                                <p className="text-[10px] text-muted-foreground">{bn ? 'প্রিন্ট ও পিডিএফের হেডারে প্রদর্শিত হবে' : 'Shown in reports & PDF'}</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 text-xs"
                                onClick={() => {
                                  setExpInstLogoFile(null);
                                  setExpInstForm(f => ({ ...f, logo_url: '' }));
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                {bn ? 'সরান' : 'Remove'}
                              </Button>
                            </div>
                          )}
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 500 * 1024) {
                                  toast.error(bn ? 'সর্বোচ্চ ৫০০KB সাইজ হতে হবে' : 'File must be under 500KB');
                                  return;
                                }
                                setExpInstLogoFile(file);
                              }
                            }}
                            className="h-9 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {bn ? 'PNG বা JPG ফরম্যাট (সর্বোচ্চ ৫০০KB)' : 'PNG or JPG (max 500KB)'}
                          </p>
                        </div>

                        <Button
                          className="w-full mt-2"
                          onClick={() => addExpInst.mutate()}
                          disabled={addExpInst.isPending || expInstLogoUploading}
                        >
                          {expInstLogoUploading ? (bn ? 'লোগো আপলোড হচ্ছে...' : 'Uploading Logo...') : (bn ? 'সংরক্ষণ করুন' : 'Save')}
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
                          <div className="flex items-center gap-2.5 min-w-0">
                            {p.logo_url ? (
                              <img src={p.logo_url} alt="" className="w-7 h-7 object-contain rounded border bg-white flex-shrink-0" />
                            ) : (
                              <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-foreground block truncate">{getInstName(p, bn)}</span>
                              {p.address && <p className="text-[11px] text-muted-foreground truncate">{p.address}</p>}
                            </div>
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

              {/* Deposit Sources Management Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    <span>{bn ? 'আয়/উত্তোলনের উৎসসমূহ' : 'Deposit Sources'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add new source input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder={bn ? 'নতুন উৎস (যেমন: চেয়ারম্যান অনুদান)' : 'New source name'}
                      value={settingNewSourceInput}
                      onChange={e => setSettingNewSourceInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSettingSource();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleAddSettingSource}
                      disabled={saveDepositSourcesMutation.isPending || !settingNewSourceInput.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {bn ? 'যোগ' : 'Add'}
                    </Button>
                  </div>

                  {/* Sources list */}
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {bn ? 'সিস্টেম ডিফল্ট উৎস' : 'Default Sources'}
                    </div>
                    {BUILTIN_DEPOSIT_SOURCES.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 text-sm">
                        <span className="font-medium text-foreground">{bn ? s.name_bn : s.name_en}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-muted-foreground font-medium">
                          {bn ? 'ডিফল্ট' : 'Default'}
                        </span>
                      </div>
                    ))}

                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pt-2">
                      {bn ? 'কাস্টম তৈরিকৃত উৎস' : 'Custom Sources'} ({customDepositSources.length})
                    </div>
                    {customDepositSources.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 italic">
                        {bn ? 'কোনো কাস্টম উৎস যোগ করা হয়নি। উপরের বক্সে লিখে যোগ করুন।' : 'No custom sources added.'}
                      </p>
                    ) : (
                      customDepositSources.map(s => {
                        const usageCount = allDeposits.filter((d: any) => d.source === s.id || d.source === s.name_bn).length;
                        return (
                          <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-sm">
                            <div>
                              <span className="font-medium text-foreground">{bn ? s.name_bn : (s.name_en || s.name_bn)}</span>
                              {usageCount > 0 && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({usageCount} {bn ? 'টি এন্ট্রি' : 'entries'})
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                              onClick={async () => {
                                if (await confirm({
                                  title: bn ? 'উৎস মুছে ফেলুন' : 'Delete Source',
                                  description: bn
                                    ? `"${s.name_bn}" উৎসটি তালিকা থেকে মুছে ফেলতে চান?${usageCount > 0 ? ` (সতর্কতা: ${usageCount}টি পূর্বে সংরক্ষিত আয়ে এই উৎস রয়েছে)` : ''}`
                                    : `Delete source "${s.name_bn}"?`,
                                  variant: 'destructive'
                                })) {
                                  const filtered = customDepositSources.filter(cs => cs.id !== s.id);
                                  saveDepositSourcesMutation.mutate(filtered);
                                }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
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
                              <Button variant="outline" size="sm" onClick={() => handleExpensesPDF(p.id)} title={bn ? 'PDF ডাউনলোড' : 'PDF'}>
                                <FileText className="w-3 h-3 mr-1 text-rose-600" />{bn ? 'PDF' : 'PDF'}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setPrintInstitutionId(p.id)}>
                                <Printer className="w-3 h-3 mr-1" />{bn ? 'প্রিন্ট' : 'Print'}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleInstExcelDownload(p.id)}>
                                <Download className="w-3 h-3 mr-1 text-emerald-600" />{bn ? 'এক্সেল' : 'Excel'}
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

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-4">
            <AccountsAuditView
              currentMonthYear={selectedMonthYear}
              onRefreshExpenses={() => {
                qc.invalidateQueries({ queryKey: ['expenses'] });
                qc.invalidateQueries({ queryKey: ['all_expenses'] });
                qc.invalidateQueries({ queryKey: ['deposits'] });
                qc.invalidateQueries({ queryKey: ['all_deposits'] });
              }}
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
                            <td className="border p-1 text-center">{e.quantity || 1}{getUnit(e.description) ? ` ${getUnit(e.description)}` : ''}</td>
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
          <tbody>
            <tr className="font-bold bg-muted">
              <td className="border p-2">{bn ? 'সর্বমোট হিসাব' : 'Grand Total Expense'}</td>
              <td className="border p-2 text-right">৳{formatNum(monthlyTotalExpense)}</td>
            </tr>
          </tbody>
        </table>

        {/* Signatures */}
        {(() => {
          const sumCasherPerson = (summaryData?.casher_name || selectedInst?.accountant_name || accountantCashier?.person_name_bn || '').trim();
          const sumCasherTitle = (selectedInst?.accountant_designation || accountantCashier?.person_designation_bn || (bn ? 'ক্যাশিয়ার / প্রস্তুতকারী' : 'Cashier / Prepared By')).trim();
          const sumVerPerson = (selectedInst?.verifier_name || verifierAuditor?.person_name_bn || '').trim();
          const sumVerTitle = (selectedInst?.verifier_designation || verifierAuditor?.person_designation_bn || (bn ? 'যাচাইকারী / নিরীক্ষক' : 'Verified By / Auditor')).trim();
          const sumPrincPerson = (summaryData?.principal_name || selectedInst?.principal_name || headOfInstitute?.person_name_bn || '').trim();
          const sumPrincTitle = (selectedInst?.principal_designation || headOfInstitute?.person_designation_bn || (bn ? 'মুহতামিম / অধ্যক্ষ' : 'Principal / Authorized By')).trim();
          const showVer = Boolean(sumVerPerson || verifierAuditor?.is_active || selectedInst?.verifier_name);

          return (
            <div className="flex justify-between items-end mt-12 pt-8">
              <div className="text-center min-w-[140px]">
                {accountantCashier?.signature_url ? (
                  <img src={accountantCashier.signature_url} alt="Signature" className="h-9 mx-auto mb-1 object-contain" />
                ) : (
                  <div className="h-6"></div>
                )}
                <div className="border-t border-black w-40 mx-auto mb-1"></div>
                {sumCasherPerson ? (
                  <>
                    <p className="text-sm font-semibold">{sumCasherPerson}</p>
                    <p className="text-xs text-muted-foreground">{sumCasherTitle}</p>
                  </>
                ) : (
                  <p className="text-sm font-medium">{sumCasherTitle}</p>
                )}
              </div>

              {showVer && (
                <div className="text-center min-w-[140px]">
                  {verifierAuditor?.signature_url ? (
                    <img src={verifierAuditor.signature_url} alt="Signature" className="h-9 mx-auto mb-1 object-contain" />
                  ) : (
                    <div className="h-6"></div>
                  )}
                  <div className="border-t border-black w-40 mx-auto mb-1"></div>
                  {sumVerPerson ? (
                    <>
                      <p className="text-sm font-semibold">{sumVerPerson}</p>
                      <p className="text-xs text-muted-foreground">{sumVerTitle}</p>
                    </>
                  ) : (
                    <p className="text-sm font-medium">{sumVerTitle}</p>
                  )}
                </div>
              )}

              <div className="text-center min-w-[140px]">
                {headOfInstitute?.signature_url ? (
                  <img src={headOfInstitute.signature_url} alt="Signature" className="h-9 mx-auto mb-1 object-contain" />
                ) : (
                  <div className="h-6"></div>
                )}
                <div className="border-t border-black w-40 mx-auto mb-1"></div>
                {sumPrincPerson ? (
                  <>
                    <p className="text-sm font-semibold">{sumPrincPerson}</p>
                    <p className="text-xs text-muted-foreground">{sumPrincTitle}</p>
                  </>
                ) : (
                  <p className="text-sm font-medium">{sumPrincTitle}</p>
                )}
              </div>
            </div>
          );
        })()}
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
                  const isSalaryCategory = catName.includes('salary') || catNameBn.includes('বেতন') || catNameBn.includes('সম্মানী');
                  setExpenseForm(f => ({ 
                    ...f, 
                    category_id: value, 
                    add_to_inventory: isInventoryCategory ? true : f.add_to_inventory,
                    quantity_unit: isSalaryCategory ? (f.quantity_unit === 'পিস' ? 'জন' : f.quantity_unit) : f.quantity_unit
                  }));
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
                <div className="flex items-center justify-between mb-1">
                  <Label>{bn ? 'পরিমাণ ও ধরণ' : 'Quantity & Unit'}</Label>
                  {isCustomUnitActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomUnitActive(false);
                        setCustomUnitText('');
                        setExpenseForm(f => ({ ...f, quantity_unit: 'পিস' }));
                      }}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      {bn ? '← তালিকা' : '← List'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input 
                    className="flex-1" 
                    value={expenseForm.quantity} 
                    onChange={e => setExpenseForm(f => ({ ...f, quantity: onlyNumbers(e.target.value) }))} 
                    placeholder="১"
                    inputMode="decimal"
                  />
                  {!isCustomUnitActive ? (
                    <Select 
                      value={expenseForm.quantity_unit || 'none'} 
                      onValueChange={v => {
                        if (v === '__custom__') {
                          setIsCustomUnitActive(true);
                          setCustomUnitText('');
                          setExpenseForm(f => ({ ...f, quantity_unit: '' }));
                        } else if (v === 'none') {
                          setExpenseForm(f => ({ ...f, quantity_unit: 'none' }));
                        } else {
                          setExpenseForm(f => ({ ...f, quantity_unit: v }));
                        }
                      }}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder={bn ? 'একক' : 'Unit'} />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        <SelectItem value="none">{bn ? 'কোনোটি নয় (ফাঁকা)' : 'None (Blank)'}</SelectItem>
                        {allAvailableUnits.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                        <SelectItem value="__custom__" className="text-primary font-medium border-t mt-1 pt-1">
                          {bn ? '✏️ কাস্টম (নিজে লিখুন)' : '✏️ Custom Unit'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-1 w-36">
                      <Input
                        placeholder={bn ? 'উদা: কার্টুন' : 'e.g. Box'}
                        value={customUnitText}
                        onChange={e => {
                          const val = e.target.value;
                          setCustomUnitText(val);
                          setExpenseForm(f => ({ ...f, quantity_unit: val.trim() }));
                        }}
                        className="h-10 text-xs"
                        autoFocus
                      />
                    </div>
                  )}
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
            <div className="rounded-xl border border-emerald-200/50 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <Label className="text-sm font-semibold">{bn ? 'ইনভেন্টরিতে স্টক ও ক্রয় যোগ হবে?' : 'Add to Inventory Stock & Purchase?'}</Label>
                    <p className="text-[11px] text-muted-foreground">{bn ? 'ক্রয়কৃত মালামাল সরাসরি ইনভেন্টরি হিসেবে যুক্ত হবে' : 'Automatically syncs count with inventory stock'}</p>
                  </div>
                </div>
                <Switch
                  checked={expenseForm.add_to_inventory}
                  onCheckedChange={v => setExpenseForm(f => ({ ...f, add_to_inventory: v, inventory_item_id: v ? f.inventory_item_id : '' }))}
                />
              </div>
              {expenseForm.add_to_inventory && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">{bn ? 'ইনভেন্টরি আইটেম নির্বাচন করুন' : 'Select Inventory Item'}</Label>
                    <a 
                      href="/admin/inventory" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>{bn ? 'ইনভেন্টরি তালিকা / নতুন আইটেম' : 'Open Inventory'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <Select
                    value={expenseForm.inventory_item_id || undefined}
                    onValueChange={v => setExpenseForm(f => ({ ...f, inventory_item_id: v }))}
                  >
                    <SelectTrigger className="mt-1 bg-white dark:bg-neutral-900"><SelectValue placeholder={bn ? 'আইটেম বাছুন...' : 'Select item...'} /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {inventoryItems.map((item: any) => (
                        <SelectItem key={item.id} value={item.id}>
                          {bn ? item.name_bn : (item.name_en || item.name_bn)} — {bn ? 'মজুত:' : 'Stock:'} {item.current_stock} {item.unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {inventoryItems.length === 0 ? (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                      {bn ? 'ইনভেন্টরিতে এখনো কোনো আইটেম নেই। উপরের লিংক থেকে ইনভেন্টরি পেজে আইটেম তৈরি করুন।' : 'No inventory items found. Please create items first.'}
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                      {bn ? '✓ সংরক্ষণ করলে খরচের পরিমাণটি এই আইটেমের মোট ক্রয় এবং বর্তমান স্টকে যুক্ত হবে।' : '✓ Saving will add this quantity to total purchased and in-stock inventory.'}
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button className="w-full" onClick={() => addExpense.mutate()} disabled={addExpense.isPending || uploading}>
              {uploading ? (bn ? 'আপলোড হচ্ছে...' : 'Uploading...') : (editingExpenseId ? (bn ? 'হিসাব আপডেট করুন' : 'Update Expense') : (bn ? 'সংরক্ষণ করুন' : 'Save'))}
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
                              <TableCell>{e.quantity || 1}{getUnit(e.description) ? ` ${getUnit(e.description)}` : ''}</TableCell>
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
            <DialogTitle className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span>{bn ? 'প্রকল্প প্রিন্ট প্রিভিউ' : 'Project Print Preview'}</span>
                <Select
                  value={printInstitutionId || 'all'}
                  onValueChange={(val) => {
                    setPrintInstitutionId(val);
                    setPrintEditMode(false);
                    setPrintEditData({
                      instName: '', instNameEn: '', instAddress: '', instPhone: '', instEmail: '', instOther: '', instLogo: '',
                      reportTitle: '', reportSubtitle: '',
                      casherName: '', casherDesignation: '',
                      verifierName: '', verifierDesignation: '',
                      principalName: '', principalDesignation: '',
                      extraNote: ''
                    });
                  }}
                >
                  <SelectTrigger className="w-[230px] h-8 text-xs font-normal">
                    <SelectValue placeholder={bn ? 'প্রতিষ্ঠান বাছাই' : 'Select Institution'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      🏢 {bn ? 'সকল প্রতিষ্ঠান (একত্রিত)' : 'All Institutions (Combined)'}
                    </SelectItem>
                    {allInstitutions.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {getInstName(p, bn)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant={printEditMode ? 'default' : 'outline'} size="sm" onClick={() => {
                if (!printEditMode) {
                  const isAll = printInstitutionId === 'all';
                  const singleForEdit = !isAll ? allInstitutions.find((p: any) => p.id === printInstitutionId) : null;
                  const defaultSchool = institutions.find((i: any) => i.is_default) || allInstitutions[0];
                  const targetForEdit = isAll ? defaultSchool : (singleForEdit || defaultSchool);

                  setPrintEditData({
                    instName: isAll ? (bn ? 'সকল প্রতিষ্ঠান (একত্রিত হিসাব)' : 'All Institutions (Combined)') : getInstName(targetForEdit, true),
                    instNameEn: isAll ? 'All Institutions (Combined)' : getInstName(targetForEdit, false),
                    instAddress: targetForEdit?.address || '',
                    instPhone: targetForEdit?.phone || '',
                    instEmail: targetForEdit?.email || '',
                    instOther: targetForEdit?.other_info || '',
                    instLogo: targetForEdit?.logo_url || '',
                    reportTitle: bn
                      ? (isAll ? 'সকল প্রতিষ্ঠানের একত্রিত হিসাব প্রতিবেদন' : 'মাসিক হিসাব প্রতিবেদন')
                      : (isAll ? 'All Institutions Combined Report' : 'Monthly Expense Report'),
                    reportSubtitle: '',
                    casherName: printEditData.casherName || summaryData?.casher_name || targetForEdit?.accountant_name || accountantCashier?.person_name_bn || '',
                    casherDesignation: printEditData.casherDesignation || targetForEdit?.accountant_designation || accountantCashier?.person_designation_bn || (bn ? 'ক্যাশিয়ার / প্রস্তুতকারী' : 'Cashier / Prepared By'),
                    verifierName: printEditData.verifierName || targetForEdit?.verifier_name || verifierAuditor?.person_name_bn || '',
                    verifierDesignation: printEditData.verifierDesignation || targetForEdit?.verifier_designation || verifierAuditor?.person_designation_bn || (bn ? 'যাচাইকারী / নিরীক্ষক' : 'Verified By / Auditor'),
                    principalName: printEditData.principalName || summaryData?.principal_name || targetForEdit?.principal_name || headOfInstitute?.person_name_bn || '',
                    principalDesignation: printEditData.principalDesignation || targetForEdit?.principal_designation || headOfInstitute?.person_designation_bn || (bn ? 'মুহতামিম / অধ্যক্ষ' : 'Principal / Authorized By'),
                    extraNote: printEditData.extraNote || ''
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

              {/* Signatories Formula Inputs */}
              <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
                <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <span>✍️ {bn ? 'স্বাক্ষরকারীদের নাম ও পদবি (পৃষ্ঠা ফর্মুলা)' : 'Signatories Name & Designation (Page Formula)'}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>{bn ? 'ক্যাশিয়ার / প্রস্তুতকারীর নাম' : 'Cashier / Prepared By Name'}</Label>
                    <Input value={printEditData.casherName} onChange={e => setPrintEditData(p => ({ ...p, casherName: e.target.value }))} placeholder={bn ? 'নাম লিখুন' : 'Enter name'} />
                  </div>
                  <div>
                    <Label>{bn ? 'ক্যাশিয়ারের পদবি' : 'Cashier Designation'}</Label>
                    <Input value={printEditData.casherDesignation} onChange={e => setPrintEditData(p => ({ ...p, casherDesignation: e.target.value }))} placeholder={bn ? 'যেমন: ক্যাশিয়ার / হিসাবরক্ষক' : 'e.g. Cashier'} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>{bn ? 'যাচাইকারী / নিরীক্ষকের নাম' : 'Verifier / Auditor Name'}</Label>
                    <Input value={printEditData.verifierName} onChange={e => setPrintEditData(p => ({ ...p, verifierName: e.target.value }))} placeholder={bn ? 'নাম লিখুন (ঐচ্ছিক)' : 'Enter name (Optional)'} />
                  </div>
                  <div>
                    <Label>{bn ? 'যাচাইকারীর পদবি' : 'Verifier Designation'}</Label>
                    <Input value={printEditData.verifierDesignation} onChange={e => setPrintEditData(p => ({ ...p, verifierDesignation: e.target.value }))} placeholder={bn ? 'যেমন: যাচাইকারী / নিরীক্ষক' : 'e.g. Auditor'} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>{bn ? 'প্রতিষ্ঠান প্রধান / অধ্যক্ষের নাম' : 'Principal / Head Name'}</Label>
                    <Input value={printEditData.principalName} onChange={e => setPrintEditData(p => ({ ...p, principalName: e.target.value }))} placeholder={bn ? 'নাম লিখুন' : 'Enter name'} />
                  </div>
                  <div>
                    <Label>{bn ? 'প্রতিষ্ঠান প্রধানের পদবি' : 'Principal Designation'}</Label>
                    <Input value={printEditData.principalDesignation} onChange={e => setPrintEditData(p => ({ ...p, principalDesignation: e.target.value }))} placeholder={bn ? 'যেমন: মুহতামিম / অধ্যক্ষ' : 'e.g. Principal / Muhtamim'} />
                  </div>
                </div>
              </div>

              <div><Label>{bn ? 'অতিরিক্ত নোট (প্রিন্টে দেখাবে)' : 'Extra Note (shown in print)'}</Label>
                <Textarea value={printEditData.extraNote} onChange={e => setPrintEditData(p => ({ ...p, extraNote: e.target.value }))} rows={2} /></div>
            </div>
          ) : (
          (() => {
            const isAllPrint = printInstitutionId === 'all';
            const singleInst = !isAllPrint ? allInstitutions.find((p: any) => p.id === printInstitutionId) : null;
            if (!isAllPrint && !singleInst) return null;

            const defaultSchool = institutions.find((i: any) => i.is_default) || allInstitutions[0];
            const activeInst = isAllPrint ? defaultSchool : singleInst;

            const institutionsToPrint = isAllPrint ? allInstitutions : (singleInst ? [singleInst] : []);
            const totalPaid = isAllPrint 
              ? expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
              : (singleInst ? expenses.filter((e: any) => e.institution_id === singleInst.id).reduce((s: number, e: any) => s + Number(e.amount || 0), 0) : 0);

            const ed = printEditData;
            const dInstName = ed.instName || (isAllPrint ? (bn ? 'সকল প্রতিষ্ঠান (একত্রিত হিসাব)' : 'All Institutions (Combined)') : getInstName(singleInst, bn));
            const dInstAddress = ed.instAddress || activeInst?.address || '';
            const dInstPhone = ed.instPhone || activeInst?.phone || '';
            const dInstEmail = ed.instEmail || activeInst?.email || '';
            const dInstOther = ed.instOther || activeInst?.other_info || '';
            const dInstLogo = ed.instLogo || activeInst?.logo_url || '';
            const dReportTitle = ed.reportTitle || (isAllPrint 
              ? (bn ? 'সকল প্রতিষ্ঠানের একত্রিত হিসাব প্রতিবেদন' : 'All Institutions Combined Expense Report')
              : (bn ? 'মাসিক হিসাব প্রতিবেদন' : 'Monthly Expense Report'));
            const casherPerson = (
              ed.casherName ||
              summaryData?.casher_name ||
              activeInst?.accountant_name ||
              accountantCashier?.person_name_bn ||
              ''
            ).trim();
            const casherDesignation = (
              ed.casherDesignation ||
              activeInst?.accountant_designation ||
              accountantCashier?.person_designation_bn ||
              (bn ? 'ক্যাশিয়ার / প্রস্তুতকারী' : 'Cashier / Prepared By')
            ).trim();

            const verifierPerson = (
              ed.verifierName ||
              activeInst?.verifier_name ||
              verifierAuditor?.person_name_bn ||
              ''
            ).trim();
            const verifierDesignation = (
              ed.verifierDesignation ||
              activeInst?.verifier_designation ||
              verifierAuditor?.person_designation_bn ||
              (bn ? 'যাচাইকারী / নিরীক্ষক' : 'Verified By / Auditor')
            ).trim();

            const principalPerson = (
              ed.principalName ||
              summaryData?.principal_name ||
              activeInst?.principal_name ||
              headOfInstitute?.person_name_bn ||
              ''
            ).trim();
            const principalDesignation = (
              ed.principalDesignation ||
              activeInst?.principal_designation ||
              headOfInstitute?.person_designation_bn ||
              (bn ? 'মুহতামিম / অধ্যক্ষ' : 'Principal / Authorized By')
            ).trim();

            // Build printable pages: 1 page per category, dues, bank deposit, and master summary (matching Excel tabs)
            type PrintablePage = {
              id: string;
              type: 'category' | 'uncategorized' | 'dues' | 'bank_deposit' | 'master_summary';
              inst: any;
              categoryName: string;
              items: any[];
              subtotal: number;
            };

            const pagesToRender: PrintablePage[] = [];

            institutionsToPrint.forEach((inst: any) => {
              const instExpenses = expenses.filter((e: any) => e.institution_id === inst.id && !isUnpaidDue(e.description));
              const instDues = allExpenses.filter((e: any) => e.institution_id === inst.id && isUnpaidDue(e.description));
              
              // Find categories for this institution matching Excel export exactly
              const instSpecificCats = (categories || []).filter((c: any) => c.institution_id === inst.id);
              const targetCats = instSpecificCats.length > 0 ? instSpecificCats : getCategoriesForInst(inst.id);
              const catsWithExpenses = (categories || []).filter((c: any) => instExpenses.some((e: any) => e.category_id === c.id));
              
              const seenCatIds = new Set<string>();
              const finalCats: any[] = [];
              [...targetCats, ...catsWithExpenses].forEach((c: any) => {
                if (c && !seenCatIds.has(c.id)) {
                  seenCatIds.add(c.id);
                  finalCats.push(c);
                }
              });

              // 1. Pages for each category belonging to this institution
              finalCats.forEach((cat: any) => {
                const catExpenses = instExpenses.filter((e: any) => e.category_id === cat.id);
                const catTotal = catExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                pagesToRender.push({
                  id: `${inst.id}-cat-${cat.id}`,
                  type: 'category',
                  inst,
                  categoryName: getCatName(cat, bn),
                  items: catExpenses,
                  subtotal: catTotal
                });
              });

              // 2. Page for uncategorized expenses if any exist
              const uncatExpenses = instExpenses.filter((e: any) => !e.category_id || !finalCats.some((c: any) => c.id === e.category_id));
              if (uncatExpenses.length > 0) {
                const uncatTotal = uncatExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                pagesToRender.push({
                  id: `${inst.id}-uncat`,
                  type: 'uncategorized',
                  inst,
                  categoryName: bn ? 'অন্যান্য / সাধারণ ব্যয়' : 'Other Expenses',
                  items: uncatExpenses,
                  subtotal: uncatTotal
                });
              }

              // 3. Page for dues (ALWAYS render dues page for each institution, matching Excel dues sheet)
              const duesTotal = instDues.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
              pagesToRender.push({
                id: `${inst.id}-dues`,
                type: 'dues',
                inst,
                categoryName: bn ? 'বকেয়া খরচের হিসাব (পরিশোধ বাকি)' : 'Outstanding Payable Dues',
                items: instDues,
                subtotal: duesTotal
              });
            });

            // 4. Dedicated Bank Account & Deposits/Withdrawals Page (matching Excel 'টাকা আয়-উত্তোলন' sheet)
            pagesToRender.push({
              id: 'bank-deposit-page',
              type: 'bank_deposit',
              inst: activeInst,
              categoryName: bn ? 'টাকা আয়/উত্তোলন ও ব্যাংক হিসাব বিবরণী' : 'Deposit & Bank Account Statement',
              items: deposits,
              subtotal: monthlyTotalDeposit
            });

            // 5. Master Summary Page at the end
            pagesToRender.push({
              id: 'master-summary',
              type: 'master_summary',
              inst: activeInst,
              categoryName: isAllPrint 
                ? (bn ? 'সকল প্রতিষ্ঠানের সর্বমোট হিসাব ও নগদ তহবিল সারসংক্ষেপ' : 'Consolidated Financial & Fund Summary')
                : (bn ? `${getInstName(singleInst, bn)} - সর্বমোট আর্থিক সারসংক্ষেপ` : 'Financial Summary'),
              items: [],
              subtotal: totalPaid
            });

            const renderSignatures = (pageInst?: any) => {
              const currentInst = pageInst || activeInst;

              const cPerson = (
                ed.casherName ||
                summaryData?.casher_name ||
                currentInst?.accountant_name ||
                accountantCashier?.person_name_bn ||
                ''
              ).trim();

              const cDesig = (
                ed.casherDesignation ||
                currentInst?.accountant_designation ||
                accountantCashier?.person_designation_bn ||
                (bn ? 'ক্যাশিয়ার / প্রস্তুতকারী' : 'Cashier / Prepared By')
              ).trim();

              const vPerson = (
                ed.verifierName ||
                currentInst?.verifier_name ||
                verifierAuditor?.person_name_bn ||
                ''
              ).trim();

              const vDesig = (
                ed.verifierDesignation ||
                currentInst?.verifier_designation ||
                verifierAuditor?.person_designation_bn ||
                (bn ? 'যাচাইকারী / নিরীক্ষক' : 'Verified By / Auditor')
              ).trim();

              const pPerson = (
                ed.principalName ||
                summaryData?.principal_name ||
                currentInst?.principal_name ||
                headOfInstitute?.person_name_bn ||
                ''
              ).trim();

              const pDesig = (
                ed.principalDesignation ||
                currentInst?.principal_designation ||
                headOfInstitute?.person_designation_bn ||
                (bn ? 'মুহতামিম / অধ্যক্ষ' : 'Principal / Authorized By')
              ).trim();

              const showVerifier = Boolean(vPerson || verifierAuditor?.is_active || currentInst?.verifier_name);

              return (
                <div 
                  className="flex justify-between items-end mt-12 pt-6 border-t print:mt-10 page-footer"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    width: '100%',
                    marginTop: '36px',
                    paddingTop: '16px',
                    borderTop: '1px solid #cbd5e1',
                    pageBreakInside: 'avoid'
                  }}
                >
                  {/* 1. Cashier / Prepared By */}
                  <div className="text-center min-w-[140px]" style={{ textAlign: 'center', minWidth: '150px' }}>
                    {accountantCashier?.signature_url ? (
                      <img 
                        src={accountantCashier.signature_url} 
                        alt="Signature" 
                        className="h-9 mx-auto mb-1 object-contain" 
                        style={{ height: '36px', margin: '0 auto 4px auto', objectFit: 'contain', display: 'block' }} 
                      />
                    ) : (
                      <div style={{ height: '24px' }}></div>
                    )}
                    <div 
                      className="border-t border-foreground w-40 mx-auto mb-1"
                      style={{ borderTop: '1.5px solid #000000', width: '160px', margin: '0 auto 6px auto' }}
                    ></div>
                    {cPerson ? (
                      <>
                        <p className="text-sm font-semibold" style={{ fontSize: '13px', fontWeight: 700, margin: '2px 0' }}>{cPerson}</p>
                        <p className="text-xs text-muted-foreground" style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{cDesig}</p>
                      </>
                    ) : (
                      <p className="text-sm font-medium" style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0' }}>{cDesig}</p>
                    )}
                  </div>

                  {/* 2. Verifier / Auditor (shown when verifier is present/configured) */}
                  {showVerifier && (
                    <div className="text-center min-w-[140px]" style={{ textAlign: 'center', minWidth: '150px' }}>
                      {verifierAuditor?.signature_url ? (
                        <img 
                          src={verifierAuditor.signature_url} 
                          alt="Signature" 
                          className="h-9 mx-auto mb-1 object-contain" 
                          style={{ height: '36px', margin: '0 auto 4px auto', objectFit: 'contain', display: 'block' }} 
                        />
                      ) : (
                        <div style={{ height: '24px' }}></div>
                      )}
                      <div 
                        className="border-t border-foreground w-40 mx-auto mb-1"
                        style={{ borderTop: '1.5px solid #000000', width: '160px', margin: '0 auto 6px auto' }}
                      ></div>
                      {vPerson ? (
                        <>
                          <p className="text-sm font-semibold" style={{ fontSize: '13px', fontWeight: 700, margin: '2px 0' }}>{vPerson}</p>
                          <p className="text-xs text-muted-foreground" style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{vDesig}</p>
                        </>
                      ) : (
                        <p className="text-sm font-medium" style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0' }}>{vDesig}</p>
                      )}
                    </div>
                  )}

                  {/* 3. Principal / Authorized By */}
                  <div className="text-center min-w-[140px]" style={{ textAlign: 'center', minWidth: '150px' }}>
                    {headOfInstitute?.signature_url ? (
                      <img 
                        src={headOfInstitute.signature_url} 
                        alt="Signature" 
                        className="h-9 mx-auto mb-1 object-contain" 
                        style={{ height: '36px', margin: '0 auto 4px auto', objectFit: 'contain', display: 'block' }} 
                      />
                    ) : (
                      <div style={{ height: '24px' }}></div>
                    )}
                    <div 
                      className="border-t border-foreground w-40 mx-auto mb-1"
                      style={{ borderTop: '1.5px solid #000000', width: '160px', margin: '0 auto 6px auto' }}
                    ></div>
                    {pPerson ? (
                      <>
                        <p className="text-sm font-semibold" style={{ fontSize: '13px', fontWeight: 700, margin: '2px 0' }}>{pPerson}</p>
                        <p className="text-xs text-muted-foreground" style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{pDesig}</p>
                      </>
                    ) : (
                      <p className="text-sm font-medium" style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0' }}>{pDesig}</p>
                    )}
                  </div>
                </div>
              );
            };

            const renderLetterhead = (pageInst: any, pageTitle: string, isSummary: boolean = false) => {
              const pLogo = pageInst?.logo_url || dInstLogo;
              const pName = isSummary && isAllPrint 
                ? (ed.instName || (bn ? 'সকল প্রতিষ্ঠান (একত্রিত হিসাব)' : 'All Institutions (Combined)'))
                : getInstName(pageInst, bn);
              const pAddr = pageInst?.address || dInstAddress;
              const pPhone = pageInst?.phone || dInstPhone;
              const pEmail = pageInst?.email || dInstEmail;
              const pOther = pageInst?.other_info || dInstOther;

              return (
                <div 
                  className="text-center mb-4 border-b-2 border-foreground pb-3 page-header"
                  style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px solid #000000', paddingBottom: '10px' }}
                >
                  {pLogo && (
                    <img 
                      src={pLogo} 
                      alt="Logo" 
                      className="w-16 h-16 object-contain mx-auto mb-1" 
                      style={{ width: '60px', height: '60px', objectFit: 'contain', margin: '0 auto 4px auto', display: 'block' }}
                    />
                  )}
                  <h1 className="text-lg font-bold" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 3px 0', color: '#000000' }}>{pName}</h1>
                  {pAddr && <p className="text-sm" style={{ fontSize: '12px', margin: '1px 0', color: '#334155' }}>{pAddr}</p>}
                  {(pPhone || pEmail) && (
                    <p className="text-xs" style={{ fontSize: '11px', margin: '1px 0', color: '#64748b' }}>
                      {pPhone ? `${bn ? 'ফোন' : 'Phone'}: ${pPhone}` : ''}
                      {pPhone && pEmail ? ' | ' : ''}
                      {pEmail ? `${bn ? 'ইমেইল' : 'Email'}: ${pEmail}` : ''}
                    </p>
                  )}
                  {pOther && <p className="text-xs" style={{ fontSize: '11px', margin: '1px 0', color: '#64748b' }}>{pOther}</p>}
                  
                  <div 
                    className="mt-2.5 pt-2 border-t border-dashed"
                    style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}
                  >
                    <h2 className="text-base font-bold text-primary" style={{ fontSize: '15px', fontWeight: 700, margin: '2px 0', color: '#0f172a' }}>
                      {pageTitle}
                    </h2>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5" style={{ fontSize: '11px', color: '#64748b', margin: '2px 0' }}>
                      {bn ? 'হিসাবের মাস' : 'Report Month'}: <span className="font-bold text-foreground" style={{ fontWeight: 700, color: '#000000' }}>{bn ? selectedMonthName : selectedMonthYear}</span>
                    </p>
                  </div>
                </div>
              );
            };

            return (
              <div id="project-print-content" className="print-section space-y-6">
                {pagesToRender.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground italic bg-muted/20 rounded-xl border">
                    {bn ? 'এই প্রতিষ্ঠানে কোনো ব্যয়ের রেকর্ড নেই।' : 'No expense records found for this period.'}
                  </div>
                ) : (
                  pagesToRender.map((page, pageIndex) => {
                    const pageNum = pageIndex + 1;
                    const totalPagesCount = pagesToRender.length;

                    if (page.type === 'category' || page.type === 'uncategorized') {
                      return (
                        <div
                          key={page.id}
                          className="print-page bg-background border rounded-xl p-6 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 print:min-h-[96vh] flex flex-col justify-between"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            pageBreakAfter: pageIndex === pagesToRender.length - 1 ? 'auto' : 'always',
                            breakAfter: pageIndex === pagesToRender.length - 1 ? 'auto' : 'page',
                            boxSizing: 'border-box'
                          }}
                        >
                          <div>
                            {/* Screen-only Page Tracker */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 mb-3 border-b print:hidden">
                              <span className="font-bold text-primary flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                {bn ? `পৃষ্ঠা ${toBnDigits(pageNum)} / ${toBnDigits(totalPagesCount)}: ${page.categoryName}` : `Page ${pageNum} of ${totalPagesCount}: ${page.categoryName}`}
                              </span>
                              <span className="font-medium bg-muted px-2 py-0.5 rounded text-[11px]">
                                🏢 {getInstName(page.inst, bn)}
                              </span>
                            </div>

                            {renderLetterhead(page.inst, `${bn ? 'হিসাব সারসংক্ষেপ' : 'Expense Summary'} — ${page.categoryName}`)}

                            {ed.extraNote && (
                              <p className="text-xs mb-3 italic border-l-2 border-primary pl-2">{ed.extraNote}</p>
                            )}

                            <table 
                              className="w-full border-collapse border text-xs"
                              style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '10px' }}
                            >
                              <thead>
                                <tr className="bg-muted">
                                  <th className="border p-1.5 text-center w-8">#</th>
                                  <th className="border p-1.5 text-center w-20">{bn ? 'তারিখ' : 'Date'}</th>
                                  <th className="border p-1.5 text-left">{bn ? 'ব্যয়ের বিবরণ' : 'Description'}</th>
                                  <th className="border p-1.5 text-center w-20">{bn ? 'পরিমাণ' : 'Quantity'}</th>
                                  <th className="border p-1.5 text-center w-20">{bn ? 'ব্যয়ের মাধ্যম' : 'Method'}</th>
                                  <th className="border p-1.5 text-center w-24">{bn ? 'মেমো / রশিদ' : 'Memo/Receipt'}</th>
                                  <th className="border p-1.5 text-right w-24">{bn ? 'ব্যয় টাকা (৳)' : 'Amount (৳)'}</th>
                                  <th className="border p-1.5 text-left w-28">{bn ? 'মন্তব্য' : 'Remarks'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {page.items.length === 0 ? (
                                  <tr>
                                    <td colSpan={8} className="border p-4 text-center text-muted-foreground italic">
                                      {bn ? 'এই মাসে এই ক্যাটাগরিতে কোনো ব্যয়ের রেকর্ড নেই।' : 'No expenses recorded in this category for this month.'}
                                    </td>
                                  </tr>
                                ) : (
                                  page.items.map((e: any, i: number) => (
                                    <tr key={e.id}>
                                      <td className="border p-1.5 text-center">{bn ? toBnDigits(i + 1) : i + 1}</td>
                                      <td className="border p-1.5 text-center">{formatDateBn(e.expense_date, bn)}</td>
                                      <td className="border p-1.5 font-medium">{cleanDesc(e.description)}</td>
                                      <td className="border p-1.5 text-center">{bn ? toBnDigits(e.quantity || 1) : (e.quantity || 1)}{getUnit(e.description) ? ` ${getUnit(e.description)}` : ''}</td>
                                      <td className="border p-1.5 text-center">{getMethod(e.description, bn)}</td>
                                      <td className="border p-1.5 text-center font-mono">{getMemo(e.description, bn)}</td>
                                      <td className="border p-1.5 text-right font-semibold">৳{formatNum(Number(e.amount))}</td>
                                      <td className="border p-1.5 text-muted-foreground">{getRemarks(e.description)}</td>
                                    </tr>
                                  ))
                                )}
                                <tr className="font-bold bg-muted/60 border-t-2">
                                  <td colSpan={6} className="border p-2 text-right">
                                    {bn ? `“${page.categoryName}” মোট ব্যয়:` : `Total for ${page.categoryName}:`}
                                  </td>
                                  <td className="border p-2 text-right font-black text-emerald-700 dark:text-emerald-400">
                                    ৳{formatNum(page.subtotal)}
                                  </td>
                                  <td className="border p-2"></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {renderSignatures(page.inst)}
                        </div>
                      );
                    }

                    if (page.type === 'dues') {
                      return (
                        <div
                          key={page.id}
                          className="print-page bg-background border rounded-xl p-6 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 print:min-h-[96vh] flex flex-col justify-between"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            pageBreakAfter: pageIndex === pagesToRender.length - 1 ? 'auto' : 'always',
                            breakAfter: pageIndex === pagesToRender.length - 1 ? 'auto' : 'page',
                            boxSizing: 'border-box'
                          }}
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 mb-3 border-b print:hidden">
                              <span className="font-bold text-amber-600 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                {bn ? `পৃষ্ঠা ${toBnDigits(pageNum)} / ${toBnDigits(totalPagesCount)}: বকেয়া খরচের হিসাব` : `Page ${pageNum} of ${totalPagesCount}: Outstanding Dues`}
                              </span>
                              <span className="font-medium bg-muted px-2 py-0.5 rounded text-[11px]">
                                🏢 {getInstName(page.inst, bn)}
                              </span>
                            </div>

                            {renderLetterhead(page.inst, page.categoryName)}

                            <table 
                              className="w-full border-collapse border text-xs"
                              style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '10px' }}
                            >
                              <thead>
                                <tr className="bg-amber-100/60 dark:bg-amber-950/40">
                                  <th className="border p-1.5 text-center w-8">#</th>
                                  <th className="border p-1.5 text-center w-20">{bn ? 'তারিখ' : 'Date'}</th>
                                  <th className="border p-1.5 text-left">{bn ? 'ব্যয়ের বিবরণ ও পাওনাদার' : 'Description & Vendor'}</th>
                                  <th className="border p-1.5 text-center w-20">{bn ? 'পরিমাণ' : 'Quantity'}</th>
                                  <th className="border p-1.5 text-center w-24">{bn ? 'মেমো / চালান' : 'Memo/Invoice'}</th>
                                  <th className="border p-1.5 text-right w-24">{bn ? 'বকেয়া টাকা (৳)' : 'Due Amount'}</th>
                                  <th className="border p-1.5 text-left w-28">{bn ? 'মন্তব্য' : 'Remarks'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {page.items.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="border p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold italic">
                                      {bn ? '✓ এই প্রতিষ্ঠানে এই মাসে কোনো বকেয়া খরচের হিসাব নেই।' : '✓ No outstanding dues for this institution this month.'}
                                    </td>
                                  </tr>
                                ) : (
                                  page.items.map((due: any, di: number) => (
                                    <tr key={due.id}>
                                      <td className="border p-1.5 text-center">{bn ? toBnDigits(di + 1) : di + 1}</td>
                                      <td className="border p-1.5 text-center">{formatDateBn(due.expense_date, bn)}</td>
                                      <td className="border p-1.5 font-medium">{cleanDesc(due.description)}</td>
                                      <td className="border p-1.5 text-center">{bn ? toBnDigits(due.quantity || 1) : (due.quantity || 1)}{getUnit(due.description) ? ` ${getUnit(due.description)}` : ''}</td>
                                      <td className="border p-1.5 text-center font-mono">{getMemo(due.description, bn)}</td>
                                      <td className="border p-1.5 text-right font-semibold text-amber-700">৳{formatNum(Number(due.amount))}</td>
                                      <td className="border p-1.5 text-muted-foreground">{getRemarks(due.description)}</td>
                                    </tr>
                                  ))
                                )}
                                <tr className="font-bold bg-amber-100/50 dark:bg-amber-950/50 border-t-2">
                                  <td colSpan={5} className="border p-2 text-right">
                                    {bn ? 'মোট বকেয়া টাকা:' : 'Total Outstanding Dues:'}
                                  </td>
                                  <td className="border p-2 text-right font-black text-amber-800 dark:text-amber-400">
                                    ৳{formatNum(page.subtotal)}
                                  </td>
                                  <td className="border p-2"></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {renderSignatures(page.inst)}
                        </div>
                      );
                    }

                    if (page.type === 'bank_deposit') {
                      // 1. Total deposits amount including previous cash
                      let totalDepositAmount = 0;
                      if (previousMonthCash > 0) {
                        totalDepositAmount += previousMonthCash;
                      }
                      deposits.forEach((d: any) => {
                        totalDepositAmount += Number(d.amount || 0);
                      });

                      // 2. Previous arrears deduction
                      let netAvailableFunds = totalDepositAmount;
                      let arrearsDeducted = 0;
                      let remainingDue = previousArrears;

                      if (previousArrears > 0) {
                        if (totalDepositAmount > 0) {
                          arrearsDeducted = Math.min(totalDepositAmount, previousArrears);
                          remainingDue = previousArrears - arrearsDeducted;
                          netAvailableFunds = Math.max(0, totalDepositAmount - arrearsDeducted);
                        } else {
                          netAvailableFunds = 0;
                        }
                      }

                      // 3. Category Breakdown for all institutions (matching Excel buildIncomeWithdrawalSheet)
                      const targetBreakdownInstitutions = isAllPrint ? allInstitutions : (singleInst ? [singleInst] : []);
                      type CategoryRow = {
                        key: string;
                        name: string;
                        amount: number;
                      };
                      const categoryRows: CategoryRow[] = [];
                      let totalExpensesSum = 0;

                      targetBreakdownInstitutions.forEach((inst: any) => {
                        const instName = getInstName(inst, bn);
                        const shortInst = getInstShortName(instName);
                        const instPaidExp = expenses.filter((e: any) => e.institution_id === inst.id && !isUnpaidDue(e.description));
                        
                        const instSpecificCats = (categories || []).filter((c: any) => c.institution_id === inst.id);
                        const targetCats = instSpecificCats.length > 0 ? instSpecificCats : getCategoriesForInst(inst.id);
                        const catsWithExp = (categories || []).filter((c: any) => instPaidExp.some((e: any) => e.category_id === c.id));
                        
                        const seenCatIds = new Set<string>();
                        const finalCats: any[] = [];
                        [...targetCats, ...catsWithExp].forEach((c: any) => {
                          if (c && !seenCatIds.has(c.id)) {
                            seenCatIds.add(c.id);
                            finalCats.push(c);
                          }
                        });

                        finalCats.forEach((cat: any) => {
                          const catExpenses = instPaidExp.filter((e: any) => e.category_id === cat.id);
                          const catTotal = catExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                          if (catTotal === 0 && finalCats.length > 8) return;

                          totalExpensesSum += catTotal;
                          const catName = getCatName(cat, bn);
                          categoryRows.push({
                            key: `${inst.id}-${cat.id}`,
                            name: isAllPrint ? `${shortInst} - ${catName}` : catName,
                            amount: catTotal
                          });
                        });

                        // Check uncategorized expenses for this institution
                        const uncatExp = instPaidExp.filter((e: any) => !e.category_id || !finalCats.some((c: any) => c.id === e.category_id));
                        if (uncatExp.length > 0) {
                          const uncatTotal = uncatExp.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                          totalExpensesSum += uncatTotal;
                          categoryRows.push({
                            key: `${inst.id}-uncat`,
                            name: isAllPrint ? `${shortInst} - ${bn ? 'অন্যান্য / সাধারণ ব্যয়' : 'Other Expenses'}` : (bn ? 'অন্যান্য / সাধারণ ব্যয়' : 'Other Expenses'),
                            amount: uncatTotal
                          });
                        }
                      });

                      // 4. Final Cash Balance = Net Available Funds - Total Expenses
                      const rawCashBalance = netAvailableFunds - totalExpensesSum;
                      const finalCashBalance = rawCashBalance > 0 ? rawCashBalance : 0;
                      const currentShortfall = rawCashBalance < 0 ? Math.abs(rawCashBalance) : 0;
                      const totalArrearsEnd = remainingDue + currentShortfall;

                      return (
                        <div
                          key={page.id}
                          className="print-page bg-background border rounded-xl p-6 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 print:min-h-[96vh] flex flex-col justify-between"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            pageBreakAfter: pageIndex === pagesToRender.length - 1 ? 'auto' : 'always',
                            breakAfter: pageIndex === pagesToRender.length - 1 ? 'auto' : 'page',
                            boxSizing: 'border-box'
                          }}
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 mb-3 border-b print:hidden">
                              <span className="font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                {bn ? `পৃষ্ঠা ${toBnDigits(pageNum)} / ${toBnDigits(totalPagesCount)}: টাকা আয়/উত্তোলন ও ব্যাংক হিসাব বিবরণী` : `Page ${pageNum} of ${totalPagesCount}: Deposit & Bank Statement`}
                              </span>
                              <span className="font-medium bg-muted px-2 py-0.5 rounded text-[11px]">
                                {isAllPrint ? (bn ? 'সকল প্রতিষ্ঠানের ব্যাংক ও তহবিল হিসাব' : 'All Institutions Bank & Fund') : getInstName(page.inst, bn)}
                              </span>
                            </div>

                            {renderLetterhead(page.inst, page.categoryName, isAllPrint)}

                            {/* Excel-identical 6-column statement table */}
                            <div className="mb-4">
                              <table 
                                className="w-full border-collapse border text-xs"
                                style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '6px' }}
                              >
                                <thead>
                                  <tr className="bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200">
                                    <th className="border p-1.5 text-center w-24">{bn ? 'তারিখ' : 'Date'}</th>
                                    <th className="border p-1.5 text-left">{bn ? 'ব্যাংক বিবরণ ও অন্যান্য উৎস' : 'Bank & Source Details'}</th>
                                    <th className="border p-1.5 text-center w-28">{bn ? 'উৎস' : 'Source'}</th>
                                    <th className="border p-1.5 text-right w-28">{bn ? 'টাকা (৳)' : 'Amount (৳)'}</th>
                                    <th className="border p-1.5 text-right w-28">{bn ? 'নগদ আছে (৳)' : 'Cash in Hand (৳)'}</th>
                                    <th className="border p-1.5 text-right w-28">{bn ? 'বকেয়া (৳)' : 'Due (৳)'}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* 1. Opening Cash */}
                                  {previousMonthCash > 0 && (
                                    <tr className="bg-teal-50/50">
                                      <td className="border p-1.5 text-center font-medium">{bn ? '০১ তারিখ' : '01'}</td>
                                      <td className="border p-1.5 font-semibold text-teal-900 dark:text-teal-300">
                                        {bn ? 'গত মাসের খরচ শেষে নগদ আছে (জের)' : 'Last Month Ending Cash in Hand'}
                                      </td>
                                      <td className="border p-1.5 text-center font-medium">{bn ? 'নগদ তহবিল' : 'Cash Fund'}</td>
                                      <td className="border p-1.5 text-right font-bold text-teal-800 dark:text-teal-400">৳{formatNum(previousMonthCash)}</td>
                                      <td className="border p-1.5 text-right font-bold text-teal-800 dark:text-teal-400">৳{formatNum(previousMonthCash)}</td>
                                      <td className="border p-1.5 text-center text-muted-foreground">-</td>
                                    </tr>
                                  )}

                                  {/* 2. Deposit rows */}
                                  {deposits.length === 0 && previousMonthCash <= 0 ? (
                                    <tr>
                                      <td colSpan={6} className="border p-3 text-center text-muted-foreground italic">
                                        {bn ? 'এই মাসে কোনো ব্যাংক জমা বা উত্তোলনের রেকর্ড নেই।' : 'No deposit records found for this period.'}
                                      </td>
                                    </tr>
                                  ) : (
                                    deposits.map((d: any, idx: number) => (
                                      <tr key={d.id || idx}>
                                        <td className="border p-1.5 text-center">{formatDateBn(d.deposit_date, bn)}</td>
                                        <td className="border p-1.5 font-medium">{d.bank_details || d.other_details || d.source || (bn ? 'ব্যাংক জমা' : 'Bank Deposit')}</td>
                                        <td className="border p-1.5 text-center font-medium">{getSourceLabel(d.source, bn, customDepositSources)}</td>
                                        <td className="border p-1.5 text-right font-semibold">৳{formatNum(Number(d.amount))}</td>
                                        <td className="border p-1.5 text-center text-muted-foreground">-</td>
                                        <td className="border p-1.5 text-center text-muted-foreground">-</td>
                                      </tr>
                                    ))
                                  )}

                                  {/* 3. Subtotal for deposits */}
                                  <tr className="font-bold bg-teal-100/60 dark:bg-teal-950/60 border-t-2">
                                    <td className="border p-1.5"></td>
                                    <td className="border p-1.5"></td>
                                    <td className="border p-1.5 text-center font-bold text-teal-900 dark:text-teal-200">
                                      {bn ? 'মোট' : 'Total'}
                                    </td>
                                    <td className="border p-1.5 text-right font-black text-teal-900 dark:text-teal-200">
                                      ৳{formatNum(totalDepositAmount)}
                                    </td>
                                    <td className="border p-1.5"></td>
                                    <td className="border p-1.5"></td>
                                  </tr>

                                  {/* 4. Previous Arrears Deduction */}
                                  {previousArrears > 0 && (
                                    <>
                                      <tr>
                                        <td className="border p-1.5"></td>
                                        <td className="border p-1.5 font-medium text-rose-700">
                                          {bn ? '(-) গত মাসের বকেয়া পরিশোধ বাবদ' : '(-) Previous Month Arrears Settle'}
                                        </td>
                                        <td className="border p-1.5 text-center text-muted-foreground">
                                          {bn ? 'বকেয়া কর্তন' : 'Arrears Deduct'}
                                        </td>
                                        <td className="border p-1.5 text-right font-semibold text-rose-700">
                                          -৳{formatNum(arrearsDeducted)}
                                        </td>
                                        <td className="border p-1.5 text-center text-muted-foreground">-</td>
                                        <td className="border p-1.5 text-right font-semibold text-rose-700">
                                          {remainingDue > 0 ? `৳${formatNum(remainingDue)}` : '-'}
                                        </td>
                                      </tr>
                                      <tr className="bg-muted/40 font-bold">
                                        <td className="border p-1.5"></td>
                                        <td className="border p-1.5"></td>
                                        <td className="border p-1.5 text-center font-bold">
                                          {bn ? 'নিট তহবিল' : 'Net Fund'}
                                        </td>
                                        <td className="border p-1.5 text-right font-bold text-teal-800 dark:text-teal-400">
                                          ৳{formatNum(netAvailableFunds)}
                                        </td>
                                        <td className="border p-1.5"></td>
                                        <td className="border p-1.5"></td>
                                      </tr>
                                    </>
                                  )}

                                  {/* 5. Category Banner */}
                                  <tr className="bg-teal-100/70 dark:bg-teal-950/60 font-bold text-teal-950 dark:text-teal-200">
                                    <td className="border p-1 text-center"></td>
                                    <td colSpan={3} className="border p-1 text-center tracking-wide font-black">
                                      {bn ? 'ক্যাটাগরি' : 'Category'}
                                    </td>
                                    <td className="border p-1 text-center"></td>
                                    <td className="border p-1 text-center"></td>
                                  </tr>

                                  {/* 6. Category breakdown rows */}
                                  {categoryRows.map((catRow) => (
                                    <tr key={catRow.key}>
                                      <td className="border p-1 text-center"></td>
                                      <td className="border p-1 font-medium">{catRow.name}</td>
                                      <td className="border p-1 text-center"></td>
                                      <td className="border p-1 text-right font-semibold">৳{formatNum(catRow.amount)}</td>
                                      <td className="border p-1 text-center text-muted-foreground">-</td>
                                      <td className="border p-1 text-center text-muted-foreground">-</td>
                                    </tr>
                                  ))}

                                  {/* 7. Grand Total Row */}
                                  <tr className="font-black bg-emerald-100/80 dark:bg-emerald-950/80 border-t-2 text-xs">
                                    <td className="border p-2"></td>
                                    <td className="border p-2"></td>
                                    <td className="border p-2 text-center text-foreground font-black">
                                      {bn ? 'মোট ব্যয়' : 'Total Expense'}
                                    </td>
                                    <td className="border p-2 text-right text-foreground font-black">
                                      ৳{formatNum(totalExpensesSum)}
                                    </td>
                                    <td className="border p-2 text-right text-emerald-800 dark:text-emerald-300 font-black">
                                      ৳{formatNum(finalCashBalance)}
                                    </td>
                                    <td className="border p-2 text-right text-rose-700 dark:text-rose-400 font-black">
                                      {totalArrearsEnd > 0 ? `৳${formatNum(totalArrearsEnd)}` : '-'}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {renderSignatures(page.inst)}
                        </div>
                      );
                    }

                    // Master Summary Page
                    return (
                      <div
                        key={page.id}
                        className="print-page bg-background border rounded-xl p-6 shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 print:min-h-[96vh] flex flex-col justify-between"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          pageBreakAfter: pageIndex === pagesToRender.length - 1 ? 'auto' : 'always',
                          breakAfter: pageIndex === pagesToRender.length - 1 ? 'auto' : 'page',
                          boxSizing: 'border-box'
                        }}
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 mb-3 border-b print:hidden">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              {bn ? `পৃষ্ঠা ${toBnDigits(pageNum)} / ${toBnDigits(totalPagesCount)}: সর্বমোট হিসাব ও তহবিল সারসংক্ষেপ` : `Page ${pageNum} of ${totalPagesCount}: Master Summary`}
                            </span>
                            <span className="font-medium bg-muted px-2 py-0.5 rounded text-[11px]">
                              {bn ? 'সারসংক্ষেপ পৃষ্ঠা' : 'Summary Page'}
                            </span>
                          </div>

                          {renderLetterhead(page.inst, page.categoryName, true)}

                          {/* Table 1: Institution Breakdown */}
                          <div className="mb-5">
                            <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-foreground">
                              {bn ? '🏢 প্রতিষ্ঠানভিত্তিক মোট ব্যয়ের সারসংক্ষেপ' : '🏢 Institution Expense Summary'}
                            </h3>
                            <table 
                              className="w-full border-collapse border text-xs"
                              style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '8px' }}
                            >
                              <thead>
                                <tr className="bg-muted">
                                  <th className="border p-1.5 text-center w-10">#</th>
                                  <th className="border p-1.5 text-left">{bn ? 'প্রতিষ্ঠানের নাম' : 'Institution Name'}</th>
                                  <th className="border p-1.5 text-center w-24">{bn ? 'ভাউচার সংখ্যা' : 'Entries'}</th>
                                  <th className="border p-1.5 text-right w-32">{bn ? 'পরিশোধিত ব্যয় (৳)' : 'Paid Expense (৳)'}</th>
                                  <th className="border p-1.5 text-right w-32">{bn ? 'বকেয়া (৳)' : 'Due (৳)'}</th>
                                  <th className="border p-1.5 text-right w-24">{bn ? 'অংশ (%)' : 'Share (%)'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {institutionsToPrint.map((inst: any, idx: number) => {
                                  const instPaidExp = expenses.filter((e: any) => e.institution_id === inst.id && !isUnpaidDue(e.description));
                                  const instDueExp = allExpenses.filter((e: any) => e.institution_id === inst.id && isUnpaidDue(e.description));
                                  const instPaidTot = instPaidExp.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                                  const instDueTot = instDueExp.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                                  const pct = totalPaid > 0 ? ((instPaidTot / totalPaid) * 100).toFixed(1) + '%' : '0%';
                                  return (
                                    <tr key={inst.id}>
                                      <td className="border p-1.5 text-center">{bn ? toBnDigits(idx + 1) : idx + 1}</td>
                                      <td className="border p-1.5 font-medium">{getInstName(inst, bn)}</td>
                                      <td className="border p-1.5 text-center">{bn ? toBnDigits(instPaidExp.length) : instPaidExp.length}</td>
                                      <td className="border p-1.5 text-right font-semibold">৳{formatNum(instPaidTot)}</td>
                                      <td className="border p-1.5 text-right font-semibold text-amber-700">৳{formatNum(instDueTot)}</td>
                                      <td className="border p-1.5 text-right">{bn ? toBnDigits(pct) : pct}</td>
                                    </tr>
                                  );
                                })}
                                <tr className="font-bold bg-muted/70 border-t-2">
                                  <td colSpan={2} className="border p-2 text-right">{bn ? 'সর্বমোট:' : 'Grand Total:'}</td>
                                  <td className="border p-2 text-center">{bn ? toBnDigits(expenses.filter((e: any) => !isUnpaidDue(e.description)).length) : expenses.filter((e: any) => !isUnpaidDue(e.description)).length}</td>
                                  <td className="border p-2 text-right font-black text-emerald-700 dark:text-emerald-400">৳{formatNum(totalPaid)}</td>
                                  <td className="border p-2 text-right font-black text-amber-700">৳{formatNum(allExpenses.filter((e: any) => isUnpaidDue(e.description)).reduce((s: number, e: any) => s + Number(e.amount || 0), 0))}</td>
                                  <td className="border p-2 text-right">{bn ? '১০০%' : '100%'}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Table 2: Financial Statement (Cash, Deposit, Arrears) */}
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-foreground">
                              {bn ? '💰 নগদ তহবিল ও জমার অবস্থা (ক্যাশ ব্যালেন্স)' : '💰 Cash & Fund Status'}
                            </h3>
                            <table 
                              className="w-full border-collapse border text-xs"
                              style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '8px' }}
                            >
                              <tbody>
                                <tr>
                                  <td className="border p-2 font-medium bg-muted/40 w-1/2">{bn ? 'মোট পরিশোধিত ব্যয়' : 'Total Expense Paid'}</td>
                                  <td className="border p-2 text-right font-bold text-rose-700 dark:text-rose-400">৳{formatNum(monthlyTotalExpense)}</td>
                                </tr>
                                <tr>
                                  <td className="border p-2 font-medium bg-muted/40">{bn ? 'মোট টাকা আয় / উত্তোলন' : 'Total Deposits & Income'}</td>
                                  <td className="border p-2 text-right font-bold text-emerald-700 dark:text-emerald-400">৳{formatNum(monthlyTotalDeposit)}</td>
                                </tr>
                                <tr>
                                  <td className="border p-2 font-medium bg-muted/40">{bn ? 'পূর্ববর্তী বকেয়া (জের)' : 'Previous Arrears / Due'}</td>
                                  <td className="border p-2 text-right font-bold text-amber-700">৳{formatNum(previousArrears)}</td>
                                </tr>
                                <tr className="font-black bg-muted/70 text-sm">
                                  <td className="border p-2">{bn ? 'অবশিষ্ট নগদ তহবিল (ক্যাশ জের)' : 'Closing Cash in Hand'}</td>
                                  <td className="border p-2 text-right text-emerald-800 dark:text-emerald-300">৳{formatNum(monthlyCash)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {renderSignatures(page.inst)}
                      </div>
                    );
                  })
                )}
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
                const title = `${bn ? 'সকল প্রতিষ্ঠানের হিসাব প্রতিবেদন' : 'All Institutions Expense Report'} - ${bn ? selectedMonthName : selectedMonthYear}`;
                printDocumentHtml(content.innerHTML, title);
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
                    reportSubtitle: '',
                    casherName: depositPrintEditData.casherName || summaryData?.casher_name || selectedInst?.accountant_name || accountantCashier?.person_name_bn || '',
                    casherDesignation: depositPrintEditData.casherDesignation || selectedInst?.accountant_designation || accountantCashier?.person_designation_bn || (bn ? 'ক্যাশিয়ার / প্রস্তুতকারী' : 'Cashier / Prepared By'),
                    verifierName: depositPrintEditData.verifierName || selectedInst?.verifier_name || verifierAuditor?.person_name_bn || '',
                    verifierDesignation: depositPrintEditData.verifierDesignation || selectedInst?.verifier_designation || verifierAuditor?.person_designation_bn || (bn ? 'যাচাইকারী / নিরীক্ষক' : 'Verified By / Auditor'),
                    principalName: depositPrintEditData.principalName || summaryData?.principal_name || selectedInst?.principal_name || headOfInstitute?.person_name_bn || '',
                    principalDesignation: depositPrintEditData.principalDesignation || selectedInst?.principal_designation || headOfInstitute?.person_designation_bn || (bn ? 'মুহতামিম / অধ্যক্ষ' : 'Principal / Authorized By'),
                    extraNote: depositPrintEditData.extraNote || ''
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

              {/* Signatories Formula Inputs */}
              <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
                <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <span>✍️ {bn ? 'স্বাক্ষরকারীদের নাম ও পদবি (পৃষ্ঠা ফর্মুলা)' : 'Signatories Name & Designation (Page Formula)'}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>{bn ? 'ক্যাশিয়ার / প্রস্তুতকারীর নাম' : 'Cashier / Prepared By Name'}</Label>
                    <Input value={depositPrintEditData.casherName} onChange={e => setDepositPrintEditData(p => ({ ...p, casherName: e.target.value }))} placeholder={bn ? 'নাম লিখুন' : 'Enter name'} />
                  </div>
                  <div>
                    <Label>{bn ? 'ক্যাশিয়ারের পদবি' : 'Cashier Designation'}</Label>
                    <Input value={depositPrintEditData.casherDesignation} onChange={e => setDepositPrintEditData(p => ({ ...p, casherDesignation: e.target.value }))} placeholder={bn ? 'যেমন: ক্যাশিয়ার / হিসাবরক্ষক' : 'e.g. Cashier'} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>{bn ? 'যাচাইকারী / নিরীক্ষকের নাম' : 'Verifier / Auditor Name'}</Label>
                    <Input value={depositPrintEditData.verifierName} onChange={e => setDepositPrintEditData(p => ({ ...p, verifierName: e.target.value }))} placeholder={bn ? 'নাম লিখুন (ঐচ্ছিক)' : 'Enter name (Optional)'} />
                  </div>
                  <div>
                    <Label>{bn ? 'যাচাইকারীর পদবি' : 'Verifier Designation'}</Label>
                    <Input value={depositPrintEditData.verifierDesignation} onChange={e => setDepositPrintEditData(p => ({ ...p, verifierDesignation: e.target.value }))} placeholder={bn ? 'যেমন: যাচাইকারী / নিরীক্ষক' : 'e.g. Auditor'} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>{bn ? 'প্রতিষ্ঠান প্রধান / অধ্যক্ষের নাম' : 'Principal / Head Name'}</Label>
                    <Input value={depositPrintEditData.principalName} onChange={e => setDepositPrintEditData(p => ({ ...p, principalName: e.target.value }))} placeholder={bn ? 'নাম লিখুন' : 'Enter name'} />
                  </div>
                  <div>
                    <Label>{bn ? 'প্রতিষ্ঠান প্রধানের পদবি' : 'Principal Designation'}</Label>
                    <Input value={depositPrintEditData.principalDesignation} onChange={e => setDepositPrintEditData(p => ({ ...p, principalDesignation: e.target.value }))} placeholder={bn ? 'যেমন: মুহতামিম / অধ্যক্ষ' : 'e.g. Principal / Muhtamim'} />
                  </div>
                </div>
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

              {(() => {
                let totalDepositAmount = 0;
                if (previousMonthCash > 0) totalDepositAmount += previousMonthCash;
                deposits.forEach((d: any) => { totalDepositAmount += Number(d.amount || 0); });

                let netAvailableFunds = totalDepositAmount;
                let arrearsDeducted = 0;
                let remainingDue = previousArrears;
                if (previousArrears > 0) {
                  if (totalDepositAmount > 0) {
                    arrearsDeducted = Math.min(totalDepositAmount, previousArrears);
                    remainingDue = previousArrears - arrearsDeducted;
                    netAvailableFunds = Math.max(0, totalDepositAmount - arrearsDeducted);
                  } else {
                    netAvailableFunds = 0;
                  }
                }

                type CategoryRow = { key: string; name: string; amount: number; };
                const categoryRows: CategoryRow[] = [];
                let totalExpensesSum = 0;

                allInstitutions.forEach((inst: any) => {
                  const instName = getInstName(inst, bn);
                  const shortInst = getInstShortName(instName);
                  const instPaidExp = expenses.filter((e: any) => e.institution_id === inst.id && !isUnpaidDue(e.description));
                  
                  const instSpecificCats = (categories || []).filter((c: any) => c.institution_id === inst.id);
                  const targetCats = instSpecificCats.length > 0 ? instSpecificCats : getCategoriesForInst(inst.id);
                  const catsWithExp = (categories || []).filter((c: any) => instPaidExp.some((e: any) => e.category_id === c.id));
                  
                  const seenCatIds = new Set<string>();
                  const finalCats: any[] = [];
                  [...targetCats, ...catsWithExp].forEach((c: any) => {
                    if (c && !seenCatIds.has(c.id)) {
                      seenCatIds.add(c.id);
                      finalCats.push(c);
                    }
                  });

                  finalCats.forEach((cat: any) => {
                    const catExpenses = instPaidExp.filter((e: any) => e.category_id === cat.id);
                    const catTotal = catExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                    if (catTotal === 0 && finalCats.length > 8) return;

                    totalExpensesSum += catTotal;
                    const catName = getCatName(cat, bn);
                    categoryRows.push({
                      key: `${inst.id}-${cat.id}`,
                      name: `${shortInst} - ${catName}`,
                      amount: catTotal
                    });
                  });

                  const uncatExp = instPaidExp.filter((e: any) => !e.category_id || !finalCats.some((c: any) => c.id === e.category_id));
                  if (uncatExp.length > 0) {
                    const uncatTotal = uncatExp.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                    totalExpensesSum += uncatTotal;
                    categoryRows.push({
                      key: `${inst.id}-uncat`,
                      name: `${shortInst} - ${bn ? 'অন্যান্য / সাধারণ ব্যয়' : 'Other Expenses'}`,
                      amount: uncatTotal
                    });
                  }
                });

                const rawCashBalance = netAvailableFunds - totalExpensesSum;
                const finalCashBalance = rawCashBalance > 0 ? rawCashBalance : 0;
                const currentShortfall = rawCashBalance < 0 ? Math.abs(rawCashBalance) : 0;
                const totalArrearsEnd = remainingDue + currentShortfall;

                return (
                  <table className="w-full border-collapse border text-xs" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '6px' }}>
                    <thead>
                      <tr className="bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200">
                        <th className="border p-1.5 text-center w-24">{bn ? 'তারিখ' : 'Date'}</th>
                        <th className="border p-1.5 text-left">{bn ? 'ব্যাংক বিবরণ ও অন্যান্য উৎস' : 'Bank & Source Details'}</th>
                        <th className="border p-1.5 text-center w-28">{bn ? 'উৎস' : 'Source'}</th>
                        <th className="border p-1.5 text-right w-28">{bn ? 'টাকা (৳)' : 'Amount (৳)'}</th>
                        <th className="border p-1.5 text-right w-28">{bn ? 'নগদ আছে (৳)' : 'Cash in Hand (৳)'}</th>
                        <th className="border p-1.5 text-right w-28">{bn ? 'বকেয়া (৳)' : 'Due (৳)'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previousMonthCash > 0 && (
                        <tr className="bg-teal-50/50">
                          <td className="border p-1.5 text-center font-medium">{bn ? '০১ তারিখ' : '01'}</td>
                          <td className="border p-1.5 font-semibold text-teal-900 dark:text-teal-300">{bn ? 'গত মাসের খরচ শেষে নগদ আছে (জের)' : 'Last Month Ending Cash in Hand'}</td>
                          <td className="border p-1.5 text-center font-medium">{bn ? 'নগদ তহবিল' : 'Cash Fund'}</td>
                          <td className="border p-1.5 text-right font-bold text-teal-800 dark:text-teal-400">৳{formatNum(previousMonthCash)}</td>
                          <td className="border p-1.5 text-right font-bold text-teal-800 dark:text-teal-400">৳{formatNum(previousMonthCash)}</td>
                          <td className="border p-1.5 text-center text-muted-foreground">-</td>
                        </tr>
                      )}
                      {deposits.length === 0 && previousMonthCash <= 0 ? (
                        <tr>
                          <td colSpan={6} className="border p-3 text-center text-muted-foreground italic">
                            {bn ? 'এই মাসে কোনো ব্যাংক জমা বা উত্তোলনের রেকর্ড নেই।' : 'No deposit records found for this period.'}
                          </td>
                        </tr>
                      ) : (
                        deposits.map((d: any, idx: number) => (
                          <tr key={d.id || idx}>
                            <td className="border p-1.5 text-center">{formatDateBn(d.deposit_date, bn)}</td>
                            <td className="border p-1.5 font-medium">{d.bank_details || d.other_details || d.source || (bn ? 'ব্যাংক জমা' : 'Bank Deposit')}</td>
                            <td className="border p-1.5 text-center font-medium">{getSourceLabel(d.source, bn, customDepositSources)}</td>
                            <td className="border p-1.5 text-right font-semibold">৳{formatNum(Number(d.amount))}</td>
                            <td className="border p-1.5 text-center text-muted-foreground">-</td>
                            <td className="border p-1.5 text-center text-muted-foreground">-</td>
                          </tr>
                        ))
                      )}
                      <tr className="font-bold bg-teal-100/60 dark:bg-teal-950/60 border-t-2">
                        <td className="border p-1.5"></td>
                        <td className="border p-1.5"></td>
                        <td className="border p-1.5 text-center font-bold text-teal-900 dark:text-teal-200">{bn ? 'মোট' : 'Total'}</td>
                        <td className="border p-1.5 text-right font-black text-teal-900 dark:text-teal-200">৳{formatNum(totalDepositAmount)}</td>
                        <td className="border p-1.5"></td>
                        <td className="border p-1.5"></td>
                      </tr>
                      {previousArrears > 0 && (
                        <>
                          <tr>
                            <td className="border p-1.5"></td>
                            <td className="border p-1.5 font-medium text-rose-700">{bn ? '(-) গত মাসের বকেয়া পরিশোধ বাবদ' : '(-) Previous Month Arrears Settle'}</td>
                            <td className="border p-1.5 text-center text-muted-foreground">{bn ? 'বকেয়া কর্তন' : 'Arrears Deduct'}</td>
                            <td className="border p-1.5 text-right font-semibold text-rose-700">-৳{formatNum(arrearsDeducted)}</td>
                            <td className="border p-1.5 text-center text-muted-foreground">-</td>
                            <td className="border p-1.5 text-right font-semibold text-rose-700">{remainingDue > 0 ? `৳${formatNum(remainingDue)}` : '-'}</td>
                          </tr>
                          <tr className="bg-muted/40 font-bold">
                            <td className="border p-1.5"></td>
                            <td className="border p-1.5"></td>
                            <td className="border p-1.5 text-center font-bold">{bn ? 'নিট তহবিল' : 'Net Fund'}</td>
                            <td className="border p-1.5 text-right font-bold text-teal-800 dark:text-teal-400">৳{formatNum(netAvailableFunds)}</td>
                            <td className="border p-1.5"></td>
                            <td className="border p-1.5"></td>
                          </tr>
                        </>
                      )}
                      <tr className="bg-teal-100/70 dark:bg-teal-950/60 font-bold text-teal-950 dark:text-teal-200">
                        <td className="border p-1 text-center"></td>
                        <td colSpan={3} className="border p-1 text-center tracking-wide font-black">{bn ? 'ক্যাটাগরি' : 'Category'}</td>
                        <td className="border p-1 text-center"></td>
                        <td className="border p-1 text-center"></td>
                      </tr>
                      {categoryRows.map((catRow) => (
                        <tr key={catRow.key}>
                          <td className="border p-1 text-center"></td>
                          <td className="border p-1 font-medium">{catRow.name}</td>
                          <td className="border p-1 text-center"></td>
                          <td className="border p-1 text-right font-semibold">৳{formatNum(catRow.amount)}</td>
                          <td className="border p-1 text-center text-muted-foreground">-</td>
                          <td className="border p-1 text-center text-muted-foreground">-</td>
                        </tr>
                      ))}
                      <tr className="font-black bg-emerald-100/80 dark:bg-emerald-950/80 border-t-2 text-xs">
                        <td className="border p-2"></td>
                        <td className="border p-2"></td>
                        <td className="border p-2 text-center text-foreground font-black">{bn ? 'মোট ব্যয়' : 'Total Expense'}</td>
                        <td className="border p-2 text-right text-foreground font-black">৳{formatNum(totalExpensesSum)}</td>
                        <td className="border p-2 text-right text-emerald-800 dark:text-emerald-300 font-black">৳{formatNum(finalCashBalance)}</td>
                        <td className="border p-2 text-right text-rose-700 dark:text-rose-400 font-black">{totalArrearsEnd > 0 ? `৳${formatNum(totalArrearsEnd)}` : '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                );
              })()}

              {(() => {
                const dCasherPerson = (
                  depositPrintEditData.casherName ||
                  summaryData?.casher_name ||
                  selectedInst?.accountant_name ||
                  accountantCashier?.person_name_bn ||
                  ''
                ).trim();

                const dCasherTitle = (
                  depositPrintEditData.casherDesignation ||
                  selectedInst?.accountant_designation ||
                  accountantCashier?.person_designation_bn ||
                  (bn ? 'ক্যাশিয়ার / প্রস্তুতকারী' : 'Cashier / Prepared By')
                ).trim();

                const dVerifierPerson = (
                  depositPrintEditData.verifierName ||
                  selectedInst?.verifier_name ||
                  verifierAuditor?.person_name_bn ||
                  ''
                ).trim();

                const dVerifierTitle = (
                  depositPrintEditData.verifierDesignation ||
                  selectedInst?.verifier_designation ||
                  verifierAuditor?.person_designation_bn ||
                  (bn ? 'যাচাইকারী / নিরীক্ষক' : 'Verified By / Auditor')
                ).trim();

                const dPrincipalPerson = (
                  depositPrintEditData.principalName ||
                  summaryData?.principal_name ||
                  selectedInst?.principal_name ||
                  headOfInstitute?.person_name_bn ||
                  ''
                ).trim();

                const dPrincipalTitle = (
                  depositPrintEditData.principalDesignation ||
                  selectedInst?.principal_designation ||
                  headOfInstitute?.person_designation_bn ||
                  (bn ? 'মুহতামিম / অধ্যক্ষ' : 'Principal / Authorized By')
                ).trim();

                const showVerifier = Boolean(dVerifierPerson || verifierAuditor?.is_active || selectedInst?.verifier_name);

                return (
                  <div 
                    className="flex justify-between items-end mt-12 pt-8"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      width: '100%',
                      marginTop: '36px',
                      paddingTop: '16px',
                      borderTop: '1px solid #cbd5e1',
                      pageBreakInside: 'avoid'
                    }}
                  >
                    {/* 1. Cashier / Prepared By */}
                    <div className="text-center min-w-[140px]" style={{ textAlign: 'center', minWidth: '150px' }}>
                      {accountantCashier?.signature_url ? (
                        <img 
                          src={accountantCashier.signature_url} 
                          alt="Signature" 
                          className="h-9 mx-auto mb-1 object-contain" 
                          style={{ height: '36px', margin: '0 auto 4px auto', objectFit: 'contain', display: 'block' }} 
                        />
                      ) : (
                        <div style={{ height: '24px' }}></div>
                      )}
                      <div 
                        className="border-t border-foreground w-40 mx-auto mb-1"
                        style={{ borderTop: '1.5px solid #000000', width: '160px', margin: '0 auto 6px auto' }}
                      ></div>
                      {dCasherPerson ? (
                        <>
                          <p className="text-sm font-semibold" style={{ fontSize: '13px', fontWeight: 700, margin: '2px 0' }}>{dCasherPerson}</p>
                          <p className="text-xs text-muted-foreground" style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{dCasherTitle}</p>
                        </>
                      ) : (
                        <p className="text-sm font-medium" style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0' }}>{dCasherTitle}</p>
                      )}
                    </div>

                    {/* 2. Verifier / Auditor (shown when verifier is present/configured) */}
                    {showVerifier && (
                      <div className="text-center min-w-[140px]" style={{ textAlign: 'center', minWidth: '150px' }}>
                        {verifierAuditor?.signature_url ? (
                          <img 
                            src={verifierAuditor.signature_url} 
                            alt="Signature" 
                            className="h-9 mx-auto mb-1 object-contain" 
                            style={{ height: '36px', margin: '0 auto 4px auto', objectFit: 'contain', display: 'block' }} 
                          />
                        ) : (
                          <div style={{ height: '24px' }}></div>
                        )}
                        <div 
                          className="border-t border-foreground w-40 mx-auto mb-1"
                          style={{ borderTop: '1.5px solid #000000', width: '160px', margin: '0 auto 6px auto' }}
                        ></div>
                        {dVerifierPerson ? (
                          <>
                            <p className="text-sm font-semibold" style={{ fontSize: '13px', fontWeight: 700, margin: '2px 0' }}>{dVerifierPerson}</p>
                            <p className="text-xs text-muted-foreground" style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{dVerifierTitle}</p>
                          </>
                        ) : (
                          <p className="text-sm font-medium" style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0' }}>{dVerifierTitle}</p>
                        )}
                      </div>
                    )}

                    {/* 3. Principal / Authorized By */}
                    <div className="text-center min-w-[140px]" style={{ textAlign: 'center', minWidth: '150px' }}>
                      {headOfInstitute?.signature_url ? (
                        <img 
                          src={headOfInstitute.signature_url} 
                          alt="Signature" 
                          className="h-9 mx-auto mb-1 object-contain" 
                          style={{ height: '36px', margin: '0 auto 4px auto', objectFit: 'contain', display: 'block' }} 
                        />
                      ) : (
                        <div style={{ height: '24px' }}></div>
                      )}
                      <div 
                        className="border-t border-foreground w-40 mx-auto mb-1"
                        style={{ borderTop: '1.5px solid #000000', width: '160px', margin: '0 auto 6px auto' }}
                      ></div>
                      {dPrincipalPerson ? (
                        <>
                          <p className="text-sm font-semibold" style={{ fontSize: '13px', fontWeight: 700, margin: '2px 0' }}>{dPrincipalPerson}</p>
                          <p className="text-xs text-muted-foreground" style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{dPrincipalTitle}</p>
                        </>
                      ) : (
                        <p className="text-sm font-medium" style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0' }}>{dPrincipalTitle}</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setDepositPrintPreview(false); setDepositPrintEditMode(false); }}>{bn ? 'বন্ধ করুন' : 'Close'}</Button>
            {!depositPrintEditMode && (
              <Button onClick={() => {
                const content = document.getElementById('deposit-print-preview-content');
                if (!content) return;
                const title = bn ? 'টাকা আয়/উত্তোলন প্রতিবেদন' : 'Deposit Report';
                printDocumentHtml(content.innerHTML, title);
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
