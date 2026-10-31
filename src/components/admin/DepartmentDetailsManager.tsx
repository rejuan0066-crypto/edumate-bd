import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, BookOpen, Clock, UserCheck, Users, GraduationCap, ChevronDown, ChevronUp, Layers, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface DepartmentDetailEntry {
  desc: string;
  duration: string;
  age: string;
  seats: string;
  syllabus: string[];
  syllabus_text?: string;
  outcome: string;
}

const DEFAULT_DETAILS_MAP: Record<string, DepartmentDetailEntry> = {
  noorani: {
    desc: 'সহীহ মাখরাজ ও তাজবীদের সাথে কুরআন শিক্ষা, প্রয়োজনীয় মাসআলা, বাংলা, ইংরেজি, গণিত ও ক্যালিগ্রাফি প্রশিক্ষণ।',
    duration: '৩ বছর মেয়াদি (নূরানি ১ম, ২য় ও ৩য় শ্রেণি)',
    age: '৪ থেকে ৮ বছর বয়সী শিশু',
    seats: '৬০ জন (আবাসিক ও অনাবাসিক)',
    syllabus: [
      'বিশুদ্ধ মাখরাজ ও তাজবীদের সাথে আরবি হরফ ও কুরআন তিলাওয়াত।',
      'আমপারা হিফজ ও দৈনন্দিন মাসনুন দোয়া ও জরুরি মাসআলা শিক্ষা।',
      'বাংলা ও ইংরেজি ব্যাকরণ, রিডিং ও সুন্দর ক্যালিগ্রাফি হস্তলিপি প্রশিক্ষণ।',
      'প্রাথমিক গণিত, ড্রয়িং ও আদব-আখলাক শিষ্টাচার শিক্ষা।',
    ],
    outcome:
      'নূরানী সমাপনী পরীক্ষা শেষে কেন্দ্রীয় সনদ প্রদান করা হয় এবং শিক্ষার্থী সরাসরি হিফজ বা ইবতেদায়ী শাখায় ভর্তির পূর্ণ যোগ্যতা অর্জন করে।',
  },
  ebthedayee: {
    desc: 'সহীহ কুরআন ও দ্বীনি শিক্ষার পাশাপাশি সাধারণ প্রাথমিক বিষয়াবলি এবং আরবি ব্যাকরণের বুনিয়াদি পাঠদান।',
    duration: '২ বছর মেয়াদি (৪র্থ ও ৫ম শ্রেণি)',
    age: '৮ থেকে ১১ বছর',
    seats: '৫০ জন (আবাসিক ও অনাবাসিক)',
    syllabus: [
      'কুরআনুল কারীম তিলাওয়াত ও অর্থসহ সহজ হাদিস মুখস্থকরণ।',
      'প্রাথমিক ফিকহ, আকাইদ ও ইসলামের মৌলিক বুনিয়াদি শিক্ষা।',
      'বাংলা, ইংরেজি, গণিত ও সাধারণ বিজ্ঞান পাঠ্যক্রম।',
      'সুন্দর হস্তলিপি ও ইসলামী আচরণবিধি অনুশীলন।',
    ],
    outcome:
      'ইবতেদায়ী ৫ম সমাপনীতে কেন্দ্রীয় পরীক্ষায় অংশগ্রহণ এবং মুতাওয়াসসিতাহ স্তরে পদার্পণের স্বীকৃতি।',
  },
  mutawassitah: {
    desc: 'আরবি ব্যাকরণ (নাহু-ছরফ), তরজমায়ে কুরআন, হাদিস শরিফ ও ফিকহের প্রামাণ্য কিতাবাদি অধ্যয়নের সুশৃঙ্খল পাঠদান।',
    duration: '২-৩ বছর মেয়াদি (সরফ ও নাহমেবির বর্ষ)',
    age: 'ইবতেদায়ী বা হিফজ সম্পন্নকারী',
    seats: '৪৫ জন (আবাসিক)',
    syllabus: [
      'ইলমুস সরফ (মিযান, মুনশাইব) ও আরবি শব্দরূপ রূপান্তর।',
      'ইলমুন নাহু (নাহবেমীর) ও আরবি বাক্যগঠন বিশ্লেষণ।',
      'ফিকহ শাস্ত্রের মূলনীতি ও প্রাথমিক মসলা-মাসায়েল।',
      'আরবি কথোপকথন ও শুদ্ধ উচ্চারণ প্রশিক্ষণ।',
    ],
    outcome:
      'শিক্ষার্থীকে আরবি ভাষা ও দ্বীনের মৌলিক বিদ্যায় দক্ষ করে উচ্চতর কওমি মাদরাসায় ভর্তির উপযোগী করে তোলা।',
  },
  hifz: {
    desc: 'নাজেরা থেকে শুরু করে সম্পূর্ণ ৩০ পারা কুরআন হিফজ, তাজবীদ, সুমধুর কণ্ঠে মাশক এবং সাপ্তাহিক কেন্দ্রীয় দৌর (আমোক্তা)।',
    duration: '২ থেকে ৩ বছর মেয়াদি (মেধা অনুযায়ী)',
    age: 'নাজেরা উত্তীর্ণ শিক্ষার্থী',
    seats: '৭০ জন (শতভাগ আবাসিক নিবিড় তত্ত্বাবধান)',
    syllabus: [
      'হিফজ নাজেরা ও দেখে পড়ার নিখুঁত দ্রুততা অর্জন।',
      'দৈনিক নতুন সবক (হিফজ), সাত সবক ও আমপারা রিভিশনের কঠোর অনুশাসন।',
      'আন্তর্জাতিক ক্বারীদের তিলাওয়াত অনুকরণে সুর ও তাজবীদ মাশক।',
      'পারাভিত্তিক সাপ্তাহিক ও মাসিক কেন্দ্রীয় দৌর (৫ পারা, ১০ পারা, ২০ পারা)।',
    ],
    outcome:
      'হিফজ সমাপনীতে কেন্দ্রীয় বেফাকুল মাদারিসের সনদ, পাগড়ি প্রদান ও আন্তর্জাতিক হিফজ প্রতিযোগিতায় অংশগ্রহণের সুযোগ।',
  },
};

