import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Smartphone, QrCode, Loader2, ImageIcon } from 'lucide-react';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';

const METHOD_TYPES = [
  { value: 'bkash', label: 'bKash', labelBn: 'বিকাশ', color: '#E2136E' },
  { value: 'nagad', label: 'Nagad', labelBn: 'নগদ', color: '#F6A623' },
  { value: 'rocket', label: 'Rocket', labelBn: 'রকেট', color: '#8B2FC9' },
  { value: 'upay', label: 'Upay', labelBn: 'উপায়', color: '#00A651' },
  { value: 'bank', label: 'Bank Transfer', labelBn: 'ব্যাংক ট্রান্সফার', color: '#1a73e8' },
];

interface FormState {
  method_type: string;
  method_name: string;
  method_name_bn: string;
  account_number: string;
  account_holder: string;
  account_holder_bn: string;
  qr_code_url: string;
  instructions: string;
  instructions_bn: string;
  is_active: boolean;
  sort_order: number;
}

const emptyForm: FormState = {
  method_type: 'bkash',
  method_name: 'bKash',
  method_name_bn: 'বিকাশ',
  account_number: '',
  account_holder: '',
  account_holder_bn: '',
  qr_code_url: '',
  instructions: '',
  instructions_bn: '',
  is_active: true,
  sort_order: 0,
};

