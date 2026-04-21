// Schema definitions for bulk import (Students, Staff, Donors, Fee Payments)
import { supabase } from '@/integrations/supabase/client';

export type FieldType = 'text' | 'number' | 'date' | 'email' | 'phone' | 'enum' | 'uuid-lookup';

export interface ImportField {
  key: string;            // DB column name
  label_bn: string;
  label_en: string;
  type: FieldType;
  required?: boolean;
  enumValues?: string[];
  example?: string;
  // For uuid-lookup: table to look up by name
  lookupTable?: string;
  lookupCols?: string[];  // columns to match on (e.g., name_bn, name_en)
}

export interface ImportSchema {
  key: 'students' | 'staff' | 'donors' | 'fee_payments';
  table: string;
  label_bn: string;
  label_en: string;
  description_bn: string;
  fields: ImportField[];
  // Generate sample row
  sample: Record<string, any>;
}

export const IMPORT_SCHEMAS: ImportSchema[] = [
  {
    key: 'students',
    table: 'students',
    label_bn: 'ছাত্র/ছাত্রী',
    label_en: 'Students',
    description_bn: 'ভর্তি ফরমের সকল ফিল্ড সহ ছাত্রদের তালিকা একসাথে আপলোড করুন',
    fields: [
      // === Admission / Identification ===
      { key: 'student_id', label_bn: 'শিক্ষার্থী আইডি', label_en: 'Student ID', type: 'text', required: true, example: 'STU-2026-001' },
      { key: 'roll_number', label_bn: 'রোল নম্বর', label_en: 'Roll Number', type: 'text', example: '1001' },
      { key: 'registration_no', label_bn: 'রেজিস্ট্রেশন নম্বর', label_en: 'Registration No.', type: 'text', example: 'REG-2026-1001' },
      { key: 'admission_date', label_bn: 'ভর্তির তারিখ', label_en: 'Admission Date', type: 'date', example: '2026-01-01' },
      { key: 'admission_session', label_bn: 'ভর্তি সেশন', label_en: 'Admission Session', type: 'text', example: '2026' },
      { key: 'session_year', label_bn: 'সেশন বছর', label_en: 'Session Year', type: 'text', example: '2026' },
      { key: 'session_name', label_bn: 'একাডেমিক সেশন (নাম)', label_en: 'Academic Session (Name)', type: 'uuid-lookup', lookupTable: 'academic_sessions', lookupCols: ['name', 'name_bn'], example: '2026' },
      { key: 'class_name', label_bn: 'শ্রেণী (নাম)', label_en: 'Class (Name)', type: 'uuid-lookup', lookupTable: 'classes', lookupCols: ['name', 'name_bn'], example: 'Class 6' },
      { key: 'previous_class', label_bn: 'পূর্ববর্তী শ্রেণী', label_en: 'Previous Class', type: 'text', example: 'Class 5' },
      { key: 'previous_institute', label_bn: 'পূর্ববর্তী প্রতিষ্ঠান', label_en: 'Previous Institute', type: 'text' },

      // === Personal Info ===
      { key: 'name_bn', label_bn: 'নাম (বাংলা)', label_en: 'Name (Bengali)', type: 'text', required: true, example: 'মোঃ রাহিম উদ্দিন' },
      { key: 'name_en', label_bn: 'নাম (ইংরেজি)', label_en: 'Name (English)', type: 'text', example: 'Md. Rahim Uddin' },
      { key: 'gender', label_bn: 'লিঙ্গ', label_en: 'Gender', type: 'enum', enumValues: ['male', 'female', 'other'], example: 'male' },
      { key: 'religion', label_bn: 'ধর্ম', label_en: 'Religion', type: 'text', example: 'islam' },
      { key: 'date_of_birth', label_bn: 'জন্ম তারিখ', label_en: 'Date of Birth', type: 'date', example: '2010-05-15' },
      { key: 'birth_reg_no', label_bn: 'জন্ম নিবন্ধন নম্বর', label_en: 'Birth Reg. No.', type: 'text', example: '12345678901234567' },
      { key: 'student_category', label_bn: 'ছাত্র ক্যাটাগরি', label_en: 'Student Category', type: 'text', example: 'general' },
      { key: 'residence_type', label_bn: 'আবাসিক/অনাবাসিক', label_en: 'Residence Type', type: 'enum', enumValues: ['resident', 'non-resident'], example: 'non-resident' },
      { key: 'photo_url', label_bn: 'ছবির URL', label_en: 'Photo URL', type: 'text' },

      // === Contact ===
      { key: 'phone', label_bn: 'ফোন', label_en: 'Phone', type: 'phone', example: '01712345678' },
      { key: 'email', label_bn: 'ইমেইল', label_en: 'Email', type: 'email' },
      { key: 'address', label_bn: 'ঠিকানা', label_en: 'Address', type: 'text', example: 'গ্রাম: ক, ডাকঘর: খ, উপজেলা: গ, জেলা: ঘ' },

      // === Father Info ===
      { key: 'father_name', label_bn: 'পিতার নাম (বাংলা)', label_en: 'Father Name (Bengali)', type: 'text', example: 'মোঃ করিম উদ্দিন' },
      { key: 'father_name_en', label_bn: 'পিতার নাম (ইংরেজি)', label_en: 'Father Name (English)', type: 'text', example: 'Md. Karim Uddin' },
      { key: 'father_occupation', label_bn: 'পিতার পেশা', label_en: 'Father Occupation', type: 'text', example: 'কৃষক' },
      { key: 'father_nid', label_bn: 'পিতার এনআইডি', label_en: 'Father NID', type: 'text', example: '1234567890' },
      { key: 'father_phone', label_bn: 'পিতার ফোন', label_en: 'Father Phone', type: 'phone', example: '01712345678' },

      // === Mother Info ===
      { key: 'mother_name', label_bn: 'মাতার নাম (বাংলা)', label_en: 'Mother Name (Bengali)', type: 'text', example: 'মোছাঃ ফাতেমা বেগম' },
      { key: 'mother_name_en', label_bn: 'মাতার নাম (ইংরেজি)', label_en: 'Mother Name (English)', type: 'text', example: 'Mosa. Fatema Begum' },
      { key: 'mother_occupation', label_bn: 'মাতার পেশা', label_en: 'Mother Occupation', type: 'text', example: 'গৃহিণী' },
      { key: 'mother_nid', label_bn: 'মাতার এনআইডি', label_en: 'Mother NID', type: 'text' },

      // === Guardian Info ===
      { key: 'guardian_phone', label_bn: 'অভিভাবকের ফোন', label_en: 'Guardian Phone', type: 'phone', example: '01812345678' },

      // === Status ===
      { key: 'status', label_bn: 'স্ট্যাটাস', label_en: 'Status', type: 'enum', enumValues: ['active', 'inactive', 'pending'], example: 'active' },
      { key: 'is_free', label_bn: 'ফ্রি ছাত্র', label_en: 'Is Free', type: 'enum', enumValues: ['true', 'false'], example: 'false' },
    ],
    sample: {
      student_id: 'STU-2026-001',
      roll_number: '1001',
      registration_no: 'REG-2026-1001',
      admission_date: '2026-01-01',
      admission_session: '2026',
      session_year: '2026',
      session_name: '2026',
      class_name: 'Class 6',
      previous_class: 'Class 5',
      previous_institute: '',
      name_bn: 'মোঃ রাহিম উদ্দিন',
      name_en: 'Md. Rahim Uddin',
      gender: 'male',
      religion: 'islam',
      date_of_birth: '2010-05-15',
      birth_reg_no: '12345678901234567',
      student_category: 'general',
      residence_type: 'non-resident',
      photo_url: '',
      phone: '01712345678',
      email: '',
      address: 'গ্রাম: ক, ডাকঘর: খ, উপজেলা: গ, জেলা: ঘ',
      father_name: 'মোঃ করিম উদ্দিন',
      father_name_en: 'Md. Karim Uddin',
      father_occupation: 'কৃষক',
      father_nid: '1234567890',
      father_phone: '01712345678',
      mother_name: 'মোছাঃ ফাতেমা বেগম',
      mother_name_en: 'Mosa. Fatema Begum',
      mother_occupation: 'গৃহিণী',
      mother_nid: '',
      guardian_phone: '01812345678',
      status: 'active',
      is_free: 'false',
    },
  },
  {
    key: 'staff',
    table: 'staff',
    label_bn: 'স্টাফ/শিক্ষক',
    label_en: 'Staff/Teachers',
    description_bn: 'স্টাফ ফরমের সকল ফিল্ড সহ শিক্ষক/কর্মচারীদের তালিকা একসাথে যোগ করুন',
    fields: [
      // === Identification ===
      { key: 'name_bn', label_bn: 'নাম (বাংলা)', label_en: 'Name (Bengali)', type: 'text', required: true, example: 'মোঃ আবু সাঈদ' },
      { key: 'name_en', label_bn: 'নাম (ইংরেজি)', label_en: 'Name (English)', type: 'text', example: 'Md. Abu Said' },
      { key: 'staff_category', label_bn: 'ক্যাটাগরি', label_en: 'Category', type: 'enum', required: true, enumValues: ['teacher', 'administrative', 'support', 'general'], example: 'teacher' },
      { key: 'designation', label_bn: 'পদবি', label_en: 'Designation', type: 'text', example: 'সহকারী শিক্ষক' },
      { key: 'department', label_bn: 'বিভাগ', label_en: 'Department', type: 'text', example: 'গণিত' },

      // === Personal ===
      { key: 'date_of_birth', label_bn: 'জন্ম তারিখ', label_en: 'Date of Birth', type: 'date', example: '1985-01-10' },
      { key: 'religion', label_bn: 'ধর্ম', label_en: 'Religion', type: 'text', example: 'islam' },
      { key: 'nid', label_bn: 'এনআইডি', label_en: 'NID', type: 'text', example: '1234567890' },
      { key: 'photo_url', label_bn: 'ছবির URL', label_en: 'Photo URL', type: 'text' },

      // === Contact ===
      { key: 'phone', label_bn: 'ফোন', label_en: 'Phone', type: 'phone', example: '01712345678' },
      { key: 'email', label_bn: 'ইমেইল', label_en: 'Email', type: 'email', example: 'said@example.com' },
      { key: 'address', label_bn: 'ঠিকানা', label_en: 'Address', type: 'text', example: 'ঢাকা' },

      // === Employment ===
      { key: 'joining_date', label_bn: 'যোগদান তারিখ', label_en: 'Joining Date', type: 'date', example: '2020-01-01' },
      { key: 'employment_type', label_bn: 'চাকরির ধরন', label_en: 'Employment Type', type: 'enum', enumValues: ['full_time', 'part_time', 'contract'], example: 'full_time' },
      { key: 'residence_type', label_bn: 'আবাসিক ধরন', label_en: 'Residence Type', type: 'enum', enumValues: ['residential', 'non_residential'], example: 'non_residential' },
      { key: 'duty_start_time', label_bn: 'ডিউটি শুরু', label_en: 'Duty Start', type: 'text', example: '08:00' },
      { key: 'duty_end_time', label_bn: 'ডিউটি শেষ', label_en: 'Duty End', type: 'text', example: '17:00' },

      // === Qualification & Career ===
      { key: 'education', label_bn: 'শিক্ষাগত যোগ্যতা', label_en: 'Education', type: 'text', example: 'M.A.' },
      { key: 'experience', label_bn: 'অভিজ্ঞতা', label_en: 'Experience', type: 'text', example: '৫ বছর' },
      { key: 'previous_institute', label_bn: 'পূর্ববর্তী প্রতিষ্ঠান', label_en: 'Previous Institute', type: 'text' },

      // === Salary & Status ===
      { key: 'salary', label_bn: 'বেতন', label_en: 'Salary', type: 'number', example: '25000' },
      { key: 'status', label_bn: 'স্ট্যাটাস', label_en: 'Status', type: 'enum', enumValues: ['active', 'inactive', 'pending'], example: 'active' },
    ],
    sample: {
      name_bn: 'মোঃ আবু সাঈদ',
      name_en: 'Md. Abu Said',
      staff_category: 'teacher',
      designation: 'সহকারী শিক্ষক',
      department: 'গণিত',
      date_of_birth: '1985-01-10',
      religion: 'islam',
      nid: '1234567890',
      photo_url: '',
      phone: '01712345678',
      email: 'said@example.com',
      address: 'ঢাকা',
      joining_date: '2020-01-01',
      employment_type: 'full_time',
      residence_type: 'non_residential',
      duty_start_time: '08:00',
      duty_end_time: '17:00',
      education: 'M.A.',
      experience: '৫ বছর',
      previous_institute: '',
      salary: '25000',
      status: 'active',
    },
  },
  {
    key: 'donors',
    table: 'donors',
    label_bn: 'দাতা',
    label_en: 'Donors',
    description_bn: 'দাতাদের তালিকা ও দানের ইতিহাস ইমপোর্ট করুন',
    fields: [
      { key: 'name_bn', label_bn: 'নাম (বাংলা)', label_en: 'Name (Bengali)', type: 'text', required: true, example: 'হাজী মোঃ রহমত আলী' },
      { key: 'name_en', label_bn: 'নাম (ইংরেজি)', label_en: 'Name (English)', type: 'text' },
      { key: 'phone', label_bn: 'ফোন', label_en: 'Phone', type: 'phone', example: '01712345678' },
      { key: 'email', label_bn: 'ইমেইল', label_en: 'Email', type: 'email' },
      { key: 'address', label_bn: 'ঠিকানা', label_en: 'Address', type: 'text' },
      { key: 'donation_amount', label_bn: 'দানের পরিমাণ', label_en: 'Amount', type: 'number', example: '5000' },
      { key: 'donation_date', label_bn: 'দানের তারিখ', label_en: 'Date', type: 'date', example: '2026-01-15' },
      { key: 'donation_type', label_bn: 'দানের ধরন', label_en: 'Donation Type', type: 'text', example: 'Cash' },
      { key: 'purpose', label_bn: 'উদ্দেশ্য', label_en: 'Purpose', type: 'text', example: 'মসজিদ নির্মাণ' },
      { key: 'status', label_bn: 'স্ট্যাটাস', label_en: 'Status', type: 'enum', enumValues: ['active', 'inactive'], example: 'active' },
      { key: 'notes', label_bn: 'মন্তব্য', label_en: 'Notes', type: 'text' },
    ],
    sample: {
      name_bn: 'হাজী মোঃ রহমত আলী',
      name_en: 'Haji Md. Rahmat Ali',
      phone: '01712345678',
      email: 'rahmat@example.com',
      address: 'ঢাকা',
      donation_amount: '5000',
      donation_date: '2026-01-15',
      donation_type: 'Cash',
      purpose: 'মসজিদ নির্মাণ',
      status: 'active',
      notes: '',
    },
  },
  {
    key: 'fee_payments',
    table: 'fee_payments',
    label_bn: 'ফি কালেকশন',
    label_en: 'Fee Payments',
    description_bn: 'পুরাতন ফি পেমেন্ট হিস্ট্রি ইমপোর্ট করুন',
    fields: [
      { key: 'student_id_text', label_bn: 'শিক্ষার্থী আইডি', label_en: 'Student ID', type: 'text', required: true, example: 'STU-2026-001' },
      { key: 'fee_type_name', label_bn: 'ফি ধরন (নাম)', label_en: 'Fee Type Name', type: 'uuid-lookup', required: true, lookupTable: 'fee_types', lookupCols: ['name', 'name_bn'], example: 'মাসিক বেতন' },
      { key: 'amount', label_bn: 'পরিমাণ', label_en: 'Amount', type: 'number', required: true, example: '1500' },
      { key: 'paid_amount', label_bn: 'পরিশোধিত', label_en: 'Paid Amount', type: 'number', example: '1500' },
      { key: 'month', label_bn: 'মাস', label_en: 'Month', type: 'text', example: 'January' },
      { key: 'year', label_bn: 'বছর', label_en: 'Year', type: 'number', example: '2026' },
      { key: 'status', label_bn: 'স্ট্যাটাস', label_en: 'Status', type: 'enum', enumValues: ['paid', 'pending', 'partial'], example: 'paid' },
      { key: 'paid_at', label_bn: 'পরিশোধের তারিখ', label_en: 'Paid Date', type: 'date', example: '2026-01-10' },
      { key: 'receipt_number', label_bn: 'রসিদ নম্বর', label_en: 'Receipt No.', type: 'text', example: 'SL-2026-0001' },
      { key: 'collected_by', label_bn: 'গ্রহণকারী', label_en: 'Collected By', type: 'text' },
    ],
    sample: {
      student_id_text: 'STU-2026-001',
      fee_type_name: 'মাসিক বেতন',
      amount: '1500',
      paid_amount: '1500',
      month: 'January',
      year: '2026',
      status: 'paid',
      paid_at: '2026-01-10',
      receipt_number: 'SL-2026-0001',
      collected_by: 'অফিস',
    },
  },
];

