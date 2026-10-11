import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SCALES,
  enteredMarks,
  gradeFromTotal,
  gradeFromMark,
  overallGrade,
  resolveGraceLimit,
  studentStats,
  rankStudents,
} from '@/lib/grading';

const PASS = 33;

describe('enteredMarks', () => {
  it('keeps only real entered marks and never turns blanks into 0', () => {
    expect(enteredMarks([50, null, undefined, '', 40, NaN])).toEqual([50, 40]);
  });

  it('keeps an entered 0', () => {
    expect(enteredMarks([0, 60])).toEqual([0, 60]);
  });
});

describe('gradeFromTotal — total-based bands', () => {
  it.each([
    [285, 300, 'A+'],
    [225, 300, 'A'],
    [195, 300, 'A-'],
    [165, 300, 'B'],
    [135, 300, 'C'],
    [105, 300, 'D'],
    [30, 300, 'F'],
  ])('total %i out of %i maps to grade %s', (total, full, grade) => {
    expect(gradeFromTotal(total, full).grade).toBe(grade);
  });

  it('grades a single subject mark against its full marks', () => {
    expect(gradeFromMark(85, 100).grade).toBe('A+');
    expect(gradeFromMark(42, 50).grade).toBe('A+'); // 84%
  });

  it('returns the lowest band when there are no obtainable marks', () => {
    expect(gradeFromTotal(0, 0).grade).toBe('F');
  });

  it('floors fractional percentages so every score remains in a whole-number band', () => {
    expect(gradeFromTotal(79.99, 100).grade).toBe('A');
    expect(gradeFromTotal(32.99, 100).grade).toBe('F');
  });
});

describe('overallGrade — grading uses total marks, not average', () => {
  it('scales bands to the configured full marks per subject', () => {
    // 3 subjects out of 50 each = 150 full; 120 total = 80% → A+
    expect(overallGrade([40, 40, 40], { passMark: 15, fullMarks: 50 }).grade).toBe('A+');
  });
});


describe('overallGrade — students who passed every subject', () => {
  it('never returns F when all subjects are at or above the pass mark', () => {
    const r = overallGrade([33, 34, 35], { passMark: PASS });
    expect(r.grade).not.toBe('F');
    expect(r.hasFail).toBe(false);
    expect(r.failedCount).toBe(0);
  });

  it('falls back to the lowest passing grade when the average lands in the F band', () => {
    // Pass mark 20: every subject passes but the average (25) sits inside the F band (0-32).
    const r = overallGrade([25, 25, 25], { passMark: 20 });
    expect(r.grade).toBe('D');
    expect(r.title_bn).toBe('যয়ীফ');
    expect(r.hasFail).toBe(false);
  });

  it('grades a strong student correctly with title and gpa', () => {
    const r = overallGrade([90, 85, 95], { passMark: PASS });
    expect(r).toMatchObject({ grade: 'A+', gpa: '5.00', hasFail: false, title_bn: 'মুমতাজ' });
  });

  it('ignores blank subjects entirely (via studentStats)', () => {
    const stats = studentStats('s1', [80, null, '', undefined, 90], { passMark: PASS });
    expect(stats.total).toBe(170);
    
    expect(stats.overall?.grade).toBe('A+');
    expect(stats.failed).toBe(false);
  });
});

describe('overallGrade — failures and consideration pass', () => {
  it('fails a student with a subject below the pass mark when consideration is off', () => {
    const r = overallGrade([90, 20, 80], { passMark: PASS, graceLimit: 0 });
    expect(r.grade).toBe('F');
    expect(r.hasFail).toBe(true);
    expect(r.failedCount).toBe(1);
  });

  it('treats an entered 0 as a failed subject', () => {
    const r = overallGrade([0, 80, 80], { passMark: PASS });
    expect(r.hasFail).toBe(true);
  });

  it('awards consideration pass within the allowed limit', () => {
    const r = overallGrade([90, 20, 80], { passMark: PASS, graceLimit: 1 });
    expect(r).toMatchObject({ grade: 'D', gpa: '1.00', graced: true, hasFail: false, title_bn: 'যয়ীফ (বিবেচনায়)' });
  });

  it('denies consideration pass when total aggregate percent falls below minAggregatePercent', () => {
    const rFail = overallGrade([50, 50, 30], { passMark: PASS, graceLimit: 1, minAggregatePercent: 50 });
    expect(rFail.graced).toBe(false);
    expect(rFail.grade).toBe('F');

    const rPass = overallGrade([80, 80, 30], { passMark: PASS, graceLimit: 1, minAggregatePercent: 50 });
    expect(rPass.graced).toBe(true);
    expect(rPass.grade).toBe('D');
  });

  it('denies consideration pass when mark deficit exceeds maxMarkDeficit', () => {
    const rFail = overallGrade([80, 80, 20], { passMark: PASS, graceLimit: 1, maxMarkDeficit: 5 });
    expect(rFail.graced).toBe(false);
    expect(rFail.grade).toBe('F');

    const rPass = overallGrade([80, 80, 30], { passMark: PASS, graceLimit: 1, maxMarkDeficit: 5 });
    expect(rPass.graced).toBe(true);
    expect(rPass.grade).toBe('D');
  });
});

