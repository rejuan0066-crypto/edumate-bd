import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';
import { Json } from '@/integrations/supabase/types';

export type AdmissionFieldConfig = {
  id: string;
  label: string;
  label_bn: string;
  field_type: string;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  default_value: string | null; // field_key
  placeholder: string | null;
  options: Json | null;
  validation: Json | null;
};

type SectionKey = 'student_details' | 'student_address' | 'parents' | 'guardian';

export const SECTION_INFO: Record<SectionKey, { en: string; bn: string; order: number }> = {
  student_details: { en: '1. Student Details', bn: '১. ছাত্রের তথ্য', order: 1 },
  student_address: { en: 'Address', bn: 'ঠিকানা', order: 2 },
  parents: { en: '2. Parents Information', bn: '২. অভিভাবকের তথ্য', order: 3 },
  guardian: { en: '3. Guardian Information', bn: '৩. অভিভাবক তথ্য', order: 4 },
};

const DEFAULT_FIELDS: Array<{
  label: string; label_bn: string; field_type: string; is_required: boolean;
  sort_order: number; default_value: string; options?: any[]; section: SectionKey;
}> = [
  // Student Details
  { label: 'Photo', label_bn: 'ছবি', field_type: 'file', is_required: false, sort_order: 1, default_value: 'photo_url', section: 'student_details' },
  { label: 'Student Type', label_bn: 'ছাত্রের ধরন', field_type: 'radio', is_required: true, sort_order: 2, default_value: 'student_type', section: 'student_details', options: ['new', 'old'] },
  { label: 'Residence Type', label_bn: 'আবাসিক ধরন', field_type: 'radio', is_required: true, sort_order: 3, default_value: 'residence_type', section: 'student_details', options: ['resident', 'non-resident'] },
  { label: 'Admission Session', label_bn: 'ভর্তি সেশন', field_type: 'text', is_required: true, sort_order: 4, default_value: 'admission_session', section: 'student_details' },
  { label: 'Roll', label_bn: 'রোল', field_type: 'text', is_required: false, sort_order: 5, default_value: 'roll_number', section: 'student_details' },
  { label: 'Registration No', label_bn: 'রেজিস্ট্রেশন নং', field_type: 'text', is_required: false, sort_order: 6, default_value: 'registration_no', section: 'student_details' },
  { label: 'Admission Date', label_bn: 'ভর্তির তারিখ', field_type: 'date', is_required: true, sort_order: 7, default_value: 'admission_date', section: 'student_details' },
  { label: 'Session Year', label_bn: 'সেশন বছর', field_type: 'text', is_required: false, sort_order: 8, default_value: 'session_year', section: 'student_details' },
  { label: 'Admission Class', label_bn: 'ভর্তি শ্রেণী', field_type: 'select', is_required: true, sort_order: 9, default_value: 'admission_class', section: 'student_details' },
  { label: 'First Name', label_bn: 'প্রথম নাম (বাংলা)', field_type: 'text', is_required: true, sort_order: 10, default_value: 'first_name', section: 'student_details' },
  { label: 'Last Name', label_bn: 'শেষ নাম (ইংরেজি)', field_type: 'text', is_required: false, sort_order: 11, default_value: 'last_name', section: 'student_details' },
  { label: 'Gender', label_bn: 'লিঙ্গ', field_type: 'select', is_required: true, sort_order: 12, default_value: 'gender', section: 'student_details', options: ['male', 'female'] },
  { label: 'Religion', label_bn: 'ধর্ম', field_type: 'select', is_required: true, sort_order: 13, default_value: 'religion', section: 'student_details', options: ['islam', 'hinduism', 'christianity', 'buddhism', 'other'] },
  { label: 'Date of Birth', label_bn: 'জন্ম তারিখ', field_type: 'date', is_required: true, sort_order: 14, default_value: 'date_of_birth', section: 'student_details' },
  { label: 'Birth Reg No (17 digits)', label_bn: 'জন্ম নিবন্ধন (১৭ ডিজিট)', field_type: 'text', is_required: true, sort_order: 15, default_value: 'birth_reg_no', section: 'student_details' },
  { label: 'Previous Class', label_bn: 'পূর্ববর্তী শ্রেণী', field_type: 'text', is_required: false, sort_order: 16, default_value: 'previous_class', section: 'student_details' },
  { label: 'Previous Institute', label_bn: 'পূর্ববর্তী প্রতিষ্ঠান', field_type: 'text', is_required: false, sort_order: 17, default_value: 'previous_institute', section: 'student_details' },
  { label: 'Orphan', label_bn: 'এতিম', field_type: 'switch', is_required: false, sort_order: 18, default_value: 'is_orphan', section: 'student_details' },
  { label: 'Poor', label_bn: 'গরীব', field_type: 'switch', is_required: false, sort_order: 19, default_value: 'is_poor', section: 'student_details' },
  // Address
  { label: 'Permanent Address', label_bn: 'স্থায়ী ঠিকানা', field_type: 'address_permanent', is_required: false, sort_order: 20, default_value: 'address_permanent', section: 'student_address' },
  { label: 'Present Address', label_bn: 'বর্তমান ঠিকানা', field_type: 'address_present', is_required: false, sort_order: 21, default_value: 'address_present', section: 'student_address' },
  // Parents
  { label: 'Father Name', label_bn: 'পিতার নাম', field_type: 'text', is_required: true, sort_order: 22, default_value: 'father_name', section: 'parents' },
  { label: 'Father Occupation', label_bn: 'পিতার পেশা', field_type: 'text', is_required: false, sort_order: 23, default_value: 'father_occupation', section: 'parents' },
  { label: 'Father NID (10/17 digits)', label_bn: 'পিতার NID (১০/১৭ ডিজিট)', field_type: 'text', is_required: false, sort_order: 24, default_value: 'father_nid', section: 'parents' },
  { label: 'Father Mobile', label_bn: 'পিতার মোবাইল', field_type: 'phone', is_required: false, sort_order: 25, default_value: 'father_phone', section: 'parents' },
  { label: 'Mother Name', label_bn: 'মাতার নাম', field_type: 'text', is_required: true, sort_order: 26, default_value: 'mother_name', section: 'parents' },
  { label: 'Mother Occupation', label_bn: 'মাতার পেশা', field_type: 'text', is_required: false, sort_order: 27, default_value: 'mother_occupation', section: 'parents' },
  { label: 'Mother NID (10/17 digits)', label_bn: 'মাতার NID (১০/১৭ ডিজিট)', field_type: 'text', is_required: false, sort_order: 28, default_value: 'mother_nid', section: 'parents' },
  { label: 'Mother Mobile', label_bn: 'মাতার মোবাইল', field_type: 'phone', is_required: false, sort_order: 29, default_value: 'mother_phone', section: 'parents' },
  // Guardian
  { label: 'Guardian Type', label_bn: 'অভিভাবক', field_type: 'select', is_required: true, sort_order: 30, default_value: 'guardian_type', section: 'guardian', options: ['father', 'mother', 'other'] },
  { label: 'Guardian Name', label_bn: 'অভিভাবকের নাম', field_type: 'text', is_required: true, sort_order: 31, default_value: 'guardian_name', section: 'guardian' },
  { label: 'Guardian Relation', label_bn: 'সম্পর্ক', field_type: 'text', is_required: true, sort_order: 32, default_value: 'guardian_relation', section: 'guardian' },
  { label: 'Guardian Mobile', label_bn: 'মোবাইল', field_type: 'phone', is_required: true, sort_order: 33, default_value: 'guardian_phone', section: 'guardian' },
  { label: 'Guardian NID (10/17 digits)', label_bn: 'অভিভাবকের NID (১০/১৭ ডিজিট)', field_type: 'text', is_required: true, sort_order: 34, default_value: 'guardian_nid', section: 'guardian' },
];

