/**
 * Convert a number to Bengali words for money receipts.
 * e.g., 1250 → "এক হাজার দুইশত পঞ্চাশ টাকা মাত্র"
 */

const ones = ['', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়'];

// Full lookup for 0-99 (Bangla compound numbers are irregular)
const below100: string[] = [
  'শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়',
  'দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ',
  'বিশ', 'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আঠাশ', 'ঊনত্রিশ',
  'ত্রিশ', 'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁইত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'ঊনচল্লিশ',
  'চল্লিশ', 'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছিচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'ঊনপঞ্চাশ',
  'পঞ্চাশ', 'একান্ন', 'বায়ান্ন', 'তেপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'ঊনষাট',
  'ষাট', 'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁইষট্টি', 'ছিষট্টি', 'সাতষট্টি', 'আটষট্টি', 'ঊনসত্তর',
  'সত্তর', 'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'ঊনআশি',
  'আশি', 'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'আটাশি', 'ঊননব্বই',
  'নব্বই', 'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'
];

function twoDigit(n: number): string {
  return below100[n] || '';
}

function convertBelow1000(n: number): string {
  if (n < 100) return twoDigit(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  return ones[h] + 'শত' + (r > 0 ? ' ' + twoDigit(r) : '');
}

export function numberToBanglaWords(num: number): string {
  if (num === 0) return 'শূন্য টাকা মাত্র';
  if (num < 0) return 'ঋণাত্মক ' + numberToBanglaWords(-num);

  const n = Math.floor(num);
  const parts: string[] = [];

  const crore = Math.floor(n / 10000000);
  if (crore > 0) parts.push(convertBelow1000(crore) + ' কোটি');

  const lakh = Math.floor((n % 10000000) / 100000);
  if (lakh > 0) parts.push(convertBelow1000(lakh) + ' লক্ষ');

  const thousand = Math.floor((n % 100000) / 1000);
  if (thousand > 0) parts.push(convertBelow1000(thousand) + ' হাজার');

  const hundred = Math.floor((n % 1000) / 100);
  if (hundred > 0) parts.push(ones[hundred] + 'শত');

  const remainder = n % 100;
  if (remainder > 0) parts.push(twoDigit(remainder));

  return parts.join(' ') + ' টাকা মাত্র';
}

/** Convert English digits to Bengali digits */
export function toBanglaDigits(str: string | number): string {
  const digits = '০১২৩৪৫৬৭৮৯';
  return String(str).replace(/\d/g, d => digits[parseInt(d)]);
}
