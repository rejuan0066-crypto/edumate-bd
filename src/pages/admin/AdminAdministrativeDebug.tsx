import { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, CheckCircle2, XCircle, Database, Eye, Code2, ShieldAlert, AlertTriangle, Lightbulb, Timer, Activity, Fingerprint, Copy } from 'lucide-react';
import { newCorrelationId, logAdminNameRequest } from '@/lib/adminNameRequestLog';
import { toast } from 'sonner';

type ProbeResult = {
  key: string;
  label: string;
  source: string;
  ok: boolean;
  count: number | null;
  error?: string | null;
  errorCode?: string | null;
  durationMs: number;
  sample: any[];
  query: string;
  correlationId: string;
};

export default function AdminAdministrativeDebug() {
  const { language } = useLanguage();
  const { user, role } = useAuth();
  const bn = language === 'bn';
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [ranAt, setRanAt] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [intervalSec, setIntervalSec] = useState<number>(15);
  const [runCount, setRunCount] = useState(0);
  const [nextInSec, setNextInSec] = useState<number>(0);
  const runAllRef = useRef<(() => Promise<void>) | null>(null);

  // Filters that change which probes run + what they query
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'pending' | 'any'>('active');
  const [deletedFilter, setDeletedFilter] = useState<'not_deleted' | 'deleted_only' | 'any'>('not_deleted');
  const [roleProbe, setRoleProbe] = useState<'admin' | 'super_admin' | 'staff' | 'teacher'>('admin');

  // Parent batch correlation prefix; each probe gets its own child correlation ID
  const [batchId, setBatchId] = useState<string | null>(null);

  const runProbe = async (
    key: string,
    label: string,
    source: string,
    query: string,
    fn: () => PromiseLike<{ data: any; error: any }>,
    parentBatch?: string,
  ): Promise<ProbeResult> => {
    const correlationId = `${parentBatch ?? 'anr'}::${key}`;
    const t0 = performance.now();
    let data: any = null;
    let error: any = null;
    try {
      const r = await fn();
      data = r.data;
      error = r.error;
    } catch (e: any) {
      error = e;
    }
    const ms = Math.round(performance.now() - t0);
    const arr = Array.isArray(data) ? data : data ? [data] : [];
    // Persist diagnostic log row (best-effort, never blocks UI)
    logAdminNameRequest({
      correlationId,
      sourcePath: `AdminAdministrativeDebug:${key}`,
      sqlPath: source,
      filters: { query, statusFilter, deletedFilter, roleProbe },
      resultCount: arr.length,
      errorCode: error?.code ?? (error ? 'unknown' : null),
      errorMessage: error?.message ?? null,
      durationMs: ms,
    });
    return {
      key, label, source, query,
      ok: !error,
      count: error ? null : arr.length,
      error: error?.message || null,
      errorCode: error?.code || null,
      durationMs: ms,
      sample: arr.slice(0, 3),
      correlationId,
    };
  };

  const runAll = async () => {
    setRunning(true);
    const out: ProbeResult[] = [];

    // Helper to apply current filters to a query builder
    const applyFilters = (q: any) => {
      if (statusFilter !== 'any') q = q.eq('status', statusFilter);
      if (deletedFilter === 'not_deleted') q = q.is('deleted_at', null);
      else if (deletedFilter === 'deleted_only') q = q.not('deleted_at', 'is', null);
      return q;
    };
    const filterDesc =
      `status=${statusFilter} • deleted=${deletedFilter}`;

    out.push(await runProbe(
      'admin_officers_filtered',
      bn ? `প্রশাসনিক টেবিল (${filterDesc})` : `administrative_officers table (${filterDesc})`,
      'table: administrative_officers',
      `from('administrative_officers').select(...).${statusFilter === 'any' ? '' : `eq('status','${statusFilter}').`}${deletedFilter === 'not_deleted' ? "is('deleted_at',null)" : deletedFilter === 'deleted_only' ? "not('deleted_at','is',null)" : '/* any deleted */'}`,
      () => applyFilters(
        supabase.from('administrative_officers' as any)
          .select('id,name_bn,name_en,designation,officer_id,status,user_id,deleted_at')
      ),
    ));

    out.push(await runProbe(
      'admin_officers_all',
      bn ? 'প্রশাসনিক টেবিল (কোনো ফিল্টার ছাড়া)' : 'administrative_officers table (no filters)',
      'table: administrative_officers',
      `from('administrative_officers').select('id,name_bn,status,deleted_at')`,
      () => supabase.from('administrative_officers' as any)
        .select('id,name_bn,status,deleted_at'),
    ));

    out.push(await runProbe(
      'admin_officers_active_only',
      bn ? "শুধু status='active' (deleted ignore)" : "Only status='active' (deleted ignored)",
      'table: administrative_officers',
      `from('administrative_officers').eq('status','active')`,
      () => supabase.from('administrative_officers' as any)
        .select('id,name_bn,status,deleted_at').eq('status', 'active'),
    ));

    out.push(await runProbe(
      'admin_officers_deleted_only',
      bn ? 'শুধু soft-deleted রেকর্ড' : 'Only soft-deleted records',
      'table: administrative_officers',
      `from('administrative_officers').not('deleted_at','is',null)`,
      () => supabase.from('administrative_officers' as any)
        .select('id,name_bn,status,deleted_at').not('deleted_at', 'is', null),
    ));

    out.push(await runProbe(
      'directory_admin',
      bn ? `staff_directory ভিউ (administrative, ${filterDesc})` : `staff_directory view (administrative, ${filterDesc})`,
      'view: staff_directory',
      `from('staff_directory').eq('source','administrative').${statusFilter === 'any' ? '' : `eq('status','${statusFilter}')`}`,
      () => {
        let q = supabase.from('staff_directory' as any).select('*').eq('source', 'administrative');
        if (statusFilter !== 'any') q = q.eq('status', statusFilter);
        return q;
      },
    ));

    out.push(await runProbe(
      'directory_all',
      bn ? `staff_directory ভিউ (সব sources, ${filterDesc})` : `staff_directory view (all sources, ${filterDesc})`,
      'view: staff_directory',
      `from('staff_directory').select('source,id,name_bn,designation,status')`,
      () => {
        let q = supabase.from('staff_directory' as any).select('source,id,name_bn,designation,status');
        if (statusFilter !== 'any') q = q.eq('status', statusFilter);
        return q;
      },
    ));

    out.push(await runProbe(
      'rpc_list_directory',
      bn ? 'RPC list_staff_directory' : 'RPC list_staff_directory',
      'rpc: list_staff_directory',
      `supabase.rpc('list_staff_directory')`,
      () => supabase.rpc('list_staff_directory' as any),
    ));

    // Role-based access probes — check the *current logged-in user*'s effective role
    out.push(await runProbe(
      'has_role_check',
      bn ? `has_role(auth.uid(), '${roleProbe}')` : `has_role(auth.uid(), '${roleProbe}')`,
      `rpc: has_role`,
      `supabase.rpc('has_role', { _user_id: '${user?.id || 'null'}', _role: '${roleProbe}' })`,
      () => supabase.rpc('has_role' as any, { _user_id: user?.id, _role: roleProbe }),
    ));

    // Probe the resolved role: how many rows can THIS user see vs an unfiltered count
    out.push(await runProbe(
      'visibility_compare',
      bn ? 'দৃশ্যমানতা তুলনা (current user vs no filter)' : 'Visibility compare (current user vs unfiltered)',
      'table: administrative_officers',
      `Counts rows visible under RLS for the logged-in user`,
      async () => {
        const { count, error } = await supabase
          .from('administrative_officers' as any)
          .select('id', { count: 'exact', head: true });
        return { data: count != null ? Array.from({ length: Math.min(count, 50) }).map((_, i) => ({ row: i + 1 })) : [], error };
      },
    ));

    setResults(out);
    setRanAt(new Date());
    setRunCount((n) => n + 1);
    setRunning(false);
  };

  // Keep ref in sync so the auto-refresh interval always calls the latest runAll
  runAllRef.current = runAll;

  // Auto-refresh: re-run probes every intervalSec seconds
  useEffect(() => {
    if (!autoRefresh) {
      setNextInSec(0);
      return;
    }
    setNextInSec(intervalSec);
    const tick = setInterval(() => {
      setNextInSec((s) => {
        if (s <= 1) {
          // Fire next run (skip if a run is still in progress)
          if (!running) runAllRef.current?.();
          return intervalSec;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [autoRefresh, intervalSec, running]);

  const adminOnly = role === 'admin' || role === 'super_admin';

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Database className="w-6 h-6 text-emerald-600" />
              {bn ? 'প্রশাসনিক ডেটা ডিবাগ' : 'Administrative Data Debug'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn
                ? 'প্রতিটি ডেটা সোর্স থেকে প্রশাসনিক নাম লোড হচ্ছে কি না, কী এরর আসছে — তা যাচাই করুন।'
                : 'Probes each data source to confirm administrative names load correctly and surface any errors / RLS blocks.'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Auto-refresh toggle */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl border backdrop-blur transition-colors ${autoRefresh ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-border/40 bg-card/60'}`}>
              <Activity className={`w-4 h-4 ${autoRefresh ? 'text-emerald-600 animate-pulse' : 'text-muted-foreground'}`} />
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-semibold">{bn ? 'অটো-রিফ্রেশ' : 'Auto-refresh'}</span>
                {autoRefresh && (
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {bn ? `পরবর্তী রান: ${nextInSec}সে` : `Next run in ${nextInSec}s`}
                    {runCount > 0 && <span className="ml-1.5 opacity-70">• {bn ? `রান: ${runCount}` : `runs: ${runCount}`}</span>}
                  </span>
                )}
              </div>
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              <Select value={String(intervalSec)} onValueChange={(v) => setIntervalSec(Number(v))}>
                <SelectTrigger className="h-8 w-[88px] text-xs rounded-xl">
                  <Timer className="w-3 h-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 30, 60, 120].map((s) => (
                    <SelectItem key={s} value={String(s)} className="text-xs">{s}s</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runAll} disabled={running} className="rounded-full">
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              {bn ? 'সব প্রোব চালান' : 'Run All Probes'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="rounded-[32px] backdrop-blur-xl bg-card/60 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              {bn ? 'প্রোব ফিল্টার' : 'Probe Filters'}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              {bn
                ? 'এই ফিল্টারগুলো administrative_officers ও staff_directory প্রোবে প্রয়োগ হবে — UI কী দেখবে তা অনুকরণ করতে।'
                : 'These filters are applied to administrative_officers + staff_directory probes to mirror what the UI should see.'}
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                {bn ? 'স্ট্যাটাস' : 'Status'}
              </label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="inactive">inactive</SelectItem>
                  <SelectItem value="pending">pending</SelectItem>
                  <SelectItem value="any">{bn ? 'যেকোনো' : 'any'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                deleted_at
              </label>
              <Select value={deletedFilter} onValueChange={(v) => setDeletedFilter(v as any)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_deleted">{bn ? 'মুছে ফেলা হয়নি (NULL)' : 'Not deleted (NULL)'}</SelectItem>
                  <SelectItem value="deleted_only">{bn ? 'শুধু soft-deleted' : 'Soft-deleted only'}</SelectItem>
                  <SelectItem value="any">{bn ? 'যেকোনো' : 'any'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                {bn ? 'role যাচাই' : 'Role to test'}
              </label>
              <Select value={roleProbe} onValueChange={(v) => setRoleProbe(v as any)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="super_admin">super_admin</SelectItem>
                  <SelectItem value="staff">staff</SelectItem>
                  <SelectItem value="teacher">teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Session info */}
        <Card className="rounded-[32px] backdrop-blur-xl bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" /> {bn ? 'বর্তমান সেশন' : 'Current Session'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div><span className="text-muted-foreground">User ID:</span> <code className="ml-1">{user?.id || '—'}</code></div>
            <div><span className="text-muted-foreground">Email:</span> <code className="ml-1">{user?.email || '—'}</code></div>
            <div>
              <span className="text-muted-foreground">Role:</span>{' '}
              <Badge variant={adminOnly ? 'default' : 'destructive'} className="ml-1">{role || 'none'}</Badge>
              {!adminOnly && (
                <span className="ml-2 text-amber-600">
                  {bn ? '⚠ admin/super_admin না হলে RLS অনেক row লুকাতে পারে' : '⚠ Without admin/super_admin, RLS may hide most rows'}
                </span>
              )}
            </div>
            {ranAt && (
              <div>
                <span className="text-muted-foreground">{bn ? 'শেষ চেক' : 'Last run'}:</span>{' '}
                <code>{ranAt.toLocaleString()}</code>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {results.length === 0 && !running && (
          <Card className="rounded-[32px] backdrop-blur-xl bg-card/60">
            <CardContent className="p-12 text-center text-muted-foreground">
              {bn ? '"সব প্রোব চালান" বাটনে ক্লিক করুন।' : 'Click "Run All Probes" to begin.'}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {results.map((r) => (
            <Card key={r.key} className={`rounded-[32px] border-2 ${r.ok ? 'border-emerald-500/30' : 'border-red-500/40'} backdrop-blur-xl bg-card/60`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {r.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                    {r.label}
                  </span>
                  <Badge variant="outline" className="text-[10px]">{r.durationMs} ms</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{r.source}</Badge>
                  <Badge className={r.ok ? 'bg-emerald-500/15 text-emerald-700' : 'bg-red-500/15 text-red-700'} variant="outline">
                    {r.ok ? (bn ? `সফল • ${r.count} সারি` : `OK • ${r.count} rows`) : (bn ? 'ব্যর্থ' : 'FAILED')}
                  </Badge>
                </div>

                <div>
                  <div className="text-muted-foreground mb-1 flex items-center gap-1">
                    <Code2 className="w-3 h-3" /> {bn ? 'কুয়েরি' : 'Query'}
                  </div>
                  <pre className="bg-muted/40 rounded-lg p-2 overflow-x-auto text-[10px] leading-relaxed">{r.query}</pre>
                </div>

                {r.error && (
                  <div>
                    <div className="text-red-600 font-medium mb-1">{bn ? 'এরর' : 'Error'}</div>
                    <pre className="bg-red-500/10 text-red-700 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">{r.error}</pre>
                  </div>
                )}

                {r.sample.length > 0 && (
                  <div>
                    <div className="text-muted-foreground mb-1">{bn ? 'নমুনা (প্রথম ৩টি)' : 'Sample (first 3)'}</div>
                    <pre className="bg-muted/40 rounded-lg p-2 overflow-x-auto text-[10px] leading-relaxed max-h-48">
{JSON.stringify(r.sample, null, 2)}
                    </pre>
                  </div>
                )}

                {r.ok && r.count === 0 && !r.error && (
                  <div className="text-amber-700 bg-amber-500/10 rounded-lg p-2">
                    {bn
                      ? 'কোনো এরর নেই কিন্তু ০ সারি — সম্ভবত RLS/ফিল্টার বা ডেটা নেই।'
                      : 'No error but 0 rows — likely RLS, filter mismatch, or empty data.'}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Smart diagnosis */}
        {results.length > 0 && (() => {
          type Sev = 'critical' | 'warn' | 'info' | 'ok';
          type Finding = {
            sev: Sev;
            title: string;
            detail: string;
            target?: string;       // table / view / policy / RPC name to inspect
            policyHint?: string;   // suggested RLS policy / SQL hint
          };

          const findings: Finding[] = [];
          const r = (k: string) => results.find(x => x.key === k);
          const tableActive = r('admin_officers_filtered');
          const tableAll = r('admin_officers_all');
          const dirAdmin = r('directory_admin');
          const dirAll = r('directory_all');
          const rpcDir = r('rpc_list_directory');

          const isRlsErr = (e?: string | null) =>
            !!e && /row[- ]level security|permission denied|rls|policy/i.test(e);
          const is401or403 = (e?: string | null) =>
            !!e && /\b(401|403|JWT|not authenticated|unauthorized|forbidden)\b/i.test(e);
          const isMissingRel = (e?: string | null) =>
            !!e && /(does not exist|not found|relation .* does not exist|undefined function)/i.test(e);

          // 1) Auth / role-level blocks
          if (!user) {
            findings.push({
              sev: 'critical',
              title: bn ? 'লগইন নেই — RLS সব row লুকাবে' : 'Not logged in — RLS will hide all rows',
              detail: bn
                ? 'প্রায় সব টেবিলে authenticated role প্রয়োজন। প্রথমে লগইন করুন।'
                : 'Most tables require an authenticated role. Sign in first, then re-run probes.',
            });
          } else if (!adminOnly) {
            findings.push({
              sev: 'warn',
              title: bn ? 'admin/super_admin role নয়' : 'Not admin / super_admin',
              detail: bn
                ? 'has_role(auth.uid(),\'admin\') এর উপর নির্ভরশীল RLS পলিসিগুলো ০ row দেবে।'
                : 'Any RLS policy gated on has_role(auth.uid(),\'admin\') will return 0 rows for this user.',
              target: 'public.administrative_officers',
              policyHint:
                "USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'))",
            });
          }

          // 2) administrative_officers table-level diagnosis
          if (tableActive && !tableActive.ok) {
            if (isRlsErr(tableActive.error) || is401or403(tableActive.error)) {
              findings.push({
                sev: 'critical',
                title: bn
                  ? 'administrative_officers — RLS দ্বারা ব্লকড'
                  : 'administrative_officers — blocked by RLS',
                detail: tableActive.error || '',
                target: 'public.administrative_officers',
                policyHint:
                  "CREATE POLICY \"admins read officers\" ON public.administrative_officers FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));",
              });
            } else if (isMissingRel(tableActive.error)) {
              findings.push({
                sev: 'critical',
                title: bn ? 'টেবিল পাওয়া যায়নি' : 'Table not found',
                detail: tableActive.error || '',
                target: 'public.administrative_officers',
              });
            } else {
              findings.push({
                sev: 'critical',
                title: bn ? 'administrative_officers পড়া ব্যর্থ' : 'Failed to read administrative_officers',
                detail: tableActive.error || '',
                target: 'public.administrative_officers',
              });
            }
          } else if (tableActive?.ok) {
            // RLS-shadow check: zero active rows but rows exist when removing the status filter?
            const allCount = tableAll?.count ?? 0;
            if (tableActive.count === 0 && allCount === 0) {
              findings.push({
                sev: 'warn',
                title: bn ? 'কোনো প্রশাসনিক কর্মকর্তা নেই' : 'No administrative officers exist',
                detail: bn
                  ? '/admin/administrative থেকে কর্মকর্তা যোগ করুন।'
                  : 'Add officers from /admin/administrative.',
                target: 'public.administrative_officers',
              });
            } else if (tableActive.count === 0 && allCount > 0) {
              findings.push({
                sev: 'warn',
                title: bn ? 'সব row আছে কিন্তু status="active" নেই' : 'Rows exist but none have status="active"',
                detail: bn
                  ? 'অথবা সবগুলোতে deleted_at সেট করা — সেগুলো active হিসেবে চিহ্নিত করুন।'
                  : 'Either status is not "active" or deleted_at is set — mark them active to appear.',
                target: 'public.administrative_officers (status, deleted_at)',
              });
            }
          }

          // 3) staff_directory view-level diagnosis
          if (dirAdmin && !dirAdmin.ok) {
            if (isRlsErr(dirAdmin.error) || is401or403(dirAdmin.error)) {
              findings.push({
                sev: 'critical',
                title: bn
                  ? 'staff_directory ভিউ — RLS দ্বারা ব্লকড'
                  : 'staff_directory view — blocked by RLS',
                detail: dirAdmin.error || '',
                target: 'public.staff_directory (view)',
                policyHint:
                  "Views with security_invoker=on inherit base-table RLS. Add a SELECT policy on the underlying tables (administrative_officers + staff) for the same role.",
              });
            } else if (isMissingRel(dirAdmin.error)) {
              findings.push({
                sev: 'critical',
                title: bn ? 'staff_directory ভিউ নেই' : 'staff_directory view does not exist',
                detail: dirAdmin.error || '',
                target: 'public.staff_directory',
                policyHint:
                  'Re-create the view: CREATE VIEW public.staff_directory WITH (security_invoker=on) AS SELECT ... FROM staff UNION ALL SELECT ... FROM administrative_officers;',
              });
            } else {
              findings.push({
                sev: 'critical',
                title: bn ? 'staff_directory পড়া ব্যর্থ' : 'Failed to read staff_directory',
                detail: dirAdmin.error || '',
                target: 'public.staff_directory',
              });
            }
          } else if (dirAdmin?.ok && tableActive?.ok) {
            // Cross-source consistency: table has rows but view doesn't → view is filtering/joining wrong
            if ((tableActive.count ?? 0) > 0 && (dirAdmin.count ?? 0) === 0) {
              findings.push({
                sev: 'critical',
                title: bn
                  ? 'টেবিলে আছে, ভিউতে নেই — staff_directory ভাঙা/RLS-শ্যাডোড'
                  : 'In table but missing from view — staff_directory broken or RLS-shadowed',
                detail: bn
                  ? 'ভিউয়ের UNION ALL শাখায় administrative_officers ঠিকমতো জয়েন হচ্ছে কিনা চেক করুন; অথবা ভিউয়ের base-table-এ admin role-এর জন্য SELECT policy নেই।'
                  : 'Either the UNION ALL branch for administrative_officers is filtered out, or the underlying RLS on administrative_officers blocks SELECT from the view.',
                target: 'public.staff_directory + public.administrative_officers',
                policyHint:
                  "Check: SELECT * FROM pg_policies WHERE tablename='administrative_officers'; — and the view definition's WHERE clause.",
              });
            } else if ((dirAll?.count ?? 0) > 0 && (dirAdmin.count ?? 0) === 0 && (tableActive.count ?? 0) > 0) {
              findings.push({
                sev: 'warn',
                title: bn
                  ? "ভিউতে source='administrative' সারি নেই"
                  : "View returns no rows where source='administrative'",
                detail: bn
                  ? "ভিউয়ের administrative শাখায় source কলামটি 'administrative' হিসেবে সেট হচ্ছে কিনা যাচাই করুন।"
                  : "Verify the view's administrative branch sets source='administrative' literal.",
                target: 'public.staff_directory (source column)',
              });
            }
          }

          // 4) RPC fallback diagnosis
          if (rpcDir && !rpcDir.ok) {
            if (isRlsErr(rpcDir.error) || is401or403(rpcDir.error)) {
              findings.push({
                sev: 'warn',
                title: bn ? 'list_staff_directory RPC — অনুমতি নেই' : 'list_staff_directory RPC — permission denied',
                detail: rpcDir.error || '',
                target: 'public.list_staff_directory()',
                policyHint:
                  'GRANT EXECUTE ON FUNCTION public.list_staff_directory() TO authenticated; — or mark the function SECURITY DEFINER with a hardened search_path.',
              });
            } else if (isMissingRel(rpcDir.error)) {
              findings.push({
                sev: 'warn',
                title: bn ? 'RPC নেই' : 'RPC does not exist',
                detail: rpcDir.error || '',
                target: 'public.list_staff_directory()',
              });
            }
          }

          // 5) All-good case
          if (findings.length === 0) {
            findings.push({
              sev: 'ok',
              title: bn ? 'সব ব্যাকএন্ড সোর্স ঠিক আছে' : 'All backend sources are healthy',
              detail: bn
                ? 'সমস্যা সম্ভবত ফ্রন্টএন্ড: useStaffDirectory হুকের ফিল্টার ({ source:"all", status:"active" }), React Query cache, অথবা SalaryWorkflowSettings-এ usedDirIds লজিক চেক করুন।'
                : 'Issue is likely client-side: inspect the useStaffDirectory hook filters ({ source:"all", status:"active" }), React Query cache, or the usedDirIds filter inside SalaryWorkflowSettings.',
              target: 'src/hooks/useStaffDirectory.ts + SalaryWorkflowSettings.tsx',
            });
          }

          const sevMeta: Record<Sev, { color: string; bg: string; border: string; label: string; Icon: any }> = {
            critical: { color: 'text-red-700 dark:text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/40',     label: bn ? 'গুরুতর' : 'Critical', Icon: ShieldAlert },
            warn:     { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10',   border: 'border-amber-500/40',   label: bn ? 'সতর্কতা' : 'Warning',  Icon: AlertTriangle },
            info:     { color: 'text-blue-700 dark:text-blue-400',   bg: 'bg-blue-500/10',    border: 'border-blue-500/40',    label: 'Info',                       Icon: Lightbulb },
            ok:       { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', label: 'OK',                  Icon: CheckCircle2 },
          };

          return (
            <Card className="rounded-[32px] backdrop-blur-xl bg-card/60 border-emerald-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  {bn ? 'স্মার্ট নির্ণয়' : 'Smart Diagnosis'}
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  {bn
                    ? 'প্রতিটি পর্যবেক্ষণে কোন টেবিল/ভিউ/RLS পলিসি যাচাই করতে হবে তা নির্দেশিত আছে।'
                    : 'Each finding pinpoints which table, view, or RLS policy to inspect.'}
                </p>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {findings.map((f, i) => {
                  const m = sevMeta[f.sev];
                  const Icon = m.Icon;
                  return (
                    <div key={i} className={`rounded-2xl border ${m.border} ${m.bg} p-3 space-y-1.5`}>
                      <div className={`flex items-center gap-2 text-sm font-semibold ${m.color}`}>
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{f.title}</span>
                        <Badge variant="outline" className={`text-[10px] ${m.color} border-current/40`}>{m.label}</Badge>
                      </div>
                      {f.detail && (
                        <div className="text-xs text-foreground/80 whitespace-pre-wrap break-words">{f.detail}</div>
                      )}
                      {f.target && (
                        <div className="text-[11px] flex flex-wrap items-center gap-1.5">
                          <span className="text-muted-foreground">{bn ? 'যাচাই করুন:' : 'Inspect:'}</span>
                          <code className="px-1.5 py-0.5 rounded-md bg-background/70 border border-border/40">{f.target}</code>
                        </div>
                      )}
                      {f.policyHint && (
                        <div className="space-y-1">
                          <div className="text-[11px] text-muted-foreground">{bn ? 'প্রস্তাবিত SQL/পলিসি:' : 'Suggested SQL / policy:'}</div>
                          <pre className="bg-background/70 border border-border/40 rounded-lg p-2 overflow-x-auto text-[10px] leading-relaxed whitespace-pre-wrap">{f.policyHint}</pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </AdminLayout>
  );
}
