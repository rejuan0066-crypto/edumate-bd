import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FeeStructureItem {
  id: string;
  class_name_bn: string;
  class_name_en?: string;
  admission_fee: string;
  monthly_tuition: string;
  residential_fee?: string; // খাবার ও বোর্ডিং
  exam_fee?: string;
  other_charges?: string;
  notes?: string;
}

export interface FeeDivisionGroup {
  id: string;
  division_name_bn: string;
  division_name_en?: string;
  icon?: string;
  description_bn?: string;
  items: FeeStructureItem[];
}

export interface AdditionalExpenseItem {
  id: string;
  title_bn: string;
  title_en?: string;
  estimated_cost: string;
  frequency: string; // যেমন: বার্ষিক / এককালীন
  details_bn?: string;
}

export interface FeeStructureAttachment {
  id: string;
  title: string;
  url: string;
  file_type?: string;
  file_size?: string;
}

export interface FeeStructureData {
  page_title_bn: string;
  page_title_en: string;
  subtitle_bn: string;
  subtitle_en: string;
  session_badge: string;
  divisions: FeeDivisionGroup[];
  additional_expenses: AdditionalExpenseItem[];
  rules: string[];
  helpline_phone: string;
  helpline_email: string;
  payment_instructions_bn: string;
  attachments: FeeStructureAttachment[];
}

