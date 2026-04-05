import AdminLayout from '@/components/AdminLayout';
import TabContainer from '@/components/TabContainer';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Trash2, Loader2, CheckCircle, Eye, XCircle, Clock, Pencil, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AdmissionForm from '@/components/admission/AdmissionForm';

const AdminStudents = () => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const { checkApproval } = useApprovalCheck('/admin/students', 'students');
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/students');
  const bn = language === 'bn';
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [filterDivisionId, setFilterDivisionId] = useState('all');
  const [filterSessionId, setFilterSessionId] = useState('all');
  const [filterClassId, setFilterClassId] = useState('all');
  const [filterApproval, setFilterApproval] = useState('all');

  // Realtime subscription for auto-refresh
  useEffect(() => {
    const channel = supabase
      .channel('students-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        queryClient.invalidateQueries({ queryKey: ['students'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: academicSessions = [] } = useQuery({
    queryKey: ['academic-sessions-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_sessions').select('*').eq('is_active', true).order('name', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*, divisions(name, name_bn)').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Filter classes by selected division
  const filteredClasses = filterDivisionId !== 'all'
    ? classes.filter((c: any) => c.division_id === filterDivisionId)
    : classes;

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
      if (await checkApproval('edit', { id, approval_status: status }, id, `ছাত্র স্ট্যাটাস: ${status}`)) return;
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
      const student = students.find((s: any) => s.id === id);
      if (await checkApproval('delete', { id, name_bn: student?.name_bn, student_id: student?.student_id }, id, `ছাত্র মুছুন: ${student?.name_bn}`)) return;
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
    // Division filter
    if (filterDivisionId !== 'all') {
      if (s.division_id !== filterDivisionId) return false;
    }
    // Session filter
    if (filterSessionId !== 'all') {
      if (s.session_id !== filterSessionId) return false;
    }
    // Class filter
    if (filterClassId !== 'all') {
      if (s.class_id !== filterClassId) return false;
    }
    // Approval status filter
    if (filterApproval !== 'all') {
      const status = s.approval_status || 'pending';
      if (status !== filterApproval) return false;
    }
    // Text search
    if (search) {
      const q = search.toLowerCase();
      return s.name_bn?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q) || s.roll_number?.toLowerCase().includes(q) || s.name_en?.toLowerCase().includes(q);
    }
    return true;
  });

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success"><CheckCircle className="w-3 h-3" />{bn ? 'অনুমোদিত' : 'Approved'}</span>;
      case 'rejected': return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive"><XCircle className="w-3 h-3" />{bn ? 'প্রত্যাখ্যাত' : 'Rejected'}</span>;
      default: return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning"><Clock className="w-3 h-3" />{bn ? 'অপেক্ষমাণ' : 'Pending'}</span>;
    }
  };

  const getClassName = (classId: string | null) => {
    if (!classId) return '-';
    const cls = classes.find((c: any) => c.id === classId);
    return cls ? (bn ? cls.name_bn : cls.name) : '-';
  };

  const getSessionName = (sessionId: string | null, fallback: string | null) => {
    if (sessionId) {
      const session = academicSessions.find((s: any) => s.id === sessionId);
      if (session) return session.name;
    }
    return fallback || '-';
  };

  const studentListContent = (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{t('students')}</h1>
            <p className="text-sm text-muted-foreground">{bn ? `মোট ${filtered.length} জন ছাত্র` : `Total ${filtered.length} students`}</p>
          </div>
          {canAddItem && (
            <Button onClick={() => setShowAdd(true)} className="btn-primary-gradient flex items-center gap-2">
              <Plus className="w-4 h-4" /> {bn ? 'নতুন ভর্তি' : 'New Admission'}
            </Button>
          )}
        </div>

        <div className="card-elevated p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input placeholder={bn ? 'নাম, আইডি বা রোল দিয়ে খুঁজুন...' : 'Search by name, ID or roll...'} className="pl-10 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterDivisionId} onValueChange={(v) => { setFilterDivisionId(v); setFilterClassId('all'); }}>
              <SelectTrigger className="bg-background w-full sm:w-40">
                <Filter className="w-4 h-4 mr-1 text-muted-foreground" />
                <SelectValue placeholder={bn ? 'বিভাগ' : 'Division'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সকল বিভাগ' : 'All Divisions'}</SelectItem>
                {divisions.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{bn ? d.name_bn : d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSessionId} onValueChange={setFilterSessionId}>
              <SelectTrigger className="bg-background w-full sm:w-40">
                <Filter className="w-4 h-4 mr-1 text-muted-foreground" />
                <SelectValue placeholder={bn ? 'সেশন' : 'Session'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সকল সেশন' : 'All Sessions'}</SelectItem>
                {academicSessions.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterClassId} onValueChange={setFilterClassId}>
              <SelectTrigger className="bg-background w-full sm:w-40">
                <Filter className="w-4 h-4 mr-1 text-muted-foreground" />
                <SelectValue placeholder={bn ? 'শ্রেণী' : 'Class'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সকল শ্রেণী' : 'All Classes'}</SelectItem>
                {filteredClasses.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}{c.divisions ? ` (${bn ? c.divisions.name_bn : c.divisions.name})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterApproval} onValueChange={setFilterApproval}>
              <SelectTrigger className="bg-background w-full sm:w-40">
                <Filter className="w-4 h-4 mr-1 text-muted-foreground" />
                <SelectValue placeholder={bn ? 'স্ট্যাটাস' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সকল স্ট্যাটাস' : 'All Status'}</SelectItem>
                <SelectItem value="pending">{bn ? 'অপেক্ষমাণ' : 'Pending'}</SelectItem>
                <SelectItem value="approved">{bn ? 'অনুমোদিত' : 'Approved'}</SelectItem>
                <SelectItem value="rejected">{bn ? 'প্রত্যাখ্যাত' : 'Rejected'}</SelectItem>
              </SelectContent>
            </Select>
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'বিভাগ' : 'Division'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'সেশন' : 'Session'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'শ্রেণী' : 'Class'}</th>
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
                      <td className="px-4 py-3 text-sm text-muted-foreground">{bn ? s.divisions?.name_bn : s.divisions?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{getSessionName(s.session_id, s.admission_session)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{getClassName(s.class_id)}</td>
                      <td className="px-4 py-3">{getApprovalBadge(s.approval_status || 'pending')}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setShowDetail(s)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"><Eye className="w-4 h-4" /></button>
                          {canEditItem && (
                            <button onClick={() => { setEditStudent(s); setShowAdd(true); }} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title={bn ? 'সম্পাদনা' : 'Edit'}><Pencil className="w-4 h-4" /></button>
                          )}
                          {canEditItem && (s.approval_status !== 'approved') && (
                            <button onClick={() => statusMutation.mutate({ id: s.id, status: 'approved' })} className="p-2 rounded-lg hover:bg-success/10 text-muted-foreground hover:text-success" title={bn ? 'অনুমোদন' : 'Approve'}><CheckCircle className="w-4 h-4" /></button>
                          )}
                          {canEditItem && (s.approval_status !== 'rejected') && (
                            <button onClick={() => statusMutation.mutate({ id: s.id, status: 'rejected' })} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title={bn ? 'প্রত্যাখ্যান' : 'Reject'}><XCircle className="w-4 h-4" /></button>
                          )}
                          {canEditItem && (s.approval_status === 'rejected') && (
                            <button onClick={() => statusMutation.mutate({ id: s.id, status: 'pending' })} className="p-2 rounded-lg hover:bg-warning/10 text-muted-foreground hover:text-warning" title={bn ? 'অপেক্ষমাণে ফেরত' : 'Back to Pending'}><Clock className="w-4 h-4" /></button>
                          )}
                          {canDeleteItem && (
                            <button onClick={() => deleteMutation.mutate(s.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-sm text-muted-foreground">{bn ? 'কোনো ছাত্র পাওয়া যায়নি' : 'No students found'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* Dynamic Admission Form */}
      <AdmissionForm open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) setEditStudent(null); }} editStudent={editStudent} />

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
                  <div className="mt-2">{getApprovalBadge(showDetail.approval_status || 'pending')}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">{bn ? 'পিতা: ' : 'Father: '}</span>{showDetail.father_name || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'মাতা: ' : 'Mother: '}</span>{showDetail.mother_name || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'জন্ম তারিখ: ' : 'DOB: '}</span>{showDetail.date_of_birth || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'লিঙ্গ: ' : 'Gender: '}</span>{showDetail.gender || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'ফোন: ' : 'Phone: '}</span>{showDetail.phone || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'অভিভাবক ফোন: ' : 'Guardian: '}</span>{showDetail.guardian_phone || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'জন্ম নিবন্ধন: ' : 'Birth Reg: '}</span>{showDetail.birth_reg_no || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'ধর্ম: ' : 'Religion: '}</span>{showDetail.religion || '-'}</div>
                <div><span className="text-muted-foreground">{bn ? 'সেশন: ' : 'Session: '}</span>{getSessionName(showDetail.session_id, showDetail.admission_session)}</div>
                <div><span className="text-muted-foreground">{bn ? 'শ্রেণী: ' : 'Class: '}</span>{getClassName(showDetail.class_id)}</div>
                <div><span className="text-muted-foreground">{bn ? 'আবাসিক: ' : 'Residence: '}</span>{showDetail.residence_type || '-'}</div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => { setEditStudent(showDetail); setShowDetail(null); setShowAdd(true); }} className="flex-1">
                  <Pencil className="w-4 h-4 mr-2" /> {bn ? 'সম্পাদনা' : 'Edit'}
                </Button>
                {showDetail.approval_status !== 'approved' && (
                  <Button onClick={() => { statusMutation.mutate({ id: showDetail.id, status: 'approved' }); setShowDetail(null); }} className="flex-1 bg-success hover:bg-success/90 text-success-foreground">
                    <CheckCircle className="w-4 h-4 mr-2" /> {bn ? 'অনুমোদন' : 'Approve'}
                  </Button>
                )}
                {showDetail.approval_status !== 'rejected' && (
                  <Button variant="destructive" onClick={() => { statusMutation.mutate({ id: showDetail.id, status: 'rejected' }); setShowDetail(null); }} className="flex-1">
                    <XCircle className="w-4 h-4 mr-2" /> {bn ? 'প্রত্যাখ্যান' : 'Reject'}
                  </Button>
                )}
                {showDetail.approval_status === 'rejected' && (
                  <Button variant="outline" onClick={() => { statusMutation.mutate({ id: showDetail.id, status: 'pending' }); setShowDetail(null); }} className="flex-1">
                    <Clock className="w-4 h-4 mr-2" /> {bn ? 'অপেক্ষমাণে ফেরত' : 'Back to Pending'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <AdminLayout>
      <TabContainer
        tabs={[
          {
            id: 'list',
            label: bn ? 'ছাত্র তালিকা' : 'Student List',
            icon: Eye,
            content: studentListContent,
          },
          ...(canAddItem ? [{
            id: 'admission',
            label: bn ? 'নতুন ভর্তি' : 'New Admission',
            icon: Plus,
            content: (
              <div className="space-y-4">
                <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                  <Plus className="w-6 h-6 text-primary" />
                  {bn ? 'নতুন ভর্তি ফর্ম' : 'New Admission Form'}
                </h1>
                <p className="text-muted-foreground text-sm">{bn ? 'নতুন ছাত্র ভর্তি করতে নিচের বাটনে ক্লিক করুন' : 'Click below to open the admission form'}</p>
                <Button onClick={() => setShowAdd(true)} className="btn-primary-gradient">
                  <Plus className="w-4 h-4 mr-2" /> {bn ? 'ভর্তি ফর্ম খুলুন' : 'Open Admission Form'}
                </Button>
                <AdmissionForm open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) setEditStudent(null); }} editStudent={editStudent} />
              </div>
            ),
          }] : []),
        ]}
        paramKey="tab"
      />
    </AdminLayout>
  );
};

export default AdminStudents;