export const DepartmentDetailsManager = () => {
  const queryClient = useQueryClient();
  const [openAccordion, setOpenAccordion] = useState<Record<string, boolean>>({});
  const [detailsState, setDetailsState] = useState<Record<string, DepartmentDetailEntry>>({});

  // 1. Fetch divisions from database
  const { data: divisions = [], isLoading: divLoading } = useQuery({
    queryKey: ['admin-divisions-for-details'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // 2. Fetch saved department details from website_settings
  const { data: savedConfig, isLoading: configLoading } = useQuery({
    queryKey: ['department-details-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'department_details_config')
        .maybeSingle();
      if (error) return {};
      return (data?.value as Record<string, any>) || {};
    },
  });

  // 3. Initialize local state merging DB config with intelligent defaults
  useEffect(() => {
    if (!divisions.length) return;

    const nextState: Record<string, DepartmentDetailEntry> = {};
    const initialAccordion: Record<string, boolean> = {};

    divisions.forEach((div: any, idx: number) => {
      const key = div.id;
      const name = (div.name_bn || div.name || '').toLowerCase();

      // Find best default
      let defaultEntry = DEFAULT_DETAILS_MAP.noorani;
      if (name.includes('নূরানি') || name.includes('nuarani')) defaultEntry = DEFAULT_DETAILS_MAP.noorani;
      else if (name.includes('ইবতেদায়ী') || name.includes('ইবতেদায়ী') || name.includes('ebthedayee')) defaultEntry = DEFAULT_DETAILS_MAP.ebthedayee;
      else if (name.includes('মুতাওয়াসসিতাহ') || name.includes('মুতাওয়াসসিতাহ') || name.includes('mutawassitah')) defaultEntry = DEFAULT_DETAILS_MAP.mutawassitah;
      else if (name.includes('হিফজ') || name.includes('hifz')) defaultEntry = DEFAULT_DETAILS_MAP.hifz;

      const saved = savedConfig?.[key] || savedConfig?.[div.name_bn] || {};

      const syllabusArray = Array.isArray(saved.syllabus)
        ? saved.syllabus
        : defaultEntry.syllabus;

      nextState[key] = {
        desc: saved.desc !== undefined ? saved.desc : defaultEntry.desc,
        duration: saved.duration !== undefined ? saved.duration : defaultEntry.duration,
        age: saved.age !== undefined ? saved.age : defaultEntry.age,
        seats: saved.seats !== undefined ? saved.seats : defaultEntry.seats,
        syllabus: syllabusArray,
        syllabus_text: syllabusArray.join('\n'),
        outcome: saved.outcome !== undefined ? saved.outcome : defaultEntry.outcome,
      };

      initialAccordion[key] = idx === 0; // open first by default
    });

    setDetailsState(nextState);
    setOpenAccordion(initialAccordion);
  }, [divisions, savedConfig]);

  // 4. Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {};

      Object.entries(detailsState).forEach(([key, val]) => {
        const syllabusList = (val.syllabus_text || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);

        payload[key] = {
          desc: val.desc || '',
          duration: val.duration || '',
          age: val.age || '',
          seats: val.seats || '',
          syllabus: syllabusList.length > 0 ? syllabusList : val.syllabus,
          outcome: val.outcome || '',
        };
      });

      const { error } = await supabase.from('website_settings').upsert(
        {
          key: 'department_details_config',
          value: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('বিভাগসমূহের বিস্তারিত তথ্য ও সিলেবাস সফলভাবে সংরক্ষিত হয়েছে!');
      queryClient.invalidateQueries({ queryKey: ['department-details-config'] });
      queryClient.invalidateQueries({ queryKey: ['public-divisions-home-with-classes'] });
    },
    onError: (err: any) => {
      toast.error('সংরক্ষণ ব্যর্থ হয়েছে: ' + (err.message || 'Error'));
    },
  });

  const handleFieldChange = (divId: string, field: keyof DepartmentDetailEntry, value: any) => {
    setDetailsState((prev) => ({
      ...prev,
      [divId]: {
        ...prev[divId],
        [field]: value,
      },
    }));
  };

  const toggleAccordion = (divId: string) => {
    setOpenAccordion((prev) => ({ ...prev, [divId]: !prev[divId] }));
  };

  if (divLoading || configLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        লোড হচ্ছে...
      </div>
    );
  }

  return (
    <div className="card-elevated p-6 space-y-6 mt-6 border-2 border-emerald-500/20 bg-card">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span>শিক্ষা বিভাগসমূহের বিস্তারিত তথ্য ও সিলেবাস এডিটর</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            হোম পেজের "সিলেবাস ও বিস্তারিত দেখুন" পপআপে প্রদর্শিত কোর্স মেয়াদ, ভর্তি বয়স, আসন সংখ্যা, সিলেবাস ও সমাপনী সনদ কাস্টমাইজ করুন।
          </p>
        </div>
        <Button
          className="btn-primary-gradient shrink-0"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Save className="w-4 h-4 mr-1.5" />
          <span>{saveMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'সব তথ্য সংরক্ষণ করুন'}</span>
        </Button>
      </div>

      <div className="space-y-4">
        {divisions.map((div: any, idx: number) => {
          const divId = div.id;
          const entry = detailsState[divId] || {
            desc: '',
            duration: '',
            age: '',
            seats: '',
            syllabus: [],
            syllabus_text: '',
            outcome: '',
          };
          const isOpen = Boolean(openAccordion[divId]);

          return (
            <div
              key={divId}
              className="rounded-xl border border-border bg-background shadow-xs overflow-hidden transition-all"
            >
              <div
                onClick={() => toggleAccordion(divId)}
                className="p-4 bg-muted/40 hover:bg-muted/70 cursor-pointer flex items-center justify-between select-none"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">
                      {div.name_bn || div.name}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {entry.duration || 'মেয়াদ নির্ধারিত নেই'} • {entry.age || 'বয়স নির্ধারিত নেই'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {div.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {isOpen && (
                <div className="p-5 space-y-4 border-t bg-card/50">
                  {/* Short Description */}
                  <div>
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                      সংক্ষিপ্ত বিবরণ (হোম পেজের কার্ডে যা প্রদর্শিত হবে):
                    </Label>
                    <Textarea
                      rows={2}
                      className="bg-background text-sm"
                      value={entry.desc}
                      onChange={(e) => handleFieldChange(divId, 'desc', e.target.value)}
                      placeholder="বিভাগের সংক্ষিপ্ত পরিচিতি ও প্রশিক্ষণ লক্ষ্য লিখুন..."
                    />
                  </div>

                  {/* 3 Specs Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        কোর্স মেয়াদ ও সময়কাল:
                      </Label>
                      <Input
                        className="bg-background text-sm"
                        value={entry.duration}
                        onChange={(e) => handleFieldChange(divId, 'duration', e.target.value)}
                        placeholder="যেমন: ৩ বছর মেয়াদি"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                        ভর্তি যোগ্যতা ও বয়স:
                      </Label>
                      <Input
                        className="bg-background text-sm"
                        value={entry.age}
                        onChange={(e) => handleFieldChange(divId, 'age', e.target.value)}
                        placeholder="যেমন: ৪ থেকে ৮ বছর বয়সী শিশু"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                        <Users className="w-3.5 h-3.5 text-amber-600" />
                        মোট আসন ও সুযোগ-সুবিধা:
                      </Label>
                      <Input
                        className="bg-background text-sm"
                        value={entry.seats}
                        onChange={(e) => handleFieldChange(divId, 'seats', e.target.value)}
                        placeholder="যেমন: ৬০ জন (আবাসিক ও অনাবাসিক)"
                      />
                    </div>
                  </div>

                  {/* Syllabus (Multi-line) */}
                  <div>
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      পাঠ্যক্রম ও প্রধান প্রশিক্ষণ সূচি (সিলেবাস) — প্রতি লাইনে একটি করে বিষয় লিখুন:
                    </Label>
                    <Textarea
                      rows={4}
                      className="bg-background text-sm font-sans"
                      value={entry.syllabus_text}
                      onChange={(e) => handleFieldChange(divId, 'syllabus_text', e.target.value)}
                      placeholder="যেমন:&#10;সহীহ মাখরাজ ও তাজবীদের সাথে আরবি হরফ ও কুরআন তিলাওয়াত।&#10;আমপারা হিফজ ও দৈনন্দিন মাসনুন দোয়া।&#10;বাংলা, ইংরেজি ও সুন্দর ক্যালিগ্রাফি।"
                    />
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      * টিপস: প্রতি লাইনে নতুন এন্টার দিয়ে একটি করে প্রশিক্ষণ বিষয় লিখলে তা মোডালে টিক চিহ্ন (✓) দিয়ে সুন্দরভাবে প্রদর্শিত হবে।
                    </span>
                  </div>

                  {/* Outcome */}
                  <div>
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                      সমাপনী ফলাফল ও কেন্দ্রীয় সনদ বিবরণী:
                    </Label>
                    <Textarea
                      rows={2}
                      className="bg-background text-sm"
                      value={entry.outcome}
                      onChange={(e) => handleFieldChange(divId, 'outcome', e.target.value)}
                      placeholder="সমাপনী পরীক্ষা, কেন্দ্রীয় বেফাকুল মাদারিসের সনদ বা পাগড়ি প্রদান ইত্যাদি..."
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2 flex justify-end">
        <Button
          className="btn-primary-gradient"
          size="lg"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          <span>{saveMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'সব তথ্য সংরক্ষণ করুন'}</span>
        </Button>
      </div>
    </div>
  );
};

export default DepartmentDetailsManager;
