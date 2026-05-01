import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/usePermissions';
import PublicLayout from '@/components/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, ShieldCheck, ShieldAlert, ScanLine, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toBanglaDigits } from '@/lib/amountInWords';

interface PublicResult {
  valid: boolean;
  error?: string;
  receipt_type?: string;
  receipt_id?: string;
  receipt_number?: string | null;
  amount?: number;
  status?: string;
  paid_at?: string | null;
  method?: string | null;
  trx_id?: string | null;
  student_name?: string | null;
  student_id?: string | null;
  class_name?: string | null;
  fee_type?: string | null;
}

interface AdminResult {
  valid: boolean;
  error?: string;
  receipt_type?: string;
  receipt?: any;
  student?: any;
  class?: any;
  fee_type?: any;
  token_info?: any;
}

const statusBadge = (status: string | undefined, bn: boolean) => {
  const s = (status || '').toLowerCase();
  if (['verified', 'success', 'paid'].includes(s)) {
    return { color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2, label: bn ? 'যাচাইকৃত / পরিশোধিত' : 'Verified / Paid' };
  }
  if (['rejected', 'failed'].includes(s)) {
    return { color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle, label: bn ? 'প্রত্যাখ্যাত' : 'Rejected' };
  }
  return { color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock, label: bn ? 'যাচাইয়ের অপেক্ষায়' : 'Pending' };
};

