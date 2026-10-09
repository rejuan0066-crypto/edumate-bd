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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
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
  Activity, Users, Ban, Unlock, Wifi, Signal, Eye, Clock,
  ExternalLink, UserCheck, Radio,
} from 'lucide-react';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { format, formatDistanceToNow } from 'date-fns';

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

type VisitorLog = {
  id: string;
  created_at: string;
  event_type: string;
  resource: string | null;
  ip_address: string | null;
  user_agent: string | null;
  user_id: string | null;
  user_email: string | null;
  reason: string | null;
  metadata: {
    device_id?: string;
    session_id?: string;
    device_model?: string;
    brand?: string;
    os?: string;
    browser?: string;
    device_type?: 'mobile' | 'tablet' | 'desktop';
    network_type?: string;
    country?: string;
    region?: string;
    city?: string;
    upazila?: string;
    isp?: string;
    page_title?: string;
    visitor_type?: string;
    is_live?: boolean;
    last_ping?: string;
    [key: string]: unknown;
  } | null;
};

type BlockedDeviceRow = {
  id: string;
  device_id: string;
  user_id: string | null;
  reason: string;
  notes: string | null;
  last_ip: string | null;
  last_country: string | null;
  last_city: string | null;
  last_upazila: string | null;
  last_user_agent: string | null;
  attempt_count: number;
  last_attempt_at: string;
  blocked_at: string;
  is_active: boolean;
};

const formatLocation = (d: { village?: string | null; upazila?: string | null; city?: string | null; country?: string | null; region?: string | null }) => {
  const parts = [d.village, d.upazila, d.city, d.region, d.country].filter(Boolean);
  return parts.length > 0 ? parts.join(' › ') : '—';
};

