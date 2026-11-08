/**
 * Routine Defaults and Auto-fill Helper Utilities
 */

export const DEFAULT_PERIOD_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: '09:00', end: '09:45' },
  2: { start: '09:45', end: '10:30' },
  3: { start: '10:30', end: '11:15' },
  4: { start: '11:15', end: '12:00' },
  5: { start: '13:45', end: '14:25' },
  6: { start: '14:25', end: '15:00' },
  7: { start: '15:00', end: '15:35' },
  8: { start: '15:35', end: '16:10' },
  9: { start: '16:10', end: '16:45' },
  10: { start: '16:45', end: '17:20' },
  11: { start: '17:20', end: '17:55' },
  12: { start: '17:55', end: '18:30' },
};

export const DEFAULT_BREAK_TIME = { start: '13:00', end: '13:45' };

export const DEFAULT_BREAK_LABEL = 'বিরতি';

/**
 * Auto-fills standard madrasa routine for all classes using their registered subjects
 * and default 8 periods with timings.
 */
export async function autoFillMadrasaRoutine({
  supabase,
  sessionId,
  periodCount = 8,
  breakAfter = 4,
  dayOfWeek = 0,
}: {
  supabase: any;
  sessionId?: string | null;
  periodCount?: number;
  breakAfter?: number;
  dayOfWeek?: number;
}) {
  // 1. Fetch classes & subjects
  const { data: classes, error: cErr } = await supabase
    .from('classes')
    .select('id, name, name_bn, division_id')
    .order('name');
  if (cErr) throw cErr;
  if (!classes || classes.length === 0) return { count: 0, classCount: 0 };

  const { data: subjects, error: sErr } = await supabase
    .from('subjects')
    .select('id, name, name_bn, class_id')
    .eq('is_active', true);
  if (sErr) throw sErr;

  const { data: routines } = await supabase.from('class_routines').select('id, class_id');

  // 2. For each class, ensure class_routines entry exists
  const allRoutineIds: string[] = [];
  const routineByClass: Record<string, string> = {};

  for (const cls of classes) {
    let routine = routines?.find((r: any) => r.class_id === cls.id);
    if (!routine) {
      const { data: newR, error: nrErr } = await supabase
        .from('class_routines')
        .insert({
          class_id: cls.id,
          academic_session_id: sessionId || null,
          name: cls.name || 'Routine',
          name_bn: cls.name_bn || 'রুটিন',
          is_active: true,
        })
        .select('id')
        .single();
      if (nrErr) throw nrErr;
      routine = newR;
    }
    routineByClass[cls.id] = routine.id;
    allRoutineIds.push(routine.id);
  }

  // 3. Clear existing routine_periods for these routines for current day
  if (allRoutineIds.length > 0) {
    await supabase.from('routine_periods').delete().in('routine_id', allRoutineIds).eq('day_of_week', dayOfWeek);
  }

  // 4. Build standard periods for each class
  const periodsToInsert: any[] = [];
  for (const cls of classes) {
    const routineId = routineByClass[cls.id];
    if (!routineId) continue;

    // Class specific subjects or common subjects
    const classSubs = (subjects || []).filter((s: any) => s.class_id === cls.id || !s.class_id);

    for (let p = 1; p <= periodCount; p++) {
      const time = DEFAULT_PERIOD_TIMES[p] || { start: '09:00', end: '09:45' };
      const sub = classSubs.length > 0 ? classSubs[(p - 1) % classSubs.length] : null;

      periodsToInsert.push({
        routine_id: routineId,
        day_of_week: dayOfWeek,
        period_number: p,
        subject_id: sub ? sub.id : null,
        start_time: time.start,
        end_time: time.end,
        is_break: false,
        teacher_name: null,
        teacher_name_bn: null,
        room: null,
        break_label_bn: null,
      });
    }
  }

  if (periodsToInsert.length > 0) {
    for (let i = 0; i < periodsToInsert.length; i += 50) {
      const batch = periodsToInsert.slice(i, i + 50);
      const { error: insErr } = await supabase.from('routine_periods').insert(batch);
      if (insErr) throw insErr;
    }
  }

  // Set localStorage defaults
  try {
    localStorage.setItem('routine_period_times', JSON.stringify(DEFAULT_PERIOD_TIMES));
    localStorage.setItem('routine_break_time', JSON.stringify(DEFAULT_BREAK_TIME));
    localStorage.setItem('routine_period_count', String(periodCount));
    localStorage.setItem('routine_break_after', String(breakAfter));
  } catch {}

  return { count: periodsToInsert.length, classCount: classes.length };
}

