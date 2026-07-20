import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Search, Filter, Eye, Loader2, Clock, User, Database as DbIcon, ArrowUpDown } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  SOFT_DELETE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const ACTION_LABELS_BN: Record<string, string> = {
  INSERT: 'নতুন যোগ',
  UPDATE: 'সম্পাদনা',
  DELETE: 'স্থায়ী মুছা',
  SOFT_DELETE: 'সফট ডিলিট',
};

const TABLE_LABELS_BN: Record<string, string> = {
  expenses: 'হিসাব',
  fee_payments: 'ফি পেমেন্ট',
  salary_records: 'বেতন',
  students: 'শিক্ষার্থী',
  staff: 'স্টাফ',
};

const AdminSystemLogs = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [search, setSearch] = useState('');
  const [filterTable, setFilterTable] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [detailLog, setDetailLog] = useState<any>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['system-logs', filterTable, filterAction, page],
    queryFn: async () => {
      let q = supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filterTable !== 'all') q = q.eq('table_name', filterTable);
      if (filterAction !== 'all') q = q.eq('action', filterAction);

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-logs'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      return data || [];
    },
  });

  const getUserName = (userId: string) => {
    const p = profiles.find((pr: any) => pr.id === userId);
    return p?.full_name || userId?.slice(0, 8) || 'System';
  };

  const filtered = logs.filter((log: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      log.table_name?.toLowerCase().includes(s) ||
      log.action?.toLowerCase().includes(s) ||
      log.record_id?.toLowerCase().includes(s) ||
      log.description?.toLowerCase().includes(s)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {bn ? 'সিস্টেম লগ ও অডিট ট্রেইল' : 'System Logs & Audit Trail'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {bn ? 'সকল ডেটা পরিবর্তনের ইতিহাস' : 'Complete data change history'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={bn ? 'টেবিল, আইডি দিয়ে খুঁজুন...' : 'Search by table, ID...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterTable} onValueChange={v => { setFilterTable(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bn ? 'সকল টেবিল' : 'All Tables'}</SelectItem>
              <SelectItem value="expenses">{bn ? 'হিসাব' : 'Expenses'}</SelectItem>
              <SelectItem value="fee_payments">{bn ? 'ফি পেমেন্ট' : 'Fee Payments'}</SelectItem>
              <SelectItem value="salary_records">{bn ? 'বেতন' : 'Salary'}</SelectItem>
              <SelectItem value="students">{bn ? 'শিক্ষার্থী' : 'Students'}</SelectItem>
              <SelectItem value="staff">{bn ? 'স্টাফ' : 'Staff'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={v => { setFilterAction(v); setPage(0); }}>
            <SelectTrigger className="w-[160px]">
              <ArrowUpDown className="w-4 h-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bn ? 'সকল অ্যাকশন' : 'All Actions'}</SelectItem>
              <SelectItem value="INSERT">{bn ? 'নতুন যোগ' : 'Insert'}</SelectItem>
              <SelectItem value="UPDATE">{bn ? 'সম্পাদনা' : 'Update'}</SelectItem>
              <SelectItem value="DELETE">{bn ? 'মুছা' : 'Delete'}</SelectItem>
              <SelectItem value="SOFT_DELETE">{bn ? 'সফট ডিলিট' : 'Soft Delete'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{bn ? 'কোনো লগ পাওয়া যায়নি' : 'No logs found'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left">{bn ? 'সময়' : 'Time'}</th>
                    <th className="p-3 text-left">{bn ? 'ব্যবহারকারী' : 'User'}</th>
                    <th className="p-3 text-left">{bn ? 'অ্যাকশন' : 'Action'}</th>
                    <th className="p-3 text-left">{bn ? 'টেবিল' : 'Table'}</th>
                    <th className="p-3 text-left">{bn ? 'রেকর্ড আইডি' : 'Record ID'}</th>
                    <th className="p-3 text-center">{bn ? 'বিস্তারিত' : 'Details'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log: any) => (
                    <tr key={log.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(log.created_at).toLocaleString(bn ? 'bn-BD' : 'en-US', { dateStyle: 'short', timeStyle: 'medium' })}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs truncate max-w-[120px]">{getUserName(log.user_id)}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={`text-[10px] font-medium ${ACTION_COLORS[log.action] || 'bg-muted'}`}>
                          {bn ? (ACTION_LABELS_BN[log.action] || log.action) : log.action}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <DbIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-mono">{bn ? (TABLE_LABELS_BN[log.table_name] || log.table_name) : log.table_name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-xs font-mono text-muted-foreground">{log.record_id?.slice(0, 8)}...</span>
                      </td>
                      <td className="p-3 text-center">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDetailLog(log)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {bn ? `পেজ ${page + 1}` : `Page ${page + 1}`} • {filtered.length} {bn ? 'টি রেকর্ড' : 'records'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              {bn ? 'পূর্ববর্তী' : 'Previous'}
            </Button>
            <Button variant="outline" size="sm" disabled={filtered.length < pageSize} onClick={() => setPage(p => p + 1)}>
              {bn ? 'পরবর্তী' : 'Next'}
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {bn ? 'লগ বিস্তারিত' : 'Log Details'}
            </DialogTitle>
          </DialogHeader>
          {detailLog && (
            <ScrollArea className="max-h-[65vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">{bn ? 'সময়' : 'Timestamp'}</p>
                    <p className="font-medium">{new Date(detailLog.created_at).toLocaleString(bn ? 'bn-BD' : 'en-US')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{bn ? 'ব্যবহারকারী' : 'User'}</p>
                    <p className="font-medium">{getUserName(detailLog.user_id)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{bn ? 'অ্যাকশন' : 'Action'}</p>
                    <Badge className={ACTION_COLORS[detailLog.action] || 'bg-muted'}>
                      {bn ? (ACTION_LABELS_BN[detailLog.action] || detailLog.action) : detailLog.action}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{bn ? 'টেবিল' : 'Table'}</p>
                    <p className="font-medium font-mono">{detailLog.table_name}</p>
                  </div>
                </div>

                {detailLog.old_data && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{bn ? 'পুরনো ডেটা' : 'Old Data'}</p>
                    <pre className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3 text-xs overflow-x-auto max-h-48">
                      {JSON.stringify(detailLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}

                {detailLog.new_data && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{bn ? 'নতুন ডেটা' : 'New Data'}</p>
                    <pre className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg p-3 text-xs overflow-x-auto max-h-48">
                      {JSON.stringify(detailLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSystemLogs;
