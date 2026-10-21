/**
 * Pure grading calculations shared by the grading hook, marks entry table and marksheets.
 * Kept free of React/Supabase so the rules can be unit-tested.
 */

export interface GradeScale {
  grade: string;
  min: number;
  max: number;
  gpa: string;
  color: string;
  title?: string;
  title_bn?: string;
}

/**
 * Grading scale bands. `min`/`max` are percentages of the TOTAL obtainable marks
 * (total marks ÷ total full marks × 100) — grading never uses an average.
 */
export const DEFAULT_SCALES: GradeScale[] = [
  { grade: 'A+', min: 80, max: 100, gpa: '5.00', color: 'emerald', title: 'Mumtaz', title_bn: 'মুমতাজ' },
  { grade: 'A', min: 70, max: 79, gpa: '4.00', color: 'emerald', title: 'Jayyid Jiddan', title_bn: 'জায়্যিদ জিদ্দান' },
  { grade: 'A-', min: 60, max: 69, gpa: '3.50', color: 'sky', title: 'Jayyid', title_bn: 'জায়্যিদ' },
  { grade: 'B', min: 50, max: 59, gpa: '3.00', color: 'sky', title: 'Maqbul', title_bn: 'মাকবুল' },
  { grade: 'C', min: 40, max: 49, gpa: '2.00', color: 'amber', title: 'Maqbul', title_bn: 'মাকবুল' },
  { grade: 'D', min: 33, max: 39, gpa: '1.00', color: 'orange', title: 'Zayeef', title_bn: 'যয়ীফ' },
  { grade: 'F', min: 0, max: 32, gpa: '0.00', color: 'destructive', title: 'Rasib', title_bn: 'রাসিব' },
];

export const colorMap: Record<string, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
  sky: 'text-sky-600 dark:text-sky-400 bg-sky-500/10',
  amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  orange: 'text-orange-600 dark:text-orange-400 bg-orange-500/10',
  destructive: 'text-destructive bg-destructive/10',
};

export interface GradeResult {
  grade: string;
  gpa: string;
  color: string;
  title?: string;
  title_bn?: string;
}

export interface OverallGradeResult extends GradeResult {
  hasFail: boolean;
  graced: boolean;
  failedCount: number;
}

/** Default full marks for a single subject when nothing is configured. */
export const DEFAULT_FULL_MARKS = 100;

/**
 * Grade from a total score against the total obtainable marks.
 * Scale bands are expressed as a percentage of the total obtainable marks,
 * so grading depends on the TOTAL only — no average is calculated anywhere.
 */
export const gradeFromTotal = (
  total: number,
  fullTotal: number,
  scales: GradeScale[] = DEFAULT_SCALES,
): GradeResult => {
  const list = scales.length ? [...scales].sort((a, b) => b.min - a.min) : DEFAULT_SCALES;
  // Scale bands are whole percentage points (for example 70–79). Flooring keeps
  // every possible result inside exactly one configured band: 79.99% is still 79%.
  const score = fullTotal > 0 ? Math.floor((total / fullTotal) * 100) : 0;
  for (const s of list) {
    if (score >= s.min && score <= s.max) {
      return { grade: s.grade, gpa: s.gpa, color: colorMap[s.color] || colorMap.destructive, title: s.title, title_bn: s.title_bn };
    }
  }
  const last = list[list.length - 1];
  return { grade: last.grade, gpa: last.gpa, color: colorMap[last.color] || colorMap.destructive, title: last.title, title_bn: last.title_bn };
};

/** Grade a single subject mark against that subject's full marks. */
export const gradeFromMark = (mark: number, fullMarks: number = DEFAULT_FULL_MARKS, scales: GradeScale[] = DEFAULT_SCALES): GradeResult =>
  gradeFromTotal(mark, fullMarks, scales);

/** Only marks that were actually entered take part in grading — blanks must never count as 0. */
export const enteredMarks = (rawMarks: unknown[]): number[] =>
  rawMarks
    .filter((m) => m !== undefined && m !== null && m !== '' && !Number.isNaN(Number(m)))
    .map((m) => Number(m));

