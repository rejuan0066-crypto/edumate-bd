import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import { getDeviceId } from '@/hooks/useDeviceRegistration';
import AuditDeviceGate from '@/components/admin/AuditDeviceGate';
import { toast } from 'sonner';
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Lock,
} from 'lucide-react';

export type AccessLevel = 'view' | 'view-edit' | 'view-edit-delete' | 'none';

export type ModuleRoleAuditConfig = {
  /** Path stored in system_modules.menu_path, e.g. '/admin/verified-payments' */
  menuPath: string;
  /** Page title (English) */
  titleEn: string;
  /** Page title (Bengali) */
  titleBn: string;
  /** Subtitle / module-specific helper line */
  subtitleEn: string;
  subtitleBn: string;
  /**
   * Access level granted to each canonical role for this module.
   * Defaults: super_admin → view-edit-delete, admin → view-edit, others → view
   */
  roleAccess?: Record<string, AccessLevel>;
};

type ModuleRow = {
  id: string;
  menu_path: string;
  name: string | null;
  name_bn: string | null;
  visible_to_roles: string[] | null;
  is_enabled: boolean | null;
  updated_at: string | null;
};

type ResyncResponse = {
  status: 'success' | 'error';
  path_processed: string;
  changes_made: string[];
  old_roles: string[];
  new_roles: string[];
  changed: boolean;
  device_id: string | null;
  performed_by: string;
  timestamp: string;
};



const arraysEqual = (a: string[] = [], b: string[] = []) => {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
};

const defaultAccessFor = (role: string): AccessLevel => {
  if (role === 'super_admin') return 'view-edit-delete';
  if (role === 'admin') return 'view-edit';
  return 'view';
};

const accessLabel = (lvl: AccessLevel, bn: boolean) => {
  switch (lvl) {
    case 'view-edit-delete':
      return bn ? 'দেখা / সম্পাদনা / মুছে ফেলা' : 'View / Edit / Delete';
    case 'view-edit':
      return bn ? 'দেখা / সম্পাদনা' : 'View / Edit';
    case 'view':
      return bn ? 'শুধু দেখা' : 'View only';
    default:
      return bn ? 'কোনো এক্সেস নেই' : 'No access';
  }
};

