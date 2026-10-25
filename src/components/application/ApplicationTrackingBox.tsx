import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search, Loader2, CheckCircle, Clock, AlertCircle,
  Download, Printer, Copy, User, Calendar, BookOpen, Briefcase, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import {
  buildStudentApplicationHTML,
  buildStaffApplicationHTML,
  downloadHTMLAsPDF,
  printHTML
} from '@/lib/applicationSlipGenerator';

interface ApplicationTrackingBoxProps {
  targetType: 'student' | 'staff';
  onSwitchToApply?: () => void;
}

export const ApplicationTrackingBox: React.FC<ApplicationTrackingBoxProps> = ({
  targetType,
  onSwitchToApply
}) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [queryInput, setQueryInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [result, setResult] = useState<{
    type: 'student' | 'staff';
    data: any;
  } | null>(null);

  const { data: institution } = useQuery({
    queryKey: ['institution-info-tracking-box'],
    queryFn: async () => fetchInstitutionInfo(),
    staleTime: 10 * 60 * 1000,
  });

  const performSearch = async () => {
    const raw = queryInput.trim();
    if (!raw) {
      toast.error(
        bn
          ? 'অনুগ্রহ করে আবেদন নম্বর বা মোবাইল নম্বর লিখুন'
          : 'Please enter Application ID or Mobile number'
      );
      return;
    }

    const cleanQ = raw.replace(/[-\s]/g, '').toUpperCase();
    setIsSearching(true);
    setHasSearched(true);
    setResult(null);

    try {
      if (targetType === 'staff') {
        // Search Staff
        const { data: staffList, error: stfErr } = await supabase
          .from('staff')
          .select('*')
          .or(`staff_id.ilike.%${cleanQ}%,application_no.ilike.%${cleanQ}%,phone.ilike.%${cleanQ}%,mobile.ilike.%${cleanQ}%,staff_data->>application_no.ilike.%${cleanQ}%`)
          .limit(1);

        if (!stfErr && staffList && staffList.length > 0) {
          setResult({ type: 'staff', data: staffList[0] });
          setIsSearching(false);
          return;
        }
      } else {
        // Search Student
        const { data: studentList, error: stuErr } = await supabase
          .from('students')
          .select(`
            *,
            classes:class_id(id, name, name_bn),
            divisions:division_id(id, name, name_bn),
            academic_sessions:session_id(id, name)
          `)
          .or(`student_id.ilike.%${cleanQ}%,application_no.ilike.%${cleanQ}%,registration_no.ilike.%${cleanQ}%,roll_number.ilike.%${cleanQ}%,phone.ilike.%${cleanQ}%,father_phone.ilike.%${cleanQ}%`)
          .limit(1);

        if (!stuErr && studentList && studentList.length > 0) {
          setResult({ type: 'student', data: studentList[0] });
          setIsSearching(false);
          return;
        }

        // Fallback for students_public
        const { data: publicStudents } = await supabase
          .from('students_public')
          .select(`
            *,
            classes:class_id(id, name, name_bn),
            divisions:division_id(id, name, name_bn),
            academic_sessions:session_id(id, name)
          `)
          .or(`student_id.ilike.%${cleanQ}%,registration_no.ilike.%${cleanQ}%`)
          .limit(1);

        if (publicStudents && publicStudents.length > 0) {
          setResult({ type: 'student', data: publicStudents[0] });
          setIsSearching(false);
          return;
        }
      }

      setResult(null);
    } catch (err: any) {
      toast.error(err.message || (bn ? 'অনুসন্ধানে সমস্যা হয়েছে' : 'Search error'));
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    setIsDownloading(true);
    try {
      if (result.type === 'student') {
        const appNo = result.data.application_no || result.data.student_id || result.data.id?.slice(0, 8);
        const html = buildStudentApplicationHTML(result.data, institution);
        await downloadHTMLAsPDF(html, `ভর্তি_আবেদন_${appNo}.pdf`);
      } else {
        const appNo = (result.data.staff_data as any)?.application_no || result.data.staff_id || result.data.id?.slice(0, 8);
        const html = buildStaffApplicationHTML(result.data, institution);
        await downloadHTMLAsPDF(html, `নিয়োগ_আবেদন_${appNo}.pdf`);
      }
      toast.success(bn ? 'আবেদনপত্র ডাউনলোড সম্পন্ন হয়েছে' : 'Application downloaded successfully');
    } catch (err: any) {
      toast.error(bn ? 'ডাউনলোড করতে সমস্যা হয়েছে' : 'Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    if (!result) return;
    if (result.type === 'student') {
      const html = buildStudentApplicationHTML(result.data, institution);
      printHTML(html);
    } else {
      const html = buildStaffApplicationHTML(result.data, institution);
      printHTML(html);
    }
  };

  const copyAppId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success(bn ? 'আবেদন নম্বর কপি হয়েছে' : 'Application ID copied');
  };

  const isStudent = targetType === 'student';
  const placeholderText = isStudent
    ? (bn ? 'আবেদন নম্বর দিন (যেমন: ADM20260001 বা মোবাইল নম্বর)' : 'Enter Application ID (e.g. ADM20260001 or mobile)')
    : (bn ? 'স্টাফ আবেদন নম্বর দিন (যেমন: STF20260001 বা মোবাইল নম্বর)' : 'Enter Staff Application ID (e.g. STF20260001 or mobile)');

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="text-center space-y-2">
        <Badge variant="outline" className="px-3 py-0.5 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5 font-semibold">
          {bn ? 'অনলাইন ট্র্যাকিং পোর্টাল' : 'Online Tracking Portal'}
        </Badge>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {isStudent
            ? (bn ? 'ছাত্র আবেদন ট্র্যাকিং ও কপি ডাউনলোড' : 'Student Application Tracking & Slip')
            : (bn ? 'স্টাফ আবেদন ট্র্যাকিং ও কপি ডাউনলোড' : 'Staff Application Tracking & Slip')}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
          {isStudent
            ? (bn ? 'আপনার আবেদন নম্বর (যেমন: ADM20260001) দিয়ে আবেদনের বর্তমান অবস্থা জানুন এবং আবেদনপত্র ডাউনলোড করুন।' : 'Enter your Student Application ID to track progress and download your application slip.')
            : (bn ? 'আপনার স্টাফ আবেদন নম্বর (যেমন: STF20260001) দিয়ে বর্তমান অগ্রগতি জানুন এবং আবেদনপত্র ডাউনলোড করুন।' : 'Enter your Staff Application ID to track progress and download your application slip.')}
        </p>
      </div>

      {/* Search Bar Card */}
      <Card className="rounded-2xl border-border/80 shadow-sm overflow-hidden bg-card">
        <CardContent className="p-4 sm:p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              performSearch();
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder={placeholderText}
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                className="h-11 pl-4 text-sm font-medium rounded-xl border-border/90 focus-visible:ring-emerald-500 bg-background"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="h-11 px-6 font-bold gap-2 btn-primary-gradient shrink-0 rounded-xl"
              disabled={isSearching}
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {bn ? 'স্ট্যাটাস যাচাই' : 'Check Status'}
            </Button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t text-[11px] text-muted-foreground">
            <span>
              💡 {isStudent ? (bn ? 'উদাহরণ: ADM20260001' : 'Example: ADM20260001') : (bn ? 'উদাহরণ: STF20260001' : 'Example: STF20260001')}
            </span>
            {onSwitchToApply && (
              <button
                type="button"
                onClick={onSwitchToApply}
                className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
              >
                {isStudent ? (bn ? '➔ নতুন ভর্তি আবেদন করুন' : '➔ Apply for Admission') : (bn ? '➔ নতুন শিক্ষক/স্টাফ আবেদন করুন' : '➔ Apply for Staff Position')}
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isSearching && (
        <div className="py-12 text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
          <p className="text-xs text-muted-foreground">{bn ? 'আবেদনের তথ্য অনুসন্ধান করা হচ্ছে...' : 'Searching application records...'}</p>
        </div>
      )}

      {/* Not Found */}
      {!isSearching && hasSearched && !result && (
        <div className="p-6 text-center space-y-3 max-w-md mx-auto border border-destructive/20 bg-destructive/5 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            {bn ? 'কোনো আবেদন পাওয়া যায়নি' : 'No Application Found'}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {bn
              ? `"${queryInput}" নম্বরে কোনো সক্রিয় আবেদন রেকর্ড পাওয়া যায়নি। অনুগ্রহ করে সঠিক আবেদন নম্বর দিয়ে পুনরায় চেষ্টা করুন।`
              : `No record matching "${queryInput}". Please verify the ID and try again.`}
          </p>
          <Button variant="outline" size="sm" onClick={() => setQueryInput('')} className="mt-1 text-xs rounded-xl">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            {bn ? 'আবার চেষ্টা করুন' : 'Try Again'}
          </Button>
        </div>
      )}

      {/* Result Card */}
      {!isSearching && result && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {result.type === 'student' ? (() => {
            const s = result.data;
            const isApproved = s.status === 'active' || s.approval_status === 'approved';
            const isRejected = s.approval_status === 'rejected' || s.status === 'inactive';
            const isPending = !isApproved && !isRejected;
            const appNo = s.application_no || s.student_id || s.id?.slice(0, 8);
            const className = s.classes?.name_bn || s.classes?.name || s.admission_class || '—';
            const divName = s.divisions?.name_bn || s.divisions?.name || '—';

            return (
              <Card className="rounded-2xl border-2 border-emerald-500/20 shadow-md overflow-hidden bg-card">
                <div
                  className={`px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b ${
                    isApproved
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-200'
                      : isRejected
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-200'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isApproved ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : isRejected ? (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <h3 className="font-bold text-sm">
                        {isApproved
                          ? (bn ? 'ভর্তি আবেদন অনুমোদিত হয়েছে' : 'Admission Approved')
                          : isRejected
                          ? (bn ? 'আবেদন গৃহীত হয়নি (বাতিল)' : 'Application Rejected')
                          : (bn ? 'আবেদন পর্যালোচনায় রয়েছে (অনুমোদনের অপেক্ষায়)' : 'Application Under Review')}
                      </h3>
                      <p className="text-[11px] opacity-85">
                        {isApproved
                          ? (bn ? 'অভিনন্দন! আপনার ভর্তি আবেদন অনুমোদিত হয়েছে।' : 'Congratulations! Your admission has been approved.')
                          : isRejected
                          ? (bn ? 'দুঃখিত, আপনার আবেদনটি বাতিল করা হয়েছে।' : 'Sorry, your application was rejected.')
                          : (bn ? 'আপনার আবেদনটি সংশ্লিষ্ট কর্তৃপক্ষ যাচাই-বাছাই করছেন।' : 'Your application is awaiting administrative review.')}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`text-xs px-3 py-0.5 font-semibold shrink-0 ${
                      isApproved ? 'bg-emerald-600 text-white' : isRejected ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                    }`}
                  >
                    {isApproved ? (bn ? 'অনুমোদিত' : 'Approved') : isRejected ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অপেক্ষমাণ' : 'Pending')}
                  </Badge>
                </div>

                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl border bg-muted/20">
                    {s.photo_url ? (
                      <img src={s.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover border shadow-sm shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-2xl border shrink-0">
                        {(s.name_bn || s.name || 'S')[0]}
                      </div>
                    )}
                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <h4 className="text-base font-bold text-foreground">{s.name_bn || s.name}</h4>
                      {s.name_en && <p className="text-xs text-muted-foreground">{s.name_en}</p>}
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1 text-xs">
                        <span className="px-2.5 py-0.5 rounded-full bg-background border font-medium">
                          {divName} ➔ {className}
                        </span>
                        {s.roll_number && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
                            {bn ? `রোল: ${s.roll_number}` : `Roll: ${s.roll_number}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl border bg-background">
                      <span className="text-[10px] text-muted-foreground block">{bn ? 'আবেদন নম্বর' : 'Application No'}</span>
                      <div className="flex items-center justify-between font-mono font-bold mt-0.5 text-emerald-700 dark:text-emerald-400">
                        <span>{appNo}</span>
                        <button type="button" onClick={() => copyAppId(appNo)} className="hover:opacity-75">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl border bg-background">
                      <span className="text-[10px] text-muted-foreground block">{bn ? 'অভিভাবকের ফোন' : 'Guardian Phone'}</span>
                      <span className="font-semibold mt-0.5 block">{s.guardian_phone || s.father_phone || s.phone || '—'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl border bg-background col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-muted-foreground block">{bn ? 'আবেদনের তারিখ' : 'Applied Date'}</span>
                      <span className="font-semibold mt-0.5 block">{s.created_at ? new Date(s.created_at).toLocaleDateString('bn-BD') : '—'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 px-4 text-xs font-semibold rounded-xl">
                      <Printer className="w-3.5 h-3.5 mr-1.5" />
                      {bn ? 'প্রিন্ট' : 'Print'}
                    </Button>
                    <Button size="sm" onClick={handleDownload} disabled={isDownloading} className="h-9 px-4 text-xs font-bold rounded-xl btn-primary-gradient">
                      {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                      {bn ? 'আবেদন কপি ডাউনলোড (PDF)' : 'Download Slip (PDF)'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })() : (() => {
            const st = result.data;
            const isApproved = st.status === 'active';
            const isRejected = st.status === 'inactive' || st.status === 'rejected';
            const isPending = !isApproved && !isRejected;
            const appNo = (st.staff_data as any)?.application_no || st.staff_id || st.id?.slice(0, 8);
            const desig = (st.staff_data as any)?.designation || st.designation || '—';

            return (
              <Card className="rounded-2xl border-2 border-emerald-500/20 shadow-md overflow-hidden bg-card">
                <div
                  className={`px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b ${
                    isApproved
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-200'
                      : isRejected
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-200'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isApproved ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : isRejected ? (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <h3 className="font-bold text-sm">
                        {isApproved
                          ? (bn ? 'নিয়োগ আবেদন অনুমোদিত হয়েছে' : 'Staff Application Approved')
                          : isRejected
                          ? (bn ? 'আবেদন গৃহীত হয়নি (বাতিল)' : 'Application Rejected')
                          : (bn ? 'আবেদন পর্যালোচনায় রয়েছে (অনুমোদনের অপেক্ষায়)' : 'Application Under Review')}
                      </h3>
                      <p className="text-[11px] opacity-85">
                        {isApproved
                          ? (bn ? 'অভিনন্দন! আপনার স্টাফ আবেদন অনুমোদিত হয়েছে।' : 'Congratulations! Your staff application has been approved.')
                          : isRejected
                          ? (bn ? 'দুঃখিত, আপনার আবেদনটি বাতিল করা হয়েছে।' : 'Sorry, your application was rejected.')
                          : (bn ? 'আপনার আবেদনটি সংশ্লিষ্ট কর্তৃপক্ষ যাচাই-বাছাই করছেন।' : 'Your application is awaiting administrative review.')}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`text-xs px-3 py-0.5 font-semibold shrink-0 ${
                      isApproved ? 'bg-emerald-600 text-white' : isRejected ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                    }`}
                  >
                    {isApproved ? (bn ? 'অনুমোদিত' : 'Approved') : isRejected ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অপেক্ষমাণ' : 'Pending')}
                  </Badge>
                </div>

                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl border bg-muted/20">
                    {st.photo_url ? (
                      <img src={st.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover border shadow-sm shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-2xl border shrink-0">
                        {(st.name_bn || st.name || 'T')[0]}
                      </div>
                    )}
                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <h4 className="text-base font-bold text-foreground">{st.name_bn || st.name}</h4>
                      {st.name_en && <p className="text-xs text-muted-foreground">{st.name_en}</p>}
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1 text-xs">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
                          {bn ? `আবেদনকৃত পদ: ${desig}` : `Position: ${desig}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl border bg-background">
                      <span className="text-[10px] text-muted-foreground block">{bn ? 'স্টাফ আবেদন নম্বর' : 'Application No'}</span>
                      <div className="flex items-center justify-between font-mono font-bold mt-0.5 text-emerald-700 dark:text-emerald-400">
                        <span>{appNo}</span>
                        <button type="button" onClick={() => copyAppId(appNo)} className="hover:opacity-75">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl border bg-background">
                      <span className="text-[10px] text-muted-foreground block">{bn ? 'মোবাইল নম্বর' : 'Phone'}</span>
                      <span className="font-semibold mt-0.5 block">{st.phone || st.mobile || '—'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl border bg-background col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-muted-foreground block">{bn ? 'আবেদনের তারিখ' : 'Applied Date'}</span>
                      <span className="font-semibold mt-0.5 block">{st.created_at ? new Date(st.created_at).toLocaleDateString('bn-BD') : '—'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="h-9 px-4 text-xs font-semibold rounded-xl">
                      <Printer className="w-3.5 h-3.5 mr-1.5" />
                      {bn ? 'প্রিন্ট' : 'Print'}
                    </Button>
                    <Button size="sm" onClick={handleDownload} disabled={isDownloading} className="h-9 px-4 text-xs font-bold rounded-xl btn-primary-gradient">
                      {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                      {bn ? 'আবেদন কপি ডাউনলোড (PDF)' : 'Download Slip (PDF)'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}
    </div>
  );
};
export default ApplicationTrackingBox;
