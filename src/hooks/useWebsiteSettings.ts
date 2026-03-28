import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

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
  principal_name: string;
  principal_title_bn: string;
  principal_title_en: string;
  principal_message_bn: string;
  principal_message_en: string;
  principal_photo_url: string;
  about_content_bn: string;
  about_content_en: string;
  footer_description_bn: string;
  footer_description_en: string;
  stat_students: string;
  stat_teachers: string;
  stat_years: string;
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
  principal_name: 'মুফতি আব্দুল্লাহ',
  principal_title_bn: 'অধ্যক্ষ',
  principal_title_en: 'Principal',
  principal_message_bn: 'আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ। আমাদের মাদরাসায় আপনাকে স্বাগতম। আমরা বিশ্বাস করি যে, ইসলামিক শিক্ষা ও আধুনিক জ্ঞানের সমন্বয়ে একটি আদর্শ প্রজন্ম গড়ে তোলা সম্ভব।',
  principal_message_en: 'Assalamu Alaikum Wa Rahmatullah. Welcome to our Madrasa. We believe in building an ideal generation through the combination of Islamic education and modern knowledge.',
  principal_photo_url: '',
  about_content_bn: 'ইসলামিক শিক্ষা ও আধুনিক জ্ঞানের সমন্বয়ে একটি আদর্শ শিক্ষা প্রতিষ্ঠান।',
  about_content_en: 'An ideal educational institution combining Islamic education and modern knowledge.',
  footer_description_bn: 'ইসলামিক শিক্ষা ও আধুনিক জ্ঞানের সমন্বয়ে একটি আদর্শ শিক্ষা প্রতিষ্ঠান।',
  footer_description_en: 'An ideal educational institution combining Islamic education and modern knowledge.',
  stat_students: '500+',
  stat_teachers: '50+',
  stat_years: '15+',
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
          (result as any)[key] = row.value;
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
