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

export interface WebsiteSettings {
  institution_name: string;
  institution_name_en: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string;
  hero_title_bn: string;
  hero_title_en: string;
  hero_subtitle_bn: string;
  hero_subtitle_en: string;
  hero_bg_image_url: string;
  principal_name: string;
  principal_title_bn: string;
  principal_title_en: string;
  principal_message_bn: string;
  principal_message_en: string;
  principal_photo_url: string;
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
  sections: {
    banner: boolean;
    principalMessage: boolean;
    classInfo: boolean;
    teachersList: boolean;
    studentInfo: boolean;
    latestNotice: boolean;
    admissionButtons: boolean;
    gallery: boolean;
    donation: boolean;
    feePayment: boolean;
    stats: boolean;
  };
  divisions: Array<{ name: string; nameEn: string; icon: string }>;
}

const DEFAULT_SETTINGS: WebsiteSettings = {
  institution_name: 'আল আরাবিয়া সুবহানিয়া হাফিজিয়া মাদরাসা',
  institution_name_en: 'Al-Arabia Subhania Hafizia Madrasah',
  address: 'খাজাঞ্চি রোড, এমএইচ সেন্টার, বিশ্বনাথ, সিলেট',
  phone: '01749842401',
  email: 'info@subhania.edu.bd',
  logo_url: '',
  hero_title_bn: 'ইসলামিক শিক্ষার আলোকবর্তিকা',
  hero_title_en: 'Beacon of Islamic Education',
  hero_subtitle_bn: 'কুরআন ও সুন্নাহর আলোকে আদর্শ মানুষ গড়ার প্রত্যয়ে প্রতিষ্ঠিত',
  hero_subtitle_en: 'Established with the commitment to build ideal humans in the light of Quran and Sunnah',
  hero_bg_image_url: '',
  principal_name: 'মুফতি আব্দুল্লাহ',
  principal_title_bn: 'অধ্যক্ষ',
  principal_title_en: 'Principal',
  principal_message_bn: 'আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ। আমাদের মাদরাসায় আপনাকে স্বাগতম। আমরা বিশ্বাস করি যে, ইসলামিক শিক্ষা ও আধুনিক জ্ঞানের সমন্বয়ে একটি আদর্শ প্রজন্ম গড়ে তোলা সম্ভব।',
  principal_message_en: 'Assalamu Alaikum Wa Rahmatullah. Welcome to our Madrasa. We believe in building an ideal generation through the combination of Islamic education and modern knowledge.',
  principal_photo_url: '',
  about_content_bn: 'ইসলামিক শিক্ষা ও আধুনিক জ্ঞানের সমন্বয়ে একটি আদর্শ শিক্ষা প্রতিষ্ঠান।',
  about_content_en: 'An ideal educational institution combining Islamic education and modern knowledge.',
  about_mission_bn: 'কুরআন ও সুন্নাহর আলোকে আদর্শ মানুষ গড়ে তোলা এবং সমাজে ইসলামিক মূল্যবোধ প্রতিষ্ঠা করা।',
  about_mission_en: 'To build ideal human beings in the light of the Quran and Sunnah and to establish Islamic values in society.',
  about_vision_bn: 'একটি আলোকিত সমাজ গঠনে নৈতিক ও জ্ঞানভিত্তিক শিক্ষার কেন্দ্রবিন্দু হওয়া।',
  about_vision_en: 'To be the center of moral and knowledge-based education in building an enlightened society.',
  about_image_url: '',
  footer_description_bn: 'ইসলামিক শিক্ষা ও আধুনিক জ্ঞানের সমন্বয়ে একটি আদর্শ শিক্ষা প্রতিষ্ঠান।',
  footer_description_en: 'An ideal educational institution combining Islamic education and modern knowledge.',
  contact_map_embed: '',
  stat_students: '500+',
  stat_teachers: '50+',
  stat_years: '15+',
  social_links: [
    { platform: 'Facebook', url: '', icon: 'facebook' },
    { platform: 'YouTube', url: '', icon: 'youtube' },
  ],
  gallery_items: [
    { title_bn: 'মাদরাসা ভবন', title_en: 'Madrasah Building', image_url: '', sort_order: 1 },
    { title_bn: 'বার্ষিক সভা', title_en: 'Annual Meeting', image_url: '', sort_order: 2 },
    { title_bn: 'ক্লাসরুম', title_en: 'Classroom', image_url: '', sort_order: 3 },
    { title_bn: 'লাইব্রেরি', title_en: 'Library', image_url: '', sort_order: 4 },
  ],
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
    copyright_text_bn: '© {year} {name}। সর্বস্বত্ব সংরক্ষিত।',
    copyright_text_en: '© {year} {name}. All rights reserved.',
    footer_columns: 3,
  },
  footer_links: [
    { label_bn: 'আমাদের সম্পর্কে', label_en: 'About Us', url: '/about' },
    { label_bn: 'ভর্তি', label_en: 'Admission', url: '/admission' },
    { label_bn: 'ফলাফল', label_en: 'Result', url: '/result' },
    { label_bn: 'নোটিশ', label_en: 'Notices', url: '/notices' },
  ],
  sections: {
    banner: true,
    principalMessage: true,
    classInfo: true,
    teachersList: false,
    studentInfo: false,
    latestNotice: true,
    admissionButtons: true,
    gallery: true,
    donation: false,
    feePayment: false,
    stats: true,
  },
  divisions: [
    { name: 'হিফয বিভাগ', nameEn: 'Hifz Division', icon: '📖' },
    { name: 'নূরানী বিভাগ', nameEn: 'Nurani Division', icon: '🌟' },
    { name: 'এবতেদায়ী বিভাগ', nameEn: 'Ebtedayee Division', icon: '📚' },
    { name: 'মুতাওয়াসসিতাহ বিভাগ', nameEn: 'Mutawassitah Division', icon: '🎓' },
  ],
};

export const useWebsiteSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['website-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_settings')
        .select('key, value');
      
      if (error) throw error;
      
      const result = { ...DEFAULT_SETTINGS };
      data?.forEach((row) => {
        const key = row.key as keyof WebsiteSettings;
        if (key in result) {
          const defaultVal = DEFAULT_SETTINGS[key];
          const dbVal = row.value;
          // Deep merge object-type settings so new fields get defaults
          if (defaultVal && typeof defaultVal === 'object' && !Array.isArray(defaultVal) && dbVal && typeof dbVal === 'object' && !Array.isArray(dbVal)) {
            (result as any)[key] = { ...defaultVal, ...(dbVal as any) };
          } else {
            (result as any)[key] = dbVal;
          }
        }
      });
      return result;
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Json }) => {
      const { error } = await supabase
        .from('website_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-settings'] });
    },
  });

  return {
    settings: settings || DEFAULT_SETTINGS,
    isLoading,
    updateSetting,
    updateMultiple,
  };
};