/**
 * Clears subjects & teachers from all routine cells while keeping period times and routine slots intact.
 */
export async function clearRoutineAssignmentsOnly({
  supabase,
  sessionId,
  periodCount = 8,
  dayOfWeek = 0,
}: {
  supabase: any;
  sessionId?: string | null;
  periodCount?: number;
  dayOfWeek?: number;
}) {
  const { data: routines } = await supabase.from('class_routines').select('id, class_id');
  const routineIds = (routines || []).map((r: any) => r.id);

  if (routineIds.length > 0) {
    const { data: existingPeriods } = await supabase
      .from('routine_periods')
      .select('id')
      .in('routine_id', routineIds)
      .eq('day_of_week', dayOfWeek)
      .limit(1);

    if (existingPeriods && existingPeriods.length > 0) {
      await supabase
        .from('routine_periods')
        .update({
          subject_id: null,
          teacher_name: null,
          teacher_name_bn: null,
          room: null,
          break_label_bn: null,
        })
        .in('routine_id', routineIds)
        .eq('day_of_week', dayOfWeek);
    }
  }
}

/**
 * Completely resets routine: empties all subjects, teachers, and CLEARS ALL PERIOD TIMES!
 */
export async function clearAllRoutineTimesAndAssignments({
  supabase,
  periodCount = 8,
  dayOfWeek = 0,
}: {
  supabase: any;
  periodCount?: number;
  dayOfWeek?: number;
}) {
  const { data: routines } = await supabase.from('class_routines').select('id');
  const routineIds = (routines || []).map((r: any) => r.id);

  if (routineIds.length > 0) {
    await supabase
      .from('routine_periods')
      .update({
        subject_id: null,
        teacher_name: null,
        teacher_name_bn: null,
        start_time: null,
        end_time: null,
        room: null,
        break_label_bn: null,
      })
      .in('routine_id', routineIds);
  }

  // Clear in localStorage
  try {
    const emptyTimes: Record<number, { start: string; end: string }> = {};
    for (let p = 1; p <= periodCount; p++) {
      emptyTimes[p] = { start: '', end: '' };
    }
    localStorage.setItem('routine_period_times', JSON.stringify(emptyTimes));
    localStorage.setItem('routine_break_time', JSON.stringify({ start: '', end: '' }));
  } catch {}
}

/**
 * Clears only the period times (start_time & end_time) across all classes.
 */
export async function clearPeriodTimesOnly({
  supabase,
  periodCount = 8,
}: {
  supabase: any;
  periodCount?: number;
}) {
  const { data: routines } = await supabase.from('class_routines').select('id');
  const routineIds = (routines || []).map((r: any) => r.id);

  if (routineIds.length > 0) {
    await supabase
      .from('routine_periods')
      .update({
        start_time: null,
        end_time: null,
      })
      .in('routine_id', routineIds);
  }

  // Clear in localStorage
  try {
    const emptyTimes: Record<number, { start: string; end: string }> = {};
    for (let p = 1; p <= periodCount; p++) {
      emptyTimes[p] = { start: '', end: '' };
    }
    localStorage.setItem('routine_period_times', JSON.stringify(emptyTimes));
    localStorage.setItem('routine_break_time', JSON.stringify({ start: '', end: '' }));
  } catch {}
}

