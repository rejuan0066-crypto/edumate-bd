import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { isAdminRole } from '@/lib/roles';

export interface Permission {
  menu_path: string;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve?: boolean;
}

export type PermAction = 'view' | 'add' | 'edit' | 'delete' | 'approve';

export const usePermissions = () => {
  const { role, user, loading: authLoading } = useAuth();

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
    enabled: !authLoading && !!role,
    staleTime: 5 * 60 * 1000,
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
    enabled: !authLoading && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = authLoading || roleLoading || userLoading;

  // If user has ANY user_permissions entries, those become the sole authority
  // (no fallback to role permissions). This ensures the individual permission
  // modal is the complete source of truth when configured.
  const hasUserOverrides = userPermissions.length > 0;

  const pickAction = (perm: any, action: PermAction): boolean => {
    switch (action) {
      case 'view': return !!perm.can_view;
      case 'add': return !!perm.can_add;
      case 'edit': return !!perm.can_edit;
      case 'delete': return !!perm.can_delete;
      case 'approve': return !!perm.can_approve;
      default: return false;
    }
  };

  const MENU_ALIASES: Record<string, string[]> = {
    '/admin/student-attendance': ['/admin/attendance'],
    '/admin/staff-attendance': ['/admin/attendance'],
    '/admin/attendance': ['/admin/student-attendance', '/admin/staff-attendance'],
    '/admin/teachers': ['/admin/staff'],
    '/admin/general-staff': ['/admin/staff'],
    '/admin/administrative-staff': ['/admin/staff'],
    '/admin/support-staff': ['/admin/staff'],
    '/admin/directors': ['/admin/staff'],
    '/admin/committee-members': ['/admin/staff'],
    '/admin/fee-receipts': ['/admin/students-fees', '/admin/fees'],
    '/admin/fee-payments-fix': ['/admin/fee-receipts', '/admin/students-fees', '/admin/fees'],
    '/admin/receipt-audit': ['/admin/fee-receipts', '/admin/students-fees', '/admin/fees'],
    '/admin/students-fees': ['/admin/fees', '/admin/fee-receipts'],
    '/admin/salary-pdf-columns': ['/admin/salary'],
    '/admin/salary-memo-search': ['/admin/salary'],
  };

  /** '/admin/students/add' -> ['/admin/students/add', '/admin/students', ...aliases] */
  const pathCandidates = (menuPath: string): string[] => {
    const out: string[] = [];
    let p = menuPath;
    while (p && p !== '/admin' && p.includes('/')) {
      out.push(p);
      const idx = p.lastIndexOf('/');
      if (idx <= 0) break;
      p = p.slice(0, idx);
    }
    const aliases = MENU_ALIASES[menuPath];
    if (aliases) {
      aliases.forEach((a) => {
        if (!out.includes(a)) out.push(a);
      });
    }
    return out;
  };

  const hasPermission = (menuPath: string, action: PermAction): boolean => {
    if (isAdminRole(role)) return true;

    const candidates = pathCandidates(menuPath);

    // If user has individual permissions set, check individual overrides first
    if (hasUserOverrides) {
      for (const path of candidates) {
        const userPerm = userPermissions.find((p) => p.menu_path === path);
        if (userPerm) return pickAction(userPerm, action);
      }
      // If this specific path is not configured in individual overrides, fall back to role permissions
      for (const path of candidates) {
        const perm = rolePermissions.find((p) => p.menu_path === path);
        if (perm) return pickAction(perm, action);
      }
      return false;
    }

    // No user overrides — use role-level permissions
    for (const path of candidates) {
      const perm = rolePermissions.find((p) => p.menu_path === path);
      if (perm) return pickAction(perm, action);
    }
    return false;
  };


  const canView = (menuPath: string) => hasPermission(menuPath, 'view');
  const canAdd = (menuPath: string) => hasPermission(menuPath, 'add');
  const canEdit = (menuPath: string) => hasPermission(menuPath, 'edit');
  const canDelete = (menuPath: string) => hasPermission(menuPath, 'delete');
  const canApprove = (menuPath: string) => hasPermission(menuPath, 'approve');

  // Check ONLY individual user_permissions (ignoring role_permissions)
  const hasUserPermission = (menuPath: string, action: PermAction): boolean => {
    if (isAdminRole(role)) return true;
    const userPerm = userPermissions.find(p => p.menu_path === menuPath);
    if (!userPerm) return false;
    return pickAction(userPerm, action);
  };

  const requiresApproval = (menuPath: string, action?: 'view' | 'add' | 'edit' | 'delete'): boolean => {
    if (isAdminRole(role)) return false;
    const userPerm = userPermissions.find(p => p.menu_path === menuPath);
    if (!userPerm) return false;
    if (action) {
      return (userPerm as any)?.[`approval_${action}`] ?? false;
    }
    return (userPerm as any)?.approval_view || (userPerm as any)?.approval_add || (userPerm as any)?.approval_edit || (userPerm as any)?.approval_delete || false;
  };

  return { permissions: rolePermissions, userPermissions, isLoading, hasPermission, hasUserPermission, canView, canAdd, canEdit, canDelete, canApprove, requiresApproval, role };
};
