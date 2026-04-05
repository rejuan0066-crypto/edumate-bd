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

export const useThemeSettings = () => {
  const queryClient = useQueryClient();

  const { data: theme, isLoading } = useQuery({
    queryKey: ['theme-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('key, value')
        .eq('key', 'theme');

      if (error) throw error;
      if (data && data.length > 0 && data[0].value) {
        return { ...DEFAULT_THEME, ...(data[0].value as unknown as Partial<ThemeSettings>) };
      }
      return DEFAULT_THEME;
    },
  });

  const saveTheme = useMutation({
    mutationFn: async (newTheme: ThemeSettings) => {
      const { error } = await supabase
        .from('website_settings')
        .upsert({ key: 'theme', value: newTheme as unknown as Json, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
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
