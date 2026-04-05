import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface DashboardSection {
  id: string;
  titleBn: string;
  titleEn: string;
  visible: boolean;
  sort_order: number;
}

export const DEFAULT_SECTIONS: DashboardSection[] = [
  { id: 'institution', titleBn: 'প্রতিষ্ঠান তথ্য', titleEn: 'Institution Info', visible: true, sort_order: 0 },
  { id: 'search', titleBn: 'সার্চ', titleEn: 'Search', visible: true, sort_order: 1 },
  { id: 'main_stats', titleBn: 'মূল পরিসংখ্যান', titleEn: 'Main Statistics', visible: true, sort_order: 2 },
  { id: 'staff_teacher', titleBn: 'কর্মী ও শিক্ষক পরিসংখ্যান', titleEn: 'Staff & Teacher Stats', visible: true, sort_order: 3 },
  { id: 'student_category', titleBn: 'ছাত্র ক্যাটাগরি পরিসংখ্যান', titleEn: 'Student Category Stats', visible: true, sort_order: 4 },
  { id: 'session_wise', titleBn: 'সেশন ভিত্তিক ছাত্র সংখ্যা', titleEn: 'Session-wise Students', visible: true, sort_order: 5 },
  { id: 'student_detail', titleBn: 'ছাত্র বিস্তারিত পরিসংখ্যান', titleEn: 'Student Detailed Stats', visible: true, sort_order: 6 },
  { id: 'donor', titleBn: 'দাতা তালিকা', titleEn: 'Donor List', visible: true, sort_order: 7 },
  { id: 'fee_stats', titleBn: 'ফি পরিসংখ্যান', titleEn: 'Fee Statistics', visible: true, sort_order: 8 },
  { id: 'custom_widgets', titleBn: 'কাস্টম উইজেট', titleEn: 'Custom Widgets', visible: true, sort_order: 9 },
];

export const useDashboardLayout = () => {
  const queryClient = useQueryClient();

  const { data: sections, isLoading } = useQuery({
    queryKey: ['dashboard-layout'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('key, value')
        .eq('key', 'dashboard_layout');

      if (error) throw error;
      if (data && data.length > 0 && data[0].value) {
        const saved = data[0].value as unknown as DashboardSection[];
        // Merge with defaults to pick up any new sections
        const savedIds = new Set(saved.map(s => s.id));
        const merged = [...saved];
        DEFAULT_SECTIONS.forEach(def => {
          if (!savedIds.has(def.id)) {
            merged.push({ ...def, sort_order: merged.length });
          }
        });
        return merged.sort((a, b) => a.sort_order - b.sort_order);
      }
      return DEFAULT_SECTIONS;
    },
  });

  const saveSections = useMutation({
    mutationFn: async (newSections: DashboardSection[]) => {
      const ordered = newSections.map((s, i) => ({ ...s, sort_order: i }));
      const { error } = await supabase
        .from('website_settings')
        .upsert(
          { key: 'dashboard_layout', value: ordered as unknown as Json, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] });
    },
  });

  return {
    sections: sections || DEFAULT_SECTIONS,
    isLoading,
    saveSections,
  };
};
