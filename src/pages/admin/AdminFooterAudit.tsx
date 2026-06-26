import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { History } from 'lucide-react';
import { format } from 'date-fns';

type AuditRow = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  scope: 'global' | 'class' | 'exam';
  scope_id: string | null;
  action: 'insert' | 'update' | 'delete';
  old_value: any;
  new_value: any;
  created_at: string;
};

const summarize = (v: any) => {
  if (v == null) return '—';
  const parts: string[] = [];
  if ('show_page_numbers' in (v || {})) parts.push(`pages=${String(v.show_page_numbers)}`);
  if ('show_footer_institution' in (v || {})) parts.push(`inst=${String(v.show_footer_institution)}`);
  if ('margins' in (v || {}) && v.margins) {
    const m = v.margins;
    parts.push(`mgn T${m.top}/R${m.right}/B${m.bottom}/L${m.left}`);
  }
  return parts.length ? parts.join(' · ') : JSON.stringify(v);
};

export default function AdminFooterAudit() {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [scope, setScope] = useState<'all' | 'global' | 'class' | 'exam'>('all');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['result-footer-audit', scope],
    queryFn: async () => {
      let q = supabase.from('result_footer_audit' as any).select('*').order('created_at', { ascending: false }).limit(500);
      if (scope !== 'all') q = q.eq('scope', scope);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any) as AuditRow[];
    },
  });

  return (
    <AdminLayout>
      <div className="container max-w-6xl py-6 space-y-4">
        <Card className="rounded-[45px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              {bn ? 'ফুটার সেটিংস অডিট লগ' : 'Footer Settings Audit Log'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={scope} onValueChange={(v: any) => setScope(v)}>
              <TabsList>
                <TabsTrigger value="all">{bn ? 'সব' : 'All'}</TabsTrigger>
                <TabsTrigger value="global">{bn ? 'গ্লোবাল' : 'Global'}</TabsTrigger>
                <TabsTrigger value="class">{bn ? 'ক্লাস' : 'Class'}</TabsTrigger>
                <TabsTrigger value="exam">{bn ? 'পরীক্ষা' : 'Exam'}</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="rounded-[20px] border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{bn ? 'সময়' : 'When'}</TableHead>
                    <TableHead>{bn ? 'কে' : 'Who'}</TableHead>
                    <TableHead>{bn ? 'স্কোপ' : 'Scope'}</TableHead>
                    <TableHead>{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                    <TableHead>{bn ? 'পুরাতন' : 'Old'}</TableHead>
                    <TableHead>{bn ? 'নতুন' : 'New'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{bn ? 'লোড হচ্ছে…' : 'Loading…'}</TableCell></TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{bn ? 'কোনো রেকর্ড নেই' : 'No entries'}</TableCell></TableRow>
                  ) : rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">{format(new Date(r.created_at), 'dd/MM/yyyy hh:mm:ss a')}</TableCell>
                      <TableCell className="text-xs">{r.actor_email || r.actor_id?.slice(0, 8) || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{r.scope}</Badge>
                        {r.scope_id && <span className="ml-1 text-[10px] text-muted-foreground">{r.scope_id.slice(0, 8)}</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.action === 'delete' ? 'destructive' : r.action === 'insert' ? 'default' : 'secondary'} className="capitalize">{r.action}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono max-w-[260px] truncate" title={JSON.stringify(r.old_value)}>{summarize(r.old_value)}</TableCell>
                      <TableCell className="text-xs font-mono max-w-[260px] truncate" title={JSON.stringify(r.new_value)}>{summarize(r.new_value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
