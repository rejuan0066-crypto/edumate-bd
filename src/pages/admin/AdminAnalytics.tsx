import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts';
import { CalendarIcon, TrendingUp, TrendingDown, Wallet, Users, GraduationCap, BookOpen, UserCheck, UserX, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444'];

type Preset = 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'last_6_months' | 'custom';

const AdminAnalytics = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const monthLabels = bn ? MONTHS_BN : MONTHS_EN;

  const [preset, setPreset] = useState<Preset>('this_year');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const { from, to } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    switch (preset) {
      case 'this_month': return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0) };
      case 'last_month': return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0) };
      case 'this_year': return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) };
      case 'last_year': return { from: new Date(y - 1, 0, 1), to: new Date(y - 1, 11, 31) };
      case 'last_6_months': return { from: new Date(y, m - 5, 1), to: new Date(y, m + 1, 0) };
      case 'custom': return { from: customFrom || new Date(y, 0, 1), to: customTo || new Date() };
    }
  }, [preset, customFrom, customTo]);

  const inRange = (d: string | null | undefined) => {
    if (!d) return false;
    const dt = new Date(d);
    return dt >= from && dt <= to;
  };

  // ---------- Data Queries ----------
  const { data: students = [] } = useQuery({
    queryKey: ['analytics-students'],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('id, status, gender, admission_date, division_id, class_id, session_id').is('deleted_at', null);
      return data || [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['analytics-staff'],
    queryFn: async () => {
      const { data } = await supabase.from('staff').select('id, status, staff_category, joining_date').is('deleted_at', null);
      return data || [];
    },
  });

  const { data: feePayments = [] } = useQuery({
    queryKey: ['analytics-fees'],
    queryFn: async () => {
      const { data } = await supabase.from('fee_payments').select('paid_amount, amount, status, paid_at, fee_type_id').eq('status', 'paid').is('deleted_at', null);
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['analytics-expenses'],
    queryFn: async () => {
      const { data } = await supabase.from('expenses').select('amount, expense_date, category_id').is('deleted_at', null);
      return data || [];
    },
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['analytics-attendance'],
    queryFn: async () => {
      const { data } = await supabase.from('attendance_records').select('attendance_date, status, entity_type').gte('attendance_date', format(from, 'yyyy-MM-dd')).lte('attendance_date', format(to, 'yyyy-MM-dd'));
      return data || [];
    },
  });

  const { data: results = [] } = useQuery({
    queryKey: ['analytics-results'],
    queryFn: async () => {
      const { data } = await supabase.from('results').select('marks, gpa, grade, student_id, subject_id, division_id');
      return data || [];
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['analytics-subjects'],
    queryFn: async () => {
      const { data } = await supabase.from('subjects').select('id, class_id');
      return data || [];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['analytics-classes'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('id, name, name_bn');
      return data || [];
    },
  });

  // ---------- Financial Computations ----------
  const financial = useMemo(() => {
    const filtered = feePayments.filter(p => inRange(p.paid_at));
    const filteredExp = expenses.filter(e => inRange(e.expense_date));
    const totalFees = filtered.reduce((s, p) => s + Number(p.paid_amount || p.amount || 0), 0);
    const totalExp = filteredExp.reduce((s, e) => s + Number(e.amount || 0), 0);
    const net = totalFees - totalExp;

    // Build monthly trend within range
    const monthMap = new Map<string, { fees: number; expenses: number; label: string }>();
    const cur = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cur <= to) {
      const key = `${cur.getFullYear()}-${cur.getMonth()}`;
      monthMap.set(key, { fees: 0, expenses: 0, label: `${monthLabels[cur.getMonth()]} ${String(cur.getFullYear()).slice(-2)}` });
      cur.setMonth(cur.getMonth() + 1);
    }
    filtered.forEach(p => {
      if (!p.paid_at) return;
      const d = new Date(p.paid_at);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthMap.has(k)) monthMap.get(k)!.fees += Number(p.paid_amount || p.amount || 0);
    });
    filteredExp.forEach(e => {
      if (!e.expense_date) return;
      const d = new Date(e.expense_date);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthMap.has(k)) monthMap.get(k)!.expenses += Number(e.amount || 0);
    });
    const trend = Array.from(monthMap.values());
    return { totalFees, totalExp, net, trend };
  }, [feePayments, expenses, from, to, monthLabels]);

  // ---------- Attendance Computations ----------
  const attendanceStats = useMemo(() => {
    const present = attendance.filter(a => a.status === 'present').length;
    const absent = attendance.filter(a => a.status === 'absent').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const total = attendance.length || 1;
    const rate = ((present + late) / total) * 100;

    // Daily trend (last 30 days within range)
    const dayMap = new Map<string, { present: number; absent: number; date: string }>();
    attendance.forEach(a => {
      if (!a.attendance_date) return;
      const k = a.attendance_date;
      if (!dayMap.has(k)) dayMap.set(k, { present: 0, absent: 0, date: format(new Date(k), 'dd MMM') });
      if (a.status === 'present' || a.status === 'late') dayMap.get(k)!.present++;
      else if (a.status === 'absent') dayMap.get(k)!.absent++;
    });
    const daily = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-30).map(([, v]) => v);

    const breakdown = [
      { name: bn ? 'উপস্থিত' : 'Present', value: present },
      { name: bn ? 'অনুপস্থিত' : 'Absent', value: absent },
      { name: bn ? 'দেরিতে' : 'Late', value: late },
    ];
    return { present, absent, late, rate, daily, breakdown };
  }, [attendance, bn]);

  // ---------- Academic Performance ----------
  const academic = useMemo(() => {
    const totalResults = results.length;
    const isPass = (g: number) => g >= 2;
    const passed = results.filter(r => isPass(Number(r.gpa || 0))).length;
    const passRate = totalResults ? (passed / totalResults) * 100 : 0;
    const avgGPA = totalResults ? results.reduce((s, r) => s + Number(r.gpa || 0), 0) / totalResults : 0;

    const gpaBuckets = [
      { range: '5.0', count: 0 },
      { range: '4.0-4.9', count: 0 },
      { range: '3.0-3.9', count: 0 },
      { range: '2.0-2.9', count: 0 },
      { range: '<2.0', count: 0 },
    ];
    results.forEach(r => {
      const g = Number(r.gpa || 0);
      if (g >= 5) gpaBuckets[0].count++;
      else if (g >= 4) gpaBuckets[1].count++;
      else if (g >= 3) gpaBuckets[2].count++;
      else if (g >= 2) gpaBuckets[3].count++;
      else if (g > 0) gpaBuckets[4].count++;
    });

    // Class-wise pass rate (resolved via subjects → class_id)
    const subjectClassMap = new Map<string, string>();
    subjects.forEach(s => { if (s.class_id) subjectClassMap.set(s.id, s.class_id); });
    const classMap = new Map<string, { total: number; pass: number }>();
    results.forEach(r => {
      const cid = subjectClassMap.get(r.subject_id);
      if (!cid) return;
      if (!classMap.has(cid)) classMap.set(cid, { total: 0, pass: 0 });
      const c = classMap.get(cid)!;
      c.total++;
      if (isPass(Number(r.gpa || 0))) c.pass++;
    });
    const classWise = Array.from(classMap.entries()).map(([cid, v]) => {
      const cls = classes.find(c => c.id === cid);
      return { name: cls ? (bn ? cls.name_bn : cls.name) : '', rate: v.total ? (v.pass / v.total) * 100 : 0, total: v.total };
    }).slice(0, 10);

    return { totalResults, passed, passRate, avgGPA, gpaBuckets, classWise };
  }, [results, classes, subjects, bn]);

  // ---------- Growth Stats ----------
  const growth = useMemo(() => {
    const filteredStudents = students.filter(s => inRange(s.admission_date));
    const filteredStaff = staff.filter(s => inRange(s.joining_date));

    // Yearly admissions (last 5 years)
    const now = new Date();
    const yrs: { year: string; students: number; staff: number }[] = [];
    for (let i = 4; i >= 0; i--) {
      const y = now.getFullYear() - i;
      yrs.push({
        year: String(y),
        students: students.filter(s => s.admission_date && new Date(s.admission_date).getFullYear() === y).length,
        staff: staff.filter(s => s.joining_date && new Date(s.joining_date).getFullYear() === y).length,
      });
    }

    // Staff by category
    const catMap = new Map<string, number>();
    staff.forEach(s => {
      const k = s.staff_category || 'other';
      catMap.set(k, (catMap.get(k) || 0) + 1);
    });
    const staffByCat = Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));

    // Gender split
    const studentGender = [
      { name: bn ? 'ছাত্র' : 'Male', value: students.filter(s => s.gender === 'male').length },
      { name: bn ? 'ছাত্রী' : 'Female', value: students.filter(s => s.gender === 'female').length },
    ];

    return {
      newStudents: filteredStudents.length,
      newStaff: filteredStaff.length,
      totalStudents: students.length,
      totalStaff: staff.length,
      yrs,
      staffByCat,
      studentGender,
    };
  }, [students, staff, from, to, bn]);

  // ---------- UI ----------
  const presetOptions: { key: Preset; label: string }[] = [
    { key: 'this_month', label: bn ? 'এই মাস' : 'This Month' },
    { key: 'last_month', label: bn ? 'গত মাস' : 'Last Month' },
    { key: 'last_6_months', label: bn ? 'গত ৬ মাস' : 'Last 6 Months' },
    { key: 'this_year', label: bn ? 'এই বছর' : 'This Year' },
    { key: 'last_year', label: bn ? 'গত বছর' : 'Last Year' },
    { key: 'custom', label: bn ? 'কাস্টম' : 'Custom' },
  ];

  return (
    <div className="space-y-6 p-2 md:p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" />
            {bn ? 'অ্যানালিটিক্স ড্যাশবোর্ড' : 'Analytics Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {bn ? 'প্রতিষ্ঠানের সম্পূর্ণ পরিসংখ্যান ও বিশ্লেষণ' : 'Complete institutional statistics and insights'}
          </p>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card className="rounded-3xl border-border/50">
        <CardContent className="p-4 flex flex-wrap items-center gap-2">
          {presetOptions.map(opt => (
            <Button
              key={opt.key}
              variant={preset === opt.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreset(opt.key)}
              className="rounded-full"
            >
              {opt.label}
            </Button>
          ))}
          {preset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 ml-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('rounded-full', !customFrom && 'text-muted-foreground')}>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {customFrom ? format(customFrom, 'dd MMM yyyy') : (bn ? 'শুরু' : 'From')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('rounded-full', !customTo && 'text-muted-foreground')}>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {customTo ? format(customTo, 'dd MMM yyyy') : (bn ? 'শেষ' : 'To')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            {format(from, 'dd MMM yyyy')} — {format(to, 'dd MMM yyyy')}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto rounded-2xl p-1">
          <TabsTrigger value="financial" className="rounded-xl">{bn ? 'আর্থিক' : 'Financial'}</TabsTrigger>
          <TabsTrigger value="attendance" className="rounded-xl">{bn ? 'হাজিরা' : 'Attendance'}</TabsTrigger>
          <TabsTrigger value="academic" className="rounded-xl">{bn ? 'একাডেমিক' : 'Academic'}</TabsTrigger>
          <TabsTrigger value="growth" className="rounded-xl">{bn ? 'গ্রোথ' : 'Growth'}</TabsTrigger>
        </TabsList>

        {/* ---------- FINANCIAL TAB ---------- */}
        <TabsContent value="financial" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={TrendingUp} label={bn ? 'মোট আয়' : 'Total Income'} value={`৳${financial.totalFees.toLocaleString()}`} color="text-green-600" bg="bg-green-500/10" />
            <StatCard icon={TrendingDown} label={bn ? 'মোট ব্যয়' : 'Total Expense'} value={`৳${financial.totalExp.toLocaleString()}`} color="text-red-600" bg="bg-red-500/10" />
            <StatCard icon={Wallet} label={bn ? 'নিট ব্যালেন্স' : 'Net Balance'} value={`৳${financial.net.toLocaleString()}`} color={financial.net >= 0 ? 'text-primary' : 'text-orange-600'} bg="bg-primary/10" />
          </div>
          <Card className="rounded-3xl">
            <CardHeader><CardTitle className="text-base">{bn ? 'আয় বনাম ব্যয় (মাসিক)' : 'Income vs Expense (Monthly)'}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={financial.trend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Bar dataKey="fees" name={bn ? 'আয়' : 'Income'} fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="expenses" name={bn ? 'ব্যয়' : 'Expense'} fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- ATTENDANCE TAB ---------- */}
        <TabsContent value="attendance" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={UserCheck} label={bn ? 'উপস্থিত' : 'Present'} value={attendanceStats.present} color="text-green-600" bg="bg-green-500/10" />
            <StatCard icon={UserX} label={bn ? 'অনুপস্থিত' : 'Absent'} value={attendanceStats.absent} color="text-red-600" bg="bg-red-500/10" />
            <StatCard icon={UserCheck} label={bn ? 'দেরিতে' : 'Late'} value={attendanceStats.late} color="text-orange-600" bg="bg-orange-500/10" />
            <StatCard icon={TrendingUp} label={bn ? 'হাজিরা হার' : 'Attendance Rate'} value={`${attendanceStats.rate.toFixed(1)}%`} color="text-primary" bg="bg-primary/10" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 rounded-3xl">
              <CardHeader><CardTitle className="text-base">{bn ? 'দৈনিক হাজিরা ট্রেন্ড' : 'Daily Attendance Trend'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={attendanceStats.daily}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Area type="monotone" dataKey="present" name={bn ? 'উপস্থিত' : 'Present'} stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.3)" />
                    <Area type="monotone" dataKey="absent" name={bn ? 'অনুপস্থিত' : 'Absent'} stroke="#ef4444" fill="#ef444433" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="rounded-3xl">
              <CardHeader><CardTitle className="text-base">{bn ? 'সারাংশ' : 'Breakdown'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={attendanceStats.breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {attendanceStats.breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------- ACADEMIC TAB ---------- */}
        <TabsContent value="academic" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={BookOpen} label={bn ? 'মোট ফলাফল' : 'Total Results'} value={academic.totalResults} color="text-primary" bg="bg-primary/10" />
            <StatCard icon={UserCheck} label={bn ? 'পাশ' : 'Passed'} value={academic.passed} color="text-green-600" bg="bg-green-500/10" />
            <StatCard icon={TrendingUp} label={bn ? 'পাশের হার' : 'Pass Rate'} value={`${academic.passRate.toFixed(1)}%`} color="text-blue-600" bg="bg-blue-500/10" />
            <StatCard icon={GraduationCap} label={bn ? 'গড় GPA' : 'Avg GPA'} value={academic.avgGPA.toFixed(2)} color="text-purple-600" bg="bg-purple-500/10" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="rounded-3xl">
              <CardHeader><CardTitle className="text-base">{bn ? 'GPA বন্টন' : 'GPA Distribution'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={academic.gpaBuckets}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="range" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="rounded-3xl">
              <CardHeader><CardTitle className="text-base">{bn ? 'শ্রেণীভিত্তিক পাশের হার' : 'Class-wise Pass Rate'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={academic.classWise} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" domain={[0, 100]} fontSize={11} />
                    <YAxis type="category" dataKey="name" fontSize={11} width={80} />
                    <Tooltip contentStyle={{ borderRadius: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} formatter={(v: number) => `${v.toFixed(1)}%`} />
                    <Bar dataKey="rate" fill="hsl(var(--accent))" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------- GROWTH TAB ---------- */}
        <TabsContent value="growth" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label={bn ? 'মোট ছাত্র' : 'Total Students'} value={growth.totalStudents} color="text-primary" bg="bg-primary/10" />
            <StatCard icon={UserCog} label={bn ? 'মোট স্টাফ' : 'Total Staff'} value={growth.totalStaff} color="text-blue-600" bg="bg-blue-500/10" />
            <StatCard icon={TrendingUp} label={bn ? 'নতুন ভর্তি' : 'New Admissions'} value={growth.newStudents} color="text-green-600" bg="bg-green-500/10" />
            <StatCard icon={UserCheck} label={bn ? 'নতুন স্টাফ' : 'New Staff'} value={growth.newStaff} color="text-purple-600" bg="bg-purple-500/10" />
          </div>
          <Card className="rounded-3xl">
            <CardHeader><CardTitle className="text-base">{bn ? 'বছরভিত্তিক ভর্তি ও যোগদান' : 'Yearly Admissions & Joinings'}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={growth.yrs}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="year" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Line type="monotone" dataKey="students" name={bn ? 'ছাত্র' : 'Students'} stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="staff" name={bn ? 'স্টাফ' : 'Staff'} stroke="hsl(var(--accent))" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="rounded-3xl">
              <CardHeader><CardTitle className="text-base">{bn ? 'ছাত্র লিঙ্গ বিভাজন' : 'Student Gender Split'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={growth.studentGender} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {growth.studentGender.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="rounded-3xl">
              <CardHeader><CardTitle className="text-base">{bn ? 'স্টাফ ক্যাটেগরি' : 'Staff Categories'}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={growth.staffByCat}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: string | number; color: string; bg: string }) => (
  <Card className="rounded-3xl border-border/50 hover:shadow-lg transition-shadow">
    <CardContent className="p-4 flex items-center gap-3">
      <div className={cn('p-3 rounded-2xl', bg)}>
        <Icon className={cn('w-6 h-6', color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={cn('text-xl font-bold truncate', color)}>{value}</p>
      </div>
    </CardContent>
  </Card>
);

// Re-import UserCog (was missing in main lucide import group)
import { UserCog } from 'lucide-react';

export default AdminAnalytics;
