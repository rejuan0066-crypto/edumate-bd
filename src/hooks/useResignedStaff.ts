import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ResignInfo {
  staffId: string;
  resignDate: string;
  reason?: string;
  letterNumber?: string;
  source: 'letter' | 'staff_data' | 'inactive';
}

/**
 * Resignation-aware staff filtering.
 *
 * A staff/teacher who has resigned:
 *  - Active Staff List: hidden from active staff rosters once resignation is effective.
 *  - Attendance: strictly hidden on dates > resign_date (or >= resign_date).
 *  - Salary:
 *      * Resign month: included so final pay is calculated UP TO resign_date.
 *      * Months after resign month: completely excluded from salary rosters.
 *
 * Rejoined staff (letter status 'rejoined') are NOT treated as resigned.
 */
export function useResignedStaff() {
  const { data: resignInfoList = [], isLoading, refetch } = useQuery({
    queryKey: ['resigned-staff-dates'],
    queryFn: async () => {
      const results: ResignInfo[] = [];
      const seenStaffIds = new Set<string>();

      // 1. Fetch from resign_letters (all letters that haven't rejoined)
      try {
        const { data: letters, error: lettersErr } = await supabase
          .from('resign_letters')
          .select('staff_id, resign_date, status, reason, letter_number')
          .neq('status', 'rejoined')
          .not('staff_id', 'is', null)
          .not('resign_date', 'is', null);

        if (!lettersErr && Array.isArray(letters)) {
          for (const l of letters) {
            const sid = String(l.staff_id || '').trim();
            const d = String(l.resign_date || '').slice(0, 10);
            if (!sid || !d) continue;
            results.push({
              staffId: sid,
              resignDate: d,
              reason: l.reason || undefined,
              letterNumber: l.letter_number || undefined,
              source: 'letter',
            });
            seenStaffIds.add(sid);
          }
        }
      } catch (err) {
        console.warn('Could not query resign_letters for resigned staff:', err);
      }

      // 2. Fetch from staff table directly for inactive/resigned status or stored resign_date
      try {
        const { data: staffRows, error: staffErr } = await supabase
          .from('staff')
          .select('id, status, staff_data')
          .or('status.eq.inactive,status.eq.resigned');

        if (!staffErr && Array.isArray(staffRows)) {
          for (const s of staffRows) {
            const sid = String(s.id || '').trim();
            if (!sid || seenStaffIds.has(sid)) continue;
            const sd = (s.staff_data as any) || {};
            const d = sd.resign_date ? String(sd.resign_date).slice(0, 10) : '';
            results.push({
              staffId: sid,
              resignDate: d || '1970-01-01', // fallback if date unknown but inactive
              reason: sd.resign_reason || undefined,
              source: d ? 'staff_data' : 'inactive',
            });
            seenStaffIds.add(sid);
          }
        }
      } catch (err) {
        console.warn('Could not query staff table for inactive staff:', err);
      }

      return results;
    },
    staleTime: 30 * 1000, // 30s cache so updates reflect promptly
  });

  // Earliest resign_date per staff
  const resignDateByStaff = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of resignInfoList) {
      if (!r.staffId || !r.resignDate) continue;
      const prev = map.get(r.staffId);
      if (!prev || r.resignDate < prev) {
        map.set(r.staffId, r.resignDate);
      }
    }
    return map;
  }, [resignInfoList]);

  // Full resign details per staff
  const resignDetailsByStaff = useMemo(() => {
    const map = new Map<string, ResignInfo>();
    for (const r of resignInfoList) {
      if (!r.staffId) continue;
      if (!map.has(r.staffId)) map.set(r.staffId, r);
    }
    return map;
  }, [resignInfoList]);

  const resignedStaffIds = useMemo(() => {
    return new Set(resignInfoList.map((r) => r.staffId));
  }, [resignInfoList]);

  /** Get exact resign date (YYYY-MM-DD) if available */
  const getResignDate = (staffId: string | null | undefined): string | null => {
    if (!staffId) return null;
    return resignDateByStaff.get(staffId) || null;
  };

  /** True if staff resigned on or before dateStr (YYYY-MM-DD) */
  const isResignedOnDate = (staffId: string | null | undefined, dateStr: string): boolean => {
    if (!staffId) return false;
    const d = resignDateByStaff.get(staffId);
    return !!d && dateStr >= d;
  };

  /** True strictly AFTER the staff's resignation date (dateStr > resign_date) */
  const isResignedAfterDate = (staffId: string | null | undefined, dateStr: string): boolean => {
    if (!staffId) return false;
    const d = resignDateByStaff.get(staffId);
    return !!d && dateStr > d;
  };

  /**
   * True when staff resigned strictly before this month started
   * (e.g. resign month "YYYY-MM" < monthYear "YYYY-MM").
   * Mid-month resignations return false (they still belong to that month's sheet).
   */
  const isResignedBeforeMonth = (staffId: string | null | undefined, monthYear: string): boolean => {
    if (!staffId) return false;
    const d = resignDateByStaff.get(staffId);
    if (!d) return false;
    const resignMonth = d.slice(0, 7);
    return resignMonth < monthYear;
  };

  /** True if staff resigned within this specific month (YYYY-MM) */
  const isResignedInMonth = (staffId: string | null | undefined, monthYear: string): boolean => {
    if (!staffId) return false;
    const d = resignDateByStaff.get(staffId);
    if (!d) return false;
    return d.slice(0, 7) === monthYear;
  };

  return {
    resignDateByStaff,
    resignDetailsByStaff,
    resignedStaffIds,
    getResignDate,
    isResignedOnDate,
    isResignedAfterDate,
    isResignedBeforeMonth,
    isResignedInMonth,
    refetchResignedStaff: refetch,
    isLoading,
  };
}

