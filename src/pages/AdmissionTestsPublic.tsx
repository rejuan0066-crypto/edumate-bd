import PublicLayout from '@/components/PublicLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Clock, Award, Users, ChevronRight, Loader2, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdmissionTestsPublic = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['public-admission-tests'],
    queryFn: async () => {
      const { data } = await supabase
        .from('admission_tests')
        .select('*, classes(name, name_bn)')
        .eq('is_published', true)
        .is('deleted_at', null)
        .order('opens_at', { ascending: false, nullsFirst: false });
      return data || [];
    },
  });

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-4">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            {bn ? 'অনলাইন ভর্তি পরীক্ষা' : 'Online Admission Tests'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {bn ? 'টাইমড MCQ পরীক্ষা — তাৎক্ষণিক ফলাফল ও মেধাক্রম' : 'Timed MCQ tests with instant result and merit ranking'}
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-16"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
        ) : tests.length === 0 ? (
          <Card className="p-16 rounded-[28px] text-center max-w-2xl mx-auto">
            <BookOpen className="w-20 h-20 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-display font-semibold text-foreground mb-2">
              {bn ? 'এই মুহূর্তে কোনো পরীক্ষা চালু নেই' : 'No active tests at the moment'}
            </h2>
            <p className="text-muted-foreground">{bn ? 'অনুগ্রহ করে পরে আবার দেখুন' : 'Please check back later'}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {tests.map((t: any) => {
              const now = new Date();
              const opens = t.opens_at ? new Date(t.opens_at) : null;
              const closes = t.closes_at ? new Date(t.closes_at) : null;
              const isOpen = (!opens || now >= opens) && (!closes || now <= closes);
              const isUpcoming = opens && now < opens;
              const isClosed = closes && now > closes;

              return (
                <Card key={t.id} className="p-6 rounded-[24px] hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <h3 className="font-display font-bold text-foreground line-clamp-2 leading-tight">
                      {bn ? t.title_bn : t.title}
                    </h3>
                    {isOpen ? (
                      <Badge className="bg-emerald-500 shrink-0 animate-pulse">{bn ? 'চলছে' : 'Live'}</Badge>
                    ) : isUpcoming ? (
                      <Badge className="bg-sky-500 shrink-0">{bn ? 'আসন্ন' : 'Upcoming'}</Badge>
                    ) : isClosed ? (
                      <Badge variant="outline" className="shrink-0">{bn ? 'শেষ' : 'Ended'}</Badge>
                    ) : null}
                  </div>

                  {(bn ? t.description_bn : t.description) && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {bn ? t.description_bn : t.description}
                    </p>
                  )}

                  {t.classes && (
                    <p className="text-xs text-muted-foreground mb-3">
                      {bn ? 'শ্রেণী: ' : 'Class: '}{bn ? t.classes.name_bn : t.classes.name}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 my-4">
                    <div className="bg-primary/5 rounded-xl p-2 text-center">
                      <Clock className="w-4 h-4 mx-auto text-primary mb-1" />
                      <div className="font-bold text-sm text-foreground">{t.duration_minutes}</div>
                      <div className="text-[10px] text-muted-foreground">{bn ? 'মিনিট' : 'min'}</div>
                    </div>
                    <div className="bg-amber-500/5 rounded-xl p-2 text-center">
                      <Award className="w-4 h-4 mx-auto text-amber-600 mb-1" />
                      <div className="font-bold text-sm text-foreground">{t.total_marks}</div>
                      <div className="text-[10px] text-muted-foreground">{bn ? 'নম্বর' : 'marks'}</div>
                    </div>
                    <Link to={`/admission-test/${t.id}/merit`} className="bg-emerald-500/5 rounded-xl p-2 text-center hover:bg-emerald-500/10 transition-colors">
                      <Users className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                      <div className="font-bold text-sm text-foreground">→</div>
                      <div className="text-[10px] text-muted-foreground">{bn ? 'মেধাক্রম' : 'Merit'}</div>
                    </Link>
                  </div>

                  <div className="mt-auto">
                    {isOpen ? (
                      <Link to={`/admission-test/${t.id}`}>
                        <Button className="w-full rounded-full">
                          {bn ? 'পরীক্ষা শুরু করুন' : 'Start Test'} <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    ) : isUpcoming ? (
                      <Button disabled className="w-full rounded-full" variant="outline">
                        {bn ? `${opens?.toLocaleString(bn ? 'bn-BD' : 'en-US')} এ শুরু` : `Starts ${opens?.toLocaleString()}`}
                      </Button>
                    ) : (
                      <Link to={`/admission-test/${t.id}/merit`}>
                        <Button variant="outline" className="w-full rounded-full">
                          {bn ? 'মেধাক্রম দেখুন' : 'View Merit List'} <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default AdmissionTestsPublic;