export const DEFAULT_FEE_STRUCTURE: FeeStructureData = {
  page_title_bn: 'ফি ও খরচ বিবরণী',
  page_title_en: 'Fee Structure & Expense Statement',
  subtitle_bn: 'জামিয়া ইসলামিয়া আরাবিয়া সুবহানিয়া মাদ্রাসার সকল বিভাগ ও শ্রেণির ভর্তি, টিউশন এবং আনুমানিক আনুষঙ্গিক খরচের পূর্ণাঙ্গ বিবরণী।',
  subtitle_en: 'Comprehensive fee structure, admission charges, tuition, boarding, and estimated expense details.',
  session_badge: 'শিক্ষাবর্ষ ২০২৬-২০২৭',
  divisions: [
    {
      id: 'nuarani',
      division_name_bn: 'নূরানি বিভাগ',
      division_name_en: 'Nuarani Department',
      icon: 'BookOpen',
      description_bn: 'শুদ্ধ কুরআন তিলাওয়াত, বুনিয়াদি ইসলামিয়াত, আরবি ও প্রাথমিক সাধারণ শিক্ষা।',
      items: [
        {
          id: 'nuarani-1',
          class_name_bn: 'নূরানি ১ম শ্রেণি',
          class_name_en: 'Nuarani 1st',
          admission_fee: '৳ ১,৫০০',
          monthly_tuition: '৳ ৬০০',
          residential_fee: '৳ ২,৫০০ (অনাবাসিকদের জন্য প্রযোজ্য নয়)',
          exam_fee: '৳ ২০০',
          notes: 'নতুন ভর্তি ফি এককালীন প্রদেয়'
        },
        {
          id: 'nuarani-2',
          class_name_bn: 'নূরানি ২য় শ্রেণি',
          class_name_en: 'Nuarani 2nd',
          admission_fee: '৳ ১,৫০০',
          monthly_tuition: '৳ ৭০০',
          residential_fee: '৳ ২,৫০০',
          exam_fee: '৳ ২০০',
          notes: 'পুরাতন ছাত্রদের সেশন নবায়ন ফি ১,০০০ টাকা'
        },
        {
          id: 'nuarani-3',
          class_name_bn: 'নূরানি ৩য় শ্রেণি',
          class_name_en: 'Nuarani 3rd',
          admission_fee: '৳ ১,৫০০',
          monthly_tuition: '৳ ৮০০',
          residential_fee: '৳ ২,৫০০',
          exam_fee: '৳ ২৫০',
          notes: 'বোর্ড সমাপনী প্রস্তুতি অন্তর্ভুক্ত'
        }
      ]
    },
    {
      id: 'hifz',
      division_name_bn: 'হিফজ বিভাগ',
      division_name_en: 'Hifz Department',
      icon: 'GraduationCap',
      description_bn: 'তাজবীদসহ হিফজুল কুরআন, আন্তর্জাতিক মানসম্পন্ন মাশক ও হুসনুত তিলাওয়াত প্রশিক্ষণ।',
      items: [
        {
          id: 'hifz-nazara',
          class_name_bn: 'হিফজ নাজেরা',
          class_name_en: 'Hifz Nazara',
          admission_fee: '৳ ২,০০০',
          monthly_tuition: '৳ ৮০০',
          residential_fee: '৳ ২,৮০০',
          exam_fee: '৳ ৩০০',
          notes: 'আবাসিক ছাত্রদের জন্য বাধ্যতামূলক তাহাজ্জুদ ও মোরাকাবা'
        },
        {
          id: 'hifz-sabak',
          class_name_bn: 'হিফজ সবক ও ৫ পারা',
          class_name_en: 'Hifz Sabak & 5 Para',
          admission_fee: '৳ ২,০০০',
          monthly_tuition: '৳ ১,০০০',
          residential_fee: '৳ ২,৮০০',
          exam_fee: '৳ ৩০০',
          notes: 'দৈনিক সবক ও আমপারা রিভিশন'
        },
        {
          id: 'hifz-takmeel',
          class_name_bn: 'হিফজ ১০-২০ পারা ও তাকমিল',
          class_name_en: 'Hifz Takmeel',
          admission_fee: '৳ ২,০০০',
          monthly_tuition: '৳ ১,২০০',
          residential_fee: '৳ ৩,০০০',
          exam_fee: '৳ ৫০০',
          notes: 'দাওর ও সমাপনী সনদপত্র সহ'
        }
      ]
    },
    {
      id: 'ebthedayee',
      division_name_bn: 'ইবতেদায়ী বিভাগ',
      division_name_en: 'Ebthedayee Department',
      icon: 'Layers',
      description_bn: 'কওমি মাদরাসা শিক্ষা বোর্ড ও ইসলামি প্রাথমিক পাঠ্যক্রম সমন্বিত শিক্ষা।',
      items: [
        {
          id: 'ebt-4',
          class_name_bn: 'ইবতেদায়ী ৪র্থ শ্রেণি',
          class_name_en: 'Ebthedayee 4th',
          admission_fee: '৳ ১,৮০০',
          monthly_tuition: '৳ ৮০০',
          residential_fee: '৳ ২,৮০০',
          exam_fee: '৳ ৩০০',
          notes: 'আরবি ব্যাকরণ ও ভাষা ভিত্তি'
        },
        {
          id: 'ebt-5',
          class_name_bn: 'ইবতেদায়ী ৫ম শ্রেণি',
          class_name_en: 'Ebthedayee 5th',
          admission_fee: '৳ ১,৮০০',
          monthly_tuition: '৳ ৯০০',
          residential_fee: '৳ ২,৮০০',
          exam_fee: '৳ ৪০০',
          notes: 'বোর্ড সমাপনী পরীক্ষা অন্তর্ভুক্ত'
        }
      ]
    },
    {
      id: 'mutawassitah',
      division_name_bn: 'মুতাওয়াসসিতাহ বিভাগ (কিতাব বিভাগ)',
      division_name_en: 'Mutawassitah Department',
      icon: 'FileText',
      description_bn: 'উচ্চতর ইসলামি জ্ঞানচর্চা, ইলমুন নাহু, ইলমুস সরফ ও ফিকহ শাস্ত্রের নিবিড় অধ্যয়ন।',
      items: [
        {
          id: 'muta-2',
          class_name_bn: 'মুতা: ২য় বর্ষ (সরফ)',
          class_name_en: 'Mutawassitah 2nd Year',
          admission_fee: '৳ ২,০০০',
          monthly_tuition: '৳ ১,০০০',
          residential_fee: '৳ ৩,০০০',
          exam_fee: '৳ ৪০০',
          notes: 'উচ্চতর সরফ শাস্ত্র'
        },
        {
          id: 'muta-3',
          class_name_bn: 'মুতা: ৩য় বর্ষ (নাহবেমীর)',
          class_name_en: 'Mutawassitah 3rd Year',
          admission_fee: '৳ ২,২০০',
          monthly_tuition: '৳ ১,১০০',
          residential_fee: '৳ ৩,০০০',
          exam_fee: '৳ ৫০০',
          notes: 'নাহবেমীর ও ফিকহুল মুয়াসসার'
        }
      ]
    }
  ],
  additional_expenses: [
    {
      id: 'exp-books',
      title_bn: 'পাঠ্যপুস্তক ও কিতাবাদি',
      title_en: 'Books & Course Materials',
      estimated_cost: '৳ ১,০০০ – ২,৫০০',
      frequency: 'বার্ষিক (শ্রেণিভেদে)',
      details_bn: 'মাদ্রাসার কিতাবখানা হতে সরাসরি ক্রয় করা যাবে অথবা নির্ধারিত তালিকা অনুযায়ী বাজার থেকে সংগ্রহ করা যাবে।'
    },
    {
      id: 'exp-uniform',
      title_bn: 'মাদ্রাসার পোশাক (জুব্বা/পায়জামা/টুপি)',
      title_en: 'Uniform & Dress Code',
      estimated_cost: '৳ ৮০০ – ১,৫০০',
      frequency: 'প্রয়োজন অনুযায়ী',
      details_bn: 'মাদ্রাসার নির্ধারিত সাদা জুব্বা ও গোল টুপি পরিধান করা বাধ্যতামূলক।'
    },
    {
      id: 'exp-card',
      title_bn: 'ডিজিটাল আইডি কার্ড ও স্টুডেন্ট ডায়েরি',
      title_en: 'Digital ID Card & Student Diary',
      estimated_cost: '৳ ১৫০ – ২৫০',
      frequency: 'বার্ষিক এককালীন',
      details_bn: 'ভর্তির সময় প্রতিষ্ঠান অফিস হতে আইডি কার্ড ও অভিভাবক যোগাযোগের একাডেমিক ডায়েরি প্রদান করা হয়।'
    }
  ],
  rules: [
    'প্রতি মাসের মাসিক বেতন পরবর্তী মাসের ১০ তারিখের মধ্যে মাদ্রাসার অনলাইন গেটওয়ে (বিকাশ/নগদ/কার্ড) অথবা মাদ্রাসার হিসাব শাখায় জমা প্রদান করতে হবে।',
    'অনলাইন পেমেন্ট সম্পন্ন হওয়ার সাথে সাথেই অভিভাবকের ফোনে নিশ্চিতকরণ এসএমএস এবং ডিজিটাল মানি রিসিট ডাউনলোড করার সুযোগ থাকবে।',
    'আবাসিক ছাত্রদের মাসিক আবাসিক ও খাবার ফি প্রতি মাসের ৫ তারিখের মধ্যে অগ্রিম পরিশোধযোগ্য।',
    'পরীক্ষার ফি সেমিস্টার বা সাময়িক পরীক্ষার অন্তত ১৫ দিন পূর্বে ক্লিয়ার করে প্রবেশপত্র (Admit Card) সংগ্রহ করতে হবে।',
    'এতিম, অসচ্ছল ও মেধাবী শিক্ষার্থীদের ক্ষেত্রে নীতিমালার আলোকে বিশেষ আর্থিক ছাড়ের সুযোগ রয়েছে। এজন্য অভিভাবককে নির্ধারিত কল্যাণ তহবিলে আবেদন করতে হবে।'
  ],
  helpline_phone: '০১৭০০-০০০০০০',
  helpline_email: 'info@subhaniabd.edu.bd',
  payment_instructions_bn: 'অনলাইনে ফি পরিশোধের জন্য উপরের "অনলাইনে ফি পরিশোধ" ট্যাবে যান অথবা মাদ্রাসার একাউন্ট শাখায় যোগাযোগ করুন।',
  attachments: []
};

