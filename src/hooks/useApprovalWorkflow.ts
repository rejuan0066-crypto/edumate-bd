import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useApprovalSettings } from '@/hooks/useApprovalSettings';
import { usePermissions } from '@/hooks/usePermissions';

interface SubmitForApprovalParams {
  actionType: 'add' | 'edit' | 'delete' | 'reject';
  targetTable: string;
  targetId?: string;
  menuPath: string;
  payload: Record<string, unknown>;
  description?: string;
}

export const useApprovalWorkflow = () => {
  const { user, role } = useAuth();
  const { settings: globalApproval } = useApprovalSettings();
  const { requiresApproval } = usePermissions();

  // Fetch user permissions with requires_approval flag
  const { data: userPermissions = [] } = useQuery({
    queryKey: ['user-permissions-approval', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.id,
  });

  // Global rule: when the master switch is on, every non-admin (non-exempt) user
  // needs approval for the enabled actions — even without a per-user override row.
  const globalNeedsApproval = (action?: 'view' | 'add' | 'edit' | 'delete' | 'reject'): boolean => {
    if (!globalApproval.enabled) return false;
    if (role && globalApproval.exempt_roles.includes(role)) return false;
    if (!action) return globalApproval.actions.add || globalApproval.actions.edit || globalApproval.actions.delete || globalApproval.actions.reject;
    if (action === 'view') return false;
    return globalApproval.actions[action] ?? false;
  };

  // Check if action requires approval for a specific menu path
  const needsApproval = (menuPath: string, action?: 'view' | 'add' | 'edit' | 'delete' | 'reject'): boolean => {
    if (role === 'admin' || role === 'super_admin') return false;
    if (globalNeedsApproval(action)) return true;

    // Check central permissions hook (respects both individual user overrides and role-level approval policies)
    if (action && action !== 'reject') {
      if (requiresApproval(menuPath, action as any)) return true;
    } else if (!action) {
      if (requiresApproval(menuPath)) return true;
    }

    const perm = userPermissions.find((p: any) => p.menu_path === menuPath);
    if (!perm) return false;
    if (action) {
      const field = `approval_${action}`;
      return perm[field] ?? false;
    }
    // If no action specified, check if any approval is required
    return perm.approval_view || perm.approval_add || perm.approval_edit || perm.approval_delete || perm.approval_reject || false;
  };

  // Submit an action for approval
  const submitForApproval = async (params: SubmitForApprovalParams): Promise<boolean> => {
    if (!user) return false;

    try {
      const description = params.description || '';
      const userName = user.user_metadata?.full_name || user.email || 'User';

      const { data: newAction, error } = await supabase.from('pending_actions').insert({
        user_id: user.id,
        user_name: userName,
        user_email: user.email,
        action_type: params.actionType,
        target_table: params.targetTable,
        target_id: params.targetId || null,
        menu_path: params.menuPath,
        payload: {
          ...params.payload,
          _description: description,
        },
        requires_admin_approval: true,
        status: 'pending'
      }).select().single();

      if (error) throw error;

      // Add notification for admins
      if (newAction) {
        await supabase.from('notifications').insert({
          title: 'Approval Required: New Request',
          title_bn: 'অনুমোদন প্রযোজ্য — নতুন অনুরোধ',
          message: `${userName} sent a ${params.actionType} request: ${description}`,
          message_bn: `${userName} একটি ${params.actionType} অনুরোধ পাঠিয়েছেন: ${description}`,
          type: 'warning',
          category: 'approval',
          link: '/admin/approvals',
        });
      }

      return true;
    } catch (err: any) {
      console.error('Failed to submit for approval:', err);
      return false;
    }
  };

  // Get user's own pending actions count
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['my-pending-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from('pending_actions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // NEW: Check if a specific record has a pending action
  const { data: allPendingActions = [] } = useQuery({
    queryKey: ['all-pending-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_actions')
        .select('target_table, target_id, status')
        .eq('status', 'pending');
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds to catch new pending items
  });

  const isRecordPending = (targetTable: string, targetId: string): boolean => {
    if (!targetId) return false;
    return allPendingActions.some(
      (a: any) => a.target_table === targetTable && a.target_id === targetId && a.status === 'pending'
    );
  };

  return {
    needsApproval,
    submitForApproval,
    pendingCount,
    isRecordPending,
    allPendingActions,
  };
};
