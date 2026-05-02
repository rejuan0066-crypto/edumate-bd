import { useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import AuditDeviceGate from '@/components/admin/AuditDeviceGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import { toast } from 'sonner';
import {
  Loader2, Search, MapPin, ShieldOff, ShieldCheck, Smartphone, Monitor,
  Globe, AlertTriangle, Check, X, RefreshCw, FileJson, Lock,
} from 'lucide-react';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { format } from 'date-fns';

type StaffDevice = {
  id: string;
  user_id: string;
  device_id: string;
  user_name: string;
  user_email: string | null;
  label: string | null;
  device_model: string | null;
  os: string | null;
  browser: string | null;
  user_agent: string | null;
  last_ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  upazila: string | null;
  village: string | null;
  latitude: number | null;
  longitude: number | null;
  isp: string | null;
  is_active: boolean;
  approval_status: string;
  last_anomaly: string | null;
  last_anomaly_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
};

type ApprovalRequest = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  device_id: string;
  user_agent: string | null;
  device_model: string | null;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  upazila: string | null;
  village: string | null;
  status: string;
  created_at: string;
};

const formatLocation = (d: Pick<StaffDevice, 'village' | 'upazila' | 'city' | 'country'>) => {
  const parts = [d.village, d.upazila, d.city, d.country].filter(Boolean);
  return parts.length > 0 ? parts.join(' › ') : '—';
};

