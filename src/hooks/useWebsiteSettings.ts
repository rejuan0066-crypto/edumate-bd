export const FALLBACK_LOGO_URL = 'https://lwlqmvjdiqpstgbdsmxj.supabase.co/storage/v1/object/public/institution-logos/logos/1792938793636.jpeg';
export const DEFAULT_MADRASA_BUILDING_URL = 'https://lwlqmvjdiqpstgbdsmxj.supabase.co/storage/v1/object/public/website-assets/gallery/1792871201169-7fh81.jpeg';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface GalleryItem {
  title_bn: string;
  title_en: string;
  image_url: string;
  sort_order: number;
}

export interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

export interface HeaderStyle {
  topbar_visible: boolean;
  topbar_bg_color: string;
  topbar_text_color: string;
  topbar_announcement_bn: string;
  topbar_announcement_en: string;
  header_bg_color: string;
  header_text_color: string;
  header_border: boolean;
  header_shadow: boolean;
  header_sticky: boolean;
  logo_size: 'small' | 'medium' | 'large';
  show_institution_name: boolean;
  show_institution_name_en: boolean;
}

export interface NavStyle {
  nav_bg_color: string;
  nav_text_color: string;
  nav_active_bg: string;
  nav_active_text: string;
  nav_hover_bg: string;
  nav_style: 'pills' | 'underline' | 'flat' | 'rounded';
  nav_font_size: 'small' | 'medium' | 'large';
}

export interface FooterStyle {
  footer_bg_color: string;
  footer_text_color: string;
  show_quick_links: boolean;
  show_contact_info: boolean;
  show_social_links: boolean;
  copyright_text_bn: string;
  copyright_text_en: string;
  footer_columns: number;
}

export interface FooterLink {
  label_bn: string;
  label_en: string;
  url: string;
}

export interface InfoLink {
  id: string;
  label_bn: string;
  label_en: string;
  path: string;
  icon: string;
  visible: boolean;
  sort_order: number;
}

export interface BackgroundStyle {
  type: 'color' | 'gradient' | 'image';
  color: string;
  color_dark: string;
  gradient: string;
  gradient_dark: string;
  image_url: string;
  image_url_dark: string;
  position: string;
  size: string;
  repeat: string;
  overlay_opacity: number;
  fixed: boolean;
}

export type HomeSectionKey =
  | 'principalMessage'
  | 'banner'
  | 'adminMessage'
  | 'infoLinks'
  | 'latestNotice'
  | 'admissionButtons'
  | 'latestPosts'
  | 'gallery'
  | 'prayerCalendar'
  | 'stats'
  | 'donation'
  | 'feePayment'
  | 'classInfo'
  | 'teachersList'
  | 'studentInfo'
  | 'quran'
  | 'zakatFitra';

export interface SectionStyleConfig {
  columns: number;
  columnsTablet: number;
  columnsMobile: number;
  gap: number;
  padding: number;
  margin: number;
  width: 'full' | 'boxed';
  borderRadius: number;
  bgColor: string;
  textColor: string;
  headingFontSize: number;
  bodyFontSize: number;
  headingFontSizeMobile: number;
  bodyFontSizeMobile: number;
  headingBold: boolean;
  headingItalic: boolean;
  textAlign: 'left' | 'center' | 'right';
  fixedHeight: boolean;
  height: number;
  overflow: 'auto' | 'scroll' | 'hidden';
  scrollbarTrackColor: string;
  scrollbarThumbColor: string;
  autoScroll: boolean;
  scrollDirection: 'ltr' | 'rtl' | 'ttb' | 'btt';
  scrollSpeed: number;
  pauseOnHover: boolean;
}

export const DEFAULT_SECTION_STYLE: SectionStyleConfig = {
  columns: 1,
  columnsTablet: 1,
  columnsMobile: 1,
  gap: 16,
  padding: 24,
  margin: 0,
  width: 'boxed',
  borderRadius: 0,
  bgColor: '',
  textColor: '',
  headingFontSize: 20,
  bodyFontSize: 14,
  headingFontSizeMobile: 16,
  bodyFontSizeMobile: 13,
  headingBold: true,
  headingItalic: false,
  textAlign: 'left',
  fixedHeight: false,
  height: 400,
  overflow: 'auto',
  scrollbarTrackColor: '',
  scrollbarThumbColor: '',
  autoScroll: false,
  scrollDirection: 'rtl',
  scrollSpeed: 5,
  pauseOnHover: true,
};

