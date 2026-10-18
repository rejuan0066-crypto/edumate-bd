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
  // Legacy or unlisted sub-route aliases that map to their primary registered page
  '/admin/fees': ['/admin/students-fees'],
  '/admin/fee-payments-fix': ['/admin/fee-receipts'],
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

const CACHE_KEYS = {
  rolePerms: (r: string) => `edumate_cached_role_perms_${r}`,
  userPerms: (uid: string) => `edumate_cached_user_perms_${uid}`,
  features: 'edumate_cached_role_features',
};

const getCachedJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
};

const setCachedJson = (key: string, data: any) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {}
};

export const usePermissions = () => {
  const { role, user, loading: authLoading } = useAuth();

  // Role-based permissions (cached for 0ms instant initial rendering)
  const { data: rolePermissions = [], isLoading: roleLoading } = useQuery({
    queryKey: ['role-permissions', role],
    initialData: () => (role ? getCachedJson(CACHE_KEYS.rolePerms(role), []) : []),
    queryFn: async () => {
      if (!role) return [];
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', role);
      if (error) throw error;
      setCachedJson(CACHE_KEYS.rolePerms(role), data || []);
      return (data || []) as Permission[];
    },
    enabled: !authLoading && !!role,
    staleTime: 5 * 60 * 1000,
  });

  // User-specific permissions (override role permissions, cached for 0ms instant initial rendering)
  const { data: userPermissions = [], isLoading: userLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    initialData: () => (user?.id ? getCachedJson(CACHE_KEYS.userPerms(user.id), []) : []),
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      setCachedJson(CACHE_KEYS.userPerms(user.id), data || []);
      return (data || []) as (Permission & { requires_approval?: boolean })[];
    },
    enabled: !authLoading && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Hidden tabs & sub-feature config from website_settings (cached for 0ms instant initial rendering)
  const { data: hiddenFeatures = {} } = useQuery({
    queryKey: ['role-hidden-features-settings'],
    initialData: () => getCachedJson(CACHE_KEYS.features, {}),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'role_feature_permissions')
        .maybeSingle();
      if (error) return {};
      const val = (data?.value as Record<string, Record<string, boolean>>) || {};
      setCachedJson(CACHE_KEYS.features, val);
      return val;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = authLoading || (roleLoading && rolePermissions.length === 0) || (userLoading && userPermissions.length === 0);
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

    // If an individual user has custom feature settings, check if main view is blocked
    if (action === 'view' && user?.id) {
      const userFeatures = hiddenFeatures[`user_${user.id}`];
      if (userFeatures) {
        for (const path of candidates) {
          if (userFeatures[`${path}:tab_main_view`] === false) return false;
        }
      }
    }

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
  }, [role, user, hasUserOverrides, userPermMap, rolePermMap, hiddenFeatures]);

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
   * Checks USER-SPECIFIC override (user_${user.id}) first, then ROLE-LEVEL (role).
   * If false, the tab/button MUST BE COMPLETELY HIDDEN (not rendered) from the DOM.
   */
  const isFeatureAllowed = useCallback((menuPath: string, featureKey: string, subAction?: 'view' | 'add' | 'edit' | 'delete' | 'print'): boolean => {
    if (isAdminRole(role)) return true;
    if (!role && !user) return false;

    // Check if whole page is accessible first
    if (!canView(menuPath)) return false;

    // User-specific features take highest priority
    const userMap = user?.id ? hiddenFeatures[`user_${user.id}`] : undefined;
    const roleMap = role ? hiddenFeatures[role] : undefined;

    if (!userMap && !roleMap) return true; // Default allowed unless restricted

    const fullKey = `${menuPath}:${featureKey}`;

    // 1. Check parent feature/tab visibility (User override takes precedence over role)
    if (userMap && userMap[fullKey] !== undefined) {
      if (userMap[fullKey] === false) return false;
    } else if (roleMap && roleMap[fullKey] !== undefined) {
      if (roleMap[fullKey] === false) return false;
    }

    // 2. If sub-action is specified, check sub-action permission
    if (subAction) {
      const subActionKey = `${menuPath}:${featureKey}:${subAction}`;
      if (userMap && userMap[subActionKey] !== undefined) {
        return !!userMap[subActionKey];
      }
      if (roleMap && roleMap[subActionKey] !== undefined) {
        return !!roleMap[subActionKey];
      }
    }

    if (userMap && userMap[fullKey] !== undefined) {
      return !!userMap[fullKey];
    }
    if (roleMap && roleMap[fullKey] !== undefined) {
      return !!roleMap[fullKey];
    }

    return true;
  }, [role, user, canView, hiddenFeatures]);

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
   * Respects BOTH user-level overrides (user_${user.id}) and role-level approval policies.
   */
  const requiresApproval = useCallback((menuPath: string, action?: 'view' | 'add' | 'edit' | 'delete', tabKey?: string): boolean => {
    if (isAdminRole(role)) return false;
    const userPerm = userPermMap.get(menuPath);
    const userFeatures = user?.id ? (hiddenFeatures[`user_${user.id}`] || {}) : {};
    const roleFeatures = role ? (hiddenFeatures[role] || {}) : {};

    // 1. If checking for a specific tab's action approval
    if (tabKey && action) {
      const tabApprovalKey = `${menuPath}:${tabKey}:approval_${action}`;
      if (userFeatures[tabApprovalKey] !== undefined) {
        return !!userFeatures[tabApprovalKey];
      }
      if (roleFeatures[tabApprovalKey] !== undefined) {
        return !!roleFeatures[tabApprovalKey];
      }
    }

    // 2. Check general page action approval
    if (action) {
      const actionKey = `${menuPath}:approval_${action}`;
      if (userFeatures[actionKey] !== undefined) {
        return !!userFeatures[actionKey];
      }
      if (userPerm && (userPerm as any)[`approval_${action}`] !== undefined) {
        return !!(userPerm as any)[`approval_${action}`];
      }
      if (roleFeatures[actionKey] !== undefined) {
        return !!roleFeatures[actionKey];
      }
      return false;
    }

    // Any action approval check
    return !!(
      userFeatures[`${menuPath}:approval_add`] ||
      userFeatures[`${menuPath}:approval_edit`] ||
      userFeatures[`${menuPath}:approval_delete`] ||
      (userPerm as any)?.approval_view ||
      (userPerm as any)?.approval_add ||
      (userPerm as any)?.approval_edit ||
      (userPerm as any)?.approval_delete ||
      roleFeatures[`${menuPath}:approval_add`] ||
      roleFeatures[`${menuPath}:approval_edit`] ||
      roleFeatures[`${menuPath}:approval_delete`]
    );
  }, [role, user, userPermMap, hiddenFeatures]);


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
