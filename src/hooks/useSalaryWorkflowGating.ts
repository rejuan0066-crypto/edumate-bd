import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Resolves the current user's identity in the salary workflow.
 * A logged-in user can be linked via either:
 *   - staff.user_id  → matches salary_workflow_settings.staff_id
 *   - administrative_officers.user_id → matches salary_workflow_settings.admin_officer_id
 *
 * Authorization is per workflow-settings row id, so even custom entries
 * (no staff yet) become active automatically once the user opens an account
 * and gets linked back to the settings row by an admin.
 */
export interface SalaryWorkflowGating {
  loading: boolean;
  myStaffId: string | null;
  myAdminOfficerId: string | null;
  /** Settings row IDs assigned to the current user across roles */
  mySettingsIds: string[];
  isSuperAdmin: boolean;
  /** Match by stored settings id OR legacy staff_id snapshot. */
  isAssignedVerifier: (verifierStaffId?: string | null, verifierSettingsId?: string | null) => boolean;
  isAssignedApprover: (approverStaffId?: string | null, approverSettingsId?: string | null) => boolean;
  isActiveTreasurer: boolean;
}

export function useSalaryWorkflowGating(): SalaryWorkflowGating {
  const { user, role } = useAuth();
  const isSuperAdmin = role === 'super_admin';

  const { data: identity, isLoading: loadingIdentity } = useQuery({
    queryKey: ['salary-workflow-identity', user?.id],
    queryFn: async () => {
      if (!user?.id) return { staffId: null as string | null, adminId: null as string | null };
      const [{ data: s }, { data: a }] = await Promise.all([
        supabase.from('staff').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('administrative_officers').select('id').eq('user_id', user.id).maybeSingle(),
      ]);
      return { staffId: (s?.id as string) || null, adminId: (a?.id as string) || null };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const myStaffId = identity?.staffId ?? null;
  const myAdminOfficerId = identity?.adminId ?? null;

  const { data: mySettings = [], isLoading: loadingMine } = useQuery({
    queryKey: ['my-salary-workflow-settings', myStaffId, myAdminOfficerId],
    queryFn: async () => {
      if (!myStaffId && !myAdminOfficerId) return [] as any[];
      const filters: string[] = [];
      if (myStaffId) filters.push(`staff_id.eq.${myStaffId}`);
      if (myAdminOfficerId) filters.push(`admin_officer_id.eq.${myAdminOfficerId}`);
      const { data, error } = await supabase
        .from('salary_workflow_settings')
        .select('id, role, is_active, staff_id, admin_officer_id')
        .or(filters.join(','))
        .eq('is_active', true);
      if (error) return [];
      return data || [];
    },
    enabled: !!myStaffId || !!myAdminOfficerId,
    staleTime: 5 * 60 * 1000,
  });

  const mySettingsIds = mySettings.map((s: any) => s.id);
  const myVerifierIds = new Set(mySettings.filter((s: any) => s.role === 'verifier').map((s: any) => s.id));
  const myApproverIds = new Set(mySettings.filter((s: any) => s.role === 'approver').map((s: any) => s.id));
  const isActiveTreasurer = isSuperAdmin || mySettings.some((s: any) => s.role === 'treasurer');

  return {
    loading: loadingIdentity || loadingMine,
    myStaffId,
    myAdminOfficerId,
    mySettingsIds,
    isSuperAdmin,
    isAssignedVerifier: (verifierStaffId, verifierSettingsId) => {
      if (isSuperAdmin) return true;
      if (verifierSettingsId && myVerifierIds.has(verifierSettingsId)) return true;
      if (verifierStaffId && myStaffId && verifierStaffId === myStaffId) return true;
      return false;
    },
    isAssignedApprover: (approverStaffId, approverSettingsId) => {
      if (isSuperAdmin) return true;
      if (approverSettingsId && myApproverIds.has(approverSettingsId)) return true;
      if (approverStaffId && myStaffId && approverStaffId === myStaffId) return true;
      return false;
    },
    isActiveTreasurer,
  };
}
