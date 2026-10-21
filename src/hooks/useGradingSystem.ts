import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_SCALES,
  gradeFromMark,
  overallGrade,
  resolveGraceLimit,
  type GradeScale,
  type OverallGradeOptions,
} from '@/lib/grading';

export type { GradeScale, OverallGradeOptions } from '@/lib/grading';
export { DEFAULT_SCALES } from '@/lib/grading';


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
      if (error || !data) return { enabled: false, max_subjects: 1, grade: 'D', apply_to: 'all' as const, class_rules: {} as Record<string, number>, min_aggregate_percent: 0, max_mark_deficit: 0 };
      const c: any = typeof data.config === 'object' && data.config ? data.config : {};
      return {
        enabled: !!data.is_active && c.enabled !== false,
        max_subjects: c.max_subjects ?? 1,
        grade: (c.grade && c.grade !== "C") ? c.grade : "D",
        apply_to: (c.apply_to === 'selected' ? 'selected' : 'all') as 'all' | 'selected',
        class_rules: (c.class_rules && typeof c.class_rules === 'object' ? c.class_rules : {}) as Record<string, number>,
        min_aggregate_percent: Number(c.min_aggregate_percent) || 0,
        max_mark_deficit: Number(c.max_mark_deficit) || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  /** Grade for a single subject mark, measured against that subject's full marks. */
  const getGrade = (mark: number) => gradeFromMark(mark, marksConfig?.max ?? 100, scales);

  /** Check if any single subject is below pass mark — if so, overall grade is F
   *  unless consideration-pass is enabled and failed subjects are within the allowed limit. */
  /** Resolve the allowed number of failed subjects for a class.
   *  0 (or undefined in "selected" mode) means consideration pass is off for that class. */
  const getGraceLimit = (classId?: string | null) => resolveGraceLimit(gracePass, classId);

  const getOverallGrade = (subjectMarks: number[], classId?: string | null, extraOptions?: Partial<OverallGradeOptions>) =>
    overallGrade(subjectMarks, {
      scales,
      passMark: passMarkConfig ?? 33,
      fullMarks: marksConfig?.max ?? 100,
      graceLimit: getGraceLimit(classId),
      graceGrade: gracePass?.grade,
      minAggregatePercent: gracePass?.min_aggregate_percent,
      maxMarkDeficit: gracePass?.max_mark_deficit,
      ...extraOptions,
    });


  return {
    scales,
    getGrade,
    getOverallGrade,
    getGraceLimit,
    gracePass: gracePass ?? { enabled: false, max_subjects: 1, grade: 'D', apply_to: 'all' as const, class_rules: {} as Record<string, number>, min_aggregate_percent: 0, max_mark_deficit: 0 },
    maxMarks: marksConfig?.max ?? 100,
    minMarks: marksConfig?.min ?? 0,
    passMark: passMarkConfig ?? 33,
  };
};

