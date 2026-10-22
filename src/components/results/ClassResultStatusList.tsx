import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircle,
  Clock,
  Eye,
  FileSpreadsheet,
  FileDown,
  Printer,
  Loader2,
  Globe,
  GlobeLock,
  Search,
  ShieldCheck,
  ShieldX,
  RotateCcw,
} from 'lucide-react';

export interface ClassPublishStatusItem {
  is_published?: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
}

interface ClassResultStatusListProps {
  classes: any[];
  resultStatusMap: Record<string, boolean>;
  publishStatusMap?: Record<string, boolean | ClassPublishStatusItem>;
  onClassClick: (classId: string, mode?: 'view' | 'entry') => void;
  onExport: (classId: string, type: 'csv' | 'pdf' | 'print') => void;
  onPublishToggle?: (classId: string, publish: boolean) => void;
  onApprovePublishClass?: (classId: string) => void;
  onRejectPublishClass?: (classId: string) => void;
  onRevokePublishClass?: (classId: string) => void;
  onResetAllPublish?: () => void;
  exportingClassId: string | null;
  examSessionName: string;
  publishApprovalStatus?: 'pending' | 'approved' | 'rejected';
  publishRejectionReason?: string | null;
  isAdmin?: boolean;
  onApprovePublish?: () => void;
  onRejectPublish?: () => void;
}

