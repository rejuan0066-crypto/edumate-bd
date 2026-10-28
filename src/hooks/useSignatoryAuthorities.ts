// @ts-nocheck -- generated DB types are stricter than these legacy dynamic shapes
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AuthorityRoleKey =
  | 'head_of_institute'
  | 'accountant_cashier'
  | 'verifier_auditor'
  | 'exam_controller'
  | string;

export interface SignatoryRoleItem {
  id: string;
  role_key: string;
  role_name_bn: string;
  role_name_en: string;
  person_id: string | null;
  person_source: 'staff' | 'administrative' | 'manual' | null;
  person_name_bn: string | null;
  person_name_en: string | null;
  person_designation_bn: string | null;
  person_designation_en: string | null;
  person_phone: string | null;
  person_email: string | null;
  person_photo_url: string | null;
  signature_url: string | null;
  is_active: boolean;
}

export interface SignatoryRoleDef {
  key: string;
  label_bn: string;
  label_en: string;
  icon: string;
  desc_bn: string;
  keywords: string[];
  is_custom?: boolean;
}

export interface DocumentScopeItem {
  id: string;
  label_bn: string;
  label_en: string;
  desc_bn: string;
  icon: string;
  category: 'academic' | 'financial' | 'general';
}

export interface AuthorizedCollectorsConfig {
  mode: 'selected' | 'all';
  role_keys: string[];
  staff_ids: string[];
  custom_names: string[];
}

export const DEFAULT_AUTHORIZED_COLLECTORS: AuthorizedCollectorsConfig = {
  mode: 'selected',
  role_keys: ['accountant_cashier'],
  staff_ids: [],
  custom_names: [],
};

export interface VerifierDepartmentsConfig {
  mode: 'selected' | 'all';
  department_keys: string[];
  default_department?: string;
  custom_departments?: Array<{ key: string; name_bn: string; name_en: string }>;
}

export const DEFAULT_VERIFIER_DEPARTMENTS: VerifierDepartmentsConfig = {
  mode: 'selected',
  department_keys: ['teacher', 'education'],
  default_department: 'teacher',
  custom_departments: [],
};

export const DOCUMENT_SCOPES: DocumentScopeItem[] = [
  { id: 'certificate', label_bn: 'প্রত্যয়ন ও প্রশংসাপত্র', label_en: 'Certificates & Testimonials', desc_bn: 'শিক্ষার্থীদের চারিত্রিক সনদ, প্রশংসাপত্র ও প্রত্যয়নপত্র', icon: '📜', category: 'academic' },
  { id: 'result_card', label_bn: 'মার্কশিট ও রেজাল্ট কার্ড', label_en: 'Marksheet & Result Card', desc_bn: 'পরীক্ষার মার্কশিট, গ্রেড শিট ও ফলাফল বিবরণী', icon: '📊', category: 'academic' },
  { id: 'admit_card', label_bn: 'অ্যাডমিট কার্ড (প্রবেশপত্র)', label_en: 'Admit Card', desc_bn: 'পরীক্ষার্থীদের অ্যাডমিট কার্ড ও প্রবেশপত্র', icon: '🎫', category: 'academic' },
  { id: 'exam_routine', label_bn: 'পরীক্ষার রুটিন', label_en: 'Exam Routine', desc_bn: 'পরীক্ষার সময়সূচি ও পরীক্ষা সংক্রান্ত নির্দেশিকা', icon: '🗓️', category: 'academic' },
  { id: 'expense_voucher', label_bn: 'খরচের ভাউচার ও বিল', label_en: 'Expense Voucher & Bills', desc_bn: 'দৈনন্দিন বা মাসিক ব্যয়ের অনুমোদন ও বিল ভাউচার', icon: '🧾', category: 'financial' },
  { id: 'fee_receipt', label_bn: 'ফি ও ক্যাশ রসিদ', label_en: 'Cash / Fee Receipt', desc_bn: 'ছাত্রদের বেতন ও ফি আদায়ের মানি রিসিট', icon: '💰', category: 'financial' },
  { id: 'salary_sheet', label_bn: 'মাসিক বেতন শীট', label_en: 'Monthly Salary Sheet', desc_bn: 'শিক্ষক-কর্মচারীদের মাসিক স্যালারি রেজিস্টার', icon: '📑', category: 'financial' },
  { id: 'id_card', label_bn: 'আইডি কার্ড (ছাত্র ও স্টাফ)', label_en: 'Student & Staff ID Card', desc_bn: 'শিক্ষার্থী ও শিক্ষক-কর্মচারী ডিজিটাল আইডি কার্ড', icon: '🪪', category: 'general' },
  { id: 'public_website', label_bn: 'পাবলিক ওয়েবসাইট', label_en: 'Public Website', desc_bn: 'ওয়েবসাইটের বাণী ও অফিসিয়াল তথ্যে নাম-স্বাক্ষর', icon: '🌐', category: 'general' },
  { id: 'official_pad', label_bn: 'অফিসিয়াল প্যাড ও নোটিশ', label_en: 'Official Pad & Notice', desc_bn: 'দাপ্তরিক চিঠি, প্রাতিষ্ঠানিক প্যাড ও নোটিশ', icon: '✉️', category: 'general' },
];

