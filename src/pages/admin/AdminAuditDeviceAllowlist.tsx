import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDeviceId } from '@/hooks/useDeviceRegistration';
import { toast } from 'sonner';
import { ShieldCheck, Plus, Loader2, Lock, Trash2, Copy } from 'lucide-react';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';

type AuditDevice = {
  id: string;
  device_id: string;
  user_id: string | null;
  label: string | null;
  notes: string | null;
  is_active: boolean;
  added_by: string | null;
  revoked_at: string | null;
  created_at: string;
};

const AdminAuditDeviceAllowlist = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { role } = useAuth();
  const isSuperAdmin = role === 'super_admin';
  const qc = useQueryClient();
  const myDeviceId = getDeviceId();

  const [form, setForm] = useState({ device_id: '', label: '', notes: '' });
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['audit-device-allowlist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('authorized_audit_devices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AuditDevice[];
    },
    enabled: isSuperAdmin,
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const id = form.device_id.trim();
      if (!id) throw new Error(bn ? 'Device ID আবশ্যক' : 'Device ID required');
      const { error } = await supabase.rpc('add_audit_device', {
        _device_id: id,
        _user_id: null,
        _label: form.label.trim() || null,
        _notes: form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'অ্যালাউলিস্টে যোগ হয়েছে' : 'Added to allowlist');
      setForm({ device_id: '', label: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['audit-device-allowlist'] });
      qc.invalidateQueries({ queryKey: ['audit-device-check'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  });

  const revokeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('revoke_audit_device', { _device_uuid: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'রিভোক করা হয়েছে' : 'Revoked');
      qc.invalidateQueries({ queryKey: ['audit-device-allowlist'] });
      qc.invalidateQueries({ queryKey: ['audit-device-check'] });
      setRevokeId(null);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Error'),
  });

  if (!isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="max-w-[1440px] mx-auto p-6">
          <Card className="rounded-[45px] border-destructive/30">
            <CardContent className="p-12 text-center space-y-3">
              <Lock className="h-12 w-12 mx-auto text-destructive" />
              <p className="font-semibold">{bn ? 'অ্যাক্সেস নিষিদ্ধ' : 'Access denied'}</p>
              <p className="text-sm text-muted-foreground">
                {bn ? 'এই পেজ শুধুমাত্র super_admin দেখতে পারবেন।' : 'super_admin only.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-[1440px] mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">
              {bn ? 'অডিট ডিভাইস অ্যালাউলিস্ট' : 'Audit Device Allowlist'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {bn
                ? 'এই তালিকার ডিভাইসগুলোই কেবলমাত্র অডিট রিপোর্ট পেজগুলোতে এক্সেস পাবে।'
                : 'Only devices in this list can access audit-report pages.'}
            </p>
          </div>
        </div>

        {/* Current device hint */}
        <Card className="rounded-[45px] bg-muted/30 border-dashed">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                {bn ? 'এই ব্রাউজারের ডিভাইস আইডি' : 'This browser device ID'}
              </p>
              <code className="text-xs font-mono break-all">{myDeviceId}</code>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(myDeviceId);
                  toast.success(bn ? 'কপি হয়েছে' : 'Copied');
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                {bn ? 'কপি' : 'Copy'}
              </Button>
              <Button
                size="sm"
                onClick={() => setForm((p) => ({ ...p, device_id: myDeviceId }))}
              >
                {bn ? 'এই ডিভাইস ব্যবহার করুন' : 'Use this device'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Add form */}
        <Card className="rounded-[45px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-primary" />
              {bn ? 'নতুন ডিভাইস অ্যালাউলিস্টে যোগ করুন' : 'Add device to allowlist'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">{bn ? 'ডিভাইস আইডি' : 'Device ID'} *</Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  value={form.device_id}
                  onChange={(e) => setForm((p) => ({ ...p, device_id: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">{bn ? 'লেবেল' : 'Label'}</Label>
                <Input
                  className="mt-1"
                  placeholder={bn ? 'যেমন: অফিস ল্যাপটপ' : 'e.g. Office laptop'}
                  value={form.label}
                  onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">{bn ? 'নোট' : 'Notes'}</Label>
                <Input
                  className="mt-1"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>
            <Button className="mt-4" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
              {addMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {bn ? 'যোগ করুন' : 'Add'}
            </Button>
          </CardContent>
        </Card>

        {/* List */}
        <Card className="rounded-[45px]">
          <CardHeader>
            <CardTitle className="text-base">
              {bn ? 'বর্তমান অ্যালাউলিস্ট' : 'Current allowlist'}
              <Badge variant="secondary" className="ml-2">
                {listQuery.data?.length ?? 0}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-4">
            {listQuery.isLoading ? (
              <div className="p-8 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin" /></div>
            ) : !listQuery.data?.length ? (
              <p className="text-sm text-center text-muted-foreground p-6">
                {bn ? 'এখনো কোনো ডিভাইস যোগ করা হয়নি।' : 'No devices added yet.'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{bn ? 'লেবেল' : 'Label'}</TableHead>
                    <TableHead>{bn ? 'ডিভাইস আইডি' : 'Device ID'}</TableHead>
                    <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                    <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listQuery.data.map((d) => (
                    <TableRow key={d.id} className="bg-muted/20">
                      <TableCell className="font-semibold">
                        {d.label || <span className="text-muted-foreground">—</span>}
                        {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs font-mono break-all">{d.device_id}</code>
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
                          <Button size="sm" variant="ghost" onClick={() => setRevokeId(d.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <DeleteConfirmDialog
          open={!!revokeId}
          onOpenChange={(o) => !o && setRevokeId(null)}
          onConfirm={() => revokeId && revokeMut.mutate(revokeId)}
          title={bn ? 'ডিভাইস রিভোক করবেন?' : 'Revoke device?'}
          description={
            bn
              ? 'এই ডিভাইস আর অডিট পেজে এক্সেস পাবে না।'
              : 'This device will lose access to audit pages.'
          }
        />
      </div>
    </AdminLayout>
  );
};

export default AdminAuditDeviceAllowlist;
