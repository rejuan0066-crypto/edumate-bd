import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import PublicLayout from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { numberToBanglaWords, toBanglaDigits } from '@/lib/amountInWords';
import { format } from 'date-fns';
import { Download, Printer, ArrowLeft, CheckCircle2, Clock, XCircle, Wallet } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { generateReceiptQrDataUrl } from '@/lib/receiptQr';

const STORAGE_KEY = 'parent_portal_session';

interface ReceiptData {
  id: string;
  amount: number;
  method: string;
  trx_id: string;
  sender_phone: string | null;
  note: string | null;
  status: string;
  created_at: string;
  verified_at: string | null;
  rejection_reason: string | null;
  source: 'manual' | 'gateway';
  student?: {
    name: string;
    name_en: string | null;
    student_id: string;
    roll_number: string | null;
    classes?: { name: string; name_bn: string | null } | null;
    academic_sessions?: { name: string } | null;
  } | null;
  fee_assignment_ids?: string[];
}

const statusMeta = (status: string, bn: boolean) => {
  switch (status) {
    case 'verified':
    case 'success':
    case 'paid':
      return { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2, label: bn ? 'যাচাইকৃত / সফল' : 'Verified / Success' };
    case 'rejected':
    case 'failed':
      return { color: 'text-red-700 bg-red-50 border-red-200', icon: XCircle, label: bn ? 'প্রত্যাখ্যাত' : 'Rejected' };
    default:
      return { color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock, label: bn ? 'যাচাইয়ের অপেক্ষায়' : 'Pending Verification' };
  }
};

