import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGradingSystem } from '@/hooks/useGradingSystem';
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
  const { scales } = useGradingSystem();

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
  const [grade, setGrade] = useState('C');

  useEffect(() => {
    const c: any = (row?.config && typeof row.config === 'object') ? row.config : {};
    setEnabled(!!row?.is_active && c.enabled !== false);
    setMaxSubjects(c.max_subjects ?? 1);
    setGrade(c.grade || 'C');
  }, [row]);

  const saveM = useMutation({
    mutationFn: async () => {
      const payload = {
        module: 'result',
        field_name: 'grace_pass',
        name: 'Grace Pass',
        name_bn: 'গ্রেস পাস',
        rule_level: 'warning',
        rule_type: 'custom',
        is_active: enabled,
        config: { enabled, max_subjects: Math.max(1, Number(maxSubjects) || 1), grade } as any,
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
      <DialogContent className="max-w-md rounded-[28px]">
        <DialogHeader>
          <DialogTitle>{bn ? 'গ্রেস পাস সেটিং' : 'Grace Pass Settings'}</DialogTitle>
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
              <Label className="text-sm">{bn ? 'গ্রেস পাস চালু' : 'Enable grace pass'}</Label>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{bn ? 'সর্বোচ্চ কত বিষয়ে ফেল গ্রহণযোগ্য' : 'Max failed subjects allowed'}</Label>
              <Input type="number" min={1} max={5} value={maxSubjects} disabled={!enabled}
                onChange={(e) => setMaxSubjects(parseInt(e.target.value) || 1)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{bn ? 'গ্রেস পাসে প্রদত্ত গ্রেড' : 'Grade awarded on grace pass'}</Label>
              <Select value={grade} onValueChange={setGrade} disabled={!enabled}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {scales.filter(s => s.grade && s.grade !== 'F').map(s => (
                    <SelectItem key={s.grade} value={s.grade}>
                      {s.grade} — {bn ? (s.title_bn || '') : (s.title || '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
