import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Trash2, Loader2, Pencil, UserPlus, Eye, EyeOff, User, FileText, Check, X } from 'lucide-react';
import StaffProfileModal from '@/components/profile/StaffProfileModal';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useCommitteeStaffIds } from '@/hooks/useCommitteeStaffIds';
import CommitteeExclusionNotice from '@/components/CommitteeExclusionNotice';

export type StaffPageType = 'all' | 'staff' | 'teacher' | 'administrative' | 'support';

// Fallback keyword matching (used when designation has no staff_category in DB)
const TEACHER_KEYWORDS = ['teacher', 'শিক্ষক', 'ustaz', 'ustad', 'মুআল্লিম', 'মুয়াল্লিম'];
const ADMIN_STAFF_KEYWORDS = ['administrative', 'প্রশাসনিক', 'principal', 'প্রিন্সিপাল', 'vice-principal', 'সহ-প্রিন্সিপাল', 'উপাধ্যক্ষ', 'অধ্যক্ষ', 'manager', 'ম্যানেজার', 'officer', 'অফিসার', 'director', 'পরিচালক', 'admin', 'এডমিন', 'super admin', 'সুপার এডমিন'];
const GENERAL_STAFF_KEYWORDS = ['peon', 'পিয়ন', 'guard', 'প্রহরী', 'গার্ড', 'cleaner', 'পরিচ্ছন্নতাকর্মী', 'সহায়ক', 'helper', 'driver', 'ড্রাইভার'];
const SUPPORT_STAFF_KEYWORDS = ['অফিস সহকারী', 'clerk', 'কেরানি', 'operator', 'অপারেটর', 'accountant', 'হিসাবরক্ষক', 'librarian', 'লাইব্রেরিয়ান', 'data entry', 'ডাটা এন্ট্রি'];

const getStaffCategory = (staff: any, designationsMap: Map<string, string>): string => {
  // 1. Use stored staff_category column if available and not default
  if (staff?.staff_category && staff.staff_category !== 'general') return staff.staff_category;
  // 2. Check DB-based category from designation name
  const designation = staff?.designation;
  if (designation) {
    const dbCategory = designationsMap.get(designation.toLowerCase());
    if (dbCategory) return dbCategory;
    const lower = designation.toLowerCase();
    if (TEACHER_KEYWORDS.some(k => lower.includes(k))) return 'teacher';
    if (ADMIN_STAFF_KEYWORDS.some(k => lower.includes(k))) return 'administrative';
    if (SUPPORT_STAFF_KEYWORDS.some(k => lower.includes(k))) return 'support';
    if (GENERAL_STAFF_KEYWORDS.some(k => lower.includes(k))) return 'general';
  }
  // 3. Use stored staff_category (could be 'general' default)
  if (staff?.staff_category) return staff.staff_category;
  // 4. Fallback: department field
  const dept = (staff?.department || '').toLowerCase();
  if (dept === 'general' || dept === 'সাধারণ' || dept === 'সহায়ক') return 'general';
  if (dept === 'teacher' || dept === 'শিক্ষক' || dept.includes('শিক্ষা')) return 'teacher';
  if (dept === 'administrative' || dept === 'প্রশাসন' || dept === 'প্রশাসনিক') return 'administrative';
  if (dept === 'support' || dept === 'অফিস') return 'support';
  return 'general';
};

