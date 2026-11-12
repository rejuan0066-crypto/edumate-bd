import AdminLayout from '@/components/AdminLayout';
import AdmissionForm from '@/components/admission/AdmissionForm';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { UserPlus, Users, ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Dedicated submenu page for Student Admission (/admin/students/admission).
 * Keeps the student list page (/admin/students) focused purely on the student list.
 */
const AdminStudentAdmission = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const navigate = useNavigate();
  const { canAddItem } = usePagePermissions('/admin/students');

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground flex items-center gap-2 leading-tight">
              <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
              {bn ? 'ছাত্র ভর্তি' : 'Student Admission'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {bn
                ? 'নতুন শিক্ষার্থী ভর্তির আবেদন ফরম পূরণ করে জমা দিন'
                : 'Fill out and submit the admission form for a new student'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/students')}
            className="h-8 text-xs flex items-center gap-1.5 rounded-xl border-border/80 shadow-xs"
          >
            <Users className="w-3.5 h-3.5 text-primary" />
            {bn ? 'ছাত্র তালিকা দেখুন' : 'View Student List'}
          </Button>
        </div>

        {canAddItem ? (
          <AdmissionForm
            open={true}
            onOpenChange={() => {}}
            embedded={true}
            onSuccess={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <div className="p-8 rounded-2xl border border-border bg-card text-center space-y-2">
            <ShieldOff className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">
              {bn ? 'নতুন ছাত্র ভর্তির অনুমতি আপনার নেই' : 'You do not have permission to add new admissions'}
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminStudentAdmission;
