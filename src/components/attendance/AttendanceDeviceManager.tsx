import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Fingerprint, QrCode, CreditCard, Wifi, WifiOff, Monitor, Save } from 'lucide-react';
import { useConfirm } from "@/contexts/ConfirmContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEVICE_TYPES = [
  { value: 'fingerprint', labelBn: 'ফিঙ্গারপ্রিন্ট ডিভাইস', labelEn: 'Fingerprint Device', icon: Fingerprint },
  { value: 'qr_scanner', labelBn: 'QR স্ক্যানার', labelEn: 'QR Scanner', icon: QrCode },
  { value: 'card_reader', labelBn: 'কার্ড রিডার', labelEn: 'Card Reader', icon: CreditCard },
  { value: 'face_recognition', labelBn: 'ফেস রিকগনিশন', labelEn: 'Face Recognition', icon: Monitor },
];

const emptyForm = {
  name: '', name_bn: '', device_type: 'fingerprint',
  ip_address: '', port: '', model: '', serial_number: '',
  location: '', location_bn: '', is_active: true,
  config: {} as Record<string, any>,
};

const AttendanceDeviceManager = ({ open, onOpenChange }: Props) => {
  const confirm = useConfirm();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [showForm, setShowForm] = useState(false);

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['attendance-devices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_devices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: async (device: typeof form & { id?: string }) => {
      const payload = {
        name: device.name,
        name_bn: device.name_bn,
        device_type: device.device_type,
        ip_address: device.ip_address || null,
        port: device.port ? parseInt(String(device.port)) : null,
        model: device.model || null,
        serial_number: device.serial_number || null,
        location: device.location || null,
        location_bn: device.location_bn || null,
        is_active: device.is_active,
        config: device.config || {},
      };
      if (editing) {
        const { error } = await supabase.from('attendance_devices').update(payload).eq('id', editing);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('attendance_devices').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-devices'] });
      toast.success(bn ? 'ডিভাইস সেভ হয়েছে' : 'Device saved');
      resetForm();
    },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('attendance_devices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-devices'] });
      toast.success(bn ? 'ডিভাইস মুছে ফেলা হয়েছে' : 'Device deleted');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('attendance_devices').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance-devices'] }),
  });

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditing(null);
    setShowForm(false);
  };

  const editDevice = (d: any) => {
    setForm({
      name: d.name, name_bn: d.name_bn, device_type: d.device_type,
      ip_address: d.ip_address || '', port: d.port ? String(d.port) : '',
      model: d.model || '', serial_number: d.serial_number || '',
      location: d.location || '', location_bn: d.location_bn || '',
      is_active: d.is_active, config: d.config || {},
    });
    setEditing(d.id);
    setShowForm(true);
  };

  const getIcon = (type: string) => {
    const dt = DEVICE_TYPES.find(t => t.value === type);
    return dt ? dt.icon : Monitor;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            {bn ? 'হার্ডওয়্যার ডিভাইস ব্যবস্থাপনা' : 'Hardware Device Management'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info banner */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
            <p className="font-medium text-primary mb-1">
              {bn ? '📡 হার্ডওয়্যার ইন্টিগ্রেশন' : '📡 Hardware Integration'}
            </p>
            <p className="text-muted-foreground text-xs">
              {bn
                ? 'ফিঙ্গারপ্রিন্ট মেশিন, QR স্ক্যানার, কার্ড রিডার বা ফেস রিকগনিশন ডিভাইস যুক্ত করুন। ডিভাইসের IP অ্যাড্রেস ও পোর্ট দিয়ে কানেক্ট করুন।'
                : 'Add fingerprint machines, QR scanners, card readers or face recognition devices. Connect using device IP address and port.'}
            </p>
          </div>

          {/* Device list */}
          {devices.length > 0 && !showForm && (
            <div className="space-y-2">
              {devices.map((d: any) => {
                const Icon = getIcon(d.device_type);
                const typeInfo = DEVICE_TYPES.find(t => t.value === d.device_type);
                return (
                  <Card key={d.id} className={`${!d.is_active ? 'opacity-60' : ''}`}>
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg ${d.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{bn ? d.name_bn : d.name}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {bn ? typeInfo?.labelBn : typeInfo?.labelEn}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {d.ip_address && (
                              <span className="flex items-center gap-1">
                                {d.is_active ? <Wifi className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3" />}
                                {d.ip_address}{d.port ? `:${d.port}` : ''}
                              </span>
                            )}
                            {d.model && <span>• {d.model}</span>}
                            {(d.location || d.location_bn) && <span>• {bn ? d.location_bn : d.location}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={d.is_active}
                          onCheckedChange={(v) => toggleMutation.mutate({ id: d.id, active: v })}
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editDevice(d)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                          if ((await confirm({ description: bn ? 'মুছে ফেলতে চান?' : 'Delete this device?', variant: 'destructive' }))) deleteMutation.mutate(d.id);
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Add/Edit form */}
          {showForm ? (
            <div className="space-y-3 border rounded-lg p-4">
              <h4 className="text-sm font-semibold">
                {editing ? (bn ? 'ডিভাইস সম্পাদনা' : 'Edit Device') : (bn ? 'নতুন ডিভাইস যোগ করুন' : 'Add New Device')}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'}</Label>
                  <Input value={form.name_bn} onChange={e => setForm(f => ({ ...f, name_bn: e.target.value }))} placeholder="ফিঙ্গারপ্রিন্ট মেশিন - ১" />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Fingerprint Machine - 1" />
                </div>
              </div>

              <div>
                <Label className="text-xs">{bn ? 'ডিভাইসের ধরন' : 'Device Type'}</Label>
                <Select value={form.device_type} onValueChange={v => setForm(f => ({ ...f, device_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {bn ? t.labelBn : t.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{bn ? 'আইপি অ্যাড্রেস' : 'IP Address'}</Label>
                  <Input value={form.ip_address} onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))} placeholder="192.168.1.100" />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'পোর্ট' : 'Port'}</Label>
                  <Input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: e.target.value }))} placeholder="4370" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{bn ? 'মডেল' : 'Model'}</Label>
                  <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="ZKTeco K40 / Hikvision DS-K1T341" />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'সিরিয়াল নম্বর' : 'Serial Number'}</Label>
                  <Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} placeholder="SN-123456" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{bn ? 'স্থান (বাংলা)' : 'Location (Bangla)'}</Label>
                  <Input value={form.location_bn} onChange={e => setForm(f => ({ ...f, location_bn: e.target.value }))} placeholder="প্রধান গেট" />
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'স্থান (ইংরেজি)' : 'Location (English)'}</Label>
                  <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Main Gate" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label className="text-xs">{bn ? 'সক্রিয়' : 'Active'}</Label>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" size="sm" onClick={() => saveMutation.mutate(form)} disabled={!form.name || !form.name_bn || saveMutation.isPending}>
                  <Save className="h-4 w-4 mr-1" />
                  {editing ? (bn ? 'আপডেট' : 'Update') : (bn ? 'সেভ করুন' : 'Save')}
                </Button>
                <Button variant="outline" size="sm" onClick={resetForm}>
                  {bn ? 'বাতিল' : 'Cancel'}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {bn ? 'নতুন ডিভাইস যোগ করুন' : 'Add New Device'}
            </Button>
          )}

          {/* Empty state */}
          {!isLoading && devices.length === 0 && !showForm && (
            <div className="text-center py-8 text-muted-foreground">
              <Fingerprint className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{bn ? 'কোনো ডিভাইস যোগ করা হয়নি' : 'No devices added yet'}</p>
              <p className="text-xs mt-1">
                {bn ? 'উপরের বাটনে ক্লিক করে ডিভাইস যোগ করুন' : 'Click the button above to add a device'}
              </p>
            </div>
          )}

          {/* Supported devices info */}
          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
              {bn ? 'সমর্থিত ডিভাইসসমূহ:' : 'Supported Devices:'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEVICE_TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <div key={t.value} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{bn ? t.labelBn : t.labelEn}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              {bn
                ? '* ZKTeco, Hikvision, Dahua ইত্যাদি ব্র্যান্ডের ডিভাইস সাপোর্ট করে। ডিভাইসটি নেটওয়ার্কে সংযুক্ত থাকতে হবে।'
                : '* Supports ZKTeco, Hikvision, Dahua and similar brands. Device must be connected to the network.'}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceDeviceManager;
