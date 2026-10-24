import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';
import { Json } from '@/integrations/supabase/types';

export type StaffFieldConfig = {
  id: string;
  label: string;
  label_bn: string;
  field_type: string;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  default_value: string | null;
  placeholder: string | null;
  options: Json | null;
  validation: Json | null;
};

type SectionKey = 'employee_details' | 'employee_address' | 'parents' | 'parent_address' | 'guardian' | 'guardian_address' | 'identifier' | 'identifier_address' | 'documents' | 'approver';

export const STAFF_SECTION_INFO: Record<SectionKey, { en: string; bn: string; order: number }> = {
  employee_details: { en: '1. Employee Details', bn: '১. ব্যক্তিগত তথ্য', order: 1 },
  employee_address: { en: 'Address', bn: 'ঠিকানা', order: 2 },
  parents: { en: '2. Parents Information', bn: '২. পিতা-মাতার তথ্য', order: 3 },
  parent_address: { en: 'Parent Address', bn: 'পিতা-মাতার ঠিকানা', order: 4 },
  guardian: { en: '3. Guardian Information', bn: '৩. অভিভাবক তথ্য', order: 5 },
  guardian_address: { en: 'Guardian Address', bn: 'অভিভাবকের ঠিকানা', order: 6 },
  identifier: { en: '4. Identifier Information', bn: '৪. পরিচয়দাতার তথ্য', order: 7 },
  identifier_address: { en: 'Identifier Address', bn: 'পরিচয়দাতার ঠিকানা', order: 8 },
  documents: { en: '5. Documents', bn: '৫. ডকুমেন্টস', order: 9 },
  approver: { en: '6. Approver', bn: '৬. অনুমোদনকারী', order: 10 },
};

