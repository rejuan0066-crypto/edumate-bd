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
import { useReceiptSettings, ReceiptDesignConfig } from '@/hooks/useReceiptSettings';
import { generatePrintHtml } from '@/components/admin/receipt-designer/ReceiptDesignerMain';
import { Link } from 'react-router-dom';

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

  const buildReceiptHtml = (data: any) => {
    const { payments, studentMap, sessionName, className, approverName } = data;
    const savedDesign = defaultSetting?.design_config as unknown as ReceiptDesignConfig | undefined;

    if (savedDesign && savedDesign.elements && savedDesign.elements.length > 0) {
      const dataMap: Record<string, string> = {
        student_name: (studentMap.get(payments[0].student_id))?.name_bn || '-',
        student_id: (studentMap.get(payments[0].student_id))?.student_id || '-',
        roll_no: (studentMap.get(payments[0].student_id))?.roll_number || '-',
        class_name: className,
        session: sessionName,
        fee_type: bn ? (feeTypeLabels[payments[0].fee_type]?.bn || payments[0].fee_type) : (feeTypeLabels[payments[0].fee_type]?.en || payments[0].fee_type),
        amount: `৳ ${payments[0].amount}`,
        transaction_id: payments[0].transaction_id,
        date: new Date(payments[0].created_at || Date.now()).toLocaleDateString('bn-BD'),
        status: statusFilter === 'pending' ? (bn ? 'পেন্ডিং' : 'Pending') : (bn ? 'পেইড' : 'Paid'),
        payment_method: payments[0].payment_method || 'Cash',
        collector_name: getCollectorFromNotes(payments[0].notes || ''),
        approver_name: approverName || (bn ? 'এডমিন' : 'Admin'),
        institution_name: institution?.name || '',
        institution_address: institution?.address || '',
        phone: institution?.phone || '',
        logo_url: institution?.logo_url || '',
      };
      return { type: 'custom' as const, html: generatePrintHtml(savedDesign, dataMap, bn) };
    }
    return {
      type: 'builtin' as const,
      params: {
        payments, studentMap, sessionName, className, institution,
        collectorName: getCollectorFromNotes(payments[0]?.notes || ''),
        approverName, statusFilter, bn,
      }
    };
  };

  const handleDownload = async (mode: 'print' | 'pdf') => {
    const setLoad = mode === 'pdf' ? setPdfLoading : setLoading;
    setLoad(true);
    try {
      const data = await fetchReceiptData();
      if (!data) return;

      const result = buildReceiptHtml(data);

      if (mode === 'pdf') {
        if (result.type === 'custom') {
          await downloadReceiptAsPdf(result.html, `receipt-${Date.now()}.pdf`);
          toast.success(bn ? 'PDF ডাউনলোড হয়েছে' : 'PDF downloaded');
        } else {
          // For builtin, generate html first then convert
          const html = generateBuiltinHtml(result.params);
          await downloadReceiptAsPdf(html, `receipt-${Date.now()}.pdf`);
          toast.success(bn ? 'PDF ডাউনলোড হয়েছে' : 'PDF downloaded');
        }
      } else {
        if (result.type === 'custom') {
          const win = window.open('', '_blank');
          if (win) { win.document.write(result.html); win.document.close(); }
        } else {
          printReceipt(result.params);
        }
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

interface PrintReceiptParams {
  payments: any[];
  studentMap: Map<string, any>;
  sessionName: string;
  className: string;
  institution: any;
  collectorName: string;
  approverName: string;
  statusFilter: 'pending' | 'success';
  bn: boolean;
}

const feeTypeLabels: Record<string, { bn: string; en: string }> = {
  admission_fee: { bn: 'ভর্তি ফি', en: 'Admission Fee' },
  monthly_fee: { bn: 'মাসিক ফি', en: 'Monthly Fee' },
  exam_fee: { bn: 'পরীক্ষা ফি', en: 'Exam Fee' },
};

function buildSingleReceipt(
  p: any,
  student: any,
  copyLabel: string,
  params: PrintReceiptParams,
  index: number
) {
  const { sessionName, institution, collectorName, approverName, statusFilter, bn } = params;
  const statusLabel = statusFilter === 'pending'
    ? (bn ? 'পেন্ডিং' : 'Pending')
    : (bn ? 'পেইড' : 'Paid');
  const statusColor = statusFilter === 'pending' ? '#f59e0b' : '#22c55e';
  const feeLabel = bn ? (feeTypeLabels[p.fee_type]?.bn || p.fee_type) : (feeTypeLabels[p.fee_type]?.en || p.fee_type);
  const qrData = encodeURIComponent(`TXN:${p.transaction_id}|AMT:${p.amount}|STU:${student?.student_id || ''}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${qrData}`;
  const instName = institution?.name || '';
  const watermarkText = instName;

  return `
    <div class="receipt-card">
      <div class="watermark">${watermarkText}</div>
      <div class="copy-label ${statusFilter === 'pending' ? 'copy-pending' : 'copy-paid'}">${copyLabel}</div>
      
      <div class="receipt-header">
        ${institution?.logo_url ? `<img src="${institution.logo_url}" class="inst-logo" />` : ''}
        <div class="inst-info">
          <div class="inst-name">${instName}</div>
          ${institution?.name_en ? `<div class="inst-name-en">${institution.name_en}</div>` : ''}
          <div class="inst-addr">${institution?.address || ''} ${institution?.phone ? `| ${institution.phone}` : ''}</div>
        </div>
      </div>
      
      <div class="receipt-title">${bn ? 'ফি রিসিট' : 'Fee Receipt'}</div>
      
      <div class="receipt-body">
        <div class="info-grid">
          <div class="info-row">
            <span class="info-label">${bn ? 'নাম' : 'Name'}:</span>
            <span class="info-value">${student?.name_bn || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${bn ? 'আইডি' : 'ID'}:</span>
            <span class="info-value">${student?.student_id || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${bn ? 'রোল' : 'Roll'}:</span>
            <span class="info-value">${student?.roll_number || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${bn ? 'সেশন' : 'Session'}:</span>
            <span class="info-value">${sessionName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${bn ? 'ফি ধরন' : 'Fee Type'}:</span>
            <span class="info-value">${feeLabel}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${bn ? 'পরিমাণ' : 'Amount'}:</span>
            <span class="info-value amount-value">৳ ${p.amount}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${bn ? 'ট্রানজেকশন' : 'TXN'}:</span>
            <span class="info-value txn-value">${p.transaction_id}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${bn ? 'তারিখ' : 'Date'}:</span>
            <span class="info-value">${new Date(p.created_at || Date.now()).toLocaleDateString('bn-BD')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${bn ? 'স্ট্যাটাস' : 'Status'}:</span>
            <span class="info-value" style="color:${statusColor};font-weight:700">${statusLabel}</span>
          </div>
        </div>
        <div class="qr-section">
          <img src="${qrUrl}" class="qr-img" alt="QR" />
        </div>
      </div>
      
      <div class="receipt-footer">
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">${bn ? 'আদায়কারী' : 'Collector'}</div>
          <div class="sig-name">${collectorName}</div>
        </div>
        ${statusFilter === 'success' ? `
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">${bn ? 'গ্রহণকারী' : 'Approver'}</div>
          <div class="sig-name">${approverName || (bn ? 'এডমিন' : 'Admin')}</div>
        </div>` : ''}
      </div>
    </div>`;
}

function printReceipt(params: PrintReceiptParams) {
  const { payments, studentMap, bn } = params;

  // Build receipt pairs (student copy + office copy) for each payment
  const receiptPairs = payments.map((p: any, i: number) => {
    const student = studentMap.get(p.student_id);
    const studentCopy = buildSingleReceipt(p, student, bn ? 'ছাত্র কপি' : 'Student Copy', params, i);
    const officeCopy = buildSingleReceipt(p, student, bn ? 'অফিস কপি' : 'Office Copy', params, i);
    return { studentCopy, officeCopy };
  });

  // Group into pages of 3 receipts each
  const pages: string[] = [];
  for (let i = 0; i < receiptPairs.length; i += 3) {
    const chunk = receiptPairs.slice(i, i + 3);
    const rows = chunk.map(pair => `
      <div class="receipt-row">
        ${pair.officeCopy}
        <div class="cut-line-v"></div>
        ${pair.studentCopy}
      </div>
    `).join('<div class="cut-line-h"></div>');
    pages.push(`<div class="page">${rows}</div>`);
  }

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>${bn ? 'ফি রিসিট' : 'Fee Receipt'}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Sans Bengali', sans-serif; color: #1a1a1a; background: #fff; }
  
  .page {
    width: 210mm; min-height: 297mm; padding: 5mm;
    display: flex; flex-direction: column; justify-content: flex-start;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }
  
  .receipt-row {
    display: flex; flex: 1; max-height: 95mm;
  }
  
  .receipt-card {
    flex: 1; padding: 4mm 5mm; position: relative; overflow: hidden;
    border: 1px solid #ccc;
  }
  
  .watermark {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-size: 28px; font-weight: 700; color: rgba(0,0,0,0.04);
    white-space: nowrap; pointer-events: none; z-index: 0;
    letter-spacing: 4px;
  }
  
  .copy-label {
    position: absolute; top: 2mm; right: 3mm;
    font-size: 8px; font-weight: 700; padding: 1px 6px;
    border-radius: 3px; z-index: 1;
  }
  .copy-pending { background: #fef3c7; color: #92400e; }
  .copy-paid { background: #dcfce7; color: #166534; }
  
  .receipt-header {
    display: flex; align-items: center; gap: 3mm;
    border-bottom: 1.5px solid #333; padding-bottom: 2mm; margin-bottom: 2mm;
    position: relative; z-index: 1;
  }
  .inst-logo { height: 28px; width: auto; }
  .inst-info { flex: 1; }
  .inst-name { font-size: 12px; font-weight: 700; line-height: 1.2; }
  .inst-name-en { font-size: 9px; color: #555; }
  .inst-addr { font-size: 8px; color: #666; line-height: 1.3; }
  
  .receipt-title {
    text-align: center; font-size: 11px; font-weight: 700;
    margin: 1.5mm 0; color: #333; position: relative; z-index: 1;
    text-decoration: underline;
  }
  
  .receipt-body {
    display: flex; gap: 3mm; position: relative; z-index: 1;
  }
  
  .info-grid { flex: 1; }
  .info-row {
    display: flex; font-size: 9px; line-height: 1.6;
    border-bottom: 0.5px dotted #ddd;
  }
  .info-label { width: 55px; font-weight: 600; color: #555; flex-shrink: 0; }
  .info-value { flex: 1; color: #111; }
  .amount-value { font-weight: 700; font-size: 11px; color: #000; }
  .txn-value { font-size: 7.5px; font-family: monospace; }
  
  .qr-section {
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .qr-img { width: 55px; height: 55px; }
  
  .receipt-footer {
    display: flex; justify-content: space-between;
    margin-top: auto; padding-top: 5mm;
    position: relative; z-index: 1;
  }
  .sig-box { text-align: center; width: 35mm; }
  .sig-line { border-top: 0.8px solid #333; margin-bottom: 1px; }
  .sig-label { font-size: 7.5px; font-weight: 600; color: #555; }
  .sig-name { font-size: 7px; color: #888; }
  
  .cut-line-v {
    width: 0; border-left: 1px dashed #aaa; margin: 2mm 0;
  }
  .cut-line-h {
    height: 0; border-top: 1px dashed #aaa; margin: 0 2mm;
  }
  
  @media print {
    body { padding: 0; }
    @page { size: A4; margin: 0; }
    .page { padding: 5mm; }
  }
  
  @media screen {
    body { background: #f0f0f0; padding: 20px; }
    .page {
      background: white; margin: 0 auto 20px; 
      box-shadow: 0 2px 10px rgba(0,0,0,0.15);
    }
  }
</style>
</head><body>
${pages.join('')}
<script>
  document.fonts.ready.then(() => { setTimeout(() => window.print(), 800); });
</script>
</body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export default FeeReceiptDownload;
