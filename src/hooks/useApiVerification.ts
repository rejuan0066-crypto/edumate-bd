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
        .or(`student_id.eq.${cleanNum},roll_number.eq.${cleanNum},registration_no.eq.${cleanNum},birth_reg_no.eq.${cleanNum},phone.eq.${cleanNum}`)
        .limit(1);

      if (matchedStudents && matchedStudents.length > 0) {
        const s = matchedStudents[0] as any;
        const adm = s.admission_data || {};
        const mappedData: Record<string, any> = {
          first_name: s.name_bn || s.name || '',
          last_name: s.name_en || '',
          name_bn: s.name_bn || s.name || '',
          name_en: s.name_en || '',
          student_id: s.student_id || '',
          roll_number: s.roll_number || '',
          registration_no: s.registration_no || '',
          gender: s.gender || 'male',
          date_of_birth: s.date_of_birth || '',
          birth_reg_no: s.birth_reg_no || '',
          father_name: s.father_name || '',
          father_name_en: s.father_name_en || '',
          father_nid: s.father_nid || '',
          father_phone: s.father_phone || s.phone || '',
          father_occupation: s.father_occupation || '',
          mother_name: s.mother_name || '',
          mother_name_en: s.mother_name_en || '',
          mother_nid: s.mother_nid || '',
          mother_phone: s.mother_phone || '',
          mother_occupation: s.mother_occupation || '',
          guardian_name: s.guardian_name || adm.guardian_name || s.father_name || '',
          guardian_phone: s.guardian_phone || adm.guardian_phone || s.father_phone || '',
          guardian_nid: s.guardian_nid || adm.guardian_nid || '',
          guardian_relation: adm.guardian_relation || '',
          guardian_type: adm.guardian_type || '',
          phone: s.phone || s.father_phone || '',
          religion: s.religion || 'islam',
          residence_type: s.residence_type || '',
          student_category: s.student_category || '',
          previous_class: s.previous_class || '',
          previous_institute: s.previous_institute || '',
          photo_url: s.photo_url || '',
          admission_session: s.admission_session || '',
          session_year: s.session_year || '',
          permanentAddr: adm.permanentAddr || null,
          presentAddr: adm.presentAddr || null,
          address: s.address || '',
        };
        if (!mappedData.address && adm.permanentAddr?.village) {
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
        const sd = (st.staff_data || {}) as any;
        const p = sd.parents || {};
        const g = sd.guardian || {};
        const mappedData: Record<string, any> = {
          name_bn: st.name_bn || '',
          name_en: st.name_en || '',
          first_name: st.name_bn || '',
          last_name: st.name_en || '',
          staff_id: st.staff_id || '',
          nid: st.nid || '',
          date_of_birth: st.date_of_birth || '',
          phone: st.phone || '',
          mobile: st.phone || '',
          email: st.email || '',
          designation: st.designation || '',
          department: st.department || '',
          employment_type: st.employment_type || '',
          residence_type: st.residence_type || '',
          religion: st.religion || '',
          education: st.qualification || st.education || '',
          experience: st.experience || '',
          previous_institute: st.previous_institute || '',
          joining_date: st.joining_date || '',
          salary: st.salary ? String(st.salary) : '',
          photo_url: st.photo_url || '',
          father_name: p.father?.name || st.father_name || '',
          father_mobile: p.father?.mobile || '',
          father_phone: p.father?.mobile || '',
          father_nid: p.father?.nid || '',
          father_occupation: p.father?.occupation || '',
          mother_name: p.mother?.name || '',
          mother_mobile: p.mother?.mobile || '',
          mother_phone: p.mother?.mobile || '',
          mother_nid: p.mother?.nid || '',
          mother_occupation: p.mother?.occupation || '',
          guardian_type: g.type || '',
          guardian_name: g.name || '',
          guardian_relation: g.relation || '',
          guardian_mobile: g.mobile || '',
          guardian_phone: g.mobile || '',
          guardian_nid: g.nid || '',
          permanentAddr: sd.permanent_address || null,
          presentAddr: sd.present_address || null,
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
