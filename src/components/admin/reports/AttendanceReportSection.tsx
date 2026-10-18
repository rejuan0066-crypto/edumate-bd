import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Download, FileText, Users } from 'lucide-react';
import { generateBilingualReport } from '@/lib/reportPdfGenerator';

const todayISO = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const AttendanceReportSection = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { settings: ws } = useWebsiteSettings();

  const [sessionId, setSessionId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>(firstOfMonth());
  const [toDate, setToDate] = useState<string>(todayISO());

  const { data: sessions = [] } = useQuery({
    queryKey: ['att-report-sessions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('academic_sessions')
        .select('id, name, name_bn, is_active')
        .order('name', { ascending: false });
      return data || [];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['att-report-classes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('classes')
        .select('id, name, name_bn, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      return data || [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['att-report-students', sessionId, classId],
    enabled: !!sessionId && !!classId,
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, student_id, name_bn, name_en, roll_number')
        .eq('session_id', sessionId)
        .eq('class_id', classId)
        .is('deleted_at', null)
        .order('roll_number', { ascending: true });
      return data || [];
    },
  });

  const studentIds = useMemo(() => students.map((s: any) => s.id), [students]);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['att-report-records', studentIds, fromDate, toDate],
    enabled: studentIds.length > 0 && !!fromDate && !!toDate,
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance_records')
        .select('id, entity_id, status, attendance_date, check_in_time')
        .eq('entity_type', 'student')
        .in('entity_id', studentIds)
        .gte('attendance_date', fromDate)
        .lte('attendance_date', toDate);
      return data || [];
    },
  });

  // Aggregate per student
  const summary = useMemo(() => {
    const map: Record<string, { present: number; absent: number; late: number; total: number }> = {};
    students.forEach((s: any) => {
      map[s.id] = { present: 0, absent: 0, late: 0, total: 0 };
    });
    records.forEach((r: any) => {
      const slot = map[r.entity_id];
      if (!slot) return;
      slot.total++;
      if (r.status === 'present') slot.present++;
      else if (r.status === 'absent') slot.absent++;
      else if (r.status === 'late') slot.late++;
    });
    return students.map((s: any) => ({
      ...s,
      ...map[s.id],
      rate: map[s.id].total > 0 ? ((map[s.id].present / map[s.id].total) * 100).toFixed(1) + '%' : '-',
    }));
  }, [students, records]);

  const sessionName = sessions.find((s: any) => s.id === sessionId);
  const className = classes.find((c: any) => c.id === classId);

  const totals = useMemo(() => {
    const present = summary.reduce((s, r) => s + r.present, 0);
    const absent = summary.reduce((s, r) => s + r.absent, 0);
    const late = summary.reduce((s, r) => s + r.late, 0);
    const total = present + absent + late;
    return { present, absent, late, total, rate: total > 0 ? ((present / total) * 100).toFixed(1) + '%' : '-' };
  }, [summary]);

  const buildRows = () => summary.map((s, i) => [
    i + 1,
    s.roll_number || '-',
    s.student_id || '-',
    bn ? (s.name_bn || s.name_en || '-') : (s.name_en || s.name_bn || '-'),
    s.present,
    s.absent,
    s.late,
    s.total,
    s.rate,
  ]);

  const handlePDF = () => {
    if (!summary.length) return;
    generateBilingualReport(
      {
        institution_name: ws.institution_name || '',
        institution_name_en: ws.institution_name_en || '',
        address: ws.address || '',
        phone: ws.phone || '',
        email: ws.email || '',
        logo_url: ws.logo_url,
        report_title_bn: 'অ্যাটেন্ডেন্স রিপোর্ট',
        report_title_en: 'Attendance Report',
        period_label_bn: `${sessionName?.name_bn || sessionName?.name || ''} • ${className?.name_bn || ''} • ${fromDate} → ${toDate}`,
        period_label_en: `${sessionName?.name || ''} • ${className?.name || ''} • ${fromDate} → ${toDate}`,
      },
      [{
        title_bn: `${className?.name_bn || ''} — ${summary.length} জন ছাত্র`,
        title_en: `${className?.name || ''} — ${summary.length} Students`,
        headers: [
          { bn: 'ক্রম', en: 'No.' },
          { bn: 'রোল', en: 'Roll' },
          { bn: 'স্টুডেন্ট আইডি', en: 'Student ID' },
          { bn: 'নাম', en: 'Name' },
          { bn: 'উপস্থিত', en: 'Present' },
          { bn: 'অনুপস্থিত', en: 'Absent' },
          { bn: 'দেরি', en: 'Late' },
          { bn: 'মোট', en: 'Total' },
          { bn: 'হার', en: 'Rate' },
        ],
        rows: buildRows(),
      }],
      [
        { label_bn: 'মোট ছাত্র', label_en: 'Total Students', value: summary.length, tone: 'accent' },
        { label_bn: 'উপস্থিত', label_en: 'Present', value: totals.present, tone: 'positive' },
        { label_bn: 'অনুপস্থিত', label_en: 'Absent', value: totals.absent, tone: 'negative' },
        { label_bn: 'দেরি', label_en: 'Late', value: totals.late },
        { label_bn: 'উপস্থিতি হার', label_en: 'Attendance Rate', value: totals.rate, tone: 'accent' },
      ],
    );
  };

  const handleExcel = async () => {
    if (!summary.length) return;
    const XLSX: any = await import('xlsx-js-style');
    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [];

    wsData.push([ws.institution_name || '']);
    wsData.push([ws.address || '']);
    wsData.push([`${bn ? 'ফোন' : 'Phone'}: ${ws.phone || ''} | ${bn ? 'ইমেইল' : 'Email'}: ${ws.email || ''}`]);
    wsData.push([]);
    wsData.push([bn ? 'অ্যাটেন্ডেন্স রিপোর্ট' : 'Attendance Report']);
    wsData.push([`${bn ? 'সেশন' : 'Session'}: ${bn ? (sessionName?.name_bn || sessionName?.name) : sessionName?.name} | ${bn ? 'ক্লাস' : 'Class'}: ${bn ? className?.name_bn : className?.name}`]);
    wsData.push([`${bn ? 'সময়কাল' : 'Period'}: ${fromDate} → ${toDate} | ${bn ? 'মোট' : 'Total'}: ${summary.length}`]);
    wsData.push([]);

    const headers = [
      bn ? 'ক্রম' : 'No.',
      bn ? 'রোল' : 'Roll',
      bn ? 'স্টুডেন্ট আইডি' : 'Student ID',
      bn ? 'নাম' : 'Name',
      bn ? 'উপস্থিত' : 'Present',
      bn ? 'অনুপস্থিত' : 'Absent',
      bn ? 'দেরি' : 'Late',
      bn ? 'মোট' : 'Total',
      bn ? 'হার' : 'Rate',
    ];
    wsData.push(headers);
    buildRows().forEach(r => wsData.push(r));

    const sheet = XLSX.utils.aoa_to_sheet(wsData);
    sheet['!cols'] = [{ wch: 6 }, { wch: 10 }, { wch: 18 }, { wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 10 }];

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

    [0, 4].forEach(r => {
      const ref = XLSX.utils.encode_cell({ r, c: 0 });
      if (sheet[ref]) sheet[ref].s = { font: { bold: true, sz: r === 0 ? 14 : 12, color: { rgb: '0F766E' } } };
    });

    XLSX.utils.book_append_sheet(wb, sheet, bn ? 'অ্যাটেন্ডেন্স' : 'Attendance');
    XLSX.writeFile(wb, `attendance_report_${sessionName?.name || ''}_${className?.name || ''}_${fromDate}_${toDate}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5 text-primary" />
            {bn ? 'অ্যাটেন্ডেন্স রিপোর্ট ফিল্টার' : 'Attendance Report Filter'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {bn ? 'একাডেমিক সেশন' : 'Academic Session'} *
              </label>
              <Select value={sessionId} onValueChange={(v) => { setSessionId(v); setClassId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder={bn ? 'সেশন নির্বাচন' : 'Select session'} />
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
                  <SelectValue placeholder={bn ? 'ক্লাস নির্বাচন' : 'Select class'} />
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
                {bn ? 'শুরুর তারিখ' : 'From Date'}
              </label>
              <DatePicker value={fromDate} onChange={setFromDate} bengali={bn} />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {bn ? 'শেষ তারিখ' : 'To Date'}
              </label>
              <DatePicker value={toDate} onChange={setToDate} bengali={bn} />
            </div>
          </div>

          {sessionId && classId && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
              <div className="text-sm text-muted-foreground">
                {isLoading ? (
                  <span>{bn ? 'লোড হচ্ছে...' : 'Loading...'}</span>
                ) : (
                  <span>
                    <strong className="text-foreground">{summary.length}</strong>{' '}
                    {bn ? 'জন ছাত্র' : 'students'} • {bn ? 'মোট রেকর্ড' : 'Records'}:{' '}
                    <strong className="text-foreground">{records.length}</strong> •{' '}
                    {bn ? 'হার' : 'Rate'}: <strong className="text-foreground">{totals.rate}</strong>
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handlePDF} disabled={!summary.length}>
                  <FileText className="h-4 w-4 mr-1" />
                  {bn ? 'PDF' : 'PDF'}
                </Button>
                <Button size="sm" variant="outline" onClick={handleExcel} disabled={!summary.length}>
                  <Download className="h-4 w-4 mr-1" />
                  {bn ? 'এক্সেল' : 'Excel'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {sessionId && classId && (
        <Card>
          <CardContent className="p-0">
            {summary.length === 0 && !isLoading ? (
              <div className="p-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {bn ? 'এই সেশনের এই ক্লাসে কোনো ছাত্র নেই' : 'No students in this session and class'}
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
                      <TableHead className="text-center">{bn ? 'উপস্থিত' : 'Present'}</TableHead>
                      <TableHead className="text-center">{bn ? 'অনুপস্থিত' : 'Absent'}</TableHead>
                      <TableHead className="text-center">{bn ? 'দেরি' : 'Late'}</TableHead>
                      <TableHead className="text-center">{bn ? 'মোট' : 'Total'}</TableHead>
                      <TableHead className="text-center">{bn ? 'হার' : 'Rate'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.map((s: any, i: number) => (
                      <TableRow key={s.id} className="hover:bg-muted/30">
                        <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{s.roll_number || '-'}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{s.student_id || '-'}</TableCell>
                        <TableCell className="font-medium">{bn ? (s.name_bn || s.name_en) : (s.name_en || s.name_bn)}</TableCell>
                        <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-semibold">{s.present}</TableCell>
                        <TableCell className="text-center text-red-600 dark:text-red-400 font-semibold">{s.absent}</TableCell>
                        <TableCell className="text-center text-amber-600 dark:text-amber-400">{s.late}</TableCell>
                        <TableCell className="text-center font-semibold">{s.total}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px]">{s.rate}</Badge>
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
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {bn ? 'অ্যাটেন্ডেন্স রিপোর্ট দেখতে উপরে সেশন এবং ক্লাস নির্বাচন করুন' : 'Select session and class above to view attendance report'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AttendanceReportSection;
