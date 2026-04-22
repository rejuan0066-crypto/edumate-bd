import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GeneratedQuestion {
  question_type: 'mcq' | 'short' | 'cq' | 'descriptive';
  text: string;
  marks: number;
  options?: { text: string; is_correct: boolean }[];
  answer?: string;
}

interface AIQuestionGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: string;
  subjectName?: string;
  className?: string;
  onImport: (questions: GeneratedQuestion[]) => void;
}

export const AIQuestionGeneratorDialog = ({
  open, onOpenChange, language, subjectName, className: classLevel, onImport,
}: AIQuestionGeneratorDialogProps) => {
  const bn = language === 'bn';
  const [syllabus, setSyllabus] = useState('');
  const [lang, setLang] = useState<'bn' | 'en' | 'ar'>('bn');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');
  const [mcqCount, setMcqCount] = useState(5);
  const [shortCount, setShortCount] = useState(3);
  const [cqCount, setCqCount] = useState(2);
  const [descCount, setDescCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<GeneratedQuestion[]>([]);

  const handleGenerate = async () => {
    if (syllabus.trim().length < 5) {
      toast.error(bn ? 'সিলেবাস বা টপিক লিখুন' : 'Please enter syllabus or topic');
      return;
    }
    if (mcqCount + shortCount + cqCount + descCount === 0) {
      toast.error(bn ? 'কমপক্ষে ১টি প্রশ্ন প্রকার নির্বাচন করুন' : 'Select at least one question type count');
      return;
    }
    setLoading(true);
    setPreview([]);
    try {
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: {
          syllabus,
          subject: subjectName,
          class_name: classLevel,
          language: lang,
          difficulty,
          mcq_count: mcqCount,
          short_count: shortCount,
          cq_count: cqCount,
          descriptive_count: descCount,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const qs: GeneratedQuestion[] = data?.questions || [];
      if (qs.length === 0) {
        toast.warning(bn ? 'কোনো প্রশ্ন তৈরি হয়নি' : 'No questions generated');
        return;
      }
      setPreview(qs);
      toast.success(bn ? `${qs.length}টি প্রশ্ন তৈরি হয়েছে` : `${qs.length} questions generated`);
    } catch (err: any) {
      console.error('AI generation error:', err);
      toast.error(err.message || (bn ? 'প্রশ্ন তৈরি ব্যর্থ' : 'Generation failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (preview.length === 0) return;
    onImport(preview);
    onOpenChange(false);
    setPreview([]);
    setSyllabus('');
    toast.success(bn ? 'প্রশ্ন ইম্পোর্ট হয়েছে' : 'Questions imported');
  };

  const typeLabel = (t: string) => {
    if (bn) {
      return { mcq: 'MCQ', short: 'সংক্ষিপ্ত', cq: 'সৃজনশীল', descriptive: 'রচনামূলক' }[t] || t;
    }
    return { mcq: 'MCQ', short: 'Short', cq: 'CQ', descriptive: 'Descriptive' }[t] || t;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-[38px] p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md">
              <Sparkles className="h-4 w-4" />
            </span>
            {bn ? 'AI প্রশ্নপত্র জেনারেটর' : 'AI Question Generator'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Syllabus input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              {bn ? 'সিলেবাস / টপিক / অধ্যায়ের সারাংশ' : 'Syllabus / Topic / Chapter summary'}
            </Label>
            <Textarea
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              placeholder={bn
                ? 'যেমন: সূরা ফাতিহার তাফসীর, তাজবীদের মৌলিক নিয়ম, প্রথম বিশ্বযুদ্ধ এর কারণ ও ফলাফল...'
                : 'e.g., Tafsir of Surah Fatiha, basic rules of Tajwid, causes and results of WWI...'}
              rows={4}
              className="rounded-2xl text-sm bg-background/80 border-border/40"
            />
            {(subjectName || classLevel) && (
              <p className="text-[11px] text-muted-foreground pl-1">
                {subjectName && <span className="mr-3">📚 {subjectName}</span>}
                {classLevel && <span>🎓 {classLevel}</span>}
              </p>
            )}
          </div>

          {/* Language + Difficulty */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{bn ? 'প্রশ্নের ভাষা' : 'Question Language'}</Label>
              <Select value={lang} onValueChange={(v: any) => setLang(v)}>
                <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bn">বাংলা</SelectItem>
                  <SelectItem value="ar">العربية (Arabic)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{bn ? 'কঠিন্যতার মাত্রা' : 'Difficulty'}</Label>
              <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                <SelectTrigger className="rounded-xl h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{bn ? 'সহজ' : 'Easy'}</SelectItem>
                  <SelectItem value="medium">{bn ? 'মধ্যম' : 'Medium'}</SelectItem>
                  <SelectItem value="hard">{bn ? 'কঠিন' : 'Hard'}</SelectItem>
                  <SelectItem value="mixed">{bn ? 'মিশ্র' : 'Mixed'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Counts */}
          <div className="grid grid-cols-4 gap-2 p-3 rounded-2xl bg-muted/30 border border-border/40">
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold uppercase">MCQ</Label>
              <Input type="number" min={0} max={50} value={mcqCount} onChange={(e) => setMcqCount(Math.max(0, parseInt(e.target.value) || 0))} className="h-8 text-sm text-center rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold uppercase">{bn ? 'সংক্ষিপ্ত' : 'Short'}</Label>
              <Input type="number" min={0} max={30} value={shortCount} onChange={(e) => setShortCount(Math.max(0, parseInt(e.target.value) || 0))} className="h-8 text-sm text-center rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold uppercase">CQ</Label>
              <Input type="number" min={0} max={20} value={cqCount} onChange={(e) => setCqCount(Math.max(0, parseInt(e.target.value) || 0))} className="h-8 text-sm text-center rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold uppercase">{bn ? 'রচনা' : 'Desc'}</Label>
              <Input type="number" min={0} max={20} value={descCount} onChange={(e) => setDescCount(Math.max(0, parseInt(e.target.value) || 0))} className="h-8 text-sm text-center rounded-lg" />
            </div>
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/20 font-semibold"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
            {loading
              ? (bn ? 'AI প্রশ্ন তৈরি করছে...' : 'AI is generating...')
              : (bn ? 'প্রশ্ন তৈরি করুন' : 'Generate Questions')}
          </Button>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  {bn ? `প্রিভিউ (${preview.length}টি প্রশ্ন)` : `Preview (${preview.length} questions)`}
                </Label>
                <Button onClick={handleImport} size="sm" className="h-8 rounded-lg bg-primary text-primary-foreground">
                  {bn ? 'প্রশ্নপত্রে যোগ করুন' : 'Add to Paper'}
                </Button>
              </div>
              <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-2">
                {preview.map((q, i) => (
                  <div key={i} className="p-3 rounded-xl bg-card border border-border/40">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {typeLabel(q.question_type)}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {q.marks} {bn ? 'নম্বর' : 'marks'}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap text-foreground/90">{q.text}</p>
                    {q.options && q.options.length > 0 && (
                      <ul className="mt-2 space-y-0.5 pl-3">
                        {q.options.map((o, oi) => (
                          <li key={oi} className={`text-[12px] ${o.is_correct ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                            {String.fromCharCode(65 + oi)}. {o.text} {o.is_correct && '✓'}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIQuestionGeneratorDialog;
