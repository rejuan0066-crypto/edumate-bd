import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Home from "./pages/Home";
import About from "./pages/About";
import Gallery from "./pages/Gallery";
import NoticePage from "./pages/NoticePage";
import Contact from "./pages/Contact";
import ResultFind from "./pages/ResultFind";
import StudentInfoPage from "./pages/StudentInfoPage";
import AdmissionPage from "./pages/AdmissionPage";
import Login from "./pages/Login";
import Dashboard from "./pages/admin/Dashboard";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminStaff from "./pages/admin/AdminStaff";
import AdminPlaceholder from "./pages/admin/AdminPlaceholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
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
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/students" element={<AdminStudents />} />
            <Route path="/admin/staff" element={<AdminStaff />} />
            <Route path="/admin/divisions" element={<AdminPlaceholder page="divisions" />} />
            <Route path="/admin/subjects" element={<AdminPlaceholder page="subjects" />} />
            <Route path="/admin/results" element={<AdminPlaceholder page="results" />} />
            <Route path="/admin/notices" element={<AdminPlaceholder page="notices" />} />
            <Route path="/admin/fees" element={<AdminPlaceholder page="fees" />} />
            <Route path="/admin/website" element={<AdminPlaceholder page="website" />} />
            <Route path="/admin/settings" element={<AdminPlaceholder page="settings" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
