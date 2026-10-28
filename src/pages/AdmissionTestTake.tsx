import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import PublicLayout from '@/components/PublicLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Clock, Send, ChevronLeft, ChevronRight, Loader2, CheckCircle2, XCircle, Trophy, GraduationCap, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const AdmissionTestTake = () => {
  const { id: testId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [stage, setStage] = useState<'intro' | 'taking' | 'submitting' | 'done'>('intro');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [orderedQuestions, setOrderedQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const startedAtRef = useRef<number>(0);

  // Applicant fields
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantGuardian, setApplicantGuardian] = useState('');
  const [applicantAddress, setApplicantAddress] = useState('');
  const [applicantNidBirth, setApplicantNidBirth] = useState('');

  const { data: test, isLoading } = useQuery({
    queryKey: ['public-admission-test', testId],
    queryFn: async () => {
      const { data } = await supabase
        .from('admission_tests')
        .select('*, classes(name, name_bn)')
        .eq('id', testId)
        .eq('is_published', true)
        .is('deleted_at', null)
        .maybeSingle();
      return data;
    },
    enabled: !!testId,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['public-admission-questions', testId],
    queryFn: async () => {
      const { data } = await supabase
        .from('admission_test_questions_public' as any)
        .select('id, question_text, question_text_bn, options, marks, sort_order')
        .eq('test_id', testId)
        .order('sort_order');
      return data || [];
    },
    enabled: !!testId,
  });

  // Check window
  const windowStatus = useMemo(() => {
    if (!test) return 'loading';
    const now = new Date();
    const opens = test.opens_at ? new Date(test.opens_at) : null;
    const closes = test.closes_at ? new Date(test.closes_at) : null;
    if (opens && now < opens) return 'upcoming';
    if (closes && now > closes) return 'closed';
    return 'open';
  }, [test]);

  // Timer
  useEffect(() => {
    if (stage !== 'taking' || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [stage]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!applicantName.trim()) {
      toast.error(bn ? 'পূর্ণ নাম দিন' : 'Full name required');
      return;
    }
    if (!applicantPhone.trim()) {
      toast.error(bn ? 'মোবাইল নম্বর দিন' : 'Phone required');
      return;
    }
    if (!questions.length) {
      toast.error(bn ? 'কোনো প্রশ্ন পাওয়া যায়নি' : 'No questions found');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('submit_admission_test_attempt' as any, {
        p_test_id: testId,
        p_applicant_name: applicantName.trim(),
        p_applicant_phone: applicantPhone.trim(),
        p_applicant_email: applicantEmail.trim() || null,
        p_applicant_guardian: applicantGuardian.trim() || null,
        p_applicant_address: applicantAddress.trim() || null,
        p_applicant_nid_birth: applicantNidBirth.trim() || null,
      });
      if (error) throw error;

      setAttemptId(data as unknown as string);
      setOrderedQuestions(test?.shuffle_questions ? shuffle(questions) : questions);
      setSecondsLeft((test?.duration_minutes || 60) * 60);
      startedAtRef.current = Date.now();
      setStage('taking');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSubmit = async () => {
    if (!attemptId) return;
    setStage('submitting');
    setShowSubmitConfirm(false);

    const durationSeconds = Math.floor((Date.now() - startedAtRef.current) / 1000);

    try {
      const { data, error } = await supabase.functions.invoke('submit-admission-test', {
        body: { attemptId, answers, durationSeconds, applicantPhone: applicantPhone.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      setStage('done');
    } catch (e: any) {
      toast.error(e.message);
      setStage('taking');
    }
  };

  const handleAutoSubmit = () => {
    toast.warning(bn ? 'সময় শেষ — অটো জমা হচ্ছে' : 'Time up — auto submitting');
    handleSubmit();
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
        </div>
      </PublicLayout>
    );
  }

  if (!test) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Card className="p-12 rounded-[28px] max-w-lg mx-auto">
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-foreground mb-2">
              {bn ? 'পরীক্ষা পাওয়া যায়নি' : 'Test not found'}
            </h2>
            <Link to="/admission-tests"><Button variant="outline" className="rounded-full mt-4">{bn ? 'পরীক্ষার তালিকা' : 'View All Tests'}</Button></Link>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  if (windowStatus !== 'open' && stage === 'intro') {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Card className="p-12 rounded-[28px] max-w-lg mx-auto">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-foreground mb-2">
              {windowStatus === 'upcoming'
                ? (bn ? 'পরীক্ষা এখনো শুরু হয়নি' : 'Test has not started yet')
                : (bn ? 'পরীক্ষার সময় শেষ' : 'Test window has closed')}
            </h2>
            <Link to="/admission-tests"><Button variant="outline" className="rounded-full mt-4">{bn ? 'পরীক্ষার তালিকা' : 'View All Tests'}</Button></Link>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  // INTRO
  if (stage === 'intro') {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-10 max-w-3xl">
          <Card className="p-8 rounded-[28px]">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-3">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                {bn ? test.title_bn : test.title}
              </h1>
              {(bn ? test.description_bn : test.description) && (
                <p className="text-muted-foreground mt-2">{bn ? test.description_bn : test.description}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-primary/5 rounded-2xl p-4 text-center">
                <Clock className="w-5 h-5 mx-auto text-primary mb-1" />
                <div className="font-bold text-lg text-foreground">{test.duration_minutes}</div>
                <div className="text-xs text-muted-foreground">{bn ? 'মিনিট' : 'Minutes'}</div>
              </div>
              <div className="bg-amber-500/5 rounded-2xl p-4 text-center">
                <Trophy className="w-5 h-5 mx-auto text-amber-600 mb-1" />
                <div className="font-bold text-lg text-foreground">{test.total_marks}</div>
                <div className="text-xs text-muted-foreground">{bn ? 'মোট নম্বর' : 'Total Marks'}</div>
              </div>
              <div className="bg-emerald-500/5 rounded-2xl p-4 text-center">
                <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
                <div className="font-bold text-lg text-foreground">{questions.length}</div>
                <div className="text-xs text-muted-foreground">{bn ? 'প্রশ্ন' : 'Questions'}</div>
              </div>
            </div>

            {test.instructions_bn && (
              <Card className="p-4 rounded-2xl bg-muted/30 mb-6">
                <h3 className="font-semibold text-foreground mb-2">{bn ? 'নিয়মাবলী' : 'Instructions'}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{test.instructions_bn}</p>
              </Card>
            )}

            <div className="space-y-4">
              <h3 className="font-display font-semibold text-foreground">{bn ? 'আবেদনকারীর তথ্য' : 'Applicant Information'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{bn ? 'পূর্ণ নাম *' : 'Full Name *'}</Label>
                  <Input value={applicantName} onChange={(e) => setApplicantName(e.target.value)} className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label>{bn ? 'মোবাইল *' : 'Mobile *'}</Label>
                  <Input type="tel" value={applicantPhone} onChange={(e) => setApplicantPhone(e.target.value)} className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label>{bn ? 'ইমেইল' : 'Email'}</Label>
                  <Input type="email" value={applicantEmail} onChange={(e) => setApplicantEmail(e.target.value)} className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label>{bn ? 'অভিভাবকের নাম' : 'Guardian Name'}</Label>
                  <Input value={applicantGuardian} onChange={(e) => setApplicantGuardian(e.target.value)} className="rounded-xl mt-1" />
                </div>
                <div className="md:col-span-2">
                  <Label>{bn ? 'এনআইডি / জন্ম নিবন্ধন' : 'NID / Birth Certificate'}</Label>
                  <Input value={applicantNidBirth} onChange={(e) => setApplicantNidBirth(e.target.value)} className="rounded-xl mt-1" />
                </div>
                <div className="md:col-span-2">
                  <Label>{bn ? 'ঠিকানা' : 'Address'}</Label>
                  <Textarea value={applicantAddress} onChange={(e) => setApplicantAddress(e.target.value)} className="rounded-xl mt-1" rows={2} />
                </div>
              </div>

              <Button onClick={handleStart} size="lg" className="w-full rounded-full mt-4">
                {bn ? 'পরীক্ষা শুরু করুন' : 'Start Test'} <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  // SUBMITTING
  if (stage === 'submitting') {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{bn ? 'উত্তর জমা হচ্ছে...' : 'Submitting your answers...'}</p>
        </div>
      </PublicLayout>
    );
  }

  // DONE
  if (stage === 'done' && result) {
    const showResultDetail = test.show_result_immediately;
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-10 max-w-2xl">
          <Card className={`p-8 rounded-[28px] text-center ${result.passed ? 'bg-gradient-to-br from-emerald-500/5 to-primary/5' : 'bg-gradient-to-br from-amber-500/5 to-destructive/5'}`}>
            <div className={`inline-flex p-4 rounded-2xl mb-4 ${result.passed ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
              {result.passed ? <CheckCircle2 className="w-12 h-12 text-emerald-600" /> : <XCircle className="w-12 h-12 text-destructive" />}
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              {bn ? 'পরীক্ষা সম্পন্ন!' : 'Test Submitted!'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {result.passed
                ? (bn ? 'অভিনন্দন! আপনি উত্তীর্ণ হয়েছেন।' : 'Congratulations! You have passed.')
                : (bn ? 'দুঃখিত, আপনি পাশ করতে পারেননি।' : 'Sorry, you did not pass.')}
            </p>

            {showResultDetail ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-background/50 rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground">{bn ? 'নম্বর' : 'Score'}</div>
                  <div className="text-2xl font-bold text-foreground mt-1">{result.score}/{result.totalMarks}</div>
                </div>
                <div className="bg-background/50 rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground">{bn ? 'সঠিক' : 'Correct'}</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">{result.correctCount}/{result.totalQuestions}</div>
                </div>
                <div className="bg-background/50 rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground">{bn ? 'শতাংশ' : 'Percentage'}</div>
                  <div className="text-2xl font-bold text-primary mt-1">{result.percentage}%</div>
                </div>
                <div className="bg-background/50 rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground">{bn ? 'ফলাফল' : 'Result'}</div>
                  <div className={`text-2xl font-bold mt-1 ${result.passed ? 'text-emerald-600' : 'text-destructive'}`}>
                    {result.passed ? (bn ? 'উত্তীর্ণ' : 'PASS') : (bn ? 'অকৃতকার্য' : 'FAIL')}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-6">
                {bn ? 'বিস্তারিত ফলাফল পরে প্রকাশ করা হবে' : 'Detailed results will be published later'}
              </p>
            )}

            <div className="flex gap-3 justify-center">
              <Link to={`/admission-test/${testId}/merit`}>
                <Button className="rounded-full"><Trophy className="w-4 h-4 mr-1" /> {bn ? 'মেধাক্রম দেখুন' : 'View Merit List'}</Button>
              </Link>
              <Link to="/admission-tests">
                <Button variant="outline" className="rounded-full">{bn ? 'অন্যান্য পরীক্ষা' : 'Other Tests'}</Button>
              </Link>
            </div>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  // TAKING
  const q = orderedQuestions[currentIdx];
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const progressPct = orderedQuestions.length ? (answeredCount / orderedQuestions.length) * 100 : 0;
  const lowTime = secondsLeft < 300;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-foreground line-clamp-1">{bn ? test.title_bn : test.title}</h1>
            <Progress value={progressPct} className="h-1.5 mt-1.5" />
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-sm font-bold tabular-nums ${
            lowTime ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-primary/10 text-primary'
          }`}>
            <Clock className="w-4 h-4" />
            {formatTime(secondsLeft)}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <Badge className="rounded-full">
            {bn ? `প্রশ্ন ${currentIdx + 1}/${orderedQuestions.length}` : `Q ${currentIdx + 1}/${orderedQuestions.length}`}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {bn ? `উত্তর দেওয়া হয়েছে: ${answeredCount}/${orderedQuestions.length}` : `Answered: ${answeredCount}/${orderedQuestions.length}`}
          </span>
        </div>

        {q && (
          <Card className="p-6 rounded-[28px]">
            <p className="text-lg font-medium text-foreground mb-5 whitespace-pre-line">
              {bn ? (q.question_text_bn || q.question_text) : (q.question_text || q.question_text_bn)}
            </p>
            <RadioGroup value={answers[q.id] || ''} onValueChange={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}>
              <div className="space-y-2">
                {(q.options as string[]).map((opt: string, oi: number) => (
                  <label
                    key={oi}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      answers[q.id] === opt ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value={opt} />
                    <span className="text-xs font-bold text-muted-foreground">{String.fromCharCode(65 + oi)}.</span>
                    <span className="text-foreground flex-1">{opt}</span>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </Card>
        )}

        <div className="flex justify-between mt-5 gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="rounded-full"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> {bn ? 'পূর্ববর্তী' : 'Previous'}
          </Button>

          {currentIdx === orderedQuestions.length - 1 ? (
            <Button onClick={() => setShowSubmitConfirm(true)} className="rounded-full">
              <Send className="w-4 h-4 mr-1" /> {bn ? 'জমা দিন' : 'Submit'}
            </Button>
          ) : (
            <Button onClick={() => setCurrentIdx((i) => Math.min(orderedQuestions.length - 1, i + 1))} className="rounded-full">
              {bn ? 'পরবর্তী' : 'Next'} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Question grid */}
        <Card className="p-4 rounded-[24px] mt-6">
          <h4 className="text-xs text-muted-foreground mb-3">{bn ? 'প্রশ্ন তালিকা' : 'Question Grid'}</h4>
          <div className="grid grid-cols-8 md:grid-cols-12 gap-1.5">
            {orderedQuestions.map((qq, i) => (
              <button
                key={qq.id}
                onClick={() => setCurrentIdx(i)}
                className={`aspect-square rounded-lg text-xs font-semibold transition-colors ${
                  i === currentIdx ? 'bg-primary text-primary-foreground'
                  : answers[qq.id] ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="rounded-[28px]">
          <DialogHeader>
            <DialogTitle>{bn ? 'পরীক্ষা জমা দিতে চান?' : 'Submit test?'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {bn ? `আপনি ${answeredCount}/${orderedQuestions.length} প্রশ্নের উত্তর দিয়েছেন। জমা দেওয়ার পর আর পরিবর্তন করা যাবে না।` :
              `You have answered ${answeredCount}/${orderedQuestions.length} questions. You cannot make changes after submission.`}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSubmitConfirm(false)} className="rounded-full">{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={handleSubmit} className="rounded-full"><Send className="w-4 h-4 mr-1" /> {bn ? 'জমা দিন' : 'Submit'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdmissionTestTake;