export interface HomeSectionConfig {
  key: HomeSectionKey;
  visible: boolean;
  label_bn: string;
  label_en: string;
  icon: string;
  styles?: SectionStyleConfig;
}

export const ALL_SECTION_CONFIGS: HomeSectionConfig[] = [
  { key: 'principalMessage', visible: true, label_bn: 'অধ্যক্ষের বাণী', label_en: "Principal's Message", icon: '👤' },
  { key: 'banner', visible: true, label_bn: 'হিরো ব্যানার', label_en: 'Hero Banner', icon: '🖼️' },
  { key: 'adminMessage', visible: true, label_bn: 'এডমিনের বাণী', label_en: "Admin's Message", icon: '👨‍💼' },
  { key: 'infoLinks', visible: true, label_bn: 'প্রতিষ্ঠানের লিংক', label_en: 'Institution Links', icon: '🔗' },
  { key: 'latestNotice', visible: true, label_bn: 'নোটিশ বোর্ড', label_en: 'Notice Board', icon: '📋' },
  { key: 'admissionButtons', visible: true, label_bn: 'অনলাইন ভর্তি', label_en: 'Online Admission', icon: '🎓' },
  { key: 'latestPosts', visible: true, label_bn: 'সর্বশেষ সংবাদ', label_en: 'Latest News', icon: '📰' },
  { key: 'gallery', visible: true, label_bn: 'গ্যালারি', label_en: 'Gallery', icon: '📷' },
  { key: 'prayerCalendar', visible: true, label_bn: 'নামাজ ও ক্যালেন্ডার', label_en: 'Prayer & Calendar', icon: '🕌' },
  { key: 'stats', visible: true, label_bn: 'পরিসংখ্যান', label_en: 'Statistics', icon: '📊' },
  { key: 'donation', visible: false, label_bn: 'দান সেকশন', label_en: 'Donation', icon: '💝' },
  { key: 'feePayment', visible: false, label_bn: 'ফি পেমেন্ট', label_en: 'Fee Payment', icon: '💳' },
  { key: 'classInfo', visible: false, label_bn: 'শ্রেণী তথ্য', label_en: 'Class Info', icon: '📚' },
  { key: 'teachersList', visible: false, label_bn: 'শিক্ষক তালিকা', label_en: 'Teachers List', icon: '👨‍🏫' },
  { key: 'studentInfo', visible: false, label_bn: 'ছাত্র তথ্য', label_en: 'Student Info', icon: '🧑‍🎓' },
  { key: 'quran', visible: true, label_bn: 'কুরআন তিলাওয়াত', label_en: 'Quran Reading', icon: '📖' },
  { key: 'zakatFitra', visible: true, label_bn: 'যাকাত ও ফিতরা', label_en: 'Zakat & Fitra', icon: '🕋' },
];