const Inner = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();

  // Search & filter states
  const [search, setSearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'public' | 'user'>('all');
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [report, setReport] = useState<unknown>(null);
  const [detailsLog, setDetailsLog] = useState<VisitorLog | null>(null);

  // Block modal state
  const [blockTarget, setBlockTarget] = useState<{
    deviceId: string;
    ip?: string;
    model?: string;
    location?: string;
  } | null>(null);
  const [blockReason, setBlockReason] = useState('সন্দেহজনক কার্যকলাপ ও নিরাপত্তা বিধিনিষেধ');
  const [blockNotes, setBlockNotes] = useState('');

  // Unblock target
  const [unblockDeviceId, setUnblockDeviceId] = useState<string | null>(null);

  // 1. Staff Devices Query
  const devicesQuery = useQuery({
    queryKey: ['admin-staff-devices'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_staff_devices');
      if (error) throw error;
      return (data ?? []) as StaffDevice[];
    },
    refetchInterval: 60_000,
  });

  // 2. Pending Approval Requests Query
  const pendingQuery = useQuery({
    queryKey: ['device-approval-requests', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_device_approval_requests', { _status: 'pending' });
      if (error) throw error;
      return (data ?? []) as ApprovalRequest[];
    },
    refetchInterval: 30_000,
  });

  // 3. Security & Visitor Logs Query (Polled every 10s for live visitors)
  const visitorLogsQuery = useQuery({
    queryKey: ['visitor-security-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_logs')
        .select('*')
        .in('event_type', ['page_visit', 'live_ping'])
        .order('created_at', { ascending: false })
        .limit(300);

      if (error) {
        console.warn('Failed to load security logs:', error);
        return [] as VisitorLog[];
      }
      return (data ?? []) as unknown as VisitorLog[];
    },
    refetchInterval: 10_000,
  });

  // 4. Blocked Devices Query
  const blockedDevicesQuery = useQuery({
    queryKey: ['admin-blocked-devices-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocked_devices')
        .select('*')
        .eq('is_active', true)
        .order('blocked_at', { ascending: false });

      if (error) return [] as BlockedDeviceRow[];
      return (data ?? []) as BlockedDeviceRow[];
    },
    refetchInterval: 20_000,
  });

  // 5. Block Device Mutation (updates database + app_settings)
  const blockMut = useMutation({
    mutationFn: async ({ deviceId, reason, notes, ip }: { deviceId: string; reason: string; notes?: string; ip?: string }) => {
      // Step A: Call permanent_block_device RPC
      const { data, error } = await supabase.rpc('permanent_block_device', {
        _device_id: deviceId,
        _reason: reason.trim() || 'Admin Blocked via Visitor Log',
        _notes: notes || null,
      });
      if (error) throw error;

      // Step B: Sync blocked_device_ids in app_settings for instant public/anon blocking
      try {
        const { data: settingsRow } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'blocked_device_ids')
          .maybeSingle();

        const currentList = Array.isArray(settingsRow?.value) ? (settingsRow.value as Array<{ device_id?: string; ip?: string; reason?: string }>) : [];
        const nextList = [
          ...currentList.filter((item) => item.device_id !== deviceId && item.ip !== ip),
          { device_id: deviceId, ip: ip || null, reason, blocked_at: new Date().toISOString() },
        ];

        await supabase.from('app_settings').upsert({
          key: 'blocked_device_ids',
          value: nextList as unknown as import('@/integrations/supabase/types').Json,
          description: 'Blocked device IDs & IPs synced from device security',
        });
      } catch {
        /* non-fatal */
      }

      return data;
    },
    onSuccess: () => {
      toast.success(bn ? 'ডিভাইস সফলভাবে ব্লক করা হয়েছে' : 'Device permanently blocked');
      qc.invalidateQueries({ queryKey: ['admin-blocked-devices-list'] });
      qc.invalidateQueries({ queryKey: ['visitor-security-logs'] });
      qc.invalidateQueries({ queryKey: ['admin-staff-devices'] });
      setBlockTarget(null);
      setBlockReason('সন্দেহজনক কার্যকলাপ ও নিরাপত্তা বিধিনিষেধ');
      setBlockNotes('');
    },
    onError: (e: unknown) => toast.error((e as Error)?.message ?? 'Block failed'),
  });

  // 6. Unblock Device Mutation
  const unblockMut = useMutation({
    mutationFn: async (deviceId: string) => {
      const { data, error } = await supabase.rpc('unblock_device', {
        _device_id: deviceId,
        _reason: 'Admin Unblocked',
        _notes: 'Unblocked via admin panel',
      });
      if (error) throw error;

      // Sync app_settings
      try {
        const { data: settingsRow } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'blocked_device_ids')
          .maybeSingle();

        if (Array.isArray(settingsRow?.value)) {
          const nextList = (settingsRow.value as Array<{ device_id?: string }>).filter((item) => item.device_id !== deviceId);
          await supabase.from('app_settings').upsert({
            key: 'blocked_device_ids',
            value: nextList as unknown as import('@/integrations/supabase/types').Json,
          });
        }
      } catch {
        /* non-fatal */
      }

      return data;
    },
    onSuccess: () => {
      toast.success(bn ? 'ডিভাইস আনব্লক করা হয়েছে' : 'Device unblocked');
      qc.invalidateQueries({ queryKey: ['admin-blocked-devices-list'] });
      qc.invalidateQueries({ queryKey: ['visitor-security-logs'] });
      setUnblockDeviceId(null);
    },
    onError: (e: unknown) => toast.error((e as Error)?.message ?? 'Unblock failed'),
  });

  // 7. Revoke Staff Device Mutation
  const revokeMut = useMutation({
    mutationFn: async (deviceUuid: string) => {
      const { data, error } = await supabase.rpc('revoke_staff_device', {
        _device_uuid: deviceUuid, _reason: 'admin_one_click_revoke',
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(bn ? 'স্টাফ ডিভাইস রিভোক করা হয়েছে' : 'Staff device revoked');
      setReport({ action: 'revoke', timestamp: new Date().toISOString(), result: data });
      qc.invalidateQueries({ queryKey: ['admin-staff-devices'] });
      setRevokeId(null);
    },
    onError: (e: unknown) => toast.error((e as Error)?.message ?? 'Error'),
  });

  // 8. Approve/Reject Device Requests
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

  // Blocked device set for quick checking
  const blockedDeviceIds = useMemo(() => {
    return new Set((blockedDevicesQuery.data ?? []).map((b) => b.device_id));
  }, [blockedDevicesQuery.data]);

  // Aggregate Live Visitors (Active within the last 3 minutes / 180 seconds)
  const liveVisitors = useMemo(() => {
    const logs = visitorLogsQuery.data ?? [];
    const threeMinAgo = Date.now() - 3 * 60 * 1000;
    const sessionMap = new Map<string, VisitorLog>();

    for (const log of logs) {
      const time = new Date(log.created_at).getTime();
      if (time < threeMinAgo) continue;

      const key = log.metadata?.session_id || log.metadata?.device_id || log.ip_address || log.id;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, log);
      } else {
        const existing = sessionMap.get(key)!;
        if (new Date(log.created_at).getTime() > new Date(existing.created_at).getTime()) {
          sessionMap.set(key, log);
        }
      }
    }

    return Array.from(sessionMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [visitorLogsQuery.data]);

  // Filtered Visitor History
  const filteredHistory = useMemo(() => {
    const logs = visitorLogsQuery.data ?? [];
    const q = search.trim().toLowerCase();

    return logs.filter((log) => {
      // Type filter
      if (historyFilter === 'public' && log.user_id) return false;
      if (historyFilter === 'user' && !log.user_id) return false;

      // Text search
      if (!q) return true;
      const meta = log.metadata ?? {};
      const fields = [
        log.ip_address,
        log.resource,
        log.user_email,
        meta.device_model,
        meta.brand,
        meta.city,
        meta.region,
        meta.country,
        meta.isp,
        meta.page_title,
        meta.os,
        meta.browser,
      ];
      return fields.filter(Boolean).some((f) => String(f).toLowerCase().includes(q));
    });
  }, [visitorLogsQuery.data, historyFilter, search]);

  // Filtered Staff Devices
  const filteredStaff = useMemo(() => {
    const list = devicesQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) =>
      [d.user_name, d.user_email, d.device_model, d.label, d.city, d.upazila, d.village, d.country, d.last_ip, d.isp]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [devicesQuery.data, search]);

  // Global Statistics
  const stats = useMemo(() => {
    const staffList = devicesQuery.data ?? [];
    const allLogs = visitorLogsQuery.data ?? [];
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayLogs = allLogs.filter((l) => l.created_at.startsWith(todayStr));
    const publicVisits = todayLogs.filter((l) => !l.user_id);

    return {
      live: liveVisitors.length,
      todayVisits: todayLogs.length,
      todayPublic: publicVisits.length,
      staffTotal: staffList.length,
      staffActive: staffList.filter((d) => d.is_active).length,
      pending: pendingQuery.data?.length ?? 0,
      blocked: blockedDevicesQuery.data?.length ?? 0,
    };
  }, [devicesQuery.data, pendingQuery.data, visitorLogsQuery.data, liveVisitors, blockedDevicesQuery.data]);

  return (
    <div className="max-w-[1440px] mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold">
                {bn ? 'ডিভাইস ও ভিজিটর সিকিউরিটি' : 'Device & Visitor Security'}
              </h1>
              <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {bn ? `${stats.live} জন লাইভ` : `${stats.live} Live`}
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              {bn
                ? 'পাবলিক সাইট ভিজিটর ট্র্যাকিং, মোবাইল মডেল, নেটওয়ার্ক/আইএসপি, লাইভ উপস্থিতি ও সিকিউরিটি কন্ট্রোল।'
                : 'Public visitor tracking, mobile models, network/ISP, live sessions & security controls.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-1.5"
            onClick={() => {
              devicesQuery.refetch();
              pendingQuery.refetch();
              visitorLogsQuery.refetch();
              blockedDevicesQuery.refetch();
              toast.success(bn ? 'তথ্য রিফ্রেশ হয়েছে' : 'Refreshed');
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {bn ? 'রিফ্রেশ' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          {
            label: bn ? 'লাইভ ভিজিটর' : 'Live Visitors',
            value: stats.live,
            icon: Radio,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-500/10',
            pulse: true,
          },
          {
            label: bn ? 'আজকের ভিজিট' : "Today's Visits",
            value: stats.todayVisits,
            icon: Activity,
            color: 'text-primary',
            bg: 'bg-primary/10',
          },
          {
            label: bn ? 'পাবলিক ভিজিটর' : 'Public Guests',
            value: stats.todayPublic,
            icon: Users,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-500/10',
          },
          {
            label: bn ? 'স্টাফ ডিভাইস' : 'Staff Devices',
            value: stats.staffTotal,
            icon: Smartphone,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-500/10',
          },
          {
            label: bn ? 'ব্লকড ডিভাইস' : 'Blocked Devices',
            value: stats.blocked,
            icon: Ban,
            color: 'text-destructive',
            bg: 'bg-destructive/10',
          },
        ].map((s) => (
          <Card key={s.label} className="rounded-[28px] border-border/60 hover:shadow-sm transition">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${s.bg} ${s.color}`}>
                <s.icon className={`h-5 w-5 ${s.pulse ? 'animate-pulse' : ''}`} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-none tracking-tight">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="live" className="space-y-4">
        <TabsList className="rounded-2xl p-1 bg-muted/60 flex-wrap h-auto gap-1">
          <TabsTrigger value="live" className="rounded-xl gap-1.5 py-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {bn ? 'লাইভ ভিজিটর' : 'Live Visitors'} ({liveVisitors.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl gap-1.5 py-2">
            <Clock className="h-3.5 w-3.5" />
            {bn ? 'ভিজিট হিস্ট্রি' : 'Visitor History'}
          </TabsTrigger>
          <TabsTrigger value="staff" className="rounded-xl gap-1.5 py-2">
            <UserCheck className="h-3.5 w-3.5" />
            {bn ? 'স্টাফ ডিভাইস' : 'Staff Devices'} ({stats.staffTotal})
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-xl gap-1.5 py-2">
            <Lock className="h-3.5 w-3.5" />
            {bn ? 'পেন্ডিং রিকোয়েস্ট' : 'Pending'} ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="blocked" className="rounded-xl gap-1.5 py-2">
            <Ban className="h-3.5 w-3.5 text-destructive" />
            {bn ? 'ব্লকড ডিভাইস' : 'Blocked'} ({stats.blocked})
          </TabsTrigger>
        </TabsList>

        {/* 1. Live Visitors Tab */}
        <TabsContent value="live">
          <Card className="rounded-[36px] overflow-hidden border-border/70">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    {bn ? 'এই মুহূর্তে সক্রিয় ভিজিটরগণ' : 'Active Visitors Right Now'}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bn
                      ? 'গত ৩ মিনিটে যারা সাইটের কোনো পেজে সক্রিয় ছিলেন। প্রতি ১০ সেকেন্ডে স্বয়ংক্রিয়ভাবে রিফ্রেশ হয়।'
                      : 'Visitors active in the last 3 minutes. Refreshes automatically every 10 seconds.'}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs px-3 py-1 rounded-xl">
                  {liveVisitors.length} {bn ? 'জন সক্রিয়' : 'active'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              {visitorLogsQuery.isLoading ? (
                <div className="p-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin" /></div>
              ) : liveVisitors.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-2">
                  <Globe className="h-10 w-10 mx-auto text-muted-foreground/40" />
                  <p className="text-sm font-medium">{bn ? 'বর্তমানে কোনো লাইভ ভিজিটর নেই' : 'No live visitors right now'}</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {bn
                      ? 'পাবলিক সাইটে কেউ প্রবেশ করলে বা ব্রাউজ করলে তার ডিভাইস ও নেটওয়ার্ক তথ্য সাথে সাথে এখানে প্রদর্শিত হবে।'
                      : 'When anyone visits or browses the public site, their device & network info will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="flex items-start gap-2.5 px-3.5 py-2.5 mb-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-100">
                    <ShieldAlert className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      {bn
                        ? '💡 নির্ভুল তথ্য নির্দেশিকা: (১) পরিচিতি: শুধুমাত্র পূর্বের লগইন বা পাবলিক ভর্তি/আবেদন ফরম থেকে নিশ্চিতভাবে পাওয়া ইমেইল/ফোন দেখানো হয় (অনুমান নয়)। (২) লোকেশন: ভিপিএন বা Cloudflare 1.1.1.1 WARP চালু থাকলে ব্যবহারকারীর আসল অবস্থান গোপন থাকে—সিস্টেম সেটিকে “ভিপিএন গেটওয়ে” হিসেবে চিহ্নিত করে রাখে যাতে কোনো ভুল ধারণা তৈরি না হয়।'
                        : '💡 Accuracy Guide: (1) Identity: Only emails/phones verified from previous logins or public forms are displayed. (2) Location: If VPN or Cloudflare WARP is active, the real location is masked—the system explicitly flags it as a "VPN Gateway" so there is no confusion.'}
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{bn ? 'স্ট্যাটাস ও ভিজিটর' : 'Status & Visitor'}</TableHead>
                        <TableHead>{bn ? 'বর্তমান পেজ' : 'Current Page'}</TableHead>
                        <TableHead>{bn ? 'মোবাইল / ডিভাইস' : 'Mobile / Device'}</TableHead>
                        <TableHead>{bn ? 'নেটওয়ার্ক ও আইএসপি' : 'Network & ISP'}</TableHead>
                        <TableHead>{bn ? 'লোকেশন ও আইপি' : 'Location & IP'}</TableHead>
                        <TableHead>{bn ? 'শেষ সক্রিয়' : 'Last Active'}</TableHead>
                        <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {liveVisitors.map((v) => {
                        const meta = v.metadata || {};
                        const devId = meta.device_id || '';
                        const isBlocked = devId ? blockedDeviceIds.has(devId) : false;
                        const isPublic = !v.user_id;
                        const identifiedEmail = v.user_email || meta.user_email;
                        const identifiedPhone = meta.user_phone;
                        const isVpnOrProxy = Boolean(meta.is_vpn || meta.is_proxy || (meta.isp && /cloudflare|vpn|proxy|hosting|google llc/i.test(meta.isp)));

                        return (
                          <TableRow key={v.id} className="hover:bg-muted/30">
                            {/* Visitor Identity */}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                <div>
                                  <div className="font-semibold text-sm">
                                    {identifiedEmail ? (
                                      <div className="flex flex-wrap items-center gap-1">
                                        <span className="text-foreground font-semibold">{identifiedEmail}</span>
                                        {isPublic && (
                                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium">
                                            {bn ? 'চিহ্নিত ভিজিটর' : 'Identified'}
                                          </Badge>
                                        )}
                                      </div>
                                    ) : identifiedPhone ? (
                                      <div className="flex flex-wrap items-center gap-1">
                                        <span className="text-foreground font-semibold">{identifiedPhone}</span>
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium">
                                          {bn ? 'চিহ্নিত মোবাইল' : 'Identified'}
                                        </Badge>
                                      </div>
                                    ) : (
                                      <div>
                                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                                          {bn ? 'পাবলিক ভিজিটর' : 'Public Guest'}
                                        </span>
                                        <span className="block text-[10px] text-muted-foreground font-normal">
                                          {bn ? 'অজ্ঞাত (কোনো ফরম পূরণ করেনি)' : 'Anonymous (No form submitted)'}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {meta.source_label && (
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">{meta.source_label}</p>
                                  )}
                                  {meta.user_name && (
                                    <p className="text-xs text-muted-foreground font-medium">{meta.user_name}</p>
                                  )}
                                  <p className="text-[11px] text-muted-foreground">
                                    {meta.session_id ? `সেশন: ${meta.session_id.slice(0, 10)}…` : '—'}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            {/* Current Page */}
                            <TableCell>
                              <div className="min-w-0 max-w-[200px]">
                                <Badge variant="outline" className="font-mono text-[11px] bg-background">
                                  {v.resource || '/'}
                                </Badge>
                                {meta.page_title && meta.page_title !== v.resource && (
                                  <p className="text-[11px] text-muted-foreground truncate mt-0.5" title={meta.page_title}>
                                    {meta.page_title}
                                  </p>
                                )}
                              </div>
                            </TableCell>

                            {/* Mobile / Device Model */}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {meta.device_type === 'desktop' ? (
                                  <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                                ) : (
                                  <Smartphone className="h-4 w-4 text-primary shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate max-w-[190px]">
                                    {meta.device_model || 'Unknown Device'}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {meta.os || ''} {meta.browser ? `• ${meta.browser}` : ''}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            {/* Network & ISP */}
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Signal className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-foreground truncate max-w-[150px]">
                                    {meta.isp || 'ইন্টারনেট সংযোগ'}
                                  </p>
                                  <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                    {meta.network_type && (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                                        {meta.network_type}
                                      </Badge>
                                    )}
                                    {isVpnOrProxy && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium">
                                        {bn ? '🛡️ ভিপিএন / প্রক্সি' : '🛡️ VPN/Proxy'}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Location & IP */}
                            <TableCell>
                              <div className="min-w-0">
                                {isVpnOrProxy ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold text-xs leading-tight">
                                      <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                      <span>
                                        {bn ? 'ভিপিএন গেটওয়ে: ' : 'VPN Gateway: '}
                                        {meta.vpn_gateway_location || [meta.city, meta.country].filter(Boolean).join(', ') || 'সার্ভার আইপি'}
                                      </span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/50 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 font-medium">
                                      {bn ? '⚠️ আসল অবস্থান ভিপিএন দিয়ে গোপন' : '⚠️ Hidden by VPN'}
                                    </Badge>
                                    {meta.gps_verified && (
                                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                        <MapPin className="h-2.5 w-2.5" />
                                        {bn ? '📍 জিপিএস নিশ্চিত' : '📍 GPS Verified'}
                                      </Badge>
                                    )}
                                    <code className="text-[10px] text-muted-foreground font-mono block">
                                      {v.ip_address || '—'}
                                    </code>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-xs font-semibold leading-tight text-foreground">
                                      {[meta.city, meta.region, meta.country].filter(Boolean).join(', ') || (bn ? 'অবস্থান অপ্রাপ্ত' : 'Location unavailable')}
                                    </p>
                                    <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                      {meta.gps_verified ? (
                                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                          {bn ? '📍 জিপিএস সঠিক' : '📍 GPS Verified'}
                                        </Badge>
                                      ) : meta.city ? (
                                        <span className="text-[10px] text-muted-foreground">
                                          {bn ? '📡 আইপি গেটওয়ে (আনুমানিক)' : '📡 ISP Gateway'}
                                        </span>
                                      ) : null}
                                    </div>
                                    <code className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                                      {v.ip_address || '—'}
                                    </code>
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* Timestamp */}
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                              </span>
                            </TableCell>

                            {/* Action */}
                            <TableCell className="text-right">
                              {isBlocked ? (
                                <Badge variant="destructive" className="rounded-lg text-[10px]">
                                  {bn ? 'ব্লকড' : 'Blocked'}
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="rounded-xl h-8 text-xs gap-1"
                                  onClick={() =>
                                    setBlockTarget({
                                      deviceId: devId,
                                      ip: v.ip_address || undefined,
                                      model: meta.device_model,
                                      location: [meta.city, meta.country].filter(Boolean).join(', '),
                                    })
                                  }
                                >
                                  <Ban className="h-3 w-3" />
                                  {bn ? 'ব্লক' : 'Block'}
                                </Button>
                              )}
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
        </TabsContent>

        {/* 2. Visitor History Tab */}
        <TabsContent value="history">
          <Card className="rounded-[36px] overflow-hidden border-border/70">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {bn ? 'ভিজিটরদের পূর্ণাঙ্গ লগ ও হিস্ট্রি' : 'Visitor Logs & Full History'}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {bn ? 'কে কোথায় থেকে কোন পেজে ঢুকেছেন, মোবাইল মডেল, নেটওয়ার্ক ও আইপি লগ।' : 'All page visits with device model, network, location and IP.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {/* Type Filter Buttons */}
                  <div className="inline-flex rounded-xl bg-muted/60 p-0.5 text-xs">
                    <button
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${historyFilter === 'all' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
                      onClick={() => setHistoryFilter('all')}
                    >
                      {bn ? 'সকল' : 'All'}
                    </button>
                    <button
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${historyFilter === 'public' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
                      onClick={() => setHistoryFilter('public')}
                    >
                      {bn ? 'পাবলিক' : 'Public'}
                    </button>
                    <button
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${historyFilter === 'user' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
                      onClick={() => setHistoryFilter('user')}
                    >
                      {bn ? 'স্টাফ' : 'Staff'}
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={bn ? 'মডেল, আইপি, শহর বা পেজ…' : 'Search model, IP, city…'}
                      className="pl-8 h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              {visitorLogsQuery.isLoading ? (
                <div className="p-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin" /></div>
              ) : filteredHistory.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground p-8">
                  {bn ? 'কোনো ভিজিটর হিস্ট্রি পাওয়া যায়নি।' : 'No visitor history found.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{bn ? 'সময়' : 'Time'}</TableHead>
                        <TableHead>{bn ? 'ভিজিটর' : 'Visitor'}</TableHead>
                        <TableHead>{bn ? 'পেজ' : 'Page'}</TableHead>
                        <TableHead>{bn ? 'ডিভাইস / মোবাইল' : 'Device / Mobile'}</TableHead>
                        <TableHead>{bn ? 'নেটওয়ার্ক / ISP' : 'Network / ISP'}</TableHead>
                        <TableHead>{bn ? 'লোকেশন' : 'Location'}</TableHead>
                        <TableHead>{bn ? 'IP' : 'IP'}</TableHead>
                        <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.map((log) => {
                        const meta = log.metadata || {};
                        const devId = meta.device_id || '';
                        const isBlocked = devId ? blockedDeviceIds.has(devId) : false;
                        const isPublic = !log.user_id;

                        return (
                          <TableRow key={log.id} className="hover:bg-muted/20">
                            {/* Time */}
                            <TableCell className="text-xs whitespace-nowrap">
                              <p className="font-medium">{format(new Date(log.created_at), 'dd/MM/yyyy')}</p>
                              <p className="text-[11px] text-muted-foreground">{format(new Date(log.created_at), 'hh:mm:ss a')}</p>
                            </TableCell>

                            {/* Visitor */}
                            <TableCell>
                              <div className="text-xs font-semibold">
                                {log.user_email ? (
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="text-foreground">{log.user_email}</span>
                                    {isPublic && (
                                      <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium">
                                        {bn ? 'চিহ্নিত' : 'Identified'}
                                      </Badge>
                                    )}
                                  </div>
                                ) : meta.user_email ? (
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="text-foreground">{meta.user_email}</span>
                                    <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium">
                                      {bn ? 'চিহ্নিত' : 'Identified'}
                                    </Badge>
                                  </div>
                                ) : meta.user_phone ? (
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="text-foreground">{meta.user_phone}</span>
                                    <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium">
                                      {bn ? 'মোবাইল' : 'Phone'}
                                    </Badge>
                                  </div>
                                ) : (
                                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                                    {bn ? 'পাবলিক ভিজিটর' : 'Public Guest'}
                                  </span>
                                )}
                              </div>
                              {meta.source_label && (
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">{meta.source_label}</p>
                              )}
                              {meta.user_name && (
                                <p className="text-[10px] text-muted-foreground">{meta.user_name}</p>
                              )}
                              {meta.session_id && (
                                <p className="text-[10px] text-muted-foreground font-mono">{meta.session_id.slice(0, 8)}</p>
                              )}
                            </TableCell>

                            {/* Page */}
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-[11px] bg-background max-w-[140px] truncate">
                                {log.resource || '/'}
                              </Badge>
                              {meta.page_title && (
                                <p className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={meta.page_title}>
                                  {meta.page_title}
                                </p>
                              )}
                            </TableCell>

                            {/* Device & Model */}
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {meta.device_type === 'desktop' ? (
                                  <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                ) : (
                                  <Smartphone className="h-3.5 w-3.5 text-primary shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate max-w-[170px]">
                                    {meta.device_model || 'Generic Device'}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate max-w-[170px]">
                                    {meta.os} {meta.browser ? `• ${meta.browser}` : ''}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            {/* ISP / Network */}
                            <TableCell>
                              <p className="text-xs truncate max-w-[140px] font-medium">{meta.isp || '—'}</p>
                              <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                {meta.network_type && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                    {meta.network_type}
                                  </Badge>
                                )}
                                {(meta.is_vpn || meta.is_proxy || (meta.isp && /cloudflare|vpn|proxy|hosting|google llc/i.test(meta.isp))) && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium">
                                    {bn ? '🛡️ ভিপিএন' : '🛡️ VPN'}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            {/* Location */}
                            <TableCell>
                              {(meta.is_vpn || meta.is_proxy || (meta.isp && /cloudflare|vpn|proxy|hosting|google llc/i.test(meta.isp))) ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold text-[11px] truncate max-w-[150px]">
                                    <ShieldAlert className="h-3 w-3 text-amber-600 shrink-0" />
                                    <span>{bn ? 'ভিপিএন: ' : 'VPN: '}{meta.vpn_gateway_location || [meta.city, meta.country].filter(Boolean).join(', ') || 'সার্ভার আইপি'}</span>
                                  </div>
                                  <span className="block text-[9px] text-amber-600 dark:text-amber-400 font-medium">
                                    {bn ? '⚠️ আসল অবস্থান গোপন' : '⚠️ Hidden location'}
                                  </span>
                                  {meta.gps_verified && (
                                    <span className="block text-[9px] text-emerald-600 font-semibold">
                                      {bn ? '📍 জিপিএস সঠিক' : '📍 GPS Verified'}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-center gap-1">
                                    <Globe className="h-3 w-3 text-primary shrink-0" />
                                    <span className="text-xs truncate max-w-[130px]">
                                      {[meta.city, meta.country].filter(Boolean).join(', ') || (bn ? 'অবস্থান অপ্রাপ্ত' : 'Unavailable')}
                                    </span>
                                  </div>
                                  <span className="block text-[9px] text-muted-foreground">
                                    {meta.gps_verified ? (bn ? '📍 জিপিএস নিশ্চিত' : '📍 GPS Verified') : (meta.city ? (bn ? '📡 আইপি গেটওয়ে' : '📡 IP Gateway') : '')}
                                  </span>
                                </div>
                              )}
                            </TableCell>

                            {/* IP */}
                            <TableCell>
                              <code className="text-[11px] font-mono text-muted-foreground">{log.ip_address || '—'}</code>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right space-x-1 whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 rounded-lg"
                                title={bn ? 'বিস্তারিত দেখুন' : 'View details'}
                                onClick={() => setDetailsLog(log)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>

                              {isBlocked ? (
                                <Badge variant="destructive" className="rounded-lg text-[10px]">
                                  {bn ? 'ব্লকড' : 'Blocked'}
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 rounded-xl text-xs gap-1"
                                  onClick={() =>
                                    setBlockTarget({
                                      deviceId: devId,
                                      ip: log.ip_address || undefined,
                                      model: meta.device_model,
                                      location: [meta.city, meta.country].filter(Boolean).join(', '),
                                    })
                                  }
                                >
                                  <Ban className="h-3 w-3" />
                                  {bn ? 'ব্লক' : 'Block'}
                                </Button>
                              )}
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
        </TabsContent>

        {/* 3. Registered Staff Devices Tab */}
        <TabsContent value="staff">
          <Card className="rounded-[36px] overflow-hidden border-border/70">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <CardTitle className="text-base">
                  {bn ? 'নিবন্ধিত স্টাফ ডিভাইসসমূহ' : 'Registered Staff Devices'}
                </CardTitle>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={bn ? 'নাম, ডিভাইস বা লোকেশন খুঁজুন…' : 'Search name, device or location…'}
                    className="pl-9 rounded-2xl h-9 text-xs"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              {devicesQuery.isLoading ? (
                <div className="p-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin" /></div>
              ) : filteredStaff.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground p-6">
                  {bn ? 'কোনো স্টাফ ডিভাইস পাওয়া যায়নি।' : 'No devices found.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{bn ? 'স্টাফ' : 'Staff'}</TableHead>
                        <TableHead>{bn ? 'ডিভাইস' : 'Device'}</TableHead>
                        <TableHead>{bn ? 'লোকেশন' : 'Location'}</TableHead>
                        <TableHead>{bn ? 'IP ও নেটওয়ার্ক' : 'IP & Network'}</TableHead>
                        <TableHead>{bn ? 'নিবন্ধন' : 'Registered'}</TableHead>
                        <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                        <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff.map((d) => (
                        <TableRow key={d.id} className="hover:bg-muted/20">
                          <TableCell>
                            <p className="font-semibold text-sm">{d.user_name}</p>
                            <p className="text-xs text-muted-foreground">{d.user_email ?? '—'}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {d.os?.toLowerCase().includes('mac') || d.os?.toLowerCase().includes('windows') ? (
                                <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                              ) : (
                                <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
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
                              {bn ? 'সর্বশেষ' : 'Last'}: {format(new Date(d.last_seen_at), 'dd/MM hh:mm a')}
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
                                className="rounded-xl h-8"
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

        {/* 4. Pending Approval Requests Tab */}
        <TabsContent value="pending">
          <Card className="rounded-[36px] overflow-hidden border-border/70">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
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
                          <p className="text-sm font-medium">{r.device_model ?? '—'}</p>
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
                          {format(new Date(r.created_at), 'dd/MM/yyyy hh:mm a')}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 h-8"
                            onClick={() => approveMut.mutate(r.id)}
                            disabled={approveMut.isPending}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {bn ? 'অনুমোদন' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="rounded-xl h-8"
                            onClick={() => rejectMut.mutate(r.id)}
                            disabled={rejectMut.isPending}
                          >
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

        {/* 5. Blocked Devices Tab */}
        <TabsContent value="blocked">
          <Card className="rounded-[36px] overflow-hidden border-border/70">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-destructive flex items-center gap-2">
                    <Ban className="h-4 w-4" />
                    {bn ? 'স্থায়ীভাবে নিষিদ্ধ ডিভাইসসমূহ' : 'Permanently Blocked Devices'}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {bn
                      ? 'এই ডিভাইসগুলো থেকে সাইটের কোনো অংশ অ্যাক্সেস করা যাবে না।'
                      : 'These devices/IPs are completely restricted from accessing the site.'}
                  </p>
                </div>
                <Badge variant="destructive" className="rounded-xl text-xs">
                  {blockedDevicesQuery.data?.length ?? 0} {bn ? 'টি ব্লকড' : 'blocked'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              {blockedDevicesQuery.isLoading ? (
                <div className="p-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin" /></div>
              ) : (blockedDevicesQuery.data?.length ?? 0) === 0 ? (
                <div className="text-center py-12 px-4 space-y-2">
                  <ShieldCheck className="h-10 w-10 mx-auto text-emerald-500/50" />
                  <p className="text-sm font-medium">{bn ? 'কোনো ডিভাইস বর্তমানে ব্লকড নেই' : 'No blocked devices'}</p>
                  <p className="text-xs text-muted-foreground">
                    {bn ? 'সব ব্যবহারকারী ও পাবলিক ভিজিটর স্বাভাবিকভাবে সাইট ব্যবহার করছেন।' : 'All visitors are browsing normally.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{bn ? 'ডিভাইস আইডি' : 'Device ID'}</TableHead>
                        <TableHead>{bn ? 'কারণ' : 'Reason'}</TableHead>
                        <TableHead>{bn ? 'সর্বশেষ আইপি ও লোকেশন' : 'Last IP & Location'}</TableHead>
                        <TableHead>{bn ? 'চেষ্টার সংখ্যা' : 'Attempts'}</TableHead>
                        <TableHead>{bn ? 'ব্লকের তারিখ' : 'Blocked At'}</TableHead>
                        <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blockedDevicesQuery.data!.map((b) => (
                        <TableRow key={b.id} className="hover:bg-destructive/5">
                          <TableCell>
                            <code className="text-xs font-mono bg-muted/60 px-2 py-0.5 rounded-lg">
                              {b.device_id.slice(0, 18)}…
                            </code>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs font-medium text-destructive">{b.reason}</p>
                            {b.notes && <p className="text-[11px] text-muted-foreground">{b.notes}</p>}
                          </TableCell>
                          <TableCell>
                            <p className="text-xs font-mono">{b.last_ip || '—'}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {[b.last_city, b.last_country].filter(Boolean).join(', ') || '—'}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {b.attempt_count} {bn ? 'বার' : 'times'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(b.blocked_at), 'dd/MM/yyyy hh:mm a')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl h-8 text-xs gap-1.5 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
                              onClick={() => setUnblockDeviceId(b.device_id)}
                              disabled={unblockMut.isPending}
                            >
                              <Unlock className="h-3.5 w-3.5" />
                              {bn ? 'আনব্লক করুন' : 'Unblock'}
                            </Button>
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
      </Tabs>

      {/* Revoke Staff Device Dialog */}
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

      {/* Block Confirmation Dialog */}
      <Dialog open={!!blockTarget} onOpenChange={(o) => !o && setBlockTarget(null)}>
        <DialogContent className="rounded-[32px] max-w-md">
          <DialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-2">
              <Ban className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg">
              {bn ? 'ডিভাইস বা ভিজিটর ব্লক করবেন?' : 'Block this Device / Visitor?'}
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              {bn
                ? 'ব্লক করার পর এই ডিভাইস অথবা আইপি থেকে সাইটে প্রবেশ নিষিদ্ধ থাকবে।'
                : 'This device or IP will be immediately banned from viewing or accessing the website.'}
            </DialogDescription>
          </DialogHeader>

          {blockTarget && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/40 rounded-2xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{bn ? 'ডিভাইস মডেল:' : 'Device:'}</span>
                  <span className="font-semibold">{blockTarget.model || 'Unknown'}</span>
                </div>
                {blockTarget.ip && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IP Address:</span>
                    <span className="font-mono">{blockTarget.ip}</span>
                  </div>
                )}
                {blockTarget.location && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{bn ? 'লোকেশন:' : 'Location:'}</span>
                    <span>{blockTarget.location}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">{bn ? 'ব্লক করার কারণ:' : 'Reason for block:'}</label>
                <Input
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder={bn ? 'কারণ লিখুন…' : 'Enter block reason…'}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">{bn ? 'অতিরিক্ত নোট (ঐচ্ছিক):' : 'Notes (optional):'}</label>
                <Input
                  value={blockNotes}
                  onChange={(e) => setBlockNotes(e.target.value)}
                  placeholder={bn ? 'এডমিন নোট…' : 'Internal notes…'}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-xl" onClick={() => setBlockTarget(null)}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl gap-1.5"
              disabled={blockMut.isPending}
              onClick={() => {
                if (!blockTarget) return;
                blockMut.mutate({
                  deviceId: blockTarget.deviceId,
                  reason: blockReason,
                  notes: blockNotes,
                  ip: blockTarget.ip,
                });
              }}
            >
              {blockMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              {bn ? 'স্থায়ীভাবে ব্লক করুন' : 'Permanently Block'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unblock Confirmation Dialog */}
      <Dialog open={!!unblockDeviceId} onOpenChange={(o) => !o && setUnblockDeviceId(null)}>
        <DialogContent className="rounded-[32px] max-w-sm">
          <DialogHeader>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <Unlock className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg">
              {bn ? 'ডিভাইসটি আনব্লক করবেন?' : 'Unblock this Device?'}
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              {bn
                ? 'আনব্লক করলে এই ডিভাইস থেকে পুনরায় সাইট ব্রাউজ ও লগইন করা সম্ভব হবে।'
                : 'Unblocking will immediately restore full site access to this device.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-xl" onClick={() => setUnblockDeviceId(null)}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              disabled={unblockMut.isPending}
              onClick={() => unblockDeviceId && unblockMut.mutate(unblockDeviceId)}
            >
              {unblockMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
              {bn ? 'হ্যাঁ, আনব্লক করুন' : 'Yes, Unblock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deep Inspection Details Modal */}
      <Dialog open={!!detailsLog} onOpenChange={(o) => !o && setDetailsLog(null)}>
        <DialogContent className="rounded-[36px] max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-primary" />
              {bn ? 'ভিজিটের বিস্তারিত তথ্য' : 'Visit Details'}
            </DialogTitle>
          </DialogHeader>

          {detailsLog && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-muted/30 rounded-2xl">
                  <p className="text-muted-foreground">{bn ? 'পেজ' : 'Page'}</p>
                  <p className="font-mono font-semibold mt-0.5">{detailsLog.resource || '/'}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl">
                  <p className="text-muted-foreground">{bn ? 'সময়' : 'Time'}</p>
                  <p className="font-semibold mt-0.5">{format(new Date(detailsLog.created_at), 'dd/MM/yyyy hh:mm:ss a')}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl col-span-2">
                  <p className="text-muted-foreground">{bn ? 'শনাক্তকৃত পরিচয় / ইমেইল' : 'Visitor Identity / Email'}</p>
                  <div className="mt-0.5">
                    {detailsLog.user_email || detailsLog.metadata?.user_email || detailsLog.metadata?.user_phone ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-primary font-bold text-sm">{detailsLog.user_email || detailsLog.metadata?.user_email || detailsLog.metadata?.user_phone}</span>
                        {detailsLog.metadata?.user_name && <span className="text-muted-foreground font-normal">({detailsLog.metadata?.user_name})</span>}
                        <Badge variant="secondary" className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {detailsLog.metadata?.source_label || (bn ? 'যাচাইকৃত' : 'Verified')}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground font-normal italic">
                        {bn ? 'অজ্ঞাত পাবলিক ভিজিটর (ডিভাইসে কোনো আবেদন ফরম পূরণ বা লগইন রেকর্ড নেই)' : 'Anonymous Guest (No form filled or login record)'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl">
                  <p className="text-muted-foreground">{bn ? 'আইপি অ্যাড্রেস' : 'IP Address'}</p>
                  <p className="font-mono font-semibold mt-0.5">{detailsLog.ip_address || '—'}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl">
                  <p className="text-muted-foreground">{bn ? 'মোবাইল / ডিভাইস' : 'Device'}</p>
                  <p className="font-semibold mt-0.5">{detailsLog.metadata?.device_model || '—'}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl">
                  <p className="text-muted-foreground">{bn ? 'নেটওয়ার্ক / ISP' : 'ISP'}</p>
                  <p className="font-semibold mt-0.5">{detailsLog.metadata?.isp || '—'}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl">
                  <p className="text-muted-foreground">{bn ? 'ভিপিএন / প্রক্সি স্ট্যাটাস' : 'VPN / Proxy Status'}</p>
                  <p className="font-semibold mt-0.5">
                    {detailsLog.metadata?.is_vpn || detailsLog.metadata?.is_proxy || (detailsLog.metadata?.isp && /cloudflare|vpn|proxy|hosting/i.test(detailsLog.metadata.isp)) ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        🛡️ {detailsLog.metadata?.vpn_note || 'ভিপিএন / প্রক্সি শনাক্তকৃত'}
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ সাধারণ ইন্টারনেট সংযোগ
                      </span>
                    )}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-2xl col-span-2">
                  <p className="text-muted-foreground">{bn ? 'অবস্থান (লোকেশন)' : 'Location'}</p>
                  <div className="mt-1">
                    {(detailsLog.metadata?.is_vpn || detailsLog.metadata?.is_proxy || (detailsLog.metadata?.isp && /cloudflare|vpn|proxy|hosting/i.test(detailsLog.metadata.isp))) ? (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-200 text-xs">
                          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>{bn ? 'ভিপিএন গেটওয়ে সার্ভার: ' : 'VPN Gateway: '}{detailsLog.metadata?.vpn_gateway_location || [detailsLog.metadata?.city, detailsLog.metadata?.country].filter(Boolean).join(', ') || 'বিদেশি গেটওয়ে'}</span>
                        </div>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                          {bn
                            ? '⚠️ সতর্কতা: ভিজিটরের ডিভাইসে ভিপিএন (Cloudflare 1.1.1.1 WARP বা প্রক্সি) চালু থাকায় আসল অবস্থান গোপন রয়েছে এবং এখানে ভিপিএন সার্ভারের ডাটা সেন্টার দেখাচ্ছে।'
                            : '⚠️ Warning: The visitor has active VPN/Proxy (e.g. Cloudflare WARP). Physical location is masked behind this gateway datacenter.'}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-sm">
                          {[detailsLog.metadata?.city, detailsLog.metadata?.region, detailsLog.metadata?.country].filter(Boolean).join(', ') || (bn ? 'অবস্থান অপ্রাপ্ত (শুধু আইপি সংরক্ষিত)' : 'Location unavailable')}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {detailsLog.metadata?.gps_verified
                            ? (bn ? '📍 স্যাটেলাইট জিপিএস নিশ্চিত (সঠিক কো-অর্ডিনেট)' : '📍 Satellite GPS Verified')
                            : (bn ? '📡 আইপি গেটওয়ে ভিত্তিক আনুমানিক অবস্থান' : '📡 Approximate IP Gateway')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {detailsLog.user_agent && (
                <div className="p-3 bg-muted/20 rounded-2xl text-xs space-y-1">
                  <p className="font-semibold text-muted-foreground">User Agent:</p>
                  <p className="font-mono text-[11px] break-all text-muted-foreground">{detailsLog.user_agent}</p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Full Metadata (JSON):</p>
                <pre className="text-[11px] bg-muted/40 p-3 rounded-2xl overflow-auto max-h-48 font-mono">
                  {JSON.stringify(detailsLog.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* JSON Report Modal */}
      <Dialog open={!!report} onOpenChange={(o) => !o && setReport(null)}>
        <DialogContent className="rounded-[36px] max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-4 w-4 text-primary" />
              {bn ? 'অপারেশন রিপোর্ট' : 'Operation Report'}
            </DialogTitle>
          </DialogHeader>
          <pre className="text-xs bg-muted/40 p-4 rounded-2xl overflow-auto max-h-[60vh] font-mono">
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
