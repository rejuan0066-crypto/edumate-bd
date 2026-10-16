import { useMemo, useCallback } from 'react';
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
  '/admin/staff': ['/admin/teachers', '/admin/general-staff', '/admin/administrative-staff', '/admin/support-staff'],
  '/admin/fee-receipts': ['/admin/students-fees', '/admin/fees'],
  '/admin/fee-payments-fix': ['/admin/fee-receipts', '/admin/students-fees', '/admin/fees'],
  '/admin/receipt-audit': ['/admin/fee-receipts', '/admin/students-fees', '/admin/fees'],
  '/admin/students-fees': ['/admin/fees', '/admin/fee-receipts'],
  '/admin/salary-pdf-columns': ['/admin/salary'],
  '/admin/salary-memo-search': ['/admin/salary'],
};

const PATH_CANDIDATES_CACHE = new Map<string, string[]>();

const getPathCandidates = (menuPath: string): string[] => {
  const cached = PATH_CANDIDATES_CACHE.get(menuPath);
  if (cached) return cached;

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
  PATH_CANDIDATES_CACHE.set(menuPath, out);
  return out;
};

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

  // Hidden tabs & sub-feature config from website_settings
  const { data: hiddenFeatures = {} } = useQuery({
    queryKey: ['role-hidden-features-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'role_feature_permissions')
        .maybeSingle();
      if (error) return {};
      return (data?.value as Record<string, Record<string, boolean>>) || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = authLoading || roleLoading || userLoading;
  const hasUserOverrides = userPermissions.length > 0;

  const userPermMap = useMemo(() => {
    const map = new Map<string, Permission & { requires_approval?: boolean }>();
    for (const p of userPermissions) {
      map.set(p.menu_path, p);
    }
    return map;
  }, [userPermissions]);

  const rolePermMap = useMemo(() => {
    const map = new Map<string, Permission>();
    for (const p of rolePermissions) {
      map.set(p.menu_path, p);
    }
    return map;
  }, [rolePermissions]);

  const hasPermission = useCallback((menuPath: string, action: PermAction): boolean => {
    if (isAdminRole(role)) return true;

    const candidates = getPathCandidates(menuPath);

    if (hasUserOverrides) {
      for (const path of candidates) {
        const userPerm = userPermMap.get(path);
        if (userPerm) return pickAction(userPerm, action);
      }
      return false;
    }

    for (const path of candidates) {
      const perm = rolePermMap.get(path);
      if (perm) return pickAction(perm, action);
    }
    return false;
  }, [role, hasUserOverrides, userPermMap, rolePermMap]);

  const canView = useCallback((menuPath: string) => hasPermission(menuPath, 'view'), [hasPermission]);
  const canAdd = useCallback((menuPath: string) => hasPermission(menuPath, 'add'), [hasPermission]);
  const canEdit = useCallback((menuPath: string) => hasPermission(menuPath, 'edit'), [hasPermission]);
  const canDelete = useCallback((menuPath: string) => hasPermission(menuPath, 'delete'), [hasPermission]);
  const canApprove = useCallback((menuPath: string) => hasPermission(menuPath, 'approve'), [hasPermission]);

  /**
   * isFeatureAllowed
   * Checks whether a specific internal tab, sub-feature, or action is allowed.
   * Signature: isFeatureAllowed(menuPath, featureKey, subAction?)
   * If subAction is provided, checks `${menuPath}:${featureKey}:${subAction}`
   * If false, the tab/button MUST BE COMPLETELY HIDDEN (not rendered) from the DOM.
   */
  const isFeatureAllowed = useCallback((menuPath: string, featureKey: string, subAction?: 'view' | 'add' | 'edit' | 'delete' | 'print'): boolean => {
    if (isAdminRole(role)) return true;
    if (!role) return false;

    // Check if whole page is accessible first
    if (!canView(menuPath)) return false;

    // Check specific sub-feature permission for this role
    // Format in hiddenFeatures: { [role]: { [`${menuPath}:${featureKey}`]: boolean, [`${menuPath}:${featureKey}:${subAction}`]: boolean } }
    const roleMap = hiddenFeatures[role];
    if (!roleMap) return true; // Default allowed unless restricted

    // 1. Check parent feature/tab visibility first
    const fullKey = `${menuPath}:${featureKey}`;
    if (roleMap[fullKey] === false) {
      return false; // Whole tab/feature is hidden
    }

    // 2. If sub-action is specified, check sub-action permission
    if (subAction) {
      const subActionKey = `${menuPath}:${featureKey}:${subAction}`;
      if (roleMap[subActionKey] !== undefined) {
        return !!roleMap[subActionKey];
      }
    }

    if (roleMap[fullKey] !== undefined) {
      return !!roleMap[fullKey];
    }

    return true;
  }, [role, canView, hiddenFeatures]);

  // Check ONLY individual user_permissions (ignoring role_permissions)
  const hasUserPermission = useCallback((menuPath: string, action: PermAction): boolean => {
    if (isAdminRole(role)) return true;
    const userPerm = userPermMap.get(menuPath);
    if (!userPerm) return false;
    return pickAction(userPerm, action);
  }, [role, userPermMap]);

  /**
   * requiresApproval
   * Checks if an action on a page or inside a specific tab requires maker-checker approval.
   * Signature: requiresApproval(menuPath, action?, tabKey?)
   */
  const requiresApproval = useCallback((menuPath: string, action?: 'view' | 'add' | 'edit' | 'delete', tabKey?: string): boolean => {
    if (isAdminRole(role)) return false;
    const userPerm = userPermMap.get(menuPath);
    if (!userPerm) {
      if (!role) return false;
      const roleFeatures = hiddenFeatures[role] || {};

      // If checking for a specific tab's action approval
      if (tabKey && action) {
        const tabApprovalKey = `${menuPath}:${tabKey}:approval_${action}`;
        if (roleFeatures[tabApprovalKey] !== undefined) {
          return !!roleFeatures[tabApprovalKey];
        }
      }

      // Check general page action approval
      if (action) {
        return !!roleFeatures[`${menuPath}:approval_${action}`];
      }
      return !!(
        roleFeatures[`${menuPath}:approval_add`] ||
        roleFeatures[`${menuPath}:approval_edit`] ||
        roleFeatures[`${menuPath}:approval_delete`]
      );
    }
    if (action) {
      return (userPerm as any)?.[`approval_${action}`] ?? false;
    }
    return (userPerm as any)?.approval_view || (userPerm as any)?.approval_add || (userPerm as any)?.approval_edit || (userPerm as any)?.approval_delete || false;
  }, [role, userPermMap, hiddenFeatures]);


  return {
    permissions: rolePermissions,
    userPermissions,
    isLoading,
    hasPermission,
    hasUserPermission,
    canView,
    canAdd,
    canEdit,
    canDelete,
    canApprove,
    requiresApproval,
    isFeatureAllowed,
    role,
  };
};
