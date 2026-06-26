import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { History, AlertTriangle, Wand2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

type AuditRow = {
  id: string;
  action: 'normalized' | 'rejected';
  original_value: any;
  cleaned_value: any;
  diff: Array<{ index: number; changes: Record<string, { from: string; to: string }> }> | null;
  reason: string | null;
  actor_id: string | null;
  created_at: string;
};

const fieldLabel = (f: string, bn: boolean) => {
  const map: Record<string, [string, string]> = {
    title_bn: ['পদবি (বাংলা)', 'Title (BN)'],
    title_en: ['পদবি (English)', 'Title (EN)'],
    name_bn: ['নাম (বাংলা)', 'Name (BN)'],
    name_en: ['নাম (English)', 'Name (EN)'],
  };
  return map[f]?.[bn ? 0 : 1] || f;
};

export default function AdminSignatoryAudit() {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [filter, setFilter] = useState<'all' | 'normalized' | 'rejected'>('all');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['result-signatories-audit', filter],
    queryFn: async () => {
      let q = supabase
        .from('result_signatories_audit' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (filter !== 'all') q = q.eq('action', filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as AuditRow[];
    },
  });

  const counts = {
    normalized: rows.filter(r => r.action === 'normalized').length,
    rejected: rows.filter(r => r.action === 'rejected').length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <History className="h-7 w-7 text-emerald-600" />
              {bn ? 'স্বাক্ষরকারী অডিট লগ' : 'Signatory Audit Log'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn
                ? 'ফলাফল শীটের স্বাক্ষরকারী ফিল্ডে স্বয়ংক্রিয় ট্রিম এবং প্রত্যাখ্যানের ইতিহাস।'
                : 'History of auto-trims and rejections on result-sheet signatory fields.'}
            </p>
          </div>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">
              {bn ? 'সব' : 'All'} <Badge variant="secondary" className="ml-2">{rows.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="normalized">
              <Wand2 className="h-3.5 w-3.5 mr-1" />
              {bn ? 'ট্রিম' : 'Normalized'} <Badge variant="secondary" className="ml-2">{counts.normalized}</Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected">
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              {bn ? 'প্রত্যাখ্যাত' : 'Rejected'} <Badge variant="destructive" className="ml-2">{counts.rejected}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="rounded-[45px] border-border/50 backdrop-blur-sm bg-card/80">
          <CardHeader>
            <CardTitle className="text-lg">
              {bn ? 'সাম্প্রতিক ইভেন্ট' : 'Recent Events'} ({rows.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {bn ? 'লোড হচ্ছে...' : 'Loading...'}
              </p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {bn ? 'কোনো ইভেন্ট নেই।' : 'No events recorded yet.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{bn ? 'সময়' : 'When'}</TableHead>
                      <TableHead>{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                      <TableHead>{bn ? 'কারণ' : 'Reason'}</TableHead>
                      <TableHead>{bn ? 'পরিবর্তন / সমস্যা' : 'Changes / Issue'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {format(new Date(r.created_at), 'dd/MM/yyyy hh:mm:ss a')}
                        </TableCell>
                        <TableCell>
                          {r.action === 'normalized' ? (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                              <Wand2 className="h-3 w-3 mr-1" />
                              {bn ? 'ট্রিম' : 'Normalized'}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {bn ? 'প্রত্যাখ্যাত' : 'Rejected'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-[260px]">
                          {r.reason || '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.diff && Array.isArray(r.diff) && r.diff.length > 0 ? (
                            <div className="space-y-2">
                              {r.diff.map((d, i) => (
                                <div key={i} className="rounded-md border border-border/60 bg-muted/30 p-2">
                                  <div className="font-medium text-foreground mb-1">
                                    {bn ? `স্বাক্ষরকারী #${d.index + 1}` : `Signatory #${d.index + 1}`}
                                  </div>
                                  <div className="space-y-1">
                                    {Object.entries(d.changes).map(([field, ch]) => (
                                      <div key={field} className="flex items-center gap-2 flex-wrap">
                                        <span className="text-muted-foreground min-w-[110px]">{fieldLabel(field, bn)}:</span>
                                        <code className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 line-through">
                                          {JSON.stringify(ch.from)}
                                        </code>
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                        <code className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                          {JSON.stringify(ch.to)}
                                        </code>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