const SETTING_KEY = 'fee_structure';

export function useFeeStructure() {
  const queryClient = useQueryClient();

  const { data: feeStructure = DEFAULT_FEE_STRUCTURE, isLoading, refetch } = useQuery<FeeStructureData>({
    queryKey: ['website-fee-structure'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('website_settings')
          .select('value')
          .eq('key', SETTING_KEY)
          .maybeSingle();

        if (error) {
          console.warn('Error fetching fee structure, using default:', error.message);
          return DEFAULT_FEE_STRUCTURE;
        }

        if (data?.value && typeof data.value === 'object') {
          return {
            ...DEFAULT_FEE_STRUCTURE,
            ...data.value,
            divisions: (data.value as any).divisions || DEFAULT_FEE_STRUCTURE.divisions,
            additional_expenses: (data.value as any).additional_expenses || DEFAULT_FEE_STRUCTURE.additional_expenses,
            rules: (data.value as any).rules || DEFAULT_FEE_STRUCTURE.rules,
            attachments: (data.value as any).attachments || []
          };
        }
        return DEFAULT_FEE_STRUCTURE;
      } catch (err) {
        console.error('Failed to load fee structure:', err);
        return DEFAULT_FEE_STRUCTURE;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 min cache
  });

  const saveMutation = useMutation({
    mutationFn: async (updatedData: FeeStructureData) => {
      const { data: existing } = await supabase
        .from('website_settings')
        .select('key')
        .eq('key', SETTING_KEY)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('website_settings')
          .update({
            value: updatedData as any,
            updated_at: new Date().toISOString()
          })
          .eq('key', SETTING_KEY);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('website_settings')
          .insert({
            key: SETTING_KEY,
            value: updatedData as any,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-fee-structure'] });
      toast.success('ফি ও খরচ বিবরণী সফলভাবে সংরক্ষিত হয়েছে!');
    },
    onError: (err: any) => {
      toast.error('সংরক্ষণে সমস্যা হয়েছে: ' + (err?.message || 'অজানা ত্রুটি'));
    }
  });

  return {
    feeStructure,
    isLoading,
    refetch,
    saveFeeStructure: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending
  };
}
