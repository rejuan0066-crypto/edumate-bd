import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInstitutionInfo } from '@/hooks/useInstitutionInfo';
import StudentProfileModal from '@/components/profile/StudentProfileModal';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, UserX, Printer, GraduationCap } from 'lucide-react';
import { printStudentProfile } from '@/lib/studentProfilePrint';

const AdminStudentProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { data: institution } = useInstitutionInfo();

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['student_profile_page', id],
    queryFn: async () => {
      if (!id) throw new Error('Student ID missing');
      const { data, error } = await supabase
        .from('students')
        .select('*, classes(name, name_bn), divisions(name, name_bn), academic_sessions(name, name_bn)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const studentName = student ? (bn ? student.name_bn || student.name_en : student.name_en || student.name_bn) : '';

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {/* Top Navigation & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/students')}
              className="gap-2 rounded-xl shadow-xs hover:bg-muted font-bold text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{bn ? 'শিক্ষার্থী তালিকায় ফিরে যান' : 'Back to Students List'}</span>
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <span>{bn ? 'শিক্ষার্থী প্রোফাইল বিবরণ' : 'Student Profile Details'}</span>
              </h1>
              {studentName && (
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  {studentName} {student?.roll_number ? `| ${bn ? 'রোল:' : 'Roll:'} ${student.roll_number}` : ''} {student?.registration_no ? `| ${bn ? 'আইডি:' : 'ID:'} ${student.registration_no}` : ''}
                </p>
              )}
            </div>
          </div>

          {student && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => printStudentProfile(student, institution, bn)}
                className="gap-1.5 rounded-xl font-bold text-xs shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{bn ? 'প্রোফাইল প্রিন্ট' : 'Print Profile'}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">
              {bn ? 'শিক্ষার্থীর প্রোফাইল লোড হচ্ছে...' : 'Loading student profile...'}
            </p>
          </div>
        ) : error || !student ? (
          <div className="text-center py-20 bg-muted/20 border border-dashed border-border rounded-2xl p-6">
            <UserX className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground mb-1">
              {bn ? 'শিক্ষার্থীর তথ্য পাওয়া যায়নি' : 'Student not found'}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {bn ? 'প্রদত্ত আইডির কোনো সক্রিয় রেকর্ড নেই অথবা মুছে ফেলা হয়েছে।' : 'No active record found for this student.'}
            </p>
            <Button size="sm" onClick={() => navigate('/admin/students')}>
              {bn ? 'শিক্ষার্থী তালিকায় যান' : 'Go to Students List'}
            </Button>
          </div>
        ) : (
          <div className="bg-card border border-border/60 rounded-3xl p-4 sm:p-7 shadow-sm">
            <StudentProfileModal
              student={student}
              bn={bn}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminStudentProfilePage;
