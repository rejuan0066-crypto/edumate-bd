import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, RefreshCw, Search, AlertCircle, CheckCircle2, Loader2, Eye, Send, RotateCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface LogRow {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  template_kind: 'user' | 'student' | 'other';
  subject: string | null;
  status: 'sent' | 'failed';
  error_message: string | null;
  metadata: any;
  created_at: string;
}

const AdminEmailDeliveryLog = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [kindFilter, setKindFilter] = useState<'all' | 'user' | 'student' | 'other'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<LogRow | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [bulkRetrying, setBulkRetrying] = useState(false);

  const retryOne = async (row: LogRow): Promise<{ ok: boolean; error?: string }> => {
    const meta = (row.metadata && typeof row.metadata === 'object') ? row.metadata : {};
    const kind = row.template_kind === 'other' ? 'user' : row.template_kind;
    const { data, error } = await supabase.functions.invoke('send-welcome-email', {
      body: {
        email: row.recipient_email,
        full_name: row.recipient_name || undefined,
        kind,
        role: (meta as any).role,
        student_id: (meta as any).student_id,
      },
    });
    if (error) return { ok: false, error: error.message };
    if (data?.error) return { ok: false, error: data.error };
    return { ok: true };
  };

  const handleRetryOne = async (row: LogRow) => {
    setRetryingId(row.id);
    const res = await retryOne(row);
    setRetryingId(null);
    if (res.ok) {
      toast({ title: bn ? 'পুনরায় পাঠানো হয়েছে' : 'Resent', description: row.recipient_email });
    } else {
      toast({ title: bn ? 'ব্যর্থ' : 'Failed', description: res.error, variant: 'destructive' });
    }
    load();
  };

  const handleBulkRetry = async () => {
    const failed = filtered.filter(r => r.status === 'failed');
    if (failed.length === 0) {
      toast({ title: bn ? 'কোনো ব্যর্থ ইমেইল নেই' : 'No failed emails to retry' });
      return;
    }
    setBulkRetrying(true);
    let ok = 0, fail = 0;
    // Dedupe by email+kind so we don't spam the same recipient
    const seen = new Set<string>();
    const queue = failed.filter(r => {
      const key = `${r.template_kind}:${r.recipient_email.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    for (const row of queue) {
      const res = await retryOne(row);
      if (res.ok) ok++; else fail++;
    }
    setBulkRetrying(false);
    toast({
      title: bn ? 'পুনঃপ্রেরণ সম্পন্ন' : 'Retry complete',
      description: bn
        ? `সফল: ${ok}, ব্যর্থ: ${fail} (${queue.length} জন প্রাপক)`
        : `Sent: ${ok}, Failed: ${fail} (${queue.length} recipients)`,
      variant: fail > 0 ? 'destructive' : 'default',
    });
    load();
  };
    setLoading(true);
    const { data } = await supabase
      .from('email_delivery_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    setRows((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (kindFilter !== 'all' && r.template_kind !== kindFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.recipient_email.toLowerCase().includes(q) &&
            !(r.recipient_name || '').toLowerCase().includes(q) &&
            !(r.error_message || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, kindFilter, search]);

  const stats = useMemo(() => ({
    total: rows.length,
    sent: rows.filter(r => r.status === 'sent').length,
    failed: rows.filter(r => r.status === 'failed').length,
    user: rows.filter(r => r.template_kind === 'user').length,
    student: rows.filter(r => r.template_kind === 'student').length,
  }), [rows]);

  const kindLabel = (k: string) => {
    if (k === 'user') return bn ? 'ইউজার' : 'User';
    if (k === 'student') return bn ? 'ছাত্র' : 'Student';
    return bn ? 'অন্যান্য' : 'Other';
  };

  return (
    <AdminLayout>
      <div className="max-w-[1440px] mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{bn ? 'ইমেইল ডেলিভারি লগ' : 'Email Delivery Log'}</h1>
              <p className="text-sm text-muted-foreground">
                {bn ? 'পাঠানো ও ব্যর্থ ইমেইলের ইতিহাস' : 'History of sent & failed welcome/admission emails'}
              </p>
            </div>
          </div>
          <Button onClick={load} variant="outline" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {bn ? 'রিফ্রেশ' : 'Refresh'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: bn ? 'মোট' : 'Total', value: stats.total, color: 'text-foreground' },
            { label: bn ? 'সফল' : 'Sent', value: stats.sent, color: 'text-emerald-600' },
            { label: bn ? 'ব্যর্থ' : 'Failed', value: stats.failed, color: 'text-destructive' },
            { label: bn ? 'ইউজার' : 'User', value: stats.user, color: 'text-blue-600' },
            { label: bn ? 'ছাত্র' : 'Student', value: stats.student, color: 'text-purple-600' },
          ].map((s, i) => (
            <div key={i} className="bg-card/60 backdrop-blur-xl border rounded-[28px] p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <p className={`text-3xl font-bold mt-2 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-card/60 backdrop-blur-xl border rounded-[38px] p-5 flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={bn ? 'ইমেইল, নাম বা ত্রুটি খুঁজুন...' : 'Search email, name or error...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bn ? 'সব স্ট্যাটাস' : 'All status'}</SelectItem>
              <SelectItem value="sent">{bn ? 'সফল' : 'Sent'}</SelectItem>
              <SelectItem value="failed">{bn ? 'ব্যর্থ' : 'Failed'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={kindFilter} onValueChange={v => setKindFilter(v as any)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bn ? 'সব ধরন' : 'All kinds'}</SelectItem>
              <SelectItem value="user">{bn ? 'ইউজার' : 'User'}</SelectItem>
              <SelectItem value="student">{bn ? 'ছাত্র' : 'Student'}</SelectItem>
              <SelectItem value="other">{bn ? 'অন্যান্য' : 'Other'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card/60 backdrop-blur-xl border rounded-[45px] p-4 md:p-6">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />{bn ? 'লোড হচ্ছে...' : 'Loading...'}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              {bn ? 'কোনো লগ পাওয়া যায়নি' : 'No logs found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderSpacing: '0 8px', borderCollapse: 'separate' }}>
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 px-4 font-bold text-[11px] uppercase tracking-widest">{bn ? 'সময়' : 'Time'}</th>
                    <th className="py-2 px-4 font-bold text-[11px] uppercase tracking-widest">{bn ? 'প্রাপক' : 'Recipient'}</th>
                    <th className="py-2 px-4 font-bold text-[11px] uppercase tracking-widest">{bn ? 'ধরন' : 'Kind'}</th>
                    <th className="py-2 px-4 font-bold text-[11px] uppercase tracking-widest">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                    <th className="py-2 px-4 font-bold text-[11px] uppercase tracking-widest">{bn ? 'ত্রুটি / বিষয়' : 'Error / Subject'}</th>
                    <th className="py-2 px-4 font-bold text-[11px] uppercase tracking-widest text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="bg-background/40 hover:bg-primary/5 transition-all">
                      <td className="py-3 px-4 first:rounded-l-[20px] whitespace-nowrap text-muted-foreground">
                        {format(new Date(r.created_at), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{r.recipient_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">{r.recipient_email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{kindLabel(r.template_kind)}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        {r.status === 'sent' ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 mr-1" />{bn ? 'সফল' : 'Sent'}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertCircle className="w-3 h-3 mr-1" />{bn ? 'ব্যর্থ' : 'Failed'}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground max-w-[320px] truncate">
                        {r.status === 'failed' ? (r.error_message || '-') : (r.subject || '-')}
                      </td>
                      <td className="py-3 px-4 last:rounded-r-[20px] text-right">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail dialog */}
        <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
          <DialogContent className="max-w-lg rounded-[38px]">
            <DialogHeader>
              <DialogTitle>{bn ? 'ইমেইল লগ বিস্তারিত' : 'Email Log Details'}</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-3 text-sm">
                <Row label={bn ? 'প্রাপক' : 'Recipient'} value={`${selected.recipient_name || '-'} <${selected.recipient_email}>`} />
                <Row label={bn ? 'ধরন' : 'Kind'} value={kindLabel(selected.template_kind)} />
                <Row label={bn ? 'স্ট্যাটাস' : 'Status'} value={selected.status} />
                <Row label={bn ? 'বিষয়' : 'Subject'} value={selected.subject || '-'} />
                <Row label={bn ? 'সময়' : 'Time'} value={format(new Date(selected.created_at), 'dd/MM/yyyy HH:mm:ss')} />
                {selected.error_message && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{bn ? 'ত্রুটি' : 'Error message'}</p>
                    <pre className="bg-destructive/10 text-destructive p-3 rounded-xl text-xs whitespace-pre-wrap break-all">
                      {selected.error_message}
                    </pre>
                  </div>
                )}
                {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Metadata</p>
                    <pre className="bg-muted/40 p-3 rounded-xl text-xs whitespace-pre-wrap break-all">
                      {JSON.stringify(selected.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4 py-2 border-b border-border/40 last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right break-all">{value}</span>
  </div>
);

export default AdminEmailDeliveryLog;
