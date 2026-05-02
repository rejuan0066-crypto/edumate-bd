import { useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { AuditDeviceGate } from '@/components/admin/AuditDeviceGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
  ShieldX, Search, Loader2, Lock, Ban, CheckCircle2, MapPin, Copy,
  RefreshCcw, ListChecks, History, Unlock,
} from 'lucide-react';
import { format } from 'date-fns';
import { DEFAULT_MENU_CONFIG, MenuItemConfig } from '@/hooks/useMenuSettings';
import { ScrollArea } from '@/components/ui/scroll-area';

type Row = {
  device_id: string;
  user_id: string | null;
  reason: string;
  alert_type: string;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  upazila: string | null;
  village: string | null;
  attempt_count: number;
  last_attempt_at: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  blocked_at: string | null;
  user_agent: string | null;
};

// Curated quick-pick routes shown at the top of the picker
const QUICK_ROUTES: { path: string; label_bn: string; label_en: string }[] = [
  { path: '/admin/receipts', label_bn: 'ফি রসিদ', label_en: 'Receipts' },
  { path: '/admin/verified-payments', label_bn: 'ভেরিফাইড পেমেন্ট', label_en: 'Verified Payments' },
  { path: '/admin/complaints', label_bn: 'অভিযোগ', label_en: 'Complaints' },
  { path: '/admin/fee-receipts', label_bn: 'ফি রসিদ লিস্ট', label_en: 'Fee Receipts List' },
  { path: '/admin/payments', label_bn: 'পেমেন্ট', label_en: 'Payments' },
  { path: '/admin/donors', label_bn: 'ডোনার', label_en: 'Donors' },
  { path: '/admin/audit-device-allowlist', label_bn: 'অডিট ডিভাইস', label_en: 'Audit Devices' },
];

// Flatten the full admin sidebar into a searchable route list grouped by parent
type RouteOption = { path: string; label_bn: string; label_en: string; group_bn: string; group_en: string };
const ALL_ADMIN_ROUTES: RouteOption[] = (() => {
  const out: RouteOption[] = [];
  const seen = new Set<string>();
  const push = (r: RouteOption) => {
    if (!r.path?.startsWith('/admin')) return;
    if (seen.has(r.path)) return;
    seen.add(r.path);
    out.push(r);
  };
  for (const top of DEFAULT_MENU_CONFIG.sidebar as MenuItemConfig[]) {
    push({ path: top.path, label_bn: top.label_bn, label_en: top.label_en, group_bn: top.label_bn, group_en: top.label_en });
    for (const child of top.children ?? []) {
      push({ path: child.path, label_bn: child.label_bn, label_en: child.label_en, group_bn: top.label_bn, group_en: top.label_en });
    }
  }
  return out;
})();

const formatLocation = (r: Row) => {
  const parts = [r.village, r.upazila, r.city, r.country].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
};

