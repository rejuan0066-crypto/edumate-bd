import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';

/**
 * Hook for page-level permission checks.
 * Returns boolean flags for view/add/edit/delete based on the current user's role and permissions.
 * Admin always gets full access.
 */
export const usePagePermissions = (menuPath: string) => {
  const { role } = useAuth();
  const { canView, canAdd, canEdit, canDelete, isLoading } = usePermissions();

  // Admin/Super Admin has full access
  if (isAdminRole(role)) {
    return {
      canViewPage: true,
      canAddItem: true,
      canEditItem: true,
      canDeleteItem: true,
      isLoading,
    };
  }

  return {
    canViewPage: canView(menuPath),
    canAddItem: canAdd(menuPath),
    canEditItem: canEdit(menuPath),
    canDeleteItem: canDelete(menuPath),
    isLoading,
  };
};
