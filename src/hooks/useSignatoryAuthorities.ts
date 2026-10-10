// @ts-nocheck -- generated DB types are stricter than these legacy dynamic shapes
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AuthorityRoleKey =
  | 'head_of_institute'
  | 'accountant_cashier'
  | 'verifier_auditor'
  | 'exam_controller';

export interface SignatoryRoleItem {
  id: string;
  role_key: AuthorityRoleKey | string;
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

export const CORE_SIGNATORY_ROLES: {
  key: AuthorityRoleKey;
  label_bn: string;
  label_en: string;
  icon: string;
  desc_bn: string;
  keywords: string[];
}[] = [
  {
    key: 'head_of_institute',
    label_bn: 'প্রতিষ্ঠান প্রধান (মুহতামিম / অধ্যক্ষ / সুপার)',
    label_en: 'Head of Institute / Principal',
    icon: '🏛️',
    desc_bn: 'সার্টিফিকেট, প্রশংসাপত্র, মার্কশিট, পাবলিক ওয়েবসাইট ও নীতিগত ফাইলে নাম ও স্বাক্ষর যাবে।',
    keywords: ['মুহতামিম', 'অধ্যক্ষ', 'প্রিন্সিপাল', 'সুপার', 'সুপারিনটেনডেন্ট', 'প্রধান শিক্ষক', 'পরিচালক', 'principal', 'headmaster'],
  },
  {
    key: 'accountant_cashier',
    label_bn: 'প্রধান হিসাবরক্ষক / ক্যাশিয়ার / কোষাধ্যক্ষ',
    label_en: 'Chief Accountant / Cashier',
    icon: '💼',
    desc_bn: 'আর্থিক ভাউচার, খরচের রসিদ, মাসিক সামারি রিপোর্ট ও ক্যাশ স্টেটমেন্টে স্বাক্ষরকারী।',
    keywords: ['হিসাবরক্ষক', 'ক্যাশিয়ার', 'কোষাধ্যক্ষ', 'একাউন্ট্যান্ট', 'accountant', 'cashier'],
  },
  {
    key: 'verifier_auditor',
    label_bn: 'হিসাব নিরীক্ষক / অভ্যন্তরীণ যাচাইকারী',
    label_en: 'Internal Auditor / Verifier',
    icon: '🔍',
    desc_bn: 'খরচ ও অর্থ স্থানান্তরের ভাউচারে বিল যাচাইকারী বা নিরীক্ষক হিসেবে নাম থাকবে।',
    keywords: ['যাচাইকারী', 'নিরীক্ষক', 'অডিটর', 'auditor', 'verifier'],
  },
  {
    key: 'exam_controller',
    label_bn: 'পরীক্ষা নিয়ন্ত্রক / শিক্ষা সচিব',
    label_en: 'Controller of Examinations',
    icon: '📝',
    desc_bn: 'পরীক্ষার রুটিন, অ্যাডমিট কার্ড, মার্কশিট ও ফলাফল প্রকাশের স্বাক্ষর অংশে নাম যাবে।',
    keywords: ['পরীক্ষা নিয়ন্ত্রক', 'শিক্ষা সচিব', 'পরীক্ষা সচিব', 'controller', 'exam controller'],
  },
];

export async function fetchSignatoryAuthorities(): Promise<SignatoryRoleItem[]> {
  try {
    const { data, error } = await supabase
      .from('institution_signatories' as any)
      .select('*')
      .order('role_key');

    if (!error && data && data.length > 0) {
      return data as SignatoryRoleItem[];
    }
  } catch (err) {
    console.warn('institution_signatories table query fallback:', err);
  }

  // Fallback: Read from institutions + administrative_officers
  const [{ data: inst }, { data: officers }, { data: staffList }] = await Promise.all([
    supabase.from('institutions').select('*').eq('is_default', true).maybeSingle(),
    supabase.from('administrative_officers').select('*').is('deleted_at', null).eq('status', 'active'),
    supabase.from('staff').select('*').is('deleted_at', null).eq('status', 'active'),
  ]);

  const allPersonnel = [
    ...(officers || []).map((o: any) => ({ ...o, source: 'administrative' })),
    ...(staffList || []).map((s: any) => ({ ...s, source: 'staff' })),
  ];

  return CORE_SIGNATORY_ROLES.map((def) => {
    // Attempt auto-match by designation keywords
    const match = allPersonnel.find((p: any) => {
      const d = (p.designation || '').toLowerCase();
      return def.keywords.some((k) => d.includes(k.toLowerCase()));
    });

    let fallbackName = '';
    if (def.key === 'head_of_institute') fallbackName = (inst as any)?.principal_name || '';
    if (def.key === 'accountant_cashier') fallbackName = (inst as any)?.accountant_name || '';
    if (def.key === 'verifier_auditor') fallbackName = (inst as any)?.verifier_name || '';

    return {
      id: def.key,
      role_key: def.key,
      role_name_bn: def.label_bn,
      role_name_en: def.label_en,
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
}

export function useSignatoryAuthorities() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['signatory-authorities'],
    queryFn: fetchSignatoryAuthorities,
    staleTime: 60 * 1000,
  });

  const updateAuthority = useMutation({
    mutationFn: async (payload: {
      role_key: AuthorityRoleKey | string;
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
      const roleDef = CORE_SIGNATORY_ROLES.find((r) => r.key === payload.role_key);
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

      // 2. Sync to default institutions table
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

  const list = query.data || [];
  const headOfInstitute = list.find((i) => i.role_key === 'head_of_institute');
  const accountantCashier = list.find((i) => i.role_key === 'accountant_cashier');
  const verifierAuditor = list.find((i) => i.role_key === 'verifier_auditor');
  const examController = list.find((i) => i.role_key === 'exam_controller');

  return {
    ...query,
    authorities: list,
    headOfInstitute,
    accountantCashier,
    verifierAuditor,
    examController,
    updateAuthority,
  };
}