export const DEFAULT_ROLE_SCOPES: Record<string, string[]> = {
  head_of_institute: ['certificate', 'result_card', 'admit_card', 'public_website', 'official_pad', 'id_card'],
  accountant_cashier: ['expense_voucher', 'fee_receipt', 'salary_sheet'],
  verifier_auditor: ['expense_voucher', 'salary_sheet'],
  exam_controller: ['result_card', 'admit_card', 'exam_routine'],
};

export const CORE_SIGNATORY_ROLES: SignatoryRoleDef[] = [
  {
    key: 'head_of_institute',
    label_bn: 'প্রতিষ্ঠান প্রধান (মুহতামিম / অধ্যক্ষ / সুপার)',
    label_en: 'Head of Institute / Principal',
    icon: '🏛️',
    desc_bn: 'সার্টিফিকেট, প্রশংসাপত্র, মার্কশিট, পাবলিক ওয়েবসাইট ও নীতিগত ফাইলে নাম ও স্বাক্ষর যাবে।',
    keywords: ['মুহতামিম', 'অধ্যক্ষ', 'প্রিন্সিপাল', 'সুপার', 'সুপারিনটেনডেন্ট', 'প্রধান শিক্ষক', 'পরিচালক', 'principal', 'headmaster'],
    is_custom: false,
  },
  {
    key: 'accountant_cashier',
    label_bn: 'প্রধান হিসাবরক্ষক / ক্যাশিয়ার / কোষাধ্যক্ষ',
    label_en: 'Chief Accountant / Cashier',
    icon: '💼',
    desc_bn: 'আর্থিক ভাউচার, খরচের রসিদ, মাসিক সামারি রিপোর্ট ও ক্যাশ স্টেটমেন্টে স্বাক্ষরকারী।',
    keywords: ['হিসাবরক্ষক', 'ক্যাশিয়ার', 'কোষাধ্যক্ষ', 'একাউন্ট্যান্ট', 'accountant', 'cashier'],
    is_custom: false,
  },
  {
    key: 'verifier_auditor',
    label_bn: 'হিসাব নিরীক্ষক / অভ্যন্তরীণ যাচাইকারী',
    label_en: 'Internal Auditor / Verifier',
    icon: '🔍',
    desc_bn: 'খরচ ও অর্থ স্থানান্তরের ভাউচারে বিল যাচাইকারী বা নিরীক্ষক হিসেবে নাম থাকবে।',
    keywords: ['যাচাইকারী', 'নিরীক্ষক', 'অডিটর', 'auditor', 'verifier'],
    is_custom: false,
  },
  {
    key: 'exam_controller',
    label_bn: 'পরীক্ষা নিয়ন্ত্রক / শিক্ষা সচিব',
    label_en: 'Controller of Examinations',
    icon: '📝',
    desc_bn: 'পরীক্ষার রুটিন, অ্যাডমিট কার্ড, মার্কশিট ও ফলাফল প্রকাশের স্বাক্ষর অংশে নাম যাবে।',
    keywords: ['পরীক্ষা নিয়ন্ত্রক', 'শিক্ষা সচিব', 'পরীক্ষা সচিব', 'controller', 'exam controller'],
    is_custom: false,
  },
];

