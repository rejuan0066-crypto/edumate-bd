import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Unified institution info: merges the primary `institutions` row (is_default=true)
 * with the legacy `website_settings` key/value mirror. Any field that is NULL or
 * empty in `institutions` falls back to the matching `website_settings` value.
 *
 * Use this everywhere (certificates, marksheets, ID cards, joining/resign
 * letters, salary slips, etc.) so updates from "প্রতিষ্ঠানের তথ্য সম্পাদনা"
 * propagate consistently to every printable document.
 */
export interface InstitutionInfo {
  id?: string;
  name: string;
  name_en: string;
  name_ar: string;
  address: string;
  address_en: string;
  phone: string;
  email: string;
  logo_url: string;
  established_year: string;
  registration_number: string;
  principal_name: string;
  principal_name_en: string;
  accountant_name: string;
  verifier_name: string;
  other_info: string;
  other_info_en: string;
}

const EMPTY: InstitutionInfo = {
  name: '', name_en: '', name_ar: '',
  address: '', address_en: '',
  phone: '', email: '', logo_url: '',
  established_year: '', registration_number: '',
  principal_name: '', principal_name_en: '',
  accountant_name: '', verifier_name: '',
  other_info: '', other_info_en: '',
};

const trimStr = (v: any) => (v == null ? '' : String(v).trim());
const pick = (...vals: any[]) => {
  for (const v of vals) {
    const s = trimStr(v);
    if (s) return s;
  }
  return '';
};

export async function fetchInstitutionInfo(): Promise<InstitutionInfo> {
  const [{ data: inst }, { data: wsRows }, { data: admins }] = await Promise.all([
    supabase
      .from('institutions')
      .select('*')
      .eq('is_default', true)
      .maybeSingle(),
    supabase
      .from('website_settings')
      .select('key,value')
      .in('key', [
        'institution_name', 'institution_name_en',
        'address', 'address_en',
        'phone', 'email', 'logo_url',
        'established_year', 'registration_number',
        'principal_name', 'principal_name_en',
        'accountant_name', 'verifier_name',
      ]),
    supabase
      .from('administrative_officers')
      .select('name_bn, name_en, designation, status')
      .is('deleted_at', null),
  ]);

  const ws: Record<string, string> = {};
  (wsRows || []).forEach((r: any) => {
    ws[r.key] = typeof r.value === 'string' ? r.value : (r.value ?? '');
  });
  const i: any = inst || {};

  // Auto-detect principal from administrative_officers by designation keyword
  const KW = ['প্রিন্সিপাল', 'principal', 'অধ্যক্ষ'];
  const principalOfficer = (admins || []).find((a: any) => {
    const d = (a.designation || '').toLowerCase();
    return a.status === 'active' && d && KW.some(k => d.includes(k.toLowerCase()));
  });

  return {
    id: i.id,
    name: pick(i.name, ws.institution_name) || EMPTY.name,
    name_en: pick(i.name_en, ws.institution_name_en),
    name_ar: pick(i.name_ar),
    address: pick(i.address, ws.address),
    address_en: pick(i.address_en, ws.address_en),
    phone: pick(i.phone, ws.phone),
    email: pick(i.email, ws.email),
    logo_url: pick(i.logo_url, ws.logo_url),
    established_year: pick(i.established_year, ws.established_year),
    registration_number: pick(i.registration_number, ws.registration_number),
    principal_name: pick(principalOfficer?.name_bn, i.principal_name, ws.principal_name),
    principal_name_en: pick(principalOfficer?.name_en, i.principal_name_en, ws.principal_name_en),
    accountant_name: pick(i.accountant_name, ws.accountant_name),
    verifier_name: pick(i.verifier_name, ws.verifier_name),
    other_info: pick(i.other_info),
    other_info_en: pick(i.other_info_en),
  };
}

export const useInstitutionInfo = () => {
  return useQuery({
    queryKey: ['institution-info-merged'],
    queryFn: fetchInstitutionInfo,
    staleTime: 5 * 60 * 1000,
  });
};
