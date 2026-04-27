import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Loader2, Trash2, Eye, EyeOff, AlertTriangle, KeyRound, Save, Pencil, ShieldCheck, Tag, Shield, UserCircle, Mail, SendHorizonal, UserPlus, Users2 } from 'lucide-react';
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

interface UserItem {
  id: string;
  email: string;
  role: string;
  full_name: string;
  status: string;
  created_at: string;
}

interface UserPerm {
  menu_path: string;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
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

const MENU_PATHS = [
  { path: '/admin', label_bn: 'ড্যাশবোর্ড', label_en: 'Dashboard' },
  { path: '/admin/profile', label_bn: 'প্রোফাইল', label_en: 'Profile' },
  { path: '/admin/students', label_bn: 'ছাত্র ব্যবস্থাপনা', label_en: 'Students' },
  { path: '/admin/staff', label_bn: 'স্টাফ/শিক্ষক', label_en: 'Staff/Teacher' },
  { path: '/admin/divisions', label_bn: 'বিভাগ ও শ্রেণী', label_en: 'Divisions' },
  { path: '/admin/academic-sessions', label_bn: 'একাডেমিক সেশন', label_en: 'Academic Sessions' },
  { path: '/admin/subjects', label_bn: 'বিষয়সমূহ', label_en: 'Subjects' },
  { path: '/admin/results', label_bn: 'ফলাফল', label_en: 'Results' },
  { path: '/admin/notices', label_bn: 'নোটিশ', label_en: 'Notices' },
  { path: '/admin/students-fees', label_bn: 'ছাত্র ফি', label_en: 'Student Fees' },
  { path: '/admin/fee-receipts', label_bn: 'ফি রসিদ', label_en: 'Fee Receipts' },
  { path: '/admin/expenses', label_bn: 'খরচ ব্যবস্থাপনা', label_en: 'Expenses' },
  { path: '/admin/donors', label_bn: 'দাতা তালিকা', label_en: 'Donors' },
  { path: '/admin/attendance', label_bn: 'হাজিরা', label_en: 'Attendance' },
  { path: '/admin/salary', label_bn: 'বেতন ব্যবস্থাপনা', label_en: 'Salary' },
  { path: '/admin/reports', label_bn: 'রিপোর্ট ও অ্যানালিটিক্স', label_en: 'Reports & Analytics' },
  { path: '/admin/website', label_bn: 'ওয়েবসাইট নিয়ন্ত্রণ', label_en: 'Website Control' },
  { path: '/admin/posts', label_bn: 'পোস্ট', label_en: 'Posts' },
  { path: '/admin/resign-letters', label_bn: 'পদত্যাগ পত্র', label_en: 'Resign Letters' },
  { path: '/admin/joining-letters', label_bn: 'যোগদান পত্র', label_en: 'Joining Letters' },
  { path: '/admin/admission-letters', label_bn: 'ভর্তি পত্র', label_en: 'Admission Letters' },
  { path: '/admin/designations', label_bn: 'পদবি তৈরি', label_en: 'Designations' },
  { path: '/admin/form-builder', label_bn: 'কাস্টম বিল্ডার', label_en: 'Custom Builder' },
  { path: '/admin/module-manager', label_bn: 'মডিউল ম্যানেজার', label_en: 'Module Manager' },
  { path: '/admin/formula-builder', label_bn: 'ফর্মুলা বিল্ডার', label_en: 'Formula Builder' },
  { path: '/admin/validation-manager', label_bn: 'ভ্যালিডেশন ম্যানেজার', label_en: 'Validation Manager' },
  { path: '/admin/permissions', label_bn: 'পারমিশন', label_en: 'Permissions' },
  { path: '/admin/theme', label_bn: 'থিম কাস্টমাইজার', label_en: 'Theme Customizer' },
  { path: '/admin/menu-manager', label_bn: 'মেনু ম্যানেজার', label_en: 'Menu Manager' },
  { path: '/admin/widget-builder', label_bn: 'উইজেট বিল্ডার', label_en: 'Widget Builder' },
  { path: '/admin/backup', label_bn: 'ব্যাকআপ', label_en: 'Backup' },
  { path: '/admin/guardian-notify', label_bn: 'অভিভাবক নোটিফিকেশন', label_en: 'Guardian Notify' },
  { path: '/admin/prayer-calendar', label_bn: 'নামাজ ও ক্যালেন্ডার', label_en: 'Prayer & Calendar' },
  { path: '/admin/address-manager', label_bn: 'ঠিকানা ম্যানেজার', label_en: 'Address Manager' },
  { path: '/admin/api-verification', label_bn: 'API ভেরিফিকেশন', label_en: 'API Verification' },
  { path: '/admin/user-management', label_bn: 'ইউজার ম্যানেজমেন্ট', label_en: 'User Management' },
  { path: '/admin/settings', label_bn: 'সেটিংস', label_en: 'Settings' },
  { path: '/admin/approvals', label_bn: 'অনুমোদন ব্যবস্থাপনা', label_en: 'Approvals' },
];

const AdminUserManagement = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const passwordPolicy = usePasswordPolicy();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/user-management');
  const { role: currentUserRole } = useAuth();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<UserItem | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileEditName, setProfileEditName] = useState('');
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
  const [role, setRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
  const [rolePerms, setRolePerms] = useState<{ menu_path: string; can_view: boolean; can_add: boolean; can_edit: boolean; can_delete: boolean }[]>([]);

  // Permission dialog
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permUser, setPermUser] = useState<UserItem | null>(null);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [userPerms, setUserPerms] = useState<UserPerm[]>([]);

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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        method: 'GET',
      });
      if (error) throw error;
      setUsers(data?.users || []);
    } catch {
      toast.error(bn ? 'ইউজার তালিকা লোড ব্যর্থ' : 'Failed to load users');
    }
    setLoading(false);
  }, [bn]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = async () => {
    if (!email.trim()) { toast.error(bn ? 'ইমেইল দিন' : 'Enter email'); return; }
    if (!fullName.trim()) { toast.error(bn ? 'ইউজারের নাম দিন' : 'Enter user name'); return; }
    if (!isPasswordStrongAgainst(password, passwordPolicy)) { toast.error(firstFailedRuleMessage(password, passwordPolicy, bn) || (bn ? 'পাসওয়ার্ড সব শর্ত পূরণ করছে না' : 'Password does not meet requirements')); return; }

    // Client-side duplicate guard against currently loaded users
    const emailLc = email.trim().toLowerCase();
    const nameLc = fullName.trim().toLowerCase();
    if (users.some(u => u.email?.toLowerCase() === emailLc)) {
      toast.error(bn ? 'এই ইমেইলে একজন ইউজার ইতিমধ্যে আছেন' : 'A user with this email already exists');
      return;
    }
    if (users.some(u => (u.full_name || '').toLowerCase() === nameLc)) {
      toast.error(bn ? 'এই নামে একজন ইউজার ইতিমধ্যে আছেন' : 'A user with this name already exists');
      return;
    }

    // Find the base role for custom roles (role can be empty/'none' for permission-only users)
    const effectiveRole = (role && role !== 'none') ? role : '';
    const customRole = effectiveRole ? customRoles.find(r => r.name === effectiveRole) : null;
    const actualRole = effectiveRole ? (customRole?.base_role || effectiveRole) : '';

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'create', email: email.trim(), password, role: actualRole || undefined, full_name: fullName.trim() },
      });
      if (error || !data?.success) {
        const msg = (bn ? data?.message_bn : data?.message) || data?.error || error?.message || (bn ? 'ইউজার তৈরি ব্যর্থ' : 'Failed to create user');
        toast.error(msg);
        setCreating(false);
        return;
      }
      toast.success(bn ? '✅ ইউজার সফলভাবে তৈরি হয়েছে!' : '✅ User created successfully!');
      setDialogOpen(false);
      setEmail(''); setPassword(''); setFullName(''); setRole('');
      fetchUsers();
    } catch {
      toast.error(bn ? 'ইউজার তৈরি ব্যর্থ' : 'Failed to create user');
    }
    setCreating(false);
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
    if (!confirm(bn ? 'এই ইউজার ডিলিট করতে চান?' : 'Delete this user?')) return;
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
    if (!confirm(bn ? 'এই রোল ডিলিট করতে চান?' : 'Delete this role?')) return;
    try {
      const { error } = await supabase.from('custom_roles').delete().eq('id', id);
      if (error) throw error;
      toast.success(bn ? 'রোল মুছে ফেলা হয়েছে' : 'Role deleted');
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
    } catch {
      toast.error(bn ? 'ডিলিট ব্যর্থ' : 'Delete failed');
    }
  };

  // Role permission functions
  const openRolePermDialog = async (role: CustomRole) => {
    setRolePermRole(role);
    setRolePermDialogOpen(true);
    setRolePermLoading(true);
    try {
      const { data, error } = await supabase.from('role_permissions').select('*').eq('role', role.name);
      if (error) throw error;
      const merged = MENU_PATHS.map(mp => {
        const existing = (data || []).find((d: any) => d.menu_path === mp.path);
        return {
          menu_path: mp.path,
          can_view: existing?.can_view ?? false,
          can_add: existing?.can_add ?? false,
          can_edit: existing?.can_edit ?? false,
          can_delete: existing?.can_delete ?? false,
        };
      });
      setRolePerms(merged);
    } catch {
      toast.error(bn ? 'পারমিশন লোড ব্যর্থ' : 'Failed to load permissions');
    }
    setRolePermLoading(false);
  };

  const toggleRolePerm = (menuPath: string, field: string) => {
    setRolePerms(prev => prev.map(p => p.menu_path !== menuPath ? p : { ...p, [field]: !(p as any)[field] }));
  };

  const toggleAllRolePerms = (menuPath: string) => {
    setRolePerms(prev => prev.map(p => {
      if (p.menu_path !== menuPath) return p;
      const allOn = p.can_view && p.can_add && p.can_edit && p.can_delete;
      return { ...p, can_view: !allOn, can_add: !allOn, can_edit: !allOn, can_delete: !allOn };
    }));
  };

  const saveRolePermissions = async () => {
    if (!rolePermRole) return;
    setRolePermSaving(true);
    try {
      await supabase.from('role_permissions').delete().eq('role', rolePermRole.name);
      const toInsert = rolePerms
        .filter(p => p.can_view || p.can_add || p.can_edit || p.can_delete)
        .map(p => ({
          role: rolePermRole.name,
          menu_path: p.menu_path,
          can_view: p.can_view,
          can_add: p.can_add,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        }));
      if (toInsert.length > 0) {
        const { error } = await supabase.from('role_permissions').insert(toInsert);
        if (error) throw error;
      }
      toast.success(bn ? '✅ রোল পারমিশন সেভ হয়েছে!' : '✅ Role permissions saved!');
      setRolePermDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'পারমিশন সেভ ব্যর্থ' : 'Failed to save permissions'));
    }
    setRolePermSaving(false);
  };

  const openPermDialog = async (user: UserItem) => {
    setPermUser(user);
    setPermDialogOpen(true);
    setPermLoading(true);
    try {
      const { data, error } = await supabase.from('user_permissions').select('*').eq('user_id', user.id);
      if (error) throw error;
      const merged = MENU_PATHS.map(mp => {
        const existing = (data || []).find((d: any) => d.menu_path === mp.path);
        return {
          menu_path: mp.path,
          can_view: existing?.can_view ?? false,
          can_add: existing?.can_add ?? false,
          can_edit: existing?.can_edit ?? false,
          can_delete: existing?.can_delete ?? false,
          approval_view: existing?.approval_view ?? false,
          approval_add: existing?.approval_add ?? false,
          approval_edit: existing?.approval_edit ?? false,
          approval_delete: existing?.approval_delete ?? false,
        };
      });
      setUserPerms(merged);
    } catch {
      toast.error(bn ? 'পারমিশন লোড ব্যর্থ' : 'Failed to load permissions');
    }
    setPermLoading(false);
  };

  const togglePerm = (menuPath: string, field: keyof UserPerm) => {
    setUserPerms(prev => prev.map(p => p.menu_path !== menuPath ? p : { ...p, [field]: !(p as any)[field] }));
  };

  const toggleAllForPath = (menuPath: string) => {
    setUserPerms(prev => prev.map(p => {
      if (p.menu_path !== menuPath) return p;
      const allOn = p.can_view && p.can_add && p.can_edit && p.can_delete;
      return { ...p, can_view: !allOn, can_add: !allOn, can_edit: !allOn, can_delete: !allOn };
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
      const toInsert = userPerms
        .filter(p => p.can_view || p.can_add || p.can_edit || p.can_delete)
        .map(p => ({
          user_id: permUser.id,
          menu_path: p.menu_path,
          can_view: p.can_view,
          can_add: p.can_add,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
          approval_view: p.approval_view,
          approval_add: p.approval_add,
          approval_edit: p.approval_edit,
          approval_delete: p.approval_delete,
        }));
      if (toInsert.length > 0) {
        const { error } = await supabase.from('user_permissions').insert(toInsert);
        if (error) throw error;
      }
      toast.success(bn ? '✅ পারমিশন সেভ হয়েছে!' : '✅ Permissions saved!');
      setPermDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'পারমিশন সেভ ব্যর্থ' : 'Failed to save permissions'));
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            {bn ? 'ইউজার ব্যবস্থাপনা' : 'User Management'}
          </h1>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
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
              {canAddItem && <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-primary-gradient gap-2">
                    <Plus className="w-4 h-4" /> {bn ? 'নতুন ইউজার' : 'New User'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Plus className="w-5 h-5 text-primary" />
                      {bn ? 'নতুন ইউজার তৈরি করুন' : 'Create New User'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <Label>{bn ? 'নাম' : 'Full Name'}</Label>
                      <Input className="mt-1" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={bn ? 'ইউজারের নাম' : 'User name'} />
                    </div>
                    <div>
                      <Label>{bn ? 'ইমেইল' : 'Email'} *</Label>
                      <Input className="mt-1" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={bn ? 'ইমেইল অ্যাড্রেস' : 'Email address'} />
                    </div>
                    <div>
                      <Label>{bn ? 'পাসওয়ার্ড' : 'Password'} *</Label>
                      <div className="relative mt-1">
                        <Input className="pr-10" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(sanitizePasswordInput(e.target.value))} placeholder={bn ? 'শক্তিশালী পাসওয়ার্ড দিন' : 'Enter strong password'} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <PasswordStrengthMeter password={password} bn={bn} />
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
                    <Button onClick={handleCreate} disabled={creating} className="w-full btn-primary-gradient">
                      {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      {bn ? 'ইউজার তৈরি করুন' : 'Create User'}
                    </Button>
                  </div>
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
                      <TableHead>{bn ? 'রোল' : 'Role'}</TableHead>
                      <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                      <TableHead>{bn ? 'তৈরির তারিখ' : 'Created'}</TableHead>
                      <TableHead className="w-32 text-center">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                        <TableCell>{u.email}</TableCell>
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
                              onClick={() => { setProfileUser(u); setProfileEditName(u.full_name || ''); setProfileEditEmail(u.email); setProfileNewPassword(''); setProfileShowPw(false); setProfileOpen(true); }}
                              title={bn ? 'প্রোফাইল দেখুন' : 'View Profile'}
                            >
                              <UserCircle className="w-4 h-4" />
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
                            {/* Quick: Add to Staff */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => navigate(`/admin/staff/add?email=${encodeURIComponent(u.email)}&full_name=${encodeURIComponent(u.full_name || '')}`)}
                              title={bn ? 'স্টাফে যোগ করুন' : 'Add to Staff'}
                            >
                              <UserPlus className="w-4 h-4" />
                            </Button>
                            {/* Quick: Add to Committee */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              onClick={() => navigate(`/admin/committees?prefill_email=${encodeURIComponent(u.email)}&prefill_name=${encodeURIComponent(u.full_name || '')}`)}
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
                    ))}
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

            <div className="card-elevated overflow-hidden">
              {rolesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{bn ? 'রোল নাম' : 'Role Name'}</TableHead>
                      <TableHead>{bn ? 'বাংলা নাম' : 'Bangla Name'}</TableHead>
                      <TableHead>{bn ? 'বেস রোল' : 'Base Role'}</TableHead>
                      <TableHead>{bn ? 'বিবরণ' : 'Description'}</TableHead>
                      <TableHead>{bn ? 'টাইপ' : 'Type'}</TableHead>
                      <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customRoles.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.name_bn}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.base_role}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                          {bn ? r.description_bn : r.description || '—'}
                        </TableCell>
                        <TableCell>
                          {r.is_system ? (
                            <Badge variant="secondary" className="gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              {bn ? 'সিস্টেম' : 'System'}
                            </Badge>
                          ) : (
                            <Badge variant="outline">{bn ? 'কাস্টম' : 'Custom'}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openRoleDialog(r)} title={bn ? 'এডিট' : 'Edit'}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => openRolePermDialog(r)}
                              title={bn ? 'পারমিশন সেট করুন' : 'Set Permissions'}
                            >
                              <KeyRound className="w-4 h-4" />
                            </Button>
                            {!r.is_system && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteCustomRole(r.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
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
                  {roleEditUser.full_name || roleEditUser.email}
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

        {/* Permission Dialog */}
        <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                {bn ? 'ব্যক্তিগত পারমিশন' : 'Individual Permissions'}
                {permUser && (
                  <Badge variant="outline" className="ml-2 font-normal">
                    {permUser.full_name || permUser.email}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            {permLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : isAdminRole(permUser?.role) ? (
              <div className="py-8 text-center space-y-2">
                <ShieldCheck className="w-10 h-10 text-primary mx-auto" />
                <p className="text-sm font-medium text-foreground">
                  {bn ? 'অ্যাডমিন হিসেবে এই ইউজারের কাছে সব পারমিশন ডিফল্টভাবে আছে।' : 'As an Admin, this user has full access to all permissions by default.'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {bn ? 'ব্যক্তিগত পারমিশন সেট করার প্রয়োজন নেই।' : 'No need to set individual permissions.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  {bn
                    ? 'এখানে সেট করা পারমিশন রোল-ভিত্তিক পারমিশনের উপরে প্রযোজ্য হবে (ওভাররাইড)।'
                    : 'Permissions set here will override role-based permissions for this user.'}
                </p>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="min-w-[140px]">{bn ? 'মেনু' : 'Menu'}</TableHead>
                        <TableHead className="text-center w-16">{bn ? 'দেখা' : 'View'}</TableHead>
                        <TableHead className="text-center w-16">{bn ? 'যোগ' : 'Add'}</TableHead>
                        <TableHead className="text-center w-16">{bn ? 'সম্পাদনা' : 'Edit'}</TableHead>
                        <TableHead className="text-center w-16">{bn ? 'মুছুন' : 'Delete'}</TableHead>
                        <TableHead className="text-center w-16">{bn ? 'সব' : 'All'}</TableHead>
                        <TableHead className="text-center w-20" colSpan={3}>
                          <span className="text-yellow-600">{bn ? 'অনুমোদন লাগবে' : 'Needs Approval'}</span>
                          <div className="flex justify-center gap-2 mt-1 text-xs text-muted-foreground font-normal">
                            <span className="w-10 text-center">{bn ? 'যোগ' : 'A'}</span>
                            <span className="w-10 text-center">{bn ? 'সম্পা.' : 'E'}</span>
                            <span className="w-10 text-center">{bn ? 'মুছুন' : 'D'}</span>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userPerms.map(perm => {
                        const menuInfo = MENU_PATHS.find(m => m.path === perm.menu_path);
                        const allOn = perm.can_view && perm.can_add && perm.can_edit && perm.can_delete;
                        return (
                          <TableRow key={perm.menu_path}>
                            <TableCell className="font-medium text-sm">
                              {bn ? menuInfo?.label_bn : menuInfo?.label_en}
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox checked={perm.can_view} onCheckedChange={() => togglePerm(perm.menu_path, 'can_view')} />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox checked={perm.can_add} onCheckedChange={() => togglePerm(perm.menu_path, 'can_add')} />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox checked={perm.can_edit} onCheckedChange={() => togglePerm(perm.menu_path, 'can_edit')} />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox checked={perm.can_delete} onCheckedChange={() => togglePerm(perm.menu_path, 'can_delete')} />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox checked={allOn} onCheckedChange={() => toggleAllForPath(perm.menu_path)} />
                            </TableCell>
                            {(['approval_add', 'approval_edit', 'approval_delete'] as const).map((af, i) => {
                              const relatedPerm = (['can_add', 'can_edit', 'can_delete'] as const)[i];
                              return (
                                <TableCell key={af} className="text-center">
                                  <Checkbox
                                    checked={perm[af]}
                                    onCheckedChange={() => toggleApproval(perm.menu_path, af)}
                                    className="border-yellow-500 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                                    disabled={!perm[relatedPerm]}
                                  />
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <Button onClick={savePermissions} disabled={permSaving} className="w-full btn-primary-gradient">
                  {permSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {bn ? 'পারমিশন সেভ করুন' : 'Save Permissions'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Role Permission Dialog */}
        <Dialog open={rolePermDialogOpen} onOpenChange={setRolePermDialogOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                {bn ? 'রোল পারমিশন' : 'Role Permissions'}
                {rolePermRole && (
                  <Badge variant="outline" className="ml-2 font-normal">
                    {bn ? rolePermRole.name_bn : rolePermRole.name}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            {rolePermLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  {bn
                    ? 'এই রোলের ইউজাররা কোন কোন মেনু/ফিচারে কী কী করতে পারবে তা নির্ধারণ করুন।'
                    : 'Set what users with this role can do on each menu/feature.'}
                </p>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="min-w-[140px]">{bn ? 'মেনু' : 'Menu'}</TableHead>
                        <TableHead className="text-center w-16">{bn ? 'দেখা' : 'View'}</TableHead>
                        <TableHead className="text-center w-16">{bn ? 'যোগ' : 'Add'}</TableHead>
                        <TableHead className="text-center w-16">{bn ? 'সম্পাদনা' : 'Edit'}</TableHead>
                        <TableHead className="text-center w-16">{bn ? 'মুছুন' : 'Delete'}</TableHead>
                        <TableHead className="text-center w-16">{bn ? 'সব' : 'All'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rolePerms.map(perm => {
                        const menuInfo = MENU_PATHS.find(m => m.path === perm.menu_path);
                        const allOn = perm.can_view && perm.can_add && perm.can_edit && perm.can_delete;
                        return (
                          <TableRow key={perm.menu_path}>
                            <TableCell className="font-medium text-sm">
                              {bn ? menuInfo?.label_bn : menuInfo?.label_en}
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox checked={perm.can_view} onCheckedChange={() => toggleRolePerm(perm.menu_path, 'can_view')} />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox checked={perm.can_add} onCheckedChange={() => toggleRolePerm(perm.menu_path, 'can_add')} />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox checked={perm.can_edit} onCheckedChange={() => toggleRolePerm(perm.menu_path, 'can_edit')} />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox checked={perm.can_delete} onCheckedChange={() => toggleRolePerm(perm.menu_path, 'can_delete')} />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox checked={allOn} onCheckedChange={() => toggleAllRolePerms(perm.menu_path)} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <Button onClick={saveRolePermissions} disabled={rolePermSaving} className="w-full btn-primary-gradient">
                  {rolePermSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {bn ? 'পারমিশন সেভ করুন' : 'Save Permissions'}
                </Button>
              </div>
            )}
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
                {/* User Info Card */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCircle className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{profileUser.full_name || '—'}</p>
                    <p className="text-sm text-muted-foreground">{profileUser.email}</p>
                  </div>
                </div>

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

                {/* Edit Name */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{bn ? 'নাম পরিবর্তন' : 'Change Name'}</Label>
                  <div className="flex gap-2">
                    <Input value={profileEditName} onChange={e => setProfileEditName(e.target.value)} placeholder={bn ? 'নতুন নাম' : 'New name'} />
                    <Button
                      size="sm"
                      disabled={profileSaving === 'name' || profileEditName === profileUser.full_name}
                      onClick={async () => {
                        setProfileSaving('name');
                        try {
                          const { data, error } = await supabase.functions.invoke('manage-users', {
                            body: { action: 'update_name', user_id: profileUser.id, full_name: profileEditName.trim() },
                          });
                          if (error || !data?.success) throw new Error(data?.error || error?.message);
                          toast.success(bn ? '✅ নাম আপডেট হয়েছে' : '✅ Name updated');
                          setProfileUser({ ...profileUser, full_name: profileEditName.trim() });
                          fetchUsers();
                        } catch (err: any) {
                          toast.error(err?.message || (bn ? 'নাম আপডেট ব্যর্থ' : 'Failed to update name'));
                        }
                        setProfileSaving(null);
                      }}
                    >
                      {profileSaving === 'name' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

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
                            if (error || !data?.success) throw new Error(data?.error || error?.message);
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
                            const result = await sendOtp(profileUser.email, 'email_verification', profileUser.full_name);
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
                                if (error || !data?.success) throw new Error(data?.error || error?.message);
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
                          const result = await sendOtp(profileUser.email, 'email_verification', profileUser.full_name);
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
                            const result = await sendOtp(profileUser.email, 'password_reset', profileUser.full_name);
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
                          const result = await sendOtp(profileUser.email, 'password_reset', profileUser.full_name);
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
      </div>
    </AdminLayout>
  );
};

export default AdminUserManagement;
