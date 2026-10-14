import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { usePersistentTab } from '@/hooks/usePersistentTab';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Loader2, Trash2, Eye, EyeOff, AlertTriangle, KeyRound, Save, Pencil, ShieldCheck, Tag, Shield, UserCircle, Mail, SendHorizonal, UserPlus, Users2, LayoutGrid, Sliders, CheckCircle2, ArrowRight, ArrowLeft, RefreshCw, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AccessControlTab from '@/components/admin/AccessControlTab';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { isAdminRole } from '@/lib/roles';
import { useOtpService } from '@/hooks/useOtpService';
import { useAuth } from '@/hooks/useAuth';
import PasswordStrengthMeter, { isPasswordStrongAgainst, firstFailedRuleMessage, usePasswordPolicy } from '@/components/PasswordStrengthMeter';
import { sanitizePasswordInput } from '@/lib/passwordInput';
import { edgeErrorBody } from '@/lib/edgeError';
import { useConfirm } from "@/contexts/ConfirmContext";
import { useMenuSettings } from '@/hooks/useMenuSettings';
import { flattenMenuPaths, mergeMenuPaths, DEFAULT_MENU_PATHS } from '@/lib/menuPathList';
import { Search } from 'lucide-react';
import { useSignatoryAuthorities, CORE_SIGNATORY_ROLES } from '@/hooks/useSignatoryAuthorities';
import { PermissionPageEditor, PagePermItem } from '@/components/admin/PermissionPageEditor';

interface UserItem {
  id: string;
  email: string;
  role: string;
  full_name: string;
  profile_full_name?: string;
  staff?: LinkedStaff | null;
  status: string;
  created_at: string;
}

interface UserPerm {
  menu_path: string;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  approval_view: boolean;
  approval_add: boolean;
  approval_edit: boolean;
  approval_delete: boolean;
}

interface CustomRole {
  id: string;
  name: string;
  name_bn: string;
  description: string | null;
  description_bn: string | null;
  base_role: string;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
}

interface LinkedStaff {
  id: string;
  name_bn: string | null;
  name_en: string | null;
  designation: string | null;
  staff_category: string | null;
  photo_url: string | null;
}

interface StaffCategoryOption {
  key: string;
  name: string | null;
  name_bn: string | null;
}

interface MasterDesignationOption {
  id: string;
  name: string | null;
  name_bn: string | null;
  staff_category: string | null;
}

