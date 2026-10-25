import { FALLBACK_LOGO_URL } from '@/hooks/useWebsiteSettings';
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
  const [{ data: inst }, { data: wsRows }, { data: principalRows }, { data: signatories }] = await Promise.all([
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
    supabase.rpc('get_public_principal' as any),
    supabase.from('institution_signatories' as any).select('*'),
  ]);

  const ws: Record<string, string> = {};
  (wsRows || []).forEach((r: any) => {
    ws[r.key] = typeof r.value === 'string' ? r.value : (r.value ?? '');
  });
  const i: any = inst || {};

  // Single source of truth for the principal: public RPC over administrative_officers
  const principalOfficer: any = Array.isArray(principalRows) ? principalRows[0] : principalRows;

  const sigList = (signatories || []) as any[];
  const sigHead = sigList.find((s) => s.role_key === 'head_of_institute');
  const sigAcc = sigList.find((s) => s.role_key === 'accountant_cashier');
  const sigVer = sigList.find((s) => s.role_key === 'verifier_auditor');

  const result: InstitutionInfo = {
    id: i.id,
    name: pick(i.name, ws.institution_name) || EMPTY.name,
    name_en: pick(i.name_en, ws.institution_name_en),
    name_ar: pick(i.name_ar),
    address: pick(i.address, ws.address),
    address_en: pick(i.address_en, ws.address_en),
    phone: pick(i.phone, ws.phone),
    email: pick(i.email, ws.email),
    logo_url: pick(i.logo_url, ws.logo_url) || FALLBACK_LOGO_URL,
    established_year: pick(i.established_year, ws.established_year),
    registration_number: pick(i.registration_number, ws.registration_number),
    principal_name: pick(sigHead?.person_name_bn, principalOfficer?.name_bn, i.principal_name, ws.principal_name),
    principal_name_en: pick(sigHead?.person_name_en, principalOfficer?.name_en, i.principal_name_en, ws.principal_name_en),
    accountant_name: pick(sigAcc?.person_name_bn, i.accountant_name, ws.accountant_name),
    verifier_name: pick(sigVer?.person_name_bn, i.verifier_name, ws.verifier_name),
    other_info: pick(i.other_info),
    other_info_en: pick(i.other_info_en),
  };

  try { localStorage.setItem(INST_CACHE_KEY, JSON.stringify(result)); } catch {}
  return result;
}

const INST_CACHE_KEY = 'institution-info-cache-v5';
const readInstCache = (): InstitutionInfo | undefined => {
  try {
    const raw = localStorage.getItem(INST_CACHE_KEY);
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch {}
  return undefined;
};

export const useInstitutionInfo = () => {
  return useQuery({
    queryKey: ['institution-info-merged'],
    queryFn: fetchInstitutionInfo,
    initialData: readInstCache,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
  });
};
