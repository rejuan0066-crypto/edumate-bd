import { describe, it, expect } from 'vitest';
import {
  getStaffCategoryKey,
  getDepartmentPriority,
  getDepartmentLabel,
  sortStaffByDepartment,
} from './staffOrderHelper';

describe('staffOrderHelper', () => {
  it('identifies teacher category from explicit staff_category or designation keywords', () => {
    expect(getStaffCategoryKey({ staff_category: 'teacher' })).toBe('teacher');
    expect(getStaffCategoryKey({ designation: 'সহকারী শিক্ষক' })).toBe('teacher');
    expect(getStaffCategoryKey({ designation: 'হিফয শিক্ষক' })).toBe('teacher');
    expect(getStaffCategoryKey({ department: 'শিক্ষা বিভাগ' })).toBe('teacher');
  });

  it('identifies administrative category from designation or department', () => {
    expect(getStaffCategoryKey({ designation: 'অধ্যক্ষ' })).toBe('administrative');
    expect(getStaffCategoryKey({ designation: 'Principal' })).toBe('administrative');
    expect(getStaffCategoryKey({ department: 'প্রশাসন' })).toBe('administrative');
  });

  it('identifies support and general staff', () => {
    expect(getStaffCategoryKey({ designation: 'অফিস সহকারী' })).toBe('support');
    expect(getStaffCategoryKey({ designation: 'হিসাবরক্ষক' })).toBe('support');
    expect(getStaffCategoryKey({ designation: 'নিরাপত্তা প্রহরী' })).toBe('general');
    expect(getStaffCategoryKey({ designation: 'বাবুর্চি' })).toBe('general');
  });

  it('respects canonical department order: teacher (10) < administrative (20) < support (30) < general (40)', () => {
    expect(getDepartmentPriority('teacher')).toBeLessThan(getDepartmentPriority('administrative'));
    expect(getDepartmentPriority('administrative')).toBeLessThan(getDepartmentPriority('support'));
    expect(getDepartmentPriority('support')).toBeLessThan(getDepartmentPriority('general'));
  });

  it('sorts mixed staff list into department-wise serials', () => {
    const list = [
      { id: '1', name_bn: 'আব্দুর রহিম', designation: 'নিরাপত্তা প্রহরী', staff_id: 'GEN-01' },
      { id: '2', name_bn: 'মাওলানা ইউসুফ', designation: 'সহকারী শিক্ষক', staff_id: 'TCH-02' },
      { id: '3', name_bn: 'মুফতি ইবরাহীম', designation: 'অধ্যক্ষ', staff_id: 'ADM-01' },
      { id: '4', name_bn: 'মাওলানা মাহমুদ', designation: 'সহকারী শিক্ষক', staff_id: 'TCH-01' },
      { id: '5', name_bn: 'জসিম উদ্দিন', designation: 'অফিস সহকারী', staff_id: 'SUP-01' },
    ];

    const sorted = sortStaffByDepartment(list);

    // 1. Teachers first
    expect(sorted[0].staff_id).toBe('TCH-01');
    expect(sorted[1].staff_id).toBe('TCH-02');
    // 2. Administrative next
    expect(sorted[2].staff_id).toBe('ADM-01');
    // 3. Support next
    expect(sorted[3].staff_id).toBe('SUP-01');
    // 4. General last
    expect(sorted[4].staff_id).toBe('GEN-01');
  });

  it('respects salary_order when present within the same department', () => {
    const list = [
      { id: '1', name_bn: 'শিক্ষক খ', staff_category: 'teacher', salary_order: 2 },
      { id: '2', name_bn: 'শিক্ষক ক', staff_category: 'teacher', salary_order: 1 },
      { id: '3', name_bn: 'প্রশাসক ক', staff_category: 'administrative', salary_order: 1 },
    ];

    const sorted = sortStaffByDepartment(list);

    expect(sorted[0].name_bn).toBe('শিক্ষক ক');
    expect(sorted[1].name_bn).toBe('শিক্ষক খ');
    expect(sorted[2].name_bn).toBe('প্রশাসক ক');
  });

  it('generates proper Bengali/English department labels', () => {
    expect(getDepartmentLabel('teacher', true)).toContain('শিক্ষা');
    expect(getDepartmentLabel('administrative', true)).toContain('প্রশাসন');
    expect(getDepartmentLabel('teacher', false)).toContain('Teaching');
  });
});