export interface OverallGradeOptions {
  scales?: GradeScale[];
  passMark?: number;
  /** Full marks obtainable in a single subject (used to size the total-based scale). */
  fullMarks?: number;
  /** Number of failed subjects allowed as a consideration pass (0 = off). */
  graceLimit?: number;
  /** Target grade for consideration pass (e.g. 'D' or 'C', defaults to 'D'). */
  graceGrade?: string;
  /** Minimum aggregate percentage required across all subjects to qualify for consideration pass (0 = off). */
  minAggregatePercent?: number;
  /** Maximum mark shortfall allowed below pass mark in any failed subject (0 = off). */
  maxMarkDeficit?: number;
  /** When true (default: true), blank subject cells are treated as failed/absent */
  failOnBlank?: boolean;
  /** Number of blank subjects to include as failures */
  blankFailCount?: number;
  /** When true (default: true), mark 0 or blank strictly disallows automatic grace pass */
  disallowGraceOnZeroOrBlank?: boolean;
  /** Indicator whether there was any blank or 0 mark */
  hasBlankOrZero?: boolean;
  /** Manual override for student status: 'fail' | 'grace_pass' | 'auto' */
  override?: 'fail' | 'grace_pass' | 'auto';
}


/**
 * Final grade for a student — based on the TOTAL marks obtained against the
 * total obtainable marks. No average is calculated.
 * - Entered marks below the pass mark are failures; blanks are excluded by the caller.
 * - Within the consideration limit and meeting all deficit/aggregate criteria → consideration pass ("মাকবুল (বিবেচনায়)").
 * - A student who passed every subject can never be F, even if the total lands in the F band.
 */
export const overallGrade = (subjectMarks: number[], options: OverallGradeOptions = {}): OverallGradeResult => {
  const scales = options.scales?.length ? options.scales : DEFAULT_SCALES;
  const pm = options.passMark ?? 33;
  const graceLimit = options.graceLimit ?? 0;
  const fullMarks = options.fullMarks ?? DEFAULT_FULL_MARKS;
  const minAggregatePercent = options.minAggregatePercent ?? 0;
  const maxMarkDeficit = options.maxMarkDeficit ?? 0;
  const blankFailCount = options.blankFailCount ?? 0;

  // Check manual override first
  if (options.override === 'fail') {
    const failScale = scales.find((s) => s.grade === 'F') || DEFAULT_SCALES[DEFAULT_SCALES.length - 1];
    return {
      grade: failScale.grade,
      gpa: failScale.gpa,
      color: colorMap[failScale.color] || colorMap.destructive,
      title: failScale.title,
      title_bn: failScale.title_bn,
      hasFail: true,
      graced: false,
      failedCount: Math.max(1, subjectMarks.filter((m) => Number(m) < pm).length + blankFailCount),
    };
  }

  if (options.override === 'grace_pass') {
    const dScale = scales.find((s) => s.grade === 'D') || DEFAULT_SCALES.find((s) => s.grade === 'D');
    return {
      grade: 'D',
      gpa: dScale?.gpa || '1.00',
      color: colorMap[dScale?.color || 'orange'] || colorMap.orange,
      title: 'Maqbul (Considered)',
      title_bn: 'মাকবুল (বিবেচনায়)',
      hasFail: false,
      graced: true,
      failedCount: Math.max(1, subjectMarks.filter((m) => Number(m) < pm).length + blankFailCount),
    };
  }

  const failedSubjects = subjectMarks.filter((m) => Number(m) < pm);
  const failedCount = failedSubjects.length + blankFailCount;

  // Strict rule: If any subject has 0 OR was blank, consideration/grace pass is DISALLOWED
  const disallowZeroOrBlank = options.disallowGraceOnZeroOrBlank ?? true;
  const hasZero = subjectMarks.some((m) => Number(m) === 0);
  const hasBlank = blankFailCount > 0;
  const disallowGrace = disallowZeroOrBlank && (hasZero || hasBlank || !!options.hasBlankOrZero);

  let graced = !disallowGrace && graceLimit > 0 && failedCount > 0 && failedCount <= graceLimit;

  if (graced && maxMarkDeficit > 0) {
    const hasExcessiveDeficit = failedSubjects.some((m) => (pm - Number(m)) > maxMarkDeficit);
    if (hasExcessiveDeficit) {
      graced = false;
    }
  }

  if (graced && minAggregatePercent > 0) {
    const total = subjectMarks.reduce((a, b) => a + b, 0);
    const fullTotal = (subjectMarks.length + blankFailCount) * fullMarks;
    const aggregatePct = fullTotal > 0 ? (total / fullTotal) * 100 : 0;
    if (aggregatePct < minAggregatePercent) {
      graced = false;
    }
  }

  if (failedCount > 0 && (subjectMarks.length > 0 || blankFailCount > 0) && !graced) {
    const failScale = scales.find((s) => s.grade === 'F') || DEFAULT_SCALES[DEFAULT_SCALES.length - 1];
    return {
      grade: failScale.grade,
      gpa: failScale.gpa,
      color: colorMap[failScale.color] || colorMap.destructive,
      title: failScale.title,
      title_bn: failScale.title_bn,
      hasFail: true,
      graced: false,
      failedCount,
    };
  }

  if (graced) {
    const dScale = scales.find((s) => s.grade === 'D') || DEFAULT_SCALES.find((s) => s.grade === 'D');
    return {
      grade: 'D',
      gpa: dScale?.gpa || '1.00',
      color: colorMap[dScale?.color || 'orange'] || colorMap.orange,
      title: 'Maqbul (Considered)',
      title_bn: 'মাকবুল (বিবেচনায়)',
      hasFail: false,
      graced: true,
      failedCount,
    };
  }

  const total = subjectMarks.reduce((a, b) => a + b, 0);
  const fullTotal = (subjectMarks.length + blankFailCount) * fullMarks;
  const byTotal = gradeFromTotal(total, fullTotal, scales);

  if (byTotal.grade === 'F' && subjectMarks.length > 0) {
    const passScales = scales.filter((s) => s.grade !== 'F');
    const lowestPass = passScales.length
      ? passScales.reduce((low, s) => (s.min < low.min ? s : low))
      : DEFAULT_SCALES[DEFAULT_SCALES.length - 2];
    return {
      grade: lowestPass.grade,
      gpa: lowestPass.gpa,
      color: colorMap[lowestPass.color] || colorMap.orange,
      title: lowestPass.title,
      title_bn: lowestPass.title_bn,
      hasFail: false,
      graced: false,
      failedCount: 0,
    };
  }

  return { ...byTotal, hasFail: false, graced: false, failedCount };
};


