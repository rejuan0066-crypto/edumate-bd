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

// Polling cadence (ms) when realtime is dropped — exponential backoff, capped.
const POLL_MIN = 5_000;
const POLL_MAX = 60_000;

/**
 * Mounts a single realtime subscription to receipt_status_audit for the
 * currently-logged-in admin and surfaces a toast for every new entry.
 *
 * Resilience: if the realtime channel errors out, times out, or closes,
 * we fall back to polling the audit table with exponential backoff
 * (5s → 10s → 20s → 40s → 60s cap). When realtime recovers (SUBSCRIBED),
 * polling stops and the backoff resets. Same dedupe set is shared so a
 * single status change never fires two toasts.
 */
export const useReceiptStatusRealtime = (enabled: boolean = true) => {
  const qc = useQueryClient();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const navigate = useNavigate();
  const seen = useRef<Set<string>>(new Set());
  // Skip toasts for events that occurred before the page mounted (avoid spam on reload)
  const mountedAt = useRef<number>(Date.now());
  // Tracks the most recent audit row we've processed (for incremental polling)
  const lastSeenAt = useRef<string>(new Date().toISOString());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let pollDelay = POLL_MIN;
    let polling = false;

    const handleRow = (row: AuditRow, opts?: { skipToast?: boolean }) => {
      if (!row?.id || seen.current.has(row.id)) return;
      seen.current.add(row.id);

      // Track high-water mark for the polling fallback
      if (row.changed_at && row.changed_at > lastSeenAt.current) {
        lastSeenAt.current = row.changed_at;
      }

      // Invalidate query caches so any open page refreshes
      qc.invalidateQueries({ queryKey: ['receipt-status-audit'] });
      qc.invalidateQueries({ queryKey: ['receipt-status-audit-list'] });
      qc.invalidateQueries({ queryKey: ['parent-payment-requests-admin'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['fee_payments'] });

      if (opts?.skipToast) return;

      // Ignore stale rows (>30s before mount) — they don't need a toast
      const ts = new Date(row.changed_at).getTime();
      if (ts < mountedAt.current - 30_000) return;

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

      const toastOpts = {
        description,
        duration: 6000,
        action: {
          label: bn ? 'দেখুন' : 'View',
          onClick: () => navigate('/admin/receipt-audit'),
        },
      };

      if (t === 'success') toast.success(title, toastOpts);
      else if (t === 'error') toast.error(title, toastOpts);
      else toast.info(title, toastOpts);
    };

    const pollOnce = async () => {
      try {
        const { data, error } = await supabase
          .from('receipt_status_audit')
          .select('*')
          .gt('changed_at', lastSeenAt.current)
          .order('changed_at', { ascending: true })
          .limit(50);
        if (cancelled) return;
        if (error) throw error;
        (data || []).forEach((row) => handleRow(row as AuditRow));
        // Success → reset backoff to minimum
        pollDelay = POLL_MIN;
      } catch {
        // Failure → grow backoff (exponential, capped)
        pollDelay = Math.min(pollDelay * 2, POLL_MAX);
      }
    };

    const schedulePoll = () => {
      if (cancelled || pollTimer) return;
      pollTimer = setTimeout(async () => {
        pollTimer = null;
        if (!polling || cancelled) return;
        await pollOnce();
        if (polling) schedulePoll();
      }, pollDelay);
    };

    const startPolling = () => {
      if (polling || cancelled) return;
      polling = true;
      pollDelay = POLL_MIN;
      // Run an immediate catch-up, then schedule subsequent polls
      pollOnce().then(() => {
        if (polling) schedulePoll();
      });
    };

    const stopPolling = () => {
      polling = false;
      if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
      pollDelay = POLL_MIN;
    };

    const channelName = `receipt-status-audit-stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'receipt_status_audit' },
        (payload) => handleRow(payload.new as AuditRow),
      )
      .subscribe((status) => {
        if (cancelled) return;
        // Realtime healthy → stop fallback polling
        if (status === 'SUBSCRIBED') {
          stopPolling();
        }
        // Realtime degraded → kick off polling fallback with backoff
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          startPolling();
        }
      });

    // If the tab regains focus or comes back online, force a catch-up poll
    // so we don't wait the full backoff window after a sleep/network blip.
    const onWake = () => {
      if (cancelled) return;
      pollOnce();
    };
    window.addEventListener('online', onWake);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onWake();
    });

    return () => {
      cancelled = true;
      stopPolling();
      window.removeEventListener('online', onWake);
      supabase.removeChannel(channel);
    };
    // Bind once per language change to keep toast strings localized
  }, [enabled, qc, bn, navigate]);
};

export default useReceiptStatusRealtime;
