import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import { toast } from '@/hooks/use-toast';
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

const TARGET_PATH = '/admin/donors';

type ModuleRow = {
  id: string;
  menu_path: string;
  name: string | null;
  name_bn: string | null;
  visible_to_roles: string[] | null;
  is_enabled: boolean | null;
  updated_at: string | null;
};

type CanonicalResult = string[] | null;

type ResyncRow = {
  menu_path: string;
  old_roles: string[] | null;
  new_roles: string[] | null;
};

const arraysEqual = (a: string[] = [], b: string[] = []) => {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
};

const AdminDonorsRoleAudit = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { role } = useAuth();
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = isAdminRole(role);
  const qc = useQueryClient();
  const [resyncResult, setResyncResult] = useState<ResyncRow[] | null>(null);

  const moduleQuery = useQuery({
    queryKey: ['module-role-audit', TARGET_PATH],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_modules')
        .select('id, menu_path, name, name_bn, visible_to_roles, is_enabled, updated_at')
        .eq('menu_path', TARGET_PATH)
        .maybeSingle();
      if (error) throw error;
      return data as ModuleRow | null;
    },
  });

  const canonicalQuery = useQuery({
    queryKey: ['canonical-roles', TARGET_PATH],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('canonical_module_roles', {
        _menu_path: TARGET_PATH,
      });
      if (error) throw error;
      return (data as CanonicalResult) ?? [];
    },
  });

  const current = moduleQuery.data?.visible_to_roles ?? [];
  const canonical = canonicalQuery.data ?? [];
  const inSync = useMemo(
    () => arraysEqual(current, canonical),
    [current, canonical],
  );

  const resyncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('resync_canonical_module_roles');
      if (error) throw error;
      return (data ?? []) as ResyncRow[];
    },
    onSuccess: (rows) => {
      setResyncResult(rows);
      qc.invalidateQueries({ queryKey: ['module-role-audit'] });
      qc.invalidateQueries({ queryKey: ['system-modules-access'] });
      toast({
        title: bn ? 'রি-সিঙ্ক সম্পন্ন' : 'Re-sync complete',
        description: bn
          ? `${rows.length}টি মডিউল আপডেট হয়েছে`
          : `${rows.length} module(s) updated`,
      });
    },
    onError: (err: any) => {
      toast({
        title: bn ? 'রি-সিঙ্ক ব্যর্থ' : 'Re-sync failed',
        description: err?.message ?? String(err),
        variant: 'destructive',
      });
    },
  });

  const loading = moduleQuery.isLoading || canonicalQuery.isLoading;

  return (
    <AdminLayout>
      <div className="max-w-[1440px] mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {bn ? 'দাতা মডিউল রোল অডিট' : 'Donors Module Role Audit'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {bn
                ? '/admin/donors মেনুর জন্য বর্তমান এবং অনুমোদিত রোলসমূহ যাচাই করুন'
                : 'Inspect current vs. allowed roles for /admin/donors and re-sync in one click'}
            </p>
          </div>
        </div>

        {loading ? (
          <Card className="rounded-[45px]">
            <CardContent className="p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : !moduleQuery.data ? (
          <Card className="rounded-[45px] border-destructive/30">
            <CardContent className="p-8 text-center space-y-2">
              <AlertTriangle className="h-10 w-10 mx-auto text-destructive" />
              <p className="font-semibold">
                {bn ? 'মডিউল পাওয়া যায়নি' : 'Module not registered'}
              </p>
              <p className="text-sm text-muted-foreground">
                <code>{TARGET_PATH}</code>
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-[45px]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    {bn ? 'বর্তমান visible_to_roles' : 'Current visible_to_roles'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {current.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {bn ? 'কোনো রোল সেট নেই' : 'No roles set'}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {current.map((r) => (
                        <Badge key={r} variant="secondary" className="text-sm">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-4">
                    {bn ? 'সর্বশেষ আপডেট: ' : 'Last updated: '}
                    {moduleQuery.data.updated_at
                      ? new Date(moduleQuery.data.updated_at).toLocaleString()
                      : '—'}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-[45px]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    {bn ? 'অনুমোদিত (canonical) রোল' : 'Allowed (canonical) roles'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {canonical.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {bn
                        ? 'এই পথের জন্য কোনো canonical তালিকা সংজ্ঞায়িত নেই'
                        : 'No canonical list defined for this path'}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {canonical.map((r) => (
                        <Badge
                          key={r}
                          className="text-sm bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25"
                        >
                          {r}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card
              className={`rounded-[45px] border-2 ${
                inSync ? 'border-emerald-500/30' : 'border-amber-500/40'
              }`}
            >
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {inSync ? (
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                  )}
                  <div>
                    <p className="font-semibold">
                      {inSync
                        ? bn
                          ? 'সিঙ্ক অবস্থায় আছে'
                          : 'In sync'
                        : bn
                        ? 'সিঙ্ক প্রয়োজন'
                        : 'Out of sync'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {inSync
                        ? bn
                          ? 'বর্তমান রোলগুলি canonical তালিকার সাথে মিলছে।'
                          : 'Current roles match the canonical list.'
                        : bn
                        ? 'বর্তমান রোলগুলি canonical তালিকা থেকে আলাদা — রি-সিঙ্ক করুন।'
                        : 'Current roles differ from canonical — click re-sync to fix.'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => resyncMutation.mutate()}
                  disabled={!isSuperAdmin || resyncMutation.isPending}
                  className="min-w-[180px]"
                  title={
                    !isSuperAdmin
                      ? bn
                        ? 'শুধুমাত্র super_admin'
                        : 'Super admin only'
                      : undefined
                  }
                >
                  {resyncMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {bn ? 'এক ক্লিকে রি-সিঙ্ক' : 'Re-sync now'}
                </Button>
              </CardContent>
            </Card>

            {!isSuperAdmin && isAdmin && (
              <p className="text-xs text-muted-foreground text-center">
                {bn
                  ? 'রি-সিঙ্ক চালাতে super_admin প্রয়োজন।'
                  : 'Re-sync requires super_admin privileges.'}
              </p>
            )}

            {resyncResult && (
              <Card className="rounded-[45px]">
                <CardHeader>
                  <CardTitle className="text-base">
                    {bn ? 'রি-সিঙ্ক ফলাফল' : 'Re-sync result'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {resyncResult.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {bn
                        ? 'কোনো পরিবর্তন প্রয়োজন ছিল না — সব মডিউল ইতিমধ্যে সিঙ্কে আছে।'
                        : 'No changes were required — all modules already in sync.'}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {resyncResult.map((r) => (
                        <li
                          key={r.menu_path}
                          className="flex flex-col gap-1 p-3 rounded-2xl bg-muted/40"
                        >
                          <code className="text-sm font-semibold">{r.menu_path}</code>
                          <div className="text-xs text-muted-foreground">
                            <span className="line-through">
                              {(r.old_roles ?? []).join(', ') || '—'}
                            </span>
                            {' → '}
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {(r.new_roles ?? []).join(', ') || '—'}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDonorsRoleAudit;