export interface WebsiteSettings {
  institution_name: string;
  institution_name_en: string;
  address: string;
  phone: string;
  email: string;
  registration_number: string;
  established_year: string;
  logo_url: string;
  favicon_url: string;
  loader_logo_url: string;
  hero_title_bn: string;
  hero_title_en: string;
  hero_subtitle_bn: string;
  hero_subtitle_en: string;
  hero_bg_image_url: string;
  principal_name: string;
  principal_name_en: string;
  principal_title_bn: string;
  principal_title_en: string;
  principal_message_bn: string;
  principal_message_en: string;
  principal_photo_url: string;
  accountant_name: string;
  verifier_name: string;
  admin_name: string;
  admin_title_bn: string;
  admin_title_en: string;
  admin_message_bn: string;
  admin_message_en: string;
  admin_photo_url: string;
  admin_email: string;
  admin_phone: string;
  about_content_bn: string;
  about_content_en: string;
  about_mission_bn: string;
  about_mission_en: string;
  about_vision_bn: string;
  about_vision_en: string;
  about_image_url: string;
  footer_description_bn: string;
  footer_description_en: string;
  contact_map_embed: string;
  stat_students: string;
  stat_teachers: string;
  stat_years: string;
  social_links: SocialLink[];
  gallery_items: GalleryItem[];
  header_style: HeaderStyle;
  nav_style: NavStyle;
  footer_style: FooterStyle;
  footer_links: FooterLink[];
  section_order: HomeSectionConfig[];
  sections: {
    banner: boolean;
    principalMessage: boolean;
    classInfo: boolean;
    teachersList: boolean;
    studentInfo: boolean;
    latestNotice: boolean;
    latestPosts: boolean;
    admissionButtons: boolean;
    gallery: boolean;
    donation: boolean;
    feePayment: boolean;
    stats: boolean;
    prayerCalendar: boolean;
    adminMessage: boolean;
    infoLinks: boolean;
  };
  divisions: Array<{ name: string; nameEn: string; icon: string }>;
  info_links: InfoLink[];
  login_bg_image_url: string;
  login_bg_color: string;
  login_show_logo: boolean;
  login_show_institution_name: boolean;
  login_welcome_bn: string;
  login_welcome_en: string;
  login_form_bg_color: string;
  login_form_border_radius: number;
  login_form_shadow: boolean;
  login_bg_blur: number;
  login_institution_name_bn: string;
  login_institution_name_en: string;
  logo_shape: 'square' | 'rounded' | 'circle';
  favicon_shape: 'square' | 'rounded' | 'circle';
  loader_logo_shape: 'square' | 'rounded' | 'circle';
  global_footer_text_bn: string;
  global_footer_text_en: string;
  global_footer_spacing_top: number;    // mm — padding above footer on prints/PDFs
  global_footer_spacing_bottom: number; // mm — bottom margin from page edge
  global_footer_font_size: number;      // pt — footer text size on prints
  signatory_edit_super_admin_only: boolean; // when true, only super_admin can edit principal/accountant/verifier
  background_style: BackgroundStyle;
}

const DEFAULT_SETTINGS: WebsiteSettings = {
  institution_name: 'আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানা',
  institution_name_en: 'Al-Arabia Subhania Madrasah & Eyateem Khana',
  address: '',
  phone: '',
  email: '',
  registration_number: '',
  established_year: '',
  logo_url: FALLBACK_LOGO_URL,
  favicon_url: FALLBACK_LOGO_URL,
  loader_logo_url: FALLBACK_LOGO_URL,
  hero_title_bn: '',
  hero_title_en: '',
  hero_subtitle_bn: '',
  hero_subtitle_en: '',
  hero_bg_image_url: '',
  principal_name: '',
  principal_name_en: '',
  principal_title_bn: '',
  principal_title_en: '',
  principal_message_bn: '',
  principal_message_en: '',
  principal_photo_url: '',
  accountant_name: '',
  verifier_name: '',
  admin_name: '',
  admin_title_bn: '',
  admin_title_en: '',
  admin_message_bn: '',
  admin_message_en: '',
  admin_photo_url: '',
  admin_email: '',
  admin_phone: '',
  about_content_bn: '',
  about_content_en: '',
  about_mission_bn: '',
  about_mission_en: '',
  about_vision_bn: '',
  about_vision_en: '',
  about_image_url: '',
  footer_description_bn: '',
  footer_description_en: '',
  contact_map_embed: '',
  stat_students: '',
  stat_teachers: '',
  stat_years: '',
  social_links: [
    { platform: 'Facebook', url: '', icon: 'facebook' },
    { platform: 'YouTube', url: '', icon: 'youtube' },
  ],
  gallery_items: [],
  header_style: {
    topbar_visible: true,
    topbar_bg_color: '',
    topbar_text_color: '',
    topbar_announcement_bn: '',
    topbar_announcement_en: '',
    header_bg_color: '',
    header_text_color: '',
    header_border: true,
    header_shadow: true,
    header_sticky: true,
    logo_size: 'medium',
    show_institution_name: true,
    show_institution_name_en: true,
  },
  nav_style: {
    nav_bg_color: '',
    nav_text_color: '',
    nav_active_bg: '',
    nav_active_text: '',
    nav_hover_bg: '',
    nav_style: 'pills',
    nav_font_size: 'medium',
  },
  footer_style: {
    footer_bg_color: '',
    footer_text_color: '',
    show_quick_links: true,
    show_contact_info: true,
    show_social_links: true,
    copyright_text_bn: '',
    copyright_text_en: '',
    footer_columns: 3,
  },
  footer_links: [],
  section_order: ALL_SECTION_CONFIGS,
  sections: {
    banner: true,
    principalMessage: true,
    classInfo: true,
    teachersList: false,
    studentInfo: false,
    latestNotice: true,
    latestPosts: true,
    admissionButtons: true,
    gallery: true,
    donation: false,
    feePayment: false,
    stats: true,
    prayerCalendar: true,
    adminMessage: true,
    infoLinks: true,
  },
  divisions: [],
  info_links: [],
  login_bg_image_url: DEFAULT_MADRASA_BUILDING_URL,
  login_bg_color: '',
  login_show_logo: true,
  login_show_institution_name: true,
  login_welcome_bn: '',
  login_welcome_en: '',
  login_form_bg_color: '',
  login_form_border_radius: 12,
  login_form_shadow: true,
  login_bg_blur: 0,
  login_institution_name_bn: '',
  login_institution_name_en: '',
  logo_shape: 'square',
  favicon_shape: 'square',
  loader_logo_shape: 'circle',
  global_footer_text_bn: '',
  global_footer_text_en: '',
  global_footer_spacing_top: 8,
  global_footer_spacing_bottom: 6,
  global_footer_font_size: 10,
  signatory_edit_super_admin_only: false,
  background_style: {
    type: 'image',
    color: '',
    color_dark: '',
    gradient: '',
    gradient_dark: '',
    image_url: '',
    image_url_dark: '',
    position: 'center',
    size: 'cover',
    repeat: 'no-repeat',
    overlay_opacity: 12,
    fixed: true,
  },
};

