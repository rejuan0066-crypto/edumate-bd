import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ResultSecurityConfig {
  enabled: boolean;
  require_approval: boolean;
  lock_published: boolean;
  allow_admin_direct: boolean;
}

export const DEFAULT_RESULT_SECURITY: ResultSecurityConfig = {
  enabled: false,
  require_approval: true,
  lock_published: true,
  allow_admin_direct: true,
};

export const useResultSecurity = () => {
  const qc = useQueryClient();

  const { data: rule, isLoading, refetch } = useQuery({
    queryKey: ['result-security-rule'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('validation_rules')
        .select('*')
        .eq('module', 'result')
        .eq('field_name', 'result_security')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching result security rule:', error);
      }
      return data || null;
    },
    staleTime: 60 * 1000,
  });

  const config: ResultSecurityConfig = (() => {
    if (!rule) return DEFAULT_RESULT_SECURITY;
    const c = typeof rule.config === 'object' && rule.config ? (rule.config as any) : {};
    return {
      enabled: rule.is_active === true,
      require_approval: c.require_approval !== false,
      lock_published: c.lock_published !== false,
      allow_admin_direct: c.allow_admin_direct !== false,
    };
  })();

  const saveMutation = useMutation({
    mutationFn: async (nextConfig: Partial<ResultSecurityConfig>) => {
      const merged: ResultSecurityConfig = {
        ...config,
        ...nextConfig,
      };

      const payload = {
        module: 'result',
        field_name: 'result_security',
        name: 'Result Security & Approval Settings',
        name_bn: 'রেজাল্ট সুরক্ষা ও অনুমোদন সেটিং',
        rule_level: 'warning',
        rule_type: 'custom',
        is_active: merged.enabled,
        config: {
          require_approval: merged.require_approval,
          lock_published: merged.lock_published,
          allow_admin_direct: merged.allow_admin_direct,
        },
      };

      if (rule?.id) {
        const { error } = await supabase
          .from('validation_rules')
          .update(payload)
          .eq('id', rule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('validation_rules')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['result-security-rule'] });
      qc.invalidateQueries({ queryKey: ['validation_rules'] });
    },
  });

  return {
    config,
    enabled: config.enabled,
    requireApproval: config.enabled && config.require_approval,
    lockPublished: config.enabled && config.lock_published,
    allowAdminDirect: config.allow_admin_direct,
    isLoading,
    refetch,
    saveSecurityConfig: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
};
