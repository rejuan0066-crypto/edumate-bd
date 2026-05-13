// Pure helpers for grouping Mushaf-page verses into surah-based segments.
// Extracted from QuranPage.tsx so it can be unit-tested in isolation.

export interface VerseLike {
  id?: number | string;
  verse_key: string; // "<sid>:<ayah>"
  // ...other Quran.com fields are intentionally permitted
  [k: string]: unknown;
}

export interface Segment<V extends VerseLike = VerseLike> {
  sid: number;
  verses: V[];
  /** True when the first verse of this segment is ayah 1 of the surah. */
  startsAtAyah1: boolean;
}

/** Safely parse a verse_key like "2:255" into [surahId, ayahNumber]. */
export const parseVerseKey = (k: string): [number, number] => {
  if (typeof k !== 'string') return [0, 0];
  const [s, a] = k.split(':');
  return [Number(s) || 0, Number(a) || 0];
};

/**
 * Group verses on a single Mushaf page by surah id.
 *
 * Guarantees:
 *  - Verses are sorted by (sid asc, ayah asc) before grouping, so
 *    out-of-order input never produces a duplicated surah segment.
 *  - Each surah on the page yields EXACTLY ONE segment — the surah header
 *    is therefore never rendered more than once per page.
 *  - Verses with malformed keys (sid === 0) are dropped silently.
 */
export function groupVersesBySurah<V extends VerseLike>(verses: V[]): Segment<V>[] {
  const sorted = [...verses].sort((a, b) => {
    const [as, av] = parseVerseKey(a.verse_key);
    const [bs, bv] = parseVerseKey(b.verse_key);
    return as - bs || av - bv;
  });

  const bySid = new Map<number, V[]>();
  for (const v of sorted) {
    const [sid] = parseVerseKey(v.verse_key);
    if (!sid) continue;
    const arr = bySid.get(sid);
    if (arr) arr.push(v);
    else bySid.set(sid, [v]);
  }

  return Array.from(bySid.entries()).map(([sid, vs]) => {
    const [, firstAyah] = parseVerseKey(vs[0].verse_key);
    return { sid, verses: vs, startsAtAyah1: firstAyah === 1 };
  });
}
