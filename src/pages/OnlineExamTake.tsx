import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Clock, AlertTriangle, CheckCircle2, Send, ChevronLeft, ChevronRight,
  Loader2, ListChecks, ShieldAlert, FileText, Trophy,
} from 'lucide-react';
import { toast } from 'sonner';

type Q = {
  id: string;
  question_text: string;
  question_text_bn: string;
  question_type: 'mcq' | 'true_false' | 'short_answer';
  options: any[];
  marks: number;
  sort_order: number;
};

const STORAGE_KEY = (examId: string) => `online_exam_attempt_${examId}`;

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const OnlineExamTake = () => {
  const { id: examId } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const accessCode = params.get('code') || '';
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { user } = useAuth();

  const [stage, setStage] = useState<'intro' | 'taking' | 'submitting' | 'done'>('intro');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [orderedQuestions, setOrderedQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [resultSummary, setResultSummary] = useState<any>(null);
  const [guestName, setGuestName] = useState('');
  const [guestId, setGuestId] = useState('');

  const submittedRef = useRef(false);

  // Load exam
  const { data: exam, isLoading: examLoading } = useQuery({
    queryKey: ['online-exam-take', examId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('online_exams')
        .select('*, classes(name, name_bn), subjects(name, name_bn)')
        .eq('id', examId)
        .eq('status', 'published')
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!examId,
  });

  // Load questions only after attempt starts (anti-cheat)
  const { data: questions = [] } = useQuery<Q[]>({
    queryKey: ['online-exam-questions', examId, attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('online_exam_questions')
        .select('id, question_text, question_text_bn, question_type, options, marks, sort_order')
        .eq('exam_id', examId)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as Q[];
    },
    enabled: !!attemptId,
  });

  const settings = (exam?.settings || {}) as any;

  // Restore from localStorage
  useEffect(() => {
    if (!examId || stage !== 'intro') return;
    const raw = localStorage.getItem(STORAGE_KEY(examId));
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (saved.attemptId && saved.expiresAt && new Date(saved.expiresAt).getTime() > Date.now()) {
        // Auto-resume
        setAttemptId(saved.attemptId);
        setAnswers(saved.answers || {});
        setStage('taking');
      } else {
        localStorage.removeItem(STORAGE_KEY(examId));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY(examId));
    }
  }, [examId, stage]);

  // Apply randomization once questions arrive
  useEffect(() => {
    if (!questions.length) return;
    let qs = [...questions];
    if (settings.randomize_questions) qs = shuffle(qs);
    if (settings.randomize_options) {
      qs = qs.map((q) =>
        q.question_type === 'mcq'
          ? { ...q, options: shuffle(q.options || []) }
          : q
      );
    }
    setOrderedQuestions(qs);
  }, [questions, settings.randomize_questions, settings.randomize_options]);

  // Timer setup
  useEffect(() => {
    if (stage !== 'taking' || !attemptId || !exam) return;
    const raw = localStorage.getItem(STORAGE_KEY(examId!));
    let expiresAt: number;
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        expiresAt = new Date(saved.expiresAt).getTime();
      } catch {
        expiresAt = Date.now() + exam.duration_minutes * 60_000;
      }
    } else {
      expiresAt = Date.now() + exam.duration_minutes * 60_000;
    }

    const tick = () => {
      const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0 && !submittedRef.current) {
        handleSubmit(true);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, attemptId, exam]);

  // Persist progress
  useEffect(() => {
    if (stage !== 'taking' || !attemptId || !examId || !exam) return;
    const expiresAt = new Date(Date.now() + secondsLeft * 1000).toISOString();
    localStorage.setItem(
      STORAGE_KEY(examId),
      JSON.stringify({ attemptId, answers, expiresAt })
    );
  }, [answers, attemptId, examId, exam, secondsLeft, stage]);

  // Tab switch detection
  useEffect(() => {
    if (stage !== 'taking') return;
    const onVis = () => {
      if (document.hidden) {
        setTabSwitches((c) => {
          const next = c + 1;
          // Update server-side counter (best effort)
          if (attemptId) {
            supabase
              .from('online_exam_attempts')
              .update({ tab_switch_count: next })
              .eq('id', attemptId)
              .then(() => {});
          }
          const limit = settings.tab_switch_limit ?? 3;
          if (settings.auto_submit_on_limit && next >= limit && !submittedRef.current) {
            handleSubmit(true);
          } else {
            setShowWarning(true);
          }
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, attemptId, settings.tab_switch_limit, settings.auto_submit_on_limit]);

  const startExam = async () => {
    if (!exam || !examId) return;

    // Validate access for code mode
    if (exam.access_mode === 'access_code') {
      if (!accessCode || accessCode !== exam.access_code) {
        toast.error(bn ? 'অবৈধ অ্যাক্সেস কোড' : 'Invalid access code');
        return;
      }
    }

    // Identity (logged-in or guest)
    const isGuest = !user;
    if (isGuest && exam.access_mode === 'logged_in') {
      toast.error(bn ? 'অনুগ্রহ করে লগইন করুন' : 'Please login first');
      navigate('/login');
      return;
    }
    if (isGuest && (!guestName.trim() || !guestId.trim())) {
      toast.error(bn ? 'নাম ও আইডি দিন' : 'Enter your name and ID');
      return;
    }

    const expiresAt = new Date(Date.now() + exam.duration_minutes * 60_000).toISOString();

    const insertPayload: any = {
      exam_id: examId,
      started_at: new Date().toISOString(),
      expires_at: expiresAt,
      status: 'in_progress',
      attempted_by_name: isGuest ? guestName.trim() : (user?.email || 'User'),
      attempted_by_identifier: isGuest ? guestId.trim() : user?.id,
      user_agent: navigator.userAgent.slice(0, 255),
    };

    const { data, error } = await supabase
      .from('online_exam_attempts')
      .insert(insertPayload)
      .select('id')
      .single();

    if (error || !data) {
      toast.error(error?.message || 'Failed to start exam');
      return;
    }

    setAttemptId(data.id);
    localStorage.setItem(
      STORAGE_KEY(examId),
      JSON.stringify({ attemptId: data.id, answers: {}, expiresAt })
    );
    setStage('taking');
  };

  const handleSubmit = useCallback(
    async (autoSubmitted = false) => {
      if (submittedRef.current || !attemptId) return;
      submittedRef.current = true;
      setStage('submitting');

      const payload = {
        attempt_id: attemptId,
        auto_submitted: autoSubmitted,
        answers: Object.entries(answers).map(([qid, ans]) => ({
          question_id: qid,
          answer: ans,
        })),
      };

      try {
        const { data, error } = await supabase.functions.invoke('submit-online-exam', {
          body: payload,
        });
        if (error) throw error;
        setResultSummary(data);
        if (examId) localStorage.removeItem(STORAGE_KEY(examId));
        setStage('done');
      } catch (e: any) {
        submittedRef.current = false;
        toast.error(e?.message || 'Submission failed');
        setStage('taking');
      }
    },
    [attemptId, answers, examId]
  );

  // ---- UI ----

  if (examLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="rounded-3xl p-10 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
          <h2 className="text-xl font-bold">{bn ? 'পরীক্ষা পাওয়া যায়নি' : 'Exam not found'}</h2>
          <Button className="mt-4 rounded-2xl" onClick={() => navigate('/exams')}>
            {bn ? 'ফিরে যান' : 'Back'}
          </Button>
        </Card>
      </div>
    );
  }

  // --- Done ---
  if (stage === 'done') {
    const showResult = exam.result_mode === 'immediate';
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6 flex items-center justify-center">
        <Card className="rounded-[32px] p-10 max-w-md text-center border-0 bg-card/80 backdrop-blur-xl">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <Trophy className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {bn ? 'পরীক্ষা সম্পন্ন!' : 'Exam Submitted!'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {showResult
              ? (bn ? 'আপনার তাৎক্ষণিক ফলাফল প্রস্তুত' : 'Your instant result is ready')
              : (bn ? 'ফলাফল শিক্ষক রিভিউ এর পর প্রকাশিত হবে' : 'Results will be published after teacher review')}
          </p>

          {showResult && resultSummary && (
            <div className="rounded-2xl bg-primary/5 p-5 mb-6">
              <p className="text-sm text-muted-foreground">{bn ? 'প্রাপ্ত নম্বর' : 'Auto-graded score'}</p>
              <p className="text-4xl font-bold text-primary mt-1">
                {resultSummary.auto_graded_score} / {exam.total_marks}
              </p>
              {resultSummary.has_manual_review && (
                <p className="text-xs text-amber-600 mt-3">
                  {bn ? 'কিছু প্রশ্ন ম্যানুয়াল রিভিউয়ের অপেক্ষায়' : 'Some answers await manual review'}
                </p>
              )}
            </div>
          )}

          <Button onClick={() => navigate('/exams')} className="rounded-2xl w-full">
            {bn ? 'অন্য পরীক্ষা দেখুন' : 'View other exams'}
          </Button>
        </Card>
      </div>
    );
  }

  // --- Intro ---
  if (stage === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
        <div className="max-w-3xl mx-auto py-8">
          <Card className="rounded-[32px] p-8 border-0 bg-card/80 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ListChecks className="w-6 h-6 text-primary" />
              </div>
              <Badge variant="secondary" className="rounded-full">
                {bn ? 'অনলাইন পরীক্ষা' : 'Online Exam'}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold mt-2">
              {bn ? exam.title_bn : (exam.title || exam.title_bn)}
            </h1>
            {(bn ? exam.description_bn : exam.description) && (
              <p className="text-muted-foreground mt-2">
                {bn ? exam.description_bn : exam.description}
              </p>
            )}

            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="rounded-2xl bg-muted/40 p-4 text-center">
                <Clock className="w-5 h-5 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">{bn ? 'সময়' : 'Duration'}</p>
                <p className="font-bold">{exam.duration_minutes} {bn ? 'মিনিট' : 'min'}</p>
              </div>
              <div className="rounded-2xl bg-muted/40 p-4 text-center">
                <FileText className="w-5 h-5 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">{bn ? 'নম্বর' : 'Total Marks'}</p>
                <p className="font-bold">{exam.total_marks}</p>
              </div>
              <div className="rounded-2xl bg-muted/40 p-4 text-center">
                <CheckCircle2 className="w-5 h-5 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">{bn ? 'পাশ' : 'Pass Marks'}</p>
                <p className="font-bold">{exam.passing_marks}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <ShieldAlert className="w-4 h-4" />
                {bn ? 'গুরুত্বপূর্ণ নির্দেশনা' : 'Important Instructions'}
              </p>
              <ul className="text-sm mt-2 space-y-1 list-disc pl-5 text-muted-foreground">
                <li>{bn ? 'পরীক্ষা শুরু হলে টাইমার চলবে এবং নির্দিষ্ট সময়ে অটো-সাবমিট হবে।' : 'Timer starts immediately; the exam auto-submits at expiry.'}</li>
                {settings.tab_switch_limit > 0 && (
                  <li>
                    {bn
                      ? `অন্য ট্যাবে গেলে গণনা হবে। সর্বোচ্চ ${settings.tab_switch_limit} বার${settings.auto_submit_on_limit ? ' এর পর অটো-সাবমিট' : ''}।`
                      : `Tab switches are tracked. Max ${settings.tab_switch_limit}${settings.auto_submit_on_limit ? ' before auto-submit' : ''}.`}
                  </li>
                )}
                <li>{bn ? 'এক ছাত্র একবারই পরীক্ষা দিতে পারবে।' : 'Only one attempt per student is allowed.'}</li>
                {(exam.instructions || exam.instructions_bn) && (
                  <li>{bn ? exam.instructions_bn : exam.instructions}</li>
                )}
              </ul>
            </div>

            {/* Guest entry */}
            {!user && exam.access_mode !== 'logged_in' && (
              <div className="mt-6 grid md:grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'আপনার নাম' : 'Your Name'} *</Label>
                  <Input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder={bn ? 'পূর্ণ নাম' : 'Full name'}
                    className="rounded-2xl mt-1"
                  />
                </div>
                <div>
                  <Label>{bn ? 'আইডি / রোল' : 'ID / Roll'} *</Label>
                  <Input
                    value={guestId}
                    onChange={(e) => setGuestId(e.target.value)}
                    placeholder={bn ? 'ছাত্র আইডি বা রোল' : 'Student ID or roll'}
                    className="rounded-2xl mt-1"
                  />
                </div>
              </div>
            )}

            <Button onClick={startExam} className="w-full rounded-2xl mt-6 h-12 text-base">
              {bn ? 'পরীক্ষা শুরু করুন' : 'Start Exam'}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // --- Submitting ---
  if (stage === 'submitting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="rounded-3xl p-10 text-center">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-3" />
          <p className="font-semibold">{bn ? 'জমা দেওয়া হচ্ছে...' : 'Submitting your answers...'}</p>
        </Card>
      </div>
    );
  }

  // --- Taking ---
  const currentQ = orderedQuestions[currentIdx];
  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== '').length;
  const progress = orderedQuestions.length ? (answeredCount / orderedQuestions.length) * 100 : 0;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeWarning = secondsLeft < 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <h2 className="font-bold truncate">{bn ? exam.title_bn : (exam.title || exam.title_bn)}</h2>
            <Progress value={progress} className="h-1.5 mt-1" />
          </div>
          <div className={`rounded-2xl px-4 py-2 font-mono font-bold text-lg flex items-center gap-2 ${timeWarning ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-primary/10 text-primary'}`}>
            <Clock className="w-4 h-4" />
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
          <Button
            onClick={() => setShowSubmitConfirm(true)}
            className="rounded-2xl"
            variant="default"
          >
            <Send className="w-4 h-4 mr-1" />
            {bn ? 'জমা দিন' : 'Submit'}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 grid md:grid-cols-[1fr_240px] gap-4 mt-4">
        {/* Question */}
        {currentQ && (
          <Card className="rounded-[28px] p-6 border-0 bg-card/70 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <Badge variant="secondary" className="rounded-full">
                {bn ? `প্রশ্ন ${currentIdx + 1} / ${orderedQuestions.length}` : `Question ${currentIdx + 1} / ${orderedQuestions.length}`}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {currentQ.marks} {bn ? 'নম্বর' : 'marks'}
              </Badge>
            </div>

            <h3 className="text-lg font-semibold mb-5 leading-relaxed whitespace-pre-wrap">
              {bn ? currentQ.question_text_bn : (currentQ.question_text || currentQ.question_text_bn)}
            </h3>

            {currentQ.question_type === 'mcq' && (
              <RadioGroup
                value={answers[currentQ.id] ?? ''}
                onValueChange={(v) => setAnswers((p) => ({ ...p, [currentQ.id]: v }))}
                className="space-y-2"
              >
                {(currentQ.options || []).map((opt: any) => (
                  <label
                    key={opt.key}
                    className="flex items-start gap-3 rounded-2xl border border-border/40 p-3 cursor-pointer hover:bg-muted/40 transition has-[:checked]:bg-primary/5 has-[:checked]:border-primary/50"
                  >
                    <RadioGroupItem value={opt.key} className="mt-0.5" />
                    <div className="flex-1">
                      <span className="font-mono font-semibold mr-2">{opt.key}.</span>
                      {bn ? (opt.text_bn || opt.text) : (opt.text || opt.text_bn)}
                    </div>
                  </label>
                ))}
              </RadioGroup>
            )}

            {currentQ.question_type === 'true_false' && (
              <RadioGroup
                value={answers[currentQ.id] ?? ''}
                onValueChange={(v) => setAnswers((p) => ({ ...p, [currentQ.id]: v }))}
                className="grid grid-cols-2 gap-3"
              >
                {[
                  { v: 'true', label: bn ? 'সত্য' : 'True' },
                  { v: 'false', label: bn ? 'মিথ্যা' : 'False' },
                ].map((o) => (
                  <label
                    key={o.v}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-border/40 p-4 cursor-pointer hover:bg-muted/40 has-[:checked]:bg-primary/5 has-[:checked]:border-primary/50"
                  >
                    <RadioGroupItem value={o.v} />
                    <span className="font-semibold">{o.label}</span>
                  </label>
                ))}
              </RadioGroup>
            )}

            {currentQ.question_type === 'short_answer' && (
              <Textarea
                value={answers[currentQ.id] ?? ''}
                onChange={(e) => setAnswers((p) => ({ ...p, [currentQ.id]: e.target.value }))}
                placeholder={bn ? 'আপনার উত্তর লিখুন...' : 'Write your answer...'}
                rows={5}
                className="rounded-2xl"
              />
            )}

            {/* Nav */}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                className="rounded-2xl"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => i - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                {bn ? 'পূর্ববর্তী' : 'Previous'}
              </Button>
              {currentIdx < orderedQuestions.length - 1 ? (
                <Button className="rounded-2xl" onClick={() => setCurrentIdx((i) => i + 1)}>
                  {bn ? 'পরবর্তী' : 'Next'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button className="rounded-2xl" onClick={() => setShowSubmitConfirm(true)}>
                  <Send className="w-4 h-4 mr-1" />
                  {bn ? 'জমা দিন' : 'Submit'}
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Question grid */}
        <Card className="rounded-[28px] p-4 border-0 bg-card/70 backdrop-blur-xl h-fit sticky top-24">
          <p className="text-sm font-semibold mb-3">{bn ? 'প্রশ্ন তালিকা' : 'Question Map'}</p>
          <div className="grid grid-cols-5 md:grid-cols-4 gap-2">
            {orderedQuestions.map((q, i) => {
              const answered = answers[q.id] !== undefined && answers[q.id] !== '';
              const active = i === currentIdx;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(i)}
                  className={`aspect-square rounded-xl text-sm font-semibold transition ${
                    active
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                      : answered
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 text-xs text-muted-foreground space-y-1">
            <p>{bn ? 'উত্তর দেওয়া' : 'Answered'}: <b className="text-emerald-600">{answeredCount}</b></p>
            <p>{bn ? 'বাকি' : 'Remaining'}: <b>{orderedQuestions.length - answeredCount}</b></p>
            {tabSwitches > 0 && (
              <p className="text-amber-600">
                {bn ? 'ট্যাব সুইচ' : 'Tab switches'}: <b>{tabSwitches}</b>
                {settings.tab_switch_limit ? ` / ${settings.tab_switch_limit}` : ''}
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Submit confirm */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="rounded-[28px]">
          <DialogHeader>
            <DialogTitle>{bn ? 'পরীক্ষা জমা দিতে চান?' : 'Submit your exam?'}</DialogTitle>
            <DialogDescription>
              {bn
                ? `আপনি ${answeredCount} টি প্রশ্নের উত্তর দিয়েছেন (মোট ${orderedQuestions.length})। জমা দেওয়ার পর পরিবর্তন করা যাবে না।`
                : `You answered ${answeredCount} of ${orderedQuestions.length} questions. You cannot change answers after submission.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setShowSubmitConfirm(false)}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              className="rounded-2xl"
              onClick={() => {
                setShowSubmitConfirm(false);
                handleSubmit(false);
              }}
            >
              <Send className="w-4 h-4 mr-1" />
              {bn ? 'নিশ্চিত করুন' : 'Confirm submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tab-switch warning */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="rounded-[28px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="w-5 h-5" />
              {bn ? 'সতর্কতা: ট্যাব সুইচ ডিটেক্টেড' : 'Warning: Tab switch detected'}
            </DialogTitle>
            <DialogDescription>
              {bn
                ? `আপনি অন্য ট্যাবে চলে গিয়েছিলেন। গণনা: ${tabSwitches}${settings.tab_switch_limit ? ` / ${settings.tab_switch_limit}` : ''}। ${settings.auto_submit_on_limit ? 'সীমা অতিক্রম করলে অটো-সাবমিট হবে।' : ''}`
                : `You navigated away. Count: ${tabSwitches}${settings.tab_switch_limit ? ` / ${settings.tab_switch_limit}` : ''}. ${settings.auto_submit_on_limit ? 'Exam will auto-submit if limit is exceeded.' : ''}`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="rounded-2xl" onClick={() => setShowWarning(false)}>
              {bn ? 'বুঝেছি' : 'Got it'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OnlineExamTake;
