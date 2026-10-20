/**
 * Utility functions for sanitizing, formatting, and deduplicating names
 * across the application (staff, students, teachers, etc.).
 */

export function hasBangla(str: string | null | undefined): boolean {
  return /[\u0980-\u09FF]/.test(str || '');
}

export function hasEnglish(str: string | null | undefined): boolean {
  return /[a-zA-Z]/.test(str || '');
}

/**
 * Normalizes a name string for comparison purposes (lowercased, punctuation/honorific prefixes stripped).
 */
export function normalizeStaffName(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/[:ঃ\.,\-\(\)]/g, ' ')
    .replace(/\b(মাওলানা|মুয়াল্লিম|মুআল্লিম|হাফেজ|হাফিজ|মাষ্টার|মাস্টার|জনাব|মোঃ|মো|মুহাদ্দিস|মুফতি)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const cleanPunct = (s: string) => s.replace(/[:ঃ\.,\-\(\)]/g, '').trim().toLowerCase();

/**
 * Deduplicates repeated phrases or words in a name.
 * Examples:
 *   "তেরা মিয়া তেরা মিয়া" -> "তেরা মিয়া"
 *   "মাওলানাঃ ফারহান হোসাইন ফারহান হোসাইন" -> "মাওলানাঃ ফারহান হোসাইন"
 *   "মাওলানা ফারহান মাওলানা ফারহান" -> "মাওলানা ফারহান"
 *   "মাওলানা ফারহান ফারহান হোসাইন" -> "মাওলানা ফারহান হোসাইন"
 *   "মোহাম্মদ আলী মোহাম্মদ আলী" -> "মোহাম্মদ আলী"
 *   "রহিম রহিম" -> "রহিম"
 */
export function deduplicateRepeatedWords(str: string | null | undefined): string {
  if (!str) return '';
  const trimmed = str.trim().replace(/\s+/g, ' ');

  // 1. Direct regex: full phrase repetition with or without punctuation (e.g. "তেরা মিয়া তেরা মিয়া")
  const fullHalfMatch = trimmed.match(/^(.+?)[\s,:ঃ\-]+(?:\1)$/i);
  if (fullHalfMatch) {
    return fullHalfMatch[1].trim();
  }

  // 2. Direct regex: prefix + repeated multi-word phrase
  // E.g. "মাওলানাঃ ফারহান হোসাইন ফারহান হোসাইন" -> "মাওলানাঃ ফারহান হোসাইন"
  const prefixRepeatedMatch = trimmed.match(/^(.+?[\s,:ঃ]+)(.+?)[\s,:ঃ]+(?:\2)$/i);
  if (prefixRepeatedMatch) {
    return (prefixRepeatedMatch[1] + prefixRepeatedMatch[2]).trim();
  }

  const words = trimmed.split(' ');

  // 3. Check if the string is formed by repeating the exact entire half
  if (words.length >= 2 && words.length % 2 === 0) {
    const half = words.length / 2;
    const firstHalf = words.slice(0, half).join(' ');
    const secondHalf = words.slice(half).join(' ');
    if (cleanPunct(firstHalf) === cleanPunct(secondHalf)) {
      return firstHalf.trim();
    }
  }

  // 4. Consecutive adjacent duplicate words (e.g. "ফারহান ফারহান")
  const dedupedWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (i > 0 && cleanPunct(words[i]) === cleanPunct(words[i - 1])) {
      continue;
    }
    dedupedWords.push(words[i]);
  }

  // Check if first half of deduped matches second half
  if (dedupedWords.length >= 2 && dedupedWords.length % 2 === 0) {
    const half = dedupedWords.length / 2;
    const firstHalf = dedupedWords.slice(0, half).join(' ');
    const secondHalf = dedupedWords.slice(half).join(' ');
    if (cleanPunct(firstHalf) === cleanPunct(secondHalf)) {
      return firstHalf.trim();
    }
  }

  const result = dedupedWords.join(' ').trim();
  const rWords = result.split(' ');

  // 5. Repeated multi-word suffix (e.g. prefix + repeated multi-word phrase)
  for (let phraseLen = Math.floor(rWords.length / 2); phraseLen >= 1; phraseLen--) {
    const candidate = rWords.slice(rWords.length - phraseLen).join(' ');
    const before = rWords.slice(rWords.length - phraseLen * 2, rWords.length - phraseLen).join(' ');
    if (cleanPunct(candidate) === cleanPunct(before)) {
      return rWords.slice(0, rWords.length - phraseLen).join(' ').trim();
    }
  }

  // 6. Repeated multi-word prefix
  for (let phraseLen = Math.floor(rWords.length / 2); phraseLen >= 1; phraseLen--) {
    const candidate = rWords.slice(0, phraseLen).join(' ');
    const after = rWords.slice(phraseLen, phraseLen * 2).join(' ');
    if (cleanPunct(candidate) === cleanPunct(after)) {
      return (candidate + ' ' + rWords.slice(phraseLen * 2).join(' ')).trim();
    }
  }

  return result;
}

