import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import ModuleGuard from "@/components/ModuleGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import AdminLayout from "@/components/AdminLayout";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DynamicFavicon from "@/components/DynamicFavicon";
import UpdatePrompt from "@/components/UpdatePrompt";
import Home from "./pages/Home";
import About from "./pages/About";
import Gallery from "./pages/Gallery";
import NoticePage from "./pages/NoticePage";
import Contact from "./pages/Contact";
import ResultFind from "./pages/ResultFind";
import StudentInfoPage from "./pages/StudentInfoPage";
import AdmissionPage from "./pages/AdmissionPage";
import AdmissionTestsPublic from "./pages/AdmissionTestsPublic";
import AdmissionTestTake from "./pages/AdmissionTestTake";
import AdmissionTestMerit from "./pages/AdmissionTestMerit";
import StaffApplicationPage from "./pages/StaffApplicationPage";
import DonationPage from "./pages/DonationPage";
import FeePaymentPage from "./pages/FeePaymentPage";
import Login from "./pages/Login";
import ParentPortal from "./pages/ParentPortal";
import Dashboard from "./pages/admin/Dashboard";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminTeachers from "./pages/admin/AdminTeachers";
import AdminAdministrativeStaff from "./pages/admin/AdminAdministrativeStaff";
import AdminGeneralStaff from "./pages/admin/AdminGeneralStaff";
import AdminStaffForm from "./pages/admin/AdminStaffForm";
import AdminTeacherForm from "./pages/admin/AdminTeacherForm";
import AdminAdministrativeStaffForm from "./pages/admin/AdminAdministrativeStaffForm";
import AdminGeneralStaffForm from "./pages/admin/AdminGeneralStaffForm";
import AdminSupportStaff from "./pages/admin/AdminSupportStaff";
import AdminSupportStaffForm from "./pages/admin/AdminSupportStaffForm";
import AdminDivisions from "./pages/admin/AdminDivisions";
import AdminSubjects from "./pages/admin/AdminSubjects";
import AdminResults from "./pages/admin/AdminResults";
import AdminMeritList from "./pages/admin/AdminMeritList";
import AdminAdmissionTests from "./pages/admin/AdminAdmissionTests";
import AdminNotices from "./pages/admin/AdminNotices";
import AdminStudentsFees from "./pages/admin/AdminStudentsFees";
import AdminFeeTypes from "./pages/admin/AdminFeeTypes";
import AdminFeeCategories from "./pages/admin/AdminFeeCategories";
import AdminStudentCategories from "./pages/admin/AdminStudentCategories";
import AdminWebsite from "./pages/admin/AdminWebsite";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminExpenses from "./pages/admin/AdminExpenses";
import AdminDonors from "./pages/admin/AdminDonors";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminFeeReceipts from "./pages/admin/AdminFeeReceipts";
import AdminResignLetters from "./pages/admin/AdminResignLetters";
import AdminJoiningLetters from "./pages/admin/AdminJoiningLetters";
import AdminAdmissionLetters from "./pages/admin/AdminAdmissionLetters";
import AdminDesignations from "./pages/admin/AdminDesignations";
import AdminFormBuilder from "./pages/admin/AdminFormBuilder";
import AdminCustomFormPage from "./pages/admin/AdminCustomFormPage";
import AdminModuleManager from "./pages/admin/AdminModuleManager";
import AdminFormulaBuilder from "./pages/admin/AdminFormulaBuilder";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminStudentAttendance from "./pages/admin/AdminStudentAttendance";
import AdminStaffAttendance from "./pages/admin/AdminStaffAttendance";
import AdminValidationManager from "./pages/admin/AdminValidationManager";
import AdminReports from "./pages/admin/AdminReports";
import AdminStaffReports from "./pages/admin/AdminStaffReports";
import AdminPermissions from "./pages/admin/AdminPermissions";
import AdminThemeCustomizer from "./pages/admin/AdminThemeCustomizer";
import ThemeProvider from "./components/ThemeProvider";
import { BijoyProvider } from "./contexts/BijoyContext";
import AdminMenuManager from "./pages/admin/AdminMenuManager";
import AdminWidgetBuilder from "./pages/admin/AdminWidgetBuilder";
import AdminBackup from "./pages/admin/AdminBackup";
import AdminRecycleBin from "./pages/admin/AdminRecycleBin";
import AdminSystemLogs from "./pages/admin/AdminSystemLogs";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminGuardianNotifications from "./pages/admin/AdminGuardianNotifications";
import AdminWhatsAppQueue from "./pages/admin/AdminWhatsAppQueue";
import AdminSalary from "./pages/admin/AdminSalary";
import AdminPosts from "./pages/admin/AdminPosts";
import AdminPrayerCalendar from "./pages/admin/AdminPrayerCalendar";
import AdminAcademicSessions from "./pages/admin/AdminAcademicSessions";
import AdminAddressManager from "./pages/admin/AdminAddressManager";
import AdminApiVerification from "./pages/admin/AdminApiVerification";
import PostsPage from "./pages/PostsPage";
import PhotoToolsPage from "./pages/PhotoToolsPage";
import OnlineExams from "./pages/OnlineExams";
import OnlineExamTake from "./pages/OnlineExamTake";
import LiveClasses from "./pages/LiveClasses";
import LiveClassRoom from "./pages/LiveClassRoom";
import AdminUserManagement from "./pages/admin/AdminUserManagement";
import AdminPhotoTools from "./pages/admin/AdminPhotoTools";
import StaffDashboard from "./pages/StaffDashboard";
import WaitingApproval from "./pages/WaitingApproval";
import AdminApprovals from "./pages/admin/AdminApprovals";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminReceiptDesigner from "./pages/admin/AdminReceiptDesigner";
import AdminExamSessions from "./pages/admin/AdminExamSessions";
import AdminLibrary from "./pages/admin/AdminLibrary";
import AdminIdCards from "./pages/admin/AdminIdCards";
import AdminClassRoutine from "./pages/admin/AdminClassRoutine";
import AdminExamRoutine from "./pages/admin/AdminExamRoutine";
import AdminStudentPromotion from "./pages/admin/AdminStudentPromotion";
import AdminQuestionPapers from "./pages/admin/AdminQuestionPapers";
import AdminOnlineExams from "./pages/admin/AdminOnlineExams";
import AdminLiveClasses from "./pages/admin/AdminLiveClasses";
import AdminMeetings from "./pages/admin/AdminMeetings";
import MeetingRoom from "./pages/MeetingRoom";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminBulkImport from "./pages/admin/AdminBulkImport";
import AdminParentApprovals from "./pages/admin/AdminParentApprovals";
import AdminParentMessages from "@/pages/admin/AdminParentMessages";
import AdminPushNotifications from "@/pages/admin/AdminPushNotifications";
import AdminCertificates from "./pages/admin/AdminCertificates";
import AdminScholarships from "./pages/admin/AdminScholarships";
import AdminBudgets from "./pages/admin/AdminBudgets";
import AdminComplaints from "./pages/admin/AdminComplaints";
import AdminHostel from "@/pages/admin/AdminHostel";
import AdminHealthRecords from "@/pages/admin/AdminHealthRecords";
import ComplaintPage from "./pages/ComplaintPage";
import NotFound from "./pages/NotFound";
import AttendanceCheckin from "./pages/AttendanceCheckin";
import StaffCheckin from "./pages/StaffCheckin";
import ScrollToTop from "./components/ScrollToTop";
import ScrollNavigation from "./components/ScrollNavigation";
import RouteLoader from "./components/RouteLoader";
import InstallPrompt from "./components/InstallPrompt";
import NetworkStatusIndicator from "./components/NetworkStatusIndicator";
import FloatingWhatsAppButton from "./components/FloatingWhatsAppButton";
import { supabase } from "@/integrations/supabase/client";

