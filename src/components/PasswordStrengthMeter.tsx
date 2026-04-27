import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  usePasswordPolicy,
  evaluatePassword,
  isPasswordStrongAgainst,
  firstFailedRuleMessage,
  type PasswordPolicy,
} from '@/hooks/usePasswordPolicy';

interface PasswordStrengthMeterProps {
  password: string;
  bn?: boolean;
  className?: string;
}

const PasswordStrengthMeter = ({ password, bn = true, className }: PasswordStrengthMeterProps) => {
  const policy = usePasswordPolicy();
  const rules = evaluatePassword(password, policy).filter(r => r.required);
  const passed = rules.filter(r => r.passed).length;
  const total = rules.length || 1;
  const percent = (passed / total) * 100;

  const labelBn = !password ? '' : passed <= 2 ? 'দুর্বল' : passed <= 3 ? 'মাঝারি' : passed < total ? 'ভালো' : 'শক্তিশালী';
  const labelEn = !password ? '' : passed <= 2 ? 'Weak' : passed <= 3 ? 'Fair' : passed < total ? 'Good' : 'Strong';
  const barColor = passed <= 2 ? 'bg-destructive' : passed <= 3 ? 'bg-amber-500' : passed < total ? 'bg-blue-500' : 'bg-emerald-500';
  const textColor = passed <= 2 ? 'text-destructive' : passed <= 3 ? 'text-amber-600' : passed < total ? 'text-blue-600' : 'text-emerald-600';

  return (
    <div className={cn('mt-2 space-y-2', className)}>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={cn('h-full transition-all duration-300', barColor)} style={{ width: `${percent}%` }} />
        </div>
        {password && (
          <span className={cn('text-xs font-medium', textColor)}>
            {bn ? labelBn : labelEn}
          </span>
        )}
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
        {rules.map(r => (
          <li key={r.key} className={cn('flex items-center gap-1.5 text-[11px]', r.passed ? 'text-emerald-600' : 'text-muted-foreground')}>
            {r.passed ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0 opacity-50" />}
            <span>{bn ? r.label_bn : r.label_en}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Backwards-compatible exports — use the live policy from the DB cache.
export const isPasswordStrong = (password: string, policy?: PasswordPolicy): boolean => {
  if (policy) return isPasswordStrongAgainst(password, policy);
  // Sync fallback uses default policy if cache not yet populated.
  // Callers that need the live policy should use isPasswordStrongAgainst with usePasswordPolicy().
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DEFAULT_POLICY } = require('@/hooks/usePasswordPolicy');
  return isPasswordStrongAgainst(password, DEFAULT_POLICY);
};

export { firstFailedRuleMessage, isPasswordStrongAgainst, usePasswordPolicy };
export default PasswordStrengthMeter;
