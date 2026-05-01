import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  CreditCard,
  UserCog,
  Globe,
  Cog,
} from 'lucide-react';

type Props = {
  /** Either 'fee_payments' or 'parent_payment_requests' */
  sourceTable: 'fee_payments' | 'parent_payment_requests';
  sourceId?: string | null;
  /** Pull all entries for a given student instead of a single source row */
  studentId?: string | null;
  className?: string;
  emptyText?: string;
};

const statusVisual = (s?: string | null) => {
  const v = (s || '').toLowerCase();
  if (['success', 'verified', 'paid', 'approved'].includes(v))
    return { Icon: CheckCircle2, ring: 'ring-emerald-300', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' };
  if (['failed', 'rejected', 'cancelled'].includes(v))
    return { Icon: XCircle, ring: 'ring-rose-300', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' };
  return { Icon: Clock, ring: 'ring-amber-300', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' };
};

const sourceVisual = (s?: string | null) => {
  switch ((s || '').toLowerCase()) {
    case 'admin':
      return { Icon: UserCog, label: { bn: 'অ্যাডমিন', en: 'Admin' } };
    case 'parent_portal':
      return { Icon: Globe, label: { bn: 'প্যারেন্ট পোর্টাল', en: 'Parent Portal' } };
    case 'gateway':
      return { Icon: CreditCard, label: { bn: 'গেটওয়ে', en: 'Gateway' } };
    default:
      return { Icon: Cog, label: { bn: 'সিস্টেম', en: 'System' } };
  }
};

export const ReceiptStatusTimeline = ({
  sourceTable,
  sourceId,
  studentId,
  className,
  emptyText,
}: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['receipt-status-audit', sourceTable, sourceId, studentId],
    queryFn: async () => {
      let q = supabase
        .from('receipt_status_audit')
        .select('*')
        .eq('source_table', sourceTable)
        .order('changed_at', { ascending: false });
      if (sourceId) q = q.eq('source_id', sourceId);
      else if (studentId) q = q.eq('student_id', studentId);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!(sourceId || studentId),
  });

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          {bn ? 'স্ট্যাটাস টাইমলাইন' : 'Status Timeline'}
        </h3>
        <button
          type="button"
          onClick={() => refetch()}
          className="no-print text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          {bn ? 'রিফ্রেশ' : 'Refresh'}
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          {bn ? 'লোড হচ্ছে...' : 'Loading...'}
        </div>
      ) : data.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          {emptyText ?? (bn ? 'কোনো পরিবর্তন পাওয়া যায়নি' : 'No changes recorded yet')}
        </div>
      ) : (
        <ScrollArea className="max-h-[420px] pr-2">
          <ol className="relative border-l-2 border-dashed border-emerald-200 ml-3 space-y-4">
            {data.map((row: any) => {
              const v = statusVisual(row.new_status);
              const sv = sourceVisual(row.change_source);
              const SrcIcon = sv.Icon;
              return (
                <li key={row.id} className="ml-4">
                  <span
                    className={`absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${v.dot}`}
                  >
                    <v.Icon className="h-3 w-3 text-white" />
                  </span>

                  <div className={`rounded-2xl border ${v.bg} border-emerald-100/60 p-3`}>
                    <div className="flex flex-wrap items-center gap-2">
                      {row.old_status ? (
                        <span className="text-xs text-muted-foreground">
                          {row.old_status} →
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {bn ? 'তৈরি হয়েছে →' : 'Created →'}
                        </span>
                      )}
                      <Badge variant="outline" className={`${v.text} border-current font-semibold`}>
                        {row.new_status}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] inline-flex items-center gap-1">
                        <SrcIcon className="h-3 w-3" />
                        {bn ? sv.label.bn : sv.label.en}
                      </Badge>
                      {row.payment_method && (
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {row.payment_method}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-foreground/80">
                      <div>
                        <span className="text-muted-foreground">
                          {bn ? 'কে: ' : 'By: '}
                        </span>
                        <span className="font-medium">{row.changed_by_name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {bn ? 'সময়: ' : 'When: '}
                        </span>
                        <span className="font-medium">
                          {format(new Date(row.changed_at), 'dd/MM/yyyy hh:mm a')}
                        </span>
                      </div>
                      {row.amount != null && (
                        <div>
                          <span className="text-muted-foreground">{bn ? 'পরিমাণ: ' : 'Amount: '}</span>
                          <span className="font-medium">৳ {Number(row.amount).toLocaleString()}</span>
                        </div>
                      )}
                      {row.trx_id && (
                        <div className="truncate">
                          <span className="text-muted-foreground">TrxID: </span>
                          <span className="font-mono">{row.trx_id}</span>
                        </div>
                      )}
                      {row.receipt_number && (
                        <div className="truncate">
                          <span className="text-muted-foreground">{bn ? 'রসিদ: ' : 'Receipt: '}</span>
                          <span className="font-mono">{row.receipt_number}</span>
                        </div>
                      )}
                    </div>

                    {row.rejection_reason && (
                      <div className="mt-2 text-xs text-rose-700 bg-rose-50 rounded-lg px-2 py-1 border border-rose-200">
                        <span className="font-semibold">{bn ? 'প্রত্যাখ্যানের কারণ: ' : 'Rejection: '}</span>
                        {row.rejection_reason}
                      </div>
                    )}
                    {row.note && !row.rejection_reason && (
                      <div className="mt-2 text-xs text-muted-foreground italic">{row.note}</div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </ScrollArea>
      )}
    </div>
  );
};

export default ReceiptStatusTimeline;
