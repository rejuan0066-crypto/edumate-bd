import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Loader2, Palette, Printer, Search, X } from 'lucide-react';
import { downloadReceiptAsPdf } from '@/lib/receiptPdfDownload';
import { toast } from 'sonner';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import { Link } from 'react-router-dom';
import { buildSingleStudentPrintHtml, buildBulkClassPrintHtml, ReceiptData, ReceiptStyleConfig } from './receiptPrintLayouts';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { bnToEn, enToBn } from '@/lib/utils';

interface Props {
  collectorName?: string;
}

const FeeReceiptDownload = ({ collectorName }: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { defaultSetting } = useReceiptSettings();
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedFeeType, setSelectedFeeType] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'success' | ''>('');
  const [searching, setSearching] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  // Search results state
  const [searchResults, setSearchResults] = useState<ReceiptData[] | null>(null);
  const [resultMeta, setResultMeta] = useState<{ count: number; studentName: string; className: string } | null>(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions_receipt'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_sessions').select('*').eq('is_active', true).order('name');
      return data || [];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes_receipt'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('*, divisions(name_bn, name)').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: institution } = useQuery({
    queryKey: ['institution_receipt'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
  });

  const { data: feeTypes = [] } = useQuery({
    queryKey: ['fee_types_receipt'],
    queryFn: async () => {
      const { data } = await supabase.from('fee_types').select('*').eq('is_active', true).order('name_bn');
      return data || [];
    },
  });

  const hasSession = !!selectedSession;
  const hasSecondField = !!(selectedClass || rollNumber.trim() || regNumber.trim());
  const hasStatus = !!statusFilter;
  const canSearch = hasSession && hasSecondField && hasStatus;

  const cleanRolePrefix = (name: string) => {
    return name.replace(/\s*\((?:Admin|Staff|Teacher|Super Admin|admin|staff|teacher|super_admin|অ্যাডমিন|স্টাফ|শিক্ষক)\)\s*/gi, '').trim();
  };

  const getCollectorFromNotes = (notes: string) => {
    const match = notes?.match(/আদায়কারী: (.+?)(?:\||$)/);
    const raw = match ? match[1].trim() : collectorName;
    return cleanRolePrefix(raw);
  };

  const isSingleStudent = !!(rollNumber.trim() || regNumber.trim());

  const handleSearch = async () => {
    if (!selectedSession) {
      toast.error(bn ? 'সেশন নির্বাচন করুন' : 'Select session');
      return;
    }
    if (!hasSecondField) {
      toast.error(bn ? 'ক্লাস / রোল / রেজিস্ট্রেশন এর যেকোনো একটি দিন' : 'Provide class, roll, or registration');
      return;
    }
    if (!statusFilter) {
      toast.error(bn ? 'পেন্ডিং বা পেইড নির্বাচন করুন' : 'Select Pending or Paid status');
      return;
    }

    setSearching(true);
    setSearchResults(null);
    setResultMeta(null);

    try {
      const session = sessions.find((s: any) => s.id === selectedSession);
      const sessionName = session?.name || '';

      let studentQuery = supabase
        .from('students')
        .select('*, divisions(name_bn, name), classes(name_bn, name)')
        .eq('status', 'active');

      if (sessionName) {
        studentQuery = studentQuery.or(`admission_session.eq.${sessionName},admission_session.is.null`);
      }

      if (selectedClass) studentQuery = studentQuery.eq('class_id', selectedClass);
      if (rollNumber.trim()) {
        const enRoll = bnToEn(rollNumber.trim());
        const bnRoll = enToBn(rollNumber.trim());
        studentQuery = studentQuery.or(`roll_number.eq.${enRoll},roll_number.eq.${bnRoll}`);
      }
      if (regNumber.trim()) {
        const enReg = bnToEn(regNumber.trim());
        const bnReg = enToBn(regNumber.trim());
        studentQuery = studentQuery.or(`student_id.eq.${enReg},student_id.eq.${bnReg},registration_no.eq.${enReg},registration_no.eq.${bnReg}`);
      }

      const { data: students, error: studErr } = await studentQuery.order('roll_number');
      if (studErr) throw studErr;
      if (!students || students.length === 0) {
        toast.error(bn ? 'কোনো ছাত্র পাওয়া যায়নি' : 'No students found');
        return;
      }

      const studentIds = students.map((s: any) => s.id);
      let paymentQuery = supabase
        .from('payments')
        .select('*')
        .in('student_id', studentIds)
        .eq('status', statusFilter);
      if (selectedFeeType && selectedFeeType !== 'all') {
        paymentQuery = paymentQuery.eq('fee_type', selectedFeeType);
      }
      const { data: payments, error: payErr } = await paymentQuery.order('created_at', { ascending: false });
      if (payErr) throw payErr;

      if (!payments || payments.length === 0) {
        toast.error(bn ? 'কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি' : 'No payment records found');
        return;
      }

      // Build approver map
      const approverMap = new Map<string, string>();
      {
        const { data: approvals } = await supabase
          .from('pending_actions')
          .select('target_id, reviewed_by, user_name')
          .eq('status', 'approved')
          .eq('target_table', 'payments');

        if (approvals && approvals.length > 0) {
          const reviewerIds = [...new Set(approvals.map((a: any) => a.reviewed_by).filter(Boolean))];
          let profileMap = new Map<string, string>();
          if (reviewerIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', reviewerIds);
            if (profiles) {
              profiles.forEach((p: any) => profileMap.set(p.id, p.full_name || ''));
            }
          }
          approvals.forEach((a: any) => {
            if (a.target_id) {
              const name = profileMap.get(a.reviewed_by) || a.user_name || '';
              if (name) approverMap.set(a.target_id, name);
            }
          });
        }
      }

      const studentMap = new Map(students.map((s: any) => [s.id, s]));
      const className = selectedClass
        ? classes.find((c: any) => c.id === selectedClass)?.name_bn || ''
        : '';

      // Build receipt data list
      const studentPayments = new Map<string, any[]>();
      payments.forEach((p: any) => {
        const list = studentPayments.get(p.student_id) || [];
        list.push(p);
        studentPayments.set(p.student_id, list);
      });

      const receiptList: ReceiptData[] = [];
      studentPayments.forEach((payList, studentId) => {
        const student = studentMap.get(studentId);
        if (!student) return;
        payList.forEach((p: any) => {
          const serialMatch = p.notes?.match(/Serial: (SL-\d{4}-\d{4})/);
          const createdAt = new Date(p.created_at || Date.now());
          const paymentApprover = approverMap.get(p.id) || '';
          receiptList.push({
            studentName: student?.name_bn || '-',
            fatherName: student?.father_name || student?.father_name_en || '',
            studentId: student?.student_id || '-',
            rollNumber: student?.roll_number || '-',
            className: student?.classes?.name_bn || className || '-',
            sessionName,
            feeType: bn ? (feeTypeLabels[p.fee_type]?.bn || p.fee_type) : (feeTypeLabels[p.fee_type]?.en || p.fee_type),
            amount: String(p.amount),
            transactionId: p.transaction_id,
            receiptSerial: serialMatch ? serialMatch[1] : (p.transaction_id || ''),
            gatewayTrxId: p.payment_method && p.payment_method !== 'Cash' ? (p.transaction_id || '') : '',
            paymentTimestamp: p.status === 'success' ? createdAt.toLocaleString('bn-BD', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '',
            date: createdAt.toLocaleDateString('bn-BD'),
            status: statusFilter === 'pending' ? (bn ? 'অপরিশোধ' : 'Pending') : (bn ? 'পরিশোধ' : 'Paid'),
            statusColor: statusFilter === 'pending' ? '#f59e0b' : '#22c55e',
            paymentMethod: bn ? (p.payment_method === 'Cash' || !p.payment_method ? 'নগদ' : p.payment_method) : (p.payment_method || 'Cash'),
            collectorName: getCollectorFromNotes(p.notes || ''),
            approverName: paymentApprover,
            institutionName: institution?.name || '',
            institutionNameEn: institution?.name_en || '',
            institutionAddress: institution?.address || '',
            institutionPhone: institution?.phone || '',
            institutionEmail: institution?.email || '',
            institutionOtherInfo: institution?.other_info || '',
            logoUrl: institution?.logo_url || '',
            bn,
          });
        });
      });

      if (receiptList.length === 0) {
        toast.error(bn ? 'কোনো রিসিট তৈরি হয়নি' : 'No receipts generated');
        return;
      }

      setSearchResults(receiptList);
      const firstStudent = receiptList[0];
      setResultMeta({
        count: receiptList.length,
        studentName: isSingleStudent ? firstStudent.studentName : '',
        className: className || firstStudent.className,
      });
      toast.success(bn ? `${receiptList.length}টি রিসিট পাওয়া গেছে` : `${receiptList.length} receipt(s) found`);
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setSearching(false);
    }
  };

  const handleAction = async (mode: 'print' | 'pdf') => {
    if (!searchResults || searchResults.length === 0) return;
    const setLoad = mode === 'pdf' ? setPdfLoading : setPrintLoading;
    setLoad(true);
    try {
      const savedStyle: ReceiptStyleConfig | undefined = defaultSetting?.design_config as any;
      let html: string;
      if (searchResults.length === 1 || isSingleStudent) {
        html = buildSingleStudentPrintHtml(searchResults[0], savedStyle);
      } else {
        html = buildBulkClassPrintHtml(searchResults, savedStyle);
      }

      if (mode === 'pdf') {
        await downloadReceiptAsPdf(html, `receipt-${Date.now()}.pdf`);
        toast.success(bn ? 'PDF ডাউনলোড হয়েছে' : 'PDF downloaded');
      } else {
        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
      }
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setLoad(false);
    }
  };

  const clearResults = () => {
    setSearchResults(null);
    setResultMeta(null);
  };

  return (
    <div className="card-elevated p-5 space-y-4">
      <h3 className="font-display font-bold text-foreground flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        {bn ? 'রিসিট ডাউনলোড' : 'Receipt Download'}
      </h3>

      <div className="flex gap-2">
        <button onClick={() => { setStatusFilter(statusFilter === 'pending' ? '' : 'pending'); clearResults(); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
          {bn ? 'পেন্ডিং' : 'Pending'}
        </button>
        <button onClick={() => { setStatusFilter(statusFilter === 'success' ? '' : 'success'); clearResults(); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'success' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
          {bn ? 'পেইড (অনুমোদিত)' : 'Paid (Approved)'}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        {bn ? 'সেশন আবশ্যক + নিচের যেকোনো একটি ফিল্ড দিন (ক্লাস / রোল / রেজিস্ট্রেশন)' : 'Session required + any one field below (Class / Roll / Registration)'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">{bn ? 'সেশন *' : 'Session *'}</label>
          <Select value={selectedSession} onValueChange={(v) => { setSelectedSession(v); clearResults(); }}>
            <SelectTrigger className="bg-background"><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
            <SelectContent>
              {sessions.map((s: any) => <SelectItem key={s.id} value={s.id}>{bn ? (s.name_bn || s.name) : s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">{bn ? 'ক্লাস' : 'Class'}</label>
          <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); clearResults(); }}>
            <SelectTrigger className="bg-background"><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bn ? 'সব ক্লাস' : 'All Classes'}</SelectItem>
              {classes.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name_bn} ({c.divisions?.name_bn || ''})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">{bn ? 'ফি ধরন *' : 'Fee Type *'}</label>
          <Select value={selectedFeeType} onValueChange={(v) => { setSelectedFeeType(v); clearResults(); }}>
            <SelectTrigger className="bg-background"><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bn ? 'সব ধরন' : 'All Types'}</SelectItem>
              {feeTypes.map((ft: any) => (
                <SelectItem key={ft.id} value={ft.name}>
                  {bn ? ft.name_bn : ft.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">{bn ? 'রোল নম্বর' : 'Roll Number'}</label>
          <Input className="bg-background" value={rollNumber} onChange={(e) => { setRollNumber(e.target.value); clearResults(); }} placeholder={bn ? 'রোল' : 'Roll'} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">{bn ? 'রেজিস্ট্রেশন নম্বর' : 'Registration No'}</label>
          <Input className="bg-background" value={regNumber} onChange={(e) => { setRegNumber(e.target.value); clearResults(); }} placeholder={bn ? 'রেজিস্ট্রেশন নম্বর' : 'Registration No'} />
        </div>
      </div>

      {/* Search Button */}
      {!searchResults && (
        <Button onClick={handleSearch} disabled={searching || !canSearch} className="w-full btn-primary-gradient">
          {searching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
          {bn ? 'রিসিট খুঁজুন' : 'Search Receipts'}
        </Button>
      )}

      {/* Search Results & Actions */}
      {searchResults && resultMeta && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between bg-accent/50 rounded-lg p-3 border border-border">
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {bn ? `${resultMeta.count}টি রিসিট পাওয়া গেছে` : `${resultMeta.count} receipt(s) found`}
              </p>
              <p className="text-xs text-muted-foreground">
                {resultMeta.studentName && `${resultMeta.studentName} | `}
                {resultMeta.className && `${bn ? 'ক্লাস' : 'Class'}: ${resultMeta.className} | `}
                {statusFilter === 'pending' ? (bn ? 'পেন্ডিং' : 'Pending') : (bn ? 'পেইড' : 'Paid')}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={clearResults} className="h-8 w-8 text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Receipt detail list */}
          <div className="max-h-64 overflow-y-auto space-y-2 border border-border rounded-lg p-2 bg-background">
            {searchResults.map((r, idx) => (
              <div key={idx} className="text-xs p-3 rounded-lg border border-border hover:bg-accent/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">{r.studentName}</span>
                  <span className={`font-bold text-sm ${r.statusColor === '#22c55e' ? 'text-green-600' : 'text-amber-500'}`}>৳ {r.amount}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                  <span>{bn ? 'ক্লাস' : 'Class'}: <span className="text-foreground">{r.className}</span></span>
                  <span>{bn ? 'রোল' : 'Roll'}: <span className="text-foreground">{r.rollNumber}</span></span>
                  <span>{bn ? 'রেজি. নং' : 'Reg. No'}: <span className="text-foreground">{r.studentId}</span></span>
                  <span>{bn ? 'ফি ধরন' : 'Fee Type'}: <span className="text-foreground">{r.feeType}</span></span>
                  <span>{bn ? 'তারিখ' : 'Date'}: <span className="text-foreground">{r.date}</span></span>
                  <span>{bn ? 'পদ্ধতি' : 'Method'}: <span className="text-foreground">{r.paymentMethod}</span></span>
                  {r.receiptSerial && <span>{bn ? 'সিরিয়াল' : 'Serial'}: <span className="text-foreground">{r.receiptSerial}</span></span>}
                  <span>{bn ? 'স্ট্যাটাস' : 'Status'}: <span className="text-foreground">{r.status}</span></span>
                  {r.collectorName && <span>{bn ? 'আদায়কারী' : 'Collector'}: <span className="text-foreground">{r.collectorName}</span></span>}
                  {r.approverName && <span>{bn ? 'অনুমোদনকারী' : 'Approver'}: <span className="text-foreground">{r.approverName}</span></span>}
                </div>
              </div>
            ))}
          </div>

          {/* Print & Download buttons */}
          <div className="flex gap-2">
            <Button onClick={() => handleAction('print')} disabled={printLoading || pdfLoading} className="flex-1" variant="outline">
              {printLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Printer className="w-4 h-4 mr-2" />}
              {bn ? 'প্রিন্ট করুন' : 'Print Receipt'}
            </Button>
            <Button onClick={() => handleAction('pdf')} disabled={printLoading || pdfLoading} className="btn-primary-gradient flex-1">
              {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              {bn ? 'PDF ডাউনলোড' : 'PDF Download'}
            </Button>
            <Link to="/admin/receipt-designer">
              <Button variant="outline" size="icon" title={bn ? 'রিসিট ডিজাইনার' : 'Receipt Designer'}>
                <Palette className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

const feeTypeLabels: Record<string, { bn: string; en: string }> = {
  admission_fee: { bn: 'ভর্তি ফি', en: 'Admission Fee' },
  monthly_fee: { bn: 'মাসিক ফি', en: 'Monthly Fee' },
  exam_fee: { bn: 'পরীক্ষা ফি', en: 'Exam Fee' },
};

export default FeeReceiptDownload;
