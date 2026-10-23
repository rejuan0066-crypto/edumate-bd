import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGradingSystem } from '@/hooks/useGradingSystem';
import { Trophy, Medal, TrendingUp, Award, Crown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SearchableSelect from '@/components/SearchableSelect';
import { Card } from '@/components/ui/card';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';
import MeritApprovalBanner, { type ApprovalStatus } from '@/components/admin/MeritApprovalBanner';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { generateMeritApprovalReport } from '@/lib/meritApprovalReport';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const toBnDigits = (s: string | number) => String(s).replace(/\d/g, (d) => BN_DIGITS[parseInt(d)]);

interface StudentRanking {
  studentId: string;
  name: string;
  rollNumber: number | null;
  totalMarks: number;
  grade: string;
  gpa: string;
  rank: number;
  hasFail: boolean;
  graced?: boolean;
}

const AdminMeritList = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { getOverallGrade } = useGradingSystem();

  const [examYear, setExamYear] = useState('');
  const [examSessionId, setExamSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [progressStudentId, setProgressStudentId] = useState('');

  const { data: academicSessions = [] } = useQuery({
    queryKey: ['academic-sessions-merit'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_sessions').select('*').eq('is_active', true).order('name', { ascending: false });
      return data || [];
    },
  });

  const { data: examSessions = [] } = useQuery({
    queryKey: ['exam-sessions-merit', examYear],
    queryFn: async () => {
      const { data } = await supabase.from('exam_sessions').select('*').eq('academic_session_id', examYear).eq('is_active', true).order('name');
      return data || [];
    },
    enabled: !!examYear,
  });

  const { data: examClasses = [] } = useQuery({
    queryKey: ['exam-classes-merit', examSessionId],
    queryFn: async () => {
      const { data } = await supabase.from('exam_session_classes').select('*, classes(*)').eq('exam_session_id', examSessionId);
      return data?.map((ec: any) => ec.classes).filter(Boolean) || [];
    },
    enabled: !!examSessionId,
  });

  // Class-wide ranking data
  const { data: rankingData, isLoading: loadingRankings } = useQuery({
    queryKey: ['merit-ranking', examSessionId, classId],
    queryFn: async () => {
      const { data: studentLinks } = await supabase
        .from('exam_session_students')
        .select('student_id, students(*)')
        .eq('exam_session_id', examSessionId)
        .eq('class_id', classId);

      const students = studentLinks?.map((s: any) => s.students).filter(Boolean) || [];
      if (!students.length) return { rankings: [] as StudentRanking[], subjects: [], subjectMarks: {} as Record<string, Record<string, number>> };

      const { data: subjectLinks } = await supabase
        .from('exam_session_subjects')
        .select('subject_id, subjects(*)')
        .eq('exam_session_id', examSessionId);

      const cls = examClasses.find((c: any) => c.id === classId);
      const divId = cls?.division_id;
      const subjects = (subjectLinks?.map((s: any) => s.subjects).filter(Boolean) || [])
        .filter((s: any) => s.division_id === divId || s.class_id === classId);

      const { data: results } = await supabase
        .from('results')
        .select('*')
        .eq('exam_id', examSessionId)
        .in('student_id', students.map((s: any) => s.id));

      const subjectMarks: Record<string, Record<string, number>> = {};
      results?.forEach((r: any) => {
        if (!subjectMarks[r.student_id]) subjectMarks[r.student_id] = {};
        subjectMarks[r.student_id][r.subject_id] = r.marks ?? 0;
      });

      const rankings: StudentRanking[] = students.map((s: any) => {
        const marks = subjects.map((sub: any) => subjectMarks[s.id]?.[sub.id] ?? 0);
        const total = marks.reduce((a: number, b: number) => a + b, 0);
        const overall = getOverallGrade(marks, s.class_id);
        return {
          studentId: s.id,
          name: bn ? s.name_bn : (s.name_en || s.name_bn),
          rollNumber: s.roll_number,
          totalMarks: total,
          grade: overall.grade,
          gpa: overall.gpa,
          rank: 0,
          hasFail: overall.hasFail,
          graced: (overall as any).graced === true,
        };
      });

      // Sort tiers: regular pass first, then grace pass (consideration), then failed.
      // Within the same tier, higher total marks rank first — a grace-passed
      // student can never outrank a student who passed every subject.
      const tierOf = (r: StudentRanking) => (r.hasFail ? 2 : r.graced ? 1 : 0);
      rankings.sort((a, b) => {
        const tierDiff = tierOf(a) - tierOf(b);
        if (tierDiff !== 0) return tierDiff;
        return b.totalMarks - a.totalMarks;
      });

      // Assign ranks (only to passing students; ties share a rank within the same tier)
      let currentRank = 0;
      let lastTotal = -1;
      let lastTier = -1;
      rankings.forEach((r, idx) => {
        if (r.hasFail) {
          r.rank = 0;
        } else {
          const tier = tierOf(r);
          if (r.totalMarks !== lastTotal || tier !== lastTier) {
            currentRank = idx + 1;
            lastTotal = r.totalMarks;
            lastTier = tier;
          }
          r.rank = currentRank;
        }
      });

      return { rankings, subjects, subjectMarks };
    },
    enabled: !!examSessionId && !!classId && examClasses.length > 0,
  });

  // Subject-wise toppers
  const subjectToppers = useMemo(() => {
    if (!rankingData?.subjects?.length) return [];
    return rankingData.subjects.map((sub: any) => {
      const scored = rankingData.rankings
        .map(r => ({ ...r, subjectMark: rankingData.subjectMarks[r.studentId]?.[sub.id] ?? 0 }))
        .sort((a, b) => b.subjectMark - a.subjectMark)
        .slice(0, 3);
      return { subject: sub, toppers: scored };
    });
  }, [rankingData]);

  // Term-by-term progress for a single student
  const { data: progressData = [] } = useQuery({
    queryKey: ['student-progress', progressStudentId, examYear],
    queryFn: async () => {
      // Fetch all exam sessions in this year that have results for this student
      const sessionIds = examSessions.map((es: any) => es.id);
      if (!sessionIds.length) return [];

      const { data: results } = await supabase
        .from('results')
        .select('exam_id, marks')
        .eq('student_id', progressStudentId)
        .in('exam_id', sessionIds);

      const grouped: Record<string, number[]> = {};
      results?.forEach((r: any) => {
        if (!grouped[r.exam_id]) grouped[r.exam_id] = [];
        grouped[r.exam_id].push(r.marks ?? 0);
      });

      return examSessions
        .filter((es: any) => grouped[es.id]?.length)
        .map((es: any) => {
          const marks = grouped[es.id];
          const total = marks.reduce((a, b) => a + b, 0);
          return {
            name: bn ? es.name_bn : es.name,
            total,
          };
        });
    },
    enabled: !!progressStudentId && examSessions.length > 0,
  });

  const fmt = (n: number) => bn ? toBnDigits(n.toString()) : n.toString();

  const yearOptions = academicSessions.map((s: any) => ({ value: s.id, label: bn ? (s.name_bn || s.name) : s.name }));
  const sessionOptions = examSessions.map((s: any) => ({ value: s.id, label: bn ? s.name_bn : s.name }));
  const classOptions = examClasses.map((c: any) => ({ value: c.id, label: bn ? c.name_bn : c.name }));
  const studentOptions = (rankingData?.rankings || []).map(r => ({ value: r.studentId, label: r.name }));

  const top3 = (rankingData?.rankings || []).filter(r => !r.hasFail).slice(0, 3);

  // ----- Approval workflow -----
  const queryClient = useQueryClient();
  const { data: approval, isLoading: loadingApproval } = useQuery({
    queryKey: ['merit-approval', examSessionId, classId],
    queryFn: async () => {
      const { data } = await supabase
        .from('merit_list_approvals' as any)
        .select('*')
        .eq('exam_session_id', examSessionId)
        .eq('class_id', classId)
        .maybeSingle();
      return (data as any) || null;
    },
    enabled: !!examSessionId && !!classId,
  });

  // Auto-cleanup any rejected status and reset to 'none' ('অনুমোদনের জন্য পাঠান' state)
  useEffect(() => {
    if (approval?.status === 'rejected' && examSessionId && classId) {
      supabase
        .from('merit_list_approvals' as any)
        .delete()
        .eq('exam_session_id', examSessionId)
        .eq('class_id', classId)
        .then(() => {
          refreshApproval();
        });
    }
  }, [approval?.status, examSessionId, classId]);

  const approvalStatus: ApprovalStatus = (!approval || approval.status === 'rejected') ? 'none' : (approval.status as ApprovalStatus);
  const refreshApproval = () => queryClient.invalidateQueries({ queryKey: ['merit-approval', examSessionId, classId] });

  const callRpc = async (fn: string, args: Record<string, unknown>, successMsg: string) => {
    const { error } = await (supabase as any).rpc(fn, args);
    if (error) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: error.message, variant: 'destructive' });
      throw error;
    }
    toast({ title: successMsg });
    refreshApproval();
  };

  const handleSubmitApproval = () =>
    callRpc('submit_merit_list_for_approval',
      { p_exam_session_id: examSessionId, p_class_id: classId },
      bn ? 'অনুমোদনের জন্য পাঠানো হয়েছে' : 'Submitted for approval');

  const handleApprove = () =>
    callRpc('approve_merit_list',
      { p_exam_session_id: examSessionId, p_class_id: classId },
      bn ? 'মেধা তালিকা অনুমোদিত' : 'Merit list approved');

  const handleReject = (reason: string) =>
    callRpc('reject_merit_list',
      { p_exam_session_id: examSessionId, p_class_id: classId, p_reason: reason },
      bn ? 'মেধা তালিকা প্রত্যাখ্যাত' : 'Merit list rejected');

  const handleResetApproval = async () => {
    try {
      const { error } = await supabase
        .from('merit_list_approvals' as any)
        .delete()
        .eq('exam_session_id', examSessionId)
        .eq('class_id', classId);
      if (error) throw error;
      toast({ title: bn ? 'মেধা তালিকা স্ট্যাটাস ফ্রেশ করা হয়েছে' : 'Merit list status reset to fresh' });
      refreshApproval();
    } catch (err: any) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // ----- Print approval report -----
  const { data: institution } = useInstitutionInfo();

  const resolveUserName = async (userId?: string | null): Promise<string | null> => {
    if (!userId) return null;
    const { data } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .maybeSingle();
    return (data as any)?.full_name || (data as any)?.email || null;
  };

  const handlePrintApprovalReport = async () => {
    if (!rankingData?.rankings?.length || !approval) return;
    const examSessionLabel = examSessions.find((e: any) => e.id === examSessionId);
    const academicYearLabel = academicSessions.find((a: any) => a.id === examYear);
    const classLabel = examClasses.find((c: any) => c.id === classId);

    const [submittedByName, decidedByName] = await Promise.all([
      resolveUserName(approval.submitted_by),
      resolveUserName(approval.decided_by),
    ]);

    generateMeritApprovalReport({
      institution: {
        name: institution?.name || '',
        name_en: institution?.name_en,
        address: institution?.address,
        phone: institution?.phone,
        email: institution?.email,
        logo_url: institution?.logo_url,
      },
      academicYear: (bn ? (academicYearLabel?.name_bn || academicYearLabel?.name) : academicYearLabel?.name) || '',
      examSession: (bn ? examSessionLabel?.name_bn : examSessionLabel?.name) || '',
      className: (bn ? classLabel?.name_bn : classLabel?.name) || '',
      approval: {
        status: approvalStatus,
        decided_at: approval.decided_at,
        submitted_at: approval.submitted_at,
        rejection_reason: approval.rejection_reason,
        decided_by_name: decidedByName,
        submitted_by_name: submittedByName,
      },
      rankings: rankingData.rankings,
      bn,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{bn ? 'মেধা তালিকা ও র‍্যাংকিং' : 'Merit List & Ranking'}</h1>
            <p className="text-sm text-muted-foreground">{bn ? 'অটো ক্লাস র‍্যাংক, বিষয়ভিত্তিক টপার এবং প্রগতি বিশ্লেষণ' : 'Auto class rank, subject toppers and progress analytics'}</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-5 rounded-[28px]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{bn ? 'শিক্ষাবর্ষ' : 'Academic Year'}</label>
              <SearchableSelect
                value={examYear}
                onValueChange={(v) => { setExamYear(v); setExamSessionId(''); setClassId(''); setProgressStudentId(''); }}
                options={yearOptions}
                placeholder={bn ? 'নির্বাচন করুন' : 'Select'}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{bn ? 'পরীক্ষা সেশন' : 'Exam Session'}</label>
              <SearchableSelect
                value={examSessionId}
                onValueChange={(v) => { setExamSessionId(v); setClassId(''); }}
                options={sessionOptions}
                placeholder={bn ? 'নির্বাচন করুন' : 'Select'}
                disabled={!examYear}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{bn ? 'শ্রেণী' : 'Class'}</label>
              <SearchableSelect
                value={classId}
                onValueChange={setClassId}
                options={classOptions}
                placeholder={bn ? 'নির্বাচন করুন' : 'Select'}
                disabled={!examSessionId}
              />
            </div>
          </div>
        </Card>

        {classId && (
          <div className="space-y-3">
            <MeritApprovalBanner
              status={approvalStatus}
              rejectionReason={approval?.rejection_reason}
              decidedAt={approval?.decided_at}
              loading={loadingApproval}
              onSubmit={handleSubmitApproval}
              onApprove={handleApprove}
              onReject={handleReject}
              onReset={handleResetApproval}
            />
            {approvalStatus === 'approved' && (rankingData?.rankings?.length ?? 0) > 0 && (
              <div className="flex justify-end">
                <Button onClick={handlePrintApprovalReport} className="rounded-full" variant="outline">
                  <Printer className="w-4 h-4 mr-1.5" />
                  {bn ? 'অনুমোদন প্রতিবেদন প্রিন্ট' : 'Print Approval Report'}
                </Button>
              </div>
            )}
          </div>
        )}

        {!classId && (
          <Card className="p-12 rounded-[28px] text-center">
            <Trophy className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">{bn ? 'মেধা তালিকা দেখতে শিক্ষাবর্ষ, পরীক্ষা ও শ্রেণী নির্বাচন করুন' : 'Select year, exam and class to view merit list'}</p>
          </Card>
        )}

        {classId && loadingRankings && (
          <Card className="p-12 rounded-[28px] text-center">
            <p className="text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</p>
          </Card>
        )}

        {classId && !loadingRankings && rankingData?.rankings?.length === 0 && (
          <Card className="p-12 rounded-[28px] text-center">
            <p className="text-muted-foreground">{bn ? 'এই শ্রেণীর জন্য কোনো ফলাফল পাওয়া যায়নি' : 'No results found for this class'}</p>
          </Card>
        )}

        {classId && !loadingRankings && (rankingData?.rankings?.length ?? 0) > 0 && (
          <>
            {/* Top 3 podium */}
            {top3.length > 0 && (
              <Card className="p-6 rounded-[28px] bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-orange-500/5">
                <h3 className="font-display font-semibold text-foreground mb-5 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  {bn ? 'শীর্ষ ৩ মেধাবী' : 'Top 3 Achievers'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {top3.map((r, i) => {
                    const colors = [
                      'from-amber-400 to-yellow-500',
                      'from-slate-300 to-slate-400',
                      'from-orange-400 to-orange-600',
                    ];
                    const icons = [Crown, Medal, Award];
                    const Icon = icons[i];
                    return (
                      <div key={r.studentId} className={`relative rounded-[22px] p-5 bg-gradient-to-br ${colors[i]} text-white shadow-lg`}>
                        <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full w-9 h-9 flex items-center justify-center font-bold">
                          {fmt(r.rank)}
                        </div>
                        <Icon className="w-8 h-8 mb-3 opacity-90" />
                        <div className="font-display font-bold text-lg leading-tight">{r.name}</div>
                        <div className="text-sm opacity-90 mt-1">{bn ? 'রোল' : 'Roll'}: {fmt(r.rollNumber || 0)}</div>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-2xl font-bold">{fmt(r.totalMarks)}</span>
                          <span className="text-sm opacity-90">{bn ? 'মোট নম্বর' : 'Total'}</span>
                        </div>
                        <div className="text-sm opacity-90">GPA: {r.gpa} ({r.grade})</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            <Tabs defaultValue="rank" className="w-full">
              <TabsList className="grid w-full grid-cols-3 rounded-[20px] p-1">
                <TabsTrigger value="rank" className="rounded-[16px]">{bn ? 'ক্লাস র‍্যাংক' : 'Class Rank'}</TabsTrigger>
                <TabsTrigger value="toppers" className="rounded-[16px]">{bn ? 'বিষয়ভিত্তিক টপার' : 'Subject Toppers'}</TabsTrigger>
                <TabsTrigger value="progress" className="rounded-[16px]">{bn ? 'প্রগতি গ্রাফ' : 'Progress Chart'}</TabsTrigger>
              </TabsList>

              {/* Class Rank Table */}
              <TabsContent value="rank" className="mt-4">
                <Card className="p-5 rounded-[28px]">
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ borderSpacing: '0 8px', borderCollapse: 'separate' }}>
                      <thead>
                        <tr className="text-xs text-muted-foreground">
                          <th className="px-4 py-2 text-left">{bn ? 'র‍্যাংক' : 'Rank'}</th>
                          <th className="px-4 py-2 text-left">{bn ? 'ছাত্রের নাম' : 'Student Name'}</th>
                          <th className="px-4 py-2 text-left">{bn ? 'রোল' : 'Roll'}</th>
                          <th className="px-4 py-2 text-right">{bn ? 'মোট নম্বর' : 'Total Marks'}</th>
                          <th className="px-4 py-2 text-center">GPA</th>
                          <th className="px-4 py-2 text-center">{bn ? 'গ্রেড' : 'Grade'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankingData!.rankings.map((r) => (
                          <tr key={r.studentId} className="bg-muted/30 hover:bg-muted/60 transition-colors">
                            <td className="px-4 py-3 rounded-l-[20px]">
                              {r.hasFail ? (
                                <span className="text-xs text-destructive">—</span>
                              ) : r.rank <= 3 ? (
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-white text-sm ${
                                  r.rank === 1 ? 'bg-amber-500' : r.rank === 2 ? 'bg-slate-400' : 'bg-orange-500'
                                }`}>{fmt(r.rank)}</span>
                              ) : (
                                <span className="font-semibold text-foreground">{fmt(r.rank)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{fmt(r.rollNumber || 0)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-foreground">{fmt(r.totalMarks)}</td>
                            <td className="px-4 py-3 text-center font-semibold text-foreground">{r.gpa}</td>
                            <td className="px-4 py-3 text-center rounded-r-[20px]">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                r.hasFail ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                              }`}>{r.grade}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>

              {/* Subject-wise Toppers */}
              <TabsContent value="toppers" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjectToppers.map(({ subject, toppers }) => (
                    <Card key={subject.id} className="p-5 rounded-[24px]">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                        <Award className="w-5 h-5 text-primary" />
                        <h4 className="font-display font-semibold text-foreground">{bn ? subject.name_bn : (subject.name || subject.name_bn)}</h4>
                      </div>
                      <div className="space-y-3">
                        {toppers.map((t, i) => (
                          <div key={t.studentId} className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${
                              i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : 'bg-orange-500'
                            }`}>{fmt(i + 1)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground text-sm truncate">{t.name}</div>
                              <div className="text-xs text-muted-foreground">{bn ? 'রোল' : 'Roll'}: {fmt(t.rollNumber || 0)}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-primary">{fmt(t.subjectMark)}</div>
                            </div>
                          </div>
                        ))}
                        {toppers.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-3">{bn ? 'কোনো ডেটা নেই' : 'No data'}</p>
                        )}
                      </div>
                    </Card>
                  ))}
                  {subjectToppers.length === 0 && (
                    <Card className="p-8 rounded-[24px] col-span-full text-center">
                      <p className="text-muted-foreground">{bn ? 'কোনো বিষয় পাওয়া যায়নি' : 'No subjects found'}</p>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Progress Chart */}
              <TabsContent value="progress" className="mt-4">
                <Card className="p-5 rounded-[28px]">
                  <div className="mb-5 max-w-md">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{bn ? 'ছাত্র নির্বাচন করুন' : 'Select Student'}</label>
                    <SearchableSelect
                      value={progressStudentId}
                      onValueChange={setProgressStudentId}
                      options={studentOptions}
                      placeholder={bn ? 'ছাত্র খুঁজুন' : 'Search student'}
                    />
                  </div>

                  {!progressStudentId ? (
                    <div className="text-center py-12">
                      <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">{bn ? 'প্রগতি দেখতে ছাত্র নির্বাচন করুন' : 'Select a student to view progress'}</p>
                    </div>
                  ) : progressData.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground text-sm">{bn ? 'এই ছাত্রের একাধিক টার্মের ফলাফল পাওয়া যায়নি' : 'No multi-term data found for this student'}</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        <div className="p-4 rounded-[20px] bg-primary/5">
                          <div className="text-xs text-muted-foreground">{bn ? 'মোট পরীক্ষা' : 'Total Exams'}</div>
                          <div className="text-2xl font-bold text-primary mt-1">{fmt(progressData.length)}</div>
                        </div>
                        <div className="p-4 rounded-[20px] bg-emerald-500/5">
                          <div className="text-xs text-muted-foreground">{bn ? 'সর্বোচ্চ মোট' : 'Highest Total'}</div>
                          <div className="text-2xl font-bold text-emerald-600 mt-1">{fmt(Math.max(...progressData.map(d => d.total)))}</div>
                        </div>
                        <div className="p-4 rounded-[20px] bg-amber-500/5">
                          <div className="text-xs text-muted-foreground">{bn ? 'সর্বনিম্ন মোট' : 'Lowest Total'}</div>
                          <div className="text-2xl font-bold text-amber-600 mt-1">{fmt(Math.min(...progressData.map(d => d.total)))}</div>
                        </div>
                        <div className="p-4 rounded-[20px] bg-sky-500/5">
                          <div className="text-xs text-muted-foreground">{bn ? 'প্রবণতা' : 'Trend'}</div>
                          <div className="text-2xl font-bold text-sky-600 mt-1">
                            {progressData.length >= 2 && progressData[progressData.length - 1].total > progressData[0].total
                              ? '↗' : progressData.length >= 2 && progressData[progressData.length - 1].total < progressData[0].total ? '↘' : '→'}
                          </div>
                        </div>
                      </div>

                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={progressData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                            <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '12px',
                              }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} name={bn ? 'মোট নম্বর' : 'Total'} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminMeritList;
