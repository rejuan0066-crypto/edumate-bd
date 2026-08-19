import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GradeScale {
  grade: string;
  min: number;
  max: number;
  gpa: string;
  color: string;
  title?: string;
  title_bn?: string;
}

const DEFAULT_SCALES: GradeScale[] = [
  { grade: 'A+', min: 80, max: 100, gpa: '5.00', color: 'emerald', title: 'Mumtaz', title_bn: 'মুমতাজ' },
  { grade: 'A', min: 70, max: 79, gpa: '4.00', color: 'emerald', title: 'Jayyid Jiddan', title_bn: 'জায়্যিদ জিদ্দান' },
  { grade: 'A-', min: 60, max: 69, gpa: '3.50', color: 'sky', title: 'Jayyid', title_bn: 'জায়্যিদ' },
  { grade: 'B', min: 50, max: 59, gpa: '3.00', color: 'sky', title: 'Maqbul', title_bn: 'মাকবুল' },
  { grade: 'C', min: 40, max: 49, gpa: '2.00', color: 'amber', title: 'Maqbul', title_bn: 'মাকবুল' },
  { grade: 'D', min: 33, max: 39, gpa: '1.00', color: 'orange', title: 'Zayeef', title_bn: 'যয়ীফ' },
  { grade: 'F', min: 0, max: 32, gpa: '0.00', color: 'destructive', title: 'Rasib', title_bn: 'রাসিব' },
];

const colorMap: Record<string, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
  sky: 'text-sky-600 dark:text-sky-400 bg-sky-500/10',
  amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  orange: 'text-orange-600 dark:text-orange-400 bg-orange-500/10',
  destructive: 'text-destructive bg-destructive/10',
};

export const useGradingSystem = () => {
  const { data: scales = DEFAULT_SCALES } = useQuery({
    queryKey: ['grading-scales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('validation_rules')
        .select('config, sort_order')
        .eq('module', 'result')
        .eq('field_name', 'grading_scale')
        .eq('is_active', true)
        .order('sort_order');
      if (error || !data?.length) return DEFAULT_SCALES;
      return data.map((r: any) => {
        const c = typeof r.config === 'object' ? r.config : {};
        return { grade: c.grade, min: c.min, max: c.max, gpa: c.gpa, color: c.color, title: c.title, title_bn: c.title_bn } as GradeScale;
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: marksConfig } = useQuery({
    queryKey: ['marks-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('validation_rules')
        .select('config')
        .eq('module', 'result')
        .eq('field_name', 'marks')
        .eq('is_active', true)
        .maybeSingle();
      if (error || !data) return { min: 0, max: 100 };
      const c = typeof data.config === 'object' ? data.config : {};
      return { min: (c as any).min ?? 0, max: (c as any).max ?? 100 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: passMarkConfig } = useQuery({
    queryKey: ['pass-mark-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('validation_rules')
        .select('config')
        .eq('module', 'result')
        .eq('field_name', 'pass_mark')
        .eq('is_active', true)
        .maybeSingle();
      if (error || !data) return 33;
      const c = typeof data.config === 'object' ? data.config : {};
      return (c as any).min ?? 33;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: gracePass } = useQuery({
    queryKey: ['grace-pass-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('validation_rules')
        .select('config, is_active')
        .eq('module', 'result')
        .eq('field_name', 'grace_pass')
        .maybeSingle();
      if (error || !data) return { enabled: false, max_subjects: 1, grade: 'C', apply_to: 'all' as const, class_rules: {} as Record<string, number> };
      const c: any = typeof data.config === 'object' && data.config ? data.config : {};
      return {
        enabled: !!data.is_active && c.enabled !== false,
        max_subjects: c.max_subjects ?? 1,
        grade: c.grade || 'C',
        apply_to: (c.apply_to === 'selected' ? 'selected' : 'all') as 'all' | 'selected',
        class_rules: (c.class_rules && typeof c.class_rules === 'object' ? c.class_rules : {}) as Record<string, number>,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const getGrade = (avg: number) => {
    for (const s of scales) {
      if (avg >= s.min && avg <= s.max) {
        return { grade: s.grade, gpa: s.gpa, color: colorMap[s.color] || colorMap.destructive, title: s.title, title_bn: s.title_bn };
      }
    }
    const last = scales[scales.length - 1] || DEFAULT_SCALES[DEFAULT_SCALES.length - 1];
    return { grade: last.grade, gpa: last.gpa, color: colorMap[last.color] || colorMap.destructive, title: last.title, title_bn: last.title_bn };
  };

  /** Check if any single subject is below pass mark — if so, overall grade is F
   *  unless consideration-pass is enabled and failed subjects are within the allowed limit. */
  /** Resolve the allowed number of failed subjects for a class.
   *  0 (or undefined in "selected" mode) means consideration pass is off for that class. */
  const getGraceLimit = (classId?: string | null) => {
    if (!gracePass?.enabled) return 0;
    const rules = gracePass.class_rules || {};
    if (classId && rules[classId] !== undefined) return Number(rules[classId]) || 0;
    if (gracePass.apply_to === 'selected') return 0;
    return Number(gracePass.max_subjects) || 0;
  };

  const getOverallGrade = (subjectMarks: number[], classId?: string | null) => {
    const pm = passMarkConfig ?? 33;
    const failedCount = subjectMarks.filter(m => m < pm).length;
    const graceLimit = getGraceLimit(classId);
    const graceOn = graceLimit > 0;
    const graced = graceOn && failedCount > 0 && failedCount <= graceLimit;

    if (failedCount > 0 && subjectMarks.length > 0 && !graced) {
      const failScale = scales.find(s => s.grade === 'F') || DEFAULT_SCALES[DEFAULT_SCALES.length - 1];
      return { grade: 'F', gpa: '0.00', color: colorMap[failScale.color] || colorMap.destructive, hasFail: true, graced: false, failedCount, title: failScale.title, title_bn: failScale.title_bn };
    }

    const avg = subjectMarks.length > 0 ? subjectMarks.reduce((a, b) => a + b, 0) / subjectMarks.length : 0;

    // Graced: subject-level fail stays, overall result comes from the average
    // of all subjects, but is capped at the configured grace grade (default C).
    if (graced) {
      const byAvg = getGrade(avg);
      const capGrade = gracePass?.grade || 'C';
      const capScale = scales.find(s => s.grade === capGrade);
      if (capScale) {
        const avgScale = scales.find(s => s.grade === byAvg.grade);
        const isBetter = avgScale ? avgScale.min > capScale.min : false;
        if (isBetter) {
          return {
            grade: capScale.grade,
            gpa: capScale.gpa,
            color: colorMap[capScale.color] || colorMap.destructive,
            title: capScale.title,
            title_bn: capScale.title_bn,
            hasFail: false,
            graced: true,
            failedCount,
          };
        }
      }
      return { ...byAvg, hasFail: false, graced: true, failedCount };
    }


    return { ...getGrade(avg), hasFail: false, graced: false, failedCount };
  };

  return {
    scales,
    getGrade,
    getOverallGrade,
    getGraceLimit,
    gracePass: gracePass ?? { enabled: false, max_subjects: 1, grade: 'C', apply_to: 'all' as const, class_rules: {} as Record<string, number> },
    maxMarks: marksConfig?.max ?? 100,
    minMarks: marksConfig?.min ?? 0,
    passMark: passMarkConfig ?? 33,
  };
};

