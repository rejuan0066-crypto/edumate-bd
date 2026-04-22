import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import PublicLayout from '@/components/PublicLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Medal, Award, Users, ChevronLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const AdmissionTestMerit = () => {
  const { id: testId } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const bn = language === 'bn';

  const { data: test } = useQuery({
    queryKey: ['public-merit-test', testId],
    queryFn: async () => {
      const { data } = await supabase
        .from('admission_tests')
        .select('*')
        .eq('id', testId)
        .eq('is_published', true)
        .is('deleted_at', null)
        .maybeSingle();
      return data;
    },
    enabled: !!testId,
  });

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ['public-merit-attempts', testId],
    queryFn: async () => {
      const { data } = await supabase
        .from('admission_test_attempts')
        .select('id, applicant_name, applicant_phone, score, percentage, passed, rank, correct_count, total_questions')
        .eq('test_id', testId)
        .eq('status', 'submitted')
        .order('rank', { ascending: true, nullsFirst: false });
      return data || [];
    },
    enabled: !!testId,
  });

  const top3 = attempts.slice(0, 3);
  const passed = attempts.filter((a: any) => a.passed).length;

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admission-tests"><Button variant="ghost" size="sm" className="rounded-full"><ChevronLeft className="w-4 h-4" /></Button></Link>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-7 h-7 text-amber-500" /> {bn ? 'মেধাক্রম তালিকা' : 'Merit List'}
            </h1>
            {test && <p className="text-muted-foreground mt-1">{bn ? test.title_bn : test.title}</p>}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" /></div>
        ) : !test ? (
          <Card className="p-12 rounded-[28px] text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <p className="text-foreground">{bn ? 'পরীক্ষা পাওয়া যায়নি' : 'Test not found'}</p>
          </Card>
        ) : attempts.length === 0 ? (
          <Card className="p-16 rounded-[28px] text-center max-w-2xl mx-auto">
            <Users className="w-20 h-20 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-display font-semibold text-foreground mb-2">
              {bn ? 'এখনো কোনো জমা পড়েনি' : 'No submissions yet'}
            </h2>
            <p className="text-muted-foreground">{bn ? 'প্রথম পরীক্ষার্থী হতে চান?' : 'Be the first to take this test'}</p>
            <Link to={`/admission-test/${testId}`}>
              <Button className="rounded-full mt-4">{bn ? 'পরীক্ষা দিন' : 'Take Test'}</Button>
            </Link>
          </Card>
        ) : (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 rounded-[20px] bg-primary/5 text-center">
                <Users className="w-6 h-6 text-primary mx-auto mb-1" />
                <div className="text-2xl font-bold text-foreground">{attempts.length}</div>
                <div className="text-xs text-muted-foreground">{bn ? 'মোট পরীক্ষার্থী' : 'Total Candidates'}</div>
              </Card>
              <Card className="p-4 rounded-[20px] bg-emerald-500/5 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-emerald-600">{passed}</div>
                <div className="text-xs text-muted-foreground">{bn ? 'উত্তীর্ণ' : 'Passed'}</div>
              </Card>
              <Card className="p-4 rounded-[20px] bg-amber-500/5 text-center">
                <Trophy className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-foreground">{test.total_marks}</div>
                <div className="text-xs text-muted-foreground">{bn ? 'মোট নম্বর' : 'Total Marks'}</div>
              </Card>
            </div>

            {/* Top 3 podium */}
            {top3.length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" /> {bn ? 'শীর্ষ ৩' : 'Top 3'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {top3.map((a: any, i: number) => {
                    const colors = ['from-amber-400 to-yellow-500', 'from-slate-300 to-slate-400', 'from-orange-400 to-orange-600'];
                    const Icon = [Crown, Medal, Award][i];
                    return (
                      <div key={a.id} className={`relative rounded-[24px] p-5 bg-gradient-to-br ${colors[i]} text-white shadow-xl`}>
                        <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full w-9 h-9 flex items-center justify-center font-bold">
                          {a.rank}
                        </div>
                        <Icon className="w-8 h-8 mb-3 opacity-90" />
                        <div className="font-display font-bold text-lg leading-tight">{a.applicant_name}</div>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-2xl font-bold">{a.score}</span>
                          <span className="text-sm opacity-90">/ {test.total_marks}</span>
                        </div>
                        <div className="text-sm opacity-90">{a.percentage}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Full table */}
            <Card className="p-5 rounded-[28px] overflow-x-auto">
              <table className="w-full" style={{ borderSpacing: '0 6px', borderCollapse: 'separate' }}>
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left">{bn ? 'র‍্যাংক' : 'Rank'}</th>
                    <th className="px-3 py-2 text-left">{bn ? 'নাম' : 'Name'}</th>
                    <th className="px-3 py-2 text-right">{bn ? 'নম্বর' : 'Score'}</th>
                    <th className="px-3 py-2 text-right">{bn ? 'সঠিক' : 'Correct'}</th>
                    <th className="px-3 py-2 text-right">{bn ? 'শতাংশ' : '%'}</th>
                    <th className="px-3 py-2 text-center">{bn ? 'ফলাফল' : 'Result'}</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a: any) => (
                    <tr key={a.id} className={`bg-muted/30 hover:bg-muted/60 transition-colors ${a.rank === 1 ? 'bg-amber-50 dark:bg-amber-500/10' : ''}`}>
                      <td className="px-3 py-3 rounded-l-[16px]">
                        {a.rank && a.rank <= 3 ? (
                          <span className={`inline-flex w-8 h-8 rounded-full items-center justify-center font-bold text-white text-sm ${
                            a.rank === 1 ? 'bg-amber-500' : a.rank === 2 ? 'bg-slate-400' : 'bg-orange-500'
                          }`}>{a.rank}</span>
                        ) : (
                          <span className="font-semibold text-foreground">{a.rank || '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-medium text-foreground">{a.applicant_name}</td>
                      <td className="px-3 py-3 text-right font-bold text-foreground">{a.score}/{test.total_marks}</td>
                      <td className="px-3 py-3 text-right text-muted-foreground">{a.correct_count}/{a.total_questions}</td>
                      <td className="px-3 py-3 text-right">{a.percentage}%</td>
                      <td className="px-3 py-3 text-center rounded-r-[16px]">
                        {a.passed ? (
                          <Badge className="bg-emerald-500">{bn ? 'উত্তীর্ণ' : 'Pass'}</Badge>
                        ) : (
                          <Badge variant="destructive">{bn ? 'অকৃতকার্য' : 'Fail'}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default AdmissionTestMerit;