export interface SignatoryAuthoritiesData {
  authorities: SignatoryRoleItem[];
  allRoles: SignatoryRoleDef[];
  customRoles: SignatoryRoleDef[];
  documentScopes: Record<string, string[]>;
  authorizedCollectors: AuthorizedCollectorsConfig;
  verifierDepartments: VerifierDepartmentsConfig;
}

export async function fetchSignatoryAuthoritiesData(): Promise<SignatoryAuthoritiesData> {
  // 1. Fetch custom roles, document scopes, authorized collectors & verifier departments from website_settings
  let customRoles: SignatoryRoleDef[] = [];
  let documentScopes: Record<string, string[]> = { ...DEFAULT_ROLE_SCOPES };
  let authorizedCollectors: AuthorizedCollectorsConfig = { ...DEFAULT_AUTHORIZED_COLLECTORS };
  let verifierDepartments: VerifierDepartmentsConfig = { ...DEFAULT_VERIFIER_DEPARTMENTS };

  try {
    const { data: wsData } = await supabase
      .from('website_settings')
      .select('key, value');

    if (wsData) {
      for (const row of wsData) {
        if (row.key === 'custom_signatory_roles' && row.value) {
          try {
            const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
            if (Array.isArray(parsed)) {
              customRoles = parsed.map(r => ({ ...r, is_custom: true }));
            }
          } catch {}
        }
        if (row.key === 'signatory_document_scopes' && row.value) {
          try {
            const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
            if (parsed && typeof parsed === 'object') {
              documentScopes = { ...DEFAULT_ROLE_SCOPES, ...parsed };
            }
          } catch {}
        }
        if (row.key === 'authorized_fee_collectors' && row.value) {
          try {
            const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
            if (parsed && typeof parsed === 'object') {
              authorizedCollectors = {
                mode: parsed.mode || 'selected',
                role_keys: Array.isArray(parsed.role_keys) ? parsed.role_keys : ['accountant_cashier'],
                staff_ids: Array.isArray(parsed.staff_ids) ? parsed.staff_ids : [],
                custom_names: Array.isArray(parsed.custom_names) ? parsed.custom_names : [],
              };
            }
          } catch {}
        }
        if (row.key === 'admission_verifier_departments' && row.value) {
          try {
            const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
            if (parsed && typeof parsed === 'object') {
              verifierDepartments = {
                mode: parsed.mode || 'selected',
                department_keys: Array.isArray(parsed.department_keys) && parsed.department_keys.length > 0
                  ? parsed.department_keys
                  : ['teacher', 'education'],
                default_department: parsed.default_department || 'teacher',
                custom_departments: Array.isArray(parsed.custom_departments) ? parsed.custom_departments : [],
              };
            }
          } catch {}
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch custom roles, scopes, collectors, or verifier departments from website_settings:', err);
  }

  const allRoles: SignatoryRoleDef[] = [
    ...CORE_SIGNATORY_ROLES,
    ...customRoles,
  ];

  // 2. Fetch existing institution_signatories table rows
  let dbAuthorities: SignatoryRoleItem[] = [];
  try {
    const { data, error } = await supabase
      .from('institution_signatories' as any)
      .select('*')
      .order('role_key');

    if (!error && data && data.length > 0) {
      dbAuthorities = data as SignatoryRoleItem[];
    }
  } catch (err) {
    console.warn('institution_signatories table query fallback:', err);
  }

  // 3. Fallback matching from institutions + personnel
  let allPersonnel: any[] = [];
  let instFallback: any = null;
  try {
    const [{ data: inst }, { data: officers }, { data: staffList }] = await Promise.all([
      supabase.from('institutions').select('*').eq('is_default', true).maybeSingle(),
      supabase.from('administrative_officers').select('*').is('deleted_at', null).eq('status', 'active'),
      supabase.from('staff').select('*').is('deleted_at', null).eq('status', 'active'),
    ]);
    instFallback = inst;
    allPersonnel = [
      ...(officers || []).map((o: any) => ({ ...o, source: 'administrative' })),
      ...(staffList || []).map((s: any) => ({ ...s, source: 'staff' })),
    ];
  } catch {}

  // 4. Merge allRoles with dbAuthorities
  const authorities: SignatoryRoleItem[] = allRoles.map((roleDef) => {
    const found = dbAuthorities.find((a) => a.role_key === roleDef.key);
    if (found) {
      return {
        ...found,
        role_name_bn: found.role_name_bn || roleDef.label_bn,
        role_name_en: found.role_name_en || roleDef.label_en,
      };
    }

    // Auto-match fallback if not yet stored in DB
    const match = allPersonnel.find((p: any) => {
      const d = (p.designation || '').toLowerCase();
      return (roleDef.keywords || []).some((k) => d.includes(k.toLowerCase()));
    });

    let fallbackName = '';
    if (roleDef.key === 'head_of_institute') fallbackName = instFallback?.principal_name || '';
    if (roleDef.key === 'accountant_cashier') fallbackName = instFallback?.accountant_name || '';
    if (roleDef.key === 'verifier_auditor') fallbackName = instFallback?.verifier_name || '';

    return {
      id: roleDef.key,
      role_key: roleDef.key,
      role_name_bn: roleDef.label_bn,
      role_name_en: roleDef.label_en,
      person_id: match?.id || null,
      person_source: match ? (match.source as any) : 'manual',
      person_name_bn: match?.name_bn || fallbackName,
      person_name_en: match?.name_en || null,
      person_designation_bn: match?.designation || null,
      person_designation_en: match?.designation || null,
      person_phone: match?.phone || null,
      person_email: match?.email || null,
      person_photo_url: match?.photo_url || null,
      signature_url: null,
      is_active: true,
    };
  });

  return {
    authorities,
    allRoles,
    customRoles,
    documentScopes,
    authorizedCollectors,
    verifierDepartments,
  };
}

// Backward-compatible array fetcher
export async function fetchSignatoryAuthorities(): Promise<SignatoryRoleItem[]> {
  const data = await fetchSignatoryAuthoritiesData();
  return data.authorities;
}

export function useSignatoryAuthorities() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['signatory-authorities-data'],
    queryFn: fetchSignatoryAuthoritiesData,
    staleTime: 60 * 1000,
  });

  const data = query.data || {
    authorities: [],
    allRoles: CORE_SIGNATORY_ROLES,
    customRoles: [],
    documentScopes: { ...DEFAULT_ROLE_SCOPES },
    authorizedCollectors: { ...DEFAULT_AUTHORIZED_COLLECTORS },
    verifierDepartments: { ...DEFAULT_VERIFIER_DEPARTMENTS },
  };

  // ─── 1. Update Authority Assignment ───
  const updateAuthority = useMutation({
    mutationFn: async (payload: {
      role_key: string;
      person_id?: string | null;
      person_source?: 'staff' | 'administrative' | 'manual' | null;
      person_name_bn?: string | null;
      person_name_en?: string | null;
      person_designation_bn?: string | null;
      person_designation_en?: string | null;
      person_phone?: string | null;
      person_email?: string | null;
      person_photo_url?: string | null;
      signature_url?: string | null;
    }) => {
      const roleDef = data.allRoles.find((r) => r.key === payload.role_key);
      const record = {
        role_key: payload.role_key,
        role_name_bn: roleDef?.label_bn || payload.role_key,
        role_name_en: roleDef?.label_en || payload.role_key,
        person_id: payload.person_id || null,
        person_source: payload.person_source || 'manual',
        person_name_bn: payload.person_name_bn || null,
        person_name_en: payload.person_name_en || null,
        person_designation_bn: payload.person_designation_bn || null,
        person_designation_en: payload.person_designation_en || null,
        person_phone: payload.person_phone || null,
        person_email: payload.person_email || null,
        person_photo_url: payload.person_photo_url || null,
        signature_url: payload.signature_url || null,
        updated_at: new Date().toISOString(),
      };

      // 1. Upsert into institution_signatories
      try {
        await supabase
          .from('institution_signatories' as any)
          .upsert(record, { onConflict: 'role_key' });
      } catch (err) {
        console.warn('Could not upsert to institution_signatories:', err);
      }

      // 2. Sync core roles to institutions table
      const instUpdates: Record<string, any> = {};
      if (payload.role_key === 'head_of_institute') {
        instUpdates.principal_name = payload.person_name_bn || null;
      } else if (payload.role_key === 'accountant_cashier') {
        instUpdates.accountant_name = payload.person_name_bn || null;
      } else if (payload.role_key === 'verifier_auditor') {
        instUpdates.verifier_name = payload.person_name_bn || null;
      }

      if (Object.keys(instUpdates).length > 0) {
        await supabase.from('institutions').update(instUpdates).eq('is_default', true);
      }

      // 3. Sync to website_settings
      const wsKeys: { key: string; value: string }[] = [];
      if (payload.role_key === 'head_of_institute') {
        if (payload.person_name_bn) wsKeys.push({ key: 'principal_name', value: payload.person_name_bn });
        if (payload.person_name_en) wsKeys.push({ key: 'principal_name_en', value: payload.person_name_en });
        if (payload.person_designation_bn) wsKeys.push({ key: 'principal_title_bn', value: payload.person_designation_bn });
        if (payload.person_photo_url) wsKeys.push({ key: 'principal_photo_url', value: payload.person_photo_url });
      } else if (payload.role_key === 'accountant_cashier') {
        if (payload.person_name_bn) wsKeys.push({ key: 'accountant_name', value: payload.person_name_bn });
      } else if (payload.role_key === 'verifier_auditor') {
        if (payload.person_name_bn) wsKeys.push({ key: 'verifier_name', value: payload.person_name_bn });
      }

      for (const item of wsKeys) {
        try {
          await supabase.from('website_settings').upsert({
            key: item.key,
            value: item.value,
          });
        } catch {}
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatory-authorities-data'] });
      qc.invalidateQueries({ queryKey: ['signatory-authorities'] });
      qc.invalidateQueries({ queryKey: ['institution_info'] });
      qc.invalidateQueries({ queryKey: ['institutions'] });
      qc.invalidateQueries({ queryKey: ['website_settings'] });
      qc.invalidateQueries({ queryKey: ['principal-officer-auto'] });
      toast.success('স্বাক্ষরকারী দায়িত্ব সফলভাবে সংরক্ষিত হয়েছে');
    },
    onError: (err: any) => {
      console.error('Update authority error:', err);
      toast.error(err?.message || 'সংরক্ষণ ব্যর্থ হয়েছে');
    },
  });

  // ─── 2. Update Document Scopes for Any Role ───
  const updateRoleScopes = useMutation({
    mutationFn: async ({ roleKey, scopes }: { roleKey: string; scopes: string[] }) => {
      const updatedScopes = {
        ...data.documentScopes,
        [roleKey]: scopes,
      };

      const { error } = await supabase.from('website_settings').upsert({
        key: 'signatory_document_scopes',
        value: JSON.stringify(updatedScopes),
      });

      if (error) throw error;
      return updatedScopes;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatory-authorities-data'] });
      qc.invalidateQueries({ queryKey: ['website_settings'] });
      toast.success('স্বাক্ষরের আওতা / স্থান সফলভাবে সংরক্ষিত হয়েছে');
    },
    onError: (err: any) => {
      console.error('Update scopes error:', err);
      toast.error(err?.message || 'আওতা সংরক্ষণ ব্যর্থ হয়েছে');
    },
  });

  // ─── 3. Add Custom Signatory Role ───
  const addCustomRole = useMutation({
    mutationFn: async (newRole: {
      label_bn: string;
      label_en?: string;
      icon?: string;
      desc_bn?: string;
      scopes?: string[];
      keywords?: string[];
    }) => {
      const slug = newRole.label_en?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') ||
                   'custom_' + Date.now();
      const roleKey = `custom_${slug}`.replace(/^custom_custom_/, 'custom_');

      const roleDef: SignatoryRoleDef = {
        key: roleKey,
        label_bn: newRole.label_bn.trim(),
        label_en: newRole.label_en?.trim() || newRole.label_bn.trim(),
        icon: newRole.icon?.trim() || '✍️',
        desc_bn: newRole.desc_bn?.trim() || 'কাস্টম নির্ধারিত স্বাক্ষরকারী ও দায়িত্বপ্রাপ্ত কর্তৃপক্ষ।',
        keywords: newRole.keywords || [newRole.label_bn.trim()],
        is_custom: true,
      };

      const nextCustomRoles = [...data.customRoles.filter(r => r.key !== roleKey), roleDef];

      // Save custom roles list to website_settings
      const { error: wsErr } = await supabase.from('website_settings').upsert({
        key: 'custom_signatory_roles',
        value: JSON.stringify(nextCustomRoles),
      });
      if (wsErr) throw wsErr;

      // Save initial scopes for this custom role
      if (newRole.scopes && newRole.scopes.length > 0) {
        const nextScopes = {
          ...data.documentScopes,
          [roleKey]: newRole.scopes,
        };
        await supabase.from('website_settings').upsert({
          key: 'signatory_document_scopes',
          value: JSON.stringify(nextScopes),
        });
      }

      // Upsert record in institution_signatories
      try {
        await supabase.from('institution_signatories' as any).upsert({
          role_key: roleKey,
          role_name_bn: roleDef.label_bn,
          role_name_en: roleDef.label_en,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'role_key' });
      } catch {}

      return roleDef;
    },
    onSuccess: (roleDef) => {
      qc.invalidateQueries({ queryKey: ['signatory-authorities-data'] });
      qc.invalidateQueries({ queryKey: ['signatory-authorities'] });
      qc.invalidateQueries({ queryKey: ['website_settings'] });
      toast.success(`'${roleDef.label_bn}' স্বাক্ষরকারী সফলভাবে যুক্ত হয়েছে`);
    },
    onError: (err: any) => {
      console.error('Add custom role error:', err);
      toast.error(err?.message || 'কাস্টম স্বাক্ষরকারী যুক্ত করা ব্যর্থ হয়েছে');
    },
  });

  // ─── 4. Delete Custom Signatory Role ───
  const deleteCustomRole = useMutation({
    mutationFn: async (roleKey: string) => {
      const nextCustomRoles = data.customRoles.filter((r) => r.key !== roleKey);

      // Remove from website_settings
      await supabase.from('website_settings').upsert({
        key: 'custom_signatory_roles',
        value: JSON.stringify(nextCustomRoles),
      });

      // Remove from document scopes
      const nextScopes = { ...data.documentScopes };
      delete nextScopes[roleKey];
      await supabase.from('website_settings').upsert({
        key: 'signatory_document_scopes',
        value: JSON.stringify(nextScopes),
      });

      // Remove from institution_signatories
      try {
        await supabase.from('institution_signatories' as any).delete().eq('role_key', roleKey);
      } catch {}
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatory-authorities-data'] });
      qc.invalidateQueries({ queryKey: ['signatory-authorities'] });
      qc.invalidateQueries({ queryKey: ['website_settings'] });
      toast.success('কাস্টম স্বাক্ষরকারী পদবি মুছে ফেলা হয়েছে');
    },
    onError: (err: any) => {
      console.error('Delete custom role error:', err);
      toast.error(err?.message || 'মুছে ফেলা ব্যর্থ হয়েছে');
    },
  });

  // ─── 5. Update Authorized Fee Collectors ───
  const updateAuthorizedCollectors = useMutation({
    mutationFn: async (config: AuthorizedCollectorsConfig) => {
      const { error } = await supabase.from('website_settings').upsert({
        key: 'authorized_fee_collectors',
        value: JSON.stringify(config),
      });

      if (error) throw error;
      return config;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatory-authorities-data'] });
      qc.invalidateQueries({ queryKey: ['active_staff_collectors'] });
      qc.invalidateQueries({ queryKey: ['website_settings'] });
      toast.success('ফি আদায়কারী তালিকা সফলভাবে সংরক্ষিত হয়েছে');
    },
    onError: (err: any) => {
      console.error('Update authorized collectors error:', err);
      toast.error(err?.message || 'সংরক্ষণ ব্যর্থ হয়েছে');
    },
  });

  // ─── 6. Update Admission Verifier Departments ───
  const updateVerifierDepartments = useMutation({
    mutationFn: async (config: VerifierDepartmentsConfig) => {
      const { error } = await supabase.from('website_settings').upsert({
        key: 'admission_verifier_departments',
        value: JSON.stringify(config),
      });

      if (error) throw error;
      return config;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatory-authorities-data'] });
      qc.invalidateQueries({ queryKey: ['admission-verifier-departments'] });
      qc.invalidateQueries({ queryKey: ['website_settings'] });
      toast.success('ভর্তি ফরম যাচাইকারী বিভাগ সফলভাবে সংরক্ষিত হয়েছে');
    },
    onError: (err: any) => {
      console.error('Update verifier departments error:', err);
      toast.error(err?.message || 'সংরক্ষণ ব্যর্থ হয়েছে');
    },
  });

  // ─── Helper: Get Signatories Configured for a Specific Document ───
  const getSignatoriesForDocument = (docId: string): Array<{
    role: SignatoryRoleDef;
    authority: SignatoryRoleItem | undefined;
    isAssigned: boolean;
  }> => {
    return data.allRoles
      .filter((role) => {
        const scopes = data.documentScopes[role.key] || DEFAULT_ROLE_SCOPES[role.key] || [];
        return scopes.includes(docId);
      })
      .map((role) => {
        const authority = data.authorities.find((a) => a.role_key === role.key);
        return {
          role,
          authority,
          isAssigned: !!(authority?.person_name_bn || authority?.person_id),
        };
      });
  };

  const list = data.authorities;
  const headOfInstitute = list.find((i) => i.role_key === 'head_of_institute');
  const accountantCashier = list.find((i) => i.role_key === 'accountant_cashier');
  const verifierAuditor = list.find((i) => i.role_key === 'verifier_auditor');
  const examController = list.find((i) => i.role_key === 'exam_controller');

  return {
    ...query,
    authorities: list,
    allRoles: data.allRoles,
    customRoles: data.customRoles,
    documentScopes: data.documentScopes,
    authorizedCollectors: data.authorizedCollectors,
    verifierDepartments: data.verifierDepartments,
    headOfInstitute,
    accountantCashier,
    verifierAuditor,
    examController,
    updateAuthority,
    updateRoleScopes,
    updateAuthorizedCollectors,
    updateVerifierDepartments,
    addCustomRole,
    deleteCustomRole,
    getSignatoriesForDocument,
  };
}

/**
 * Dedicated hook to consume and update admission verifier department configuration
 */
export function useVerifierDepartments() {
  const qc = useQueryClient();

  const query = useQuery<VerifierDepartmentsConfig>({
    queryKey: ['admission-verifier-departments'],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from('website_settings')
          .select('value')
          .eq('key', 'admission_verifier_departments')
          .maybeSingle();

        if (data?.value) {
          const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          if (parsed && typeof parsed === 'object') {
            return {
              mode: parsed.mode || 'selected',
              department_keys: Array.isArray(parsed.department_keys) && parsed.department_keys.length > 0
                ? parsed.department_keys
                : ['teacher', 'education'],
              default_department: parsed.default_department || 'teacher',
              custom_departments: Array.isArray(parsed.custom_departments) ? parsed.custom_departments : [],
            };
          }
        }
      } catch (err) {
        console.warn('Error reading admission_verifier_departments:', err);
      }
      return DEFAULT_VERIFIER_DEPARTMENTS;
    },
    staleTime: 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (config: VerifierDepartmentsConfig) => {
      const { error } = await supabase.from('website_settings').upsert({
        key: 'admission_verifier_departments',
        value: JSON.stringify(config),
      });
      if (error) throw error;
      return config;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admission-verifier-departments'] });
      qc.invalidateQueries({ queryKey: ['signatory-authorities-data'] });
      qc.invalidateQueries({ queryKey: ['website_settings'] });
      toast.success('ভর্তি ফরম যাচাইকারী বিভাগ সফলভাবে সংরক্ষিত হয়েছে');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'সংরক্ষণ ব্যর্থ হয়েছে');
    },
  });

  return {
    config: query.data || DEFAULT_VERIFIER_DEPARTMENTS,
    isLoading: query.isLoading,
    updateVerifierDepartments: mutation,
  };
}