describe('resolveGraceLimit', () => {
  const base = { enabled: true, max_subjects: 2, apply_to: 'all' as const, class_rules: {} as Record<string, number> };

  it('returns 0 when disabled', () => {
    expect(resolveGraceLimit({ ...base, enabled: false })).toBe(0);
  });

  it('uses the global limit in "all" mode', () => {
    expect(resolveGraceLimit(base, 'class-1')).toBe(2);
  });

  it('uses the per-class rule when present', () => {
    expect(resolveGraceLimit({ ...base, class_rules: { 'class-1': 3 } }, 'class-1')).toBe(3);
  });

  it('returns 0 in "selected" mode for classes without a rule', () => {
    expect(resolveGraceLimit({ ...base, apply_to: 'selected' }, 'class-9')).toBe(0);
  });
});

describe('rankStudents — merit positions', () => {
  const opts = { passMark: PASS, scales: DEFAULT_SCALES };

  it('ranks by total, skips failed students and students without marks', () => {
    const stats = [
      studentStats('a', [80, 80, 80], opts),   // 240 pass
      studentStats('b', [90, 90, 90], opts),   // 270 pass
      studentStats('c', [95, 10, 95], opts),   // failed
      studentStats('d', [null, '', undefined], opts), // no marks
      studentStats('e', [85, 85, 85], opts),   // 255 pass
    ];
    const ranks = rankStudents(stats);
    expect(ranks.get('b')).toBe(1);
    expect(ranks.get('e')).toBe(2);
    expect(ranks.get('a')).toBe(3);
    expect(ranks.has('c')).toBe(false);
    expect(ranks.has('d')).toBe(false);
  });

  it('gives consideration-passed students a merit position', () => {
    const stats = [
      studentStats('x', [90, 90, 90], { ...opts, graceLimit: 1 }),
      studentStats('y', [90, 20, 90], { ...opts, graceLimit: 1 }),
    ];
    const ranks = rankStudents(stats);
    expect(ranks.get('x')).toBe(1);
    expect(ranks.get('y')).toBe(2);
  });

  it('never ranks a grace-passed student above a regular pass, even with a higher total', () => {
    const stats = [
      studentStats('regular1', [70, 70, 70], { ...opts, graceLimit: 1 }), // 210 pass
      studentStats('regular2', [60, 60, 60], { ...opts, graceLimit: 1 }), // 180 pass
      studentStats('gracedHi', [99, 20, 99], { ...opts, graceLimit: 1 }), // 218 grace pass
      studentStats('gracedLo', [50, 30, 50], { ...opts, graceLimit: 1 }), // 130 grace pass
    ];
    const ranks = rankStudents(stats);
    expect(ranks.get('regular1')).toBe(1);
    expect(ranks.get('regular2')).toBe(2);
    expect(ranks.get('gracedHi')).toBe(3); // higher total, but grace tier stays below
    expect(ranks.get('gracedLo')).toBe(4);
  });

  it('shares merit rank when total marks and tier are tied (competition ranking)', () => {
    const stats = [
      studentStats('s1', [90, 90, 90], opts), // 270
      studentStats('s2', [90, 90, 90], opts), // 270 (tied)
      studentStats('s3', [80, 80, 80], opts), // 240
    ];
    const ranks = rankStudents(stats);
    expect(ranks.get('s1')).toBe(1);
    expect(ranks.get('s2')).toBe(1);
    expect(ranks.get('s3')).toBe(3);
  });

  it('does not give a passing student a worse title than deserved', () => {
    const stats = studentStats('z', [60, 62, 64], opts);
    expect(stats.overall?.grade).toBe('A-');
    expect(stats.overall?.title_bn).toBe('জায়্যিদ');
    expect(stats.failed).toBe(false);
  });
});
