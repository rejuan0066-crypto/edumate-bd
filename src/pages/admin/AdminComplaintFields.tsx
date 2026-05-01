import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Settings2, ArrowUp, ArrowDown, Lock, Pencil, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

type FieldRow = {
  id: string;
  field_key: string;
  label_bn: string;
  label_en: string;
  placeholder_bn: string | null;
  placeholder_en: string | null;
  field_type: string;
  options: any;
  is_visible: boolean;
  is_required: boolean;
  is_locked: boolean;
  min_length: number | null;
  max_length: number | null;
  display_order: number;
};

const AdminComplaintFields = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<FieldRow | null>(null);

  const { data: fields = [], isLoading } = useQuery({
    queryKey: ['complaint-field-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaint_field_config')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as unknown as FieldRow[];
    },
  });

  const updateMut = useMutation({
    mutationFn: async (patch: Partial<FieldRow> & { id: string }) => {
      const { error } = await supabase
        .from('complaint_field_config')
        .update(patch as any)
        .eq('id', patch.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaint-field-config'] });
      toast({ title: bn ? 'সফলভাবে আপডেট হয়েছে' : 'Updated successfully' });
    },
    onError: (err: any) => toast({
      title: bn ? 'ব্যর্থ' : 'Failed', description: err.message, variant: 'destructive',
    }),
  });

  const reorder = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...fields].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex((f) => f.id === id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx]; const b = sorted[swapIdx];
    await Promise.all([
      supabase.from('complaint_field_config').update({ display_order: b.display_order }).eq('id', a.id),
      supabase.from('complaint_field_config').update({ display_order: a.display_order }).eq('id', b.id),
    ]);
    qc.invalidateQueries({ queryKey: ['complaint-field-config'] });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings2 className="w-7 h-7 text-primary" />
            {bn ? 'অভিযোগ ফর্ম ফিল্ড সেটিংস' : 'Complaint Form Field Settings'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {bn
              ? 'কোন ফিল্ডগুলো দেখাবে, কোনগুলো আবশ্যক, এবং তাদের ক্রম এখান থেকে নিয়ন্ত্রণ করুন।'
              : 'Control which fields appear on the public complaint form, which are required, and their order.'}
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-2xl">
          <Link to="/admin/complaints">{bn ? 'ফিরে যান' : 'Back to Complaints'}</Link>
        </Button>
      </div>

      <Card className="rounded-[38px] border-0 bg-card/80 backdrop-blur-xl shadow-2xl">
        <CardHeader>
          <CardTitle>{bn ? 'ফিল্ড তালিকা' : 'Field List'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((f, i) => (
                <div
                  key={f.id}
                  className="flex flex-wrap items-center gap-3 p-4 rounded-[20px] border bg-background/40 hover:-translate-y-[3px] transition"
                >
                  <div className="flex flex-col">
                    <Button size="icon" variant="ghost" className="h-6 w-6"
                      disabled={i === 0} onClick={() => reorder(f.id, 'up')}>
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6"
                      disabled={i === fields.length - 1} onClick={() => reorder(f.id, 'down')}>
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <p className="font-medium flex items-center gap-2">
                      {bn ? f.label_bn : f.label_en}
                      {f.is_locked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{f.field_key} • {f.field_type}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {bn ? 'ক্রম' : 'Order'} {f.display_order}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs">{bn ? 'দৃশ্যমান' : 'Visible'}</Label>
                    <Switch
                      checked={f.is_visible}
                      disabled={f.is_locked}
                      onCheckedChange={(v) => updateMut.mutate({ id: f.id, is_visible: v })}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs">{bn ? 'আবশ্যক' : 'Required'}</Label>
                    <Switch
                      checked={f.is_required}
                      disabled={f.field_key === 'complainant_email'}
                      onCheckedChange={(v) => updateMut.mutate({ id: f.id, is_required: v })}
                    />
                  </div>

                  <Button size="icon" variant="ghost" onClick={() => setEditing(f)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            {bn
              ? 'নোট: ইমেইল ফিল্ড সর্বদা আবশ্যক — OTP ভেরিফিকেশনের জন্য প্রয়োজন।'
              : 'Note: The email field is always required — needed for OTP verification.'}
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-[38px] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{bn ? 'ফিল্ড এডিট করুন' : 'Edit Field'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'লেবেল (বাংলা)' : 'Label (BN)'}</Label>
                  <Input
                    value={editing.label_bn}
                    onChange={(e) => setEditing({ ...editing, label_bn: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>{bn ? 'লেবেল (ইংরেজি)' : 'Label (EN)'}</Label>
                  <Input
                    value={editing.label_en}
                    onChange={(e) => setEditing({ ...editing, label_en: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>{bn ? 'প্লেসহোল্ডার (বাংলা)' : 'Placeholder (BN)'}</Label>
                  <Input
                    value={editing.placeholder_bn || ''}
                    onChange={(e) => setEditing({ ...editing, placeholder_bn: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>{bn ? 'প্লেসহোল্ডার (ইংরেজি)' : 'Placeholder (EN)'}</Label>
                  <Input
                    value={editing.placeholder_en || ''}
                    onChange={(e) => setEditing({ ...editing, placeholder_en: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>{bn ? 'ন্যূনতম দৈর্ঘ্য' : 'Min Length'}</Label>
                  <Input
                    type="number"
                    value={editing.min_length ?? ''}
                    onChange={(e) => setEditing({ ...editing, min_length: e.target.value ? Number(e.target.value) : null })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>{bn ? 'সর্বোচ্চ দৈর্ঘ্য' : 'Max Length'}</Label>
                  <Input
                    type="number"
                    value={editing.max_length ?? ''}
                    onChange={(e) => setEditing({ ...editing, max_length: e.target.value ? Number(e.target.value) : null })}
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              onClick={() => {
                if (!editing) return;
                updateMut.mutate({
                  id: editing.id,
                  label_bn: editing.label_bn,
                  label_en: editing.label_en,
                  placeholder_bn: editing.placeholder_bn,
                  placeholder_en: editing.placeholder_en,
                  min_length: editing.min_length,
                  max_length: editing.max_length,
                });
                setEditing(null);
              }}
            >
              <Save className="w-4 h-4 mr-2" />
              {bn ? 'সংরক্ষণ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminComplaintFields;
