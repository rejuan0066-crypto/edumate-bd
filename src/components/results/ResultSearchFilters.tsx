import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, User, Users, RotateCcw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ResultSearchFiltersProps {
  searchMode: 'class' | 'individual';
  onSearchModeChange: (mode: 'class' | 'individual') => void;
  examYear: string;
  onExamYearChange: (v: string) => void;
  examSession: string;
  onExamSessionChange: (v: string) => void;
  selectedClass: string;
  onClassChange: (v: string) => void;
  rollNumber: string;
  onRollNumberChange: (v: string) => void;
  academicSessions: any[];
  classes: any[];
  examSessions: any[];
  onSearch: () => void;
  onReset?: () => void;
}

const ResultSearchFilters = ({
  searchMode, onSearchModeChange,
  examYear, onExamYearChange,
  examSession, onExamSessionChange,
  selectedClass, onClassChange,
  rollNumber, onRollNumberChange,
  academicSessions, classes, examSessions,
  onSearch, onReset,
}: ResultSearchFiltersProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  return (
    <div className="card-elevated rounded-xl overflow-hidden">
      {/* Tabs Header */}
      <div className="border-b border-border bg-muted/30 px-5 pt-4 pb-0">
        <Tabs value={searchMode} onValueChange={(v) => onSearchModeChange(v as 'class' | 'individual')}>
          <TabsList className="bg-transparent gap-1 p-0 h-auto">
            <TabsTrigger
              value="class"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none px-5 py-2.5 text-sm font-medium gap-2 border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <Users className="w-4 h-4" />
              {bn ? 'ক্লাস-ওয়াইজ অনুসন্ধান' : 'Class-wise Search'}
            </TabsTrigger>
            <TabsTrigger
              value="individual"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-lg rounded-b-none px-5 py-2.5 text-sm font-medium gap-2 border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <User className="w-4 h-4" />
              {bn ? 'ব্যক্তিগত অনুসন্ধান' : 'Individual Search'}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filter Fields */}
      <div className="p-5">
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${searchMode === 'individual' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3`}>
          <Select value={examYear} onValueChange={onExamYearChange}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={bn ? 'শিক্ষাবর্ষ' : 'Academic Year'} />
            </SelectTrigger>
            <SelectContent>
              {academicSessions.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{bn ? (s.name_bn || s.name) : s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={examSession} onValueChange={onExamSessionChange}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={bn ? 'পরীক্ষার সেশন' : 'Exam Session'} />
            </SelectTrigger>
            <SelectContent>
              {examSessions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {bn ? 'কোনো পরীক্ষার সেশন নেই' : 'No exam session found'}
                </div>
              ) : examSessions.map((es: any) => (
                <SelectItem key={es.id} value={es.id}>{bn ? (es.name_bn || es.name) : es.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedClass} onValueChange={onClassChange}>
            <SelectTrigger className="bg-background" disabled={!examSession}>
              <SelectValue placeholder={bn ? 'শ্রেণী' : 'Class'} />
            </SelectTrigger>
            <SelectContent>
              {classes.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {bn ? 'এই সেশনে কোনো শ্রেণী যুক্ত নেই' : 'No class linked to this session'}
                </div>
              ) : classes.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{bn ? (c.name_bn || c.name) : c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>


          {searchMode === 'individual' && (
            <Input
              placeholder={bn ? 'রোল / রেজিস্ট্রেশন নম্বর' : 'Roll / Reg. Number'}
              value={rollNumber}
              onChange={(e) => onRollNumberChange(e.target.value)}
              className="bg-background"
            />
          )}

          <div className="flex gap-2">
            <Button onClick={onSearch} className="btn-primary-gradient h-10 flex-1">
              <Search className="w-4 h-4 mr-2" />
              {bn ? 'অনুসন্ধান' : 'Search'}
            </Button>
            {(examYear || examSession || selectedClass || rollNumber) && onReset && (
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={onReset} title={bn ? 'রিসেট' : 'Reset'}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultSearchFilters;
