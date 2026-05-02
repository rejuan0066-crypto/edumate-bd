import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { BookOpen, BookX, AlertTriangle, DollarSign, ArrowRightLeft, Loader2, Eye, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from "@/contexts/ConfirmContext";

type ListType = 'all-books' | 'total-copies' | 'new-books' | 'old-books' | 'available' | 'issued' | 'lost' | 'damaged' | 'value' | 'sales';

const LibraryDashboard = () => {
  const confirm = useConfirm();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [listOpen, setListOpen] = useState(false);
  const [listType, setListType] = useState<ListType>('all-books');
  const [listTitle, setListTitle] = useState('');

  const { data: books = [], isLoading: booksLoading } = useQuery({
    queryKey: ['library-books-all'],
    queryFn: async () => {
      const { data } = await supabase.from('library_books').select('*').eq('is_active', true);
      return data || [];
    },
  });

  const { data: issuances = [], isLoading: issLoading } = useQuery({
    queryKey: ['library-issuances-all'],
    queryFn: async () => {
      const { data } = await supabase.from('library_issuances').select('*, library_books(title, title_bn), students(name_bn, name_en), staff(name_bn, name_en)');
      return data || [];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async ({ id, table }: { id: string; table: 'library_books' | 'library_issuances' }) => {
      if (table === 'library_books') {
        const { error } = await supabase.from('library_books').update({ is_active: false }).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('library_issuances').update({ status: 'cancelled' }).eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(bn ? 'সফলভাবে মুছে ফেলা হয়েছে' : 'Deleted successfully');
      qc.invalidateQueries({ queryKey: ['library-books-all'] });
      qc.invalidateQueries({ queryKey: ['library-issuances-all'] });
    },
  });

  if (booksLoading || issLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const now = Date.now();
  const newBooks = books.filter((b: any) => {
    const age = (now - new Date(b.purchase_date).getTime()) / (1000 * 60 * 60 * 24);
    return age < 365;
  });
  const oldBooks = books.filter((b: any) => {
    const age = (now - new Date(b.purchase_date).getTime()) / (1000 * 60 * 60 * 24);
    return age >= 365;
  });

  const totalCopies = books.reduce((s: number, b: any) => s + (b.total_copies || 0), 0);
  const availableCopies = books.reduce((s: number, b: any) => s + (b.available_copies || 0), 0);
  const lostCopies = books.reduce((s: number, b: any) => s + (b.lost_copies || 0), 0);
  const damagedCopies = books.reduce((s: number, b: any) => s + (b.damaged_copies || 0), 0);
  const totalValue = books.reduce((s: number, b: any) => s + (b.buying_price || 0) * (b.total_copies || 0), 0);
  const activeIssuances = issuances.filter((i: any) => i.status === 'issued');
  const saleIssuances = issuances.filter((i: any) => i.distribution_type === 'sale');
  const totalSaleValue = saleIssuances.reduce((s: number, i: any) => s + (i.selling_price || 0), 0);

  const openList = (title: string, type: ListType) => {
    setListTitle(title);
    setListType(type);
    setListOpen(true);
  };

  const stats = [
    { label: bn ? 'মোট বই (টাইটেল)' : 'Total Books (Titles)', value: books.length, icon: BookOpen, gradient: 'from-violet-500 to-purple-600', type: 'all-books' as ListType },
    { label: bn ? 'মোট কপি' : 'Total Copies', value: totalCopies, icon: BookOpen, gradient: 'from-blue-500 to-indigo-600', type: 'total-copies' as ListType },
    { label: bn ? 'নতুন বই' : 'New Books', value: newBooks.length, icon: BookOpen, gradient: 'from-emerald-500 to-green-600', type: 'new-books' as ListType },
    { label: bn ? 'পুরাতন বই' : 'Old Books', value: oldBooks.length, icon: BookOpen, gradient: 'from-amber-500 to-orange-600', type: 'old-books' as ListType },
    { label: bn ? 'উপলব্ধ কপি' : 'Available Copies', value: availableCopies, icon: BookOpen, gradient: 'from-teal-500 to-cyan-600', type: 'available' as ListType },
    { label: bn ? 'ইস্যু আছে' : 'Currently Issued', value: activeIssuances.length, icon: ArrowRightLeft, gradient: 'from-indigo-500 to-blue-600', type: 'issued' as ListType },
    { label: bn ? 'হারানো' : 'Lost', value: lostCopies, icon: AlertTriangle, gradient: 'from-red-500 to-rose-600', type: 'lost' as ListType },
    { label: bn ? 'নষ্ট' : 'Damaged', value: damagedCopies, icon: BookX, gradient: 'from-orange-500 to-red-500', type: 'damaged' as ListType },
    { label: bn ? 'ইনভেন্টরি ভ্যালু' : 'Inventory Value', value: `৳${totalValue.toLocaleString()}`, icon: DollarSign, gradient: 'from-green-500 to-emerald-600', type: 'value' as ListType },
    { label: bn ? 'বিক্রয় আয়' : 'Sales Revenue', value: `৳${totalSaleValue.toLocaleString()}`, icon: DollarSign, gradient: 'from-cyan-500 to-blue-500', type: 'sales' as ListType },
  ];

  // Get filtered list based on type
  const getListItems = (): { items: any[]; isBook: boolean } => {
    switch (listType) {
      case 'all-books': return { items: books, isBook: true };
      case 'total-copies': return { items: books, isBook: true };
      case 'new-books': return { items: newBooks, isBook: true };
      case 'old-books': return { items: oldBooks, isBook: true };
      case 'available': return { items: books.filter((b: any) => (b.available_copies || 0) > 0), isBook: true };
      case 'lost': return { items: books.filter((b: any) => (b.lost_copies || 0) > 0), isBook: true };
      case 'damaged': return { items: books.filter((b: any) => (b.damaged_copies || 0) > 0), isBook: true };
      case 'value': return { items: books, isBook: true };
      case 'issued': return { items: activeIssuances, isBook: false };
      case 'sales': return { items: saleIssuances, isBook: false };
      default: return { items: [], isBook: true };
    }
  };

  const { items, isBook } = getListItems();

  const handleDelete = async (id: string, table: 'library_books' | 'library_issuances') => {
    if (!(await confirm({ description: bn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?', variant: 'destructive' }))) return;
    deleteMut.mutate({ id, table });
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
        {stats.map((s, i) => (
          <div
            key={i}
            onClick={() => openList(s.label, s.type)}
            className={`relative overflow-hidden rounded-xl p-4 flex flex-col items-center text-center gap-2 cursor-pointer hover:shadow-xl hover:scale-[1.03] transition-all bg-gradient-to-br ${s.gradient} text-white shadow-md`}
          >
            <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold drop-shadow-sm">{s.value}</p>
            <p className="text-xs text-white/90 font-medium">{s.label}</p>
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/5" />
          </div>
        ))}
      </div>

      <Dialog open={listOpen} onOpenChange={setListOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{listTitle} ({items.length})</DialogTitle>
          </DialogHeader>

          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{bn ? 'কোনো তথ্য নেই' : 'No data found'}</p>
          ) : isBook ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">{bn ? 'বইয়ের নাম' : 'Title'}</th>
                    <th className="p-2 text-left">{bn ? 'ক্যাটাগরি' : 'Category'}</th>
                    <th className="p-2 text-center">{bn ? 'মোট' : 'Total'}</th>
                    <th className="p-2 text-center">{bn ? 'উপলব্ধ' : 'Available'}</th>
                    <th className="p-2 text-center">{bn ? 'দাম' : 'Price'}</th>
                    <th className="p-2 text-center">{bn ? 'অ্যাকশন' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((b: any, idx: number) => (
                    <tr key={b.id} className="border-t hover:bg-muted/30">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2 font-medium">{bn ? (b.title_bn || b.title) : b.title}</td>
                      <td className="p-2 text-muted-foreground">{b.book_category}</td>
                      <td className="p-2 text-center">{b.total_copies}</td>
                      <td className="p-2 text-center">{b.available_copies}</td>
                      <td className="p-2 text-center">৳{b.buying_price}</td>
                      <td className="p-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setListOpen(false); navigate('/admin/library?tab=inventory'); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(b.id, 'library_books')}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">{bn ? 'বই' : 'Book'}</th>
                    <th className="p-2 text-left">{bn ? 'গ্রহীতা' : 'Recipient'}</th>
                    <th className="p-2 text-center">{bn ? 'তারিখ' : 'Date'}</th>
                    <th className="p-2 text-center">{bn ? 'ধরন' : 'Type'}</th>
                    <th className="p-2 text-center">{bn ? 'মূল্য' : 'Price'}</th>
                    <th className="p-2 text-center">{bn ? 'অ্যাকশন' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((iss: any, idx: number) => {
                    const bookName = bn ? (iss.library_books?.title_bn || iss.library_books?.title) : (iss.library_books?.title || '');
                    const recipientName = iss.recipient_name || (iss.students ? (bn ? iss.students.name_bn : iss.students.name_en) : (iss.staff ? (bn ? iss.staff.name_bn : iss.staff.name_en) : ''));
                    return (
                      <tr key={iss.id} className="border-t hover:bg-muted/30">
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2 font-medium">{bookName}</td>
                        <td className="p-2">{recipientName}</td>
                        <td className="p-2 text-center">{iss.issued_date}</td>
                        <td className="p-2 text-center capitalize">{iss.distribution_type}</td>
                        <td className="p-2 text-center">{iss.selling_price ? `৳${iss.selling_price}` : '-'}</td>
                        <td className="p-2 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setListOpen(false); navigate('/admin/library?tab=issuance'); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(iss.id, 'library_issuances')}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LibraryDashboard;
