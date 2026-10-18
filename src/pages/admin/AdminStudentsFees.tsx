import AdminLayout from '@/components/AdminLayout';
import TabContainer from '@/components/TabContainer';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { CreditCard, Loader2, CheckCircle, ArrowRight, ExternalLink, Search, User, Banknote, Globe, AlertCircle, Settings, BarChart3, Users, Clock, X, Receipt, AlertTriangle, Calendar, GraduationCap, RefreshCw } from 'lucide-react';
import DuesManagement from '@/components/fees/DuesManagement';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import FeeReceiptDownload from '@/components/fees/FeeReceiptDownload';
import CollectorSelector from '@/components/fees/CollectorSelector';
import { EmbeddedProvider } from '@/contexts/EmbeddedContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { cleanRoleSuffix } from '@/lib/paymentUtils';

const LazyPaymentDashboard = lazy(() => import('@/pages/admin/AdminPayments'));

type PaymentMethod = 'cash' | 'online';

const generateTransactionId = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const timeSuffix = Date.now().toString().slice(-4);
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `STU-${y}${m}${d}-${timeSuffix}${rand}`;
};

type SearchMode = 'registration' | 'session_roll';

const AdminStudentsFees = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { checkApproval } = useApprovalCheck('/admin/students-fees', 'payments');
  const { isFeatureAllowed, canApproveItem } = usePagePermissions('/admin/students-fees');
  const [feeType, setFeeType] = useState('');
  const [selectedFeeTypeObj, setSelectedFeeTypeObj] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [step, setStep] = useState<'form' | 'summary' | 'done'>('form');
  const [paymentMonth, setPaymentMonth] = useState('');
  const [paymentYear, setPaymentYear] = useState<number>(new Date().getFullYear());
  const [transactionId, setTransactionId] = useState('');
  const [customCollector, setCustomCollector] = useState<string>('');

  // Student search (Session Year, Class, Roll / Reg)
  const [searchSessionId, setSearchSessionId] = useState('');
  const [searchClassId, setSearchClassId] = useState('all');
  const [searchIdentifier, setSearchIdentifier] = useState('');
  const [foundStudent, setFoundStudent] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  // Search history
  const HISTORY_KEY = 'fee_search_history';
  const MAX_HISTORY = 8;
  const [searchHistory, setSearchHistory] = useState<{ value: string; label: string; time: number }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      setSearchHistory(saved);
    } catch { setSearchHistory([]); }
  }, []);

  const addToHistory = useCallback((value: string, label: string) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.value !== value);
      const next = [{ value, label, time: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFromHistory = useCallback((value: string) => {
    setSearchHistory(prev => {
      const next = prev.filter(h => h.value !== value);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Close history dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) setShowHistory(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: sessions = [] } = useQuery({
    queryKey: ['academic_sessions_fee'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_sessions').select('*').eq('is_active', true).order('name');
      return data || [];
    },
  });

  // Classes
  const { data: classes = [] } = useQuery({
    queryKey: ['classes_fee_collection'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, name_bn, division_id, sort_order')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Auto-select active session if none selected
  useEffect(() => {
    if (sessions.length > 0 && !searchSessionId) {
      const active = sessions.find((s: any) => s.is_active) || sessions[0];
      if (active) setSearchSessionId(active.id);
    }
  }, [sessions, searchSessionId]);

  // Fetch dynamic fee types from fee_types table
  const { data: dbFeeTypes = [] } = useQuery({
    queryKey: ['fee_types_for_collection'],
    queryFn: async () => {
      const { data } = await supabase.from('fee_types').select('*, divisions(name_bn), classes(name_bn)').eq('is_active', true).order('fee_category').order('name_bn');
      return data || [];
    },
  });

  // Bengali month names
  const MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Fetch existing fee_payments for found student to show paid status
  const { data: studentFeePayments = [] } = useQuery({
    queryKey: ['student_fee_payments_status', foundStudent?.id],
    queryFn: async () => {
      if (!foundStudent?.id) return [];
      const { data } = await supabase.from('fee_payments').select('fee_type_id, status, paid_amount, month, year').eq('student_id', foundStudent.id).in('status', ['paid', 'unpaid']);
      return data || [];
    },
    enabled: !!foundStudent?.id,
  });

  const paidFeeTypeIds = new Set(studentFeePayments.filter((p: any) => p.status === 'paid').map((p: any) => p.fee_type_id));

  // Build monthly payment status map: { feeTypeId: { "monthName-year": status } }
  const monthlyPaymentMap: Record<string, Record<string, string>> = {};
  studentFeePayments.forEach((p: any) => {
    if (p.month && p.year) {
      if (!monthlyPaymentMap[p.fee_type_id]) monthlyPaymentMap[p.fee_type_id] = {};
      monthlyPaymentMap[p.fee_type_id][`${p.month}-${p.year}`] = p.status;
    }
  });

  // Get session date range for fee type
  const getSessionDateRange = (feeTypeId: string) => {
    const ftObj = dbFeeTypes.find((ft: any) => ft.id === feeTypeId);
    const session = sessions.find((s: any) => s.id === ftObj?.session_id);
    if (session?.start_date && session?.end_date) {
      return { startDate: new Date(session.start_date), endDate: new Date(session.end_date) };
    }
    // Fallback: current year Jan-Dec
    const now = new Date();
    return { startDate: new Date(now.getFullYear(), 0, 1), endDate: new Date(now.getFullYear(), 11, 31) };
  };

  // Get monthly fee status for a given fee type (session-aware, multi-year)
  type MonthStatus = 'paid' | 'due' | 'unpaid' | 'upcoming' | 'na';
  type MonthStatusItem = { month: string; monthBn: string; year: number; status: MonthStatus };
  const getMonthlyStatuses = (feeTypeId: string): MonthStatusItem[] => {
    const now = new Date();
    const ftObj = dbFeeTypes.find((ft: any) => ft.id === feeTypeId);
    const applicableMonths: string[] | null = ftObj?.applicable_months && Array.isArray(ftObj.applicable_months) ? (ftObj.applicable_months as any[]).map(String) : null;
    const { startDate, endDate } = getSessionDateRange(feeTypeId);

    // Determine admission date — use session start if admission is within the same session
    let admissionDate: Date | null = null;
    if (foundStudent?.admission_date) {
      const ad = new Date(foundStudent.admission_date + 'T00:00:00');
      if (!isNaN(ad.getTime())) {
        // If admission is within the session range, don't skip earlier session months
        // Only mark as 'na' if admission is after the session started (for mid-session joins)
        if (ad > startDate) {
          admissionDate = ad;
        }
      }
    }

    // Build month list from session start to end
    const results: MonthStatusItem[] = [];
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endLimit = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (cursor <= endLimit) {
      const monthIndex = cursor.getMonth();
      const year = cursor.getFullYear();
      const monthEn = MONTHS_EN[monthIndex];
      const monthBn = MONTHS_BN[monthIndex];

      // Before admission month → na (only for mid-session admissions)
      if (admissionDate && cursor < new Date(admissionDate.getFullYear(), admissionDate.getMonth(), 1)) {
        results.push({ month: monthEn, monthBn, year, status: 'na' });
        cursor.setMonth(cursor.getMonth() + 1);
        continue;
      }

      // Not in applicable months → na (supports both "January" and "January-2026" formats)
      if (applicableMonths && !applicableMonths.includes(monthEn) && !applicableMonths.includes(`${monthEn}-${year}`)) {
        results.push({ month: monthEn, monthBn, year, status: 'na' });
        cursor.setMonth(cursor.getMonth() + 1);
        continue;
      }

      const key = `${monthEn}-${year}`;
      const existingStatus = monthlyPaymentMap[feeTypeId]?.[key];
      if (existingStatus === 'paid') {
        results.push({ month: monthEn, monthBn, year, status: 'paid' });
      } else if (cursor < new Date(now.getFullYear(), now.getMonth(), 1)) {
        results.push({ month: monthEn, monthBn, year, status: 'due' });
      } else if (cursor.getFullYear() === now.getFullYear() && cursor.getMonth() === now.getMonth()) {
        results.push({ month: monthEn, monthBn, year, status: 'unpaid' });
      } else {
        results.push({ month: monthEn, monthBn, year, status: 'upcoming' });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return results;
  };

  // Filter fee types based on found student's division/class
  const applicableFeeTypes = foundStudent
    ? dbFeeTypes.filter((ft: any) => {
        if (ft.division_id && ft.division_id !== foundStudent.division_id) return false;
        if (ft.class_id && ft.class_id !== foundStudent.class_id) return false;
        return true;
      })
    : dbFeeTypes;

  // Check for existing pending/approved payment for selected student + fee type + month
  const { data: existingPayment, isLoading: checkingExisting } = useQuery({
    queryKey: ['existing_payment_check', foundStudent?.id, feeType, selectedFeeTypeObj?.name_bn, paymentMonth, paymentYear],
    queryFn: async () => {
      if (!foundStudent?.id || !selectedFeeTypeObj) return null;
      // For monthly fees, check fee_payments table by fee_type_id + month
      if (selectedFeeTypeObj.payment_frequency === 'monthly' && paymentMonth) {
        const { data, error } = await supabase
          .from('fee_payments')
          .select('id, status, paid_amount, month, year')
          .eq('student_id', foundStudent.id)
          .eq('fee_type_id', feeType)
          .eq('month', paymentMonth)
          .eq('year', paymentYear)
          .in('status', ['paid'])
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return data;
      }
      // For one-time fees, check payments table
      const feeTypeName = selectedFeeTypeObj.name_bn || selectedFeeTypeObj.name;
      const { data, error } = await supabase
        .from('payments')
        .select('id, status, transaction_id, amount, created_at, notes')
        .eq('student_id', foundStudent.id)
        .eq('fee_type', feeTypeName)
        .in('status', ['pending', 'success'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!foundStudent?.id && !!selectedFeeTypeObj,
  });

  const isPaymentBlocked = !!existingPayment;
  const blockedStatus = existingPayment?.status; // 'pending' or 'success' or 'paid'


  const { data: gatewayConfig } = useQuery({
    queryKey: ['payment_gateway_config_check'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payment_gateway_config')
        .select('id, provider, provider_name, is_enabled')
        .eq('is_enabled', true)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
  const isGatewayReady = !!gatewayConfig;

  // Get logged-in user's staff/profile name for collector
  const { data: collectorName = '' } = useQuery({
    queryKey: ['collector_name', user?.id],
    queryFn: async () => {
      if (!user?.id) return '';
      // Try staff table first
      const { data: staffData } = await supabase
        .from('staff')
        .select('name_bn, name_en')
        .eq('user_id', user.id)
        .maybeSingle();
      if (staffData) return cleanRoleSuffix(staffData.name_bn || staffData.name_en || '');
      // Fallback to profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      return cleanRoleSuffix(profile?.full_name || user.email || '');
    },
    enabled: !!user?.id,
  });

  const searchStudent = async () => {
    const rawVal = searchIdentifier.trim();
    if (!rawVal) {
      toast.error(bn ? 'রোল বা রেজিস্ট্রেশন নম্বর দিন' : 'Enter roll or registration number');
      return;
    }

    setSearching(true);
    setFoundStudent(null);
    try {
      const normVal = rawVal.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));

      let query = supabase
        .from('students')
        .select('*, classes:class_id(id, name, name_bn), divisions:division_id(id, name, name_bn), academic_sessions:session_id(id, name, name_bn)')
        .is('deleted_at', null)
        .or('status.eq.active,status.is.null');

      if (searchSessionId && searchSessionId !== 'all') {
        query = query.eq('session_id', searchSessionId);
      }

      if (searchClassId && searchClassId !== 'all') {
        query = query.eq('class_id', searchClassId);
      }

      query = query.or(
        `registration_no.eq.${rawVal},registration_no.eq.${normVal},student_id.eq.${rawVal},student_id.eq.${normVal},roll_number.eq.${rawVal},roll_number.eq.${normVal}`
      );

      const { data: matchedStudents, error } = await query.limit(5);
      if (error) throw error;
      if (!matchedStudents || matchedStudents.length === 0) {
        toast.error(
          bn
            ? 'উক্ত সেশন, শ্রেণি ও রোল/রেজিস্ট্রেশনে কোনো ছাত্র পাওয়া যায়নি'
            : 'No student found with this session, class, and roll/registration'
        );
        return;
      }

      if (matchedStudents.length > 1 && (!searchClassId || searchClassId === 'all')) {
        toast.warning(
          bn
            ? `একাধিক শ্রেণিতে এই রোলের ছাত্র পাওয়া গেছে (${matchedStudents.length} জন)। অনুগ্রহ করে নির্দিষ্ট শ্রেণি নির্বাচন করুন।`
            : `Multiple students found (${matchedStudents.length}). Please select a specific class.`
        );
      }

      const data = matchedStudents[0];
      setFoundStudent(data);

      // Save to search history
      const classObj = classes.find((c: any) => c.id === (searchClassId !== 'all' ? searchClassId : data.class_id));
      const label = `${data.name_bn || data.name_en} (${classObj ? (classObj.name_bn || classObj.name) + ' ' : ''}রোল: ${data.roll_number || data.registration_no || ''})`;
      addToHistory(rawVal, label);
      setShowHistory(false);
      toast.success(bn ? `${data.name_bn || data.name_en}-এর তথ্য পাওয়া গেছে` : 'Student found');
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setSearching(false);
    }
  };

  // Auto-load student when redirected from Dues list with ?studentId=...
  useEffect(() => {
    const sid = searchParams.get('studentId');
    if (!sid) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('students')
        .select('*, classes:class_id(id, name, name_bn), divisions:division_id(id, name, name_bn), academic_sessions:session_id(id, name, name_bn)')
        .eq('id', sid)
        .maybeSingle();
      if (cancelled || !data) return;
      setFoundStudent(data);
      setSearchIdentifier(data.registration_no || data.roll_number || '');
      if (data.session_id) setSearchSessionId(data.session_id);
      if (data.class_id) setSearchClassId(data.class_id);
      // Clean the param so refresh doesn't re-trigger
      const next = new URLSearchParams(searchParams);
      next.delete('studentId');
      setSearchParams(next, { replace: true });
      toast.success(bn ? 'ছাত্র লোড হয়েছে' : 'Student loaded');
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('studentId')]);

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!feeType || !foundStudent || !amount) throw new Error('All fields are required');
      const txnId = generateTransactionId();
      setTransactionId(txnId);
      const isCash = paymentMethod === 'cash';

      // Get atomic serial number
      let serialNumber: string | null = null;
      try {
        const { data: sn, error: serialErr } = await supabase.rpc('get_next_receipt_serial');
        if (!serialErr && sn) serialNumber = sn;
      } catch (e) {
        console.warn('Serial generation fallback to DB trigger');
      }

      const feeTypeName = selectedFeeTypeObj ? (bn ? selectedFeeTypeObj.name_bn : selectedFeeTypeObj.name) : feeType;
      const finalCollector = cleanRoleSuffix(customCollector || collectorName);
      const isUserAdmin = isAdminRole(role) || canApproveItem;
      const isAutoApproved = isCash && isUserAdmin;

      const payload: Record<string, any> = {
        fee_type: feeTypeName,
        amount: parseFloat(amount),
        transaction_id: txnId,
        status: isAutoApproved ? 'success' : 'pending',
        student_id: foundStudent.id,
        payer_name: foundStudent.name_bn,
        payment_method: isCash ? 'cash' : 'online',
        notes: `${bn ? 'আদায়কারী' : 'Collector'}: ${finalCollector} | Reg: ${foundStudent.registration_no || ''}, Roll: ${foundStudent.roll_number || ''}${isCash ? ' | Cash Payment' : ''}${serialNumber ? ` | Serial: ${serialNumber}` : ''}`,
        collected_by: finalCollector,
        created_by: user?.id || null,
      };

      // Check if approval is needed (only for non-admins)
      if (!isUserAdmin && await checkApproval('add', payload, undefined, `${bn ? 'ফি আদায়' : 'Fee Collection'}: ৳${amount} - ${foundStudent.name_bn}`)) {
        return txnId;
      }

      const { error } = await supabase.from('payments').insert(payload);
      if (error) throw error;

      // Also insert into fee_payments for student profile tracking
      const feePaymentPayload = {
        fee_type_id: feeType,
        student_id: foundStudent.id,
        amount: parseFloat(amount),
        paid_amount: isAutoApproved ? parseFloat(amount) : 0,
        status: isAutoApproved ? 'paid' : 'pending',
        receipt_number: serialNumber || undefined,
        paid_at: isAutoApproved ? new Date().toISOString() : null,
        month: paymentMonth || new Date().toLocaleString('default', { month: 'long' }),
        year: paymentYear,
        collected_by: finalCollector || '',
        approved_by: isAutoApproved ? (finalCollector || '') : null,
      };
      await supabase.from('fee_payments').insert(feePaymentPayload);

      return txnId;
    },
    onSuccess: async (txnId) => {
      setStep('done');
      // Invalidate queries so fee status updates immediately
      queryClient.invalidateQueries({ queryKey: ['student_fee_payments_status'] });
      queryClient.invalidateQueries({ queryKey: ['existing_payment_check'] });
      queryClient.invalidateQueries({ queryKey: ['dues-fee-payments'] });
      const isUserAdmin = isAdminRole(role) || canApproveItem;
      if (paymentMethod === 'cash') {
        if (isUserAdmin) {
          toast.success(bn ? 'ক্যাশ পেমেন্ট সফলভাবে সংরক্ষিত ও অনুমোদিত হয়েছে' : 'Cash payment saved and approved');
        } else {
          toast.success(bn ? 'ফি আদায় এন্ট্রি জমা হয়েছে! এডমিনের অনুমোদনের পর রশিদ চূড়ান্ত হবে।' : 'Fee collection entry submitted! Awaiting admin approval.');
        }
      } else {
        // Call process-payment edge function
        try {
          const { data, error } = await supabase.functions.invoke('process-payment', {
            body: {
              action: 'initiate',
              amount: parseFloat(amount),
              student_id: foundStudent?.id,
              fee_type_id: feeType,
            },
          });
          if (error) throw error;
          if (data?.payment_url) {
            toast.success(bn ? 'পেমেন্ট গেটওয়েতে রিডাইরেক্ট হচ্ছে...' : 'Redirecting to payment gateway...');
            setTimeout(() => window.open(data.payment_url, '_blank'), 1000);
          } else {
            toast.success(bn ? 'পেমেন্ট সংরক্ষিত হয়েছে' : 'Payment saved');
          }
        } catch (e: any) {
          toast.error(bn ? 'গেটওয়ে ত্রুটি, পেমেন্ট পেন্ডিং আছে' : 'Gateway error, payment is pending');
        }
      }
    },
    onError: (e: any) => toast.error(e.message || 'Error saving payment'),
  });

  const handleProceed = () => {
    if (!feeType) { toast.error(bn ? 'ফি ধরন নির্বাচন করুন' : 'Select fee type'); return; }
    if (!foundStudent) { toast.error(bn ? 'প্রথমে ছাত্র খুঁজুন' : 'Search student first'); return; }
    if (selectedFeeTypeObj?.payment_frequency === 'monthly' && !paymentMonth) { toast.error(bn ? 'মাস নির্বাচন করুন' : 'Select a month'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { toast.error(bn ? 'সঠিক পরিমাণ দিন' : 'Enter valid amount'); return; }
    // Enforce exact fee amount — no partial or excess payments allowed
    if (selectedFeeTypeObj?.amount != null) {
      const expected = Number(selectedFeeTypeObj.amount);
      const entered = Number(amount);
      // Allow exact single-fee amount, OR an integer multiple (used by "pay all dues" multi-month action)
      const isExact = Math.abs(entered - expected) < 0.01;
      const ratio = expected > 0 ? entered / expected : 0;
      const isIntegerMultiple = expected > 0 && Math.abs(ratio - Math.round(ratio)) < 0.01 && Math.round(ratio) >= 1;
      if (!isExact && !isIntegerMultiple) {
        toast.error(bn
          ? `পরিমাণ অবশ্যই ৳${expected} হতে হবে — কম বা বেশি পরিশোধ করা যাবে না`
          : `Amount must be exactly ৳${expected} — partial or excess payment is not allowed`);
        return;
      }
    }
    if (isPaymentBlocked) {
      toast.error(bn ? 'এই ফি ধরনে ইতিমধ্যে পেমেন্ট আছে। বাতিল না হওয়া পর্যন্ত আবার পরিশোধ করা যাবে না।' : 'Payment already exists. Cannot pay again until cancelled.');
      return;
    }
    if (paymentMethod === 'online' && !isGatewayReady) {
      toast.error(bn ? 'প্রথমে পেমেন্ট গেটওয়ে সেটআপ করুন' : 'Please setup payment gateway first');
      return;
    }
    setStep('summary');
  };

  const handleReset = () => {
    setStep('form');
    setFeeType('');
    setSelectedFeeTypeObj(null);
    setAmount('');
    setPaymentMethod('cash');
    setPaymentMonth('');
    setTransactionId('');
    setFoundStudent(null);
    setSearchIdentifier('');
  };

  const feeCollectionContent = (
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" />
          {bn ? 'ছাত্র ফি পরিশোধ' : 'Student Fee Payment'}
        </h1>

        {step === 'form' && (
          <div className="card-elevated p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
              <div>
                <h3 className="font-display font-semibold text-foreground text-lg flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  {bn ? 'ছাত্র খুঁজুন' : 'Find Student'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {bn
                    ? 'সেশন, শ্রেণি ও রোল বা রেজিস্ট্রেশন নম্বর দিয়ে নির্দিষ্ট ছাত্র বের করুন'
                    : 'Find student by session, class, and roll or registration number'}
                </p>
              </div>
              {foundStudent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFoundStudent(null);
                    setSearchIdentifier('');
                  }}
                  className="text-xs h-8 text-muted-foreground hover:text-foreground self-start sm:self-auto"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  {bn ? 'অন্য ছাত্র খুঁজুন' : 'Search Another'}
                </Button>
              )}
            </div>

            {/* 3 Search Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end pt-1">
              {/* 1. Academic Session */}
              <div className="space-y-1.5 sm:col-span-1 lg:col-span-4">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  {bn ? 'সেশন / শিক্ষাবর্ষ' : 'Session / Year'}
                </label>
                <Select
                  value={searchSessionId}
                  onValueChange={(val) => {
                    setSearchSessionId(val);
                    setFoundStudent(null);
                  }}
                >
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue placeholder={bn ? 'সেশন নির্বাচন করুন' : 'Select Session'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{bn ? 'সকল সেশন' : 'All Sessions'}</SelectItem>
                    {sessions.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {bn ? s.name_bn || s.name : s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Class */}
              <div className="space-y-1.5 sm:col-span-1 lg:col-span-4">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  {bn ? 'শ্রেণি / ক্লাস' : 'Class'}
                </label>
                <Select
                  value={searchClassId}
                  onValueChange={(val) => {
                    setSearchClassId(val);
                    setFoundStudent(null);
                  }}
                >
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue placeholder={bn ? 'শ্রেণি নির্বাচন করুন' : 'Select Class'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{bn ? 'সকল শ্রেণি' : 'All Classes'}</SelectItem>
                    {classes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {bn ? c.name_bn || c.name : c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. Roll or Registration No */}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-4 relative" ref={historyRef}>
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  {bn ? 'রোল / রেজিঃ নম্বর' : 'Roll / Reg No'} <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    className="h-11 bg-background flex-1 text-base"
                    value={searchIdentifier}
                    onChange={(e) => setSearchIdentifier(e.target.value)}
                    placeholder={bn ? 'রোল বা রেজিঃ (যেমন: 101)' : 'Roll or Reg (e.g. 101)...'}
                    onFocus={() => setShowHistory(true)}
                    onKeyDown={(e) => e.key === 'Enter' && searchStudent()}
                  />
                  <Button
                    onClick={searchStudent}
                    disabled={searching}
                    className="h-11 px-4 font-semibold gap-1.5 shrink-0"
                  >
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {bn ? 'খুঁজুন' : 'Search'}
                  </Button>
                </div>

                {/* Search History Dropdown */}
                {showHistory && searchHistory.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium border-b border-border flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {bn ? 'সাম্প্রতিক সার্চ' : 'Recent Searches'}
                    </div>
                    {searchHistory.map((h) => (
                      <div
                        key={h.value}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer group"
                        onClick={() => {
                          setSearchIdentifier(h.value);
                          setShowHistory(false);
                        }}
                      >
                        <Search className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground flex-1 truncate">{h.label}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromHistory(h.value);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-destructive/10 rounded"
                        >
                          <X className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Found student card */}
            {foundStudent && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0 overflow-hidden border border-primary/20">
                    {foundStudent.photo_url ? (
                      <img src={foundStudent.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-base text-foreground">{foundStudent.name_bn || foundStudent.name_en}</p>
                      <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5">
                        {bn ? 'নিয়মিত' : 'Active'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
                      <span>{bn ? 'শ্রেণি:' : 'Class:'} <strong className="text-foreground">{foundStudent.classes?.name_bn || foundStudent.classes?.name || foundStudent.divisions?.name_bn || '—'}</strong></span>
                      <span>•</span>
                      <span>{bn ? 'রোল:' : 'Roll:'} <strong className="text-foreground">{foundStudent.roll_number || '—'}</strong></span>
                      {foundStudent.academic_sessions && (
                        <>
                          <span>•</span>
                          <span>{bn ? 'সেশন:' : 'Session:'} <strong className="text-foreground">{foundStudent.academic_sessions.name_bn || foundStudent.academic_sessions.name}</strong></span>
                        </>
                      )}
                      {(foundStudent.registration_no || foundStudent.student_id) && (
                        <>
                          <span>•</span>
                          <span>{bn ? 'রেজি/আইডি:' : 'Reg/ID:'} <strong className="text-foreground font-mono">{foundStudent.registration_no || foundStudent.student_id}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 hidden sm:block" />
              </div>
            )}

            {/* All Applicable Fee Types Summary */}
            {foundStudent && applicableFeeTypes.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
                  📋 {bn ? 'প্রযোজ্য ফি তালিকা' : 'Applicable Fee Types'}
                </h4>

                {/* One-time fees */}
                {applicableFeeTypes.filter((ft: any) => ft.payment_frequency !== 'monthly').length > 0 && (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="bg-secondary/50 px-4 py-2">
                      <span className="text-xs font-semibold text-muted-foreground">{bn ? '1️⃣ একবারের ফি' : '1️⃣ One-time Fees'}</span>
                    </div>
                    <div className="divide-y divide-border">
                      {applicableFeeTypes.filter((ft: any) => ft.payment_frequency !== 'monthly').map((ft: any) => {
                        const isPaid = paidFeeTypeIds.has(ft.id);
                        return (
                          <div key={ft.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{bn ? ft.name_bn : ft.name}</p>
                              <p className="text-xs text-muted-foreground">{ft.divisions?.name_bn || (bn ? 'সব বিভাগ' : 'All')} {ft.classes?.name_bn ? `• ${ft.classes.name_bn}` : ''}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-sm">৳{ft.amount}</span>
                              {isPaid ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                  {bn ? '✓ পরিশোধিত' : '✓ Paid'}
                                </span>
                              ) : (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                                  setFeeType(ft.id);
                                  setSelectedFeeTypeObj(ft);
                                  setAmount(String(ft.amount));
                                  setPaymentMonth('');
                                }}>
                                  {bn ? 'পরিশোধ' : 'Pay'}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Monthly fees with month grid */}
                {applicableFeeTypes.filter((ft: any) => ft.payment_frequency === 'monthly').map((ft: any) => {
                  const statuses = getMonthlyStatuses(ft.id);
                  const dueCount = statuses.filter(s => s.status === 'due').length;
                  return (
                    <div key={ft.id} className="border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-sm">🔄 {bn ? ft.name_bn : ft.name} — ৳{ft.amount}/{bn ? 'মাস' : 'mo'}</span>
                        {dueCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive">
                            {dueCount} {bn ? 'বকেয়া' : 'Due'}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {statuses.map(s => {
                          const canPay = s.status === 'due' || s.status === 'unpaid';
                          const monthKey = `${s.month}-${s.year}`;
                          if (s.status === 'na') return (
                            <div key={monthKey} className="text-center rounded-lg px-2 py-2 text-xs font-medium border bg-muted/10 border-border/50 text-muted-foreground/30 line-through">
                              <div className="truncate">{bn ? s.monthBn : s.month.slice(0, 3)}</div>
                              <div className="text-[10px] mt-0.5">—</div>
                            </div>
                          );
                          return (
                            <button
                              key={monthKey}
                              type="button"
                              disabled={!canPay}
                              onClick={() => {
                                if (!canPay) return;
                                setFeeType(ft.id);
                                setSelectedFeeTypeObj(ft);
                                setAmount(String(ft.amount));
                                setPaymentMonth(s.month);
                                setPaymentYear(s.year);
                                toast.info(bn ? `${s.monthBn} ${s.year} মাস সিলেক্ট করা হয়েছে` : `${s.month} ${s.year} selected`);
                              }}
                              className={`text-center rounded-lg px-2 py-2 text-xs font-medium border transition-all ${
                                s.status === 'paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400 cursor-default' :
                                s.status === 'due' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400 cursor-pointer hover:ring-2 hover:ring-red-400' :
                                s.status === 'unpaid' ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400 cursor-pointer hover:ring-2 hover:ring-amber-400' :
                                'bg-muted/30 border-border text-muted-foreground opacity-60 cursor-default'
                              } ${paymentMonth === s.month && paymentYear === s.year && feeType === ft.id ? 'ring-2 ring-primary shadow-md scale-105' : ''}`}
                            >
                              <div className="truncate">{bn ? s.monthBn : s.month.slice(0, 3)}</div>
                              <div className="text-[10px] mt-0.5">
                                {s.status === 'paid' ? '✓' : s.status === 'due' ? '⚠' : s.status === 'unpaid' ? '○' : '—'}
                              </div>
                              <div className="text-[9px] text-muted-foreground/70">{s.year}</div>
                            </button>
                          );
                        })}
                      </div>
                      {dueCount > 0 && (
                        <Button size="sm" className="btn-primary-gradient w-full" onClick={() => {
                          setFeeType(ft.id);
                          setSelectedFeeTypeObj(ft);
                          setAmount(String(ft.amount * dueCount));
                        }}>
                          {bn ? `৳${ft.amount * dueCount} বকেয়া পরিশোধ করুন` : `Pay ৳${ft.amount * dueCount} Due`}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {foundStudent && (<><div className="border-t border-border pt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  {bn ? 'ফি ধরন' : 'Fee Type'} <span className="text-destructive">*</span>
                </label>
                <Select value={feeType} onValueChange={(v) => {
                  setFeeType(v);
                  const ftObj = applicableFeeTypes.find((ft: any) => ft.id === v);
                  setSelectedFeeTypeObj(ftObj || null);
                  if (ftObj) setAmount(String(ftObj.amount || ''));
                  setPaymentMonth(''); // reset month on fee type change
                }}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={bn ? 'ফি ধরন নির্বাচন করুন' : 'Select Fee Type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {applicableFeeTypes.map((ft: any) => {
                      const isPaid = paidFeeTypeIds.has(ft.id);
                      return (
                        <SelectItem key={ft.id} value={ft.id} disabled={isPaid}>
                          <span className="flex items-center gap-2">
                            {bn ? ft.name_bn : ft.name} — ৳{ft.amount}
                            {ft.payment_frequency === 'monthly' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">🔄</span>}
                            {ft.divisions?.name_bn ? ` (${ft.divisions.name_bn})` : ''}
                            {ft.classes?.name_bn ? ` - ${ft.classes.name_bn}` : ''}
                            {isPaid && (
                              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-success/15 text-success">
                                {bn ? '✓ পরিশোধিত' : '✓ Paid'}
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Month selector for monthly fee types */}
                {selectedFeeTypeObj?.payment_frequency === 'monthly' && foundStudent && (
                  <div className="mt-3">
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      {bn ? 'মাস নির্বাচন করুন' : 'Select Month'} <span className="text-destructive">*</span>
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {getMonthlyStatuses(feeType).map(s => {
                        const monthKey = `${s.month}-${s.year}`;
                        if (s.status === 'na') return (
                          <div key={monthKey} className="text-center rounded-lg px-2 py-2 text-xs font-medium border bg-muted/10 border-border/50 text-muted-foreground/30 line-through">
                            <div className="truncate">{bn ? s.monthBn : s.month.slice(0, 3)}</div>
                            <div className="text-[10px] mt-0.5">—</div>
                          </div>
                        );
                        const canPay = s.status === 'due' || s.status === 'unpaid';
                        return (
                          <button
                            key={monthKey}
                            type="button"
                            disabled={!canPay}
                            onClick={() => {
                              if (!canPay) return;
                              setPaymentMonth(s.month);
                              setPaymentYear(s.year);
                              setAmount(String(selectedFeeTypeObj.amount));
                            }}
                            className={`text-center rounded-lg px-2 py-2 text-xs font-medium border transition-all ${
                              s.status === 'paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400 cursor-default' :
                              s.status === 'due' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400 cursor-pointer hover:ring-2 hover:ring-red-400' :
                              s.status === 'unpaid' ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400 cursor-pointer hover:ring-2 hover:ring-amber-400' :
                              'bg-muted/30 border-border text-muted-foreground opacity-60 cursor-default'
                            } ${paymentMonth === s.month && paymentYear === s.year ? 'ring-2 ring-primary shadow-md scale-105' : ''}`}
                          >
                            <div className="truncate">{bn ? s.monthBn : s.month.slice(0, 3)}</div>
                            <div className="text-[10px] mt-0.5">
                              {s.status === 'paid' ? '✓' : s.status === 'due' ? '⚠' : s.status === 'unpaid' ? '○' : '—'}
                            </div>
                            <div className="text-[9px] text-muted-foreground/70">{s.year}</div>
                          </button>
                        );
                      })}
                    </div>
                    {paymentMonth && (
                      <p className="text-xs mt-2 px-3 py-1.5 rounded-lg bg-primary/5 text-primary font-medium">
                        ✓ {bn ? `${MONTHS_BN[MONTHS_EN.indexOf(paymentMonth)]} ${paymentYear} মাসের ফি পরিশোধ হবে` : `Paying for ${paymentMonth} ${paymentYear}`}
                      </p>
                    )}
                  </div>
                )}

                {applicableFeeTypes.length === 0 && (
                  <p className="text-xs text-destructive mt-1">
                    {bn ? 'কোনো ফি ধরন পাওয়া যায়নি। প্রথমে "ফি ধরন" ট্যাব থেকে ফি যোগ করুন।' : 'No fee types found. Add fee types from the "Fee Types" tab first.'}
                  </p>
                )}
                {/* Existing payment block warning */}
                {isPaymentBlocked && existingPayment && (
                  <div className={`mt-2 border rounded-xl p-4 space-y-2 ${
                    blockedStatus === 'failed'
                      ? 'bg-destructive/10 border-destructive/30'
                      : blockedStatus === 'pending'
                      ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700'
                      : 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      {blockedStatus === 'failed' ? (
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                      ) : blockedStatus === 'pending' ? (
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                      <span className={`text-sm font-semibold ${
                        blockedStatus === 'failed'
                          ? 'text-destructive'
                          : blockedStatus === 'pending'
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {blockedStatus === 'failed'
                          ? (bn ? '❌ পূর্ববর্তী এন্ট্রি প্রত্যাখ্যাত — সংশোধন বা ডিলিট প্রয়োজন' : '❌ Previous Entry Rejected')
                          : blockedStatus === 'pending'
                          ? (bn ? '⏳ পেন্ডিং রিসিট — অনুমোদনের অপেক্ষায়' : '⏳ Pending Receipt — Awaiting Approval')
                          : (bn ? '✅ অনুমোদিত রিসিট — পরিশোধিত' : '✅ Approved Receipt — Paid')}
                      </span>
                    </div>
                    <div className="text-xs space-y-1 text-foreground/80">
                      {'transaction_id' in existingPayment && <p><strong>{bn ? 'ট্রানজেকশন আইডি' : 'Transaction ID'}:</strong> {(existingPayment as any).transaction_id}</p>}
                      <p><strong>{bn ? 'পরিমাণ' : 'Amount'}:</strong> ৳{(existingPayment as any).amount || (existingPayment as any).paid_amount}</p>
                      {'created_at' in existingPayment && <p><strong>{bn ? 'তারিখ' : 'Date'}:</strong> {new Date((existingPayment as any).created_at).toLocaleDateString('bn-BD')}</p>}
                    </div>
                    <p className={`text-xs font-medium ${
                      blockedStatus === 'failed'
                        ? 'text-destructive'
                        : blockedStatus === 'pending'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {blockedStatus === 'failed'
                        ? (bn ? '🚫 পেমেন্ট ড্যাশবোর্ড থেকে এন্ট্রিটি সংশোধন করুন অথবা এডমিন ডিলিট করলে তবেই নতুন করে এন্ট্রি করা যাবে।' : '🚫 Please edit this entry from Payment Dashboard or have an admin delete it to re-enter.')
                        : blockedStatus === 'pending'
                        ? (bn ? '🚫 এডমিন অনুমোদন বা বাতিল না করা পর্যন্ত এই ফি ধরনে আবার পরিশোধ করা যাবে না।' : '🚫 Cannot pay again until this pending payment is processed.')
                        : (bn ? '🚫 এই ফি ইতিমধ্যে পরিশোধিত।' : '🚫 This fee is already paid.')}
                    </p>
                  </div>
                )}
                {checkingExisting && feeType && foundStudent && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {bn ? 'পূর্ববর্তী পেমেন্ট যাচাই করা হচ্ছে...' : 'Checking existing payments...'}
                  </div>
                )}
              </div>


              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {bn ? 'পেমেন্ট পদ্ধতি' : 'Payment Method'} <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${paymentMethod === 'cash' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/40'}`}>
                    <Banknote className="w-5 h-5" />
                    {bn ? 'ক্যাশ পেমেন্ট' : 'Cash Payment'}
                  </button>
                  <button onClick={() => setPaymentMethod('online')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${paymentMethod === 'online' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/40'}`}>
                    <Globe className="w-5 h-5" />
                    {bn ? 'অনলাইন পেমেন্ট' : 'Online Payment'}
                  </button>
                </div>

                {/* Online payment gateway status */}
                {paymentMethod === 'online' && !isGatewayReady && (
                  <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                      <span className="text-sm font-medium text-warning">
                        {bn ? 'পেমেন্ট গেটওয়ে সেটআপ করা হয়নি' : 'Payment gateway not configured'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {bn
                        ? 'অনলাইন পেমেন্ট ব্যবহার করতে প্রথমে পেমেন্ট গেটওয়ে (bKash, Nagad, SSLCommerz ইত্যাদি) সেটআপ করুন।'
                        : 'To accept online payments, configure a payment gateway (bKash, Nagad, SSLCommerz, etc.) first.'}
                    </p>
                    <Button variant="outline" size="sm" className="mt-1" onClick={() => navigate('/admin/settings')}>
                      <Settings className="w-3.5 h-3.5 mr-1.5" />
                      {bn ? 'গেটওয়ে সেটআপ করুন' : 'Setup Gateway'}
                    </Button>
                  </div>
                )}

                {paymentMethod === 'online' && isGatewayReady && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground">
                      {bn ? `${gatewayConfig?.provider_name || gatewayConfig?.provider} গেটওয়ে সক্রিয়` : `${gatewayConfig?.provider_name || gatewayConfig?.provider} gateway active`}
                    </span>
                  </div>
                )}
              </div>

              {/* Collector name display & selector for cash */}
              {paymentMethod === 'cash' && (
                <div className="bg-accent/20 border border-accent/40 rounded-xl p-3">
                  <CollectorSelector
                    value={customCollector}
                    onChange={setCustomCollector}
                    defaultCollectorName={collectorName}
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  {bn ? 'পরিমাণ (৳)' : 'Amount (৳)'} <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  className="bg-muted/40 cursor-not-allowed"
                  value={amount || ''}
                  readOnly
                  tabIndex={-1}
                  placeholder="৳ 0.00"
                />
                <p className="text-[11px] text-muted-foreground mt-1 text-center font-[mono] border-solid">
                  {bn
                    ? '⚠️ ফি ধরন অনুযায়ী পরিমাণ স্বয়ংক্রিয়ভাবে নির্ধারিত।'
                    : '⚠️ Amount is fixed by the selected fee type — partial or excess payment is not allowed.'}
                </p>
              </div>
            </div>

            <Button onClick={handleProceed} className="btn-primary-gradient w-full mt-2" disabled={isPaymentBlocked || checkingExisting}>
              <ArrowRight className="w-4 h-4 mr-2" />
              {isPaymentBlocked
                ? (bn ? '🚫 পেমেন্ট ব্লকড — পূর্ববর্তী পেমেন্ট বাতিল করুন' : '🚫 Blocked — Cancel previous payment first')
                : (bn ? 'পরিশোধে এগিয়ে যান' : 'Proceed to Pay')}
            </Button>
            </>)}
          </div>
        )}

        {step === 'summary' && (
          <div className="card-elevated p-6 space-y-5">
            <h3 className="font-display font-semibold text-foreground text-lg">
              {bn ? 'পেমেন্ট সারাংশ' : 'Payment Summary'}
            </h3>
            <div className="bg-secondary/30 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{bn ? 'ছাত্রের নাম' : 'Student Name'}</span>
                <span className="font-semibold text-foreground">{foundStudent?.name_bn}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{bn ? 'রেজিস্ট্রেশন' : 'Registration'}</span>
                <span className="font-semibold text-foreground">{foundStudent?.registration_no || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{bn ? 'রোল' : 'Roll'}</span>
                <span className="font-semibold text-foreground">{foundStudent?.roll_number || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{bn ? 'ফি ধরন' : 'Fee Type'}</span>
                <span className="font-semibold text-foreground">
                  {selectedFeeTypeObj ? (bn ? selectedFeeTypeObj.name_bn : selectedFeeTypeObj.name) : feeType}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{bn ? 'পেমেন্ট পদ্ধতি' : 'Payment Method'}</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  {paymentMethod === 'cash' ? <><Banknote className="w-4 h-4" /> {bn ? 'ক্যাশ' : 'Cash'}</> : <><Globe className="w-4 h-4" /> {bn ? 'অনলাইন' : 'Online'}</>}
                </span>
              </div>
              {paymentMethod === 'cash' && (customCollector || collectorName) && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{bn ? 'আদায়কারী' : 'Collector'}</span>
                  <span className="font-semibold text-foreground">{customCollector || collectorName}</span>
                </div>
              )}
              <div className="border-t border-border my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">{bn ? 'মোট পরিমাণ' : 'Total Amount'}</span>
                <span className="text-xl font-bold text-primary">৳ {parseFloat(amount).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
                {bn ? 'পরিবর্তন করুন' : 'Edit'}
              </Button>
              <Button onClick={() => payMutation.mutate()} className="btn-primary-gradient flex-1" disabled={payMutation.isPending}>
                {payMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {paymentMethod === 'cash' ? <Banknote className="w-4 h-4 mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                {paymentMethod === 'cash' ? (bn ? 'ক্যাশ পরিশোধ নিশ্চিত করুন' : 'Confirm Cash Payment') : (bn ? 'নিশ্চিত করুন ও পরিশোধ করুন' : 'Confirm & Pay')}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="card-elevated p-6 text-center space-y-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${paymentMethod === 'cash' ? 'bg-primary/10' : 'bg-primary/10'}`}>
              {paymentMethod === 'cash' ? <Banknote className="w-8 h-8 text-primary" /> : <CheckCircle className="w-8 h-8 text-primary" />}
            </div>
            <h3 className="font-display font-bold text-foreground text-lg">
              {paymentMethod === 'cash'
                ? (bn ? 'ক্যাশ পেমেন্ট সম্পন্ন!' : 'Cash Payment Complete!')
                : (bn ? 'পেমেন্ট সংরক্ষিত!' : 'Payment Saved!')}
            </h3>
            {paymentMethod === 'cash' && (
              <p className="text-sm text-muted-foreground font-medium">
                {bn ? 'অনুমোদনের অপেক্ষায় রয়েছে' : 'Awaiting admin approval'}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {bn ? 'ট্রানজেকশন আইডি:' : 'Transaction ID:'}
            </p>
            <div className="bg-secondary/50 rounded-lg px-4 py-3 font-mono text-lg font-bold text-foreground">
              {transactionId}
            </div>
            {paymentMethod === 'online' && (
              <p className="text-xs text-muted-foreground">
                {bn ? 'পেমেন্ট গেটওয়েতে রিডাইরেক্ট হচ্ছে...' : 'Redirecting to payment gateway...'}
                <ExternalLink className="w-3 h-3 inline ml-1" />
              </p>
            )}
            <Button variant="outline" onClick={handleReset} className="mt-4">
              {bn ? 'নতুন পেমেন্ট' : 'New Payment'}
            </Button>
          </div>
        )}


      </div>
  );

  return (
    <AdminLayout>
      <TabContainer
        tabs={[
          ...(isFeatureAllowed('tab_fees_collect') !== false ? [{
            id: 'collection',
            label: bn ? 'ফি আদায়' : 'Fee Collection',
            icon: CreditCard,
            content: feeCollectionContent,
          }] : []),
          ...(isFeatureAllowed('tab_fees_reports') !== false ? [{
            id: 'dashboard',
            label: bn ? 'পেমেন্ট ড্যাশবোর্ড' : 'Payment Dashboard',
            icon: BarChart3,
            content: (
              <ErrorBoundary>
                <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
                  <EmbeddedProvider>
                    <LazyPaymentDashboard />
                  </EmbeddedProvider>
                </Suspense>
              </ErrorBoundary>
            ),
          }] : []),
          ...(isFeatureAllowed('tab_fees_dues') !== false ? [{
            id: 'dues',
            label: bn ? 'বকেয়া তালিকা' : 'Dues List',
            icon: AlertTriangle,
            content: <DuesManagement />,
          }] : []),
          ...(isFeatureAllowed('tab_online_payments') !== false ? [{
            id: 'receipts',
            label: bn ? 'রিসিট ডাউনলোড' : 'Receipt Download',
            icon: Receipt,
            content: <FeeReceiptDownload />,
          }] : []),
        ]}
        paramKey="tab"
      />
    </AdminLayout>
  );
};

export default AdminStudentsFees;
