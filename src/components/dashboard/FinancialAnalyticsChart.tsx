import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_BN = ['জানু','ফেব্রু','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টে','অক্টো','নভে','ডিসে'];

const FinancialAnalyticsChart = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const { data: feePayments = [] } = useQuery({
    queryKey: ['fin-analytics-fees'],
    queryFn: async () => {
      const { data } = await supabase.from('fee_payments').select('paid_amount, amount, status, paid_at').eq('status', 'paid');
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['fin-analytics-expenses'],
    queryFn: async () => {
      const { data } = await supabase.from('expenses').select('amount, month_year');
      return data || [];
    },
  });

  const chartData = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; fees: number; expenses: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const monthYear = `${MONTHS_EN[m]}-${y}`;

      const feesTotal = feePayments
        .filter(fp => {
          if (!fp.paid_at) return false;
          const pd = new Date(fp.paid_at);
          return pd.getFullYear() === y && pd.getMonth() === m;
        })
        .reduce((s, fp) => s + Number(fp.paid_amount || fp.amount || 0), 0);

      const expTotal = expenses
        .filter(e => e.month_year === monthYear)
        .reduce((s, e) => s + Number(e.amount || 0), 0);

      months.push({
        key: monthYear,
        label: bn ? MONTHS_BN[m] : MONTHS_EN[m].slice(0, 3),
        fees: feesTotal,
        expenses: expTotal,
      });
    }
    return months;
  }, [feePayments, expenses, bn]);

  const totalFees = chartData.reduce((s, d) => s + d.fees, 0);
  const totalExp = chartData.reduce((s, d) => s + d.expenses, 0);
  const netBalance = totalFees - totalExp;

  const fmt = (n: number) => `৳${Math.abs(n).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-emerald-200/30 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{bn ? 'মোট ফি আদায়' : 'Total Fees Collected'}</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{fmt(totalFees)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200/30 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{bn ? 'মোট হিসাব' : 'Total Expenses'}</p>
              <p className="text-lg font-bold text-red-700 dark:text-red-400">{fmt(totalExp)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-${netBalance >= 0 ? 'blue' : 'orange'}-200/30 bg-${netBalance >= 0 ? 'blue' : 'orange'}-50/50 dark:bg-${netBalance >= 0 ? 'blue' : 'orange'}-950/20`}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${netBalance >= 0 ? 'blue' : 'orange'}-500/10 flex items-center justify-center`}>
              <Wallet className={`w-5 h-5 text-${netBalance >= 0 ? 'blue' : 'orange'}-600`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{bn ? 'নিট ব্যালেন্স' : 'Net Balance'}</p>
              <p className={`text-lg font-bold ${netBalance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>
                {netBalance < 0 ? '-' : ''}{fmt(netBalance)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-emerald-200/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{bn ? 'ফি আদায় বনাম হিসাব (গত ৬ মাস)' : 'Fees vs Expenses (Last 6 Months)'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `৳${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
                  formatter={(value: number, name: string) => [fmt(value), name === 'fees' ? (bn ? 'ফি আদায়' : 'Fees') : (bn ? 'হিসাব' : 'Expenses')]}
                />
                <Legend formatter={v => v === 'fees' ? (bn ? 'ফি আদায়' : 'Fees Collected') : (bn ? 'হিসাব' : 'Expenses')} />
                <Bar dataKey="fees" fill="hsl(152, 69%, 40%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(0, 72%, 51%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialAnalyticsChart;
