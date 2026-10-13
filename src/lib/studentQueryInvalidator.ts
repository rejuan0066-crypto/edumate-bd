import { QueryClient } from '@tanstack/react-query';

/**
 * Centrally invalidate all queries related to students across all admin and public pages.
 * Calling this guarantees that updating/editing/deleting a student immediately refreshes:
 * - Student list (/admin/students)
 * - ID cards (/admin/id-cards)
 * - Fees & payments (/admin/fees, /admin/students-fees)
 * - Attendance (/admin/attendance, /admin/student-attendance)
 * - Certificates (/admin/certificates)
 * - Analytics & Dashboard (/admin, /admin/analytics)
 * - Exam sessions & Results (/admin/exam-sessions, /admin/results, /results)
 * - Parent portal & public lookups
 */
export const invalidateAllStudentQueries = async (queryClient: QueryClient) => {
  const studentQueryKeys = [
    ['students'],
    ['students-attendance'],
    ['students-idcard'],
    ['students-for-fees'],
    ['students-for-cert'],
    ['students-for-notify'],
    ['students-min'],
    ['students-list-min'],
    ['student_counts_by_class'],
    ['students_for_exam_selection'],
    ['exam-students'],
    ['exam_session_students'],
    ['approvals-students'],
    ['analytics-students'],
    ['report-students'],
    ['dashboard-students'],
    ['promo-students'],
    ['student_fee_payments_status'],
    ['student_fee_payments_public'],
    ['student-info-search'],
    ['student-info-detail'],
    ['parent-linked-students'],
    ['parent-student'],
  ];

  await Promise.all(
    studentQueryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
  );

  // Invalidate any query matching predicate with 'student' in key
  queryClient.invalidateQueries({
    predicate: (query) => {
      const firstKey = query.queryKey[0];
      return typeof firstKey === 'string' && (
        firstKey.includes('student') ||
        firstKey.includes('promo') ||
        firstKey.includes('exam')
      );
    },
  });
};
