import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users, User, RotateCcw, CalendarDays, FileText, Check, PenLine, FileSpreadsheet, BarChart3, HelpCircle } from 'lucide-react';

export type ResultSearchMode = 'entry' | 'class' | 'individual' | 'analytics';

interface Props {
  searchMode: ResultSearchMode;
  onSearchModeChange: (mode: ResultSearchMode) => void;
  examYear: string;
  onExamYearChange: (v: string) => void;
  examSession: string;
  onExamSessionChange: (v: string) => void;
  rollNumber: string;
  onRollNumberChange: (v: string) => void;
  onSearch: () => void;
  onReset?: () => void;
  academicSessions: any[];
  examSessions: any[];
  classes?: any[];
  selectedClass?: string;
  onClassChange?: (v: string) => void;
}

const ResultSelectionBrowser = ({
  searchMode,
  onSearchModeChange,
  examYear,
  onExamYearChange,
  examSession,
  onExamSessionChange,
  rollNumber,
  onRollNumberChange,
  onSearch,
  onReset,
  academicSessions,
  examSessions,
  classes = [],
  selectedClass = '',
  onClassChange,
}: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const match = (...vals: any[]) => !q || vals.some(v => String(v || '').toLowerCase().includes(q));

  const filteredYears = useMemo(
    () => academicSessions.filter((s: any) => match(s.name, s.name_bn)),
    [academicSessions, q]
  );

  const filteredSessions = useMemo(() => {
    return examSessions.filter((es: any) => {
      const year = academicSessions.find((y: any) => y.id === es.academic_session_id);
      return match(es.name, es.name_bn, year?.name, year?.name_bn);
    });
  }, [examSessions, academicSessions, q]);

  const yearLabel = (y: any) => (bn ? (y?.name_bn || y?.name) : y?.name) || '-';

  return (
    <div className="card-elevated rounded-2xl overflow-hidden border border-border shadow-xs">
      {/* 4 Mode Tabs */}
      <div className="border-b border-border bg-muted/40 px-3 sm:px-5 pt-3 pb-0">
        <Tabs value={searchMode} onValueChange={(v) => onSearchModeChange(v as ResultSearchMode)}>
          <TabsList className="bg-transparent gap-1.5 p-0 h-auto grid grid-cols-2 md:grid-cols-4 w-full">
            <TabsTrigger
              value="entry"
              className="h-11 justify-center data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-t-xl rounded-b-none px-2 sm:px-4 text-xs sm:text-sm font-bold gap-2 border-b-2 border-transparent data-[state=active]:border-primary transition-all cursor-pointer"
            >
              <PenLine className="w-4 h-4 text-emerald-600" />
              <span>{bn ? '✍️ নম্বর এন্ট্রি' : 'Marks Entry'}</span>
            </TabsTrigger>

            <TabsTrigger
              value="class"
              className="h-11 justify-center data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-t-xl rounded-b-none px-2 sm:px-4 text-xs sm:text-sm font-bold gap-2 border-b-2 border-transparent data-[state=active]:border-primary transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-sky-600" />
              <span>{bn ? '📋 ক্লাস রেজাল্ট শিট' : 'Tabulation Sheet'}</span>
            </TabsTrigger>

            <TabsTrigger
              value="individual"
              className="h-11 justify-center data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-t-xl rounded-b-none px-2 sm:px-4 text-xs sm:text-sm font-bold gap-2 border-b-2 border-transparent data-[state=active]:border-primary transition-all cursor-pointer"
            >
              <User className="w-4 h-4 text-indigo-600" />
              <span>{bn ? '📄 একক মার্কশীট' : 'Marksheet Search'}</span>
            </TabsTrigger>

            <TabsTrigger
              value="analytics"
              className="h-11 justify-center data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-t-xl rounded-b-none px-2 sm:px-4 text-xs sm:text-sm font-bold gap-2 border-b-2 border-transparent data-[state=active]:border-primary transition-all cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-amber-600" />
              <span>{bn ? '📊 ফলাফল বিশ্লেষণ' : 'Analytics'}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Mode Guide Notice */}
        <div className="text-xs font-medium text-muted-foreground bg-muted/30 border border-border/60 rounded-xl p-2.5 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary shrink-0" />
          <span>
            {searchMode === 'entry' && (bn
              ? '✍️ নম্বর এন্ট্রি মোড: পরীক্ষা ও শ্রেণি নির্বাচন করে সরাসরি ছাত্রদের নম্বর ইনপুট দিন ও ড্রাফট সংরক্ষণ করুন।'
              : 'Marks Entry Mode: Select exam & class to input student marks and save drafts.')}
            {searchMode === 'class' && (bn
              ? '📋 ক্লাস রেজাল্ট শিট: পুরো ক্লাসের সমন্বিত মেধা তালিকা, গ্রেড বিবরণী ও অফিশিয়াল প্রিন্ট/পিডিএফ বের করুন।'
              : 'Tabulation Sheet: View full class merit list, grade sheet and official export/print.')}
            {searchMode === 'individual' && (bn
              ? '📄 একক মার্কশীট: রোল নম্বর লিখে নির্দিষ্ট শিক্ষার্থীর প্রাতিষ্ঠানিক রঙিন নম্বরপত্র (Marksheet) বের করুন।'
              : 'Individual Marksheet: Enter roll number to view and print official student transcript.')}
            {searchMode === 'analytics' && (bn
              ? '📊 ফলাফল বিশ্লেষণ: মেধা তালিকায় ১ম, ২য় ও ৩য় স্থান এবং ক্লাসের সামগ্রিক পাসের হার ও গ্রেড বণ্টন পর্যালোচনা করুন।'
              : 'Analytics: Review top 3 merit ranks, class pass rate and grade distribution.')}
          </span>
        </div>

        {/* Search + Reset */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={bn ? 'পরীক্ষা বা শিক্ষাবর্ষ দিয়ে ফিল্টার করুন...' : 'Search exam or academic year...'}
              className="pl-9 bg-background h-10 rounded-xl"
            />
          </div>
          {onReset && (examYear || examSession || rollNumber || selectedClass) && (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              onClick={() => {
                setQuery('');
                onReset();
              }}
              title={bn ? 'রিসেট' : 'Reset'}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Academic Year Chips */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            {bn ? 'শিক্ষাবর্ষ নির্বাচন' : 'Select Academic Year'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onExamYearChange('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                !examYear
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
              }`}
            >
              {bn ? 'সব বছর' : 'All Years'}
            </button>
            {filteredYears.map((y: any) => (
              <button
                key={y.id}
                type="button"
                onClick={() => onExamYearChange(examYear === y.id ? '' : y.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  examYear === y.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                }`}
              >
                {yearLabel(y)}
              </button>
            ))}
            {filteredYears.length === 0 && (
              <span className="text-xs text-muted-foreground py-1.5">{bn ? 'কিছু পাওয়া যায়নি' : 'No match'}</span>
            )}
          </div>
        </div>

        {/* Exam Session Cards */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            {bn ? 'পরীক্ষা নির্বাচন করুন' : 'Select Exam Session'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredSessions.map((es: any) => {
              const year = academicSessions.find((y: any) => y.id === es.academic_session_id);
              const active = examSession === es.id;
              return (
                <button
                  key={es.id}
                  type="button"
                  onClick={() => onExamSessionChange(es.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    active
                      ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-foreground truncate">
                        {bn ? es.name_bn || es.name : es.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">{yearLabel(year)}</div>
                    </div>
                    {active ? (
                      <span className="p-1 rounded-full bg-primary text-primary-foreground">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
            {filteredSessions.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full py-4 text-center">
                {bn ? 'কোনো পরীক্ষার সেশন পাওয়া যায়নি' : 'No exam session found'}
              </p>
            )}
          </div>
        </div>

        {/* Individual Marksheet Search Form */}
        {searchMode === 'individual' && (
          <div className="pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">{bn ? 'শ্রেণি / জামাত' : 'Class'}</p>
              <Select value={selectedClass || undefined} onValueChange={(v) => onClassChange?.(v)} disabled={!examSession}>
                <SelectTrigger className="bg-background h-10 rounded-xl">
                  <SelectValue placeholder={bn ? 'শ্রেণি নির্বাচন করুন' : 'Select class'} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {classes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {bn ? c.name_bn || c.name : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">{bn ? 'রোল / রেজিস্ট্রেশন নম্বর' : 'Roll / Reg. No.'}</p>
              <Input
                placeholder={bn ? 'রোল নম্বর লিখুন (উদাঃ ১, ২, ৩...)' : 'Enter roll (e.g. 1, 2, 3...)'}
                value={rollNumber}
                onChange={(e) => onRollNumberChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSearch();
                }}
                className="bg-background h-10 rounded-xl"
              />
            </div>
            <Button onClick={onSearch} className="btn-primary-gradient h-10 rounded-xl font-bold shadow-xs">
              <Search className="w-4 h-4 mr-2" />
              {bn ? 'মার্কশীট দেখুন' : 'View Marksheet'}
            </Button>
          </div>
        )}

        {/* Direct Class Selector for Entry, Tabulation, Analytics */}
        {searchMode !== 'individual' && examSession && (
          <div className="pt-3 border-t border-border">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {bn ? 'নির্দিষ্ট শ্রেণি বাছাই করুন (ঐচ্ছিক)' : 'Select Class (Optional)'}
                </p>
                <Select value={selectedClass || undefined} onValueChange={(v) => onClassChange?.(v)}>
                  <SelectTrigger className="bg-background h-10 rounded-xl">
                    <SelectValue placeholder={bn ? 'তালিকা থেকে শ্রেণি নির্বাচন করুন...' : 'Select a class from list...'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {classes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {bn ? c.name_bn || c.name : c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClass && (
                <Button onClick={onSearch} className="btn-primary-gradient h-10 shrink-0 font-bold px-5 rounded-xl shadow-xs">
                  {searchMode === 'entry' ? (
                    <>
                      <PenLine className="w-4 h-4 mr-2" />
                      {bn ? '✍️ নম্বর এন্ট্রি শুরু করুন' : 'Start Marks Entry'}
                    </>
                  ) : searchMode === 'analytics' ? (
                    <>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      {bn ? '📊 ফলাফল বিশ্লেষণ দেখুন' : 'View Analytics'}
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      {bn ? '📋 রেজাল্ট শিট দেখুন' : 'View Result Sheet'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultSelectionBrowser;
