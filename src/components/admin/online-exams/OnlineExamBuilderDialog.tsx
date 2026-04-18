import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
  Save, Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Settings, Shield,
  FileText, Eye, X, CheckCircle2, Loader2,
} from 'lucide-react';

type QuestionType = 'mcq' | 'true_false' | 'short_answer';

interface QuestionDraft {
  id?: string;
  _localId: string;
  question_text: string;
  question_text_bn: string;
  question_type: QuestionType;
  options: { key: string; text: string; text_bn: string }[];
  correct_answer: any;
  marks: number;
  negative_marks: number;
  explanation: string;
  explanation_bn: string;
  sort_order: number;
}

const newOption = (i: number) => ({
  key: String.fromCharCode(65 + i),
  text: '',
  text_bn: '',
});

const blankQuestion = (sort: number): QuestionDraft => ({
  _localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  question_text: '',
  question_text_bn: '',
  question_type: 'mcq',
  options: [newOption(0), newOption(1), newOption(2), newOption(3)],
  correct_answer: null,
  marks: 1,
  negative_marks: 0,
  explanation: '',
  explanation_bn: '',
  sort_order: sort,
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string | null;
  createdBy?: string;
}

const OnlineExamBuilderDialog = ({ open, onOpenChange, examId, createdBy }: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('basic');

  const [exam, setExam] = useState({
    title: '', title_bn: '',
    description: '', description_bn: '',
    instructions: '', instructions_bn: '',
    exam_session_id: '', academic_session_id: '', class_id: '', subject_id: '',
    duration_minutes: 30,
    total_marks: 0,
    passing_marks: 0,
    start_at: '', end_at: '',
    access_mode: 'flexible',
    access_code: '',
    result_mode: 'after_review',
    settings: {
      randomize_questions: true,
      randomize_options: true,
      tab_switch_limit: 3,
      auto_submit_on_limit: true,
      fullscreen_required: false,
      show_correct_answers: false,
      allow_review: true,
    },
    status: 'draft',
  });

  const [questions, setQuestions] = useState<QuestionDraft[]>([]);

  // Lookups
  const { data: sessions = [] } = useQuery({
    queryKey: ['ac-sessions-active'],
    queryFn: async () => (await supabase.from('academic_sessions').select('*').eq('is_active', true)).data || [],
  });
  const { data: examSessions = [] } = useQuery({
    queryKey: ['exam-sessions-active'],
    queryFn: async () => (await supabase.from('exam_sessions').select('*').eq('is_active', true)).data || [],
  });
  const { data: classes = [] } = useQuery({
    queryKey: ['classes-all'],
    queryFn: async () => (await supabase.from('classes').select('*').eq('is_active', true).order('sort_order')).data || [],
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: async () => (await supabase.from('subjects').select('*').eq('is_active', true)).data || [],
  });

  // Load existing exam
  useEffect(() => {
    if (!open) return;
    if (!examId) {
      setExam(prev => ({ ...prev, title: '', title_bn: '' }));
      setQuestions([]);
      setTab('basic');
      return;
    }
    (async () => {
      const { data: e } = await supabase.from('online_exams').select('*').eq('id', examId).maybeSingle();
      if (e) {
        setExam({
          title: e.title || '', title_bn: e.title_bn || '',
          description: e.description || '', description_bn: e.description_bn || '',
          instructions: e.instructions || '', instructions_bn: e.instructions_bn || '',
          exam_session_id: e.exam_session_id || '',
          academic_session_id: e.academic_session_id || '',
          class_id: e.class_id || '',
          subject_id: e.subject_id || '',
          duration_minutes: e.duration_minutes || 30,
          total_marks: Number(e.total_marks) || 0,
          passing_marks: Number(e.passing_marks) || 0,
          start_at: e.start_at ? new Date(e.start_at).toISOString().slice(0, 16) : '',
          end_at: e.end_at ? new Date(e.end_at).toISOString().slice(0, 16) : '',
          access_mode: e.access_mode || 'flexible',
          access_code: e.access_code || '',
          result_mode: e.result_mode || 'after_review',
          settings: { ...exam.settings, ...(e.settings as any || {}) },
          status: e.status || 'draft',
        });
      }
      const { data: qs } = await supabase
        .from('online_exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('sort_order');
      setQuestions((qs || []).map((q: any, idx: number) => ({
        id: q.id,
        _localId: q.id,
        question_text: q.question_text || '',
        question_text_bn: q.question_text_bn || '',
        question_type: q.question_type,
        options: Array.isArray(q.options) && q.options.length ? q.options : [newOption(0), newOption(1), newOption(2), newOption(3)],
        correct_answer: q.correct_answer,
        marks: Number(q.marks) || 1,
        negative_marks: Number(q.negative_marks) || 0,
        explanation: q.explanation || '',
        explanation_bn: q.explanation_bn || '',
        sort_order: q.sort_order ?? idx,
      })));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, open]);

  // Auto-update total_marks
  useEffect(() => {
    const total = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
    setExam(prev => ({ ...prev, total_marks: total }));
  }, [questions]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!exam.title_bn?.trim()) throw new Error(bn ? 'বাংলা শিরোনাম দিন' : 'Bangla title required');
      if (questions.length === 0) {
        // Saving without questions is fine, but warn
      }

      const payload: any = {
        title: exam.title || exam.title_bn,
        title_bn: exam.title_bn,
        description: exam.description || null,
        description_bn: exam.description_bn || null,
        instructions: exam.instructions || null,
        instructions_bn: exam.instructions_bn || null,
        exam_session_id: exam.exam_session_id || null,
        academic_session_id: exam.academic_session_id || null,
        class_id: exam.class_id || null,
        subject_id: exam.subject_id || null,
        duration_minutes: Number(exam.duration_minutes) || 30,
        total_marks: Number(exam.total_marks) || 0,
        passing_marks: Number(exam.passing_marks) || 0,
        start_at: exam.start_at ? new Date(exam.start_at).toISOString() : null,
        end_at: exam.end_at ? new Date(exam.end_at).toISOString() : null,
        access_mode: exam.access_mode,
        access_code: exam.access_mode === 'access_code' ? (exam.access_code || null) : null,
        result_mode: exam.result_mode,
        settings: exam.settings,
        status: exam.status,
      };

      let savedExamId = examId;
      if (examId) {
        const { error } = await supabase.from('online_exams').update(payload).eq('id', examId);
        if (error) throw error;
      } else {
        payload.created_by = createdBy || null;
        const { data, error } = await supabase.from('online_exams').insert(payload).select('id').single();
        if (error) throw error;
        savedExamId = data.id;
      }

      // Sync questions
      const existing = questions.filter(q => q.id);
      const newOnes = questions.filter(q => !q.id);

      // Update existing
      for (const q of existing) {
        const { error } = await supabase.from('online_exam_questions').update({
          question_text: q.question_text || q.question_text_bn,
          question_text_bn: q.question_text_bn,
          question_type: q.question_type,
          options: q.options,
          correct_answer: q.correct_answer,
          marks: Number(q.marks) || 1,
          negative_marks: Number(q.negative_marks) || 0,
          explanation: q.explanation || null,
          explanation_bn: q.explanation_bn || null,
          sort_order: q.sort_order,
        }).eq('id', q.id!);
        if (error) throw error;
      }

      // Insert new
      if (newOnes.length > 0) {
        const insertPayload = newOnes.map(q => ({
          exam_id: savedExamId,
          question_text: q.question_text || q.question_text_bn,
          question_text_bn: q.question_text_bn,
          question_type: q.question_type,
          options: q.options,
          correct_answer: q.correct_answer,
          marks: Number(q.marks) || 1,
          negative_marks: Number(q.negative_marks) || 0,
          explanation: q.explanation || null,
          explanation_bn: q.explanation_bn || null,
          sort_order: q.sort_order,
        }));
        const { error } = await supabase.from('online_exam_questions').insert(insertPayload);
        if (error) throw error;
      }

      // Delete questions removed in UI
      if (examId) {
        const keptIds = existing.map(q => q.id!);
        const { data: dbQs } = await supabase.from('online_exam_questions').select('id').eq('exam_id', examId);
        const toDelete = (dbQs || []).map((r: any) => r.id).filter((id: string) => !keptIds.includes(id));
        if (toDelete.length > 0) {
          await supabase.from('online_exam_questions').delete().in('id', toDelete);
        }
      }

      return savedExamId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-exams'] });
      queryClient.invalidateQueries({ queryKey: ['online-exam-question-counts'] });
      toast.success(bn ? 'পরীক্ষা সংরক্ষিত হয়েছে' : 'Exam saved');
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addQuestion = () => {
    setQuestions(prev => [...prev, blankQuestion(prev.length)]);
  };

  const removeQuestion = (localId: string) => {
    setQuestions(prev => prev.filter(q => q._localId !== localId).map((q, i) => ({ ...q, sort_order: i })));
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    setQuestions(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((q, i) => ({ ...q, sort_order: i }));
    });
  };

  const updateQuestion = (localId: string, patch: Partial<QuestionDraft>) => {
    setQuestions(prev => prev.map(q => q._localId === localId ? { ...q, ...patch } : q));
  };

  const updateOption = (qLocalId: string, optIdx: number, field: 'text' | 'text_bn', value: string) => {
    setQuestions(prev => prev.map(q => {
      if (q._localId !== qLocalId) return q;
      const next = [...q.options];
      next[optIdx] = { ...next[optIdx], [field]: value };
      return { ...q, options: next };
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col rounded-[38px] p-0">
        <DialogHeader className="p-6 pb-3 border-b border-border/40">
          <DialogTitle className="text-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            {examId ? (bn ? 'পরীক্ষা সম্পাদনা' : 'Edit Exam') : (bn ? 'নতুন অনলাইন পরীক্ষা' : 'New Online Exam')}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 pt-3">
            <TabsList className="rounded-2xl">
              <TabsTrigger value="basic" className="rounded-xl"><FileText className="w-4 h-4 mr-1.5" />{bn ? 'মূল তথ্য' : 'Basic'}</TabsTrigger>
              <TabsTrigger value="questions" className="rounded-xl"><Plus className="w-4 h-4 mr-1.5" />{bn ? 'প্রশ্ন' : 'Questions'} ({questions.length})</TabsTrigger>
              <TabsTrigger value="security" className="rounded-xl"><Shield className="w-4 h-4 mr-1.5" />{bn ? 'নিরাপত্তা' : 'Security'}</TabsTrigger>
              <TabsTrigger value="preview" className="rounded-xl"><Eye className="w-4 h-4 mr-1.5" />{bn ? 'প্রিভিউ' : 'Preview'}</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* BASIC */}
            <TabsContent value="basic" className="m-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{bn ? 'শিরোনাম (বাংলা)' : 'Title (Bangla)'} *</Label>
                  <Input value={exam.title_bn} onChange={(e) => setExam({ ...exam, title_bn: e.target.value })} className="rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Label>{bn ? 'শিরোনাম (ইংরেজি)' : 'Title (English)'}</Label>
                  <Input value={exam.title} onChange={(e) => setExam({ ...exam, title: e.target.value })} className="rounded-2xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{bn ? 'বিবরণ (বাংলা)' : 'Description (Bangla)'}</Label>
                  <Textarea value={exam.description_bn} onChange={(e) => setExam({ ...exam, description_bn: e.target.value })} className="rounded-2xl" rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>{bn ? 'নির্দেশনা (বাংলা)' : 'Instructions (Bangla)'}</Label>
                  <Textarea value={exam.instructions_bn} onChange={(e) => setExam({ ...exam, instructions_bn: e.target.value })} className="rounded-2xl" rows={2} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>{bn ? 'একাডেমিক সেশন' : 'Academic Session'}</Label>
                  <Select value={exam.academic_session_id} onValueChange={(v) => setExam({ ...exam, academic_session_id: v })}>
                    <SelectTrigger className="rounded-2xl"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {sessions.map((s: any) => <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn : s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{bn ? 'পরীক্ষা সেশন' : 'Exam Session'}</Label>
                  <Select value={exam.exam_session_id} onValueChange={(v) => setExam({ ...exam, exam_session_id: v })}>
                    <SelectTrigger className="rounded-2xl"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {examSessions.map((s: any) => <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn : s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{bn ? 'শ্রেণী' : 'Class'}</Label>
                  <Select value={exam.class_id} onValueChange={(v) => setExam({ ...exam, class_id: v })}>
                    <SelectTrigger className="rounded-2xl"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{bn ? 'বিষয়' : 'Subject'}</Label>
                  <Select value={exam.subject_id} onValueChange={(v) => setExam({ ...exam, subject_id: v })}>
                    <SelectTrigger className="rounded-2xl"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn : s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>{bn ? 'সময়সীমা (মিনিট)' : 'Duration (minutes)'} *</Label>
                  <Input type="number" min={1} value={exam.duration_minutes} onChange={(e) => setExam({ ...exam, duration_minutes: Number(e.target.value) })} className="rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Label>{bn ? 'মোট নম্বর' : 'Total Marks'}</Label>
                  <Input type="number" value={exam.total_marks} readOnly className="rounded-2xl bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label>{bn ? 'পাস নম্বর' : 'Pass Marks'}</Label>
                  <Input type="number" value={exam.passing_marks} onChange={(e) => setExam({ ...exam, passing_marks: Number(e.target.value) })} className="rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Label>{bn ? 'ফলাফল প্রকাশ' : 'Result Mode'}</Label>
                  <Select value={exam.result_mode} onValueChange={(v) => setExam({ ...exam, result_mode: v })}>
                    <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">{bn ? 'তাৎক্ষণিক' : 'Immediate'}</SelectItem>
                      <SelectItem value="after_review">{bn ? 'রিভিউয়ের পর' : 'After Review'}</SelectItem>
                      <SelectItem value="scheduled">{bn ? 'নির্দিষ্ট তারিখে' : 'Scheduled'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{bn ? 'শুরুর তারিখ ও সময়' : 'Start at'}</Label>
                  <Input type="datetime-local" value={exam.start_at} onChange={(e) => setExam({ ...exam, start_at: e.target.value })} className="rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Label>{bn ? 'শেষ তারিখ ও সময়' : 'End at'}</Label>
                  <Input type="datetime-local" value={exam.end_at} onChange={(e) => setExam({ ...exam, end_at: e.target.value })} className="rounded-2xl" />
                </div>
              </div>
            </TabsContent>

            {/* QUESTIONS */}
            <TabsContent value="questions" className="m-0 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{bn ? 'প্রশ্ন তালিকা' : 'Questions'}</p>
                  <p className="text-xs text-muted-foreground">{bn ? `মোট ${questions.length} প্রশ্ন · মোট নম্বর ${exam.total_marks}` : `${questions.length} questions · ${exam.total_marks} marks`}</p>
                </div>
                <Button onClick={addQuestion} className="rounded-2xl"><Plus className="w-4 h-4 mr-1" />{bn ? 'প্রশ্ন যোগ' : 'Add Question'}</Button>
              </div>

              {questions.length === 0 ? (
                <Card className="rounded-3xl p-8 text-center text-muted-foreground border-dashed">
                  {bn ? 'কোনো প্রশ্ন নেই। উপরে "প্রশ্ন যোগ" বোতাম চাপুন।' : 'No questions. Click "Add Question" above.'}
                </Card>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <Card key={q._localId} className="rounded-3xl p-4 border-border/40">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-1 pt-1">
                          <Badge variant="outline" className="rounded-lg">{idx + 1}</Badge>
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => moveQuestion(idx, -1)} disabled={idx === 0}>
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => moveQuestion(idx, 1)} disabled={idx === questions.length - 1}>
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap gap-3 items-center">
                            <Select value={q.question_type} onValueChange={(v: QuestionType) => {
                              let correct = null;
                              let opts = q.options;
                              if (v === 'true_false') {
                                opts = [
                                  { key: 'A', text: 'True', text_bn: 'সত্য' },
                                  { key: 'B', text: 'False', text_bn: 'মিথ্যা' },
                                ];
                                correct = null;
                              } else if (v === 'mcq' && q.question_type !== 'mcq') {
                                opts = [newOption(0), newOption(1), newOption(2), newOption(3)];
                              } else if (v === 'short_answer') {
                                opts = [];
                              }
                              updateQuestion(q._localId, { question_type: v, options: opts, correct_answer: correct });
                            }}>
                              <SelectTrigger className="rounded-xl w-40"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mcq">MCQ</SelectItem>
                                <SelectItem value="true_false">{bn ? 'সত্য/মিথ্যা' : 'True/False'}</SelectItem>
                                <SelectItem value="short_answer">{bn ? 'সংক্ষিপ্ত উত্তর' : 'Short Answer'}</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">{bn ? 'নম্বর' : 'Marks'}</Label>
                              <Input type="number" min={0} step="0.5" value={q.marks} onChange={(e) => updateQuestion(q._localId, { marks: Number(e.target.value) })} className="rounded-xl w-20" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">{bn ? 'নেগেটিভ' : 'Negative'}</Label>
                              <Input type="number" min={0} step="0.25" value={q.negative_marks} onChange={(e) => updateQuestion(q._localId, { negative_marks: Number(e.target.value) })} className="rounded-xl w-20" />
                            </div>
                            <Button size="icon" variant="ghost" className="ml-auto rounded-xl text-destructive" onClick={() => removeQuestion(q._localId)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <Textarea placeholder={bn ? 'প্রশ্ন (বাংলা)' : 'Question (Bangla)'} value={q.question_text_bn} onChange={(e) => updateQuestion(q._localId, { question_text_bn: e.target.value })} className="rounded-2xl" rows={2} />
                            <Textarea placeholder={bn ? 'প্রশ্ন (ইংরেজি)' : 'Question (English)'} value={q.question_text} onChange={(e) => updateQuestion(q._localId, { question_text: e.target.value })} className="rounded-2xl" rows={2} />
                          </div>

                          {/* Options */}
                          {(q.question_type === 'mcq' || q.question_type === 'true_false') && (
                            <div className="space-y-2">
                              {q.options.map((opt, oi) => {
                                const checked = q.correct_answer === opt.key || (Array.isArray(q.correct_answer) && q.correct_answer.includes(opt.key));
                                return (
                                  <div key={opt.key} className={`flex items-center gap-2 p-2 rounded-xl border ${checked ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border/40'}`}>
                                    <button
                                      onClick={() => updateQuestion(q._localId, { correct_answer: opt.key })}
                                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${checked ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                                    >
                                      {opt.key}
                                    </button>
                                    <Input
                                      value={opt.text_bn}
                                      onChange={(e) => updateOption(q._localId, oi, 'text_bn', e.target.value)}
                                      placeholder={bn ? 'বাংলা অপশন' : 'Bangla option'}
                                      className="rounded-xl flex-1"
                                      disabled={q.question_type === 'true_false'}
                                    />
                                    <Input
                                      value={opt.text}
                                      onChange={(e) => updateOption(q._localId, oi, 'text', e.target.value)}
                                      placeholder={bn ? 'ইংরেজি অপশন' : 'English option'}
                                      className="rounded-xl flex-1"
                                      disabled={q.question_type === 'true_false'}
                                    />
                                  </div>
                                );
                              })}
                              {q.question_type === 'mcq' && (
                                <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => updateQuestion(q._localId, { options: [...q.options, newOption(q.options.length)] })}>
                                  <Plus className="w-3 h-3 mr-1" />{bn ? 'অপশন' : 'Add option'}
                                </Button>
                              )}
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {bn ? 'সঠিক উত্তরে ক্লিক করুন' : 'Click correct answer letter to mark'}
                              </p>
                            </div>
                          )}

                          {q.question_type === 'short_answer' && (
                            <div className="space-y-2">
                              <Label className="text-xs">{bn ? 'মডেল উত্তর (ম্যানুয়াল গ্রেডিং)' : 'Model answer (manual grading)'}</Label>
                              <Textarea
                                value={typeof q.correct_answer === 'string' ? q.correct_answer : ''}
                                onChange={(e) => updateQuestion(q._localId, { correct_answer: e.target.value })}
                                placeholder={bn ? 'রেফারেন্সের জন্য মডেল উত্তর...' : 'Reference answer for grading...'}
                                className="rounded-2xl"
                                rows={2}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* SECURITY */}
            <TabsContent value="security" className="m-0 space-y-4">
              <Card className="rounded-3xl p-5 space-y-4">
                <h3 className="font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />{bn ? 'অ্যান্টি-চিটিং' : 'Anti-Cheating'}</h3>
                {[
                  { key: 'randomize_questions', label_bn: 'প্রশ্ন র‌্যান্ডমাইজেশন', label_en: 'Randomize questions' },
                  { key: 'randomize_options', label_bn: 'অপশন র‌্যান্ডমাইজেশন', label_en: 'Randomize options (MCQ)' },
                  { key: 'auto_submit_on_limit', label_bn: 'লিমিট পেরোলে অটো-সাবমিট', label_en: 'Auto-submit on tab switch limit' },
                  { key: 'fullscreen_required', label_bn: 'ফুলস্ক্রিন বাধ্যতামূলক', label_en: 'Require fullscreen' },
                  { key: 'show_correct_answers', label_bn: 'ফলাফলে সঠিক উত্তর দেখাও', label_en: 'Show correct answers in results' },
                  { key: 'allow_review', label_bn: 'রিভিউ অ্যাক্সেস', label_en: 'Allow result review' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-1">
                    <Label className="cursor-pointer">{bn ? item.label_bn : item.label_en}</Label>
                    <Switch
                      checked={(exam.settings as any)[item.key]}
                      onCheckedChange={(c) => setExam({ ...exam, settings: { ...exam.settings, [item.key]: c } })}
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/30">
                  <Label>{bn ? 'ট্যাব সুইচ লিমিট' : 'Tab switch limit'}</Label>
                  <Input type="number" min={0} max={20} value={exam.settings.tab_switch_limit}
                    onChange={(e) => setExam({ ...exam, settings: { ...exam.settings, tab_switch_limit: Number(e.target.value) } })}
                    className="rounded-xl w-24"
                  />
                </div>
              </Card>

              <Card className="rounded-3xl p-5 space-y-4">
                <h3 className="font-semibold">{bn ? 'অ্যাক্সেস নিয়ন্ত্রণ' : 'Access Control'}</h3>
                <div className="space-y-2">
                  <Label>{bn ? 'অ্যাক্সেস মোড' : 'Access Mode'}</Label>
                  <Select value={exam.access_mode} onValueChange={(v) => setExam({ ...exam, access_mode: v })}>
                    <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="logged_in">{bn ? 'শুধু লগইনকৃত ছাত্র' : 'Logged-in students only'}</SelectItem>
                      <SelectItem value="class_based">{bn ? 'নির্দিষ্ট ক্লাস' : 'Class-based only'}</SelectItem>
                      <SelectItem value="access_code">{bn ? 'অ্যাক্সেস কোড দিয়ে' : 'With access code'}</SelectItem>
                      <SelectItem value="flexible">{bn ? 'সব কয়টি (নমনীয়)' : 'All (Flexible)'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {exam.access_mode === 'access_code' && (
                  <div className="space-y-2">
                    <Label>{bn ? 'অ্যাক্সেস কোড' : 'Access Code'}</Label>
                    <Input value={exam.access_code} onChange={(e) => setExam({ ...exam, access_code: e.target.value })} className="rounded-2xl" placeholder="ABCD-1234" />
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* PREVIEW */}
            <TabsContent value="preview" className="m-0 space-y-4">
              <Card className="rounded-3xl p-6">
                <h2 className="text-2xl font-bold mb-2">{bn ? exam.title_bn : (exam.title || exam.title_bn) || (bn ? '(শিরোনাম দিন)' : '(Add title)')}</h2>
                {exam.description_bn && <p className="text-muted-foreground mb-4">{bn ? exam.description_bn : exam.description}</p>}
                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge variant="outline" className="rounded-full"><FileText className="w-3 h-3 mr-1" />{questions.length} {bn ? 'প্রশ্ন' : 'questions'}</Badge>
                  <Badge variant="outline" className="rounded-full">{exam.total_marks} {bn ? 'নম্বর' : 'marks'}</Badge>
                  <Badge variant="outline" className="rounded-full">{exam.duration_minutes} {bn ? 'মিনিট' : 'min'}</Badge>
                </div>
                {exam.instructions_bn && (
                  <div className="rounded-2xl bg-muted/40 p-4 mb-4">
                    <p className="font-semibold mb-1">{bn ? 'নির্দেশনা' : 'Instructions'}</p>
                    <p className="text-sm whitespace-pre-line">{bn ? exam.instructions_bn : exam.instructions}</p>
                  </div>
                )}
                <div className="space-y-4">
                  {questions.map((q, i) => (
                    <Card key={q._localId} className="rounded-2xl p-4 border-border/40">
                      <p className="font-medium mb-2">{i + 1}. {bn ? q.question_text_bn : (q.question_text || q.question_text_bn)} <Badge variant="secondary" className="ml-2 rounded-full text-xs">{q.marks}</Badge></p>
                      {(q.question_type === 'mcq' || q.question_type === 'true_false') && (
                        <div className="space-y-1.5">
                          {q.options.map(opt => (
                            <div key={opt.key} className={`flex items-center gap-2 p-2 rounded-xl ${q.correct_answer === opt.key ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-muted/30'}`}>
                              <span className="font-bold text-sm w-6">{opt.key}.</span>
                              <span className="text-sm">{bn ? opt.text_bn : (opt.text || opt.text_bn)}</span>
                              {q.correct_answer === opt.key && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto" />}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.question_type === 'short_answer' && (
                        <div className="text-sm text-muted-foreground italic">{bn ? '(ছাত্র লিখে উত্তর দেবে)' : '(Student writes answer)'}</div>
                      )}
                    </Card>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </div>

          {/* Footer */}
          <div className="border-t border-border/40 p-4 flex items-center justify-between gap-3 bg-muted/20">
            <div className="flex items-center gap-3">
              <Label className="text-sm">{bn ? 'স্ট্যাটাস' : 'Status'}</Label>
              <Select value={exam.status} onValueChange={(v) => setExam({ ...exam, status: v })}>
                <SelectTrigger className="rounded-xl w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{bn ? 'খসড়া' : 'Draft'}</SelectItem>
                  <SelectItem value="published">{bn ? 'প্রকাশিত' : 'Published'}</SelectItem>
                  <SelectItem value="closed">{bn ? 'বন্ধ' : 'Closed'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)}><X className="w-4 h-4 mr-1" />{bn ? 'বাতিল' : 'Cancel'}</Button>
              <Button className="rounded-2xl" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                {bn ? 'সংরক্ষণ' : 'Save'}
              </Button>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default OnlineExamBuilderDialog;
