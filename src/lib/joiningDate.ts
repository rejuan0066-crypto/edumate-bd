/**
 * Joining-date guard: a joining date can never be in the future.
 * Used by staff/officer forms; the same rule is enforced in DB triggers
 * (enforce_staff_joining_date / enforce_admin_officer_joining_date).
 */
export function isFutureJoiningDate(dateStr: string | null | undefined, today?: string): boolean {
  if (!dateStr) return false;
  const todayStr = today ?? new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  return dateStr > todayStr;
}
