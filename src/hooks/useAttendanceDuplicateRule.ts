import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  ATTENDANCE_DUPLICATE_RULE_KEY,
  AttendanceDuplicateRule,
  DEFAULT_ATTENDANCE_DUPLICATE_RULE,
  safeDuplicateRule,
} from '@/lib/attendanceDedup';

let cached: AttendanceDuplicateRule | null = null;
const listeners = new Set<(r: AttendanceDuplicateRule) => void>();

function setCached(rule: AttendanceDuplicateRule) {
  cached = rule;
  listeners.forEach((fn) => fn(rule));
}

async function fetchRule(): Promise<AttendanceDuplicateRule> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', ATTENDANCE_DUPLICATE_RULE_KEY)
      .maybeSingle();
    const v = data?.value as any;
    return safeDuplicateRule(typeof v === 'string' ? v : v?.rule);
  } catch {
    return DEFAULT_ATTENDANCE_DUPLICATE_RULE;
  }
}

let realtimeStarted = false;
function ensureRealtime() {
  if (realtimeStarted) return;
  realtimeStarted = true;
  supabase
    .channel('app-settings-attendance-dup')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_settings', filter: `key=eq.${ATTENDANCE_DUPLICATE_RULE_KEY}` },
      (payload) => {
        const v = (payload.new as any)?.value;
        setCached(safeDuplicateRule(typeof v === 'string' ? v : v?.rule));
      },
    )
    .subscribe();
}

/** গ্লোবাল ডুপ্লিকেট-হাজিরা নিয়ম (latest / earliest), লাইভ আপডেট হয়। */
export function useAttendanceDuplicateRule(): AttendanceDuplicateRule {
  const [rule, setRule] = useState<AttendanceDuplicateRule>(cached ?? DEFAULT_ATTENDANCE_DUPLICATE_RULE);

  useEffect(() => {
    listeners.add(setRule);
    ensureRealtime();
    if (cached === null) fetchRule().then(setCached);
    return () => { listeners.delete(setRule); };
  }, []);

  return rule;
}
