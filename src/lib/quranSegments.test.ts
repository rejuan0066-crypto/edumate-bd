import { describe, it, expect } from 'vitest';
import { groupVersesBySurah, parseVerseKey } from '@/lib/quranSegments';

const v = (key: string) => ({ id: key, verse_key: key });

describe('parseVerseKey', () => {
  it('parses a normal verse key', () => {
    expect(parseVerseKey('2:255')).toEqual([2, 255]);
  });
  it('returns [0,0] for malformed input', () => {
    expect(parseVerseKey('')).toEqual([0, 0]);
    expect(parseVerseKey('abc')).toEqual([0, 0]);
    expect(parseVerseKey(undefined as unknown as string)).toEqual([0, 0]);
  });
});

describe('groupVersesBySurah — regression: header dedup & out-of-order grouping', () => {
  it('produces ONE segment per surah even when input is in order', () => {
    const segs = groupVersesBySurah([v('2:1'), v('2:2'), v('2:3'), v('3:1'), v('3:2')]);
    expect(segs).toHaveLength(2);
    expect(segs[0].sid).toBe(2);
    expect(segs[0].verses).toHaveLength(3);
    expect(segs[1].sid).toBe(3);
    expect(segs[1].verses).toHaveLength(2);
  });

  it('does NOT create a duplicate segment when verses arrive out of order (regression)', () => {
    // Sid 2 verses are interleaved with a stray sid 3 verse — the old
    // "consecutive only" grouper would create TWO segments for sid 2 and
    // therefore render the surah header twice. New grouper must not.
    const segs = groupVersesBySurah([
      v('2:1'),
      v('3:1'),
      v('2:2'),
      v('2:3'),
      v('3:2'),
    ]);
    expect(segs).toHaveLength(2);
    const sid2 = segs.find((s) => s.sid === 2)!;
    const sid3 = segs.find((s) => s.sid === 3)!;
    expect(sid2.verses.map((x) => x.verse_key)).toEqual(['2:1', '2:2', '2:3']);
    expect(sid3.verses.map((x) => x.verse_key)).toEqual(['3:1', '3:2']);
  });

  it('sorts verses inside a surah by ayah number', () => {
    const segs = groupVersesBySurah([v('2:3'), v('2:1'), v('2:10'), v('2:2')]);
    expect(segs).toHaveLength(1);
    expect(segs[0].verses.map((x) => x.verse_key)).toEqual(['2:1', '2:2', '2:3', '2:10']);
  });

  it('sorts segments by surah id ascending', () => {
    const segs = groupVersesBySurah([v('5:1'), v('2:1'), v('3:1')]);
    expect(segs.map((s) => s.sid)).toEqual([2, 3, 5]);
  });

  it('marks startsAtAyah1 only when surah begins on this page', () => {
    const segs = groupVersesBySurah([v('2:50'), v('2:51'), v('3:1')]);
    expect(segs.find((s) => s.sid === 2)?.startsAtAyah1).toBe(false); // continuation
    expect(segs.find((s) => s.sid === 3)?.startsAtAyah1).toBe(true);  // new surah
  });

  it('drops malformed verse keys without throwing', () => {
    const segs = groupVersesBySurah([
      v('2:1'),
      { id: 'bad', verse_key: 'not-a-key' },
      v('2:2'),
      // @ts-expect-error runtime safety
      { id: 'no-key' },
    ]);
    expect(segs).toHaveLength(1);
    expect(segs[0].sid).toBe(2);
    expect(segs[0].verses).toHaveLength(2);
  });

  it('returns [] for empty input', () => {
    expect(groupVersesBySurah([])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [v('3:1'), v('2:1'), v('2:2')];
    const snapshot = input.map((x) => x.verse_key);
    groupVersesBySurah(input);
    expect(input.map((x) => x.verse_key)).toEqual(snapshot);
  });
});
