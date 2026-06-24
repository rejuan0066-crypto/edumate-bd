import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, FileText, AlertTriangle, Printer, Download } from 'lucide-react';
import { printYearlyIssuanceList, downloadYearlyIssuanceList } from '@/lib/libraryIssuancePrint';
import { format } from 'date-fns';


const LibraryReports = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [reportType, setReportType] = useState('issuance_log');
  const [search, setSearch] = useState('');

  const { data: issuances = [], isLoading: issLoading } = useQuery({
    queryKey: ['library-report-issuances'],
    queryFn: async () => {
      const { data } = await supabase.from('library_issuances').select('*, library_books(title, title_bn, buying_price), students(name_bn, name_en, student_id), staff(name_bn, name_en, staff_id)').order('issued_date', { ascending: false });
      return data || [];
    },
  });

  const { data: fines = [], isLoading: finesLoading } = useQuery({
    queryKey: ['library-report-fines'],
    queryFn: async () => {
      const { data } = await supabase.from('library_fines').select('*, library_books(title, title_bn), library_issuances(recipient_name, recipient_type)').order('created_at', { ascending: false });
      return data || [];
    },
    enabled: reportType === 'fines',
  });

  const { data: lostBooks = [] } = useQuery({
    queryKey: ['library-lost-damaged'],
    queryFn: async () => {
      const { data } = await supabase.from('library_books').select('*').eq('is_active', true).or('lost_copies.gt.0,damaged_copies.gt.0');
      return data || [];
    },
    enabled: reportType === 'lost_damaged',
  });

  const filteredIss = issuances.filter((i: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return i.recipient_name?.toLowerCase().includes(q) || i.library_books?.title?.toLowerCase().includes(q) || i.library_books?.title_bn?.includes(q);
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="issuance_log">{bn ? 'ইস্যু লগ' : 'Issuance Log'}</SelectItem>
            <SelectItem value="lost_damaged">{bn ? 'হারানো / নষ্ট বই' : 'Lost / Damaged Books'}</SelectItem>
            <SelectItem value="fines">{bn ? 'জরিমানা তালিকা' : 'Fines List'}</SelectItem>
          </SelectContent>
        </Select>
        {reportType === 'issuance_log' && (
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={bn ? 'খুঁজুন...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        )}
      </div>

      {/* Issuance Log */}
      {reportType === 'issuance_log' && (
        issLoading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
          <div className="card-elevated overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{bn ? 'বই' : 'Book'}</TableHead>
                  <TableHead>{bn ? 'গ্রহীতা' : 'Recipient'}</TableHead>
                  <TableHead>{bn ? 'ধরন' : 'Type'}</TableHead>
                  <TableHead>{bn ? 'অবস্থা' : 'Condition'}</TableHead>
                  <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                  <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                  <TableHead className="text-right">{bn ? 'মূল্য' : 'Price'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIss.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{bn ? 'কোনো রেকর্ড নেই' : 'No records'}</TableCell></TableRow>
                ) : filteredIss.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.custom_book_title || (bn ? (i.library_books?.title_bn || i.library_books?.title) : i.library_books?.title)}</TableCell>
                    <TableCell>
                      {i.recipient_name}
                      <br /><span className="text-xs text-muted-foreground">{i.recipient_type === 'student' ? (bn ? 'ছাত্র' : 'Student') : i.recipient_type === 'teacher' ? (bn ? 'শিক্ষক' : 'Teacher') : (bn ? 'স্টাফ' : 'Staff')}</span>
                    </TableCell>
                    <TableCell>
                      {i.distribution_type === 'sale'
                        ? <Badge className="bg-amber-500/10 text-amber-600">{bn ? 'বিক্রয়' : 'Sale'}</Badge>
                        : <Badge className="bg-green-500/10 text-green-600">{bn ? 'ফ্রি' : 'Free'}</Badge>}
                    </TableCell>
                    <TableCell>{i.book_condition === 'new' ? (bn ? 'নতুন' : 'New') : (bn ? 'পুরাতন' : 'Old')}</TableCell>
                    <TableCell>{format(new Date(i.issued_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant={i.status === 'returned' ? 'secondary' : i.status === 'lost' ? 'destructive' : 'default'}>
                        {i.status === 'issued' ? (bn ? 'ইস্যু' : 'Issued') : i.status === 'returned' ? (bn ? 'ফেরত' : 'Returned') : (bn ? 'হারানো' : 'Lost')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{i.distribution_type === 'sale' ? `৳${i.selling_price}` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      )}

      {/* Lost/Damaged Report */}
      {reportType === 'lost_damaged' && (
        <div className="card-elevated overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{bn ? 'বই' : 'Book'}</TableHead>
                <TableHead className="text-center">{bn ? 'হারানো' : 'Lost'}</TableHead>
                <TableHead className="text-center">{bn ? 'নষ্ট' : 'Damaged'}</TableHead>
                <TableHead className="text-right">{bn ? 'ক্ষতির মূল্য' : 'Loss Value'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lostBooks.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{bn ? 'কোনো হারানো/নষ্ট বই নেই' : 'No lost/damaged books'}</TableCell></TableRow>
              ) : lostBooks.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{bn ? (b.title_bn || b.title) : b.title}</TableCell>
                  <TableCell className="text-center"><Badge variant="destructive">{b.lost_copies}</Badge></TableCell>
                  <TableCell className="text-center"><Badge variant="secondary">{b.damaged_copies}</Badge></TableCell>
                  <TableCell className="text-right">৳{((b.lost_copies + b.damaged_copies) * b.buying_price).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Fines Report */}
      {reportType === 'fines' && (
        finesLoading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
          <div className="card-elevated overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{bn ? 'বই' : 'Book'}</TableHead>
                  <TableHead>{bn ? 'গ্রহীতা' : 'Recipient'}</TableHead>
                  <TableHead>{bn ? 'ধরন' : 'Type'}</TableHead>
                  <TableHead className="text-right">{bn ? 'জরিমানা' : 'Fine'}</TableHead>
                  <TableHead className="text-right">{bn ? 'পরিশোধিত' : 'Paid'}</TableHead>
                  <TableHead className="text-center">{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fines.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{bn ? 'কোনো জরিমানা নেই' : 'No fines'}</TableCell></TableRow>
                ) : fines.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell>{bn ? (f.library_books?.title_bn || f.library_books?.title) : f.library_books?.title}</TableCell>
                    <TableCell>{f.library_issuances?.recipient_name || '—'}</TableCell>
                    <TableCell><Badge variant="destructive">{f.fine_type === 'lost' ? (bn ? 'হারানো' : 'Lost') : (bn ? 'নষ্ট' : 'Damaged')}</Badge></TableCell>
                    <TableCell className="text-right">৳{f.fine_amount}</TableCell>
                    <TableCell className="text-right">৳{f.paid_amount}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={f.status === 'paid' ? 'secondary' : 'destructive'}>{f.status === 'paid' ? (bn ? 'পরিশোধিত' : 'Paid') : (bn ? 'বকেয়া' : 'Unpaid')}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      )}
    </div>
  );
};

export default LibraryReports;
