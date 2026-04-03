import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  collectorName: string;
}

const FeeReceiptDownload = ({ collectorName }: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [searchType, setSearchType] = useState<'session_class' | 'session_roll' | 'session_reg'>('session_class');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'success'>('pending');
  const [loading, setLoading] = useState(false);

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

  const handleDownload = async () => {
    if (!selectedSession) {
      toast.error(bn ? 'সেশন নির্বাচন করুন' : 'Select session');
      return;
    }

    setLoading(true);
    try {
      const session = sessions.find((s: any) => s.id === selectedSession);
      const sessionName = session?.name || '';

      // Get students based on search type
      let studentQuery = supabase
        .from('students')
        .select('*, divisions(name_bn, name), classes(name_bn, name)')
        .eq('status', 'active')
        .eq('admission_session', sessionName);

      if (searchType === 'session_class' && selectedClass) {
        studentQuery = studentQuery.eq('class_id', selectedClass);
      } else if (searchType === 'session_roll' && rollNumber) {
        studentQuery = studentQuery.eq('roll_number', rollNumber.trim());
      } else if (searchType === 'session_reg' && regNumber) {
        studentQuery = studentQuery.eq('student_id', regNumber.trim());
      }

      const { data: students, error: studErr } = await studentQuery.order('roll_number');
      if (studErr) throw studErr;
      if (!students || students.length === 0) {
        toast.error(bn ? 'কোনো ছাত্র পাওয়া যায়নি' : 'No students found');
        return;
      }

      // Get payments for these students
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
        return;
      }

      // Get approver info for paid payments
      let approverName = '';
      if (statusFilter === 'success') {
        // Check pending_actions for approval info
        const txnIds = payments.map((p: any) => p.transaction_id);
        const { data: approvals } = await supabase
          .from('pending_actions')
          .select('payload, reviewed_by, user_name')
          .eq('status', 'approved')
          .eq('target_table', 'payments');

        if (approvals && approvals.length > 0) {
          // Get the admin profile who approved
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

      // Build student map
      const studentMap = new Map(students.map((s: any) => [s.id, s]));

      // Extract collector name from payment notes
      const getCollectorFromNotes = (notes: string) => {
        const match = notes?.match(/আদায়কারী: (.+?)(?:\||$)/);
        return match ? match[1].trim() : collectorName;
      };

      // Generate printable receipt
      const className = searchType === 'session_class'
        ? classes.find((c: any) => c.id === selectedClass)?.name_bn || ''
        : '';

      printReceipt({
        payments,
        studentMap,
        sessionName,
        className,
        institution,
        collectorName: getCollectorFromNotes(payments[0]?.notes || ''),
        approverName,
        statusFilter,
        bn,
        searchType,
      });
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-elevated p-5 space-y-4">
      <h3 className="font-display font-bold text-foreground flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        {bn ? 'রিসিট ডাউনলোড' : 'Receipt Download'}
      </h3>

      {/* Status filter */}
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

      {/* Search type tabs */}
      <Tabs value={searchType} onValueChange={(v) => setSearchType(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="session_class">{bn ? 'সেশন + ক্লাস' : 'Session + Class'}</TabsTrigger>
          <TabsTrigger value="session_roll">{bn ? 'সেশন + রোল' : 'Session + Roll'}</TabsTrigger>
          <TabsTrigger value="session_reg">{bn ? 'সেশন + রেজি.' : 'Session + Reg.'}</TabsTrigger>
        </TabsList>

        <TabsContent value="session_class" className="mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{bn ? 'সেশন' : 'Session'}</label>
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
                  {classes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name_bn} ({c.divisions?.name_bn || ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="session_roll" className="mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{bn ? 'সেশন' : 'Session'}</label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="bg-background"><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  {sessions.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{bn ? 'রোল নম্বর' : 'Roll Number'}</label>
              <Input className="bg-background" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder={bn ? 'রোল' : 'Roll'} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="session_reg" className="mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{bn ? 'সেশন' : 'Session'}</label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="bg-background"><SelectValue placeholder={bn ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  {sessions.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{bn ? 'রেজিস্ট্রেশন নম্বর' : 'Registration No'}</label>
              <Input className="bg-background" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder={bn ? 'রেজিস্ট্রেশন নম্বর' : 'Registration No'} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Button onClick={handleDownload} disabled={loading} className="btn-primary-gradient w-full">
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
        {bn ? 'রিসিট ডাউনলোড করুন' : 'Download Receipt'}
      </Button>
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
  searchType: 'session_class' | 'session_roll' | 'session_reg';
}

const feeTypeLabels: Record<string, { bn: string; en: string }> = {
  admission_fee: { bn: 'ভর্তি ফি', en: 'Admission Fee' },
  monthly_fee: { bn: 'মাসিক ফি', en: 'Monthly Fee' },
  exam_fee: { bn: 'পরীক্ষা ফি', en: 'Exam Fee' },
};

function printReceipt(params: PrintReceiptParams) {
  const { payments, studentMap, sessionName, className, institution, collectorName, approverName, statusFilter, bn, searchType } = params;

  const totalAmount = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const statusLabel = statusFilter === 'pending'
    ? (bn ? 'পেন্ডিং (অনুমোদনের অপেক্ষায়)' : 'Pending (Awaiting Approval)')
    : (bn ? 'পেইড (অনুমোদিত)' : 'Paid (Approved)');

  const statusColor = statusFilter === 'pending' ? '#f59e0b' : '#22c55e';

  const rows = payments.map((p: any, i: number) => {
    const student = studentMap.get(p.student_id);
    return `<tr>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${i + 1}</td>
      <td style="padding:8px;border:1px solid #ddd">${student?.name_bn || '-'}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${student?.roll_number || '-'}</td>
      <td style="padding:8px;border:1px solid #ddd">${bn ? (feeTypeLabels[p.fee_type]?.bn || p.fee_type) : (feeTypeLabels[p.fee_type]?.en || p.fee_type)}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;font-weight:bold">৳ ${p.amount}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;font-size:11px">${p.transaction_id}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">
        <span style="color:${statusColor};font-weight:bold">${statusLabel}</span>
      </td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>${bn ? 'ফি রিসিট' : 'Fee Receipt'}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Sans Bengali', sans-serif; padding: 30px; color: #1a1a1a; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
  .header h1 { font-size: 22px; margin-bottom: 4px; }
  .header p { font-size: 13px; color: #555; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 13px; }
  .meta-item { }
  .meta-item strong { color: #333; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
  th { padding: 10px 8px; border: 1px solid #ddd; background: #f5f5f5; text-align: left; font-weight: 600; }
  .total-row { background: #f0f9ff; }
  .total-row td { font-weight: bold; font-size: 15px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 10px; }
  .sig-box { text-align: center; width: 200px; }
  .sig-line { border-top: 1px solid #333; padding-top: 8px; font-size: 13px; font-weight: 600; }
  .sig-name { font-size: 12px; color: #555; margin-top: 4px; }
  .status-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  @media print {
    body { padding: 15px; }
    @page { margin: 15mm; }
  }
</style>
</head><body>
<div class="header">
  ${institution?.logo_url ? `<img src="${institution.logo_url}" style="height:60px;margin-bottom:8px" />` : ''}
  <h1>${institution?.name || (bn ? 'প্রতিষ্ঠানের নাম' : 'Institution Name')}</h1>
  <p>${institution?.address || ''}</p>
  ${institution?.phone ? `<p>${bn ? 'ফোন' : 'Phone'}: ${institution.phone}</p>` : ''}
</div>

<h2 style="text-align:center;margin-bottom:15px;font-size:18px;color:#333">
  ${bn ? 'ফি সংগ্রহ রিসিট' : 'Fee Collection Receipt'}
  <span style="display:block;font-size:13px;color:${statusColor};margin-top:4px">(${statusLabel})</span>
</h2>

<div class="meta">
  <div class="meta-item"><strong>${bn ? 'সেশন' : 'Session'}:</strong> ${sessionName}</div>
  ${className ? `<div class="meta-item"><strong>${bn ? 'ক্লাস' : 'Class'}:</strong> ${className}</div>` : ''}
  <div class="meta-item"><strong>${bn ? 'তারিখ' : 'Date'}:</strong> ${new Date().toLocaleDateString('bn-BD')}</div>
  <div class="meta-item"><strong>${bn ? 'আদায়কারী' : 'Collector'}:</strong> ${collectorName}</div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:40px;text-align:center">${bn ? 'ক্র.' : '#'}</th>
      <th>${bn ? 'ছাত্রের নাম' : 'Student Name'}</th>
      <th style="text-align:center">${bn ? 'রোল' : 'Roll'}</th>
      <th>${bn ? 'ফি ধরন' : 'Fee Type'}</th>
      <th style="text-align:right">${bn ? 'পরিমাণ' : 'Amount'}</th>
      <th style="text-align:center">${bn ? 'ট্রানজেকশন' : 'Transaction'}</th>
      <th style="text-align:center">${bn ? 'স্ট্যাটাস' : 'Status'}</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td colspan="4" style="padding:10px 8px;border:1px solid #ddd;text-align:right">${bn ? 'মোট' : 'Total'}</td>
      <td style="padding:10px 8px;border:1px solid #ddd;text-align:right;font-size:16px">৳ ${totalAmount}</td>
      <td colspan="2" style="padding:10px 8px;border:1px solid #ddd;text-align:center">${bn ? 'মোট আদায়' : 'Total Collected'}: ${payments.length} ${bn ? 'জন' : 'students'}</td>
    </tr>
  </tbody>
</table>

<div class="signatures">
  <div class="sig-box">
    <div class="sig-line">${bn ? 'আদায়কারীর স্বাক্ষর' : 'Collector Signature'}</div>
    <div class="sig-name">${collectorName}</div>
  </div>
  ${statusFilter === 'success' ? `
  <div class="sig-box">
    <div class="sig-line">${bn ? 'গ্রহণকারীর স্বাক্ষর (অনুমোদনকারী)' : 'Approver Signature'}</div>
    <div class="sig-name">${approverName || (bn ? 'এডমিন' : 'Admin')}</div>
  </div>
  ` : ''}
</div>

<script>
  document.fonts.ready.then(() => { setTimeout(() => window.print(), 500); });
</script>
</body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export default FeeReceiptDownload;
