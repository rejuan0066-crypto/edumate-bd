import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Finds the "Principal" (or "Founder & Principal") person dynamically by
 * scanning `administrative_officers` and `staff` for a designation
 * containing "প্রিন্সিপাল" / "principal" / "অধ্যক্ষ".
 *
 * Returned shape mirrors the principal_* fields used by website_settings
 * so callers can drop it in as a fallback / override.
 */
export interface PrincipalOfficer {
  source: 'administrative' | 'staff';
  id: string;
  principal_name: string;
  principal_name_en: string;
  principal_title_bn: string;
  principal_title_en: string;
  principal_photo_url: string;
  phone: string;
  email: string;
}

const KEYWORDS = ['প্রিন্সিপাল', 'principal', 'অধ্যক্ষ'];

const matches = (designation: string | null | undefined) => {
  const d = (designation || '').toLowerCase().trim();
  if (!d) return false;
  return KEYWORDS.some(k => d.includes(k.toLowerCase()));
};

export async function fetchPrincipalOfficer(): Promise<PrincipalOfficer | null> {
  // Prefer administrative_officers (this is where Founder/Principal is normally placed)
  const { data: admins } = await supabase
    .from('administrative_officers')
    .select('id, name_bn, name_en, designation, phone, email, photo_url, sort_order, joining_date')
    .is('deleted_at', null)
    .eq('status', 'active');

  const adminHit = (admins || []).find(a => matches(a.designation));
  if (adminHit) {
    return {
      source: 'administrative',
      id: adminHit.id,
      principal_name: adminHit.name_bn || '',
      principal_name_en: adminHit.name_en || '',
      principal_title_bn: adminHit.designation || '',
      principal_title_en: adminHit.designation || '',
      principal_photo_url: adminHit.photo_url || '',
      phone: adminHit.phone || '',
      email: adminHit.email || '',
    };
  }

  // Fallback: staff table
  const { data: staff } = await supabase
    .from('staff')
    .select('id, name_bn, name_en, designation, phone, email, photo_url')
    .is('deleted_at', null)
    .eq('status', 'active');

  const staffHit = (staff || []).find((s: any) => matches(s.designation));
  if (staffHit) {
    return {
      source: 'staff',
      id: staffHit.id,
      principal_name: staffHit.name_bn || '',
      principal_name_en: staffHit.name_en || '',
      principal_title_bn: staffHit.designation || '',
      principal_title_en: staffHit.designation || '',
      principal_photo_url: staffHit.photo_url || '',
      phone: staffHit.phone || '',
      email: staffHit.email || '',
    };
  }

  return null;
}

export const usePrincipalOfficer = () => {
  return useQuery({
    queryKey: ['principal-officer-auto'],
    queryFn: fetchPrincipalOfficer,
    staleTime: 5 * 60 * 1000,
  });
};