const DEFAULT_FIELDS: Array<{
  label: string; label_bn: string; field_type: string; is_required: boolean;
  sort_order: number; default_value: string; options?: any[]; section: SectionKey;
}> = [
  // Employee Details
  { label: 'Photo', label_bn: 'ছবি', field_type: 'file', is_required: false, sort_order: 1, default_value: 'photo_url', section: 'employee_details' },
  { label: 'Full Name (Bangla)', label_bn: 'সম্পুর্ণ নাম (বাংলা)', field_type: 'text', is_required: true, sort_order: 2, default_value: 'first_name', section: 'employee_details' },
  { label: 'Full Name (English)', label_bn: 'সম্পুর্ণ নাম (ইংরেজি)', field_type: 'text', is_required: true, sort_order: 3, default_value: 'last_name', section: 'employee_details' },
  { label: 'Email', label_bn: 'ইমেইল', field_type: 'email', is_required: false, sort_order: 4, default_value: 'email', section: 'employee_details' },
  { label: 'Salary', label_bn: 'বেতন', field_type: 'number', is_required: true, sort_order: 5, default_value: 'salary', section: 'employee_details' },
  { label: 'Mobile', label_bn: 'মোবাইল', field_type: 'phone', is_required: true, sort_order: 6, default_value: 'mobile', section: 'employee_details' },
  { label: 'Employment Type', label_bn: 'চাকরির ধরন', field_type: 'radio', is_required: true, sort_order: 7, default_value: 'employment_type', section: 'employee_details', options: ['full_time', 'part_time'] },
  { label: 'Designation', label_bn: 'পদবী', field_type: 'select', is_required: true, sort_order: 8, default_value: 'designation', section: 'employee_details' },
  { label: 'Residence Type', label_bn: 'আবাসিক ধরন', field_type: 'radio', is_required: true, sort_order: 9, default_value: 'residence_type', section: 'employee_details', options: ['residential', 'non-residential'] },
  { label: 'Date of Birth', label_bn: 'জন্ম তারিখ', field_type: 'date', is_required: true, sort_order: 10, default_value: 'dob', section: 'employee_details' },
  { label: 'Religion', label_bn: 'ধর্ম', field_type: 'select', is_required: true, sort_order: 11, default_value: 'religion', section: 'employee_details', options: ['islam', 'hinduism', 'christianity', 'buddhism', 'other'] },
  { label: 'Marital Status', label_bn: 'বৈবাহিক অবস্থা', field_type: 'select', is_required: false, sort_order: 11.5, default_value: 'marital_status', section: 'employee_details', options: ['unmarried', 'married'] },
  { label: 'NID (10/17 digits)', label_bn: 'NID (১০/১৭ ডিজিট)', field_type: 'text', is_required: true, sort_order: 12, default_value: 'nid', section: 'employee_details' },
  { label: 'Education', label_bn: 'শিক্ষাগত যোগ্যতা', field_type: 'text', is_required: true, sort_order: 13, default_value: 'education', section: 'employee_details' },
  { label: 'Experience', label_bn: 'অভিজ্ঞতা', field_type: 'text', is_required: false, sort_order: 14, default_value: 'experience', section: 'employee_details' },
  { label: 'Previous Institute', label_bn: 'পূর্ববর্তী কর্মস্থল', field_type: 'text', is_required: false, sort_order: 15, default_value: 'prev_institute', section: 'employee_details' },
  // Address
  { label: 'Permanent Address', label_bn: 'স্থায়ী ঠিকানা', field_type: 'address_permanent', is_required: false, sort_order: 16, default_value: 'address_permanent', section: 'employee_address' },
  { label: 'Present Address', label_bn: 'বর্তমান ঠিকানা', field_type: 'address_present', is_required: false, sort_order: 17, default_value: 'address_present', section: 'employee_address' },
  // Parents
  { label: 'Father Name', label_bn: 'পিতার নাম', field_type: 'text', is_required: true, sort_order: 18, default_value: 'father_name', section: 'parents' },
  { label: 'Father Mobile', label_bn: 'পিতার মোবাইল', field_type: 'phone', is_required: false, sort_order: 19, default_value: 'father_mobile', section: 'parents' },
  { label: 'Father NID', label_bn: 'পিতার NID', field_type: 'text', is_required: false, sort_order: 20, default_value: 'father_nid', section: 'parents' },
  { label: 'Father Occupation', label_bn: 'পিতার পেশা', field_type: 'text', is_required: true, sort_order: 21, default_value: 'father_occupation', section: 'parents' },
  { label: 'Mother Name', label_bn: 'মাতার নাম', field_type: 'text', is_required: false, sort_order: 22, default_value: 'mother_name', section: 'parents' },
  { label: 'Mother Mobile', label_bn: 'মাতার মোবাইল', field_type: 'phone', is_required: false, sort_order: 23, default_value: 'mother_mobile', section: 'parents' },
  { label: 'Mother NID', label_bn: 'মাতার NID', field_type: 'text', is_required: false, sort_order: 24, default_value: 'mother_nid', section: 'parents' },
  { label: 'Mother Occupation', label_bn: 'মাতার পেশা', field_type: 'text', is_required: false, sort_order: 25, default_value: 'mother_occupation', section: 'parents' },
  // Parent Address
  { label: 'Parent Permanent Address', label_bn: 'পিতা-মাতার স্থায়ী ঠিকানা', field_type: 'address_permanent', is_required: false, sort_order: 26, default_value: 'parent_address_permanent', section: 'parent_address' },
  { label: 'Parent Present Address', label_bn: 'পিতা-মাতার বর্তমান ঠিকানা', field_type: 'address_present', is_required: false, sort_order: 27, default_value: 'parent_address_present', section: 'parent_address' },
  // Guardian
  { label: 'Guardian Type', label_bn: 'অভিভাবক', field_type: 'select', is_required: true, sort_order: 28, default_value: 'guardian_type', section: 'guardian', options: ['father', 'mother', 'other'] },
  { label: 'Guardian Name', label_bn: 'অভিভাবকের নাম', field_type: 'text', is_required: false, sort_order: 29, default_value: 'guardian_name', section: 'guardian' },
  { label: 'Guardian Relation', label_bn: 'সম্পর্ক', field_type: 'text', is_required: false, sort_order: 30, default_value: 'guardian_relation', section: 'guardian' },
  { label: 'Guardian Mobile', label_bn: 'অভিভাবকের মোবাইল', field_type: 'phone', is_required: false, sort_order: 31, default_value: 'guardian_mobile', section: 'guardian' },
  { label: 'Guardian NID', label_bn: 'অভিভাবকের NID', field_type: 'text', is_required: false, sort_order: 32, default_value: 'guardian_nid', section: 'guardian' },
  // Guardian Address
  { label: 'Guardian Permanent Address', label_bn: 'অভিভাবকের স্থায়ী ঠিকানা', field_type: 'address_permanent', is_required: false, sort_order: 33, default_value: 'guardian_address_permanent', section: 'guardian_address' },
  { label: 'Guardian Present Address', label_bn: 'অভিভাবকের বর্তমান ঠিকানা', field_type: 'address_present', is_required: false, sort_order: 34, default_value: 'guardian_address_present', section: 'guardian_address' },
  // Identifier
  { label: 'Identifier Name', label_bn: 'পরিচয়দাতার নাম', field_type: 'text', is_required: true, sort_order: 35, default_value: 'identifier_name', section: 'identifier' },
  { label: 'Identifier Relation', label_bn: 'সম্পর্ক', field_type: 'text', is_required: true, sort_order: 36, default_value: 'identifier_relation', section: 'identifier' },
  { label: 'Identifier Mobile', label_bn: 'পরিচয়দাতার মোবাইল', field_type: 'phone', is_required: true, sort_order: 37, default_value: 'identifier_mobile', section: 'identifier' },
  { label: 'Identifier NID', label_bn: 'পরিচয়দাতার NID', field_type: 'text', is_required: true, sort_order: 38, default_value: 'identifier_nid', section: 'identifier' },
  // Identifier Address
  { label: 'Identifier Address', label_bn: 'পরিচয়দাতার ঠিকানা', field_type: 'address_permanent', is_required: false, sort_order: 39, default_value: 'identifier_address', section: 'identifier_address' },
  // Documents
  { label: 'Documents', label_bn: 'ডকুমেন্টস', field_type: 'file', is_required: false, sort_order: 40, default_value: 'documents', section: 'documents' },
  // Approver
  { label: 'Approver Name', label_bn: 'অনুমোদনকারীর নাম', field_type: 'text', is_required: false, sort_order: 41, default_value: 'approver_name', section: 'approver' },
  { label: 'Approver Designation', label_bn: 'অনুমোদনকারীর পদবী', field_type: 'text', is_required: false, sort_order: 42, default_value: 'approver_designation', section: 'approver' },
  { label: 'Approver Date', label_bn: 'তারিখ', field_type: 'date', is_required: false, sort_order: 43, default_value: 'approver_date', section: 'approver' },
  { label: 'Approver Signature', label_bn: 'স্বাক্ষর', field_type: 'file', is_required: false, sort_order: 44, default_value: 'approver_signature', section: 'approver' },
];

