import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Package } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_BN = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];

const InventoryConsumptionReport = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const now = new Date();
  const currentMonthKey = `${MONTHS[now.getMonth()]}-${now.getFullYear()}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inv-report-items'],
    queryFn: async () => {
      const { data } = await supabase.from('inventory_items').select('*').eq('is_active', true).order('name_bn');
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['inv-report-expenses', selectedMonth],
    queryFn: async () => {
      const { data } = await supabase.from('expenses')
        .select('id, amount, quantity, description, expense_date, category_id, expense_categories(name, name_bn)')
        .eq('month_year', selectedMonth);
      return data || [];
    },
  });

  const { data: inventoryLogs = [] } = useQuery({
    queryKey: ['inv-report-logs', selectedMonth],
    queryFn: async () => {
      const { data } = await supabase.from('inventory_logs')
        .select('item_id, change_amount, type, reason, expense_id, created_at')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Build consumption data per item for selected month
  const consumptionData = useMemo(() => {
    // Get expense IDs for selected month
    const monthExpenseIds = new Set(expenses.map(e => e.id));

    // Find logs linked to this month's expenses
    const monthLogs = inventoryLogs.filter(log => log.expense_id && monthExpenseIds.has(log.expense_id));

    // Aggregate by item
    const itemMap: Record<string, { name_bn: string; name_en: string; unit: string; qty: number; cost: number }> = {};

    monthLogs.forEach(log => {
      const item = inventoryItems.find(i => i.id === log.item_id);
      if (!item) return;
      if (!itemMap[log.item_id]) {
        itemMap[log.item_id] = { name_bn: item.name_bn, name_en: item.name_en || item.name_bn, unit: item.unit, qty: 0, cost: 0 };
      }
      itemMap[log.item_id].qty += Number(log.change_amount || 0);
    });

    // Match cost from expenses
    monthLogs.forEach(log => {
      if (!log.expense_id || !itemMap[log.item_id]) return;
      const exp = expenses.find(e => e.id === log.expense_id);
      if (exp) itemMap[log.item_id].cost += Number(exp.amount || 0);
    });

    return Object.entries(itemMap).map(([id, data]) => ({ id, ...data }));
  }, [expenses, inventoryLogs, inventoryItems]);

  const totalCost = consumptionData.reduce((s, d) => s + d.cost, 0);

  const chartData = consumptionData.map(d => ({
    name: bn ? d.name_bn : d.name_en,
    cost: d.cost,
    qty: d.qty,
  }));

  const monthOptions = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
    monthOptions.push({ key, label: bn ? `${MONTHS_BN[d.getMonth()]} ${d.getFullYear()}` : `${MONTHS[d.getMonth()]} ${d.getFullYear()}` });
  }

  const handleExportCSV = () => {
    const rows = [
      [bn ? 'আইটেম' : 'Item', bn ? 'পরিমাণ' : 'Quantity', bn ? 'একক' : 'Unit', bn ? 'হিসাব' : 'Cost'],
      ...consumptionData.map(d => [bn ? d.name_bn : d.name_en, String(d.qty), d.unit, `৳${d.cost}`]),
      ['', '', bn ? 'মোট' : 'Total', `৳${totalCost}`]
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_consumption_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(bn ? 'ডাউনলোড হয়েছে' : 'Downloaded');
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-bold">{bn ? 'মাসিক ব্যবহার রিপোর্ট' : 'Monthly Consumption Report'}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="w-4 h-4" />{bn ? 'এক্সপোর্ট' : 'Export'}
          </Button>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="border-emerald-200/20">
          <CardContent className="pt-4">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `৳${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
                    formatter={(value: number) => [`৳${value.toLocaleString('en-IN')}`, bn ? 'হিসাব' : 'Cost']}
                  />
                  <Bar dataKey="cost" fill="hsl(152, 69%, 40%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{bn ? 'আইটেম' : 'Item'}</TableHead>
                <TableHead className="text-center">{bn ? 'ক্রয় পরিমাণ' : 'Purchased Qty'}</TableHead>
                <TableHead className="text-center">{bn ? 'একক' : 'Unit'}</TableHead>
                <TableHead className="text-right">{bn ? 'মোট হিসাব' : 'Total Cost'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consumptionData.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{bn ? 'এই মাসে কোনো ইনভেন্টরি ক্রয় হয়নি' : 'No inventory purchases this month'}</TableCell></TableRow>
              ) : (
                <>
                  {consumptionData.map((d, i) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{bn ? d.name_bn : d.name_en}</TableCell>
                      <TableCell className="text-center font-bold">{d.qty}</TableCell>
                      <TableCell className="text-center">{d.unit}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">৳{d.cost.toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 font-bold">
                    <TableCell colSpan={4} className="text-right">{bn ? 'সর্বমোট:' : 'Grand Total:'}</TableCell>
                    <TableCell className="text-right text-emerald-700">৳{totalCost.toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryConsumptionReport;
