import { createWorker } from 'tesseract.js';

export interface OcrCardResult {
  rawText: string;
  documentNumber?: string;
  documentType: 'birth_certificate' | 'nid' | 'unknown';
  fullName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  fatherName?: string;
  motherName?: string;
  gender?: string;
  address?: string;
}

/**
 * Normalizes Bengali digits (০-৯) to ASCII digits (0-9).
 */
export function normalizeBengaliDigits(text: string): string {
  const bnDigits = '০১২৩৪৫৬৭৮৯';
  return text.replace(/[০-৯]/g, (ch) => String(bnDigits.indexOf(ch)));
}

/**
 * Converts various date formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, 15 Aug 2012) into YYYY-MM-DD.
 */
export function normalizeDateToISO(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  const clean = normalizeBengaliDigits(dateStr).trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const ymd = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Month names (e.g. 15 Aug 2012, 15 August 2012)
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const namedDate = clean.match(/(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})/i);
  if (namedDate) {
    const [, d, mon, y] = namedDate;
    const m = monthMap[mon.slice(0, 3).toLowerCase()];
    if (m) {
      return `${y}-${m}-${d.padStart(2, '0')}`;
    }
  }

  return undefined;
}

/**
 * Extracts structured data (17-digit birth reg, 10/13/17-digit NID, names, DOB) from OCR text.
 */
export function extractCardFields(text: string): OcrCardResult {
  const norm = normalizeBengaliDigits(text);
  const lines = norm.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let documentNumber: string | undefined;
  let documentType: 'birth_certificate' | 'nid' | 'unknown' = 'unknown';

  // 1. Look for 17-digit Birth Registration Number
  // Often starts with year (e.g. 19xx or 20xx) followed by 13 digits
  const m17 = norm.match(/\b(19\d{15}|20\d{15}|\d{17})\b/);
  if (m17) {
    documentNumber = m17[0];
    documentType = 'birth_certificate';
  } else {
    // 2. Look for 10-digit Smart NID or 13/17-digit legacy NID
    const m10 = norm.match(/\b(\d{10})\b/);
    if (m10) {
      documentNumber = m10[0];
      documentType = 'nid';
    } else {
      const m13 = norm.match(/\b(\d{13})\b/);
      if (m13) {
        documentNumber = m13[0];
        documentType = 'nid';
      }
    }
  }

  // If text mentions "Birth" or "জন্ম", prioritize birth certificate
  if (/birth|জন্ম|নিবন্ধন/i.test(norm)) {
    documentType = 'birth_certificate';
  } else if (/national\s*id|nid|জাতীয়\s*পরিচয়/i.test(norm)) {
    documentType = 'nid';
  }

  // 3. Extract Date of Birth
  let dateOfBirth: string | undefined;
  const dobMatch = norm.match(/(?:date\s*of\s*birth|dob|জন্ম\s*তারিখ)[\s\:\-\.]+([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4}|[0-9]{4}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{1,2}|[0-9]{1,2}\s+[a-zA-Z]{3,9}\s+[0-9]{4})/i)
    || norm.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\b/);
  if (dobMatch) {
    dateOfBirth = normalizeDateToISO(dobMatch[1]);
  }

  // 4. Extract Names
  let fullName: string | undefined;
  let fatherName: string | undefined;
  let motherName: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Candidate for person's name
    if (!fullName && /^(?:name|নাম)[\s\:\-\.](.+)/i.test(line)) {
      const match = line.match(/^(?:name|নাম)[\s\:\-\.](.+)/i);
      if (match && match[1]) {
        const candidate = match[1].trim().replace(/[^a-zA-Z\u0980-\u09FF\s\.]/g, '');
        if (candidate.length > 2) fullName = candidate;
      }
    }

    // Candidate for Father's name
    if (!fatherName && /(?:father|পিতা|পিতার\s*নাম)[\s\:\-\.](.+)/i.test(line)) {
      const match = line.match(/(?:father|পিতা|পিতার\s*নাম)[\s\:\-\.](.+)/i);
      if (match && match[1]) {
        const candidate = match[1].trim().replace(/[^a-zA-Z\u0980-\u09FF\s\.]/g, '');
        if (candidate.length > 2) fatherName = candidate;
      }
    }

    // Candidate for Mother's name
    if (!motherName && /(?:mother|মাতা|মাতার\s*নাম)[\s\:\-\.](.+)/i.test(line)) {
      const match = line.match(/(?:mother|মাতা|মাতার\s*নাম)[\s\:\-\.](.+)/i);
      if (match && match[1]) {
        const candidate = match[1].trim().replace(/[^a-zA-Z\u0980-\u09FF\s\.]/g, '');
        if (candidate.length > 2) motherName = candidate;
      }
    }
  }

  // 5. Gender
  let gender: string | undefined;
  if (/female|নারী|মহিলা/i.test(norm)) {
    gender = 'female';
  } else if (/male|পুরুষ/i.test(norm)) {
    gender = 'male';
  }

  let firstName = fullName;
  let lastName = '';
  if (fullName && fullName.includes(' ')) {
    const parts = fullName.split(/\s+/);
    firstName = parts[0];
    lastName = parts.slice(1).join(' ');
  }

  return {
    rawText: text,
    documentNumber,
    documentType,
    fullName,
    firstName,
    lastName,
    dateOfBirth,
    fatherName,
    motherName,
    gender,
  };
}

/**
 * Scans an image file or data URL with Tesseract OCR directly on the user's computer.
 */
export async function scanImageWithOcr(
  imageSource: File | Blob | string,
  onProgress?: (progress: number, status: string) => void
): Promise<OcrCardResult> {
  onProgress?.(10, 'OCR ইঞ্জিন প্রস্তুত হচ্ছে...');
  
  // Use English first (standard for digits, NID & BDRIS birth certificates)
  const worker = await createWorker('eng');

  try {
    onProgress?.(40, 'ছবি থেকে লেখা স্ক্যান করা হচ্ছে...');
    
    const ret = await worker.recognize(imageSource);
    onProgress?.(90, 'তথ্য বিশ্লেষণ করা হচ্ছে...');

    const parsed = extractCardFields(ret.data.text);
    onProgress?.(100, 'স্ক্যান সম্পন্ন হয়েছে');

    return parsed;
  } finally {
    await worker.terminate();
  }
}
