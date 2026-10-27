import { Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import ModuleGuard from "@/components/ModuleGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import AdminLayout from "@/components/AdminLayout";
import RouteShimmer from "@/components/RouteShimmer";
import { AdminUrlMask, UserPathRedirect } from "@/components/AdminUrlMask";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";
import { useDeviceRegistration } from "@/hooks/useDeviceRegistration";
import { useDeviceTrack } from "@/hooks/useDeviceTrack";
import { VisitorTracker } from "@/hooks/useVisitorTracker";

import ProtectedRoute from "@/components/ProtectedRoute";
import DynamicFavicon from "@/components/DynamicFavicon";
import UpdatePrompt from "@/components/UpdatePrompt";
import SessionTimeoutManager from "@/components/security/SessionTimeoutManager";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const DeviceRegistrar = () => {
  useDeviceRegistration();
  useDeviceTrack();
  return null;
};

// Lazy-loaded public pages (rarely visited on first PWA boot)
const About = lazy(() => import("./pages/About"));
const Gallery = lazy(() => import("./pages/Gallery"));
const NoticePage = lazy(() => import("./pages/NoticePage"));
const Contact = lazy(() => import("./pages/Contact"));
const ResultFind = lazy(() => import("./pages/ResultFind"));
const StudentInfoPage = lazy(() => import("./pages/StudentInfoPage"));
const AdmissionPage = lazy(() => import("./pages/AdmissionPage"));
const ApplicationTrackingPage = lazy(() => import("./pages/ApplicationTrackingPage"));
const AdmissionTestsPublic = lazy(() => import("./pages/AdmissionTestsPublic"));
const AdmissionTestTake = lazy(() => import("./pages/AdmissionTestTake"));
const AdmissionTestMerit = lazy(() => import("./pages/AdmissionTestMerit"));
const StaffApplicationPage = lazy(() => import("./pages/StaffApplicationPage"));
const DonationPage = lazy(() => import("./pages/DonationPage"));
const FeePaymentPage = lazy(() => import("./pages/FeePaymentPage"));
const ParentPortal = lazy(() => import("./pages/ParentPortal"));
const ParentPaymentReceipt = lazy(() => import("./pages/ParentPaymentReceipt"));
const VerifyReceipt = lazy(() => import("./pages/VerifyReceipt"));
const StudentPortal = lazy(() => import("./pages/StudentPortal"));
const PostsPage = lazy(() => import("./pages/PostsPage"));
const PhotoToolsPage = lazy(() => import("./pages/PhotoToolsPage"));
const OnlineExams = lazy(() => import("./pages/OnlineExams"));
const OnlineExamTake = lazy(() => import("./pages/OnlineExamTake"));
const LiveClasses = lazy(() => import("./pages/LiveClasses"));
const LiveClassRoom = lazy(() => import("./pages/LiveClassRoom"));
const MeetingRoom = lazy(() => import("./pages/MeetingRoom"));
const StaffDashboard = lazy(() => import("./pages/StaffDashboard"));
const WaitingApproval = lazy(() => import("./pages/WaitingApproval"));
const AttendanceCheckin = lazy(() => import("./pages/AttendanceCheckin"));
const StaffCheckin = lazy(() => import("./pages/StaffCheckin"));
const ComplaintPage = lazy(() => import("./pages/ComplaintPage"));
const ComplaintTrackPage = lazy(() => import("./pages/ComplaintTrackPage"));
const ZakatFitraPage = lazy(() => import("./pages/ZakatFitraPage"));
const AdminZakatFitra = lazy(() => import("./pages/admin/AdminZakatFitra"));
const AdminZakatLogs = lazy(() => import("./pages/admin/AdminZakatLogs"));
const QuranPage = lazy(() => import("./pages/QuranPage"));

// Lazy-loaded admin pages (huge bundle — never loaded on public PWA boot)
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminStudents = lazy(() => import("./pages/admin/AdminStudents"));
const AdminStaff = lazy(() => import("./pages/admin/AdminStaff"));
const AdminStaffProfilePage = lazy(() => import("./pages/admin/AdminStaffProfilePage"));
const AdminStudentProfilePage = lazy(() => import("./pages/admin/AdminStudentProfilePage"));
const AdminTeachers = lazy(() => import("./pages/admin/AdminTeachers"));
const AdminAdministrativeStaff = lazy(() => import("./pages/admin/AdminAdministrativeStaff"));
const AdminAdministrative = lazy(() => import("./pages/admin/AdminAdministrative"));
const AdminGeneralStaff = lazy(() => import("./pages/admin/AdminGeneralStaff"));
const AdminStaffForm = lazy(() => import("./pages/admin/AdminStaffForm"));
const AdminTeacherForm = lazy(() => import("./pages/admin/AdminTeacherForm"));
const AdminAdministrativeStaffForm = lazy(() => import("./pages/admin/AdminAdministrativeStaffForm"));
const AdminGeneralStaffForm = lazy(() => import("./pages/admin/AdminGeneralStaffForm"));
const AdminSupportStaff = lazy(() => import("./pages/admin/AdminSupportStaff"));
const AdminSupportStaffForm = lazy(() => import("./pages/admin/AdminSupportStaffForm"));
const AdminDirectors = lazy(() => import("./pages/admin/AdminDirectors"));
const AdminDirectorsForm = lazy(() => import("./pages/admin/AdminDirectorsForm"));
const AdminCommitteeMembers = lazy(() => import("./pages/admin/AdminCommitteeMembers"));
const AdminCommitteeMembersForm = lazy(() => import("./pages/admin/AdminCommitteeMembersForm"));
const AdminDivisions = lazy(() => import("./pages/admin/AdminDivisions"));
const AdminSubjects = lazy(() => import("./pages/admin/AdminSubjects"));
const AdminResults = lazy(() => import("./pages/admin/AdminResults"));
const AdminMeritList = lazy(() => import("./pages/admin/AdminMeritList"));
const AdminAdmissionTests = lazy(() => import("./pages/admin/AdminAdmissionTests"));
const AdminNotices = lazy(() => import("./pages/admin/AdminNotices"));
const AdminStudentsFees = lazy(() => import("./pages/admin/AdminStudentsFees"));
const AdminFeeTypes = lazy(() => import("./pages/admin/AdminFeeTypes"));
const AdminFeeCategories = lazy(() => import("./pages/admin/AdminFeeCategories"));
const AdminStudentCategories = lazy(() => import("./pages/admin/AdminStudentCategories"));
const AdminWebsite = lazy(() => import("./pages/admin/AdminWebsite"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminIdFormatSettings = lazy(() => import("./pages/admin/AdminIdFormatSettings"));
const AdminEmailTemplates = lazy(() => import("./pages/admin/AdminEmailTemplates"));
const AdminOtpRecovery = lazy(() => import("./pages/admin/AdminOtpRecovery"));
const AdminExpenses = lazy(() => import("./pages/admin/AdminExpenses"));
const AdminDonors = lazy(() => import("./pages/admin/AdminDonors"));
const AdminVerifiedPayments = lazy(() => import("./pages/admin/AdminVerifiedPayments"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const AdminFeeReceipts = lazy(() => import("./pages/admin/AdminFeeReceipts"));
const AdminFeePaymentsFix = lazy(() => import("./pages/admin/AdminFeePaymentsFix"));
const AdminReceiptStatusAudit = lazy(() => import("./pages/admin/AdminReceiptStatusAudit"));
const AdminResignLetters = lazy(() => import("./pages/admin/AdminResignLetters"));
const AdminJoiningLetters = lazy(() => import("./pages/admin/AdminJoiningLetters"));
const AdminAdmissionLetters = lazy(() => import("./pages/admin/AdminAdmissionLetters"));
const AdminDesignations = lazy(() => import("./pages/admin/AdminDesignations"));
const AdminTranslations = lazy(() => import("./pages/admin/AdminTranslations"));
const AdminFormBuilder = lazy(() => import("./pages/admin/AdminFormBuilder"));
const AdminCustomFormPage = lazy(() => import("./pages/admin/AdminCustomFormPage"));
const AdminModuleManager = lazy(() => import("./pages/admin/AdminModuleManager"));
const AdminFormulaBuilder = lazy(() => import("./pages/admin/AdminFormulaBuilder"));
const AdminAttendance = lazy(() => import("./pages/admin/AdminAttendance"));
const AdminDutyRoster = lazy(() => import("./pages/admin/AdminDutyRoster"));

const AdminStudentAttendance = lazy(() => import("./pages/admin/AdminStudentAttendance"));
const AdminStaffAttendance = lazy(() => import("./pages/admin/AdminStaffAttendance"));
const AdminValidationManager = lazy(() => import("./pages/admin/AdminValidationManager"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminStaffReports = lazy(() => import("./pages/admin/AdminStaffReports"));
const AdminPermissions = lazy(() => import("./pages/admin/AdminPermissions"));
const AdminThemeCustomizer = lazy(() => import("./pages/admin/AdminThemeCustomizer"));
import ThemeProvider from "./components/ThemeProvider";
import { BijoyProvider } from "./contexts/BijoyContext";
const AdminMenuManager = lazy(() => import("./pages/admin/AdminMenuManager"));
const AdminWidgetBuilder = lazy(() => import("./pages/admin/AdminWidgetBuilder"));
const AdminBackup = lazy(() => import("./pages/admin/AdminBackup"));
const AdminRecycleBin = lazy(() => import("./pages/admin/AdminRecycleBin"));
const AdminSystemLogs = lazy(() => import("./pages/admin/AdminSystemLogs"));
const AdminEmailDeliveryLog = lazy(() => import("./pages/admin/AdminEmailDeliveryLog"));
const AdminInventory = lazy(() => import("./pages/admin/AdminInventory"));
const AdminGuardianNotifications = lazy(() => import("./pages/admin/AdminGuardianNotifications"));
const AdminWhatsAppQueue = lazy(() => import("./pages/admin/AdminWhatsAppQueue"));
const AdminWhatsAppLogs = lazy(() => import("./pages/admin/AdminWhatsAppLogs"));
const AdminSalary = lazy(() => import("./pages/admin/AdminSalary"));
const AdminSalaryPdfColumns = lazy(() => import("./pages/admin/AdminSalaryPdfColumns"));
const AdminSalaryMemoSearch = lazy(() => import("./pages/admin/AdminSalaryMemoSearch"));
const AdminHealthCheck = lazy(() => import("./pages/admin/AdminHealthCheck"));
const AdminShiftAuditLog = lazy(() => import("./pages/admin/AdminShiftAuditLog"));
const AdminPosts = lazy(() => import("./pages/admin/AdminPosts"));
const AdminPrayerCalendar = lazy(() => import("./pages/admin/AdminPrayerCalendar"));
const AdminStaffHolidays = lazy(() => import("./pages/admin/AdminStaffHolidays"));
const AdminAcademicSessions = lazy(() => import("./pages/admin/AdminAcademicSessions"));
const AdminAddressManager = lazy(() => import("./pages/admin/AdminAddressManager"));
const AdminApiVerification = lazy(() => import("./pages/admin/AdminApiVerification"));
const AdminDesignStudio = lazy(() => import("./pages/admin/AdminDesignStudio"));
const AdminUserManagement = lazy(() => import("./pages/admin/AdminUserManagement"));
const AdminPhotoTools = lazy(() => import("./pages/admin/AdminPhotoTools"));
const AdminApprovals = lazy(() => import("./pages/admin/AdminApprovals"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminReceiptDesigner = lazy(() => import("./pages/admin/AdminReceiptDesigner"));
const AdminExamSessions = lazy(() => import("./pages/admin/AdminExamSessions"));
const AdminLibrary = lazy(() => import("./pages/admin/AdminLibrary"));
const AdminIdCards = lazy(() => import("./pages/admin/AdminIdCards"));
const AdminClassRoutine = lazy(() => import("./pages/admin/AdminClassRoutine"));
const AdminExamRoutine = lazy(() => import("./pages/admin/AdminExamRoutine"));
const AdminStudentPromotion = lazy(() => import("./pages/admin/AdminStudentPromotion"));
const AdminQuestionPapers = lazy(() => import("./pages/admin/AdminQuestionPapers"));
const AdminOnlineExams = lazy(() => import("./pages/admin/AdminOnlineExams"));
const AdminLiveClasses = lazy(() => import("./pages/admin/AdminLiveClasses"));
const AdminMeetings = lazy(() => import("./pages/admin/AdminMeetings"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminBulkImport = lazy(() => import("./pages/admin/AdminBulkImport"));
const AdminParentApprovals = lazy(() => import("./pages/admin/AdminParentApprovals"));
const AdminParentLinkAudit = lazy(() => import("./pages/admin/AdminParentLinkAudit"));
const AdminSignatoryAudit = lazy(() => import("./pages/admin/AdminSignatoryAudit"));
const AdminFooterAudit = lazy(() => import("./pages/admin/AdminFooterAudit"));
const AdminAdministrativeDebug = lazy(() => import("./pages/admin/AdminAdministrativeDebug"));
const AdminNamePermissionAudit = lazy(() => import("./pages/admin/AdminNamePermissionAudit"));
const AdminLibraryAudit = lazy(() => import("./pages/admin/AdminLibraryAudit"));
const AdminDonorsRoleAudit = lazy(() => import("./pages/admin/AdminDonorsRoleAudit"));
const AdminAuditDeviceAllowlist = lazy(() => import("./pages/admin/AdminAuditDeviceAllowlist"));
const AdminBlockedDevices = lazy(() => import("./pages/admin/AdminBlockedDevices"));
const AdminDeviceManagement = lazy(() => import("./pages/admin/AdminDeviceManagement"));
const AdminAccountsAudit = lazy(() => import("./pages/admin/AdminAccountsAudit"));
const AdminVerifiedPaymentsRoleAudit = lazy(() => import("./pages/admin/AdminVerifiedPaymentsRoleAudit"));
const AdminComplaintsRoleAudit = lazy(() => import("./pages/admin/AdminComplaintsRoleAudit"));
const AdminReceiptsRoleAudit = lazy(() => import("./pages/admin/AdminReceiptsRoleAudit"));
const AdminStudentApprovals = lazy(() => import("./pages/admin/AdminStudentApprovals"));
const AdminParentMessages = lazy(() => import("@/pages/admin/AdminParentMessages"));
const AdminMessages = lazy(() => import("@/pages/admin/AdminMessages"));
const AdminPushNotifications = lazy(() => import("@/pages/admin/AdminPushNotifications"));
const AdminCertificates = lazy(() => import("./pages/admin/AdminCertificates"));
const AdminScholarships = lazy(() => import("./pages/admin/AdminScholarships"));
const AdminBudgets = lazy(() => import("./pages/admin/AdminBudgets"));
const AdminComplaints = lazy(() => import("./pages/admin/AdminComplaints"));
const AdminComplaintFields = lazy(() => import("./pages/admin/AdminComplaintFields"));
const AdminParentSignupFields = lazy(() => import("./pages/admin/AdminParentSignupFields"));
const AdminHostel = lazy(() => import("@/pages/admin/AdminHostel"));
const AdminHealthRecords = lazy(() => import("@/pages/admin/AdminHealthRecords"));
const AdminCommittees = lazy(() => import("@/pages/admin/AdminCommittees"));
const AdminCommitteeAuditLog = lazy(() => import("@/pages/admin/AdminCommitteeAuditLog"));
import ScrollToTop from "./components/ScrollToTop";
import ScrollNavigation from "./components/ScrollNavigation";
import { useLocation } from "react-router-dom";
const HideOnRoutes = ({ paths, children }: { paths: string[]; children: React.ReactNode }) => {
  const { pathname } = useLocation();
  if (paths.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;
  return <>{children}</>;
};

import RoutePrefetcher from "./components/RoutePrefetcher";
import InstallPrompt from "./components/InstallPrompt";
import NetworkStatusIndicator from "./components/NetworkStatusIndicator";
import FloatingWhatsAppButton from "./components/FloatingWhatsAppButton";
import { supabase } from "@/integrations/supabase/client";

let isRefreshingSession = false;

// Detects auth/token failures that should trigger a silent session refresh.
// Covers both PostgREST errors and the Lovable Cloud data-API gateway envelope
// ({"type":"unauthorized","message":"Invalid token"}).
const isTokenError = (message: string): boolean => {
  const m = message.toLowerCase();
  return (
    m.includes('jwt expired') ||
    m.includes('pgrst303') ||
    m.includes('invalid claim') ||
    m.includes('missing sub claim') ||
    m.includes('invalid token') ||
    m.includes('token is expired') ||
    m.includes('token expired') ||
    m.includes('bad_jwt') ||
    m.includes('jwt is expired') ||
    (m.includes('unauthorized') && m.includes('token'))
  );
};

const clearLocalExpiredSession = async () => {
  await supabase.auth.signOut({ scope: 'local' });
  queryClient.clear();
};

// Confirms with the auth server whether the current session is still usable.
// Used before destroying a session so that a transient 401 from one query does
// not log the user out while their refresh token is perfectly valid.
const sessionStillValid = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.getUser();
    return !error && !!data.user;
  } catch {
    // Network failure -> assume still valid, keep the user signed in.
    return true;
  }
};

const handleAuthError = async (error: unknown) => {
  if (isRefreshingSession) return;
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (!isTokenError(message)) return;

  isRefreshingSession = true;
  try {
    const {
      data: { session: previousSession },
    } = await supabase.auth.getSession();
    const previousAccessToken = previousSession?.access_token ?? null;

    const { data, error: refreshError } = await supabase.auth.refreshSession();
    const nextAccessToken = data.session?.access_token ?? null;

    if (nextAccessToken && nextAccessToken !== previousAccessToken) {
      queryClient.invalidateQueries();
      return;
    }

    // Either the refresh failed or supabase-js returned the still-valid cached
    // token. Only sign out when the auth server itself rejects the session.
    if (refreshError || !nextAccessToken) {
      if (await sessionStillValid()) {
        queryClient.invalidateQueries();
        return;
      }
      await clearLocalExpiredSession();
      return;
    }

    // Same token returned and no error: session is fine, just refetch.
    queryClient.invalidateQueries();
  } catch {
    if (!(await sessionStillValid())) {
      await clearLocalExpiredSession();
    }
  } finally {
    isRefreshingSession = false;
  }
};



const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleAuthError,
  }),
  mutationCache: new MutationCache({
    onError: handleAuthError,
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const msg = error instanceof Error ? error.message : String(error ?? '');
        // Allow token/JWT errors to retry a few times (session may be refreshing)
        if (isTokenError(msg)) return failureCount < 3;
        return failureCount < 1;
      },

      retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 3000),
      staleTime: 2 * 60_000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const AdminShell = () => (
  <ProtectedRoute>
    <AdminLayout>
      {/* Inner Suspense keeps the admin shell mounted while a lazy page chunk
          loads, so navigation shows a single contained shimmer instead of a
          full-screen loader swap (the "double flash"). */}
      <ErrorBoundary>
        <Suspense fallback={<RouteShimmer />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </AdminLayout>
  </ProtectedRoute>
);

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <DeviceRegistrar />
          <ThemeProvider>
            <BijoyProvider>
            <TooltipProvider>
              <ConfirmProvider>
              <Toaster />
              <Sonner />
              <DynamicFavicon />
              <UpdatePrompt />
              <BrowserRouter>
                <VisitorTracker />
                <SessionTimeoutManager />
                <RoutePrefetcher />
                {/* Global so the "/user/..." address stays masked on every
                    route, including not-found pages. */}
                <AdminUrlMask />
                <HideOnRoutes paths={["/quran"]}>
                  <ScrollToTop />
                  <ScrollNavigation />
                </HideOnRoutes>
                <InstallPrompt />
                <NetworkStatusIndicator />
                <HideOnRoutes paths={["/quran"]}>
                  <FloatingWhatsAppButton />
                </HideOnRoutes>
                <Suspense fallback={<RouteShimmer />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/notices" element={<NoticePage />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/result" element={<ResultFind />} />
                  <Route path="/student-info" element={<StudentInfoPage />} />
                  <Route path="/admission" element={<AdmissionPage />} />
                  <Route path="/application-tracking" element={<ApplicationTrackingPage />} />
                  <Route path="/track-application" element={<ApplicationTrackingPage />} />
                  <Route path="/admission-tests" element={<AdmissionTestsPublic />} />
                  <Route path="/admission-test/:id" element={<AdmissionTestTake />} />
                  <Route path="/admission-test/:id/merit" element={<AdmissionTestMerit />} />
                  <Route path="/staff-application" element={<StaffApplicationPage />} />
                  <Route path="/donation" element={<DonationPage />} />
                  <Route path="/fee-payment" element={<FeePaymentPage />} />
                  <Route path="/posts" element={<PostsPage />} />
                  <Route path="/photo-tools" element={<PhotoToolsPage />} />
                  <Route path="/exams" element={<OnlineExams />} />
                  <Route path="/exam/:id" element={<OnlineExamTake />} />
                  <Route path="/live-classes" element={<LiveClasses />} />
                  <Route path="/live-class/:id" element={<LiveClassRoom />} />
                  <Route path="/meeting/:id" element={<MeetingRoom />} />
                  <Route path="/staff-dashboard" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
                  <Route path="/waiting-approval" element={<WaitingApproval />} />
                  <Route path="/attendance-checkin" element={<AttendanceCheckin />} />
                  <Route path="/staff-checkin" element={<StaffCheckin />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/parent" element={<ParentPortal />} />
                  <Route path="/parent/receipt/:requestId" element={<ParentPaymentReceipt />} />
                  <Route path="/verify-receipt/:token" element={<VerifyReceipt />} />
                  <Route path="/student-portal" element={<StudentPortal />} />
                  <Route path="/complaints" element={<ComplaintPage />} />
                  <Route path="/complaints/track" element={<ComplaintTrackPage />} />
                  <Route path="/zakat-fitra" element={<ZakatFitraPage />} />
                  <Route path="/quran" element={<QuranPage />} />

                  <Route path="/user/*" element={<UserPathRedirect />} />

                  <Route path="/admin" element={<AdminShell />}>
                    <Route index element={<Dashboard />} />
                    <Route path="analytics" element={<ModuleGuard menuPath="/admin/analytics"><AdminAnalytics /></ModuleGuard>} />
                    <Route path="bulk-import" element={<ModuleGuard menuPath="/admin/bulk-import"><AdminBulkImport /></ModuleGuard>} />
                    <Route path="hostel" element={<ModuleGuard menuPath="/admin/hostel"><AdminHostel /></ModuleGuard>} />
                    <Route path="health-records" element={<ModuleGuard menuPath="/admin/health-records"><AdminHealthRecords /></ModuleGuard>} />
                    <Route path="committees" element={<ModuleGuard menuPath="/admin/committees"><AdminCommittees /></ModuleGuard>} />
                    <Route path="committee-audit-log" element={<ModuleGuard menuPath="/admin/committee-audit-log"><AdminCommitteeAuditLog /></ModuleGuard>} />
                    <Route path="students" element={<ModuleGuard menuPath="/admin/students"><AdminStudents /></ModuleGuard>} />
                    <Route path="students/profile/:id" element={<ModuleGuard menuPath="/admin/students"><AdminStudentProfilePage /></ModuleGuard>} />
                    <Route path="staff" element={<ModuleGuard menuPath="/admin/staff"><AdminStaff staffType="all" /></ModuleGuard>} />
                    <Route path="staff/profile/:id" element={<ModuleGuard menuPath="/admin/staff"><AdminStaffProfilePage /></ModuleGuard>} />
                    <Route path="teachers/profile/:id" element={<ModuleGuard menuPath="/admin/teachers"><AdminStaffProfilePage /></ModuleGuard>} />
                    <Route path="general-staff/profile/:id" element={<ModuleGuard menuPath="/admin/general-staff"><AdminStaffProfilePage /></ModuleGuard>} />
                    <Route path="staff/add" element={<ModuleGuard action="add" menuPath="/admin/staff"><AdminStaffForm /></ModuleGuard>} />
                    <Route path="staff/edit/:id" element={<ModuleGuard action="edit" menuPath="/admin/staff"><AdminStaffForm /></ModuleGuard>} />
                    <Route path="general-staff" element={<ModuleGuard menuPath="/admin/general-staff"><AdminGeneralStaff /></ModuleGuard>} />
                    <Route path="general-staff/add" element={<ModuleGuard action="add" menuPath="/admin/general-staff"><AdminGeneralStaffForm /></ModuleGuard>} />
                    <Route path="general-staff/edit/:id" element={<ModuleGuard action="edit" menuPath="/admin/general-staff"><AdminGeneralStaffForm /></ModuleGuard>} />
                    <Route path="teachers" element={<ModuleGuard menuPath="/admin/teachers"><AdminTeachers /></ModuleGuard>} />
                    <Route path="teachers/add" element={<ModuleGuard action="add" menuPath="/admin/teachers"><AdminTeacherForm /></ModuleGuard>} />
                    <Route path="teachers/edit/:id" element={<ModuleGuard action="edit" menuPath="/admin/teachers"><AdminTeacherForm /></ModuleGuard>} />
                    <Route path="administrative-staff" element={<ModuleGuard menuPath="/admin/administrative-staff"><AdminAdministrativeStaff /></ModuleGuard>} />
                    <Route path="administrative-staff/add" element={<ModuleGuard action="add" menuPath="/admin/administrative-staff"><AdminAdministrativeStaffForm /></ModuleGuard>} />
                    <Route path="administrative-staff/edit/:id" element={<ModuleGuard action="edit" menuPath="/admin/administrative-staff"><AdminAdministrativeStaffForm /></ModuleGuard>} />
                    <Route path="administrative" element={<ModuleGuard menuPath="/admin/administrative"><AdminAdministrative /></ModuleGuard>} />
                    <Route path="support-staff" element={<ModuleGuard menuPath="/admin/support-staff"><AdminSupportStaff /></ModuleGuard>} />
                    <Route path="support-staff/add" element={<ModuleGuard action="add" menuPath="/admin/support-staff"><AdminSupportStaffForm /></ModuleGuard>} />
                    <Route path="support-staff/edit/:id" element={<ModuleGuard action="edit" menuPath="/admin/support-staff"><AdminSupportStaffForm /></ModuleGuard>} />
                    <Route path="directors" element={<ModuleGuard menuPath="/admin/directors"><AdminDirectors /></ModuleGuard>} />
                    <Route path="directors/add" element={<ModuleGuard action="add" menuPath="/admin/directors"><AdminDirectorsForm /></ModuleGuard>} />
                    <Route path="directors/edit/:id" element={<ModuleGuard action="edit" menuPath="/admin/directors"><AdminDirectorsForm /></ModuleGuard>} />
                    <Route path="committee-members" element={<ModuleGuard menuPath="/admin/committee-members"><AdminCommitteeMembers /></ModuleGuard>} />
                    <Route path="committee-members/add" element={<ModuleGuard action="add" menuPath="/admin/committee-members"><AdminCommitteeMembersForm /></ModuleGuard>} />
                    <Route path="committee-members/edit/:id" element={<ModuleGuard action="edit" menuPath="/admin/committee-members"><AdminCommitteeMembersForm /></ModuleGuard>} />
                    <Route path="divisions" element={<ModuleGuard menuPath="/admin/divisions"><AdminDivisions /></ModuleGuard>} />
                    <Route path="subjects" element={<ModuleGuard menuPath="/admin/subjects"><AdminSubjects /></ModuleGuard>} />
                    <Route path="results" element={<ModuleGuard menuPath="/admin/results"><AdminResults /></ModuleGuard>} />
                    <Route path="merit-list" element={<ModuleGuard menuPath="/admin/merit-list"><AdminMeritList /></ModuleGuard>} />
                    <Route path="notices" element={<ModuleGuard menuPath="/admin/notices"><AdminNotices /></ModuleGuard>} />
                    <Route path="students-fees" element={<ModuleGuard menuPath="/admin/students-fees"><AdminStudentsFees /></ModuleGuard>} />
                    <Route path="fee-types" element={<ModuleGuard menuPath="/admin/fee-types"><AdminFeeTypes /></ModuleGuard>} />
                    <Route path="fee-categories" element={<ModuleGuard menuPath="/admin/fee-categories"><AdminFeeCategories /></ModuleGuard>} />
                    <Route path="student-categories" element={<ModuleGuard menuPath="/admin/student-categories"><AdminStudentCategories /></ModuleGuard>} />
                    <Route path="website" element={<ModuleGuard menuPath="/admin/website"><AdminWebsite /></ModuleGuard>} />
                    <Route path="expenses" element={<ModuleGuard menuPath="/admin/expenses"><AdminExpenses /></ModuleGuard>} />
                    <Route path="donors" element={<ModuleGuard menuPath="/admin/donors"><AdminDonors /></ModuleGuard>} />
                    <Route path="verified-payments" element={<ModuleGuard menuPath="/admin/verified-payments"><AdminVerifiedPayments /></ModuleGuard>} />
                    <Route path="profile" element={<AdminProfile />} />
                    <Route path="fee-receipts" element={<ModuleGuard menuPath="/admin/fee-receipts"><AdminFeeReceipts /></ModuleGuard>} />
                    <Route path="fee-payments-fix" element={<ModuleGuard menuPath="/admin/fee-receipts"><AdminFeePaymentsFix /></ModuleGuard>} />
                    <Route path="receipt-audit" element={<ModuleGuard menuPath="/admin/receipt-audit"><AdminReceiptStatusAudit /></ModuleGuard>} />
                    <Route path="resign-letters" element={<ModuleGuard menuPath="/admin/resign-letters"><AdminResignLetters /></ModuleGuard>} />
                    <Route path="joining-letters" element={<ModuleGuard menuPath="/admin/joining-letters"><AdminJoiningLetters /></ModuleGuard>} />
                    <Route path="admission-letters" element={<ModuleGuard menuPath="/admin/admission-letters"><AdminAdmissionLetters /></ModuleGuard>} />
                    <Route path="student-certificates" element={<ModuleGuard menuPath="/admin/student-certificates"><AdminCertificates /></ModuleGuard>} />
                    <Route path="designations" element={<ModuleGuard menuPath="/admin/designations"><AdminDesignations /></ModuleGuard>} />
                    <Route path="translations" element={<ModuleGuard menuPath="/admin/translations"><AdminTranslations /></ModuleGuard>} />
                    <Route path="form-builder" element={<ModuleGuard menuPath="/admin/form-builder"><AdminFormBuilder /></ModuleGuard>} />
                    <Route path="custom/:slug" element={<AdminCustomFormPage />} />
                    <Route path="module-manager" element={<ModuleGuard menuPath="/admin/module-manager"><AdminModuleManager /></ModuleGuard>} />
                    <Route path="formula-builder" element={<ModuleGuard menuPath="/admin/formula-builder"><AdminFormulaBuilder /></ModuleGuard>} />
                    <Route path="attendance" element={<ModuleGuard menuPath="/admin/attendance"><AdminAttendance /></ModuleGuard>} />
                    <Route path="student-attendance" element={<ModuleGuard menuPath="/admin/student-attendance"><AdminAttendance forcedTab="student" /></ModuleGuard>} />
                    <Route path="staff-attendance" element={<ModuleGuard menuPath="/admin/staff-attendance"><AdminAttendance forcedTab="staff" /></ModuleGuard>} />
                    <Route path="duty-roster" element={<ModuleGuard menuPath="/admin/duty-roster"><AdminDutyRoster /></ModuleGuard>} />

                    <Route path="validation-manager" element={<ModuleGuard menuPath="/admin/validation-manager"><AdminValidationManager /></ModuleGuard>} />
                    <Route path="reports" element={<ModuleGuard menuPath="/admin/reports"><AdminReports /></ModuleGuard>} />
                    <Route path="staff-reports" element={<ModuleGuard menuPath="/admin/staff-reports"><AdminStaffReports /></ModuleGuard>} />
                    <Route path="permissions" element={<ModuleGuard menuPath="/admin/permissions"><AdminPermissions /></ModuleGuard>} />
                    <Route path="theme" element={<ModuleGuard menuPath="/admin/theme"><AdminThemeCustomizer /></ModuleGuard>} />
                    <Route path="menu-manager" element={<ModuleGuard menuPath="/admin/menu-manager"><AdminMenuManager /></ModuleGuard>} />
                    <Route path="widget-builder" element={<ModuleGuard menuPath="/admin/widget-builder"><AdminWidgetBuilder /></ModuleGuard>} />
                    <Route path="backup" element={<ModuleGuard menuPath="/admin/backup"><AdminBackup /></ModuleGuard>} />
                    <Route path="recycle-bin" element={<ModuleGuard menuPath="/admin/recycle-bin"><AdminRecycleBin /></ModuleGuard>} />
                    <Route path="system-logs" element={<ModuleGuard menuPath="/admin/system-logs"><AdminSystemLogs /></ModuleGuard>} />
                    <Route path="health-check" element={<ModuleGuard menuPath="/admin/health-check"><AdminHealthCheck /></ModuleGuard>} />
                    <Route path="email-delivery-log" element={<ModuleGuard menuPath="/admin/email-delivery-log"><AdminEmailDeliveryLog /></ModuleGuard>} />
                    <Route path="inventory" element={<ModuleGuard menuPath="/admin/inventory"><AdminInventory /></ModuleGuard>} />
                    <Route path="guardian-notify" element={<ModuleGuard menuPath="/admin/guardian-notify"><AdminGuardianNotifications /></ModuleGuard>} />
                    <Route path="whatsapp-queue" element={<ModuleGuard menuPath="/admin/whatsapp-queue"><AdminWhatsAppQueue /></ModuleGuard>} />
                    <Route path="whatsapp-logs" element={<ModuleGuard menuPath="/admin/whatsapp-logs"><AdminWhatsAppLogs /></ModuleGuard>} />
                    <Route path="salary" element={<ModuleGuard menuPath="/admin/salary"><AdminSalary /></ModuleGuard>} />
                    <Route path="salary-pdf-columns" element={<ModuleGuard menuPath="/admin/salary"><AdminSalaryPdfColumns /></ModuleGuard>} />
                    <Route path="salary-memo-search" element={<ModuleGuard menuPath="/admin/salary"><AdminSalaryMemoSearch /></ModuleGuard>} />
                    <Route path="shift-audit-log" element={<ModuleGuard menuPath="/admin/shift-audit-log"><AdminShiftAuditLog /></ModuleGuard>} />
                    <Route path="posts" element={<ModuleGuard menuPath="/admin/posts"><AdminPosts /></ModuleGuard>} />
                    <Route path="prayer-calendar" element={<ModuleGuard menuPath="/admin/prayer-calendar"><AdminPrayerCalendar /></ModuleGuard>} />
                    <Route path="zakat-fitra" element={<ModuleGuard menuPath="/admin/zakat-fitra"><AdminZakatFitra /></ModuleGuard>} />
                    <Route path="zakat-logs" element={<ModuleGuard menuPath="/admin/zakat-logs"><AdminZakatLogs /></ModuleGuard>} />
                    <Route path="staff-holidays" element={<ModuleGuard menuPath="/admin/staff-holidays"><AdminStaffHolidays /></ModuleGuard>} />
                    <Route path="academic-sessions" element={<ModuleGuard menuPath="/admin/academic-sessions"><AdminAcademicSessions /></ModuleGuard>} />
                    <Route path="address-manager" element={<ModuleGuard menuPath="/admin/address-manager"><AdminAddressManager /></ModuleGuard>} />
                    <Route path="api-verification" element={<ModuleGuard menuPath="/admin/api-verification"><AdminApiVerification /></ModuleGuard>} />
                    <Route path="user-management" element={<ModuleGuard menuPath="/admin/user-management"><AdminUserManagement /></ModuleGuard>} />
                    <Route path="approvals" element={<ModuleGuard menuPath="/admin/approvals"><AdminApprovals /></ModuleGuard>} />
                    <Route path="parent-approvals" element={<ModuleGuard menuPath="/admin/parent-approvals"><AdminParentApprovals /></ModuleGuard>} />
                    <Route path="parent-link-audit" element={<ModuleGuard menuPath="/admin/parent-link-audit"><AdminParentLinkAudit /></ModuleGuard>} />
                    <Route path="signatory-audit" element={<ModuleGuard menuPath="/admin/signatory-audit"><AdminSignatoryAudit /></ModuleGuard>} />
                    <Route path="footer-audit" element={<ModuleGuard menuPath="/admin/footer-audit"><AdminFooterAudit /></ModuleGuard>} />
                    <Route path="administrative-debug" element={<ModuleGuard menuPath="/admin/administrative-debug"><AdminAdministrativeDebug /></ModuleGuard>} />
                    <Route path="name-permission-audit" element={<ModuleGuard menuPath="/admin/name-permission-audit"><AdminNamePermissionAudit /></ModuleGuard>} />
                    <Route path="donors-role-audit" element={<ModuleGuard menuPath="/admin/donors-role-audit"><AdminDonorsRoleAudit /></ModuleGuard>} />
                    <Route path="audit-device-allowlist" element={<ModuleGuard menuPath="/admin/audit-device-allowlist"><AdminAuditDeviceAllowlist /></ModuleGuard>} />
                    <Route path="device-management" element={<ModuleGuard menuPath="/admin/device-management"><AdminDeviceManagement /></ModuleGuard>} />
                    <Route path="accounts-audit" element={<ModuleGuard menuPath="/admin/accounts-audit"><AdminAccountsAudit /></ModuleGuard>} />
                    <Route path="blocked-devices" element={<ModuleGuard menuPath="/admin/blocked-devices"><AdminBlockedDevices /></ModuleGuard>} />
                    <Route path="verified-payments-role-audit" element={<ModuleGuard menuPath="/admin/verified-payments-role-audit"><AdminVerifiedPaymentsRoleAudit /></ModuleGuard>} />
                    <Route path="complaints-role-audit" element={<ModuleGuard menuPath="/admin/complaints-role-audit"><AdminComplaintsRoleAudit /></ModuleGuard>} />
                    <Route path="receipts-role-audit" element={<ModuleGuard menuPath="/admin/receipts-role-audit"><AdminReceiptsRoleAudit /></ModuleGuard>} />
                    <Route path="student-approvals" element={<ModuleGuard menuPath="/admin/student-approvals"><AdminStudentApprovals /></ModuleGuard>} />
                    <Route path="parent-messages" element={<ModuleGuard menuPath="/admin/parent-messages"><AdminParentMessages /></ModuleGuard>} />
                    <Route path="messages" element={<AdminMessages />} />
                    <Route path="push-notifications" element={<ModuleGuard menuPath="/admin/push-notifications"><AdminPushNotifications /></ModuleGuard>} />
                    <Route path="photo-tools" element={<ModuleGuard menuPath="/admin/photo-tools"><AdminPhotoTools /></ModuleGuard>} />
                    <Route path="design-studio" element={<ModuleGuard menuPath="/admin/design-studio"><AdminDesignStudio /></ModuleGuard>} />
                    <Route path="payments" element={<ModuleGuard menuPath="/admin/payments"><AdminPayments /></ModuleGuard>} />
                    <Route path="receipt-designer" element={<ModuleGuard menuPath="/admin/receipt-designer"><AdminReceiptDesigner /></ModuleGuard>} />
                    <Route path="exam-sessions" element={<ModuleGuard menuPath="/admin/exam-sessions"><AdminExamSessions /></ModuleGuard>} />
                    <Route path="library" element={<ModuleGuard menuPath="/admin/library"><AdminLibrary /></ModuleGuard>} />
                    <Route path="library-audit" element={<ModuleGuard menuPath="/admin/library-audit"><AdminLibraryAudit /></ModuleGuard>} />
                    <Route path="id-cards" element={<ModuleGuard menuPath="/admin/id-cards"><AdminIdCards /></ModuleGuard>} />
                    <Route path="class-routine" element={<ModuleGuard menuPath="/admin/class-routine"><AdminClassRoutine /></ModuleGuard>} />
                    <Route path="exam-routine" element={<ModuleGuard menuPath="/admin/exam-routine"><AdminExamRoutine /></ModuleGuard>} />
                    <Route path="student-promotion" element={<ModuleGuard menuPath="/admin/student-promotion"><AdminStudentPromotion /></ModuleGuard>} />
                    <Route path="question-papers" element={<ModuleGuard menuPath="/admin/question-papers"><AdminQuestionPapers /></ModuleGuard>} />
                    <Route path="online-exams" element={<ModuleGuard menuPath="/admin/online-exams"><AdminOnlineExams /></ModuleGuard>} />
                    <Route path="live-classes" element={<ModuleGuard menuPath="/admin/live-classes"><AdminLiveClasses /></ModuleGuard>} />
                    <Route path="meetings" element={<ModuleGuard menuPath="/admin/meetings"><AdminMeetings /></ModuleGuard>} />
                    <Route path="admission-tests" element={<ModuleGuard menuPath="/admin/admission-tests"><AdminAdmissionTests /></ModuleGuard>} />
                    <Route path="scholarships" element={<ModuleGuard menuPath="/admin/scholarships"><AdminScholarships /></ModuleGuard>} />
                    <Route path="budgets" element={<ModuleGuard menuPath="/admin/budgets"><AdminBudgets /></ModuleGuard>} />
                    <Route path="complaints" element={<ModuleGuard menuPath="/admin/complaints"><AdminComplaints /></ModuleGuard>} />
                    <Route path="complaints/fields" element={<ModuleGuard menuPath="/admin/complaints"><AdminComplaintFields /></ModuleGuard>} />
                    <Route path="parent-signup-fields" element={<ModuleGuard menuPath="/admin/parent-signup-fields"><AdminParentSignupFields /></ModuleGuard>} />
                    <Route path="settings" element={<ModuleGuard menuPath="/admin/settings"><AdminSettings /></ModuleGuard>} />
                    <Route path="settings/id-format" element={<ModuleGuard menuPath="/admin/settings"><AdminIdFormatSettings /></ModuleGuard>} />
                    <Route path="email-templates" element={<ModuleGuard menuPath="/admin/email-templates"><AdminEmailTemplates /></ModuleGuard>} />
                    <Route path="otp-recovery" element={<ModuleGuard menuPath="/admin/otp-recovery"><AdminOtpRecovery /></ModuleGuard>} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
              </BrowserRouter>
              </ConfirmProvider>
            </TooltipProvider>
            </BijoyProvider>
          </ThemeProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
