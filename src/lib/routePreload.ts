/**
 * Central route-to-chunk preloader.
 * When the user hovers or touches a sidebar link, the JavaScript chunk for that
 * target page begins downloading in the background BEFORE the user clicks.
 * When they click, the chunk is already in memory/browser cache -> INSTANT load!
 */

type Loader = () => Promise<unknown>;

const ROUTE_LOADERS: Record<string, Loader> = {
  // Core / Dashboard
  '/admin': () => import('@/pages/admin/Dashboard'),
  '/admin/analytics': () => import('@/pages/admin/AdminAnalytics'),
  '/admin/reports': () => import('@/pages/admin/AdminReports'),
  '/admin/profile': () => import('@/pages/admin/AdminProfile'),
  '/admin/messages': () => import('@/pages/admin/AdminMessages'),

  // Students & Academics
  '/admin/students': () => import('@/pages/admin/AdminStudents'),
  '/admin/bulk-import': () => import('@/pages/admin/AdminBulkImport'),
  '/admin/student-categories': () => import('@/pages/admin/AdminStudentCategories'),
  '/admin/divisions': () => import('@/pages/admin/AdminDivisions'),
  '/admin/academic-sessions': () => import('@/pages/admin/AdminAcademicSessions'),
  '/admin/subjects': () => import('@/pages/admin/AdminSubjects'),
  '/admin/student-promotion': () => import('@/pages/admin/AdminStudentPromotion'),
  '/admin/student-certificates': () => import('@/pages/admin/AdminCertificates'),
  '/admin/admission-letters': () => import('@/pages/admin/AdminAdmissionLetters'),
  '/admin/admission-tests': () => import('@/pages/admin/AdminAdmissionTests'),
  '/admin/scholarships': () => import('@/pages/admin/AdminScholarships'),
  '/admin/student-approvals': () => import('@/pages/admin/AdminStudentApprovals'),
  '/admin/parent-approvals': () => import('@/pages/admin/AdminParentApprovals'),
  '/admin/id-cards': () => import('@/pages/admin/AdminIdCards'),
  '/admin/class-routine': () => import('@/pages/admin/AdminClassRoutine'),
  '/admin/exam-routine': () => import('@/pages/admin/AdminExamRoutine'),

  // Staff & HR
  '/admin/staff': () => import('@/pages/admin/AdminStaff'),
  '/admin/teachers': () => import('@/pages/admin/AdminTeachers'),
  '/admin/administrative-staff': () => import('@/pages/admin/AdminAdministrativeStaff'),
  '/admin/administrative': () => import('@/pages/admin/AdminAdministrative'),
  '/admin/support-staff': () => import('@/pages/admin/AdminSupportStaff'),
  '/admin/general-staff': () => import('@/pages/admin/AdminGeneralStaff'),
  '/admin/directors': () => import('@/pages/admin/AdminDirectors'),
  '/admin/committees': () => import('@/pages/admin/AdminCommittees'),
  '/admin/committee-members': () => import('@/pages/admin/AdminCommitteeMembers'),
  '/admin/designations': () => import('@/pages/admin/AdminDesignations'),
  '/admin/joining-letters': () => import('@/pages/admin/AdminJoiningLetters'),
  '/admin/resign-letters': () => import('@/pages/admin/AdminResignLetters'),
  '/admin/staff-reports': () => import('@/pages/admin/AdminStaffReports'),
  '/admin/staff-holidays': () => import('@/pages/admin/AdminStaffHolidays'),
  '/admin/duty-roster': () => import('@/pages/admin/AdminDutyRoster'),

  // Accounts & Finances
  '/admin/expenses': () => import('@/pages/admin/AdminExpenses'),
  '/admin/salary': () => import('@/pages/admin/AdminSalary'),
  '/admin/salary-pdf-columns': () => import('@/pages/admin/AdminSalaryPdfColumns'),
  '/admin/salary-memo-search': () => import('@/pages/admin/AdminSalaryMemoSearch'),
  '/admin/students-fees': () => import('@/pages/admin/AdminStudentsFees'),
  '/admin/fee-types': () => import('@/pages/admin/AdminFeeTypes'),
  '/admin/fee-categories': () => import('@/pages/admin/AdminFeeCategories'),
  '/admin/fee-receipts': () => import('@/pages/admin/AdminFeeReceipts'),
  '/admin/receipt-designer': () => import('@/pages/admin/AdminReceiptDesigner'),
  '/admin/verified-payments': () => import('@/pages/admin/AdminVerifiedPayments'),
  '/admin/donors': () => import('@/pages/admin/AdminDonors'),
  '/admin/payments': () => import('@/pages/admin/AdminPayments'),
  '/admin/budgets': () => import('@/pages/admin/AdminBudgets'),
  '/admin/zakat-fitra': () => import('@/pages/admin/AdminZakatFitra'),

  // Exams & Results
  '/admin/results': () => import('@/pages/admin/AdminResults'),
  '/admin/merit-list': () => import('@/pages/admin/AdminMeritList'),
  '/admin/exam-sessions': () => import('@/pages/admin/AdminExamSessions'),
  '/admin/question-papers': () => import('@/pages/admin/AdminQuestionPapers'),
  '/admin/online-exams': () => import('@/pages/admin/AdminOnlineExams'),
  '/admin/live-classes': () => import('@/pages/admin/AdminLiveClasses'),
  '/admin/meetings': () => import('@/pages/admin/AdminMeetings'),

  // Attendance
  '/admin/attendance': () => import('@/pages/admin/AdminAttendance'),
  '/admin/student-attendance': () => import('@/pages/admin/AdminStudentAttendance'),
  '/admin/staff-attendance': () => import('@/pages/admin/AdminStaffAttendance'),

  // Settings & System
  '/admin/settings': () => import('@/pages/admin/AdminSettings'),
  '/admin/website': () => import('@/pages/admin/AdminWebsite'),
  '/admin/permissions': () => import('@/pages/admin/AdminPermissions'),
  '/admin/user-management': () => import('@/pages/admin/AdminUserManagement'),
  '/admin/theme-customizer': () => import('@/pages/admin/AdminThemeCustomizer'),
  '/admin/menu-manager': () => import('@/pages/admin/AdminMenuManager'),
  '/admin/notices': () => import('@/pages/admin/AdminNotices'),
  '/admin/complaints': () => import('@/pages/admin/AdminComplaints'),
  '/admin/library': () => import('@/pages/admin/AdminLibrary'),
  '/admin/inventory': () => import('@/pages/admin/AdminInventory'),
  '/admin/hostel': () => import('@/pages/admin/AdminHostel'),
  '/admin/health-records': () => import('@/pages/admin/AdminHealthRecords'),
  '/admin/form-builder': () => import('@/pages/admin/AdminFormBuilder'),
  '/admin/backup': () => import('@/pages/admin/AdminBackup'),
  '/admin/system-logs': () => import('@/pages/admin/AdminSystemLogs'),
};

const preloadedRoutes = new Set<string>();

/**
 * Preloads the code chunk for a given route path immediately.
 * Safe to call multiple times; deduplicates automatically.
 */
export const preloadRouteChunk = (path: string) => {
  if (!path || preloadedRoutes.has(path)) return;
  const basePath = path.split('?')[0].split('#')[0];
  const loader = ROUTE_LOADERS[basePath];
  if (loader) {
    preloadedRoutes.add(basePath);
    try {
      loader().catch(() => {
        // Remove so retry can happen on next hover/click if network fails
        preloadedRoutes.delete(basePath);
      });
    } catch {
      preloadedRoutes.delete(basePath);
    }
  }
};
