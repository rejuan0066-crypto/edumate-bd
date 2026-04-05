import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { HoverEffect } from './useDashboardLayout';

export interface PageCardStyle {
  columns?: number;
  columnsMobile?: number;
  gap?: number;
  cardSize?: 'compact' | 'default' | 'large';
  showBorder?: boolean;
  showShadow?: boolean;
  hover?: HoverEffect;
}

export interface PageSection {
  id: string;
  titleBn: string;
  titleEn: string;
  icon?: string;
  visible: boolean;
  sort_order: number;
  style?: PageCardStyle;
}

export interface PageConfig {
  pageId: string;
  sections: PageSection[];
}

// Global card style preset that applies to all pages
export interface GlobalCardPreset {
  hover: HoverEffect;
  showBorder: boolean;
  showShadow: boolean;
  cardSize: 'compact' | 'default' | 'large';
}

export const DEFAULT_GLOBAL_PRESET: GlobalCardPreset = {
  hover: { scale: 1.03, shadow: 'md', lift: 2, brightness: 1, borderGlow: false, speed: 200 },
  showBorder: true,
  showShadow: true,
  cardSize: 'default',
};

// Registry of all admin pages and their sections
export interface PageRegistryEntry {
  pageId: string;
  titleBn: string;
  titleEn: string;
  icon: string;
  route: string;
  sections: PageSection[];
}

