import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface Permission {
  menu_path: string;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export const usePermissions = () => {
  const { role, user } = useAuth();

  // Role-based permissions
  const { data: rolePermissions = [], isLoading: roleLoading } = useQuery({
    queryKey: ['role-permissions', role],
    queryFn: async () => {
      if (!role) return [];
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', role);
      if (error) throw error;
      return data as Permission[];
    },
    enabled: !!role,
  });

  // User-specific permissions (override role permissions)
  const { data: userPermissions = [], isLoading: userLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []) as (Permission & { requires_approval?: boolean })[];
    },
    enabled: !!user?.id,
  });

  const isLoading = roleLoading || userLoading;

  const hasPermission = (menuPath: string, action: 'view' | 'add' | 'edit' | 'delete'): boolean => {
    if (role === 'admin') return true;

    // Check user-level permissions first (higher priority)
    const userPerm = userPermissions.find(p => p.menu_path === menuPath);
    if (userPerm) {
      switch (action) {
        case 'view': return userPerm.can_view;
        case 'add': return userPerm.can_add;
        case 'edit': return userPerm.can_edit;
        case 'delete': return userPerm.can_delete;
        default: return false;
      }
    }

    // Fall back to role-level permissions
    const perm = rolePermissions.find(p => p.menu_path === menuPath);
    if (!perm) return false;

    switch (action) {
      case 'view': return perm.can_view;
      case 'add': return perm.can_add;
      case 'edit': return perm.can_edit;
      case 'delete': return perm.can_delete;
      default: return false;
    }
  };

  const canView = (menuPath: string) => hasPermission(menuPath, 'view');
  const canAdd = (menuPath: string) => hasPermission(menuPath, 'add');
  const canEdit = (menuPath: string) => hasPermission(menuPath, 'edit');
  const canDelete = (menuPath: string) => hasPermission(menuPath, 'delete');

  const requiresApproval = (menuPath: string): boolean => {
    if (role === 'admin') return false;
    const userPerm = userPermissions.find(p => p.menu_path === menuPath);
    return (userPerm as any)?.requires_approval ?? false;
  };

  return { permissions: rolePermissions, userPermissions, isLoading, hasPermission, canView, canAdd, canEdit, canDelete, requiresApproval, role };
};
