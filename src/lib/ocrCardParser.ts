import { createWorker } from 'tesseract.js';

export interface OcrCardResult {
  rawText: string;
  documentNumber?: string;
  documentType: 'birth_certificate' | 'nid' | 'unknown';
  fullName?: string;
  fullNameBn?: string;
  fullNameEn?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  fatherName?: string;
  motherName?: string;
  gender?: string;
  bloodGroup?: string;
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
 * Converts various date formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, 15 Aug 1995, ১৫ আগস্ট ১৯৯৫) into YYYY-MM-DD.
 */
export function normalizeDateToISO(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  const clean = normalizeBengaliDigits(dateStr).trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const ymd = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // English & Bengali month names
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    // Bengali months / prefixes
    'জানু': '01', 'ফেব্রু': '02', 'মার্চ': '03', 'এপ্রি': '04', 'মে': '05', 'জুন': '06',
    'জুলা': '07', 'আগ': '08', 'সেপ্টে': '09', 'অক্টো': '10', 'নভে': '11', 'ডিসে': '12'
  };

  const namedDate = clean.match(/(\d{1,2})[\s\,\.\-]+([a-zA-Z\u0980-\u09FF]{2,15})[\s\,\.\-]+(\d{4})/i);
  if (namedDate) {
    const [, d, mon, y] = namedDate;
    const lowerMon = mon.toLowerCase();
    for (const [k, v] of Object.entries(monthMap)) {
      if (lowerMon.includes(k)) {
        return `${y}-${v}-${d.padStart(2, '0')}`;
      }
    }
  }

  return undefined;
}

/**
 * Extracts structured data (17-digit birth reg, 10/13/17-digit NID, names, DOB, address) from OCR text.
 */
