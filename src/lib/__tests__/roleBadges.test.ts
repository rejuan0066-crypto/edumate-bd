import { describe, it, expect } from 'vitest';
import { getRoleDesignationBadges } from '@/lib/roleBadges';

describe('getRoleDesignationBadges', () => {
  describe('Bengali (bn)', () => {
    it('shows localized super_admin role only when designation duplicates it', () => {
      const badges = getRoleDesignationBadges({
        role: 'super_admin',
        designation: 'সুপার অ্যাডমিন',
        bn: true,
      });
      expect(badges).toHaveLength(1);
      expect(badges[0]).toEqual({ key: 'role', label: 'সুপার অ্যাডমিন', kind: 'role' });
    });

    it('dedupes visually-equivalent Bengali variants (এডমিন vs অ্যাডমিন)', () => {
      const badges = getRoleDesignationBadges({
        role: 'super_admin',
        designation: 'সুপার এডমিন',
        bn: true,
      });
      expect(badges).toHaveLength(1);
      expect(badges[0].kind).toBe('role');

    it('shows both role and designation when distinct', () => {
      const badges = getRoleDesignationBadges({
        role: 'admin',
        designation: 'প্রধান শিক্ষক',
        bn: true,
      });
      expect(badges).toEqual([
        { key: 'role', label: 'অ্যাডমিন', kind: 'role' },
        { key: 'designation', label: 'প্রধান শিক্ষক', kind: 'designation' },
      ]);
    });

    it('translates teacher and staff roles', () => {
      expect(
        getRoleDesignationBadges({ role: 'teacher', designation: null, bn: true })[0].label
      ).toBe('শিক্ষক');
      expect(
        getRoleDesignationBadges({ role: 'staff', designation: null, bn: true })[0].label
      ).toBe('স্টাফ');
    });

    it('is case-insensitive and whitespace-tolerant when deduping', () => {
      const badges = getRoleDesignationBadges({
        role: 'admin',
        designation: '  অ্যাডমিন  ',
        bn: true,
      });
      expect(badges).toHaveLength(1);
    });
  });

  describe('English (en)', () => {
    it('shows localized super_admin role only when designation duplicates it', () => {
      const badges = getRoleDesignationBadges({
        role: 'super_admin',
        designation: 'super admin',
        bn: false,
      });
      expect(badges).toHaveLength(1);
      expect(badges[0].label).toBe('Super Admin');
    });

    it('shows both badges when distinct', () => {
      const badges = getRoleDesignationBadges({
        role: 'admin',
        designation: 'Head Teacher',
        bn: false,
      });
      expect(badges.map((b) => b.label)).toEqual(['Admin', 'Head Teacher']);
    });
  });

  describe('edge cases', () => {
    it('returns empty array when role and designation are missing', () => {
      expect(getRoleDesignationBadges({ role: null, designation: null, bn: true })).toEqual([]);
    });

    it('shows only designation when role is missing', () => {
      const badges = getRoleDesignationBadges({
        role: null,
        designation: 'Accountant',
        bn: false,
      });
      expect(badges).toHaveLength(1);
      expect(badges[0].kind).toBe('designation');
    });

    it('falls back to raw role string for unknown roles', () => {
      const badges = getRoleDesignationBadges({
        role: 'parent',
        designation: null,
        bn: true,
      });
      expect(badges[0].label).toBe('parent');
    });

    it('ignores empty/whitespace-only designation', () => {
      const badges = getRoleDesignationBadges({
        role: 'admin',
        designation: '   ',
        bn: false,
      });
      expect(badges).toHaveLength(1);
      expect(badges[0].kind).toBe('role');
    });
  });
});
