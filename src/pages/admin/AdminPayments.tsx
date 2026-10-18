import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useMemo, useState } from 'react';
import { CreditCard, Search, RefreshCw, CheckCircle, XCircle, Clock, Filter, AlertCircle, UserCheck, Trash2, Edit3, ShieldAlert } from 'lucide-react';
import FeeTypeSummary from '@/components/fees/FeeTypeSummary';
import CollectorSelector from '@/components/fees/CollectorSelector';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import { getCollectorFromPayment, getRejectionReasonFromPayment, updatePaymentSafely, cleanRoleSuffix } from '@/lib/paymentUtils';

const statusConfig: Record<string, { bn: string; en: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pending: { bn: 'অপেক্ষমাণ', en: 'Pending', variant: 'secondary' },
  success: { bn: 'এপ্রোভড', en: 'Approved', variant: 'default' },
  failed: { bn: 'প্রত্যাখ্যাত', en: 'Rejected', variant: 'destructive' },
};

const AdminPayments = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { role, user } = useAuth();
  const { canApproveItem, canDeleteItem, canEditItem } = usePagePermissions('/admin/payments');

  const isUserAdmin = isAdminRole(role);
  const canApprove = isUserAdmin || canApproveItem;
  const canDelete = isUserAdmin || canDeleteItem;
  const canEdit = isUserAdmin || canEditItem;

  const [search, setSearch] = useState('');
  const [feeFilter, setFeeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal States
  const [rejectionTarget, setRejectionTarget] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deletingTarget, setDeletingTarget] = useState<any | null>(null);
  const [deletionReason, setDeletionReason] = useState('');

  // Edit / Resubmit Modal State
  const [editingTarget, setEditingTarget] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editMethod, setEditMethod] = useState<string>('cash');
  const [editCollector, setEditCollector] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  // Fetch logged in profile for approval record
  const { data: userProfile } = useQuery({
    queryKey: ['current_user_profile_payments', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch payments
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('payments')
        .select('*, students(name_bn, name_en, roll_number)')
        .order('created_at', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Unique fee types
  const feeTypeOptions = useMemo(() => {
    const types = new Set<string>();
    payments.forEach((p: any) => {
      if (p.fee_type) types.add(p.fee_type);
    });
    return Array.from(types).sort();
  }, [payments]);

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (p: any) => {
      if (!canApprove) {
        throw new Error(bn ? 'ফি এপ্রুভ করার অনুমতি আপনার নেই' : 'You do not have permission to approve fees');
      }

      await updatePaymentSafely({
        id: p.id,
        status: 'success',
        rejectionReason: null,
        collectorName: getCollectorFromPayment(p),
        notes: p.notes,
      });

      // Update matching fee_payments if any
      try {
        const adminName = userProfile?.full_name || user?.email || 'Admin';
        const { data: feePayments } = await supabase
          .from('fee_payments')
          .select('id')
          .eq('student_id', p.student_id)
          .eq('status', 'pending');

        if (feePayments && feePayments.length > 0) {
          for (const fp of feePayments) {
            await supabase
              .from('fee_payments')
              .update({
                status: 'paid',
                paid_amount: p.amount,
                paid_at: new Date().toISOString(),
                approved_by: adminName,
              })
              .eq('id', fp.id);
          }
        }
      } catch (err) {
        console.warn('Reconcile fee_payments update notice:', err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['fee_payments'] });
      queryClient.invalidateQueries({ queryKey: ['existing_payment_check'] });
      toast.success(bn ? 'পেমেন্ট সফলভাবে অনুমোদিত হয়েছে' : 'Payment approved successfully');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!canApprove) {
        throw new Error(bn ? 'ফি প্রত্যাখ্যান করার অনুমতি আপনার নেই' : 'You do not have permission to reject fees');
      }
      if (!rejectionTarget) return;
      const reason = rejectionReason.trim();
      if (!reason) {
        throw new Error(bn ? 'প্রত্যাখ্যানের কারণ অবশ্যই লিখতে হবে' : 'Please provide a rejection reason');
      }

      await updatePaymentSafely({
        id: rejectionTarget.id,
        status: 'failed',
        rejectionReason: reason,
        notes: rejectionTarget.notes,
      });

      // Also mark matching fee_payments draft as failed
      try {
        await supabase
          .from('fee_payments')
          .update({ status: 'failed' })
          .eq('student_id', rejectionTarget.student_id)
          .eq('status', 'pending');
      } catch (err) {
        console.warn('Fee payments reject notice:', err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['fee_payments'] });
      queryClient.invalidateQueries({ queryKey: ['existing_payment_check'] });
      toast.success(bn ? 'পেমেন্ট প্রত্যাখ্যান করা হয়েছে' : 'Payment rejected');
      setRejectionTarget(null);
      setRejectionReason('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Delete Mutation (with duplicate prevention reset)
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!canDelete) {
        throw new Error(bn ? 'পেমেন্ট ডিলিট করার অনুমতি আপনার নেই' : 'You do not have permission to delete payments');
      }
      if (!deletingTarget) return;

      // Also clean up any unapproved fee_payment draft for this transaction
      try {
        await supabase
          .from('fee_payments')
          .delete()
          .eq('student_id', deletingTarget.student_id)
          .in('status', ['pending', 'failed']);
      } catch (e) {
        console.warn('Fee payments delete cleanup:', e);
      }

      const { error } = await supabase.from('payments').delete().eq('id', deletingTarget.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['fee_payments'] });
      queryClient.invalidateQueries({ queryKey: ['existing_payment_check'] });
      toast.success(
        bn
          ? 'পেমেন্ট এন্ট্রি মুছে ফেলা হয়েছে। এখন উক্ত ফি-র জন্য নতুন এন্ট্রি করা যাবে।'
          : 'Payment deleted. You can now re-enter for this fee.'
      );
      setDeletingTarget(null);
      setDeletionReason('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Edit / Resubmit Mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingTarget) return;
      const amtNum = parseFloat(editAmount);
      if (isNaN(amtNum) || amtNum <= 0) {
        throw new Error(bn ? 'সঠিক টাকার পরিমাণ লিখুন' : 'Enter valid amount');
      }

      const isApprover = canApprove;
      const targetStatus = isApprover ? 'success' : 'pending';
      const cleanColl = cleanRoleSuffix(editCollector);
      const approverName = isApprover ? cleanRoleSuffix(userProfile?.full_name || 'Admin') : null;

      await updatePaymentSafely({
        id: editingTarget.id,
        status: targetStatus,
        amount: amtNum,
        paymentMethod: editMethod,
        collectorName: cleanColl,
        notes: editNotes,
        rejectionReason: null, // clear old rejection reason
      });

      // Update matching fee_payments if any
      try {
        await supabase
          .from('fee_payments')
          .update({
            amount: amtNum,
            paid_amount: isApprover ? amtNum : 0,
            collected_by: cleanColl,
            status: isApprover ? 'paid' : 'pending',
            paid_at: isApprover ? new Date().toISOString() : null,
            approved_by: approverName,
          })
          .eq('student_id', editingTarget.student_id)
          .in('status', ['pending', 'failed']);
      } catch (e) {
        console.warn('Fee payments update notice:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['existing_payment_check'] });
      toast.success(
        canApprove
          ? (bn ? 'পেমেন্ট সফলভাবে সংশোধন ও অনুমোদন করা হয়েছে' : 'Payment updated and approved successfully')
          : (bn ? 'পেমেন্ট সংশোধন করা হয়েছে এবং পুনরায় এডমিনের অনুমোদনের জন্য পাঠানো হয়েছে' : 'Payment corrected and resubmitted for admin approval')
      );
      setEditingTarget(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Open Edit Modal
  const openEditModal = (p: any) => {
    setEditingTarget(p);
    setEditAmount(String(p.amount || ''));
    setEditMethod(p.payment_method || 'cash');
    setEditCollector(cleanRoleSuffix(getCollectorFromPayment(p)));
    setEditNotes(p.notes || '');
  };

  // Filtered rows
  const filtered = payments.filter((p: any) => {
    if (feeFilter !== 'all' && p.fee_type !== feeFilter) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    const coll = getCollectorFromPayment(p).toLowerCase();
    return (
      p.transaction_id?.toLowerCase().includes(term) ||
      p.payer_name?.toLowerCase().includes(term) ||
      p.payer_phone?.toLowerCase().includes(term) ||
      p.fee_type?.toLowerCase().includes(term) ||
      p.students?.name_bn?.toLowerCase().includes(term) ||
      p.students?.name_en?.toLowerCase().includes(term) ||
      p.students?.roll_number?.toLowerCase().includes(term) ||
      coll.includes(term)
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
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" />
              {bn ? 'পেমেন্ট ড্যাশবোর্ড' : 'Payment Dashboard'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {bn ? 'সকল অনলাইন ও ক্যাশ ফি আদায়, এডমিন অনুমোদন ও প্রত্যাখ্যাত পেমেন্ট ব্যবস্থাপনা' : 'Manage online & cash fees, admin approvals and rejected payments'}
            </p>
          </div>
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
            <p className="text-xs text-muted-foreground">{bn ? 'এপ্রোভড' : 'Approved'}</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <p className="text-2xl font-bold text-warning">{totals.pending}</p>
            <p className="text-xs text-muted-foreground">{bn ? 'অপেক্ষমাণ' : 'Pending'}</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <p className="text-2xl font-bold text-primary">৳{totals.amount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{bn ? 'মোট আদায়কৃত' : 'Total Collected'}</p>
          </div>
        </div>

        {/* Fee Type-wise Summary */}
        <FeeTypeSummary />

        {/* Filters */}
        <div className="card-elevated p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 bg-background"
                placeholder={bn ? 'ট্রানজেকশন আইডি, নাম, ফোন বা আদায়কারী দিয়ে খুঁজুন...' : 'Search by transaction ID, name, phone or collector...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={feeFilter} onValueChange={setFeeFilter}>
              <SelectTrigger className="w-full sm:w-52 bg-background">
                <Filter className="w-4 h-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সব ধরন' : 'All Types'}</SelectItem>
                {feeTypeOptions.map((ft) => (
                  <SelectItem key={ft} value={ft}>{ft}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সব স্ট্যাটাস' : 'All Status'}</SelectItem>
                <SelectItem value="pending">{bn ? 'অপেক্ষমাণ' : 'Pending'}</SelectItem>
                <SelectItem value="success">{bn ? 'এপ্রোভড' : 'Approved'}</SelectItem>
                <SelectItem value="failed">{bn ? 'প্রত্যাখ্যাত' : 'Rejected'}</SelectItem>
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
                <TableHead>{bn ? 'ধরন ও মাধ্যম' : 'Type & Method'}</TableHead>
                <TableHead>{bn ? 'ছাত্র/দাতা ও আদায়কারী' : 'Student/Donor & Collector'}</TableHead>
                <TableHead>{bn ? 'পরিমাণ' : 'Amount'}</TableHead>
                <TableHead>{bn ? 'স্ট্যাটাস ও কারণ' : 'Status & Details'}</TableHead>
                <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
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
                  const collector = getCollectorFromPayment(p);
                  const rejection = getRejectionReasonFromPayment(p);
                  const isCreator = p.created_by && user?.id && p.created_by === user.id;

                  return (
                    <TableRow key={p.id} className={p.status === 'failed' ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {p.transaction_id}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="text-xs w-fit">
                            {p.fee_type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">
                            {p.payment_method === 'cash' ? (bn ? '💵 ক্যাশ' : '💵 Cash') : (p.payment_method || 'Online')}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <span className="font-medium text-foreground">
                            {p.students?.name_bn || p.payer_name || '-'}
                          </span>
                          {p.students?.roll_number && (
                            <span className="text-xs text-muted-foreground ml-1 font-mono">
                              (#{p.students.roll_number})
                            </span>
                          )}

                          {collector && (
                            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-primary shrink-0" />
                              <span>
                                {bn ? 'আদায়কারী:' : 'Collector:'}{' '}
                                <strong className="text-foreground">{collector}</strong>
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="font-bold text-foreground">
                        ৳{Number(p.amount).toLocaleString()}
                      </TableCell>

                      <TableCell>
                        <div>
                          <Badge variant={st.variant} className="text-xs">
                            {p.status === 'success' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {p.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                            {p.status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
                            {bn ? st.bn : st.en}
                          </Badge>

                          {p.status === 'failed' && rejection && (
                            <div className="text-[11px] text-destructive mt-1 flex items-start gap-1 bg-destructive/10 p-1.5 rounded border border-destructive/20 max-w-[14rem]">
                              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                              <span className="leading-tight">
                                <strong>{bn ? 'কারণ:' : 'Reason:'}</strong> {rejection}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US')}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Pending Actions: ONLY FOR USERS WITH APPROVAL PERMISSION */}
                          {p.status === 'pending' && (
                            <>
                              {canApprove ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-success border-success/30 hover:bg-success/10"
                                    onClick={() => approveMutation.mutate(p)}
                                    disabled={approveMutation.isPending}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" /> {bn ? 'এপ্রোভ' : 'Approve'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                                    onClick={() => {
                                      setRejectionTarget(p);
                                      setRejectionReason('');
                                    }}
                                  >
                                    <XCircle className="w-3 h-3 mr-1" /> {bn ? 'প্রত্যাখ্যান' : 'Reject'}
                                  </Button>
                                </>
                              ) : (
                                <Badge variant="outline" className="text-[11px] text-muted-foreground font-normal">
                                  <Clock className="w-3 h-3 mr-1" /> {bn ? 'অনুমোদনের অপেক্ষায়' : 'Awaiting Approval'}
                                </Badge>
                              )}
                            </>
                          )}

                          {/* Failed / Rejected Actions: Creator/Staff can Edit & Resubmit */}
                          {p.status === 'failed' && (
                            <>
                              {(isCreator || canEdit || canApprove) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-primary border-primary/30 hover:bg-primary/10"
                                  onClick={() => openEditModal(p)}
                                >
                                  <Edit3 className="w-3 h-3 mr-1" /> {bn ? 'সংশোধন' : 'Edit'}
                                </Button>
                              )}

                              {/* Admin can Delete if unable to resolve */}
                              {canDelete && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                                  onClick={() => {
                                    setDeletingTarget(p);
                                    setDeletionReason('');
                                  }}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" /> {bn ? 'ডিলিট' : 'Delete'}
                                </Button>
                              )}
                            </>
                          )}

                          {/* Success Actions */}
                          {p.status === 'success' && canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              title={bn ? 'ডিলিট করুন' : 'Delete'}
                              onClick={() => {
                                setDeletingTarget(p);
                                setDeletionReason('');
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 1. Rejection Modal */}
      <Dialog open={!!rejectionTarget} onOpenChange={(open) => !open && setRejectionTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              {bn ? 'পেমেন্ট প্রত্যাখ্যানের কারণ' : 'Reason for Payment Rejection'}
            </DialogTitle>
            <DialogDescription>
              {bn
                ? `ট্রানজেকশন #${rejectionTarget?.transaction_id}-এর জন্য প্রত্যাখ্যানের কারণ লিখুন। পেমেন্টকারী ইউজার এটি দেখে সংশোধন করতে পারবেন।`
                : `Enter the rejection reason for #${rejectionTarget?.transaction_id}. The user can view this and correct it.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label className="text-xs font-semibold">{bn ? 'প্রত্যাখ্যানের কারণ (আবশ্যক)' : 'Rejection Reason (Required)'}</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={bn ? 'যেমন: টাকার পরিমাণ ভুল / ব্যাংক স্লিপ অস্পষ্ট / ভুল শিক্ষার্থী নির্বাচন...' : 'E.g., Incorrect amount / blur slip / wrong student...'}
              rows={3}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRejectionTarget(null)}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
              onClick={() => rejectMutation.mutate()}
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              {bn ? 'প্রত্যাখ্যান নিশ্চিত করুন' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Edit / Resubmit Modal */}
      <Dialog open={!!editingTarget} onOpenChange={(open) => !open && setEditingTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Edit3 className="w-5 h-5" />
              {canApprove
                ? (bn ? 'পেমেন্ট সংশোধন ও অনুমোদন' : 'Edit & Approve Payment')
                : (bn ? 'প্রত্যাখ্যাত পেমেন্ট সংশোধন করুন' : 'Edit Rejected Payment')}
            </DialogTitle>
            <DialogDescription>
              {canApprove
                ? (bn ? 'সঠিক তথ্য প্রদান করে সরাসরি অনুমোদন করুন' : 'Provide correct details and approve directly')
                : (bn ? 'সঠিক তথ্য প্রদান করে পুনরায় এডমিনের অনুমোদনের জন্য পাঠান' : 'Provide correct info and resubmit for admin approval')}
            </DialogDescription>
          </DialogHeader>

          {editingTarget && (
            <div className="space-y-4 py-2">
              {/* Show Admin Rejection Reason Alert */}
              {getRejectionReasonFromPayment(editingTarget) && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-xs text-destructive">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {bn ? 'এডমিনের প্রত্যাখ্যানের কারণ:' : 'Admin Rejection Reason:'}
                  </p>
                  <p className="mt-1 pl-5 text-foreground leading-relaxed">
                    {getRejectionReasonFromPayment(editingTarget)}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{bn ? 'টাকার পরিমাণ (৳)' : 'Amount (৳)'} *</Label>
                  <Input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">{bn ? 'পেমেন্ট মাধ্যম' : 'Payment Method'}</Label>
                  <Select value={editMethod} onValueChange={setEditMethod}>
                    <SelectTrigger className="text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{bn ? '💵 ক্যাশ' : '💵 Cash'}</SelectItem>
                      <SelectItem value="bKash">bKash</SelectItem>
                      <SelectItem value="Nagad">Nagad</SelectItem>
                      <SelectItem value="Rocket">Rocket</SelectItem>
                      <SelectItem value="Bank">Bank Deposit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Collector Selector (From Staff/Teachers or Custom) */}
              <CollectorSelector
                value={editCollector}
                onChange={setEditCollector}
                defaultCollectorName={cleanRoleSuffix(getCollectorFromPayment(editingTarget) || userProfile?.full_name || '')}
              />

              <div className="space-y-1">
                <Label className="text-xs">{bn ? 'সংশোধনের বিবরণ / নোট' : 'Correction Notes'}</Label>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder={bn ? 'সংশোধনের বিবরণ লিখুন...' : 'Enter details of changes made...'}
                  rows={2}
                  className="text-xs bg-background"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingTarget(null)}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              size="sm"
              disabled={editMutation.isPending || !editAmount}
              onClick={() => editMutation.mutate()}
              className={canApprove ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              {canApprove
                ? (bn ? 'সংশোধন ও অনুমোদন করুন' : 'Update & Approve')
                : (bn ? 'পুনরায় অনুমোদনের জন্য পাঠান' : 'Resubmit for Approval')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Delete Confirmation Modal */}
      <Dialog open={!!deletingTarget} onOpenChange={(open) => !open && setDeletingTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              {bn ? 'পেমেন্ট ডিলিট নিশ্চিতকরণ' : 'Confirm Payment Deletion'}
            </DialogTitle>
            <DialogDescription>
              {bn
                ? `আপনি কি নিশ্চিত যে ট্রানজেকশন #${deletingTarget?.transaction_id} মুছে ফেলতে চান? এটি মুছে ফেললে উক্ত শিক্ষার্থী উক্ত ফি-র জন্য পুনরায় নতুন এন্ট্রি করতে পারবে।`
                : `Are you sure you want to delete transaction #${deletingTarget?.transaction_id}? Deleting this will allow re-entry for this fee.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs">{bn ? 'ডিলিট করার কারণ (ঐচ্ছিক)' : 'Deletion Reason (Optional)'}</Label>
            <Input
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              placeholder={bn ? 'যেমন: অকার্যকর এন্ট্রি / ভুল ছাত্র' : 'E.g., Invalid entry / incorrect student'}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeletingTarget(null)}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              {bn ? 'হ্যাঁ, ডিলিট করুন' : 'Yes, Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPayments;