async function seedAdmissionForm() {
  const { data: form, error } = await supabase
    .from('custom_forms')
    .insert({
      name: 'Admission Form',
      name_bn: 'ভর্তি ফর্ম',
      description: 'Student admission application form - editable from Custom Builder',
      form_type: 'admission',
      is_active: true,
      publish_to: 'none',
      parent_menu: '/admin/students',
      menu_slug: 'admission-form',
    })
    .select()
    .single();

  if (error || !form) return;

  const fieldsToInsert = DEFAULT_FIELDS.map(f => ({
    form_id: form.id,
    label: f.label,
    label_bn: f.label_bn,
    field_type: f.field_type,
    is_required: f.is_required,
    sort_order: f.sort_order,
    default_value: f.default_value,
    options: (f.options || []) as unknown as Json,
    validation: { section: f.section } as unknown as Json,
    is_active: true,
    placeholder: null,
  }));

  await supabase.from('custom_form_fields').insert(fieldsToInsert);
}

export const useAdmissionFormConfig = () => {
  const seeded = useRef(false);

  const { data: formConfig, refetch, isLoading } = useQuery({
    queryKey: ['admission-form-config'],
    queryFn: async () => {
      const { data: forms } = await supabase
        .from('custom_forms')
        .select('*')
        .eq('form_type', 'admission')
        .limit(1);

      if (!forms || forms.length === 0) return null;

      const form = forms[0];
      const { data: fields } = await supabase
        .from('custom_form_fields')
        .select('*')
        .eq('form_id', form.id)
        .order('sort_order');

      return { form, fields: (fields || []) as AdmissionFieldConfig[] };
    },
  });

  useEffect(() => {
    if (formConfig === null && !seeded.current) {
      seeded.current = true;
      seedAdmissionForm().then(() => refetch());
    }
  }, [formConfig, refetch]);

  const activeFields = (formConfig?.fields || []).filter(f => f.is_active);

  const getFieldsBySection = (section: SectionKey): AdmissionFieldConfig[] => {
    return activeFields.filter(f => {
      const val = f.validation as any;
      if (val?.section) return val.section === section;
      // Fallback: match by default_value against DEFAULT_FIELDS
      const defaultDef = DEFAULT_FIELDS.find(d => d.default_value === f.default_value);
      if (defaultDef) return defaultDef.section === section;
      return false;
    }).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  };

  const isFieldActive = (fieldKey: string): boolean => {
    return activeFields.some(f => f.default_value === fieldKey);
  };

  const getField = (fieldKey: string): AdmissionFieldConfig | undefined => {
    return activeFields.find(f => f.default_value === fieldKey);
  };

  const getCustomFields = (section: SectionKey): AdmissionFieldConfig[] => {
    return getFieldsBySection(section).filter(f => {
      const knownKeys = DEFAULT_FIELDS.map(d => d.default_value);
      return !knownKeys.includes(f.default_value || '');
    });
  };

  return {
    form: formConfig?.form,
    fields: activeFields,
    isLoading,
    isLoaded: formConfig !== undefined && formConfig !== null,
    getFieldsBySection,
    isFieldActive,
    getField,
    getCustomFields,
    sections: Object.entries(SECTION_INFO)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([key]) => key as SectionKey),
  };
};
