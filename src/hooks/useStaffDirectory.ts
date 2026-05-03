import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { newCorrelationId, logAdminNameRequest } from '@/lib/adminNameRequestLog';

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
      const correlationId = newCorrelationId('dir');
      const start = performance.now();

      let query = supabase
        .from('staff_directory' as any)
        .select('*')
        .order('name_bn', { ascending: true });

      if (source !== 'all') query = query.eq('source', source);
      if (status !== 'all') query = query.eq('status', status);

      const { data, error } = await query;
      const duration = Math.round(performance.now() - start);

      // Fire-and-forget log (does not block UI)
      logAdminNameRequest({
        correlationId,
        sourcePath: 'useStaffDirectory',
        sqlPath: 'view:staff_directory',
        filters: { source, status },
        resultCount: Array.isArray(data) ? data.length : null,
        errorCode: error?.code ?? null,
        errorMessage: error?.message ?? null,
        durationMs: duration,
      });

      if (error) {
        (error as any).correlationId = correlationId;
        throw error;
      }
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
      const correlationId = newCorrelationId('diru');
      const start = performance.now();
      const { data, error } = await supabase
        .from('staff_directory' as any)
        .select('*')
        .eq('user_id', userId!)
        .limit(1)
        .maybeSingle();
      const duration = Math.round(performance.now() - start);

      logAdminNameRequest({
        correlationId,
        sourcePath: 'useDirectoryByUserId',
        sqlPath: 'view:staff_directory',
        filters: { user_id: userId },
        resultCount: data ? 1 : 0,
        errorCode: error?.code ?? null,
        errorMessage: error?.message ?? null,
        durationMs: duration,
      });

      if (error) {
        (error as any).correlationId = correlationId;
        throw error;
      }
      return (data as unknown) as DirectoryPerson | null;
    },
  });
}
