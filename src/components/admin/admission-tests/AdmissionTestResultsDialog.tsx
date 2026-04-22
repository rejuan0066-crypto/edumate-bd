import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Crown, Medal, Award, Users, CheckCircle2, XCircle, Phone, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  testId: string;
}

const AdmissionTestResultsDialog = ({ open, onOpenChange, testId }: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const { data: test } = useQuery({
    queryKey: ['admission-test-detail', testId],
    queryFn: async () => {
      const { data } = await supabase.from('admission_tests').select('*').eq('id', testId).maybeSingle();
      return data;
    },
    enabled: !!testId && open,
  });

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ['admission-test-results', testId],
    queryFn: async () => {
      const { data } = await supabase
        .from('admission_test_attempts')
        .select('*')
        .eq('test_id', testId)
        .eq('status', 'submitted')
        .order('rank', { ascending: true, nullsFirst: false });
      return data || [];
    },
    enabled: !!testId && open,
  });

  const passed = attempts.filter((a: any) => a.passed).length;
  const failed = attempts.length - passed;
  const top3 = attempts.slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto rounded-[28px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            {bn ? 'মেধাক্রম তালিকা' : 'Merit List'}
            {test && <span className="text-sm text-muted-foreground font-normal">— {bn ? test.title_bn : test.title}</span>}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
        ) : attempts.length === 0 ? (
          <Card className="p-12 rounded-[24px] text-center">
            <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">{bn ? 'এখনো কোনো জমা পড়েনি' : 'No submissions yet'}</p>
          </Card>
        ) : (
          <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 rounded-[20px] bg-primary/5">
                <Users className="w-5 h-5 text-primary mb-2" />
                <div className="text-2xl font-bold text-foreground">{attempts.length}</div>
                <div className="text-xs text-muted-foreground">{bn ? 'মোট পরীক্ষার্থী' : 'Total Candidates'}</div>
              </Card>
              <Card className="p-4 rounded-[20px] bg-emerald-500/5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-2" />
                <div className="text-2xl font-bold text-emerald-600">{passed}</div>
                <div className="text-xs text-muted-foreground">{bn ? 'উত্তীর্ণ' : 'Passed'}</div>
              </Card>
              <Card className="p-4 rounded-[20px] bg-destructive/5">
                <XCircle className="w-5 h-5 text-destructive mb-2" />
                <div className="text-2xl font-bold text-destructive">{failed}</div>
                <div className="text-xs text-muted-foreground">{bn ? 'অকৃতকার্য' : 'Failed'}</div>
              </Card>
            </div>

            {/* Top 3 */}
            {top3.length > 0 && (
              <div>
                <h4 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  {bn ? 'শীর্ষ ৩' : 'Top 3'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {top3.map((a: any, i: number) => {
                    const colors = ['from-amber-400 to-yellow-500', 'from-slate-300 to-slate-400', 'from-orange-400 to-orange-600'];
                    const Icon = [Crown, Medal, Award][i];
                    return (
                      <div key={a.id} className={`relative rounded-[20px] p-4 bg-gradient-to-br ${colors[i]} text-white shadow-lg`}>
                        <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                          {a.rank}
                        </div>
                        <Icon className="w-7 h-7 mb-2 opacity-90" />
                        <div className="font-display font-bold leading-tight">{a.applicant_name}</div>
                        {a.applicant_phone && <div className="text-xs opacity-90 mt-0.5">{a.applicant_phone}</div>}
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-xl font-bold">{a.score}</span>
                          <span className="text-xs opacity-90">/ {test?.total_marks}</span>
                          <span className="text-xs opacity-90 ml-auto">{a.percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Full table */}
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderSpacing: '0 6px', borderCollapse: 'separate' }}>
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left">{bn ? 'র‍্যাংক' : 'Rank'}</th>
                    <th className="px-3 py-2 text-left">{bn ? 'নাম' : 'Name'}</th>
                    <th className="px-3 py-2 text-left">{bn ? 'ফোন' : 'Phone'}</th>
                    <th className="px-3 py-2 text-right">{bn ? 'নম্বর' : 'Score'}</th>
                    <th className="px-3 py-2 text-right">{bn ? 'সঠিক' : 'Correct'}</th>
                    <th className="px-3 py-2 text-right">{bn ? 'শতাংশ' : '%'}</th>
                    <th className="px-3 py-2 text-center">{bn ? 'ফলাফল' : 'Result'}</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a: any) => (
                    <tr key={a.id} className="bg-muted/30 hover:bg-muted/60 transition-colors">
                      <td className="px-3 py-2.5 rounded-l-[16px] font-semibold">{a.rank || '—'}</td>
                      <td className="px-3 py-2.5 font-medium text-foreground">{a.applicant_name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-sm">
                        {a.applicant_phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{a.applicant_phone}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-foreground">{a.score}/{test?.total_marks}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{a.correct_count}/{a.total_questions}</td>
                      <td className="px-3 py-2.5 text-right">{a.percentage}%</td>
                      <td className="px-3 py-2.5 text-center rounded-r-[16px]">
                        {a.passed ? (
                          <Badge className="bg-emerald-500">{bn ? 'উত্তীর্ণ' : 'Passed'}</Badge>
                        ) : (
                          <Badge variant="destructive">{bn ? 'অকৃতকার্য' : 'Failed'}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdmissionTestResultsDialog;
