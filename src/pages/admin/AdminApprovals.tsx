import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardCheck, Check, X, Loader2, Eye, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const ACTION_LABELS: Record<string, { bn: string; en: string }> = {
  add: { bn: 'যোগ', en: 'Add' },
  edit: { bn: 'সম্পাদনা', en: 'Edit' },
  delete: { bn: 'মুছুন', en: 'Delete' },
  submit: { bn: 'সাবমিশন', en: 'Submit' },
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  approved: 'bg-green-500/10 text-green-600 border-green-500/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
};

const AdminApprovals = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [detailAction, setDetailAction] = useState<any>(null);
  const [adminNote, setAdminNote] = useState('');

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['pending-actions', filter],
    queryFn: async () => {
      let query = supabase
        .from('pending_actions')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('pending_actions')
        .update({
          status,
          admin_note: adminNote || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-actions'] });
      toast.success(
        status === 'approved'
          ? (bn ? '✅ অনুমোদিত হয়েছে!' : '✅ Approved!')
          : (bn ? '❌ প্রত্যাখ্যান করা হয়েছে' : '❌ Rejected')
      );
      setDetailAction(null);
      setAdminNote('');
    },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error occurred'),
  });

  const pendingCount = actions.filter(a => a.status === 'pending').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-primary" />
            {bn ? 'অনুমোদন ব্যবস্থাপনা' : 'Approval Management'}
            {pendingCount > 0 && (
              <Badge className="bg-yellow-500 text-white ml-2">{pendingCount}</Badge>
            )}
          </h1>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className={filter === f ? 'btn-primary-gradient' : ''}
            >
              {f === 'pending' ? (bn ? 'পেন্ডিং' : 'Pending') :
               f === 'approved' ? (bn ? 'অনুমোদিত' : 'Approved') :
               f === 'rejected' ? (bn ? 'প্রত্যাখ্যাত' : 'Rejected') :
               (bn ? 'সব' : 'All')}
            </Button>
          ))}
        </div>

        {/* Actions table */}
        <div className="card-elevated overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {bn ? 'কোনো রিকোয়েস্ট পাওয়া যায়নি' : 'No requests found'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{bn ? 'ইউজার' : 'User'}</TableHead>
                  <TableHead>{bn ? 'অ্যাকশন' : 'Action'}</TableHead>
                  <TableHead>{bn ? 'টেবিল/মডিউল' : 'Table/Module'}</TableHead>
                  <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                  <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                  <TableHead className="text-center w-32">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((action: any) => (
                  <TableRow key={action.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{action.user_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{action.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ACTION_LABELS[action.action_type]?.[bn ? 'bn' : 'en'] || action.action_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <p className="font-medium">{action.target_table}</p>
                      <p className="text-xs text-muted-foreground">{action.menu_path}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[action.status] || ''}>
                        {action.status === 'pending' ? (bn ? 'পেন্ডিং' : 'Pending') :
                         action.status === 'approved' ? (bn ? 'অনুমোদিত' : 'Approved') :
                         (bn ? 'প্রত্যাখ্যাত' : 'Rejected')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(action.created_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-primary hover:bg-primary/10"
                          onClick={() => { setDetailAction(action); setAdminNote(action.admin_note || ''); }}
                          title={bn ? 'বিস্তারিত' : 'Details'}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {action.status === 'pending' && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-green-600 hover:bg-green-500/10"
                              onClick={() => approveMutation.mutate({ id: action.id, status: 'approved' })}
                              disabled={approveMutation.isPending}
                              title={bn ? 'অনুমোদন' : 'Approve'}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => approveMutation.mutate({ id: action.id, status: 'rejected' })}
                              disabled={approveMutation.isPending}
                              title={bn ? 'প্রত্যাখ্যান' : 'Reject'}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Detail Dialog */}
        <Dialog open={!!detailAction} onOpenChange={(open) => { if (!open) setDetailAction(null); }}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                {bn ? 'রিকোয়েস্ট বিস্তারিত' : 'Request Details'}
              </DialogTitle>
            </DialogHeader>

            {detailAction && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">{bn ? 'ইউজার' : 'User'}</p>
                    <p className="font-medium">{detailAction.user_name || detailAction.user_email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{bn ? 'অ্যাকশন' : 'Action'}</p>
                    <Badge variant="outline">
                      {ACTION_LABELS[detailAction.action_type]?.[bn ? 'bn' : 'en'] || detailAction.action_type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{bn ? 'টেবিল' : 'Table'}</p>
                    <p className="font-medium">{detailAction.target_table}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{bn ? 'মেনু পাথ' : 'Menu Path'}</p>
                    <p className="font-medium">{detailAction.menu_path}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{bn ? 'তারিখ' : 'Date'}</p>
                    <p className="font-medium">{new Date(detailAction.created_at).toLocaleString(bn ? 'bn-BD' : 'en-US')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{bn ? 'স্ট্যাটাস' : 'Status'}</p>
                    <Badge variant="outline" className={STATUS_COLORS[detailAction.status] || ''}>
                      {detailAction.status === 'pending' ? (bn ? 'পেন্ডিং' : 'Pending') :
                       detailAction.status === 'approved' ? (bn ? 'অনুমোদিত' : 'Approved') :
                       (bn ? 'প্রত্যাখ্যাত' : 'Rejected')}
                    </Badge>
                  </div>
                </div>

                {/* Payload */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{bn ? 'ডেটা/পেলোড' : 'Data/Payload'}</p>
                  <pre className="bg-muted/50 rounded-lg p-3 text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                    {JSON.stringify(detailAction.payload, null, 2)}
                  </pre>
                </div>

                {/* Admin note */}
                {detailAction.status === 'pending' && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {bn ? 'অ্যাডমিন নোট (ঐচ্ছিক)' : 'Admin Note (optional)'}
                    </p>
                    <Input
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      placeholder={bn ? 'নোট লিখুন...' : 'Write a note...'}
                    />
                  </div>
                )}

                {detailAction.admin_note && detailAction.status !== 'pending' && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">{bn ? 'অ্যাডমিন নোট' : 'Admin Note'}</p>
                    <p className="text-sm">{detailAction.admin_note}</p>
                  </div>
                )}

                {/* Action buttons */}
                {detailAction.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => approveMutation.mutate({ id: detailAction.id, status: 'approved' })}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                      {bn ? 'অনুমোদন করুন' : 'Approve'}
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => approveMutation.mutate({ id: detailAction.id, status: 'rejected' })}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                      {bn ? 'প্রত্যাখ্যান করুন' : 'Reject'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminApprovals;
