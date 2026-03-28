import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  BarChart3, PieChart as PieChartIcon, TrendingUp, Users, CreditCard,
  CalendarDays, DollarSign, UserCheck, Wallet, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#6366f1', '#ec4899', '#14b8a6'
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const AdminReports = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  // Fetch all data in parallel
  const { data: students = [] } = useQuery({
    queryKey: ['report-students'],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('id, status, student_category, residence_type, admission_date, gender, division_id');
      return data || [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['report-staff'],
    queryFn: async () => {
      const { data } = await supabase.from('staff').select('id, status, salary, department, designation');
      return data || [];
    },
  });

  const { data: feePayments = [] } = useQuery({
    queryKey: ['report-fee-payments'],
    queryFn: async () => {
      const { data } = await supabase.from('fee_payments').select('id, amount, paid_amount, status, month, year, paid_at');
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['report-expenses'],
    queryFn: async () => {
      const { data } = await supabase.from('expenses').select('id, amount, month_year, expense_date');
      return data || [];
    },
  });

  const { data: deposits = [] } = useQuery({
    queryKey: ['report-deposits'],
    queryFn: async () => {
      const { data } = await supabase.from('deposits').select('id, amount, month_year, deposit_date');
      return data || [];
    },
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['report-attendance'],
    queryFn: async () => {
      const { data } = await supabase.from('attendance_records').select('id, status, entity_type, attendance_date');
      return data || [];
    },
  });

  const { data: donors = [] } = useQuery({
    queryKey: ['report-donors'],
    queryFn: async () => {
      const { data } = await supabase.from('donors').select('id, donation_amount, donation_date, status');
      return data || [];
    },
  });

  // === Computed Data ===
  const yearNum = parseInt(selectedYear);

  // Income vs Expense monthly chart
  const incomeExpenseData = useMemo(() => {
    return MONTHS.map((m, i) => {
      const monthKey = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
      const monthIncome = deposits.filter(d => d.month_year === monthKey).reduce((s, d) => s + Number(d.amount || 0), 0)
        + feePayments.filter(f => f.year === yearNum && f.month === m && f.status === 'paid').reduce((s, f) => s + Number(f.paid_amount || 0), 0);
      const monthExpense = expenses.filter(e => e.month_year === monthKey).reduce((s, e) => s + Number(e.amount || 0), 0);
      return {
        month: bn ? MONTHS_BN[i] : m.slice(0, 3),
        income: monthIncome,
        expense: monthExpense,
        profit: monthIncome - monthExpense,
      };
    });
  }, [deposits, feePayments, expenses, selectedYear, yearNum, bn]);

  // Fee collection summary
  const feeStats = useMemo(() => {
    const yearFees = feePayments.filter(f => f.year === yearNum);
    const totalAmount = yearFees.reduce((s, f) => s + Number(f.amount || 0), 0);
    const paidAmount = yearFees.filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.paid_amount || 0), 0);
    return { total: totalAmount, paid: paidAmount, unpaid: totalAmount - paidAmount, count: yearFees.length };
  }, [feePayments, yearNum]);

  // Student category pie
  const studentCategoryData = useMemo(() => {
    const active = students.filter(s => s.status === 'active');
    const categories: Record<string, number> = {};
    active.forEach(s => {
      const cat = s.student_category || 'general';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return Object.entries(categories).map(([name, value]) => ({ name: bn ? (name === 'general' ? 'সাধারণ' : name === 'orphan' ? 'এতিম' : name === 'poor' ? 'গরিব' : name) : name, value }));
  }, [students, bn]);

  // Attendance summary pie
  const attendanceSummary = useMemo(() => {
    const stats: Record<string, number> = {};
    attendance.forEach(a => {
      stats[a.status] = (stats[a.status] || 0) + 1;
    });
    return Object.entries(stats).map(([name, value]) => ({
      name: name === 'present' ? (bn ? 'উপস্থিত' : 'Present') : name === 'absent' ? (bn ? 'অনুপস্থিত' : 'Absent') : name === 'late' ? (bn ? 'দেরি' : 'Late') : name,
      value
    }));
  }, [attendance, bn]);

  // Gender distribution
  const genderData = useMemo(() => {
    const active = students.filter(s => s.status === 'active');
    const male = active.filter(s => s.gender === 'male').length;
    const female = active.filter(s => s.gender === 'female').length;
    return [
      { name: bn ? 'ছাত্র' : 'Male', value: male },
      { name: bn ? 'ছাত্রী' : 'Female', value: female },
    ];
  }, [students, bn]);

  // Summary stats
  const totalIncome = incomeExpenseData.reduce((s, d) => s + d.income, 0);
  const totalExpense = incomeExpenseData.reduce((s, d) => s + d.expense, 0);
  const activeStudents = students.filter(s => s.status === 'active').length;
  const activeStaff = staff.filter(s => s.status === 'active').length;
  const totalDonation = donors.reduce((s, d) => s + Number(d.donation_amount || 0), 0);
  const totalSalary = staff.filter(s => s.status === 'active').reduce((s, st) => s + Number(st.salary || 0), 0);

  const summaryCards = [
    { label: bn ? 'মোট আয়' : 'Total Income', value: `৳${totalIncome.toLocaleString()}`, icon: TrendingUp, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', change: totalIncome > totalExpense },
    { label: bn ? 'মোট ব্যয়' : 'Total Expense', value: `৳${totalExpense.toLocaleString()}`, icon: DollarSign, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', change: false },
    { label: bn ? 'সক্রিয় ছাত্র' : 'Active Students', value: activeStudents, icon: Users, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', change: true },
    { label: bn ? 'সক্রিয় স্টাফ' : 'Active Staff', value: activeStaff, icon: UserCheck, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', change: true },
    { label: bn ? 'ফি আদায়' : 'Fee Collected', value: `৳${feeStats.paid.toLocaleString()}`, icon: CreditCard, color: 'bg-primary/10 text-primary', change: true },
    { label: bn ? 'বকেয়া ফি' : 'Unpaid Fee', value: `৳${feeStats.unpaid.toLocaleString()}`, icon: Wallet, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', change: false },
  ];

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {bn ? 'রিপোর্ট ও অ্যানালিটিক্স' : 'Reports & Analytics'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn ? 'আয়-ব্যয়, ছাত্র, স্টাফ ও অ্যাটেন্ডেন্সের সামগ্রিক রিপোর্ট' : 'Overview of income, expense, students, staff & attendance'}
            </p>
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <CalendarDays className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {summaryCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`h-8 w-8 rounded-lg ${s.color} flex items-center justify-center`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {s.change ? <ArrowUpRight className="h-3 w-3 text-emerald-500 ml-auto" /> : <ArrowDownRight className="h-3 w-3 text-red-500 ml-auto" />}
                  </div>
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Tabs */}
        <Tabs defaultValue="income-expense">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="income-expense">
              <BarChart3 className="h-3.5 w-3.5 mr-1" />
              {bn ? 'আয় vs ব্যয়' : 'Income vs Expense'}
            </TabsTrigger>
            <TabsTrigger value="fee">
              <CreditCard className="h-3.5 w-3.5 mr-1" />
              {bn ? 'ফি রিপোর্ট' : 'Fee Report'}
            </TabsTrigger>
            <TabsTrigger value="students">
              <Users className="h-3.5 w-3.5 mr-1" />
              {bn ? 'ছাত্র বিশ্লেষণ' : 'Student Analysis'}
            </TabsTrigger>
            <TabsTrigger value="attendance">
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              {bn ? 'অ্যাটেন্ডেন্স' : 'Attendance'}
            </TabsTrigger>
          </TabsList>

          {/* Income vs Expense */}
          <TabsContent value="income-expense" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{bn ? 'মাসিক আয় vs ব্যয়' : 'Monthly Income vs Expense'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incomeExpenseData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 10 }} />
                      <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="income" name={bn ? 'আয়' : 'Income'} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name={bn ? 'ব্যয়' : 'Expense'} fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{bn ? 'লাভ/ক্ষতি ট্রেন্ড' : 'Profit/Loss Trend'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={incomeExpenseData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="profit" name={bn ? 'ব্যালেন্স' : 'Balance'} fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Yearly totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: bn ? 'মোট আয়' : 'Total Income', value: totalIncome, color: 'text-emerald-600' },
                { label: bn ? 'মোট ব্যয়' : 'Total Expense', value: totalExpense, color: 'text-red-600' },
                { label: bn ? 'নেট ব্যালেন্স' : 'Net Balance', value: totalIncome - totalExpense, color: totalIncome >= totalExpense ? 'text-emerald-600' : 'text-red-600' },
                { label: bn ? 'মোট অনুদান' : 'Total Donations', value: totalDonation, color: 'text-blue-600' },
              ].map((item, i) => (
                <Card key={i}>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`text-xl font-bold ${item.color}`}>৳{item.value.toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Fee Report */}
          <TabsContent value="fee" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{bn ? 'ফি আদায় সারসংক্ষেপ' : 'Fee Collection Summary'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={[
                        { name: bn ? 'আদায়কৃত' : 'Collected', value: feeStats.paid },
                        { name: bn ? 'বকেয়া' : 'Unpaid', value: feeStats.unpaid },
                      ]} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--destructive))" />
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">{bn ? 'মোট' : 'Total'}</p>
                      <p className="font-bold text-sm">৳{feeStats.total.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{bn ? 'আদায়' : 'Paid'}</p>
                      <p className="font-bold text-sm text-emerald-600">৳{feeStats.paid.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{bn ? 'বকেয়া' : 'Due'}</p>
                      <p className="font-bold text-sm text-red-600">৳{feeStats.unpaid.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{bn ? 'মাসিক ফি আদায়' : 'Monthly Fee Collection'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={MONTHS.map((m, i) => {
                      const paid = feePayments.filter(f => f.year === yearNum && f.month === m && f.status === 'paid')
                        .reduce((s, f) => s + Number(f.paid_amount || 0), 0);
                      return { month: bn ? MONTHS_BN[i].slice(0, 3) : m.slice(0, 3), paid };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="paid" name={bn ? 'আদায়' : 'Collected'} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Salary info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sm font-semibold">{bn ? 'মাসিক বেতন বিল' : 'Monthly Salary Bill'}</p>
                    <p className="text-2xl font-bold text-primary">৳{totalSalary.toLocaleString()}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activeStaff} {bn ? 'জন সক্রিয় স্টাফ' : 'active staff'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Student Analysis */}
          <TabsContent value="students" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{bn ? 'ছাত্র ক্যাটাগরি' : 'Student Category'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={studentCategoryData} cx="50%" cy="50%" outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {studentCategoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{bn ? 'লিঙ্গ বিভাজন' : 'Gender Distribution'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={genderData} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={5} dataKey="value">
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--chart-2))" />
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-2">
                    {genderData.map((g, i) => (
                      <div key={i} className="text-center">
                        <p className="text-xl font-bold">{g.value}</p>
                        <p className="text-[10px] text-muted-foreground">{g.name}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: bn ? 'মোট ছাত্র' : 'Total', value: students.length },
                { label: bn ? 'সক্রিয়' : 'Active', value: activeStudents },
                { label: bn ? 'আবাসিক' : 'Resident', value: students.filter(s => s.residence_type === 'resident' && s.status === 'active').length },
                { label: bn ? 'অনাবাসিক' : 'Non-Resident', value: students.filter(s => s.residence_type === 'non-resident' && s.status === 'active').length },
              ].map((item, i) => (
                <Card key={i}>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold">{item.value}</p>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Attendance */}
          <TabsContent value="attendance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{bn ? 'সামগ্রিক অ্যাটেন্ডেন্স' : 'Overall Attendance'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {attendanceSummary.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={attendanceSummary} cx="50%" cy="50%" outerRadius={100} paddingAngle={3} dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {attendanceSummary.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                      {bn ? 'কোনো অ্যাটেন্ডেন্স ডেটা নেই' : 'No attendance data'}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{bn ? 'অ্যাটেন্ডেন্স পরিসংখ্যান' : 'Attendance Stats'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: bn ? 'মোট রেকর্ড' : 'Total Records', value: attendance.length },
                      { label: bn ? 'ছাত্র রেকর্ড' : 'Student Records', value: attendance.filter(a => a.entity_type === 'student').length },
                      { label: bn ? 'স্টাফ রেকর্ড' : 'Staff Records', value: attendance.filter(a => a.entity_type === 'staff').length },
                      { label: bn ? 'আজকের রেকর্ড' : "Today's Records", value: attendance.filter(a => a.attendance_date === new Date().toISOString().split('T')[0]).length },
                    ].map((item, i) => (
                      <Card key={i}>
                        <CardContent className="p-3 text-center">
                          <p className="text-xl font-bold">{item.value}</p>
                          <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
