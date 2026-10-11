import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { toBnDigits, toEnDigits } from '@/lib/digits';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const GracePassSettings = ({ open, onOpenChange }: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();

  const { data: row, isLoading } = useQuery({
    queryKey: ['grace-pass-rule'],
    queryFn: async () => {
      const { data } = await supabase
        .from('validation_rules')
        .select('id, config, is_active')
        .eq('module', 'result')
        .eq('field_name', 'grace_pass')
        .maybeSingle();
      return data;
    },
    enabled: open,
  });

  const [enabled, setEnabled] = useState(false);
  const [maxSubjects, setMaxSubjects] = useState(1);
  const [grade, setGrade] = useState('D');
  const [applyTo, setApplyTo] = useState<'all' | 'selected'>('all');
  const [classRules, setClassRules] = useState<Record<string, number>>({});
  const [minAggregatePercent, setMinAggregatePercent] = useState<number>(0);
  const [maxMarkDeficit, setMaxMarkDeficit] = useState<number>(0);

  const { data: classes = [], refetch: refetchClasses } = useQuery({
    queryKey: ['grace-pass-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, name_bn, sort_order, division_id, divisions(name_bn, name, sort_order)')
        .order('sort_order');
      if (error) throw error;
      return (data || []).sort((a: any, b: any) =>
        ((a.divisions?.sort_order ?? 999) - (b.divisions?.sort_order ?? 999)) ||
        ((a.sort_order ?? 999) - (b.sort_order ?? 999)));
    },
    enabled: open,
    staleTime: 0,
  });

  useEffect(() => {
    if (open) {
      refetchClasses();
      qc.invalidateQueries({ queryKey: ['grace-pass-classes'] });
    }
  }, [open, refetchClasses, qc]);

  useEffect(() => {
    const c: any = (row?.config && typeof row.config === 'object') ? row.config : {};
    setEnabled(!!row?.is_active && c.enabled !== false);
    setMaxSubjects(c.max_subjects ?? 1);
    setGrade(c.grade || 'D');
    setApplyTo(c.apply_to === 'selected' ? 'selected' : 'all');
    setClassRules((c.class_rules && typeof c.class_rules === 'object') ? c.class_rules : {});
    setMinAggregatePercent(Number(c.min_aggregate_percent) || 0);
    setMaxMarkDeficit(Number(c.max_mark_deficit) || 0);
  }, [row]);

  const saveM = useMutation({
    mutationFn: async () => {
      const payload = {
        module: 'result',
        field_name: 'grace_pass',
        name: 'Consideration Pass',
        name_bn: 'বিবেচনায় পাস',
        rule_level: 'warning',
        rule_type: 'custom',
        is_active: enabled,
        config: {
          enabled,
          max_subjects: Math.max(1, Number(maxSubjects) || 1),
          grade: grade.trim().toUpperCase() || 'D',
          apply_to: applyTo,
          class_rules: Object.fromEntries(
            Object.entries(classRules).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)])
          ),
          min_aggregate_percent: Math.max(0, Number(minAggregatePercent) || 0),
          max_mark_deficit: Math.max(0, Number(maxMarkDeficit) || 0),
        } as any,
      };
      if (row?.id) {
        const { error } = await supabase.from('validation_rules').update(payload).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('validation_rules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(bn ? 'সেটিং সংরক্ষিত হয়েছে' : 'Settings saved');
      qc.invalidateQueries({ queryKey: ['grace-pass-rule'] });
      qc.invalidateQueries({ queryKey: ['grace-pass-config'] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[28px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bn ? 'বিবেচনায় পাস সেটিং' : 'Consideration Pass Settings'}</DialogTitle>
          <DialogDescription>
            {bn
              ? 'নির্দিষ্ট সংখ্যক বিষয়ে ফেল করলেও ছাত্রকে পাস (মকবুল) হিসেবে গণ্য করা হবে।'
              : 'Allow students failing a limited number of subjects to pass with a set grade.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/30">
              <Label className="text-sm">{bn ? 'বিবেচনায় পাস চালু' : 'Enable consideration pass'}</Label>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{bn ? 'ডিফল্ট: সর্বোচ্চ কত বিষয়ে ফেল গ্রহণযোগ্য' : 'Default max failed subjects allowed'}</Label>
              <Input 
                type="text" 
                value={bn ? (maxSubjects === 0 ? '' : maxSubjects.toString().replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)])) : (maxSubjects || '')} 
                disabled={!enabled || applyTo === 'selected'}
                placeholder={bn ? '০' : '0'}
                data-bijoy={bn}
                onChange={(e) => {
                  const raw = e.target.value;
                  // If English version, standard integer parsing
                  if (!bn) {
                    const val = parseInt(raw);
                    if (isNaN(val)) setMaxSubjects(0);
                    else setMaxSubjects(val);
                    return;
                  }

                  // If Bengali version, convert digits manually
                  const digitMap: Record<string, number> = {
                    '০': 0, '১': 1, '২': 2, '৩': 3, '৪': 4, '৫': 5, '৬': 6, '৭': 7, '৮': 8, '৯': 9,
                    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
                  };
                  
                  let numericVal = '';
                  for (const char of raw) {
                    if (digitMap[char] !== undefined) numericVal += digitMap[char];
                  }
                  
                  const val = parseInt(numericVal);
                  if (isNaN(val)) setMaxSubjects(0);
                  else setMaxSubjects(val);
                }} />
            </div>

            {/* Condition 1: Minimum aggregate % */}
            <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">{bn ? 'শর্ত ১: মোট নম্বরের ন্যূনতম শতকরা হার (%)' : 'Condition 1: Min aggregate marks (%)'}</Label>
                <span className="text-[11px] text-muted-foreground font-mono">{minAggregatePercent > 0 ? (bn ? `${toBnDigits(minAggregatePercent)}% প্রয়োজন` : `${minAggregatePercent}% required`) : (bn ? 'কোনো শর্ত নেই' : 'No requirement')}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {bn 
                  ? '০ দিলে যে কোনো মোট নম্বরে বিবেচনা পাবে। যেমন: ৫০ দিলে ছাত্রের সব বিষয়ের মোট নম্বর কমপক্ষে ৫০% হতে হবে (দুর্বল ছাত্ররা অযথা ছাড় পাবে না)।' 
                  : '0 = no limit. E.g. 50 requires student to have at least 50% overall marks to qualify for grace pass.'}
              </p>
              <Input
                type="text"
                disabled={!enabled}
                value={bn ? (minAggregatePercent === 0 ? '' : toBnDigits(minAggregatePercent)) : (minAggregatePercent || '')}
                placeholder={bn ? '০ (নিষ্ক্রিয়)' : '0 (disabled)'}
                data-bijoy={bn}
                onChange={(e) => {
                  const num = parseInt(toEnDigits(e.target.value).replace(/[^0-9]/g, ''), 10);
                  setMinAggregatePercent(isNaN(num) ? 0 : Math.min(100, num));
                }}
              />
            </div>

            {/* Condition 2: Max mark deficit */}
            <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">{bn ? 'শর্ত ২: ফেল বিষয়ে সর্বোচ্চ নম্বরের ঘাটতি' : 'Condition 2: Max mark deficit below pass'}</Label>
                <span className="text-[11px] text-muted-foreground font-mono">{maxMarkDeficit > 0 ? (bn ? `সর্বোচ্চ ${toBnDigits(maxMarkDeficit)} নম্বর কম` : `Max ${maxMarkDeficit} marks short`) : (bn ? 'কোনো সীমা নেই' : 'No limit')}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {bn 
                  ? '০ দিলে যে কোনো ফেল নম্বরে ছাড় পাবে। যেমন: ৫ দিলে পাস মার্কের চেয়ে সর্বোচ্চ ৫ নম্বর কম পর্যন্ত (যেমন পাস ৩৩ হলে ২৮-৩২ পেলে) বিবেচনা কার্যকর হবে।' 
                  : '0 = any failed mark qualifies. E.g. 5 means subject mark cannot be more than 5 marks below pass mark.'}
              </p>
              <Input
                type="text"
                disabled={!enabled}
                value={bn ? (maxMarkDeficit === 0 ? '' : toBnDigits(maxMarkDeficit)) : (maxMarkDeficit || '')}
                placeholder={bn ? '০ (নিষ্ক্রিয়)' : '0 (disabled)'}
                data-bijoy={bn}
                onChange={(e) => {
                  const num = parseInt(toEnDigits(e.target.value).replace(/[^0-9]/g, ''), 10);
                  setMaxMarkDeficit(isNaN(num) ? 0 : Math.min(100, num));
                }}
              />
            </div>

            {/* Consideration pass grade */}
            <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
              <Label className="text-xs font-semibold">{bn ? 'বিবেচনায় পাস প্রাপ্ত ছাত্রের চূড়ান্ত গ্রেড' : 'Grade awarded for consideration pass'}</Label>
              <Input
                type="text"
                disabled={!enabled}
                value={grade}
                placeholder="D"
                className="w-24 uppercase font-bold"
                onChange={(e) => setGrade(e.target.value.trim().toUpperCase() || 'D')}
              />
              <p className="text-[11px] text-muted-foreground">
                {bn ? 'ডিফল্ট: D (মর্যাদা: "মাকবুল (বিবেচনায়)")' : 'Default: D (Title: "Maqbul (Considered)")'}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/30">
              <Label className="text-sm">{bn ? 'শুধু নির্বাচিত ক্লাসে প্রযোজ্য' : 'Apply only to selected classes'}</Label>
              <Switch checked={applyTo === 'selected'} disabled={!enabled}
                onCheckedChange={(v) => setApplyTo(v ? 'selected' : 'all')} />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{bn ? 'ক্লাস অনুযায়ী বিবেচনা (কত বিষয়ে ফেল গ্রহণযোগ্য)' : 'Per-class consideration (allowed failed subjects)'}</Label>
              <p className="text-[11px] text-muted-foreground">
                {bn ? 'ক্লাসে টিক দিলে ওই ক্লাসে বিবেচনা পাস চালু হবে, পাশের ঘরে কত বিষয় তা লিখুন।' : 'Tick a class to enable consideration for it, then set how many subjects.'}
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" disabled={!enabled}
                  onClick={() => setClassRules(Object.fromEntries(classes.map((c: any) => [c.id, Math.max(1, Number(maxSubjects) || 1)])))}>
                  {bn ? 'সব নির্বাচন' : 'Select all'}
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={!enabled}
                  onClick={() => setClassRules({})}>
                  {bn ? 'সব বাতিল' : 'Clear all'}
                </Button>
              </div>
              <div className="rounded-xl border divide-y max-h-64 overflow-y-auto">
                {classes.map((c: any) => {
                  const checked = classRules[c.id] !== undefined;
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <label className="flex items-center gap-2 min-w-0 cursor-pointer">
                        <Checkbox
                          checked={checked}
                          disabled={!enabled}
                          onCheckedChange={(v) => setClassRules(prev => {
                            const next = { ...prev };
                            if (v) next[c.id] = Math.max(1, Number(maxSubjects) || 1);
                            else delete next[c.id];
                            return next;
                          })}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm truncate">{bn ? (c.name_bn || c.name) : (c.name || c.name_bn)}</span>
                          <span className="block text-[11px] text-muted-foreground truncate">
                            {bn ? (c.divisions?.name_bn || c.divisions?.name) : (c.divisions?.name || c.divisions?.name_bn)}
                          </span>
                        </span>
                      </label>
                      <Input type="text" className="w-20 h-8 text-center"
                        disabled={!enabled || !checked}
                        value={bn ? (classRules[c.id] === 0 ? '' : (classRules[c.id]?.toString().replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]) || '')) : (classRules[c.id] || '')}
                        placeholder={bn ? '০' : '0'}
                        data-bijoy={bn}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (!bn) {
                            const val = parseInt(raw);
                            if (isNaN(val)) setClassRules(prev => ({ ...prev, [c.id]: 0 }));
                            else setClassRules(prev => ({ ...prev, [c.id]: val }));
                            return;
                          }

                          const digitMap: Record<string, number> = {
                            '০': 0, '১': 1, '২': 2, '৩': 3, '৪': 4, '৫': 5, '৬': 6, '৭': 7, '৮': 8, '৯': 9,
                            '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
                          };
                          
                          let numericVal = '';
                          for (const char of raw) {
                            if (digitMap[char] !== undefined) numericVal += digitMap[char];
                          }
                          
                          const val = parseInt(numericVal);
                          if (isNaN(val)) setClassRules(prev => ({ ...prev, [c.id]: 0 }));
                          else setClassRules(prev => ({ ...prev, [c.id]: val }));
                        }} />
                    </div>
                  );
                })}
                {classes.length === 0 && (
                  <p className="px-3 py-4 text-xs text-muted-foreground text-center">{bn ? 'কোনো ক্লাস নেই' : 'No classes'}</p>
                )}
              </div>

            </div>

            <p className="text-xs text-muted-foreground leading-relaxed rounded-xl border p-3 bg-muted/20">
              {bn
                ? 'অই বিষয়ে ফেল বহাল থাকবে, কিন্তু সব বিষয়ের মোট নম্বর অনুযায়ী সামগ্রিক গ্রেড ও মর্যাদা নির্ধারিত হবে।'
                : 'The subject stays failed, but the overall grade and title are computed from the total marks of all subjects.'}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
          <Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>
            {saveM.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {bn ? 'সংরক্ষণ' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GracePassSettings;
