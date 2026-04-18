import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProviderSetting {
  id: string;
  provider: string;
  default_room_url: string | null;
  is_enabled: boolean;
  config: Record<string, any>;
}

export function useMeetingProviderSettings() {
  const { data, isLoading } = useQuery<ProviderSetting[]>({
    queryKey: ['meeting-provider-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meeting_provider_settings')
        .select('*')
        .eq('is_enabled', true);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const getDefaultUrl = (provider: string): string | null => {
    return data?.find((s) => s.provider === provider)?.default_room_url || null;
  };

  return { settings: data, getDefaultUrl, isLoading };
}
