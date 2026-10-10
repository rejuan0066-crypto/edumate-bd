// @ts-nocheck -- generated DB types are stricter than these legacy dynamic shapes
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2, Search, RefreshCw, Eye, User, ShieldCheck, ArrowRight,
  TrendingDown, TrendingUp, AlertOctagon, History, Calendar, FileText,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ACTION_CONFIG, AccountsAuditAction, AccountsAuditEntry } from '@/lib/accountsAudit';

interface AccountsAuditViewProps {
  currentMonthYear?: string;
  onRefreshExpenses?: () => void;
}

export default function AccountsAuditView({ currentMonthYear }: AccountsAuditViewProps) {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<AccountsAuditEntry | null>(null);

  // Query security_logs for accounts_audit
  const auditQuery = useQuery({
    queryKey: ['accounts-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_logs')
        .select('*')
        .eq('event_type', 'accounts_audit')
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) {
        console.warn('Error fetching accounts audit logs:', error);
        return [] as AccountsAuditEntry[];
      }
      return (data ?? []) as unknown as AccountsAuditEntry[];
    },
    refetchInterval: 15_000,
  });

  const logs = auditQuery.data ?? [];

  // Filtered entries
  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      const meta = log.metadata || {};
      const action = meta.action || log.reason || '';
      const entity = meta.entity_type || '';

      // Entity filter
      if (entityFilter !== 'all' && entity !== entityFilter) return false;

      // Action filter
      if (actionFilter !== 'all' && action !== actionFilter) return false;

      // Text search
      if (!q) return true;
      const haystack = [
        meta.title,
        meta.institution_name,
        meta.category_name,
        meta.memo_no,
        meta.expense_method,
        meta.user_name,
        meta.user_email,
        log.user_email,
        meta.recipient_or_by,
        log.ip_address,
        meta.device_model,
        String(meta.amount ?? ''),
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(q);
    });
  }, [logs, search, actionFilter, entityFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const expenseActions = logs.filter((l) => l.metadata?.entity_type === 'expense').length;
    const depositActions = logs.filter((l) => l.metadata?.entity_type === 'deposit').length;
    const deletions = logs.filter((l) => l.metadata?.action?.includes('delete')).length;
    const uniqueUsers = new Set(logs.map((l) => l.user_email || l.metadata?.user_email).filter(Boolean)).size;

    return { total, expenseActions, depositActions, deletions, uniqueUsers };
  }, [logs]);

  return (
    <div className="space-y-4">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="rounded-2xl border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <History className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none">{stats.total}</p>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                {bn ? 'মোট অডিট রেকর্ড' : 'Total Logs'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none">{stats.expenseActions}</p>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                {bn ? 'খরচ সংক্রান্ত অ্যাকশন' : 'Expense Actions'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none">{stats.depositActions}</p>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                {bn ? 'জমা সংক্রান্ত অ্যাকশন' : 'Deposit Actions'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none">{stats.deletions}</p>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                {bn ? 'মুছে ফেলা এন্ট্রি' : 'Deletions'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none">{stats.uniqueUsers}</p>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                {bn ? 'অডিটর/ব্যবহারকারী' : 'Active Users'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Filter & Table Card */}
      <Card className="rounded-[32px] overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {bn ? 'হিসাব পরিবর্তন ও কার্যক্রমের অডিট হিস্ট্রি' : 'Accounts Activity & Change Audit'}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {bn
                  ? 'কে কোন খরচ বা জমা তৈরি করেছে, এডিট করেছে বা মুছে ফেলেছে তার সার্বক্ষণিক রেকর্ড।'
                  : 'Complete accountability log showing who created, modified or deleted financial records.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Entity Filter Pills */}
              <div className="inline-flex rounded-xl bg-muted/60 p-0.5 text-xs">
                <button
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${entityFilter === 'all' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
                  onClick={() => setEntityFilter('all')}
                >
                  {bn ? 'সব' : 'All'}
                </button>
                <button
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${entityFilter === 'expense' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
                  onClick={() => setEntityFilter('expense')}
                >
                  {bn ? 'খরচ' : 'Expense'}
                </button>
                <button
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${entityFilter === 'deposit' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
                  onClick={() => setEntityFilter('deposit')}
                >
                  {bn ? 'জমা' : 'Deposit'}
                </button>
              </div>

              {/* Action Filter Select */}
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="h-9 px-3 text-xs rounded-xl bg-background border border-input focus:outline-none"
              >
                <option value="all">{bn ? 'সকল কার্যক্রম' : 'All Actions'}</option>
                <option value="expense_create">{bn ? 'নতুন খরচ তৈরি' : 'Expense Created'}</option>
                <option value="expense_update">{bn ? 'খরচ সংশোধন/এডিট' : 'Expense Edited'}</option>
                <option value="expense_delete">{bn ? 'খরচ মুছে ফেলা' : 'Expense Deleted'}</option>
                <option value="expense_pay_due">{bn ? 'বকেয়া পরিশোধ' : 'Due Paid'}</option>
                <option value="deposit_create">{bn ? 'জমা তৈরি' : 'Deposit Created'}</option>
                <option value="deposit_update">{bn ? 'জমা এডিট' : 'Deposit Edited'}</option>
                <option value="deposit_delete">{bn ? 'জমা মুছে ফেলা' : 'Deposit Deleted'}</option>
              </select>

              {/* Search Box */}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={bn ? 'নাম, বিবরণ, মেমো বা আইপি…' : 'Search name, memo, IP…'}
                  className="pl-8 h-9 text-xs rounded-xl"
                />
              </div>

              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-9 gap-1"
                onClick={() => auditQuery.refetch()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {bn ? 'রিফ্রেশ' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-2 md:p-4">
          {auditQuery.isLoading ? (
            <div className="p-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin" /></div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-2">
              <History className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm font-medium">{bn ? 'কোনো অডিট রেকর্ড পাওয়া যায়নি' : 'No audit records found'}</p>
              <p className="text-xs text-muted-foreground">
                {bn ? 'হিসাব শাখায় কোনো খরচ বা জমা এন্ট্রি, এডিট বা ডিলিট হলে এখানে প্রদর্শিত হবে।' : 'Financial additions, edits or deletions will be logged here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{bn ? 'তারিখ ও সময়' : 'Date & Time'}</TableHead>
                    <TableHead>{bn ? 'কে পরিবর্তন করেছে' : 'Performed By'}</TableHead>
                    <TableHead>{bn ? 'কার্যক্রম (Action)' : 'Action'}</TableHead>
                    <TableHead>{bn ? 'বিবরণ ও বিষয়' : 'Entity & Details'}</TableHead>
                    <TableHead className="text-right">{bn ? 'পরিমাণ (টাকা)' : 'Amount'}</TableHead>
                    <TableHead>{bn ? 'ডিভাইস ও আইপি' : 'Device & IP'}</TableHead>
                    <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((entry) => {
                    const meta = entry.metadata || {};
                    const action = (meta.action || entry.reason || 'expense_create') as AccountsAuditAction;
                    const actionCfg = ACTION_CONFIG[action] || {
                      label_bn: action,
                      label_en: action,
                      badge_class: 'bg-muted text-muted-foreground',
                      icon_name: 'FileText',
                    };

                    const oldAmount = meta.old_data?.amount !== undefined ? Number(meta.old_data.amount) : null;
                    const newAmount = meta.new_data?.amount !== undefined ? Number(meta.new_data.amount) : (meta.amount ?? null);
                    const hasAmountDiff = oldAmount !== null && newAmount !== null && oldAmount !== newAmount;

                    return (
                      <TableRow key={entry.id} className="hover:bg-muted/20">
                        {/* Timestamp */}
                        <TableCell className="text-xs whitespace-nowrap">
                          <p className="font-semibold text-foreground">
                            {format(new Date(entry.created_at), 'dd/MM/yyyy')}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {format(new Date(entry.created_at), 'hh:mm:ss a')}
                          </p>
                          <p className="text-[10px] text-primary mt-0.5">
                            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                          </p>
                        </TableCell>

                        {/* Performed By (Who) */}
                        <TableCell>
                          <div className="flex items-start gap-1.5">
                            <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate max-w-[150px]">
                                {meta.user_name || 'Admin'}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                                {meta.user_email || entry.user_email || '—'}
                              </p>
                              {meta.user_role && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 mt-0.5 uppercase">
                                  {meta.user_role}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Action Badge */}
                        <TableCell>
                          <Badge variant="outline" className={`text-[11px] font-medium border px-2 py-0.5 rounded-lg ${actionCfg.badge_class}`}>
                            {bn ? actionCfg.label_bn : actionCfg.label_en}
                          </Badge>
                          {meta.month_year && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              মাস: {meta.month_year}
                            </p>
                          )}
                        </TableCell>

                        {/* Description & Entity */}
                        <TableCell>
                          <div className="min-w-0 max-w-[240px]">
                            <p className="text-xs font-medium text-foreground truncate" title={meta.title}>
                              {meta.title || '—'}
                            </p>
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              {meta.institution_name && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                  {meta.institution_name}
                                </Badge>
                              )}
                              {meta.category_name && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                  {meta.category_name}
                                </Badge>
                              )}
                              {meta.expense_method && (
                                <span className="text-[10px] text-muted-foreground">
                                  ({meta.expense_method})
                                </span>
                              )}
                            </div>
                            {meta.memo_no && (
                              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                মেমো: {meta.memo_no}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Amount & Diff */}
                        <TableCell className="text-right whitespace-nowrap">
                          {hasAmountDiff ? (
                            <div>
                              <p className="text-xs font-bold text-foreground">
                                ৳{(newAmount ?? 0).toLocaleString('bn-BD')}
                              </p>
                              <p className="text-[10px] text-muted-foreground line-through">
                                ৳{(oldAmount ?? 0).toLocaleString('bn-BD')}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs font-bold text-foreground">
                              {meta.amount !== undefined ? `৳${Number(meta.amount).toLocaleString('bn-BD')}` : '—'}
                            </p>
                          )}
                        </TableCell>

                        {/* Device & IP */}
                        <TableCell className="text-xs">
                          <p className="text-muted-foreground truncate max-w-[130px]">
                            {meta.device_model || 'PC'}
                          </p>
                          <code className="text-[10px] text-muted-foreground font-mono">
                            {entry.ip_address || '—'}
                          </code>
                        </TableCell>

                        {/* Detail Button */}
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-lg hover:bg-muted"
                            title={bn ? 'বিস্তারিত দেখুন' : 'View details'}
                            onClick={() => setSelectedEntry(entry)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Inspection Modal */}
      <Dialog open={!!selectedEntry} onOpenChange={(o) => !o && setSelectedEntry(null)}>
        <DialogContent className="rounded-[32px] max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              {bn ? 'অডিট লগের বিস্তারিত তথ্য' : 'Audit Log Details'}
            </DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              {/* Header Overview Card */}
              <div className="p-3 bg-muted/40 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{bn ? 'কার্যক্রম:' : 'Action:'}</span>
                  <Badge variant="outline" className="font-semibold">
                    {ACTION_CONFIG[selectedEntry.metadata?.action as AccountsAuditAction]?.label_bn || selectedEntry.reason}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{bn ? 'ব্যবহারকারী (Who):' : 'User:'}</span>
                  <span className="font-semibold">
                    {selectedEntry.metadata?.user_name || 'Admin'} ({selectedEntry.user_email || '—'})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{bn ? 'তারিখ ও সময়:' : 'Timestamp:'}</span>
                  <span>{format(new Date(selectedEntry.created_at), 'dd/MM/yyyy hh:mm:ss a')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{bn ? 'আইপি ও ডিভাইস:' : 'IP & Device:'}</span>
                  <span className="font-mono">{selectedEntry.ip_address || '—'} ({selectedEntry.metadata?.device_model || 'PC'})</span>
                </div>
              </div>

              {/* Old vs New Comparison (if edited) */}
              {(selectedEntry.metadata?.old_data || selectedEntry.metadata?.new_data) && (
                <div className="border border-border/60 rounded-2xl p-3 space-y-2">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    {bn ? 'পরিবর্তনের পূর্ব ও পরের তুলনামূলক তথ্য:' : 'Before & After Comparison:'}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-1">
                      <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">পূর্বের মান (Before):</p>
                      <pre className="text-[10px] overflow-auto max-h-36 font-mono text-muted-foreground">
                        {JSON.stringify(selectedEntry.metadata?.old_data, null, 2)}
                      </pre>
                    </div>

                    <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-1">
                      <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">নতুন মান (After):</p>
                      <pre className="text-[10px] overflow-auto max-h-36 font-mono text-muted-foreground">
                        {JSON.stringify(selectedEntry.metadata?.new_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Full Raw Metadata */}
              <div className="space-y-1">
                <p className="font-semibold text-muted-foreground">Full Audit Metadata:</p>
                <pre className="text-[11px] bg-muted/40 p-3 rounded-2xl overflow-auto max-h-40 font-mono">
                  {JSON.stringify(selectedEntry.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