const parseSettingsData = (data: any[] | null): WebsiteSettings => {
  const result = { ...DEFAULT_SETTINGS };
  data?.forEach((row) => {
    const key = row.key as keyof WebsiteSettings;
    if (key in result) {
      const defaultVal = DEFAULT_SETTINGS[key];
      let dbVal = row.value;

      if (key === 'logo_url' || key === 'favicon_url' || key === 'loader_logo_url') {
        if (!dbVal || (typeof dbVal === 'string' && dbVal.includes('wwhunyzobtuibhvkipwk'))) {
          dbVal = FALLBACK_LOGO_URL;
        }
      } else if (key === 'login_bg_image_url') {
        // If login_bg_image_url was set to madrasa logo or dead project domain, restore default madrasa building photo
        if (!dbVal || (typeof dbVal === 'string' && (dbVal.includes('wwhunyzobtuibhvkipwk') || dbVal.includes('institution-logos') || dbVal === FALLBACK_LOGO_URL))) {
          dbVal = DEFAULT_MADRASA_BUILDING_URL;
        }
      } else if (typeof dbVal === 'string' && dbVal.includes('wwhunyzobtuibhvkipwk')) {
        dbVal = typeof defaultVal === 'string' ? defaultVal : '';
      }

      if (defaultVal && typeof defaultVal === 'object' && !Array.isArray(defaultVal) && dbVal && typeof dbVal === 'object' && !Array.isArray(dbVal)) {
        (result as any)[key] = { ...defaultVal, ...(dbVal as any) };
      } else {
        (result as any)[key] = dbVal;
      }
    }
  });
  if (result.section_order) {
    const existingKeys = new Set(result.section_order.map((s: any) => s.key));
    ALL_SECTION_CONFIGS.forEach(cfg => {
      if (!existingKeys.has(cfg.key)) {
        result.section_order.push(cfg);
      }
    });
  }
  return result;
};

const CACHE_KEY = 'website-settings-cache-v8';
const CACHE_TIME_KEY = 'website-settings-cache-time-v8';

