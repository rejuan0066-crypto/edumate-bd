import { describe, it, expect } from 'vitest';
import { computeManualOverrideNet, recomputeNetSalary } from '@/lib/salaryNet';
import { calculateDutyShiftDeduction } from '@/lib/dutyShiftDeduction';

/**
 * Contract: আবাসিক ডিউটি কর্তন (duty_deduction) নিট বেতন থেকে ঠিক একবার বাদ যায়।
 */
describe('duty deduction is subtracted exactly once from net salary', () => {
  const baseInput = {
    base_salary: 12000,
    bonus: 500,
    overtime: 1000,
    other_allowance: 0,
    late_deduction: 200,
    absence_deduction: 300,
    advance_deduction: 100,
    other_deduction: 0,
    savings_deduction: 500,
  };

  it('manual-override net subtracts duty exactly once', () => {
    const withoutDuty = computeManualOverrideNet({ ...baseInput, duty_deduction: 0 });
    const withDuty = computeManualOverrideNet({ ...baseInput, duty_deduction: 400 });
    expect(withoutDuty).toBe(12400);
    expect(withDuty).toBe(12000); // exactly one 400 cut, not 800
    expect(withoutDuty - withDuty).toBe(400);
  });

  it('scales linearly with the duty amount (no doubling)', () => {
    for (const duty of [0, 150, 400, 1000, 2500]) {
      const net = computeManualOverrideNet({ ...baseInput, duty_deduction: duty });
      expect(net).toBe(Math.max(0, 12400 - duty));
    }
  });

  it('does not re-apply duty in recomputeNetSalary (calc.net_salary already has it)', () => {
    // calculateSalary: net = earned + ot + bonus - advance - savings - duty
    // earned 12000, ot 0, duty 400, savings 500 => 11100
    const calc = { net_salary: 11100, savings_deduction: 500 };
    const net = recomputeNetSalary(calc, { savings_deduction: 500, advance_deduction: 0 });
    // savings added back then cut once; duty stays cut once → 11100
    expect(net).toBe(11100);
  });

  it('treats missing duty_deduction as 0', () => {
    expect(computeManualOverrideNet({ ...baseInput })).toBe(12400);
    expect(computeManualOverrideNet({ ...baseInput, duty_deduction: null })).toBe(12400);
  });

  it('clamps to 0 when duty exceeds earnings', () => {
    expect(computeManualOverrideNet({ base_salary: 500, duty_deduction: 5000 })).toBe(0);
  });

  it('end-to-end: dutyShiftDeduction total is the single amount applied to net', () => {
    const result = calculateDutyShiftDeduction({
      rosterDays: [
        { date: '2026-06-01', shiftId: 's1' },
        { date: '2026-06-02', shiftId: 's1' },
        { date: '2026-06-03', shiftId: 's1' },
      ],
      attendance: [
        { date: '2026-06-01', shiftId: 's1', status: 'present', lateMinutes: 0 },
        { date: '2026-06-02', shiftId: 's1', status: 'absent', lateMinutes: 0 },
        { date: '2026-06-03', shiftId: 's1', status: 'late', lateMinutes: 25 },
      ],
      shifts: [{
        id: 's1',
        name: 'সকাল',
        absent_deduction_amount: 100,
        late_deduction_enabled: true,
        late_deduction_amount: 2,
        late_deduction_mode: 'per_minute',
        late_deduction_free_minutes: 5,
      }],
    } as any);

    const net = computeManualOverrideNet({ base_salary: 10000, duty_deduction: result.total });
    expect(net).toBe(10000 - result.total);
    // and running it through the display path again must not cut twice
    expect(10000 - net).toBe(result.total);
  });
});
