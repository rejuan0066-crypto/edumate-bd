import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BookOpen, Download, FileText, Plus, Pencil, Trash2 } from 'lucide-react';
import { generateBilingualReport } from '@/lib/reportPdfGenerator';
import { toast } from 'sonner';

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};

type CoverageRow = {
  id?: string;
  session_id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  coverage_date: string;
  chapter: string;
  topic: string;
  pages_covered: string;
  duration_minutes: number | null;
  progress_percent: number;
  notes: string;
};

const emptyRow = (): CoverageRow => ({
  session_id: '',
  class_id: '',
  subject_id: '',
  teacher_id: null,
  coverage_date: todayISO(),
  chapter: '',
  topic: '',
  pages_covered: '',
  duration_minutes: null,
  progress_percent: 0,
  notes: '',
});

const SyllabusCoverageSection = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { settings: ws } = useWebsiteSettings();
  const qc = useQueryClient();

  const [sessionId, setSessionId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [teacherId, setTeacherId] = useState<string>('all');
  const [subjectId, setSubjectId] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>(monthAgo());
  const [toDate, setToDate] = useState<string>(todayISO());

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<CoverageRow>(emptyRow());

  // Reference data
  const { data: sessions = [] } = useQuery({
    queryKey: ['syl-sessions'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_sessions').select('id, name, name_bn, is_active').order('name', { ascending: false });
      return data || [];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['syl-classes'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('id, name, name_bn, sort_order').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['syl-subjects', classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data } = await supabase.from('subjects').select('id, name, name_bn, class_id').eq('class_id', classId).eq('is_active', true);
      return data || [];
    },
  });

  // Subjects scoped to the entry being edited (independent of filter classId)
  const { data: editSubjects = [] } = useQuery({
    queryKey: ['syl-edit-subjects', editing.class_id],
    enabled: !!editing.class_id,
    queryFn: async () => {
      const { data } = await supabase.from('subjects').select('id, name, name_bn, class_id').eq('class_id', editing.class_id).eq('is_active', true);
      return data || [];
    },
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['syl-teachers'],
    queryFn: async () => {
      const { data } = await supabase.from('staff').select('id, name_bn, name_en, staff_category').eq('status', 'active').in('staff_category', ['teacher', 'administrative']);
      return data || [];
    },
  });

  // Routine periods for the editing class on the editing date's day-of-week
  const editingDayOfWeek = useMemo(() => {
    if (!editing.coverage_date) return null;
    const d = new Date(editing.coverage_date);
    return isNaN(d.getTime()) ? null : d.getDay(); // 0=Sun, 6=Sat
  }, [editing.coverage_date]);

  const { data: routinePeriods = [] } = useQuery({
    queryKey: ['syl-routine-periods', editing.class_id, editingDayOfWeek],
    enabled: !!editing.class_id && editingDayOfWeek !== null && editOpen,
    queryFn: async () => {
      const { data: routines } = await supabase
        .from('class_routines')
        .select('id')
        .eq('class_id', editing.class_id)
        .eq('is_active', true)
        .limit(1);
      const routineId = routines?.[0]?.id;
      if (!routineId) return [];
      const { data } = await supabase
        .from('routine_periods')
        .select('id, period_number, start_time, end_time, subject_id, teacher_name, teacher_name_bn, is_break, room, subjects(id, name, name_bn)')
        .eq('routine_id', routineId)
        .eq('day_of_week', editingDayOfWeek)
        .eq('is_break', false)
        .order('period_number');
      return data || [];
    },
  });

  const findTeacherIdByName = (nameEn?: string | null, nameBn?: string | null): string | null => {
    if (!nameEn && !nameBn) return null;
    const match = teachers.find((t: any) =>
      (nameEn && (t.name_en === nameEn || t.name_bn === nameEn)) ||
      (nameBn && (t.name_bn === nameBn || t.name_en === nameBn))
    );
    return match?.id || null;
  };

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['syl-coverage', sessionId, classId, teacherId, subjectId, fromDate, toDate],
    enabled: !!sessionId && !!classId,
    queryFn: async () => {
      let q = supabase
        .from('syllabus_coverage')
        .select('*')
        .eq('session_id', sessionId)
        .eq('class_id', classId)
        .gte('coverage_date', fromDate)
        .lte('coverage_date', toDate)
        .order('coverage_date', { ascending: false });
      if (teacherId !== 'all') q = q.eq('teacher_id', teacherId);
      if (subjectId !== 'all') q = q.eq('subject_id', subjectId);
      const { data } = await q;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (row: CoverageRow) => {
      const payload: any = { ...row };
      if (row.id) {
        const { id, ...update } = payload;
        const { error } = await supabase.from('syllabus_coverage').update(update).eq('id', id);
        if (error) throw error;
      } else {
        delete payload.id;
        const { error } = await supabase.from('syllabus_coverage').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(bn ? 'সংরক্ষিত হয়েছে' : 'Saved');
      qc.invalidateQueries({ queryKey: ['syl-coverage'] });
      setEditOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('syllabus_coverage').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
      qc.invalidateQueries({ queryKey: ['syl-coverage'] });
    },
  });

  const subjMap = useMemo(() => {
    const m: Record<string, any> = {};
    subjects.forEach((s: any) => { m[s.id] = s; });
    return m;
  }, [subjects]);

  const teacherMap = useMemo(() => {
    const m: Record<string, any> = {};
    teachers.forEach((t: any) => { m[t.id] = t; });
    return m;
  }, [teachers]);

  // Per-subject latest progress aggregation
  const perSubject = useMemo(() => {
    const map: Record<string, { subject_id: string; entries: number; minutes: number; latest_progress: number }> = {};
    rows.forEach((r: any) => {
      if (!map[r.subject_id]) {
        map[r.subject_id] = { subject_id: r.subject_id, entries: 0, minutes: 0, latest_progress: 0 };
      }
      map[r.subject_id].entries++;
      map[r.subject_id].minutes += Number(r.duration_minutes || 0);
      map[r.subject_id].latest_progress = Math.max(map[r.subject_id].latest_progress, Number(r.progress_percent || 0));
    });
    return Object.values(map);
  }, [rows]);

  const sessionName = sessions.find((s: any) => s.id === sessionId);
  const className = classes.find((c: any) => c.id === classId);

  const handlePDF = () => {
    if (!rows.length) return;
    generateBilingualReport(
      {
        institution_name: ws.institution_name || '',
        institution_name_en: ws.institution_name_en || '',
        address: ws.address || '',
        phone: ws.phone || '',
        email: ws.email || '',
        logo_url: ws.logo_url,
        report_title_bn: 'সিলেবাস কভারেজ রিপোর্ট',
        report_title_en: 'Syllabus Coverage Report',
        period_label_bn: `${sessionName?.name_bn || sessionName?.name || ''} • ${className?.name_bn || ''} • ${fromDate} → ${toDate}`,
        period_label_en: `${sessionName?.name || ''} • ${className?.name || ''} • ${fromDate} → ${toDate}`,
      },
      [
        {
          title_bn: 'বিষয়ভিত্তিক অগ্রগতি',
          title_en: 'Subject-wise Progress',
          headers: [
            { bn: 'বিষয়', en: 'Subject' },
            { bn: 'মোট ক্লাস', en: 'Classes' },
            { bn: 'মোট সময় (মিনিট)', en: 'Total Mins' },
            { bn: 'অগ্রগতি (%)', en: 'Progress %' },
          ],
          rows: perSubject.map(p => [
            bn ? (subjMap[p.subject_id]?.name_bn || subjMap[p.subject_id]?.name || '-') : (subjMap[p.subject_id]?.name || subjMap[p.subject_id]?.name_bn || '-'),
            p.entries,
            p.minutes,
            p.latest_progress.toFixed(1) + '%',
          ]),
        },
        {
          title_bn: 'বিস্তারিত পাঠদান লগ',
          title_en: 'Detailed Coverage Log',
          headers: [
            { bn: 'তারিখ', en: 'Date' },
            { bn: 'বিষয়', en: 'Subject' },
            { bn: 'শিক্ষক', en: 'Teacher' },
            { bn: 'অধ্যায়', en: 'Chapter' },
            { bn: 'টপিক', en: 'Topic' },
            { bn: 'অগ্রগতি', en: 'Progress' },
          ],
          rows: rows.map((r: any) => [
            new Date(r.coverage_date).toLocaleDateString(bn ? 'bn-BD' : 'en-GB'),
            bn ? (subjMap[r.subject_id]?.name_bn || subjMap[r.subject_id]?.name || '-') : (subjMap[r.subject_id]?.name || '-'),
            r.teacher_id ? (bn ? (teacherMap[r.teacher_id]?.name_bn || teacherMap[r.teacher_id]?.name_en || '-') : (teacherMap[r.teacher_id]?.name_en || teacherMap[r.teacher_id]?.name_bn || '-')) : '-',
            r.chapter || '-',
            r.topic || '-',
            (r.progress_percent || 0).toFixed(1) + '%',
          ]),
        },
      ],
      [
        { label_bn: 'মোট এন্ট্রি', label_en: 'Total Entries', value: rows.length, tone: 'accent' },
        { label_bn: 'মোট সময় (মিনিট)', label_en: 'Total Minutes', value: rows.reduce((s: number, r: any) => s + Number(r.duration_minutes || 0), 0) },
        { label_bn: 'বিষয় কভার', label_en: 'Subjects Covered', value: perSubject.length, tone: 'positive' },
      ],
    );
  };

  const handleExcel = async () => {
    if (!rows.length) return;
    const XLSX: any = await import('xlsx-js-style');
    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [];

    wsData.push([ws.institution_name || '']);
    wsData.push([ws.address || '']);
    wsData.push([`${bn ? 'ফোন' : 'Phone'}: ${ws.phone || ''} | ${bn ? 'ইমেইল' : 'Email'}: ${ws.email || ''}`]);
    wsData.push([]);
    wsData.push([bn ? 'সিলেবাস কভারেজ রিপোর্ট' : 'Syllabus Coverage Report']);
    wsData.push([`${bn ? 'সেশন' : 'Session'}: ${bn ? (sessionName?.name_bn || sessionName?.name) : sessionName?.name} | ${bn ? 'ক্লাস' : 'Class'}: ${bn ? className?.name_bn : className?.name}`]);
    wsData.push([`${bn ? 'সময়কাল' : 'Period'}: ${fromDate} → ${toDate}`]);
    wsData.push([]);

    const headers = [
      bn ? 'তারিখ' : 'Date',
      bn ? 'বিষয়' : 'Subject',
      bn ? 'শিক্ষক' : 'Teacher',
      bn ? 'অধ্যায়' : 'Chapter',
      bn ? 'টপিক' : 'Topic',
      bn ? 'পৃষ্ঠা' : 'Pages',
      bn ? 'সময় (মিনিট)' : 'Duration (min)',
      bn ? 'অগ্রগতি (%)' : 'Progress %',
      bn ? 'মন্তব্য' : 'Notes',
    ];
    wsData.push(headers);
    rows.forEach((r: any) => wsData.push([
      new Date(r.coverage_date).toLocaleDateString(bn ? 'bn-BD' : 'en-GB'),
      bn ? (subjMap[r.subject_id]?.name_bn || '-') : (subjMap[r.subject_id]?.name || '-'),
      r.teacher_id ? (bn ? (teacherMap[r.teacher_id]?.name_bn || '-') : (teacherMap[r.teacher_id]?.name_en || '-')) : '-',
      r.chapter || '-',
      r.topic || '-',
      r.pages_covered || '-',
      r.duration_minutes || 0,
      Number(r.progress_percent || 0).toFixed(1) + '%',
      r.notes || '',
    ]));

    const sheet = XLSX.utils.aoa_to_sheet(wsData);
    sheet['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 25 }];

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

    XLSX.utils.book_append_sheet(wb, sheet, bn ? 'সিলেবাস' : 'Syllabus');
    XLSX.writeFile(wb, `syllabus_coverage_${sessionName?.name || ''}_${className?.name || ''}_${fromDate}_${toDate}.xlsx`);
  };

  const openNew = () => {
    setEditing({ ...emptyRow(), session_id: sessionId, class_id: classId });
    setEditOpen(true);
  };

  const openEdit = (r: any) => {
    setEditing({
      id: r.id,
      session_id: r.session_id,
      class_id: r.class_id,
      subject_id: r.subject_id,
      teacher_id: r.teacher_id,
      coverage_date: r.coverage_date,
      chapter: r.chapter || '',
      topic: r.topic || '',
      pages_covered: r.pages_covered || '',
      duration_minutes: r.duration_minutes,
      progress_percent: Number(r.progress_percent || 0),
      notes: r.notes || '',
    });
    setEditOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5 text-primary" />
            {bn ? 'সিলেবাস কভারেজ রিপোর্ট' : 'Syllabus Coverage Report'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{bn ? 'সেশন' : 'Session'} *</label>
              <Select value={sessionId} onValueChange={(v) => { setSessionId(v); setClassId(''); setSubjectId('all'); }}>
                <SelectTrigger><SelectValue placeholder={bn ? 'সেশন' : 'Session'} /></SelectTrigger>
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
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{bn ? 'শ্রেণী' : 'Class'} *</label>
              <Select value={classId} onValueChange={(v) => { setClassId(v); setSubjectId('all'); }} disabled={!sessionId}>
                <SelectTrigger><SelectValue placeholder={bn ? 'ক্লাস' : 'Class'} /></SelectTrigger>
                <SelectContent>
                  {classes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{bn ? 'বিষয়' : 'Subject'}</label>
              <Select value={subjectId} onValueChange={setSubjectId} disabled={!classId}>
                <SelectTrigger><SelectValue placeholder={bn ? 'সব' : 'All'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{bn ? 'সব বিষয়' : 'All subjects'}</SelectItem>
                  {subjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn : s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{bn ? 'শিক্ষক' : 'Teacher'}</label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger><SelectValue placeholder={bn ? 'সব' : 'All'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{bn ? 'সব শিক্ষক' : 'All teachers'}</SelectItem>
                  {teachers.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{bn ? (t.name_bn || t.name_en) : (t.name_en || t.name_bn)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{bn ? 'শুরু' : 'From'}</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{bn ? 'শেষ' : 'To'}</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          {sessionId && classId && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
              <div className="text-sm text-muted-foreground">
                {isLoading ? (bn ? 'লোড হচ্ছে...' : 'Loading...') : (
                  <span><strong className="text-foreground">{rows.length}</strong> {bn ? 'এন্ট্রি' : 'entries'} • <strong className="text-foreground">{perSubject.length}</strong> {bn ? 'বিষয়' : 'subjects'}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={openNew}>
                  <Plus className="h-4 w-4 mr-1" />{bn ? 'নতুন এন্ট্রি' : 'New Entry'}
                </Button>
                <Button size="sm" variant="outline" onClick={handlePDF} disabled={!rows.length}>
                  <FileText className="h-4 w-4 mr-1" />PDF
                </Button>
                <Button size="sm" variant="outline" onClick={handleExcel} disabled={!rows.length}>
                  <Download className="h-4 w-4 mr-1" />{bn ? 'এক্সেল' : 'Excel'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subject-wise progress summary */}
      {sessionId && classId && perSubject.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{bn ? 'বিষয়ভিত্তিক অগ্রগতি' : 'Subject-wise Progress'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {perSubject.map(p => (
                <div key={p.subject_id} className="p-3 rounded-2xl border bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold">{bn ? subjMap[p.subject_id]?.name_bn : subjMap[p.subject_id]?.name}</p>
                    <Badge variant="outline" className="text-[10px]">{p.latest_progress.toFixed(1)}%</Badge>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, p.latest_progress)}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {p.entries} {bn ? 'ক্লাস' : 'classes'} • {p.minutes} {bn ? 'মিনিট' : 'min'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail table */}
      {sessionId && classId && (
        <Card>
          <CardContent className="p-0">
            {rows.length === 0 && !isLoading ? (
              <div className="p-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{bn ? 'কোনো সিলেবাস কভারেজ এন্ট্রি নেই' : 'No syllabus coverage entries'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                      <TableHead>{bn ? 'বিষয়' : 'Subject'}</TableHead>
                      <TableHead>{bn ? 'শিক্ষক' : 'Teacher'}</TableHead>
                      <TableHead>{bn ? 'অধ্যায়' : 'Chapter'}</TableHead>
                      <TableHead>{bn ? 'টপিক' : 'Topic'}</TableHead>
                      <TableHead className="text-center">{bn ? 'মিনিট' : 'Min'}</TableHead>
                      <TableHead className="text-center">{bn ? 'অগ্রগতি' : 'Progress'}</TableHead>
                      <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r: any) => (
                      <TableRow key={r.id} className="hover:bg-muted/30">
                        <TableCell className="text-sm">{new Date(r.coverage_date).toLocaleDateString(bn ? 'bn-BD' : 'en-GB')}</TableCell>
                        <TableCell className="font-medium">{bn ? (subjMap[r.subject_id]?.name_bn || '-') : (subjMap[r.subject_id]?.name || '-')}</TableCell>
                        <TableCell className="text-sm">{r.teacher_id ? (bn ? (teacherMap[r.teacher_id]?.name_bn || '-') : (teacherMap[r.teacher_id]?.name_en || '-')) : '-'}</TableCell>
                        <TableCell className="text-sm">{r.chapter || '-'}</TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{r.topic || '-'}</TableCell>
                        <TableCell className="text-center text-sm">{r.duration_minutes || '-'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px]">{Number(r.progress_percent || 0).toFixed(1)}%</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => {
                              if (confirm(bn ? 'মুছে ফেলবেন?' : 'Delete this entry?')) deleteMutation.mutate(r.id);
                            }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{bn ? 'সিলেবাস কভারেজ দেখতে উপরে সেশন এবং ক্লাস নির্বাচন করুন' : 'Select session and class above to view syllabus coverage'}</p>
          </CardContent>
        </Card>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? (bn ? 'এন্ট্রি সম্পাদনা' : 'Edit Entry') : (bn ? 'নতুন কভারেজ এন্ট্রি' : 'New Coverage Entry')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">{bn ? 'সেশন' : 'Session'} *</label>
              <Select value={editing.session_id} onValueChange={(v) => setEditing({ ...editing, session_id: v })}>
                <SelectTrigger><SelectValue placeholder={bn ? 'সেশন বাছাই' : 'Select session'} /></SelectTrigger>
                <SelectContent>
                  {sessions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{bn ? (s.name_bn || s.name) : s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{bn ? 'শ্রেণী' : 'Class'} *</label>
              <Select value={editing.class_id} onValueChange={(v) => setEditing({ ...editing, class_id: v, subject_id: '' })}>
                <SelectTrigger><SelectValue placeholder={bn ? 'ক্লাস বাছাই' : 'Select class'} /></SelectTrigger>
                <SelectContent>
                  {classes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{bn ? 'তারিখ' : 'Date'} *</label>
              <Input type="date" value={editing.coverage_date} onChange={(e) => setEditing({ ...editing, coverage_date: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{bn ? 'বিষয়' : 'Subject'} *</label>
              <Select value={editing.subject_id} onValueChange={(v) => setEditing({ ...editing, subject_id: v })} disabled={!editing.class_id}>
                <SelectTrigger><SelectValue placeholder={bn ? 'বিষয় বাছাই' : 'Select subject'} /></SelectTrigger>
                <SelectContent>
                  {editSubjects.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      {bn ? 'এই ক্লাসে কোনো বিষয় নেই' : 'No subjects for this class'}
                    </div>
                  ) : editSubjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn : s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium mb-1 block">{bn ? 'শিক্ষক' : 'Teacher'}</label>
              <Select value={editing.teacher_id || 'none'} onValueChange={(v) => setEditing({ ...editing, teacher_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder={bn ? 'শিক্ষক বাছাই' : 'Select teacher'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{bn ? 'কেউ না' : 'None'}</SelectItem>
                  {teachers.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{bn ? (t.name_bn || t.name_en) : (t.name_en || t.name_bn)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{bn ? 'অধ্যায়' : 'Chapter'}</label>
              <Input value={editing.chapter} onChange={(e) => setEditing({ ...editing, chapter: e.target.value })} placeholder={bn ? 'অধ্যায়ের নাম/সংখ্যা' : 'Chapter name/number'} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{bn ? 'পৃষ্ঠা' : 'Pages'}</label>
              <Input value={editing.pages_covered} onChange={(e) => setEditing({ ...editing, pages_covered: e.target.value })} placeholder="e.g. 12-25" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium mb-1 block">{bn ? 'টপিক / কী পড়ানো হয়েছে' : 'Topic / What was taught'}</label>
              <Textarea value={editing.topic} onChange={(e) => setEditing({ ...editing, topic: e.target.value })} rows={2} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{bn ? 'সময় (মিনিট)' : 'Duration (minutes)'}</label>
              <Input type="number" value={editing.duration_minutes ?? ''} onChange={(e) => setEditing({ ...editing, duration_minutes: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{bn ? 'মোট অগ্রগতি (%)' : 'Total Progress (%)'}</label>
              <Input type="number" min={0} max={100} step={0.1} value={editing.progress_percent} onChange={(e) => setEditing({ ...editing, progress_percent: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium mb-1 block">{bn ? 'মন্তব্য' : 'Notes'}</label>
              <Textarea value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button
              onClick={() => {
                if (!editing.session_id) { toast.error(bn ? 'সেশন বাছাই করুন' : 'Please select a session'); return; }
                if (!editing.class_id) { toast.error(bn ? 'ক্লাস বাছাই করুন' : 'Please select a class'); return; }
                if (!editing.subject_id) { toast.error(bn ? 'বিষয় বাছাই করুন' : 'Please select a subject'); return; }
                saveMutation.mutate(editing);
              }}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (bn ? 'সংরক্ষণ...' : 'Saving...') : (bn ? 'সংরক্ষণ' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SyllabusCoverageSection;
