import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Fingerprint, Copy, RefreshCw, Plus, Trash2, KeyRound } from 'lucide-react';
import { useConfirm } from '@/contexts/ConfirmContext';

interface StaffRow { id: string; name_bn: string | null; name_en: string | null; staff_id: string | null }

const SETTINGS_KEY = 'machine_punch_api_key';
const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/machine-punch`;

const randomKey = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
};

const MachineAttendanceTab = ({ staff }: { staff: StaffRow[] }) => {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [form, setForm] = useState({ staff_id: '', device_user_id: '', device_serial: '', finger_index: '' });
  const [logDate, setLogDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: apiKey } = useQuery({
    queryKey: ['machine-punch-key'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', SETTINGS_KEY).maybeSingle();
      return (typeof data?.value === 'string' ? data.value : '') || '';
    },
  });

  const { data: maps = [] } = useQuery({
    queryKey: ['staff-machine-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_machine_users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['machine-punch-log', logDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machine_punch_log')
        .select('*')
        .eq('punch_date', logDate)
        .order('punch_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const staffName = useMemo(() => {
    const m = new Map<string, string>();
    staff.forEach(s => m.set(s.id, s.name_bn || s.name_en || s.staff_id || '-'));
    return m;
  }, [staff]);

  const saveKey = useMutation({
    mutationFn: async () => {
      const value = randomKey();
      const { error } = await supabase.from('app_settings')
        .upsert({ key: SETTINGS_KEY, value: value as unknown as never, description: 'Attendance machine push API key' }, { onConflict: 'key' });
      if (error) throw error;
      return value;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['machine-punch-key'] }); toast.success('নতুন কী তৈরি হয়েছে'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMap = useMutation({
    mutationFn: async () => {
      if (!form.staff_id || !form.device_user_id.trim()) throw new Error('স্টাফ ও মেশিন ইউজার আইডি দিন');
      const { error } = await supabase.from('staff_machine_users').insert({
        staff_id: form.staff_id,
        device_user_id: form.device_user_id.trim(),
        device_serial: form.device_serial.trim() || null,
        finger_index: form.finger_index ? Number(form.finger_index) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ staff_id: '', device_user_id: '', device_serial: '', finger_index: '' });
      qc.invalidateQueries({ queryKey: ['staff-machine-users'] });
      toast.success('ফিঙ্গার ম্যাপিং যোগ হয়েছে');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMap = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('staff_machine_users').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff-machine-users'] }); toast.success('মুছে ফেলা হয়েছে'); },
  });

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('কপি হয়েছে'); };

  return (
    <div className="space-y-4">
      {/* Connection */}
      <Card className="rounded-[38px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Fingerprint className="h-4 w-4" /> মেশিন সংযোগ (পুশ API)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Endpoint URL</Label>
            <div className="flex gap-2">
              <Input readOnly value={ENDPOINT} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copy(ENDPOINT)}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">API Key (হেডার <code>x-api-key</code> অথবা <code>?key=</code>)</Label>
            <div className="flex gap-2">
              <Input readOnly value={apiKey || 'এখনো তৈরি হয়নি'} className="font-mono text-xs" />
              <Button variant="outline" size="icon" disabled={!apiKey} onClick={() => copy(apiKey!)}><Copy className="h-4 w-4" /></Button>
              <Button variant="outline" onClick={() => saveKey.mutate()} disabled={saveKey.isPending}>
                <KeyRound className="mr-2 h-4 w-4" />{apiKey ? 'নতুন কী' : 'কী তৈরি করুন'}
              </Button>
            </div>
          </div>
          <div className="rounded-[20px] bg-muted/60 p-3 text-xs leading-relaxed">
            <p className="mb-1 font-semibold">মেশিন/পুশার যেভাবে পাঠাবে:</p>
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px]">{`POST ${ENDPOINT}
x-api-key: <API Key>
{
  "device_serial": "ZK123456",
  "punches": [
    { "user_id": "12", "time": "2026-08-07 09:05:00" }
  ]
}`}</pre>
            <p className="mt-2 text-muted-foreground">
              প্রথম পাঞ্চ = চেক-ইন, পরের পাঞ্চ = চেক-আউট। শিফটে “মেশিন হাজিরা” চালু থাকলে ও পাঞ্চ উইন্ডোর ভিতরে হলে
              ঐ শিফটে বসবে, নইলে সাধারণ দৈনিক হাজিরায় বসবে। বিলম্ব ও আগাম যাওয়ার মিনিট স্বয়ংক্রিয় হিসাব হবে।
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Finger mapping */}
      <Card className="rounded-[38px]">
        <CardHeader>
          <CardTitle className="text-base">ফিঙ্গার / মেশিন ইউজার ম্যাপিং</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-5">
            <Select value={form.staff_id} onValueChange={v => setForm(f => ({ ...f, staff_id: v }))}>
              <SelectTrigger className="md:col-span-2"><SelectValue placeholder="স্টাফ নির্বাচন" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {staff.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name_bn || s.name_en} {s.staff_id ? `(${s.staff_id})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="মেশিন ইউজার আইডি" value={form.device_user_id}
              onChange={e => setForm(f => ({ ...f, device_user_id: e.target.value }))} />
            <Input placeholder="মেশিন সিরিয়াল (ঐচ্ছিক)" value={form.device_serial}
              onChange={e => setForm(f => ({ ...f, device_serial: e.target.value }))} />
            <div className="flex gap-2">
              <Input placeholder="ফিঙ্গার নং" value={form.finger_index}
                onChange={e => setForm(f => ({ ...f, finger_index: e.target.value.replace(/\D/g, '') }))} />
              <Button onClick={() => addMap.mutate()} disabled={addMap.isPending}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderSpacing: '0 6px', borderCollapse: 'separate' }}>
              <thead className="text-xs text-muted-foreground">
                <tr><th className="px-3 text-left">স্টাফ</th><th className="px-3 text-left">ইউজার আইডি</th><th className="px-3 text-left">সিরিয়াল</th><th className="px-3 text-left">ফিঙ্গার</th><th /></tr>
              </thead>
              <tbody>
                {maps.map((m: any) => (
                  <tr key={m.id} className="rounded-[20px] bg-muted/40 transition-transform hover:-translate-y-[3px]">
                    <td className="rounded-l-[20px] px-3 py-2">{staffName.get(m.staff_id) ?? '-'}</td>
                    <td className="px-3 py-2 font-mono">{m.device_user_id}</td>
                    <td className="px-3 py-2">{m.device_serial || '—'}</td>
                    <td className="px-3 py-2">{m.finger_index ?? '—'}</td>
                    <td className="rounded-r-[20px] px-3 py-2 text-right">
                      <Button variant="ghost" size="icon" onClick={async () => {
                        if (await confirm({ title: 'ম্যাপিং মুছবেন?', variant: 'destructive' })) delMap.mutate(m.id);
                      }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
                {!maps.length && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">কোনো ম্যাপিং নেই</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Punch log */}
      <Card className="rounded-[38px]">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">মেশিন পাঞ্চ লগ</CardTitle>
          <div className="flex items-center gap-2">
            <Input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="w-auto" />
            <Button variant="outline" size="icon" onClick={() => qc.invalidateQueries({ queryKey: ['machine-punch-log'] })}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderSpacing: '0 6px', borderCollapse: 'separate' }}>
            <thead className="text-xs text-muted-foreground">
              <tr><th className="px-3 text-left">সময়</th><th className="px-3 text-left">স্টাফ</th><th className="px-3 text-left">ইউজার আইডি</th><th className="px-3 text-left">মেশিন</th><th className="px-3 text-left">ফলাফল</th></tr>
            </thead>
            <tbody>
              {logs.map((l: any) => (
                <tr key={l.id} className="rounded-[20px] bg-muted/40">
                  <td className="rounded-l-[20px] px-3 py-2 font-mono">{String(l.punch_time).slice(0, 5)}</td>
                  <td className="px-3 py-2">{l.staff_id ? staffName.get(l.staff_id) ?? '-' : <Badge variant="destructive">অজানা ফিঙ্গার</Badge>}</td>
                  <td className="px-3 py-2 font-mono">{l.device_user_id}</td>
                  <td className="px-3 py-2">{l.device_serial || '—'}</td>
                  <td className="rounded-r-[20px] px-3 py-2">
                    {l.error
                      ? <Badge variant="destructive">{l.error}</Badge>
                      : <Badge variant="outline">{l.result === 'check_in' ? 'চেক-ইন' : l.result === 'check_out' ? 'চেক-আউট' : l.result || '—'}</Badge>}
                  </td>
                </tr>
              ))}
              {!logs.length && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">এই তারিখে কোনো পাঞ্চ আসেনি</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default MachineAttendanceTab;
