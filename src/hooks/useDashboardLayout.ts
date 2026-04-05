import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface HoverEffect {
  scale?: number;          // 1.0 - 1.15
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  lift?: number;           // translateY in px (0-8)
  brightness?: number;     // 0.9 - 1.2
  borderGlow?: boolean;
  speed?: number;          // transition duration ms (100-500)
}

export interface SectionStyle {
  columns?: number;        // grid columns (2-6)
  columnsMobile?: number;  // mobile grid columns (1-3)
  gap?: number;            // gap in px (4-24)
  cardSize?: 'compact' | 'default' | 'large';
  showBorder?: boolean;
  showShadow?: boolean;
  hover?: HoverEffect;
}

export interface DashboardSection {
  id: string;
  titleBn: string;
  titleEn: string;
  icon?: string;
  visible: boolean;
  sort_order: number;
  style?: SectionStyle;
  hiddenCards?: string[];   // card labels to hide within this section
}

export const SECTION_ICONS = [
  'Users', 'UserCog', 'GraduationCap', 'Heart', 'CreditCard',
  'BookOpen', 'FileText', 'History', 'Layers', 'ClipboardList',
  'Home', 'Search', 'Star', 'Award', 'LayoutDashboard',
];

export const DEFAULT_SECTIONS: DashboardSection[] = [
  { id: 'institution', titleBn: 'প্রতিষ্ঠান তথ্য', titleEn: 'Institution Info', visible: true, sort_order: 0, icon: 'Home' },
  { id: 'search', titleBn: 'সার্চ', titleEn: 'Search', visible: true, sort_order: 1, icon: 'Search' },
  { id: 'main_stats', titleBn: 'মূল পরিসংখ্যান', titleEn: 'Main Statistics', visible: true, sort_order: 2, icon: 'Users', style: { columns: 4, columnsMobile: 2, gap: 12 } },
  { id: 'staff_teacher', titleBn: 'কর্মী ও শিক্ষক পরিসংখ্যান', titleEn: 'Staff & Teacher Stats', visible: true, sort_order: 3, icon: 'UserCog', style: { columns: 5, columnsMobile: 2, gap: 12 } },
  { id: 'student_category', titleBn: 'ছাত্র ক্যাটাগরি পরিসংখ্যান', titleEn: 'Student Category Stats', visible: true, sort_order: 4, icon: 'GraduationCap', style: { columns: 5, columnsMobile: 2, gap: 12 } },
  { id: 'session_wise', titleBn: 'সেশন ভিত্তিক ছাত্র সংখ্যা', titleEn: 'Session-wise Students', visible: true, sort_order: 5, icon: 'History', style: { columns: 6, columnsMobile: 3, gap: 12 } },
  { id: 'student_detail', titleBn: 'ছাত্র বিস্তারিত পরিসংখ্যান', titleEn: 'Student Detailed Stats', visible: true, sort_order: 6, icon: 'Users', style: { columns: 4, columnsMobile: 2, gap: 12 } },
  { id: 'donor', titleBn: 'দাতা তালিকা', titleEn: 'Donor List', visible: true, sort_order: 7, icon: 'Heart', style: { columns: 4, columnsMobile: 2, gap: 12 } },
  { id: 'fee_stats', titleBn: 'ফি পরিসংখ্যান', titleEn: 'Fee Statistics', visible: true, sort_order: 8, icon: 'CreditCard' },
  { id: 'custom_widgets', titleBn: 'কাস্টম উইজেট', titleEn: 'Custom Widgets', visible: true, sort_order: 9, icon: 'Star' },
];

// Define which cards exist in each section for hide/show toggle
export const SECTION_CARDS: Record<string, { labelBn: string; labelEn: string; key: string }[]> = {
  main_stats: [
    { key: 'total_students', labelBn: 'মোট ছাত্র', labelEn: 'Total Students' },
    { key: 'active_students', labelBn: 'সক্রিয় ছাত্র', labelEn: 'Active Students' },
    { key: 'inactive_students', labelBn: 'নিষ্ক্রিয় ছাত্র', labelEn: 'Inactive Students' },
    { key: 'total_staff', labelBn: 'মোট কর্মী', labelEn: 'Total Staff' },
  ],
  staff_teacher: [
    { key: 'teachers_active', labelBn: 'শিক্ষক (সক্রিয়)', labelEn: 'Teachers (Active)' },
    { key: 'teachers_resigned', labelBn: 'শিক্ষক (পদত্যাগী)', labelEn: 'Teachers (Resigned)' },
    { key: 'staff_active', labelBn: 'কর্মী (সক্রিয়)', labelEn: 'Staff (Active)' },
    { key: 'staff_resigned', labelBn: 'কর্মী (পদত্যাগী)', labelEn: 'Staff (Resigned)' },
    { key: 'last_salary', labelBn: 'গত মাসের বেতন', labelEn: 'Last Month Salary' },
  ],
  student_category: [
    { key: 'orphan', labelBn: 'এতিম ছাত্র', labelEn: 'Orphan Students' },
    { key: 'poor', labelBn: 'গরীব ছাত্র', labelEn: 'Poor Students' },
    { key: 'teacher_child', labelBn: 'শিক্ষক সন্তান', labelEn: "Teacher's Child" },
    { key: 'free', labelBn: 'বিনা বেতন ছাত্র', labelEn: 'Free Students' },
    { key: 'general_paid', labelBn: 'সাধারণ ছাত্র ও পরিশোধিত', labelEn: 'Non-Orphan&Poor + Amounts' },
    { key: 'resident', labelBn: 'আবাসিক ছাত্র', labelEn: 'Resident Students' },
    { key: 'non_resident', labelBn: 'অনাবাসিক ছাত্র', labelEn: 'Non-Resident Students' },
  ],
  student_detail: [
    { key: 'new_students', labelBn: 'নতুন ছাত্র', labelEn: 'New Students' },
    { key: 'old_students', labelBn: 'পুরাতন ছাত্র', labelEn: 'Old Students' },
    { key: 'divisions', labelBn: 'বিভাগ', labelEn: 'Divisions' },
    { key: 'subjects', labelBn: 'বিষয়', labelEn: 'Subjects' },
    { key: 'exams', labelBn: 'পরীক্ষা', labelEn: 'Exams' },
    { key: 'results', labelBn: 'ফলাফল', labelEn: 'Results' },
    { key: 'admission_history', labelBn: 'ভর্তি ইতিহাস', labelEn: 'Admission History' },
  ],
  donor: [
    { key: 'total_donors', labelBn: 'মোট দাতা', labelEn: 'Total Donors' },
    { key: 'active_donors', labelBn: 'সক্রিয় দাতা', labelEn: 'Active Donors' },
    { key: 'total_donations', labelBn: 'মোট অনুদান', labelEn: 'Total Donations' },
  ],
  fee_stats: [
    { key: 'monthly', labelBn: 'মাসিক ফি', labelEn: 'Monthly Fees' },
    { key: 'exam', labelBn: 'পরীক্ষা ফি', labelEn: 'Exam Fees' },
    { key: 'admission', labelBn: 'ভর্তি ফি', labelEn: 'Admission Fees' },
  ],
};

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
