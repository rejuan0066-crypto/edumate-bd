import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdmissionGuidelineAttachment {
  id: string;
  title: string;
  file_url: string;
  file_type?: string; // 'pdf' | 'doc' | 'image'
  file_size?: string;
  upload_date?: string;
}

export interface AdmissionGuidelineSection {
  id: string;
  title_bn: string;
  title_en?: string;
  content_bn: string;
  content_en?: string;
  icon?: string;
  is_active: boolean;
}

export interface AdmissionGuidelinesData {
  is_published: boolean;
  page_title_bn: string;
  page_title_en: string;
  subtitle_bn: string;
  subtitle_en: string;
  session_badge: string;
  helpline_phone: string;
  helpline_email?: string;
  sections: AdmissionGuidelineSection[];
  attachments: AdmissionGuidelineAttachment[];
}

export const DEFAULT_ADMISSION_GUIDELINES: AdmissionGuidelinesData = {
  is_published: true,
  page_title_bn: 'ভর্তি নির্দেশিকা, নীতিমালা ও তথ্যাবলী',
  page_title_en: 'Admission Guidelines, Policies & Information',
  subtitle_bn: 'আল আরাবিয়া ছোবহানিয়া মাদ্রাসায় নতুন শিক্ষাবর্ষে ভর্তির নিয়মাবলী, যোগ্যতা ও শর্তাবলী',
  subtitle_en: 'Rules, qualifications, and requirements for admission to Al Arabia Subhania Madrasah',
  session_badge: '২০২৬ শিক্ষাবর্ষ',
  helpline_phone: '01712-345678',
  helpline_email: '',
  sections: [
    {
      id: 'general-rules',
      title_bn: '১. সাধারণ ভর্তি নীতিমালা ও আচরণবিধি',
      title_en: '1. General Admission Rules & Conduct',
      content_bn: `• প্রতি শিক্ষাবর্ষের শুরুতে মাদ্রাসার অফিস কর্তৃক নির্ধারিত সময়ের মধ্যে ভর্তি কার্যক্রম সম্পন্ন করতে হবে।
• অভিভাবকসহ শিক্ষার্থীকে নির্ধারিত তারিখে মাদ্রাসায় উপস্থিত হয়ে মৌখিক/লিখিত যাচাই-বাছাইয়ে অংশগ্রহণ করতে হবে।
• সকল শিক্ষার্থীকে মাদ্রাসার নির্ধারিত ইসলামী পোশাক পরিধান ও দ্বীনি অনুশাসন কঠোরভাবে মেনে চলতে হবে।
• মোবাইল ফোন বা অপ্রয়োজনীয় ইলেকট্রনিক ডিভাইস মাদ্রাসার ক্যাম্পাসে সম্পূর্ণ নিষিদ্ধ।`,
      content_en: `• Admission must be completed within the schedule announced by the Madrasah office.
• Both the student and guardian must attend the interview/assessment on the assigned date.
• All students must adhere strictly to Islamic dress codes and Madrasah discipline.`,
      icon: 'BookOpen',
      is_active: true,
    },
    {
      id: 'eligibility',
      title_bn: '২. ভর্তির ন্যূনতম যোগ্যতা ও বয়সসীমা',
      title_en: '2. Eligibility & Age Requirements',
      content_bn: `• নুরানি বিভাগ: বয়স ৪ থেকে ৬ বছর। নতুন শিক্ষার্থীদের ক্ষেত্রে পূর্ব কোনো পড়ালেখা আবশ্যক নয়, শূন্য থেকেই সহীহভাবে পাঠদান শুরু করা হয়।
• নাজেরা ও হিফজুল কুরআন বিভাগ: সহীহ তেলাওয়াত জানা আবশ্যক। মেধা ও ধারণক্ষমতা যাচাইয়ের মাধ্যমে ভর্তি চূড়ান্ত করা হবে।
• কিতাব বিভাগ / মুতাওয়াসসিতাহ: পূর্ববর্তী ক্লাসের বোর্ড/মারকাজ পরীক্ষার ফলাফল অথবা ভর্তি পরীক্ষায় উত্তীর্ণ হওয়া বাধ্যতামূলক।`,
      content_en: `• Noorani Department: Age 4 to 6 years. No prior background needed.
• Nazera & Hifz: Accurate Quran recitation required; assessment based on memorization ability.
• Kitab / Mutawassitah: Passing the previous level certificate or entrance test required.`,
      icon: 'GraduationCap',
      is_active: true,
    },
    {
      id: 'documents',
      title_bn: '৩. ভর্তির সময় প্রয়োজনীয় কাগজপত্র',
      title_en: '3. Required Documents at Admission',
      content_bn: `• শিক্ষার্থীর অনলাইন ডিজিটাল জন্ম নিবন্ধন সনদের স্পষ্ট ফটোকপি (বাধ্যতামূলক)।
• শিক্ষার্থীর সদ্য তোলা পাসপোর্ট সাইজের ৪ কপি রঙিন ছবি।
• পিতা ও মাতা উভয়ের জাতীয় পরিচয়পত্রের (NID) ফটোকপি।
• পূর্ববর্তী শিক্ষা প্রতিষ্ঠানের ছাড়পত্র (TC) বা পরীক্ষার নম্বরপত্র (প্রযোজ্য ক্ষেত্রে)।
• রক্তের গ্রুপের প্রমাণপত্র বা মেডিকেল রিপোর্ট (যদি থাকে)।`,
      content_en: `• Digital birth certificate copy of the student.
• 4 passport-size colored photographs.
• NID photocopies of parents/guardians.
• Transfer certificate (TC) or previous mark sheet where applicable.`,
      icon: 'FileText',
      is_active: true,
    },
    {
      id: 'fees-payment',
      title_bn: '৪. ভর্তি ফি ও পরিশোধ পদ্ধতি',
      title_en: '4. Fee Structure & Payment Methods',
      content_bn: `• ভর্তি ফরম ও সেশন ফি মাদ্রাসার অনলাইন পেমেন্ট গেটওয়ে (বিকাশ/নগদ/রকেট/কার্ড) অথবা মাদ্রাসার হিসাব শাখায় জমা দেওয়া যাবে।
• এতিম, দরিদ্র ও অসচ্ছল পরিবারের মেধাবী শিক্ষার্থীদের জন্য লিল্লাহ বোর্ডিং ও বিশেষ আর্থিক ছাড়ের ব্যবস্থা রয়েছে।
• প্রতি মাসের বেতন পরবর্তী মাসের ১০ তারিখের মধ্যে পরিশোধ করার অনুরোধ করা হচ্ছে।`,
      content_en: `• Fees can be paid via online gateway (bKash/Nagad/Rocket) or at the Madrasah accounts counter.
• Financial assistance/free education available for orphans and insolvent meritorious students.`,
      icon: 'DollarSign',
      is_active: true,
    },
  ],
  attachments: []
};

