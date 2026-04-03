import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { CreditCard, Search, RefreshCw, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type FeeTypeFilter = 'all' | 'admission_fee' | 'monthly_fee' | 'exam_fee' | 'donation';
type StatusFilter = 'all' | 'pending' | 'success' | 'failed';

const feeTypeLabels: Record<string, { bn: string; en: string }> = {
  admission_fee: { bn: 'ভর্তি ফি', en: 'Admission Fee' },
  monthly_fee: { bn: 'মাসিক ফি', en: 'Monthly Fee' },
  exam_fee: { bn: 'পরীক্ষা ফি', en: 'Exam Fee' },
  donation: { bn: 'দান', en: 'Donation' },
};

const statusConfig: Record<string, { bn: string; en: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pending: { bn: 'অপেক্ষমাণ', en: 'Pending', variant: 'secondary' },
  success: { bn: 'সফল', en: 'Success', variant: 'default' },
  failed: { bn: 'ব্যর্থ', en: 'Failed', variant: 'destructive' },
};

const AdminPayments = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [feeFilter, setFeeFilter] = useState<FeeTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', feeFilter, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('payments')
        .select('*, students(name_bn, name_en, roll_number)')
        .order('created_at', { ascending: false });
      if (feeFilter !== 'all') q = q.eq('fee_type', feeFilter);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('payments').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success(bn ? 'স্ট্যাটাস আপডেট হয়েছে' : 'Status updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = payments.filter((p: any) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      p.transaction_id?.toLowerCase().includes(term) ||
      p.payer_name?.toLowerCase().includes(term) ||
      p.payer_phone?.toLowerCase().includes(term) ||
      p.students?.name_bn?.toLowerCase().includes(term) ||
      p.students?.name_en?.toLowerCase().includes(term) ||
      p.students?.roll_number?.toLowerCase().includes(term)
    );
  });

  const totals = {
    all: filtered.length,
    success: filtered.filter((p: any) => p.status === 'success').length,
    pending: filtered.filter((p: any) => p.status === 'pending').length,
    failed: filtered.filter((p: any) => p.status === 'failed').length,
    amount: filtered.filter((p: any) => p.status === 'success').reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            {bn ? 'পেমেন্ট ড্যাশবোর্ড' : 'Payment Dashboard'}
          </h1>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['payments'] })}>
            <RefreshCw className="w-4 h-4 mr-1" /> {bn ? 'রিফ্রেশ' : 'Refresh'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card-elevated p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{totals.all}</p>
            <p className="text-xs text-muted-foreground">{bn ? 'মোট পেমেন্ট' : 'Total Payments'}</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <p className="text-2xl font-bold text-success">{totals.success}</p>
            <p className="text-xs text-muted-foreground">{bn ? 'সফল' : 'Successful'}</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <p className="text-2xl font-bold text-warning">{totals.pending}</p>
            <p className="text-xs text-muted-foreground">{bn ? 'অপেক্ষমাণ' : 'Pending'}</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <p className="text-2xl font-bold text-primary">৳{totals.amount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{bn ? 'মোট আয়' : 'Total Revenue'}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card-elevated p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 bg-background"
                placeholder={bn ? 'ট্রানজেকশন আইডি, নাম বা ফোন দিয়ে খুঁজুন...' : 'Search by transaction ID, name or phone...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={feeFilter} onValueChange={(v) => setFeeFilter(v as FeeTypeFilter)}>
              <SelectTrigger className="w-full sm:w-44 bg-background">
                <Filter className="w-4 h-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সব ধরন' : 'All Types'}</SelectItem>
                {Object.entries(feeTypeLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{bn ? v.bn : v.en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-36 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সব স্ট্যাটাস' : 'All Status'}</SelectItem>
                <SelectItem value="pending">{bn ? 'অপেক্ষমাণ' : 'Pending'}</SelectItem>
                <SelectItem value="success">{bn ? 'সফল' : 'Success'}</SelectItem>
                <SelectItem value="failed">{bn ? 'ব্যর্থ' : 'Failed'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead>{bn ? 'ট্রানজেকশন আইডি' : 'Transaction ID'}</TableHead>
                <TableHead>{bn ? 'ধরন' : 'Type'}</TableHead>
                <TableHead>{bn ? 'ছাত্র/দাতা' : 'Student/Donor'}</TableHead>
                <TableHead>{bn ? 'পরিমাণ' : 'Amount'}</TableHead>
                <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                <TableHead>{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {bn ? 'লোড হচ্ছে...' : 'Loading...'}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {bn ? 'কোনো পেমেন্ট পাওয়া যায়নি' : 'No payments found'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p: any) => {
                  const st = statusConfig[p.status] || statusConfig.pending;
                  const ft = feeTypeLabels[p.fee_type] || { bn: p.fee_type, en: p.fee_type };
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.transaction_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{bn ? ft.bn : ft.en}</Badge>
                      </TableCell>
                      <TableCell>
                        {p.fee_type === 'donation' ? (
                          <span className="text-muted-foreground">{p.payer_name || (bn ? 'বেনামী দাতা' : 'Anonymous')}</span>
                        ) : (
                          <div>
                            <span className="font-medium text-foreground">{p.students?.name_bn || p.payer_name || '-'}</span>
                            {p.students?.roll_number && (
                              <span className="text-xs text-muted-foreground ml-1">(#{p.students.roll_number})</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-bold text-foreground">৳{Number(p.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="text-xs">
                          {p.status === 'success' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {p.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {p.status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
                          {bn ? st.bn : st.en}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US')}
                      </TableCell>
                      <TableCell>
                        {p.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-success border-success/30 hover:bg-success/10"
                              onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'success' })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" /> {bn ? 'সফল' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'failed' })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <XCircle className="w-3 h-3 mr-1" /> {bn ? 'বাতিল' : 'Reject'}
                            </Button>
                          </div>
                        )}
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

export default AdminPayments;
