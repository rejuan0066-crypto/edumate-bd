import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Trash2, Loader2, Pencil, UserPlus, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

const AdminStaff = () => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { checkApproval } = useApprovalCheck('/admin/staff', 'staff');
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/staff');
  const bn = language === 'bn';
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Account creation dialog state
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [accEmail, setAccEmail] = useState('');
  const [accPassword, setAccPassword] = useState('');
  const [accRole, setAccRole] = useState('none');
  const [accCreating, setAccCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
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
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(bn ? 'কর্মী মুছে ফেলা হয়েছে' : 'Staff deleted');
    },
    onError: () => toast.error('Error'),
  });

  const filtered = staffList.filter((s: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name_bn?.toLowerCase().includes(q) || s.name_en?.toLowerCase().includes(q) || s.designation?.toLowerCase().includes(q);
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{t('staff')}</h1>
            <p className="text-sm text-muted-foreground">{bn ? `মোট ${staffList.length} জন কর্মী/শিক্ষক` : `Total ${staffList.length} staff`}</p>
          </div>
          {canAddItem && (
            <Button onClick={() => navigate('/admin/staff/add')} className="btn-primary-gradient flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t('addNew')}
            </Button>
          )}
        </div>

        <div className="card-elevated p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder={bn ? 'নাম বা পদবী দিয়ে খুঁজুন...' : 'Search by name or designation...'} className="pl-10 bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'পদবী' : 'Designation'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'বিভাগ' : 'Department'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'মোবাইল' : 'Mobile'}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{bn ? 'অ্যাকাউন্ট' : 'Account'}</th>
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
                            <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent-foreground font-bold text-sm">{s.name_bn?.[0] || '?'}</div>
                          )}
                          <div>
                            <span className="font-medium text-foreground text-sm block">{s.name_bn}</span>
                            {s.name_en && <span className="text-xs text-muted-foreground">{s.name_en}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.designation || '-'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.department || '-'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.phone || '-'}</td>
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
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.status === 'active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {s.status === 'active' ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                        {canEditItem && (
                          <button onClick={() => navigate(`/admin/staff/edit/${s.id}`)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary" title={bn ? 'সম্পাদনা' : 'Edit'}><Pencil className="w-4 h-4" /></button>
                        )}
                        {canDeleteItem && (
                          <button onClick={() => setDeleteId(s.id)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive" title={bn ? 'মুছুন' : 'Delete'}><Trash2 className="w-4 h-4" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">{bn ? 'কোনো কর্মী পাওয়া যায়নি' : 'No staff found'}</td></tr>
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

        {/* Create Account Dialog */}
        <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                {bn ? 'লগইন অ্যাকাউন্ট তৈরি করুন' : 'Create Login Account'}
              </DialogTitle>
            </DialogHeader>
            {selectedStaff && (
              <div className="space-y-4 pt-2">
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-sm font-medium text-foreground">{selectedStaff.name_bn}</p>
                  {selectedStaff.name_en && <p className="text-xs text-muted-foreground">{selectedStaff.name_en}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{selectedStaff.designation || ''} {selectedStaff.department ? `• ${selectedStaff.department}` : ''}</p>
                </div>
                <div>
                  <Label>{bn ? 'ইমেইল' : 'Email'} *</Label>
                  <Input className="mt-1" type="email" value={accEmail} onChange={e => setAccEmail(e.target.value)} placeholder={bn ? 'ইমেইল অ্যাড্রেস' : 'Email address'} />
                </div>
                <div>
                  <Label>{bn ? 'পাসওয়ার্ড' : 'Password'} *</Label>
                  <div className="relative mt-1">
                    <Input className="pr-10" type={showPassword ? 'text' : 'password'} value={accPassword} onChange={e => setAccPassword(e.target.value)} placeholder={bn ? 'কমপক্ষে ৬ অক্ষর' : 'Min 6 characters'} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>{bn ? 'রোল' : 'Role'} *</Label>
                  <Select value={accRole} onValueChange={setAccRole}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{bn ? '🚫 রোল ছাড়া (ঐচ্ছিক)' : '🚫 No Role (Optional)'}</SelectItem>
                      <SelectItem value="teacher">{bn ? 'শিক্ষক' : 'Teacher'}</SelectItem>
                      <SelectItem value="staff">{bn ? 'স্টাফ' : 'Staff'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateAccount} disabled={accCreating} className="w-full btn-primary-gradient">
                  {accCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  {bn ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminStaff;
