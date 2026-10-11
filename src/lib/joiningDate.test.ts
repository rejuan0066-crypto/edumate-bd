import { describe, it, expect } from 'vitest';
import { isFutureJoiningDate } from './joiningDate';

describe('isFutureJoiningDate', () => {
  const today = '2026-10-11';

  it('rejects a future joining date (the 07/10/2026-style typo case)', () => {
    expect(isFutureJoiningDate('2026-10-12', today)).toBe(true);
    expect(isFutureJoiningDate('2027-01-01', today)).toBe(true);
  });

  it('allows today and past dates', () => {
    expect(isFutureJoiningDate('2026-10-11', today)).toBe(false);
    expect(isFutureJoiningDate('2022-01-01', today)).toBe(false);
  });

  it('allows empty/missing date (required-check handles that separately)', () => {
    expect(isFutureJoiningDate('', today)).toBe(false);
    expect(isFutureJoiningDate(null, today)).toBe(false);
  });
});
