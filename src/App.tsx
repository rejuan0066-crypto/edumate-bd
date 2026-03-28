// Auth-enabled app
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import About from "./pages/About";
import Gallery from "./pages/Gallery";
import NoticePage from "./pages/NoticePage";
import Contact from "./pages/Contact";
import ResultFind from "./pages/ResultFind";
import StudentInfoPage from "./pages/StudentInfoPage";
import AdmissionPage from "./pages/AdmissionPage";
import DonationPage from "./pages/DonationPage";
import FeePaymentPage from "./pages/FeePaymentPage";
import Login from "./pages/Login";
import Dashboard from "./pages/admin/Dashboard";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminStaffForm from "./pages/admin/AdminStaffForm";
import AdminDivisions from "./pages/admin/AdminDivisions";
import AdminSubjects from "./pages/admin/AdminSubjects";
import AdminResults from "./pages/admin/AdminResults";
import AdminNotices from "./pages/admin/AdminNotices";
import AdminFees from "./pages/admin/AdminFees";
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
import AdminValidationManager from "./pages/admin/AdminValidationManager";
import AdminReports from "./pages/admin/AdminReports";
import AdminPermissions from "./pages/admin/AdminPermissions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/notices" element={<NoticePage />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/result" element={<ResultFind />} />
              <Route path="/student-info" element={<StudentInfoPage />} />
              <Route path="/admission" element={<AdmissionPage />} />
              <Route path="/donation" element={<DonationPage />} />
              <Route path="/fee-payment" element={<FeePaymentPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/admin/students" element={<ProtectedRoute><AdminStudents /></ProtectedRoute>} />
              <Route path="/admin/staff" element={<ProtectedRoute><AdminStaff /></ProtectedRoute>} />
              <Route path="/admin/staff/add" element={<ProtectedRoute><AdminStaffForm /></ProtectedRoute>} />
              <Route path="/admin/divisions" element={<ProtectedRoute><AdminDivisions /></ProtectedRoute>} />
              <Route path="/admin/subjects" element={<ProtectedRoute><AdminSubjects /></ProtectedRoute>} />
              <Route path="/admin/results" element={<ProtectedRoute><AdminResults /></ProtectedRoute>} />
              <Route path="/admin/notices" element={<ProtectedRoute><AdminNotices /></ProtectedRoute>} />
              <Route path="/admin/fees" element={<ProtectedRoute><AdminFees /></ProtectedRoute>} />
              <Route path="/admin/website" element={<ProtectedRoute><AdminWebsite /></ProtectedRoute>} />
              <Route path="/admin/expenses" element={<ProtectedRoute><AdminExpenses /></ProtectedRoute>} />
              <Route path="/admin/donors" element={<ProtectedRoute><AdminDonors /></ProtectedRoute>} />
              <Route path="/admin/profile" element={<ProtectedRoute><AdminProfile /></ProtectedRoute>} />
              <Route path="/admin/fee-receipts" element={<ProtectedRoute><AdminFeeReceipts /></ProtectedRoute>} />
              <Route path="/admin/resign-letters" element={<ProtectedRoute><AdminResignLetters /></ProtectedRoute>} />
              <Route path="/admin/joining-letters" element={<ProtectedRoute><AdminJoiningLetters /></ProtectedRoute>} />
              <Route path="/admin/admission-letters" element={<ProtectedRoute><AdminAdmissionLetters /></ProtectedRoute>} />
              <Route path="/admin/designations" element={<ProtectedRoute><AdminDesignations /></ProtectedRoute>} />
              <Route path="/admin/form-builder" element={<ProtectedRoute><AdminFormBuilder /></ProtectedRoute>} />
              <Route path="/admin/custom/:slug" element={<ProtectedRoute><AdminCustomFormPage /></ProtectedRoute>} />
              <Route path="/admin/module-manager" element={<ProtectedRoute><AdminModuleManager /></ProtectedRoute>} />
              <Route path="/admin/formula-builder" element={<ProtectedRoute><AdminFormulaBuilder /></ProtectedRoute>} />
              <Route path="/admin/attendance" element={<ProtectedRoute><AdminAttendance /></ProtectedRoute>} />
              <Route path="/admin/validation-manager" element={<ProtectedRoute><AdminValidationManager /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute><AdminReports /></ProtectedRoute>} />
              <Route path="/admin/permissions" element={<ProtectedRoute><AdminPermissions /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
