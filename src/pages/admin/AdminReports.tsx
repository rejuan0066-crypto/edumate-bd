import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
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
import { Button } from '@/components/ui/button';
import {
  BarChart3, PieChart as PieChartIcon, TrendingUp, Users, CreditCard,
  CalendarDays, DollarSign, UserCheck, Wallet, ArrowUpRight, ArrowDownRight,
  Printer, Download, FileText, FileSpreadsheet, GraduationCap, FileCheck2
} from 'lucide-react';
import { generateBilingualReport } from '@/lib/reportPdfGenerator';
import StudentReportSection from '@/components/admin/reports/StudentReportSection';
import AttendanceReportSection from '@/components/admin/reports/AttendanceReportSection';
import SyllabusCoverageSection from '@/components/admin/reports/SyllabusCoverageSection';
import { BookOpen } from 'lucide-react';

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
  const { settings: ws } = useWebsiteSettings();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [activeTab, setActiveTab] = useState('');

  // === Export helpers ===
  const getExportData = () => {
    if (activeTab === 'income-expense') {
      return {
        title: bn ? `আয়-ব্যয় রিপোর্ট ${selectedYear}` : `Income vs Expense Report ${selectedYear}`,
        headers: [bn ? 'মাস' : 'Month', bn ? 'আয়' : 'Income', bn ? 'ব্যয়' : 'Expense', bn ? 'ব্যালেন্স' : 'Balance'],
        rows: incomeExpenseData.map(d => [d.month, d.income, d.expense, d.profit]),
        summary: [
          [bn ? 'মোট আয়' : 'Total Income', totalIncome],
          [bn ? 'মোট ব্যয়' : 'Total Expense', totalExpense],
          [bn ? 'নেট ব্যালেন্স' : 'Net Balance', totalIncome - totalExpense],
          [bn ? 'মোট অনুদান' : 'Total Donations', totalDonation],
        ],
      };
    }
    if (activeTab === 'fee') {
      const monthlyFee = MONTHS.map((m, i) => {
        const paid = feePayments.filter(f => f.year === yearNum && f.month === m && f.status === 'paid')
          .reduce((s, f) => s + Number(f.paid_amount || 0), 0);
        return [bn ? MONTHS_BN[i] : m, paid];
      });
      return {
        title: bn ? `ফি রিপোর্ট ${selectedYear}` : `Fee Report ${selectedYear}`,
        headers: [bn ? 'মাস' : 'Month', bn ? 'আদায়কৃত' : 'Collected'],
        rows: monthlyFee,
        summary: [
          [bn ? 'মোট ফি' : 'Total Fee', feeStats.total],
          [bn ? 'আদায়কৃত' : 'Collected', feeStats.paid],
          [bn ? 'বকেয়া' : 'Unpaid', feeStats.unpaid],
          [bn ? 'মাসিক বেতন বিল' : 'Monthly Salary', totalSalary],
        ],
      };
    }
    if (activeTab === 'students') {
      return {
        title: bn ? 'ছাত্র বিশ্লেষণ রিপোর্ট' : 'Student Analysis Report',
        headers: [bn ? 'ক্যাটাগরি' : 'Category', bn ? 'সংখ্যা' : 'Count'],
        rows: studentCategoryData.map(d => [d.name, d.value]),
        summary: [
          [bn ? 'মোট ছাত্র' : 'Total', students.length],
          [bn ? 'সক্রিয়' : 'Active', activeStudents],
          ...genderData.map(g => [g.name, g.value]),
        ],
      };
    }
    // attendance
    return {
      title: bn ? 'অ্যাটেন্ডেন্স রিপোর্ট' : 'Attendance Report',
      headers: [bn ? 'স্ট্যাটাস' : 'Status', bn ? 'সংখ্যা' : 'Count'],
      rows: attendanceSummary.map(d => [d.name, d.value]),
      summary: [
        [bn ? 'মোট রেকর্ড' : 'Total Records', attendance.length],
        [bn ? 'ছাত্র রেকর্ড' : 'Student', attendance.filter(a => a.entity_type === 'student').length],
        [bn ? 'স্টাফ রেকর্ড' : 'Staff', attendance.filter(a => a.entity_type === 'staff').length],
      ],
    };
  };

  const handleDownloadCSV = () => {
    const data = getExportData();
    const instName = bn ? ws.institution_name : ws.institution_name_en;
    const lines = [
      [instName],
      [ws.address],
      [`${bn ? 'ফোন' : 'Phone'}: ${ws.phone} | ${bn ? 'ইমেইল' : 'Email'}: ${ws.email}`],
      [],
      [data.title],
      [`${bn ? 'তারিখ' : 'Date'}: ${new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-US')}`],
      [],
      data.headers,
      ...data.rows.map(r => r.map(c => typeof c === 'number' ? c : `"${c}"`)),
      [], [bn ? '--- সারসংক্ষেপ ---' : '--- Summary ---'],
      ...data.summary.map(r => r.map(c => typeof c === 'number' ? c : `"${c}"`)),
    ];
    const csv = '\uFEFF' + lines.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${activeTab}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const data = getExportData();
    const w = window.open('', '_blank');
    if (!w) return;
    const logoHtml = ws.logo_url ? `<img src="${ws.logo_url}" style="height:60px;width:60px;object-fit:contain;border-radius:8px" />` : '';
    const instName = bn ? ws.institution_name : ws.institution_name_en;
    w.document.write(`<html><head><title>${data.title}</title><style>
      body{font-family:Arial,sans-serif;padding:30px;color:#222}
      table{width:100%;border-collapse:collapse;margin-top:15px}
      th,td{border:1px solid #ddd;padding:10px;text-align:left;font-size:13px}
      th{background:#f5f5f5;font-weight:bold}
      .header{text-align:center;margin-bottom:20px;border-bottom:2px solid #333;padding-bottom:15px}
      .header h1{margin:5px 0;font-size:22px}
      .header p{margin:2px 0;font-size:12px;color:#555}
      .header img{margin-bottom:5px}
      .report-title{font-size:16px;font-weight:bold;margin-top:15px;text-align:center;color:#333}
      .summary{margin-top:20px;background:#f9f9f9;padding:15px;border-radius:8px}
      .summary td{border:none;padding:5px 10px}
      .summary td:last-child{font-weight:bold;text-align:right}
      .footer{margin-top:40px;display:flex;justify-content:space-between;padding:0 30px}
      .sig{text-align:center;min-width:150px}
      .sig .line{border-top:1px solid #333;margin-top:40px;padding-top:5px;font-size:12px}
      .date-line{text-align:right;font-size:11px;color:#777;margin-top:10px}
      @media print{body{padding:10px}}
    </style></head><body>
    <div class="header">
      ${logoHtml}
      <h1>${instName}</h1>
      <p>${ws.address}</p>
      <p>${bn ? 'ফোন' : 'Phone'}: ${ws.phone} | ${bn ? 'ইমেইল' : 'Email'}: ${ws.email}</p>
    </div>
    <div class="report-title">${data.title}</div>
    <table><thead><tr>${data.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${data.rows.map(r => `<tr>${r.map(c => `<td>${typeof c === 'number' ? '৳' + c.toLocaleString() : c}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <div class="summary"><table>${data.summary.map(r => `<tr><td>${r[0]}</td><td>৳${Number(r[1]).toLocaleString()}</td></tr>`).join('')}</table></div>
    <div class="date-line">${bn ? 'তারিখ' : 'Date'}: ${new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-US')}</div>
    <div class="footer">
      <div class="sig"><div class="line">${bn ? 'ক্যাশিয়ার' : 'Cashier'}</div></div>
      <div class="sig"><div class="line">${bn ? 'অধ্যক্ষ' : 'Principal'}</div></div>
    </div>
    </body></html>`);
    w.document.close();
    w.print();
  };

  // Fetch all data in parallel
  const { data: students = [] } = useQuery({
    queryKey: ['report-students'],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('id, status, student_category, residence_type, admission_date, gender, division_id, class_id').is('deleted_at', null);
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

  const { data: results = [] } = useQuery({
    queryKey: ['report-results'],
    queryFn: async () => {
      const { data } = await supabase.from('results').select('marks, gpa, grade, student_id, subject_id, division_id');
      return data || [];
    },
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ['report-divisions'],
    queryFn: async () => {
      const { data } = await supabase.from('divisions').select('id, name, name_bn');
      return data || [];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['report-classes'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('id, name, name_bn, division_id');
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

  // ===== Bilingual PDF Generators =====
  const reportMeta = {
    institution_name: ws.institution_name || 'প্রতিষ্ঠানের নাম',
    institution_name_en: ws.institution_name_en || 'Institution Name',
    address: ws.address || '',
    phone: ws.phone || '',
    email: ws.email || '',
    logo_url: ws.logo_url,
  };

  const handleAttendancePDF = () => {
    // Group attendance by month for the selected year
    const monthlyAttendance = MONTHS.map((m, i) => {
      const monthRecords = attendance.filter(a => {
        if (!a.attendance_date) return false;
        const d = new Date(a.attendance_date);
        return d.getFullYear() === yearNum && d.getMonth() === i;
      });
      const present = monthRecords.filter(a => a.status === 'present').length;
      const absent = monthRecords.filter(a => a.status === 'absent').length;
      const late = monthRecords.filter(a => a.status === 'late').length;
      const total = monthRecords.length;
      const rate = total > 0 ? ((present / total) * 100).toFixed(1) + '%' : '-';
      return [m, present, absent, late, total, rate];
    });

    const totalP = attendance.filter(a => {
      const d = a.attendance_date ? new Date(a.attendance_date).getFullYear() : 0;
      return d === yearNum && a.status === 'present';
    }).length;
    const totalA = attendance.filter(a => {
      const d = a.attendance_date ? new Date(a.attendance_date).getFullYear() : 0;
      return d === yearNum && a.status === 'absent';
    }).length;
    const totalL = attendance.filter(a => {
      const d = a.attendance_date ? new Date(a.attendance_date).getFullYear() : 0;
      return d === yearNum && a.status === 'late';
    }).length;
    const grand = totalP + totalA + totalL;

    generateBilingualReport(
      {
        ...reportMeta,
        report_title_bn: 'মাসিক হাজিরা রিপোর্ট',
        report_title_en: 'Monthly Attendance Report',
        period_label_bn: `সাল: ${selectedYear}`,
        period_label_en: `Year: ${selectedYear}`,
      },
      [{
        title_bn: 'মাসভিত্তিক বিবরণ',
        title_en: 'Monthly Breakdown',
        headers: [
          { bn: 'মাস', en: 'Month' },
          { bn: 'উপস্থিত', en: 'Present' },
          { bn: 'অনুপস্থিত', en: 'Absent' },
          { bn: 'বিলম্ব', en: 'Late' },
          { bn: 'মোট', en: 'Total' },
          { bn: 'উপস্থিতি হার', en: 'Rate' },
        ],
        rows: monthlyAttendance,
        totals: [
          { bn: 'মোট উপস্থিতি হার', en: 'Overall Rate', value: grand > 0 ? ((totalP / grand) * 100).toFixed(1) + '%' : '-' },
        ],
      }],
      [
        { label_bn: 'মোট উপস্থিত', label_en: 'Total Present', value: totalP, tone: 'positive' },
        { label_bn: 'মোট অনুপস্থিত', label_en: 'Total Absent', value: totalA, tone: 'negative' },
        { label_bn: 'মোট বিলম্ব', label_en: 'Total Late', value: totalL, tone: 'accent' },
        { label_bn: 'মোট রেকর্ড', label_en: 'Total Records', value: grand, tone: 'neutral' },
      ],
    );
  };

  // Note: Monthly Financial Summary moved to /admin/expenses → Summary tab

  const handleAcademicPDF = () => {
    // GPA distribution
    const gpaRanges = [
      { min: 5, max: 5, label_bn: 'A+ (GPA 5.00)', label_en: 'A+ (GPA 5.00)' },
      { min: 4, max: 4.99, label_bn: 'A (GPA 4.00-4.99)', label_en: 'A (GPA 4.00-4.99)' },
      { min: 3.5, max: 3.99, label_bn: 'A- (GPA 3.50-3.99)', label_en: 'A- (GPA 3.50-3.99)' },
      { min: 3, max: 3.49, label_bn: 'B (GPA 3.00-3.49)', label_en: 'B (GPA 3.00-3.49)' },
      { min: 2, max: 2.99, label_bn: 'C (GPA 2.00-2.99)', label_en: 'C (GPA 2.00-2.99)' },
      { min: 0, max: 1.99, label_bn: 'ফেল (GPA <2.00)', label_en: 'Fail (GPA <2.00)' },
    ];

    const studentGPAs = new Map<string, number[]>();
    results.forEach(r => {
      if (r.gpa != null && r.student_id) {
        if (!studentGPAs.has(r.student_id)) studentGPAs.set(r.student_id, []);
        studentGPAs.get(r.student_id)!.push(Number(r.gpa));
      }
    });
    const avgGPAs = Array.from(studentGPAs.values()).map(arr => arr.reduce((s, v) => s + v, 0) / arr.length);

    const gpaRows = gpaRanges.map(range => {
      const count = avgGPAs.filter(g => g >= range.min && g <= range.max).length;
      const pct = avgGPAs.length > 0 ? ((count / avgGPAs.length) * 100).toFixed(1) + '%' : '-';
      return [range.label_bn, count, pct];
    });

    const passed = avgGPAs.filter(g => g >= 2).length;
    const failed = avgGPAs.filter(g => g < 2).length;
    const passRate = avgGPAs.length > 0 ? ((passed / avgGPAs.length) * 100).toFixed(1) + '%' : '-';

    // Class-wise pass rate
    const classRows: (string | number)[][] = [];
    classes.forEach(cls => {
      const div = divisions.find(d => d.id === cls.division_id);
      const classStudents = students.filter(s => s.class_id === cls.id || s.division_id === cls.division_id);
      const classGPAs: number[] = [];
      classStudents.forEach(s => {
        const gpas = studentGPAs.get(s.id) || [];
        if (gpas.length > 0) classGPAs.push(gpas.reduce((a, b) => a + b, 0) / gpas.length);
      });
      if (classGPAs.length > 0) {
        const avg = (classGPAs.reduce((a, b) => a + b, 0) / classGPAs.length).toFixed(2);
        const p = classGPAs.filter(g => g >= 2).length;
        const rate = ((p / classGPAs.length) * 100).toFixed(1) + '%';
        classRows.push([
          (div?.name_bn || div?.name || '') + ' - ' + (cls.name_bn || cls.name),
          classGPAs.length,
          avg,
          rate,
        ]);
      }
    });

    generateBilingualReport(
      {
        ...reportMeta,
        report_title_bn: 'একাডেমিক পারফরম্যান্স রিপোর্ট',
        report_title_en: 'Academic Performance Report',
      },
      [
        {
          title_bn: 'GPA বণ্টন',
          title_en: 'GPA Distribution',
          headers: [
            { bn: 'গ্রেড', en: 'Grade' },
            { bn: 'সংখ্যা', en: 'Count' },
            { bn: 'শতকরা', en: 'Percentage' },
          ],
          rows: gpaRows,
          totals: [{ bn: 'মোট মূল্যায়িত', en: 'Total Evaluated', value: avgGPAs.length }],
        },
        {
          title_bn: 'শ্রেণীভিত্তিক পারফরম্যান্স',
          title_en: 'Class-wise Performance',
          headers: [
            { bn: 'শ্রেণী', en: 'Class' },
            { bn: 'ছাত্র', en: 'Students' },
            { bn: 'গড় GPA', en: 'Avg GPA' },
            { bn: 'পাস হার', en: 'Pass Rate' },
          ],
          rows: classRows,
        },
      ],
      [
        { label_bn: 'মোট মূল্যায়ন', label_en: 'Total Evaluated', value: avgGPAs.length, tone: 'neutral' },
        { label_bn: 'উত্তীর্ণ', label_en: 'Passed', value: passed, tone: 'positive' },
        { label_bn: 'অকৃতকার্য', label_en: 'Failed', value: failed, tone: 'negative' },
        { label_bn: 'পাস হার', label_en: 'Pass Rate', value: passRate, tone: 'accent' },
      ],
    );
  };

  const handleComprehensivePDF = () => {
    generateBilingualReport(
      {
        ...reportMeta,
        report_title_bn: 'কম্প্রিহেনসিভ ইনস্টিটিউশন রিপোর্ট',
        report_title_en: 'Comprehensive Institution Report',
        period_label_bn: `সাল: ${selectedYear}`,
        period_label_en: `Year: ${selectedYear}`,
      },
      [
        {
          title_bn: 'প্রতিষ্ঠানের সামগ্রিক চিত্র',
          title_en: 'Institution Overview',
          headers: [
            { bn: 'বিষয়', en: 'Metric' },
            { bn: 'মান', en: 'Value' },
          ],
          rows: [
            ['মোট ছাত্র / Total Students', students.length],
            ['সক্রিয় ছাত্র / Active Students', activeStudents],
            ['মোট স্টাফ / Total Staff', staff.length],
            ['সক্রিয় স্টাফ / Active Staff', activeStaff],
            ['মোট দাতা / Total Donors', donors.length],
            ['হাজিরা রেকর্ড / Attendance Records', attendance.length],
          ],
        },
        {
          title_bn: 'আর্থিক সারসংক্ষেপ',
          title_en: 'Financial Summary',
          headers: [
            { bn: 'বিবরণ', en: 'Description' },
            { bn: 'পরিমাণ (৳)', en: 'Amount (৳)' },
          ],
          rows: [
            ['মোট আয় / Total Income', totalIncome],
            ['মোট ব্যয় / Total Expense', totalExpense],
            ['ফি আদায় / Fee Collected', feeStats.paid],
            ['বকেয়া ফি / Outstanding Fee', feeStats.unpaid],
            ['মাসিক বেতন বিল / Monthly Salary', totalSalary],
            ['অনুদান / Donations', totalDonation],
          ],
          totals: [
            { bn: 'নেট ব্যালেন্স', en: 'Net Balance', value: totalIncome - totalExpense },
          ],
        },
        {
          title_bn: 'ছাত্র বিভাজন',
          title_en: 'Student Distribution',
          headers: [
            { bn: 'ক্যাটাগরি', en: 'Category' },
            { bn: 'সংখ্যা', en: 'Count' },
          ],
          rows: [
            ...studentCategoryData.map(s => [s.name, s.value]),
            ...genderData.map(g => [g.name, g.value]),
          ],
        },
      ],
      [
        { label_bn: 'মোট ছাত্র', label_en: 'Students', value: activeStudents, tone: 'accent' },
        { label_bn: 'মোট স্টাফ', label_en: 'Staff', value: activeStaff, tone: 'accent' },
        { label_bn: 'নেট ব্যালেন্স', label_en: 'Net Balance', value: '৳' + (totalIncome - totalExpense).toLocaleString(), tone: totalIncome >= totalExpense ? 'positive' : 'negative' },
        { label_bn: 'ফি আদায়', label_en: 'Fee Collected', value: '৳' + feeStats.paid.toLocaleString(), tone: 'positive' },
      ],
    );
  };


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
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />{bn ? 'প্রিন্ট/PDF' : 'Print/PDF'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownloadCSV}>
            <Download className="h-4 w-4 mr-1" />{bn ? 'এক্সেল' : 'Excel'}
          </Button>
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

        {/* === Bilingual PDF Report Generator === */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-primary" />
              {bn ? 'অটোমেটেড PDF রিপোর্ট জেনারেটর (দ্বিভাষিক)' : 'Automated PDF Report Generator (Bilingual)'}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {bn ? 'বাংলা ও ইংরেজিতে পেশাদার রিপোর্ট তৈরি করুন — ক্লিক করলে নতুন উইন্ডোতে রিপোর্ট খুলবে এবং সরাসরি PDF সংরক্ষণ করা যাবে।' : 'Generate professional bilingual reports. Click any report to open it in a new window and save as PDF directly.'}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={handleAttendancePDF}
                className="group flex flex-col items-start gap-2 p-4 rounded-2xl border-2 border-border bg-card hover:border-primary hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left"
              >
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{bn ? 'মাসিক হাজিরা রিপোর্ট' : 'Monthly Attendance'}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{bn ? 'উপস্থিত/অনুপস্থিত/বিলম্ব মাসিক বিশ্লেষণ' : 'Present/Absent/Late monthly breakdown'}</p>
                </div>
              </button>

              {/* মাসিক আর্থিক সারসংক্ষেপ → /admin/expenses (Summary tab) তে স্থানান্তরিত */}

              <button
                onClick={handleAcademicPDF}
                className="group flex flex-col items-start gap-2 p-4 rounded-2xl border-2 border-border bg-card hover:border-primary hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left"
              >
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{bn ? 'একাডেমিক পারফরম্যান্স' : 'Academic Performance'}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{bn ? 'GPA বণ্টন, পাস হার, শ্রেণীভিত্তিক' : 'GPA distribution, pass rate, class-wise'}</p>
                </div>
              </button>

              <button
                onClick={handleComprehensivePDF}
                className="group flex flex-col items-start gap-2 p-4 rounded-2xl border-2 border-border bg-card hover:border-primary hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left"
              >
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{bn ? 'কম্প্রিহেনসিভ রিপোর্ট' : 'Comprehensive Report'}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{bn ? 'সকল মডিউলের সমন্বিত সারসংক্ষেপ' : 'All modules combined overview'}</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Charts Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: 'income-expense', icon: BarChart3, bn: 'আয় vs ব্যয়', en: 'Income vs Expense' },
              { key: 'fee', icon: CreditCard, bn: 'ফি রিপোর্ট', en: 'Fee Report' },
              { key: 'students', icon: Users, bn: 'ছাত্র বিশ্লেষণ', en: 'Student Analysis' },
              { key: 'student-list', icon: GraduationCap, bn: 'ছাত্র তালিকা', en: 'Student List' },
              { key: 'attendance', icon: CalendarDays, bn: 'অ্যাটেন্ডেন্স', en: 'Attendance' },
              { key: 'syllabus', icon: BookOpen, bn: 'সিলেবাস কভারেজ', en: 'Syllabus Coverage' },
            ].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 whitespace-nowrap ${activeTab === t.key ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
                <t.icon className="w-4 h-4" />{bn ? t.bn : t.en}
              </button>
            ))}
          </div>

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

          {/* Student List (session + class + search) */}
          <TabsContent value="student-list" className="space-y-4">
            <StudentReportSection />
          </TabsContent>

          {/* Attendance — session + class + date range */}
          <TabsContent value="attendance" className="space-y-4">
            <AttendanceReportSection />
          </TabsContent>

          {/* Syllabus Coverage — session + class + subject + teacher + date range */}
          <TabsContent value="syllabus" className="space-y-4">
            <SyllabusCoverageSection />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
