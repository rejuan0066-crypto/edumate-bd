import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { isAdminRole } from '@/lib/roles';
import { useConfirm } from '@/contexts/ConfirmContext';
import { printCombinedIssuanceReceipt } from '@/lib/libraryIssuancePrint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import SearchableSelect from '@/components/SearchableSelect';
import { toast } from 'sonner';
import { Plus, Loader2, Search, Undo2, AlertTriangle, Printer, User, Pencil, Trash2, CalendarIcon, X, BookOpen, IdCard } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type MemberType = 'student' | 'teacher' | 'staff' | 'other';

const typeLabel = (t: string, bn: boolean) =>
  t === 'student' ? (bn ? 'ছাত্র' : 'Student')
  : t === 'teacher' ? (bn ? 'শিক্ষক' : 'Teacher')
  : t === 'staff' ? (bn ? 'স্টাফ' : 'Staff')
  : (bn ? 'অন্যান্য' : 'Other');

const emptyForm = {
  member_type: 'student' as MemberType,
  name: '',
  member_code: '',
  class_name: '',
  roll_number: '',
  phone: '',
  address: '',
  notes: '',
};

type CartItem = { uid: string; bookId: string | null; title: string; condition: string; distributionType: string; sellingPrice: number; custom: boolean };

const LibraryProfiles = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const { user, role } = useAuth();
  const { settings } = useWebsiteSettings();
  const confirm = useConfirm();
  const canManage = isAdminRole(role);

  const institutionInfo = useMemo(() => ({
    name: settings.institution_name,
    nameEn: settings.institution_name_en,
    address: settings.address,
    phone: settings.phone,
    logoUrl: settings.logo_url,
  }), [settings]);

  // List state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Create/Edit profile dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  // Profile detail dialog
  const [activeProfile, setActiveProfile] = useState<any>(null);

  // Issue dialog state
  const [issueOpen, setIssueOpen] = useState(false);
  const [issuedDate, setIssuedDate] = useState<Date>(new Date());
  const [distributorName, setDistributorName] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [bookId, setBookId] = useState('');
  const [bookName, setBookName] = useState('');
  const [bookCondition, setBookCondition] = useState('new');
  const [distributionType, setDistributionType] = useState('free');
  const [sellingPrice, setSellingPrice] = useState(0);

  // Loss dialog
  const [lossOpen, setLossOpen] = useState(false);
  const [lossTarget, setLossTarget] = useState<any>(null);
  const [fineAmount, setFineAmount] = useState(0);

  // ===== Queries =====
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['library-profiles', search, typeFilter],
    queryFn: async () => {
      let q = supabase.from('library_profiles').select('*').is('deleted_at', null);
      if (typeFilter !== 'all') q = q.eq('member_type', typeFilter);
      if (search.trim().length >= 1) {
        const s = search.trim();
        q = q.or(`name.ilike.%${s}%,member_code.ilike.%${s}%,roll_number.ilike.%${s}%,phone.ilike.%${s}%`);
      }
      const { data } = await q.order('created_at', { ascending: false }).limit(200);
      return data || [];
    },
  });

  const { data: books = [] } = useQuery({
    queryKey: ['library-books-available'],
    queryFn: async () => {
      const { data } = await supabase.from('library_books').select('id, title, title_bn, buying_price, available_copies').eq('is_active', true).gt('available_copies', 0).order('title_bn');
      return data || [];
    },
  });

  const { data: ledger = [], isLoading: ledgerLoading } = useQuery({
    queryKey: ['profile-ledger', activeProfile?.id],
    queryFn: async () => {
      if (!activeProfile?.id) return [];
      const { data } = await supabase
        .from('library_issuances')
        .select('*, library_books(title, title_bn)')
        .eq('profile_id', activeProfile.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!activeProfile?.id,
  });

  // ===== Profile create/edit/delete =====
  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('name');
      const payload: any = {
        member_type: form.member_type,
        name: form.name.trim(),
        member_code: form.member_code.trim() || null,
        class_name: form.class_name.trim() || null,
        roll_number: form.roll_number.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editingId) {
        const { error } = await supabase.from('library_profiles').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        payload.created_by = user?.id || null;
        const { error } = await supabase.from('library_profiles').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-profiles'] });
      toast.success(editingId ? (bn ? 'প্রোফাইল আপডেট হয়েছে' : 'Profile updated') : (bn ? 'প্রোফাইল তৈরি হয়েছে' : 'Profile created'));
      setFormOpen(false); setEditingId(null); setForm({ ...emptyForm });
    },
    onError: (e: any) => toast.error(e?.message === 'name' ? (bn ? 'নাম দিন' : 'Name required') : (bn ? 'সমস্যা হয়েছে' : 'Error')),
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('library_profiles').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-profiles'] });
      toast.success(bn ? 'প্রোফাইল মুছে ফেলা হয়েছে' : 'Profile deleted');
    },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error'),
  });

  // ===== Issue books to active profile =====
  const issueMut = useMutation({
    mutationFn: async () => {
      if (!activeProfile || cart.length === 0) throw new Error('missing');
      const issuedDateStr = format(issuedDate, 'yyyy-MM-dd');
      const distName = distributorName.trim() || null;
      for (const item of cart) {
        const selectedBook = item.bookId ? books.find((b: any) => b.id === item.bookId) : null;
        const payload: any = {
          profile_id: activeProfile.id,
          book_id: item.bookId,
          custom_book_title: item.custom ? item.title : null,
          recipient_type: activeProfile.member_type,
          recipient_name: activeProfile.name,
          distribution_type: item.distributionType,
          selling_price: item.distributionType === 'sale' ? Number(item.sellingPrice) : 0,
          book_condition: item.condition,
          issued_date: issuedDateStr,
          issued_by: user?.id,
          status: 'issued',
          distributor_name: distName,
          notes: issueNotes || null,
        };
        if (activeProfile.student_id) payload.student_id = activeProfile.student_id;
        if (activeProfile.staff_id) payload.staff_id = activeProfile.staff_id;
        const { error } = await supabase.from('library_issuances').insert(payload);
        if (error) throw error;
        if (item.bookId) {
          await supabase.from('library_books').update({ available_copies: (selectedBook?.available_copies || 1) - 1 }).eq('id', item.bookId);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile-ledger'] });
      qc.invalidateQueries({ queryKey: ['library-issuances'] });
      qc.invalidateQueries({ queryKey: ['library-books-available'] });
      qc.invalidateQueries({ queryKey: ['library-books'] });
      qc.invalidateQueries({ queryKey: ['library-books-all'] });
      toast.success(bn ? `${cart.length} টি বই ইস্যু হয়েছে` : `${cart.length} book(s) issued`);
      // Print combined receipt
      const issuedStr = format(issuedDate, 'dd/MM/yyyy');
      printCombinedIssuanceReceipt({
        recipientName: activeProfile.name,
        recipientType: activeProfile.member_type,
        recipientId: activeProfile.member_code || '',
        rollNumber: activeProfile.roll_number || '',
        className: activeProfile.class_name || '',
        items: cart.map(item => ({
          bookTitle: item.title,
          bookCondition: item.condition,
          distributionType: item.distributionType,
          sellingPrice: Number(item.sellingPrice),
          distributorName: distributorName.trim(),
          issuedDate: issuedStr,
        })),
      }, institutionInfo);
      resetIssueForm();
    },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error'),
  });

  const returnMut = useMutation({
    mutationFn: async (iss: any) => {
      await supabase.from('library_issuances').update({ status: 'returned', returned_date: format(new Date(), 'yyyy-MM-dd') }).eq('id', iss.id);
      if (iss.book_id) {
        const { data: book } = await supabase.from('library_books').select('available_copies').eq('id', iss.book_id).single();
        await supabase.from('library_books').update({ available_copies: (book?.available_copies || 0) + 1, condition: 'old' }).eq('id', iss.book_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile-ledger'] });
      qc.invalidateQueries({ queryKey: ['library-issuances'] });
      qc.invalidateQueries({ queryKey: ['library-books-available'] });
      toast.success(bn ? 'বই ফেরত নেওয়া হয়েছে' : 'Book returned');
    },
  });

  const markLostMut = useMutation({
    mutationFn: async () => {
      if (!lossTarget) return;
      await supabase.from('library_issuances').update({ status: 'lost' }).eq('id', lossTarget.id);
      if (lossTarget.book_id) {
        const { data: book } = await supabase.from('library_books').select('lost_copies').eq('id', lossTarget.book_id).single();
        await supabase.from('library_books').update({ lost_copies: (book?.lost_copies || 0) + 1 }).eq('id', lossTarget.book_id);
      }
      if (fineAmount > 0) {
        await supabase.from('library_fines').insert({ issuance_id: lossTarget.id, book_id: lossTarget.book_id, fine_type: 'lost', fine_amount: fineAmount });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile-ledger'] });
      qc.invalidateQueries({ queryKey: ['library-issuances'] });
      toast.success(bn ? 'হারানো হিসেবে চিহ্নিত' : 'Marked as lost');
      setLossOpen(false); setLossTarget(null); setFineAmount(0);
    },
  });

  // ===== Helpers =====
  const resetIssueForm = () => {
    setIssueOpen(false); setCart([]); setBookId(''); setBookName('');
    setBookCondition('new'); setDistributionType('free'); setSellingPrice(0);
    setIssuedDate(new Date()); setIssueNotes('');
  };

  const addToCart = () => {
    const trimmedName = bookName.trim();
    if (!bookId && !trimmedName) return;
    let title = trimmedName;
    let custom = true;
    if (bookId) {
      if (cart.some(c => c.bookId === bookId)) { toast.error(bn ? 'এই বইটি ইতিমধ্যে যুক্ত' : 'Already added'); return; }
      const b = books.find((bk: any) => bk.id === bookId);
      if (!b) return;
      title = bn ? (b.title_bn || b.title) : b.title;
      custom = false;
    }
    setCart(prev => [...prev, {
      uid: (crypto as any)?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      bookId: bookId || null, title, condition: bookCondition, distributionType,
      sellingPrice: distributionType === 'sale' ? Number(sellingPrice) : 0, custom,
    }]);
    setBookId(''); setBookName(''); setBookCondition('new'); setDistributionType('free'); setSellingPrice(0);
  };

  const openCreate = () => { setEditingId(null); setForm({ ...emptyForm }); setFormOpen(true); };
  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      member_type: p.member_type, name: p.name || '', member_code: p.member_code || '',
      class_name: p.class_name || '', roll_number: p.roll_number || '', phone: p.phone || '',
      address: p.address || '', notes: p.notes || '',
    });
    setFormOpen(true);
  };

  const handleDelete = async (p: any) => {
    const ok = await confirm({
      title: bn ? 'প্রোফাইল মুছবেন?' : 'Delete profile?',
      description: bn ? `"${p.name}" এর প্রোফাইল মুছে ফেলা হবে।` : `Profile of "${p.name}" will be deleted.`,
      variant: 'destructive',
      confirmText: bn ? 'মুছুন' : 'Delete',
    });
    if (ok) deleteProfile.mutate(p.id);
  };

  const printSingle = (i: any) => {
    printCombinedIssuanceReceipt({
      recipientName: activeProfile.name,
      recipientType: activeProfile.member_type,
      recipientId: activeProfile.member_code || '',
      rollNumber: activeProfile.roll_number || '',
      className: activeProfile.class_name || '',
      items: [{
        bookTitle: i.custom_book_title || (bn ? (i.library_books?.title_bn || i.library_books?.title || '') : (i.library_books?.title || '')),
        bookCondition: i.book_condition,
        distributionType: i.distribution_type,
        sellingPrice: i.selling_price || 0,
        distributorName: i.distributor_name || '',
        issuedDate: i.issued_date ? format(new Date(i.issued_date), 'dd/MM/yyyy') : '',
      }],
    }, institutionInfo);
  };

  const stats = useMemo(() => ({
    total: ledger.length,
    held: ledger.filter((i: any) => i.status === 'issued').length,
    returned: ledger.filter((i: any) => i.status === 'returned').length,
    lost: ledger.filter((i: any) => i.status === 'lost').length,
  }), [ledger]);

  const statusBadge = (s: string) =>
    s === 'issued' ? <Badge className="bg-blue-500/15 text-blue-600 hover:bg-blue-500/15">{bn ? 'ইস্যু' : 'Issued'}</Badge>
    : s === 'returned' ? <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">{bn ? 'ফেরত' : 'Returned'}</Badge>
    : <Badge variant="destructive">{bn ? 'হারানো' : 'Lost'}</Badge>;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder={bn ? 'নাম/আইডি/রোল/ফোন...' : 'Name/ID/Roll/Phone...'} />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bn ? 'সব ধরন' : 'All types'}</SelectItem>
              <SelectItem value="student">{bn ? 'ছাত্র' : 'Student'}</SelectItem>
              <SelectItem value="teacher">{bn ? 'শিক্ষক' : 'Teacher'}</SelectItem>
              <SelectItem value="staff">{bn ? 'স্টাফ' : 'Staff'}</SelectItem>
              <SelectItem value="other">{bn ? 'অন্যান্য' : 'Other'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} className="btn-primary-gradient">
          <Plus className="w-4 h-4 mr-1.5" />{bn ? 'নতুন প্রোফাইল' : 'New Profile'}
        </Button>
      </div>

      {/* Profiles grid */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>{bn ? 'কোনো প্রোফাইল নেই। নতুন প্রোফাইল তৈরি করুন।' : 'No profiles yet. Create one to get started.'}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p: any) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-[3px] hover:shadow-lg">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground flex flex-wrap gap-x-2 mt-0.5">
                    <Badge variant="secondary">{typeLabel(p.member_type, bn)}</Badge>
                    {p.member_code && <span className="inline-flex items-center gap-1"><IdCard className="w-3 h-3" />{p.member_code}</span>}
                    {p.roll_number && <span>{bn ? 'রোল' : 'Roll'}: {p.roll_number}</span>}
                    {p.class_name && <span>{p.class_name}</span>}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5 mt-3">
                <Button size="sm" className="flex-1 btn-primary-gradient" onClick={() => setActiveProfile(p)}>
                  <BookOpen className="w-3.5 h-3.5 mr-1" />{bn ? 'খুলুন' : 'Open'}
                </Button>
                {canManage && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)} title={bn ? 'এডিট' : 'Edit'}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete(p)} title={bn ? 'মুছুন' : 'Delete'}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Profile Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {editingId ? (bn ? 'প্রোফাইল সম্পাদনা' : 'Edit Profile') : (bn ? 'নতুন প্রোফাইল' : 'New Profile')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{bn ? 'ধরন' : 'Type'}</Label>
                <Select value={form.member_type} onValueChange={(v: MemberType) => setForm(f => ({ ...f, member_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">{bn ? 'ছাত্র' : 'Student'}</SelectItem>
                    <SelectItem value="teacher">{bn ? 'শিক্ষক' : 'Teacher'}</SelectItem>
                    <SelectItem value="staff">{bn ? 'স্টাফ' : 'Staff'}</SelectItem>
                    <SelectItem value="other">{bn ? 'অন্যান্য' : 'Other'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{bn ? 'আইডি / কোড' : 'ID / Code'}</Label>
                <Input value={form.member_code} onChange={e => setForm(f => ({ ...f, member_code: e.target.value }))} placeholder={bn ? 'ঐচ্ছিক' : 'Optional'} />
              </div>
            </div>
            <div>
              <Label>{bn ? 'নাম' : 'Name'} *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={bn ? 'পূর্ণ নাম' : 'Full name'} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{bn ? 'শ্রেণি' : 'Class'}</Label>
                <Input value={form.class_name} onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))} placeholder={bn ? 'ঐচ্ছিক' : 'Optional'} />
              </div>
              <div>
                <Label>{bn ? 'রোল' : 'Roll'}</Label>
                <Input value={form.roll_number} onChange={e => setForm(f => ({ ...f, roll_number: e.target.value }))} placeholder={bn ? 'ঐচ্ছিক' : 'Optional'} />
              </div>
            </div>
            <div>
              <Label>{bn ? 'ফোন' : 'Phone'}</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder={bn ? 'ঐচ্ছিক' : 'Optional'} />
            </div>
            <div>
              <Label>{bn ? 'ঠিকানা' : 'Address'}</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder={bn ? 'ঐচ্ছিক' : 'Optional'} />
            </div>
            <div>
              <Label>{bn ? 'নোট' : 'Notes'}</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setFormOpen(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
              <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending} className="btn-primary-gradient">
                {saveProfile.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {bn ? 'সংরক্ষণ' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Detail Dialog */}
      <Dialog open={!!activeProfile} onOpenChange={(o) => { if (!o) setActiveProfile(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {activeProfile && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  {bn ? 'প্রোফাইল ও বই লেজার' : 'Profile & Book Ledger'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Profile card */}
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{activeProfile.name}</p>
                    <p className="text-xs text-muted-foreground flex flex-wrap gap-x-2 mt-0.5">
                      <Badge variant="secondary">{typeLabel(activeProfile.member_type, bn)}</Badge>
                      {activeProfile.member_code && <span>{activeProfile.member_code}</span>}
                      {activeProfile.roll_number && <span>{bn ? 'রোল' : 'Roll'}: {activeProfile.roll_number}</span>}
                      {activeProfile.class_name && <span>{activeProfile.class_name}</span>}
                      {activeProfile.phone && <span>📞 {activeProfile.phone}</span>}
                    </p>
                  </div>
                  <Button onClick={() => { resetIssueForm(); setDistributorName(''); setIssueOpen(true); }} className="btn-primary-gradient shrink-0">
                    <Plus className="w-4 h-4 mr-1.5" />{bn ? 'বই ইস্যু করুন' : 'Issue Book'}
                  </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-xl border border-border p-3 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">{bn ? 'মোট' : 'Total'}</p></div>
                  <div className="rounded-xl border border-border p-3 text-center"><p className="text-2xl font-bold text-blue-600">{stats.held}</p><p className="text-xs text-muted-foreground">{bn ? 'কাছে আছে' : 'Held'}</p></div>
                  <div className="rounded-xl border border-border p-3 text-center"><p className="text-2xl font-bold text-emerald-600">{stats.returned}</p><p className="text-xs text-muted-foreground">{bn ? 'ফেরত' : 'Returned'}</p></div>
                  <div className="rounded-xl border border-border p-3 text-center"><p className="text-2xl font-bold text-destructive">{stats.lost}</p><p className="text-xs text-muted-foreground">{bn ? 'হারানো' : 'Lost'}</p></div>
                </div>

                {/* Ledger */}
                <div className="rounded-2xl border border-border overflow-hidden">
                  <div className="px-3 py-2 bg-muted/50 text-sm font-semibold">{bn ? 'বই গ্রহণের তালিকা' : 'Book Records'}</div>
                  {ledgerLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                  ) : ledger.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">{bn ? 'কোনো বই রেকর্ড নেই' : 'No book records'}</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{bn ? 'বই' : 'Book'}</TableHead>
                            <TableHead className="text-center">{bn ? 'অবস্থা' : 'Cond.'}</TableHead>
                            <TableHead className="text-center">{bn ? 'বিতরণ' : 'Type'}</TableHead>
                            <TableHead className="text-right">{bn ? 'মূল্য' : 'Price'}</TableHead>
                            <TableHead>{bn ? 'ইস্যু' : 'Issued'}</TableHead>
                            <TableHead>{bn ? 'ফেরত' : 'Returned'}</TableHead>
                            <TableHead className="text-center">{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                            <TableHead className="text-center">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ledger.map((i: any) => (
                            <TableRow key={i.id}>
                              <TableCell className="font-medium">{i.custom_book_title || (bn ? (i.library_books?.title_bn || i.library_books?.title) : i.library_books?.title)}</TableCell>
                              <TableCell className="text-center">{i.book_condition === 'new' ? (bn ? 'নতুন' : 'New') : (bn ? 'পুরাতন' : 'Old')}</TableCell>
                              <TableCell className="text-center">{i.distribution_type === 'sale' ? (bn ? 'ক্রয়' : 'Sale') : (bn ? 'ফ্রি' : 'Free')}</TableCell>
                              <TableCell className="text-right">{i.distribution_type === 'sale' && i.selling_price > 0 ? `৳${i.selling_price}` : '—'}</TableCell>
                              <TableCell>{i.issued_date ? format(new Date(i.issued_date), 'dd/MM/yyyy') : '—'}</TableCell>
                              <TableCell>{i.returned_date ? format(new Date(i.returned_date), 'dd/MM/yyyy') : '—'}</TableCell>
                              <TableCell className="text-center">{statusBadge(i.status)}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center gap-1">
                                  <Button size="sm" variant="outline" onClick={() => printSingle(i)} title={bn ? 'প্রিন্ট' : 'Print'}><Printer className="w-3.5 h-3.5" /></Button>
                                  {i.status === 'issued' && (
                                    <>
                                      <Button size="sm" variant="outline" onClick={() => returnMut.mutate(i)} disabled={returnMut.isPending} title={bn ? 'জমা নিন' : 'Return'}><Undo2 className="w-3.5 h-3.5" /></Button>
                                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setLossTarget(i); setFineAmount(0); setLossOpen(true); }} title={bn ? 'হারানো' : 'Lost'}><AlertTriangle className="w-3.5 h-3.5" /></Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Issue Books Dialog */}
      <Dialog open={issueOpen} onOpenChange={(o) => { if (!o) resetIssueForm(); else setIssueOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {bn ? 'বই ইস্যু' : 'Issue Books'} — {activeProfile?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{bn ? 'ইস্যুর তারিখ' : 'Issue Date'}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start font-normal', !issuedDate && 'text-muted-foreground')}>
                      <CalendarIcon className="w-4 h-4 mr-2" />{format(issuedDate, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={issuedDate} onSelect={d => d && setIssuedDate(d)} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>{bn ? 'কার মাধ্যমে (বিতরণকারী)' : 'Issued By (Distributor)'}</Label>
                <Input value={distributorName} onChange={e => setDistributorName(e.target.value)} placeholder={bn ? 'নাম লিখুন' : 'Name'} />
              </div>
            </div>

            {/* Add book row */}
            <div className="rounded-xl border border-border p-3 space-y-3">
              <p className="text-sm font-semibold">{bn ? 'বই যোগ করুন' : 'Add a Book'}</p>
              <div>
                <Label className="text-xs">{bn ? 'ক্যাটালগ থেকে বই' : 'Book from catalog'}</Label>
                <SearchableSelect
                  value={bookId}
                  onValueChange={(v) => { setBookId(v); setBookName(''); }}
                  options={books.map((b: any) => ({ value: b.id, label: `${bn ? (b.title_bn || b.title) : b.title} (${b.available_copies})` }))}
                  placeholder={bn ? 'বই খুঁজুন...' : 'Search book...'}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="flex-1 border-t" />{bn ? 'অথবা' : 'OR'}<span className="flex-1 border-t" /></div>
              <div>
                <Label className="text-xs">{bn ? 'বইয়ের নাম লিখুন' : 'Type book name'}</Label>
                <Input value={bookName} onChange={e => { setBookName(e.target.value); if (e.target.value) setBookId(''); }} placeholder={bn ? 'ক্যাটালগে না থাকলে...' : 'If not in catalog...'} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">{bn ? 'অবস্থা' : 'Condition'}</Label>
                  <Select value={bookCondition} onValueChange={setBookCondition}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">{bn ? 'নতুন' : 'New'}</SelectItem>
                      <SelectItem value="old">{bn ? 'পুরাতন' : 'Old'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'বিতরণ' : 'Type'}</Label>
                  <Select value={distributionType} onValueChange={setDistributionType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">{bn ? 'ফ্রি' : 'Free'}</SelectItem>
                      <SelectItem value="sale">{bn ? 'ক্রয়' : 'Sale'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {distributionType === 'sale' && (
                  <div>
                    <Label className="text-xs">{bn ? 'ক্রয়মূল্য' : 'Price'}</Label>
                    <Input type="number" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} />
                  </div>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={addToCart} disabled={!bookId && !bookName.trim()}>
                <Plus className="w-4 h-4 mr-1" />{bn ? 'তালিকায় যোগ' : 'Add to list'}
              </Button>
            </div>

            {/* Cart */}
            {cart.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{bn ? 'বই' : 'Book'}</TableHead>
                      <TableHead className="text-center">{bn ? 'অবস্থা' : 'Cond.'}</TableHead>
                      <TableHead className="text-center">{bn ? 'বিতরণ' : 'Type'}</TableHead>
                      <TableHead className="text-right">{bn ? 'মূল্য' : 'Price'}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map(c => (
                      <TableRow key={c.uid}>
                        <TableCell className="font-medium">{c.title}</TableCell>
                        <TableCell className="text-center">{c.condition === 'new' ? (bn ? 'নতুন' : 'New') : (bn ? 'পুরাতন' : 'Old')}</TableCell>
                        <TableCell className="text-center">{c.distributionType === 'sale' ? (bn ? 'ক্রয়' : 'Sale') : (bn ? 'ফ্রি' : 'Free')}</TableCell>
                        <TableCell className="text-right">{c.distributionType === 'sale' ? `৳${c.sellingPrice}` : '—'}</TableCell>
                        <TableCell className="text-right"><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setCart(prev => prev.filter(x => x.uid !== c.uid))}><X className="w-4 h-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div>
              <Label>{bn ? 'নোট' : 'Notes'}</Label>
              <Textarea value={issueNotes} onChange={e => setIssueNotes(e.target.value)} rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={resetIssueForm}>{bn ? 'বাতিল' : 'Cancel'}</Button>
              <Button onClick={() => issueMut.mutate()} disabled={cart.length === 0 || issueMut.isPending} className="btn-primary-gradient">
                {issueMut.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {bn ? `ইস্যু করুন (${cart.length})` : `Issue (${cart.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loss Dialog */}
      <Dialog open={lossOpen} onOpenChange={setLossOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" />{bn ? 'বই হারানো' : 'Mark as Lost'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>{bn ? 'জরিমানা (ঐচ্ছিক)' : 'Fine (optional)'}</Label>
              <Input type="number" value={fineAmount} onChange={e => setFineAmount(Number(e.target.value))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLossOpen(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
              <Button variant="destructive" onClick={() => markLostMut.mutate()} disabled={markLostMut.isPending}>
                {markLostMut.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {bn ? 'নিশ্চিত করুন' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LibraryProfiles;
