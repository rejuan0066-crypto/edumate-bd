import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Unified directory of all institution personnel:
 * regular staff + administrative officers.
 *
 * Use anywhere you need to display "name + designation" dynamically
 * (e.g. dropdowns, search, dashboards, signatures, committee picker).
 */
export type DirectoryPerson = {
  id: string;
  source: 'staff' | 'administrative';
  user_id: string | null;
  name_bn: string;
  name_en: string | null;
  designation: string | null;
  department: string | null;
  staff_category: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  code: string | null; // staff_id or officer_id
  status: string | null;
  joining_date: string | null;
};

type Options = {
  source?: 'all' | 'staff' | 'administrative';
  status?: 'all' | 'active' | 'inactive';
  enabled?: boolean;
};

export function useStaffDirectory(opts: Options = {}) {
  const { source = 'all', status = 'active', enabled = true } = opts;

  return useQuery({
    queryKey: ['staff-directory', source, status],
    enabled,
    queryFn: async (): Promise<DirectoryPerson[]> => {
      let query = supabase
        .from('staff_directory' as any)
        .select('*')
        .order('name_bn', { ascending: true });

      if (source !== 'all') query = query.eq('source', source);
      if (status !== 'all') query = query.eq('status', status);

      const { data, error } = await query;
      if (error) throw error;
      return ((data || []) as unknown) as DirectoryPerson[];
    },
    staleTime: 60_000,
  });
}

/** Look up a single person by user_id from the unified directory. */
export function useDirectoryByUserId(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['staff-directory-user', userId],
    enabled: !!userId,
    queryFn: async (): Promise<DirectoryPerson | null> => {
      const { data, error } = await supabase
        .from('staff_directory' as any)
        .select('*')
        .eq('user_id', userId!)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as DirectoryPerson | null;
    },
  });
}