export function extractCardFields(text: string): OcrCardResult {
  const norm = normalizeBengaliDigits(text);
  const lines = norm.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let documentNumber: string | undefined;
  let documentType: 'birth_certificate' | 'nid' | 'unknown' = 'unknown';

  // 1. Look for labeled ID NO / NID: e.g. "ID NO: 461 234 5678" or "NID NO: 1234567890"
  const labeledId = norm.match(/(?:nid|id\s*no|national\s*id|birth\s*reg|নিবন্ধন\s*নম্বর)[\s\:\-\.]*(\d[\d\s\-]{8,24}\d)/i);
  if (labeledId) {
    const rawDigits = labeledId[1].replace(/[\s\-]/g, '');
    if (rawDigits.length === 10 || rawDigits.length === 13 || rawDigits.length === 17) {
      documentNumber = rawDigits;
      documentType = rawDigits.length === 17 && /birth|জন্ম|নিবন্ধন/i.test(norm) ? 'birth_certificate' : 'nid';
    }
  }

  // 2. Look for 17-digit Birth Registration or NID (e.g. 20121234567890123 or with spaces)
  if (!documentNumber) {
    const m17WithSpaces = norm.match(/\b(19\d{2}|20\d{2})[\s\-]*\d{4}[\s\-]*\d{5}[\s\-]*\d{4}\b/);
    if (m17WithSpaces) {
      documentNumber = m17WithSpaces[0].replace(/[\s\-]/g, '');
      documentType = 'birth_certificate';
    } else {
      const m17 = norm.match(/\b(19\d{15}|20\d{15}|\d{17})\b/);
      if (m17) {
        documentNumber = m17[0];
        documentType = /birth|জন্ম|নিবন্ধন/i.test(norm) ? 'birth_certificate' : 'nid';
      }
    }
  }

  // 3. Look for 10-digit Smart NID (often printed as xxx xxx xxxx or xxxxxxxxxx)
  if (!documentNumber) {
    const m10Spaces = norm.match(/\b(\d{3})\s+(\d{3})\s+(\d{4})\b/);
    if (m10Spaces) {
      documentNumber = `${m10Spaces[1]}${m10Spaces[2]}${m10Spaces[3]}`;
      documentType = 'nid';
    } else {
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
  }

  // If text mentions "Birth" or "জন্ম", prioritize birth certificate
  if (/birth|জন্ম|নিবন্ধন/i.test(norm)) {
    documentType = 'birth_certificate';
  } else if (/national\s*id|nid|জাতীয়\s*পরিচয়/i.test(norm)) {
    documentType = 'nid';
  }

  // 4. Extract Date of Birth
  let dateOfBirth: string | undefined;
  const dobMatch = norm.match(/(?:date\s*of\s*birth|dob|জন্ম\s*তারিখ|তারিখ)[\s\:\-\.]*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{4}|[0-9]{4}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{1,2}|[0-9]{1,2}[\s\,\.\-]+[a-zA-Z\u0980-\u09FF]{2,15}[\s\,\.\-]+[0-9]{4})/i)
    || norm.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})\b/);
  if (dobMatch) {
    dateOfBirth = normalizeDateToISO(dobMatch[1]);
  }

  // 5. Extract Names (Bengali, English, Father, Mother)
  let fullName: string | undefined;
  let fullNameBn: string | undefined;
  let fullNameEn: string | undefined;
  let fatherName: string | undefined;
  let motherName: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Candidate for Bengali name: e.g. "নাম: ..." or "নাম (বাংলায়): ..."
    if (!fullNameBn && /(?:নাম|name\s*in\s*bengali)[\s\:\-\.\(\)বাংলায়]*(.+)/i.test(line)) {
      const match = line.match(/(?:নাম|name\s*in\s*bengali)[\s\:\-\.\(\)বাংলায়]*(.+)/i);
      if (match && match[1]) {
        const candidate = match[1].trim().replace(/[^a-zA-Z\u0980-\u09FF\s\.]/g, '').trim();
        if (candidate.length > 2 && !/father|mother|পিতা|মাতা/i.test(candidate)) {
          fullNameBn = candidate;
        }
      }
    }

    // Candidate for English name: e.g. "Name: ..." or "Name in English: ..."
    if (!fullNameEn && /(?:name|name\s*in\s*english)[\s\:\-\.\(\)ইংরেজিতে]*(.+)/i.test(line) && !/father|mother|পিতা|মাতা/i.test(line)) {
      const match = line.match(/(?:name|name\s*in\s*english)[\s\:\-\.\(\)ইংরেজিতে]*(.+)/i);
      if (match && match[1]) {
        const candidate = match[1].trim().replace(/[^a-zA-Z\u0980-\u09FF\s\.]/g, '').trim();
        if (candidate.length > 2 && !/father|mother|পিতা|মাতা/i.test(candidate)) {
          fullNameEn = candidate;
        }
      }
    }

    // Candidate for Father's name
    if (!fatherName && /(?:father\'?s?\s*name|father|পিতা|পিতার\s*নাম)[\s\:\-\.\/]*(.+)/i.test(line)) {
      const match = line.match(/(?:father\'?s?\s*name|father|পিতা|পিতার\s*নাম)[\s\:\-\.\/]*(.+)/i);
      if (match && match[1]) {
        const candidate = match[1].trim().replace(/[^a-zA-Z\u0980-\u09FF\s\.]/g, '').trim();
        if (candidate.length > 2 && !/mother|nationality|জাতীয়তা/i.test(candidate)) {
          fatherName = candidate;
        }
      }
    }

    // Candidate for Mother's name
    if (!motherName && /(?:mother\'?s?\s*name|mother|মাতা|মাতার\s*নাম)[\s\:\-\.\/]*(.+)/i.test(line)) {
      const match = line.match(/(?:mother\'?s?\s*name|mother|মাতা|মাতার\s*নাম)[\s\:\-\.\/]*(.+)/i);
      if (match && match[1]) {
        const candidate = match[1].trim().replace(/[^a-zA-Z\u0980-\u09FF\s\.]/g, '').trim();
        if (candidate.length > 2 && !/father|nationality|জাতীয়তা/i.test(candidate)) {
          motherName = candidate;
        }
      }
    }
  }

  // Fallback fullName logic
  fullName = fullNameBn || fullNameEn;

  // 6. Gender
  let gender: string | undefined;
  if (/female|নারী|মহিলা/i.test(norm)) {
    gender = 'female';
  } else if (/male|পুরুষ/i.test(norm)) {
    gender = 'male';
  }

  // 7. Blood Group
  let bloodGroup: string | undefined;
  const bgMatch = norm.match(/(?:blood\s*group|রক্তের\s*গ্রুপ)[\s\:\-\.]*([ABO][\+\-]|AB[\+\-])/i);
  if (bgMatch) {
    bloodGroup = bgMatch[1].toUpperCase();
  }

  // 8. Address
  let address: string | undefined;
  const addrMatch = norm.match(/(?:address|ঠিকানা|স্থায়ী\s*ঠিকানা|বাসা\/হোল্ডিং)[\s\:\-\.]([\s\S]+?)(?=\b(?:blood|issue|বিভাগ|গণপ্রজাতন্ত্রী|$))/i);
  if (addrMatch) {
    address = addrMatch[1].replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
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
    fullNameBn,
    fullNameEn,
    firstName,
    lastName,
    dateOfBirth,
    fatherName,
    motherName,
    gender,
    bloodGroup,
    address,
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

  let worker: any = null;
  try {
    // Try bilingual (eng + ben) first for accurate Bangladeshi ID detection
    try {
      worker = await createWorker(['eng', 'ben']);
    } catch {
      // Fallback to English only
      worker = await createWorker('eng');
    }

    onProgress?.(40, 'ছবি থেকে লেখা স্ক্যান করা হচ্ছে...');
    const ret = await worker.recognize(imageSource);
    onProgress?.(90, 'তথ্য বিশ্লেষণ করা হচ্ছে...');

    const parsed = extractCardFields(ret.data.text);
    onProgress?.(100, 'স্ক্যান সম্পন্ন হয়েছে');

    return parsed;
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}