export const PAGE_REGISTRY: PageRegistryEntry[] = [
  {
    pageId: 'students',
    titleBn: 'ছাত্র ব্যবস্থাপনা',
    titleEn: 'Student Management',
    icon: 'GraduationCap',
    route: '/admin/students',
    sections: [
      { id: 'filters', titleBn: 'ফিল্টার ও সার্চ', titleEn: 'Filters & Search', visible: true, sort_order: 0, icon: 'Search' },
      { id: 'stats', titleBn: 'পরিসংখ্যান কার্ড', titleEn: 'Statistics Cards', visible: true, sort_order: 1, icon: 'Users' },
      { id: 'table', titleBn: 'ছাত্র তালিকা', titleEn: 'Student List', visible: true, sort_order: 2, icon: 'FileText' },
      { id: 'actions', titleBn: 'অ্যাকশন বাটন', titleEn: 'Action Buttons', visible: true, sort_order: 3, icon: 'Layers' },
    ],
  },
  {
    pageId: 'staff',
    titleBn: 'স্টাফ ব্যবস্থাপনা',
    titleEn: 'Staff Management',
    icon: 'UserCog',
    route: '/admin/staff',
    sections: [
      { id: 'filters', titleBn: 'ফিল্টার ও সার্চ', titleEn: 'Filters & Search', visible: true, sort_order: 0, icon: 'Search' },
      { id: 'stats', titleBn: 'পরিসংখ্যান কার্ড', titleEn: 'Statistics Cards', visible: true, sort_order: 1, icon: 'UserCog' },
      { id: 'table', titleBn: 'স্টাফ তালিকা', titleEn: 'Staff List', visible: true, sort_order: 2, icon: 'FileText' },
      { id: 'actions', titleBn: 'অ্যাকশন বাটন', titleEn: 'Action Buttons', visible: true, sort_order: 3, icon: 'Layers' },
    ],
  },
  {
    pageId: 'fees',
    titleBn: 'ফি ব্যবস্থাপনা',
    titleEn: 'Fee Management',
    icon: 'CreditCard',
    route: '/admin/fees',
    sections: [
      { id: 'summary', titleBn: 'ফি সারাংশ', titleEn: 'Fee Summary', visible: true, sort_order: 0, icon: 'CreditCard' },
      { id: 'fee_types', titleBn: 'ফি ধরন', titleEn: 'Fee Types', visible: true, sort_order: 1, icon: 'Layers' },
      { id: 'payments', titleBn: 'পেমেন্ট তালিকা', titleEn: 'Payment List', visible: true, sort_order: 2, icon: 'FileText' },
    ],
  },
  {
    pageId: 'expenses',
    titleBn: 'খরচ ব্যবস্থাপনা',
    titleEn: 'Expense Management',
    icon: 'Receipt',
    route: '/admin/expenses',
    sections: [
      { id: 'summary', titleBn: 'খরচ সারাংশ', titleEn: 'Expense Summary', visible: true, sort_order: 0, icon: 'CreditCard' },
      { id: 'projects', titleBn: 'প্রজেক্ট', titleEn: 'Projects', visible: true, sort_order: 1, icon: 'Layers' },
      { id: 'entries', titleBn: 'খরচ তালিকা', titleEn: 'Expense Entries', visible: true, sort_order: 2, icon: 'FileText' },
    ],
  },
  {
    pageId: 'donors',
    titleBn: 'দাতা ব্যবস্থাপনা',
    titleEn: 'Donor Management',
    icon: 'Heart',
    route: '/admin/donors',
    sections: [
      { id: 'stats', titleBn: 'দাতা পরিসংখ্যান', titleEn: 'Donor Stats', visible: true, sort_order: 0, icon: 'Heart' },
      { id: 'table', titleBn: 'দাতা তালিকা', titleEn: 'Donor List', visible: true, sort_order: 1, icon: 'FileText' },
    ],
  },
  {
    pageId: 'attendance',
    titleBn: 'উপস্থিতি',
    titleEn: 'Attendance',
    icon: 'ClipboardList',
    route: '/admin/attendance',
    sections: [
      { id: 'date_picker', titleBn: 'তারিখ ও ফিল্টার', titleEn: 'Date & Filter', visible: true, sort_order: 0, icon: 'History' },
      { id: 'stats', titleBn: 'উপস্থিতি পরিসংখ্যান', titleEn: 'Attendance Stats', visible: true, sort_order: 1, icon: 'Users' },
      { id: 'table', titleBn: 'উপস্থিতি তালিকা', titleEn: 'Attendance List', visible: true, sort_order: 2, icon: 'FileText' },
    ],
  },
  {
    pageId: 'results',
    titleBn: 'ফলাফল',
    titleEn: 'Results',
    icon: 'Award',
    route: '/admin/results',
    sections: [
      { id: 'filters', titleBn: 'ফিল্টার', titleEn: 'Filters', visible: true, sort_order: 0, icon: 'Search' },
      { id: 'table', titleBn: 'ফলাফল তালিকা', titleEn: 'Results Table', visible: true, sort_order: 1, icon: 'FileText' },
    ],
  },
  {
    pageId: 'notices',
    titleBn: 'নোটিশ',
    titleEn: 'Notices',
    icon: 'FileText',
    route: '/admin/notices',
    sections: [
      { id: 'list', titleBn: 'নোটিশ তালিকা', titleEn: 'Notice List', visible: true, sort_order: 0, icon: 'FileText' },
      { id: 'actions', titleBn: 'অ্যাকশন', titleEn: 'Actions', visible: true, sort_order: 1, icon: 'Layers' },
    ],
  },
  {
    pageId: 'posts',
    titleBn: 'পোস্ট',
    titleEn: 'Posts',
    icon: 'BookOpen',
    route: '/admin/posts',
    sections: [
      { id: 'list', titleBn: 'পোস্ট তালিকা', titleEn: 'Post List', visible: true, sort_order: 0, icon: 'BookOpen' },
      { id: 'actions', titleBn: 'অ্যাকশন', titleEn: 'Actions', visible: true, sort_order: 1, icon: 'Layers' },
    ],
  },
  {
    pageId: 'salary',
    titleBn: 'বেতন ব্যবস্থাপনা',
    titleEn: 'Salary Management',
    icon: 'CreditCard',
    route: '/admin/salary',
    sections: [
      { id: 'summary', titleBn: 'বেতন সারাংশ', titleEn: 'Salary Summary', visible: true, sort_order: 0, icon: 'CreditCard' },
      { id: 'table', titleBn: 'বেতন তালিকা', titleEn: 'Salary List', visible: true, sort_order: 1, icon: 'FileText' },
    ],
  },
  {
    pageId: 'divisions',
    titleBn: 'বিভাগ ও শ্রেণী',
    titleEn: 'Divisions & Classes',
    icon: 'Layers',
    route: '/admin/divisions',
    sections: [
      { id: 'divisions', titleBn: 'বিভাগ', titleEn: 'Divisions', visible: true, sort_order: 0, icon: 'Layers' },
      { id: 'classes', titleBn: 'শ্রেণী', titleEn: 'Classes', visible: true, sort_order: 1, icon: 'BookOpen' },
    ],
  },
  {
    pageId: 'reports',
    titleBn: 'রিপোর্ট',
    titleEn: 'Reports',
    icon: 'FileText',
    route: '/admin/reports',
    sections: [
      { id: 'filters', titleBn: 'ফিল্টার', titleEn: 'Filters', visible: true, sort_order: 0, icon: 'Search' },
      { id: 'charts', titleBn: 'চার্ট', titleEn: 'Charts', visible: true, sort_order: 1, icon: 'LayoutDashboard' },
      { id: 'table', titleBn: 'ডেটা টেবিল', titleEn: 'Data Table', visible: true, sort_order: 2, icon: 'FileText' },
    ],
  },
];

