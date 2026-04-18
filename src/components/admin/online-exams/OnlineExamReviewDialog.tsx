import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Users, Clock, Award, FileText, AlertTriangle } from 'lucide-react';

interface Props {
  examId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OnlineExamReviewDialog = ({ examId, open, onOpenChange }: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const { data: exam } = useQuery({
    queryKey: ['online-exam-review', examId],
    queryFn: async () => {
      const { data } = await supabase
        .from('online_exams')
        .select('*, classes(name, name_bn), subjects(name, name_bn)')
        .eq('id', examId)
        .maybeSingle();
      return data;
    },
    enabled: open,
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['online-exam-attempts-list', examId],
    queryFn: async () => {
      const { data } = await supabase
        .from('online_exam_attempts')
        .select('*, students(name_bn, name_en, student_id, roll_number)')
        .eq('exam_id', examId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: open,
  });

  const submitted = attempts.filter((a: any) => a.status === 'submitted' || a.status === 'auto_submitted');
  const inProgress = attempts.filter((a: any) => a.status === 'in_progress');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[38px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {bn ? 'রিভিউ' : 'Review'}: {exam ? (bn ? exam.title_bn : exam.title) : '...'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: bn ? 'মোট অ্যাটেম্পট' : 'Total', value: attempts.length, icon: Users },
            { label: bn ? 'জমাকৃত' : 'Submitted', value: submitted.length, icon: FileText, color: 'text-emerald-600' },
            { label: bn ? 'চলমান' : 'In progress', value: inProgress.length, icon: Clock, color: 'text-amber-600' },
            { label: bn ? 'প্রকাশিত ফলাফল' : 'Published', value: attempts.filter((a: any) => a.is_published).length, icon: Award, color: 'text-primary' },
          ].map((s, i) => (
            <Card key={i} className="rounded-2xl p-4 border-0 bg-muted/30">
              <s.icon className={`w-5 h-5 mb-1 ${s.color || 'text-muted-foreground'}`} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </Card>
          ))}
        </div>

        {attempts.length === 0 ? (
          <Card className="rounded-3xl p-8 text-center text-muted-foreground border-dashed mt-4">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-30" />
            {bn ? 'এখনো কেউ পরীক্ষা দেয়নি' : 'No attempts yet'}
          </Card>
        ) : (
          <div className="space-y-2 mt-4">
            <p className="font-semibold text-sm">{bn ? 'অ্যাটেম্পট তালিকা' : 'Attempts'}</p>
            {attempts.map((a: any) => (
              <Card key={a.id} className="rounded-2xl p-3 border-border/40 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">
                    {a.students ? (bn ? a.students.name_bn : a.students.name_en) : (a.attempted_by_name || (bn ? 'অজ্ঞাত' : 'Unknown'))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.students?.student_id || a.attempted_by_identifier} · {new Date(a.created_at).toLocaleString(bn ? 'bn-BD' : 'en-US')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      a.status === 'submitted' || a.status === 'auto_submitted'
                        ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10'
                        : a.status === 'in_progress'
                          ? 'border-amber-500/40 text-amber-600 bg-amber-500/10'
                          : 'border-destructive/40 text-destructive bg-destructive/10'
                    }
                  >
                    {a.status}
                  </Badge>
                  {(a.status === 'submitted' || a.status === 'auto_submitted') && (
                    <Badge variant="secondary" className="rounded-full">
                      {a.total_score} / {exam?.total_marks}
                    </Badge>
                  )}
                  {a.tab_switch_count > 0 && (
                    <Badge variant="outline" className="rounded-full text-amber-600 border-amber-500/30">
                      {bn ? 'ট্যাব' : 'Tab'}: {a.tab_switch_count}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-4">
          {bn
            ? 'ধাপ ২: ছাত্র ইন্টারফেস + ম্যানুয়াল গ্রেডিং + ফলাফল প্রকাশ পরবর্তী রিলিজে যুক্ত হবে।'
            : 'Step 2: Student interface + manual grading + result publishing in next release.'}
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default OnlineExamReviewDialog;
