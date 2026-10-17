import { describe, it, expect } from 'vitest';
import {
  parseDutyRemarks,
  encodeDutyRemarks,
  DUTY_PRESETS,
} from './staffDutyReportHelper';

describe('staffDutyReportHelper', () => {
  it('should parse JSON duty remarks correctly', () => {
    const jsonStr = JSON.stringify({
      teaching: '৮ম শ্রেণি - গণিত (অধ্যায় ৩)',
      duties: ['পরীক্ষা গার্ড', 'হোস্টেল তদারকি'],
      duty_notes: 'হল রুম ২',
      notes: 'সবকিছু ঠিকঠাক ছিল',
    });

    const parsed = parseDutyRemarks(jsonStr);
    expect(parsed.teaching).toBe('৮ম শ্রেণি - গণিত (অধ্যায় ৩)');
    expect(parsed.duties).toEqual(['পরীক্ষা গার্ড', 'হোস্টেল তদারকি']);
    expect(parsed.duty_notes).toBe('হল রুম ২');
    expect(parsed.notes).toBe('সবকিছু ঠিকঠাক ছিল');
  });

  it('should fallback plain text legacy remarks to notes', () => {
    const plain = 'সাধারণ ডিউটি সম্পন্ন';
    const parsed = parseDutyRemarks(plain);
    expect(parsed.teaching).toBe('');
    expect(parsed.duties).toEqual([]);
    expect(parsed.notes).toBe('সাধারণ ডিউটি সম্পন্ন');
  });

  it('should parse tagged format correctly', () => {
    const tagged = '[পাঠদান]: ৯ম শ্রেণি বিজ্ঞান [ডিউটি]: পরীক্ষা গার্ড, হোস্টেল তদারকি [মন্তব্য]: স্বাভাবিক';
    const parsed = parseDutyRemarks(tagged);
    expect(parsed.teaching).toBe('৯ম শ্রেণি বিজ্ঞান');
    expect(parsed.duties).toEqual(['পরীক্ষা গার্ড', 'হোস্টেল তদারকি']);
    expect(parsed.notes).toBe('স্বাভাবিক');
  });

  it('should round-trip encode and decode duty remarks', () => {
    const original = {
      teaching: '৭ম শ্রেণি - আরবি ১ম পত্র',
      duties: ['নামাজ জামাত তদারকি', 'খাবার ও ডাইনিং তদারকি'],
      duty_notes: 'যোহর ও আসর তদারকি',
      notes: 'কোনো সমস্যা পাওয়া যায়নি',
    };

    const encoded = encodeDutyRemarks(original);
    const decoded = parseDutyRemarks(encoded);

    expect(decoded.teaching).toBe(original.teaching);
    expect(decoded.duties).toEqual(original.duties);
    expect(decoded.duty_notes).toBe(original.duty_notes);
    expect(decoded.notes).toBe(original.notes);
  });

  it('should return empty string when encoding completely empty data', () => {
    expect(encodeDutyRemarks({ teaching: '', duties: [], duty_notes: '', notes: '' })).toBe('');
  });

  it('should provide presets with bangla labels and icons', () => {
    expect(DUTY_PRESETS.length).toBeGreaterThan(5);
    expect(DUTY_PRESETS.some(p => p.id === 'exam_guard')).toBe(true);
    expect(DUTY_PRESETS.some(p => p.id === 'hostel_duty')).toBe(true);
  });
});
