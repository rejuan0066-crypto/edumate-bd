import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { DEFAULT_SCALES, type GradeScale } from '@/lib/grading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Loader2, Save, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

type ScaleDraft = GradeScale & { id?: string; sort_order?: number };
type RuleRow = { id: string; field_name: string | null; config: unknown; is_active: boolean | null; sort_order: number | null };

interface Props {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}

const bnDigits = '০১২৩৪৫৬৭৮৯';
const toEnglishDigits = (value: string) => value.replace(/[০-৯]/g, (digit) => String(bnDigits.indexOf(digit)));
const displayNumber = (value: number | string, bn: boolean) => {
  const text = String(value ?? '');
  return bn ? text.replace(/\d/g, (digit) => bnDigits[Number(digit)]) : text;
};
const parseNumber = (value: string) => {
  const parsed = Number(toEnglishDigits(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const fallbackScale = (scale: GradeScale, index: number): ScaleDraft => ({ ...scale, sort_order: index + 1 } as ScaleDraft);

const GradingSettings = ({ open, onOpenChange }: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [scales, setScales] = useState<ScaleDraft[]>(DEFAULT_SCALES.map(fallbackScale));
  const [passMark, setPassMark] = useState(33);
  const [maxMarks, setMaxMarks] = useState(100);
  const [errorText, setErrorText] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['result-grading-settings'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('validation_rules')
        .select('id, field_name, config, is_active, sort_order')
        .eq('module', 'result')
        .in('field_name', ['grading_scale', 'pass_mark', 'marks'])
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as RuleRow[];
    },
  });

  useEffect(() => {
    if (!open || !rows.length) return;
    const gradingRows = rows
      .filter((row) => row.field_name === 'grading_scale')
      .map((row, index) => {
        const config = row.config && typeof row.config === 'object' ? row.config as Record<string, unknown> : {};
        const base = DEFAULT_SCALES[index] || DEFAULT_SCALES[DEFAULT_SCALES.length - 1];
        return {
          ...base,
          id: row.id,
          grade: String(config.grade ?? base.grade),
          min: Number(config.min ?? base.min),
          max: Number(config.max ?? base.max),
          gpa: String(config.gpa ?? base.gpa),
          color: String(config.color ?? base.color),
          title: String(config.title ?? base.title ?? ''),
          title_bn: String(config.title_bn ?? base.title_bn ?? ''),
        };
      });
    if (gradingRows.length) setScales(gradingRows);

    const passRow = rows.find((row) => row.field_name === 'pass_mark');
    const passConfig = passRow?.config && typeof passRow.config === 'object' ? passRow.config as Record<string, unknown> : {};
    setPassMark(Number(passConfig.min ?? 33));

    const marksRow = rows.find((row) => row.field_name === 'marks');
    const marksConfig = marksRow?.config && typeof marksRow.config === 'object' ? marksRow.config as Record<string, unknown> : {};
    setMaxMarks(Number(marksConfig.max ?? 100));
  }, [open, rows]);

  const orderedScales = useMemo(() => [...scales].sort((a, b) => b.min - a.min), [scales]);

  const updateScale = (index: number, field: keyof ScaleDraft, value: string) => {
    setScales((current) => current.map((scale, scaleIndex) => {
      if (scaleIndex !== index) return scale;
      if (field === 'min' || field === 'max') return { ...scale, [field]: parseNumber(value) };
      return { ...scale, [field]: value };
    }));
    setErrorText('');
  };

  const validate = () => {
    if (!Number.isFinite(passMark) || passMark < 0 || passMark > maxMarks) {
      return bn ? 'পাশ মার্ক ০ থেকে পূর্ণমানের মধ্যে হতে হবে।' : 'Pass mark must be between 0 and the maximum marks.';
    }
    if (!Number.isFinite(maxMarks) || maxMarks <= 0) {
      return bn ? 'পূর্ণমান অবশ্যই ০-এর বেশি হতে হবে।' : 'Maximum marks must be greater than 0.';
    }
    if (!orderedScales.length) return bn ? 'কমপক্ষে একটি গ্রেড প্রয়োজন।' : 'At least one grade is required.';
    if (new Set(orderedScales.map((scale) => scale.grade.trim().toUpperCase())).size !== orderedScales.length) {
      return bn ? 'প্রতিটি গ্রেডের নাম আলাদা হতে হবে।' : 'Each grade must have a unique name.';
    }
    if (!orderedScales.some((scale) => scale.grade.trim().toUpperCase() === 'F')) {
      return bn ? 'F গ্রেড অবশ্যই রাখতে হবে।' : 'The F grade is required.';
    }
    if (!orderedScales.some((scale) => scale.grade.trim().toUpperCase() === 'D')) {
      return bn ? 'D গ্রেড অবশ্যই রাখতে হবে, কারণ বিবেচনায়-পাস এই গ্রেড ব্যবহার করে।' : 'The D grade is required because consideration pass uses this grade.';
    }
    for (const scale of orderedScales) {
      if (!scale.grade.trim() || !scale.title?.trim() || !scale.title_bn?.trim()) {
        return bn ? 'গ্রেড, ইংরেজি মর্যাদা ও বাংলা মর্যাদা পূরণ করুন।' : 'Grade and both merit titles are required.';
      }
      if (!Number.isFinite(scale.min) || !Number.isFinite(scale.max) || !Number.isInteger(scale.min) || !Number.isInteger(scale.max) || scale.min < 0 || scale.max > 100 || scale.min > scale.max) {
        return bn ? `${scale.grade} গ্রেডের শতাংশ সীমা ০ থেকে ১০০-এর পূর্ণ সংখ্যা হতে হবে।` : `The percentage range for ${scale.grade} must be whole numbers from 0 to 100.`;
      }
    }
    if (orderedScales[orderedScales.length - 1].min !== 0 || orderedScales[0].max !== 100) {
      return bn ? 'গ্রেডিং স্কেল ০% থেকে ১০০% পর্যন্ত সম্পূর্ণ হতে হবে।' : 'The grading scale must cover 0% through 100%.';
    }
    for (let index = 0; index < orderedScales.length - 1; index += 1) {
      if (orderedScales[index].min <= orderedScales[index + 1].max) {
        return bn ? 'গ্রেডগুলোর শতাংশ সীমা একে অপরের সঙ্গে ওভারল্যাপ করছে।' : 'Grade percentage ranges must not overlap.';
      }
      if (orderedScales[index].min !== orderedScales[index + 1].max + 1) {
        return bn ? 'গ্রেডিং স্কেলে কোনো শতাংশ বাদ বা ফাঁকা রাখা যাবে না।' : 'Grade percentage ranges must be continuous with no gaps.';
      }
    }
    return '';
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validationError = validate();
      if (validationError) throw new Error(validationError);

      const currentRows = rows as RuleRow[];
      const sorted = orderedScales.map((scale, index) => ({ ...scale, sort_order: index + 1 }));
      await Promise.all(sorted.map(async (scale) => {
        const payload = {
          name: `Grade ${scale.grade}`,
          name_bn: `গ্রেড ${scale.grade}`,
          module: 'result',
          rule_level: 'business',
          field_name: 'grading_scale',
          rule_type: 'range',
          config: {
            grade: scale.grade.trim().toUpperCase(), min: scale.min, max: scale.max,
            gpa: scale.gpa, color: scale.color, title: scale.title?.trim(), title_bn: scale.title_bn?.trim(),
          },
          is_active: true,
          sort_order: scale.sort_order,
          updated_at: new Date().toISOString(),
        };
        const query = scale.id
          ? supabase.from('validation_rules').update(payload).eq('id', scale.id)
          : supabase.from('validation_rules').insert(payload);
        const { error } = await query;
        if (error) throw error;
      }));

      const passRow = currentRows.find((row) => row.field_name === 'pass_mark');
      const marksRow = currentRows.find((row) => row.field_name === 'marks');
      if (passRow) {
        const { error } = await supabase.from('validation_rules').update({ config: { min: passMark }, updated_at: new Date().toISOString() }).eq('id', passRow.id);
        if (error) throw error;
      }
      if (marksRow) {
        const { error } = await supabase.from('validation_rules').update({ config: { min: 0, max: maxMarks }, updated_at: new Date().toISOString() }).eq('id', marksRow.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['result-grading-settings'] });
      queryClient.invalidateQueries({ queryKey: ['grading-scales'] });
      queryClient.invalidateQueries({ queryKey: ['marks-config'] });
      queryClient.invalidateQueries({ queryKey: ['pass-mark-config'] });
      toast.success(bn ? 'গ্রেডিং নিয়ম সংরক্ষিত হয়েছে' : 'Grading rules saved');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      setErrorText(error.message);
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" />{bn ? 'গ্রেডিং ও মর্যাদা সেটিংস' : 'Grading & Merit Title Settings'}</DialogTitle>
          <DialogDescription>{bn ? 'এই নিয়ম সব ফলাফল, মার্কশিট, মেধা তালিকা, প্রিন্ট ও পাবলিক রেজাল্টে প্রযোজ্য হবে।' : 'These rules apply to all results, marksheets, merit lists, prints and public result lookup.'}</DialogDescription>
        </DialogHeader>

        {isLoading ? <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
          <div className="space-y-5">
            {errorText && <Alert variant="destructive"><AlertDescription>{errorText}</AlertDescription></Alert>}
            <Alert><Info className="h-4 w-4" /><AlertDescription>{bn ? 'মর্যাদা মোট নম্বরের শতাংশ থেকে নির্ধারিত হয়; গড়/average ব্যবহার হয় না। খালি বিষয় গণনায় আসে না, আর ০ নম্বর পাওয়া বিষয় ফেল হিসেবে গণ্য হয়।' : 'Merit titles use the percentage of total marks; no average is used. Blank subjects are excluded, while an entered zero is a failure.'}</AlertDescription></Alert>

            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div className="space-y-1.5"><Label>{bn ? 'পাশ মার্ক' : 'Pass mark'}</Label><Input type="text" inputMode="decimal" value={displayNumber(passMark, bn)} onChange={(event) => { setPassMark(parseNumber(event.target.value)); setErrorText(''); }} /></div>
              <div className="space-y-1.5"><Label>{bn ? 'প্রতি বিষয়ে পূর্ণমান' : 'Full marks per subject'}</Label><Input type="text" inputMode="decimal" value={displayNumber(maxMarks, bn)} onChange={(event) => { setMaxMarks(parseNumber(event.target.value)); setErrorText(''); }} /></div>
            </div>

            <Separator />
            <div>
              <h3 className="font-semibold text-foreground">{bn ? 'গ্রেড ও মর্যাদার স্কেল' : 'Grade and merit title scale'}</h3>
              <p className="text-xs text-muted-foreground mt-1">{bn ? 'শতাংশ সীমা ০–১০০-এর মধ্যে দিন। একই সীমা একাধিক গ্রেডে রাখা যাবে না।' : 'Enter percentage ranges from 0–100. The same range cannot be assigned to multiple grades.'}</p>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-muted/50"><tr className="text-left"><th className="p-3">{bn ? 'গ্রেড' : 'Grade'}</th><th className="p-3">{bn ? 'শুরু %' : 'Min %'}</th><th className="p-3">{bn ? 'শেষ %' : 'Max %'}</th><th className="p-3">GPA</th><th className="p-3">{bn ? 'মর্যাদা (EN)' : 'Title (EN)'}</th><th className="p-3">{bn ? 'মর্যাদা (বাংলা)' : 'Title (BN)'}</th></tr></thead>
                <tbody>
                  {orderedScales.map((scale) => {
                    const sourceIndex = scales.findIndex((item) => item.id === scale.id && item.grade === scale.grade);
                    return <tr key={scale.id || scale.grade} className="border-t">
                      <td className="p-2"><Input className="w-20" value={scale.grade} onChange={(event) => updateScale(sourceIndex, 'grade', event.target.value)} /></td>
                      <td className="p-2"><Input className="w-24" type="text" inputMode="decimal" value={displayNumber(scale.min, bn)} onChange={(event) => updateScale(sourceIndex, 'min', event.target.value)} /></td>
                      <td className="p-2"><Input className="w-24" type="text" inputMode="decimal" value={displayNumber(scale.max, bn)} onChange={(event) => updateScale(sourceIndex, 'max', event.target.value)} /></td>
                      <td className="p-2"><Input className="w-24" value={scale.gpa} onChange={(event) => updateScale(sourceIndex, 'gpa', event.target.value)} /></td>
                      <td className="p-2"><Input value={scale.title || ''} onChange={(event) => updateScale(sourceIndex, 'title', event.target.value)} /></td>
                      <td className="p-2"><Input value={scale.title_bn || ''} onChange={(event) => updateScale(sourceIndex, 'title_bn', event.target.value)} /></td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button><Button onClick={() => saveMutation.mutate()} disabled={isLoading || saveMutation.isPending} className="gap-2"><Save className="h-4 w-4" />{saveMutation.isPending ? (bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (bn ? 'নিয়ম সংরক্ষণ করুন' : 'Save rules')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GradingSettings;
