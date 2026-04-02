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
import { Users, Plus, Loader2, Trash2, Eye, EyeOff, AlertTriangle, KeyRound, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMenuSettings } from '@/hooks/useMenuSettings';

interface UserItem {
  id: string;
  email: string;
  role: string;
  full_name: string;
  created_at: string;
}

interface UserPerm {
  menu_path: string;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
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
  { path: '/admin/fees', label_bn: 'ফি', label_en: 'Fees' },
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
];

const AdminUserManagement = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Create form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Permission dialog
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permUser, setPermUser] = useState<UserItem | null>(null);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [userPerms, setUserPerms] = useState<UserPerm[]>([]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users?action=list', {
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
    if (!password || password.length < 6) { toast.error(bn ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর' : 'Password min 6 chars'); return; }
    if (!role) { toast.error(bn ? 'রোল সিলেক্ট করুন' : 'Select a role'); return; }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users?action=create', {
        body: { email: email.trim(), password, role, full_name: fullName.trim() },
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || (bn ? 'ইউজার তৈরি ব্যর্থ' : 'Failed to create user'));
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

  const handleDelete = async (userId: string) => {
    if (!confirm(bn ? 'এই ইউজার ডিলিট করতে চান?' : 'Delete this user?')) return;
    setDeleting(userId);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users?action=delete', {
        body: { user_id: userId },
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

  // Permission functions
  const openPermDialog = async (user: UserItem) => {
    setPermUser(user);
    setPermDialogOpen(true);
    setPermLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('menu_path, can_view, can_add, can_edit, can_delete')
        .eq('user_id', user.id);

      if (error) throw error;

      // Merge with all menu paths
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
      setUserPerms(merged);
    } catch {
      toast.error(bn ? 'পারমিশন লোড ব্যর্থ' : 'Failed to load permissions');
    }
    setPermLoading(false);
  };

  const togglePerm = (menuPath: string, field: keyof UserPerm) => {
    setUserPerms(prev => prev.map(p => {
      if (p.menu_path !== menuPath) return p;
      return { ...p, [field]: !(p as any)[field] };
    }));
  };

  const toggleAllForPath = (menuPath: string) => {
    setUserPerms(prev => prev.map(p => {
      if (p.menu_path !== menuPath) return p;
      const allOn = p.can_view && p.can_add && p.can_edit && p.can_delete;
      return { ...p, can_view: !allOn, can_add: !allOn, can_edit: !allOn, can_delete: !allOn };
    }));
  };

  const savePermissions = async () => {
    if (!permUser) return;
    setPermSaving(true);
    try {
      // Delete existing
      await supabase.from('user_permissions').delete().eq('user_id', permUser.id);

      // Insert non-empty ones
      const toInsert = userPerms
        .filter(p => p.can_view || p.can_add || p.can_edit || p.can_delete)
        .map(p => ({
          user_id: permUser.id,
          menu_path: p.menu_path,
          can_view: p.can_view,
          can_add: p.can_add,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
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
    const colors: Record<string, string> = {
      admin: 'bg-destructive/10 text-destructive border-destructive/30',
      teacher: 'bg-primary/10 text-primary border-primary/30',
      staff: 'bg-accent/50 text-accent-foreground border-accent',
    };
    return <Badge variant="outline" className={colors[r] || ''}>{r === 'admin' ? (bn ? 'অ্যাডমিন' : 'Admin') : r === 'teacher' ? (bn ? 'শিক্ষক' : 'Teacher') : r === 'staff' ? (bn ? 'স্টাফ' : 'Staff') : r}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            {bn ? 'ইউজার ব্যবস্থাপনা' : 'User Management'}
          </h1>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                    <Input className="pr-10" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={bn ? 'কমপক্ষে ৬ অক্ষর' : 'Min 6 characters'} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>{bn ? 'রোল' : 'Role'} *</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={bn ? 'রোল সিলেক্ট করুন' : 'Select role'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{bn ? 'অ্যাডমিন' : 'Admin'}</SelectItem>
                      <SelectItem value="teacher">{bn ? 'শিক্ষক' : 'Teacher'}</SelectItem>
                      <SelectItem value="staff">{bn ? 'স্টাফ' : 'Staff'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full btn-primary-gradient">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {bn ? 'ইউজার তৈরি করুন' : 'Create User'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info notice */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            {bn
              ? 'এখানে তৈরি করা ইউজাররা সরাসরি লগইন করতে পারবে। প্রতিটি ইউজারের জন্য আলাদা পারমিশন সেট করতে 🔑 বাটনে ক্লিক করুন।'
              : 'Users created here can log in immediately. Click the 🔑 button to set individual permissions for each user.'}
          </p>
        </div>

        {/* Users table */}
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
                  <TableHead>{bn ? 'তৈরির তারিখ' : 'Created'}</TableHead>
                  <TableHead className="w-24 text-center">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{roleBadge(u.role)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(u.created_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
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
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(u.id)}
                          disabled={deleting === u.id}
                        >
                          {deleting === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Permission Dialog */}
        <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
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
                        <TableHead className="text-center w-20">{bn ? 'দেখা' : 'View'}</TableHead>
                        <TableHead className="text-center w-20">{bn ? 'যোগ' : 'Add'}</TableHead>
                        <TableHead className="text-center w-20">{bn ? 'সম্পাদনা' : 'Edit'}</TableHead>
                        <TableHead className="text-center w-20">{bn ? 'মুছুন' : 'Delete'}</TableHead>
                        <TableHead className="text-center w-20">{bn ? 'সব' : 'All'}</TableHead>
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
      </div>
    </AdminLayout>
  );
};

export default AdminUserManagement;