const Inner = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [report, setReport] = useState<unknown>(null);

  const devicesQuery = useQuery({
    queryKey: ['admin-staff-devices'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_staff_devices');
      if (error) throw error;
      return (data ?? []) as StaffDevice[];
    },
    refetchInterval: 60_000,
  });

  const pendingQuery = useQuery({
    queryKey: ['device-approval-requests', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_device_approval_requests', { _status: 'pending' });
      if (error) throw error;
      return (data ?? []) as ApprovalRequest[];
    },
    refetchInterval: 30_000,
  });

  const revokeMut = useMutation({
    mutationFn: async (deviceUuid: string) => {
      const { data, error } = await supabase.rpc('revoke_staff_device', {
        _device_uuid: deviceUuid, _reason: 'admin_one_click_revoke',
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(bn ? 'ডিভাইস রিভোক করা হয়েছে' : 'Device revoked');
      setReport({ action: 'revoke', timestamp: new Date().toISOString(), result: data });
      qc.invalidateQueries({ queryKey: ['admin-staff-devices'] });
      setRevokeId(null);
    },
    onError: (e: unknown) => toast.error((e as Error)?.message ?? 'Error'),
  });

  const approveMut = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('approve_device_request', { _request_id: id, _notes: null });
      if (error) throw error; return data;
    },
    onSuccess: (data) => {
      toast.success(bn ? 'ডিভাইস অনুমোদিত' : 'Device approved');
      setReport({ action: 'approve', timestamp: new Date().toISOString(), result: data });
      qc.invalidateQueries({ queryKey: ['device-approval-requests'] });
      qc.invalidateQueries({ queryKey: ['admin-staff-devices'] });
    },
    onError: (e: unknown) => toast.error((e as Error)?.message ?? 'Error'),
  });

  const rejectMut = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc('reject_device_request', { _request_id: id, _notes: null });
      if (error) throw error; return data;
    },
    onSuccess: (data) => {
      toast.success(bn ? 'রিকোয়েস্ট প্রত্যাখ্যাত' : 'Request rejected');
      setReport({ action: 'reject', timestamp: new Date().toISOString(), result: data });
      qc.invalidateQueries({ queryKey: ['device-approval-requests'] });
    },
    onError: (e: unknown) => toast.error((e as Error)?.message ?? 'Error'),
  });

  const filtered = useMemo(() => {
    const list = devicesQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) =>
      [d.user_name, d.user_email, d.device_model, d.label, d.city, d.upazila, d.village, d.country, d.last_ip]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [devicesQuery.data, search]);

  const stats = useMemo(() => {
    const list = devicesQuery.data ?? [];
    return {
      total: list.length,
      active: list.filter((d) => d.is_active).length,
      revoked: list.filter((d) => !d.is_active).length,
      suspicious: list.filter((d) => d.last_anomaly).length,
      pending: pendingQuery.data?.length ?? 0,
    };
  }, [devicesQuery.data, pendingQuery.data]);

  return (
    <div className="max-w-[1440px] mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-bold">
            {bn ? 'ডিভাইস ম্যানেজমেন্ট' : 'Device Management'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {bn
              ? 'প্রতিটি স্টাফের নিবন্ধিত ডিভাইস, লাইভ লোকেশন (গ্রাম › উপজেলা › শহর › দেশ) ও সিকিউরিটি স্ট্যাটাস।'
              : 'Every registered staff device, live location (Village › Upazila › City › Country) and security status.'}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { devicesQuery.refetch(); pendingQuery.refetch(); }}>
          <RefreshCw className="h-4 w-4" />
          {bn ? 'রিফ্রেশ' : 'Refresh'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: bn ? 'মোট ডিভাইস' : 'Total', value: stats.total, icon: Smartphone, color: 'text-primary' },
          { label: bn ? 'সক্রিয়' : 'Active', value: stats.active, icon: ShieldCheck, color: 'text-emerald-600' },
          { label: bn ? 'রিভোকড' : 'Revoked', value: stats.revoked, icon: ShieldOff, color: 'text-muted-foreground' },
          { label: bn ? 'সাসপিশাস' : 'Suspicious', value: stats.suspicious, icon: AlertTriangle, color: 'text-amber-600' },
          { label: bn ? 'পেন্ডিং রিকোয়েস্ট' : 'Pending', value: stats.pending, icon: Lock, color: 'text-blue-600' },
        ].map((s) => (
          <Card key={s.label} className="rounded-[28px]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-2xl bg-muted/40 flex items-center justify-center ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList className="rounded-2xl">
          <TabsTrigger value="devices" className="rounded-xl">
            {bn ? 'ডিভাইস তালিকা' : 'Devices'} ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-xl">
            {bn ? 'পেন্ডিং রিকোয়েস্ট' : 'Pending Requests'} ({stats.pending})
          </TabsTrigger>
        </TabsList>

        {/* Devices tab */}
        <TabsContent value="devices">
          <Card className="rounded-[45px]">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <CardTitle className="text-base">
                  {bn ? 'নিবন্ধিত ডিভাইসসমূহ' : 'Registered Devices'}
                </CardTitle>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={bn ? 'নাম, ডিভাইস বা লোকেশন খুঁজুন…' : 'Search name, device or location…'}
                    className="pl-9 rounded-2xl"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              {devicesQuery.isLoading ? (
                <div className="p-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground p-6">
                  {bn ? 'কোনো ডিভাইস পাওয়া যায়নি।' : 'No devices found.'}
                </p>
              ) : (
                <div className="overflow-x-auto" style={{ borderSpacing: '0 6px', borderCollapse: 'separate' }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{bn ? 'স্টাফ' : 'Staff'}</TableHead>
                        <TableHead>{bn ? 'ডিভাইস' : 'Device'}</TableHead>
                        <TableHead>{bn ? 'লোকেশন' : 'Location'}</TableHead>
                        <TableHead>{bn ? 'IP' : 'IP'}</TableHead>
                        <TableHead>{bn ? 'নিবন্ধন' : 'Registered'}</TableHead>
                        <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                        <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((d) => (
                        <TableRow key={d.id} className="bg-muted/20">
                          <TableCell>
                            <p className="font-semibold text-sm">{d.user_name}</p>
                            <p className="text-xs text-muted-foreground">{d.user_email ?? '—'}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {d.os?.toLowerCase().includes('mac') || d.os?.toLowerCase().includes('windows')
                                ? <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                                : <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />}
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{d.device_model ?? d.label ?? '—'}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{d.os ?? ''} {d.browser ? `• ${d.browser}` : ''}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-start gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium leading-tight">{formatLocation(d)}</p>
                                {d.last_anomaly && (
                                  <Badge variant="outline" className="mt-1 text-[10px] border-amber-400/60 text-amber-700 dark:text-amber-400">
                                    <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                    {bn ? 'এলাকার বাইরে' : 'Out of area'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-[11px] font-mono">{d.last_ip ?? '—'}</code>
                            {d.isp && <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{d.isp}</p>}
                          </TableCell>
                          <TableCell className="text-xs">
                            {format(new Date(d.created_at), 'dd/MM/yyyy')}
                            <p className="text-[10px] text-muted-foreground">
                              {bn ? 'সর্বশেষ' : 'Last'}: {format(new Date(d.last_seen_at), 'dd/MM HH:mm')}
                            </p>
                          </TableCell>
                          <TableCell>
                            {d.is_active ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25">
                                {bn ? 'সক্রিয়' : 'Active'}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                {bn ? 'রিভোকড' : 'Revoked'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {d.is_active && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="rounded-xl"
                                onClick={() => setRevokeId(d.id)}
                              >
                                <ShieldOff className="h-3.5 w-3.5" />
                                {bn ? 'রিভোক' : 'Revoke'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending tab */}
        <TabsContent value="pending">
          <Card className="rounded-[45px]">
            <CardHeader>
              <CardTitle className="text-base">
                {bn ? 'নতুন ডিভাইস অনুমোদনের অপেক্ষায়' : 'Pending Device Approval Requests'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              {pendingQuery.isLoading ? (
                <div className="p-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin" /></div>
              ) : (pendingQuery.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-center text-muted-foreground p-6">
                  {bn ? 'কোনো পেন্ডিং রিকোয়েস্ট নেই।' : 'No pending requests.'}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{bn ? 'স্টাফ' : 'Staff'}</TableHead>
                      <TableHead>{bn ? 'ডিভাইস' : 'Device'}</TableHead>
                      <TableHead>{bn ? 'লোকেশন' : 'Location'}</TableHead>
                      <TableHead>{bn ? 'সময়' : 'Time'}</TableHead>
                      <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingQuery.data!.map((r) => (
                      <TableRow key={r.id} className="bg-blue-500/5">
                        <TableCell>
                          <p className="font-semibold text-sm">{r.user_name}</p>
                          <p className="text-xs text-muted-foreground">{r.user_email ?? '—'}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{r.device_model ?? '—'}</p>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">{r.user_agent}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs">{formatLocation(r)}</span>
                          </div>
                          <code className="text-[10px] text-muted-foreground">{r.ip_address}</code>
                        </TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(r.created_at), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => approveMut.mutate(r.id)} disabled={approveMut.isPending}>
                            <Check className="h-3.5 w-3.5" />
                            {bn ? 'অনুমোদন' : 'Approve'}
                          </Button>
                          <Button size="sm" variant="destructive" className="rounded-xl"
                            onClick={() => rejectMut.mutate(r.id)} disabled={rejectMut.isPending}>
                            <X className="h-3.5 w-3.5" />
                            {bn ? 'প্রত্যাখ্যান' : 'Reject'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteConfirmDialog
        open={!!revokeId}
        onOpenChange={(o) => !o && setRevokeId(null)}
        onConfirm={() => revokeId && revokeMut.mutate(revokeId)}
        title={bn ? 'ডিভাইস রিভোক করবেন?' : 'Revoke this device?'}
        description={
          bn
            ? 'এই ডিভাইসের অডিট অ্যাক্সেস তৎক্ষণাৎ বন্ধ হবে এবং ইউজার লগআউট হয়ে যাবে।'
            : 'Audit access will be cut immediately and the user will be force-logged out.'
        }
      />

      {/* JSON report modal */}
      <Dialog open={!!report} onOpenChange={(o) => !o && setReport(null)}>
        <DialogContent className="rounded-[38px] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-4 w-4 text-primary" />
              {bn ? 'অপারেশন রিপোর্ট' : 'Operation Report'}
            </DialogTitle>
          </DialogHeader>
          <pre className="text-xs bg-muted/40 p-4 rounded-2xl overflow-auto max-h-[60vh]">
            {JSON.stringify(report, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminDeviceManagement = () => {
  const { role } = useAuth();
  const { language } = useLanguage();
  const bn = language === 'bn';

  if (!isAdminRole(role)) {
    return (
      <AdminLayout>
        <Card className="rounded-[45px] m-6 max-w-xl mx-auto">
          <CardContent className="p-12 text-center space-y-3">
            <Lock className="h-10 w-10 mx-auto text-destructive" />
            <p className="font-semibold">{bn ? 'অ্যাক্সেস নিষিদ্ধ' : 'Access denied'}</p>
            <p className="text-sm text-muted-foreground">
              {bn ? 'super_admin বা admin অনুমোদিত।' : 'super_admin or admin only.'}
            </p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AuditDeviceGate>
        <Inner />
      </AuditDeviceGate>
    </AdminLayout>
  );
};

export default AdminDeviceManagement;
