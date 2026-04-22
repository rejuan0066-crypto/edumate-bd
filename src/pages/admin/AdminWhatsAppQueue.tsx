import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, XCircle, Send, Clock, AlertCircle, MessageCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

type QueueRow = {
  id: string;
  trigger_type: 'fee_receipt' | 'absence' | 'result' | 'notice' | 'custom';
  recipient_phone: string;
  recipient_name: string | null;
  message_text: string;
  status: 'pending' | 'approved' | 'sent' | 'failed' | 'rejected';
  created_at: string;
  sent_at: string | null;
  error_message: string | null;
};

const TRIGGER_LABEL: Record<string, { bn: string; en: string; color: string }> = {
  fee_receipt: { bn: 'ফি রসিদ', en: 'Fee Receipt', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  absence: { bn: 'অনুপস্থিতি', en: 'Absence', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  result: { bn: 'রেজাল্ট', en: 'Result', color: 'bg-violet-500/15 text-violet-700 dark:text-violet-400' },
  notice: { bn: 'নোটিশ', en: 'Notice', color: 'bg-sky-500/15 text-sky-700 dark:text-sky-400' },
  custom: { bn: 'কাস্টম', en: 'Custom', color: 'bg-slate-500/15 text-slate-700 dark:text-slate-400' },
};

const STATUS_META: Record<string, { bn: string; en: string; icon: any; color: string }> = {
  pending: { bn: 'অপেক্ষমান', en: 'Pending', icon: Clock, color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  approved: { bn: 'অনুমোদিত', en: 'Approved', icon: CheckCircle2, color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400' },
  sent: { bn: 'পাঠানো হয়েছে', en: 'Sent', icon: Send, color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  failed: { bn: 'ব্যর্থ', en: 'Failed', icon: AlertCircle, color: 'bg-rose-500/15 text-rose-700 dark:text-rose-400' },
  rejected: { bn: 'প্রত্যাখ্যাত', en: 'Rejected', icon: XCircle, color: 'bg-rose-500/15 text-rose-700 dark:text-rose-400' },
};

export default function AdminWhatsAppQueue() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'sent' | 'failed' | 'all'>('pending');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['whatsapp-queue', tab],
    queryFn: async () => {
      let q = supabase.from('whatsapp_message_queue').select('*').order('created_at', { ascending: false }).limit(500);
      if (tab === 'pending') q = q.in('status', ['pending', 'approved']);
      else if (tab === 'sent') q = q.eq('status', 'sent');
      else if (tab === 'failed') q = q.in('status', ['failed', 'rejected']);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as QueueRow[];
    },
    refetchInterval: 30_000,
  });

  const toggleAll = () => {
    if (selected.size === rows.filter(r => r.status === 'pending').length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.filter(r => r.status === 'pending').map(r => r.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const sendMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const items = rows.filter(r => ids.includes(r.id));
      if (!items.length) return { sent: 0, failed: 0 };

      // Group by phone to send via edge function
      const recipients = items.map(i => i.recipient_phone);
      const messages = items.map(i => i.message_text);

      // Send each individually so message bodies match
      let sentCount = 0, failedCount = 0;
      for (const item of items) {
        try {
          const { data, error } = await supabase.functions.invoke('send-whatsapp', {
            body: { recipients: [item.recipient_phone], message: item.message_text },
          });
          if (error) throw error;
          const ok = data?.results?.[0]?.success;
          await supabase.from('whatsapp_message_queue').update({
            status: ok ? 'sent' : 'failed',
            sent_at: ok ? new Date().toISOString() : null,
            error_message: ok ? null : (data?.results?.[0]?.error || 'Send failed'),
            approved_by: user?.id || null,
            approved_at: new Date().toISOString(),
          }).eq('id', item.id);
          if (ok) sentCount++; else failedCount++;
        } catch (e: any) {
          await supabase.from('whatsapp_message_queue').update({
            status: 'failed',
            error_message: e.message || 'Network error',
          }).eq('id', item.id);
          failedCount++;
        }
      }
      return { sent: sentCount, failed: failedCount };
    },
    onSuccess: ({ sent, failed }) => {
      toast.success(bn ? `${sent} টি বার্তা পাঠানো হয়েছে, ${failed} টি ব্যর্থ` : `${sent} sent, ${failed} failed`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['whatsapp-queue'] });
    },
    onError: (e: any) => toast.error(e.message || 'Failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('whatsapp_message_queue').update({
        status: 'rejected',
        approved_by: user?.id || null,
        approved_at: new Date().toISOString(),
      }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'প্রত্যাখ্যান করা হয়েছে' : 'Rejected');
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['whatsapp-queue'] });
    },
  });

  const stats = {
    pending: rows.filter(r => r.status === 'pending').length,
    sent: rows.filter(r => r.status === 'sent').length,
    failed: rows.filter(r => ['failed', 'rejected'].includes(r.status)).length,
  };

  return (
    <div className="space-y-6 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-emerald-500" />
            {bn ? 'WhatsApp অনুমোদন কিউ' : 'WhatsApp Approval Queue'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {bn
              ? 'ফি রসিদ, অনুপস্থিতি, রেজাল্ট ও নোটিশ থেকে স্বয়ংক্রিয়ভাবে আসা বার্তা রিভিউ করুন এবং পাঠান।'
              : 'Review and send auto-generated messages from fee, absence, result and notice events.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" /> {bn ? 'রিফ্রেশ' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'pending', label_bn: 'অপেক্ষমান', label_en: 'Pending', value: stats.pending, color: 'from-amber-500/20 to-amber-500/5' },
          { key: 'sent', label_bn: 'পাঠানো', label_en: 'Sent', value: stats.sent, color: 'from-emerald-500/20 to-emerald-500/5' },
          { key: 'failed', label_bn: 'ব্যর্থ', label_en: 'Failed', value: stats.failed, color: 'from-rose-500/20 to-rose-500/5' },
        ].map(s => (
          <Card key={s.key} className={`p-4 bg-gradient-to-br ${s.color} border-0`}>
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{bn ? s.label_bn : s.label_en}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4 sm:p-6">
        <Tabs value={tab} onValueChange={(v: any) => { setTab(v); setSelected(new Set()); }}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">{bn ? 'অপেক্ষমান' : 'Pending'}</TabsTrigger>
            <TabsTrigger value="sent">{bn ? 'পাঠানো হয়েছে' : 'Sent'}</TabsTrigger>
            <TabsTrigger value="failed">{bn ? 'ব্যর্থ/প্রত্যাখ্যাত' : 'Failed'}</TabsTrigger>
            <TabsTrigger value="all">{bn ? 'সব' : 'All'}</TabsTrigger>
          </TabsList>

          {tab === 'pending' && selected.size > 0 && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-2xl bg-primary/5 border border-primary/20">
              <span className="text-sm font-medium flex-1">
                {bn ? `${selected.size} টি নির্বাচিত` : `${selected.size} selected`}
              </span>
              <Button
                size="sm"
                onClick={() => sendMutation.mutate(Array.from(selected))}
                disabled={sendMutation.isPending}
                className="gap-1.5"
              >
                <Send className="w-4 h-4" /> {bn ? 'পাঠান' : 'Send'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => rejectMutation.mutate(Array.from(selected))}
                disabled={rejectMutation.isPending}
                className="gap-1.5"
              >
                <XCircle className="w-4 h-4" /> {bn ? 'প্রত্যাখ্যান' : 'Reject'}
              </Button>
            </div>
          )}

          <TabsContent value={tab} className="space-y-3">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                {bn ? 'কোনো বার্তা নেই' : 'No messages'}
              </div>
            ) : (
              <>
                {tab === 'pending' && (
                  <div className="flex items-center gap-3 px-3 pb-2 border-b">
                    <Checkbox
                      checked={selected.size > 0 && selected.size === rows.filter(r => r.status === 'pending').length}
                      onCheckedChange={toggleAll}
                    />
                    <span className="text-xs text-muted-foreground">{bn ? 'সব নির্বাচন' : 'Select all'}</span>
                  </div>
                )}
                {rows.map(row => {
                  const trig = TRIGGER_LABEL[row.trigger_type];
                  const stat = STATUS_META[row.status];
                  const StatIcon = stat.icon;
                  return (
                    <div
                      key={row.id}
                      className="flex gap-3 p-4 rounded-2xl border bg-card hover:bg-accent/30 transition-colors"
                    >
                      {row.status === 'pending' && (
                        <Checkbox
                          checked={selected.has(row.id)}
                          onCheckedChange={() => toggleOne(row.id)}
                          className="mt-1"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge className={`${trig.color} border-0`}>{bn ? trig.bn : trig.en}</Badge>
                          <Badge className={`${stat.color} border-0 gap-1`}>
                            <StatIcon className="w-3 h-3" /> {bn ? stat.bn : stat.en}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(row.created_at), 'dd MMM, HH:mm')}
                          </span>
                        </div>
                        <div className="text-sm font-medium">
                          {row.recipient_name || '—'} <span className="text-muted-foreground font-normal">· {row.recipient_phone}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap line-clamp-3">{row.message_text}</p>
                        {row.error_message && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">⚠ {row.error_message}</p>
                        )}
                      </div>
                      {row.status === 'pending' && (
                        <div className="flex flex-col gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => sendMutation.mutate([row.id])}
                            disabled={sendMutation.isPending}
                            className="gap-1"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectMutation.mutate([row.id])}
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}