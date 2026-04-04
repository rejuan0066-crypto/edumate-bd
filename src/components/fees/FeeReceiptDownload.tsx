import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Loader2, Palette, Printer } from 'lucide-react';
import { downloadReceiptAsPdf } from '@/lib/receiptPdfDownload';
import { toast } from 'sonner';
import { useReceiptSettings } from '@/hooks/useReceiptSettings';
import { Link } from 'react-router-dom';
import { buildSingleStudentPrintHtml, buildBulkClassPrintHtml, ReceiptData, ReceiptStyleConfig } from './receiptPrintLayouts';

interface Props {
  collectorName: string;
}

const FeeReceiptDownload = ({ collectorName }: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { defaultSetting } = useReceiptSettings();
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'success'>('pending');
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

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
      const { data } = await supabase.from('institutions').select('*').eq('is_default', true).maybeSingle();
      return data;
    },
  });

  const filledCount = [selectedSession, selectedClass, rollNumber.trim(), regNumber.trim()].filter(Boolean).length;
  const hasSession = !!selectedSession;
  const hasSecondField = !!(selectedClass || rollNumber.trim() || regNumber.trim());
  const canDownload = hasSession && hasSecondField;

  const fetchReceiptData = async () => {
    if (!selectedSession) {
      toast.error(bn ? 'সেশন নির্বাচন করুন' : 'Select session');
      return null;
    }
    if (!hasSecondField) {
      toast.error(bn ? 'ক্লাস / রোল / রেজিস্ট্রেশন এর যেকোনো একটি দিন' : 'Provide class, roll, or registration');
      return null;
    }

    const session = sessions.find((s: any) => s.id === selectedSession);
    const sessionName = session?.name || '';

    let studentQuery = supabase
      .from('students')
      .select('*, divisions(name_bn, name), classes(name_bn, name)')
      .eq('status', 'active')
      .eq('admission_session', sessionName);

    if (selectedClass) studentQuery = studentQuery.eq('class_id', selectedClass);
    if (rollNumber.trim()) studentQuery = studentQuery.eq('roll_number', rollNumber.trim());
    if (regNumber.trim()) studentQuery = studentQuery.eq('student_id', regNumber.trim());

    const { data: students, error: studErr } = await studentQuery.order('roll_number');
    if (studErr) throw studErr;
    if (!students || students.length === 0) {
      toast.error(bn ? 'কোনো ছাত্র পাওয়া যায়নি' : 'No students found');
      return null;
    }

    const studentIds = students.map((s: any) => s.id);
    const { data: payments, error: payErr } = await supabase
      .from('payments')
      .select('*')
      .in('student_id', studentIds)
      .eq('status', statusFilter)
      .order('created_at', { ascending: false });
    if (payErr) throw payErr;

    if (!payments || payments.length === 0) {
      toast.error(bn ? 'কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি' : 'No payment records found');
      return null;
    }

    let approverName = '';
    if (statusFilter === 'success') {
      const { data: approvals } = await supabase
        .from('pending_actions')
        .select('payload, reviewed_by, user_name')
        .eq('status', 'approved')
        .eq('target_table', 'payments');

      if (approvals && approvals.length > 0) {
        const reviewerIds = [...new Set(approvals.map((a: any) => a.reviewed_by).filter(Boolean))];
        if (reviewerIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', reviewerIds);
          if (profiles && profiles.length > 0) {
            approverName = profiles[0].full_name || '';
          }
        }
      }
    }

    const studentMap = new Map(students.map((s: any) => [s.id, s]));
    const className = selectedClass
      ? classes.find((c: any) => c.id === selectedClass)?.name_bn || ''
      : '';

    return { payments, studentMap, sessionName, className, approverName };
  };

  const getCollectorFromNotes = (notes: string) => {
    const match = notes?.match(/আদায়কারী: (.+?)(?:\||$)/);
    return match ? match[1].trim() : collectorName;
  };

  const isSingleStudent = !!(rollNumber.trim() || regNumber.trim());
  const isBulkClass = !!selectedClass && !rollNumber.trim() && !regNumber.trim();

  const buildReceiptDataList = (data: any): ReceiptData[] => {
    const { payments, studentMap, sessionName, className, approverName } = data;
    
    // Group payments by student
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
        receiptList.push({
          studentName: student?.name_bn || '-',
          studentId: student?.student_id || '-',
          rollNumber: student?.roll_number || '-',
          className: student?.classes?.name_bn || className || '-',
          sessionName,
          feeType: bn ? (feeTypeLabels[p.fee_type]?.bn || p.fee_type) : (feeTypeLabels[p.fee_type]?.en || p.fee_type),
          amount: String(p.amount),
          transactionId: p.transaction_id,
          receiptSerial: serialMatch ? serialMatch[1] : (p.transaction_id || ''),
          date: new Date(p.created_at || Date.now()).toLocaleDateString('bn-BD'),
          status: statusFilter === 'pending' ? (bn ? 'পেন্ডিং' : 'Pending') : (bn ? 'পেইড' : 'Paid'),
          statusColor: statusFilter === 'pending' ? '#f59e0b' : '#22c55e',
          paymentMethod: p.payment_method || 'Cash',
          collectorName: getCollectorFromNotes(p.notes || ''),
          approverName: statusFilter === 'success' ? (approverName || (bn ? 'এডমিন' : 'Admin')) : '',
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
    return receiptList;
  };

  const handleDownload = async (mode: 'print' | 'pdf') => {
    const setLoad = mode === 'pdf' ? setPdfLoading : setLoading;
    setLoad(true);
    try {
      const data = await fetchReceiptData();
      if (!data) return;

      const receiptList = buildReceiptDataList(data);
      if (receiptList.length === 0) {
        toast.error(bn ? 'কোনো রিসিট তৈরি হয়নি' : 'No receipts generated');
        return;
      }

      // Load style from saved settings if available
      const savedStyle: ReceiptStyleConfig | undefined = defaultSetting?.design_config as any;

      let html: string;
      if (receiptList.length === 1 || isSingleStudent) {
        html = buildSingleStudentPrintHtml(receiptList[0], savedStyle);
      } else {
        html = buildBulkClassPrintHtml(receiptList, savedStyle);
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

  return (
    <div className="card-elevated p-5 space-y-4">
      <h3 className="font-display font-bold text-foreground flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        {bn ? 'রিসিট ডাউনলোড' : 'Receipt Download'}
      </h3>

      <div className="flex gap-2">
        <button onClick={() => setStatusFilter('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
          {bn ? 'পেন্ডিং' : 'Pending'}
        </button>
        <button onClick={() => setStatusFilter('success')}
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
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="bg-background"><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
            <SelectContent>
              {sessions.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">{bn ? 'ক্লাস' : 'Class'}</label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
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
          <label className="text-sm font-medium text-foreground mb-1 block">{bn ? 'রোল নম্বর' : 'Roll Number'}</label>
          <Input className="bg-background" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder={bn ? 'রোল' : 'Roll'} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">{bn ? 'রেজিস্ট্রেশন নম্বর' : 'Registration No'}</label>
          <Input className="bg-background" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder={bn ? 'রেজিস্ট্রেশন নম্বর' : 'Registration No'} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => handleDownload('print')} disabled={loading || pdfLoading || !canDownload} className="flex-1" variant="outline">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Printer className="w-4 h-4 mr-2" />}
          {bn ? 'প্রিন্ট করুন' : 'Print Receipt'}
        </Button>
        <Button onClick={() => handleDownload('pdf')} disabled={loading || pdfLoading || !canDownload} className="btn-primary-gradient flex-1">
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
  );
};

const feeTypeLabels: Record<string, { bn: string; en: string }> = {
  admission_fee: { bn: 'ভর্তি ফি', en: 'Admission Fee' },
  monthly_fee: { bn: 'মাসিক ফি', en: 'Monthly Fee' },
  exam_fee: { bn: 'পরীক্ষা ফি', en: 'Exam Fee' },
};

export default FeeReceiptDownload;