const AdminStaff = ({ staffType = 'all' }: { staffType?: StaffPageType }) => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const menuPath = staffType === 'teacher' ? '/admin/teachers' : staffType === 'administrative' ? '/admin/administrative-staff' : staffType === 'support' ? '/admin/support-staff' : staffType === 'staff' ? '/admin/general-staff' : '/admin/staff';
  const { checkApproval } = useApprovalCheck(menuPath, 'staff');
  const { role } = useAuth();
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions(menuPath);
  const bn = language === 'bn';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewStaff, setViewStaff] = useState<any>(null);

  // Account creation dialog state
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [accEmail, setAccEmail] = useState('');
  const [accPassword, setAccPassword] = useState('');
  const [accRole, setAccRole] = useState('none');
  const [accCreating, setAccCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatingIds, setGeneratingIds] = useState(false);
  const [showCommitteeStaff, setShowCommitteeStaff] = useState(false);

  const committeeInfo = useCommitteeStaffIds();
  const { data: staffListRaw = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('*').order('staff_id', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
  const staffList = showCommitteeStaff
    ? (staffListRaw as any[])
    : (staffListRaw as any[]).filter((s: any) => !committeeInfo.ids.has(s.id));
  const committeeHiddenCount = (staffListRaw as any[]).filter((s: any) => committeeInfo.ids.has(s.id)).length;

  const { data: designationsList = [] } = useQuery({
    queryKey: ['designations-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('designations').select('name, name_bn, staff_category').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const designationsMap = new Map<string, string>();
  designationsList.forEach((d: any) => {
    if (d.staff_category) {
      if (d.name) designationsMap.set(d.name.toLowerCase(), d.staff_category);
      if (d.name_bn) designationsMap.set(d.name_bn.toLowerCase(), d.staff_category);
    }
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('staff').update({ status }).eq('id', id);
      if (error) throw error;

      // Auto-create joining letter when approved
      if (status === 'active') {
        const staff = staffList.find((s: any) => s.id === id);
        if (staff) {
          const sd = (staff as any).staff_data || {};
          const year = new Date().getFullYear();
          const serial = String(Math.floor(Math.random() * 9000) + 1000);
          await supabase.from('joining_letters').insert({
            staff_id: id,
            staff_name: staff.name_en || '',
            staff_name_bn: staff.name_bn || '',
            designation: staff.designation || '',
            joining_date: sd.joining_date || new Date().toISOString().split('T')[0],
            letter_number: `JL-${year}-${serial}`,
            letter_date: new Date().toISOString().split('T')[0],
            letter_data: { phone: staff.phone, department: staff.department, nid: sd.nid, photo_url: staff.photo_url || '' },
          } as any);
        }
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['joining-letters'] });
      toast.success(status === 'active' ? (bn ? '✅ অনুমোদিত ও যোগদান পত্র তৈরি হয়েছে' : '✅ Approved & Joining Letter Created') : (bn ? '❌ বাতিল করা হয়েছে' : '❌ Rejected'));
    },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const staff = staffList.find((s: any) => s.id === id);
      if (await checkApproval('delete', { id, name_bn: staff?.name_bn }, id, `কর্মী মুছুন: ${staff?.name_bn}`)) return;
      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(bn ? 'কর্মী মুছে ফেলা হয়েছে' : 'Staff deleted');
    },
    onError: () => toast.error('Error'),
  });

  const categoryMutation = useMutation({
    mutationFn: async ({ id, category }: { id: string; category: string }) => {
      // Find the first designation matching the new category
      const matchingDesignation = designationsList.find((d: any) => d.staff_category === category);
      const newDesignation = matchingDesignation ? (bn ? matchingDesignation.name_bn : matchingDesignation.name) : null;
      const updateData: any = { staff_category: category };
      if (newDesignation) updateData.designation = newDesignation;
      const { error } = await supabase.from('staff').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(bn ? 'ক্যাটাগরি ও পদবী পরিবর্তন হয়েছে' : 'Category & designation updated');
    },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error'),
  });

  const designationMutation = useMutation({
    mutationFn: async ({ id, designation }: { id: string; designation: string }) => {
      const { error } = await supabase.from('staff').update({ designation } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(bn ? 'পদবী পরিবর্তন হয়েছে' : 'Designation updated');
    },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error'),
  });

  const typeFiltered = staffType === 'all' ? staffList : staffList.filter((s: any) => {
    const category = getStaffCategory(s, designationsMap);
    if (staffType === 'teacher') return category === 'teacher';
    if (staffType === 'administrative') return category === 'administrative';
    if (staffType === 'support') return category === 'support';
    if (staffType === 'staff') return category === 'general';
    return true;
  });

  const pendingCount = typeFiltered.filter((s: any) => s.status === 'pending').length;

  const filtered = typeFiltered.filter((s: any) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name_bn?.toLowerCase().includes(q) || s.name_en?.toLowerCase().includes(q) || s.designation?.toLowerCase().includes(q) || (s as any).staff_id?.toLowerCase().includes(q);
  });

  const openAccountDialog = (staff: any) => {
    setSelectedStaff(staff);
    setAccEmail(staff.email || '');
    setAccPassword('');
    setAccRole('none');
    setShowPassword(false);
    setAccountDialogOpen(true);
  };

  const handleCreateAccount = async () => {
    if (!accEmail.trim()) { toast.error(bn ? 'ইমেইল দিন' : 'Enter email'); return; }
    if (!accPassword || accPassword.length < 6) { toast.error(bn ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর' : 'Password min 6 chars'); return; }

    setAccCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          email: accEmail.trim(),
          password: accPassword,
          role: accRole === 'none' ? undefined : accRole,
          full_name: selectedStaff?.name_bn || selectedStaff?.name_en || '',
          staff_id: selectedStaff?.id,
        },
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || (bn ? 'অ্যাকাউন্ট তৈরি ব্যর্থ' : 'Failed to create account'));
        setAccCreating(false);
        return;
      }
      toast.success(bn ? '✅ অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!' : '✅ Account created successfully!');
      setAccountDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    } catch {
      toast.error(bn ? 'অ্যাকাউন্ট তৈরি ব্যর্থ' : 'Failed to create account');
    }
    setAccCreating(false);
  };

  const missingIdCount = staffList.filter((s: any) => !s.staff_id).length;

  const handleBulkGenerateIds = async () => {
    setGeneratingIds(true);
    try {
      const staffWithoutId = staffList.filter((s: any) => !s.staff_id);
      for (const s of staffWithoutId) {
        await supabase.from('staff').update({ updated_at: new Date().toISOString() }).eq('id', s.id);
      }
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(bn ? `${staffWithoutId.length} জন কর্মীর আইডি জেনারেট হয়েছে` : `Generated IDs for ${staffWithoutId.length} staff`);
    } catch {
      toast.error(bn ? 'আইডি জেনারেট ব্যর্থ' : 'Failed to generate IDs');
    }
    setGeneratingIds(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {staffType === 'teacher' ? (bn ? 'শিক্ষক ব্যবস্থাপনা' : 'Teacher Management') : staffType === 'administrative' ? (bn ? 'প্রশাসনিক কর্মকর্তা ব্যবস্থাপনা' : 'Administrative Staff Management') : staffType === 'staff' ? (bn ? 'সহায়ক কর্মী ব্যবস্থাপনা' : 'General Staff Management') : t('staff')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {staffType === 'teacher' ? (bn ? `মোট ${typeFiltered.length} জন শিক্ষক` : `Total ${typeFiltered.length} teachers`) : staffType === 'administrative' ? (bn ? `মোট ${typeFiltered.length} জন প্রশাসনিক কর্মকর্তা` : `Total ${typeFiltered.length} administrative staff`) : staffType === 'staff' ? (bn ? `মোট ${typeFiltered.length} জন সহায়ক কর্মী` : `Total ${typeFiltered.length} general staff`) : (bn ? `মোট ${staffList.length} জন কর্মী/শিক্ষক` : `Total ${staffList.length} staff`)}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <CommitteeExclusionNotice count={committeeHiddenCount} />
            {missingIdCount > 0 && isAdminRole(role) && (
              <Button variant="outline" onClick={handleBulkGenerateIds} disabled={generatingIds} className="flex items-center gap-2">
                {generatingIds ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {bn ? `আইডি জেনারেট (${missingIdCount})` : `Generate IDs (${missingIdCount})`}
              </Button>
            )}
            {canAddItem && (
              <Button onClick={() => navigate(staffType === 'teacher' ? '/admin/teachers/add' : staffType === 'administrative' ? '/admin/administrative-staff/add' : staffType === 'staff' ? '/admin/general-staff/add' : '/admin/staff/add')} className="btn-primary-gradient flex items-center gap-2">
                <Plus className="w-4 h-4" /> {t('addNew')}
              </Button>
            )}
          </div>
        </div>

        <div className="card-elevated p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder={bn ? 'নাম বা পদবী দিয়ে খুঁজুন...' : 'Search by name or designation...'} className="pl-10 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant={statusFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('all')}>
              {bn ? 'সবগুলো' : 'All'} ({typeFiltered.length})
            </Button>
            <Button variant={statusFilter === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('active')}>
              {bn ? 'সক্রিয়' : 'Active'}
            </Button>
            <Button variant={statusFilter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('pending')} className="relative">
              {bn ? 'আবেদন' : 'Pending'}
              {pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </Button>
            <Button variant={statusFilter === 'inactive' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('inactive')}>
              {bn ? 'নিষ্ক্রিয়' : 'Inactive'}
            </Button>
          </div>
        </div>

        <div className="card-elevated overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                   <tr>
                     <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'নাম' : 'Name'}</th>
                     <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'স্টাফ আইডি' : 'Staff ID'}</th>
                     <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'পদবী' : 'Designation'}</th>
                     <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'ক্যাটাগরি' : 'Category'}</th>
                     <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'মোবাইল' : 'Mobile'}</th>
                     {isAdminRole(role) && <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'অ্যাকাউন্ট' : 'Account'}</th>}
                     <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                     <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'অ্যাকশন' : 'Action'}</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s: any) => (
                    <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {s.photo_url ? (
                            <img src={s.photo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent-foreground font-bold text-sm">{(bn ? s.name_bn : s.name_en)?.[0] || '?'}</div>
                          )}
                          <div>
                            <span className="font-medium text-foreground text-sm block">{bn ? (s.name_bn || s.name_en) : (s.name_en || s.name_bn)}</span>
                            {s.name_bn && s.name_en && <span className="text-xs text-muted-foreground">{bn ? s.name_en : s.name_bn}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(s as any).staff_id ? (
                          <Badge variant="outline" className="font-mono text-xs bg-primary/5 text-primary border-primary/20">{(s as any).staff_id}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">{bn ? 'জেনারেট হয়নি' : 'Not generated'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const cat = getStaffCategory(s, designationsMap);
                          const catDesignations = designationsList.filter((d: any) => d.staff_category === cat);
                          return (
                            <Select
                              value={s.designation || ''}
                              onValueChange={(val) => designationMutation.mutate({ id: s.id, designation: val })}
                            >
                              <SelectTrigger className="h-7 text-xs w-[150px]">
                                <SelectValue placeholder={bn ? 'পদবী নির্বাচন' : 'Select'} />
                              </SelectTrigger>
                              <SelectContent>
                                {catDesignations.map((d: any) => (
                                  <SelectItem key={d.name} value={bn ? d.name_bn : d.name}>
                                    {bn ? d.name_bn : d.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={getStaffCategory(s, designationsMap)}
                          onValueChange={(val) => categoryMutation.mutate({ id: s.id, category: val })}
                        >
                          <SelectTrigger className="h-7 text-xs w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="teacher">{bn ? 'শিক্ষক' : 'Teacher'}</SelectItem>
                            <SelectItem value="administrative">{bn ? 'প্রশাসনিক' : 'Administrative'}</SelectItem>
                            <SelectItem value="support">{bn ? 'অফিস কর্মচারী' : 'Support Staff'}</SelectItem>
                            <SelectItem value="general">{bn ? 'সহায়ক কর্মী' : 'General Staff'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.phone || '-'}</td>
                      {isAdminRole(role) && (
                      <td className="px-4 py-3">
                        {s.user_id ? (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                            {bn ? 'সক্রিয়' : 'Linked'}
                          </Badge>
                        ) : (
                          <button
                            onClick={() => openAccountDialog(s)}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            {bn ? 'অ্যাকাউন্ট তৈরি' : 'Create Account'}
                          </button>
                        )}
                      </td>
                      )}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          s.status === 'active' ? 'bg-success/10 text-success' : 
                          s.status === 'pending' ? 'bg-warning/10 text-warning' : 
                          'bg-destructive/10 text-destructive'
                        }`}>
                          {s.status === 'active' ? (bn ? 'সক্রিয়' : 'Active') : 
                           s.status === 'pending' ? (bn ? 'আবেদন' : 'Pending') : 
                           (bn ? 'নিষ্ক্রিয়' : 'Inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                        {s.status === 'pending' && isAdminRole(role) && (
                          <>
                            <button onClick={() => statusMutation.mutate({ id: s.id, status: 'active' })} className="p-2 rounded-lg hover:bg-success/10 text-success" title={bn ? 'অনুমোদন' : 'Approve'} disabled={statusMutation.isPending}><Check className="w-4 h-4" /></button>
                            <button onClick={() => setDeleteId(s.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive" title={bn ? 'বাতিল' : 'Reject'} disabled={statusMutation.isPending}><X className="w-4 h-4" /></button>
                          </>
                        )}
                        <button onClick={() => setViewStaff(s)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title={bn ? 'প্রোফাইল দেখুন' : 'View Profile'}><Eye className="w-4 h-4" /></button>
                        {canEditItem && (
                          <button onClick={() => {
                            const cat = getStaffCategory(s, designationsMap);
                            const path = cat === 'teacher' ? 'teachers' : cat === 'administrative' ? 'administrative-staff' : cat === 'support' ? 'support-staff' : 'general-staff';
                            navigate(`/admin/${path}/edit/${s.id}`);
                          }} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title={bn ? 'সম্পাদনা' : 'Edit'}><Pencil className="w-4 h-4" /></button>
                        )}
                        {canDeleteItem && (
                          <button onClick={() => setDeleteId(s.id)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive" title={bn ? 'মুছুন' : 'Delete'}><Trash2 className="w-4 h-4" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-sm text-muted-foreground">{bn ? 'কোনো কর্মী পাওয়া যায়নি' : 'No staff found'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{bn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {bn ? 'এই কর্মী/শিক্ষকের তথ্য স্থায়ীভাবে মুছে ফেলা হবে। এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।' : 'This staff record will be permanently deleted. This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{bn ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null); } }}
              >
                {bn ? 'মুছে ফেলুন' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


        {/* Account Creation Dialog */}
        <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{bn ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {bn ? `কর্মী: ${selectedStaff?.name_bn || selectedStaff?.name_en || ''}` : `Staff: ${selectedStaff?.name_en || selectedStaff?.name_bn || ''}`}
              </p>
              <div className="space-y-2">
                <Label>{bn ? 'ইমেইল' : 'Email'}</Label>
                <Input type="email" value={accEmail} onChange={e => setAccEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label>{bn ? 'পাসওয়ার্ড' : 'Password'}</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={accPassword} onChange={e => setAccPassword(e.target.value)} placeholder={bn ? 'কমপক্ষে ৬ অক্ষর' : 'Min 6 characters'} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{bn ? 'রোল' : 'Role'}</Label>
                <Select value={accRole} onValueChange={setAccRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{bn ? 'রোল ছাড়া' : 'No Role'}</SelectItem>
                    <SelectItem value="teacher">{bn ? 'শিক্ষক' : 'Teacher'}</SelectItem>
                    <SelectItem value="administrative">{bn ? 'প্রশাসনিক' : 'Administrative'}</SelectItem>
                    <SelectItem value="support">{bn ? 'সাপোর্ট' : 'Support'}</SelectItem>
                    <SelectItem value="general">{bn ? 'সহায়ক' : 'General'}</SelectItem>
                    <SelectItem value="staff">{bn ? 'স্টাফ' : 'Staff'}</SelectItem>
                    <SelectItem value="admin">{bn ? 'অ্যাডমিন' : 'Admin'}</SelectItem>
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

        {/* Staff Profile Detail Dialog */}
        <Dialog open={!!viewStaff} onOpenChange={o => { if (!o) setViewStaff(null); }}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-[40px]">
            <DialogHeader><DialogTitle className="text-center">{staffType === 'teacher' ? (bn ? 'শিক্ষক প্রোফাইল' : 'Teacher Profile') : (bn ? 'স্টাফ প্রোফাইল' : 'Staff Profile')}</DialogTitle></DialogHeader>
            {viewStaff && <StaffProfileModal staff={viewStaff} bn={bn} />}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminStaff;