const ManualPaymentMethodsManager = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['manual-payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manual_payment_methods')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormState & { id?: string }) => {
      const { id, ...rest } = values;
      if (id) {
        const { error } = await supabase.from('manual_payment_methods').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('manual_payment_methods').insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-payment-methods'] });
      toast.success(bn ? 'সংরক্ষিত হয়েছে' : 'Saved successfully');
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('manual_payment_methods').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-payment-methods'] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const openEdit = (m: any) => {
    setEditId(m.id);
    setForm({
      method_type: m.method_type,
      method_name: m.method_name,
      method_name_bn: m.method_name_bn,
      account_number: m.account_number,
      account_holder: m.account_holder || '',
      account_holder_bn: m.account_holder_bn || '',
      qr_code_url: m.qr_code_url || '',
      instructions: m.instructions || '',
      instructions_bn: m.instructions_bn || '',
      is_active: m.is_active,
      sort_order: m.sort_order || 0,
    });
    setDialogOpen(true);
  };

  const handleTypeChange = (type: string) => {
    const t = METHOD_TYPES.find(m => m.value === type);
    setForm(prev => ({
      ...prev,
      method_type: type,
      method_name: t?.label || type,
      method_name_bn: t?.labelBn || type,
    }));
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `payment-qr/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('website-assets').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('website-assets').getPublicUrl(path);
      setForm(prev => ({ ...prev, qr_code_url: data.publicUrl }));
      toast.success(bn ? 'QR কোড আপলোড হয়েছে' : 'QR code uploaded');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!form.account_number) {
      toast.error(bn ? 'অ্যাকাউন্ট নম্বর আবশ্যক' : 'Account number required');
      return;
    }
    saveMutation.mutate(editId ? { ...form, id: editId } : form);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          {bn ? 'ম্যানুয়াল পেমেন্ট পদ্ধতি' : 'Manual Payment Methods'}
        </h3>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="btn-primary-gradient">
              <Plus className="w-4 h-4 mr-1" /> {bn ? 'নতুন যোগ' : 'Add New'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? (bn ? 'সম্পাদনা' : 'Edit Method') : (bn ? 'নতুন পদ্ধতি যোগ' : 'Add New Method')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>{bn ? 'পদ্ধতির ধরন' : 'Method Type'}</Label>
                <Select value={form.method_type} onValueChange={handleTypeChange}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METHOD_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{bn ? t.labelBn : t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'নাম (English)' : 'Name (English)'}</Label>
                  <Input className="mt-1" value={form.method_name} onChange={e => setForm(p => ({ ...p, method_name: e.target.value }))} />
                </div>
                <div>
                  <Label>{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'}</Label>
                  <Input className="mt-1" value={form.method_name_bn} onChange={e => setForm(p => ({ ...p, method_name_bn: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>{bn ? 'অ্যাকাউন্ট / মোবাইল নম্বর' : 'Account / Mobile Number'} *</Label>
                <Input className="mt-1" value={form.account_number} onChange={e => setForm(p => ({ ...p, account_number: e.target.value }))} placeholder="01XXXXXXXXX" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'অ্যাকাউন্ট হোল্ডার (EN)' : 'Account Holder (EN)'}</Label>
                  <Input className="mt-1" value={form.account_holder} onChange={e => setForm(p => ({ ...p, account_holder: e.target.value }))} />
                </div>
                <div>
                  <Label>{bn ? 'অ্যাকাউন্ট হোল্ডার (বাংলা)' : 'Account Holder (BN)'}</Label>
                  <Input className="mt-1" value={form.account_holder_bn} onChange={e => setForm(p => ({ ...p, account_holder_bn: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <QrCode className="w-4 h-4" /> {bn ? 'QR কোড ছবি' : 'QR Code Image'}
                </Label>
                <div className="mt-1 flex items-center gap-3">
                  {form.qr_code_url && (
                    <img src={form.qr_code_url} alt="QR" className="w-20 h-20 rounded-lg border object-contain" />
                  )}
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed hover:bg-secondary/50 text-sm text-muted-foreground">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                      {bn ? 'ছবি আপলোড' : 'Upload Image'}
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload} disabled={uploading} />
                  </label>
                </div>
              </div>
              <div>
                <Label>{bn ? 'নির্দেশনা (বাংলা)' : 'Instructions (Bangla)'}</Label>
                <Textarea className="mt-1" rows={2} value={form.instructions_bn} onChange={e => setForm(p => ({ ...p, instructions_bn: e.target.value }))} placeholder={bn ? 'উপরের নম্বরে Send Money করুন...' : 'Send money to above number...'} />
              </div>
              <div>
                <Label>{bn ? 'নির্দেশনা (English)' : 'Instructions (English)'}</Label>
                <Textarea className="mt-1" rows={2} value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                <Label>{bn ? 'সক্রিয়' : 'Active'}</Label>
              </div>
              <div>
                <Label>{bn ? 'ক্রম' : 'Sort Order'}</Label>
                <Input type="number" className="mt-1 w-24" value={form.sort_order || ''} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary-gradient flex-1">
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  {bn ? 'সংরক্ষণ' : 'Save'}
                </Button>
                <Button variant="outline" onClick={closeDialog}>{bn ? 'বাতিল' : 'Cancel'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-xs text-muted-foreground">
        {bn ? 'এখানে বিকাশ/নগদ/রকেট নম্বর ও QR কোড যোগ করুন। পাবলিক দান ও ফি পেমেন্ট পেজে দেখানো হবে।' : 'Add bKash/Nagad/Rocket numbers and QR codes here. Shown on public donation & fee payment pages.'}
      </p>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</div>
      ) : methods.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground card-elevated rounded-xl">
          <Smartphone className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>{bn ? 'কোনো পেমেন্ট পদ্ধতি যোগ করা হয়নি' : 'No payment methods added yet'}</p>
        </div>
      ) : (
        <div className="card-elevated rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead>{bn ? 'পদ্ধতি' : 'Method'}</TableHead>
                <TableHead>{bn ? 'নম্বর' : 'Number'}</TableHead>
                <TableHead>{bn ? 'হোল্ডার' : 'Holder'}</TableHead>
                <TableHead>{bn ? 'QR' : 'QR'}</TableHead>
                <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                <TableHead>{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {methods.map((m: any) => {
                const mt = METHOD_TYPES.find(t => t.value === m.method_type);
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Badge style={{ backgroundColor: mt?.color || '#888', color: '#fff' }} className="text-xs">
                        {bn ? m.method_name_bn : m.method_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{m.account_number}</TableCell>
                    <TableCell className="text-sm">{bn ? (m.account_holder_bn || m.account_holder || '-') : (m.account_holder || '-')}</TableCell>
                    <TableCell>
                      {m.qr_code_url ? (
                        <img src={m.qr_code_url} alt="QR" className="w-10 h-10 rounded border object-contain" />
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.is_active ? 'default' : 'secondary'} className="text-xs">
                        {m.is_active ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(m)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ id: m.id, name: bn ? m.method_name_bn : m.method_name })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
        title={bn ? 'পেমেন্ট পদ্ধতি মুছুন' : 'Delete Payment Method'}
        description={bn ? `"${deleteTarget?.name}" মুছে ফেলতে চান?` : `Delete "${deleteTarget?.name}"?`}
      />
    </div>
  );
};

export default ManualPaymentMethodsManager;
