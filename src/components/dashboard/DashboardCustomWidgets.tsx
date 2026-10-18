import { useLanguage } from '@/contexts/LanguageContext';
import { useWidgetSettings, WidgetConfig } from '@/hooks/useWidgetSettings';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Users, UserCog, CreditCard, Heart, Receipt, BookOpen, FileText,
  GraduationCap, UserCheck, UserX, Layers, Star, Award, Clock,
  type LucideIcon
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ICON_MAP: Record<string, LucideIcon> = {
  Users, UserCog, CreditCard, Heart, Receipt, BookOpen, FileText,
  GraduationCap, UserCheck, UserX, Layers, Star, Award, Clock,
};

const getIcon = (name: string): LucideIcon => ICON_MAP[name] || Star;

const CHART_COLORS = ['hsl(152,55%,28%)', 'hsl(42,85%,55%)', 'hsl(210,80%,52%)', 'hsl(0,72%,51%)', 'hsl(280,60%,50%)', 'hsl(180,50%,40%)'];

const DashboardCustomWidgets = () => {
  const { language } = useLanguage();
  const { widgets } = useWidgetSettings();
  const bn = language === 'bn';

  // Fetch data for widgets
  const { data: students = [] } = useQuery({
    queryKey: ['widget-students'],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('id, status, student_category, residence_type, gender').is('deleted_at', null);
      return data || [];
    },
    enabled: widgets.some(w => w.visible && w.data_source === 'students'),
  });

  const { data: staffData = [] } = useQuery({
    queryKey: ['widget-staff'],
    queryFn: async () => {
      const { data } = await supabase.from('staff').select('id, status, salary, department');
      return data || [];
    },
    enabled: widgets.some(w => w.visible && w.data_source === 'staff'),
  });

  const { data: feePayments = [] } = useQuery({
    queryKey: ['widget-fees'],
    queryFn: async () => {
      const { data } = await supabase.from('fee_payments').select('id, amount, paid_amount, status');
      return data || [];
    },
    enabled: widgets.some(w => w.visible && w.data_source === 'fee_payments'),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['widget-expenses'],
    queryFn: async () => {
      const { data } = await supabase.from('expenses').select('id, amount');
      return data || [];
    },
    enabled: widgets.some(w => w.visible && w.data_source === 'expenses'),
  });

  const { data: donors = [] } = useQuery({
    queryKey: ['widget-donors'],
    queryFn: async () => {
      const { data } = await supabase.from('donors').select('id, donation_amount, status');
      return data || [];
    },
    enabled: widgets.some(w => w.visible && w.data_source === 'donors'),
  });

  const getDataSource = (source: string): any[] => {
    switch (source) {
      case 'students': return students;
      case 'staff': return staffData;
      case 'fee_payments': return feePayments;
      case 'expenses': return expenses;
      case 'donors': return donors;
      default: return [];
    }
  };

  const computeValue = (w: WidgetConfig): string | number => {
    if (w.aggregation === 'custom_value') return w.custom_value || '0';
    const data: any[] = getDataSource(w.data_source);
    let filtered = data;
    if (w.filter_field && w.filter_value) {
      filtered = data.filter((d: any) => d[w.filter_field!] === w.filter_value);
    }
    if (w.aggregation === 'count') return filtered.length;
    if (w.aggregation === 'sum' && w.sum_field) {
      return filtered.reduce((s: number, d: any) => s + (Number(d[w.sum_field!]) || 0), 0);
    }
    if (w.aggregation === 'avg' && w.sum_field) {
      const total = filtered.reduce((s: number, d: any) => s + (Number(d[w.sum_field!]) || 0), 0);
      return filtered.length ? Math.round(total / filtered.length) : 0;
    }
    return filtered.length;
  };

  const visibleWidgets = widgets.filter(w => w.visible).sort((a, b) => a.sort_order - b.sort_order);
  if (visibleWidgets.length === 0) return null;

  const getColSpan = (size: string) => {
    switch (size) {
      case 'large': return 'col-span-2 sm:col-span-2';
      case 'medium': return 'col-span-2 sm:col-span-1';
      default: return 'col-span-1';
    }
  };

  return (
    <div className="card-elevated p-4">
      <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
        <Star className="w-5 h-5 text-accent" />
        {bn ? 'কাস্টম উইজেট' : 'Custom Widgets'}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {visibleWidgets.map(w => {
          const Icon = getIcon(w.icon);
          const value = computeValue(w);

          if (w.type === 'stat_card' || w.type === 'text_card' || w.type === 'progress_card') {
            return (
              <div key={w.id} className={`stat-card flex items-center gap-3 ${getColSpan(w.size)}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0`} style={{ backgroundColor: w.bg_color || 'hsl(152,55%,28%,0.1)' }}>
                  <Icon className="w-5 h-5" style={{ color: w.color || 'hsl(152,55%,28%)' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground leading-tight">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight truncate">
                    {bn ? w.title_bn : w.title_en}
                  </p>
                </div>
              </div>
            );
          }

          // Chart widgets
          const chartData = w.chart_config?.labels?.map((label, i) => ({
            name: label,
            value: w.chart_config?.values?.[i] || 0,
          })) || [];

          if (w.type === 'bar_chart') {
            return (
              <div key={w.id} className={`stat-card ${w.size === 'large' ? 'col-span-2' : 'col-span-2 sm:col-span-1'}`}>
                <p className="text-sm font-medium text-foreground mb-2">{bn ? w.title_bn : w.title_en}</p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill={w.color || CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          }

          if (w.type === 'pie_chart') {
            return (
              <div key={w.id} className={`stat-card ${w.size === 'large' ? 'col-span-2' : 'col-span-2 sm:col-span-1'}`}>
                <p className="text-sm font-medium text-foreground mb-2">{bn ? w.title_bn : w.title_en}</p>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={45} label={({ name }) => name}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={w.chart_config?.colors?.[i] || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            );
          }

          if (w.type === 'line_chart') {
            return (
              <div key={w.id} className={`stat-card ${w.size === 'large' ? 'col-span-2' : 'col-span-2 sm:col-span-1'}`}>
                <p className="text-sm font-medium text-foreground mb-2">{bn ? w.title_bn : w.title_en}</p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke={w.color || CHART_COLORS[0]} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};

export default DashboardCustomWidgets;
