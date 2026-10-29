import { supabase } from '@/integrations/supabase/client';
import { deduplicateRepeatedWords, cleanStaffName, normalizeStaffName } from './nameFormatter';

let hasRunInCurrentSession = false;

// Official original Staff IDs mapped by normalized name and keywords
const KNOWN_STAFF_ORIGINAL_IDS: Record<string, string> = {
  'ফারহান হোসাইন': 'TCH-2026-2007',
  'সাইদুর রহমান': 'TCH-2026-2004',
  'মুখতার হোসাইন': 'TCH-2026-2006',
  'মঈনুল ইসলাম': 'TCH-2026-2008',
  'আবুল বাশার': 'TCH-2026-2009',
  'শাহিনুর রহমান': 'TCH-2026-2005',
  'ইমামুল ইসলাম': 'TCH-2026-2012',
  'শহীদ আহমদ': 'TCH-2026-2010',
  'আল ইয়ামিন': 'TCH-2026-2013',
  'আল-ইয়ামিন': 'TCH-2026-2013',
  'আল আমিন': 'TCH-2026-2013',
  'আল-আমিন': 'TCH-2026-2013',
  'সাইফুর রহমান': 'TCH-2026-2011',
  'কামরুল ইসলাম': 'TCH-2026-2014',
  'আরিফুল ইসলাম': 'TCH-2026-2016',
  'আব্দুল কাদির তানজীদ': 'TCH-2026-2017',
  'আব্দুল কাদির তানজিদ': 'TCH-2026-2017',
  'তানজীদ': 'TCH-2026-2017',
  'তানজিদ': 'TCH-2026-2017',
  'আব্দুল কাদির': 'TCH-2026-2017',
  'আসাদুল রহমান': 'STF-2026-4001',
  'কুতুব উদ্দিন': 'OFF-2026-3001',
  'তেরা মিয়া': 'OFF-2026-3002',
  'তোফা মিয়া': 'OFF-2026-3002',
  'তোপা মিয়া': 'OFF-2026-3002',
  'শামিম আহমদ': 'CH-2026-5004',
  'সুলতান আহমদ': 'CH-2026-5003',
};

function findExpectedOriginalId(nameBn: string | null | undefined): string | null {
  if (!nameBn) return null;
  const cleaned = deduplicateRepeatedWords(nameBn);
  const norm = normalizeStaffName(cleaned);
  if (KNOWN_STAFF_ORIGINAL_IDS[norm]) return KNOWN_STAFF_ORIGINAL_IDS[norm];
  for (const [key, targetId] of Object.entries(KNOWN_STAFF_ORIGINAL_IDS)) {
    if (norm.includes(key) || cleaned.includes(key)) {
      return targetId;
    }
  }
  return null;
}

/**
 * Automatically inspects staff records in Supabase to:
 * 1. Clean any internal phrase duplication (e.g. "মাওলানাঃ ফারহান হোসাইন ফারহান হোসাইন" -> "মাওলানাঃ ফারহান হোসাইন")
 * 2. Restore any staff member's original Staff ID if it was changed
 * 3. Remove duplicate Bengali text leaked into English name fields
 * 4. Detect duplicate rows for the same person (e.g. Maulana Farhan appearing as 2 separate rows)
 *    and soft-delete the redundant row.
 */
