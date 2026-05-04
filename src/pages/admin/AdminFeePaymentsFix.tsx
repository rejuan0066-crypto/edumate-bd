import { useState, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wrench, Save, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useInstitutionInfo } from '@/hooks/useInstitutionInfo';

const AdminFeePaymentsFix = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const { data: institution } = useInstitutionInfo() as any;

  const [edits, setEdits] = useState<Record<string, { collected_by?: string; approved_by?: string }>>({});

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['fee-payments-missing-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fee_payments')
        .select('id, amount, payment_method, payment_date, collected_by, approved_by, transaction_id, students(name_bn, name_en, roll_number)')
        .or('collected_by.is.null,collected_by.eq.,approved_by.is.null,approved_by.eq.')
        .order('payment_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const defaultName = (institution as any)?.collector_name || (institution as any)?.principal_name || '';

  const updateMutation = useMutation({
    mutationFn: async ({ id, collected_by, approved_by }: { id: string; collected_by?: string; approved_by?: string }) => {
      const payload: any = {};
      if (collected_by !== undefined) payload.collected_by = collected_by;
      if (approved_by !== undefined) payload.approved_by = approved_by;
      const { error } = await supabase.from('fee_payments').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'আপডেট সফল' : 'Updated');
      qc.invalidateQueries({ queryKey: ['fee-payments-missing-names'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkFix = async () => {
    if (!defaultName) {
      toast.error(bn ? 'প্রতিষ্ঠানের ডিফল্ট নাম পাওয়া যায়নি' : 'No default institution name set');
      return;
    }
    let count = 0;
    for (const r of rows as any[]) {
      const payload: any = {};
      if (!r.collected_by) payload.collected_by = defaultName;
      if (!r.approved_by) payload.approved_by = defaultName;
      if (Object.keys(payload).length === 0) continue;
      const { error } = await supabase.from('fee_payments').update(payload).eq('id', r.id);
      if (!error) count++;
    }
    toast.success(`${count} ${bn ? 'টি রেকর্ড আপডেট হয়েছে' : 'records updated'}`);
    refetch();
  };

  const stats = useMemo(() => ({
    total: rows.length,
    missingCollector: (rows as any[]).filter(r => !r.collected_by).length,
    missingApprover: (rows as any[]).filter(r => !r.approved_by).length,
  }), [rows]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" />
            {bn ? 'ফি পেমেন্ট নাম ঠিক করুন' : 'Fix Fee Payment Names'}
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" /> {bn ? 'রিফ্রেশ' : 'Refresh'}
            </Button>
            <Button size="sm" onClick={bulkFix} disabled={!rows.length || !defaultName}>
              <Save className="w-4 h-4 mr-1" />
              {bn ? `সকল রেকর্ডে "${defaultName}" বসান` : `Apply default "${defaultName}" to all`}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="card-elevated p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{bn ? 'মোট ত্রুটিপূর্ণ' : 'Total Issues'}</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <p className="text-2xl font-bold text-warning">{stats.missingCollector}</p>
            <p className="text-xs text-muted-foreground">{bn ? 'আদায়কারী খালি' : 'Missing Collector'}</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <p className="text-2xl font-bold text-warning">{stats.missingApprover}</p>
            <p className="text-xs text-muted-foreground">{bn ? 'গ্রহণকারী খালি' : 'Missing Approver'}</p>
          </div>
        </div>

        {!defaultName && (
          <div className="card-elevated p-4 flex items-center gap-2 text-warning">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{bn ? 'প্রতিষ্ঠান সেটিংসে ডিফল্ট নাম সেট করুন' : 'Set a default name in institution settings'}</span>
          </div>
        )}

        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                <TableHead>{bn ? 'ছাত্র' : 'Student'}</TableHead>
                <TableHead>{bn ? 'পরিমাণ' : 'Amount'}</TableHead>
                <TableHead>{bn ? 'মেথড' : 'Method'}</TableHead>
                <TableHead>{bn ? 'আদায়কারী' : 'Collected By'}</TableHead>
                <TableHead>{bn ? 'গ্রহণকারী' : 'Approved By'}</TableHead>
                <TableHead>{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">🎉 {bn ? 'কোনো ত্রুটিপূর্ণ রেকর্ড নেই' : 'No records need fixing'}</TableCell></TableRow>
              ) : (
                (rows as any[]).map((r) => {
                  const e = edits[r.id] || {};
                  const cVal = e.collected_by ?? r.collected_by ?? '';
                  const aVal = e.approved_by ?? r.approved_by ?? '';
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.payment_date}</TableCell>
                      <TableCell>
                        <div className="text-sm">{r.students?.name_bn || r.students?.name_en || '-'}</div>
                        {r.students?.roll_number && <div className="text-xs text-muted-foreground">#{r.students.roll_number}</div>}
                      </TableCell>
                      <TableCell className="font-bold">৳{Number(r.amount).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.payment_method}</Badge></TableCell>
                      <TableCell>
                        <Input
                          value={cVal}
                          placeholder={defaultName}
                          onChange={(ev) => setEdits(p => ({ ...p, [r.id]: { ...p[r.id], collected_by: ev.target.value } }))}
                          className={!r.collected_by ? 'border-warning' : ''}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={aVal}
                          placeholder={defaultName}
                          onChange={(ev) => setEdits(p => ({ ...p, [r.id]: { ...p[r.id], approved_by: ev.target.value } }))}
                          className={!r.approved_by ? 'border-warning' : ''}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => updateMutation.mutate({
                            id: r.id,
                            collected_by: cVal || defaultName,
                            approved_by: aVal || defaultName,
                          })}
                          disabled={updateMutation.isPending}
                        >
                          <Save className="w-3 h-3 mr-1" /> {bn ? 'সেভ' : 'Save'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminFeePaymentsFix;
