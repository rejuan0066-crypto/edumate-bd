import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StaffCommitteeInfo {
  ids: Set<string>;
  byStaff: Map<string, { committee_id: string; committee_name: string; designation: string | null }[]>;
}

/**
 * Returns the set of staff IDs currently linked to an active committee member,
 * plus a map of staff_id -> list of committees.
 */
export function useCommitteeStaffIds(): StaffCommitteeInfo {
  const { data } = useQuery({
    queryKey: ["committee-staff-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("committee_members" as any)
        .select("staff_id, designation, is_active, committee:committees!inner(id, name, name_en, is_active, deleted_at)")
        .not("staff_id", "is", null)
        .is("deleted_at", null)
        .eq("is_active", true);
      if (error) {
        console.warn("[useCommitteeStaffIds]", error.message);
        return [] as any[];
      }
      return (data as any[]).filter(
        (r) => r.committee?.is_active && !r.committee?.deleted_at && r.staff_id
      );
    },
    staleTime: 60_000,
  });

  const ids = new Set<string>();
  const byStaff = new Map<string, { committee_id: string; committee_name: string; designation: string | null }[]>();

  (data || []).forEach((r: any) => {
    const sid = r.staff_id as string;
    ids.add(sid);
    const list = byStaff.get(sid) || [];
    list.push({
      committee_id: r.committee.id,
      committee_name: r.committee.name || r.committee.name_en || "Committee",
      designation: r.designation || null,
    });
    byStaff.set(sid, list);
  });

  return { ids, byStaff };
}