const ClassResultStatusList = ({
  classes,
  resultStatusMap,
  publishStatusMap = {},
  onClassClick,
  onExport,
  onPublishToggle,
  onApprovePublishClass,
  onRejectPublishClass,
  onRevokePublishClass,
  onResetAllPublish,
  exportingClassId,
  examSessionName,
  publishApprovalStatus = 'pending',
  publishRejectionReason,
  isAdmin = false,
  onApprovePublish,
  onRejectPublish,
}: ClassResultStatusListProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [query, setQuery] = useState('');

  if (!classes.length) {
    return (
      <div className="card-elevated rounded-xl p-8 text-center text-muted-foreground">
        {bn ? 'এই সেশনে কোনো ক্লাস নেই' : 'No classes in this session'}
      </div>
    );
  }

  const savedCount = classes.filter(c => resultStatusMap[c.id]).length;
  const q = query.trim().toLowerCase();
  const visibleClasses = q
    ? classes.filter((c: any) => `${c.name || ''} ${c.name_bn || ''}`.toLowerCase().includes(q))
    : classes;

  const publishedCount = classes.filter((c: any) => {
    const info = publishStatusMap[c.id];
    return typeof info === 'boolean' ? info : (info?.is_published || false);
  }).length;

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl p-5 md:p-6 border border-border shadow-sm space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="text-primary">📋</span>
              {examSessionName} — {bn ? 'ক্লাস ভিত্তিক ফলাফল অনুমোদন, প্রকাশনা ও রেজাল্ট শিট' : 'Class-wise Result Approval, Publishing & Result Sheet'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {bn
                ? 'প্রতিটি ক্লাসের ফলাফল স্বাধীনভাবে অ্যাডমিন অনুমোদন ও প্রকাশ (Publish) করা যায়'
                : 'Each class result can be approved and published independently by admin'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
              {savedCount} {bn ? 'টি প্রস্তুত' : 'ready'}
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300">
              {publishedCount} {bn ? 'টি পাবলিশড' : 'published'}
            </span>
          </div>
        </div>

        {/* Search & Bulk Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={bn ? 'শ্রেণি / জামাত খুঁজুন...' : 'Search class...'}
              className="pl-9 bg-background h-9 rounded-xl text-xs sm:text-sm"
            />
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {isAdmin && onResetAllPublish && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold rounded-lg text-amber-700 hover:bg-amber-50 border-amber-300 gap-1.5"
                onClick={onResetAllPublish}
                title={bn ? 'সকল ক্লাসের অনুমোদন রিসেট করে আবার অপেক্ষমান রাখুন' : 'Reset all classes to pending approval'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {bn ? 'সকল অনুমোদন রিসেট' : 'Reset All'}
              </Button>
            )}
            {isAdmin && onApprovePublish && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold rounded-lg text-emerald-700 hover:bg-emerald-50 border-emerald-300 gap-1.5"
                onClick={onApprovePublish}
                title={bn ? 'সবগুলো ক্লাসের পাবলিশ অনুমোদন একসাথে দিন' : 'Approve publishing for all classes'}
              >
                <ShieldCheck className="w-4 h-4" />
                {bn ? 'সকল ক্লাসের পাবলিশ অনুমোদন' : 'Approve All Publishing'}
              </Button>
            )}
          </div>
        </div>

        {/* Structured Table (Exact Match to Mockup) */}
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-left border-collapse bg-card">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-xs font-bold text-muted-foreground">
                <th className="p-3.5 whitespace-nowrap">{bn ? 'শ্রেণি / জামাত' : 'Class / Jamat'}</th>
                <th className="p-3.5 whitespace-nowrap">{bn ? 'ফলাফল স্ট্যাটাস' : 'Result Status'}</th>
                <th className="p-3.5 whitespace-nowrap">{bn ? 'ক্লাস অনুমোদন (Admin Approval)' : 'Admin Approval'}</th>
                <th className="p-3.5 whitespace-nowrap">{bn ? 'পাবলিক সাইট প্রকাশ' : 'Public Publishing'}</th>
                <th className="p-3.5 text-center whitespace-nowrap">{bn ? 'এক্সপোর্ট ও প্রিন্ট' : 'Export & Print'}</th>
                <th className="p-3.5 text-right whitespace-nowrap">{bn ? 'রেজাল্ট শিট অ্যাকশন' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs font-medium">
              {visibleClasses.map((cls: any) => {
                const hasResults = resultStatusMap[cls.id] || false;
                const classInfo = publishStatusMap[cls.id];
                const rawApproval = typeof classInfo === 'object' && classInfo?.approval_status ? classInfo.approval_status : 'pending';
                // Strictly evaluate approval: default to pending!
                const classApproval: 'pending' | 'approved' | 'rejected' = rawApproval || 'pending';
                // A class can ONLY be published if it is explicitly approved AND marked as published
                const isPublished = classApproval === 'approved' && (typeof classInfo === 'boolean' ? classInfo : (classInfo?.is_published || false));
                const isExporting = exportingClassId === cls.id;

                return (
                  <tr
                    key={cls.id}
                    className={`transition-colors ${
                      !hasResults
                        ? 'bg-muted/10 opacity-75'
                        : isPublished
                        ? 'hover:bg-muted/20'
                        : classApproval === 'pending'
                        ? 'hover:bg-amber-50/20 bg-amber-50/5'
                        : 'hover:bg-muted/20'
                    }`}
                  >
                    {/* Column 1: শ্রেণি / জামাত */}
                    <td className="p-3.5 font-bold text-foreground text-sm whitespace-nowrap">
                      {bn ? cls.name_bn : cls.name}
                    </td>

                    {/* Column 2: ফলাফল স্ট্যাটাস */}
                    <td className="p-3.5 whitespace-nowrap">
                      {hasResults ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {bn ? 'ফলাফল সংরক্ষিত' : 'Results Saved'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300">
                          <Clock className="w-3.5 h-3.5" />
                          {bn ? 'অপেক্ষমান (এন্ট্রি বাকি)' : 'Pending (Entry Needed)'}
                        </span>
                      )}
                    </td>

                    {/* Column 3: ক্লাস অনুমোদন (Admin Approval) */}
                    <td className="p-3.5 whitespace-nowrap">
                      {!hasResults ? (
                        <span className="text-muted-foreground italic text-xs">
                          — {bn ? 'ফলাফল অপ্রস্তুত' : 'Not Ready'} —
                        </span>
                      ) : classApproval === 'approved' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {bn ? 'পাবলিশ অনুমোদিত' : 'Publish Approved'}
                          </span>
                          {isAdmin && onRevokePublishClass && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[11px] px-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                              onClick={() => onRevokePublishClass(cls.id)}
                              title={bn ? 'অনুমোদন প্রত্যাহার করে আবার অপেক্ষমান রাখুন' : 'Revoke approval'}
                            >
                              {bn ? 'অনুমোদন বাতিল' : 'Revoke'}
                            </Button>
                          )}
                        </div>
                      ) : classApproval === 'rejected' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-300">
                            <ShieldX className="w-3.5 h-3.5" />
                            {bn ? 'পাবলিশ প্রত্যাখ্যাত' : 'Rejected'}
                          </span>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[11px] px-2 text-emerald-700 border-emerald-300"
                              onClick={() => onApprovePublishClass ? onApprovePublishClass(cls.id) : onApprovePublish?.()}
                            >
                              {bn ? 'অনুমোদন দিন' : 'Approve'}
                            </Button>
                          )}
                        </div>
                      ) : (
                        /* Pending Approval */
                        isAdmin ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-400 mr-1">
                              <Clock className="w-3 h-3" />
                              {bn ? 'অনুমোদনের অপেক্ষায়' : 'Awaiting Approval'}
                            </span>
                            <Button
                              size="sm"
                              className="h-7 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 shadow-sm gap-1"
                              onClick={() => onApprovePublishClass ? onApprovePublishClass(cls.id) : onApprovePublish?.()}
                              title={bn ? 'এই ক্লাসের ফলাফল পাবলিক সাইটে পাবলিশের অনুমোদন দিন' : 'Approve publishing this class'}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              {bn ? 'অনুমোদন দিন' : 'Approve'}
                            </Button>
                            {onRejectPublishClass && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs rounded-lg text-rose-700 hover:bg-rose-50 border-rose-200"
                                onClick={() => onRejectPublishClass(cls.id)}
                                title={bn ? 'প্রত্যাখ্যান' : 'Reject'}
                              >
                                <ShieldX className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <Clock className="w-3.5 h-3.5" />
                            {bn ? 'অনুমোদনের অপেক্ষায়' : 'Awaiting Approval'}
                          </span>
                        )
                      )}
                    </td>

                    {/* Column 4: পাবলিক সাইট প্রকাশ */}
                    <td className="p-3.5 whitespace-nowrap">
                      {!hasResults ? (
                        <span className="text-muted-foreground italic text-xs">
                          — {bn ? 'ফলাফল অপ্রস্তুত' : 'Not Ready'} —
                        </span>
                      ) : isPublished ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300">
                            <Globe className="w-3.5 h-3.5" />
                            {bn ? 'পাবলিক সাইটে প্রকাশিত' : 'Published'}
                          </span>
                          {onPublishToggle && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs font-semibold px-2.5 py-0.5 rounded-md border-amber-300 text-amber-800 hover:bg-amber-50 gap-1"
                              onClick={() => onPublishToggle(cls.id, false)}
                            >
                              <GlobeLock className="w-3.5 h-3.5" />
                              {bn ? 'আনপাবলিশ' : 'Unpublish'}
                            </Button>
                          )}
                        </div>
                      ) : classApproval === 'approved' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-emerald-700 font-medium">
                            {bn ? 'প্রকাশের জন্য প্রস্তুত' : 'Ready to publish'}
                          </span>
                          {onPublishToggle && (
                            <Button
                              size="sm"
                              className="h-7 text-xs font-semibold px-2.5 py-0.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white gap-1 shadow-sm"
                              onClick={() => onPublishToggle(cls.id, true)}
                            >
                              <Globe className="w-3.5 h-3.5" />
                              {bn ? 'পাবলিশ করুন' : 'Publish'}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-700 font-medium">
                          ⏳ {bn ? 'পাবলিশ অনুমোদনের পর প্রকাশ করা যাবে' : 'Needs publish approval'}
                        </span>
                      )}
                    </td>

                    {/* Column 5: এক্সপোর্ট ও প্রিন্ট */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      {hasResults ? (
                        <div className="inline-flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-muted"
                            disabled={isExporting}
                            onClick={() => onExport(cls.id, 'csv')}
                            title="Excel"
                          >
                            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-muted"
                            disabled={isExporting}
                            onClick={() => onExport(cls.id, 'pdf')}
                            title="PDF"
                          >
                            <FileDown className="w-3.5 h-3.5 text-rose-600" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-muted"
                            disabled={isExporting}
                            onClick={() => onExport(cls.id, 'print')}
                            title={bn ? 'প্রিন্ট' : 'Print'}
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Column 6: রেজাল্ট শিট অ্যাকশন */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      {hasResults ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-8 text-xs font-bold text-emerald-800 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                          onClick={() => onClassClick(cls.id, 'view')}
                          title={bn ? 'ক্লাস রেজাল্ট শিট দেখুন' : 'View Class Result Sheet'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {bn ? 'শিট দেখুন' : 'View Sheet'}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground italic px-2 py-1 select-none">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer tip box */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            💡 <strong>{bn ? 'টিপ:' : 'Tip:'}</strong> {bn ? 'কোনো ক্লাসের নম্বর ইনপুট বা সংশোধনের প্রয়োজন হলে উপরের "✍️ নম্বর এন্ট্রি (Marks Entry)" ট্যাবে যান।' : 'To enter or edit marks, please go to the "Marks Entry" tab above.'}
          </span>
          <span className="text-muted-foreground/80">
            {bn ? 'ট্যাবুলেশন শিট পেজটি সম্পূর্ণ রিপোর্ট ও পাবলিশিংয়ের জন্য সংরক্ষিত' : 'Tabulation Sheet is dedicated for reports and publishing'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ClassResultStatusList;
