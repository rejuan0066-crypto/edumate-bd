import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';

export interface SidebarSection {
  id: string;
  labelBn: string;
  labelEn: string;
  color: string;        // hex color for the label text
  bgColor: string;      // hex bg color for section area (optional, '' = none)
  sort_order: number;
  menuPaths: string[];   // menu paths assigned to this section
}

export const DEFAULT_SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: 'main',
    labelBn: 'প্রধান মেনু',
    labelEn: 'Main Menu',
    color: '',
    bgColor: '',
    sort_order: 0,
    menuPaths: ['/admin'],
  },
  {
    id: 'academics',
    labelBn: 'শিক্ষা ব্যবস্থা',
    labelEn: 'Academics',
    color: '',
    bgColor: '',
    sort_order: 1,
    menuPaths: ['/admin/students', '/admin/staff', '/admin/divisions', '/admin/subjects', '/admin/attendance', '/admin/results'],
  },
  {
    id: 'finance',
    labelBn: 'আর্থিক',
    labelEn: 'Finance',
    color: '',
    bgColor: '',
    sort_order: 2,
    menuPaths: ['/admin/students-fees', '/admin/fees', '/admin/payments', '/admin/expenses', '/admin/donors', '/admin/salary'],
  },
  {
    id: 'administration',
    labelBn: 'প্রশাসন',
    labelEn: 'Administration',
    color: '#10b981',
    bgColor: '',
    sort_order: 3,
    menuPaths: ['/admin/administrative'],
  },
  {
    id: 'others',
    labelBn: 'অন্যান্য',
    labelEn: 'Others',
    color: '',
    bgColor: '',
    sort_order: 4,
    menuPaths: ['/admin/website', '/admin/notices', '/admin/settings'],
  },
];

export const useSidebarSections = () => {
  const queryClient = useQueryClient();
  const { loading: authLoading } = useAuth();

  const { data: sections, isLoading } = useQuery({
    queryKey: ['sidebar-sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('key, value')
        .eq('key', 'sidebar_sections');
      if (error) throw error;
      if (data && data.length > 0 && data[0].value) {
        return data[0].value as unknown as SidebarSection[];
      }
      return DEFAULT_SIDEBAR_SECTIONS;
    },
    enabled: !authLoading,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const saveSections = useMutation({
    mutationFn: async (newSections: SidebarSection[]) => {
      const ordered = newSections.map((s, i) => ({ ...s, sort_order: i }));
      const { error } = await supabase
        .from('website_settings')
        .upsert(
          { key: 'sidebar_sections', value: ordered as unknown as Json, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sidebar-sections'] }),
  });

  // Helper: get the section for a given path
  const getSectionForPath = (path: string): SidebarSection | undefined => {
    const secs = sections || DEFAULT_SIDEBAR_SECTIONS;
    return secs.find(s => s.menuPaths.includes(path));
  };

  return {
    sections: sections || DEFAULT_SIDEBAR_SECTIONS,
    isLoading,
    saveSections,
    getSectionForPath,
  };
};
