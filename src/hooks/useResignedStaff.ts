import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Resignation-aware staff filtering.
 *
 * A staff/teacher whose resign letter is issued disappears from
 * attendance rosters and salary sheets FROM the resign_date onward:
 *  - Attendance: hidden on dates >= resign_date (unless attendance already
 *    exists for that date — history is preserved).
 *  - Salary: hidden from months that start on/after resign_date (unless a
 *    salary record already exists for that month — history is preserved).
 *
 * Rejoined staff (letter status 'rejoined') are NOT treated as resigned.
 */
export function useResignedStaff() {
  const { data: resignations = [] } = useQuery({
    queryKey: ['resigned-staff-dates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resign_letters')
        .select('staff_id, resign_date')
        .eq('status', 'issued')
        .not('staff_id', 'is', null)
        .not('resign_date', 'is', null);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Earliest issued resign_date per staff (multiple letters possible).
  const resignDateByStaff = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of resignations as any[]) {
      const staffId = r.staff_id as string;
      const d = String(r.resign_date).slice(0, 10);
      if (!staffId || !d) continue;
      const prev = map.get(staffId);
      if (!prev || d < prev) map.set(staffId, d);
    }
    return map;
  }, [resignations]);

  /** True when the staff has resigned on or before the given ISO date (YYYY-MM-DD). */
  const isResignedOnDate = (staffId: string | null | undefined, dateStr: string): boolean => {
    if (!staffId) return false;
    const d = resignDateByStaff.get(staffId);
    return !!d && dateStr >= d;
  };

  /**
   * True when the staff resigned before this salary month started
   * (resign_date <= 1st of monthYear "YYYY-MM") — they earn nothing that month.
   * Mid-month resignations still appear in that month's sheet.
   */
  const isResignedBeforeMonth = (staffId: string | null | undefined, monthYear: string): boolean => {
    if (!staffId) return false;
    const d = resignDateByStaff.get(staffId);
    return !!d && d <= `${monthYear}-01`;
  };

  return { resignDateByStaff, isResignedOnDate, isResignedBeforeMonth };
}