const VerifyReceipt = () => {
  const { token } = useParams<{ token: string }>();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { user } = useAuth();
  const { role } = useUserRole();
  const isStaff = !!user && ['admin', 'super_admin', 'accounts'].includes(role || '');

  const [pub, setPub] = useState<PublicResult | null>(null);
  const [adm, setAdm] = useState<AdminResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      const { data: p } = await (supabase as any).rpc('verify_receipt_public', { _token: token });
      setPub(p as PublicResult);
      if (isStaff) {
        const { data: a } = await (supabase as any).rpc('verify_receipt_admin', { _token: token });
        setAdm(a as AdminResult);
      }
      setLoading(false);
    })();
  }, [token, isStaff]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">{bn ? 'যাচাই করা হচ্ছে...' : 'Verifying...'}</div>
        </div>
      </PublicLayout>
    );
  }

  if (!pub || !pub.valid) {
    const errMap: Record<string, { en: string; bn: string }> = {
      NOT_FOUND: { en: 'This QR code is not recognized.', bn: 'এই QR কোডটি বৈধ নয়।' },
      REVOKED: { en: 'This receipt has been revoked.', bn: 'এই রসিদটি বাতিল করা হয়েছে।' },
      EXPIRED: { en: 'This verification link has expired.', bn: 'এই যাচাই লিংকের মেয়াদ শেষ।' },
      RECEIPT_DELETED: { en: 'The original receipt no longer exists.', bn: 'মূল রসিদটি আর নেই।' },
    };
    const m = errMap[pub?.error || 'NOT_FOUND'];
    return (
      <PublicLayout>
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <Card className="max-w-md w-full rounded-[28px] border-red-200">
            <CardContent className="p-8 text-center space-y-4">
              <ShieldAlert className="w-16 h-16 mx-auto text-red-500" />
              <h2 className="text-xl font-bold text-red-700">{bn ? 'অবৈধ রসিদ' : 'Invalid Receipt'}</h2>
              <p className="text-muted-foreground">{bn ? m.bn : m.en}</p>
              <Button asChild className="rounded-xl"><Link to="/">{bn ? 'হোমে ফিরুন' : 'Back to Home'}</Link></Button>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  const meta = statusBadge(pub.status, bn);
  const StatusIcon = meta.icon;
  const fmtAmt = (n: number | undefined) => n == null ? '—' : (bn ? `৳${toBanglaDigits(n.toLocaleString('en-US'))}` : `৳${n.toLocaleString()}`);

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        {/* Verification banner */}
        <Card className="rounded-[28px] border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-lg">
          <CardContent className="p-6 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-600 text-white">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-emerald-800">
              {bn ? '✅ রসিদ যাচাইকৃত' : '✅ Receipt Verified'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {bn ? 'এই রসিদটি প্রতিষ্ঠানের অফিসিয়াল রেকর্ডে পাওয়া গেছে।' : 'This receipt is found in the official records of the institution.'}
            </p>
            <Badge className={`${meta.color} border px-4 py-1 text-sm`}>
              <StatusIcon className="w-4 h-4 mr-1.5 inline" />
              {meta.label}
            </Badge>
          </CardContent>
        </Card>

        {/* Public summary */}
        <Card className="rounded-[28px] shadow-md">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {bn ? 'রসিদের সারসংক্ষেপ' : 'Receipt Summary'}
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {pub.receipt_number && (
                <div>
                  <dt className="text-muted-foreground">{bn ? 'রসিদ নম্বর' : 'Receipt No.'}</dt>
                  <dd className="font-mono font-semibold">{pub.receipt_number}</dd>
                </div>
              )}
              {pub.student_name && (
                <div>
                  <dt className="text-muted-foreground">{bn ? 'ছাত্রের নাম' : 'Student Name'}</dt>
                  <dd className="font-semibold">{pub.student_name}</dd>
                </div>
              )}
              {pub.student_id && (
                <div>
                  <dt className="text-muted-foreground">{bn ? 'রেজি নং' : 'Reg No.'}</dt>
                  <dd className="font-mono font-semibold">{pub.student_id}</dd>
                </div>
              )}
              {pub.class_name && (
                <div>
                  <dt className="text-muted-foreground">{bn ? 'শ্রেণি' : 'Class'}</dt>
                  <dd className="font-semibold">{pub.class_name}</dd>
                </div>
              )}
              {pub.fee_type && (
                <div>
                  <dt className="text-muted-foreground">{bn ? 'ফি ধরন' : 'Fee Type'}</dt>
                  <dd className="font-semibold">{pub.fee_type}</dd>
                </div>
              )}
              {pub.method && (
                <div>
                  <dt className="text-muted-foreground">{bn ? 'পদ্ধতি' : 'Method'}</dt>
                  <dd className="font-semibold uppercase">{pub.method}</dd>
                </div>
              )}
              {pub.trx_id && (
                <div>
                  <dt className="text-muted-foreground">{bn ? 'TrxID' : 'TrxID'}</dt>
                  <dd className="font-mono font-semibold">{pub.trx_id}</dd>
                </div>
              )}
              {pub.paid_at && (
                <div>
                  <dt className="text-muted-foreground">{bn ? 'তারিখ' : 'Date'}</dt>
                  <dd className="font-semibold">{format(new Date(pub.paid_at), 'dd/MM/yyyy hh:mm a')}</dd>
                </div>
              )}
              <div className="sm:col-span-2 pt-3 border-t">
                <dt className="text-muted-foreground">{bn ? 'মোট পরিশোধিত' : 'Amount Paid'}</dt>
                <dd className="text-2xl font-bold text-emerald-700">{fmtAmt(pub.amount)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Admin-only extended details */}
        {isStaff && adm?.valid && (
          <Card className="rounded-[28px] border-blue-200 shadow-md">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-blue-700 flex items-center gap-2">
                  <ScanLine className="w-4 h-4" /> {bn ? 'অ্যাডমিন বিস্তারিত' : 'Admin Details'}
                </h3>
                {adm.token_info && (
                  <div className="text-xs text-muted-foreground">
                    {bn ? 'মোট স্ক্যান: ' : 'Scans: '}<span className="font-bold text-foreground">{adm.token_info.scan_count}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {adm.receipt && Object.entries(adm.receipt).map(([k, v]) => {
                  if (v == null || typeof v === 'object') return null;
                  return (
                    <div key={k} className="break-all">
                      <dt className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</dt>
                      <dd className="font-mono text-xs">{String(v)}</dd>
                    </div>
                  );
                })}
              </div>

              {adm.token_info && (
                <div className="pt-3 border-t text-xs text-muted-foreground space-y-1">
                  <div>{bn ? 'টোকেন তৈরি: ' : 'Token created: '}{format(new Date(adm.token_info.created_at), 'dd/MM/yyyy hh:mm a')}</div>
                  {adm.token_info.expires_at && <div>{bn ? 'মেয়াদ শেষ: ' : 'Expires: '}{format(new Date(adm.token_info.expires_at), 'dd/MM/yyyy')}</div>}
                </div>
              )}

              {adm.receipt_type === 'parent_payment_request' && adm.receipt?.id && (
                <Button asChild variant="outline" className="rounded-xl w-full">
                  <Link to={`/admin/parent-payment-requests`}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {bn ? 'প্যারেন্ট পেমেন্ট ম্যানেজে যান' : 'Open in Parent Payment Manager'}
                  </Link>
                </Button>
              )}
              {adm.receipt_type === 'fee_payment' && (
                <Button asChild variant="outline" className="rounded-xl w-full">
                  <Link to={`/admin/fee-receipts`}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {bn ? 'ফি রসিদ ম্যানেজে যান' : 'Open in Fee Receipts'}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {!isStaff && (
          <p className="text-center text-xs text-muted-foreground">
            {bn ? 'বিস্তারিত তথ্য দেখতে অ্যাডমিন/স্টাফ লগইন প্রয়োজন।' : 'Admin/staff login required to see full details.'}
          </p>
        )}
      </div>
    </PublicLayout>
  );
};

export default VerifyReceipt;
