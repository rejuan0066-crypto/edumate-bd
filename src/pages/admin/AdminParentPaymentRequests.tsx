import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Wallet, Clock, ShieldCheck, RefreshCw, History } from 'lucide-react';
import { format } from 'date-fns';
import ReceiptStatusTimeline from '@/components/fees/ReceiptStatusTimeline';

const AdminParentPaymentRequests = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [historyId, setHistoryId] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['parent-payment-requests-admin', tab],
    queryFn: async () => {
      let q = (supabase as any).from('parent_payment_requests').select('*').order('created_at', { ascending: false });
      if (tab !== 'all') q = q.eq('status', tab);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = async (id: string, status: 'verified' | 'rejected' | 'pending', reason?: string) => {
    const updates: any = { status };
    if (status === 'rejected') updates.rejection_reason = reason || null;
    const { error } = await (supabase as any).from('parent_payment_requests').update(updates).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: status === 'verified' ? (bn ? '✅ যাচাই সম্পন্ন' : '✅ Verified')
            : status === 'rejected' ? (bn ? 'প্রত্যাখ্যাত' : 'Rejected')
            : (bn ? 'অপেক্ষমাণে ফেরত' : 'Reverted to pending'),
      description: status === 'verified'
        ? (bn ? 'ফি স্বয়ংক্রিয়ভাবে সমন্বয় করা হয়েছে।' : 'Fee rows reconciled automatically.')
        : status === 'pending'
          ? (bn ? 'পূর্বের সমন্বয় বাতিল হয়েছে।' : 'Prior allocations reversed.')
          : undefined,
    });
    qc.invalidateQueries({ queryKey: ['parent-payment-requests-admin'] });
    setRejectId(null);
    setRejectReason('');
  };

  const statusBadge = (s: string) => {
    if (s === 'verified') return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{bn ? 'যাচাইকৃত' : 'Verified'}</Badge>;
    if (s === 'rejected') return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{bn ? 'প্রত্যাখ্যাত' : 'Rejected'}</Badge>;
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{bn ? 'অপেক্ষমাণ' : 'Pending'}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{bn ? 'অভিভাবক পেমেন্ট অনুরোধ' : 'Parent Payment Requests'}</h1>
            <p className="text-sm text-muted-foreground">
              {bn ? 'ম্যানুয়াল TrxID যাচাই করুন — যাচাই করলে ফি স্বয়ংক্রিয়ভাবে সমন্বয় হবে।' : 'Verify manual TrxID submissions — fee rows reconcile automatically on approval.'}
            </p>
          </div>
        </div>

        <Card className="rounded-[28px] border-0 shadow-lg">
          <CardHeader>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="rounded-2xl">
                <TabsTrigger value="pending" className="rounded-xl gap-1"><Clock className="w-3.5 h-3.5" /> {bn ? 'অপেক্ষমাণ' : 'Pending'}</TabsTrigger>
                <TabsTrigger value="verified" className="rounded-xl gap-1"><ShieldCheck className="w-3.5 h-3.5" /> {bn ? 'যাচাইকৃত' : 'Verified'}</TabsTrigger>
                <TabsTrigger value="rejected" className="rounded-xl gap-1"><X className="w-3.5 h-3.5" /> {bn ? 'প্রত্যাখ্যাত' : 'Rejected'}</TabsTrigger>
                <TabsTrigger value="all" className="rounded-xl">{bn ? 'সব' : 'All'}</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="py-8 text-muted-foreground text-center">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</p>
            ) : rows.length === 0 ? (
              <p className="py-8 text-muted-foreground text-center">{bn ? 'কোনো অনুরোধ নেই' : 'No requests'}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                      <TableHead>{bn ? 'পরিমাণ' : 'Amount'}</TableHead>
                      <TableHead>{bn ? 'পদ্ধতি' : 'Method'}</TableHead>
                      <TableHead>{bn ? 'TrxID' : 'TrxID'}</TableHead>
                      <TableHead>{bn ? 'প্রেরক' : 'Sender'}</TableHead>
                      <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                      <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(r.created_at), 'dd/MM/yyyy')}<br />
                          <span className="text-muted-foreground">{format(new Date(r.created_at), 'hh:mm a')}</span>
                        </TableCell>
                        <TableCell className="font-semibold">৳{Number(r.amount).toLocaleString()}</TableCell>
                        <TableCell className="uppercase text-xs"><Badge variant="outline">{r.method}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{r.trx_id || '—'}</TableCell>
                        <TableCell className="text-xs">{r.sender_phone || '—'}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {r.status !== 'verified' && (
                              <Button size="sm" onClick={() => updateStatus(r.id, 'verified')} className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700">
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {r.status === 'verified' && (
                              <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'pending')} className="h-8 rounded-lg" title={bn ? 'যাচাই বাতিল' : 'Revoke'}>
                                <RefreshCw className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {r.status !== 'rejected' && (
                              <Button size="sm" variant="outline" onClick={() => { setRejectId(r.id); setRejectReason(''); }} className="h-8 rounded-lg">
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => setHistoryId(r.id)} className="h-8 rounded-lg" title={bn ? 'টাইমলাইন' : 'Timeline'}>
                              <History className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
          <DialogContent className="rounded-[28px] max-w-md">
            <DialogHeader>
              <DialogTitle>{bn ? 'প্রত্যাখ্যানের কারণ' : 'Rejection Reason'}</DialogTitle>
            </DialogHeader>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder={bn ? 'কারণ লিখুন...' : 'Reason...'} className="rounded-xl" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectId(null)} className="rounded-xl">{bn ? 'বাতিল' : 'Cancel'}</Button>
              <Button onClick={() => rejectId && updateStatus(rejectId, 'rejected', rejectReason)} className="rounded-xl bg-red-600 hover:bg-red-700">
                {bn ? 'প্রত্যাখ্যান করুন' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminParentPaymentRequests;