/**
 * Extracts and cleans Bengali and English names from potentially mixed or duplicated fields.
 */
export function cleanStaffName(nameBn?: string | null, nameEn?: string | null): {
  name_bn: string;
  name_en: string | null;
  has_distinct_english: boolean;
  has_distinct_bangla: boolean;
} {
  const rawBn = (nameBn || '').trim();
  const rawEn = (nameEn || '').trim();

  if (!rawBn && !rawEn) {
    return { name_bn: '', name_en: null, has_distinct_english: false, has_distinct_bangla: false };
  }

  // Check if either string contains both Bengali and English script mixed together
  // E.g. "হাফিজ আব্দুল কাদির তানজিদ Hafiz Abdul Kadir Tanjid"
  let bnCandidate = rawBn || rawEn;
  let enCandidate = rawEn || rawBn;

  let bnClean = '';
  let enClean = '';

  const mixedSource = (hasBangla(rawBn) && hasEnglish(rawBn)) ? rawBn
    : (hasBangla(rawEn) && hasEnglish(rawEn)) ? rawEn
    : null;

  if (mixedSource) {
    // Extract Bengali characters and punctuation (keep Bengali letters, spaces, standard Bengali punctuation like colon, danda)
    bnClean = mixedSource
      .replace(/[a-zA-Z0-9]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract English characters and punctuation
    enClean = mixedSource
      .replace(/[\u0980-\u09FF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    // Separate candidates
    bnClean = hasBangla(rawBn) ? rawBn : (hasBangla(rawEn) ? rawEn : '');
    enClean = hasEnglish(rawEn) ? rawEn : (hasEnglish(rawBn) ? rawBn : '');
  }

  // Deduplicate repeated words in both
  bnClean = deduplicateRepeatedWords(bnClean);
  enClean = deduplicateRepeatedWords(enClean);

  // If one of them is empty, fallback to the other
  if (!bnClean && enClean) {
    bnClean = enClean;
  }
  if (!enClean && bnClean && hasEnglish(bnClean)) {
    enClean = bnClean;
  }

  // If enClean is identical to bnClean (e.g. both stored the same Bangla string)
  if (enClean && bnClean && enClean.toLowerCase() === bnClean.toLowerCase()) {
    if (hasBangla(bnClean)) {
      enClean = ''; // It was actually Bangla stored in English field
    }
  }

  const hasDistinctEnglish = !!enClean && enClean.toLowerCase() !== bnClean.toLowerCase() && hasEnglish(enClean);
  const hasDistinctBangla = !!bnClean && bnClean.toLowerCase() !== (enClean || '').toLowerCase() && hasBangla(bnClean);

  return {
    name_bn: bnClean || rawBn || rawEn,
    name_en: hasDistinctEnglish ? enClean : null,
    has_distinct_english: hasDistinctEnglish,
    has_distinct_bangla: hasDistinctBangla,
  };
}

/**
 * Returns the primary and secondary display name for a staff member.
 * In Bengali mode (isBengali = true):
 *   - Primary is ALWAYS the clean Bengali name.
 *   - Secondary is null to avoid duplicate rows/subtitles under the name.
 * In English mode (isBengali = false):
 *   - Primary is the English name (or fallback).
 *   - Secondary is the Bengali name (only if distinct).
 */
export function getStaffDisplayNames(
  nameBn?: string | null,
  nameEn?: string | null,
  isBengali: boolean = true
): { primary: string; secondary: string | null } {
  const cleaned = cleanStaffName(nameBn, nameEn);

  if (isBengali) {
    // In Bengali version, show ONLY clean Bengali name cleanly everywhere.
    // Never show redundant secondary subtitle line.
    return {
      primary: cleaned.name_bn || cleaned.name_en || '',
      secondary: null,
    };
  } else {
    // In English version
    return {
      primary: cleaned.name_en || cleaned.name_bn || '',
      secondary: cleaned.has_distinct_bangla ? cleaned.name_bn : null,
    };
  }
}

/**
 * Convenience helper to format a staff member's name cleanly.
 * Deduplicates repeated phrases, removes English leak in Bengali mode,
 * and ensures a single consistent presentation.
 */
export function formatStaffName(
  nameBn?: string | null,
  nameEn?: string | null,
  isBengali: boolean = true
): string {
  const display = getStaffDisplayNames(nameBn, nameEn, isBengali);
  return display.primary || '';
}

/**
 * Resolves form inputs (firstName and lastName) into clean name_bn and name_en fields
 * when saving staff, teachers, directors, or applicants.
 */
export function resolveStaffFormNames(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): { name_bn: string; name_en: string | null } {
  const f = (firstName || '').trim();
  const l = (lastName || '').trim();

  // If only one is provided
  if (!f && !l) return { name_bn: '', name_en: null };
  if (!f) return resolveStaffFormNames(l, '');
  if (!l) {
    const cleaned = cleanStaffName(f, null);
    return { name_bn: cleaned.name_bn, name_en: cleaned.name_en };
  }

  // If both are identical (e.g. 'তেরা মিয়া' in first name AND 'তেরা মিয়া' in last name)
  if (f.toLowerCase() === l.toLowerCase()) {
    const single = deduplicateRepeatedWords(f);
    return hasBangla(single)
      ? { name_bn: single, name_en: hasEnglish(single) ? single : null }
      : { name_bn: single, name_en: single };
  }

  const fHasBn = hasBangla(f);
  const fHasEn = hasEnglish(f);
  const lHasBn = hasBangla(l);
  const lHasEn = hasEnglish(l);

  // Case 1: One field has Bengali, the other has English (e.g. NID scanner autofill)
  if (fHasBn && !fHasEn && lHasEn && !lHasBn) {
    return {
      name_bn: deduplicateRepeatedWords(f),
      name_en: deduplicateRepeatedWords(l),
    };
  }
  if (lHasBn && !lHasEn && fHasEn && !fHasBn) {
    return {
      name_bn: deduplicateRepeatedWords(l),
      name_en: deduplicateRepeatedWords(f),
    };
  }

  // Case 2: Both fields are Bengali (e.g. First Name: "মাওলানা", Last Name: "ফারহান হোসাইন")
  if (fHasBn && lHasBn && !fHasEn && !lHasEn) {
    let combined = '';
    const fLower = f.toLowerCase();
    const lLower = l.toLowerCase();
    if (fLower.includes(lLower)) {
      combined = f;
    } else if (lLower.includes(fLower)) {
      combined = l;
    } else {
      combined = `${f} ${l}`;
    }
    return { name_bn: deduplicateRepeatedWords(combined), name_en: null };
  }

  // Case 3: Both fields are English (e.g. First Name: "Farhan", Last Name: "Hossain")
  if (fHasEn && lHasEn && !fHasBn && !lHasBn) {
    const combined = deduplicateRepeatedWords(`${f} ${l}`);
    return { name_bn: combined, name_en: combined };
  }

  // Case 4: General mixed fallback
  const combined = deduplicateRepeatedWords(`${f} ${l}`);
  const cleaned = cleanStaffName(combined, combined);
  return {
    name_bn: cleaned.name_bn,
    name_en: cleaned.name_en,
  };
}
