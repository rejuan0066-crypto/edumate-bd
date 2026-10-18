import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, FileText, Users, X } from 'lucide-react';
import { generateBilingualReport } from '@/lib/reportPdfGenerator';

const StudentReportSection = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { settings: ws } = useWebsiteSettings();

  const [sessionId, setSessionId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const { data: sessions = [] } = useQuery({
    queryKey: ['report-academic-sessions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('academic_sessions')
        .select('id, name, name_bn, is_active')
        .order('name', { ascending: false });
      return data || [];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['report-classes-full'],
    queryFn: async () => {
      const { data } = await supabase
        .from('classes')
        .select('id, name, name_bn, division_id, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      return data || [];
    },
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['report-students-list', sessionId, classId],
    enabled: !!sessionId && !!classId,
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, student_id, name_bn, name_en, roll_number, gender, date_of_birth, admission_date, status, phone, guardian_phone')
        .eq('session_id', sessionId)
        .eq('class_id', classId)
        .is('deleted_at', null)
        .order('roll_number', { ascending: true });
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.trim().toLowerCase();
    return students.filter((s: any) =>
      String(s.name_bn || '').toLowerCase().includes(q) ||
      String(s.name_en || '').toLowerCase().includes(q) ||
      String(s.roll_number || '').toLowerCase().includes(q) ||
      String(s.student_id || '').toLowerCase().includes(q)
    );
  }, [students, search]);

  const sessionName = sessions.find((s: any) => s.id === sessionId);
  const className = classes.find((c: any) => c.id === classId);

  const buildRows = (data: any[]) => data.map((s, i) => [
    i + 1,
    s.roll_number || '-',
    s.student_id || '-',
    bn ? (s.name_bn || s.name_en || '-') : (s.name_en || s.name_bn || '-'),
    s.gender ? (bn ? (s.gender === 'male' ? 'ছেলে' : s.gender === 'female' ? 'মেয়ে' : s.gender) : s.gender) : '-',
    s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString(bn ? 'bn-BD' : 'en-GB') : '-',
    s.admission_date ? new Date(s.admission_date).toLocaleDateString(bn ? 'bn-BD' : 'en-GB') : '-',
    s.status || '-',
  ]);

  const handlePDF = () => {
    if (!filtered.length) return;
    generateBilingualReport(
      {
        institution_name: ws.institution_name || '',
        institution_name_en: ws.institution_name_en || '',
        address: ws.address || '',
        phone: ws.phone || '',
        email: ws.email || '',
        logo_url: ws.logo_url,
        report_title_bn: 'ছাত্র তালিকা রিপোর্ট',
        report_title_en: 'Student List Report',
        period_label_bn: `${sessionName?.name_bn || sessionName?.name || ''} • ${className?.name_bn || ''}`,
        period_label_en: `${sessionName?.name || ''} • ${className?.name || ''}`,
      },
      [{
        title_bn: `${className?.name_bn || ''} — ${filtered.length} জন ছাত্র`,
        title_en: `${className?.name || ''} — ${filtered.length} Students`,
        headers: [
          { bn: 'ক্রম', en: 'No.' },
          { bn: 'রোল', en: 'Roll' },
          { bn: 'স্টুডেন্ট আইডি', en: 'Student ID' },
          { bn: 'নাম', en: 'Name' },
          { bn: 'লিঙ্গ', en: 'Gender' },
          { bn: 'জন্মতারিখ', en: 'DOB' },
          { bn: 'ভর্তি তারিখ', en: 'Admission' },
          { bn: 'অবস্থা', en: 'Status' },
        ],
        rows: buildRows(filtered),
      }],
      [
        { label_bn: 'মোট ছাত্র', label_en: 'Total Students', value: filtered.length, tone: 'accent' },
        { label_bn: 'সক্রিয়', label_en: 'Active', value: filtered.filter((s: any) => s.status === 'active').length, tone: 'positive' },
        { label_bn: 'ছেলে', label_en: 'Male', value: filtered.filter((s: any) => s.gender === 'male').length },
        { label_bn: 'মেয়ে', label_en: 'Female', value: filtered.filter((s: any) => s.gender === 'female').length },
      ],
    );
  };

  const handleExcel = async () => {
    if (!filtered.length) return;
    const XLSX: any = await import('xlsx-js-style');
    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [];

    // Header
    wsData.push([ws.institution_name || '']);
    wsData.push([ws.address || '']);
    wsData.push([`${bn ? 'ফোন' : 'Phone'}: ${ws.phone || ''} | ${bn ? 'ইমেইল' : 'Email'}: ${ws.email || ''}`]);
    wsData.push([]);
    wsData.push([bn ? 'ছাত্র তালিকা রিপোর্ট' : 'Student List Report']);
    wsData.push([`${bn ? 'সেশন' : 'Session'}: ${bn ? (sessionName?.name_bn || sessionName?.name) : sessionName?.name} | ${bn ? 'ক্লাস' : 'Class'}: ${bn ? className?.name_bn : className?.name}`]);
    wsData.push([`${bn ? 'তারিখ' : 'Date'}: ${new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-GB')} | ${bn ? 'মোট' : 'Total'}: ${filtered.length}`]);
    wsData.push([]);

    // Column headers
    const headers = [
      bn ? 'ক্রম' : 'No.',
      bn ? 'রোল' : 'Roll',
      bn ? 'স্টুডেন্ট আইডি' : 'Student ID',
      bn ? 'নাম' : 'Name',
      bn ? 'লিঙ্গ' : 'Gender',
      bn ? 'জন্মতারিখ' : 'DOB',
      bn ? 'ভর্তি তারিখ' : 'Admission',
      bn ? 'অবস্থা' : 'Status',
    ];
    wsData.push(headers);
    buildRows(filtered).forEach(r => wsData.push(r));

    const sheet = XLSX.utils.aoa_to_sheet(wsData);
    sheet['!cols'] = [{ wch: 6 }, { wch: 10 }, { wch: 18 }, { wch: 32 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];

    // Style header row (row 9 -> index 8)
    const headerRowIdx = 8;
    headers.forEach((_, c) => {
      const ref = XLSX.utils.encode_cell({ r: headerRowIdx, c });
      if (sheet[ref]) {
        sheet[ref].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
          fill: { fgColor: { rgb: '0F766E' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
        };
      }
    });

    // Style title rows
    [0, 4].forEach(r => {
      const ref = XLSX.utils.encode_cell({ r, c: 0 });
      if (sheet[ref]) sheet[ref].s = { font: { bold: true, sz: r === 0 ? 14 : 12, color: { rgb: '0F766E' } } };
    });

    XLSX.utils.book_append_sheet(wb, sheet, bn ? 'ছাত্র তালিকা' : 'Students');
    XLSX.writeFile(wb, `student_report_${sessionName?.name || ''}_${className?.name || ''}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Filter Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            {bn ? 'ছাত্র তালিকা ফিল্টার' : 'Student List Filter'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {bn ? 'একাডেমিক সেশন' : 'Academic Session'} *
              </label>
              <Select value={sessionId} onValueChange={(v) => { setSessionId(v); setClassId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder={bn ? 'সেশন নির্বাচন করুন' : 'Select session'} />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {bn ? (s.name_bn || s.name) : s.name}
                      {s.is_active && <Badge variant="outline" className="ml-2 text-[9px]">Active</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {bn ? 'শ্রেণী' : 'Class'} *
              </label>
              <Select value={classId} onValueChange={setClassId} disabled={!sessionId}>
                <SelectTrigger>
                  <SelectValue placeholder={bn ? 'ক্লাস নির্বাচন করুন' : 'Select class'} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {bn ? c.name_bn : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {bn ? 'নাম/রোল/আইডি অনুসন্ধান' : 'Search name/roll/ID'}
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={bn ? 'খুঁজুন...' : 'Search...'}
                  className="pl-8 pr-8"
                  disabled={!classId}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {sessionId && classId && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
              <div className="text-sm text-muted-foreground">
                {isLoading ? (
                  <span>{bn ? 'লোড হচ্ছে...' : 'Loading...'}</span>
                ) : (
                  <span>
                    <strong className="text-foreground">{filtered.length}</strong>{' '}
                    {bn ? `জন ছাত্র পাওয়া গেছে` : `students found`}
                    {search && ` (${bn ? 'ফিল্টার করা' : 'filtered'} from ${students.length})`}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handlePDF} disabled={!filtered.length}>
                  <FileText className="h-4 w-4 mr-1" />
                  {bn ? 'PDF প্রিন্ট' : 'PDF'}
                </Button>
                <Button size="sm" variant="outline" onClick={handleExcel} disabled={!filtered.length}>
                  <Download className="h-4 w-4 mr-1" />
                  {bn ? 'এক্সেল' : 'Excel'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result Table */}
      {sessionId && classId && (
        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 && !isLoading ? (
              <div className="p-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {students.length === 0
                    ? (bn ? 'এই সেশনের এই ক্লাসে কোনো ছাত্র নেই' : 'No students in this session and class')
                    : (bn ? 'অনুসন্ধানে কোনো ছাত্র পাওয়া যায়নি' : 'No students match your search')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-12 text-center">{bn ? 'ক্রম' : 'No.'}</TableHead>
                      <TableHead>{bn ? 'রোল' : 'Roll'}</TableHead>
                      <TableHead>{bn ? 'স্টুডেন্ট আইডি' : 'Student ID'}</TableHead>
                      <TableHead>{bn ? 'নাম' : 'Name'}</TableHead>
                      <TableHead>{bn ? 'লিঙ্গ' : 'Gender'}</TableHead>
                      <TableHead>{bn ? 'জন্মতারিখ' : 'DOB'}</TableHead>
                      <TableHead>{bn ? 'ভর্তি তারিখ' : 'Admission'}</TableHead>
                      <TableHead>{bn ? 'অবস্থা' : 'Status'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s: any, i: number) => (
                      <TableRow key={s.id} className="hover:bg-muted/30">
                        <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{s.roll_number || '-'}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{s.student_id || '-'}</TableCell>
                        <TableCell className="font-medium">{bn ? (s.name_bn || s.name_en) : (s.name_en || s.name_bn)}</TableCell>
                        <TableCell>
                          {s.gender ? (
                            <Badge variant="outline" className="text-[10px]">
                              {bn ? (s.gender === 'male' ? 'ছেলে' : s.gender === 'female' ? 'মেয়ে' : s.gender) : s.gender}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString(bn ? 'bn-BD' : 'en-GB') : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.admission_date ? new Date(s.admission_date).toLocaleDateString(bn ? 'bn-BD' : 'en-GB') : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={s.status === 'active' ? 'default' : 'secondary'}
                            className="text-[10px] capitalize"
                          >
                            {s.status || '-'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(!sessionId || !classId) && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {bn ? 'ছাত্র তালিকা দেখতে উপরে সেশন এবং ক্লাস নির্বাচন করুন' : 'Select session and class above to view student list'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentReportSection;
