import { useState, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus, Pencil, Trash2, Eye, FileText, Clock, Users as UsersIcon,
  CheckCircle2, AlertCircle, Search, ListChecks, Award,
} from 'lucide-react';
import { toast } from 'sonner';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import OnlineExamBuilderDialog from '@/components/admin/online-exams/OnlineExamBuilderDialog';
import OnlineExamReviewDialog from '@/components/admin/online-exams/OnlineExamReviewDialog';
import { useNavigate } from 'react-router-dom';
import { usePagePermissions } from '@/hooks/usePagePermissions';

type ExamStatus = 'all' | 'draft' | 'published' | 'closed' | 'archived';

const STATUS_LABEL_BN: Record<string, string> = {
  draft: 'খসড়া',
  published: 'প্রকাশিত',
  closed: 'বন্ধ',
  archived: 'সংরক্ষিত',
};
const STATUS_LABEL_EN: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Closed',
  archived: 'Archived',
};

const AdminOnlineExams = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/online-exams');

  const [statusFilter, setStatusFilter] = useState<ExamStatus>('all');
  const [search, setSearch] = useState('');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [reviewExamId, setReviewExamId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['online-exams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('online_exams')
        .select(`*, classes(name, name_bn), subjects(name, name_bn), exam_sessions(name, name_bn)`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: questionCounts = {} } = useQuery({
    queryKey: ['online-exam-question-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('online_exam_questions')
        .select('exam_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        counts[row.exam_id] = (counts[row.exam_id] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: attemptCounts = {} } = useQuery({
    queryKey: ['online-exam-attempt-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('online_exam_attempts')
        .select('exam_id, status');
      if (error) throw error;
      const counts: Record<string, { total: number; submitted: number; pending: number }> = {};
      (data || []).forEach((row: any) => {
        if (!counts[row.exam_id]) counts[row.exam_id] = { total: 0, submitted: 0, pending: 0 };
        counts[row.exam_id].total += 1;
        if (row.status === 'submitted' || row.status === 'auto_submitted') counts[row.exam_id].submitted += 1;
        if (row.status === 'in_progress') counts[row.exam_id].pending += 1;
      });
      return counts;
    },
  });

  const filtered = useMemo(() => {
    return exams.filter((e: any) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          e.title?.toLowerCase().includes(q) ||
          e.title_bn?.toLowerCase().includes(q) ||
          e.classes?.name?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [exams, statusFilter, search]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('online_exams')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-exams'] });
      toast.success(language === 'bn' ? 'পরীক্ষা মুছে ফেলা হয়েছে' : 'Exam deleted');
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === 'published' ? 'draft' : 'published';
      const { error } = await supabase
        .from('online_exams')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['online-exams'] });
      toast.success(
        language === 'bn'
          ? newStatus === 'published'
            ? 'পরীক্ষা প্রকাশিত হয়েছে'
            : 'খসড়ায় ফেরত আনা হয়েছে'
          : newStatus === 'published'
            ? 'Exam published'
            : 'Reverted to draft'
      );
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleNew = () => {
    setEditingExamId(null);
    setBuilderOpen(true);
  };

  const handleEdit = (id: string) => {
    setEditingExamId(id);
    setBuilderOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <ListChecks className="w-6 h-6 text-primary" />
              </div>
              {language === 'bn' ? 'অনলাইন পরীক্ষা' : 'Online Exams'}
            </h1>
            <p className="text-muted-foreground mt-1 ml-15">
              {language === 'bn'
                ? 'পরীক্ষা তৈরি, প্রশ্ন বিল্ডার, রিভিউ ও ফলাফল প্রকাশনা'
                : 'Create exams, question builder, review and publish results'}
            </p>
          </div>
          {canAddItem && (
            <Button onClick={handleNew} className="rounded-2xl px-6">
              <Plus className="w-4 h-4 mr-2" />
              {language === 'bn' ? 'নতুন পরীক্ষা' : 'New Exam'}
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: language === 'bn' ? 'মোট পরীক্ষা' : 'Total Exams',
              value: exams.length,
              icon: FileText,
              color: 'text-primary',
            },
            {
              label: language === 'bn' ? 'প্রকাশিত' : 'Published',
              value: exams.filter((e: any) => e.status === 'published').length,
              icon: CheckCircle2,
              color: 'text-emerald-600',
            },
            {
              label: language === 'bn' ? 'খসড়া' : 'Draft',
              value: exams.filter((e: any) => e.status === 'draft').length,
              icon: AlertCircle,
              color: 'text-amber-600',
            },
            {
              label: language === 'bn' ? 'মোট অ্যাটেম্পট' : 'Total Attempts',
              value: Object.values(attemptCounts).reduce((sum: number, v: any) => sum + (v?.total ?? 0), 0),
              icon: UsersIcon,
              color: 'text-blue-600',
            },
          ].map((s, i) => (
            <Card key={i} className="rounded-3xl p-5 border-0 bg-gradient-to-br from-card to-card/50 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className={`w-8 h-8 ${s.color}`} />
              </div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="rounded-3xl p-4 border-0 bg-card/50 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={language === 'bn' ? 'পরীক্ষা খুঁজুন...' : 'Search exams...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-2xl border-border/50"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ExamStatus)}>
              <TabsList className="rounded-2xl">
                <TabsTrigger value="all" className="rounded-xl">{language === 'bn' ? 'সব' : 'All'}</TabsTrigger>
                <TabsTrigger value="draft" className="rounded-xl">{language === 'bn' ? 'খসড়া' : 'Draft'}</TabsTrigger>
                <TabsTrigger value="published" className="rounded-xl">{language === 'bn' ? 'প্রকাশিত' : 'Published'}</TabsTrigger>
                <TabsTrigger value="closed" className="rounded-xl">{language === 'bn' ? 'বন্ধ' : 'Closed'}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Card>

        {/* Exam List */}
        {isLoading ? (
          <Card className="rounded-3xl p-10 text-center text-muted-foreground">
            {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="rounded-3xl p-10 text-center">
            <ListChecks className="w-16 h-16 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {language === 'bn' ? 'কোনো পরীক্ষা পাওয়া যায়নি' : 'No exams found'}
            </p>
            {canAddItem && (
              <Button onClick={handleNew} className="mt-4 rounded-2xl">
                <Plus className="w-4 h-4 mr-2" />
                {language === 'bn' ? 'প্রথম পরীক্ষা তৈরি করুন' : 'Create first exam'}
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((exam: any) => {
              const qCount = questionCounts[exam.id] || 0;
              const aCounts = attemptCounts[exam.id] || { total: 0, submitted: 0, pending: 0 };
              const statusLabel = (language === 'bn' ? STATUS_LABEL_BN : STATUS_LABEL_EN)[exam.status] ?? exam.status;
              return (
                <Card
                  key={exam.id}
                  className="rounded-[28px] p-5 border-0 bg-gradient-to-br from-card to-card/40 backdrop-blur-xl hover:shadow-xl transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg leading-tight">
                        {language === 'bn' ? exam.title_bn : (exam.title || exam.title_bn)}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className={
                            exam.status === 'published'
                              ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10'
                              : exam.status === 'draft'
                                ? 'border-amber-500/40 text-amber-600 bg-amber-500/10'
                                : 'border-border'
                          }
                        >
                          {statusLabel}
                        </Badge>
                        {exam.classes && (
                          <Badge variant="secondary" className="rounded-full">
                            {language === 'bn' ? exam.classes.name_bn : exam.classes.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="rounded-2xl bg-muted/40 p-2">
                      <Clock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">{language === 'bn' ? 'সময়' : 'Time'}</p>
                      <p className="font-semibold text-sm">{exam.duration_minutes}m</p>
                    </div>
                    <div className="rounded-2xl bg-muted/40 p-2">
                      <FileText className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">{language === 'bn' ? 'প্রশ্ন' : 'Questions'}</p>
                      <p className="font-semibold text-sm">{qCount}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/40 p-2">
                      <Award className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">{language === 'bn' ? 'নম্বর' : 'Marks'}</p>
                      <p className="font-semibold text-sm">{exam.total_marks}</p>
                    </div>
                  </div>

                  {aCounts.total > 0 && (
                    <div className="mb-3 p-2 rounded-2xl bg-primary/5 text-xs flex justify-between">
                      <span>{language === 'bn' ? 'অ্যাটেম্পট' : 'Attempts'}: <b>{aCounts.total}</b></span>
                      <span className="text-emerald-600">{language === 'bn' ? 'জমা' : 'Submitted'}: <b>{aCounts.submitted}</b></span>
                      {aCounts.pending > 0 && (
                        <span className="text-amber-600">{language === 'bn' ? 'চলমান' : 'Active'}: <b>{aCounts.pending}</b></span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {canEditItem && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl flex-1"
                        onClick={() => handleEdit(exam.id)}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        {language === 'bn' ? 'এডিট' : 'Edit'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl flex-1"
                      onClick={() => setReviewExamId(exam.id)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      {language === 'bn' ? 'রিভিউ' : 'Review'}
                    </Button>
                    {canEditItem && (
                      <Button
                        size="sm"
                        variant={exam.status === 'published' ? 'secondary' : 'default'}
                        className="rounded-xl"
                        onClick={() => togglePublish.mutate({ id: exam.id, status: exam.status })}
                        disabled={togglePublish.isPending || qCount === 0}
                      >
                        {exam.status === 'published'
                          ? (language === 'bn' ? 'খসড়া' : 'Unpublish')
                          : (language === 'bn' ? 'প্রকাশ' : 'Publish')}
                      </Button>
                    )}
                    {canDeleteItem && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-xl text-destructive"
                        onClick={() => setDeleteId(exam.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {builderOpen && (
        <OnlineExamBuilderDialog
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          examId={editingExamId}
          createdBy={user?.id}
        />
      )}

      {reviewExamId && (
        <OnlineExamReviewDialog
          examId={reviewExamId}
          open={!!reviewExamId}
          onOpenChange={(open) => !open && setReviewExamId(null)}
        />
      )}

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={language === 'bn' ? 'পরীক্ষা মুছবেন?' : 'Delete exam?'}
        description={language === 'bn'
          ? 'এই পরীক্ষা ও সংশ্লিষ্ট প্রশ্ন মুছে যাবে। রিসাইকেল বিন থেকে পুনরুদ্ধার করা যাবে।'
          : 'This exam and its questions will be removed. You can restore from recycle bin.'}
      />
    </AdminLayout>
  );
};

export default AdminOnlineExams;
