import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ApiVerificationConfig {
  id: string;
  api_url: string;
  api_key: string;
  is_enabled: boolean;
  master_password: string;
  field_mappings: Record<string, Record<string, string>>;
}

// For admin - full config
export const useApiVerificationConfig = () => {
  return useQuery({
    queryKey: ['api-verification-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_verification_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ApiVerificationConfig | null;
    },
    staleTime: 60 * 1000,
  });
};

// For forms - just check if enabled
export const useApiVerificationEnabled = () => {
  return useQuery({
    queryKey: ['api-verification-enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_verification_config')
        .select('is_enabled')
        .limit(1)
        .maybeSingle();
      if (error) return false;
      return data?.is_enabled ?? false;
    },
    staleTime: 60 * 1000,
  });
};

export const verifyCard = async (cardNumber: string, formType: 'student' | 'staff') => {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  
  const { data, error } = await supabase.functions.invoke('verify-card', {
    body: { card_number: cardNumber, form_type: formType },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};
