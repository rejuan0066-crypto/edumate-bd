import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGateProps {
  menuPath: string;
  action?: 'view' | 'add' | 'edit' | 'delete' | 'approve';
  featureKey?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * PermissionGate
 * Complete hide engine: renders children ONLY if the user has permission.
 * If permission is missing, children are COMPLETELY OMITTED (100% hidden) from the DOM.
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  menuPath,
  action = 'view',
  featureKey,
  children,
  fallback = null,
}) => {
  const { hasPermission, isFeatureAllowed } = usePermissions();

  // 1. Check page action permission
  if (!hasPermission(menuPath, action)) {
    return <>{fallback}</>;
  }

  // 2. Check internal sub-feature / tab permission if specified
  if (featureKey && !isFeatureAllowed(menuPath, featureKey)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGate;
