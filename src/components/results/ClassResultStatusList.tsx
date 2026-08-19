import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Clock, Eye, PenLine, ChevronDown, ChevronRight, FileSpreadsheet, FileDown, Printer, Loader2, Globe, GlobeLock, Search } from 'lucide-react';


interface ClassResultStatusListProps {
  classes: any[];
  resultStatusMap: Record<string, boolean>;
  publishStatusMap?: Record<string, boolean>;
  onClassClick: (classId: string) => void;
  onExport: (classId: string, type: 'csv' | 'pdf' | 'print') => void;
  onPublishToggle?: (classId: string, publish: boolean) => void;
  exportingClassId: string | null;
  examSessionName: string;
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

        {classes.map((cls: any) => {
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
                <Button
                  size="sm"
                  variant={hasResults ? 'outline' : 'default'}
                  className="gap-1.5"
                  onClick={() => onClassClick(cls.id)}
                >
                  {hasResults ? <Eye className="w-3.5 h-3.5" /> : <PenLine className="w-3.5 h-3.5" />}
                  {hasResults ? (bn ? 'দেখুন' : 'View') : (bn ? 'এন্ট্রি' : 'Entry')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>}
    </div>
  );
};

export default ClassResultStatusList;