const readCache = (): WebsiteSettings | null => {
  try {
    // Purge legacy caches with stale dead domains
    if (localStorage.getItem('website-settings-cache')) localStorage.removeItem('website-settings-cache');
    if (localStorage.getItem('website-settings-cache-time')) localStorage.removeItem('website-settings-cache-time');
    if (localStorage.getItem('website-settings-cache-v5')) localStorage.removeItem('website-settings-cache-v5');
    if (localStorage.getItem('website-settings-cache-time-v5')) localStorage.removeItem('website-settings-cache-time-v5');
    if (localStorage.getItem('website-settings-cache-v6')) localStorage.removeItem('website-settings-cache-v6');
    if (localStorage.getItem('website-settings-cache-time-v6')) localStorage.removeItem('website-settings-cache-time-v6');
    if (localStorage.getItem('website-settings-cache-v7')) localStorage.removeItem('website-settings-cache-v7');
    if (localStorage.getItem('website-settings-cache-time-v7')) localStorage.removeItem('website-settings-cache-time-v7');
    if (localStorage.getItem('institution-info-cache')) localStorage.removeItem('institution-info-cache');

    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.logo_url && parsed.logo_url.includes('wwhunyzobtuibhvkipwk')) {
      parsed.logo_url = FALLBACK_LOGO_URL;
    }
    if (parsed.favicon_url && parsed.favicon_url.includes('wwhunyzobtuibhvkipwk')) {
      parsed.favicon_url = FALLBACK_LOGO_URL;
    }
    if (!parsed.login_bg_image_url || (typeof parsed.login_bg_image_url === 'string' && (parsed.login_bg_image_url.includes('wwhunyzobtuibhvkipwk') || parsed.login_bg_image_url.includes('institution-logos') || parsed.login_bg_image_url === FALLBACK_LOGO_URL))) {
      parsed.login_bg_image_url = DEFAULT_MADRASA_BUILDING_URL;
    }
    if (parsed.loader_logo_url && parsed.loader_logo_url.includes('wwhunyzobtuibhvkipwk')) {
      parsed.loader_logo_url = FALLBACK_LOGO_URL;
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return null;
  }
};

const readCacheTime = (): number => {
  try {
    const raw = localStorage.getItem(CACHE_TIME_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
};

const writeCache = (settings: WebsiteSettings) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
    localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
    // Keep the page loader's lightweight cache in sync so the madrasa logo
    // renders instantly on every subsequent visit, even if the loader itself
    // unmounts before its own effect gets a chance to write.
    const loaderLogo = settings.loader_logo_url || settings.logo_url || settings.favicon_url;
    if (loaderLogo) {
      localStorage.setItem('cached_loader_logo', loaderLogo);
      localStorage.setItem('cached_loader_logo_shape', settings.loader_logo_shape || settings.logo_shape || 'circle');
    }
    const favicon = settings.favicon_url || settings.logo_url;
    if (favicon) {
      localStorage.setItem('cached_favicon_url', favicon);
    }
  } catch {
    // ignore quota errors
  }
};

