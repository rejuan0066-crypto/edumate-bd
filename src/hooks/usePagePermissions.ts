import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';

/**
 * Hook for page-level permission checks.
 * Returns boolean flags for view/add/edit/delete/approve based on the current user's role and permissions.
 * Admin always gets full access.
 */
export const usePagePermissions = (menuPath: string) => {
  const { role } = useAuth();
  const { canView, canAdd, canEdit, canDelete, canApprove, isFeatureAllowed, requiresApproval, isLoading } = usePermissions();

  // Admin/Super Admin has full access
  if (isAdminRole(role)) {
    return {
      canViewPage: true,
      canAddItem: true,
      canEditItem: true,
      canDeleteItem: true,
      canApproveItem: true,
      isFeatureAllowed: (_featureKey: string) => true,
      requiresApproval: (_action?: 'view' | 'add' | 'edit' | 'delete') => false,
      isLoading,
    };
  }

  return {
    canViewPage: canView(menuPath),
    canAddItem: canAdd(menuPath),
    canEditItem: canEdit(menuPath),
    canDeleteItem: canDelete(menuPath),
    canApproveItem: canApprove(menuPath),
    isFeatureAllowed: (featureKey: string) => isFeatureAllowed(menuPath, featureKey),
    requiresApproval: (action?: 'view' | 'add' | 'edit' | 'delete') => requiresApproval(menuPath, action),
    isLoading,
  };
};
