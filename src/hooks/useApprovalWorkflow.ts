import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SubmitForApprovalParams {
  actionType: 'add' | 'edit' | 'delete';
  targetTable: string;
  targetId?: string;
  menuPath: string;
  payload: Record<string, unknown>;
  description?: string;
}

export const useApprovalWorkflow = () => {
  const { user, role } = useAuth();

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

  // Check if action requires approval for a specific menu path
  const needsApproval = (menuPath: string, action?: 'view' | 'add' | 'edit' | 'delete'): boolean => {
    if (role === 'admin') return false;
    const perm = userPermissions.find((p: any) => p.menu_path === menuPath);
    if (!perm) return false;
    if (action) {
      const field = `approval_${action}`;
      return perm[field] ?? false;
    }
    // If no action specified, check if any approval is required
    return perm.approval_view || perm.approval_add || perm.approval_edit || perm.approval_delete || false;
  };

  // Submit an action for approval
  const submitForApproval = async (params: SubmitForApprovalParams): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase.from('pending_actions').insert({
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email,
        user_email: user.email,
        action_type: params.actionType,
        target_table: params.targetTable,
        target_id: params.targetId || null,
        menu_path: params.menuPath,
        payload: {
          ...params.payload,
          _description: params.description || '',
        },
      });

      if (error) throw error;
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

  return {
    needsApproval,
    submitForApproval,
    pendingCount,
  };
};
