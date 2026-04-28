import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Resolves the current logged-in user's linked staff record (if any),
 * plus convenience flags for whether they are the assigned verifier/approver
 * or an active treasurer in the salary workflow settings.
 */
export interface SalaryWorkflowGating {
  loading: boolean;
  myStaffId: string | null;
  isSuperAdmin: boolean;
  isAssignedVerifier: (verifierStaffId?: string | null) => boolean;
  isAssignedApprover: (approverStaffId?: string | null) => boolean;
  isActiveTreasurer: boolean;
}

export function useSalaryWorkflowGating(): SalaryWorkflowGating {
  const { user, role } = useAuth();
  const isSuperAdmin = role === 'super_admin';

  const { data: myStaffId = null, isLoading: loadingStaff } = useQuery({
    queryKey: ['my-staff-id', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) return null;
      return (data?.id as string) || null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: treasurers = [], isLoading: loadingTreasurers } = useQuery({
    queryKey: ['salary-workflow-treasurers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_workflow_settings')
        .select('staff_id')
        .eq('role', 'treasurer')
        .eq('is_active', true);
      if (error) return [];
      return (data || []).map((d: any) => d.staff_id);
    },
    staleTime: 5 * 60 * 1000,
  });

  const isActiveTreasurer = !!myStaffId && treasurers.includes(myStaffId);

  return {
    loading: loadingStaff || loadingTreasurers,
    myStaffId,
    isSuperAdmin,
    isAssignedVerifier: (verifierStaffId) =>
      isSuperAdmin || (!!myStaffId && !!verifierStaffId && myStaffId === verifierStaffId),
    isAssignedApprover: (approverStaffId) =>
      isSuperAdmin || (!!myStaffId && !!approverStaffId && myStaffId === approverStaffId),
    isActiveTreasurer: isSuperAdmin || isActiveTreasurer,
  };
}
