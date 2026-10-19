import { useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useConfirm } from '@/contexts/ConfirmContext';
import {
  CalendarDays, Plus, Trash2, Edit, Sparkles, AlertTriangle,
  CalendarRange, Calendar as CalendarIcon, Search, Filter,
  CheckCircle2, Loader2, ArrowRight, RotateCcw
} from 'lucide-react';
import {
  Holiday,
  PRESET_HOLIDAY_TYPES,
  getHolidayCategory,
  getCleanNotes,
  prepareHolidayPayload,
  generateDateRange,
  isSatSunWeeklyHoliday,
} from '@/lib/holidayCalendarHelper';

const WEEKDAYS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTHS_BN = [
  'সকল মাস', 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];
const MONTHS_EN = [
  'All Months', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SUGGESTED_NAMES = [
  { bn: 'রমজান ও ঈদুল ফিতর ছুটি', en: 'Ramadan & Eid-ul-Fitr' },
  { bn: 'ঈদুল আযহার ছুটি', en: 'Eid-ul-Adha' },
  { bn: 'শবে ক্বদর ও জুমাআতুল বিদা', en: 'Shab-e-Qadr' },
  { bn: 'শবে বরাত', en: 'Shab-e-Barat' },
  { bn: 'গ্রীষ্মকালীন ছুটি', en: 'Summer Vacation' },
  { bn: 'শীতকালীন ছুটি', en: 'Winter Vacation' },
  { bn: 'বার্ষিক পরীক্ষা বিরতি', en: 'Annual Exam Break' },
  { bn: 'স্বাধীনতা দিবস', en: 'Independence Day' },
  { bn: 'বিজয় দিবস', en: 'Victory Day' },
  { bn: 'আন্তর্জাতিক মাতৃভাষা দিবস', en: 'Mother Language Day' },
];

export default function AdminStaffHolidays() {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [year, setYear] = useState(new Date().getFullYear());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<number>(0); // 0 = all, 1-12

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [deletingSatSun, setDeletingSatSun] = useState(false);

  // Modal state
  const [open, setOpen] = useState(false);
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [rangeStart, setRangeStart] = useState<string>(new Date().toISOString().slice(0, 10));
  const [rangeEnd, setRangeEnd] = useState<string>(new Date().toISOString().slice(0, 10));
  const [skipFridays, setSkipFridays] = useState<boolean>(false);
  const [formNameBn, setFormNameBn] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formCategory, setFormCategory] = useState<string>('public');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [formIsPaid, setFormIsPaid] = useState<boolean>(true);
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch holidays for the selected year
  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['staff-holidays', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_holidays' as any)
        .select('*')
        .gte('holiday_date', `${year}-01-01`)
        .lte('holiday_date', `${year}-12-31`)
        .order('holiday_date');
      if (error) throw error;
      return (data || []) as any as Holiday[];
    },
  });

  // Collect any custom categories already in use in the database
  const existingCustomCategories = useMemo(() => {
    const set = new Set<string>();
    holidays.forEach(h => {
      const cat = getHolidayCategory(h);
      if (!PRESET_HOLIDAY_TYPES.some(p => p.label_bn === cat || p.key === cat)) {
        set.add(cat);
      }
    });
    return Array.from(set);
  }, [holidays]);

  // Detect Saturday and Sunday weekly holidays
  const satSunHolidays = useMemo(() => {
    return holidays.filter(h => isSatSunWeeklyHoliday(h));
  }, [holidays]);

  // Statistics
  const stats = useMemo(() => {
    let weekly = 0;
    let pub = 0;
    let religious = 0;
    let custom = 0;
    let unpaid = 0;

    holidays.forEach(h => {
      if (!h.is_paid) unpaid++;
      const cat = getHolidayCategory(h);
      if (cat.includes('সাপ্তাহিক') || h.holiday_type === 'weekly') {
        weekly++;
      } else if (cat.includes('সরকারি') || h.holiday_type === 'public') {
        pub++;
      } else if (cat.includes('ধর্মীয়')) {
        religious++;
      } else {
        custom++;
      }
    });

    return { total: holidays.length, weekly, pub, religious, custom, unpaid };
  }, [holidays]);

  // Filtered holidays list
  const filteredHolidays = useMemo(() => {
    return holidays.filter(h => {
      // Month filter
      if (filterMonth > 0) {
        const m = new Date(h.holiday_date).getMonth() + 1;
        if (m !== filterMonth) return false;
      }

      // Category filter
      if (filterCategory !== 'all') {
        const cat = getHolidayCategory(h);
        if (filterCategory === 'weekly' && !cat.includes('সাপ্তাহিক')) return false;
        if (filterCategory === 'public' && !cat.includes('সরকারি')) return false;
        if (filterCategory === 'religious' && !cat.includes('ধর্মীয়')) return false;
        if (filterCategory === 'other' && (cat.includes('সাপ্তাহিক') || cat.includes('সরকারি') || cat.includes('ধর্মীয়'))) return false;
        if (filterCategory !== 'weekly' && filterCategory !== 'public' && filterCategory !== 'religious' && filterCategory !== 'other') {
          if (cat !== filterCategory) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNameBn = h.name_bn && h.name_bn.toLowerCase().includes(q);
        const matchNameEn = h.name_en && h.name_en.toLowerCase().includes(q);
        const matchDate = h.holiday_date.includes(q);
        const matchCat = getHolidayCategory(h).toLowerCase().includes(q);
        if (!matchNameBn && !matchNameEn && !matchDate && !matchCat) return false;
      }

      return true;
    });
  }, [holidays, filterMonth, filterCategory, searchQuery]);

  // Bulk remove Saturday and Sunday holidays
  const handleRemoveSatSunHolidays = async () => {
    if (satSunHolidays.length === 0) {
      toast.info(bn ? 'কোনো শনি বা রবির ছুটি নেই' : 'No Saturday or Sunday holidays found');
      return;
    }

    const confirmed = await confirm({
      title: bn ? 'শনিবার ও রবিবারের সাপ্তাহিক ছুটি মুছে ফেলবেন?' : 'Delete Saturday & Sunday weekly holidays?',
      description: bn
        ? `মোট ${satSunHolidays.length} টি অপ্রয়োজনীয় সাপ্তাহিক ছুটি স্থায়ীভাবে মুছে ফেলা হবে। শুধু শুক্রবারের সাপ্তাহিক ছুটি সংরক্ষিত থাকবে।`
        : `This will permanently delete ${satSunHolidays.length} weekly holidays. Only Friday weekly holidays will remain.`,
      variant: 'destructive',
    });
    if (!confirmed) return;

    setDeletingSatSun(true);
    try {
      const ids = satSunHolidays.map(h => h.id);
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        const { error } = await supabase.from('staff_holidays' as any).delete().in('id', chunk);
        if (error) throw error;
      }
      toast.success(bn ? `${ids.length} টি শনি ও রবির সাপ্তাহিক ছুটি সফলভাবে মুছে ফেলা হয়েছে` : `Removed ${ids.length} holidays`);
      qc.invalidateQueries({ queryKey: ['staff-holidays'] });
      qc.invalidateQueries({ queryKey: ['staff-holidays-calendar'] });
      qc.invalidateQueries({ queryKey: ['staff-holidays-month'] });
      setSelectedIds([]);
    } catch (e: any) {
      toast.error(e?.message || (bn ? 'মুছতে সমস্যা হয়েছে' : 'Failed to delete'));
    } finally {
      setDeletingSatSun(false);
    }
  };

  // Bulk add weekly Fridays for the year
  const bulkWeeklyMutation = useMutation({
    mutationFn: async (weekday: number) => {
      const dates: string[] = [];
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === weekday) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          dates.push(`${yyyy}-${mm}-${dd}`);
        }
      }
      const existing = new Set(holidays.map(h => h.holiday_date));
      const toAdd = dates.filter(d => !existing.has(d)).map(d => ({
        holiday_date: d,
        name_bn: `সাপ্তাহিক ছুটি (${WEEKDAYS_BN[weekday]})`,
        name_en: `Weekly Holiday (${WEEKDAYS_EN[weekday]})`,
        holiday_type: 'weekly',
        weekday,
        is_paid: true,
      }));
      if (toAdd.length === 0) return 0;
      const { error } = await supabase.from('staff_holidays' as any).insert(toAdd);
      if (error) throw error;
      return toAdd.length;
    },
    onSuccess: (count) => {
      toast.success(bn ? `${count} টি সাপ্তাহিক ছুটি যোগ হয়েছে` : `${count} weekly holidays added`);
      qc.invalidateQueries({ queryKey: ['staff-holidays'] });
      qc.invalidateQueries({ queryKey: ['staff-holidays-calendar'] });
      qc.invalidateQueries({ queryKey: ['staff-holidays-month'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Single delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('staff_holidays' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
      qc.invalidateQueries({ queryKey: ['staff-holidays'] });
      qc.invalidateQueries({ queryKey: ['staff-holidays-calendar'] });
      qc.invalidateQueries({ queryKey: ['staff-holidays-month'] });
      setSelectedIds(prev => prev.filter(x => x !== editingId));
    },
  });

  // Multi-delete selected
  const handleBulkDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await confirm({
      title: bn ? 'নির্বাচিত ছুটিগুলো মুছবেন?' : 'Delete selected holidays?',
      description: bn
        ? `মোট ${selectedIds.length} টি ছুটি স্থায়ীভাবে মুছে ফেলা হবে।`
        : `This will permanently delete ${selectedIds.length} holidays.`,
      variant: 'destructive',
    });
    if (!confirmed) return;

    setDeletingBulk(true);
    try {
      for (let i = 0; i < selectedIds.length; i += 50) {
        const chunk = selectedIds.slice(i, i + 50);
        const { error } = await supabase.from('staff_holidays' as any).delete().in('id', chunk);
        if (error) throw error;
      }
      toast.success(bn ? `${selectedIds.length} টি ছুটি মুছে ফেলা হয়েছে` : `Deleted ${selectedIds.length} holidays`);
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ['staff-holidays'] });
      qc.invalidateQueries({ queryKey: ['staff-holidays-calendar'] });
      qc.invalidateQueries({ queryKey: ['staff-holidays-month'] });
    } catch (e: any) {
      toast.error(e?.message || (bn ? 'মুছতে সমস্যা হয়েছে' : 'Failed to delete'));
    } finally {
      setDeletingBulk(false);
    }
  };

  // Open modal for creating new holiday
  const openNew = () => {
    setEditingId(null);
    setDateMode('single');
    const today = new Date().toISOString().slice(0, 10);
    setFormDate(today);
    setRangeStart(today);
    setRangeEnd(today);
    setSkipFridays(false);
    setFormNameBn('');
    setFormNameEn('');
    setFormCategory('public');
    setCustomCategoryInput('');
    setFormIsPaid(true);
    setFormNotes('');
    setOpen(true);
  };

  // Open modal for editing an existing holiday
  const openEdit = (h: Holiday) => {
    setEditingId(h.id);
    setDateMode('single');
    setFormDate(h.holiday_date);
    setFormNameBn(h.name_bn || '');
    setFormNameEn(h.name_en || '');
    const cat = getHolidayCategory(h);
    const isPreset = PRESET_HOLIDAY_TYPES.some(p => p.label_bn === cat || p.key === cat);
    if (isPreset) {
      const found = PRESET_HOLIDAY_TYPES.find(p => p.label_bn === cat || p.key === cat);
      setFormCategory(found ? found.key : 'public');
      setCustomCategoryInput('');
    } else {
      setFormCategory('custom');
      setCustomCategoryInput(cat);
    }
    setFormIsPaid(h.is_paid);
    setFormNotes(getCleanNotes(h.notes));
    setOpen(true);
  };

  // Save (Single date or Date range)
  const handleSave = async () => {
    // Resolve final category string
    let resolvedCategory = formCategory;
    if (formCategory === 'custom') {
      if (!customCategoryInput.trim()) {
        toast.error(bn ? 'কাস্টম ছুটির ধরনের নাম লিখুন' : 'Enter custom holiday type name');
        return;
      }
      resolvedCategory = customCategoryInput.trim();
    } else {
      const preset = PRESET_HOLIDAY_TYPES.find(p => p.key === formCategory);
      if (preset) resolvedCategory = preset.label_bn;
    }

    setIsSubmitting(true);
    try {
      if (dateMode === 'single') {
        if (!formDate) {
          toast.error(bn ? 'তারিখ নির্বাচন করুন' : 'Select a date');
          return;
        }

        const weekday = new Date(formDate).getDay();
        const payload = prepareHolidayPayload({
          holiday_date: formDate,
          name_bn: formNameBn || null,
          name_en: formNameEn || null,
          category: resolvedCategory,
          weekday: resolvedCategory.includes('সাপ্তাহিক') ? weekday : null,
          is_paid: formIsPaid,
          notes: formNotes || null,
        });

        if (editingId) {
          const { error } = await supabase
            .from('staff_holidays' as any)
            .update(payload)
            .eq('id', editingId);
          if (error) throw error;
          toast.success(bn ? 'ছুটি সফলভাবে সম্পাদিত হয়েছে' : 'Holiday updated successfully');
        } else {
          // If a holiday already exists for this date, update it; otherwise insert
          const { data: existing } = await supabase
            .from('staff_holidays' as any)
            .select('id')
            .eq('holiday_date', formDate)
            .maybeSingle();

          if ((existing as any)?.id) {
            const { error } = await supabase
              .from('staff_holidays' as any)
              .update(payload)
              .eq('id', (existing as any).id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('staff_holidays' as any)
              .insert(payload);
            if (error) throw error;
          }
          toast.success(bn ? 'নতুন ছুটি সফলভাবে সংরক্ষিত হয়েছে' : 'Holiday saved successfully');
        }
      } else {
        // Date Range Mode
        if (!rangeStart || !rangeEnd) {
          toast.error(bn ? 'শুরুর এবং শেষ তারিখ নির্বাচন করুন' : 'Select start and end date');
          return;
        }
        if (rangeStart > rangeEnd) {
          toast.error(bn ? 'শেষ তারিখ শুরুর তারিখের পরে হতে হবে' : 'End date must be after start date');
          return;
        }

        const dates = generateDateRange(rangeStart, rangeEnd, {
          skipDayOfWeek: skipFridays ? [5] : [],
        });

        if (dates.length === 0) {
          toast.error(bn ? 'কোনো প্রযোজ্য তারিখ পাওয়া যায়নি' : 'No applicable dates found in range');
          return;
        }

        // Fetch existing records for these dates to avoid duplicate key errors
        const { data: existingRows } = await supabase
          .from('staff_holidays' as any)
          .select('id, holiday_date')
          .in('holiday_date', dates);

        const existingMap = new Map<string, string>();
        (existingRows || []).forEach((r: any) => existingMap.set(r.holiday_date, r.id));

        const toInsert: any[] = [];
        const toUpdate: { id: string; payload: any }[] = [];

        dates.forEach(d => {
          const weekday = new Date(d).getDay();
          const p = prepareHolidayPayload({
            holiday_date: d,
            name_bn: formNameBn || null,
            name_en: formNameEn || null,
            category: resolvedCategory,
            weekday: resolvedCategory.includes('সাপ্তাহিক') ? weekday : null,
            is_paid: formIsPaid,
            notes: formNotes || null,
          });

          const existId = existingMap.get(d);
          if (existId) {
            toUpdate.push({ id: existId, payload: p });
          } else {
            toInsert.push(p);
          }
        });

        if (toInsert.length > 0) {
          for (let i = 0; i < toInsert.length; i += 50) {
            const { error } = await supabase
              .from('staff_holidays' as any)
              .insert(toInsert.slice(i, i + 50));
            if (error) throw error;
          }
        }

        for (const item of toUpdate) {
          const { error } = await supabase
            .from('staff_holidays' as any)
            .update(item.payload)
            .eq('id', item.id);
          if (error) throw error;
        }

        toast.success(
          bn
            ? `সফলভাবে ${dates.length} দিনের ছুটি সংরক্ষিত হয়েছে!`
            : `Successfully saved ${dates.length} days of holidays!`
        );
      }

      setOpen(false);
      qc.invalidateQueries({ queryKey: ['staff-holidays'] });
      qc.invalidateQueries({ queryKey: ['staff-holidays-calendar'] });
      qc.invalidateQueries({ queryKey: ['staff-holidays-month'] });
    } catch (e: any) {
      toast.error(e?.message || (bn ? 'সংরক্ষণে সমস্যা হয়েছে' : 'Failed to save'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Range preview dates calculation
  const rangePreviewCount = useMemo(() => {
    if (dateMode !== 'range' || !rangeStart || !rangeEnd || rangeStart > rangeEnd) return 0;
    return generateDateRange(rangeStart, rangeEnd, {
      skipDayOfWeek: skipFridays ? [5] : [],
    }).length;
  }, [dateMode, rangeStart, rangeEnd, skipFridays]);

  // Badge styler for category
  const renderCategoryBadge = (cat: string) => {
    const preset = PRESET_HOLIDAY_TYPES.find(p => p.label_bn === cat || p.key === cat);
    if (preset) {
      return (
        <Badge variant="outline" className={`text-[11px] font-medium ${preset.badgeClass}`}>
          {preset.label_bn}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[11px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
        {cat}
      </Badge>
    );
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredHolidays.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredHolidays.map(h => h.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="max-w-[1440px] mx-auto p-4 md:p-6 space-y-4">
      {/* Alert banner if Saturday or Sunday weekly holidays are present */}
      {satSunHolidays.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-[26px] bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-red-500/15 border border-amber-500/30 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                <span>{bn ? `অপ্রয়োজনীয় সাপ্তাহিক ছুটি পাওয়া গেছে: ${satSunHolidays.length} টি` : `Unwanted weekly holidays detected: ${satSunHolidays.length}`}</span>
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-mono">
                  {satSunHolidays.length} {bn ? 'দিন' : 'days'}
                </Badge>
              </div>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                {bn
                  ? 'ক্যালেন্ডারে শনিবার ও রবিবারের সাপ্তাহিক ছুটি রয়েছে যা বেতন ও উপস্থিতির হিসাব জটিল করে। শুধু শুক্রবার বহাল রেখে বাকিগুলো এক ক্লিকে রিমুভ করুন।'
                  : 'Calendar contains Saturday & Sunday weekly holidays. Click to delete them and keep Friday only.'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleRemoveSatSunHolidays}
            disabled={deletingSatSun}
            className="h-9 px-4 font-semibold shadow-sm rounded-xl shrink-0"
          >
            {deletingSatSun ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
            {bn ? `শনি ও রবির ছুটি রিমুভ করুন (${satSunHolidays.length})` : `Remove Sat & Sun Holidays (${satSunHolidays.length})`}
          </Button>
        </div>
      )}

      <Card className="rounded-[40px] backdrop-blur-xl bg-card/60 border-border/40 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <CalendarDays className="h-6 w-6 text-emerald-600" />
              {bn ? 'ছুটির ক্যালেন্ডার (স্টাফ বেতন ও হাজিরা)' : 'Holiday Calendar (Staff Salary & Attendance)'}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {bn
                ? 'সাপ্তাহিক, সরকারি, ধর্মীয় বা কাস্টম ছুটির দিন ও রেঞ্জ নির্ধারণ করুন'
                : 'Configure weekly, public, religious or custom holiday dates and ranges'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="w-[110px] h-9 text-xs font-semibold rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 h-9 rounded-xl text-xs font-medium shadow-sm">
              <Plus className="h-4 w-4 mr-1" /> {bn ? 'নতুন ছুটি যোগ' : 'Add Holiday'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { label: bn ? 'মোট ছুটি' : 'Total', value: stats.total, color: 'text-foreground', bg: 'bg-muted/30' },
              { label: bn ? 'সাপ্তাহিক ছুটি' : 'Weekly', value: stats.weekly, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
              { label: bn ? 'সরকারি ছুটি' : 'Public', value: stats.pub, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: bn ? 'ধর্মীয় ও বিশেষ' : 'Religious', value: stats.religious, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
              { label: bn ? 'অন্যান্য / কাস্টম' : 'Custom', value: stats.custom, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
              { label: bn ? 'বেতনহীন ছুটি' : 'Unpaid', value: stats.unpaid, color: 'text-red-500', bg: 'bg-red-500/10' },
            ].map((s, i) => (
              <div key={i} className={`p-3 rounded-2xl border border-border/40 ${s.bg} text-center transition-all`}>
                <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Quick Bulk Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-emerald-950 dark:text-emerald-300">
                {bn ? 'সাপ্তাহিক ছুটি বাল্ক যোগ:' : 'Weekly Holidays Bulk Add:'}
              </span>
              <Button
                size="sm"
                onClick={() => bulkWeeklyMutation.mutate(5)}
                disabled={bulkWeeklyMutation.isPending}
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
              >
                {bn ? `শুক্রবার (${year}) যোগ করুন` : `Add Friday (${year})`}
              </Button>
              <Select
                value="none"
                onValueChange={(val) => {
                  if (val !== 'none') {
                    bulkWeeklyMutation.mutate(Number(val));
                  }
                }}
              >
                <SelectTrigger className="h-7 text-xs w-[150px] bg-background/80 rounded-lg">
                  <SelectValue placeholder={bn ? 'অন্যান্য বার...' : 'Other weekdays...'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>{bn ? 'অন্য বার নির্বাচন করুন' : 'Select a weekday'}</SelectItem>
                  {[4, 6, 0, 1, 2, 3].map(d => (
                    <SelectItem key={d} value={String(d)}>
                      {bn ? `${WEEKDAYS_BN[d]}বার` : WEEKDAYS_EN[d]} ({year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {satSunHolidays.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemoveSatSunHolidays}
                disabled={deletingSatSun}
                className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
              >
                <Trash2 className="h-3 w-3 mr-1 text-red-600" />
                {bn ? 'শনি ও রবির ছুটি মুছুন' : 'Remove Sat & Sun'}
              </Button>
            )}
          </div>

          {/* Search, Filter, and Bulk Delete Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={bn ? 'নাম বা তারিখ দিয়ে খুঁজুন...' : 'Search by name or date...'}
                  className="pl-8 h-8 text-xs rounded-xl"
                />
              </div>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px] h-8 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{bn ? 'সকল ধরন' : 'All Types'}</SelectItem>
                  <SelectItem value="weekly">{bn ? 'সাপ্তাহিক ছুটি' : 'Weekly'}</SelectItem>
                  <SelectItem value="public">{bn ? 'সরকারি ছুটি' : 'Public'}</SelectItem>
                  <SelectItem value="religious">{bn ? 'ধর্মীয় ও বিশেষ' : 'Religious'}</SelectItem>
                  {existingCustomCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                  <SelectItem value="other">{bn ? 'অন্যান্য কাস্টম' : 'Other Custom'}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={String(filterMonth)} onValueChange={v => setFilterMonth(Number(v))}>
                <SelectTrigger className="w-[125px] h-8 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS_BN.map((m, idx) => (
                    <SelectItem key={idx} value={String(idx)}>{bn ? m : MONTHS_EN[idx]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1.5 rounded-xl animate-in fade-in">
                <span className="text-xs font-semibold">
                  {bn ? `${selectedIds.length} টি নির্বাচিত` : `${selectedIds.length} selected`}
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDeleteSelected}
                  disabled={deletingBulk}
                  className="h-7 text-xs px-2.5 rounded-lg"
                >
                  {deletingBulk ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
                  {bn ? 'মুছুন' : 'Delete'}
                </Button>
              </div>
            )}
          </div>

          {/* Holidays Table */}
          <div className="border border-border/40 rounded-2xl overflow-hidden bg-card/40">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b border-border/40">
                <tr>
                  <th className="w-10 px-3 py-2.5 text-center">
                    <Checkbox
                      checked={filteredHolidays.length > 0 && selectedIds.length === filteredHolidays.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold">{bn ? 'তারিখ ও বার' : 'Date & Day'}</th>
                  <th className="px-3 py-2.5 text-left font-semibold">{bn ? 'ছুটির নাম' : 'Holiday Name'}</th>
                  <th className="px-3 py-2.5 text-center font-semibold">{bn ? 'ছুটির ধরন' : 'Category / Type'}</th>
                  <th className="px-3 py-2.5 text-center font-semibold">{bn ? 'বেতনসহ' : 'Paid'}</th>
                  <th className="px-3 py-2.5 text-left font-semibold">{bn ? 'নোট' : 'Notes'}</th>
                  <th className="px-3 py-2.5 text-right font-semibold w-20">{bn ? 'অ্যাকশন' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      {bn ? 'ছুটির তালিকা লোড হচ্ছে...' : 'Loading holiday calendar...'}
                    </td>
                  </tr>
                ) : filteredHolidays.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">{bn ? 'কোনো ছুটি পাওয়া যায়নি' : 'No holidays found'}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {bn ? 'নতুন ছুটি যোগ করতে ওপরের বাটনে ক্লিক করুন।' : 'Click the button above to add holidays.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredHolidays.map(h => {
                    const d = new Date(h.holiday_date);
                    const wd = bn ? WEEKDAYS_BN[d.getDay()] : WEEKDAYS_EN[d.getDay()];
                    const category = getHolidayCategory(h);
                    const cleanNote = getCleanNotes(h.notes);
                    const isSelected = selectedIds.includes(h.id);

                    return (
                      <tr
                        key={h.id}
                        className={`hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                      >
                        <td className="px-3 py-2 text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectOne(h.id)}
                            aria-label={`Select ${h.holiday_date}`}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-semibold font-mono text-foreground">{h.holiday_date}</div>
                          <div className="text-[11px] text-muted-foreground">{wd}বার</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground">
                            {bn ? (h.name_bn || h.name_en || '-') : (h.name_en || h.name_bn || '-')}
                          </div>
                          {h.name_bn && h.name_en && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {bn ? h.name_en : h.name_bn}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {renderCategoryBadge(category)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {h.is_paid ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                              {bn ? 'বেতনসহ' : 'Paid'}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">
                              {bn ? 'বেতনহীন' : 'Unpaid'}
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {cleanNote ? (
                            <span className="line-clamp-2">{cleanNote}</span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
                              onClick={() => openEdit(h)}
                              title={bn ? 'সম্পাদনা' : 'Edit'}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-destructive"
                              onClick={async () => {
                                if (await confirm({ title: bn ? 'ছুটি মুছবেন?' : 'Delete holiday?', description: bn ? `${h.holiday_date} তারিখের ছুটিটি মুছে ফেলতে চান?` : 'Delete this holiday?', variant: 'destructive' })) {
                                  deleteMutation.mutate(h.id);
                                }
                              }}
                              title={bn ? 'মুছুন' : 'Delete'}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Holiday Dialog (Modal: Single Date or Date Range with Custom Category) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-[32px] p-5">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
              {editingId ? (bn ? 'ছুটি সম্পাদনা' : 'Edit Holiday') : (bn ? 'নতুন ছুটি যোগ' : 'Add New Holiday')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5">
            {/* Mode selection (Only if creating new) */}
            {!editingId && (
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/40">
                <button
                  type="button"
                  onClick={() => setDateMode('single')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    dateMode === 'single'
                      ? 'bg-background shadow-xs text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {bn ? 'নির্দিষ্ট একদিন' : 'Single Date'}
                </button>
                <button
                  type="button"
                  onClick={() => setDateMode('range')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    dateMode === 'range'
                      ? 'bg-background shadow-xs text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CalendarRange className="h-3.5 w-3.5" />
                  {bn ? 'তারিখের রেঞ্জ (থেকে - পর্যন্ত)' : 'Date Range (From - To)'}
                </button>
              </div>
            )}

            {/* Date Inputs */}
            {dateMode === 'single' ? (
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {bn ? 'ছুটির তারিখ' : 'Holiday Date'}
                </Label>
                <DatePicker value={formDate} onChange={setFormDate} bengali={bn} />
              </div>
            ) : (
              <div className="space-y-2 p-3 rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                      {bn ? 'শুরুর তারিখ (হতে)' : 'Start Date (From)'}
                    </Label>
                    <DatePicker value={rangeStart} onChange={setRangeStart} bengali={bn} />
                  </div>
                  <div>
                    <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                      {bn ? 'শেষ তারিখ (পর্যন্ত)' : 'End Date (To)'}
                    </Label>
                    <DatePicker value={rangeEnd} onChange={setRangeEnd} bengali={bn} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="skip-fri"
                      checked={skipFridays}
                      onCheckedChange={(c) => setSkipFridays(!!c)}
                    />
                    <label htmlFor="skip-fri" className="text-xs text-muted-foreground cursor-pointer">
                      {bn ? 'শুক্রবার বাদ দিন (সাপ্তাহিক ছুটি থাকলে)' : 'Skip Fridays'}
                    </label>
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-mono">
                    {bn ? `মোট ${rangePreviewCount} দিন` : `Total ${rangePreviewCount} days`}
                  </Badge>
                </div>
              </div>
            )}

            {/* Name Fields */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground block">
                {bn ? 'ছুটির নাম (বাংলা ও ইংরেজি)' : 'Holiday Name'}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  value={formNameBn}
                  onChange={e => setFormNameBn(e.target.value)}
                  placeholder={bn ? 'বাংলা নাম (যেমন: রমজানের ছুটি)' : 'Name in Bengali'}
                  className="h-8 text-xs rounded-xl"
                />
                <Input
                  value={formNameEn}
                  onChange={e => setFormNameEn(e.target.value)}
                  placeholder={bn ? 'ইংরেজি নাম (যেমন: Ramadan Break)' : 'Name in English'}
                  className="h-8 text-xs rounded-xl"
                />
              </div>

              {/* Quick Suggestions Chips */}
              <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
                <span className="text-[10px] text-muted-foreground shrink-0">{bn ? 'পরামর্শ:' : 'Quick:'}</span>
                {SUGGESTED_NAMES.slice(0, 4).map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFormNameBn(s.bn);
                      setFormNameEn(s.en);
                      if (s.bn.includes('রমজান') || s.bn.includes('ঈদ') || s.bn.includes('শবে')) {
                        setFormCategory('religious');
                      } else if (s.bn.includes('গ্রীষ্মকালীন')) {
                        setFormCategory('summer');
                      } else if (s.bn.includes('শীতকালীন')) {
                        setFormCategory('winter');
                      } else {
                        setFormCategory('public');
                      }
                    }}
                    className="text-[10px] bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md whitespace-nowrap transition-colors"
                  >
                    {bn ? s.bn : s.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Category / Type with Custom Type Addition */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground block">
                {bn ? 'ছুটির ধরন (কাস্টমাইজ করুন)' : 'Holiday Category / Type'}
              </Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="h-8 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-56">
                  {PRESET_HOLIDAY_TYPES.map(p => (
                    <SelectItem key={p.key} value={p.key}>
                      {bn ? p.label_bn : p.label_en}
                    </SelectItem>
                  ))}
                  {existingCustomCategories.map(cat => (
                    <SelectItem key={`custom-${cat}`} value={cat}>
                      {cat} ({bn ? 'কাস্টম' : 'Custom'})
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="font-semibold text-emerald-600">
                    {bn ? '+ নতুন কাস্টম ধরন লিখুন...' : '+ Enter Custom Type...'}
                  </SelectItem>
                </SelectContent>
              </Select>

              {formCategory === 'custom' && (
                <div className="pt-1 animate-in fade-in">
                  <Input
                    value={customCategoryInput}
                    onChange={e => setCustomCategoryInput(e.target.value)}
                    placeholder={bn ? 'কাস্টম ছুটির ধরনের নাম লিখুন (যেমন: হিফয সমাবর্তন, বার্ষিক জলসা...)' : 'Enter custom holiday type name...'}
                    className="h-8 text-xs rounded-xl border-emerald-500/40 focus:border-emerald-500"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Paid holiday switch */}
            <div className="flex items-center justify-between p-2.5 border border-border/40 rounded-xl bg-muted/20">
              <div>
                <Label className="text-xs font-medium text-foreground block cursor-pointer">
                  {bn ? 'বেতনসহ ছুটি (Paid Holiday)' : 'Paid Holiday'}
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {bn ? 'এই ছুটির দিনের জন্য স্টাফদের বেতন কাটা যাবে না' : 'Salary will not be deducted for this day'}
                </p>
              </div>
              <Switch
                checked={formIsPaid}
                onCheckedChange={setFormIsPaid}
              />
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                {bn ? 'নোট বা মন্তব্য (ঐচ্ছিক)' : 'Notes (Optional)'}
              </Label>
              <Input
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder={bn ? 'অতিরিক্ত কোনো নির্দেশনা থাকলে লিখুন...' : 'Enter any notes or details...'}
                className="h-8 text-xs rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting} className="h-8 text-xs rounded-xl">
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs rounded-xl font-medium"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {bn ? 'সংরক্ষণ করুন' : 'Save Holiday'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
