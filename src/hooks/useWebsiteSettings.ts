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
  | 'studentInfo';

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
];

export interface WebsiteSettings {
  institution_name: string;
  institution_name_en: string;
  address: string;
  phone: string;
  email: string;
  logo_url: string;
  favicon_url: string;
  loader_logo_url: string;
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
}

const DEFAULT_SETTINGS: WebsiteSettings = {
  institution_name: 'আল আরাবিয়া সুবহানিয়া হাফিজিয়া মাদরাসা',
  institution_name_en: 'Al-Arabia Subhania Hafizia Madrasah',
  address: 'খাজাঞ্চি রোড, এমএইচ সেন্টার, বিশ্বনাথ, সিলেট',
  phone: '01749842401',
  email: 'info@subhania.edu.bd',
  logo_url: '',
  favicon_url: '',
  loader_logo_url: '',
  hero_title_bn: 'ইসলামিক শিক্ষার আলোকবর্তিকা',
  hero_title_en: 'Beacon of Islamic Education',
  hero_subtitle_bn: 'কুরআন ও সুন্নাহর আলোকে আদর্শ মানুষ গড়ার প্রত্যয়ে প্রতিষ্ঠিত',
  hero_subtitle_en: 'Established with the commitment to build ideal humans in the light of Quran and Sunnah',
  hero_bg_image_url: '',
  principal_name: 'মুফতি আব্দুল্লাহ',
  principal_title_bn: 'অধ্যক্ষ',
  principal_title_en: 'Principal',
  principal_message_bn: 'আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ। আমাদের মাদরাসায় আপনাকে স্বাগতম।',
  principal_message_en: 'Assalamu Alaikum Wa Rahmatullah. Welcome to our Madrasa.',
  principal_photo_url: '',
  admin_name: '',
  admin_title_bn: 'এডমিন',
  admin_title_en: 'Admin',
  admin_message_bn: '',
  admin_message_en: '',
  admin_photo_url: '',
  admin_email: '',
  admin_phone: '',
  about_content_bn: 'ইসলামিক শিক্ষা ও আধুনিক জ্ঞানের সমন্বয়ে একটি আদর্শ শিক্ষা প্রতিষ্ঠান।',
  about_content_en: 'An ideal educational institution combining Islamic education and modern knowledge.',
  about_mission_bn: 'কুরআন ও সুন্নাহর আলোকে আদর্শ মানুষ গড়ে তোলা।',
  about_mission_en: 'To build ideal human beings in the light of the Quran and Sunnah.',
  about_vision_bn: 'একটি আলোকিত সমাজ গঠনে নৈতিক ও জ্ঞানভিত্তিক শিক্ষার কেন্দ্রবিন্দু হওয়া।',
  about_vision_en: 'To be the center of moral and knowledge-based education.',
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
  divisions: [
    { name: 'হিফয বিভাগ', nameEn: 'Hifz Division', icon: '📖' },
    { name: 'নূরানী বিভাগ', nameEn: 'Nurani Division', icon: '🌟' },
    { name: 'এবতেদায়ী বিভাগ', nameEn: 'Ebtedayee Division', icon: '📚' },
    { name: 'মুতাওয়াসসিতাহ বিভাগ', nameEn: 'Mutawassitah Division', icon: '🎓' },
  ],
  info_links: [
    { id: 'officials', label_bn: 'কর্মকর্তাবৃন্দ', label_en: 'Officials', path: '/about', icon: 'Users', visible: true, sort_order: 0 },
    { id: 'staff3', label_bn: '৩য় শ্রেণির কর্মচারীবৃন্দ', label_en: 'Class 3 Staff', path: '/about', icon: 'UserCheck', visible: true, sort_order: 1 },
    { id: 'classes', label_bn: 'শ্রেণী', label_en: 'Classes', path: '/about', icon: 'BookOpen', visible: true, sort_order: 2 },
    { id: 'student-info', label_bn: 'শিক্ষার্থীদের তথ্য', label_en: 'Student Info', path: '/student-info', icon: 'GraduationCap', visible: true, sort_order: 3 },
    { id: 'syllabus', label_bn: 'সিলেবাস', label_en: 'Syllabus', path: '/about', icon: 'FileText', visible: true, sort_order: 4 },
    { id: 'routines', label_bn: 'রুটিনসমূহ', label_en: 'Routines', path: '/about', icon: 'List', visible: true, sort_order: 5 },
    { id: 'results', label_bn: 'পরীক্ষাসমূহের ফলাফল', label_en: 'Exam Results', path: '/result', icon: 'Award', visible: true, sort_order: 6 },
  ],
  login_bg_image_url: '',
  login_bg_color: '',
  login_show_logo: true,
  login_show_institution_name: true,
  login_welcome_bn: 'মাদরাসা ম্যানেজমেন্ট',
  login_welcome_en: 'Madrasa Management',
  login_form_bg_color: '',
  login_form_border_radius: 12,
  login_form_shadow: true,
  login_bg_blur: 0,
  login_institution_name_bn: '',
  login_institution_name_en: '',
  logo_shape: 'square',
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
          if (defaultVal && typeof defaultVal === 'object' && !Array.isArray(defaultVal) && dbVal && typeof dbVal === 'object' && !Array.isArray(dbVal)) {
            (result as any)[key] = { ...defaultVal, ...(dbVal as any) };
          } else {
            (result as any)[key] = dbVal;
          }
        }
      });
      // Ensure section_order has all keys
      if (result.section_order) {
        const existingKeys = new Set(result.section_order.map((s: any) => s.key));
        ALL_SECTION_CONFIGS.forEach(cfg => {
          if (!existingKeys.has(cfg.key)) {
            result.section_order.push(cfg);
          }
        });
      }
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