export interface ValidationResult {
  rowIndex: number;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
  data: Record<string, any>;
  resolvedData?: Record<string, any>; // After lookups
}

const PHONE_RE = /^01[0-9]{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const normalizeDate = (val: any): string | null => {
  if (!val) return null;
  const s = String(val).trim();
  if (DATE_RE.test(s)) return s;
  // Try DD/MM/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  // Try Excel serial number
  const num = Number(s);
  if (!isNaN(num) && num > 25569 && num < 80000) {
    const d = new Date((num - 25569) * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  // Try Date.parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
};

export const validateRow = (
  row: Record<string, any>,
  schema: ImportSchema,
  rowIndex: number,
): ValidationResult => {
  const errors: { field: string; message: string }[] = [];
  const warnings: { field: string; message: string }[] = [];
  const cleaned: Record<string, any> = {};

  for (const field of schema.fields) {
    const raw = row[field.key];
    const val = raw === undefined || raw === null || raw === '' ? null : String(raw).trim();

    if (field.required && !val) {
      errors.push({ field: field.key, message: `${field.label_bn} আবশ্যক` });
      continue;
    }
    if (!val) {
      cleaned[field.key] = null;
      continue;
    }

    switch (field.type) {
      case 'date': {
        const norm = normalizeDate(val);
        if (!norm) {
          errors.push({ field: field.key, message: `${field.label_bn}: অবৈধ তারিখ (YYYY-MM-DD)` });
        } else {
          cleaned[field.key] = norm;
        }
        break;
      }
      case 'number': {
        const n = Number(val);
        if (isNaN(n)) {
          errors.push({ field: field.key, message: `${field.label_bn}: সংখ্যা প্রয়োজন` });
        } else {
          cleaned[field.key] = n;
        }
        break;
      }
      case 'phone': {
        const digits = val.replace(/[^0-9]/g, '');
        if (!PHONE_RE.test(digits)) {
          warnings.push({ field: field.key, message: `${field.label_bn}: ফোন ফরম্যাট সঠিক নয়` });
        }
        cleaned[field.key] = digits || val;
        break;
      }
      case 'email': {
        if (!EMAIL_RE.test(val)) {
          warnings.push({ field: field.key, message: `${field.label_bn}: ইমেইল ফরম্যাট সঠিক নয়` });
        }
        cleaned[field.key] = val;
        break;
      }
      case 'enum': {
        const lower = val.toLowerCase();
        if (field.enumValues && !field.enumValues.includes(lower)) {
          warnings.push({ field: field.key, message: `${field.label_bn}: অজানা মান (${val})` });
        }
        // Coerce true/false strings to actual booleans for boolean DB columns
        if (lower === 'true') cleaned[field.key] = true;
        else if (lower === 'false') cleaned[field.key] = false;
        else cleaned[field.key] = lower;
        break;
      }
      default:
        cleaned[field.key] = val;
    }
  }

  return { rowIndex, errors, warnings, data: row, resolvedData: cleaned };
};

// Resolve UUID lookups (class_name -> class_id, etc.)
export const resolveLookups = async (
  rows: ValidationResult[],
  schema: ImportSchema,
): Promise<ValidationResult[]> => {
  const lookupFields = schema.fields.filter(f => f.type === 'uuid-lookup');
  if (lookupFields.length === 0) return rows;

  for (const field of lookupFields) {
    if (!field.lookupTable || !field.lookupCols) continue;
    // Collect unique names to look up
    const names = new Set<string>();
    rows.forEach(r => {
      const v = r.resolvedData?.[field.key];
      if (v) names.add(String(v));
    });
    if (names.size === 0) continue;

    // Build OR query for each lookup column
    const orConditions = field.lookupCols.flatMap(col =>
      Array.from(names).map(n => `${col}.eq.${n}`),
    ).join(',');

    const { data } = await (supabase as any)
      .from(field.lookupTable)
      .select(`id, ${field.lookupCols.join(',')}`)
      .or(orConditions);

    const lookupMap = new Map<string, string>();
    (data || []).forEach((d: any) => {
      field.lookupCols!.forEach(col => {
        if (d[col]) lookupMap.set(String(d[col]).toLowerCase(), d.id);
      });
    });

    rows.forEach(r => {
      const v = r.resolvedData?.[field.key];
      if (!v) return;
      const id = lookupMap.get(String(v).toLowerCase());
      if (!id) {
        r.warnings.push({ field: field.key, message: `${field.label_bn}: "${v}" পাওয়া যায়নি` });
      } else {
        // Map to actual DB column: class_name -> class_id, session_name -> session_id, fee_type_name -> fee_type_id, student_id_text -> student_id
        const dbKey = field.key === 'class_name' ? 'class_id'
          : field.key === 'session_name' ? 'session_id'
          : field.key === 'fee_type_name' ? 'fee_type_id'
          : field.key.replace(/_name$/, '_id');
        if (r.resolvedData) {
          r.resolvedData[dbKey] = id;
          delete r.resolvedData[field.key];
        }
      }
    });
  }

  // Special handling for student_id_text on fee_payments → student_id (uuid)
  if (schema.key === 'fee_payments') {
    const studentIds = new Set<string>();
    rows.forEach(r => {
      const v = r.resolvedData?.student_id_text;
      if (v) studentIds.add(String(v));
    });
    if (studentIds.size > 0) {
      const { data } = await supabase
        .from('students')
        .select('id, student_id')
        .in('student_id', Array.from(studentIds));
      const map = new Map<string, string>();
      (data || []).forEach(d => map.set(d.student_id, d.id));
      rows.forEach(r => {
        const v = r.resolvedData?.student_id_text;
        if (!v) return;
        const id = map.get(String(v));
        if (!id) {
          r.errors.push({ field: 'student_id_text', message: `শিক্ষার্থী "${v}" পাওয়া যায়নি` });
        } else if (r.resolvedData) {
          r.resolvedData.student_id = id;
          delete r.resolvedData.student_id_text;
        }
      });
    }
  }

  return rows;
};