export async function runStaffDeduplicationSync(force: boolean = false): Promise<{
  cleanedNamesCount: number;
  duplicateRowsHandled: number;
}> {
  if (hasRunInCurrentSession && !force) {
    return { cleanedNamesCount: 0, duplicateRowsHandled: 0 };
  }

  try {
    const sessionKey = 'edumate_staff_dedup_last_run_v6';
    const lastRun = sessionStorage.getItem(sessionKey);
    const now = Date.now();
    if (!force && lastRun && now - Number(lastRun) < 2 * 60 * 1000) {
      hasRunInCurrentSession = true;
      return { cleanedNamesCount: 0, duplicateRowsHandled: 0 };
    }

    // 1. Fetch active staff
    const { data: staffList, error } = await supabase
      .from('staff')
      .select('id, name_bn, name_en, staff_id, staff_category, designation, department, status, created_at, deleted_at')
      .is('deleted_at', null);

    if (error || !staffList || staffList.length === 0) {
      return { cleanedNamesCount: 0, duplicateRowsHandled: 0 };
    }

    let cleanedNamesCount = 0;
    let duplicateRowsHandled = 0;

    // 2. Fix field-level repeated words / Bengali leaking into English & Restore Original Staff IDs
    for (const s of staffList) {
      const originalBn = s.name_bn || '';
      const originalEn = s.name_en || '';

      const cleanedBn = deduplicateRepeatedWords(originalBn);
      const cleaned = cleanStaffName(cleanedBn, originalEn);

      const targetBn = cleaned.name_bn || cleanedBn;
      const targetEn = cleaned.has_distinct_english ? cleaned.name_en : null;

      const bnChanged = targetBn !== originalBn;
      const enChanged = targetEn !== originalEn;

      if (bnChanged || enChanged) {
        const { error: updateErr } = await supabase
          .from('staff')
          .update({
            name_bn: targetBn,
            name_en: targetEn,
          })
          .eq('id', s.id);

        if (!updateErr) {
          cleanedNamesCount++;
          s.name_bn = targetBn;
          s.name_en = targetEn;
        }
      }

      // Restore official original Staff ID
      const expectedOriginalId = findExpectedOriginalId(targetBn || s.name_bn);
      if (expectedOriginalId && s.staff_id !== expectedOriginalId) {
        const { error: idRestoreErr } = await supabase
          .from('staff')
          .update({ staff_id: expectedOriginalId })
          .eq('id', s.id);

        if (!idRestoreErr) {
          cleanedNamesCount++;
          console.log(`[StaffDeduplicationSync] Restored original staff_id for "${s.name_bn}": ${s.staff_id} -> ${expectedOriginalId}`);
          s.staff_id = expectedOriginalId;
        } else {
          console.warn(`[StaffDeduplicationSync] Failed to restore staff_id for "${s.name_bn}":`, idRestoreErr);
        }
      } else if (
        s.staff_id &&
        s.staff_id.startsWith('STF-') &&
        (s.staff_category === 'teacher_hifz' ||
          s.staff_category === 'teacher' ||
          s.staff_category === 'teacher_nurani_kitab' ||
          (s.designation || '').includes('হিফয') ||
          (s.designation || '').includes('হিফজ') ||
          (s.designation || '').includes('শিক্ষক'))
      ) {
        // Repair any teacher whose staff_id was accidentally prefixed with STF-
        const repairedId = s.staff_id
          .replace(/^STF-(\d{4})-4(\d{3})$/, 'TCH-$1-2$2')
          .replace(/^STF-/, 'TCH-');
        const { error: idErr } = await supabase.from('staff').update({ staff_id: repairedId }).eq('id', s.id);
        if (!idErr) {
          cleanedNamesCount++;
          s.staff_id = repairedId;
        }
      }
    }

    // 3. Detect duplicate rows for the same person (e.g. Maulana Farhan appearing 2 times)
    const normalizedGroups = new Map<string, typeof staffList>();
    for (const s of staffList) {
      const norm = normalizeStaffName(s.name_bn);
      if (!norm) continue;

      if (!normalizedGroups.has(norm)) {
        normalizedGroups.set(norm, []);
      }
      normalizedGroups.get(norm)!.push(s);
    }

    // Inspect any group that has more than 1 record
    for (const [norm, group] of normalizedGroups.entries()) {
      if (group.length > 1) {
        // Sort: canonical record first (prefer record with valid staff_id, earlier created_at)
        group.sort((a, b) => {
          const aHasId = !!(a.staff_id && !a.staff_id.startsWith('temp_'));
          const bHasId = !!(b.staff_id && !b.staff_id.startsWith('temp_'));
          if (aHasId && !bHasId) return -1;
          if (!aHasId && bHasId) return 1;

          const aDate = new Date(a.created_at || 0).getTime();
          const bDate = new Date(b.created_at || 0).getTime();
          return aDate - bDate;
        });

        // The first record is canonical; remaining records are duplicates
        const canonical = group[0];
        const duplicates = group.slice(1);

        for (const dup of duplicates) {
          // Soft-delete duplicate so it never shows up in any queries
          const { error: dupErr } = await supabase
            .from('staff')
            .update({
              status: 'inactive',
              deleted_at: new Date().toISOString(),
            })
            .eq('id', dup.id);

          if (!dupErr) {
            duplicateRowsHandled++;
            console.log(`[StaffDeduplicationSync] Soft-deleted duplicate staff: "${dup.name_bn}" (${dup.id}), kept canonical "${canonical.name_bn}" (${canonical.id})`);
          }
        }
      }
    }

    sessionStorage.setItem(sessionKey, String(now));
    hasRunInCurrentSession = true;

    return { cleanedNamesCount, duplicateRowsHandled };
  } catch (err) {
    console.warn('[StaffDeduplicationSync] Error running deduplication:', err);
    return { cleanedNamesCount: 0, duplicateRowsHandled: 0 };
  }
}
