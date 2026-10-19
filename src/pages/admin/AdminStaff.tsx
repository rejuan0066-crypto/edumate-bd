import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Trash2, Loader2, Pencil, UserPlus, Eye, EyeOff, User, FileText, Check, X, Award, Power, PowerOff, Clock, BarChart3, ClipboardList, Layers, ShieldAlert, Download } from 'lucide-react';
import StaffProfileModal from '@/components/profile/StaffProfileModal';
import StaffLetterDialog from '@/components/admin/StaffLetterDialog';
import StaffDutyTimeDialog from '@/components/admin/StaffDutyTimeDialog';
import StaffMonthlyAttendanceDialog from '@/components/admin/StaffMonthlyAttendanceDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { useResignedStaff } from '@/hooks/useResignedStaff';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useAuth } from '@/hooks/useAuth';
import { useConfirm } from '@/contexts/ConfirmContext';
import { isAdminRole } from '@/lib/roles';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useCommitteeStaffIds } from '@/hooks/useCommitteeStaffIds';
import CommitteeExclusionNotice from '@/components/CommitteeExclusionNotice';
import PasswordStrengthMeter, { isPasswordStrongAgainst, firstFailedRuleMessage, usePasswordPolicy } from '@/components/PasswordStrengthMeter';
import { sanitizePasswordInput } from '@/lib/passwordInput';
import { parseEdgeError } from '@/lib/edgeError';
import { invalidateAllStaffQueries } from '@/lib/staffQueryInvalidator';
import { sortStaffByDepartment } from '@/lib/staffOrderHelper';
import { getStaffDisplayNames } from '@/lib/nameFormatter';


export type StaffPageType = 'all' | 'staff' | 'teacher' | 'administrative' | 'support' | 'director' | 'committee_member';

// Fallback keyword matching (used when designation has no staff_category in DB)
const TEACHER_KEYWORDS = ['teacher', 'শিক্ষক', 'ustaz', 'ustad', 'মুআল্লিম', 'মুয়াল্লিম'];
const ADMIN_STAFF_KEYWORDS = ['administrative', 'প্রশাসনিক', 'principal', 'প্রিন্সিপাল', 'vice-principal', 'সহ-প্রিন্সিপাল', 'উপাধ্যক্ষ', 'অধ্যক্ষ', 'manager', 'ম্যানেজার', 'officer', 'অফিসার', 'director', 'পরিচালক', 'admin', 'এডমিন', 'super admin', 'সুপার এডমিন'];
const GENERAL_STAFF_KEYWORDS = ['peon', 'পিয়ন', 'guard', 'প্রহরী', 'গার্ড', 'cleaner', 'পরিচ্ছন্নতাকর্মী', 'সহায়ক', 'helper', 'driver', 'ড্রাইভার'];
const SUPPORT_STAFF_KEYWORDS = ['অফিস সহকারী', 'clerk', 'কেরানি', 'operator', 'অপারেটর', 'accountant', 'হিসাবরক্ষক', 'librarian', 'লাইব্রেরিয়ান', 'data entry', 'ডাটা এন্ট্রি'];

const getStaffCategory = (staff: any, designationsMap: Map<string, string>, availableCategories?: Set<string>): string => {
  const isAvailable = (key: string) => !availableCategories || availableCategories.size === 0 || availableCategories.has(key);
  // 1. Use stored staff_category column if available and not default
  if (staff?.staff_category && staff.staff_category !== 'general' && isAvailable(staff.staff_category)) return staff.staff_category;
  // 2. Check DB-based category from designation name
  const designation = staff?.designation;
  if (designation) {
    const dbCategory = designationsMap.get(designation.toLowerCase());
    if (dbCategory && isAvailable(dbCategory)) return dbCategory;
    const lower = designation.toLowerCase();
    if (isAvailable('teacher') && TEACHER_KEYWORDS.some(k => lower.includes(k))) return 'teacher';
    if (isAvailable('administrative') && ADMIN_STAFF_KEYWORDS.some(k => lower.includes(k))) return 'administrative';
    if (isAvailable('support') && SUPPORT_STAFF_KEYWORDS.some(k => lower.includes(k))) return 'support';
    if (isAvailable('general') && GENERAL_STAFF_KEYWORDS.some(k => lower.includes(k))) return 'general';
  }
  // 3. Use stored staff_category (could be 'general' default)
  if (staff?.staff_category && isAvailable(staff.staff_category)) return staff.staff_category;
  // 4. Fallback: department field
  const dept = (staff?.department || '').toLowerCase();
  if (isAvailable('general') && (dept === 'general' || dept === 'সাধারণ' || dept === 'সহায়ক')) return 'general';
  if (isAvailable('teacher') && (dept === 'teacher' || dept === 'শিক্ষক' || dept.includes('শিক্ষা'))) return 'teacher';
  if (isAvailable('administrative') && (dept === 'administrative' || dept === 'প্রশাসন' || dept === 'প্রশাসনিক')) return 'administrative';
  if (isAvailable('support') && (dept === 'support' || dept === 'অফিস')) return 'support';
  return isAvailable('general') ? 'general' : (availableCategories?.values().next().value || 'general');
};

