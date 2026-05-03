import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RoleTranslation {
  id: string;
  role_key: string;
  name_en: string;
  name_bn: string;
  description_en: string | null;
  description_bn: string | null;
  is_system: boolean;
  sort_order: number;
}

export interface DesignationTranslation {
  id: string;
  name: string;       // English
  name_bn: string;    // Bangla
  description: string | null;
  staff_category: string | null;
  is_active: boolean;
}

const STALE = 5 * 60 * 1000;

/**
 * Dynamic role translations loaded from `role_translations` table.
 * Falls back to the `role_key` itself if not found.
 */
export const useRoleTranslations = () => {
  const q = useQuery({
    queryKey: ['role-translations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_translations')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as RoleTranslation[];
    },
    staleTime: STALE,
  });

  const map = new Map<string, RoleTranslation>();
  (q.data || []).forEach((r) => map.set(r.role_key, r));

  const getRoleLabel = (roleKey: string | null | undefined, bn: boolean): string => {
    if (!roleKey) return '';
    const t = map.get(roleKey);
    if (!t) return roleKey;
    return bn ? (t.name_bn || t.name_en || roleKey) : (t.name_en || t.name_bn || roleKey);
  };

  const getRoleDescription = (roleKey: string | null | undefined, bn: boolean): string => {
    if (!roleKey) return '';
    const t = map.get(roleKey);
    if (!t) return '';
    return (bn ? (t.description_bn || t.description_en) : (t.description_en || t.description_bn)) || '';
  };

  return { translations: q.data || [], isLoading: q.isLoading, getRoleLabel, getRoleDescription };
};

/**
 * Dynamic designation translations loaded from `designations` table.
 */
export const useDesignationTranslations = () => {
  const q = useQuery({
    queryKey: ['designation-translations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('designations')
        .select('id, name, name_bn, description, staff_category, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as DesignationTranslation[];
    },
    staleTime: STALE,
  });

  const byEn = new Map<string, DesignationTranslation>();
  const byBn = new Map<string, DesignationTranslation>();
  const byId = new Map<string, DesignationTranslation>();
  (q.data || []).forEach((d) => {
    byId.set(d.id, d);
    if (d.name) byEn.set(d.name.toLowerCase().trim(), d);
    if (d.name_bn) byBn.set(d.name_bn.trim(), d);
  });

  const getDesignationLabel = (value: string | null | undefined, bn: boolean): string => {
    if (!value) return '';
    const v = value.toString().trim();
    const found = byId.get(v) || byEn.get(v.toLowerCase()) || byBn.get(v);
    if (!found) return v;
    return bn ? (found.name_bn || found.name) : (found.name || found.name_bn);
  };

  return { designations: q.data || [], isLoading: q.isLoading, getDesignationLabel };
};
