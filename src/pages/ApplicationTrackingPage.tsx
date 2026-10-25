import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Printer,
  Copy,
  GraduationCap,
  Briefcase,
  User,
  Phone,
  Calendar,
  BookOpen,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  buildStudentApplicationHTML,
  buildStaffApplicationHTML,
  downloadHTMLAsPDF,
  printHTML,
} from '@/lib/applicationSlipGenerator';

const ApplicationTrackingPage: React.FC = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [searchParams, setSearchParams] = useSearchParams();

  const [queryInput, setQueryInput] = useState(searchParams.get('id') || '');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [result, setResult] = useState<{
    type: 'student' | 'staff';
    data: any;
  } | null>(null);

  // Institution info for PDFs and Headers
  const { data: institution } = useQuery({
    queryKey: ['institution-info-tracking'],
    queryFn: async () => fetchInstitutionInfo(),
  });

  const performSearch = async (targetId?: string) => {
    const raw = (targetId !== undefined ? targetId : queryInput).trim();
    if (!raw) {
      toast.error(bn ? 'অনুগ্রহ করে আবেদন নম্বর বা মোবাইল নম্বর দিন' : 'Please enter Application ID or Mobile number');
      return;
    }

    // Clean query: remove hyphens and spaces
    const cleanQ = raw.replace(/[-\s]/g, '').toUpperCase();
    setIsSearching(true);
    setHasSearched(true);
    setResult(null);

    try {
      // 1. Try Staff lookup if it starts with STF or looks like staff
      if (cleanQ.startsWith('STF')) {
        const { data: staffList, error: stfErr } = await supabase
          .from('staff')
          .select('*')
          .or(`staff_id.ilike.%${cleanQ}%,application_no.ilike.%${cleanQ}%,staff_data->>application_no.ilike.%${cleanQ}%`)
          .limit(1);

        if (!stfErr && staffList && staffList.length > 0) {
          setResult({ type: 'staff', data: staffList[0] });
          setIsSearching(false);
          return;
        }
      }

      // 2. Try Student lookup directly from students table
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

      // 3. Fallback: Try students_public view
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

      // 4. Fallback: Search staff by phone, mobile, ID or application_no
      const { data: fallbackStaff } = await supabase
        .from('staff')
        .select('*')
        .or(`phone.ilike.%${cleanQ}%,mobile.ilike.%${cleanQ}%,staff_id.ilike.%${cleanQ}%,application_no.ilike.%${cleanQ}%,staff_data->>application_no.ilike.%${cleanQ}%`)
        .limit(1);

      if (fallbackStaff && fallbackStaff.length > 0) {
        setResult({ type: 'staff', data: fallbackStaff[0] });
        setIsSearching(false);
        return;
      }

      // If no result found
      setResult(null);
    } catch (err: any) {
      console.warn('Search error:', err);
      toast.error(err.message || (bn ? 'অনুসন্ধানে সমস্যা হয়েছে' : 'Search error'));
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const paramId = searchParams.get('id');
    if (paramId) {
      performSearch(paramId);
    }
  }, []);

  const handleDownload = async () => {
    if (!result) return;
    setIsDownloading(true);
    try {
      if (result.type === 'student') {
        const appNo = result.data.student_id || result.data.id?.slice(0, 8);
        const html = buildStudentApplicationHTML(result.data, institution);
        await downloadHTMLAsPDF(html, `ভর্তি_আবেদন_${appNo}.pdf`);
      } else {
        const appNo = (result.data.staff_data as any)?.application_no || result.data.staff_id || result.data.id?.slice(0, 8);
        const html = buildStaffApplicationHTML(result.data, institution);
        await downloadHTMLAsPDF(html, `নিয়োগ_আবেদন_${appNo}.pdf`);
      }
      toast.success(bn ? 'আবেদনপত্র ডাউনলোড সম্পন্ন হয়েছে' : 'Application downloaded successfully');
    } catch (err: any) {
      console.error('Download error:', err);
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

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Page Header */}
        <div className="text-center space-y-3 mb-8">
          <Badge variant="outline" className="px-3 py-1 text-xs border-primary/30 text-primary bg-primary/5 font-semibold">
            {bn ? 'অনলাইন ট্র্যাকিং পোর্টাল' : 'Online Tracking Portal'}
          </Badge>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {bn ? 'আবেদন ট্র্যাকিং ও কপি ডাউনলোড' : 'Track Application & Download'}
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            {bn
              ? 'আপনার আবেদন নম্বর (যেমন: ADM20260001 বা STF20260001) দিয়ে আবেদনের বর্তমান অবস্থা জানুন এবং আবেদনপত্র ডাউনলোড করুন।'
              : 'Enter your Application ID (e.g., ADM20260001 or STF20260001) to view status and download application slip.'}
          </p>
        </div>

        {/* Search Box */}
        <Card className="rounded-2xl border-border shadow-sm mb-8 overflow-hidden bg-card">
          <CardContent className="p-4 sm:p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                performSearch();
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder={bn ? 'আবেদন নম্বর দিন (যেমন: ADM20260001 বা STF20260001)' : 'Enter Application ID (e.g. ADM20260001)'}
                  className="pl-10 h-11 text-base font-mono uppercase bg-background"
                />
              </div>
              <Button
                type="submit"
                className="h-11 px-6 font-bold gap-2 btn-primary-gradient shrink-0"
                disabled={isSearching}
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {bn ? 'স্ট্যাটাস যাচাই' : 'Check Status'}
              </Button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t text-xs text-muted-foreground">
              <span>💡 {bn ? 'উদাহরণ: ADM20260001 (শিক্ষার্থী), STF20260001 (স্টাফ)' : 'Example: ADM20260001 or STF20260001'}</span>
              <div className="flex gap-3">
                <Link to="/admission" className="text-primary hover:underline font-medium">
                  {bn ? 'নতুন ভর্তি আবেদন' : 'New Admission'}
                </Link>
                <span>•</span>
                <Link to="/staff-application" className="text-primary hover:underline font-medium">
                  {bn ? 'নতুন শিক্ষক/স্টাফ আবেদন' : 'Staff Application'}
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading Spinner */}
        {isSearching && (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">{bn ? 'আবেদনের তথ্য খোঁজা হচ্ছে...' : 'Searching application records...'}</p>
          </div>
        )}

        {/* Not Found Screen */}
        {!isSearching && hasSearched && !result && (
          <div className="card-elevated p-8 text-center space-y-4 max-w-lg mx-auto border-destructive/20 bg-destructive/5 rounded-2xl">
            <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {bn ? 'কোনো আবেদন পাওয়া যায়নি' : 'No Application Found'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {bn
                ? `"${queryInput}" নম্বরে কোনো সক্রিয় আবেদন রেকর্ড পাওয়া যায়নি। অনুগ্রহ করে সঠিক আবেদন নম্বর দিয়ে পুনরায় চেষ্টা করুন।`
                : `No application matching "${queryInput}". Please verify the ID and try again.`}
            </p>
            <Button variant="outline" size="sm" onClick={() => setQueryInput('')} className="mt-2">
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              {bn ? 'আবার চেষ্টা করুন' : 'Try Again'}
            </Button>
          </div>
        )}

        {/* Result Found Card */}
        {!isSearching && result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Student Result */}
            {result.type === 'student' && (() => {
              const s = result.data;
              const isApproved = s.status === 'active' || s.approval_status === 'approved';
              const isRejected = s.approval_status === 'rejected' || s.status === 'inactive';
              const isPending = !isApproved && !isRejected;

              const appNo = s.application_no || s.student_id || s.id?.slice(0, 8);
              const className = s.classes?.name_bn || s.classes?.name || s.admission_class || '—';
              const divName = s.divisions?.name_bn || s.divisions?.name || '—';

              return (
                <Card className="rounded-2xl border-2 border-primary/20 shadow-lg overflow-hidden bg-card">
                  {/* Status Banner */}
                  <div
                    className={`px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b ${
                      isApproved
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800'
                        : isRejected
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-800'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isApproved ? (
                        <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                      ) : isRejected ? (
                        <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
                      ) : (
                        <Clock className="w-6 h-6 text-amber-600 shrink-0" />
                      )}
                      <div>
                        <h3 className="font-bold text-base">
                          {isApproved
                            ? (bn ? 'ভর্তি আবেদন অনুমোদিত হয়েছে' : 'Admission Approved')
                            : isRejected
                            ? (bn ? 'আবেদন গৃহীত হয়নি (বাতিল)' : 'Application Rejected')
                            : (bn ? 'আবেদন পর্যালোচনায় রয়েছে (অনুমোদনের অপেক্ষায়)' : 'Application Under Review')}
                        </h3>
                        <p className="text-xs opacity-90">
                          {isApproved
                            ? (bn ? 'অভিনন্দন! আপনার ভর্তি আবেদন অনুমোদিত হয়েছে এবং রোল নম্বর বরাদ্দ হয়েছে।' : 'Congratulations! Your admission has been approved.')
                            : isRejected
                            ? (bn ? 'দুঃখিত, আপনার আবেদনটি এই মুহূর্তে অনুমোদন করা সম্ভব হয়নি।' : 'Sorry, your application was rejected.')
                            : (bn ? 'আপনার আবেদনটি সংশ্লিষ্ট কর্তৃপক্ষ যাচাই-বাছাই করছেন।' : 'Your application is awaiting administrative review.')}
                        </p>
                      </div>
                    </div>

                    <Badge
                      className={`text-xs px-3 py-1 font-semibold ${
                        isApproved
                          ? 'bg-emerald-600 text-white'
                          : isRejected
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {isApproved ? (bn ? 'অনুমোদিত' : 'Approved') : isRejected ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অপেক্ষমাণ' : 'Pending')}
                    </Badge>
                  </div>

                  <CardContent className="p-6 space-y-6">
                    {/* Candidate Overview */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl border bg-muted/30">
                      {s.photo_url ? (
                        <img src={s.photo_url} alt="" className="w-20 h-20 rounded-xl object-cover border shadow-sm shrink-0" />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-3xl border shrink-0">
                          {(s.name_bn || s.name_en || 'S')[0]}
                        </div>
                      )}

                      <div className="flex-1 text-center sm:text-left space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <h2 className="text-xl font-bold text-foreground">{s.name_bn || s.name_en}</h2>
                          {s.name_en && s.name_bn && (
                            <span className="text-xs text-muted-foreground font-medium">({s.name_en})</span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                          <Badge variant="outline" className="font-mono text-xs gap-1 border-primary/30 text-primary bg-primary/5">
                            {bn ? 'আবেদন নম্বর:' : 'App ID:'} {appNo}
                            <button
                              type="button"
                              onClick={() => copyAppId(appNo)}
                              className="ml-1 text-primary hover:text-primary/70"
                              title={bn ? 'কপি করুন' : 'Copy'}
                            >
                              <Copy className="w-3 h-3 inline" />
                            </button>
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {bn ? 'শ্রেণি:' : 'Class:'} {className}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Information Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border bg-card text-xs">
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'শ্রেণি' : 'Class'}</span>
                        <span className="font-bold text-foreground text-sm">{className}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'বিভাগ' : 'Division'}</span>
                        <span className="font-bold text-foreground text-sm">{divName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'রোল নম্বর' : 'Roll'}</span>
                        <span className="font-bold text-foreground text-sm font-mono">
                          {s.roll_number ? (
                            s.roll_number
                          ) : (
                            <span className="text-amber-600 font-normal italic">{bn ? 'অনুমোদনের পর পাবেন' : 'Pending Approval'}</span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'রেজিস্ট্রেশন' : 'Registration'}</span>
                        <span className="font-bold text-foreground text-sm font-mono">
                          {s.registration_no || (
                            <span className="text-amber-600 font-normal italic">{bn ? 'অনুমোদনের পর পাবেন' : 'Pending Approval'}</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex-1 font-bold gap-2 btn-primary-gradient h-11"
                      >
                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {bn ? 'আবেদনপত্র ডাউনলোড (PDF)' : 'Download Application (PDF)'}
                      </Button>
                      <Button
                        onClick={handlePrint}
                        variant="outline"
                        className="flex-1 font-medium gap-2 h-11"
                      >
                        <Printer className="w-4 h-4" />
                        {bn ? 'আবেদনপত্র প্রিন্ট করুন' : 'Print Application'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Staff Result */}
            {result.type === 'staff' && (() => {
              const s = result.data;
              const isApproved = s.status === 'active';
              const isRejected = s.status === 'rejected';
              const isPending = !isApproved && !isRejected;

              const appNo = (s.staff_data as any)?.application_no || s.staff_id || s.id?.slice(0, 8);
              const displayName = s.name_bn || s.name_en || '—';

              return (
                <Card className="rounded-2xl border-2 border-purple-500/20 shadow-lg overflow-hidden bg-card">
                  {/* Status Banner */}
                  <div
                    className={`px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b ${
                      isApproved
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800'
                        : isRejected
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-800'
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isApproved ? (
                        <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                      ) : isRejected ? (
                        <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
                      ) : (
                        <Clock className="w-6 h-6 text-amber-600 shrink-0" />
                      )}
                      <div>
                        <h3 className="font-bold text-base">
                          {isApproved
                            ? (bn ? 'নিয়োগ আবেদন অনুমোদিত হয়েছে' : 'Employment Approved')
                            : isRejected
                            ? (bn ? 'আবেদন গৃহীত হয়নি (বাতিল)' : 'Application Rejected')
                            : (bn ? 'আবেদন পর্যালোচনায় রয়েছে (অনুমোদনের অপেক্ষায়)' : 'Application Under Review')}
                        </h3>
                        <p className="text-xs opacity-90">
                          {isApproved
                            ? (bn ? 'অভিনন্দন! আপনার আবেদনটি অনুমোদিত হয়েছে এবং স্টাফ তালিকাভুক্ত করা হয়েছে।' : 'Congratulations! Your staff recruitment has been approved.')
                            : isRejected
                            ? (bn ? 'দুঃখিত, এই মুহূর্তে আপনার আবেদনটি গৃহীত হয়নি।' : 'Your application was rejected.')
                            : (bn ? 'নিয়োগ কমিটি আপনার আবেদনটি যাচাই-বাছাই করছেন।' : 'Recruitment committee is reviewing your submission.')}
                        </p>
                      </div>
                    </div>

                    <Badge
                      className={`text-xs px-3 py-1 font-semibold ${
                        isApproved
                          ? 'bg-emerald-600 text-white'
                          : isRejected
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {isApproved ? (bn ? 'অনুমোদিত' : 'Approved') : isRejected ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অপেক্ষমাণ' : 'Pending')}
                    </Badge>
                  </div>

                  <CardContent className="p-6 space-y-6">
                    {/* Candidate Overview */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl border bg-muted/30">
                      {s.photo_url ? (
                        <img src={s.photo_url} alt="" className="w-20 h-20 rounded-xl object-cover border shadow-sm shrink-0" />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-3xl border shrink-0">
                          {(displayName || 'T')[0]}
                        </div>
                      )}

                      <div className="flex-1 text-center sm:text-left space-y-1">
                        <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
                        <p className="text-xs text-muted-foreground font-medium">
                          {s.designation || 'Staff'} {s.department ? `• ${s.department}` : ''}
                        </p>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                          <Badge variant="outline" className="font-mono text-xs gap-1 border-purple-500/30 text-purple-600 bg-purple-500/5">
                            {bn ? 'আবেদন নম্বর:' : 'App ID:'} {appNo}
                            <button
                              type="button"
                              onClick={() => copyAppId(appNo)}
                              className="ml-1 text-purple-600 hover:text-purple-800"
                              title={bn ? 'কপি করুন' : 'Copy'}
                            >
                              <Copy className="w-3 h-3 inline" />
                            </button>
                          </Badge>
                          {s.employment_type && (
                            <Badge variant="secondary" className="text-xs">
                              {s.employment_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Information Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border bg-card text-xs">
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'পদবি' : 'Designation'}</span>
                        <span className="font-bold text-foreground text-sm">{s.designation || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'বিভাগ' : 'Department'}</span>
                        <span className="font-bold text-foreground text-sm">{s.department || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'মোবাইল' : 'Phone'}</span>
                        <span className="font-bold text-foreground text-sm font-mono">{s.phone || s.mobile || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'আবেদনের তারিখ' : 'Date'}</span>
                        <span className="font-bold text-foreground text-sm font-mono">
                          {s.joining_date || (s.created_at ? new Date(s.created_at).toLocaleDateString('bn-BD') : '—')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex-1 font-bold gap-2 bg-purple-600 hover:bg-purple-700 text-white h-11"
                      >
                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {bn ? 'আবেদনপত্র ডাউনলোড (PDF)' : 'Download Application (PDF)'}
                      </Button>
                      <Button
                        onClick={handlePrint}
                        variant="outline"
                        className="flex-1 font-medium gap-2 h-11"
                      >
                        <Printer className="w-4 h-4" />
                        {bn ? 'আবেদনপত্র প্রিন্ট করুন' : 'Print Application'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default ApplicationTrackingPage;