export const useWebsiteSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['website-settings'],
    queryFn: async () => {
      const [{ data, error }, { data: instData }, { data: principalRows }] = await Promise.all([
        supabase.from('website_settings').select('key, value'),
        supabase.from('institutions')
          .select('principal_name, accountant_name, verifier_name, name, name_en, address, address_en, phone, email, logo_url, registration_number, established_year')
          .eq('is_default', true).maybeSingle(),
        supabase.rpc('get_public_principal' as any),
      ]);

      const principal: any = Array.isArray(principalRows) ? principalRows[0] : principalRows;

      const applyInstitutionOverrides = (parsed: WebsiteSettings): WebsiteSettings => {
        const pick = (...vals: any[]) => {
          for (const v of vals) {
            const s = v != null ? String(v).trim() : '';
            if (s && !s.includes('wwhunyzobtuibhvkipwk')) return s;
          }
          return '';
        };
        const withPrincipal = {
          ...parsed,
          // Single source of truth: administrative officer record → institutions → website_settings
          principal_name: pick(principal?.name_bn, (instData as any)?.principal_name, parsed.principal_name),
          principal_name_en: pick(principal?.name_en, parsed.principal_name_en),
          principal_title_bn: pick(principal?.designation, parsed.principal_title_bn),
          principal_title_en: pick(parsed.principal_title_en, principal?.designation),
          principal_photo_url: pick(principal?.photo_url, parsed.principal_photo_url),
        } as WebsiteSettings;
        if (!instData) return withPrincipal;
        return {
          ...withPrincipal,
          institution_name: pick((instData as any)?.name, parsed.institution_name) || 'আল আরাবিয়া ছোবহানিয়া মাদরাসা ও এতিমখানা',
          institution_name_en: pick((instData as any)?.name_en, parsed.institution_name_en) || 'Al-Arabia Subhania Madrasah & Eyateem Khana',
          address: pick((instData as any)?.address, parsed.address),
          phone: pick((instData as any)?.phone, parsed.phone),
          email: pick((instData as any)?.email, parsed.email),
          accountant_name: pick(parsed.accountant_name, (instData as any)?.accountant_name),
          verifier_name: pick(parsed.verifier_name, (instData as any)?.verifier_name),
          logo_url: pick((instData as any)?.logo_url, parsed.logo_url) || FALLBACK_LOGO_URL,
          favicon_url: pick(parsed.favicon_url, (instData as any)?.logo_url) || FALLBACK_LOGO_URL,
          loader_logo_url: pick(parsed.loader_logo_url, (instData as any)?.logo_url) || FALLBACK_LOGO_URL,
          registration_number: pick((instData as any)?.registration_number, (instData as any)?.eiin, parsed.registration_number),
          established_year: pick((instData as any)?.established_year, parsed.established_year),
        } as WebsiteSettings;
      };


      if (error) {
        console.warn('Website settings fetch error:', error.message);
        if (error.message?.includes('JWT') || error.code === 'PGRST301' || error.code === '401') {
          const { data: retryData, error: retryError } = await supabase
            .from('website_settings')
            .select('key, value');
          if (retryError) {
            const cached = readCache();
            return cached ? applyInstitutionOverrides(cached) : cached;
          }
          const parsed = applyInstitutionOverrides(parseSettingsData(retryData));
          writeCache(parsed);
          return parsed;
        }
        throw error;
      }

      const parsed = applyInstitutionOverrides(parseSettingsData(data));
      const cached = readCache();
      writeCache(parsed);
      if (cached && JSON.stringify(cached) === JSON.stringify(parsed)) {
        return cached;
      }
      return parsed;
    },
    initialData: () => readCache() ?? undefined,
    initialDataUpdatedAt: () => readCacheTime(),
    staleTime: 10 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: true,
    retry: (failureCount, error) => {
      if (error?.message?.includes('JWT') || error?.message?.includes('401')) return failureCount < 3;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 3000),
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Json }) => {
      const { error } = await supabase
        .from('website_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      // Optimistically update cache so next load shows new value immediately
      const current = queryClient.getQueryData<WebsiteSettings>(['website-settings']) ?? readCache() ?? DEFAULT_SETTINGS;
      const updated = { ...current, [variables.key]: variables.value as any };
      queryClient.setQueryData(['website-settings'], updated);
      writeCache(updated);
      queryClient.invalidateQueries({ queryKey: ['website-settings'] });
    },
  });

  const updateMultiple = useMutation({
    mutationFn: async (updates: Array<{ key: string; value: Json }>) => {
      const rows = updates.map(u => ({ key: u.key, value: u.value, updated_at: new Date().toISOString() }));
      const { error } = await supabase
        .from('website_settings')
        .upsert(rows, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      const current = queryClient.getQueryData<WebsiteSettings>(['website-settings']) ?? readCache() ?? DEFAULT_SETTINGS;
      const updated = { ...current };
      variables.forEach(u => { (updated as any)[u.key] = u.value; });
      queryClient.setQueryData(['website-settings'], updated);
      writeCache(updated);
      queryClient.invalidateQueries({ queryKey: ['website-settings'] });
    },
  });

  return {
    settings: settings || readCache() || DEFAULT_SETTINGS,
    isLoading,
    updateSetting,
    updateMultiple,
  };
};