const AdminBlockedDevicesInner = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { role } = useAuth();
  const isSuperAdmin = role === 'super_admin';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [approveTarget, setApproveTarget] = useState<Row | null>(null);
  const [approveRoutes, setApproveRoutes] = useState<string[]>([]);
  const [approveNotes, setApproveNotes] = useState('');
  const [blockTarget, setBlockTarget] = useState<Row | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockNotes, setBlockNotes] = useState('');
  const [unblockTarget, setUnblockTarget] = useState<Row | null>(null);
  const [unblockReason, setUnblockReason] = useState('');
  const [unblockNotes, setUnblockNotes] = useState('');
  const [historyTarget, setHistoryTarget] = useState<Row | null>(null);
  const [routeSearch, setRouteSearch] = useState('');

  const filteredRoutes = useMemo(() => {
    const q = routeSearch.trim().toLowerCase();
    if (!q) return ALL_ADMIN_ROUTES;
    return ALL_ADMIN_ROUTES.filter(
      (r) =>
        r.path.toLowerCase().includes(q) ||
        r.label_en.toLowerCase().includes(q) ||
        r.label_bn.toLowerCase().includes(q) ||
        r.group_en.toLowerCase().includes(q) ||
        r.group_bn.toLowerCase().includes(q),
    );
  }, [routeSearch]);

  const groupedRoutes = useMemo(() => {
    const map = new Map<string, { group_bn: string; group_en: string; items: RouteOption[] }>();
    for (const r of filteredRoutes) {
      const key = r.group_en;
      if (!map.has(key)) map.set(key, { group_bn: r.group_bn, group_en: r.group_en, items: [] });
      map.get(key)!.items.push(r);
    }
    return Array.from(map.values());
  }, [filteredRoutes]);

  const list = useQuery({
    queryKey: ['blocked-device-attempts', search, onlyBlocked],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_blocked_device_attempts', {
        _search: search || null,
        _only_blocked: onlyBlocked,
        _limit: 200,
      });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    enabled: !!role,
  });

  const stats = useMemo(() => {
    const rows = list.data ?? [];
    return {
      total: rows.length,
      blocked: rows.filter((r) => r.is_blocked).length,
      attempts: rows.reduce((s, r) => s + Number(r.attempt_count || 0), 0),
    };
  }, [list.data]);

  const approveMut = useMutation({
    mutationFn: async () => {
      if (!approveTarget) return;
      if (!approveRoutes.length) throw new Error(bn ? 'অন্তত একটি রুট নির্বাচন করুন' : 'Pick at least one route');
      const { error } = await supabase.rpc('approve_device_for_routes', {
        _device_id: approveTarget.device_id,
        _routes: approveRoutes,
        _notes: approveNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'রুট-অনুমোদন সম্পন্ন' : 'Routes approved');
      setApproveTarget(null);
      setApproveRoutes([]);
      setApproveNotes('');
      qc.invalidateQueries({ queryKey: ['blocked-device-attempts'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  });

  const blockMut = useMutation({
    mutationFn: async () => {
      if (!blockTarget) return;
      if (!blockReason.trim()) throw new Error(bn ? 'কারণ আবশ্যক' : 'Reason required');
      const { error } = await supabase.rpc('permanent_block_device', {
        _device_id: blockTarget.device_id,
        _reason: blockReason.trim(),
        _notes: blockNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'ডিভাইস স্থায়ীভাবে ব্লক হয়েছে' : 'Device permanently blocked');
      setBlockTarget(null);
      setBlockReason('');
      setBlockNotes('');
      qc.invalidateQueries({ queryKey: ['blocked-device-attempts'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  });

  const unblockMut = useMutation({
    mutationFn: async () => {
      if (!unblockTarget) throw new Error('No target');
      const reason = unblockReason.trim();
      if (reason.length < 5) {
        throw new Error(bn ? 'কারণ লিখুন (অন্তত ৫ অক্ষর)' : 'Reason required (min 5 chars)');
      }
      const { error } = await supabase.rpc('unblock_device', {
        _device_id: unblockTarget.device_id,
        _reason: reason,
        _notes: unblockNotes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'আনব্লক হয়েছে' : 'Unblocked');
      setUnblockTarget(null);
      setUnblockReason('');
      setUnblockNotes('');
      qc.invalidateQueries({ queryKey: ['blocked-device-attempts'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  });

  const historyQuery = useQuery({
    queryKey: ['device-block-history', historyTarget?.device_id],
    enabled: !!historyTarget,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_device_block_history', {
        _device_id: historyTarget!.device_id,
        _limit: 50,
      });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; action: 'block' | 'unblock'; reason: string; notes: string | null;
        performed_at: string; performed_by: string | null; ip_address: string | null;
        country: string | null; city: string | null; upazila: string | null; village: string | null;
      }>;
    },
  });

  const copy = async (txt: string) => {
    try {
      await navigator.clipboard?.writeText(txt);
      toast.success(bn ? 'কপি হয়েছে' : 'Copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  if (!role || (role !== 'super_admin' && role !== 'admin')) {
    return (
      <div className="max-w-[1440px] mx-auto p-6">
        <Card className="rounded-[45px] border-destructive/30">
          <CardContent className="p-12 text-center space-y-3">
            <Lock className="h-12 w-12 mx-auto text-destructive" />
            <p className="font-semibold">{bn ? 'অ্যাক্সেস নিষিদ্ধ' : 'Access denied'}</p>
            <p className="text-sm text-muted-foreground">
              {bn ? 'এই পেজ শুধুমাত্র অ্যাডমিন/সুপার অ্যাডমিন দেখতে পারবেন।' : 'Admin / super_admin only.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0">
          <ShieldX className="h-6 w-6 text-destructive" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-bold">
            {bn ? 'ব্লকড ডিভাইস ম্যানেজমেন্ট' : 'Blocked Device Management'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {bn
              ? '403 Forbidden খাওয়া বা সিস্টেম-ব্লক করা ডিভাইসগুলো এখানে দেখুন এবং রুট-ভিত্তিক অনুমোদন/স্থায়ী ব্লক করুন।'
              : 'Devices that received 403 or were system-blocked. Approve for specific routes or permanently block.'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => list.refetch()}
          className="shrink-0"
        >
          <RefreshCcw className="h-4 w-4" />
          {bn ? 'রিফ্রেশ' : 'Refresh'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: bn ? 'মোট ডিভাইস' : 'Total Devices', value: stats.total, color: 'bg-primary/10 text-primary' },
          { label: bn ? 'ব্লকড' : 'Blocked', value: stats.blocked, color: 'bg-destructive/10 text-destructive' },
          { label: bn ? 'মোট অ্যাটেম্পট' : 'Total Attempts', value: stats.attempts, color: 'bg-amber-500/10 text-amber-600' },
        ].map((s) => (
          <Card key={s.label} className="rounded-[28px]">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</p>
              <p className={`text-2xl md:text-3xl font-bold mt-1 ${s.color.split(' ')[1]}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="rounded-[45px]">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 rounded-2xl"
              placeholder={bn ? 'ডিভাইস আইডি / আইপি / লোকেশন…' : 'Device ID / IP / location…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={onlyBlocked} onCheckedChange={setOnlyBlocked} id="only-blocked" />
            <Label htmlFor="only-blocked" className="text-sm">
              {bn ? 'শুধুমাত্র ব্লকড' : 'Blocked only'}
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-[45px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-primary" />
            {bn ? 'ব্লকড / সন্দেহজনক ডিভাইস তালিকা' : 'Blocked / Suspicious Devices'}
            <Badge variant="secondary" className="ml-2">{list.data?.length ?? 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 md:p-4">
          {list.isLoading ? (
            <div className="p-12 text-center"><Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" /></div>
          ) : !list.data?.length ? (
            <p className="text-sm text-center text-muted-foreground p-12">
              {bn ? 'কোনো ব্লকড বা ফেইল্ড অ্যাটেম্পট পাওয়া যায়নি।' : 'No blocked or failed attempts found.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{bn ? 'ডিভাইস আইডি' : 'Device ID'}</TableHead>
                    <TableHead>{bn ? 'কারণ' : 'Reason'}</TableHead>
                    <TableHead>{bn ? 'আইপি' : 'IP'}</TableHead>
                    <TableHead>{bn ? 'লোকেশন' : 'Location'}</TableHead>
                    <TableHead>{bn ? 'অ্যাটেম্পট' : 'Attempts'}</TableHead>
                    <TableHead>{bn ? 'শেষ অ্যাটেম্পট' : 'Last Attempt'}</TableHead>
                    <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data.map((r) => (
                    <TableRow key={r.device_id} className="bg-muted/20">
                      <TableCell>
                        <div className="flex items-center gap-2 max-w-[180px]">
                          <code className="text-[11px] font-mono break-all">{r.device_id.slice(0, 18)}…</code>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(r.device_id)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.is_blocked ? (
                          <Badge variant="destructive">{r.reason}</Badge>
                        ) : (
                          <Badge variant="secondary">{r.reason}</Badge>
                        )}
                      </TableCell>
                      <TableCell><code className="text-xs">{r.ip_address || '—'}</code></TableCell>
                      <TableCell>
                        <div className="flex items-start gap-1.5 text-xs">
                          <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                          <span className="break-words max-w-[160px]">{formatLocation(r)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.attempt_count}</Badge>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(r.last_attempt_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setHistoryTarget(r)}
                            title={bn ? 'হিস্ট্রি' : 'History'}
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                          {r.is_blocked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!isSuperAdmin}
                              onClick={() => {
                                setUnblockTarget(r);
                                setUnblockReason('');
                                setUnblockNotes('');
                              }}
                            >
                              <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                              {bn ? 'আনব্লক' : 'Unblock'}
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!isSuperAdmin}
                                onClick={() => {
                                  setApproveTarget(r);
                                  setApproveRoutes([]);
                                  setApproveNotes('');
                                }}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                {bn ? 'রুট অনুমোদন' : 'Approve for Routes'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={!isSuperAdmin}
                                onClick={() => {
                                  setBlockTarget(r);
                                  setBlockReason(r.reason);
                                  setBlockNotes('');
                                }}
                              >
                                <Ban className="h-3.5 w-3.5" />
                                {bn ? 'স্থায়ী ব্লক' : 'Permanent Block'}
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve-for-routes dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent className="rounded-[38px] max-w-lg">
          <DialogHeader>
            <DialogTitle>{bn ? 'নির্দিষ্ট রুটের জন্য অনুমোদন' : 'Approve for specific routes'}</DialogTitle>
            <DialogDescription>
              {bn
                ? 'এই ডিভাইসটি শুধুমাত্র নির্বাচিত রুটগুলোতে এক্সেস পাবে।'
                : 'The device will be allowed only on the selected routes.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{bn ? 'ডিভাইস আইডি' : 'Device ID'}</p>
              <code className="text-xs font-mono break-all">{approveTarget?.device_id}</code>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">{bn ? 'রুট নির্বাচন করুন' : 'Select routes'}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ROUTE_OPTIONS.map((r) => {
                  const checked = approveRoutes.includes(r.path);
                  return (
                    <label
                      key={r.path}
                      className="flex items-center gap-2 rounded-xl border p-2.5 cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setApproveRoutes((prev) =>
                            v ? [...prev, r.path] : prev.filter((p) => p !== r.path),
                          );
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{bn ? r.label_bn : r.label_en}</p>
                        <code className="text-[10px] text-muted-foreground">{r.path}</code>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs">{bn ? 'নোট (ঐচ্ছিক)' : 'Notes (optional)'}</Label>
              <Textarea
                className="mt-1 rounded-2xl"
                rows={2}
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApproveTarget(null)}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={() => approveMut.mutate()} disabled={approveMut.isPending}>
              {approveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {bn ? 'অনুমোদন' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent block dialog */}
      <Dialog open={!!blockTarget} onOpenChange={(o) => !o && setBlockTarget(null)}>
        <DialogContent className="rounded-[38px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {bn ? 'স্থায়ীভাবে ব্লক করুন' : 'Permanently block device'}
            </DialogTitle>
            <DialogDescription>
              {bn
                ? 'এই ডিভাইস ভবিষ্যতে কোনো অ্যাডমিন/অডিট রুটে এক্সেস পাবে না।'
                : 'This device will lose access to all admin / audit routes.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-2xl bg-muted/30 p-3">
              <code className="text-xs font-mono break-all">{blockTarget?.device_id}</code>
            </div>
            <div>
              <Label className="text-xs">{bn ? 'কারণ *' : 'Reason *'}</Label>
              <Input
                className="mt-1 rounded-2xl"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder={bn ? 'যেমন: সন্দেহজনক অ্যাটেম্পট' : 'e.g. Suspicious access attempts'}
              />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'নোট' : 'Notes'}</Label>
              <Textarea
                className="mt-1 rounded-2xl"
                rows={2}
                value={blockNotes}
                onChange={(e) => setBlockNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBlockTarget(null)}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={() => blockMut.mutate()} disabled={blockMut.isPending}>
              {blockMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              {bn ? 'স্থায়ী ব্লক' : 'Permanent Block'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unblock dialog with required reason */}
      <Dialog
        open={!!unblockTarget}
        onOpenChange={(o) => {
          if (!o) {
            setUnblockTarget(null);
            setUnblockReason('');
            setUnblockNotes('');
          }
        }}
      >
        <DialogContent className="rounded-[38px] max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5 text-emerald-600" />
              {bn ? 'ডিভাইস আনব্লক করুন' : 'Unblock Device'}
            </DialogTitle>
            <DialogDescription>
              {bn
                ? 'এই ডিভাইস আবার লগইন/অ্যাক্সেস চেষ্টা করতে পারবে। কারণ লিখুন — হিস্ট্রিতে রেকর্ড হবে।'
                : 'The device will be allowed to attempt access again. The reason will be recorded in the device history.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {unblockTarget && (
              <div className="text-xs font-mono bg-muted/50 rounded-lg p-2 break-all">
                {unblockTarget.device_id}
              </div>
            )}
            <div>
              <Label className="text-xs">
                {bn ? 'কারণ' : 'Reason'} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={unblockReason}
                onChange={(e) => setUnblockReason(e.target.value)}
                placeholder={
                  bn
                    ? 'যেমন: ব্যবহারকারী যাচাইকৃত, ভুল ব্লক ছিল, ইত্যাদি (অন্তত ৫ অক্ষর)'
                    : 'e.g. User identity verified, false-positive, etc. (min 5 chars)'
                }
                rows={3}
                className="mt-1"
              />
              <div className="text-[10px] text-muted-foreground mt-1">
                {unblockReason.trim().length}/5 {bn ? 'অক্ষর' : 'chars min'}
              </div>
            </div>
            <div>
              <Label className="text-xs">{bn ? 'নোট (ঐচ্ছিক)' : 'Notes (optional)'}</Label>
              <Input
                value={unblockNotes}
                onChange={(e) => setUnblockNotes(e.target.value)}
                placeholder={bn ? 'অতিরিক্ত মন্তব্য' : 'Additional comment'}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUnblockTarget(null)}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              onClick={() => unblockMut.mutate()}
              disabled={unblockMut.isPending || unblockReason.trim().length < 5}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {unblockMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unlock className="h-4 w-4" />
              )}
              {bn ? 'আনব্লক করুন' : 'Unblock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={!!historyTarget} onOpenChange={(o) => !o && setHistoryTarget(null)}>
        <DialogContent className="rounded-[38px] max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {bn ? 'ডিভাইস হিস্ট্রি' : 'Device History'}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs break-all">
              {historyTarget?.device_id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {historyQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !historyQuery.data || historyQuery.data.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                {bn ? 'কোনো হিস্ট্রি নেই' : 'No history yet'}
              </div>
            ) : (
              historyQuery.data.map((h) => (
                <div
                  key={h.id}
                  className={`rounded-[20px] border p-3 ${
                    h.action === 'block'
                      ? 'border-destructive/30 bg-destructive/5'
                      : 'border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge
                      variant={h.action === 'block' ? 'destructive' : 'default'}
                      className={h.action === 'unblock' ? 'bg-emerald-600' : ''}
                    >
                      {h.action === 'block'
                        ? bn ? 'ব্লক' : 'BLOCKED'
                        : bn ? 'আনব্লক' : 'UNBLOCKED'}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(h.performed_at), 'dd/MM/yyyy HH:mm:ss')}
                    </span>
                  </div>
                  <div className="text-sm font-medium">{h.reason}</div>
                  {h.notes && (
                    <div className="text-xs text-muted-foreground mt-1">{h.notes}</div>
                  )}
                  {(h.ip_address || h.city || h.country) && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-2">
                      <MapPin className="h-3 w-3" />
                      {[h.village, h.upazila, h.city, h.country].filter(Boolean).join(', ')}
                      {h.ip_address && <span className="ml-1 font-mono">({h.ip_address})</span>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminBlockedDevices = () => (
  <AdminLayout>
    <AuditDeviceGate>
      <AdminBlockedDevicesInner />
    </AuditDeviceGate>
  </AdminLayout>
);

export default AdminBlockedDevices;
