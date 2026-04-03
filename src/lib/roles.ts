/**
 * Helper to check if a role has admin-level access.
 * super_admin and admin both get full system access.
 */
export const isAdminRole = (role: string | null | undefined): boolean => {
  return role === 'admin' || role === 'super_admin';
};
