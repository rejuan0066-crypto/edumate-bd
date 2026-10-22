import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Clock, Eye, PenLine, ChevronDown, ChevronRight, FileSpreadsheet, FileDown, Printer, Loader2, Globe, GlobeLock, Search, ShieldCheck, ShieldX, ShieldAlert } from 'lucide-react';


interface ClassResultStatusListProps {
  classes: any[];
  resultStatusMap: Record<string, boolean>;
  publishStatusMap?: Record<string, boolean>;
  onClassClick: (classId: string, mode?: 'view' | 'entry') => void;
  onExport: (classId: string, type: 'csv' | 'pdf' | 'print') => void;
  onPublishToggle?: (classId: string, publish: boolean) => void;
  exportingClassId: string | null;
  examSessionName: string;
  /** Publish approval state of the exam session */
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

  return (
    <div className="card-elevated rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {examSessionName} — {bn ? 'ক্লাস ভিত্তিক ফলাফল স্ট্যাটাস' : 'Class-wise Result Status'}
        </h3>
        <Badge variant="outline" className="text-xs">
          {savedCount}/{classes.length} {bn ? 'সম্পন্ন' : 'done'}
        </Badge>
      </button>
      {isOpen && (
        <div className="px-5 py-3 border-b border-border bg-background flex flex-wrap items-center gap-2">
          {publishApprovalStatus === 'approved' ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
              <ShieldCheck className="w-3 h-3" />{bn ? 'পাবলিশ অনুমোদিত' : 'Publish approved'}
            </Badge>
          ) : publishApprovalStatus === 'rejected' ? (
            <Badge variant="destructive" className="gap-1">
              <ShieldX className="w-3 h-3" />{bn ? 'পাবলিশ প্রত্যাখ্যাত' : 'Publish rejected'}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-500/40 text-amber-600 gap-1">
              <ShieldAlert className="w-3 h-3" />{bn ? 'পাবলিশের জন্য অ্যাডমিন অনুমোদন প্রয়োজন' : 'Awaiting admin approval to publish'}
            </Badge>
          )}
          {publishApprovalStatus === 'pending' && classes.some((c: any) => publishStatusMap[c.id]) && (
            <span className="text-[11px] text-muted-foreground">
              {bn
                ? 'অনুমোদন না হওয়া পর্যন্ত পাবলিক সাইটে আগের অনুমোদিত ফলাফলই দেখাবে।'
                : 'Until approved, the public site keeps showing the previously approved results.'}
            </span>
          )}
          {publishApprovalStatus === 'rejected' && publishRejectionReason && (
            <span className="text-[11px] text-destructive">{publishRejectionReason}</span>
          )}
          {isAdmin && publishApprovalStatus !== 'approved' && onApprovePublish && (
            <Button size="sm" className="h-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={onApprovePublish}>
              <ShieldCheck className="w-3.5 h-3.5" />{bn ? 'অনুমোদন' : 'Approve'}
            </Button>
          )}
          {isAdmin && publishApprovalStatus !== 'rejected' && onRejectPublish && (
            <Button size="sm" variant="destructive" className="h-7 rounded-full gap-1" onClick={onRejectPublish}>
              <ShieldX className="w-3.5 h-3.5" />{bn ? 'প্রত্যাখ্যান' : 'Reject'}
            </Button>
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
              placeholder={bn ? 'শ্রেণী খুঁজুন...' : 'Search class...'}
              className="pl-9 bg-background h-9"
            />
          </div>
        </div>
      )}
      {isOpen && <div className="divide-y divide-border">

        {visibleClasses.map((cls: any) => {
          const hasResults = resultStatusMap[cls.id] || false;
          const isPublished = publishStatusMap[cls.id] || false;
          const isExporting = exportingClassId === cls.id;
          return (
            <div
              key={cls.id}
              className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground">
                  {bn ? cls.name_bn : cls.name}
                </span>
                {hasResults ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {bn ? 'সংরক্ষিত' : 'Saved'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1">
                    <Clock className="w-3 h-3" />
                    {bn ? 'অপেক্ষমান' : 'Pending'}
                  </Badge>
                )}
                {hasResults && isPublished && (
                  <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 gap-1">
                    <Globe className="w-3 h-3" />
                    {bn ? 'পাবলিশড' : 'Published'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {hasResults && onPublishToggle && (
                  <Button
                    disabled={!isPublished && publishApprovalStatus !== 'approved'}
                    title={!isPublished && publishApprovalStatus !== 'approved' ? (bn ? 'অ্যাডমিন অনুমোদনের পর পাবলিশ করা যাবে' : 'Publishing needs admin approval') : undefined}
                    variant={isPublished ? 'outline' : 'default'}
                    size="sm"
                    className={`gap-1.5 ${isPublished ? 'text-amber-600 border-amber-500/30 hover:bg-amber-500/10' : 'bg-sky-600 hover:bg-sky-700 text-white'}`}
                    onClick={() => onPublishToggle(cls.id, !isPublished)}
                  >
                    {isPublished ? <GlobeLock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                    {isPublished ? (bn ? 'আনপাবলিশ' : 'Unpublish') : (bn ? 'পাবলিশ' : 'Publish')}
                  </Button>
                )}
                {hasResults && (
                  <>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8"
                      disabled={isExporting}
                      onClick={() => onExport(cls.id, 'csv')}
                      title="Excel"
                    >
                      {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8"
                      disabled={isExporting}
                      onClick={() => onExport(cls.id, 'pdf')}
                      title="PDF"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8"
                      disabled={isExporting}
                      onClick={() => onExport(cls.id, 'print')}
                      title={bn ? 'প্রিন্ট' : 'Print'}
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
                {hasResults ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => onClassClick(cls.id, 'view')}
                    title={bn ? 'ক্লাস রেজাল্ট শিট দেখুন' : 'View Class Result Sheet'}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {bn ? 'শিট দেখুন' : 'View Sheet'}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="gap-1.5 opacity-50 cursor-not-allowed"
                    title={bn ? 'ফলাফল এখনও এন্ট্রি করা হয়নি' : 'Results pending'}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {bn ? 'শিট দেখুন' : 'View Sheet'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>}
    </div>
  );
};

export default ClassResultStatusList;
