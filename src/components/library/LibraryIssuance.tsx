import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { isAdminRole } from '@/lib/roles';
import { printIssuanceReceipt, printYearlyIssuanceList, downloadIssuanceReceipt, downloadYearlyIssuanceList } from '@/lib/libraryIssuancePrint';
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
import { Separator } from '@/components/ui/separator';
import SearchableSelect from '@/components/SearchableSelect';
import { toast } from 'sonner';
import { Plus, Loader2, Search, ArrowRightLeft, Undo2, AlertTriangle, Printer, FileText, Download, User, BookOpen, CalendarIcon, Trash2, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const LibraryIssuance = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const { user, role } = useAuth();
  const { settings } = useWebsiteSettings();

  const [open, setOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnSearch, setReturnSearch] = useState('');
  const [lossOpen, setLossOpen] = useState(false);
  const [lossTarget, setLossTarget] = useState<any>(null);
  const [fineAmount, setFineAmount] = useState(0);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  const institutionInfo = useMemo(() => ({
    name: settings.institution_name,
    nameEn: settings.institution_name_en,
    address: settings.address,
    phone: settings.phone,
    logoUrl: settings.logo_url,
  }), [settings]);

  // Issue form state
  const [step, setStep] = useState<1 | 2>(1);
  const [recipientType, setRecipientType] = useState('student');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [issuedDate, setIssuedDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [distributorName, setDistributorName] = useState('');

  // "Add a book" working row (added into the cart)
  const [bookId, setBookId] = useState('');
  const [bookName, setBookName] = useState(''); // free-text title when not in catalog
  const [distributionType, setDistributionType] = useState('free');
  const [sellingPrice, setSellingPrice] = useState(0);
  const [bookCondition, setBookCondition] = useState('new');

  // Selected books cart for this issuance
  type CartItem = { uid: string; bookId: string | null; title: string; condition: string; distributionType: string; sellingPrice: number; custom: boolean };
  const [cart, setCart] = useState<CartItem[]>([]);

  const getRoleLabel = (roleName?: string | null) => {
    switch (roleName) {
      case 'teacher':
        return bn ? 'শিক্ষক' : 'Teacher';
      case 'staff':
        return bn ? 'স্টাফ' : 'Staff';
      case 'admin':
      case 'super_admin':
        return bn ? 'অ্যাডমিন' : 'Admin';
      default:
        return bn ? 'ইউজার' : 'User';
    }
  };

  const getDistributorDisplayName = (entry: any) => {
    return entry.name_bn || entry.name_en || entry.full_name || entry.email || '';
  };

  // Auto-fill distributor name from logged-in user's staff/profile record
  const { data: currentStaff } = useQuery({
    queryKey: ['current-staff-name', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('staff').select('name_bn, name_en').eq('user_id', user.id).maybeSingle();
      if (data) return data;
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      return profile ? { name_bn: profile.full_name, name_en: profile.full_name } : null;
    },
    enabled: !!user?.id,
  });

  const { data: distributorResults = [] } = useQuery({
    queryKey: ['library-distributors'],
    queryFn: async () => {
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, user_id, name_bn, name_en, staff_id, designation, email')
        .order('name_bn')
        .limit(200);

      const staffRows = (staffData || []).map((entry: any) => ({ ...entry, source: 'staff' as const }));
      const staffUserIds = new Set(staffRows.filter((s: any) => s.user_id).map((s: any) => s.user_id));

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, status');

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const roleMap: Record<string, string> = {};
      (rolesData || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });

      const entries: any[] = [];

      // Add all staff
      staffRows.forEach((entry: any) => {
        entries.push(entry);
      });

      // Add profiles not already in staff
      (profilesData || []).forEach((p: any) => {
        if (!staffUserIds.has(p.id) && p.full_name && p.status === 'approved') {
          entries.push({
            id: p.id,
            user_id: p.id,
            full_name: p.full_name,
            role: roleMap[p.id] || 'none',
            source: 'user' as const,
          });
        }
      });

      return entries.sort((a, b) => {
        const nameA = a.name_bn || a.full_name || '';
        const nameB = b.name_bn || b.full_name || '';
        return nameA.localeCompare(nameB, 'bn');
      });
    },
    enabled: open,
  });

  const { data: books = [] } = useQuery({
    queryKey: ['library-books-available'],
    queryFn: async () => {
      const { data } = await supabase.from('library_books').select('id, title, title_bn, buying_price, available_copies, purchase_date').eq('is_active', true).gt('available_copies', 0).order('title_bn');
      return data || [];
    },
  });

  const { data: issuances = [], isLoading } = useQuery({
    queryKey: ['library-issuances'],
    queryFn: async () => {
      const { data } = await supabase.from('library_issuances').select('*, library_books(title, title_bn), students(name_bn, name_en, student_id, roll_number), staff(name_bn, name_en)').order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Student search
  const { data: studentResults = [] } = useQuery({
    queryKey: ['student-search', recipientSearch, recipientType],
    queryFn: async () => {
      if (recipientType !== 'student' || recipientSearch.length < 2) return [];
      const { data } = await supabase.from('students').select('id, name_bn, name_en, student_id, roll_number, class_id, classes(name_bn, name)').or(`student_id.ilike.%${recipientSearch}%,name_bn.ilike.%${recipientSearch}%,name_en.ilike.%${recipientSearch}%,roll_number.ilike.%${recipientSearch}%`).limit(10);
      return data || [];
    },
    enabled: recipientType === 'student' && recipientSearch.length >= 2,
  });

  const { data: staffResults = [] } = useQuery({
    queryKey: ['staff-search', recipientSearch, recipientType],
    queryFn: async () => {
      if (!['teacher', 'staff'].includes(recipientType) || recipientSearch.length < 2) return [];
      const { data } = await supabase.from('staff').select('id, name_bn, name_en, staff_id, designation').or(`name_bn.ilike.%${recipientSearch}%,name_en.ilike.%${recipientSearch}%,staff_id.ilike.%${recipientSearch}%`).limit(10);
      return data || [];
    },
    enabled: ['teacher', 'staff'].includes(recipientType) && recipientSearch.length >= 2,
  });

  const issueMut = useMutation({
    mutationFn: async () => {
      if (!selectedRecipient || cart.length === 0) throw new Error('Missing data');
      const issuedDateStr = format(issuedDate, 'yyyy-MM-dd');
      const recipientName = selectedRecipient.name_bn || selectedRecipient.name_en;
      const distName = distributorName || autoDistributorName || null;

      for (const item of cart) {
        const selectedBook = item.bookId ? books.find((b: any) => b.id === item.bookId) : null;
        const payload: any = {
          book_id: item.bookId,
          custom_book_title: item.custom ? item.title : null,
          recipient_type: recipientType,
          distribution_type: item.distributionType,
          selling_price: item.distributionType === 'sale' ? Number(item.sellingPrice) : 0,
          book_condition: item.condition,
          issued_date: issuedDateStr,
          issued_by: user?.id,
          status: 'issued',
          recipient_name: recipientName,
          distributor_name: distName,
          notes: notes || null,
        };
        if (recipientType === 'student') payload.student_id = selectedRecipient.id;
        else payload.staff_id = selectedRecipient.id;

        const { error } = await supabase.from('library_issuances').insert(payload);
        if (error) throw error;

        // Only decrement inventory for catalog books (custom titles have no stock)
        if (item.bookId) {
          await supabase.from('library_books').update({ available_copies: (selectedBook?.available_copies || 1) - 1 }).eq('id', item.bookId);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-issuances'] });
      qc.invalidateQueries({ queryKey: ['library-books-available'] });
      qc.invalidateQueries({ queryKey: ['library-books'] });
      qc.invalidateQueries({ queryKey: ['library-books-all'] });
      toast.success(bn ? `${cart.length} টি বই ইস্যু হয়েছে` : `${cart.length} book(s) issued`);
      const totalSale = cart.filter(c => c.distributionType === 'sale').reduce((s, c) => s + Number(c.sellingPrice || 0), 0);
      if (totalSale > 0 && recipientType === 'student') {
        toast.info(bn ? `৳${totalSale} ছাত্রের লেজারে বকেয়া যোগ হয়েছে` : `৳${totalSale} added as due to student ledger`);
      }

      // Print a receipt for each issued book
      cart.forEach(item => {
        const selectedBook = item.bookId ? books.find((b: any) => b.id === item.bookId) : null;
        printIssuanceReceipt({
          bookTitle: item.custom ? item.title : (bn ? (selectedBook?.title_bn || selectedBook?.title || '') : (selectedBook?.title || '')),
          recipientName: selectedRecipient?.name_bn || selectedRecipient?.name_en || '',
          recipientType,
          distributionType: item.distributionType,
          bookCondition: item.condition,
          sellingPrice: Number(item.sellingPrice),
          distributorName: distributorName || autoDistributorName || '',
          issuedDate: format(issuedDate, 'dd/MM/yyyy'),
          recipientId: selectedRecipient?.student_id || selectedRecipient?.staff_id || '',
        }, institutionInfo);
      });

      resetForm();
    },
    onError: () => toast.error(bn ? 'সমস্যা হয়েছে' : 'Error'),
  });

  const returnMut = useMutation({
    mutationFn: async (iss: any) => {
      await supabase.from('library_issuances').update({ status: 'returned', returned_date: format(new Date(), 'yyyy-MM-dd') }).eq('id', iss.id);
      const { data: book } = await supabase.from('library_books').select('available_copies').eq('id', iss.book_id).single();
      await supabase.from('library_books').update({ 
        available_copies: (book?.available_copies || 0) + 1,
        condition: 'old'
      }).eq('id', iss.book_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-issuances'] });
      qc.invalidateQueries({ queryKey: ['library-books-available'] });
      qc.invalidateQueries({ queryKey: ['library-books'] });
      qc.invalidateQueries({ queryKey: ['library-books-all'] });
      toast.success(bn ? 'বই ফেরত নেওয়া হয়েছে (পুরাতন হিসেবে আপডেট)' : 'Book returned (marked as old)');
    },
  });

  const markLostMut = useMutation({
    mutationFn: async () => {
      if (!lossTarget) return;
      await supabase.from('library_issuances').update({ status: 'lost' }).eq('id', lossTarget.id);
      const { data: book } = await supabase.from('library_books').select('lost_copies').eq('id', lossTarget.book_id).single();
      await supabase.from('library_books').update({ lost_copies: (book?.lost_copies || 0) + 1 }).eq('id', lossTarget.book_id);
      if (fineAmount > 0) {
        await supabase.from('library_fines').insert({ issuance_id: lossTarget.id, book_id: lossTarget.book_id, fine_type: 'lost', fine_amount: fineAmount });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-issuances'] });
      qc.invalidateQueries({ queryKey: ['library-books'] });
      qc.invalidateQueries({ queryKey: ['library-books-all'] });
      toast.success(bn ? 'হারানো হিসেবে চিহ্নিত' : 'Marked as lost');
      setLossOpen(false); setLossTarget(null); setFineAmount(0);
    },
  });

  const autoDistributorName = currentStaff?.name_bn || currentStaff?.name_en || '';

  const distributorOptions = useMemo(() => {
    const options = distributorResults
      .map((entry: any) => {
        const displayName = getDistributorDisplayName(entry);
        if (!displayName) return null;

        const meta: string[] = [];
        if (entry.designation) meta.push(entry.designation);
        if (entry.staff_id) meta.push(entry.staff_id);
        if (!entry.staff_id && entry.email) meta.push(entry.email);
        if (entry.source === 'user') meta.push(getRoleLabel(entry.role));

        return {
          value: displayName,
          label: meta.length > 0 ? `${displayName} — ${meta.join(' • ')}` : displayName,
        };
      })
      .filter((option): option is { value: string; label: string } => Boolean(option))
      .sort((a, b) => a.label.localeCompare(b.label, 'bn'));

    if (autoDistributorName && !options.some(option => option.value === autoDistributorName)) {
      return [{ value: autoDistributorName, label: autoDistributorName }, ...options];
    }

    return options;
  }, [autoDistributorName, distributorResults, bn]);

  const resetForm = () => {
    setOpen(false); setStep(1); setBookId(''); setBookName(''); setRecipientType('student');
    setRecipientSearch(''); setSelectedRecipient(null);
    setDistributionType('free'); setSellingPrice(0); setBookCondition('new');
    setIssuedDate(new Date()); setNotes(''); setCart([]);
    setDistributorName(autoDistributorName);
  };

  const addToCart = () => {
    const trimmedName = bookName.trim();
    // Either pick a catalog book OR type a free-text title
    if (!bookId && !trimmedName) return;

    let title = trimmedName;
    let custom = true;
    if (bookId) {
      if (cart.some(c => c.bookId === bookId)) {
        toast.error(bn ? 'এই বইটি ইতিমধ্যে যুক্ত করা হয়েছে' : 'This book is already added');
        return;
      }
      const b = books.find((bk: any) => bk.id === bookId);
      if (!b) return;
      title = bn ? (b.title_bn || b.title) : b.title;
      custom = false;
    }

    setCart(prev => [...prev, {
      uid: (crypto as any)?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      bookId: bookId || null,
      title,
      condition: bookCondition,
      distributionType,
      sellingPrice: distributionType === 'sale' ? Number(sellingPrice) : 0,
      custom,
    }]);
    setBookId(''); setBookName(''); setBookCondition('new'); setDistributionType('free'); setSellingPrice(0);
  };

  const removeFromCart = (uid: string) => setCart(prev => prev.filter(c => c.uid !== uid));

  const recipientLabel = recipientType === 'student' ? (bn ? 'ছাত্র' : 'Student') : recipientType === 'teacher' ? (bn ? 'শিক্ষক' : 'Teacher') : (bn ? 'স্টাফ' : 'Staff');

  const filteredIss = issuances.filter((i: any) => {
    // Year filter
    if (yearFilter && yearFilter !== 'all') {
      const issYear = i.issued_date ? new Date(i.issued_date).getFullYear().toString() : '';
      if (issYear !== yearFilter) return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return i.recipient_name?.toLowerCase().includes(q) || i.library_books?.title?.toLowerCase().includes(q) || i.library_books?.title_bn?.includes(q);
  });

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    issuances.forEach((i: any) => {
      if (i.issued_date) years.add(new Date(i.issued_date).getFullYear().toString());
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [issuances]);

  const handlePrintSingleIssuance = (i: any) => {
    printIssuanceReceipt({
      bookTitle: bn ? (i.library_books?.title_bn || i.library_books?.title || '') : (i.library_books?.title || ''),
      recipientName: i.recipient_name || '',
      recipientType: i.recipient_type || 'student',
      distributionType: i.distribution_type || 'free',
      bookCondition: i.book_condition || 'new',
      sellingPrice: i.selling_price || 0,
      distributorName: i.distributor_name || '',
      issuedDate: i.issued_date ? format(new Date(i.issued_date), 'dd/MM/yyyy') : '',
      recipientId: i.students?.student_id || '',
    }, institutionInfo);
  };

  const handlePrintYearlyList = () => {
    const yr = yearFilter === 'all' ? new Date().getFullYear() : Number(yearFilter);
    printYearlyIssuanceList(filteredIss, yr, institutionInfo);
  };

  const handleDownloadSingleIssuance = async (i: any) => {
    try {
      await downloadIssuanceReceipt({
        bookTitle: bn ? (i.library_books?.title_bn || i.library_books?.title || '') : (i.library_books?.title || ''),
        recipientName: i.recipient_name || '',
        recipientType: i.recipient_type || 'student',
        distributionType: i.distribution_type || 'free',
        bookCondition: i.book_condition || 'new',
        sellingPrice: i.selling_price || 0,
        distributorName: i.distributor_name || '',
        issuedDate: i.issued_date ? format(new Date(i.issued_date), 'dd/MM/yyyy') : '',
        recipientId: i.students?.student_id || '',
      }, institutionInfo);
      toast.success(bn ? 'ডাউনলোড সম্পন্ন' : 'Download complete');
    } catch { toast.error(bn ? 'ডাউনলোড ব্যর্থ' : 'Download failed'); }
  };

  const handleDownloadYearlyList = async () => {
    const yr = yearFilter === 'all' ? new Date().getFullYear() : Number(yearFilter);
    try {
      await downloadYearlyIssuanceList(filteredIss, yr, institutionInfo);
      toast.success(bn ? 'ডাউনলোড সম্পন্ন' : 'Download complete');
    } catch { toast.error(bn ? 'ডাউনলোড ব্যর্থ' : 'Download failed'); }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'issued': return <Badge className="bg-blue-500/10 text-blue-600">{bn ? 'ইস্যু' : 'Issued'}</Badge>;
      case 'returned': return <Badge className="bg-emerald-500/10 text-emerald-600">{bn ? 'ফেরত' : 'Returned'}</Badge>;
      case 'lost': return <Badge variant="destructive">{bn ? 'হারানো' : 'Lost'}</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const recipients = recipientType === 'student' ? studentResults : staffResults;

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={bn ? 'ইস্যু খুঁজুন...' : 'Search issuances...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder={bn ? 'বছর' : 'Year'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{bn ? 'সকল বছর' : 'All Years'}</SelectItem>
              {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {filteredIss.length > 0 && (
            <>
              <Button variant="outline" onClick={handleDownloadYearlyList} title={bn ? 'বাৎসরিক তালিকা ডাউনলোড' : 'Download yearly list'}>
                <Download className="w-4 h-4 mr-1.5" />{bn ? 'তালিকা ডাউনলোড' : 'Download List'}
              </Button>
              <Button variant="outline" onClick={handlePrintYearlyList} title={bn ? 'বাৎসরিক তালিকা প্রিন্ট' : 'Print yearly list'}>
                <FileText className="w-4 h-4 mr-1.5" />{bn ? 'তালিকা প্রিন্ট' : 'Print List'}
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => { setReturnSearch(''); setReturnOpen(true); }}>
            <Undo2 className="w-4 h-4 mr-1.5" />{bn ? 'বই জমা নিন' : 'Accept Return'}
          </Button>
          <Button onClick={() => { resetForm(); setOpen(true); }} className="btn-primary-gradient">
            <Plus className="w-4 h-4 mr-1.5" />{bn ? 'বই ইস্যু করুন' : 'Issue Book'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filteredIss.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{bn ? 'কোনো ইস্যু রেকর্ড নেই' : 'No issuance records'}</p>
        </div>
      ) : (
        <div className="card-elevated overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{bn ? 'বই' : 'Book'}</TableHead>
                <TableHead>{bn ? 'গ্রহীতা' : 'Recipient'}</TableHead>
                <TableHead>{bn ? 'ধরন' : 'Type'}</TableHead>
                <TableHead className="text-center">{bn ? 'অবস্থা' : 'Condition'}</TableHead>
                <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                <TableHead className="text-center">{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                <TableHead className="text-right">{bn ? 'দাম' : 'Price'}</TableHead>
                <TableHead className="text-center">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIss.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{bn ? (i.library_books?.title_bn || i.library_books?.title) : i.library_books?.title}</TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{i.recipient_name}</span>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {i.recipient_type === 'student' ? (bn ? 'ছাত্র' : 'Student') : i.recipient_type === 'teacher' ? (bn ? 'শিক্ষক' : 'Teacher') : (bn ? 'স্টাফ' : 'Staff')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {i.distribution_type === 'sale'
                      ? <Badge className="bg-amber-500/10 text-amber-600">{bn ? 'বিক্রয়' : 'Sale'}</Badge>
                      : <Badge className="bg-green-500/10 text-green-600">{bn ? 'ফ্রি' : 'Free'}</Badge>}
                  </TableCell>
                  <TableCell className="text-center">{i.book_condition === 'new' ? (bn ? 'নতুন' : 'New') : (bn ? 'পুরাতন' : 'Old')}</TableCell>
                  <TableCell>{format(new Date(i.issued_date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="text-center">{getStatusBadge(i.status)}</TableCell>
                  <TableCell className="text-right">{i.distribution_type === 'sale' ? `৳${i.selling_price}` : '—'}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleDownloadSingleIssuance(i)} title={bn ? 'ডাউনলোড' : 'Download'}>
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handlePrintSingleIssuance(i)} title={bn ? 'প্রিন্ট' : 'Print'}>
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
                      {i.status === 'issued' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => returnMut.mutate(i)} title={bn ? 'ফেরত' : 'Return'}>
                            <Undo2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setLossTarget(i); setFineAmount(0); setLossOpen(true); }} title={bn ? 'হারানো' : 'Lost'}>
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </Button>
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

      {/* Issue Dialog — 2-step wizard */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); else setOpen(o); }}>
        <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {bn ? 'বই ইস্যু করুন' : 'Issue Book'}
            </DialogTitle>
          </DialogHeader>

          {/* Stepper */}
          <div className="flex items-center gap-2 mb-2">
            {[
              { n: 1, label: bn ? 'প্রোফাইল' : 'Profile' },
              { n: 2, label: bn ? 'বই ও তথ্য' : 'Books & Details' },
            ].map((s, idx) => (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  step === s.n ? 'bg-primary text-primary-foreground' : step > s.n ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-background/30 text-xs">
                    {step > s.n ? <Check className="w-3 h-3" /> : s.n}
                  </span>
                  {s.label}
                </div>
                {idx === 0 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>

          {/* STEP 1 — Recipient profile */}
          {step === 1 && (
            <div className="grid gap-4">
              <div>
                <Label className="flex items-center gap-1.5"><User className="w-4 h-4" />{bn ? 'গ্রহীতার ধরন' : 'Recipient Type'}</Label>
                <Select value={recipientType} onValueChange={v => { setRecipientType(v); setSelectedRecipient(null); setRecipientSearch(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">{bn ? 'ছাত্র' : 'Student'}</SelectItem>
                    <SelectItem value="teacher">{bn ? 'শিক্ষক' : 'Teacher'}</SelectItem>
                    <SelectItem value="staff">{bn ? 'স্টাফ' : 'Staff'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{bn ? 'গ্রহীতা খুঁজুন (আইডি/নাম)' : 'Search Recipient (ID/Name)'}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={selectedRecipient ? (selectedRecipient.name_bn || selectedRecipient.name_en) : recipientSearch}
                    onChange={e => { setRecipientSearch(e.target.value); setSelectedRecipient(null); }}
                    placeholder={bn ? 'আইডি বা নাম লিখুন...' : 'Type ID or name...'}
                  />
                </div>
                {!selectedRecipient && recipients.length > 0 && (
                  <div className="border border-border rounded-md mt-1 max-h-44 overflow-y-auto bg-background shadow-lg">
                    {recipients.map((r: any) => (
                      <button key={r.id} onClick={() => setSelectedRecipient(r)}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm border-b border-border/50 last:border-0">
                        <span className="font-medium">{r.name_bn || r.name_en}</span>
                        {r.student_id && <span className="text-muted-foreground ml-2">({r.student_id})</span>}
                        {r.staff_id && <span className="text-muted-foreground ml-2">({r.staff_id})</span>}
                        {r.classes && <span className="text-muted-foreground ml-2">— {bn ? r.classes.name_bn : r.classes.name}</span>}
                        {r.designation && <span className="text-muted-foreground ml-2">— {r.designation}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {!selectedRecipient && recipientSearch.length >= 2 && recipients.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5">{bn ? 'কোনো ফলাফল পাওয়া যায়নি। আইডি বা নামের বানান যাচাই করুন।' : 'No results found. Check the ID or name spelling.'}</p>
                )}
                {!selectedRecipient && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {bn ? 'পরবর্তী ধাপে যেতে তালিকা থেকে একজন গ্রহীতা নির্বাচন করুন।' : 'Select a recipient from the list to continue.'}
                  </p>
                )}
              </div>

              {/* Selected profile card */}
              {selectedRecipient && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{selectedRecipient.name_bn || selectedRecipient.name_en}</p>
                    <p className="text-xs text-muted-foreground">
                      <Badge variant="secondary" className="mr-2">{recipientLabel}</Badge>
                      {selectedRecipient.student_id || selectedRecipient.staff_id || ''}
                      {selectedRecipient.roll_number && <span className="ml-2">{bn ? 'রোল' : 'Roll'}: {selectedRecipient.roll_number}</span>}
                      {selectedRecipient.classes && <span className="ml-2">{bn ? selectedRecipient.classes.name_bn : selectedRecipient.classes.name}</span>}
                      {selectedRecipient.designation && <span className="ml-2">{selectedRecipient.designation}</span>}
                    </p>
                  </div>
                </div>
              )}

              <Button
                onClick={() => {
                  if (selectedRecipient) { setStep(2); return; }
                  if (recipients.length === 1) { setSelectedRecipient(recipients[0]); setStep(2); return; }
                  toast.error(bn ? 'তালিকা থেকে একজন গ্রহীতা নির্বাচন করুন' : 'Please select a recipient from the list');
                }}
                className="btn-primary-gradient"
              >
                {bn ? 'পরবর্তী: বই নির্বাচন' : 'Next: Select Books'}<ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          )}

          {/* STEP 2 — Books & details */}
          {step === 2 && (
            <div className="grid gap-4">
              {/* recipient summary */}
              <div className="rounded-xl bg-muted/50 px-3 py-2 flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-primary" />
                <span className="font-medium">{selectedRecipient?.name_bn || selectedRecipient?.name_en}</span>
                <Badge variant="secondary">{recipientLabel}</Badge>
              </div>

              {/* Add-a-book panel */}
              <div className="rounded-2xl border border-border p-3 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-1.5"><Plus className="w-4 h-4" />{bn ? 'বই যোগ করুন' : 'Add a Book'}</p>
                <div>
                  <Label>{bn ? 'বই সিলেক্ট করুন' : 'Select Book'}</Label>
                  <Select value={bookId} onValueChange={(v) => { setBookId(v); setBookName(''); }}>
                    <SelectTrigger><SelectValue placeholder={bn ? 'বই বাছুন' : 'Choose a book'} /></SelectTrigger>
                    <SelectContent>
                      {books.filter((b: any) => !cart.some(c => c.bookId === b.id)).map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>
                          {bn ? (b.title_bn || b.title) : b.title} ({b.available_copies} {bn ? 'কপি' : 'copies'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Separator className="flex-1" />
                  <span className="text-[11px] text-muted-foreground">{bn ? 'অথবা' : 'OR'}</span>
                  <Separator className="flex-1" />
                </div>
                <div>
                  <Label>{bn ? 'বইয়ের নাম লিখুন (ক্যাটালগে নেই)' : 'Type Book Name (not in catalog)'}</Label>
                  <Input
                    value={bookName}
                    onChange={e => { setBookName(e.target.value); if (e.target.value) setBookId(''); }}
                    placeholder={bn ? 'বইয়ের নাম লিখুন...' : 'Enter book name...'}
                    disabled={!!bookId}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{bn ? 'বইয়ের অবস্থা' : 'Book Condition'}</Label>
                    <Select value={bookCondition} onValueChange={setBookCondition}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">{bn ? 'নতুন' : 'New'}</SelectItem>
                        <SelectItem value="old">{bn ? 'পুরাতন' : 'Old'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{bn ? 'বিতরণ ধরন' : 'Distribution Type'}</Label>
                    <Select value={distributionType} onValueChange={setDistributionType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">{bn ? 'ফ্রি (উপহার/লাইব্রেরি)' : 'Free (Gift/Library)'}</SelectItem>
                        <SelectItem value="sale">{bn ? 'বিক্রয়' : 'Sale'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {distributionType === 'sale' && (
                  <div>
                    <Label>{bn ? 'বিক্রয়মূল্য (৳)' : 'Selling Price (৳)'}</Label>
                    <Input type="number" value={sellingPrice || ''} onChange={e => setSellingPrice(Number(e.target.value))} />
                  </div>
                )}
                <Button type="button" variant="outline" className="w-full" onClick={addToCart} disabled={!bookId && !bookName.trim()}>
                  <Plus className="w-4 h-4 mr-1.5" />{bn ? 'তালিকায় যোগ করুন' : 'Add to List'}
                </Button>
              </div>

              {/* Selected books list */}
              {cart.length > 0 && (
                <div className="rounded-2xl border border-border overflow-hidden">
                  <div className="px-3 py-2 bg-muted/50 text-sm font-semibold flex items-center justify-between">
                    <span>{bn ? 'নির্বাচিত বই' : 'Selected Books'}</span>
                    <Badge variant="secondary">{cart.length}</Badge>
                  </div>
                  <div className="divide-y divide-border">
                    {cart.map(item => (
                      <div key={item.uid} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <div className="flex gap-1.5 mt-0.5">
                            {item.custom && <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600">{bn ? 'ম্যানুয়াল' : 'Manual'}</Badge>}
                            <Badge variant="outline" className="text-[10px]">{item.condition === 'new' ? (bn ? 'নতুন' : 'New') : (bn ? 'পুরাতন' : 'Old')}</Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {item.distributionType === 'sale' ? `${bn ? 'বিক্রয়' : 'Sale'} ৳${item.sellingPrice}` : (bn ? 'ফ্রি' : 'Free')}
                            </Badge>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => removeFromCart(item.uid)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Shared details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" />{bn ? 'ইস্যুর তারিখ' : 'Issue Date'}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !issuedDate && 'text-muted-foreground')}>
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {issuedDate ? format(issuedDate, 'dd/MM/yyyy') : <span>{bn ? 'তারিখ বাছুন' : 'Pick a date'}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={issuedDate} onSelect={(d) => d && setIssuedDate(d)} initialFocus className={cn('p-3 pointer-events-auto')} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>{bn ? 'বিতরণকারী নাম' : 'Distributor Name'}</Label>
                  <SearchableSelect
                    options={distributorOptions}
                    value={distributorName || autoDistributorName}
                    onValueChange={setDistributorName}
                    placeholder={bn ? 'বিতরণকারী নাম বাছুন' : 'Select distributor name'}
                    searchPlaceholder={bn ? 'স্টাফ/শিক্ষক খুঁজুন...' : 'Search staff/teacher...'}
                    allowCustom
                    customLabel={bn ? 'নতুন নাম লিখুন' : 'Use typed name'}
                  />
                </div>
              </div>

              <div>
                <Label>{bn ? 'মন্তব্য (ঐচ্ছিক)' : 'Notes (optional)'}</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={bn ? 'অতিরিক্ত তথ্য...' : 'Additional info...'} />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-1.5" />{bn ? 'পূর্ববর্তী' : 'Back'}
                </Button>
                <Button onClick={() => issueMut.mutate()} disabled={cart.length === 0 || !selectedRecipient || issueMut.isPending} className="btn-primary-gradient flex-1">
                  {issueMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  {bn ? `ইস্যু করুন (${cart.length})` : `Issue (${cart.length})`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* Lost/Fine Dialog */}
      <Dialog open={lossOpen} onOpenChange={setLossOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{bn ? 'হারানো / নষ্ট চিহ্নিত করুন' : 'Mark as Lost/Damaged'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              {bn ? 'বই: ' : 'Book: '}<strong>{lossTarget?.library_books?.title_bn || lossTarget?.library_books?.title}</strong>
            </p>
            <div>
              <Label>{bn ? 'জরিমানা (৳)' : 'Fine Amount (৳)'}</Label>
              <Input type="number" value={fineAmount || ''} onChange={e => setFineAmount(Number(e.target.value))} placeholder="0" />
            </div>
            <Button onClick={() => markLostMut.mutate()} disabled={markLostMut.isPending} variant="destructive">
              {markLostMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              {bn ? 'হারানো হিসেবে সেভ করুন' : 'Save as Lost'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Return Book Dialog */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{bn ? 'বই জমা নিন' : 'Accept Book Return'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={bn ? 'গ্রহীতার নাম বা বইয়ের নাম দিয়ে খুঁজুন...' : 'Search by recipient or book name...'}
                value={returnSearch}
                onChange={e => setReturnSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            {(() => {
              const issuedBooks = issuances.filter((i: any) => {
                if (i.status !== 'issued') return false;
                if (!returnSearch) return true;
                const q = returnSearch.toLowerCase();
                return i.recipient_name?.toLowerCase().includes(q) ||
                  i.library_books?.title?.toLowerCase().includes(q) ||
                  i.library_books?.title_bn?.includes(q);
              });
              if (issuedBooks.length === 0) {
                return (
                  <p className="text-center text-muted-foreground py-8">
                    {bn ? 'কোনো ইস্যুকৃত বই পাওয়া যায়নি' : 'No issued books found'}
                  </p>
                );
              }
              return (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{bn ? 'বই' : 'Book'}</TableHead>
                        <TableHead>{bn ? 'গ্রহীতা' : 'Recipient'}</TableHead>
                        <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                        <TableHead className="text-center">{bn ? 'জমা নিন' : 'Return'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {issuedBooks.map((i: any) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">
                            {bn ? (i.library_books?.title_bn || i.library_books?.title) : i.library_books?.title}
                          </TableCell>
                          <TableCell>
                            <span>{i.recipient_name}</span>
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {i.recipient_type === 'student' ? (bn ? 'ছাত্র' : 'Student') : (bn ? 'স্টাফ' : 'Staff')}
                            </span>
                          </TableCell>
                          <TableCell>{format(new Date(i.issued_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                              disabled={returnMut.isPending}
                              onClick={() => returnMut.mutate(i)}
                            >
                              <Undo2 className="w-3.5 h-3.5 mr-1" />
                              {bn ? 'জমা নিন' : 'Return'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LibraryIssuance;
