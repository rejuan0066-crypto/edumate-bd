import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Eye, GraduationCap, Trophy, Clock, CheckCircle2,
  Search, Users, Award, Loader2, BookOpen,
} from 'lucide-react';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import AdmissionTestBuilderDialog from '@/components/admin/admission-tests/AdmissionTestBuilderDialog';
import AdmissionTestResultsDialog from '@/components/admin/admission-tests/AdmissionTestResultsDialog';

const AdminAdmissionTests = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resultsId, setResultsId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['admission-tests-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admission_tests')
        .select('*, classes(name, name_bn)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: attemptCounts = {} } = useQuery({
    queryKey: ['admission-test-attempt-counts', tests.map((t: any) => t.id)],
    queryFn: async () => {
      if (!tests.length) return {};
      const { data } = await supabase
        .from('admission_test_attempts')
        .select('test_id, status')
        .eq('status', 'submitted')
        .in('test_id', tests.map((t: any) => t.id));
      const counts: Record<string, number> = {};
      data?.forEach((a: any) => {
        counts[a.test_id] = (counts[a.test_id] || 0) + 1;
      });
      return counts;
    },
    enabled: tests.length > 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admission_tests')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admission-tests-admin'] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { error } = await supabase
        .from('admission_tests')
        .update({ is_published: publish })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admission-tests-admin'] });
      toast.success(vars.publish
        ? (bn ? 'প্রকাশিত' : 'Published')
        : (bn ? 'আনপাবলিশ করা হয়েছে' : 'Unpublished'));
    },
  });

  const filtered = tests.filter((t: any) => {
    const q = search.toLowerCase();
    return !q || t.title?.toLowerCase().includes(q) || t.title_bn?.includes(search);
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">{bn ? 'অনলাইন ভর্তি পরীক্ষা' : 'Online Admission Tests'}</h1>
              <p className="text-sm text-muted-foreground">{bn ? 'টাইমড MCQ পরীক্ষা — অটো রেজাল্ট ও মেধাক্রম' : 'Timed MCQ tests with auto-result and merit ranking'}</p>
            </div>
          </div>
          <Button onClick={() => { setEditingId(null); setBuilderOpen(true); }} className="rounded-full">
            <Plus className="w-4 h-4 mr-1" /> {bn ? 'নতুন পরীক্ষা' : 'New Test'}
          </Button>
        </div>

        <Card className="p-4 rounded-[24px]">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={bn ? 'পরীক্ষা খুঁজুন...' : 'Search tests...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-full"
            />
          </div>
        </Card>

        {isLoading ? (
          <Card className="p-12 rounded-[28px] text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-12 rounded-[28px] text-center">
            <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">{bn ? 'কোনো পরীক্ষা নেই — নতুন পরীক্ষা তৈরি করুন' : 'No tests yet — create one to get started'}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t: any) => {
              const now = new Date();
              const opens = t.opens_at ? new Date(t.opens_at) : null;
              const closes = t.closes_at ? new Date(t.closes_at) : null;
              const isOpen = t.is_published && (!opens || now >= opens) && (!closes || now <= closes);
              const isUpcoming = t.is_published && opens && now < opens;
              const isClosed = t.is_published && closes && now > closes;

              return (
                <Card key={t.id} className="p-5 rounded-[24px] hover:shadow-lg transition-shadow flex flex-col">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <h3 className="font-display font-bold text-foreground line-clamp-2 leading-tight">
                      {bn ? t.title_bn : t.title}
                    </h3>
                    {!t.is_published ? (
                      <Badge variant="secondary" className="shrink-0">{bn ? 'খসড়া' : 'Draft'}</Badge>
                    ) : isOpen ? (
                      <Badge className="bg-emerald-500 shrink-0">{bn ? 'চলছে' : 'Live'}</Badge>
                    ) : isUpcoming ? (
                      <Badge className="bg-sky-500 shrink-0">{bn ? 'আসন্ন' : 'Upcoming'}</Badge>
                    ) : isClosed ? (
                      <Badge variant="outline" className="shrink-0">{bn ? 'শেষ' : 'Ended'}</Badge>
                    ) : (
                      <Badge className="bg-primary shrink-0">{bn ? 'প্রকাশিত' : 'Published'}</Badge>
                    )}
                  </div>

                  {t.classes && (
                    <p className="text-xs text-muted-foreground mb-3">
                      {bn ? 'শ্রেণী: ' : 'Class: '}{bn ? t.classes.name_bn : t.classes.name}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                    <div className="bg-primary/5 rounded-xl p-2 text-center">
                      <Clock className="w-3.5 h-3.5 mx-auto text-primary mb-1" />
                      <div className="font-bold text-foreground">{t.duration_minutes}</div>
                      <div className="text-muted-foreground">{bn ? 'মিনিট' : 'min'}</div>
                    </div>
                    <div className="bg-amber-500/5 rounded-xl p-2 text-center">
                      <Award className="w-3.5 h-3.5 mx-auto text-amber-600 mb-1" />
                      <div className="font-bold text-foreground">{t.total_marks}</div>
                      <div className="text-muted-foreground">{bn ? 'নম্বর' : 'marks'}</div>
                    </div>
                    <div className="bg-emerald-500/5 rounded-xl p-2 text-center">
                      <Users className="w-3.5 h-3.5 mx-auto text-emerald-600 mb-1" />
                      <div className="font-bold text-foreground">{attemptCounts[t.id] || 0}</div>
                      <div className="text-muted-foreground">{bn ? 'জমা' : 'subs'}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto pt-3 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 rounded-full"
                      onClick={() => { setEditingId(t.id); setBuilderOpen(true); }}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" /> {bn ? 'সম্পাদনা' : 'Edit'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 rounded-full"
                      onClick={() => setResultsId(t.id)}
                    >
                      <Trophy className="w-3.5 h-3.5 mr-1" /> {bn ? 'মেধাক্রম' : 'Merit'}
                    </Button>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant={t.is_published ? 'outline' : 'default'}
                      className="flex-1 rounded-full"
                      onClick={() => togglePublish.mutate({ id: t.id, publish: !t.is_published })}
                    >
                      {t.is_published ? (bn ? 'আনপাবলিশ' : 'Unpublish') : (bn ? 'প্রকাশ' : 'Publish')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(t.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {builderOpen && (
        <AdmissionTestBuilderDialog
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          testId={editingId}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['admission-tests-admin'] });
            setBuilderOpen(false);
          }}
        />
      )}

      {resultsId && (
        <AdmissionTestResultsDialog
          open={!!resultsId}
          onOpenChange={(o) => !o && setResultsId(null)}
          testId={resultsId}
        />
      )}

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title={bn ? 'পরীক্ষা মুছবেন?' : 'Delete test?'}
      />
    </AdminLayout>
  );
};

export default AdminAdmissionTests;
