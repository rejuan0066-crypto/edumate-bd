import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface WidgetConfig {
  id: string;
  title_bn: string;
  title_en: string;
  type: 'stat_card' | 'bar_chart' | 'pie_chart' | 'line_chart' | 'text_card' | 'progress_card';
  data_source: 'students' | 'staff' | 'fee_payments' | 'expenses' | 'donors' | 'custom';
  filter_field?: string;
  filter_value?: string;
  aggregation: 'count' | 'sum' | 'avg' | 'custom_value';
  sum_field?: string;
  custom_value?: string;
  icon: string;
  color: string;
  bg_color: string;
  size: 'small' | 'medium' | 'large';
  visible: boolean;
  sort_order: number;
  chart_config?: {
    labels?: string[];
    values?: number[];
    colors?: string[];
  };
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [];

export const useWidgetSettings = () => {
  const queryClient = useQueryClient();

  const { data: widgets, isLoading } = useQuery({
    queryKey: ['dashboard-widgets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('key, value')
        .eq('key', 'dashboard_widgets');

      if (error) throw error;
      if (data && data.length > 0 && data[0].value) {
        return data[0].value as unknown as WidgetConfig[];
      }
      return DEFAULT_WIDGETS;
    },
    // Config rarely changes; saves invalidate this key explicitly.
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const saveWidgets = useMutation({
    mutationFn: async (newWidgets: WidgetConfig[]) => {
      const { error } = await supabase
        .from('website_settings')
        .upsert({ key: 'dashboard_widgets', value: newWidgets as unknown as Json, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] });
    },
  });

  return {
    widgets: widgets || DEFAULT_WIDGETS,
    isLoading,
    saveWidgets,
  };
};
