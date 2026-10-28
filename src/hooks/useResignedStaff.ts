import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ResignInfo {
  staffId: string;
  staffNameBn?: string;
  staffNameEn?: string;
  resignDate: string;
  reason?: string;
  letterNumber?: string;
  source: 'letter' | 'staff_data' | 'inactive';
}

export const normalizeResignName = (name?: string | null): string => {
  if (!name) return '';
  return name
    .replace(/[:ঃ\.,\-\(\)]/g, ' ')
    .replace(/\b(মাওলানা|মুয়াল্লিম|মুআল্লিম|হাফেজ|হাফিজ|মাষ্টার|মাস্টার|জনাব|মোঃ|মো|মুহাদ্দিস|মুফতি|কারী|ক্বারী|বাবুর্চি|খাদ্দাম)\b/g, '')
    .replace(/ী/g, 'ি')
    .replace(/ূ/g, 'ু')
    .replace(/আহমেদ/g, 'আহমদ')
    .replace(/মোহাম্মদ|মুহাম্মদ|মোহামদ/g, 'মো')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

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
          .select('staff_id, resign_date, status, reason, letter_number, staff_name, staff_name_bn')
          .neq('status', 'rejoined')
          .not('resign_date', 'is', null);

        if (!lettersErr && Array.isArray(letters)) {
          for (const l of letters) {
            const sid = String(l.staff_id || '').trim();
            const d = String(l.resign_date || '').slice(0, 10);
            if (!d) continue;
            results.push({
              staffId: sid,
              staffNameBn: l.staff_name_bn || undefined,
              staffNameEn: l.staff_name || undefined,
              resignDate: d,
              reason: l.reason || undefined,
              letterNumber: l.letter_number || undefined,
              source: 'letter',
            });
            if (sid) seenStaffIds.add(sid);
          }
        }
      } catch (err) {
        console.warn('Could not query resign_letters for resigned staff:', err);
      }

      // 2. Fetch from staff table directly: inspect all staff for stored resign_date or inactive/resigned status
      try {
        const { data: staffRows, error: staffErr } = await supabase
          .from('staff')
          .select('id, name_bn, name_en, status, staff_data');

        if (!staffErr && Array.isArray(staffRows)) {
          for (const s of staffRows) {
            const sid = String(s.id || '').trim();
            if (!sid || seenStaffIds.has(sid)) continue;
            const sd = (s.staff_data as any) || {};
            const d = sd.resign_date ? String(sd.resign_date).slice(0, 10) : '';
            const isResignedStatus = s.status === 'resigned' || s.status === 'inactive' || sd.status_reason === 'resigned';
            if (d || isResignedStatus) {
              results.push({
                staffId: sid,
                staffNameBn: s.name_bn || undefined,
                staffNameEn: s.name_en || undefined,
                resignDate: d, // if no explicit date, leave empty
                reason: sd.resign_reason || undefined,
                source: d ? 'staff_data' : 'inactive',
              });
              seenStaffIds.add(sid);
            }
          }
        }
      } catch (err) {
        console.warn('Could not query staff table for inactive staff:', err);
      }

      return results;
    },
    staleTime: 30 * 1000, // 30s cache so updates reflect promptly
  });

  // Earliest resign_date per staff ID
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

  // Earliest resign_date by normalized staff name
  const resignDateByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of resignInfoList) {
      if (!r.resignDate) continue;
      const bnNorm = normalizeResignName(r.staffNameBn);
      const enNorm = normalizeResignName(r.staffNameEn);
      if (bnNorm) {
        const prev = map.get(bnNorm);
        if (!prev || r.resignDate < prev) map.set(bnNorm, r.resignDate);
      }
      if (enNorm) {
        const prev = map.get(enNorm);
        if (!prev || r.resignDate < prev) map.set(enNorm, r.resignDate);
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
    return new Set(resignInfoList.filter((r) => !!r.staffId).map((r) => r.staffId));
  }, [resignInfoList]);

  /** Get exact resign date (YYYY-MM-DD) if available, with name fallback */
  const getResignDate = (staffId: string | null | undefined, staffName?: string | null): string | null => {
    if (staffId && resignDateByStaff.has(staffId)) {
      return resignDateByStaff.get(staffId) || null;
    }
    if (staffName) {
      const norm = normalizeResignName(staffName);
      if (norm && resignDateByName.has(norm)) {
        return resignDateByName.get(norm) || null;
      }
    }
    return null;
  };

  /** True if staff resigned on or before dateStr (YYYY-MM-DD) */
  const isResignedOnDate = (staffId: string | null | undefined, dateStr: string, staffName?: string | null): boolean => {
    const d = getResignDate(staffId, staffName);
    return !!d && dateStr >= d;
  };

  /** True strictly AFTER the staff's resignation date (dateStr > resign_date) */
  const isResignedAfterDate = (staffId: string | null | undefined, dateStr: string, staffName?: string | null): boolean => {
    const d = getResignDate(staffId, staffName);
    return !!d && dateStr > d;
  };

  /**
   * True when staff resigned strictly before this month started
   * (e.g. resign month "YYYY-MM" < monthYear "YYYY-MM").
   * Mid-month resignations return false (they still belong to that month's sheet).
   */
  const isResignedBeforeMonth = (staffId: string | null | undefined, monthYear: string, staffName?: string | null): boolean => {
    const d = getResignDate(staffId, staffName);
    if (!d) return false;
    const resignMonth = d.slice(0, 7);
    return resignMonth < monthYear;
  };

  /** True if staff resigned within this specific month (YYYY-MM) */
  const isResignedInMonth = (staffId: string | null | undefined, monthYear: string, staffName?: string | null): boolean => {
    const d = getResignDate(staffId, staffName);
    if (!d) return false;
    return d.slice(0, 7) === monthYear;
  };

  return {
    resignDateByStaff,
    resignDateByName,
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
