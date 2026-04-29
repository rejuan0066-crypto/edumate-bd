import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, Clock, Users, FileText, ArrowRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const toBnDigits = (s: string | number) => String(s).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[Number(d)]);

export default function AdminShiftAuditLog() {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['shift-time-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_time_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const fmtTime = (t: string | null) => t || '—';

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            {bn ? 'শিফট টাইম পরিবর্তন লগ' : 'Shift Time Audit Log'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {bn
              ? 'প্রতিটি বিভাগ শিফট টাইম পরিবর্তন এবং প্রভাবিত স্টাফ/বেতন রেকর্ডের তালিকা।'
              : 'Every category shift time change and the affected staff / salary records.'}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          {bn ? 'রিফ্রেশ' : 'Refresh'}
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</CardContent></Card>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">
              {bn ? 'কোনো পরিবর্তন রেকর্ড পাওয়া যায়নি' : 'No change records found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {logs.map((log: any) => (
            <Card key={log.id} className="border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    {log.category_label || log.category_key}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 flex-wrap bg-muted/40 rounded-md px-3 py-2">
                  <span className="text-muted-foreground text-xs">{bn ? 'পূর্ববর্তী:' : 'Previous:'}</span>
                  <span className="font-mono font-medium">
                    {fmtTime(log.old_start)} – {fmtTime(log.old_end)}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mx-1" />
                  <span className="text-muted-foreground text-xs">{bn ? 'নতুন:' : 'New:'}</span>
                  <span className="font-mono font-medium text-emerald-700 dark:text-emerald-400">
                    {fmtTime(log.new_start)} – {fmtTime(log.new_end)}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-muted-foreground">{bn ? 'প্রভাবিত স্টাফ:' : 'Affected staff:'}</span>
                    <span className="font-semibold">{bn ? toBnDigits(log.affected_staff_count || 0) : (log.affected_staff_count || 0)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-muted-foreground">{bn ? 'বেতন রেকর্ড:' : 'Salary records:'}</span>
                    <span className="font-semibold">{bn ? toBnDigits(log.affected_salary_records || 0) : (log.affected_salary_records || 0)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{bn ? 'পরিবর্তনকারী:' : 'Changed by:'}</span>
                    <span className="font-medium">{log.changed_by_name || '—'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
