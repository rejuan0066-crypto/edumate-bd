import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import PublicLayout from '@/components/PublicLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ListChecks, Clock, FileText, Award, KeyRound, Calendar, Search } from 'lucide-react';

const OnlineExams = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [search, setSearch] = useState('');

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['public-online-exams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('online_exams')
        .select('id, title, title_bn, description, description_bn, duration_minutes, total_marks, passing_marks, start_at, end_at, access_mode, classes(name, name_bn), subjects(name, name_bn)')
        .eq('status', 'published')
        .is('deleted_at', null)
        .neq('access_mode', 'access_code')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleAccessCode = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const { data, error } = await supabase
      .from('online_exams')
      .select('id, access_code')
      .eq('access_code', trimmed)
      .eq('status', 'published')
      .is('deleted_at', null)
      .maybeSingle();
    if (error || !data) {
      alert(bn ? 'অবৈধ অ্যাক্সেস কোড' : 'Invalid access code');
      return;
    }
    navigate(`/exam/${data.id}?code=${encodeURIComponent(trimmed)}`);
  };

  const filtered = exams.filter((e: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return e.title?.toLowerCase().includes(q) || e.title_bn?.toLowerCase().includes(q);
  });

  const isOpen = (exam: any) => {
    const now = Date.now();
    if (exam.start_at && new Date(exam.start_at).getTime() > now) return false;
    if (exam.end_at && new Date(exam.end_at).getTime() < now) return false;
    return true;
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <ListChecks className="w-7 h-7 text-primary" />
            </div>
            {bn ? 'অনলাইন পরীক্ষা' : 'Online Exams'}
          </h1>
          <p className="text-muted-foreground mt-2 ml-[68px]">
            {bn ? 'প্রকাশিত পরীক্ষাগুলোতে অংশগ্রহণ করুন বা অ্যাক্সেস কোড দিয়ে যুক্ত হোন' : 'Join published exams or enter via access code'}
          </p>
        </div>

        {/* Access code */}
        <Card className="rounded-3xl p-5 mb-6 border-0 bg-gradient-to-br from-primary/5 to-card backdrop-blur-xl">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <KeyRound className="w-4 h-4 text-primary" />
              {bn ? 'অ্যাক্সেস কোড দিয়ে যোগ দিন:' : 'Join with access code:'}
            </div>
            <Input
              placeholder={bn ? 'কোড লিখুন...' : 'Enter code...'}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded-2xl flex-1 max-w-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAccessCode()}
            />
            <Button onClick={handleAccessCode} className="rounded-2xl">
              {bn ? 'যোগ দিন' : 'Join'}
            </Button>
          </div>
        </Card>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={bn ? 'পরীক্ষা খুঁজুন...' : 'Search exams...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-2xl"
          />
        </div>

        {isLoading ? (
          <Card className="rounded-3xl p-10 text-center text-muted-foreground">
            {bn ? 'লোড হচ্ছে...' : 'Loading...'}
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="rounded-3xl p-10 text-center">
            <ListChecks className="w-16 h-16 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {bn ? 'এখন কোনো পরীক্ষা প্রকাশিত নেই' : 'No exams currently published'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((exam: any) => {
              const open = isOpen(exam);
              return (
                <Card key={exam.id} className="rounded-[28px] p-5 border-0 bg-card/60 backdrop-blur-xl hover:shadow-xl transition-all">
                  <h3 className="font-bold text-lg leading-tight mb-2">
                    {bn ? exam.title_bn : (exam.title || exam.title_bn)}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {exam.classes && (
                      <Badge variant="secondary" className="rounded-full">
                        {bn ? exam.classes.name_bn : exam.classes.name}
                      </Badge>
                    )}
                    {exam.subjects && (
                      <Badge variant="outline" className="rounded-full">
                        {bn ? exam.subjects.name_bn : exam.subjects.name}
                      </Badge>
                    )}
                    {!open && (
                      <Badge className="rounded-full bg-muted text-muted-foreground">
                        {bn ? 'বন্ধ' : 'Closed'}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="rounded-2xl bg-muted/40 p-2">
                      <Clock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">{bn ? 'সময়' : 'Time'}</p>
                      <p className="font-semibold text-sm">{exam.duration_minutes}m</p>
                    </div>
                    <div className="rounded-2xl bg-muted/40 p-2">
                      <Award className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">{bn ? 'নম্বর' : 'Marks'}</p>
                      <p className="font-semibold text-sm">{exam.total_marks}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/40 p-2">
                      <FileText className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">{bn ? 'পাশ' : 'Pass'}</p>
                      <p className="font-semibold text-sm">{exam.passing_marks}</p>
                    </div>
                  </div>

                  {(exam.start_at || exam.end_at) && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                      <Calendar className="w-3 h-3" />
                      {exam.end_at ? new Date(exam.end_at).toLocaleString() : ''}
                    </div>
                  )}

                  <Button
                    onClick={() => navigate(`/exam/${exam.id}`)}
                    disabled={!open}
                    className="w-full rounded-2xl"
                  >
                    {open ? (bn ? 'শুরু করুন' : 'Start Exam') : (bn ? 'বন্ধ' : 'Closed')}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default OnlineExams;