export interface StudentStats {
  id: string;
  total: number;
  hasEnteredAnyMark: boolean;
  failed: boolean;
  overall: OverallGradeResult | null;
}

/** Total / final grade for one student from their raw (possibly blank) subject marks. */
export const studentStats = (id: string, rawMarks: unknown[], options: OverallGradeOptions = {}): StudentStats => {
  const graded = enteredMarks(rawMarks);
  const hasEnteredAnyMark = graded.length > 0;
  const total = graded.reduce((a, b) => a + b, 0);

  if (!hasEnteredAnyMark) {
    return { id, total: 0, hasEnteredAnyMark: false, failed: false, overall: null };
  }

  const failOnBlank = options.failOnBlank ?? true;
  const blankCount = rawMarks.filter((m) => m === undefined || m === null || m === '').length;
  const hasBlank = blankCount > 0;
  const hasZero = graded.some((m) => Number(m) === 0);

  const overall = overallGrade(graded, {
    ...options,
    blankFailCount: failOnBlank ? blankCount : 0,
    hasBlankOrZero: hasBlank || hasZero,
  });

  const failed = overall ? (overall.graced ? false : overall.hasFail) : false;
  return { id, total, hasEnteredAnyMark, failed, overall };
};

/**
 * Merit ranking: only students with entered marks are ranked, failed students never
 * receive a merit position, and higher totals rank first.
 *
 * Three tiers are used so that a grace-passed (consideration) student can never
 * outrank a student who passed every subject on their own marks:
 *   tier 0 — regular pass (all subjects passed)
 *   tier 1 — grace pass ("মাকবুল (বিবেচনায়)")
 *   tier 2 — failed (never ranked)
 * Within the same tier, higher total ranks first.
 */
const meritTier = (s: StudentStats): number => {
  if (s.failed) return 2;
  if (s.overall?.graced) return 1;
  return 0;
};

export const rankStudents = (stats: StudentStats[]): Map<string, number> => {
  const ordered = stats
    .filter((s) => s.hasEnteredAnyMark)
    .sort((a, b) => {
      const tierDiff = meritTier(a) - meritTier(b);
      if (tierDiff !== 0) return tierDiff;
      return b.total - a.total;
    });

  const map = new Map<string, number>();
  let currentRank = 1;
  ordered.forEach((s, i) => {
    if (s.failed) return;
    if (i > 0) {
      const prev = ordered[i - 1];
      if (meritTier(prev) === meritTier(s) && prev.total === s.total) {
        map.set(s.id, map.get(prev.id) || currentRank);
        return;
      }
    }
    currentRank = i + 1;
    map.set(s.id, currentRank);
  });
  return map;
};

export interface GracePassConfig {
  enabled: boolean;
  max_subjects: number;
  grade?: string;
  apply_to: 'all' | 'selected';
  class_rules: Record<string, number>;
  min_aggregate_percent?: number;
  max_mark_deficit?: number;
}

/** Allowed number of failed subjects for a class (0 = consideration pass off). */
export const resolveGraceLimit = (config: GracePassConfig | null | undefined, classId?: string | null): number => {
  if (!config?.enabled) return 0;
  const rules = config.class_rules || {};
  if (classId && rules[classId] !== undefined) return Number(rules[classId]) || 0;
  if (config.apply_to === 'selected') return 0;
  return Number(config.max_subjects) || 0;
};
