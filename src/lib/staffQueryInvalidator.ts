import { QueryClient } from '@tanstack/react-query';

/**
 * Centrally invalidate all queries related to staff across all admin and public pages.
 * Calling this guarantees that updating/editing/deleting a staff member immediately refreshes:
 * - Staff list (/admin/staff)
 * - ID cards (/admin/id-cards)
 * - Attendance (/admin/attendance, /admin/staff-attendance)
 * - Salary & Payroll (/admin/salary)
 * - Duty roster (/admin/duty-roster)
 * - Reports & Analytics (/admin/reports, /admin/analytics)
 * - Dashboard (/admin)
 */
export const invalidateAllStaffQueries = async (queryClient: QueryClient) => {
  const staffQueryKeys = [
    ['staff'],
    ['current-staff'],
    ['staff-idcard'],
    ['staff-reports-staff'],
    ['duty-roster-staff'],
    ['salary-staff'],
    ['staff-for-resign'],
    ['health-staff'],
    ['staff-min-hostel'],
    ['admin-staff-devices'],
    ['dashboard-staff'],
    ['report-staff'],
    ['my-staff-record'],
  ];

  await Promise.all(
    staffQueryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
  );

  queryClient.invalidateQueries({
    predicate: (query) => {
      const firstKey = query.queryKey[0];
      return typeof firstKey === 'string' && (
        firstKey.includes('staff') ||
        firstKey.includes('salary') ||
        firstKey.includes('duty')
      );
    },
  });
};