async function seedStaffForm() {
  const { data: form, error } = await supabase
    .from('custom_forms')
    .insert({
      name: 'Staff/Teacher Form',
      name_bn: 'কর্মী/শিক্ষক ফর্ম',
      description: 'Staff and teacher information form - editable from Custom Builder',
      form_type: 'staff',
      is_active: true,
      publish_to: 'none',
      parent_menu: '/admin/staff',
      menu_slug: 'staff-form',
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

const pickPreferredStaffForm = (forms: Array<any>) => {
  return forms.find(form => form.menu_slug === 'staff-form')
    || forms.find(form => form.parent_menu === '/admin/staff')
    || forms.find(form => form.is_active)
    || forms[0]
    || null;
};

export const useStaffFormConfig = () => {
  const seeded = useRef(false);

  const { data: formConfig, refetch, isLoading } = useQuery({
    queryKey: ['staff-form-config'],
    queryFn: async () => {
      const { data: forms } = await supabase
        .from('custom_forms')
        .select('*')
        .eq('form_type', 'staff')
        .order('created_at', { ascending: true });

      if (!forms || forms.length === 0) return null;

      const form = pickPreferredStaffForm(forms);
      if (!form) return null;

      const { data: fields } = await supabase
        .from('custom_form_fields')
        .select('*')
        .eq('form_id', form.id)
        .order('sort_order');

      return { form, fields: (fields || []) as StaffFieldConfig[] };
    },
  });

  useEffect(() => {
    if (formConfig === null && !seeded.current) {
      seeded.current = true;
      seedStaffForm().then(() => refetch());
    }
  }, [formConfig, refetch]);

  const activeFields = (formConfig?.fields || []).filter(f => f.is_active);

  const getFieldsBySection = (section: SectionKey): StaffFieldConfig[] => {
    return activeFields.filter(f => {
      const val = f.validation as any;
      if (val?.section) return val.section === section;
      const defaultDef = DEFAULT_FIELDS.find(d => d.default_value === f.default_value);
      if (defaultDef) return defaultDef.section === section;
      return false;
    }).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  };

  const isFieldActive = (fieldKey: string): boolean => {
    const existing = formConfig?.fields?.find(f => f.default_value === fieldKey);
    if (existing) return existing.is_active;
    return DEFAULT_FIELDS.some(d => d.default_value === fieldKey);
  };

  const getField = (fieldKey: string): StaffFieldConfig | undefined => {
    return activeFields.find(f => f.default_value === fieldKey);
  };

  const isFieldRequired = (fieldKey: string): boolean => {
    const field = activeFields.find(f => f.default_value === fieldKey);
    if (!field) return false;
    return field.is_required;
  };

  return {
    form: formConfig?.form,
    fields: activeFields,
    isLoading,
    isLoaded: formConfig !== undefined && formConfig !== null,
    getFieldsBySection,
    isFieldActive,
    getField,
    isFieldRequired,
    sections: Object.entries(STAFF_SECTION_INFO)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([key]) => key as SectionKey),
  };
};