const AdminUserManagement = () => {
  const confirm = useConfirm();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const passwordPolicy = usePasswordPolicy();
  const { menuConfig } = useMenuSettings();
  // Every page/tab of the sidebar becomes permission-controllable, merged with
  // the static fallback list so nothing disappears while the config loads.
  const allMenuPaths = useMemo(
    () => mergeMenuPaths(flattenMenuPaths(menuConfig?.sidebar ?? []), DEFAULT_MENU_PATHS),
    [menuConfig],
  );

  const [permSearch, setPermSearch] = useState('');

  const matchesPermSearch = (menuPath: string) => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return true;
    const info = allMenuPaths.find(m => m.path === menuPath);
    return (
      menuPath.toLowerCase().includes(q) ||
      (info?.label_bn ?? '').toLowerCase().includes(q) ||
      (info?.label_en ?? '').toLowerCase().includes(q)
    );
  };

  const bulkSetUserPerms = (field: 'can_view' | 'can_add' | 'can_edit' | 'can_delete' | 'can_approve') => {
    setUserPerms(prev => {
      const visible = prev.filter(p => matchesPermSearch(p.menu_path));
      const allOn = visible.length > 0 && visible.every(p => (p as any)[field]);
      return prev.map(p => (matchesPermSearch(p.menu_path) ? { ...p, [field]: !allOn } : p));
    });
  };

  const bulkSetRolePerms = (field: 'can_view' | 'can_add' | 'can_edit' | 'can_delete' | 'can_approve') => {
    setRolePerms(prev => {
      const visible = prev.filter(p => matchesPermSearch(p.menu_path));
      const allOn = visible.length > 0 && visible.every(p => (p as any)[field]);
      return prev.map(p => (matchesPermSearch(p.menu_path) ? { ...p, [field]: !allOn } : p));
    });
  };

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/user-management');
  const { role: currentUserRole } = useAuth();
  const { authorities = [] } = useSignatoryAuthorities();

  const [activeTab, setActiveTab] = usePersistentTab<'users' | 'roles' | 'access'>('users', {
    paramName: 'tab',
    validTabs: ['users', 'roles', 'access'] as const,
    storageKey: 'edumate_user_management_tab',
  });

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<UserItem | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileEditName, setProfileEditName] = useState('');
  const [profileEditStaffNameBn, setProfileEditStaffNameBn] = useState('');
  const [profileEditStaffNameEn, setProfileEditStaffNameEn] = useState('');
  const [profileEditDesignation, setProfileEditDesignation] = useState('');
  const [profileEditStaffCategory, setProfileEditStaffCategory] = useState('');
  const [profileEditEmail, setProfileEditEmail] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [profileShowPw, setProfileShowPw] = useState(false);
  const [profileSaving, setProfileSaving] = useState<string | null>(null);
  // OTP states
  const [emailOtpEnabled, setEmailOtpEnabled] = useState(false);
  const [pwOtpEnabled, setPwOtpEnabled] = useState(false);
  const [emailOtpStep, setEmailOtpStep] = useState(false); // shows OTP UI after clicking change
  const [pwOtpStep, setPwOtpStep] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [pwOtpSent, setPwOtpSent] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [pwOtpCode, setPwOtpCode] = useState('');
  const { sendOtp, verifyOtp, sending: otpSending, verifying: otpVerifying } = useOtpService();

  // Create form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createStaffCategory, setCreateStaffCategory] = useState('');
  const [createDesignation, setCreateDesignation] = useState('');
  const [role, setRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Real-time duplicate check
  const [emailDup, setEmailDup] = useState<'idle' | 'checking' | 'ok' | 'dup' | 'invalid'>('idle');
  const [nameDup, setNameDup] = useState<'idle' | 'checking' | 'ok' | 'dup'>('idle');
  const [phoneDup, setPhoneDup] = useState<'idle' | 'checking' | 'ok' | 'dup' | 'invalid'>('idle');
  // Duplicate conflict modal
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictType, setConflictType] = useState<'email' | 'name'>('email');
  const [conflictUser, setConflictUser] = useState<{ full_name: string; email: string; role: string; phone: string; status: string } | null>(null);
  const [conflictLoading, setConflictLoading] = useState(false);

  // Multi-step user creation wizard state (1: Form, 2: Method selection, 3: Verification, 4: Success)
  const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4>(1);
  const [createMethod, setCreateMethod] = useState<'otp' | 'link'>('otp');
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [createdUserEmail, setCreatedUserEmail] = useState<string>('');
  const [createdUserName, setCreatedUserName] = useState<string>('');

  // Step 3-A: OTP
  const [createOtpCode, setCreateOtpCode] = useState<string>('');
  const [createOtpSending, setCreateOtpSending] = useState<boolean>(false);
  const [createOtpVerifying, setCreateOtpVerifying] = useState<boolean>(false);
  const [createOtpCooldown, setCreateOtpCooldown] = useState<number>(0);

  // Step 3-B: Link Pending & Polling
  const [linkChecking, setLinkChecking] = useState<boolean>(false);
  const [linkCooldown, setLinkCooldown] = useState<number>(0);

  useEffect(() => {
    if (createOtpCooldown <= 0) return;
    const timer = setInterval(() => setCreateOtpCooldown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [createOtpCooldown]);

  useEffect(() => {
    if (linkCooldown <= 0) return;
    const timer = setInterval(() => setLinkCooldown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [linkCooldown]);

  // Live polling for email confirmation when Step 3 with Link method is active
  useEffect(() => {
    if (!dialogOpen || createStep !== 3 || createMethod !== 'link' || !createdUserId) return;
    let isCancelled = false;

    const checkStatus = async () => {
      try {
        const { data } = await supabase.functions.invoke('manage-users', {
          body: { action: 'check_email_confirmed', user_id: createdUserId },
        });
        if (!isCancelled && data?.confirmed) {
          try {
            await supabase.from('profiles').update({ status: 'approved' }).eq('id', createdUserId);
          } catch (_) {}
          setCreateStep(4);
          toast.success(bn ? '🎉 ইমেইল ভেরিফিকেশন সফলভাবে সম্পন্ন হয়েছে!' : '🎉 Email verification completed!');
          fetchUsers();
        }
      } catch (err) {
        console.error('Polling email confirmation status error:', err);
      }
    };

    const interval = setInterval(checkStatus, 3500);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [dialogOpen, createStep, createMethod, createdUserId, bn]);

  const showConflict = useCallback(async (type: 'email' | 'name', value: string) => {
    setConflictType(type);
    setConflictOpen(true);
    setConflictLoading(true);
    setConflictUser(null);
    try {
      const v = value.trim().toLowerCase();
      const existing = users.find(u =>
        type === 'email'
          ? u.email?.toLowerCase() === v
          : (u.full_name || '').toLowerCase() === v
      );
      let phone = '';
      if (existing?.id) {
        const { data: prof } = await supabase.from('profiles').select('phone').eq('id', existing.id).maybeSingle();
        phone = prof?.phone || '';
      } else if (type === 'name') {
        // Server-side fallback when not in loaded list
        const { data: prof } = await supabase.from('profiles').select('id, full_name, phone, status').ilike('full_name', value.trim()).maybeSingle();
        if (prof) {
          setConflictUser({ full_name: prof.full_name || '', email: '', role: '—', phone: prof.phone || '', status: prof.status || '' });
          setConflictLoading(false);
          return;
        }
      }
      if (existing) {
        setConflictUser({
          full_name: existing.full_name || '—',
          email: existing.email || '',
          role: existing.role || '—',
          phone,
          status: existing.status || '',
        });
      }
    } finally {
      setConflictLoading(false);
    }
  }, [users]);


  // Role edit
  const [roleEditOpen, setRoleEditOpen] = useState(false);
  const [roleEditUser, setRoleEditUser] = useState<UserItem | null>(null);
  const [newRole, setNewRole] = useState('');
  const [roleUpdating, setRoleUpdating] = useState(false);

  // Custom role management
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleNameBn, setRoleNameBn] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [roleDescBn, setRoleDescBn] = useState('');
  const [roleBaseRole, setRoleBaseRole] = useState('staff');
  const [roleSaving, setRoleSaving] = useState(false);

  // Role permission dialog
  const [rolePermDialogOpen, setRolePermDialogOpen] = useState(false);
  const [rolePermRole, setRolePermRole] = useState<CustomRole | null>(null);
  const [rolePermLoading, setRolePermLoading] = useState(false);
  const [rolePermSaving, setRolePermSaving] = useState(false);
  const [rolePerms, setRolePerms] = useState<{ menu_path: string; can_view: boolean; can_add: boolean; can_edit: boolean; can_delete: boolean; can_approve: boolean }[]>([]);

  // Permission dialog
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permUser, setPermUser] = useState<UserItem | null>(null);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [userPerms, setUserPerms] = useState<UserPerm[]>([]);
  const [activePermEditor, setActivePermEditor] = useState<{
    mode: 'user' | 'role';
    target: any;
    perms: PagePermItem[];
    hiddenFeatures: Record<string, boolean>;
  } | null>(null);
  const [permPageLoading, setPermPageLoading] = useState(false);

  // Fetch custom roles
  const { data: customRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as CustomRole[];
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
      return (data || []) as StaffCategoryOption[];
    },
  });

  const { data: masterDesignations = [] } = useQuery({
    queryKey: ['designations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('designations')
        .select('id, name, name_bn, staff_category, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as MasterDesignationOption[];
    },
  });

  const getCategoryLabel = (key?: string | null) => {
    if (!key) return '';
    const category = staffCategories.find((cat) => cat.key === key);
    return (bn ? category?.name_bn : category?.name) || category?.name_bn || category?.name || key;
  };

  // Map of user_id -> linked staff (for showing designation/category in the user list)
  const [staffByUser, setStaffByUser] = useState<Record<string, LinkedStaff>>({});
  // Map of user_id -> linked administrative officer
  const [adminOfficerByUser, setAdminOfficerByUser] = useState<Record<string, { id: string; name_bn: string; designation: string | null }>>({});
  const [linkSaving, setLinkSaving] = useState<'staff' | 'officer' | null>(null);

  const getUserDisplayName = (user?: UserItem | null) => {
    if (!user) return '';
    const linked = staffByUser[user.id];
    const officer = adminOfficerByUser[user.id];
    return linked?.name_bn || linked?.name_en || officer?.name_bn || user.full_name || user.profile_full_name || user.email || '—';
  };

  const getUserDesignation = (user?: UserItem | null): string | null => {
    if (!user) return null;
    const linked = staffByUser[user.id];
    if (linked?.designation) return linked.designation;
    const officer = adminOfficerByUser[user.id];
    return officer?.designation || null;
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        method: 'GET',
      });
      if (error) throw error;
      const list: UserItem[] = data?.users || [];
      setUsers(list);

      const includedStaffMap: Record<string, LinkedStaff> = {};
      list.forEach((u) => {
        if (u.staff?.id) includedStaffMap[u.id] = u.staff;
      });

      // Pull linked staff records if the function response does not include them yet
      const ids = list.map(u => u.id).filter(Boolean);
      if (Object.keys(includedStaffMap).length > 0) {
        setStaffByUser(includedStaffMap);
      } else if (ids.length > 0) {
        const { data: staffRows } = await supabase
          .from('staff')
          .select('id, user_id, name_bn, name_en, designation, staff_category, photo_url')
          .in('user_id', ids)
          .is('deleted_at', null);
        const map: Record<string, LinkedStaff> = {};
        (staffRows || []).forEach(r => {
          if (r.user_id) map[r.user_id] = { id: r.id, name_bn: r.name_bn, name_en: r.name_en, designation: r.designation, staff_category: r.staff_category, photo_url: r.photo_url };
        });
        setStaffByUser(map);
      } else {
        setStaffByUser({});
      }

      // Pull administrative_officers linked by user_id
      if (ids.length > 0) {
        const { data: officerRows } = await supabase
          .from('administrative_officers' as any)
          .select('id, user_id, name_bn, designation')
          .in('user_id', ids)
          .is('deleted_at', null);
        const omap: Record<string, { id: string; name_bn: string; designation: string | null }> = {};
        (officerRows || []).forEach((r: any) => {
          if (r.user_id) omap[r.user_id] = { id: r.id, name_bn: r.name_bn, designation: r.designation };
        });
        setAdminOfficerByUser(omap);
      } else {
        setAdminOfficerByUser({});
      }
    } catch {
      toast.error(bn ? 'ইউজার তালিকা লোড ব্যর্থ' : 'Failed to load users');
    }
    setLoading(false);
  }, [bn]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Real-time email duplicate check (debounced + DB lookup)
  useEffect(() => {
    if (!dialogOpen) return;
    const v = email.trim().toLowerCase();
    if (!v) { setEmailDup('idle'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(v)) { setEmailDup('invalid'); return; }
    if (users.some(u => u.email?.toLowerCase() === v)) { setEmailDup('dup'); return; }
    setEmailDup('checking');
    const t = setTimeout(() => {
      // Authoritative check against freshly-loaded users list
      if (users.some(u => u.email?.toLowerCase() === v)) setEmailDup('dup');
      else setEmailDup('ok');
    }, 400);
    return () => clearTimeout(t);
  }, [email, users, dialogOpen]);

  // Real-time name duplicate check (debounced + DB lookup against profiles)
  useEffect(() => {
    if (!dialogOpen) return;
    const v = fullName.trim();
    if (!v) { setNameDup('idle'); return; }
    if (users.some(u => (u.full_name || '').toLowerCase() === v.toLowerCase())) { setNameDup('dup'); return; }
    setNameDup('checking');
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .ilike('full_name', v)
          .limit(1)
          .maybeSingle();
        if (!error && data) setNameDup('dup');
        else setNameDup('ok');
      } catch { setNameDup('ok'); }
    }, 400);
    return () => clearTimeout(t);
  }, [fullName, users, dialogOpen]);

  // Real-time phone duplicate check (debounced + DB lookup)
  useEffect(() => {
    if (!dialogOpen) return;
    const v = createPhone.trim();
    if (!v) { setPhoneDup('idle'); return; }
    // Basic phone validity (BD: 11 digits starting with 01, or international 10-15 digits)
    const phoneRegex = /^(\+?\d{10,15}|01\d{9})$/;
    if (!phoneRegex.test(v)) { setPhoneDup('invalid'); return; }
    setPhoneDup('checking');
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', v)
          .limit(1)
          .maybeSingle();
        if (!error && data) setPhoneDup('dup');
        else setPhoneDup('ok');
      } catch { setPhoneDup('ok'); }
    }, 400);
    return () => clearTimeout(t);
  }, [createPhone, dialogOpen]);

  // Reset duplicate states when dialog closes
  useEffect(() => {
    if (!dialogOpen) { setEmailDup('idle'); setNameDup('idle'); setPhoneDup('idle'); }
  }, [dialogOpen]);

  const lastCreateAtRef = useRef<number>(0);
  const CREATE_COOLDOWN_MS = 3000;

  const resetCreateWizard = () => {
    setCreateStep(1);
    setCreateMethod('otp');
    setCreatedUserId(null);
    setCreatedUserEmail('');
    setCreatedUserName('');
    setCreateOtpCode('');
    setCreateOtpCooldown(0);
    setLinkCooldown(0);
    setEmail('');
    setPassword('');
    setFullName('');
    setCreatePhone('');
    setRole('');
    setCreateStaffCategory('');
    setCreateDesignation('');
    setEmailDup('idle');
    setNameDup('idle');
    setPhoneDup('idle');
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetCreateWizard();
    }
  };

  const handleStep1Next = () => {
    if (!email.trim()) { toast.error(bn ? 'ইমেইল দিন' : 'Enter email'); return; }
    if (!fullName.trim()) { toast.error(bn ? 'ইউজারের নাম দিন' : 'Enter user name'); return; }
    if (!password) { toast.error(bn ? 'পাসওয়ার্ড দিন' : 'Password required'); return; }
    if (!isPasswordStrongAgainst(password, passwordPolicy)) { 
      toast.error(firstFailedRuleMessage(password, passwordPolicy, bn) || (bn ? 'পাসওয়ার্ড সব শর্ত পূরণ করছে না' : 'Password does not meet requirements')); 
      return; 
    }
    if (phoneDup === 'invalid') { toast.error(bn ? 'সঠিক ফোন নম্বর দিন' : 'Invalid phone number'); return; }
    if (phoneDup === 'dup') { toast.error(bn ? '⚠️ এই ফোন নম্বর দিয়ে ইতিমধ্যে একজন ইউজার রেজিস্টার্ড আছেন' : '⚠️ This phone number is already registered'); return; }

    // Wait for any in-flight debounced duplicate checks to settle
    if (emailDup === 'checking' || nameDup === 'checking' || phoneDup === 'checking') {
      toast.error(bn ? 'যাচাই সম্পন্ন হওয়ার অপেক্ষা করুন' : 'Please wait for validation to finish');
      return;
    }

    // Client-side duplicate guard against currently loaded users
    const emailLc = email.trim().toLowerCase();
    const nameLc = fullName.trim().toLowerCase();
    if (users.some(u => u.email?.toLowerCase() === emailLc)) {
      showConflict('email', email);
      return;
    }
    if (users.some(u => (u.full_name || '').toLowerCase() === nameLc)) {
      showConflict('name', fullName);
      return;
    }

    setCreateStep(2);
  };

  const handleExecuteCreation = async (methodToUse?: 'otp' | 'link') => {
    const selectedMethod = methodToUse || createMethod;
    const sinceLast = Date.now() - lastCreateAtRef.current;
    if (sinceLast < CREATE_COOLDOWN_MS) {
      const wait = Math.ceil((CREATE_COOLDOWN_MS - sinceLast) / 1000);
      toast.error(bn ? `অনুগ্রহ করে ${wait} সেকেন্ড অপেক্ষা করুন` : `Please wait ${wait}s before retrying`);
      return;
    }

    // Find the base role for custom roles (role can be empty/'none' for permission-only users)
    const effectiveRole = (role && role !== 'none') ? role : '';
    const customRole = effectiveRole ? customRoles.find(r => r.name === effectiveRole) : null;
    const actualRole = effectiveRole ? (customRole?.base_role || effectiveRole) : '';

    setCreating(true);
    lastCreateAtRef.current = Date.now();
    try {
      let { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          email: email.trim(),
          password,
          phone: createPhone.trim() || undefined,
          role: actualRole || undefined,
          full_name: fullName.trim(),
          name_bn: fullName.trim(),
          staff_category: createStaffCategory || undefined,
          designation: createDesignation || undefined,
        },
      });

      if (error && !data) data = await edgeErrorBody(error);
      if (error || !data?.success) {
        const code = data?.error || data?.code;
        if (data?.code === 'RATE_LIMITED' || (typeof error?.message === 'string' && error.message.includes('429'))) {
          const retry = data?.retry_after || 30;
          toast.error(
            data?.error
              || (bn
                ? `অনেক বেশি অনুরোধ। ${retry} সেকেন্ড পর আবার চেষ্টা করুন।`
                : `Too many requests. Try again in ${retry}s.`)
          );
          setCreating(false);
          return;
        }
        if (code === 'DUPLICATE_EMAIL' || code === 'DUPLICATE_EMAIL_AUTH' || code === 'DUPLICATE_EMAIL_AUTH_RACE' || code === 'DUPLICATE_EMAIL_STAFF' || code === 'DUPLICATE_EMAIL_ADMIN') {
          showConflict('email', email);
          setCreateStep(1);
          setCreating(false);
          return;
        }
        if (code === 'DUPLICATE_NAME') {
          showConflict('name', fullName);
          setCreateStep(1);
          setCreating(false);
          return;
        }
        if (code === 'DUPLICATE_PHONE' || code === 'DUPLICATE_PHONE_RACE' || code === 'DUPLICATE_PHONE_STAFF' || code === 'DUPLICATE_PHONE_ADMIN') {
          toast.error((bn ? data?.message_bn : data?.message) || (bn ? '⚠️ এই ফোন নম্বর দিয়ে ইতিমধ্যে একজন ইউজার রেজিস্টার্ড আছেন' : '⚠️ This phone number is already registered'));
          setPhoneDup('dup');
          setCreateStep(1);
          setCreating(false);
          return;
        }
        if (code === 'WEAK_PASSWORD') {
          toast.error((bn ? data?.message_bn : data?.message) || (bn ? 'পাসওয়ার্ড সব শর্ত পূরণ করছে না' : 'Password does not meet requirements'));
          setCreateStep(1);
          setCreating(false);
          return;
        }
        const msg = (bn ? data?.message_bn : data?.message) || data?.error || error?.message || (bn ? 'ইউজার তৈরি ব্যর্থ' : 'Failed to create user');
        toast.error(msg);
        setCreating(false);
        return;
      }

      const newUserId = data?.user_id;
      const createdEmail = email.trim();
      const createdName = fullName.trim();
      setCreatedUserId(newUserId);
      setCreatedUserEmail(createdEmail);
      setCreatedUserName(createdName);
      setCreateMethod(selectedMethod);

      // Trigger verification email via edge function
      try {
        await supabase.functions.invoke('manage-users', {
          body: { action: 'resend_verification', email: createdEmail },
        });
      } catch (_) {}

      fetchUsers();

      if (selectedMethod === 'otp') {
        setCreateOtpCooldown(60);
        setCreateStep(3);
        toast.success(bn ? `📧 ${createdEmail} এ ৬-সংখ্যার OTP পাঠানো হয়েছে!` : `📧 6-digit OTP sent to ${createdEmail}!`);
      } else {
        setLinkCooldown(60);
        setCreateStep(3);
        toast.success(bn ? `📧 ${createdEmail} এ ভেরিফিকেশন লিংক পাঠানো হয়েছে!` : `📧 Verification link sent to ${createdEmail}!`);
      }
    } catch {
      toast.error(bn ? 'ইউজার তৈরি ব্যর্থ' : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleVerifyCreateOtp = async () => {
    const code = createOtpCode.trim();
    if (code.length < 6) {
      toast.error(bn ? '৬-সংখ্যার ওটিপি কোড লিখুন' : 'Enter 6-digit OTP code');
      return;
    }
    setCreateOtpVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'verify_otp',
          email: createdUserEmail,
          token: code,
          user_id: createdUserId,
        },
      });

      if (error || !data?.success) {
        toast.error(data?.error || (bn ? 'ভেরিফিকেশন কোড সঠিক নয় বা মেয়াদোত্তীর্ণ' : 'Invalid or expired verification code'));
        setCreateOtpVerifying(false);
        return;
      }

      toast.success(bn ? '🎉 ওটিপি যাচাই সফল হয়েছে!' : '🎉 OTP verification succeeded!');
      setCreateStep(4);
      fetchUsers();
    } catch {
      toast.error(bn ? 'যাচাই প্রক্রিয়া ব্যর্থ হয়েছে' : 'Verification failed');
    } finally {
      setCreateOtpVerifying(false);
    }
  };

  const handleResendCreateOtp = async () => {
    if (createOtpCooldown > 0 || createOtpSending) return;
    setCreateOtpSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'resend_verification', email: createdUserEmail },
      });
      if (error || !data?.success) {
        toast.error(data?.error || (bn ? 'কোড পাঠাতে ব্যর্থ' : 'Failed to resend code'));
      } else {
        toast.success(bn ? 'নতুন ওটিপি কোড পাঠানো হয়েছে!' : 'New OTP code sent!');
        setCreateOtpCooldown(60);
      }
    } catch {
      toast.error(bn ? 'কোড পাঠাতে ব্যর্থ' : 'Failed to resend code');
    } finally {
      setCreateOtpSending(false);
    }
  };

  const handleManualCheckLink = async () => {
    if (linkChecking || !createdUserId) return;
    setLinkChecking(true);
    try {
      const { data } = await supabase.functions.invoke('manage-users', {
        body: { action: 'check_email_confirmed', user_id: createdUserId, email: createdUserEmail },
      });
      if (data?.confirmed) {
        try {
          await supabase.from('profiles').update({ status: 'approved' }).eq('id', createdUserId);
        } catch (_) {}
        setCreateStep(4);
        toast.success(bn ? '🎉 ইমেইল ভেরিফিকেশন সফলভাবে সম্পন্ন হয়েছে!' : '🎉 Email verification completed!');
        fetchUsers();
      } else {
        toast.info(bn ? '⏳ ইমেইল ভেরিফিকেশন এখনও অপেক্ষমাণ। ব্যবহারকারীকে ইনবক্স বা স্প্যাম ফোল্ডারের লিংকে ক্লিক করতে বলুন।' : '⏳ Email verification still pending. Ask user to click the link in inbox or spam folder.');
      }
    } catch {
      toast.error(bn ? 'স্ট্যাটাস যাচাই ব্যর্থ' : 'Failed to check status');
    } finally {
      setLinkChecking(false);
    }
  };

  const handleResendLinkInWizard = async () => {
    if (linkCooldown > 0) return;
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'resend_verification', email: createdUserEmail },
      });
      if (error || !data?.success) {
        toast.error(data?.error || (bn ? 'লিংক পাঠাতে ব্যর্থ' : 'Failed to resend link'));
      } else {
        toast.success(bn ? 'ভেরিফিকেশন লিংক পুনরায় পাঠানো হয়েছে!' : 'Verification link resent!');
        setLinkCooldown(60);
      }
    } catch {
      toast.error(bn ? 'লিংক পাঠাতে ব্যর্থ' : 'Failed to resend link');
    }
  };

  const handleManualApproveBypass = async () => {
    if (!createdUserId) return;
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'manual_confirm_email', user_id: createdUserId },
      });
      if (error || !data?.success) {
        toast.error(data?.error || (bn ? 'অনুমোদন ব্যর্থ' : 'Approval failed'));
        return;
      }
      toast.success(bn ? '✅ ইউজার সরাসরি অনুমোদিত ও সক্রিয় করা হয়েছে!' : '✅ User directly approved and activated!');
      setCreateStep(4);
      fetchUsers();
    } catch {
      toast.error(bn ? 'অনুমোদন ব্যর্থ' : 'Approval failed');
    }
  };


  const handleStatusChange = async (userId: string, status: 'pending' | 'approved') => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'update_status', user_id: userId, status },
      });
      if (error || !data?.success) {
        toast.error(data?.error || (bn ? 'স্ট্যাটাস পরিবর্তন ব্যর্থ' : 'Failed to update status'));
        return;
      }
      toast.success(status === 'approved'
        ? (bn ? '✅ ইউজার অনুমোদিত হয়েছে' : '✅ User approved')
        : (bn ? '⏸️ ইউজার স্থগিত করা হয়েছে' : '⏸️ User suspended'));
      fetchUsers();
    } catch {
      toast.error(bn ? 'স্ট্যাটাস পরিবর্তন ব্যর্থ' : 'Failed to update status');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!(await confirm({ description: bn ? 'এই ইউজার ডিলিট করতে চান?' : 'Delete this user?', variant: 'destructive' }))) return;
    setDeleting(userId);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'delete', user_id: userId },
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || (bn ? 'ডিলিট ব্যর্থ' : 'Delete failed'));
        setDeleting(null);
        return;
      }
      toast.success(bn ? 'ইউজার ডিলিট হয়েছে' : 'User deleted');
      fetchUsers();
    } catch {
      toast.error(bn ? 'ডিলিট ব্যর্থ' : 'Delete failed');
    }
    setDeleting(null);
  };

  // Role edit
  const openRoleEdit = (user: UserItem) => {
    setRoleEditUser(user);
    setNewRole(user.role);
    setRoleEditOpen(true);
  };

  const handleRoleUpdate = async () => {
    if (!roleEditUser || !newRole) return;
    const customRole = customRoles.find(r => r.name === newRole);
    const baseRole = customRole?.base_role || newRole;

    setRoleUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'update_role', user_id: roleEditUser.id, role: newRole, base_role: baseRole },
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || (bn ? 'রোল আপডেট ব্যর্থ' : 'Role update failed'));
        setRoleUpdating(false);
        return;
      }
      toast.success(bn ? '✅ রোল আপডেট হয়েছে!' : '✅ Role updated!');
      setRoleEditOpen(false);
      fetchUsers();
    } catch {
      toast.error(bn ? 'রোল আপডেট ব্যর্থ' : 'Role update failed');
    }
    setRoleUpdating(false);
  };

  const openProfileDialog = (user: UserItem) => {
    const linked = staffByUser[user.id];
    const unifiedName = getUserDisplayName(user);
    setProfileUser(user);
    setProfileEditName(unifiedName);
    setProfileEditStaffNameBn(linked?.name_bn || unifiedName);
    setProfileEditStaffNameEn(linked?.name_en || linked?.name_bn || unifiedName);
    setProfileEditDesignation(linked?.designation || '');
    setProfileEditStaffCategory(linked?.staff_category || '');
    setProfileEditEmail(user.email);
    setProfileNewPassword('');
    setProfileShowPw(false);
    setProfileOpen(true);
  };

  const saveStaffIdentity = async () => {
    if (!profileUser) return;
    if (!profileEditStaffNameBn.trim()) {
      toast.error(bn ? 'বাংলা নাম দিন' : 'Enter Bangla name');
      return;
    }
    const isAdminRole = ['admin', 'super_admin', 'moderator'].includes(profileUser.role);
    if (!isAdminRole && !profileEditStaffCategory) {
      toast.error(bn ? 'ডিপার্টমেন্ট নির্বাচন করুন' : 'Select department');
      return;
    }

    setProfileSaving('staff');
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'upsert_staff_identity',
          user_id: profileUser.id,
          name_bn: profileEditStaffNameBn.trim(),
          name_en: (profileEditStaffNameEn.trim() || profileEditStaffNameBn.trim()),
          designation: isAdminRole ? null : (profileEditDesignation || null),
          staff_category: isAdminRole ? null : profileEditStaffCategory,
        },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message);

      if (data.staff) {
        const nextLinked: LinkedStaff = {
          id: data.staff.id,
          name_bn: data.staff.name_bn,
          name_en: data.staff.name_en,
          designation: data.staff.designation,
          staff_category: data.staff.staff_category,
          photo_url: data.staff.photo_url,
        };
        setStaffByUser(prev => ({ ...prev, [profileUser.id]: nextLinked }));
      } else {
        // admin role — clear any linked staff entry from local cache
        setStaffByUser(prev => {
          const next = { ...prev };
          delete next[profileUser.id];
          return next;
        });
      }
      setProfileUser({ ...profileUser, full_name: profileEditStaffNameBn.trim() });
      setProfileEditName(profileEditStaffNameBn.trim());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['staff'] }),
        queryClient.invalidateQueries({ queryKey: ['current-staff'] }),
        queryClient.invalidateQueries({ queryKey: ['my-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['sidebar-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
      ]);
      await fetchUsers();
      toast.success(bn ? '✅ নাম সেভ হয়েছে' : '✅ Name saved');
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'সেভ ব্যর্থ' : 'Failed to save'));
    }
    setProfileSaving(null);
  };

  // Add user to administrative_officers table
  const addToAdministrative = async () => {
    if (!profileUser) return;
    if (adminOfficerByUser[profileUser.id]) {
      toast.info(bn ? 'এই ইউজার ইতিমধ্যে প্রশাসনিক কর্মকর্তায় আছে' : 'Already in administrative officers');
      return;
    }
    const nameBn = (profileEditStaffNameBn.trim() || profileEditName.trim() || profileUser.full_name || '').trim();
    if (!nameBn) {
      toast.error(bn ? 'নাম দিন' : 'Enter name first');
      return;
    }
    setLinkSaving('officer');
    try {
      const { data, error } = await supabase
        .from('administrative_officers' as any)
        .insert({
          user_id: profileUser.id,
          name_bn: nameBn,
          name_en: profileEditStaffNameEn.trim() || nameBn,
          designation: profileEditDesignation || null,
          department: profileEditStaffCategory || profileEditDesignation || 'administrative',
          email: profileUser.email,
        })
        .select('id, name_bn, designation')
        .single();
      if (error) throw error;
      const row = data as any;

      // If this user was already in staff, soft-delete from staff so they only appear as administrative officer
      const linkedStaff = staffByUser[profileUser.id];
      if (linkedStaff?.id) {
        const { error: delErr } = await supabase
          .from('staff')
          .update({ deleted_at: new Date().toISOString(), status: 'inactive' })
          .eq('id', linkedStaff.id);
        if (delErr) {
          console.warn('Failed to remove from staff after move:', delErr);
          toast.warning(bn ? 'প্রশাসনিকে যোগ হয়েছে কিন্তু স্টাফ থেকে সরানো যায়নি' : 'Added to administrative but failed to remove from staff');
        } else {
          setStaffByUser(prev => {
            const next = { ...prev };
            delete next[profileUser.id];
            return next;
          });
        }
      }

      setAdminOfficerByUser(prev => ({ ...prev, [profileUser.id]: { id: row.id, name_bn: row.name_bn, designation: row.designation } }));
      toast.success(bn ? '✅ প্রশাসনিক কর্মকর্তায় যোগ হয়েছে' : '✅ Added to administrative officers');
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'যোগ করা ব্যর্থ' : 'Failed to add'));
    }
    setLinkSaving(null);
  };

  const removeFromAdministrative = async (opts?: { moveToStaff?: boolean }) => {
    if (!profileUser) return;
    const linked = adminOfficerByUser[profileUser.id];
    if (!linked) return;
    if (opts?.moveToStaff) {
      if (staffByUser[profileUser.id]) {
        toast.error(bn ? 'এই ইউজার ইতিমধ্যে স্টাফে আছে' : 'Already in staff');
        return;
      }
      if (!profileEditStaffCategory) {
        toast.error(bn ? 'প্রথমে ডিপার্টমেন্ট নির্বাচন করুন' : 'Select department first');
        return;
      }
    }
    setLinkSaving('officer');
    try {
      // Soft-delete from administrative_officers
      const { error } = await supabase
        .from('administrative_officers' as any)
        .update({ deleted_at: new Date().toISOString(), user_id: null })
        .eq('id', linked.id);
      if (error) throw error;
      setAdminOfficerByUser(prev => {
        const next = { ...prev };
        delete next[profileUser.id];
        return next;
      });

      if (opts?.moveToStaff) {
        const nameBn = (profileEditStaffNameBn.trim() || profileEditName.trim() || profileUser.full_name || linked.name_bn || '').trim();
        const { data: sData, error: sErr } = await supabase
          .from('staff')
          .insert({
            user_id: profileUser.id,
            name_bn: nameBn,
            name_en: profileEditStaffNameEn.trim() || nameBn,
            designation: profileEditDesignation || linked.designation || null,
            staff_category: profileEditStaffCategory,
            email: profileUser.email,
          })
          .select('id, name_bn, name_en, designation, staff_category, photo_url')
          .single();
        if (sErr) throw sErr;
        setStaffByUser(prev => ({ ...prev, [profileUser.id]: sData as LinkedStaff }));
        toast.success(bn ? '✅ স্টাফে স্থানান্তর সম্পন্ন' : '✅ Moved to staff');
      } else {
        toast.success(bn ? '✅ প্রশাসনিক কর্মকর্তা থেকে সরানো হয়েছে' : '✅ Removed from administrative officers');
      }
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'সরানো ব্যর্থ' : 'Failed to remove'));
    }
    setLinkSaving(null);
  };

  const addToStaff = async () => {
    if (!profileUser) return;
    if (staffByUser[profileUser.id]) {
      toast.info(bn ? 'এই ইউজার ইতিমধ্যে স্টাফে আছে' : 'Already in staff');
      return;
    }
    if (!profileEditStaffCategory) {
      toast.error(bn ? 'প্রথমে ডিপার্টমেন্ট নির্বাচন করুন' : 'Select department first');
      return;
    }
    const nameBn = (profileEditStaffNameBn.trim() || profileEditName.trim() || profileUser.full_name || '').trim();
    if (!nameBn) {
      toast.error(bn ? 'নাম দিন' : 'Enter name first');
      return;
    }
    setLinkSaving('staff');
    try {
      const { data, error } = await supabase
        .from('staff')
        .insert({
          user_id: profileUser.id,
          name_bn: nameBn,
          name_en: profileEditStaffNameEn.trim() || nameBn,
          designation: profileEditDesignation || null,
          staff_category: profileEditStaffCategory,
          email: profileUser.email,
        })
        .select('id, name_bn, name_en, designation, staff_category, photo_url')
        .single();
      if (error) throw error;
      setStaffByUser(prev => ({ ...prev, [profileUser.id]: data as LinkedStaff }));
      toast.success(bn ? '✅ স্টাফে যোগ হয়েছে' : '✅ Added to staff');
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'যোগ করা ব্যর্থ' : 'Failed to add'));
    }
    setLinkSaving(null);
  };

  const removeFromStaff = async () => {
    if (!profileUser) return;
    const linked = staffByUser[profileUser.id];
    if (!linked) return;
    setLinkSaving('staff');
    try {
      const { error } = await supabase
        .from('staff')
        .update({ deleted_at: new Date().toISOString(), user_id: null })
        .eq('id', linked.id);
      if (error) throw error;
      setStaffByUser(prev => {
        const next = { ...prev };
        delete next[profileUser.id];
        return next;
      });
      toast.success(bn ? '✅ স্টাফ থেকে সরানো হয়েছে' : '✅ Removed from staff');
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'সরানো ব্যর্থ' : 'Failed to remove'));
    }
    setLinkSaving(null);
  };

  // Custom role CRUD
  const openRoleDialog = (role?: CustomRole) => {
    if (role) {
      setEditingRole(role);
      setRoleName(role.name);
      setRoleNameBn(role.name_bn);
      setRoleDesc(role.description || '');
      setRoleDescBn(role.description_bn || '');
      setRoleBaseRole(role.base_role);
    } else {
      setEditingRole(null);
      setRoleName('');
      setRoleNameBn('');
      setRoleDesc('');
      setRoleDescBn('');
      setRoleBaseRole('staff');
    }
    setRoleDialogOpen(true);
  };

  const saveCustomRole = async () => {
    if (!roleName.trim() || !roleNameBn.trim()) {
      toast.error(bn ? 'নাম দিন' : 'Enter name');
      return;
    }
    setRoleSaving(true);
    try {
      if (editingRole?.is_system) {
        // System roles: only update display info
        const { error } = await supabase.from('custom_roles').update({
          name_bn: roleNameBn.trim(),
          description: roleDesc.trim() || null,
          description_bn: roleDescBn.trim() || null,
        }).eq('id', editingRole.id);
        if (error) throw error;
      } else {
        const payload = {
          name: roleName.trim().toLowerCase(),
          name_bn: roleNameBn.trim(),
          description: roleDesc.trim() || null,
          description_bn: roleDescBn.trim() || null,
          base_role: roleBaseRole,
        };

        if (editingRole) {
          const { error } = await supabase.from('custom_roles').update(payload).eq('id', editingRole.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('custom_roles').insert(payload);
          if (error) throw error;
        }
      }

      toast.success(bn ? 'রোল সেভ হয়েছে' : 'Role saved');
      setRoleDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'রোল সেভ ব্যর্থ' : 'Failed to save role'));
    }
    setRoleSaving(false);
  };

  const deleteCustomRole = async (id: string) => {
    if (!(await confirm({ description: bn ? 'এই রোল ডিলিট করতে চান?' : 'Delete this role?', variant: 'destructive' }))) return;
    try {
      const { error } = await supabase.from('custom_roles').delete().eq('id', id);
      if (error) throw error;
      toast.success(bn ? 'রোল মুছে ফেলা হয়েছে' : 'Role deleted');
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
    } catch {
      toast.error(bn ? 'ডিলিট ব্যর্থ' : 'Delete failed');
    }
  };

  const [roleFeatureSettings, setRoleFeatureSettings] = useState<Record<string, boolean>>({});

  // Role permission page open
  const openRolePermDialog = async (role: CustomRole) => {
    setRolePermRole(role);
    setPermPageLoading(true);
    try {
      const [permsRes, featureRes] = await Promise.all([
        supabase.from('role_permissions').select('*').eq('role', role.name),
        supabase.from('website_settings').select('value').eq('key', 'role_feature_permissions').maybeSingle(),
      ]);

      if (permsRes.error) throw permsRes.error;

      const allFeats = (featureRes.data?.value as Record<string, Record<string, boolean>>) || {};
      const roleFeats = allFeats[role.name] || {};

      const merged: PagePermItem[] = allMenuPaths.map(mp => {
        const existing = (permsRes.data || []).find((d: any) => d.menu_path === mp.path);
        return {
          menu_path: mp.path,
          can_view: existing?.can_view ?? false,
          can_add: existing?.can_add ?? false,
          can_edit: existing?.can_edit ?? false,
          can_delete: existing?.can_delete ?? false,
          can_approve: existing?.can_approve ?? false,
          approval_add: roleFeats[`${mp.path}:approval_add`] ?? false,
          approval_edit: roleFeats[`${mp.path}:approval_edit`] ?? false,
          approval_delete: roleFeats[`${mp.path}:approval_delete`] ?? false,
        };
      });

      setActivePermEditor({
        mode: 'role',
        target: role,
        perms: merged,
        hiddenFeatures: roleFeats,
      });
    } catch {
      toast.error(bn ? 'পারমিশন লোড ব্যর্থ' : 'Failed to load permissions');
    } finally {
      setPermPageLoading(false);
    }
  };

  const toggleRolePerm = (menuPath: string, field: string) => {
    setRolePerms(prev => prev.map(p => p.menu_path !== menuPath ? p : { ...p, [field]: !(p as any)[field] }));
  };

  const toggleAllRolePerms = (menuPath: string) => {
    setRolePerms(prev => prev.map(p => {
      if (p.menu_path !== menuPath) return p;
      const allOn = p.can_view && p.can_add && p.can_edit && p.can_delete && p.can_approve;
      return { ...p, can_view: !allOn, can_add: !allOn, can_edit: !allOn, can_delete: !allOn, can_approve: !allOn };
    }));
  };

  const saveRolePermissions = async () => {
    if (!rolePermRole) return;
    setRolePermSaving(true);
    try {
      await supabase.from('role_permissions').delete().eq('role', rolePermRole.name);
      const toInsert = rolePerms
        .filter(p => p.can_view || p.can_add || p.can_edit || p.can_delete || p.can_approve)
        .map(p => ({
          role: rolePermRole.name,
          menu_path: p.menu_path,
          can_view: p.can_view,
          can_add: p.can_add,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
          can_approve: p.can_approve,
        }));
      if (toInsert.length > 0) {
        const { error } = await supabase.from('role_permissions').insert(toInsert);
        if (error) throw error;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['role-permissions'] }),
        queryClient.invalidateQueries({ queryKey: ['user-permissions'] }),
      ]);
      toast.success(bn ? '✅ রোল পারমিশন সেভ হয়েছে!' : '✅ Role permissions saved!');
      setRolePermDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'পারমিশন সেভ ব্যর্থ' : 'Failed to save permissions'));
    }
    setRolePermSaving(false);
  };

  // User permission page open
  const openPermDialog = async (user: UserItem) => {
    setPermUser(user);
    setPermPageLoading(true);
    try {
      const [userPermsRes, rolePermsRes, featureRes] = await Promise.all([
        supabase.from('user_permissions').select('*').eq('user_id', user.id),
        supabase.from('role_permissions').select('*').eq('role', user.role),
        supabase.from('website_settings').select('value').eq('key', 'role_feature_permissions').maybeSingle(),
      ]);
      if (userPermsRes.error) throw userPermsRes.error;
      const userPermsData = userPermsRes.data || [];
      const rolePermsData = rolePermsRes.data || [];
      const hasUserOverrides = userPermsData.length > 0;
      const data = hasUserOverrides ? userPermsData : rolePermsData;

      const allFeats = (featureRes.data?.value as Record<string, Record<string, boolean>>) || {};
      const userFeats = allFeats[`user_${user.id}`] || allFeats[user.role] || {};

      const merged: PagePermItem[] = allMenuPaths.map(mp => {
        const existing: any = (data || []).find((d: any) => d.menu_path === mp.path);
        return {
          menu_path: mp.path,
          can_view: existing?.can_view ?? false,
          can_add: existing?.can_add ?? false,
          can_edit: existing?.can_edit ?? false,
          can_delete: existing?.can_delete ?? false,
          can_approve: existing?.can_approve ?? false,
          approval_add: existing?.approval_add ?? userFeats[`${mp.path}:approval_add`] ?? false,
          approval_edit: existing?.approval_edit ?? userFeats[`${mp.path}:approval_edit`] ?? false,
          approval_delete: existing?.approval_delete ?? userFeats[`${mp.path}:approval_delete`] ?? false,
        };
      });

      setActivePermEditor({
        mode: 'user',
        target: {
          id: user.id,
          name: getUserDisplayName(user),
          email: user.email,
          base_role: user.role,
        },
        perms: merged,
        hiddenFeatures: userFeats,
      });
    } catch {
      toast.error(bn ? 'পারমিশন লোড ব্যর্থ' : 'Failed to load permissions');
    } finally {
      setPermPageLoading(false);
    }
  };


  const togglePerm = (menuPath: string, field: keyof UserPerm) => {
    setUserPerms(prev => prev.map(p => p.menu_path !== menuPath ? p : { ...p, [field]: !(p as any)[field] }));
  };

  const toggleAllForPath = (menuPath: string) => {
    setUserPerms(prev => prev.map(p => {
      if (p.menu_path !== menuPath) return p;
      const allOn = p.can_view && p.can_add && p.can_edit && p.can_delete && p.can_approve;
      return { ...p, can_view: !allOn, can_add: !allOn, can_edit: !allOn, can_delete: !allOn, can_approve: !allOn };
    }));
  };

  const toggleApproval = (menuPath: string, field: 'approval_view' | 'approval_add' | 'approval_edit' | 'approval_delete') => {
    setUserPerms(prev => prev.map(p => p.menu_path !== menuPath ? p : { ...p, [field]: !(p as any)[field] }));
  };

  const savePermissions = async () => {
    if (!permUser) return;
    setPermSaving(true);
    try {
      await supabase.from('user_permissions').delete().eq('user_id', permUser.id);
      let toInsert = userPerms
        .filter(p => p.can_view || p.can_add || p.can_edit || p.can_delete || p.can_approve)
        .map(p => ({
          user_id: permUser.id,
          menu_path: p.menu_path,
          can_view: p.can_view,
          can_add: p.can_add,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
          can_approve: p.can_approve,
          approval_view: p.approval_view,
          approval_add: p.approval_add,
          approval_edit: p.approval_edit,
          approval_delete: p.approval_delete,
        }));

      // If user has attendance sub-permission, bridge /admin/attendance for DB RLS compatibility
      const hasStudentAtt = toInsert.find(p => p.menu_path === '/admin/student-attendance');
      const hasStaffAtt = toInsert.find(p => p.menu_path === '/admin/staff-attendance');
      const hasMainAtt = toInsert.find(p => p.menu_path === '/admin/attendance');
      if ((hasStudentAtt || hasStaffAtt) && !hasMainAtt) {
        toInsert.push({
          user_id: permUser.id,
          menu_path: '/admin/attendance',
          can_view: true,
          can_add: (hasStudentAtt?.can_add || hasStaffAtt?.can_add) ?? false,
          can_edit: (hasStudentAtt?.can_edit || hasStaffAtt?.can_edit) ?? false,
          can_delete: (hasStudentAtt?.can_delete || hasStaffAtt?.can_delete) ?? false,
          can_approve: (hasStudentAtt?.can_approve || hasStaffAtt?.can_approve) ?? false,
          approval_view: false,
          approval_add: false,
          approval_edit: false,
          approval_delete: false,
        });
      }

      // If admin intentionally unchecked all permissions, store a sentinel row so
      // the user has explicit overrides and strictly nothing is shown
      if (toInsert.length === 0) {
        toInsert = [{
          user_id: permUser.id,
          menu_path: '__blocked__',
          can_view: false,
          can_add: false,
          can_edit: false,
          can_delete: false,
          can_approve: false,
          approval_view: false,
          approval_add: false,
          approval_edit: false,
          approval_delete: false,
        }];
      }

      const { error } = await supabase.from('user_permissions').insert(toInsert);
      if (error) throw error;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-permissions'] }),
        queryClient.invalidateQueries({ queryKey: ['role-permissions'] }),
      ]);
      toast.success(bn ? '✅ পারমিশন সেভ হয়েছে!' : '✅ Permissions saved!');
      setPermDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'পারমিশন সেভ ব্যর্থ' : 'Failed to save permissions'));
    }
    setPermSaving(false);
  };

  const resetToRoleDefaults = async () => {
    if (!permUser) return;
    setPermSaving(true);
    try {
      await supabase.from('user_permissions').delete().eq('user_id', permUser.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-permissions'] }),
        queryClient.invalidateQueries({ queryKey: ['role-permissions'] }),
      ]);
      const { data: rolePerms } = await supabase.from('role_permissions').select('*').eq('role', permUser.role);
      const merged = allMenuPaths.map(mp => {
        const existing = (rolePerms || []).find((d: any) => d.menu_path === mp.path);
        return {
          menu_path: mp.path,
          can_view: existing?.can_view ?? false,
          can_add: existing?.can_add ?? false,
          can_edit: existing?.can_edit ?? false,
          can_delete: existing?.can_delete ?? false,
          can_approve: existing?.can_approve ?? false,
          approval_view: false,
          approval_add: false,
          approval_edit: false,
          approval_delete: false,
        };
      });
      setUserPerms(merged);
      toast.success(bn ? '✅ ইউজারের রোল অনুযায়ী পারমিশন রিসেট হয়েছে' : '✅ Reset to role default permissions');
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'রিসেট ব্যর্থ' : 'Failed to reset'));
    }
    setPermSaving(false);
  };

  const roleBadge = (r: string) => {
    const roleInfo = customRoles.find(cr => cr.name === r || cr.base_role === r);
    const colors: Record<string, string> = {
      admin: 'bg-destructive/10 text-destructive border-destructive/30',
      super_admin: 'bg-destructive/10 text-destructive border-destructive/30',
      teacher: 'bg-primary/10 text-primary border-primary/30',
      staff: 'bg-accent/50 text-accent-foreground border-accent',
      administrative: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
      support: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700',
      general: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-600',
    };
    const displayName = roleInfo ? (bn ? roleInfo.name_bn : roleInfo.name) : r;
    return <Badge variant="outline" className={colors[r] || 'bg-secondary/50 text-secondary-foreground border-secondary'}>{displayName}</Badge>;
  };

  if (activePermEditor) {
    return (
      <AdminLayout>
        {permPageLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <PermissionPageEditor
            mode={activePermEditor.mode}
            target={activePermEditor.target}
            allMenuPaths={allMenuPaths}
            initialPerms={activePermEditor.perms}
            initialHiddenFeatures={activePermEditor.hiddenFeatures}
            onBack={() => setActivePermEditor(null)}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
              queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
              queryClient.invalidateQueries({ queryKey: ['role_feature_permissions'] });
              fetchUsers();
            }}
          />
        )}
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>

      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            {bn ? 'ইউজার ব্যবস্থাপনা' : 'User Management'}
          </h1>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="w-4 h-4" />
              {bn ? 'ইউজার তালিকা' : 'Users'}
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-1.5">
              <Tag className="w-4 h-4" />
              {bn ? 'রোল ব্যবস্থাপনা' : 'Roles'}
            </TabsTrigger>
            <TabsTrigger value="access" className="gap-1.5">
              <Shield className="w-4 h-4" />
              {bn ? 'অ্যাক্সেস কন্ট্রোল' : 'Access Control'}
            </TabsTrigger>
          </TabsList>

          {/* ===== USERS TAB ===== */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-end">
              {canAddItem && <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
                <DialogTrigger asChild>
                  <Button className="btn-primary-gradient gap-2">
                    <Plus className="w-4 h-4" /> {bn ? 'নতুন ইউজার' : 'New User'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-primary" />
                      {createStep === 1 && (bn ? 'নতুন ইউজার তৈরি করুন' : 'Create New User')}
                      {createStep === 2 && (bn ? 'ভেরিফিকেশন পদ্ধতি নির্বাচন' : 'Choose Verification Method')}
                      {createStep === 3 && createMethod === 'otp' && (bn ? 'OTP কোড যাচাই' : 'Verify OTP Code')}
                      {createStep === 3 && createMethod === 'link' && (bn ? 'ইমেইল ভেরিফিকেশন' : 'Email Verification')}
                      {createStep === 4 && (bn ? 'ইউজার তৈরি সম্পন্ন' : 'User Creation Completed')}
                    </DialogTitle>
                  </DialogHeader>

                  {/* Wizard Stepper Progress Bar */}
                  <div className="flex items-center justify-between border-b pb-3 pt-1 text-xs">
                    <div className={`flex items-center gap-1.5 font-medium ${createStep === 1 ? 'text-primary font-bold' : createStep > 1 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${createStep === 1 ? 'bg-primary text-primary-foreground' : createStep > 1 ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {createStep > 1 ? '✓' : '১'}
                      </span>
                      <span>{bn ? 'তথ্য' : 'Info'}</span>
                    </div>
                    <div className="w-6 h-[1px] bg-border" />
                    <div className={`flex items-center gap-1.5 font-medium ${createStep === 2 ? 'text-primary font-bold' : createStep > 2 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${createStep === 2 ? 'bg-primary text-primary-foreground' : createStep > 2 ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {createStep > 2 ? '✓' : '২'}
                      </span>
                      <span>{bn ? 'পদ্ধতি' : 'Method'}</span>
                    </div>
                    <div className="w-6 h-[1px] bg-border" />
                    <div className={`flex items-center gap-1.5 font-medium ${createStep === 3 ? 'text-primary font-bold' : createStep > 3 ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${createStep === 3 ? 'bg-primary text-primary-foreground' : createStep > 3 ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {createStep > 3 ? '✓' : '৩'}
                      </span>
                      <span>{createMethod === 'otp' ? 'OTP' : (bn ? 'পেন্ডিং' : 'Pending')}</span>
                    </div>
                    <div className="w-6 h-[1px] bg-border" />
                    <div className={`flex items-center gap-1.5 font-medium ${createStep === 4 ? 'text-green-600 font-bold' : 'text-muted-foreground'}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${createStep === 4 ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {createStep === 4 ? '✓' : '৪'}
                      </span>
                      <span>{bn ? 'সম্পন্ন' : 'Done'}</span>
                    </div>
                  </div>

                  {/* STEP 1: User Information Form */}
                  {createStep === 1 && (
                    <div className="space-y-4 pt-2">
                      <p className="text-xs text-muted-foreground px-2 py-1.5 bg-muted/30 rounded border-l-2 border-primary/30 italic">
                        {bn ? 'নতুন অ্যাকাউন্ট তৈরি করতে তথ্য দিন। ফর্ম পূরণ করে পরবর্তী ধাপে ভেরিফিকেশন মাধ্যম বেছে নিন।' : 'Enter user details. Fill the form to proceed to verification method selection in the next step.'}
                      </p>
                      <div>
                        <Label>{bn ? 'নাম' : 'Full Name'} *</Label>
                        <Input
                          className="mt-1"
                          name="fullName"
                          langType="auto"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          placeholder={bn ? 'ইউজারের নাম' : 'User name'}
                        />
                      </div>
                      <div>
                        <Label>{bn ? 'ইমেইল' : 'Email'} *</Label>
                        <Input className="mt-1" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={bn ? 'ইমেইল অ্যাড্রেস' : 'Email address'} />
                      </div>
                      <div>
                        <Label>{bn ? 'মোবাইল নম্বর' : 'Mobile Number'}</Label>
                        <Input
                          className="mt-1"
                          type="tel"
                          value={createPhone}
                          onChange={e => setCreatePhone(e.target.value.replace(/[^\d+]/g, ''))}
                          placeholder={bn ? '01XXXXXXXXX' : '01XXXXXXXXX'}
                          maxLength={15}
                        />
                      </div>
                      <div>
                        <Label>{bn ? 'শক্তিশালী পাসওয়ার্ড' : 'Strong Password'} *</Label>
                        <div className="relative mt-1">
                          <Input className="pr-10" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(sanitizePasswordInput(e.target.value))} placeholder={bn ? 'ইংরেজি অক্ষর, সংখ্যা ও চিহ্নের মিশ্রণ' : 'Mix of English letters, numbers & symbols'} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {bn ? 'দ্রষ্টব্য: পাসওয়ার্ডে শুধুমাত্র ইংরেজি অক্ষর গ্রহণযোগ্য এবং ইমেইল ভেরিফিকেশন প্রয়োজন হবে।' : 'Note: Only English characters are allowed and email verification will be required.'}
                        </p>
                        <PasswordStrengthMeter password={password} bn={bn} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label>{bn ? 'ডিপার্টমেন্ট' : 'Department'}</Label>
                          <Select value={createStaffCategory} onValueChange={(value) => { setCreateStaffCategory(value); setCreateDesignation(''); }}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder={bn ? 'ডিপার্টমেন্ট' : 'Department'} />
                            </SelectTrigger>
                            <SelectContent>
                              {staffCategories.map((cat) => (
                                <SelectItem key={cat.key} value={cat.key}>{bn ? cat.name_bn : cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>{bn ? 'পদবি' : 'Designation'}</Label>
                          <Select value={createDesignation} onValueChange={setCreateDesignation} disabled={!createStaffCategory}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder={bn ? 'পদবি' : 'Designation'} />
                            </SelectTrigger>
                            <SelectContent>
                              {masterDesignations
                                .filter((d) => !createStaffCategory || d.staff_category === createStaffCategory)
                                .map((d) => (
                                  <SelectItem key={d.id} value={(bn ? d.name_bn : d.name) || d.name || d.name_bn || ''}>{(bn ? d.name_bn : d.name) || d.name || d.name_bn}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>{bn ? 'রোল' : 'Role'} <span className="text-xs text-muted-foreground">({bn ? 'ঐচ্ছিক' : 'Optional'})</span></Label>
                        <Select value={role} onValueChange={setRole}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={bn ? 'রোল সিলেক্ট করুন (ঐচ্ছিক)' : 'Select role (optional)'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              {bn ? '🚫 রোল ছাড়া (শুধু পারমিশন)' : '🚫 No role (permission only)'}
                            </SelectItem>
                            {customRoles.filter(r => r.is_active).map(r => (
                              <SelectItem key={r.name} value={r.name}>
                                {bn ? r.name_bn : r.name} {r.is_system ? '' : `(${r.base_role})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(role === '' || role === 'none') && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {bn ? '⚠️ রোল ছাড়া ইউজার শুধু ব্যক্তিগত পারমিশন দিয়ে অ্যাক্সেস পাবে' : '⚠️ User without role will only access via individual permissions'}
                          </p>
                        )}
                      </div>
                      <Button onClick={handleStep1Next} className="w-full btn-primary-gradient gap-2">
                        <span>{bn ? 'পরবর্তী ধাপ' : 'Next Step'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* STEP 2: Choose Verification Method */}
                  {createStep === 2 && (
                    <div className="space-y-4 pt-2">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {bn ? 'কোন পদ্ধতিতে ইমেইল ভেরিফাই করবেন?' : 'Choose verification method'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {bn ? 'ব্যবহারকারীর ইমেইল নিশ্চিত করার জন্য আপনার পছন্দের পদ্ধতি নির্বাচন করুন:' : 'Select preferred method to confirm the user email:'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {/* Option 1: OTP */}
                        <div
                          onClick={() => setCreateMethod('otp')}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            createMethod === 'otp'
                              ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                              : 'border-border/60 hover:border-primary/40 bg-card'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className={`p-2.5 rounded-lg shrink-0 ${createMethod === 'otp' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <KeyRound className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-sm text-foreground">
                                    {bn ? '১. OTP কোড দিয়ে ভেরিফাই' : '1. Verify via OTP Code'}
                                  </h4>
                                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                                    {bn ? 'প্রস্তাবিত' : 'Recommended'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                  {bn
                                    ? 'ব্যবহারকারীর ইমেইলে ৬-সংখ্যার একটি OTP যাবে। এডমিন প্যানেলে কোডটি বসিয়ে তাত্ক্ষণিকভাবে অ্যাকাউন্ট সক্রিয় করা যাবে।'
                                    : 'A 6-digit OTP code is sent to user email. Admin can input the code to activate the account immediately.'}
                                </p>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 ${createMethod === 'otp' ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                              {createMethod === 'otp' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                        </div>

                        {/* Option 2: Link */}
                        <div
                          onClick={() => setCreateMethod('link')}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            createMethod === 'link'
                              ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                              : 'border-border/60 hover:border-primary/40 bg-card'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className={`p-2.5 rounded-lg shrink-0 ${createMethod === 'link' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Mail className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-sm text-foreground">
                                    {bn ? '২. ইমেইল ভেরিফিকেশন লিংক' : '2. Verify via Email Link'}
                                  </h4>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                  {bn
                                    ? 'ব্যবহারকারীর ইমেইলে একটি ভেরিফিকেশন লিংক যাবে। লিংকে ক্লিক করার আগ পর্যন্ত স্ট্যাটাস "পেন্ডিং" থাকবে এবং ক্লিক করলেই স্বয়ংক্রিয়ভাবে সক্রিয় হবে।'
                                    : 'A verification link is sent to user email. Status stays "Pending" until clicked, then automatically activates.'}
                                </p>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 ${createMethod === 'link' ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                              {createMethod === 'link' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recipient summary */}
                      <div className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border flex items-center justify-between">
                        <span>{bn ? 'প্রাপক ইমেইল:' : 'Recipient:'} <strong className="text-foreground">{email}</strong></span>
                        <span>{fullName}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCreateStep(1)}
                          disabled={creating}
                          className="w-1/3 gap-1"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          {bn ? 'পেছনে যান' : 'Back'}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleExecuteCreation(createMethod)}
                          disabled={creating}
                          className="w-2/3 btn-primary-gradient gap-2"
                        >
                          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                          <span>{bn ? 'এগিয়ে যান' : 'Proceed'}</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3-A: OTP Verification Screen */}
                  {createStep === 3 && createMethod === 'otp' && (
                    <div className="space-y-5 pt-2 text-center">
                      <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <KeyRound className="w-6 h-6" />
                      </div>

                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {bn ? 'OTP কোড যাচাই করুন' : 'Verify OTP Code'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {bn
                            ? <><strong>{createdUserEmail}</strong> ঠিকানায় ৬-সংখ্যার OTP কোড পাঠানো হয়েছে। কোডটি নিচে লিখুন:</>
                            : <>A 6-digit OTP code has been sent to <strong>{createdUserEmail}</strong>. Enter it below:</>}
                        </p>
                      </div>

                      <div className="flex justify-center py-2">
                        <InputOTP
                          maxLength={6}
                          value={createOtpCode}
                          onChange={setCreateOtpCode}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          onClick={handleVerifyCreateOtp}
                          disabled={createOtpVerifying || createOtpCode.trim().length < 6}
                          className="w-full btn-primary-gradient gap-2"
                        >
                          {createOtpVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                          <span>{bn ? 'কোড যাচাই করুন' : 'Verify Code'}</span>
                        </Button>

                        <div className="flex items-center justify-center gap-2 pt-1 text-xs">
                          {createOtpCooldown > 0 ? (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {bn ? `পুনরায় কোড পাঠাতে অপেক্ষা করুন: ${createOtpCooldown} সেকেন্ড` : `Resend code in: ${createOtpCooldown}s`}
                            </span>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleResendCreateOtp}
                              disabled={createOtpSending}
                              className="text-xs text-primary hover:underline h-auto p-1"
                            >
                              {createOtpSending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                              {bn ? 'কোড পাননি? আবার পাঠান' : 'Didn\'t get code? Resend'}
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="border-t pt-3 flex justify-between items-center text-xs text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => { setDialogOpen(false); resetCreateWizard(); }}
                          className="hover:text-foreground underline"
                        >
                          {bn ? 'পরে ভেরিফাই হবে / বন্ধ করুন' : 'Verify later / Close'}
                        </button>
                        <button
                          type="button"
                          onClick={handleManualApproveBypass}
                          className="text-primary hover:underline font-medium"
                        >
                          {bn ? '⚡ সরাসরি অনুমোদন' : '⚡ Direct Approve'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3-B: Link Pending Screen (with real-time polling) */}
                  {createStep === 3 && createMethod === 'link' && (
                    <div className="space-y-5 pt-2 text-center">
                      <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                        <Clock className="w-6 h-6 animate-pulse" />
                      </div>

                      <div>
                        <div className="inline-flex items-center gap-2 py-1 px-3 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-semibold text-xs mb-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          <span>{bn ? 'ইমেইল ভেরিফিকেশন অপেক্ষমাণ (Pending)' : 'Email Verification Pending'}</span>
                        </div>
                        <h3 className="text-base font-semibold text-foreground">
                          {bn ? 'ব্যবহারকারীর ক্লিক করার অপেক্ষায়' : 'Waiting for user to click link'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
                          {bn
                            ? <><strong>{createdUserEmail}</strong> ঠিকানায় ভেরিফিকেশন লিংক পাঠানো হয়েছে। ব্যবহারকারী লিংকে ক্লিক করলেই এই পেজটি স্বয়ংক্রিয়ভাবে সফল দেখাবে।</>
                            : <>A verification link has been sent to <strong>{createdUserEmail}</strong>. As soon as user clicks it, this page will automatically update to success.</>}
                        </p>
                      </div>

                      <div className="p-3 bg-muted/40 rounded-lg border text-left text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{bn ? 'নাম:' : 'Name:'}</span>
                          <span className="font-medium text-foreground">{createdUserName || fullName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{bn ? 'ইমেইল:' : 'Email:'}</span>
                          <span className="font-medium text-foreground">{createdUserEmail || email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{bn ? 'স্ট্যাটাস:' : 'Status:'}</span>
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                            {bn ? 'অপেক্ষমাণ (Pending)' : 'Pending'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="default"
                          onClick={handleManualCheckLink}
                          disabled={linkChecking}
                          className="w-full btn-primary-gradient gap-2"
                        >
                          {linkChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          <span>{bn ? 'স্ট্যাটাস পুনরায় যাচাই করুন' : 'Check Status Now'}</span>
                        </Button>

                        <div className="flex items-center justify-center gap-2 pt-1 text-xs">
                          {linkCooldown > 0 ? (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {bn ? `পুনরায় লিংক পাঠাতে অপেক্ষা করুন: ${linkCooldown} সেকেন্ড` : `Resend link in: ${linkCooldown}s`}
                            </span>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleResendLinkInWizard}
                              className="text-xs text-primary hover:underline h-auto p-1"
                            >
                              <SendHorizonal className="w-3 h-3 mr-1" />
                              {bn ? 'লিংক পাননি? আবার পাঠান' : 'Didn\'t receive link? Resend'}
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="border-t pt-3 flex justify-between items-center text-xs text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => { setDialogOpen(false); resetCreateWizard(); }}
                          className="hover:text-foreground underline"
                        >
                          {bn ? 'পরে ভেরিফাই হবে / বন্ধ করুন' : 'Verify later / Close'}
                        </button>
                        <button
                          type="button"
                          onClick={handleManualApproveBypass}
                          className="text-primary hover:underline font-medium"
                        >
                          {bn ? '⚡ সরাসরি অনুমোদন' : '⚡ Direct Approve'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Success Screen */}
                  {createStep === 4 && (
                    <div className="space-y-5 pt-3 text-center">
                      <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-foreground">
                          {bn ? '🎉 ভেরিফিকেশন সফল হয়েছে!' : '🎉 Verification Successful!'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                          {bn
                            ? 'ইউজার অ্যাকাউন্ট সফলভাবে সক্রিয় করা হয়েছে এবং ইউজার এখন লগইন করতে পারবেন।'
                            : 'User account has been successfully verified and activated. The user can now log in.'}
                        </p>
                      </div>

                      <div className="p-3.5 bg-green-500/5 rounded-xl border border-green-500/20 text-left text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{bn ? 'নাম:' : 'Name:'}</span>
                          <span className="font-semibold text-foreground">{createdUserName || fullName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{bn ? 'ইমেইল:' : 'Email:'}</span>
                          <span className="font-semibold text-foreground">{createdUserEmail || email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{bn ? 'স্ট্যাটাস:' : 'Status:'}</span>
                          <Badge className="bg-green-600 text-white text-[10px]">
                            {bn ? '✅ সক্রিয় ও অনুমোদিত' : '✅ Active & Approved'}
                          </Badge>
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={() => { setDialogOpen(false); resetCreateWizard(); }}
                        className="w-full btn-primary-gradient gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{bn ? 'সম্পন্ন / বন্ধ করুন' : 'Done / Close'}</span>
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>}
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                {bn
                  ? 'এখানে তৈরি করা ইউজাররা সরাসরি লগইন করতে পারবে। 🔑 বাটনে পারমিশন, ✏️ বাটনে রোল পরিবর্তন করুন।'
                  : 'Users can log in immediately. Use 🔑 for permissions, ✏️ to change role.'}
              </p>
            </div>

            <div className="card-elevated overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {bn ? 'কোনো ইউজার পাওয়া যায়নি' : 'No users found'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{bn ? 'নাম' : 'Name'}</TableHead>
                      <TableHead>{bn ? 'ইমেইল' : 'Email'}</TableHead>
                      <TableHead>{bn ? 'পদবি / ডিপার্টমেন্ট' : 'Designation / Department'}</TableHead>
                      <TableHead>{bn ? 'রোল' : 'Role'}</TableHead>
                      <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                      <TableHead>{bn ? 'তৈরির তারিখ' : 'Created'}</TableHead>
                      <TableHead className="w-32 text-center">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => {
                      const linked = staffByUser[u.id];
                      const officer = adminOfficerByUser[u.id];
                      const displayName = getUserDisplayName(u);
                      const matchedAuthority = authorities.find(a =>
                        (linked?.id && a.person_id === linked.id) ||
                        (officer?.id && a.person_id === officer.id) ||
                        (u.full_name && a.person_name_bn && u.full_name.trim().toLowerCase() === a.person_name_bn.trim().toLowerCase())
                      );
                      return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{displayName}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          {linked ? (
                            <div className="flex flex-col gap-1">
                              {matchedAuthority && (
                                <Badge variant="outline" className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-400/50 text-[10px] w-fit font-medium gap-1 py-0.5">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  {matchedAuthority.role_name_bn || CORE_SIGNATORY_ROLES.find(r => r.key === matchedAuthority.role_key)?.label_bn || matchedAuthority.role_key}
                                </Badge>
                              )}
                              {linked.designation && (
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/30 w-fit">
                                  {linked.designation}
                                </Badge>
                              )}
                              {linked.staff_category && (
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  {getCategoryLabel(linked.staff_category)}
                                </span>
                              )}
                            </div>
                          ) : officer ? (
                            <div className="flex flex-col gap-1">
                              {matchedAuthority && (
                                <Badge variant="outline" className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-400/50 text-[10px] w-fit font-medium gap-1 py-0.5">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  {matchedAuthority.role_name_bn || CORE_SIGNATORY_ROLES.find(r => r.key === matchedAuthority.role_key)?.label_bn || matchedAuthority.role_key}
                                </Badge>
                              )}
                              {officer.designation && (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-400/40 w-fit">
                                  {officer.designation}
                                </Badge>
                              )}
                              <span className="text-[10px] uppercase tracking-wider text-amber-600">
                                {bn ? 'প্রশাসনিক কর্মকর্তা' : 'Administrative Officer'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {matchedAuthority && (
                                <Badge variant="outline" className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-400/50 text-[10px] w-fit font-medium gap-1 py-0.5">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  {matchedAuthority.role_name_bn || CORE_SIGNATORY_ROLES.find(r => r.key === matchedAuthority.role_key)?.label_bn || matchedAuthority.role_key}
                                </Badge>
                              )}
                              <span className="text-muted-foreground text-xs">—</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{roleBadge(u.role)}</TableCell>
                        <TableCell>
                          {u.status === 'approved' ? (
                            <Badge variant="default" className="bg-green-600">{bn ? 'অনুমোদিত' : 'Approved'}</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">{bn ? 'অপেক্ষমাণ' : 'Pending'}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(u.created_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            {/* Profile view */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => openProfileDialog(u)}
                              title={bn ? 'প্রোফাইল দেখুন' : 'View Profile'}
                            >
                              <UserCircle className="w-4 h-4" />
                            </Button>
                            {/* Resend Verification Email */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                              onClick={async () => {
                                try {
                                  const { error } = await supabase.auth.resend({ type: 'signup', email: u.email });
                                  if (error) {
                                    toast.error(error.message || (bn ? 'ইমেইল পাঠাতে ব্যর্থ' : 'Failed to send email'));
                                  } else {
                                    toast.success(
                                      bn
                                        ? `${u.email} এ ভেরিফিকেশন লিংক পাঠানো হয়েছে!`
                                        : `Verification link sent to ${u.email}!`
                                    );
                                  }
                                } catch {
                                  toast.error(bn ? 'ইমেইল পাঠাতে ব্যর্থ' : 'Failed to send email');
                                }
                              }}
                              title={bn ? 'ভেরিফিকেশন ইমেইল পাঠান' : 'Send Verification Email'}
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                            {/* Approve/Reject status */}
                            {u.role !== 'admin' && u.status !== 'approved' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleStatusChange(u.id, 'approved')}
                                title={bn ? 'অনুমোদন করুন' : 'Approve'}
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </Button>
                            )}
                            {u.role !== 'admin' && u.status === 'approved' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                onClick={() => handleStatusChange(u.id, 'pending')}
                                title={bn ? 'স্থগিত করুন' : 'Suspend'}
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </Button>
                            )}
                            {/* Edit Identity (or Add to Staff if not linked) */}
                            {staffByUser[u.id] ? (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => openProfileDialog(u)}
                                title={bn ? 'পরিচয় ও পদবি এডিট করুন' : 'Edit Identity & Designation'}
                              >
                                <UserCircle className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => navigate(`/admin/staff/add?email=${encodeURIComponent(u.email)}&full_name=${encodeURIComponent(displayName || '')}`)}
                                title={bn ? 'স্টাফে যোগ করুন' : 'Add to Staff'}
                              >
                                <UserPlus className="w-4 h-4" />
                              </Button>
                            )}
                            {/* Quick: Add to Committee */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              onClick={() => navigate(`/admin/committees?prefill_email=${encodeURIComponent(u.email)}&prefill_name=${encodeURIComponent(displayName || '')}`)}
                              title={bn ? 'কমিটিতে যোগ করুন' : 'Add to Committee'}
                            >
                              <Users2 className="w-4 h-4" />
                            </Button>
                            {/* Role edit */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => openRoleEdit(u)}
                              title={bn ? 'রোল পরিবর্তন' : 'Change Role'}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {/* Permissions */}
                            {u.role !== 'admin' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => openPermDialog(u)}
                                title={bn ? 'পারমিশন সেট করুন' : 'Set Permissions'}
                              >
                                <KeyRound className="w-4 h-4" />
                              </Button>
                            )}
                            {/* Delete */}
                            {canDeleteItem && <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(u.id)}
                              disabled={deleting === u.id}
                            >
                              {deleting === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          {/* ===== ROLES TAB ===== */}
          <TabsContent value="roles" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {bn ? 'নতুন রোল তৈরি করুন এবং বেস রোল (admin/teacher/staff) নির্ধারণ করুন।' : 'Create custom roles with a base role (admin/teacher/staff).'}
              </p>
              <Button className="btn-primary-gradient gap-2" onClick={() => openRoleDialog()}>
                <Plus className="w-4 h-4" /> {bn ? 'নতুন রোল' : 'New Role'}
              </Button>
            </div>

            {/* Roles Grid Cards View */}
            {rolesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : customRoles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                {bn ? 'কোনো রোল পাওয়া যায়নি' : 'No roles found'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customRoles.map((r) => {
                  const roleUsersCount = users.filter((u) => u.role === r.name).length;
                  return (
                    <div
                      key={r.id}
                      className="group relative bg-card hover:bg-card/90 rounded-2xl border border-border/80 hover:border-primary/40 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Top bar of card */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-base text-foreground leading-tight">
                                {bn ? r.name_bn || r.name : r.name}
                              </h3>
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">{r.name}</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {r.is_system ? (
                              <Badge variant="secondary" className="text-[10px] h-4">
                                {bn ? 'সিস্টেম' : 'System'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] h-4">
                                {bn ? 'কাস্টম' : 'Custom'}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] h-4 bg-primary/5 text-primary border-primary/20">
                              Base: {r.base_role}
                            </Badge>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px] mb-4">
                          {(bn ? r.description_bn : r.description) || (bn ? 'কোনো বিবরণ যোগ করা হয়নি।' : 'No description provided.')}
                        </p>

                        {/* Quick Stats */}
                        <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-muted/40 mb-4 border border-border/40">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            {bn ? 'ইউজার সংখ্যা:' : 'Total Users:'}
                          </span>
                          <span className="font-bold text-foreground font-mono">
                            {roleUsersCount} {bn ? 'জন' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          onClick={() => openRolePermDialog(r)}
                          className="flex-1 btn-primary-gradient h-8 text-xs gap-1.5 shadow-sm"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>{bn ? 'পারমিশন কার্ড ওপেন' : 'Open Permissions'}</span>
                        </Button>

                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            onClick={() => openRoleDialog(r)}
                            title={bn ? 'রোল সম্পাদনা' : 'Edit Role'}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {!r.is_system && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                              onClick={() => deleteCustomRole(r.id)}
                              title={bn ? 'মুছুন' : 'Delete Role'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ===== ACCESS CONTROL TAB ===== */}
          <TabsContent value="access" className="space-y-4">
            <AccessControlTab />
          </TabsContent>
        </Tabs>

        {/* Role Edit Dialog */}
        <Dialog open={roleEditOpen} onOpenChange={setRoleEditOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-primary" />
                {bn ? 'রোল পরিবর্তন' : 'Change Role'}
              </DialogTitle>
            </DialogHeader>
            {roleEditUser && (
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  {getUserDisplayName(roleEditUser)}
                </p>
                <div>
                  <Label>{bn ? 'নতুন রোল' : 'New Role'}</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {customRoles.filter(r => r.is_active).map(r => (
                        <SelectItem key={r.name} value={r.name}>
                          {bn ? r.name_bn : r.name} {r.is_system ? '' : `(${r.base_role})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleRoleUpdate} disabled={roleUpdating} className="w-full btn-primary-gradient">
                  {roleUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {bn ? 'রোল আপডেট করুন' : 'Update Role'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Custom Role Create/Edit Dialog */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                {editingRole ? (bn ? 'রোল সম্পাদনা' : 'Edit Role') : (bn ? 'নতুন রোল তৈরি' : 'Create New Role')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'নাম (ইংরেজি)' : 'Name (English)'} *</Label>
                  <Input className="mt-1" value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="e.g. accountant" disabled={editingRole?.is_system} />
                </div>
                <div>
                  <Label>{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} *</Label>
                  <Input className="mt-1" value={roleNameBn} onChange={e => setRoleNameBn(e.target.value)} placeholder="যেমন: হিসাবরক্ষক" />
                </div>
              </div>
              {!editingRole?.is_system && (
                <div>
                  <Label>{bn ? 'বেস রোল' : 'Base Role'} *</Label>
                  <Select value={roleBaseRole} onValueChange={setRoleBaseRole}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">{bn ? 'স্টাফ' : 'Staff'}</SelectItem>
                      <SelectItem value="teacher">{bn ? 'শিক্ষক' : 'Teacher'}</SelectItem>
                      <SelectItem value="administrative">{bn ? 'প্রশাসনিক' : 'Administrative'}</SelectItem>
                      <SelectItem value="support">{bn ? 'সাপোর্ট' : 'Support'}</SelectItem>
                      <SelectItem value="general">{bn ? 'সহায়ক' : 'General'}</SelectItem>
                      <SelectItem value="admin">{bn ? 'অ্যাডমিন' : 'Admin'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bn ? 'বেস রোল নির্ধারণ করে ইউজার সিস্টেমে কোন লেভেলের অ্যাক্সেস পাবে।' : 'Base role determines the system-level access.'}
                  </p>
                </div>
              )}
              {editingRole?.is_system && (
                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  {bn ? '⚠️ সিস্টেম রোলের নাম ও বেস রোল পরিবর্তন করা যায় না। শুধু বাংলা নাম ও বিবরণ পরিবর্তন করতে পারবেন।' : '⚠️ System role name & base role cannot be changed. You can edit the Bangla name and description.'}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'বিবরণ (ইংরেজি)' : 'Description (EN)'}</Label>
                  <Input className="mt-1" value={roleDesc} onChange={e => setRoleDesc(e.target.value)} />
                </div>
                <div>
                  <Label>{bn ? 'বিবরণ (বাংলা)' : 'Description (BN)'}</Label>
                  <Input className="mt-1" value={roleDescBn} onChange={e => setRoleDescBn(e.target.value)} />
                </div>
              </div>
              <Button onClick={saveCustomRole} disabled={roleSaving} className="w-full btn-primary-gradient">
                {roleSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {bn ? 'সেভ করুন' : 'Save'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ===== PROFILE VIEW & EDIT DIALOG ===== */}
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>

          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-primary" />
                {bn ? 'ইউজার প্রোফাইল' : 'User Profile'}
              </DialogTitle>
            </DialogHeader>
            {profileUser && (
              <div className="space-y-5 pt-2">
                {(() => {
                  const linked = staffByUser[profileUser.id];
                  const displayName = getUserDisplayName(profileUser);
                  const displayPhoto = linked?.photo_url;
                  const displayDesignation = linked?.designation;
                  const displayCategory = linked?.staff_category;
                  return (
                    <>
                {/* User Info Card */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {displayPhoto ? <img src={displayPhoto} alt="" className="w-full h-full object-cover" /> : <UserCircle className="w-8 h-8 text-primary" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-lg truncate">{displayName}</p>
                    <p className="text-sm text-muted-foreground">{profileUser.email}</p>
                    {(displayDesignation || displayCategory) && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {[displayDesignation, getCategoryLabel(displayCategory)].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
                    </>
                  );
                })()}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground mb-1">{bn ? 'রোল' : 'Role'}</p>
                    <div>{roleBadge(profileUser.role)}</div>
                  </div>
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-xs text-muted-foreground mb-1">{bn ? 'স্ট্যাটাস' : 'Status'}</p>
                    {profileUser.status === 'approved' ? (
                      <Badge variant="default" className="bg-green-600">{bn ? 'অনুমোদিত' : 'Approved'}</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">{bn ? 'অপেক্ষমাণ' : 'Pending'}</Badge>
                    )}
                  </div>
                  <div className="p-3 rounded-lg border bg-card col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">{bn ? 'তৈরির তারিখ' : 'Created At'}</p>
                    <p className="text-sm font-medium">
                      {new Date(profileUser.created_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* User Name Edit Section */}
                <div className="rounded-xl border-2 border-primary/20 bg-card p-4 space-y-3">
                  <h3 className="flex items-center gap-2 font-semibold text-base text-primary">
                    <Tag className="w-5 h-5" />
                    {bn ? 'নাম পরিবর্তন' : 'Change Name'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{bn ? 'বাংলা নাম' : 'Bangla Name'}</Label>
                      <Input value={profileEditStaffNameBn} onChange={e => setProfileEditStaffNameBn(e.target.value)} placeholder={bn ? 'বাংলা নাম লিখুন' : 'Enter Bangla name'} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{bn ? 'ইংরেজি নাম' : 'English Name'}</Label>
                      <Input value={profileEditStaffNameEn} onChange={e => setProfileEditStaffNameEn(e.target.value)} placeholder={bn ? 'ইংরেজি নাম লিখুন' : 'Enter English name'} />
                    </div>
                  </div>
                  {/* Staff-specific fields (designation, department) only for staff roles */}
                  {!['parent', 'student', 'admin', 'super_admin', 'moderator'].includes(profileUser.role) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{bn ? 'ডিপার্টমেন্ট' : 'Department'}</Label>
                        <Select value={profileEditStaffCategory} onValueChange={(value) => { setProfileEditStaffCategory(value); setProfileEditDesignation(''); }}>
                          <SelectTrigger>
                            <SelectValue placeholder={bn ? 'ডিপার্টমেন্ট নির্বাচন' : 'Select department'} />
                          </SelectTrigger>
                          <SelectContent>
                            {staffCategories.map((cat) => (
                              <SelectItem key={cat.key} value={cat.key}>{bn ? cat.name_bn : cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{bn ? 'পদবি' : 'Designation'}</Label>
                        <Select value={profileEditDesignation} onValueChange={setProfileEditDesignation}>
                          <SelectTrigger>
                            <SelectValue placeholder={bn ? 'পদবি নির্বাচন' : 'Select designation'} />
                          </SelectTrigger>
                          <SelectContent>
                            {masterDesignations
                              .filter((d) => !profileEditStaffCategory || d.staff_category === profileEditStaffCategory)
                              .map((d) => (
                                <SelectItem key={d.id} value={(bn ? d.name_bn : d.name) || d.name || d.name_bn || ''}>{(bn ? d.name_bn : d.name) || d.name || d.name_bn}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  <Button onClick={saveStaffIdentity} disabled={profileSaving === 'staff'} className="w-full btn-primary-gradient">
                    {profileSaving === 'staff' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    {bn ? 'নাম সেভ করুন' : 'Save Name'}
                  </Button>
                </div>

                {/* ===== TABLE LINK SECTION (Staff / Administrative Officer) ===== */}
                {profileUser && (
                  <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20 p-4 space-y-3">
                    <h3 className="flex items-center gap-2 font-semibold text-base text-emerald-700 dark:text-emerald-400">
                      <Users2 className="w-5 h-5" />
                      {bn ? 'টেবিলে যোগ/সরান' : 'Add to / Remove from Table'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {bn
                        ? 'এই ইউজারকে স্টাফ অথবা প্রশাসনিক কর্মকর্তা টেবিলে যোগ বা সরাতে পারবেন। উপরের নাম/ডিপার্টমেন্ট/পদবি ফিল্ড ব্যবহার হবে।'
                        : 'Add or remove this user to/from Staff or Administrative Officers table. The fields above will be used.'}
                    </p>

                    {/* Staff link */}
                    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-card border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{bn ? 'স্টাফ টেবিল' : 'Staff Table'}</p>
                        {staffByUser[profileUser.id] ? (
                          <p className="text-xs text-emerald-600 truncate">
                            ✓ {bn ? 'যুক্ত আছে' : 'Linked'} — {staffByUser[profileUser.id].name_bn || staffByUser[profileUser.id].name_en}
                            {staffByUser[profileUser.id].designation && ` (${staffByUser[profileUser.id].designation})`}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">{bn ? 'এখনো যুক্ত নেই' : 'Not linked yet'}</p>
                        )}
                      </div>
                      {staffByUser[profileUser.id] ? (
                        <Button size="sm" variant="outline" onClick={removeFromStaff} disabled={linkSaving === 'staff'} className="text-destructive hover:bg-destructive/10">
                          {linkSaving === 'staff' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                          {bn ? 'সরান' : 'Remove'}
                        </Button>
                      ) : (
                        <Button size="sm" onClick={addToStaff} disabled={linkSaving === 'staff'}>
                          {linkSaving === 'staff' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 mr-1" />}
                          {bn ? 'স্টাফে যোগ' : 'Add to Staff'}
                        </Button>
                      )}
                    </div>

                    {/* Administrative Officer link */}
                    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-card border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{bn ? 'প্রশাসনিক কর্মকর্তা টেবিল' : 'Administrative Officers Table'}</p>
                        {adminOfficerByUser[profileUser.id] ? (
                          <p className="text-xs text-emerald-600 truncate">
                            ✓ {bn ? 'যুক্ত আছে' : 'Linked'} — {adminOfficerByUser[profileUser.id].name_bn}
                            {adminOfficerByUser[profileUser.id].designation && ` (${adminOfficerByUser[profileUser.id].designation})`}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">{bn ? 'এখনো যুক্ত নেই' : 'Not linked yet'}</p>
                        )}
                      </div>
                      {adminOfficerByUser[profileUser.id] ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {!staffByUser[profileUser.id] && (
                            <Button size="sm" variant="outline" onClick={() => removeFromAdministrative({ moveToStaff: true })} disabled={linkSaving === 'officer'} title={bn ? 'প্রশাসনিক থেকে সরিয়ে স্টাফে স্থানান্তর' : 'Move to Staff'}>
                              {linkSaving === 'officer' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 mr-1" />}
                              {bn ? 'স্টাফে স্থানান্তর' : 'Move to Staff'}
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => removeFromAdministrative()} disabled={linkSaving === 'officer'} className="text-destructive hover:bg-destructive/10">
                            {linkSaving === 'officer' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                            {bn ? 'সরান' : 'Remove'}
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" onClick={addToAdministrative} disabled={linkSaving === 'officer'} className="bg-emerald-600 hover:bg-emerald-700">
                          {linkSaving === 'officer' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1" />}
                          {bn ? 'প্রশাসনিকে যোগ' : 'Add to Administrative'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* ===== EMAIL CHANGE SECTION ===== */}
                <div className="rounded-xl border-2 border-primary/20 bg-card p-4 space-y-3">
                  <h3 className="flex items-center gap-2 font-semibold text-base text-primary">
                    <Mail className="w-5 h-5" />
                    {bn ? 'লগইন ইমেইল পরিবর্তন' : 'Login Email Change'}
                  </h3>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{bn ? 'বর্তমান ইমেইল' : 'Current Email'}</Label>
                    <Input value={profileUser.email} readOnly className="bg-muted/50 text-muted-foreground" />
                  </div>

                   {/* OTP Toggle - admin only */}
                   {isAdminRole(currentUserRole) && (
                   <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                     <div className="flex items-center gap-2">
                       <Switch checked={emailOtpEnabled} onCheckedChange={(v) => { setEmailOtpEnabled(v); setEmailOtpStep(false); setEmailOtpSent(false); setEmailOtpCode(''); }} />
                       <div>
                         <p className="text-sm font-medium">{bn ? 'OTP যাচাই ব্যবহার করুন' : 'Use OTP Verification'}</p>
                         <p className="text-xs text-muted-foreground">{bn ? 'বর্তমান ইমেইলে কোড পাঠিয়ে যাচাই করুন' : 'Verify by sending code to current email'}</p>
                       </div>
                     </div>
                   </div>
                   )}

                  {!emailOtpStep ? (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{bn ? 'নতুন ইমেইল' : 'New Email'}</Label>
                        <Input type="email" value={profileEditEmail} onChange={e => setProfileEditEmail(e.target.value)} placeholder={bn ? 'নতুন ইমেইল লিখুন' : 'Enter new email'} />
                      </div>
                      <Button
                        className="w-full btn-primary-gradient"
                        disabled={profileSaving === 'email' || !profileEditEmail.trim() || profileEditEmail === profileUser.email}
                        onClick={async () => {
                          if (!profileEditEmail.trim() || !profileEditEmail.includes('@')) {
                            toast.error(bn ? 'সঠিক ইমেইল দিন' : 'Enter a valid email');
                            return;
                          }
                          if (emailOtpEnabled) {
                            // Show OTP step instead of directly changing
                            setEmailOtpStep(true);
                            setEmailOtpSent(false);
                            setEmailOtpCode('');
                            return;
                          }
                          // Direct change without OTP
                          setProfileSaving('email');
                          try {
                            const { data, error } = await supabase.functions.invoke('manage-users', {
                              body: { action: 'update_email', user_id: profileUser.id, new_email: profileEditEmail.trim() },
                            });
                            if (error || !data?.success) throw new Error((bn ? data?.message_bn : data?.message) || data?.error || error?.message);
                            toast.success(bn ? '✅ ইমেইল আপডেট হয়েছে' : '✅ Email updated');
                            setProfileUser({ ...profileUser, email: profileEditEmail.trim() });
                            fetchUsers();
                          } catch (err: any) {
                            toast.error(err?.message || (bn ? 'ইমেইল আপডেট ব্যর্থ' : 'Failed to update email'));
                          }
                          setProfileSaving(null);
                        }}
                      >
                        {profileSaving === 'email' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        {bn ? 'ইমেইল পরিবর্তন করুন' : 'Change Email'}
                      </Button>
                    </>
                  ) : (
                    /* OTP Verification Step */
                    <div className="space-y-3 rounded-lg border border-dashed border-primary/30 p-4 bg-primary/5">
                      <p className="text-sm font-medium text-center">
                        {bn ? `"${profileUser.email}" এ OTP কোড পাঠিয়ে যাচাই করুন` : `Verify via OTP sent to "${profileUser.email}"`}
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={emailOtpCode}
                          onChange={e => setEmailOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder={bn ? '৬ ডিজিট OTP কোড' : '6-digit OTP code'}
                          maxLength={6}
                          className="flex-1"
                          disabled={!emailOtpSent}
                        />
                        {!emailOtpSent ? (
                          <Button size="sm" variant="outline" disabled={otpSending} onClick={async () => {
                            const result = await sendOtp(profileUser.email, 'email_verification', getUserDisplayName(profileUser));
                            if (result.success) { setEmailOtpSent(true); toast.success(bn ? `✅ OTP পাঠানো হয়েছে (${result.expiryMinutes} মিনিট)` : `✅ OTP sent (${result.expiryMinutes} min)`); }
                          }}>
                            {otpSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
                            <span className="ml-1">{bn ? 'OTP পাঠান' : 'Send OTP'}</span>
                          </Button>
                        ) : (
                          <Button size="sm" disabled={otpVerifying || emailOtpCode.length !== 6 || profileSaving === 'email'} onClick={async () => {
                            const result = await verifyOtp(profileUser.email, emailOtpCode, 'email_verification');
                            if (result.valid) {
                              toast.success(bn ? '✅ OTP যাচাই সফল! ইমেইল পরিবর্তন হচ্ছে...' : '✅ OTP verified! Changing email...');
                              setProfileSaving('email');
                              try {
                                const { data, error } = await supabase.functions.invoke('manage-users', {
                                  body: { action: 'update_email', user_id: profileUser.id, new_email: profileEditEmail.trim() },
                                });
                                if (error || !data?.success) throw new Error((bn ? data?.message_bn : data?.message) || data?.error || error?.message);
                                toast.success(bn ? '✅ ইমেইল আপডেট হয়েছে' : '✅ Email updated');
                                setProfileUser({ ...profileUser, email: profileEditEmail.trim() });
                                setEmailOtpStep(false); setEmailOtpEnabled(false); setEmailOtpSent(false); setEmailOtpCode('');
                                fetchUsers();
                              } catch (err: any) {
                                toast.error(err?.message || (bn ? 'ইমেইল আপডেট ব্যর্থ' : 'Failed to update email'));
                              }
                              setProfileSaving(null);
                            } else {
                              toast.error(result.error || (bn ? 'ভুল OTP কোড' : 'Invalid OTP'));
                            }
                          }}>
                            {(otpVerifying || profileSaving === 'email') ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            <span className="ml-1">{bn ? 'যাচাই ও পরিবর্তন' : 'Verify & Change'}</span>
                          </Button>
                        )}
                      </div>
                      {emailOtpSent && (
                        <button type="button" className="text-xs text-primary hover:underline" onClick={async () => {
                          const result = await sendOtp(profileUser.email, 'email_verification', getUserDisplayName(profileUser));
                          if (result.success) toast.success(bn ? 'নতুন OTP পাঠানো হয়েছে' : 'New OTP sent');
                        }}>{bn ? 'আবার OTP পাঠান' : 'Resend OTP'}</button>
                      )}
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => { setEmailOtpStep(false); setEmailOtpSent(false); setEmailOtpCode(''); }}>
                        {bn ? '← ফিরে যান' : '← Go Back'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* ===== PASSWORD CHANGE SECTION ===== */}
                <div className="rounded-xl border-2 border-primary/20 bg-card p-4 space-y-3">
                  <h3 className="flex items-center gap-2 font-semibold text-base text-primary">
                    <KeyRound className="w-5 h-5" />
                    {bn ? 'পাসওয়ার্ড পরিবর্তন' : 'Password Change'}
                  </h3>

                   {/* OTP Toggle - admin only */}
                   {isAdminRole(currentUserRole) && (
                   <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                     <div className="flex items-center gap-2">
                       <Switch checked={pwOtpEnabled} onCheckedChange={(v) => { setPwOtpEnabled(v); setPwOtpStep(false); setPwOtpSent(false); setPwOtpCode(''); }} />
                       <div>
                         <p className="text-sm font-medium">{bn ? 'OTP যাচাই ব্যবহার করুন' : 'Use OTP Verification'}</p>
                         <p className="text-xs text-muted-foreground">{bn ? 'ইমেইলে কোড পাঠিয়ে নিরাপত্তা নিশ্চিত করুন' : 'Send code to email for security'}</p>
                       </div>
                     </div>
                   </div>
                   )}

                  {!pwOtpStep ? (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{bn ? 'নতুন পাসওয়ার্ড' : 'New Password'}</Label>
                        <div className="relative">
                          <Input type={profileShowPw ? 'text' : 'password'} value={profileNewPassword} onChange={e => setProfileNewPassword(sanitizePasswordInput(e.target.value))} placeholder={bn ? 'নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'New password (min 6 chars)'} className="pr-10" />
                          <button type="button" onClick={() => setProfileShowPw(!profileShowPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {profileShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <PasswordStrengthMeter password={profileNewPassword} bn={bn} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{bn ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}</Label>
                        <div className="relative">
                          <Input type={profileShowPw ? 'text' : 'password'} value={profileConfirmPassword} onChange={e => setProfileConfirmPassword(sanitizePasswordInput(e.target.value))} placeholder={bn ? 'নতুন পাসওয়ার্ড পুনরায় দিন' : 'Re-enter new password'} className="pr-10" />
                          <button type="button" onClick={() => setProfileShowPw(!profileShowPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {profileShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <Button
                        className="w-full btn-primary-gradient"
                        disabled={profileSaving === 'password' || !isPasswordStrongAgainst(profileNewPassword, passwordPolicy) || (profileConfirmPassword !== '' && profileNewPassword !== profileConfirmPassword)}
                        onClick={async () => {
                          if (profileConfirmPassword && profileNewPassword !== profileConfirmPassword) {
                            toast.error(bn ? 'পাসওয়ার্ড মিলছে না' : 'Passwords do not match');
                            return;
                          }
                          if (pwOtpEnabled) {
                            setPwOtpStep(true);
                            setPwOtpSent(false);
                            setPwOtpCode('');
                            return;
                          }
                          // Direct change
                          setProfileSaving('password');
                          try {
                            const { data, error } = await supabase.functions.invoke('manage-users', {
                              body: { action: 'update_password', user_id: profileUser.id, new_password: profileNewPassword },
                            });
                            if (error || !data?.success) throw new Error(data?.error || error?.message);
                            toast.success(bn ? '✅ পাসওয়ার্ড আপডেট হয়েছে' : '✅ Password updated');
                            setProfileNewPassword(''); setProfileConfirmPassword('');
                          } catch (err: any) {
                            toast.error(err?.message || (bn ? 'পাসওয়ার্ড আপডেট ব্যর্থ' : 'Failed to update password'));
                          }
                          setProfileSaving(null);
                        }}
                      >
                        {profileSaving === 'password' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
                        {bn ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'Change Password'}
                      </Button>
                    </>
                  ) : (
                    /* OTP Verification Step */
                    <div className="space-y-3 rounded-lg border border-dashed border-primary/30 p-4 bg-primary/5">
                      <p className="text-sm font-medium text-center">
                        {bn ? `"${profileUser.email}" এ OTP কোড পাঠিয়ে যাচাই করুন` : `Verify via OTP sent to "${profileUser.email}"`}
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={pwOtpCode}
                          onChange={e => setPwOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder={bn ? '৬ ডিজিট OTP কোড' : '6-digit OTP code'}
                          maxLength={6}
                          className="flex-1"
                          disabled={!pwOtpSent}
                        />
                        {!pwOtpSent ? (
                          <Button size="sm" variant="outline" disabled={otpSending} onClick={async () => {
                            const result = await sendOtp(profileUser.email, 'password_reset', getUserDisplayName(profileUser));
                            if (result.success) { setPwOtpSent(true); toast.success(bn ? `✅ OTP পাঠানো হয়েছে (${result.expiryMinutes} মিনিট)` : `✅ OTP sent (${result.expiryMinutes} min)`); }
                          }}>
                            {otpSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
                            <span className="ml-1">{bn ? 'OTP পাঠান' : 'Send OTP'}</span>
                          </Button>
                        ) : (
                          <Button size="sm" disabled={otpVerifying || pwOtpCode.length !== 6 || profileSaving === 'password'} onClick={async () => {
                            const result = await verifyOtp(profileUser.email, pwOtpCode, 'password_reset');
                            if (result.valid) {
                              toast.success(bn ? '✅ OTP যাচাই সফল! পাসওয়ার্ড পরিবর্তন হচ্ছে...' : '✅ OTP verified! Changing password...');
                              setProfileSaving('password');
                              try {
                                const { data, error } = await supabase.functions.invoke('manage-users', {
                                  body: { action: 'update_password', user_id: profileUser.id, new_password: profileNewPassword },
                                });
                                if (error || !data?.success) throw new Error(data?.error || error?.message);
                                toast.success(bn ? '✅ পাসওয়ার্ড আপডেট হয়েছে' : '✅ Password updated');
                                setProfileNewPassword(''); setProfileConfirmPassword('');
                                setPwOtpStep(false); setPwOtpEnabled(false); setPwOtpSent(false); setPwOtpCode('');
                              } catch (err: any) {
                                toast.error(err?.message || (bn ? 'পাসওয়ার্ড আপডেট ব্যর্থ' : 'Failed to update password'));
                              }
                              setProfileSaving(null);
                            } else {
                              toast.error(result.error || (bn ? 'ভুল OTP কোড' : 'Invalid OTP'));
                            }
                          }}>
                            {(otpVerifying || profileSaving === 'password') ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            <span className="ml-1">{bn ? 'যাচাই ও পরিবর্তন' : 'Verify & Change'}</span>
                          </Button>
                        )}
                      </div>
                      {pwOtpSent && (
                        <button type="button" className="text-xs text-primary hover:underline" onClick={async () => {
                          const result = await sendOtp(profileUser.email, 'password_reset', getUserDisplayName(profileUser));
                          if (result.success) toast.success(bn ? 'নতুন OTP পাঠানো হয়েছে' : 'New OTP sent');
                        }}>{bn ? 'আবার OTP পাঠান' : 'Resend OTP'}</button>
                      )}
                      <Button variant="ghost" size="sm" className="w-full" onClick={() => { setPwOtpStep(false); setPwOtpSent(false); setPwOtpCode(''); }}>
                        {bn ? '← ফিরে যান' : '← Go Back'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Duplicate Conflict Modal */}
        <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                {bn ? 'ডুপ্লিকেট পাওয়া গেছে' : 'Duplicate Found'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                {conflictType === 'email'
                  ? (bn ? 'এই ইমেইল ইতিমধ্যে নিচের ইউজার ব্যবহার করছেন:' : 'This email is already used by the following user:')
                  : (bn ? 'এই নাম ইতিমধ্যে নিচের ইউজার ব্যবহার করছেন:' : 'This name is already used by the following user:')}
              </p>
              {conflictLoading ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : conflictUser ? (
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <UserCircle className="w-9 h-9 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{conflictUser.full_name || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{conflictUser.email || '—'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/40">
                    <div>
                      <p className="text-muted-foreground">{bn ? 'রোল' : 'Role'}</p>
                      <p className="font-medium capitalize">{conflictUser.role || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{bn ? 'মোবাইল' : 'Mobile'}</p>
                      <p className="font-medium">{conflictUser.phone || '—'}</p>
                    </div>
                    {conflictUser.status && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">{bn ? 'স্ট্যাটাস' : 'Status'}</p>
                        <Badge variant="outline" className="mt-0.5 capitalize">{conflictUser.status}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">{bn ? 'বিদ্যমান ইউজারের তথ্য পাওয়া যায়নি' : 'Existing user details not available'}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {bn ? '💡 অনুগ্রহ করে ভিন্ন ' : '💡 Please use a different '}
                {conflictType === 'email' ? (bn ? 'ইমেইল' : 'email') : (bn ? 'নাম' : 'name')}
                {bn ? ' ব্যবহার করুন।' : '.'}
              </p>
              <Button onClick={() => setConflictOpen(false)} className="w-full" variant="outline">
                {bn ? 'বুঝেছি' : 'Got it'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminUserManagement;
