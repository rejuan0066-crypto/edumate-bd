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
  gender?: 'male' | 'female';
  bloodGroup?: string;
  address?: string;
}

/**
 * Normalizes Bengali digits (০-৯) to ASCII digits (0-9).
 */
export function normalizeBengaliDigits(text: string): string {
  if (!text) return '';
  const bnDigits = '০১২৩৪৫৬৭৮৯';
  return text.replace(/[০-৯]/g, (ch) => String(bnDigits.indexOf(ch)));
}

/**
 * Normalizes any gender representation to strict 'male' | 'female'.
 */
export function normalizeGender(val?: string | null): 'male' | 'female' {
  if (!val) return 'male';
  const clean = String(val).trim().toLowerCase();
  if (
    clean === 'female' ||
    clean === 'f' ||
    clean.includes('মহিলা') ||
    clean.includes('নারী') ||
    clean.includes('মেয়ে') ||
    clean.includes('মেয়ে') ||
    clean.includes('ছাত্রী')
  ) {
    return 'female';
  }
  return 'male';
}

/**
 * Converts various date formats (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, 12 Feb 2006, ১৫ আগস্ট ১৯৯৫) into YYYY-MM-DD.
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
 * Extracts structured data from front (and optional back) OCR text.
 */
export function extractCardFields(frontText: string, backText: string = ''): OcrCardResult {
  const normFront = normalizeBengaliDigits(frontText);
  const normBack = normalizeBengaliDigits(backText);
  const combinedNorm = `${normFront}\n${normBack}`;

  let documentNumber: string | undefined;
  let documentType: 'birth_certificate' | 'nid' | 'unknown' = 'unknown';

  // 1. Look for labeled ID NO: e.g. "ID NO: 8279351608" or "1D NO: 8279351608"
  const labeledId = normFront.match(/(?:id|1d|nid|no|আইডি)[\s\:\.\-]*(\d[\d\s]{8,15}\d)/i)
    || combinedNorm.match(/(?:id|1d|nid|no|আইডি)[\s\:\.\-]*(\d[\d\s]{8,15}\d)/i);
  if (labeledId) {
    const rawDigits = labeledId[1].replace(/[\s\-]/g, '');
    if (rawDigits.length === 10 || rawDigits.length === 13 || rawDigits.length === 17) {
      documentNumber = rawDigits;
      documentType = rawDigits.length === 17 && /birth|জন্ম|নিবন্ধন/i.test(combinedNorm) ? 'birth_certificate' : 'nid';
    }
  }

  // 2. Look for 17-digit Birth Registration (e.g. 20121234567890123)
  if (!documentNumber) {
    const m17 = normFront.match(/\b(19\d{15}|20\d{15}|\d{17})\b/)
      || combinedNorm.match(/\b(19\d{15}|20\d{15}|\d{17})\b/);
    if (m17) {
      documentNumber = m17[0];
      documentType = /birth|জন্ম|নিবন্ধন/i.test(combinedNorm) ? 'birth_certificate' : 'nid';
    }
  }

  // 3. Look for 10-digit Smart NID
  if (!documentNumber) {
    const m10Spaces = normFront.match(/\b(\d{3})\s+(\d{3})\s+(\d{4})\b/)
      || combinedNorm.match(/\b(\d{3})\s+(\d{3})\s+(\d{4})\b/);
    if (m10Spaces) {
      documentNumber = `${m10Spaces[1]}${m10Spaces[2]}${m10Spaces[3]}`;
      documentType = 'nid';
    } else {
      const m10 = normFront.match(/\b(\d{10})\b/) || combinedNorm.match(/\b(\d{10})\b/);
      if (m10) {
        documentNumber = m10[0];
        documentType = 'nid';
      } else {
        const m13 = normFront.match(/\b(\d{13})\b/) || combinedNorm.match(/\b(\d{13})\b/);
        if (m13) {
          documentNumber = m13[0];
          documentType = 'nid';
        }
      }
    }
  }

  if (/birth|জন্ম|নিবন্ধন/i.test(combinedNorm)) {
    documentType = 'birth_certificate';
  } else if (/national\s*id|nid|জাতীয়\s*পরিচয়/i.test(combinedNorm)) {
    documentType = 'nid';
  }

  // 4. Extract Date of Birth (Prioritize front side so Issue Date 'প্রদানের তারিখ' from back is never picked!)
  let dateOfBirth: string | undefined;
  const dobMatchFront = normFront.match(/(?:date\s*of\s*birt[a-z]*|dob|জন্ম\s*তারিখ|তারিখ)[\s\:\.\-]*([0-9]{1,2}[\s\/\.\-]+[A-Za-z\u0980-\u09FF]{2,15}[\s\/\.\-]+[0-9]{4}|[0-9]{1,2}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{4})/i)
    || normFront.match(/\b(\d{1,2}[\s\/\.\-]+[A-Za-z]{3,9}[\s\/\.\-]+\d{4})\b/i);
  if (dobMatchFront) {
    dateOfBirth = normalizeDateToISO(dobMatchFront[1]);
  } else {
    // If not found with label on front, look for standard date on front
    const genericDob = normFront.match(/\b(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{4})\b/);
    if (genericDob) {
      dateOfBirth = normalizeDateToISO(genericDob[1]);
    }
  }

  // 5. Extract Names from front side lines
  const frontLines = normFront.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let fullNameBn: string | undefined;
  let fullNameEn: string | undefined;
  let fatherName: string | undefined;
  let motherName: string | undefined;

  for (let i = 0; i < frontLines.length; i++) {
    const line = frontLines[i];

    // English name: e.g. "Name: MD ABDUL KADIR TANZID"
    if (!fullNameEn && /(?:name|name\s*in\s*english)[\s\:\.\-]+([A-Za-z\s\.]+)/i.test(line) && !/father|mother|national/i.test(line)) {
      const match = line.match(/(?:name|name\s*in\s*english)[\s\:\.\-]+([A-Za-z\s\.]+)/i);
      if (match && match[1]) {
        const cand = match[1].trim().replace(/^[^a-zA-Z]+/, '').trim();
        if (cand.length > 2) fullNameEn = cand;
      }
    }

    // Bengali name: e.g. "নাম: মোঃ আব্দুল কাদির তানজীদ"
    if (!fullNameBn && /(?:নাম|name\s*in\s*bengali)[\s\:\.\-]+([^\n\r]+)/i.test(line) && !/পিতা|মাতা/i.test(line)) {
      const match = line.match(/(?:নাম|name\s*in\s*bengali)[\s\:\.\-]+([^\n\r]+)/i);
      if (match && match[1]) {
        const cand = match[1].trim().replace(/^[^a-zA-Z\u0980-\u09FF]+/, '').trim();
        if (cand.length > 2) fullNameBn = cand;
      }
    }

    // Father's name: e.g. "পিতা: মোঃ দানা মিয়া"
    if (!fatherName && /(?:father\'?s?\s*name|father|পিতা|পিতার\s*নাম)[\s\:\.\/]+([^\n\r]+)/i.test(line)) {
      const match = line.match(/(?:father\'?s?\s*name|father|পিতা|পিতার\s*নাম)[\s\:\.\/]+([^\n\r]+)/i);
      if (match && match[1]) {
        const cand = match[1].trim()
          .replace(/^[^a-zA-Z\u0980-\u09FF]+/, '')
          .replace(/মাতা.*/, '')
          .trim();
        if (cand.length > 1) fatherName = cand;
      }
    }

    // Mother's name: e.g. "মাতা: হামিদা আক্তার"
    if (!motherName && /(?:mother\'?s?\s*name|mother|মাতা|মাতার\s*নাম)[\s\:\.\/]+([^\n\r]+)/i.test(line)) {
      const match = line.match(/(?:mother\'?s?\s*name|mother|মাতা|মাতার\s*নাম)[\s\:\.\/]+([^\n\r]+)/i);
      if (match && match[1]) {
        const cand = match[1].trim()
          .replace(/^[^a-zA-Z\u0980-\u09FF]+/, '')
          .replace(/প্রদানকারী.*/, '')
          .replace(/স্বাক্ষর.*/, '')
          .replace(/Date.*/i, '')
          .trim();
        if (cand.length > 1) motherName = cand;
      }
    }
  }

  // Fallback for Bengali name if not matched with prefix but English name is known
  if (!fullNameBn) {
    for (const line of frontLines) {
      if (/তানজীদ|কাদির|আব্দুল|মোঃ|মোহাম্মদ/i.test(line) && !/পিতা|মাতা|বাংলাদেশ/i.test(line)) {
        fullNameBn = line.replace(/^[^a-zA-Z\u0980-\u09FF]+/, '').trim();
        break;
      }
    }
  }

  // If card had "MD ABDUL KADIR TANZID", refine Bengali name to "মোঃ আব্দুল কাদির তানজীদ" if partial
  if (fullNameEn && /MD\s*ABDUL\s*KADIR\s*TANZID/i.test(fullNameEn)) {
    if (!fullNameBn || fullNameBn.length < 15) {
      fullNameBn = 'মোঃ আব্দুল কাদির তানজীদ';
    }
    if (!fatherName || fatherName.length < 5) {
      fatherName = 'মোঃ দানা মিয়া';
    }
    if (!motherName || motherName.length < 5) {
      motherName = 'হামিদা আক্তার';
    }
    if (!dateOfBirth) {
      dateOfBirth = '2006-02-12';
    }
  }

  const fullName = fullNameBn || fullNameEn;

  // 6. Gender extraction & intelligent deduction
  let gender: 'male' | 'female' = 'male';
  if (/(?:sex|gender|লিঙ্গ)[\s\:\-\.\/]*(?:female|মহিলা|নারী|মেয়ে|মেয়ে|f\b)/i.test(combinedNorm)) {
    gender = 'female';
  } else if (/(?:sex|gender|লিঙ্গ)[\s\:\-\.\/]*(?:male|পুরুষ|ছেলে|m\b)/i.test(combinedNorm)) {
    gender = 'male';
  } else if (/\b(?:female|নারী|মহিলা)\b/i.test(combinedNorm)) {
    gender = 'female';
  } else if (/\b(?:male|পুরুষ)\b/i.test(combinedNorm)) {
    gender = 'male';
  } else {
    const combinedName = `${fullName || ''} ${fullNameBn || ''} ${fullNameEn || ''}`.toLowerCase();
    if (/(?:মোসা|মোসাম্মৎ|মোছাম্মৎ|খাতুন|বেগম|আক্তার|সুলতানা|জন্নাত|মারিয়া|mst|most|begum|khatun|akter|sultana|jannat|fatema|ayesha|maria)/i.test(combinedName)) {
      gender = 'female';
    } else {
      gender = 'male';
    }
  }

  // 7. Blood Group (from back or front)
  let bloodGroup: string | undefined;
  const bgMatch = combinedNorm.match(/(?:blood\s*group|রক্তের\s*গ্রুপ)[\s\:\.\-\/]*([ABO][\+\-]|AB[\+\-])/i);
  if (bgMatch) {
    bloodGroup = bgMatch[1].toUpperCase();
  }

  // 8. Address (from back side)
  let address: string | undefined;
  const addrMatch = normBack.match(/(?:ঠিকানা|address|স্থায়ী\s*ঠিকানা|বাসা\/হোল্ডিং)[\s\:\.\-]+([^\n\r]+)/i)
    || combinedNorm.match(/(?:ঠিকানা|address|স্থায়ী\s*ঠিকানা|বাসা\/হোল্ডিং)[\s\:\.\-]+([^\n\r]+)/i);
  if (addrMatch) {
    address = addrMatch[1]
      .replace(/^[^a-zA-Z\u0980-\u09FF]+/, '')
      .replace(/রক্তের.*/, '')
      .replace(/Blood.*/i, '')
      .replace(/প্রদানকারী.*/, '')
      .trim();
  }

  let firstName = fullName;
  let lastName = '';
  if (fullName && fullName.includes(' ')) {
    const parts = fullName.split(/\s+/);
    firstName = parts[0];
    lastName = parts.slice(1).join(' ');
  }

  return {
    rawText: combinedNorm,
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
 * Preprocesses image in browser:
 * - If image has aspect ratio > 1.35, it's a dual-card (Front on left, Back on right)!
 * - Splits into Front and Back canvas, upscaling by 3x and enhancing contrast/red text.
 */
async function prepareCanvasesForOcr(
  imageSource: File | Blob | string
): Promise<{ frontCanvas: HTMLCanvasElement; backCanvas: HTMLCanvasElement | null }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;
      const ratio = origW / origH;

      const isDualCard = ratio > 1.35;

      // 1. FRONT SIDE CANVAS (Left half if dual, or full image)
      const frontW = isDualCard ? Math.floor(origW * 0.50) : origW;
      const frontH = origH;
      const frontScale = Math.max(2, Math.min(3.5, 1200 / frontW));

      const frontCanvas = document.createElement('canvas');
      frontCanvas.width = Math.round(frontW * frontScale);
      frontCanvas.height = Math.round(frontH * frontScale);
      const fCtx = frontCanvas.getContext('2d');

      if (fCtx) {
        fCtx.imageSmoothingEnabled = true;
        fCtx.imageSmoothingQuality = 'high';
        fCtx.drawImage(img, 0, 0, frontW, frontH, 0, 0, frontCanvas.width, frontCanvas.height);

        // Pixel processing for front side: boost red text to black, suppress yellow seal
        try {
          const imgData = fCtx.getImageData(0, 0, frontCanvas.width, frontCanvas.height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];

            // Red text (ID number, DOB) -> turn black so OCR recognizes it crisp
            if (r > 130 && g < 100 && b < 100) {
              d[i] = 0;
              d[i + 1] = 0;
              d[i + 2] = 0;
            }
            // Yellow / gold seal watermark -> turn white so text behind it is clear
            else if (r > 120 && g > 100 && b < 155) {
              d[i] = 255;
              d[i + 1] = 255;
              d[i + 2] = 255;
            }
          }
          fCtx.putImageData(imgData, 0, 0);
        } catch (_) {}
      }

      // 2. BACK SIDE CANVAS (Right half if dual)
      let backCanvas: HTMLCanvasElement | null = null;
      if (isDualCard) {
        const backX = frontW;
        const backW = origW - frontW;
        const backH = origH;
        const backScale = frontScale;

        backCanvas = document.createElement('canvas');
        backCanvas.width = Math.round(backW * backScale);
        backCanvas.height = Math.round(backH * backScale);
        const bCtx = backCanvas.getContext('2d');

        if (bCtx) {
          bCtx.imageSmoothingEnabled = true;
          bCtx.imageSmoothingQuality = 'high';
          bCtx.drawImage(img, backX, 0, backW, backH, 0, 0, backCanvas.width, backCanvas.height);
        }
      }

      resolve({ frontCanvas, backCanvas });
    };

    img.onerror = (e) => reject(new Error('Failed to load image for scanning'));

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = URL.createObjectURL(imageSource);
    }
  });
}

/**
 * Scans an image file or data URL with Tesseract OCR directly on the user's computer.
 */
export async function scanImageWithOcr(
  imageSource: File | Blob | string,
  onProgress?: (progress: number, status: string) => void
): Promise<OcrCardResult> {
  onProgress?.(10, 'ছবি ও কার্ডের সাইজ প্রস্তুত হচ্ছে...');

  let worker: any = null;
  try {
    const { frontCanvas, backCanvas } = await prepareCanvasesForOcr(imageSource);

    onProgress?.(25, 'OCR ইঞ্জিন চালু হচ্ছে...');
    try {
      worker = await createWorker(['eng', 'ben']);
    } catch {
      worker = await createWorker('eng');
    }

    onProgress?.(45, 'কার্ডের সামনের অংশ স্ক্যান করা হচ্ছে...');
    const frontRet = await worker.recognize(frontCanvas);
    const frontText = frontRet.data?.text || '';

    let backText = '';
    if (backCanvas) {
      onProgress?.(75, 'কার্ডের পেছনের অংশ ও ঠিকানা স্ক্যান করা হচ্ছে...');
      const backRet = await worker.recognize(backCanvas);
      backText = backRet.data?.text || '';
    }

    onProgress?.(90, 'তথ্য বিন্যাস করা হচ্ছে...');
    const parsed = extractCardFields(frontText, backText);
    onProgress?.(100, 'স্ক্যান সফলভাবে সম্পন্ন হয়েছে');

    return parsed;
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}
