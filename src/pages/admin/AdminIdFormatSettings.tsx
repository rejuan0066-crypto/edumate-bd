import AdminLayout from '@/components/AdminLayout';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save, Hash } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePagePermissions } from '@/hooks/usePagePermissions';

type Row = {
  entity_key: string;
  label: string;
  prefix: string;
  include_year: boolean;
  serial_padding: number;
  separator: string;
  reset_mode: 'global' | 'yearly';
  start_serial: number;
};

const buildPreview = (r: Row) => {
  const year = new Date().getFullYear();
  const serial = String(r.start_serial).padStart(r.serial_padding, '0');
  return r.include_year
    ? `${r.prefix}${r.separator}${year}${r.separator}${serial}`
    : `${r.prefix}${r.separator}${serial}`;
};

const AdminIdFormatSettings = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { canEditItem } = usePagePermissions('/admin/settings');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('id_format_config')
        .select('*')
        .order('entity_key');
      if (error) toast.error(error.message);
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, []);

  const update = (key: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.entity_key === key ? { ...r, ...patch } : r)));
  };

  const save = async (r: Row) => {
    setSavingKey(r.entity_key);
    const { error } = await supabase
      .from('id_format_config')
      .update({
        prefix: r.prefix.trim(),
        include_year: r.include_year,
        serial_padding: r.serial_padding,
        separator: r.separator || '-',
        reset_mode: r.reset_mode,
        start_serial: r.start_serial,
      })
      .eq('entity_key', r.entity_key);
    setSavingKey(null);
    if (error) return toast.error(error.message);
    toast.success(bn ? 'সংরক্ষিত হয়েছে' : 'Saved');
  };

  return (
    <AdminLayout>
      <div className="max-w-[1100px] mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Hash className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{bn ? 'আইডি ফরম্যাট সেটিংস' : 'ID Format Settings'}</h1>
            <p className="text-sm text-muted-foreground">
              {bn
                ? 'প্রতিটি ক্যাটাগরির জন্য prefix, year, padding ও সিরিয়াল রিসেট মোড নির্ধারণ করুন।'
                : 'Configure prefix, year, padding and reset mode for each ID category.'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-5">
            {rows.map((r) => (
              <Card key={r.entity_key} className="rounded-[32px] p-5 sm:p-6 bg-card/80 backdrop-blur-xl border border-border/60 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                  <div>
                    <h3 className="font-bold text-lg">{r.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {bn ? 'প্রিভিউ:' : 'Preview:'}{' '}
                      <span className="font-mono font-semibold text-primary">{buildPreview(r)}</span>
                    </p>
                  </div>
                  <Button onClick={() => save(r)} disabled={!canEditItem || savingKey === r.entity_key} className="rounded-2xl">
                    {savingKey === r.entity_key ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {bn ? 'সংরক্ষণ' : 'Save'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">{bn ? 'প্রিফিক্স' : 'Prefix'}</Label>
                    <Input value={r.prefix} onChange={(e) => update(r.entity_key, { prefix: e.target.value.toUpperCase() })} className="rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'সেপারেটর' : 'Separator'}</Label>
                    <Input value={r.separator} maxLength={2} onChange={(e) => update(r.entity_key, { separator: e.target.value })} className="rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'প্যাডিং (ডিজিট সংখ্যা)' : 'Padding (digits)'}</Label>
                    <Input
                      type="number" min={1} max={8}
                      value={r.serial_padding}
                      onChange={(e) => update(r.entity_key, { serial_padding: Math.max(1, Math.min(8, parseInt(e.target.value) || 4)) })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'শুরুর সিরিয়াল' : 'Start serial'}</Label>
                    <Input
                      type="number" min={1}
                      value={r.start_serial}
                      onChange={(e) => update(r.entity_key, { start_serial: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{bn ? 'রিসেট মোড' : 'Reset mode'}</Label>
                    <Select value={r.reset_mode} onValueChange={(v: 'global' | 'yearly') => update(r.entity_key, { reset_mode: v })}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">{bn ? 'গ্লোবাল (কখনো রিসেট হবে না)' : 'Global (never reset)'}</SelectItem>
                        <SelectItem value="yearly">{bn ? 'প্রতি বছর রিসেট' : 'Yearly reset'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-3 px-3 py-2 rounded-xl bg-muted/30">
                    <Switch checked={r.include_year} onCheckedChange={(v) => update(r.entity_key, { include_year: v })} />
                    <Label className="text-sm">{bn ? 'আইডিতে বছর যোগ করুন' : 'Include year in ID'}</Label>
                  </div>
                </div>

                {r.reset_mode === 'yearly' && !r.include_year && (
                  <p className="text-xs text-amber-600 mt-3">
                    {bn
                      ? 'সতর্কতা: বছরভিত্তিক রিসেট চালু আছে কিন্তু আইডিতে বছর যোগ করা নেই — এতে ডুপ্লিকেট হতে পারে। "আইডিতে বছর যোগ করুন" চালু করুন।'
                      : 'Warning: yearly reset is on but year is not included — IDs may collide. Enable "Include year".'}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminIdFormatSettings;
