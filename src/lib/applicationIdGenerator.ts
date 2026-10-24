import { supabase } from '@/integrations/supabase/client';

/**
 * Generate sequential Application Number for Student Admissions: ADM{YEAR}{0001}
 * e.g., ADM20260001, ADM20260002
 */
export async function generateStudentApplicationNo(): Promise<string> {
  const currentYear = new Date().getFullYear().toString();
  const prefix = `ADM${currentYear}`;

  try {
    const { data: publicData } = await supabase
      .from('students_public')
      .select('student_id')
      .like('student_id', `${prefix}%`)
      .limit(100);

    let maxNum = 0;
    if (publicData && publicData.length > 0) {
      for (const row of publicData) {
        const id = (row.student_id || '').replace(/[-\s]/g, '').toUpperCase();
        const match = id.match(new RegExp(`^${prefix}(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }

    const localKey = `edumate_last_adm_${currentYear}`;
    const localLast = parseInt(localStorage.getItem(localKey) || '0', 10);
    const nextNum = Math.max(maxNum, localLast) + 1;
    localStorage.setItem(localKey, String(nextNum));

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  } catch (err) {
    console.warn('Error generating student application no:', err);
    const fallback = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${fallback}`;
  }
}

/**
 * Generate sequential Application Number for Staff Applications: STF{YEAR}{0001}
 * e.g., STF20260001, STF20260002
 */
export async function generateStaffApplicationNo(): Promise<string> {
  const currentYear = new Date().getFullYear().toString();
  const prefix = `STF${currentYear}`;

  try {
    const { data } = await supabase
      .from('staff')
      .select('staff_id, staff_data')
      .or(`staff_id.like.${prefix}%,staff_data->>application_no.like.${prefix}%`)
      .limit(100);

    let maxNum = 0;
    if (data && data.length > 0) {
      for (const row of data) {
        const id = (row.staff_id || (row.staff_data as any)?.application_no || '').replace(/[-\s]/g, '').toUpperCase();
        const match = id.match(new RegExp(`^${prefix}(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }

    const localKey = `edumate_last_stf_${currentYear}`;
    const localLast = parseInt(localStorage.getItem(localKey) || '0', 10);
    const nextNum = Math.max(maxNum, localLast) + 1;
    localStorage.setItem(localKey, String(nextNum));

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  } catch (err) {
    console.warn('Error generating staff application no:', err);
    const fallback = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${fallback}`;
  }
}
