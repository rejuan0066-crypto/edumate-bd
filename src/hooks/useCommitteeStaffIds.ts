import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the set of staff IDs that are currently linked to an active committee member.
 * These staff are intentionally excluded from staff/salary/attendance listings.
 */
export function useCommitteeStaffIds() {
  const { data = [] } = useQuery({
    queryKey: ["committee-staff-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("committee_members" as any)
        .select("staff_id, is_active, committee:committees!inner(is_active, deleted_at)")
        .not("staff_id", "is", null)
        .is("deleted_at", null)
        .eq("is_active", true);
      if (error) {
        console.warn("[useCommitteeStaffIds]", error.message);
        return [] as string[];
      }
      return (data as any[])
        .filter((r) => r.committee?.is_active && !r.committee?.deleted_at && r.staff_id)
        .map((r) => r.staff_id as string);
    },
    staleTime: 60_000,
  });

  return new Set<string>(data);
}
