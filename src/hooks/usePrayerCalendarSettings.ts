import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface PrayerCalendarConfig {
  default_country: string;
  default_division: string;
  default_city: string;
  calculation_method: number; // Aladhan method: 1=Karachi, 2=ISNA, 3=MWL, 4=Makkah, 5=Egypt, etc.
  hijri_offset: number; // days offset for hijri date
  time_format: '12h' | '24h';
  show_prayer_times: boolean;
  show_calendar: boolean;
  show_bangla_date: boolean;
  show_hijri_date: boolean;
}

const DEFAULT_CONFIG: PrayerCalendarConfig = {
  default_country: 'BD',
  default_division: 'sylhet',
  default_city: 'Sylhet',
  calculation_method: 1,
  hijri_offset: -1,
  time_format: '12h',
  show_prayer_times: true,
  show_calendar: true,
  show_bangla_date: true,
  show_hijri_date: true,
};

export interface HolidayRecord {
  id: string;
  year: number;
  date: string;
  name_bn: string;
  name_en: string;
  type: string;
  approximate: boolean;
  is_active: boolean;
  sort_order: number;
}

const PRAYER_CONFIG_CACHE_KEY = 'prayer-calendar-config-cache';
const readPrayerConfigCache = (): PrayerCalendarConfig => {
  try {
    const raw = localStorage.getItem(PRAYER_CONFIG_CACHE_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CONFIG;
};

export const usePrayerCalendarSettings = () => {
  const queryClient = useQueryClient();

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['prayer-calendar-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'prayer_calendar_settings')
        .maybeSingle();
      if (error) throw error;
      if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
        const merged = { ...DEFAULT_CONFIG, ...(data.value as Record<string, unknown>) } as PrayerCalendarConfig;
        try { localStorage.setItem(PRAYER_CONFIG_CACHE_KEY, JSON.stringify(merged)); } catch {}
        return merged;
      }
      return DEFAULT_CONFIG;
    },
    initialData: readPrayerConfigCache,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
  });

  const updateConfig = useMutation({
    mutationFn: async (newConfig: PrayerCalendarConfig) => {
      const { error } = await supabase
        .from('website_settings')
        .upsert({ key: 'prayer_calendar_settings', value: newConfig as unknown as Json, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-calendar-config'] });
    },
  });

  // Holidays CRUD
  const { data: holidays, isLoading: holidaysLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('year', { ascending: true })
        .order('date', { ascending: true });
      if (error) throw error;
      return (data || []) as HolidayRecord[];
    },
  });

  const addHoliday = useMutation({
    mutationFn: async (holiday: Omit<HolidayRecord, 'id'>) => {
      const { error } = await supabase.from('holidays').insert(holiday);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays'] }),
  });

  const updateHoliday = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HolidayRecord> & { id: string }) => {
      const { error } = await supabase.from('holidays').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays'] }),
  });

  const deleteHoliday = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('holidays').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays'] }),
  });

  return {
    config: config || DEFAULT_CONFIG,
    configLoading,
    updateConfig,
    holidays: holidays || [],
    holidaysLoading,
    addHoliday,
    updateHoliday,
    deleteHoliday,
  };
};
