import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import StaffProfileModal from '@/components/profile/StaffProfileModal';
import StaffLetterDialog from '@/components/admin/StaffLetterDialog';
import StaffDutyTimeDialog from '@/components/admin/StaffDutyTimeDialog';
import StaffMonthlyAttendanceDialog from '@/components/admin/StaffMonthlyAttendanceDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Pencil, 
  Loader2, 
  UserX, 
  Printer, 
  User, 
  ClipboardList, 
  Award, 
  Clock, 
  UserPlus, 
  Check, 
  X, 
  Power, 
  PowerOff, 
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { getStaffDisplayNames } from '@/lib/nameFormatter';
import { invalidateAllStaffQueries } from '@/lib/staffQueryInvalidator';
import { parseEdgeError } from '@/lib/edgeError';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import { sanitizePasswordInput } from '@/lib/passwordInput';

const AdminStaffProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const isAdmin = isAdminRole(role);
  // Role permissions check based on staff category
  const menuPath = (() => {
    const p = window.location.pathname;
    if (p.includes('/teachers')) return '/admin/teachers';
    if (p.includes('/administrative-staff')) return '/admin/administrative-staff';
    if (p.includes('/support-staff')) return '/admin/support-staff';
    if (p.includes('/directors')) return '/admin/directors';
    if (p.includes('/committee-members')) return '/admin/committee-members';
    return '/admin/staff';
  })();
  const { canViewPage, canAddItem, canEditItem, canDeleteItem, canApproveItem, isFeatureAllowed } = usePagePermissions(menuPath);

  // Modals state
  const [monthlyAttendanceOpen, setMonthlyAttendanceOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [dutyOpen, setDutyOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [statusConfirmAction, setStatusConfirmAction] = useState<'active' | 'inactive' | null>(null);

  // Account creation state
  const [accEmail, setAccEmail] = useState('');
  const [accPassword, setAccPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accRole, setAccRole] = useState('teacher');
  const [accCreating, setAccCreating] = useState(false);

  // Load active custom roles
  const { data: customRoles = [] } = useQuery({
    queryKey: ['custom_roles_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('id, name, name_bn, base_role')
        .eq('is_active', true)
        .order('sort_order');
      if (error) return [];
      return data || [];
    },
  });

  // Query staff data
  const { data: staff, isLoading, error, refetch } = useQuery({
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

  // Status mutation
  const statusMutation = useMutation({
    mutationFn: async (newStatus: 'active' | 'inactive' | 'pending') => {
      if (!id) return;
      const { error } = await supabase
        .from('staff')
        .update({ status: newStatus } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, newStatus) => {
      toast.success(
        bn 
          ? `স্ট্যাটাস সফলভাবে '${newStatus === 'active' ? 'সক্রিয়' : newStatus === 'inactive' ? 'নিষ্ক্রিয়' : 'আবেদন'}' করা হয়েছে`
          : `Status updated to ${newStatus}`
      );
      invalidateAllStaffQueries(queryClient);
      refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || (bn ? 'স্ট্যাটাস পরিবর্তন ব্যর্থ' : 'Failed to update status'));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'স্টাফ সফলভাবে মুছে ফেলা হয়েছে' : 'Staff deleted successfully');
      invalidateAllStaffQueries(queryClient);
      navigate('/admin/staff');
    },
    onError: (err: any) => {
      toast.error(err?.message || (bn ? 'মুছতে ব্যর্থ হয়েছে' : 'Failed to delete'));
    },
  });

  // Account creation handler
  const handleCreateAccount = async () => {
    if (!accEmail.trim() || !accPassword.trim()) {
      toast.error(bn ? 'ইমেইল ও পাসওয়ার্ড দিন' : 'Email and password required');
      return;
    }
    setAccCreating(true);
    try {
      let baseRole = 'staff';
      let customRoleId: string | null = null;
      if (accRole.startsWith('custom:')) {
        customRoleId = accRole.replace('custom:', '');
        const cr = (customRoles as any[]).find((r) => r.id === customRoleId);
        baseRole = cr?.base_role || 'staff';
      } else if (accRole !== 'none') {
        baseRole = accRole;
      }

      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          email: accEmail.trim(),
          password: accPassword,
          role: baseRole,
          full_name: staff?.name_bn || staff?.name_en || '',
          staff_id: staff?.id,
        },
      });

      if (error || !data?.success) {
        toast.error(await parseEdgeError(error, data, bn));
        setAccCreating(false);
        return;
      }

      if (customRoleId && staff?.id) {
        await supabase
          .from('staff')
          .update({ custom_role_id: customRoleId } as any)
          .eq('id', staff.id);
      }

      toast.success(bn ? '✅ অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!' : '✅ Account created successfully!');
      setAccountDialogOpen(false);
      setAccEmail('');
      setAccPassword('');
      invalidateAllStaffQueries(queryClient);
      refetch();
    } catch {
      toast.error(bn ? 'অ্যাকাউন্ট তৈরি ব্যর্থ' : 'Failed to create account');
    } finally {
      setAccCreating(false);
    }
  };

  const displayNames = staff ? getStaffDisplayNames(staff.name_bn, staff.name_en, bn) : null;
  const isTeacher = staff?.department?.toLowerCase()?.includes('teacher') || staff?.designation?.includes('শিক্ষক');

  // Determine appropriate edit URL based on staff department/designation
  const getEditUrl = () => {
    if (!staff) return '/admin/staff';
    const dept = (staff.department || '').toLowerCase();
    const desig = (staff.designation || '').toLowerCase();
    if (dept.includes('teacher') || desig.includes('শিক্ষক')) return `/admin/teachers/edit/${staff.id}`;
    if (dept.includes('admin') || desig.includes('কর্মকর্তা')) return `/admin/administrative-staff/edit/${staff.id}`;
    if (dept.includes('support')) return `/admin/support-staff/edit/${staff.id}`;
    if (dept.includes('director')) return `/admin/directors/edit/${staff.id}`;
    if (dept.includes('committee')) return `/admin/committee-members/edit/${staff.id}`;
    return `/admin/staff/edit/${staff.id}`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {/* Top Navigation & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/admin/staff');
                }
              }}
              className="gap-2 rounded-xl shadow-xs hover:bg-muted font-bold text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{bn ? 'তালিকায় ফিরে যান' : 'Back to List'}</span>
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
              {isFeatureAllowed('action_print') !== false && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1.5 rounded-xl font-bold text-xs shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{bn ? 'প্রিন্ট' : 'Print'}</span>
                </Button>
              )}
              {canEditItem && (
                <Link to={getEditUrl()}>
                  <Button
                    size="sm"
                    className="gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{bn ? 'তথ্য এডিট' : 'Edit Profile'}</span>
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ═══════════ COMPLETE PROFILE ACTIONS TOOLBAR (ROLE-PERMISSION AWARE) ═══════════ */}
        {staff && (isAdmin || canEditItem || canDeleteItem || canApproveItem || isFeatureAllowed('action_print') !== false) && (
          <div className="flex flex-wrap items-center gap-2.5 p-3.5 bg-muted/30 rounded-2xl border border-border/60 shadow-xs">
            {/* Account Creation / Linked Badge (Admin or user management permission) */}
            {(isAdmin || isFeatureAllowed('action_create_account') === true) && (
              staff.user_id ? (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs px-3 py-1 flex items-center gap-1.5 font-semibold rounded-xl">
                  <Check className="w-3.5 h-3.5" />
                  <span>{bn ? 'অ্যাকাউন্ট সংযুক্ত' : 'Account Linked'}</span>
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAccEmail(staff.email || '');
                    setAccRole(isTeacher ? 'teacher' : 'staff');
                    setAccountDialogOpen(true);
                  }}
                  className="gap-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{bn ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}</span>
                </Button>
              )
            )}

            {/* Attendance & Duty Report (Admin or canViewPage) */}
            {(isAdmin || canViewPage) && isFeatureAllowed('attendance_report') !== false && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMonthlyAttendanceOpen(true)}
                className="gap-1.5 rounded-xl text-xs font-semibold hover:bg-primary/10 hover:text-primary shadow-xs"
              >
                <ClipboardList className="w-3.5 h-3.5 text-primary" />
                <span>{bn ? 'হাজিরা রিপোর্ট' : 'Attendance Report'}</span>
              </Button>
            )}

            {/* Promotion / Salary Letter (Admin or canEditItem, and salary view permission) */}
            {staff.status === 'active' && (isAdmin || canEditItem) && isFeatureAllowed('action_salary_view') !== false && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLetterOpen(true)}
                className="gap-1.5 rounded-xl text-xs font-semibold hover:bg-accent/10 hover:text-accent shadow-xs"
              >
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>{bn ? 'পদোন্নতি / বেতন পত্র' : 'Salary Letter'}</span>
              </Button>
            )}

            {/* Personal Duty Time (Admin or canEditItem) */}
            {staff.status === 'active' && (isAdmin || canEditItem) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDutyOpen(true)}
                className="gap-1.5 rounded-xl text-xs font-semibold hover:bg-primary/10 hover:text-primary shadow-xs"
              >
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>{bn ? 'ডিউটি সময়' : 'Duty Time'}</span>
              </Button>
            )}

            {/* Pending Staff Approval / Rejection (Admin or canApproveItem) */}
            {staff.status === 'pending' && (isAdmin || canApproveItem) && (
              <>
                <Button
                  size="sm"
                  onClick={() => statusMutation.mutate('active')}
                  disabled={statusMutation.isPending}
                  className="gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{bn ? 'অনুমোদন করুন' : 'Approve'}</span>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={statusMutation.isPending}
                  className="gap-1.5 rounded-xl font-semibold text-xs shadow-xs"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{bn ? 'বাতিল' : 'Reject'}</span>
                </Button>
              </>
            )}

            {/* Active / Inactive Status Toggle (Admin or canEditItem) */}
            {staff.status !== 'pending' && (isAdmin || canEditItem) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusConfirmAction(staff.status === 'active' ? 'inactive' : 'active')}
                disabled={statusMutation.isPending}
                className={`gap-1.5 rounded-xl text-xs font-semibold shadow-xs ${
                  staff.status === 'active'
                    ? 'text-orange-600 border-orange-500/30 hover:bg-orange-500/10'
                    : 'text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10'
                }`}
              >
                {staff.status === 'active' ? (
                  <>
                    <PowerOff className="w-3.5 h-3.5" />
                    <span>{bn ? 'নিষ্ক্রিয় করুন' : 'Inactivate'}</span>
                  </>
                ) : (
                  <>
                    <Power className="w-3.5 h-3.5" />
                    <span>{bn ? 'সক্রিয় করুন' : 'Activate'}</span>
                  </>
                )}
              </Button>
            )}

            {/* Delete Record (Strictly requires canDeleteItem and delete staff permission) */}
            {canDeleteItem && isFeatureAllowed('action_delete_staff') !== false && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={deleteMutation.isPending}
                className="gap-1.5 rounded-xl text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 ml-auto shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{bn ? 'মুছুন' : 'Delete'}</span>
              </Button>
            )}
          </div>
        )}

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

        {/* ═══════════ MOUNTED DIALOGS ═══════════ */}

        {/* 1. Account Creation Dialog */}
        <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{bn ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded italic border-l-2 border-primary/30">
                {bn ? 'অ্যাকাউন্ট তৈরি করতে ইমেইল ও পাসওয়ার্ড দিন। পাসওয়ার্ড অবশ্যই ইংরেজি অক্ষরে হতে হবে এবং এতে কমপক্ষে ৬টি অক্ষর থাকতে হবে।' : 'Provide email and password to create an account.'}
              </p>
              <p className="text-sm text-muted-foreground">
                {bn ? `কর্মী: ${displayNames?.primary || ''}` : `Staff: ${displayNames?.primary || ''}`}
              </p>
              <div className="space-y-2">
                <Label>{bn ? 'ইমেইল' : 'Email'}</Label>
                <Input type="email" value={accEmail} onChange={e => setAccEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label>{bn ? 'পাসওয়ার্ড' : 'Password'}</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? 'text' : 'password'} 
                    value={accPassword} 
                    onChange={e => setAccPassword(sanitizePasswordInput(e.target.value))} 
                    placeholder={bn ? 'ইংরেজি অক্ষর, সংখ্যা ও চিহ্ন' : 'Password'} 
                    className="pr-10" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrengthMeter password={accPassword} bn={bn} visible />
              </div>

              <div className="space-y-2">
                <Label>{bn ? 'রোল' : 'Role'}</Label>
                <Select value={accRole} onValueChange={setAccRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">{bn ? 'শিক্ষক' : 'Teacher'}</SelectItem>
                    <SelectItem value="administrative">{bn ? 'প্রশাসনিক' : 'Administrative'}</SelectItem>
                    <SelectItem value="support">{bn ? 'সাপোর্ট' : 'Support'}</SelectItem>
                    <SelectItem value="general">{bn ? 'সহায়ক' : 'General'}</SelectItem>
                    <SelectItem value="staff">{bn ? 'স্টাফ' : 'Staff'}</SelectItem>
                    <SelectItem value="admin">{bn ? 'অ্যাডমিন' : 'Admin'}</SelectItem>
                    {customRoles.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">{bn ? 'কাস্টম রোল' : 'Custom Roles'}</div>
                        {(customRoles as any[]).map((cr) => (
                          <SelectItem key={cr.id} value={`custom:${cr.id}`}>
                            {(bn ? cr.name_bn : cr.name) || cr.name} <span className="text-[10px] text-muted-foreground ml-1">({cr.base_role})</span>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCreateAccount} disabled={accCreating} className="w-full btn-primary-gradient">
                {accCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {bn ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 2. Monthly Attendance & Duty Report Dialog */}
        <StaffMonthlyAttendanceDialog
          open={monthlyAttendanceOpen}
          onOpenChange={setMonthlyAttendanceOpen}
          staff={staff}
        />

        {/* 3. Promotion / Salary Letter Dialog */}
        <StaffLetterDialog
          open={letterOpen}
          onOpenChange={setLetterOpen}
          staff={staff}
          bn={bn}
        />

        {/* 4. Duty Time Dialog */}
        <StaffDutyTimeDialog
          open={dutyOpen}
          onOpenChange={setDutyOpen}
          staff={staff}
          bn={bn}
        />

        {/* 5. Status Toggle Confirmation Dialog */}
        <AlertDialog open={!!statusConfirmAction} onOpenChange={(o) => !o && setStatusConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {statusConfirmAction === 'active' 
                  ? (bn ? 'স্টাফ সক্রিয় করবেন?' : 'Activate staff?') 
                  : (bn ? 'স্টাফ নিষ্ক্রিয় করবেন?' : 'Inactivate staff?')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {statusConfirmAction === 'active'
                  ? (bn ? `আপনি কি "${displayNames?.primary || ''}" কে পুনরায় সক্রিয় করতে চান?` : 'Are you sure you want to activate this staff member?')
                  : (bn ? `আপনি কি "${displayNames?.primary || ''}" কে নিষ্ক্রিয় করতে চান? নিষ্ক্রিয় কর্মী সিস্টেমে লগইন বা হাজিরা দিতে পারবেন না।` : 'Are you sure you want to inactivate this staff member?')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{bn ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (statusConfirmAction) {
                    statusMutation.mutate(statusConfirmAction);
                    setStatusConfirmAction(null);
                  }
                }}
                className={statusConfirmAction === 'active' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'}
              >
                {bn ? 'হ্যাঁ, নিশ্চিত' : 'Yes, Confirm'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 6. Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{bn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {bn ? `"${displayNames?.primary || ''}" এর তথ্য স্থায়ীভাবে মুছে ফেলা হবে। এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।` : 'This staff record will be permanently deleted. This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{bn ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  deleteMutation.mutate();
                  setDeleteConfirmOpen(false);
                }}
              >
                {bn ? 'মুছে ফেলুন' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminStaffProfilePage;
