import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface ThemeSettings {
  primaryHue: number;
  primarySaturation: number;
  primaryLightness: number;
  accentHue: number;
  accentSaturation: number;
  accentLightness: number;
  backgroundHue: number;
  backgroundSaturation: number;
  backgroundLightness: number;
  borderRadius: number;
  fontDisplay: string;
  fontBody: string;
  sidebarDarkness: number;
  heroStyle: 'gradient' | 'solid' | 'pattern';
  cardShadow: 'none' | 'soft' | 'medium' | 'strong';
  buttonStyle: 'rounded' | 'pill' | 'sharp';
  // Admin Panel Appearance
  defaultThemeMode: 'light' | 'dark' | 'system';
  sidebarBgColor: string;
  sidebarTextColor: string;
  sidebarActiveColor: string;
  sidebarWidth: 'narrow' | 'default' | 'wide';
  sidebarIconSize: 'small' | 'medium' | 'large';
  headerBgColor: string;
  headerTextColor: string;
  headerShowBreadcrumb: boolean;
  headerShowSearch: boolean;
  headerHeight: 'compact' | 'default' | 'tall';
  cardGlassEffect: boolean;
  cardGlassBlur: number;
  cardGlassOpacity: number;
  cardBorderStyle: 'none' | 'subtle' | 'solid' | 'accent';
  // Bengali & Font Style
  fontBengali: string;
  fontDisplayWeight: string;
  fontBodyWeight: string;
  fontDisplayStyle: 'normal' | 'italic';
  fontBodyStyle: 'normal' | 'italic';
  fontBengaliWeight: string;
  fontBengaliStyle: 'normal' | 'italic';
  // Extended style options
  sidebarHoverTextColor: string;
  sidebarHoverBgColor: string;
  sidebarActiveBgColor: string;
  sidebarClickEffect: 'none' | 'scale' | 'ripple' | 'glow' | 'slide';
  sidebarStableNav: boolean;
  sidebarFontSize: 'small' | 'medium' | 'large';
  headerFontSize: 'small' | 'medium' | 'large';
  baseFontSize: number;
}

export const DEFAULT_THEME: ThemeSettings = {
  primaryHue: 152,
  primarySaturation: 55,
  primaryLightness: 28,
  accentHue: 42,
  accentSaturation: 85,
  accentLightness: 55,
  backgroundHue: 40,
  backgroundSaturation: 30,
  backgroundLightness: 98,
  borderRadius: 10,
  fontDisplay: 'Playfair Display',
  fontBody: 'Inter',
  sidebarDarkness: 12,
  heroStyle: 'gradient',
  cardShadow: 'soft',
  buttonStyle: 'rounded',
  defaultThemeMode: 'light',
  sidebarBgColor: '',
  sidebarTextColor: '',
  sidebarActiveColor: '',
  sidebarWidth: 'default',
  sidebarIconSize: 'medium',
  headerBgColor: '',
  headerTextColor: '',
  headerShowBreadcrumb: true,
  headerShowSearch: true,
  headerHeight: 'default',
  cardGlassEffect: false,
  cardGlassBlur: 8,
  cardGlassOpacity: 80,
  cardBorderStyle: 'subtle',
  fontBengali: 'Noto Sans Bengali',
  fontDisplayWeight: '700',
  fontBodyWeight: '400',
  fontDisplayStyle: 'normal',
  fontBodyStyle: 'normal',
  fontBengaliWeight: '400',
  fontBengaliStyle: 'normal',
  sidebarHoverTextColor: '',
  sidebarHoverBgColor: '',
  sidebarActiveBgColor: '',
  sidebarClickEffect: 'scale',
  sidebarStableNav: false,
  sidebarFontSize: 'medium',
  headerFontSize: 'medium',
  baseFontSize: 14,
};

export const FONT_OPTIONS = [
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Noto Sans Bengali', label: 'Noto Sans Bengali' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Lora', label: 'Lora' },
];

export const BENGALI_FONT_OPTIONS = [
  { value: 'Noto Sans Bengali', label: 'নোটো সেন্স বাংলা (Noto Sans Bengali)' },
  { value: 'Hind Siliguri', label: 'হিন্দ শিলিগুড়ি (Hind Siliguri)' },
  { value: 'Baloo Da 2', label: 'বালু দা ২ (Baloo Da 2)' },
  { value: 'Galada', label: 'গালাদা (Galada)' },
  { value: 'Anek Bangla', label: 'অনেক বাংলা (Anek Bangla)' },
  { value: 'Tiro Bangla', label: 'তিরো বাংলা (Tiro Bangla)' },
  { value: 'Noto Serif Bengali', label: 'নোটো সেরিফ বাংলা (Noto Serif Bengali)' },
];

export const FONT_WEIGHT_OPTIONS = [
  { value: '300', label: 'Light (৩০০)' },
  { value: '400', label: 'Regular (৪০০)' },
  { value: '500', label: 'Medium (৫০০)' },
  { value: '600', label: 'Semi Bold (৬০০)' },
  { value: '700', label: 'Bold (৭০০)' },
  { value: '800', label: 'Extra Bold (৮০০)' },
];

const THEME_CACHE_KEY = 'theme-settings-cache';
const readThemeCache = (): ThemeSettings => {
  try {
    const raw = localStorage.getItem(THEME_CACHE_KEY);
    if (raw) return { ...DEFAULT_THEME, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_THEME;
};

export const useThemeSettings = () => {
  const queryClient = useQueryClient();

  const { data: theme, isLoading } = useQuery({
    queryKey: ['theme-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('key, value')
        .eq('key', 'theme');

      if (error) {
        console.warn('Theme settings fetch error:', error.message);
        if (error.message?.includes('JWT') || error.code === 'PGRST301' || error.code === '401') {
          return readThemeCache();
        }
        throw error;
      }
      if (data && data.length > 0 && data[0].value) {
        const merged = { ...DEFAULT_THEME, ...(data[0].value as unknown as Partial<ThemeSettings>) };
        try { localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(merged)); } catch {}
        return merged;
      }
      return DEFAULT_THEME;
    },
    initialData: readThemeCache,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      if (error?.message?.includes('JWT') || error?.message?.includes('401')) return false;
      return failureCount < 2;
    },
  });

  const saveTheme = useMutation({
    mutationFn: async (newTheme: ThemeSettings) => {
      const { error } = await supabase
        .from('website_settings')
        .upsert({ key: 'theme', value: newTheme as unknown as Json, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('admin-sidebar-stable-nav', String(newTheme.sidebarStableNav));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-settings'] });
    },
  });

  return {
    theme: theme || DEFAULT_THEME,
    isLoading,
    saveTheme,
  };
};
