import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

type AuditRow = {
  id: string;
  source_table: 'fee_payments' | 'parent_payment_requests' | string;
  source_id: string;
  receipt_number: string | null;
  student_id: string | null;
  old_status: string | null;
  new_status: string;
  changed_by_name: string | null;
  change_source: string | null;
  payment_method: string | null;
  trx_id: string | null;
  amount: number | null;
  rejection_reason: string | null;
  changed_at: string;
};

const tone = (s: string): 'success' | 'error' | 'info' => {
  const v = (s || '').toLowerCase();
  if (['success', 'verified', 'paid', 'approved'].includes(v)) return 'success';
  if (['failed', 'rejected', 'cancelled'].includes(v)) return 'error';
  return 'info';
};

const sourceLabel = (s: string | null, bn: boolean) => {
  switch ((s || '').toLowerCase()) {
    case 'admin': return bn ? 'অ্যাডমিন' : 'Admin';
    case 'parent_portal': return bn ? 'প্যারেন্ট পোর্টাল' : 'Parent Portal';
    case 'gateway': return bn ? 'গেটওয়ে' : 'Gateway';
    default: return bn ? 'সিস্টেম' : 'System';
  }
};

/**
 * Mounts a single realtime subscription to receipt_status_audit for the
 * currently-logged-in admin and surfaces a toast for every new entry.
 * RLS already restricts rows to admins/super_admin/accounts staff, so
 * non-privileged users will simply receive no events.
 */
export const useReceiptStatusRealtime = () => {
  const qc = useQueryClient();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const navigate = useNavigate();
  const seen = useRef<Set<string>>(new Set());
  // Skip toasts for events that occurred before the page mounted (avoid spam on reload)
  const mountedAt = useRef<number>(Date.now());

  useEffect(() => {
    const channel = supabase
      .channel('receipt-status-audit-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'receipt_status_audit' },
        (payload) => {
          const row = payload.new as AuditRow;
          if (!row?.id || seen.current.has(row.id)) return;
          seen.current.add(row.id);

          // Ignore stale rows (>30s before mount) — they don't need a toast
          const ts = new Date(row.changed_at).getTime();
          if (ts < mountedAt.current - 30_000) return;

          // Invalidate query caches so any open page refreshes
          qc.invalidateQueries({ queryKey: ['receipt-status-audit'] });
          qc.invalidateQueries({ queryKey: ['receipt-status-audit-list'] });
          qc.invalidateQueries({ queryKey: ['parent-payment-requests-admin'] });
          qc.invalidateQueries({ queryKey: ['payments'] });
          qc.invalidateQueries({ queryKey: ['fee_payments'] });

          // Don't toast on initial INSERT (no old_status) unless it's a parent
          // submission worth surfacing — pending parent payments matter to admins.
          const isCreate = !row.old_status;
          const interesting =
            !isCreate ||
            (row.source_table === 'parent_payment_requests' && row.new_status === 'pending');

          if (!interesting) return;

          const t = tone(row.new_status);
          const ident =
            row.receipt_number ||
            row.trx_id ||
            (row.source_id ? row.source_id.slice(0, 8) : '');

          const titleBase = isCreate
            ? row.source_table === 'parent_payment_requests'
              ? bn ? 'নতুন প্যারেন্ট পেমেন্ট অনুরোধ' : 'New parent payment request'
              : bn ? 'নতুন রসিদ তৈরি' : 'New receipt created'
            : bn
              ? `রসিদ স্ট্যাটাস: ${row.old_status} → ${row.new_status}`
              : `Receipt status: ${row.old_status} → ${row.new_status}`;

          const title = ident ? `${titleBase} • ${ident}` : titleBase;

          const descParts: string[] = [];
          if (row.amount != null) descParts.push(`৳ ${Number(row.amount).toLocaleString()}`);
          if (row.payment_method) descParts.push(row.payment_method.toUpperCase());
          descParts.push(sourceLabel(row.change_source, bn));
          if (row.changed_by_name && row.change_source !== 'gateway') descParts.push(row.changed_by_name);
          if (row.rejection_reason) descParts.push(row.rejection_reason);
          const description = descParts.join(' • ');

          const opts = {
            description,
            duration: 6000,
            action: {
              label: bn ? 'দেখুন' : 'View',
              onClick: () => navigate('/admin/receipt-audit'),
            },
          };

          if (t === 'success') toast.success(title, opts);
          else if (t === 'error') toast.error(title, opts);
          else toast.info(title, opts);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // Bind once per language change to keep toast strings localized
  }, [qc, bn, navigate]);
};

export default useReceiptStatusRealtime;
