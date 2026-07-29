/**
 * Pure salary-net helpers.
 *
 * Extracted so the math is deterministic and unit-testable, preventing
 * regressions like the savings/advance double-deduction bug where
 * `calc.net_salary` (which already subtracts savings) was added to a
 * `manualDeds = advance + savings` and subtracted again — causing savings
 * to be deducted twice.
 *
 * Contract:
 *   calc.net_salary  -- already excludes attendance deductions, advance(=0
 *                       at calc-time), savings_deduction AND overtime.
 *                       Overtime is applied explicitly via manual.overtime
 *                       so it is always visible in the breakdown.
 *   bonus / other_allowance / overtime / advance_deduction / savings_deduction --
 *   come from the persisted record / live config and must each be applied
 *   EXACTLY ONCE in the recomputed net.
 */

export interface CalcSnapshot {
  net_salary?: number | null;
  savings_deduction?: number | null;
}

export interface ManualInputs {
  bonus?: number | null;
  other_allowance?: number | null;
  overtime?: number | null;
  advance_deduction?: number | null;
  savings_deduction?: number | null;
}

const n = (v: unknown) => Number(v || 0);

/**
 * Recompute final net salary from a calc snapshot + manual inputs without
 * double-counting savings/advance deductions.
 *
 * Formula:
 *   baseWithoutSavings = calc.net_salary + calc.savings_deduction
 *   net = baseWithoutSavings + overtime + bonus + other_allowance
 *         - advance_deduction - savings_deduction
 *   net = max(0, net)
 */
export function recomputeNetSalary(calc: CalcSnapshot, manual: ManualInputs): number {
  const baseWithoutSavings = n(calc.net_salary) + n(calc.savings_deduction);
  const net =
    baseWithoutSavings +
    n(manual.overtime) +
    n(manual.bonus) +
    n(manual.other_allowance) -
    n(manual.advance_deduction) -
    n(manual.savings_deduction);
  return Math.max(0, Math.round(net));
}
