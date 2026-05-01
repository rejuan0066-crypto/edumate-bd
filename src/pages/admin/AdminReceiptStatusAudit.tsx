import { useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { History, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const SOURCE_LABEL: Record<string, { bn: string; en: string }> = {
  admin: { bn: 'অ্যাডমিন', en: 'Admin' },
  parent_portal: { bn: 'প্যারেন্ট পোর্টাল', en: 'Parent Portal' },
  gateway: { bn: 'গেটওয়ে', en: 'Gateway' },
  system: { bn: 'সিস্টেম', en: 'System' },
};

const STATUS_TONE = (s?: string | null) => {
  const v = (s || '').toLowerCase();
  if (['success', 'verified', 'paid', 'approved'].includes(v))
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (['failed', 'rejected', 'cancelled'].includes(v))
    return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

const AdminReceiptStatusAudit = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [search, setSearch] = useState('');
  const [sourceTable, setSourceTable] = useState<'all' | 'fee_payments' | 'parent_payment_requests'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['receipt-status-audit-list', sourceTable, statusFilter, sourceFilter],
    queryFn: async () => {
      let q = supabase
        .from('receipt_status_audit')
        .select('*, students:student_id(name_bn, name_en, roll_number)')
        .order('changed_at', { ascending: false })
        .limit(500);
      if (sourceTable !== 'all') q = q.eq('source_table', sourceTable);
      if (statusFilter !== 'all') q = q.eq('new_status', statusFilter);
      if (sourceFilter !== 'all') q = q.eq('change_source', sourceFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const t = search.toLowerCase();
    return data.filter(
      (r: any) =>
        r.receipt_number?.toLowerCase().includes(t) ||
        r.trx_id?.toLowerCase().includes(t) ||
        r.changed_by_name?.toLowerCase().includes(t) ||
        r.students?.name_bn?.toLowerCase().includes(t) ||
        r.students?.name_en?.toLowerCase().includes(t) ||
        r.students?.roll_number?.toString().toLowerCase().includes(t),
    );
  }, [data, search]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {bn ? 'রসিদ স্ট্যাটাস অডিট টাইমলাইন' : 'Receipt Status Audit Timeline'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {bn
                ? 'সব Pending → Verified/Rejected পরিবর্তন সময়, অ্যাডমিন ও সোর্সসহ'
                : 'Every Pending → Verified/Rejected change with timestamp, admin, and source'}
            </p>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={bn ? 'রসিদ নং, TrxID, নাম বা রোল...' : 'Receipt #, TrxID, name or roll...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sourceTable} onValueChange={(v: any) => setSourceTable(v)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সব রসিদ ধরন' : 'All receipts'}</SelectItem>
                <SelectItem value="fee_payments">{bn ? 'অফিস ফি রসিদ' : 'Office fee receipts'}</SelectItem>
                <SelectItem value="parent_payment_requests">{bn ? 'প্যারেন্ট পেমেন্ট' : 'Parent payments'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সব স্ট্যাটাস' : 'All statuses'}</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সব সোর্স' : 'All sources'}</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="parent_portal">Parent Portal</SelectItem>
                <SelectItem value="gateway">Gateway</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1">
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              {bn ? 'রিফ্রেশ' : 'Refresh'}
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">{bn ? 'সময়' : 'Time'}</th>
                  <th className="text-left px-4 py-3">{bn ? 'ছাত্র' : 'Student'}</th>
                  <th className="text-left px-4 py-3">{bn ? 'রসিদ' : 'Receipt'}</th>
                  <th className="text-left px-4 py-3">{bn ? 'পরিবর্তন' : 'Change'}</th>
                  <th className="text-left px-4 py-3">{bn ? 'কে' : 'By'}</th>
                  <th className="text-left px-4 py-3">{bn ? 'সোর্স' : 'Source'}</th>
                  <th className="text-right px-4 py-3">{bn ? 'পরিমাণ' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">{bn ? 'কোনো রেকর্ড নেই' : 'No records'}</td></tr>
                ) : (
                  filtered.map((r: any) => {
                    const sLabel = SOURCE_LABEL[r.change_source] || { bn: r.change_source, en: r.change_source };
                    return (
                      <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                          {format(new Date(r.changed_at), 'dd/MM/yyyy hh:mm a')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {bn ? r.students?.name_bn : r.students?.name_en || r.students?.name_bn}
                          </div>
                          {r.students?.roll_number && (
                            <div className="text-xs text-muted-foreground">Roll: {r.students.roll_number}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {r.receipt_number || r.trx_id || r.source_id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {r.old_status && <span className="text-xs text-muted-foreground">{r.old_status}</span>}
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="outline" className={`${STATUS_TONE(r.new_status)} font-semibold`}>
                              {r.new_status}
                            </Badge>
                          </div>
                          {r.rejection_reason && (
                            <div className="text-xs text-rose-600 mt-1">{r.rejection_reason}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">{r.changed_by_name || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-[10px]">
                            {bn ? sLabel.bn : sLabel.en}
                          </Badge>
                          {r.payment_method && (
                            <div className="text-[10px] text-muted-foreground uppercase mt-1">{r.payment_method}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {r.amount != null ? `৳ ${Number(r.amount).toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-muted-foreground border-t bg-muted/30">
            {bn ? 'মোট' : 'Total'}: {filtered.length}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminReceiptStatusAudit;
