import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import SearchableSelect from '@/components/SearchableSelect';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Save, ListChecks, Settings as SettingsIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Question {
  id?: string;
  question_text: string;
  question_text_bn: string;
  options: string[];
  correct_answer: string;
  marks: number;
  sort_order: number;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  testId: string | null;
  onSaved: () => void;
}

const emptyQ = (order: number): Question => ({
  question_text: '',
  question_text_bn: '',
  options: ['', '', '', ''],
  correct_answer: '',
  marks: 1,
  sort_order: order,
});

const AdmissionTestBuilderDialog = ({ open, onOpenChange, testId, onSaved }: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [title, setTitle] = useState('');
  const [titleBn, setTitleBn] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionBn, setDescriptionBn] = useState('');
  const [classId, setClassId] = useState('');
  const [academicSessionId, setAcademicSessionId] = useState('');
  const [duration, setDuration] = useState(60);
  const [totalMarks, setTotalMarks] = useState(100);
  const [passMark, setPassMark] = useState(40);
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [shuffleQ, setShuffleQ] = useState(true);
  const [showResult, setShowResult] = useState(true);
  const [instructionsBn, setInstructionsBn] = useState('');
  const [questions, setQuestions] = useState<Question[]>([emptyQ(0)]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('settings');

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-builder'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions-builder'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_sessions').select('*').eq('is_active', true).order('name', { ascending: false });
      return data || [];
    },
  });

  // Load existing test
  useEffect(() => {
    if (!testId || !open) return;
    (async () => {
      const { data: test } = await supabase
        .from('admission_tests')
        .select('*')
        .eq('id', testId)
        .maybeSingle();
      if (!test) return;
      setTitle(test.title || '');
      setTitleBn(test.title_bn || '');
      setDescription(test.description || '');
      setDescriptionBn(test.description_bn || '');
      setClassId(test.class_id || '');
      setAcademicSessionId(test.academic_session_id || '');
      setDuration(test.duration_minutes || 60);
      setTotalMarks(test.total_marks || 100);
      setPassMark(test.pass_mark || 40);
      setOpensAt(test.opens_at ? new Date(test.opens_at).toISOString().slice(0, 16) : '');
      setClosesAt(test.closes_at ? new Date(test.closes_at).toISOString().slice(0, 16) : '');
      setShuffleQ(test.shuffle_questions ?? true);
      setShowResult(test.show_result_immediately ?? true);
      setInstructionsBn(test.instructions_bn || '');

      const { data: qs } = await supabase
        .from('admission_test_questions')
        .select('*')
        .eq('test_id', testId)
        .order('sort_order');
      if (qs?.length) {
        setQuestions(qs.map((q: any) => ({
          id: q.id,
          question_text: q.question_text || '',
          question_text_bn: q.question_text_bn || '',
          options: Array.isArray(q.options) ? q.options : ['', '', '', ''],
          correct_answer: q.correct_answer || '',
          marks: q.marks || 1,
          sort_order: q.sort_order || 0,
        })));
      }
    })();
  }, [testId, open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTitle(''); setTitleBn(''); setDescription(''); setDescriptionBn('');
      setClassId(''); setAcademicSessionId('');
      setDuration(60); setTotalMarks(100); setPassMark(40);
      setOpensAt(''); setClosesAt('');
      setShuffleQ(true); setShowResult(true);
      setInstructionsBn('');
      setQuestions([emptyQ(0)]);
      setTab('settings');
    }
  }, [open]);

  const addQuestion = () => setQuestions(prev => [...prev, emptyQ(prev.length)]);
  const removeQuestion = (idx: number) => setQuestions(prev => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, sort_order: i })));
  const updateQ = (idx: number, patch: Partial<Question>) =>
    setQuestions(prev => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  const updateOpt = (idx: number, optIdx: number, value: string) =>
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, options: q.options.map((o, oi) => oi === optIdx ? value : o) } : q));

  const handleSave = async () => {
    if (!titleBn.trim()) {
      toast.error(bn ? 'বাংলা শিরোনাম দিন' : 'Bangla title required');
      return;
    }
    if (!questions.length) {
      toast.error(bn ? 'কমপক্ষে ১টি প্রশ্ন যোগ করুন' : 'Add at least 1 question');
      return;
    }
    for (const [i, q] of questions.entries()) {
      if (!q.question_text_bn.trim() && !q.question_text.trim()) {
        toast.error(`${bn ? 'প্রশ্ন' : 'Question'} ${i + 1}: ${bn ? 'প্রশ্ন লিখুন' : 'Question text required'}`);
        return;
      }
      if (q.options.filter(o => o.trim()).length < 2) {
        toast.error(`${bn ? 'প্রশ্ন' : 'Question'} ${i + 1}: ${bn ? 'কমপক্ষে ২টি অপশন দিন' : 'At least 2 options required'}`);
        return;
      }
      if (!q.correct_answer.trim()) {
        toast.error(`${bn ? 'প্রশ্ন' : 'Question'} ${i + 1}: ${bn ? 'সঠিক উত্তর নির্বাচন করুন' : 'Select correct answer'}`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim() || titleBn.trim(),
        title_bn: titleBn.trim(),
        description: description.trim() || null,
        description_bn: descriptionBn.trim() || null,
        class_id: classId || null,
        academic_session_id: academicSessionId || null,
        duration_minutes: duration,
        total_marks: totalMarks,
        pass_mark: passMark,
        opens_at: opensAt ? new Date(opensAt).toISOString() : null,
        closes_at: closesAt ? new Date(closesAt).toISOString() : null,
        shuffle_questions: shuffleQ,
        show_result_immediately: showResult,
        instructions_bn: instructionsBn.trim() || null,
      };

      let savedId = testId;
      if (testId) {
        const { error } = await supabase.from('admission_tests').update(payload).eq('id', testId);
        if (error) throw error;
        // Delete old questions then re-insert
        await supabase.from('admission_test_questions').delete().eq('test_id', testId);
      } else {
        const { data, error } = await supabase.from('admission_tests').insert(payload).select('id').single();
        if (error) throw error;
        savedId = data.id;
      }

      // Insert questions
      const qPayload = questions.map((q, i) => ({
        test_id: savedId,
        question_text: q.question_text.trim() || q.question_text_bn.trim(),
        question_text_bn: q.question_text_bn.trim() || null,
        options: q.options.filter(o => o.trim()),
        correct_answer: q.correct_answer.trim(),
        marks: q.marks,
        sort_order: i,
      }));
      const { error: qErr } = await supabase.from('admission_test_questions').insert(qPayload);
      if (qErr) throw qErr;

      toast.success(bn ? 'সংরক্ষিত হয়েছে' : 'Saved successfully');
      onSaved();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-[28px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {testId ? (bn ? 'পরীক্ষা সম্পাদনা' : 'Edit Test') : (bn ? 'নতুন ভর্তি পরীক্ষা' : 'New Admission Test')}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 w-full rounded-[16px]">
            <TabsTrigger value="settings" className="rounded-[12px]">
              <SettingsIcon className="w-4 h-4 mr-1" /> {bn ? 'সেটিংস' : 'Settings'}
            </TabsTrigger>
            <TabsTrigger value="questions" className="rounded-[12px]">
              <ListChecks className="w-4 h-4 mr-1" /> {bn ? `প্রশ্ন (${questions.length})` : `Questions (${questions.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{bn ? 'বাংলা শিরোনাম *' : 'Bangla Title *'}</Label>
                <Input value={titleBn} onChange={(e) => setTitleBn(e.target.value)} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label>{bn ? 'ইংরেজি শিরোনাম' : 'English Title'}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label>{bn ? 'বাংলা বিবরণ' : 'Bangla Description'}</Label>
                <Textarea value={descriptionBn} onChange={(e) => setDescriptionBn(e.target.value)} className="rounded-xl mt-1" rows={2} />
              </div>
              <div>
                <Label>{bn ? 'ইংরেজি বিবরণ' : 'English Description'}</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-xl mt-1" rows={2} />
              </div>
              <div>
                <Label>{bn ? 'শ্রেণী' : 'Class'}</Label>
                <SearchableSelect
                  value={classId}
                  onValueChange={setClassId}
                  options={classes.map((c: any) => ({ value: c.id, label: bn ? c.name_bn : c.name }))}
                  placeholder={bn ? 'নির্বাচন করুন' : 'Select'}
                />
              </div>
              <div>
                <Label>{bn ? 'শিক্ষাবর্ষ' : 'Academic Year'}</Label>
                <SearchableSelect
                  value={academicSessionId}
                  onValueChange={setAcademicSessionId}
                  options={sessions.map((s: any) => ({ value: s.id, label: bn ? (s.name_bn || s.name) : s.name }))}
                  placeholder={bn ? 'নির্বাচন করুন' : 'Select'}
                />
              </div>
              <div>
                <Label>{bn ? 'সময়কাল (মিনিট)' : 'Duration (minutes)'}</Label>
                <Input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 0)} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label>{bn ? 'মোট নম্বর' : 'Total Marks'}</Label>
                <Input type="number" value={totalMarks} onChange={(e) => setTotalMarks(parseInt(e.target.value) || 0)} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label>{bn ? 'পাশ নম্বর' : 'Pass Mark'}</Label>
                <Input type="number" value={passMark} onChange={(e) => setPassMark(parseInt(e.target.value) || 0)} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label>{bn ? 'শুরুর সময়' : 'Opens At'}</Label>
                <Input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label>{bn ? 'শেষ সময়' : 'Closes At'}</Label>
                <Input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className="rounded-xl mt-1" />
              </div>
            </div>

            <div className="md:col-span-2">
              <Label>{bn ? 'নিয়মাবলী (বাংলা)' : 'Instructions (Bangla)'}</Label>
              <Textarea value={instructionsBn} onChange={(e) => setInstructionsBn(e.target.value)} className="rounded-xl mt-1" rows={3}
                placeholder={bn ? 'পরীক্ষার নিয়মাবলী লিখুন...' : 'Write exam instructions...'} />
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={shuffleQ} onCheckedChange={setShuffleQ} />
                <Label className="cursor-pointer">{bn ? 'প্রশ্ন এলোমেলো' : 'Shuffle questions'}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={showResult} onCheckedChange={setShowResult} />
                <Label className="cursor-pointer">{bn ? 'তাৎক্ষণিক ফলাফল দেখান' : 'Show result immediately'}</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4 mt-4">
            {questions.map((q, idx) => (
              <Card key={idx} className="p-4 rounded-[20px]">
                <div className="flex items-center justify-between mb-3">
                  <Badge className="rounded-full">{bn ? `প্রশ্ন ${idx + 1}` : `Q${idx + 1}`}</Badge>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs">{bn ? 'নম্বর' : 'Marks'}</Label>
                      <Input
                        type="number"
                        value={q.marks}
                        onChange={(e) => updateQ(idx, { marks: parseInt(e.target.value) || 1 })}
                        className="w-16 h-8 rounded-lg"
                      />
                    </div>
                    {questions.length > 1 && (
                      <Button size="sm" variant="ghost" onClick={() => removeQuestion(idx)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Textarea
                    placeholder={bn ? 'প্রশ্ন (বাংলা)' : 'Question (Bangla)'}
                    value={q.question_text_bn}
                    onChange={(e) => updateQ(idx, { question_text_bn: e.target.value })}
                    className="rounded-xl"
                    rows={2}
                  />
                  <Textarea
                    placeholder={bn ? 'প্রশ্ন (ইংরেজি)' : 'Question (English)'}
                    value={q.question_text}
                    onChange={(e) => updateQ(idx, { question_text: e.target.value })}
                    className="rounded-xl"
                    rows={2}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQ(idx, { correct_answer: opt })}
                          className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                            q.correct_answer === opt && opt
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-border hover:border-primary'
                          }`}
                        >
                          {q.correct_answer === opt && opt ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs">{String.fromCharCode(65 + oi)}</span>}
                        </button>
                        <Input
                          placeholder={`${bn ? 'অপশন' : 'Option'} ${String.fromCharCode(65 + oi)}`}
                          value={opt}
                          onChange={(e) => {
                            const newVal = e.target.value;
                            const wasCorrect = q.correct_answer === opt;
                            updateOpt(idx, oi, newVal);
                            if (wasCorrect) updateQ(idx, { correct_answer: newVal });
                          }}
                          className="rounded-xl"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {bn ? '✓ চিহ্ন দিয়ে সঠিক উত্তর চিহ্নিত করুন' : 'Click ✓ to mark the correct answer'}
                  </p>
                </div>
              </Card>
            ))}

            <Button variant="outline" onClick={addQuestion} className="w-full rounded-full">
              <Plus className="w-4 h-4 mr-1" /> {bn ? 'প্রশ্ন যোগ করুন' : 'Add Question'}
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full">
            {bn ? 'বাতিল' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-full">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            {bn ? 'সংরক্ষণ' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdmissionTestBuilderDialog;
