import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Trash2, Loader2, CheckCircle, Eye, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AdmissionForm from '@/components/admission/AdmissionForm';

const AdminStudents = () => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const bn = language === 'bn';
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*, divisions(name, name_bn)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('students').update({ approval_status: status, status: status === 'approved' ? 'active' : status === 'rejected' ? 'inactive' : 'active' } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success(bn ? 'স্ট্যাটাস আপডেট হয়েছে' : 'Status updated');
    },
    onError: () => toast.error('Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success(bn ? 'ছাত্র মুছে ফেলা হয়েছে' : 'Student deleted');
    },
    onError: () => toast.error('Error'),
  });

  const filtered = students.filter((s: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name_bn?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q) || s.roll_number?.toLowerCase().includes(q) || s.name_en?.toLowerCase().includes(q);
  });

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success"><CheckCircle className="w-3 h-3" />{bn ? 'অনুমোদিত' : 'Approved'}</span>;
      case 'rejected': return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive"><XCircle className="w-3 h-3" />{bn ? 'প্রত্যাখ্যাত' : 'Rejected'}</span>;
      default: return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning"><Clock className="w-3 h-3" />{bn ? 'অপেক্ষমাণ' : 'Pending'}</span>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{t('students')}</h1>
            <p className="text-sm text-muted-foreground">{bn ? `মোট ${students.length} জন ছাত্র` : `Total ${students.length} students`}</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="btn-primary-gradient flex items-center gap-2">
            <Plus className="w-4 h-4" /> {bn ? 'নতুন ভর্তি' : 'New Admission'}
          </Button>
        </div>

        <div className="card-elevated p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder={bn ? 'নাম, আইডি বা রোল দিয়ে খুঁজুন...' : 'Search by name, ID or roll...'} className="pl-10 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="card-elevated overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'নাম' : 'Name'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'আইডি' : 'ID'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'রোল' : 'Roll'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'সেশন' : 'Session'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'অনুমোদন' : 'Approval'}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s: any) => (
                    <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {s.photo_url ? (
                            <img src={s.photo_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {s.name_bn?.[0] || '?'}
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-foreground text-sm block">{s.name_bn}</span>
                            {s.name_en && <span className="text-xs text-muted-foreground">{s.name_en}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.student_id}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.roll_number || '-'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{(s as any).admission_session || '-'}</td>
                      <td className="px-4 py-3">{getApprovalBadge((s as any).approval_status || 'pending')}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setShowDetail(s)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"><Eye className="w-4 h-4" /></button>
                          {((s as any).approval_status !== 'approved') && (
                            <button onClick={() => statusMutation.mutate({ id: s.id, status: 'approved' })} className="p-2 rounded-lg hover:bg-success/10 text-muted-foreground hover:text-success" title={bn ? 'অনুমোদন' : 'Approve'}><CheckCircle className="w-4 h-4" /></button>
                          )}
                          {((s as any).approval_status !== 'rejected') && (
                            <button onClick={() => statusMutation.mutate({ id: s.id, status: 'rejected' })} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title={bn ? 'প্রত্যাখ্যান' : 'Reject'}><XCircle className="w-4 h-4" /></button>
                          )}
                          {((s as any).approval_status === 'rejected') && (
                            <button onClick={() => statusMutation.mutate({ id: s.id, status: 'pending' })} className="p-2 rounded-lg hover:bg-warning/10 text-muted-foreground hover:text-warning" title={bn ? 'অপেক্ষমাণে ফেরত' : 'Back to Pending'}><Clock className="w-4 h-4" /></button>
                          )}
                          <button onClick={() => deleteMutation.mutate(s.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">{bn ? 'কোনো ছাত্র পাওয়া যায়নি' : 'No students found'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Admission Form */}
      <AdmissionForm open={showAdd} onOpenChange={setShowAdd} />

      {/* Detail View Dialog */}
      <Dialog open={!!showDetail} onOpenChange={o => { if (!o) setShowDetail(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{bn ? 'ছাত্রের বিস্তারিত' : 'Student Details'}</DialogTitle></DialogHeader>
          {showDetail && (
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-4">
                {showDetail.photo_url ? (
                  <img src={showDetail.photo_url} className="w-24 h-28 rounded-lg object-cover border" alt="" />
                ) : (
                  <div className="w-24 h-28 rounded-lg bg-secondary flex items-center justify-center text-3xl font-bold text-muted-foreground">{showDetail.name_bn?.[0]}</div>
                )}
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-bold text-foreground">{showDetail.name_bn}</h3>
                  {showDetail.name_en && <p className="text-sm text-muted-foreground">{showDetail.name_en}</p>}
                  <p className="text-sm">{bn ? 'আইডি: ' : 'ID: '}{showDetail.student_id}</p>
                  <p className="text-sm">{bn ? 'রোল: ' : 'Roll: '}{showDetail.roll_number || '-'}</p>
                  <div className="mt-2">{getApprovalBadge((showDetail as any).approval_status || 'pending')}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">{bn ? 'পিতা: ' : 'Father: '}</span>{showDetail.father_name || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'মাতা: ' : 'Mother: '}</span>{showDetail.mother_name || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'জন্ম তারিখ: ' : 'DOB: '}</span>{showDetail.date_of_birth || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'লিঙ্গ: ' : 'Gender: '}</span>{showDetail.gender || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'ফোন: ' : 'Phone: '}</span>{showDetail.phone || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'অভিভাবক ফোন: ' : 'Guardian: '}</span>{showDetail.guardian_phone || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'জন্ম নিবন্ধন: ' : 'Birth Reg: '}</span>{(showDetail as any).birth_reg_no || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'ধর্ম: ' : 'Religion: '}</span>{(showDetail as any).religion || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'সেশন: ' : 'Session: '}</span>{(showDetail as any).admission_session || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'আবাসিক: ' : 'Residence: '}</span>{showDetail.residence_type || '-'}</div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                {(showDetail as any).approval_status !== 'approved' && (
                  <Button onClick={() => { statusMutation.mutate({ id: showDetail.id, status: 'approved' }); setShowDetail(null); }} className="flex-1 bg-success hover:bg-success/90 text-success-foreground">
                    <CheckCircle className="w-4 h-4 mr-2" /> {bn ? 'অনুমোদন' : 'Approve'}
                  </Button>
                )}
                {(showDetail as any).approval_status !== 'rejected' && (
                  <Button variant="destructive" onClick={() => { statusMutation.mutate({ id: showDetail.id, status: 'rejected' }); setShowDetail(null); }} className="flex-1">
                    <XCircle className="w-4 h-4 mr-2" /> {bn ? 'প্রত্যাখ্যান' : 'Reject'}
                  </Button>
                )}
                {(showDetail as any).approval_status === 'rejected' && (
                  <Button variant="outline" onClick={() => { statusMutation.mutate({ id: showDetail.id, status: 'pending' }); setShowDetail(null); }} className="flex-1">
                    <Clock className="w-4 h-4 mr-2" /> {bn ? 'অপেক্ষমাণে ফেরত' : 'Back to Pending'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminStudents;
