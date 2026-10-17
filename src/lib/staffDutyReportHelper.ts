/**
 * Staff Duty Report Helper
 * Handles parsing, serialization, presets and utilities for Daily Teaching & Duty Reports.
 */

export interface DutyReportDetails {
  teaching: string;       // শ্রেণি ও পাঠদান বিবরণ
  duties: string[];       // সম্পাদিত দায়িত্ব ও ডিউটি (যেমন: হোস্টেল, গার্ড, জামাত ইত্যাদি)
  duty_notes?: string;    // দায়িত্ব সংক্রান্ত অতিরিক্ত বিবরণ / বিস্তারিত
  notes?: string;         // সাধারণ মন্তব্য
}

export interface DutyPreset {
  id: string;
  label_bn: string;
  label_en: string;
  icon: string;
}

export const DUTY_PRESETS: DutyPreset[] = [
  { id: 'class_teaching', label_bn: 'ক্লাস পাঠদান', label_en: 'Class Teaching', icon: '🏫' },
  { id: 'exam_guard', label_bn: 'পরীক্ষা গার্ড', label_en: 'Exam Guard', icon: '📝' },
  { id: 'hostel_duty', label_bn: 'হোস্টেল তদারকি', label_en: 'Hostel Supervision', icon: '🏢' },
  { id: 'prayer_duty', label_bn: 'নামাজ জামাত তদারকি', label_en: 'Prayer Supervision', icon: '🕌' },
  { id: 'dining_duty', label_bn: 'খাবার ও ডাইনিং তদারকি', label_en: 'Dining & Meal', icon: '🍽️' },
  { id: 'gate_duty', label_bn: 'গেট ও শৃঙ্খলা রক্ষা', label_en: 'Gate & Discipline', icon: '🚪' },
  { id: 'night_duty', label_bn: 'নৈশকালীন পাহারা', label_en: 'Night Watch', icon: '🌙' },
  { id: 'office_duty', label_bn: 'অফিসিয়াল দায়িত্ব', label_en: 'Office Duty', icon: '📋' },
  { id: 'campus_clean', label_bn: 'ক্যাম্পাস ও পরিচ্ছন্নতা', label_en: 'Campus Cleanliness', icon: '🧹' },
  { id: 'other_duty', label_bn: 'অন্যান্য দায়িত্ব', label_en: 'Other Duty', icon: '✨' },
];

/**
 * Encodes duty report details into a structured string for storage in attendance_records.remarks
 */
export function encodeDutyRemarks(content: DutyReportDetails): string {
  const teaching = content.teaching?.trim() || '';
  const duties = Array.isArray(content.duties) ? content.duties.filter(Boolean) : [];
  const duty_notes = content.duty_notes?.trim() || '';
  const notes = content.notes?.trim() || '';

  if (!teaching && duties.length === 0 && !duty_notes && !notes) {
    return '';
  }

  return JSON.stringify({
    teaching,
    duties,
    duty_notes,
    notes,
  });
}

/**
 * Parses remarks string from attendance_records.
 * Supports:
 * 1. JSON string format (e.g. `{"teaching":"...","duties":[...],"notes":"..."}`)
 * 2. Tagged format `[পাঠদান]: ... [ডিউটি]: ... [মন্তব্য]: ...`
 * 3. Plain legacy text strings (safely put into `notes`)
 */
export function parseDutyRemarks(raw: string | null | undefined): DutyReportDetails {
  if (!raw || !raw.trim()) {
    return { teaching: '', duties: [], duty_notes: '', notes: '' };
  }
  const str = raw.trim();

  // 1. JSON
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const obj = JSON.parse(str);
      if (obj && typeof obj === 'object') {
        return {
          teaching: typeof obj.teaching === 'string' ? obj.teaching : '',
          duties: Array.isArray(obj.duties) ? obj.duties.map(String) : [],
          duty_notes: typeof obj.duty_notes === 'string' ? obj.duty_notes : '',
          notes: typeof obj.notes === 'string' ? obj.notes : (typeof obj.general_remarks === 'string' ? obj.general_remarks : ''),
        };
      }
    } catch {}
  }

  // 2. Tagged bracket format
  const teachingMatch = str.match(/\[(?:পাঠদান|teaching)\]:\s*([^\[]+)/i);
  const dutiesMatch = str.match(/\[(?:ডিউটি|duties|duty)\]:\s*([^\[]+)/i);
  const notesMatch = str.match(/\[(?:মন্তব্য|notes|remarks)\]:\s*([^\[]+)/i);

  if (teachingMatch || dutiesMatch || notesMatch) {
    const rawDuties = dutiesMatch ? dutiesMatch[1].trim() : '';
    const dutiesList = rawDuties ? rawDuties.split(',').map(s => s.trim()).filter(Boolean) : [];
    return {
      teaching: teachingMatch ? teachingMatch[1].trim() : '',
      duties: dutiesList,
      duty_notes: '',
      notes: notesMatch ? notesMatch[1].trim() : '',
    };
  }

  // 3. Fallback: plain text
  return {
    teaching: '',
    duties: [],
    duty_notes: '',
    notes: str,
  };
}
