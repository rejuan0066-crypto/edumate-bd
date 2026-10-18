import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import ManualPaymentMethods from '@/components/ManualPaymentMethods';
import CollectorSelector from '@/components/fees/CollectorSelector';
import { cleanRoleSuffix } from '@/lib/paymentUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { toBanglaDigits, toBanglaMonth } from '@/lib/amountInWords';
import {
  CreditCard, Receipt, Search, Calendar, Building2, CheckCircle2,
  Download, Printer, User, Banknote, Shield, ArrowRight, Clock,
  AlertTriangle, Loader2, Sparkles, Phone, RefreshCw, X, ChevronRight,
  Check, GraduationCap
} from 'lucide-react';

interface ReceiptData {
  id: string;
  receipt_number: string;
  student_name: string;
  father_name?: string;
  student_id: string;
  class_name: string;
  roll: string;
  fee_type: string;
  amount: number;
  paid_amount: number;
  status: string;
  paid_at: string;
  month: string;
  year: number;
}

const MONTHS = [
  { value: 'January', en: 'January', bn: 'জানুয়ারি' },
  { value: 'February', en: 'February', bn: 'ফেব্রুয়ারি' },
  { value: 'March', en: 'March', bn: 'মার্চ' },
  { value: 'April', en: 'April', bn: 'এপ্রিল' },
  { value: 'May', en: 'May', bn: 'মে' },
  { value: 'June', en: 'June', bn: 'জুন' },
  { value: 'July', en: 'July', bn: 'জুলাই' },
  { value: 'August', en: 'August', bn: 'আগস্ট' },
  { value: 'September', en: 'September', bn: 'সেপ্টেম্বর' },
  { value: 'October', en: 'October', bn: 'অক্টোবর' },
  { value: 'November', en: 'November', bn: 'নভেম্বর' },
  { value: 'December', en: 'December', bn: 'ডিসেম্বর' },
];

const toBnDigits = (num: number | string) =>
  String(num).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

const generateTransactionId = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const timeSuffix = Date.now().toString().slice(-4);
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `STU-${y}${m}${d}-${timeSuffix}${rand}`;
};

