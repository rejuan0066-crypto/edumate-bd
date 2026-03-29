import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useModuleAccess = (menuPath?: string) => {
  const { data: modules = [] } = useQuery({
    queryKey: ['system-modules-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_modules')
        .select('menu_path, is_enabled, name, name_bn');
      if (error) throw error;
      return data;
    },
    staleTime: 30000,
  });

  const isModuleEnabled = (path: string): boolean => {
    const mod = modules.find(m => m.menu_path === path);
    // If module is not registered, allow access (backward compat)
    if (!mod) return true;
    return mod.is_enabled ?? true;
  };

  const getModuleInfo = (path: string) => {
    return modules.find(m => m.menu_path === path) || null;
  };

  const currentEnabled = menuPath ? isModuleEnabled(menuPath) : true;

  return { isModuleEnabled, getModuleInfo, currentEnabled, modules };
};
