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
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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

/**
 * Universal 12-Hour Time Formatter for the entire site
 * Input can be "HH:mm", "HH:mm:ss", ISO timestamp, or Date object.
 * Returns standard 12-hour formatted string, e.g. "02:30 PM" or "০২:৩০ PM".
 */
export const to12HourFormat = (
  time: string | Date | null | undefined,
  bn: boolean = false,
  withSeconds: boolean = false
): string => {
  if (!time) return '';

  let h = 0;
  let m = 0;
  let s = 0;

  if (time instanceof Date) {
    h = time.getHours();
    m = time.getMinutes();
    s = time.getSeconds();
  } else if (typeof time === 'string') {
    const trimmed = time.trim();
    if (!trimmed) return '';

    // If ISO date string e.g. "2026-10-25T14:30:00.000Z"
    if (trimmed.includes('T')) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        h = d.getHours();
        m = d.getMinutes();
        s = d.getSeconds();
      } else {
        return trimmed;
      }
    } else {
      // E.g. "14:30" or "14:30:00" or "02:30 PM"
      const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/i);
      if (match) {
        h = parseInt(match[1], 10);
        m = parseInt(match[2], 10);
        s = match[3] ? parseInt(match[3], 10) : 0;
        const period = match[4]?.toUpperCase();
        if (period === 'PM' && h < 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
      } else {
        return trimmed;
      }
    }
  } else {
    return '';
  }

  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const hStr = String(h12).padStart(2, '0');
  const mStr = String(m).padStart(2, '0');
  const sStr = String(s).padStart(2, '0');

  const base = withSeconds ? `${hStr}:${mStr}:${sStr} ${period}` : `${hStr}:${mStr} ${period}`;

  if (bn) {
    return base.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);
  }
  return base;
};

/** Format time string or Date to 12h or 24h, defaulting to 12h */
export const formatTimeDisplay = (
  time: string | Date | null | undefined,
  format: TimeFormatType = '12h',
  bn: boolean = false
): string => {
  if (!time) return '';
  if (format === '24h') {
    if (time instanceof Date) {
      const h = String(time.getHours()).padStart(2, '0');
      const m = String(time.getMinutes()).padStart(2, '0');
      const res = `${h}:${m}`;
      return bn ? res.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]) : res;
    }
    const clean = String(time).slice(0, 5);
    return bn ? clean.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]) : clean;
  }
  return to12HourFormat(time, bn);
};
