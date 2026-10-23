import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import StaffProfileModal from '@/components/profile/StaffProfileModal';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Loader2, UserX, Printer, User } from 'lucide-react';
import { getStaffDisplayNames } from '@/lib/nameFormatter';

const AdminStaffProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { isFeatureAllowed } = usePagePermissions('/admin/staff');

  const { data: staff, isLoading, error } = useQuery({
    queryKey: ['staff_profile_page', id],
    queryFn: async () => {
      if (!id) throw new Error('Staff ID missing');
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const displayNames = staff ? getStaffDisplayNames(staff.name_bn, staff.name_en, bn) : null;
  const isTeacher = staff?.department?.toLowerCase()?.includes('teacher') || staff?.designation?.includes('শিক্ষক');

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {/* Top Navigation & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/staff')}
              className="gap-2 rounded-xl shadow-xs hover:bg-muted font-bold text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{bn ? 'স্টাফ তালিকায় ফিরে যান' : 'Back to Staff List'}</span>
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <span>
                  {isTeacher
                    ? (bn ? 'শিক্ষক প্রোফাইল বিবরণ' : 'Teacher Profile Details')
                    : (bn ? 'স্টাফ প্রোফাইল বিবরণ' : 'Staff Profile Details')}
                </span>
              </h1>
              {displayNames?.primary && (
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  {displayNames.primary} {staff?.staff_id ? `(${staff.staff_id})` : ''}
                </p>
              )}
            </div>
          </div>

          {staff && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 rounded-xl font-bold text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{bn ? 'প্রিন্ট' : 'Print'}</span>
              </Button>
              <Link to={`/admin/staff/edit/${staff.id}`}>
                <Button
                  size="sm"
                  className="gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>{bn ? 'তথ্য এডিট' : 'Edit Profile'}</span>
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">
              {bn ? 'প্রোফাইল তথ্য লোড হচ্ছে...' : 'Loading profile...'}
            </p>
          </div>
        ) : error || !staff ? (
          <div className="text-center py-20 bg-muted/20 border border-dashed border-border rounded-2xl p-6">
            <UserX className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground mb-1">
              {bn ? 'স্টাফের তথ্য পাওয়া যায়নি' : 'Staff member not found'}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {bn ? 'প্রদত্ত আইডির কোনো সক্রিয় রেকর্ড নেই অথবা মুছে ফেলা হয়েছে।' : 'No active record found for this ID.'}
            </p>
            <Button size="sm" onClick={() => navigate('/admin/staff')}>
              {bn ? 'স্টাফ তালিকায় যান' : 'Go to Staff List'}
            </Button>
          </div>
        ) : (
          <div className="bg-card border border-border/60 rounded-3xl p-4 sm:p-7 shadow-sm">
            <StaffProfileModal
              staff={staff}
              bn={bn}
              showSalary={isFeatureAllowed('action_salary_view') !== false}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminStaffProfilePage;