const FeePaymentPage = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [customCollector, setCustomCollector] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'pay' | 'receipts'>('pay');

  // Search State for Fee Payment (Session Year, Class, and Roll / Reg)
  const [searchSessionId, setSearchSessionId] = useState<string>('all');
  const [searchClassId, setSearchClassId] = useState<string>('all');
  const [searchIdentifier, setSearchIdentifier] = useState<string>('');
  const [searching, setSearching] = useState(false);
  const [foundStudent, setFoundStudent] = useState<any>(null);

  // Payment Form State
  const [selectedFeeTypeId, setSelectedFeeTypeId] = useState('');
  const currentMonthValue = MONTHS[new Date().getMonth()].value;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('online');
  const [manualMethod, setManualMethod] = useState('bkash');
  const [manualTrxId, setManualTrxId] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null);

  // Receipt Tab State (Private Student Receipt Lookup)
  const [receiptSession, setReceiptSession] = useState('all');
  const [receiptClass, setReceiptClass] = useState('all');
  const [receiptYear, setReceiptYear] = useState(new Date().getFullYear().toString());
  const [receiptIdentifier, setReceiptIdentifier] = useState('');
  const [receiptSearchLoading, setReceiptSearchLoading] = useState(false);
  const [receiptSearchResult, setReceiptSearchResult] = useState<{
    student: any | null;
    receipts: ReceiptData[];
    hasSearched: boolean;
  }>({ student: null, receipts: [], hasSearched: false });
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  // Institution info
  const { data: institution } = useQuery({
    queryKey: ['institution-receipt-public'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
  });

  // Current logged in staff name (if admin/staff)
  const { data: collectorStaff } = useQuery({
    queryKey: ['collector_staff_profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('staff')
        .select('name_bn, name_en')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });
  const isStaffOrAdmin = !!user;
  const collectorName = cleanRoleSuffix(collectorStaff?.name_bn || collectorStaff?.name_en || user?.email || 'Office');

  // Academic sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['academic_sessions_public_fees'],
    queryFn: async () => {
      const { data } = await supabase
        .from('academic_sessions')
        .select('*')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  // Classes
  const { data: classes = [] } = useQuery({
    queryKey: ['classes_public_fees'],
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
    if (sessions.length > 0 && (!searchSessionId || searchSessionId === 'all')) {
      const active = sessions.find((s: any) => s.is_active) || sessions[0];
      if (active) setSearchSessionId(active.id);
    }
  }, [sessions]);

  // Dynamic fee types
  const { data: dbFeeTypes = [] } = useQuery({
    queryKey: ['fee_types_public_fees'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fee_types')
        .select('*, divisions(name_bn), classes(name_bn)')
        .eq('is_active', true)
        .order('fee_category')
        .order('name_bn');
      return data || [];
    },
  });

  // Student's fee payments (to show dues & paid status)
  const { data: studentFeePayments = [], refetch: refetchStudentPayments } = useQuery({
    queryKey: ['student_fee_payments_public', foundStudent?.id],
    queryFn: async () => {
      if (!foundStudent?.id) return [];
      const { data, error } = await supabase
        .from('fee_payments')
        .select('id, fee_type_id, status, paid_amount, amount, month, year, receipt_number, paid_at')
        .eq('student_id', foundStudent.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!foundStudent?.id,
  });

  // Applicable fee types for found student
  const applicableFeeTypes = useMemo(() => {
    if (!foundStudent) return dbFeeTypes;
    return dbFeeTypes.filter((ft: any) => {
      if (ft.division_id && ft.division_id !== foundStudent.division_id) return false;
      if (ft.class_id && ft.class_id !== foundStudent.class_id) return false;
      return true;
    });
  }, [foundStudent, dbFeeTypes]);

  // Selected fee type object
  const selectedFeeTypeObj = useMemo(() => {
    return applicableFeeTypes.find((ft: any) => ft.id === selectedFeeTypeId);
  }, [applicableFeeTypes, selectedFeeTypeId]);

  // Automatically update amount when fee type changes
  const handleFeeTypeChange = (feeTypeId: string) => {
    setSelectedFeeTypeId(feeTypeId);
    const ft = applicableFeeTypes.find((f: any) => f.id === feeTypeId);
    if (ft && ft.amount != null) {
      setCustomAmount(String(ft.amount));
    }
    if (ft && Array.isArray(ft.applicable_months) && ft.applicable_months.length > 0) {
      const firstMonth = ft.applicable_months[0].split('-')[0];
      setSelectedMonth(firstMonth);
    }
  };

  // Student Search (by Session Year, Class, and Roll / Registration No)
  const searchStudent = async () => {
    const rawVal = searchIdentifier.trim();
    if (!rawVal) {
      toast.error(bn ? 'রোল বা রেজিস্ট্রেশন নম্বর লিখুন' : 'Enter roll or registration number');
      return;
    }

    setSearching(true);
    setFoundStudent(null);
    setPaymentSuccess(null);
    setSelectedFeeTypeId('');

    try {
      const normVal = rawVal.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
      const sessId = searchSessionId && searchSessionId !== 'all' ? searchSessionId : null;
      const clsId = searchClassId && searchClassId !== 'all' ? searchClassId : null;

      let matched: any = null;

      // 1. Try dedicated public security-definer RPC if available
      try {
        const { data: rpcRows, error: rpcErr } = await (supabase as any).rpc('public_search_student_for_fee', {
          p_identifier: normVal || rawVal,
          p_session_id: sessId,
          p_class_id: clsId,
        });
        if (!rpcErr && rpcRows && rpcRows.length > 0) {
          const r = rpcRows[0];
          matched = {
            ...r,
            classes: { name: r.class_name, name_bn: r.class_name_bn },
            academic_sessions: { name: r.session_name, name_bn: r.session_name_bn },
          };
        }
      } catch {
        // Fall through to direct query or legacy RPC
      }

      // 2. Direct table query (with strict anon/staff permission separation)
      if (!matched) {
        const columns = isStaffOrAdmin
          ? '*, divisions:division_id(name, name_bn), classes:class_id(name, name_bn), academic_sessions:session_id(name, name_bn)'
          : 'id, name_bn, name_en, student_id, roll_number, registration_no, status, division_id, class_id, session_id, photo_url, divisions:division_id(name, name_bn), classes:class_id(name, name_bn), academic_sessions:session_id(name, name_bn)';

        let query = supabase
          .from('students')
          .select(columns)
          .or('status.eq.active,status.is.null');

        // Only authenticated staff/admin has permission to filter deleted_at
        if (isStaffOrAdmin) {
          query = query.is('deleted_at', null);
        }

        if (sessId) {
          query = query.eq('session_id', sessId);
        }

        if (clsId) {
          query = query.eq('class_id', clsId);
        }

        query = query.or(
          `registration_no.eq.${rawVal},registration_no.eq.${normVal},student_id.eq.${rawVal},student_id.eq.${normVal},roll_number.eq.${rawVal},roll_number.eq.${normVal}`
        );

        const { data, error } = await query.limit(1).maybeSingle();
        if (!error && data) {
          matched = data;
        }
      }

      // 3. Fallback to existing database RPC lookup_student_for_fee
      if (!matched) {
        try {
          const { data: feeRpc, error: feeRpcErr } = await (supabase as any).rpc('lookup_student_for_fee', {
            p_reg_no: rawVal,
          });
          if (!feeRpcErr && feeRpc && feeRpc.length > 0) {
            const st = feeRpc[0];
            const classObj = classes.find((c: any) => c.id === st.class_id);
            const sessionObj = sessions.find((s: any) => s.id === st.session_id);
            matched = {
              ...st,
              classes: classObj ? { name: classObj.name, name_bn: classObj.name_bn } : null,
              academic_sessions: sessionObj ? { name: sessionObj.name, name_bn: sessionObj.name_bn } : null,
            };
          }
        } catch {
          // ignore
        }
      }

      if (!matched) {
        toast.error(
          bn
            ? 'উক্ত সেশন, শ্রেণি ও রোল/রেজিস্ট্রেশনে কোনো শিক্ষার্থী পাওয়া যায়নি'
            : 'No student found with this session, class, and roll/registration'
        );
        return;
      }

      setFoundStudent(matched);
      toast.success(
        bn ? `${matched.name_bn || matched.name_en}-এর তথ্য পাওয়া গেছে!` : `Found student: ${matched.name_bn || matched.name_en}!`
      );
    } catch (e: any) {
      toast.error(e.message || (bn ? 'খুঁজতে সমস্যা হয়েছে' : 'Search error'));
    } finally {
      setSearching(false);
    }
  };

  // Pay / Collect Fee Mutation
  const payMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFeeTypeId || !foundStudent || !customAmount) {
        throw new Error(bn ? 'সকল আবশ্যক তথ্য পূরণ করুন' : 'All required fields are needed');
      }
      const amtNum = parseFloat(customAmount);
      if (isNaN(amtNum) || amtNum <= 0) {
        throw new Error(bn ? 'সঠিক টাকার পরিমাণ লিখুন' : 'Enter a valid amount');
      }

      const txnId = generateTransactionId();
      let serialNumber: string | null = null;
      try {
        const { data: sn, error: serialErr } = await supabase.rpc('get_next_receipt_serial');
        if (!serialErr && sn) serialNumber = sn;
      } catch {
        // DB trigger auto_assign_fee_payment_receipt_number will assign next serial on insert
      }

      const feeTypeName = selectedFeeTypeObj ? (bn ? selectedFeeTypeObj.name_bn : selectedFeeTypeObj.name) : 'Student Fee';
      const isCash = isStaffOrAdmin && paymentMethod === 'cash';
      const finalCollector = cleanRoleSuffix(customCollector || collectorName);
      const isUserAdmin = isAdminRole(role);
      const isAutoApproved = isCash && isUserAdmin;

      // Duplicate Payment Checking:
      // 1) For monthly fee, check fee_payments
      if (selectedFeeTypeObj?.payment_frequency === 'monthly' && selectedMonth) {
        const { data: existingMonthly } = await supabase
          .from('fee_payments')
          .select('id, status')
          .eq('student_id', foundStudent.id)
          .eq('fee_type_id', selectedFeeTypeId)
          .eq('month', selectedMonth)
          .eq('year', parseInt(selectedYear))
          .maybeSingle();

        if (existingMonthly) {
          if (existingMonthly.status === 'paid') {
            throw new Error(bn ? `${selectedMonth} ${selectedYear} মাসের এই ফি ইতিমধ্যে পরিশোধিত (Paid)` : `Fee for ${selectedMonth} ${selectedYear} is already paid`);
          } else if (existingMonthly.status === 'pending') {
            throw new Error(bn ? `${selectedMonth} মাসের ফি-র একটি পেমেন্ট ইতিমধ্যে এডমিন অনুমোদনের অপেক্ষায় রয়েছে` : `A payment for ${selectedMonth} is already awaiting admin approval`);
          }
        }
      }

      // 2) For any fee, check payments table (exclude deleted)
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id, status')
        .eq('student_id', foundStudent.id)
        .eq('fee_type', feeTypeName)
        .in('status', ['pending', 'success', 'failed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPayment) {
        if (existingPayment.status === 'success') {
          throw new Error(bn ? 'এই শিক্ষার্থীর জন্য উক্ত ফি ইতিমধ্যে পরিশোধিত (Paid)' : 'This fee is already paid for this student');
        } else if (existingPayment.status === 'pending') {
          throw new Error(bn ? 'এই ফি-র একটি পেমেন্ট ইতিমধ্যে অপেক্ষমাণ (Pending) রয়েছে। এডমিন অনুমোদন বা বাতিল না করা পর্যন্ত নতুন এন্ট্রি করা যাবে না।' : 'A payment for this fee is already pending admin approval.');
        } else if (existingPayment.status === 'failed') {
          throw new Error(bn ? 'এই ফি-র পূর্বের একটি এন্ট্রি প্রত্যাখ্যাত হয়েছে। অনুগ্রহ করে পেমেন্ট তালিকা থেকে উক্ত এন্ট্রিটি সংশোধন করুন অথবা এডমিন কর্তৃক ডিলিট করান।' : 'A previous entry for this fee was rejected. Please correct that entry or have an admin delete it.');
        }
      }

      // 1. Record in payments table
      const paymentPayload: Record<string, any> = {
        fee_type: feeTypeName,
        amount: amtNum,
        transaction_id: txnId,
        status: isAutoApproved ? 'success' : 'pending',
        student_id: foundStudent.id,
        payer_name: foundStudent.name_bn || foundStudent.name_en,
        payment_method: isCash ? 'cash' : (manualMethod || 'online'),
        notes: `${bn ? 'আদায়কারী' : 'Collector'}: ${finalCollector} | ${isCash ? 'Cash Payment' : manualMethod} | TrxID: ${manualTrxId || txnId} | Sender: ${senderPhone} | Reg: ${foundStudent.registration_no || ''}${serialNumber ? ` | Serial: ${serialNumber}` : ''}`,
        collected_by: finalCollector,
        created_by: user?.id || null,
      };
      await supabase.from('payments').insert(paymentPayload);

      // 2. Record in fee_payments table
      const feePaymentPayload = {
        fee_type_id: selectedFeeTypeId,
        student_id: foundStudent.id,
        amount: amtNum,
        paid_amount: isAutoApproved ? amtNum : 0,
        status: isAutoApproved ? 'paid' : 'pending',
        receipt_number: serialNumber || undefined,
        paid_at: isAutoApproved ? new Date().toISOString() : null,
        month: (selectedFeeTypeObj?.payment_frequency === 'monthly' || (Array.isArray(selectedFeeTypeObj?.applicable_months) && selectedFeeTypeObj.applicable_months.length > 0)) ? selectedMonth : null,
        year: parseInt(selectedYear),
        collected_by: finalCollector || (isCash ? 'Office' : 'Online'),
        approved_by: isAutoApproved ? finalCollector : null,
      };

      const { data: insertedRecord, error: feeErr } = await supabase
        .from('fee_payments')
        .insert(feePaymentPayload)
        .select()
        .maybeSingle();

      if (feeErr) throw feeErr;

      const finalSerialNumber = (insertedRecord as any)?.receipt_number || serialNumber || txnId;

      return {
        txnId,
        serialNumber: finalSerialNumber,
        feePayment: insertedRecord,
        feeTypeName,
        amount: amtNum,
        isCash,
        isAutoApproved,
      };
    },
    onSuccess: (data) => {
      setPaymentSuccess(data);
      refetchStudentPayments();
      queryClient.invalidateQueries({ queryKey: ['fee-payments-public'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      if (data.isCash) {
        if (data.isAutoApproved) {
          toast.success(bn ? 'ক্যাশ পেমেন্ট সফলভাবে সংরক্ষিত ও অনুমোদিত হয়েছে!' : 'Cash payment recorded and approved!');
        } else {
          toast.success(bn ? 'ক্যাশ পেমেন্ট এন্ট্রি জমা হয়েছে! এডমিনের অনুমোদনের পর রশিদ চূড়ান্ত হবে।' : 'Cash payment submitted! Awaiting admin approval.');
        }
      } else {
        toast.success(bn ? 'পেমেন্ট রিকোয়েস্ট সফলভাবে জমা হয়েছে!' : 'Payment request submitted successfully!');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || (bn ? 'পেমেন্ট প্রক্রিয়ায় ত্রুটি' : 'Payment process error'));
    },
  });

  // Private Student Receipt Search (Tab 2) — No open public listing
  // Private Student Receipt Search (Tab 2) — No open public listing
  const handleSearchStudentReceipts = async () => {
    const queryVal = receiptIdentifier.trim();
    if (!queryVal) {
      toast.error(bn ? 'রোল, রেজিস্ট্রেশন অথবা রসিদ নম্বর লিখুন' : 'Enter roll, registration or receipt number');
      return;
    }
    setReceiptSearchLoading(true);
    try {
      const normQueryVal = queryVal.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
      const sessId = receiptSession && receiptSession !== 'all' ? receiptSession : null;
      const clsId = receiptClass && receiptClass !== 'all' ? receiptClass : null;
      const yrNum = receiptYear && receiptYear !== 'all' ? parseInt(receiptYear) : null;

      // 1. Try dedicated public security-definer RPC if available
      try {
        const { data: rpcReceipts, error: rpcReceiptErr } = await (supabase as any).rpc('public_search_student_receipts', {
          p_identifier: normQueryVal || queryVal,
          p_session_id: sessId,
          p_class_id: clsId,
          p_year: yrNum,
        });

        if (!rpcReceiptErr && rpcReceipts && rpcReceipts.length > 0) {
          const first = rpcReceipts[0];
          const studentProfile = {
            id: first.student_id,
            name_bn: first.student_name,
            name_en: first.student_name,
            student_id: first.student_code,
            registration_no: first.student_code,
            roll_number: first.roll,
            divisions: { name_bn: first.class_name, name: first.class_name },
          };
          const formatted = rpcReceipts.map((p: any) => ({
            id: p.id,
            receipt_number: p.receipt_number,
            student_name: p.student_name,
            student_id: p.student_code,
            class_name: p.class_name,
            roll: p.roll,
            fee_type: bn ? (p.fee_type_bn || p.fee_type) : p.fee_type,
            amount: p.amount,
            paid_amount: p.paid_amount,
            status: p.status,
            paid_at: p.paid_at,
            month: p.month,
            year: p.year,
          }));

          setReceiptSearchResult({ student: studentProfile, receipts: formatted, hasSearched: true });
          toast.success(bn ? `${formatted.length}টি রসিদ পাওয়া গেছে` : `Found ${formatted.length} receipt(s)`);
          return;
        }
      } catch {
        // Fall back to direct query / lookup
      }

      // 2. Direct Receipt Number Search (e.g. STU-... or RCP-...)
      if (queryVal.toUpperCase().startsWith('STU-') || queryVal.toUpperCase().startsWith('RCP-')) {
        const { data: recPayments, error: recErr } = await supabase
          .from('fee_payments')
          .select(`
            *,
            students!inner(name_bn, name_en, student_id, roll_number, registration_no, division_id, divisions:division_id(name, name_bn)),
            fee_types!inner(name, name_bn, fee_category)
          `)
          .eq('status', 'paid')
          .ilike('receipt_number', `%${queryVal}%`);

        if (recErr) throw recErr;

        if (!recPayments || recPayments.length === 0) {
          toast.error(bn ? 'এই রসিদ নম্বরে কোনো তথ্য পাওয়া যায়নি' : 'No receipt found with this number');
          setReceiptSearchResult({ student: null, receipts: [], hasSearched: true });
          return;
        }

        const st = recPayments[0].students;
        const formatted = recPayments.map((p: any) => ({
          id: p.id,
          receipt_number: p.receipt_number || `RCP-${p.id.slice(0, 8).toUpperCase()}`,
          student_name: p.students?.name_bn || p.students?.name_en || '',
          student_id: p.students?.student_id || p.students?.registration_no || '',
          class_name: p.students?.divisions?.name_bn || p.students?.divisions?.name || '',
          roll: p.students?.roll_number || '',
          fee_type: bn ? p.fee_types?.name_bn : p.fee_types?.name,
          amount: p.amount,
          paid_amount: p.paid_amount || p.amount,
          status: p.status,
          paid_at: p.paid_at,
          month: p.month,
          year: p.year,
        }));

        setReceiptSearchResult({ student: st, receipts: formatted, hasSearched: true });
        toast.success(bn ? `${formatted.length}টি রসিদ পাওয়া গেছে` : `Found ${formatted.length} receipt(s)`);
        return;
      }

      // 3. Search student by registration_no, student_id, or roll_number (+ optional session & class)
      let matchedStudent: any = null;

      // Try public_search_student_for_fee RPC first
      try {
        const { data: rpcStu, error: rpcStuErr } = await (supabase as any).rpc('public_search_student_for_fee', {
          p_identifier: normQueryVal || queryVal,
          p_session_id: sessId,
          p_class_id: clsId,
        });
        if (!rpcStuErr && rpcStu && rpcStu.length > 0) {
          const r = rpcStu[0];
          matchedStudent = {
            ...r,
            divisions: { name_bn: r.class_name_bn, name: r.class_name },
          };
        }
      } catch {
        // ignore
      }

      if (!matchedStudent) {
        let stuQuery = supabase
          .from('students')
          .select('id, name_bn, name_en, student_id, roll_number, registration_no, division_id, class_id, session_id, classes:class_id(name, name_bn), divisions:division_id(name, name_bn), academic_sessions:session_id(name, name_bn)')
          .or('status.eq.active,status.is.null');

        if (isStaffOrAdmin) {
          stuQuery = stuQuery.is('deleted_at', null);
        }

        if (sessId) {
          stuQuery = stuQuery.eq('session_id', sessId);
        }

        if (clsId) {
          stuQuery = stuQuery.eq('class_id', clsId);
        }

        stuQuery = stuQuery.or(
          `registration_no.eq.${queryVal},registration_no.eq.${normQueryVal},student_id.eq.${queryVal},student_id.eq.${normQueryVal},roll_number.eq.${queryVal},roll_number.eq.${normQueryVal}`
        );

        try {
          const { data: matchedStudents, error: stuErr } = await stuQuery.limit(5);
          if (!stuErr && matchedStudents && matchedStudents.length > 0) {
            matchedStudent = matchedStudents[0];
          }
        } catch {
          // ignore
        }
      }

      // Fallback to lookup_student_for_fee RPC
      if (!matchedStudent) {
        try {
          const { data: feeRpc, error: feeRpcErr } = await (supabase as any).rpc('lookup_student_for_fee', {
            p_reg_no: queryVal,
          });
          if (!feeRpcErr && feeRpc && feeRpc.length > 0) {
            const st = feeRpc[0];
            const classObj = classes.find((c: any) => c.id === st.class_id);
            matchedStudent = {
              ...st,
              divisions: classObj ? { name_bn: classObj.name_bn, name: classObj.name } : null,
            };
          }
        } catch {
          // ignore
        }
      }

      if (!matchedStudent) {
        toast.error(bn ? 'উক্ত তথ্যে কোনো শিক্ষার্থী পাওয়া যায়নি' : 'No student found with this information');
        setReceiptSearchResult({ student: null, receipts: [], hasSearched: true });
        return;
      }

      // Fetch ONLY this student's paid fee_payments
      let feeQuery = supabase
        .from('fee_payments')
        .select(`
          *,
          students!inner(name_bn, name_en, father_name, father_name_en, student_id, roll_number, registration_no, division_id, class_id, classes:class_id(name, name_bn), divisions:division_id(name, name_bn)),
          fee_types!inner(name, name_bn, fee_category)
        `)
        .eq('student_id', matchedStudent.id)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false });

      if (receiptYear && receiptYear !== 'all') {
        feeQuery = feeQuery.eq('year', parseInt(receiptYear));
      }

      const { data: studentPayments, error: feeErr } = await feeQuery;
      if (feeErr) throw feeErr;

      const formatted = (studentPayments || []).map((p: any) => ({
        id: p.id,
        receipt_number: p.receipt_number || `RCP-${p.id.slice(0, 8).toUpperCase()}`,
        student_name: matchedStudent.name_bn || matchedStudent.name_en || '',
        father_name: matchedStudent.father_name || matchedStudent.father_name_en || '',
        student_id: matchedStudent.student_id || matchedStudent.registration_no || '',
        class_name: matchedStudent.divisions?.name_bn || matchedStudent.divisions?.name || '',
        roll: matchedStudent.roll_number || '',
        fee_type: bn ? p.fee_types?.name_bn : p.fee_types?.name,
        amount: p.amount,
        paid_amount: p.paid_amount || p.amount,
        status: p.status,
        paid_at: p.paid_at,
        month: p.month,
        year: p.year,
      }));

      setReceiptSearchResult({ student: matchedStudent, receipts: formatted, hasSearched: true });
      if (formatted.length > 0) {
        toast.success(bn ? `${formatted.length}টি পরিশোধিত রসিদ পাওয়া গেছে` : `Found ${formatted.length} receipt(s)`);
      } else {
        toast.info(bn ? 'এই শিক্ষার্থীর কোনো পরিশোধিত রসিদ পাওয়া যায়নি' : 'No paid receipts found for this student');
      }
    } catch (err: any) {
      toast.error(err.message || (bn ? 'অনুসন্ধানে ত্রুটি হয়েছে' : 'Search error'));
    } finally {
      setReceiptSearchLoading(false);
    }
  };

  // Receipt Printing
  const handlePrint = (receipt: ReceiptData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
    <!DOCTYPE html>
    <html><head>
      <meta charset="utf-8" />
      <title>Receipt - ${receipt.receipt_number}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', 'Noto Sans Bengali', sans-serif; background: #f1f5f9; display: flex; justify-content: center; padding: 40px 20px; }
        .card { background: white; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15); max-width: 480px; width: 100%; padding: 40px 36px; }
        .header { text-align: center; margin-bottom: 28px; }
        .check-icon { width: 56px; height: 56px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
        .check-icon svg { width: 28px; height: 28px; color: white; }
        .inst-name { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
        .inst-addr { font-size: 12px; color: #64748b; }
        .receipt-label { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #94a3b8; margin-top: 12px; }
        .section { background: #f8fafc; border-radius: 16px; padding: 20px; margin-bottom: 16px; }
        .row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
        .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 500; }
        .value { font-size: 14px; font-weight: 600; color: #0f172a; text-align: right; }
        .dashed { border-top: 2px dashed #e2e8f0; margin: 16px 0; }
        .total-row { display: flex; justify-content: space-between; align-items: center; }
        .total-label { font-size: 13px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 1px; }
        .total-value { font-size: 32px; font-weight: 800; color: #4f46e5; }
        .currency { font-size: 18px; font-weight: 500; }
        .sig-section { margin-top: 40px; display: flex; justify-content: space-between; gap: 40px; }
        .sig-block { text-align: center; flex: 1; }
        .sig-line { border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
        .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #94a3b8; }
        .status-badge { display: inline-block; background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #065f46; font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; }
        @media print { body { background: white; padding: 0; } .card { box-shadow: none; border-radius: 0; max-width: 100%; } }
      </style>
    </head><body>
      <div class="card">
        <div class="header">
          <div class="check-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          ${institution?.logo_url ? `<img src="${institution.logo_url}" style="height:50px;margin:0 auto 8px" />` : ''}
          <div class="inst-name">${institution?.name || 'প্রতিষ্ঠানের নাম'}</div>
          ${institution?.name_en ? `<div style="font-size:13px;font-weight:600;color:#334155;margin-bottom:2px">${institution.name_en}</div>` : ''}
          <div class="inst-addr">${institution?.address || ''}</div>
          ${institution?.phone ? `<div class="inst-addr">${bn ? 'ফোন' : 'Phone'}: ${institution.phone}</div>` : ''}
          <div class="receipt-label">${bn ? 'মানি রিসিট' : 'Money Receipt'}</div>
        </div>
        <div class="section">
          <div class="row"><span class="label">${bn ? 'রসিদ নং' : 'Receipt No'}</span><span class="value">${receipt.receipt_number}</span></div>
          <div class="row"><span class="label">${bn ? 'তারিখ' : 'Date'}</span><span class="value">${receipt.paid_at ? new Date(receipt.paid_at).toLocaleDateString('bn-BD') : '-'}</span></div>
          <div class="row"><span class="label">${bn ? 'স্ট্যাটাস' : 'Status'}</span><span class="status-badge">${bn ? 'পরিশোধিত' : 'Paid'}</span></div>
        </div>
        <div class="section">
          <div class="row"><span class="label">${bn ? 'ছাত্রের নাম' : 'Student'}</span><span class="value">${receipt.student_name}</span></div>
          ${receipt.father_name ? `<div class="row"><span class="label">${bn ? 'পিতার নাম' : "Father's Name"}</span><span class="value">${receipt.father_name}</span></div>` : ''}
          <div class="row"><span class="label">${bn ? 'আইডি' : 'ID'}</span><span class="value">${bn && receipt.student_id ? toBanglaDigits(receipt.student_id) : receipt.student_id}</span></div>
          <div class="row"><span class="label">${bn ? 'শ্রেণী' : 'Class'}</span><span class="value">${receipt.class_name}</span></div>
          <div class="row"><span class="label">${bn ? 'রোল' : 'Roll'}</span><span class="value">${bn && receipt.roll ? toBanglaDigits(receipt.roll) : receipt.roll}</span></div>
        </div>
        <div class="section">
          <div class="row"><span class="label">${bn ? 'ফি এর ধরন' : 'Fee Type'}</span><span class="value">${receipt.fee_type}</span></div>
          <div class="row"><span class="label">${bn ? 'মাস' : 'Month'}</span><span class="value">${bn ? toBanglaMonth(receipt.month) : (receipt.month || '-')}</span></div>
          <div class="row"><span class="label">${bn ? 'বছর' : 'Year'}</span><span class="value">${bn && receipt.year ? toBanglaDigits(receipt.year) : (receipt.year || '-')}</span></div>
        </div>
        <div class="dashed"></div>
        <div class="total-row">
          <span class="total-label">${bn ? 'মোট পরিশোধ' : 'Total Paid'}</span>
          <span class="total-value"><span class="currency">৳</span>${receipt.paid_amount.toLocaleString('bn-BD')}</span>
        </div>
        <div class="sig-section">
          <div class="sig-block"><div class="sig-line">${bn ? 'আদায়কারী' : 'Received By'}</div></div>
          <div class="sig-block"><div class="sig-line">${bn ? 'অনুমোদনকারী' : 'Authorized By'}</div></div>
        </div>
        <div class="footer">${bn ? 'এটি কম্পিউটার জেনারেটেড রসিদ' : 'This is a computer-generated receipt'}</div>
      </div>
    </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 600);
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        {/* Top Admin Quick Switcher Banner */}
        {isStaffOrAdmin && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-900/50 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-blue-950 dark:text-blue-200">
              <Shield className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                {bn
                  ? `আপনি অ্যাডমিন হিসেবে লগইন আছেন (${collectorName})। সরাসরি অফিস ফি আদায় সিস্টেমে যেতে পারেন:`
                  : `Logged in as staff/admin (${collectorName}). You can switch to full office fee portal:`}
              </span>
            </div>
            <Link to="/admin/students-fees">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs whitespace-nowrap">
                {bn ? 'অফিস ফি কালেকশন প্যানেল' : 'Office Fee Collection'}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        )}

        {/* Page Title & Subtitle */}
        <div className="text-center space-y-1.5">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground flex items-center justify-center gap-2.5">
            <CreditCard className="w-8 h-8 text-primary" />
            {bn ? 'ফি আদায় ও পরিশোধ' : 'Fee Collection & Payment'}
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            {bn
              ? 'শিক্ষার্থীর রোল বা আইডি দিয়ে খুঁজুন, বকেয়া ফি পরিশোধ করুন অথবা পূর্বে পরিশোধিত রসিদ দেখুন ও প্রিন্ট করুন'
              : 'Search student by roll or ID, pay due fees or view/print paid receipts'}
          </p>
        </div>

        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="grid grid-cols-2 w-full max-w-md h-11 p-1 bg-muted/80 rounded-xl">
              <TabsTrigger value="pay" className="rounded-lg text-sm font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                {bn ? 'ফি আদায় ও পরিশোধ' : 'Pay / Collect Fee'}
              </TabsTrigger>
              <TabsTrigger value="receipts" className="rounded-lg text-sm font-semibold flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                {bn ? 'পরিশোধিত রসিদ' : 'Paid Receipts'}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ================= TAB 1: PAY / COLLECT FEE ================= */}
          <TabsContent value="pay" className="space-y-6">
            {/* Search Box Card */}
            <Card className="border-border/80 shadow-sm overflow-hidden">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                  <div>
                    <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
                      <Search className="w-4 h-4 text-primary" />
                      {bn ? 'শিক্ষার্থী খুঁজুন (ফি পরিশোধের জন্য)' : 'Find Student for Fee Payment'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {bn
                        ? 'সেশন, শ্রেণি ও রোল বা রেজিস্ট্রেশন নম্বর দিয়ে শিক্ষার্থীর তথ্য ও বকেয়া ফি বের করুন'
                        : 'Select session, class, and enter roll or registration number to find student'}
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
                      className="text-xs h-8 text-muted-foreground hover:text-foreground"
                    >
                      {bn ? 'অন্য শিক্ষার্থী খুঁজুন' : 'Search Another Student'}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end pt-1">
                  {/* 1. Academic Session */}
                  <div className="space-y-1.5 lg:col-span-3">
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
                        {sessions.filter((s: any) => Boolean(s?.id)).map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {bn ? s.name_bn || s.name : s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 2. Class */}
                  <div className="space-y-1.5 lg:col-span-3">
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
                        {classes.filter((c: any) => Boolean(c?.id)).map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {bn ? c.name_bn || c.name : c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 3. Roll or Registration # */}
                  <div className="space-y-1.5 lg:col-span-4">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" />
                      {bn ? 'রোল / রেজিঃ নম্বর' : 'Roll / Reg No'}
                    </label>
                    <Input
                      value={searchIdentifier}
                      onChange={(e) => setSearchIdentifier(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchStudent()}
                      placeholder={bn ? 'রোল বা রেজিঃ নং (যেমন: 101 বা 2026101)' : 'Roll or Reg No (e.g. 101)...'}
                      className="h-11 bg-background text-base"
                    />
                  </div>

                  {/* 4. Search Button */}
                  <div className="lg:col-span-2">
                    <Button
                      onClick={searchStudent}
                      disabled={searching}
                      className="w-full h-11 font-semibold gap-1.5 text-sm"
                    >
                      {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      {bn ? 'খুঁজুন' : 'Search'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Found Student Profile Card */}
            {foundStudent && (
              <div className="space-y-6 animate-fade-in">
                <Card className="border-primary/20 bg-primary/5 shadow-xs overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xl shrink-0 overflow-hidden border border-primary/30">
                          {foundStudent.photo_url ? (
                            <img src={foundStudent.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-7 h-7" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-bold text-foreground">
                              {foundStudent.name_bn || foundStudent.name_en}
                            </h2>
                            <Badge className="bg-emerald-600 text-white text-xs">
                              {bn ? 'নিয়মিত শিক্ষার্থী' : 'Active'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
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
                                <span>{bn ? 'রেজিঃ/আইডি:' : 'Reg/ID:'} <strong className="text-foreground font-mono">{foundStudent.registration_no || foundStudent.student_id}</strong></span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right text-xs space-y-1 text-muted-foreground">
                        {foundStudent.father_name && (
                          <div>{bn ? 'পিতার নাম:' : "Father's:"} <span className="font-medium text-foreground">{foundStudent.father_name}</span></div>
                        )}
                        {foundStudent.father_phone && (
                          <div className="flex items-center gap-1 sm:justify-end">
                            <Phone className="w-3 h-3" />
                            <span>{foundStudent.father_phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Fee Payment Status Matrix */}
                <Card className="border-border/80 shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-primary" />
                        {bn ? `মাসিক বেতনের অবস্থা (${selectedYear})` : `Monthly Fee Status (${selectedYear})`}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {bn ? 'সবুজ = পরিশোধিত, লাল = বকেয়া' : 'Green = Paid, Red = Due'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                      {MONTHS.map((m, idx) => {
                        const isPaid = studentFeePayments.some(
                          (p: any) => p.status === 'paid' && p.month === m.value && p.year === parseInt(selectedYear)
                        );
                        const isCurrentMonth = idx === new Date().getMonth();
                        const isPastMonth = idx < new Date().getMonth();

                        return (
                          <div
                            key={m.value}
                            className={`p-2.5 rounded-lg border text-center transition-all ${
                              isPaid
                                ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800'
                                : isPastMonth
                                ? 'bg-red-50/60 border-red-300 dark:bg-red-950/20 dark:border-red-800'
                                : isCurrentMonth
                                ? 'bg-amber-50/60 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800'
                                : 'bg-muted/40 border-border text-muted-foreground'
                            }`}
                          >
                            <div className="text-xs font-semibold">{bn ? m.bn : m.en}</div>
                            <div className="mt-1">
                              {isPaid ? (
                                <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                  <Check className="w-3 h-3 mr-0.5" /> {bn ? 'পরিশোধিত' : 'Paid'}
                                </span>
                              ) : isPastMonth ? (
                                <span className="inline-flex items-center text-[10px] font-bold text-red-700 dark:text-red-400">
                                  <AlertTriangle className="w-3 h-3 mr-0.5" /> {bn ? 'বকেয়া' : 'Due'}
                                </span>
                              ) : isCurrentMonth ? (
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                  {bn ? 'চলতি মাস' : 'Current'}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">{bn ? 'অপেক্ষমাণ' : 'Upcoming'}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Form Card */}
                {!paymentSuccess ? (
                  <Card className="border-border/80 shadow-md">
                    <CardContent className="p-6 space-y-6">
                      <div className="border-b pb-3">
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                          <Banknote className="w-5 h-5 text-emerald-600" />
                          {bn ? 'ফি আদায় ও পরিশোধ ফরম' : 'Fee Payment & Collection Form'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {bn ? 'যে ফি দিতে চান তা নির্বাচন করে সহজে জমা দিন' : 'Select fee type and submit payment'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Fee Type Select */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs font-semibold">{bn ? 'ফি এর ধরন নির্বাচন করুন' : 'Select Fee Type'} *</Label>
                          <Select value={selectedFeeTypeId} onValueChange={handleFeeTypeChange}>
                            <SelectTrigger className="h-11 bg-background">
                              <SelectValue placeholder={bn ? 'ফি নির্বাচন করুন...' : 'Choose fee type...'} />
                            </SelectTrigger>
                            <SelectContent>
                              {applicableFeeTypes.map((ft: any) => (
                                <SelectItem key={ft.id} value={ft.id}>
                                  {bn ? ft.name_bn : ft.name} {ft.amount ? `— ৳${ft.amount.toLocaleString()}` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Month Select for Monthly or fees with applicable months */}
                        {((selectedFeeTypeObj?.payment_frequency === 'monthly') || (Array.isArray(selectedFeeTypeObj?.applicable_months) && selectedFeeTypeObj.applicable_months.length > 0)) && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">{bn ? 'মাস' : 'Month'} *</Label>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                              <SelectTrigger className="h-11 bg-background">
                                <SelectValue placeholder={bn ? 'মাস' : 'Month'} />
                              </SelectTrigger>
                              <SelectContent>
                                {MONTHS.filter((m) => {
                                  if (!selectedFeeTypeObj?.applicable_months || selectedFeeTypeObj.applicable_months.length === 0) return true;
                                  return selectedFeeTypeObj.applicable_months.some((am: string) => am.split('-')[0] === m.value);
                                }).map((m) => (
                                  <SelectItem key={m.value} value={m.value}>{bn ? m.bn : m.en}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Year Select */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">{bn ? 'বছর' : 'Year'} *</Label>
                          <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="h-11 bg-background">
                              <SelectValue placeholder={bn ? 'বছর' : 'Year'} />
                            </SelectTrigger>
                            <SelectContent>
                              {[2026, 2025, 2024].map((y) => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Amount Input */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs font-semibold">{bn ? 'টাকার পরিমাণ (৳)' : 'Amount (৳)'} *</Label>
                          <Input
                            type="number"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            placeholder="0.00"
                            className="h-11 bg-background font-mono text-lg font-bold text-foreground"
                          />
                        </div>

                        {/* Payment Method Toggle */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs font-semibold">{bn ? 'পরিশোধের মাধ্যম' : 'Payment Method'} *</Label>
                          <div className="grid grid-cols-2 gap-3">
                            {isStaffOrAdmin && (
                              <button
                                type="button"
                                onClick={() => setPaymentMethod('cash')}
                                className={`p-3.5 rounded-xl border text-center transition-all flex items-center justify-center gap-2 ${
                                  paymentMethod === 'cash'
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold'
                                    : 'border-border bg-background hover:bg-muted/40 text-muted-foreground'
                                }`}
                              >
                                <Banknote className="w-5 h-5 text-emerald-600" />
                                <span>{bn ? 'ক্যাশ আদায় (অফিস)' : 'Cash (Office)'}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('online')}
                              className={`p-3.5 rounded-xl border text-center transition-all flex items-center justify-center gap-2 ${
                                !isStaffOrAdmin ? 'col-span-2' : ''
                              } ${
                                paymentMethod === 'online'
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold'
                                  : 'border-border bg-background hover:bg-muted/40 text-muted-foreground'
                              }`}
                            >
                              <CreditCard className="w-5 h-5 text-blue-600" />
                              <span>{bn ? 'অনলাইন / মোবাইল ব্যাংকিং' : 'Mobile Banking / Online'}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Online / Manual Payment Details (bKash / Nagad / Rocket) */}
                      {paymentMethod === 'online' && (
                        <div className="rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-4">
                          <ManualPaymentMethods
                            transactionId={manualTrxId}
                            onTransactionIdChange={setManualTrxId}
                            selectedMethod={manualMethod}
                            onMethodSelect={setManualMethod}
                          />

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">{bn ? 'প্রেরক মোবাইল নম্বর' : 'Sender Phone'} *</Label>
                              <Input
                                value={senderPhone}
                                onChange={(e) => setSenderPhone(e.target.value)}
                                placeholder="017xxxxxxxx"
                                className="h-10 bg-background"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold">{bn ? 'ট্রানজেকশন আইডি (TrxID)' : 'Transaction ID'} *</Label>
                              <Input
                                value={manualTrxId}
                                onChange={(e) => setManualTrxId(e.target.value)}
                                placeholder="e.g. 9J47AB89"
                                className="h-10 bg-background font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cash Collector Selection (Staff/Teacher or Custom) */}
                      {paymentMethod === 'cash' && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3">
                          <CollectorSelector
                            value={customCollector}
                            onChange={setCustomCollector}
                            defaultCollectorName={collectorName}
                          />
                        </div>
                      )}

                      {/* Submit Payment Button */}
                      <div className="pt-2">
                        <Button
                          className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
                          disabled={payMutation.isPending || !selectedFeeTypeId || !customAmount}
                          onClick={() => payMutation.mutate()}
                        >
                          {payMutation.isPending ? (
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                          )}
                          {paymentMethod === 'cash'
                            ? (bn ? 'ক্যাশ ফি আদায় নিশ্চিত করুন' : 'Confirm Cash Payment')
                            : (bn ? 'ফি পরিশোধের তথ্য জমা দিন' : 'Submit Fee Payment')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  /* Success & Instant Receipt View */
                  <Card className="border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md">
                    <CardContent className="p-6 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg">
                        <CheckCircle2 className="w-9 h-9" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-2xl font-bold text-foreground">
                          {paymentSuccess.isCash
                            ? (bn ? 'ফি আদায় সম্পন্ন হয়েছে!' : 'Payment Completed!')
                            : (bn ? 'পেমেন্ট তথ্য সংরক্ষিত হয়েছে!' : 'Payment Submitted!')}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {paymentSuccess.isCash
                            ? (bn ? 'রসিদ প্রিন্ট করুন এবং শিক্ষার্থীকে প্রদান করুন।' : 'Print receipt for the student.')
                            : (bn ? 'অফিস যাচাই শেষে পেমেন্ট চূড়ান্তভাবে অনুমোদন করা হবে।' : 'Office will verify and approve the payment.')}
                        </p>
                      </div>

                      <div className="inline-block bg-background px-4 py-2 rounded-lg border font-mono text-sm">
                        <span className="text-muted-foreground mr-2">{bn ? 'রসিদ / ট্রানজেকশন নং:' : 'Receipt No:'}</span>
                        <strong className="text-foreground">{paymentSuccess.serialNumber}</strong>
                      </div>

                      <div className="flex flex-wrap justify-center gap-3 pt-2">
                        <Button
                          onClick={() => {
                            const recData: ReceiptData = {
                              id: paymentSuccess.feePayment?.id || paymentSuccess.txnId,
                              receipt_number: paymentSuccess.serialNumber,
                              student_name: foundStudent.name_bn || foundStudent.name_en || '',
                              father_name: foundStudent.father_name || foundStudent.father_name_en || '',
                              student_id: foundStudent.student_id || foundStudent.registration_no || '',
                              class_name: foundStudent.divisions?.name_bn || foundStudent.classes?.name_bn || '',
                              roll: foundStudent.roll_number || '',
                              fee_type: paymentSuccess.feeTypeName,
                              amount: paymentSuccess.amount,
                              paid_amount: paymentSuccess.amount,
                              status: paymentSuccess.isCash ? 'paid' : 'pending',
                              paid_at: new Date().toISOString(),
                              month: selectedMonth,
                              year: parseInt(selectedYear),
                            };
                            handlePrint(recData);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        >
                          <Printer className="w-4 h-4 mr-2" />
                          {bn ? 'রসিদ প্রিন্ট করুন' : 'Print Receipt'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setPaymentSuccess(null);
                            setSelectedFeeTypeId('');
                            setManualTrxId('');
                            setSenderPhone('');
                          }}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {bn ? 'আরেকটি ফি আদায় করুন' : 'New Payment'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* ================= TAB 2: PRIVATE STUDENT RECEIPT LOOKUP ================= */}
          <TabsContent value="receipts" className="space-y-6">
            {/* Search Box Card */}
            <Card className="border-border/80 shadow-sm overflow-hidden">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                      <Search className="w-4 h-4 text-primary" />
                      {bn ? 'পরিশোধিত রসিদ অনুসন্ধান' : 'Find Paid Receipts'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {bn
                        ? 'আপনার সেশন, বছর ও রোল/রেজিস্ট্রেশন নম্বর দিয়ে অনুসন্ধান করে শুধুমাত্র আপনার রসিদ বের করুন'
                        : 'Search by session, year, and roll/registration to view and print your receipts'}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs text-muted-foreground self-start sm:self-auto gap-1">
                    <Shield className="w-3 h-3 text-emerald-600" />
                    {bn ? 'ব্যক্তিগত ও সুরক্ষিত' : 'Private & Secure'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-1 items-end">
                  {/* Session Dropdown */}
                  <div className="space-y-1 lg:col-span-3">
                    <Label className="text-xs font-semibold">{bn ? 'সেশন / শিক্ষাবর্ষ' : 'Session / Year'}</Label>
                    <Select value={receiptSession} onValueChange={setReceiptSession}>
                      <SelectTrigger className="bg-background h-11">
                        <SelectValue placeholder={bn ? 'সব সেশন' : 'All Sessions'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{bn ? 'সব সেশন' : 'All Sessions'}</SelectItem>
                        {sessions.filter((s: any) => Boolean(s?.id)).map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {bn ? (s.name_bn || s.name) : s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Class Dropdown */}
                  <div className="space-y-1 lg:col-span-3">
                    <Label className="text-xs font-semibold">{bn ? 'শ্রেণি / ক্লাস' : 'Class'}</Label>
                    <Select value={receiptClass} onValueChange={setReceiptClass}>
                      <SelectTrigger className="bg-background h-11">
                        <SelectValue placeholder={bn ? 'সব শ্রেণি' : 'All Classes'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{bn ? 'সব শ্রেণি' : 'All Classes'}</SelectItem>
                        {classes.filter((c: any) => Boolean(c?.id)).map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {bn ? c.name_bn || c.name : c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Year Dropdown */}
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-xs font-semibold">{bn ? 'বছর' : 'Year'}</Label>
                    <Select value={receiptYear} onValueChange={setReceiptYear}>
                      <SelectTrigger className="bg-background h-11">
                        <Calendar className="w-4 h-4 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder={bn ? 'বছর' : 'Year'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{bn ? 'সব বছর' : 'All Years'}</SelectItem>
                        {[2026, 2025, 2024].map((y) => (
                          <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Roll / Reg / ID / Receipt # Input */}
                  <div className="space-y-1 lg:col-span-4">
                    <Label className="text-xs font-semibold">
                      {bn ? 'রোল / রেজিঃ / রসিদ নং' : 'Roll / Reg / Receipt #'}{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder={bn ? 'রোল, রেজিঃ বা রসিদ নং...' : 'Enter roll, reg or receipt...'}
                        value={receiptIdentifier}
                        onChange={(e) => setReceiptIdentifier(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchStudentReceipts()}
                        className="bg-background h-11 text-base flex-1"
                      />
                      <Button
                        onClick={handleSearchStudentReceipts}
                        disabled={receiptSearchLoading}
                        className="h-11 px-4 font-semibold shrink-0"
                      >
                        {receiptSearchLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        ) : (
                          <Search className="w-4 h-4 mr-1.5" />
                        )}
                        {bn ? 'খুঁজুন' : 'Search'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Privacy Guard Empty State (Before Search) */}
            {!receiptSearchResult.hasSearched ? (
              <Card className="border-border/60 bg-muted/20 text-center p-8 sm:p-12 space-y-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
                  <Shield className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  {bn ? 'গোপনীয় ও সুরক্ষিত রসিদ সেবা' : 'Confidential & Secure Receipt Portal'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  {bn
                    ? 'শিক্ষার্থীদের ব্যক্তিগত তথ্যের সুরক্ষার স্বার্থে কোনো প্রকাশ্য তালিকা উন্মুক্ত রাখা হয় না। আপনার সেশন ও রোল অথবা রেজিস্ট্রেশন নম্বর লিখে অনুসন্ধান করে শুধুমাত্র আপনার পরিশোধিত রসিদসমূহ দেখুন ও ডাউনলোড করুন।'
                    : 'To protect student privacy, public receipt lists are not displayed openly. Enter your session and roll or registration number above to find and download only your receipts.'}
                </p>
              </Card>
            ) : (
              /* Search Results Section */
              <div className="space-y-4 animate-fade-in">
                {/* Student Profile Card (if found) */}
                {receiptSearchResult.student && (
                  <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/40 shadow-xs">
                    <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-lg shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-base text-foreground">
                            {receiptSearchResult.student.name_bn || receiptSearchResult.student.name_en}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span>{bn ? 'শ্রেণি:' : 'Class:'} <strong className="text-foreground">{receiptSearchResult.student.classes?.name_bn || receiptSearchResult.student.classes?.name || receiptSearchResult.student.divisions?.name_bn || receiptSearchResult.student.divisions?.name || '—'}</strong></span>
                            <span>•</span>
                            <span>{bn ? 'রোল:' : 'Roll:'} <strong className="text-foreground">{receiptSearchResult.student.roll_number || '—'}</strong></span>
                            {receiptSearchResult.student.registration_no && (
                              <>
                                <span>•</span>
                                <span>{bn ? 'রেজিঃ:' : 'Reg:'} <strong className="text-foreground font-mono">{receiptSearchResult.student.registration_no}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <Badge className="bg-emerald-600 text-white text-xs px-2.5 py-1">
                        {bn ? `মোট ${receiptSearchResult.receipts.length}টি রসিদ পাওয়া গেছে` : `${receiptSearchResult.receipts.length} receipt(s) found`}
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {/* Receipts Table / List */}
                {receiptSearchResult.receipts.length === 0 ? (
                  <Card className="border-border/80 text-center py-12 space-y-3">
                    <Receipt className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                    <h4 className="text-base font-bold text-foreground">
                      {bn ? 'কোনো পরিশোধিত রসিদ পাওয়া যায়নি' : 'No Paid Receipts Found'}
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      {bn
                        ? 'উক্ত সেশন ও রোল/রেজিস্ট্রেশনে এই বছরের কোনো পরিশোধিত রসিদ পাওয়া যায়নি। সঠিক তথ্য দিয়ে পুনরায় চেষ্টা করুন।'
                        : 'No paid fee receipts found with this information. Please check your roll/registration and try again.'}
                    </p>
                  </Card>
                ) : (
                  <Card className="border-border/80 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border">
                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                              {bn ? 'রসিদ নং' : 'Receipt #'}
                            </th>
                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                              {bn ? 'ফি এর ধরন' : 'Fee Type'}
                            </th>
                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">
                              {bn ? 'মাস ও বছর' : 'Month & Year'}
                            </th>
                            <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                              {bn ? 'পরিশোধিত টাকা' : 'Paid Amount'}
                            </th>
                            <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                              {bn ? 'অ্যাকশন' : 'Action'}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {receiptSearchResult.receipts.map((p) => (
                            <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs text-foreground font-bold">
                                {p.receipt_number}
                                {p.paid_at && (
                                  <div className="text-[10px] text-muted-foreground font-sans font-normal">
                                    {new Date(p.paid_at).toLocaleDateString('bn-BD')}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 font-medium text-foreground">
                                {p.fee_type}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                                {p.month ? (bn ? MONTHS.find(m => m.value === p.month)?.bn || p.month : p.month) : '—'} {p.year || ''}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono text-base">
                                ৳{p.paid_amount.toLocaleString('bn-BD')}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3 font-semibold text-xs border-primary/40 text-primary hover:bg-primary/10 gap-1.5"
                                  onClick={() => handlePrint(p)}
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  {bn ? 'প্রিন্ট / রসিদ' : 'Print / View'}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PublicLayout>
  );
};

export default FeePaymentPage;