const AdminStaff = ({ staffType = 'all' }: { staffType?: StaffPageType }) => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const menuPath = staffType === 'teacher' ? '/admin/teachers' : staffType === 'administrative' ? '/admin/administrative-staff' : staffType === 'support' ? '/admin/support-staff' : staffType === 'staff' ? '/admin/general-staff' : staffType === 'director' ? '/admin/directors' : staffType === 'committee_member' ? '/admin/committee-members' : '/admin/staff';
  const { checkApproval, isRecordPending, needsApproval } = useApprovalCheck(menuPath, 'staff');
  const { role } = useAuth();
  const { canViewPage, canAddItem, canEditItem, canDeleteItem, isFeatureAllowed } = usePagePermissions(menuPath);
  const confirm = useConfirm();
  const bn = language === 'bn';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'name' | 'staff_id' | 'designation' | 'department' | 'status'>('department');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewStaff, setViewStaff] = useState<any>(null);
  const [letterStaff, setLetterStaff] = useState<any>(null);
  const [dutyStaff, setDutyStaff] = useState<any>(null);
  const [monthlyAttendanceStaff, setMonthlyAttendanceStaff] = useState<any>(null);

  // Account creation dialog state
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [accEmail, setAccEmail] = useState('');
  const [accPassword, setAccPassword] = useState('');
  const passwordPolicy = usePasswordPolicy();

  const [accRole, setAccRole] = useState('none');
  const [accCreating, setAccCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatingIds, setGeneratingIds] = useState(false);
  const [sortingByDept, setSortingByDept] = useState(false);
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

  // Auto-correct any legacy staff IDs missing the year (e.g. TCH-2017 -> TCH-2026-2017)
  useEffect(() => {
    if (!isAdminRole(role) || !staffListRaw || staffListRaw.length === 0) return;
    const malformed = (staffListRaw as any[]).filter(
      (s) => s.staff_id && /^([A-Za-z]+)-(\d{4,})$/.test(s.staff_id)
    );
    if (malformed.length === 0) return;

    let isCancelled = false;
    (async () => {
      let changed = false;
      for (const s of malformed) {
        if (isCancelled) break;
        const match = s.staff_id.match(/^([A-Za-z]+)-(\d{4,})$/);
        if (match) {
          const prefix = match[1];
          const serial = match[2];
          const year = s.joining_date ? new Date(s.joining_date).getFullYear() : new Date().getFullYear();
          const correctedId = `${prefix}-${year}-${serial}`;
          const { error } = await supabase.from('staff').update({ staff_id: correctedId }).eq('id', s.id);
          if (!error) changed = true;
        }
      }
      if (!isCancelled && changed) {
        queryClient.invalidateQueries({ queryKey: ['staff'] });
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [staffListRaw, role, queryClient]);

  // Ensure id_format_config has include_year = true and reset_mode = 'yearly' for staff entities
  useEffect(() => {
    if (!isAdminRole(role)) return;
    (async () => {
      try {
        const { data: configs } = await supabase.from('id_format_config').select('entity_key, include_year, reset_mode');
        if (configs && configs.length > 0) {
          const needFix = configs.filter((c: any) => !c.include_year || c.reset_mode !== 'yearly');
          if (needFix.length > 0) {
            await supabase
              .from('id_format_config')
              .update({ include_year: true, reset_mode: 'yearly' })
              .in('entity_key', needFix.map((c: any) => c.entity_key));
          }
        }
      } catch {}
    })();
  }, [role]);

  const { data: designationsList = [] } = useQuery({
    queryKey: ['designations-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('designations').select('id, name, name_bn, staff_category').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: staffCategories = [] } = useQuery({
    queryKey: ['staff_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_categories')
        .select('key, name, name_bn, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: customRoles = [] } = useQuery({
    queryKey: ['custom-roles-active'],
    queryFn: async () => {
      const { data, error } = await supabase.from('custom_roles').select('id, name, name_bn, base_role').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const designationsMap = useMemo(() => {
    const map = new Map<string, string>();
    designationsList.forEach((d: any) => {
      if (d.staff_category) {
        if (d.name) map.set(d.name.toLowerCase(), d.staff_category);
        if (d.name_bn) map.set(d.name_bn.toLowerCase(), d.staff_category);
      }
    });
    return map;
  }, [designationsList]);

  const activeCategoryKeys = useMemo(
    () => new Set((staffCategories as any[]).map((c: any) => c.key)),
    [staffCategories]
  );

  const labelForCategory = useMemo(() => (key: string) => {
    const category = (staffCategories as any[]).find((c: any) => c.key === key);
    if (category) return bn ? (category.name_bn || category.name) : (category.name || category.name_bn);

    const fallbackLabels: Record<string, { bn: string; en: string }> = {
      teacher: { bn: 'শিক্ষক', en: 'Teacher' },
      support: { bn: 'অফিস কর্মচারী', en: 'Support Staff' },
      general: { bn: 'সহায়ক কর্মী', en: 'General Staff' },
      director: { bn: 'পরিচালক', en: 'Director' },
      committee_member: { bn: 'কমিটি সদস্য', en: 'Committee Member' },
      administrative: { bn: 'প্রশাসনিক', en: 'Administrative' },
    };
    return fallbackLabels[key]?.[bn ? 'bn' : 'en'] || key;
  }, [staffCategories, bn]);


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
          let letterNumber = '';
          try {
            const { data: jlData, error: jlErr } = await (supabase as any).rpc('generate_joining_letter_number');
            if (!jlErr && jlData) letterNumber = jlData;
          } catch {}
          if (!letterNumber) {
            letterNumber = `JL-${year}-${String(Date.now()).slice(-3)}`;
          }
          await supabase.from('joining_letters').insert({
            staff_id: id,
            staff_name: staff.name_en || '',
            staff_name_bn: staff.name_bn || '',
            designation: staff.designation || '',
            joining_date: sd.joining_date || new Date().toISOString().split('T')[0],
            letter_number: letterNumber,
            letter_date: new Date().toISOString().split('T')[0],
            letter_data: { phone: staff.phone, department: staff.department, nid: sd.nid, photo_url: staff.photo_url || '' },
          } as any);
        }
      }
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['staff'] });
      const previousStaff = queryClient.getQueryData(['staff']);
      queryClient.setQueryData(['staff'], (old: any[]) => {
        if (!Array.isArray(old)) return old;
        return old.map((s: any) => s.id === id ? { ...s, status } : s);
      });
      return { previousStaff };
    },
    onSuccess: (_, { status }) => {
      invalidateAllStaffQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['joining-letters'] });
      toast.success(status === 'active' ? (bn ? '✅ অনুমোদিত ও যোগদান পত্র তৈরি হয়েছে' : '✅ Approved & Joining Letter Created') : (bn ? '❌ বাতিল করা হয়েছে' : '❌ Rejected'));
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previousStaff) {
        queryClient.setQueryData(['staff'], context.previousStaff);
      }
      toast.error(bn ? 'সমস্যা হয়েছে' : 'Error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const staff = staffList.find((s: any) => s.id === id);
      if (await checkApproval('delete', { id, name_bn: staff?.name_bn }, id, `কর্মী মুছুন: ${staff?.name_bn}`)) return;
      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllStaffQueries(queryClient);
      toast.success(bn ? 'কর্মী মুছে ফেলা হয়েছে' : 'Staff deleted');
    },
    onError: () => toast.error('Error'),
  });

  const categoryMutation = useMutation({
    mutationFn: async ({ id, category }: { id: string; category: string }) => {
      // Find the first designation matching the new category
      const matchingDesignation = designationsList.find((d: any) => d.staff_category === category);
      const newDesignation = matchingDesignation ? (bn ? matchingDesignation.name_bn : matchingDesignation.name) : null;
      // Clearing staff_id lets the BEFORE UPDATE trigger (auto_generate_staff_id)
      // regenerate it using the new category's prefix (TCH/SUP/GEN/DIR/ADM …).
      const updateData: any = { staff_category: category, staff_id: null };
      if (newDesignation) updateData.designation = newDesignation;

      const staff = staffList.find((s: any) => s.id === id);
      const staffName = staff?.name_bn || staff?.name_en || id;
      if (await checkApproval('edit', { id, ...updateData }, id, `ডিপার্টমেন্ট পরিবর্তন: ${staffName} (${category})`)) {
        return { intercepted: true };
      }

      const { data, error } = await supabase.from('staff').update(updateData).eq('id', id).select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('PERMISSION_DENIED');
      return { intercepted: false };
    },
    onSuccess: (res) => {
      invalidateAllStaffQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['all-pending-actions'] });
      if (!res?.intercepted) {
        toast.success(bn ? 'ডিপার্টমেন্ট, পদবী ও আইডি পরিবর্তন হয়েছে' : 'Department, designation & ID updated');
      }
    },
    onError: (err: any) => {
      if (err?.message === 'PERMISSION_DENIED') {
        toast.error(bn ? 'অনুমতি নেই: আপনি পরিবর্তন করতে পারবেন না' : 'Permission denied');
      } else {
        toast.error(bn ? 'সমস্যা হয়েছে' : 'Error');
      }
    },
  });

  const designationMutation = useMutation({
    mutationFn: async ({ id, designation }: { id: string; designation: string }) => {
      const staff = staffList.find((s: any) => s.id === id);
      const staffName = staff?.name_bn || staff?.name_en || id;
      if (await checkApproval('edit', { id, designation }, id, `পদবী পরিবর্তন: ${staffName} → ${designation}`)) {
        return { intercepted: true };
      }

      const { data, error } = await supabase.from('staff').update({ designation } as any).eq('id', id).select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('PERMISSION_DENIED');
      return { intercepted: false };
    },
    onSuccess: (res) => {
      invalidateAllStaffQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['all-pending-actions'] });
      if (!res?.intercepted) {
        toast.success(bn ? 'পদবী পরিবর্তন হয়েছে' : 'Designation updated');
      }
    },
    onError: (err: any) => {
      if (err?.message === 'PERMISSION_DENIED') {
        toast.error(bn ? 'অনুমতি নেই: আপনি পদবী পরিবর্তন করতে পারবেন না' : 'Permission denied');
      } else {
        toast.error(bn ? 'সমস্যা হয়েছে' : 'Error');
      }
    },
  });

  const handleAutoSortByDepartment = async () => {
    if (!staffList.length) return;
    const ok = await confirm({
      title: bn ? 'বিভাগ অনুযায়ী সিরিয়াল নির্ধারণ' : 'Auto-Assign Department Serials',
      description: bn
        ? 'আপনি কি নিশ্চিত যে সকল স্টাফ ও শিক্ষকের ক্রমিক নম্বর (সিরিয়াল) বিভাগ অনুসারে (শিক্ষা বিভাগ → প্রশাসন → অফিস → সাধারণ) সাজিয়ে ডাটাবেজে সেভ করতে চান?'
        : 'Are you sure you want to assign sequential serial numbers to all staff ordered by department in the database?',
      confirmText: bn ? 'হ্যাঁ, সাজান' : 'Yes, Reassign',
    });
    if (!ok) return;

    setSortingByDept(true);
    try {
      const sorted = sortStaffByDepartment(staffList, {
        categories: staffCategories as any[],
        designations: designationsList as any[],
        bn,
        knownCategoryKeys: activeCategoryKeys,
      });

      for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i];
        await supabase.from('staff').update({ salary_order: i + 1 }).eq('id', item.id);
      }

      invalidateAllStaffQueries(queryClient);
      toast.success(bn ? '✅ বিভাগ অনুযায়ী সকল স্টাফের সিরিয়াল সফলভাবে সাজানো হয়েছে' : '✅ Department serials successfully assigned');
    } catch (err: any) {
      console.error('Auto sort error:', err);
      toast.error(bn ? 'সিরিয়াল নির্ধারণে ত্রুটি হয়েছে' : 'Failed to assign serials');
    } finally {
      setSortingByDept(false);
    }
  };

  const typeFiltered = useMemo(() => staffType === 'all' ? staffList : staffList.filter((s: any) => {
    // Director / committee member: rely strictly on the stored staff_category column
    if (staffType === 'director') return s.staff_category === 'director';
    if (staffType === 'committee_member') return s.staff_category === 'committee_member';
    const category = getStaffCategory(s, designationsMap, activeCategoryKeys);
    if (staffType === 'teacher') return category === 'teacher';
    if (staffType === 'administrative') return category === 'administrative';
    if (staffType === 'support') return category === 'support';
    if (staffType === 'staff') return category === 'general';
    return true;
  }), [staffList, staffType, designationsMap, activeCategoryKeys]);

  const { isResignedOnDate, resignDateByStaff, getResignDate } = useResignedStaff();
  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);

  const isStaffResigned = useMemo(() => (s: any) => {
    return isResignedOnDate(s?.id, todayISO) || s?.status === 'resigned' || (s?.status === 'inactive' && !!getResignDate(s?.id));
  }, [isResignedOnDate, todayISO, getResignDate]);

  // Auto-sync staff status in DB if they have an active resignation
  useEffect(() => {
    if (!staffListRaw || (staffListRaw as any[]).length === 0) return;
    const toDeactivate = (staffListRaw as any[]).filter(
      (s: any) => s.status === 'active' && isResignedOnDate(s.id, todayISO)
    );
    if (toDeactivate.length > 0) {
      const ids = toDeactivate.map((s: any) => s.id);
      supabase
        .from('staff')
        .update({ status: 'inactive' })
        .in('id', ids)
        .then(({ error }) => {
          if (!error) {
            queryClient.invalidateQueries({ queryKey: ['staff'] });
          }
        }, console.error);
    }
  }, [staffListRaw, isResignedOnDate, todayISO, queryClient]);

  const pendingCount = useMemo(() => typeFiltered.filter((s: any) => s.status === 'pending').length, [typeFiltered]);
  const resignedCount = useMemo(() => typeFiltered.filter((s: any) => isStaffResigned(s)).length, [typeFiltered, isStaffResigned]);
  const activeCount = useMemo(() => typeFiltered.filter((s: any) => s.status === 'active' && !isStaffResigned(s)).length, [typeFiltered, isStaffResigned]);
  const inactiveCount = useMemo(() => typeFiltered.filter((s: any) => (s.status === 'inactive' || isStaffResigned(s))).length, [typeFiltered, isStaffResigned]);

  const preFiltered = useMemo(() => typeFiltered.filter((s: any) => {
    const isResigned = isStaffResigned(s);
    if (statusFilter === 'active') {
      if (isResigned || s.status !== 'active') return false;
    } else if (statusFilter === 'resigned') {
      if (!isResigned) return false;
    } else if (statusFilter === 'inactive') {
      if (s.status !== 'inactive' && !isResigned) return false;
    } else if (statusFilter !== 'all') {
      if (s.status !== statusFilter) return false;
    }
    if (departmentFilter !== 'all' && getStaffCategory(s, designationsMap, activeCategoryKeys) !== departmentFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const cat = getStaffCategory(s, designationsMap, activeCategoryKeys);
    const catLabel = labelForCategory(cat);
    return s.name_bn?.toLowerCase().includes(q)
      || s.name_en?.toLowerCase().includes(q)
      || s.designation?.toLowerCase().includes(q)
      || (s as any).staff_id?.toLowerCase().includes(q)
      || (s as any).phone?.toLowerCase().includes(q)
      || (s as any).mobile?.toLowerCase().includes(q)
      || cat.toLowerCase().includes(q)
      || catLabel.toLowerCase().includes(q)
      || (s.department || '').toLowerCase().includes(q);
  }), [typeFiltered, isStaffResigned, statusFilter, departmentFilter, designationsMap, activeCategoryKeys, search, labelForCategory]);

  const filtered = useMemo(() => {
    if (sortKey === 'department') {
      const sorted = sortStaffByDepartment(preFiltered, {
        categories: staffCategories as any[],
        designations: designationsList as any[],
        bn,
        knownCategoryKeys: activeCategoryKeys,
      });
      return sortDir === 'asc' ? sorted : [...sorted].reverse();
    }

    return [...preFiltered].sort((a, b) => {
      const getSortVal = (s: any): string => {
        switch (sortKey) {
          case 'name': return getStaffDisplayNames(s.name_bn, s.name_en, bn).primary || '';
          case 'staff_id': return s.staff_id || '\uffff'; // empty IDs sort last on asc
          case 'designation': return s.designation || '';
          case 'status': return s.status || '';
          default: return '';
        }
      };
      const av = getSortVal(a);
      const bv = getSortVal(b);
      const cmp = String(av).localeCompare(String(bv), bn ? 'bn' : 'en', { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [preFiltered, sortKey, sortDir, bn, staffCategories, designationsList, activeCategoryKeys]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const sortIcon = (key: typeof sortKey) => sortKey !== key ? '↕' : (sortDir === 'asc' ? '↑' : '↓');

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
    if (!isPasswordStrongAgainst(accPassword, passwordPolicy)) {
      toast.error(firstFailedRuleMessage(accPassword, passwordPolicy, bn) || (bn ? 'পাসওয়ার্ড নীতিমালা পূরণ করছে না' : 'Password policy not met'));
      return;
    }


    setAccCreating(true);
    try {
      // Detect custom role selection: prefix "custom:<id>"
      let baseRole: string | undefined;
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
          full_name: selectedStaff?.name_bn || selectedStaff?.name_en || '',
          staff_id: selectedStaff?.id,
        },
      });
      if (error || !data?.success) {
        toast.error(await parseEdgeError(error, data, bn));
        setAccCreating(false);
        return;
      }
      // Persist custom role link on the staff record
      if (customRoleId && selectedStaff?.id) {
        await supabase.from('staff').update({ custom_role_id: customRoleId } as any).eq('id', selectedStaff.id);
      }
      toast.success(bn ? '✅ অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!' : '✅ Account created successfully!');
      setAccountDialogOpen(false);
      invalidateAllStaffQueries(queryClient);
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
      await Promise.all(
        staffWithoutId.map((s: any) =>
          supabase.from('staff').update({ updated_at: new Date().toISOString() }).eq('id', s.id)
        )
      );
      invalidateAllStaffQueries(queryClient);
      toast.success(bn ? `${staffWithoutId.length} জন কর্মীর আইডি জেনারেট হয়েছে` : `Generated IDs for ${staffWithoutId.length} staff`);
    } catch {
      toast.error(bn ? 'আইডি জেনারেট ব্যর্থ' : 'Failed to generate IDs');
    }
    setGeneratingIds(false);
  };

  const handleExportStaff = () => {
    if (!filtered || filtered.length === 0) {
      toast.info(bn ? 'এক্সপোর্ট করার মতো কোনো কর্মী নেই' : 'No staff to export');
      return;
    }
    const headers = [
      bn ? 'ক্রম' : 'Serial',
      bn ? 'আইডি' : 'Staff ID',
      bn ? 'নাম (বাংলা)' : 'Name (Bangla)',
      bn ? 'নাম (ইংরেজি)' : 'Name (English)',
      bn ? 'পদবী' : 'Designation',
      bn ? 'ক্যাটাগরি' : 'Category',
      bn ? 'মোবাইল' : 'Mobile',
      bn ? 'যোগদানের তারিখ' : 'Joining Date',
      bn ? 'স্ট্যাটাস' : 'Status'
    ];
    const rows = filtered.map((s: any, idx: number) => {
      const cat = getStaffCategory(s, designationsMap, activeCategoryKeys);
      return [
        idx + 1,
        s.staff_id || '',
        s.name_bn || '',
        s.name_en || '',
        s.designation || '',
        labelForCategory(cat),
        s.phone || '',
        s.joining_date || '',
        s.status || ''
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `staff_list_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(bn ? 'স্টাফ তালিকা CSV এক্সপোর্ট সম্পন্ন হয়েছে' : 'Staff list exported successfully');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground leading-tight">
              {staffType === 'teacher' ? (bn ? 'শিক্ষক ব্যবস্থাপনা' : 'Teacher Management') : staffType === 'administrative' ? (bn ? 'প্রশাসনিক কর্মকর্তা ব্যবস্থাপনা' : 'Administrative Staff Management') : staffType === 'staff' ? (bn ? 'সহায়ক কর্মী ব্যবস্থাপনা' : 'General Staff Management') : staffType === 'director' ? (bn ? 'পরিচালক ব্যবস্থাপনা' : 'Director Management') : staffType === 'committee_member' ? (bn ? 'কমিটি সদস্য ব্যবস্থাপনা' : 'Committee Member Management') : t('staff')}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {staffType === 'teacher' ? (bn ? `মোট ${typeFiltered.length} জন শিক্ষক` : `Total ${typeFiltered.length} teachers`) : staffType === 'administrative' ? (bn ? `মোট ${typeFiltered.length} জন প্রশাসনিক কর্মকর্তা` : `Total ${typeFiltered.length} administrative staff`) : staffType === 'staff' ? (bn ? `মোট ${typeFiltered.length} জন সহায়ক কর্মী` : `Total ${typeFiltered.length} general staff`) : staffType === 'director' ? (bn ? `মোট ${typeFiltered.length} জন পরিচালক` : `Total ${typeFiltered.length} directors`) : staffType === 'committee_member' ? (bn ? `মোট ${typeFiltered.length} জন কমিটি সদস্য` : `Total ${typeFiltered.length} committee members`) : (bn ? `মোট ${staffList.length} জন কর্মী/শিক্ষক` : `Total ${staffList.length} staff`)}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/staff-reports')}
              className="h-8 text-xs flex items-center gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
              {bn ? 'স্টাফ রিপোর্ট' : 'Staff Reports'}
            </Button>
            {isFeatureAllowed('tab_designations') !== false && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/designations')}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-primary" />
                {bn ? 'পদবি ও ক্যাটাগরি' : 'Designations'}
              </Button>
            )}
            {isFeatureAllowed('action_export_staff') !== false && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportStaff}
                className="h-8 text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                {bn ? 'এক্সপোর্ট' : 'Export'}
              </Button>
            )}
            {isAdminRole(role) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoSortByDepartment}
                disabled={sortingByDept}
                className="h-8 text-xs flex items-center gap-1.5"
                title={bn ? 'বিভাগ অনুযায়ী সকল স্টাফের ক্রমিক নম্বর (১, ২, ৩...) ডাটাবেজে সংরক্ষণ করুন' : 'Assign sequential serial numbers department-wise in database'}
              >
                {sortingByDept ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5 text-primary" />}
                {bn ? 'বিভাগ অনুযায়ী সিরিয়াল সাজান' : 'Auto-Serial by Department'}
              </Button>
            )}
            {missingIdCount > 0 && isAdminRole(role) && (
              <Button variant="outline" size="sm" onClick={handleBulkGenerateIds} disabled={generatingIds} className="h-8 text-xs flex items-center gap-1.5">
                {generatingIds ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                {bn ? `আইডি জেনারেট (${missingIdCount})` : `Generate IDs (${missingIdCount})`}
              </Button>
            )}
            {canAddItem && isFeatureAllowed('tab_add_staff') !== false && (
              <Button size="sm" onClick={() => navigate(staffType === 'teacher' ? '/admin/teachers/add' : staffType === 'administrative' ? '/admin/administrative-staff/add' : staffType === 'staff' ? '/admin/general-staff/add' : staffType === 'director' ? '/admin/directors/add' : staffType === 'committee_member' ? '/admin/committee-members/add' : '/admin/staff/add')} className="btn-primary-gradient h-8 text-xs flex items-center gap-1.5 shadow-sm">
                <Plus className="w-3.5 h-3.5" /> {t('addNew')}
              </Button>
            )}
          </div>
        </div>

        {(!canViewPage || isFeatureAllowed('tab_staff_list') === false) ? (
          <div className="min-h-[40vh]" />
        ) : (
          <>
            <div className="card-elevated p-2.5 sm:p-4 space-y-2 lg:space-y-0 flex flex-col lg:flex-row gap-2 lg:gap-3 items-stretch lg:items-center">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={bn ? 'নাম, আইডি, পদবী, ডিপার্টমেন্ট, ফোন...' : 'Search by name, ID, designation, department, phone...'} className="pl-8 h-8 sm:h-9 text-xs sm:text-sm bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {staffType === 'all' && (
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-[170px] shrink-0">
                  <SelectValue placeholder={bn ? 'ডিপার্টমেন্ট' : 'Department'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{bn ? 'সকল ডিপার্টমেন্ট' : 'All Departments'}</SelectItem>
                  {(staffCategories as any[]).map((category: any) => (
                    <SelectItem key={category.key} value={category.key}>{labelForCategory(category.key)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {/* Scrollable Compact Filter Chips on Mobile */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`h-7 px-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === 'all' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              {bn ? 'সবগুলো' : 'All'} ({typeFiltered.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`h-7 px-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === 'active' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              {bn ? 'সক্রিয়' : 'Active'} ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('resigned')}
              className={`h-7 px-2.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-all ${
                statusFilter === 'resigned' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              <span>{bn ? 'পদত্যাগী' : 'Resigned'}</span>
              {resignedCount > 0 && (
                <span className="px-1.5 py-0 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
                  {resignedCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`h-7 px-2.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-all ${
                statusFilter === 'pending' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              <span>{bn ? 'আবেদন' : 'Pending'}</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`h-7 px-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === 'inactive' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              {bn ? 'নিষ্ক্রিয়' : 'Inactive'} ({inactiveCount})
            </button>
          </div>
        </div>

        <div className="card-elevated overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Mobile Native Card View (< md) */}
              <div className="md:hidden divide-y divide-border/60">
                {filtered.map((s: any) => {
                  const cat = getStaffCategory(s, designationsMap, activeCategoryKeys);
                  const isResigned = isStaffResigned(s);
                  const isPending = isRecordPending(s.id);
                  const displayNames = getStaffDisplayNames(s.name_bn, s.name_en, bn);
                  return (
                    <div key={s.id} className="p-3 space-y-2 bg-card/60 hover:bg-card transition-colors">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {s.photo_url ? (
                            <img src={s.photo_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-border" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                              {displayNames.primary?.[0] || '?'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-semibold text-foreground text-sm truncate leading-tight">
                              {displayNames.primary || '-'}
                            </h4>
                            {displayNames.secondary && (
                              <p className="text-[11px] text-muted-foreground truncate">{displayNames.secondary}</p>
                            )}
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {s.designation || (bn ? 'পদবী নেই' : 'No designation')} • {labelForCategory(cat)}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {isPending && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 inline-flex items-center gap-1 animate-pulse">
                              <Clock className="w-3 h-3" />
                              {bn ? 'অনুমোদনের অপেক্ষায়' : 'Pending Approval'}
                            </span>
                          )}
                          {isResigned ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                              {bn ? 'পদত্যাগী' : 'Resigned'}
                            </span>
                          ) : (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              s.status === 'active' ? 'bg-success/10 text-success' : 
                              s.status === 'pending' ? 'bg-warning/10 text-warning' : 
                              'bg-destructive/10 text-destructive'
                            }`}>
                              {s.status === 'active' ? (bn ? 'সক্রিয়' : 'Active') : 
                               s.status === 'pending' ? (bn ? 'আবেদন' : 'Pending') : 
                               (bn ? 'নিষ্ক্রিয়' : 'Inactive')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
                        <div className="flex items-center gap-2 flex-wrap">
                          {s.staff_id ? (
                            <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-4.5 bg-primary/5 text-primary border-primary/20">
                              {s.staff_id}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">{bn ? 'আইডি নেই' : 'No ID'}</span>
                          )}
                          {s.phone && (
                            <span className="text-[11px] text-muted-foreground">
                              📞 {s.phone}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-0.5">
                          <button onClick={() => setViewStaff(s)} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary active:scale-95" title={bn ? 'প্রোফাইল দেখুন' : 'View Profile'}>
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdminRole(role) && (
                            <button 
                              onClick={() => setMonthlyAttendanceStaff(s)} 
                              className={`p-1 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary active:scale-95 ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`} 
                              disabled={isPending}
                              title={bn ? 'হাজিরা ও ডিউটি রিপোর্ট' : 'Attendance & Duty Report'}
                            >
                              <ClipboardList className="w-4 h-4 text-primary" />
                            </button>
                          )}
                          {canEditItem && (
                            <button 
                              disabled={isPending}
                              onClick={() => {
                                const path = cat === 'teacher' ? 'teachers' : cat === 'administrative' ? 'administrative-staff' : cat === 'support' ? 'support-staff' : cat === 'director' ? 'directors' : cat === 'committee_member' ? 'committee-members' : 'general-staff';
                                navigate(`/admin/${path}/edit/${s.id}`);
                              }} 
                              className={`p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary active:scale-95 ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`} 
                              title={bn ? 'সম্পাদনা' : 'Edit'}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {isAdminRole(role) && canEditItem && s.status === 'active' && isFeatureAllowed('action_salary_view') !== false && (
                            <button 
                              onClick={() => setLetterStaff(s)} 
                              className={`p-1 rounded-lg hover:bg-accent/10 text-muted-foreground hover:text-accent active:scale-95 ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`} 
                              disabled={isPending}
                              title={bn ? 'পদোন্নতি / বেতন পত্র' : 'Promotion / Salary Letter'}
                            >
                              <Award className="w-4 h-4" />
                            </button>
                          )}
                          {isAdminRole(role) && canEditItem && s.status === 'active' && (
                            <button 
                              onClick={() => setDutyStaff(s)} 
                              className={`p-1 rounded-lg hover:bg-primary/10 ${s.duty_start_time ? 'text-primary' : 'text-muted-foreground hover:text-primary'} active:scale-95 ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`} 
                              disabled={isPending}
                              title={bn ? 'ব্যক্তিগত ডিউটি সময়' : 'Personal Duty Time'}
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          )}
                          {canEditItem && (s.status === 'active' || s.status === 'inactive') && isAdminRole(role) && (
                            <button
                              disabled={statusMutation.isPending || isPending}
                              onClick={async () => { const next = s.status === 'active' ? 'inactive' : 'active'; const staffName = displayNames.primary || (s.name_bn || s.name_en); const ok = await confirm({ title: bn ? (next === 'active' ? 'স্টাফ সক্রিয় করবেন?' : 'স্টাফ নিষ্ক্রিয় করবেন?') : (next === 'active' ? 'Activate staff?' : 'Deactivate staff?'), description: bn ? `"${staffName}" কে ${next === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করতে চান?` : `Are you sure you want to ${next === 'active' ? 'activate' : 'deactivate'} "${staffName}"?`, confirmText: bn ? 'হ্যাঁ' : 'Yes', cancelText: bn ? 'বাতিল' : 'Cancel', variant: next === 'active' ? 'default' : 'warning' }); if (!ok) return; statusMutation.mutate({ id: s.id, status: next }); }}
                              className={`p-1 rounded-lg ${s.status === 'active' ? 'hover:bg-destructive/10 text-muted-foreground hover:text-destructive' : 'hover:bg-success/10 text-muted-foreground hover:text-success'} active:scale-95 ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title={s.status === 'active' ? (bn ? 'নিষ্ক্রিয় করুন' : 'Inactivate') : (bn ? 'সক্রিয় করুন' : 'Activate')}
                            >
                              {s.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                            </button>
                          )}
                          {canDeleteItem && isFeatureAllowed('action_delete_staff') !== false && (
                            <button 
                              disabled={isPending}
                              onClick={() => setDeleteId(s.id)} 
                              className={`p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive active:scale-95 ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`} 
                              title={bn ? 'মুছুন' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">{bn ? 'কোনো কর্মী পাওয়া যায়নি' : 'No staff found'}</div>
                )}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                   <thead className="bg-muted/40 border-b border-border/60">
                     <tr>
                       <th className="text-center w-12 px-3 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'ক্রম' : '#'}</th>
                       <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('name')}>
                         {bn ? 'নাম' : 'Name'} <span className="ml-1 opacity-60">{sortIcon('name')}</span>
                       </th>
                       <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('staff_id')}>
                         {bn ? 'স্টাফ আইডি' : 'Staff ID'} <span className="ml-1 opacity-60">{sortIcon('staff_id')}</span>
                       </th>
                       <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('designation')}>
                         {bn ? 'পদবী' : 'Designation'} <span className="ml-1 opacity-60">{sortIcon('designation')}</span>
                       </th>
                       <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('department')}>
                         {bn ? 'ডিপার্টমেন্ট' : 'Department'} <span className="ml-1 opacity-60">{sortIcon('department')}</span>
                       </th>
                       <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'মোবাইল' : 'Mobile'}</th>
                       {isAdminRole(role) && <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'অ্যাকাউন্ট' : 'Account'}</th>}
                       <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('status')}>
                         {bn ? 'স্ট্যাটাস' : 'Status'} <span className="ml-1 opacity-60">{sortIcon('status')}</span>
                       </th>
                       <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'পেন্ডিং অবস্থা' : 'Pending Status'}</th>
                       <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'অ্যাকশন' : 'Action'}</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filtered.map((s: any, i: number) => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors duration-150">
                        <td className="text-center px-3 py-3 text-xs text-muted-foreground font-mono">{i + 1}</td>
                        <td className="px-4 py-3">
                          {(() => {
                            const displayNames = getStaffDisplayNames(s.name_bn, s.name_en, bn);
                            return (
                              <div className="flex items-center gap-3">
                                {s.photo_url ? (
                                  <img src={s.photo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent-foreground font-bold text-sm">
                                    {displayNames.primary?.[0] || '?'}
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium text-foreground text-sm block">{displayNames.primary || '-'}</span>
                                  {displayNames.secondary && <span className="text-xs text-muted-foreground">{displayNames.secondary}</span>}
                                </div>
                              </div>
                            );
                          })()}
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
                            const cat = getStaffCategory(s, designationsMap, activeCategoryKeys);
                            const catDesignations = designationsList.filter((d: any) => d.staff_category === cat);
                            const isPending = isRecordPending(s.id);
                            const canChangeDesignation = isAdminRole(role) && canEditItem && isFeatureAllowed('tab_designations') !== false;

                            if (!canChangeDesignation) {
                              return <span className="text-xs font-medium text-foreground">{s.designation || '-'}</span>;
                            }

                            return (
                              <Select
                                value={s.designation || ''}
                                disabled={isPending}
                                onValueChange={(val) => designationMutation.mutate({ id: s.id, designation: val })}
                              >
                                <SelectTrigger className={`h-7 text-xs w-[150px] ${isPending ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                  <SelectValue placeholder={bn ? 'পদবী নির্বাচন' : 'Select'} />
                                </SelectTrigger>
                                <SelectContent>
                                  {catDesignations.map((d: any) => (
                                    <SelectItem key={d.id} value={bn ? d.name_bn : d.name}>
                                      {bn ? d.name_bn : d.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const isPending = isRecordPending(s.id);
                            const canChangeCategory = isAdminRole(role) && canEditItem && isFeatureAllowed('tab_designations') !== false;
                            const cat = getStaffCategory(s, designationsMap, activeCategoryKeys);

                            if (!canChangeCategory) {
                              return <Badge variant="secondary" className="text-xs font-normal">{labelForCategory(cat)}</Badge>;
                            }

                            return (
                              <Select
                                value={cat}
                                disabled={isPending}
                                onValueChange={(val) => categoryMutation.mutate({ id: s.id, category: val })}
                              >
                                <SelectTrigger className={`h-7 text-xs w-[130px] ${isPending ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(staffCategories as any[]).map((category: any) => (
                                    <SelectItem key={category.key} value={category.key}>{labelForCategory(category.key)}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                          })()}
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
                          {isStaffResigned(s) ? (
                            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 inline-flex items-center gap-1">
                              {bn ? 'পদত্যাগী' : 'Resigned'}
                              {getResignDate(s.id) && <span className="opacity-75 text-[10px]">({getResignDate(s.id)})</span>}
                            </span>
                          ) : (
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              s.status === 'active' ? 'bg-success/10 text-success' : 
                              s.status === 'pending' ? 'bg-warning/10 text-warning' : 
                              'bg-destructive/10 text-destructive'
                            }`}>
                              {s.status === 'active' ? (bn ? 'সক্রিয়' : 'Active') : 
                               s.status === 'pending' ? (bn ? 'আবেদন' : 'Pending') : 
                               (bn ? 'নিষ্ক্রিয়' : 'Inactive')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isRecordPending(s.id) && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse text-[10px]">
                              <Clock className="w-3 h-3 mr-1" />
                              {bn ? 'অ্যাডমিন অনুমোদনের অপেক্ষায়' : 'Awaiting Admin Approval'}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                          {s.status === 'pending' && isAdminRole(role) && (
                            <>
                              <button 
                                onClick={() => statusMutation.mutate({ id: s.id, status: 'active' })} 
                                className={`p-2 rounded-lg hover:bg-success/10 text-success ${isRecordPending(s.id) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} 
                                title={bn ? 'অনুমোদন' : 'Approve'} 
                                disabled={statusMutation.isPending || isRecordPending(s.id)}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setDeleteId(s.id)} 
                                className={`p-2 rounded-lg hover:bg-destructive/10 text-destructive ${isRecordPending(s.id) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} 
                                title={bn ? 'বাতিল' : 'Reject'} 
                                disabled={statusMutation.isPending || isRecordPending(s.id)}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button onClick={() => setViewStaff(s)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title={bn ? 'প্রোফাইল দেখুন' : 'View Profile'}><Eye className="w-4 h-4" /></button>
                          {isAdminRole(role) && (
                            <button 
                              onClick={() => setMonthlyAttendanceStaff(s)} 
                              className={`p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary ${isRecordPending(s.id) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} 
                              disabled={isRecordPending(s.id)}
                              title={bn ? 'হাজিরা ও ডিউটি রিপোর্ট' : 'Attendance & Duty Report'}
                            >
                              <ClipboardList className="w-4 h-4 text-primary" />
                            </button>
                          )}
                          {isAdminRole(role) && canEditItem && s.status === 'active' && isFeatureAllowed('action_salary_view') !== false && (
                            <button 
                              onClick={() => setLetterStaff(s)} 
                              className={`p-2 rounded-lg hover:bg-accent/10 text-muted-foreground hover:text-accent ${isRecordPending(s.id) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} 
                              disabled={isRecordPending(s.id)}
                              title={bn ? 'পদোন্নতি / বেতন পত্র' : 'Promotion / Salary Letter'}
                            >
                              <Award className="w-4 h-4" />
                            </button>
                          )}
                          {isAdminRole(role) && canEditItem && s.status === 'active' && (
                            <button 
                              onClick={() => setDutyStaff(s)} 
                              className={`p-2 rounded-lg hover:bg-primary/10 ${s.duty_start_time ? 'text-primary' : 'text-muted-foreground hover:text-primary'} ${isRecordPending(s.id) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} 
                              disabled={isRecordPending(s.id)}
                              title={bn ? 'ব্যক্তিগত ডিউটি সময়' : 'Personal Duty Time'}
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          )}
                          {canEditItem && (s.status === 'active' || s.status === 'inactive') && isAdminRole(role) && (
                            <button
                              disabled={statusMutation.isPending || isRecordPending(s.id)}
                              onClick={async () => { const next = s.status === 'active' ? 'inactive' : 'active'; const staffName = getStaffDisplayNames(s.name_bn, s.name_en, bn).primary || (s.name_bn || s.name_en); const ok = await confirm({ title: bn ? (next === 'active' ? 'স্টাফ সক্রিয় করবেন?' : 'স্টাফ নিষ্ক্রিয় করবেন?') : (next === 'active' ? 'Activate staff?' : 'Deactivate staff?'), description: bn ? `"${staffName}" কে ${next === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করতে চান?` : `Are you sure you want to ${next === 'active' ? 'activate' : 'deactivate'} "${staffName}"?`, confirmText: bn ? 'হ্যাঁ' : 'Yes', cancelText: bn ? 'বাতিল' : 'Cancel', variant: next === 'active' ? 'default' : 'warning' }); if (!ok) return; statusMutation.mutate({ id: s.id, status: next }); }}
                              className={`p-2 rounded-lg ${s.status === 'active' ? 'hover:bg-destructive/10 text-muted-foreground hover:text-destructive' : 'hover:bg-success/10 text-muted-foreground hover:text-success'} ${isRecordPending(s.id) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                              title={s.status === 'active' ? (bn ? 'নিষ্ক্রিয় করুন' : 'Inactivate') : (bn ? 'সক্রিয় করুন' : 'Activate')}
                            >
                              {s.status === 'active' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                            </button>
                          )}
                          {canEditItem && (
                            <button 
                              disabled={isRecordPending(s.id)}
                              onClick={() => {
                                const cat = getStaffCategory(s, designationsMap, activeCategoryKeys);
                                const path = cat === 'teacher' ? 'teachers' : cat === 'administrative' ? 'administrative-staff' : cat === 'support' ? 'support-staff' : cat === 'director' ? 'directors' : cat === 'committee_member' ? 'committee-members' : 'general-staff';
                                navigate(`/admin/${path}/edit/${s.id}`);
                              }} 
                              className={`p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary ${isRecordPending(s.id) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} 
                              title={bn ? 'সম্পাদনা' : 'Edit'}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDeleteItem && isFeatureAllowed('action_delete_staff') !== false && (
                            <button 
                              disabled={isRecordPending(s.id)}
                              onClick={() => setDeleteId(s.id)} 
                              className={`p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive ${isRecordPending(s.id) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} 
                              title={bn ? 'মুছুন' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
            </>
          )}
        </div>
      </>
    )}

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
              <p className="text-xs text-muted-foreground mt-2 px-2 py-1 bg-muted/50 rounded italic border-l-2 border-primary/30">
                {bn ? 'অ্যাকাউন্ট তৈরি করতে ইমেইল ও পাসওয়ার্ড প্রদান করুন। পাসওয়ার্ড অবশ্যই ইংরেজি অক্ষরে হতে হবে এবং এতে কমপক্ষে ৬টি অক্ষর, বড়/ছোট হাতের অক্ষর, সংখ্যা ও বিশেষ চিহ্ন থাকতে হবে।' : 'Provide email and password to create an account. Password must be in English and include at least 6 characters, uppercase/lowercase letters, numbers, and symbols.'}
              </p>
              <p className="text-sm text-muted-foreground">
                {bn ? `কর্মী: ${getStaffDisplayNames(selectedStaff?.name_bn, selectedStaff?.name_en, bn).primary || ''}` : `Staff: ${getStaffDisplayNames(selectedStaff?.name_bn, selectedStaff?.name_en, bn).primary || ''}`}
              </p>
              <div className="space-y-2">
                <Label>{bn ? 'ইমেইল' : 'Email'}</Label>
                <Input type="email" value={accEmail} onChange={e => setAccEmail(e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label>{bn ? 'পাসওয়ার্ড' : 'Password'}</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={accPassword} onChange={e => setAccPassword(sanitizePasswordInput(e.target.value))} placeholder={bn ? 'ইংরেজি অক্ষর, সংখ্যা ও চিহ্নের মিশ্রণ' : 'Mix of English letters, numbers & symbols'} className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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
                    <SelectItem value="none">{bn ? 'রোল ছাড়া' : 'No Role'}</SelectItem>
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

        {/* Staff Profile Detail Dialog */}
        <Dialog open={!!viewStaff} onOpenChange={o => { if (!o) setViewStaff(null); }}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-[40px]">
            <DialogHeader><DialogTitle className="text-center">{staffType === 'teacher' ? (bn ? 'শিক্ষক প্রোফাইল' : 'Teacher Profile') : (bn ? 'স্টাফ প্রোফাইল' : 'Staff Profile')}</DialogTitle></DialogHeader>
            {viewStaff && <StaffProfileModal staff={viewStaff} bn={bn} showSalary={isFeatureAllowed('action_salary_view') !== false} />}
          </DialogContent>
        </Dialog>

        {/* Promotion / Salary Letter Dialog */}
        <StaffLetterDialog open={!!letterStaff} onOpenChange={(o) => { if (!o) setLetterStaff(null); }} staff={letterStaff} bn={bn} />
        <StaffDutyTimeDialog open={!!dutyStaff} onOpenChange={(o) => { if (!o) setDutyStaff(null); }} staff={dutyStaff} bn={bn} />
        <StaffMonthlyAttendanceDialog open={!!monthlyAttendanceStaff} onOpenChange={(o) => { if (!o) setMonthlyAttendanceStaff(null); }} staff={monthlyAttendanceStaff} />
      </div>
    </AdminLayout>
  );
};

export default AdminStaff;