// Hook to get/save global card preset
export const useGlobalCardPreset = () => {
  const queryClient = useQueryClient();

  const { data: preset, isLoading } = useQuery({
    queryKey: ['global-card-preset'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('key, value')
        .eq('key', 'global_card_preset');
      if (error) throw error;
      if (data && data.length > 0 && data[0].value) {
        return data[0].value as unknown as GlobalCardPreset;
      }
      return DEFAULT_GLOBAL_PRESET;
    },
  });

  const savePreset = useMutation({
    mutationFn: async (newPreset: GlobalCardPreset) => {
      const { error } = await supabase
        .from('website_settings')
        .upsert(
          { key: 'global_card_preset', value: newPreset as unknown as Json, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['global-card-preset'] }),
  });

  return { preset: preset || DEFAULT_GLOBAL_PRESET, isLoading, savePreset };
};

// Hook to get/save per-page layout
export const usePageLayout = (pageId: string) => {
  const queryClient = useQueryClient();
  const registryEntry = PAGE_REGISTRY.find(p => p.pageId === pageId);
  const defaultSections = registryEntry?.sections || [];

  const { data: sections, isLoading } = useQuery({
    queryKey: ['page-layout', pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('key, value')
        .eq('key', `page_layout_${pageId}`);
      if (error) throw error;
      if (data && data.length > 0 && data[0].value) {
        const saved = data[0].value as unknown as PageSection[];
        const savedIds = new Set(saved.map(s => s.id));
        const merged = [...saved];
        defaultSections.forEach(def => {
          if (!savedIds.has(def.id)) merged.push({ ...def, sort_order: merged.length });
        });
        return merged.sort((a, b) => a.sort_order - b.sort_order);
      }
      return defaultSections;
    },
  });

  const saveSections = useMutation({
    mutationFn: async (newSections: PageSection[]) => {
      const ordered = newSections.map((s, i) => ({ ...s, sort_order: i }));
      const { error } = await supabase
        .from('website_settings')
        .upsert(
          { key: `page_layout_${pageId}`, value: ordered as unknown as Json, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['page-layout', pageId] }),
  });

  return {
    sections: sections || defaultSections,
    isLoading,
    saveSections,
  };
};

// Hook to save ALL page layouts at once
export const useAllPageLayouts = () => {
  const queryClient = useQueryClient();

  const { data: allLayouts, isLoading } = useQuery({
    queryKey: ['all-page-layouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('key, value')
        .like('key', 'page_layout_%');
      if (error) throw error;
      const map: Record<string, PageSection[]> = {};
      data?.forEach(row => {
        const pageId = row.key.replace('page_layout_', '');
        map[pageId] = row.value as unknown as PageSection[];
      });
      return map;
    },
  });

  const savePageLayout = useMutation({
    mutationFn: async ({ pageId, sections }: { pageId: string; sections: PageSection[] }) => {
      const ordered = sections.map((s, i) => ({ ...s, sort_order: i }));
      const { error } = await supabase
        .from('website_settings')
        .upsert(
          { key: `page_layout_${pageId}`, value: ordered as unknown as Json, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-page-layouts'] }),
  });

  return { allLayouts: allLayouts || {}, isLoading, savePageLayout };
};