const SETTING_KEY = 'admission_guidelines';

export function useAdmissionGuidelines() {
  const queryClient = useQueryClient();

  const { data: guidelines = DEFAULT_ADMISSION_GUIDELINES, isLoading, refetch } = useQuery<AdmissionGuidelinesData>({
    queryKey: ['website-admission-guidelines'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('website_settings')
          .select('value')
          .eq('key', SETTING_KEY)
          .maybeSingle();

        if (error) {
          console.warn('Error fetching admission guidelines:', error);
          return DEFAULT_ADMISSION_GUIDELINES;
        }

        if (!data || !data.value) {
          return DEFAULT_ADMISSION_GUIDELINES;
        }

        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        return {
          ...DEFAULT_ADMISSION_GUIDELINES,
          ...parsed,
          sections: Array.isArray(parsed?.sections) && parsed.sections.length > 0 ? parsed.sections : DEFAULT_ADMISSION_GUIDELINES.sections,
          attachments: Array.isArray(parsed?.attachments) ? parsed.attachments : [],
        };
      } catch (err) {
        console.warn('Fallback to default admission guidelines:', err);
        return DEFAULT_ADMISSION_GUIDELINES;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (updated: AdmissionGuidelinesData) => {
      const { data: existing } = await supabase
        .from('website_settings')
        .select('id')
        .eq('key', SETTING_KEY)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from('website_settings')
          .update({
            value: updated as any,
            updated_at: new Date().toISOString(),
          })
          .eq('key', SETTING_KEY);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('website_settings')
          .insert({
            key: SETTING_KEY,
            value: updated as any,
          });

        if (error) throw error;
      }
      return updated;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['website-admission-guidelines'], saved);
      queryClient.invalidateQueries({ queryKey: ['website-admission-guidelines'] });
      toast.success('ভর্তি নির্দেশিকা ও ফাইল সফলভাবে সংরক্ষিত হয়েছে!');
    },
    onError: (err: any) => {
      toast.error('সংরক্ষণে সমস্যা হয়েছে: ' + (err?.message || 'অজানা ত্রুটি'));
    },
  });

  return {
    guidelines,
    isLoading,
    refetch,
    saveGuidelines: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
