import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users, User, RotateCcw, CalendarDays, FileText, Check } from 'lucide-react';

interface Props {
  searchMode: 'class' | 'individual';
  onSearchModeChange: (mode: 'class' | 'individual') => void;
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
  searchMode, onSearchModeChange,
  examYear, onExamYearChange,
  examSession, onExamSessionChange,
  rollNumber, onRollNumberChange,
  onSearch, onReset,
  academicSessions, examSessions,
  classes = [], selectedClass = '', onClassChange,

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
    <div className="card-elevated rounded-xl overflow-hidden">
      {/* Mode Tabs */}
      <div className="border-b border-border bg-muted/30 px-5 pt-4 pb-0">
        <Tabs value={searchMode} onValueChange={(v) => onSearchModeChange(v as 'class' | 'individual')}>
          <TabsList className="bg-transparent gap-1 p-0 h-auto grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="class" className="w-full h-11 justify-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none px-5 text-sm font-medium gap-2 border-b-2 border-transparent data-[state=active]:border-primary">
              <Users className="w-4 h-4" />
              {bn ? 'ক্লাস-ওয়াইজ' : 'Class-wise'}
            </TabsTrigger>
            <TabsTrigger value="individual" className="w-full h-11 justify-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none px-5 text-sm font-medium gap-2 border-b-2 border-transparent data-[state=active]:border-primary">
              <User className="w-4 h-4" />
              {bn ? 'একক রেজাল্ট' : 'Individual Result'}
            </TabsTrigger>
          </TabsList>

        </Tabs>
      </div>

      <div className="p-5 space-y-4">
        {/* Search + reset */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={bn ? 'পরীক্ষা / শিক্ষাবর্ষ খুঁজুন...' : 'Search exam / academic year...'}
              className="pl-9 bg-background"
            />
          </div>
          {onReset && (examYear || examSession || rollNumber) && (
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => { setQuery(''); onReset(); }} title={bn ? 'রিসেট' : 'Reset'}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Academic year chips */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            {bn ? 'শিক্ষাবর্ষ' : 'Academic Year'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onExamYearChange('')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!examYear ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/50'}`}
            >
              {bn ? 'সব' : 'All'}
            </button>
            {filteredYears.map((y: any) => (
              <button
                key={y.id}
                type="button"
                onClick={() => onExamYearChange(examYear === y.id ? '' : y.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${examYear === y.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/50'}`}
              >
                {yearLabel(y)}
              </button>
            ))}
            {filteredYears.length === 0 && (
              <span className="text-xs text-muted-foreground py-1.5">{bn ? 'কিছু পাওয়া যায়নি' : 'No match'}</span>
            )}
          </div>
        </div>

        {/* Exam session cards */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            {bn ? 'পরীক্ষা নির্বাচন করুন' : 'Select Exam'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredSessions.map((es: any) => {
              const year = academicSessions.find((y: any) => y.id === es.academic_session_id);
              const active = examSession === es.id;
              return (
                <button
                  key={es.id}
                  type="button"
                  onClick={() => onExamSessionChange(es.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${active ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/50'}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{bn ? (es.name_bn || es.name) : es.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{yearLabel(year)}</div>
                    </div>
                    {active && <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                  </div>
                </button>
              );
            })}
            {filteredSessions.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full py-4 text-center">
                {bn ? 'কোনো পরীক্ষার সেশন নেই' : 'No exam session found'}
              </p>
            )}
          </div>
        </div>

        {/* Individual mode roll input */}
        {searchMode === 'individual' && (
          <div className="flex gap-2">
            <Input
              placeholder={bn ? 'রোল / রেজিস্ট্রেশন নম্বর' : 'Roll / Reg. Number'}
              value={rollNumber}
              onChange={(e) => onRollNumberChange(e.target.value)}
              className="bg-background"
            />
            <Button onClick={onSearch} className="btn-primary-gradient h-10">
              <Search className="w-4 h-4 mr-2" />
              {bn ? 'অনুসন্ধান' : 'Search'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultSelectionBrowser;
