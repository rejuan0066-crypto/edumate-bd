import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Trash2, Users, Clock, ShieldCheck, Ban } from 'lucide-react';
import { format } from 'date-fns';

const AdminParentApprovals = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['parent-accounts', tab],
    queryFn: async () => {
      let query = supabase.from('parent_accounts').select('*').order('created_at', { ascending: false });
      if (tab !== 'all') query = query.eq('status', tab);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = async (id: string, status: string, reason?: string) => {
    const updates: any = { status };
    if (status === 'approved') {
      updates.approved_at = new Date().toISOString();
      updates.rejection_reason = null;
    }
    if (status === 'rejected') updates.rejection_reason = reason || null;
    const { error } = await supabase.from('parent_accounts').update(updates).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: bn ? 'সফল' : 'Success',
      description:
        status === 'approved' ? (bn ? 'অনুমোদিত' : 'Approved')
        : status === 'rejected' ? (bn ? 'প্রত্যাখ্যাত' : 'Rejected')
        : status === 'suspended' ? (bn ? 'স্থগিত' : 'Suspended')
        : 'Updated',
    });
    qc.invalidateQueries({ queryKey: ['parent-accounts'] });
  };

  const deleteAccount = async (id: string) => {
    if (!confirm(bn ? 'নিশ্চিত?' : 'Are you sure?')) return;
    const { error } = await supabase.from('parent_accounts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: bn ? 'মুছে ফেলা হয়েছে' : 'Deleted' });
    qc.invalidateQueries({ queryKey: ['parent-accounts'] });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: any; label: string; labelBn: string }> = {
      pending: { variant: 'secondary', label: 'Pending', labelBn: 'অপেক্ষমান' },
      approved: { variant: 'default', label: 'Approved', labelBn: 'অনুমোদিত' },
      rejected: { variant: 'destructive', label: 'Rejected', labelBn: 'প্রত্যাখ্যাত' },
      suspended: { variant: 'outline', label: 'Suspended', labelBn: 'স্থগিত' },
    };
    const s = map[status] || map.pending;
    return <Badge variant={s.variant}>{bn ? s.labelBn : s.label}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-center">{bn ? ' তালিকা' : 'Parent Approvals'}</h1>
            <p className="text-sm text-muted-foreground">
              {bn ? 'অভিভাবক পোর্টালের সাইনআপ অনুরোধ পরিচালনা করুন' : 'Manage parent portal signup requests'}
            </p>
          </div>
        </div>

        <Card className="rounded-[28px] border-0 shadow-lg">
          <CardHeader>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="rounded-2xl">
                <TabsTrigger value="pending" className="rounded-xl gap-1"><Clock className="w-3.5 h-3.5" /> {bn ? 'অপেক্ষমান' : 'Pending'}</TabsTrigger>
                <TabsTrigger value="approved" className="rounded-xl gap-1"><ShieldCheck className="w-3.5 h-3.5" /> {bn ? 'অনুমোদিত' : 'Approved'}</TabsTrigger>
                <TabsTrigger value="rejected" className="rounded-xl gap-1"><X className="w-3.5 h-3.5" /> {bn ? 'প্রত্যাখ্যাত' : 'Rejected'}</TabsTrigger>
                <TabsTrigger value="suspended" className="rounded-xl gap-1"><Ban className="w-3.5 h-3.5" /> {bn ? 'স্থগিত' : 'Suspended'}</TabsTrigger>
                <TabsTrigger value="all" className="rounded-xl">{bn ? 'সব' : 'All'}</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="py-8 text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</p>
            ) : accounts.length === 0 ? (
              <p className="py-8 text-muted-foreground">{bn ? 'কোনো অ্যাকাউন্ট পাওয়া যায়নি' : 'No accounts found'}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{bn ? 'নাম' : 'Name'}</TableHead>
                      <TableHead>{bn ? 'ইমেইল' : 'Email'}</TableHead>
                      <TableHead>{bn ? 'ফোন' : 'Phone'}</TableHead>
                      <TableHead>{bn ? 'ছাত্র আইডি' : 'Student ID'}</TableHead>
                      <TableHead>{bn ? 'ইমেইল ভেরিফাইড' : 'Verified'}</TableHead>
                      <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                      <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                      <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.full_name}</TableCell>
                        <TableCell className="text-sm">{a.email}</TableCell>
                        <TableCell className="text-sm">{a.phone || '—'}</TableCell>
                        <TableCell className="text-sm font-mono">{a.student_id}</TableCell>
                        <TableCell>
                          {a.email_verified ? (
                            <Badge variant="outline" className="gap-1"><Check className="w-3 h-3" /> {bn ? 'হ্যাঁ' : 'Yes'}</Badge>
                          ) : (
                            <Badge variant="secondary">{bn ? 'না' : 'No'}</Badge>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(a.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(a.created_at), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {a.status !== 'approved' && (
                              <Button size="sm" variant="default" onClick={() => updateStatus(a.id, 'approved')} className="h-8 rounded-lg">
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {a.status !== 'rejected' && (
                              <Button size="sm" variant="outline" onClick={() => { setRejectId(a.id); setRejectReason(''); }} className="h-8 rounded-lg">
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {a.status === 'approved' && (
                              <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, 'suspended')} className="h-8 rounded-lg">
                                <Ban className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => deleteAccount(a.id)} className="h-8 rounded-lg text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bn ? 'প্রত্যাখ্যানের কারণ' : 'Rejection Reason'}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={bn ? 'কারণ লিখুন (ঐচ্ছিক)' : 'Enter reason (optional)'}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectId) {
                  updateStatus(rejectId, 'rejected', rejectReason);
                  setRejectId(null);
                }
              }}
            >
              {bn ? 'প্রত্যাখ্যান করুন' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminParentApprovals;
