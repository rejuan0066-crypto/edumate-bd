import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Clock, Eye, ChevronDown, ChevronRight, FileSpreadsheet, FileDown, Printer, Loader2, Globe, GlobeLock, Search, ShieldCheck, ShieldX, ShieldAlert } from 'lucide-react';

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
  const [isOpen, setIsOpen] = useState(true);
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
    <div className="card-elevated rounded-2xl overflow-hidden border border-border shadow-sm bg-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <h3 className="font-bold text-foreground text-sm sm:text-base">
            {examSessionName} — {bn ? 'ক্লাস ভিত্তিক ফলাফল অনুমোদন ও প্রকাশনা' : 'Class-wise Result Approval & Publishing'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-300">
            {savedCount}/{classes.length} {bn ? 'প্রস্তুত' : 'ready'}
          </Badge>
          <Badge variant="outline" className="text-xs bg-sky-50 text-sky-800 border-sky-300">
            {publishedCount} {bn ? 'পাবলিশড' : 'published'}
          </Badge>
        </div>
      </button>

      {isOpen && (
        <div className="px-5 py-2.5 border-b border-border bg-muted/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              💡 {bn ? 'প্রতিটি জামাতের ফলাফল স্বাধীনভাবে আলাদা আলাদা অনুমোদন ও প্রকাশ (Publish) করা যায়।' : 'Each class result can be approved and published independently.'}
            </span>
          </div>
          {isAdmin && onApprovePublish && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs rounded-lg text-emerald-700 hover:bg-emerald-50 border-emerald-300 gap-1"
                onClick={onApprovePublish}
                title={bn ? 'সবগুলো ক্লাস একসাথে অনুমোদন দিন' : 'Approve all classes together'}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {bn ? 'সবগুলো একসাথে অনুমোদন দিন' : 'Approve All'}
              </Button>
            </div>
          )}
        </div>
      )}

      {isOpen && (
        <div className="px-5 py-3 border-b border-border bg-background">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={bn ? 'শ্রেণি / জামাত খুঁজুন...' : 'Search class...'}
              className="pl-9 bg-background h-9 rounded-xl text-xs sm:text-sm"
            />
          </div>
        </div>
      )}

      {isOpen && (
        <div className="divide-y divide-border">
          {visibleClasses.map((cls: any) => {
            const hasResults = resultStatusMap[cls.id] || false;
            const classInfo = publishStatusMap[cls.id];
            const isPublished = typeof classInfo === 'boolean' ? classInfo : (classInfo?.is_published || false);
            const classApproval = typeof classInfo === 'object' && classInfo?.approval_status ? classInfo.approval_status : publishApprovalStatus;
            const isExporting = exportingClassId === cls.id;

            return (
              <div
                key={cls.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 transition-colors ${
                  !hasResults ? 'bg-muted/10 opacity-70' : 'hover:bg-muted/20'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="font-bold text-foreground text-sm">
                    {bn ? cls.name_bn : cls.name}
                  </span>

                  {hasResults ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-semibold">
                      <CheckCircle className="w-3 h-3" />
                      {bn ? 'সংরক্ষিত' : 'Saved'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-300 bg-amber-50/50 text-[11px] font-semibold gap-1">
                      <Clock className="w-3 h-3" />
                      {bn ? 'অপেক্ষমান (এন্ট্রি বাকি)' : 'Pending'}
                    </Badge>
                  )}

                  {hasResults && (
                    classApproval === 'approved' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 gap-1 text-[11px] font-semibold">
                        <ShieldCheck className="w-3 h-3" />
                        {bn ? 'অনুমোদিত' : 'Approved'}
                      </Badge>
                    ) : classApproval === 'rejected' ? (
                      <Badge variant="destructive" className="gap-1 text-[11px] font-semibold">
                        <ShieldX className="w-3 h-3" />
                        {bn ? 'প্রত্যাখ্যাত' : 'Rejected'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 gap-1 text-[11px] font-semibold">
                        <Clock className="w-3 h-3" />
                        {bn ? 'অনুমোদনের অপেক্ষায়' : 'Needs Approval'}
                      </Badge>
                    )
                  )}

                  {hasResults && isPublished && (
                    <Badge className="bg-sky-50 text-sky-700 border-sky-300 gap-1 text-[11px] font-semibold">
                      <Globe className="w-3 h-3" />
                      {bn ? 'পাবলিশড' : 'Published'}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 justify-end">
                  {/* Per-class Admin Approval Buttons */}
                  {hasResults && isAdmin && classApproval !== 'approved' && (
                    <div className="flex items-center gap-1 mr-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-2.5 shadow-sm"
                        onClick={() => onApprovePublishClass ? onApprovePublishClass(cls.id) : onApprovePublish?.()}
                        title={bn ? 'এই ক্লাসের ফলাফল অনুমোদন দিন' : 'Approve this class'}
                      >
                        <ShieldCheck className="w-3 h-3" />
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
                          <ShieldX className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Publish / Unpublish Toggle for this class */}
                  {hasResults && onPublishToggle && (
                    <Button
                      disabled={!isPublished && classApproval !== 'approved'}
                      title={!isPublished && classApproval !== 'approved' ? (bn ? 'অ্যাডমিন অনুমোদনের পর পাবলিশ করা যাবে' : 'Needs admin approval') : undefined}
                      variant={isPublished ? 'outline' : 'default'}
                      size="sm"
                      className={`gap-1.5 h-8 text-xs font-semibold rounded-lg ${
                        isPublished
                          ? 'text-amber-700 border-amber-300 bg-amber-50/50 hover:bg-amber-100'
                          : 'bg-sky-600 hover:bg-sky-700 text-white'
                      }`}
                      onClick={() => onPublishToggle(cls.id, !isPublished)}
                    >
                      {isPublished ? <GlobeLock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                      {isPublished ? (bn ? 'আনপাবলিশ' : 'Unpublish') : (bn ? 'পাবলিশ' : 'Publish')}
                    </Button>
                  )}

                  {/* Export Icons */}
                  {hasResults ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        disabled={isExporting}
                        onClick={() => onExport(cls.id, 'csv')}
                        title="Excel"
                      >
                        {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        disabled={isExporting}
                        onClick={() => onExport(cls.id, 'pdf')}
                        title="PDF"
                      >
                        <FileDown className="w-3.5 h-3.5 text-rose-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        disabled={isExporting}
                        onClick={() => onExport(cls.id, 'print')}
                        title={bn ? 'প্রিন্ট' : 'Print'}
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  ) : null}

                  {/* Result Sheet View Button */}
                  {hasResults ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-8 text-xs font-semibold text-emerald-800 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 rounded-lg ml-1"
                      onClick={() => onClassClick(cls.id, 'view')}
                      title={bn ? 'ক্লাস রেজাল্ট শিট দেখুন' : 'View Class Result Sheet'}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {bn ? 'শিট দেখুন' : 'View Sheet'}
                    </Button>
                  ) : (
                    /* STRICTLY NO ENTRY BUTTON HERE! Clean placeholder */
                    <span className="text-xs text-muted-foreground italic px-2 py-1 select-none">
                      —
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClassResultStatusList;
