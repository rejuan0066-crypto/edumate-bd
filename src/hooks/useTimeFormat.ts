import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TimeFormatType = '12h' | '24h';

export const useTimeFormat = () => {
  const queryClient = useQueryClient();

  const { data: timeFormat = '12h' } = useQuery({
    queryKey: ['time-format-setting'],
    queryFn: async () => {
      const { data } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'time_format')
        .maybeSingle();
      return ((data?.value as any)?.format as TimeFormatType) || '12h';
    },
  });

  const setTimeFormat = useMutation({
    mutationFn: async (format: TimeFormatType) => {
      const { error } = await supabase
        .from('website_settings')
        .upsert({ key: 'time_format', value: { format }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-format-setting'] });
    },
  });

  return { timeFormat: timeFormat as TimeFormatType, setTimeFormat };
};

/** Format "HH:MM" string to 12h or 24h */
export const formatTimeDisplay = (time: string, format: TimeFormatType): string => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  if (format === '24h') {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};
