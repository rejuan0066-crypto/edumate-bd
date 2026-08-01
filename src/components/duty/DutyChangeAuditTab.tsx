import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, History } from 'lucide-react';

const WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

interface AuditRow {
  id: string;
  source: string;
  action: string;
  staff_name: string | null;
  shift_name: string | null;
  weekday: number | null;
  duty_date: string | null;
  changed_by_name: string | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_LABEL: Record<string, string> = {
  assigned: 'ডিউটি যোগ',
  removed: 'ডিউটি বাদ',
  updated: 'পরিবর্তন',
};

const SOURCE_LABEL: Record<string, string> = {
  weekly_template: 'সাপ্তাহিক সেটআপ',
  daily_roster: 'দৈনিক ডিউটি',
};

export default function DutyChangeAuditTab() {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['duty-change-audit'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('duty_change_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (sourceFilter !== 'all' && r.source !== sourceFilter) return false;
      if (actionFilter !== 'all' && r.action !== actionFilter) return false;
      if (!q) return true;
      return [r.staff_name, r.shift_name, r.changed_by_name]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
  }, [rows, search, sourceFilter, actionFilter]);

  return (
    <Card className="rounded-[38px]">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> ডিউটি পরিবর্তনের অডিট লগ
          </CardTitle>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-1 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> রিফ্রেশ
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          কে, কখন, কোন স্টাফের, কোন বারে/তারিখে, কোন শিফটে ডিউটি যোগ বা বাদ করেছে — সবকিছুর রেকর্ড এখানে থাকে।
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="স্টাফ / শিফট / যিনি পরিবর্তন করেছেন..."
            className="h-9 w-64 rounded-full"
          />
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-9 w-44 rounded-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব উৎস</SelectItem>
              <SelectItem value="weekly_template">সাপ্তাহিক সেটআপ</SelectItem>
              <SelectItem value="daily_roster">দৈনিক ডিউটি</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-9 w-40 rounded-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব ধরন</SelectItem>
              <SelectItem value="assigned">ডিউটি যোগ</SelectItem>
              <SelectItem value="removed">ডিউটি বাদ</SelectItem>
              <SelectItem value="updated">পরিবর্তন</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">মোট {filtered.length} টি রেকর্ড</span>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-3">সময়</th>
              <th className="px-3">স্টাফ</th>
              <th className="px-3">শিফট</th>
              <th className="px-3">বার / তারিখ</th>
              <th className="px-3">ধরন</th>
              <th className="px-3">উৎস</th>
              <th className="px-3">পরিবর্তনকারী</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="rounded-[20px] bg-muted/30 transition hover:-translate-y-[3px]">
                <td className="rounded-l-[20px] px-3 py-2 whitespace-nowrap">
                  {format(new Date(r.created_at), 'dd/MM/yyyy hh:mm a')}
                </td>
                <td className="px-3 py-2 font-medium">{r.staff_name || '—'}</td>
                <td className="px-3 py-2">{r.shift_name || '—'}</td>
                <td className="px-3 py-2">
                  {r.duty_date
                    ? format(new Date(r.duty_date), 'dd/MM/yyyy')
                    : r.weekday !== null && r.weekday !== undefined
                      ? `${WEEKDAYS[r.weekday]}বার`
                      : '—'}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={r.action === 'removed' ? 'destructive' : 'default'} className="rounded-full">
                    {ACTION_LABEL[r.action] || r.action}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{SOURCE_LABEL[r.source] || r.source}</td>
                <td className="rounded-r-[20px] px-3 py-2">
                  <div className="font-medium">{r.changed_by_name || 'সিস্টেম'}</div>
                  {r.ip_address && <div className="text-[11px] text-muted-foreground">{r.ip_address}</div>}
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  কোনো পরিবর্তনের রেকর্ড নেই
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">লোড হচ্ছে...</td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
