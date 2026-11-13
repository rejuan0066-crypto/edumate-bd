import { useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';

export interface StudentCategory {
  id: string;
  name: string;
  name_bn: string;
  description?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export const DEFAULT_STUDENT_CATEGORIES: StudentCategory[] = [
  { id: 'default-general', name: 'general', name_bn: 'সাধারণ', sort_order: 1 },
  { id: 'default-poor', name: 'poor', name_bn: 'অসচ্ছল / গরীব', sort_order: 2 },
  { id: 'default-orphan', name: 'orphan', name_bn: 'এতিম', sort_order: 3 },
  { id: 'default-teachers_child', name: 'teachers_child', name_bn: 'শিক্ষক সন্তান', sort_order: 4 },
];

export function useStudentCategories() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const cleanupRanRef = useRef(false);

  const { data: rawCategories = [], isLoading, refetch } = useQuery({
    queryKey: ['student_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) {
        console.warn('Failed to load student_categories:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Strict deduplication by normalized category name and name_bn
  const { uniqueCategories, duplicateIds } = useMemo(() => {
    const seenNames = new Set<string>();
    const seenBn = new Set<string>();
    const unique: StudentCategory[] = [];
    const dups: string[] = [];

    (rawCategories || []).forEach((cat: any) => {
      const normName = (cat.name || '').trim().toLowerCase();
      const normBn = (cat.name_bn || '').trim();

      const isDup = (normName && seenNames.has(normName)) || (normBn && seenBn.has(normBn));

      if (isDup) {
        if (cat.id) dups.push(cat.id);
      } else {
        if (normName) seenNames.add(normName);
        if (normBn) seenBn.add(normBn);
        unique.push(cat);
      }
    });

    // If none found, provide defaults
    const finalCategories = unique.length > 0 ? unique : DEFAULT_STUDENT_CATEGORIES;
    return { uniqueCategories: finalCategories, duplicateIds: dups };
  }, [rawCategories]);

  // One-time auto cleanup of duplicate rows if logged in as admin
  useEffect(() => {
    if (cleanupRanRef.current) return;
    if (!isAdminRole(role)) return;
    if (duplicateIds.length === 0) return;

    cleanupRanRef.current = true;
    (async () => {
      try {
        const { error } = await supabase
          .from('student_categories')
          .delete()
          .in('id', duplicateIds);
        if (!error) {
          console.log(`[useStudentCategories] Cleaned up ${duplicateIds.length} duplicate categories.`);
          queryClient.invalidateQueries({ queryKey: ['student_categories'] });
          queryClient.invalidateQueries({ queryKey: ['student-categories-approvals'] });
        }
      } catch (err) {
        console.warn('[useStudentCategories] Cleanup duplicate error:', err);
      }
    })();
  }, [duplicateIds, role, queryClient]);

  return {
    categories: uniqueCategories,
    rawCategories,
    isLoading,
    refetch,
  };
}
