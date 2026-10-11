import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Image as ImageIcon, Sparkles, Loader2, CheckCircle2, Trash2, HelpCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ImportedQuestion {
  custom_label?: string;
  question_text: string;
  question_text_bn: string;
  question_type: 'mcq' | 'descriptive' | 'short' | 'fill_blank' | 'true_false';
  marks: number;
  options?: { label: string; text_bn: string; text?: string; is_correct?: boolean }[] | null;
  answer?: string;
}

interface QuestionImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: string;
  onImport: (questions: ImportedQuestion[]) => void;
}

const SAMPLE_QUESTION_TEXT = `(ক) মানুষের মেরুদণ্ডে কশেরুকার সংখ্যা কতটি? [১]
(i) ১১ টি  (ii) ১৩ টি  (iii) ১৪ টি

(খ) মানবদেহের সবচেয়ে বড় অস্থি কোনটি? [১]
(i) ফিমার  (ii) টিবিয়া  (iii) হিউমেরাস

১. শালীনতা ও পরিষ্কার-পরিচ্ছন্নতা সম্পর্কে একটি হাদিস লিখ। [৫]

২. ওযুর ফরজ কয়টি ও কী কী সংক্ষেপে বর্ণনা কর। [১০]
`;

export const QuestionImportDialog: React.FC<QuestionImportDialogProps> = ({
  open,
  onOpenChange,
  language,
  onImport,
}) => {
  const bn = language === 'bn';
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ImportedQuestion[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Local Smart Question Parser ───
  const parseQuestionText = (text: string): ImportedQuestion[] => {
    if (!text || !text.trim()) return [];

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const result: ImportedQuestion[] = [];
    let currentQ: ImportedQuestion | null = null;

    // Regex to match question start:
    // (ক), (খ), ক., খ., ১., ২., 1., 2., [১], (১), (1), Q1., ইত্যাদি
    const qStartRegex = /^(\((?:[ক-হA-Za-z0-9ivxIVX]+|[০-৯]+)\)|[ক-হA-Za-z0-9০-৯]+[.\):]|Q\d+[.:]|প্রশ্ন\s*[০-৯\d]+[.:])\s+(.+)$/i;

    // Regex for inline MCQ options:
    // matches: (i) ১১ টি (ii) ১৩ টি (iii) ১৪ টি
    // or (ক) ... (খ) ...
    // or (A) ... (B) ...
    const optionTokenRegex = /(\((?:[iIvVxX]+|[a-dA-D]|[ক-ঘ]|1-4|[১-৪])\)|(?:[iIvVxX]+|[a-dA-D]|[ক-ঘ]|[১-৪])\.)\s+([^\(\)]+?)(?=(?:\((?:[iIvVxX]+|[a-dA-D]|[ক-ঘ]|1-4|[১-৪])\)|(?:[iIvVxX]+|[a-dA-D]|[ক-ঘ]|[১-৪])\.)|$)/g;

    const finalizeCurrent = () => {
      if (!currentQ) return;
      if (currentQ.question_text_bn.trim() || currentQ.question_text.trim()) {
        result.push(currentQ);
      }
      currentQ = null;
    };

    const extractMarks = (str: string): { cleanText: string; marks: number } => {
      // Looks for marks in brackets at end or inside e.g. [৫], [5], (৫ নম্বর), মান: ৫
      const markMatch = str.match(/(?:\[|\()(\d+|[০-৯]+)(?:\s*(?:নম্বর|marks|মাকর্স)?)?(?:\]|\))|\bমান\s*[:ঃ]\s*(\d+|[০-৯]+)/);
      if (markMatch) {
        const numStr = markMatch[1] || markMatch[2];
        const num = parseInt(numStr.replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d))), 10) || 1;
        const clean = str.replace(markMatch[0], '').trim();
        return { cleanText: clean, marks: num };
      }
      return { cleanText: str, marks: 0 };
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if line is purely options for the current question
      const inlineMatches = Array.from(line.matchAll(optionTokenRegex));
      if (currentQ && inlineMatches.length >= 2) {
        currentQ.question_type = 'mcq';
        currentQ.options = inlineMatches.map(m => ({
          label: m[1].trim(),
          text_bn: m[2].trim(),
          text: '',
          is_correct: false,
        }));
        continue;
      }

      // Check if this line starts a new question
      const match = line.match(qStartRegex);
      if (match) {
        finalizeCurrent();
        const prefix = match[1].trim();
        const content = match[2].trim();
        const { cleanText, marks } = extractMarks(content);

        // Check if options are on the same line as the question
        const optMatchesOnLine = Array.from(cleanText.matchAll(optionTokenRegex));
        if (optMatchesOnLine.length >= 2) {
          // Question text is before first option
          const firstOptIndex = cleanText.search(optionTokenRegex);
          const stem = firstOptIndex > 0 ? cleanText.substring(0, firstOptIndex).trim() : cleanText;
          currentQ = {
            custom_label: prefix,
            question_text_bn: stem,
            question_text: '',
            question_type: 'mcq',
            marks: marks || 1,
            options: optMatchesOnLine.map(m => ({
              label: m[1].trim(),
              text_bn: m[2].trim(),
              text: '',
              is_correct: false,
            })),
          };
        } else {
          currentQ = {
            custom_label: prefix,
            question_text_bn: cleanText,
            question_text: '',
            question_type: 'descriptive',
            marks: marks || 5,
            options: null,
          };
        }
      } else if (currentQ) {
        // Line continuation or single option line
        const singleOptMatch = line.match(/^(\((?:[iIvVxX]+|[a-dA-D]|[ক-ঘ]|1-4|[১-৪])\)|(?:[iIvVxX]+|[a-dA-D]|[ক-ঘ]|[১-৪])\.)\s+(.+)$/);
        if (singleOptMatch) {
          currentQ.question_type = 'mcq';
          if (!currentQ.options) currentQ.options = [];
          currentQ.options.push({
            label: singleOptMatch[1].trim(),
            text_bn: singleOptMatch[2].trim(),
            text: '',
            is_correct: false,
          });
        } else {
          // Append to question text
          const { cleanText, marks } = extractMarks(line);
          if (marks && !currentQ.marks) currentQ.marks = marks;
          currentQ.question_text_bn = `${currentQ.question_text_bn} ${cleanText}`.trim();
        }
      } else {
        // First line didn't have a prefix, create descriptive question
        const { cleanText, marks } = extractMarks(line);
        currentQ = {
          custom_label: '',
          question_text_bn: cleanText,
          question_text: '',
          question_type: 'descriptive',
          marks: marks || 5,
          options: null,
        };
      }
    }

    finalizeCurrent();
    return result;
  };

  const handleParseText = () => {
    if (!rawText.trim()) {
      toast.error(bn ? 'অনুগ্রহ করে প্রশ্ন পেস্ট করুন' : 'Please paste question text');
      return;
    }
    const parsed = parseQuestionText(rawText);
    if (parsed.length === 0) {
      toast.warning(bn ? 'কোনো প্রশ্ন শনাক্ত করা যায়নি' : 'No questions detected');
      return;
    }
    setParsedQuestions(parsed);
    toast.success(bn ? `${parsed.length}টি প্রশ্ন সফলভাবে পার্স হয়েছে` : `Parsed ${parsed.length} questions`);
  };

  // ─── File Upload Handler (Image OCR or Text) ───
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const isImage = file.type.startsWith('image/');
    const isText = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv');

    if (!isImage && !isText) {
      toast.error(bn ? 'শুধুমাত্র ছবি (JPG/PNG) বা টেক্সট (.txt) ফাইল সমর্থন করে' : 'Only image (JPG/PNG) or text (.txt) files supported');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error(bn ? 'ফাইল সাইজ ১৫MB এর বেশি হতে পারবে না' : 'File must be under 15MB');
      return;
    }

    setLoading(true);

    if (isText) {
      setLoadingMessage(bn ? 'ফাইল থেকে টেক্সট পড়া হচ্ছে...' : 'Reading text file...');
      const reader = new FileReader();
      reader.onload = () => {
        const content = String(reader.result || '');
        setRawText(content);
        const parsed = parseQuestionText(content);
        setParsedQuestions(parsed);
        setLoading(false);
        setActiveTab('text');
        toast.success(bn ? `টেক্সট ফাইল থেকে ${parsed.length}টি প্রশ্ন পার্স হয়েছে` : `Parsed ${parsed.length} questions from file`);
      };
      reader.onerror = () => {
        setLoading(false);
        toast.error(bn ? 'ফাইল পড়তে সমস্যা হয়েছে' : 'Failed to read file');
      };
      reader.readAsText(file);
      return;
    }

    // Is Image -> Call OCR Edge Function
    setLoadingMessage(bn ? 'ছবি বিশ্লেষণ ও প্রশ্ন শনাক্ত হচ্ছে (OCR)...' : 'Analyzing image and extracting questions (OCR)...');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('scan-questions', {
        body: { image_base64: base64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const qs: any[] = data?.questions || [];
      if (qs.length === 0) {
        toast.warning(bn ? 'ছবিতে কোনো প্রশ্ন খুঁজে পাওয়া যায়নি' : 'No questions detected in image');
        return;
      }

      const mapped: ImportedQuestion[] = qs.map(q => ({
        custom_label: q.custom_label || '',
        question_text: '',
        question_text_bn: q.question_text || q.text || '',
        question_type: q.question_type || (q.options && q.options.length > 0 ? 'mcq' : 'descriptive'),
        marks: q.marks || (q.question_type === 'mcq' ? 1 : 5),
        options: Array.isArray(q.options) && q.options.length > 0
          ? q.options.map((o: any) => ({
              label: o.label || '',
              text_bn: o.text || o.text_bn || '',
              text: '',
              is_correct: !!o.is_correct,
            }))
          : null,
      }));

      setParsedQuestions(mapped);
      toast.success(bn ? `স্ক্যান করে ${mapped.length}টি প্রশ্ন পাওয়া গেছে!` : `Scanned ${mapped.length} questions from image!`);
    } catch (err: any) {
      console.error('Scan error:', err);
      toast.error(
        err.message || (bn ? 'স্ক্যান ব্যর্থ হয়েছে। টেক্সট পেস্ট অপশনটি ব্যবহার করুন।' : 'Scan failed. Please use the text paste option.')
      );
      // Auto switch to text tab with guidance
      setActiveTab('text');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleImportToPaper = () => {
    if (parsedQuestions.length === 0) return;
    onImport(parsedQuestions);
    onOpenChange(false);
    setParsedQuestions([]);
    setRawText('');
    toast.success(bn ? `${parsedQuestions.length}টি প্রশ্ন প্রশ্নপত্রে যোগ করা হয়েছে` : `Imported ${parsedQuestions.length} questions`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-[28px] p-6">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2.5 text-xl font-display">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Upload className="h-5 w-5" />
            </span>
            {bn ? 'প্রশ্ন ইম্পোর্ট (ফাইল, ছবি স্ক্যান বা টেক্সট)' : 'Import Questions (File, Image Scan or Text)'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-2 mb-3 shrink-0">
            <TabsTrigger value="file" className="gap-2 text-xs sm:text-sm">
              <ImageIcon className="h-4 w-4" />
              {bn ? 'ফাইল বা ছবি স্ক্যান' : 'File or Image Scan'}
            </TabsTrigger>
            <TabsTrigger value="text" className="gap-2 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              {bn ? 'সরাসরি টেক্সট পেস্ট' : 'Direct Text Paste'}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: File / Image Upload */}
          <TabsContent value="file" className="flex-1 flex flex-col min-h-0 space-y-3 mt-0">
            <div
              onClick={() => !loading && fileInputRef.current?.click()}
              className="border-2 border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 transition-all rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.txt,.md,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 rounded-2xl bg-background shadow-xs flex items-center justify-center text-primary">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {loading
                    ? loadingMessage
                    : (bn ? 'প্রশ্নপত্রের ছবি বা টেক্সট ফাইল আপলোড করতে ক্লিক করুন' : 'Click to upload question image or text file')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {bn ? 'সমর্থিত ফরম্যাট: JPG, PNG, WebP (ছবি OCR) অথবা .txt (সরাসরি টেক্সট)' : 'Supported: JPG, PNG, WebP (Image OCR) or .txt'}
                </p>
              </div>
              <Button size="sm" variant="outline" disabled={loading} className="mt-1 rounded-xl pointer-events-none">
                {bn ? 'ফাইল নির্বাচন করুন' : 'Browse File'}
              </Button>
            </div>

            <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-primary" />
                {bn ? 'স্ক্যান বা আপলোড পরামর্শ:' : 'Tips for Scanning:'}
              </p>
              <p>• {bn ? 'স্পষ্ট ও সোজা ছবি দিলে বাংলা ও রোমান অপশনসমূহ (i, ii, iii) নির্ভুলভাবে শনাক্ত হবে।' : 'Clear and straight photos ensure accurate OCR of Bengali & Roman options.'}</p>
              <p>• {bn ? 'যদি AI স্ক্যান সাময়িক ব্যর্থ হয়, তবে আপনি নিচের "সরাসরি টেক্সট পেস্ট" ট্যাবে লেখা পেস্ট করে ১ ক্লিকেই প্রশ্ন তৈরি করতে পারেন।' : 'If AI OCR is unavailable, you can paste text directly into the "Direct Text Paste" tab.'}</p>
            </div>
          </TabsContent>

          {/* TAB 2: Direct Text Paste */}
          <TabsContent value="text" className="flex-1 flex flex-col min-h-0 space-y-3 mt-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                {bn ? 'প্রশ্ন পেস্ট বা টাইপ করুন:' : 'Paste or type questions:'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-primary"
                onClick={() => {
                  setRawText(SAMPLE_QUESTION_TEXT);
                  const parsed = parseQuestionText(SAMPLE_QUESTION_TEXT);
                  setParsedQuestions(parsed);
                }}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                {bn ? 'নমুনা ফরম্যাট দেখুন' : 'Load Example'}
              </Button>
            </div>

            <Textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={bn ? `এখানে প্রশ্ন পেস্ট করুন...\n\nযেমন:\n(ক) মানুষের মেরুদণ্ডে কশেরুকার সংখ্যা কতটি? [১]\n(i) ১১ টি  (ii) ১৩ টি  (iii) ১৪ টি\n\n(খ) মানবদেহের সবচেয়ে বড় অস্থি কোনটি? [১]\n(i) ফিমার  (ii) টিবিয়া  (iii) হিউমেরাস` : 'Paste questions here...'}
              rows={6}
              className="resize-none font-mono text-xs sm:text-sm bg-background/80 border-border/50 rounded-xl"
            />

            <div className="flex justify-end gap-2 shrink-0">
              <Button size="sm" onClick={handleParseText} className="rounded-xl">
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                {bn ? 'টেক্সট পার্স করুন' : 'Parse Questions'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* PARSED PREVIEW SECTION */}
        {parsedQuestions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/60 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-xs font-bold text-foreground">
                {bn ? `শনাক্তকৃত প্রশ্নসমূহ (${parsedQuestions.length}টি):` : `Detected Questions (${parsedQuestions.length}):`}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-destructive hover:text-destructive"
                onClick={() => setParsedQuestions([])}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {bn ? 'সব মুছুন' : 'Clear All'}
              </Button>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[30vh] pr-1.5 flex-1">
              {parsedQuestions.map((q, qi) => (
                <div key={qi} className="p-2.5 rounded-xl bg-card border border-border/60 text-xs space-y-1 relative group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="font-bold bg-primary/5 text-primary text-[10px]">
                        {q.custom_label || `#${qi + 1}`}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {q.question_type === 'mcq' ? 'MCQ' : 'বর্ণনামূলক'}
                      </Badge>
                      <span className="font-medium text-foreground">{q.question_text_bn}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-muted-foreground text-[10px] font-semibold">[{q.marks} নম্বর]</span>
                      <button
                        onClick={() => setParsedQuestions(prev => prev.filter((_, i) => i !== qi))}
                        className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                        title={bn ? 'মুছুন' : 'Delete'}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {q.question_type === 'mcq' && q.options && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 pl-4 pt-1 text-[11px] text-muted-foreground">
                      {q.options.map((o, oi) => (
                        <span key={oi} className="inline-flex items-center gap-1 bg-muted/60 px-1.5 py-0.5 rounded">
                          <strong className="text-primary font-semibold">{o.label}</strong>
                          <span>{o.text_bn}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                {bn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button onClick={handleImportToPaper} className="btn-primary-gradient rounded-xl font-bold">
                {bn ? `প্রশ্নপত্রে যোগ করুন (${parsedQuestions.length}টি)` : `Import ${parsedQuestions.length} Questions`}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuestionImportDialog;
