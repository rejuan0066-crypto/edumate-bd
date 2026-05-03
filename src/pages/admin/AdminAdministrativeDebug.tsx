import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, CheckCircle2, XCircle, Database, Eye, Code2 } from 'lucide-react';

type ProbeResult = {
  key: string;
  label: string;
  source: string;
  ok: boolean;
  count: number | null;
  error?: string | null;
  durationMs: number;
  sample: any[];
  query: string;
};

export default function AdminAdministrativeDebug() {
  const { language } = useLanguage();
  const { user, role } = useAuth();
  const bn = language === 'bn';
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [ranAt, setRanAt] = useState<Date | null>(null);

  const runProbe = async (
    key: string,
    label: string,
    source: string,
    query: string,
    fn: () => PromiseLike<{ data: any; error: any }>,
  ): Promise<ProbeResult> => {
    const t0 = performance.now();
    try {
      const { data, error } = await fn();
      const ms = Math.round(performance.now() - t0);
      const arr = Array.isArray(data) ? data : data ? [data] : [];
      return {
        key, label, source, query,
        ok: !error,
        count: arr.length,
        error: error?.message || null,
        durationMs: ms,
        sample: arr.slice(0, 3),
      };
    } catch (e: any) {
      return {
        key, label, source, query,
        ok: false, count: null,
        error: e?.message || String(e),
        durationMs: Math.round(performance.now() - t0),
        sample: [],
      };
    }
  };

  const runAll = async () => {
    setRunning(true);
    const out: ProbeResult[] = [];

    out.push(await runProbe(
      'admin_officers_active',
      bn ? 'প্রশাসনিক টেবিল (active)' : 'administrative_officers table (active)',
      'table: administrative_officers',
      `supabase.from('administrative_officers').select('id,name_bn,name_en,designation,officer_id,status,user_id,deleted_at').is('deleted_at', null).eq('status','active')`,
      () => supabase
        .from('administrative_officers' as any)
        .select('id,name_bn,name_en,designation,officer_id,status,user_id,deleted_at')
        .is('deleted_at', null)
        .eq('status', 'active'),
    ));

    out.push(await runProbe(
      'admin_officers_all',
      bn ? 'প্রশাসনিক টেবিল (সব)' : 'administrative_officers table (all)',
      'table: administrative_officers',
      `supabase.from('administrative_officers').select('id,name_bn,status,deleted_at')`,
      () => supabase
        .from('administrative_officers' as any)
        .select('id,name_bn,status,deleted_at'),
    ));

    out.push(await runProbe(
      'directory_admin',
      bn ? 'staff_directory ভিউ (administrative)' : 'staff_directory view (administrative)',
      'view: staff_directory',
      `supabase.from('staff_directory').select('*').eq('source','administrative').eq('status','active')`,
      () => supabase
        .from('staff_directory' as any)
        .select('*')
        .eq('source', 'administrative')
        .eq('status', 'active'),
    ));

    out.push(await runProbe(
      'directory_all',
      bn ? 'staff_directory ভিউ (all active)' : 'staff_directory view (all active)',
      'view: staff_directory',
      `supabase.from('staff_directory').select('source,id,name_bn').eq('status','active')`,
      () => supabase
        .from('staff_directory' as any)
        .select('source,id,name_bn,designation')
        .eq('status', 'active'),
    ));

    out.push(await runProbe(
      'rpc_list_directory',
      bn ? 'RPC list_staff_directory' : 'RPC list_staff_directory',
      'rpc: list_staff_directory',
      `supabase.rpc('list_staff_directory')`,
      () => supabase.rpc('list_staff_directory' as any),
    ));

    setResults(out);
    setRanAt(new Date());
    setRunning(false);
  };

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
          <Button onClick={runAll} disabled={running} className="rounded-full">
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {bn ? 'সব প্রোব চালান' : 'Run All Probes'}
          </Button>
        </div>

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

        {/* Diagnosis hint */}
        {results.length > 0 && (
          <Card className="rounded-[32px] backdrop-blur-xl bg-emerald-500/5 border-emerald-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{bn ? 'নির্ণয়' : 'Diagnosis'}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1.5">
              {(() => {
                const tableR = results.find(r => r.key === 'admin_officers_active');
                const dirR = results.find(r => r.key === 'directory_admin');
                const lines: string[] = [];
                if (tableR && !tableR.ok) lines.push(bn
                  ? `❌ administrative_officers টেবিল থেকে পড়া যাচ্ছে না: ${tableR.error}`
                  : `❌ Cannot read administrative_officers table: ${tableR.error}`);
                if (tableR && tableR.ok && tableR.count === 0) lines.push(bn
                  ? '⚠ active প্রশাসনিক কর্মকর্তা ০ — status="active" আছে কি না দেখুন।'
                  : '⚠ 0 active officers — check that rows have status="active".');
                if (dirR && !dirR.ok) lines.push(bn
                  ? `❌ staff_directory ভিউ থেকে administrative অংশ পড়া যাচ্ছে না: ${dirR.error}`
                  : `❌ Cannot read administrative slice from staff_directory: ${dirR.error}`);
                if (tableR?.ok && tableR.count! > 0 && dirR?.ok && dirR.count === 0) lines.push(bn
                  ? '⚠ টেবিলে ডেটা আছে কিন্তু ভিউতে আসছে না — ভিউ পুনরায় তৈরি দরকার হতে পারে।'
                  : '⚠ Data exists in table but not in view — view may need rebuild.');
                if (lines.length === 0) lines.push(bn
                  ? '✅ সব সোর্স ঠিক আছে — UI অংশ (useStaffDirectory) চেক করুন।'
                  : '✅ All sources OK — check UI hook (useStaffDirectory).');
                return lines.map((l, i) => <div key={i}>{l}</div>);
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
