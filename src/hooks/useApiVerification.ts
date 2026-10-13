import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ApiVerificationConfig {
  id: string;
  api_url: string;
  api_key: string;
  is_enabled: boolean;
  master_password: string;
  field_mappings: Record<string, Record<string, string>>;
}

// For admin - full config
export const useApiVerificationConfig = () => {
  return useQuery({
    queryKey: ['api-verification-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_verification_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ApiVerificationConfig | null;
    },
    staleTime: 60 * 1000,
  });
};

// For forms - check if enabled (defaults to true so Didit verification is accessible)
export const useApiVerificationEnabled = () => {
  return useQuery({
    queryKey: ['api-verification-enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_verification_config')
        .select('is_enabled')
        .limit(1)
        .maybeSingle();
      if (error || !data) return true; // Default enabled so Didit verification is always ready
      return data.is_enabled ?? true;
    },
    staleTime: 60 * 1000,
  });
};

export const verifyCard = async (cardNumber: string, formType: 'student' | 'staff') => {
  const cleanNum = cardNumber.trim();

  // 1. First, search within local institutional database (students / staff)
  try {
    if (formType === 'student') {
      const { data: matchedStudents } = await supabase
        .from('students')
        .select('*')
        .or(`student_id.eq.${cleanNum},roll_number.eq.${cleanNum},registration_no.eq.${cleanNum},birth_reg_no.eq.${cleanNum}`)
        .limit(1);

      if (matchedStudents && matchedStudents.length > 0) {
        const s = matchedStudents[0] as any;
        const adm = s.admission_data || {};
        const mappedData: Record<string, string> = {
          first_name: s.name_bn || s.name || '',
          last_name: s.name_en || '',
          roll_number: s.roll_number || '',
          registration_no: s.registration_no || '',
          gender: s.gender || 'male',
          date_of_birth: s.date_of_birth || '',
          birth_reg_no: s.birth_reg_no || '',
          father_name: s.father_name || '',
          father_name_en: s.father_name_en || '',
          father_nid: s.father_nid || '',
          mother_name: s.mother_name || '',
          mother_name_en: s.mother_name_en || '',
          mother_nid: s.mother_nid || '',
          phone: s.phone || '',
          religion: s.religion || 'islam',
          photo_url: s.photo_url || '',
          admission_session: s.admission_session || '',
        };
        if (adm.permanentAddr?.village) {
          mappedData.address = [adm.permanentAddr.village, adm.permanentAddr.union, adm.permanentAddr.upazila, adm.permanentAddr.district].filter(Boolean).join(', ');
        }
        return { success: true, data: mappedData, source: 'database' };
      }
    } else {
      // staff search
      const { data: matchedStaff } = await supabase
        .from('staff')
        .select('*')
        .or(`staff_id.eq.${cleanNum},nid.eq.${cleanNum},phone.eq.${cleanNum}`)
        .limit(1);

      if (matchedStaff && matchedStaff.length > 0) {
        const st = matchedStaff[0] as any;
        const mappedData: Record<string, string> = {
          name_bn: st.name_bn || '',
          name_en: st.name_en || '',
          father_name: st.father_name || '',
          date_of_birth: st.date_of_birth || '',
          nid: st.nid || '',
          phone: st.phone || '',
          email: st.email || '',
          education: st.qualification || st.education || '',
          address: st.address || '',
        };
        return { success: true, data: mappedData, source: 'database' };
      }
    }
  } catch (err) {
    console.warn('Database ID search warning:', err);
  }

  // 2. If not found in database, invoke edge function if configured
  try {
    const { data, error } = await supabase.functions.invoke('verify-card', {
      body: { card_number: cleanNum, form_type: formType },
    });

    if (!error && data?.data) {
      return data;
    }
  } catch (edgeErr) {
    // Graceful fallback
  }

  return { success: false, data: {} };
};
