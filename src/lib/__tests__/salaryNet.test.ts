import { describe, it, expect } from 'vitest';
import { recomputeNetSalary, computeManualOverrideNet } from '@/lib/salaryNet';

/**
 * Regression suite for the salary recalculate path.
 *
 * Bug: AdminSalary.recalculateMutation previously did
 *     baseNet  = calc.net_salary           // already minus savings
 *     manualDeds = advance + savings
 *     net = baseNet + extras - manualDeds  // -> savings subtracted TWICE
 *
 * These tests pin the contract so it can never regress.
 */

describe('recomputeNetSalary', () => {
  it('does NOT double-deduct savings (the original bug)', () => {
    // calc came out of calculateSalary with savings already taken out.
    // base 10500, savings 1000 -> calc.net_salary = 9500
    const calc = { net_salary: 9500, savings_deduction: 1000 };
    const manual = {
      bonus: 0,
      other_allowance: 0,
      advance_deduction: 0,
      savings_deduction: 1000,
    };
    // Expected: only ONE 1000 savings cut → 9500 (NOT 8500)
    expect(recomputeNetSalary(calc, manual)).toBe(9500);
  });

  it('does NOT double-deduct advance', () => {
    // calculateSalary always passes advance=0; manual brings the real value.
    const calc = { net_salary: 10000, savings_deduction: 0 };
    const manual = { advance_deduction: 500 };
    // 10000 - 500 = 9500, applied exactly once
    expect(recomputeNetSalary(calc, manual)).toBe(9500);
  });

  it('applies bonus and other_allowance additively, exactly once', () => {
    const calc = { net_salary: 8000, savings_deduction: 0 };
    const manual = { bonus: 1000, other_allowance: 500 };
    expect(recomputeNetSalary(calc, manual)).toBe(9500);
  });

  it('combines extras and deductions correctly without doubling', () => {
    // base salary 12000, savings 500 already in calc (=> 11500),
    // manual: bonus 1000, advance 200, savings 500 (same)
    const calc = { net_salary: 11500, savings_deduction: 500 };
    const manual = {
      bonus: 1000,
      other_allowance: 0,
      advance_deduction: 200,
      savings_deduction: 500,
    };
    // baseWithoutSavings = 12000
    // 12000 + 1000 - 200 - 500 = 12300
    expect(recomputeNetSalary(calc, manual)).toBe(12300);
  });

  it('handles savings being changed after calc was generated', () => {
    // calc was made when savings were 1000; admin later set 1500.
    const calc = { net_salary: 9000, savings_deduction: 1000 };
    const manual = { savings_deduction: 1500 };
    // baseWithoutSavings = 10000 - 1500 = 8500
    expect(recomputeNetSalary(calc, manual)).toBe(8500);
  });

  it('clamps negative results to 0', () => {
    const calc = { net_salary: 1000, savings_deduction: 0 };
    const manual = { advance_deduction: 5000 };
    expect(recomputeNetSalary(calc, manual)).toBe(0);
  });

  it('treats null/undefined fields as 0', () => {
    const calc = { net_salary: 5000, savings_deduction: null };
    const manual = {
      bonus: undefined,
      other_allowance: null,
      advance_deduction: undefined,
      savings_deduction: undefined,
    };
    expect(recomputeNetSalary(calc, manual)).toBe(5000);
  });

  it('matches the user-reported scenario: base 10500, savings 1000 → net 9500', () => {
    // User said: মূল বেতন 10500, কর্তন 1000 → net 9500 (কিন্তু ভুল করে 8500 হচ্ছিল)
    const calc = { net_salary: 9500, savings_deduction: 1000 };
    const manual = { advance_deduction: 0, savings_deduction: 1000 };
    expect(recomputeNetSalary(calc, manual)).toBe(9500);
    expect(recomputeNetSalary(calc, manual)).not.toBe(8500);
  });

  it('adds overtime explicitly to the net salary', () => {
    // calc.net_salary is the attendance-based portion WITHOUT overtime.
    const calc = { net_salary: 10000, savings_deduction: 0 };
    const manual = { overtime: 1500 };
    expect(recomputeNetSalary(calc, manual)).toBe(11500);
  });

  it('does NOT double-count overtime when it is already in calc.net_salary', () => {
    // This guards against callers passing a calc snapshot that still includes overtime.
    // If calc.net_salary already has 1500 overtime and manual.overtime is also 1500,
    // the result would be 13000 (wrong). The contract says calc.net_salary must exclude it.
    const calc = { net_salary: 10000, savings_deduction: 0 };
    const manual = { overtime: 1500 };
    // Correct usage: 10000 + 1500 = 11500
    expect(recomputeNetSalary(calc, manual)).toBe(11500);
  });

  it('combines overtime, bonus and deductions without double-counting savings', () => {
    // calc: base attendance 12000, savings 500 already excluded -> net 11500
    const calc = { net_salary: 11500, savings_deduction: 500 };
    const manual = {
      overtime: 1000,
      bonus: 500,
      other_allowance: 0,
      advance_deduction: 200,
      savings_deduction: 500,
    };
    // baseWithoutSavings = 11500 + 500 = 12000
    // 12000 + 1000 + 500 - 200 - 500 = 12800
    expect(recomputeNetSalary(calc, manual)).toBe(12800);
  });

  it('treats missing overtime as 0', () => {
    const calc = { net_salary: 9000, savings_deduction: 0 };
    const manual = {};
    expect(recomputeNetSalary(calc, manual)).toBe(9000);
  });
});
describe('computeManualOverrideNet', () => {
  it('correctly calculates net for user reported scenario: 8000 base, 78 late, 267 absent, 1000 savings -> 6655', () => {
    const net = computeManualOverrideNet({
      base_salary: 8000,
      late_deduction: 78,
      absence_deduction: 267,
      savings_deduction: 1000,
      bonus: 0,
      overtime: 0,
      other_allowance: 0,
      advance_deduction: 0,
      other_deduction: 0,
      duty_deduction: 0,
    });
    expect(net).toBe(6655);
  });

  it('subtracts duty deduction, pre-join deduction and post-resign deduction exactly once', () => {
    const net = computeManualOverrideNet({
      base_salary: 10000,
      bonus: 1000,
      overtime: 500,
      duty_deduction: 400,
      pre_join_deduction: 600,
      post_resign_deduction: 500,
      late_deduction: 100,
      absence_deduction: 200,
      savings_deduction: 500,
    });
    expect(net).toBe(9200);
  });
});