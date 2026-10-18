import AdminLayout from '@/components/AdminLayout';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Trash2, FileSearch, RefreshCw, Download } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LogRow {
  id: string;
  settings_year: number | null;
  calc_type: 'zakat' | 'fitra';
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  contact_name: string | null;
  contact_phone: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const AdminZakatLogs = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const confirm = useConfirm();
  const { canDeleteItem } = usePagePermissions('/admin/zakat-logs');
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'zakat' | 'fitra'>('all');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<LogRow | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('zakat_calculation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (typeFilter !== 'all') q = q.eq('calc_type', typeFilter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows(((data as unknown) as LogRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [typeFilter]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (r.contact_name || '').toLowerCase().includes(s) ||
      (r.contact_phone || '').toLowerCase().includes(s) ||
      String(r.settings_year || '').includes(s)
    );
  });

  const remove = async (r: LogRow) => {
    const ok = await confirm({
      title: bn ? 'লগ মুছবেন?' : 'Delete log?',
      description: bn ? 'এই হিসাব লগটি স্থায়ীভাবে মুছে ফেলা হবে।' : 'This log will be permanently deleted.',
      confirmText: bn ? 'মুছুন' : 'Delete',
      cancelText: bn ? 'বাতিল' : 'Cancel',
      variant: 'destructive',
    });
    if (!ok) return;
    const { error } = await supabase.from('zakat_calculation_logs').delete().eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    load();
  };

  const exportCsv = () => {
    const header = ['Created', 'Type', 'Year', 'Name', 'Phone', 'Inputs', 'Results'];
    const rowsCsv = filtered.map((r) => [
      format(new Date(r.created_at), 'dd/MM/yyyy hh:mm a'),
      r.calc_type,
      r.settings_year ?? '',
      r.contact_name ?? '',
      r.contact_phone ?? '',
      JSON.stringify(r.inputs),
      JSON.stringify(r.results),
    ]);
    const csv = [header, ...rowsCsv]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zakat-logs-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="max-w-[1300px] mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileSearch className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{bn ? 'যাকাত/ফিতরা হিসাব লগ' : 'Zakat/Fitra Calculation Logs'}</h1>
              <p className="text-sm text-muted-foreground">
                {bn ? 'পাবলিক ক্যালকুলেটর থেকে সংরক্ষিত হিসাব দেখুন।' : 'View calculations saved from the public calculator.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={load} className="rounded-2xl">
              <RefreshCw className="w-4 h-4 mr-2" />
              {bn ? 'রিফ্রেশ' : 'Refresh'}
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0} className="rounded-2xl">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>

        <Card className="p-4 rounded-[32px] bg-card/80 backdrop-blur-xl border border-border/60">
          <div className="grid sm:grid-cols-3 gap-3">
            <Input
              placeholder={bn ? 'নাম, ফোন বা বছর দিয়ে খুঁজুন...' : 'Search by name, phone or year...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl"
            />
            <Select value={typeFilter} onValueChange={(v: 'all' | 'zakat' | 'fitra') => setTypeFilter(v)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সব ধরনের' : 'All types'}</SelectItem>
                <SelectItem value="zakat">{bn ? 'যাকাত' : 'Zakat'}</SelectItem>
                <SelectItem value="fitra">{bn ? 'ফিতরা' : 'Fitra'}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center px-3 text-sm text-muted-foreground">
              {bn ? `মোট: ${filtered.length}` : `Total: ${filtered.length}`}
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground rounded-[32px]">
            {bn ? 'কোনো লগ নেই' : 'No logs yet'}
          </Card>
        ) : (
          <Card className="rounded-[32px] bg-card/80 backdrop-blur-xl border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-3">{bn ? 'তারিখ' : 'Date'}</th>
                    <th className="p-3">{bn ? 'ধরন' : 'Type'}</th>
                    <th className="p-3">{bn ? 'বছর' : 'Year'}</th>
                    <th className="p-3">{bn ? 'নাম' : 'Name'}</th>
                    <th className="p-3">{bn ? 'ফোন' : 'Phone'}</th>
                    <th className="p-3">{bn ? 'ফলাফল' : 'Result'}</th>
                    <th className="p-3 text-right">{bn ? 'অ্যাকশন' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const result = r.calc_type === 'zakat'
                      ? `৳ ${Number((r.results as { zakatDue?: number }).zakatDue || 0).toLocaleString()}`
                      : `৳ ${Number((r.results as { total?: number }).total || 0).toLocaleString()}`;
                    return (
                      <tr key={r.id} className="border-t border-border/40 hover:bg-muted/20">
                        <td className="p-3 whitespace-nowrap">{format(new Date(r.created_at), 'dd/MM/yyyy hh:mm a')}</td>
                        <td className="p-3">
                          <Badge variant={r.calc_type === 'zakat' ? 'default' : 'secondary'}>
                            {r.calc_type === 'zakat' ? (bn ? 'যাকাত' : 'Zakat') : (bn ? 'ফিতরা' : 'Fitra')}
                          </Badge>
                        </td>
                        <td className="p-3">{r.settings_year ?? '—'}</td>
                        <td className="p-3">{r.contact_name || '—'}</td>
                        <td className="p-3">{r.contact_phone || '—'}</td>
                        <td className="p-3 font-semibold">{result}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setViewing(r)} className="rounded-xl">
                              {bn ? 'বিস্তারিত' : 'Details'}
                            </Button>
                            {canDeleteItem && (
                              <Button size="sm" variant="ghost" onClick={() => remove(r)} className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
          <DialogContent className="rounded-[38px] max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {viewing?.calc_type === 'zakat' ? (bn ? 'যাকাত হিসাব বিস্তারিত' : 'Zakat calculation details') : (bn ? 'ফিতরা হিসাব বিস্তারিত' : 'Fitra calculation details')}
              </DialogTitle>
            </DialogHeader>
            {viewing && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Info label={bn ? 'তারিখ' : 'Date'} value={format(new Date(viewing.created_at), 'dd/MM/yyyy hh:mm a')} />
                  <Info label={bn ? 'বছর' : 'Year'} value={String(viewing.settings_year ?? '—')} />
                  <Info label={bn ? 'নাম' : 'Name'} value={viewing.contact_name || '—'} />
                  <Info label={bn ? 'ফোন' : 'Phone'} value={viewing.contact_phone || '—'} />
                </div>
                <div>
                  <p className="font-semibold mb-1">{bn ? 'ইনপুট' : 'Inputs'}</p>
                  <pre className="bg-muted/50 p-3 rounded-xl text-xs overflow-x-auto">{JSON.stringify(viewing.inputs, null, 2)}</pre>
                </div>
                <div>
                  <p className="font-semibold mb-1">{bn ? 'ফলাফল' : 'Results'}</p>
                  <pre className="bg-muted/50 p-3 rounded-xl text-xs overflow-x-auto">{JSON.stringify(viewing.results, null, 2)}</pre>
                </div>
                {viewing.user_agent && (
                  <div>
                    <p className="font-semibold mb-1">User Agent</p>
                    <p className="text-xs text-muted-foreground break-all">{viewing.user_agent}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-semibold">{value}</p>
  </div>
);

export default AdminZakatLogs;