export const ModuleRoleAuditView = ({ config }: { config: ModuleRoleAuditConfig }) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { role } = useAuth();
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = isAdminRole(role);
  const qc = useQueryClient();
  const [resultOpen, setResultOpen] = useState(false);
  const [resyncResult, setResyncResult] = useState<ResyncResponse | null>(null);

  const moduleQuery = useQuery({
    queryKey: ['module-role-audit', config.menuPath],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_modules')
        .select('id, menu_path, name, name_bn, visible_to_roles, is_enabled, updated_at')
        .eq('menu_path', config.menuPath)
        .maybeSingle();
      if (error) throw error;
      return data as ModuleRow | null;
    },
    enabled: isAdmin,
  });

  const canonicalQuery = useQuery({
    queryKey: ['canonical-roles', config.menuPath],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('canonical_module_roles', {
        _menu_path: config.menuPath,
      });
      if (error) throw error;
      return ((data as string[] | null) ?? []) as string[];
    },
    enabled: isAdmin,
  });

  const current = moduleQuery.data?.visible_to_roles ?? [];
  const canonical = canonicalQuery.data ?? [];
  const inSync = useMemo(() => arraysEqual(current, canonical), [current, canonical]);

  // Build the audit rows: union of current + canonical roles
  const auditRows = useMemo(() => {
    const all = Array.from(new Set([...(canonical ?? []), ...(current ?? [])]));
    return all.map((r) => {
      const inCanonical = canonical.includes(r);
      const inCurrent = current.includes(r);
      const synced = inCanonical && inCurrent;
      const access: AccessLevel =
        config.roleAccess?.[r] ?? defaultAccessFor(r);
      return { role: r, inCanonical, inCurrent, synced, access };
    });
  }, [canonical, current, config.roleAccess]);

  const resyncMutation = useMutation({
    mutationFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error(bn ? 'লগইন প্রয়োজন' : 'Sign-in required');

      const { data, error } = await supabase.functions.invoke('resync-module-roles', {
        body: { menu_path: config.menuPath },
        headers: { 'x-device-id': getDeviceId() },
      });
      if (error) throw error;
      const resp = data as ResyncResponse;
      if (resp?.status !== 'success') {
        throw new Error((resp as any)?.error || (bn ? 'রি-সিঙ্ক ব্যর্থ' : 'Re-sync failed'));
      }
      return resp;
    },
    onSuccess: (resp) => {
      setResyncResult(resp);
      setResultOpen(true);
      qc.invalidateQueries({ queryKey: ['module-role-audit', config.menuPath] });
      qc.invalidateQueries({ queryKey: ['system-modules-access'] });
      toast.success(
        resp.changed
          ? bn
            ? 'রি-সিঙ্ক সম্পন্ন হয়েছে'
            : 'Re-sync complete'
          : bn
            ? 'ইতিমধ্যে সিঙ্কে আছে'
            : 'Already in sync'
      );
    },
    onError: (err: any) => {
      toast.error(err?.message ?? (bn ? 'রি-সিঙ্ক ব্যর্থ' : 'Re-sync failed'));
    },
  });

  // Access-control gate: super_admin or admin only
  if (!isAdmin) {
    return (
      <Card className="rounded-[45px] border-destructive/30">
        <CardContent className="p-12 text-center space-y-3">
          <Lock className="h-12 w-12 mx-auto text-destructive" />
          <p className="font-semibold">
            {bn ? 'অ্যাক্সেস নিষিদ্ধ' : 'Access denied'}
          </p>
          <p className="text-sm text-muted-foreground">
            {bn
              ? 'এই অডিট পেজ শুধুমাত্র super_admin / admin দেখতে পারবেন।'
              : 'This audit page is restricted to super_admin / admin users.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const loading = moduleQuery.isLoading || canonicalQuery.isLoading;

  return (
    <AuditDeviceGate>
    <div className="max-w-[1440px] mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold truncate">
            {bn ? config.titleBn : config.titleEn}
          </h1>
          <p className="text-sm text-muted-foreground">
            {bn ? config.subtitleBn : config.subtitleEn}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <code className="font-mono">{config.menuPath}</code>
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
              {bn ? 'মডিউল রেজিস্টার করা নেই' : 'Module not registered'}
            </p>
            <p className="text-sm text-muted-foreground">
              <code>{config.menuPath}</code>
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Sync status + One-click re-sync */}
          <Card
            className={`rounded-[45px] border-2 ${
              inSync ? 'border-emerald-500/30' : 'border-amber-500/40'
            }`}
          >
            <CardContent className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {inSync ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-amber-500 shrink-0" />
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
                size="lg"
                onClick={() => resyncMutation.mutate()}
                disabled={!isAdmin || resyncMutation.isPending}
                className="min-w-[200px] w-full md:w-auto"
                title={
                  !isAdmin
                    ? bn
                      ? 'শুধুমাত্র admin'
                      : 'Admin only'
                    : undefined
                }
              >
                {resyncMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {bn ? 'এক ক্লিকে রি-সিঙ্ক' : 'One-Click Re-sync'}
              </Button>
            </CardContent>
          </Card>

          {/* Quick role chips */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="rounded-[45px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  {bn ? 'বর্তমান রোল (DB)' : 'Current roles (DB)'}
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
                      ? 'এই পথের জন্য canonical তালিকা সংজ্ঞায়িত নেই'
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

          {/* Audit table */}
          <Card className="rounded-[45px]">
            <CardHeader>
              <CardTitle className="text-base">
                {bn ? 'রোল পারমিশন অডিট' : 'Role permission audit'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{bn ? 'রোল' : 'Role Name'}</TableHead>
                      <TableHead>{bn ? 'এক্সেস লেভেল' : 'Access Level'}</TableHead>
                      <TableHead>{bn ? 'সিঙ্ক স্ট্যাটাস' : 'Sync Status'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          {bn ? 'কোনো রোল ডেটা নেই' : 'No role data'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditRows.map((row) => (
                        <TableRow key={row.role} className="bg-muted/20">
                          <TableCell className="font-semibold">{row.role}</TableCell>
                          <TableCell>{accessLabel(row.access, bn)}</TableCell>
                          <TableCell>
                            {row.synced ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                                <CheckCircle2 className="h-4 w-4" />
                                {bn ? 'সিঙ্কে' : 'In sync'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-destructive font-medium text-sm">
                                <XCircle className="h-4 w-4" />
                                {row.inCurrent
                                  ? bn ? 'অতিরিক্ত' : 'Extra'
                                  : bn ? 'অনুপস্থিত' : 'Missing'}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {auditRows.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground p-4">
                    {bn ? 'কোনো রোল ডেটা নেই' : 'No role data'}
                  </p>
                ) : (
                  auditRows.map((row) => (
                    <div
                      key={row.role}
                      className="rounded-2xl bg-muted/30 p-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{row.role}</p>
                        <p className="text-xs text-muted-foreground">
                          {accessLabel(row.access, bn)}
                        </p>
                      </div>
                      {row.synced ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* JSON Summary modal */}
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="max-w-2xl rounded-[38px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              {bn ? 'রি-সিঙ্ক সারাংশ' : 'Re-sync Summary'}
            </DialogTitle>
            <DialogDescription>
              {bn
                ? 'নিচে JSON ফরম্যাটে সকল পরিবর্তনের বিবরণ দেওয়া হলো।'
                : 'Detailed JSON report of all changes performed.'}
            </DialogDescription>
          </DialogHeader>

          {resyncResult && (
            <div className="space-y-3">
              {resyncResult.changes_made.length > 0 && (
                <div className="rounded-2xl bg-muted/40 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                    {bn ? 'পরিবর্তনসমূহ' : 'Changes Made'}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {resyncResult.changes_made.map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-2xl bg-background border p-3 max-h-[300px] overflow-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(resyncResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModuleRoleAuditView;
