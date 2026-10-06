import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, History, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';

type Row = {
  id: string;
  issuance_id: string | null;
  action: string;
  issued_by: string | null;
  issued_by_name: string | null;
  distributor_name: string | null;
  distributor_changed_by_admin: boolean;
  created_at: string;
};

const PAGE_SIZE = 20;

export default function AdminLibraryAudit() {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [page, setPage] = useState(0);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['library-issuance-audit', page, from, to],
    queryFn: async () => {
      let q = supabase
        .from('library_issuance_audit' as any)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (from) q = q.gte('created_at', new Date(from).toISOString());
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        q = q.lte('created_at', end.toISOString());
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data || []) as unknown as Row[], count: count || 0 };
    },
  });

  const rows = data?.rows || [];
  const total = data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetFilters = () => {
    setFrom('');
    setTo('');
    setPage(0);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-600" />
            {bn ? 'বই ইস্যু অডিট লগ' : 'Book Issuance Audit Log'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {bn
              ? 'কে বই ইস্যু করেছে এবং অ্যাডমিন কর্তৃক বিতরণকারী পরিবর্তনের রেকর্ড।'
              : 'Records of who issued books and any admin distributor changes.'}
          </p>
        </div>

        <Card className="rounded-[32px] backdrop-blur-xl bg-card/60">
          <CardHeader>
            <CardTitle className="text-base">{bn ? 'ফিল্টার' : 'Filters'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{bn ? 'শুরুর তারিখ' : 'From date'}</Label>
                <DatePicker value={from} onChange={(v) => { setFrom(v); setPage(0); }} bengali={bn} className="w-[170px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{bn ? 'শেষ তারিখ' : 'To date'}</Label>
                <DatePicker value={to} onChange={(v) => { setTo(v); setPage(0); }} bengali={bn} className="w-[170px]" />
              </div>
              {(from || to) && (
                <Button variant="outline" size="sm" onClick={resetFilters} className="gap-1">
                  <X className="w-3 h-3" /> {bn ? 'রিসেট' : 'Reset'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[32px] backdrop-blur-xl bg-card/60">
          <CardContent className="p-4">
            <div className="rounded-[20px] border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{bn ? 'সময়' : 'When'}</TableHead>
                    <TableHead>{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                    <TableHead>{bn ? 'ইস্যুকারী' : 'Issued By'}</TableHead>
                    <TableHead>{bn ? 'বিতরণকারী' : 'Distributor'}</TableHead>
                    <TableHead>{bn ? 'অ্যাডমিন পরিবর্তন' : 'Admin Changed'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">{bn ? 'কোনো রেকর্ড নেই' : 'No entries'}</TableCell></TableRow>
                  ) : rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">{format(new Date(r.created_at), 'dd/MM/yyyy hh:mm:ss a')}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{r.action}</Badge></TableCell>
                      <TableCell className="text-xs">{r.issued_by_name || r.issued_by?.slice(0, 8) || '—'}</TableCell>
                      <TableCell className="text-xs">{r.distributor_name || '—'}</TableCell>
                      <TableCell>
                        {r.distributor_changed_by_admin
                          ? <Badge variant="destructive" className="text-[10px]">{bn ? 'হ্যাঁ' : 'Yes'}</Badge>
                          : <span className="text-xs text-muted-foreground">{bn ? 'না' : 'No'}</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">
                {bn ? `মোট ${total} টি · পৃষ্ঠা ${page + 1}/${totalPages}` : `${total} total · Page ${page + 1} of ${totalPages}`}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="gap-1">
                  <ChevronLeft className="w-4 h-4" /> {bn ? 'আগের' : 'Prev'}
                </Button>
                <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)} className="gap-1">
                  {bn ? 'পরের' : 'Next'} <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
