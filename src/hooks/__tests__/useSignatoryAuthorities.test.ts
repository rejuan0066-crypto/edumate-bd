import { describe, it, expect } from 'vitest';
import {
  CORE_SIGNATORY_ROLES,
  DOCUMENT_SCOPES,
  DEFAULT_ROLE_SCOPES,
} from '../useSignatoryAuthorities';

describe('useSignatoryAuthorities configuration', () => {
  it('has 4 core signatory roles defined with icons and descriptions', () => {
    expect(CORE_SIGNATORY_ROLES).toHaveLength(4);
    const keys = CORE_SIGNATORY_ROLES.map((r) => r.key);
    expect(keys).toContain('head_of_institute');
    expect(keys).toContain('accountant_cashier');
    expect(keys).toContain('verifier_auditor');
    expect(keys).toContain('exam_controller');

    CORE_SIGNATORY_ROLES.forEach((role) => {
      expect(role.label_bn).toBeTruthy();
      expect(role.label_en).toBeTruthy();
      expect(role.icon).toBeTruthy();
      expect(role.desc_bn).toBeTruthy();
      expect(Array.isArray(role.keywords)).toBe(true);
    });
  });

  it('defines 10 comprehensive document scopes across academic, financial, and general categories', () => {
    expect(DOCUMENT_SCOPES.length).toBeGreaterThanOrEqual(10);
    const scopeIds = DOCUMENT_SCOPES.map((d) => d.id);
    expect(scopeIds).toContain('certificate');
    expect(scopeIds).toContain('result_card');
    expect(scopeIds).toContain('admit_card');
    expect(scopeIds).toContain('exam_routine');
    expect(scopeIds).toContain('expense_voucher');
    expect(scopeIds).toContain('fee_receipt');
    expect(scopeIds).toContain('salary_sheet');
    expect(scopeIds).toContain('id_card');
    expect(scopeIds).toContain('public_website');
    expect(scopeIds).toContain('official_pad');
  });

  it('maps default scopes appropriately to core roles', () => {
    expect(DEFAULT_ROLE_SCOPES['head_of_institute']).toContain('certificate');
    expect(DEFAULT_ROLE_SCOPES['head_of_institute']).toContain('result_card');
    expect(DEFAULT_ROLE_SCOPES['accountant_cashier']).toContain('expense_voucher');
    expect(DEFAULT_ROLE_SCOPES['accountant_cashier']).toContain('fee_receipt');
    expect(DEFAULT_ROLE_SCOPES['verifier_auditor']).toContain('expense_voucher');
    expect(DEFAULT_ROLE_SCOPES['exam_controller']).toContain('result_card');
    expect(DEFAULT_ROLE_SCOPES['exam_controller']).toContain('admit_card');
  });
});