let isRefreshingSession = false;

const clearLocalExpiredSession = async () => {
  await supabase.auth.signOut({ scope: 'local' });
  queryClient.clear();
};

const handleAuthError = async (error: unknown) => {
  if (isRefreshingSession) return;
  const message = error instanceof Error ? error.message : String(error ?? '');
  const isJwtError =
    message.includes('JWT expired') ||
    message.includes('PGRST303') ||
    message.includes('invalid claim: missing sub claim');
  if (!isJwtError) return;

  isRefreshingSession = true;
  try {
    const {
      data: { session: previousSession },
    } = await supabase.auth.getSession();
    const previousAccessToken = previousSession?.access_token ?? null;

    const { data, error: refreshError } = await supabase.auth.refreshSession();
    const nextAccessToken = data.session?.access_token ?? null;

    if (refreshError || !nextAccessToken || nextAccessToken === previousAccessToken) {
      await clearLocalExpiredSession();
      return;
    }

    queryClient.invalidateQueries();
  } catch {
    await clearLocalExpiredSession();
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
        // Allow JWT errors to retry a few times (session may be refreshing)
        if (msg.includes('JWT expired') || msg.includes('PGRST303')) return failureCount < 2;
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 3000),
      staleTime: 30_000,
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
      <Outlet />
    </AdminLayout>
  </ProtectedRoute>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <ThemeProvider>
            <BijoyProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <DynamicFavicon />
              <UpdatePrompt />
              <BrowserRouter>
                <RouteLoader />
                <ScrollToTop />
                <ScrollNavigation />
                <InstallPrompt />
                <NetworkStatusIndicator />
                <FloatingWhatsAppButton />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/notices" element={<NoticePage />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/result" element={<ResultFind />} />
                  <Route path="/student-info" element={<StudentInfoPage />} />
                  <Route path="/admission" element={<AdmissionPage />} />
                  <Route path="/admission-tests" element={<AdmissionTestsPublic />} />
                  <Route path="/admission-test/:id" element={<AdmissionTestTake />} />
                  <Route path="/admission-test/:id/merit" element={<AdmissionTestMerit />} />
                  <Route path="/staff-application" element={<StaffApplicationPage />} />
                  <Route path="/donation" element={<DonationPage />} />
                  <Route path="/fee-payment" element={<ProtectedRoute><FeePaymentPage /></ProtectedRoute>} />
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
                  <Route path="/complaints" element={<ComplaintPage />} />

                  <Route path="/admin" element={<AdminShell />}>
                    <Route index element={<Dashboard />} />
                    <Route path="analytics" element={<AdminAnalytics />} />
                    <Route path="bulk-import" element={<AdminBulkImport />} />
                    <Route path="hostel" element={<AdminHostel />} />
                    <Route path="health-records" element={<AdminHealthRecords />} />
                    <Route path="students" element={<ModuleGuard menuPath="/admin/students"><AdminStudents /></ModuleGuard>} />
                    <Route path="staff" element={<ModuleGuard menuPath="/admin/staff"><AdminStaff staffType="all" /></ModuleGuard>} />
                    <Route path="staff/add" element={<ModuleGuard menuPath="/admin/staff"><AdminStaffForm /></ModuleGuard>} />
                    <Route path="staff/edit/:id" element={<ModuleGuard menuPath="/admin/staff"><AdminStaffForm /></ModuleGuard>} />
                    <Route path="general-staff" element={<ModuleGuard menuPath="/admin/general-staff"><AdminGeneralStaff /></ModuleGuard>} />
                    <Route path="general-staff/add" element={<ModuleGuard menuPath="/admin/general-staff"><AdminGeneralStaffForm /></ModuleGuard>} />
                    <Route path="general-staff/edit/:id" element={<ModuleGuard menuPath="/admin/general-staff"><AdminGeneralStaffForm /></ModuleGuard>} />
                    <Route path="teachers" element={<ModuleGuard menuPath="/admin/teachers"><AdminTeachers /></ModuleGuard>} />
                    <Route path="teachers/add" element={<ModuleGuard menuPath="/admin/teachers"><AdminTeacherForm /></ModuleGuard>} />
                    <Route path="teachers/edit/:id" element={<ModuleGuard menuPath="/admin/teachers"><AdminTeacherForm /></ModuleGuard>} />
                    <Route path="administrative-staff" element={<ModuleGuard menuPath="/admin/administrative-staff"><AdminAdministrativeStaff /></ModuleGuard>} />
                    <Route path="administrative-staff/add" element={<ModuleGuard menuPath="/admin/administrative-staff"><AdminAdministrativeStaffForm /></ModuleGuard>} />
                    <Route path="administrative-staff/edit/:id" element={<ModuleGuard menuPath="/admin/administrative-staff"><AdminAdministrativeStaffForm /></ModuleGuard>} />
                    <Route path="support-staff" element={<ModuleGuard menuPath="/admin/support-staff"><AdminSupportStaff /></ModuleGuard>} />
                    <Route path="support-staff/add" element={<ModuleGuard menuPath="/admin/support-staff"><AdminSupportStaffForm /></ModuleGuard>} />
                    <Route path="support-staff/edit/:id" element={<ModuleGuard menuPath="/admin/support-staff"><AdminSupportStaffForm /></ModuleGuard>} />
                    <Route path="divisions" element={<ModuleGuard menuPath="/admin/divisions"><AdminDivisions /></ModuleGuard>} />
                    <Route path="subjects" element={<ModuleGuard menuPath="/admin/subjects"><AdminSubjects /></ModuleGuard>} />
                    <Route path="results" element={<ModuleGuard menuPath="/admin/results"><AdminResults /></ModuleGuard>} />
                    <Route path="merit-list" element={<ModuleGuard menuPath="/admin/merit-list"><AdminMeritList /></ModuleGuard>} />
                    <Route path="notices" element={<ModuleGuard menuPath="/admin/notices"><AdminNotices /></ModuleGuard>} />
                    <Route path="students-fees" element={<ModuleGuard menuPath="/admin/students-fees"><AdminStudentsFees /></ModuleGuard>} />
                    <Route path="fee-types" element={<ModuleGuard menuPath="/admin/fee-types"><AdminFeeTypes /></ModuleGuard>} />
                    <Route path="fee-categories" element={<ModuleGuard menuPath="/admin/fee-categories"><AdminFeeCategories /></ModuleGuard>} />
                    <Route path="student-categories" element={<ModuleGuard menuPath="/admin/student-categories"><AdminStudentCategories /></ModuleGuard>} />
                    <Route path="website" element={<AdminWebsite />} />
                    <Route path="expenses" element={<ModuleGuard menuPath="/admin/expenses"><AdminExpenses /></ModuleGuard>} />
                    <Route path="donors" element={<ModuleGuard menuPath="/admin/donors"><AdminDonors /></ModuleGuard>} />
                    <Route path="profile" element={<AdminProfile />} />
                    <Route path="fee-receipts" element={<ModuleGuard menuPath="/admin/fee-receipts"><AdminFeeReceipts /></ModuleGuard>} />
                    <Route path="resign-letters" element={<AdminResignLetters />} />
                    <Route path="joining-letters" element={<AdminJoiningLetters />} />
                    <Route path="admission-letters" element={<AdminAdmissionLetters />} />
                    <Route path="student-certificates" element={<AdminCertificates />} />
                    <Route path="designations" element={<AdminDesignations />} />
                    <Route path="form-builder" element={<AdminFormBuilder />} />
                    <Route path="custom/:slug" element={<AdminCustomFormPage />} />
                    <Route path="module-manager" element={<AdminModuleManager />} />
                    <Route path="formula-builder" element={<AdminFormulaBuilder />} />
                    <Route path="student-attendance" element={<ModuleGuard menuPath="/admin/student-attendance"><AdminStudentAttendance /></ModuleGuard>} />
                    <Route path="staff-attendance" element={<ModuleGuard menuPath="/admin/staff-attendance"><AdminStaffAttendance /></ModuleGuard>} />
                    <Route path="validation-manager" element={<AdminValidationManager />} />
                    <Route path="reports" element={<AdminReports />} />
                    <Route path="staff-reports" element={<AdminStaffReports />} />
                    <Route path="permissions" element={<AdminPermissions />} />
                    <Route path="theme" element={<AdminThemeCustomizer />} />
                    <Route path="menu-manager" element={<AdminMenuManager />} />
                    <Route path="widget-builder" element={<AdminWidgetBuilder />} />
                    <Route path="backup" element={<AdminBackup />} />
                    <Route path="recycle-bin" element={<AdminRecycleBin />} />
                    <Route path="system-logs" element={<AdminSystemLogs />} />
                    <Route path="inventory" element={<AdminInventory />} />
                    <Route path="guardian-notify" element={<AdminGuardianNotifications />} />
                    <Route path="whatsapp-queue" element={<AdminWhatsAppQueue />} />
                    <Route path="salary" element={<ModuleGuard menuPath="/admin/salary"><AdminSalary /></ModuleGuard>} />
                    <Route path="posts" element={<AdminPosts />} />
                    <Route path="prayer-calendar" element={<AdminPrayerCalendar />} />
                    <Route path="academic-sessions" element={<AdminAcademicSessions />} />
                    <Route path="address-manager" element={<AdminAddressManager />} />
                    <Route path="api-verification" element={<AdminApiVerification />} />
                    <Route path="user-management" element={<AdminUserManagement />} />
                    <Route path="approvals" element={<AdminApprovals />} />
                    <Route path="parent-approvals" element={<AdminParentApprovals />} />
                    <Route path="parent-messages" element={<AdminParentMessages />} />
                    <Route path="push-notifications" element={<AdminPushNotifications />} />
                    <Route path="photo-tools" element={<AdminPhotoTools />} />
                    <Route path="payments" element={<AdminPayments />} />
                    <Route path="receipt-designer" element={<AdminReceiptDesigner />} />
                    <Route path="exam-sessions" element={<ModuleGuard menuPath="/admin/exam-sessions"><AdminExamSessions /></ModuleGuard>} />
                    <Route path="library" element={<ModuleGuard menuPath="/admin/library"><AdminLibrary /></ModuleGuard>} />
                    <Route path="id-cards" element={<AdminIdCards />} />
                    <Route path="class-routine" element={<AdminClassRoutine />} />
                    <Route path="exam-routine" element={<AdminExamRoutine />} />
                    <Route path="student-promotion" element={<ModuleGuard menuPath="/admin/student-promotion"><AdminStudentPromotion /></ModuleGuard>} />
                    <Route path="question-papers" element={<AdminQuestionPapers />} />
                    <Route path="online-exams" element={<AdminOnlineExams />} />
                    <Route path="live-classes" element={<AdminLiveClasses />} />
                    <Route path="meetings" element={<AdminMeetings />} />
                    <Route path="admission-tests" element={<ModuleGuard menuPath="/admin/admission-tests"><AdminAdmissionTests /></ModuleGuard>} />
                    <Route path="scholarships" element={<ModuleGuard menuPath="/admin/scholarships"><AdminScholarships /></ModuleGuard>} />
                    <Route path="budgets" element={<ModuleGuard menuPath="/admin/budgets"><AdminBudgets /></ModuleGuard>} />
                    <Route path="complaints" element={<AdminComplaints />} />
                    <Route path="settings" element={<AdminSettings />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
            </BijoyProvider>
          </ThemeProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