const ParentPaymentReceipt = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: institution } = useInstitutionInfo();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [qr, setQr] = useState<{ dataUrl: string; url: string } | null>(null);

  const prevStatusRef = useRef<string | null>(null);

  const loadReceipt = async (opts: { silent?: boolean } = {}) => {
    try {
      const sessionRaw = localStorage.getItem(STORAGE_KEY);
      if (!sessionRaw) {
        navigate('/parent');
        return;
      }
      const session = JSON.parse(sessionRaw);

      const { data: req, error } = await (supabase as any)
        .from('parent_payment_requests')
        .select('*')
        .eq('id', requestId)
        .eq('parent_account_id', session.accountId)
        .maybeSingle();

      if (error || !req) {
        if (!opts.silent) {
          toast({
            title: bn ? 'রসিদ পাওয়া যায়নি' : 'Receipt not found',
            description: bn ? 'এই রসিদটি আপনার অ্যাকাউন্টের অধীনে নেই।' : 'This receipt does not belong to your account.',
            variant: 'destructive',
          });
        }
        setLoading(false);
        return;
      }

      let student: ReceiptData['student'] = null;
      if (req.student_uuid) {
        const { data: s } = await supabase.functions.invoke('parent-student-info', {
          body: { account_id: session.accountId, student_uuid: req.student_uuid, session_token: session.sessionToken },
        });
        student = (s as any)?.student ?? null;
      }

      const newStatus: string = req.status || 'pending';
      // Toast only on real status transitions (not on initial load)
      if (
        prevStatusRef.current &&
        prevStatusRef.current !== newStatus &&
        (newStatus === 'verified' || newStatus === 'rejected')
      ) {
        toast({
          title:
            newStatus === 'verified'
              ? (bn ? '✅ পেমেন্ট ভেরিফাই হয়েছে' : '✅ Payment Verified')
              : (bn ? '❌ পেমেন্ট প্রত্যাখ্যাত' : '❌ Payment Rejected'),
          description:
            newStatus === 'verified'
              ? (bn ? 'আপনার পেমেন্ট সফলভাবে অনুমোদিত হয়েছে।' : 'Your payment has been approved.')
              : (req.rejection_reason?.trim()
                  ? (bn ? `কারণ: ${req.rejection_reason}` : `Reason: ${req.rejection_reason}`)
                  : (bn ? 'অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।' : 'Please contact the admin.')),
        });
      }
      prevStatusRef.current = newStatus;

      setData({
        id: req.id,
        amount: Number(req.amount || 0),
        method: req.method || '—',
        trx_id: req.trx_id || '—',
        sender_phone: req.sender_phone,
        note: req.note,
        status: newStatus,
        created_at: req.created_at,
        verified_at: req.verified_at ?? null,
        rejection_reason: req.rejection_reason ?? null,
        source: req.method === 'gateway' ? 'gateway' : 'manual',
        student,
        fee_assignment_ids: req.fee_assignment_ids || [],
      });
    } catch (e: any) {
      if (!opts.silent) toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (requestId) loadReceipt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  // Realtime subscription + polling fallback for status changes
  // Generate QR for verification
  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    generateReceiptQrDataUrl('parent_payment_request', requestId, 200).then((q) => {
      if (!cancelled && q) setQr(q);
    });
    return () => { cancelled = true; };
  }, [requestId]);

  useEffect(() => {
    if (!requestId) return;
    const chName = `parent-receipt-${requestId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let channel: any = null;
    try {
      channel = supabase
        .channel(chName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'parent_payment_requests',
            filter: `id=eq.${requestId}`,
          },
          () => { loadReceipt({ silent: true }); },
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error in ParentPaymentReceipt:', e);
    }

    // Polling fallback (every 15s) in case realtime is blocked or RLS filters out the row
    const poll = setInterval(() => {
      if (prevStatusRef.current === 'pending') loadReceipt({ silent: true });
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  // Always refetch the latest status before printing/downloading so the
  // output reflects the most recent Verified/Rejected change automatically.
  const handlePrint = async () => {
    await loadReceipt({ silent: true });
    // Wait one paint so the DOM reflects any status change before window.print
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
    setDownloading(true);
    try {
      // Pull the freshest status first so the PDF is never stale
      await loadReceipt({ silent: true });
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;
      const imgW = pageW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgW, Math.min(imgH, pageH - 20));

      const statusTag = (data?.status || 'pending').toUpperCase();
      const ident = data?.trx_id || data?.id || 'receipt';
      pdf.save(`fee-receipt-${ident}-${statusTag}.pdf`);
      toast({
        title: bn ? 'ডাউনলোড সম্পন্ন' : 'Download complete',
        description: bn
          ? `সর্বশেষ স্ট্যাটাস: ${statusTag}`
          : `Latest status: ${statusTag}`,
      });
    } catch (e: any) {
      toast({ title: 'PDF Error', description: e.message, variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</div>
        </div>
      </PublicLayout>
    );
  }

  if (!data) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center space-y-4">
              <XCircle className="w-12 h-12 mx-auto text-red-500" />
              <h2 className="text-lg font-bold">{bn ? 'রসিদ পাওয়া যায়নি' : 'Receipt not found'}</h2>
              <Button asChild className="rounded-xl"><Link to="/parent">{bn ? 'প্যারেন্ট পোর্টালে ফিরুন' : 'Back to Parent Portal'}</Link></Button>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  const meta = statusMeta(data.status, bn);
  const StatusIcon = meta.icon;
  const fmtAmt = (n: number) => bn ? `৳${toBanglaDigits(n.toLocaleString('en-US'))}` : `৳${n.toLocaleString()}`;

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        {/* Toolbar (hidden in print) */}
        <div className="flex items-center justify-between gap-2 print:hidden">
          <Button variant="outline" onClick={() => navigate('/parent')} className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {bn ? 'পোর্টালে ফিরুন' : 'Back to Portal'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="rounded-xl">
              <Printer className="w-4 h-4 mr-2" />
              {bn ? 'প্রিন্ট' : 'Print'}
            </Button>
            <Button onClick={handleDownloadPdf} disabled={downloading} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
              <Download className="w-4 h-4 mr-2" />
              {downloading ? (bn ? 'তৈরি হচ্ছে...' : 'Generating...') : (bn ? 'PDF ডাউনলোড' : 'Download PDF')}
            </Button>
          </div>
        </div>

        {/* Receipt body */}
        <div ref={receiptRef} className="print-section bg-white text-black rounded-[28px] border border-gray-200 shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b-2 border-emerald-600 bg-gradient-to-r from-emerald-50 to-white">
            <div className="flex items-center gap-4">
              {institution?.logo_url && (
                <img src={institution.logo_url} alt="logo" className="w-16 h-16 object-contain" crossOrigin="anonymous" />
              )}
              <div className="flex-1 text-center">
                <h1 className="text-2xl font-bold text-emerald-800">{bn ? institution?.name : (institution?.name_en || institution?.name)}</h1>
                {institution?.address && <p className="text-sm text-gray-600 mt-1">{bn ? institution.address : (institution.address_en || institution.address)}</p>}
                {(institution?.phone || institution?.email) && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {institution.phone && `📞 ${institution.phone}`}
                    {institution.phone && institution.email && ' • '}
                    {institution.email && `✉️ ${institution.email}`}
                  </p>
                )}
              </div>
              <div className="w-16" />
            </div>
            <div className="mt-4 text-center">
              <div className="inline-block px-6 py-2 bg-emerald-600 text-white rounded-full font-bold tracking-wide">
                {bn ? 'অনলাইন ফি পরিশোধের রসিদ' : 'ONLINE FEE PAYMENT RECEIPT'}
              </div>
            </div>
          </div>

          {/* Status banner */}
          <div className={`px-6 py-3 flex items-center justify-center gap-2 border-b ${meta.color}`}>
            <StatusIcon className="w-5 h-5" />
            <span className="font-semibold">{meta.label}</span>
          </div>

          {/* Meta */}
          <div className="p-6 grid grid-cols-2 gap-4 text-sm border-b border-gray-200">
            <div>
              <div className="text-gray-500">{bn ? 'রসিদ নং' : 'Receipt No.'}</div>
              <div className="font-mono font-semibold">{data.id.slice(0, 8).toUpperCase()}</div>
            </div>
            <div className="text-right">
              <div className="text-gray-500">{bn ? 'তারিখ' : 'Date'}</div>
              <div className="font-semibold">{format(new Date(data.created_at), 'dd/MM/yyyy hh:mm a')}</div>
            </div>
          </div>

          {/* Student */}
          {data.student && (
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">{bn ? 'ছাত্রের তথ্য' : 'Student Information'}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">{bn ? 'নাম: ' : 'Name: '}</span><span className="font-semibold">{bn ? data.student.name : (data.student.name_en || data.student.name)}</span></div>
                <div><span className="text-gray-500">{bn ? 'রেজি নং: ' : 'Reg No: '}</span><span className="font-mono font-semibold">{data.student.student_id}</span></div>
                <div><span className="text-gray-500">{bn ? 'শ্রেণি: ' : 'Class: '}</span><span className="font-semibold">{bn ? (data.student.classes?.name_bn || data.student.classes?.name) : data.student.classes?.name}</span></div>
                <div><span className="text-gray-500">{bn ? 'রোল: ' : 'Roll: '}</span><span className="font-semibold">{data.student.roll_number || '—'}</span></div>
                {data.student.academic_sessions?.name && (
                  <div className="col-span-2"><span className="text-gray-500">{bn ? 'সেশন: ' : 'Session: '}</span><span className="font-semibold">{data.student.academic_sessions.name}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Payment details */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">{bn ? 'পেমেন্টের বিবরণ' : 'Payment Details'}</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">{bn ? 'পদ্ধতি' : 'Method'}</td><td className="py-2 text-right font-semibold uppercase">{data.method}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">{bn ? 'TrxID / রেফারেন্স' : 'TrxID / Reference'}</td><td className="py-2 text-right font-mono font-semibold">{data.trx_id}</td></tr>
                {data.sender_phone && (<tr className="border-b border-gray-100"><td className="py-2 text-gray-500">{bn ? 'প্রেরক ফোন' : 'Sender Phone'}</td><td className="py-2 text-right font-semibold">{data.sender_phone}</td></tr>)}
                {data.note && (<tr className="border-b border-gray-100"><td className="py-2 text-gray-500">{bn ? 'নোট' : 'Note'}</td><td className="py-2 text-right">{data.note}</td></tr>)}
                {data.verified_at && (<tr className="border-b border-gray-100"><td className="py-2 text-gray-500">{bn ? 'যাচাইয়ের তারিখ' : 'Verified At'}</td><td className="py-2 text-right font-semibold">{format(new Date(data.verified_at), 'dd/MM/yyyy hh:mm a')}</td></tr>)}
              </tbody>
            </table>
          </div>

          {/* Amount */}
          <div className="p-6 bg-emerald-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800">
                <Wallet className="w-5 h-5" />
                <span className="font-semibold">{bn ? 'মোট পরিশোধিত' : 'Total Paid'}</span>
              </div>
              <div className="text-3xl font-bold text-emerald-700">{fmtAmt(data.amount)}</div>
            </div>
            {bn && (
              <p className="mt-2 text-sm text-emerald-900 italic">
                ({numberToBanglaWords(data.amount)})
              </p>
            )}
          </div>

          {/* QR Verification block */}
          {qr && (
            <div className="px-6 py-5 border-t border-gray-200 flex items-center gap-4 bg-gray-50">
              <img
                src={qr.dataUrl}
                alt="Verification QR"
                className="w-24 h-24 rounded-lg bg-white p-1 border border-emerald-200 flex-shrink-0"
                crossOrigin="anonymous"
              />
              <div className="flex-1 text-xs space-y-1">
                <div className="font-bold text-emerald-800 text-sm">
                  {bn ? '🔒 যাচাইযোগ্য রসিদ' : '🔒 Verifiable Receipt'}
                </div>
                <p className="text-gray-600 leading-snug">
                  {bn
                    ? 'যে কেউ এই QR কোড স্ক্যান করে রসিদের প্রকৃত স্ট্যাটাস ও তথ্য যাচাই করতে পারবেন।'
                    : 'Anyone can scan this QR to verify the authenticity and current status of this receipt.'}
                </p>
                <a
                  href={qr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:underline font-mono break-all text-[10px]"
                >
                  {qr.url}
                </a>
              </div>
            </div>
          )}

          {/* Rejection reason banner */}
          {(data.status === 'rejected' || data.status === 'failed') && (
            <div className="mx-6 mb-4 rounded-2xl border-2 border-red-300 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-red-800 text-sm">
                    {bn ? 'প্রত্যাখ্যানের কারণ' : 'Reason for Rejection'}
                  </div>
                  <div className="mt-1 text-sm text-red-900 whitespace-pre-wrap break-words">
                    {data.rejection_reason?.trim()
                      ? data.rejection_reason
                      : (bn
                          ? 'কোনো নির্দিষ্ট কারণ উল্লেখ করা হয়নি। বিস্তারিত জানতে অফিসে যোগাযোগ করুন।'
                          : 'No specific reason provided. Please contact the office for details.')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="p-6 text-xs text-gray-500 text-center space-y-1">
            {data.status === 'pending' && (
              <p className="text-amber-700 font-medium">
                {bn
                  ? '⚠️ এই রসিদটি অস্থায়ী। অ্যাডমিন TrxID যাচাই করার পর এটি অফিসিয়াল রসিদে পরিণত হবে।'
                  : '⚠️ This is a provisional receipt. It becomes official after admin verifies the TrxID.'}
              </p>
            )}
            <p>
              {bn
                ? 'এই রসিদটি ইলেকট্রনিকভাবে তৈরি, স্বাক্ষরের প্রয়োজন নেই।'
                : 'This receipt is generated electronically and requires no signature.'}
            </p>
            <p className="font-mono">ID: {data.id}</p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default ParentPaymentReceipt;
